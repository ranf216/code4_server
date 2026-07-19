# Notification Module — UI Updates Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-19  
**Audience:** Web Application Developers (Management Portal)  
**Phase:** 2.3  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 5.4.4

> This guide specifies the exact UI changes required in the Management Portal to implement the Notification feature. Each section describes **what** needs to be built, **why**, and the **exact API integration** required. Refer to the **Notification API — Integration Guide** (`docs/library/notification-api-integration-guide.md`) for full endpoint documentation, JSON payloads, and error code details.

---

## 1. Settings Page — Push Notifications Panel

### 1.1 Overview

**Location in menu:** Settings → Push Notifications (SDS 5.4.4)

**Access:** Admin users only (any admin role).

The Push Notifications settings panel already contains delivery channel selection, per-trigger toggle switches, notification title, and sender name fields. This update adds a new **Notification Retention (Days)** input field and the new `notification_retention_days` field to the existing get/update API calls.

### 1.2 New Field: Notification Retention (Days)

Add a new numeric input field to the Push Notifications settings panel, positioned **below** the existing per-trigger toggle switches section and **above** the Save button.

#### Field Specification

| Property | Value |
|---|---|
| **Label** | Notification Retention (Days) |
| **Input Type** | Numeric input (`<input type="number">`) |
| **Default Value** | `90` |
| **Minimum Value** | `1` |
| **Maximum Value** | `365` (recommended upper bound for UI validation) |
| **Placeholder** | `90` |
| **Help Text / Description** | "The number of days to keep notifications before they are automatically archived. Notifications older than this threshold are removed during the nightly cleanup. Default: 90 days." |
| **API Field Name** | `notification_retention_days` |
| **Validation** | Must be a positive integer ≥ 1. Show inline validation error if the user enters 0, a negative number, or non-numeric text. |

#### Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│  Push Notifications Settings                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Notification Methods                                   │
│  ☑ In-App   ☑ Email   ☑ Mobile                          │
│                                                         │
│  Notification Title    [________________________]       │
│  Sender Name           [________________________]       │
│                                                         │
│  ─── Activity Triggers ─────────────────────────────    │
│                                                         │
│  ☑ New Call Opened                                      │
│  ☑ Call Accepted                                        │
│  ☑ Call Edited                                          │
│  ☑ Call Resolved                                        │
│  ☑ Post Order Published                                 │
│  ☑ Post Order Updated                                   │
│  ☑ POI Active                                           │
│  ☑ POI Updated                                          │
│  ☑ POI Inactivated                                      │
│  ☑ POI Expiring Soon                                    │
│  ☑ POI Expired                                          │
│  ☑ Report Submitted                                     │
│  ☑ Report Approved                                      │
│  ☑ Report Changes Requested                             │
│  ☑ Report Delivered                                     │
│                                                         │
│  ─── Data Retention ────────────────────────────────    │
│                                                         │
│  Notification Retention (Days)   [ 90 ]                 │
│  ℹ The number of days to keep notifications before      │
│    they are automatically archived.                     │
│                                                         │
│                              [ Save Settings ]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.3 API Integration

#### Loading Settings (Page Load)

On page load, fetch the current settings:

```json
{
    "#request": "Settings/get_notification_settings",
    "#token": "<admin_token>"
}
```

**Response handling:** Populate all existing fields as currently implemented. Additionally, populate the new retention field:

```javascript
document.getElementById('retention_days').value = response.notification_retention_days;
// If the field is missing from the response (backward compatibility), default to 90
if (response.notification_retention_days === undefined) {
    document.getElementById('retention_days').value = 90;
}
```

#### Saving Settings

When the admin clicks "Save Settings," include `notification_retention_days` in the update request alongside all other settings:

