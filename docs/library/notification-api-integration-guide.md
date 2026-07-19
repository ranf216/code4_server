# Notification API — Integration Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-19  
**Audience:** Web Application Developers (Admin Portal), Mobile App Developers (Officer & Resident Apps)  
**Phase:** 2.3  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 5.4.4

> **Important:** This document treats the server as a **strict black box**. It describes only what the client application sends and receives. No internal server logic, database schemas, or backend implementation details are included. All notification text is **pre-rendered by the server** — the client never needs to perform template parsing or variable substitution.

---

## 1. General API Conventions

### 1.1 Request Format

All API calls are made via **HTTP POST** to the server's API endpoint. Every request body is a JSON object containing at minimum:

```json
{
    "#request": "Notification/endpoint_name",
    "#token": "<user_authentication_token>",
    ...additional parameters...
}
```

- **`#request`** — The API endpoint identifier in `ModuleName/method_name` format.
- **`#token`** — The authenticated user's session token obtained from the login flow.

### 1.2 Standard Response Format

Every API response returns a JSON object with at least two fields:

```json
{
    "rc": 0,
    "message": "success"
}
```

- **`rc`** (integer) — The return code. `0` means success. Any non-zero value indicates an error.
- **`message`** (string) — A human-readable message describing the result.

**Additional data fields** are included alongside `rc` and `message` when the endpoint returns data.

### 1.3 Access Control

The Notification module is available to **all authenticated user types**:

| User Type | Endpoints Available |
|---|---|
| **Admin** (Management Portal) | All read/write endpoints listed below |
| **Officer** (Mobile App) | All read/write endpoints listed below |
| **Resident** (Mobile App) | All read/write endpoints listed below |

If an unauthenticated user attempts to call any endpoint, the server returns `rc: 201` (Invalid token).

### 1.4 Common Error Codes

These error codes may be returned by **any** endpoint:

| RC | Meaning | Recommended Action |
|---|---|---|
| 0 | Success | Process the response data |
| 102 | Missing required parameter | Check that all mandatory fields are included in the request |
| 103 | No privileges | The current user does not have permission. Show "Access denied" message. |
| 201 | Invalid token | Redirect to login — the session has expired or was terminated |

### 1.5 Notification Module Error Codes

These error codes are specific to the Notification module:

| RC | Message | When Returned | Recommended UI Action |
|---|---|---|---|
| 730 | "invalid notification type" | An invalid notification type was specified | This should not occur in normal frontend use. Log the error. |
| 731 | "notification not found" | The notification does not exist, belongs to another user, or was already deleted | Show "Notification not found" and refresh the notifications list. |
| 732 | "notification is already read" | `mark_as_read` called on a notification already marked as read | No user-facing error needed — the notification is already in the desired state. Silently ignore. |

### 1.6 Key Concepts

- **Pre-Rendered Text:** The server generates the final notification `title` and `message` text. The client receives these as plain strings — **no template parsing or variable substitution is required on the client side.**
- **Real-Time Updates:** When a new notification arrives, the server pushes a WebSocket event (`new_notification`) to the user's active web session. Mobile apps receive push notifications via FCM.
- **Soft Deletion:** Deleted notifications are hidden from the user but retained on the server. Deletion is permanent from the user's perspective.
- **Automatic Archival:** Notifications older than the configured retention period (default: 90 days) are automatically archived by the server. No client action is required.

---

## 2. Notification Management Endpoints

### 2.1 Get Notifications List

Retrieves a paginated list of notifications for the authenticated user. Use this to populate the notifications panel, dropdown, or full notifications page.

**When to use:** On initial load of the notifications panel/page. Also call when the user scrolls (infinite scroll / load more), changes filter options, or after performing a `mark_all_as_read` to refresh the list.

#### Request

