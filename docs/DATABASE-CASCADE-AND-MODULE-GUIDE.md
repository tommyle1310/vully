# Database Cascade Delete Analysis & Module Guide

**Generated:** April 13, 2026  
**Last Updated:** April 13, 2026 (Cascade fixes applied via migration `20260413000001_fix_cascade_delete_relationships`)  
**Purpose:** Understanding database relationships, cascade behavior, and comprehensive module documentation

---

## ✅ **CASCADE DELETE FIXES APPLIED**

**Migration:** `20260413000001_fix_cascade_delete_relationships`  
**Status:** ✅ Applied to database on April 13, 2026

All cascade delete issues identified below have been fixed. Foreign key constraints now properly handle deletions with appropriate cascade behaviors (CASCADE, SET NULL, or RESTRICT).

---

## 📊 Database Cascade Delete Analysis

### ⚠️ Critical Cascade Delete Issues Found

When you delete records in the database, some related data **WILL NOT** be automatically deleted due to missing cascade configurations. Here are the relationships that need attention:

### ✅ **SAFE TO DELETE (Has Cascade Delete)**

These relationships will automatically clean up related records:

| Parent Table | Child Table | Relationship | Status |
|--------------|-------------|--------------|--------|
| `buildings` | `apartments` | Building → Apartments | ✅ CASCADE |
| `buildings` | `bank_accounts` | Building → Bank Accounts | ✅ CASCADE |
| `buildings` | `building_policies` | Building → Policies | ✅ CASCADE |
| `buildings` | `parking_zones` | Building → Parking Zones | ✅ CASCADE |
| `buildings` | `management_fee_configs` | Building → Fee Configs | ✅ CASCADE |
| `buildings` | `utility_tiers` | Building → Utility Tiers | ✅ CASCADE |
| `apartments` | `contracts` | Apartment → Contracts | ✅ CASCADE |
| `apartments` | `incidents` | Apartment → Incidents | ✅ CASCADE |
| `apartments` | `invoices` | Apartment → Invoices | ✅ CASCADE |
| `apartments` | `meter_readings` | Apartment → Meter Readings | ✅ CASCADE |
| `apartments` | `access_cards` | Apartment → Access Cards | ✅ CASCADE |
| `apartments` | `access_card_requests` | Apartment → Card Requests | ✅ CASCADE |
| `contracts` | `invoices` | Contract → Invoices | ✅ CASCADE |
| `contracts` | `contract_payment_schedules` | Contract → Payment Schedules | ✅ CASCADE |
| `contract_payment_schedules` | `contract_payments` | Schedule → Payments | ✅ CASCADE |
| `incidents` | `incident_comments` | Incident → Comments | ✅ CASCADE |
| `invoices` | `invoice_line_items` | Invoice → Line Items | ✅ CASCADE |
| `documents` | `document_chunks` | Document → Chunks | ✅ CASCADE |
| `parking_zones` | `parking_slots` | Zone → Slots | ✅ CASCADE |
| `users` | `chat_queries` | User → Chat Queries | ✅ CASCADE |
| `users` | `notifications` | User → Notifications | ✅ CASCADE |
| `users` | `password_reset_tokens` | User → Reset Tokens | ✅ CASCADE |
| `users` | `refresh_tokens` | User → Refresh Tokens | ✅ CASCADE |
| `users` | `user_role_assignments` | User → Role Assignments | ✅ CASCADE |
| `users` | `access_card_requests` (requester) | User → Card Requests | ✅ CASCADE |
| `users` | `bank_accounts` (owner) | User → Bank Accounts | ✅ CASCADE |
| `permissions` | `role_permissions` | Permission → Role Links | ✅ CASCADE |
| `utility_types` | `utility_tiers` | Utility Type → Tiers | ✅ CASCADE |

---

### ✅ **FIXED - Now Safe to Delete (Cascade Configured)**

All the relationships below have been fixed with proper cascade behavior:

