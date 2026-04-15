# Tasks: Add Operations Automation

## 1. Schema Updates

### 1.1 Payment Reconciliation Fields
- [ ] Add `payment_reference` (String, unique) to `invoices` table
- [ ] Add `external_transaction_id` (String, indexed) to `invoices` table
- [ ] Add `raw_gateway_response` (Json) to `invoices` table
- [ ] Add `payment_reference` (String, unique) to `contract_payment_schedules` table
- [ ] Add `external_transaction_id` (String) to `contract_payment_schedules` table
- [ ] Add `raw_gateway_response` (Json) to `contract_payment_schedules` table
- [ ] Create migration file with proper indexes
- [ ] Verify migration with `prisma migrate dev`

### 1.2 Unmatched Payments Table (NEW)
- [ ] Create `unmatched_payments` model with fields:
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
- [ ] Add indexes: `status`, `received_at`, `amount`
- [ ] Create migration file

### 1.3 UserRole Enum Extension
- [ ] Add `security` to UserRole enum
- [ ] Add `housekeeping` to UserRole enum
- [ ] Add `accountant` to UserRole enum
- [ ] Add `building_manager` to UserRole enum
- [ ] Update `@vully/shared-types` UserRole enum
- [ ] Create migration file

### 1.4 Building Assignments Table (NEW - for scoped RBAC)
- [ ] Create `user_building_assignments` model:
  - `user_id` (UUID)
  - `building_id` (UUID)
  - `role` (UserRole)
  - `assigned_at` (DateTime)
  - `assigned_by` (UUID, nullable)
- [ ] Add unique constraint [user_id, building_id]
- [ ] Add relations to `users` and `buildings`
- [ ] Create migration file

### 1.5 Device Tokens & Notification Preferences
- [ ] Create `device_tokens` model (user_id, token, platform, created_at, last_used)
- [ ] Create `user_notification_preferences` model:
  - `push_enabled`, `email_enabled`, `zalo_enabled` (booleans)
  - `payment_notifications`, `incident_notifications`, `announcement_notifications`
- [ ] Add `zalo_id` (String, unique, nullable) to `users` table
- [ ] Add `zalo_oa_follower` (Boolean) to `users` table
- [ ] Add relations to `users` model
- [ ] Create migration file

### 1.6 OAuth Provider Tables
- [ ] Create `oauth_accounts` model (user_id, provider, provider_user_id, access_token, refresh_token)
- [ ] Add unique constraint [provider, provider_user_id]
- [ ] Add relation to `users` model
- [ ] Create migration file

---

## 2. VietQR Webhook Module (Critical)

### 2.1 Module Structure
- [ ] Create `apps/api/src/modules/payments-webhook/` directory
- [ ] Create `payments-webhook.module.ts`
- [ ] Create `payments-webhook.controller.ts`
- [ ] Create `payments-webhook.service.ts`
- [ ] Create `dto/webhook-payload.dto.ts`
- [ ] Register module in `app.module.ts`

### 2.2 Security Layer
- [ ] Implement PayOS signature verification
- [ ] Implement Casso signature verification
- [ ] Implement SePay signature verification
- [ ] Add IP whitelist guard (optional, configurable)
- [ ] Add rate limiting (100 req/min per IP)

### 2.3 Webhook Logic (⚠️ CRITICAL: Use Prisma $transaction)
- [ ] Parse `payment_reference` from transfer description
- [ ] Extract invoice ID from payment_reference pattern (e.g., `VULLY-INV-{id}`)
- [ ] **⚠️ MUST use `prisma.$transaction()` for atomic check-and-update**:
  - Check idempotency via `external_transaction_id`
  - Find invoice by `payment_reference`
  - If no match → store in `unmatched_payments`
  - If match → update invoice status
  - All in SAME transaction to prevent double-crediting
- [ ] Update `paid_amount` and `paid_at` fields
- [ ] Store `raw_gateway_response` for audit trail

