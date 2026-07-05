# Admin User Module — Specification & SDS Compliance

**Document Version:** 1.0  
**Last Updated:** 2026-07-02  
**Phase:** 1.3  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 5.2  
**Module Files:** `platform/api/admin_user.js`, `platform/funcs/admin_user.js`  
**Design Decisions:** `docs/admin_user_questions.md`

---

## 1. Module Overview

The Admin User module manages **management portal users** within the Code4 Axis Security Operations Platform. These are the users who log into the web-based management portal — distinct from officers (mobile app) and residents (mobile app).

### 1.1 User Types Managed

All users created by this module have `USR_TYPE = 1` (`USER_TYPE_ADMIN`). Within this user type, the following roles are assigned via bitmask-based role management:

| Role | Constant | Value |
|---|---|---|
| Super Admin | `USER_ROLE_SUPER_ADMIN` | 2 |
| Manager | `USER_ROLE_MANAGER` | 3 |
| Planning | `USER_ROLE_PLANNING` | 4 |
| Logistics | `USER_ROLE_LOGISTICS` | 5 |
| Finance | `USER_ROLE_FINANCE` | 6 |

Roles are **sequential identifiers**. The `$UserRoles` system module converts them to bitmasks internally for storage in `USD_ROLE_ALLOW` and `USD_ROLE_DENY` columns.

### 1.2 File Structure

| File | Purpose |
|---|---|
| `platform/api/admin_user.js` | API definition — parameter schemas, ACL, documentation hints |
| `platform/funcs/admin_user.js` | API implementation — all business logic, database interaction, validation |
| `platform/definitions/errorcodes.en.js` | Error code definitions (RC 770–772 for admin user) |
| `platform/config/using_api.js` | Module registration |
| `platform/config/using_modules.js` | System module enablement (`user_roles`) |
| `platform/system_modules/user_roles.js` | Role bitmask management system module |
| `docs/admin_user_questions.md` | Questions, design decisions, and resolved issues |

### 1.3 Key Architectural Decision: No New Database Schema

This module operates entirely on the existing `user` and `user_details` tables provided by the platform infrastructure. **No new tables, columns, or migrations are required.** Admin users are distinguished from other user types solely by the `USR_TYPE = 1` (`USER_TYPE_ADMIN`) value.

### 1.4 Endpoint Summary

| Endpoint | ACL | Description |
|---|---|---|
| `AdminUser/get_users_list` | Super Admin | Get management system users list with filters and sorting |
| `AdminUser/get_user` | Super Admin | Get a single user's full details |
| `AdminUser/add_user` | Super Admin | Create a new management portal user |
| `AdminUser/update_user` | Super Admin | Edit user details, status, and role |
| `AdminUser/delete_user` | Super Admin | Soft-delete a management user |
| `AdminUser/reset_password` | Super Admin | Reset a user's password to a new initial password |
| `AdminUser/change_password` | Any Admin | Current user changes their own password |

### 1.5 Architectural Patterns

The module follows all infrastructure conventions defined in `docs/brain.md`:

- **Module-level helper functions:** `fetchAdminUserRecord()`, `getActiveAdminCount()`, and `mapAdminUserRow()` are defined outside the exported class to eliminate code duplication across methods. These private helpers access `$`-globals freely.
- **Standard class export:** `module.exports = class { ... }` with a `constructor(session)` that stores `this.$Session`.
- **Parameter injection:** API parameters are injected as `this.$param_name` properties by the infrastructure dispatcher.
- **Standard response pattern:** All methods return `{...rc, ...vals}` where `rc` is `$ERRS.ERR_SUCCESS` and `vals` contains response data.
- **Early return for validation:** Validation failures return error objects immediately (e.g., `return $ERRS.ERR_ADMIN_USER_NOT_FOUND`).
- **Internal API delegation:** User creation is delegated to the built-in `User/add_user` via `$executeAPI()` to reuse infrastructure logic.
- **Role management via `$UserRoles`:** All role assignment and removal is performed through `$UserRoles.setUserRoles()`. No direct access to `USD_ROLE_ALLOW` or `USD_ROLE_DENY` columns.

---

## 2. Database Tables Used

### 2.1 `user` Table (Infrastructure)

Stores core authentication data. Uses the `USR_` column prefix.

| Column | Type | Usage in This Module |
|---|---|---|
| `USR_ID` | varchar(64) | Primary key — unique user identifier (hash) |
| `USR_EMAIL` | varchar(200) | Login email address |
| `USR_PASSWORD` | varchar(200) | Password — 64-char hex hash for normal, plain text for initial/temporary |
| `USR_TYPE` | tinyint | Always `1` (`USER_TYPE_ADMIN`) for this module |
| `USR_STATUS` | tinyint | `1` = active, `0` = inactive |
| `USR_TOKEN` | varchar(200) | Session token — cleared on deactivation/deletion/password reset |
| `USR_DEVICE_ID` | varchar(200) | Device identifier — cleared on deactivation/deletion/password reset |
| `USR_CREATED_ON` | datetime | Account creation timestamp |
| `USR_LAST_LOGIN` | datetime | Last login timestamp |
| `USR_PASSWORD_CREATED_ON` | datetime | When the password was last set/changed |
| `USR_DELETED_ON` | datetime | Soft-deletion timestamp (synced from `user_details` via trigger) |
| `USR_LOGIN_AUTHORITY` | tinyint | Login method — always `1` (email) for admin users |

