# Tasks: Enhance Building Policies and Apartment Asset Management

## Phase 1: Database Schema & Backend Core (16 tasks)

### 1.1 Database Schema
- [ ] 1.1.1 Create `ParkingType` enum (`car`, `motorcycle`, `bicycle`)
- [ ] 1.1.2 Create `ParkingSlotStatus` enum (`available`, `assigned`, `reserved`, `maintenance`)
- [ ] 1.1.3 Create `building_policies` table with all policy fields + versioning
- [ ] 1.1.4 Create `parking_zones` table with building relation
- [ ] 1.1.5 Create `parking_slots` table with zone relation and apartment assignment
- [ ] 1.1.6 Add override fields to `apartments` (`max_residents_override`, `access_card_limit_override`, etc.)
- [ ] 1.1.7 Run `prisma migrate dev` and verify schema
- [ ] 1.1.8 Add indexes for query performance (`building_id`, `assigned_apt_id`, `status`)

### 1.2 NestJS Module: Building Policies
- [ ] 1.2.1 Create `BuildingPoliciesService` with CRUD operations
- [ ] 1.2.2 Implement `getCurrentPolicy(buildingId)` — finds policy where `effective_to IS NULL`
- [ ] 1.2.3 Implement `createPolicy()` — closes current policy's `effective_to`, creates new
- [ ] 1.2.4 Create DTOs: `CreateBuildingPolicyDto`, `BuildingPolicyResponseDto`
- [ ] 1.2.5 Create `BuildingPoliciesController` with Swagger decorators
- [ ] 1.2.6 Add endpoints: `GET /buildings/:id/policies`, `GET .../current`, `POST`
- [ ] 1.2.7 Unit tests for policy versioning logic (>80% coverage)

### 1.3 NestJS Module: Parking Management  
- [ ] 1.3.1 Create `ParkingModule` under `apps/api/src/modules/apartments/`
- [ ] 1.3.2 Create `ParkingService` with zone and slot CRUD
- [ ] 1.3.3 Implement `assignSlot(slotId, apartmentId)` with validation (no double-assign)
- [ ] 1.3.4 Implement `unassignSlot(slotId)` with audit logging
- [ ] 1.3.5 Implement `bulkCreateSlots(zoneId, count)` with auto-numbering
- [ ] 1.3.6 Create DTOs: `CreateParkingZoneDto`, `CreateParkingSlotsDto`, `AssignSlotDto`
- [ ] 1.3.7 Create `ParkingController` with endpoints per design.md
- [ ] 1.3.8 Unit tests for assignment/unassignment logic

---

## Phase 2: Policy Inheritance & Billing (10 tasks)

### 2.1 Apartment Service Updates
- [ ] 2.1.1 Create `getEffectiveApartmentConfig(apartmentId)` method
- [ ] 2.1.2 Return computed values with source indicator (`building` vs `apartment`)
- [ ] 2.1.3 Update `ApartmentResponseDto` to include effective values
- [ ] 2.1.4 Add endpoint: `GET /apartments/:id/effective-config`
- [ ] 2.1.5 Update `apartments.service.ts` to support override field updates

### 2.2 Billing Integration
- [ ] 2.2.1 Update `BillingProcessor` to fetch parking slots for apartment
- [ ] 2.2.2 Add parking fee line items to invoice generation
- [ ] 2.2.3 Fetch trash fee from building policy, add to invoice
- [ ] 2.2.4 Add `InvoiceLineItemCategory` enum values: `parking`, `trash`
- [ ] 2.2.5 Unit tests for invoice generation with parking + trash fees

---

## Phase 3: Frontend — Building Policies Tab (8 tasks)

### 3.1 Hooks & API Client
- [ ] 3.1.1 Add API methods to `lib/api.ts`: `getBuildingPolicies()`, `getCurrentPolicy()`, `createPolicy()`
- [ ] 3.1.2 Create `hooks/use-building-policies.ts` with TanStack Query hooks

### 3.2 Building Policies Tab
- [ ] 3.2.1 Create `components/buildings/building-policies-tab.tsx`
- [ ] 3.2.2 Implement policy form with all fields (occupancy, billing, trash)
- [ ] 3.2.3 Add policy history viewer (accordion list of past versions)
- [ ] 3.2.4 Add "Create New Policy" button with effective date picker
- [ ] 3.2.5 Toast notifications for save success/error
- [ ] 3.2.6 Add tab to building detail page (`/buildings/[id]`)

---

## Phase 4: Frontend — Parking Management (12 tasks)