### 2.4 Unmatched Payments Handling (NEW)
- [ ] Create `unmatched-payments.service.ts`
- [ ] Create `unmatched-payments.controller.ts` (Accountant UI)
- [ ] Implement `GET /api/v1/unmatched-payments` (list pending)
- [ ] Implement `POST /api/v1/unmatched-payments/:id/match` (manual match)
- [ ] Implement `POST /api/v1/unmatched-payments/:id/reject` (reject with reason)
- [ ] Add Swagger docs for Accountant endpoints
- [ ] Add `@Roles(UserRole.accountant, UserRole.admin)` guards

### 2.5 Manual Re-sync / Reconciliation Job (NEW)
- [ ] Create `reconciliation.service.ts`
- [ ] Implement `fetchRecentTransactions()` for each gateway adapter:
  - PayOS: GET /payment-requests (last 24h)
  - Casso: GET /transactions (last 24h)
  - SePay: GET /transactions (last 24h)
- [ ] Implement `reconcileLast24Hours(gateway)` method:
  - Fetch transactions from gateway API
  - Skip if `external_transaction_id` exists in invoices
  - Skip if `transaction_id` exists in `unmatched_payments`
  - Process remaining as new webhooks
- [ ] Create `POST /api/v1/payments/reconcile` endpoint (Accountant/Admin only)
- [ ] Create scheduled BullMQ job: daily at 6 AM

### 2.6 Event Emission
- [ ] Emit `payment.completed` via `IncidentsGateway` (or create PaymentsGateway)
- [ ] Emit `payment.unmatched` for Accountant notification
- [ ] Enqueue notification delivery job
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
- [ ] Uncomment `NotificationsModule` in `app.module.ts`
- [ ] Create `notifications.service.ts`
- [ ] Create `notifications.controller.ts`
- [ ] Create DTOs for notification CRUD

### 3.2 Device Token Management
- [ ] Create `/notifications/register-device` endpoint
- [ ] Create `/notifications/unregister-device` endpoint
- [ ] Auto-clean stale tokens (BullMQ job, daily)

### 3.3 FCM Integration
- [ ] Install `firebase-admin` SDK
- [ ] Create `fcm.adapter.ts`
- [ ] Implement `sendToDevice(token, payload)`
- [ ] Implement `sendToTopic(topic, payload)` for broadcasts
- [ ] Handle FCM errors (invalid token cleanup)

### 3.4 Zalo ZNS Integration (NEW)
- [ ] Register Zalo Official Account (OA)
- [ ] Apply for ZNS template approval (payment, incident, announcement)
- [ ] Create `zalo-zns.adapter.ts`
- [ ] Implement `sendZNS(zaloId, templateId, templateData)`
- [ ] Handle Zalo API errors and rate limits
- [ ] Store `zalo_id` on user profile during Zalo OAuth
- [ ] Track `zalo_oa_follower` status

### 3.5 BullMQ Delivery Queue
- [ ] Create `notifications` queue
- [ ] Create `notifications.processor.ts`
- [ ] Implement multi-channel routing:
  - Priority 1: Zalo ZNS (if enabled + has zalo_id)
  - Priority 2: FCM Push (if enabled)
  - Priority 3: Email (if enabled)
- [ ] Implement retry logic (3 attempts, exponential backoff)
- [ ] Log delivery status to `notifications` table

### 3.6 Notification Triggers
- [ ] Payment confirmed → notify resident (all channels)
- [ ] Payment unmatched → notify accountants (FCM only)
- [ ] Incident status changed → notify reporter
- [ ] Building announcement → broadcast to all building residents
- [ ] Late payment reminder → scheduled job

### 3.7 User Preferences
- [ ] Create `/users/notification-preferences` CRUD endpoints
- [ ] Add `zalo_enabled` preference
- [ ] Respect preferences before sending
- [ ] Default preferences on user creation

### 3.8 Testing
- [ ] Unit tests for FCM adapter
- [ ] Unit tests for Zalo ZNS adapter (mock API)
- [ ] Integration test for multi-channel delivery pipeline
- [ ] Add Swagger documentation

---

## 4. Extended RBAC with Building Scope (Medium)

