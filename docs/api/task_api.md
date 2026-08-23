# Task API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Task/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

---

## Concepts

### Task Types

Tasks are categorized by type. Task types are managed dynamically through the Settings module (`Settings/add_task_type`, `Settings/update_task_type`, `Settings/delete_task_type`). Retrieve the current list via `Task/get_task_metadata`.

Certain task types require managerial approval before work can begin. The approval-required types are:

| Type Key | Description |
|----------|-------------|
| `supply_request` | Supply procurement requests requiring budget authorization. |
| `damaged_equipment` | Damaged equipment reports requiring inspection sign-off. |

For these types, the workflow includes an additional "Approved" step between "Accepted" and work execution.

### Task Statuses

| Status | Classification | Description |
|--------|---------------|-------------|
| `new` | Open | Task was just created and is awaiting officer response. |
| `accepted` | Open | An officer has accepted the task. |
| `approved` | Open | A manager/admin has approved the task (approval-required types only). |
| `completed` | Closed | The task has been completed with optional resolution comment and confirmation media. |
| `rejected` | Closed | The task was rejected with a mandatory rejection reason. |
| `canceled` | Closed | The task was canceled by its creator or by an admin. |

**Open statuses:** `new`, `accepted`, `approved`
**Closed statuses:** `completed`, `rejected`, `canceled`

**24-hour history rule:** Completed tasks remain visible in the active/open feed for 24 hours after completion, then automatically move to the history/closed feed. Canceled and rejected tasks move to history immediately.

### Task Priorities

| Priority | Description |
|----------|-------------|
| `urgent` | Requires immediate attention. |
| `important` | High priority but not time-critical. |
| `normal` | Default priority level. |
| `low` | Low importance, can be addressed when convenient. |

### Status Transition Rules

The following diagram shows which status transitions are allowed:

```
    new ──────► accepted ──────► completed
     │              │                ▲
     │              │                │
     │              ▼                │
     │          approved ────────────┘
     │              │
     ├──────► rejected (from new or accepted)
     │
     └──────► canceled (creator only, or admin from any open status)
```

| Action | From Status | To Status | Who Can Perform |
|--------|-------------|-----------|-----------------|
| Accept | `new` | `accepted` | Admin, Officer |
| Approve | `accepted` | `approved` | Admin, Planning, Logistics, Finance roles |
| Complete | `accepted` or `approved` | `completed` | Admin, Officer |
| Reject | `new` or `accepted` | `rejected` | Admin, Officer |
| Cancel | `new` (officer), any open (admin) | `canceled` | Creator (if `new`), Admin (any open) |

### Assignee Resolution

When creating a task, the `assigned_to` parameter is optional. If omitted, the system automatically resolves a default assignee using the following priority:

1. The oldest active community administrator with the Manager role.
2. The oldest active Super Administrator in the system.
3. If neither exists, the request fails with error `600`.

### Community Scoping

- **Officers** are always scoped to their own community. They see only tasks within their community (assigned to them or created by them).
- **Admins** see all tasks across all communities and can optionally filter by `community_id`.

### Media Attachments

Tasks support three types of media:

| Media Type | Limit | Description |
|------------|-------|-------------|
| Images | Max 5 | Photographs of the issue or location. |
| Video | Max 1 | Video recording of the issue. |
| Documents | Unlimited | Supporting documents (reports, forms, receipts). |

Additionally, when completing a task, **confirmation media** can be attached as separate evidence of resolution (same limits: max 5 images, max 1 video).

All file IDs must be obtained via `File/upload_file_base64` before attaching to a task.

**Allowed document MIME types:**

| MIME Type | Description |
|-----------|-------------|
| `application/pdf` | PDF Document |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Excel Spreadsheet |
| `text/csv` | CSV File |
| `text/plain` | Text File |
| `image/png` | PNG Image |
| `image/jpeg` | JPEG Image |

### Notifications

The system automatically sends push notifications at key lifecycle events:

| Event | Notification Type | Recipients |
|-------|-------------------|------------|
| Task created | `new_task` | Assigned officer |
| Task accepted | `task_accepted` | Task creator |
| Task completed | `task_completed` | Task creator |
| Task rejected | `task_rejected` | Task creator |
| Task canceled | `task_canceled` | Assigned officer and/or task creator |
| Task reassigned | `task_reassigned` | New assignee |
| Comment added | `task_commented` | Task creator and/or assigned officer |
| Task updated | `task_update` | Task creator and/or assigned officer |

