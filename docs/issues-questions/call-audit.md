# Call Module — Audit Blockers & Questions

Items requiring your decision before further refactoring. Please provide inline answers so I can apply the resolution in the next iteration.

---

### 1. Tabs vs Spaces — Project-Wide Conflict

**Rule:** `brain.md` §Code Style mandates:
> Indentation: Use **tab characters** (displayed at 4-space width). Never use spaces for indentation.

**Conflict:** Every existing file in the project uses 4-space indentation (0 tab characters). Verified across `funcs/officer.js`, `funcs/admin_user.js`, `funcs/resident.js`, `funcs/notification.js`, `funcs/settings.js`, and all `api/` modules.

**Impact:** Converting only `api/call.js` and `funcs/call.js` to tabs would make these two files inconsistent with every other module in the codebase. Conversely, keeping them as spaces violates the documented convention.

**Options:**
- **A)** Convert the call module files to tabs now (creates cross-module inconsistency).
- **B)** Keep spaces for now and schedule a project-wide conversion later.
- **C)** Update `brain.md` to reflect the actual 4-space convention used across the codebase.

**Decision:** Both tabs and 4-spaces are acceptable. Tabs are preferred when practical, but no extra work needed to convert existing files. **Resolved — no action required on call module files.**

---

### 2. `JSON_CONTAINS` in WHERE clause — "Database Calls for Data Only" rule

**Rule:** `brain.md` §Database Calls for Data Only says:
> Database calls should ONLY be used for accessing or modifying database data. Never use database calls to compute or transform data.
> - ❌ `SELECT JSON_OVERLAPS(?, ?)` — use JavaScript array methods instead

**Current code:** `funcs/call.js` line ~414 uses `JSON_CONTAINS` inside a WHERE clause to filter out passed calls:
```sql
NOT JSON_CONTAINS(SVC_PASSED_BY, ?)
```

**Analysis:** The `brain.md` examples (JSON_OVERLAPS, JSON_MERGE_PRESERVE) are standalone SELECT queries that compute/transform data already available in JS. Our usage is a **WHERE filter** on a paginated query — the data is NOT yet in JS memory. Moving this to JS would require fetching all emergency calls first, then filtering and manually re-paginating, which is worse for performance and pagination correctness.

**Recommendation:** Keep `JSON_CONTAINS` in the WHERE clause. This is a data retrieval filter, not a compute/transform pattern.

**Decision:** Approved. `JSON_CONTAINS` in WHERE clauses is permitted as a data retrieval filter. Clarification added to `brain.md` §Database Calls for Data Only. **Resolved — no action required.**

---

### 3. `$Db.isError()` checking — inconsistent across methods

**Rule:** `code_review_checklist.md` says: "Every query checks `$Db.isError()`."

**Current code:** Most INSERT/UPDATE calls check `$Db.isError()`, but several SELECT queries do not (e.g., `fetchCallRecord`, `getOfficerCommunityId`, `getActiveAdminIds`, `getOfficerIdsInCommunity`, `getUserName`). This is consistent with the existing codebase pattern (e.g., `funcs/officer.js` also skips `$Db.isError()` on SELECTs).

**Question:** Should `$Db.isError()` be checked after every SELECT query as well, or does the existing codebase convention (check only after INSERT/UPDATE/DELETE) prevail?

**Decision:** `$Db.isError()` should NOT be called after SELECT — SELECT never causes a DB error, so the check is unnecessary. Only call `$Db.isError()` after INSERT/UPDATE/DELETE. Clarification added to `brain.md`. **Resolved — no action required.**
