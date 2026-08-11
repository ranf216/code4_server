# Code Review Report — Call Module

**Files reviewed:**
- `backend/platform/api/call.js`
- `backend/platform/funcs/call.js`
- `db/db.sql` (service_call table)
- `db/UpgradeDB.sql` (service_call migration)

**Date:** 2026-08-11
**Reviewer:** Cascade (AI-assisted audit)
**Convention source:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`

---

## Summary

The Call module is well-structured and follows most project conventions. During this audit, 3 concrete fixes were applied (DRY helper extraction, misleading @doc correction, duplicate `$Utils.now()` call). 3 open questions were documented in `docs/issues-questions/call-audit.md` for owner decision.

---

## Checklist Results

### Pre-Implementation

| # | Check | Result |
|---|-------|--------|
| 1 | Searched `brain.md` for "CRITICAL" warnings | ✅ Done |
| 2 | Searched `brain.md` for "loop" pattern guidance | ✅ Done |
| 3 | Searched `brain.md` for "transaction" pattern guidance | ✅ Done |
| 4 | Searched existing codebase for similar patterns | ✅ Done (officer.js, admin_user.js, resident.js) |
| 5 | Identified all SELECT queries (to do BEFORE transaction) | ✅ N/A — no transactions used |
| 6 | Identified all INSERT/UPDATE/DELETE queries (to do INSIDE transaction) | ✅ N/A — single-operation methods, no multi-step writes requiring atomicity |
| 7 | Planned bulk operations instead of loops | ✅ N/A — no loop-based inserts |

### Database Query Patterns

| # | Check | Result |
|---|-------|--------|
| 1 | No `$Db.executeQuery()` inside loops | ✅ PASS — no DB queries in any loop |
| 2 | All SELECT queries are BEFORE `$Db.beginTransaction()` | ✅ N/A — no transactions used |
| 3 | Using `IN (${ids.toPlaceholders()})` for multiple IDs | ✅ PASS — `resolveFileList()` uses `newFileIds.toPlaceholders()` correctly |
| 4 | Using multi-value INSERT for bulk inserts | ✅ N/A — no bulk inserts |
| 5 | Prepared data structures in memory before transaction | ✅ N/A — no transactions |

### Soft Deletion

| # | Check | Result |
|---|-------|--------|
| 1 | No `DELETE FROM` statements | ✅ PASS — zero DELETE statements |
| 2 | Using `UPDATE SET *_DELETED_ON=?` for deletions | ✅ PASS — `delete_test_call` sets `SVC_DELETED_ON` |
| 3 | All queries filter `WHERE *_DELETED_ON IS NULL` | ✅ PASS — all SELECT and UPDATE queries include `SVC_DELETED_ON IS NULL` |

### Transaction Handling

| # | Check | Result |
|---|-------|--------|
| 1 | Transaction contains ONLY INSERT/UPDATE/DELETE | ✅ N/A — no transactions |
| 2 | Every INSERT/UPDATE checks `$Db.isError()` | ✅ PASS — all 11 INSERT/UPDATE calls check `$Db.isError()` |
| 3 | Proper rollback on error | ✅ N/A — no transactions |
| 4 | Transaction commits at the end | ✅ N/A — no transactions |

### API Response Quality

| # | Check | Result |
|---|-------|--------|
| 1 | No database field names exposed | ✅ PASS — `mapCallRow()` maps all DB fields to clean API names |
| 2 | Clean snake_case names in API responses | ✅ PASS — all response fields use snake_case (e.g., `call_id`, `community_name`, `officer_comments`) |
| 3 | Proper error codes returned from `$ERRS` | ✅ PASS — all error returns use named `$ERRS.*` codes |

### Security & Best Practices

| # | Check | Result |
|---|-------|--------|
| 1 | Using parameterized queries | ✅ PASS — all queries use `?` placeholders |
| 2 | No user input in query strings | ✅ PASS — no string concatenation with user input in SQL |
| 3 | Multi-value INSERT uses placeholders | ✅ N/A — no multi-value inserts |
| 4 | Validating all input parameters | ✅ PASS — category, status, priority, service_type, reaction all validated |
| 5 | No database functions for JS-computable ops | ⚠️ NOTE — `JSON_CONTAINS` used in WHERE clause (see `call-audit.md` #2) |
| 6 | Following existing code style and conventions | ⚠️ NOTE — indentation uses spaces (matching codebase, but differs from brain.md spec; see `call-audit.md` #1) |

### Performance Considerations

| # | Check | Result |
|---|-------|--------|
| 1 | Minimized number of database queries | ✅ PASS — each method uses minimal queries |
| 2 | Used bulk operations where possible | ✅ PASS — `resolveFileList()` uses single IN query |
| 3 | Avoided N+1 query problems | ✅ PASS — `get_calls` joins all needed data in one query |
| 4 | Transaction kept as short as possible | ✅ N/A — no transactions |
| 5 | Indexed columns used in WHERE clauses | ✅ PASS — `SVC_ID` (PK), `SVC_RES_USR_ID`, `SVC_OFC_USR_ID`, `SVC_COM_ID`, `SVC_STATUS`, `SVC_CATEGORY`, `SVC_CREATED_ON` all indexed |

---

## Fixes Applied During This Audit

### Fix 1 — DRY: Extracted `getOfficerCommunityId()` helper

**Problem:** The officer community lookup query (`SELECT USD_COM_ID FROM user_details WHERE USD_USR_ID=?`) was duplicated 4 times across `get_calls`, `get_call`, `accept_call`, and `pass_call`.

**Fix:** Extracted a module-level helper `getOfficerCommunityId(userId)` returning the community ID or `null`. All 4 call sites now use this helper.

**brain.md rule:** §Within-Module Code Reuse — "When to extract: Same logic in 2+ methods."

### Fix 2 — Corrected `delete_test_call` @doc

**Problem:** API definition `@doc` said "Delete a test call (hard-delete)" but the implementation uses soft-delete via `SVC_DELETED_ON`.

**Fix:** Changed @doc to "Soft-delete a test call. Only calls with category=test can be deleted."

**brain.md rule:** §Soft Deletion — "NEVER use `DELETE FROM` except for cache/queue/temp tables."

### Fix 3 — Eliminated duplicate `$Utils.now()` call

**Problem:** `delete_test_call` called `$Utils.now()` twice in the parameter array, creating a potential microsecond discrepancy between `SVC_DELETED_ON` and `SVC_LAST_UPDATE`.

**Fix:** Stored `$Utils.now()` in a local `now` variable (consistent with every other method in the module).

---

## Structural Convention Compliance

### Brace Style (Allman)

✅ **PASS** — All control structures (`if`, `else`, `for`, class methods) use Allman-style braces. `return` with object literals correctly keeps the brace on the same line per the ASI exception rule.

### Constructor Pattern

✅ **PASS** — Standard constructor with `session` parameter, guards `session !== null` before assigning `this.$Session`.

### Module-Level Helpers

✅ **PASS** — Shared logic extracted to module-scope functions (`fetchCallRecord`, `parseMediaArray`, `parsePassedByArray`, `resolveFileList`, `resolveSingleFile`, `mapCallRow`, `getOfficerCommunityId`, `getActiveAdminIds`, `getOfficerIdsInCommunity`, `getUserName`). All are defined outside the class, consistent with brain.md §Within-Module Code Reuse.

### API Definition Alignment

✅ **PASS** — `api/call.js` follows the officer.js reference pattern: column-aligned values, `@acl`/`@doc`/`#token` before parameters, proper type prefixes (`s`, `i`, `o:s:`, `o:i:`, `o:b:`, `o:a:`), `/null/` for nullable optionals.

