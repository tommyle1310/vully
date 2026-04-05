## ADDED Requirements

### Requirement: Centralized Default Constants
All hardcoded magic values (cache TTLs, default due-days, pricing fallbacks, area ratios, rate limits) SHALL be defined as named exports in `apps/api/src/common/constants/defaults.ts`. Service files MUST import these constants instead of using inline literals.

#### Scenario: Cache TTL uses constant
- **WHEN** `stats.service.ts` sets a cache TTL
- **THEN** it MUST use `CACHE_TTL_MS` from `defaults.ts`, not inline `300 * 1000`

#### Scenario: Invoice due-day uses constant
- **WHEN** `invoices.service.ts` calculates an invoice due date
- **THEN** it MUST use `DEFAULT_INVOICE_DUE_DAY` from `defaults.ts`, not inline `15`

#### Scenario: Net-area ratio uses constant
- **WHEN** `buildings.service.ts` calculates net area from gross area
- **THEN** it MUST use `NET_AREA_RATIO` from `defaults.ts`, not inline `0.85`

### Requirement: Shared Date Utility Functions
Date-boundary calculations (start-of-month, end-of-month, month ranges) SHALL be provided by `apps/api/src/common/utils/date.util.ts` and reused across stats, invoices, and billing services. Inline date arithmetic in service methods is FORBIDDEN.

#### Scenario: Stats service uses date helpers
- **WHEN** `stats.service.ts` calculates month boundaries for dashboard or trend data
- **THEN** it MUST call `getMonthBoundaries()` or `getStartOfMonth()` from `date.util.ts`

#### Scenario: Invoice service uses date helpers
- **WHEN** `invoices.service.ts` parses a billing period into date range
- **THEN** it MUST use shared date utilities

### Requirement: Safe Decimal Conversion Utility
A `toNumber(decimal: Decimal | null | undefined, fallback?: number): number` utility SHALL exist in `apps/api/src/common/utils/decimal.util.ts` and MUST be used wherever Prisma `Decimal` fields are converted to JavaScript numbers.

#### Scenario: Decimal conversion in stats
- **WHEN** `stats.service.ts` accesses `_sum.total_amount`
- **THEN** it MUST use `toNumber()` instead of `?.toNumber() || 0`

### Requirement: Consistent Error Message Phrasing
All `NotFoundException` messages across services SHALL follow the pattern `"<Entity> not found"` (e.g., `"Apartment not found"`, `"Contract not found"`). Variant phrasings like `"Existing card not found"` or `"Access card not found for ID"` are FORBIDDEN.

#### Scenario: Uniform not-found messages
- **WHEN** any service throws `NotFoundException`
- **THEN** the message MUST match the pattern `"<Entity> not found"`

### Requirement: Standardized Audit Logging Fields
All create/update/delete operations in services SHALL log a consistent set of fields: `event`, `entityId`, `actorId`, and operation-specific fields. Logging inconsistencies (e.g., contract create logs 5 fields, update logs 2) are FORBIDDEN.

#### Scenario: Contract service logging consistency
- **WHEN** `contracts.service.ts` logs a create, update, or terminate event
- **THEN** all three operations MUST include at minimum: `event`, `contractId`, `apartmentId`, `tenantId`, `actorId`
