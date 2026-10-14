# Report Module — Audit Issues & Questions

**Audit Date:** 2026-10-12  
**Auditor:** Devin  
**Criteria:** `docs/.rules/brain.md` (v2.11.0), `docs/.rules/code_review_checklist.md`  
**Full review:** `docs/code-reviews/report-review.md`

The items below are conflicts between a documented rule and the current implementation where changing the code could break intended behaviour. No refactor was applied for them.

**Status (2026-10-12):** ✅ All questions resolved — Q1–Q2: current implementation kept; Q3: option (b) implemented (`$EntityLock.checkMany`).

---

## Resolved Questions (follow-up audit)

### ~~3. Batched review-lock read bypasses the `$EntityLock` API~~ ✅ Resolved — Option (b) implemented

**Code block:** `funcs/report.js` → `getActiveReviewLocks()` (used by `get_reports_list` for the admin queue lock indicators):
```js
let rows = $Db.executeQuery(
	`SELECT ENL_RECORD_ID, ENL_USR_ID, ENL_EXPIRES_ON
	 FROM \`entity_lock\`
	 WHERE ENL_TABLE=? AND ENL_RECORD_ID IN (${recordIds.toPlaceholders()}) AND ENL_EXPIRES_ON >= ?`,
	[REVIEW_LOCK_TABLE, ...recordIds, $Utils.now()]);
```

**Conflicting rules:**
- brain.md §Infrastructure Modules — *"For entity locking → Use `$EntityLock`"*; the documented read API is the single-record `$EntityLock.check(table, recordId)`.
- brain.md / code_review_checklist §Database Query Patterns — *"No `$Db.executeQuery()` inside loops"* (including helper calls inside loops). Calling `$EntityLock.check()` for each of the up-to-20 rows on a page would be a query per row.

**Why it was not changed:** both compliant alternatives change something outside the report module or remove a feature, and neither is covered by the rules:

Options:
- (a) Keep the read-only batched query in `report.js` as a documented exception (writes — acquire/release — still go exclusively through `$EntityLock`).
- (b) Add a batch method to the infrastructure module (e.g. `$EntityLock.checkMany(table, recordIds)` returning `{recordId: {is_locked, locked_by, locked_on, expires_on}}`) and switch `report.js` to it; document it in brain.md §$EntityLock.
- (c) Drop the lock fields from the list response; the queue shows only `reviewer_name` / `review_started_on`, and the live lock state is read per report via `get_report` (`review_lock`).

**Answer:** **Option (b)** — encapsulated, single query, reusable by future queue/list screens.

**Implemented:**
- `backend/platform/system_modules/entity_lock.js` → new `checkMany(table, recordIds)`: one query, record IDs normalised to strings (`ENL_RECORD_ID` is varchar), expiry evaluated with the DB clock (`NOW()`, same as `check()` and the acquire procedure), returns an entry for **every** requested ID shaped like `check()` (`{is_locked, locked_by, locked_on, expires_on}`).
- `funcs/report.js` → `getActiveReviewLocks()` removed; `get_reports_list` calls `$EntityLock.checkMany(REVIEW_LOCK_TABLE, ...)`. No direct `entity_lock` access remains in the module.
- `brain.md` (shared brain, v2.12.0) → `checkMany` added to the `$EntityLock` methods table, list-endpoint usage example, and an explicit "do not query `entity_lock` directly" rule.
- Verified with session-only temporary tables: active / missing / expired locks, duplicate IDs, empty input, parity with `check()`, and the admin queue indicators.

---

## Resolved Questions

### ~~1. JOINs without soft-delete filters on master tables~~ ✅ Resolved — Keep as is

**Code block:** `funcs/report.js` → `fetchReportRecord()` and `get_reports_list()` (`fromClause`):
```js
FROM `incident_report`
	JOIN `community` ON IRP_COM_ID = COM_ID
	JOIN `report_template` ON IRP_RPT_ID = RPT_ID
	JOIN `user_details` ON IRP_OFC_USR_ID = USD_USR_ID   -- list only
