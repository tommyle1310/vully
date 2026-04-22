# payments-webhook Module Context

## Core Purpose
Payment webhook ingestion, reconciliation, and unmatched payment handling.

## Input/Output Contract
- Inputs: Webhook payload DTOs, reconciliation actions, payment reference lookup.
- Outputs: Webhook processing results, reconciliation status, unmatched payment queues.

## Side Effects
External callback verification, payment status mutation, reconciliation trails.

## Dependencies
Payment adapters, Prisma, billing/accounting integration points.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
