# README.context - notifications

## 10-Second Summary
User notification delivery, preferences, and device token management.

## Core Business Logic
- Module manages: Notification feeds, preference state, token registration records.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: Background notification processing queue and adapter-based delivery calls.

## Dependency Map
- Depends on: BullMQ/Redis, adapter integrations, Prisma.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
