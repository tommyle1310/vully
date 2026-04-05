## ADDED Requirements

### Requirement: Batch Queries for Trend Analytics
Analytics methods that compute per-month statistics (occupancy trend, revenue breakdown) SHALL use batch SQL queries with date grouping instead of per-month loop queries. N+1 query patterns in analytics are FORBIDDEN.

#### Scenario: Occupancy trend uses batch query
- **WHEN** `stats.service.ts` computes `getOccupancyTrend()` for 12 months
- **THEN** it MUST execute at most 2 database queries (apartments + contracts grouped by month), not 24 loop queries

#### Scenario: Revenue breakdown uses batch query
- **WHEN** `stats.service.ts` computes `getRevenueBreakdown()` for 6 months
- **THEN** it MUST execute at most 2 database queries with date grouping, not 12 loop queries

### Requirement: Batch Queries for Latest Meter Readings
The `getLatestReadings()` method SHALL fetch the latest reading per utility type in a single query using `DISTINCT ON` or equivalent, instead of looping per utility type.

#### Scenario: Latest readings fetched in single query
- **WHEN** `meter-readings.service.ts` fetches latest readings for an apartment with 4 utility types
- **THEN** it MUST execute exactly 1 database query, not 4

### Requirement: Bounded Result Sets for Internal Queries
Internal `findMany()` calls used within calculation methods (e.g., fetching meter readings for invoice calculation) SHALL include a `take` limit to prevent unbounded result sets.

#### Scenario: Invoice calculation has safety limit
- **WHEN** `invoices.service.ts` fetches meter readings for `calculateInvoice()`
- **THEN** the query MUST include `take: 1000` or a configured maximum
