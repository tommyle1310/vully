# Change: Enhance Building Policies and Apartment Asset Management

## Why

The apartment form dialog has many placeholder fields marked "From building policy" that reference non-existent building-level configuration. Users cannot effectively manage:

1. **Building-level policies** — Max residents, access card limits, pet rules, billing cycles are disabled in apartment form with no way to configure them at building level
2. **Parking assets** — Car/moto slots are plain text inputs with no inventory management, validation, or assignment workflows  
3. **Technical configurations** — Power capacity, AC units, fire detectors, sprinklers shown with poor UX and no bulk management
4. **Billing settings** — Billing cycle, late fee waiver, virtual bank accounts are disabled/non-functional
5. **Trash collection** — Missing entirely; Vietnamese apartments require trash schedule and fee management

## What Changes

### Capability 1: Building Policies System
- **NEW** `BuildingPolicy` table with versioned policy records per building
- Building detail page gets new "Policies" tab to configure:
  - Default max residents (based on area formula or fixed)
  - Access card limit per unit type
  - Pet policy (allowed/forbidden + max count)
  - Default billing cycle
  - Trash collection schedule
- Apartment form inherits these values (read-only) unless explicitly overridden

### Capability 2: Parking Slot Management
- **NEW** `ParkingSlot` model tracking all car/moto slots per building
- **NEW** Building parking management page (`/buildings/[id]/parking`)
  - Slot inventory CRUD (add zones, define capacity)
  - Assignment/unassignment to apartments
  - Monthly fee configuration per slot type
- Apartment form shows assigned slots with reassignment workflow
- **Billing integration** — Parking fees auto-added to monthly invoices

### Capability 3: Apartment Form UX Improvements
- **Occupancy tab**: 
  - Show inherited building policy values with override toggle
  - Ownership/VAT/handover fields become properly editable
- **Utility tab**:
  - Better field descriptions (power capacity → "Circuit breaker rating in Amperes")
  - Group by purpose: Safety Equipment vs Infrastructure
- **Billing tab**:
  - Virtual bank account generation (if building has bank integration)
  - Late fee waiver with audit logging

### Capability 4: Trash Collection Management
- **NEW** Fields on `BuildingPolicy`: `trashCollectionDays`, `trashCollectionTime`, `trashFeePerMonth`
- **NEW** Building page shows trash schedule
- **Billing integration** — Monthly trash fee auto-added to invoices (configurable)

## Impact

- **Affected models**: `Building`, `Apartment` (inheritance logic), `Invoice` (new line item types)
- **New models**: `BuildingPolicy`, `ParkingSlot`, `ParkingZone`
- **Affected pages**: Building detail, Apartment form dialog, Invoices
- **New pages**: Parking management (`/buildings/[id]/parking`)
- **API changes**: 
  - `GET/POST /buildings/:id/policies`
  - `GET/POST/PATCH/DELETE /buildings/:id/parking/slots`
  - `POST /apartments/:id/assign-parking`
- **BREAKING**: None (additive changes only)

## Out of Scope

- Parking reservations/booking system
- Visitor parking management
- IoT meter auto-sync (future phase)
- Multi-tenant (organization-level) policies
