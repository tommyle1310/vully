# API Contracts (Generated Baseline)

Source: Swagger JSON
Title: Vully API
Version: 1.0

## access card requests

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/access-card-requests | List access card requests (admin only) |
| POST | /api/v1/access-card-requests/{id}/approve | Approve request and issue access card (admin only) |
| POST | /api/v1/access-card-requests/{id}/reject | Reject access card request (admin only) |
| POST | /api/v1/apartments/{apartmentId}/access-card-requests | Create an access card request for an apartment |

## access cards

| Method | Path | Summary |
|---|---|---|
| POST | /api/v1/access-cards | Issue a new access card (admin only) |
| GET | /api/v1/access-cards/{id} | Get access card details |
| PATCH | /api/v1/access-cards/{id} | Update access card zones/floor access (admin only) |
| POST | /api/v1/access-cards/{id}/deactivate | Deactivate an access card (admin/technician) |
| POST | /api/v1/access-cards/{id}/reactivate | Reactivate a lost/deactivated card (admin only) |
| GET | /api/v1/apartments/{apartmentId}/access-cards | List all access cards for an apartment |
| GET | /api/v1/apartments/{apartmentId}/access-cards/stats | Get access card statistics for an apartment |

## ai assistant

| Method | Path | Summary |
|---|---|---|
| POST | /api/v1/ai-assistant/chat | Chat with AI assistant (RAG-powered) |
| GET | /api/v1/ai-assistant/documents | List all documents (Admin only) |
| POST | /api/v1/ai-assistant/documents | Create knowledge document (Admin only) |
| DELETE | /api/v1/ai-assistant/documents/{id} | Delete document (Admin only) |
| GET | /api/v1/ai-assistant/documents/{id} | Get document by ID (Admin only) |
| POST | /api/v1/ai-assistant/documents/search | Search documents with vector similarity (Admin only) |
| GET | /api/v1/ai-assistant/history | Get user chat history |
| GET | /api/v1/ai-assistant/quota | Get remaining query quota for today |

## apartments

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/apartments | List apartments |
| POST | /api/v1/apartments | Create a new apartment (admin only) |
| GET | /api/v1/apartments/{id} | Get apartment by ID |
| PATCH | /api/v1/apartments/{id} | Update apartment (admin only) |
| GET | /api/v1/apartments/{id}/effective-config | Get effective apartment configuration with policy inheritance |
| GET | /api/v1/apartments/{id}/parking-slots | Get parking slots assigned to an apartment |
| PATCH | /api/v1/apartments/{id}/status | Update apartment status |
| GET | /api/v1/apartments/my | Get current resident's apartment |

## authentication

| Method | Path | Summary |
|---|---|---|
| POST | /api/v1/auth/forgot-password | Request password reset email |
| POST | /api/v1/auth/login | User login |
| POST | /api/v1/auth/logout | User logout |
| POST | /api/v1/auth/logout-all | Logout from all devices |
| GET | /api/v1/auth/me | Get current user profile |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/register | Public user registration (creates resident account) |
| POST | /api/v1/auth/reset-password | Reset password with token |

## bank accounts

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/bank-accounts | List all bank accounts |
| POST | /api/v1/bank-accounts | Create a new bank account |
| DELETE | /api/v1/bank-accounts/{id} | Delete bank account |
| GET | /api/v1/bank-accounts/{id} | Get bank account by ID |
| PATCH | /api/v1/bank-accounts/{id} | Update bank account |
| GET | /api/v1/bank-accounts/building/{buildingId} | Get bank accounts for a building |
| POST | /api/v1/bank-accounts/building/{buildingId} | Create bank account for a building |
| GET | /api/v1/bank-accounts/for-payment | Get bank account for payment QR |

## billing jobs

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/billing-jobs | List billing jobs |
| GET | /api/v1/billing-jobs/{id} | Get billing job status by ID |
| POST | /api/v1/billing-jobs/generate | Trigger bulk invoice generation for a billing period |
| GET | /api/v1/billing-jobs/stats | Get queue statistics |

