## ADDED Requirements

### Requirement: Query Key Naming Convention
The system SHALL use kebab-case for multi-word query keys and nest child resources under their parent key.

#### Scenario: Top-level resource query keys
- **WHEN** a hook fetches a top-level resource list
- **THEN** the query key MUST use the plural kebab-case resource name as the first element (e.g., `['apartments', filters]`, `['meter-readings', filters]`, `['utility-types']`)

#### Scenario: Nested resource query keys
- **WHEN** a hook fetches a resource scoped to a parent
- **THEN** the query key MUST nest under the parent key (e.g., `['contracts', contractId, 'payment-schedules']`, `['incidents', incidentId, 'comments']`)

### Requirement: staleTime Caching Strategy
The system SHALL apply a tiered staleTime configuration to all TanStack Query hooks based on data volatility.

#### Scenario: Static data caching
- **WHEN** a hook fetches rarely-changing data (utility types, building metadata)
- **THEN** the staleTime MUST be set to 30 minutes (`30 * 60 * 1000`)

#### Scenario: Semi-static data caching
- **WHEN** a hook fetches data that changes daily (buildings list, apartments list)
- **THEN** the staleTime MUST be set to 10 minutes (`10 * 60 * 1000`)

#### Scenario: Dynamic data caching
- **WHEN** a hook fetches frequently-changing data (contracts, invoices, incidents, meter readings)
- **THEN** the staleTime MUST be set to 5 minutes (`5 * 60 * 1000`)

#### Scenario: Real-time data caching
- **WHEN** a hook polls for active job status or real-time data
- **THEN** the staleTime MUST be set to 30 seconds (`30 * 1000`)

### Requirement: Shared Format Utilities
The system SHALL provide shared formatting functions in `lib/format.ts` that are imported by all components instead of defining local duplicates.

#### Scenario: Currency formatting
- **WHEN** any component needs to format a currency amount
- **THEN** it MUST import and use `formatCurrency` from `@/lib/format` which formats as Vietnamese dong (VND) with no decimal places

#### Scenario: Date formatting
- **WHEN** any component needs to format a date string
- **THEN** it MUST import and use `formatDate` from `@/lib/format` which accepts an optional `Intl.DateTimeFormatOptions` parameter

### Requirement: Mutation Hook Consistency
The system SHALL use a standardized mutation hook pattern with `onSuccess` invalidation via `queryClient.invalidateQueries`.

#### Scenario: Mutation invalidates related queries
- **WHEN** a mutation hook succeeds
- **THEN** it MUST invalidate the relevant query key(s) using `queryClient.invalidateQueries({ queryKey: [...] })`
- **AND** the queryFn MUST NOT use unnecessary `async` wrappers when simply returning `apiClient` calls
