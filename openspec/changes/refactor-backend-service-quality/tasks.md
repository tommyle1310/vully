## 1. Shared Constants & Utilities

- [x] 1.1 Create `apps/api/src/common/constants/defaults.ts` — extract all magic values (cache TTL `300_000`, invoice due-day `15`, net-area ratio `0.85`, default utility rate `3000`, rate-limit `20`, payment due-day `5`) as named exports
- [x] 1.2 Create `apps/api/src/common/utils/date.util.ts` — `getMonthBoundaries(date)`, `getStartOfMonth(date)`, `getMonthRange(year, month)` helpers reused by stats, invoices, billing
- [x] 1.3 Create `apps/api/src/common/utils/decimal.util.ts` — `toNumber(decimal)` safe helper for Prisma `Decimal | null` → `number` conversion (replaces scattered `?.toNumber() || 0` patterns)
- [x] 1.4 Update `stats.service.ts` — replace 4× inline date-boundary calculations with `date.util.ts` helpers and 4× hardcoded `300 * 1000` with `CACHE_TTL_MS` constant
- [x] 1.5 Update `invoices.service.ts` — replace hardcoded due-day `15`, tax-rate `0`, and default utility rate `3000` with constants from `defaults.ts`
- [x] 1.6 Update `buildings.service.ts` — replace magic `0.85` net-area ratio with `NET_AREA_RATIO` constant
- [x] 1.7 Update `payment-schedule.service.ts` — replace hardcoded default payment due-day `5` with constant
- [x] 1.8 Update `ai-assistant.service.ts` — replace hardcoded `maxQueriesPerDay = 20` and cache TTL with constants
- [x] 1.9 Run existing tests to confirm no regressions

## 2. Type Safety Improvements

- [x] 2.1 Create Prisma payload type aliases in `apps/api/src/common/types/prisma-payloads.ts` using `Prisma.$apartmentsPayload` / `Prisma.apartmentsGetPayload<>` for apartments, buildings, contracts, invoices, incidents, meter_readings, parking_zones, parking_slots, payment_schedules, payments
- [x] 2.2 Move `AuthUser` interface from `incidents.controller.ts` to `apps/api/src/common/interfaces/auth-user.interface.ts`; update all imports
- [x] 2.3 Move `InvoiceCalculation` interface from `invoices.service.ts` to `common/types/`
- [x] 2.4 Move `PaymentScheduleModel` / `PaymentModel` from `payment-schedule.service.ts` to Prisma payload types; remove hand-written interfaces
- [x] 2.5 Move `DashboardStats` / `AdminStats` from `stats.service.ts` to `common/types/`
- [x] 2.6 Move `ApartmentQueryResult` / `BuildingQueryResult` / `ChatResponse` from `ai-assistant.service.ts` to `common/types/`
- [x] 2.7 Replace `any` casts in `apartments.service.ts` (line 202 `.map((a: any) =>`) with proper Prisma payload type
- [x] 2.8 Replace `any` casts in `payment-schedule.service.ts` (`get schedules(): any`, `get payments(): any`) with typed Prisma delegates
- [x] 2.9 Replace `any` casts in `buildings.service.ts` `toResponseDto()` parameter and `findAll()` map callback
- [x] 2.10 Replace `Record<string, unknown>` in `apartments.service.ts` `updateData` with `Prisma.apartmentsUpdateInput`
- [x] 2.11 Type `contracts.service.ts` `toResponseDto()` parameter using Prisma payload type instead of inline interface
- [x] 2.12 Type `access-cards.service.ts` `toResponseDto()` parameter properly
- [x] 2.13 Type `parking.service.ts` `toZoneResponseDto()` / `toSlotResponseDto()` parameters
- [x] 2.14 Run existing tests to confirm no regressions

## 3. Service Decomposition — God-Method Extraction

- [x] 3.1 `buildings.service.ts`: Extract `syncApartmentsFromSvg()` (115 lines) into 3 helpers — `parseSvgApartmentTemplates()`, `inferUnitProperties()`, `upsertFloorApartments()`
- [x] 3.2 `apartments.service.ts`: Extract `toResponseDto()` (80 lines) — pull out `mapOwner()`, `mapActiveContract()` relation mapping helpers
- [x] 3.3 `invoices.service.ts`: Extract `calculateInvoice()` — split into `buildRentLineItem()`, `buildUtilityLineItems()`, `calculateTieredAmount()` (keep existing but simplify internals)
- [x] 3.4 `ai-assistant.service.ts`: Extract `queryDatabaseForContext()` (128 lines) — split into `detectQueryIntent()`, `buildApartmentContext()`, `buildBuildingContext()`
- [x] 3.5 `ai-assistant.service.ts`: Extract `formatDatabaseContextAsMarkdown()` — split into `parseContextData()`, `formatApartmentSection()`, `formatBuildingSection()`
- [x] 3.6 `payment-schedule.service.ts`: Extract deposit-schedule logic from `generateRentSchedules()` into `createDepositSchedule()`
- [x] 3.7 `payment-schedule.service.ts`: Consolidate duplicated contract-validation at top of `generateRentSchedules()` and `generatePurchaseMilestones()` into `validateContractForGeneration()`
- [x] 3.8 `contracts.service.ts`: Extract `toResponseDto()` — pull out `optNum()` currency helper and `buildContractRelations()`
- [x] 3.9 `stats.service.ts`: Extract `getRevenueBreakdown()` loop body into `categorizeInvoiceLineItems()`
- [x] 3.10 Run existing tests to confirm no regressions

## 4. DTO Refactoring

- [x] 4.1 `apartment.dto.ts`: Standardize section markers to `// --- Section ---` format across CreateApartmentDto, UpdateApartmentDto, and ApartmentResponseDto
- [x] 4.2 Add cross-field validation comments for `netArea < grossArea` and `floorIndex < building.floorCount` (service-level validations, not DTO decorators)
- [x] 4.3 Run existing tests to confirm no regressions

## 5. Query Optimization

- [x] 5.1 `stats.service.ts`: Rewrite `getOccupancyTrend()` — replace per-month loop (2N queries) with 2 batch queries + in-memory grouping
- [x] 5.2 `stats.service.ts`: Rewrite `getRevenueBreakdown()` — single batch invoice query instead of per-month loop
- [x] 5.3 `meter-readings.service.ts`: Rewrite `getLatestReadings()` — replace per-utility-type loop (N+1) with single `findMany` + in-memory dedup by utility_type_id
- [x] 5.4 `invoices.service.ts`: Add `take: 1000` safety limit to unbounded `findMany()` in `buildUtilityLineItems()`
- [x] 5.5 Run existing tests to confirm no regressions

## 6. Consistency & Cleanup

- [x] 6.1 Standardize logging detail across `contracts.service.ts` — added `apartmentId` and `tenantId` to `contract_updated` log event
- [x] 6.2 `incidents.controller.ts`: AuthUser moved to shared location (done in 2.2); `@ApiParam()` decorators already present on comment endpoints
- [x] 6.3 Normalize error messages — verified all services already use consistent `"X not found"` pattern
- [x] 6.4 `parking.service.ts`: Consolidated repeated slot verification into `findAndVerifySlot()` helper (used by assignSlot, unassignSlot, updateSlot)
- [x] 6.5 Final full test run — 4 pre-existing test failures (mock naming issues), no new regressions introduced
