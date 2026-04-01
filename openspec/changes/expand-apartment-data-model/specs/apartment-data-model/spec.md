## ADDED Requirements

### Requirement: Apartment Spatial Fields
The system SHALL store architectural and spatial data for each apartment including `apartmentCode` (unique human-readable code), `floorLabel`, `unitType`, `netArea`, `grossArea`, `ceilingHeight`, `svgPathData`, `centroidX`, `centroidY`, `orientation`, `balconyDirection`, and `isCornerUnit`.

#### Scenario: Create apartment with spatial data
- **WHEN** admin creates an apartment with `unitType: "two_bedroom"`, `orientation: "south"`, `netArea: 65.5`, `grossArea: 75.0`
- **THEN** the apartment is stored with all spatial fields and returned in the response

#### Scenario: Filter apartments by unit type
- **WHEN** admin lists apartments with filter `unitType=studio`
- **THEN** only apartments with `unitType: "studio"` are returned

### Requirement: Apartment Ownership Fields
The system SHALL track ownership data including `ownerId` (FK → User), `ownershipType`, `pinkBookId`, `handoverDate`, `warrantyExpiryDate`, `isRented`, and `vatRate`.

#### Scenario: Assign owner to apartment
- **WHEN** admin updates apartment with `ownerId` pointing to an existing user
- **THEN** the apartment records the owner separately from any active tenant contract

#### Scenario: Admin-only pink book visibility
- **WHEN** a resident requests apartment details
- **THEN** the `pinkBookId` field MUST NOT be included in the response

### Requirement: Apartment Occupancy Fields
The system SHALL track occupancy limits and details including `maxResidents`, `currentResidentCount`, `petAllowed`, `petLimit`, `accessCardLimit`, and `intercomCode`.

#### Scenario: Create apartment with occupancy limits
- **WHEN** admin creates an apartment with `maxResidents: 4`, `accessCardLimit: 3`
- **THEN** the occupancy fields are stored and returned

### Requirement: Apartment Utility Hardware Fields
The system SHALL store utility meter and technical installation data including `electricMeterId`, `waterMeterId`, `gasMeterId`, `powerCapacity`, `acUnitCount`, `fireDetectorId`, `sprinklerCount`, and `internetTerminalLoc`.

#### Scenario: Record meter IDs for billing
- **WHEN** admin sets `electricMeterId: "EM-A1205"` and `waterMeterId: "WM-A1205"`
- **THEN** the meter IDs are stored and available for billing meter reading lookups

### Requirement: Apartment Parking and Asset Fields
The system SHALL track physical assets assigned to apartments including `assignedCarSlot`, `assignedMotoSlot`, `mailboxNumber`, and `storageUnitId`.

#### Scenario: Assign parking slots
- **WHEN** admin updates apartment with `assignedCarSlot: "B1-A-023"` and `assignedMotoSlot: "M1-012"`
- **THEN** the parking assignments are stored and returned

### Requirement: Apartment Billing Configuration
The system SHALL store billing configuration per apartment including `mgmtFeeConfigId`, `billingStartDate`, `billingCycle`, `bankAccountVirtual`, and `lateFeeWaived`.

#### Scenario: Configure billing cycle
- **WHEN** admin sets `billingCycle: "quarterly"` and `billingStartDate: "2026-01-01"` for a shophouse unit
- **THEN** the billing configuration is stored and used for invoice generation scheduling

### Requirement: Apartment System Logic Fields
The system SHALL support digital/system fields including `parentUnitId` (self-referential FK for merged units), `isMerged`, `syncStatus`, `portalAccessEnabled`, `technicalDrawingUrl`, and `notesAdmin`.

#### Scenario: Merge two units
- **WHEN** admin sets apartment B's `parentUnitId` to apartment A's ID and `isMerged: true`
- **THEN** apartment B is logically hidden from resident views and billing rolls up to apartment A

#### Scenario: Admin notes exclusion
- **WHEN** a resident or technician requests apartment details
- **THEN** the `notesAdmin` field MUST NOT be included in the response

### Requirement: Management Fee Configuration
The system SHALL provide a `ManagementFeeConfig` model that defines price-per-m² rates scoped by building and optionally by unit type, with `effectiveFrom`/`effectiveTo` date ranges for historical tracking.

#### Scenario: Create fee config for building
- **WHEN** admin creates a ManagementFeeConfig with `buildingId`, `pricePerSqm: 25000`, `effectiveFrom: "2026-01-01"`
- **THEN** the config is stored and linkable to apartments in that building

## MODIFIED Requirements

### Requirement: Apartment Field Renames
The system SHALL rename `floor` to `floorIndex` (0-based index for 3D rendering) and `areaSqm` to `grossArea` (Vietnamese real estate term for built-up area / diện tích tim tường).

#### Scenario: API uses renamed fields
- **WHEN** a client sends a create request with `floorIndex: 12` and `grossArea: 75.5`
- **THEN** the system stores and returns the values under the new field names
