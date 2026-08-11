# Call Module — Internal Specification

**Module:** `platform/api/call.js`, `platform/funcs/call.js`  
**Phase:** 2.3  
**Database Table:** `service_call` (prefix `SVC_`)  
**Error Code Range:** 560–589

---

## 1. Module Overview

The Call module implements the full lifecycle of service calls in the Code4 Axis Security Operations Platform. A "call" represents any request — from a resident emergency to a scheduled concierge service — that flows through the dispatch pipeline from creation to resolution.

### 1.1 Call Categories

| Category Key | Description | Creator ACL | Notification Target | Acceptance Model |
|---|---|---|---|---|
| `medical_emergency` | Resident medical emergency | Resident only | All officers in community | Officer broadcast (accept/pass) |
| `security_emergency` | Resident security emergency | Resident only | All officers in community | Officer broadcast (accept/pass) |
| `panic` | Panic button (duress signal) | Resident **or** Officer | All officers in community | Officer broadcast (accept/pass) |
| `concierge_service` | Scheduled concierge request | Resident only | All active admins | Admin-gated assignment |
| `test` | Communication test | Resident only | None | N/A (admin can soft-delete) |

### 1.2 Call Lifecycle (Status Flow)

```
                ┌──────────────────────────────────────────┐
                │                                          │
  ┌─────┐    accept_call    ┌──────────┐    resolve_call    ┌──────────┐
  │ new │ ─────────────────>│ accepted │ ──────────────────>│ resolved │
  └─────┘                   └──────────┘                    └──────────┘
    │                            │
    │   cancel_call              │   cancel_call
    │   (concierge only)         │   (concierge only)
    v                            v
  ┌──────────┐             ┌──────────┐
  │ canceled │             │ canceled │
  └──────────┘             └──────────┘
```

- **new** — Call created; awaiting officer acceptance or admin assignment.
- **accepted** — An officer has accepted (or been assigned to) the call and is responding.
- **resolved** — The call has been completed and closed.
- **canceled** — The call was canceled (concierge service calls only; emergency/panic calls cannot be canceled).

### 1.3 Priority Levels

| Priority | Usage |
|---|---|
| `urgent` | Auto-set for emergency and panic categories |
| `important` | User-selected |
| `normal` | Default |
| `low` | User-selected |

Emergency/panic calls have their priority forced to `urgent` regardless of the value provided by the caller.

---

## 2. Resolved Design Decisions (SDS Compliance)

All decisions are documented with full rationale in `docs/issues-questions/call.md`.

### 2.1 Panic Call Creator ACL (SDS 2.4.3, 3.5)

**Decision #1:** The `create_call` endpoint ACL includes both `USER_TYPE_RESIDENT` and `USER_TYPE_OFFICER`. The backend business logic explicitly restricts officers so they can **only** create calls of the `panic` category. Any other category submitted by an officer returns `ERR_NO_PRIVILEGES` (rc 103).

**Implementation:** `funcs/call.js` → `create_call()` lines 211–214:
```js
if (userType === $Const.USER_TYPE_OFFICER && this.$category !== "panic")
{
    return $ERRS.ERR_NO_PRIVILEGES;
}
```

### 2.2 Panic Call Closure Restriction (SDS 2.4.3)

**Decision #2:** Only an Admin (Operator) can resolve panic calls. Officers are explicitly blocked from resolving panic category calls and receive `ERR_NO_PRIVILEGES` (rc 103). This enforces the SDS duress safeguard: an officer under threat cannot be forced to falsely signal "all clear." The operator must verify safety via radio/phone before officially closing the alert.

Officers can still:
- Accept panic calls (`accept_call`)
- Add comments and confirmation media (`update_call`)
- Pass panic calls they cannot respond to (`pass_call`)

But final closure is **operator-only**.

**Implementation:** `funcs/call.js` → `resolve_call()` lines 1057–1067:
```js
if (userType === $Const.USER_TYPE_OFFICER)
{
    if (call.SVC_CATEGORY === "panic")
    {
        return $ERRS.ERR_NO_PRIVILEGES;
    }
    if (call.SVC_OFC_USR_ID !== userId)
    {
        return $ERRS.ERR_CALL_NOT_ASSIGNED_TO_OFFICER;
    }
}
```

### 2.3 Emergency Call "Pass" Logic & Ignore List (SDS 2.4.1.3.1, 3.4.2.2.1)

**Decision #3:** Full location-based queue routing is deferred to the GPS module phase. The interim **"Ignore List" pattern** is implemented:

