# Vully - Building & Apartment Management System

## Executive Summary

Vully is a comprehensive apartment management platform designed for property management companies and building administrators. The system handles the full lifecycle of apartment management including:
- Building and floor plan management (with SVG-based interactive maps)
- Apartment unit tracking with 50+ data fields
- Contract management (rental, purchase, lease-to-own)
- Billing and invoicing with tiered utility pricing
- Incident/maintenance request tracking
- AI-powered chatbot for resident queries

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VULLY DATA MODEL                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────┐        ┌───────────────┐        ┌─────────────┐                │
│   │  BUILDING  │◄───────│   APARTMENT   │───────►│  CONTRACT   │                │
│   │            │  1:N   │               │  1:N   │             │                │
│   └─────┬──────┘        └───────┬───────┘        └──────┬──────┘                │
│         │                       │                       │                        │
│         │                       │ 1:N                   │ 1:N                    │
│         │                       ▼                       ▼                        │
│         │               ┌───────────────┐        ┌─────────────┐                │
│         │               │   INCIDENT    │        │   INVOICE   │                │
│         │               └───────┬───────┘        └──────┬──────┘                │
│         │                       │ 1:N                   │ 1:N                    │
│         │                       ▼                       ▼                        │
│   ┌─────▼──────┐        ┌───────────────┐        ┌─────────────┐                │
│   │  MGMT FEE  │        │   COMMENTS    │        │ LINE ITEMS  │                │
│   │  CONFIG    │        └───────────────┘        └──────┬──────┘                │
│   └────────────┘                                        │                        │
│                                                         │ N:1                    │
│   ┌────────────┐        ┌───────────────┐              ▼                        │
│   │   USER     │───────►│ METER READING │◄─────┌─────────────┐                  │
│   │            │  1:N   │               │ N:1  │ UTILITY TYPE│                  │
│   └────────────┘        └───────────────┘      └──────┬──────┘                  │
│         │                                             │ 1:N                      │
│         │ N:M                                         ▼                          │
│         ▼                                      ┌─────────────┐                   │
│   ┌────────────┐                               │UTILITY TIER │                   │
│   │   ROLES    │                               └─────────────┘                   │
│   └────────────┘                                                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### 1. Building

The top-level entity representing a physical building/property.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String(255) | Building name (e.g., "Tomtown Tower A") |
| `address` | String | Full street address |
| `city` | String(100) | City name |
| `floorCount` | Integer | Total number of floors |
| `svgMapData` | Text (nullable) | SVG markup for interactive floor plans |
| `floorHeights` | JSON (nullable) | Per-floor height data for 3D rendering |
| `amenities` | JSON Array | List of amenities (pool, gym, parking, etc.) |
| `isActive` | Boolean | Whether building is active in system |
| `created_at` | Timestamp | Creation timestamp |
| `updatedAt` | Timestamp | Last update timestamp |

**Relationships:**
- Has many `apartments`
- Has many `management_fee_configs`
- Has many `utility_tiers`

**Key Features:**
- SVG-based floor plan support allows interactive apartment selection
- Floor heights enable 3D building visualization
- Amenities stored as JSON for flexibility

---

### 2. Apartment

The core entity representing a residential/commercial unit within a building.

#### 2.1 Architectural & Spatial Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `buildingId` | UUID (FK) | Reference to parent building |
| `apartmentCode` | String(30) | Unique human-readable code (e.g., "TT-A-1201") |
| `unit_number` | String(20) | Unit number on floor (e.g., "101", "A-12") |
| `floorIndex` | Integer | Zero-based floor number |
| `floorLabel` | String(10) | Display label (e.g., "G", "M", "12") |
| `unitType` | Enum | Type of unit (see UnitType enum) |
| `grossArea` | Decimal(10,2) | Total area including walls (m²) |
| `netArea` | Decimal(10,2) | Usable/livable area (m²) |
| `ceilingHeight` | Decimal(4,2) | Ceiling height in meters |
| `bedroomCount` | Integer | Number of bedrooms |
| `bathroomCount` | Integer | Number of bathrooms |
| `orientation` | Enum | Main window direction (see Orientation enum) |
| `balconyDirection` | Enum | Balcony facing direction |
| `isCornerUnit` | Boolean | Whether unit is a corner unit |