```json
{
    "#request": "Settings/update_notification_settings",
    "#token": "<admin_token>",
    "notification_methods": "in_app,email,mobile",
    "notification_title": "Code4 Axis",
    "sender_name": "Code4 Security",
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

**Important:** The API uses partial update semantics — only fields included in the request are changed. However, for the Settings page it is recommended to always send all fields to ensure consistency.

#### Validation Before Save

Before sending the update request, validate the retention field on the client side:

```javascript
const retentionDays = parseInt(document.getElementById('retention_days').value);
if (isNaN(retentionDays) || retentionDays < 1) {
    showError('Notification retention must be at least 1 day.');
    return;
}
```

#### Success Handling

On `rc: 0`, display a success toast/message:
- **Text:** "Notification settings saved successfully."
- **Duration:** 3 seconds, auto-dismiss.

#### Error Handling

| RC | UI Action |
|---|---|
| 0 | Show success toast |
| 103 | Show "Access denied — admin privileges required" |
| 201 | Redirect to login |

---

## 2. Notifications Panel (Header Bell Icon)

### 2.1 Overview

**Location:** Top navigation bar, header area — a bell icon with a badge counter.

**Access:** All authenticated users (Admin, Officer, Resident) in the Management Portal web application.

**Purpose:** Provide quick access to recent notifications without navigating away from the current page. This is the primary way users interact with notifications in the web portal.

### 2.2 Bell Icon & Badge

#### Placement

Position the bell icon in the top-right area of the header navigation bar, near the user profile/avatar section.

#### Badge Counter

- Display a circular badge overlaying the top-right of the bell icon.
- **Color:** Red background, white text (standard notification badge styling).
- **Content:** The `unread_count` value from `Notification/get_unread_count`.
- **Display rules:**
  - `unread_count = 0` → Hide the badge entirely. Show only the bell icon.
  - `1 ≤ unread_count ≤ 99` → Display the exact count (e.g., `5`).
  - `unread_count > 99` → Display `"99+"`.

#### API Integration (Badge)

Fetch the unread count on page load and periodically:

```json
{
    "#request": "Notification/get_unread_count",
    "#token": "<token>"
}
```

**Refresh strategy:**
1. **On page load** — Fetch immediately.
2. **Polling** — Re-fetch every 60 seconds (configurable).
3. **On WebSocket event** — When a `new_notification` WebSocket message is received, increment the counter by 1 (optimistic update) or re-fetch for accuracy.
4. **After user action** — Re-fetch after `mark_as_read`, `mark_all_as_read`, or `delete_notification`.

### 2.3 Dropdown Panel

When the user clicks the bell icon, display a dropdown panel showing the most recent notifications.

#### Panel Layout

```
┌─────────────────────────────────────────────┐
│  Notifications                [Mark all read]│
├─────────────────────────────────────────────┤
│  ● Call Accepted                     2m ago  │
│    John Smith accepted call EC-0042          │
├─────────────────────────────────────────────┤
│  ● POI Active                       1h ago   │
│    Person of Interest John Doe is now active │
├─────────────────────────────────────────────┤
│  ○ Report Submitted               yesterday  │
│    Report RPT-0015 submitted by Jane Doe     │
│    for review                                │
├─────────────────────────────────────────────┤
│  ○ Shift Published                 2 days ago│
│    A new shift has been published for        │
│    2026-07-21                                │
├─────────────────────────────────────────────┤
│              [ View All Notifications ]      │
└─────────────────────────────────────────────┘
```

#### Panel Components

**Header Row:**
- **Title:** "Notifications" (left-aligned).
- **"Mark all read" button:** Text link or small button (right-aligned). Calls `Notification/mark_all_as_read` when clicked (see Section 2.5).

**Notification Items:**
- Display the most recent 10–15 notifications (fetch with `limit: 15, offset: 0`).
- Each item shows:
  - **Read indicator:** Filled circle (`●`) for unread, empty circle (`○`) for read.
  - **Title:** The notification `title` field, displayed in bold/semi-bold.
  - **Message:** The notification `message` field, displayed below the title in regular weight. Truncate to 2 lines if too long.
  - **Timestamp:** Relative time (e.g., "2m ago", "1h ago", "yesterday", "3 days ago"). Compute from `created_on`.
- **Click action:** When the user clicks a notification item:
  1. Call `Notification/mark_as_read` with the `notification_id` (if `is_read` is `false`).
  2. Navigate to the linked entity page using `payload.entity_type` and `payload.entity_id`.
  3. Close the dropdown panel.

**Footer Row:**
- **"View All Notifications" link:** Navigates to the full Notifications page (if implemented) or opens the panel in expanded/full-page mode.

#### API Integration (Panel)

On dropdown open, fetch the latest notifications:

```json
{
    "#request": "Notification/get_notifications",
    "#token": "<token>",
    "offset": 0,
    "limit": 15
}
```

### 2.4 Read vs. Unread Visual Distinction

Apply clear visual differentiation between read and unread notifications:

| Aspect | Unread (`is_read: false`) | Read (`is_read: true`) |
|---|---|---|
| **Background** | Light blue/highlight tint (e.g., `#EBF5FF`) | White / transparent |
| **Left indicator** | Filled blue dot (`●`) | No dot, or muted empty dot (`○`) |
| **Title weight** | Bold / semi-bold (`font-weight: 600`) | Regular weight (`font-weight: 400`) |
| **Text color** | Dark / primary text color | Muted / secondary text color |
| **Opacity** | Full opacity (`1.0`) | Slightly reduced (`0.85`) |

