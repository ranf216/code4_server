# Shift API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Shift/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints require a `#token` field in the request body. Access levels vary per endpoint and are noted individually.

---

## Concepts

### Shifts

A shift represents a scheduled time block during which one or more officers are expected to be on duty at a specific community or site. Each shift has a date, start time, end time, and an associated community.

- Shifts are created in **Draft** status and are only visible to managers until published.
- Overnight shifts are supported (e.g. 22:00–06:00) and are detected automatically when the end time is earlier than or equal to the start time.
- Shifts support free-text notes up to 500 characters.

### Shift Status Lifecycle

| Status | Description |
|--------|-------------|
| **Draft** | Shift is created but not yet sent to officers. Visible to managers only. |
| **Published** | Manager has published the shift. A push notification is sent to all allocated officers. The shift appears in the officer's app. |
| **Active** | At least one allocated officer has checked in. GPS tracking becomes mandatory. |
| **Completed** | All allocated officers have checked out. The shift is moved to history. |
| **Cancelled** | Manager has cancelled the shift. A cancellation notification is sent to all allocated officers. |

**Allowed transitions:**

| Action | Allowed From |
|--------|-------------|
| Publish | Draft |
| Cancel | Draft, Published |
| Update | Draft, Published |
| Delete | Draft only |
| Check-in (automatic Draft→Active) | Published, Active |
| Check-out (automatic Active→Completed when all officers out) | Active |

### Officer Allocation

Officers are assigned to shifts via the allocation process. One or more officers can be allocated to a single shift. Each allocated officer may optionally be assigned to a specific post within the community.

- An officer can only be allocated to a shift within their own community.
- Duplicate allocations are rejected.
- Scheduling conflict detection runs automatically during allocation and publishing, checking for double-bookings, insufficient rest gaps, and overtime.
- Conflict warnings do not block the operation by default. The consumer can acknowledge them by setting `acknowledge_conflicts` to `true`.

### Recurring Shifts

A recurring shift series generates multiple individual shifts from a single configuration. Supported recurrence patterns:

| Pattern | Description |
|---------|-------------|
| **Daily** | One shift every day. |
| **Specific days** | Shifts only on selected days of the week (e.g. Mon, Wed, Fri). |
| **Every X days** | Shifts at a fixed interval (e.g. every 3 days). |

Each series has an end condition: a specific end date, a maximum number of occurrences (up to 365), or no end (capped at a rolling 90-day horizon).

Editing a recurring shift prompts the consumer to choose a scope: update this shift only, this and all future shifts in the series, or all shifts in the series.

### Check-in / Check-out

Officers check in and out of shifts via the mobile app. Check-in transitions the shift from Published to Active (on first check-in). Check-out records the officer's total hours worked. When all officers have checked out, the shift transitions to Completed.

---

## Endpoints — Shift Calendar & CRUD

