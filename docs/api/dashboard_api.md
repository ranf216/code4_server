# Dashboard API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Dashboard/<endpoint_name>"`.

**Access Level:** All Dashboard endpoints require **Admin** authentication. Officer and resident tokens are rejected.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

---

## Concepts

### Read-Only Aggregation

The Dashboard module is a **read-only** aggregation layer. It does not create, update, or delete any records. All endpoints return pre-computed counts, breakdowns, and recent-item feeds derived from the Calls, Tasks, Reports, Communities, and Officers operational domains.

### Community Filtering

All endpoints accept an optional `community_id` parameter to scope results to a single community. When set to `0` (the default), results span all communities visible to the authenticated admin.

If an invalid or nonexistent `community_id` is provided, the API degrades gracefully by returning zero counts and empty arrays rather than producing an error.

### Scope Toggle (`all` vs `my`)

The `get_tasks_summary` and `get_reports_summary` endpoints accept a `scope` parameter:

| Scope | Behavior |
|-------|----------|
| `all` | Returns data across all items visible to the admin (default). |
| `my` | **Tasks:** Returns only tasks assigned to the authenticated admin. **Reports:** Returns only reports where the authenticated admin is the assigned reviewer. |

An unrecognized scope value is treated as `all` (graceful degradation).

### Date-Range Filtering

The `get_calls_statistics`, `get_tasks_summary`, and `get_reports_summary` endpoints accept optional `from_date` and `to_date` parameters in `YYYY-MM-DD` format.

- **`get_calls_statistics`:** If omitted, defaults to the last 30 days.
- **`get_tasks_summary` / `get_reports_summary`:** If omitted, breakdowns cover all time. Open counts and recent items always reflect current state regardless of date filters.

### Open Statuses

"Open" statuses are dynamically resolved. The current open statuses per domain are:

| Domain | Open Statuses |
|--------|---------------|
| **Calls** | `new`, `accepted` |
| **Tasks** | `new`, `accepted`, `approved` |
| **Reports** | `submitted`, `under_review`, `changes_requested` |

### Error Handling

The Dashboard module does not define custom error codes. It relies on the platform's standard infrastructure errors:

| rc | Message | Scenario |
|----|---------|----------|
| 2 | unhandled error | An unexpected server-side failure occurred during aggregation. |
| 103 | invalid param type | A parameter was provided with the wrong type (e.g. non-integer `community_id`). |
| 113 | unauthorized | The session token is missing, expired, or does not belong to an admin user. |

---

## Endpoints

