import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@vully/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../../modules/identity/interfaces/auth.interface';

/**
 * RBAC Guard - checks if authenticated user has required role(s)
 * 
 * Multi-role support: User can hold 1-3 roles simultaneously
 * OR logic: If endpoint requires [admin, technician], user with EITHER role gets access
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role restriction
    }

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    
    if (!user || !user.roles) {
      return false; // Not authenticated or missing roles
    }

    // Check if user has ANY of the required roles (OR logic)
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
