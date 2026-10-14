# Dashboard & Analytics API — App Developer Integration Guide

**Module:** `Dashboard`
**Version:** 2.0
**Audience:** Web Admin Portal frontend developers

---

## 1. Authentication & Access Scoping

### 1.1 Token Authentication

All Dashboard API endpoints require an authenticated session. Include the session token in every request:

```
Header:  token: <session_token>
```

The token is obtained from `User/login_*` endpoints. If the token is missing or expired, the server returns `rc: 113` (no token) or `rc: 201` (invalid token).

### 1.2 Administrative Access Control

All four Dashboard endpoints are restricted to administrators only:

```
@acl: [USER_TYPE_ADMIN]
```

Officers, residents, and unauthenticated users receive `rc: 103` (`ERR_NO_PRIVILEGES`). There are no officer-facing or resident-facing dashboard endpoints.

### 1.3 Server-Side Community Scoping

Every endpoint accepts an optional `community_id` (integer) parameter:

| Value | Behavior |
|-------|----------|
| `0` (default) | Returns platform-wide aggregates across all communities |
| `> 0` | Filters all counts, breakdowns, and recent items to the specified community |

**Frontend pattern:** Multi-site administrators should present a community selector dropdown. Populate it from `Community/get_communities_list`, then pass the selected `COM_ID` as `community_id`. For platform-wide views, pass `0` or omit the parameter.

---

## 2. API Endpoint Directory

All endpoints are called as: `POST /api` with body `{"module": "Dashboard", "method": "<method_name>", ...params}`.

---

### 2.1 `Dashboard/get_overview`

Returns the homepage KPI summary cards and recent operational activity feeds.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | No | `0` | Filter to a specific community (0 = all) |

**Success Response:**

```json
{
    "rc": 0,
    "message": "success",
    "active_calls_count": 12,
    "open_tasks_count": 8,
    "open_reports_count": 3,
    "active_communities_count": 5,
    "active_officers_count": 23,
    "recent_calls": [
        {
            "call_id": 1234,
            "category": "medical_emergency",
            "service_type": "wellness_check",
            "status": "new",
            "priority": "urgent",
            "description": "Resident fell in lobby",
            "resident_name": "Jane Smith",
            "officer_name": "John Doe",
            "community_name": "Sunrise Village",
            "created_on": "2026-10-13 14:30:00"
        }
    ],
    "recent_tasks": [
        {
            "task_id": 567,
            "title": "Supply Request",
            "type": "supply_request",
            "status": "new",
            "priority": "important",
            "description": "Need replacement bulbs for parking garage",
            "creator_name": "Admin User",
            "assignee_name": "Field Officer",
            "community_name": "Sunrise Village",
            "created_on": "2026-10-13 10:15:00"
        }
    ],
    "recent_reports": [
        {
            "report_id": 89,
            "title": "Weekly Security Patrol Summary",
            "category": "security_patrol",
            "status": "submitted",
            "officer_name": "John Doe",
            "community_name": "Sunrise Village",
            "created_on": "2026-10-12 18:00:00"
        }
    ]
}
```

**Response Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `active_calls_count` | integer | Service calls in open statuses (`new`, `accepted`) |
| `open_tasks_count` | integer | Tasks in open statuses (`new`, `accepted`, `approved`) |
| `open_reports_count` | integer | Reports in open statuses (`submitted`, `under_review`, `changes_requested`) |
| `active_communities_count` | integer | Communities with `is_active = 1` |
| `active_officers_count` | integer | Officers with active user accounts (`USD_STATUS = 1`) |
| `recent_calls` | array | 5 most recent open calls, sorted by `created_on` DESC |
| `recent_tasks` | array | 5 most urgent open tasks, sorted by priority then `created_on` DESC |
| `recent_reports` | array | 5 most recent open reports, sorted by `created_on` DESC |

