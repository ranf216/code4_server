# Dashboard & Analytics Module — Architectural Specification

**Module:** Phase 8.1 — Dashboard & Analytics API
**Version:** 2.0
**Last Updated:** 2026-10-14

---

## 1. Overview

The Dashboard & Analytics module is a **read-only, cross-domain aggregation layer** that computes operational KPIs, statistical breakdowns, and recent activity feeds from the platform's five core operational domains: **Call**, **Task**, **Report**, **Community**, and **User/Officer**. It introduces no new database tables, no new error codes, no transactions, and no write operations. All data is sourced exclusively from existing tables through indexed `SELECT` queries.

The module serves as the primary data source for the Admin Web Portal homepage and its domain-specific analytics panels.

### 1.1 Module Files

| File | Purpose |
|------|---------|
| `backend/platform/api/dashboard.js` | API endpoint definitions (4 endpoints) |
| `backend/platform/funcs/dashboard.js` | Business logic — read-only aggregation (661 lines) |
| `backend/platform/config/using_api.js` | Module registration (`"dashboard"`, alphabetical) |

### 1.2 Data Item Dependencies

The module defines six `$DataItems` tables in its constructor to register `$Const` references and ensure cache population:

| Table Constant | JSON File | Type | Purpose |
|----------------|-----------|------|---------|
| `TABLE_CALL_CATEGORY` | `call_category.json` | Static | `$Const.CALL_CATEGORY_*` for aggregate CASE params |
| `TABLE_CALL_STATUS` | `call_status.json` | Static | `$Const.CALL_STATUS_*` for status breakdown keys |
| `TABLE_TASK_STATUS` | `task_status.json` | Static | Open status detection via `is_open` attribute |
| `TABLE_TASK_TYPE` | `task_type.json` | DB-backed | Task display labels via `$DataItems.getItemName()` |
| `TABLE_TASK_PRIORITY` | `task_priority.json` | Static | `$Const.TASK_PRIORITY_*` for ORDER BY CASE params |
| `TABLE_REPORT_STATUS` | `report_status.json` | Static | Open status detection via `is_open` attribute |

> **Note:** `call_category`, `call_status`, and `call_priority` are also defined by `$CallUtils.__initialize()` at server startup, and `task_status` and `task_priority` by `$TaskUtils.__initialize()`. The dashboard's own `$DataItems.define()` calls are idempotent and make the module self-documenting about its data dependencies.

### 1.3 Registration

- **API:** Registered as `"dashboard"` in `backend/platform/config/using_api.js` (alphabetically between `"community"` and `"file"`).
- **No user module:** The dashboard has no corresponding `user_modules/` file — all helpers are module-scoped functions within `funcs/dashboard.js`.
- **No config keys:** The module reads no `$Config.get()` values. All operational constants (LIMIT 5, 30-day default window, 14-day report window) are implementation-level values.

---

## 2. Cross-Domain Read Architecture

### 2.1 Source Tables

The dashboard reads from six tables across five operational domains. It creates **no new tables**.

| Domain | Table | Prefix | Columns Read | Join Tables |
|--------|-------|--------|-------------|-------------|
| **Call** | `service_call` | `SVC_` | ID, category, service_type, status, priority, description, created_on, accepted_on, resolved_on, res_usr_id, ofc_usr_id, com_id, deleted_on | `user_details` (×2), `community` |
| **Task** | `task` | `TSK_` | ID, type, status, priority, description, created_on, created_by, assigned_to, com_id, deleted_on | `user_details` (×2), `community` |
| **Report** | `incident_report` | `IRP_` | ID, title, category, status, created_on, ofc_usr_id, reviewer_usr_id, com_id, deleted_on | `user_details`, `community` |
| **Community** | `community` | `COM_` | ID, name, is_active, deleted_on | — |
| **Officer/User** | `officer` + `user_details` | `OFC_`, `USD_` | OFC: usr_id, deleted_on. USD: usr_id, status, com_id, first_name, last_name, deleted_on | — |

### 2.2 Soft-Deletion Filtering

