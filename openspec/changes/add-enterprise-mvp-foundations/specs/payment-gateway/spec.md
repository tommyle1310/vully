# Payment Gateway Integration Specification

## Overview

This capability provides a provider-agnostic payment gateway integration supporting multiple payment methods (cards, ACH, bank transfer, e-wallets) with support for Stripe (international/US), VNPay (Vietnam banks), and MoMo (Vietnam e-wallet).

---

## ADDED Requirements

### Requirement: Payment Intent Lifecycle

The system SHALL manage payment transactions through a well-defined state machine with idempotency guarantees.

#### Scenario: Create payment intent for invoice
- **GIVEN** An invoice with total_amount = 5,000,000 VND
- **WHEN** Tenant initiates payment
- **THEN** PaymentIntent is created with:
  - status: `created`
  - amount: 5,000,000 VND
  - invoice_id: linked
  - idempotency_key: generated
- **AND** Client receives intent ID for frontend confirmation

#### Scenario: Confirm payment with card
- **GIVEN** A PaymentIntent in `requires_confirmation` status
- **AND** Stripe payment method attached
- **WHEN** Payment is confirmed
- **THEN** Stripe charge is processed
- **AND** PaymentIntent status → `processing`
- **AND** On success: status → `succeeded`
- **AND** Invoice paid_amount updated
- **AND** Contract payment recorded

#### Scenario: Payment failure handling
- **GIVEN** A PaymentIntent being processed
- **WHEN** Payment provider returns failure (insufficient funds)
- **THEN** PaymentIntent status → `failed`
- **AND** failure_reason populated
- **AND** Invoice status remains `pending`
- **AND** User is notified of failure

#### Scenario: Idempotent payment creation
- **GIVEN** A PaymentIntent with idempotency_key = "invoice-123-attempt-1"
- **WHEN** Duplicate request with same idempotency_key is received
- **THEN** Existing PaymentIntent is returned
- **AND** No duplicate charge is created

---

### Requirement: Multi-Provider Support

The system SHALL support multiple payment providers with automatic routing based on organization configuration and payment method.

#### Scenario: Route card payment to Stripe
- **GIVEN** An organization with Stripe configured
- **AND** Tenant selects credit card payment
- **WHEN** PaymentIntent is created
- **THEN** StripeAdapter is selected
- **AND** Stripe PaymentIntent is created
- **AND** client_secret returned for Stripe.js

#### Scenario: Route Vietnamese bank transfer to VNPay
- **GIVEN** An organization with VNPay configured
- **AND** Tenant selects bank transfer (Vietnamese bank)
- **WHEN** PaymentIntent is created
- **THEN** VNPayAdapter is selected
- **AND** VNPay payment URL is generated
- **AND** User is redirected to VNPay checkout

#### Scenario: Manual payment recording
- **GIVEN** Tenant pays via cash or manual bank transfer
- **WHEN** Admin records manual payment
- **THEN** ManualPaymentAdapter creates PaymentIntent
- **AND** Status immediately set to `succeeded`
- **AND** Invoice and contract payment updated
- **AND** Audit log records manual entry with reference

---

### Requirement: Webhook Processing

The system SHALL process payment provider webhooks with idempotency and retry handling.

#### Scenario: Process Stripe webhook for successful payment
- **GIVEN** Stripe webhook event `payment_intent.succeeded`
- **WHEN** Webhook endpoint receives event
- **THEN** Signature is verified against Stripe webhook secret
- **AND** Event is logged to PaymentWebhookLog
- **AND** Corresponding PaymentIntent is updated
- **AND** Invoice and contract records are updated
- **AND** Notification sent to tenant (receipt)

#### Scenario: Idempotent webhook processing
- **GIVEN** A webhook event already processed (exists in PaymentWebhookLog)
- **WHEN** Duplicate webhook is received
- **THEN** Duplicate is detected via (provider, event_id) unique constraint
- **AND** Webhook is acknowledged without reprocessing
- **AND** No duplicate state changes occur

#### Scenario: Webhook processing failure with retry
- **GIVEN** A webhook that fails to process (database error)
- **WHEN** Webhook handler throws exception
- **THEN** Event is logged with error_message
- **AND** HTTP 500 returned to provider (triggers retry)
- **AND** On retry: event is reprocessed successfully

---

### Requirement: VietQR Integration

The system SHALL generate VietQR codes for Vietnamese bank transfers with automatic reconciliation support.

