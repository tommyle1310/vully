# Capability: Access Card Management

## Overview

Track and manage physical access cards for apartment buildings. Supports two card types: building access (lobby, elevator, amenities) and parking access (lot gates). Enforces card limits per apartment based on building policy.

## ADDED Requirements

### Requirement: Access Card Data Model

The system SHALL store access cards with the following attributes:
- Unique physical card number (manufacturer ID)
- Card type: `building` or `parking`
- Status: `active`, `lost`, `deactivated`, or `expired`
- Apartment assignment (required)
- Optional holder (specific resident)
- Access zones (array of zone names)
- Floor access (array of floor indices for elevator control)
- Timestamps: issued, expires, deactivated

#### Scenario: Create building access card
- **GIVEN** an apartment exists with unit number "1201"
- **WHEN** admin issues a card with `cardNumber: "AC-2024-0001"`, `cardType: "building"`, `accessZones: ["lobby", "elevator", "gym"]`
- **THEN** the system creates an access card linked to the apartment
- **AND** the card status is set to `active`
- **AND** issuedAt timestamp is recorded

#### Scenario: Create parking access card
- **GIVEN** an apartment has parking slot "B1-A-023" assigned
- **WHEN** admin issues a card with `cardNumber: "PC-2024-0001"`, `cardType: "parking"`
- **THEN** the system creates a parking card linked to the apartment
- **AND** the parking slot's access_card_id is updated to reference this card

### Requirement: Card Limit Enforcement

The system SHALL enforce the access card limit per apartment for building-type cards only. The effective limit is determined by:
1. Apartment's `accessCardLimit` override (if set)
2. Building policy's `accessCardLimitDefault` (fallback)
3. System default of 4 (final fallback)

Parking cards do NOT count toward this limit.

#### Scenario: Issue card within limit
- **GIVEN** building policy has `accessCardLimitDefault: 4`
- **AND** apartment has 2 active building cards
- **WHEN** admin attempts to issue a new building card
- **THEN** the card is created successfully
- **AND** apartment now has 3 active building cards

#### Scenario: Reject card when limit reached
- **GIVEN** building policy has `accessCardLimitDefault: 4`
- **AND** apartment has 4 active building cards
- **WHEN** admin attempts to issue a new building card
- **THEN** the system rejects with error "Card limit reached (4/4). Deactivate a card first."

#### Scenario: Apartment override allows more cards
- **GIVEN** building policy has `accessCardLimitDefault: 4`
- **AND** apartment has `accessCardLimit: 6` override
- **AND** apartment has 5 active building cards
- **WHEN** admin attempts to issue a new building card
- **THEN** the card is created successfully

#### Scenario: Parking cards bypass limit
- **GIVEN** apartment has 4 active building cards (at limit)
- **WHEN** admin issues a parking card
- **THEN** the parking card is created successfully
- **AND** building card count remains at 4

### Requirement: Card Deactivation

The system SHALL allow immediate deactivation of access cards with reason tracking. Deactivation records the timestamp, reason, and actor for audit purposes.

Deactivation reasons:
- `lost` — Card is lost
- `stolen` — Card was stolen
- `resident_left` — Resident moved out
- `admin_action` — Administrative deactivation

#### Scenario: Deactivate lost card
- **GIVEN** an active access card exists
- **WHEN** admin deactivates with `reason: "lost"`, `notes: "Resident reported lost on 2024-01-15"`
- **THEN** the card status changes to `lost`
- **AND** deactivatedAt timestamp is recorded
- **AND** deactivatedBy references the admin user
- **AND** an audit log entry is created

#### Scenario: Deactivate card linked to parking slot
- **GIVEN** a parking card is linked to slot "B1-A-023"
- **WHEN** admin deactivates the card
- **THEN** the card status changes to `deactivated`
- **AND** the parking slot's access_card_id is set to null

### Requirement: Card Reactivation

The system SHALL allow reactivation of lost or deactivated cards. Expired cards cannot be reactivated.

