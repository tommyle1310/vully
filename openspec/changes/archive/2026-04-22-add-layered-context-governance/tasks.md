# Tasks: Add Layered Context Governance

## 1. Discovery and Baseline
- [x] 1.1 Inventory all backend modules in `apps/api/src/modules` and map owners.
- [x] 1.2 Inventory frontend feature domains from `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/hooks`, and define canonical feature grouping.
- [x] 1.3 Capture current API surface source (`Swagger JSON` and/or schema export) and record generation commands.
- [x] 1.4 Define doc freshness SLA and ownership matrix.

## 2. Root Constitution (L0)
- [x] 2.1 Create `.project-context.md` at repository root as single source of truth.
- [x] 2.2 Include exact tech stack versions (NestJS, Next.js, BullMQ, Socket.IO, Neon/PostgreSQL adapter path).
- [x] 2.3 Add end-to-end data-flow map: Web app -> shared types/DTO -> API controllers -> services -> database/queue/events.
- [x] 2.4 Add coding standards: naming, error handling, dependency injection, and module boundaries.
- [x] 2.5 Add global token-saving retrieval rules and folder exclusions (`dist`, `node_modules`, `.next`).

## 3. Module Atomic Docs (L1)
- [x] 3.1 Define templates for `_module.md` and `README.context.md`.
- [x] 3.2 For each backend module, create `_module.md` with IO contract, side effects, and dependencies.
- [x] 3.3 For each backend module, create `README.context.md` summarizing business logic, key DTOs, and consumed/emitted events or queues.
- [x] 3.4 For each frontend feature group, create `README.context.md` describing use-cases, hooks, API dependencies, and state boundaries.
- [x] 3.5 Verify each module context can be understood in <=10 seconds by a reviewer.

## 4. API Contract Catalog (L2)
- [x] 4.1 Generate API schema from authoritative source using NestJS Swagger JSON export (`/api/docs-json`) and convert to Markdown with a repository script (`scripts/swagger-to-api-contracts.ts`).
- [x] 4.2 Create `docs/api-contracts.md` focused on FE-BE contracts (request, response, auth/role scopes, error envelope).
- [x] 4.3 Add contract sections for priority domains: identity, apartments, billing, incidents, ai-assistant, notifications.
- [x] 4.4 Add update protocol (when to regenerate, reviewer checklist, versioning note).

## 5. GitNexus Indexing and Retrieval (L3)
- [x] 5.1 Define indexing priority for newly added markdown context files.
- [x] 5.2 Add retrieval order guideline for Copilot/GitNexus prompts (module docs first, then contracts, then root context, then code).
- [x] 5.3 Validate retrieval behavior with representative prompts for billing, apartments, incidents, and identity.
- [x] 5.4 Document fallback behavior when index is stale.
- [x] 5.5 Configure markdown indexing weight in GitNexus (if supported by tool config) so context docs are ranked above `.ts` implementation files.

## 6. Validation and Rollout
- [x] 6.1 Run `openspec validate add-layered-context-governance --strict`.
- [x] 6.2 Perform consistency check: module docs vs API contracts vs root constitution.
- [x] 6.3 Publish rollout checklist for engineers and AI agents.
- [x] 6.4 Define maintenance cadence and ownership handoff.
