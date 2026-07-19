# Notification Module — Questions & Issues

**Date:** 2026-07-09  
**Module:** Phase 2.3 — Notification (`platform/api/notification.js`)

---

## Questions for Review

### ~~Q1: FCM Module Not Enabled~~ ✅ Resolved
The `fcm` module has been enabled in `platform/config/using_modules.js`. Firebase key (`#google_fb_key`) will be configured on the production server.

### ~~Q2: Fan-Out vs. Broadcast Model~~ ✅ Resolved
Current fan-out model (one row per recipient) is confirmed acceptable.

### ~~Q3: Notification Retention & Cleanup~~ ✅ Resolved
- **Retention period:** 90 days (consistent with calls history and GPS location history defaults).
- **Configurable:** Yes — add `notification_retention_days` (default `90`) to `Settings/update_notification_settings`.
- **Cleanup method:** Scheduled cron job performing soft-delete (`NTF_DELETED_ON`) — no hard deletes.
- **TODO:** Implement the cron job and add the setting parameter.

### ~~Q4: Notification Delivery Channels (SDS 5.4.4)~~ ✅ Resolved
Email delivery implemented centrally in the notification module (Option A). When `send_push` is true, the module reads `notification_methods` from settings and dispatches to all enabled channels: in-app (always), mobile (FCM push), email (`$Mailer`). Template: `notification_alert.html`, constant: `$Const.EMAIL_TEMPLATE_NOTIFICATION`.

### ~~Q5: Per-Trigger Enable/Disable Settings~~ ✅ Resolved
Centralized in the notification module. Both `create_notification` and `create_bulk_notifications` read notification settings via `getNotificationSettings()` and check `isTypeEnabled()` using `TYPE_TO_SETTING_MAP`. If the trigger toggle is disabled, the call returns `{skipped: true}` without creating records. Types without a mapping (e.g., `panic_button`, `general`) are always enabled.

### ~~Q6: Notification Type Constants~~ ✅ Resolved
Notification types are managed via `$DataItems` (`platform/data/notification_type.json`). Validation uses `$DataItems.isValidItemId(type, "notification_type")`. Calling modules use string literals; the data file is the single source of truth.

### ~~Q7: Real-Time / WebSocket Delivery~~ ✅ Resolved
WebSocket delivery implemented using existing `$SocketService` infrastructure. Both `create_notification` and `create_bulk_notifications` emit a `new_notification` event to the target user's web session via `sendSocketToUser` / `sendSocketToUsers`. WebSocket is for web apps; FCM handles mobile. Graceful degradation if `$SocketService` is not available.

### ~~Q8: Notification Text Templates (SDS 5.4.4)~~ ✅ Resolved
Template rendering utility implemented (Option A). `renderTemplate(type, vars)` reads from `platform/data/notification_template.json`. Callers can either pass `title`+`message` directly (override), or pass `template_vars` and let the notification module render from templates. Placeholders use `#placeholder#` format.

---

## Implementation Notes

### What Was Implemented
1. **DB table:** `notification` (prefix `NTF_`) — see `db/UpgradeDB.sql`
2. **Error codes:** 730–732 in `errorcodes.en.js`
3. **API endpoints (7 total):**
   - `Notification/get_notifications` — paginated list with filters (read status, type, date range)
   - `Notification/get_unread_count` — unread badge count
   - `Notification/mark_as_read` — mark single notification read
   - `Notification/mark_all_as_read` — mark all read
   - `Notification/create_notification` — create for single user (+ optional FCM push)
   - `Notification/create_bulk_notifications` — create for multiple users (+ optional FCM push, no DB queries in loop)
   - `Notification/delete_notification` — soft-delete

### Design Decisions
- **Soft deletion:** Uses `NTF_DELETED_ON` timestamp pattern.
- **Pagination:** LIMIT/OFFSET as strings per infrastructure rules.
- **Bulk insert:** Single INSERT with multiple value sets (no queries in loops).
- **FCM graceful degradation:** Push delivery is silently skipped when FCM module is not loaded.
- **ACL:** All endpoints accessible to all authenticated user types (ADMIN, OFFICER, RESIDENT). The `create_notification` and `create_bulk_notifications` endpoints are intended for internal use via `$executeAPI`.

### What Was NOT Implemented (Pending Answers)
- Email delivery channel
- Settings toggle checks (per-trigger enable/disable)
- Notification text template rendering
- WebSocket real-time delivery
- Retention/cleanup cron
- Shared notification type constants file
