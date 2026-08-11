# Call Module — Application Developer Guide

**Module:** Call (Phase 2.3)  
**Audience:** Mobile (iOS/Android) and Web (Admin Portal) application developers  
**Last Updated:** 2026-08-11

> **Important:** This guide treats the server as a **black box**. No internal database details, server-side logic, or infrastructure specifics are described. You interact exclusively through the documented API endpoints, request payloads, and response structures.

---

## 1. Concepts & Terminology

### 1.1 Call Categories

| Category | Value to Send | Who Creates | Description |
|---|---|---|---|
| Medical Emergency | `medical_emergency` | Resident | Urgent medical assistance request |
| Security Emergency | `security_emergency` | Resident | Security threat or incident |
| Panic | `panic` | Resident **or** Officer | Duress/panic button activation |
| Concierge Service | `concierge_service` | Resident | Scheduled concierge service request |
| Test | `test` | Resident | Communication test (admin can delete) |

### 1.2 Call Statuses

| Status | Meaning |
|---|---|
| `new` | Call is created and awaiting response |
| `accepted` | An officer has accepted or been assigned to the call |
| `resolved` | The call has been completed and closed |
| `canceled` | The call was canceled (concierge calls only) |

### 1.3 Priority Levels

| Priority | Value |
|---|---|
| Urgent | `urgent` (auto-set for emergencies/panic) |
| Important | `important` |
| Normal | `normal` (default) |
| Low | `low` |

### 1.4 User Roles

| Role | Description |
|---|---|
| **Admin** | Management portal user. Can view all calls, assign officers, resolve any call type. |
| **Officer** | Security officer mobile app user. Can accept/pass/resolve calls. Can only create `panic` calls. |
| **Resident** | Community resident mobile app user. Can create calls, view own calls, react to resolved calls. |

---

## 2. Authentication

All Call API endpoints require session-token authentication. Include the `token` parameter (obtained from login) in every request.

```json
{
    "token": "<session_token>",
    ...other parameters
}
```

---

## 3. API Response Format

All responses include a `rc` (return code) field:

```json
{
    "rc": 0,
    "rc_desc": "OK"
}
```

- `rc: 0` — Success.
- `rc: non-zero` — Error. Check `rc` against the error codes listed in §9.

---

## 4. Call Object Structure

When the API returns a call (via `get_call` or in the `calls` array from `get_calls`), it has the following structure:

```json
{
    "call_id": 42,
    "category": "medical_emergency",
    "service_type": null,
    "status": "accepted",
    "priority": "urgent",
    "description": "Fall in stairwell, possible broken leg",
    "address": "Unit 12B, Building 4",
    "current_address": "Lobby area near elevator B",
    "latitude": 32.0853000,
    "longitude": 34.7818000,
    "scheduled_date": null,
    "scheduled_time_from": null,
    "scheduled_time_to": null,
    "media": [
        "https://files.example.com/files/a/abc123..."
    ],
    "audio_url": "https://files.example.com/files/a/def456...",
    "video_url": null,
    "confirmation_media": [],
    "confirmation_video_url": null,
    "officer_comments": "",
    "reaction": null,
    "resident_comment": "",
    "resident_user_id": "usr_abc123",
    "resident_name": "John Doe",
    "officer_user_id": "usr_ofc456",
    "officer_name": "Officer Smith",
    "community_id": 5,
    "community_name": "Sunset Heights",
    "assigned_by": null,
    "accepted_on": "2026-08-10 14:30:00",
    "resolved_on": null,
    "canceled_on": null,
    "created_on": "2026-08-10 14:25:00",
    "last_update": "2026-08-10 14:30:00"
}
```

**Field notes:**
- `media` — Array of image URLs (max 5). Empty array `[]` if no images.
- `audio_url`, `video_url` — Single file URLs or `null`.
- `confirmation_media`, `confirmation_video_url` — Officer-submitted evidence.
- `service_type` — Only populated for `concierge_service` calls.
- `scheduled_date`, `scheduled_time_from`, `scheduled_time_to` — Only relevant for concierge service calls.
- `assigned_by` — Admin user ID who assigned the officer (null if officer self-accepted).
- `reaction` — `1` (like), `-1` (dislike), or `null` (no reaction yet).

---

## 5. Admin Portal Workflows (Web)

### 5.1 Active Calls Dashboard — `Call/get_calls`

Use `is_open=true` to fetch all active (new + accepted) calls.

**Request:**
```json
{
    "token": "<admin_token>",
    "is_open": true,
    "sort_by": "created_on",
    "sort_dir": "desc",
    "offset": 0,
    "limit": 50
}
```

**Response:**
```json
{
    "rc": 0,
    "calls": [ ...call objects... ],
    "total_count": 127,
    "offset": 0,
    "limit": 50
}
```

