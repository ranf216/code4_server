# Task API — App Developer Integration Guide

**Module:** `Task`  
**Version:** 4.5.0  
**Audience:** Mobile (iOS/Android) and Web frontend developers

---

## 1. Authentication & Authorization

All Task API endpoints require an authenticated session. Include the session token in every request:

```
Header:  token: <session_token>
```

The token is obtained from `User/login_*` endpoints. If the token is missing or expired, the server returns `rc: 113` (no token) or `rc: 201` (invalid token).

### Role-Based Access

| Role | Can Create | Can View | Can Update | Can Accept | Can Approve | Can Complete | Can Cancel | Can Reject | Can Reassign | Can Comment | Can Add Media |
|------|-----------|---------|-----------|-----------|------------|-------------|-----------|-----------|-------------|------------|--------------|
| Admin | Yes | All communities | Yes | Yes | Yes | Yes | Any open task | Yes | Yes | Yes | Yes |
| Officer | Yes | Own community | Own community | Own community | No | Own community | Own task (while new) | Own community | If assignee or creator | Own community | Own community |
| Planning Role | No* | No* | No* | No* | Yes | No* | No* | No* | No* | No* | No* |
| Logistics Role | No* | No* | No* | No* | Yes | No* | No* | No* | No* | No* | No* |
| Finance Role | No* | No* | No* | No* | Yes | No* | No* | No* | No* | No* | No* |

\* Planning/Logistics/Finance roles grant only `approve_task` access. All other endpoints require Admin or Officer user type.

---

## 2. API Endpoint Directory

All endpoints are called as: `POST /api` with body `{"module": "Task", "method": "<method_name>", ...params}`.

---

### 2.1 `Task/create_task`

Create a new maintenance task. The task starts in status `new`.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `task_type` | string | Yes | — | Task type key (from `Task/get_task_metadata` → `task_types`) |
| `description` | string | Yes | — | Task description (max 500 characters) |
| `priority` | string | No | `"normal"` | Priority: `urgent`, `important`, `normal`, `low` |
| `address` | string | No | `null` | Location or address text |
| `assigned_to` | string | No | auto-resolve | User ID to assign. **If omitted**, the server automatically assigns to the community's default manager (see below) |
| `media_file_ids` | array | No | `[]` | File IDs of attached images (max 5). Obtain via `File/upload_file_base64` |
| `video_file_id` | string | No | `null` | File ID of a video recording (max 1) |
| `document_file_ids` | array | No | `[]` | File IDs of attached documents. Validated against allowed MIME types |

**Auto-assignee resolution:** When `assigned_to` is omitted:
1. Server finds the oldest active community manager in the task's community.
2. If none, falls back to the oldest active super admin in the system.
3. If no fallback exists, returns `rc: 600` (assignee not found).

**Community determination:**
- Officers: the task is created in the officer's own community.
- Admins: community is derived from the assignee's community. If no assignee, from the admin's own community.

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "task_id": 42
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 596 | `ERR_TASK_INVALID_TYPE` | `task_type` is not a recognized type |
| 597 | `ERR_TASK_INVALID_PRIORITY` | `priority` value is not valid |
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Cannot determine community for this user |
| 600 | `ERR_TASK_ASSIGNEE_NOT_FOUND` | Explicit assignee not found or no default available |
| 598 | `ERR_TASK_MEDIA_LIMIT_REACHED` | More than 5 image file IDs provided |
| 321 | `ERR_FILE_NOT_FOUND` | A file ID does not exist |
| 324 | `ERR_INVALID_FILE_TYPE` | A document has a prohibited MIME type |

---

### 2.2 `Task/get_tasks_list`

