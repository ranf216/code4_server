# Admin User API — Web Developer Integration Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-02  
**Audience:** Web Application Developers  
**Phase:** 1.3  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 5.2

> **Important:** This document treats the server as a **strict black box**. It describes only what the web application sends and receives. No internal server logic, database schemas, or backend implementation details are included.

---

## 1. General API Conventions

### 1.1 Request Format

All API calls are made via **HTTP POST** to the server's API endpoint. Every request body is a JSON object containing at minimum:

```json
{
    "#request": "AdminUser/endpoint_name",
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

The Admin User module has two access levels:

| Access Level | Who | Endpoints |
|---|---|---|
| **Super Admin** | Users with the Super Admin role | All management endpoints (`get_users_list`, `get_user`, `add_user`, `update_user`, `delete_user`, `reset_password`) |
| **Any Admin** | Any management portal user (any role) | Self-service endpoints (`change_password`) |

If a user without the required role attempts to call a restricted endpoint, the server returns `rc: 103` (No privileges).

### 1.4 Common Error Codes

These error codes may be returned by **any** endpoint:

| RC | Meaning | Recommended Action |
|---|---|---|
| 0 | Success | Process the response data |
| 102 | Missing required parameter | Check that all mandatory fields are included in the request |
| 103 | No privileges | The current user does not have permission for this action. Show "Access denied" message. |
| 201 | Invalid token | Redirect to login — the session has expired or was terminated |

### 1.5 Admin User Error Codes

These error codes are specific to the Admin User module:

| RC | Meaning | When Returned |
|---|---|---|
| 770 | User not found | The specified `user_id` does not exist, is not an admin, or has been deleted |
| 771 | Cannot delete/deactivate | Self-deletion, or the target is the last remaining admin in the system |
| 772 | Cannot change own role | A Super Admin attempted to change their own role |

Additional error codes that may be returned by specific endpoints:

| RC | Meaning | When Returned |
|---|---|---|
| 106 | Invalid role value | The `role` parameter is not a valid role identifier |
| 213 | First name required | The `first_name` parameter is missing or empty |
| 235 | Invalid email address | The `email` parameter is not a valid email format |
| 240 | Email already exists | Another active user already has this email address |
| 242 | Password does not meet criteria | Password fails validation (see Section 2.3.1 for requirements) |
| 247 | Invalid password | The `current_password` provided is incorrect |
| 248 | New password same as current | The new password must be different from the current password |

---

## 2. Admin User Endpoints

### 2.1 Get Users List

Retrieves a list of all management portal users. Use this to populate the Users Management table page.

**When to use:** On page load of the Users Management screen. Also call this endpoint whenever the Super Admin performs a search, changes sort order, toggles the "include inactive" filter, or after any create/update/delete operation to refresh the list.

#### Request

```json
{
    "#request": "AdminUser/get_users_list",
    "#token": "<token>",
    "include_inactive": false,
    "search_text": "",
    "sort_by": "first_name",
    "sort_dir": "asc"
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `include_inactive` | boolean | No | `false` | Set to `true` to include deactivated users. By default, only active users are shown. |
| `search_text` | string | No | `""` | Free-text search. Filters across first name, last name, email, and phone number. Case-insensitive, supports partial matching. |
| `sort_by` | string | No | `"first_name"` | Column to sort by. Valid values: `"first_name"`, `"last_name"`, `"email"`, `"role"`, `"created_on"`. |
| `sort_dir` | string | No | `"asc"` | Sort direction: `"asc"` or `"desc"`. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "users": [
        {
            "user_id": "a1b2c3d4e5f6...",
            "first_name": "John",
            "last_name": "Smith",
            "email": "john.smith@code4.com",
            "phone_num": "+1-555-0100",
            "role": 2,
            "is_active": true,
            "created_on": "2026-01-15 09:30:00",
            "last_login": "2026-06-28 14:20:00"
        },
        {
            "user_id": "b2c3d4e5f6g7...",
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane.doe@code4.com",
            "phone_num": "+1-555-0200",
            "role": 3,
            "is_active": true,
            "created_on": "2026-02-10 11:00:00",
            "last_login": "2026-06-30 08:45:00"
        }
    ],
    "total_count": 2
}
```

| Response Field | Type | Description |
|---|---|---|
| `users` | array | Array of user objects |
| `total_count` | integer | Total number of users in the returned list |
| `user_id` | string | Unique user identifier |
| `first_name` | string | User's first name |
| `last_name` | string | User's last name (may be empty) |
| `email` | string | User's email address (login identifier) |
| `phone_num` | string | Mobile phone number (may be empty) |
| `role` | integer | Role identifier (see Section 2.1.1 for mapping) |
| `is_active` | boolean | Whether the user is currently active |
| `created_on` | string | Account creation timestamp (YYYY-MM-DD HH:mm:ss, UTC) |
| `last_login` | string | Last login timestamp (may be `null` if never logged in) |

#### 2.1.1 Role Values

The `role` field in user responses is an integer. Use this mapping to display human-readable role names in the UI:

| Value | Display Name |
|---|---|
| 2 | Super Admin |
| 3 | Manager |
| 4 | Planning |
| 5 | Logistics |
| 6 | Finance |
| `null` | *(No role assigned)* |

> **Important:** These values are defined server-side. Do not hardcode additional roles without server-side support. When adding a new user or changing a role, send the integer value (e.g., `2` for Super Admin), not the display name.

#### Search Behaviour

The `search_text` parameter triggers a **server-side search**. The server matches the query against:
1. First name
2. Last name
3. Email address
4. Phone number

A user is included in the results if **any** of the above match. The search is case-insensitive and supports partial matching (e.g., searching "john" will match "Johnson").

> **Important:** Do NOT implement client-side filtering when `search_text` is used. Always send the search query to the server and use the returned list as-is.

---

### 2.2 Get Single User

Retrieves full details for a specific user. Use this when opening the user detail view or the Edit User form.

**When to use:** When the Super Admin clicks on a user row to view details, or when opening the "Edit User" modal. Also use this to refresh a user's data after an update.

#### Request

```json
{
    "#request": "AdminUser/get_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6..."
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The user ID to retrieve |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "user": {
        "user_id": "a1b2c3d4e5f6...",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith@code4.com",
        "phone_num": "+1-555-0100",
        "role": 2,
        "is_active": true,
        "created_on": "2026-01-15 09:30:00",
        "last_login": "2026-06-28 14:20:00"
    }
}
```

The response field structure is identical to the objects in the `get_users_list` response (see Section 2.1).

#### Error Response

| RC | When |
|---|---|
| 770 | The specified `user_id` does not exist or has been deleted |

---

### 2.3 Add User

Creates a new management portal user. Use this when the Super Admin submits the "Add New User" form.

**When to use:** When the Super Admin clicks "Save" on the "Add New User" modal. After a successful response, refresh the users list.

#### Request

```json
{
    "#request": "AdminUser/add_user",
    "#token": "<token>",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@code4.com",
    "password": "InitPass@123",
    "phone_num": "+1-555-0100",
    "role": 3
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `first_name` | string | **Yes** | — | User's first name. **Mandatory.** |
| `last_name` | string | No | `""` | User's last name. Optional. |
| `email` | string | **Yes** | — | Email address used for login. **Mandatory.** Must be unique among active users. Must be a valid email format. |
| `password` | string | **Yes** | — | Initial password. **Mandatory.** Must meet password criteria (see Section 2.3.1). The user will be forced to change this on first login. |
| `phone_num` | string | No | `""` | Mobile phone number. Optional. |
| `role` | integer | **Yes** | — | Role type identifier. **Mandatory.** See Section 2.1.1 for valid values. |

#### 2.3.1 Password Requirements

The password must meet **all** of the following criteria:
- **Minimum 8 characters**
- At least **1 lowercase letter** (a-z)
- At least **1 uppercase letter** (A-Z)
- At least **1 number** (0-9)
- At least **1 special character** (e.g., `@`, `#`, `$`, `!`, etc.)

These rules apply to:
- The `password` parameter in `add_user`
- The `password` parameter in `reset_password`
- The `new_password` parameter in `change_password`
- The password entered in the "Change Password on First Login" screen (handled by the infrastructure's `mandatory_change_password` API)

**Client-side validation:** The UI should validate these criteria before submitting the request. However, the server also validates — if the password is weak, it returns `rc: 242` with a detailed message describing which criteria failed.

#### 2.3.2 Mandatory First-Login Password Change

When a user is created via `add_user`, the server stores the password in a special state that forces the user to change it upon first login.

**What happens:**
1. The new user logs in with the initial password.
2. The server does **not** grant normal access. Instead, it issues a restricted token.
3. The restricted token can **only** be used with the `User/mandatory_change_password` endpoint.
4. The UI must detect this restricted token (see Section 2.7.1) and redirect the user to the "Change Password" screen.
5. After the user sets a new password, the server issues a normal token and full access is granted.

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
| `user_id` | string | The unique ID of the newly created user |

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 102 | `first_name`, `email`, `password`, or `role` is missing | Highlight the missing mandatory field(s) with validation messages |
| 106 | Invalid `role` value | Show "Invalid role selected" on the role dropdown |
| 213 | `first_name` is empty | Show "First name is required" on the first name field |
| 235 | `email` is not a valid email format | Show "Please enter a valid email address" on the email field |
| 240 | Another active user already has this email | Show "A user with this email already exists" on the email field |
| 242 | `password` does not meet criteria | Show the server's `message` field, which details which criteria failed |

---

### 2.4 Update User

Updates an existing user's details. Only the fields included in the request are modified — omitted fields remain unchanged.

**When to use:** When the Super Admin clicks "Save" on the "Edit User" modal. After a successful response, refresh the users list and/or the user detail view.

#### Request

```json
{
    "#request": "AdminUser/update_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith.new@code4.com",
    "initial_password": "NewInit@123",
    "phone_num": "+1-555-0200",
    "is_active": true,
    "role": 4
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `user_id` | string | **Yes** | — | The user ID to update |
| `first_name` | string | No | `""` | Updated first name. Omit to keep unchanged. |
| `last_name` | string | No | `""` | Updated last name. Omit to keep unchanged. Can be set to empty string to clear. |
| `email` | string | No | `""` | Updated email address. Must be valid and unique if changed. Omit to keep unchanged. |
| `initial_password` | string | **Conditional** | — | **Strictly required if `email` is being changed.** The new initial password for the user. Must meet password criteria (Section 2.3.1). The user will be forced to change it on next login. If `email` is not being changed, this parameter is ignored. |
| `phone_num` | string | No | `""` | Updated phone number. Omit to keep unchanged. Can be set to empty string to clear. |
| `is_active` | boolean | No | — | Set to `false` to deactivate the user, `true` to reactivate. Omit to keep unchanged. |
| `role` | integer | No | — | New role type identifier. Omit to keep unchanged. See Section 2.4.1. |

#### 2.4.1 Changing a User's Email

When the `email` field is included and its value differs from the user's current email, the server enforces SDS Section 5.2.3:

> *"Email — it is used by the user to enter the system, therefore if it is changed, an initial password must be given as well and the user must login again to the system."*

**Behaviour:**

1. The `initial_password` parameter becomes **mandatory**. If omitted, the server returns `rc: 102` (Missing required parameter) with `param: "initial_password"`.
2. The `initial_password` must meet all password criteria (Section 2.3.1). If it fails, the server returns `rc: 242`.
3. On success, the server performs these actions **atomically** (all-or-nothing):
   - Updates the user's email address.
   - Stores the new initial password in a state that forces the user to change it on next login (identical to the first-login flow described in Section 2.3.2).
   - **Immediately terminates the user's active session** — they are logged out everywhere.
4. The user must now log in with the **new email** and the **new initial password**, which will trigger the mandatory password change flow before they can access the system.

> **Important:** The email change and password reset happen in a single atomic operation. If any part fails, nothing is changed. There is no need for a separate "Reset Password" step after changing an email.

**Example — email change request:**
```json
{
    "#request": "AdminUser/update_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "email": "new.email@code4.com",
    "initial_password": "TempPass@789"
}
```

#### 2.4.2 Changing a User's Role

The `role` parameter is optional. When provided, the server changes the user's role to the specified value. **Constraints:**

- **Only Super Admins** can change a user's role (the endpoint is restricted to Super Admin ACL).
- **Cannot change your own role:** If the Super Admin tries to change their own role (i.e., `user_id` matches the caller's own user ID), the server returns `rc: 772`.
- **Valid values only:** The `role` must be a valid role identifier (see Section 2.1.1). Invalid values return `rc: 106`.

> **Design Note:** The SDS originally specified that "Role type" is not editable. A design decision was made to allow Super Admins to change roles to support the platform's expanded role structure (Manager, Planning, Logistics, Finance). This deviation is documented in the project's architectural decisions.

#### 2.4.3 Deactivating a User

Setting `is_active: false` deactivates the user. The server performs a critical safety check:

- **If the target user is the last remaining active admin** in the system, the server **blocks the deactivation** and returns `rc: 771` with message "cannot delete your own account".
- If successful, the deactivated user's session is **immediately terminated** — they are logged out and cannot log in again until reactivated.

Reactivating a user is done by sending `is_active: true`.

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 770 | User not found or deleted | Show "User not found" and refresh the list |
| 771 | Trying to deactivate the last admin | Show "Cannot deactivate this user — they are the last active admin in the system. At least one admin must remain active." (see Section 2.4.4) |
| 772 | Trying to change own role | Show "You cannot change your own role" |
| 102 | Missing `initial_password` when email is being changed | Show "An initial password is required when changing the email address" on the initial password field |
| 106 | Invalid `role` value | Show "Invalid role selected" on the role dropdown |
| 235 | Invalid email format | Show "Please enter a valid email address" on the email field |
| 240 | Email already exists | Show "A user with this email already exists" on the email field |
| 242 | `initial_password` does not meet criteria | Show the server's `message` field detailing which criteria failed, on the initial password field |

#### 2.4.4 Handling the "Last Admin" Error (RC 771)

When the server returns `rc: 771` in response to a deactivation attempt, the UI should display a clear, informative message:

```
┌─────────────────────────────────────────────────────────┐
│  Cannot Deactivate User                                 │
│                                                         │
│  ⚠ This user cannot be deactivated because they are     │
│  the last active admin in the system.                   │
│                                                         │
│  At least one admin account must remain active at all   │
│  times to ensure system access is never lost.           │
│                                                         │
│                                          [OK]           │
└─────────────────────────────────────────────────────────┘
```

---

### 2.5 Delete User

Soft-deletes a user. The server performs validation checks before deletion.

**When to use:** When the Super Admin clicks "Delete" on a user and confirms the action in a confirmation dialog. The UI must be prepared to handle the "last admin" constraint error.

#### Request

```json
{
    "#request": "AdminUser/delete_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6..."
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The user ID to delete |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses — Deletion Constraints

The server actively validates deletion constraints. If any check fails, a specific error code is returned:

| RC | Meaning | Recommended UI Action |
|---|---|---|
| 770 | User not found | Show "User not found" and refresh the list |
| 771 | Cannot delete — self-deletion or last admin | See Section 2.5.1 |

#### 2.5.1 Handling Deletion Constraint Errors (RC 771)

The `rc: 771` error is returned in two scenarios:
1. **Self-deletion:** The Super Admin is trying to delete their own account.
2. **Last admin:** The target user is the last remaining active admin in the system.

In both cases, display a clear prompt:

```
┌─────────────────────────────────────────────────────────┐
│  Cannot Delete User                                     │
│                                                         │
│  ⚠ This user cannot be deleted.                         │
│                                                         │
│  • You cannot delete your own account.                  │
│  • Or: This is the last active admin in the system.     │
│    At least one admin must remain at all times.          │
│                                                         │
│  Consider deactivating the user instead if you want     │
│  to prevent their access without permanent deletion.    │
│                                                         │
│              [Cancel]  [Deactivate Instead]              │
└─────────────────────────────────────────────────────────┘
```

If the Super Admin clicks **[Deactivate Instead]**, call the `update_user` endpoint:

```json
{
    "#request": "AdminUser/update_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "is_active": false
}
```

> **Note:** The deactivation call may also return `rc: 771` if the target is the last admin. In that case, show the informative "last admin" message from Section 2.4.3 without the deactivation option.

#### Recommended Deletion Flow

```
[1] Super Admin clicks "Delete" button on a user row
         │
         ▼
[2] Show confirmation dialog:
    "Are you sure you want to delete [First Name] [Last Name]?
     This action cannot be undone."
         │
         ▼ (Super Admin confirms)
[3] Call AdminUser/delete_user { user_id }
         │
         ├─ rc: 0    → Show success toast, refresh users list
         │
         ├─ rc: 770  → Show "User not found", refresh list
         │
         └─ rc: 771  → Show constraint prompt with deactivation option
                        │
                        ├─ [Deactivate Instead] → Call update_user { is_active: false }
                        │   ├─ rc: 0   → Show "User deactivated", refresh list
                        │   └─ rc: 771 → Show "Cannot deactivate — last admin"
                        │
                        └─ [Cancel] → Close prompt
```

---

### 2.6 Reset Password

Resets a user's password to a new initial password. The user will be forced to change it on their next login (same flow as a new user's first login).

**When to use:** When the Super Admin clicks "Reset Password" on a user's profile or in the users list. The Super Admin must enter a new initial password.

#### Request

```json
{
    "#request": "AdminUser/reset_password",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "password": "NewInitPass@789"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The user ID whose password is being reset |
| `password` | string | **Yes** | The new initial password. Must meet password criteria (Section 2.3.1). |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 770 | User not found | Show "User not found" and refresh the list |
| 242 | Password does not meet criteria | Show the server's `message` field detailing which criteria failed |

#### Post-Reset Behaviour

After a successful reset:
- The target user's **current session is immediately terminated**. They are logged out everywhere.
- On their next login, the user enters the new initial password.
- The server forces them through the **mandatory password change flow** (same as first login — see Section 2.3.2).
- The Super Admin must communicate the new initial password to the user through a secure channel (e.g., in person, encrypted message). The server does not send it automatically.

#### Recommended Reset Flow

```
[1] Super Admin clicks "Reset Password" on a user
         │
         ▼
[2] Show "Reset Password" dialog:
    ┌──────────────────────────────────────────────┐
    │  Reset Password for [First Name] [Last Name] │
    │                                              │
    │  New Initial Password:  [________________]   │
    │  (min 8 chars, upper, lower, number, symbol) │
    │                                              │
    │  ⚠ The user will be logged out immediately   │
    │  and must change this password on next login. │
    │                                              │
    │                    [Cancel]  [Reset]          │
    └──────────────────────────────────────────────┘
         │
         ▼ (Super Admin clicks "Reset")
[3] Validate password client-side (Section 2.3.1)
[4] Call AdminUser/reset_password { user_id, password }
         │
         ├─ rc: 0   → Show success: "Password reset successfully.
         │            The user must change it on next login."
         │
         ├─ rc: 242 → Show password criteria error
         │
         └─ rc: 770 → Show "User not found"
```

---

### 2.7 Change Password (Self-Service)

Allows the currently logged-in admin user to change their own password. This is a voluntary password change — not the mandatory first-login change.

**When to use:** When the user clicks "Change Password" in their account settings or profile menu.

> **Note:** This endpoint is available to **all** admin users (any role), not just Super Admins.

#### Request

```json
{
    "#request": "AdminUser/change_password",
    "#token": "<token>",
    "current_password": "CurrentPass@123",
    "new_password": "NewSecurePass@456"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `current_password` | string | **Yes** | The user's current password. Required for security verification. |
| `new_password` | string | **Yes** | The new password. Must meet password criteria (Section 2.3.1). Must be different from `current_password`. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

After a successful change:
- The user **remains logged in** — their session token is preserved.
- Subsequent logins use the new password.

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 247 | Current password is incorrect | Show "The current password you entered is incorrect" on the current password field |
| 242 | New password does not meet criteria | Show the server's `message` field detailing which criteria failed |
| 248 | New password is the same as current | Show "Your new password must be different from your current password" |
| 770 | User not found (edge case) | Redirect to login — the account may have been deleted |

#### 2.7.1 Mandatory vs. Voluntary Password Change

There are **two different** password change flows. It is critical to distinguish between them:

| Flow | Endpoint | When | Token Type |
|---|---|---|---|
| **Mandatory** (first login) | `User/mandatory_change_password` | After login with initial password | X-token (restricted) |
| **Voluntary** (self-service) | `AdminUser/change_password` | Any time from account settings | Normal token |

**Detecting mandatory change:**
After a user logs in via `User/login`, check the response for a field indicating a mandatory password change is required (the server issues a restricted token). If detected:
1. Do NOT navigate to the main dashboard.
2. Redirect to the "Change Password" screen.
3. Call `User/mandatory_change_password` (not `AdminUser/change_password`).
4. On success, the server returns a normal token — store it and navigate to the dashboard.

```json
// Mandatory change request (first login)
{
    "#request": "User/mandatory_change_password",
    "#token": "<x_token>",
    "password": "NewSecurePass@456"
}
```

> **Important:** The `AdminUser/change_password` endpoint does NOT accept restricted tokens (X-tokens). It is exclusively for voluntary changes when the user already has a normal session.

---

## 3. Complete Error Code Reference

### 3.1 Admin User Error Codes (RC 770–779)

| RC | Constant Name | Description | Affected Endpoints |
|---|---|---|---|
| 770 | `ERR_ADMIN_USER_NOT_FOUND` | The user does not exist or has been deleted | `get_user`, `update_user`, `delete_user`, `reset_password`, `change_password` |
| 771 | `ERR_ADMIN_CANNOT_DELETE_SELF` | Self-deletion/deactivation or last admin constraint | `delete_user`, `update_user` (deactivation) |
| 772 | `ERR_ADMIN_CANNOT_EDIT_SELF_ROLE` | Super Admin cannot change their own role | `update_user` (role change) |

### 3.2 Input Validation Error Codes

| RC | Description | Affected Endpoints |
|---|---|---|
| 106 | Invalid role value | `add_user`, `update_user` |
| 213 | First name is required | `add_user` |
| 235 | Invalid email address format | `add_user`, `update_user` |
| 240 | Email already exists | `add_user`, `update_user` |
| 242 | Password does not meet criteria | `add_user`, `reset_password`, `change_password` |
| 247 | Incorrect current password | `change_password` |
| 248 | New password same as current | `change_password` |

### 3.3 Standard Error Handling Pattern

Every API response should be checked using a consistent pattern:

```javascript
async function callAPI(payload)
{
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.rc !== 0)
    {
        switch (data.rc)
        {
            case 102:
                showValidationError("Please fill in all required fields: " + data.param);
                break;
            case 103:
                showError("You do not have permission to perform this action.");
                break;
            case 201:
                redirectToLogin();
                break;
            default:
                showError(data.message);
                break;
        }
        return null;
    }

    return data;
}
```

---

## 4. Typical Integration Workflows

### 4.1 Users Management List Page

```
Page Load:
    → Call get_users_list { include_inactive: <checkbox_state> }
    → Populate table with response.users
    → Display response.total_count as "Total: X users"

Search:
    → On search input change (debounced, 300-500ms):
        → Call get_users_list {
              search_text: <input_value>,
              include_inactive: <checkbox_state>,
              sort_by: <current_sort>,
              sort_dir: <current_direction>
          }
        → Replace table data with response.users

Sort:
    → On column header click:
        → Toggle sort_dir (asc → desc → asc)
        → Call get_users_list with updated sort_by and sort_dir
        → Replace table data

Toggle "Show Inactive":
    → Call get_users_list { include_inactive: <new_state>, ...current_filters }
    → Replace table data

After Create/Update/Delete:
    → Re-call get_users_list with current filter/sort state to refresh
```

### 4.2 Add User Modal

```
Modal Open:
    → Clear all form fields
    → Set role dropdown to default (e.g., Manager)

Form Validation (client-side):
    → first_name: required, non-empty
    → email: required, valid email format
    → password: required, meets criteria (Section 2.3.1)
    → role: required, valid role value
    → All other fields: optional

Submit:
    → Collect all form values
    → Call AdminUser/add_user
    → On rc: 0   → Close modal, refresh list, show success toast
    → On rc: 240 → Show "Email already exists" on email field
    → On rc: 242 → Show password criteria error
    → On rc: 213 → Show "First name is required"
    → On rc: 106 → Show "Invalid role" on role dropdown
    → On rc: 102 → Show validation errors for missing fields
```

### 4.3 Edit User Modal

```
Modal Open:
    → Call AdminUser/get_user { user_id }
    → Populate form with response.user
    → Store original email value for comparison
    → Set role dropdown to current role value
    → Set is_active toggle to current state

Email Change Detection:
    → On email field change:
        → If new value differs from original:
            → Dynamically show "Initial Password" field with criteria checklist
            → Disable "Save" button until password meets all criteria
        → If new value matches original:
            → Hide "Initial Password" field, clear its value
            → Re-enable "Save" button (if other fields are valid)

Submit:
    → Collect only changed values (compare with original data)
    → Include user_id always
    → If email was changed, include initial_password in payload
    → Call AdminUser/update_user with changed values
    → On rc: 0   → Close modal, refresh list
    → On rc: 770 → Show "User not found", close modal, refresh list
    → On rc: 771 → Show "Last admin" constraint message
    → On rc: 772 → Show "Cannot change your own role"
    → On rc: 102 → Show "Initial password required" on password field
    → On rc: 240 → Show "Email already exists" on email field
    → On rc: 242 → Show password criteria error on initial password field
    → On rc: 106 → Show "Invalid role" on role dropdown
```

### 4.4 Delete User Flow

```
Super Admin clicks "Delete":
    → Show confirmation dialog:
      "Are you sure you want to delete [Name]? This cannot be undone."
    → On confirm:
        → Call AdminUser/delete_user { user_id }
        → On rc: 0   → Refresh list, show success toast
        → On rc: 771 → Show constraint prompt with deactivation option
            → If Super Admin clicks "Deactivate Instead":
                → Call AdminUser/update_user { user_id, is_active: false }
                → On rc: 0   → Refresh list, show "User deactivated"
                → On rc: 771 → Show "Cannot deactivate — last admin"
        → On rc: 770 → Show "User not found", refresh list
```

### 4.5 Reset Password Flow

```
Super Admin clicks "Reset Password":
    → Show Reset Password dialog with password input
    → On submit:
        → Validate password client-side (Section 2.3.1)
        → Call AdminUser/reset_password { user_id, password }
        → On rc: 0   → Show success, close dialog
        → On rc: 242 → Show password criteria error
        → On rc: 770 → Show "User not found"
```

### 4.6 Change Password (Self-Service) Flow

```
User navigates to "Change Password" in account settings:
    → Display form with:
      - Current Password input
      - New Password input
      - Confirm New Password input (client-side match only)
    → On submit:
        → Validate: new_password matches confirm field
        → Validate: new_password meets criteria (Section 2.3.1)
        → Call AdminUser/change_password { current_password, new_password }
        → On rc: 0   → Show success toast: "Password changed successfully"
        → On rc: 247 → Show "Current password is incorrect"
        → On rc: 242 → Show password criteria error
        → On rc: 248 → Show "New password must be different from current"
```

### 4.7 Mandatory Password Change (First Login) Flow

```
User logs in with initial password via User/login:
    → Server returns restricted token (X-token)
    → Detect restricted token in login response
    → Redirect to "Change Password" screen (NOT the dashboard)
    → Display form:
      - New Password input
      - Confirm New Password input
      - Password criteria hints (8+ chars, upper, lower, number, symbol)
    → On submit:
        → Validate: passwords match
        → Validate: meets criteria
        → Call User/mandatory_change_password { password: new_password }
          (use the X-token, NOT a normal token)
        → On rc: 0 → Store new normal token, navigate to dashboard
        → On rc: 242 → Show criteria error
```