#### 2.2 SVG/Map Integration Fields

| Field | Type | Description |
|-------|------|-------------|
| `svgElementId` | String | ID attribute in building SVG |
| `svgPathData` | Text | SVG path data for unit outline |
| `centroidX` | Decimal(10,4) | X-coordinate for labels/markers |
| `centroidY` | Decimal(10,4) | Y-coordinate for labels/markers |

#### 2.3 Ownership & Legal Fields

| Field | Type | Description |
|-------|------|-------------|
| `ownerId` | UUID (FK) | Reference to owner user (if investor-owned) |
| `ownershipType` | Enum | Type of ownership (see OwnershipType enum) |
| `pinkBookId` | String(50) | Vietnamese property certificate number |
| `handoverDate` | Date | When unit was handed over to owner |
| `warrantyExpiryDate` | Date | Builder warranty expiry |
| `isRented` | Boolean | Currently under rental contract |
| `vatRate` | Decimal(5,2) | Applicable VAT percentage |

#### 2.4 Occupancy Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | Enum | Current status (see ApartmentStatus enum) |
| `maxResidents` | Integer | Maximum allowed residents |
| `currentResidentCount` | Integer | Actual resident count |
| `petAllowed` | Boolean | Whether pets are permitted |
| `petLimit` | Integer | Maximum number of pets |
| `accessCardLimit` | Integer | Max access cards for unit |
| `intercomCode` | String(20) | Intercom/buzzer code |

#### 2.5 Utility & Technical Fields

| Field | Type | Description |
|-------|------|-------------|
| `electricMeterId` | String(50) | Electric meter identifier |
| `waterMeterId` | String(50) | Water meter identifier |
| `gasMeterId` | String(50) | Gas meter identifier |
| `powerCapacity` | Integer | Electrical capacity in Amps |
| `acUnitCount` | Integer | Number of AC units |
| `fireDetectorId` | String(50) | Fire detector device ID |
| `sprinklerCount` | Integer | Number of sprinkler heads |
| `internetTerminalLoc` | String(255) | Internet terminal location |

#### 2.6 Parking & Asset Fields

| Field | Type | Description |
|-------|------|-------------|
| `assignedCarSlot` | String(30) | Assigned car parking slot |
| `assignedMotoSlot` | String(30) | Assigned motorcycle slot |
| `mailboxNumber` | String(20) | Mailbox number |
| `storageUnitId` | String(30) | Storage room identifier |

#### 2.7 Billing Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `mgmtFeeConfigId` | UUID (FK) | Reference to fee pricing config |
| `billingStartDate` | Date | When billing should start |
| `billingCycle` | Enum | Billing frequency (monthly/quarterly/yearly) |
| `bankAccountVirtual` | String(30) | Virtual account for payments |
| `lateFeeWaived` | Boolean | Whether late fees are waived |

#### 2.8 System & Admin Fields

| Field | Type | Description |
|-------|------|-------------|
| `parentUnitId` | UUID (FK) | Parent unit if merged |
| `isMerged` | Boolean | Whether unit is merged from multiple |
| `syncStatus` | Enum | IoT sync status |
| `portalAccessEnabled` | Boolean | Tenant portal access |
| `technicalDrawingUrl` | URL | Link to technical drawings |
| `notesAdmin` | Text | Admin-only notes |
| `features` | JSON | Additional flexible features |

**Relationships:**
- Belongs to one `building`
- Has many `contracts`
- Has many `incidents`
- Has many `meter_readings`
- Can have parent apartment (for merged units)
- Can have child apartments

---

### 3. Contract

