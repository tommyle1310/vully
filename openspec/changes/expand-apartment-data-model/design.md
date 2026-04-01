## Context

The current Apartment model has 10 fields. The target model (per `docs/APARTMENT_MANAGEMENT.md`) spans 7 domains with ~50 fields. This is a significant schema expansion that touches the core entity of the platform.

## Goals / Non-Goals

- **Goals**: Add all 7 domain field groups, new enums, ManagementFeeConfig model, field renames, updated DTOs/services
- **Non-Goals**: Separate normalized models for meters/parking/access-cards; IoT sync implementation; pinkBookId encryption

## Decisions

### Decision 1: Single migration with nullable columns
All new columns are nullable or have defaults. This allows a non-breaking additive migration. `apartmentCode` and `unitType` start nullable, tightened later after backfill.

**Alternatives considered:**
- Multiple smaller migrations per domain → More complex, same end result, harder to test atomically
- Required fields from start → Would break existing data

### Decision 2: Rename `floor` → `floorIndex` and `areaSqm` → `grossArea`
The doc specifies `floor_index` (0-based for 3D rendering) and `gross_area` (Vietnamese real estate term). Semantic clarity matters for the domain.

**Migration**: Prisma `@map` already maps to snake_case DB columns. We rename the Prisma field names and update `@map` values. Existing `floor` column in DB becomes `floor_index`, `area_sqm` becomes `gross_area`. A SQL `ALTER TABLE RENAME COLUMN` handles the DB side.

### Decision 3: `notesAdmin` field — API-level exclusion
`notesAdmin` MUST NOT be exposed to resident/technician roles. Handled via response DTO mapping in the service layer (already strips fields per role), not via database views.

### Decision 4: ManagementFeeConfig as separate model
Rates change over time and vary by building + unit type. A separate model with `effectiveFrom`/`effectiveTo` supports historical tracking and audit requirements.

### Decision 5: Self-referential FK for merged units
`parentUnitId` → self. When `isMerged = true`, the child unit is logically hidden. Simple and sufficient for current needs without a junction table.

## Risks / Trade-offs

- **40+ columns on Apartment**: Acceptable for a core entity in property management. Most columns are nullable and sparse. No performance concern at expected scale (<10K apartments).
- **Field renames are breaking**: Mitigated by updating all consumers (controller, service, DTOs, shared types, frontend) in one change.
- **`apartmentCode` uniqueness**: Globally unique but generated per `{block}-{floor}.{unit}` convention. Must validate format on creation.

## Migration Plan

1. Add enums to Prisma schema
2. Add all new nullable columns + ManagementFeeConfig model
3. Rename `floor` → `floorIndex`, `areaSqm` → `grossArea` in same migration
4. Run `prisma migrate dev`
5. Update DTOs, service, controller, shared types
6. (Future) Backfill script for `apartmentCode` + `unitType` on existing records
7. (Future) Add NOT NULL constraints after backfill

## Open Questions

- None blocking. All decisions align with `docs/APARTMENT_MANAGEMENT.md`.
