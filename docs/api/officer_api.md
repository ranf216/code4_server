# Officer API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Officer/<endpoint_name>"`.

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

### Officers

Officers are security personnel who use the mobile application to receive calls, perform patrols, and interact with the platform. They are managed by admins/managers through the management portal.

- Officers authenticate exclusively via **Phone/OTP** (one-time password sent to their mobile number). They do not use email/password login.
- Each officer is associated with exactly **one community** at a time.
- Officers are created in **active** state by default.
- Deleting an officer is a **soft delete** — only permitted if the officer has never logged in to the app. Officers who have logged in must be deactivated instead.
- Changing an officer's phone number or deactivating them **terminates their active session**, forcing re-authentication.

### Officer Evaluations

Managers can record performance evaluations for officers. Each evaluation contains free-text content, a date, and the evaluator's name (automatically captured from the admin's profile at write time).

- Evaluations are visible **only to admins/managers** — officers cannot see their own evaluations.
- Evaluations are embedded in the single-officer detail response and also available via a dedicated list endpoint.
- Deleting an evaluation is a soft delete.

---

## Endpoints — Admin Officer Management

### POST Officer/get_officers
*Admin only.* Retrieves the list of all officers with optional filters, search, and sorting.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | No | Filter by community. `0` or omitted returns all communities. |
    | `include_inactive` | boolean | No | When `true`, inactive officers are included. Default: `false`. |
    | `search_text` | string | No | Free-text search across first name, last name, email, phone number, and community name. |
    | `sort_by` | string | No | Sort column. Accepted values: `first_name`, `last_name`, `community`, `created_on`. Default: `first_name`. |
    | `sort_dir` | string | No | Sort direction: `asc` or `desc`. Default: `asc`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officers": [
            {
                "user_id": "abc123",
                "first_name": "John",
                "last_name": "Smith",
                "email": "john@example.com",
                "phone_num": "+15551234567",
                "image_url": "https://domain/n/photo.png",
                "community_id": 1,
                "community_name": "Sunset Estates",
                "title": "Senior Patrol Officer",
                "description": "Experienced patrol officer.",
                "address": "123 Main Street",
                "roles": ["Patrol", "Investigation"],
                "certification_badges": ["First Aid", "Armed"],
                "is_active": true,
                "created_on": "2026-01-15 10:30:00",
                "last_login": "2026-03-01 08:00:00"
            }
        ],
        "total_count": 1
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | Unique officer identifier. |
    | `first_name` | string | Officer's first name. |
    | `last_name` | string | Officer's last name. |
    | `email` | string | Officer's email address. |
    | `phone_num` | string | Mobile phone number (used for OTP login). |
    | `image_url` | string | URL to the officer's profile photo, or `null`. |
    | `community_id` | integer | ID of the assigned community, or `null`. |
    | `community_name` | string | Name of the assigned community, or `null`. |
    | `title` | string | Officer's job title. |
    | `description` | string | Free-text description about the officer, or `null`. |
    | `address` | string | Officer's physical address. |
    | `roles` | array of strings | List of assigned roles (e.g., `["Patrol", "Supervisor"]`). Empty array if none. |
    | `certification_badges` | array of strings | List of certification badges (e.g., `["First Aid", "Armed"]`). Empty array if none. |
    | `is_active` | boolean | Whether the officer is currently active. |
    | `created_on` | string | ISO datetime of registration. |
    | `last_login` | string | ISO datetime of last app login, or `null` if never logged in. |
    | `total_count` | integer | Total number of officers in the result set. |

    The list is sorted by first name ascending by default. By default, only active officers are returned. Soft-deleted officers are never included.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called by the management portal to populate the Officers List (SDS 4.3.1). The `include_inactive` parameter maps to the active/inactive filter toggle (SDS 4.3.5). The `community_id` parameter implements the community name filter. The `search_text` parameter supports free-text search across all table columns (SDS 4.3.5). The `sort_by` and `sort_dir` parameters allow column-based sorting. Also used from the community detail view to show officers per community (SDS 4.2.2).

---