### 2.2 `user_details` Table (Infrastructure)

Stores profile and role data. Uses the `USD_` column prefix. Linked to `user` via `USD_USR_ID = USR_ID`.

| Column | Type | Usage in This Module |
|---|---|---|
| `USD_USR_ID` | varchar(64) | Foreign key to `user.USR_ID` |
| `USD_EMAIL` | varchar(200) | Email (synced with `user` table) |
| `USD_FIRST_NAME` | varchar(200) | User's first name |
| `USD_LAST_NAME` | varchar(200) | User's last name |
| `USD_PHONE_NUM` | varchar(20) | Mobile phone number |
| `USD_TYPE` | tinyint | User type (mirrored from `user`) |
| `USD_STATUS` | tinyint | Status (mirrored from `user`) |
| `USD_ROLE_ALLOW` | int | Role bitmask — managed by `$UserRoles` |
| `USD_ROLE_DENY` | int | Role deny bitmask — managed by `$UserRoles` |
| `USD_DELETED_ON` | datetime | Soft-deletion timestamp |

### 2.3 Trigger Synchronisation

The platform maintains database triggers that synchronise key fields between `user` and `user_details`:
- When `USD_EMAIL` is updated in `user_details`, the trigger updates `USR_EMAIL` in `user`.
- When `USD_STATUS` is updated in `user_details`, the trigger updates `USR_STATUS` in `user`.
- When `USD_DELETED_ON` is set in `user_details`, the trigger sets `USR_DELETED_ON` in `user`.

This means the module can update fields in `user_details` and rely on triggers to propagate changes to `user`. Certain fields (e.g., `USR_TOKEN`, `USR_PASSWORD`) are updated directly in the `user` table since they are not mirrored.

---

## 3. Helper Functions

### 3.1 `fetchAdminUserRecord(userId)`

Fetches a single non-deleted admin user by ID, joining `user` and `user_details`.

```sql
SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON,
       USR_LAST_LOGIN, USR_PASSWORD,
       USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM,
       USD_ROLE_ALLOW, USD_ROLE_DENY
FROM `user`
   JOIN `user_details` ON USR_ID = USD_USR_ID
WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL
```

- Filters by `USR_TYPE = USER_TYPE_ADMIN` to ensure only admin users are returned.
- Filters by `USD_DELETED_ON IS NULL` to exclude soft-deleted users.
- Returns the row object if found, `null` otherwise.

**Convention compliance:**
- No table aliases — column prefixes (`USR_*`, `USD_*`) ensure uniqueness.
- `JOIN` (not `INNER JOIN`) with the joined table on a new indented line.
- `?` placeholders for all parameters.

### 3.2 `getActiveAdminCount()`

Returns the count of currently active (non-deleted, status=1) admin users in the system. Used to enforce the "last admin" constraint.

```sql
SELECT COUNT(*) cnt
FROM `user`
   JOIN `user_details` ON USR_ID = USD_USR_ID
WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_DELETED_ON IS NULL
```

### 3.3 `mapAdminUserRow(row)`

Transforms a raw database row into an API-friendly response object. This ensures no database column names are ever exposed to the client.

```javascript
{
    user_id:    row.USR_ID,
    first_name: row.USD_FIRST_NAME,
    last_name:  row.USD_LAST_NAME,
    email:      row.USR_EMAIL,
    phone_num:  row.USD_PHONE_NUM,
    role:       primaryRole,          // Computed from bitmask via $Utils.getCalculatedUserRoles()
    is_active:  row.USR_STATUS === 1, // Boolean conversion
    created_on: row.USR_CREATED_ON,
    last_login: row.USR_LAST_LOGIN,
}
```

**Role computation:** The function calls `$Utils.getCalculatedUserRoles($Const.USER_TYPE_ADMIN, row.USD_ROLE_ALLOW, row.USD_ROLE_DENY)` which converts the bitmask values into an array of sequential role identifiers. The first role in the array is used as the `primaryRole`. Each admin user is expected to have exactly one role.

---

## 4. Endpoint Implementation Details

### 4.1 `get_users_list`

**Purpose:** Retrieve a list of all non-deleted management portal users with optional filtering, search, and sorting.

**API Definition:**
```
"get_users_list": {
    "@acl":              [$ACL.USER_ROLE_SUPER_ADMIN],
    "#token":            "s",
    "include_inactive":  "o:b:false***Include inactive users (default false)",
    "search_text":       "o:s:***Free-text search across name, email, phone",
    "sort_by":           "o:s:***Sort column: first_name, last_name, email, role, created_on",
    "sort_dir":          "o:s:asc***Sort direction: asc or desc"
}
```