---

## Endpoints

### POST Task/create_task
*Creates a new maintenance task. The task is created with status `new` and assigned to the specified user or auto-resolved default manager.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_type` | string | Yes | — | Task type key. Must be a valid key from `Task/get_task_metadata`. |
    | `description` | string | Yes | — | Task description (max 500 characters). |
    | `priority` | string | No | `"normal"` | Priority level: `urgent`, `important`, `normal`, `low`. |
    | `address` | string | No | — | Location or address where the issue is located. |
    | `assigned_to` | string | No | — | User ID to assign the task to. If omitted, the system auto-resolves to the community's default manager. |
    | `media_file_ids` | array | No | — | Array of file ID strings for attached images (max 5). Obtain IDs via `File/upload_file_base64`. |
    | `video_file_id` | string | No | — | File ID of a video recording (max 1). Obtain via `File/upload_file_base64`. |
    | `document_file_ids` | array | No | — | Array of file ID strings for attached documents. Obtain IDs via `File/upload_file_base64`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "task_id": 42
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `task_id` | integer | The unique identifier of the newly created task. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 596 | invalid task type | The `task_type` value is not a valid task type key. |
    | 597 | invalid task priority | The `priority` value is not one of `urgent`, `important`, `normal`, `low`. |
    | 500 | community not found | The user's community could not be determined. |
    | 600 | assignee user not found | The specified `assigned_to` user does not exist or is inactive, or no default manager could be resolved. |
    | 598 | maximum number of media files reached | More than 5 image files were provided in `media_file_ids`. |
    | 321 | file not found | One or more file IDs in `media_file_ids`, `video_file_id`, or `document_file_ids` do not exist. |
    | 324 | invalid file type | A document file has a MIME type not in the allowed list. |

- **Usage & Flows:**
    The entry point for all task creation (SDS 3.8.1, 4.6.4). The consumer app should:
    1. Retrieve available task types via `Task/get_task_metadata` to populate the type dropdown.
    2. Collect task details: type, description, priority, address, and optional media.
    3. Upload any media files via `File/upload_file_base64` first, then pass the returned file IDs.
    4. Optionally select an assignee from a user list (with autocomplete). If omitted, the server assigns a default manager.
    5. On success, navigate the user to the task list or task detail screen using the returned `task_id`.
    6. The assigned officer receives a push notification about the new task.

---

### POST Task/get_tasks_list
*Retrieves a paginated, role-filtered list of tasks. Supports filtering by status, type, priority, community, open/closed state, scope, date range, and free-text search.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `status` | string | No | — | Filter by status: `new`, `accepted`, `approved`, `completed`, `rejected`, `canceled`. |
    | `task_type` | string | No | — | Filter by task type key. |
    | `priority` | string | No | — | Filter by priority: `urgent`, `important`, `normal`, `low`. |
    | `community_id` | integer | No | `0` | Filter by community ID (admin only). `0` = all communities. |
    | `is_open` | boolean | No | `null` | `true` = active tasks (open statuses + completed within 24h), `false` = history (canceled, rejected, completed after 24h), `null`/omit = all tasks. |
    | `scope` | string | No | `"all"` | Scope filter: `all` (all visible tasks), `assigned_to_me` (tasks assigned to the current user), `created_by_me` (tasks created by the current user). |
    | `search_text` | string | No | — | Free-text search across task description, address, and user names. |
    | `date_from` | string | No | — | Filter tasks created from this date (format: `YYYY-MM-DD`). |
    | `date_to` | string | No | — | Filter tasks created up to this date (format: `YYYY-MM-DD`). |
    | `sort_by` | string | No | `"created_on"` | Sort column: `created_on`, `priority`, `status`, `task_type`. |
    | `sort_dir` | string | No | `"desc"` | Sort direction: `asc` or `desc`. |
    | `offset` | integer | No | `0` | Pagination offset (0-based). |
    | `limit` | integer | No | `20` | Page size (max 100). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "tasks": [
            {
                "task_id": 42,
                "community_id": 5,
                "community_name": "Sunset Gardens",
                "task_type": "supply_request",
                "task_type_name": "Supply Request",
                "status": "accepted",
                "priority": "important",
                "description": "Office supplies running low",
                "address": "Building A, Floor 3",
                "created_by": "usr_abc123",
                "created_by_name": "John Doe",
                "assigned_to": "usr_ofc456",
                "assigned_to_name": "Jane Smith",
                "accepted_by": "usr_ofc456",
                "eta": "2025-06-15 14:00:00",
                "accepted_on": "2025-06-10 09:30:00",
                "completed_on": null,
                "rejected_on": null,
                "canceled_on": null,
                "created_on": "2025-06-10 08:00:00",
                "last_update": "2025-06-10 09:30:00"
            }
        ],
        "total_count": 15
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `tasks` | array | Array of task objects (see Task Object below). |
    | `total_count` | integer | Total number of matching tasks before pagination. Use with `offset` and `limit` for paging. |

    **Task Object:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `task_id` | integer | Unique task identifier. |
    | `community_id` | integer | ID of the community this task belongs to. |
    | `community_name` | string or null | Name of the community. |
    | `task_type` | string | Task type key (e.g. `"supply_request"`). |
    | `task_type_name` | string | Human-readable task type name (e.g. `"Supply Request"`). |
    | `status` | string | Current task status. |
    | `priority` | string | Current priority level. |
    | `description` | string | Task description text. |
    | `address` | string or null | Location/address. |
    | `created_by` | string | User ID of the task creator. |
    | `created_by_name` | string or null | Full name of the creator. |
    | `assigned_to` | string | User ID of the current assignee. |
    | `assigned_to_name` | string or null | Full name of the assignee. |
    | `accepted_by` | string or null | User ID of the officer who accepted. |
    | `eta` | string or null | Estimated time of arrival/completion (`YYYY-MM-DD HH:mm:ss`). |
    | `accepted_on` | string or null | Timestamp when the task was accepted. |
    | `completed_on` | string or null | Timestamp when the task was completed. |
    | `rejected_on` | string or null | Timestamp when the task was rejected. |
    | `canceled_on` | string or null | Timestamp when the task was canceled. |
    | `created_on` | string | Timestamp when the task was created. |
    | `last_update` | string or null | Timestamp of the last modification. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 591 | invalid task status | The `status` filter value is not a valid task status. |

- **Usage & Flows:**
    The primary endpoint for displaying task lists (SDS 3.8.2, 4.6.1). The consumer app should:
    1. **Active tasks tab (My Tasks):** Call with `is_open: true` to show open tasks plus recently completed tasks (within 24 hours).
    2. **History tab:** Call with `is_open: false` to show closed tasks (canceled, rejected, and completed tasks older than 24 hours).
    3. **Officer "Assigned to me" view:** Use `scope: "assigned_to_me"` to show only tasks assigned to the current officer.
    4. **Officer "Created by me" view:** Use `scope: "created_by_me"` to show only tasks the officer created.
    5. **Admin community filter:** Admins can pass `community_id` to narrow the list to a specific community.
    6. **Dashboard widget (SDS 4.5.2):** Call with `sort_by: "priority"`, `sort_dir: "desc"`, `limit: 5`, `is_open: true` to display the 5 most urgent open tasks.
    7. **Pagination:** Use `offset` and `limit` with the returned `total_count` to implement infinite scroll or page controls.
    8. **Search and filters:** Combine `status`, `task_type`, `priority`, `date_from`, `date_to`, and `search_text` for advanced filtering.

---

### POST Task/get_task
*Retrieves full details of a single task including its comments and media attachments.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "task":
        {
            "task_id": 42,
            "community_id": 5,
            "community_name": "Sunset Gardens",
            "task_type": "supply_request",
            "task_type_name": "Supply Request",
            "status": "accepted",
            "priority": "important",
            "description": "Office supplies running low",
            "address": "Building A, Floor 3",
            "created_by": "usr_abc123",
            "created_by_name": "John Doe",
            "assigned_to": "usr_ofc456",
            "assigned_to_name": "Jane Smith",
            "accepted_by": "usr_ofc456",
            "eta": "2025-06-15 14:00:00",
            "accepted_on": "2025-06-10 09:30:00",
            "completed_on": null,
            "rejected_on": null,
            "canceled_on": null,
            "created_on": "2025-06-10 08:00:00",
            "last_update": "2025-06-10 09:30:00",
            "comments": [
                {
                    "comment_id": 1,
                    "user_id": "usr_ofc456",
                    "user_name": "Jane Smith",
                    "text": "I will check this tomorrow morning.",
                    "created_on": "2025-06-10 10:15:00"
                }
            ],
            "media": [
                {
                    "media_id": 1,
                    "url": "https://example.com/files/photo1.jpg",
                    "media_type": "image",
                    "is_confirmation": false,
                    "uploaded_by": "usr_abc123",
                    "created_on": "2025-06-10 08:00:00"
                }
            ]
        }
    }
    ```

    The `task` object contains all fields from the Task Object (see `get_tasks_list`) plus:

    | Field | Type | Description |
    |-------|------|-------------|
    | `comments` | array | Array of comment objects, sorted chronologically (oldest first). |
    | `media` | array | Array of media objects, sorted chronologically (oldest first). |

    **Comment Object:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `comment_id` | integer | Unique comment identifier. |
    | `user_id` | string | User ID of the commenter. |
    | `user_name` | string | Full name of the commenter. |
    | `text` | string | Comment text content. |
    | `created_on` | string | Timestamp when the comment was created. |

    **Media Object:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `media_id` | integer | Unique media identifier. |
    | `url` | string | Full URL to the media file. |
    | `media_type` | string | Type of media: `"image"`, `"video"`, or `"document"`. |
    | `is_confirmation` | boolean | `true` if this is confirmation/resolution media, `false` if initial report media. |
    | `uploaded_by` | string | User ID of the uploader. |
    | `created_on` | string | Timestamp when the media was uploaded. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access (task is in a different community). |

