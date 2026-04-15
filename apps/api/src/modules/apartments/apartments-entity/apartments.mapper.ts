import { Prisma, apartments } from '@prisma/client';
import { ApartmentResponseDto } from '../dto/apartment.dto';

const toNum = (v: unknown) => (v != null ? Number(v) : null);
const toStr = (v: unknown) => (v != null ? String(v) : null);
const toDate = (v: unknown) => (v instanceof Date ? v.toISOString().split('T')[0] : v != null ? String(v) : null);

export type ApartmentWithRelations = apartments & {
  buildings?: { id: string; name: string; address: string };
  users?: { id: string; first_name: string; last_name: string; email: string } | null;
  contracts?: Array<{
    id: string;
    rent_amount: Prisma.Decimal | number;
    start_date: Date;
    end_date: Date | null;
    status: string;
    users_contracts_tenant_idTousers: { id: string; first_name: string; last_name: string; email: string };
  }>;
};

export function mapOwner(ownerData?: { id: string; first_name: string; last_name: string; email: string } | null) {
  if (!ownerData) return null;
  return {
    id: ownerData.id,
    firstName: ownerData.first_name,
    lastName: ownerData.last_name,
    email: ownerData.email,
  };
}

export function mapActiveContract(contractsData?: Array<{
  id: string;
  rent_amount: Prisma.Decimal | number;
  start_date: Date;
  end_date: Date | null;
  status: string;
  users_contracts_tenant_idTousers: { id: string; first_name: string; last_name: string; email: string };
}>) {
  if (!contractsData || contractsData.length === 0) return null;
  const contract = contractsData[0];
  const tenant = contract.users_contracts_tenant_idTousers;
  return {
    id: contract.id,
    tenant: {
      id: tenant.id,
      firstName: tenant.first_name,
      lastName: tenant.last_name,
      email: tenant.email,
    },
    monthlyRent: typeof contract.rent_amount === 'object' && 'toNumber' in contract.rent_amount
      ? contract.rent_amount.toNumber()
      : Number(contract.rent_amount),
    startDate: contract.start_date.toISOString().split('T')[0],
    endDate: contract.end_date ? contract.end_date.toISOString().split('T')[0] : null,
    status: contract.status,
  };
}

export function toApartmentResponseDto(
  apartment: ApartmentWithRelations,
): ApartmentResponseDto {
  return {
    id: apartment.id,
    buildingId: apartment.building_id,
    unit_number: apartment.unit_number,
    floorIndex: apartment.floor_index,
    status: apartment.status,
    apartmentCode: toStr(apartment.apartment_code),
    floorLabel: toStr(apartment.floor_label),
    unitType: toStr(apartment.unit_type),
    netArea: toNum(apartment.net_area),
    grossArea: toNum(apartment.gross_area),
    ceilingHeight: toNum(apartment.ceiling_height),
    bedroomCount: apartment.bedroom_count,
    bathroomCount: apartment.bathroom_count,
    features: (apartment.features as Record<string, unknown>) || {},
    svgElementId: toStr(apartment.svg_element_id),
    svgPathData: toStr(apartment.svg_path_data),
    centroidX: toNum(apartment.centroid_x),
    centroidY: toNum(apartment.centroid_y),
    orientation: toStr(apartment.orientation),
    balconyDirection: toStr(apartment.balcony_direction),
    isCornerUnit: apartment.is_corner_unit,
    // Ownership
    ownerId: toStr(apartment.owner_id),
    ownershipType: toStr(apartment.ownership_type),
    handoverDate: toDate(apartment.handover_date),
    warrantyExpiryDate: toDate(apartment.warranty_expiry_date),
    isRented: apartment.is_rented,
    vatRate: toNum(apartment.vat_rate),
    // Occupancy
    maxResidents: apartment.max_residents,
    currentResidentCount: apartment.current_resident_count,
    petAllowed: apartment.pet_allowed,
    petLimit: apartment.pet_limit,
    accessCardLimit: apartment.access_card_limit,
    intercomCode: toStr(apartment.intercom_code),
    // Utility & Technical
    electricMeterId: toStr(apartment.electric_meter_id),
    waterMeterId: toStr(apartment.water_meter_id),
    gasMeterId: toStr(apartment.gas_meter_id),
    powerCapacity: apartment.power_capacity,
    acUnitCount: apartment.ac_unit_count,
    fireDetectorId: toStr(apartment.fire_detector_id),
    sprinklerCount: apartment.sprinkler_count,
    internetTerminalLoc: toStr(apartment.internet_terminal_loc),
    // Parking & Assets
    assignedCarSlot: toStr(apartment.assigned_car_slot),
    assignedMotoSlot: toStr(apartment.assigned_moto_slot),
    mailboxNumber: toStr(apartment.mailbox_number),
    storageUnitId: toStr(apartment.storage_unit_id),
    // Billing Config
    mgmtFeeConfigId: toStr(apartment.mgmt_fee_config_id),
    billingStartDate: toDate(apartment.billing_start_date),
    billingCycle: apartment.billing_cycle || 'monthly',
    bankAccountVirtual: toStr(apartment.bank_account_virtual),
    lateFeeWaived: apartment.late_fee_waived,
    // System Logic
    parentUnitId: toStr(apartment.parent_unit_id),
    isMerged: apartment.is_merged,
    syncStatus: apartment.sync_status || 'disconnected',
    portalAccessEnabled: apartment.portal_access_enabled,
    technicalDrawingUrl: toStr(apartment.technical_drawing_url),
    // Meta
    created_at: apartment.created_at,
    updatedAt: apartment.updated_at,
    building: apartment.buildings,
    // Relations
    owner: mapOwner(apartment.users),
    activeContract: mapActiveContract(apartment.contracts),
  };
}
