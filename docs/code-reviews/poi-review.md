# POI Module Code Review Report

**Date:** 2025-01-20
**Scope:** Convention audit and code review of the POI (Persons of Interest) module
**Governing documents:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`

---

## Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/poi.js` | API definition |
| `backend/platform/funcs/poi.js` | Business logic |
| `backend/platform/jobs/cron_poi_lifecycle_check.js` | Lifecycle cron job |
| `backend/platform/data/poi_record_type.json` | Data item: record types |
| `backend/platform/data/poi_status.json` | Data item: statuses |
| `backend/platform/data/poi_threat_level.json` | Data item: threat levels |
| `backend/platform/data/poi_gender.json` | Data item: genders |
| `backend/platform/definitions/errorcodes.en.js` | Error codes (POI section) |
| `backend/platform/config/using_api.js` | API registration |
| `backend/platform/config/runtime_config.js` | Runtime config (POI settings defaults) |
| `ecosystem.config.js` | PM2 cron registration |
| `db/db.sql` | Database schema |
| `db/UpgradeDB.sql` | Upgrade script |
| `docs/dev_flow.md` | Feature documentation |
| `docs/project_dev.md` | Project development notes |
| `docs/deferred_requirements/08-poi-enhancements.md` | Deferred items |
| `docs/issues-questions/poi-issues-questions.md` | Architectural decisions |

---

## Checklist Results

### 1. Database Query Patterns

| Check | Result | Notes |
|-------|--------|-------|
| No `$Db.executeQuery()` inside loops | **FIXED** | Cron job had `getOfficerIdsForCommunities()` called inside `for` loops in `autoExpireRecords` and `sendExpiryReminders`. Refactored to `batchFetchOfficersByCommunity()` + `resolveOfficerIds()` — single query, then map lookup in loop. |
| SELECTs before transactions | PASS | All SELECT queries (file resolution, community validation, incident validation, officer IDs) are executed before `$Db.beginTransaction()` in `create_poi_record` and `update_poi_record`. |
| Correct `toPlaceholders()` for IN clauses | **FIXED** | Cron FCM device query used `.map(() => "?").join(",")` instead of `.toPlaceholders()`. Fixed. |
| Bulk multi-value INSERTs | PASS | `insertPhotos`, `insertSites`, `insertIncidents` all use multi-value INSERT with parameterized placeholders. |
| Prepared maps/arrays before transactions | PASS | `resolveFileIds()`, `validateCommunityIds()`, `validateIncidentIds()` all run before transaction blocks. |

### 2. Soft Deletion

| Check | Result | Notes |
|-------|--------|-------|
| No `DELETE FROM` statements | PASS | All deletions use `SET *_DELETED_ON=?` pattern. |
| Soft-delete columns updated | PASS | `softDeletePhotos`, `softDeleteSites`, `softDeleteIncidents` use `SET *_DELETED_ON=?`. |
| Queries filter `*_DELETED_ON IS NULL` | PASS | All SELECT and UPDATE queries include `*_DELETED_ON IS NULL` where applicable. `poi_export` and `poi_view` correctly have no soft-delete (audit/tracking tables). |

### 3. Transactions

| Check | Result | Notes |
|-------|--------|-------|
| Mutations check `$Db.isError()` | PASS | All INSERT/UPDATE calls are followed by `$Db.isError()` checks. |
| Rollback on errors | PASS | All transaction blocks have consistent `$Db.rollbackTransaction()` on error paths. |
| Commit at the end | PASS | All transaction blocks end with `$Db.commitTransaction()`. |
| No SELECTs inside transaction blocks | PASS | Transaction blocks in `create_poi_record` and `update_poi_record` contain only INSERT/UPDATE operations. |

### 4. API Response Quality

