# Tasks: Add Access Card Management

## Phase 1: Database Schema

### 1.1 Prisma Schema Updates
- [x] 1.1.1 Add `AccessCardType` enum (`building`, `parking`)
- [x] 1.1.2 Add `AccessCardStatus` enum (`active`, `lost`, `deactivated`, `expired`)
- [x] 1.1.3 Create `access_cards` model with all fields (see design.md)
- [x] 1.1.4 Add `access_card_id` optional field to `parking_slots` model
- [x] 1.1.5 Add relation from `parking_slots` to `access_cards`
- [x] 1.1.6 Add relations from `access_cards` to `apartments`, `users` (holder, deactivator)
- [x] 1.1.7 Add indexes on `apartment_id`, `status`, `card_type`

### 1.2 Migration
- [ ] 1.2.1 Generate migration: `npx prisma migrate dev --name add_access_cards`
- [ ] 1.2.2 Verify migration runs cleanly on dev database
- [ ] 1.2.3 Update Prisma client types

## Phase 2: Backend API

### 2.1 Module Scaffold
- [x] 2.1.1 Create `AccessCardsModule` in `apps/api/src/modules/apartments/`
- [x] 2.1.2 Create `access-cards.controller.ts` with Swagger decorators
- [x] 2.1.3 Create `access-cards.service.ts` for business logic
- [x] 2.1.4 Create `dto/access-card.dto.ts` with validation decorators
- [x] 2.1.5 Register module in `ApartmentsModule`

### 2.2 DTOs
- [x] 2.2.1 `CreateAccessCardDto` — cardNumber, apartmentId, cardType, accessZones, floorAccess, holderId, expiresAt, notes
- [x] 2.2.2 `UpdateAccessCardDto` — accessZones, floorAccess, expiresAt, notes (partial)
- [x] 2.2.3 `DeactivateAccessCardDto` — reason (enum), notes
- [x] 2.2.4 `AccessCardResponseDto` — full card data with relations
- [x] 2.2.5 `AccessCardListResponseDto` — paginated list

### 2.3 Service Methods
- [x] 2.3.1 `findAllByApartment(apartmentId, filters)` — list cards with pagination
- [x] 2.3.2 `findOne(id)` — get card by ID with relations
- [x] 2.3.3 `create(dto, userId)` — issue new card (validate limit, audit log)
- [x] 2.3.4 `update(id, dto)` — update zones/floor access
- [x] 2.3.5 `deactivate(id, dto, userId)` — set status, record reason, audit log
- [x] 2.3.6 `reactivate(id, userId)` — restore active status, audit log
- [x] 2.3.7 `validateCardLimit(apartmentId)` — enforce building policy limit

### 2.4 Controller Endpoints
- [x] 2.4.1 `GET /apartments/:id/access-cards` — list cards (admin, technician, owner)
- [x] 2.4.2 `POST /access-cards` — issue card (admin only)
- [x] 2.4.3 `GET /access-cards/:id` — get card details (admin, technician)
- [x] 2.4.4 `PATCH /access-cards/:id` — update card (admin only)
- [x] 2.4.5 `POST /access-cards/:id/deactivate` — deactivate (admin, technician)
- [x] 2.4.6 `POST /access-cards/:id/reactivate` — reactivate (admin only)

### 2.5 Parking Integration
- [x] 2.5.1 Update `ParkingService.assignSlot()` to optionally issue parking card
- [x] 2.5.2 Update `ParkingService.unassignSlot()` to deactivate linked card
- [x] 2.5.3 Add `linkParkingCard(slotId, cardId)` helper method

## Phase 3: Shared Types

### 3.1 Type Definitions
- [x] 3.1.1 Add `AccessCardType` enum to `@vully/shared-types`
- [x] 3.1.2 Add `AccessCardStatus` enum to `@vully/shared-types`
- [x] 3.1.3 Add `AccessCard` entity schema with Zod
- [x] 3.1.4 Add `CreateAccessCardInput` schema
- [x] 3.1.5 Add `UpdateAccessCardInput` schema
- [x] 3.1.6 Export types from package index

## Phase 4: Frontend Hooks