```json
{
    "#request": "Notification/get_notifications",
    "#token": "<token>",
    "is_read": null,
    "type": "",
    "from_date": "",
    "to_date": "",
    "offset": 0,
    "limit": 20
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `is_read` | boolean | No | *(omit)* | Filter by read status. `true` = show read only. `false` = show unread only. Omit the parameter entirely (or send `null`) to show all. |
| `type` | string | No | `""` | Filter by notification type key (e.g., `"call_accepted"`, `"poi_active"`). Empty string = show all types. |
| `from_date` | string | No | `""` | Filter notifications created on or after this date. Format: `YYYY-MM-DD`. |
| `to_date` | string | No | `""` | Filter notifications created on or before this date. Format: `YYYY-MM-DD`. |
| `offset` | integer | No | `0` | Pagination offset (number of items to skip). |
| `limit` | integer | No | `20` | Number of items per page. Maximum is server-configured (typically 100). |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "notifications": [
        {
            "notification_id": 142,
            "type": "call_accepted",
            "title": "Call Accepted",
            "message": "John Smith accepted call EC-0042",
            "payload": {
                "entity_type": "call",
                "entity_id": 42
            },
            "is_read": false,
            "read_on": null,
            "sender_id": "a1b2c3d4e5f6",
            "community_id": 5,
            "created_on": "2026-07-19 14:30:00"
        },
        {
            "notification_id": 138,
            "type": "poi_active",
            "title": "POI Active",
            "message": "Person of Interest John Doe is now active",
            "payload": {
                "entity_type": "poi",
                "entity_id": 17
            },
            "is_read": true,
            "read_on": "2026-07-19 10:15:00",
            "sender_id": "x9y8z7w6",
            "community_id": 5,
            "created_on": "2026-07-18 09:00:00"
        }
    ],
    "total_count": 47,
    "offset": 0,
    "limit": 20
}
```

| Field | Type | Description |
|---|---|---|
| `notifications` | array | Array of notification objects (may be empty). |
| `notifications[].notification_id` | integer | Unique notification identifier. Use this for `mark_as_read` and `delete_notification`. |
| `notifications[].type` | string | Notification type key (e.g., `"call_accepted"`, `"poi_active"`). Use for icon/category display. |
| `notifications[].title` | string | **Pre-rendered** notification title. Display as-is. |
| `notifications[].message` | string | **Pre-rendered** notification message body. Display as-is. |
| `notifications[].payload` | object or null | Deep-linking data. When not `null`, use `entity_type` and `entity_id` to navigate the user to the relevant detail page on click. |
| `notifications[].is_read` | boolean | `true` if the user has read this notification, `false` if unread. |
| `notifications[].read_on` | string or null | Timestamp when the notification was marked as read. `null` if unread. |
| `notifications[].sender_id` | string or null | User ID of the actor who triggered the notification. May be `null` for system-generated notifications. |
| `notifications[].community_id` | integer or null | Community context. May be `null` for non-community-specific notifications. |
| `notifications[].created_on` | string | Timestamp when the notification was created (UTC). |
| `total_count` | integer | Total number of notifications matching the current filters (for pagination calculations). |
| `offset` | integer | The offset that was applied. |
| `limit` | integer | The page size that was applied. |

#### Pagination

To implement "Load More" or infinite scroll:

```
Page 1: offset=0,  limit=20  →  shows items 1–20
Page 2: offset=20, limit=20  →  shows items 21–40
Page N: offset=(N-1)*20, limit=20
```

Total pages = `Math.ceil(total_count / limit)`.

#### Deep Linking (Payload)

When a notification has a non-null `payload`, the client should navigate to the relevant entity detail page when the user taps/clicks the notification:

| `entity_type` | Navigate To |
|---|---|
| `"call"` | Call detail page for `entity_id` |
| `"report"` | Report detail page for `entity_id` |
| `"post_order"` | Post Order detail page for `entity_id` |
| `"poi"` | POI record detail page for `entity_id` |
| `"shift"` | Shift detail page for `entity_id` |
| `"task"` | Task detail page for `entity_id` |

If `entity_type` is unrecognized or `payload` is `null`, simply open the notification without navigation.

---

### 2.2 Get Unread Count

Returns the count of unread notifications for the current user. Use this for the notification badge/counter in the app header.

**When to use:** On app/page load, and periodically (e.g., every 30–60 seconds). Also refresh after `mark_as_read` or `mark_all_as_read`. When a WebSocket `new_notification` event is received, increment the local counter or re-fetch.

#### Request

