# Tasks: Enhance Apartment Platform Features

## Overview

Implementation checklist for the platform enhancements. Tasks are organized by phase and can be parallelized where noted.

---

## Phase 1: Purchase Contract Bug Fix (Priority: HIGH)

### Frontend - Contract Data Flow

- [x] **1.1** Update `CreateContractInput` interface in `apps/web/src/hooks/use-contracts.ts`
  - Add `contractType`, `purchasePrice`, `downPayment`, `transferDate`
  - Add `optionFee`, `purchaseOptionPrice`, `optionPeriodMonths`, `rentCreditPercent`
  - Add `paymentDueDay`

- [x] **1.2** Update `onSubmit` handler in `apps/web/src/app/(dashboard)/contracts/contract-form-dialog.tsx`
  - Send actual field values based on `contractType`
  - Keep `termsNotes` for display purposes but rely on fields for data

- [x] **1.3** Update `Contract` interface in `use-contracts.ts` to include response fields
  - Add `contractType`, `purchasePrice`, `downPayment`, `transferDate`, etc.

### Backend - Purchase Milestone Generation

- [x] **1.4** Add `generatePurchaseMilestones` method to `PaymentScheduleService`
  - Create down payment schedule entry
  - Create progress payment entries (configurable count, default 3)
  - Create final payment entry tied to transfer date

- [x] **1.5** Add `POST /contracts/:id/generate-purchase-milestones` endpoint
  - Validate contract type is 'purchase'
  - Accept optional parameters: `progressPaymentCount`, `downPaymentPercent`

### Frontend - Payment Schedule UI

- [x] **1.6** Update `PaymentScheduleTable` to show generate button for purchase contracts
  - Add "Generate Purchase Milestones" button when `contractType === 'purchase'`
  - Add mutation hook `useGeneratePurchaseMilestones`

- [x] **1.7** Display purchase-specific milestones correctly
  - Show "Down Payment", "Progress Payment 1/2/3", "Final Payment" labels
  - Show transfer date association

### Testing

- [ ] **1.8** Add unit tests for purchase milestone generation
- [ ] **1.9** Add integration test for purchase contract creation flow
- [ ] **1.10** Manually verify existing purchase contracts can be viewed

---

## Phase 2: Building Stats & Apartment Filters (Priority: MEDIUM)

### Backend - Building Stats API

- [x] **2.1** Add `getStats` method to `BuildingsService`
  - Query apartment counts grouped by status
  - Calculate occupancy rate percentage
  - Return `{ totalApartments, occupied, vacant, maintenance, reserved, occupancyRate }`

- [x] **2.2** Add `GET /buildings/:id/stats` endpoint to `BuildingsController`
  - Add Swagger documentation
  - Add response DTO

### Backend - Advanced Apartment Filters

- [x] **2.3** Extend `ApartmentFilters` interface in `ApartmentsService`
  - Add `status[]`, `unitType[]`, `minBedrooms`, `maxBedrooms`
  - Add `minFloor`, `maxFloor`, `minArea`, `maxArea`
  - Add `search` for unit number/code text search

- [x] **2.4** Update `findAll` method query building
  - Support array filters with Prisma `in` clause
  - Support range filters with `gte`/`lte`
  - Support text search with `contains` and `mode: 'insensitive'`

- [x] **2.5** Update `GET /apartments` endpoint to accept new query parameters
  - Add validation for filter parameters

### Frontend - Building Stats Hook

- [x] **2.6** Add `useBuildingStats` hook to `apps/web/src/hooks/use-buildings.ts`
  - Return typed stats object
  - Cache for 5 minutes

### Frontend - Smart Filters Component

- [x] **2.7** Create `ApartmentFilters` component at `apps/web/src/app/(dashboard)/apartments/apartment-filters.tsx`
  - Building selector dropdown
  - Status multi-select
  - Unit type multi-select
  - Floor range slider
  - Bedroom count selector
  - Clear filters button

- [x] **2.8** Install and configure `nuqs` for URL state management
  - Define filter parsers
  - Sync filters with URL query string

- [x] **2.9** Update `apps/web/src/app/(dashboard)/apartments/page.tsx`
  - Integrate filter component
  - Pass filters to `useApartments` hook
  - Show active filter count badge

- [x] **2.10** Update `useApartments` hook to accept extended filters

---

## Phase 3: 3D Viewer Status Colors (Priority: MEDIUM)

### Frontend - 3D Data Integration

- [x] **3.1** Add `apartmentStatuses` prop to `Building3DProps` interface
  - Type: `Array<{ apartmentId: string; status: ApartmentStatus }>`

- [x] **3.2** Create status color mapping constant
  - vacant: `#22c55e` (green)
  - occupied: `#3b82f6` (blue)
  - maintenance: `#f59e0b` (amber)
  - reserved: `#8b5cf6` (violet)

- [x] **3.3** Update `FloorMesh` material to use status-based colors
  - Look up apartment ID in statuses array
  - Apply corresponding color to mesh material
  - Default to gray for unknown/unmapped apartments