Get a paginated, filterable list of tasks.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `status` | string | No | all | Filter by status: `new`, `accepted`, `approved`, `completed`, `rejected`, `canceled` |
| `task_type` | string | No | all | Filter by task type key |
| `priority` | string | No | all | Filter by priority |
| `community_id` | integer | No | `0` | Filter by community (admin only, `0` = all communities) |
| `is_open` | boolean | No | `null` | `true` = active tasks (see 24-hour rule below). `false` = history tasks. `null` = all |
| `scope` | string | No | `"all"` | `all` = all visible tasks. `assigned_to_me` = assigned to current user. `created_by_me` = created by current user |
| `search_text` | string | No | — | Free-text search across description, address, and user names |
| `date_from` | string | No | — | Filter by creation date (format: `YYYY-MM-DD`). Inclusive |
| `date_to` | string | No | — | Filter by creation date (format: `YYYY-MM-DD`). Inclusive |
| `sort_by` | string | No | `"created_on"` | Sort column: `created_on`, `priority`, `status`, `task_type` |
| `sort_dir` | string | No | `"desc"` | Sort direction: `asc` or `desc` |
| `offset` | integer | No | `0` | Pagination offset (0-based) |
| `limit` | integer | No | `20` | Page size (1–100) |

**Officer scoping:** Officers automatically see only tasks within their community. The `community_id` filter is ignored for officers.

**24-hour history rule (SDS 3.8.3.1):** The `is_open` filter implements a delayed-move-to-history behavior:
- `is_open: true` (active feed): Returns tasks in open statuses (`new`, `accepted`, `approved`) **plus** `completed` tasks whose completion timestamp is less than 24 hours old. This ensures recently completed tasks remain visible as confirmation of work done.
- `is_open: false` (history feed): Returns `canceled` and `rejected` tasks immediately, plus `completed` tasks only after 24 hours have elapsed since completion.
- `is_open: null` (or omitted): Returns all tasks regardless of the 24-hour rule.

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "tasks": [
        {
            "task_id": 42,
            "community_id": 5,
            "community_name": "Downtown Complex",
            "task_type": "maintenance",
            "task_type_name": "Maintenance",
            "status": "new",
            "priority": "urgent",
            "description": "Broken window in lobby",
            "address": "Building A, Floor 3",
            "created_by": "usr_abc123",
            "created_by_name": "John Smith",
            "assigned_to": "usr_def456",
            "assigned_to_name": "Jane Doe",
            "accepted_by": null,
            "eta": null,
            "accepted_on": null,
            "completed_on": null,
            "rejected_on": null,
            "canceled_on": null,
            "created_on": "2026-08-23 14:30:00",
            "last_update": null
        }
    ],
    "total_count": 1
}
```

**Pagination:** Use `total_count` with `offset` and `limit` to implement paging. The first page uses `offset: 0`. For page N (0-based): `offset = N * limit`.

---

### 2.3 `Task/get_task`

Get full details of a single task, including all comments and media.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "task": {
        "task_id": 42,
        "community_id": 5,
        "community_name": "Downtown Complex",
        "task_type": "supply_request",
        "task_type_name": "Supply Request",
        "status": "accepted",
        "priority": "important",
        "description": "Need 50 safety cones for parking lot",
        "address": "Warehouse B",
        "created_by": "usr_abc123",
        "created_by_name": "John Smith",
        "assigned_to": "usr_def456",
        "assigned_to_name": "Jane Doe",
        "accepted_by": "usr_def456",
        "eta": "2026-08-25 09:00:00",
        "accepted_on": "2026-08-23 15:00:00",
        "completed_on": null,
        "rejected_on": null,
        "canceled_on": null,
        "created_on": "2026-08-23 14:30:00",
        "last_update": "2026-08-23 15:00:00",
        "comments": [
            {
                "comment_id": 1,
                "user_id": "usr_def456",
                "user_name": "Jane Doe",
                "text": "I'll pick these up from the supplier tomorrow.",
                "created_on": "2026-08-23 15:05:00"
            }
        ],
        "media": [
            {
                "media_id": 1,
                "url": "https://cdn.example.com/files/abc123.jpg",
                "media_type": "image",
                "is_confirmation": false,
                "uploaded_by": "usr_abc123",
                "created_on": "2026-08-23 14:30:00"
            }
        ]
    }
}
```

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found or not visible to the current user |