### 4.1 API Hooks
- [x] 4.1.1 Create `use-access-cards.ts` hook file
- [x] 4.1.2 `useAccessCards(apartmentId)` — fetch list with caching
- [x] 4.1.3 `useAccessCard(id)` — fetch single card
- [x] 4.1.4 `useIssueAccessCard()` — mutation for creating card
- [x] 4.1.5 `useUpdateAccessCard()` — mutation for updating card
- [x] 4.1.6 `useDeactivateAccessCard()` — mutation with immediate invalidation
- [x] 4.1.7 `useReactivateAccessCard()` — mutation for reactivation

## Phase 5: Frontend Components

### 5.1 Access Cards Tab
- [x] 5.1.1 Create `AccessCardsTab` component in apartment detail page
- [x] 5.1.2 Display card count vs limit (e.g., "3 / 4 cards issued")
- [x] 5.1.3 List all cards with status badges (DotBadge)
- [x] 5.1.4 Show card details: number, type, zones, floor access, holder
- [x] 5.1.5 Empty state when no cards issued

### 5.2 Issue Card Dialog
- [x] 5.2.1 Create `IssueAccessCardDialog` component
- [x] 5.2.2 Form: card number input, card type select, zones multi-select
- [x] 5.2.3 Form: floor access checkboxes (based on building floor_count)
- [x] 5.2.4 Form: holder select (optional, from apartment residents)
- [x] 5.2.5 Form: expiry date picker (optional)
- [x] 5.2.6 Validation: enforce card limit, prevent duplicate card numbers
- [x] 5.2.7 Success toast and list refresh

### 5.3 Card Actions
- [x] 5.3.1 Deactivate dialog with reason select and notes
- [x] 5.3.2 Reactivate confirmation dialog
- [x] 5.3.3 Edit card dialog (zones, floor access, expiry)
- [x] 5.3.4 Quick status badge click to deactivate lost card

### 5.4 Integration
- [x] 5.4.1 Add "Access Cards" tab to apartment detail page tabs
- [x] 5.4.2 Show card count badge in apartment list/detail header
- [ ] 5.4.3 Update parking assignment dialog with optional card issuance checkbox

## Phase 6: Testing

### 6.1 Backend Unit Tests
- [ ] 6.1.1 Test `validateCardLimit()` — respects building policy and apartment override
- [ ] 6.1.2 Test `create()` — rejects when limit reached
- [ ] 6.1.3 Test `create()` — rejects duplicate card numbers
- [ ] 6.1.4 Test `deactivate()` — records reason and timestamp
- [ ] 6.1.5 Test `reactivate()` — restores active status
- [ ] 6.1.6 Test `reactivate()` — rejects expired cards
- [ ] 6.1.7 Test parking slot unassign deactivates linked card

### 6.2 Integration Tests
- [ ] 6.2.1 E2E: Issue card → verify in list → deactivate → verify status
- [ ] 6.2.2 E2E: Parking slot assign with card → unassign → card deactivated
- [ ] 6.2.3 E2E: Authorization checks (resident cannot issue cards)

### 6.3 Frontend Tests
- [ ] 6.3.1 Component test: AccessCardsTab renders card list
- [ ] 6.3.2 Component test: IssueAccessCardDialog form validation
- [ ] 6.3.3 Component test: Deactivate dialog shows reason options

## Phase 7: Documentation

### 7.1 API Docs
- [ ] 7.1.1 Swagger: Complete endpoint documentation with examples
- [ ] 7.1.2 Swagger: DTO schema descriptions

### 7.2 User Docs
- [ ] 7.2.1 Update APARTMENT_MANAGEMENT.md with access card section
- [ ] 7.2.2 Add access card workflow to BUILDING_APARTMENT_SYSTEM.md

## Dependencies

- Phase 2 depends on Phase 1 (schema must exist)
- Phase 3 can run in parallel with Phase 2
- Phase 4 depends on Phase 2 (API must exist)
- Phase 5 depends on Phase 4 (hooks must exist)
- Phase 6 can run incrementally with Phase 2-5
- Phase 7 runs after implementation is stable