| Parent Table | Child Table | Relationship | Behavior | Status |
|--------------|-------------|--------------|----------|--------|
| `users` | `apartments` (owner_id) | User → Owned Apartments | **SET NULL** | ✅ Fixed - apartments keep their data, owner_id becomes null |
| `users` | `audit_logs` (actor_id) | User → Audit Logs | **SET NULL** | ✅ Already nullable - audit logs retained for compliance |
| `users` | `contracts` (created_by) | User → Contracts Created | **SET NULL** | ✅ Fixed - contracts retained, creator reference removed |
| `users` | `contracts` (tenant_id) | User → Tenant Contracts | **RESTRICT** | ✅ Fixed - prevents deletion of tenants with active contracts |
| `users` | `incident_comments` (author_id) | User → Comments | **SET NULL** | ✅ Fixed - comments retained, author reference removed |
| `users` | `incidents` (assigned_to) | User → Assigned Incidents | **SET NULL** | ✅ Fixed - incidents become unassigned |
| `users` | `incidents` (reported_by) | User → Reported Incidents | **SET NULL** | ✅ Fixed - incidents retained, reporter reference removed |
| `users` | `meter_readings` (recorded_by) | User → Meter Readings | **SET NULL** | ✅ Fixed - readings retained, recorder reference removed |
| `users` | `building_policies` (created_by) | User → Policies Created | **SET NULL** | ✅ Fixed - policies retained |
| `users` | `access_cards` (holder_id) | User → Access Cards Held | **SET NULL** | ✅ Fixed - cards retained, holder reference removed |
| `users` | `access_cards` (deactivated_by) | User → Cards Deactivated | **SET NULL** | ✅ Fixed - cards retained |
| `users` | `access_card_requests` (reviewed_by) | User → Card Requests Reviewed | **SET NULL** | ✅ Fixed - requests retained |
| `users` | `contract_payments` (recorded_by) | User → Payments Recorded | **RESTRICT** | ✅ Fixed - prevents deletion of admins who recorded payments |
| `users` | `contract_payments` (reported_by) | User → Payments Reported | **SET NULL** | ✅ Fixed - payments retained |
| `users` | `contract_payments` (verified_by) | User → Payments Verified | **SET NULL** | ✅ Fixed - payments retained |
| `apartments` | `apartments` (parent_unit_id) | Merged Units | **SET NULL** | ✅ Fixed - self-referential relationship handled |
| `apartments` | `parking_slots` (assigned_apt_id) | Apartment → Parking Slots | **SET NULL** | ✅ Fixed - slots become unassigned |
| `management_fee_configs` | `apartments` (mgmt_fee_config_id) | Fee Config → Apartments | **SET NULL** | ✅ Fixed - apartments lose fee config reference |
| `utility_types` | `invoice_line_items` (utility_type_id) | Utility Type → Line Items | **SET NULL** | ✅ Fixed - line items retained |
| `utility_types` | `meter_readings` (utility_type_id) | Utility Type → Readings | **RESTRICT** | ✅ Fixed - prevents deletion of utility types with readings |
| `meter_readings` | `invoice_line_items` (meter_reading_id) | Reading → Line Items | **SET NULL** | ✅ Fixed - line items retained |
| `access_cards` | `parking_slots` (access_card_id) | Card → Parking Slots | **SET NULL** | ✅ Fixed - slots lose card reference |
| `access_cards` | `access_card_requests` (issued_card_id) | Card → Requests | **SET NULL** | ✅ Fixed - requests retained |

---

### 🔒 **Protected Deletions (RESTRICT Configured)**

These relationships now **PREVENT deletion** to maintain data integrity:

| Parent Table | Child Table | Reason for Restriction |
|--------------|-------------|------------------------|
| `users` | `contracts` (tenant_id) | ❌ Cannot delete a tenant if they have contracts (legal/financial records) |
| `users` | `contract_payments` (recorded_by) | ❌ Cannot delete admin who recorded payments (financial audit trail) |
| `utility_types` | `meter_readings` | ❌ Cannot delete utility type if meter readings exist (historical data integrity) |

**Note:** Application-level checks should also enforce these restrictions with user-friendly error messages.

---

### ⚠️ **DANGEROUS TO DELETE (No Cascade / Restrict)** *(LEGACY - NOW FIXED)*

~~These relationships will **PREVENT deletion** or leave orphaned records:~~

**ALL ISSUES BELOW HAVE BEEN RESOLVED IN MIGRATION `20260413000001_fix_cascade_delete_relationships`**

<details>
<summary>🗂️ View original issues (now fixed)</summary>

| Parent Table | Child Table | Relationship | Behavior | Risk |
|--------------|-------------|--------------|----------|------|
| `users` | `apartments` (owner_id) | User → Owned Apartments | **NO CASCADE** | ❌ Deleting owner leaves apartments without owner reference |
| `users` | `audit_logs` (actor_id) | User → Audit Logs | **NO CASCADE** | ⚠️ Audit logs remain (acceptable for compliance) |
| `users` | `contracts` (created_by) | User → Contracts Created | **NO CASCADE** | ⚠️ Contracts remain but lose creator reference |
| `users` | `contracts` (tenant_id) | User → Tenant Contracts | **NO CASCADE** | ❌ **CRITICAL**: Cannot delete tenant if they have contracts |
| `users` | `incident_comments` (author_id) | User → Comments | **NO CASCADE** | ⚠️ Comments remain but lose author |
| `users` | `incidents` (assigned_to) | User → Assigned Incidents | **NO CASCADE** | ⚠️ Incidents remain unassigned |
| `users` | `incidents` (reported_by) | User → Reported Incidents | **NO CASCADE** | ⚠️ Incidents remain but lose reporter |
| `users` | `meter_readings` (recorded_by) | User → Meter Readings | **NO CASCADE** | ⚠️ Readings remain but lose recorder |
| `users` | `building_policies` (created_by) | User → Policies Created | **NO CASCADE** | ⚠️ Policies remain |
| `users` | `access_cards` (holder_id) | User → Access Cards Held | **NO CASCADE** | ⚠️ Cards remain but lose holder |
| `users` | `access_cards` (deactivated_by) | User → Cards Deactivated | **NO CASCADE** | ⚠️ Cards remain |
| `users` | `access_card_requests` (reviewed_by) | User → Card Requests Reviewed | **NO CASCADE** | ⚠️ Requests remain |
| `users` | `contract_payments` (recorded_by) | User → Payments Recorded | **NO CASCADE** | ❌ **CRITICAL**: Cannot delete admin who recorded payments |
| `users` | `contract_payments` (reported_by) | User → Payments Reported | **NO CASCADE** | ⚠️ Payments remain |
| `users` | `contract_payments` (verified_by) | User → Payments Verified | **NO CASCADE** | ⚠️ Payments remain |
| `apartments` | `apartments` (parent_unit_id) | Merged Units | **NO CASCADE** | ⚠️ Self-referential relationship |
| `apartments` | `parking_slots` (assigned_apt_id) | Apartment → Parking Slots | **NO CASCADE** | ⚠️ Slots become unassigned |
| `management_fee_configs` | `apartments` (mgmt_fee_config_id) | Fee Config → Apartments | **NO CASCADE** | ⚠️ Apartments lose fee config reference |
| `utility_types` | `invoice_line_items` (utility_type_id) | Utility Type → Line Items | **NO CASCADE** | ⚠️ Line items remain |
| `utility_types` | `meter_readings` (utility_type_id) | Utility Type → Readings | **NO CASCADE** | ❌ **CRITICAL**: Cannot delete utility type if readings exist |
| `meter_readings` | `invoice_line_items` (meter_reading_id) | Reading → Line Items | **NO CASCADE** | ⚠️ Line items remain |
| `access_cards` | `parking_slots` (access_card_id) | Card → Parking Slots | **NO CASCADE** | ⚠️ Slots lose card reference |
| `access_cards` | `access_card_requests` (issued_card_id) | Card → Requests | **NO CASCADE** | ⚠️ Requests remain |

