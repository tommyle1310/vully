# Technician Profile

## ADDED Requirements

### Requirement: Technician Specialties
The system MUST allow technician users to have a list of specialties that map to incident categories, enabling admins to match skills to incident types during assignment.

#### Scenario: Set technician specialties
- **GIVEN** an admin is editing a technician's profile
- **WHEN** the admin selects specialties (e.g., plumbing, electrical, hvac)
- **THEN** the specialties are stored in `profile_data.specialties` as a string array
- **AND** the values MUST be valid `IncidentCategory` enum values

#### Scenario: Retrieve technician with specialties
- **GIVEN** a technician has specialties set in their profile
- **WHEN** `GET /users/technicians` is called
- **THEN** each technician's response includes `profileData.specialties` array

### Requirement: Technician Availability Status
The system MUST support an availability status for technician users that indicates whether they can accept new assignments.

#### Scenario: Update availability status
- **GIVEN** a technician or admin user
- **WHEN** they update the technician's `availabilityStatus` to `available`, `busy`, or `off_duty`
- **THEN** the status is persisted in `profile_data.availabilityStatus`
- **AND** default value for new technicians MUST be `available`

#### Scenario: Availability shown in technician listing
- **GIVEN** an admin requesting the technician list
- **WHEN** `GET /users/technicians` is called
- **THEN** each technician includes their current `availabilityStatus`

### Requirement: Technician Shift Preferences
The system MUST allow technician users to set preferred working days and hours for informational purposes.

#### Scenario: Set shift preferences
- **GIVEN** a technician updating their profile
- **WHEN** they provide `shiftPreferences` with `preferredDays` and `preferredHours`
- **THEN** the preferences are stored in `profile_data.shiftPreferences`
- **AND** `preferredDays` MUST be an array of lowercase day abbreviations (mon, tue, wed, thu, fri, sat, sun)
- **AND** `preferredHours` MUST be a string in `HH:mm-HH:mm` format
