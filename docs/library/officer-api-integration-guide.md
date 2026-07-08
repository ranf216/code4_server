# Officer API — Integration Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-08  
**Audience:** Web Application Developers (Admin Portal), Mobile App Developers (Officer App)  
**Phase:** 2.1  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 4.3

> **Important:** This document treats the server as a **strict black box**. It describes only what the client application sends and receives. No internal server logic, database schemas, or backend implementation details are included.

---

## 1. General API Conventions

### 1.1 Request Format

All API calls are made via **HTTP POST** to the server's API endpoint. Every request body is a JSON object containing at minimum:

```json
{
    "#request": "Officer/endpoint_name",
    "#token": "<user_authentication_token>",
    ...additional parameters...
}
```

- **`#request`** — The API endpoint identifier in `ModuleName/method_name` format.
- **`#token`** — The authenticated user's session token obtained from the login flow.

### 1.2 Standard Response Format

Every API response returns a JSON object with at least two fields:

```json
{
    "rc": 0,
    "message": "success"
}
```

- **`rc`** (integer) — The return code. `0` means success. Any non-zero value indicates an error.
- **`message`** (string) — A human-readable message describing the result.

**Additional data fields** are included alongside `rc` and `message` when the endpoint returns data.

### 1.3 Access Control

The Officer module has two access levels:

| Access Level | Who | Endpoints |
|---|---|---|
| **Admin** | Management portal users (any admin role) | All management endpoints (`get_officers`, `get_officer`, `add_officer`, `update_officer`, `delete_officer`, `get_officer_evaluations`, `add_officer_evaluation`, `delete_officer_evaluation`) |
| **Officer** | Mobile app officer users | Self-service endpoints (`get_my_details`, `update_my_details`) |

If a user without the required access attempts to call a restricted endpoint, the server returns `rc: 103` (No privileges).

### 1.4 Common Error Codes

These error codes may be returned by **any** endpoint:

| RC | Meaning | Recommended Action |
|---|---|---|
| 0 | Success | Process the response data |
| 102 | Missing required parameter | Check that all mandatory fields are included in the request |
| 103 | No privileges | The current user does not have permission for this action. Show "Access denied" message. |
| 201 | Invalid token | Redirect to login — the session has expired or was terminated |

### 1.5 Officer Module Error Codes

These error codes are specific to the Officer module:

| RC | Constant | Message | When Returned | Recommended UI Action |
|---|---|---|---|---|
| 520 | `ERR_OFFICER_NOT_FOUND` | "officer not found" | The specified `user_id` does not match an active officer | Show "Officer not found" error. Refresh the officers list. |
| 521 | `ERR_OFFICER_ALREADY_IN_COMMUNITY` | "officer is already assigned to this community" | Attempting to assign an officer to a community they're already in | Show informational message — no action needed |
| 526 | `ERR_OFFICER_CANNOT_DELETE` | "officer has logged in and cannot be deleted, only deactivated" | `delete_officer` when the officer has previously logged in | **Critical:** Display a dialog explaining that deletion is not possible because the officer has already used the app. Advise the user to deactivate instead (set Active = No via `update_officer`). |
| 527 | `ERR_OFFICER_EVALUATION_NOT_FOUND` | "officer evaluation not found" | `delete_officer_evaluation` when the evaluation does not exist or was already deleted | Show "Evaluation not found" and refresh the evaluations list |

Additional error codes that may be returned by specific endpoints:

| RC | Meaning | When Returned |
|---|---|---|
| 224 | Invalid phone number | The `phone_num` field is empty or invalid |
| 235 | Invalid email address | The `email` field is not a valid email format |
| 240 | Email already exists | Another active user already has this email address |
| 241 | Phone already exists | Another active user already has this phone number |
| 504 | Community not found | The specified `community_id` does not exist |
| 505 | Community is not active | The specified community exists but is inactive |

---

## 2. Admin Endpoints

### 2.1 Get Officers List

Retrieves a list of all officers. Use this to populate the Officers Management table.