</details>

---

### ✅ **Database Fixes Applied**

~~To prevent orphaned records and improve data integrity, consider these schema changes:~~

**All fixes have been applied via migration `20260413000001_fix_cascade_delete_relationships`**

The following changes were implemented:

#### **1. ✅ Critical: User Deletion Protection**
```sql
-- APPLIED: Prevent deletion of users with active contracts
ALTER TABLE contracts ADD CONSTRAINT contracts_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE RESTRICT;

-- APPLIED: Prevent deletion of admins who recorded payments
ALTER TABLE contract_payments ADD CONSTRAINT contract_payments_recorded_by_fkey 
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT;
```

#### **2. ✅ Apartment Ownership**
```sql
-- APPLIED: Set owner_id to NULL when owner is deleted (apartments can be unowned)
ALTER TABLE apartments ADD CONSTRAINT apartments_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
```

#### **3. ✅ Parking Slots Assignment**
```sql
-- APPLIED: Clear assignment when apartment is deleted
ALTER TABLE parking_slots ADD CONSTRAINT parking_slots_assigned_apt_id_fkey
  FOREIGN KEY (assigned_apt_id) REFERENCES apartments(id) ON DELETE SET NULL;
```

#### **4. ✅ Access Cards Holder**
```sql
-- APPLIED: Clear holder when user is deleted
ALTER TABLE access_cards ADD CONSTRAINT access_cards_holder_id_fkey
  FOREIGN KEY (holder_id) REFERENCES users(id) ON DELETE SET NULL;
```

#### **5. ✅ Incidents and Comments**
```sql
-- APPLIED: Clear reporter/assigned when user is deleted
ALTER TABLE incidents ADD CONSTRAINT incidents_reported_by_fkey
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE incidents ADD CONSTRAINT incidents_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE incident_comments ADD CONSTRAINT incident_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
```

**See full migration:** [apps/api/prisma/migrations/20260413000001_fix_cascade_delete_relationships/migration.sql](../apps/api/prisma/migrations/20260413000001_fix_cascade_delete_relationships/migration.sql)

---

## 📚 Module Documentation

Below is a comprehensive guide to each module in the API.

---

## 1. 🔐 **Identity Module** (`/modules/identity/`)

### **Purpose**
Handles user authentication, authorization, and user management. Implements JWT-based authentication with access/refresh tokens and multi-role RBAC (Role-Based Access Control).

### **Database Tables**
- `users` - User accounts and profiles
- `user_role_assignments` - Maps users to multiple roles (multi-role support)
- `permissions` - System permissions (e.g., `invoices:read`, `apartments:write`)
- `role_permissions` - Maps roles to permissions
- `refresh_tokens` - JWT refresh tokens for session management
- `password_reset_tokens` - Password reset tokens for forgot password flow
- `audit_logs` - Tracks sensitive user actions

### **Services**

#### **`auth.service.ts`**
- **Purpose:** Authentication logic (login, register, refresh tokens, password reset)
- **Key Methods:**
  - `register(dto)` - Create new user account
  - `login(dto)` - Authenticate user and return access + refresh tokens
  - `refreshToken(token)` - Generate new access token using refresh token
  - `validateUser(email, password)` - Verify credentials
  - `forgotPassword(email)` - Generate password reset token and send email
  - `resetPassword(token, newPassword)` - Reset password using token
  - `revokeToken(tokenId)` - Invalidate refresh token

#### **`users.service.ts`**
- **Purpose:** User CRUD operations and role management
- **Key Methods:**
  - `findAll(filters)` - List users with pagination/filtering
  - `findOne(id)` - Get user details
  - `update(id, dto)` - Update user profile
  - `assignRole(userId, role)` - Assign role to user (multi-role support via `user_role_assignments`)
  - `removeRole(userId, role)` - Remove role from user
  - `getUserRoles(userId)` - Get all roles assigned to user
  - `getUserPermissions(userId)` - Get aggregated permissions from all roles

