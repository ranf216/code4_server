# Notification API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Notification/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints require a `#token` field in the request body. Any authenticated user type (Admin, Manager, Officer, Resident) may call these endpoints.

---

## Concepts

### Notification Types

Each notification has a `type` key that classifies it. The system supports the following types:

| Type Key | Display Name |
|----------|--------------|
| `new_emergency` | New Emergency Call |
| `new_service_call` | New Service Call |
| `call_accepted` | Call Accepted |
| `call_resolved` | Call Resolved |
| `call_updated` | Call Updated |
| `call_canceled` | Call Canceled |
| `resident_like` | Resident Like |
| `new_incident_report` | New Incident Report |
| `report_submitted` | Report Submitted |
| `report_approved` | Report Approved |
| `report_changes_requested` | Report Changes Requested |
| `report_delivered` | Report Delivered |
| `shift_published` | Shift Published |
| `shift_updated` | Shift Updated |
| `shift_cancelled` | Shift Cancelled |
| `shift_starting_soon` | Shift Starting Soon |
| `route_updated` | Route Updated |
| `post_order_published` | Post Order Published |
| `post_order_updated` | Post Order Updated |
| `poi_active` | POI Active |
| `poi_updated` | POI Updated |
| `poi_inactivated` | POI Inactivated |
| `poi_expiring_soon` | POI Expiring Soon |
| `poi_expired` | POI Expired |
| `task_update` | Task Update |
| `panic_button` | Panic Button |
| `gps_signal_lost` | GPS Signal Lost |
| `officer_off_route` | Officer Off Route |
| `general` | General |

### Template Rendering

Each notification type has a built-in title and message template with placeholders in the format `#variable_name#`. When creating a notification, you can either:
1. Provide explicit `title` and `message` values (they override templates).
2. Omit `title` and `message` and supply a `template_vars` JSON object with values for the placeholders. The system renders the template using the provided variables.

If a placeholder variable is not present in `template_vars`, the raw placeholder text remains in the rendered output.

### Delivery Channels

When `send_push` is `true`, the system delivers the notification through the channels configured in system settings (SDS 5.4.4): in-app push (FCM), email, and real-time socket. A real-time WebSocket event (`new_notification`) is always sent regardless of the `send_push` flag.

### Notification Lifecycle

- Notifications are created as **unread** (`is_read: false`).
- They can be individually marked as read, or all unread notifications can be marked as read at once.
- Deletion is a **soft-delete**; deleted notifications no longer appear in any listing.

---

## Endpoints

### POST Notification/get_notifications
*Retrieves a paginated list of notifications for the authenticated user, with optional filtering by read status, type, and date range.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token. |
    | `is_read` | boolean | No | `null` | Filter by read status. `true` = read only, `false` = unread only, omit or `null` = all. |
    | `type` | string | No | — | Filter by notification type key (see Notification Types table). |
    | `from_date` | string | No | — | Include notifications created on or after this date. Format: `YYYY-MM-DD`. |
    | `to_date` | string | No | — | Include notifications created on or before this date. Format: `YYYY-MM-DD`. |
    | `offset` | integer | No | `0` | Pagination offset (number of records to skip). |
    | `limit` | integer | No | `20` | Page size. Minimum: 1. Maximum: system-configured cap (default 100). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "notifications": [
            {
                "notification_id": 42,
                "type": "new_emergency",
                "title": "New Emergency Call",
                "message": "Emergency call #1234 from John Doe - Fire",
                "payload": {
                    "entity_type": "call",
                    "entity_id": 1234
                },
                "is_read": false,
                "read_on": null,
                "sender_id": "usr_sender_001",
                "community_id": 5,
                "created_on": "2025-01-15 10:30:00"
            }
        ],
        "total_count": 87,
        "offset": 0,
        "limit": 20
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `notifications` | array | Array of notification objects for the current page. |
    | `notifications[].notification_id` | integer | Unique notification identifier. |
    | `notifications[].type` | string | Notification type key. |
    | `notifications[].title` | string | Rendered notification title. |
    | `notifications[].message` | string | Rendered notification message body. |
    | `notifications[].payload` | object or null | Parsed JSON payload for deep linking. Contains context such as `entity_type` and `entity_id`. |
    | `notifications[].is_read` | boolean | Whether the notification has been read. |
    | `notifications[].read_on` | string or null | ISO timestamp when the notification was marked as read, or `null`. |
    | `notifications[].sender_id` | string | User ID of the notification sender. |
    | `notifications[].community_id` | integer or null | Community context ID, or `null` if not community-specific. |
    | `notifications[].created_on` | string | ISO timestamp when the notification was created. |
    | `total_count` | integer | Total number of notifications matching the filters (before pagination). |
    | `offset` | integer | The offset applied. |
    | `limit` | integer | The page size applied. |

    Results are ordered by creation date, newest first.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |

    Invalid date formats in `from_date` or `to_date` are silently ignored (the filter is not applied).

