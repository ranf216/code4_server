# Phase 5.3 — GPS & Live Tracking: UI Updates Required

**Version:** 5.3.0
**Audience:** Frontend developers (React Web Portal, React Native Mobile App), UX designers
**SDS Reference:** 2.4.1.3.1 (Emergency ETA), 3.11 (My Shifts and Routes), 4.9.1–4.9.6 (Live Tracking)

---

## 1. Overview

This document specifies all user interface additions and modifications required across both the Web Admin Portal and the Officer/Resident Mobile App to support the GPS & Live Tracking module. All data flows are driven by the API endpoints documented in `docs/library/tracking-app-developer-guide.md`.

**Key principle:** The server provides raw telemetry data and computed status values. All visual presentation (map rendering, animations, colour assignment, unit formatting) is the client's responsibility.

---

## 2. Web Admin Portal

### 2.1 Live Tracking Dashboard (New Page)

**Location:** New top-level navigation item: **"Live Tracking"** (icon: map pin or radar). Position after "Shifts" in the main navigation menu.

**Layout:** Full-screen map workspace with a collapsible sidebar.

**API:** `Tracking/get_live_tracking` — polled at `map_refresh_interval` seconds (default: 30s, from Settings).

#### 2.1.1 Map View — Officer Markers

Display one marker per officer from the `officers` array in the response.

| Marker Element | Data Source | Description |
|----------------|------------|-------------|
| **Position** | `latitude`, `longitude` | Map pin coordinates |
| **Status ring colour** | `status` field | Colour-coded ring around the officer avatar/pin. See colour table below. |
| **Avatar** | `image` | Officer profile image inside the marker. Fall back to initials (`first_name[0] + last_name[0]`) if empty. |
| **Name label** | `first_name`, `last_name` | Shown on hover or always visible (configurable). |
| **Heading indicator** | `heading` | Optional directional arrow showing officer heading (if non-null). |

**Status colour mapping:**

| `status` Value | Ring Colour | Hex | Additional Visual |
|----------------|-------------|-----|-------------------|
| `green` | Green | `#198754` | Solid ring |
| `amber` | Amber | `#FFC107` | Dashed ring or dimmed opacity. Tooltip: "GPS signal stale — last update {last_update}" |
| `blue` | Blue | `#0D6EFD` | Pulsing animation. Badge overlay: call category icon |
| `red` | Red | `#DC3545` | Solid ring with warning icon. Tooltip: "Waypoint overdue" |
| `grey` | Grey | `#6C757D` | Semi-transparent / dimmed. Tooltip: "Off duty" |

**Marker click behaviour:** Opens the Officer Telemetry Drawer (Section 2.2).

#### 2.1.2 Map Controls & Layer Toggles

| Control | Description |
|---------|-------------|
| **Community filter** | Dropdown selector. Pass `community_id` to `get_live_tracking`. Value `0` = all communities. |
| **Status filter** | Multi-select checkboxes: Green, Amber, Blue, Red, Grey. Client-side filter on the `status` field. |
| **Layer toggles** | Toggle visibility of: Officers (on by default), Posts (from existing Asset module), Map Zones (from existing Asset module). These are separate API calls layered on the same map. |
| **Auto-refresh indicator** | Small countdown timer or spinner showing time until next poll. "Last updated: {time}" label. |
| **Refresh now** | Manual refresh button. Immediately calls `get_live_tracking`. |
| **Zoom to fit** | Button to auto-zoom the map to fit all visible officer markers. |

#### 2.1.3 Officer Summary Bar

A horizontal bar or card strip above or beside the map showing aggregate officer counts:

| Metric | Calculation | Display |
|--------|-------------|---------|
| **Total tracked** | `officers.length` | Number badge |
| **On duty** | Count where `is_checked_in === true` | Green number |
| **Stale signal** | Count where `status === "amber"` | Amber number |
| **Responding** | Count where `status === "blue"` | Blue number with call icon |
| **Overdue** | Count where `status === "red"` | Red number with warning icon |
| **Off duty** | Count where `status === "grey"` | Grey number |

---

### 2.2 Officer Telemetry Drawer

**Trigger:** Click on an officer marker in the Live Tracking Dashboard.