**Recent Task Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | integer | Task record ID |
| `title` | string | Task type display label (e.g. "Supply Request", "Lights Inspection"). Resolved from the `task_type` DataItems registry. Falls back to the raw type key if not found. |
| `type` | string | Task type key (e.g. `"supply_request"`, `"lights_inspection"`) |
| `status` | string | Current task status |
| `priority` | string | Task priority (`urgent`, `important`, `normal`, `low`) |
| `description` | string | Task description text (max 500 chars) |
| `creator_name` | string | Full name of the user who created the task |
| `assignee_name` | string | Full name of the currently assigned user |
| `community_name` | string | Community name |
| `created_on` | string | Creation datetime (`YYYY-MM-DD HH:MM:SS`) |

**Recent Call Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `call_id` | integer | Service call record ID |
| `category` | string | Call category (`medical_emergency`, `security_emergency`, `concierge_service`, `panic`, `test`) |
| `service_type` | string | Specific service type within the category (empty string if not set) |
| `status` | string | Current call status |
| `priority` | string | Call priority |
| `description` | string | Call description text |
| `resident_name` | string | Full name of the calling resident |
| `officer_name` | string | Full name of the assigned officer (empty string if unassigned) |
| `community_name` | string | Community name |
| `created_on` | string | Creation datetime |

**Recent Report Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `report_id` | integer | Incident report record ID |
| `title` | string | Report title |
| `category` | string | Report category |
| `status` | string | Current report status |
| `officer_name` | string | Full name of the reporting officer |
| `community_name` | string | Community name |
| `created_on` | string | Creation datetime |

---

### 2.2 `Dashboard/get_calls_statistics`

Returns detailed call volume analytics with configurable date range and community filtering.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | No | `0` | Filter to a specific community (0 = all) |
| `from_date` | string | No | 30 days ago | Start date (`YYYY-MM-DD`). Defaults to 30 days before today |
| `to_date` | string | No | Today | End date (`YYYY-MM-DD`). Defaults to today |

**Success Response:**

```json
{
    "rc": 0,
    "message": "success",
    "total_calls": 156,
    "emergency_calls_count": 42,
    "medical_emergency_count": 28,
    "security_emergency_count": 14,
    "concierge_service_count": 89,
    "panic_count": 5,
    "test_count": 20,
    "false_emergencies_count": 3,
    "accidental_requests_count": 7,
    "calls_by_status": {
        "new": 12,
        "accepted": 8,
        "resolved": 120,
        "canceled": 16
    },
    "calls_by_category": {
        "medical_emergency": 28,
        "security_emergency": 14,
        "concierge_service": 89,
        "panic": 5,
        "test": 20
    },
    "calls_by_priority": {
        "urgent": 15,
        "important": 30,
        "normal": 100,
        "low": 11
    },
    "avg_response_time_minutes": 4.52,
    "avg_handling_time_minutes": 32.75,
    "avg_handling_time_from_assignment_minutes": 28.10,
    "recent_calls": [ ... ],
    "from_date": "2026-09-13",
    "to_date": "2026-10-13"
}
```

**Response Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `total_calls` | integer | Total calls within the date range |
| `emergency_calls_count` | integer | Combined `medical_emergency` + `security_emergency` calls |
| `medical_emergency_count` | integer | Calls with category `medical_emergency` |
| `security_emergency_count` | integer | Calls with category `security_emergency` |
| `concierge_service_count` | integer | Calls with category `concierge_service` |
| `panic_count` | integer | Calls with category `panic` |
| `test_count` | integer | Calls with category `test` |
| `false_emergencies_count` | integer | Canceled emergency calls (status `canceled` + category in `medical_emergency`, `security_emergency`) |
| `accidental_requests_count` | integer | Canceled concierge calls (status `canceled` + category `concierge_service`) |
| `calls_by_status` | object | Map of `{status_key: count}` for all four statuses |
| `calls_by_category` | object | Map of `{category_key: count}` for all five categories |
| `calls_by_priority` | object | Map of `{priority_key: count}` from GROUP BY (only keys with data appear) |
| `avg_response_time_minutes` | number \| null | Average minutes from creation to acceptance for emergency calls. `null` if no qualifying calls exist |
| `avg_handling_time_minutes` | number \| null | Average minutes from creation to resolution for concierge calls. `null` if no qualifying calls |
| `avg_handling_time_from_assignment_minutes` | number \| null | Average minutes from acceptance to resolution for concierge calls. `null` if no qualifying calls |
| `recent_calls` | array | 5 most recent open calls (current state, not date-filtered) |
| `from_date` | string | Applied start date (`YYYY-MM-DD`) — always present |
| `to_date` | string | Applied end date (`YYYY-MM-DD`) — always present |

