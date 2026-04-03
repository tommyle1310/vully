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

// Database query result interfaces
interface ApartmentQueryResult {
  id: string;
  unit_number: string;
  status: string;
  unit_type: string | null;
  bedroom_count: number;
  bathroom_count: number;
  gross_area: number | null;
  net_area: number | null;
  floor_index: number;
  building: {
    id: string;
    name: string;
    address: string;
  };
}

interface BuildingQueryResult {
  id: string;
  name: string;
  address: string;
  city: string;
  floor_count: number;
  is_active: boolean;
  apartmentStats: {
    total: number;
    vacant: number;
    occupied: number;
    maintenance: number;
  };
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
   * Handle chat query with RAG + Real-time database lookup
   * @param dto Chat query data
   * @returns AI response with sources
   */
  async chat(dto: ChatQueryDto): Promise<ChatResponse> {
    const startTime = Date.now();
    const { query, userId, context } = dto;

    this.logger.log(`Chat query from user ${userId}: ${query.substring(0, 50)}...`);

    // Declare outside try block so they're accessible in catch
    let relevantDocs: Awaited<ReturnType<typeof this.documentService.searchDocuments>> = [];
    let databaseContext: string | null = null;

    try {
      // Check rate limit
      await this.checkRateLimit(userId);

      // Get user info for context
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          contracts_contracts_tenant_idTousers: {
            where: { status: 'active' },
            include: {
              apartments: {
                include: {
                  buildings: true,
                },
              },
            },
          },
        },
      });

      // Search for relevant documents (wrap in try-catch to handle embedding errors)
      try {
        relevantDocs = await this.documentService.searchDocuments(query, 5);
      } catch (docError) {
        this.logger.warn(`Document search failed: ${(docError as Error).message}`);
        // Continue without document context
      }

      // Build context from relevant documents
      const documentContext = relevantDocs
        .map((doc, index) => {
          return `[Document ${index + 1}: ${doc.title} (${doc.category})]\n${doc.content}\n`;
        })
        .join('\n');

      // Build user context
      let userContext = '';
      if (user) {
        userContext = `User: ${user.first_name} ${user.last_name} (${user.role})\n`;
        if (user.contracts_contracts_tenant_idTousers.length > 0) {
          const contract = user.contracts_contracts_tenant_idTousers[0];
          userContext += `Apartment: ${contract.apartments.buildings.name}, Unit ${contract.apartments.unit_number}\n`;
          userContext += `Rent: ${contract.rent_amount} VND/month\n`;
        }
      }

      // If specific apartment or building ID provided, add more context
      if (context?.apartmentId) {
        const apartment = await this.prisma.apartments.findUnique({
          where: { id: context.apartmentId },
          include: { buildings: true },
        });
        if (apartment) {
          userContext += `\nQuerying about: ${apartment.buildings.name}, Unit ${apartment.unit_number}\n`;
        }
      }

      // Step 1: Query database for real-time apartment/building data if needed
      try {
        databaseContext = await this.queryDatabaseForContext(query, context?.buildingId);
      } catch (dbError) {
        this.logger.warn(`Database context query failed: ${(dbError as Error).message}`);
        // Continue without database context
      }

      // Generate AI response using Gemini
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

      // Save query to database
      await this.prisma.chat_queries.create({
        data: {
          user_id: userId,
          query,
          response: responseText,
          source_docs: relevantDocs.map((doc) => doc.documentId),
          tokens_used: 0, // Gemini doesn't provide token count easily
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
   * Fallback when AI quota is exceeded: synthesise a response from document excerpts and database context directly.
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
    
    // If we have database context, format it nicely
    if (databaseContext) {
      responseText = this.formatDatabaseContextAsMarkdown(databaseContext, query);
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
   * Format raw database context into clean markdown response
   */
  private formatDatabaseContextAsMarkdown(context: string, query: string): string {
    const lines = context.split('\n');
    let markdown = '';
    
    // Extract key information
    let totalMatching = 0;
    let buildingName = '';
    let vacantCount = 0;
    const apartments: string[] = [];
    let bedroomSummary: Record<string, number> = {};
    
    for (const line of lines) {
      // Extract building name
      const buildingMatch = line.match(/^Building:\s*(.+)$/);
      if (buildingMatch && !buildingName) {
        buildingName = buildingMatch[1].trim();
      }
      
      // Extract total matching
      const totalMatch = line.match(/Total matching apartments:\s*(\d+)/);
      if (totalMatch) {
        totalMatching = parseInt(totalMatch[1], 10);
      }
      
      // Extract vacant count from building info
      const vacantMatch = line.match(/Vacant:\s*(\d+)/);
      if (vacantMatch) {
        vacantCount = parseInt(vacantMatch[1], 10);
      }
      
      // Extract apartment units
      const unitMatch = line.match(/^\s*-\s*Unit\s+(\w+):\s*(.+)$/);
      if (unitMatch) {
        apartments.push(`• **Unit ${unitMatch[1]}** - ${unitMatch[2]}`);
      }
      
      // Extract bedroom summary
      const bedroomSummaryMatch = line.match(/Summary by bedroom count:\s*(\{.+\})/);
      if (bedroomSummaryMatch) {
        try {
          bedroomSummary = JSON.parse(bedroomSummaryMatch[1]);
        } catch { /* ignore */ }
      }
    }
    
    // Build a clean response
    if (totalMatching > 0) {
      // Count query (e.g., "How many...")
      if (query.toLowerCase().includes('how many') || query.toLowerCase().includes('bao nhiêu')) {
        markdown = `**${totalMatching}** apartments found`;
        if (buildingName) markdown += ` in **${buildingName}**`;
        markdown += '.\n\n';
        
        // Add summary
        if (Object.keys(bedroomSummary).length > 0) {
          const summaryParts = Object.entries(bedroomSummary).map(([k, v]) => `${v} ${k}`);
          markdown += `📊 **Summary:** ${summaryParts.join(', ')}\n\n`;
        }
        
        // Show up to 5 examples
        if (apartments.length > 0) {
          markdown += `**Sample units:**\n`;
          markdown += apartments.slice(0, 5).join('\n');
          if (apartments.length > 5) {
            markdown += `\n\n_...and ${apartments.length - 5} more units available._`;
          }
        }
      } else {
        // List query (e.g., "Show me...")
        markdown = `Found **${totalMatching}** matching apartments`;
        if (buildingName) markdown += ` in **${buildingName}**`;
        markdown += ':\n\n';
        
        // Show apartments
        if (apartments.length > 0) {
          markdown += apartments.slice(0, 10).join('\n');
          if (apartments.length > 10) {
            markdown += `\n\n_...and ${apartments.length - 10} more units._`;
          }
        }
      }
    } else if (context.includes('Building Information')) {
      // Building stats query
      const addressMatch = context.match(/Address:\s*(.+)/);
      const floorsMatch = context.match(/Floors:\s*(\d+)/);
      const totalAptMatch = context.match(/Total apartments:\s*(\d+)/);
      
      markdown = `## ${buildingName || 'Building Information'}\n\n`;
      if (addressMatch) markdown += `📍 **Address:** ${addressMatch[1].trim()}\n`;
      if (floorsMatch) markdown += `🏢 **Floors:** ${floorsMatch[1]}\n`;
      if (totalAptMatch) markdown += `🏠 **Total apartments:** ${totalAptMatch[1]}\n`;
      if (vacantCount > 0) markdown += `✅ **Available:** ${vacantCount}\n`;
    } else if (context.includes('No apartments found')) {
      markdown = '❌ No apartments found matching your criteria. Try adjusting your search filters.';
    } else {
      // Fallback: return cleaned-up context
      markdown = context
        .replace(/=== (.+) ===/g, '## $1')
        .replace(/Filters applied: \{[^}]+\}\n?/g, '')
        .replace(/Summary by unit type: \{[^}]+\}\n?/g, '')
        .replace(/Summary by bedroom count: \{[^}]+\}\n?/g, '');
    }
    
    return markdown.trim();
  }

  /**
   * Check if user has exceeded rate limit
   */
  private async checkRateLimit(userId: string): Promise<void> {
    // Admin users have no rate limit
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'admin') {
      return; // No limit for admin
    }

    // Check queries in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const queryCount = await this.prisma.chat_queries.count({
      where: {
        user_id: userId,
        created_at: {
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

  /**
   * Get user's query count for today
   * @param userId User ID
   * @returns Number of queries made today
   */
  async getUserQueryCount(userId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.prisma.chat_queries.count({
      where: {
        user_id: userId,
        created_at: {
          gte: oneDayAgo,
        },
      },
    });
  }

  // ========== Database Lookup Methods for Real-time Apartment/Building Queries ==========

  /**
   * Query database for context based on the user's question.
   * Detects if the query is asking about apartments or buildings and fetches relevant data.
   */
  private async queryDatabaseForContext(query: string, buildingIdHint?: string): Promise<string | null> {
    const lowerQuery = query.toLowerCase();
    
    // Keywords that indicate apartment/building queries
    const apartmentKeywords = ['apartment', 'căn hộ', 'phòng', 'room', 'unit', 'available', 'trống', 'vacant', 'bedroom', 'phòng ngủ', 'studio', 'floor', 'tầng', 'lầu'];
    const buildingKeywords = ['building', 'tòa nhà', 'tòa', 'total', 'tổng', 'how many', 'bao nhiêu', 'statistics', 'thống kê'];
    const countKeywords = ['how many', 'bao nhiêu', 'count', 'số lượng', 'available', 'trống', 'vacant'];
    
    const isApartmentQuery = apartmentKeywords.some(kw => lowerQuery.includes(kw));
    const isBuildingQuery = buildingKeywords.some(kw => lowerQuery.includes(kw));
    const isCountQuery = countKeywords.some(kw => lowerQuery.includes(kw));

    if (!isApartmentQuery && !isBuildingQuery) {
      return null; // Not a database query
    }

    this.logger.log(`Detected data query - apartment: ${isApartmentQuery}, building: ${isBuildingQuery}, count: ${isCountQuery}`);

    // Extract filters from the query
    const filters = this.extractFiltersFromQuery(query);
    this.logger.log(`Extracted filters: ${JSON.stringify(filters)}`);
    
    // If buildingIdHint is provided, use it
    if (buildingIdHint) {
      filters.buildingId = buildingIdHint;
    }

    let context = '';

    try {
      // If asking about buildings or need building context
      if (isBuildingQuery || filters.buildingName) {
        this.logger.log(`Searching buildings with name filter: ${filters.buildingName}`);
        const buildings = await this.searchBuildings(filters.buildingName);
        this.logger.log(`Found ${buildings.length} buildings`);
        if (buildings.length > 0) {
          context += `\n=== Building Information ===\n`;
          for (const b of buildings) {
            context += `Building: ${b.name}\n`;
            context += `  Address: ${b.address}, ${b.city}\n`;
            context += `  Floors: ${b.floor_count}\n`;
            context += `  Total apartments: ${b.apartmentStats.total}\n`;
            context += `  Vacant: ${b.apartmentStats.vacant}\n`;
            context += `  Occupied: ${b.apartmentStats.occupied}\n`;
            context += `  Maintenance: ${b.apartmentStats.maintenance}\n`;
            
            // If asking about apartments, also include apartment breakdown
            if (isApartmentQuery) {
              filters.buildingId = b.id;
            }
          }
        } else {
          this.logger.warn(`No buildings found for name: ${filters.buildingName}`);
        }
      }

      // Query apartments if needed
      if (isApartmentQuery) {
        this.logger.log(`Searching apartments with filters: ${JSON.stringify(filters)}`);
        const apartments = await this.searchApartments(filters);
        this.logger.log(`Found ${apartments.length} apartments`);
        
        if (apartments.length > 0) {
          // Group by building for better readability
          const byBuilding = new Map<string, typeof apartments>();
          for (const apt of apartments) {
            const key = apt.building.name;
            if (!byBuilding.has(key)) byBuilding.set(key, []);
            byBuilding.get(key)!.push(apt);
          }

          context += `\n=== Apartment Search Results ===\n`;
          context += `Filters applied: ${JSON.stringify(filters)}\n`;
          context += `Total matching apartments: ${apartments.length}\n\n`;

          for (const [buildingName, apts] of byBuilding) {
            context += `Building: ${buildingName}\n`;
            
            // Group by status
            const statusGroups = {
              vacant: apts.filter(a => a.status === 'vacant'),
              occupied: apts.filter(a => a.status === 'occupied'),
              maintenance: apts.filter(a => a.status === 'maintenance'),
              reserved: apts.filter(a => a.status === 'reserved'),
            };

            if (statusGroups.vacant.length > 0) {
              context += `  Available/Vacant apartments (${statusGroups.vacant.length}):\n`;
              for (const apt of statusGroups.vacant.slice(0, 10)) { // Limit to 10
                context += `    - Unit ${apt.unit_number}: ${apt.unit_type || 'N/A'}, ${apt.bedroom_count} bedroom(s), ${apt.bathroom_count} bathroom(s), Floor ${apt.floor_index}`;
                if (apt.gross_area) context += `, ${apt.gross_area}m²`;
                context += `\n`;
              }
              if (statusGroups.vacant.length > 10) {
                context += `    ... and ${statusGroups.vacant.length - 10} more vacant apartments\n`;
              }
            }

            if (statusGroups.occupied.length > 0) {
              context += `  Occupied apartments: ${statusGroups.occupied.length}\n`;
            }
            if (statusGroups.maintenance.length > 0) {
              context += `  Under maintenance: ${statusGroups.maintenance.length}\n`;
            }
          }

          // Add summary statistics
          const unitTypeStats = apartments.reduce((acc, apt) => {
            const type = apt.unit_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const bedroomStats = apartments.reduce((acc, apt) => {
            const key = `${apt.bedroom_count} bedroom`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          context += `\nSummary by unit type: ${JSON.stringify(unitTypeStats)}\n`;
          context += `Summary by bedroom count: ${JSON.stringify(bedroomStats)}\n`;
        } else {
          context += `\n=== Apartment Search Results ===\n`;
          context += `No apartments found matching the criteria: ${JSON.stringify(filters)}\n`;
        }
      }

      return context || null;
    } catch (error) {
      this.logger.error(`Database query failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Extract filter parameters from natural language query
   */
  private extractFiltersFromQuery(query: string): {
    buildingId?: string;
    buildingName?: string;
    status?: string;
    unitType?: string;
    bedroomCount?: number;
    floorIndex?: number;
  } {
    const lowerQuery = query.toLowerCase();
    const filters: ReturnType<typeof this.extractFiltersFromQuery> = {};

    // Extract building name (look for patterns like "in [Building Name]", "tòa [Name]", "building [Name]")
    const buildingPatterns = [
      /(?:in|at|tại|ở|tòa|building)\s+([A-Za-z0-9\s]+?)(?:\s+building|\s+tòa|,|\?|$)/i,
      /([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)*)\s+(?:building|tòa)/i,
    ];
    for (const pattern of buildingPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        filters.buildingName = match[1].trim();
        break;
      }
    }

    // Extract status
    if (lowerQuery.includes('available') || lowerQuery.includes('trống') || lowerQuery.includes('vacant')) {
      filters.status = 'vacant';
    } else if (lowerQuery.includes('occupied') || lowerQuery.includes('đã thuê')) {
      filters.status = 'occupied';
    } else if (lowerQuery.includes('maintenance') || lowerQuery.includes('bảo trì')) {
      filters.status = 'maintenance';
    }

    // Extract unit type
    if (lowerQuery.includes('studio')) {
      filters.unitType = 'studio';
    } else if (lowerQuery.includes('penthouse')) {
      filters.unitType = 'penthouse';
    } else if (lowerQuery.includes('duplex')) {
      filters.unitType = 'duplex';
    } else if (lowerQuery.includes('shophouse')) {
      filters.unitType = 'shophouse';
    }

    // Extract bedroom count
    const bedroomPatterns = [
      /(\d+)[-\s]*(?:bedroom|bed|br|phòng ngủ|pn)/i, // Handle "3-bedroom", "3 bedroom", "3bedroom"
      /(?:bedroom|phòng ngủ)\s*(?:count|số)?\s*(?:is|=|:)?\s*(\d+)/i,
    ];
    for (const pattern of bedroomPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        filters.bedroomCount = parseInt(match[1], 10);
        break;
      }
    }

    // Infer bedroom count from unit type keywords
    if (!filters.bedroomCount && !filters.unitType) {
      if (lowerQuery.includes('three-bedroom') || lowerQuery.includes('three bedroom') || lowerQuery.includes('3-bedroom') || lowerQuery.includes('3 bedroom')) {
        filters.bedroomCount = 3;
      } else if (lowerQuery.includes('two-bedroom') || lowerQuery.includes('two bedroom') || lowerQuery.includes('2-bedroom') || lowerQuery.includes('2 bedroom')) {
        filters.bedroomCount = 2;
      } else if (lowerQuery.includes('one-bedroom') || lowerQuery.includes('one bedroom') || lowerQuery.includes('1-bedroom') || lowerQuery.includes('1 bedroom')) {
        filters.bedroomCount = 1;
      }
    }

    // Extract floor
    const floorPatterns = [
      /(?:floor|tầng|lầu)\s*(\d+)/i,
      /(\d+)(?:st|nd|rd|th)?\s*(?:floor|tầng|lầu)/i,
    ];
    for (const pattern of floorPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        filters.floorIndex = parseInt(match[1], 10);
        break;
      }
    }

    this.logger.debug(`Extracted filters: ${JSON.stringify(filters)}`);
    return filters;
  }

  /**
   * Search apartments based on filters
   */
  private async searchApartments(filters: {
    buildingId?: string;
    buildingName?: string;
    status?: string;
    unitType?: string;
    bedroomCount?: number;
    floorIndex?: number;
  }): Promise<ApartmentQueryResult[]> {
    const where: Record<string, unknown> = {};

    // Building filter
    if (filters.buildingId) {
      where.building_id = filters.buildingId;
    } else if (filters.buildingName) {
      // Search building by name (case-insensitive)
      const building = await this.prisma.buildings.findFirst({
        where: {
          name: { contains: filters.buildingName, mode: 'insensitive' },
          is_active: true,
        },
      });
      if (building) {
        where.building_id = building.id;
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.unitType) {
      where.unit_type = filters.unitType;
    }
    if (filters.bedroomCount !== undefined) {
      where.bedroom_count = filters.bedroomCount;
    }
    if (filters.floorIndex !== undefined) {
      where.floor_index = filters.floorIndex;
    }

    const apartments = await this.prisma.apartments.findMany({
      where,
      take: 50, // Limit results
      orderBy: [
        { building_id: 'asc' },
        { floor_index: 'asc' },
        { unit_number: 'asc' },
      ],
      include: {
        buildings: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    return apartments.map((apt) => ({
      id: apt.id,
      unit_number: apt.unit_number,
      status: apt.status,
      unit_type: apt.unit_type,
      bedroom_count: apt.bedroom_count,
      bathroom_count: apt.bathroom_count,
      gross_area: apt.gross_area ? Number(apt.gross_area) : null,
      net_area: apt.net_area ? Number(apt.net_area) : null,
      floor_index: apt.floor_index,
      building: {
        id: apt.buildings.id,
        name: apt.buildings.name,
        address: apt.buildings.address,
      },
    }));
  }

  /**
   * Search buildings and get statistics
   */
  private async searchBuildings(buildingName?: string): Promise<BuildingQueryResult[]> {
    const where: Record<string, unknown> = { is_active: true };

    if (buildingName) {
      where.name = { contains: buildingName, mode: 'insensitive' };
    }

    const buildings = await this.prisma.buildings.findMany({
      where,
      take: 10,
      orderBy: { name: 'asc' },
    });

    const results: BuildingQueryResult[] = [];

    for (const building of buildings) {
      // Get apartment statistics for this building
      const stats = await this.prisma.apartments.groupBy({
        by: ['status'],
        where: { building_id: building.id },
        _count: { id: true },
      });

      const statusMap: Record<string, number> = {};
      let total = 0;
      for (const s of stats) {
        statusMap[s.status] = s._count.id;
        total += s._count.id;
      }

      results.push({
        id: building.id,
        name: building.name,
        address: building.address,
        city: building.city,
        floor_count: building.floor_count,
        is_active: building.is_active,
        apartmentStats: {
          total,
          vacant: statusMap['vacant'] || 0,
          occupied: statusMap['occupied'] || 0,
          maintenance: statusMap['maintenance'] || 0,
        },
      });
    }

    return results;
  }
}