Every query includes the appropriate `*_DELETED_ON IS NULL` predicate. The dashboard never issues `DELETE FROM` statements.

| Table | Filter |
|-------|--------|
| `service_call` | `SVC_DELETED_ON IS NULL` |
| `task` | `TSK_DELETED_ON IS NULL` |
| `incident_report` | `IRP_DELETED_ON IS NULL` |
| `community` | `COM_DELETED_ON IS NULL` |
| `officer` | `OFC_DELETED_ON IS NULL` |
| `user_details` | `USD_DELETED_ON IS NULL` |

### 2.3 Community Scoping

All four endpoints accept an optional `community_id` parameter (integer, default `0`). When `community_id > 0`, the `buildCommunityCondition()` helper appends a parameterized equality condition to the query:

```js
function buildCommunityCondition(tablePrefixCol, communityId, conditions, params)
{
    if (communityId > 0)
    {
        conditions.push(`${tablePrefixCol} = ?`);
        params.push(communityId);
    }
}
```

When `community_id = 0` (default), no community filter is applied and the query returns platform-wide aggregates.

---

## 3. Dynamic Status Resolution via `$DataItems`

### 3.1 Problem: Hardcoded Status Lists (Q3)

SDS §4.5.2 originally referenced only `new` and `accepted` as open task statuses. However, `task_status.json` defines three open statuses (`new`, `accepted`, `approved` — all with `is_open: true`). Hardcoding status strings in SQL violates brain.md §$DataItems: *"Always use `$Const` references for data-item IDs — never literal strings."*

### 3.2 Solution: `buildOpenStatusCondition()`

A module-level helper dynamically resolves open statuses at query time:

```js
function buildOpenStatusCondition(statusCol, tableName, conditions, params)
{
    let openStatuses = $Funcs.getDataItemIdsByAttr(tableName, "is_open", true);
    conditions.push(`${statusCol} IN (${openStatuses.toPlaceholders()})`);
    params.push(...openStatuses);
}
```

This produces a parameterized `IN (?,?,?)` clause populated from the `is_open = true` entries in the corresponding DataItems JSON file. The pattern is applied consistently across all three status-bearing domains:

| Domain | Status Column | DataItems Table | Current Open Statuses |
|--------|--------------|-----------------|----------------------|
| Call | `SVC_STATUS` | `call_status` | `new`, `accepted` |
| Task | `TSK_STATUS` | `task_status` | `new`, `accepted`, `approved` |
| Report | `IRP_STATUS` | `report_status` | `submitted`, `under_review`, `changes_requested` |

If a status is added, removed, or reclassified in the JSON file, the dashboard queries automatically adapt — no code change required.

### 3.3 `$Const` References for Category and Status Identifiers

All data-item IDs used in SQL CASE expressions, WHERE conditions, and response object keys are referenced through `$Const.*` constants:

```js
// Aggregate CASE WHEN — parameterized, not literal strings
SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) medical_emergency_count
// ... params: [$Const.CALL_CATEGORY_MEDICAL_EMERGENCY, ...]

// Response keys — computed property names
vals.calls_by_status = {
    [$Const.CALL_STATUS_NEW]:      agg.status_new,
    [$Const.CALL_STATUS_ACCEPTED]: agg.status_accepted,
    [$Const.CALL_STATUS_RESOLVED]: agg.status_resolved,
    [$Const.CALL_STATUS_CANCELED]: agg.status_canceled,
};
```

---

## 4. Query Optimization Patterns

### 4.1 Single-Pass Aggregation

The `get_calls_statistics` endpoint computes 13 aggregate metrics (5 category counts, 4 status counts, emergency total, false emergencies, accidental requests, and total calls) in a **single table scan** using conditional `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`:

```sql
SELECT
    COUNT(*) total_calls,
    SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) medical_emergency_count,
    SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) security_emergency_count,
    ...
    SUM(CASE WHEN SVC_STATUS = ? AND SVC_CATEGORY IN (?,?) THEN 1 ELSE 0 END) false_emergencies_count,
    SUM(CASE WHEN SVC_STATUS = ? AND SVC_CATEGORY = ? THEN 1 ELSE 0 END) accidental_requests_count
FROM `service_call`
WHERE SVC_DELETED_ON IS NULL AND SVC_COM_ID = ? AND SVC_CREATED_ON >= ? AND SVC_CREATED_ON <= ?
```

