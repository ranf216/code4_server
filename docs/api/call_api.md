# Call API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Call/<endpoint_name>"`.

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

### Call Categories

Each call belongs to one of five categories that determine its behavior, visibility rules, and lifecycle:

| Category | Description | Created By | Notification Target |
|----------|-------------|------------|---------------------|
| `medical_emergency` | Medical emergency requiring immediate officer response. | Resident | All officers in the same community. |
| `security_emergency` | Security emergency requiring immediate officer response. | Resident | All officers in the same community. |
| `panic` | Panic button activation — silent alert with GPS location. | Officer | All officers in the same community. |
| `concierge_service` | Non-urgent service request (e.g. maintenance, delivery). Requires a `service_type`. | Resident | All admins (for manual assignment). |
| `test` | Test call for development/QA purposes. | Resident | None. |

Emergency categories (`medical_emergency`, `security_emergency`) enforce a **one active emergency per resident** rule — a resident cannot create a new emergency while another is still open (status `new` or `accepted`).

### Call Statuses

| Status | Description |
|--------|-------------|
| `new` | Call was just created and is awaiting officer response or admin assignment. |
| `accepted` | An officer has accepted the call or an admin has assigned an officer to it. |
| `resolved` | The call has been resolved by the assigned officer or by an admin. |
| `canceled` | The call was canceled. Only `concierge_service` calls can be canceled. |

**Open statuses:** `new`, `accepted`
**Closed statuses:** `resolved`, `canceled`

### Call Priorities

| Priority | Description |
|----------|-------------|
| `urgent` | Automatically set for all emergency and panic categories. |
| `important` | High importance, manually set by resident. |
| `normal` | Default priority. |
| `low` | Low importance. |

For `medical_emergency`, `security_emergency`, and `panic` calls, the priority is always forced to `urgent` regardless of what the caller provides.

### Service Types

Concierge service calls require a `service_type` value. Valid service types are managed through the Settings module and are dynamic (community-configurable). Retrieve the current list via the Settings API (`Settings/get_service_types`).

### Visibility Rules

- **Residents** see only their own calls.
- **Officers** see:
    - Emergency and panic calls in their community (excluding calls they have passed on).
    - Concierge and test calls only if explicitly assigned to them.
- **Admins** see all calls across all communities (optionally filtered by `community_id`).

### Media Attachments

Calls support up to **5 image files**, **1 audio file**, and **1 video file**. Officer confirmation evidence supports a separate set of up to **5 confirmation images** and **1 confirmation video**. All file IDs must be obtained via `File/upload_file_base64` before attaching.

### Notifications

The system automatically sends push notifications at key lifecycle events:

| Event | Notification Type | Recipients |
|-------|-------------------|------------|
| Emergency created | `new_emergency` | All community officers |
| Panic button pressed | `panic_button` | All community officers |
| Concierge service created | `new_service_call` | All admins |
| Call accepted | `call_accepted` | Resident (call creator) |
| Call resolved | `call_resolved` | Resident (call creator) |
| Call updated | `call_updated` | Officer (if resident updated) or Resident (if officer updated) |
| Call canceled | `call_canceled` | Assigned officer and/or Resident (if admin canceled) |
| Call assigned by admin | `call_accepted` | Assigned officer + Resident |
| Resident liked a resolved call | `resident_like` | Assigned officer |

---

## Endpoints

