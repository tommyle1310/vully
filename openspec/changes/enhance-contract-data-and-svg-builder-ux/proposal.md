# Change: Enhance Contract Data Model and SVG Builder UX

## Why

Six concrete gaps identified across the Contracts and SVG Builder features:

1. **Missing citizen ID and resident count on contracts** — operators cannot record the buyer/renter's national ID or how many people will live in the unit, which is mandatory for Vietnamese legal forms.
2. **Apartment detail view shows stale/wrong data** — `currentResidentCount` shows 0 after a contract is created because the contracts service never updates the apartment row; renting/billing labels are shown even for purchase-type contracts.
3. **SVG Builder save overwrites manual apartment data** — `syncApartmentsFromSvg` upsert `update` block overwrites `bedroom_count`, `bathroom_count`, and other fields that admins may have set manually in the Apartment form; a minor SVG edit (e.g., add utility room) should not destroy curated data.
4. **SVG Builder lacks Vietnamese apartment interior fields** — properties panel has no place to enter logia count (separate from balcony), multi-purpose / +1 rooms, kitchen type (open/closed), or balcony-view description — all common in VN apartment listings.
5. **SVG Builder only supports single-element selection** — admins cannot drag-select multiple apartments and move them together; marquee (rubber-band) selection is absent.
6. **SVG Builder starts with camera at top-left, drag-drop from sidebar absent** — new/empty canvases make the user scroll to the middle to find added elements; sidebar templates require clicking rather than dragging onto the canvas.

## What Changes

### 1 – Contract: citizen ID + resident count
- **ADDED** `citizenId` (national ID string, optional) to `contracts` Prisma model, CreateContractDto, frontend schema, and form
- **ADDED** `numberOfResidents` (integer, optional) to same

### 2 – Apartment detail: active-contract sync
- **MODIFIED** `ContractsService.create` — after creating a contract, update the apartment's `current_resident_count` and `is_rented` inside the same transaction
- **ADDED** Apartment detail sheet now includes an "Active Contract" section showing contract type/rent/deposit/residents from the API response (fetches `/apartments/:id/active-contract` or reuses contract list)

### 3 – SVG safe-sync
- **MODIFIED** `syncApartmentsFromSvg` `update` block — only updates `floor_index`, `svg_element_id`, and `features` (name/type metadata); removes any overwrite of `bedroom_count`, `bathroom_count`, `gross_area`, `net_area`, `status`
- No deletions (already safe, now documented)

### 4 – SVG interior properties  
- **ADDED** `SvgElement` fields: `logiaCount`, `multipurposeRooms`, `kitchenType`, `viewDescription`
- **ADDED** "Interior Details" section in `PropertiesPanel` (only visible when element is an apartment)
- **MODIFIED** `svg-parser.ts` to serialize/deserialize these four fields in SVG metadata

### 5 – Multi-select + marquee
- **ADDED** `selectedElementIds: string[]` state (multi-select)
- **ADDED** Marquee rectangle selection on canvas drag in select mode
- **MODIFIED** Drag logic — moving a selected element moves all selected elements together
- **MODIFIED** Delete/duplicate operations work on all selected elements
- **MODIFIED** `SvgCanvas` renders marquee rect and multi-selection highlights

### 6 – Auto-center + drag-drop
- **ADDED** Canvas container `ref` — when an element is added to an empty canvas, the container auto-scrolls to center on it; also auto-scrolls to any clicked element
- **ADDED** `draggable` + `onDragStart` on sidebar template buttons; `onDrop` + `onDragOver` on SVG canvas for drag-and-drop element creation

## Impact

### Affected Specs
- None currently in `openspec/specs/` (specs dir is empty)

### Affected Code

**Backend:**
- `apps/api/prisma/schema.prisma` — add `citizen_id`, `number_of_residents` to `contracts`
- `apps/api/src/modules/apartments/dto/contract.dto.ts` — new optional fields
- `apps/api/src/modules/apartments/contracts.service.ts` — update apartment inside transaction

**Frontend:**
- `apps/web/src/hooks/use-contracts.ts` — extend `CreateContractInput`
- `apps/web/src/app/(dashboard)/contracts/contract-form-dialog.tsx` — two new form fields
- `apps/web/src/app/(dashboard)/apartments/apartment-detail-sheet.tsx` — active-contract section
- `apps/web/src/components/maps/svg-builder/svg-builder.types.ts` — new fields, marquee type
- `apps/web/src/components/maps/svg-builder/index.tsx` — multi-select, marquee, auto-center, drag-drop
- `apps/web/src/components/maps/svg-builder/components/svg-canvas.tsx` — marquee rect, drag target, multi-select highlight
- `apps/web/src/components/maps/svg-builder/components/properties-panel.tsx` — interior details section
- `apps/web/src/components/maps/svg-builder/components/sidebar-panels.tsx` — draggable templates
- `apps/web/src/components/maps/svg-builder/hooks/use-svg-drag.ts` — multi-element delta drag
- `apps/web/src/components/maps/svg-builder/svg-parser.ts` — new metadata fields
- `apps/api/src/modules/apartments/buildings.service.ts` — safe-sync fix

### Definition of Done
- [ ] `citizen_id` and `number_of_residents` saved to DB and visible in contract form
- [ ] Creating a contract updates apartment.current_resident_count and apartment.is_rented
- [ ] Apartment detail sheet shows active-contract residents and correct billing label
- [ ] Saving SVG after minor edit does NOT change bedroom/bathroom count of apartments
- [ ] Interior details (logia, +1 room, kitchen type, view) editable in properties panel and persisted to SVG
- [ ] Marquee drag on empty canvas selects all intersecting elements
- [ ] Moving one of the selected elements moves all together
- [ ] Adding first element to empty canvas auto-scrolls so element is visible in center
- [ ] Templates can be dragged from sidebar and dropped onto canvas

## Non-Goals
- Offline / autosave drafts for SVG builder
- Free-form polygon path drawing tool
- Real-time collaborative editing
- Database-level contract type enum (deferred; termsNotes already captures type)
