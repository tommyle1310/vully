import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, UnitType } from '@prisma/client';
import { NET_AREA_RATIO } from '../../../common/constants/defaults';

@Injectable()
export class BuildingsSvgService {
  private readonly logger = new Logger(BuildingsSvgService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse apartment definitions from SVG metadata and upsert apartment records
   * for each floor. The SVG floor plan is treated as a single-floor template
   * that is replicated across all floors of the building.
   */
  async syncApartmentsFromSvg(
    buildingId: string,
    svgMapData: string,
    floorCount: number,
  ): Promise<void> {
    const templates = this.parseSvgApartmentTemplates(svgMapData);

    if (templates.length === 0) {
      this.logger.debug({ event: 'svg_sync_no_apartments', buildingId });
      return;
    }

    this.logger.log({
      event: 'svg_sync_apartments',
      buildingId,
      templateCount: templates.length,
      floorCount,
    });

    await this.upsertFloorApartments(buildingId, templates, floorCount);

    this.logger.log({
      event: 'svg_sync_complete',
      buildingId,
      totalApartments: templates.length * floorCount,
    });
  }

  private parseSvgApartmentTemplates(svgMapData: string): Array<{
    id: string;
    type: string;
    name: string;
    label: string;
    areaSqm: number;
  }> {
    const apartmentRegex =
      /<apartment\s+id="([^"]*)"\s+type="([^"]*)"\s+name="([^"]*)"\s+label="([^"]*)"\s+area-sqm="([^"]*)"\s*\/>/g;

    const templates: Array<{
      id: string;
      type: string;
      name: string;
      label: string;
      areaSqm: number;
    }> = [];

    let match: RegExpExecArray | null;
    while ((match = apartmentRegex.exec(svgMapData)) !== null) {
      templates.push({
        id: match[1],
        type: match[2],
        name: match[3],
        label: match[4],
        areaSqm: parseFloat(match[5]) || 0,
      });
    }

    return templates;
  }

  private async upsertFloorApartments(
    buildingId: string,
    templates: Array<{ id: string; type: string; name: string; label: string; areaSqm: number }>,
    floorCount: number,
  ): Promise<void> {
    for (let floor = 1; floor <= floorCount; floor++) {
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const unitIndex = String(i + 1).padStart(2, '0');
        const unit_number = `${floor}${unitIndex}`;
        const { unitType, bedroomCount, bathroomCount, grossArea, netArea } =
          this.inferUnitProperties(template);
        const apartmentCode = `${String(floor).padStart(2, '0')}-${unitIndex}`;
        const floorLabel = String(floor);

        await this.prisma.apartments.upsert({
          where: {
            building_id_unit_number: {
              building_id: buildingId,
              unit_number: unit_number,
            },
          },
          create: {
            building_id: buildingId,
            unit_number: unit_number,
            floor_index: floor,
            apartment_code: apartmentCode,
            floor_label: floorLabel,
            unit_type: unitType,
            gross_area: grossArea,
            net_area: netArea,
            bedroom_count: bedroomCount,
            bathroom_count: bathroomCount,
            svg_element_id: template.id || null,
            features: {
              apartmentType: template.type,
              apartmentName: template.name,
              templateLabel: template.label,
            } as Prisma.InputJsonValue,
            status: 'vacant',
            updated_at: new Date(),
          },
          update: {
            floor_index: floor,
            svg_element_id: template.id || null,
            ...(unitType && { unit_type: unitType }),
            features: {
              apartmentType: template.type,
              apartmentName: template.name,
              templateLabel: template.label,
            } as Prisma.InputJsonValue,
            updated_at: new Date(),
          },
        });
      }
    }
  }

  private inferUnitProperties(template: { type: string; areaSqm: number }) {
    const unitType = this.getUnitType(template.type);
    const bedroomCount = this.getBedroomCount(template.type);
    const bathroomCount = this.getBathroomCount(template.type);
    const grossArea = template.areaSqm > 0 ? template.areaSqm : null;
    const netArea = grossArea ? Math.round(grossArea * NET_AREA_RATIO * 100) / 100 : null;
    return { unitType, bedroomCount, bathroomCount, grossArea, netArea };
  }

  /**
   * Map template type string to valid UnitType enum value.
   */
  private getUnitType(type: string): UnitType {
    const t = type.toLowerCase();
    if (t.includes('studio')) return UnitType.studio;
    if (t.includes('shophouse') || t.includes('shop')) return UnitType.shophouse;
    if (t.includes('penthouse') || t.includes('pent')) return UnitType.penthouse;
    if (t.includes('duplex')) return UnitType.duplex;
    if (t.includes('3') || t.includes('three')) return UnitType.three_bedroom;
    if (t.includes('2') || t.includes('two')) return UnitType.two_bedroom;
    if (t.includes('1') || t.includes('one')) return UnitType.one_bedroom;
    return UnitType.one_bedroom;
  }

  private getBedroomCount(type: string): number {
    const t = type.toLowerCase();
    if (t.includes('studio')) return 0;
    if (t.includes('shophouse') || t.includes('shop')) return 0;
    if (t.includes('penthouse') || t.includes('pent')) return 3;
    if (t.includes('duplex')) return 2;
    if (t.includes('3') || t.includes('three')) return 3;
    if (t.includes('2') || t.includes('two')) return 2;
    if (t.includes('1') || t.includes('one')) return 1;
    return 1;
  }

  private getBathroomCount(type: string): number {
    const t = type.toLowerCase();
    if (t.includes('penthouse') || t.includes('pent')) return 3;
    if (t.includes('duplex')) return 2;
    if (t.includes('3') || t.includes('three')) return 2;
    if (t.includes('2') || t.includes('two')) return 2;
    return 1;
  }
}