Represents a legal agreement between property and tenant/buyer.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `apartmentId` | UUID (FK) | Reference to apartment |
| `tenantId` | UUID (FK) | Reference to tenant/buyer user |
| `status` | Enum | Contract status (draft/active/expired/terminated) |
| `start_date` | Date | Contract start date |
| `end_date` | Date (nullable) | Contract end date (null = open-ended) |
| `rent_amount` | Decimal(12,2) | Monthly rent amount (rental contracts) |
| `deposit_months` | Integer | Number of deposit months |
| `deposit_amount` | Decimal(12,2) | Total deposit amount |
| `citizen_id` | String(30) | Tenant's national ID (CMND/CCCD) |
| `number_of_residents` | Integer | Number of registered residents |
| `terms_notes` | Text | Contract type metadata + additional terms |
| `created_by` | UUID (FK) | User who created the contract |

**Contract Types (stored in `terms_notes`):**

1. **Rental** - Standard monthly/yearly lease
   - Fields: `rentAmount`, `depositMonths`, `paymentDueDay`
   
2. **Purchase** - Property sale/ownership transfer
   - Fields: `purchasePrice`, `downPayment`, `transferDate`, `paymentSchedule`
   
3. **Lease-to-Own** - Rent with option to buy
   - Fields: `rentAmount`, `optionFee`, `purchaseOptionPrice`, `optionPeriodMonths`, `rentCreditPercent`

**Relationships:**
- Belongs to one `apartment`
- Belongs to one `user` (tenant)
- Has many `invoices`

---

### 4. Invoice

Represents a billing document generated for a contract.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `contractId` | UUID (FK) | Reference to contract |
| `invoice_number` | String(50) | Unique invoice number |
| `billing_period` | String(7) | Period in YYYY-MM format |
| `issue_date` | Date | When invoice was issued |
| `due_date` | Date | Payment due date |
| `status` | Enum | Status (pending/paid/overdue/cancelled) |
| `subtotal` | Decimal(12,2) | Pre-tax total |
| `tax_amount` | Decimal(12,2) | Tax amount |
| `total_amount` | Decimal(12,2) | Grand total |
| `paid_amount` | Decimal(12,2) | Amount paid so far |
| `paid_at` | Timestamp | When payment was received |
| `notes` | Text | Additional notes |
| `price_snapshot` | JSON | Snapshot of prices at generation time |

**Relationships:**
- Belongs to one `contract`
- Has many `invoice_line_items`

---

### 5. Invoice Line Item

Individual charge on an invoice.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `invoiceId` | UUID (FK) | Reference to invoice |
| `description` | String(255) | Line item description |
| `quantity` | Decimal(12,2) | Quantity/usage |
| `unit_price` | Decimal(12,4) | Price per unit |
| `amount` | Decimal(12,2) | Line total |
| `utilityTypeId` | UUID (FK) | Reference to utility type (if utility charge) |
| `meterReadingId` | UUID (FK) | Reference to meter reading |
| `tier_breakdown` | JSON | Breakdown by pricing tiers |

---

### 6. Meter Reading

Records utility consumption for billing.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `apartmentId` | UUID (FK) | Reference to apartment |
| `utilityTypeId` | UUID (FK) | Reference to utility type |
| `current_value` | Decimal(12,2) | Current meter reading |
| `previous_value` | Decimal(12,2) | Previous meter reading |
| `billing_period` | String(7) | Period in YYYY-MM format |
| `reading_date` | Date | When reading was taken |
| `recorded_by` | UUID (FK) | User who recorded |
| `image_proof_url` | URL | Photo evidence of reading |

---

### 7. Incident

Maintenance/issue tickets.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `apartmentId` | UUID (FK) | Reference to apartment |
| `reported_by` | UUID (FK) | User who reported |
| `assigned_to` | UUID (FK) | Technician assigned |
| `category` | Enum | Issue category |
| `priority` | Enum | Priority level |
| `status` | Enum | Current status |
| `title` | String(255) | Issue title |
| `description` | Text | Detailed description |
| `image_urls` | JSON Array | Uploaded images |
| `resolved_at` | Timestamp | Resolution time |
| `resolution_notes` | Text | How it was resolved |

**Relationships:**
- Belongs to one `apartment`
- Has many `incident_comments`