1. Officer calls `Call/pass_call`.
2. The officer's user ID is appended to `SVC_PASSED_BY` (JSON array column).
3. `get_calls` uses `JSON_CONTAINS()` in the WHERE clause to exclude passed calls from that officer's view.
4. The call remains in `new` status and visible to all other community officers.

This aligns with SDS 3.4.2.2.1 fallback behavior: "call is sent to all other currently working officers."

**Database column:** `SVC_PASSED_BY json DEFAULT NULL` — array of officer user IDs who have passed on the call.

**Query filter (officer view):**
```sql
SVC_PASSED_BY IS NULL OR NOT JSON_CONTAINS(SVC_PASSED_BY, ?)
```

### 2.4 24-Hour Auto-Move to History (SDS 2.5.1.5)

**Decision #5:** No dedicated `SVC_HISTORY_ON` column is used. The distinction between active and history calls is handled via the `is_open` filter parameter:

- `is_open=true` → `SVC_STATUS IN ('new','accepted')` — active calls.
- `is_open=false` → `SVC_STATUS IN ('resolved','canceled')` — history calls.

The 24-hour auto-move from the active feed to history for resolved service calls is a **client-side display concern**. The client compares `resolved_on + 24h` against the current time to determine placement.

### 2.5 Service Call Notification Target (SDS Admin Assignment Workflow)

**Decision #6:** When a new concierge service call is created:

1. **Notifications target all active admins** (not officers). Admins are platform-wide, so all active admin users receive the `new_service_call` notification.
2. Officers are **not** notified on creation.
3. Only when an admin assigns the call via `Call/assign_call` does the assigned officer receive a `call_accepted` notification.

Emergency and panic calls continue to broadcast to all officers in the creator's community.

**Implementation:** `funcs/call.js` → `create_call()`:
- Emergency/panic → `getOfficerIdsInCommunity(communityId)` → `Notification/create_bulk_notifications` with type `new_emergency` or `panic_button`.
- Concierge → `getActiveAdminIds()` → `Notification/create_bulk_notifications` with type `new_service_call`.

### 2.6 Officer Community-Based Access Control

**Decision #8:** Officer access is split by call category:

| Category | Officer Visibility Rule |
|---|---|
| `medical_emergency`, `security_emergency`, `panic` | All calls in the officer's community (needed for broadcast accept/pass workflow). Passed calls are excluded. |
| `concierge_service`, `test` | Only calls explicitly assigned to the officer (respects admin-gated dispatch). |

Applied consistently in:
- `get_calls` — SQL WHERE clause with category-aware conditions.
- `get_call` — Single-record access control check after fetching.

---

## 3. API Endpoints

### 3.1 Endpoint Summary

| Endpoint | ACL | Method Purpose |
|---|---|---|
| `Call/create_call` | RESIDENT, OFFICER | Create a new call (officers restricted to panic) |
| `Call/get_calls` | ALL AUTHED | Paginated list with role-based filtering |
| `Call/get_call` | ALL AUTHED | Single call details with access control |
| `Call/update_call` | RESIDENT, OFFICER | Update call fields (role-dependent) |
| `Call/cancel_call` | RESIDENT, ADMIN | Cancel a concierge service call |
| `Call/accept_call` | OFFICER | Accept an emergency/panic call |
| `Call/pass_call` | OFFICER | Pass on an emergency/panic call |
| `Call/resolve_call` | OFFICER, ADMIN | Resolve/close a call |
| `Call/assign_call` | ADMIN | Assign an officer to a service call |
| `Call/add_reaction` | RESIDENT | Like/dislike a resolved call |
| `Call/add_comment` | RESIDENT | Comment on a resolved call |
| `Call/delete_test_call` | ADMIN | Soft-delete a test call |

### 3.2 create_call

**ACL:** `USER_TYPE_RESIDENT`, `USER_TYPE_OFFICER`

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | `medical_emergency`, `security_emergency`, `concierge_service`, `test`, `panic` |
| `service_type` | string | Concierge only | Valid `service_type` data item key |
| `description` | string | No | Call description text |
| `address` | string | No | Resident home address |
| `current_address` | string | No | Current location description (emergencies) |
| `latitude` | string | No | Current GPS latitude |
| `longitude` | string | No | Current GPS longitude |
| `priority` | string | No | `urgent`, `important`, `normal` (default), `low` |
| `scheduled_date` | string | No | `YYYY-MM-DD` (concierge service) |
| `scheduled_time_from` | string | No | `HH:MM` start (concierge service) |
| `scheduled_time_to` | string | No | `HH:MM` end (concierge service) |
| `media_file_ids` | array | No | File IDs from `File/upload_file_base64` (max 5) |
| `audio_file_id` | string | No | Audio recording file ID |
| `video_file_id` | string | No | Video recording file ID |

