# README.context - domain-components

## 10-Second Summary
Reusable UI and domain-specific components for billing, apartments, incidents, buildings, notifications, users, and shared UI primitives.

## Core Use Cases
- Render data-rich tables, forms, sheets, dialogs, and dashboards.
- Encapsulate domain views and interaction patterns.

## DTO and API Dependencies
- Components consume typed query/mutation hooks instead of raw fetch.
- Form schemas align with shared types and backend DTO contracts.

## State Boundaries
- Keep components presentational where possible.
- Business data access is delegated to hooks.

## Side Effects
- User-triggered mutations.
- Local UI transitions and motion effects.