---

### 8. User

System users including admins, technicians, and residents.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `email` | String(255) | Unique email address |
| `password_hash` | String(255) | Bcrypt password hash |
| `role` | Enum | Primary role (legacy field) |
| `first_name` | String(100) | First name |
| `last_name` | String(100) | Last name |
| `phone` | String(20) | Phone number |
| `profile_data` | JSON | Additional profile data |
| `is_active` | Boolean | Account active status |

**Multi-Role Support:**
Users can have multiple roles via `user_role_assignments` table. Permissions are union of all assigned roles.

---

## Enumerations

### ApartmentStatus
- `vacant` - Available for rent/sale
- `occupied` - Currently has active contract
- `maintenance` - Under renovation/repair
- `reserved` - Reserved but not yet contracted

### UnitType
- `studio` - Studio apartment
- `one_bedroom` - 1BR
- `two_bedroom` - 2BR
- `three_bedroom` - 3BR
- `duplex` - Duplex unit
- `penthouse` - Penthouse
- `shophouse` - Commercial unit

### OwnershipType
- `developer_owned` - Still owned by developer
- `investor_owned` - Owned by individual investor
- `management_owned` - Owned by management company

### Orientation
- `north`, `south`, `east`, `west`
- `northeast`, `northwest`, `southeast`, `southwest`

### BillingCycle
- `monthly` - Monthly billing for service fees
- `quarterly` - Quarterly billing
- `yearly` - Annual billing

### SyncStatus
- `synced` - IoT devices in sync
- `pending` - Sync pending
- `error` - Sync error
- `disconnected` - No IoT connection

### ContractStatus
- `draft` - Not yet active
- `active` - Currently active
- `expired` - Natural expiry
- `terminated` - Early termination

### InvoiceStatus
- `pending` - Awaiting payment
- `paid` - Fully paid
- `partial` - Partially paid
- `overdue` - Past due date
- `cancelled` - Cancelled

### IncidentCategory
- `plumbing` - Water/pipe issues
- `electrical` - Electrical issues
- `hvac` - Air conditioning/heating
- `structural` - Building structure
- `appliance` - Appliance repairs
- `pest` - Pest control
- `noise` - Noise complaints
- `security` - Security issues
- `other` - Other

### IncidentPriority
- `low` - Minor inconvenience
- `medium` - Normal priority
- `high` - Urgent but not emergency
- `urgent` - Requires immediate attention

### IncidentStatus
- `open` - Newly reported
- `in_progress` - Being worked on
- `resolved` - Fixed
- `closed` - Verified and closed

### UserRole
- `admin` - Full system access
- `manager` - Building management
- `technician` - Maintenance staff
- `resident` - Apartment resident/tenant

---

## Key Business Flows

### 1. Contract Creation Flow

```
1. Admin selects VACANT apartment
2. Admin selects/creates tenant user
3. Admin chooses contract type (Rental/Purchase/Lease-to-Own)
4. System validates apartment availability
5. Contract created with status=ACTIVE
6. Apartment status automatically set to OCCUPIED
7. Apartment.isRented set to TRUE
```

### 2. Monthly Billing Flow

```
1. BullMQ job triggers at month end
2. System fetches all ACTIVE contracts
3. For each contract:
   a. Fetch meter readings for billing period
   b. Apply tiered utility pricing
   c. Calculate management fees (pricePerSqm × area)
   d. Generate invoice with line items
   e. Send notification to tenant
4. Job status tracked in billing_jobs table
```

### 3. Incident Resolution Flow

```
1. Resident creates incident via portal
2. System notifies admins via WebSocket
3. Admin assigns to technician
4. Technician updates status to IN_PROGRESS
5. Technician adds comments/photos
6. Technician resolves and adds resolution notes
7. System notifies resident
8. Resident can reopen if not satisfied
```

---

## Potential Improvements & Missing Features

### High Priority

