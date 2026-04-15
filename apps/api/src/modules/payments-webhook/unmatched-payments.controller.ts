import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UnmatchedPaymentsService } from './unmatched-payments.service';
import {
  MatchUnmatchedPaymentDto,
  RejectUnmatchedPaymentDto,
} from './dto/webhook-payload.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Unmatched Payments Controller
 * 
 * Endpoints for accountants to manage unmatched payments:
 * - List pending unmatched payments
 * - Match to an invoice
 * - Reject with reason
 * - Search potential invoice matches
 */
@ApiTags('Unmatched Payments')
@ApiBearerAuth()
@Controller('api/v1/unmatched-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnmatchedPaymentsController {
  constructor(private readonly service: UnmatchedPaymentsService) {}

  /**
   * List unmatched payments
   */
  @Get()
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'List unmatched payments' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'matched', 'rejected'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of unmatched payments' })
  async list(
    @Query('status') status?: 'pending' | 'matched' | 'rejected',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get unmatched payment statistics
   */
  @Get('stats')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Get unmatched payment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics for dashboard' })
  async getStats() {
    return this.service.getStats();
  }

  /**
   * Get single unmatched payment
   */
  @Get(':id')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Get unmatched payment details' })
  @ApiParam({ name: 'id', description: 'Unmatched payment ID' })
  @ApiResponse({ status: 200, description: 'Unmatched payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  /**
   * Search potential invoice matches for an unmatched payment
   */
  @Get(':id/potential-matches')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Search invoices that could match this payment' })
  @ApiParam({ name: 'id', description: 'Unmatched payment ID' })
  @ApiResponse({ status: 200, description: 'List of potential matching invoices' })
  async searchPotentialMatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.searchPotentialMatches(id);
  }

  /**
   * Manually match unmatched payment to an invoice
   */
  @Post(':id/match')
  @Roles('admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Match unmatched payment to an invoice' })
  @ApiParam({ name: 'id', description: 'Unmatched payment ID' })
  @ApiResponse({ status: 200, description: 'Payment matched successfully' })
  @ApiResponse({ status: 400, description: 'Payment already processed' })
  @ApiResponse({ status: 404, description: 'Payment or invoice not found' })
  async matchToInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MatchUnmatchedPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.matchToInvoice(id, dto.invoiceId, userId);
  }

  /**
   * Reject unmatched payment
   */
  @Post(':id/reject')
  @Roles('admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject unmatched payment' })
  @ApiParam({ name: 'id', description: 'Unmatched payment ID' })
  @ApiResponse({ status: 200, description: 'Payment rejected' })
  @ApiResponse({ status: 400, description: 'Payment already processed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectUnmatchedPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reject(id, dto.reason, userId);
  }
}
