# Dashboard & Analytics Module — UI Updates Required

**Module:** Phase 8.1 — Dashboard & Analytics
**Version:** 2.0
**Audience:** Web Admin Portal UI/UX designers and frontend developers

---

## 1. Global Header & Filter Controls

The dashboard page requires a persistent control bar at the top of the viewport, above all widget panels. The controls affect all dashboard widgets simultaneously.

### 1.1 Community Selector

**Type:** Dropdown (single-select)
**Position:** Left side of the control bar
**Width:** 220px minimum

| Option | Value | Behavior |
|--------|-------|----------|
| "All Communities" | `community_id: 0` | Platform-wide aggregates (default) |
| `<community_name>` | `community_id: <COM_ID>` | Filters all widgets to this community |

**Data source:** Populate from `Community/get_communities_list` → `communities_list[]`. Sort alphabetically by `community_name`.

**Behavior:** On selection change, re-fetch all visible dashboard panels (`get_overview`, `get_calls_statistics`, `get_tasks_summary`, `get_reports_summary`) with the updated `community_id` value.

### 1.2 Global Date-Range Selector

**Type:** Button group (presets) + custom date-range picker
**Position:** Center of the control bar
**Applicable to:** `get_calls_statistics`, `get_tasks_summary`, `get_reports_summary`

**Preset buttons:**

| Label | `from_date` | `to_date` | Notes |
|-------|-------------|-----------|-------|
| Today | Today | Today | Single day |
| Last 7 Days | Today - 7 | Today | — |
| Last 30 Days | Today - 30 | Today | Default selection for calls statistics |
| Custom Range | User pick | User pick | Opens a dual date picker popup |

**Custom Range picker:**
- Two date input fields: "From" and "To"
- Format: `YYYY-MM-DD`
- "From" must not exceed "To"
- Apply button to confirm selection

**Interaction rules:**
- `get_calls_statistics` always uses a date range — defaults to "Last 30 Days" if nothing is selected.
- `get_tasks_summary` and `get_reports_summary` treat dates as optional — when no preset is selected, breakdowns cover all-time data. The `open_tasks_count`, `open_reports_count`, and recent item feeds always reflect current state regardless of date selection.
- `get_overview` is not affected by the date range selector.

### 1.3 Scope Toggle Switch

**Type:** Segmented control (two states)
**Position:** Right side of the control bar
**Applicable to:** `get_tasks_summary`, `get_reports_summary`

| Label | `scope` Value | Effect |
|-------|--------------|--------|
| All Operations | `"all"` | Shows all tasks / reports across the platform or selected community |
| My Assigned Items | `"my"` | Tasks: only tasks assigned to me (`TSK_ASSIGNED_TO`). Reports: only reports I am reviewing (`IRP_REVIEWER_USR_ID`) |

**Interaction rules:**
- Toggle affects both the Tasks Summary Panel and the Reports Review Queue Widget.
- `get_overview` and `get_calls_statistics` do not support scope — they always show all data.
- When the toggle changes, re-fetch `get_tasks_summary` and `get_reports_summary` with the updated `scope` value.
- Default state: "All Operations" (`scope: "all"`).

---

## 2. Main Overview Workspace (`get_overview`)

**Data source:** `Dashboard/get_overview`
**Layout:** Full-width section, displayed as the first content area below the global control bar.

### 2.1 Top KPI Summary Cards Bar

**Layout:** Horizontal row of 5 equally-sized metric cards
**Card height:** 100px
**Card spacing:** 16px gap

| # | Card Title | Value Field | Icon | Click Action |
|---|-----------|-------------|------|-------------|
| 1 | Active Calls | `active_calls_count` | Phone / Bell | Navigate to Call module list (filtered to open) |
| 2 | Open Tasks | `open_tasks_count` | Clipboard / Wrench | Navigate to Task module list (filtered to open) |
| 3 | Pending Reports | `open_reports_count` | Document / Flag | Navigate to Report module list (filtered to open) |
| 4 | Active Communities | `active_communities_count` | Building / Map Pin | Navigate to Community list |
| 5 | On-Duty Officers | `active_officers_count` | Shield / Person | Navigate to Officer list |

