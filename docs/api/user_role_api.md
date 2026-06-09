# User Role API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"UserRole/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints require a `#token` field in the request body. Unless noted otherwise, only Admin-type users may call these endpoints.

---

## Concepts

### Role-Based Permission Model

User roles are managed via a **bitmask** system. Each role is assigned a numeric value (starting at 1) and is stored as a bit position in the user's allow/deny bitmasks.

Permissions are resolved in the following order:
1. **User type defaults** — each user type defines a base set of roles.
2. **Allow bits** — explicitly granted roles are added.
3. **Deny bits** — explicitly denied roles are removed.

The four operations (`allow`, `unallow`, `deny`, `undeny`) manipulate these bitmasks:

| Operation | Allow Bit | Deny Bit | Effect |
|-----------|-----------|----------|--------|
| `allow` | Set | Reset | Grants the role, removes any deny. |
| `unallow` | Reset | — | Revokes a previously granted allow. |
| `deny` | Reset | Set | Denies the role, removes any allow. |
| `undeny` | — | Reset | Revokes a previously set deny. |

### Defined Roles

Roles are defined in `platform/definitions/user_roles.js`. Each role has a constant name, a numeric value, and a display name. Example:

| Value | Name |
|-------|------|
| 1 | Account Impersonation |

The available roles are project-specific and may vary between deployments.

---

## Endpoints

### POST UserRole/allow
*Admin only.* Grants a role to a user by setting the allow bit and clearing the deny bit for that role.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the target user. |
    | `role` | integer | Yes | The numeric role value to allow. |

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
    | 106 | invalid user role | The `role` value does not match any defined role. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No user found with the given `user_id`. |

- **Usage & Flows:**
    Use this to explicitly grant a role to a user. If the role was previously denied, the deny is also cleared. The user's cached session is invalidated so the change takes effect immediately.

---

### POST UserRole/unallow
*Admin only.* Revokes a previously allowed role by clearing the allow bit. Does not set a deny.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the target user. |
    | `role` | integer | Yes | The numeric role value to unallow. |

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
    | 106 | invalid user role | The `role` value does not match any defined role. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No user found with the given `user_id`. |

- **Usage & Flows:**
    Use this to revoke a role that was explicitly allowed. After this operation, the role falls back to the user type's default. If the user type includes this role by default, the user will still have it.

---

### POST UserRole/deny
*Admin only.* Denies a role to a user by setting the deny bit and clearing the allow bit.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the target user. |
    | `role` | integer | Yes | The numeric role value to deny. |

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
    | 106 | invalid user role | The `role` value does not match any defined role. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No user found with the given `user_id`. |

- **Usage & Flows:**
    Use this to explicitly deny a role, even if the user's type would normally grant it. The deny overrides both explicit allows and type defaults. The user's cached session is invalidated immediately.

---

### POST UserRole/undeny
*Admin only.* Removes a deny on a role by clearing the deny bit. Does not set an allow.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the target user. |
    | `role` | integer | Yes | The numeric role value to undeny. |

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
    | 106 | invalid user role | The `role` value does not match any defined role. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No user found with the given `user_id`. |

- **Usage & Flows:**
    Use this to remove a previously set deny. After this operation, the role falls back to the user type's default and any explicit allow. If neither applies, the user will not have the role.

---

### POST UserRole/get_user_roles
*Admin only.* Retrieves the calculated (effective) roles for a specified user.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the target user. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "roles": [1, 3, 5]
    }
    ```

    The `roles` array contains the numeric values of all effective roles for the user, sorted in ascending order. The effective roles are computed from the user type defaults, plus explicit allows, minus explicit denies.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No user found with the given `user_id`. |

- **Usage & Flows:**
    Use from an admin panel to inspect which roles a user currently has. The returned array reflects the final computed permissions after all allow/deny logic is applied.

---

### POST UserRole/get_my_roles
*Authenticated (Admin or Regular).* Retrieves the calculated (effective) roles for the currently logged-in user.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "roles": [1, 3, 5]
    }
    ```

    The `roles` array contains the numeric values of all effective roles for the authenticated user, sorted in ascending order.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | The user's account is not found. |

- **Usage & Flows:**
    Use this for the current user to check their own permissions. Available to both Admin and Regular users. Useful for client-side feature gating based on roles.