**Implementation flow:**

1. **Build dynamic WHERE clause:** Start with base conditions `USR_TYPE=?` and `USD_DELETED_ON IS NULL`.
2. **Active filter:** If `include_inactive` is `false` (default), append `USR_STATUS = 1`.
3. **Free-text search:** If `search_text` is non-empty, append a compound `LIKE` condition across `USD_FIRST_NAME`, `USD_LAST_NAME`, `USR_EMAIL`, and `USD_PHONE_NUM`. The search term is wrapped with `%` wildcards.
4. **Sort validation:** A whitelist of valid sort columns maps API-friendly names to DB column names:
   - `"first_name"` → `"USD_FIRST_NAME"`
   - `"last_name"` → `"USD_LAST_NAME"`
   - `"email"` → `"USR_EMAIL"`
   - `"role"` → `"USD_ROLE_ALLOW"`
   - `"created_on"` → `"USR_CREATED_ON"`
   
   Default sort: `USD_FIRST_NAME ASC`.
5. **Execute query:** Single query with `JOIN` on `user_details`, dynamic `WHERE`, and dynamic `ORDER BY`.
6. **Map results:** Each row is transformed via `mapAdminUserRow()`.
7. **Return:** `{ rc: 0, users: [...], total_count: <length> }`.

**SQL query structure:**
```sql
SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON,
       USR_LAST_LOGIN,
       USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM,
       USD_ROLE_ALLOW, USD_ROLE_DENY
FROM `user`
   JOIN `user_details` ON USR_ID = USD_USR_ID
WHERE USR_TYPE=? AND USD_DELETED_ON IS NULL
  AND USR_STATUS = 1
  AND (USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ? OR USR_EMAIL LIKE ? OR USD_PHONE_NUM LIKE ?)
ORDER BY USD_FIRST_NAME ASC
```

**Convention compliance:**
- No table aliases — column prefixes ensure uniqueness in JOINs.
- No queries inside loops — single query retrieves all data.
- `?` placeholders for all user input — SQL injection prevention.
- API response field mapping via `mapAdminUserRow()` — no DB column names exposed.
- Sort column validated against a whitelist — prevents SQL injection via dynamic ORDER BY.

---

### 4.2 `get_user`

**Purpose:** Retrieve full details for a single admin user by ID.

**API Definition:**
```
"get_user": {
    "@acl":      [$ACL.USER_ROLE_SUPER_ADMIN],
    "#token":    "s",
    "user_id":   "s***User ID"
}
```

**Implementation flow:**

1. **Fetch user:** Call `fetchAdminUserRecord(this.$user_id)`.
2. **Not found:** If `null`, return `$ERRS.ERR_ADMIN_USER_NOT_FOUND` (RC 770).
3. **Map:** Transform row via `mapAdminUserRow()`.
4. **Return:** `{ rc: 0, user: {...} }`.

---

### 4.3 `add_user`

**Purpose:** Create a new management portal user with an initial password that must be changed on first login.

**API Definition:**
```
"add_user": {
    "@acl":                [$ACL.USER_ROLE_SUPER_ADMIN],
    "@protected_request":  "password",
    "#token":              "s",
    "first_name":          "s***User first name",
    "last_name":           "o:s:***User last name",
    "email":               "s***Email address (used for login)",
    "password":            "s***Initial password (user must change on first login)",
    "phone_num":           "o:s:***Mobile phone number",
    "role":                "i***Role type: <dynamic role list>"
}
```

**Implementation flow:**

1. **Validate email format:** `$Utils.validateEmail(this.$email)` — if invalid, return `ERR_INVALID_EMAIL_ADDRESS` (RC 235).
2. **Validate first name:** `$Utils.empty(this.$first_name)` — if empty, return `ERR_REQ_FIRST_NAME` (RC 213).
3. **Validate password criteria:** `$Utils.isValidPassword(this.$password)` — if invalid, return `ERR_PASSWORD_NOT_MEET_CRITERIA` (RC 242). The platform enforces: minimum 8 characters, at least 1 lowercase letter, at least 1 uppercase letter, at least 1 number, at least 1 special character.
4. **Check email uniqueness:** Query `user` table for existing non-deleted user with same email. If found, return `ERR_USER_EMAIL_ALREADY_EXISTS` (RC 240).
5. **Validate role:** Check `this.$role` against `$Globals.allUserRoles`. If invalid, return `ERR_INVALID_USER_ROLE` (RC 106).
6. **Create user via infrastructure:** `$executeAPI(this.$Session, "User/add_user", {...})` with `type: $Const.USER_TYPE_ADMIN`. This handles:
   - Generating a unique user ID (`$Utils.uniqueHash()`)
   - Password hashing (`$Utils.hash(userId + password)`)
   - Inserting into `user` table
   - Inserting into `user_details` table
   - Transaction management
