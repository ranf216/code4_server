# Phase 5.2 — Patrol Route Optimisation: UI Updates Required

**Version:** 5.2.0
**Audience:** Frontend developers (React Web Portal, React Native Mobile App), UX designers
**SDS Reference:** 3.11 (My Shifts and Routes), 4.8.1–4.8.3 (Patrol Route Optimisation), 4.9.1–4.9.2 (Live Tracking)

---

## 1. Overview

This document specifies all user interface additions and modifications required across both the Web Admin Portal and the Officer Mobile App to support the Patrol Route Optimisation module. All data flows are driven by the API endpoints documented in `docs/library/route-app-developer-guide.md`.

---

## 2. Web Admin Portal

### 2.1 Shift Details Panel — Route Section

**Location:** Existing Shift Details slide-over panel (SDS 4.7.2), below the Post Assignment table.

**Entry point:** A new **"Patrol Route"** section appears in the Shift Details panel for published shifts with allocated officers.

#### 2.1.1 Route Status Per Officer

Display a table/list of allocated officers with their route status:

| Column | Source | Description |
|--------|--------|-------------|
| Officer Name | `officer_name` from `get_route` | Full name |
| Route Status | `status` from route object | Badge: **Draft** (grey), **Active** (blue), **Completed** (green), **No Route** (dashed outline) |
| Compliance | `compliance_percent` from `get_route_compliance` | Percentage bar. Only shown for `active`/`completed` routes. |
| Waypoints | `waypoints.length` | e.g. "8 waypoints" |
| Actions | — | **View/Edit** (opens Route Builder), **Push** (for draft routes), **Generate** (if no route) |

#### 2.1.2 Action Buttons

| Button | Condition | API Call | Behaviour |
|--------|-----------|----------|-----------|
| **Generate Route** | No route exists for this officer+shift | `Route/generate_route` | Creates a draft route. On success, refresh the officer row. On `ERR_ROUTE_NO_POSTS_AVAILABLE` (rc 641), show inline warning: "No posts with valid locations in this community." |
| **Generate All** | At least one officer has no route | `Route/generate_route` per officer | Calls generate for each officer without a route. Show progress indicator. Individual failures display as warnings per officer. |
| **Push Route** | Route in `draft` status | `Route/push_route` | Transitions to `active`. Confirm dialog: "Push this route to {officer_name}? They will be notified immediately." |
| **Push All Drafts** | At least one draft route exists | `Route/push_route` per draft route | Batch push with confirmation. |

---

### 2.2 Route Builder Workspace (Map Sequencer)

**Location:** Opens as a full-width modal or dedicated page when clicking **View/Edit** on a route.

**Layout:** Two-panel design.

#### 2.2.1 Left Panel — Waypoint List

A scrollable, ordered list of all waypoints in the route:

| Element | Description |
|---------|-------------|
| **Order number** | 1-based sequence. Updates on reorder. |
| **Waypoint name** | Editable text field (max 100 characters). |
| **Priority badge** | Colour-coded tag: Critical (red), High (orange), Normal (blue), Low (grey). Clickable dropdown to change. |
| **Dwell time** | Editable number input (minutes). Default: 5. |
| **Post link** | If waypoint is linked to a post, show post name as a link. "Custom" label if `post_id` is null. |
| **ETA from previous** | Read-only. Displayed as "~X min" or "Start" for the first waypoint. |
| **Notes** | Expandable text area (max 500 characters). |
| **Drag handle** | Left-side grip icon for drag-and-drop reordering. |
| **Remove button** | X icon. Requires confirmation if waypoint is linked to a post. |

**Drag-and-drop behaviour:**
- Reordering the list updates the `order` field on each waypoint.
- The map polyline redraws in real-time as waypoints are reordered.
- On save, the full waypoint array is sent to `Route/update_route`.

**Add Waypoint button** (bottom of list):
- Opens a "New Waypoint" form inline: name, coordinates (auto-populated from map click), priority, dwell time, notes.

#### 2.2.2 Right Panel — Map View

Interactive 2D community map with the route overlaid:

| Element | Description |
|---------|-------------|
| **Waypoint markers** | Numbered pins at each waypoint location. Colour follows priority: red (critical), orange (high), blue (normal), grey (low). |
| **Route polyline** | Solid line connecting waypoints in sequence order. Colour: dark blue. |
| **Leg labels** | On hover over a polyline segment, show "~X min / Y m" estimated travel. |
| **Post markers** | Semi-transparent markers for all community posts not currently in the route. Clicking opens "Add as Waypoint" tooltip. |
| **Click-to-add** | Clicking any point on the map opens a "Add Custom Waypoint" dialog pre-populated with the clicked coordinates. |
| **Drag markers** | Waypoint markers are draggable. Dragging updates `lat`/`lng` and redraws the polyline. |

