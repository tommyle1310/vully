# FCM Push Notification Setup Guide

This guide explains how to configure Firebase Cloud Messaging (FCM) for push notifications in Vully.

## Prerequisites

- Google account
- Firebase project (free tier available)

## Firebase Project Setup

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter project name: `vully-production` (or your preferred name)
4. Disable Google Analytics (optional, for simplicity)
5. Click "Create project"

### 2. Generate Service Account Key

1. In Firebase Console, click ⚙️ (gear icon) → **Project settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file (keep it secure!)

### 3. Extract Credentials

From the downloaded JSON file, extract:

```json
{
  "project_id": "your-firebase-project-id",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

### 4. Configure Environment Variables

Add to your `.env` file:

```env
# The private key must be on a single line with \n for newlines
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"
```

**⚠️ Important**: The private key must be surrounded by double quotes and contain literal `\n` characters.

## Mobile App Configuration

### Android (React Native / Flutter)

1. In Firebase Console → Project settings → Your apps → Add app → Android
2. Enter package name: `com.vully.app`
3. Download `google-services.json`
4. Place in `android/app/` directory

### iOS (React Native / Flutter)

1. In Firebase Console → Project settings → Your apps → Add app → iOS
2. Enter Bundle ID: `com.vully.app`
3. Download `GoogleService-Info.plist`
4. Add to Xcode project

### Web (PWA)

1. In Firebase Console → Project settings → Your apps → Add app → Web
2. Copy the config object for `firebase.initializeApp()`

## Device Token Registration

### Frontend Implementation

When user logs in, register device token:

```typescript
import { getMessaging, getToken } from 'firebase/messaging';

async function registerPushNotifications() {
  const messaging = getMessaging();
  
  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  
  // Get FCM token
  const token = await getToken(messaging, {
    vapidKey: 'your-vapid-key' // For web push
  });
  
  // Send to backend
  await fetch('/api/v1/notifications/device-tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token,
      platform: 'web' // or 'android', 'ios'
    })
  });
}
```

### Token Lifecycle

| Event | Action |
|-------|--------|
| User login | Register token |
| User logout | Unregister token |
| Token refresh | Update backend with new token |
| App uninstall | Backend cleanup job removes stale tokens |

## Notification Types

| Type | Description | Channels |
|------|-------------|----------|
| `payment_confirmed` | Invoice paid | FCM, Zalo ZNS, Email |
| `payment_reminder` | Payment overdue | FCM, Zalo ZNS |
| `incident_status` | Incident update | FCM |
| `announcement` | Building news | FCM (broadcast) |

## Testing Notifications

### Via API

```bash
# Send test notification (Admin only)
curl -X POST http://localhost:3001/api/v1/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "type": "test",
    "title": "Test Notification",
    "body": "This is a test push notification",
    "channels": ["fcm"]
  }'
```

### Via Firebase Console

1. Go to Firebase Console → Messaging
2. Click "New campaign" → Notifications
3. Enter title and body
4. Target: Single device (paste FCM token) or Topic
5. Send test message

## Topic Subscriptions

For broadcast notifications, use topics:

| Topic | Audience |
|-------|----------|
| `building_{buildingId}` | All residents in building |
| `role_accountant` | All accountants |
| `role_security` | All security staff |
| `announcements` | All app users |

### Subscribe to Topic

```typescript
// Backend automatically subscribes on device registration
// Or manually via API:
POST /api/v1/notifications/topics/subscribe
{
  "topic": "building_abc123",
  "tokens": ["fcm-token-1", "fcm-token-2"]
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Token registration fails | Check Firebase project config, verify API key |
| Notifications not received | Verify token is valid, check FCM quotas |
| Invalid token error | Token expired or app uninstalled - auto-cleaned |
| Permission denied | User must grant notification permission |

## Costs

Firebase Cloud Messaging is **free** with generous limits:
- Unlimited messages to your own app
- No per-message charges
- Topic messaging included

## Security

- Never expose `FIREBASE_PRIVATE_KEY` in client code
- Tokens are user-specific and cannot be used to send to other users
- Backend validates user owns the token before storing

## Next Steps

1. [x] Configure Firebase project
2. [x] Add environment variables
3. [ ] Implement frontend token registration
4. [ ] Test notification delivery
5. [ ] Set up topic subscriptions for broadcasts