**Layout:** Slide-over panel from the right side of the screen (consistent with existing Shift Details and Call Details drawers).

**API:** Uses data already loaded from `get_live_tracking` for the selected officer, plus optionally `Tracking/get_officer_location` for expanded detail.

#### 2.2.1 Drawer Content

| Section | Fields | Source |
|---------|--------|--------|
| **Header** | Officer avatar, full name, community name | `image`, `first_name`, `last_name`, `community_name` |
| **Status badge** | Colour-coded status chip: "On Patrol", "Responding to Call", "Signal Stale", "Waypoint Overdue", "Off Duty" | Derived from `status` field |
| **Location** | Latitude, longitude (formatted), accuracy | `latitude`, `longitude`, `accuracy` |
| **Movement** | Speed (formatted from m/s to km/h: `speed × 3.6`), heading (as compass direction, e.g. "NW 315°") | `speed`, `heading` |
| **Last update** | Relative time (e.g. "45 seconds ago", "3 minutes ago") computed from `last_update` | `last_update` |
| **Shift info** | Shift date, start–end time. "Not on shift" if `shift_id` is null. | `shift_date`, `shift_start_time`, `shift_end_time` |
| **Active call** | Call ID and category. "No active call" if null. Link to Call Details. | `active_call_id`, `active_call_category` |

#### 2.2.2 Drawer Actions

| Button | Action |
|--------|--------|
| **View History** | Opens the Historical Breadcrumb Viewer (Section 2.3) for this officer, pre-populated with today's date and the current shift. |
| **View Route** | If the officer has an active patrol route (determined from Route module data), opens the Route Builder in read-only mode. |
| **View Call** | If `active_call_id` is non-null, navigates to the Call Details page for that call. |

---

### 2.3 Historical Breadcrumb Viewer (New Page or Modal)

**Entry point:** "View History" button in the Officer Telemetry Drawer, or a dedicated "Location History" sub-tab under the Live Tracking page.

**API:** `Tracking/get_officer_route_history`

#### 2.3.1 Filter Controls

| Control | Type | Description |
|---------|------|-------------|
| **Officer selector** | Search/dropdown | Pre-populated if opened from the Telemetry Drawer |
| **Date from** | Datetime picker | Start of time window (`YYYY-MM-DD HH:MM:SS`) |
| **Date to** | Datetime picker | End of time window |
| **Shift filter** | Dropdown | Optional shift ID filter. Populated from the officer's shift history. |
| **Load** | Button | Calls `get_officer_route_history` with the selected parameters |

#### 2.3.2 Map Display

| Element | Description |
|---------|-------------|
| **Breadcrumb polyline** | Connect `points` array in order as a coloured polyline on the map. |
| **Speed-based colouring** | Colour polyline segments based on `speed` (m/s): Stationary (speed < 0.5) = grey, Walking (0.5–2.5) = blue, Vehicle (> 2.5) = green. |
| **Waypoint nodes** | Small dots or circles at each GPS point position. |
| **Timestamp tooltip** | On hover over a waypoint node, show: time (`recorded_on`), speed, accuracy, source. |
| **Call segments** | Points where `call_id` is non-null should be highlighted (e.g. red polyline segment or distinct marker) to show when the officer was responding to a call. |
| **Start/end markers** | Distinct markers for the first and last point in the trail. |

#### 2.3.3 Timeline Playback Controls

| Control | Description |
|---------|-------------|
| **Play/Pause** | Animate a marker moving along the breadcrumb polyline at accelerated speed. |
| **Speed selector** | Playback speed: 1x, 2x, 5x, 10x. |
| **Timeline scrubber** | Horizontal slider spanning the time range. Dragging moves the animated marker to the corresponding position. |
| **Point counter** | Display: "Showing {num_of_items} points from {date_from} to {date_to}" |

#### 2.3.4 Data Export (Optional Enhancement)

| Button | Action |
|--------|--------|
| **Export CSV** | Client-side export of the `points` array as CSV with columns: recorded_on, latitude, longitude, speed, heading, accuracy, altitude, source, shift_id, call_id |
| **Export GPX** | Client-side export as GPX format for use in mapping tools |

---

### 2.4 Tracking Settings Panel

