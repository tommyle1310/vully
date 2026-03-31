import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentService } from './document.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ChatQueryDto {
  query: string;
  userId: string;
  context?: {
    apartmentId?: string;
    buildingId?: string;
  };
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    title: string;
    category: string;
    relevance: number;
  }>;
  tokensUsed?: number;
  responseTime: number;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string = 'gemini-2.0-flash'; // Fast and cost-effective
  private readonly maxQueriesPerDay = 20; // Rate limit for residents

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Handle chat query with RAG
   * @param dto Chat query data
   * @returns AI response with sources
   */
  async chat(dto: ChatQueryDto): Promise<ChatResponse> {
    const startTime = Date.now();
    const { query, userId, context } = dto;

    this.logger.log(`Chat query from user ${userId}: ${query.substring(0, 50)}...`);

    // Check rate limit
    await this.checkRateLimit(userId);

    // Get user info for context
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        contracts: {
          where: { status: 'active' },
          include: {
            apartment: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });

    // Search for relevant documents
    const relevantDocs = await this.documentService.searchDocuments(query, 5);

    // Build context from relevant documents
    const documentContext = relevantDocs
      .map((doc, index) => {
        return `[Document ${index + 1}: ${doc.title} (${doc.category})]\n${doc.content}\n`;
      })
      .join('\n');

    // Build user context
    let userContext = '';
    if (user) {
      userContext = `User: ${user.firstName} ${user.lastName} (${user.role})\n`;
      if (user.contracts.length > 0) {
        const contract = user.contracts[0];
        userContext += `Apartment: ${contract.apartment.building.name}, Unit ${contract.apartment.unitNumber}\n`;
        userContext += `Rent: ${contract.rentAmount} VND/month\n`;
      }
    }

    // If specific apartment or building ID provided, add more context
    if (context?.apartmentId) {
      const apartment = await this.prisma.apartment.findUnique({
        where: { id: context.apartmentId },
        include: { building: true },
      });
      if (apartment) {
        userContext += `\nQuerying about: ${apartment.building.name}, Unit ${apartment.unitNumber}\n`;
      }
    }

    // Generate AI response using Gemini
    const model = this.genAI.getGenerativeModel({ model: this.model });

    const prompt = `You are a helpful apartment management assistant for Vully platform.

${userContext}

Relevant information from knowledge base:
${documentContext}

User question: ${query}

Instructions:
- Answer the user's question based on the provided context and relevant documents.
- If the answer involves payment, billing, or apartment rules, cite the relevant policy.
- Be concise and friendly.
- If you don't know the answer from the provided context, say so politely and suggest contacting the admin.
- Always respond in Vietnamese if the user asks in Vietnamese, otherwise English.

Answer:`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      const responseTime = Date.now() - startTime;

      // Save query to database
      await this.prisma.chatQuery.create({
        data: {
          userId,
          query,
          response: responseText,
          sourceDocs: relevantDocs.map((doc) => doc.documentId),
          tokensUsed: 0, // Gemini doesn't provide token count easily
          responseTime,
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
        this.logger.warn('Gemini chat quota exceeded — returning document excerpts directly');
        return this.buildFallbackResponse(query, relevantDocs, startTime, userId);
      }
      throw error;
    }
  }

  /**
   * Fallback when AI quota is exceeded: synthesise a response from document excerpts directly.
   */
  private async buildFallbackResponse(
    query: string,
    relevantDocs: import('./document.service').SearchResult[],
    startTime: number,
    userId: string,
  ): Promise<ChatResponse> {
    const responseTime = Date.now() - startTime;

    let responseText: string;
    if (relevantDocs.length === 0) {
      responseText =
        "I couldn't find relevant information for your question. Please contact the building administrator for assistance.";
    } else {
      const excerpts = relevantDocs
        .slice(0, 3)
        .map((doc) => `**${doc.title}**\n${doc.content.substring(0, 400)}${doc.content.length > 400 ? '…' : ''}`)
        .join('\n\n---\n\n');
      responseText = `Here is what I found in the knowledge base regarding "${query}":\n\n${excerpts}\n\n*(AI summarisation is temporarily unavailable — showing raw knowledge base results)*`;
    }

    await this.prisma.chatQuery.create({
      data: {
        userId,
        query,
        response: responseText,
        sourceDocs: relevantDocs.map((doc) => doc.documentId),
        tokensUsed: 0,
        responseTime,
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
    // Admin users have no rate limit
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'admin') {
      return; // No limit for admin
    }

    // Check queries in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const queryCount = await this.prisma.chatQuery.count({
      where: {
        userId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    if (queryCount >= this.maxQueriesPerDay) {
      throw new BadRequestException(
        `Daily query limit reached (${this.maxQueriesPerDay} queries/day). Try again tomorrow.`
      );
    }

    this.logger.debug(`User ${userId} has ${queryCount}/${this.maxQueriesPerDay} queries today`);
  }

  /**
   * Get user's chat history
   * @param userId User ID
   * @param limit Number of queries to return
   * @returns Array of past queries
   */
  async getChatHistory(userId: string, limit: number = 10) {
    return this.prisma.chatQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        query: true,
        response: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get user's query count for today
   * @param userId User ID
   * @returns Number of queries made today
   */
  async getUserQueryCount(userId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.prisma.chatQuery.count({
      where: {
        userId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });
  }
}