7. **Set phone number:** If `phone_num` is non-empty, `UPDATE user_details SET USD_PHONE_NUM=? WHERE USD_USR_ID=?`. Check `$Db.isError()`.
8. **Set role:** `$UserRoles.setUserRoles(newUserId, [this.$role], [], [], [])`. This sets the role bitmask in `USD_ROLE_ALLOW` and clears the user cache. Check `$Err.isERR()`.
9. **Store plain-text initial password:** `UPDATE user SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?` with `this.$password` (plain text, not hashed). Check `$Db.isError()`. Because the plain-text value does not match the 64-char hex hash pattern, the login handler detects it as temporary — this is the **mandatory password change mechanism** (see Section 5.1).
10. **Return:** `{ rc: 0, user_id: <new_id> }`.

**Convention compliance:**
- `@protected_request: "password"` — prevents the password from being logged in request logs.
- `$executeAPI` for `User/add_user` — reuses infrastructure user creation logic; avoids duplicating transaction, hashing, and trigger logic.
- `$Db.isError()` checked after every write operation.
- `$Err.isERR()` checked after `$UserRoles` call.

---

### 4.4 `update_user`

**Purpose:** Partial update of a user's profile details, active status, and/or role.

**API Definition:**
```
"update_user": {
    "@acl":              [$ACL.USER_ROLE_SUPER_ADMIN],
    "@protected_request": "initial_password",
    "#token":            "s",
    "user_id":           "s***User ID",
    "first_name":        "o:s:***User first name",
    "last_name":         "o:s:***User last name",
    "email":             "o:s:***Email address",
    "phone_num":         "o:s:***Mobile phone number",
    "is_active":         "o:b:***Active status",
    "role":              "o:i:***Role type (Super Admin only)",
    "initial_password":  "o:s:***Initial password (required when email is changed)"
}
```

**Implementation flow:**

