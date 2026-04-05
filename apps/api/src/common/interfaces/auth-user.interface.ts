import { UserRole } from '@vully/shared-types';

/**
 * Shape of the authenticated user object attached to the request
 * by JwtAuthGuard. Used across all controllers via @CurrentUser().
 *
 * The JWT strategy populates `roles: UserRole[]` (multi-role).
 * Some controllers still reference `role` (singular) for backward compatibility.
 */
export interface AuthUser {
  id: string;
  email: string;
  /** Multi-role support (canonical field from JwtStrategy) */
  roles: UserRole[];
  /** Legacy single-role access — controllers should migrate to `roles` */
  role: UserRole;
}
