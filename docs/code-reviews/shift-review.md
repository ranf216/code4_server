# Shift Module Code Review Report

**Review Date:** 2026-09-10
**Reviewer:** Devin (automated audit)
**Review Criteria:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`

---

## Scope & Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/shift.js` | API definition |
| `backend/platform/funcs/shift.js` | Business logic (2048 lines) |
| `backend/platform/user_modules/shift_utils.js` | Shared shift utilities |
| `backend/platform/user_modules/funcs.js` | Shared user-name helpers ($Funcs) — NEW |
| `backend/platform/funcs/call.js` | Call module (getUserName removal) |
| `backend/platform/funcs/task.js` | Task module (getUserName removal) |
| `backend/platform/jobs/cron_shift_lifecycle_check.js` | Auto-checkout and auto-complete cron |
| `backend/platform/jobs/cron_shift_reminders.js` | Starting-soon reminder cron |
| `backend/platform/funcs/settings.js` | Settings infrastructure (shift section) |
| `backend/platform/api/settings.js` | Settings API definition (shift section) |
| `backend/platform/data/shift_status.json` | Status data items |
| `backend/platform/data/shift_recurrence_pattern.json` | Recurrence pattern data items |
| `backend/platform/data/shift_recurrence_end_type.json` | Recurrence end-type data items |
| `backend/platform/data/shift_update_scope.json` | Update scope data items |
| `backend/platform/definitions/constants.js` | Constants (shift keys) |
| `backend/platform/definitions/errorcodes.en.js` | Shift error codes |
| `backend/platform/config/using_api.js` | API registration |
| `backend/platform/config/using_modules.js` | Module registration |
| `backend/platform/funcs/community.js` | Community deletion guard |
| `db/db.sql` | Schema |
| `db/UpgradeDB.sql` | Migration |
| `ecosystem.config.js` | PM2 cron configuration |

---

## Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Fixed |
| High | 3 | Fixed |
| Medium | 1 | Fixed |
| Low/Info | 3 | Documented |
| Deferred | 1 | Documented in `shift-audit.md` |

---

## Critical Findings (Fixed)

### 1. Hardcoded Data-Item String Literals Instead of `$Const` References

**Rule:** brain.md — "Always use `$Const` references for data-item IDs — never literal strings"

**Scope:** All shift-related files (`funcs/shift.js`, `shift_utils.js`, both cron jobs)

**Before (representative examples):**
```js
if (shift.SFT_STATUS !== "draft") ...
if (shift.SFT_STATUS === "published") ...
WHERE s.SFT_STATUS IN ('draft','published','active')
SET SFT_STATUS='published'
if (this.$recurrence_pattern === "specific_days") ...
if (this.$scope === "this_and_future") ...
```

**After:**
```js
if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT) ...
if (shift.SFT_STATUS === $Const.SHIFT_STATUS_PUBLISHED) ...
WHERE s.SFT_STATUS IN (${openStatuses.toPlaceholders()})
SET SFT_STATUS=?  // with $Const.SHIFT_STATUS_PUBLISHED param
if (this.$recurrence_pattern === $Const.SHIFT_RECURRENCE_SPECIFIC_DAYS) ...
if (this.$scope === $Const.SHIFT_UPDATE_THIS_AND_FUTURE) ...
```

**Changes applied across:**
- 5 shift status values (`draft`, `published`, `active`, `completed`, `cancelled`)
- 3 recurrence pattern values (`daily`, `specific_days`, `every_x_days`)
- 3 recurrence end-type values (`end_date`, `occurrences`, `no_end`)
- 3 update scope values (`this_only`, `this_and_future`, `all`)

All SQL `IN` clauses now use parameterized `toPlaceholders()` patterns. All `SET` and `WHERE` equality comparisons use `?` placeholders with `$Const` values.

---

## High Findings (Fixed)

### 2. Missing `__initialize()` Hook in `shift_utils.js`

**Rule:** brain.md — "`$DataItems.define()` must run before `$Const` references are used"

**Location:** `backend/platform/user_modules/shift_utils.js`

**Issue:** The user module used hardcoded status strings in SQL and had no `__initialize()` hook. After converting to `$Const` references, the constants must be defined before use. Cron jobs load this module but do not instantiate the `funcs/shift.js` class (whose constructor defines the data items).

**Fix:** Added `__initialize()` hook that calls `$DataItems.define("shift_status")`, ensuring `$Const.SHIFT_STATUS_*` constants are available in both API and cron contexts.

### 3. SQL Column Alias Used `AS` Keyword

**Rule:** brain.md — "Don't use `AS` keyword for table or column aliases"

**Location:** `backend/platform/funcs/shift.js`, `_runAllocationValidation()` weekly-hours query

**Before:**
```sql
), 0) / 60.0 AS planned_hours
```

**After:**
```sql
), 0) / 60.0 planned_hours
```

### 4. `getUserName()` N+1 Pattern in `publish_shift()`

**Rule:** brain.md CRITICAL — "Never place `$Db.executeQuery()` inside loops"

**Location:** `backend/platform/funcs/shift.js`, `publish_shift()` validation loop

**Issue:** `getUserName()` executed a per-officer SELECT inside the validation loop, producing N+1 queries.

**Fix:** Created `$Funcs.getUserNames(userIds)` batch method (single `IN (...)` query). `publish_shift()` now pre-fetches all officer names before the loop.

---

## Critical Findings (Fixed) — Cross-Module

### 5. Duplicate `getUserName()` Functions — DRY Violation

**Rule:** DRY principle; brain.md — shared utilities belong in user modules

