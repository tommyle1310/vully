# Design: Building Policies and Apartment Asset Management

## Overview

This design introduces building-level configuration management with policy inheritance for apartments, plus a full parking slot inventory system. The architecture follows existing patterns (Prisma models, NestJS modules, TanStack Query hooks) while adding policy versioning for audit compliance.

---

## 1. Data Model Design

### 1.1 Building Policy Model

```prisma
model building_policies {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  building_id          String   @db.Uuid
  
  // Occupancy Rules
  default_max_residents     Int?      // null = calculated by area formula (25m² per person)
  access_card_limit_default Int       @default(4)
  pet_allowed              Boolean   @default(false)
  pet_limit_default        Int       @default(0)
  
  // Billing Configuration
  default_billing_cycle    BillingCycle @default(monthly)
  late_fee_rate_percent    Decimal?     @db.Decimal(5, 2)  // e.g., 0.05 for 5%
  late_fee_grace_days      Int          @default(7)
  
  // Trash Collection
  trash_collection_days    String[]     // ['monday', 'thursday']
  trash_collection_time    String?      // e.g., "07:00-09:00"
  trash_fee_per_month      Decimal?     @db.Decimal(12, 2)
  
  // Versioning
  effective_from           DateTime     @db.Date
  effective_to             DateTime?    @db.Date  // null = current policy
  created_by               String?      @db.Uuid
  created_at               DateTime     @default(now()) @db.Timestamptz(6)
  
  buildings                buildings    @relation(fields: [building_id], references: [id], onDelete: Cascade)
  users                    users?       @relation(fields: [created_by], references: [id])

  @@index([building_id, effective_from])
  @@index([building_id, effective_to])
}
```

**Rationale**:
- Versioned policies allow historical tracking (required for Vietnamese apartment law compliance)
- `effective_to = null` indicates the currently active policy
- Separate model vs JSON field enables audit logging and querying

### 1.2 Parking System Models

```prisma
model parking_zones {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  building_id   String         @db.Uuid
  name          String         @db.VarChar(50)   // e.g., "Basement 1 - Zone A"
  code          String         @db.VarChar(10)   // e.g., "B1-A"
  slot_type     ParkingType                      // car | motorcycle | bicycle
  total_slots   Int
  fee_per_month Decimal?       @db.Decimal(12, 2)
  is_active     Boolean        @default(true)
  created_at    DateTime       @default(now()) @db.Timestamptz(6)
  
  buildings     buildings      @relation(fields: [building_id], references: [id], onDelete: Cascade)
  parking_slots parking_slots[]

  @@unique([building_id, code])
  @@index([building_id])
}

model parking_slots {
  id               String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  zone_id          String         @db.Uuid
  slot_number      String         @db.VarChar(10)   // e.g., "023"
  full_code        String         @db.VarChar(20)   // e.g., "B1-A-023" (computed)
  assigned_apt_id  String?        @db.Uuid
  assigned_at      DateTime?      @db.Timestamptz(6)
  fee_override     Decimal?       @db.Decimal(12, 2)  // null = use zone default
  status           ParkingSlotStatus @default(available)
  notes            String?
  created_at       DateTime       @default(now()) @db.Timestamptz(6)
  updated_at       DateTime       @db.Timestamptz(6)
  
  parking_zones    parking_zones  @relation(fields: [zone_id], references: [id], onDelete: Cascade)
  apartments       apartments?    @relation(fields: [assigned_apt_id], references: [id])

  @@unique([zone_id, slot_number])
  @@index([assigned_apt_id])
  @@index([status])
}

enum ParkingType {
  car
  motorcycle
  bicycle
}

enum ParkingSlotStatus {
  available
  assigned
  reserved
  maintenance
}
```

**Rationale**:
- Two-level hierarchy (Zone → Slots) matches Vietnamese parking structure (basement levels, zones)
- `full_code` is denormalized for quick display without joins
- `fee_override` allows special pricing (VIP owners, oversized vehicles)
- Slot status enables reservation workflows (future)