```json
{
    "#request": "Notification/get_unread_count",
    "#token": "<token>"
}
```

No additional parameters required.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "unread_count": 5
}
```

| Field | Type | Description |
|---|---|---|
| `unread_count` | integer | Number of unread notifications. Display as a badge. Show `0` or hide the badge when there are no unread notifications. |

#### Badge Display Recommendations

- **Count ≤ 99:** Display the exact number.
- **Count > 99:** Display `"99+"`.
- **Count = 0:** Hide the badge entirely or show a muted indicator.

---

### 2.3 Mark as Read

Marks a single notification as read. Call this when the user opens/views a notification.

**When to use:** When the user clicks/taps on a specific notification to view its details or navigate to the linked entity.

#### Request

```json
{
    "#request": "Notification/mark_as_read",
    "#token": "<token>",
    "notification_id": 142
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `notification_id` | integer | Yes | The ID of the notification to mark as read. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Cases

| RC | Message | Scenario | Recommended Action |
|---|---|---|---|
| 731 | "notification not found" | Notification doesn't exist or belongs to another user | Refresh the notifications list |
| 732 | "notification is already read" | Notification was already marked as read | Silently ignore — no user-facing error needed |

#### Client Behaviour After Success

1. Update the notification's visual state from "unread" to "read" in the UI.
2. Decrement the unread badge counter by 1 (or re-fetch via `get_unread_count`).

---

### 2.4 Mark All as Read

Marks all unread notifications as read for the current user. Use this for the "Mark all as read" button.

**When to use:** When the user clicks the "Mark all as read" button in the notifications panel.

#### Request

```json
{
    "#request": "Notification/mark_all_as_read",
    "#token": "<token>"
}
```

No additional parameters required.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "updated_count": 12
}
```

| Field | Type | Description |
|---|---|---|
| `updated_count` | integer | Number of notifications that were marked as read. `0` if there were no unread notifications. |

#### Client Behaviour After Success

1. Update all notification items in the UI to "read" visual state.
2. Reset the unread badge counter to `0`.
3. Optionally, refresh the notifications list via `get_notifications` to get the updated `read_on` timestamps.

---

### 2.5 Delete Notification

Soft-deletes a notification. The notification will no longer appear in `get_notifications` results. Only the notification owner can delete it.

**When to use:** When the user explicitly dismisses or deletes a notification (e.g., swipe-to-delete on mobile, or a delete button in the notification panel).

#### Request

```json
{
    "#request": "Notification/delete_notification",
    "#token": "<token>",
    "notification_id": 142
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `notification_id` | integer | Yes | The ID of the notification to delete. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Cases

| RC | Message | Scenario | Recommended Action |
|---|---|---|---|
| 731 | "notification not found" | Notification doesn't exist, belongs to another user, or was already deleted | Refresh the notifications list |

#### Client Behaviour After Success

1. Remove the notification from the displayed list.
2. If the deleted notification was unread, decrement the unread badge counter by 1.
3. Optionally, refresh `get_notifications` to update `total_count`.

---

## 3. Real-Time Notifications (WebSocket)

### 3.1 WebSocket Event: `new_notification`

When a new notification is created for the user, the server pushes a real-time event to active web sessions. The client should listen for incoming WebSocket messages and filter for the `new_notification` event type.

#### Event Payload

```json
{
    "event": "new_notification",
    "notification_id": 156,
    "type": "call_accepted",
    "title": "Call Accepted",
    "message": "John Smith accepted call EC-0042"
}
```

| Field | Type | Description |
|---|---|---|
| `event` | string | Always `"new_notification"`. Use this to identify the event type. |
| `notification_id` | integer | The ID of the newly created notification. May be absent for bulk notifications. |
| `type` | string | Notification type key. Use for icon selection. |
| `title` | string | Pre-rendered notification title. |
| `message` | string | Pre-rendered notification message. |

#### Recommended Client Handling

1. **Increment badge counter** — Add 1 to the unread notification count displayed on the bell icon.
2. **Show toast/snackbar** — Display a brief toast notification with the `title` and `message`.
3. **Prepend to list** — If the notification panel is open, prepend the new notification to the top of the list in "unread" state. If data is missing (e.g., `payload`, `sender_id`), either refetch the full notification via `get_notifications`, or display with the available data.
4. **Play sound** — Optionally play a notification sound for urgent types (e.g., `panic_button`, `new_emergency`).

### 3.2 Mobile Push Notifications (FCM)

Mobile apps (Officer and Resident) receive notifications via Firebase Cloud Messaging (FCM). The push notification contains the rendered `title` and `message` text.

**Mobile app handling:**
1. Display the system notification with the provided title and message.
2. On tap, if the notification payload contains deep-linking data (`entity_type`, `entity_id`), navigate to the corresponding screen.
3. After viewing, call `Notification/mark_as_read` with the `notification_id`.

---

## 4. Notification Settings API Updates (Admin Portal)

The following endpoints manage the global notification configuration. Only Admin users can access these endpoints.

### 4.1 Get Notification Settings

Retrieves the current notification configuration including per-trigger toggles, delivery channels, and the notification retention period.

#### Request

```json
{
    "#request": "Settings/get_notification_settings",
    "#token": "<admin_token>"
}
```

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "notification_methods": "in_app,email,mobile",
    "notification_title": "",
    "sender_name": "",
    "new_call_enabled": true,
    "call_accepted_enabled": true,
    "call_edited_enabled": true,
    "call_resolved_enabled": true,
    "post_order_published_enabled": true,
    "post_order_updated_enabled": true,
    "poi_active_enabled": true,
    "poi_updated_enabled": true,
    "poi_inactivated_enabled": true,
    "poi_expiring_enabled": true,
    "poi_expired_enabled": true,
    "report_submitted_enabled": true,
    "report_approved_enabled": true,
    "report_changes_enabled": true,
    "report_delivered_enabled": true,
    "notification_retention_days": 90
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `notification_methods` | string | `"in_app,email,mobile"` | Comma-separated delivery channels. Possible values: `in_app`, `email`, `mobile`. |
| `notification_title` | string | `""` | Global title text for push notifications. |
| `sender_name` | string | `""` | Display name shown as the notification sender. |
| `new_call_enabled` | boolean | `true` | Notify when a new call is opened. |
| `call_accepted_enabled` | boolean | `true` | Notify when a call is accepted by an officer. |
| `call_edited_enabled` | boolean | `true` | Notify when a call is edited. |
| `call_resolved_enabled` | boolean | `true` | Notify when a call is resolved. |
| `post_order_published_enabled` | boolean | `true` | Notify when a post order is published. |
| `post_order_updated_enabled` | boolean | `true` | Notify when a post order is updated. |
| `poi_active_enabled` | boolean | `true` | Notify when a POI record becomes active. |
| `poi_updated_enabled` | boolean | `true` | Notify when a POI record is updated. |
| `poi_inactivated_enabled` | boolean | `true` | Notify when a POI record is inactivated. |
| `poi_expiring_enabled` | boolean | `true` | Notify when a POI record is expiring soon. |
| `poi_expired_enabled` | boolean | `true` | Notify when a POI record has expired. |
| `report_submitted_enabled` | boolean | `true` | Notify when an incident report is submitted. |
| `report_approved_enabled` | boolean | `true` | Notify when an incident report is approved. |
| `report_changes_enabled` | boolean | `true` | Notify when changes are requested on a report. |
| `report_delivered_enabled` | boolean | `true` | Notify when an incident report is delivered to the client. |
| `notification_retention_days` | integer | `90` | Number of days to keep notifications before automatic archival. |

---

### 4.2 Update Notification Settings

Updates the notification configuration. **Only provided fields are changed; omitted fields retain their current value.**

#### Request

```json
{
    "#request": "Settings/update_notification_settings",
    "#token": "<admin_token>",
    "notification_methods": "in_app,mobile",
    "new_call_enabled": true,
    "call_accepted_enabled": false,
    "notification_retention_days": 60
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `notification_methods` | string | No | `"in_app,email,mobile"` | Comma-separated delivery channels. |
| `notification_title` | string | No | `""` | Title text for push notifications. |
| `sender_name` | string | No | `""` | Sender display name. |
| `new_call_enabled` | boolean | No | `true` | Enable/disable new call notifications. |
| `call_accepted_enabled` | boolean | No | `true` | Enable/disable call accepted notifications. |
| `call_edited_enabled` | boolean | No | `true` | Enable/disable call edited notifications. |
| `call_resolved_enabled` | boolean | No | `true` | Enable/disable call resolved notifications. |
| `post_order_published_enabled` | boolean | No | `true` | Enable/disable post order published notifications. |
| `post_order_updated_enabled` | boolean | No | `true` | Enable/disable post order updated notifications. |
| `poi_active_enabled` | boolean | No | `true` | Enable/disable POI active notifications. |
| `poi_updated_enabled` | boolean | No | `true` | Enable/disable POI updated notifications. |
| `poi_inactivated_enabled` | boolean | No | `true` | Enable/disable POI inactivated notifications. |
| `poi_expiring_enabled` | boolean | No | `true` | Enable/disable POI expiring soon notifications. |
| `poi_expired_enabled` | boolean | No | `true` | Enable/disable POI expired notifications. |
| `report_submitted_enabled` | boolean | No | `true` | Enable/disable report submitted notifications. |
| `report_approved_enabled` | boolean | No | `true` | Enable/disable report approved notifications. |
| `report_changes_enabled` | boolean | No | `true` | Enable/disable report changes requested notifications. |
| `report_delivered_enabled` | boolean | No | `true` | Enable/disable report delivered notifications. |
| `notification_retention_days` | integer | No | `90` | Days to keep notifications before automatic archival. Minimum: 1. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Cases

| RC | Message | Scenario |
|---|---|---|
| 103 | "current user does not have privileges" | The caller is not an Admin user. |
| 201 | "invalid user token" | Invalid or expired token. |

#### Client Behaviour

- Disabling a notification type (e.g., `call_accepted_enabled: false`) suppresses that notification system-wide for all users. The toggle affects future notifications only; existing notifications are not removed.
- Changing `notification_methods` controls delivery channels globally. Removing `mobile` disables FCM push; removing `email` disables email delivery; removing `in_app` disables database storage (notifications will not appear in the list).
- Changing `notification_retention_days` takes effect on the next server cleanup cycle.

---

## 5. Notification Type Reference

The following notification types are defined in the system. Use the `type` field from notification responses for icon/category display:

| Type Key | Category | Description |
|---|---|---|
| `new_emergency` | Call | New emergency call opened |
| `new_service_call` | Call | New service/concierge call opened |
| `call_accepted` | Call | Officer accepted a call |
| `call_resolved` | Call | Call resolved by officer |
| `call_updated` | Call | Call details updated |
| `call_canceled` | Call | Call canceled |
| `resident_like` | Call | Resident liked a resolved call |
| `new_incident_report` | Report | New incident report filed |
| `report_submitted` | Report | Report submitted for review |
| `report_approved` | Report | Report approved by manager |
| `report_changes_requested` | Report | Changes requested on report |
| `report_delivered` | Report | Report delivered to client |
| `shift_published` | Shift | New shift published |
| `shift_updated` | Shift | Shift details updated |
| `shift_cancelled` | Shift | Shift cancelled |
| `shift_starting_soon` | Shift | Shift starting soon reminder |
| `route_updated` | Route | Patrol route updated |
| `post_order_published` | Post Order | Post order published |
| `post_order_updated` | Post Order | Post order updated |
| `poi_active` | POI | POI record activated |
| `poi_updated` | POI | POI record updated |
| `poi_inactivated` | POI | POI record inactivated |
| `poi_expiring_soon` | POI | POI record expiring soon |
| `poi_expired` | POI | POI record expired |
| `task_update` | Task | Task updated |
| `panic_button` | Emergency | Panic button triggered |
| `gps_signal_lost` | Tracking | GPS signal lost |
| `officer_off_route` | Route | Officer deviated from route |
| `general` | System | General system notification |

**UI Recommendation:** Use the `type` field to display category-specific icons (e.g., phone icon for Call types, shield icon for POI types, calendar icon for Shift types, document icon for Report types, alert icon for Emergency types).
