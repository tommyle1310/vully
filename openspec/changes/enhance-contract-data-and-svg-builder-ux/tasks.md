# Tasks: Enhance Contract Data and SVG Builder UX

## Backend

- [ ] **T1** – Add `citizen_id` (`String?`) and `number_of_residents` (`Int?`) to `contracts` model in `schema.prisma`
- [ ] **T2** – Create Prisma migration for the two new contract columns
- [ ] **T3** – Add `citizenId` and `numberOfResidents` optional fields to `CreateContractDto` and `ContractResponseDto`
- [ ] **T4** – In `ContractsService.create` transaction: update `apartments.current_resident_count = dto.numberOfResidents ?? 0` and `apartments.is_rented = true` alongside status update

## Frontend – Contracts

- [ ] **T5** – Extend `CreateContractInput` in `use-contracts.ts` with `citizenId?` and `numberOfResidents?`
- [ ] **T6** – Add `citizenId` and `numberOfResidents` fields to `contractFormSchema` Zod schema
- [ ] **T7** – Add two form inputs in `contract-form-dialog.tsx` (Parties section): "Citizen ID" text input and "Number of Residents" number input

## Frontend – Apartment Detail

- [ ] **T8** – Fetch active contract in `apartment-detail-sheet.tsx` using a `useQuery` for `/contracts?apartmentId=:id&status=active` 
- [ ] **T9** – Add "Active Contract" collapsible section to the detail sheet showing: contract type (from termsNotes prefix), rent/purchase amount, deposit, number of residents, citizen ID, start/end dates

## Backend – SVG Safe-Sync

- [ ] **T10** – In `buildings.service.ts` `syncApartmentsFromSvg`, change the `update` block to only touch: `floor_index`, `svg_element_id`, `features`, `updated_at`; remove any write to `bedroom_count`, `bathroom_count`, `gross_area`, `status`

## Frontend – SVG Interior Properties

- [ ] **T11** – Add to `SvgElement` type: `logiaCount?: number; multipurposeRooms?: number; kitchenType?: 'open' | 'closed'; viewDescription?: string`
- [ ] **T12** – Add "Interior Details" subsection to `PropertiesPanel` visible only when `element.apartmentId` is set, with inputs for the four new fields
- [ ] **T13** – Update `svg-parser.ts` to read/write the four fields as data attributes on SVG elements: `data-logia-count`, `data-mprooms`, `data-kitchen-type`, `data-view-desc`

## Frontend – Multi-Select + Marquee

- [ ] **T14** – Add to `SvgBuilder/index.tsx` state: `selectedIds: string[]`; keep `selectedElementId = selectedIds[0] ?? null` as derived; replace all direct `selectedElementId` set calls with helper `setSelection(ids: string[])`
- [ ] **T15** – Add `MarqueeRect` type and `marquee: MarqueeRect | null` state; on canvas mousedown in select-mode when NOT clicking an element, start marquee; on mousemove update; on mouseup finalize selection (all elements whose bbox intersects marquee)
- [ ] **T16** – Shift+click on an element adds/removes it from `selectedIds` without clearing others
- [ ] **T17** – Modify `useSvgDrag.updateDrag` to accept a `selectedIds: string[]` parameter; translate all matching elements by the same delta
- [ ] **T18** – Wire multi-element drag: `handleElementMouseDown` stores all `selectedIds`; `handleMouseMove` applies delta to all; `handleMouseUp` commits via `setElements`
- [ ] **T19** – Modify `deleteElement` and `duplicateElement` to operate on all `selectedIds`
- [ ] **T20** – Render marquee rect in `SvgCanvas` (dashed blue rect while dragging)
- [ ] **T21** – Render multi-selection highlight on all elements in `selectedIds` in `SvgCanvas` / `ElementRenderer`

## Frontend – Auto-center + Drag-drop

- [ ] **T22** – Add `containerRef` to `SvgCanvas` wrapper div; export a `scrollToElement(el: SvgElement)` callback; call it from `addApartmentTemplate`/`addUtilityTemplate` when `elements.length === 0` before adding
- [ ] **T23** – Add `draggable` and `onDragStart` (sets `dragData = JSON.stringify(template)`) to each template button in `TemplatesPanel`
- [ ] **T24** – Add `onDragOver` (preventDefault) and `onDrop` handler to `SvgCanvas` wrapper div; on drop: get SVG coordinates of drop position, call appropriate `addApartmentTemplate` or `addUtilityTemplate` with `x, y` override

## Validation

- [ ] **T25** – Verify in DB: contracting an apartment sets `current_resident_count` and `is_rented`
- [ ] **T26** – Verify: saving SVG on a building with manually-edited apartments does not change bedroom/bathroom counts
- [ ] **T27** – Manual test: marquee select 3 apartments, drag them together
- [ ] **T28** – Manual test: drag Studio template from sidebar, drop on canvas, element appears at drop location