**When to use:** On page load of the Officers Management screen. Also call this endpoint when the admin changes filters, performs a search, changes sort order, or after any create/update/delete operation to refresh the list.

#### Request

```json
{
    "#request": "Officer/get_officers",
    "#token": "<token>",
    "community_id": 0,
    "include_inactive": false,
    "search_text": "",
    "sort_by": "",
    "sort_dir": "asc"
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `community_id` | integer | No | `0` | Filter by community. `0` = show all communities. Pass a specific community ID to filter. |
| `include_inactive` | boolean | No | `false` | Set to `true` to include deactivated officers. By default, only active officers are shown. |
| `search_text` | string | No | `""` | Free-text search. Filters across first name, last name, email, phone number, and community name. Case-insensitive, supports partial matching. |
| `sort_by` | string | No | `""` | Column to sort by. Valid values: `"first_name"`, `"last_name"`, `"community"`, `"created_on"`. If empty, defaults to first name ascending. |
| `sort_dir` | string | No | `"asc"` | Sort direction: `"asc"` or `"desc"`. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officers": [
        {
            "user_id": "a1b2c3d4e5f6...",
            "first_name": "David",
            "last_name": "Cohen",
            "email": "david.cohen@example.com",
            "phone_num": "+972-50-1234567",
            "image_url": "https://files.example.com/officer/img_abc123.jpg",
            "community_id": 5,
            "community_name": "Green Valley Estate",
            "title": "Senior Patrol Officer",
            "description": "Experienced security professional with 10 years of service.",
            "address": "123 Main St, Tel Aviv",
            "roles": ["Patrol", "Investigation"],
            "certification_badges": ["First Aid", "Armed Guard"],
            "is_active": true,
            "created_on": "2026-03-15 09:30:00",
            "last_login": "2026-07-07 22:15:00"
        }
    ],
    "total_count": 1
}
```

| Response Field | Type | Description |
|---|---|---|
| `officers` | array | Array of officer objects |
| `total_count` | integer | Total number of officers in the returned list |
| `user_id` | string | Unique officer identifier |
| `first_name` | string | Officer's first name |
| `last_name` | string | Officer's last name (may be empty) |
| `email` | string | Email address (may be a placeholder if not provided during creation) |
| `phone_num` | string | Mobile phone number (used for login) |
| `image_url` | string | Full URL to officer's photo (empty string if no photo) |
| `community_id` | integer | ID of the assigned community |
| `community_name` | string | Name of the assigned community (may be `null` if community was deleted) |
| `title` | string | Officer's job title |
| `description` | string | Officer description (may be `null`) |
| `address` | string | Officer's address |
| `roles` | array | Array of role strings (e.g., `["Patrol", "Investigation"]`). Empty array if no roles. |
| `certification_badges` | array | Array of badge strings. Empty array if none. |
| `is_active` | boolean | Whether the officer is currently active |
| `created_on` | string | Registration date (YYYY-MM-DD HH:mm:ss, UTC) |
| `last_login` | string | Last login timestamp. `null` if the officer has never logged in. |

#### Search Behaviour

The `search_text` parameter triggers a **server-side search**. The server matches the query against:
1. First name
2. Last name
3. Email address
4. Phone number
5. Community name

An officer is included in results if **any** of the above match. The search is case-insensitive and supports partial matching (e.g., searching "dav" will match "David").

> **Important:** Do NOT implement client-side filtering when `search_text` is used. Always send the search query to the server and use the returned list as-is.

---

### 2.2 Get Single Officer

Retrieves full details for a specific officer, including their evaluations. Use this when opening the officer detail/edit view.

**When to use:** When the admin clicks on an officer row to view details or opens the Edit Officer modal.

#### Request