**Business Logic:**
1. Validate category against `VALID_CATEGORIES`.
2. If caller is officer → enforce `category === "panic"` only.
3. Validate priority; force `urgent` for emergency/panic.
4. For concierge → validate `service_type` via `$DataItems.isValidItemId()`.
5. Resolve creator's community from `user_details`.
6. For emergency categories → check no active emergency already exists for this resident.
7. Resolve media, audio, video files.
8. INSERT into `service_call`.
9. Dispatch notifications by category (see §2.5).

**Response:** `{ rc: 0, call_id: <new_id> }`

### 3.3 get_calls

**ACL:** All authenticated user types.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | — | Filter: `new`, `accepted`, `resolved`, `canceled` |
| `category` | string | — | Filter by category |
| `community_id` | int | 0 | Admin filter: community (0 = all) |
| `is_open` | boolean | null | `true` = new+accepted, `false` = resolved+canceled |
| `search_text` | string | — | Free-text search across description, address, resident name |
| `sort_by` | string | — | `created_on`, `status`, `category`, `priority` |
| `sort_dir` | string | `desc` | `asc` or `desc` |
| `offset` | int | 0 | Pagination offset (0-based) |
| `limit` | int | 20 | Page size (max 100) |

**Role-Based Filtering:**
- **Resident:** Sees own calls only (`SVC_RES_USR_ID = userId`).
- **Officer:** Sees assigned calls + unassigned emergency/panic in their community (minus passed calls).
- **Admin:** Sees all calls; can filter by `community_id`.

**Response:** `{ rc: 0, calls: [...], total_count: N, offset: N, limit: N }`

### 3.4 get_call

**ACL:** All authenticated user types.  
**Parameters:** `call_id` (int, required).

**Access Control:**
- Resident → own calls only.
- Officer → category-based (see §2.6).
- Admin → all calls.

**Response:** `{ rc: 0, call: {...} }`

### 3.5 update_call

**ACL:** `USER_TYPE_RESIDENT`, `USER_TYPE_OFFICER`

**Resident (status=new only):** Can update `description`, `priority`, `scheduled_date`, `scheduled_time_from`, `scheduled_time_to`, `media_file_ids`/`keep_media`, `audio_file_id`, `video_file_id`.

**Officer (status=accepted, assigned to them):** Can update `officer_comments`, `confirmation_media_file_ids`/`keep_confirmation_media`, `confirmation_video_file_id`.

Sends `call_updated` notification to the other party (resident → officer, officer → resident).

### 3.6 cancel_call

**ACL:** `USER_TYPE_RESIDENT`, `USER_TYPE_ADMIN`  
**Restriction:** Only `concierge_service` calls can be canceled. Emergency/panic calls cannot be canceled.  
**Status:** Must be `new` or `accepted`.  
**Notifications:** Notifies assigned officer (if any) and resident (if admin canceled).

### 3.7 accept_call

**ACL:** `USER_TYPE_OFFICER`  
**Restriction:** Call must be `new` and category must be `medical_emergency`, `security_emergency`, or `panic`. Officer must be in the same community.  
**Effect:** Sets `SVC_STATUS='accepted'`, assigns `SVC_OFC_USR_ID`, records `SVC_ACCEPTED_ON`.  
**Notification:** Notifies resident that an officer accepted.

### 3.8 pass_call

**ACL:** `USER_TYPE_OFFICER`  
**Restriction:** Call must be `new` and category must be `medical_emergency`, `security_emergency`, or `panic`. Officer must be in the same community.  
**Effect:** Appends officer user ID to `SVC_PASSED_BY` JSON array. Call remains in `new` status.  
**No notification dispatched.** The call silently disappears from the passing officer's feed.

### 3.9 resolve_call

**ACL:** `USER_TYPE_OFFICER`, `USER_TYPE_ADMIN`  
**Restriction:** Call must be `accepted`. Officers cannot resolve `panic` calls (admin only). Officers can only resolve calls assigned to them.  
**Optional attachments:** `officer_comments`, `confirmation_media_file_ids` (max 5), `confirmation_video_file_id`.  
**Effect:** Sets `SVC_STATUS='resolved'`, records `SVC_RESOLVED_ON`.  
**Notification:** Notifies resident.

### 3.10 assign_call