### POST Dashboard/get_overview
*Returns aggregate KPI counters and recent open items for the admin homepage dashboard. Provides a single-call operational snapshot across all five operational domains.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid admin session token. |
    | `community_id` | integer | No | `0` | Filter all counts and items to a specific community. `0` = all communities. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "active_calls_count": 7,
        "open_tasks_count": 3,
        "open_reports_count": 2,
        "active_communities_count": 12,
        "active_officers_count": 48,
        "recent_calls": [
            {
                "call_id": 17,
                "category": "security_emergency",
                "service_type": "",
                "status": "new",
                "priority": "urgent",
                "description": "Suspicious person near gate",
                "resident_name": "John Smith",
                "officer_name": "Jane Doe",
                "community_name": "Sunset Gardens",
                "created_on": "2026-10-14 08:30:00"
            }
        ],
        "recent_tasks": [
            {
                "task_id": 42,
                "title": "Supply Request",
                "type": "supply_request",
                "status": "new",
                "priority": "important",
                "description": "Office supplies needed",
                "creator_name": "John Smith",
                "assignee_name": "Jane Doe",
                "community_name": "Sunset Gardens",
                "created_on": "2026-10-13 14:00:00"
            }
        ],
        "recent_reports": [
            {
                "report_id": 5,
                "title": "Parking Lot Incident",
                "category": "security",
                "status": "submitted",
                "officer_name": "Jane Doe",
                "community_name": "Sunset Gardens",
                "created_on": "2026-10-12 16:45:00"
            }
        ]
    }
    ```

    **Counter Fields:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `active_calls_count` | number | Total calls currently in an open status. |
    | `open_tasks_count` | number | Total tasks currently in an open status. |
    | `open_reports_count` | number | Total reports currently in an open status. |
    | `active_communities_count` | number | Total active communities in the system. |
    | `active_officers_count` | number | Total active officers with an active user account. |

    **Recent Calls** (`recent_calls` — array, max 5 items, sorted by creation date descending):

    | Field | Type | Description |
    |-------|------|-------------|
    | `call_id` | number | Unique call identifier. |
    | `category` | string | Call category: `medical_emergency`, `security_emergency`, `concierge_service`, `panic`, `test`. |
    | `service_type` | string | Concierge service sub-type (empty string for emergencies). |
    | `status` | string | Current call status. |
    | `priority` | string | Call priority: `urgent`, `important`, `normal`, `low`. |
    | `description` | string | Call description text. |
    | `resident_name` | string | Full name of the resident who initiated the call. |
    | `officer_name` | string | Full name of the assigned officer (empty string if unassigned). |
    | `community_name` | string | Name of the associated community. |
    | `created_on` | string | Creation timestamp (`YYYY-MM-DD HH:mm:ss`). |

    **Recent Tasks** (`recent_tasks` — array, max 5 items, sorted by priority then creation date):

    | Field | Type | Description |
    |-------|------|-------------|
    | `task_id` | number | Unique task identifier. |
    | `title` | string | Display label derived from the task type (e.g. "Supply Request"). |
    | `type` | string | Task type key (e.g. `supply_request`). |
    | `status` | string | Current task status. |
    | `priority` | string | Task priority: `urgent`, `important`, `normal`, `low`. |
    | `description` | string | Task description text. |
    | `creator_name` | string | Full name of the user who created the task. |
    | `assignee_name` | string | Full name of the assigned user. |
    | `community_name` | string | Name of the associated community. |
    | `created_on` | string | Creation timestamp (`YYYY-MM-DD HH:mm:ss`). |

    **Recent Reports** (`recent_reports` — array, max 5 items, sorted by creation date descending):

    | Field | Type | Description |
    |-------|------|-------------|
    | `report_id` | number | Unique report identifier. |
    | `title` | string | Report title. |
    | `category` | string | Incident category. |
    | `status` | string | Current report status. |
    | `officer_name` | string | Full name of the officer who created the report. |
    | `community_name` | string | Name of the associated community. |
    | `created_on` | string | Creation timestamp (`YYYY-MM-DD HH:mm:ss`). |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 113 | unauthorized | Token is missing, expired, or non-admin. |
    | 2 | unhandled error | Unexpected server error during aggregation. |

- **Usage & Flows:**
    The primary data source for the admin homepage dashboard (SDS §4.5). The consumer app should:
    1. Call `Dashboard/get_overview` on page load to populate the five KPI summary cards and the three recent-item feeds.
    2. Use the counter values (`active_calls_count`, `open_tasks_count`, `open_reports_count`) as card headlines. The `active_communities_count` and `active_officers_count` provide organizational context.
    3. Render the `recent_calls`, `recent_tasks`, and `recent_reports` arrays as scrollable lists. Each item should include a "Select" button that navigates to the corresponding detail page using the item's ID.
    4. If the admin manages a single community, pass `community_id` to scope all data. For multi-community admins, leave it at `0` for the global view and optionally provide a community selector.
    5. Provide "Show All" buttons that navigate to the Calls, Tasks, or Reports full-list pages.

---

### POST Dashboard/get_calls_statistics
*Returns detailed call volume analytics including category breakdowns, status distributions, average response/handling times, and canceled-call metrics over a configurable date range. Powers the calls dashboard statistics panel (SDS §4.5.1.1).*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid admin session token. |
    | `community_id` | integer | No | `0` | Filter to a specific community. `0` = all communities. |
    | `from_date` | string | No | Last 30 days | Start date for the statistics window (`YYYY-MM-DD`). |
    | `to_date` | string | No | Today | End date for the statistics window (`YYYY-MM-DD`). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "total_calls": 156,
        "emergency_calls_count": 23,
        "medical_emergency_count": 12,
        "security_emergency_count": 11,
        "concierge_service_count": 98,
        "panic_count": 5,
        "test_count": 30,
        "false_emergencies_count": 3,
        "accidental_requests_count": 7,
        "calls_by_status": {
            "new": 8,
            "accepted": 15,
            "resolved": 120,
            "canceled": 13
        },
        "calls_by_category": {
            "medical_emergency": 12,
            "security_emergency": 11,
            "concierge_service": 98,
            "panic": 5,
            "test": 30
        },
        "calls_by_priority": {
            "urgent": 23,
            "important": 45,
            "normal": 80,
            "low": 8
        },
        "avg_response_time_minutes": 4.25,
        "avg_handling_time_minutes": 32.50,
        "avg_handling_time_from_assignment_minutes": 28.10,
        "recent_calls": [],
        "from_date": "2026-09-14",
        "to_date": "2026-10-14"
    }
    ```

    **Top-Level Metrics (within the date range):**

    | Field | Type | Description |
    |-------|------|-------------|
    | `total_calls` | number | Total number of calls in the date range. |
    | `emergency_calls_count` | number | Combined count of medical and security emergency calls. |
    | `medical_emergency_count` | number | Count of medical emergency calls. |
    | `security_emergency_count` | number | Count of security emergency calls. |
    | `concierge_service_count` | number | Count of concierge service calls. |
    | `panic_count` | number | Count of panic calls. |
    | `test_count` | number | Count of test calls. |
    | `false_emergencies_count` | number | Canceled emergency calls (medical + security that were canceled). |
    | `accidental_requests_count` | number | Canceled concierge service calls. |

    **Breakdowns (within the date range):**

    | Field | Type | Description |
    |-------|------|-------------|
    | `calls_by_status` | object | Call count per status key (`new`, `accepted`, `resolved`, `canceled`). |
    | `calls_by_category` | object | Call count per category key. |
    | `calls_by_priority` | object | Call count per priority key. Keys are dynamic based on data present. |

    **Time Averages (within the date range):**

    | Field | Type | Description |
    |-------|------|-------------|
    | `avg_response_time_minutes` | number or null | Average minutes from emergency call creation to officer acceptance. `null` if no qualifying calls exist. |
    | `avg_handling_time_minutes` | number or null | Average minutes from concierge call creation to resolution. `null` if no qualifying calls exist. |
    | `avg_handling_time_from_assignment_minutes` | number or null | Average minutes from officer assignment to resolution for concierge calls. `null` if no qualifying calls exist. |

    **Recent Calls & Date Metadata:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `recent_calls` | array | Up to 5 most recent currently-open calls (same structure as `get_overview`). Not date-filtered. |
    | `from_date` | string | The effective start date used (`YYYY-MM-DD`). |
    | `to_date` | string | The effective end date used (`YYYY-MM-DD`). |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 113 | unauthorized | Token is missing, expired, or non-admin. |
    | 2 | unhandled error | Unexpected server error during aggregation. |

