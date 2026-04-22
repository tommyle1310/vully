# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for Vully login.

---

## Step 1: Access Google Cloud Console

1. Open browser → Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. If you don't have a project yet, click **"Select a project"** → **"New Project"**
   - Project name: `vully-apartment` (or any name)
   - Click **"Create"**
4. Wait for project creation (~30 seconds)

---

## Step 2: Enable Google+ API (Required for OAuth)

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"Google Identity"**
3. Click on **"Google+ API"**
4. Click **"Enable"** button
5. Wait for API to enable

---

## Step 3: Configure OAuth Consent Screen

1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (allows any Google account to login)
3. Click **"Create"**
4. Fill in the form:
   - **App name**: `Vully`
   - **User support email**: Select your email
   - **Developer contact email**: Enter your email
5. Click **"Save and Continue"**
6. **Scopes page**: Click **"Add or Remove Scopes"**
   - Check: `email`, `profile`, `openid`
   - Click **"Update"**
   - Click **"Save and Continue"**
7. **Test users page**: Click **"Add Users"**
   - Add your email address
   - Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

---

## Step 4: Create OAuth Credentials

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Vully Web Client`
5. **Authorized JavaScript origins**:
   - Click **"+ Add URI"**
   - Add: `http://localhost:3000`
   - Add: `http://localhost:3001`
   - *(For production, add your domain: `https://yourdomain.com`)*
6. **Authorized redirect URIs**:
   - Click **"+ Add URI"**
   - Add: `http://localhost:3001/api/v1/auth/google/callback`
   - *(For production: `https://api.yourdomain.com/api/v1/auth/google/callback`)*
7. Click **"Create"**
8. **IMPORTANT**: A popup appears with your credentials:
   - **Client ID**: Copy this (looks like `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like `GOCSPX-xxxxx`)
   - Click **"OK"**

---

## Step 5: Add Credentials to Vully

Open your `.env` file in `apps/api/` and add:

```env
# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
```

Also add FRONTEND_URL if not set:
```env
FRONTEND_URL=http://localhost:3000
```

---

## Step 6: Test OAuth Flow

1. Start your backend: `cd apps/api && pnpm dev`
2. Start your frontend: `cd apps/web && pnpm dev`
3. Open http://localhost:3000/login
4. Click **"Continue with Google"**
5. Select your Google account
6. You should be redirected back to Vully dashboard!

---

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Go back to Google Console → Credentials → Edit your OAuth client
- Check that the redirect URI exactly matches: `http://localhost:3001/api/v1/auth/google/callback`
- No trailing slash!

### "Access blocked: This app's request is invalid"
- Make sure you added your email to "Test users" in OAuth consent screen

### "This app isn't verified"
- This is normal for development
- Click "Advanced" → "Go to Vully (unsafe)" to continue
- For production, you'll need to verify your app with Google

---

## Production Checklist

Before deploying to production:

1. Go to **OAuth consent screen** → **"Publish App"**
2. Update credentials with production URLs:
   - Authorized origins: `https://yourdomain.com`, `https://api.yourdomain.com`
   - Redirect URI: `https://api.yourdomain.com/api/v1/auth/google/callback`
3. Update `.env` with production values:
   ```env
   GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```
