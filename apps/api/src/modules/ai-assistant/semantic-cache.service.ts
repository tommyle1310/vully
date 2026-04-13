import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { GroqService } from './groq.service';
import { CachedResponse, QueryIntent } from './ai-assistant.types';

/**
 * Semantic cache service for AI assistant responses
 * Uses pgvector similarity search + LLM verification
 */
@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly similarityThreshold = 0.95;
  private readonly verificationThreshold = 0.98; // Skip LLM verification if similarity very high

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly groqService: GroqService,
  ) {}

  /**
   * Check semantic cache for similar queries
   * Returns cached response if:
   * 1. Similarity >= threshold
   * 2. LLM verification passes (or skipped for very high similarity)
   * 3. Cache not expired (TTL based on intent)
   */
  async checkCache(
    query: string,
    intent?: QueryIntent,
  ): Promise<CachedResponse | null> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const embeddingVector = `[${queryEmbedding.join(',')}]`;

      // Get TTL interval based on intent
      const ttlInterval = this.getTtlInterval(intent);

      // Vector similarity search
      const cached = await this.prisma.$queryRaw<
        Array<{
          id: string;
          query: string;
          response: string;
          created_at: Date;
          similarity: number;
        }>
      >`
        SELECT 
          id,
          query,
          response,
          created_at,
          (1 - (response_embedding <=> ${embeddingVector}::vector)) as similarity
        FROM chat_queries
        WHERE response_embedding IS NOT NULL
          AND created_at > NOW() - INTERVAL '${ttlInterval}'
        ORDER BY response_embedding <=> ${embeddingVector}::vector
        LIMIT 1
      `;

      if (!cached || cached.length === 0) {
        this.logger.log('Cache miss: No similar queries found');
        return null;
      }

      const candidate = cached[0];
      this.logger.log(
        `Cache candidate found: similarity ${candidate.similarity.toFixed(3)} for query "${candidate.query.substring(0, 50)}..."`,
      );

      // Check similarity threshold
      if (candidate.similarity < this.similarityThreshold) {
        this.logger.log(
          `Cache miss: Similarity ${candidate.similarity.toFixed(3)} below threshold ${this.similarityThreshold}`,
        );
        return null;
      }

      // Skip LLM verification for very high similarity
      if (candidate.similarity >= this.verificationThreshold) {
        this.logger.log(
          `Cache hit: Very high similarity ${candidate.similarity.toFixed(3)}, skipping verification`,
        );
        return {
          ...candidate,
          cache_verified: false, // Skipped verification
        };
      }

      // LLM verification to prevent false positives (negation detection)
      const isEquivalent = await this.groqService.verifySementicEquivalence(
        candidate.query,
        query,
      );

      if (isEquivalent) {
        this.logger.log(
          `Cache hit: Similarity ${candidate.similarity.toFixed(3)}, LLM verified as equivalent`,
        );
        return {
          ...candidate,
          cache_verified: true,
        };
      } else {
        this.logger.warn(
          `Cache miss: Similarity ${candidate.similarity.toFixed(3)} but LLM detected semantic difference`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache lookup failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Cache a query response with embedding
   * Async operation - doesn't block user response
   */
  async cacheResponse(
    queryId: string,
    response: string,
    intent: QueryIntent,
  ): Promise<void> {
    try {
      // Generate embedding for the response query
      const query = await this.prisma.chat_queries.findUnique({
        where: { id: queryId },
        select: { query: true },
      });

      if (!query) {
        this.logger.warn(`Cannot cache: query ${queryId} not found`);
        return;
      }

      const embedding = await this.embeddingService.generateEmbedding(query.query);
      const embeddingVector = `[${embedding.join(',')}]`;

      // Update the chat_queries record with embedding
      await this.prisma.$executeRaw`
        UPDATE chat_queries
        SET response_embedding = ${embeddingVector}::vector
        WHERE id = ${queryId}::uuid
      `;

      this.logger.log(
        `Cached response for query ${queryId} with intent ${intent}`,
      );
    } catch (error) {
      this.logger.error(`Cache write failed: ${(error as Error).message}`);
      // Don't throw - cache failures shouldn't affect user experience
    }
  }

  /**
   * Invalidate cache by context (building, user, apartment)
   * Called by event listeners when underlying data changes
   */
  async invalidateByContext(context: {
    intent?: QueryIntent;
    buildingId?: string;
    userId?: string;
    apartmentId?: string;
  }): Promise<number> {
    try {
      const where: any = {};

      if (context.intent) {
        where.intent = context.intent;
      }

      if (context.userId) {
        where.user_id = context.userId;
      }

      // For now, invalidate by deleting the cache entries
      // In future, could track building/apartment context with metadata
      const result = await this.prisma.chat_queries.deleteMany({
        where,
      });

      this.logger.log(
        `Invalidated ${result.count} cached queries for context: ${JSON.stringify(context)}`,
      );

      return result.count;
    } catch (error) {
      this.logger.error(`Cache invalidation failed: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get TTL interval SQL string based on intent
   */
  private getTtlInterval(intent?: QueryIntent): string {
    switch (intent) {
      case QueryIntent.POLICY_QUERY:
        return '7 days'; // Policies change infrequently
      case QueryIntent.BILLING_QUERY:
        return '6 hours'; // Financial data updates frequently
      case QueryIntent.SMALL_TALK:
        return '30 days'; // Greetings don't change
      default:
        return '3 days'; // General knowledge
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getStats(): Promise<{
    totalCached: number;
    byIntent: Record<string, number>;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      // Count all queries (simplified - in production, would check embedding existence via raw SQL)
      const totalCached = await this.prisma.chat_queries.count();

      const byIntent = await this.prisma.chat_queries.groupBy({
        by: ['intent'],
        _count: { id: true },
      });

      const oldest = await this.prisma.chat_queries.findFirst({
        orderBy: { created_at: 'asc' },
        select: { created_at: true },
      });

      const newest = await this.prisma.chat_queries.findFirst({
        orderBy: { created_at: 'desc' },
        select: { created_at: true },
      });

      return {
        totalCached,
        byIntent: byIntent.reduce(
          (acc, item) => {
            if (item.intent) {
              acc[item.intent] = item._count.id;
            }
            return acc;
          },
          {} as Record<string, number>,
        ),
        oldestEntry: oldest?.created_at || null,
        newestEntry: newest?.created_at || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${(error as Error).message}`);
      return {
        totalCached: 0,
        byIntent: {},
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}