### POST Call/create_call
*Creates a new call. Residents can create emergency, concierge, and test calls. Officers can only create panic calls.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Resident or Officer). |
    | `category` | string | Yes | — | Call category: `medical_emergency`, `security_emergency`, `concierge_service`, `test`, `panic`. |
    | `service_type` | string | Conditional | — | Service type key. **Required** when `category` is `concierge_service`. Must be a valid key from `Settings/get_service_types`. Ignored for other categories. |
    | `description` | string | No | — | Free-text description of the call. |
    | `address` | string | No | — | Resident home address. |
    | `current_address` | string | No | — | Current location description (relevant for emergencies and panic). |
    | `latitude` | string | No | — | Current latitude as a decimal string (e.g. `"32.0853000"`). |
    | `longitude` | string | No | — | Current longitude as a decimal string (e.g. `"34.7818000"`). |
    | `priority` | string | No | `"normal"` | Priority level: `urgent`, `important`, `normal`, `low`. Ignored for emergency/panic (forced to `urgent`). |
    | `scheduled_date` | string | No | — | Scheduled date in `YYYY-MM-DD` format (for `concierge_service`). |
    | `scheduled_time_from` | string | No | — | Scheduled time range start in `HH:MM` format (for `concierge_service`). |
    | `scheduled_time_to` | string | No | — | Scheduled time range end in `HH:MM` format (for `concierge_service`). |
    | `media_file_ids` | array | No | — | Array of file ID strings for attached images (max 5). Obtain IDs via `File/upload_file_base64`. |
    | `audio_file_id` | string | No | — | File ID of an audio recording. |
    | `video_file_id` | string | No | — | File ID of a video recording. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "call_id": 42
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `call_id` | integer | The unique identifier of the newly created call. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 103 | no privileges | Officer attempted to create a non-panic call. |
    | 568 | invalid call category | The `category` value is not one of the allowed categories. |
    | 570 | invalid call priority | The `priority` value is not one of `urgent`, `important`, `normal`, `low`. |
    | 571 | invalid service type | `service_type` is missing or not a valid key (for `concierge_service` only). |
    | 567 | an active emergency call already exists | The resident already has an open `medical_emergency` or `security_emergency` call. |
    | 572 | maximum number of media files reached | More than 5 image files were provided. |

- **Usage & Flows:**
    The entry point for all call creation. The consumer app should:
    1. For **emergency calls**: Collect location data (GPS), optional description and media, then call with `category` set to the appropriate emergency type. The system notifies all community officers immediately.
    2. For **panic**: The officer presses a panic button. The app sends `category: "panic"` with current GPS coordinates. All community officers are alerted.
    3. For **concierge service**: The resident fills out a service request form including service type (from `Settings/get_service_types`), description, scheduling fields, and optional media. Admins are notified for manual assignment.
    4. For **test calls**: Used only during testing; no notifications are sent.

    After a successful call, navigate the user to the call detail screen using the returned `call_id`.

---

