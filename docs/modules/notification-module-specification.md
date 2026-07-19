# Notification Module — Specification & Internals

**Document Version:** 1.0  
**Last Updated:** 2026-07-19  
**Phase:** 2.3  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 5.4.4  
**Module Files:** `platform/api/notification.js`, `platform/funcs/notification.js`  
**Database Migration:** `db/UpgradeDB.sql`

---

## 1. Module Overview

The Notification module provides the centralized notification infrastructure for the Code4 Axis Security Operations Platform. It serves a dual purpose:

1. **User-Facing API** — Allows any authenticated user (Admin, Officer, Resident) to retrieve their notifications, mark them as read, and soft-delete them.
2. **Internal Notification Utility** — Provides `create_notification` and `create_bulk_notifications` endpoints that other modules (Call, Shift, POI, Report, Post Order) invoke internally via `$executeAPI` to dispatch notifications through multiple delivery channels.

When a platform event occurs (e.g., a new emergency call, a call accepted by an officer, a POI record published), the originating module calls the Notification module. The Notification module then:

1. Resolves the notification text (either from explicitly provided `title`/`message`, or by rendering a template with provided variables).
2. Checks whether the notification type is enabled in the system settings.
3. Inserts the notification record into the database (in-app delivery).
4. Dispatches to additional delivery channels (mobile push via `$Fcm`, email via `$Mailer`) based on the global `notification_methods` setting.
5. Pushes a real-time event to the recipient's web session via `$SocketService`.

### 1.1 User Types

All endpoints are accessible to every authenticated user type (`USER_TYPE_ADMIN`, `USER_TYPE_OFFICER`, `USER_TYPE_RESIDENT`). The `create_notification` and `create_bulk_notifications` endpoints are designed for **internal use only** — called by other server modules via `$executeAPI`, never directly by client applications.

### 1.2 File Structure

| File | Purpose |
|---|---|
| `platform/api/notification.js` | API definition — parameter schemas, ACL, documentation hints |
| `platform/funcs/notification.js` | API implementation — all business logic, database interaction, validation |
| `platform/data/notification_type.json` | Static `$DataItems` table defining valid notification types with template attributes |
| `platform/definitions/errorcodes.en.js` | Error code definitions (RC 730–732 for notification module) |
| `platform/config/using_api.js` | Module registration (`"notification"` entry) |
| `db/UpgradeDB.sql` | Database migration — creates the `notification` table |
| `db/triggers_def.js` | Audit trail trigger definitions for the `notification` table |

### 1.3 Endpoint Summary

| Endpoint | ACL | Purpose |
|---|---|---|
| `Notification/get_notifications` | ADMIN, OFFICER, RESIDENT | Get paginated notifications for the current user with filters |
| `Notification/get_unread_count` | ADMIN, OFFICER, RESIDENT | Get unread notification count for badge display |
| `Notification/mark_as_read` | ADMIN, OFFICER, RESIDENT | Mark a single notification as read |
| `Notification/mark_all_as_read` | ADMIN, OFFICER, RESIDENT | Mark all unread notifications as read |
| `Notification/create_notification` | ADMIN, OFFICER, RESIDENT | Internal: create a notification for a single user |
| `Notification/create_bulk_notifications` | ADMIN, OFFICER, RESIDENT | Internal: create notifications for multiple users |
| `Notification/delete_notification` | ADMIN, OFFICER, RESIDENT | Soft-delete a notification (owner only) |

### 1.4 Architectural Patterns

The module follows all infrastructure conventions defined in `docs/brain.md`:

- **Module-level helper functions:** `mapNotificationRow()`, `insertNotification()`, `getNotificationSettings()`, `isTypeEnabled()`, `renderTemplate()`, `resolveNotificationText()`, `sendPushToUser()`, `sendEmailToUser()`, `sendSocketToUser()`, and `sendSocketToUsers()` are defined outside the exported class to eliminate code duplication across methods. These private helpers access `$`-globals freely and receive method-specific data as parameters.
- **Standard class export:** `module.exports = class { ... }` with a `constructor(session)` that stores `this.$Session`.
- **Parameter injection:** API parameters are injected as `this.$param_name` properties by the infrastructure dispatcher.
- **Standard response pattern:** All methods return `{...rc, ...vals}` where `rc` is `$ERRS.ERR_SUCCESS` and `vals` contains response data.
- **Early return for validation:** Validation failures return error objects immediately (e.g., `return $ERRS.ERR_NOTIFICATION_NOT_FOUND`).
- **API response field mapping:** Database column names are never exposed to the client; `mapNotificationRow()` transforms all `NTF_*` columns to clean snake_case response fields.
- **No DB queries in loops:** Bulk notification creation uses a single multi-value `INSERT` statement with placeholders built in memory.
- **Soft deletion only:** All deletions use the `NTF_DELETED_ON` timestamp column. All `SELECT` and `UPDATE` queries include `AND NTF_DELETED_ON IS NULL`.
- **LIMIT/OFFSET as strings:** Pagination parameters are cast to strings before being passed to parameterized queries, per infrastructure requirements.
- **$DataItems integration:** Notification types are managed via static `$DataItems` (`notification_type.json`), leveraging the platform's built-in caching and validation. Type validation uses `$DataItems.isValidItemId()`. Template attributes (`title_template`, `message_template`) are accessed via `$DataItems.getItemAttr()`. API documentation for the `type` parameter uses `$DataItems.getListForApiDoc("notification_type")` for auto-generated lists.
- **DRY principle:** Template resolution logic is extracted to `resolveNotificationText()`, shared by both `create_notification` and `create_bulk_notifications`.

---

## 2. Database Architecture

### 2.1 `notification` Table Schema

```sql
CREATE TABLE `notification` (
  `NTF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `NTF_USR_ID` varchar(128) NOT NULL COMMENT 'Recipient user ID',
  `NTF_TYPE` varchar(50) NOT NULL COMMENT 'Notification type key (e.g. call_accepted, new_emergency)',
  `NTF_TITLE` varchar(200) NOT NULL,
  `NTF_MESSAGE` varchar(1000) NOT NULL,
  `NTF_PAYLOAD` json DEFAULT NULL COMMENT 'Additional data for deep linking (entity_type, entity_id, etc.)',
  `NTF_IS_READ` tinyint NOT NULL DEFAULT 0,
  `NTF_READ_ON` datetime DEFAULT NULL,
  `NTF_SENDER_ID` varchar(128) DEFAULT NULL COMMENT 'User who triggered the notification',
  `NTF_COMMUNITY_ID` bigint unsigned DEFAULT NULL,
  `NTF_CREATED_ON` datetime NOT NULL,
  `NTF_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`NTF_ID`),
  KEY `IX_NTF_USR_ID` (`NTF_USR_ID`),
  KEY `IX_NTF_USR_READ` (`NTF_USR_ID`, `NTF_IS_READ`, `NTF_DELETED_ON`),
  KEY `IX_NTF_CREATED_ON` (`NTF_CREATED_ON`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

| Column | Type | Description |
|---|---|---|
| `NTF_ID` | bigint unsigned | Auto-increment primary key |
| `NTF_USR_ID` | varchar(128) | Recipient user ID (FK to `user.USR_ID`) |
| `NTF_TYPE` | varchar(50) | Notification type key — must match a key in `notification_type.json` |
| `NTF_TITLE` | varchar(200) | Rendered notification title |
| `NTF_MESSAGE` | varchar(1000) | Rendered notification message body |
| `NTF_PAYLOAD` | json | Optional deep-linking data (e.g., `{"entity_type": "call", "entity_id": 42}`) |
| `NTF_IS_READ` | tinyint | Read flag: `0` = unread, `1` = read |
| `NTF_READ_ON` | datetime | Timestamp when the user marked the notification as read |
| `NTF_SENDER_ID` | varchar(128) | User ID of the actor who triggered the notification (nullable) |
| `NTF_COMMUNITY_ID` | bigint unsigned | Community context ID (nullable) |
| `NTF_CREATED_ON` | datetime | Record creation timestamp |
| `NTF_DELETED_ON` | datetime | Soft-deletion timestamp (`NULL` = active) |

### 2.2 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `PRIMARY` | `NTF_ID` | Primary key lookups |
| `IX_NTF_USR_ID` | `NTF_USR_ID` | Fast lookup of all notifications for a user |
| `IX_NTF_USR_READ` | `NTF_USR_ID`, `NTF_IS_READ`, `NTF_DELETED_ON` | Optimized unread count query |
| `IX_NTF_CREATED_ON` | `NTF_CREATED_ON` | Retention cleanup cron job performance |

### 2.3 Data Model — Fan-Out

The module uses a **fan-out model**: one database row is created per recipient per notification event. For example, when a post order is published and 10 officers need to be notified, 10 rows are inserted. This model was chosen over broadcast (single row with audience resolution at read time) for simplicity, reliable read tracking per user, and straightforward deletion semantics.

The `create_bulk_notifications` endpoint performs this fan-out efficiently using a single multi-value `INSERT` statement (no DB queries in loops).

---

## 3. Notification Types (`$DataItems`)

Notification types are defined in `platform/data/notification_type.json` as a static `$DataItems` table. Each type entry contains:

- **`name`** — Localized display name (standard `$DataItems` attribute).
- **`title_template`** — Template string for the notification title.
- **`message_template`** — Template string for the notification message body, with `#placeholder#` variables.