All 16 CASE parameter values are `$Const` references passed as `?` placeholders (see §3.3). This eliminates 12 separate `COUNT(*)` queries.

### 4.2 GROUP BY for Dynamic Breakdowns

Tasks and reports use `GROUP BY` for status/type breakdowns, since their status sets may evolve via DataItems configuration:

```sql
SELECT TSK_STATUS, COUNT(*) cnt
FROM `task`
WHERE TSK_DELETED_ON IS NULL ...
GROUP BY TSK_STATUS
```

The result rows are iterated in JavaScript to build `{status_key: count}` maps. This pattern avoids hardcoding which statuses exist in the CASE expression.

### 4.3 JOIN-Based Name Resolution

User names are resolved via JOIN rather than N+1 queries:

```sql
FROM `task`
    JOIN `user_details` cre_ud ON TSK_CREATED_BY = cre_ud.USD_USR_ID
    JOIN `user_details` asn_ud ON TSK_ASSIGNED_TO = asn_ud.USD_USR_ID
    LEFT OUTER JOIN `community` ON TSK_COM_ID = COM_ID
```

Name concatenation is performed in JavaScript (not SQL `CONCAT`), per brain.md convention:

```js
creator_name: ((row.CRE_FIRST || "") + " " + (row.CRE_LAST || "")).trim()
```

### 4.4 Fixed LIMIT for Activity Feeds

All recent-item queries use `LIMIT 5` — a fixed implementation constant. The dashboard is not paginated (no `page` parameter, no `$Config.get("XXX_PAGE_SIZE")`) because it returns a bounded summary, not a scrollable list.

### 4.5 Priority-Weighted Ordering

Recent open tasks are sorted by business priority using a parameterized `CASE` expression in `ORDER BY`:

```js
function buildPriorityOrderSql(col)
{
    let sql = `CASE
        WHEN ${col} = ? THEN 1
        WHEN ${col} = ? THEN 2
        WHEN ${col} = ? THEN 3
        WHEN ${col} = ? THEN 4
        ELSE 5
    END`;
    let params = [
        $Const.TASK_PRIORITY_URGENT,
        $Const.TASK_PRIORITY_IMPORTANT,
        $Const.TASK_PRIORITY_NORMAL,
        $Const.TASK_PRIORITY_LOW
    ];
    return { sql, params };
}
```

The `col` argument is a trusted internal column name (never user input). The priority values are passed as `?` parameters. The secondary sort is `TSK_CREATED_ON DESC` (newest first within the same priority tier).

### 4.6 Date Calculations via `$Date`

All date computations use the infrastructure `$Date` class — no native `new Date()`:

```js
let fromDate = this.$from_date || new $Date().addDays(-30).format("Y-m-d");
let toDate   = this.$to_date   || new $Date().format("Y-m-d");
```

Date boundaries are set to full-day ranges: `fromDate + " 00:00:00"` and `toDate + " 23:59:59"`.

### 4.7 Indexed Column Usage

Queries leverage existing indexes on the source tables:

| Query Pattern | Index Used |
|--------------|-----------|
| `SVC_COM_ID = ?` | `IX_SVC_COM_ID` |
| `SVC_CREATED_ON >= ? AND <= ?` | `IX_SVC_CREATED_ON` |
| `SVC_DELETED_ON IS NULL` | Evaluated inline (no partial index) |
| `TSK_COM_ID = ?` | `IX_TSK_COM_ID` |
| `TSK_ASSIGNED_TO = ?` | `IX_TSK_ASSIGNED_TO` |
| `TSK_STATUS IN (?,?,?)` | `IX_TSK_STATUS` |
| `IRP_COM_ID = ?` | `IX_IRP_COM_ID` |

---

## 5. Endpoint Logic — Detailed

### 5.1 `Dashboard/get_overview` (Q5)

