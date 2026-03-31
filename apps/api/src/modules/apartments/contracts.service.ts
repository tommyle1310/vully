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
    const apartment = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // Check if tenant exists and is a resident
    const tenant = await this.prisma.user.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check for existing active contract
    const existingContract = await this.prisma.contract.findFirst({
      where: {
        apartmentId: dto.apartmentId,
        status: 'active',
      },
    });

    if (existingContract) {
      throw new ConflictException('Apartment already has an active contract');
    }

    // Create contract and update apartment status in transaction
    const contract = await this.prisma.$transaction(async (tx) => {
      const newContract = await tx.contract.create({
        data: {
          apartmentId: dto.apartmentId,
          tenantId: dto.tenantId,
          status: 'active',
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          rentAmount: dto.rentAmount,
          depositMonths: dto.depositMonths || 2,
          depositAmount: dto.depositAmount,
          termsNotes: dto.termsNotes,
          createdById,
        },
        include: {
          apartment: {
            select: { id: true, unitNumber: true, floor: true, buildingId: true },
          },
          tenant: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      // Update apartment status to occupied
      await tx.apartment.update({
        where: { id: dto.apartmentId },
        data: { status: 'occupied' },
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
    filters?: { apartmentId?: string; tenantId?: string; status?: string },
  ): Promise<{ data: ContractResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters?.apartmentId) where.apartmentId = filters.apartmentId;
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.status) where.status = filters.status;

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          apartment: {
            select: { id: true, unitNumber: true, floor: true, buildingId: true },
          },
          tenant: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts.map(this.toResponseDto),
      total,
    };
  }

  async findOne(id: string): Promise<ContractResponseDto> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        apartment: {
          select: { id: true, unitNumber: true, floor: true, buildingId: true },
        },
        tenant: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return this.toResponseDto(contract);
  }

  async update(id: string, dto: UpdateContractDto): Promise<ContractResponseDto> {
    const contract = await this.prisma.contract.findUnique({ where: { id } });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.rentAmount !== undefined && { rentAmount: dto.rentAmount }),
        ...(dto.termsNotes !== undefined && { termsNotes: dto.termsNotes }),
      },
      include: {
        apartment: {
          select: { id: true, unitNumber: true, floor: true, buildingId: true },
        },
        tenant: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
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
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { apartment: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== 'active') {
      throw new ConflictException('Can only terminate active contracts');
    }

    // Terminate contract and update apartment status in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const terminatedContract = await tx.contract.update({
        where: { id },
        data: {
          status: 'terminated',
          endDate: new Date(dto.endDate),
          termsNotes: dto.reason
            ? `${contract.termsNotes || ''}\n\nTermination reason: ${dto.reason}`.trim()
            : contract.termsNotes,
        },
        include: {
          apartment: {
            select: { id: true, unitNumber: true, floor: true, buildingId: true },
          },
          tenant: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      // Set apartment back to vacant
      await tx.apartment.update({
        where: { id: contract.apartmentId },
        data: { status: 'vacant' },
      });

      return terminatedContract;
    });

    this.logger.log({
      event: 'contract_terminated',
      contractId: id,
      apartmentId: contract.apartmentId,
      terminatedBy: actorId,
      endDate: dto.endDate,
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(contract: {
    id: string;
    apartmentId: string;
    tenantId: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    rentAmount: unknown;
    depositMonths: number;
    depositAmount: unknown;
    termsNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    apartment?: {
      id: string;
      unitNumber: string;
      floor: number;
      buildingId: string;
    };
    tenant?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }): ContractResponseDto {
    return {
      id: contract.id,
      apartmentId: contract.apartmentId,
      tenantId: contract.tenantId,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate || undefined,
      rentAmount: Number(contract.rentAmount),
      depositMonths: contract.depositMonths,
      depositAmount: contract.depositAmount ? Number(contract.depositAmount) : undefined,
      termsNotes: contract.termsNotes || undefined,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      apartment: contract.apartment,
      tenant: contract.tenant,
    };
  }
}