```json
{
    "#request": "Officer/get_officer",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6..."
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The officer's unique user ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officer": {
        "user_id": "a1b2c3d4e5f6...",
        "first_name": "David",
        "last_name": "Cohen",
        "email": "david.cohen@example.com",
        "phone_num": "+972-50-1234567",
        "image_url": "https://files.example.com/officer/img_abc123.jpg",
        "community_id": 5,
        "community_name": "Green Valley Estate",
        "title": "Senior Patrol Officer",
        "description": "Experienced security professional.",
        "address": "123 Main St, Tel Aviv",
        "roles": ["Patrol", "Investigation"],
        "certification_badges": ["First Aid", "Armed Guard"],
        "is_active": true,
        "created_on": "2026-03-15 09:30:00",
        "last_login": "2026-07-07 22:15:00",
        "evaluations": [
            {
                "evaluation_id": 12,
                "text": "Excellent performance during emergency drill.",
                "date": "2026-06-15",
                "evaluator_name": "Sarah Manager",
                "created_on": "2026-06-16 10:30:00"
            },
            {
                "evaluation_id": 8,
                "text": "Good communication with residents. Needs improvement in report writing.",
                "date": "2026-04-01",
                "evaluator_name": "John Admin",
                "created_on": "2026-04-02 09:00:00"
            }
        ]
    }
}
```

| Response Field | Type | Description |
|---|---|---|
| `officer` | object | Complete officer profile object |
| `evaluations` | array | Array of evaluation objects (sorted by date, newest first). Empty array if no evaluations. |
| `evaluation_id` | integer | Unique evaluation identifier (used for deletion) |
| `text` | string | Evaluation content |
| `date` | string | Evaluation date (YYYY-MM-DD) |
| `evaluator_name` | string | Name of the admin who wrote the evaluation |
| `created_on` | string | When the evaluation was created |

#### Error Responses

| RC | When |
|---|---|
| 520 | Officer not found or deleted |

---

### 2.3 Add Officer

Creates a new officer in the system. The officer is created in **active** state with today as the registration date.

**When to use:** When the admin submits the "Add New Officer" form.

#### Request

```json
{
    "#request": "Officer/add_officer",
    "#token": "<token>",
    "first_name": "David",
    "last_name": "Cohen",
    "phone_num": "+972-50-1234567",
    "email": "david.cohen@example.com",
    "community_id": 5,
    "title": "Patrol Officer",
    "address": "123 Main St, Tel Aviv",
    "description": "New hire with military background.",
    "image": "<base64_encoded_image_data>",
    "roles": ["Patrol"],
    "certification_badges": ["First Aid"]
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `first_name` | string | **Yes** | — | Officer's first name |
| `last_name` | string | No | `""` | Officer's last name |
| `phone_num` | string | **Yes** | — | Mobile phone number. **This is the officer's login credential** — they will authenticate using this number via OTP. Must be unique across all active users. |
| `email` | string | No | `""` | Email address. Must be unique if provided. |
| `community_id` | integer | **Yes** | — | ID of the community to assign the officer to. **Must be an active community.** |
| `title` | string | **Yes** | — | Officer's job title |
| `address` | string | No | `""` | Officer's physical address |
| `description` | string | No | `""` | Free-text description |
| `image` | string | No | `""` | Officer photo as base64-encoded image data |
| `roles` | array | No | `[]` | Array of role name strings (e.g., `["Patrol", "Investigation"]`) |
| `certification_badges` | array | No | `[]` | Array of certification badge strings |

> **Critical — Mandatory Fields:** `first_name`, `phone_num`, `community_id`, and `title` are strictly mandatory. The server will return `rc: 102` (missing parameter) if any are absent.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "user_id": "a1b2c3d4e5f6..."
}
```

| Response Field | Type | Description |
|---|---|---|
| `user_id` | string | The newly created officer's unique identifier. Store this for subsequent operations. |

#### Error Responses

| RC | When | Action |
|---|---|---|
| 224 | Phone number is empty or invalid | Highlight the phone field with validation error |
| 235 | Email format is invalid | Highlight the email field |
| 240 | Email already in use by another user | Show "Email already exists" and suggest a different email |
| 241 | Phone number already in use | Show "Phone number already registered" — each officer must have a unique phone |
| 504 | Community ID doesn't exist | Refresh the communities dropdown |
| 505 | Community is inactive | Show "Selected community is not active" |

