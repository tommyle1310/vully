import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateBuildingPolicyDto,
  UpdateBuildingPolicyDto,
  BuildingPolicyResponseDto,
} from './dto/building-policy.dto';

@Injectable()
export class BuildingPoliciesService {
  private readonly logger = new Logger(BuildingPoliciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all policies for a building (versioned history)
   */
  async findAll(buildingId: string): Promise<BuildingPolicyResponseDto[]> {
    // Verify building exists
    const building = await this.prisma.buildings.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const policies = await this.prisma.building_policies.findMany({
      where: { building_id: buildingId },
      orderBy: { effective_from: 'desc' },
    });

    return policies.map((p) => this.toResponseDto(p));
  }

  /**
   * Get currently effective policy (effective_to IS NULL)
   */
  async getCurrentPolicy(
    buildingId: string,
  ): Promise<BuildingPolicyResponseDto | null> {
    // Verify building exists
    const building = await this.prisma.buildings.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const policy = await this.prisma.building_policies.findFirst({
      where: {
        building_id: buildingId,
        effective_to: null,
      },
    });

    return policy ? this.toResponseDto(policy) : null;
  }

  /**
   * Create a new policy version
   * - Closes previous current policy's effective_to
   * - Creates new policy as current
   */
  async create(
    buildingId: string,
    dto: CreateBuildingPolicyDto,
    userId?: string,
  ): Promise<BuildingPolicyResponseDto> {
    // Verify building exists
    const building = await this.prisma.buildings.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const effectiveFromDate = new Date(dto.effectiveFrom);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate effective date is not in the past (allow today or future)
    if (effectiveFromDate < today) {
      throw new BadRequestException('Effective date cannot be in the past');
    }

    // Use transaction to ensure consistency
    const policy = await this.prisma.$transaction(async (tx) => {
      // Find and close current policy
      const currentPolicy = await tx.building_policies.findFirst({
        where: {
          building_id: buildingId,
          effective_to: null,
        },
      });

      if (currentPolicy) {
        // Close current policy one day before new one starts
        const closingDate = new Date(effectiveFromDate);
        closingDate.setDate(closingDate.getDate() - 1);

        await tx.building_policies.update({
          where: { id: currentPolicy.id },
          data: { effective_to: closingDate },
        });

        this.logger.log({
          event: 'policy_closed',
          buildingId,
          policyId: currentPolicy.id,
          effectiveTo: closingDate.toISOString(),
        });
      }

      // Create new policy
      const newPolicy = await tx.building_policies.create({
        data: {
          building_id: buildingId,
          default_max_residents: dto.defaultMaxResidents ?? null,
          access_card_limit_default: dto.accessCardLimitDefault,
          pet_allowed: dto.petAllowed,
          pet_limit_default: dto.petLimitDefault,
          default_billing_cycle: dto.defaultBillingCycle,
          late_fee_rate_percent: dto.lateFeeRatePercent
            ? new Prisma.Decimal(dto.lateFeeRatePercent)
            : null,
          late_fee_grace_days: dto.lateFeeGraceDays,
          trash_collection_days: dto.trashCollectionDays ?? [],
          trash_collection_time: dto.trashCollectionTime ?? null,
          trash_fee_per_month: dto.trashFeePerMonth
            ? new Prisma.Decimal(dto.trashFeePerMonth)
            : null,
          effective_from: effectiveFromDate,
          effective_to: null,
          created_by: userId ?? null,
        },
      });

      this.logger.log({
        event: 'policy_created',
        buildingId,
        policyId: newPolicy.id,
        effectiveFrom: effectiveFromDate.toISOString(),
        createdBy: userId,
      });

      return newPolicy;
    });

    return this.toResponseDto(policy);
  }

  /**
   * Update a future policy (not yet effective)
   * Cannot update policies that are already in effect or historical
   */
  async update(
    buildingId: string,
    policyId: string,
    dto: UpdateBuildingPolicyDto,
  ): Promise<BuildingPolicyResponseDto> {
    const policy = await this.prisma.building_policies.findFirst({
      where: {
        id: policyId,
        building_id: buildingId,
      },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only allow updates to future policies
    if (policy.effective_from <= today) {
      throw new BadRequestException(
        'Cannot update policies that are already in effect. Create a new policy instead.',
      );
    }

    const updatedPolicy = await this.prisma.building_policies.update({
      where: { id: policyId },
      data: {
        default_max_residents:
          dto.defaultMaxResidents !== undefined
            ? dto.defaultMaxResidents
            : undefined,
        access_card_limit_default: dto.accessCardLimitDefault,
        pet_allowed: dto.petAllowed,
        pet_limit_default: dto.petLimitDefault,
        default_billing_cycle: dto.defaultBillingCycle,
        late_fee_rate_percent:
          dto.lateFeeRatePercent !== undefined
            ? dto.lateFeeRatePercent
              ? new Prisma.Decimal(dto.lateFeeRatePercent)
              : null
            : undefined,
        late_fee_grace_days: dto.lateFeeGraceDays,
        trash_collection_days: dto.trashCollectionDays,
        trash_collection_time: dto.trashCollectionTime,
        trash_fee_per_month:
          dto.trashFeePerMonth !== undefined
            ? dto.trashFeePerMonth
              ? new Prisma.Decimal(dto.trashFeePerMonth)
              : null
            : undefined,
        effective_from: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
      },
    });

    this.logger.log({
      event: 'policy_updated',
      buildingId,
      policyId,
    });

    return this.toResponseDto(updatedPolicy);
  }

  /**
   * Get policy by ID
   */
  async findOne(
    buildingId: string,
    policyId: string,
  ): Promise<BuildingPolicyResponseDto> {
    const policy = await this.prisma.building_policies.findFirst({
      where: {
        id: policyId,
        building_id: buildingId,
      },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    return this.toResponseDto(policy);
  }

  /**
   * Convert Prisma model to response DTO
   */
  private toResponseDto(policy: any): BuildingPolicyResponseDto {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCurrent =
      policy.effective_to === null && policy.effective_from <= today;

    return {
      id: policy.id,
      buildingId: policy.building_id,
      defaultMaxResidents: policy.default_max_residents,
      accessCardLimitDefault: policy.access_card_limit_default,
      petAllowed: policy.pet_allowed,
      petLimitDefault: policy.pet_limit_default,
      defaultBillingCycle: policy.default_billing_cycle,
      lateFeeRatePercent: policy.late_fee_rate_percent?.toNumber() ?? null,
      lateFeeGraceDays: policy.late_fee_grace_days,
      trashCollectionDays: policy.trash_collection_days,
      trashCollectionTime: policy.trash_collection_time,
      trashFeePerMonth: policy.trash_fee_per_month?.toNumber() ?? null,
      effectiveFrom: policy.effective_from.toISOString().split('T')[0],
      effectiveTo: policy.effective_to?.toISOString().split('T')[0] ?? null,
      isCurrent,
      createdBy: policy.created_by,
      createdAt: policy.created_at.toISOString(),
    };
  }
}
