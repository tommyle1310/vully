# Apartment Management — Complete Data Model Specification

> Defines every field needed to fully manage an apartment unit in a Vietnamese high-rise complex, from physical layout to billing configuration to IoT integration.

---

## Current Schema vs Target

The current `Apartment` model in Prisma is minimal:

```
id, buildingId, unitNumber, floor, status, areaSqm, bedroomCount, bathroomCount, features (JSON), svgElementId
```

This spec defines the **complete target model** spanning 7 domains. Fields marked `[NEW]` need to be added; fields marked `[EXISTS]` are already in the schema.

---

## 1. Architectural & Spatial

Fields that define the physical unit and its position for SVG floor plans and Three.js 3D rendering.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID (PK) | Yes | `[EXISTS]` Primary key, auto-generated |
| `apartment_code` | String (unique) | Yes | `[NEW]` Human-readable code, e.g. `"A-12.05"` (Block A, Floor 12, Unit 05). Globally unique across all buildings |
| `building_id` | UUID (FK → Building) | Yes | `[EXISTS]` Reference to the building/block this unit belongs to |
| `floor_index` | Int | Yes | `[EXISTS as floor]` Zero-based floor index for Three.js Y-axis positioning (0 = ground floor) |
| `floor_label` | String | No | `[NEW]` Display name for the floor, e.g. `"12A"` instead of `"13"` (Vietnamese buildings skip floor 13). Null = use floor_index |
| `unit_number` | String | Yes | `[EXISTS]` Unit number within the building, e.g. `"05"` or `"501"` |
| `unit_type` | Enum | Yes | `[NEW]` Type of unit. Values: `studio`, `1br`, `2br`, `3br`, `duplex`, `penthouse`, `shophouse` |
| `net_area` | Decimal(10,2) | No | `[NEW]` Carpet area / Diện tích thông thủy (m²). The usable internal floor area |
| `gross_area` | Decimal(10,2) | No | `[EXISTS as area_sqm]` Built-up area / Diện tích tim tường (m²). Includes wall thickness |
| `ceiling_height` | Decimal(4,2) | No | `[NEW]` Ceiling height in meters, if different from building standard (e.g. `3.20` for penthouse vs default `2.85`) |
| `svg_path_data` | Text | No | `[NEW]` Raw SVG `<path d="...">` or `<polygon points="...">` coordinates for this specific unit. Used when floor plans are generated programmatically rather than from an uploaded SVG file |
| `svg_element_id` | String | No | `[EXISTS]` The `data-apartment-id` or `id` attribute in the building's SVG that maps to this unit |
| `centroid_x` | Decimal(10,4) | No | `[NEW]` X coordinate of the unit's center point in SVG space. Used for placing 3D labels, icons, and tooltips |
| `centroid_y` | Decimal(10,4) | No | `[NEW]` Y coordinate of the unit's center point in SVG space |
| `orientation` | Enum | No | `[NEW]` Main facing direction. Values: `north`, `south`, `east`, `west`, `northeast`, `northwest`, `southeast`, `southwest` |
| `balcony_direction` | Enum | No | `[NEW]` Balcony facing direction. Uses the same enum as `orientation`. Important for Vietnamese buyers (feng shui / phong thủy) |
| `is_corner_unit` | Boolean | No | `[NEW]` Default `false`. Corner units typically have more windows and higher value |

### Notes

- `apartment_code` format convention: `{block_letter}-{floor_label}.{unit_number}` e.g. `A-12.05`
- `floor_index` is the physical floor position (0-based) used for 3D rendering; `floor_label` is what humans see
- `net_area` vs `gross_area`: Vietnamese real estate always distinguishes thông thủy (net) vs tim tường (gross). Billing typically uses `gross_area`
- `svg_path_data` is only used if the unit needs a custom SVG shape beyond the building's master SVG. For most units, `svg_element_id` linking into `Building.svgMapData` is sufficient

---

## 2. Ownership & Legal

