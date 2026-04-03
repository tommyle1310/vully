# Design: Enterprise MVP Foundations

## Overview

This document details the architectural decisions for transitioning Vully from a single-tenant prototype to an enterprise-ready multi-tenant MVP with trust accounting, compliance automation, and payment gateway integration.

---

## 1. Multi-Tenant Architecture

### 1.1 Isolation Strategy Selection

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| **Silo** (DB per tenant) | Maximum isolation, simple queries | High cost, complex ops | ❌ Not viable for MVP |
| **Bridge** (Schema per tenant) | Good isolation, per-tenant migrations | Moderate ops overhead | ❌ Over-engineered for MVP |
| **Pool** (Shared schema + RLS) | Cost-effective, global updates | Requires RLS discipline | ✅ **Selected** |

**Rationale**: Pool model with PostgreSQL Row-Level Security (RLS) provides enterprise-grade isolation at MVP-viable cost. All queries are intercepted at the database layer, preventing application-level bugs from leaking tenant data.

### 1.2 Data Model Changes

```prisma
// New: SaaS Organization (tenant boundary)
model Organization {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name             String   @db.VarChar(255)
  slug             String   @unique @db.VarChar(100) // URL-friendly identifier
  subscription_tier SubscriptionTier @default(starter)
  settings         Json     @default("{}")
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now()) @db.Timestamptz(6)
  updated_at       DateTime @db.Timestamptz(6)

  // Relations
  users            OrganizationMember[]
  buildings        Building[]
  financial_accounts FinancialAccount[]
  compliance_rules ComplianceRule[]
  notification_templates NotificationTemplate[]
}

model OrganizationMember {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organization_id String   @db.Uuid
  user_id         String   @db.Uuid
  role            OrganizationRole
  is_primary      Boolean  @default(false) // Primary org for user
  created_at      DateTime @default(now()) @db.Timestamptz(6)

  organization    Organization @relation(...)
  user            User         @relation(...)

  @@unique([organization_id, user_id])
}

enum SubscriptionTier {
  starter      // 1 building, basic features
  professional // 5 buildings, full features
  enterprise   // Unlimited, custom SLA
}

enum OrganizationRole {
  owner           // Full access, billing
  portfolio_admin // All buildings, no billing
  building_admin  // Specific buildings only
  leasing_agent   // Contracts, tenants
  accountant      // Financial only
  viewer          // Read-only
}
```

### 1.3 RLS Implementation

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ... (all core tables)

-- Create policy using session variable
CREATE POLICY tenant_isolation ON buildings
  USING (organization_id = current_setting('app.organization_id')::uuid);

-- Bypass for superadmin operations
CREATE POLICY admin_bypass ON buildings
  TO vully_admin
  USING (true);
```

### 1.4 Context Injection Pattern

```typescript
// NestJS Middleware: Set tenant context for every request
@Injectable()
export class OrganizationContextMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const orgId = req.headers['x-organization-id'] as string;
    
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }
    
    // Validate user has access to this org
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organization_id_user_id: { organization_id: orgId, user_id: req.user.id } }
    });
    
    if (!membership) {
      throw new ForbiddenException('No access to this organization');
    }

    // Set PostgreSQL session variable for RLS
    await this.prisma.$executeRaw`SELECT set_config('app.organization_id', ${orgId}, true)`;
    
    req['organization'] = { id: orgId, role: membership.role };
    next();
  }
}
```

---

## 2. Trust Accounting & Escrow Management

### 2.1 Fund Separation Architecture

Property management requires **fiduciary separation** between:
- **Operating Funds**: Company revenue, expenses
- **Trust Funds**: Security deposits, prepaid rent (held for tenants)
- **Maintenance Funds**: VN 2% fund (held for long-term repairs)

```
┌─────────────────────────────────────────────────────────────┐
│                    Financial Accounts                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Operating      │   Trust/Escrow  │   Maintenance Fund      │
│  (TK 111-112)   │   (TK 344)      │   (TK 341)              │
├─────────────────┼─────────────────┼─────────────────────────┤
│ - Rent income   │ - Security deps │ - 2% contributions      │
│ - Mgmt fees     │ - Prepaid rent  │ - Major repairs only    │
│ - Utility fees  │ - Escrow holds  │ - cannot co-mingle      │
│ - Operating exp │                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 2.2 Data Model