### 3.1 Full Type Catalog

| Type Key | Title Template | Message Template | Triggering Module |
|---|---|---|---|
| `new_emergency` | New Emergency Call | Emergency call #call_number# from #call_creator# - #service_category# | Call |
| `new_service_call` | New Service Call | Service call #call_number# from #call_creator# - #service_category# | Call |
| `call_accepted` | Call Accepted | #officer_name# accepted call #call_number# | Call |
| `call_resolved` | Call Resolved | Call #call_number# has been resolved by #officer_name# | Call |
| `call_updated` | Call Updated | Call #call_number# has been updated | Call |
| `call_canceled` | Call Canceled | Call #call_number# has been canceled | Call |
| `resident_like` | Resident Feedback | #resident_name# liked your service on call #call_number# | Call |
| `new_incident_report` | New Incident Report | Incident report #report_number# filed by #officer_name# | Report |
| `report_submitted` | Report Submitted | Report #report_number# submitted by #officer_name# for review | Report |
| `report_approved` | Report Approved | Report #report_number# has been approved | Report |
| `report_changes_requested` | Report Changes Requested | Changes requested on report #report_number# | Report |
| `report_delivered` | Report Delivered | Report #report_number# has been delivered to the client | Report |
| `shift_published` | Shift Published | A new shift has been published for #shift_date# | Shift |
| `shift_updated` | Shift Updated | Your shift on #shift_date# has been updated | Shift |
| `shift_cancelled` | Shift Cancelled | Your shift on #shift_date# has been cancelled | Shift |
| `shift_starting_soon` | Shift Starting Soon | Your shift at #location_name# starts in #minutes# minutes | Shift |
| `route_updated` | Route Updated | Route #route_name# has been updated | Route |
| `post_order_published` | Post Order Published | Post order #post_order_name# has been published | Post Order |
| `post_order_updated` | Post Order Updated | Post order #post_order_name# has been updated | Post Order |
| `poi_active` | POI Active | #poi_type# #poi_name# is now active | POI |
| `poi_updated` | POI Updated | #poi_type# #poi_name# has been updated | POI |
| `poi_inactivated` | POI Inactivated | #poi_type# #poi_name# has been inactivated | POI |
| `poi_expiring_soon` | POI Expiring Soon | #poi_type# #poi_name# expires on #expiry_date# | POI |
| `poi_expired` | POI Expired | #poi_type# #poi_name# has expired | POI |
| `task_update` | Task Update | Task #task_name# has been updated | Task |
| `panic_button` | PANIC - Officer Alert | #officer_name# triggered panic alert at #location# | Call |
| `gps_signal_lost` | GPS Signal Lost | GPS signal lost for #officer_name# | Tracking |
| `officer_off_route` | Officer Off Route | #officer_name# has deviated from assigned route #route_name# | Route |
| `general` | #title# | #message# | Any |

### 3.2 Per-Trigger Settings Map

Each notification type can be individually enabled or disabled via the notification settings. The mapping is defined in `TYPE_TO_SETTING_MAP`:

| Notification Type | Settings Key | SDS Trigger Description |
|---|---|---|
| `new_emergency` | `new_call_enabled` | New emergency call opened |
| `new_service_call` | `new_call_enabled` | New service/concierge call opened |
| `call_accepted` | `call_accepted_enabled` | Officer accepts a call |
| `call_resolved` | `call_resolved_enabled` | Officer resolves a call |
| `call_updated` | `call_edited_enabled` | Call details edited |
| `report_submitted` | `report_submitted_enabled` | Officer submits incident report for review |
| `report_approved` | `report_approved_enabled` | Manager approves an incident report |
| `report_changes_requested` | `report_changes_enabled` | Manager requests changes on a report |
| `report_delivered` | `report_delivered_enabled` | Manager delivers report to client |
| `post_order_published` | `post_order_published_enabled` | Post order is published |
| `post_order_updated` | `post_order_updated_enabled` | Published post order is updated |
| `poi_active` | `poi_active_enabled` | New POI record becomes active |
| `poi_updated` | `poi_updated_enabled` | POI record is updated |
| `poi_inactivated` | `poi_inactivated_enabled` | POI record is inactivated |
| `poi_expiring_soon` | `poi_expiring_enabled` | POI record expiring soon |
| `poi_expired` | `poi_expired_enabled` | POI record expired |

Types **not** in this map (e.g., `panic_button`, `general`, `gps_signal_lost`, `officer_off_route`) are **always enabled** — they cannot be disabled via settings.

---

## 4. Template Rendering Utility (SDS 5.4.4)

### 4.1 Overview

The SDS (Section 5.4.4) specifies that notification text is "provided by the client and hardcoded in the system." To implement this, the module provides a centralized template rendering engine that eliminates the need for calling modules to construct notification text manually.

### 4.2 How It Works

When another module triggers a notification, it has two options:

**Option A — Template-Based (Recommended):**
The calling module passes only the notification `type` and a `template_vars` object. The Notification module retrieves the title and message templates from `notification_type.json` via `$DataItems.getItemAttr()` and performs variable substitution.

```js
$executeAPI(session, "Notification/create_notification", {
    target_user_id: recipientId,
    type:           "call_accepted",
    template_vars:  { officer_name: "John Smith", call_number: "EC-0042" },
    payload:        JSON.stringify({ entity_type: "call", entity_id: callId }),
    send_push:      true
});
```

The module resolves `title_template` = `"Call Accepted"` and `message_template` = `"#officer_name# accepted call #call_number#"`, substitutes the variables, and produces:

- **Title:** `"Call Accepted"`
- **Message:** `"John Smith accepted call EC-0042"`

**Option B — Direct Text Override:**
The calling module passes explicit `title` and `message` strings. Template rendering is bypassed entirely.

```js
$executeAPI(session, "Notification/create_notification", {
    target_user_id: recipientId,
    type:           "general",
    title:          "System Maintenance",
    message:        "The system will be offline for maintenance at 02:00 UTC.",
    send_push:      true
});
```

**Option C — Partial Override:**
The calling module provides either `title` or `message` (but not both). The provided value is used as-is; the missing value is resolved from the template.

### 4.3 Rendering Pipeline

The rendering pipeline consists of two helper functions:

1. **`renderTemplate(type, vars)`** — Low-level renderer.
   - Retrieves `title_template` and `message_template` from `$DataItems.getItemAttr(type, "notification_type", ...)`.
   - Returns `null` if either template is empty (type has no templates defined).
   - If `vars` is a JSON string (from HTTP requests), parses it via `JSON.parse` with error handling.
   - Iterates over `vars` object entries and replaces all `#key#` placeholders in both title and message using a global regex.
   - Returns `{ title, message }`.

2. **`resolveNotificationText(type, title, message, templateVars)`** — High-level resolver called by both create methods.
   - If both `title` and `message` are provided (non-empty), returns them directly (no template rendering).
   - Otherwise, calls `renderTemplate()` and fills in any missing values from the rendered result.
   - Returns `null` if templates are unavailable and text cannot be resolved.

### 4.4 Placeholder Variables Reference

Placeholders use the format `#variable_name#` in templates. Each calling module is responsible for providing the appropriate variables:

| Variable | Used By Types | Description |
|---|---|---|
| `#call_number#` | Call types | The call reference number |
| `#call_creator#` | `new_emergency`, `new_service_call` | Name of the user who created the call |
| `#service_category#` | `new_emergency`, `new_service_call` | Service type/category name |
| `#officer_name#` | `call_accepted`, `call_resolved`, Report types, `panic_button`, `gps_signal_lost`, `officer_off_route` | Officer's full name |
| `#report_number#` | Report types | Report reference number |
| `#shift_date#` | Shift types | Shift date string |
| `#location_name#` | `shift_starting_soon` | Shift location name |
| `#minutes#` | `shift_starting_soon` | Minutes until shift starts |
| `#route_name#` | `route_updated`, `officer_off_route` | Route name |
| `#post_order_name#` | Post Order types | Post order name |
| `#poi_type#` | POI types | Record type (Person of Interest, Trespass, etc.) |
| `#poi_name#` | POI types | Record subject name |
| `#expiry_date#` | `poi_expiring_soon` | Expiry date string |
| `#resident_name#` | `resident_like` | Resident's name |
| `#task_name#` | `task_update` | Task name |
| `#location#` | `panic_button` | Location description |
| `#title#` | `general` | Fully dynamic title |
| `#message#` | `general` | Fully dynamic message |

