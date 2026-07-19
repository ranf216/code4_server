# Notification Module — Deferred Requirements

**Created:** 2026-07-19  
**Module:** `platform/api/notification.js`, `platform/funcs/notification.js`

---

## 1. Retention & Cleanup Cron Job

**Context:** The `notification` table will grow indefinitely without cleanup. A 90-day retention period has been confirmed (consistent with calls history and GPS location history defaults).

**What to do:**
- Add a `notification_retention_days` parameter (default `90`) to `Settings/update_notification_settings` and its corresponding default in `runtime_config.js` → `SETTINGS_DEFAULTS.notification`.
- Create a scheduled cron job (or add to existing queue/timed_message infrastructure) that runs daily and soft-deletes notifications older than the configured retention period:
  ```sql
  UPDATE `notification`
  SET NTF_DELETED_ON = NOW()
  WHERE NTF_CREATED_ON < DATE_SUB(NOW(), INTERVAL ? DAY)
    AND NTF_DELETED_ON IS NULL
  ```
- Use soft-delete only (`NTF_DELETED_ON`) — no hard deletes.

---

## ~~2. Email Delivery Channel~~ ✅ Implemented
Implemented centrally in `platform/funcs/notification.js`. Uses `getNotificationMethods()` to check settings. Template: `email_teplates/notification_alert.html`, constant: `$Const.EMAIL_TEMPLATE_NOTIFICATION`, translation strings added.

---

## ~~3. Per-Trigger Enable/Disable Settings Check~~ ✅ Implemented
Centralized in the notification module using `TYPE_TO_SETTING_MAP`, `getNotificationSettings()`, and `isTypeEnabled()`. Types without a mapping are always enabled.

---

## ~~4. WebSocket Real-Time Delivery~~ ✅ Implemented
Implemented using existing `$SocketService` infrastructure. `sendSocketToUser()` for single and `sendSocketToUsers()` for bulk. Emits `new_notification` event with type, title, message. Graceful degradation if `$SocketService` is not available.

---

## ~~5. Notification Text Templates~~ ✅ Implemented
Template rendering utility implemented via `renderTemplate(type, vars)`. Templates stored in `platform/data/notification_template.json`. API params `title`/`message` are now optional — callers can pass `template_vars` instead. Placeholders use `#key#` format.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/notification.js` | API endpoint definitions |
| `backend/platform/funcs/notification.js` | Business logic implementation |
| `backend/platform/api/settings.js` | Notification settings API definitions |
| `backend/platform/funcs/settings.js` | Notification settings implementation |
| `backend/platform/config/runtime_config.js` | Default settings values |
| `backend/platform/data/notification_type.json` | Valid notification types ($DataItems) |
| `db/UpgradeDB.sql` | Notification table schema |