#### Scenario: Reactivate lost card
- **GIVEN** an access card has status `lost`
- **WHEN** admin reactivates the card
- **THEN** the card status changes to `active`
- **AND** deactivatedAt is cleared
- **AND** an audit log entry records the reactivation

#### Scenario: Cannot reactivate expired card
- **GIVEN** an access card has status `expired`
- **WHEN** admin attempts to reactivate
- **THEN** the system rejects with error "Expired cards cannot be reactivated. Issue a new card."

### Requirement: Zone and Floor Access Configuration

The system SHALL allow configuring which building zones and floors a card grants access to. This enables differentiated access levels (e.g., gym-only cards, restricted floor access).

Default access zones: `["lobby", "elevator"]`
Default floor access: All floors in the building

#### Scenario: Update card zones
- **GIVEN** a card has `accessZones: ["lobby", "elevator"]`
- **WHEN** admin updates to `accessZones: ["lobby", "elevator", "gym", "pool"]`
- **THEN** the card's access zones are updated
- **AND** updatedAt timestamp is refreshed

#### Scenario: Restrict floor access
- **GIVEN** a building has 20 floors
- **AND** a card has default floor access (all floors)
- **WHEN** admin updates to `floorAccess: [1, 12, 13, 14]`
- **THEN** the card can only access lobby (1) and floors 12-14
- **AND** elevator control should restrict to specified floors

### Requirement: Parking Slot Integration

When a parking slot is assigned or unassigned, the system SHALL optionally manage the linked parking access card.

#### Scenario: Auto-issue parking card on slot assignment
- **GIVEN** building has `autoIssueParkingCard: true` in policy
- **AND** parking slot "B1-A-023" is unassigned with no linked card
- **WHEN** admin assigns the slot to apartment "1201"
- **THEN** a new parking card is automatically issued
- **AND** the card is linked to the parking slot

#### Scenario: Deactivate parking card on slot unassignment
- **GIVEN** parking slot "B1-A-023" has a linked active parking card
- **WHEN** admin unassigns the slot from the apartment
- **THEN** the linked parking card is deactivated with reason `admin_action`
- **AND** the slot's access_card_id is cleared

### Requirement: Card Listing and Filtering

The system SHALL provide paginated listing of access cards for an apartment with filtering capabilities.

#### Scenario: List all cards for apartment
- **GIVEN** apartment "1201" has 3 access cards (2 building, 1 parking)
- **WHEN** fetching cards for apartment "1201"
- **THEN** all 3 cards are returned
- **AND** each card includes status, type, zones, and holder info

#### Scenario: Filter by status
- **GIVEN** apartment has cards with various statuses
- **WHEN** fetching with `status: "active"` filter
- **THEN** only active cards are returned

#### Scenario: Filter by type
- **GIVEN** apartment has building and parking cards
- **WHEN** fetching with `cardType: "parking"` filter
- **THEN** only parking cards are returned

### Requirement: Card Number Uniqueness

The system SHALL enforce globally unique card numbers. Previously used card numbers (even from deactivated cards) cannot be reused to prevent security confusion.

#### Scenario: Reject duplicate card number
- **GIVEN** card number "AC-2024-0001" was previously issued and deactivated
- **WHEN** admin attempts to issue a new card with the same number
- **THEN** the system rejects with error "Card number already exists in the system"

## Authorization

| Action | Admin | Technician | Resident |
|--------|-------|------------|----------|
| List cards (own apartment) | ✓ | ✓ | ✓ |
| List cards (any apartment) | ✓ | ✓ | ✗ |
| Issue card | ✓ | ✗ | ✗ |
| Update card | ✓ | ✗ | ✗ |
| Deactivate card | ✓ | ✓ | ✗ |
| Reactivate card | ✓ | ✗ | ✗ |

## Audit Logging

All card operations MUST be logged to `audit_logs` with:
- `action`: `access_card.issued`, `access_card.updated`, `access_card.deactivated`, `access_card.reactivated`
- `resource_type`: `access_card`
- `resource_id`: card UUID
- `old_values` / `new_values`: relevant state changes
- `actor_id`: user who performed the action
