# billing Module Context

## Core Purpose
Invoice lifecycle, utility metering, tier pricing, and billing background jobs.

## Input/Output Contract
- Inputs: Invoice, meter-reading, utility-type DTOs, scheduling triggers.
- Outputs: Invoices, billing summaries, meter reading records, job statuses.

## Side Effects
BullMQ job enqueue/process, payment reminders, downstream payment state sync.

## Dependencies
Prisma, BullMQ/Redis, apartments/contracts context.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
