# notifications Module Context

## Core Purpose
User notification delivery, preferences, and device token management.

## Input/Output Contract
- Inputs: Notification DTOs, preference updates, device token registration.
- Outputs: Notification feeds, preference state, token registration records.

## Side Effects
Background notification processing queue and adapter-based delivery calls.

## Dependencies
BullMQ/Redis, adapter integrations, Prisma.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
