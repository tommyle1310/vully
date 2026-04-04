# Spec: Apartment Form UX Enhancements

## Overview

Improvements to the apartment form dialog for better usability, policy inheritance visualization, and proper functionality of previously disabled fields.

---

## ADDED Requirements

### Requirement: Policy Inheritance Display

The system SHALL visually indicate when apartment field values are inherited from building policies.

#### Scenario: Display inherited value with source
- **GIVEN** an apartment being edited
- **AND** the building has a policy with `accessCardLimitDefault = 4`
- **AND** the apartment has no override (`access_card_limit_override = null`)
- **WHEN** the admin opens the apartment form
- **THEN** the "Access Card Limit" field shows "4"
- **AND** a badge indicates "From building policy"
- **AND** the field is disabled by default

#### Scenario: Override toggle enables edit
- **GIVEN** an inherited field displayed as disabled
- **WHEN** the admin clicks "Override" toggle next to the field
- **THEN** the field becomes editable
- **AND** a warning shows "Value will override building policy"

#### Scenario: Clear override reverts to inherited
- **GIVEN** an apartment with `max_residents_override = 4`
- **WHEN** the admin toggles off the override switch
- **THEN** the override field is set to null
- **AND** the displayed value reverts to building policy default
- **AND** the field becomes disabled again

---

### Requirement: Effective Configuration API

The system SHALL provide an endpoint returning computed effective values for an apartment.

#### Scenario: Get effective apartment config
- **GIVEN** an apartment with some override fields set and some null
- **WHEN** a client sends `GET /apartments/{id}/effective-config`
- **THEN** the response includes each configurable field with:
  - `value`: the effective value
  - `source`: "apartment" | "building" | "default"
  - `overrideValue`: the apartment's override (if any)
  - `buildingPolicyValue`: the building policy value (if any)

Example response:
```json
{
  "maxResidents": { "value": 6, "source": "building", "overrideValue": null, "buildingPolicyValue": 6 },
  "accessCardLimit": { "value": 2, "source": "apartment", "overrideValue": 2, "buildingPolicyValue": 4 },
  "petAllowed": { "value": true, "source": "building", "overrideValue": null, "buildingPolicyValue": true }
}
```

---

## MODIFIED Requirements

### Requirement: Occupancy Tab Field Behavior

The Occupancy tab fields SHALL be properly functional instead of permanently disabled.

#### Scenario: Ownership fields are editable
- **GIVEN** the apartment form Occupancy tab
- **THEN** the following fields are enabled and editable:
  - Ownership Type (select: permanent | fifty_year | leasehold)
  - VAT Rate (number input, 0-100%)
  - Handover Date (date picker)
  - Warranty Expiry Date (date picker)
  - Is Rented (toggle switch)

#### Scenario: Max Residents uses policy inheritance
- **GIVEN** the Max Residents field
- **WHEN** no apartment override is set
- **THEN** the field shows the building policy value (or calculated from area formula)
- **AND** an override toggle allows setting apartment-specific limit

#### Scenario: Access Card Limit uses policy inheritance
- **GIVEN** the Access Card Limit field
- **WHEN** no apartment override is set
- **THEN** the field shows the building policy value
- **AND** an override toggle allows setting apartment-specific limit

#### Scenario: Pets Allowed uses policy inheritance
- **GIVEN** the Pets Allowed field
- **WHEN** no apartment override is set
- **THEN** the toggle reflects building policy
- **AND** an override toggle allows the owner to explicitly forbid pets

#### Scenario: Intercom Code is editable
- **GIVEN** the Intercom Code field
- **THEN** it is editable (not disabled)
- **AND** a help text says "Typically matches unit number"

---

### Requirement: Utility Tab UX Improvements

The Utility tab SHALL have improved labels, descriptions, and organization.

#### Scenario: Power Capacity has clear label
- **GIVEN** the Power Capacity field
- **THEN** the label reads "Circuit Breaker Rating"
- **AND** the unit suffix shows "Amps"
- **AND** a tooltip explains "Maximum amperage for the unit's main circuit breaker"

#### Scenario: Fields are grouped logically
- **GIVEN** the Utility tab
- **THEN** fields are organized into sections:
  1. **Meters** — Electric, Water, Gas meter IDs (read-only, auto-assigned)
  2. **Infrastructure** — Power capacity, AC unit count, Internet terminal location
  3. **Safety Equipment** — Fire detector ID, Sprinkler count

#### Scenario: AC Unit Count has description
- **GIVEN** the AC Unit Count field
- **THEN** a help text explains "Number of pre-installed AC connection points"

#### Scenario: Fire safety fields have context
- **GIVEN** the Fire Detector ID and Sprinkler Count fields
- **THEN** a section header reads "Safety Equipment (PCCC Compliance)"
- **AND** tooltips reference Vietnamese fire safety regulations

---

### Requirement: Billing Tab Functionality

The Billing tab fields SHALL be functional with proper behavior.

#### Scenario: Billing Cycle uses policy inheritance
- **GIVEN** the Billing Cycle field
- **WHEN** no apartment override is set
- **THEN** the select shows the building policy default
- **AND** the field is disabled with "From building policy" badge
- **AND** an override toggle allows apartment-specific cycle

#### Scenario: Billing Start Date is editable
- **GIVEN** the Billing Start Date field
- **THEN** it is enabled and editable
- **AND** a help text says "Date from which invoices will be generated"

#### Scenario: Virtual Bank Account generation
- **GIVEN** the Virtual Bank Account field
- **WHEN** the building has bank integration configured
- **THEN** a "Generate" button appears next to the field
- **WHEN** the admin clicks "Generate"
- **THEN** a unique virtual account number is generated and saved

#### Scenario: Late Fee Waiver with confirmation
- **GIVEN** the Late Fee Waived toggle
- **WHEN** the admin enables it
- **THEN** a confirmation dialog appears explaining the impact
- **AND** upon confirmation, the toggle saves with audit logging

#### Scenario: Late Fee Waiver disabled shows reason
- **WHEN** Late Fee Waived is enabled
- **THEN** a badge shows "Late fees waived"
- **AND** a note indicates when and by whom it was enabled (if available)

---

### Requirement: Parking Display in Apartment Form

The Utility tab SHALL display assigned parking slots with management actions.

#### Scenario: Show assigned parking slots
- **GIVEN** an apartment with assigned car and moto slots
- **WHEN** the admin opens the Utility tab
- **THEN** a "Parking & Assets" section shows:
  - Car slot: "B1-A-023" with fee "1,500,000 VND/month"
  - Moto slot: "B2-M-045" with fee "200,000 VND/month"

#### Scenario: Manage parking button
- **GIVEN** the Parking & Assets section
- **THEN** a "Manage Parking" button is displayed
- **WHEN** the admin clicks it
- **THEN** a modal opens showing available slots and assignment options

#### Scenario: No assigned parking
- **GIVEN** an apartment with no assigned parking slots
- **WHEN** the admin views the Parking & Assets section
- **THEN** a message says "No parking slots assigned"
- **AND** an "Assign Parking" button is shown