### POST Call/get_calls
*Retrieves a paginated, role-filtered list of calls. Supports filtering by status, category, community, open/closed state, and free-text search.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Admin, Officer, or Resident). |
    | `status` | string | No | — | Filter by status: `new`, `accepted`, `resolved`, `canceled`. |
    | `category` | string | No | — | Filter by category: `medical_emergency`, `security_emergency`, `concierge_service`, `test`, `panic`. |
    | `community_id` | integer | No | `0` | Filter by community ID (admin only). `0` = all communities. |
    | `is_open` | boolean | No | `null` | `true` = open calls (`new` + `accepted`), `false` = closed calls (`resolved` + `canceled`), `null`/omit = all. |
    | `search_text` | string | No | — | Free-text search across call description, address, and resident name. |
    | `sort_by` | string | No | — | Sort column: `created_on`, `status`, `category`, `priority`. |
    | `sort_dir` | string | No | `"desc"` | Sort direction: `asc` or `desc`. |
    | `offset` | integer | No | `0` | Pagination offset. |
    | `limit` | integer | No | `20` | Page size (max 100). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "calls": [
            {
                "call_id": 42,
                "category": "security_emergency",
                "service_type": null,
                "status": "accepted",
                "priority": "urgent",
                "description": "Suspicious person near entrance",
                "address": "123 Main St",
                "current_address": "Near building entrance",
                "latitude": 32.0853,
                "longitude": 34.7818,
                "scheduled_date": null,
                "scheduled_time_from": null,
                "scheduled_time_to": null,
                "media": ["https://...image1.jpg"],
                "audio_url": null,
                "video_url": null,
                "confirmation_media": [],
                "confirmation_video_url": null,
                "officer_comments": "",
                "reaction": null,
                "resident_comment": "",
                "resident_user_id": "abc123",
                "resident_name": "John Doe",
                "officer_user_id": "ofc456",
                "officer_name": "Jane Smith",
                "community_id": 5,
                "community_name": "Sunset Gardens",
                "assigned_by": null,
                "accepted_on": "2025-01-15 10:35:00",
                "resolved_on": null,
                "canceled_on": null,
                "created_on": "2025-01-15 10:30:00",
                "last_update": "2025-01-15 10:35:00"
            }
        ],
        "total_count": 15,
        "offset": 0,
        "limit": 20
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `calls` | array | Array of call objects for the current page. See **Call Object** below. |
    | `total_count` | integer | Total number of calls matching all filters (before pagination). |
    | `offset` | integer | The offset applied. |
    | `limit` | integer | The page size applied. |

    **Call Object Fields:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `call_id` | integer | Unique call identifier. |
    | `category` | string | Call category. |
    | `service_type` | string or null | Service type key (only for `concierge_service`, `null` otherwise). |
    | `status` | string | Current call status. |
    | `priority` | string | Call priority. |
    | `description` | string | Call description. |
    | `address` | string | Resident home address. |
    | `current_address` | string | Current location description. |
    | `latitude` | float or null | GPS latitude. |
    | `longitude` | float or null | GPS longitude. |
    | `scheduled_date` | string or null | Scheduled date (`YYYY-MM-DD`). |
    | `scheduled_time_from` | string or null | Scheduled time start (`HH:MM`). |
    | `scheduled_time_to` | string or null | Scheduled time end (`HH:MM`). |
    | `media` | array | Array of image URLs. |
    | `audio_url` | string or null | Audio recording URL. |
    | `video_url` | string or null | Video recording URL. |
    | `confirmation_media` | array | Array of officer confirmation image URLs. |
    | `confirmation_video_url` | string or null | Officer confirmation video URL. |
    | `officer_comments` | string | Officer's notes/comments. |
    | `reaction` | integer or null | Resident reaction: `1` = like, `-1` = dislike, `null` = none. |
    | `resident_comment` | string | Resident's post-resolution comment. |
    | `resident_user_id` | string | User ID of the call creator (resident or officer). |
    | `resident_name` | string or null | Full name of the call creator. |
    | `officer_user_id` | string or null | User ID of the assigned officer, or `null` if unassigned. |
    | `officer_name` | string or null | Full name of the assigned officer. |
    | `community_id` | integer | Community ID the call belongs to. |
    | `community_name` | string or null | Community name. |
    | `assigned_by` | string or null | User ID of the admin who assigned the officer (if admin-assigned). |
    | `accepted_on` | string or null | Timestamp when the call was accepted. |
    | `resolved_on` | string or null | Timestamp when the call was resolved. |
    | `canceled_on` | string or null | Timestamp when the call was canceled. |
    | `created_on` | string | Timestamp when the call was created. |
    | `last_update` | string or null | Timestamp of the last modification. |

    Results are ordered by `created_on DESC` by default unless `sort_by` is specified.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 569 | invalid call status | The `status` filter value is not a valid status. |
    | 568 | invalid call category | The `category` filter value is not a valid category. |

- **Usage & Flows:**
    The primary endpoint for call list screens. Use `is_open: true` for the active/open calls list, and `is_open: false` for call history. Supports infinite scroll via `offset`/`limit`. Residents see only their own calls; officers see emergency/panic calls in their community (minus passed ones) plus calls explicitly assigned to them; admins see all.

---

