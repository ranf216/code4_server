# Dashboard Module Code Review Report

**Review Date:** 2026-10-13 (initial), 2026-10-14 (audit & refactor)
**Reviewer:** Devin (automated audit)
**Review Criteria:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`, `docs/.rules/devin_rules/03-style-guide.md`

---

## Scope & Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/dashboard.js` | API definition (4 endpoints) |
| `backend/platform/funcs/dashboard.js` | Business logic implementation |
| `backend/platform/config/using_api.js` | API registration (`"dashboard"`) |
| `docs/project_dev.md` | Phase 8 documentation |
| `docs/deferred_requirements/10-dashboard-enhancements.md` | Deferred items |
| `docs/issues-questions/dashboard-issues-questions.md` | Resolved Q&A |

---

## Audit Summary

| Severity | Count | Status |
|----------|-------|--------|
| High | 3 | Fixed |
| Medium | 1 | Fixed (prior round) |
| Informational | 2 | Documented |

---

## High Findings (Fixed in This Audit)

### 1. Native `new Date()` Instead of `$Date`

**Rule:** brain.md §$Date — all date operations must use the infrastructure `$Date` class.

**Location:** `funcs/dashboard.js` — `getDefaultFromDate()`, `getTodayDate()`, 14-day calculation in `get_reports_summary()`

**Issue:** Three helper functions/code blocks used native JavaScript `new Date()` for date arithmetic and formatting. No other funcs module in the codebase uses `new Date()`.

**Fix:** Replaced all three occurrences:
- `getDefaultFromDate()` → inlined `new $Date().addDays(-30).format("Y-m-d")`
- `getTodayDate()` → inlined `new $Date().format("Y-m-d")`
- 14-day calculation → `new $Date().addDays(-14).format("Y-m-d") + " 00:00:00"`
- Removed both helper functions (now unnecessary).

### 2. Literal Data-Item Strings in SQL and Response Objects

**Rule:** brain.md §$DataItems — "Always use `$Const` references for data-item IDs — never literal strings."

**Location:** `funcs/dashboard.js` — `get_calls_statistics()`

**Issue:** The aggregate SUM(CASE WHEN …) query used 16 literal string references for call categories (`'medical_emergency'`, `'security_emergency'`, etc.) and call statuses (`'new'`, `'accepted'`, `'resolved'`, `'canceled'`). The response objects `calls_by_status` and `calls_by_category` also used literal string keys.

Emergency/concierge WHERE conditions in the avg response time and avg handling time queries similarly used literal strings (`SVC_CATEGORY IN ('medical_emergency','security_emergency')`, `SVC_CATEGORY = 'concierge_service'`).

**Fix:** All 16+ literal strings replaced with `$Const` references:
- Aggregate CASE params: `$Const.CALL_CATEGORY_MEDICAL_EMERGENCY`, `$Const.CALL_STATUS_NEW`, etc.
- Response keys: `[$Const.CALL_STATUS_NEW]`, `[$Const.CALL_CATEGORY_MEDICAL_EMERGENCY]`, etc.
- WHERE conditions: parameterized with `$Const.CALL_CATEGORY_*` values.
- Added `$DataItems.define()` for `call_category` in constructor.

### 3. Literal Priority Strings in ORDER BY CASE

**Rule:** brain.md §$DataItems — `$Const` references for all data-item IDs.

**Location:** `funcs/dashboard.js` — module-level `PRIORITY_ORDER_SQL` constant

**Issue:** The CASE expression for priority-based ORDER BY used literal strings `'urgent'`, `'important'`, `'normal'`, `'low'`. These are data-item IDs from `task_priority.json` which has `define` values registering `$Const.TASK_PRIORITY_*`.

The constant was defined at module level where `$Const` values are not yet available (populated at runtime by `$DataItems.define()`).

**Fix:**
- Removed the module-level `PRIORITY_ORDER_SQL` constant.
- Created `buildPriorityOrderSql(col)` helper that returns `{ sql, params }` using `$Const.TASK_PRIORITY_*` references as `?`-parameterized values.
- Updated all callers to spread `priorityOrder.params` into the query parameter array.
- Added `$DataItems.define()` for `task_priority` in constructor.

---

## Medium Findings (Fixed in Prior Round)

### 1. Unused Constants

**Location:** `funcs/dashboard.js`, top-level constants (prior version)

**Issue:** Three arrays (`OPEN_CALL_STATUSES`, `OPEN_TASK_STATUSES`, `OPEN_REPORT_STATUSES`) were defined but never referenced after the dynamic `$DataItems` refactor.

**Fix:** Removed the unused constants.

---

## Informational Findings

### 1. TIMESTAMPDIFF and AVG in SQL

The `get_calls_statistics` endpoint uses `AVG(TIMESTAMPDIFF(SECOND, ...))` for response/handling time calculations. These are legitimate database aggregation operations across rows, not JS-computable single-value operations. The per-row diff → AVG aggregation cannot be efficiently computed in JavaScript without fetching all rows. The conversion from seconds to minutes is done in JavaScript.