- **Usage & Flows:**
    Powers the calls dashboard page (SDS §4.5.1.1). The consumer app should:
    1. Call this endpoint when the user navigates to the calls statistics panel.
    2. Bind a date-range picker to `from_date` and `to_date`. Provide quick-select buttons for "Today", "Last 7 Days", "Last 30 Days" (default), and "Custom Range".
    3. Render `emergency_calls_count`, `medical_emergency_count`, and `security_emergency_count` as headline metrics for the emergency section.
    4. Display `calls_by_category` as a pie or bar chart showing call volume distribution.
    5. Display `calls_by_status` as a status distribution indicator (e.g. donut chart).
    6. Show `avg_response_time_minutes` as "Avg. Emergency Response Time" and `avg_handling_time_minutes` / `avg_handling_time_from_assignment_minutes` as "Avg. Service Handling Time".
    7. Display `false_emergencies_count` and `accidental_requests_count` as canceled-call metrics.
    8. Render `recent_calls` as a scrollable list with navigation to each call's detail page.
    9. If the admin manages multiple communities, provide a community filter that passes `community_id`.

---

### POST Dashboard/get_tasks_summary
*Returns task distribution analytics including open task count, breakdowns by status and type, and a priority-sorted feed of recent open tasks. Supports scope filtering between all tasks and tasks assigned to the current admin (SDS §4.5.2).*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid admin session token. |
    | `community_id` | integer | No | `0` | Filter to a specific community. `0` = all communities. |
    | `scope` | string | No | `"all"` | `"all"` = all tasks, `"my"` = tasks assigned to the authenticated admin. |
    | `from_date` | string | No | — | Start date for status/type breakdowns (`YYYY-MM-DD`). Omit for all-time. |
    | `to_date` | string | No | — | End date for status/type breakdowns (`YYYY-MM-DD`). Omit for all-time. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "open_tasks_count": 15,
        "tasks_by_status": {
            "new": 5,
            "accepted": 7,
            "approved": 3,
            "completed": 20,
            "rejected": 2,
            "canceled": 4
        },
        "tasks_by_type": {
            "supply_request": 12,
            "patrol_check": 8,
            "lights_inspection": 6,
            "damaged_equipment": 5
        },
        "recent_tasks": [
            {
                "task_id": 42,
                "title": "Supply Request",
                "type": "supply_request",
                "status": "new",
                "priority": "urgent",
                "description": "Office supplies needed",
                "creator_name": "John Smith",
                "assignee_name": "Jane Doe",
                "community_name": "Sunset Gardens",
                "created_on": "2026-10-13 14:00:00"
            }
        ],
        "from_date": "2026-01-01",
        "to_date": "2026-10-14"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `open_tasks_count` | number | Count of tasks currently in an open status (`new`, `accepted`, `approved`). Always reflects current state, not affected by date filters. |
    | `tasks_by_status` | object | Task count per status key. Keys are dynamic based on data present. Affected by date filters when provided. |
    | `tasks_by_type` | object | Task count per task type key. Keys are dynamic based on data present. Affected by date filters when provided. |
    | `recent_tasks` | array | Up to 5 most recent open tasks sorted by priority (urgent first), then by creation date descending. Same item structure as `get_overview`. Not affected by date filters. |
    | `from_date` | string | Present only when a `from_date` was provided in the request. |
    | `to_date` | string | Present only when a `to_date` was provided in the request. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 113 | unauthorized | Token is missing, expired, or non-admin. |
    | 2 | unhandled error | Unexpected server error during aggregation. |

