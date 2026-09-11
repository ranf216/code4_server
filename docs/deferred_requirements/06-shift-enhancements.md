# Shift Module — Deferred Requirements

**Created:** 2026-09-09
**Module:** `platform/api/shift.js`, `platform/funcs/shift.js`

---

## 1. Post Permissions Validation — Equipment (SDS 4.7.3.2, Asset Deferred §4)

**Status:** Partially implemented. Roles and badges are validated via set-intersection in `_runAllocationValidation()` and `assign_post()`.

**Remaining:** Equipment validation is deferred — the `officer` table does not have an `OFC_EQUIPMENT` column. When this column is added, extend `$ShiftUtils.getOfficerCapabilities()` and `validatePostEligibility()` to include equipment checks.

---

## ~~2. Shift Starting Soon Reminder (SDS 4.7.4)~~ — IMPLEMENTED

Implemented as `cron_shift_reminders.js` with configurable `shift_starting_soon_lead_mins` setting.

---

## 3. AI Patrol Route Generation (SDS 4.8.1)

**Requirement:** When a shift is published, automatically generate a recommended patrol route for each allocated officer. Also available on-demand via the Shift Details panel.

**Current behavior:** Not implemented. Route module (Phase 5.2) handles route generation separately.

**Dependencies:** Route module (Phase 5.2), AI engine, community map data.

---

## 4. Allocation Board Drag-and-Drop Conflict Auto-Check

**Requirement:** When a manager drops an officer onto a shift in the allocation board, automatically run `validate_allocation` and display inline warnings before confirming.

**Current behavior:** `get_allocation_board` returns data and `validate_allocation` is a separate API. Conflict checking is on-demand, not automatic during drag.

**Dependencies:** Client-side implementation. Server APIs are already in place.

---

## 5. Recurring Shift Edit — Detach from Series

**Requirement (SDS 4.7.2.1 note):** When editing a recurring shift with scope "this_only", the shift should be detached from the series (`SFT_SERIES_ID` set to NULL) if it diverges significantly.

**Current behavior:** `update_recurring_shifts` with `this_only` scope updates only the target shift but keeps `SFT_SERIES_ID`. No detachment logic.

**Implementation notes:** Add an option to detach after update (clear `SFT_SERIES_ID`). Consider whether this should be automatic or explicit.

---

## 6. Shift Summary / Report Generation (SDS 4.7.2.2)

**Requirement:** When a shift is completed, a shift summary is automatically generated including officer hours, posts visited, incidents, and compliance data.

**Current behavior:** Shift transitions to `completed` status. No summary document is generated.

**Dependencies:** Report module (Phase 7.1), analytics infrastructure.

---

## 7. Active Call Checks — Shift Module

**Requirement:** Block officer removal from an active shift if the officer is currently responding to an emergency call within that shift.

**Current behavior:** Officers can be removed from active shifts (Q6 resolution). Auto-closes open check-in records. Does not check active call status.

**Dependencies:** Call module integration for real-time call status.

---

## ~~8. Community Deletion Guard~~ — IMPLEMENTED

Implemented via `$ShiftUtils.communityHasActiveShifts()` in `community.js → delete_community()`. Error code `ERR_COMMUNITY_HAS_ACTIVE_SHIFTS (507)`.

---

## 9. Batch Allocation Validation — Eliminate N+1 in `publish_shift()`

**Rule violated:** brain.md CRITICAL — "Never place `$Db.executeQuery()` inside `for`, `while`, `forEach`, or `.map()` loops"

**Current behavior:** `publish_shift()` iterates over allocated officers and calls `_runAllocationValidation()` per officer (3-4 DB queries each) plus `getUserName()` (1 DB query each), producing 4-5N queries for N officers.

**Required refactor:**
1. Pre-fetch all officer names in a single batch query using `IN (${officerIds.toPlaceholders()})`.
2. Rewrite the three validation queries (double-booking, rest gap, weekly hours) to accept all officer IDs at once and return results keyed by officer ID.
3. Partition results in memory per officer and assemble warnings.
4. Preserve the single-officer path used by `allocate_officer()` and `validate_allocation()` — either keep a single-officer wrapper that calls the batch method with a one-element array, or maintain both signatures.

**Accepted for now:** Officer counts per shift are typically small (2-10), so the real-world query count is bounded. Documented in `docs/issues-questions/shift-audit.md` items 1 and 5.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/shift.js` | API endpoint definitions |
| `backend/platform/funcs/shift.js` | Business logic implementation |
| `backend/platform/user_modules/shift_utils.js` | Shared shift utilities ($ShiftUtils) |
| `backend/platform/api/settings.js` | Shift settings API (get/update) |
| `backend/platform/funcs/settings.js` | Shift settings implementation |
| `backend/platform/jobs/cron_shift_lifecycle_check.js` | Auto-close stale check-ins, auto-complete shifts |
| `backend/platform/jobs/cron_shift_reminders.js` | Starting-soon push notifications |
| `backend/platform/data/shift_status.json` | Shift status $DataItems |
| `backend/platform/data/shift_recurrence_pattern.json` | Recurrence pattern $DataItems |
| `backend/platform/data/shift_recurrence_end_type.json` | Recurrence end type $DataItems |
| `backend/platform/data/shift_update_scope.json` | Update scope $DataItems |
| `db/db.sql` | Table schemas (shift, shift_series, shift_officer, shift_post, shift_checkin) |
| `db/UpgradeDB.sql` | Phase 5.1 migration script |
