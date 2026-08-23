# Task (Maintenance) Module — Architectural Specification

**Module:** Phase 3.2 — Task API  
**Version:** 4.5.0  
**Last Updated:** 2026-08-23

---

## 1. Overview

The Task module provides a complete maintenance-task lifecycle within the Code4 Axis Security Operations Platform. It allows administrators and field officers to create, assign, track, approve, complete, reject, and cancel maintenance tasks scoped to communities. The module integrates with the platform's notification system, file storage, role-based ACL infrastructure, and `$DataItems` registry.

### Module Files

| File | Purpose |
|------|---------|
| `backend/platform/api/task.js` | API endpoint definitions |
| `backend/platform/funcs/task.js` | Business logic implementation |
| `backend/platform/user_modules/task_utils.js` | Cross-module utility functions |
| `backend/platform/data/task_status.json` | Status enum ($DataItems, static) |
| `backend/platform/data/task_priority.json` | Priority enum ($DataItems, static) |
| `backend/platform/data/task_type.json` | Type registry ($DataItems, DB-backed, cached) |
| `backend/platform/data/task_approval_types.json` | Task types requiring approval ($DataItems, static) |
| `backend/platform/data/task_allowed_document_mimes.json` | Allowed document MIME types ($DataItems, static) |

### Registration

- **API:** Registered as `"task"` in `backend/platform/config/using_api.js`.
- **User Module:** `task_utils` registered in the `user` array of `backend/platform/config/using_modules.js`, exposed globally as `$TaskUtils`.

---

## 2. Table Definitions & Schema

### 2.1 `task` (Prefix: `TSK_`)

The primary entity table for maintenance tasks.

