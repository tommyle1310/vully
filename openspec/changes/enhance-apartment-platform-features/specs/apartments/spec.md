# Apartments Capability - Spec Delta

## MODIFIED Requirements

### Requirement: Advanced Apartment Filtering

The apartments list endpoint SHALL support advanced filtering by multiple criteria.

**Changed from:** Basic filtering by `buildingId` only with global text search.

**Changed to:** Support for:
- Building filter (single select)
- Status filter (multi-select)
- Unit type filter (multi-select)
- Bedroom count range
- Floor range
- Area range
- Text search on unit number and apartment code

#### Scenario: Filter apartments by status

**Given** apartments with mixed statuses in the system

**When** fetching `GET /apartments?status=vacant,maintenance`

**Then** only apartments with status "vacant" or "maintenance" are returned

#### Scenario: Filter apartments by building and unit type

**Given** apartments across multiple buildings

**When** fetching `GET /apartments?buildingId=<uuid>&unitType=one_bedroom,two_bedroom`

**Then** only 1BR and 2BR apartments in the specified building are returned

#### Scenario: Filter apartments by bedroom range

**Given** apartments with various bedroom counts

**When** fetching `GET /apartments?minBedrooms=2&maxBedrooms=3`

**Then** only apartments with 2 or 3 bedrooms are returned

#### Scenario: Filter apartments by floor range

**Given** a building with 20 floors of apartments

**When** fetching `GET /apartments?buildingId=<uuid>&minFloor=5&maxFloor=10`

**Then** only apartments on floors 5 through 10 are returned

#### Scenario: Search apartments by unit number

**Given** apartments including unit "101", "102", "201"

**When** fetching `GET /apartments?search=10`

**Then** apartments "101" and "102" are returned (partial match)

#### Scenario: Combine multiple filters

**Given** apartments across buildings

**When** fetching `GET /apartments?buildingId=<uuid>&status=vacant&minBedrooms=2&minFloor=5`

**Then** only vacant apartments with 2+ bedrooms on floor 5+ in the building are returned

---

### Requirement: Smart Filters UI Component

The apartments page SHALL provide a filter bar with intuitive controls.

#### Scenario: Use building dropdown filter

**Given** user is on the apartments page
**And** multiple buildings exist

**When** user selects "Sunrise Tower" from the building dropdown

**Then** the apartment list shows only apartments in Sunrise Tower
**And** the URL is updated with `?buildingId=<uuid>`
**And** refreshing the page maintains the filter

#### Scenario: Use status multi-select filter

**Given** user is on the apartments page

**When** user selects "Vacant" and "Reserved" statuses

**Then** the apartment list shows only vacant and reserved apartments
**And** the URL is updated with `?status=vacant,reserved`

#### Scenario: Use floor range slider

**Given** user is on the apartments page
**And** building has floors 1-30

**When** user adjusts floor range slider to 10-20

**Then** the apartment list shows only apartments on floors 10-20
**And** the URL is updated with `?minFloor=10&maxFloor=20`

#### Scenario: Clear all filters

**Given** user has multiple filters active

**When** user clicks "Clear All" button

**Then** all filters are reset
**And** the apartment list shows all apartments
**And** the URL query string is cleared

#### Scenario: Filter persistence across navigation

**Given** user has set filters on apartments page

**When** user navigates to another page and returns

**Then** the filters are restored from URL state