- **Usage & Flows:**
    Used to display the full task detail screen (SDS 3.8.3, 4.6.3). The consumer app should:
    1. Navigate to this screen when the user taps a task in the list or from the dashboard widget "select" button.
    2. Display all task fields, the full description, and the list of comments.
    3. Separate media into two groups for display: initial report media (`is_confirmation: false`) and resolution/confirmation media (`is_confirmation: true`).
    4. Show action buttons based on the current `status` and user role (Accept, Complete, Reject, Cancel, Reassign).
    5. Provide a comment input field to add new comments via `Task/add_task_comment`.

---

### POST Task/update_task
*Updates task details. Can update description, priority, address, and ETA. Only allowed while the task is in an open status.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to update. |
    | `description` | string | No | — | Updated task description (max 500 characters). |
    | `priority` | string | No | — | Updated priority: `urgent`, `important`, `normal`, `low`. |
    | `address` | string | No | — | Updated location/address. |
    | `eta` | string | No | — | ETA datetime in `YYYY-MM-DD HH:mm:ss` format. **Admin only** -- officers cannot set ETA. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    Returns success even if no fields were provided (no-op).

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access. |
    | 591 | invalid task status | The task is in a closed status (`completed`, `rejected`, or `canceled`). |
    | 597 | invalid task priority | The `priority` value is not a valid priority key. |
    | 103 | no privileges | An officer attempted to set the `eta` field (admin-only). |