**Purpose:** Homepage KPI cards and recent activity feeds.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `community_id` | `o:i:0` | `0` | Filter to a specific community (0 = all) |

**Query Plan (8 queries):**

| # | Target | Conditions | Output |
|---|--------|-----------|--------|
| 1 | `service_call` COUNT | open status + community + soft-delete | `active_calls_count` |
| 2 | `task` COUNT | open status + community + soft-delete | `open_tasks_count` |
| 3 | `incident_report` COUNT | open status + community + soft-delete | `open_reports_count` |
| 4 | `community` COUNT | `COM_IS_ACTIVE = 1` + soft-delete + community | `active_communities_count` |
| 5 | `officer` JOIN `user_details` COUNT | `USD_STATUS = 1` + soft-delete (both) + community | `active_officers_count` |
| 6 | `service_call` + JOINs | open status + community | `recent_calls` (5 items) |
| 7 | `task` + JOINs | open status + community, ORDER BY priority CASE + created_on | `recent_tasks` (5 items) |
| 8 | `incident_report` + JOINs | open status + community | `recent_reports` (5 items) |

**Task Title Mapping (Q4):** Recent tasks include a `title` field resolved at response-mapping time:

```js
title: $DataItems.getItemName(row.TSK_TYPE, TABLE_TASK_TYPE) || row.TSK_TYPE
```

This maps the task type key (e.g. `"supply_request"`) to its display label (e.g. `"Supply Request"`) from the DB-backed `task_type` DataItems table. Falls back to the raw key if the lookup returns empty.

### 5.2 `Dashboard/get_calls_statistics` (SDS §4.5.1.1)

**Purpose:** Call volume analytics over configurable date ranges.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `community_id` | `o:i:0` | `0` | Filter to specific community |
| `from_date` | `o:s:` | Last 30 days | Start date (YYYY-MM-DD) |
| `to_date` | `o:s:` | Today | End date (YYYY-MM-DD) |

**Query Plan (4 queries):**

| # | Purpose | Key Details |
|---|---------|-------------|
| 1 | Aggregate breakdown | Single-pass SUM(CASE WHEN) — 13 metrics in one scan (see §4.1) |
| 2 | Avg response time | `AVG(TIMESTAMPDIFF(SECOND, SVC_CREATED_ON, SVC_ACCEPTED_ON))` for emergency categories |
| 3 | Avg handling time | Total (creation→resolution) and assignment (acceptance→resolution) for concierge calls |
| 4 | Priority breakdown | `GROUP BY SVC_PRIORITY` |
| 5 | Recent open calls | 5 items with JOINs (no date filter — current state) |

**TIMESTAMPDIFF Justification:** The `AVG(TIMESTAMPDIFF(...))` pattern is a legitimate database aggregation. Computing per-row time differences and averaging across potentially thousands of rows cannot be efficiently done in JavaScript without fetching all matching rows.

**Conversion to minutes:** Done in JavaScript: `Math.round((avgSec / 60) * 100) / 100` — returns `null` if no matching rows exist.

### 5.3 `Dashboard/get_tasks_summary` (Q2, Q3, Q6)

**Purpose:** Task distribution analytics with scope and date filtering.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `community_id` | `o:i:0` | `0` | Filter to specific community |
| `scope` | `o:s:all` | `"all"` | `"all"` = all tasks, `"my"` = assigned to me |
| `from_date` | `o:s:` | `""` (all-time) | Start date for breakdowns |
| `to_date` | `o:s:` | `""` (all-time) | End date for breakdowns |

**Dual-Condition Architecture (Q6):**

The endpoint maintains two condition sets:

1. **Core conditions** (no date range): Used for `open_tasks_count` and `recent_tasks` — these reflect **current operational state** regardless of date range.
2. **Date conditions** (core + date range): Used for `tasks_by_status` and `tasks_by_type` breakdowns — these reflect **historical distribution** within the selected window.

```
coreConditions = [TSK_DELETED_ON IS NULL, community?, scope?]
dateConditions = [...coreConditions, from_date?, to_date?]
```