```sql
CREATE TABLE `task` (
  `TSK_ID`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `TSK_COM_ID`      bigint unsigned NOT NULL     COMMENT 'Community this task belongs to',
  `TSK_TYPE`        varchar(100)    NOT NULL     COMMENT 'data_item task_type key',
  `TSK_STATUS`      varchar(20)     NOT NULL DEFAULT 'new'
                                                 COMMENT 'new, accepted, approved, completed, rejected, canceled',
  `TSK_PRIORITY`    varchar(20)     NOT NULL DEFAULT 'normal'
                                                 COMMENT 'urgent, important, normal, low',
  `TSK_DESCRIPTION` varchar(500)    NOT NULL DEFAULT '',
  `TSK_ADDRESS`     varchar(500)    DEFAULT NULL,
  `TSK_CREATED_BY`  varchar(128)    NOT NULL     COMMENT 'User who created the task',
  `TSK_ASSIGNED_TO` varchar(128)    NOT NULL     COMMENT 'User currently assigned to the task',
  `TSK_ACCEPTED_BY` varchar(128)    DEFAULT NULL COMMENT 'User who accepted the task',
  `TSK_ETA`         datetime        DEFAULT NULL COMMENT 'Scheduled ETA set by manager',
  `TSK_ACCEPTED_ON` datetime        DEFAULT NULL,
  `TSK_COMPLETED_ON` datetime       DEFAULT NULL,
  `TSK_REJECTED_ON` datetime        DEFAULT NULL,
  `TSK_CANCELED_ON` datetime        DEFAULT NULL,
  `TSK_CREATED_ON`  datetime        NOT NULL,
  `TSK_LAST_UPDATE` datetime        DEFAULT NULL,
  `TSK_DELETED_ON`  datetime        DEFAULT NULL,
  PRIMARY KEY (`TSK_ID`),
  KEY `IX_TSK_COM_ID`       (`TSK_COM_ID`),
  KEY `IX_TSK_STATUS`       (`TSK_STATUS`),
  KEY `IX_TSK_CREATED_BY`   (`TSK_CREATED_BY`),
  KEY `IX_TSK_ASSIGNED_TO`  (`TSK_ASSIGNED_TO`),
  KEY `IX_TSK_CREATED_ON`   (`TSK_CREATED_ON`),
  CONSTRAINT `FK_TSK_COM_ID`      FOREIGN KEY (`TSK_COM_ID`)      REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_TSK_CREATED_BY`  FOREIGN KEY (`TSK_CREATED_BY`)  REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_TSK_ASSIGNED_TO` FOREIGN KEY (`TSK_ASSIGNED_TO`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Index rationale:**
- `IX_TSK_COM_ID` — Community-scoped filtering (officers always query within their community).
- `IX_TSK_STATUS` — Status filtering and open/closed partitioning.
- `IX_TSK_CREATED_BY` — "Created by me" scope filter.
- `IX_TSK_ASSIGNED_TO` — "Assigned to me" scope filter and assignee lookup.
- `IX_TSK_CREATED_ON` — Default sort order (newest first).

**Soft deletion:** All queries filter `TSK_DELETED_ON IS NULL`. No `DELETE FROM task` statements exist.

### 2.2 `task_comment` (Prefix: `TCM_`)

Stores comments on tasks, including system-generated rejection and resolution comments.

```sql
CREATE TABLE `task_comment` (
  `TCM_ID`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `TCM_TSK_ID`     bigint unsigned NOT NULL,
  `TCM_USR_ID`     varchar(128)    NOT NULL     COMMENT 'User who wrote the comment',
  `TCM_TEXT`        text            NOT NULL,
  `TCM_CREATED_ON` datetime        NOT NULL,
  `TCM_DELETED_ON` datetime        DEFAULT NULL,
  PRIMARY KEY (`TCM_ID`),
  KEY `IX_TCM_TSK_ID` (`TCM_TSK_ID`),
  CONSTRAINT `FK_TCM_TSK_ID` FOREIGN KEY (`TCM_TSK_ID`) REFERENCES `task` (`TSK_ID`),
  CONSTRAINT `FK_TCM_USR_ID` FOREIGN KEY (`TCM_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Notes:**
- Comments are append-only. No UPDATE operations exist; only soft-delete via `TCM_DELETED_ON`.
- Fetched with a JOIN to `user_details` for the commenter's display name.

### 2.3 `task_media` (Prefix: `TMD_`)

Stores file attachments linked to tasks (images, video, documents).

```sql
CREATE TABLE `task_media` (
  `TMD_ID`              bigint unsigned  NOT NULL AUTO_INCREMENT,
  `TMD_TSK_ID`          bigint unsigned  NOT NULL,
  `TMD_USR_ID`          varchar(128)     NOT NULL     COMMENT 'User who uploaded the media',
  `TMD_FILE_NAME`       varchar(1000)    NOT NULL,
  `TMD_MEDIA_TYPE`      varchar(20)      NOT NULL DEFAULT 'image'
                                                       COMMENT 'image, video, document',
  `TMD_IS_CONFIRMATION` tinyint unsigned NOT NULL DEFAULT '0'
                                                       COMMENT '1 if this is resolution/confirmation media',
  `TMD_CREATED_ON`      datetime         NOT NULL,
  `TMD_DELETED_ON`      datetime         DEFAULT NULL,
  PRIMARY KEY (`TMD_ID`),
  KEY `IX_TMD_TSK_ID` (`TMD_TSK_ID`),
  CONSTRAINT `FK_TMD_TSK_ID` FOREIGN KEY (`TMD_TSK_ID`) REFERENCES `task` (`TSK_ID`),
  CONSTRAINT `FK_TMD_USR_ID` FOREIGN KEY (`TMD_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Notes:**
- `TMD_FILE_NAME` stores the internal filename (as returned by the `file` table), not the original upload name.
- `TMD_IS_CONFIRMATION` distinguishes between initial task media (attached at creation) and resolution/completion media (attached when completing or adding confirmation evidence).
- Media is inserted in bulk using parameterized multi-value `INSERT` to avoid per-row queries.

### 2.4 Foreign Key Diagram

```
community (COM_ID) ─────┐
                         │
user (USR_ID) ─┬─────── task (TSK_ID) ──┬── task_comment (TCM_ID)
               │    FK_TSK_COM_ID ───────┘       │
               │    FK_TSK_CREATED_BY            FK_TCM_TSK_ID
               │    FK_TSK_ASSIGNED_TO           FK_TCM_USR_ID
               │                                  │
               └──── task_media (TMD_ID) ─────────┘
                     FK_TMD_TSK_ID
                     FK_TMD_USR_ID
```

---

## 3. Data Items ($DataItems)

### 3.1 Task Status (`task_status.json`) — Static

| Key | Display Name | `is_open` | Constant |
|-----|-------------|-----------|----------|
| `new` | New | `true` | `$Const.TASK_STATUS_NEW` |
| `accepted` | Accepted | `true` | `$Const.TASK_STATUS_ACCEPTED` |
| `approved` | Approved | `true` | `$Const.TASK_STATUS_APPROVED` |
| `completed` | Completed | `false` | `$Const.TASK_STATUS_COMPLETED` |
| `rejected` | Rejected | `false` | `$Const.TASK_STATUS_REJECTED` |
| `canceled` | Canceled | `false` | `$Const.TASK_STATUS_CANCELED` |

The `is_open` attribute is used to partition statuses into open (active) and closed (terminal) groups. `$DataItems.filterItemsIdByAttr("is_open", true/false, TABLE_STATUS)` returns the appropriate subset.

### 3.2 Task Priority (`task_priority.json`) — Static

| Key | Display Name | Constant |
|-----|-------------|----------|
| `urgent` | Urgent | `$Const.TASK_PRIORITY_URGENT` |
| `important` | Important | `$Const.TASK_PRIORITY_IMPORTANT` |
| `normal` | Normal | `$Const.TASK_PRIORITY_NORMAL` |
| `low` | Low | `$Const.TASK_PRIORITY_LOW` |

### 3.3 Task Type (`task_type.json`) — DB-Backed

```json
{
    "source": "db",
    "cache": true,
    "cache_ttl": 10
}
```

Task types are managed through the `DataItem/` CRUD APIs and stored in the `data_item` table. The cache TTL of 10 minutes means new types are visible within 10 minutes of creation without a server restart.

Example task types: `maintenance`, `supply_request`, `damaged_equipment`, `inspection`, `cleaning`.

### 3.4 Task Approval Types (`task_approval_types.json`) — Static

| Key | Display Name |
|-----|-------------|
| `supply_request` | Supply Request |
| `damaged_equipment` | Damaged Equipment |

This table defines which task types require administrative approval before they can be completed. The `approve_task` endpoint checks `$DataItems.isValidItemId(task.TSK_TYPE, TABLE_APPROVAL_TYPES)` to verify the task type is approval-eligible.

### 3.5 Allowed Document MIME Types (`task_allowed_document_mimes.json`) — Static

| MIME Type | Display Name |
|-----------|-------------|
| `application/pdf` | PDF Document |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Excel Spreadsheet |
| `text/csv` | CSV File |
| `text/plain` | Text File |
| `image/png` | PNG Image |
| `image/jpeg` | JPEG Image |

When `document_file_ids` are provided, the server queries each file's `FIL_MIME_TYPE` from the `file` table and validates it against this whitelist using `$DataItems.isValidItemId(fileMimeType, TABLE_ALLOWED_DOC_MIMES)`. If any file fails validation, the request is rejected with `ERR_INVALID_FILE_TYPE` (rc: 324).

---

## 4. Status Lifecycle & State Machine

```
                            ┌──────────────┐
                            │     new      │
                            └──────┬───────┘
                                   │ accept_task
                            ┌──────▼───────┐
                   ┌────────│   accepted   │────────┐
                   │        └──────┬───────┘        │
                   │               │                │
           reject_task     approve_task*      complete_task
                   │               │                │
            ┌──────▼──┐     ┌──────▼───────┐        │
            │ rejected │    │   approved   │        │
            └─────────┘     └──────┬───────┘        │
                                   │                │
                            complete_task           │
                                   │                │
                            ┌──────▼───────┐        │
                            │  completed   │◄───────┘
                            └──────────────┘

            cancel_task can transition from any open status
            (new, accepted, approved) → canceled
```

\* `approve_task` applies only to task types in `task_approval_types` (currently `supply_request` and `damaged_equipment`). Routine task types skip the approved state and go directly from accepted to completed.

### Allowed Transitions

| Endpoint | From Status | To Status | Additional Constraints |
|----------|------------|-----------|----------------------|
| `accept_task` | `new` | `accepted` | Assigns task to current user |
| `approve_task` | `accepted` | `approved` | Task type must be in `task_approval_types`. ACL: admin OR planning/logistics/finance role |
| `complete_task` | `accepted`, `approved` | `completed` | — |
| `reject_task` | `new`, `accepted` | `rejected` | Requires a rejection comment |
| `cancel_task` | any open status | `canceled` | Officers: only their own tasks, only while `new`. Admins: any open task |

---

## 5. Design Decisions — Resolved Issues

### 5.1 Approved Status Role Guards

**Decision:** The `approve_task` endpoint uses declarative ACL to enforce role-based authorization.

**API definition:**
```js
"@acl": [$ACL.USER_TYPE_ADMIN, $ACL.USER_ROLE_PLANNING, $ACL.USER_ROLE_LOGISTICS, $ACL.USER_ROLE_FINANCE],
```

**Semantics:** The `@acl` array uses **OR** evaluation. Any of the following can invoke `approve_task`:
- Any admin user (regardless of specific role).
- Any user holding the Planning role.
- Any user holding the Logistics role.
- Any user holding the Finance role.

**Business logic guard:** Beyond ACL, the `approve_task` implementation enforces:
1. The task must be in `accepted` status (`TSK_STATUS !== $Const.TASK_STATUS_ACCEPTED` returns `ERR_TASK_INVALID_STATUS`).
2. The task type must exist in `task_approval_types` (`$DataItems.isValidItemId(task.TSK_TYPE, TABLE_APPROVAL_TYPES)` — otherwise `ERR_TASK_INVALID_STATUS`).

This two-layer approach ensures that even if a user has ACL access, they cannot approve a task type that does not require approval.

### 5.2 Dynamic Fallback Assignee Resolution

**Decision:** When `create_task` is called without an `assigned_to` parameter, the server resolves a default assignee dynamically.

**Resolution algorithm** (implemented in `resolveDefaultAssignee(communityId)`):

1. **Query active admins in the task's community**, ordered by `USR_CREATED_ON ASC` (oldest first).
2. **Iterate results**, checking `$UserRoles.doesUserHaveRole(userInfo, $Const.USER_ROLE_MANAGER)` for each. Return the first community manager found.
3. **If no community manager exists**, query all active admins system-wide, ordered by `USR_CREATED_ON ASC`.
4. **Iterate results**, checking `$UserRoles.doesUserHaveRole(userInfo, $Const.USER_ROLE_SUPER_ADMIN)`. Return the first super admin found.
5. **If no fallback found**, return `null` → the caller returns `ERR_TASK_ASSIGNEE_NOT_FOUND` (rc: 600).

**Role checking:** Uses `$UserRoles.doesUserHaveRole()` with the user's `USD_TYPE`, `USD_ROLE_ALLOW`, and `USD_ROLE_DENY` bitmask fields. No manual bitwise calculations are performed.

**Active user filtering:** Queries filter by `USR_STATUS=?` using `$Const.USER_STATUS_ACTIVE` and `USD_DELETED_ON IS NULL`.

### 5.3 Strict Document MIME-Type Validation

**Decision:** Document attachments are validated server-side against the allowed MIME whitelist stored in `$DataItems`.

**Validation flow** (in `resolveDocumentFileIds(fileIds)`):

1. Query the `file` table: `SELECT FIL_ID, FIL_FILE_NAME, FIL_MIME_TYPE FROM file WHERE FIL_ID IN (...)`.
2. If any file ID is not found, return `ERR_FILE_NOT_FOUND` (rc: 321).
3. For each file, check `$DataItems.isValidItemId(fileRows[i].FIL_MIME_TYPE, TABLE_ALLOWED_DOC_MIMES)`.
4. If any MIME type is not in the whitelist, return `ERR_INVALID_FILE_TYPE` (rc: 324).

**Currently allowed:** PDF, XLSX, CSV, TXT, PNG, JPEG.

**Note:** Image and video files uploaded via `media_file_ids` and `video_file_id` bypass MIME validation — only `document_file_ids` undergo this check.

### 5.4 PATCH-Like Partial Updates

**Decision:** `update_task` implements a partial-update pattern. Only parameters that are explicitly provided (not `null`/`undefined`) are applied.

**Implementation pattern:**
```js
if (this.$description !== null && this.$description !== undefined)
{
    updates.push("TSK_DESCRIPTION=?");
    params.push(this.$description);
}
```

Each optional field is checked individually. If no fields are provided, the endpoint returns `ERR_SUCCESS` with no database write. If any field is provided, `TSK_LAST_UPDATE` is also set.

**ETA restriction:** The `eta` field can only be set by admin users. Officers receive `ERR_NO_PRIVILEGES` (rc: 103) if they attempt to set it.

---

## 6. Transaction & Error Handling Patterns

### 6.1 Transaction Boundaries

The following endpoints use explicit transactions (`$Db.beginTransaction()` / `$Db.commitTransaction()`):

| Endpoint | Writes in Transaction |
|----------|----------------------|
| `create_task` | INSERT task + INSERT media (up to 3 bulk inserts: images, video, documents) |
| `reject_task` | INSERT comment + UPDATE task status |
| `complete_task` | INSERT comment + INSERT confirmation media + UPDATE task status |
| `add_task_comment` | INSERT comment + UPDATE task `TSK_LAST_UPDATE` |
| `add_task_media` | INSERT media (up to 3 bulk inserts) + UPDATE task `TSK_LAST_UPDATE` |

**Convention compliance:**
- All SELECT queries (file resolution, task fetching) execute **before** `$Db.beginTransaction()`.
- Transactions contain only INSERT/UPDATE statements.
- Every write is followed by `$Db.isError()` — on error, `$Db.rollbackTransaction()` is called before returning the error.
- `$Db.commitTransaction()` is called only after all writes succeed.

### 6.2 Error Handling

Every mutating query checks `$Db.isError()` immediately after execution:
```js
$Db.executeQuery(`INSERT INTO ...`, params);
if ($Db.isError())
{
    $Db.rollbackTransaction();
    return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
}
```

The `insertTaskMedia()` helper returns `null` on success or `$Err.DBError(...)` on failure. Callers propagate the error:
```js
let mediaErr = insertTaskMedia(taskId, userId, fileNames, "image", false);
if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }
```

---

## 7. Query Architecture

### 7.1 List Query — `get_tasks_list`

The list endpoint builds a dynamic WHERE clause from filter parameters and executes two queries:

1. **Count query** — `SELECT COUNT(*) total FROM task t ... WHERE ${whereClause}` with the same JOINs and filters.
2. **Data query** — Selects task fields plus community name and creator/assignee names via LEFT OUTER JOINs to `community` and `user_details` (twice: once for creator, once for assignee).

**24-hour history rule (SDS 3.8.3.1):** The `is_open` filter implements a delayed-move-to-history behavior rather than strict status classification:
- `is_open = true` (active feed): Query condition includes open statuses (`new`, `accepted`, `approved`) **OR** (`status = completed` AND `TSK_COMPLETED_ON > cutoff`), where cutoff = now minus 24 hours.
- `is_open = false` (history feed): Query condition includes `canceled` and `rejected` immediately, plus `completed` only when `TSK_COMPLETED_ON <= cutoff`.
- The cutoff is computed as `new $Date().addHours(-24).format("Y-m-d H:i:s")`.
- This ensures completed tasks remain in the active feed for 24 hours as visual confirmation, then automatically roll into history.

**Pagination:** 0-based offset with a bounded limit (`Math.min(Math.max(limit, 1), 100)`).

**Sorting:** Column-name whitelist validates the `sort_by` parameter:
```js
let validSorts = {
    created_on: "t.TSK_CREATED_ON",
    priority:   "t.TSK_PRIORITY",
    status:     "t.TSK_STATUS",
    task_type:  "t.TSK_TYPE"
};
```
Sort direction is restricted to `ASC` or `DESC` (defaulting to `DESC`).

**Free-text search:** Uses parameterized `LIKE` against description, address, and creator/assignee first and last names.

### 7.2 Detail Query — `get_task`

A single query with the same JOINs as the list query, filtered by `TSK_ID`. Returns the task object plus:
- `comments` — fetched via a separate query with a `LEFT OUTER JOIN` to `user_details` for commenter names.
- `media` — fetched via a separate query ordered by `TMD_CREATED_ON ASC`.

### 7.3 Name Construction

User display names are built in JavaScript, not SQL:
```js
function buildFullName(firstName, lastName)
{
    return ((firstName || "") + " " + (lastName || "")).trim() || null;
}
```

This follows the project convention: "Do not use SQL functions like CONCAT() for operations computable in JavaScript."

### 7.4 N+1 Prevention

- Comment user names are resolved via a JOIN in the comment query (not per-row lookups).
- Creator and assignee names in list/detail queries are resolved via JOINs in the main query.
- Media files are inserted in bulk using parameterized multi-value INSERT.

---

## 8. Notification Integration

Task lifecycle events trigger push notifications via `Notification/create_bulk_notifications`:

| Event | Notification Type | Recipients | Template Variables |
|-------|------------------|------------|-------------------|
| Task created | `new_task` | Assignee (if not creator) | `task_id`, `task_type`, `creator_name` |
| Task accepted | `task_accepted` | Creator | `task_id`, `officer_name` |
| Task updated | `task_update` | Creator + Assignee (excluding actor) | `task_id`, `user_name` |
| Task approved | `task_update` | Creator + Assignee + new assignee (if reassigned, excluding actor) | `task_id`, `user_name` |
| Task completed | `task_completed` | Creator | `task_id`, `officer_name` |
| Task rejected | `task_rejected` | Creator | `task_id`, `officer_name` |
| Task canceled | `task_canceled` | Assignee | `task_id`, `user_name` |
| Task reassigned | `task_reassigned` | New assignee + previous assignee (excluding actor) | `task_id`, `user_name` |
| Comment added | `task_commented` | Creator + Assignee (excluding commenter) | `task_id`, `user_name` |

**Notification payload:** All task notifications include `{"entity_type": "task", "entity_id": taskId}` for deep-linking.

**Fire-and-forget:** Notification failures do not roll back the main task operation.

---

## 9. Community Scoping & Access Control

### Officer Scoping

Officers are scoped to their community for all operations:
1. The officer's `USD_COM_ID` is resolved via `getOfficerCommunityId(userId)`.
2. List queries add `t.TSK_COM_ID=?` as a filter.
3. Detail/mutation queries verify `task.TSK_COM_ID === officerCommunityId` and return `ERR_TASK_NOT_FOUND` on mismatch (hiding the task's existence from unauthorized officers).

### Admin Access

Admins have unrestricted access. For list queries, they can optionally filter by `community_id` (0 = all communities).

### Endpoint-Level ACL

| Endpoint | ACL | Additional Logic |
|----------|-----|-----------------|
| `create_task` | Admin, Officer | — |
| `get_tasks_list` | Admin, Officer | Officer: community-scoped |
| `get_task` | Admin, Officer | Officer: community-scoped |
| `update_task` | Admin, Officer | Officer: community-scoped |
| `accept_task` | Admin, Officer | Officer: community-scoped |
| `approve_task` | Admin, Planning, Logistics, Finance | Task type must require approval |
| `reject_task` | Admin, Officer | Officer: community-scoped |
| `complete_task` | Admin, Officer | Officer: community-scoped |
| `cancel_task` | Admin, Officer | Officer: only own tasks while `new`. Admin: any open task |
| `reassign_task` | Admin, Officer | Officer: must be current assignee or creator |
| `add_task_comment` | Admin, Officer | Officer: community-scoped |
| `add_task_media` | Admin, Officer | Officer: community-scoped |
| `get_task_metadata` | Admin, Officer | Returns enum data only |

---

## 10. Cross-Module Integration — `$TaskUtils`

The `task_utils.js` user module (`$TaskUtils`) exposes helper functions for other modules:

### `$TaskUtils.userHasOpenTasks(userId)`

Returns `true` if the user has any tasks assigned to them in an open status. Used by the Officer module to guard against deletion/deactivation of officers with pending work.

### `$TaskUtils.communityHasOpenTasks(communityId)`

Returns `true` if the community has any open tasks. Used by the Community module to guard against deletion of communities with active tasks.

### `$TaskUtils.openStatuses()` / `$TaskUtils.closedStatuses()`

Returns arrays of status IDs partitioned by the `is_open` attribute. Available for any module needing to distinguish open from closed tasks.

### `$TaskUtils.isOpenStatus(status)`

Returns `true` if the given status has `is_open === true`.

---

## 11. Audit Trail

Trigger definitions are registered in `db/triggers_def.js`:

| Table | ID Column | Tracked Fields | Delete Trigger |
|-------|-----------|---------------|---------------|
| `task` | `TSK_ID` | Status, priority, description, address, assigned_to, accepted_by, ETA, lifecycle timestamps, last_update, deleted_on | No |
| `task_comment` | `TCM_ID` | deleted_on | No |
| `task_media` | `TMD_ID` | deleted_on | No |

---

## 12. Error Codes

| Constant | RC | Message |
|----------|-----|---------|
| `ERR_TASK_NOT_FOUND` | 590 | task not found |
| `ERR_TASK_INVALID_STATUS` | 591 | invalid task status |
| `ERR_TASK_CANNOT_ACCEPT` | 592 | task cannot be accepted in its current status |
| `ERR_TASK_CANNOT_COMPLETE` | 593 | task cannot be completed in its current status |
| `ERR_TASK_CANNOT_CANCEL` | 594 | task cannot be canceled in its current status |
| `ERR_TASK_CANNOT_REJECT` | 595 | task cannot be rejected in its current status |
| `ERR_TASK_INVALID_TYPE` | 596 | invalid task type |
| `ERR_TASK_INVALID_PRIORITY` | 597 | invalid task priority |
| `ERR_TASK_MEDIA_LIMIT_REACHED` | 598 | maximum number of media files reached for this task |
| `ERR_TASK_CANNOT_REASSIGN` | 599 | task cannot be reassigned in its current status |
| `ERR_TASK_ASSIGNEE_NOT_FOUND` | 600 | assignee user not found |
| `ERR_TASK_COMMENT_NOT_FOUND` | 601 | task comment not found |

Infrastructure error codes also used: `ERR_NO_PRIVILEGES` (103), `ERR_FILE_NOT_FOUND` (321), `ERR_INVALID_FILE_TYPE` (324), `ERR_COMMUNITY_NOT_FOUND` (500).

---

## 13. Deferred Requirements & Future Integration Points

### 13.1 GPS Module Integration (Phase 5.3)

Once the GPS Tracking module is operational, `create_task` should be extended to:
- Capture the creating officer's GPS coordinates from `$Geolocation` and persist them in new columns `TSK_LATITUDE` and `TSK_LONGITUDE`.
- Optionally auto-calculate `TSK_ETA` using `$Geolocation.getTimeAndDistanceToDestination()` when the task has an address and the assignee has a recent GPS location.

**Schema change required:** Add `TSK_LATITUDE DECIMAL(10,7) DEFAULT NULL` and `TSK_LONGITUDE DECIMAL(10,7) DEFAULT NULL` to the `task` table.

### 13.2 Shift Module Integration (Phase 5)

Once shift check-ins are operational:
- The assignee dropdown in the Admin Portal should prioritize officers currently checked-in and on active shift.
- `resolveDefaultAssignee()` could be extended to prefer on-shift managers over off-shift managers when multiple candidates exist.

### 13.3 Additional Deferred Items

See `docs/deferred_requirements/04-task-enhancements.md` for:
- Vendor / external user assignment.
- Task templates and recurring tasks.
- Task statistics / dashboard integration.
- Task history / auto-archive.
- Video duration validation.
