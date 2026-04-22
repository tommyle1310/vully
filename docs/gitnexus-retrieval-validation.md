# GitNexus Retrieval Validation

## Purpose
Validate context-first retrieval behavior for representative prompts.

## Retrieval Order Policy
1. `README.context.md` near module/feature
2. `_module.md`
3. `docs/api-contracts.md`
4. `.project-context.md`
5. Source files (`.ts`, `.tsx`)

## Validation Prompts
- Billing: "How invoice generation and queue retries work in billing module?"
- Apartments: "What data flow exists from apartment page to contracts service?"
- Incidents: "How technician assignment updates propagate in realtime?"
- Identity: "How role checks protect users and building assignments endpoints?"

## Pass Criteria
- Retrieved context references module docs before broad code scans.
- FE-BE contract questions include `docs/api-contracts.md` grounding.
- Responses avoid unnecessary repository-wide file ingestion.

## Stale Index Fallback
If index freshness is stale:
1. Run `npx gitnexus analyze` from repository root.
2. Re-run representative prompts.
3. If retrieval quality is still low, force explicit prompt references to module docs and contracts.

## Markdown Weighting (Conditional)
If GitNexus config supports per-file weighting:
- Increase weight for `.project-context.md`, `README.context.md`, `_module.md`, `docs/api-contracts.md`.
- Decrease default weight for broad implementation files during initial retrieval phase.

If per-file weighting is not supported:
- Enforce retrieval order in prompt templates and team workflow.

## Validation Run (2026-04-22)
GitNexus representative prompts executed:
- Billing query returned billing definitions such as `BillingQueueService`, `BillingJobsController`, and `BillingProcessor`.
- Apartments query returned frontend hooks (`useContracts`) and backend contracts services/controllers.
- Incidents realtime query returned `IncidentsService`, `IncidentsGateway`, and `IncidentDetailSheet` flow.
- Identity role-protection query returned identity users/auth services and role-related UI/guard references.

Result:
- Retrieval for domain flows is usable and module-scoped.
- Context docs were created after indexing, so re-index is recommended to prioritize new markdown files in future retrieval.

Recommended follow-up:
- Run `npx gitnexus analyze` after merge to refresh index with new context docs.