---

## 5. Delivery Channels

When `send_push` is `true` on a create request, the module dispatches through all enabled delivery channels as configured in `notification_methods` (a comma-separated string in notification settings).

### 5.1 In-App (Database)

**Always active.** Every notification is inserted into the `notification` table regardless of other channel settings. This is the baseline delivery — the notification appears in the user's notification list, unread count, and panel.

### 5.2 Mobile Push (`$Fcm`)

**Channel key:** `mobile` in `notification_methods`.

- Queries the `user` table for the recipient's `USR_DEVICE_ID`.
- If the device ID exists and the user is active (`USR_STATUS=1`), sends a push notification via `$Fcm.sendNotification()`.
- Graceful degradation: if the `$Fcm` module is not loaded (not enabled in `using_modules.js`), push delivery is silently skipped.
- For bulk notifications, device IDs are fetched in a single `SELECT ... WHERE USR_ID IN (?)` query (no DB queries in loops). Individual `$Fcm.sendNotification()` calls are made per device (FCM does not support batch send in this integration).

### 5.3 Email (`$Mailer`)

**Channel key:** `email` in `notification_methods`.

- Queries the `user` table for the recipient's `USR_EMAIL`.
- If the email exists and the user is active, sends an email via `$Mailer.sendMailFromTemplate()`.
- Uses the `notification_alert.html` email template, referenced by constant `$Const.EMAIL_TEMPLATE_NOTIFICATION`.
- Template variables: `#TITLE#` and `#MESSAGE#` are replaced with the rendered notification title and message.
- For bulk notifications, email addresses are fetched in a single query.

### 5.4 WebSocket Real-Time (`$SocketService`)

**Always active when available.** Not controlled by `notification_methods`.

- Pushes a real-time event to the recipient's web browser session via `$SocketService.sendMessage()`.
- Event payload (JSON string):
  ```json
  {
      "event": "new_notification",
      "notification_id": 42,
      "type": "call_accepted",
      "title": "Call Accepted",
      "message": "John Smith accepted call EC-0042"
  }
  ```
- For single notifications, `sendSocketToUser()` sends to one user and includes the `notification_id`.
- For bulk notifications, `sendSocketToUsers()` uses `$SocketService.sendMultiMessage()` to send to all recipients simultaneously. The `notification_id` is not included in bulk events (since each recipient has a different row ID).
- Graceful degradation: if `$SocketService` is not available, WebSocket delivery is silently skipped.

### 5.5 Channel Decision Flow

```
create_notification() / create_bulk_notifications()
    │
    ├── resolveNotificationText() → title, message
    │
    ├── isTypeEnabled(type, settings) → skip if disabled
    │
    ├── INSERT INTO notification (always)
    │
    ├── if send_push == true:
    │   ├── Parse notification_methods from settings
    │   ├── if "mobile" in methods → sendPushToUser() / batch FCM
    │   └── if "email" in methods → sendEmailToUser() / batch email
    │
    └── sendSocketToUser() / sendSocketToUsers() (always, if available)
```

---

## 6. Notification Settings

### 6.1 Storage

Notification settings are stored in the `key_value` table under the key `settings:notification` (constant `$Const.KVL_SETTINGS_NOTIFICATION`). The value is a JSON object containing all configurable fields.

### 6.2 Default Values

Defaults are defined in `runtime_config.js` under `SETTINGS_DEFAULTS.notification`. When a setting has never been changed, the default value is used. The `getNotificationSettings()` helper merges stored values over defaults.

