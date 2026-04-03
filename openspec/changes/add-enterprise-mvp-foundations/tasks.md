# Tasks: Enterprise MVP Foundations

## Phase 1: Multi-Tenant Architecture (Week 1-2)

### 1.1 Data Model & Migration

- [ ] 1.1.1 Add enums to Prisma schema: `SubscriptionTier`, `OrganizationRole`, `FinancialAccountType`, `EscrowType`, `EscrowStatus`, `EscrowTransactionType`, `ComplianceRuleType`, `ComplianceAlertType`, `ComplianceAlertStatus`, `PaymentProvider`, `PaymentIntentStatus`, `PaymentMethodType`, `NotificationChannel`, `NotificationDeliveryStatus`
- [ ] 1.1.2 Add Prisma model: `Organization` (SaaS tenant boundary)
- [ ] 1.1.3 Add Prisma model: `OrganizationMember` (user ↔ org junction with role)
- [ ] 1.1.4 Add `organization_id` column to: `buildings`, `users`, `utility_types` (nullable for migration)
- [ ] 1.1.5 Create migration: Add organization tables and FK columns
- [ ] 1.1.6 Create data migration script: Create default org, assign existing data
- [ ] 1.1.7 Create migration: Make `organization_id` non-nullable after data migration
- [ ] 1.1.8 Add shared-types exports: Organization, OrganizationMember, related enums

### 1.2 Row-Level Security (RLS)

- [ ] 1.2.1 Create SQL migration: Enable RLS on `buildings`, `apartments`, `contracts`, `invoices`, `incidents`, `meter_readings`, `users` tables
- [ ] 1.2.2 Create RLS policies: `tenant_isolation_policy` using `current_setting('app.organization_id')`
- [ ] 1.2.3 Create RLS bypass role: `vully_admin` for platform operations
- [ ] 1.2.4 Create indexes on `organization_id` for all RLS-enabled tables
- [ ] 1.2.5 Test RLS: Verify cross-tenant access blocked at DB level

### 1.3 Backend Implementation

- [ ] 1.3.1 Create `MultiTenantModule` under `apps/api/src/modules/multi-tenant/`
- [ ] 1.3.2 Implement `OrganizationContextMiddleware` — extract org from header, validate membership, set Prisma context
- [ ] 1.3.3 Implement `PrismaService` extension: `setOrganizationContext()` method using `$executeRaw`
- [ ] 1.3.4 Create `@CurrentOrganization()` decorator for controller access
- [ ] 1.3.5 Update `JwtAuthGuard` to populate org context from token claims
- [ ] 1.3.6 Implement `OrganizationController` — CRUD + invite member + manage tiers (Swagger)
- [ ] 1.3.7 Implement `OrganizationService` with audit logging for member changes
- [ ] 1.3.8 Create DTOs: `CreateOrganizationDto`, `UpdateOrganizationDto`, `InviteMemberDto`
- [ ] 1.3.9 Update all existing controllers to require organization context
- [ ] 1.3.10 Unit tests: OrganizationService CRUD, context middleware, RLS enforcement (>80% coverage)

### 1.4 Frontend Implementation

- [ ] 1.4.1 Add `organizationStore` (Zustand) — current org, available orgs, switch org
- [ ] 1.4.2 Create `useOrganizations` hook (TanStack Query)
- [ ] 1.4.3 Update `apiClient` to inject `X-Organization-ID` header from store
- [ ] 1.4.4 Create `/settings/organization` page — org details, members list
- [ ] 1.4.5 Create `OrganizationSwitcher` component (Shadcn Select + avatar)
- [ ] 1.4.6 Add organization switcher to dashboard sidebar
- [ ] 1.4.7 Skeleton loaders for organization pages

---

## Phase 2: Trust Accounting & Escrow (Week 3-4)

### 2.1 Data Model

- [ ] 2.1.1 Add Prisma model: `FinancialAccount` (trust/operating/maintenance fund accounts)
- [ ] 2.1.2 Add Prisma model: `EscrowLedger` (per-contract escrow tracking)
- [ ] 2.1.3 Add Prisma model: `EscrowTransaction` (deposit, deduction, return transactions)
- [ ] 2.1.4 Add relation: `Contract` → `EscrowLedger[]`
- [ ] 2.1.5 Add relation: `FinancialAccount` → `EscrowLedger[]`
- [ ] 2.1.6 Create migration: Trust accounting tables
- [ ] 2.1.7 Add shared-types exports: FinancialAccount, EscrowLedger, EscrowTransaction

