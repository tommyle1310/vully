# WebSocket Real-time Testing Guide

## ✅ Phase 4 Real-time Implementation Complete

### What Was Implemented

1. **useWebSocket Hook** (`apps/web/src/hooks/use-websocket.ts`)
   - Auto-connect/disconnect lifecycle
   - Auto-reconnect with exponential backoff
   - Room management (join/leave)
   - Event subscription with cleanup
   - Connection status tracking

2. **Real-time Incident Updates** (`apps/web/src/hooks/use-incidents.ts`)
   - `useIncidentRealTime` hook
   - Event listeners for:
     - `incident:created` → Toast + invalidate lists
     - `incident:updated` → Toast + invalidate detail & lists
     - `incident:assigned` → Toast if assigned to current user
     - `incident:resolved` → Success toast
   - Automatic TanStack Query cache invalidation
   - Auto-join building/apartment rooms

3. **Framer Motion Toast Animations** (`apps/web/src/components/ui/toaster.tsx`)
   - Spring animation on enter (slide + scale)
   - Exit animation with slide-right
   - AnimatePresence for smooth transitions

4. **Live Indicator UI** (`apps/web/src/app/(dashboard)/incidents/page.tsx`)
   - Green "Live" badge when WebSocket connected
   - Animated ping effect
   - Dark mode support

---

## 🧪 Testing Checklist

### Prerequisites
- Backend API running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- At least 2 users in different tabs/browsers:
  - Admin user
  - Technician or Resident user

### Test 1: WebSocket Connection
1. Login to `/incidents` page
2. **Expected**: See "Live" badge next to "Incidents" title with animated green dot
3. Open DevTools Console
4. **Expected**: See logs:
   ```
   [WebSocket] Connected <socket-id>
   [WebSocket] Joining room: user:<user-id>
   [WebSocket] Joining room: role:admin (or role:technician)
   ```

### Test 2: Real-time Incident Creation
1. **User A**: Open `/incidents` page
2. **User B**: Open `/incidents` page in different tab/browser
3. **User B**: Click "Report Incident" and create new incident
4. **Expected on User A**:
   - Toast notification appears with "🆕 New Incident"
   - Incident list auto-updates (no manual refresh needed)
   - Framer Motion animation on toast (slide + scale)

### Test 3: Real-time Status Update
1. **Both users**: Open `/incidents` page
2. **User A**: Click on an incident to open detail sheet
3. **User A**: Change status (e.g., "Open" → "Assigned")
4. **Expected on User B**:
   - Toast: "🔄 Incident Updated"
   - List updates with new status badge
   - No page refresh needed

### Test 4: Technician Assignment Notification
1. **Admin user**: Open `/incidents` page
2. **Technician user**: Open `/incidents` page in different session
3. **Admin**: Assign incident to technician
4. **Expected on Technician**:
   - Toast: "👷 New Assignment - You've been assigned: <title>"
   - Incident appears in their list
   - Badge updates to "Assigned"

### Test 5: Incident Resolved
1. **Both users**: Open `/incidents` page
2. **User A**: Update incident status to "Resolved"
3. **Expected on User B**:
   - Toast: "✅ Incident Resolved - <title> has been resolved"
   - Status badge updates to "Resolved" (green)

### Test 6: Auto-reconnect
1. Open `/incidents` page
2. Stop backend API server
3. **Expected**: "Live" badge disappears, console shows reconnection attempts
4. Restart backend API
5. **Expected**: 
   - "Live" badge reappears
   - Console: `[WebSocket] Reconnected after N attempts`
   - Rooms auto-rejoined

### Test 7: Room-based Broadcasting
1. **Admin**: Open `/incidents` page
2. **Resident**: Open `/incidents` page (different building/apartment)
3. **Admin**: Create incident in Building A, Apartment 101
4. **Expected**:
   - Admin sees notification (admin room)
   - Resident in Building A sees notification (building room)
   - Resident in Building B does NOT see notification

---

## 📊 Console Monitoring

### Expected Console Logs (Success)
```
[WebSocket] Connected 5Fg3k2l1mN
[WebSocket] Joining room: user:abc-123-def
[WebSocket] Joining room: role:admin
[WebSocket] Setting up event listener: incident:created
[WebSocket] Setting up event listener: incident:updated
[WebSocket] Setting up event listener: incident:assigned
[WebSocket] Setting up event listener: incident:resolved
[Incidents] New incident created: { incidentId: '...', title: '...', ... }
[Incidents] Incident updated: { incidentId: '...', status: 'assigned', ... }
```

### Expected Errors (Should Not Happen)
- ❌ `[WebSocket] Connection error: ...`
- ❌ `[WebSocket] Reconnection failed`
- ❌ `[WebSocket] Invalid room`

---

## 🔍 Verification Points

### Backend Logs (Pino)
Check API logs for WebSocket events:
```json
{
  "event": "ws_client_connected",
  "clientId": "5Fg3k2l1mN",
  "userId": "abc-123-def"
}
{
  "event": "ws_incident_created_emitted",
  "incidentId": "...",
  "buildingId": "..."
}
```

### Network Tab
1. DevTools → Network → WS (WebSocket filter)
2. **Expected**: Persistent connection to `ws://localhost:3001`
3. Click connection → Messages tab
4. **Expected**: See events flowing:
   - Client: `{"room":"user:abc-123"}`
   - Server: `incident:created`, `incident:updated`, etc.

---

## 🐛 Troubleshooting

### "Live" badge doesn't appear
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend WebSocket gateway is running
- Check browser console for connection errors
- Try manual connect: `const { connect } = useWebSocket(); connect();`

### Toasts don't show
- Verify `<Toaster />` is in `apps/web/src/app/providers.tsx`
- Check `use-toast.ts` implementation
- Inspect toast-viewport in DOM

### Events not received
- Check room patterns in backend logs
- Verify user is in correct room (e.g., `role:admin`)
- Test with `socket.emit('test-event')` manually

### List doesn't auto-update
- Check TanStack Query invalidation in console
- Verify `queryClient.invalidateQueries` is called
- Check staleTime settings (should refetch)

---

## 🚀 Next Steps (Phase 5)

After WebSocket testing passes:
1. **Image Upload with ClamAV** (Phase 4 remaining)
2. **Dashboard Statistics** (Phase 5)
3. **SVG Floor Maps** (Phase 5)
4. **Invoice WebSocket Events** (Phase 3 enhancement)

---

## 📝 Task Completion

Update `openspec/changes/scaffold-apartment-platform/tasks.md`:

```markdown
### 4.2 WebSocket Gateway
- [x] Configure Socket.IO gateway in NestJS
- [x] Implement room-based architecture (building, apartment, user)
- [x] Add connection authentication middleware
- [x] Create event emitters for incident updates
- [ ] Create event emitters for invoice notifications
- [ ] Write integration tests for WS events

### 4.3 Incidents UI (Frontend)
- [x] Create incident submission form with React-Hook-Form + image upload
- [x] Build incident list with TanStack Table (virtualized rows)
- [x] Implement incident detail page with timeline (Framer Motion LayoutGroup)
- [x] Add real-time status updates via WebSocket with motion notifications ✨
- [x] Create technician assignment modal (Shadcn Dialog)
- [ ] Optimize images with next/image
```
