# Admin User API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"AdminUser/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints require a `#token` field in the request body. Unless noted otherwise, access is restricted to **Admin** users. The `change_admin_user_role` endpoint requires the **Super Admin** role specifically.

---

## Concepts

### Management System Users

Management system users are the personnel who access the management portal — admins, managers, planners, logistics, and finance staff. Each user has a login email, personal details, an assigned role, and an active/inactive status.

- A user's **email address** serves as the login credential. Changing it requires providing a new initial password, and the user must log in again with the new credentials.
- New users are created with an **initial password** that is flagged for mandatory change on first login.
- Supported **role types** are: Super Admin (2), Manager (3), Planning (4), Logistics (5), Finance (6).
- Users are created in **active** state by default.
- Deleting a user is a **soft delete** — the user is marked as removed but retained for historical reference.
- The system enforces that at least **one active admin** must remain at all times; the last active admin cannot be deleted or deactivated.
- An admin **cannot delete their own account** or **change their own role**.

### Password Management

- **Initial password:** Set during user creation or email change. Stored in a format that forces the user to change it on first login.
- **Reset password:** An admin can reset any other user's password back to an initial password, forcing the target user to change it on next login. The user's active sessions are terminated.
- **Change own password:** A user can voluntarily change their own password. The current password must be provided, the new password must meet configured criteria, and it cannot be the same as the current password.
- **Password criteria:** If enabled in system configuration, passwords must meet minimum length and complexity requirements (lowercase, uppercase, numbers, special characters).

---

## Endpoints — User Management

### POST AdminUser/get_admin_users
*Admin only.* Retrieves the list of all management system users, with optional filtering and sorting.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `include_inactive` | boolean | No | When `true`, inactive users are included in the results. Default: `false`. |
    | `search_text` | string | No | Free-text search term. Filters users whose first name, last name, email, or phone number matches. |
    | `sort_by` | string | No | Column to sort by. Accepted values: `first_name`, `last_name`, `email`, `role`, `created_on`. Default: sorted by first name ascending. |
    | `sort_dir` | string | No | Sort direction: `asc` or `desc`. Default: `asc`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "users": [
            {
                "user_id": "abc123def456...",
                "first_name": "John",
                "last_name": "Smith",
                "email": "john.smith@example.com",
                "phone_num": "+1-555-0100",
                "role": 2,
                "is_active": true,
                "created_on": "2026-01-15 10:30:00",
                "last_login": "2026-06-20 08:15:00"
            }
        ],
        "total_count": 1
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `users` | array | List of user objects. |
    | `total_count` | integer | Total number of users in the returned list. |
    | `user_id` | string | Unique user identifier. |
    | `first_name` | string | User's first name. |
    | `last_name` | string | User's last name (may be empty). |
    | `email` | string | User's login email address. |
    | `phone_num` | string | User's phone number (may be empty). |
    | `role` | integer | User's role type identifier. |
    | `is_active` | boolean | Whether the user is currently active. |
    | `created_on` | string | Date and time the user was added to the system. |
    | `last_login` | string | Date and time of the user's most recent login (may be `null`). |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 103 | current user does not have privileges | The caller is not an Admin. |

- **Usage & Flows:**
    Called when loading the Users Table (SDS 5.2.1). By default only active users are shown; the `include_inactive` flag corresponds to the Active/Inactive filter (SDS 5.2.5). The `search_text` parameter supports the free search capability across all table columns. Sorting is controlled via `sort_by` and `sort_dir`, corresponding to clicking column headers in the table.

---

