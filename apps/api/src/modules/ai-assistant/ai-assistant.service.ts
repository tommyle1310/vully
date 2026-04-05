import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentService } from './document.service';
import { AiAssistantSearchService } from './ai-assistant-search.service';
import { formatDatabaseContextAsMarkdown } from './ai-assistant.helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MAX_QUERIES_PER_DAY, ONE_DAY_MS } from '../../common/constants/defaults';
import {
  ChatQueryDto,
  ChatResponse,
} from '../../common/types/service-types';

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
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Handle chat query with RAG + Real-time database lookup
   */
  async chat(dto: ChatQueryDto): Promise<ChatResponse> {
    const startTime = Date.now();
    const { query, userId, context } = dto;

    this.logger.log(`Chat query from user ${userId}: ${query.substring(0, 50)}...`);

    let relevantDocs: Awaited<ReturnType<typeof this.documentService.searchDocuments>> = [];
    let databaseContext: string | null = null;

    try {
      await this.checkRateLimit(userId);

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

      try {
        relevantDocs = await this.documentService.searchDocuments(query, 5);
      } catch (docError) {
        this.logger.warn(`Document search failed: ${(docError as Error).message}`);
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
        this.logger.warn(`Database context query failed: ${(dbError as Error).message}`);
      }

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

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      const responseTime = Date.now() - startTime;

      await this.prisma.chat_queries.create({
        data: {
          user_id: userId,
          query,
          response: responseText,
          source_docs: relevantDocs.map((doc) => doc.documentId),
          tokens_used: 0,
          response_time: responseTime,
        },
      });

      this.logger.log(`Chat response generated in ${responseTime}ms`);

      return {
        response: responseText,
        sources: relevantDocs.map((doc) => ({
          title: doc.title,
          category: doc.category,
          relevance: doc.similarity,
        })),
        responseTime,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate AI response: ${err.message}`, err.stack);
      const isQuotaError =
        err.message.includes('429') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('quota');
      if (isQuotaError) {
        this.logger.warn('Gemini chat quota exceeded — returning database/document context directly');
        return this.buildFallbackResponse(query, relevantDocs, startTime, userId, databaseContext);
      }
      throw error;
    }
  }

  /**
   * Fallback when AI quota is exceeded
   */
  private async buildFallbackResponse(
    query: string,
    relevantDocs: import('./document.service').SearchResult[],
    startTime: number,
    userId: string,
    databaseContext?: string | null,
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

    await this.prisma.chat_queries.create({
      data: {
        user_id: userId,
        query,
        response: responseText,
        source_docs: relevantDocs.map((doc) => doc.documentId),
        tokens_used: 0,
        response_time: responseTime,
      },
    });

    return {
      response: responseText,
      sources: relevantDocs.map((doc) => ({
        title: doc.title,
        category: doc.category,
        relevance: doc.similarity,
      })),
      responseTime,
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
