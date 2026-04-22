# identity Module Context

## Core Purpose
Authentication, authorization, users, and building assignments.

## Input/Output Contract
- Inputs: Login/register/oauth/user DTOs, JWT payloads, role guards.
- Outputs: Tokens, user profiles, role and assignment mappings.

## Side Effects
Credential validation, token issuance/refresh, audit-sensitive role updates.

## Dependencies
Prisma, JWT/passport strategies, RBAC decorators/guards.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