### 2. Constructor `$DataItems.define()` Redundancy

The dashboard constructor calls `$DataItems.define()` for six tables (`call_category`, `call_status`, `task_status`, `task_type`, `task_priority`, `report_status`). Several of these are already defined at startup by `$CallUtils.__initialize()` and `$TaskUtils.__initialize()`. The redundancy is harmless (`define()` is idempotent) and makes the dashboard self-documenting about its data table dependencies.

---

## Checklist Audit

### Database Query Patterns
- [x] No `$Db.executeQuery()` inside any loop — `for...of` loops only assign result rows to response objects
- [x] No transactions used (module is read-only, all queries are SELECT)
- [x] No bulk operations needed (read-only)
- [x] `IN (${arr.toPlaceholders()})` used for open-status arrays

### Soft Deletion
- [x] No `DELETE FROM` statements
- [x] All queries filter `*_DELETED_ON IS NULL`:
  - `SVC_DELETED_ON IS NULL` — service_call queries
  - `TSK_DELETED_ON IS NULL` — task queries
  - `IRP_DELETED_ON IS NULL` — incident_report queries
  - `COM_DELETED_ON IS NULL` — community count
  - `OFC_DELETED_ON IS NULL` + `USD_DELETED_ON IS NULL` — officer count

### Transaction Handling
- [x] N/A — module is read-only (no INSERT/UPDATE/DELETE)

### API Response Quality
- [x] No database field names exposed in responses
- [x] Clean snake_case response keys (`call_id`, `category`, `status`, `resident_name`, etc.)
- [x] Name concatenation in JavaScript (not SQL CONCAT)
- [x] Task `title` resolved via `$DataItems.getItemName()`

### Data Items & Enums
- [x] Open statuses resolved dynamically via `$Funcs.getDataItemIdsByAttr(tableName, "is_open", true)`
- [x] `$DataItems.define()` called in constructor for all six data tables used
- [x] Task type display names resolved via `$DataItems.getItemName(TSK_TYPE, TABLE_TASK_TYPE)`
- [x] All data-item ID references use `$Const.*` — no literal strings in SQL or response objects
- [x] `scope` parameter is a simple toggle (`all`/`my`) — not a data-item enum

### API Parameter Types
- [x] `community_id` — `o:i:0` (optional integer, default 0) ✅
- [x] `from_date`, `to_date` — `o:s:` (optional string, default empty) ✅
- [x] `scope` — `o:s:all` (optional string, default `"all"`) ✅
- [x] `#token` — `s` ✅
- [x] No invalid type codes

### DRY — Shared Utilities
- [x] `buildOpenStatusCondition()` wraps `$Funcs.getDataItemIdsByAttr()` — consistent with `$CallUtils.openStatuses()` / `$TaskUtils.openStatuses()` pattern
- [x] `buildPriorityOrderSql()` encapsulates priority ordering with `$Const` references
- [x] `buildCommunityCondition()` / `buildDateRangeConditions()` avoid code duplication across endpoints
- [x] Response mappers (`mapRecentCallRow`, `mapRecentTaskRow`, `mapRecentReportRow`) reused across endpoints

### Concurrent Row Processing
- [x] N/A — module is read-only (no row claiming or side effects)

### Pagination
- [x] N/A — endpoints return fixed `LIMIT 5` recent items (not paginated)

### Security & Best Practices
- [x] All user-supplied values use `?` placeholders — no string interpolation of user input
- [x] Dynamic WHERE clauses built from internally generated condition arrays only
- [x] Community IDs, dates, user IDs, category IDs, status IDs all parameterized
- [x] `$Const` references used for all data-item values in CASE WHEN expressions

### Performance
- [x] `get_calls_statistics` uses a single aggregation query for category/status/emergency breakdowns
- [x] No N+1 query patterns — JOINs used for user/community names
- [x] Fixed `LIMIT 5` (no need for config-driven page size)
- [x] No queries in loops

### ACL & Access Control
- [x] All four endpoints restricted to `[$ACL.USER_TYPE_ADMIN]`
- [x] `scope=my` correctly filters by `this.$Session.userId`
- [x] Tasks "my" → `TSK_ASSIGNED_TO = userId`; Reports "my" → `IRP_REVIEWER_USR_ID = userId`

### Code Style
- [x] Tab indentation (displayed at 4-space width)
- [x] Allman-style braces — opening braces on new line
- [x] Consistent alignment in API definition file
- [x] `$Date` used for all date operations (no native `new Date()`)
- [x] Section dividers and inline comments for readability

### Syntax Check
- [x] `node --check funcs/dashboard.js` — passed ✅
- [x] `node --check api/dashboard.js` — passed ✅

---

## Audit Conflicts

No conflicting rules or functionality risks were identified. No `docs/issues-questions/dashboard-audit.md` file was needed.
