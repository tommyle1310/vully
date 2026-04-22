# README.context - apartments

## 10-Second Summary
Apartment domain management including buildings, contracts, parking, access cards, and schedules.

## Core Business Logic
- Module manages: Apartment and building resources, contract lifecycle updates, payment schedule records.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: Policy/version updates, access-card lifecycle transitions, financial schedule updates.

## Dependency Map
- Depends on: Identity/RBAC, billing integration points, Prisma.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