Fields tracking who owns the unit and the legal/handover status.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner_id` | UUID (FK → User) | No | `[NEW]` The legal owner (may differ from the current resident/tenant). Null if developer-owned or unsold |
| `ownership_type` | Enum | No | `[NEW]` Values: `permanent` (Sở hữu lâu dài), `50_year` (Sở hữu 50 năm), `leasehold` (Thuê dài hạn). Null if unsold |
| `pink_book_id` | String | No | `[NEW]` Sổ hồng (pink book) certificate number. The official ownership certificate in Vietnam |
| `handover_date` | Date | No | `[NEW]` The date the developer officially handed over keys + signed the handover protocol (Biên bản bàn giao) |
| `warranty_expiry_date` | Date | No | `[NEW]` When the developer's warranty for the unit ends (typically 12-24 months from handover, per Vietnamese law) |
| `is_rented` | Boolean | No | `[NEW]` Default `false`. Whether the unit is currently being rented out by the owner. Triggers different billing rules |
| `vat_rate` | Decimal(5,2) | No | `[NEW]` Specific VAT rate applicable for this unit's management fee billing. Default follows building-wide config. E.g. `10.00` for 10% |

### Notes

- `owner_id` links to the User table but represents the **owner**, not the **resident**. The `Contract` table tracks the tenant/resident relationship
- A unit can have an `owner_id` (owner) AND an active `Contract` (tenant) simultaneously when `is_rented = true`
- `pink_book_id` is sensitive PII — must be encrypted at rest and only visible to admin role
- `warranty_expiry_date` is useful for auto-generating notifications when warranty is about to expire

---

## 3. Occupancy Details

Fields about who lives inside and what's allowed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `max_residents` | Int | No | `[NEW]` Maximum number of residents allowed, based on fire safety regulations and unit area. Vietnamese standard: ~25m²/person for residential |
| `current_resident_count` | Int | No | `[NEW]` Current number of people living in the unit. Updated when residents register/deregister. Default `0` |
| `pet_allowed` | Boolean | No | `[NEW]` Default follows building-level house rules. Can be overridden per unit (e.g. owner explicitly forbids subletting with pets) |
| `pet_limit` | Int | No | `[NEW]` Maximum number of pets allowed. `0` if `pet_allowed = false`. Null = defer to building rules |
| `access_card_limit` | Int | No | `[NEW]` Maximum number of physical access cards/fobs this unit can have. Typically 2-4 per unit. Extra cards may incur a fee |
| `intercom_code` | String | No | `[NEW]` Unique code for the lobby doorbell/intercom system. Usually numeric (e.g. `"1205"` for unit 12.05) |

### Notes

- `current_resident_count` should be updated automatically based on registered residents in the system, or via manual admin input
- `access_card_limit` is a soft limit enforced by admin workflow; the system tracks issued cards separately
- Consider a separate `AccessCard` model if tracking individual card IDs/statuses becomes necessary

---

## 4. Utility & Technical (Hardware)

Fields tracking physical meters and technical installations inside the unit.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `electric_meter_id` | String | No | `[NEW]` Serial number of the physical electric meter installed for this unit. Unique per building |
| `water_meter_id` | String | No | `[NEW]` Serial number of the physical water meter |
| `gas_meter_id` | String | No | `[NEW]` Serial number of the gas meter. Null if building doesn't have piped gas |
| `power_capacity` | Int | No | `[NEW]` Maximum amperage allowed for the unit's circuit breaker (e.g. `40` for 40A). Exceeding this trips the breaker |
| `ac_unit_count` | Int | No | `[NEW]` Number of pre-installed air conditioning connection points (not necessarily installed ACs). Useful for maintenance planning |
| `fire_detector_id` | String | No | `[NEW]` Hardware ID / serial number of the smoke/heat detector device. Required for PCCC (fire safety) compliance |
| `sprinkler_count` | Int | No | `[NEW]` Number of fire sprinkler heads inside the unit. Required for PCCC compliance records |
| `internet_terminal_loc` | String | No | `[NEW]` Description of where the fiber optic / internet entry point is located (e.g. `"Hộp kỹ thuật phòng khách"` — "Living room technical box") |

### Notes

- `electric_meter_id` and `water_meter_id` are critical for billing. The `MeterReading` table records monthly values read from these meters
- Consider creating a separate `Meter` model if meters can be replaced (tracking meter installation date, calibration date, etc.)
- `fire_detector_id` should be queryable for building-wide fire safety audits
- Vietnamese PCCC (Phòng Cháy Chữa Cháy) regulations require documenting fire safety equipment per unit

---

## 5. Parking & Assets (Attachments)

Fields for physical assets assigned to the unit.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assigned_car_slot` | String | No | `[NEW]` ID/code of the assigned car parking spot (e.g. `"B1-A-023"` = Basement 1, Zone A, Slot 23). Null if no fixed slot |
| `assigned_moto_slot` | String | No | `[NEW]` ID/code of the assigned motorbike parking spot. Very common in Vietnam |
| `mailbox_number` | String | No | `[NEW]` Physical mailbox number in the ground-floor mailroom. Usually matches apartment_code but can differ in older buildings |
| `storage_unit_id` | String | No | `[NEW]` ID of the basement storage locker/unit assigned to this apartment. Some developments include a storage cage per unit |

