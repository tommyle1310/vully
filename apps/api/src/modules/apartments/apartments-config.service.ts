import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ApartmentsConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get effective apartment configuration with policy inheritance.
   * Returns computed values showing the source (apartment override, building policy, or default).
   */
  async getEffectiveConfig(apartmentId: string): Promise<{
    apartmentId: string;
    buildingId: string;
    policyId: string | null;
    maxResidents: { value: number; source: 'apartment' | 'building' | 'default' };
    accessCardLimit: { value: number; source: 'apartment' | 'building' | 'default' };
    petAllowed: { value: boolean; source: 'apartment' | 'building' | 'default' };
    petLimit: { value: number; source: 'apartment' | 'building' | 'default' };
    billingCycle: { value: string; source: 'apartment' | 'building' | 'default' };
    lateFeeRatePercent: number | null;
    lateFeeGraceDays: number | null;
    trashCollectionDays: string[] | null;
    trashCollectionTime: string | null;
    trashFeePerMonth: number | null;
  }> {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // Get current building policy
    const policy = await this.prisma.building_policies.findFirst({
      where: {
        building_id: apartment.building_id,
        effective_to: null,
      },
    });

    // Default values
    const DEFAULTS = {
      maxResidents: 6,
      accessCardLimit: 4,
      petAllowed: false,
      petLimit: 0,
      billingCycle: 'monthly',
    };

    // Helper to compute effective value with source
    const getEffective = <T>(
      aptOverride: T | null | undefined,
      policyValue: T | null | undefined,
      defaultValue: T,
    ): { value: T; source: 'apartment' | 'building' | 'default' } => {
      if (aptOverride !== null && aptOverride !== undefined) {
        return { value: aptOverride, source: 'apartment' };
      }
      if (policyValue !== null && policyValue !== undefined) {
        return { value: policyValue, source: 'building' };
      }
      return { value: defaultValue, source: 'default' };
    };

    return {
      apartmentId,
      buildingId: apartment.building_id,
      policyId: policy?.id ?? null,
      maxResidents: getEffective(
        apartment.max_residents_override,
        policy?.default_max_residents,
        DEFAULTS.maxResidents,
      ),
      accessCardLimit: getEffective(
        apartment.access_card_limit_override,
        policy?.access_card_limit_default,
        DEFAULTS.accessCardLimit,
      ),
      petAllowed: getEffective(
        apartment.pet_allowed_override,
        policy?.pet_allowed,
        DEFAULTS.petAllowed,
      ),
      petLimit: getEffective(
        apartment.pet_limit_override,
        policy?.pet_limit_default,
        DEFAULTS.petLimit,
      ),
      billingCycle: getEffective(
        apartment.billing_cycle_override,
        policy?.default_billing_cycle,
        DEFAULTS.billingCycle,
      ),
      // Pass-through policy values (no apartment override)
      lateFeeRatePercent: policy?.late_fee_rate_percent?.toNumber() ?? null,
      lateFeeGraceDays: policy?.late_fee_grace_days ?? null,
      trashCollectionDays: policy?.trash_collection_days ?? null,
      trashCollectionTime: policy?.trash_collection_time ?? null,
      trashFeePerMonth: policy?.trash_fee_per_month?.toNumber() ?? null,
    };
  }

  /**
   * Get parking slots assigned to an apartment.
   */
  async getParkingSlots(apartmentId: string): Promise<
    Array<{
      id: string;
      zoneId: string;
      slotNumber: string;
      fullCode: string;
      type: string;
      monthlyFee: number;
      zone: {
        id: string;
        name: string;
        code: string;
      };
    }>
  > {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const slots = await this.prisma.parking_slots.findMany({
      where: {
        assigned_apt_id: apartmentId,
      },
      include: {
        parking_zones: {
          select: {
            id: true,
            name: true,
            code: true,
            slot_type: true,
            fee_per_month: true,
          },
        },
      },
      orderBy: {
        slot_number: 'asc',
      },
    });

    return slots.map((slot) => ({
      id: slot.id,
      zoneId: slot.zone_id,
      slotNumber: slot.slot_number,
      fullCode: slot.full_code,
      type: slot.parking_zones.slot_type,
      monthlyFee: slot.fee_override?.toNumber() ?? slot.parking_zones.fee_per_month?.toNumber() ?? 0,
      zone: {
        id: slot.parking_zones.id,
        name: slot.parking_zones.name,
        code: slot.parking_zones.code,
      },
    }));
  }
}
