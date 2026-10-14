# Report Module Code Review Report

**Review Date:** 2026-10-12  
**Reviewer:** Devin (automated audit)  
**Review Criteria:** `docs/.rules/brain.md` (v2.11.0), `docs/.rules/code_review_checklist.md`

---

## Scope & Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/report.js` | API definition (12 endpoints) |
| `backend/platform/funcs/report.js` | Business logic (~2,200 lines) |
| `backend/platform/user_modules/report_pdf.js` | `$ReportPdf` — client PDF renderer (watermark, audit header/footer, template styles) |
| `backend/platform/user_modules/funcs.js` | `$Funcs` — shared helpers added for the module (`getCommunityName`, `getFileNamesByIds`, `parseJson`, `getDataItemIdsByAttr`, `getOfficerLatestLocation`) |
| `backend/platform/funcs/poi.js` | `getRelatedReports()` + `related_reports` in `get_poi_record` (Report Encounter) |
| `backend/platform/funcs/report_template.js` | Linked-report check in `delete_template`; style parsing switched to `$Funcs.parseJson` |
| `backend/platform/funcs/tracking.js` | Latest-location lookup switched to `$Funcs.getOfficerLatestLocation` |
| `backend/platform/funcs/notification.js`, `funcs/settings.js`, `api/settings.js` | `report_under_review` type → `report_under_review_enabled` toggle; `new_incident_report` → `report_delivered_enabled` |
| `backend/platform/data/report_status.json`, `report_history_action.json`, `report_pdf_image_ext.json` | New data items |
| `backend/platform/data/report_field_type.json`, `report_font.json`, `report_system_field.json`, `notification_type.json` | Attributes / items added |
| `backend/platform/definitions/errorcodes.en.js` | Report band 710–749 (rc 710, 712–714, 726–741 used by the module) |
| `backend/platform/config/runtime_config.js` | `REPORTS_LIST_PAGE_SIZE`, `REPORT_PDF_*`, `report_under_review_enabled` default |
| `backend/platform/config/using_api.js`, `using_modules.js` | Module registration |
| `db/db.sql`, `db/UpgradeDB.sql` | `incident_report`, `incident_report_section`, `incident_report_attachment`, `incident_report_history`; `IRP_POI_ID` ALTER |

---

## Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | Fixed |
| Low | 3 | Fixed |
| Informational | 6 | Documented (2 escalated to `docs/issues-questions/report-audit.md` — both resolved: keep as is) |

---

## Medium Findings (Fixed)

### 1. General-purpose helpers duplicated across modules

**Rule:** code_review_checklist §DRY — *"No general-purpose helper functions duplicated across multiple `funcs/*.js` files ... extract it into `backend/platform/user_modules/funcs.js` (`$Funcs`) and call it from all consumers"*; brain.md §DRY Principle.

**Location / duplicates found:**

| Helper in `funcs/report.js` | Duplicate | Resolution |
|---|---|---|
| `parseJson(val, fallback)` | `parseStyleJson()` in `funcs/report_template.js` | New `$Funcs.parseJson()`; both modules use it; both local copies removed |
| `getOfficerLatestLocation(userId)` | `fetchLatestLocation()` in `funcs/tracking.js` | New `$Funcs.getOfficerLatestLocation()` (same columns as the tracking version); tracking's 2 call sites switched; both local copies removed. The report module keeps a 3-line adapter (`latestLocationOf`) that maps the row to `{latitude, longitude}` |
| `idsByAttr(dataTable, attr, val)` | `user_modules/call_utils.js`, `user_modules/task_utils.js`, inline in `funcs/task.js` and `funcs/poi.js` | New `$Funcs.getDataItemIdsByAttr()`; used by `funcs/report.js` and `funcs/poi.js` (`getRelatedReports`). See Informational #5 for the remaining pre-existing copies |

**Note:** `tracking.js` now orders by `GPL_CREATED_ON DESC, GPL_ID DESC` (deterministic tie-break when two GPS points share a timestamp); the selected columns are unchanged.

---

### 2. Officer edit could race a concurrent status transition

**Rule:** code_review_checklist §Concurrent Row Processing — *"Any code that selects rows then writes based on the selection ... has a concurrency guard"*; brain.md §Concurrent Row Processing Protection.

**Location:** `funcs/report.js` → `update_report()`

**Issue:** When the template allows officer editing after submission, an officer can edit a `submitted` report. The status was checked on read only; a manager calling `start_review` between the read and the write would have let the officer overwrite content of a report already under review. (Manager edits were already protected by the review lock.)