**Example CSS classes:**

```css
.notification-item {
    padding: 12px 16px;
    border-bottom: 1px solid #E5E7EB;
    cursor: pointer;
    transition: background-color 0.2s;
}

.notification-item:hover {
    background-color: #F3F4F6;
}

.notification-item.unread {
    background-color: #EBF5FF;
}

.notification-item.unread .notification-title {
    font-weight: 600;
    color: #1F2937;
}

.notification-item.read .notification-title {
    font-weight: 400;
    color: #6B7280;
}

.notification-item.read .notification-message {
    color: #9CA3AF;
}

.notification-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
}

.notification-dot.unread {
    background-color: #3B82F6;
}

.notification-dot.read {
    background-color: transparent;
}
```

### 2.5 "Mark All as Read" Button

**Position:** Top-right of the dropdown panel header.

**Label:** "Mark all read" (text link style, no background).

**Visibility:** Show only when `unread_count > 0`. Hide or disable when there are no unread notifications.

#### API Call

When clicked:

```json
{
    "#request": "Notification/mark_all_as_read",
    "#token": "<token>"
}
```

#### After Success (`rc: 0`)

1. Update all notification items in the dropdown to "read" visual state.
2. Reset the badge counter to `0` (hide badge).
3. Optionally show a brief success indicator (e.g., checkmark animation or toast: "All notifications marked as read").

### 2.6 Notification Type Icons

Display a category icon for each notification based on the `type` field. This helps users visually scan and identify notification categories at a glance.

| Type Category | Icon Suggestion | Matching Types |
|---|---|---|
| **Call** | Phone / phone-incoming | `new_emergency`, `new_service_call`, `call_accepted`, `call_resolved`, `call_updated`, `call_canceled`, `resident_like` |
| **Report** | File-text / clipboard | `new_incident_report`, `report_submitted`, `report_approved`, `report_changes_requested`, `report_delivered` |
| **Shift** | Calendar / clock | `shift_published`, `shift_updated`, `shift_cancelled`, `shift_starting_soon` |
| **Route** | Map / map-pin | `route_updated`, `officer_off_route` |
| **Post Order** | Book / file | `post_order_published`, `post_order_updated` |
| **POI** | Shield / alert-triangle | `poi_active`, `poi_updated`, `poi_inactivated`, `poi_expiring_soon`, `poi_expired` |
| **Task** | Wrench / tool | `task_update` |
| **Emergency** | Alert-circle (red) | `panic_button` |
| **Tracking** | Navigation / crosshair | `gps_signal_lost` |
| **System** | Bell / info | `general` |

Use a consistent icon library (e.g., Lucide, Material Icons, or Font Awesome) across all notification types.

