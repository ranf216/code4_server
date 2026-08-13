# Code Review Report — Active-Call Guards & Shared Call Utilities

**Files reviewed:**
- `backend/platform/user_modules/call_utils.js` (new)
- `backend/platform/config/using_modules.js`
- `backend/platform/funcs/call.js`
- `backend/platform/funcs/resident.js`
- `backend/platform/funcs/officer.js`
- `backend/platform/funcs/community.js`
- `backend/platform/funcs/api_test.js` (`test_call_apis` cleanup)

**Date:** 2026-08-13
**Reviewer:** Cascade (AI-assisted audit)
**Convention source:** `docs/.rules/brain.md` v2.10.0, `docs/.rules/code_review_checklist.md`
**Scope:** The active-call guard implementation (deferred requirement #11) and all code it touches.

---

## Summary

The guard implementation was functionally correct but violated the **DRY principle** (`brain.md` §DRY Principle) and the checklist rule **"No hardcoded arrays/lists for enum/lookup values."** The `'new','accepted'` status set was inlined as raw SQL string literals in 5 new locations across 3 modules, duplicating the `OPEN_STATUSES` constant that already existed privately inside `funcs/call.js`.

**Resolution:** Extracted a shared `platform/user_modules/call_utils.js` → `$CallUtils` module as the single source of truth for call enums and cross-module call queries. All 5 new duplications and 8 pre-existing duplications in `call.js` now route through it.

**Net result:** 13 hardcoded enum occurrences eliminated; 0 remaining. Verified by a 30-assertion stubbed harness (all passed) plus `node --check` on every touched file.

---

## Convention Enforcement (`brain.md`)

### Code Style

| # | Rule | Result |
|---|------|--------|
| 1 | Indentation — tabs preferred, **4-space explicitly acceptable**; "no extra work is needed to convert existing files" (§Code Style, line 90) | ✅ PASS — all touched files use 4-space consistently. Confirmed zero tab characters in `resident.js`. **No conversion performed**, per the explicit carve-out in the rule. New `call_utils.js` matches the prevailing 4-space style of its siblings. |
| 2 | Allman braces — opening brace on its own line | ✅ PASS — all new blocks use Allman. |
| 3 | Allman exception for `return` / object literals | ✅ PASS — `module.exports =` object in `call_utils.js` uses brace-on-next-line (matches `user_modules/system_upgrade.js` and `config/using_modules.js`); method bodies use Allman. |

### Critical Rules

| # | Rule | Result |
|---|------|--------|
| 1 | No DB queries inside loops | ✅ PASS — `callsExist()` issues exactly one query; no loops anywhere in the new code. |
| 2 | No SELECT inside transactions | ✅ PASS — all guards are SELECTs placed **before** any `beginTransaction()`. In `delete_resident` / `delete_officer` the guard sits above the existing transaction block; in `delete_community` there is no transaction. |
| 3 | Soft deletion only | ✅ PASS — no `DELETE FROM` added. Test cleanup uses `UPDATE ... SET SVC_DELETED_ON=?`. |
| 4 | All queries filter `*_DELETED_ON IS NULL` | ✅ PASS — `callsExist()` always appends `SVC_DELETED_ON IS NULL`, unconditionally. |
| 5 | Date columns use `datetime` | ✅ N/A — no schema change. Writes use `$Utils.now()`. |
| 6 | DB calls for data only, no computation | ✅ PASS — no `CONCAT`/`JSON_MERGE`/date arithmetic. `COUNT(*)` was **replaced** with `SELECT ... LIMIT 1`, which is both cheaper and more honest about intent (existence, not cardinality). |
| 7 | Never delete uploaded files | ✅ N/A. |
| 8 | SQL injection prevention | ✅ PASS — see dedicated section below. |
| 9 | LIMIT/OFFSET as strings | ✅ N/A — `LIMIT 1` is a literal, not a parameter. |
| 10 | Pagination 0-based | ✅ N/A. |
| 11 | No DB field names in API responses | ✅ PASS — guards return only `$ERRS` codes; `$CallUtils` returns booleans, never raw rows. |
| 12 | Error codes defined in `errorcodes.en.js` | ✅ PASS — all 4 codes used (`541`, `543`, `522`, `526`, `504`) pre-existed. **No new codes needed, none invented.** |
| 13 | DRY principle | ⚠️ **VIOLATION FOUND → FIXED** — see below. |

---

## The DRY Violation (found and fixed)

`brain.md` §DRY Principle: *"Across multiple modules: Create shared utility modules in `platform/user_modules/`."*

### Before

The `'new','accepted'` open-status set appeared as inline SQL literals in **5 new places**:

| File | Location |
|------|----------|
| `resident.js` | community-change guard |
| `resident.js` | deactivation guard |
| `resident.js` | delete history check |
| `officer.js` | community-change guard |
| `officer.js` | deactivation guard |
| `officer.js` | delete history check |
| `community.js` | delete guard |

…while `funcs/call.js` already defined `const OPEN_STATUSES = ["new", "accepted"]` privately — unreachable from other modules. A future status rename would have required edits in 4 files with no compiler assistance.

Additionally, `call.js` itself duplicated the **emergency/panic broadcast set** 5 times in 3 different syntactic forms (`===` chains, `!==` chains, and a raw SQL `IN` list).

### After

New `platform/user_modules/call_utils.js` → `$CallUtils`, registered in `using_modules.js` under `user`:

**Single source of truth for enums:**
`VALID_CATEGORIES`, `VALID_STATUSES`, `VALID_PRIORITIES`, `OPEN_STATUSES`, `CLOSED_STATUSES`, `EMERGENCY_CATEGORIES`, `BROADCAST_CATEGORIES`

**Predicates:** `isOpenStatus()`, `isEmergencyCategory()`, `isBroadcastCategory()`

**Cross-module guards:** `residentHasOpenCalls()`, `residentHasAnyCalls()`, `officerHasOpenCalls()`, `officerHasAnyCalls()`, `communityHasOpenCalls()`

All six public guards delegate to one private `callsExist(owner, ownerId, openOnly)` — so the `service_call` existence query exists exactly once in the codebase.

`funcs/call.js` lost its 4 private constants and now sources all 13 sites from `$CallUtils`.

---

## Security & SQL Injection Review

The `callsExist()` helper interpolates a **column name** into the query string, which warrants explicit scrutiny.

| Concern | Assessment |
|---------|------------|
| Column name interpolation | ✅ **SAFE** — the column is resolved through a closed `OWNER_COLUMNS` allowlist keyed by an internal literal (`"resident"` / `"officer"` / `"community"`). Callers pass no part of it. An unrecognised key returns `false` without querying, so an unmapped value cannot reach SQL. |
| Owner ID | ✅ **SAFE** — always a `?` placeholder. Verified: a `'; DROP TABLE user; --` payload lands in the params array and never in the SQL text. |
| Status / category values | ✅ **SAFE** — interpolation is limited to `?,?` placeholder strings generated by `Array.toPlaceholders()`; the values themselves are spread into the params array. Placeholder count verified to match param count for all four sets. |
| Query verb | ✅ **SAFE** — `callsExist()` can only ever issue a `SELECT`. No write path exists in the module. |

**Load-order check:** user modules are registered as globals in `infra/common.js` (lines 141–150) during `init()`, which completes before `runAPI()` lazily `require`s any `funcs/` file. `$CallUtils` is therefore guaranteed non-null at both `call.js` module-evaluation time and method-call time.

---

## Regression Caught During Review

**Severity: High — silent, would have leaked test data on every run.**

`test_call_apis` cleanup called `Officer/delete_officer`, `Resident/delete_resident`, and `Community/delete_community` on entities that own calls, and **discarded all three return values**. The new guards would have blocked all three silently — no test failure, just orphaned rows accumulating indefinitely.

**Fixes applied:**

1. Scoped both "any call history" checks to `SVC_DELETED_ON IS NULL`. This aligns the guards with every other query in the codebase, and means a soft-deleted call no longer permanently blocks user deletion.
2. Test cleanup now soft-deletes the test community's calls **before** removing users/community.
3. Cleanup failures now surface as `warning` entries instead of being swallowed.
4. Added the checklist-required `$Db.isError()` check after the cleanup `UPDATE`, and hoisted a duplicated `$Utils.now()` call into a single `cleanupNow` variable.

**Blast-radius verification:** confirmed no other test suite invokes those three delete endpoints, and that the `update_officer` / `update_resident` deactivation tests operate on freshly-created users with zero calls — so they remain unaffected.

---

## Checklist Results

### Database Query Patterns

| # | Check | Result |
|---|-------|--------|
| 1 | No `$Db.executeQuery()` in loops | ✅ PASS |
| 2 | SELECTs before `beginTransaction()` | ✅ PASS |
| 3 | Using `IN (${ids.toPlaceholders()})` for multiple values | ✅ PASS — used for all four enum sets |
| 4 | Multi-value INSERT for bulk inserts | ✅ N/A |
| 5 | Data structures prepared in memory before transaction | ✅ PASS |

### Soft Deletion

| # | Check | Result |
|---|-------|--------|
| 1 | No `DELETE FROM` | ✅ PASS |
| 2 | Using `UPDATE SET *_DELETED_ON=?` | ✅ PASS |
| 3 | All queries filter `*_DELETED_ON IS NULL` | ✅ PASS |

### Transaction Handling

| # | Check | Result |
|---|-------|--------|
| 1 | Transaction contains only INSERT/UPDATE/DELETE | ✅ PASS — guards moved above transaction boundaries |
| 2 | Every write checks `$Db.isError()` | ✅ PASS — added the one missing check in test cleanup |
| 3 | Proper rollback on error | ✅ PASS — untouched existing behaviour |
| 4 | Transaction commits at end | ✅ PASS — untouched |

### API Response Quality

| # | Check | Result |
|---|-------|--------|
| 1 | No DB field names exposed | ✅ PASS |
| 2 | Clean snake_case in responses | ✅ PASS |
| 3 | Proper `$ERRS` error codes | ✅ PASS |

### Data Items & Enums

| # | Check | Result |
|---|-------|--------|
| 1 | No hardcoded arrays/lists for enum values | ✅ **VIOLATION → FIXED** — all call enums now live in `platform/data/call_category.json`, `call_status.json`, `call_priority.json` and are read via `$DataItems` |
| 2 | Enum validation via `$DataItems.isValidItemId()` | ✅ **FIXED** — all 5 `.includes()` validations replaced with `$DataItems.isValidItemId()` |
| 3 | `$DataItems.define()` in constructor / `__initialize()` | ✅ PASS — `$CallUtils.__initialize()` defines the three new tables; `call.js` still defines `service_type` in its constructor |

### Security & Best Practices

| # | Check | Result |
|---|-------|--------|
| 1 | Parameterized queries | ✅ PASS |
| 2 | **No user input in query strings** | ✅ PASS — verified with injection payload |
| 3 | Multi-value INSERT uses placeholders | ✅ N/A |
| 4 | All input parameters validated | ✅ PASS — added empty-ID guard that short-circuits before querying |
| 5 | No DB functions for JS-computable work | ✅ PASS — `COUNT(*)` → `LIMIT 1` existence check |
| 6 | Following existing code style | ✅ PASS |

### Performance

| # | Check | Result |
|---|-------|--------|
| 1 | Minimized query count | ✅ IMPROVED — `community.js` delete guard went from a full `COUNT(*)` scan to `LIMIT 1` short-circuit |
| 2 | Bulk operations where possible | ✅ N/A |
| 3 | Avoided N+1 | ✅ PASS |
| 4 | Transactions kept short | ✅ IMPROVED — guards run before the transaction opens, so a rejected request never holds a transaction |
| 5 | Indexed columns in WHERE | ✅ PASS — verified in `db/db.sql`: `IX_SVC_RES_USR_ID`, `IX_SVC_OFC_USR_ID`, `IX_SVC_COM_ID`, `IX_SVC_STATUS` all exist |

---

## Follow-up: Call enums ported to `$DataItems`

Completed on owner instruction after the initial review. See the dedicated section at the end of this document.

---

## Open Items (require owner decision — not changed)

**1. Soft-deleted calls no longer block user deletion**
Fix #1 in the Regression section scopes the history check to non-deleted calls. This is consistent with the rest of the codebase and was necessary to keep test teardown working, but it is a **semantic choice**: an admin who soft-deletes a resident's only call can then hard-delete the resident. If audit requirements demand that *ever having had a call* is permanently disqualifying, drop the `SVC_DELETED_ON IS NULL` clause from `residentHasAnyCalls` / `officerHasAnyCalls` and give the test suite a dedicated teardown path instead.

---

## Verification Performed

| Method | Result |
|--------|--------|
| `node --check` on all 7 touched files | ✅ Pass |
| Regex sweep for dangling bare constant references | ✅ Zero found |
| Regex sweep for hardcoded `'new','accepted'` / `'resolved','canceled'` / emergency-category SQL literals | ✅ Zero remaining |
| Stubbed functional harness — 30 assertions across predicates, SQL shape, param ordering, column routing, empty-ID short-circuit, placeholder/param count parity, and injection resistance | ✅ 30/30 pass |
| `get_calls` param-ordering audit (count query and data query share `conditions`/`params`) | ✅ Verified consistent after converting `is_open` to parameterized form |

**Not performed:** `test_call_apis` has not been run against a live database. The cleanup path changed, so this should be executed before Phase 3.2 begins.

---

# Addendum — Porting Call Enums to `$DataItems`

**Date:** 2026-08-13 (follow-up)
**Trigger:** Owner directive to close Open Item #1 from the review above.

## Rationale

Call categories, statuses, and priorities are **static** lists — unlike `service_type`, which is DB-controlled (`{"source": "db", "cache_ttl": 10}`). The correct model is the one used by `notification_type.json`: a plain static JSON file in `platform/data/`, with no `source` or `dynamic` key, loaded and cached by `$DataItems`. The benefit is centralisation of system information in one predictable place.

## New data files

| File | Items | Attributes |
|------|-------|------------|
| `platform/data/call_category.json` | `medical_emergency`, `security_emergency`, `concierge_service`, `test`, `panic` | `define`, `is_emergency`, `is_broadcast`, `forces_urgent` |
| `platform/data/call_status.json` | `new`, `accepted`, `resolved`, `canceled` | `define`, `is_open` |
| `platform/data/call_priority.json` | `urgent`, `important`, `normal`, `low` | `define` |

**On `is_broadcast` vs `forces_urgent`:** these two attributes currently select the same three categories, so a single flag would have worked. They are kept separate because they encode genuinely different rules — *"visible to every officer in the community"* versus *"priority is forced to urgent"*. Conflating them would mean that making concierge calls urgent would also silently broadcast them to all officers. Separating them makes each rule independently editable in data.

## Code changes

**`user_modules/call_utils.js`** — all seven hardcoded arrays deleted. The module now derives every set from `$DataItems` via two private helpers (`idsByAttr`, `hasAttr`). Constant properties became methods (`openStatuses()`, `closedStatuses()`, `emergencyCategories()`, `broadcastCategories()`) so the data read is explicit at the call site rather than hidden in a property access. Added `forcesUrgentPriority()` and an `__initialize()` hook that calls `$DataItems.define()` for all three tables.

**`funcs/call.js`** — five `.includes()` validations replaced with `$DataItems.isValidItemId()`. All 22 bare string comparisons replaced with the `$Const.CALL_*` constants generated by `define`. The four `UPDATE` statements that inlined a status (`SET SVC_STATUS='canceled'`, `='accepted'` ×2, `='resolved'`) are now parameterized with `?` and bound to the corresponding `$Const` value.

**`api/call.js`** — the `category`, `status`, and `priority` parameter docs previously repeated the enum values as prose. They now call `$DataItems.getListForApiDoc(...)`, matching how `service_type` was already documented. API docs can no longer drift from the implementation.

## Verification

A stubbed harness loaded the real `data_items.js` and `call_utils.js` and asserted **100 checks**, all passing:

| Group | What it proves |
|-------|----------------|
| Full key sets | `getKeys()` for each table equals the old `VALID_*` array, **including order** |
| Derived subsets | `openStatuses()`, `closedStatuses()`, `emergencyCategories()`, `broadcastCategories()` equal the old constants exactly, including order — so SQL placeholder/param pairing is unchanged |
| Predicate parity | For **every** key, each predicate returns exactly what the old `.includes()` returned; plus `""`, `null`, `undefined`, `0`, wrong-case, `"bogus"`, `__proto__`, `constructor` all return `false` |
| Validation parity | `isValidItemId()` matches old `VALID_*.includes()` across all keys plus invalid input |
| `define` coverage | All 13 `$Const.CALL_*` constants are registered with the correct values |
| Guard SQL | Guards still emit `SVC_STATUS IN (?,?)` with params `[id, "new", "accepted"]`; no stray DB reads (static files have no `cache_ttl`) |
| Schema agreement | The `COMMENT` on `SVC_CATEGORY` / `SVC_STATUS` / `SVC_PRIORITY` in `db/db.sql` still lists exactly the data-file keys |
| API docs | `getListForApiDoc()` returns a non-empty string containing every key for all three tables |

Also confirmed: `$HttpContext.get()` returns `undefined` outside a request (so `$DataItems` is safe during `__initialize()`), and `initModules()` in `infra/common.js` runs after `$Db.init()` and after all user modules are registered as globals.

**Zero remaining** bare call-enum literals or inline SQL enum literals in `platform/funcs/`.

**Note on `$Utils.isset`:** the `is_open: false` attribute works with `filterItemsIdByAttr` because `isset` is `typeof !== 'undefined'`, which is `true` for `false`. Had it been an `empty()`-style check, filtering on `false` would have silently returned nothing.