```prisma
model FinancialAccount {
  id               String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organization_id  String            @db.Uuid
  account_type     FinancialAccountType
  name             String            @db.VarChar(255)
  bank_name        String?           @db.VarChar(255)
  account_number   String?           @db.VarChar(50)  // Last 4 digits only for display
  bank_token       String?           // Plaid processor token (encrypted)
  balance          Decimal           @default(0) @db.Decimal(15, 2)
  is_active        Boolean           @default(true)
  created_at       DateTime          @default(now()) @db.Timestamptz(6)

  organization     Organization      @relation(...)
  escrow_ledgers   EscrowLedger[]
}

enum FinancialAccountType {
  operating        // General business account
  trust_security   // Security deposits only
  trust_prepaid    // Prepaid rent
  maintenance_fund // VN 2% fund
}

model EscrowLedger {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  financial_account_id String @db.Uuid
  contract_id        String   @db.Uuid
  escrow_type        EscrowType
  original_amount    Decimal  @db.Decimal(15, 2)
  current_balance    Decimal  @db.Decimal(15, 2)
  interest_rate      Decimal? @db.Decimal(5, 4)  // For interest-bearing escrow
  accrued_interest   Decimal  @default(0) @db.Decimal(15, 2)
  return_deadline    DateTime? @db.Date
  status             EscrowStatus @default(held)
  created_at         DateTime @default(now()) @db.Timestamptz(6)
  updated_at         DateTime @db.Timestamptz(6)

  financial_account  FinancialAccount @relation(...)
  contract           Contract         @relation(...)
  transactions       EscrowTransaction[]
}

enum EscrowType {
  security_deposit
  prepaid_rent
  option_fee
  maintenance_fund_2pct
}

enum EscrowStatus {
  held
  partially_applied
  fully_applied
  returned
  forfeited
}

model EscrowTransaction {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  escrow_id      String   @db.Uuid
  transaction_type EscrowTransactionType
  amount         Decimal  @db.Decimal(15, 2)
  description    String   @db.VarChar(255)
  reference_id   String?  @db.Uuid  // Link to invoice, damage claim, etc.
  created_by     String   @db.Uuid
  created_at     DateTime @default(now()) @db.Timestamptz(6)

  escrow         EscrowLedger @relation(...)
}

enum EscrowTransactionType {
  deposit_received
  interest_accrual
  damage_deduction
  cleaning_deduction
  rent_application
  partial_return
  full_return
}
```

### 2.3 Trust Accounting Rules (Enforced in Code)

```typescript
// JournalEntryService validation extension
class TrustAccountingValidator {
  validateNoCoMingling(entry: JournalEntry): void {
    const trustAccounts = ['344', '341']; // TK trust/maintenance
    const operatingExpenseAccounts = ['627', '642', '641']; // Operating expenses
    
    for (const line of entry.lines) {
      // Trust funds cannot be debited for operating expenses
      if (trustAccounts.some(ta => line.debitAccount.startsWith(ta)) &&
          operatingExpenseAccounts.some(oe => line.creditAccount?.startsWith(oe))) {
        throw new BusinessRuleViolation(
          'TRUST_FUND_COMINGLE',
          'Trust/escrow funds cannot be used for operating expenses'
        );
      }
    }
  }
}
```

---

## 3. Regional Compliance Engine

### 3.1 Architecture

The compliance engine uses a **rules-based system** with jurisdiction-specific configurations stored in the database for flexibility.