### 4.1 Hooks & API Client
- [ ] 4.1.1 Add parking API methods: `getZones()`, `createZone()`, `getSlots()`, `assignSlot()`, etc.
- [ ] 4.1.2 Create `hooks/use-parking.ts` with TanStack Query hooks

### 4.2 Parking Management Page
- [ ] 4.2.1 Create `components/buildings/building-parking-tab.tsx`
- [ ] 4.2.2 Create `components/buildings/parking-zone-card.tsx` — zone info + stats
- [ ] 4.2.3 Create `components/buildings/parking-slot-grid.tsx` — visual slot grid
- [ ] 4.2.4 Implement slot status color coding (green=available, blue=assigned, etc.)
- [ ] 4.2.5 Add zone creation form (name, code, type, total slots, fee)
- [ ] 4.2.6 Add bulk slot creation dialog (input count, auto-number)
- [ ] 4.2.7 Add slot assignment popover (search apartments, assign)
- [ ] 4.2.8 Add slot unassignment with confirmation dialog
- [ ] 4.2.9 Skeleton loaders for parking tab

### 4.3 Apartment Integration
- [x] 4.3.1 Create `components/apartments/parking-assignment-dialog.tsx`
- [x] 4.3.2 Update apartment form dialog to show assigned parking slots
- [x] 4.3.3 Add "Manage Parking" button in apartment detail panel

---

## Phase 5: Apartment Form UX Improvements (10 tasks)

### 5.1 Policy Inheritance UI
- [x] 5.1.1 Fetch effective config when editing apartment
- [x] 5.1.2 Show inherited value + source badge ("From Building Policy")
- [x] 5.1.3 Add toggle: "Override building policy" per field
- [x] 5.1.4 When toggle ON, enable input and save to override field
- [x] 5.1.5 When toggle OFF, clear override field (revert to inherit)

### 5.2 Occupancy Tab Enhancements
- [x] 5.2.1 Enable ownership type, VAT rate, handover/warranty date fields
- [x] 5.2.2 Add policy inheritance UI for max residents, access cards, pets
- [x] 5.2.3 Remove hardcoded "disabled" from intercom code (auto-assign logic server-side)

### 5.3 Utility Tab UX
- [x] 5.3.1 Improve labels: "Power Capacity" → "Circuit Breaker Rating (Amps)"
- [x] 5.3.2 Add tooltips explaining technical fields (AC units, fire detectors, etc.)
- [x] 5.3.3 Group fields: "Safety Equipment" section, "Infrastructure" section

### 5.4 Billing Tab Enhancements
- [x] 5.4.1 Show effective billing cycle (inherited vs override)
- [ ] 5.4.2 Add "Generate Virtual Bank Account" button (if building supports)
- [x] 5.4.3 Add late fee waiver toggle with confirmation dialog

---

## Phase 6: Testing & Documentation (6 tasks)

### 6.1 Backend Tests
- [ ] 6.1.1 E2E test: Create policy → Verify apartment inherits values
- [ ] 6.1.2 E2E test: Assign parking → Generate invoice → Verify parking line item
- [ ] 6.1.3 Integration test: Policy versioning (old invoices use historical policy)

### 6.2 Frontend Tests
- [ ] 6.2.1 Component test: BuildingPoliciesTab form submission
- [ ] 6.2.2 Component test: ParkingSlotGrid status rendering

### 6.3 Documentation
- [ ] 6.3.1 Update Swagger with all new endpoints
- [ ] 6.3.2 Add inline JSDoc comments for complex functions

---

## Phase 7: Migration & Rollout (4 tasks)

- [ ] 7.1 Write migration script to seed default policies for existing buildings
- [ ] 7.2 Write migration script to convert text parking fields to slot relations (optional)
- [ ] 7.3 Test migration on staging database
- [ ] 7.4 Deploy and verify production

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1 | 16 | Schema, Policies API, Parking API |
| 2 | 10 | Policy inheritance, Billing integration |
| 3 | 8 | Building Policies Tab UI |
| 4 | 12 | Parking Management UI |
| 5 | 10 | Apartment Form UX improvements |
| 6 | 6 | Tests and docs |
| 7 | 4 | Migration scripts |
| **Total** | **66** | |

## Dependencies

```
Phase 1 → Phase 2 → Phase 3
              ↓
          Phase 4
              ↓
          Phase 5
              ↓
          Phase 6 → Phase 7
```

Phase 3 and 4 can be parallelized after Phase 2 completes.
