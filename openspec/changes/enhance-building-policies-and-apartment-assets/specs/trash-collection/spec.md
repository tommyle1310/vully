# Spec: Trash Collection Management

## Overview

Building-level trash collection schedule and fee management with billing integration for automated monthly trash fees.

---

## ADDED Requirements

### Requirement: Trash Collection Schedule Display

The system SHALL display trash collection schedules on the building detail page.

#### Scenario: View trash schedule on building page
- **GIVEN** a building with trash collection configured in policy:
  - Days: Monday, Thursday
  - Time: 07:00-09:00
- **WHEN** a user views the building detail page
- **THEN** a "Trash Collection" section shows:
  - "Collection Days: Monday, Thursday"
  - "Collection Time: 7:00 AM - 9:00 AM"

#### Scenario: No trash schedule configured
- **GIVEN** a building with no trash policy configured
- **WHEN** a user views the building detail page
- **THEN** the Trash Collection section shows "Not configured"
- **AND** for admins, a "Configure" button is shown

---

### Requirement: Trash Collection Configuration

The system SHALL allow admins to configure trash collection in building policies.

#### Scenario: Configure trash schedule
- **GIVEN** an admin on the Building Policies tab
- **THEN** a "Trash Collection" section includes:
  - Multi-select for collection days (Mon-Sun)
  - Time range inputs (start time, end time)
  - Monthly fee input (optional)

#### Scenario: Save trash configuration
- **GIVEN** an admin has set:
  - Days: Monday, Wednesday, Friday
  - Time: 06:00-08:00
  - Fee: 50,000 VND/month
- **WHEN** the admin saves the policy
- **THEN** the trash fields are saved in the building policy
- **AND** the building detail page reflects the schedule

---

### Requirement: Trash Fee Billing Integration

The system SHALL automatically include trash fees in monthly invoices.

#### Scenario: Invoice includes trash fee
- **GIVEN** a building with `trashFeePerMonth = 50,000 VND`
- **AND** an active contract for an apartment in that building
- **WHEN** the monthly invoice is generated
- **THEN** the invoice includes a line item:
  - Description: "Trash collection fee"
  - Amount: 50,000 VND
  - Category: "trash"

#### Scenario: No trash fee when not configured
- **GIVEN** a building with `trashFeePerMonth = null` or `0`
- **WHEN** the monthly invoice is generated
- **THEN** no trash fee line item is added

#### Scenario: Trash fee consistent across all apartments
- **GIVEN** a building with 100 apartments and trash fee 50,000 VND
- **WHEN** monthly invoices are generated for all active contracts
- **THEN** each invoice includes the same 50,000 VND trash fee

---

### Requirement: Trash Collection Days Validation

The system SHALL validate trash collection day inputs.

#### Scenario: Valid day values
- **GIVEN** an admin configuring trash collection days
- **THEN** only valid day values are accepted:
  - `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`

#### Scenario: Invalid day rejected
- **GIVEN** an admin attempts to set `trashCollectionDays = ["funday"]`
- **WHEN** the policy is saved
- **THEN** a validation error is returned
- **AND** the policy is not saved

#### Scenario: Time format validation
- **GIVEN** an admin configuring trash collection time
- **THEN** the time must be in 24-hour format "HH:MM-HH:MM"
- **WHEN** "25:00-27:00" is entered
- **THEN** a validation error is shown