### POST Shift/get_shifts_calendar
*Admin only.* Retrieves shifts for calendar display across a date range, with optional filters.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | No | Community ID to filter by. `0` or omitted returns shifts across all accessible communities. |
    | `date_from` | string | Yes | Start date of the range (`YYYY-MM-DD`). |
    | `date_to` | string | Yes | End date of the range (`YYYY-MM-DD`). |
    | `officer_id` | string | No | Filter by a specific officer's user ID. |
    | `status` | string | No | Filter by shift status: `draft`, `published`, `active`, `completed`, `cancelled`. |
    | `search_text` | string | No | Free-text search across officer names and community names. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "shifts": [
            {
                "shift_id": 101,
                "community_id": 1,
                "community_name": "Sunset Estates",
                "series_id": null,
                "shift_date": "2026-03-15",
                "start_time": "08:00",
                "end_time": "16:00",
                "is_overnight": false,
                "status": "published",
                "notes": "Morning patrol",
                "published_on": "2026-03-10 14:00:00",
                "published_by": "abc123",
                "cancelled_on": null,
                "cancelled_by": null,
                "created_by": "abc123",
                "created_on": "2026-03-08 09:00:00",
                "last_update": "2026-03-10 14:00:00",
                "officers": [
                    {
                        "officer_id": "def456",
                        "name": "John Smith"
                    }
                ],
                "posts": [
                    {
                        "officer_id": "def456",
                        "post_id": 5,
                        "post_name": "Main Gate"
                    }
                ]
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `shift_id` | integer | Unique shift identifier. |
    | `community_id` | integer | The community this shift belongs to. |
    | `community_name` | string or `null` | Display name of the community. |
    | `series_id` | integer or `null` | Recurring series identifier, or `null` for standalone shifts. |
    | `shift_date` | string | Shift date in `YYYY-MM-DD` format. |
    | `start_time` | string | Shift start time in `HH:MM` 24-hour format. |
    | `end_time` | string | Shift end time in `HH:MM` 24-hour format. |
    | `is_overnight` | boolean | `true` if the shift spans midnight. |
    | `status` | string | Current shift status. |
    | `notes` | string or `null` | Free-text notes. |
    | `published_on` | string or `null` | Datetime the shift was published. |
    | `published_by` | string or `null` | User ID of the admin who published. |
    | `cancelled_on` | string or `null` | Datetime the shift was cancelled. |
    | `cancelled_by` | string or `null` | User ID of the admin who cancelled. |
    | `created_by` | string | User ID of the admin who created the shift. |
    | `created_on` | string | Datetime of creation. |
    | `last_update` | string or `null` | Datetime of last modification. |
    | `officers` | array | List of allocated officers, each with `officer_id` and `name`. |
    | `posts` | array | List of post assignments, each with `officer_id`, `post_id`, and `post_name`. |

    Shifts are sorted by date ascending, then by start time ascending.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called by the management portal to populate the Shift Calendar view (SDS 4.7.1). The `community_id` filter maps to the Community / Site dropdown (SDS 4.7.1.2). The `status` filter maps to the multi-select status filter. The `date_from` and `date_to` range corresponds to the current calendar view range (day, week, or month). The `search_text` and `officer_id` filters support the filter bar (SDS 4.7.1.2).

---

### POST Shift/get_shift
*Admin or Officer.* Retrieves the full details of a single shift, including allocated officers, post assignments, and check-in records.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Admin or Officer). |
    | `shift_id` | integer | Yes | The ID of the shift to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "shift": {
            "shift_id": 101,
            "community_id": 1,
            "community_name": "Sunset Estates",
            "series_id": null,
            "shift_date": "2026-03-15",
            "start_time": "08:00",
            "end_time": "16:00",
            "is_overnight": false,
            "status": "published",
            "notes": "Morning patrol",
            "published_on": "2026-03-10 14:00:00",
            "published_by": "abc123",
            "cancelled_on": null,
            "cancelled_by": null,
            "created_by": "abc123",
            "created_on": "2026-03-08 09:00:00",
            "last_update": "2026-03-10 14:00:00",
            "officers": [
                {
                    "officer_id": "def456",
                    "name": "John Smith"
                }
            ],
            "posts": [
                {
                    "officer_id": "def456",
                    "post_id": 5,
                    "post_name": "Main Gate"
                }
            ],
            "checkins": [
                {
                    "officer_id": "def456",
                    "check_in_on": "2026-03-15 07:55:00",
                    "check_out_on": "2026-03-15 16:05:00",
                    "total_hours": 8.17
                }
            ]
        }
    }
    ```

    The `shift` object contains all fields from `get_shifts_calendar` plus:

    | Field | Type | Description |
    |-------|------|-------------|
    | `checkins` | array | Check-in/check-out records for this shift. Each entry contains `officer_id`, `check_in_on`, `check_out_on` (or `null` if still checked in), and `total_hours` (decimal or `null`). |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |

- **Usage & Flows:**
    Called when opening the Shift Details panel from the calendar (SDS 4.7.2) or when an officer views shift details from their shifts list (SDS 3.11). The `checkins` array is used to display hours worked per officer.

---

### POST Shift/create_shift
*Admin only.* Creates a new shift in Draft status.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community this shift belongs to. |
    | `shift_date` | string | Yes | Shift date (`YYYY-MM-DD`). |
    | `start_time` | string | Yes | Start time (`HH:MM`, 24-hour). |
    | `end_time` | string | Yes | End time (`HH:MM`, 24-hour). Overnight shifts are detected automatically when end time is earlier than or equal to start time. |
    | `officer_ids` | array | No | Array of officer user ID strings to allocate immediately. |
    | `notes` | string | No | Free-text notes (max 500 characters). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "shift_id": 101
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `shift_id` | integer | The ID of the newly created shift. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter is missing. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | No active community exists with the given `community_id`. |
    | 619 | invalid shift time range | The date is invalid, start and end times are identical, or the time format is incorrect. |
    | 623 | officer does not belong to the shift community | One or more officer IDs in `officer_ids` are not members of the specified community. |

- **Usage & Flows:**
    Called from the "Add Shift" button in the Shift Calendar (SDS 4.7.2). The shift is created in Draft status. Officers can optionally be allocated at creation time via `officer_ids`. The consumer should call `publish_shift` separately to make the shift visible to officers.

---

### POST Shift/update_shift
*Admin only.* Updates one or more fields of an existing shift. Only shifts in Draft or Published status can be updated. Omitted optional fields retain their current values.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift to update. |
    | `shift_date` | string | No | Updated shift date (`YYYY-MM-DD`). |
    | `start_time` | string | No | Updated start time (`HH:MM`, 24-hour). |
    | `end_time` | string | No | Updated end time (`HH:MM`, 24-hour). |
    | `notes` | string | No | Updated notes (max 500 characters). |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 619 | invalid shift time range | The provided date or time values are invalid, or start and end times are identical. |
    | 620 | shift cannot be updated in its current status | The shift is Active, Completed, or Cancelled. |

- **Usage & Flows:**
    Called from the Shift Details panel when editing a shift (SDS 4.7.2). Only Draft and Published shifts can be edited. If a Published shift is updated, a "Shift Updated" push notification is sent to all allocated officers (SDS 4.7.4). The consumer should send only the fields that changed.

---

### POST Shift/delete_shift
*Admin only.* Soft-deletes a shift. Only shifts in Draft status can be deleted.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift to delete. |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 621 | only draft shifts can be deleted | The shift is not in Draft status. Published, Active, Completed, or Cancelled shifts cannot be deleted — use `cancel_shift` instead for Published shifts. |

- **Usage & Flows:**
    Called from the Shift Details panel when deleting a draft shift. For shifts that have already been published, the consumer should use `cancel_shift` instead.

---

## Endpoints — Shift Lifecycle

### POST Shift/publish_shift
*Admin only.* Publishes a Draft shift, making it visible to allocated officers and triggering a push notification.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift to publish. |
    | `acknowledge_conflicts` | boolean | No | Set `true` to override scheduling conflict warnings. Default: `false`. |

- **Return Values:**

    **Success:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    **Conflict warnings (when `acknowledge_conflicts` is `false` and conflicts exist):**
    ```json
    {
        "rc": 616,
        "message": "officer has a scheduling conflict",
        "warnings": [
            {
                "officer_id": "def456",
                "officer_name": "John Smith",
                "type": "double_booking",
                "message": "Officer has an overlapping shift (ID: 102) on 2026-03-15",
                "conflicting_shift_id": 102
            }
        ],
        "requires_acknowledgment": true
    }
    ```

    When `requires_acknowledgment` is `true`, the consumer should display the warnings and allow the manager to explicitly acknowledge them. Re-call the endpoint with `acknowledge_conflicts` set to `true` to proceed.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 612 | shift cannot be published in its current status | The shift is not in Draft status. |
    | 616 | officer has a scheduling conflict | Conflicts were detected and not acknowledged. See `warnings` array for details. |
    | 629 | shift has no allocated officers and cannot be published | No officers have been allocated to this shift. |

- **Usage & Flows:**
    Called from the Shift Details panel when the manager clicks the Publish button (SDS 4.7.2.2). The shift must be in Draft status and must have at least one allocated officer. On publish, a "Shift Published" push notification is sent to all allocated officers with the shift date, time, and site (SDS 4.7.4). If scheduling conflicts are detected, the consumer should display the warnings and require the manager to tick a confirmation checkbox before re-calling with `acknowledge_conflicts: true` (SDS 4.7.3.2).

---

### POST Shift/cancel_shift
*Admin only.* Cancels a Draft or Published shift and notifies allocated officers.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift to cancel. |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 613 | shift cannot be canceled in its current status | The shift is Active, Completed, or already Cancelled. |

- **Usage & Flows:**
    Called from the Shift Details panel when the manager cancels a shift (SDS 4.7.2.2). Only Draft and Published shifts can be cancelled. For Published shifts, a "Shift Cancelled" push notification is sent to all allocated officers (SDS 4.7.4). The shift remains in history with Cancelled status.

---

## Endpoints — Officer Allocation

### POST Shift/allocate_officer
*Admin only.* Allocates an officer to a shift. Runs scheduling conflict validation and returns warnings if conflicts are detected.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift. |
    | `officer_id` | string | Yes | The user ID of the officer to allocate. |
    | `acknowledge_conflicts` | boolean | No | Set `true` to override scheduling conflict warnings. Default: `false`. |

- **Return Values:**

    **Success:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    **Conflict warnings (when `acknowledge_conflicts` is `false` and conflicts exist):**
    ```json
    {
        "rc": 616,
        "message": "officer has a scheduling conflict",
        "warnings": [
            {
                "type": "double_booking",
                "message": "Officer has an overlapping shift (ID: 102) on 2026-03-15",
                "conflicting_shift_id": 102
            }
        ],
        "requires_acknowledgment": true
    }
    ```

    Possible warning types:

    | Type | Fields | Description |
    |------|--------|-------------|
    | `double_booking` | `conflicting_shift_id`, `message` | The officer is already allocated to an overlapping shift on the same date. |
    | `rest_gap` | `conflicting_shift_id`, `gap_hours`, `message` | The gap between this shift and an adjacent shift is below the minimum rest period. |
    | `overtime` | `planned_hours`, `message` | Allocating this shift would cause the officer to exceed the configured maximum weekly hours. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 614 | officer is already allocated to this shift | The officer is already assigned to this shift. |
    | 616 | officer has a scheduling conflict | Conflicts were detected and not acknowledged. |
    | 620 | shift cannot be updated in its current status | The shift is Active, Completed, or Cancelled. |
    | 623 | officer does not belong to the shift community | The officer is not a member of the shift's community. |

- **Usage & Flows:**
    Called from the Shift Details panel or the Allocation Board (SDS 4.7.3) when adding an officer to a shift. If conflicts are detected, the consumer should display the warnings inline (SDS 4.7.3.2) and allow the manager to acknowledge them via a confirmation checkbox. Re-call with `acknowledge_conflicts: true` to proceed. Only Draft and Published shifts accept new allocations.

---

### POST Shift/remove_officer
*Admin only.* Removes an officer from a shift.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift. |
    | `officer_id` | string | Yes | The user ID of the officer to remove. |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 615 | officer is not allocated to this shift | The specified officer is not currently allocated to this shift. |
    | 620 | shift cannot be updated in its current status | The shift is Completed or Cancelled. |

- **Usage & Flows:**
    Called from the Shift Details panel when removing an officer from a shift. Officers can be removed from Draft, Published, and Active shifts. If the shift is Published, a notification is sent to the removed officer.

---

## Endpoints — Post Assignment

### POST Shift/assign_post
*Admin only.* Assigns a post (location within a community) to a specific officer within a shift. The officer must already be allocated to the shift.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift. |
    | `officer_id` | string | Yes | The user ID of the allocated officer. |
    | `post_id` | integer | Yes | The ID of the post to assign. |

- **Return Values:**

    **Success:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    **Success with eligibility warning:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "warning": {
            "type": "post_eligibility_mismatch",
            "missing_roles": ["supervisor"],
            "missing_badges": [],
            "message": "Officer is missing required roles or badges for this post."
        }
    }
    ```

    When a `warning` is present, the assignment was saved but the officer may not meet all requirements for the post. The consumer should display the warning to the manager.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 615 | officer is not allocated to this shift | The officer must be allocated before a post can be assigned. |
    | 620 | shift cannot be updated in its current status | The shift is Active, Completed, or Cancelled. |
    | 622 | post not found or not active | No active post exists with the given `post_id`, or the post does not belong to the shift's community. |

