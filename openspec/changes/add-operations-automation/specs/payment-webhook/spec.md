# Spec Delta: Payment Webhook (VietQR Auto-Sync)

## ADDED Requirements

### Requirement: Payment Webhook Endpoint
The system SHALL provide a `POST /api/v1/payments/webhook` endpoint that receives payment notifications from VietQR-compatible gateways (PayOS, Casso, SePay).

#### Scenario: PayOS webhook received with valid signature
- **GIVEN** a PayOS webhook payload with valid checksum
- **WHEN** the webhook is received at `/api/v1/payments/webhook`
- **THEN** the system extracts `payment_reference` from transfer description
- **AND** locates the matching invoice by `payment_reference`
- **AND** updates invoice status to `paid`
- **AND** stores `external_transaction_id` for idempotency
- **AND** stores `raw_gateway_response` for audit
- **AND** returns HTTP 200

#### Scenario: Webhook with invalid signature
- **GIVEN** a webhook payload with invalid checksum
- **WHEN** the webhook is received
- **THEN** the system returns HTTP 401 Unauthorized
- **AND** logs the rejected attempt

#### Scenario: Duplicate webhook (idempotency)
- **GIVEN** a webhook with `external_transaction_id` already processed
- **WHEN** the webhook is received again
- **THEN** the system returns HTTP 200 with `status: already_processed`
- **AND** does NOT update invoice again
- **NOTE**: Idempotency check MUST use `prisma.$transaction()` to atomically check AND update to prevent race conditions

#### Scenario: Invoice not found (unmatched payment)
- **GIVEN** a webhook with `payment_reference` that matches no invoice
- **WHEN** the webhook is processed
- **THEN** the system stores the transaction in `unmatched_payments` table with `status: pending`
- **AND** emits `payment.unmatched` WebSocket event to accountants
- **AND** returns HTTP 200 (acknowledge receipt)

#### Scenario: Accountant manually matches unmatched payment
- **GIVEN** an accountant with unmatched payment record
- **WHEN** the accountant calls `POST /api/v1/unmatched-payments/{id}/match` with `{ invoiceId }`
- **THEN** the system updates the matched invoice status to `paid`
- **AND** updates unmatched payment `status: matched`, `matched_invoice_id`, `matched_by`, `matched_at`
- **AND** emits `payment.completed` event

#### Scenario: Accountant rejects unmatched payment
- **GIVEN** an accountant with unmatched payment record
- **WHEN** the accountant calls `POST /api/v1/unmatched-payments/{id}/reject` with `{ reason }`
- **THEN** the system updates unmatched payment `status: rejected`, `rejection_reason`
- **AND** logs rejection for audit

---

### Requirement: Manual Re-sync / Reconciliation
The system SHALL support manual reconciliation of recent transactions from gateway APIs.

#### Scenario: Accountant triggers manual reconciliation
- **GIVEN** an accountant suspects missed webhooks
- **WHEN** the accountant calls `POST /api/v1/payments/reconcile` with `{ gateway: 'payos' }`
- **THEN** the system fetches last 24h transactions from PayOS API
- **AND** processes each transaction that doesn't exist in invoices or unmatched_payments
- **AND** returns summary: `{ processed: N, matched: M, unmatched: K }`

#### Scenario: Scheduled daily reconciliation
- **GIVEN** a BullMQ cron job scheduled at 6 AM
- **WHEN** the job runs
- **THEN** the system reconciles transactions from all configured gateways
- **AND** logs any newly discovered unmatched payments

---

### Requirement: Payment Reference Generation
The system SHALL generate a unique `payment_reference` for each invoice at creation time.

#### Scenario: Invoice created with payment reference
- **GIVEN** a new invoice is being created
- **WHEN** the invoice is saved
- **THEN** the system generates a `payment_reference` in format `VULLY-INV-{6-char-suffix}`
- **AND** ensures uniqueness across all invoices

---

### Requirement: Real-time Payment Notification
The system SHALL emit a WebSocket event when a payment is successfully reconciled.

#### Scenario: Payment confirmed emits event
- **GIVEN** an invoice payment is confirmed via webhook
- **WHEN** the invoice status is updated to `paid`
- **THEN** the system emits `payment.completed` event via Socket.IO
- **AND** the event includes `invoiceId`, `contractId`, `amount`, and `paidAt`

---

### Requirement: Notification Queue Integration
The system SHALL enqueue a notification job when payment is confirmed.

#### Scenario: Payment pushes notification to queue
- **GIVEN** an invoice is marked as paid
- **WHEN** the webhook processing completes
- **THEN** the system adds a `payment_confirmed` notification job to BullMQ
- **AND** the job includes tenant user_id and invoice details

---

## Schema Changes

### Invoice Model Extensions
```prisma
model invoices {
  // Existing fields...
  
  // NEW: Payment reconciliation fields
  payment_reference      String?  @unique @db.VarChar(30)  // VULLY-INV-xxxxxx
  external_transaction_id String? @db.VarChar(100)        // Gateway tx ID
  raw_gateway_response   Json?                            // Full webhook payload
}
```

### Contract Payment Schedule Extensions
```prisma
model contract_payment_schedules {
  // Existing fields...
  
  // NEW: Payment reconciliation fields
  payment_reference      String?  @unique @db.VarChar(30)  // VULLY-CTR-xxxxxx
  external_transaction_id String? @db.VarChar(100)
  raw_gateway_response   Json?
}
```

### Unmatched Payments Model (NEW)
```prisma
model unmatched_payments {
  id                  String    @id @default(uuid()) @db.Uuid
  gateway             String    @db.VarChar(20)  // payos | casso | sepay
  transaction_id      String    @unique @db.VarChar(100)  // Idempotency key
  amount              Decimal   @db.Decimal(15, 2)
  sender_name         String?   @db.VarChar(200)
  description         String    @db.VarChar(500)  // Original transfer content
  received_at         DateTime  @db.Timestamptz
  raw_payload         Json
  status              String    @default("pending") @db.VarChar(20)  // pending | matched | rejected
  matched_invoice_id  String?   @db.Uuid
  matched_by          String?   @db.Uuid
  matched_at          DateTime? @db.Timestamptz
  rejection_reason    String?   @db.VarChar(500)
  created_at          DateTime  @default(now()) @db.Timestamptz
  updated_at          DateTime  @updatedAt @db.Timestamptz
  
  // Relations
  matched_invoice invoices? @relation(fields: [matched_invoice_id], references: [id])
  matcher         users?    @relation(fields: [matched_by], references: [id])
  
  @@index([status])
  @@index([received_at])
  @@index([amount])
}
```