### **API Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Create new user account | Public |
| POST | `/auth/login` | Login and get tokens | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/forgot-password` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |
| POST | `/auth/logout` | Revoke refresh token | JWT |
| GET | `/users` | List users | Admin |
| GET | `/users/:id` | Get user details | Admin/Self |
| PATCH | `/users/:id` | Update user | Admin/Self |
| POST | `/users/:id/roles` | Assign role to user | Admin |
| DELETE | `/users/:id/roles/:role` | Remove role from user | Admin |

### **BullMQ Jobs**
None (uses real-time processing)

### **WebSocket Events**
None

---

## 2. 🏢 **Apartments Module** (`/modules/apartments/`)

### **Purpose**
Manages buildings, apartments, contracts, parking, access cards, bank accounts, building policies, and payment schedules. This is the core module for property management.

### **Database Tables**
- `buildings` - Building master data
- `apartments` - Individual apartment/unit details (50+ fields)
- `contracts` - Rental/purchase/lease-to-own contracts
- `parking_zones` - Parking areas (car/motorcycle/bicycle)
- `parking_slots` - Individual parking slots
- `access_cards` - Physical access cards
- `access_card_requests` - Card request workflow (pending → approved/rejected)
- `bank_accounts` - VietQR payment accounts (building + owner)
- `building_policies` - Versioned building rules (occupancy, billing, trash)
- `management_fee_configs` - Management fee pricing by building/unit type
- `contract_payment_schedules` - Payment due dates for contracts
- `contract_payments` - Recorded payments against schedules

### **Services**

#### **`buildings.service.ts`**
- **Purpose:** Building CRUD operations
- **Key Methods:**
  - `create(dto)` - Create new building
  - `findAll()` - List all buildings
  - `findOne(id)` - Get building details with apartments count
  - `update(id, dto)` - Update building info
  - `delete(id)` - Delete building (cascades to apartments, parking, policies)

#### **`buildings-svg.service.ts`**
- **Purpose:** SVG floor plan management
- **Key Methods:**
  - `updateSvgMap(buildingId, svgData)` - Save SVG floor plan
  - `getSvgMap(buildingId)` - Retrieve SVG floor plan
  - `validateSvg(svgData)` - Validate SVG structure

#### **`apartments.service.ts`**
- **Purpose:** Apartment CRUD and policy inheritance
- **Key Methods:**
  - `create(dto)` - Create apartment
  - `findAll(filters)` - List apartments with filtering (status, floor, type)
  - `findOne(id)` - Get apartment details with contract, invoices, parking
  - `update(id, dto)` - Update apartment
  - `delete(id)` - Delete apartment (cascades to contracts, incidents, invoices)
  - `getInheritedPolicies(apartmentId)` - Get effective policies (apartment override → building policy → defaults)

#### **`apartments-config.service.ts`**
- **Purpose:** Policy inheritance logic
- **Key Methods:**
  - `getEffectiveConfig(apartmentId)` - Compute final config (max_residents, billing_cycle, pet_allowed, access_card_limit)
  - `calculateMaxResidents(grossArea)` - Apply 25m² per person formula if no override

#### **`contracts.service.ts`**
- **Purpose:** Contract management (rental, purchase, lease-to-own)
- **Key Methods:**
  - `create(dto)` - Create contract
  - `findAll(filters)` - List contracts
  - `findOne(id)` - Get contract with payment schedules
  - `update(id, dto)` - Update contract
  - `terminate(id, terminationDate)` - Terminate contract early
  - `generatePaymentSchedules(contractId)` - Auto-generate payment schedules based on contract type

#### **`contracts-tenant.service.ts`**
- **Purpose:** Tenant-specific contract views
- **Key Methods:**
  - `getMyContracts(tenantId)` - Get contracts for logged-in tenant
  - `getMyPaymentSchedules(tenantId)` - Get payment due dates for tenant
  - `reportPayment(scheduleId, proofUrl)` - Tenant reports payment with receipt

#### **`payment-schedule.service.ts`**
- **Purpose:** Payment schedule and payment recording
- **Key Methods:**
  - `generateSchedules(contractId)` - Generate payment schedules based on contract type/dates
  - `getSchedulesByContract(contractId)` - List all schedules for contract
  - `recordPayment(scheduleId, dto)` - Admin records payment
  - `getFinancialSummary(contractId)` - Get total expected, received, outstanding amounts
  - `voidPayment(paymentId)` - Reverse a payment record

#### **`payment-generator.service.ts`**
- **Purpose:** Auto-generate payment schedules
- **Key Methods:**
  - `generateRentalSchedule(contract)` - Generate monthly rent schedules
  - `generatePurchaseSchedule(contract)` - Generate downpayment + milestone payments
  - `generateLeaseToOwnSchedule(contract)` - Generate rent + option fee schedule

#### **`parking.service.ts`**
- **Purpose:** Parking zone and slot management
- **Key Methods:**
  - `createZone(buildingId, dto)` - Create parking zone
  - `createSlot(zoneId, dto)` - Create parking slot
  - `assignSlot(slotId, apartmentId)` - Assign slot to apartment
  - `unassignSlot(slotId)` - Release slot
  - `getAvailableSlots(buildingId, type)` - List available slots by type

#### **`building-policies.service.ts`**
- **Purpose:** Versioned building policies
- **Key Methods:**
  - `createPolicy(buildingId, dto)` - Create new policy version
  - `getCurrentPolicy(buildingId)` - Get active policy (effective_to = null)
  - `getPolicyHistory(buildingId)` - List all policy versions

#### **`bank-accounts.service.ts`**
- **Purpose:** VietQR bank account management
- **Key Methods:**
  - `createBuildingAccount(buildingId, dto)` - Add building bank account
  - `createOwnerAccount(ownerId, dto)` - Add owner bank account
  - `setPrimary(accountId)` - Mark account as primary
  - `findByBuilding(buildingId)` - List building accounts

#### **`access-cards.service.ts`**
- **Purpose:** Access card CRUD
- **Key Methods:**
  - `issue(apartmentId, dto)` - Issue new card
  - `findByApartment(apartmentId)` - List cards for apartment
  - `edit(cardId, dto)` - Update card zones/floors
  - `deactivate(cardId)` - Deactivate lost/stolen card
  - `reactivate(cardId)` - Reactivate card

#### **`access-cards-lifecycle.service.ts`**
- **Purpose:** Card lifecycle automation
- **Key Methods:**
  - `checkExpiry()` - Auto-deactivate expired cards (cron job)
  - `checkLimit(apartmentId)` - Validate card limit before issuance

#### **`access-cards-helpers.service.ts`**
- **Purpose:** Card status helpers
- **Key Methods:**
  - `canIssueCard(apartmentId)` - Check if apartment reached card limit
  - `getAvailableZones(buildingId)` - List available access zones

#### **`access-card-requests.service.ts`**
- **Purpose:** Card request workflow (resident requests, admin approves)
- **Key Methods:**
  - `create(apartmentId, userId, dto)` - Resident creates request
  - `findAll(filters)` - List requests (admin view)
  - `approve(requestId, adminId)` - Admin approves request → auto-issue card
  - `reject(requestId, adminId, note)` - Admin rejects request

### **API Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Buildings** ||||
| POST | `/buildings` | Create building | Admin |
| GET | `/buildings` | List buildings | All |
| GET | `/buildings/:id` | Get building details | All |
| PATCH | `/buildings/:id` | Update building | Admin |
| DELETE | `/buildings/:id` | Delete building | Admin |
| PUT | `/buildings/:id/svg-map` | Update SVG floor plan | Admin |
| **Apartments** ||||
| POST | `/apartments` | Create apartment | Admin |
| GET | `/apartments` | List apartments (with filters) | All |
| GET | `/apartments/:id` | Get apartment details | All |
| PATCH | `/apartments/:id` | Update apartment | Admin |
| DELETE | `/apartments/:id` | Delete apartment | Admin |
| GET | `/apartments/:id/config` | Get inherited policies | All |
| **Contracts** ||||
| POST | `/contracts` | Create contract | Admin |
| GET | `/contracts` | List contracts | Admin |
| GET | `/contracts/my` | Get my contracts (tenant) | Resident |
| GET | `/contracts/:id` | Get contract details | Admin/Tenant |
| PATCH | `/contracts/:id` | Update contract | Admin |
| POST | `/contracts/:id/terminate` | Terminate contract | Admin |
| POST | `/contracts/:id/payment-schedules/generate` | Generate schedules | Admin |
| **Payment Schedules** ||||
| GET | `/contracts/:id/payment-schedules` | List schedules | Admin/Tenant |
| POST | `/contracts/:id/payment-schedules/:scheduleId/payments` | Record payment | Admin |
| DELETE | `/contracts/payments/:paymentId` | Void payment | Admin |
| GET | `/contracts/:id/financial-summary` | Get financial summary | Admin |
| **Parking** ||||
| POST | `/parking/zones` | Create parking zone | Admin |
| POST | `/parking/slots` | Create parking slot | Admin |
| POST | `/parking/slots/:id/assign` | Assign slot | Admin |
| POST | `/parking/slots/:id/unassign` | Unassign slot | Admin |
| GET | `/parking/buildings/:id/slots` | List slots by building | All |
| **Building Policies** ||||
| POST | `/buildings/:id/policies` | Create policy version | Admin |
| GET | `/buildings/:id/policies/current` | Get current policy | All |
| GET | `/buildings/:id/policies` | Get policy history | Admin |
| **Bank Accounts** ||||
| POST | `/bank-accounts/buildings/:id` | Add building account | Admin |
| POST | `/bank-accounts/owners/:id` | Add owner account | Admin |
| PATCH | `/bank-accounts/:id/set-primary` | Set primary account | Admin |
| GET | `/bank-accounts/buildings/:id` | List building accounts | Admin |
| **Access Cards** ||||
| POST | `/access-cards` | Issue access card | Admin |
| GET | `/access-cards/apartments/:id` | List cards by apartment | Admin/Resident |
| PATCH | `/access-cards/:id` | Edit card | Admin |
| POST | `/access-cards/:id/deactivate` | Deactivate card | Admin |
| POST | `/access-cards/:id/reactivate` | Reactivate card | Admin |
| **Access Card Requests** ||||
| POST | `/access-card-requests` | Create request | Resident |
| GET | `/access-card-requests` | List requests | Admin |
| POST | `/access-card-requests/:id/approve` | Approve request | Admin |
| POST | `/access-card-requests/:id/reject` | Reject request | Admin |

### **BullMQ Jobs**
None (uses real-time processing)

### **WebSocket Events**
None

---

## 3. 💸 **Billing Module** (`/modules/billing/`)

### **Purpose**
Generates monthly invoices for utilities and management fees, processes meter readings with image proof, manages utility pricing tiers, and handles VietQR QR code generation for payments.

### **Database Tables**
- `invoices` - Monthly invoices (dual-stream: operational utilities + property management fees)
- `invoice_line_items` - Line items (water, electricity, gas, trash, management fee)
- `meter_readings` - Meter readings with image proof
- `utility_types` - Utility definitions (water, electricity, gas) with units
- `utility_tiers` - Tiered pricing (e.g., 0-50 kWh = $0.10/kWh, 51-100 kWh = $0.15/kWh)
- `management_fee_configs` - Management fee pricing by building/unit type
- `billing_jobs` - Batch billing job status tracking

### **Services**

#### **`invoices.service.ts`**
- **Purpose:** Invoice CRUD and payment processing
- **Key Methods:**
  - `create(dto)` - Manually create invoice
  - `findAll(filters)` - List invoices (filter by status, period, apartment)
  - `findOne(id)` - Get invoice details with line items
  - `markAsPaid(id, paidAt)` - Mark invoice as paid
  - `cancel(id)` - Cancel invoice
  - `getByBillingPeriod(period)` - Get all invoices for a period

#### **`invoice-calculator.service.ts`**
- **Purpose:** Invoice calculation logic (tiered pricing, VAT, environment fees)
- **Key Methods:**
  - `calculateUtilityCharge(usage, tiers, vatRate)` - Apply tiered pricing and compute total + VAT + environment fee
  - `calculateManagementFee(area, pricePerSqm, vatRate)` - Compute management fee
  - `generateLineItem(description, quantity, unitPrice, category)` - Create line item

#### **`vacant-billing.service.ts`**
- **Purpose:** Generate management fee invoices for vacant apartments (no tenant, owner pays)
- **Key Methods:**
  - `generateVacantInvoices(billingPeriod)` - Create management fee invoices for vacant units

#### **`billing-queue.service.ts`**
- **Purpose:** Queue management for BullMQ
- **Key Methods:**
  - `addGenerateInvoicesJob(billingPeriod)` - Queue job to generate invoices for all contracts in a period
  - `getJobStatus(jobId)` - Check job progress

#### **`vietqr.service.ts`**
- **Purpose:** VietQR QR code generation for bank transfers
- **Key Methods:**
  - `generateQR(accountNumber, amount, description)` - Generate VietQR code
  - `validateQRData(data)` - Validate QR code format

#### **`meter-readings.service.ts`**
- **Purpose:** Meter reading CRUD
- **Key Methods:**
  - `create(apartmentId, dto)` - Record meter reading with image proof
  - `findByApartment(apartmentId, period)` - Get readings for apartment
  - `update(id, dto)` - Update reading
  - `delete(id)` - Delete reading

#### **`utility-types.service.ts`**
- **Purpose:** Utility type management (water, electricity, gas)
- **Key Methods:**
  - `create(dto)` - Create utility type
  - `findAll()` - List utility types
  - `createTier(utilityTypeId, dto)` - Create pricing tier
  - `getTiers(utilityTypeId, effectiveDate)` - Get active tiers for date

### **API Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Invoices** ||||
| POST | `/invoices` | Create invoice manually | Admin |
| GET | `/invoices` | List invoices (with filters) | Admin |
| GET | `/invoices/my` | Get my invoices (resident) | Resident |
| GET | `/invoices/:id` | Get invoice details | Admin/Resident |
| POST | `/invoices/:id/mark-paid` | Mark invoice as paid | Admin |
| POST | `/invoices/:id/cancel` | Cancel invoice | Admin |
| **Meter Readings** ||||
| POST | `/meter-readings` | Record meter reading | Admin/Technician |
| GET | `/meter-readings/apartments/:id` | List readings by apartment | Admin |
| PATCH | `/meter-readings/:id` | Update reading | Admin |
| DELETE | `/meter-readings/:id` | Delete reading | Admin |
| **Utility Types** ||||
| POST | `/utility-types` | Create utility type | Admin |
| GET | `/utility-types` | List utility types | All |
| POST | `/utility-types/:id/tiers` | Create pricing tier | Admin |
| GET | `/utility-types/:id/tiers` | List tiers | All |
| **Billing Jobs** ||||
| POST | `/billing/jobs/generate-invoices` | Queue invoice generation job | Admin |
| GET | `/billing/jobs/:id` | Get job status | Admin |

### **BullMQ Jobs**

#### **Queue:** `billing`
#### **Processor:** `billing.processor.ts`

| Job Name | Trigger | Purpose | Retry |
|----------|---------|---------|-------|
| `generate-invoices` | Manual via API or cron | Generate invoices for all contracts in a billing period | 3 times |

**Job Flow:**
1. Admin triggers job via `/billing/jobs/generate-invoices` with `{ billingPeriod: '2026-04' }`
2. Job queued to BullMQ `billing` queue
3. `BillingProcessor` processes job:
   - Find all active contracts
   - For each contract:
     - Generate operational invoice (utilities based on meter readings)
     - Generate property invoice (management fees)
   - Track progress in `billing_jobs` table
4. On completion, update `billing_jobs.status = 'completed'`

### **WebSocket Events**
None

---

## 4. 🔧 **Incidents Module** (`/modules/incidents/`)

### **Purpose**
Tracks maintenance requests and incidents reported by residents, assigns them to technicians, and provides real-time updates via WebSocket.

### **Database Tables**
- `incidents` - Incident/maintenance request records
- `incident_comments` - Comments on incidents (internal notes + resident updates)

### **Services**

#### **`incidents.service.ts`**
- **Purpose:** Incident CRUD and assignment
- **Key Methods:**
  - `create(apartmentId, reportedBy, dto)` - Create incident
  - `findAll(filters)` - List incidents (filter by status, priority, assigned_to)
  - `findOne(id)` - Get incident details with comments
  - `update(id, dto)` - Update incident (status, priority, assigned_to)
  - `resolve(id, resolutionNotes)` - Mark incident as resolved
  - `delete(id)` - Delete incident

#### **`incident-comments.service.ts`**
- **Purpose:** Comment management
- **Key Methods:**
  - `create(incidentId, authorId, content, isInternal)` - Add comment
  - `findByIncident(incidentId)` - List comments for incident
  - `delete(id)` - Delete comment

### **API Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/incidents` | Create incident | Resident/Admin |
| GET | `/incidents` | List all incidents | Admin |
| GET | `/incidents/my-assignments` | Get my assigned incidents | Technician |
| GET | `/incidents/my-reports` | Get incidents I reported | Resident |
| GET | `/incidents/:id` | Get incident details | All |
| PATCH | `/incidents/:id` | Update incident | Admin/Technician |
| POST | `/incidents/:id/resolve` | Mark as resolved | Technician |
| DELETE | `/incidents/:id` | Delete incident | Admin |
| POST | `/incidents/:id/comments` | Add comment | All |
| GET | `/incidents/:id/comments` | List comments | All |

