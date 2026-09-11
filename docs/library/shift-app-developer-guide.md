# Shift API — Application Developer Guide

**Version:** 1.0
**Last Updated:** 2026-09-10
**Audience:** Frontend developers (React Web Portal, React Native Mobile App)
**Module:** `Shift`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication &amp; Access Scoping](#2-authentication--access-scoping)
3. [Conventions](#3-conventions)
4. [Endpoint Directory](#4-endpoint-directory)
5. [Error &amp; Warning Codes](#5-error--warning-codes)
6. [Handling Conflict Warnings](#6-handling-conflict-warnings)
7. [Push Notification Payloads](#7-push-notification-payloads)

---

## 1. Overview

The Shift module provides APIs for:

- **Calendar &amp; querying** — calendar views (day/week/month), shift details, officer schedules.
- **Shift operations** — create, update, publish, cancel, delete shifts.
- **Officer allocation** — assign/remove officers, validate conflicts.
- **Post assignment** — assign officers to specific posts within a shift.
- **Recurring shifts** — create and update series of shifts.
- **Check-in/Check-out** — officer mobile execution with hours tracking.
- **Settings** — configurable shift parameters (weekly hours, rest gap, etc.).

---

## 2. Authentication &amp; Access Scoping

### 2.1 Token Authentication

All Shift APIs require a valid session token passed as `#token` (type `s`). The token determines the caller's identity and access level.

### 2.2 Access Control

| User Type | Endpoints Available | Community Scope |
|-----------|-------------------|-----------------|
| **Admin (Super)** | All admin endpoints | All communities (`community_id = 0` returns global view) |
| **Admin (Local)** | All admin endpoints | Restricted to assigned `USD_COM_ID`. Requests for other communities return `rc: 103`. |
| **Officer** | `get_shift`, `get_my_shifts`, `get_my_hours`, `check_in`, `check_out` | Own shifts only |

### 2.3 Pagination

All paginated endpoints use **0-based page numbering**. Pass `page: 0` for the first page. Page size is server-configured (default: 20 items).

---

## 3. Conventions

- **Date format:** `YYYY-MM-DD` (string).
- **Time format:** `HH:MM` 24-hour (string). Example: `"14:30"`, `"23:00"`.
- **User IDs:** 128-character hex strings.
- **Booleans:** Use `true`/`false`.
- **Optional parameters:** When not sent, the server uses the documented default. For update endpoints, fields with `/null/` default are skipped (not updated) when absent.

---

## 4. Endpoint Directory

### 4.1 Calendar &amp; Querying

#### `Shift/get_shifts_calendar`

Get shifts for calendar view (day/week/month). Returns shifts for the specified date range.

**ACL:** Admin

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `community_id` | `i` | No | `0` | Community ID. `0` = all accessible communities. |
| `date_from` | `s` | Yes | — | Start date (`YYYY-MM-DD`) |
| `date_to` | `s` | Yes | — | End date (`YYYY-MM-DD`) |
| `officer_id` | `s` | No | — | Filter by officer user ID |
| `status` | `s` | No | — | Filter by shift status: `draft`, `published`, `active`, `completed`, `cancelled` |
| `search_text` | `s` | No | — | Free-text search across officer name and community name |

**Returns:** Array of shift objects with allocated officer names, community info, and status.

---

#### `Shift/get_shift`

Get shift details including allocated officers and post assignments.

**ACL:** Admin, Officer

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |

**Returns:** Full shift detail object including:
- Shift metadata (date, times, status, notes, overnight flag)
- List of allocated officers with names
- List of post assignments per officer
- Check-in/check-out records
- Series info (if recurring)

---

#### `Shift/get_my_shifts`

Get officer's own shifts list (published, active, or completed).

**ACL:** Officer

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date_from` | `s` | No | — | Start date filter (`YYYY-MM-DD`) |
| `date_to` | `s` | No | — | End date filter (`YYYY-MM-DD`) |
| `status` | `s` | No | — | Filter by status: `draft`, `published`, `active`, `completed`, `cancelled` |
| `page` | `i` | No | `0` | Page number (0-based) |

**Returns:** Paginated array of the officer's shift records.

---

#### `Shift/get_my_hours`

Get officer's check-in/check-out hours history.

**ACL:** Officer

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date_from` | `s` | No | — | Start date filter (`YYYY-MM-DD`) |
| `date_to` | `s` | No | — | End date filter (`YYYY-MM-DD`) |
| `page` | `i` | No | `0` | Page number (0-based) |

**Returns:** Paginated array of check-in records with `check_in_on`, `check_out_on`, `total_hours`, `auto_checkout` flag.

---

### 4.2 Shift Operations

#### `Shift/create_shift`

Create a new shift.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `community_id` | `i` | Yes | Community ID |
| `shift_date` | `s` | Yes | Shift date (`YYYY-MM-DD`) |
| `start_time` | `s` | Yes | Start time (`HH:MM`, 24h) |
| `end_time` | `s` | Yes | End time (`HH:MM`, 24h) |
| `officer_ids` | `a` | No | Array of officer user IDs to allocate |
| `notes` | `s` | No | Free text notes (max 500 chars) |

**Returns:** `{ rc: 0, shift_id: <new_id> }`

**Notes:**
- Overnight shifts are auto-detected when `end_time <= start_time`.
- Officers are validated to belong to the specified community.
- Shift is created in `draft` status.

---

#### `Shift/update_shift`

Update shift details. Only draft and published shifts can be updated.

**ACL:** Admin

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `shift_id` | `i` | Yes | — | Shift ID |
| `shift_date` | `s` | No | `/null/` | Shift date (`YYYY-MM-DD`) |
| `start_time` | `s` | No | `/null/` | Start time (`HH:MM`, 24h) |
| `end_time` | `s` | No | `/null/` | End time (`HH:MM`, 24h) |
| `notes` | `s` | No | `/null/` | Free text notes (max 500 chars) |

**Notes:** Only fields sent with non-null values are updated. Published shift updates trigger a `shift_updated` notification.

---

#### `Shift/publish_shift`

Publish a draft shift. Sends notification to all allocated officers.

**ACL:** Admin

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `shift_id` | `i` | Yes | — | Shift ID |
| `acknowledge_conflicts` | `b` | No | `false` | Set `true` to override scheduling conflict warnings |

**Response when conflicts exist (rc: 616):**
```json
{
  "rc": 616,
  "message": "officer has a scheduling conflict",
  "warnings": [...],
  "requires_acknowledgment": true
}
```

**Flow:** Call once without `acknowledge_conflicts`. If `rc: 616` is returned, display warnings to the user. If they confirm, re-call with `acknowledge_conflicts: true`.

---

#### `Shift/cancel_shift`

Cancel a published or draft shift. Sends cancellation notification.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |

---

#### `Shift/delete_shift`

Delete a draft shift. Only shifts in draft status can be deleted.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |

---

### 4.3 Officer Allocation &amp; Posts

#### `Shift/allocate_officer`

Allocate an officer to a shift. Returns warnings if conflicts detected.

**ACL:** Admin

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `shift_id` | `i` | Yes | — | Shift ID |
| `officer_id` | `s` | Yes | — | Officer user ID |
| `acknowledge_conflicts` | `b` | No | `false` | Set `true` to override conflict warnings |

**Warning response (rc: 616):** Same structure as `publish_shift`. See [Handling Conflict Warnings](#6-handling-conflict-warnings).

---

#### `Shift/remove_officer`

Remove an officer from a shift.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |
| `officer_id` | `s` | Yes | Officer user ID |

**Notes:** If the shift is active and the officer has an open check-in, the check-in is auto-closed. All post assignments for this officer on this shift are also removed. The officer receives a notification.

---

#### `Shift/assign_post`

Assign a post to an officer in a shift. The officer must already be allocated to the shift.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |
| `officer_id` | `s` | Yes | Officer user ID |
| `post_id` | `i` | Yes | Post ID |

**Notes:** Validates post eligibility (roles, badges). Returns non-blocking warning if officer lacks required capabilities.

---

#### `Shift/validate_allocation`

Check for scheduling conflicts without making changes. Dry-run validation.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |
| `officer_id` | `s` | Yes | Officer user ID |

**Returns:** Conflict warnings (if any) in the same format as `allocate_officer`.

---

#### `Shift/get_allocation_board`

Get available officers and shifts for the allocation board view.

**ACL:** Admin

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `community_id` | `i` | Yes | Community ID |
| `board_date` | `s` | Yes | Date to show (`YYYY-MM-DD`) |

**Returns:** Object containing:
- List of available officers with roles, badges, and current weekly hours
- List of shifts for the date with their current allocations

---

### 4.4 Recurring Shifts

#### `Shift/create_recurring_shifts`

Create a series of recurring shifts.

**ACL:** Admin

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `community_id` | `i` | Yes | — | Community ID |
| `start_date` | `s` | Yes | — | First shift date (`YYYY-MM-DD`) |
| `start_time` | `s` | Yes | — | Start time (`HH:MM`, 24h) |
| `end_time` | `s` | Yes | — | End time (`HH:MM`, 24h) |
| `recurrence_pattern` | `s` | Yes | — | `daily`, `specific_days`, `every_x_days` |
| `repeat_on` | `n` | No | — | Array of day numbers (0=Sun..6=Sat) for `specific_days` |
| `interval_days` | `i` | No | `0` | Interval for `every_x_days` pattern |
| `end_type` | `s` | Yes | — | `end_date`, `occurrences`, `no_end` |
| `end_date` | `s` | No | — | End date when `end_type = end_date` |
| `occurrences` | `i` | No | `0` | Number of occurrences (max 365) when `end_type = occurrences` |
| `officer_ids` | `a` | No | — | Array of officer user IDs to allocate to all shifts |
| `notes` | `s` | No | — | Free text notes (max 500 chars) |

**Returns:** `{ rc: 0, series_id: <id>, shift_count: <n>, shift_ids: [...] }`

**Notes:**
- For `no_end`, shifts are generated for a rolling 90-day horizon.
- All shifts are created in `draft` status and must be published individually or in batch.
- `repeat_on` is an array of numbers (type `n`), e.g., `[1, 3, 5]` for Mon/Wed/Fri.

---

#### `Shift/update_recurring_shifts`

Update recurring shifts. Scope controls which shifts in the series are affected.

**ACL:** Admin

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `shift_id` | `i` | Yes | — | Shift ID (the shift being edited) |
| `scope` | `s` | Yes | — | `this_only`, `this_and_future`, `all` |
| `start_time` | `s` | No | `/null/` | Start time (`HH:MM`, 24h) |
| `end_time` | `s` | No | `/null/` | End time (`HH:MM`, 24h) |
| `notes` | `s` | No | `/null/` | Free text notes (max 500 chars) |

**Notes:** Only `draft` and `published` shifts in the series are affected. Active/completed/cancelled shifts are never modified.

---

### 4.5 Mobile Execution

#### `Shift/check_in`

Officer checks in for a shift.

**ACL:** Officer

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |

**Success:** `{ rc: 0 }` — check-in recorded. If this is the first check-in, shift transitions from `published` to `active`.

**Hard-block error (rc: 617):** Officer has an open check-in on another shift. The officer must check out of the other shift first.

```json
{
  "rc": 617,
  "message": "officer has already checked in"
}
```

---

#### `Shift/check_out`

Officer checks out from a shift.

**ACL:** Officer

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shift_id` | `i` | Yes | Shift ID |

**Success:** `{ rc: 0 }` — check-out recorded with total hours calculated. If all allocated officers have now checked out, the shift auto-transitions to `completed`.

**Error (rc: 618):** Officer has not checked in to this shift.

---

### 4.6 Settings

#### `Settings/get_shift_settings`

**ACL:** Admin

Returns the current shift configuration values.

**Response:**
```json
{
  "rc": 0,
  "settings": {
    "max_weekly_hours": 48,
    "min_rest_gap_hours": 8,
    "auto_checkout_grace_mins": 60,
    "shift_starting_soon_lead_mins": 30,
    "early_checkin_window_mins": 30
  }
}
```

---

#### `Settings/update_shift_settings`

**ACL:** Admin

Updates one or more shift settings. Only send the fields you want to change.

---

## 5. Error &amp; Warning Codes

### 5.1 Shift Error Codes (610-629)

| RC | Code | Message | When |
|----|------|---------|------|
| 610 | `ERR_SHIFT_NOT_FOUND` | shift not found | Shift ID does not exist or is soft-deleted |
| 611 | `ERR_SHIFT_INVALID_STATUS` | invalid shift status | Invalid status value provided |
| 612 | `ERR_SHIFT_CANNOT_PUBLISH` | shift cannot be published in its current status | Shift is not in `draft` status |
| 613 | `ERR_SHIFT_CANNOT_CANCEL` | shift cannot be canceled in its current status | Shift is `active`, `completed`, or `cancelled` |
| 614 | `ERR_SHIFT_OFFICER_ALREADY_ALLOCATED` | officer is already allocated to this shift | Duplicate allocation attempt |
| 615 | `ERR_SHIFT_OFFICER_NOT_ALLOCATED` | officer is not allocated to this shift | Remove/check-in for unallocated officer |
| 616 | `ERR_SHIFT_OFFICER_CONFLICT` | officer has a scheduling conflict | Conflict warnings present; requires acknowledgment |
| 617 | `ERR_SHIFT_ALREADY_CHECKED_IN` | officer has already checked in | **Hard-block**: open check-in exists on another shift |
| 618 | `ERR_SHIFT_NOT_CHECKED_IN` | officer has not checked in | Check-out without prior check-in |
| 619 | `ERR_SHIFT_INVALID_TIME_RANGE` | invalid shift time range | Time format invalid or range nonsensical |
| 620 | `ERR_SHIFT_CANNOT_UPDATE` | shift cannot be updated in its current status | Shift is `active`, `completed`, or `cancelled` |
| 621 | `ERR_SHIFT_CANNOT_DELETE` | only draft shifts can be deleted | Attempting to delete non-draft shift |
| 622 | `ERR_SHIFT_POST_NOT_FOUND` | post not found or not active | Post ID invalid or post is inactive |
| 623 | `ERR_SHIFT_OFFICER_NOT_IN_COMMUNITY` | officer does not belong to the shift community | Officer's community does not match shift's community |
| 624 | `ERR_SHIFT_INVALID_RECURRENCE` | invalid recurrence configuration | Missing/invalid recurrence parameters |
| 625 | `ERR_SHIFT_SERIES_NOT_FOUND` | shift series not found | Series ID does not exist |
| 626 | `ERR_SHIFT_ALREADY_ACTIVE` | shift is already active | — |
| 627 | `ERR_SHIFT_ALREADY_COMPLETED` | shift is already completed | — |
| 628 | `ERR_SHIFT_ALREADY_CANCELLED` | shift is already cancelled | — |
| 629 | `ERR_SHIFT_NO_OFFICERS` | shift has no allocated officers and cannot be published | Publish without allocations |

### 5.2 Cross-Module Errors

| RC | Code | When |
|----|------|------|
| 103 | `ERR_NO_PRIVILEGES` | Local admin accessing another community's shifts |
| 507 | `ERR_COMMUNITY_HAS_ACTIVE_SHIFTS` | Attempting to delete a community with active shifts |

### 5.3 Structured Warning Types

Returned in the `warnings[]` array when `rc: 616`:

| Warning Type | Description |
|-------------|-------------|
| `DOUBLE_BOOKING` | Officer is allocated to an overlapping shift |
| `OVERTIME_WARNING` | Allocation would exceed configured `max_weekly_hours` |
| `REST_GAP_WARNING` | Rest period between shifts is below `min_rest_gap_hours` |
| `POST_ELIGIBILITY_MISMATCH` | Officer lacks required roles or badges for the assigned post |

---

## 6. Handling Conflict Warnings

### 6.1 Two-Step Acknowledgment Flow

Conflict warnings use a two-step pattern for `allocate_officer` and `publish_shift`:

**Step 1 — Initial call (without acknowledgment):**
```
POST Shift/allocate_officer
{ shift_id: 5, officer_id: "abc123..." }
```

**Response (if conflicts):**
```json
{
  "rc": 616,
  "message": "officer has a scheduling conflict",
  "warnings": [
    {
      "type": "DOUBLE_BOOKING",
      "officer_id": "abc123...",
      "officer_name": "John Smith",
      "conflicting_shift_id": 12,
      "conflicting_shift_date": "2026-09-15"
    },
    {
      "type": "OVERTIME_WARNING",
      "officer_id": "abc123...",
      "officer_name": "John Smith",
      "current_weekly_hours": 44.5,
      "max_weekly_hours": 48,
      "additional_hours": 8
    }
  ],
  "requires_acknowledgment": true
}
```

**Step 2 — Display warnings, then re-call with acknowledgment:**
```
POST Shift/allocate_officer
{ shift_id: 5, officer_id: "abc123...", acknowledge_conflicts: true }
```

**Response:** `{ rc: 0 }` — allocation proceeds.

### 6.2 UI Implementation Guidance

1. Parse `warnings[]` from the `rc: 616` response.
2. Display a modal/dialog listing each warning with type-specific messaging.
3. Include an "Acknowledge &amp; Override Conflicts" checkbox.
4. On confirmation, re-call the same endpoint with `acknowledge_conflicts: true`.

---

## 7. Push Notification Payloads

### 7.1 Notification Types

| Type Key | Title | Message Template |
|----------|-------|-----------------|
| `shift_published` | Shift Published | A new shift has been published for `#shift_date#` |
| `shift_updated` | Shift Updated | Your shift on `#shift_date#` has been updated |
| `shift_cancelled` | Shift Cancelled | Your shift on `#shift_date#` has been cancelled |
| `shift_starting_soon` | Shift Starting Soon | Your shift at `#location_name#` starts in `#minutes#` minutes |

### 7.2 Deep-Linking

All shift notifications should include the `shift_id` in the notification data payload. The mobile app should:

- **`shift_published`** — Navigate to the shift detail / check-in view.
- **`shift_updated`** — Navigate to the shift detail view showing updated info.
- **`shift_cancelled`** — Navigate to My Shifts with a visual indication of cancellation.
- **`shift_starting_soon`** — Navigate directly to the shift check-in view with the "Check In" button prominently displayed.
