# Tasks: Add Operations Automation

## 1. Schema Updates

### 1.1 Payment Reconciliation Fields
- [x] Add `payment_reference` (String, unique) to `invoices` table
- [x] Add `external_transaction_id` (String, indexed) to `invoices` table
- [x] Add `raw_gateway_response` (Json) to `invoices` table
- [x] Add `payment_reference` (String, unique) to `contract_payment_schedules` table
- [x] Add `external_transaction_id` (String) to `contract_payment_schedules` table
- [x] Add `raw_gateway_response` (Json) to `contract_payment_schedules` table
- [ ] Create migration file with proper indexes
- [ ] Verify migration with `prisma migrate dev`

### 1.2 Unmatched Payments Table (NEW)
- [x] Create `unmatched_payments` model with fields:
  - `gateway` (String) - payos/casso/sepay
  - `transaction_id` (String, unique) - idempotency key
  - `amount` (Decimal)
  - `sender_name` (String, nullable)
  - `description` (String) - original transfer content
  - `received_at` (DateTime)
  - `raw_payload` (Json)
  - `status` (String) - pending/matched/rejected
  - `matched_invoice_id` (UUID, nullable)
  - `matched_by` (UUID, nullable) - accountant who matched
  - `matched_at` (DateTime, nullable)
  - `rejection_reason` (String, nullable)
- [x] Add indexes: `status`, `received_at`, `amount`
- [ ] Create migration file

### 1.3 UserRole Enum Extension
- [x] Add `security` to UserRole enum
- [x] Add `housekeeping` to UserRole enum
- [x] Add `accountant` to UserRole enum
- [x] Add `building_manager` to UserRole enum
- [x] Update `@vully/shared-types` UserRole enum
- [ ] Create migration file

### 1.4 Building Assignments Table (NEW - for scoped RBAC)
- [x] Create `user_building_assignments` model:
  - `user_id` (UUID)
  - `building_id` (UUID)
  - `role` (UserRole)
  - `assigned_at` (DateTime)
  - `assigned_by` (UUID, nullable)
- [x] Add unique constraint [user_id, building_id]
- [x] Add relations to `users` and `buildings`
- [ ] Create migration file

### 1.5 Device Tokens & Notification Preferences
- [x] Create `device_tokens` model (user_id, token, platform, created_at, last_used)
- [x] Create `user_notification_preferences` model:
  - `push_enabled`, `email_enabled`, `zalo_enabled` (booleans)
  - `payment_notifications`, `incident_notifications`, `announcement_notifications`
- [x] Add `zalo_id` (String, unique, nullable) to `users` table
- [x] Add `zalo_oa_follower` (Boolean) to `users` table
- [x] Add relations to `users` model
- [ ] Create migration file

### 1.6 OAuth Provider Tables
- [x] Create `oauth_accounts` model (user_id, provider, provider_user_id, access_token, refresh_token)
- [x] Add unique constraint [provider, provider_user_id]
- [x] Add relation to `users` model
- [ ] Create migration file

---

## 2. VietQR Webhook Module (Critical)

### 2.1 Module Structure
- [x] Create `apps/api/src/modules/payments-webhook/` directory
- [x] Create `payments-webhook.module.ts`
- [x] Create `payments-webhook.controller.ts`
- [x] Create `payments-webhook.service.ts`
- [x] Create `dto/webhook-payload.dto.ts`
- [x] Register module in `app.module.ts`

### 2.2 Security Layer
- [x] Implement PayOS signature verification
- [x] Implement Casso signature verification
- [x] Implement SePay signature verification
- [ ] Add IP whitelist guard (optional, configurable)
- [ ] Add rate limiting (100 req/min per IP)

### 2.3 Webhook Logic (⚠️ CRITICAL: Use Prisma $transaction)
- [x] Parse `payment_reference` from transfer description
- [x] Extract invoice ID from payment_reference pattern (e.g., `VULLY-INV-{id}`)
- [x] **⚠️ MUST use `prisma.$transaction()` for atomic check-and-update**:
  - Check idempotency via `external_transaction_id`
  - Find invoice by `payment_reference`
  - If no match → store in `unmatched_payments`
  - If match → update invoice status
  - All in SAME transaction to prevent double-crediting
- [x] Update `paid_amount` and `paid_at` fields
- [x] Store `raw_gateway_response` for audit trail

### 2.4 Unmatched Payments Handling (NEW)
- [x] Create `unmatched-payments.service.ts`
- [x] Create `unmatched-payments.controller.ts` (Accountant UI)
- [x] Implement `GET /api/v1/unmatched-payments` (list pending)
- [x] Implement `POST /api/v1/unmatched-payments/:id/match` (manual match)
- [x] Implement `POST /api/v1/unmatched-payments/:id/reject` (reject with reason)
- [ ] Add Swagger docs for Accountant endpoints
- [x] Add `@Roles(UserRole.accountant, UserRole.admin)` guards