### POST Officer/get_officer
*Admin only.* Retrieves the full details of a single officer, including embedded evaluations.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The officer's unique user ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officer":
        {
            "user_id": "abc123",
            "first_name": "John",
            "last_name": "Smith",
            "email": "john@example.com",
            "phone_num": "+15551234567",
            "image_url": "https://domain/n/photo.png",
            "community_id": 1,
            "community_name": "Sunset Estates",
            "title": "Senior Patrol Officer",
            "description": "Experienced patrol officer.",
            "address": "123 Main Street",
            "roles": ["Patrol", "Investigation"],
            "certification_badges": ["First Aid", "Armed"],
            "is_active": true,
            "created_on": "2026-01-15 10:30:00",
            "last_login": "2026-03-01 08:00:00",
            "evaluations": [
                {
                    "evaluation_id": 1,
                    "text": "Excellent performance during night shift.",
                    "date": "2026-02-15",
                    "evaluator_name": "Jane Manager",
                    "created_on": "2026-02-16 09:00:00"
                }
            ]
        }
    }
    ```

    The `officer` object contains all fields described in `get_officers`, plus:

    | Field | Type | Description |
    |-------|------|-------------|
    | `evaluations` | array | List of performance evaluations, sorted by date descending. Each evaluation contains `evaluation_id` (integer), `text` (string), `date` (string, YYYY-MM-DD), `evaluator_name` (string), and `created_on` (string, ISO datetime). |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 520 | officer not found | No active officer exists with the given `user_id`. |

- **Usage & Flows:**
    Called when opening the officer detail or edit form in the management portal (SDS 4.3.2, 4.3.3). The embedded `evaluations` array provides all evaluation data inline, avoiding a separate call when viewing officer details. Evaluations are admin-only — they are never shown to the officer.

---

### POST Officer/add_officer
*Admin only.* Creates a new officer and associates them with a community. The officer is created in active state with OTP-based authentication.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `first_name` | string | Yes | Officer's first name. |
    | `last_name` | string | No | Officer's last name. |
    | `phone_num` | string | Yes | Mobile phone number. Must be unique across all active users. Used for OTP login. |
    | `email` | string | No | Email address. Must be a valid email format and unique across all active users if provided. |
    | `community_id` | integer | Yes | ID of the community to associate the officer with. The community must exist and be active. |
    | `title` | string | Yes | Officer's job title (e.g., "Security Officer"). |
    | `address` | string | No | Officer's physical address. |
    | `description` | string | No | Free-text description about the officer. |
    | `image` | string | No | Officer's profile photo as a base64-encoded string. |
    | `roles` | array of strings | No | List of role names (e.g., `["Patrol", "Supervisor"]`). |
    | `certification_badges` | array of strings | No | List of certification badge names (e.g., `["First Aid", "Armed"]`). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "user_id": "abc123"
    }
    ```

    Returns the generated `user_id` for the newly created officer.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 224 | invalid phone number | The `phone_num` field is empty or missing. |
    | 235 | invalid email address | The `email` value is not a valid email format. |
    | 240 | email already exists | Another active user already uses this email address. |
    | 241 | phone number already exists | Another active user already uses this phone number. |
    | 504 | community not found | No active community exists with the given `community_id`. |
    | 505 | community is not active | The specified community exists but is currently inactive. |

- **Usage & Flows:**
    Called from the "Add New Officer" form in the management portal (SDS 4.3.2). The officer is created in active state with today as the registration date. The officer is automatically associated with the specified community. After creation, the officer can log in to the mobile app using their phone number and OTP. The `phone_num` is the officer's login credential — it must be unique and valid. If no `email` is provided, a placeholder email is generated internally.

---

### POST Officer/update_officer
*Admin only.* Updates one or more fields of an existing officer. Only provided fields are modified; omitted fields retain their current values.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The officer's unique user ID. |
    | `first_name` | string | No | Updated first name. |
    | `last_name` | string | No | Updated last name. |
    | `phone_num` | string | No | Updated phone number. Must be unique. **Changing this terminates the officer's active session**, forcing re-authentication with the new number. |
    | `email` | string | No | Updated email. Must be a valid email format and unique. |
    | `community_id` | integer | No | ID of a new community to reassign the officer to. The community must exist and be active. |
    | `title` | string | No | Updated job title. |
    | `address` | string | No | Updated physical address. |
    | `description` | string | No | Updated description. |
    | `image` | string | No | Updated profile photo as base64. Send empty string to clear the image. |
    | `roles` | array of strings | No | Replacement list of roles. Send an empty array to clear all roles. |
    | `certification_badges` | array of strings | No | Replacement list of badges. Send an empty array to clear all badges. |
    | `is_active` | boolean | No | Set `false` to deactivate or `true` to reactivate. **Deactivating terminates the officer's active session**, preventing further app access. |

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
    | 235 | invalid email address | The new `email` value is not a valid email format. |
    | 240 | email already exists | Another active user already uses this email address. |
    | 241 | phone number already exists | Another active user already uses this phone number. |
    | 504 | community not found | No active community exists with the given `community_id`. |
    | 505 | community is not active | The target community exists but is currently inactive. |
    | 520 | officer not found | No active officer exists with the given `user_id`. |