### 4.1 Permission Definitions
- [ ] Define `security` role permissions (read residents, read access_cards — building-scoped)
- [ ] Define `housekeeping` role permissions (read incidents, update incident status — building-scoped)
- [ ] Define `accountant` role permissions (CRUD invoices, read reports, manage unmatched_payments)
- [ ] Define `building_manager` role permissions (full building scope)
- [ ] Add permissions to `permissions` table via seed

### 4.2 Building-Scoped Guard (NEW)
- [ ] Create `building-scoped.guard.ts`
- [ ] Implement logic:
  - Admin bypasses all scoping
  - Check `user_building_assignments` for non-admin roles
  - Extract `buildingId` from route params or body
- [ ] Apply to relevant endpoints: `GET /buildings/:id/residents`, etc.

### 4.3 User Building Assignment Management
- [ ] Create `POST /users/:id/building-assignments` endpoint
- [ ] Create `DELETE /users/:id/building-assignments/:buildingId` endpoint
- [ ] Create `GET /users/:id/building-assignments` endpoint
- [ ] Add validation: only admin/building_manager can assign

### 4.4 Guard Updates
- [ ] Update `roles.guard.ts` to recognize new roles
- [ ] Add `@UseGuards(BuildingScopedGuard)` to building-specific endpoints
- [ ] Test existing endpoints still work

### 4.5 User Assignment
- [ ] Update users.controller to allow new role assignments
- [ ] Add validation for role transitions
- [ ] Update Swagger docs for role enum

### 4.6 Testing
- [ ] Test security guard can only see assigned building's residents
- [ ] Test accountant can see all invoices (global) or scoped (if configured)
- [ ] Regression test existing role behavior

---

## 5. OAuth Integration (Medium)

### 5.1 Google OAuth
- [ ] Install `passport-google-oauth20` and types
- [ ] Create `google.strategy.ts`
- [ ] Create `/auth/google` initiation endpoint
- [ ] Create `/auth/google/callback` handler
- [ ] Link to existing user if email matches
- [ ] Create new user if email not found
- [ ] Store OAuth account in `oauth_accounts` table

### 5.2 Zalo OAuth
- [ ] Register Zalo OA application
- [ ] Implement Zalo OAuth flow (custom, no passport adapter)
- [ ] Create `/auth/zalo` initiation endpoint
- [ ] Create `/auth/zalo/callback` handler
- [ ] Handle Zalo user info API
- [ ] Store `zalo_id` on user profile (for ZNS notifications)

### 5.3 Account Linking
- [ ] Allow linking social account to existing login account
- [ ] Prevent duplicate provider links (one provider per user max)
- [ ] Add "unlink" endpoint

### 5.4 Frontend Integration
- [ ] Create Google login button on login page
- [ ] Create Zalo login button on login page
- [ ] Handle OAuth callback redirect
- [ ] Store JWT from callback

### 5.5 Testing
- [ ] Manual OAuth flow test (Google)
- [ ] Manual OAuth flow test (Zalo)
- [ ] Unit test for account linking logic

---

## 6. Sentry Error Tracking (Low)

### 6.1 Backend Setup
- [ ] Install `@sentry/nestjs` and `@sentry/profiling-node`
- [ ] Configure Sentry DSN in environment
- [ ] Add Sentry module to `app.module.ts`
- [ ] Add user context enrichment (id, role)
- [ ] Configure release tracking

### 6.2 Frontend Setup
- [ ] Install `@sentry/nextjs`
- [ ] Configure _error.tsx and error boundary
- [ ] Upload source maps during build
- [ ] Add user context from auth store

### 6.3 Alerts
- [ ] Configure Sentry alerts for production errors
- [ ] Set up Slack/email notification channel

---

## 7. Documentation & Cleanup

- [ ] Update README with new environment variables
- [ ] Add webhook setup guide for PayOS/Casso/SePay
- [ ] Add FCM setup guide with Firebase project config
- [ ] Add Zalo OA and ZNS template registration guide
- [ ] Add OAuth provider registration instructions
- [ ] Document unmatched payments workflow for Accountants
- [ ] Document building-scoped RBAC for security staff
- [ ] Update API documentation (Swagger)
