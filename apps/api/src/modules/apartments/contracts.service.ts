import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DEFAULT_PAGINATION_LIMIT } from '../../common/constants/defaults';
import { Prisma, ContractStatus, ContractType } from '@prisma/client';
import {
  CreateContractDto,
  UpdateContractDto,
  TerminateContractDto,
  ContractResponseDto,
} from './dto/contract.dto';
import { toContractResponseDto } from './contracts.mapper';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContractDto, createdById: string): Promise<ContractResponseDto> {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: dto.apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const tenant = await this.prisma.users.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingContract = await this.prisma.contracts.findFirst({
      where: {
        apartment_id: dto.apartmentId,
        status: 'active',
      },
    });

    if (existingContract) {
      throw new ConflictException('Apartment already has an active contract');
    }

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
        include: this.contractInclude(),
      });

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
      actorId: createdById,
    });

    return toContractResponseDto(contract);
  }

  async findAll(
    page = 1,
    limit = DEFAULT_PAGINATION_LIMIT,
    filters?: {
      apartmentId?: string;
      tenantId?: string;
      status?: string;
      contractType?: string;
    },
  ): Promise<{ data: ContractResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.contractsWhereInput = {};
    if (filters?.apartmentId) where.apartment_id = filters.apartmentId;
    if (filters?.tenantId) where.tenant_id = filters.tenantId;
    if (filters?.status) where.status = filters.status as ContractStatus;
    if (filters?.contractType) where.contract_type = filters.contractType as ContractType;

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
      data: contracts.map(toContractResponseDto),
      total,
    };
  }

  async findOne(id: string): Promise<ContractResponseDto> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id },
      include: this.contractInclude(),
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return toContractResponseDto(contract);
  }

  async update(id: string, dto: UpdateContractDto): Promise<ContractResponseDto> {
    const contract = await this.prisma.contracts.findUnique({ where: { id } });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

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
        include: this.contractInclude(),
      });

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
      apartmentId: updated.apartment_id,
      tenantId: updated.tenant_id,
      status: dto.status,
    });

    return toContractResponseDto(updated);
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
        include: this.contractInclude(),
      });

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
      tenantId: contract.tenant_id,
      actorId,
      endDate: dto.end_date,
    });

    return toContractResponseDto(updated);
  }

  private contractInclude() {
    return {
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
    } as const;
  }
}
