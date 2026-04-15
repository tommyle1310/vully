# Spec Delta: Notifications (Multi-Channel Push Notifications)

## ADDED Requirements

### Requirement: Device Token Registration
The system SHALL allow users to register their FCM device tokens for push notifications.

#### Scenario: User registers device token
- **GIVEN** an authenticated user with a valid FCM token
- **WHEN** the user calls `POST /api/v1/notifications/devices` with `{ token, platform }`
- **THEN** the system stores the device token linked to the user
- **AND** returns HTTP 201 with the created device record

#### Scenario: User updates existing device token
- **GIVEN** a user with an existing device token
- **WHEN** the user registers a new token from the same device
- **THEN** the system updates the existing token
- **AND** updates `last_used` timestamp

#### Scenario: User unregisters device
- **GIVEN** a user with a registered device token
- **WHEN** the user calls `DELETE /api/v1/notifications/devices/{token}`
- **THEN** the system removes the device token
- **AND** returns HTTP 204

---

### Requirement: Multi-Channel Notification Delivery
The system SHALL deliver notifications via multiple channels with priority: Zalo ZNS → FCM Push → Email.

#### Scenario: User with Zalo ZNS enabled receives notification
- **GIVEN** a notification job in the queue for user X
- **AND** user X has `zalo_enabled: true` and valid `zalo_id`
- **AND** user X is an OA follower (`zalo_oa_follower: true`)
- **WHEN** the notification processor runs
- **THEN** the system sends Zalo ZNS message first
- **AND** falls back to FCM if Zalo fails
- **AND** updates notification record with delivery channel used

#### Scenario: Zalo ZNS fails, fallback to FCM
- **GIVEN** a notification for user with Zalo enabled
- **WHEN** Zalo ZNS delivery fails (user unfollowed OA, rate limit)
- **THEN** the system attempts FCM push as fallback
- **AND** logs Zalo failure reason

#### Scenario: Single user notification delivery (FCM only)
- **GIVEN** a notification job in the queue for user X
- **AND** user X has registered device tokens but no Zalo
- **WHEN** the notification processor runs
- **THEN** the system sends FCM messages to all user X's devices
- **AND** updates notification record with `delivered_at`

#### Scenario: Device token invalid
- **GIVEN** an FCM push fails with `messaging/registration-token-not-registered`
- **WHEN** the notification processor handles the error
- **THEN** the system deletes the invalid device token
- **AND** marks notification as `failed` with reason

#### Scenario: No registered devices
- **GIVEN** a notification for user Y
- **AND** user Y has no registered device tokens
- **WHEN** the notification processor runs
- **THEN** the notification is marked as `skipped`
- **AND** only in-app notification record is created

---

### Requirement: Notification Preferences
The system SHALL respect user notification preferences before sending.

#### Scenario: User disables push notifications
- **GIVEN** a user with `push_enabled: false` in preferences
- **WHEN** a notification job for the user is processed
- **THEN** the system skips FCM delivery
- **AND** only creates in-app notification record

#### Scenario: User disables specific notification type
- **GIVEN** a user with `payment_notifications: false`
- **WHEN** a `payment_confirmed` notification is triggered for the user
- **THEN** the system skips all delivery channels for that notification

---

### Requirement: Building-wide Broadcast
The system SHALL support broadcasting notifications to all residents of a building.

#### Scenario: Admin sends building announcement
- **GIVEN** an admin creates a building announcement
- **WHEN** the announcement is published
- **THEN** the system queues notifications for all residents in the building
- **AND** sends FCM push to all registered devices (via topic or individual)

---

### Requirement: Notification CRUD API
The system SHALL provide endpoints for users to manage their notifications.

#### Scenario: User views notifications
- **GIVEN** an authenticated user
- **WHEN** the user calls `GET /api/v1/notifications`
- **THEN** the system returns paginated notifications for the user
- **AND** includes `is_read` status

#### Scenario: User marks notification as read
- **GIVEN** an unread notification
- **WHEN** the user calls `PATCH /api/v1/notifications/{id}/read`
- **THEN** the system updates `is_read: true` and `read_at`
- **AND** returns HTTP 200

#### Scenario: User marks all as read
- **GIVEN** multiple unread notifications
- **WHEN** the user calls `POST /api/v1/notifications/mark-all-read`
- **THEN** all user's unread notifications are marked as read

---

### Requirement: Stale Token Cleanup
The system SHALL automatically clean up stale device tokens.

#### Scenario: Daily cleanup job
- **GIVEN** device tokens inactive for more than 90 days
- **WHEN** the daily cleanup job runs
- **THEN** the system deletes tokens where `last_used < NOW() - 90 days`

---

## Schema Changes

### Device Tokens Model
```prisma
model device_tokens {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id    String   @db.Uuid
  token      String   @unique @db.VarChar(500)  // FCM token can be long
  platform   String   @db.VarChar(20)           // 'web' | 'android' | 'ios'
  created_at DateTime @default(now()) @db.Timestamptz(6)
  last_used  DateTime @default(now()) @db.Timestamptz(6)
  
  user users @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
  @@index([last_used])
}
```

### User Notification Preferences Model
```prisma
model user_notification_preferences {
  id           String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id      String  @unique @db.Uuid
  
  // Channel preferences
  push_enabled  Boolean @default(true)
  email_enabled Boolean @default(true)
  
  // Type preferences
  payment_notifications     Boolean @default(true)
  incident_notifications    Boolean @default(true)
  announcement_notifications Boolean @default(true)
  
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @updatedAt @db.Timestamptz(6)
  
  user users @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

### Notifications Model Extension
```prisma
model notifications {
  // Existing fields...
  
  // NEW: Delivery tracking
  delivery_status String?  @db.VarChar(20)  // 'pending' | 'delivered' | 'failed' | 'skipped'
  delivered_at    DateTime? @db.Timestamptz(6)
  delivery_error  String?
}
```