### **BullMQ Jobs**
None

### **WebSocket Events**

#### **Gateway:** `incidents.gateway.ts`
#### **Namespace:** `/incidents`

| Event | Trigger | Payload | Purpose |
|-------|---------|---------|---------|
| `incident:created` | New incident created | `{ id, apartmentId, status, priority, title }` | Notify admins/technicians |
| `incident:updated` | Incident status/assignment changed | `{ id, status, assignedTo }` | Real-time status updates |
| `incident:resolved` | Incident marked resolved | `{ id, resolvedAt, resolutionNotes }` | Notify reporter |
| `comment:added` | New comment added | `{ incidentId, authorId, content, isInternal }` | Real-time chat |

**Room Strategy:**
- `apartments:{apartmentId}` - Room for apartment-specific incidents
- `technician:{technicianId}` - Room for assigned incidents

---

## 5. 📊 **Stats Module** (`/modules/stats/`)

### **Purpose**
Provides dashboard analytics: occupancy rates, revenue trends, incident statistics, and activity feeds. Uses Redis caching (5-min TTL) for performance.

### **Database Tables**
Uses joins across multiple tables (read-only queries):
- `apartments` - Occupancy stats
- `invoices` - Revenue stats
- `incidents` - Incident stats
- `contracts` - Contract stats

