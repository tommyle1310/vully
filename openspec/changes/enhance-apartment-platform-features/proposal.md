# Proposal: Enhance Apartment Platform Features

## Summary

This proposal addresses multiple issues and missing features identified during the platform review:

1. **Purchase Contract Bug Fix** - Frontend doesn't send purchase contract fields to API, only stores them in `termsNotes` text blob
2. **Building Occupancy & 3D Visualization** - Add building stats, apartment status colors in 3D viewer
3. **Smart Filters for Apartments** - Advanced filtering options on apartments page
4. **SVG Builder Interior Details** - Add bedroom/bathroom/living room count fields
5. **Utility Meter Integration** - Proper meter registry and validation

## Problem Statement

### Issue #1: Purchase Contract Data Loss (BUG)

When creating a purchase contract, the frontend form collects:
- `contractType: 'purchase'`
- `purchasePrice: 4,000,000,000 VND`
- `downPayment: 1,000,000,000 VND`
- `transferDate: 2026-05-03`

However, the `CreateContractInput` interface in `use-contracts.ts` doesn't include these fields. The form only sends them to `buildTermsNotes()` which serializes them as human-readable text in `termsNotes`.

**Evidence:**
```json
{
  "contract_type": "rental",      // WRONG - should be "purchase"
  "purchase_price": null,         // WRONG - should be 4,000,000,000
  "down_payment": null,           // WRONG - should be 1,000,000,000
  "transfer_date": null,          // WRONG - should be 2026-05-03
  "terms_notes": "[Contract Type: Purchase]\nPurchase Price: 4.000.000.000 VND\nDown Payment: 1.000.000.000 VND\nTransfer Date: 2026-05-03"
}
```

The backend DTO (`CreateContractDto`) and service already support these fields, but the frontend doesn't send them.

Additionally, `PaymentScheduleTable` disables auto-generation for non-rental contracts, but there's no purchase milestone generation implemented yet.

### Issue #2: Building Occupancy & 3D Visualization

**Missing features:**
- No API to get per-building occupancy statistics (occupied/vacant/maintenance counts)
- 3D building viewer renders all apartments in the same gray color regardless of status
- AI assistant cannot answer "How many apartments are occupied in Building X?"

### Issue #3: Apartments Page Filters

Current filters are minimal:
- Only global text search
- No dropdown filters for status, building, unit type, floor range

Users cannot easily find "all vacant 2-bedroom apartments on floors 5-10".

### Issue #4: SVG Builder Interior Details

The properties panel has `logiaCount`, `multipurposeRooms`, `kitchenType`, but is **missing**:
- `bedroomCount` - critical for apartment unit type
- `bathroomCount` - required field in apartment schema
- Living room count (optional)

These fields exist in the apartment database schema but cannot be set in the SVG builder.

### Issue #5: Utility Meter Integration

The apartment form has meter ID fields (`electricMeterId`, `waterMeterId`, `gasMeterId`) as plain text inputs with no:
- Validation that meter IDs are unique per building
- Meter registry to look up available/unassigned meters
- Auto-suggest functionality

## Proposed Solution

### 1. Fix Purchase Contract Data Flow

**Frontend changes:**
- Update `CreateContractInput` interface to include all contract type fields
- Modify form `onSubmit` to send actual field values, not just termsNotes
- Add purchase milestone generation button (similar to rental auto-generate)

**Backend changes:**
- Add `generatePurchaseMilestones` endpoint for purchase contracts
- Create default milestones: Down Payment → Progress Payments → Final Payment → Transfer

### 2. Building Occupancy Stats & 3D Colors

**Backend:**
- Add `GET /buildings/:id/stats` endpoint returning `{ total, occupied, vacant, maintenance, reserved }`
- Add `GET /apartments?buildingId=X&includeStatus=true` for batch status lookup

**Frontend - 3D Viewer:**
- Color-code apartments by status:
  - Vacant: `#22c55e` (green)
  - Occupied: `#3b82f6` (blue)
  - Maintenance: `#f59e0b` (amber)
  - Reserved: `#8b5cf6` (purple)

**AI Assistant:**
- Add building stats retrieval function for RAG queries

### 3. Smart Apartment Filters

Add filter bar with:
- Building selector (dropdown)
- Status filter (multi-select: vacant, occupied, maintenance, reserved)
- Unit type filter (studio, 1BR, 2BR, 3BR+)
- Bedroom count range
- Floor range slider
- Area range slider

Use `nuqs` for URL state management.

### 4. SVG Builder Interior Fields

Add to `SvgElement` type and properties panel:
- `bedroomCount: number`
- `bathroomCount: number`  
- `livingRoomCount: number` (optional)

Update SVG export to include these as data attributes.

### 5. Utility Meter Registry (Simplified)

**Backend:**
- Add `GET /buildings/:id/meters` to list all meter IDs in a building
- Add unique constraint validation on meter IDs per building

**Frontend:**
- Show warning if meter ID is already used in the building
- Auto-suggest available meter IDs when typing

## Impact Assessment

| Area | Impact | Risk |
|------|--------|------|
| Contracts | HIGH - Bug fix critical for purchase contracts | LOW |
| Buildings | MEDIUM - New stats endpoint | LOW |
| 3D Viewer | MEDIUM - Visual enhancement | LOW |
| Apartments | MEDIUM - UX improvement | LOW |
| SVG Builder | LOW - Additional fields | LOW |
| Utility Meters | LOW - Validation only | LOW |

## Out of Scope

- Full meter management CRUD (assigned to future Accounting module)
- Payment gateway integration for purchase contracts
- Lease-to-own specific payment scheduling
- Technical team module (no current impact)

## Dependencies

- Existing apartment and contract schemas
- 3D viewer Three.js integration
- AI assistant RAG pipeline

## Success Criteria

1. Purchase contracts correctly save `contract_type: 'purchase'` and related fields to database
2. Admin can generate purchase payment milestones
3. 3D viewer shows apartments colored by status
4. `/buildings/:id/stats` returns accurate occupancy counts
5. Apartments page has working filters for status, building, unit type
6. SVG builder can set bedroom/bathroom counts
7. Meter ID validation prevents duplicates per building

## Timeline Estimate

- Phase 1 (Bug Fix): 1 day - Contract data flow fix
- Phase 2 (Filters & Stats): 2 days - Building stats, apartment filters
- Phase 3 (3D & SVG): 2 days - 3D colors, SVG builder fields
- Phase 4 (Meters): 1 day - Meter validation

**Total: ~6 days**

---

*Proposal created: April 3, 2026*
