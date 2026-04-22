# incidents Module Context

## Core Purpose
Incident report workflow with comments, technician assignment, and realtime status updates.

## Input/Output Contract
- Inputs: Incident/comment DTOs, status transitions, assignment actions.
- Outputs: Incident records, comment threads, filtered assignment views.

## Side Effects
Socket.IO broadcasts, activity timeline updates, cache invalidation hooks.

## Dependencies
Identity roles, stats cache hooks, Prisma, websocket gateway.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