### 1.3 Apartment Model Updates

```prisma
model apartments {
  // Existing fields...
  
  // Policy overrides (null = inherit from building policy)
  max_residents_override     Int?
  access_card_limit_override Int?
  pet_allowed_override       Boolean?
  pet_limit_override         Int?
  billing_cycle_override     BillingCycle?
  
  // Relations
  car_slots                  parking_slots[] @relation("CarSlots")
  moto_slots                 parking_slots[] @relation("MotoSlots")
}
```

**Rationale**:
- Override fields are nullable; null means "inherit from building"
- We keep `assigned_car_slot`/`assigned_moto_slot` text fields for now (migration compatibility)
- Gradual migration: text fields → relation to `parking_slots`

---

## 2. API Design

### 2.1 Building Policies API

```
GET    /buildings/:id/policies           → List all policies (versioned history)
GET    /buildings/:id/policies/current   → Get currently effective policy
POST   /buildings/:id/policies           → Create new policy version (closes previous)
PATCH  /buildings/:id/policies/:policyId → Update future policy (not yet effective)
```

**Response Format**:
```json
{
  "data": {
    "id": "uuid",
    "defaultMaxResidents": 6,
    "accessCardLimitDefault": 4,
    "petAllowed": true,
    "petLimitDefault": 2,
    "defaultBillingCycle": "monthly",
    "lateFeeRatePercent": 5.00,
    "lateFeeGraceDays": 7,
    "trashCollectionDays": ["monday", "thursday"],
    "trashCollectionTime": "07:00-09:00",
    "trashFeePerMonth": 50000,
    "effectiveFrom": "2024-01-01",
    "effectiveTo": null
  }
}
```

### 2.2 Parking Management API

```
GET    /buildings/:id/parking/zones          → List all zones
POST   /buildings/:id/parking/zones          → Create zone
PATCH  /buildings/:id/parking/zones/:zoneId  → Update zone
DELETE /buildings/:id/parking/zones/:zoneId  → Soft delete zone

GET    /buildings/:id/parking/slots          → List all slots (filter by zone, status)
POST   /buildings/:id/parking/slots/bulk     → Bulk create slots for a zone
PATCH  /parking/slots/:slotId                → Update slot (assign/unassign/notes)

POST   /apartments/:id/parking/assign        → Assign slot to apartment
DELETE /apartments/:id/parking/:slotType     → Unassign slot
GET    /apartments/:id/parking               → Get assigned slots
```

---

## 3. Frontend Architecture

### 3.1 Building Detail Page Tabs

```
/buildings/[id]
├── Overview (existing)
├── Floor Plan (existing)  
├── 3D View (existing)
├── Policies (NEW)         ← Building policies management
└── Parking (NEW)          ← Parking slot inventory
```

### 3.2 Component Structure

```
components/
├── buildings/
│   ├── building-policies-tab.tsx    → Policy form + history viewer
│   ├── building-parking-tab.tsx     → Zone list + slot grid
│   └── parking-slot-grid.tsx        → Visual grid of slots with status
└── apartments/
    ├── apartment-form-dialog.tsx    → Enhanced with policy inheritance
    └── parking-assignment-dialog.tsx → Slot assignment modal
```

### 3.3 Hooks

```typescript
// Building policies
useCurrentBuildingPolicy(buildingId)     → Get current policy
useCreateBuildingPolicy()                → Create new policy
useBuildingPolicyHistory(buildingId)     → List policy versions

// Parking
useParkingZones(buildingId)              → CRUD for zones
useParkingSlots(buildingId, { zoneId?, status? }) → List slots
useAssignParkingSlot()                   → Assign slot to apartment
useUnassignParkingSlot()                 → Unassign slot
useApartmentParking(apartmentId)         → Get slots assigned to apartment
```

---

## 4. Policy Inheritance Logic

### 4.1 Effective Value Calculation