### **Services**

#### **`stats.service.ts`**
- **Purpose:** Main stats aggregation
- **Key Methods:**
  - `getDashboardStats()` - Get high-level metrics (total apartments, occupancy rate, pending incidents)
  - `getOccupancyByBuilding(buildingId)` - Calculate occupancy rate
  - `getRevenueByPeriod(startDate, endDate)` - Sum invoice totals

#### **`stats-analytics.service.ts`**
- **Purpose:** Advanced analytics with Redis caching
- **Key Methods:**
  - `getOccupancyTrend(buildingId, months)` - Monthly occupancy percentages (cached 5 min)
  - `getRevenueTrend(buildingId, months)` - Monthly revenue totals (cached 5 min)
  - `getIncidentsByCategory()` - Incident breakdown by category (cached 5 min)
  - `getActivityFeed(limit)` - Recent activity across modules (cached 1 min)

### **API Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/stats/dashboard` | Get dashboard summary | Admin |
| GET | `/stats/occupancy/:buildingId` | Get occupancy rate by building | Admin |
| GET | `/stats/revenue` | Get revenue trend | Admin |
| GET | `/stats/incidents` | Get incident breakdown | Admin |
| GET | `/stats/activity-feed` | Get recent activity | Admin |

### **BullMQ Jobs**
None (uses Redis caching instead)