### Return Pattern

✅ **PASS** — All methods use `{...rc, ...vals}` or `return rc` per brain.md response convention.

### Table Names

✅ **PASS** — All table names wrapped in backticks in SQL queries.

### JOIN Convention

✅ **PASS** — Uses `JOIN` (not `INNER JOIN`) and `LEFT OUTER JOIN` (not `LEFT JOIN`). Aliases used only when the same table is joined multiple times (necessary for disambiguation).

### No `AS` Keyword

✅ **PASS** — Table aliases assigned without `AS` keyword (e.g., `RES_USD`, `OFC_USD`, `COM`).

---

## Open Items (Documented in `call-audit.md`)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Tabs vs spaces — brain.md says tabs, entire codebase uses spaces | Medium | Awaiting decision |
| 2 | `JSON_CONTAINS` in WHERE clause — permitted or not | Low | Awaiting decision |
| 3 | `$Db.isError()` after SELECT queries — required or not | Low | Awaiting decision |

---

## Additional Observations (Non-Blocking)

1. **No transactions used.** Each method performs a single INSERT or UPDATE. If future requirements introduce multi-step writes (e.g., creating a call + audit log entry), transactions should be added per brain.md guidelines.

2. **Notification calls are fire-and-forget.** `$executeAPI` calls for notifications do not check return values. If notifications fail silently, the primary operation still succeeds. This is likely intentional but worth noting.

3. **`resolveFileList` performs a DB query.** When called from `update_call` or `resolve_call`, file resolution queries run before the UPDATE query. If the UPDATE were inside a transaction, these SELECTs would need to be lifted out. Currently correct since no transactions are used.

4. **`mapCallRow` trailing comma.** The last property in the `mapCallRow` return object has a trailing comma (line 136). This is valid JavaScript and consistent with the codebase, but worth noting for style awareness.
