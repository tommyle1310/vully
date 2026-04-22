# README.context - auth-routes

## 10-Second Summary
Authentication route group for login/register/password recovery and OAuth callback flows.

## Core Use Cases
- User sign-in and sign-up.
- Password reset lifecycle.
- OAuth callback handoff and token/session initialization.

## DTO and API Dependencies
- Depends on identity/auth contracts from `docs/api-contracts.md`.
- Shared types and auth store drive role/session state.

## State Boundaries
- Route-level auth pages should avoid broad dashboard state coupling.
- Persisted auth state is managed by `authStore` and auth hooks.

## Side Effects
- Token write/refresh operations.
- Redirect navigation after auth completion.
