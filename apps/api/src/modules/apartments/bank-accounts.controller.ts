import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  BankAccountResponseDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Bank Accounts')
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({ status: 201, description: 'Bank account created', type: BankAccountResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate account' })
  async create(
    @Body() dto: CreateBankAccountDto,
  ): Promise<{ data: BankAccountResponseDto }> {
    const bankAccount = await this.bankAccountsService.create(dto);
    return { data: bankAccount };
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all bank accounts' })
  @ApiQuery({ name: 'buildingId', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Bank accounts list', type: [BankAccountResponseDto] })
  async findAll(
    @Query('buildingId') buildingId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<{ data: BankAccountResponseDto[] }> {
    const bankAccounts = await this.bankAccountsService.findAll({
      buildingId,
      ownerId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    return { data: bankAccounts };
  }

  // =========================================================================
  // Payment-related endpoints (accessible by residents)
  // Must be defined BEFORE :id route to avoid route collision
  // =========================================================================

  @Get('for-payment')
  @Roles('admin', 'resident')
  @ApiOperation({ summary: 'Get bank account for payment QR' })
  @ApiQuery({ name: 'buildingId', required: true, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'isRentPayment', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Bank account for payment', type: BankAccountResponseDto })
  async getForPayment(
    @Query('buildingId', ParseUUIDPipe) buildingId: string,
    @Query('ownerId') ownerId?: string,
    @Query('isRentPayment') isRentPayment?: string,
  ): Promise<{ data: BankAccountResponseDto | null }> {
    const bankAccount = await this.bankAccountsService.getBankAccountForPayment(
      buildingId,
      ownerId,
      isRentPayment === 'true',
    );
    return { data: bankAccount };
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiResponse({ status: 200, description: 'Bank account details', type: BankAccountResponseDto })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: BankAccountResponseDto }> {
    const bankAccount = await this.bankAccountsService.findOne(id);
    return { data: bankAccount };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update bank account' })
  @ApiResponse({ status: 200, description: 'Bank account updated', type: BankAccountResponseDto })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<{ data: BankAccountResponseDto }> {
    const bankAccount = await this.bankAccountsService.update(id, dto);
    return { data: bankAccount };
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete bank account' })
  @ApiResponse({ status: 200, description: 'Bank account deleted' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.bankAccountsService.delete(id);
    return { message: 'Bank account deleted' };
  }

  // =========================================================================
  // Building-specific endpoints
  // =========================================================================

  @Get('building/:buildingId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get bank accounts for a building' })
  @ApiResponse({ status: 200, description: 'Building bank accounts', type: [BankAccountResponseDto] })
  async findByBuilding(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ): Promise<{ data: BankAccountResponseDto[] }> {
    const bankAccounts = await this.bankAccountsService.findAll({
      buildingId,
      isActive: true,
    });
    return { data: bankAccounts };
  }

  @Post('building/:buildingId')
  @Roles('admin')
  @ApiOperation({ summary: 'Create bank account for a building' })
  @ApiResponse({ status: 201, description: 'Bank account created', type: BankAccountResponseDto })
  async createForBuilding(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: Omit<CreateBankAccountDto, 'buildingId' | 'ownerId'>,
  ): Promise<{ data: BankAccountResponseDto }> {
    const bankAccount = await this.bankAccountsService.create({
      ...dto,
      buildingId,
    } as CreateBankAccountDto);
    return { data: bankAccount };
  }
}