- **Usage & Flows:**
    Powers the tasks section of the dashboard (SDS §4.5.2). The consumer app should:
    1. Call this endpoint on load with `scope=all` to display the full tasks overview.
    2. Provide a toggle switch ("All Tasks" / "My Tasks") that re-calls the endpoint with `scope=my` to filter to tasks assigned to the current admin.
    3. Display `open_tasks_count` as the primary headline metric.
    4. Render `tasks_by_status` as a status distribution chart (e.g. donut chart). Highlight open statuses (`new`, `accepted`, `approved`) vs closed.
    5. Render `tasks_by_type` as a breakdown chart showing the volume per task category.
    6. Display `recent_tasks` as a priority-sorted list. Each item shows the `title` (derived from the task type display name), `description`, and `created_on`. Include a "Select" button to navigate to the task detail page.
    7. Provide "Show All" navigation to the full tasks management page (`Task/get_tasks_list`).
    8. Optionally bind a date-range picker to `from_date`/`to_date` to scope the status and type breakdowns to a time window.

---

### POST Dashboard/get_reports_summary
*Returns incident report queue metrics including open report count, 14-day volume, status breakdown, and a feed of recent open reports. Supports scope filtering between all reports and reports assigned to the current admin for review (SDS §4.5.5).*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid admin session token. |
    | `community_id` | integer | No | `0` | Filter to a specific community. `0` = all communities. |
    | `scope` | string | No | `"all"` | `"all"` = all reports, `"my"` = reports where the authenticated admin is the assigned reviewer. |
    | `from_date` | string | No | — | Start date for the status breakdown (`YYYY-MM-DD`). Omit for all-time. |
    | `to_date` | string | No | — | End date for the status breakdown (`YYYY-MM-DD`). Omit for all-time. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "open_reports_count": 8,
        "total_reports_last_14_days": 12,
        "reports_by_status": {
            "submitted": 4,
            "under_review": 3,
            "changes_requested": 1,
            "approved": 10,
            "delivered": 6
        },
        "recent_reports": [
            {
                "report_id": 5,
                "title": "Parking Lot Incident",
                "category": "security",
                "status": "submitted",
                "officer_name": "Jane Doe",
                "community_name": "Sunset Gardens",
                "created_on": "2026-10-12 16:45:00"
            }
        ],
        "from_date": "2026-01-01",
        "to_date": "2026-10-14"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `open_reports_count` | number | Count of reports currently in an open status (`submitted`, `under_review`, `changes_requested`). Always reflects current state, not affected by date filters. |
    | `total_reports_last_14_days` | number | Total reports created in the last 14 calendar days (all statuses). Always reflects current state. |
    | `reports_by_status` | object | Report count per status key. Keys are dynamic based on data present. Affected by date filters when provided. |
    | `recent_reports` | array | Up to 5 most recent open reports sorted by creation date descending. Same item structure as `get_overview`. Not affected by date filters. |
    | `from_date` | string | Present only when a `from_date` was provided in the request. |
    | `to_date` | string | Present only when a `to_date` was provided in the request. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 113 | unauthorized | Token is missing, expired, or non-admin. |
    | 2 | unhandled error | Unexpected server error during aggregation. |

