# README.context - dashboard-routes

## 10-Second Summary
Main authenticated product surfaces for apartments, buildings, contracts, incidents, billing, settings, and role-specific dashboards.

## Core Use Cases
- Role-based dashboard landing.
- CRUD and workflow pages for operations domains.
- Filtering, pagination, and detail-sheet interactions.

## DTO and API Dependencies
- Uses TanStack Query hooks in `apps/web/src/hooks`.
- Contracts must follow `docs/api-contracts.md` for request/response assumptions.

## State Boundaries
- URL-state (filters/tabs) should use nuqs where available.
- Global state remains in stores; server state remains in TanStack Query cache.

## Side Effects
- Mutation-triggered cache invalidation.
- Realtime updates via websocket hooks on selected pages.
