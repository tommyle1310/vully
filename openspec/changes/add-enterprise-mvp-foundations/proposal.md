# Change: Add Enterprise MVP Foundations

## Why

The current platform is functionally complete for basic apartment management but lacks the architectural foundations required for professional property management use. Based on the [Technical Execution & AI Automation Roadmap](../../docs/Technical-Execution&AI-Automation-Roadmap.md) and [feedback analysis](../../docs/feedback.md), the system needs to transition from a "playground" to a **production-ready MVP** that:

1. **Protects client data** — No multi-tenant isolation exists; all data is globally accessible, failing security audits
2. **Ensures financial integrity** — No trust/escrow accounting to legally separate tenant deposits from operating funds
3. **Automates compliance** — No regional legal rules engine for US escrow laws or Vietnamese 2% maintenance fund requirements
4. **Reduces manual work** — No payment gateway integration (Plaid/Stripe); manual entry for all financial transactions
5. **Enables communication** — No unified notification infrastructure for multi-channel alerts (SMS, email, push)

This change establishes the **"Fiduciary & Security Core"** identified as Phase 1 (highest priority) in the roadmap.

## What Changes

### 1. Multi-Tenant Architecture (RLS)
- Add `Organization` model as SaaS tenant boundary
- Add `organization_id` to all core tables (buildings, users, etc.)
- Implement PostgreSQL Row-Level Security (RLS) policies
- Add `OrganizationContext` middleware for tenant scoping
- Update Prisma client to inject tenant context

### 2. Trust Accounting & Escrow Management
- Add `FinancialAccount` model (trust vs operating account types)
- Add `EscrowLedger` model for per-contract security deposit tracking
- Implement trust/operating fund separation in journal entries
- Add escrow reconciliation service and reports
- **BREAKING**: Extend existing accounting module with trust accounting capabilities

### 3. Regional Compliance Engine
- Add `ComplianceRule` model with jurisdiction-specific configurations
- Implement US security deposit escrow rules (state-specific interest, return deadlines)
- Implement Vietnamese 2% maintenance fund tracking and 5% deposit caps
- Add automated deadline alerts (BullMQ jobs)
- Add compliance audit trail logging

### 4. Payment Gateway Integration
- Add `PaymentProvider` abstraction layer (Strategy pattern)
- Implement Stripe adapter for card/ACH payments
- Implement VNPay/MoMo adapters for Vietnamese market
- Add `PaymentIntent` model for transaction lifecycle
- Implement webhook handlers with idempotency
- Add VietQR code generation for bank transfers

### 5. Communication & Notification Hub
- Add `NotificationChannel` model (email, SMS, push, Zalo OA)
- Add `NotificationTemplate` model for customizable messages
- Implement Twilio adapter (SMS)
- Implement SendGrid adapter (email)
- Add notification preference management per user
- Implement multi-channel delivery with fallback

### 6. Enhanced Identity & RBAC
- Add organization-scoped role assignments
- Add new roles: `portfolio_admin`, `leasing_agent`, `accountant`
- Implement hierarchical permissions (org → building → apartment)
- Add tenant screening fields to user applications

## Impact

### Affected Specs
- `identity` — Multi-tenant RBAC extension
- `billing` — Payment gateway integration
- `accounting` — Trust accounting extension (depends on `add-accounting-module`)

### Affected Code
| Area | Files/Modules |
|------|---------------|
| Database | `prisma/schema.prisma` — 8 new models, RLS policies |
| Backend | New modules: `multi-tenant/`, `compliance/`, `payment-gateway/`, `notifications/` |
| Backend | Extended modules: `identity/`, `billing/`, `accounting/` |
| Frontend | New pages: `/settings/organization`, `/compliance`, payment UIs |
| Shared Types | `packages/shared-types` — new entity types, enums |

### Breaking Changes
- **BREAKING**: All API endpoints require `X-Organization-ID` header (except auth)
- **BREAKING**: Database migration adds `organization_id` to existing tables
- **BREAKING**: Accounting module extended with trust accounting (coordinate with `add-accounting-module`)

### Dependencies
- Depends on: `add-accounting-module` (for General Ledger foundation)
- Blocks: Any enterprise/multi-org deployment

## Estimated Effort
- Backend: 4-6 weeks
- Frontend: 2-3 weeks
- Testing & Documentation: 1-2 weeks
- **Total**: 7-11 weeks (Phase 1 priority)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data migration complexity | Create reversible migration with rollback script |
| RLS performance overhead | Index optimization, prepared statements, load testing |
| Payment provider compliance (PCI) | Use tokenization (never store raw card data) |
| Regional law variations | Start with VN market (primary target), US as secondary |

## Success Criteria
- [ ] All tables have RLS policies enforced at database level
- [ ] Trust accounting passes audit simulation (no fund co-mingling)
- [ ] Payment flow completes end-to-end (test mode)
- [ ] Compliance alerts fire correctly for VN 2% fund deadlines
- [ ] Notification delivery achieves >95% success rate

## References
- [Technical Execution & AI Automation Roadmap](../../docs/Technical-Execution&AI-Automation-Roadmap.md)
- [Feedback Analysis](../../docs/feedback.md)
- [Multi-Tenant Architecture Guide](https://clerk.com/blog/how-to-design-multitenant-saas-architecture)
- [Trust Accounting Best Practices](https://www.vjmglobal.com/blog/property-management-accounting-best-practices)
