# Change: Add Access Card Management

## Why

Currently, the system tracks `accessCardLimitDefault` (per building policy) and `accessCardLimit` (per apartment), but this only represents the **maximum count** allowed. Property managers cannot:

1. **Track individual cards** — No way to record which physical card IDs are issued
2. **Manage card lifecycle** — Cannot mark cards as lost, deactivated, or expired
3. **Control zone access** — Cannot configure which building areas/floors a card grants access to
4. **Audit issuance** — No visibility into who received cards and when
5. **Link parking cards** — Parking slot assignment lacks associated access card tracking

This gap is critical for security and operations in Vietnamese apartment buildings where:
- Physical access cards are required for lobby entry, elevators, amenities
- Parking lot gates use separate access cards linked to slot assignments
- Lost card deactivation must be immediate to prevent unauthorized access
- Residents may need different floor access permissions

## What Changes

### Capability 1: Access Card Data Model
- **NEW** `AccessCard` model tracking individual cards with:
  - Physical card number (unique identifier from manufacturer)
  - Card type: `building` (entry/elevator) or `parking` (lot gates)
  - Status lifecycle: `active` → `lost`/`deactivated`/`expired`
  - Zone access configuration (lobby, elevator, gym, pool, etc.)
  - Floor access restrictions (elevator floor control)
  - Audit timestamps (issuedAt, deactivatedAt, expiresAt)
- **NEW** Enums: `AccessCardType`, `AccessCardStatus`

### Capability 2: Building Access Card Management
- **API** for issuing, updating, and deactivating building access cards
- Enforce `accessCardLimit` from building policy (with apartment override)
- Immediate deactivation workflow for lost/stolen cards
- Optional holder assignment (specific resident vs generic apartment card)
- Zone and floor access configuration per card

### Capability 3: Parking Access Card Integration
- **Link** access cards to parking slot assignments
- Auto-issue parking card when slot is assigned (optional workflow)
- Deactivate parking card when slot is unassigned
- Separate card type ensures parking-only access

### Capability 4: Frontend Access Card Tab
- **NEW** "Access Cards" tab on apartment detail page
- List all issued cards with status badges
- Issue new card dialog (enforces limit)
- Quick actions: Deactivate, Reactivate, Edit zones
- Parking cards shown with linked slot info

## Impact

- **New models**: `AccessCard`
- **New enums**: `AccessCardType`, `AccessCardStatus`
- **Extended models**: `ParkingSlot` (optional relation to access_card)
- **Affected pages**: 
  - Apartment detail (`/apartments/[id]`) — new tab
  - Parking slot assignment dialog — optional card issuance
- **API changes**:
  - `GET /apartments/:id/access-cards` — list cards for apartment
  - `POST /access-cards` — issue new card
  - `PATCH /access-cards/:id` — update zones/status
  - `POST /access-cards/:id/deactivate` — immediate deactivation
  - `POST /access-cards/:id/reactivate` — reactivation with audit
- **BREAKING**: None (additive changes only)

## Out of Scope

- Physical card provisioning/programming (integration with card systems)
- QR code or NFC mobile access
- Visitor temporary access passes
- Real-time access log integration
- Multi-building unified access (per-building scope only)
