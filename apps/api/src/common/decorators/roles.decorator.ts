import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@vully/shared-types';

/**
 * Roles decorator for endpoint-level RBAC
 * Usage: @Roles(UserRole.admin, UserRole.technician)
 * 
 * Guard checks if user has ANY of the specified roles (OR logic)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