### POST Call/get_call
*Retrieves full details of a single call, including media URLs, officer comments, and resident feedback.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Admin, Officer, or Resident). |
    | `call_id` | integer | Yes | The call ID to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "call":
        {
            "call_id": 42,
            "category": "security_emergency",
            "service_type": null,
            "status": "resolved",
            "priority": "urgent",
            "description": "Suspicious person near entrance",
            "address": "123 Main St",
            "current_address": "Near building entrance",
            "latitude": 32.0853,
            "longitude": 34.7818,
            "scheduled_date": null,
            "scheduled_time_from": null,
            "scheduled_time_to": null,
            "media": ["https://...image1.jpg"],
            "audio_url": "https://...audio.mp3",
            "video_url": null,
            "confirmation_media": ["https://...confirm1.jpg"],
            "confirmation_video_url": null,
            "officer_comments": "Situation secured, individual was a delivery person.",
            "reaction": 1,
            "resident_comment": "Thank you for the quick response!",
            "resident_user_id": "abc123",
            "resident_name": "John Doe",
            "officer_user_id": "ofc456",
            "officer_name": "Jane Smith",
            "community_id": 5,
            "community_name": "Sunset Gardens",
            "assigned_by": null,
            "accepted_on": "2025-01-15 10:35:00",
            "resolved_on": "2025-01-15 11:00:00",
            "canceled_on": null,
            "created_on": "2025-01-15 10:30:00",
            "last_update": "2025-01-15 11:00:00"
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `call` | object | A single call object. See the Call Object Fields table in `get_calls`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist, has been deleted, or the current user does not have access to it. |

    **Access control:** Residents can only view their own calls. Officers can view emergency/panic calls in their community or concierge/test calls assigned to them. Admins can view any call. If access is denied, the response is `call not found` (to avoid revealing existence of restricted calls).

- **Usage & Flows:**
    Used to display the call detail screen. Call this after the user taps a call in the list, or after creating a call to show its details. The response contains all information needed to render the full call detail view, including media galleries, officer notes, and resident feedback.

---

### POST Call/update_call
*Updates a call. Residents can update their own calls while in `new` status. Officers can add comments and confirmation media to calls assigned to them while in `accepted` status.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Resident or Officer). |
    | `call_id` | integer | Yes | — | The call ID to update. |
    | `description` | string | No | `null` | Updated description (resident only). |
    | `priority` | string | No | — | Updated priority: `urgent`, `important`, `normal`, `low` (resident only). |
    | `scheduled_date` | string | No | `null` | Updated scheduled date `YYYY-MM-DD` (resident only, `concierge_service`). |
    | `scheduled_time_from` | string | No | `null` | Updated scheduled time start `HH:MM` (resident only). |
    | `scheduled_time_to` | string | No | `null` | Updated scheduled time end `HH:MM` (resident only). |
    | `media_file_ids` | array | No | `null` | New media file IDs to add (resident only, max 5 total). |
    | `keep_media` | array | No | `null` | URLs of existing media to retain (resident only). Combined with `media_file_ids`, total must not exceed 5. |
    | `audio_file_id` | string | No | `null` | Audio file ID (resident only). Pass empty string to remove. |
    | `video_file_id` | string | No | `null` | Video file ID (resident only). Pass empty string to remove. |
    | `officer_comments` | string | No | `null` | Officer comments (officer only). |
    | `confirmation_media_file_ids` | array | No | `null` | Confirmation image file IDs (officer only, max 5 total). |
    | `keep_confirmation_media` | array | No | `null` | URLs of existing confirmation media to retain (officer only). |
    | `confirmation_video_file_id` | string | No | `null` | Confirmation video file ID (officer only). Pass empty string to remove. |

    **Media update strategy:** When updating media, pass `keep_media` with the URLs of existing images to retain and `media_file_ids` with any new file IDs to add. Images not in either list are removed. The same pattern applies to `keep_confirmation_media` / `confirmation_media_file_ids`.

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    If no updatable fields are provided, the call succeeds with no changes applied.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 103 | no privileges | User type is not Resident or Officer. |
    | 560 | call not found | Call does not exist or the resident is not the call creator. |
    | 564 | call cannot be accepted in its current status | Resident tried to update a call that is no longer in `new` status. |
    | 565 | call cannot be resolved in its current status | Officer tried to update a call that is not in `accepted` status. |
    | 573 | call is not assigned to this officer | Officer tried to update a call assigned to a different officer. |
    | 570 | invalid call priority | Invalid priority value. |
    | 572 | maximum number of media files reached | Combined kept + new media exceeds 5 files. |