**ACL:** `USER_TYPE_ADMIN`  
**Restriction:** Call must be `new`. Target officer must exist, be active, and have a valid community.  
**Effect:** Sets `SVC_STATUS='accepted'`, assigns `SVC_OFC_USR_ID`, records `SVC_ASSIGNED_BY` and `SVC_ACCEPTED_ON`.  
**Notifications:** Notifies the assigned officer and the resident.

### 3.11 add_reaction

**ACL:** `USER_TYPE_RESIDENT`  
**Restriction:** Resident must be the call creator. Call must be `resolved`.  
**Values:** `1` (like) or `-1` (dislike).  
**Notification:** If `reaction=1`, notifies the assigned officer (`resident_like`).

### 3.12 add_comment

**ACL:** `USER_TYPE_RESIDENT`  
**Restriction:** Resident must be the call creator. Call must be `resolved`.  
**Parameters:** `comment` (string, required).

### 3.13 delete_test_call

**ACL:** `USER_TYPE_ADMIN`  
**Restriction:** Call category must be `test`.  
**Effect:** Soft-delete via `SVC_DELETED_ON` (compliant with brain.md soft-deletion rule).

---

## 4. Database Schema

### 4.1 Table: `service_call`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `SVC_ID` | bigint unsigned | No (PK) | Auto-increment primary key |
| `SVC_CATEGORY` | varchar(30) | No | Call category key |
| `SVC_SERVICE_TYPE` | varchar(100) | Yes | Data item key (concierge only) |
| `SVC_RES_USR_ID` | varchar(128) | No | Creator user ID |
| `SVC_OFC_USR_ID` | varchar(128) | Yes | Assigned/accepted officer user ID |
| `SVC_COM_ID` | bigint unsigned | No | Community ID |
| `SVC_STATUS` | varchar(20) | No | Lifecycle status (default: `new`) |
| `SVC_PRIORITY` | varchar(20) | No | Priority level (default: `normal`) |
| `SVC_DESCRIPTION` | text | Yes | Call description |
| `SVC_ADDRESS` | varchar(500) | Yes | Resident home address |
| `SVC_CURRENT_ADDRESS` | varchar(500) | Yes | Current location (emergencies) |
| `SVC_LATITUDE` | decimal(10,7) | Yes | GPS latitude |
| `SVC_LONGITUDE` | decimal(10,7) | Yes | GPS longitude |
| `SVC_SCHEDULED_DATE` | date | Yes | Scheduled date (concierge) |
| `SVC_SCHEDULED_TIME_FROM` | time | Yes | Schedule start time |
| `SVC_SCHEDULED_TIME_TO` | time | Yes | Schedule end time |
| `SVC_MEDIA` | json | Yes | Resident images (array, max 5) |
| `SVC_AUDIO` | varchar(200) | Yes | Audio file name |
| `SVC_VIDEO` | varchar(200) | Yes | Video file name |
| `SVC_CONFIRMATION_MEDIA` | json | Yes | Officer confirmation images |
| `SVC_CONFIRMATION_VIDEO` | varchar(200) | Yes | Officer confirmation video |
| `SVC_OFFICER_COMMENTS` | text | Yes | Officer notes |
| `SVC_REACTION` | tinyint | Yes | 1=like, -1=dislike, null=none |
| `SVC_RESIDENT_COMMENT` | text | Yes | Resident feedback |
| `SVC_PASSED_BY` | json | Yes | Officer IDs who passed |
| `SVC_ASSIGNED_BY` | varchar(128) | Yes | Admin who assigned |
| `SVC_ACCEPTED_ON` | datetime | Yes | Acceptance timestamp |
| `SVC_RESOLVED_ON` | datetime | Yes | Resolution timestamp |
| `SVC_CANCELED_ON` | datetime | Yes | Cancellation timestamp |
| `SVC_CREATED_ON` | datetime | No | Creation timestamp |
| `SVC_LAST_UPDATE` | datetime | Yes | Last modification |
| `SVC_DELETED_ON` | datetime | Yes | Soft-delete timestamp |

### 4.2 Indexes

| Index | Column(s) | Purpose |
|---|---|---|
| `PRIMARY` | `SVC_ID` | Primary key |
| `IX_SVC_RES_USR_ID` | `SVC_RES_USR_ID` | Resident's calls lookup |
| `IX_SVC_OFC_USR_ID` | `SVC_OFC_USR_ID` | Officer's assigned calls |
| `IX_SVC_COM_ID` | `SVC_COM_ID` | Community-based filtering |
| `IX_SVC_STATUS` | `SVC_STATUS` | Status-based filtering |
| `IX_SVC_CATEGORY` | `SVC_CATEGORY` | Category-based filtering |
| `IX_SVC_CREATED_ON` | `SVC_CREATED_ON` | Chronological ordering |

