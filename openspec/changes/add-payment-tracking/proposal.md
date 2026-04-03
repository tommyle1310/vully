# Payment Tracking System Design

## Overview

This proposal adds comprehensive payment tracking for Vully to properly manage:
- **Rental Payments** - Monthly rent from tenants
- **Purchase Installments** - Milestone-based payments for property purchases
- **Lease-to-Own Payments** - Hybrid of rental + purchase option accumulation

Currently, the system only tracks **Service Fees** (management, parking, utilities) via the `invoices` table. This proposal adds separate tracking for contract payments.

---

## Problem Statement

### Current Limitations
1. No way to track individual rent/purchase payments
2. Cannot record partial payments
3. No payment schedule milestones for purchases
4. Cannot calculate remaining balance or payment status
5. Purchase price/down payment stored in `terms_notes` as text (not queryable)

### User Stories
1. **As BQL (Building Management)**, I need to see which tenants have paid this month's rent
2. **As BQL**, I need to track purchase payment milestones and remaining balance
3. **As BQL**, I need to record partial payments when received
4. **As an admin**, I need reports on payment status across all contracts

---

## Proposed Database Schema

### Option A: Unified Payment Table (Recommended)

```prisma
// Payment schedule entries - can be generated or manual
model contract_payment_schedules {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  contract_id     String   @db.Uuid
  
  // Payment info
  period_label    String   @db.VarChar(100)  // "Downpayment", "Rent Apr 2026", "Milestone: Foundation"
  payment_type    PaymentType
  sequence_number Int      // Order for display
  
  // Amounts
  due_date        DateTime @db.Date
  expected_amount Decimal  @db.Decimal(15, 2)
  received_amount Decimal  @default(0) @db.Decimal(15, 2)
  
  // Status (computed or stored)
  status          PaymentStatus @default(pending)
  
  // Metadata
  notes           String?
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  updated_at      DateTime @db.Timestamptz(6)
  
  // Relations
  contracts       contracts @relation(fields: [contract_id], references: [id], onDelete: Cascade)
  payments        contract_payments[]
  
  @@index([contract_id, due_date])
  @@index([status])
}

// Individual payment transactions
model contract_payments {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schedule_id         String   @db.Uuid
  
  // Payment details
  amount              Decimal  @db.Decimal(15, 2)
  payment_date        DateTime @db.Date
  payment_method      PaymentMethod?
  reference_number    String?  @db.VarChar(100)  // Bank transfer ref, receipt no.
  
  // Who recorded it
  recorded_by         String   @db.Uuid
  recorded_at         DateTime @default(now()) @db.Timestamptz(6)
  
  // Evidence
  receipt_url         String?
  notes               String?
  
  // Relations
  schedule            contract_payment_schedules @relation(fields: [schedule_id], references: [id], onDelete: Cascade)
  users               users @relation(fields: [recorded_by], references: [id])
  
  @@index([schedule_id])
}

enum PaymentType {
  downpayment      // Initial payment for purchase/lease-to-own
  installment      // Purchase milestone payment
  rent             // Monthly rental payment
  deposit          // Security deposit
  option_fee       // Lease-to-own option fee
  penalty          // Late fee or penalty
  adjustment       // Manual adjustment
}

enum PaymentStatus {
  pending          // Not yet due or waiting
  partial          // Some payment received
  paid             // Fully paid
  overdue          // Past due date, not fully paid
  waived           // Waived/forgiven
}

enum PaymentMethod {
  bank_transfer
  cash
  check
  card
  other
}
```

### Schema Changes to Contracts Table

```prisma
model contracts {
  // ... existing fields ...
  
  // NEW: Dedicated financial fields (migrate from terms_notes)
  contract_type       ContractType  @default(rental)
  purchase_price      Decimal?      @db.Decimal(15, 2)
  down_payment        Decimal?      @db.Decimal(15, 2)
  transfer_date       DateTime?     @db.Date
  option_fee          Decimal?      @db.Decimal(15, 2)
  purchase_option_price Decimal?    @db.Decimal(15, 2)
  option_period_months Int?
  rent_credit_percent  Decimal?     @db.Decimal(5, 2)
  payment_due_day     Int?          // Day of month for rent (1-28)
  
  // Relations
  payment_schedules   contract_payment_schedules[]
}

enum ContractType {
  rental
  purchase
  lease_to_own
}
```

---

## API Endpoints

### Payment Schedules

```
GET    /contracts/:id/payment-schedules
POST   /contracts/:id/payment-schedules      # Create schedule entry
PATCH  /payment-schedules/:id                # Update schedule
DELETE /payment-schedules/:id
```

### Payment Transactions

```
POST   /payment-schedules/:id/payments       # Record a payment
GET    /contracts/:id/payments               # All payments for contract
DELETE /payments/:id                         # Void a payment (soft delete)
```

### Bulk Operations

```
POST   /contracts/:id/generate-rent-schedule # Auto-generate 12 months of rent entries
POST   /contracts/:id/generate-purchase-milestones # Create from payment schedule text
```

---

## UI Components

### 1. Contract Detail - Payment Schedule Table

```tsx
// Shows milestones/periods with status
<PaymentScheduleTable 
  contractId={contract.id}
  schedules={schedules}
  onRecordPayment={(scheduleId) => openPaymentDialog(scheduleId)}
/>

// Table columns:
// | Period/Milestone | Due Date | Expected | Received | Balance | Status | Actions |
// | Downpayment      | 02/04/26 | 500M     | 500M     | 0       | ✅ Paid | View    |
// | May 2026 Rent    | 05/05/26 | 10M      | 5M       | 5M      | ⚠️ Partial | Record |
```