## building assignments

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/users/{userId}/building-assignments | Get user building assignments |
| POST | /api/v1/users/{userId}/building-assignments | Assign user to a building |
| DELETE | /api/v1/users/{userId}/building-assignments/{buildingId} | Remove user from building |
| PATCH | /api/v1/users/{userId}/building-assignments/{buildingId} | Update building assignment role |

## building policies

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/buildings/{buildingId}/policies | List all policies for a building (versioned history) |
| POST | /api/v1/buildings/{buildingId}/policies | Create a new policy version (admin only) |
| GET | /api/v1/buildings/{buildingId}/policies/{policyId} | Get a specific policy by ID |
| PATCH | /api/v1/buildings/{buildingId}/policies/{policyId} | Update a future policy (admin only) |
| GET | /api/v1/buildings/{buildingId}/policies/current | Get currently effective policy |

## building staff

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/buildings/{buildingId}/staff | Get building staff list |

## buildings

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/buildings | List all buildings |
| POST | /api/v1/buildings | Create a new building (admin only) |
| GET | /api/v1/buildings/{id} | Get building by ID |
| PATCH | /api/v1/buildings/{id} | Update building (admin only) |
| GET | /api/v1/buildings/{id}/meters | Get all meter IDs for apartments in a building with duplicate detection |
| GET | /api/v1/buildings/{id}/stats | Get building occupancy statistics |
| PATCH | /api/v1/buildings/{id}/svg-map | Update building SVG map (admin only) |
| GET | /api/v1/buildings/my/policies | Get building policies for current user's apartment |

## contracts

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/contracts | List contracts (admin only) |
| POST | /api/v1/contracts | Create a new contract (admin only) |
| GET | /api/v1/contracts/{id} | Get contract by ID |
| PATCH | /api/v1/contracts/{id} | Update contract (admin only) |
| POST | /api/v1/contracts/{id}/terminate | Terminate contract (admin only) |
| GET | /api/v1/contracts/my | Get current user's contracts (as tenant) |
| GET | /api/v1/contracts/my/apartment | Get current user's active apartment (based on active contract) |

## device tokens

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/notifications/devices | Get registered devices |
| POST | /api/v1/notifications/devices/register | Register device for push notifications |
| POST | /api/v1/notifications/devices/unregister | Unregister device from push notifications |

## health

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/health | Liveness check |
| GET | /api/v1/health/ready | Readiness check (DB, Redis, Queue) |

## incident comments

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/incidents/{id}/comments | Get all comments for an incident |
| POST | /api/v1/incidents/{id}/comments | Add a comment to an incident |
| DELETE | /api/v1/incidents/comments/{commentId} | Delete a comment (author or admin) |
| PATCH | /api/v1/incidents/comments/{commentId} | Update a comment (author or admin) |

## incidents

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/incidents | List incidents (filtered by role and query params) |
| POST | /api/v1/incidents | Report a new incident |
| DELETE | /api/v1/incidents/{id} | Delete incident (admin only) |
| GET | /api/v1/incidents/{id} | Get incident details with comments |
| PATCH | /api/v1/incidents/{id} | Update incident details (admin or owner if open) |
| PATCH | /api/v1/incidents/{id}/assign | Assign a technician to the incident (admin only) |
| PATCH | /api/v1/incidents/{id}/status | Update incident status (with workflow validation) |
| GET | /api/v1/incidents/my | Get incidents belonging to current user (reported/assigned) |

## invoices

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/invoices | List invoices (filtered by role) |
| POST | /api/v1/invoices | Create a new invoice (admin only) |
| GET | /api/v1/invoices/{id} | Get invoice by ID |
| PATCH | /api/v1/invoices/{id} | Update invoice status/payment (admin only) |
| PATCH | /api/v1/invoices/{id}/pay | Mark invoice as paid (admin only) |
| GET | /api/v1/invoices/{id}/payment-qr | Get VietQR payment code for an invoice |
| POST | /api/v1/invoices/{id}/report-payment | Report a payment transfer for an invoice (resident) |
| PATCH | /api/v1/invoices/{id}/verify-payment | Verify or reject a reported invoice payment (admin) |
| GET | /api/v1/invoices/overdue | Get overdue invoices (admin only) |
| GET | /api/v1/invoices/payments/history | Get invoice payment verification history (admin) |
| GET | /api/v1/invoices/payments/reported | Get invoices with reported payments awaiting verification (admin) |