**Date Range Behavior:**
- When `from_date` and `to_date` are omitted, the server defaults to the last 30 days.
- The response always includes `from_date` and `to_date` reflecting the applied window.
- The date range filters `total_calls`, all category/status counts, response time averages, and priority breakdowns.
- `recent_calls` is **not** date-filtered — it always shows the 5 most recent open calls at the current moment.

**Time Averages:**
- `avg_response_time_minutes` measures **emergency call responsiveness**: average elapsed time from call creation to officer acceptance, scoped to `medical_emergency` and `security_emergency` categories where `SVC_ACCEPTED_ON` is populated.
- `avg_handling_time_minutes` measures **concierge service efficiency**: average elapsed time from call creation to resolution for `concierge_service` calls where `SVC_RESOLVED_ON` is populated.
- `avg_handling_time_from_assignment_minutes` measures the same resolution window starting from acceptance rather than creation.

---

### 2.3 `Dashboard/get_tasks_summary`

Returns task distribution analytics with scope-based filtering and optional date ranges.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | No | `0` | Filter to a specific community (0 = all) |
| `scope` | string | No | `"all"` | `"all"` = all tasks; `"my"` = tasks assigned to me (by `TSK_ASSIGNED_TO`) |
| `from_date` | string | No | `""` (all-time) | Start date for breakdowns (`YYYY-MM-DD`) |
| `to_date` | string | No | `""` (all-time) | End date for breakdowns (`YYYY-MM-DD`) |

**Success Response:**

```json
{
    "rc": 0,
    "message": "success",
    "open_tasks_count": 14,
    "tasks_by_status": {
        "new": 5,
        "accepted": 4,
        "approved": 5,
        "completed": 20,
        "rejected": 2,
        "canceled": 3
    },
    "tasks_by_type": {
        "supply_request": 12,
        "lights_inspection": 8,
        "plumbing": 5,
        "hvac": 3,
        "general_maintenance": 11
    },
    "recent_tasks": [ ... ],
    "from_date": "2026-09-01",
    "to_date": "2026-10-13"
}
```

**Response Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `open_tasks_count` | integer | Tasks currently in open statuses (`new`, `accepted`, `approved`). **Not date-filtered** — always reflects current state |
| `tasks_by_status` | object | Map of `{status_key: count}` from GROUP BY. **Date-filtered** when `from_date`/`to_date` provided |
| `tasks_by_type` | object | Map of `{type_key: count}` from GROUP BY. **Date-filtered** when `from_date`/`to_date` provided |
| `recent_tasks` | array | 5 most urgent open tasks sorted by priority then creation date. **Not date-filtered** |
| `from_date` | string | Present only when a `from_date` was supplied |
| `to_date` | string | Present only when a `to_date` was supplied |

**Scope Behavior:**
- `scope=all` (default): All tasks visible to the admin (optionally filtered by community).
- `scope=my`: Only tasks where `TSK_ASSIGNED_TO` equals the authenticated user's ID. This matches the semantics of `Task/get_tasks_list` with `scope=assigned_to_me`.

**Date Range Behavior:**
- When dates are omitted, `tasks_by_status` and `tasks_by_type` cover all-time data.
- `open_tasks_count` and `recent_tasks` always reflect current operational state regardless of date range.
- The `from_date` and `to_date` fields only appear in the response when the caller provided them.

---

### 2.4 `Dashboard/get_reports_summary`