#### 2.2.3 Toolbar

| Button | Action |
|--------|--------|
| **Save** | Calls `Route/update_route` with the current waypoint array. Only enabled for `draft` routes. Disabled with tooltip for `active`/`completed`. |
| **Save & Push** | Calls `update_route` then `push_route`. Confirm dialog: "Save changes and push to {officer_name}?" |
| **Discard Changes** | Resets to last saved state. |
| **Route Info** | Displays: total distance (formatted as km/m), total estimated duration, waypoint count. |

#### 2.2.4 Read-Only Mode

For `active` and `completed` routes, the Route Builder opens in read-only mode:
- Drag handles hidden.
- Add/remove buttons hidden.
- Map markers not draggable.
- Visit status shown on each waypoint (green checkmark for visited, hollow circle for pending).
- Deviation distance shown on visited waypoints.

---

### 2.3 Route Compliance Dashboard

**Location:** Accessible from:
1. The **Compliance** column link in the Shift Details route table (Section 2.1.1).
2. A new **"Route Compliance"** tab in the Shift Details panel.

**API:** `Route/get_route_compliance`

#### 2.3.1 Summary Section

| Metric | Display | Source |
|--------|---------|--------|
| **Compliance Score** | Large circular gauge (0–100%) | `compliance_percent` |
| **Waypoints Visited** | "6 of 8" with progress bar | `visited_count` / `total_waypoints` |
| **Average Deviation** | "23 m" (with colour: green <50m, amber 50-100m, red >100m) | `avg_deviation_m` |
| **Manual Visits** | "1 manual check-in" (amber if >0) | `manual_visit_count` |
| **Route Status** | Badge (Draft/Active/Completed) | `route_status` |
| **Officer** | Name, linked to officer profile | `officer_name` |
| **Shift** | Date + time range | `shift_date` |

#### 2.3.2 Per-Waypoint Detail Table

| Column | Source | Description |
|--------|--------|-------------|
| # | `order` | Sequence number |
| Waypoint | `name` | Waypoint name |
| Priority | `priority` | Colour-coded badge |
| Planned Dwell | `planned_dwell_min` | e.g. "5 min" |
| Status | `visited` | **Visited** (green), **Skipped** (red), **Pending** (grey) |
| Visited At | `visited_on` | Timestamp, or "—" |
| GPS Deviation | `deviation_m` | Metres, or "Manual" if `is_manual`, or "—" |

**Row styling:**
- Visited rows: normal styling, green status icon.
- Skipped/unvisited rows on completed routes: red background tint, red "Skipped" badge.
- Pending rows on active routes: grey, no timestamp.

#### 2.3.3 Alert Banners

| Condition | Banner |
|-----------|--------|
| `compliance_percent < 50` on a completed route | Red banner: "Low compliance — {X}% of waypoints visited. Review with officer." |
| `manual_visit_count > 0` | Amber banner: "{X} waypoint(s) marked manually without GPS verification." |
| `avg_deviation_m > 100` | Amber banner: "Average GPS deviation exceeds 100m. Verify officer locations." |

---

### 2.4 Settings Page Extension

**Location:** Existing Settings page, new section after the existing Shift Settings block.

**API:** `Settings/get_route_settings`, `Settings/update_route_settings`

#### 2.4.1 Route Settings Panel

| Control | Type | Setting Key | Description |
|---------|------|-------------|-------------|
| **Auto-Generate Routes on Publish** | Toggle switch | `auto_generate_routes_on_publish` | "When enabled, patrol routes are automatically generated for all allocated officers when a shift is published." Default: ON. |
| **Compliance Alert Threshold** | Number input with stepper | `patrol_compliance_threshold_min` | "Minutes an officer can be overdue at a waypoint before triggering a compliance alert." Min: 5, Max: 60, Default: 15. Suffix: "minutes". |

**Save behaviour:** On change, call `Settings/update_route_settings` with the modified fields. Show success toast or error inline.

---

### 2.5 Live Tracking Map Overlay (Deferred — Phase 5.3)

The following SDS requirements (4.9.1–4.9.2) depend on the GPS Tracking module and are documented here for future reference:

- **Patrol Route Overlay:** Grey polyline for planned route; officer-coloured polyline for path already travelled.
- **Waypoint Markers on Live Map:** Numbered pins. Visited: green tick. Unvisited: hollow circle.
- **Officer Marker Colours:** Green (on route), Red (waypoint skipped), Amber (GPS stale), Blue (responding to call), Grey (off duty).
- **Officer Info Panel:** "Next Waypoint" field showing name and ETA.
- **Filter Panel:** "Patrol Routes" layer toggle to show/hide route overlays.

---

## 3. Officer Mobile App

### 3.1 Shift Details — Route Entry Point

**Location:** Existing Shift Details screen (SDS 3.11), below the shift information section.

**Condition:** Only visible when the officer has an `active` or `completed` route for this shift.

| Element | Description |
|---------|-------------|
| **"View Patrol Route" button** | Primary action button. Navigates to Active Patrol Screen. |
| **Route summary** | Inline text: "{X} waypoints, ~{Y} min estimated". |
| **Status badge** | **Active** (blue pulse animation) or **Completed** (green checkmark). |

**Push notification deep-link:** When the officer taps the `route_pushed` notification, the app opens the Shift Details screen and auto-navigates to the Active Patrol Screen.

---

### 3.2 Active Patrol Screen

**API:** `Route/get_route` (initial load + refresh)

**Layout:** Full-screen map with a collapsible bottom sheet.

#### 3.2.1 Map Layer

| Element | Description |
|---------|-------------|
| **Community map** | Base map with the community boundary polygon. |
| **Route polyline** | Solid line connecting all waypoints in sequence order. Colour: dark blue for upcoming segments, green for completed segments. |
| **Waypoint markers** | Numbered circular markers at each waypoint. Colour-coded by visit status (see 3.2.4). |
| **Officer position** | Blue pulsing dot showing the officer's current GPS location. Updated in real-time. |
| **Next waypoint highlight** | The next unvisited waypoint has a larger marker with a subtle pulsing animation and a directional arrow from the officer's position. |

#### 3.2.2 Bottom Sheet — Waypoint Checklist

A scrollable list showing all waypoints in order. The bottom sheet has two states:
- **Collapsed** (default): Shows only the next waypoint and a summary bar.
- **Expanded** (drag up): Shows the full waypoint list.

**Summary bar (collapsed state):**

```
[ Next: #3 Parking Structure B  |  ~3 min away  |  5 of 8 visited ]
```

#### 3.2.3 Waypoint List Item

Each waypoint row displays:

| Element | Description |
|---------|-------------|
| **Order number** | Circle with sequence number. Background colour = visit status colour. |
| **Waypoint name** | Bold text. Truncated with ellipsis if too long. |
| **Priority tag** | Small badge: "Critical" (red), "High" (orange), "Normal" (no badge), "Low" (grey). |
| **Mandatory badge** | If the waypoint is linked to an assigned post (`post_id` is not null and was an assigned post), show a small "Assigned" badge. |
| **Dwell time** | "Dwell: 5 min" in secondary text. |
| **ETA** | "~3 min from previous" (from `eta_from_prev_min`). Omitted for waypoint #1. |
| **Notes** | If present, expandable row showing special instructions text. |
| **Visit info** | After visit: "Visited at 09:05" with green checkmark. If deviation > 50m: "15m from location" in amber. |
| **Action button** | See Section 3.2.5. |

#### 3.2.4 Waypoint Status Colours

| Status | Marker Colour | Description |
|--------|--------------|-------------|
| **Visited** | Green | Waypoint has a `visit` record. Checkmark icon overlay. |
| **Next / In-Progress** | Blue (pulsing) | First unvisited waypoint in sequence. Larger marker. |
| **Pending** | Grey | Unvisited, not the next waypoint. Standard marker. |
| **Skipped / Overdue** | Red | Unvisited waypoint that should have been visited by now (based on cumulative ETA). Red exclamation overlay. |

**Overdue calculation (client-side):** For each unvisited waypoint, calculate the expected visit time as `route.pushed_on` + sum of all preceding `eta_from_prev_min` + sum of all preceding `dwell_time_min`. If `now > expected_time + threshold`, mark as overdue. Use the `patrol_compliance_threshold_min` from `Settings/get_route_settings` (cache on app startup).

#### 3.2.5 "Mark as Visited" Button

