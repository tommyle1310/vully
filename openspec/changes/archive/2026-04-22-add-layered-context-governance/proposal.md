# Proposal: Add Layered Context Governance for AI Workflows

## Change ID
`add-layered-context-governance`

## Status
Applied

## Why
Current AI context documentation is fragmented and partially sample-based (for example `docs/sample.project-context.md`), which causes context misses, higher prompt token usage, and inconsistent FE-BE contract interpretation.

The project needs a single source of truth at root level plus module-scoped atomic documentation so Copilot and GitNexus can retrieve the smallest accurate context unit for each task.

## What Changes
- Introduce a root-level AI constitution document (`.project-context.md`) that represents the full codebase (Backend + Frontend), not a sample subset.
- Define mandatory module-level atomic context documents (`_module.md` and `README.context.md`) for NestJS modules and FE feature surfaces.
- Define a repeatable process to generate and maintain `docs/api-contracts.md` from backend schema and/or Swagger output for FE-BE contracts.
- Define GitNexus indexing and retrieval policy so newly created context docs are prioritized over broad code dumps.
- Define governance rules for freshness, ownership, and validation of context docs.

## Scope
### In Scope
- Documentation architecture and governance for AI context at repository scale.
- Standards for root-level context, module context, and API contract catalog.
- Workflow definitions for schema export, module header generation, and index-priority configuration.
- Validation and quality gates for OpenSpec, contract docs, and context doc consistency.

### Out of Scope
- Feature/business logic implementation in NestJS or Next.js.
- Runtime changes to existing API behavior.
- Replacing existing OpenSpec capability specs with generated docs.
- Building a custom GitNexus plugin (only repository-side indexing policy and conventions).

## Impact
### Affected Specs
- Added: `ai-project-constitution`
- Added: `module-atomic-context-docs`
- Added: `api-contract-catalog`
- Added: `gitnexus-context-indexing`

### Affected Areas (planned implementation stage)
- Root docs and config: `.project-context.md`, optional `.gitnexus` config file if required by toolchain.
- Contract docs: `docs/api-contracts.md`.
- Module docs under:
  - `apps/api/src/modules/*/`
  - `apps/web/src/features/*/` (or approved FE context directory strategy if `features` does not exist in runtime structure).

### Breaking Changes
None. This proposal is additive and governance-focused.

## Risks
| Risk | Description | Mitigation |
|------|-------------|------------|
| Drift risk | Context docs become stale versus code | Add ownership + freshness SLA + validation checklist |
| Token bloat | Context docs grow too large | Enforce atomic structure and max section size guidance |
| FE structure mismatch | `apps/web/src/features` may not be current canonical folder | Allow equivalent feature mapping strategy and document it |
| Contract mismatch | `docs/api-contracts.md` diverges from runtime APIs | Add generation pipeline and review cadence |

## Dependencies
- OpenSpec workflow (`openspec validate --strict`)
- Existing NestJS Swagger exposure and/or schema export tooling
- GitNexus indexing pipeline availability in project environment

## Decisions from Implementation Refinement
1. Frontend context files SHALL be colocated near active feature surfaces in the current Next.js structure (`apps/web/src/app`, `apps/web/src/components`, `apps/web/src/hooks`) instead of a non-existent `apps/web/src/features` root.
2. `.project-context.md` SHALL follow a hybrid model: generated structural baseline plus manual curation for domain intent and operational constraints.
3. `docs/api-contracts.md` SHALL start with high-traffic modules (identity, apartments, billing, incidents, ai-assistant, notifications), then expand to full endpoint coverage.
