# Capability: Apartments

## MODIFIED Requirements

### Requirement: Building Floor Height Management
The system SHALL store and retrieve floor height metadata for buildings.

#### Scenario: Store floor heights
- **GIVEN** building entity
- **WHEN** administrator sets floor heights via API
- **THEN** floor heights are stored in `floorHeights` JSONB field
- **AND** data structure is `{ "1": 3.5, "2": 3.2, "3": 3.0 }`
- **AND** floor numbers are string keys, heights are numbers in meters

#### Scenario: Retrieve floor heights
- **GIVEN** building with floor heights set
- **WHEN** API returns building details
- **THEN** response includes `floorHeights` object
- **AND** object contains all floor heights or empty object if not set

#### Scenario: Update individual floor height
- **GIVEN** building with existing floor heights
- **WHEN** administrator updates floor 2 height from 3.0m to 3.5m
- **THEN** JSONB field is updated with new value
- **AND** other floor heights remain unchanged

#### Scenario: Default floor height fallback
- **GIVEN** building without floor heights set
- **WHEN** 3D viewer requests floor height for floor 1
- **THEN** system uses default value of 3.0 meters
- **AND** default is applied in frontend, not stored in database

---

### Requirement: Floor Height Validation
The system SHALL validate floor height values.

#### Scenario: Valid floor height range
- **GIVEN** floor height update request
- **WHEN** height value is between 2.0m and 6.0m (inclusive)
- **THEN** value is accepted and stored
- **AND** no validation error is returned

#### Scenario: Invalid floor height - too low
- **GIVEN** floor height update request
- **WHEN** height value is less than 2.0m
- **THEN** validation error is returned
- **AND** error message is "Floor height must be at least 2.0 meters"
- **AND** database is not updated

#### Scenario: Invalid floor height - too high
- **GIVEN** floor height update request
- **WHEN** height value is greater than 6.0m
- **THEN** validation error is returned
- **AND** error message is "Floor height cannot exceed 6.0 meters"
- **AND** database is not updated

#### Scenario: Invalid floor height - non-numeric
- **GIVEN** floor height update request
- **WHEN** height value is not a number
- **THEN** validation error is returned
- **AND** error message is "Floor height must be a numeric value"

---

## ADDED Requirements

None. This is a modification of existing Building entity management.

---

## REMOVED Requirements

None. All existing apartment management requirements remain valid.

---

## Integration Points

### With SVG Maps Capability
- SVG builder reads floor heights from building entity
- SVG export includes floor heights in metadata block
- 3D viewer uses floor heights for vertical positioning of floors