- [x] **3.4** Create `Building3DLegend` component
  - Show color swatches with status labels
  - Position in bottom-left or as overlay

- [x] **3.5** Update building detail page to pass apartment statuses
  - Fetch apartments for building
  - Transform to `{ apartmentId, status }` array
  - Pass to `Building3D` component

### AI Assistant Integration (Optional)

- [ ] **3.6** Add building stats lookup function to AI assistant
  - Register function in RAG pipeline
  - Query `/buildings/:id/stats` for occupancy questions
  - Format response for natural language

---

## Phase 4: SVG Builder Interior Fields (Priority: LOW)

### Type Updates

- [x] **4.1** Add new fields to `SvgElement` interface
  - `bedroomCount?: number`
  - `bathroomCount?: number`
  - `livingRoomCount?: number`

### Properties Panel

- [x] **4.2** Update `InteriorDetails` component in `properties-panel.tsx`
  - Add bedroom count input (number, 0-10)
  - Add bathroom count input (number, 0-10)
  - Add living room count input (number, 0-4)
  - Group bedroom/bathroom in 2-column grid

### SVG Export

- [x] **4.3** Update SVG export function to include new data attributes
  - `data-bedrooms="N"`
  - `data-bathrooms="N"`
  - `data-living-rooms="N"`

### SVG Import

- [x] **4.4** Update SVG import function to parse new data attributes
  - Read `data-bedrooms`, `data-bathrooms`, `data-living-rooms`
  - Set corresponding element properties

---

## Phase 5: Utility Meter Validation (Priority: LOW)

### Backend

- [x] **5.1** Add `getMeters` method to `BuildingsService`
  - Query apartments with non-null meter IDs
  - Return grouped by meter type

- [x] **5.2** Add `GET /buildings/:id/meters` endpoint
  - Return `{ electricMeters, waterMeters, gasMeters }` arrays
  - Include apartment ID and unit number for each meter

### Frontend

- [x] **5.3** Add `useBuildingMeters` hook
  - Fetch meters for selected building
  - Cache for 5 minutes

- [x] **5.4** Add meter ID validation in apartment form
  - Check if entered ID exists in other apartments
  - Show warning message if duplicate detected
  - Still allow save (soft validation)

- [ ] **5.5** (Optional) Add meter ID auto-suggest
  - Show dropdown of available meter IDs when typing
  - Filter to unused meters only

---

## Validation & Testing

- [ ] **6.1** Run `openspec validate enhance-apartment-platform-features --strict`
- [ ] **6.2** Manual testing checklist:
  - [ ] Create purchase contract and verify database fields
  - [ ] Generate purchase milestones
  - [ ] View building stats via API
  - [ ] Filter apartments by status, building, unit type
  - [ ] View 3D building with status colors
  - [ ] Edit apartment in SVG builder with bedroom/bathroom counts
  - [ ] Validate meter ID uniqueness warning appears

---

## Dependencies

| Task | Depends On |
|------|------------|
| 1.6 | 1.4, 1.5 |
| 2.9 | 2.7, 2.8 |
| 3.5 | 3.1, 3.2, 3.3, 3.4, 2.6 |
| 4.3 | 4.1 |
| 5.4 | 5.3 |

## Parallelization

These task groups can be done in parallel:

- **Backend changes**: 1.4-1.5, 2.1-2.5, 5.1-5.2
- **Frontend hooks**: 2.6, 2.10, 5.3
- **UI components**: 2.7, 3.4, 4.2

---

## Files Changed

### Backend

| File | Tasks |
|------|-------|
| `apartments/payment-schedule.service.ts` | 1.4 |
| `apartments/payment-schedule.controller.ts` | 1.5 |
| `apartments/buildings.service.ts` | 2.1, 5.1 |
| `apartments/buildings.controller.ts` | 2.2, 5.2 |
| `apartments/apartments.service.ts` | 2.3, 2.4 |
| `apartments/apartments.controller.ts` | 2.5 |

### Frontend

| File | Tasks |
|------|-------|
| `hooks/use-contracts.ts` | 1.1, 1.3 |
| `hooks/use-buildings.ts` | 2.6, 5.3 |
| `hooks/use-apartments.ts` | 2.10 |
| `hooks/use-payments.ts` | 1.6 |
| `contracts/contract-form-dialog.tsx` | 1.2 |
| `payments/PaymentScheduleTable.tsx` | 1.6, 1.7 |
| `apartments/page.tsx` | 2.9 |
| `apartments/apartment-filters.tsx` | 2.7 (new) |
| `3d/building-3d.tsx` | 3.1, 3.2, 3.3 |
| `3d/building-3d-legend.tsx` | 3.4 (new) |
| `svg-builder/svg-builder.types.ts` | 4.1 |
| `svg-builder/components/properties-panel.tsx` | 4.2 |
| `svg-builder/svg-parser.ts` | 4.3, 4.4 |
| `apartments/apartment-form-dialog.tsx` | 5.4 |

---

*Last Updated: April 3, 2026*