**Filtering options:**
- `community_id` — Filter by community (admin only). Pass `0` or omit for all communities.
- `status` — Filter by specific status: `new`, `accepted`, `resolved`, `canceled`.
- `category` — Filter by category: `medical_emergency`, `security_emergency`, `concierge_service`, `test`, `panic`.
- `search_text` — Free-text search across description, address, and resident name.

**Pagination:** Use `offset` and `limit`. The response includes `total_count` for rendering pagination controls.

### 5.2 Calls History — `Call/get_calls`

Use `is_open=false` to fetch resolved and canceled calls.

```json
{
    "token": "<admin_token>",
    "is_open": false,
    "offset": 0,
    "limit": 20
}
```

**24-Hour Active Feed Rule (SDS 2.5.1.5):** Resolved concierge service calls should remain in the "Active" tab for 24 hours after resolution before moving to history. Implement this client-side:
- If `call.status === "resolved"` and `call.category === "concierge_service"` and `(now - call.resolved_on) < 24 hours` → show in Active tab.
- Otherwise → show in History tab.

### 5.3 Assign Officer to Service Call — `Call/assign_call`

Used by admins/managers to assign an officer to a `new` concierge service call.

**Request:**
```json
{
    "token": "<admin_token>",
    "call_id": 42,
    "officer_user_id": "usr_ofc789"
}
```

**Response (success):**
```json
{
    "rc": 0
}
```

The call status automatically transitions from `new` to `accepted`. Both the assigned officer and the resident receive push notifications.

**Expected errors:**
| RC | When |
|---|---|
| 560 | Call not found |
| 568 | Call already accepted (already has an officer) |
| 567 | Call status is not `new` (resolved/canceled) |
| 104 | Officer not found or inactive |

### 5.4 Resolve a Call — `Call/resolve_call`

Admins can resolve any call type. This is the **only** way to close panic calls.

**Request:**
```json
{
    "token": "<admin_token>",
    "call_id": 42,
    "officer_comments": "Situation verified and resolved. All clear.",
    "confirmation_media_file_ids": ["file_001", "file_002"],
    "confirmation_video_file_id": "file_003"
}
```

All parameters except `call_id` are optional.

**Response (success):**
```json
{
    "rc": 0
}
```

### 5.5 Cancel a Service Call — `Call/cancel_call`

Admins can cancel concierge service calls. Emergency and panic calls **cannot** be canceled.

**Request:**
```json
{
    "token": "<admin_token>",
    "call_id": 42
}
```

**Expected errors:**
| RC | When |
|---|---|
| 572 | Call is not a concierge service call |
| 570 | Call already resolved |
| 571 | Call already canceled |

### 5.6 View Call Details — `Call/get_call`

```json
{
    "token": "<admin_token>",
    "call_id": 42
}
```

**Response:**
```json
{
    "rc": 0,
    "call": { ...full call object... }
}
```

### 5.7 Delete Test Call — `Call/delete_test_call`

Removes test calls from the system (soft-delete — they will no longer appear in any listing).

```json
{
    "token": "<admin_token>",
    "call_id": 42
}
```

**Expected errors:**
| RC | When |
|---|---|
| 574 | Call is not a test call |

---

## 6. Resident Mobile App Workflows

### 6.1 Create an Emergency Call — `Call/create_call`

**Request (medical emergency):**
```json
{
    "token": "<resident_token>",
    "category": "medical_emergency",
    "description": "Heart pain, difficulty breathing",
    "current_address": "Building 3, 2nd floor hallway",
    "latitude": "32.0853000",
    "longitude": "34.7818000",
    "media_file_ids": ["file_001"]
}
```

**Request (security emergency):**
```json
{
    "token": "<resident_token>",
    "category": "security_emergency",
    "description": "Suspicious person trying to enter unit",
    "current_address": "Parking lot B, near gate 2"
}
```

**Response (success):**
```json
{
    "rc": 0,
    "call_id": 42
}
```

**Notes:**
- Emergency calls have their priority automatically set to `urgent`.
- A resident cannot create a new emergency if they already have an active (new/accepted) emergency call. RC `565` will be returned.

### 6.2 Create a Panic Call — `Call/create_call`

```json
{
    "token": "<resident_token>",
    "category": "panic",
    "latitude": "32.0853000",
    "longitude": "34.7818000",
    "current_address": "Unit 5A"
}
```

Panic calls are broadcast to all officers in the community. The priority is automatically set to `urgent`.

### 6.3 Create a Concierge Service Call — `Call/create_call`

```json
{
    "token": "<resident_token>",
    "category": "concierge_service",
    "service_type": "package_delivery",
    "description": "Need package picked up from reception",
    "priority": "normal",
    "scheduled_date": "2026-08-15",
    "scheduled_time_from": "10:00",
    "scheduled_time_to": "12:00"
}
```

