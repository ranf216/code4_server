# Shift Module — Issues & Questions

**Created:** 2026-09-09
**Module:** Phase 5.1 — Shift Management

---

## Questions (All Resolved)

All 10 original design questions have been resolved and implemented as described below.

---

## Resolved Decisions

| # | Decision | Resolution |
|---|----------|------------|
| R1 | Notification pattern | Follow Task module pattern: `$executeAPI(session, "Notification/create_bulk_notifications", ...)` after transaction commit |
| R2 | Soft delete on shift_checkin | No `DELETED_ON` column — check-in records are an audit trail and should not be deleted |
| R3 | Overnight shift handling | `SFT_IS_OVERNIGHT` flag with `end_time <= start_time` detection; conflict queries account for date spanning |
| R4 | Recurring shift independence | Each generated shift is a standalone `draft` record linked by `SFT_SERIES_ID`; can be individually published/cancelled/updated |
| R5 | `shift_post` table column prefix | Using `SHP_` (not `SFP_`) to match the existing reference in `asset.js → postHasShiftHistory()` which queries `SHP_PST_ID` |
| Q1 | Double-booking | **Warn-Only with Manager Override** for allocation/publication (`acknowledge_conflicts: true`); **Hard-Block** for concurrent active check-ins (`ERR_SHIFT_ALREADY_CHECKED_IN`) |
| Q2 | Lifecycle transitions | **Hybrid**: event-driven transitions (check-in → active, check-out → completed) + `cron_shift_lifecycle_check.js` for auto-closing stale check-ins and auto-completing shifts past grace period |
| Q3 | Maximum weekly hours | Configurable via `settings:shift → max_weekly_hours` (default 48). Used in `_runAllocationValidation()` |
| Q4 | Minimum rest gap | Configurable via `settings:shift → min_rest_gap_hours` (default 8). Used in `_runAllocationValidation()` |
| Q5 | Post eligibility | Set-intersection validation against `PST_PERMISSIONS` JSON using `OFC_ROLES` and `OFC_CERTIFICATION_BADGES`. Implemented in `validate_allocation` and `assign_post`. Equipment deferred (column not in schema). |
| Q6 | Officer removal (active shifts) | Allowed; auto-closes open check-in with `SFC_NOTES` explanation and notifies the officer |
| Q7 | No-end recurring shifts | Rolling 90-day horizon (`ROLLING_HORIZON_DAYS`), max 365 occurrences retained |
| Q8 | Admin calendar access | Non-super admins scoped by `USD_COM_ID`; Super Admins see all. Gracefully allows all if `USD_COM_ID` is NULL |
| Q9 | Starting-soon reminders | `cron_shift_reminders.js` — checks published shifts within configurable lead window; deduplicates via 2-hour notification lookback |
| Q10 | Community deletion guard | `$ShiftUtils.communityHasActiveShifts()` integrated into `community.js → delete_community()` with `ERR_COMMUNITY_HAS_ACTIVE_SHIFTS (507)` |
