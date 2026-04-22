# README.context - stats

## 10-Second Summary
Dashboard and operational analytics with cached aggregation.

## Core Business Logic
- Module manages: Dashboard KPI aggregates for admin, resident, and technician views.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: Redis cache read/write with TTL and invalidation on domain updates.

## Dependency Map
- Depends on: Redis cache, prisma aggregate queries, incidents/billing/apartments data.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
