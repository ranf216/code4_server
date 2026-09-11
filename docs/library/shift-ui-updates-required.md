# Phase 5.1 — Shift Management: UI Updates Required

**Version:** 1.0
**Last Updated:** 2026-09-10
**Audience:** Frontend developers — Web Admin Portal (React) and Mobile Officer App (React Native)
**SDS Reference:** Sections 3.11 (My Shifts and Routes), 4.7 (Shift Management &amp; Officer Allocation)

---

## Table of Contents

1. [Web Admin Portal](#1-web-admin-portal)
2. [Officer Mobile App](#2-officer-mobile-app)
3. [Shared Components](#3-shared-components)
4. [Status Color Scheme](#4-status-color-scheme)

---

## 1. Web Admin Portal

### 1.1 Shift Calendar View

**Location:** Main menu > Shift Management
**API:** `Shift/get_shifts_calendar`

#### 1.1.1 Calendar Grid Component

The calendar supports three selectable views:

| View | Layout | Default Range |
|------|--------|---------------|
| **Day** | Vertical timeline, one column per shift | Single selected day |
| **Week** (default) | 7 columns (Mon-Sun), rows = time slots | Current ISO week |
| **Month** | Grid of day cells, each showing shift count badge | Current month |

**Toolbar controls:**
- **Community selector** — Dropdown. Super Admins see "All Communities" option plus each community. Local Admins see only their assigned community (pre-selected, non-editable).
- **View toggle** — Day / Week / Month buttons.
- **Date navigation** — Previous/Next arrows and a date picker.
- **"Add Shift" button** — Opens the Shift Details panel in create mode.
- **"Allocation Board" button** — Opens the drag-and-drop allocation view.

#### 1.1.2 Shift Block Display

Each shift block in the calendar displays:

| Element | Source | Notes |
|---------|--------|-------|
| Community name | `community_name` | Shown when viewing "All Communities" |
| Shift time range | `start_time` — `end_time` | Append "(+1)" suffix for overnight shifts |
| Allocated officer names | `officers[].name` | Comma-separated; truncate with "+N more" if > 3 |
| Status badge | `status` | Color-coded pill (see [Status Color Scheme](#4-status-color-scheme)) |
| Post count | `posts_count` | Small badge showing number of post assignments |

**Interaction:** Clicking a shift block opens the Shift Details panel (slide-over from right).

#### 1.1.3 Filters &amp; Search

Located above the calendar grid. All filters apply to `Shift/get_shifts_calendar` parameters:

| Filter | Control | API Parameter |
|--------|---------|--------------|
| Community | Dropdown | `community_id` |
| Officer | Autocomplete text input | `officer_id` |
| Status | Multi-select chips | `status` |
| Date range | Date range picker | `date_from`, `date_to` (overrides calendar range) |
| Free-text | Search input | `search_text` |

---

### 1.2 Shift Details Panel

**Trigger:** Click shift block (edit) or "Add Shift" button (create)
**Layout:** Slide-over panel from the right side of the screen
**API:** `Shift/get_shift` (read), `Shift/create_shift` / `Shift/update_shift` (write)

#### 1.2.1 Shift Information Section

| Field | Control | Required | API Field | Notes |
|-------|---------|----------|-----------|-------|
| Shift ID | Read-only text | — | `shift_id` | Auto-generated. Shown in edit mode only. |
| Community | Dropdown | Yes | `community_id` | Active communities. Locked after creation. |
| Shift Date | Date picker | Yes | `shift_date` | `YYYY-MM-DD` |
| Start Time | Time picker | Yes | `start_time` | 24h format (`HH:MM`) |
| End Time | Time picker | Yes | `end_time` | 24h. If &le; start_time, show "(next day)" indicator |
| Recurring | Toggle switch | No | — | Enables recurrence fields (see 1.3) |
| Notes | Textarea | No | `notes` | Max 500 characters. Character counter shown. |
| Status | Read-only badge | — | `status` | Color-coded. Shows transition buttons below. |

#### 1.2.2 Status Action Buttons

Display contextually based on current status:

| Current Status | Available Actions |
|----------------|-------------------|
| `draft` | **Publish**, **Delete** |
| `published` | **Cancel** |
| `active` | (no manual actions — managed by check-in/check-out) |
| `completed` | (read-only) |
| `cancelled` | (read-only) |

**Publish button flow:**
1. Call `Shift/publish_shift` without `acknowledge_conflicts`.
2. If `rc: 616` returned, open the Conflict Warning Modal (see 1.5).
3. If user acknowledges, re-call with `acknowledge_conflicts: true`.

#### 1.2.3 Officer Allocation Section

**Layout:** List of allocated officers with an "Add Officer" button.

Each officer row shows:
- Officer name and avatar
- Roles/badges (small pills)
- Assigned posts (if any)
- Remove button (trash icon)

**"Add Officer" flow:**
1. Opens an officer picker — searchable list of community officers.
2. On selection, calls `Shift/allocate_officer`.
3. If `rc: 616`, shows inline conflict warnings with acknowledgment option.
4. On success, officer appears in the list.

**"Remove Officer" flow:**
1. Confirmation dialog: "Remove [name] from this shift?"
2. If shift is active, additional warning: "This officer has an active check-in which will be auto-closed."
3. Calls `Shift/remove_officer`.

#### 1.2.4 Post Assignment Section

**Layout:** Nested under each allocated officer in the officer list.

- "Assign Post" button per officer.
- Opens a post picker (community posts dropdown).
- Calls `Shift/assign_post`.
- If post eligibility mismatch warning is returned, display inline warning card:
  - "Missing required roles: [role_a, role_b]"
  - "Missing required badges: [badge_x]"
  - This is non-blocking — the assignment proceeds.

#### 1.2.5 Check-In History Section

**Shown when:** Shift status is `active` or `completed`.

Table displaying:

| Column | Description |
|--------|-------------|
| Officer Name | Full name |
| Check-in Time | `SFC_CHECK_IN_ON` formatted in local timezone |
| Check-out Time | `SFC_CHECK_OUT_ON` or "Still active" badge |
| Total Hours | `SFC_TOTAL_HOURS` or live timer |
| Auto-checkout | Flag icon if `SFC_AUTO_CHECKOUT = 1` |
| Notes | `SFC_NOTES` (e.g., "Auto-closed by lifecycle cron") |

---

### 1.3 Recurring Shift Wizard

**Trigger:** Toggle "Recurring" switch in the Shift Details panel.
**API:** `Shift/create_recurring_shifts`

#### 1.3.1 Recurrence Configuration Fields

| Field | Control | Shown When | API Field |
|-------|---------|------------|-----------|
| Recurrence Pattern | Dropdown: Daily / Specific Days / Every X Days | Always | `recurrence_pattern` |
| Repeat On | Day-of-week checkbox group (Sun-Sat) | Pattern = `specific_days` | `repeat_on` (array of numbers 0-6) |
| Every X Days | Number input (min: 2) | Pattern = `every_x_days` | `interval_days` |
| End Condition | Radio: End Date / Occurrences / No End | Always | `end_type` |
| End Date | Date picker | End Condition = `end_date` | `end_date` |
| Occurrences | Number input (1-365) | End Condition = `occurrences` | `occurrences` |

**"No End" notice:** When selected, display an informational banner:
> "Shifts will be generated on a rolling 90-day horizon. The system automatically extends the series as time progresses."

#### 1.3.2 Edit Recurring Shift

When editing a shift that belongs to a series (`series_id` is not null), prompt with a scope selector:

**API:** `Shift/update_recurring_shifts`

| Option | Description | API `scope` value |
|--------|-------------|-------------------|
| This shift only | Changes apply only to this shift | `this_only` |
| This and future shifts | Changes apply to this shift and all future shifts in the series | `this_and_future` |
| All shifts in series | Changes apply to all draft/published shifts in the series | `all` |

Display as a radio-button dialog before applying the update. Only `draft` and `published` shifts in the series are affected.

---

### 1.4 Allocation Board

**Trigger:** "Allocation Board" button in calendar toolbar.
**API:** `Shift/get_allocation_board`, `Shift/allocate_officer`, `Shift/validate_allocation`

#### 1.4.1 Layout

| Panel | Content |
|-------|---------|
| **Left panel** — Officers | Scrollable list of available officers for the selected community. Each card shows: name, roles, certification badges, weekly hours used (e.g., "32/48h"). |
| **Right panel** — Shifts | Timeline view for the selected date. One row per shift block showing time range, status, and currently allocated officers. |

**Top bar:** Community selector + Date picker.

#### 1.4.2 Interaction

- **Drag** an officer card from the left panel onto a shift row.
- On drop, call `Shift/validate_allocation` to check conflicts.
- If warnings returned, display the Conflict Warning Modal (see 1.5).
- If user acknowledges (or no conflicts), call `Shift/allocate_officer` with `acknowledge_conflicts` as needed.
- On success, officer appears in the shift row; weekly hours counter updates.

---

### 1.5 Conflict Warning Modal

**Trigger:** `rc: 616` response from `allocate_officer`, `publish_shift`, or `validate_allocation`.

#### 1.5.1 Modal Layout

**Header:** "Scheduling Conflicts Detected"

**Body:** List of warning cards, one per conflict:

| Warning Type | Card Content |
|-------------|-------------|
| `DOUBLE_BOOKING` | "[Officer Name] is already allocated to Shift #[id] on [date] ([start_time]-[end_time])" |
| `OVERTIME_WARNING` | "[Officer Name] would have [X]h this week (limit: [max_weekly_hours]h)" |
| `REST_GAP_WARNING` | "[Officer Name] would have only [X]h rest between shifts (minimum: [min_rest_gap_hours]h)" |
| `POST_ELIGIBILITY_MISMATCH` | "[Officer Name] is missing required [roles/badges]: [list]" |

**Footer:**
- Checkbox: **"I acknowledge these conflicts and wish to proceed"** (must be ticked to enable the Confirm button)
- **Cancel** button — closes modal, no action taken.
- **Confirm** button (disabled until checkbox ticked) — re-calls the API with `acknowledge_conflicts: true`.

---

### 1.6 Live Shift Monitor

**Location:** Dashboard > Active Shifts panel (or dedicated Shift Monitor view)
**API:** `Shift/get_shifts_calendar` with `status=active`

Displays currently active shifts with real-time status:

| Column | Description |
|--------|-------------|
| Community | Community name |
| Shift Time | Start — End (with elapsed time indicator) |
| Officers | List with check-in status icon (checked-in = green dot, not checked-in = amber dot) |
| Check-in Time | When each officer checked in |
| Unfulfilled Posts | Posts with no checked-in officer assigned |

**Auto-refresh:** Poll every 60 seconds or use WebSocket updates when available.

---

## 2. Officer Mobile App

### 2.1 "My Shifts" Screen

**Location:** Bottom navigation > "My Shifts" tab
**API:** `Shift/get_my_shifts`

#### 2.1.1 Layout

**Segmented control** at top with three tabs:

| Tab | Filter | Description |
|-----|--------|-------------|
| **Upcoming** | `status` = `published` | Shifts assigned but not yet started |
| **Active** | `status` = `active` | Currently ongoing shifts |
| **Past** | `status` = `completed`, `cancelled` | Historical shifts |

**Date range filter:** Collapsible date picker to narrow results.

#### 2.1.2 Shift Card

Each shift is displayed as a card:

| Element | Content |
|---------|---------|
| Date | Shift date formatted (e.g., "Mon, Sep 15") |
| Time | Start — End time. "(Overnight)" badge if applicable. |
| Community | Community/site name |
| Status | Color-coded pill |
| Posts | List of assigned post names (if any) |
| Location preview | Small map thumbnail showing post locations (if available) |

**Interaction:** Tap opens the Shift Detail / Check-In view.

#### 2.1.3 Pagination

Infinite scroll with 0-based `page` parameter. Shows loading spinner while fetching.

---

### 2.2 Shift Detail / Check-In View

**Trigger:** Tap a shift card from "My Shifts" or tap a push notification.
**API:** `Shift/get_shift`, `Shift/check_in`, `Shift/check_out`

#### 2.2.1 Layout

**Top section:**
- Shift date, time range, community name
- Status badge (color-coded)
- Notes (if any)

**Middle section — Assigned posts:**
- List of posts assigned to this officer
- Each post shows: name, location, required roles/badges

**Bottom section — Action area:**

| Shift Status | Action Button | Behaviour |
|-------------|---------------|-----------|
| `published` | **Check In** (large, prominent green button) | Calls `Shift/check_in`. On success, status updates to `active` and timer starts. |
| `active` (checked in) | **Check Out** (large red button) + live timer | Shows elapsed time since check-in. Calls `Shift/check_out`. |
| `active` (not checked in) | **Check In** button | Same as published flow. |
| `completed` | Summary view | Shows check-in/out times, total hours. |
| `cancelled` | Cancelled notice | "This shift has been cancelled" banner. |

#### 2.2.2 Check-In Error Handling

**Hard-block (rc: 617 — already checked in):**

Display an inline error banner (not a blocking dialog):

> "You are currently checked in to another shift. Please check out of that shift before checking in to this one."

Include a "Go to Active Shift" button that navigates to the conflicting shift.

#### 2.2.3 Active Shift Timer

When checked in, display:
- Large timer showing hours:minutes:seconds since check-in.
- Shift end time with countdown: "Shift ends in X hours Y minutes".
- If past end time: amber warning "Shift has ended — please check out".

---

### 2.3 My Hours Screen

**Location:** "My Shifts" > "Hours" tab or sub-screen
**API:** `Shift/get_my_hours`

#### 2.3.1 Layout

| Element | Content |
|---------|---------|
| Weekly summary | Total hours for the current week (bar chart or number) |
| Hours list | Paginated list of check-in records |

Each record shows:

| Field | Display |
|-------|---------|
| Date | Shift date |
| Shift time | Scheduled start — end |
| Check-in | Actual check-in time |
| Check-out | Actual check-out time (or "Still active") |
| Total hours | Hours worked (2 decimal places) |
| Auto-checkout | Warning icon + tooltip if `auto_checkout = true` |

---

### 2.4 Push Notification Deep-Linking

| Notification Type | Deep-Link Target | Behaviour |
|-------------------|-----------------|-----------|
| `shift_published` | Shift Detail view for the published shift | Show shift info with Check In button |
| `shift_updated` | Shift Detail view | Highlight updated fields (if possible) |
| `shift_cancelled` | My Shifts > Upcoming tab | Show cancelled badge on the shift card |
| `shift_starting_soon` | Shift Detail / Check-In view | Check In button prominently displayed. Timer showing "Starts in X minutes". |

**Implementation notes:**
- Notification payload must include `shift_id` in the `data` field.
- On tap, parse `shift_id` from the notification data and navigate using the app's deep-link router.
- If the app is in the background, reconstruct the navigation stack: My Shifts > Shift Detail.

---

## 3. Shared Components

### 3.1 Shift Status Badge

Reusable component for both web and mobile:

```
<ShiftStatusBadge status="published" />
```

Renders a colored pill/chip with the status label. See color scheme below.

### 3.2 Conflict Warning Card

Reusable card component that renders a single warning from the `warnings[]` array:

```
<ConflictWarningCard
  type="DOUBLE_BOOKING"
  officerName="John Smith"
  details={{ conflicting_shift_id: 12, conflicting_shift_date: "2026-09-15" }}
/>
```

### 3.3 Officer Allocation Chip

Small chip showing officer name, avatar, and optional role pills. Used in calendar blocks, allocation board, and shift details.

---

## 4. Status Color Scheme

| Status | Background | Text | Hex (suggested) | Usage |
|--------|-----------|------|-----------------|-------|
| `draft` | Light gray | Dark gray | `#E5E7EB` / `#374151` | Unpublished, manager-only |
| `published` | Light blue | Dark blue | `#DBEAFE` / `#1E40AF` | Sent to officers, awaiting start |
| `active` | Light green | Dark green | `#D1FAE5` / `#065F46` | Currently in progress |
| `completed` | Dark green | White | `#065F46` / `#FFFFFF` | Successfully finished |
| `cancelled` | Light red | Dark red | `#FEE2E2` / `#991B1B` | Cancelled by manager |

**Calendar block styling:**
- Left border: 4px solid in the status's dark color.
- Background: status's light color.
- Text: status's dark color.

**Badge/pill styling:**
- Rounded corners (full pill shape).
- Background: status color.
- Text: contrasting text color.
- Font: 12px semi-bold, uppercase.