- **Usage & Flows:**
    - **Resident flow:** Before an officer accepts the call (status `new`), the resident can edit the description, priority, schedule, and media. Once the call is accepted, the resident can no longer update it.
    - **Officer flow:** After accepting a call (status `accepted`), the officer can add comments and attach confirmation evidence (photos/video of the resolved situation). This is typically done before or during resolution.
    - After a successful update, the other party (officer or resident) receives a `call_updated` notification.

---

### POST Call/accept_call
*Officer accepts an emergency or panic call, marking it as "on the way." The call status changes from `new` to `accepted` and the officer is assigned.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Officer only). |
    | `call_id` | integer | Yes | The call ID to accept. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the call's status becomes `accepted`, the officer is recorded as the assigned officer, and the `accepted_on` timestamp is set.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist or the officer is not in the same community. |
    | 564 | call cannot be accepted in its current status | Call is not in `new` status (e.g. already resolved or canceled). |
    | 561 | call has already been accepted | Another officer has already accepted the call. |

    Only `medical_emergency`, `security_emergency`, and `panic` calls can be accepted. Attempting to accept a `concierge_service` or `test` call returns `call cannot be accepted`.

- **Usage & Flows:**
    Displayed as an "Accept" or "On the way" button on the emergency call detail screen for officers. Only visible when the call status is `new`. After acceptance, the resident receives a `call_accepted` notification and the call transitions to the active/in-progress view.

---

### POST Call/pass_call
*Officer passes on (declines) an emergency or panic call. The call disappears from this officer's list but remains visible to all other officers in the community.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Officer only). |
    | `call_id` | integer | Yes | The call ID to pass on. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    The call status remains `new`. The officer is added to the call's internal "passed by" list, which excludes the call from their future `get_calls` results.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist or the officer is not in the same community. |
    | 564 | call cannot be accepted in its current status | Call is not in `new` status (already accepted, resolved, or canceled). |

    Only `medical_emergency`, `security_emergency`, and `panic` calls can be passed. Attempting to pass a `concierge_service` or `test` call returns `call cannot be accepted`.

- **Usage & Flows:**
    Displayed as a "Pass" or "Decline" button alongside the "Accept" button on emergency call notifications or the call detail screen. Passing a call is a soft action — it only hides the call from this specific officer. Other officers in the community can still see and accept it. If the officer has already passed, calling again is a no-op (succeeds silently).

---

### POST Call/resolve_call
*Marks a call as resolved. Officers can resolve calls assigned to them (except panic calls). Admins can resolve any accepted call including panic calls.*

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | A valid session token (Officer or Admin). |
    | `call_id` | integer | Yes | — | The call ID to resolve. |
    | `officer_comments` | string | No | — | Final officer comments or notes about the resolution. |
    | `confirmation_media_file_ids` | array | No | — | File IDs for confirmation images (max 5). |
    | `confirmation_video_file_id` | string | No | — | File ID for a confirmation video. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the call's status becomes `resolved` and the `resolved_on` timestamp is set. Any provided comments and confirmation media are saved.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist. |
    | 562 | call has already been resolved | Call was already resolved. |
    | 563 | call has already been canceled | Call was already canceled. |
    | 565 | call cannot be resolved in its current status | Call is not in `accepted` status (e.g. still `new`). |
    | 103 | no privileges | Officer attempted to resolve a panic call (only admins can resolve panic). |
    | 573 | call is not assigned to this officer | Officer tried to resolve a call assigned to a different officer. |
    | 572 | maximum number of media files reached | More than 5 confirmation images provided. |

- **Usage & Flows:**
    Displayed as a "Resolve" button on the call detail screen for officers on calls they've accepted. The officer may optionally add final comments and attach confirmation evidence (e.g. photos of the resolved situation). After resolution, the resident receives a `call_resolved` notification and can then provide feedback (reaction + comment). **Important:** Panic calls can only be resolved by an admin, not by an officer.

---