**Before:**
```js
let err = bulkUpdateSections(record.IRP_ID, content.state, applied.changedSections, now);
...
$Db.executeQuery(
	`UPDATE \`incident_report\` SET IRP_TITLE=?, IRP_LAST_UPDATE=? WHERE IRP_ID=? AND IRP_DELETED_ON IS NULL`,
	[title, now, record.IRP_ID]);
```

**After:** the header update runs **first**, conditional on the status that was read, and the whole transaction is rolled back if no row matches:
```js
$Db.executeQuery(
	`UPDATE \`incident_report\` SET IRP_TITLE=?, IRP_LAST_UPDATE=?
	 WHERE IRP_ID=? AND IRP_STATUS=? AND IRP_DELETED_ON IS NULL`,
	[title, now, record.IRP_ID, record.IRP_STATUS]);
if ($Db.isError()) { ... }
else if ($Db.affectedRows() === 0)
{
	err = $ERRS.ERR_REPORT_CANNOT_EDIT;
}
```

**Verification:** confirmed against the MySQL driver that `affectedRows` counts *matched* rows (FOUND_ROWS), so an edit within the same second as the previous update is not misreported as a conflict.

---

## Low Findings (Fixed)

### 3. JOIN clauses not indented one tab more than `FROM`

**Rule:** brain.md §SQL conventions / devin_rules 04 — *"Indent JOINs on a new line, one tab more than the `FROM` clause"*.

**Location:** `funcs/report.js` → `fetchReportRecord()` and `get_reports_list()` (`fromClause`) — 5 JOIN lines were aligned with spaces.

**Fix:** each JOIN line now uses the `FROM` line's indentation plus one tab.

---

### 4. Data-table names passed as string literals

**Rule:** brain.md §$DataItems — data tables are referenced through `TABLE_*` constants in this codebase (no inline literals).

**Location:** `funcs/report.js` → `getCallTypeName()` (`"service_type"`, `"call_category"`) and `applyAutoPopulation()` (`"call_priority"`); `funcs/poi.js` → `getRelatedReports()` (`"report_status"` ×2).

**Fix:** added `TABLE_SERVICE_TYPE`, `TABLE_CALL_CATEGORY`, `TABLE_CALL_PRIORITY` (report.js) and `TABLE_REPORT_STATUS` (poi.js).

---

### 5. `create_report` could throw on a `null` entry in `sections`

**Rule:** code_review_checklist §Security & Best Practices — *"Validating all input parameters"*.

**Location:** `funcs/report.js` → `create_report()` — `this.$sections.map(s => ({sectionId: Number(s.section_id), ...}))` dereferenced `s` without a guard (`update_report` already used `this.$sections[i] || {}`).

**Fix:** `(s || {}).section_id` / `(s || {}).values` — an invalid entry now returns `ERR_REPORT_INVALID_SECTION` instead of an API crash.

---

## Informational (Documented)

1. **Soft-delete filters on joined tables (audit Q1 — ✅ resolved: keep).** Report reads join `community`, `report_template` and `user_details` without `*_DELETED_ON` filters on the joined tables so historical reports stay readable and fully attributed after a community/template/officer is soft-deleted. Confirmed as a **documented exception** for historical audit entities (`incident_report`, `poi_export`, `shift_history`, `call_log`); active/operational queries must still filter deleted rows — which the module does (template, call, POI, recipient and manager lookups).
2. **List response key (audit Q2 — ✅ resolved: keep).** `get_reports_list` returns the domain-specific key `reports` (with canonical `num_of_items`, `num_of_pages`), consistent with Report Template (`templates`) and the platform's other list endpoints.
3. **`CAST(? AS JSON)`** in INSERT / `CASE` statements: the `AS` keyword is part of the `CAST` syntax, not a table/column alias, so it does not conflict with the "no `AS` aliases" rule.
4. **Object-literal braces on the same line** (`let params = {`, `$Export.generate({`, `Object.assign(report, {`) and multi-line arrow callbacks follow brain.md Code Style *Exception 1* and existing module precedent (`report_template.js`, `call.js`). Control statements (`if`/`else`/`for`/`switch`/`try`/`catch`/functions/classes) all use Allman braces; all indentation uses tabs (verified by scan — 0 space-indented lines, 0 same-line control braces, 0 single-line `if` bodies).
5. **Remaining pre-existing duplicates (outside the report scope):** `idsByAttr` in `call_utils.js` / `task_utils.js` and inline in `task.js`; `buildFullName` in `asset.js`, `post_order.js`, `poi.js`, `report_template.js`, `task.js`; `resolveFileIds` in `poi.js` / `task.js`; community-name lookups in `asset.js`, `route.js`, `shift.js`. These can now be switched to `$Funcs.getDataItemIdsByAttr`, `$Funcs.getFileNamesByIds`, `$Funcs.getCommunityName`. Left untouched to keep the audit limited to the report module.
6. **Deployment order:** `POI/get_poi_record` now reads `incident_report` (`related_reports`); `db/UpgradeDB.sql` (V 7.2.0 + the `IRP_POI_ID` ALTER) must be applied before deploying this code.

---

## Addendum (2026-10-12) — Findings while adding `export_report_pdf` / `get_report_history`

### A1. Delivered PDF stored under the wrong file name (High — Fixed)

**Location:** `funcs/report.js` → `deliver_report()`

**Issue:** `$Export.generate()` returns `file_name` = the **original** export name (`incident_report_<id>_<hash>.pdf`), while the file is stored as `<file_id>.pdf` (`FIL_FILE_NAME`). `IRP_PDF_FILE_NAME` received the original name, so `pdf_url` would not have resolved to the stored file.

**Fix:** new shared `generateClientPdf()` resolves the stored name from the export `file_id` via `$Funcs.getFileNamesByIds()` (before the transaction); used by `deliver_report` and `export_report_pdf`.

### A2. Client PDF URL ignored the file access level (Medium — Fixed)

**Issue:** `pdf_url` was built with `$Files.getUrl({file_name})`, which produces a public `n/` URL even though the PDF is saved with `limited` access.

**Fix:** `getPdfUrl()` passes `access_level: limited`, producing a signed, time-limited `a/` URL for the authenticated session when `file_access_level` is enabled.

### A3. Admin queue lock indicators without per-row queries

`get_reports_list` (admin) returns `review_lock` per item from **one** batched lock read and batched names — checklist §Database Query Patterns satisfied. The initial implementation queried `entity_lock` directly (bypassing `$EntityLock`, brain.md: *"For entity locking → Use `$EntityLock`"*); escalated as `docs/issues-questions/report-audit.md` Q3 and **resolved with option (b)**: new infrastructure method `$EntityLock.checkMany(table, recordIds)` (one query, DB-clock expiry, `check()`-shaped entries), used by `get_reports_list`; `getActiveReviewLocks()` removed; documented in brain.md v2.12.0.

### A4. Convention audit of the follow-up changes

`getActiveReviewLocks`, `getPdfUrl`, `generateClientPdf`, `canResidentAccessReport`, `export_report_pdf`, `get_report_history`, the `officer_user_ids` filter, the new API definitions (`api/report.js`), `ERR_REPORT_CANNOT_EXPORT` (742) and the `pdf_regenerated` data item were re-checked against brain.md: tab indentation (0 space-indented lines), Allman braces on all control statements and functions, early-return validation, `$Const` / `TABLE_*` references (no literals), parameterized SQL with guarded `IN (...)` lists, no queries in loops, all SELECTs before `beginTransaction()`, `isError()` after every write, snake_case response fields, and all referenced error codes defined with unique rc values. No further refactor was required; A3 / audit Q3 has since been resolved (option b).

**Verification:** regression run with session-only temporary tables and an in-process `$Export` stub (no real file written): resident/admin access rules, `742` for undelivered reports, regeneration storing the container file name, `pdf_regenerated` history, batched lock indicators and the `officer_user_ids` filter — all passed.

---

## Checklist Results

### Pre-Implementation
- [x] Searched `docs/.rules/brain.md` for "CRITICAL", "loop" and "transaction" guidance
- [x] Searched existing codebase for similar patterns (Post Order snapshot, POI export, Report Template bulk inserts, Shift/Route admin scoping)
- [x] All SELECT queries identified and executed before `beginTransaction()`
- [x] All INSERT/UPDATE queries inside transactions
- [x] Bulk operations planned instead of loops

### Database Query Patterns
- [x] No `$Db.executeQuery()` inside loops — sections/attachments/history bulk-inserted; section edits via a single `UPDATE ... CASE IRS_ID`; file IDs resolved in one query; names via `$Funcs.getUserNames()`. (File reads for PDF images inside a loop are file I/O, not DB.)
- [x] All SELECTs before `beginTransaction()` — `commitStatusTransition()` and `extraWrites` callbacks only write; `$EntityLock` acquire/release (which commit on their own) are always called outside transactions
- [x] `IN (${ids.toPlaceholders()})` used for multi-ID queries; every call site guards against empty arrays
- [x] Multi-value INSERT for bulk inserts
- [x] Data prepared in memory before transactions (snapshot, state, attachment lists, history entries)

### Soft Deletion
- [x] No `DELETE FROM`
- [x] Removals via `*_DELETED_ON` (attachments soft-deleted on replacement)
- [x] Report tables filtered with `*_DELETED_ON IS NULL` (`incident_report_history` intentionally has no `DELETED_ON` — audit table); joined master tables intentionally unfiltered — confirmed historical-audit exception (Informational #1)

### Transaction Handling
- [x] Transactions contain only INSERT/UPDATE
- [x] Every INSERT/UPDATE checks `$Db.isError()`; no `isError()` after SELECTs
- [x] Rollback on every error path
- [x] Commit at the end
- [x] Status transitions conditional on the expected status with `affectedRows` check (`commitStatusTransition`, and now `update_report`)

### API Response Quality
- [x] No DB field names exposed — all responses mapped to snake_case (`report_id`, `report_section_id`, `submitted_value`, `review_lock`, ...)
- [x] Proper `$ERRS` codes; all referenced error codes defined (verified by script) with unique rc values

### Data Items & Enums
- [x] No hardcoded lookup lists — statuses, history actions, file field types (`is_file`), lock rules (`lock_on_auto`), fonts (`pdf_font`), embeddable image extensions are all `$DataItems`
- [x] Enum validation via `$DataItems.isValidItemId()`
- [x] `$DataItems.define()` in the funcs constructor (`report.js`) / `__initialize()` (`report_pdf.js`)
- [x] `$Const` references for item IDs (status subsets such as `[$Const.REPORT_STATUS_DRAFT, $Const.REPORT_STATUS_CHANGES_REQUESTED]` follow the brain.md whitelist pattern)

### API Parameter Types
- [x] Scalar IDs use `i` (`report_id`, `template_id`, `call_id`, `poi_id`); `client_user_id` is `s` (user IDs are strings)
- [x] Decimals use `d` (`latitude`, `longitude`)
- [x] `n` only for genuine number arrays (`community_ids`, `included_section_ids`)
- [x] Optional params have valid defaults; `/null/` used where "not sent" must be distinguished (`review_required`, `included_section_ids`, `latitude`, `longitude`, `sections` on create)
- [x] Array-of-objects params use `a` (`sections`), consistent with `report_template.js`

### DRY — Shared Utilities
- [x] No general-purpose helper duplicated by the report module (Finding #1)
- [x] Checked existing `funcs/*.js` and `user_modules/*.js` before adding helpers
- [x] Batch variants used (`$Funcs.getUserNames`, `$Funcs.getFileNamesByIds`)

### Concurrent Row Processing
- [x] Single-record review actions guarded by `$EntityLock` (single reviewer) plus status-conditional updates
- [x] Officer edits guarded by a status-conditional update (Finding #2)
- [x] Lock released on every exit path after acquisition (`start_review` failure, `submit_report` failure, approve / request changes / release success)
- [x] No cron / batch processing in the module

### Pagination
- [x] Page size from `$Config.get("REPORTS_LIST_PAGE_SIZE")`; no `page_size` parameter
- [x] 0-based; bounds check `page < 0 || page >= numOfPages` returns an empty list without querying
- [x] Config key present in `runtime_config.js`

### Security & Best Practices
- [x] Fully parameterized queries; sort columns from a whitelist; LIMIT/OFFSET from computed integers
- [x] Multi-value INSERTs use placeholders
- [x] Input validation (field values per type, lengths, coordinates, IDs, inclusion lists, recipient, POI, call) — null `sections` entry fixed (Finding #5)
- [x] No DB functions for JS-computable work (`CONCAT` only in a WHERE filter; `IRS_SUBMITTED_VALUES = IRS_VALUES` is a data copy)
- [x] Code style: tabs, Allman braces, codebase conventions

### Performance
- [x] Minimal queries per request (record + sections + attachments; history/lock only for admin view)
- [x] Indexed columns in WHERE clauses (`IRP_STATUS`, `IRP_COM_ID`, `IRP_OFC_USR_ID`, `IRP_CLIENT_USR_ID`, `IRP_SUBMITTED_ON`, `IRP_POI_ID`, `IRS_IRP_ID`, `IRA_IRP_ID`, `IRH_IRP_ID`)
- [x] Short transactions (PDF generation and lock handling outside)

---

## Verification

- `node --check` on all modified JS files; JSON data files parsed.
- Error codes: every `ERR_*` referenced by the report, POI, Report Template and `$Funcs` code is defined; no duplicate keys or rc values.
- Regression run (standalone infra bootstrap, session-only temporary tables — no persistent schema or data changes): `$Funcs` helpers, auto-population with the new `TABLE_*` constants, lock rules, required-field rules, title rendering, PDF rendering (watermark opacity, client-only sections), fixture insert, officer edit of a `submitted` report, and detection of a concurrent status change by the new guard — all passed. `$Funcs.getOfficerLatestLocation` verified against real `gps_log` data; `tracking.js` and `report_template.js` load correctly after the refactor.