### Notes

- Parking in Vietnamese apartments is a major topic. Most buildings assign **fixed** car slots (often purchased separately at ~200-500M VND)
- Motorbike parking is typically included and managed per-building, not per-slot
- Consider a separate `ParkingSlot` model if slots can be transferred between apartments, or if tracking parking fee billing separately
- `storage_unit_id` is common in newer premium developments

---

## 6. Billing & Finance Configuration

Static configuration fields that control how billing works for this unit. Actual invoices are in the `Invoice` table.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mgmt_fee_config_id` | UUID (FK) | No | `[NEW]` Link to a `ManagementFeeConfig` record that defines the price-per-m² applicable to this unit. Rates change over time (annual adjustments per Vietnamese apartment law) |
| `billing_start_date` | Date | No | `[NEW]` The date from which the system starts generating invoices for this unit. Typically = handover_date. Null = billing not yet active |
| `billing_cycle` | Enum | No | `[NEW]` Values: `monthly` (default), `quarterly`, `yearly`. Most Vietnamese apartments bill monthly |
| `bank_account_virtual` | String | No | `[NEW]` Unique virtual bank account number for automatic payment matching. Format depends on bank (e.g. VietinBank virtual accounts). When a resident transfers to this account, the system auto-matches the payment to invoices |
| `late_fee_waived` | Boolean | No | `[NEW]` Default `false`. Set to `true` for VIP owners, board members, or special arrangements. Skips late fee calculation |

### Notes

- `mgmt_fee_config_id` requires a new `ManagementFeeConfig` table:
  ```
  ManagementFeeConfig { id, building_id, unit_type?, price_per_sqm, effective_from, effective_to }
  ```
  This allows different rates per building, per unit type, with historical tracking
- `bank_account_virtual` enables automated payment reconciliation — a key feature for reducing manual accounting work
- `billing_cycle` is rarely anything other than `monthly` in Vietnam but supporting quarterly is needed for commercial units (shophouses)
- `late_fee_waived` should be logged in AuditLog when toggled

---

## 7. Digital & System Logic (Software)

Fields for system behavior, unit merging, IoT sync, and admin tools.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parent_unit_id` | UUID (FK → self) | No | `[NEW]` Self-referential FK. If this unit was merged with another, this points to the **primary** unit. Critical for combined units (e.g. owner buys A + B and combines them into one large unit) |
| `is_merged` | Boolean | No | `[NEW]` Default `false`. If `true`, this unit has been absorbed into `parent_unit_id`. Its area is added to the parent, and billing goes to the parent |
| `sync_status` | Enum | No | `[NEW]` IoT device sync status. Values: `synced`, `pending`, `error`, `disconnected`. Used for smart meter and fire alarm system integration |
| `portal_access_enabled` | Boolean | No | `[NEW]` Default `true`. Whether the current resident(s) can log into the Vully web/mobile app for this unit. Admin can disable for delinquent accounts |
| `technical_drawing_url` | String (URL) | No | `[NEW]` Link to the PDF/image of the unit's electrical + plumbing layout drawing. Stored in S3/MinIO. Useful for maintenance technicians |
| `notes_admin` | Text | No | `[NEW]` Private notes visible only to admin/management. For internal remarks like "Owner is on the board", "Disputed maintenance fee 2025", etc. |

### Notes

- **Unit merging** is complex:
  - When `parent_unit_id` is set and `is_merged = true`, the child unit is logically hidden from resident views
  - Billing rolls up to the parent unit (combined area)
  - SVG floor plans should render merged units as a single shape
  - The `features` JSON on the parent should include `{ mergedUnits: ["child-uuid-1"] }`
- `sync_status` prepares for IoT integration (smart meters, fire alarm panels). Currently informational; future phases will implement actual device sync
- `portal_access_enabled` is a quick kill-switch. Different from `User.isActive` — this is per-unit, not per-user
- `technical_drawing_url` should be served through a signed URL with expiry (S3 presigned URL pattern)
- `notes_admin` must NEVER be exposed to resident/technician API responses

---

## Proposed Enums

### UnitType

```prisma
enum UnitType {
  studio
  one_bedroom     // 1BR
  two_bedroom     // 2BR
  three_bedroom   // 3BR
  duplex
  penthouse
  shophouse
}
```

### OwnershipType

```prisma
enum OwnershipType {
  permanent       // Sở hữu lâu dài
  fifty_year      // Sở hữu 50 năm
  leasehold       // Thuê dài hạn
}
```

### Orientation

```prisma
enum Orientation {
  north
  south
  east
  west
  northeast
  northwest
  southeast
  southwest
}
```