| Check | Result | Notes |
|-------|--------|-------|
| No raw DB column names in responses | PASS | All DB columns (e.g. `POI_ID`, `POI_RECORD_TYPE`) are mapped to snake_case names (`record_id`, `record_type`). |
| Snake_case response property names | PASS | All response properties use snake_case: `record_id`, `full_name`, `threat_level_name`, `photo_url`, `view_badge`, etc. |
| Correct error-code usage | PASS | All POI-specific errors use `$ERRS.ERR_POI_*` codes. DB errors use `$Err.DBError()`. Generic validation uses `$ERRS.ERR_INVALID_API_PARAM`. |

### 5. Data Items & Enums

| Check | Result | Notes |
|-------|--------|-------|
| No hardcoded lookup arrays | **FIXED** | Cron job used literal strings (`'active'`, `'expired'`, etc.) instead of `$Const.POI_STATUS_*`. All replaced with `$Const` references. |
| `$DataItems.isValidItemId()` for validation | PASS | Used for `record_type`, `threat_level`, `status`, `gender` validation in create and update. |
| `$DataItems.define()` in constructor | PASS | All four data tables defined in the class constructor (lines 431–434). |
| `$DataItems.define()` at cron startup | **FIXED** | Cron had `$DataItems.define("poi_record_type")` inside `getRecordTypeName()` (called repeatedly). Moved to startup after `initStandAlone()`. Added `$DataItems.define("poi_status")` for the `$Const.POI_STATUS_*` references. |

### 6. API Parameters

| Check | Result | Notes |
|-------|--------|-------|
| Correct scalar types (`i`, `s`, `b`) | PASS | All scalar params use correct types: `i` for IDs/integers, `s` for strings, `b` for booleans. |
| Correct array types (`n`) | PASS | `community_ids`, `photo_file_ids`, `related_incident_ids` correctly use `n` (array of numbers). |
| Valid optional defaults (`o:type:default`) | PASS | All optionals use correct format: `o:s:`, `o:i:0`, `o:b:false`, `o:b:true`, `o:n:`. |
| `/null/` defaults for update optionals | PASS | `update_poi_record` correctly uses `o:s:/null/` and `o:n:/null/` for fields that may be omitted vs. explicitly cleared. |
| `-1` sentinel for skip-on-update | PASS | `notice_document_file_id`, `card_document_file_id`, and `renewal_reminder_days` use `o:i:-1` in `update_poi_record`, with `-1` meaning "skip this field". |
| No `page_size` API param if runtime config used | N/A | POI uses `limit`/`offset` API params with server-side cap (max 100). This matches the `call` module pattern. No `POI_LIST_PAGE_SIZE` in runtime_config. See observation below. |

### 7. DRY & Shared Utilities

| Check | Result | Notes |
|-------|--------|-------|
| No duplicated general-purpose helpers | PASS | Uses `$Funcs.getUserCommunityId()`, `$Funcs.getUserNames()`, `$Funcs.getUserName()` from shared utilities. |
| Existing helpers checked | PASS | `buildFullName`, `getRecordTypeName`, `mapRecordRow` are POI-specific helpers correctly defined at module level. |
| Cron helper duplication | OBSERVATION | `getPoiSettings`, `buildFullName`, `getRecordTypeName` are duplicated between `funcs/poi.js` and `cron_poi_lifecycle_check.js`. Expected due to `initStandAlone()` architecture — cron jobs don't load funcs modules. Could be consolidated into a user_module if more POI crons emerge. |

### 8. Entity Lock / Concurrent Execution

| Check | Result | Notes |
|-------|--------|-------|
| Entity Lock Guard for cron | **FIXED** | `entity_lock` module was commented out in `using_modules.js`. Enabled it and added `$EntityLock.acquire("cron", "cron_poi_lifecycle", "system", 300)` guard to `doPoiLifecycleCheck()` with release on every exit path. |
| `export` module for `$Export.generate()` | **FIXED** | `export` was also commented out — `export_poi_record` would have crashed at runtime. Enabled in `using_modules.js`. |
| Single-record API endpoints | PASS | `update_poi_record`, `publish_poi_record`, `inactivate_poi_record`, `archive_poi_record` operate on single records fetched by ID. `$EntityLock` is not used project-wide for single-record APIs, so this matches the existing pattern. |

