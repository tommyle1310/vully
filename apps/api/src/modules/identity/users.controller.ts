import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@vully/shared-types';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  ChangePasswordDto,
  UpdateProfileDto,
  UpdateTechnicianProfileDto,
  TechnicianListItemDto,
} from './dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth.interface';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.create(dto, actor.id);
    return { data: user };
  }

  @Get()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: UserResponseDto[]; meta: { total: number; page: number; limit: number } }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const result = await this.usersService.findAll(pageNum, limitNum);

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: UserResponseDto })
  async getMyProfile(
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const profile = await this.usersService.findOne(user.id);
    return { data: profile };
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({ status: 403, description: 'Current password incorrect' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserResponseDto })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const updatedUser = await this.usersService.updateProfile(user.id, dto);
    return { data: updatedUser };
  }

  @Get('technicians')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'List all technicians with workload summary (admin only)' })
  @ApiResponse({ status: 200, description: 'Technician list with workload', type: [TechnicianListItemDto] })
  async listTechnicians(): Promise<{ data: TechnicianListItemDto[] }> {
    const technicians = await this.usersService.listTechnicians();
    return { data: technicians };
  }

  @Get(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.findOne(id);
    return { data: user };
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.update(id, dto, actor.id, actor.roles);
    return { data: user };
  }

  @Patch(':id/technician-profile')
  @ApiOperation({ summary: 'Update technician profile (admin or self, technician only)' })
  @ApiResponse({ status: 200, description: 'Technician profile updated', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Not a technician or unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateTechnicianProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTechnicianProfileDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.updateTechnicianProfile(id, dto, actor.id, actor.roles);
    return { data: user };
  }

  @Post(':id/roles/:role')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Assign a role to a user (admin only, max 3 roles per user)' })
  @ApiResponse({ status: 200, description: 'Role assigned', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Max 3 roles exceeded or invalid role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already has this role' })
  async assignRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Param('role') role: UserRole,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.assignRole(userId, role, actor.id);
    return { data: user };
  }

  @Post(':id/roles/:role/revoke')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Revoke a role from a user (admin only, must have at least 1 role)' })
  @ApiResponse({ status: 200, description: 'Role revoked', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'User must have at least 1 role' })
  @ApiResponse({ status: 404, description: 'User not found or does not have this role' })
  async revokeRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Param('role') role: UserRole,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.revokeRole(userId, role, actor.id);
    return { data: user };
  }

  @Get(':id/roles')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get all roles for a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User roles' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserRoles(
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<{ data: UserRole[] }> {
    const roles = await this.usersService.getUserRoles(userId);
    return { data: roles };
  }
}
