import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentService } from './document.service';
import { AiAssistantSearchService } from './ai-assistant-search.service';
import { GroqService } from './groq.service';
import { SemanticCacheService } from './semantic-cache.service';
import { EmbeddingService } from './embedding.service';
import { formatDatabaseContextAsMarkdown } from './ai-assistant.helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MAX_QUERIES_PER_DAY, ONE_DAY_MS } from '../../common/constants/defaults';
import {
  ChatQueryDto,
  ChatResponse,
} from '../../common/types/service-types';
import { QueryIntent, RoutingTrace } from './ai-assistant.types';
import { randomUUID } from 'crypto';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string = 'gemini-2.0-flash'; // Fast and cost-effective
  private readonly maxQueriesPerDay = MAX_QUERIES_PER_DAY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly configService: ConfigService,
    private readonly searchService: AiAssistantSearchService,
    private readonly groqService: GroqService,
    private readonly semanticCacheService: SemanticCacheService,
    private readonly embeddingService: EmbeddingService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Handle chat query with orchestrated multi-model routing
   * Flow: Cache → Intent → Route (Groq/Gemini) → Cache Write → Trace
   */
  async chat(dto: ChatQueryDto): Promise<ChatResponse> {
    const startTime = Date.now();
    const { query, userId, context } = dto;
    const correlationId = randomUUID();

    this.logger.log(`[${correlationId}] Chat query from user ${userId}: ${query.substring(0, 50)}...`);

    // Initialize routing trace
    const trace: Partial<RoutingTrace> = {
      correlation_id: correlationId,
      cache_checked: false,
      cache_hit: false,
      cache_verified: false,
      cache_similarity: null,
      intent: QueryIntent.UNKNOWN,
      intent_confidence: null,
      model_used: null,
      tools_executed: null, // null instead of []
      routing_time_ms: null,
      model_time_ms: null,
      total_time_ms: null,
      error_during_routing: false, // Boolean value
      fallback_used: null, // null initially
    };

    try {
      await this.checkRateLimit(userId);

      // Fetch user context
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          contracts_contracts_tenant_idTousers: {
            where: { status: 'active' },
            include: {
              apartments: {
                include: { buildings: true },
              },
            },
          },
        },
      });

      const userName = user ? `${user.first_name} ${user.last_name}` : '';

      // STEP 1: Check semantic cache
      const cacheStartTime = Date.now();
      trace.cache_checked = true;

      const cachedResponse = await this.semanticCacheService.checkCache(query);
      const cacheCheckTime = Date.now() - cacheStartTime;

      if (cachedResponse) {
        trace.cache_hit = true;
        trace.cache_verified = cachedResponse.cache_verified;
        trace.cache_similarity = cachedResponse.similarity;
        trace.routing_time_ms = cacheCheckTime;
        trace.total_time_ms = Date.now() - startTime;

        this.logger.log(
          `[${correlationId}] Cache hit with similarity ${cachedResponse.similarity.toFixed(3)} (verified: ${cachedResponse.cache_verified})`,
        );

        // Log query with trace
        await this.logQueryWithTrace(userId, query, cachedResponse.response, trace, []);

        return {
          response: cachedResponse.response,
          sources: [],
          responseTime: trace.total_time_ms,
        };
      }

      this.logger.log(`[${correlationId}] Cache miss, proceeding to intent classification`);

      // STEP 2: Classify intent
      const intentStartTime = Date.now();
      const intentResult = await this.groqService.classifyIntent(query);
      trace.intent = intentResult.intent;
      trace.intent_confidence = intentResult.confidence;
      trace.routing_time_ms = Date.now() - cacheStartTime; // Total routing overhead

      this.logger.log(
        `[${correlationId}] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`,
      );

      // STEP 3: Route by intent
      let response: ChatResponse;

      switch (intentResult.intent) {
        case QueryIntent.SMALL_TALK:
          response = await this.handleSmallTalk(query, userId, userName, startTime, trace, correlationId);
          break;

        case QueryIntent.BILLING_QUERY:
        case QueryIntent.POLICY_QUERY:
          response = await this.handleStructuredQuery(
            query,
            userId,
            context,
            intentResult.intent,
            startTime,
            trace,
            correlationId,
          );
          break;

        case QueryIntent.ACTION_REQUEST:
        case QueryIntent.UNKNOWN:
        default:
          response = await this.handleComplexRagQuery(
            query,
            userId,
            context,
            user,
            startTime,
            trace,
            correlationId,
          );
          break;
      }

      // STEP 4: Cache response (async - don't block)
      const queryId = response.queryId;
      if (queryId && trace.intent) {
        // Convert QueryIntent enum to string for the cache service
        const intentString = trace.intent as QueryIntent;
        this.semanticCacheService
          .cacheResponse(queryId, response.response, intentString)
          .catch((err) => this.logger.warn(`[${correlationId}] Failed to cache response: ${err.message}`));
      }

      return response;
    } catch (error) {
      const err = error as Error;
      trace.error_during_routing = true; // Boolean flag
      trace.total_time_ms = Date.now() - startTime;

      this.logger.error(`[${correlationId}] Chat failed: ${err.message}`, err.stack);

      // Log failed query
      await this.logQueryWithTrace(userId, query, `Error: ${err.message}`, trace, []);

      throw error;
    }
  }

  /**
   * Handle small talk with Groq (fast, cheap)
   */
  private async handleSmallTalk(
    query: string,
    userId: string,
    userName: string,
    startTime: number,
    trace: Partial<RoutingTrace>,
    correlationId: string,
  ): Promise<ChatResponse> {
    const modelStartTime = Date.now();
    const response = await this.groqService.handleSmallTalk(query, userName);
    trace.model_used = 'groq-llama-3.1-8b-instant';
    trace.model_time_ms = Date.now() - modelStartTime;
    trace.total_time_ms = Date.now() - startTime;

    this.logger.log(`[${correlationId}] Small talk handled by Groq in ${trace.model_time_ms}ms`);

    const queryId = await this.logQueryWithTrace(userId, query, response, trace, []);

    return {
      response,
      sources: [],
      responseTime: trace.total_time_ms,
      queryId,
    };
  }

  /**
   * Handle structured queries (billing, policy) with SQL tools
   */
  private async handleStructuredQuery(
    query: string,
    userId: string,
    context: any,
    intent: QueryIntent,
    startTime: number,
    trace: Partial<RoutingTrace>,
    correlationId: string,
  ): Promise<ChatResponse> {
    const modelStartTime = Date.now();

    this.logger.log(`[${correlationId}] Handling ${intent} with SQL tools`);

    // Get available billing tools
    const availableTools = this.searchService.getBillingTools();

    // Use Groq to select which tools to call
    const toolSelections = await this.groqService.selectTools(query, availableTools);

    let structuredData: Record<string, any> = {};
    const toolNames: string[] = [];

    if (toolSelections.length > 0) {
      this.logger.log(
        `[${correlationId}] Executing ${toolSelections.length} tools: ${toolSelections.map((t) => t.tool_name).join(', ')}`,
      );

      // Execute tools in parallel with security validation
      try {
        structuredData = await this.searchService.executeTools(toolSelections, userId);
        toolNames.push(...toolSelections.map((t) => t.tool_name));
      } catch (error) {
        this.logger.error(`[${correlationId}] Tool execution failed: ${(error as Error).message}`);
        // Fall back to database context search if tools fail
      }
    }

    // Fallback to legacy database context if no tools were selected or execution failed
    let databaseContext: string | null = null;
    if (Object.keys(structuredData).length === 0) {
      try {
        databaseContext = await this.searchService.queryDatabaseForContext(query, context?.buildingId);
        if (databaseContext) {
          toolNames.push('database_context_search');
        }
      } catch (dbError) {
        this.logger.warn(`[${correlationId}] Database context query failed: ${(dbError as Error).message}`);
      }
    }

    // Synthesize response with Groq
    const dataToSynthesize = Object.keys(structuredData).length > 0
      ? JSON.stringify(structuredData, null, 2)
      : databaseContext || 'No data available';

    const responseText = await this.groqService.synthesize(query, dataToSynthesize, 'vi');
    trace.model_used = 'groq-llama-3.1-8b-instant';
    trace.model_time_ms = Date.now() - modelStartTime;
    trace.total_time_ms = Date.now() - startTime;
    trace.tools_executed = toolNames.length > 0 ? toolNames : null;

    this.logger.log(
      `[${correlationId}] Structured query handled by Groq in ${trace.model_time_ms}ms (tools: ${toolNames.join(', ') || 'none'})`,
    );

    const queryId = await this.logQueryWithTrace(userId, query, responseText, trace, []);

    return {
      response: responseText,
      sources: [],
      responseTime: trace.total_time_ms,
      queryId,
    };
  }

  /**
   * Handle complex RAG queries with Gemini (document search)
   */
  private async handleComplexRagQuery(
    query: string,
    userId: string,
    context: any,
    user: any,
    startTime: number,
    trace: Partial<RoutingTrace>,
    correlationId: string,
  ): Promise<ChatResponse> {
    this.logger.log(`[${correlationId}] Handling complex RAG query with Gemini`);

    let relevantDocs: Awaited<ReturnType<typeof this.documentService.searchDocuments>> = [];
    let databaseContext: string | null = null;

    try {
      relevantDocs = await this.documentService.searchDocuments(query, 5);
    } catch (docError) {
      this.logger.warn(`[${correlationId}] Document search failed: ${(docError as Error).message}`);
    }

    const documentContext = relevantDocs
      .map((doc, index) => `[Document ${index + 1}: ${doc.title} (${doc.category})]\n${doc.content}\n`)
      .join('\n');

    let userContext = '';
    if (user) {
      userContext = `User: ${user.first_name} ${user.last_name} (${user.role})\n`;
      if (user.contracts_contracts_tenant_idTousers.length > 0) {
        const contract = user.contracts_contracts_tenant_idTousers[0];
        userContext += `Apartment: ${contract.apartments.buildings.name}, Unit ${contract.apartments.unit_number}\n`;
        userContext += `Rent: ${contract.rent_amount} VND/month\n`;
      }
    }

    if (context?.apartmentId) {
      const apartment = await this.prisma.apartments.findUnique({
        where: { id: context.apartmentId },
        include: { buildings: true },
      });
      if (apartment) {
        userContext += `\nQuerying about: ${apartment.buildings.name}, Unit ${apartment.unit_number}\n`;
      }
    }

    try {
      databaseContext = await this.searchService.queryDatabaseForContext(query, context?.buildingId);
    } catch (dbError) {
      this.logger.warn(`[${correlationId}] Database context query failed: ${(dbError as Error).message}`);
    }

    const modelStartTime = Date.now();
    const model = this.genAI.getGenerativeModel({ model: this.model });

    const prompt = `You are a helpful apartment management assistant for Vully platform.

${userContext}

${databaseContext ? `Real-time data from database:\n${databaseContext}\n` : ''}

Relevant information from knowledge base:
${documentContext || 'No relevant documents found.'}

User question: ${query}

Instructions:
- Answer the user's question based on the provided context, real-time database data, and relevant documents.
- When answering about apartments availability, bedroom counts, or building stats, use the "Real-time data from database" section.
- If the answer involves payment, billing, or apartment rules, cite the relevant policy.
- Be concise, accurate, and friendly.
- For availability questions, provide specific numbers and details from the database.
- If you don't have enough information to answer, say so politely and suggest contacting the admin.
- Always respond in Vietnamese if the user asks in Vietnamese, otherwise English.

Answer:`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      trace.model_used = 'gemini-2.0-flash';
      trace.model_time_ms = Date.now() - modelStartTime;
      trace.total_time_ms = Date.now() - startTime;

      this.logger.log(`[${correlationId}] Gemini RAG response generated in ${trace.model_time_ms}ms`);

      const queryId = await this.logQueryWithTrace(userId, query, responseText, trace, relevantDocs);

      return {
        response: responseText,
        sources: relevantDocs.map((doc) => ({
          title: doc.title,
          category: doc.category,
          relevance: doc.similarity,
        })),
        responseTime: trace.total_time_ms,
        queryId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[${correlationId}] Gemini failed: ${err.message}`, err.stack);

      const isQuotaError =
        err.message.includes('429') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('quota');

      if (isQuotaError) {
        this.logger.warn(`[${correlationId}] Gemini quota exceeded, falling back to formatted context`);
        trace.fallback_used = 'gemini-quota-exceeded'; // String descriptor
        trace.model_used = 'fallback-context-only';
        trace.model_time_ms = Date.now() - modelStartTime;
        trace.total_time_ms = Date.now() - startTime;

        return this.buildFallbackResponse(query, relevantDocs, startTime, userId, databaseContext, trace, correlationId);
      }

      throw error;
    }
  }

  private async logQueryWithTrace(
    userId: string,
    query: string,
    response: string,
    trace: Partial<RoutingTrace>,
    relevantDocs: any[],
  ): Promise<string> {
    const queryRecord = await this.prisma.chat_queries.create({
      data: {
        user_id: userId, // Required field
        query,
        response,
        source_docs: relevantDocs.map((doc) => doc.documentId),
        tokens_used: 0,
        response_time: trace.total_time_ms || 0,
        // Routing trace fields
        correlation_id: trace.correlation_id,
        cache_checked: trace.cache_checked ?? false,
        cache_hit: trace.cache_hit ?? false,
        cache_verified: trace.cache_verified ?? false,
        cache_similarity: trace.cache_similarity,
        intent: trace.intent,
        intent_confidence: trace.intent_confidence,
        model_used: trace.model_used,
        tools_executed: trace.tools_executed ?? [],
        routing_time_ms: trace.routing_time_ms,
        model_time_ms: trace.model_time_ms,
        total_time_ms: trace.total_time_ms,
        error_during_routing: trace.error_during_routing ?? false,
        fallback_used: trace.fallback_used, // String or null
      },
    });

    return queryRecord.id;
  }

  /**
   * Fallback when AI quota is exceeded
   */
  private async buildFallbackResponse(
    query: string,
    relevantDocs: import('./document.service').SearchResult[],
    startTime: number,
    userId: string,
    databaseContext: string | null,
    trace: Partial<RoutingTrace>,
    correlationId: string,
  ): Promise<ChatResponse> {
    const responseTime = Date.now() - startTime;

    let responseText: string;

    if (databaseContext) {
      responseText = formatDatabaseContextAsMarkdown(databaseContext, query);
    } else if (relevantDocs.length > 0) {
      const excerpts = relevantDocs
        .slice(0, 3)
        .map((doc) => `**${doc.title}**\n${doc.content.substring(0, 400)}${doc.content.length > 400 ? '…' : ''}`)
        .join('\n\n---\n\n');
      responseText = `Here is what I found in the knowledge base:\n\n${excerpts}`;
    } else {
      responseText =
        "I couldn't find relevant information for your question. Please contact the building administrator for assistance.";
    }

    trace.total_time_ms = responseTime;
    
    const queryId = await this.logQueryWithTrace(userId, query, responseText, trace, relevantDocs);

    this.logger.log(`[${correlationId}] Fallback response built in ${responseTime}ms`);

    return {
      response: responseText,
      sources: relevantDocs.map((doc) => ({
        title: doc.title,
        category: doc.category,
        relevance: doc.similarity,
      })),
      responseTime,
      queryId,
    };
  }

  /**
   * Check if user has exceeded rate limit
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'admin') {
      return;
    }

    const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);
    const queryCount = await this.prisma.chat_queries.count({
      where: {
        user_id: userId,
        created_at: { gte: oneDayAgo },
      },
    });

    if (queryCount >= this.maxQueriesPerDay) {
      throw new BadRequestException(
        `Daily query limit reached (${this.maxQueriesPerDay} queries/day). Try again tomorrow.`
      );
    }

    this.logger.debug(`User ${userId} has ${queryCount}/${this.maxQueriesPerDay} queries today`);
  }

  async getChatHistory(userId: string, limit: number = 10) {
    return this.prisma.chat_queries.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        query: true,
        response: true,
        created_at: true,
      },
    });
  }

  async getUserQueryCount(userId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);
    return this.prisma.chat_queries.count({
      where: {
        user_id: userId,
        created_at: { gte: oneDayAgo },
      },
    });
  }
}
