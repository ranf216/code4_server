# Shift Module Audit — Issues & Questions

## 1. `publish_shift()` Validation Loop — DB Queries Inside Loop

**File:** `backend/platform/funcs/shift.js`, `publish_shift()` (lines ~832-848)
**Rule:** brain.md CRITICAL — "Never place `$Db.executeQuery()` inside `for`, `while`, `forEach`, or `.map()` loops"

**Code:**
```js
for (let i = 0; i < officerIds.length; i++)
{
	let validationResult = this._runAllocationValidation(shift, officerIds[i]);
	if (validationResult && validationResult.has_conflicts)
	{
		let officerName = getUserName(officerIds[i]);
		// ...
	}
}
```

**Analysis:** `_runAllocationValidation()` makes 3-4 DB queries per officer (double-booking, rest gap, weekly hours, post eligibility). `getUserName()` adds another SELECT. For a shift with N officers, this produces 4-5N queries.

**Conflict:** The existing code comment states "officer count per shift is typically small (2-10)" and considers the loop acceptable. However, the checklist rule is stated as absolute — no exceptions for small counts.

**Batching feasibility:** Possible but requires significant restructuring. Each validation query currently filters by a single officer ID; rewriting to use `IN (${officerIds.toPlaceholders()})` and then partitioning results in memory would change the method signature, eliminate the shared `_runAllocationValidation()` method used by `allocate_officer()` and `validate_allocation()`, and significantly increase code complexity.

**Decision:** Deferred. Documenting as a known deviation. Recommend refactoring only when a concrete performance issue is observed, or when the batch-validation pattern is established elsewhere in the codebase.

---

## 2. Cron Job DB Queries Inside Result-Set Loops

**Files:**
- `backend/platform/jobs/cron_shift_lifecycle_check.js` — loops stale check-ins (UPDATE per row), loops active shifts (SELECT + UPDATE per row)
- `backend/platform/jobs/cron_shift_reminders.js` — loops shifts, runs per-shift officer/notification queries

**Rule:** brain.md CRITICAL — "Never place `$Db.executeQuery()` inside loops"
**Exception:** brain.md — "Cron result-set loops are accepted when necessary for background processing"

**Decision:** No action needed. The cron exception explicitly covers this pattern. Each loop iteration operates on a different record with different conditions, making batch operations impractical without significant added complexity.

---

## 3. `funcs/settings.js` and `api/settings.js` Use Spaces Instead of Tabs

**Files:** `backend/platform/funcs/settings.js`, `backend/platform/api/settings.js`
**Rule:** brain.md — "Tab (displayed at 4-space width) indentation"

**Analysis:** Both settings files use 4-space indentation throughout (296 and 198 space-indented lines respectively). This is a pre-existing file-level convention — other established modules (`funcs/call.js`, `funcs/community.js`, `api/call.js`, `api/community.js`) also use spaces. The shift settings sections (added during the Shift module implementation) follow the host file's existing style to maintain intra-file consistency.

**Conflict:** Converting only the shift settings section to tabs would create a mixed-indentation file. Converting the entire file exceeds the shift audit scope and risks unnecessary diff churn across all settings endpoints.

**Decision:** No change made. Recommend addressing file-level indentation normalization as a separate whole-codebase standardization effort.

---

## 4. `repeat_on` API Parameter Type — `a` vs `n` — RESOLVED

**File:** `backend/platform/api/shift.js`, `create_recurring_shifts` definition (line 199)
**Rule:** code_review_checklist.md — "`n` only for genuine arrays of numbers"

**Fix:** Changed type code from `o:a:***` to `o:n:***`. The array carries numeric day-of-week indices (0-6), so `n` is the correct type to signal to client developers that they must send an array of numbers.

---

## 5. `getUserName()` N+1 Pattern in Publish Validation — RESOLVED

**File:** `backend/platform/funcs/shift.js`, `publish_shift()`
**Rule:** brain.md CRITICAL — "Never place `$Db.executeQuery()` inside loops"

**Fix (two parts):**

1. **DRY violation:** Three identical `getUserName()` functions existed in `funcs/call.js`, `funcs/shift.js`, and `funcs/task.js`. Created a shared `$Funcs` user module (`backend/platform/user_modules/funcs.js`) with `getUserName(userId)` and a batch `getUserNames(userIds)`. Removed the local copies from all three funcs files. Registered in `using_modules.js`.

2. **N+1 fix:** `publish_shift()` now calls `$Funcs.getUserNames(officerIds)` once before the validation loop to batch-fetch all officer names in a single query, then looks up names from the returned map inside the loop instead of issuing per-officer SELECTs.
