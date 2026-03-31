import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for generating embeddings using Gemini REST API
 * Uses gemini-embedding-001 — 768 dimensions
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private readonly embeddingModel = 'gemini-embedding-001';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate embedding vector for text via Gemini v1 REST API
   * Requests 768 dimensions (outputDimensionality) to match DB column
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const url = `${this.baseUrl}/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.embeddingModel}`,
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini embedding API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as { embedding: { values: number[] } };
      this.logger.debug(`Generated embedding for text (length: ${text.length})`);
      return data.embedding.values;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate embedding: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (sequential to avoid rate limiting)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      for (const text of texts) {
        embeddings.push(await this.generateEmbedding(text));
      }
      this.logger.debug(`Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate embeddings: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
