# README.context - data-hooks

## 10-Second Summary
Hook layer centralizing API calls, caching, websocket listeners, and feature-specific query/mutation orchestration.

## Core Use Cases
- Query lists/details with stable query keys.
- Mutate server state and invalidate affected caches.
- Subscribe to realtime events and reconcile local cache updates.

## DTO and API Dependencies
- API client calls map to `docs/api-contracts.md`.
- Shared types enforce request/response typing.

## State Boundaries
- Server state belongs to TanStack Query.
- UI-only transient state stays in components/stores.

## Side Effects
- Network calls through API client.
- Cache invalidation and optimistic updates.
- Websocket subscription lifecycle.