Returns incident report review queue analytics with scope-based filtering and optional date ranges.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | No | `0` | Filter to a specific community (0 = all) |
| `scope` | string | No | `"all"` | `"all"` = all reports; `"my"` = reports where I am the assigned reviewer |
| `from_date` | string | No | `""` (all-time) | Start date for breakdowns (`YYYY-MM-DD`) |
| `to_date` | string | No | `""` (all-time) | End date for breakdowns (`YYYY-MM-DD`) |

**Success Response:**

```json
{
    "rc": 0,
    "message": "success",
    "open_reports_count": 7,
    "total_reports_last_14_days": 15,
    "reports_by_status": {
        "draft": 2,
        "submitted": 5,
        "under_review": 3,
        "changes_requested": 1,
        "approved": 8,
        "delivered": 4
    },
    "recent_reports": [ ... ],
    "from_date": "2026-09-01",
    "to_date": "2026-10-13"
}
```

**Response Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `open_reports_count` | integer | Reports currently in open statuses (`submitted`, `under_review`, `changes_requested`). **Not date-filtered** |
| `total_reports_last_14_days` | integer | Total reports created in the last 14 calendar days (rolling window). **Not date-filtered** |
| `reports_by_status` | object | Map of `{status_key: count}` from GROUP BY. **Date-filtered** when dates provided |
| `recent_reports` | array | 5 most recent open reports sorted by creation date DESC. **Not date-filtered** |
| `from_date` | string | Present only when a `from_date` was supplied |
| `to_date` | string | Present only when a `to_date` was supplied |

**Scope Behavior:**
- `scope=all` (default): All reports visible to the admin (optionally filtered by community).
- `scope=my`: Only reports where `IRP_REVIEWER_USR_ID` equals the authenticated user's ID. This targets reports where the calling admin has initiated or is holding the review (populated via `Report/start_review`). It does **not** filter by community manager assignment.

**14-Day Rolling Window:**
- `total_reports_last_14_days` always counts reports created within the last 14 calendar days from today.
- This metric is independent of `from_date`/`to_date` and always reflects current operational volume.

---

## 3. Error Handling

### 3.1 Infrastructure Errors

The Dashboard module does not define custom error codes. All errors are handled at the infrastructure level:

| RC | Constant | Cause |
|----|----------|-------|
| 103 | `ERR_NO_PRIVILEGES` | User is not an admin (wrong user type for `@acl`) |
| 113 | `ERR_NO_TOKEN_FOR_AUTHED_API_CALL` | Token header is missing |
| 201 | `ERR_INVALID_TOKEN` | Token is expired or invalid |

### 3.2 Graceful Degradation

The dashboard follows a **graceful degradation** strategy rather than returning validation errors for optional parameters:

| Input Condition | Server Behavior | Response Effect |
|----------------|----------------|-----------------|
| `community_id` is invalid / non-numeric | Parsed as `0` via `parseInt(...) \|\| 0` | Returns platform-wide data |
| `scope` is not `"all"` or `"my"` | Defaults to `"all"` via `\|\| "all"` | Returns all-scope data |
| `from_date` is empty or invalid | Calls statistics: defaults to 30 days ago. Tasks/reports: omitted = all-time | Breakdowns cover all-time or default window |
| `to_date` is empty or invalid | Calls statistics: defaults to today. Tasks/reports: omitted = all-time | Breakdowns cover all-time or default window |
| No matching data for aggregation | COUNT returns `0`; AVG returns `null` | Counts are `0`; time averages are `null`; arrays are `[]`; objects are `{}` |

---

## 4. Integration Recipes & Workflows

### 4.1 Rendering the Admin Portal Homepage

**Step 1 — Load overview data on mount:**

```js
const overview = await api("Dashboard", "get_overview", {
    community_id: selectedCommunityId || 0
});
```

**Step 2 — Render the 5 KPI summary cards:**