- **Usage & Flows:**
    Called from the officer edit form in the management portal (SDS 4.3.3). Supports partial updates — only send the fields that changed.

    **Session termination:** Two specific changes trigger immediate session termination (SDS 4.3.3):
    1. **Phone number change** — Since the phone number is the officer's login credential, changing it invalidates the current session. The officer must re-authenticate via OTP with their new number.
    2. **Deactivation** (`is_active: false`) — The officer is immediately locked out of the app.

    **Community reassignment:** When `community_id` is changed, the officer will receive calls from the new community only, no longer from the previous one (SDS 4.3.3).

    **Roles and badges:** When `roles` or `certification_badges` are provided, they **replace** the entire existing list. To add a single role, the consumer must send the complete desired list including existing entries. Send an empty array to clear.

---

### POST Officer/delete_officer
*Admin only.* Soft-deletes an officer. Only permitted if the officer has never logged in to the app. Officers who have logged in must be deactivated via `update_officer` instead.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The officer's unique user ID. |

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
    | 520 | officer not found | No active officer exists with the given `user_id`, or already deleted. |
    | 526 | officer has logged in and cannot be deleted, only deactivated | The officer has logged in at least once. Use `update_officer` with `is_active: false` instead. |

- **Usage & Flows:**
    Called from the officer management list (SDS 4.3.4). The deletion constraint exists because once an officer has logged in, they may have associated data (calls, shifts, reports). Soft-deletion preserves historical data integrity. If the consumer receives `rc: 526`, it should display a message suggesting deactivation as an alternative. After deletion, the officer's phone number and email become available for reuse by a new officer. The deleted officer's session (if any) is terminated immediately.

---

## Endpoints — Officer Self-Service (Mobile App)