**Notes:**
- `service_type` is **required** for concierge calls. The valid values come from the server's configured service types.
- Concierge calls are sent to admin/manager dashboards, not directly to officers.

### 6.4 Update a Call — `Call/update_call`

Residents can update their calls **only while status is `new`** (before an officer accepts).

```json
{
    "token": "<resident_token>",
    "call_id": 42,
    "description": "Updated: also having nausea",
    "media_file_ids": ["file_new_001"],
    "keep_media": ["https://files.example.com/files/a/existing_image..."]
}
```

**Media update pattern:**
- `media_file_ids` — Array of **new** file IDs to add (uploaded via `File/upload_file_base64`).
- `keep_media` — Array of **existing** media URLs to retain. Any existing media URL not included in this array will be removed.
- Combined total (new + kept) must not exceed 5 images.

### 6.5 Cancel a Service Call — `Call/cancel_call`

Residents can cancel their own concierge service calls.

```json
{
    "token": "<resident_token>",
    "call_id": 42
}
```

Only concierge service calls can be canceled. Attempting to cancel an emergency or panic call returns RC `572`.

### 6.6 View My Calls — `Call/get_calls`

Residents automatically see only their own calls.

```json
{
    "token": "<resident_token>",
    "is_open": true,
    "offset": 0,
    "limit": 20
}
```

### 6.7 React to a Resolved Call — `Call/add_reaction`

After a call is resolved, the resident can like or dislike the service.

```json
{
    "token": "<resident_token>",
    "call_id": 42,
    "reaction": 1
}
```

Values: `1` = like, `-1` = dislike.

**Restriction:** Only the call creator can react. The call must be in `resolved` status.

### 6.8 Comment on a Resolved Call — `Call/add_comment`

```json
{
    "token": "<resident_token>",
    "call_id": 42,
    "comment": "Officer was very professional, thank you!"
}
```

### 6.9 Real-Time Updates

When an officer accepts a call, the resident receives:
1. A **push notification** (type: `call_accepted`) with the officer's name.
2. A **WebSocket event** (`new_notification`) for instant in-app update.

**Recommended client behavior:**
- On receiving `call_accepted` notification → refresh the active call screen to show the officer's name and the `accepted` status.
- On receiving `call_resolved` notification → transition the call to a resolution summary screen showing officer comments, confirmation media, and the reaction prompt.

---

## 7. Officer Mobile App Workflows

### 7.1 Create a Panic Call — `Call/create_call`

Officers can **only** create `panic` category calls. Attempting any other category returns RC `103` (No Privileges).

```json
{
    "token": "<officer_token>",
    "category": "panic",
    "latitude": "32.0853000",
    "longitude": "34.7818000",
    "current_address": "Post 3, east gate"
}
```

**UI Recommendation:** Implement a prominent, quick-access panic button on the main navigation. No category selection needed — always send `"category": "panic"`.

### 7.2 View Dispatch Queue — `Call/get_calls`

Officers see two types of calls:
1. **Community emergency/panic calls** — All new (unassigned) emergency and panic calls in their community, excluding calls they have passed on.
2. **Assigned service calls** — Concierge service calls explicitly assigned to them by an admin.

```json
{
    "token": "<officer_token>",
    "is_open": true,
    "sort_by": "created_on",
    "sort_dir": "desc",
    "offset": 0,
    "limit": 20
}
```

**UI Recommendation:** Split the officer's call view into two sections:
- **Dispatch Queue:** Filter for `category` in (`medical_emergency`, `security_emergency`, `panic`) with `status=new`. Show prominent **Accept** and **Pass** buttons.
- **My Tasks:** Filter for `category=concierge_service`. These are assigned calls showing scheduled dates/times.

### 7.3 Accept an Emergency/Panic Call — `Call/accept_call`

```json
{
    "token": "<officer_token>",
    "call_id": 42
}
```

**Response (success):**
```json
{
    "rc": 0
}
```

After acceptance, the call disappears from other officers' dispatch queues (another officer would see RC `568` if they try to accept).

**Expected errors:**
| RC | When |
|---|---|
| 560 | Call not found or not in officer's community |
| 567 | Call is not in `new` status or not an emergency/panic category |
| 568 | Call already accepted by another officer |

### 7.4 Pass on an Emergency/Panic Call — `Call/pass_call`

```json
{
    "token": "<officer_token>",
    "call_id": 42
}
```

**Effect:** The call immediately disappears from this officer's feed. It remains visible to all other officers in the community. The call stays in `new` status — no status change occurs.

**Expected errors:**
| RC | When |
|---|---|
| 560 | Call not found or not in officer's community |
| 567 | Call is not in `new` status or not an emergency/panic category |

### 7.5 Update Call Details — `Call/update_call`