- **Usage & Flows:**
    Used when editing task details from the task detail screen (SDS 3.8.3). The consumer app should:
    1. Allow editing description, priority, and address on open tasks.
    2. Show the ETA field only to admin users -- officers cannot set ETA (SDS 3.8.1: "The ETA will be provided manually by the manager").
    3. After saving, refresh the task detail view.

---

### POST Task/accept_task
*Accepts a task. Changes status from `new` to `accepted` and assigns the task to the current user.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to accept. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access. |
    | 592 | task cannot be accepted | The task is not in `new` status. |

- **Usage & Flows:**
    Used as a quick action from the task list or from the task detail screen (SDS 3.8.2, 3.8.3, 4.6.3). The consumer app should:
    1. Show an "Accept" button only when the task `status` is `"new"`.
    2. On success, refresh the task detail to reflect the new `accepted` status and updated `assigned_to`/`accepted_by` fields.
    3. The task creator receives a push notification that the task has been accepted.
    4. For approval-required task types (`supply_request`, `damaged_equipment`), the next step after acceptance is approval via `Task/approve_task`.

---

### POST Task/approve_task
*Approves a task. Only available for task types that require approval (supply_request, damaged_equipment). Changes status from `accepted` to `approved`. Optionally reassigns the task.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token. Requires Admin, Planning, Logistics, or Finance role. |
    | `task_id` | integer | Yes | — | The unique identifier of the task to approve. |
    | `assigned_to` | string | No | — | Optionally reassign the task to this user ID as part of the approval (approve + reassign atomically). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist or has been deleted. |
    | 591 | invalid task status | The task is not in `accepted` status, or the task type does not require approval. |
    | 600 | assignee user not found | The `assigned_to` user does not exist or is inactive. |

