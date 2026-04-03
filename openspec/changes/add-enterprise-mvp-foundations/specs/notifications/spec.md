# Communication & Notification Hub Specification

## Overview

This capability provides a multi-channel notification system supporting email (SendGrid), SMS (Twilio), push notifications (FCM), and in-app notifications with customizable templates and user preference management.

---

## ADDED Requirements

### Requirement: Multi-Channel Notification Delivery

The system SHALL deliver notifications through multiple channels with automatic fallback and user preference respect.

#### Scenario: Send invoice due notification via preferred channels
- **GIVEN** A user with preferences: email=enabled, sms=enabled, push=disabled
- **AND** Invoice INV-2026-0001 is due in 3 days
- **WHEN** Notification is triggered for `invoice_due`
- **THEN** Email is sent via SendGrid
- **AND** SMS is sent via Twilio
- **AND** Push notification is NOT sent (disabled by user)
- **AND** In-app notification is created (always)
- **AND** NotificationDelivery records created for each channel

#### Scenario: Fallback on channel failure
- **GIVEN** A notification being sent to user
- **AND** SMS delivery fails (invalid phone number)
- **WHEN** SMS adapter returns failure
- **THEN** NotificationDelivery is marked as `failed`
- **AND** Email channel proceeds normally
- **AND** Failure is logged with reason

#### Scenario: Respect quiet hours
- **GIVEN** A user with quiet_hours: 22:00 - 07:00
- **AND** Current time is 23:00 local time
- **WHEN** Non-urgent notification is triggered
- **THEN** SMS is queued until 07:00
- **AND** Email is sent immediately (email not affected)
- **AND** In-app notification is created immediately

---

### Requirement: Customizable Notification Templates

The system SHALL support organization-specific notification templates with Handlebars templating and localization.

#### Scenario: Use organization custom template
- **GIVEN** Organization A has custom template for `invoice_due` email
- **AND** Template includes organization logo and Vietnamese text
- **WHEN** Invoice due notification is sent
- **THEN** Organization's custom template is used
- **AND** Variables are interpolated ({{tenant_name}}, {{invoice_number}}, etc.)

#### Scenario: Fall back to default template
- **GIVEN** Organization B has NO custom template for `invoice_due`
- **WHEN** Invoice due notification is sent
- **THEN** System default template is used
- **AND** Variables are interpolated correctly

#### Scenario: Template preview
- **GIVEN** Admin is editing a notification template
- **WHEN** Admin requests preview with sample data
- **THEN** Rendered template is returned
- **AND** All Handlebars expressions are evaluated
- **AND** Preview shows both subject and body

---

### Requirement: Notification Scheduling

The system SHALL support scheduled notifications with BullMQ job processing.

#### Scenario: Schedule lease expiration reminder
- **GIVEN** A contract expiring in 90 days
- **WHEN** Contract is created or updated
- **THEN** Notifications are scheduled:
  - 90 days before: `lease_expiring_90d`
  - 60 days before: `lease_expiring_60d`
  - 30 days before: `lease_expiring_30d`
- **AND** Jobs are queued in BullMQ with delay

#### Scenario: Cancel scheduled notification
- **GIVEN** A lease expiration notification scheduled
- **AND** Tenant renews the contract
- **WHEN** Contract is renewed
- **THEN** Scheduled notifications for old end_date are cancelled
- **AND** New notifications scheduled for new end_date

---

### Requirement: Bulk Notification Delivery

The system SHALL support sending notifications to multiple users efficiently.

#### Scenario: Building-wide announcement
- **GIVEN** Building A with 100 residents
- **WHEN** Admin sends announcement "Water shutdown tomorrow 9 AM"
- **THEN** Notifications are queued for all active residents
- **AND** BullMQ processes in batches (50/batch)
- **AND** Progress is trackable
- **AND** Summary shows: sent=98, failed=2

#### Scenario: Batch invoice due reminders
- **GIVEN** 50 invoices due in 3 days
- **WHEN** Daily reminder job runs
- **THEN** All 50 users are notified
- **AND** Each notification is personalized with invoice details
- **AND** Delivery status tracked per user

---

### Requirement: User Notification Preferences

The system SHALL allow users to manage their notification preferences per channel and notification type.

#### Scenario: User disables SMS for non-urgent notifications
- **GIVEN** A user receiving notifications
- **WHEN** User updates preferences: sms=disabled for `announcement`
- **THEN** Preference is saved
- **AND** Future announcements skip SMS channel for this user
- **AND** Urgent notifications (incidents) still use SMS

#### Scenario: Default preferences for new users
- **GIVEN** A new user account is created
- **WHEN** User preferences are initialized
- **THEN** Default preferences are applied:
  - email: enabled for all types
  - sms: enabled for urgent only
  - push: enabled for all types
  - in_app: enabled for all types (cannot disable)