### 2.5 Manual Re-sync / Reconciliation Job (NEW)
- [x] Create `reconciliation.service.ts`
- [x] Implement `fetchRecentTransactions()` for each gateway adapter:
  - PayOS: GET /payment-requests (last 24h)
  - Casso: GET /transactions (last 24h)
  - SePay: GET /transactions (last 24h)
- [x] Implement `reconcileLast24Hours(gateway)` method:
  - Fetch transactions from gateway API
  - Skip if `external_transaction_id` exists in invoices
  - Skip if `transaction_id` exists in `unmatched_payments`
  - Process remaining as new webhooks
- [x] Create `POST /api/v1/payments/reconcile` endpoint (Accountant/Admin only)
- [x] Create scheduled BullMQ job: daily at 6 AM

### 2.6 Event Emission
- [x] Emit `payment.completed` via `IncidentsGateway` (or create PaymentsGateway)
- [x] Emit `payment.unmatched` for Accountant notification
- [x] Enqueue notification delivery job
- [ ] Log to `audit_logs` table

### 2.7 Testing
- [ ] Unit tests for signature verification
- [ ] Unit tests for payment_reference parsing
- [ ] **Unit tests for $transaction atomicity (simulate concurrent webhooks)**
- [ ] Unit tests for unmatched payment flow
- [ ] Integration test with mock webhook payload
- [ ] Add Swagger documentation

---

## 3. Multi-Channel Notification Engine (High)

### 3.1 Module Activation
- [x] Uncomment `NotificationsModule` in `app.module.ts`
- [x] Create `notifications.service.ts`
- [x] Create `notifications.controller.ts`
- [x] Create DTOs for notification CRUD

### 3.2 Device Token Management
- [x] Create `/notifications/register-device` endpoint
- [x] Create `/notifications/unregister-device` endpoint
- [x] Auto-clean stale tokens (scheduled job, daily at 3 AM)

### 3.3 FCM Integration
- [x] Install `firebase-admin` SDK
- [x] Create `fcm.adapter.ts` (full implementation with firebase-admin)
- [x] Implement `sendToDevice(token, payload)`
- [x] Implement `sendToTopic(topic, payload)` for broadcasts
- [x] Handle FCM errors (invalid token cleanup)

### 3.4 Zalo ZNS Integration (NEW)
- [ ] Register Zalo Official Account (OA) (manual step)
- [ ] Apply for ZNS template approval (payment, incident, announcement) (manual step)
- [x] Create `zalo-zns.adapter.ts` (placeholder implementation)
- [x] Implement `sendZNS(zaloId, templateId, templateData)`
- [x] Handle Zalo API errors and rate limits
- [x] Store `zalo_id` on user profile during Zalo OAuth (schema ready)
- [x] Track `zalo_oa_follower` status (schema ready)
- [x] Add weekly Zalo token refresh scheduled job

### 3.5 BullMQ Delivery Queue
- [x] Create `notifications` queue
- [x] Create `notifications.processor.ts`
- [x] Implement multi-channel routing:
  - Priority 1: Zalo ZNS (if enabled + has zalo_id)
  - Priority 2: FCM Push (if enabled)
  - Priority 3: Email (if enabled)
- [x] Implement retry logic (3 attempts, exponential backoff)
- [x] Log delivery status to `notifications` table

### 3.6 Notification Triggers
- [x] Payment confirmed → notify resident (all channels)
- [x] Payment unmatched → notify accountants (FCM only)
- [x] Incident status changed → notify reporter
- [x] Building announcement → broadcast to all building residents via `sendBuildingAnnouncement()`
- [x] Late payment reminder → scheduled jobs (3-day, 1-day, overdue)

### 3.7 User Preferences
- [x] Create `/users/notification-preferences` CRUD endpoints
- [x] Add `zalo_enabled` preference
- [x] Respect preferences before sending
- [x] Default preferences on user creation

### 3.8 Testing
- [ ] Unit tests for FCM adapter
- [ ] Unit tests for Zalo ZNS adapter (mock API)
- [ ] Integration test for multi-channel delivery pipeline
- [ ] Add Swagger documentation

---

## 4. Extended RBAC with Building Scope (Medium)