### POST Officer/get_my_details
*Officer only.* Retrieves the currently authenticated officer's own profile details. The officer is identified from the session token — no user ID parameter is needed.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officer":
        {
            "user_id": "abc123",
            "first_name": "John",
            "last_name": "Smith",
            "email": "john@example.com",
            "phone_num": "+15551234567",
            "image_url": "https://domain/n/photo.png",
            "community_id": 1,
            "community_name": "Sunset Estates",
            "title": "Senior Patrol Officer",
            "description": "Experienced patrol officer.",
            "address": "123 Main Street",
            "roles": ["Patrol", "Investigation"],
            "certification_badges": ["First Aid", "Armed"],
            "is_active": true,
            "created_on": "2026-01-15 10:30:00",
            "last_login": "2026-03-01 08:00:00"
        }
    }
    ```

    The `officer` object contains the same fields as `get_officers`. **Evaluations are NOT included** — they are admin-only.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 520 | officer not found | The officer's profile could not be found (account may have been deleted or deactivated). |

- **Usage & Flows:**
    Called by the officer mobile app to populate the "My Account / My Details" screen (SDS 3.14.1). The officer can view their full name, title, address, email, phone number, community name, and profile picture. The phone number, title, community, roles, badges, and picture are displayed as read-only — changes to these fields require an admin.

---

### POST Officer/update_my_details
*Officer only.* Allows the currently authenticated officer to update their own editable profile fields. The officer is identified from the session token.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `first_name` | string | No | Updated first name. |
    | `last_name` | string | No | Updated last name. |
    | `address` | string | No | Updated physical address. |
    | `email` | string | No | Updated email. Must be a valid email format and unique across all active users. |

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
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 235 | invalid email address | The new `email` value is not a valid email format. |
    | 240 | email already exists | Another active user already uses this email address. |
    | 520 | officer not found | The officer's profile could not be found. |

- **Usage & Flows:**
    Called from the officer mobile app's "My Details" edit screen (SDS 3.14.1). Officers can edit their full name, address, and email. Officers **cannot** change their own phone number (it is the login credential, changes require admin action — SDS 3.14.1), title, community, roles, certification badges, profile picture, or active status.

---

## Endpoints — Resident-Facing

### POST Officer/get_officers_info
*Resident only.* Retrieves public-facing details of officers assigned to the requesting resident's community, for display in the resident mobile app.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A Resident session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officers": [
            {
                "user_id": "abc123",
                "first_name": "John",
                "last_name": "Smith",
                "title": "Senior Patrol Officer",
                "description": "Experienced patrol officer.",
                "image_url": "https://domain/n/photo.png"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | Unique officer identifier. |
    | `first_name` | string | Officer's first name. |
    | `last_name` | string | Officer's last name. |
    | `title` | string | Officer's job title. |
    | `description` | string | Free-text description, or `null`. |
    | `image_url` | string | URL to the officer's profile photo, or `null`. |

    The list is sorted alphabetically by first name. Only active officers assigned to the resident's community are returned. If the resident has no community assigned, an empty array is returned.

    **Privacy:** This endpoint deliberately returns only public-facing fields. Private data such as phone number, email, address, roles, certification badges, evaluations, login status, and active status are never exposed to residents.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not a Resident. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called by the resident mobile app to populate the "Officers Information" screen (SDS 2.8). The list shows officers available in the resident's community. Clicking on an officer in the list opens their detail view showing name, title, photo, and description (SDS 2.8.2). Once the Shift module is available, this endpoint will filter to show only officers currently checked in (SDS 2.8: "present only the officers checked in"). Until then, all active officers in the community are returned.

---

## Endpoints — Officer Evaluations

### POST Officer/get_officer_evaluations
*Admin only.* Retrieves all performance evaluations for a specific officer.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The officer's unique user ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "evaluations": [
            {
                "evaluation_id": 1,
                "text": "Excellent performance during night shift.",
                "date": "2026-02-15",
                "evaluator_name": "Jane Manager",
                "created_on": "2026-02-16 09:00:00"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `evaluation_id` | integer | Unique evaluation identifier. |
    | `text` | string | Evaluation content. |
    | `date` | string | Evaluation date in `YYYY-MM-DD` format, as specified by the evaluator. |
    | `evaluator_name` | string | Full name of the admin who wrote the evaluation (captured at write time). |
    | `created_on` | string | ISO datetime of when the evaluation was recorded. |

    Evaluations are sorted by date descending (most recent first). Only non-deleted evaluations are returned.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 520 | officer not found | No active officer exists with the given `user_id`. |

- **Usage & Flows:**
    Called from the officer detail view in the management portal to display the evaluations section (SDS 4.3.2, 4.3.3). Evaluations are visible only to admins/managers and are never shown to the officer (SDS 4.3.2: "This field is visible only for the manager/admin (not to the officer)"). Note that evaluations are also embedded in the `get_officer` response — this dedicated endpoint is useful when refreshing evaluations independently.

---

### POST Officer/add_officer_evaluation
*Admin only.* Adds a new performance evaluation for an officer. The evaluator's name is automatically captured from the current admin's profile.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The officer's unique user ID to add the evaluation to. |
    | `text` | string | Yes | Evaluation content (free text). |
    | `date` | string | Yes | Evaluation date in `YYYY-MM-DD` format. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "evaluation_id": 1
    }
    ```

    Returns the generated `evaluation_id` for the newly created evaluation.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter (`text` or `date`) is missing or empty. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 520 | officer not found | No active officer exists with the given `user_id`. |

- **Usage & Flows:**
    Called from the officer edit form when the manager adds a new evaluation (SDS 4.3.2, 4.3.3). The evaluator name is **not** a parameter — it is automatically resolved from the admin's profile (first name + last name) at write time, ensuring accurate attribution even if the admin's name changes later. Each evaluation includes text, a date, and the evaluator name as specified in SDS 4.3.2.

---

### POST Officer/delete_officer_evaluation
*Admin only.* Soft-deletes a specific officer evaluation.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `evaluation_id` | integer | Yes | The ID of the evaluation to delete. |

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
    | 527 | officer evaluation not found | No active evaluation exists with the given `evaluation_id` (either never existed or already deleted). |

- **Usage & Flows:**
    Called from the officer detail view when the manager removes an evaluation. After deletion, the evaluation will no longer appear in `get_officer_evaluations` or the `evaluations` array in `get_officer`. The deletion is permanent from the consumer's perspective — deleted evaluations cannot be restored via the API.

---
