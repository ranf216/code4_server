# POI Audit — Blocked Refactors and Conflicting Rules

**Date:** 2025-01-20
**Context:** Convention audit of POI module per `docs/.rules/brain.md` and `docs/.rules/code_review_checklist.md`

---

## ~~1. Entity Lock Guard Cannot Be Added to POI Lifecycle Cron~~ — RESOLVED

**Status:** Fixed. `entity_lock` enabled in `using_modules.js`; lock guard added to `doPoiLifecycleCheck()`.

**Changes applied:**
- `backend/platform/config/using_modules.js` — uncommented `"entity_lock"` (and `"export"` which was also needed for `$Export.generate()` in `export_poi_record`)
- `backend/platform/jobs/cron_poi_lifecycle_check.js` — `doPoiLifecycleCheck()` now acquires `$EntityLock.acquire("cron", "cron_poi_lifecycle", "system", 300)` before processing and releases on every exit path

**Prerequisite:** The `entity_lock` database table and stored procedures (`prc_entity_lock_acquire`, `prc_entity_lock_release`) must exist in the database. Verify before deployment.

---

## ~~2. Cron Notification Dedup Uses Fragile SQL String Parsing~~ — RESOLVED

**Status:** Fixed. Replaced `SUBSTRING_INDEX` with `JSON_EXTRACT` (MySQL 8+). Also parameterized the `NTF_TYPE` literal.

**Changes applied:**
- `backend/platform/jobs/cron_poi_lifecycle_check.js` — `sendExpiryReminders()` dedup query now uses:
  ```sql
  SELECT DISTINCT JSON_EXTRACT(NTF_PAYLOAD, '$.entity_id') poi_id
  FROM `notification`
  WHERE NTF_TYPE=?
    AND NTF_CREATED_ON >= ?
    AND NTF_DELETED_ON IS NULL
  ```

---

## ~~3. Documentation Stale Annotations in `project_dev.md`~~ — RESOLVED

**Status:** Fixed. Stale "(deferred)" annotations cleaned up; settings item marked partially complete.

**Changes applied:**
- `docs/project_dev.md` §6.2:
  - Line 1042: removed "(deferred)" from PDF export description
  - Line 1081: replaced "(scheduler deferred)" with cron reference for expired status
  - Lines 1138–1139: replaced "(scheduler deferred)" with "(via lifecycle cron)" for notification types
  - Line 1186: replaced "POI settings management API" with "POI settings guidance version notes" (core API is done)
- `docs/deferred_requirements/08-poi-enhancements.md`:
  - Item 6 marked as "Partially Complete (Core API Done)" — `get_poi_settings` / `update_poi_settings` checked off
  - Remaining sub-bullet: guidance text version notes (audit logging enhancement)