---

### 2.4 `Task/update_task`

Update task details (partial update). Only provided fields are changed; omitted fields remain untouched.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `description` | string | No | Updated description |
| `priority` | string | No | Updated priority: `urgent`, `important`, `normal`, `low` |
| `address` | string | No | Updated address |
| `eta` | string | No | ETA datetime (`YYYY-MM-DD HH:mm:ss`). **Admin only.** Send empty string to clear |

**Constraints:**
- Task must be in an open status (`new`, `accepted`, or `approved`).
- Officers: task must be in their community.
- ETA: only admins can set/clear. Officers receive `rc: 103` (no privileges).
- If no fields are provided, returns `rc: 0` with no database change.

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 591 | Task is in a closed status (completed/rejected/canceled) |
| 597 | Invalid priority value |
| 103 | Officer attempted to set ETA |

---

### 2.5 `Task/accept_task`

Accept a task. Changes status from `new` to `accepted` and assigns the task to the current user.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |

**Behavior:** The accepting user becomes both `assigned_to` and `accepted_by`.

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 592 | Task is not in `new` status |

---

### 2.6 `Task/approve_task`

Approve a task that requires administrative approval. Only applicable to task types in the approval list (e.g., `supply_request`, `damaged_equipment`).

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `assigned_to` | string | No | Optionally reassign the task atomically during approval |

**Constraints:**
- Caller must be an admin or have a Planning/Logistics/Finance role.
- Task must be in `accepted` status.
- Task type must be in the approval-required list.

**Error codes:**

| RC | Cause |
|----|-------|
| 103 | User does not have approval privileges (ACL) |
| 590 | Task not found |
| 591 | Task not in `accepted` status, or task type does not require approval |
| 600 | Reassignment target user not found |

---

### 2.7 `Task/reject_task`

Reject a task with a mandatory reason comment.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `comment` | string | Yes | Rejection reason (added as a comment) |

**Constraints:**
- Task must be in `new` or `accepted` status.

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 595 | Task cannot be rejected in its current status |

---

### 2.8 `Task/complete_task`

Mark a task as completed. Optionally attach a resolution comment and confirmation media.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `comment` | string | No | Resolution/completion comment |
| `confirmation_media_file_ids` | array | No | File IDs of confirmation images (max 5) |
| `confirmation_video_file_id` | string | No | File ID of confirmation video (max 1) |

**Constraints:**
- Task must be in `accepted` or `approved` status.
- For task types requiring approval (e.g., `supply_request`), the task must be in `approved` status — attempting to complete from `accepted` returns `rc: 593`.

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 593 | Task cannot be completed (wrong status) |
| 598 | More than 5 confirmation images |
| 321 | A file ID does not exist |

---

### 2.9 `Task/cancel_task`

Cancel a task.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |

**Constraints:**
- Task must be in an open status.
- Officers can only cancel tasks they created, and only while the task is in `new` status.
- Admins can cancel any open task.

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 594 | Task is in a closed status |
| 103 | Officer is not the task creator |

---

### 2.10 `Task/reassign_task`

Reassign a task to a different user.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `assigned_to` | string | Yes | New assignee user ID |

**Constraints:**
- Task must be in an open status.
- The new assignee must be a valid, active user.
- Officers can only reassign if they are the current assignee or the task creator.

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 599 | Task is in a closed status |
| 600 | New assignee not found or inactive |
| 103 | Officer is not the assignee or creator |

---

### 2.11 `Task/add_task_comment`