## meter readings

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/meter-readings | List meter readings (filtered by role) |
| POST | /api/v1/meter-readings | Submit a meter reading |
| DELETE | /api/v1/meter-readings/{id} | Delete meter reading (admin only) |
| GET | /api/v1/meter-readings/{id} | Get meter reading by ID |
| PATCH | /api/v1/meter-readings/{id} | Update meter reading (admin/technician) |
| GET | /api/v1/meter-readings/apartment/{apartmentId}/latest | Get latest readings for an apartment |

## notification preferences

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/notifications/preferences | Get notification preferences |
| PATCH | /api/v1/notifications/preferences | Update notification preferences |

## notifications

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/notifications | Get user's notifications |
| DELETE | /api/v1/notifications/{id} | Delete a notification |
| POST | /api/v1/notifications/broadcast | Broadcast notification (Admin only) |
| POST | /api/v1/notifications/mark-all-read | Mark all notifications as read |
| POST | /api/v1/notifications/mark-read | Mark notifications as read |
| GET | /api/v1/notifications/unread-count | Get unread notification count |

## oauth

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/auth/google | Initiate Google OAuth flow (redirects to Google) |
| GET | /api/v1/auth/google/callback | Handle Google OAuth callback |
| GET | /api/v1/auth/google/link | Initiate Google account linking |
| GET | /api/v1/auth/oauth/accounts | Get linked OAuth accounts |
| POST | /api/v1/auth/oauth/link | Link OAuth account to current user |
| DELETE | /api/v1/auth/oauth/link/{provider} | Unlink OAuth account |
| GET | /api/v1/auth/zalo | Initiate Zalo OAuth flow (redirects to Zalo) |
| GET | /api/v1/auth/zalo/callback | Handle Zalo OAuth callback |
| GET | /api/v1/auth/zalo/link | Initiate Zalo account linking |

## parking

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/buildings/{buildingId}/parking/stats | Get parking statistics for a building |
| GET | /api/v1/buildings/{buildingId}/parking/zones | List all parking zones for a building |
| POST | /api/v1/buildings/{buildingId}/parking/zones | Create a new parking zone (admin only) |
| GET | /api/v1/buildings/{buildingId}/parking/zones/{zoneId} | Get a specific parking zone |
| PATCH | /api/v1/buildings/{buildingId}/parking/zones/{zoneId} | Update a parking zone (admin only) |
| GET | /api/v1/buildings/{buildingId}/parking/zones/{zoneId}/slots | List all slots in a parking zone |
| POST | /api/v1/buildings/{buildingId}/parking/zones/{zoneId}/slots | Bulk create parking slots (admin only) |
| PATCH | /api/v1/buildings/{buildingId}/parking/zones/{zoneId}/slots/{slotId} | Update a parking slot (admin only) |
| POST | /api/v1/buildings/{buildingId}/parking/zones/{zoneId}/slots/{slotId}/assign | Assign a parking slot to an apartment |
| POST | /api/v1/buildings/{buildingId}/parking/zones/{zoneId}/slots/{slotId}/unassign | Unassign a parking slot |

## payment reconciliation

| Method | Path | Summary |
|---|---|---|
| POST | /api/v1/payments/reconcile | Manually reconcile recent transactions from gateway |
| POST | /api/v1/payments/reconcile-all | Manually reconcile all gateways |