- **Usage & Flows:**
    Used for the approval workflow on specific task types (SDS 4.6.3). The consumer app should:
    1. Show the "Approve" button only when: the task `status` is `"accepted"` AND the task `task_type` is `"supply_request"` or `"damaged_equipment"`.
    2. Optionally allow the approver to reassign the task back to a field officer using the `assigned_to` parameter.
    3. On success, refresh the task to show the `approved` status.
    4. After approval, the task can be completed via `Task/complete_task`.

---

### POST Task/reject_task
*Rejects a task with a mandatory reason. Changes status to `rejected`. The task is closed.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to reject. |
    | `comment` | string | Yes | — | Rejection reason. This is automatically added as a comment on the task. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access. |
    | 595 | task cannot be rejected | The task is not in `new` or `accepted` status. |

- **Usage & Flows:**
    Used as a quick action or from the task detail screen (SDS 3.8.2, 3.8.3, 4.6.3). The consumer app should:
    1. Show a "Reject" button only when the task `status` is `"new"` or `"accepted"`.
    2. Prompt the user for a rejection reason before calling the API (the `comment` field is mandatory).
    3. On success, the task moves to `rejected` status and the rejection reason appears in the task comments.
    4. The task creator receives a push notification about the rejection.
    5. The task moves to the history feed immediately.

---

### POST Task/complete_task
*Completes a task. Changes status to `completed`. Optionally adds a resolution comment and confirmation media.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to complete. |
    | `comment` | string | No | — | Resolution comment describing what was done. |
    | `confirmation_media_file_ids` | array | No | — | Array of file ID strings for confirmation images (max 5). Obtain IDs via `File/upload_file_base64`. |
    | `confirmation_video_file_id` | string | No | — | File ID of a confirmation video recording. Obtain via `File/upload_file_base64`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access. |
    | 593 | task cannot be completed | The task is not in `accepted` or `approved` status. |
    | 598 | maximum number of media files reached | More than 5 confirmation images were provided. |
    | 321 | file not found | One or more confirmation media file IDs do not exist. |

- **Usage & Flows:**
    Used as a quick action or from the task detail screen (SDS 3.8.2, 3.8.3, 4.6.3). The consumer app should:
    1. Show a "Complete" button only when the task `status` is `"accepted"` or `"approved"`.
    2. Present a form allowing the user to enter a resolution comment and upload confirmation images/video.
    3. Upload confirmation media via `File/upload_file_base64` first, then pass the file IDs.
    4. On success, the task moves to `completed` status with a `completed_on` timestamp.
    5. The task creator receives a push notification about the completion.
    6. The completed task remains in the active feed for 24 hours, then moves to history.

---

### POST Task/cancel_task
*Cancels a task. Officers can only cancel tasks they created while the task is still in `new` status. Admins can cancel any task in an open status.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to cancel. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist or has been deleted. |
    | 594 | task cannot be canceled | The task is not in an open status, or an officer is trying to cancel a task that is no longer in `new` status. |
    | 103 | no privileges | An officer attempted to cancel a task they did not create. |

- **Usage & Flows:**
    Used from the task detail screen (SDS 3.8.3). The consumer app should:
    1. Show a "Cancel" button for officers only when: the task `status` is `"new"` AND the current user is the task creator (`created_by` matches the current user ID).
    2. Show a "Cancel" button for admins on any task with an open status (`new`, `accepted`, `approved`).
    3. Optionally prompt for confirmation before canceling.
    4. On success, the task moves to `canceled` status and is immediately moved to the history feed.
    5. The assigned officer receives a push notification about the cancellation.

---

### POST Task/reassign_task
*Reassigns a task to another user. The task must be in an open status.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to reassign. |
    | `assigned_to` | string | Yes | — | User ID of the new assignee. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist or has been deleted. |
    | 599 | task cannot be reassigned | The task is not in an open status (`completed`, `rejected`, or `canceled`). |
    | 600 | assignee user not found | The specified `assigned_to` user does not exist or is inactive. |
    | 103 | no privileges | An officer who is neither the current assignee nor the creator attempted to reassign. |

