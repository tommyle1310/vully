import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, ContractStatus } from '@prisma/client';
import { ContractResponseDto } from './dto/contract.dto';
import { toContractResponseDto } from './contracts.mapper';

@Injectable()
export class ContractsTenantService {
  private readonly logger = new Logger(ContractsTenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMyContracts(
    userId: string,
    filters?: { status?: string },
  ): Promise<{ data: ContractResponseDto[]; total: number }> {
    const where: Prisma.contractsWhereInput = {
      tenant_id: userId,
    };
    if (filters?.status) where.status = filters.status as ContractStatus;

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
      data: contracts.map((c) => toContractResponseDto(c)),
      total,
    };
  }

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