**Card visual design:**

| Element | Style |
|---------|-------|
| Title | 12px, uppercase, muted gray (#6C757D) |
| Value | 32px bold, primary color (#0D6EFD) |
| Icon | 24px, positioned left of value, matching card accent color |
| Background | White card with subtle shadow (0 2px 8px rgba(0,0,0,0.08)) |
| Hover | Slight elevation increase, cursor pointer |

**Card accent colors:**

| Card | Accent / Border-Left Color |
|------|---------------------------|
| Active Calls | Red (#DC3545) |
| Open Tasks | Orange (#FD7E14) |
| Pending Reports | Teal (#0DCAF0) |
| Active Communities | Green (#198754) |
| On-Duty Officers | Indigo (#6610F2) |

**Zero-state:** Display `0` with muted text styling. Do not hide the card.

### 2.2 Recent Operational Feeds Grid

**Layout:** 3-column grid below the KPI cards
**Column width:** Equal thirds
**Column spacing:** 16px gap
**Minimum column width:** 350px (collapse to stacked layout on narrow screens)

#### 2.2.1 Recent Calls Feed

**Header:** "Recent Open Calls" with call count badge
**Data source:** `get_overview` → `recent_calls[]`
**Sort order:** Newest first (`created_on` DESC)
**Max items:** 5

**Card layout (per item):**

| Element | Source Field | Style |
|---------|-------------|-------|
| Category badge | `category` | Color-coded pill (see below) |
| Priority indicator | `priority` | Colored dot or icon (see Priority Visual Encoding §2.3) |
| Description | `description` | 14px, truncate at 80 chars with ellipsis |
| Resident | `resident_name` | 12px muted |
| Officer | `officer_name` | 12px muted. Show "Unassigned" if empty string |
| Community | `community_name` | 12px muted |
| Time | `created_on` | Relative time format ("3 min ago", "2 hours ago") with full datetime tooltip |

**Category badge colors:**

| Category | Badge Color | Label |
|----------|-------------|-------|
| `medical_emergency` | Red (#DC3545) | Medical |
| `security_emergency` | Orange (#FD7E14) | Security |
| `concierge_service` | Blue (#0D6EFD) | Concierge |
| `panic` | Dark Red (#842029) | Panic |
| `test` | Gray (#6C757D) | Test |

**Click action:** Navigate to the call detail view for the selected `call_id`.

**Empty state:** Show "No open calls" with a muted checkmark icon.

#### 2.2.2 Recent Tasks Feed

**Header:** "Recent Open Tasks" with task count badge
**Data source:** `get_overview` → `recent_tasks[]`
**Sort order:** By priority (urgent first) then newest first
**Max items:** 5

**Card layout (per item):**

| Element | Source Field | Style |
|---------|-------------|-------|
| Title | `title` | 14px semi-bold. This is the task type display label (e.g. "Supply Request") |
| Priority badge | `priority` | Color-coded badge (see Priority Visual Encoding §2.3) |
| Status tag | `status` | Color-coded tag (see Task Status Encoding §2.4) |
| Description | `description` | 13px muted, truncate at 60 chars |
| Assignee | `assignee_name` | 12px muted, prefixed with "Assigned to: " |
| Community | `community_name` | 12px muted |
| Time | `created_on` | Relative time format |

**Click action:** Navigate to the task detail view for the selected `task_id`.

**Empty state:** Show "No open tasks" with a muted checkmark icon.

#### 2.2.3 Recent Reports Feed

**Header:** "Recent Open Reports" with report count badge
**Data source:** `get_overview` → `recent_reports[]`
**Sort order:** Newest first (`created_on` DESC)
**Max items:** 5

**Card layout (per item):**

| Element | Source Field | Style |
|---------|-------------|-------|
| Title | `title` | 14px semi-bold |
| Category | `category` | 13px muted |
| Status tag | `status` | Color-coded tag (see Report Status Encoding §2.5) |
| Officer | `officer_name` | 12px muted, prefixed with "Filed by: " |
| Community | `community_name` | 12px muted |
| Time | `created_on` | Relative time format |

**Click action:** Navigate to the report detail view for the selected `report_id`.

**Empty state:** Show "No open reports" with a muted checkmark icon.

### 2.3 Priority Visual Encoding

Used across calls and tasks:

| Priority | Badge Color | Icon | Sort Weight |
|----------|-------------|------|-------------|
| `urgent` | Red (#DC3545), bold text | Exclamation circle | 1 (highest) |
| `important` | Orange (#FD7E14) | Arrow up | 2 |
| `normal` | Blue (#0D6EFD) | Minus (neutral) | 3 |
| `low` | Gray (#6C757D) | Arrow down | 4 (lowest) |

### 2.4 Task Status Visual Encoding

| Status | Tag Color | Background |
|--------|-----------|------------|
| `new` | White text | Blue (#0D6EFD) |
| `accepted` | White text | Teal (#0DCAF0) |
| `approved` | White text | Indigo (#6610F2) |
| `completed` | White text | Green (#198754) |
| `rejected` | White text | Red (#DC3545) |
| `canceled` | White text | Gray (#6C757D) |

### 2.5 Report Status Visual Encoding

| Status | Tag Color | Background |
|--------|-----------|------------|
| `draft` | Dark text | Light Gray (#E9ECEF) |
| `submitted` | White text | Blue (#0D6EFD) |
| `under_review` | White text | Orange (#FD7E14) |
| `changes_requested` | White text | Yellow-Orange (#E6A817), dark text |
| `approved` | White text | Green (#198754) |
| `delivered` | White text | Teal (#0DCAF0) |

---

## 3. Domain Analytics & Summary Widgets

These panels are displayed below the Overview section. Each panel corresponds to a dedicated endpoint and provides drill-down analytics for its domain.

### 3.1 Calls Analytics Panel

**Data source:** `Dashboard/get_calls_statistics`
**Layout:** Full-width section with 3 sub-panels in a row, plus a metrics bar

#### 3.1.1 Call Metrics Summary Bar

**Layout:** Horizontal row of metric tiles above the charts
**Tile height:** 80px

| # | Metric | Source Field | Highlight |
|---|--------|-------------|-----------|
| 1 | Total Calls | `total_calls` | Large number |
| 2 | Emergency Calls | `emergency_calls_count` | Red accent |
| 3 | Avg Response Time | `avg_response_time_minutes` | Format as `X.XX min`. Show "N/A" if `null` |
| 4 | Avg Handling Time | `avg_handling_time_minutes` | Format as `X.XX min`. Show "N/A" if `null` |
| 5 | False Emergencies | `false_emergencies_count` | Yellow/warning accent |
| 6 | Accidental Requests | `accidental_requests_count` | Muted gray |

#### 3.1.2 Call Category Distribution Chart

**Type:** Pie chart or donut chart
**Data source:** `calls_by_category` object
**Segments:**

| Segment | Key | Color |
|---------|-----|-------|
| Medical Emergency | `medical_emergency` | Red (#DC3545) |
| Security Emergency | `security_emergency` | Orange (#FD7E14) |
| Concierge Service | `concierge_service` | Blue (#0D6EFD) |
| Panic | `panic` | Dark Red (#842029) |
| Test | `test` | Gray (#6C757D) |

**Interaction:** Hover to show count and percentage. Click a segment to filter the recent calls list (client-side filter).

**Empty state:** Show "No calls in this period" centered in the chart area.

#### 3.1.3 Call Status Distribution Chart

**Type:** Horizontal stacked bar chart or donut chart
**Data source:** `calls_by_status` object
**Segments:**

| Segment | Key | Color |
|---------|-----|-------|
| New | `new` | Blue (#0D6EFD) |
| Accepted | `accepted` | Teal (#0DCAF0) |
| Resolved | `resolved` | Green (#198754) |
| Canceled | `canceled` | Gray (#6C757D) |

#### 3.1.4 Call Priority Distribution Indicators

**Type:** Horizontal bar chart or stacked segments
**Data source:** `calls_by_priority` object
**Segments:** Use the Priority Visual Encoding colors from §2.3.

**Note:** Only keys present in the response appear. If no calls have a given priority, that segment is absent from `calls_by_priority`.

#### 3.1.5 Recent Open Calls List

**Type:** Compact table or card list
**Data source:** `recent_calls[]`
**Columns/fields:** Same as Overview recent calls (§2.2.1)
**Max items:** 5

**Note:** This list is **not** filtered by the date range — it always shows the current 5 most recent open calls.

#### 3.1.6 Date Range Indicator

Display the applied date window below the panel header:

```
Showing data from [from_date] to [to_date]
```

Always present for calls statistics (the server defaults to last 30 days).

---

### 3.2 Tasks Summary Panel

**Data source:** `Dashboard/get_tasks_summary`
**Layout:** Full-width section with 3 sub-panels

#### 3.2.1 Task Metrics Summary Bar

| # | Metric | Source Field | Highlight |
|---|--------|-------------|-----------|
| 1 | Open Tasks | `open_tasks_count` | Large number, orange accent |
| 2 | Scope indicator | — | Show "All Tasks" or "My Tasks" based on active scope toggle |

#### 3.2.2 Task Status Distribution Chart

**Type:** Donut chart
**Data source:** `tasks_by_status` object
**Segments:** Use the Task Status Visual Encoding colors from §2.4.

**Open/Closed grouping:** Visually group open statuses (`new`, `accepted`, `approved`) on one side and closed statuses (`completed`, `rejected`, `canceled`) on the other, or use a legend that clearly separates them.

**Interaction:** Hover to show count and percentage.

**Empty state:** Show "No tasks in this period" if the object is empty (`{}`).

#### 3.2.3 Task Type Distribution Chart

**Type:** Horizontal bar chart (sorted by count, descending)
**Data source:** `tasks_by_type` object
**Bar color:** Uniform blue (#0D6EFD)
**Label:** Display the type key. For display-friendly labels, map keys through the task type metadata obtained from `Task/get_task_metadata` → `task_types[].name`.

**Note:** Task types are DB-backed and dynamic — do not hardcode the type list. Render whatever keys appear in the response.

#### 3.2.4 Recent Open Tasks List

**Type:** Card list
**Data source:** `recent_tasks[]`
**Layout:** Same as Overview recent tasks (§2.2.2) but in a wider single-column layout.
**Sort:** By priority (urgent first) then newest first (server-side sorted).

**Note:** This list always reflects current state, not filtered by date range.

#### 3.2.5 Date Range Indicator

Display only when `from_date` and `to_date` are present in the response:

```
Status and type breakdowns filtered: [from_date] to [to_date]
Open count and recent items reflect current state
```

---

### 3.3 Reports Review Queue Widget

**Data source:** `Dashboard/get_reports_summary`
**Layout:** Full-width section with 3 sub-panels

#### 3.3.1 Report Metrics Summary Bar

| # | Metric | Source Field | Highlight |
|---|--------|-------------|-----------|
| 1 | Open Reports | `open_reports_count` | Large number, teal accent |
| 2 | Last 14 Days | `total_reports_last_14_days` | Secondary counter with "reports submitted" subtitle |
| 3 | Scope indicator | — | Show "All Reports" or "My Reviews" based on active scope toggle |

#### 3.3.2 Report Status Queue Breakdown

**Type:** Vertical stacked bar or horizontal bar chart
**Data source:** `reports_by_status` object
**Segments:** Use the Report Status Visual Encoding colors from §2.5.

**Queue progression:** The segments should visually suggest a review pipeline:

```
Draft → Submitted → Under Review → Changes Requested → Approved → Delivered
```

**Interaction:** Hover to show count and percentage.

**Empty state:** Show "No reports in this period" if the object is empty.

#### 3.3.3 Recent Open Reports List

**Type:** Card list
**Data source:** `recent_reports[]`
**Layout:** Same as Overview recent reports (§2.2.3) but in a wider single-column layout.
**Sort:** Newest first (server-side sorted).

**Note:** This list always reflects current state, not filtered by date range. Currently only shows open reports. A future enhancement (deferred item #8) will add an "All Statuses" toggle.

#### 3.3.4 Date Range Indicator

Display only when `from_date` and `to_date` are present in the response:

```
Status breakdown filtered: [from_date] to [to_date]
Open count, 14-day total, and recent items reflect current state
```

---

## 4. Responsive Layout

### 4.1 Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| >= 1200px | Full 3-column grid for recent feeds; side-by-side charts |
| 992px–1199px | 2-column grid for recent feeds; charts stack vertically within panels |
| < 992px | Single-column stacked layout; KPI cards wrap to 2-per-row |
| < 576px | Single-column; KPI cards stack vertically; charts full-width |

### 4.2 Control Bar Responsiveness

| Breakpoint | Control Bar Layout |
|-----------|-------------------|
| >= 992px | Single row: Community selector (left) / Date picker (center) / Scope toggle (right) |
| 768px–991px | Two rows: Community + Scope on first row, Date picker on second row |
| < 768px | Stacked: Each control on its own row, full-width |

---

## 5. Loading & Refresh Behavior

### 5.1 Initial Load Sequence

On dashboard page mount, issue all four API calls in parallel:

```
1. Dashboard/get_overview        (community_id)
2. Dashboard/get_calls_statistics (community_id, from_date, to_date)
3. Dashboard/get_tasks_summary    (community_id, scope)
4. Dashboard/get_reports_summary  (community_id, scope)
```

Display skeleton loading placeholders for each panel until its data arrives. Render panels independently as each response completes.

### 5.2 Filter Change Behavior

| Control Changed | Endpoints to Re-fetch |
|----------------|----------------------|
| Community selector | All 4 endpoints |
| Date range | `get_calls_statistics`, `get_tasks_summary`, `get_reports_summary` |
| Scope toggle | `get_tasks_summary`, `get_reports_summary` |

Show a subtle loading indicator (e.g. spinner overlay or opacity reduction) on the affected panels during re-fetch. Do not clear existing data — overlay the loading state to prevent layout shifts.

### 5.3 Auto-Refresh

Consider implementing a configurable auto-refresh interval (suggested: 60 seconds) for the overview KPI cards only. Show a "Last updated: X seconds ago" indicator. Provide a manual refresh button (circular arrow icon) in the section header.

---

## 6. Deferred UI Features

The following UI features are deferred and correspond to server-side deferred requirements documented in `docs/deferred_requirements/10-dashboard-enhancements.md`:

| # | Feature | Deferred Item | Server Dependency |
|---|---------|--------------|-------------------|
| 1 | Call volume trend line / time-series chart | #1 — Advanced Trend Analysis | Requires `get_calls_analytics` endpoint (not built) |
| 2 | Per-officer workload breakdown table | #2 — Calls by Officer | Requires officer grouping endpoint (not built) |
| 3 | Real-time alerts notification stream | #3 — Real-Time Alerts Table | Requires WebSocket push infrastructure |
| 4 | Live tracking map panel with officer GPS pins | #5 — Live Tracking Section | Uses existing `Tracking/get_community_officers_location`; needs map integration |
| 5 | Calls totals popup graph | #6 — Calls Totals Popup | Data available via `get_calls_statistics`; graph rendering is client-side only |
| 6 | Tasks totals popup graph | #7 — Tasks Totals Popup | Data available via `get_tasks_summary`; graph rendering is client-side only |
| 7 | Reports "All Statuses" toggle | #8 — Reports Status Toggle | Requires `include_closed` parameter on `get_reports_summary` |

**Note on items #5 and #6:** The server already returns the data needed for totals popup graphs (`calls_by_status`, `calls_by_category`, `tasks_by_status`, `tasks_by_type`). These features can be implemented client-side without any server changes — they are deferred as UI work items, not API work items.
