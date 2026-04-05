import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateContractDto,
  UpdateContractDto,
  TerminateContractDto,
  ContractResponseDto,
} from './dto/contract.dto';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContractDto, createdById: string): Promise<ContractResponseDto> {
    // Check if apartment exists
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: dto.apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // Check if tenant exists and is a resident
    const tenant = await this.prisma.users.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check for existing active contract
    const existingContract = await this.prisma.contracts.findFirst({
      where: {
        apartment_id: dto.apartmentId,
        status: 'active',
      },
    });

    if (existingContract) {
      throw new ConflictException('Apartment already has an active contract');
    }

    // Create contract and update apartment status in transaction
    const contract = await this.prisma.$transaction(async (tx) => {
      const newContract = await tx.contracts.create({
        data: {
          apartment_id: dto.apartmentId,
          tenant_id: dto.tenantId,
          status: 'active',
          start_date: new Date(dto.start_date),
          end_date: dto.endDate ? new Date(dto.endDate) : null,
          rent_amount: dto.rentAmount,
          deposit_months: dto.depositMonths || 2,
          deposit_amount: dto.depositAmount,
          citizen_id: dto.citizenId || null,
          number_of_residents: dto.numberOfResidents ?? null,
          terms_notes: dto.termsNotes,
          created_by: createdById,
          // Payment tracking fields
          contract_type: dto.contractType || 'rental',
          purchase_price: dto.purchasePrice,
          down_payment: dto.downPayment,
          transfer_date: dto.transferDate ? new Date(dto.transferDate) : null,
          option_fee: dto.optionFee,
          purchase_option_price: dto.purchaseOptionPrice,
          option_period_months: dto.optionPeriodMonths,
          rent_credit_percent: dto.rentCreditPercent,
          payment_due_day: dto.paymentDueDay,
          updated_at: new Date(),
        },
        include: {
          apartments: {
            select: {
              id: true,
              unit_number: true,
              floor_index: true,
              building_id: true,
              buildings: { select: { id: true, name: true } },
            },
          },
          users_contracts_tenant_idTousers: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      });

      // Update apartment status to occupied, and sync resident count
      await tx.apartments.update({
        where: { id: dto.apartmentId },
        data: {
          status: 'occupied',
          is_rented: true,
          current_resident_count: dto.numberOfResidents ?? 0,
        },
      });

      return newContract;
    });

    this.logger.log({
      event: 'contract_created',
      contractId: contract.id,
      apartmentId: dto.apartmentId,
      tenantId: dto.tenantId,
      createdById,
    });

    return this.toResponseDto(contract);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: { 
      apartmentId?: string; 
      tenantId?: string; 
      status?: string;
      contractType?: string;
    },
  ): Promise<{ data: ContractResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters?.apartmentId) where.apartment_id = filters.apartmentId;
    if (filters?.tenantId) where.tenant_id = filters.tenantId;
    if (filters?.status) where.status = filters.status;
    if (filters?.contractType) where.contract_type = filters.contractType;

    const [contracts, total] = await Promise.all([
      this.prisma.contracts.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          apartments: {
            select: {
              id: true,
              unit_number: true,
              floor_index: true,
              building_id: true,
              gross_area: true,
              buildings: { select: { id: true, name: true } },
            },
          },
          users_contracts_tenant_idTousers: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      }),
      this.prisma.contracts.count({ where }),
    ]);

    return {
      data: contracts.map(this.toResponseDto),
      total,
    };
  }

  async findOne(id: string): Promise<ContractResponseDto> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            floor_index: true,
            building_id: true,
            buildings: { select: { id: true, name: true } },
          },
        },
        users_contracts_tenant_idTousers: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return this.toResponseDto(contract);
  }

  async update(id: string, dto: UpdateContractDto): Promise<ContractResponseDto> {
    const contract = await this.prisma.contracts.findUnique({ where: { id } });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Use transaction to update contract and sync apartment resident count
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedContract = await tx.contracts.update({
        where: { id },
        data: {
          ...(dto.status && { status: dto.status }),
          ...(dto.endDate && { end_date: new Date(dto.endDate) }),
          ...(dto.rentAmount !== undefined && { rent_amount: dto.rentAmount }),
          ...(dto.citizenId !== undefined && { citizen_id: dto.citizenId || null }),
          ...(dto.numberOfResidents !== undefined && { number_of_residents: dto.numberOfResidents }),
          ...(dto.depositAmount !== undefined && { deposit_amount: dto.depositAmount }),
          ...(dto.termsNotes !== undefined && { terms_notes: dto.termsNotes }),
        },
        include: {
          apartments: {
            select: {
              id: true,
              unit_number: true,
              floor_index: true,
              building_id: true,
              buildings: { select: { id: true, name: true } },
            },
          },
          users_contracts_tenant_idTousers: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      });

      // Sync resident count to apartment if changed and contract is active
      if (dto.numberOfResidents !== undefined && updatedContract.status === 'active') {
        await tx.apartments.update({
          where: { id: contract.apartment_id },
          data: { current_resident_count: dto.numberOfResidents },
        });
      }

      return updatedContract;
    });

    this.logger.log({
      event: 'contract_updated',
      contractId: id,
      status: dto.status,
    });

    return this.toResponseDto(updated);
  }

  async terminate(
    id: string,
    dto: TerminateContractDto,
    actorId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id },
      include: { apartments: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== 'active') {
      throw new ConflictException('Can only terminate active contracts');
    }

    // Terminate contract and update apartment status in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const terminatedContract = await tx.contracts.update({
        where: { id },
        data: {
          status: 'terminated',
          end_date: new Date(dto.end_date),
          terms_notes: dto.reason
            ? `${contract.terms_notes || ''}\n\nTermination reason: ${dto.reason}`.trim()
            : contract.terms_notes,
        },
        include: {
          apartments: {
            select: {
              id: true,
              unit_number: true,
              floor_index: true,
              building_id: true,
              buildings: { select: { id: true, name: true } },
            },
          },
          users_contracts_tenant_idTousers: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      });

      // Set apartment back to vacant and clear resident data
      await tx.apartments.update({
        where: { id: contract.apartment_id },
        data: { status: 'vacant', is_rented: false, current_resident_count: 0 },
      });

      return terminatedContract;
    });

    this.logger.log({
      event: 'contract_terminated',
      contractId: id,
      apartmentId: contract.apartment_id,
      terminatedBy: actorId,
      endDate: dto.end_date,
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(contracts: {
    id: string;
    apartment_id: string;
    tenant_id: string;
    status: string;
    start_date: Date;
    end_date: Date | null;
    rent_amount: unknown;
    deposit_months: number;
    deposit_amount: unknown;
    citizen_id?: string | null;
    number_of_residents?: number | null;
    terms_notes: string | null;
    contract_type?: string;
    purchase_price?: unknown;
    down_payment?: unknown;
    transfer_date?: Date | null;
    option_fee?: unknown;
    purchase_option_price?: unknown;
    option_period_months?: number | null;
    rent_credit_percent?: unknown;
    payment_due_day?: number | null;
    created_at: Date;
    updated_at: Date;
    apartments?: {
      id: string;
      unit_number: string;
      floor_index: number;
      building_id: string;
      buildings?: { id: string; name: string };
    };
    users_contracts_tenant_idTousers?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  }): ContractResponseDto {
    return {
      id: contracts.id,
      apartmentId: contracts.apartment_id,
      tenantId: contracts.tenant_id,
      status: contracts.status,
      start_date: contracts.start_date,
      endDate: contracts.end_date || undefined,
      rentAmount: Number(contracts.rent_amount),
      depositMonths: contracts.deposit_months,
      depositAmount: contracts.deposit_amount ? Number(contracts.deposit_amount) : undefined,
      citizenId: contracts.citizen_id || undefined,
      numberOfResidents: contracts.number_of_residents ?? undefined,
      termsNotes: contracts.terms_notes || undefined,
      // Payment tracking fields
      contractType: contracts.contract_type as ContractResponseDto['contractType'],
      purchasePrice: contracts.purchase_price ? Number(contracts.purchase_price) : undefined,
      downPayment: contracts.down_payment ? Number(contracts.down_payment) : undefined,
      transferDate: contracts.transfer_date || undefined,
      optionFee: contracts.option_fee ? Number(contracts.option_fee) : undefined,
      purchaseOptionPrice: contracts.purchase_option_price ? Number(contracts.purchase_option_price) : undefined,
      optionPeriodMonths: contracts.option_period_months ?? undefined,
      rentCreditPercent: contracts.rent_credit_percent ? Number(contracts.rent_credit_percent) : undefined,
      paymentDueDay: contracts.payment_due_day ?? undefined,
      // Timestamps
      created_at: contracts.created_at,
      updatedAt: contracts.updated_at,
      apartment: contracts.apartments ? {
        id: contracts.apartments.id,
        unit_number: contracts.apartments.unit_number,
        floorIndex: contracts.apartments.floor_index,
        buildingId: contracts.apartments.building_id,
        building: contracts.apartments.buildings ? {
          id: contracts.apartments.buildings.id,
          name: contracts.apartments.buildings.name,
        } : undefined,
      } : undefined,
      tenant: contracts.users_contracts_tenant_idTousers ? {
        id: contracts.users_contracts_tenant_idTousers.id,
        email: contracts.users_contracts_tenant_idTousers.email,
        firstName: contracts.users_contracts_tenant_idTousers.first_name,
        lastName: contracts.users_contracts_tenant_idTousers.last_name,
      } : undefined,
    };
  }

  /**
   * Get contracts for the current user (as a tenant)
   */
  async findMyContracts(
    userId: string,
    filters?: { status?: string },
  ): Promise<{ data: ContractResponseDto[]; total: number }> {
    const where: Record<string, unknown> = {
      tenant_id: userId,
    };
    if (filters?.status) where.status = filters.status;

    const [contracts, total] = await Promise.all([
      this.prisma.contracts.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          apartments: {
            select: {
              id: true,
              unit_number: true,
              floor_index: true,
              building_id: true,
              buildings: { select: { id: true, name: true } },
            },
          },
          users_contracts_tenant_idTousers: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      }),
      this.prisma.contracts.count({ where }),
    ]);

    return {
      data: contracts.map((c) => this.toResponseDto(c)),
      total,
    };
  }

  /**
   * Get the active apartment for a user based on their active contract
   */
  async getMyApartment(userId: string): Promise<{
    apartmentId: string;
    apartmentUnitNumber: string;
    buildingId: string;
    buildingName: string;
    contractId: string;
  } | null> {
    this.logger.log(`Getting apartment for user ${userId}`);
    
    const activeContract = await this.prisma.contracts.findFirst({
      where: {
        tenant_id: userId,
        status: 'active',
      },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            building_id: true,
            buildings: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!activeContract || !activeContract.apartments) {
      this.logger.warn(`No active contract found for user ${userId}`);
      
      // Debug: Check if user has any contracts at all
      const allContracts = await this.prisma.contracts.findMany({
        where: { tenant_id: userId },
        select: { id: true, status: true, created_at: true },
      });
      this.logger.debug(`User ${userId} has ${allContracts.length} total contracts: ${JSON.stringify(allContracts)}`);
      
      return null;
    }

    this.logger.log(`Found active contract ${activeContract.id} for user ${userId}, apartment: ${activeContract.apartments.unit_number}`);

    return {
      apartmentId: activeContract.apartments.id,
      apartmentUnitNumber: activeContract.apartments.unit_number,
      buildingId: activeContract.apartments.building_id,
      buildingName: activeContract.apartments.buildings?.name || '',
      contractId: activeContract.id,
    };
  }
}
