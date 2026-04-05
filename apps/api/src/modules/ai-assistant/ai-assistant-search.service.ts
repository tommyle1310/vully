import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ApartmentQueryResult,
  BuildingQueryResult,
} from '../../common/types/service-types';

@Injectable()
export class AiAssistantSearchService {
  private readonly logger = new Logger(AiAssistantSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Query database for context based on the user's question.
   * Detects if the query is asking about apartments or buildings and fetches relevant data.
   */
  async queryDatabaseForContext(query: string, buildingIdHint?: string): Promise<string | null> {
    const intent = this.detectQueryIntent(query);

    if (!intent.isApartmentQuery && !intent.isBuildingQuery) {
      return null;
    }

    this.logger.log(`Detected data query - apartment: ${intent.isApartmentQuery}, building: ${intent.isBuildingQuery}, count: ${intent.isCountQuery}`);

    const filters = this.extractFiltersFromQuery(query);
    this.logger.log(`Extracted filters: ${JSON.stringify(filters)}`);

    if (buildingIdHint) {
      filters.buildingId = buildingIdHint;
    }

    let context = '';

    try {
      if (intent.isBuildingQuery || filters.buildingName) {
        this.logger.log(`Searching buildings with name filter: ${filters.buildingName}`);
        const buildings = await this.searchBuildings(filters.buildingName);
        this.logger.log(`Found ${buildings.length} buildings`);

        if (buildings.length > 0) {
          context += this.buildBuildingContext(buildings);
          if (intent.isApartmentQuery) {
            filters.buildingId = buildings[buildings.length - 1].id;
          }
        } else {
          this.logger.warn(`No buildings found for name: ${filters.buildingName}`);
        }
      }

      if (intent.isApartmentQuery) {
        this.logger.log(`Searching apartments with filters: ${JSON.stringify(filters)}`);
        const apartments = await this.searchApartments(filters);
        this.logger.log(`Found ${apartments.length} apartments`);
        context += this.buildApartmentContext(apartments, filters);
      }

      return context || null;
    } catch (error) {
      this.logger.error(`Database query failed: ${(error as Error).message}`);
      return null;
    }
  }

  detectQueryIntent(query: string) {
    const lowerQuery = query.toLowerCase();

    const apartmentKeywords = ['apartment', 'căn hộ', 'phòng', 'room', 'unit', 'available', 'trống', 'vacant', 'bedroom', 'phòng ngủ', 'studio', 'floor', 'tầng', 'lầu'];
    const buildingKeywords = ['building', 'tòa nhà', 'tòa', 'total', 'tổng', 'how many', 'bao nhiêu', 'statistics', 'thống kê'];
    const countKeywords = ['how many', 'bao nhiêu', 'count', 'số lượng', 'available', 'trống', 'vacant'];

    return {
      isApartmentQuery: apartmentKeywords.some(kw => lowerQuery.includes(kw)),
      isBuildingQuery: buildingKeywords.some(kw => lowerQuery.includes(kw)),
      isCountQuery: countKeywords.some(kw => lowerQuery.includes(kw)),
    };
  }

  buildBuildingContext(buildings: BuildingQueryResult[]): string {
    let context = `\n=== Building Information ===\n`;
    for (const b of buildings) {
      context += `Building: ${b.name}\n`;
      context += `  Address: ${b.address}, ${b.city}\n`;
      context += `  Floors: ${b.floor_count}\n`;
      context += `  Total apartments: ${b.apartmentStats.total}\n`;
      context += `  Vacant: ${b.apartmentStats.vacant}\n`;
      context += `  Occupied: ${b.apartmentStats.occupied}\n`;
      context += `  Maintenance: ${b.apartmentStats.maintenance}\n`;
    }
    return context;
  }

  buildApartmentContext(
    apartments: ApartmentQueryResult[],
    filters: ReturnType<typeof this.extractFiltersFromQuery>,
  ): string {
    if (apartments.length === 0) {
      return `\n=== Apartment Search Results ===\nNo apartments found matching the criteria: ${JSON.stringify(filters)}\n`;
    }

    const byBuilding = new Map<string, typeof apartments>();
    for (const apt of apartments) {
      const key = apt.building.name;
      if (!byBuilding.has(key)) byBuilding.set(key, []);
      byBuilding.get(key)!.push(apt);
    }

    let context = `\n=== Apartment Search Results ===\n`;
    context += `Filters applied: ${JSON.stringify(filters)}\n`;
    context += `Total matching apartments: ${apartments.length}\n\n`;

    for (const [buildingName, apts] of byBuilding) {
      context += `Building: ${buildingName}\n`;

      const statusGroups = {
        vacant: apts.filter(a => a.status === 'vacant'),
        occupied: apts.filter(a => a.status === 'occupied'),
        maintenance: apts.filter(a => a.status === 'maintenance'),
        reserved: apts.filter(a => a.status === 'reserved'),
      };

      if (statusGroups.vacant.length > 0) {
        context += `  Available/Vacant apartments (${statusGroups.vacant.length}):\n`;
        for (const apt of statusGroups.vacant.slice(0, 10)) {
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

    return context;
  }

  /**
   * Extract filter parameters from natural language query
   */
  extractFiltersFromQuery(query: string): {
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
  async searchApartments(filters: {
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
      take: 50,
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
  async searchBuildings(buildingName?: string): Promise<BuildingQueryResult[]> {
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