### 2.2 Backend Implementation

- [ ] 2.2.1 Create `TrustAccountingModule` under `apps/api/src/modules/accounting/trust/`
- [ ] 2.2.2 Implement `FinancialAccountService` — CRUD, balance queries
- [ ] 2.2.3 Implement `FinancialAccountController` + Swagger
- [ ] 2.2.4 Implement `EscrowService` — create, add deduction, return, reconcile
- [ ] 2.2.5 Implement `EscrowController` — endpoints + Swagger
- [ ] 2.2.6 Implement `TrustAccountingValidator` — co-mingling prevention (integrate with JournalEntryService)
- [ ] 2.2.7 Implement escrow interest calculation (for jurisdictions requiring it)
- [ ] 2.2.8 Create DTOs: `CreateFinancialAccountDto`, `EscrowDepositDto`, `EscrowDeductionDto`, `EscrowReturnDto`
- [ ] 2.2.9 Extend contract creation to auto-create escrow ledger for security deposit
- [ ] 2.2.10 Add AuditLog integration for all escrow transactions
- [ ] 2.2.11 Unit tests: Escrow lifecycle, co-mingling rejection, interest calculation (>80% coverage)

### 2.3 Frontend Implementation

- [ ] 2.3.1 Create `useEscrowLedger` hook
- [ ] 2.3.2 Create `/accounting/escrow` page — list all escrow ledgers with filters
- [ ] 2.3.3 Create `EscrowLedgerDetail` component — transaction history, actions
- [ ] 2.3.4 Create `EscrowDeductionDialog` (Shadcn Dialog + React Hook Form)
- [ ] 2.3.5 Create `EscrowReturnDialog` with itemization checklist
- [ ] 2.3.6 Add escrow summary card to contract detail page
- [ ] 2.3.7 Skeleton loaders for escrow pages

---

## Phase 3: Regional Compliance Engine (Week 5-6)

### 3.1 Data Model

- [ ] 3.1.1 Add Prisma model: `ComplianceRule` (jurisdiction-specific rules)
- [ ] 3.1.2 Add Prisma model: `ComplianceAlert` (deadline tracking, violations)
- [ ] 3.1.3 Create migration: Compliance tables
- [ ] 3.1.4 Create seed data: Vietnamese compliance rules (2% fund, deposit caps)
- [ ] 3.1.5 Create seed data: US compliance rules (FL, CA escrow rules)
- [ ] 3.1.6 Add shared-types exports

### 3.2 Backend Implementation

- [ ] 3.2.1 Create `ComplianceModule` under `apps/api/src/modules/compliance/`
- [ ] 3.2.2 Implement `ComplianceRuleService` — CRUD, get rules by jurisdiction
- [ ] 3.2.3 Implement `ComplianceRuleController` + Swagger
- [ ] 3.2.4 Implement `ComplianceAlertService` — create, acknowledge, resolve, escalate
- [ ] 3.2.5 Implement `ComplianceAlertController` + Swagger
- [ ] 3.2.6 Implement `ComplianceProcessor` (BullMQ) — daily deadline checks
- [ ] 3.2.7 Implement escrow return deadline calculation based on jurisdiction rules
- [ ] 3.2.8 Implement VN 2% maintenance fund validation on apartment sale contracts
- [ ] 3.2.9 Implement automated compliance audit report generation
- [ ] 3.2.10 Add notification triggers for compliance alerts
- [ ] 3.2.11 Unit tests: Rule evaluation, deadline calculation, alert lifecycle (>80% coverage)

### 3.3 Frontend Implementation

- [ ] 3.3.1 Create `useComplianceAlerts` hook
- [ ] 3.3.2 Create `/compliance` page — alert dashboard with filters
- [ ] 3.3.3 Create `ComplianceAlertCard` component (status badge, actions)
- [ ] 3.3.4 Create `/settings/compliance-rules` page — rule configuration
- [ ] 3.3.5 Add compliance alert widget to dashboard
- [ ] 3.3.6 Create `ComplianceAlertAcknowledgeDialog`