Officers can add comments and confirmation media to calls assigned to them (status must be `accepted`).

```json
{
    "token": "<officer_token>",
    "call_id": 42,
    "officer_comments": "Arrived on scene. Situation under control.",
    "confirmation_media_file_ids": ["file_001", "file_002"]
}
```

### 7.6 Resolve a Call — `Call/resolve_call`

Officers can resolve calls assigned to them, **except panic calls**.

```json
{
    "token": "<officer_token>",
    "call_id": 42,
    "officer_comments": "Medical team arrived. Patient stabilized.",
    "confirmation_media_file_ids": ["file_001"],
    "confirmation_video_file_id": "file_002"
}
```

**Expected errors:**
| RC | When |
|---|---|
| 103 | **Attempting to resolve a panic call.** Officers cannot close panic calls. |
| 573 | Call is not assigned to this officer |
| 569 | Call is not in `accepted` status |

### 7.7 Panic Call — Officer UI Restriction

When an officer is viewing an active panic call they have accepted:

- **Do NOT show a "Resolve" button.** Panic calls can only be closed by an admin (operator).
- **Display an informational banner:** *"Awaiting Operator Closure — Maintain communication."*
- The officer can still update comments and media via `Call/update_call`.

**How to detect:** Check `call.category === "panic"` in the call object. If true and the current user is an officer, suppress the resolve action.

---

## 8. File Upload Integration

Media files (images, audio, video) must be uploaded **before** creating or updating a call.

### 8.1 Upload Flow

1. Upload the file using `File/upload_file_base64`:
   ```json
   {
       "token": "<token>",
       "file_name": "photo.jpg",
       "data": "<base64_encoded_data>"
   }
   ```
2. The response includes a `file_id`.
3. Pass the `file_id` in the call API (`media_file_ids`, `audio_file_id`, `video_file_id`, etc.).

### 8.2 Media Limits

- **Images:** Maximum **5** per call (resident media) and **5** per resolution (officer confirmation media).
- **Audio:** 1 file per call.
- **Video:** 1 file per call, 1 per resolution.

Exceeding the image limit returns RC `566`.

### 8.3 Updating Media (Keep + Add Pattern)

When updating media on an existing call:
- `keep_media` — Array of existing media URLs you want to retain.
- `media_file_ids` — Array of new file IDs to add.
- Omitting a URL from `keep_media` effectively removes that image.
- Total (kept + new) must not exceed 5.

---

## 9. Error Reference

| RC | Constant | Description |
|---|---|---|
| 0 | Success | Operation completed successfully |
| 103 | No Privileges | Officer tried to resolve panic call or create non-panic call |
| 104 | Officer Not Found | Target officer does not exist or is inactive |
| 560 | Call Not Found | Call doesn't exist or user doesn't have access |
| 561 | Invalid Category | Category value is not recognized |
| 562 | Invalid Status | Status filter value is not recognized |
| 563 | Invalid Priority | Priority value is not recognized |
| 564 | Invalid Service Type | Missing or invalid `service_type` for concierge call |
| 565 | Active Emergency Exists | Resident already has an open emergency call |
| 566 | Media Limit Reached | Exceeded maximum of 5 images |
| 567 | Cannot Accept | Call not in correct status/category for this action |
| 568 | Already Accepted | Call is already accepted by an officer |
| 569 | Cannot Resolve | Call not in `accepted` status |
| 570 | Already Resolved | Call is already resolved |
| 571 | Already Canceled | Call is already canceled |
| 572 | Cannot Cancel | Call category does not support cancellation (emergency/panic) |
| 573 | Not Assigned to Officer | Officer is not the assigned officer for this call |
| 574 | Not a Test Call | Cannot delete: call category is not `test` |

---

## 10. Notification Types Received

### 10.1 Officer Receives

| Notification Type | When | Action |
|---|---|---|
| `new_emergency` | New emergency call in their community | Show in dispatch queue |
| `panic_button` | Panic call triggered in their community | Show urgent alert |
| `call_accepted` | Admin assigned a call to this officer | Show in task list |
| `call_updated` | Resident updated call details | Refresh call details |
| `call_canceled` | Call was canceled | Remove from task list |
| `resident_like` | Resident liked the resolved call | Informational |

### 10.2 Resident Receives

| Notification Type | When | Action |
|---|---|---|
| `call_accepted` | Officer accepted or was assigned | Show officer info on active call screen |
| `call_updated` | Officer updated call (comments/media) | Refresh call details |
| `call_resolved` | Call was resolved | Show resolution summary + reaction prompt |
| `call_canceled` | Admin canceled the call | Show cancellation notice |

### 10.3 Admin Receives

| Notification Type | When | Action |
|---|---|---|
| `new_service_call` | Resident created a concierge service call | Show in dispatch dashboard for assignment |
