import {
  Controller,
  Get,
  Post,
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
import { BillingQueueService } from './billing-queue.service';
import { BulkGenerateInvoicesDto, BulkGenerateResponseDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Billing Jobs')
@Controller('billing-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BillingJobsController {
  constructor(private readonly billingQueueService: BillingQueueService) {}

  @Post('generate')
  @Roles('admin')
  @ApiOperation({ summary: 'Trigger bulk invoice generation for a billing period' })
  @ApiResponse({
    status: 201,
    description: 'Invoice generation job queued',
    type: BulkGenerateResponseDto,
  })
  async generateInvoices(
    @Body() dto: BulkGenerateInvoicesDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: BulkGenerateResponseDto }> {
    const result = await this.billingQueueService.enqueueMonthlyInvoiceGeneration(
      dto.billingPeriod,
      user.id,
      dto.buildingId,
      dto.categories,
    );

    return {
      data: {
        jobId: result.billingJobId,
        message: result.message,
        totalContracts: result.totalContracts,
      },
    };
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List billing jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Billing jobs list' })
  async listJobs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const result = await this.billingQueueService.listBillingJobs(pageNum, limitNum);

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get('stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats() {
    const stats = await this.billingQueueService.getQueueStats();
    return { data: stats };
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get billing job status by ID' })
  @ApiResponse({ status: 200, description: 'Billing job status' })
  @ApiResponse({ status: 404, description: 'Billing job not found' })
  async getJobStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const job = await this.billingQueueService.getBillingJobStatus(id);
    
    if (!job) {
      return { error: 'Billing job not found' };
    }

    return { data: job };
  }
}
