# Dashboard & Analytics — Issues & Questions

**Created:** 2026-10-13  
**Module:** `platform/api/dashboard.js`, `platform/funcs/dashboard.js`

---

## ~~Q1~~ — "Assigned to me" for reports: reviewer vs. community manager ✅ Resolved

**Decision:** Filter strictly by `IRP_REVIEWER_USR_ID = userId`.

**Rationale:** Incident report reviews follow a single-reviewer locking workflow backed by `$EntityLock`. A report is explicitly assigned when the manager initiates review via `start_review`, populating `IRP_REVIEWER_USR_ID`. `scope=my` returns actionable review items; `scope=all` + `community_id` covers broader community visibility.

**Implementation:** Confirmed — `scope=my` filters by `IRP_REVIEWER_USR_ID = userId`.

---

## ~~Q2~~ — Tasks "assigned to me": only assignee, or also creator? ✅ Resolved

**Decision:** Filter strictly by `TSK_ASSIGNED_TO = userId`.

**Rationale:** Strictly complies with SDS §4.5.2 ("assigned to me") and aligns with `Task/get_tasks_list` where `scope="assigned_to_me"` queries `TSK_ASSIGNED_TO = userId`.

**Implementation:** Confirmed — `scope=my` filters by `TSK_ASSIGNED_TO = userId`.

---

## ~~Q3~~ — Open task statuses: SDS vs. `task_status.json` ✅ Resolved

**Decision:** Include all `is_open = true` items dynamically via `$DataItems`.

**Rationale:** Open statuses are defined by the `is_open` attribute in the DataItems JSON files. Using `$Funcs.getDataItemIdsByAttr()` ensures the dashboard stays in sync if statuses are added or changed.

**Implementation:** Replaced all hardcoded status IN clauses with `buildOpenStatusCondition()` — a helper that calls `$Funcs.getDataItemIdsByAttr(tableName, "is_open", true)` and builds a parameterized IN clause. Applied to call, task, and report status filtering across all four endpoints.

---

## ~~Q4~~ — Tasks "Title" field in recent items ✅ Resolved

**Decision:** Map `title` to `task_type_name` (display label from `task_type` DataItems).

**Rationale:** Tasks are visually identified by their type name (e.g. "Supply Request", "Lights Inspection"). `$DataItems.getItemName(TSK_TYPE, TABLE_TASK_TYPE)` provides the display label, satisfying SDS §4.5.2 without schema changes.

**Implementation:** `mapRecentTaskRow()` now returns `title: $DataItems.getItemName(row.TSK_TYPE, TABLE_TASK_TYPE) || row.TSK_TYPE` alongside the existing `type` and `description` fields.

---

## ~~Q5~~ — "Overall information" section content ✅ Resolved

**Decision:** Confirmed complete as implemented.

**Rationale:** `get_overview` returns 5 aggregate metrics (`active_calls_count`, `open_tasks_count`, `open_reports_count`, `active_communities_count`, `active_officers_count`) plus 5 recent open items per domain. SDS §4.5.3 ("To be completed after finalizing functionality") remains TBD.

**Implementation:** No changes needed.

---

## ~~Q6~~ — Date-range filtering for tasks and reports summaries ✅ Resolved

**Decision:** Add optional `from_date` and `to_date` parameters to `get_tasks_summary` and `get_reports_summary`.

**Rationale:** Establishes architectural consistency with `get_calls_statistics`. When omitted, breakdowns cover all-time data; open counts and recent items always reflect current state regardless of date range.

**Implementation:** Added `from_date` and `to_date` (both `o:s:`) to the API definitions. In the funcs, date range applies to the by-status and by-type breakdown queries. Open counts and recent items queries use core conditions without date range (current-state queries). Applied filter metadata (`from_date`, `to_date`) is returned in the response only when provided.