### **WebSocket Events**
None

---

## 6. 🤖 **AI Assistant Module** (`/modules/ai-assistant/`)

### **Purpose**
RAG (Retrieval-Augmented Generation) chatbot using Gemini AI + pgvector for semantic search. Answers questions about building policies, billing, procedures using embedded knowledge base.

### **Database Tables**
- `documents` - Knowledge base documents (FAQ, policies, procedures)
- `document_chunks` - Chunked text with vector embeddings (pgvector)
- `chat_queries` - User chat history with token usage tracking

### **Services**

#### **`ai-assistant.service.ts`**
- **Purpose:** Main chatbot service
- **Key Methods:**
  - `chat(userId, query)` - Process user query and return AI response
  - `getChatHistory(userId)` - Get user's chat history

#### **`ai-assistant-search.service.ts`**
- **Purpose:** Vector similarity search
- **Key Methods:**
  - `searchRelevantDocs(query, topK)` - Find top K most relevant document chunks using cosine similarity
  - `getContext(chunks)` - Combine chunks into context for LLM

#### **`embedding.service.ts`**
- **Purpose:** Generate vector embeddings for text
- **Key Methods:**
  - `generateEmbedding(text)` - Call Gemini API to get embedding vector
  - `batchEmbeddings(texts)` - Batch process multiple texts

#### **`document.service.ts`**
- **Purpose:** Knowledge base management
- **Key Methods:**
  - `create(dto)` - Add new document
  - `update(id, dto)` - Update document and re-embed
  - `delete(id)` - Delete document and chunks
  - `reindexAll()` - Re-generate all embeddings

### **API Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ai-assistant/chat` | Send chat message | All (20/day for residents) |
| GET | `/ai-assistant/history` | Get chat history | All |
| POST | `/ai-assistant/documents` | Add knowledge base document | Admin |
| PATCH | `/ai-assistant/documents/:id` | Update document | Admin |
| DELETE | `/ai-assistant/documents/:id` | Delete document | Admin |

### **BullMQ Jobs**
None (uses real-time processing)