---

## Phase 4: Payment Gateway Integration (Week 7-8)

### 4.1 Data Model

- [ ] 4.1.1 Add Prisma model: `PaymentIntent` (payment lifecycle tracking)
- [ ] 4.1.2 Add Prisma model: `PaymentWebhookLog` (webhook idempotency)
- [ ] 4.1.3 Create migration: Payment gateway tables
- [ ] 4.1.4 Add shared-types exports

### 4.2 Backend Implementation — Core

- [ ] 4.2.1 Create `PaymentGatewayModule` under `apps/api/src/modules/payment-gateway/`
- [ ] 4.2.2 Define `PaymentProviderAdapter` interface (Strategy pattern)
- [ ] 4.2.3 Implement `PaymentGatewayService` — create intent, confirm, refund (provider-agnostic)
- [ ] 4.2.4 Implement `PaymentIntentController` + Swagger
- [ ] 4.2.5 Implement `WebhookController` — provider-specific endpoints with signature verification
- [ ] 4.2.6 Implement `PaymentWebhookProcessor` (BullMQ) — process with idempotency
- [ ] 4.2.7 Create DTOs: `CreatePaymentIntentDto`, `ConfirmPaymentDto`, `RefundPaymentDto`

### 4.3 Backend Implementation — Providers

- [ ] 4.3.1 Implement `StripeAdapter` — card, ACH payment methods
- [ ] 4.3.2 Implement `VNPayAdapter` — Vietnamese bank gateway
- [ ] 4.3.3 Implement `MoMoAdapter` — Vietnamese e-wallet
- [ ] 4.3.4 Implement `ManualPaymentAdapter` — cash, manual bank transfer recording
- [ ] 4.3.5 Implement `VietQRService` — generate QR codes for bank transfers
- [ ] 4.3.6 Add config: Provider credentials (encrypted in env)
- [ ] 4.3.7 Integration tests: Stripe test mode, VNPay sandbox

### 4.4 Frontend Implementation

- [ ] 4.4.1 Create `usePaymentIntent` hook
- [ ] 4.4.2 Create `PaymentMethodSelector` component (Stripe Elements + VietQR)
- [ ] 4.4.3 Create `PaymentConfirmationDialog`
- [ ] 4.4.4 Create `VietQRDisplay` component (QR image + deep link)
- [ ] 4.4.5 Update invoice detail page with "Pay Now" flow
- [ ] 4.4.6 Create `/payments` page — payment history with status
- [ ] 4.4.7 Add payment status webhooks to WebSocket for real-time UI updates

---

## Phase 5: Communication & Notification Hub (Week 9-10)

### 5.1 Data Model

- [ ] 5.1.1 Add Prisma model: `NotificationTemplate` (per-org templates)
- [ ] 5.1.2 Add Prisma model: `NotificationDelivery` (delivery tracking)
- [ ] 5.1.3 Add Prisma model: `UserNotificationPreference` (channel preferences)
- [ ] 5.1.4 Create migration: Notification tables
- [ ] 5.1.5 Create seed data: Default notification templates (invoice_due, lease_expiring, etc.)
- [ ] 5.1.6 Add shared-types exports

### 5.2 Backend Implementation

- [ ] 5.2.1 Create `NotificationsModule` under `apps/api/src/modules/notifications/`
- [ ] 5.2.2 Define `NotificationChannelAdapter` interface
- [ ] 5.2.3 Implement `NotificationService` — send, sendBulk, schedule
- [ ] 5.2.4 Implement `NotificationTemplateService` — CRUD, render with Handlebars
- [ ] 5.2.5 Implement `NotificationTemplateController` + Swagger
- [ ] 5.2.6 Implement `UserNotificationPreferenceController` + Swagger

### 5.3 Backend Implementation — Channels

