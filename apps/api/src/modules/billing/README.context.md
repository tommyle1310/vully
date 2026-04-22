# README.context - billing

## 10-Second Summary
Invoice lifecycle, utility metering, tier pricing, and billing background jobs.

## Core Business Logic
- Module manages: Invoices, billing summaries, meter reading records, job statuses.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: BullMQ job enqueue/process, payment reminders, downstream payment state sync.

## Dependency Map
- Depends on: Prisma, BullMQ/Redis, apartments/contracts context.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
