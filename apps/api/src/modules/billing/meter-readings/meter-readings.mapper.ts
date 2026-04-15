import { MeterReadingWithRelations } from '../../../common/types/prisma-payloads';
import { MeterReadingResponseDto } from '../dto/meter-reading.dto';

export function toMeterReadingResponseDto(reading: MeterReadingWithRelations): MeterReadingResponseDto {
  const currentValue = Number(reading.current_value);
  const previousValue = reading.previous_value
    ? Number(reading.previous_value)
    : undefined;

  return {
    id: reading.id,
    apartmentId: reading.apartment_id,
    utilityTypeId: reading.utility_type_id,
    currentValue,
    previousValue,
    usage: previousValue !== undefined ? currentValue - previousValue : currentValue,
    billingPeriod: reading.billing_period,
    readingDate: reading.reading_date,
    recordedById: reading.recorded_by ?? undefined,
    imageProofUrl: reading.image_proof_url ?? undefined,
    created_at: reading.created_at,
    apartment: reading.apartments
      ? {
          id: reading.apartments.id,
          unit_number: reading.apartments.unit_number,
          buildings: {
            id: reading.apartments.buildings.id,
            name: reading.apartments.buildings.name,
          },
        }
      : undefined,
    utilityType: reading.utility_types
      ? {
          id: reading.utility_types.id,
          code: reading.utility_types.code,
          name: reading.utility_types.name,
          unit: reading.utility_types.unit,
        }
      : undefined,
    recordedBy: reading.users
      ? {
          id: reading.users.id,
          firstName: reading.users.first_name,
          lastName: reading.users.last_name,
        }
      : undefined,
  };
}

/**
 * Maps utility code to the corresponding meter ID field on apartments table.
 */
export function getMeterIdFieldByUtilityCode(code: string): string | null {
  const mapping: Record<string, string> = {
    ELECTRIC: 'electric_meter_id',
    WATER: 'water_meter_id',
    GAS: 'gas_meter_id',
  };
  return mapping[code.toUpperCase()] || null;
}

/**
 * Generates a unique meter ID in format: {PREFIX}-{BUILDING}-{UNIT}
 * Examples: EL-TOMTOWN-101, WT-TOMTOWN-101, GS-TOMTOWN-101
 */
export function generateMeterId(
  utilityCode: string,
  buildingCode: string,
  unitNumber: string,
): string {
  const prefixMap: Record<string, string> = {
    ELECTRIC: 'EL',
    WATER: 'WT',
    GAS: 'GS',
  };
  const prefix = prefixMap[utilityCode.toUpperCase()] || utilityCode.substring(0, 2).toUpperCase();
  const cleanBuilding = buildingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanUnit = unitNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return `${prefix}-${cleanBuilding}-${cleanUnit}`;
}
