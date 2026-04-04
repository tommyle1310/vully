# Spec: Building Policies

## Overview

Building-level policy management enabling centralized configuration of occupancy rules, billing defaults, pet policies, and trash collection schedules with versioned history for audit compliance.

---

## ADDED Requirements

### Requirement: Building Policy CRUD

The system SHALL provide API endpoints for managing building policies with versioned history.

#### Scenario: Create new building policy
- **GIVEN** an admin user is authenticated
- **AND** a building exists with ID `{buildingId}`
- **WHEN** the admin sends `POST /buildings/{buildingId}/policies` with policy data
- **THEN** the system creates a new policy record with `effective_from` set to the provided date
- **AND** if a current policy exists (where `effective_to IS NULL`), sets its `effective_to` to day before new policy's `effective_from`
- **AND** returns the new policy with HTTP 201

#### Scenario: Get current building policy
- **GIVEN** a building has multiple policy versions
- **WHEN** a user sends `GET /buildings/{buildingId}/policies/current`
- **THEN** the system returns the policy where `effective_to IS NULL`
- **AND** the response includes all policy fields (occupancy, billing, trash)

#### Scenario: List policy history
- **GIVEN** a building has 3 policy versions
- **WHEN** a user sends `GET /buildings/{buildingId}/policies`
- **THEN** the system returns all policies ordered by `effective_from DESC`
- **AND** each policy shows its effective date range

#### Scenario: Unauthorized policy modification
- **GIVEN** a user with `resident` or `technician` role
- **WHEN** the user attempts to create/update a building policy
- **THEN** the system returns HTTP 403 Forbidden

---

### Requirement: Policy Data Model

The system SHALL store building policies with the following structure:

#### Scenario: Policy contains occupancy configuration
- **GIVEN** a building policy record
- **THEN** it includes fields:
  - `defaultMaxResidents` (integer, nullable — null means calculate from area)
  - `accessCardLimitDefault` (integer, default 4)
  - `petAllowed` (boolean, default false)
  - `petLimitDefault` (integer, default 0)

#### Scenario: Policy contains billing configuration
- **GIVEN** a building policy record
- **THEN** it includes fields:
  - `defaultBillingCycle` (enum: monthly | quarterly | yearly)
  - `lateFeeRatePercent` (decimal, nullable — e.g., 5.00 for 5%)
  - `lateFeeGraceDays` (integer, default 7)

#### Scenario: Policy contains trash collection configuration
- **GIVEN** a building policy record
- **THEN** it includes fields:
  - `trashCollectionDays` (string array — e.g., ["monday", "thursday"])
  - `trashCollectionTime` (string, nullable — e.g., "07:00-09:00")
  - `trashFeePerMonth` (decimal, nullable)

---

### Requirement: Building Policies UI

The system SHALL provide a "Policies" tab on the building detail page.

#### Scenario: View current policy
- **GIVEN** an admin viewing a building detail page
- **WHEN** the admin clicks the "Policies" tab
- **THEN** the current policy is displayed in a form layout
- **AND** all policy fields are shown with current values

#### Scenario: Edit and save policy
- **GIVEN** an admin on the Policies tab
- **WHEN** the admin modifies fields and clicks "Save Policy"
- **AND** specifies an effective date
- **THEN** a new policy version is created
- **AND** a success toast is shown
- **AND** the policy history updates to show the new version

#### Scenario: View policy history
- **GIVEN** a building with multiple policy versions
- **WHEN** an admin expands the "Policy History" section
- **THEN** all historical policies are shown in chronological order
- **AND** each shows its effective date range and key values

---

### Requirement: Policy Audit Logging

The system SHALL log all policy changes for audit compliance.

#### Scenario: Policy creation logged
- **GIVEN** an admin creates a new building policy
- **THEN** an audit log entry is created with:
  - `action`: "create"
  - `resource_type`: "building_policy"
  - `actor_id`: admin's user ID
  - `new_values`: full policy data

#### Scenario: Policy supersession logged
- **GIVEN** a new policy supersedes an existing policy
- **THEN** an audit log entry is created for the old policy closure with:
  - `action`: "update"
  - `old_values`: including original `effective_to` (null)
  - `new_values`: including new `effective_to` date