```
┌─────────────────────────────────────────────────────────────┐
│                   Compliance Engine                          │
├─────────────────────────────────────────────────────────────┤
│  ComplianceRule (DB)           │  ComplianceProcessor        │
│  ├─ jurisdiction (VN, US-FL)   │  ├─ evaluateRules()         │
│  ├─ rule_type (escrow, fund)   │  ├─ scheduleDeadlines()     │
│  ├─ parameters (JSON)          │  ├─ generateAlerts()        │
│  └─ is_active                  │  └─ auditCompliance()       │
├─────────────────────────────────────────────────────────────┤
│  BullMQ Jobs                                                 │
│  ├─ compliance:check-deadlines (daily)                       │
│  ├─ compliance:calculate-interest (monthly)                  │
│  └─ compliance:generate-report (monthly)                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Model

```prisma
model ComplianceRule {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organization_id  String   @db.Uuid
  jurisdiction     String   @db.VarChar(20)  // ISO: VN, US-FL, US-CA
  rule_type        ComplianceRuleType
  rule_code        String   @db.VarChar(50)  // e.g., "ESCROW_RETURN_DEADLINE"
  parameters       Json     // Rule-specific config
  effective_from   DateTime @db.Date
  effective_to     DateTime? @db.Date
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now()) @db.Timestamptz(6)

  organization     Organization @relation(...)
}

enum ComplianceRuleType {
  security_deposit_limit     // Max % of rent
  security_deposit_interest  // Interest rate required
  escrow_return_deadline     // Days to return after move-out
  maintenance_fund_rate      // % of purchase price (VN)
  maintenance_fund_usage     // Allowed expenditure types
}

model ComplianceAlert {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organization_id  String   @db.Uuid
  rule_id          String   @db.Uuid
  resource_type    String   @db.VarChar(50)  // 'contract', 'escrow'
  resource_id      String   @db.Uuid
  alert_type       ComplianceAlertType
  deadline         DateTime @db.Date
  status           ComplianceAlertStatus @default(pending)
  resolved_at      DateTime? @db.Timestamptz(6)
  resolved_by      String?  @db.Uuid
  notes            String?
  created_at       DateTime @default(now()) @db.Timestamptz(6)
}

enum ComplianceAlertType {
  deadline_approaching  // 7 days before
  deadline_imminent     // 3 days before
  deadline_overdue      // Past deadline
  limit_exceeded        // Amount exceeds legal limit
}

enum ComplianceAlertStatus {
  pending
  acknowledged
  resolved
  escalated
}
```

### 3.3 Pre-configured Rules

**Vietnamese Market (VN)**:
```json
{
  "rule_code": "VN_MAINTENANCE_FUND_2PCT",
  "parameters": {
    "rate": 0.02,
    "basis": "purchase_price",
    "allowed_uses": ["structural_repair", "common_area_upgrade", "elevator_replacement"],
    "annual_report_required": true
  }
}
```

**US Market (Florida)**:
```json
{
  "rule_code": "US_FL_ESCROW_RETURN",
  "parameters": {
    "return_deadline_days_no_claim": 15,
    "return_deadline_days_with_claim": 30,
    "itemization_required": true,
    "interest_required": false,
    "institution_must_be_florida": true
  }
}
```

---

## 4. Payment Gateway Integration

### 4.1 Strategy Pattern Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 PaymentGatewayService                        │
├─────────────────────────────────────────────────────────────┤
│  + createPaymentIntent(amount, method, metadata)             │
│  + confirmPayment(intentId, confirmation)                    │
│  + refundPayment(paymentId, amount, reason)                  │
│  + handleWebhook(provider, payload, signature)               │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  StripeAdapter  │ │  VNPayAdapter   │ │  MoMoAdapter    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ - ACH, Cards    │ │ - VN banks      │ │ - E-wallet      │
│ - Plaid link    │ │ - VietQR        │ │ - VN mobile     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 4.2 Data Model

```prisma
model PaymentIntent {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organization_id  String   @db.Uuid
  external_id      String?  @db.VarChar(255)  // Provider's ID (stripe_pi_xxx)
  provider         PaymentProvider
  amount           Decimal  @db.Decimal(15, 2)
  currency         String   @db.VarChar(3) @default("VND")
  payment_method   PaymentMethodType
  status           PaymentIntentStatus @default(created)
  
  // References
  invoice_id       String?  @db.Uuid
  contract_id      String?  @db.Uuid
  payment_schedule_id String? @db.Uuid
  
  // Metadata
  description      String?  @db.VarChar(255)
  metadata         Json     @default("{}")
  client_secret    String?  // For frontend confirmation
  failure_reason   String?
  
  // Timestamps
  created_at       DateTime @default(now()) @db.Timestamptz(6)
  confirmed_at     DateTime? @db.Timestamptz(6)
  failed_at        DateTime? @db.Timestamptz(6)
  
  // Idempotency
  idempotency_key  String   @unique @db.VarChar(255)
}

