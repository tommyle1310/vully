# stats Module Context

## Core Purpose
Dashboard and operational analytics with cached aggregation.

## Input/Output Contract
- Inputs: Stats query params and role-scoped user context.
- Outputs: Dashboard KPI aggregates for admin, resident, and technician views.

## Side Effects
Redis cache read/write with TTL and invalidation on domain updates.

## Dependencies
Redis cache, prisma aggregate queries, incidents/billing/apartments data.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
