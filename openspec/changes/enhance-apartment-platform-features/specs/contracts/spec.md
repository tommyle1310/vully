# Contracts Capability - Spec Delta

## MODIFIED Requirements

### Requirement: Contract Creation with Type-Specific Fields

The system SHALL accept all contract type-specific fields when creating a contract via `POST /contracts`.

**Changed from:** Frontend only sends base fields and stores type-specific data in `termsNotes` text blob.

**Changed to:** Frontend sends actual typed fields (`contractType`, `purchasePrice`, `downPayment`, `transferDate`, etc.) which are persisted to dedicated database columns.

#### Scenario: Create a purchase contract with all fields

**Given** an admin user with valid credentials
**And** an available apartment "Unit 101"
**And** a registered buyer user

**When** the admin creates a contract with:
| Field | Value |
|-------|-------|
| contractType | purchase |
| apartmentId | <apartment-uuid> |
| tenantId | <buyer-uuid> |
| start_date | 2026-04-03 |
| end_date | 2030-04-03 |
| purchasePrice | 4000000000 |
| downPayment | 1000000000 |
| transferDate | 2026-05-03 |

**Then** the contract is created with status "active"
**And** the database record contains:
| Column | Value |
|--------|-------|
| contract_type | purchase |
| purchase_price | 4000000000 |
| down_payment | 1000000000 |
| transfer_date | 2026-05-03 |

**And** the `termsNotes` field contains human-readable summary for display

#### Scenario: Create a lease-to-own contract with option fields

**Given** an admin user with valid credentials
**And** an available apartment

**When** the admin creates a contract with:
| Field | Value |
|-------|-------|
| contractType | lease_to_own |
| rentAmount | 15000000 |
| optionFee | 50000000 |
| purchaseOptionPrice | 3500000000 |
| optionPeriodMonths | 24 |
| rentCreditPercent | 30 |

**Then** the contract is created with status "active"
**And** the database record contains correct values for all option fields

---

## ADDED Requirements

### Requirement: Generate Purchase Payment Milestones

The system SHALL provide an endpoint to auto-generate payment schedule milestones for purchase contracts.

#### Scenario: Generate default purchase milestones

**Given** an active purchase contract with:
| Field | Value |
|-------|-------|
| purchasePrice | 4000000000 |
| downPayment | 1200000000 |
| start_date | 2026-04-01 |
| transferDate | 2027-04-01 |

**When** admin calls `POST /contracts/:id/generate-purchase-milestones`

**Then** the system creates payment schedules:
| Type | Amount | Due Date | Description |
|------|--------|----------|-------------|
| down_payment | 1200000000 | 2026-04-01 | Down Payment |
| purchase | 700000000 | 2026-07-01 | Progress Payment 1 |
| purchase | 700000000 | 2026-10-01 | Progress Payment 2 |
| purchase | 700000000 | 2027-01-01 | Progress Payment 3 |
| purchase | 700000000 | 2027-04-01 | Final Payment - Property Transfer |

**And** the response includes all created schedules

#### Scenario: Generate milestones with custom progress payment count

**Given** an active purchase contract

**When** admin calls `POST /contracts/:id/generate-purchase-milestones` with:
```json
{ "progressPaymentCount": 5 }
```

**Then** the system creates 7 payment schedules (down + 5 progress + final)

#### Scenario: Reject milestone generation for non-purchase contract

**Given** an active rental contract

**When** admin calls `POST /contracts/:id/generate-purchase-milestones`

**Then** the system returns HTTP 400 Bad Request
**And** error message indicates contract must be of type "purchase"

---

## MODIFIED Requirements

### Requirement: Contract Response DTO

The contract response DTO SHALL include all payment tracking fields.

**Changed from:** Response only includes base rental fields.

**Changed to:** Response includes:
- `contractType: 'rental' | 'purchase' | 'lease_to_own'`
- `purchasePrice?: number`
- `downPayment?: number`
- `transferDate?: string`
- `optionFee?: number`
- `purchaseOptionPrice?: number`
- `optionPeriodMonths?: number`
- `rentCreditPercent?: number`
- `paymentDueDay?: number`

#### Scenario: Get purchase contract returns all fields

**Given** a purchase contract with all fields populated

**When** fetching `GET /contracts/:id`

**Then** the response includes all type-specific fields with correct values