enum PaymentProvider {
  stripe
  vnpay
  momo
  manual  // Cash, bank transfer
}

enum PaymentIntentStatus {
  created
  requires_payment_method
  requires_confirmation
  processing
  succeeded
  failed
  cancelled
  refunded
}

model PaymentWebhookLog {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  provider         PaymentProvider
  event_type       String   @db.VarChar(100)
  event_id         String   @db.VarChar(255)
  payload          Json
  signature        String   @db.VarChar(512)
  processed        Boolean  @default(false)
  processed_at     DateTime? @db.Timestamptz(6)
  error_message    String?
  created_at       DateTime @default(now()) @db.Timestamptz(6)

  @@unique([provider, event_id])  // Idempotency
}
```

### 4.3 VietQR Integration

```typescript
// Generate VietQR code for manual bank transfers
interface VietQRService {
  generateQR(params: {
    bankId: string;        // NAPAS bank code
    accountNo: string;
    amount: number;
    memo: string;          // Invoice number for reconciliation
    template: 'compact' | 'print';
  }): Promise<{
    qrDataUrl: string;     // Base64 PNG
    deepLink: string;      // Mobile banking app link
    expiresAt: Date;
  }>;
}
```

---

## 5. Communication & Notification Hub

### 5.1 Multi-Channel Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  NotificationService                         │
├─────────────────────────────────────────────────────────────┤
│  + send(userId, templateKey, data, channels[])               │
│  + sendBulk(userIds[], templateKey, data)                    │
│  + scheduleNotification(userId, templateKey, sendAt)         │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  EmailChannel   │ │   SMSChannel    │ │  PushChannel    │
│  (SendGrid)     │ │   (Twilio)      │ │  (FCM/APNs)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 5.2 Data Model

```prisma
model NotificationTemplate {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organization_id  String   @db.Uuid
  template_key     String   @db.VarChar(100)  // e.g., "invoice_due", "lease_expiring"
  channel          NotificationChannel
  subject          String?  @db.VarChar(255)  // For email
  body_template    String   // Handlebars template
  is_default       Boolean  @default(false)
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now()) @db.Timestamptz(6)

  @@unique([organization_id, template_key, channel])
}

model NotificationDelivery {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id          String   @db.Uuid
  template_id      String   @db.Uuid
  channel          NotificationChannel
  status           NotificationDeliveryStatus @default(pending)
  external_id      String?  @db.VarChar(255)  // Provider message ID
  sent_at          DateTime? @db.Timestamptz(6)
  delivered_at     DateTime? @db.Timestamptz(6)
  failed_at        DateTime? @db.Timestamptz(6)
  failure_reason   String?
  metadata         Json     @default("{}")
  created_at       DateTime @default(now()) @db.Timestamptz(6)

  @@index([user_id, created_at])
  @@index([status])
}

model UserNotificationPreference {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id          String   @db.Uuid
  notification_type String  @db.VarChar(100)  // e.g., "invoice", "incident", "announcement"
  channel          NotificationChannel
  enabled          Boolean  @default(true)
  quiet_hours_start Int?    // 0-23
  quiet_hours_end   Int?
  
  @@unique([user_id, notification_type, channel])
}

enum NotificationChannel {
  email
  sms
  push
  in_app
  zalo_oa  // Vietnamese market
}

