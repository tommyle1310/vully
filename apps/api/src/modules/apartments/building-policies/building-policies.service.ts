import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateBuildingPolicyDto,
  UpdateBuildingPolicyDto,
  BuildingPolicyResponseDto,
} from '../dto/building-policy.dto';

@Injectable()
export class BuildingPoliciesService {
  private readonly logger = new Logger(BuildingPoliciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
          
          // Occupancy
          default_max_residents: dto.defaultMaxResidents ?? null,
          access_card_limit_default: dto.accessCardLimitDefault,
          pet_allowed: dto.petAllowed,
          pet_limit_default: dto.petLimitDefault,
          pet_rules: dto.petRules ?? null,
          
          // Billing
          default_billing_cycle: dto.defaultBillingCycle,
          late_fee_rate_percent: dto.lateFeeRatePercent
            ? new Prisma.Decimal(dto.lateFeeRatePercent)
            : null,
          late_fee_grace_days: dto.lateFeeGraceDays,
          payment_due_day: dto.paymentDueDay ?? 10,
          
          // Trash
          trash_collection_days: dto.trashCollectionDays ?? [],
          trash_collection_time: dto.trashCollectionTime ?? null,
          trash_fee_per_month: dto.trashFeePerMonth
            ? new Prisma.Decimal(dto.trashFeePerMonth)
            : null,
          
          // Pool
          pool_available: dto.poolAvailable ?? false,
          pool_hours: dto.poolHours ?? null,
          pool_fee_per_month: dto.poolFeePerMonth
            ? new Prisma.Decimal(dto.poolFeePerMonth)
            : null,
          
          // Gym
          gym_available: dto.gymAvailable ?? false,
          gym_hours: dto.gymHours ?? null,
          gym_fee_per_month: dto.gymFeePerMonth
            ? new Prisma.Decimal(dto.gymFeePerMonth)
            : null,
          gym_booking_required: dto.gymBookingRequired ?? false,
          
          // Sports Courts
          sports_court_available: dto.sportsCourtAvailable ?? false,
          sports_court_hours: dto.sportsCourtHours ?? null,
          sports_court_booking_rules: dto.sportsCourtBookingRules ?? null,
          
          // Guest & Visitor
          guest_registration_required: dto.guestRegistrationRequired ?? true,
          guest_parking_rules: dto.guestParkingRules ?? null,
          visitor_hours: dto.visitorHours ?? null,
          
          // Renovation
          renovation_approval_required: dto.renovationApprovalRequired ?? true,
          renovation_allowed_hours: dto.renovationAllowedHours ?? null,
          renovation_deposit: dto.renovationDeposit
            ? new Prisma.Decimal(dto.renovationDeposit)
            : null,
          renovation_approval_process: dto.renovationApprovalProcess ?? null,
          
          // Quiet Hours
          quiet_hours_start: dto.quietHoursStart ?? null,
          quiet_hours_end: dto.quietHoursEnd ?? null,
          noise_complaint_process: dto.noiseComplaintProcess ?? null,
          
          // Package
          package_pickup_location: dto.packagePickupLocation ?? null,
          package_pickup_hours: dto.packagePickupHours ?? null,
          package_holding_days: dto.packageHoldingDays ?? 7,
          
          // Emergency
          emergency_contacts: dto.emergencyContacts 
            ? (dto.emergencyContacts as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          management_office_hours: dto.managementOfficeHours ?? null,
          security_24h_phone: dto.security24hPhone ?? null,
          
          // Access Cards
          access_card_replacement_fee: dto.accessCardReplacementFee
            ? new Prisma.Decimal(dto.accessCardReplacementFee)
            : null,
          access_card_replacement_process: dto.accessCardReplacementProcess ?? null,
          
          // Move In/Out
          move_allowed_hours: dto.moveAllowedHours ?? null,
          move_elevator_booking_required: dto.moveElevatorBookingRequired ?? true,
          move_deposit: dto.moveDeposit
            ? new Prisma.Decimal(dto.moveDeposit)
            : null,
          
          // Parking Fees
          motorcycle_parking_fee: dto.motorcycleParkingFee
            ? new Prisma.Decimal(dto.motorcycleParkingFee)
            : null,
          car_parking_fee: dto.carParkingFee
            ? new Prisma.Decimal(dto.carParkingFee)
            : null,
          
          // Versioning
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

    // Emit event for cache invalidation
    this.eventEmitter.emit('building-policy.updated', {
      buildingId,
      policyId: updatedPolicy.id,
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
      
      // Occupancy
      defaultMaxResidents: policy.default_max_residents,
      accessCardLimitDefault: policy.access_card_limit_default,
      petAllowed: policy.pet_allowed,
      petLimitDefault: policy.pet_limit_default,
      petRules: policy.pet_rules,
      
      // Billing
      defaultBillingCycle: policy.default_billing_cycle,
      lateFeeRatePercent: policy.late_fee_rate_percent?.toNumber() ?? null,
      lateFeeGraceDays: policy.late_fee_grace_days,
      paymentDueDay: policy.payment_due_day,
      
      // Trash
      trashCollectionDays: policy.trash_collection_days,
      trashCollectionTime: policy.trash_collection_time,
      trashFeePerMonth: policy.trash_fee_per_month?.toNumber() ?? null,
      
      // Pool
      poolAvailable: policy.pool_available,
      poolHours: policy.pool_hours,
      poolFeePerMonth: policy.pool_fee_per_month?.toNumber() ?? null,
      
      // Gym
      gymAvailable: policy.gym_available,
      gymHours: policy.gym_hours,
      gymFeePerMonth: policy.gym_fee_per_month?.toNumber() ?? null,
      gymBookingRequired: policy.gym_booking_required,
      
      // Sports Courts
      sportsCourtAvailable: policy.sports_court_available,
      sportsCourtHours: policy.sports_court_hours,
      sportsCourtBookingRules: policy.sports_court_booking_rules,
      
      // Guest & Visitor
      guestRegistrationRequired: policy.guest_registration_required,
      guestParkingRules: policy.guest_parking_rules,
      visitorHours: policy.visitor_hours,
      
      // Renovation
      renovationApprovalRequired: policy.renovation_approval_required,
      renovationAllowedHours: policy.renovation_allowed_hours,
      renovationDeposit: policy.renovation_deposit?.toNumber() ?? null,
      renovationApprovalProcess: policy.renovation_approval_process,
      
      // Quiet Hours
      quietHoursStart: policy.quiet_hours_start,
      quietHoursEnd: policy.quiet_hours_end,
      noiseComplaintProcess: policy.noise_complaint_process,
      
      // Package
      packagePickupLocation: policy.package_pickup_location,
      packagePickupHours: policy.package_pickup_hours,
      packageHoldingDays: policy.package_holding_days,
      
      // Emergency
      emergencyContacts: policy.emergency_contacts,
      managementOfficeHours: policy.management_office_hours,
      security24hPhone: policy.security_24h_phone,
      
      // Access Cards
      accessCardReplacementFee: policy.access_card_replacement_fee?.toNumber() ?? null,
      accessCardReplacementProcess: policy.access_card_replacement_process,
      
      // Move In/Out
      moveAllowedHours: policy.move_allowed_hours,
      moveElevatorBookingRequired: policy.move_elevator_booking_required,
      moveDeposit: policy.move_deposit?.toNumber() ?? null,
      
      // Parking Fees
      motorcycleParkingFee: policy.motorcycle_parking_fee?.toNumber() ?? null,
      carParkingFee: policy.car_parking_fee?.toNumber() ?? null,
      
      // Versioning
      effectiveFrom: policy.effective_from.toISOString().split('T')[0],
      effectiveTo: policy.effective_to?.toISOString().split('T')[0] ?? null,
      isCurrent,
      createdBy: policy.created_by,
      createdAt: policy.created_at.toISOString(),
    };
  }
}
