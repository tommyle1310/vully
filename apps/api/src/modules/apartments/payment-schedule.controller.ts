import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentScheduleService } from './payment-schedule.service';
import {
  CreatePaymentScheduleDto,
  UpdatePaymentScheduleDto,
  PaymentScheduleResponseDto,
  RecordPaymentDto,
  PaymentResponseDto,
  ContractFinancialSummaryDto,
  GenerateRentScheduleDto,
  GeneratePurchaseMilestonesDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Payment Schedules')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentScheduleController {
  constructor(private readonly paymentScheduleService: PaymentScheduleService) {}

  // =========================================================================
  // Payment Schedule Endpoints
  // =========================================================================

  @Get('contracts/:contractId/payment-schedules')
  @Roles('admin')
  @ApiOperation({ summary: 'Get payment schedules for a contract' })
  @ApiResponse({ status: 200, description: 'Payment schedules list', type: [PaymentScheduleResponseDto] })
  async findSchedulesByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<{ data: PaymentScheduleResponseDto[] }> {
    const schedules = await this.paymentScheduleService.findAllByContract(contractId);
    return { data: schedules };
  }

  @Post('contracts/:contractId/payment-schedules')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a payment schedule entry' })
  @ApiResponse({ status: 201, description: 'Schedule created', type: PaymentScheduleResponseDto })
  async createSchedule(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: CreatePaymentScheduleDto,
  ): Promise<{ data: PaymentScheduleResponseDto }> {
    const schedule = await this.paymentScheduleService.createSchedule(contractId, dto);
    return { data: schedule };
  }

  @Get('payment-schedules/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a payment schedule by ID' })
  @ApiResponse({ status: 200, description: 'Payment schedule details', type: PaymentScheduleResponseDto })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async findSchedule(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: PaymentScheduleResponseDto }> {
    const schedule = await this.paymentScheduleService.findOne(id);
    return { data: schedule };
  }

  @Patch('payment-schedules/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a payment schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated', type: PaymentScheduleResponseDto })
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentScheduleDto,
  ): Promise<{ data: PaymentScheduleResponseDto }> {
    const schedule = await this.paymentScheduleService.updateSchedule(id, dto);
    return { data: schedule };
  }

  @Delete('payment-schedules/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a payment schedule (must have no payments)' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete schedule with existing payments' })
  async deleteSchedule(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.paymentScheduleService.deleteSchedule(id);
    return { message: 'Payment schedule deleted' };
  }

  // =========================================================================
  // Payment Recording Endpoints
  // =========================================================================

  @Post('payment-schedules/:scheduleId/payments')
  @Roles('admin')
  @ApiOperation({ summary: 'Record a payment against a schedule' })
  @ApiResponse({ status: 201, description: 'Payment recorded', type: PaymentResponseDto })
  async recordPayment(
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: PaymentResponseDto }> {
    const payment = await this.paymentScheduleService.recordPayment(
      scheduleId,
      dto,
      user.id,
    );
    return { data: payment };
  }

  @Get('contracts/:contractId/payments')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all payments for a contract' })
  @ApiResponse({ status: 200, description: 'Payments list', type: [PaymentResponseDto] })
  async findPaymentsByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<{ data: PaymentResponseDto[] }> {
    const payments = await this.paymentScheduleService.findPaymentsByContract(contractId);
    return { data: payments };
  }

  @Delete('payments/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete/void a payment' })
  @ApiResponse({ status: 200, description: 'Payment deleted' })
  async deletePayment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.paymentScheduleService.deletePayment(id);
    return { message: 'Payment deleted' };
  }

  // =========================================================================
  // Financial Summary
  // =========================================================================

  @Get('contracts/:contractId/financial-summary')
  @Roles('admin')
  @ApiOperation({ summary: 'Get contract financial summary' })
  @ApiResponse({ status: 200, description: 'Financial summary', type: ContractFinancialSummaryDto })
  async getFinancialSummary(
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<{ data: ContractFinancialSummaryDto }> {
    const summary = await this.paymentScheduleService.getContractFinancialSummary(contractId);
    return { data: summary };
  }

  // =========================================================================
  // Auto-Generation
  // =========================================================================

  @Post('contracts/:contractId/generate-rent-schedule')
  @Roles('admin')
  @ApiOperation({ summary: 'Auto-generate rent schedules for a rental contract' })
  @ApiResponse({ status: 201, description: 'Schedules generated', type: [PaymentScheduleResponseDto] })
  @ApiResponse({ status: 400, description: 'Not a rental contract or schedules already exist' })
  async generateRentSchedule(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: GenerateRentScheduleDto,
  ): Promise<{ data: PaymentScheduleResponseDto[]; message: string }> {
    const schedules = await this.paymentScheduleService.generateRentSchedules(contractId, dto);
    return {
      data: schedules,
      message: `Generated ${schedules.length} payment schedule(s)`,
    };
  }

  @Post('contracts/:contractId/generate-purchase-milestones')
  @Roles('admin')
  @ApiOperation({ summary: 'Auto-generate payment milestones for a purchase contract' })
  @ApiResponse({ status: 201, description: 'Milestones generated', type: [PaymentScheduleResponseDto] })
  @ApiResponse({ status: 400, description: 'Not a purchase contract or schedules already exist' })
  async generatePurchaseMilestones(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: GeneratePurchaseMilestonesDto,
  ): Promise<{ data: PaymentScheduleResponseDto[]; message: string }> {
    const schedules = await this.paymentScheduleService.generatePurchaseMilestones(contractId, dto);
    return {
      data: schedules,
      message: `Generated ${schedules.length} payment milestone(s)`,
    };
  }
}