**Location:** Three identical `getUserName()` functions in `funcs/call.js` (line 167), `funcs/shift.js` (line 72), and `funcs/task.js` (line 23)

**Fix:** Created shared `$Funcs` user module (`backend/platform/user_modules/funcs.js`) with:
- `getUserName(userId)` — single-user lookup
- `getUserNames(userIds)` — batch lookup returning `{userId: name}` map

Removed all three local copies. Registered `funcs` in `using_modules.js`. Updated all 15 call sites across the three funcs files.

---

## Medium Findings (Fixed)

### 6. SQL Status Values Embedded as Literals in Query Strings

**Rule:** brain.md CRITICAL — "No user input in query strings"; brain.md — parameterize all values

**Location:** Multiple methods across `funcs/shift.js`, `shift_utils.js`, both cron jobs

**Issue:** Status strings were embedded directly in SQL as `'draft'`, `'published'`, `'active'` etc. While these are not user-supplied values, the convention requires full parameterization for consistency, maintainability, and defense-in-depth.

**Fix:** All embedded status literals converted to parameterized `?` placeholders with `$Const` values. `IN` clauses use `${array.toPlaceholders()}` with spread params.

---

## Checklist Verification

### Database Conventions

| Check | Result |
|-------|--------|
| All SELECTs before transactions | PASS — all methods follow this pattern |
| Only mutations inside transactions | PASS |
| `$Db.isError()` after every mutation | PASS |
| Rollback on mutation error | PASS |
| Commit after successful mutations | PASS |
| No `DELETE FROM` (soft deletion) | PASS — uses `SET *_DELETED_ON=?` |
| `*_DELETED_ON IS NULL` filters | PASS — present on all relevant queries |
| Parameterized queries throughout | PASS (after fixes) |
| No user input interpolated in SQL | PASS — `LIMIT/OFFSET` use parsed integers from config/params |
| Bulk operations for batch inserts | PASS — `create_recurring_shifts` uses multi-value INSERT |
| `IN (${ids.toPlaceholders()})` pattern | PASS — used for batch fetches |
| `JOIN` not `INNER JOIN` | PASS |
| `LEFT OUTER JOIN` not `LEFT JOIN` | PASS |
| Table names in backticks | PASS |
| No `AS` keyword for aliases | PASS (after fix) |
| No DB queries inside loops | PARTIAL — see `shift-audit.md` items 1 and 5 |

### API Parameter Conventions

| Check | Result |
|-------|--------|
| `i` for scalar IDs/counts/flags | PASS |
| `s` for string user IDs (UUID) | PASS |
| `n` for arrays of numbers | PASS — `repeat_on` fixed from `a` to `n` |
| `o:b:false` for optional booleans | PASS (`acknowledge_conflicts`) |
| `/null/` for nullable update fields | PASS (`update_shift`, `update_recurring_shifts`) |
| `o:i:0` for optional integers | PASS (`page`, `community_id`, `interval_days`, `occurrences`) |
| `$DataItems.getListForApiDoc()` in docs | PASS |

### Code Structure

| Check | Result |
|-------|--------|
| `$DataItems.define()` in constructor | PASS — all 4 tables defined |
| Allman brace style | PASS |
| Tab indentation (shift-specific files) | PASS |
| `module.exports = class` pattern | PASS |
| `this.$param_name` access | PASS |
| `{rc: 0, message: "success"}` via `$ERRS.ERR_SUCCESS` | PASS |
| Early validation returns | PASS |
| `$DataItems.isValidItemId()` for enum validation | PASS |
| Clean snake_case API response fields | PASS |

### Notification & Integration

| Check | Result |
|-------|--------|
| `sendShiftNotification()` used consistently | PASS |
| Cron notifications use bulk INSERT | PASS |
| FCM push notifications with error isolation | PASS |
| Notification deduplication in reminders | PASS (2-hour window) |

### Cron Jobs

| Check | Result |
|-------|--------|
| `initStandAlone()` bootstrap | PASS |
| SIGINT handler | PASS |
| Try/catch with `$Logger` error logging | PASS |
| `$Utils.createCron()` scheduling | PASS |
| Idempotent operations | PASS |
| Result-set loops (accepted per brain.md) | PASS |

---

## Informational Notes

### 1. Settings Files Indentation Convention

`funcs/settings.js` and `api/settings.js` use 4-space indentation, consistent with other pre-existing settings, call, and community modules. The shift settings sections follow the host file's style. See `shift-audit.md` item 3 for details.

### 2. Transaction Boundaries Are Clean

All shift methods that perform mutations follow the prescribed pattern:
- SELECTs and validation before `$Db.beginTransaction()`
- Only INSERT/UPDATE/DELETE inside the transaction
- `$Db.isError()` check after each mutation
- `$Db.rollbackTransaction()` on error
- `$Db.commitTransaction()` on success

Notable examples: `create_shift()`, `create_recurring_shifts()`, `remove_officer()`, `check_in()`.

### 3. Batch Operations Are Used Where Appropriate

- `validateOfficersBatch()` uses a single `IN (...)` query instead of per-officer lookups
- `get_shifts_calendar()` batch-fetches officers and posts for all shifts in one query each
- `get_allocation_board()` batch-fetches allocations and weekly hours
- `create_recurring_shifts()` uses multi-value INSERT for shifts and officer allocations
- `publish_shift()` now uses `$Funcs.getUserNames()` batch pre-fetch for officer names

---

## Deferred Items

See `docs/issues-questions/shift-audit.md` for:

1. `publish_shift()` validation loop with DB queries per officer (deferred — see `06-shift-enhancements.md` item 9)
2. Cron result-set loops (accepted per brain.md exception)
3. Settings files indentation normalization