WHERE ... IRP_DELETED_ON IS NULL
```

**Conflicting rule:** brain.md §Soft Deletion Only — *"JOIN must filter deleted records"* (e.g. `... AND g.MGR_DELETED_ON IS NULL`).

**Why it was not changed:** adding `COM_DELETED_ON IS NULL`, `RPT_DELETED_ON IS NULL` and `USD_DELETED_ON IS NULL` would make reports disappear (404 / missing from lists) once their community, template or officer is soft-deleted — including delivered client reports, which must stay available for audit. Converting to `LEFT OUTER JOIN ... AND *_DELETED_ON IS NULL` would keep the rows but return `null` community / template / officer names.

Options:
- (a) Keep as is (historical integrity; documented exception).
- (b) `LEFT OUTER JOIN` with `*_DELETED_ON IS NULL` (rows kept, names `null` after deletion).
- (c) Inner JOIN with `*_DELETED_ON IS NULL` (reports of deleted entities hidden).

**Answer:** **Option (a) — Keep as is (historical integrity; documented exception).**
- Incident reports are immutable legal and operational audit artifacts (SDS §2.5.3, §4.4.7): delivered reports must remain complete and fully attributed after an officer leaves (user soft-deleted), a template is retired or a community is updated.
- Option (c) would hide historical reports (data-loss bug); option (b) would return `null` officer/community names and break PDF exports and audit logs.
- **Rule clarification:**
  - **Active / operational queries** (e.g. picking an active officer for a shift, selecting a template to draft a report) **must** enforce `*_DELETED_ON IS NULL`.
  - **Historical audit entities** (`incident_report`, `poi_export`, `shift_history`, `call_log`) are a **documented exception**: master tables are joined without soft-delete filters so historical records keep full metadata attribution.

**Code check:** the report module already follows this split — operational lookups filter deleted rows (template via `ReportTemplate/get_template`, call via `Call/get_call`, POI via `POI/get_poi_record`, recipient validation, responsible managers, `$Funcs.getCommunityName` / `getUserCommunityId`), while report reads (`fetchReportRecord`, `get_reports_list`) join master tables unfiltered.

---

### ~~2. Paginated list response key~~ ✅ Resolved — Keep `reports`

**Code block:** `funcs/report.js` → `get_reports_list()`:
```js
return {...$ERRS.ERR_SUCCESS, reports: reports, num_of_items: totalItems, num_of_pages: numOfPages};
```

**Conflicting rule:** brain.md §Page Size / §Paginated List Endpoint — the canonical pattern returns `items` (`vals.items = ...`). The Report Template module (audited 2026-10-04) uses a domain key (`templates`) with `num_of_items` / `num_of_pages`, and that audit kept it.

**Why it was not changed:** renaming the key is an API contract change; the Report Template precedent was followed for consistency between the two Phase 7 modules.

Options:
- (a) Keep `reports` (consistent with `templates` in Report Template).
- (b) Rename to `items` (brain.md canonical) — and decide whether Report Template should be aligned too.

**Answer:** **Option (a) — Keep `reports`** (domain-specific key).
- Consistent with Phase 7.1 (`ReportTemplate/get_templates_list` → `templates`).
- Matches platform precedent of domain-specific list keys (e.g. Call, Post Order, POI list endpoints).
- Self-documenting JSON for the web and mobile state stores; avoids key collisions when several paginated lists are cached.
- Pagination metadata stays canonical (`num_of_items`, `num_of_pages`).

---

## Resolved During Audit

Listed for traceability — details in `docs/code-reviews/report-review.md`.

1. **Duplicated helpers** (`parseJson`, latest GPS location, data-item IDs by attribute) moved to `$Funcs` (`parseJson`, `getOfficerLatestLocation`, `getDataItemIdsByAttr`); `report_template.js` and `tracking.js` switched to the shared helpers — code_review_checklist §DRY.
2. **Officer edit race** in `update_report` — status-conditional header update with `affectedRows` check — code_review_checklist §Concurrent Row Processing.
3. **JOIN indentation** (one tab more than `FROM`) in `fetchReportRecord()` and `get_reports_list()` — brain.md §SQL conventions.
4. **Inline data-table names** replaced with `TABLE_*` constants in `report.js` and `poi.js`.
5. **`null` entry in `create_report` `sections`** no longer throws — now `ERR_REPORT_INVALID_SECTION`.