enum NotificationDeliveryStatus {
  pending
  sent
  delivered
  failed
  bounced
}
```

### 5.3 Template System

```handlebars
<!-- invoice_due.email.hbs -->
Subject: Hóa đơn {{invoice_number}} đến hạn thanh toán

Kính gửi {{tenant_name}},

Hóa đơn số **{{invoice_number}}** cho căn hộ {{apartment_code}} đã đến hạn thanh toán vào ngày **{{due_date}}**.

**Số tiền cần thanh toán:** {{format_currency total_amount "VND"}}

{{#if payment_qr_url}}
Quét mã QR để thanh toán nhanh:
<img src="{{payment_qr_url}}" alt="VietQR" />
{{/if}}

Trân trọng,
{{building_name}}
```

---

## 6. Security Considerations

### 6.1 Encryption Strategy
- **At Rest**: All sensitive fields encrypted using pgcrypto (AES-256)
- **In Transit**: TLS 1.3 mandatory for all API calls
- **Tokens**: Plaid/Stripe tokens stored encrypted, never raw card data

### 6.2 Audit Trail
- All escrow transactions logged with actor, timestamp, old/new values
- Compliance alerts logged with acknowledgment chain
- Payment webhooks logged verbatim for dispute resolution

### 6.3 Access Control
| Operation | Minimum Role |
|-----------|--------------|
| View organization settings | `viewer` |
| Manage buildings | `building_admin` |
| Process payments | `accountant` |
| Modify compliance rules | `portfolio_admin` |
| Change subscription | `owner` |

---

## 7. Performance Considerations

### 7.1 RLS Optimization
- Create indexes on `organization_id` for all tenant-scoped tables
- Use prepared statements to avoid RLS policy re-evaluation
- Consider materialized views for cross-tenant reporting (admin only)

### 7.2 Caching Strategy
- Cache compliance rules (5-min TTL) - rarely change
- Cache notification templates (1-hour TTL)
- Cache organization settings (1-hour TTL)

### 7.3 Background Jobs
| Job | Schedule | Queue |
|-----|----------|-------|
| Compliance deadline check | Daily 6 AM | `compliance` |
| Escrow interest calculation | Monthly 1st | `accounting` |
| Notification delivery retry | Every 5 min | `notifications` |
| Payment webhook retry | Every 1 min | `payments` |

---

## 8. Migration Strategy

### 8.1 Phase 1: Backward-Compatible
1. Add `organization_id` columns as nullable
2. Create default organization for existing data
3. Populate `organization_id` for all existing records
4. Deploy code that reads new columns but doesn't require them

### 8.2 Phase 2: Enforce Isolation
1. Make `organization_id` non-nullable
2. Enable RLS policies in `permissive` mode (log violations)
3. Monitor for any application-level leaks

### 8.3 Phase 3: Lock Down
1. Switch RLS to `restrictive` mode
2. Require `X-Organization-ID` header on all endpoints
3. Remove backward-compatibility code

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Trust accounting validation rules (>90% coverage)
- Compliance rule evaluation
- Payment intent state machine

### 9.2 Integration Tests
- RLS policy enforcement (simulate cross-tenant access attempts)
- Payment webhook handling (mock providers)
- Notification delivery chains

### 9.3 E2E Tests
- Complete payment flow (Stripe test mode)
- Escrow lifecycle (deposit → deductions → return)
- Compliance alert → acknowledgment → resolution

---

## 10. Decisions Log

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Multi-tenant model | Silo, Bridge, Pool | Pool + RLS | Cost-effective for MVP, enterprise-grade security |
| Payment abstraction | Direct SDK, Strategy pattern | Strategy | Supports multiple providers per region |
| Notification delivery | Sync, Async queue | Async (BullMQ) | Resilient to provider failures, retry support |
| Escrow tracking | Single table, Per-contract ledger | Per-contract | Clear audit trail, supports partial deductions |
| Compliance rules | Hardcoded, DB-driven | DB-driven | Flexible for regional expansion without deploys |
