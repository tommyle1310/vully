# Spec: Parking Slot Management

## Overview

Full parking inventory system at building level with zone hierarchy, slot assignment/unassignment workflows, and billing integration for automated monthly parking fees.

---

## ADDED Requirements

### Requirement: Parking Zone Management

The system SHALL provide CRUD operations for parking zones within a building.

#### Scenario: Create parking zone
- **GIVEN** an admin is authenticated
- **AND** a building exists with ID `{buildingId}`
- **WHEN** the admin sends `POST /buildings/{buildingId}/parking/zones` with:
  ```json
  {
    "name": "Basement 1 - Zone A",
    "code": "B1-A",
    "slotType": "car",
    "totalSlots": 50,
    "feePerMonth": 1500000
  }
  ```
- **THEN** the system creates a parking zone record
- **AND** returns the zone with HTTP 201
- **AND** the zone code is unique within the building

#### Scenario: List parking zones
- **GIVEN** a building has 3 parking zones
- **WHEN** a user sends `GET /buildings/{buildingId}/parking/zones`
- **THEN** the system returns all zones with:
  - Zone details (name, code, type, fee)
  - Slot statistics (total, assigned, available)

#### Scenario: Update parking zone
- **GIVEN** an existing parking zone
- **WHEN** an admin sends `PATCH /buildings/{buildingId}/parking/zones/{zoneId}`
- **THEN** the zone is updated
- **AND** changes do not affect already-assigned slots

#### Scenario: Deactivate parking zone
- **GIVEN** a parking zone with assigned slots
- **WHEN** an admin attempts to delete the zone
- **THEN** the system soft-deletes (sets `isActive = false`)
- **AND** existing assignments remain valid until explicitly removed

---

### Requirement: Parking Slot Management

The system SHALL provide operations for managing individual parking slots.

#### Scenario: Bulk create slots
- **GIVEN** a parking zone with code "B1-A"
- **WHEN** an admin sends `POST /buildings/{buildingId}/parking/slots/bulk` with:
  ```json
  {
    "zoneId": "{zoneId}",
    "count": 50,
    "startNumber": 1
  }
  ```
- **THEN** the system creates 50 slots with:
  - `slotNumber`: "001" through "050"
  - `fullCode`: "B1-A-001" through "B1-A-050"
  - `status`: "available"

#### Scenario: List slots with filters
- **GIVEN** a building has 100 parking slots across zones
- **WHEN** a user sends `GET /buildings/{buildingId}/parking/slots?status=available&slotType=car`
- **THEN** only available car slots are returned
- **AND** results include zone info and assignment status

#### Scenario: Update slot details
- **GIVEN** an existing parking slot
- **WHEN** an admin sends `PATCH /parking/slots/{slotId}` with fee override or notes
- **THEN** the slot is updated
- **AND** if fee_override is set, it takes precedence over zone fee

---

### Requirement: Slot Assignment to Apartments

The system SHALL enable assigning parking slots to apartments.

#### Scenario: Assign slot to apartment
- **GIVEN** an available parking slot
- **AND** an apartment without a car slot assigned
- **WHEN** an admin sends `POST /apartments/{apartmentId}/parking/assign` with:
  ```json
  {
    "slotId": "{slotId}",
    "slotType": "car"
  }
  ```
- **THEN** the slot's `assigned_apt_id` is set to the apartment ID
- **AND** the slot's `status` becomes "assigned"
- **AND** `assigned_at` is set to current timestamp
- **AND** an audit log entry is created

#### Scenario: Prevent double assignment
- **GIVEN** a slot already assigned to apartment A
- **WHEN** an admin attempts to assign the same slot to apartment B
- **THEN** the system returns HTTP 409 Conflict
- **AND** the error message indicates the slot is already assigned

#### Scenario: Unassign slot from apartment
- **GIVEN** a slot assigned to an apartment
- **WHEN** an admin sends `DELETE /apartments/{apartmentId}/parking/car`
- **THEN** the slot's `assigned_apt_id` is set to null
- **AND** the slot's `status` becomes "available"
- **AND** an audit log entry is created

#### Scenario: Get apartment's assigned slots
- **GIVEN** an apartment with 1 car slot and 1 moto slot assigned
- **WHEN** a user sends `GET /apartments/{apartmentId}/parking`
- **THEN** the response includes both slots with full details

---

### Requirement: Parking Management UI

The system SHALL provide a "Parking" tab on the building detail page.

#### Scenario: View parking inventory
- **GIVEN** an admin viewing a building detail page
- **WHEN** the admin clicks the "Parking" tab
- **THEN** all parking zones are displayed as cards
- **AND** each zone shows: name, type, slot count, assigned/available stats, monthly fee

#### Scenario: Visual slot grid
- **GIVEN** a parking zone with 50 slots
- **WHEN** an admin expands the zone card
- **THEN** a grid of slots is displayed
- **AND** slots are color-coded by status:
  - Green: available
  - Blue: assigned
  - Purple: reserved
  - Amber: maintenance

#### Scenario: Assign slot from grid
- **GIVEN** an admin viewing the slot grid
- **WHEN** the admin clicks an available slot
- **THEN** an assignment popover appears
- **AND** the admin can search for an apartment to assign
- **WHEN** the admin selects an apartment and confirms
- **THEN** the slot is assigned and grid updates

#### Scenario: View slot details
- **GIVEN** an assigned slot in the grid
- **WHEN** the admin hovers or clicks the slot
- **THEN** a tooltip/popover shows:
  - Assigned apartment unit number
  - Assignment date
  - Fee (with override indicator if applicable)

---

### Requirement: Parking Billing Integration

The system SHALL automatically include parking fees in monthly invoices.

#### Scenario: Invoice includes parking fees
- **GIVEN** an apartment has 1 car slot (fee: 1,500,000 VND) and 1 moto slot (fee: 200,000 VND) assigned
- **WHEN** the monthly invoice is generated
- **THEN** the invoice includes line items:
  - "Parking: B1-A-023" — 1,500,000 VND
  - "Parking: B2-M-045" — 200,000 VND
- **AND** line item category is "parking"

#### Scenario: Fee override in invoice
- **GIVEN** a slot has `fee_override` set to 1,200,000 VND (VIP discount)
- **AND** the zone's `feePerMonth` is 1,500,000 VND
- **WHEN** the monthly invoice is generated
- **THEN** the parking line item uses the override fee (1,200,000 VND)

#### Scenario: No parking fee for free slots
- **GIVEN** a slot with `fee_override = 0` or zone `feePerMonth = null`
- **WHEN** the monthly invoice is generated
- **THEN** no parking line item is added for that slot