---

### 2.4 Update Officer

Updates an officer's details. This is a **partial update** — only include fields you want to change. Omitted fields remain unchanged.

**When to use:** When the admin submits the Edit Officer form.

#### Request

```json
{
    "#request": "Officer/update_officer",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "first_name": "David",
    "last_name": "Cohen",
    "phone_num": "+972-50-9876543",
    "email": "david.new@example.com",
    "community_id": 7,
    "title": "Senior Patrol Officer",
    "address": "456 Oak Ave, Tel Aviv",
    "description": "Promoted to senior role.",
    "image": "<base64_encoded_image_data>",
    "roles": ["Patrol", "Investigation", "Training"],
    "certification_badges": ["First Aid", "Armed Guard", "K9 Handler"],
    "is_active": true
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `user_id` | string | **Yes** | — | The officer's unique user ID |
| `first_name` | string | No | *(unchanged)* | Updated first name |
| `last_name` | string | No | *(unchanged)* | Updated last name |
| `phone_num` | string | No | *(unchanged)* | Updated phone number. **⚠️ WARNING: Changing the phone number immediately terminates the officer's active session and forces re-authentication.** |
| `email` | string | No | *(unchanged)* | Updated email. Must be unique if provided. |
| `community_id` | integer | No | *(unchanged)* | New community ID to reassign (must be active). `0` = don't change. |
| `title` | string | No | *(unchanged)* | Updated title |
| `address` | string | No | *(unchanged)* | Updated address |
| `description` | string | No | *(unchanged)* | Updated description |
| `image` | string | No | *(unchanged)* | New photo (base64). Send empty string `""` to remove the current photo. |
| `roles` | array | No | *(unchanged)* | Updated roles array. Send `[]` to clear all roles. |
| `certification_badges` | array | No | *(unchanged)* | Updated badges array. Send `[]` to clear all badges. |
| `is_active` | boolean | No | *(unchanged)* | `true` = active, `false` = deactivated. **⚠️ Setting to `false` immediately terminates the officer's session.** |

> **⚠️ Critical Side Effects:**
> - **Phone number change** → The officer's session is immediately terminated. They will be logged out of the mobile app and must re-authenticate using OTP with the **new** phone number.
> - **Deactivation** (`is_active: false`) → The officer's session is immediately terminated. They cannot log in again until reactivated.

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Action |
|---|---|---|
| 520 | Officer not found or deleted | Show error and refresh the list |
| 235 | New email format is invalid | Highlight the email field |
| 240 | New email already in use | Show "Email already exists" |
| 241 | New phone number already in use | Show "Phone number already registered" |
| 504 | New community ID doesn't exist | Refresh communities dropdown |
| 505 | New community is inactive | Show "Selected community is not active" |

---

### 2.5 Delete Officer

Soft-deletes an officer from the system.

**When to use:** When the admin clicks "Delete" on an officer row.

#### Request

```json
{
    "#request": "Officer/delete_officer",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6..."
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The officer's unique user ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Action |
|---|---|---|
| 520 | Officer not found or already deleted | Show "Officer not found" and refresh the list |
| **526** | **Officer has logged in — cannot be deleted** | **Critical:** Display a prominent dialog: *"This officer has already logged into the mobile app and cannot be deleted. To remove their access, set their status to Inactive instead."* Provide a button/link to open the Edit modal with the Active field focused. |

> **⚠️ Important — Handling RC 526:**  
> This is a **business rule constraint**, not an error. An officer who has logged in has associated operational data. The system protects data integrity by blocking deletion. The admin must **deactivate** the officer instead (via `update_officer` with `is_active: false`). Your UI **must** gracefully handle this case with clear user guidance.

---

### 2.6 Get Officer Evaluations

Retrieves all evaluations for a specific officer.

**When to use:** When loading the evaluations panel/tab in the officer detail view. Note that evaluations are also included inline in the `get_officer` response — this dedicated endpoint is useful for refreshing evaluations without reloading the full officer profile.

#### Request

```json
{
    "#request": "Officer/get_officer_evaluations",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6..."
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The officer's unique user ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "evaluations": [
        {
            "evaluation_id": 12,
            "text": "Excellent performance during emergency drill. Responded quickly and followed all protocols.",
            "date": "2026-06-15",
            "evaluator_name": "Sarah Manager",
            "created_on": "2026-06-16 10:30:00"
        },
        {
            "evaluation_id": 8,
            "text": "Good communication with residents. Needs improvement in report writing.",
            "date": "2026-04-01",
            "evaluator_name": "John Admin",
            "created_on": "2026-04-02 09:00:00"
        }
    ]
}
```

| Response Field | Type | Description |
|---|---|---|
| `evaluations` | array | Array of evaluation objects, sorted by date (newest first) |
| `evaluation_id` | integer | Unique identifier for this evaluation (used for deletion) |
| `text` | string | Evaluation content |
| `date` | string | Evaluation date (YYYY-MM-DD) — the date the evaluation refers to |
| `evaluator_name` | string | Name of the admin who created the evaluation |
| `created_on` | string | Timestamp when this evaluation record was created |

#### Error Responses

| RC | When |
|---|---|
| 520 | Officer not found or deleted |

---

### 2.7 Add Officer Evaluation

Adds a new evaluation to an officer's record.

**When to use:** When the admin submits the "Add Evaluation" form within the officer detail view.

#### Request

```json
{
    "#request": "Officer/add_officer_evaluation",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "text": "Excellent patrol performance. Identified and reported a security breach promptly.",
    "date": "2026-07-01"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The officer's unique user ID |
| `text` | string | **Yes** | Evaluation content (free text) |
| `date` | string | **Yes** | Evaluation date in `YYYY-MM-DD` format |

> **Note:** The evaluator name is **automatically set** by the server based on the currently logged-in admin's name. Do not send it from the client.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "evaluation_id": 15
}
```

| Response Field | Type | Description |
|---|---|---|
| `evaluation_id` | integer | The ID of the newly created evaluation |

#### Error Responses

| RC | When |
|---|---|
| 520 | Officer not found or deleted |

---

### 2.8 Delete Officer Evaluation

Soft-deletes an evaluation.

**When to use:** When the admin clicks "Delete" on an evaluation entry.

#### Request

```json
{
    "#request": "Officer/delete_officer_evaluation",
    "#token": "<token>",
    "evaluation_id": 12
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `evaluation_id` | integer | **Yes** | The evaluation's unique ID (from `get_officer_evaluations` or `get_officer` response) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Action |
|---|---|---|
| 527 | Evaluation not found or already deleted | Show "Evaluation not found" and refresh the evaluations list |

---

## 3. Officer Self-Service Endpoints (Mobile App)

These endpoints are used by the **officer mobile application**. They use the officer's own session token (obtained via OTP login) and operate on the officer's own data.

### 3.1 Get My Details

Retrieves the currently logged-in officer's own profile.

**When to use:** On the officer's profile screen load, or when resuming the app.

#### Request

```json
{
    "#request": "Officer/get_my_details",
    "#token": "<officer_token>"
}
```

No additional parameters required — the server identifies the officer from the token.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officer": {
        "user_id": "a1b2c3d4e5f6...",
        "first_name": "David",
        "last_name": "Cohen",
        "email": "david.cohen@example.com",
        "phone_num": "+972-50-1234567",
        "image_url": "https://files.example.com/officer/img_abc123.jpg",
        "community_id": 5,
        "community_name": "Green Valley Estate",
        "title": "Senior Patrol Officer",
        "description": "Experienced security professional.",
        "address": "123 Main St, Tel Aviv",
        "roles": ["Patrol", "Investigation"],
        "certification_badges": ["First Aid", "Armed Guard"],
        "is_active": true,
        "created_on": "2026-03-15 09:30:00",
        "last_login": "2026-07-07 22:15:00"
    }
}
```

> **Note:** Evaluations are NOT included in this response. Evaluations are admin-only data and are never exposed to the officer.

#### Error Responses

| RC | When |
|---|---|
| 520 | Officer record not found (data integrity issue — should not occur in normal use) |

---

### 3.2 Update My Details

Allows the officer to update their own editable profile fields.

**When to use:** When the officer submits their profile edit form.

#### Request

```json
{
    "#request": "Officer/update_my_details",
    "#token": "<officer_token>",
    "first_name": "David",
    "last_name": "Cohen",
    "address": "789 New St, Haifa",
    "email": "david.new@example.com"
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `first_name` | string | No | *(unchanged)* | Updated first name |
| `last_name` | string | No | *(unchanged)* | Updated last name |
| `address` | string | No | *(unchanged)* | Updated address |
| `email` | string | No | *(unchanged)* | Updated email. Must be valid and unique. |

> **Important — What Officers CANNOT Change:**  
> Officers cannot modify their own: phone number, title, roles, certification badges, community assignment, status, or image. These fields are admin-managed only.

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Action |
|---|---|---|
| 520 | Officer record not found | Should not occur normally — handle gracefully |
| 235 | New email format is invalid | Show validation error on the email field |
| 240 | New email already in use by another user | Show "Email already exists" |

---

## 4. Resident Endpoints (Mobile App)

These endpoints are used by the **resident mobile application**. They use the resident's own session token and provide read-only access to public officer information within the resident's community.

### 4.1 Get Officers Info

Retrieves a list of officers currently working in the resident's community. This is a **read-only** endpoint — no actions can be performed on the returned officers.

**When to use:** When the resident navigates to the "Officers Information" screen in the resident mobile app (SDS 2.8).

**SDS Reference (2.8):** *"In this screen, the user can see the list of officers currently working in his community and to read about them and their experience."*

#### Request

```json
{
    "#request": "Officer/get_officers_info",
    "#token": "<resident_token>"
}
```

No additional parameters required. The server **automatically infers the community** from the resident's session token — it looks up the resident's community assignment and returns only officers belonging to that community.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officers": [
        {
            "user_id": "a1b2c3d4e5f6...",
            "first_name": "David",
            "last_name": "Cohen",
            "title": "Senior Patrol Officer",
            "description": "Experienced security professional with 10 years of service.",
            "image_url": "https://files.example.com/officer/img_abc123.jpg"
        },
        {
            "user_id": "b2c3d4e5f6g7...",
            "first_name": "Sarah",
            "last_name": "Levy",
            "title": "Patrol Officer",
            "description": "Specializes in community engagement and crime prevention.",
            "image_url": "https://files.example.com/officer/img_def456.jpg"
        }
    ]
}
```

| Response Field | Type | Nullable | Description |
|---|---|---|---|
| `officers` | array | No | Array of public officer objects. Empty array if no officers in the community. |
| `user_id` | string | No | Officer's unique identifier |
| `first_name` | string | No | Officer's first name |
| `last_name` | string | No | Officer's last name (may be empty string) |
| `title` | string | No | Officer's job title |
| `description` | string | **Yes** | Officer description. May be `null`. |
| `image_url` | string | No | Full URL to officer's photo. Empty string if no photo — display a default avatar. |

> **Privacy Note:** This endpoint returns **only public-facing fields**. Private data such as phone number, email, address, roles, certification badges, and evaluations are never exposed to residents.

> **Sorting (SDS 2.8.1):** The server returns the list sorted alphabetically by the officer's first name (A→Z). Display the list in the order received — do **not** re-sort on the client side.

> **Checked-In Filter:** Per SDS 2.8, only officers who are currently "checked in" should be shown. This filter will be fully enforced once the Shift module is implemented. Until then, all active officers in the community are returned.

#### Empty State

If the response returns `officers: []`, display an appropriate empty state in the app:
- *"No officers are currently available in your community."*

#### Error Responses

This endpoint does not return module-specific errors. If the resident has no community assigned, the server returns a successful response with an empty `officers` array.

#### Officer Detail Screen (SDS 2.8.2)

When the resident taps on an officer in the list, navigate to a detail screen showing:
- **Officer's Full Name** — `first_name` + `last_name`
- **Title** — `title`
- **Image** — `image_url` (large format)
- **Description** — `description`

No additional API call is needed — all detail fields are already included in the list response. Simply pass the selected officer object to the detail screen.

---

## 5. Data Types Reference

### 5.1 Officer Object

The full officer object returned by `get_officers`, `get_officer`, and `get_my_details`:

| Field | Type | Nullable | Description |
|---|---|---|---|
| `user_id` | string | No | Unique identifier |
| `first_name` | string | No | First name |
| `last_name` | string | No | Last name (may be empty string) |
| `email` | string | No | Email address |
| `phone_num` | string | No | Mobile phone number (login credential) |
| `image_url` | string | No | Photo URL (empty string if none) |
| `community_id` | integer | No | Assigned community ID |
| `community_name` | string | **Yes** | Community display name. `null` if community deleted. |
| `title` | string | No | Job title |
| `description` | string | **Yes** | Description. May be `null`. |
| `address` | string | No | Address (may be empty string) |
| `roles` | array | No | Array of role strings. Empty array `[]` if none. |
| `certification_badges` | array | No | Array of badge strings. Empty array `[]` if none. |
| `is_active` | boolean | No | `true` = active, `false` = deactivated |
| `created_on` | string | No | Registration timestamp (UTC) |
| `last_login` | string | **Yes** | Last login timestamp. `null` if never logged in. |

### 5.2 Evaluation Object

| Field | Type | Nullable | Description |
|---|---|---|---|
| `evaluation_id` | integer | No | Unique evaluation ID |
| `text` | string | No | Evaluation content |
| `date` | string | No | Evaluation date (YYYY-MM-DD) |
| `evaluator_name` | string | No | Name of the admin who wrote it |
| `created_on` | string | No | Record creation timestamp |

---

## 6. Integration Notes

### 6.1 Image Upload

Officer photos are sent as **base64-encoded strings** in the `image` parameter. The server processes the image, stores it, and returns a URL in subsequent GET responses via the `image_url` field.

- **To add a photo:** Include the base64 data in the `image` field.
- **To change a photo:** Include new base64 data — the old photo is retained on the server (never deleted) but is no longer referenced.
- **To remove a photo:** Send `image: ""` (empty string) in `update_officer`.
- **No photo:** If `image_url` is an empty string, display a default avatar/placeholder.

### 6.2 Roles and Badges

Both `roles` and `certification_badges` are **arrays of strings**. They are free-form text values:

```json
"roles": ["Patrol", "Investigation", "K9 Unit"]
"certification_badges": ["First Aid Certified", "Armed Guard License", "Defensive Driving"]
```

- When creating/updating, send the **complete** array (not incremental add/remove).
- To clear all roles/badges, send an empty array `[]`.
- These values are displayed as-is in the UI (chips, tags, multi-select dropdowns).

### 6.3 Phone Number Format

Phone numbers should be sent in the format the officer will use for OTP login. The server does not currently enforce a specific format but validates non-empty. Recommended: international format (e.g., `+972-50-1234567`).

### 6.4 Timestamps

All timestamps are in **UTC** format: `YYYY-MM-DD HH:mm:ss`. The client application is responsible for converting to the user's local timezone for display.

### 6.5 Partial Updates

`update_officer` and `update_my_details` support partial updates:
- **Only include fields you want to change.** Fields not included in the request body are left unchanged.
- Exception: `user_id` is always required (identifies which officer to update).
- For boolean fields like `is_active`: only include it when you explicitly want to change the active status.