- **Usage & Flows:**
    Powers the incident reports section of the dashboard (SDS §4.5.5). The consumer app should:
    1. Call this endpoint on load with `scope=all` to display the full reports overview.
    2. Provide a toggle switch ("All Reports" / "My Reviews") that re-calls the endpoint with `scope=my` to filter to reports where the admin is the assigned reviewer.
    3. Display `open_reports_count` and `total_reports_last_14_days` as the two headline metrics.
    4. Render `reports_by_status` as a status queue breakdown (e.g. segmented bar or donut chart). Highlight open statuses (`submitted`, `under_review`, `changes_requested`) to show the active review queue.
    5. Display `recent_reports` as a list. Each item shows the `title`, `officer_name`, and `created_on`. Include a "Select" button to navigate to the report detail page.
    6. Provide "Show All" navigation to the full reports management page (`Report/get_reports_list`).
    7. Optionally bind a date-range picker to `from_date`/`to_date` to scope the status breakdown to a time window.

---

## Testing

The Dashboard module has a dedicated test endpoint for validating all four endpoints:

```json
{
    "#request": "ApiTest/test_dashboard_apis",
    "#token": "...",
    "log_req_res": true
}
```

Setting `log_req_res` to `true` logs the full request and response JSON of every internal API call to the application log for diagnostic purposes. The test covers:

- Default (no-parameter) calls for all four endpoints.
- Community filtering with valid and invalid community IDs.
- Date-range filtering with boundary conditions (single day, future dates).
- Scope toggling (`all` vs `my`) with consistency checks.
- Response structure and field type validation.
- Cross-endpoint consistency (overview open counts vs. detail endpoint counts).
- Graceful degradation for invalid inputs.