### 4.3 Foreign Keys

| Constraint | Column | References |
|---|---|---|
| `FK_SVC_RES_USR_ID` | `SVC_RES_USR_ID` | `user(USR_ID)` |
| `FK_SVC_OFC_USR_ID` | `SVC_OFC_USR_ID` | `user(USR_ID)` |
| `FK_SVC_COM_ID` | `SVC_COM_ID` | `community(COM_ID)` |

---

## 5. Notification Dispatch Summary

| Trigger | Type Key | Target | Push |
|---|---|---|---|
| Emergency call created | `new_emergency` | All officers in community | Yes |
| Panic call created | `panic_button` | All officers in community | Yes |
| Concierge call created | `new_service_call` | All active admins | Yes |
| Call accepted by officer | `call_accepted` | Resident (creator) | Yes |
| Call assigned by admin | `call_accepted` | Officer + Resident | Yes |
| Call updated | `call_updated` | Other party (resident↔officer) | Yes |
| Call resolved | `call_resolved` | Resident (creator) | Yes |
| Call canceled | `call_canceled` | Officer (if assigned) + Resident (if admin) | Yes |
| Resident likes call | `resident_like` | Officer (assigned) | Yes |

---

## 6. Error Codes (Range 560–589)

| Error Constant | RC | Description |
|---|---|---|
| `ERR_CALL_NOT_FOUND` | 560 | Call does not exist or access denied |
| `ERR_CALL_INVALID_CATEGORY` | 561 | Invalid category value |
| `ERR_CALL_INVALID_STATUS` | 562 | Invalid status filter value |
| `ERR_CALL_INVALID_PRIORITY` | 563 | Invalid priority value |
| `ERR_CALL_INVALID_SERVICE_TYPE` | 564 | Invalid or missing service_type |
| `ERR_CALL_ACTIVE_EMERGENCY_EXISTS` | 565 | Resident already has an active emergency |
| `ERR_CALL_MEDIA_LIMIT_REACHED` | 566 | Exceeded 5-image limit |
| `ERR_CALL_CANNOT_ACCEPT` | 567 | Call cannot be accepted (wrong status/category) |
| `ERR_CALL_ALREADY_ACCEPTED` | 568 | Call already accepted |
| `ERR_CALL_CANNOT_RESOLVE` | 569 | Call cannot be resolved (wrong status) |
| `ERR_CALL_ALREADY_RESOLVED` | 570 | Call already resolved |
| `ERR_CALL_ALREADY_CANCELED` | 571 | Call already canceled |
| `ERR_CALL_CANNOT_CANCEL` | 572 | Call cannot be canceled (wrong category/status) |
| `ERR_CALL_NOT_ASSIGNED_TO_OFFICER` | 573 | Officer is not assigned to this call |
| `ERR_CALL_IS_NOT_TEST` | 574 | Cannot delete: call is not a test call |
| `ERR_NO_PRIVILEGES` | 103 | Generic: officer trying to resolve panic / create non-panic |

---

## 7. Deferred Requirements & Future Integration Points

### 7.1 GPS Module Integration (Phase 3)

When the GPS module is active:
- **`create_call`:** Instead of broadcasting to all community officers, integrate with the real-time distance matrix API to identify and queue the notification to the closest active officers first.
- **`pass_call`:** After an officer passes, the system will automatically route to the next-closest active officer rather than relying on the broadcast ignore-list pattern.
- **Estimated integration points:** `create_call()` notification dispatch block (lines 336–383) and `pass_call()` method.

### 7.2 Shift Module Integration

Once the Shift module is live:
- Queries fetching officers in a community for notification routing (`getOfficerIdsInCommunity()`) must filter for officers who are **currently checked-in and active on shift**.
- The `assign_call` officer validation query should verify the target officer has an active shift.
- **Estimated integration points:** `getOfficerIdsInCommunity()` helper function, `assign_call()` officer validation query.

---

## 8. Related Files

| File | Purpose |
|---|---|
| `backend/platform/api/call.js` | API endpoint definitions |
| `backend/platform/funcs/call.js` | Business logic implementation |
| `db/db.sql` | Schema definition (service_call table) |
| `db/UpgradeDB.sql` | Migration script |
| `db/triggers_def.js` | Audit trail trigger definition |
| `docs/issues-questions/call.md` | Resolved design decisions |
| `docs/issues-questions/call-audit.md` | Code audit blockers & resolutions |
| `docs/code-reviews/call-review.md` | Code review report |
| `docs/project_dev.md` | Project development documentation |
