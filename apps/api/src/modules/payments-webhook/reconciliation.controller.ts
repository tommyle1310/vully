import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReconciliationService, ReconciliationResult } from './reconciliation.service';
import { ReconcileRequestDto } from './dto/webhook-payload.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Reconciliation Controller
 * 
 * Manual re-sync endpoint for accountants to fetch and process
 * recent transactions from gateway APIs.
 */
@ApiTags('Payment Reconciliation')
@ApiBearerAuth()
@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  /**
   * Trigger manual reconciliation for a specific gateway
   */
  @Post('reconcile')
  @Roles('admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually reconcile recent transactions from gateway' })
  @ApiResponse({ status: 200, description: 'Reconciliation results' })
  async reconcile(
    @Body() dto: ReconcileRequestDto,
  ): Promise<ReconciliationResult> {
    return this.service.reconcile(dto.gateway, dto.hours || 24);
  }

  /**
   * Trigger manual reconciliation for all gateways
   */
  @Post('reconcile-all')
  @Roles('admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually reconcile all gateways' })
  @ApiResponse({ status: 200, description: 'Reconciliation results for all gateways' })
  async reconcileAll(): Promise<ReconciliationResult[]> {
    return this.service.reconcileAll(24);
  }
}