### 6.3 Settings Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `notification_methods` | string | `"in_app,email,mobile"` | Comma-separated delivery channels |
| `notification_title` | string | `""` | Global notification title override |
| `sender_name` | string | `""` | Display name for the notification sender |
| `new_call_enabled` | boolean | `true` | Enable notifications for new calls |
| `call_accepted_enabled` | boolean | `true` | Enable notifications for call accepted |
| `call_edited_enabled` | boolean | `true` | Enable notifications for call edited |
| `call_resolved_enabled` | boolean | `true` | Enable notifications for call resolved |
| `post_order_published_enabled` | boolean | `true` | Enable notifications for post order published |
| `post_order_updated_enabled` | boolean | `true` | Enable notifications for post order updated |
| `poi_active_enabled` | boolean | `true` | Enable notifications for new active POI |
| `poi_updated_enabled` | boolean | `true` | Enable notifications for POI updated |
| `poi_inactivated_enabled` | boolean | `true` | Enable notifications for POI inactivated |
| `poi_expiring_enabled` | boolean | `true` | Enable notifications for POI expiring soon |
| `poi_expired_enabled` | boolean | `true` | Enable notifications for POI expired |
| `report_submitted_enabled` | boolean | `true` | Enable notifications for report submitted |
| `report_approved_enabled` | boolean | `true` | Enable notifications for report approved |
| `report_changes_enabled` | boolean | `true` | Enable notifications for report changes requested |
| `report_delivered_enabled` | boolean | `true` | Enable notifications for report delivered |
| `notification_retention_days` | integer | `90` | Days to retain notifications before automatic archival |

---

## 7. Automatic Retention & Cleanup

### 7.1 Purpose

The `notification` table uses a fan-out model where one row is created per recipient per event. Without cleanup, this table will grow indefinitely. A 90-day default retention period is consistent with other platform data retention defaults (calls history, GPS location history).

### 7.2 Cron Job Specification

A scheduled cron job runs periodically (recommended: daily, during low-traffic hours) to archive old notifications.

**Job behaviour:**

1. Reads the `notification_retention_days` value from the notification settings via `getNotificationSettings()`. If the setting is not configured, defaults to `90` days.
2. Performs a **soft-delete** on all notifications older than the retention threshold:
   ```sql
   UPDATE `notification`
   SET NTF_DELETED_ON = NOW()
   WHERE NTF_CREATED_ON < DATE_SUB(NOW(), INTERVAL ? DAY)
     AND NTF_DELETED_ON IS NULL
   ```
3. Logs the number of affected rows.

**Critical constraints:**

- **Soft-delete only.** The cron job sets `NTF_DELETED_ON` — it **never** performs `DELETE FROM`. Hard deletions are strictly prohibited per platform conventions.
- The `IX_NTF_CREATED_ON` index ensures the retention query performs efficiently even on large tables.
- The job uses `initStandAlone()` to bootstrap the infrastructure without an HTTP server, following the standard cron job template pattern (`jobs/basic_cron_job.js`).

### 7.3 Configuration

The retention period is configurable by administrators via `Settings/update_notification_settings` using the `notification_retention_days` parameter. Changing this value takes effect on the next cron job execution.

---

## 8. Error Codes

| RC | Constant | Message | When Returned |
|---|---|---|---|
| 730 | `ERR_NOTIFICATION_INVALID_TYPE` | "invalid notification type" | The `type` parameter does not match any key in `notification_type.json` |
| 731 | `ERR_NOTIFICATION_NOT_FOUND` | "notification not found" | The notification does not exist, belongs to another user, or was already deleted |
| 732 | `ERR_NOTIFICATION_ALREADY_READ` | "notification is already read" | `mark_as_read` called on a notification that was already marked as read |

Additional infrastructure error codes that may be returned:

| RC | Meaning |
|---|---|
| 102 | Missing required API parameter |
| 103 | Caller does not have privileges |
| 201 | Invalid or expired user token |
| 110 | Invalid API parameter (title/message or template_vars required) |

---

## 9. Endpoint Details

### 9.1 `get_notifications`

Retrieves a paginated, filtered list of notifications for the authenticated user. Only non-deleted notifications belonging to the current user are returned.

**Filtering:**
- `is_read` — Optional boolean. `true` = read only, `false` = unread only, omit = all.
- `type` — Optional string. Filter by notification type key.
- `from_date` / `to_date` — Optional date strings (`YYYY-MM-DD`). Filter by creation date range. Time boundaries are automatically set to `00:00:00` and `23:59:59` respectively.

**Pagination:**
- `offset` — Integer, default `0`. Starting position.
- `limit` — Integer, default `20`. Page size, capped at `NOTIFICATION_MAX_PAGE_SIZE` (runtime config).