- **Usage & Flows:**
    Used from the task detail screen (SDS 3.8.3, 4.6.3). The consumer app should:
    1. Show a "Reassign" button only when the task is in an open status.
    2. Present a user picker with autocomplete to select the new assignee.
    3. On success, the new assignee receives a push notification and the task's `assigned_to` field is updated.
    4. Refresh the task detail view after reassignment.

---

### POST Task/add_task_comment
*Adds a comment to a task. Comments can be added to tasks in any status.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to comment on. |
    | `comment` | string | Yes | — | Comment text content. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "comment_id": 7
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `comment_id` | integer | The unique identifier of the newly created comment. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access. |

- **Usage & Flows:**
    Used from the task detail screen for ongoing communication (SDS 3.8.3, 4.6.3). The consumer app should:
    1. Display a text input at the bottom of the task detail screen for entering comments.
    2. After submitting, append the new comment to the existing comments list without a full page reload (or refresh the task detail).
    3. Both the task creator and assignee receive a push notification when a comment is added.
    4. Note: comments can be added even after a task is closed, enabling post-resolution discussion.

---

### POST Task/add_task_media
*Uploads additional media (images, video, or documents) to an existing task.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |
    | `task_id` | integer | Yes | — | The unique identifier of the task to add media to. |
    | `media_file_ids` | array | No | — | Array of file ID strings for images (max 5). Obtain IDs via `File/upload_file_base64`. |
    | `video_file_id` | string | No | — | File ID of a video recording. Obtain via `File/upload_file_base64`. |
    | `document_file_ids` | array | No | — | Array of file ID strings for documents. Obtain IDs via `File/upload_file_base64`. |
    | `is_confirmation` | boolean | No | `false` | If `true`, the uploaded media is tagged as confirmation/resolution evidence. If `false`, it is treated as initial report media. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    Returns success even if no file IDs were provided (no-op).

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 590 | task not found | The task does not exist, has been deleted, or the officer does not have access. |
    | 598 | maximum number of media files reached | More than 5 image files were provided in `media_file_ids`. |
    | 321 | file not found | One or more file IDs do not exist. |
    | 324 | invalid file type | A document file has a MIME type not in the allowed list. |

- **Usage & Flows:**
    Used from the task detail screen to attach additional evidence or documentation (SDS 3.8.3, 4.6.3). The consumer app should:
    1. Provide "Add Photo", "Add Video", and "Add Document" buttons on the task detail screen.
    2. Upload files via `File/upload_file_base64` first, then pass the returned file IDs.
    3. Use `is_confirmation: true` when the user is uploading resolution/completion evidence; use `false` (or omit) for initial report media.
    4. After uploading, refresh the task's media list.

---

### POST Task/get_task_metadata
*Returns all available task types, statuses, and priorities. Used to populate dropdown menus and filter controls in the consumer app.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin or Officer). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "task_types":
        {
            "supply_request": "Supply Request",
            "damaged_equipment": "Damaged Equipment",
            "maintenance_inspection": "Maintenance Inspection"
        },
        "task_statuses":
        {
            "new": "New",
            "accepted": "Accepted",
            "approved": "Approved",
            "completed": "Completed",
            "rejected": "Rejected",
            "canceled": "Canceled"
        },
        "task_priorities":
        {
            "urgent": "Urgent",
            "important": "Important",
            "normal": "Normal",
            "low": "Low"
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `task_types` | object | Key-value map of task type keys to their display names. Dynamic; managed via Settings. |
    | `task_statuses` | object | Key-value map of status keys to their display names. Fixed set. |
    | `task_priorities` | object | Key-value map of priority keys to their display names. Fixed set. |

- **Error Cases:**
    This endpoint always succeeds. No error cases.

- **Usage & Flows:**
    Used to initialize the task creation form and task list filter controls. The consumer app should:
    1. Call this endpoint once on app startup or when navigating to the task module and cache the results.
    2. Use `task_types` to populate the "Task Type" dropdown in the create task form and the type filter in the task list.
    3. Use `task_statuses` to populate status filter dropdowns.
    4. Use `task_priorities` to populate the priority dropdown in the create task form and the priority filter in the task list.
    5. Refresh periodically or on pull-to-refresh in case task types are added/removed by an admin.

---