## payment schedules

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/contracts/{contractId}/financial-summary | Get contract financial summary |
| POST | /api/v1/contracts/{contractId}/generate-purchase-milestones | Auto-generate payment milestones for a purchase contract |
| POST | /api/v1/contracts/{contractId}/generate-rent-schedule | Auto-generate rent schedules for a rental contract |
| GET | /api/v1/contracts/{contractId}/payment-schedules | Get payment schedules for a contract |
| POST | /api/v1/contracts/{contractId}/payment-schedules | Create a payment schedule entry |
| GET | /api/v1/contracts/{contractId}/payments | Get all payments for a contract |
| DELETE | /api/v1/payment-schedules/{id} | Delete a payment schedule (must have no payments) |
| GET | /api/v1/payment-schedules/{id} | Get a payment schedule by ID |
| PATCH | /api/v1/payment-schedules/{id} | Update a payment schedule |
| POST | /api/v1/payment-schedules/{scheduleId}/payments | Record a payment against a schedule |
| POST | /api/v1/payment-schedules/{scheduleId}/report | Report a payment transfer (resident - awaiting admin verification) |
| DELETE | /api/v1/payments/{id} | Delete/void a payment |
| PATCH | /api/v1/payments/{id}/verify | Verify or reject a reported payment |
| GET | /api/v1/payments/history | Get payment history (confirmed/rejected in last N days) |
| GET | /api/v1/payments/pending | Get all pending payments awaiting verification |

## payment webhooks

| Method | Path | Summary |
|---|---|---|
| POST | /api/v1/payments/webhook | Generic payment webhook (for testing) |
| POST | /api/v1/payments/webhook/casso | Receive Casso payment webhook |
| POST | /api/v1/payments/webhook/payos | Receive PayOS payment webhook |
| POST | /api/v1/payments/webhook/sepay | Receive SePay payment webhook |

## statistics

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/stats/admin | Get admin statistics (revenue, etc.) |
| GET | /api/v1/stats/analytics/incidents | Get incident analytics (by category, priority, status) |
| GET | /api/v1/stats/analytics/occupancy | Get occupancy trend over last N months |
| GET | /api/v1/stats/analytics/revenue | Get revenue breakdown by category over last N months |
| GET | /api/v1/stats/dashboard | Get dashboard statistics |
| GET | /api/v1/stats/recent-activity | Get recent activity feed (incidents, invoices, contracts) |
| GET | /api/v1/stats/technician-dashboard | Get technician dashboard stats (assigned to current user) |

## unmatched payments

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/unmatched-payments | List unmatched payments |
| GET | /api/v1/unmatched-payments/{id} | Get unmatched payment details |
| POST | /api/v1/unmatched-payments/{id}/match | Match unmatched payment to an invoice |
| GET | /api/v1/unmatched-payments/{id}/potential-matches | Search invoices that could match this payment |
| POST | /api/v1/unmatched-payments/{id}/reject | Reject unmatched payment |
| GET | /api/v1/unmatched-payments/stats | Get unmatched payment statistics |

## users

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/users | List all users (admin only) |
| POST | /api/v1/users | Create a new user (admin only) |
| GET | /api/v1/users/{id} | Get user by ID (admin only) |
| PATCH | /api/v1/users/{id} | Update user (admin only) |
| GET | /api/v1/users/{id}/roles | Get all roles for a user (admin only) |
| POST | /api/v1/users/{id}/roles/{role} | Assign a role to a user (admin only, max 3 roles per user) |
| POST | /api/v1/users/{id}/roles/{role}/revoke | Revoke a role from a user (admin only, must have at least 1 role) |
| PATCH | /api/v1/users/{id}/technician-profile | Update technician profile (admin or self, technician only) |
| GET | /api/v1/users/me | Get own profile |
| PATCH | /api/v1/users/me | Update own profile |
| PATCH | /api/v1/users/me/password | Change own password |
| GET | /api/v1/users/technicians | List all technicians with workload summary (admin only) |

## utility types

| Method | Path | Summary |
|---|---|---|
| GET | /api/v1/utility-types | List all utility types |
| POST | /api/v1/utility-types | Create a new utility type (admin only) |
| GET | /api/v1/utility-types/{id} | Get utility type by ID |
| PATCH | /api/v1/utility-types/{id} | Update utility type (admin only) |
| POST | /api/v1/utility-types/seed | Seed default utility types (electric, water, gas) |

## Notes

- This file is generated as a baseline and should be curated for role scopes and business constraints.
- Regenerate whenever route signatures change.
