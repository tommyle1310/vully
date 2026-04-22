# Firebase Admin Setup Guide (Push Notifications)

This guide walks you through setting up Firebase Cloud Messaging (FCM) for push notifications in Vully.

---

## Step 1: Create Firebase Project

1. Open browser → Go to **https://console.firebase.google.com**
2. Sign in with your Google account
3. Click **"Create a project"** (or **"Add project"**)
4. Project name: `vully-apartment`
5. Click **"Continue"**
6. Google Analytics: Toggle OFF (not needed for FCM)
   - Or leave ON if you want analytics
7. Click **"Create project"**
8. Wait for project creation (~1 minute)
9. Click **"Continue"**

---

## Step 2: Add Web App to Firebase

1. On the Firebase console home, click the **Web icon** (`</>`)
2. App nickname: `Vully Web`
3. ❌ Firebase Hosting: Leave unchecked
4. Click **"Register app"**
5. You'll see a config like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "vully-apartment.firebaseapp.com",
     projectId: "vully-apartment",
     ...
   };
   ```
6. **Save these values** for frontend setup later
7. Click **"Continue to console"**

---

## Step 3: Generate Service Account Key (for Backend)

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Go to **"Service accounts"** tab
4. Click **"Generate new private key"**
5. Click **"Generate key"**
6. A JSON file downloads (e.g., `vully-apartment-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`)
7. **IMPORTANT**: Keep this file secure! Don't commit to git!

---

## Step 4: Install Firebase Admin SDK

Run in terminal:

```powershell
cd d:\personal-projects\vully\apps\api
pnpm add firebase-admin
```

---

## Step 5: Configure Backend Environment

Open the downloaded JSON file. It looks like:

```json
{
  "type": "service_account",
  "project_id": "vully-apartment",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@vully-apartment.iam.gserviceaccount.com",
  ...
}
```

Add these to your `apps/api/.env`:

```env
# Firebase Admin (FCM Push Notifications)
FIREBASE_PROJECT_ID=vully-apartment
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vully-apartment.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...ENTIRE KEY HERE...Qw==\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANT**: The `FIREBASE_PRIVATE_KEY` must be wrapped in double quotes and keep the `\n` characters!

---

## Step 6: Update FCM Adapter

The FCM adapter is already created but uses placeholder. Let me update it:

Create/update `apps/api/src/modules/notifications/adapters/fcm.adapter.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmAdapter implements OnModuleInit {
  private readonly logger = new Logger(FcmAdapter.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not configured. FCM disabled.');
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.initialized = true;
      this.logger.log('Firebase Admin initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
    }
  }

  async sendToDevice(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      this.logger.warn('FCM not initialized, skipping notification');
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`FCM message sent: ${response}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`FCM send failed: ${error.message}`);
      
      // Handle invalid token
      if (error.code === 'messaging/registration-token-not-registered') {
        return { success: false, error: 'invalid_token' };
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendToTopic(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`FCM topic message sent: ${response}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`FCM topic send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
```

---

## Step 7: Frontend Setup (Optional - for Web Push)

If you want web push notifications in the browser:

### 7.1 Get VAPID Key

1. In Firebase Console → Project Settings → **"Cloud Messaging"** tab
2. Scroll to **"Web configuration"**
3. Click **"Generate key pair"**
4. Copy the **Key pair** (VAPID public key)

### 7.2 Create Firebase Config in Frontend

Create `apps/web/src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "vully-apartment.firebaseapp.com",
  projectId: "vully-apartment",
  storageBucket: "vully-apartment.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export async function requestNotificationPermission() {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
    });
    
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

export function onMessageListener() {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    // Show notification or update UI
  });
}
```

### 7.3 Create Service Worker

Create `apps/web/public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "vully-apartment.firebaseapp.com",
  projectId: "vully-apartment",
  storageBucket: "vully-apartment.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192x192.png'
  });
});
```

---

## Step 8: Test Push Notifications

### Test from Firebase Console

1. Go to Firebase Console → **"Messaging"** (or "Cloud Messaging")
2. Click **"Send your first message"**
3. Notification title: `Test from Firebase`
4. Notification text: `Hello from Vully!`
5. Click **"Send test message"**
6. Enter your device token (from frontend)
7. Click **"Test"**

### Test from Backend API

After implementing, you can test via:

```bash
# Register device token
curl -X POST http://localhost:3001/api/v1/notifications/register-device \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"token": "FCM_DEVICE_TOKEN", "platform": "web"}'
```

---

## Troubleshooting

### "FIREBASE_PRIVATE_KEY must be a string"
- Make sure the key is wrapped in double quotes
- Keep the `\n` escape sequences

### "No Firebase App has been created"
- Check all three env vars are set: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### "messaging/registration-token-not-registered"
- The device token is invalid or expired
- User needs to re-register their device

### Notifications not showing in browser
- Check browser notification permissions (Settings → Notifications)
- Make sure service worker is registered

---

## Environment Summary

Add these to `apps/api/.env`:

```env
# Firebase Admin (FCM Push Notifications)
FIREBASE_PROJECT_ID=vully-apartment
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vully-apartment.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Add these to `apps/web/.env.local` (for frontend push):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vully-apartment.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vully-apartment
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BLx7...
```