1. **Fetch user:** `fetchAdminUserRecord(this.$user_id)` — return `ERR_ADMIN_USER_NOT_FOUND` (RC 770) if not found.
2. **Last-admin deactivation check:** If `is_active` is explicitly set to `false` AND the user is currently active (status=1), call `getActiveAdminCount()`. If count ≤ 1, return `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771). This prevents deactivating the last remaining admin.
3. **Email change handling (if changed):** If `email` is non-empty and differs from current:
   - Validate format via `$Utils.validateEmail()` — return `ERR_INVALID_EMAIL_ADDRESS` (RC 235) if invalid.
   - Check uniqueness among non-deleted users (excluding self) — return `ERR_USER_EMAIL_ALREADY_EXISTS` (RC 240) if duplicate.
   - **Require `initial_password`:** If `this.$initial_password` is empty/missing, return `ERR_MISSING_API_PARAM` (RC 102) with `param: "initial_password"`. Per SDS 5.2.3, an email change mandates a new initial password.
   - **Validate `initial_password` criteria:** `$Utils.isValidPassword(this.$initial_password)` — return `ERR_PASSWORD_NOT_MEET_CRITERIA` (RC 242) if invalid.
4. **Role change handling (if provided):**
   - **Self-role check:** If the target `user_id` matches the caller's session user ID, return `ERR_ADMIN_CANNOT_EDIT_SELF_ROLE` (RC 772). A Super Admin cannot change their own role.
   - **Validate role:** Check against `$Globals.allUserRoles` — return `ERR_INVALID_USER_ROLE` (RC 106) if invalid.
   - **Execute role change:** Compute current roles via `$Utils.getCalculatedUserRoles()`, then call `$UserRoles.setUserRoles(userId, [newRole], currentRoles.filter(r => r != newRole), [], [])`. This atomically removes all current roles and sets the new one.
5. **Build dynamic UPDATE:** Array-based pattern. Each optional field is checked with `$Utils.isset()` / `$Utils.empty()`:
   - `first_name` → `USD_FIRST_NAME`
   - `last_name` → `USD_LAST_NAME`
   - `email` → `USD_EMAIL` (trigger syncs to `user` table)
   - `phone_num` → `USD_PHONE_NUM`
   - `is_active` → `USD_STATUS` (boolean converted to 0/1; trigger syncs to `user` table)
6. **Begin transaction:** `$Db.beginTransaction()` — wraps all writes atomically.
7. **Execute UPDATE on `user_details`:** If any fields changed, execute `UPDATE user_details SET ... WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`. Check `$Db.isError()` — rollback on failure.
8. **Email change side effects (atomic):** If the email was changed:
   - Store plain-text password: `UPDATE user SET USR_PASSWORD=?, USR_TOKEN='', USR_DEVICE_ID=NULL, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?` with `this.$initial_password` (plain text, not hashed). Check `$Db.isError()` — rollback on failure.
   - Because the plain-text value does not match the 64-char hex hash pattern, this triggers the mandatory first-login password change flow on the user's next login (see Section 5.1).
9. **Deactivation side effects:** If `is_active` was set to `false` (and email was NOT changed — otherwise token is already cleared in step 8):
   - Clear the user's session: `UPDATE user SET USR_TOKEN='', USR_DEVICE_ID=NULL WHERE USR_ID=?`. Check `$Db.isError()` — rollback on failure.
10. **Commit transaction:** `$Db.commitTransaction()`.
11. **Invalidate token cache:** If email was changed OR user was deactivated: `this.$Session.tokenValidator.deleteFromUserCache(this.$user_id)`.
12. **Return:** `{ rc: 0 }`.

**Key design notes:**

- **Role via `update_user`:** This is a **formal deviation from SDS Section 5.2.3** (see Section 6). The `role` parameter is optional. When omitted, the user's role is unchanged. When provided, the endpoint leverages its existing Super Admin ACL to enforce that only Super Admins can change roles. The server additionally prevents self-role changes.

- **Email change requires `initial_password` (SDS 5.2.3 compliance):** Per SDS Section 5.2.3: *"if [email] is changed, an initial password must be given as well and the user must login again to the system."* The `initial_password` parameter is conditionally mandatory — required only when `email` differs from the current value. The server stores it as plain text (which does not match the 64-char hex hash pattern), triggering the mandatory password change flow, and immediately terminates the user's session. This ensures a single atomic API call handles the email change, password reset, and session termination — no two-step workaround required.

- **Transaction wrapping:** All database writes (email update in `user_details`, password/token update in `user`) are wrapped in a single `$Db.beginTransaction()` / `$Db.commitTransaction()` block. If any write fails, all changes are rolled back, preventing partial state (e.g., email changed but password not reset).

**Convention compliance:**
- `@protected_request: "initial_password"` — prevents the password from being logged in request logs.
- `$Db.isError()` checked after every write, with rollback on failure.
- `$Db.beginTransaction()` wraps all writes when email change involves multi-table updates.

---

### 4.5 `delete_user`

**Purpose:** Soft-delete a management portal user after verifying safety constraints.

**API Definition:**
```
"delete_user": {
    "@acl":      [$ACL.USER_ROLE_SUPER_ADMIN],
    "#token":    "s",
    "user_id":   "s***User ID"
}
```

**Implementation flow:**

1. **Fetch user:** `fetchAdminUserRecord(this.$user_id)` — return `ERR_ADMIN_USER_NOT_FOUND` (RC 770) if not found.
2. **Self-deletion check:** If `this.$user_id === this.$Session.userId`, return `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771). Admins cannot delete their own account.
3. **Last-admin check:** Call `getActiveAdminCount()`. If count ≤ 1 AND the target user is currently active (status=1), return `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771). The system must always have at least one active admin.
4. **Begin transaction:** `$Db.beginTransaction()`.
5. **Clear session:** `UPDATE user SET USR_TOKEN='', USR_DEVICE_ID=NULL WHERE USR_ID=?`. Check `$Db.isError()` — rollback on failure.
6. **Soft-delete:** `UPDATE user_details SET USD_DELETED_ON=?, USD_EMAIL=CONCAT(USD_EMAIL, '/DELETED'), USD_PHONE_NUM=CONCAT(USD_PHONE_NUM, '/DELETED') WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`. Check `$Db.isError()` — rollback on failure.
7. **Commit transaction:** `$Db.commitTransaction()`.
8. **Invalidate token cache:** `this.$Session.tokenValidator.deleteFromUserCache(this.$user_id)`.
9. **Return:** `{ rc: 0 }`.

**Convention compliance:**
- **Transaction wrapping:** Both writes are atomic — if either fails, both are rolled back (matches built-in `User/delete_user` pattern).
- **No SELECT inside transaction:** The `fetchAdminUserRecord()` and `getActiveAdminCount()` queries execute BEFORE `beginTransaction()`.
- **Soft deletion only:** Records are never physically deleted. `USD_DELETED_ON` is set and propagated to `USR_DELETED_ON` via trigger.
- **Email/phone suffix:** `/DELETED` is appended to free the email/phone for re-registration while preserving audit trail (same pattern as infrastructure `User/delete_user`).
- **Token invalidation:** Cache is cleared immediately so the user cannot make any further API calls.

---

### 4.6 `reset_password`

**Purpose:** Reset a user's password to a new initial value, forcing them to change it on next login.

**API Definition:**
```
"reset_password": {
    "@acl":                [$ACL.USER_ROLE_SUPER_ADMIN],
    "@protected_request":  "password",
    "#token":              "s",
    "user_id":             "s***User ID",
    "password":            "s***New initial password"
}
```

**Implementation flow:**

1. **Fetch user:** `fetchAdminUserRecord(this.$user_id)` — return `ERR_ADMIN_USER_NOT_FOUND` (RC 770) if not found.
2. **Validate password criteria:** `$Utils.isValidPassword(this.$password)` — return `ERR_PASSWORD_NOT_MEET_CRITERIA` (RC 242) if invalid.
3. **Store plain-text password:** The password is stored as-is (`this.$password`), without hashing.
4. **Update user record:** `UPDATE user SET USR_PASSWORD=?, USR_TOKEN='', USR_DEVICE_ID=NULL, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?`. Check `$Db.isError()`.
5. **Invalidate token cache:** `this.$Session.tokenValidator.deleteFromUserCache(this.$user_id)`.
6. **Return:** `{ rc: 0 }`.

**Key behaviour:**
- The password is stored as plain text (e.g., `"MyPass@123"`). Because this does not match the 64-character hex hash pattern (`/^[a-fA-F0-9]{64}$/`), the server identifies it as a temporary password.
- The user's current session is immediately terminated (token cleared).
- On next login, the infrastructure's login handler detects that the stored password is not a 64-char hex hash and issues an **X-token** instead of a normal token. This X-token can only be used with the `User/mandatory_change_password` endpoint, forcing the user to set a new password before accessing any other functionality.
- See **Section 5.1** for the full mandatory password change flow.

---

### 4.7 `change_password`

**Purpose:** Allow the currently logged-in admin user to voluntarily change their own password.

**API Definition:**
```
"change_password": {
    "@acl":                [$ACL.USER_TYPE_ADMIN],
    "@protected_request":  "current_password,new_password",
    "#token":              "s",
    "current_password":    "s***Current password",
    "new_password":        "s***New password"
}
```

**Implementation flow:**

1. **Fetch current user:** `fetchAdminUserRecord(this.$Session.userId)` — return `ERR_ADMIN_USER_NOT_FOUND` (RC 770) if not found.
2. **Verify current password:** `$Utils.isCorrectPwd(userId, this.$current_password, user.USR_PASSWORD)` — return `ERR_INVALID_PASSWORD` (RC 247) if incorrect.
3. **Validate new password criteria:** `$Utils.isValidPassword(this.$new_password)` — return `ERR_PASSWORD_NOT_MEET_CRITERIA` (RC 242) if invalid.
4. **Same-password check:** If `this.$new_password === this.$current_password`, return `ERR_NEW_PASSWORD_CANNOT_BE_SAME_AS_CURRENT` (RC 248).
5. **Hash and store:** Compute `hashedPassword = $Utils.hash(userId + this.$new_password)`. Execute `UPDATE user SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?`. Check `$Db.isError()`.
6. **Return:** `{ rc: 0 }`.

**Key differences from `reset_password`:**
- **ACL:** Available to any admin user (`USER_TYPE_ADMIN`), not just Super Admins.
- **Authentication:** Requires `current_password` for verification — prevents unauthorized changes even with a valid session token.
- **Hashed storage:** The new password is hashed normally (`$Utils.hash(userId + password)`), producing a 64-char hex string. Since it matches the hash pattern, the server does not treat it as temporary. The user does not need to change it again.
- **Session preserved:** The user's token is NOT cleared — they remain logged in after changing their password.
- **No X-token acceptance:** This endpoint does not accept X-tokens. It is for voluntary password changes only. Mandatory password changes (triggered when the stored password is not a 64-char hex hash) use the infrastructure's `User/mandatory_change_password` endpoint.

---

## 5. SDS Compliance Verification

### 5.1 Mandatory Password Change on First Login (SDS 5.2.2)

**SDS Requirement (Section 5.2.2):** *"Password — only initial password. The user will have to change it during the first login."*

**Implementation — The Hash-Pattern Detection Mechanism:**

The platform implements mandatory password change by distinguishing between hashed passwords (permanent) and plain-text passwords (temporary) based on format:

1. **User Creation (`add_user`):** The initial password is stored as **plain text** in the `USR_PASSWORD` column. For example, if the admin sets the initial password to `"MyPass@123"`, the stored value is `"MyPass@123"`.

2. **Login Attempt:** When the user logs in via the infrastructure's `User/login` endpoint:
   - The server loads `USR_PASSWORD` from the database.
   - It tests whether the stored password matches the 64-character hex pattern: `/^[a-fA-F0-9]{64}$/`.
   - If it does **not** match (plain-text temporary password), the server performs a **direct string comparison**: it checks if `inputPassword === storedPassword`.
   - If it **does** match (hashed permanent password), the server performs a **hash comparison**: it checks if `$Utils.hash(userId + inputPassword) === storedPassword`.

3. **X-Token Issuance:** If login succeeds AND the stored password is not a 64-char hex hash, the server issues an **X-token** instead of a normal session token. This X-token has restricted capabilities — it can ONLY be used with the `User/mandatory_change_password` endpoint.

4. **Mandatory Password Change:** The `User/mandatory_change_password` endpoint (infrastructure-provided):
   - Accepts **only** X-tokens (`@accept_x_token: "only"`).
   - Validates the new password meets criteria (minimum 8 characters, uppercase, lowercase, number, special character).
   - Hashes the new password normally: `$Utils.hash(userId + newPassword)`.
   - Stores the hashed password (64-char hex string) in `USR_PASSWORD`, replacing the plain-text value.
   - Issues a normal session token, granting full access.

5. **Post-Change State:** After the mandatory change, the password is stored as a 64-character hex hash. Subsequent logins proceed normally — the hash-pattern test passes, so no mandatory change is triggered.

**Flow diagram:**
```
Admin creates user with password "MyPass@123"
    │
    ▼