**Response mapping** (`mapNotificationRow`):

| DB Column | Response Field | Transformation |
|---|---|---|
| `NTF_ID` | `notification_id` | Direct |
| `NTF_TYPE` | `type` | Direct |
| `NTF_TITLE` | `title` | Direct |
| `NTF_MESSAGE` | `message` | Direct |
| `NTF_PAYLOAD` | `payload` | `JSON.parse()` with error handling; `null` if parse fails |
| `NTF_IS_READ` | `is_read` | Boolean conversion (`=== 1`) |
| `NTF_READ_ON` | `read_on` | Direct (datetime or `null`) |
| `NTF_SENDER_ID` | `sender_id` | Direct |
| `NTF_COMMUNITY_ID` | `community_id` | Direct |
| `NTF_CREATED_ON` | `created_on` | Direct |

### 9.2 `get_unread_count`

Returns a single `COUNT(*)` of unread, non-deleted notifications for the current user. Used for badge display in the UI.

### 9.3 `mark_as_read`

Sets `NTF_IS_READ=1` and `NTF_READ_ON` to the current timestamp for a specific notification. Validates:
- Notification exists, belongs to the current user, and is not deleted.
- Notification is not already read (returns `ERR_NOTIFICATION_ALREADY_READ`).

The `UPDATE` query includes `AND NTF_DELETED_ON IS NULL` to guard against race conditions.

### 9.4 `mark_all_as_read`

Bulk-updates all unread, non-deleted notifications for the current user. Returns `updated_count` with the number of rows affected.

### 9.5 `create_notification`

Creates a notification for a single target user. Intended for internal use via `$executeAPI`.

**Flow:**
1. Validate `type` against `$DataItems.isValidItemId()`.
2. Resolve notification text via `resolveNotificationText()`.
3. Check if the type is enabled in settings via `isTypeEnabled()`.
4. Insert notification via `insertNotification()`.
5. Dispatch to push/email channels if `send_push` is true.
6. Send WebSocket event to the recipient.

### 9.6 `create_bulk_notifications`

Creates notifications for multiple target users in a single operation. Same flow as `create_notification` but:
- Accepts `target_user_ids` (array) instead of `target_user_id` (string).
- Builds a single multi-value `INSERT` statement (no DB queries in loops).
- Fetches device IDs and emails in batch queries for push/email delivery.
- Uses `sendSocketToUsers()` with `sendMultiMessage()` for WebSocket broadcast.

### 9.7 `delete_notification`

Soft-deletes a notification by setting `NTF_DELETED_ON`. Validates ownership — the `UPDATE` query includes `AND NTF_USR_ID=? AND NTF_DELETED_ON IS NULL` to ensure only the notification owner can delete and to prevent double-deletion.

---

## 10. Integration Guide for Calling Modules

### 10.1 Sending a Single Notification

```js
// In Call module — when an officer accepts a call
let notifResult = $executeAPI(this.$Session, "Notification/create_notification", {
    target_user_id: call.CLL_CREATOR_ID,
    type:           "call_accepted",
    template_vars:  { officer_name: officerFullName, call_number: call.CLL_NUMBER },
    payload:        JSON.stringify({ entity_type: "call", entity_id: call.CLL_ID }),
    community_id:   call.CLL_COM_ID,
    send_push:      true
});

// Check if notification was skipped (type disabled in settings)
if (notifResult.skipped)
{
    // Notification was not created — type is disabled. Continue normal flow.
}
```

### 10.2 Sending Bulk Notifications

```js
// In Post Order module — when a post order is published
let officerIds = allocatedOfficers.map(o => o.USR_ID);

$executeAPI(this.$Session, "Notification/create_bulk_notifications", {
    target_user_ids: officerIds,
    type:            "post_order_published",
    template_vars:   { post_order_name: postOrder.POR_NAME },
    payload:         JSON.stringify({ entity_type: "post_order", entity_id: postOrder.POR_ID }),
    community_id:    postOrder.POR_COM_ID,
    send_push:       true
});
```

### 10.3 Direct Text (No Template)

```js
// For custom one-off notifications
$executeAPI(this.$Session, "Notification/create_notification", {
    target_user_id: userId,
    type:           "general",
    title:          "Welcome!",
    message:        "Welcome to Code4 Axis. Your account has been activated.",
    send_push:      false
});
```
