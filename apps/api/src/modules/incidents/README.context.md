# README.context - incidents

## 10-Second Summary
Incident report workflow with comments, technician assignment, and realtime status updates.

## Core Business Logic
- Module manages: Incident records, comment threads, filtered assignment views.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: Socket.IO broadcasts, activity timeline updates, cache invalidation hooks.

## Dependency Map
- Depends on: Identity roles, stats cache hooks, Prisma, websocket gateway.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