**Location:** Under the existing **System Settings** page, as a new section or tab: **"GPS & Tracking"**.

**API:** Managed through the shared Settings module (`Settings/get_settings` and `Settings/update_settings` with key `settings:gps`).

| Setting | Input Type | Unit | Default | Description |
|---------|-----------|------|---------|-------------|
| GPS Update Interval (Normal) | Number input | seconds | 30 | How often the mobile app sends GPS pings during normal patrol |
| GPS Update Interval (Emergency) | Number input | seconds | 10 | How often during active emergency response |
| GPS Stale Threshold | Number input | minutes | 2 | After this many minutes without a GPS update, officer marker turns amber |
| Location History Retention | Number input | days | 90 | GPS log entries older than this are automatically deleted |
| Map Refresh Interval | Number input | seconds | 30 | How often the Live Tracking map auto-refreshes |
| Patrol Compliance Threshold | Number input | minutes | 15 | Grace period before an unvisited waypoint triggers a red marker |
| ETA Recalculation Interval | Number input | seconds | 60 | How often the mobile app recalculates ETA during emergency response |
| Map Provider | Dropdown | — | Google Maps | Map tile provider selection |

**Save behaviour:** Calls `Settings/update_settings` with the `settings:gps` key. Show success toast on save. Changes take effect on the next API call that reads these settings.

---

## 3. Officer Mobile App

### 3.1 Background Location Service

**Trigger:** Starts when the officer checks in to a shift. Stops on shift check-out.

**API:** `Tracking/update_location` — called at the configured interval.

#### 3.1.1 GPS Permission Flow

| State | User Action | App Behaviour |
|-------|-------------|---------------|
| Permission not requested | Officer taps "Check In" | Show system permission dialog for location (iOS: "Always" / Android: "Allow all the time") |
| Permission granted | — | Start background GPS service at `gps_interval_normal` (30s) |
| Permission denied | — | Show persistent banner: "Location Services Required" with "Open Settings" link. Prevent check-in. |
| Permission revoked mid-shift | OS callback | Show alert: "Location tracking has been disabled. Your supervisor may not be able to see your position." Attempt to re-request or guide to settings. |

#### 3.1.2 GPS Status Banner

A small persistent banner at the top of the main app screen during an active shift:

| State | Banner Text | Colour |
|-------|-------------|--------|
| GPS active, recent fix | "Live Tracking Active" | Green background |
| GPS active, low accuracy (> 50m) | "GPS Signal Weak" | Amber background |
| GPS permission denied or service off | "Location Services Disabled" | Red background |
| Offline (no network) | "Offline — GPS Queued" | Grey background |

#### 3.1.3 Interval Management

| Officer State | GPS Interval | `call_id` Param |
|---------------|-------------|-----------------|
| Checked in, no active call | `gps_interval_normal` (30s) | `0` |
| Responding to accepted call | `gps_interval_emergency` (10s) | Active call ID |
| Checked out / off duty | GPS service stopped | — |

---

### 3.2 Emergency Response Navigation Widget

**Location:** Active Call screen (existing), as a new card/section below the call details.

**Trigger:** Appears when the officer has an accepted emergency call with `eta_available === true`.

**API:** `Tracking/get_call_eta` — polled at `emergency_eta_interval` seconds (default: 60s).

#### 3.2.1 Widget Layout

| Element | Data Source | Display |
|---------|------------|---------|
| **ETA headline** | `eta_min` | Large text: "~5 min" (vehicular estimate) |
| **Distance** | `distance_m` | Formatted: "2.5 km" or "450 m" based on magnitude |
| **Walking estimate** | `eta_walking_min` | Smaller text: "~30 min on foot" |
| **Officer position** | `officer_latitude`, `officer_longitude` | Blue dot on mini-map |
| **Call position** | `call_latitude`, `call_longitude` | Red pin on mini-map |
| **Call address** | `call_address` | Text below mini-map (may be null) |
| **Last GPS update** | `officer_last_update` | "Position as of {time}" |

#### 3.2.2 ETA Unavailable State

When `eta_available === false`:

| `reason` Value | User-Friendly Message |
|----------------|----------------------|
| `"call has no location coordinates"` | "Caller location not available" |
| `"no officer assigned"` | "No officer assigned to this call" |
| `"no officer location data"` | "Unable to determine your location" |