**Scope Filtering (Q2):** When `scope = "my"`, both core and date conditions include `TSK_ASSIGNED_TO = ?` parameterized with `this.$Session.userId`. This strictly matches the SDS §4.5.2 "assigned to me" wording and aligns with `Task/get_tasks_list` where `scope="assigned_to_me"` queries the same column.

**Open Status Resolution (Q3):** Open task statuses are dynamically resolved via `buildOpenStatusCondition()`, currently producing `new`, `accepted`, `approved` from `task_status.json` `is_open = true` entries.

**Query Plan (4 queries):**

| # | Conditions Used | Output |
|---|----------------|--------|
| 1 | Core + open status | `open_tasks_count` |
| 2 | Date-filtered | `tasks_by_status` (`GROUP BY TSK_STATUS`) |
| 3 | Date-filtered | `tasks_by_type` (`GROUP BY TSK_TYPE`) |
| 4 | Core + open status | `recent_tasks` (5 items, priority-sorted) |

### 5.4 `Dashboard/get_reports_summary` (Q1, Q6)

**Purpose:** Incident report review queue analytics.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `community_id` | `o:i:0` | `0` | Filter to specific community |
| `scope` | `o:s:all` | `"all"` | `"all"` = all reports, `"my"` = where I am reviewer |
| `from_date` | `o:s:` | `""` (all-time) | Start date for breakdowns |
| `to_date` | `o:s:` | `""` (all-time) | End date for breakdowns |

**Scope Filtering (Q1):** When `scope = "my"`, conditions include `IRP_REVIEWER_USR_ID = ?` parameterized with `this.$Session.userId`. This targets reports where the calling admin is the **assigned reviewer** (populated when a manager calls `start_review`). It does NOT filter by community manager assignment.

**14-Day Rolling Window:** The `total_reports_last_14_days` metric uses a fixed 14-day lookback computed via `$Date`:

```js
let fourteenDaysAgo = new $Date().addDays(-14).format("Y-m-d") + " 00:00:00";
```

This provides a rolling operational volume indicator independent of any user-supplied date range.

**Query Plan (4 queries):**

| # | Conditions Used | Output |
|---|----------------|--------|
| 1 | Core + open status | `open_reports_count` |
| 2 | Core + 14-day lookback | `total_reports_last_14_days` |
| 3 | Date-filtered | `reports_by_status` (`GROUP BY IRP_STATUS`) |
| 4 | Core + open status | `recent_reports` (5 items) |

---

## 6. Response Mapping Convention

All response objects use clean `snake_case` keys. No database column names (e.g. `SVC_ID`, `TSK_TYPE`) are exposed. User names are concatenated in JavaScript from `USD_FIRST_NAME` + `USD_LAST_NAME` joined via the query.

### 6.1 Recent Call Object

```json
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
```

### 6.2 Recent Task Object

```json
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
```

### 6.3 Recent Report Object

```json
{
    "report_id": 89,
    "title": "Weekly Security Patrol Summary",
    "category": "security_patrol",
    "status": "submitted",
    "officer_name": "John Doe",
    "community_name": "Sunrise Village",
    "created_on": "2026-10-12 18:00:00"
}
```

---

## 7. Access Control

All four endpoints share identical ACL:

```js
"@acl": [$ACL.USER_TYPE_ADMIN]
```

Only authenticated administrators can access dashboard data. Officers and residents cannot access any dashboard endpoint. Standard infrastructure ACL enforcement applies — unauthorized access returns `rc: 103` (`ERR_NO_PRIVILEGES`).

---

## 8. Error Handling Strategy

The dashboard module uses **no custom error codes** (no rc 500+ entries). As a read-only aggregation module:

- **Invalid `community_id`:** Treated as `0` via `parseInt(...) || 0` — returns platform-wide data.
- **Invalid `scope`:** Defaults to `"all"` via `|| "all"` — returns unscoped data.
- **Invalid/empty dates:** The `buildDateRangeConditions()` helper only appends conditions when the date string is truthy. Empty or missing dates result in unfiltered queries.
- **No data:** COUNT queries return `0`; GROUP BY queries return empty result sets mapped to `{}` objects; recent-item queries return empty arrays.

