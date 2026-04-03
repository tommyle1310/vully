# Buildings Capability - Spec Delta

## ADDED Requirements

### Requirement: Building Occupancy Statistics

The system SHALL provide an endpoint to retrieve occupancy statistics for a building.

#### Scenario: Get building stats with mixed apartment statuses

**Given** a building "Sunrise Tower" with apartments:
| Unit | Status |
|------|--------|
| 101 | occupied |
| 102 | occupied |
| 103 | vacant |
| 104 | maintenance |
| 201 | occupied |
| 202 | vacant |
| 203 | reserved |
| 204 | vacant |

**When** fetching `GET /buildings/:id/stats`

**Then** the response contains:
```json
{
  "totalApartments": 8,
  "occupied": 3,
  "vacant": 3,
  "maintenance": 1,
  "reserved": 1,
  "occupancyRate": 38
}
```

#### Scenario: Get stats for building with no apartments

**Given** a building with no apartments

**When** fetching `GET /buildings/:id/stats`

**Then** the response contains:
```json
{
  "totalApartments": 0,
  "occupied": 0,
  "vacant": 0,
  "maintenance": 0,
  "reserved": 0,
  "occupancyRate": 0
}
```

#### Scenario: Get stats for non-existent building

**Given** a non-existent building ID

**When** fetching `GET /buildings/:id/stats`

**Then** the system returns HTTP 404 Not Found

---

### Requirement: Building Utility Meters Registry

The system SHALL provide an endpoint to list all utility meter IDs assigned to apartments in a building.

#### Scenario: Get building meters with all types

**Given** a building "Ocean View" with apartments:
| Unit | Electric Meter | Water Meter | Gas Meter |
|------|---------------|-------------|-----------|
| 101 | EL-001 | WA-001 | GS-001 |
| 102 | EL-002 | WA-002 | null |
| 103 | null | WA-003 | null |

**When** fetching `GET /buildings/:id/meters`

**Then** the response contains:
```json
{
  "electricMeters": [
    { "id": "EL-001", "apartmentId": "<uuid-101>", "unitNumber": "101" },
    { "id": "EL-002", "apartmentId": "<uuid-102>", "unitNumber": "102" }
  ],
  "waterMeters": [
    { "id": "WA-001", "apartmentId": "<uuid-101>", "unitNumber": "101" },
    { "id": "WA-002", "apartmentId": "<uuid-102>", "unitNumber": "102" },
    { "id": "WA-003", "apartmentId": "<uuid-103>", "unitNumber": "103" }
  ],
  "gasMeters": [
    { "id": "GS-001", "apartmentId": "<uuid-101>", "unitNumber": "101" }
  ]
}
```

#### Scenario: Get meters for building with no meters assigned

**Given** a building where no apartments have meter IDs assigned

**When** fetching `GET /buildings/:id/meters`

**Then** the response contains:
```json
{
  "electricMeters": [],
  "waterMeters": [],
  "gasMeters": []
}
```

---

## MODIFIED Requirements

### Requirement: 3D Building Visualization with Status Colors

The 3D building viewer SHALL display apartments colored by their occupancy status.

**Changed from:** All apartments rendered in uniform gray color.

**Changed to:** Apartments colored based on status:
| Status | Color | Hex Code |
|--------|-------|----------|
| vacant | Green | #22c55e |
| occupied | Blue | #3b82f6 |
| maintenance | Amber | #f59e0b |
| reserved | Purple | #8b5cf6 |
| unknown/default | Gray | #9ca3af |

#### Scenario: View building with mixed apartment statuses

**Given** a building with:
- 3 occupied apartments
- 2 vacant apartments
- 1 maintenance apartment

**When** viewing the 3D building visualization

**Then** occupied apartments are rendered in blue (#3b82f6)
**And** vacant apartments are rendered in green (#22c55e)
**And** maintenance apartment is rendered in amber (#f59e0b)
**And** a status legend is displayed

#### Scenario: Building with no status data

**Given** a building where apartment statuses are not loaded

**When** viewing the 3D building visualization

**Then** all apartments are rendered in default gray (#9ca3af)
