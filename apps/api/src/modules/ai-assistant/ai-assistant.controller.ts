import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AiAssistantService } from './ai-assistant.service';
import { DocumentService } from './document.service';
import { ChatQueryDto, CreateDocumentDto } from './dto';

@ApiTags('AI Assistant')
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiAssistantController {
  constructor(
    private readonly aiAssistantService: AiAssistantService,
    private readonly documentService: DocumentService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI assistant (RAG-powered)' })
  @ApiResponse({
    status: 200,
    description: 'AI response with sources',
    schema: {
      example: {
        data: {
          response: 'According to the building rules...',
          sources: [
            { title: 'Building Regulations', category: 'building-rules', relevance: 0.92 },
          ],
          responseTime: 1234,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Rate limit exceeded' })
  async chat(
    @Body() dto: ChatQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.aiAssistantService.chat({
      query: dto.query,
      userId: user.id,
      context: {
        apartmentId: dto.apartmentId,
        buildingId: dto.buildingId,
      },
    });
    return { data: result };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user chat history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Chat history retrieved' })
  async getChatHistory(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: number,
  ) {
    const history = await this.aiAssistantService.getChatHistory(
      user.id,
      limit ? parseInt(String(limit)) : 10,
    );
    return { data: history };
  }

  @Get('quota')
  @ApiOperation({ summary: 'Get remaining query quota for today' })
  @ApiResponse({
    status: 200,
    description: 'Query quota information',
    schema: {
      example: {
        data: {
          used: 5,
          limit: 20,
          remaining: 15,
        },
      },
    },
  })
  async getQuota(@CurrentUser() user: AuthUser) {
    const used = await this.aiAssistantService.getUserQueryCount(user.id);
    const isAdmin = user?.roles?.includes('admin');
    const limit = isAdmin ? 0 : 20; // 0 means unlimited for admin
    const remaining = isAdmin ? 'unlimited' : Math.max(0, limit - used);

    return {
      data: {
        used,
        limit,
        remaining,
      },
    };
  }

  // =============================================================================
  // Document Management (Admin only)
  // =============================================================================

  @Post('documents')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create knowledge document (Admin only)' })
  @ApiResponse({ status: 201, description: 'Document created with embeddings' })
  async createDocument(@Body() dto: CreateDocumentDto) {
    const document = await this.documentService.createDocument(dto);
    return { data: document };
  }

  @Get('documents')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all documents (Admin only)' })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getDocuments(@Query('category') category?: string) {
    const documents = await this.documentService.getDocuments(category);
    return { data: documents };
  }

  @Get('documents/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get document by ID (Admin only)' })
  async getDocument(@Param('id') id: string) {
    const document = await this.documentService.getDocument(id);
    return { data: document };
  }

  @Delete('documents/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete document (Admin only)' })
  async deleteDocument(@Param('id') id: string) {
    await this.documentService.deleteDocument(id);
    return { message: 'Document deleted successfully' };
  }

  @Post('documents/search')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Search documents with vector similarity (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async searchDocuments(
    @Body() body: { query: string },
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ) {
    const results = await this.documentService.searchDocuments(
      body.query,
      limit ? parseInt(String(limit)) : 5,
      category,
    );
    return { data: results };
  }
}
