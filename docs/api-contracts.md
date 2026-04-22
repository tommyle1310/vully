# API Contracts (FE-BE)

## 1. Scope
This catalog documents frontend-backend contracts for core domains:
- identity
- apartments
- billing
- incidents
- ai-assistant
- notifications

Contract source of truth:
- Generated baseline from Swagger JSON (`/api-json`)
- Curated summaries in this document

Standard envelope expectation:
- Success: `{ data, meta, errors }` (module-specific legacy responses may still exist)
- Error: `{ data: null, meta, errors: [...] }`

## 2. Identity

Base controllers:
- `auth`
- `users`
- `users/:userId/building-assignments`
- `buildings/:buildingId/staff`

Key endpoints:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /users`
- `GET /users/technicians`
- `PATCH /users/:id/technician-profile`
- `GET /users/:userId/building-assignments`

Auth and role scope:
- Auth endpoints: public or token refresh protected by implementation.
- User/admin operations: role-protected (`admin` and policy guards).

## 3. Apartments

Base controllers:
- `apartments`
- `buildings`
- `contracts`
- `buildings/:buildingId/parking`
- `buildings/:buildingId/policies`
- `bank-accounts`
- access card and payment schedule controllers (module-level prefixed routes)

Key endpoints:
- `GET /apartments`
- `POST /apartments`
- `GET /apartments/:id`
- `PATCH /apartments/:id`
- `GET /buildings`
- `POST /buildings`
- `GET /contracts`
- `POST /contracts`
- `GET /buildings/:buildingId/parking/zones`
- `POST /buildings/:buildingId/policies`
- `GET /bank-accounts`

Auth and role scope:
- Admin: full CRUD
- Technician: read-limited where configured
- Resident: scoped read on own resources

## 4. Billing

Base controllers:
- `invoices`
- `meter-readings`
- `utility-types`
- `billing-jobs`

Key endpoints:
- `GET /invoices`
- `POST /invoices/generate`
- `PATCH /invoices/:id`
- `GET /meter-readings`
- `POST /meter-readings`
- `GET /utility-types`
- `POST /billing-jobs/generate-monthly`

Side effects:
- Invoice generation and reminders rely on BullMQ jobs.

## 5. Incidents

Base controllers:
- `incidents`
- incident comments routes under incidents controller namespace

Key endpoints:
- `GET /incidents`
- `POST /incidents`
- `PATCH /incidents/:id`
- `POST /incidents/:id/assign`
- `POST /incidents/:id/comments`

Side effects:
- Socket.IO emits realtime incident updates by scope (building/apartment/user).

## 6. AI Assistant

Base controller:
- `ai-assistant`

Key endpoints:
- `POST /ai-assistant/chat`
- `GET /ai-assistant/history`
- `POST /ai-assistant/documents`

Behavior notes:
- Routing may combine cache, SQL/tooling, and RAG model paths.

## 7. Notifications

Base controllers:
- `notifications`
- `notifications/preferences`
- `notifications/devices`

Key endpoints:
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /notifications/preferences`
- `PATCH /notifications/preferences`
- `POST /notifications/devices`

## 8. Contract Update Protocol

1. Export latest Swagger JSON:
- `Invoke-WebRequest http://localhost:3001/api/docs-json -OutFile docs/swagger.json`
2. Regenerate markdown baseline:
- `Set-Location apps/api; pnpm exec ts-node ../../scripts/swagger-to-api-contracts.ts ../../docs/swagger.json ../../docs/api-contracts.generated.md; Set-Location ../..`
3. Curate business notes and role scopes in `docs/api-contracts.md`.
4. Validate changed routes against FE hooks/components before merge.

## 9. Versioning Note

- This file tracks current integration contracts, not historical changelog.
- For breaking changes, include migration notes in OpenSpec change proposal and release notes.