DB stores: USR_PASSWORD = "MyPass@123" (plain text, not a 64-char hex hash)
    │
    ▼
User logs in with "MyPass@123"
    │
    ▼
Server: /^[a-fA-F0-9]{64}$/ fails → direct compare → "MyPass@123" === "MyPass@123" ✓ → issues X-token
    │
    ▼
User calls User/mandatory_change_password with X-token
    │  new_password: "NewSecure@456"
    ▼
DB stores: USR_PASSWORD = hash(userId + "NewSecure@456") (64-char hex hash)
    │
    ▼
Server issues normal token → full access granted
```

**SDS compliance status:** ✅ Fully compliant. The mandatory password change is enforced at the infrastructure level through the X-token mechanism. The `AdminUser/add_user` and `AdminUser/reset_password` endpoints both store passwords as plain text (not matching the 64-char hex hash pattern), triggering this flow.

---

### 5.2 Password Reset (SDS 5.2.3.1)

**SDS Requirement (Section 5.2.3.1):** *"Any admin user can reset another user's password. This action changes the user's password back to the initial one and the user will have to login again and change it."*

**Implementation:**

The `AdminUser/reset_password` endpoint:

1. **Stores plain-text password:** The new password is stored as-is (not hashed) — because it does not match the 64-char hex hash pattern, this reverts the password to a "temporary" state, triggering the mandatory change flow on next login (Section 5.1).
2. **Terminates session:** Clears `USR_TOKEN` and `USR_DEVICE_ID`, forcing the user to log in again.
3. **Invalidates cache:** Calls `tokenValidator.deleteFromUserCache()` for immediate effect.

**Result:** The user must:
- Log in again with the new initial password.
- Complete the mandatory password change flow.
- Only then gain full access to the system.

**SDS compliance status:** ✅ Fully compliant. The reset mechanism leverages the same plain-text password convention as user creation. The user's session is immediately terminated and they must complete the full first-login flow again.

---

### 5.3 Deletion/Deactivation Constraints (SDS 5.2.4)

**SDS Requirement (Section 5.2.4):** *"The user can be deleted as long as he is not the only user in the table. One admin user must remain in the users table. The same condition applies to deactivating a user."*

**Implementation — `delete_user`:**

The `delete_user` method performs two sequential constraint checks:

1. **Self-deletion prevention:** `if (this.$user_id === this.$Session.userId)` → return `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771). A user cannot delete their own account regardless of how many admins exist.

