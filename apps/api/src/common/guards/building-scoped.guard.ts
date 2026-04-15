import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@vully/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../../modules/identity/interfaces/auth.interface';

/**
 * Key for storing building-scoped metadata
 */
export const BUILDING_SCOPED_KEY = 'buildingScoped';

/**
 * Building-Scoped Guard
 * 
 * Enforces building-level access control for non-admin roles.
 * 
 * Logic:
 * - Admin users bypass all scoping
 * - Other roles must have a user_building_assignment for the target building
 * - Building ID is extracted from route params (:buildingId) or request body (buildingId)
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard, BuildingScopedGuard)
 * @BuildingScoped()
 * @Get(':buildingId/residents')
 * async getResidents(@Param('buildingId') buildingId: string) { ... }
 */
@Injectable()
export class BuildingScopedGuard implements CanActivate {
  private readonly logger = new Logger(BuildingScopedGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if decorator is applied
    const isScoped = this.reflector.getAllAndOverride<boolean>(
      BUILDING_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isScoped) {
      return true; // Decorator not applied, allow access
    }

    const request = context.switchToHttp().getRequest<{
      user: AuthUser;
      params: Record<string, string>;
      body: Record<string, unknown>;
    }>();

    const { user } = request;

    if (!user || !user.id) {
      return false; // Not authenticated
    }

    // Admin bypasses all scoping
    if (user.roles?.includes(UserRole.admin)) {
      return true;
    }

    // Extract buildingId from params or body
    const buildingId = this.extractBuildingId(request);

    if (!buildingId) {
      this.logger.warn('BuildingScopedGuard: Could not extract buildingId', {
        userId: user.id,
        params: request.params,
      });
      throw new ForbiddenException('Building context required');
    }

    // Check if user has assignment for this building
    const assignment = await this.prisma.user_building_assignments.findFirst({
      where: {
        user_id: user.id,
        building_id: buildingId,
      },
      select: { id: true, role: true },
    });

    if (!assignment) {
      this.logger.warn('BuildingScopedGuard: User not assigned to building', {
        userId: user.id,
        buildingId,
      });
      throw new ForbiddenException('You are not assigned to this building');
    }

    // Optional: Attach assignment info to request for downstream use
    (request as Record<string, unknown>).buildingAssignment = assignment;

    return true;
  }

  /**
   * Extract building ID from request
   * Priority: route param > body > query
   */
  private extractBuildingId(request: {
    params: Record<string, string>;
    body: Record<string, unknown>;
  }): string | null {
    // From route params (most common)
    if (request.params.buildingId) {
      return request.params.buildingId;
    }
    if (request.params.id) {
      // Check if the route is /buildings/:id
      return request.params.id;
    }

    // From request body
    if (request.body.buildingId && typeof request.body.buildingId === 'string') {
      return request.body.buildingId;
    }
    if (request.body.building_id && typeof request.body.building_id === 'string') {
      return request.body.building_id;
    }

    return null;
  }
}
