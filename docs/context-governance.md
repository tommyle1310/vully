# Layered Context Governance

## 1. Backend Module Inventory and Ownership

| Module | Path | Owner Role | Freshness SLA |
|---|---|---|---|
| ai-assistant | apps/api/src/modules/ai-assistant | Backend Platform Team | Same PR for contract/flow changes |
| apartments | apps/api/src/modules/apartments | Apartments Domain Team | Same PR for contract/flow changes |
| billing | apps/api/src/modules/billing | Billing Domain Team | Same PR for contract/flow changes |
| identity | apps/api/src/modules/identity | Identity and Security Team | Same PR for auth/permission changes |
| incidents | apps/api/src/modules/incidents | Operations Domain Team | Same PR for workflow/event changes |
| management-board | apps/api/src/modules/management-board | Governance Domain Team | Before release cut |
| notifications | apps/api/src/modules/notifications | Platform Integrations Team | Same PR for delivery/event changes |
| payments-webhook | apps/api/src/modules/payments-webhook | Payments Integrations Team | Same PR for webhook/reconciliation changes |
| stats | apps/api/src/modules/stats | Analytics Team | Before release cut |

## 2. Frontend Feature Group Inventory

Canonical FE groups are colocated in current structure (not `src/features`):

| Group | Path | Scope |
|---|---|---|
| auth-routes | apps/web/src/app/(auth) | Login, register, password reset, oauth callback |
| dashboard-routes | apps/web/src/app/(dashboard) | Domain pages for apartment operations |
| domain-components | apps/web/src/components | Reusable and domain-specific UI surfaces |
| data-hooks | apps/web/src/hooks | API/state orchestration via TanStack Query |
| core-stores | apps/web/src/stores | Global client state |
| core-lib | apps/web/src/lib | API client and utilities |

## 3. API Contract Source and Generation Commands

Primary source for contracts:
- NestJS Swagger JSON served by API app at `/api/docs-json` in local dev.

Commands:
1. Start backend app (dev mode):
   - `pnpm --filter @vully/api dev`
2. Export Swagger JSON to file (from repo root):
   - `Invoke-WebRequest http://localhost:3001/api/docs-json -OutFile docs/swagger.json`
3. Convert Swagger JSON to markdown baseline contracts:
   - `Set-Location apps/api; pnpm exec ts-node ../../scripts/swagger-to-api-contracts.ts ../../docs/swagger.json ../../docs/api-contracts.generated.md; Set-Location ../..`
4. Curate final FE-BE contract notes in `docs/api-contracts.md`.

## 4. Freshness and Review Protocol

Required updates in the same work item when changed:
- API request/response shape
- Role/permission access scope
- Queue/event side effects
- Cross-module dependency

Review checklist:
- Root constitution `.project-context.md` is consistent with module docs.
- `docs/api-contracts.md` reflects latest Swagger export.
- Module `_module.md` and `README.context.md` both updated when side effects change.
- Retrieval docs updated if GitNexus behavior changes.

## 5. Governance Cadence

- Core domains (identity, apartments, billing, incidents, ai-assistant, notifications): mandatory same-change updates.
- Non-core domains (management-board, stats, experimental): update before release cut.
- Monthly maintenance pass: verify stale docs and broken links.