### BillingCycle

```prisma
enum BillingCycle {
  monthly
  quarterly
  yearly
}
```

### SyncStatus

```prisma
enum SyncStatus {
  synced
  pending
  error
  disconnected
}
```

---

## Proposed Prisma Model (Complete)

```prisma
model Apartment {
  id                   String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // === Architectural & Spatial ===
  apartmentCode        String           @unique @map("apartment_code") @db.VarChar(30)
  buildingId           String           @map("building_id") @db.Uuid
  floorIndex           Int              @map("floor_index")
  floorLabel           String?          @map("floor_label") @db.VarChar(10)
  unitNumber           String           @map("unit_number") @db.VarChar(20)
  unitType             UnitType         @map("unit_type")
  netArea              Decimal?         @map("net_area") @db.Decimal(10, 2)
  grossArea            Decimal?         @map("gross_area") @db.Decimal(10, 2)
  ceilingHeight        Decimal?         @map("ceiling_height") @db.Decimal(4, 2)
  svgPathData          String?          @map("svg_path_data")
  svgElementId         String?          @map("svg_element_id")
  centroidX            Decimal?         @map("centroid_x") @db.Decimal(10, 4)
  centroidY            Decimal?         @map("centroid_y") @db.Decimal(10, 4)
  orientation          Orientation?
  balconyDirection     Orientation?     @map("balcony_direction")
  isCornerUnit         Boolean          @default(false) @map("is_corner_unit")

  // === Ownership & Legal ===
  ownerId              String?          @map("owner_id") @db.Uuid
  ownershipType        OwnershipType?   @map("ownership_type")
  pinkBookId           String?          @map("pink_book_id") @db.VarChar(50)
  handoverDate         DateTime?        @map("handover_date") @db.Date
  warrantyExpiryDate   DateTime?        @map("warranty_expiry_date") @db.Date
  isRented             Boolean          @default(false) @map("is_rented")
  vatRate              Decimal?         @map("vat_rate") @db.Decimal(5, 2)

  // === Occupancy ===
  maxResidents         Int?             @map("max_residents")
  currentResidentCount Int              @default(0) @map("current_resident_count")
  petAllowed           Boolean?         @map("pet_allowed")
  petLimit             Int?             @map("pet_limit")
  accessCardLimit      Int?             @map("access_card_limit")
  intercomCode         String?          @map("intercom_code") @db.VarChar(20)

  // === Utility & Technical ===
  electricMeterId      String?          @map("electric_meter_id") @db.VarChar(50)
  waterMeterId         String?          @map("water_meter_id") @db.VarChar(50)
  gasMeterId           String?          @map("gas_meter_id") @db.VarChar(50)
  powerCapacity        Int?             @map("power_capacity")
  acUnitCount          Int?             @map("ac_unit_count")
  fireDetectorId       String?          @map("fire_detector_id") @db.VarChar(50)
  sprinklerCount       Int?             @map("sprinkler_count")
  internetTerminalLoc  String?          @map("internet_terminal_loc") @db.VarChar(255)

  // === Parking & Assets ===
  assignedCarSlot      String?          @map("assigned_car_slot") @db.VarChar(30)
  assignedMotoSlot     String?          @map("assigned_moto_slot") @db.VarChar(30)
  mailboxNumber        String?          @map("mailbox_number") @db.VarChar(20)
  storageUnitId        String?          @map("storage_unit_id") @db.VarChar(30)

  // === Billing Config ===
  mgmtFeeConfigId      String?          @map("mgmt_fee_config_id") @db.Uuid
  billingStartDate     DateTime?        @map("billing_start_date") @db.Date
  billingCycle         BillingCycle     @default(monthly) @map("billing_cycle")
  bankAccountVirtual   String?          @map("bank_account_virtual") @db.VarChar(30)
  lateFeeWaived        Boolean          @default(false) @map("late_fee_waived")

  // === System Logic ===
  parentUnitId         String?          @map("parent_unit_id") @db.Uuid
  isMerged             Boolean          @default(false) @map("is_merged")
  syncStatus           SyncStatus       @default(disconnected) @map("sync_status")
  portalAccessEnabled  Boolean          @default(true) @map("portal_access_enabled")
  technicalDrawingUrl  String?          @map("technical_drawing_url")
  notesAdmin           String?          @map("notes_admin")

  // === Existing ===
  status               ApartmentStatus  @default(vacant)
  bedroomCount         Int              @default(1) @map("bedroom_count")
  bathroomCount        Int              @default(1) @map("bathroom_count")
  features             Json             @default("{}")
  createdAt            DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)

  // === Relations ===
  building             Building         @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  owner                User?            @relation("OwnedApartments", fields: [ownerId], references: [id])
  parentUnit           Apartment?       @relation("MergedUnits", fields: [parentUnitId], references: [id])
  childUnits           Apartment[]      @relation("MergedUnits")
  mgmtFeeConfig        ManagementFeeConfig? @relation(fields: [mgmtFeeConfigId], references: [id])
  contracts            Contract[]
  incidents            Incident[]
  meterReadings        MeterReading[]

  @@unique([buildingId, unitNumber])
  @@unique([buildingId, apartmentCode])
  @@index([buildingId])
  @@index([status])
  @@index([unitType])
  @@index([ownerId])
  @@index([floorIndex])
  @@index([isMerged])
  @@map("apartments")
}
```

