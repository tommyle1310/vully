# Change: Expand Apartment Data Model

## Why

The current `Apartment` model is minimal (10 fields). Vietnamese apartment management requires comprehensive tracking across 7 domains: spatial layout, ownership/legal, occupancy, utilities/hardware, parking/assets, billing configuration, and system logic. This expansion enables correct billing, legal compliance (PCCC fire safety, sổ hồng), 3D/SVG visualization, IoT readiness, and unit merging.

## What Changes

### Database (Prisma)
- **NEW** 5 enums: `UnitType`, `OwnershipType`, `Orientation`, `BillingCycle`, `SyncStatus`
- **MODIFIED** `Apartment` model: +40 new columns across 7 domains (all nullable/defaulted — non-breaking)
- **RENAMED** `floor` → `floorIndex`, `areaSqm` → `grossArea` (semantic clarity)
- **NEW** `ManagementFeeConfig` model with building/unit-type–scoped pricing
- **NEW** Self-referential `parentUnitId` FK for merged units
- **NEW** `ownerId` FK → `User` for ownership tracking separate from tenancy

### Backend (NestJS)
- **MODIFIED** `CreateApartmentDto` / `UpdateApartmentDto`: add new fields with validation
- **MODIFIED** `ApartmentResponseDto`: include new fields, exclude `notesAdmin` for non-admin
- **MODIFIED** `ApartmentsService`: handle field renames, owner relation, merged-unit logic
- **MODIFIED** `ApartmentFiltersDto`: add `unitType`, `orientation`, `ownerId` filters
- **NEW** Management fee config CRUD (minimal — just model + basic service)

### Shared Types
- **NEW** Zod schemas & enums for `UnitType`, `OwnershipType`, `Orientation`, `BillingCycle`, `SyncStatus`
- **MODIFIED** `ApartmentSchema`, `CreateApartmentSchema` to include new fields

## Impact

- Affected specs: `apartments` (new capability)
- Affected code: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/apartments/`, `packages/shared-types/src/`
- **BREAKING**: `floor` renamed to `floorIndex`, `areaSqm` renamed to `grossArea` — requires frontend/API consumers to update
- Migration: Phase 1 adds all columns nullable, Phase 2 backfills, Phase 3 tightens constraints

## Non-Goals

- Separate `AccessCard` / `ParkingSlot` / `Meter` models (future phase)
- IoT device sync implementation (only `syncStatus` field for now)
- Payment gateway integration for `bankAccountVirtual`
- `pinkBookId` encryption at rest (requires infrastructure changes — separate proposal)
