# Task Module Code Review Report

**Review Date:** 2026-08-14  
**Reviewer:** Devin (automated audit)  
**Review Criteria:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`

---

## Scope & Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/task.js` | API definition |
| `backend/platform/funcs/task.js` | Business logic |
| `backend/platform/user_modules/task_utils.js` | Shared utilities |
| `backend/platform/data/task_status.json` | Status data items |
| `backend/platform/data/task_priority.json` | Priority data items |
| `backend/platform/data/task_type.json` | Type data pointer (DB-backed) |
| `backend/platform/data/task_approval_types.json` | Approval type whitelist |
| `backend/platform/data/task_allowed_document_mimes.json` | Document MIME whitelist |
| `backend/platform/definitions/errorcodes.en.js` | Error code definitions |
| `backend/platform/config/using_api.js` | API registration |
| `backend/platform/config/using_modules.js` | Module registration |

---

## Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Fixed |
| High | 3 | Fixed |
| Medium | 2 | Fixed |
| Low | 1 | Documented |
| Informational | 1 | Documented |

---

## Critical Findings (Fixed)

### 1. Database Function Used for JS-Computable Operation

**Rule:** brain.md — "❌ SELECT CONCAT(...) — use JavaScript string operations instead"

**Location:** `funcs/task.js`, `get_tasks_list()` and `get_task()`

**Before:**
```sql
CONCAT(creator_ud.USD_FIRST_NAME, ' ', IFNULL(creator_ud.USD_LAST_NAME, '')) CREATOR_NAME
```

**After:** SELECT raw columns (`CREATOR_FIRST_NAME`, `CREATOR_LAST_NAME`), concatenate in JS via `buildFullName()` helper.

### 2. Database Query Inside Loop (N+1)

**Rule:** brain.md CRITICAL — "Never place $Db.executeQuery() inside for, while, forEach, or .map() loops"

**Location:** `funcs/task.js`, `getTaskComments()` — called `getUserName(userId)` per comment row inside `.map()`.

**Fix:** Replaced with a single JOIN query that fetches comment data alongside user names.

---

## High Findings (Fixed)

### 3. Missing `$Db.isError()` After INSERT

**Rule:** code_review_checklist — "Every INSERT/UPDATE/DELETE checks $Db.isError()"

**Locations:**
- `reject_task()` — comment INSERT had no error check
- `complete_task()` — comment INSERT had no error check
- `insertTaskMedia()` — bulk INSERT had no error check

**Fix:** Added `$Db.isError()` checks with appropriate `$Err.DBError()` returns after all write operations.

### 4. Multiple Writes Without Transaction

**Rule:** brain.md transaction pattern, code_review_checklist — "Identified all INSERT/UPDATE/DELETE queries (to do INSIDE transaction)"

**Locations:**
- `create_task()` — INSERT task + INSERT media (up to 3 calls)
- `reject_task()` — INSERT comment + UPDATE task
- `complete_task()` — INSERT comment + INSERT media + UPDATE task
- `add_task_comment()` — INSERT comment + UPDATE task timestamp
- `add_task_media()` — INSERT media + UPDATE task timestamp

**Fix:** Wrapped all multi-write methods in `$Db.beginTransaction()` / `$Db.commitTransaction()` with proper rollback on error.

### 5. SELECT Inside Transaction Path

**Rule:** brain.md — "Do not perform SELECT queries inside transactions"

**Location:** `complete_task()` and `add_task_media()` — `resolveFileIds()` (SELECT) was interleaved between writes.

**Fix:** Restructured to resolve all file IDs (SELECTs) BEFORE `$Db.beginTransaction()`, storing results in local variables for use during writes.

---

## Medium Findings (Fixed)

### 6. Constant Declared Mid-File

**Location:** `funcs/task.js` — `TABLE_ALLOWED_DOC_MIMES` was declared at line 108, separated from the other constants at the top.

**Fix:** Moved to the constant block at the top of the file (line 7).

### 7. `insertTaskMedia` No Error Propagation

**Location:** `funcs/task.js` — `insertTaskMedia()` returned `undefined` (void) regardless of DB error.

**Fix:** Changed return type to return `null` on success or `$Err.DBError(...)` on failure. All callers updated to check return value.

---

## Low Findings (Documented Only)

### 8. `USR_STATUS=1` Magic Number

**Location:** `funcs/task.js` — `isValidAssignee()`, `resolveDefaultAssignee()`

**Assessment:** The literal `1` for active user status is consistent with the entire existing codebase (`call.js`, `user.js`, etc.). No project-wide `$Const.USER_STATUS_ACTIVE` exists. Changing only the task module would be inconsistent. Documented in `docs/issues-questions/task-audit.md`.

---

## Informational (Documented Only)