- **Usage & Flows:**
    Called from the Post Assignment modal within the Shift Details panel (SDS 4.7.2). The officer must already be allocated to the shift. The post must be an active post belonging to the same community as the shift. Only Draft and Published shifts accept post assignments. If the response includes a `warning` about eligibility, the consumer should display it to the manager but the assignment is not blocked.

---

## Endpoints — Check-in / Check-out

### POST Shift/check_in
*Officer only.* The authenticated officer checks in for a shift. The shift must be Published or Active.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `shift_id` | integer | Yes | The ID of the shift to check in to. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "checkin_id": 42
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `checkin_id` | integer | The ID of the created check-in record. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 615 | officer is not allocated to this shift | The officer is not allocated to this shift. |
    | 617 | officer has already checked in | The officer already has an open (unclosed) check-in for this shift. |
    | 620 | shift cannot be updated in its current status | The shift is Draft, Completed, or Cancelled. |

- **Usage & Flows:**
    Called from the officer's Check-in/out screen (SDS 3.6.1) when the officer presses the Check-in button. The first check-in to a Published shift automatically transitions it to Active status. Subsequent officers checking in to an already-Active shift do not change its status. The officer cannot check in twice without checking out first.

---

### POST Shift/check_out
*Officer only.* The authenticated officer checks out from a shift.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `shift_id` | integer | Yes | The ID of the shift to check out from. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "total_hours": 8.17
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `total_hours` | number | Total hours worked in this check-in session, as a decimal rounded to 2 places. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 615 | officer is not allocated to this shift | The officer is not allocated to this shift. |
    | 618 | officer has not checked in | The officer does not have an open check-in for this shift. |