2. **Last-admin prevention:** `getActiveAdminCount()` queries:
   ```sql
   SELECT COUNT(*) cnt
   FROM `user`
      JOIN `user_details` ON USR_ID = USD_USR_ID
   WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_DELETED_ON IS NULL
   ```
   If `cnt ≤ 1` AND the target user is active (status=1), return `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771).

**Implementation — `update_user` (deactivation):**

The `update_user` method performs the same constraint check when deactivating:

1. **Check:** If `is_active` is explicitly set to `false` AND the target user is currently active:
   - Call `getActiveAdminCount()`.
   - If count ≤ 1, return `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771).

**Why server-side:** These checks MUST be server-side (not client-side) because:
- Client-side checks can be bypassed.
- Multiple administrators may modify users concurrently.
- The server is the single source of truth for the admin count.

**SDS compliance status:** ✅ Fully compliant. Both deletion and deactivation enforce the "at least one admin" constraint. The error code `ERR_ADMIN_CANNOT_DELETE_SELF` (RC 771) is returned for all constraint violations.

---

## 6. Open Issues & Discrepancy Resolution

### 6.1 Formal Deviation: Role Editability (SDS 5.2.3)

**SDS Specification (Section 5.2.3):**

The SDS "Edit a User" table explicitly marks "Role type" as **not editable**:

| Parameter Name | Editable |
|---|---|
| Role type | **no** |

**Design Decision:**

A formal deviation was made to **allow Super Admins to change a user's role** through the `AdminUser/update_user` endpoint. The `role` parameter is accepted as an optional field.

**Rationale:**
- The SDS was written when only "Admin" roles existed ("Currently only admin" — SDS 5.2.2). With the introduction of multiple roles (Manager, Planning, Logistics, Finance), the ability to change roles becomes operationally necessary.
- Restricting role changes to Super Admins maintains security boundaries.
- A user cannot change their own role — this is enforced server-side.
- Embedding role changes in `update_user` is cleaner than requiring a separate workflow for role management.