### 2. Record Payment Dialog

```tsx
<RecordPaymentDialog
  schedule={selectedSchedule}
  onSubmit={(data) => createPayment(data)}
/>

// Fields:
// - Amount (pre-filled with remaining balance)
// - Payment Date
// - Payment Method (dropdown)
// - Reference Number
// - Notes
// - Receipt Upload (optional)
```

### 3. Contract Financial Summary Card

```tsx
<ContractFinancialSummary contract={contract} />

// Shows:
// - Total Contract Value: 3,000,000,000 VND
// - Total Paid: 520,000,000 VND (17.3%)
// - Outstanding: 30,000,000 VND (debt)
// - Remaining Balance: 2,450,000,000 VND
// - Next Due: May 5, 2026 - 50,000,000 VND
```

### 4. Apartment Detail Sheet Updates

The apartment detail sheet now shows contract-type-specific financial info. Once payment schedules exist, it will also show:
- Payment progress indicator
- Next payment due
- Link to full payment schedule

---

## Migration Strategy

### Phase 1: Schema Migration
1. Add new tables: `contract_payment_schedules`, `contract_payments`
2. Add new enums: `PaymentType`, `PaymentStatus`, `PaymentMethod`, `ContractType`
3. Add new columns to `contracts` table

### Phase 2: Data Migration
1. Parse existing `terms_notes` to populate new contract fields
2. For active rental contracts, auto-generate payment schedules (past months marked as paid)
3. For purchase contracts, create milestone schedules from payment schedule text

### Phase 3: UI Updates
1. Add payment schedule table to contract detail page
2. Add record payment dialog
3. Update apartment detail sheet (already done)
4. Add payment reports dashboard

---

## Business Logic

### Auto-Generation of Rent Schedules
```typescript
// When creating rental contract, generate 12 months of schedules
async function generateRentSchedules(contract: Contract) {
  const schedules = [];
  const startDate = new Date(contract.start_date);
  
  for (let i = 0; i < 12; i++) {
    const dueDate = addMonths(startDate, i);
    dueDate.setDate(contract.payment_due_day || 5);
    
    schedules.push({
      contract_id: contract.id,
      period_label: `Rent ${format(dueDate, 'MMM yyyy')}`,
      payment_type: 'rent',
      sequence_number: i + 1,
      due_date: dueDate,
      expected_amount: contract.rent_amount,
      status: isPast(dueDate) ? 'overdue' : 'pending',
    });
  }
  
  return prisma.contract_payment_schedules.createMany({ data: schedules });
}
```

### Status Calculation
```typescript
function calculatePaymentStatus(schedule: PaymentSchedule): PaymentStatus {
  if (schedule.received_amount >= schedule.expected_amount) return 'paid';
  if (schedule.received_amount > 0) return 'partial';
  if (isPast(schedule.due_date)) return 'overdue';
  return 'pending';
}
```

### Contract Summary Calculation
```typescript
function calculateContractSummary(contract: Contract, schedules: PaymentSchedule[]) {
  const totalExpected = schedules.reduce((sum, s) => sum + s.expected_amount, 0);
  const totalReceived = schedules.reduce((sum, s) => sum + s.received_amount, 0);
  const outstanding = schedules
    .filter(s => s.status === 'overdue' || s.status === 'partial')
    .reduce((sum, s) => sum + (s.expected_amount - s.received_amount), 0);
  
  return {
    totalContractValue: contract.purchase_price || (contract.rent_amount * 12),
    totalPaid: totalReceived,
    paidPercent: (totalReceived / totalExpected) * 100,
    outstanding,
    remainingBalance: totalExpected - totalReceived,
    nextDue: schedules.find(s => s.status === 'pending'),
  };
}
```

---

## Implementation Tasks

### Backend
- [ ] Create Prisma migration for new tables and enums
- [ ] Create DTOs and Zod schemas in shared-types
- [ ] Implement PaymentScheduleService
- [ ] Implement PaymentService
- [ ] Add API endpoints in ContractsModule
- [ ] Add auto-generation logic for rent schedules
- [ ] Add data migration script for existing contracts

### Frontend
- [ ] Create PaymentScheduleTable component
- [ ] Create RecordPaymentDialog component
- [ ] Create ContractFinancialSummary component
- [ ] Add TanStack Query hooks for payment data
- [ ] Update contract detail page with payment schedule
- [ ] Add payment reports page

### Testing
- [ ] Unit tests for payment calculations
- [ ] Integration tests for payment recording
- [ ] E2E test for full payment workflow

---

## Open Questions

1. **Should we support recurring schedules?** Auto-generate next month's rent when previous is paid?
2. **Partial payment allocation**: If paying less than expected, should it auto-allocate to oldest debt?
3. **Integration with invoices**: Should rent payments link to the invoices table or stay separate?
4. **Notifications**: Email/push when payment is overdue?

---

## Timeline Estimate

- **Phase 1 (Schema)**: 1 day
- **Phase 2 (Backend API)**: 2-3 days
- **Phase 3 (Frontend)**: 3-4 days
- **Phase 4 (Testing + Polish)**: 2 days

**Total: ~8-10 days**

---

*Proposal Version: 1.0*  
*Created: April 3, 2026*
