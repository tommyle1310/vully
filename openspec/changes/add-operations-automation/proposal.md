# Change: Add Operations Automation for Production Readiness

## Why

Vully has completed core apartment management modules but lacks operational automation critical for production deployment. Based on [next_steps.md](../../docs/next_steps.md), the platform needs to transition from manual tracking to automated operations:

1. **Manual payment reconciliation** — Accountants must manually confirm VietQR payments; no webhook integration with bank/gateway APIs (PayOS/Casso/SePay)
2. **No real-time notifications** — Commented-out notification module; residents/admins can't receive push notifications for payments, incidents, or announcements
3. **Incomplete operational roles** — Only `admin`, `technician`, `resident` exist; missing `security`, `housekeeping`, `accountant`, `building_manager` roles for full operations staff
4. **No social login** — Residents must create accounts manually; no Google/Zalo OAuth for Vietnamese users
5. **No error monitoring** — No Sentry integration for production error tracking

## What Changes

### 1. VietQR Auto-Sync — Payment Webhook Module (Priority: Critical)
- Add `POST /api/v1/payments/webhook` endpoint for PayOS/Casso/SePay callbacks
- Add `payment_reference` field to invoices and contracts for webhook matching
- Add `external_transaction_id` field for idempotency (⚠️ **use Prisma `$transaction` for atomic check-and-update**)
- Add `raw_gateway_response` JSON field for audit/dispute resolution
- Implement checksum/signature verification per gateway
- Auto-update invoice `status` to `paid` on successful webhook
- **NEW**: Add `unmatched_payments` table for transactions that don't match any invoice
- **NEW**: Add accountant UI to manually match/reject unmatched payments
- **NEW**: Add manual re-sync job to reconcile last 24h transactions from gateway APIs
- Trigger `payment.completed` and `payment.unmatched` events via Socket.IO

### 2. Multi-Channel Notification Engine (Priority: High)
- Activate and extend existing `notifications` model
- Add `device_tokens` table for FCM registration
- Add `notification_preferences` user settings (with `zalo_enabled` option)
- Implement Firebase Cloud Messaging adapter for push notifications
- **NEW**: Implement Zalo ZNS (Zalo Notification Service) adapter for Vietnamese users
- **NEW**: Add `zalo_id` and `zalo_oa_follower` fields to users table (set during Zalo OAuth)
- Multi-channel delivery priority: Zalo ZNS → FCM Push → Email
- BullMQ notification delivery queue (non-blocking)
- Real-time push for: payment confirmations, incident updates, building announcements
- Broadcast capability for building-wide alerts

### 3. Extended RBAC with Building Scope (Priority: Medium)
- Add new UserRole enum values: `security`, `housekeeping`, `accountant`, `building_manager`
- Define granular permissions per new role
- **NEW**: Add `user_building_assignments` table for building-scoped role assignments
- **NEW**: Implement `BuildingScopedGuard` — non-admin roles can only access data from assigned buildings
- Update RolesGuard to recognize new roles
- Add role + building assignment UI for admins

### 4. OAuth Integration (Priority: Medium)
- Add Google OAuth provider via passport-google-oauth20
- Add Zalo OAuth provider (Zalo OA API)
- Link social accounts to existing user profiles
- Store OAuth provider tokens (refresh capability)

### 5. Error Tracking — Sentry Integration (Priority: Low)
- Add @sentry/nestjs for backend error capture
- Configure release tracking and environment tagging
- Add user context (id, role) to error reports
- Frontend Sentry integration with source maps

## Impact

### Affected Specs
- `billing` — Payment webhook and reconciliation
- `identity` — OAuth providers and extended RBAC
- `notifications` — New capability (currently skeleton)

### Affected Code
| Area | Files/Modules |
|------|---------------|
| Schema | `prisma/schema.prisma` — 6 fields + 4 new models (`unmatched_payments`, `user_building_assignments`, `device_tokens`, `oauth_accounts`) + UserRole enum extension |
| Backend | New: `payments-webhook/`, extend: `notifications/`, `identity/`, new adapters: `zalo-zns.adapter.ts` |
| Frontend | OAuth buttons, notification settings UI, unmatched payments page (Accountant) |
| Shared Types | `@vully/shared-types` — new enums and event types |

### Breaking Changes
- **BREAKING**: UserRole enum extended — requires migration of existing role assignments
- **BREAKING**: Invoice/contract schema extended — requires data migration

### Dependencies
- Independent of `add-enterprise-mvp-foundations` (can be deployed first)
- Provides foundation for full `notifications` capability

## Estimated Effort
- VietQR Webhook: 1 week
- FCM Notifications: 1-2 weeks
- Extended RBAC: 3 days
- OAuth: 1 week
- Sentry: 2 days
- **Total**: 4-5 weeks

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Webhook security (replay attacks) | Timestamp validation + checksum + idempotency key |
| FCM token expiry | Background job to clean stale tokens |
| Social account conflicts | Prompt user to link accounts if email exists |

## Success Criteria
- [ ] 90%+ payments auto-reconciled within 5 seconds
- [ ] Push notifications delivered with <3 second latency
- [ ] New roles can be assigned and enforced
- [ ] OAuth login works for Google and Zalo
- [ ] Production errors captured with full context