---

### Requirement: Delivery Tracking and Analytics

The system SHALL track notification delivery status and provide analytics.

#### Scenario: Track email delivery status
- **GIVEN** An email sent via SendGrid
- **WHEN** SendGrid webhook reports `delivered`
- **THEN** NotificationDelivery.status → `delivered`
- **AND** delivered_at timestamp recorded

#### Scenario: Track email bounce
- **GIVEN** An email sent to invalid address
- **WHEN** SendGrid webhook reports `bounced`
- **THEN** NotificationDelivery.status → `bounced`
- **AND** failure_reason: "Invalid email address"
- **AND** User notification preferences flagged for review

#### Scenario: Notification analytics dashboard
- **GIVEN** An organization with 30 days of notification history
- **WHEN** Admin views notification analytics
- **THEN** Dashboard shows:
  - Total sent: 5,000
  - Delivery rate: 97%
  - Bounce rate: 2%
  - Open rate (email): 45%
  - Channel breakdown: email=3000, sms=1500, push=500

---

## Data Model

### NotificationTemplate
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to Organization (null = system default) |
| template_key | VARCHAR(100) | e.g., invoice_due, lease_expiring |
| channel | Enum | email, sms, push, in_app, zalo_oa |
| subject | VARCHAR(255) | Email subject (Handlebars) |
| body_template | TEXT | Message body (Handlebars) |
| is_default | Boolean | System default flag |
| is_active | Boolean | Active flag |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update time |

### NotificationDelivery
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to User |
| template_id | UUID | FK to NotificationTemplate |
| channel | Enum | Delivery channel |
| status | Enum | pending, sent, delivered, failed, bounced |
| external_id | VARCHAR(255) | Provider message ID |
| sent_at | Timestamp | Send time |
| delivered_at | Timestamp | Delivery confirmation time |
| failed_at | Timestamp | Failure time |
| failure_reason | TEXT | Error details |
| metadata | JSONB | Template variables used |
| created_at | Timestamp | Creation time |

### UserNotificationPreference
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to User |
| notification_type | VARCHAR(100) | e.g., invoice, incident, announcement |
| channel | Enum | Notification channel |
| enabled | Boolean | Channel enabled for type |
| quiet_hours_start | INT | Start hour (0-23) |
| quiet_hours_end | INT | End hour (0-23) |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update time |

---

## Notification Types

| Type Key | Description | Default Channels |
|----------|-------------|------------------|
| invoice_created | New invoice generated | email, in_app |
| invoice_due | Invoice due reminder | email, sms, in_app |
| invoice_overdue | Invoice past due | email, sms, in_app |
| payment_received | Payment confirmation | email, in_app |
| lease_expiring | Lease expiration reminder | email, sms, in_app |
| lease_renewed | Lease renewal confirmation | email, in_app |
| incident_created | New incident reported | email, push, in_app |
| incident_updated | Incident status change | email, push, in_app |
| incident_resolved | Incident resolved | email, push, in_app |
| announcement | Building announcement | email, sms, push, in_app |
| compliance_alert | Compliance deadline | email, in_app |
| maintenance_scheduled | Maintenance notification | email, sms, in_app |

---

## API Endpoints

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| GET | /api/notifications/templates | List templates | portfolio_admin |
| POST | /api/notifications/templates | Create template | portfolio_admin |
| PUT | /api/notifications/templates/:id | Update template | portfolio_admin |
| POST | /api/notifications/templates/:id/preview | Preview template | portfolio_admin |
| GET | /api/notifications/preferences | Get user preferences | viewer |
| PUT | /api/notifications/preferences | Update preferences | viewer |
| POST | /api/notifications/send | Send notification | building_admin |
| POST | /api/notifications/broadcast | Broadcast to group | building_admin |
| GET | /api/notifications/analytics | Delivery analytics | portfolio_admin |
| POST | /api/webhooks/sendgrid | SendGrid webhook | (no auth) |
| POST | /api/webhooks/twilio | Twilio status webhook | (no auth) |

---

## Background Jobs

| Job | Queue | Description |
|-----|-------|-------------|
| notification:send | notifications | Process individual notification |
| notification:batch | notifications | Process bulk notifications |
| notification:scheduled | notifications | Process scheduled notifications |
| notification:retry | notifications-dlq | Retry failed deliveries |

---

## Provider Configuration

```typescript
// Environment variables (encrypted)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@vully.com
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+84xxx
FCM_SERVER_KEY=xxx
```

---

## Related Capabilities
- **Billing**: Invoice notifications
- **Contracts**: Lease reminders
- **Incidents**: Status updates
- **Compliance**: Alert notifications
- **Payment Gateway**: Payment confirmations