- **Usage & Flows:**
    The primary endpoint for the consumer app's notification inbox screen. Supports infinite scroll or page-based pagination. Use the `is_read` filter to show an "unread" tab, or the `type` filter to categorize notifications. Date filters enable fetching notifications for a specific time window.

---

### POST Notification/get_unread_count
*Returns the total count of unread notifications for the authenticated user.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "unread_count": 12
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `unread_count` | integer | Number of unread, non-deleted notifications for the current user. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called frequently by the consumer app to display the badge counter on the notification bell icon. Ideal for polling or calling after a WebSocket `new_notification` event is received.

---

### POST Notification/mark_as_read
*Marks a single notification as read. Only the notification owner can perform this action.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `notification_id` | integer | Yes | The ID of the notification to mark as read. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the notification's `is_read` becomes `true` and `read_on` is set to the current timestamp.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 730 | notification not found | The notification does not exist, does not belong to the current user, or has been deleted. |
    | 732 | notification is already marked as read | The notification was already in a read state. |

- **Usage & Flows:**
    Called when the user taps on a specific notification in the inbox. After a successful call, update the local notification state to reflect read status. If the consumer uses optimistic UI updates, this endpoint confirms the server state. Correlates with in-app notification interactions described in SDS 5.4.4.

---

### POST Notification/mark_all_as_read
*Marks all unread notifications as read for the authenticated user in a single operation.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "updated_count": 5
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `updated_count` | integer | Number of notifications that were transitioned from unread to read. Returns `0` if all were already read. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Triggered by a "Mark all as read" button in the notification inbox UI. After success, reset the badge counter to zero and update all locally cached notifications to read state.

---

