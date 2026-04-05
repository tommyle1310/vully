## ADDED Requirements

### Requirement: Maximum Method Length
All public and private methods in backend service files SHALL NOT exceed 40 lines of logic (excluding blank lines and comments). Methods exceeding this limit MUST be decomposed into focused helper methods.

#### Scenario: God-method is decomposed
- **WHEN** a method such as `syncApartmentsFromSvg()` (115 lines) exists
- **THEN** it MUST be split into smaller helpers (e.g., `parseSvgApartmentTemplates()`, `inferUnitProperties()`, `upsertFloorApartments()`), each ≤40 lines

#### Scenario: toResponseDto stays focused
- **WHEN** a `toResponseDto()` method exceeds 40 lines
- **THEN** field-mapping logic MUST be extracted into domain-grouped helper methods (e.g., `mapOwnershipFields()`, `mapSpatialFields()`)

### Requirement: Single-Responsibility Helper Extraction
Extracted helper methods SHALL have a single, clear responsibility. Helpers MUST be private methods on the same service class unless the logic is reused across multiple services.

#### Scenario: SVG parsing extracted from building service
- **WHEN** `buildings.service.ts` creates apartments from SVG data
- **THEN** SVG regex parsing MUST be in a separate `parseSvgApartmentTemplates()` method, and apartment property inference in `inferUnitProperties()`

#### Scenario: Invoice calculation split
- **WHEN** `invoices.service.ts` calculates an invoice total
- **THEN** rent line-item construction and utility line-item construction MUST be separate helper methods

### Requirement: DTO Readability via Field Grouping
Large DTOs with >50 fields SHALL organize properties into clearly documented sections using section-marker comments or mixin class composition, while preserving the single DTO class used by the controller.

#### Scenario: Apartment DTO field grouping
- **WHEN** a developer reads `apartment.dto.ts`
- **THEN** fields MUST be organized into labeled groups (Spatial, Ownership, Utility, Billing, etc.) with section comments or mixin inheritance

### Requirement: Consolidated Contract Validation
Shared validation logic across related service methods (e.g., contract existence + type check) SHALL be extracted into a single reusable validation method to eliminate duplication.

#### Scenario: Generate-schedule methods share validation
- **WHEN** `generateRentSchedules()` and `generatePurchaseMilestones()` both validate contract existence and type
- **THEN** a shared `validateContractForGeneration()` method MUST be used by both
