# README.context - identity

## 10-Second Summary
Authentication, authorization, users, and building assignments.

## Core Business Logic
- Module manages: Tokens, user profiles, role and assignment mappings.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: Credential validation, token issuance/refresh, audit-sensitive role updates.

## Dependency Map
- Depends on: Prisma, JWT/passport strategies, RBAC decorators/guards.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