- **Usage & Flows:**
    Called from the officer's Check-in/out screen (SDS 3.6.1) when the officer presses the Check-out button. The system calculates total hours worked and returns them. If all allocated officers have now checked out, the shift automatically transitions from Active to Completed. The total hours are added to the officer's hours list (SDS 3.6.2).

---

## Endpoints — Officer-facing

### POST Shift/get_my_shifts
*Officer only.* Retrieves the authenticated officer's own shifts (published, active, or completed). Supports pagination and date/status filters.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `date_from` | string | No | Start date filter (`YYYY-MM-DD`). |
    | `date_to` | string | No | End date filter (`YYYY-MM-DD`). |
    | `status` | string | No | Filter by status: `draft`, `published`, `active`, `completed`, `cancelled`. |
    | `page` | integer | No | Page number, 0-based. Default: `0`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "num_of_pages": 3,
        "num_of_items": 47,
        "shifts": [
            {
                "shift_id": 101,
                "community_id": 1,
                "community_name": "Sunset Estates",
                "series_id": null,
                "shift_date": "2026-03-15",
                "start_time": "08:00",
                "end_time": "16:00",
                "is_overnight": false,
                "status": "published",
                "notes": "Morning patrol",
                "published_on": "2026-03-10 14:00:00",
                "published_by": "abc123",
                "cancelled_on": null,
                "cancelled_by": null,
                "created_by": "abc123",
                "created_on": "2026-03-08 09:00:00",
                "last_update": "2026-03-10 14:00:00",
                "posts": [
                    {
                        "post_id": 5,
                        "post_name": "Main Gate"
                    }
                ]
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `num_of_pages` | integer | Total number of pages available. |
    | `num_of_items` | integer | Total number of matching shifts. |
    | `shifts` | array | Paginated list of shifts. Each shift includes the standard shift fields plus a `posts` array showing post assignments for the requesting officer only. |

    Shifts are sorted by date descending, then start time ascending.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called from the officer's My Shifts screen (SDS 3.11). Only shifts where the officer is allocated are returned. The `posts` array shows post assignments specific to the requesting officer (not all officers' posts). Use `date_from` and `date_to` to display upcoming or past shifts. Use `page` for pagination.

---

### POST Shift/get_my_hours
*Officer only.* Retrieves the authenticated officer's check-in/check-out history with total hours worked. Supports pagination and date filters.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `date_from` | string | No | Start date filter (`YYYY-MM-DD`). |
    | `date_to` | string | No | End date filter (`YYYY-MM-DD`). |
    | `page` | integer | No | Page number, 0-based. Default: `0`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "num_of_pages": 2,
        "num_of_items": 25,
        "checkins": [
            {
                "checkin_id": 42,
                "shift_id": 101,
                "officer_id": "def456",
                "officer_name": null,
                "check_in_on": "2026-03-15 07:55:00",
                "check_out_on": "2026-03-15 16:05:00",
                "total_hours": 8.17,
                "shift_date": "2026-03-15",
                "community_name": "Sunset Estates"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `num_of_pages` | integer | Total number of pages available. |
    | `num_of_items` | integer | Total number of matching check-in records. |
    | `checkins` | array | Paginated list of check-in records. |
    | `checkins[].checkin_id` | integer | Unique check-in record identifier. |
    | `checkins[].shift_id` | integer or `null` | The associated shift ID. |
    | `checkins[].officer_id` | string | The officer's user ID. |
    | `checkins[].officer_name` | string or `null` | The officer's display name. |
    | `checkins[].check_in_on` | string | Datetime of check-in. |
    | `checkins[].check_out_on` | string or `null` | Datetime of check-out, or `null` if the officer is still checked in. |
    | `checkins[].total_hours` | number or `null` | Total hours worked as a decimal, or `null` if still checked in. |
    | `checkins[].shift_date` | string or `null` | The shift's date. |
    | `checkins[].community_name` | string or `null` | The community name. |

    Records are sorted by check-in time descending (most recent first).

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called from the officer's Hours list screen (SDS 3.6.2). Displays the officer's check-in/check-out history with total hours worked per session. Use `date_from` and `date_to` to filter by date range. Use `page` for pagination.

---

## Endpoints — Allocation Board & Validation

### POST Shift/get_allocation_board
*Admin only.* Retrieves the allocation board data for a specific date and community: available officers with their weekly hours and all shifts for the date with their current allocations.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to display. |
    | `board_date` | string | Yes | The date to display (`YYYY-MM-DD`). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officers": [
            {
                "officer_id": "def456",
                "name": "John Smith",
                "weekly_hours": 32.5
            }
        ],
        "shifts": [
            {
                "shift_id": 101,
                "community_id": 1,
                "community_name": "Sunset Estates",
                "series_id": null,
                "shift_date": "2026-03-15",
                "start_time": "08:00",
                "end_time": "16:00",
                "is_overnight": false,
                "status": "published",
                "notes": "Morning patrol",
                "published_on": "2026-03-10 14:00:00",
                "published_by": "abc123",
                "cancelled_on": null,
                "cancelled_by": null,
                "created_by": "abc123",
                "created_on": "2026-03-08 09:00:00",
                "last_update": "2026-03-10 14:00:00",
                "allocated_officer_ids": ["def456", "ghi789"]
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `officers` | array | All officers belonging to this community. |
    | `officers[].officer_id` | string | Officer's user ID. |
    | `officers[].name` | string | Officer's full name. |
    | `officers[].weekly_hours` | number | Total hours the officer has worked in the current week (Mon–Sun containing `board_date`). Defaults to `0`. |
    | `shifts` | array | All shifts for this community on the specified date (Draft, Published, or Active). Each shift includes standard shift fields plus `allocated_officer_ids`. |
    | `shifts[].allocated_officer_ids` | array of strings | User IDs of officers currently allocated to this shift. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | No active community exists with the given `community_id`. |

- **Usage & Flows:**
    Called to populate the Allocation Board view (SDS 4.7.3.1). The left panel displays `officers` with their `weekly_hours`. The right panel displays the shift timeline from `shifts`. The manager drags officers onto shift blocks to allocate them (calling `allocate_officer`). The `allocated_officer_ids` array shows which officers are already assigned to each shift.

---

### POST Shift/validate_allocation
*Admin only.* Checks for scheduling conflicts without performing the allocation. Returns warnings for double-bookings, insufficient rest gaps, and overtime.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The shift to validate against. |
    | `officer_id` | string | Yes | The officer to check. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "warnings": [
            {
                "type": "double_booking",
                "message": "Officer has an overlapping shift (ID: 102) on 2026-03-15",
                "conflicting_shift_id": 102
            },
            {
                "type": "rest_gap",
                "message": "Only 6.0 hours rest before adjacent shift (ID: 103)",
                "conflicting_shift_id": 103,
                "gap_hours": 6.0
            },
            {
                "type": "overtime",
                "message": "Officer would reach 48.5 planned hours this week (max: 40)",
                "planned_hours": 48.5
            }
        ],
        "has_conflicts": true
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `warnings` | array | List of detected scheduling conflicts. Empty array if no conflicts. |
    | `has_conflicts` | boolean | `true` if any warnings were found. |

    Warning types are the same as described under `allocate_officer`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |

- **Usage & Flows:**
    Called as a preview before allocating an officer — for example, when the manager drags an officer onto a shift in the Allocation Board (SDS 4.7.3.1) or before publishing. This allows the consumer to display conflict warnings inline without committing the allocation. The actual allocation is performed by `allocate_officer`.

---

## Endpoints — Recurring Shifts

### POST Shift/create_recurring_shifts
*Admin only.* Creates a series of recurring shifts based on a recurrence pattern.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community for all generated shifts. |
    | `start_date` | string | Yes | First shift date (`YYYY-MM-DD`). |
    | `start_time` | string | Yes | Start time (`HH:MM`, 24-hour). |
    | `end_time` | string | Yes | End time (`HH:MM`, 24-hour). |
    | `recurrence_pattern` | string | Yes | Recurrence pattern: `daily`, `specific_days`, or `every_x_days`. |
    | `repeat_on` | array of integers | Conditional | Day numbers (0=Sunday through 6=Saturday). Required when `recurrence_pattern` is `specific_days`. |
    | `interval_days` | integer | Conditional | Number of days between shifts. Used when `recurrence_pattern` is `every_x_days`. Default: `0`. |
    | `end_type` | string | Yes | End condition: `end_date`, `occurrences`, or `no_end`. |
    | `end_date` | string | Conditional | End date (`YYYY-MM-DD`). Required when `end_type` is `end_date`. |
    | `occurrences` | integer | Conditional | Number of shifts to generate (max 365). Required when `end_type` is `occurrences`. |
    | `officer_ids` | array | No | Array of officer user ID strings to allocate to all generated shifts. |
    | `notes` | string | No | Free-text notes (max 500 characters) applied to all generated shifts. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "series_id": 5,
        "shift_ids": [101, 102, 103, 104, 105],
        "shifts_created": 5
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `series_id` | integer | The ID of the created recurring series. |
    | `shift_ids` | array of integers | IDs of all individual shifts created. |
    | `shifts_created` | integer | Total number of shifts generated. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter is missing. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | No active community exists with the given `community_id`. |
    | 619 | invalid shift time range | The date is invalid, or start and end times are identical or malformed. |
    | 623 | officer does not belong to the shift community | One or more officer IDs are not members of the specified community. |
    | 624 | invalid recurrence configuration | The recurrence pattern is not recognized, required conditional fields are missing (e.g. `repeat_on` for `specific_days`), `occurrences` is out of range, or the configuration produced zero dates. |

- **Usage & Flows:**
    Called from the Shift Details panel when the Recurring toggle is enabled (SDS 4.7.2.1). The consumer should collect the recurrence pattern, repeat-on days (for specific days), end condition, and optional officer allocations. All generated shifts are created in Draft status and share the same `series_id`. When `end_type` is `no_end`, shifts are generated for a rolling 90-day horizon from the start date. The consumer should call `publish_shift` individually on each shift (or use bulk operations) to publish the series.

---

### POST Shift/update_recurring_shifts
*Admin only.* Updates shifts within a recurring series. The `scope` parameter controls which shifts are affected.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The ID of the shift being edited (used as the reference point). |
    | `scope` | string | Yes | Update scope: `this_only`, `this_and_future`, or `all`. |
    | `start_time` | string | No | Updated start time (`HH:MM`, 24-hour). |
    | `end_time` | string | No | Updated end time (`HH:MM`, 24-hour). |
    | `notes` | string | No | Updated notes (max 500 characters). |

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
    | 102 | missing api param | The `scope` parameter is missing. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 610 | shift not found | No active shift exists with the given `shift_id`. |
    | 619 | invalid shift time range | The provided time values are invalid or start and end times are identical. |
    | 620 | shift cannot be updated in its current status | The shift (or affected shifts) are Active, Completed, or Cancelled. |
    | 625 | shift series not found | The shift does not belong to a recurring series. |

    Scope behavior:
    - `this_only` — Updates only the specified shift.
    - `this_and_future` — Updates the specified shift and all future shifts in the same series (by date).
    - `all` — Updates all shifts in the series that are still in Draft or Published status.

- **Usage & Flows:**
    Called from the Shift Details panel when editing a recurring shift (SDS 4.7.2.1). The consumer should prompt the manager to choose the update scope: "This shift only", "This and future shifts", or "All shifts in the series" (SDS 4.7.2.1 note). Only Draft and Published shifts within the scope are modified. If any affected Published shifts are updated, push notifications are sent to their allocated officers (SDS 4.7.4).

---

## Error Code Reference

| rc | Constant | Message |
|----|----------|---------|
| 500 | ERR_COMMUNITY_NOT_FOUND | community not found |
| 610 | ERR_SHIFT_NOT_FOUND | shift not found |
| 611 | ERR_SHIFT_INVALID_STATUS | invalid shift status |
| 612 | ERR_SHIFT_CANNOT_PUBLISH | shift cannot be published in its current status |
| 613 | ERR_SHIFT_CANNOT_CANCEL | shift cannot be canceled in its current status |
| 614 | ERR_SHIFT_OFFICER_ALREADY_ALLOCATED | officer is already allocated to this shift |
| 615 | ERR_SHIFT_OFFICER_NOT_ALLOCATED | officer is not allocated to this shift |
| 616 | ERR_SHIFT_OFFICER_CONFLICT | officer has a scheduling conflict |
| 617 | ERR_SHIFT_ALREADY_CHECKED_IN | officer has already checked in |
| 618 | ERR_SHIFT_NOT_CHECKED_IN | officer has not checked in |
| 619 | ERR_SHIFT_INVALID_TIME_RANGE | invalid shift time range |
| 620 | ERR_SHIFT_CANNOT_UPDATE | shift cannot be updated in its current status |
| 621 | ERR_SHIFT_CANNOT_DELETE | only draft shifts can be deleted |
| 622 | ERR_SHIFT_POST_NOT_FOUND | post not found or not active |
| 623 | ERR_SHIFT_OFFICER_NOT_IN_COMMUNITY | officer does not belong to the shift community |
| 624 | ERR_SHIFT_INVALID_RECURRENCE | invalid recurrence configuration |
| 625 | ERR_SHIFT_SERIES_NOT_FOUND | shift series not found |
| 626 | ERR_SHIFT_ALREADY_ACTIVE | shift is already active |
| 627 | ERR_SHIFT_ALREADY_COMPLETED | shift is already completed |
| 628 | ERR_SHIFT_ALREADY_CANCELLED | shift is already cancelled |
| 629 | ERR_SHIFT_NO_OFFICERS | shift has no allocated officers and cannot be published |
