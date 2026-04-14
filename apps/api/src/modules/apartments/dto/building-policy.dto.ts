import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '@prisma/client';

class EmergencyContactDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  phone: string;
}

export class CreateBuildingPolicyDto {
  // ==================
  // Occupancy Rules
  // ==================
  @ApiPropertyOptional({ description: 'Default max residents (null = auto-calculate by area)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultMaxResidents?: number;

  @ApiProperty({ description: 'Default access card limit per apartment', default: 4 })
  @IsNumber()
  @Min(1)
  @Max(20)
  accessCardLimitDefault: number = 4;

  @ApiProperty({ description: 'Whether pets are allowed', default: false })
  @IsBoolean()
  petAllowed: boolean = false;

  @ApiProperty({ description: 'Default pet limit per apartment', default: 0 })
  @IsNumber()
  @Min(0)
  petLimitDefault: number = 0;

  @ApiPropertyOptional({ description: 'Detailed pet rules text' })
  @IsOptional()
  @IsString()
  petRules?: string;

  // ==================
  // Billing Configuration
  // ==================
  @ApiProperty({ description: 'Default billing cycle', enum: BillingCycle, default: 'monthly' })
  @IsEnum(BillingCycle)
  defaultBillingCycle: BillingCycle = 'monthly';

  @ApiPropertyOptional({ description: 'Late fee rate percent (e.g., 5 for 5%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeeRatePercent?: number;

  @ApiProperty({ description: 'Late fee grace days', default: 7 })
  @IsNumber()
  @Min(0)
  lateFeeGraceDays: number = 7;

  @ApiProperty({ description: 'Day of month payment is due', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  paymentDueDay?: number;

  // ==================
  // Trash Collection
  // ==================
  @ApiPropertyOptional({ description: 'Trash collection days', example: ['monday', 'thursday'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trashCollectionDays?: string[];

  @ApiPropertyOptional({ description: 'Trash collection time window', example: '07:00-09:00' })
  @IsOptional()
  @IsString()
  trashCollectionTime?: string;

  @ApiPropertyOptional({ description: 'Trash fee per month (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trashFeePerMonth?: number;

  // ==================
  // Amenities - Pool
  // ==================
  @ApiProperty({ description: 'Whether pool is available', default: false })
  @IsOptional()
  @IsBoolean()
  poolAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Pool operating hours', example: '06:00-22:00' })
  @IsOptional()
  @IsString()
  poolHours?: string;

  @ApiPropertyOptional({ description: 'Pool monthly fee (VND), null = free' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poolFeePerMonth?: number;

  // ==================
  // Amenities - Gym
  // ==================
  @ApiProperty({ description: 'Whether gym is available', default: false })
  @IsOptional()
  @IsBoolean()
  gymAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Gym operating hours', example: '05:00-23:00' })
  @IsOptional()
  @IsString()
  gymHours?: string;

  @ApiPropertyOptional({ description: 'Gym monthly fee (VND), null = free' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gymFeePerMonth?: number;

  @ApiProperty({ description: 'Whether gym booking is required', default: false })
  @IsOptional()
  @IsBoolean()
  gymBookingRequired?: boolean;

  // ==================
  // Amenities - Sports Courts
  // ==================
  @ApiProperty({ description: 'Whether sports courts are available', default: false })
  @IsOptional()
  @IsBoolean()
  sportsCourtAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Sports court operating hours' })
  @IsOptional()
  @IsString()
  sportsCourtHours?: string;

  @ApiPropertyOptional({ description: 'Sports court booking rules' })
  @IsOptional()
  @IsString()
  sportsCourtBookingRules?: string;

  // ==================
  // Guest & Visitor Rules
  // ==================
  @ApiProperty({ description: 'Whether guest registration is required', default: true })
  @IsOptional()
  @IsBoolean()
  guestRegistrationRequired?: boolean;

  @ApiPropertyOptional({ description: 'Guest parking rules' })
  @IsOptional()
  @IsString()
  guestParkingRules?: string;

  @ApiPropertyOptional({ description: 'Visitor hours', example: '08:00-22:00' })
  @IsOptional()
  @IsString()
  visitorHours?: string;

  // ==================
  // Renovation & Modifications
  // ==================
  @ApiProperty({ description: 'Whether renovation approval is required', default: true })
  @IsOptional()
  @IsBoolean()
  renovationApprovalRequired?: boolean;

  @ApiPropertyOptional({ description: 'Renovation allowed hours', example: '08:00-17:00 Mon-Sat' })
  @IsOptional()
  @IsString()
  renovationAllowedHours?: string;

  @ApiPropertyOptional({ description: 'Renovation deposit (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  renovationDeposit?: number;

  @ApiPropertyOptional({ description: 'Renovation approval process text' })
  @IsOptional()
  @IsString()
  renovationApprovalProcess?: string;

  // ==================
  // Quiet Hours & Noise
  // ==================
  @ApiPropertyOptional({ description: 'Quiet hours start time', example: '22:00' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time', example: '07:00' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'Noise complaint process' })
  @IsOptional()
  @IsString()
  noiseComplaintProcess?: string;

  // ==================
  // Package & Deliveries
  // ==================
  @ApiPropertyOptional({ description: 'Package pickup location' })
  @IsOptional()
  @IsString()
  packagePickupLocation?: string;

  @ApiPropertyOptional({ description: 'Package pickup hours', example: '08:00-20:00' })
  @IsOptional()
  @IsString()
  packagePickupHours?: string;

  @ApiProperty({ description: 'Package holding days before return', default: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  packageHoldingDays?: number;

  // ==================
  // Emergency Contacts
  // ==================
  @ApiPropertyOptional({ description: 'Emergency contacts array', type: [EmergencyContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @ApiPropertyOptional({ description: 'Management office hours', example: '08:00-17:00 Mon-Fri' })
  @IsOptional()
  @IsString()
  managementOfficeHours?: string;

  @ApiPropertyOptional({ description: '24h security phone number' })
  @IsOptional()
  @IsString()
  security24hPhone?: string;

  // ==================
  // Access Card Rules
  // ==================
  @ApiPropertyOptional({ description: 'Access card replacement fee (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accessCardReplacementFee?: number;

  @ApiPropertyOptional({ description: 'Access card replacement process text' })
  @IsOptional()
  @IsString()
  accessCardReplacementProcess?: string;

  // ==================
  // Move-in/Move-out
  // ==================
  @ApiPropertyOptional({ description: 'Move allowed hours', example: '08:00-18:00' })
  @IsOptional()
  @IsString()
  moveAllowedHours?: string;

  @ApiProperty({ description: 'Whether elevator booking is required for moving', default: true })
  @IsOptional()
  @IsBoolean()
  moveElevatorBookingRequired?: boolean;

  @ApiPropertyOptional({ description: 'Moving deposit (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  moveDeposit?: number;

  // ==================
  // Parking Fees
  // ==================
  @ApiPropertyOptional({ description: 'Motorcycle parking fee per month (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  motorcycleParkingFee?: number;

  @ApiPropertyOptional({ description: 'Car parking fee per month (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carParkingFee?: number;

  // ==================
  // Versioning
  // ==================
  @ApiProperty({ description: 'Effective date (policy starts from this date)' })
  @IsDateString()
  effectiveFrom: string;
}

export class UpdateBuildingPolicyDto extends PartialType(CreateBuildingPolicyDto) {}

export class BuildingPolicyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  buildingId: string;

  // Occupancy
  @ApiPropertyOptional()
  defaultMaxResidents?: number | null;

  @ApiProperty()
  accessCardLimitDefault: number;

  @ApiProperty()
  petAllowed: boolean;

  @ApiProperty()
  petLimitDefault: number;

  @ApiPropertyOptional()
  petRules?: string | null;

  // Billing
  @ApiProperty({ enum: BillingCycle })
  defaultBillingCycle: BillingCycle;

  @ApiPropertyOptional()
  lateFeeRatePercent?: number | null;

  @ApiProperty()
  lateFeeGraceDays: number;

  @ApiProperty()
  paymentDueDay: number;

  // Trash
  @ApiPropertyOptional()
  trashCollectionDays?: string[] | null;

  @ApiPropertyOptional()
  trashCollectionTime?: string | null;

  @ApiPropertyOptional()
  trashFeePerMonth?: number | null;

  // Pool
  @ApiProperty()
  poolAvailable: boolean;

  @ApiPropertyOptional()
  poolHours?: string | null;

  @ApiPropertyOptional()
  poolFeePerMonth?: number | null;

  // Gym
  @ApiProperty()
  gymAvailable: boolean;

  @ApiPropertyOptional()
  gymHours?: string | null;

  @ApiPropertyOptional()
  gymFeePerMonth?: number | null;

  @ApiProperty()
  gymBookingRequired: boolean;

  // Sports Courts
  @ApiProperty()
  sportsCourtAvailable: boolean;

  @ApiPropertyOptional()
  sportsCourtHours?: string | null;

  @ApiPropertyOptional()
  sportsCourtBookingRules?: string | null;

  // Guest & Visitor
  @ApiProperty()
  guestRegistrationRequired: boolean;

  @ApiPropertyOptional()
  guestParkingRules?: string | null;

  @ApiPropertyOptional()
  visitorHours?: string | null;

  // Renovation
  @ApiProperty()
  renovationApprovalRequired: boolean;

  @ApiPropertyOptional()
  renovationAllowedHours?: string | null;

  @ApiPropertyOptional()
  renovationDeposit?: number | null;

  @ApiPropertyOptional()
  renovationApprovalProcess?: string | null;

  // Quiet Hours
  @ApiPropertyOptional()
  quietHoursStart?: string | null;

  @ApiPropertyOptional()
  quietHoursEnd?: string | null;

  @ApiPropertyOptional()
  noiseComplaintProcess?: string | null;

  // Package
  @ApiPropertyOptional()
  packagePickupLocation?: string | null;

  @ApiPropertyOptional()
  packagePickupHours?: string | null;

  @ApiProperty()
  packageHoldingDays: number;

  // Emergency
  @ApiPropertyOptional()
  emergencyContacts?: any | null;

  @ApiPropertyOptional()
  managementOfficeHours?: string | null;

  @ApiPropertyOptional()
  security24hPhone?: string | null;

  // Access Cards
  @ApiPropertyOptional()
  accessCardReplacementFee?: number | null;

  @ApiPropertyOptional()
  accessCardReplacementProcess?: string | null;

  // Move In/Out
  @ApiPropertyOptional()
  moveAllowedHours?: string | null;

  @ApiProperty()
  moveElevatorBookingRequired: boolean;

  @ApiPropertyOptional()
  moveDeposit?: number | null;

  // Parking Fees
  @ApiPropertyOptional()
  motorcycleParkingFee?: number | null;

  @ApiPropertyOptional()
  carParkingFee?: number | null;

  // Versioning
  @ApiProperty()
  effectiveFrom: string;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiProperty()
  isCurrent: boolean;

  @ApiPropertyOptional()
  createdBy?: string | null;

  @ApiProperty()
  createdAt: string;
}