Add a comment to a task.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `comment` | string | Yes | Comment text |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "comment_id": 7
}
```

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |

---

### 2.12 `Task/add_task_media`

Upload additional media to a task. Supports images, video, and documents.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |
| `task_id` | integer | Yes | Task ID |
| `media_file_ids` | array | No | File IDs of images (max 5 per call) |
| `video_file_id` | string | No | File ID of video (max 1) |
| `document_file_ids` | array | No | File IDs of documents |
| `is_confirmation` | boolean | No | Default `false`. If `true`, media is flagged as confirmation/resolution evidence |

**Workflow for attaching files:**

1. **Upload each file** using `File/upload_file_base64`:
   ```json
   {
       "module": "File",
       "method": "upload_file_base64",
       "token": "<session_token>",
       "file_data": "<base64_encoded_file>",
       "file_name": "damage_report.pdf"
   }
   ```
   Response: `{"rc": 0, "file_id": "abc123"}`

2. **Attach to the task** using `Task/add_task_media`:
   ```json
   {
       "module": "Task",
       "method": "add_task_media",
       "token": "<session_token>",
       "task_id": 42,
       "document_file_ids": ["abc123"]
   }
   ```

**Document MIME restrictions:** Only these types are allowed for `document_file_ids`:
- `application/pdf` (PDF)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
- `text/csv` (CSV)
- `text/plain` (TXT)
- `image/png` (PNG)
- `image/jpeg` (JPEG)

Files uploaded via `media_file_ids` (images) and `video_file_id` (video) are not subject to MIME validation.

**Error codes:**

| RC | Cause |
|----|-------|
| 590 | Task not found |
| 598 | More than 5 image file IDs |
| 321 | A file ID does not exist |
| 324 | A document has a prohibited MIME type |

---

### 2.13 `Task/get_task_metadata`

Get task types, statuses, and priorities for populating dropdowns and filters.

**Request:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Session token |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "task_types": [
        {"id": "maintenance", "name": "Maintenance"},
        {"id": "supply_request", "name": "Supply Request"},
        {"id": "damaged_equipment", "name": "Damaged Equipment"}
    ],
    "task_statuses": [
        {"id": "new", "name": "New"},
        {"id": "accepted", "name": "Accepted"},
        {"id": "approved", "name": "Approved"},
        {"id": "completed", "name": "Completed"},
        {"id": "rejected", "name": "Rejected"},
        {"id": "canceled", "name": "Canceled"}
    ],
    "task_priorities": [
        {"id": "urgent", "name": "Urgent"},
        {"id": "important", "name": "Important"},
        {"id": "normal", "name": "Normal"},
        {"id": "low", "name": "Low"}
    ]
}
```

**Usage:** Call this once on app startup or screen load, cache the results, and use them to populate filter dropdowns, creation forms, and display labels.

---

## 3. Validation & Return Codes — Quick Reference

### Standard Success

```json
{
    "rc": 0,
    "message": "success"
}
```

All successful responses have `rc: 0`. Some endpoints include additional data (e.g., `task_id`, `comment_id`, `task`, `tasks`).

### Authentication Errors

| RC | Constant | Description |
|----|----------|-------------|
| 113 | `ERR_NO_TOKEN_FOR_AUTHED_API_CALL` | No token provided |
| 201 | `ERR_INVALID_USER_TOKEN` | Token expired or invalid |

### Authorization Errors

| RC | Constant | Description |
|----|----------|-------------|
| 103 | `ERR_NO_PRIVILEGES` | User lacks the required role or permission. Returned when a non-admin officer tries to set ETA, cancel someone else's task, or reassign a task they are not assigned to / did not create. Also returned by ACL when a non-admin, non-role user calls `approve_task` |

### Task-Specific Errors