- [ ] 5.3.1 Implement `EmailChannelAdapter` (SendGrid)
- [ ] 5.3.2 Implement `SMSChannelAdapter` (Twilio)
- [ ] 5.3.3 Implement `PushChannelAdapter` (Firebase FCM)
- [ ] 5.3.4 Implement `InAppChannelAdapter` (existing notifications table)
- [ ] 5.3.5 Implement `NotificationProcessor` (BullMQ) — multi-channel delivery with fallback
- [ ] 5.3.6 Implement delivery status webhooks (SendGrid, Twilio)
- [ ] 5.3.7 Add config: Channel provider credentials (encrypted)
- [ ] 5.3.8 Unit tests: Template rendering, preference filtering, delivery logic (>80% coverage)

### 5.4 Frontend Implementation

- [ ] 5.4.1 Create `useNotificationPreferences` hook
- [ ] 5.4.2 Create `/settings/notifications` page — preference toggles per type/channel
- [ ] 5.4.3 Create `NotificationTemplateEditor` component (template preview)
- [ ] 5.4.4 Update notification bell to show delivery status
- [ ] 5.4.5 Create `/settings/notification-templates` page (admin)

---

## Phase 6: Documentation & Testing (Week 11)

### 6.1 Documentation Updates

- [ ] 6.1.1 Update `README.md` — add new modules, environment variables
- [ ] 6.1.2 Update `.github/copilot-instructions.md` — add new modules, patterns
- [ ] 6.1.3 Update `.github/SYSTEM_PROMPT.md` — add new capabilities
- [ ] 6.1.4 Update `agents/backend-architect.md` — add trust accounting, compliance patterns
- [ ] 6.1.5 Update `agents/database-architect.md` — add RLS patterns, escrow schema
- [ ] 6.1.6 Update `agents/frontend-developer.md` — add payment flow, notification preferences
- [ ] 6.1.7 Update `openspec/project.md` — reflect new architecture
- [ ] 6.1.8 Create API documentation: Multi-tenant headers, authentication flow
- [ ] 6.1.9 Create deployment guide: RLS setup, provider credentials

### 6.2 Integration Testing

- [ ] 6.2.1 E2E test: Organization creation → member invite → data isolation
- [ ] 6.2.2 E2E test: Contract → escrow deposit → deduction → return
- [ ] 6.2.3 E2E test: Compliance alert → acknowledgment → resolution
- [ ] 6.2.4 E2E test: Payment intent → Stripe confirmation → invoice update
- [ ] 6.2.5 E2E test: Notification send → multi-channel delivery → preference respect

### 6.3 Performance Testing

- [ ] 6.3.1 Load test: RLS overhead on common queries (target: <10ms added latency)
- [ ] 6.3.2 Load test: Concurrent payment webhooks (target: 100/sec)
- [ ] 6.3.3 Load test: Notification bulk send (target: 1000 users in <30s)

### 6.4 Security Audit

- [ ] 6.4.1 Verify RLS cannot be bypassed via SQL injection
- [ ] 6.4.2 Verify payment tokens never logged in plain text
- [ ] 6.4.3 Verify escrow transactions are immutable (no update/delete)
- [ ] 6.4.4 Penetration test: Cross-tenant access attempts

---

## Dependencies & Sequencing

```
Phase 1 (Multi-Tenant) ─┬─► Phase 2 (Trust Accounting)
                        │
                        └─► Phase 3 (Compliance) ──► Phase 4 (Payments)
                                                            │
                                                            ▼
                                                   Phase 5 (Notifications)
                                                            │
                                                            ▼
                                                   Phase 6 (Docs & Testing)
```

**Parallel Work Opportunities:**
- Phase 2 and Phase 3 can run in parallel after Phase 1 completes
- Frontend tasks within each phase can parallel backend tasks once APIs are defined
- Documentation (6.1) can start alongside any phase

---

## Acceptance Criteria

| Phase | Criteria |
|-------|----------|
| 1 | All existing E2E tests pass with multi-tenant enabled |
| 2 | Escrow reconciliation report balances to FinancialAccount |
| 3 | Compliance alerts fire correctly for test contract termination |
| 4 | Payment completes end-to-end in Stripe test mode |
| 5 | Notification delivered to 3 channels (email, SMS, in-app) |
| 6 | All new code has >80% test coverage |

---

## Rollback Plan

1. **RLS Rollback**: Disable policies, revert to application-level filtering
2. **Payment Rollback**: Fall back to manual payment recording
3. **Feature Flags**: Each capability behind organization-level feature flag for gradual rollout
