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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IncidentCommentsService } from './incident-comments.service';
import {
  CreateIncidentCommentDto,
  UpdateIncidentCommentDto,
  IncidentCommentResponseDto,
} from './dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Incident Comments')
@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IncidentCommentsController {
  constructor(
    private readonly commentsService: IncidentCommentsService,
  ) {}

  @Post(':id/comments')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Add a comment to an incident' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 201, description: 'Comment created', type: IncidentCommentResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async createComment(
    @Param('id', ParseUUIDPipe) incidentId: string,
    @Body() dto: CreateIncidentCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentCommentResponseDto }> {
    const comment = await this.commentsService.create(
      incidentId,
      dto,
      user.id,
      user.role,
    );
    return { data: comment };
  }

  @Get(':id/comments')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get all comments for an incident' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 200, description: 'Comments list' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async getComments(
    @Param('id', ParseUUIDPipe) incidentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentCommentResponseDto[] }> {
    const comments = await this.commentsService.findAll(
      incidentId,
      user.id,
      user.role,
    );
    return { data: comments };
  }

  @Patch('comments/:commentId')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Update a comment (author or admin)' })
  @ApiParam({ name: 'commentId', type: String, description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment updated', type: IncidentCommentResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateIncidentCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentCommentResponseDto }> {
    const comment = await this.commentsService.update(
      commentId,
      dto,
      user.id,
      user.role,
    );
    return { data: comment };
  }

  @Delete('comments/:commentId')
  @Roles('admin', 'technician', 'resident')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author or admin)' })
  @ApiParam({ name: 'commentId', type: String, description: 'Comment UUID' })
  @ApiResponse({ status: 204, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.commentsService.delete(commentId, user.id, user.role);
  }
}
