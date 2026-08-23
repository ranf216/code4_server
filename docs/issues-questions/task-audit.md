# Task Module Audit — Issues & Questions

## 1. `approve_task` ACL Semantics — RESOLVED

**File:** `backend/platform/api/task.js`, line 67  
**Code:**
```js
"@acl": [$ACL.USER_TYPE_ADMIN, $ACL.USER_ROLE_PLANNING, $ACL.USER_ROLE_LOGISTICS, $ACL.USER_ROLE_FINANCE],
```

**Resolution:** ACL array uses **OR** semantics. The current behavior is:
- Any admin user can approve (regardless of role), OR
- Any user (of any type) with PLANNING, LOGISTICS, or FINANCE role can approve

This means all admins have approval privileges. The role entries extend approval to non-admin users who hold those specific roles. This is the intended behavior — no change needed.

---

## 2. `USR_STATUS=1` Magic Number — RESOLVED

**Files:** `backend/platform/funcs/task.js`, `isValidAssignee()` and `resolveDefaultAssignee()`

**Resolution:** Replaced literal `1` with `$Const.USER_STATUS_ACTIVE` (defined in `backend/platform/definitions/constants.js` line 14). All three occurrences updated to use parameterized `?` with the constant value.

---

## 3. `NULL_USER_ID` Queue Placeholder — Not Implemented

**File:** `backend/platform/funcs/task.js`, `resolveDefaultAssignee` function  

**Issue:** When no default assignee can be resolved (no community manager, no system super-admin), the implementation returns `ERR_TASK_ASSIGNEE_NOT_FOUND`. The user previously proposed a `NULL_USER_ID` queue placeholder for unassigned tasks, but this was not implemented.

**Decision:** Intentionally deferred. The null-user convention must be verified at the project level before introducing it. Documented in `docs/deferred_requirements/04-task-enhancements.md`.

**No action needed now** unless the user explicitly requests this fallback.