### POST AdminUser/get_admin_user
*Admin only.* Retrieves a single management system user by their ID.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The unique identifier of the user to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "user": {
            "user_id": "abc123def456...",
            "first_name": "John",
            "last_name": "Smith",
            "email": "john.smith@example.com",
            "phone_num": "+1-555-0100",
            "role": 2,
            "is_active": true,
            "created_on": "2026-01-15 10:30:00",
            "last_login": "2026-06-20 08:15:00"
        }
    }
    ```

    The `user` object contains the same fields described in `get_admin_users`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 770 | admin user not found | No active user exists with the given `user_id`. |

- **Usage & Flows:**
    Called when opening a user's detail view or the edit form (SDS 5.2.3). Also used to verify that changes (update, role change, deletion) were applied correctly.

---

### POST AdminUser/add_admin_user
*Admin only.* Creates a new management system user with the specified details.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `first_name` | string | Yes | User's first name. Cannot be empty. |
    | `last_name` | string | No | User's last name. |
    | `email` | string | Yes | Email address used for login. Must be a valid email format and unique among active users. |
    | `password` | string | Yes | Initial password. The user will be required to change it on first login. Must meet password criteria if enforced. This parameter is masked in request logs. |
    | `phone_num` | string | No | User's mobile phone number. |
    | `role` | integer | Yes | Role type: Super Admin (2), Manager (3), Planning (4), Logistics (5), Finance (6). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "user_id": "abc123def456..."
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | The unique identifier assigned to the newly created user. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 213 | first name is a required parameter | `first_name` is empty or missing. |
    | 235 | invalid email address | `email` is not a valid email format. |
    | 240 | user email already exists | Another active user already has this email address. |
    | 242 | password does not meet criteria | `password` does not satisfy the configured complexity requirements. |
    | 106 | invalid user role | `role` is not a recognized role type. |

- **Usage & Flows:**
    Called from the "Add New User" form in the Users Table (SDS 5.2.2). The user is created in active state with today as the registration date. The initial password is flagged so the user must change it during their first login (SDS 4.1.2).

---

### POST AdminUser/update_admin_user
*Admin only.* Updates one or more fields of an existing management system user. Only provided fields are modified; omitted fields retain their current values.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The unique identifier of the user to update. |
    | `first_name` | string | No | Updated first name. |
    | `last_name` | string | No | Updated last name. |
    | `email` | string | No | Updated email address. If changed, `initial_password` must also be provided. |
    | `phone_num` | string | No | Updated phone number. |
    | `is_active` | boolean | No | Set to `false` to deactivate the user, `true` to reactivate. Default: `true`. |
    | `initial_password` | string | No | Required when `email` is changed. The new initial password the user must use to log in. Must meet password criteria if enforced. This parameter is masked in request logs. |

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
    | 201 | invalid user token | Invalid or expired token. |
    | 770 | admin user not found | No active user exists with the given `user_id`. |
    | 771 | cannot delete your own account | Attempting to deactivate the last remaining active admin. |
    | 235 | invalid email address | The new `email` is not a valid email format. |
    | 240 | user email already exists | Another active user already has this email address. |
    | 102 | missing api param: initial_password | `email` was changed but `initial_password` was not provided. |
    | 242 | password does not meet criteria | `initial_password` does not satisfy the configured complexity requirements. |

- **Usage & Flows:**
    Called from the Edit User form (SDS 5.2.3). When the email address is changed, the user's current sessions are terminated and they must log in again with the new email and initial password, which they will be forced to change (SDS 4.1.2). Deactivating a user also terminates their active sessions. The system prevents deactivating the last active admin to ensure continued system access.

---

### POST AdminUser/reset_admin_user_password
*Admin only.* Resets a user's password to a new initial password. The user will be required to change it on their next login.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The unique identifier of the user whose password is being reset. |
    | `password` | string | Yes | The new initial password. Must meet password criteria if enforced. This parameter is masked in request logs. |

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
    | 201 | invalid user token | Invalid or expired token. |
    | 770 | admin user not found | No active user exists with the given `user_id`. |
    | 242 | password does not meet criteria | `password` does not satisfy the configured complexity requirements. |

- **Usage & Flows:**
    Called from the Reset Password action in the Edit User form (SDS 5.2.3.1). The user's active sessions are terminated immediately. On next login, the user is forced to choose a new password (SDS 4.1.2).

---

### POST AdminUser/delete_admin_user
*Admin only.* Soft-deletes a management system user. The user is marked as removed and their active sessions are terminated.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The unique identifier of the user to delete. |

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
    | 201 | invalid user token | Invalid or expired token. |
    | 770 | admin user not found | No active user exists with the given `user_id`. |
    | 771 | cannot delete your own account | The caller is attempting to delete their own account, or is attempting to delete the last remaining active admin. |

- **Usage & Flows:**
    Called from the Delete action in the Users Table (SDS 5.2.4). The user can be deleted as long as they are not the only active admin remaining in the system. An admin cannot delete their own account. Deleted users are retained for historical reference but can no longer log in or appear in the active users list.

---

## Endpoints — Role Management

### POST AdminUser/change_admin_user_role
*Super Admin only.* Changes a user's role. Only accessible by users with the Super Admin role.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A Super Admin session token. |
    | `user_id` | string | Yes | The unique identifier of the user whose role is being changed. |
    | `role` | integer | Yes | The new role type: Super Admin (2), Manager (3), Planning (4), Logistics (5), Finance (6). |

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
    | 201 | invalid user token | Invalid or expired token. |
    | 103 | current user does not have privileges | The caller does not have the Super Admin role. |
    | 772 | cannot change your own role | The caller is attempting to change their own role. |
    | 770 | admin user not found | No active user exists with the given `user_id`. |
    | 106 | invalid user role | `role` is not a recognized role type. |

- **Usage & Flows:**
    Called from the Edit User form when changing the role type dropdown (SDS 5.2.3). A super admin can assign any valid role to another user but cannot change their own role. The role change takes effect immediately.

---

## Endpoints — Password Management

### POST AdminUser/change_my_password
*Admin only.* Allows the currently logged-in admin user to change their own password voluntarily.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `current_password` | string | Yes | The user's current password. This parameter is masked in request logs. |
    | `new_password` | string | Yes | The desired new password. Must meet password criteria if enforced. This parameter is masked in request logs. |

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
    | 201 | invalid user token | Invalid or expired token. |
    | 247 | invalid password | `current_password` does not match the user's actual current password. |
    | 242 | password does not meet criteria | `new_password` does not satisfy the configured complexity requirements. |
    | 248 | the new password cannot be the same as the current password | `new_password` is identical to `current_password`. |

- **Usage & Flows:**
    Called from the Change Password form (SDS 4.1.2). This is a voluntary password change — distinct from the mandatory first-login password change which is handled by the authentication flow. The user must provide their current password for verification. The new password takes effect immediately; the user remains logged in.

---