Display the message in the widget area with a muted/grey style instead of the ETA display.

#### 3.2.3 Mini-Map

A small, non-interactive map showing:
- Officer's current position (blue dot)
- Call location (red pin)
- Straight-line distance indicator between the two points (dashed line)

If the device supports it, offer a **"Navigate"** button that opens the device's native maps app (Google Maps / Apple Maps) with directions to `call_latitude, call_longitude`.

---

### 3.3 Resident Emergency Call — ETA Display

**Location:** Active Call screen for residents (existing), when the resident has an active emergency call in `accepted` status.

**API:** `Tracking/get_call_eta` — polled at `emergency_eta_interval` seconds (default: 60s).

#### 3.3.1 Display

| Element | Data Source | Display |
|---------|------------|---------|
| **ETA headline** | `eta_min` | "Officer arriving in ~5 min" |
| **Distance** | `distance_m` | "Officer is ~2.5 km away" |
| **Last update** | `officer_last_update` | "Updated {relative_time} ago" |

**Privacy note:** The resident sees the ETA and distance but does NOT see the officer's exact coordinates (`officer_latitude`/`officer_longitude` should not be displayed to residents).

#### 3.3.2 ETA Unavailable

When `eta_available === false`, show a reassuring message instead:
- "An officer is on the way. ETA is being calculated..."
- Or the specific reason if appropriate (e.g. "Waiting for officer location").

---

## 4. Unit Formatting Reference

The server returns raw values. The client is responsible for formatting:

| Field | Server Unit | Display Format |
|-------|-------------|---------------|
| `speed` | m/s | Convert to km/h: `speed × 3.6`. Display as "X.X km/h" or "Stationary" if < 0.5 m/s |
| `distance_m` | metres | If ≥ 1000: "X.X km". If < 1000: "X m" |
| `accuracy` | metres | "±X m" |
| `heading` | degrees (0–360) | Compass direction: N (337.5–22.5), NE (22.5–67.5), E (67.5–112.5), SE (112.5–157.5), S (157.5–202.5), SW (202.5–247.5), W (247.5–292.5), NW (292.5–337.5) |
| `altitude` | metres | "X m" |
| `eta_min` | minutes | "~X min" |
| `last_update` / `recorded_on` | datetime string | Relative: "Xs ago", "Xm ago", "Xh ago". Absolute on hover. |

---

## 5. Colour Palette Reference

| Status | Primary Colour | Hex | Usage |
|--------|---------------|-----|-------|
| Green (compliant) | Bootstrap Success | `#198754` | Marker ring, status badge, GPS banner |
| Amber (stale) | Bootstrap Warning | `#FFC107` | Marker ring, status badge, GPS banner |
| Blue (responding) | Bootstrap Primary | `#0D6EFD` | Marker ring, status badge, call overlay |
| Red (overdue) | Bootstrap Danger | `#DC3545` | Marker ring, status badge, alert banner |
| Grey (off duty) | Bootstrap Secondary | `#6C757D` | Marker ring, status badge, offline banner |

---

## 6. Implementation Priority

| Priority | Component | Effort | Depends On |
|----------|-----------|--------|------------|
| **P0 — Required** | Background GPS service (mobile) | Medium | OS permissions |
| **P0 — Required** | Live Tracking Dashboard (web) | Large | Map library integration |
| **P0 — Required** | Officer marker status colours | Small | `get_live_tracking` response |
| **P0 — Required** | ETA widget — officer (mobile) | Small | `get_call_eta` response |
| **P1 — High** | Officer Telemetry Drawer (web) | Medium | Live Tracking Dashboard |
| **P1 — High** | ETA display — resident (mobile) | Small | `get_call_eta` response |
| **P1 — High** | GPS Status Banner (mobile) | Small | Background GPS service |
| **P2 — Medium** | Historical Breadcrumb Viewer (web) | Large | Map library, timeline component |
| **P2 — Medium** | Tracking Settings Panel (web) | Small | Settings API |
| **P3 — Low** | Timeline playback controls | Medium | Breadcrumb Viewer |
| **P3 — Low** | CSV/GPX export | Small | Breadcrumb Viewer |
