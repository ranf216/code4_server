# Task Module — Deferred Requirements

**Created:** 2026-08-13  
**Module:** `platform/api/task.js`, `platform/funcs/task.js`

---

## 1. ETA Integration with GPS Tracking (SDS 4.6.3)

**Requirement:** The ETA field should be auto-calculated based on the assigned officer's GPS location and the task address.

**Current behavior:** ETA is a manually-set datetime field (`TSK_ETA`), entered by admins only.

**Dependencies:** GPS Tracking module (Phase 5.3), Geolocation service (`$Geolocation`).

**Implementation notes:** Once GPS tracking is available, add an auto-ETA calculation option that uses `$Geolocation.getTimeAndDistanceToDestination()` when a task has an address and the assignee has a recent GPS location.

---

## 2. Vendor / External User Assignment

**Requirement (SDS 4.6.4):** Tasks can be assigned to external vendors (not just officers/admins).

**Current behavior:** Tasks can only be assigned to existing active users in the system (validated via `isValidAssignee`).

**Dependencies:** Vendor/external user management module (not yet designed).

**Implementation notes:** When vendor management is implemented, extend `isValidAssignee()` to include vendor users, and add a `TSK_VENDOR_ID` column if vendors are tracked separately from system users.

---

## 3. Task Templates / Recurring Tasks

**Requirement:** Ability to create task templates for common maintenance activities, and schedule recurring tasks.

**Current behavior:** Not implemented. Each task is created manually.

**Dependencies:** Timed messages infrastructure (`$TimedMessages`), template storage.

**Implementation notes:** Could use a `task_template` table with pre-filled fields, and a cron job that generates tasks from templates on a schedule.

---

## 4. Task Statistics & Dashboard Integration (SDS 4.5.2)

**Requirement:** Dashboard section showing open task count, recent tasks sorted by priority, task totals by type and status.

**Current behavior:** Not implemented. The `get_tasks_list` API provides filtered listing but no aggregate statistics.

**Dependencies:** Dashboard module (Phase 8.1).

**Implementation notes:** Add a `get_task_statistics` API endpoint that returns aggregate counts by status, type, and priority. Can be built as a read-only endpoint using SQL aggregate queries.

---

## 5. Approval Workflow Integration (SDS 4.6.3)

**Requirement:** Tasks that require logistics/finance/planning approval should be routed to the appropriate role-based user before completion.

**Current behavior:** The `approved` status exists in the task lifecycle but there is no automated routing logic. The status can be set manually via `update_task` (by changing to a specific status in a future extension).

**Dependencies:** Role-based routing logic, potentially a separate approval workflow module.

**Implementation notes:** Add an optional `requires_approval` flag or `approval_role` field to tasks. When a task requires approval, after acceptance it would be routed to the appropriate role for status change to `approved` before completion is allowed.

---

## 6. Task History / Auto-Archive (SDS 3.8.3.1)

**Requirement:** Closed tasks move to history 24 hours after closure. Canceled tasks move immediately.

**Current behavior:** Filtering by `is_open=false` shows closed tasks. There is no separate "history" table or auto-archive mechanism.

**Dependencies:** Cron job infrastructure.

**Implementation notes:** Client-side filtering by status and `completed_on`/`rejected_on`/`canceled_on` timestamps is sufficient for now. A server-side archive cron can be added later if needed.

---

## 7. File Type Restrictions / Video Duration Limit

**Requirement (SDS 3.8.1):** Videos limited to 1 minute. Images limited to 5 per upload.

**Current behavior:** Image count limit (5 per upload) is enforced. Video count limit (1 per upload) is enforced. Video duration is NOT validated server-side.

**Dependencies:** Media processing library for duration validation.

**Implementation notes:** Video duration validation should be handled client-side (pre-upload). Server-side validation would require `ffprobe` or similar — deferred unless needed.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/task.js` | API endpoint definitions |
| `backend/platform/funcs/task.js` | Business logic implementation |
| `backend/platform/data/task_status.json` | Task status $DataItems |
| `backend/platform/data/task_priority.json` | Task priority $DataItems |
| `backend/platform/data/task_type.json` | Task type $DataItems (DB-backed) |
| `db/db.sql` | Task tables schema (task, task_comment, task_media) |
| `db/UpgradeDB.sql` | V 4.5.0 migration script |