### POST Notification/create_notification
*Creates a notification for a single target user. Optionally triggers push delivery (FCM, email) and a real-time WebSocket event based on system settings.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (identifies the sender). |
    | `target_user_id` | string | Yes | — | The recipient user ID. |
    | `type` | string | Yes | — | Notification type key (see Notification Types table). |
    | `title` | string | No | — | Explicit notification title. Overrides template rendering if provided. |
    | `message` | string | No | — | Explicit notification message. Overrides template rendering if provided. |
    | `template_vars` | string | No | `null` | A JSON-encoded object with placeholder values for template rendering (e.g. `{"officer_name": "John", "call_number": "1234"}`). |
    | `payload` | string | No | — | A JSON-encoded object for deep linking context (e.g. `{"entity_type": "call", "entity_id": 1234}`). |
    | `community_id` | integer | No | `0` | Community context ID. Pass `0` or omit for non-community-specific notifications. |
    | `send_push` | boolean | No | `true` | Whether to also deliver via push (FCM) and email channels. |

    **Text Resolution Rules:**
    1. If `title` and `message` are both provided, they are used directly.
    2. If `title` and `message` are omitted, the system renders the type's built-in template using `template_vars`.
    3. If both explicit text and `template_vars` are provided, the explicit text takes precedence.
    4. If neither explicit text nor valid `template_vars` are provided, the request fails with an error (unless the type's template can render without variables).

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "notification_id": 42
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `notification_id` | integer | The ID of the newly created notification. |

    If the notification type is disabled in system settings, the response includes a `skipped: true` flag and no notification is created:
    ```json
    {
        "rc": 0,
        "message": "success",
        "skipped": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 731 | invalid notification type | The `type` value does not match any defined notification type key. |
    | 102 | invalid api parameter: title/message or template_vars required | Neither explicit title/message nor template_vars were provided, and the type's template cannot produce output. |

- **Usage & Flows:**
    Primarily invoked server-side by other modules (e.g., call management, shift management, incident reports) to notify users of events. Correlates with the push notification triggers defined in SDS 5.4.4. The consumer app does not typically call this endpoint directly, but it is available for custom notification use cases.

---

### POST Notification/create_bulk_notifications
*Creates notifications for multiple target users at once. Optionally triggers push delivery and real-time WebSocket events for all recipients.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (identifies the sender). |
    | `target_user_ids` | array | Yes | — | Array of recipient user ID strings. Must be non-empty. |
    | `type` | string | Yes | — | Notification type key (see Notification Types table). |
    | `title` | string | No | — | Explicit notification title. Overrides template rendering if provided. |
    | `message` | string | No | — | Explicit notification message. Overrides template rendering if provided. |
    | `template_vars` | string | No | `null` | A JSON-encoded object with placeholder values for template rendering. |
    | `payload` | string | No | — | A JSON-encoded object for deep linking context. |
    | `community_id` | integer | No | `0` | Community context ID. |
    | `send_push` | boolean | No | `true` | Whether to also deliver via push (FCM) and email channels. |

    Text resolution rules are identical to `create_notification`.

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "created_count": 5
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `created_count` | integer | Number of notifications successfully created (equals the length of `target_user_ids`). |

    If the notification type is disabled in system settings:
    ```json
    {
        "rc": 0,
        "message": "success",
        "skipped": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 731 | invalid notification type | The `type` value does not match any defined notification type key. |
    | 102 | invalid api parameter: title/message or template_vars required | Neither explicit title/message nor template_vars were provided, and the type's template cannot produce output. |
    | 102 | invalid api parameter: target_user_ids | `target_user_ids` is empty or not an array. |

- **Usage & Flows:**
    Used when the same notification must reach multiple users simultaneously — for example, notifying all allocated officers when a shift is published (SDS 4.7.4), or alerting officers when a POI record is activated (SDS 4.11.6). More efficient than calling `create_notification` in a loop.

---

### POST Notification/delete_notification
*Soft-deletes a notification. Only the notification owner (recipient) can delete their own notifications.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `notification_id` | integer | Yes | The ID of the notification to delete. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    The notification is soft-deleted and will no longer appear in `get_notifications` results or count toward `get_unread_count`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 730 | notification not found | The notification does not exist, does not belong to the current user, or was already deleted. |

- **Usage & Flows:**
    Enables the user to dismiss individual notifications from their inbox. Useful for a "swipe to delete" gesture or an explicit delete action. Deleted notifications cannot be recovered by the consumer app.

---

## WebSocket Events

When a notification is created, the system pushes a real-time event to the recipient via WebSocket:

```json
{
    "event": "new_notification",
    "notification_id": 42,
    "type": "new_emergency",
    "title": "New Emergency Call",
    "message": "Emergency call #1234 from John Doe - Fire"
}
```

The consumer app should listen for the `new_notification` event to update the badge counter and optionally display an in-app toast or banner. For bulk notifications, the event is sent to all recipients (without individual `notification_id` values).

---

## Error Code Reference

| rc | Constant | Message |
|----|----------|---------|
| 730 | ERR_NOTIFICATION_NOT_FOUND | notification not found |
| 731 | ERR_NOTIFICATION_INVALID_TYPE | invalid notification type |
| 732 | ERR_NOTIFICATION_ALREADY_READ | notification is already marked as read |
