# SVG Builder Capability - Spec Delta

## ADDED Requirements

### Requirement: Bedroom and Bathroom Count Fields

The SVG builder properties panel SHALL allow setting bedroom and bathroom counts for apartment elements.

#### Scenario: Set bedroom count for apartment

**Given** user has selected an apartment element in the SVG builder

**When** user enters "2" in the Bedrooms field

**Then** the element's `bedroomCount` property is set to 2
**And** the value is preserved when the SVG is exported
**And** the value is restored when the SVG is imported

#### Scenario: Set bathroom count for apartment

**Given** user has selected an apartment element in the SVG builder

**When** user enters "1" in the Bathrooms field

**Then** the element's `bathroomCount` property is set to 1
**And** the value is exported as `data-bathrooms="1"` attribute

#### Scenario: Set living room count for apartment

**Given** user has selected an apartment element in the SVG builder

**When** user enters "1" in the Living Rooms field

**Then** the element's `livingRoomCount` property is set to 1
**And** the value is exported as `data-living-rooms="1"` attribute

#### Scenario: Interior fields validation

**Given** user is editing apartment interior details

**When** user attempts to enter:
- Bedrooms: -1 (invalid)
- Bedrooms: 15 (too high)
- Bathrooms: "abc" (non-numeric)

**Then** the input is rejected or constrained to valid range (0-10)

---

### Requirement: Export Interior Details as Data Attributes

The SVG export SHALL include all interior detail fields as data attributes.

#### Scenario: Export apartment with all interior fields

**Given** an apartment element with:
| Field | Value |
|-------|-------|
| apartmentId | apt-101 |
| bedroomCount | 2 |
| bathroomCount | 1 |
| livingRoomCount | 1 |
| logiaCount | 1 |
| kitchenType | open |

**When** exporting the SVG

**Then** the element includes attributes:
```xml
<rect
  data-apartment-id="apt-101"
  data-bedrooms="2"
  data-bathrooms="1"
  data-living-rooms="1"
  data-logia-count="1"
  data-kitchen-type="open"
  ...
/>
```

---

### Requirement: Import Interior Details from Data Attributes

The SVG import SHALL parse interior detail data attributes.

#### Scenario: Import SVG with interior data attributes

**Given** an SVG file with apartment elements containing:
```xml
<rect data-apartment-id="apt-101" data-bedrooms="3" data-bathrooms="2" ... />
```

**When** importing the SVG into the builder

**Then** the element has:
| Field | Value |
|-------|-------|
| apartmentId | apt-101 |
| bedroomCount | 3 |
| bathroomCount | 2 |

**And** the properties panel displays these values

#### Scenario: Import SVG without interior attributes

**Given** an SVG file with apartment elements lacking interior attributes

**When** importing the SVG into the builder

**Then** the interior detail fields are undefined/empty
**And** user can manually set them

---

## MODIFIED Requirements

### Requirement: SVG Element Type Definition

The `SvgElement` interface SHALL include bedroom, bathroom, and living room counts.

**Changed from:**
```typescript
interface SvgElement {
  // ...existing fields
  logiaCount?: number;
  multipurposeRooms?: number;
  kitchenType?: 'open' | 'closed';
  viewDescription?: string;
}
```

**Changed to:**
```typescript
interface SvgElement {
  // ...existing fields
  logiaCount?: number;
  multipurposeRooms?: number;
  kitchenType?: 'open' | 'closed';
  viewDescription?: string;
  // NEW fields
  bedroomCount?: number;
  bathroomCount?: number;
  livingRoomCount?: number;
}
```

#### Scenario: Type safety for interior fields

**Given** TypeScript strict mode is enabled

**When** accessing element interior fields

**Then** `bedroomCount`, `bathroomCount`, `livingRoomCount` are typed as `number | undefined`