### 9. Security & Best Practices

| Check | Result | Notes |
|-------|--------|-------|
| Parameterized SQL | PASS | All queries use `?` placeholders with params arrays. No user input interpolated into SQL. |
| Input validation | PASS | Names, descriptions, IDs all validated before use. Max-length checks on all string fields. Data items validated via `$DataItems.isValidItemId()`. |
| Access control | PASS | Officers restricted to active records in their community. Admin-only fields (internal notes, legal docs) hidden from officers. Export restricted to admins. |
| PDF excludes internal notes | PASS | `export_poi_record` intentionally omits `POI_INTERNAL_NOTES` (line 1688 comment). |
| No secrets or sensitive data logged | PASS | No logging of sensitive data. Export creates audit trail in `poi_export` table. |
| `$Const` for data item IDs | **FIXED** | Cron literal strings replaced with `$Const` references. FIELD clause in `get_poi_list` updated to use `$Const.POI_THREAT_LEVEL_*`. |

### 10. Performance

| Check | Result | Notes |
|-------|--------|-------|
| Minimize query count | **FIXED** | `get_poi_record` called `getSites()` twice for officers (access check + response). Refactored to call once and reuse. |
| No N+1 patterns | **FIXED** | Cron officer lookups were N+1. Refactored to batch. Funcs module already uses batch patterns (`get_poi_list` batch-fetches photos, sites, views). |
| Indexed WHERE columns | PASS | Queries use indexed columns: `POI_ID` (PK), `PPH_POI_ID`, `PSI_POI_ID`, `PSI_COM_ID`, `PIN_POI_ID`, `PVW_POI_ID`, `PVW_USR_ID`. |
| Short transactions | PASS | Transaction blocks contain only INSERT/UPDATE operations. All SELECTs are outside. |

---

## Code Fixes Applied

### Critical Fixes

1. **Entity Lock Guard added to lifecycle cron + system modules enabled**
   - File: `backend/platform/config/using_modules.js` — enabled `entity_lock` and `export`
   - File: `cron_poi_lifecycle_check.js` — `doPoiLifecycleCheck()` acquires `$EntityLock.acquire("cron", "cron_poi_lifecycle", "system", 300)` before processing and releases on every exit path
   - Without `entity_lock`: concurrent cron runs could duplicate status transitions and notifications
   - Without `export`: `export_poi_record` would crash with undefined `$Export`

3. **Cron: Literal status strings replaced with `$Const` references**
   - File: `cron_poi_lifecycle_check.js`
   - `'active'` → `$Const.POI_STATUS_ACTIVE`
   - `'expired'` → `$Const.POI_STATUS_EXPIRED`
   - `'inactive'` → `$Const.POI_STATUS_INACTIVE`
   - `'archived'` → `$Const.POI_STATUS_ARCHIVED`
   - All SQL queries now use parameterized `?` with `$Const` values

4. **Cron: DB queries removed from loops**
   - File: `cron_poi_lifecycle_check.js`
   - `getOfficerIdsForCommunities()` was called inside `for` loops in `autoExpireRecords` (line ~117) and `sendExpiryReminders` (line ~206)
   - New function `batchFetchOfficersByCommunity()` fetches all officers for all communities in a single query
   - New function `resolveOfficerIds()` looks up officers from the pre-fetched map
   - Both notification loops now use the batch-fetched map instead of per-record DB queries

5. **Cron: `$DataItems.define()` moved to startup**
   - File: `cron_poi_lifecycle_check.js`
   - Added `$DataItems.define("poi_record_type")` and `$DataItems.define("poi_status")` after `initStandAlone()`
   - Removed per-call `$DataItems.define()` from `getRecordTypeName()`

### Moderate Fixes