### 2.7 WebSocket Integration

Listen for incoming WebSocket messages to provide real-time notification updates without polling.

#### Setup

When the web app establishes its WebSocket connection, the user is automatically subscribed to their notification channel by the server infrastructure. No additional subscription is needed.

#### Handling Incoming Events

```javascript
socket.on('message', function(data) {
    let msg;
    try {
        msg = JSON.parse(data);
    } catch (e) {
        return;
    }

    if (msg.event === 'new_notification') {
        // 1. Increment badge counter
        incrementBadgeCounter();

        // 2. Show toast notification
        showToast(msg.title, msg.message);

        // 3. If notifications panel is open, prepend the new notification
        if (isNotificationsPanelOpen()) {
            prependNotification({
                notification_id: msg.notification_id,
                type: msg.type,
                title: msg.title,
                message: msg.message,
                is_read: false,
                created_on: new Date().toISOString()
            });
        }

        // 4. For urgent types, use more prominent alerts
        if (['panic_button', 'new_emergency'].includes(msg.type)) {
            showUrgentAlert(msg.title, msg.message);
        }
    }
});
```

### 2.8 Empty State

When there are no notifications to display:

- **Dropdown:** Show a centered message: "No notifications" with a muted bell icon.
- **Full page:** Show: "You're all caught up! No notifications to display."

### 2.9 Timestamp Formatting

Convert the `created_on` UTC timestamp to a human-readable relative time:

| Time Difference | Display |
|---|---|
| < 1 minute | "Just now" |
| 1–59 minutes | "Xm ago" (e.g., "5m ago") |
| 1–23 hours | "Xh ago" (e.g., "3h ago") |
| 1 day (yesterday) | "Yesterday" |
| 2–6 days | "X days ago" (e.g., "3 days ago") |
| 7+ days | Formatted date (e.g., "Jul 12, 2026") |

**Important:** The server returns timestamps in UTC. Convert to the user's local timezone before computing relative time.

---

## 3. Implementation Checklist

Use the following checklist to track implementation progress:

### Settings Page

- [ ] Add `notification_retention_days` numeric input field to the Push Notifications settings panel
- [ ] Add "Data Retention" section separator above the new field
- [ ] Add help text / description below the input field
- [ ] Add client-side validation (minimum 1 day, integer only)
- [ ] Update `Settings/get_notification_settings` handler to populate the new field
- [ ] Update `Settings/update_notification_settings` handler to include the new field in the save payload
- [ ] Test: Load settings page, verify field shows the current value (default 90)
- [ ] Test: Change value, save, reload — verify the new value persists
- [ ] Test: Enter invalid value (0, -1, empty), verify client-side validation prevents save

### Notifications Panel

- [ ] Add bell icon to the header navigation bar
- [ ] Implement badge counter display with `get_unread_count`
- [ ] Implement badge display rules (hide at 0, show "99+" above 99)
- [ ] Implement dropdown panel on bell icon click
- [ ] Implement notification list with `get_notifications` (limit 15)
- [ ] Apply read/unread visual distinction (background, dot indicator, font weight)
- [ ] Implement "Mark all read" button with `mark_all_as_read` API call
- [ ] Implement click-to-read: `mark_as_read` on notification click
- [ ] Implement deep linking: navigate to entity page based on `payload`
- [ ] Implement notification type icons
- [ ] Implement relative timestamp formatting
- [ ] Implement empty state
- [ ] Implement periodic polling for `get_unread_count` (every 60 seconds)
- [ ] Implement WebSocket listener for `new_notification` events
- [ ] Implement toast/snackbar for incoming real-time notifications
- [ ] Implement urgent alert handling for `panic_button` and `new_emergency` types
- [ ] Test: Verify unread badge updates after mark_as_read
- [ ] Test: Verify mark_all_as_read clears badge and updates all items
- [ ] Test: Verify WebSocket event increments badge and shows toast
- [ ] Test: Verify deep linking navigates to correct entity page
- [ ] Test: Verify delete_notification removes item and updates count
