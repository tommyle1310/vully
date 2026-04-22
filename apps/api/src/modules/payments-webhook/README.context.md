# README.context - payments-webhook

## 10-Second Summary
Payment webhook ingestion, reconciliation, and unmatched payment handling.

## Core Business Logic
- Module manages: Webhook processing results, reconciliation status, unmatched payment queues.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: External callback verification, payment status mutation, reconciliation trails.

## Dependency Map
- Depends on: Payment adapters, Prisma, billing/accounting integration points.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