#### Scenario: Generate VietQR for invoice payment
- **GIVEN** An invoice with total_amount = 5,000,000 VND
- **AND** Organization has VietQR bank account configured
- **WHEN** Tenant requests VietQR payment
- **THEN** QR code is generated with:
  - Bank ID (NAPAS code)
  - Account number
  - Amount: 5,000,000 VND
  - Memo: "INV-2026-0001" (invoice number)
- **AND** QR image (PNG) is returned
- **AND** Deep link for mobile banking apps is provided

#### Scenario: VietQR code expiration
- **GIVEN** A VietQR code generated 48 hours ago
- **WHEN** Code is scanned
- **THEN** Payment may still proceed (bank handles)
- **BUT** System shows "Code may be expired, verify amount before transfer"

---

### Requirement: Refund Processing

The system SHALL support partial and full refunds for completed payments.

#### Scenario: Full refund
- **GIVEN** A succeeded PaymentIntent for 5,000,000 VND
- **WHEN** Admin initiates full refund
- **THEN** Refund is processed via original provider
- **AND** PaymentIntent status → `refunded`
- **AND** Invoice paid_amount reduced
- **AND** Audit log records refund with reason

#### Scenario: Partial refund
- **GIVEN** A succeeded PaymentIntent for 5,000,000 VND
- **WHEN** Admin initiates partial refund of 1,000,000 VND
- **THEN** Partial refund is processed
- **AND** PaymentIntent metadata records refund details
- **AND** Invoice paid_amount reduced by 1,000,000 VND

---

## Data Model

### PaymentIntent
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to Organization |
| external_id | VARCHAR(255) | Provider's payment ID |
| provider | Enum | stripe, vnpay, momo, manual |
| amount | Decimal(15,2) | Payment amount |
| currency | VARCHAR(3) | ISO currency code |
| payment_method | Enum | card, bank_transfer, e_wallet, cash |
| status | Enum | created, requires_payment_method, requires_confirmation, processing, succeeded, failed, cancelled, refunded |
| invoice_id | UUID | FK to Invoice (optional) |
| contract_id | UUID | FK to Contract (optional) |
| payment_schedule_id | UUID | FK to PaymentSchedule (optional) |
| description | VARCHAR(255) | Payment description |
| metadata | JSONB | Provider-specific metadata |
| client_secret | VARCHAR | For frontend SDK confirmation |
| failure_reason | TEXT | Failure details |
| idempotency_key | VARCHAR(255) | Unique per request |
| created_at | Timestamp | Creation time |
| confirmed_at | Timestamp | Confirmation time |
| failed_at | Timestamp | Failure time |

### PaymentWebhookLog
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| provider | Enum | Payment provider |
| event_type | VARCHAR(100) | Webhook event type |
| event_id | VARCHAR(255) | Provider's event ID |
| payload | JSONB | Raw webhook payload |
| signature | VARCHAR(512) | Webhook signature |
| processed | Boolean | Processing status |
| processed_at | Timestamp | Processing time |
| error_message | TEXT | Processing error |
| created_at | Timestamp | Receipt time |

---

## API Endpoints

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| POST | /api/payments/intents | Create payment intent | viewer (tenant) |
| GET | /api/payments/intents/:id | Get intent status | viewer |
| POST | /api/payments/intents/:id/confirm | Confirm payment | viewer |
| POST | /api/payments/intents/:id/cancel | Cancel intent | viewer |
| POST | /api/payments/intents/:id/refund | Refund payment | accountant |
| POST | /api/payments/manual | Record manual payment | accountant |
| GET | /api/payments/qr/:invoiceId | Generate VietQR | viewer |
| POST | /api/webhooks/stripe | Stripe webhook | (no auth) |
| POST | /api/webhooks/vnpay | VNPay webhook | (no auth) |
| POST | /api/webhooks/momo | MoMo webhook | (no auth) |

---

## Provider Configuration

```typescript
// Environment variables (encrypted)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VNPAY_TMN_CODE=xxx
VNPAY_HASH_SECRET=xxx
MOMO_PARTNER_CODE=xxx
MOMO_ACCESS_KEY=xxx
MOMO_SECRET_KEY=xxx
```

---

## Related Capabilities
- **Billing**: Invoice payment tracking
- **Contracts**: Payment schedule fulfillment
- **Trust Accounting**: Escrow deposit recording
- **Notifications**: Payment confirmation delivery