### **WebSocket Events**
None (could add streaming responses in future)

### **Rate Limiting**
- **Admin:** Unlimited queries
- **Technician/Resident:** 20 queries per day (tracked in `chat_queries` table)

---

## 7. 🏛️ **Management Board Module** (`/modules/management-board/`)

### **Purpose**
🚧 **SKELETON IMPLEMENTATION** - Empty controllers, no services implemented yet. Placeholder for future vendor, investor, and board member management.

### **Database Tables**
None yet (planned)

### **Services**
None yet

### **API Endpoints**
None yet

### **BullMQ Jobs**
None

### **WebSocket Events**
None

---

## 🔍 **Summary Table: Module Overview**

| Module | Primary Tables | Services | API Endpoints | BullMQ Jobs | WebSocket | Status |
|--------|----------------|----------|---------------|-------------|-----------|--------|
| **Identity** | users, permissions, refresh_tokens | 2 | 12 | ❌ | ❌ | ✅ Complete |
| **Apartments** | buildings, apartments, contracts, parking, access_cards | 14 | 45+ | ❌ | ❌ | ✅ Complete |
| **Billing** | invoices, meter_readings, utility_tiers | 7 | 15 | ✅ Yes (1) | ❌ | ✅ Complete |
| **Incidents** | incidents, incident_comments | 2 | 10 | ❌ | ✅ Yes (4) | ✅ Complete |
| **Stats** | (joins multiple) | 2 | 5 | ❌ | ❌ | ✅ Complete |
| **AI Assistant** | documents, document_chunks, chat_queries | 4 | 5 | ❌ | ❌ | ✅ Complete |
| **Management Board** | None | 0 | 0 | ❌ | ❌ | 🚧 Skeleton |

---

## ✅ **Completed Actions & Remaining Tasks**

### ✅ **Completed (April 13, 2026)**

1. **✅ DONE:** Updated all foreign key constraints with proper cascade behavior:
   - SET NULL for optional relationships (owner_id, holder_id, recorded_by, etc.)
   - RESTRICT for critical relationships (tenant contracts, payment recordings)
   - CASCADE for dependent child records (invoices, incidents, comments)

2. **✅ DONE:** Made nullable columns support SET NULL cascade:
   - `incident_comments.author_id` (String → String?)
   - `incidents.reported_by` (String → String?)

3. **✅ DONE:** Applied migration `20260413000001_fix_cascade_delete_relationships` to database

### 📋 **Recommended Next Steps**

1. **Application-Level Validation:** Add user-friendly error messages when deletion is blocked:
   ```typescript
   // Example: In users.service.ts
   async delete(userId: string) {
     // Check for active contracts
     const activeContracts = await prisma.contracts.count({
       where: { tenant_id: userId, status: 'active' }
     });
     if (activeContracts > 0) {
       throw new BadRequestException(
         `Cannot delete user: they have ${activeContracts} active contract(s). Please terminate contracts first.`
       );
     }
     
     // Check for recorded payments
     const recordedPayments = await prisma.contract_payments.count({
       where: { recorded_by: userId }
     });
     if (recordedPayments > 0) {
       throw new BadRequestException(
         `Cannot delete user: they have recorded ${recordedPayments} payment(s) in the system.`
       );
     }
     
     // Safe to delete
     return prisma.users.delete({ where: { id: userId } });
   }
   ```

2. **Soft Delete Pattern (Optional):** Consider implementing soft deletes for users:
   ```typescript
   // Add to users table
   deleted_at DateTime?
   
   // Instead of hard delete:
   async softDelete(userId: string) {
     return prisma.users.update({
       where: { id: userId },
       data: { deleted_at: new Date(), is_active: false }
     });
   }
   ```

3. **Testing:** Run deletion tests to verify cascade behavior:
   - Test deleting building → cascades to apartments → cascades to contracts
   - Test deleting user with contracts → should be blocked by RESTRICT
   - Test deleting apartment owner → should set owner_id to NULL
   - Test deleting utility type with readings → should be blocked by RESTRICT

4. **Monitoring:** Add audit logging for deletion attempts (successful and blocked)

---

## 📝 **Migration Summary**

### **Applied Migration:** `20260413000001_fix_cascade_delete_relationships`

**Changes Made:**
- Updated 22 foreign key constraints with proper cascade behavior
- Made 2 columns nullable to support SET NULL cascade
- Protected 3 critical relationships with RESTRICT to prevent data loss

**Database Impact:**
- ✅ No data loss (migration only updates constraints)
- ✅ No downtime required
- ✅ Full backward compatibility with existing queries

**Files Changed:**
- [schema.prisma](../apps/api/prisma/schema.prisma) - Updated relationship definitions
- [migration.sql](../apps/api/prisma/migrations/20260413000001_fix_cascade_delete_relationships/migration.sql) - SQL to alter constraints

---

## 📝 **Notes**

- **Cascade Delete:** Most parent-child relationships have cascade deletes enabled, but user-related relationships are intentionally left without cascade to preserve audit trails.
- **BullMQ:** Only billing module uses BullMQ for batch invoice generation. Other modules use real-time processing.
- **WebSocket:** Only incidents module uses WebSocket for real-time updates. Could be expanded to other modules (e.g., invoice payment notifications).
- **Redis:** Stats module uses Redis caching (5-min TTL) to reduce database load for analytics queries.
- **Multi-Role RBAC:** Users can hold multiple roles via `user_role_assignments` table. Permissions are union of all assigned roles.

---

**End of Document**
