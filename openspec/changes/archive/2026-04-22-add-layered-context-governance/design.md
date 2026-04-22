# Design: Layered Context Governance for AI Retrieval

## Context
Vully is a monorepo with NestJS backend and Next.js frontend. AI agents (Copilot, GitNexus-assisted flows) need high-fidelity context while keeping prompt cost low.

Current context artifacts are incomplete for full-repo understanding:
- `docs/sample.project-context.md` is explicitly sample-level.
- No canonical `docs/api-contracts.md` currently exists.
- Module-level atomic context files are not present.

A layered design is required so retrieval can choose the smallest accurate unit:
1. Repository Constitution (global)
2. Module Atomic Docs (local)
3. API Contract Catalog (cross-layer FE-BE)
4. Indexing Priority and Retrieval Policy (selection strategy)

## Goals
- Provide a single canonical root context file for full-stack architecture and standards.
- Minimize token usage by enforcing module-scoped docs for retrieval.
- Ensure FE-BE contract alignment using a generated contract catalog.
- Make GitNexus retrieval deterministic for context-first results.

## Non-Goals
- No module runtime refactor.
- No API redesign.
- No new external orchestration service.

## Decisions
### 1) Layered Context Model
Decision:
- Adopt a four-layer model:
  - L0: `.project-context.md` (global constitution)
  - L1: `_module.md` and `README.context.md` per module/feature
  - L2: `docs/api-contracts.md` for FE-BE contracts
  - L3: GitNexus indexing and retrieval conventions

Rationale:
- Balances discovery breadth (L0) and token efficiency (L1).
- Preserves contract traceability between frontend consumers and backend handlers (L2).

### 2) Atomic Module Documentation Contract
Decision:
- Require each backend module and frontend feature domain to declare:
  - Core business purpose
  - Input/output DTO and schema touchpoints
  - Side effects (queue, websocket, notifications, external integrations)
  - Dependency graph (upstream/downstream)

Rationale:
- This provides enough context to onboard an AI agent in under 10 seconds without loading full implementation files.

### 3) Contract Generation Source of Truth
Decision:
- Use schema export and/or Swagger JSON as generation input for `docs/api-contracts.md`.
- Document both command path and review cadence.

Rationale:
- Avoid manual contract drift.
- Keep contracts reviewable by FE and BE owners.

### 4) Indexing and Retrieval Policy
Decision:
- Prioritize retrieval in this order when user task is module-scoped:
  1. module `README.context.md`
  2. module `_module.md`
  3. `docs/api-contracts.md` (if FE-BE boundary involved)
  4. `.project-context.md`
  5. code files

Rationale:
- Guarantees token-efficient grounding and reduces irrelevant code ingestion.

## Alternatives Considered
- Single large context file only.
  - Rejected due to high token cost and poor retrieval precision.
- Only generated docs with no manual curation.
  - Rejected because generated docs miss domain intent and operational constraints.
- Only manual docs with no generation pipeline.
  - Rejected due to freshness and consistency risk.

## Risks and Trade-offs
- More files increase maintenance burden.
  - Mitigation: owner mapping + refresh SLA + validation checklist.
- Strict structure may slow quick edits.
  - Mitigation: keep templates short and standardized.
- GitNexus behavior may vary by index configuration.
  - Mitigation: define fallback retrieval order and periodic index checks.

## Migration Plan
1. Create `.project-context.md` with full-stack mapping and standards.
2. Generate and curate `docs/api-contracts.md` from schema/Swagger output.
3. Roll out module docs for high-priority domains first (billing, apartments, identity, incidents, ai-assistant), then remaining modules.
4. Add FE context coverage for dashboard domains and shared hooks/components mapping.
5. Configure and verify GitNexus indexing behavior for new markdown artifacts.
6. Add governance checks to periodic engineering workflow.

## Success Metrics
- 100% backend modules have `_module.md` and `README.context.md`.
- 100% top-priority FE domains have `README.context.md`.
- `docs/api-contracts.md` updated from authoritative source on each API contract change.
- Reduced average prompt token usage for module tasks (baseline vs post-rollout).
- Fewer FE-BE contract mismatch incidents.

## Implementation Decisions
- FE context docs are colocated with existing feature surfaces under `apps/web/src/app`, `apps/web/src/components`, and `apps/web/src/hooks` for fast sidebar discovery.
- Contract generation for `docs/api-contracts.md` uses Swagger JSON exported from NestJS as the primary source, transformed via a repository script to Markdown.
- CI integration is optional for first rollout; release-cadence regeneration with checklist verification is required.
