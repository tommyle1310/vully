import { SetMetadata } from '@nestjs/common';
import { BUILDING_SCOPED_KEY } from '../guards/building-scoped.guard';

/**
 * BuildingScoped Decorator
 * 
 * Mark an endpoint as building-scoped, requiring users to have
 * a user_building_assignment for the target building (except admins).
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard, BuildingScopedGuard)
 * @Roles('security', 'housekeeping', 'building_manager')
 * @BuildingScoped()
 * @Get(':buildingId/residents')
 * async getResidents(@Param('buildingId') buildingId: string) { ... }
 */
export const BuildingScoped = () => SetMetadata(BUILDING_SCOPED_KEY, true);
