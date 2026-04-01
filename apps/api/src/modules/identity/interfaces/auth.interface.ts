/**
 * Authentication interfaces for Vully Platform
 * Centralized to avoid duplication across controllers
 */

import { UserRole } from '@vully/shared-types';

/**
 * JWT token payload structure
 * Embedded in access tokens for stateless authentication
 */
export interface JwtPayload {
  /** User ID (UUID) */
  sub: string;
  /** User email */
  email: string;
  /** User roles (1-3 roles, from UserRoleAssignment table) */
  roles: UserRole[];
  /** Issued at timestamp (set by JWT library) */
  iat?: number;
  /** Expiration timestamp (set by JWT library) */
  exp?: number;
}

/**
 * Authenticated user object attached to request
 * Populated by JwtStrategy.validate() after token verification
 */
export interface AuthUser {
  /** User ID (UUID) */
  id: string;
  /** User email */
  email: string;
  /** User roles (multi-role support) */
  roles: UserRole[];
}