| Card | Value Field | Click Navigation |
|------|-------------|-----------------|
| Active Calls | `overview.active_calls_count` | Navigate to Call module list |
| Open Tasks | `overview.open_tasks_count` | Navigate to Task module list |
| Pending Reports | `overview.open_reports_count` | Navigate to Report module list |
| Communities | `overview.active_communities_count` | Navigate to Community list |
| Officers | `overview.active_officers_count` | Navigate to Officer list |

**Step 3 — Render three recent activity feeds:**

Map `overview.recent_calls`, `overview.recent_tasks`, and `overview.recent_reports` arrays into card lists or compact table rows. Each item should link to its detail view in the respective module.

For recent tasks, display `title` (the task type display label) as the card heading and `description` as the secondary text.

### 4.2 Multi-Community Filtering

**Step 1 — Populate the community selector:**

```js
const communities = await api("Community", "get_communities_list", {});
// communities.communities_list → [{ community_id, community_name, ... }, ...]
```

Build a dropdown with an "All Communities" option (value `0`) plus one entry per community.

**Step 2 — Pass the selected community to all dashboard calls:**

```js
const stats = await api("Dashboard", "get_calls_statistics", {
    community_id: selectedCommunityId,
    from_date: "2026-10-01",
    to_date: "2026-10-13"
});
```

When the user changes the community selector, re-fetch all visible dashboard panels with the updated `community_id`.

### 4.3 Global vs. "My Items" Scope Toggle

**UI pattern:** A segmented control or toggle switch with two states:

| Label | `scope` Value | Effect |
|-------|--------------|--------|
| All Operations | `"all"` | Shows all items across the platform/community |
| My Assigned Items | `"my"` | Tasks: shows only tasks assigned to me. Reports: shows only reports I am reviewing |

**Applicable endpoints:** `get_tasks_summary` and `get_reports_summary`. The `get_overview` and `get_calls_statistics` endpoints do not support `scope`.

```js
const tasks = await api("Dashboard", "get_tasks_summary", {
    community_id: selectedCommunityId,
    scope: scopeToggle   // "all" or "my"
});
```

### 4.4 Date-Range Picker Binding

**Quick-filter buttons (presets):**

| Button Label | `from_date` | `to_date` |
|-------------|-------------|-----------|
| Today | Today's date | Today's date |
| Last 7 Days | Today - 7 | Today |
| Last 30 Days | Today - 30 | Today |
| Custom Range | User-selected start | User-selected end |

**For `get_calls_statistics`:** Date range is always applied (defaults to last 30 days if omitted). Always pass `from_date` and `to_date` explicitly when using presets:

```js
const stats = await api("Dashboard", "get_calls_statistics", {
    community_id: selectedCommunityId,
    from_date: "2026-10-06",
    to_date: "2026-10-13"
});
```

**For `get_tasks_summary` and `get_reports_summary`:** Date range is optional. When omitted, status and type breakdowns cover all-time data. When provided, only `tasks_by_status`, `tasks_by_type`, and `reports_by_status` are filtered — open counts and recent items always show current state:

```js
const reports = await api("Dashboard", "get_reports_summary", {
    community_id: selectedCommunityId,
    scope: "all",
    from_date: "2026-10-01",
    to_date: "2026-10-13"
});
// reports.open_reports_count → current state (NOT filtered by date)
// reports.reports_by_status  → filtered to Oct 1–13 window
```

### 4.5 Navigating from Dashboard to Module Detail Views

Each recent item contains enough data to construct a deep link to its detail view:

| Domain | ID Field | Target Route |
|--------|---------|-------------|
| Calls | `recent_calls[].call_id` | Call detail view |
| Tasks | `recent_tasks[].task_id` | Task detail view |
| Reports | `recent_reports[].report_id` | Report detail view |

### 4.6 Handling Empty States

When no data exists for a given community/scope/date range:

| Field Type | Empty Value | Recommended UI |
|-----------|------------|---------------|
| Count fields | `0` | Display "0" with muted styling |
| Breakdown objects | `{}` | Show "No data" placeholder in charts |
| Recent arrays | `[]` | Show "No recent items" empty state card |
| Time averages | `null` | Display "—" or "N/A" |