| RC | Constant | Description |
|----|----------|-------------|
| 590 | `ERR_TASK_NOT_FOUND` | Task does not exist, is soft-deleted, or is not visible to the current user |
| 591 | `ERR_TASK_INVALID_STATUS` | Invalid status filter value or task type not eligible for approval |
| 592 | `ERR_TASK_CANNOT_ACCEPT` | Task is not in `new` status |
| 593 | `ERR_TASK_CANNOT_COMPLETE` | Task is not in `accepted` or `approved` status |
| 594 | `ERR_TASK_CANNOT_CANCEL` | Task is in a closed status |
| 595 | `ERR_TASK_CANNOT_REJECT` | Task is not in `new` or `accepted` status |
| 596 | `ERR_TASK_INVALID_TYPE` | Unrecognized task type key |
| 597 | `ERR_TASK_INVALID_PRIORITY` | Unrecognized priority value |
| 598 | `ERR_TASK_MEDIA_LIMIT_REACHED` | More than 5 images in a single operation |
| 599 | `ERR_TASK_CANNOT_REASSIGN` | Task is in a closed status |
| 600 | `ERR_TASK_ASSIGNEE_NOT_FOUND` | Assignee user ID does not exist or is inactive |
| 601 | `ERR_TASK_COMMENT_NOT_FOUND` | Comment not found (reserved) |

### File Errors

| RC | Constant | Description |
|----|----------|-------------|
| 321 | `ERR_FILE_NOT_FOUND` | A referenced file ID does not exist in the file table |
| 324 | `ERR_INVALID_FILE_TYPE` | A document's MIME type is not in the allowed whitelist |

### Infrastructure Errors

| RC | Constant | Description |
|----|----------|-------------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Cannot determine community for the current user |
| 401 | `ERR_DB_INSERT_ERROR` | Database insert failure (server-side issue) |
| 402 | `ERR_DB_UPDATE_ERROR` | Database update failure (server-side issue) |

---

## 4. Push Notifications

The app should handle these notification types for deep-linking into the task detail screen:

| Notification Type | Trigger | Payload |
|------------------|---------|---------|
| `new_task` | Task created and assigned | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_accepted` | Assignee accepted the task | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_completed` | Task marked as completed | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_rejected` | Task was rejected | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_canceled` | Task was canceled | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_reassigned` | Task was reassigned to you | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_commented` | New comment on a task you're involved with | `{"entity_type": "task", "entity_id": <task_id>}` |
| `task_update` | Task details were updated | `{"entity_type": "task", "entity_id": <task_id>}` |

**Deep-link handling:** When the user taps a task notification, extract `entity_id` from the payload and navigate to the task detail screen, calling `Task/get_task` with `task_id = entity_id`.

---

## 5. Common Integration Patterns

### 5.1 Creating a Task with Attachments

```
1. Upload image:    File/upload_file_base64  →  file_id_1
2. Upload image:    File/upload_file_base64  →  file_id_2
3. Upload document: File/upload_file_base64  →  file_id_3
4. Create task:     Task/create_task { ..., media_file_ids: [file_id_1, file_id_2], document_file_ids: [file_id_3] }
```

### 5.2 Approval Flow for Supply Requests

```
1. Officer creates task:   Task/create_task { task_type: "supply_request", ... }    → status: new
2. Officer accepts task:   Task/accept_task { task_id: 42 }                         → status: accepted
3. Admin approves task:    Task/approve_task { task_id: 42 }                        → status: approved
4. Officer completes task: Task/complete_task { task_id: 42, confirmation_media_file_ids: [...] } → status: completed
```

### 5.3 Routine Maintenance Flow (No Approval Needed)

```
1. Officer creates task:   Task/create_task { task_type: "maintenance", ... }       → status: new
2. Officer accepts task:   Task/accept_task { task_id: 43 }                         → status: accepted
3. Officer completes task: Task/complete_task { task_id: 43 }                       → status: completed
```

### 5.4 Paginated List with Filters

```
Page 1: Task/get_tasks_list { is_open: true, sort_by: "priority", sort_dir: "desc", offset: 0, limit: 20 }
Page 2: Task/get_tasks_list { is_open: true, sort_by: "priority", sort_dir: "desc", offset: 20, limit: 20 }
```