6. **Cron: FCM query uses `toPlaceholders()` and `$Const.USER_STATUS_ACTIVE`**
   - File: `cron_poi_lifecycle_check.js`
   - Changed `.map(() => "?").join(",")` to `.toPlaceholders()`
   - Changed `USR_STATUS=1` to `USR_STATUS=?` with `$Const.USER_STATUS_ACTIVE` parameter

7. **Funcs: Eliminated duplicate `getSites()` call**
   - File: `funcs/poi.js` → `get_poi_record()`
   - Sites are now fetched once before the officer access check and reused for the response mapping

8. **Funcs: FIELD clause uses `$Const` references**
   - File: `funcs/poi.js` → `get_poi_list()` sort map
   - `FIELD(r.POI_THREAT_LEVEL, 'critical', 'high', 'medium', 'low')` replaced with `$Const.POI_THREAT_LEVEL_*` references

9. **Cron: Notification dedup uses `JSON_EXTRACT` instead of `SUBSTRING_INDEX`**
   - File: `cron_poi_lifecycle_check.js` → `sendExpiryReminders()`
   - Fragile `SUBSTRING_INDEX(SUBSTRING_INDEX(...))` replaced with `JSON_EXTRACT(NTF_PAYLOAD, '$.entity_id')` (MySQL 8+)
   - Also parameterized the `NTF_TYPE` literal (`'poi_expiring_soon'` → `?`)

---

## Structural Style Verification

| Convention | Required (brain.md) | POI Code Status |
|------------|---------------------|-----------------|
| Tab indentation | Yes | PASS — `funcs/poi.js` and `cron_poi_lifecycle_check.js` use tabs |
| Braces on new line (Allman) | Yes | PASS — all `if`, `else`, `for`, function blocks use new-line braces |
| API def column alignment (spaces) | Yes (existing convention) | PASS — `api/poi.js` uses space alignment matching other API files |

---

## Observations (Not Violations)

1. **Pagination: client-provided `limit` vs runtime_config**
   - `get_poi_list` accepts `limit` (capped 1–100) and `offset` from the API client.
   - Some modules (assets, posts, shifts) use `*_PAGE_SIZE` from `runtime_config.js`; others (call, poi) accept client page size.
   - Not a POI-specific issue; the inconsistency exists across the codebase.

2. **Inline PDF render function**
   - `export_poi_record` has a ~170-line inline `render` function inside `$Export.generate()`.
   - `brain.md` recommends keeping layout code in a domain module (`platform/user_modules/`).
   - Functional as-is; extracting to a user module is optional future cleanup.

3. **Helper duplication between funcs and cron**
   - `getPoiSettings`, `buildFullName`, `getRecordTypeName` duplicated.
   - Expected pattern for `initStandAlone()` cron jobs which don't load funcs modules.

4. **Documentation stale annotations** — FIXED
   - `project_dev.md` §6.2: removed "(deferred)" from PDF export, expiry cron, and expiry notifications.
   - `project_dev.md` §6.2: replaced "POI settings management API" deferred entry with the remaining sub-requirement (guidance version notes).
   - `08-poi-enhancements.md` item 6: marked as "Partially Complete (Core API Done)" with remaining sub-requirement documented.

---

## Data Items Review

| File | Format | `define` constants | Names | Issues |
|------|--------|-------------------|-------|--------|
| `poi_record_type.json` | Correct static format | `POI_RECORD_TYPE_POI`, `_TRESPASS`, `_METRO_RED_CARD` | en locale | None |
| `poi_status.json` | Correct static format | `POI_STATUS_DRAFT`, `_ACTIVE`, `_EXPIRED`, `_INACTIVE`, `_ARCHIVED` | en locale | None |
| `poi_threat_level.json` | Correct static format | `POI_THREAT_LEVEL_LOW`, `_MEDIUM`, `_HIGH`, `_CRITICAL` | en locale | None |
| `poi_gender.json` | Correct static format | `POI_GENDER_MALE`, `_FEMALE`, `_UNKNOWN` | en locale | None |