**Security boundaries maintained:**
1. **ACL enforcement:** `update_user` requires `USER_ROLE_SUPER_ADMIN` ACL — only Super Admins can access this endpoint.
2. **Self-role prevention:** The server returns `ERR_ADMIN_CANNOT_EDIT_SELF_ROLE` (RC 772) if a Super Admin attempts to change their own role.
3. **Role validation:** Only valid roles from `$Globals.allUserRoles` are accepted. Invalid values return `ERR_INVALID_USER_ROLE` (RC 106).
4. **`$UserRoles` module:** Role assignment is delegated to the `$UserRoles` system module which handles bitmask operations atomically and clears user cache.

**Documentation reference:** Full discussion in `docs/admin_user_questions.md`, Q1 (RESOLVED).

---

## 7. Error Codes

All admin-user-related error codes are defined in `platform/definitions/errorcodes.en.js` under the **Admin User (770–779)** range:

| RC | Constant | Message | Used By |
|---|---|---|---|
| 770 | `ERR_ADMIN_USER_NOT_FOUND` | admin user not found | `get_user`, `update_user`, `delete_user`, `reset_password`, `change_password` |
| 771 | `ERR_ADMIN_CANNOT_DELETE_SELF` | cannot delete your own account | `delete_user`, `update_user` (deactivation) |
| 772 | `ERR_ADMIN_CANNOT_EDIT_SELF_ROLE` | cannot change your own role | `update_user` (role change) |

Additionally, the following infrastructure error codes are returned:

| RC | Constant | Used By |
|---|---|---|
| 102 | `ERR_MISSING_API_PARAM` | All endpoints — when a mandatory parameter is missing |
| 103 | `ERR_NO_PRIVILEGES` | All endpoints — when the user lacks required ACL |
| 106 | `ERR_INVALID_USER_ROLE` | `add_user`, `update_user` — invalid role value |
| 201 | `ERR_INVALID_USER_TOKEN` | All endpoints — expired or invalid session token |
| 213 | `ERR_REQ_FIRST_NAME` | `add_user` — first name missing or empty |
| 235 | `ERR_INVALID_EMAIL_ADDRESS` | `add_user`, `update_user` — malformed email |
| 240 | `ERR_USER_EMAIL_ALREADY_EXISTS` | `add_user`, `update_user` — duplicate email |
| 242 | `ERR_PASSWORD_NOT_MEET_CRITERIA` | `add_user`, `reset_password`, `change_password` — weak password |
| 247 | `ERR_INVALID_PASSWORD` | `change_password` — wrong current password |
| 248 | `ERR_NEW_PASSWORD_CANNOT_BE_SAME_AS_CURRENT` | `change_password` — new equals current |

---

## 8. Data Flow Diagrams

### 8.1 Add User with Mandatory Password Change

```
Super Admin → POST AdminUser/add_user
    { first_name, email, password: "MyPass@123", role: 2 }
         │
         ▼
    [1] Validate email, first_name, password criteria
    [2] Check email uniqueness
    [3] Validate role against $Globals.allUserRoles
    [4] $executeAPI("User/add_user") → creates user + user_details
    [5] UPDATE user_details SET USD_PHONE_NUM (if provided)
    [6] $UserRoles.setUserRoles(userId, [role], [], [], [])
    [7] UPDATE user SET USR_PASSWORD="MyPass@123" (plain text)
         │
         ▼
    Response: { rc: 0, user_id: "<hash>" }
         │
         ▼
    New user logs in → not a 64-char hex hash → receives X-token → must change password
```

### 8.2 Delete User with Constraint Checks

```
Super Admin → POST AdminUser/delete_user
    { user_id: "abc123" }
         │
         ▼
    [1] Fetch user → ERR 770 if not found
    [2] Self-deletion check → ERR 771 if own account
    [3] Active admin count check → ERR 771 if last admin
    [4] BEGIN TRANSACTION
    [5] Clear token: UPDATE user SET USR_TOKEN='', USR_DEVICE_ID=NULL
    [6] Soft-delete: UPDATE user_details SET USD_DELETED_ON=now(),
        USD_EMAIL=CONCAT(email, '/DELETED'), USD_PHONE_NUM=CONCAT(phone, '/DELETED')
    [7] COMMIT TRANSACTION
    [8] Invalidate token cache
         │
         ▼
    Response: { rc: 0 }
```

### 8.3 Password Reset Flow

```
Super Admin → POST AdminUser/reset_password
    { user_id: "abc123", password: "NewInit@789" }
         │
         ▼
    [1] Fetch user → ERR 770 if not found
    [2] Validate password criteria → ERR 242 if weak
    [3] Store: USR_PASSWORD = "NewInit@789" (plain text), clear token
    [4] Invalidate token cache
         │
         ▼
    Response: { rc: 0 }
         │
         ▼
    Target user's session immediately terminated
         │
         ▼
    Target user logs in with "NewInit@789" → not a 64-char hex hash → X-token → must change password
```