### 4.1 Permission Definitions
- [x] Define `security` role permissions (read residents, read access_cards — building-scoped)
- [x] Define `housekeeping` role permissions (read incidents, update incident status — building-scoped)
- [x] Define `accountant` role permissions (CRUD invoices, read reports, manage unmatched_payments)
- [x] Define `building_manager` role permissions (full building scope)
- [x] Create seed script `scripts/seed-rbac-permissions.sql`

### 4.2 Building-Scoped Guard (NEW)
- [x] Create `building-scoped.guard.ts`
- [x] Implement logic:
  - Admin bypasses all scoping
  - Check `user_building_assignments` for non-admin roles
  - Extract `buildingId` from route params or body
- [x] Apply to building policies, parking, building staff endpoints

### 4.3 User Building Assignment Management
- [x] Create `POST /users/:id/building-assignments` endpoint
- [x] Create `DELETE /users/:id/building-assignments/:buildingId` endpoint
- [x] Create `GET /users/:id/building-assignments` endpoint
- [x] Create `GET /buildings/:buildingId/staff` endpoint (list staff by building)
- [x] Add validation: only admin/building_manager can assign

### 4.4 Guard Updates
- [x] Update `roles.guard.ts` to recognize new roles (uses UserRole enum - auto-updated)
- [ ] Add `@UseGuards(BuildingScopedGuard)` to building-specific endpoints (when created)
- [ ] Test existing endpoints still work

### 4.5 User Assignment
- [x] Update users.controller to allow new role assignments (UserRole enum supports new roles)
- [ ] Add validation for role transitions (optional)
- [ ] Update Swagger docs for role enum

### 4.6 Testing
- [ ] Test security guard can only see assigned building's residents
- [ ] Test accountant can see all invoices (global) or scoped (if configured)
- [ ] Regression test existing role behavior

---

## 5. OAuth Integration (Medium)

### 5.1 Google OAuth
- [ ] Install `passport-google-oauth20` and types (optional - using native fetch)
- [x] Create `oauth.service.ts` with Google OAuth handling
- [x] Create `/auth/google` initiation endpoint
- [x] Create `/auth/google/callback` handler
- [x] Link to existing user if email matches
- [x] Create new user if email not found
- [x] Store OAuth account in `oauth_accounts` table

### 5.2 Zalo OAuth
- [ ] Register Zalo OA application (manual step)
- [x] Implement Zalo OAuth flow (custom, using native fetch)
- [x] Create `/auth/zalo` initiation endpoint
- [x] Create `/auth/zalo/callback` handler
- [x] Handle Zalo user info API
- [x] Store `zalo_id` on user profile (for ZNS notifications)

### 5.3 Account Linking
- [x] Allow linking social account to existing login account
- [x] Prevent duplicate provider links (one provider per user max)
- [x] Add "unlink" endpoint (`DELETE /auth/oauth/link/:provider`)

### 5.4 Frontend Integration
- [x] Create Google login button on login page
- [x] Create Zalo login button on login page
- [x] Handle OAuth callback redirect (`/oauth-callback` page)
- [x] Store JWT from callback

### 5.5 Testing
- [ ] Manual OAuth flow test (Google)
- [ ] Manual OAuth flow test (Zalo)
- [ ] Unit test for account linking logic

---

## 6. Sentry Error Tracking (Low)

### 6.1 Backend Setup
- [ ] Install `@sentry/nestjs` and `@sentry/profiling-node` (pending package install)
- [x] Create Sentry module (`common/sentry/sentry.module.ts`)
- [x] Configure Sentry DSN via environment
- [x] Add Sentry module to `app.module.ts`
- [x] Add user context enrichment (id, email, roles)
- [x] Configure release tracking
- [x] Add sensitive data filtering (passwords, tokens)

### 6.2 Frontend Setup
- [x] Install `@sentry/nextjs`
- [x] Configure error.tsx and global-error.tsx (error boundary)
- [x] Configure next.config.js with withSentryConfig
- [x] Create sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts

### 6.3 Alerts
- [ ] Configure Sentry alerts for production errors
- [ ] Set up Slack/email notification channel

---

## 7. Documentation & Cleanup

- [x] Update .env.example with new environment variables
- [x] Add webhook setup guide for PayOS/Casso/SePay (`docs/PAYMENT_WEBHOOK_SETUP.md`)
- [x] Add FCM setup guide with Firebase project config (`docs/FCM_SETUP.md`)
- [x] Add Zalo OA and ZNS template registration guide (`docs/ZALO_ZNS_SETUP.md`)
- [x] Add RBAC seed script (`scripts/seed-rbac-permissions.sql`)
- [ ] Add OAuth provider registration instructions
- [ ] Document unmatched payments workflow for Accountants
- [ ] Document building-scoped RBAC for security staff
- [x] Update API documentation (Swagger tags in main.ts)