### POST Call/assign_call
*Admin assigns an officer to a call. The call status changes from `new` to `accepted` and the specified officer becomes the assigned handler.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Admin only). |
    | `call_id` | integer | Yes | The call ID to assign. |
    | `officer_user_id` | string | Yes | The user ID of the officer to assign. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the call's status becomes `accepted`, the officer is assigned, the `assigned_by` field is set to the admin's user ID, and the `accepted_on` timestamp is set. Both the assigned officer and the resident receive `call_accepted` notifications.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist. |
    | 561 | call has already been accepted | Call is already in `accepted` status. |
    | 564 | call cannot be accepted in its current status | Call is not in `new` status (e.g. resolved or canceled). |
    | (officer not found) | officer not found | The specified officer does not exist or is inactive. |

- **Usage & Flows:**
    Used in the admin management portal to manually assign officers to calls — primarily for `concierge_service` calls that don't auto-notify officers, but also applicable to any unaccepted call. The admin selects a call in `new` status and picks an officer from the available list.

---

### POST Call/cancel_call
*Cancels a concierge service call. Only `concierge_service` calls in `new` or `accepted` status can be canceled. Emergency and panic calls cannot be canceled.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Resident or Admin). |
    | `call_id` | integer | Yes | The call ID to cancel. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the call's status becomes `canceled` and the `canceled_on` timestamp is set.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist, or resident is not the call creator. |
    | 566 | call cannot be canceled in its current status | Call is not a `concierge_service`, or its status is not open. |
    | 563 | call has already been canceled | Call was already canceled. |
    | 562 | call has already been resolved | Call was already resolved. |

- **Usage & Flows:**
    Displayed as a "Cancel" button on the call detail screen for residents viewing their own concierge service calls, and for admins. This action is irreversible. After cancellation, the assigned officer (if any) receives a `call_canceled` notification. If the admin cancels, the resident also receives a notification.

---

### POST Call/add_reaction
*Adds a like or dislike reaction to a resolved call. Only the resident who created the call can react, and the call must be in `resolved` status.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Resident only). |
    | `call_id` | integer | Yes | The call ID to react to. |
    | `reaction` | integer | Yes | `1` for like, `-1` for dislike. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the reaction is recorded. If the resident sends a like (`1`) and an officer is assigned, the officer receives a `resident_like` notification.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist or the resident is not the call creator. |
    | 565 | call cannot be resolved in its current status | Call is not in `resolved` status. |
    | 102 | invalid api parameter | Reaction value is not `1` or `-1`. |

- **Usage & Flows:**
    Displayed on the call detail screen after a call is resolved, as a thumbs-up / thumbs-down feedback widget. Calling this endpoint again with a different value overwrites the previous reaction. This is the resident's way of rating the officer's service.

---

### POST Call/add_comment
*Adds a text comment to a resolved call. Only the resident who created the call can comment, and the call must be in `resolved` status.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Resident only). |
    | `call_id` | integer | Yes | The call ID to comment on. |
    | `comment` | string | Yes | The comment text. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the resident comment is saved. Calling again overwrites the previous comment.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist or the resident is not the call creator. |
    | 565 | call cannot be resolved in its current status | Call is not in `resolved` status. |

- **Usage & Flows:**
    Displayed alongside the reaction widget on the resolved call detail screen. The resident can type a text comment (e.g. "Great response time, thank you!"). This comment is visible to officers and admins when viewing the call details.

---

### POST Call/delete_test_call
*Soft-deletes a test call. Only calls with `category: "test"` can be deleted. This is a cleanup endpoint for development and QA use.*

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Admin only). |
    | `call_id` | integer | Yes | The call ID to delete. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the test call is soft-deleted and no longer appears in any listing or detail query.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 560 | call not found | Call does not exist or has already been deleted. |
    | 574 | only test calls can be deleted | The call's category is not `test`. |

- **Usage & Flows:**
    Used by admins to clean up test data. Non-test calls (emergencies, concierge, panic) cannot be deleted through this endpoint — they remain in the system as historical records.

---