| State | Button | Behaviour |
|-------|--------|-----------|
| **Next waypoint, GPS available** | Large green "Mark as Visited" button | Calls `Route/visit_waypoint` with current device GPS `lat`/`lng` and `is_manual: false`. |
| **Next waypoint, GPS unavailable** | Amber "Mark as Visited (Manual)" button | Calls `visit_waypoint` with `lat: 0, lng: 0, is_manual: true`. Show confirmation: "GPS unavailable. Mark this waypoint manually?" |
| **Non-next waypoint** | Smaller secondary "Mark Visited" button | Same API call. Allows out-of-order visits. |
| **Already visited** | Disabled, shows "Visited at HH:MM" | No action. |
| **Route completed** | All buttons hidden | Show completion banner (see 3.2.7). |

#### 3.2.6 GPS Permission & Accuracy Warnings

| Condition | Display |
|-----------|---------|
| GPS permission denied | Persistent amber banner: "Location access is required for patrol tracking. Tap to enable." Links to device settings. |
| GPS accuracy > 100m | Inline warning below the Mark Visited button: "GPS accuracy is low ({X}m). Consider waiting for better signal or marking manually." |
| GPS signal lost (no update for 30s+) | Amber toast: "GPS signal lost. Waypoint visits will be recorded as manual." |

#### 3.2.7 Route Completion

When `visit_waypoint` returns `route_completed: true`:

1. Display a full-screen success overlay: "Patrol Route Completed!" with a green checkmark animation.
2. Show compliance summary: "{X} of {Y} waypoints visited".
3. "Back to Shift" button returns to the Shift Details screen.
4. The route status badge updates to **Completed**.

#### 3.2.8 Navigate to Waypoint

| Element | Description |
|---------|-------------|
| **Navigate button** | Small navigation icon on each waypoint row. |
| **Behaviour** | Deep-links to device maps app (Google Maps on Android, Apple Maps on iOS) with the waypoint coordinates as the destination. URL scheme: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` (Android) or `http://maps.apple.com/?daddr={lat},{lng}` (iOS). |

---

### 3.3 Completed Route View

When viewing a completed route (from shift history), the Active Patrol Screen opens in **read-only mode**:

- All waypoint markers show their final visit status colours.
- "Mark as Visited" buttons are hidden.
- Navigate buttons are hidden.
- Bottom sheet shows visit timestamps and deviations for each waypoint.
- Summary bar shows: "Route completed — {compliance_percent}% compliance".

---

### 3.4 Push Notification Handling

| Notification Type | Tap Action |
|-------------------|------------|
| `route_pushed` | Open the app -> Navigate to Shift Details for the shift -> Auto-open Active Patrol Screen. Payload: `{ entity_type: "route", entity_id: <route_id> }`. |
| `waypoint_skipped` | (Admin only, future) Open Route Compliance Dashboard. |

---

## 4. Component Summary

### 4.1 New Web Components

| Component | Location | Description |
|-----------|----------|-------------|
| `RouteOfficerTable` | Shift Details panel | Per-officer route status table with action buttons |
| `RouteBuilder` | Modal / page | Map sequencer with drag-and-drop waypoint editing |
| `RouteComplianceDashboard` | Shift Details tab / modal | Compliance metrics and per-waypoint detail table |
| `RouteSettingsPanel` | Settings page | Toggle + number input for route configuration |

### 4.2 New Mobile Screens

| Screen | Navigation | Description |
|--------|-----------|-------------|
| `ActivePatrolScreen` | Shift Details -> "View Patrol Route" | Full-screen map with waypoint checklist and visit actions |
| `RouteCompletionOverlay` | Auto-triggered on last visit | Success animation + compliance summary |

### 4.3 Modified Existing Components

| Component | Modification |
|-----------|-------------|
| Shift Details Panel (Web) | Add Route section below Post Assignments |
| Shift Details Screen (Mobile) | Add "View Patrol Route" button and route summary |
| Settings Page (Web) | Add Route Settings section |
| Notification Handler (Mobile) | Handle `route_pushed` deep-link to Active Patrol Screen |

---

## 5. Data Refresh Strategy

| Screen | Refresh Trigger | API Call |
|--------|----------------|----------|
| Active Patrol Screen | On mount, after each `visit_waypoint`, pull-to-refresh | `Route/get_route` |
| Route Builder | On mount, after save | `Route/get_route` |
| Route Compliance Dashboard | On mount | `Route/get_route_compliance` |
| Shift Details Route Table | On mount, after generate/push actions | `Route/get_route` per officer |
| Route Settings | On mount | `Settings/get_route_settings` |
