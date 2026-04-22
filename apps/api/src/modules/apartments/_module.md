# apartments Module Context

## Core Purpose
Apartment domain management including buildings, contracts, parking, access cards, and schedules.

## Input/Output Contract
- Inputs: Apartment/building/contract/access-card/payment DTOs and RBAC context.
- Outputs: Apartment and building resources, contract lifecycle updates, payment schedule records.

## Side Effects
Policy/version updates, access-card lifecycle transitions, financial schedule updates.

## Dependencies
Identity/RBAC, billing integration points, Prisma.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
