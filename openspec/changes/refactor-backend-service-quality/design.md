## Context

The NestJS API layer has 13 service/controller files targeted for refactoring. These files collectively exhibit recurring anti-patterns: loose typing, oversized methods, hardcoded constants, duplicated logic, and N+1 queries. The refactoring must be behavior-preserving — no API contract changes, no database migration, no new endpoints.

### Constraints
- All existing unit tests (`billing.processor.spec.ts`, `invoices.service.spec.ts`, `meter-readings.service.spec.ts`, `auth.service.spec.ts`) MUST pass after every task
- No changes to Prisma schema or API response shapes
- No new npm dependencies (use only what's already in the project)
- Must be deliverable incrementally — each task is independently mergeable

## Goals / Non-Goals

### Goals
- Eliminate all `any` / type-unsafe casts from the 13 target files
- Reduce maximum method length to ≤40 lines in all service files
- Centralize all magic values into constants/config
- Remove duplicated logic across modules via shared utilities
- Fix N+1 query patterns in stats and meter-readings

### Non-Goals
- Changing API response formats or HTTP status codes
- Adding new features or endpoints
- Refactoring frontend code
- Updating Prisma schema
- Increasing test coverage (existing tests as safety net only)
- Refactoring `seed-knowledge.ts` (seed scripts with hardcoded data are acceptable)

## Decisions

### D1: Shared utility location
- **Decision**: New utilities go in `apps/api/src/common/utils/` (not `packages/shared-types`)
- **Rationale**: These are backend-specific helpers. shared-types stays for cross-app TypeScript interfaces only.
- **Alternative**: Put in `packages/shared-types/src/utils/` — rejected because date/query helpers are backend-only

### D2: Type definitions for Prisma payload types
- **Decision**: Use Prisma's `$inferType` and `GetPayload<>` generics instead of hand-written interfaces
- **Rationale**: Stays in sync with schema changes automatically, eliminates drift
- **Alternative**: Hand-written interfaces in shared-types — rejected because they duplicate the schema and drift

### D3: DTO splitting strategy for apartment.dto.ts
- **Decision**: Use class composition with `@ApiPropertyOptional()` groups, keeping a single `CreateApartmentDto` and `UpdateApartmentDto` but extracting field groups into mixin classes
- **Rationale**: Swagger decorators require class-based DTOs in NestJS; splitting into separate classes would break the existing controller signature. Mixins keep the external API identical.
- **Alternative**: Separate DTO classes per domain — rejected as it changes controller method signatures

### D4: God-method decomposition approach
- **Decision**: Extract private helper methods within the same service class (not new injectable services)
- **Rationale**: These are implementation details, not reusable across modules. New services would add injection complexity for no benefit.
- **Alternative**: New `*Helper` services — rejected as over-engineering for private logic

### D5: Constants organization
- **Decision**: Single `apps/api/src/common/constants/defaults.ts` file with named exports grouped by domain
- **Rationale**: All magic values are small scalars. A single file is easier to find and audit than scattered per-module constants.
- **Alternative**: Per-module constants files — acceptable for large modules but premature here

## Risks / Trade-offs

- **Risk**: Refactoring without full test coverage may introduce subtle bugs
  - **Mitigation**: Run existing test suite after each task; manually test critical paths (invoice creation, payment recording, dashboard stats)
- **Risk**: Prisma `GetPayload<>` types can be verbose
  - **Mitigation**: Use type aliases to keep service code readable
- **Risk**: Moving types to shared-types requires rebuild step
  - **Mitigation**: Only move cross-app interfaces; keep backend-only types in api/src

## Migration Plan

No migration needed — this is a pure code refactor with no schema, API, or behavioral changes. Tasks are ordered so each is independently verifiable:

1. Constants & utilities first (no breaking changes, just additions)
2. Type definitions second (swap `any` for proper types)
3. Method decomposition third (split god-methods using new utilities)
4. Query optimization last (verify with existing tests + manual checks)

## Open Questions

- None — this refactoring is well-scoped and does not require external input.