---

## Error Codes Review

| Code | RC | Message | Usage |
|------|----|---------|-------|
| `ERR_POI_RECORD_NOT_FOUND` | 690 | POI record not found | Correct: used for missing/unauthorized records |
| `ERR_POI_INVALID_RECORD_TYPE` | 691 | invalid POI record type | Correct: `$DataItems.isValidItemId` check |
| `ERR_POI_INVALID_THREAT_LEVEL` | 692 | invalid threat level | Correct: `$DataItems.isValidItemId` check |
| `ERR_POI_CANNOT_PUBLISH` | 693 | cannot publish in current status | Correct: only draft can be published |
| `ERR_POI_CANNOT_INACTIVATE` | 694 | cannot inactivate in current status | Correct: only active can be inactivated |
| `ERR_POI_CANNOT_ARCHIVE` | 695 | cannot archive in current status | Correct: only expired/inactive |
| `ERR_POI_CANNOT_EDIT` | 696 | cannot edit in current status | Correct: only draft/active can be edited |
| `ERR_POI_PHOTO_REQUIRED` | 697 | at least one photo required | Correct |
| `ERR_POI_PHOTO_LIMIT_REACHED` | 698 | max photos reached | Correct |
| `ERR_POI_SITE_REQUIRED` | 699 | at least one site required | Correct |
| `ERR_POI_INVALID_STATUS` | 700 | invalid POI status | Correct |
| `ERR_POI_INVALID_GENDER` | 701 | invalid gender | Correct |
| `ERR_POI_INACTIVATION_REASON_REQUIRED` | 702 | reason required | Correct |
| `ERR_POI_EXPIRY_DATE_REQUIRED` | 703 | expiry date required | Defined but not currently referenced in code |
| `ERR_POI_EXPORT_DISABLED` | 704 | export not enabled | Correct |
| `ERR_POI_TRESPASS_FIELDS_REQUIRED` | 705 | trespass fields missing | Correct |
| `ERR_POI_RED_CARD_FIELDS_REQUIRED` | 706 | red card fields missing | Correct |

All error codes are in the project-specific range (500+). RC 690–706 do not conflict with other modules.

Note: `ERR_POI_EXPIRY_DATE_REQUIRED` (rc 703) is defined but not referenced in current code. It may have been intended for explicit expiry-date validation that is currently handled by the type-specific required-field checks (`ERR_POI_TRESPASS_FIELDS_REQUIRED`, `ERR_POI_RED_CARD_FIELDS_REQUIRED`). Harmless — can be used in future enhancements.

---

## Database Schema Review

All six POI tables are correctly defined with:
- Proper column prefixes (`POI_`, `PPH_`, `PSI_`, `PIN_`, `PXP_`, `PVW_`)
- Foreign key constraints referencing `poi_record`, `community`, `service_call`, `user`
- Unique constraints for natural keys (`UQ_PSI_POI_COM`, `UQ_PIN_POI_SVC`, `UQ_PVW_POI_USR`)
- Indexes on foreign key columns
- Soft-delete columns (`*_DELETED_ON`) on `poi_record`, `poi_photo`, `poi_site`, `poi_incident`
- No soft-delete on `poi_export` (audit table) and `poi_view` (tracking table) — correct by design

---

## Summary

| Category | Items Found | Fixed | Blocked | Observation Only |
|----------|:-----------:|:-----:|:-------:|:----------------:|
| Critical (entity lock + export module) | 1 | 1 | 0 | 0 |
| Critical (data item literals) | 1 | 1 | 0 | 0 |
| Critical (DB in loop) | 1 | 1 | 0 | 0 |
| Moderate (conventions) | 6 | 6 | 0 | 0 |
| Documentation (stale annotations) | 1 | 1 | 0 | 0 |
| Observations | 3 | 0 | 0 | 3 |

All findings have been resolved. See `docs/issues-questions/poi-audit.md` for the full resolution log.
