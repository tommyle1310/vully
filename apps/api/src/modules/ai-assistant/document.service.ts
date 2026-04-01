import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

interface CreateDocumentDto {
  title: string;
  content: string;
  category: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  documentId: string;
  chunkId: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
  metadata: any;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly chunkSize = 1000; // characters per chunk
  private readonly chunkOverlap = 200; // overlap between chunks

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Create a new document with embedded chunks
   * @param dto Document data
   * @returns Created document with chunks
   */
  async createDocument(dto: CreateDocumentDto) {
    const { title, content, category, metadata = {} } = dto;

    this.logger.log(`Creating document: ${title}`);

    // Create document
    const document = await this.prisma.documents.create({
      data: {
        title,
        content,
        category,
        metadata,
        updated_at: new Date(),
      },
    });

    // Split content into chunks
    const chunks = this.splitTextIntoChunks(content);
    this.logger.debug(`Split document into ${chunks.length} chunks`);

    // Generate embeddings for all chunks
    const embeddings = await this.embeddingService.generateEmbeddings(chunks);

    // Create document chunks with embeddings (sequential to respect DB constraints)
    for (let index = 0; index < chunks.length; index++) {
      const embeddingString = `[${embeddings[index].join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index, metadata, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3::vector, $4, '{}'::jsonb, NOW())`,
        document.id,
        chunks[index],
        embeddingString,
        index,
      );
    }

    this.logger.log(`Document created with ${chunks.length} chunks: ${document.id}`);

    return document;
  }

  /**
   * Search for relevant document chunks using vector similarity
   * @param query Search query
   * @param limit Number of results to return
   * @param category Optional category filter
   * @returns Array of relevant document chunks
   */
  async searchDocuments(
    query: string,
    limit: number = 5,
    category?: string,
  ): Promise<SearchResult[]> {
    this.logger.debug(`Searching documents for: ${query}`);

    try {
      // Generate embedding for query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      // Search using cosine similarity via $queryRawUnsafe avoiding Prisma.raw vector issue
      const categoryClause = category ? `AND d.category = '${category.replace(/'/g, "''")}'` : '';

      const results = await this.prisma.$queryRawUnsafe<Array<{
        documentId: string;
        chunkId: string;
        title: string;
        content: string;
        category: string;
        metadata: unknown;
        similarity: string;
      }>>(
        `SELECT 
          d.id as "documentId",
          dc.id as "chunkId",
          d.title,
          dc.content,
          d.category,
          d.metadata,
          1 - (dc.embedding <=> $1::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE d.is_active = true ${categoryClause}
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $2`,
        embeddingString,
        limit,
      );

      this.logger.debug(`Found ${results.length} relevant chunks (vector search)`);

      return results.map((r) => ({
        documentId: r.documentId,
        chunkId: r.chunkId,
        title: r.title,
        content: r.content,
        category: r.category,
        similarity: parseFloat(r.similarity),
        metadata: r.metadata,
      }));
    } catch (error) {
      const err = error as Error;
      const isQuotaError =
        err.message.includes('429') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('quota');

      if (isQuotaError) {
        this.logger.warn('Embedding API quota exceeded — falling back to full-text keyword search');
        return this.keywordSearchDocuments(query, limit, category);
      }
      throw error;
    }
  }

  /**
   * Fallback full-text + ILIKE keyword search when embedding quota is exhausted
   */
  private async keywordSearchDocuments(
    query: string,
    limit: number,
    category?: string,
  ): Promise<SearchResult[]> {
    const categoryClause = category ? `AND d.category = $3` : '';
    const params: unknown[] = [query, limit];
    if (category) params.push(category);

    const results = await this.prisma.$queryRawUnsafe<Array<{
      documentId: string;
      chunkId: string;
      title: string;
      content: string;
      category: string;
      metadata: unknown;
      similarity: string;
    }>>(
      `SELECT
        d.id as "documentId",
        dc.id as "chunkId",
        d.title,
        dc.content,
        d.category,
        d.metadata,
        COALESCE(
          ts_rank(
            to_tsvector('english', dc.content || ' ' || d.title),
            websearch_to_tsquery('english', $1)
          ), 0
        ) as similarity
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE d.is_active = true ${categoryClause}
        AND (
          to_tsvector('english', dc.content || ' ' || d.title) @@ websearch_to_tsquery('english', $1)
          OR EXISTS (
            SELECT 1 FROM unnest(string_to_array(lower($1), ' ')) AS word
            WHERE length(word) > 2
              AND (lower(dc.content) LIKE '%' || word || '%'
                OR lower(d.title) LIKE '%' || word || '%')
          )
        )
      ORDER BY similarity DESC
      LIMIT $2`,
      ...params,
    );

    this.logger.debug(`Found ${results.length} relevant chunks (keyword search)`);

    return results.map((r) => ({
      documentId: r.documentId,
      chunkId: r.chunkId,
      title: r.title,
      content: r.content,
      category: r.category,
      similarity: parseFloat(r.similarity),
      metadata: r.metadata,
    }));
  }

  /**
   * Get all documents
   * @param category Optional category filter
   * @returns Array of documents
   */
  async getDocuments(category?: string) {
    return this.prisma.documents.findMany({
      where: {
        is_active: true,
        ...(category && { category }),
      },
      include: {
        document_chunks: {
          select: {
            id: true,
            chunk_index: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Get document by ID
   * @param id Document ID
   * @returns Document with chunks
   */
  async getDocument(id: string) {
    return this.prisma.documents.findUnique({
      where: { id },
      include: {
        document_chunks: {
          select: {
            id: true,
            content: true,
            chunk_index: true,
          },
          orderBy: {
            chunk_index: 'asc',
          },
        },
      },
    });
  }

  /**
   * Delete document and its chunks
   * @param id Document ID
   */
  async deleteDocument(id: string) {
    await this.prisma.documents.delete({
      where: { id },
    });
    this.logger.log(`Document deleted: ${id}`);
  }

  /**
   * Split text into overlapping chunks
   * @param text Text to split
   * @returns Array of text chunks
   */
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      const chunk = text.slice(startIndex, endIndex);
      chunks.push(chunk.trim());

      // Move to next chunk with overlap
      startIndex += this.chunkSize - this.chunkOverlap;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }
}
