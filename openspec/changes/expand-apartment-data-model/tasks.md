## 1. Database Schema

- [x] 1.1 Add 5 new enums to Prisma schema: `UnitType`, `OwnershipType`, `Orientation`, `BillingCycle`, `SyncStatus`
- [x] 1.2 Expand `Apartment` model with all 7-domain fields (nullable/defaulted)
- [x] 1.3 Rename `floor` → `floorIndex`, `areaSqm` → `grossArea`
- [x] 1.4 Add `ManagementFeeConfig` model with Building relation
- [x] 1.5 Add self-referential `parentUnitId` FK and `ownerId` FK to User
- [x] 1.6 Add indexes on new filterable columns (`unitType`, `ownerId`, `floorIndex`, `isMerged`)
- [x] 1.7 Update Building model to add `ManagementFeeConfig[]` relation
- [x] 1.8 Update User model to add `ownedApartments` relation
- [x] 1.9 Run `prisma migrate dev` to generate migration

## 2. Shared Types

- [x] 2.1 Add new enum schemas + types: `UnitType`, `OwnershipType`, `Orientation`, `BillingCycle`, `SyncStatus`
- [x] 2.2 Update `ApartmentSchema` and `CreateApartmentSchema` with new fields
- [x] 2.3 Add `ManagementFeeConfigSchema`

## 3. Backend DTOs & Service

- [x] 3.1 Update `CreateApartmentDto` with new fields + class-validator decorators
- [x] 3.2 Update `UpdateApartmentDto` (extends PartialType)
- [x] 3.3 Update `ApartmentResponseDto` with new fields
- [x] 3.4 Update `ApartmentFiltersDto` with `unitType`, `orientation`, `ownerId` filters
- [x] 3.5 Update `ApartmentsService` — field renames (`floor` → `floorIndex`, `areaSqm` → `grossArea`), new fields in create/update/response mapping
- [x] 3.6 Ensure `notesAdmin` is excluded from non-admin responses

## 4. Frontend Updates

- [x] 4.1 Update `mapStore.ts` — `floor` → `floorIndex`, `areaSqm` → `grossArea` in Apartment interface
- [x] 4.2 Update `use-apartments.ts` — `areaSqm` → `grossArea` in interfaces
- [x] 4.3 Update `apartment-form-dialog.tsx` — form schema + field mappings
- [x] 4.4 Update `apartment-detail-sheet.tsx` — display field references
- [x] 4.5 Update `buildings/[id]/page.tsx` — `apt.floor` → `apt.floorIndex`, `apt.areaSqm` → `apt.grossArea`
- [x] 4.6 Update `apartment-detail-panel.tsx` — interface + display
- [x] 4.7 Update `apartments/page.tsx` — table column accessor
- [x] 4.8 Update `floor-plan.tsx` — props interface + filter logic

## 5. Validation

- [x] 5.1 Verify TypeScript compilation passes
- [ ] 5.2 Verify existing apartment tests still pass