```typescript
// Service method: getEffectiveApartmentConfig()
function getEffectiveValue<T>(
  apartmentOverride: T | null | undefined,
  buildingPolicyValue: T,
  defaultValue: T
): { value: T; source: 'apartment' | 'building' | 'default' } {
  if (apartmentOverride !== null && apartmentOverride !== undefined) {
    return { value: apartmentOverride, source: 'apartment' };
  }
  if (buildingPolicyValue !== null && buildingPolicyValue !== undefined) {
    return { value: buildingPolicyValue, source: 'building' };
  }
  return { value: defaultValue, source: 'default' };
}
```

### 4.2 Apartment Form Behavior

| Field | Building Policy | Apartment Override | Result |
|-------|-----------------|-------------------|--------|
| Max Residents | 6 | null | 6 (from building) |
| Max Residents | 6 | 4 | 4 (override) |
| Pet Allowed | true | null | true (from building) |
| Pet Allowed | true | false | false (owner forbids) |

**UX**: Show toggle "Override building policy" next to each inherited field.

---

## 5. Billing Integration

### 5.1 Monthly Invoice Line Items

When generating monthly invoices, add:

1. **Parking fees**: Sum of all assigned slots' fees
2. **Trash fee**: From building policy (if `trashFeePerMonth > 0`)

```typescript
// billing.processor.ts additions
async generateMonthlyInvoice(contract: Contract) {
  const lineItems = [];
  
  // Existing: rent, management fee, utilities...
  
  // NEW: Parking fees
  const parkingSlots = await this.prisma.parking_slots.findMany({
    where: { assigned_apt_id: contract.apartment_id },
    include: { parking_zones: true }
  });
  
  for (const slot of parkingSlots) {
    const fee = slot.fee_override ?? slot.parking_zones.fee_per_month;
    if (fee) {
      lineItems.push({
        description: `Parking: ${slot.full_code}`,
        amount: fee,
        category: 'parking'
      });
    }
  }
  
  // NEW: Trash fee
  const policy = await this.getEffectiveBuildingPolicy(building.id);
  if (policy?.trashFeePerMonth) {
    lineItems.push({
      description: 'Trash collection fee',
      amount: policy.trashFeePerMonth,
      category: 'trash'
    });
  }
}
```

---

## 6. Migration Strategy

### Phase 1: Schema & API (Backend)
1. Add `building_policies`, `parking_zones`, `parking_slots` tables
2. Add override fields to `apartments`
3. Create API endpoints with Swagger docs
4. Seed default policies for existing buildings

### Phase 2: Frontend Integration
1. Add Building "Policies" tab
2. Add Building "Parking" tab  
3. Update apartment form with policy inheritance UI
4. Add parking assignment dialog

### Phase 3: Billing Integration
1. Add parking/trash line items to invoice generation
2. Add fee category breakdown to invoice detail page

### Migration Script (existing data)
```sql
-- Create default policy for each building
INSERT INTO building_policies (building_id, effective_from, created_at)
SELECT id, CURRENT_DATE, NOW()
FROM buildings
WHERE NOT EXISTS (
  SELECT 1 FROM building_policies bp WHERE bp.building_id = buildings.id
);
```

---

## 7. Testing Strategy

### Unit Tests
- Policy inheritance logic (all override combinations)
- Parking fee calculation
- Slot assignment validation (prevent double-assign)

### Integration Tests
- Full flow: Create zone → Add slots → Assign to apartment → Generate invoice
- Policy versioning: Old invoices use historical policy values

### E2E Tests
- Admin creates building policy → Verify apartment form shows inherited values
- Admin assigns parking slot → Verify shows in apartment detail + invoice

---

## 8. Security Considerations

- **RBAC**: Only `admin` role can modify building policies and parking inventory
- **Audit Logging**: Log all policy changes and parking assignments
- **Input Validation**: Zone codes and slot numbers must be alphanumeric, max lengths enforced
- **Rate Limiting**: Bulk slot creation limited to 500 per request
