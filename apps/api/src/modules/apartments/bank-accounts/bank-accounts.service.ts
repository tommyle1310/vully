import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  BankAccountResponseDto,
} from '../dto/payment.dto';
import { toBankAccountResponseDto } from '../payment-schedules/payment-schedule.mapper';

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get bankAccounts() {
    return this.prisma.bank_accounts;
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  async create(dto: CreateBankAccountDto): Promise<BankAccountResponseDto> {
    // Validate that either buildingId or ownerId is provided, not both
    if (dto.buildingId && dto.ownerId) {
      throw new BadRequestException('Bank account can only be linked to either a building or an owner, not both');
    }

    // Check for duplicate bank account
    const existing = await this.bankAccounts.findFirst({
      where: {
        bank_code: dto.bankCode,
        account_number: dto.accountNumber,
      },
    });

    if (existing) {
      throw new BadRequestException('Bank account already exists');
    }

    // If setting as primary, unset other primary accounts for the same entity
    if (dto.isPrimary) {
      await this.unsetPrimaryAccounts(dto.buildingId, dto.ownerId);
    }

    const bankAccount = await this.bankAccounts.create({
      data: {
        bank_name: dto.bankName,
        bank_code: dto.bankCode,
        account_number: dto.accountNumber,
        account_name: dto.accountName,
        is_primary: dto.isPrimary ?? false,
        is_active: true,
        notes: dto.notes,
        building_id: dto.buildingId,
        owner_id: dto.ownerId,
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'bank_account_created',
      bankAccountId: bankAccount.id,
      bankCode: dto.bankCode,
      buildingId: dto.buildingId,
      ownerId: dto.ownerId,
    });

    return toBankAccountResponseDto(bankAccount);
  }

  async findAll(filters?: {
    buildingId?: string;
    ownerId?: string;
    isActive?: boolean;
  }): Promise<BankAccountResponseDto[]> {
    const bankAccounts = await this.bankAccounts.findMany({
      where: {
        ...(filters?.buildingId && { building_id: filters.buildingId }),
        ...(filters?.ownerId && { owner_id: filters.ownerId }),
        ...(filters?.isActive !== undefined && { is_active: filters.isActive }),
      },
      orderBy: [
        { is_primary: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return bankAccounts.map(toBankAccountResponseDto);
  }

  async findOne(id: string): Promise<BankAccountResponseDto> {
    const bankAccount = await this.bankAccounts.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    return toBankAccountResponseDto(bankAccount);
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<BankAccountResponseDto> {
    const existing = await this.bankAccounts.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Bank account not found');
    }

    // If setting as primary, unset other primary accounts
    if (dto.isPrimary) {
      await this.unsetPrimaryAccounts(existing.building_id, existing.owner_id);
    }

    const bankAccount = await this.bankAccounts.update({
      where: { id },
      data: {
        ...(dto.bankName && { bank_name: dto.bankName }),
        ...(dto.accountName && { account_name: dto.accountName }),
        ...(dto.isPrimary !== undefined && { is_primary: dto.isPrimary }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'bank_account_updated',
      bankAccountId: id,
      changes: dto,
    });

    return toBankAccountResponseDto(bankAccount);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.bankAccounts.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Bank account not found');
    }

    await this.bankAccounts.delete({ where: { id } });

    this.logger.log({
      event: 'bank_account_deleted',
      bankAccountId: id,
    });
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private async unsetPrimaryAccounts(buildingId?: string | null, ownerId?: string | null): Promise<void> {
    if (buildingId) {
      await this.bankAccounts.updateMany({
        where: { building_id: buildingId, is_primary: true },
        data: { is_primary: false, updated_at: new Date() },
      });
    } else if (ownerId) {
      await this.bankAccounts.updateMany({
        where: { owner_id: ownerId, is_primary: true },
        data: { is_primary: false, updated_at: new Date() },
      });
    }
  }

  // =========================================================================
  // Get Bank Account for Payment QR
  // =========================================================================

  /**
   * Get the appropriate bank account for an invoice/payment
   * Logic:
   * - If invoice type is 'rent' and owner has bank account, return owner's account
   * - Otherwise, return building's primary bank account
   */
  async getBankAccountForPayment(
    buildingId: string,
    ownerId?: string,
    isRentPayment?: boolean,
  ): Promise<BankAccountResponseDto | null> {
    // If it's a rent payment and owner has a bank account, use owner's account
    if (isRentPayment && ownerId) {
      const ownerAccount = await this.bankAccounts.findFirst({
        where: {
          owner_id: ownerId,
          is_active: true,
        },
        orderBy: { is_primary: 'desc' },
      });

      if (ownerAccount) {
        return toBankAccountResponseDto(ownerAccount);
      }
    }

    // Default: use building's bank account
    const buildingAccount = await this.bankAccounts.findFirst({
      where: {
        building_id: buildingId,
        is_active: true,
      },
      orderBy: { is_primary: 'desc' },
    });

    return buildingAccount ? toBankAccountResponseDto(buildingAccount) : null;
  }
}