### 9. `approve_task` ACL Semantics — Resolved

**Location:** `api/task.js` — `"@acl": [$ACL.USER_TYPE_ADMIN, $ACL.USER_ROLE_PLANNING, ...]`

**Assessment:** Confirmed ACL uses OR semantics. Any admin can approve, and any user with PLANNING/LOGISTICS/FINANCE roles can also approve. This is the intended behavior — all admins have approval privileges, and the role entries extend approval to non-admin role holders.

---

## Convention Compliance Verification

### Code Style
| Criterion | Status |
|-----------|--------|
| Tab indentation (4-space display width) | ✅ Pass |
| Allman brace style | ✅ Pass |
| Object literals remain on same line | ✅ Pass (API def, response objects) |
| Module exports class pattern | ✅ Pass |
| Constructor with session | ✅ Pass |
| Helper functions outside class | ✅ Pass |

### Database Query Review
| Criterion | Status |
|-----------|--------|
| No queries inside loops | ✅ Pass (fixed) |
| Parameterized queries (`?` placeholders) | ✅ Pass |
| `IN (${ids.toPlaceholders()})` for arrays | ✅ Pass |
| Multi-value INSERT with placeholders | ✅ Pass |
| LIMIT/OFFSET bounded and numeric | ✅ Pass |
| No DB functions for JS-computable work | ✅ Pass (fixed) |

### Transaction Review
| Criterion | Status |
|-----------|--------|
| All SELECTs before `beginTransaction()` | ✅ Pass (restructured) |
| Transactions contain only writes | ✅ Pass |
| `$Db.isError()` after every write | ✅ Pass (fixed) |
| Rollback on error | ✅ Pass |
| Commit on success | ✅ Pass |

### Soft Deletion Review
| Criterion | Status |
|-----------|--------|
| No `DELETE FROM` on business tables | ✅ Pass |
| All SELECTs filter `*_DELETED_ON IS NULL` | ✅ Pass |
| Task, comment, and media tables all have soft-delete columns | ✅ Pass |

### API Response Mapping
| Criterion | Status |
|-----------|--------|
| No raw DB field names in responses | ✅ Pass |
| Clean snake_case field names | ✅ Pass |
| `mapTaskRow()` consistently maps all responses | ✅ Pass |

### Error Code Usage
| Criterion | Status |
|-----------|--------|
| Unique RC values (590–601) | ✅ Pass |
| Defined in `errorcodes.en.js` | ✅ Pass |
| Appropriate error for each validation failure | ✅ Pass |
| `$Err.DBError()` for DB failures | ✅ Pass |

### Data Item Usage
| Criterion | Status |
|-----------|--------|
| No hardcoded enum arrays | ✅ Pass |
| `$DataItems.isValidItemId()` for validation | ✅ Pass |
| `$DataItems.define()` in module init | ✅ Pass (`task_utils.__initialize()`) |
| `$DataItems.getItemName()` for display names | ✅ Pass |
| `$DataItems.getListForApiDoc()` in API docs | ✅ Pass |
| `$DataItems.filterItemsIdByAttr()` for queries | ✅ Pass |
| MIME validation via `$DataItems.isValidItemId()` | ✅ Pass |

### Security & Parameterization
| Criterion | Status |
|-----------|--------|
| All user input uses `?` placeholders | ✅ Pass |
| Sort column/direction validated against whitelist | ✅ Pass |
| LIMIT/OFFSET bounded numerics (not raw user input) | ✅ Pass |
| File IDs validated against `file` table | ✅ Pass |
| MIME types validated via data items | ✅ Pass |
| Role checks use `$UserRoles.doesUserHaveRole()` | ✅ Pass |

### Performance & N+1 Review
| Criterion | Status |
|-----------|--------|
| List query uses JOINs for related data | ✅ Pass |
| Comments fetched with JOIN (no per-row query) | ✅ Pass (fixed) |
| Separate count + data queries for pagination | ✅ Pass |
| Bulk INSERT for media files | ✅ Pass |
| Transactions kept minimal (writes only) | ✅ Pass |

---

## Registration & Configuration

| Item | Status |
|------|--------|
| `task` in `using_api.js` | ✅ Registered |
| `task_utils` in `using_modules.js` (user array) | ✅ Registered |
| Error codes 590–601 unique and sequential | ✅ Verified |
| Data item JSON files in `platform/data/` | ✅ All present |
| `task_type.json` DB-backed with cache_ttl | ✅ Correct |

---

## Unresolved Questions

See `docs/issues-questions/task-audit.md` for:
1. ~~ACL OR-vs-AND semantics for `approve_task`~~ — Resolved: OR semantics confirmed, current behavior is intended
2. `USR_STATUS=1` magic number (low priority)
3. `NULL_USER_ID` queue placeholder (deferred)