---

## Supporting New Models

### ManagementFeeConfig

Required by `mgmt_fee_config_id` in the Apartment model.

```prisma
model ManagementFeeConfig {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  buildingId    String      @map("building_id") @db.Uuid
  unitType      UnitType?   @map("unit_type")     // Null = applies to all types
  pricePerSqm   Decimal     @map("price_per_sqm") @db.Decimal(12, 2)
  effectiveFrom DateTime    @map("effective_from") @db.Date
  effectiveTo   DateTime?   @map("effective_to") @db.Date
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)

  building      Building    @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  apartments    Apartment[]

  @@index([buildingId, effectiveFrom])
  @@map("management_fee_configs")
}
```

---

## Migration Strategy

This is a large schema expansion. Recommended approach:

1. **Phase 1 — Add enums + columns with defaults/nullable**: All new fields are nullable or have defaults, so this is a non-breaking additive migration
2. **Phase 2 — Backfill data**: Populate `apartment_code`, `unit_type`, and other required fields for existing records via a data migration script
3. **Phase 3 — Add NOT NULL constraints**: Once all existing records are populated, tighten constraints on `apartment_code` and `unit_type`
4. **Phase 4 — Create ManagementFeeConfig**: New table, then link existing apartments

### Rename/Replace Fields

| Current Field | New Field | Action |
|---------------|-----------|--------|
| `floor` | `floor_index` | Rename (same meaning) |
| `area_sqm` | `gross_area` | Rename (clarify semantics) |
| — | `apartment_code` | New required field |
| — | `unit_type` | New required field |

---

## API Endpoints Impact

### New/Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/apartments` | Response includes all new fields; add filters for `unitType`, `orientation`, `isRented`, `isMerged` |
| `POST /api/apartments` | Accept all new fields in create DTO |
| `PATCH /api/apartments/:id` | Accept all new fields in update DTO |
| `GET /api/apartments/:id` | Full apartment detail with owner info, billing config, merged units |
| `POST /api/apartments/:id/merge` | New endpoint: merge two units |
| `POST /api/apartments/:id/unmerge` | New endpoint: split merged unit |
| `GET /api/apartments/:id/billing-config` | New endpoint: get billing configuration |
| `PATCH /api/apartments/:id/billing-config` | New endpoint: update billing configuration |
| `GET /api/management-fee-configs` | New CRUD for fee configurations |

### DTO Additions

Organize the apartment DTO into sections matching this spec:

```typescript
class CreateApartmentDto {
  // Architectural
  apartmentCode: string;    // required
  buildingId: string;       // required
  floorIndex: number;       // required
  unitType: UnitType;       // required
  // ... all other fields optional
}

class UpdateApartmentDto extends PartialType(CreateApartmentDto) {}
```

---

## Security Considerations

| Field | Sensitivity | Access Rule |
|-------|------------|-------------|
| `pink_book_id` | **HIGH** (PII) | Admin only. Encrypt at rest |
| `bank_account_virtual` | **MEDIUM** | Admin only |
| `notes_admin` | **MEDIUM** | Admin only. Never in resident/technician API responses |
| `owner_id` + `is_rented` | **LOW** | Admin + Owner only |
| `intercom_code` | **LOW** | Admin + current resident |
| `electric_meter_id` / `water_meter_id` | **LOW** | Admin + technician |

### API Response Filtering

```typescript
// In ApartmentsService
serializeForRole(apartment: Apartment, role: UserRole) {
  if (role === 'resident') {
    delete apartment.pinkBookId;
    delete apartment.bankAccountVirtual;
    delete apartment.notesAdmin;
    delete apartment.vatRate;
    delete apartment.lateFeeWaived;
  }
  if (role === 'technician') {
    delete apartment.pinkBookId;
    delete apartment.bankAccountVirtual;
    delete apartment.notesAdmin;
  }
  return apartment;
}
```