Infrastructure-level errors (invalid token, no privileges, missing parameters) are handled by the framework before business logic executes.

---

## 9. Cross-Module Hooks & Integration Points

### 9.1 Read-Only Dependencies

| Module | Integration | Direction |
|--------|-------------|-----------|
| **Call** | Reads `service_call` for counts, statistics, recent items | Dashboard → Call (read) |
| **Task** | Reads `task` for counts, breakdowns, recent items | Dashboard → Task (read) |
| **Report** | Reads `incident_report` for counts, breakdowns, recent items | Dashboard → Report (read) |
| **Community** | Reads `community` for active count; uses `COM_ID` for scoping | Dashboard → Community (read) |
| **Officer** | Reads `officer` + `user_details` for active officer count | Dashboard → Officer (read) |
| **$DataItems** | Resolves open statuses, task type names, category/status/priority constants | Dashboard → Infrastructure (read) |
| **$CallUtils** | Shares `$Const.CALL_CATEGORY_*`, `$Const.CALL_STATUS_*` defined at startup | Infrastructure → Dashboard (implicit) |
| **$TaskUtils** | Shares `$Const.TASK_STATUS_*`, `$Const.TASK_PRIORITY_*` defined at startup | Infrastructure → Dashboard (implicit) |

### 9.2 No Write Dependencies

The dashboard does not:
- Insert, update, or delete any records
- Use transactions (`$Db.beginTransaction()`)
- Send notifications (`$Fcm`, `$SocketService`)
- Call other API modules via `$executeAPI`
- Lock entities via `$EntityLock`

---

## 10. Deferred Requirements

The following items from SDS §4.5 are documented in `docs/deferred_requirements/10-dashboard-enhancements.md` and are **not included** in Phase 8.1:

| # | Deferred Item | SDS Ref | Status |
|---|--------------|---------|--------|
| 1 | Advanced Call Pattern & Trend Analysis | §4.5.1.3 | Requires analytics infrastructure |
| 2 | Calls by Officer Workload | §4.5.1.1 | Data available; endpoint not built |
| 3 | Real-Time Alerts Table | §4.5.1.2 | Requires WebSocket push |
| 4 | Extended Overall Information | §4.5.3 | TBD per SDS |
| 5 | Live Tracking Map Integration | §4.5.4 | Primarily client-side; Tracking API exists |
| 6 | Calls Totals Popup Graph | §4.5.1 | Data available via `get_calls_statistics`; client-side UI |
| 7 | Tasks Totals Popup Graph | §4.5.2 | Data available via `get_tasks_summary`; client-side UI |
| 8 | Reports "All Statuses" Toggle | §4.5.5 | Minor enhancement; add `include_closed` param |

### 10.1 Related Deferred Requirement Files

| File | Relationship |
|------|-------------|
| `03-call-enhancements.md` §8 | Call statistics — **partially implemented** (basic stats done; "calls by officer" and trend analysis deferred) |
| `04-task-enhancements.md` §4 | Task dashboard widget — **fully implemented** |
| `09-report-enhancements.md` §1 | Report dashboard widget — **fully implemented** |

---

## 11. Decision Log Reference

All architectural ambiguities encountered during Phase 8.1 implementation were resolved and documented in `docs/issues-questions/dashboard-issues-questions.md`:

| Decision | Topic | Resolution |
|----------|-------|------------|
| **Q1** | Reports `scope=my` semantics | Filter by `IRP_REVIEWER_USR_ID = userId` (assigned reviewer) |
| **Q2** | Tasks `scope=my` semantics | Filter by `TSK_ASSIGNED_TO = userId` (assignee only) |
| **Q3** | Open task status set | Dynamic via `$DataItems` `is_open = true` attribute |
| **Q4** | Task "title" in recent items | Map to `task_type_name` via `$DataItems.getItemName()` |
| **Q5** | Overall information completeness | 5 counters + 3 recent feeds = complete for Phase 8.1 |
| **Q6** | Date filtering for tasks/reports | Added optional `from_date`/`to_date`; breakdowns use date range, counts/recent use current state |
