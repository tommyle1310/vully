# Change: Refactor Backend Services for Senior-Level Maintainability

## Why

The API backend has grown organically across 13+ service files totalling ~6,000 lines. An audit reveals systemic code-quality issues that slow feature velocity, increase bug risk, and make onboarding harder:

- **7+ explicit `any` / `as` casts** bypass TypeScript strict mode
- **5 god-methods** exceed 80 lines each (up to 115 lines in `syncApartmentsFromSvg`)
- **15+ hardcoded magic values** (cache TTLs, due-day defaults, price fallbacks, area ratios)
- **8+ duplicated logic patterns** (date boundaries, response mapping, filter building, authorization checks)
- **4 N+1 query patterns** in stats, meter-readings, and invoices
- **Inconsistent error handling** — some methods silently swallow, others throw, with no uniform strategy
- Interface types defined inline in services instead of shared packages

These are not feature changes — they are structural hygiene that preserves existing behavior while making the codebase easier to extend, test, and review.

## What Changes

### 1. Type Safety (service-type-safety)
- Eliminate all `any` casts in services — replace with proper Prisma payload types or explicit interfaces
- Move inline interface definitions (`AuthUser`, `InvoiceCalculation`, `PaymentScheduleModel`, etc.) to `packages/shared-types`
- Type all `toResponseDto()` parameters with Prisma-generated types instead of `Record<string, unknown>`

### 2. Service Decomposition (service-decomposition)
- Extract god-methods into focused private helpers (≤40 lines per method)
- Split `apartment.dto.ts` DTO (~600 lines, 100+ fields) into domain-grouped composition DTOs
- Extract SVG parsing from `buildings.service.ts` into a dedicated `svg-parser.util.ts`
- Extract tiered pricing calculation from `invoices.service.ts` into `pricing.util.ts`
- Extract AI database-query logic from `ai-assistant.service.ts` into `database-context.util.ts`

### 3. Shared Utilities (shared-utilities)
- Create `apps/api/src/common/utils/date.util.ts` for month-boundary helpers (used in stats, invoices, billing)
- Create `apps/api/src/common/utils/response-mapper.util.ts` for reusable DTO mapping patterns
- Create `apps/api/src/common/constants/defaults.ts` for all magic values (cache TTL, due-day, area-ratio, etc.)
- Consolidate duplicated apartment-filter-building logic between `ai-assistant.service.ts` and `apartments.service.ts`

### 4. Query Optimization (query-optimization)
- Replace N+1 loops in `stats.service.ts` (`getOccupancyTrend`, `getRevenueBreakdown`) with batch queries
- Replace per-utility loop in `meter-readings.service.ts` (`getLatestReadings`) with single `GROUP BY` query
- Add `take` limits to unbounded `findMany()` calls in `invoices.service.ts`

## Impact

- Affected specs: None (no behavioral changes — all refactoring preserves existing API contracts)
- Affected code:
  - `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`
  - `apps/api/src/modules/apartments/apartments.service.ts`
  - `apps/api/src/modules/apartments/buildings.service.ts`
  - `apps/api/src/modules/apartments/contracts.service.ts`
  - `apps/api/src/modules/apartments/parking.service.ts`
  - `apps/api/src/modules/apartments/access-cards.service.ts`
  - `apps/api/src/modules/apartments/payment-schedule.service.ts`
  - `apps/api/src/modules/apartments/dto/apartment.dto.ts`
  - `apps/api/src/modules/billing/invoices.service.ts`
  - `apps/api/src/modules/billing/meter-readings.service.ts`
  - `apps/api/src/modules/incidents/incidents.controller.ts`
  - `apps/api/src/modules/stats/stats.service.ts`
  - `packages/shared-types/src/` (new type exports)
  - `apps/api/src/common/utils/` (new utility files)
  - `apps/api/src/common/constants/` (new constants file)
- Risk: Low — behavior-preserving refactors with existing tests as safety net
- Existing tests MUST continue to pass after each task