1. **Payment Tracking System** (NEW PROPOSAL CREATED)
   - Currently no way to track rent/purchase payments
   - Need `contract_payment_schedules` table for milestones/periods
   - Need `contract_payments` table for actual transactions
   - See: `openspec/changes/add-payment-tracking/proposal.md`
   - Enables: payment history, remaining balance, overdue tracking

2. **Dedicated Contract Type Fields**
   - Currently, purchase/lease-to-own data stored in `terms_notes` as text
   - Should add proper columns: `purchase_price`, `down_payment`, `transfer_date`, `option_fee`, etc.
   - Migration path: Parse existing `terms_notes` and populate new fields

3. **Resident Profile Entity**
   - Current system relies on contract.numberOfResidents
   - Should add `residents` table with each person's details
   - Fields: name, ID number, relationship to tenant, move-in date, etc.

4. **Vehicle Registration**
   - Current: only `assignedCarSlot` and `assignedMotoSlot` strings
   - Need: `vehicles` table with license plates, owner, type, permit validity

### Medium Priority

5. **Amenity Booking System**
   - Add `amenity_bookings` table
   - Support pool, gym, meeting room reservations
   - Conflict detection and time slot management

6. **Visitor Management**
   - `visitor_registrations` table
   - Pre-registration, check-in/check-out logs
   - QR code generation for access

7. **Utility Rate History**
   - Currently using `effective_from`/`effective_to` on utility_tiers
   - Need audit trail of historical rates for disputes

8. **Multi-Building Tenant**
   - Support tenants with units in multiple buildings
   - Consolidated billing option

### Lower Priority

9. **Document Storage**
   - Contract PDFs, ID scans, lease agreements
   - Proper file storage with versioning

10. **SMS/Push Notifications**
    - Currently only system notifications
    - Add SMS for payment reminders
    - Mobile push for incidents

11. **Owner Portal**
    - Separate portal for property investors
    - Rental income reports, occupancy stats

12. **Accounting Integration**
    - Currently skeleton `accounting` module
    - Chart of accounts, journal entries
    - Financial reporting

---

## Technical Architecture

### Backend Stack
- **Framework**: NestJS (Modular Architecture)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis 7+ with BullMQ
- **Real-time**: Socket.IO WebSocket Gateway
- **AI**: LangChain.js with pgvector for RAG

### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: Shadcn/UI + Tailwind CSS
- **State**: TanStack Query + Zustand + Nuqs
- **Forms**: React-Hook-Form + Zod
- **Maps**: Custom SVG with D3.js

### Data Validation
- Shared Zod schemas in `@vully/shared-types` package
- Same schemas used for:
  - API request validation (NestJS DTOs)
  - Frontend form validation
  - Type generation

---

## Database Indexes

Key indexes for query performance:

```sql
-- Apartment lookups
CREATE INDEX idx_apartments_building ON apartments(building_id);
CREATE INDEX idx_apartments_status ON apartments(status);
CREATE INDEX idx_apartments_floor ON apartments(floor_index);

-- Contract queries
CREATE INDEX idx_contracts_apartment ON contracts(apartment_id);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- Billing queries
CREATE INDEX idx_invoices_contract ON invoices(contract_id);
CREATE INDEX idx_invoices_period ON invoices(billing_period);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Incident tracking
CREATE INDEX idx_incidents_apartment ON incidents(apartment_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
```

---

## API Endpoints Summary

| Resource | Endpoints |
|----------|-----------|
| Buildings | GET /buildings, POST /buildings, GET /buildings/:id, PATCH /buildings/:id |
| Apartments | GET /apartments, POST /apartments, GET /apartments/:id, PATCH /apartments/:id |
| Contracts | GET /contracts, POST /contracts, GET /contracts/:id, PATCH /contracts/:id, POST /contracts/:id/terminate |
| Invoices | GET /invoices, POST /invoices, GET /invoices/:id, POST /invoices/:id/pay |
| Incidents | GET /incidents, POST /incidents, GET /incidents/:id, PATCH /incidents/:id |
| Users | GET /users, POST /users, GET /users/:id, PATCH /users/:id |

---

*Document Version: 1.0*
*Last Updated: April 3, 2026*
