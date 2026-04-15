import { Prisma } from '@prisma/client';
import { ParkingZoneResponseDto, ParkingSlotResponseDto } from '../dto/parking.dto';

export function toZoneResponseDto(zone: Prisma.parking_zonesGetPayload<{}> & {
  parking_slots?: Array<{ status: string }>;
}): ParkingZoneResponseDto {
  const slots = zone.parking_slots || [];
  const availableCount = slots.filter((s) => s.status === 'available').length;
  const assignedCount = slots.filter((s) => s.status === 'assigned').length;

  return {
    id: zone.id,
    buildingId: zone.building_id,
    name: zone.name,
    code: zone.code,
    slotType: zone.slot_type,
    totalSlots: zone.total_slots,
    feePerMonth: zone.fee_per_month?.toNumber() ?? null,
    isActive: zone.is_active,
    createdAt: zone.created_at.toISOString(),
    availableSlots: availableCount,
    assignedSlots: assignedCount,
  };
}

export function toSlotResponseDto(slot: Prisma.parking_slotsGetPayload<{
  include: {
    apartments: { select: { id: true; apartment_code: true } };
    parking_zones: { select: { fee_per_month: true } };
  };
}>): ParkingSlotResponseDto {
  const zoneFee = slot.parking_zones?.fee_per_month?.toNumber() ?? null;
  const overrideFee = slot.fee_override?.toNumber() ?? null;

  return {
    id: slot.id,
    zoneId: slot.zone_id,
    slotNumber: slot.slot_number,
    fullCode: slot.full_code,
    assignedAptId: slot.assigned_apt_id,
    assignedAptCode: slot.apartments?.apartment_code ?? null,
    assignedAt: slot.assigned_at?.toISOString() ?? null,
    feeOverride: overrideFee,
    status: slot.status,
    notes: slot.notes,
    createdAt: slot.created_at.toISOString(),
    updatedAt: slot.updated_at.toISOString(),
    effectiveFee: overrideFee ?? zoneFee,
  };
}
