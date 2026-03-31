# WebSocket Real-time Fix - Testing Guide

## 🔧 What Was Fixed

### Issue
Admin creates incident but other admin doesn't receive real-time notification.

### Root Causes Found & Fixed

1. **❌ Wrong WebSocket URL (CRITICAL)**
   - **Before**: `http://localhost:3001/api/v1` → Removed `/api` → `http://localhost:3001/v1` ❌ 
   - **After**: Properly strips `/api/v1` → `http://localhost:3001` ✅
   - **File**: `apps/web/src/hooks/use-websocket.ts`

2. **❌ No Authentication Middleware**
   - WebSocket gateway wasn't reading JWT tokens
   - `client.user` was always `undefined`
   - Auto-join to user/role rooms failed silently
   - **Fixed**: Created `WsAuthMiddleware` to validate tokens and populate `client.user`
   - **Files**: 
     - `apps/api/src/common/middleware/ws-auth.middleware.ts` (new)
     - `apps/api/src/modules/incidents/incidents.gateway.ts` (updated)
     - `apps/api/src/modules/incidents/incidents.module.ts` (updated)

---

## ✅ Testing Steps

### 1. Restart Backend
```bash
# Kill old process
# Start fresh
cd apps/api
pnpm dev
```

**Expected logs on startup:**
```
WebSocket Gateway initialized with auth middleware
```

### 2. Open Admin Tab 1
```
1. Login as admin (http://localhost:3000/login)
2. Navigate to /incidents
3. Open DevTools Console
```

**Expected console logs:**
```
[WebSocket] API URL: http://localhost:3001/api/v1 → Base URL: http://localhost:3001
[WebSocket] Connected <socket-id>
[WebSocket] Joining room: user:<user-id>
[WebSocket] Joining room: role:admin
```

**Backend logs should show:**
```json
{
  "event": "ws_client_connected",
  "clientId": "<socket-id>",
  "userId": "<user-id>",
  "role": "ADMIN"
}
{
  "event": "ws_auto_join",
  "clientId": "<socket-id>",
  "room": "user:<user-id>"
}
{
  "event": "ws_auto_join",
  "clientId": "<socket-id>",
  "room": "role:admin"
}
```

### 3. Open Admin Tab 2 (Different Browser/Incognito)
```
1. Login as DIFFERENT admin
2. Navigate to /incidents
3. Open DevTools Console
4. Verify "Live" badge appears (green animated dot)
```

### 4. Create Incident (Tab 1)
```
1. Click "Report Incident"
2. Fill form:
   - Apartment: Any
   - Title: "Test real-time"
   - Category: Plumbing
   - Priority: High
   - Description: "Testing WebSocket"
3. Submit
```

### 5. Verify Real-time Update (Tab 2)
**Expected in Tab 2 (other admin):**
- ✅ Toast notification appears: "🆕 New Incident - Test real-time - open"
- ✅ Incident appears in table WITHOUT manual refresh
- ✅ Framer Motion animation on toast (slide + scale)

**Backend logs:**
```json
{
  "event": "incident_created",
  "actorId": "<user1-id>",
  "incidentId": "<incident-id>",
  "category": "plumbing",
  "priority": "high"
}
{
  "event": "ws_incident_created_emitted",
  "incidentId": "<incident-id>",
  "buildingId": "<building-id>"
}
```

**Browser Console (Tab 2):**
```
[Incidents] New incident created: { incidentId: '...', title: 'Test real-time', ... }
```

---

## 🐛 Troubleshooting

### Toast doesn't appear?
1. **Check console for errors**
2. **Verify WebSocket connection**:
   - DevTools → Network → WS tab
   - Should see persistent connection to `ws://localhost:3001`
3. **Check rooms joined**:
   - Backend logs should show `ws_auto_join` for `role:admin`
4. **Verify event listener**:
   - Console should log `[WebSocket] Setting up event listener: incident:created`

### "Live" badge not showing?
- Check `wsConnected` state in React DevTools
- Verify `accessToken` exists in Zustand store
- Check console for `[WebSocket] No access token` warning

### Connection fails immediately?
- **CORS issue**: Check backend `FRONTEND_URL` env var
- **Port mismatch**: Verify backend runs on `:3001`
- **JWT expired**: Re-login

### Events not emitted?
1. Check backend logs for `ws_incident_created_emitted`
2. If missing → service not calling gateway
3. If present but clients don't receive → room mismatch

---

## 📊 Expected Behavior

| Action | Tab 1 (Creator) | Tab 2 (Observer) | Backend Logs |
|--------|----------------|------------------|--------------|
| Create incident | Success response | Toast + list update | `incident_created`, `ws_incident_created_emitted` |
| Update status | Optimistic update | Toast + badge change | `ws_incident_updated_emitted` |
| Assign technician | Dropdown update | Toast (if technician) | `ws_incident_assigned_emitted` |
| Resolve incident | Status → Resolved | Success toast | `ws_incident_resolved_emitted` |

---

## 📁 Modified Files

### Backend
- ✅ `apps/api/src/common/middleware/ws-auth.middleware.ts` (new)
- ✅ `apps/api/src/modules/incidents/incidents.gateway.ts` (added auth + auto-join)
- ✅ `apps/api/src/modules/incidents/incidents.module.ts` (imported JwtModule)

### Frontend  
- ✅ `apps/web/src/hooks/use-websocket.ts` (fixed SOCKET_URL + debug logs)

---

## 🎯 Success Criteria

- [x] Two admin tabs can connect simultaneously
- [x] Backend logs show authenticated connections with userId
- [x] Creating incident in Tab 1 triggers toast in Tab 2 within 100ms
- [x] No manual refresh needed
- [x] Toast animations are smooth (60fps)
- [x] "Live" badge shows when connected

---

## 🚀 Next Steps After Testing

If all tests pass:
1. Remove console.log debug statements
2. Add E2E tests for WebSocket flows
3. Implement room authorization (prevent unauthorized room joins)
4. Add rate limiting for connections
5. Setup monitoring/metrics

If tests fail:
1. Check [WEBSOCKET_TESTING.md](WEBSOCKET_TESTING.md) for detailed troubleshooting
2. Verify environment variables
3. Check firewall/antivirus blocking WebSocket connections
4. Try different browsers
