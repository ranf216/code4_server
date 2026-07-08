# Officer Module — Specification & SDS Compliance

**Document Version:** 1.0  
**Last Updated:** 2026-07-08  
**Phase:** 2.1  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 4.3  
**Module Files:** `platform/api/officer.js`, `platform/funcs/officer.js`  
**Database Migration:** `db/UpgradeDB.sql` (V 4.2.0)

---

## 1. Module Overview

The Officer module manages **security officers** within the Code4 Axis Security Operations Platform. Officers are the mobile app users (`USER_TYPE_OFFICER`, value `2`) who perform patrols, respond to calls, and interact with the system primarily through the officer mobile application. Management portal users (admins/managers) perform CRUD operations on officers through the web portal.

### 1.1 User Type Managed

All users created by this module have `USR_TYPE = 2` (`USER_TYPE_OFFICER`). Unlike admin users who authenticate via email/password, officers authenticate exclusively via **Phone/OTP** (one-time password sent to their mobile number). This is enforced by setting `USR_LOGIN_AUTHORITY = USER_LOGIN_AUTHORITY_OTP` during officer creation.

### 1.2 File Structure

| File | Purpose |
|---|---|
| `platform/api/officer.js` | API definition — parameter schemas, ACL, documentation hints |
| `platform/funcs/officer.js` | API implementation — all business logic, database interaction, validation |
| `platform/definitions/errorcodes.en.js` | Error code definitions (RC 520–527 for officer) |
| `platform/config/using_api.js` | Module registration (`"officer"` entry) |
| `db/UpgradeDB.sql` | Database migration — creates `officer` and `officer_evaluation` tables |
| `db/triggers_def.js` | Audit trail trigger definitions for `officer` and `officer_evaluation` tables |

### 1.3 Endpoint Summary

| Endpoint | ACL | Description |
|---|---|---|
| `Officer/get_officers` | ADMIN | Get list of all officers with filters, search, and sorting |
| `Officer/get_officer` | ADMIN | Get a single officer's full details including evaluations |
| `Officer/add_officer` | ADMIN | Create a new officer |
| `Officer/update_officer` | ADMIN | Edit officer details, status, community assignment |
| `Officer/delete_officer` | ADMIN | Soft-delete an officer (only if never logged in) |
| `Officer/get_my_details` | OFFICER | Officer retrieves own profile |
| `Officer/update_my_details` | OFFICER | Officer updates own editable details |
| `Officer/get_officers_info` | RESIDENT | Get public details of checked-in officers for the resident's community (SDS 2.8) |
| `Officer/get_officer_evaluations` | ADMIN | Get all evaluations for an officer |
| `Officer/add_officer_evaluation` | ADMIN | Add a new evaluation to an officer |
| `Officer/delete_officer_evaluation` | ADMIN | Soft-delete an evaluation |

### 1.4 Architectural Patterns

The module follows all infrastructure conventions defined in `docs/brain.md`:

- **Module-level helper functions:** `fetchOfficerRecord()` and `mapOfficerRow()` are defined outside the exported class to eliminate code duplication across methods. These private helpers access `$`-globals freely and receive method-specific data as parameters.
- **Standard class export:** `module.exports = class { ... }` with a `constructor(session)` that stores `this.$Session`.
- **Parameter injection:** API parameters are injected as `this.$param_name` properties by the infrastructure dispatcher.
- **Standard response pattern:** All methods return `{...rc, ...vals}` where `rc` is `$ERRS.ERR_SUCCESS` and `vals` contains response data.
- **Early return for validation:** Validation failures return error objects immediately (e.g., `return $ERRS.ERR_OFFICER_NOT_FOUND`).
- **Internal API delegation:** User creation is delegated to the built-in `User/add_user` via `$executeAPI()` to reuse infrastructure login/token/session logic.
- **Dynamic UPDATE building:** `update_officer` and `update_my_details` use the array-based pattern (`updateFields[]` + `updateValues[]`) to construct SQL dynamically based on which parameters were provided.
- **Transaction usage:** Multi-table writes use `$Db.beginTransaction()` / `$Db.commitTransaction()` with rollback on error.
- **No SELECTs inside transactions:** All validation queries (existence checks, uniqueness checks, community validation) execute before `$Db.beginTransaction()`.
- **Soft deletion only:** All deletions use `*_DELETED_ON` timestamp columns with `/DELETED` suffix appended to phone/email for uniqueness release.
- **API response field mapping:** Database column names are never exposed to the client; `mapOfficerRow()` transforms all columns to clean snake_case response fields.

---

## 2. Database Architecture

### 2.1 Multi-Table Design

Officer data spans **three tables** — two provided by the platform infrastructure and one new dedicated table:

```
┌──────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
│       user           │     │     user_details          │     │       officer             │
│ (Authentication)     │◄────┤ (Profile / Status)        │     │ (Officer-specific data)   │
│                      │     │                           │     │                           │
│ USR_ID (PK)          │     │ USD_USR_ID (FK→user)      │     │ OFC_USR_ID (PK, FK→user)  │
│ USR_EMAIL            │     │ USD_FIRST_NAME            │     │ OFC_TITLE                 │
│ USR_PASSWORD         │     │ USD_LAST_NAME             │     │ OFC_DESCRIPTION           │
│ USR_TYPE = 2         │     │ USD_PHONE_NUM             │     │ OFC_ADDRESS               │
│ USR_STATUS           │     │ USD_EMAIL                 │     │ OFC_ROLES (JSON)          │
│ USR_TOKEN            │     │ USD_IMAGE                 │     │ OFC_CERTIFICATION_BADGES  │
│ USR_DEVICE_ID        │     │ USD_COM_ID                │     │ OFC_CREATED_ON            │
│ USR_LOGIN_AUTHORITY  │     │ USD_STATUS                │     │ OFC_LAST_UPDATE           │
│ USR_LAST_LOGIN       │     │ USD_ROLE_ALLOW            │     │ OFC_DELETED_ON            │
│ USR_DELETED_ON       │     │ USD_DELETED_ON            │     └──────────────────────────┘
└──────────────────────┘     └──────────────────────────┘
                                                                ┌──────────────────────────┐
                                                                │   officer_evaluation      │
                                                                │                           │
                                                                │ OFE_ID (PK, AUTO_INC)     │
                                                                │ OFE_OFC_USR_ID (FK→user)  │
                                                                │ OFE_TEXT                  │
                                                                │ OFE_DATE                  │
                                                                │ OFE_EVALUATOR_NAME        │
                                                                │ OFE_CREATED_ON            │
                                                                │ OFE_DELETED_ON            │
                                                                └──────────────────────────┘
```

**Design Rationale:**

1. **`user` table** — Stores authentication credentials (encrypted token, password hash, device ID, login authority). The officer's phone number is synced here from `user_details` via database triggers. This table is the source of truth for login and session validation by `TokenValidator`.

2. **`user_details` table** — Stores profile data (name, phone, email, image, status, community assignment). This is the **primary table for profile updates**. Changes to phone, email, and status here are automatically synced to the `user` table via the `update_user_from_details` BEFORE UPDATE trigger.

3. **`officer` table (NEW)** — Stores officer-specific attributes that do not exist in the generic user schema: title, description, address, roles (JSON array), and certification badges (JSON array). Linked via `OFC_USR_ID` foreign key to `user.USR_ID`.

4. **`officer_evaluation` table (NEW)** — Stores manager-written performance evaluations for officers. Each evaluation contains free-text content, a date, and the evaluator's name (denormalized at write time for historical accuracy). Linked via `OFE_OFC_USR_ID` to the officer's user ID.

### 2.2 `officer` Table Schema

```sql
CREATE TABLE IF NOT EXISTS `officer` (
  `OFC_USR_ID` varchar(128) NOT NULL,
  `OFC_TITLE` varchar(200) NOT NULL DEFAULT '',
  `OFC_DESCRIPTION` text,
  `OFC_ADDRESS` varchar(500) NOT NULL DEFAULT '',
  `OFC_ROLES` json DEFAULT NULL,
  `OFC_CERTIFICATION_BADGES` json DEFAULT NULL,
  `OFC_CREATED_ON` datetime NOT NULL,
  `OFC_LAST_UPDATE` datetime DEFAULT NULL,
  `OFC_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`OFC_USR_ID`),
  CONSTRAINT `FK_OFC_USR_ID` FOREIGN KEY (`OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Column | Type | Description |
|---|---|---|
| `OFC_USR_ID` | varchar(128) | Primary key and foreign key to `user.USR_ID` |
| `OFC_TITLE` | varchar(200) | Officer's job title (e.g., "Senior Patrol Officer") |
| `OFC_DESCRIPTION` | text | Free-text description about the officer |
| `OFC_ADDRESS` | varchar(500) | Officer's physical address |
| `OFC_ROLES` | json | JSON array of role strings (e.g., `["Patrol", "Investigation"]`) |
| `OFC_CERTIFICATION_BADGES` | json | JSON array of badge strings (e.g., `["First Aid", "Armed"]`) |
| `OFC_CREATED_ON` | datetime | Record creation timestamp |
| `OFC_LAST_UPDATE` | datetime | Last modification timestamp |
| `OFC_DELETED_ON` | datetime | Soft-deletion timestamp (`NULL` = active) |

### 2.3 `officer_evaluation` Table Schema

```sql
CREATE TABLE IF NOT EXISTS `officer_evaluation` (
  `OFE_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `OFE_OFC_USR_ID` varchar(128) NOT NULL,
  `OFE_TEXT` text NOT NULL,
  `OFE_DATE` date NOT NULL,
  `OFE_EVALUATOR_NAME` varchar(200) NOT NULL,
  `OFE_CREATED_ON` datetime NOT NULL,
  `OFE_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`OFE_ID`),
  KEY `IX_OFE_OFC_USR_ID` (`OFE_OFC_USR_ID`),
  CONSTRAINT `FK_OFE_OFC_USR_ID` FOREIGN KEY (`OFE_OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Column | Type | Description |
|---|---|---|
| `OFE_ID` | bigint unsigned | Auto-increment primary key |
| `OFE_OFC_USR_ID` | varchar(128) | Foreign key to the officer's user ID |
| `OFE_TEXT` | text | Evaluation content |
| `OFE_DATE` | date | Evaluation date (as specified by the evaluator) |
| `OFE_EVALUATOR_NAME` | varchar(200) | Name of the admin who wrote the evaluation (denormalized) |
| `OFE_CREATED_ON` | datetime | Record creation timestamp |
| `OFE_DELETED_ON` | datetime | Soft-deletion timestamp |

**Design Decision — Denormalized Evaluator Name:**  
The evaluator's name (`OFE_EVALUATOR_NAME`) is stored as a snapshot at write time rather than as a foreign key. This ensures historical accuracy — if the evaluator's name changes or their account is deleted, existing evaluations remain correctly attributed.

### 2.4 Critical Database Trigger: `deny_update_user_details_from_user`

The infrastructure's `user` table has a BEFORE UPDATE trigger that **blocks** direct modification of certain synchronized columns:

- `USR_TYPE`
- `USR_EMAIL`
- `USR_PHONE_NUM`
- `USR_STATUS`
- `USR_ROLE_ALLOW` / `USR_ROLE_DENY`
- `USR_DELETED_ON`

These columns can **only** be updated via the `user_details` table. The `update_user_from_details` trigger on `user_details` then propagates changes to the `user` table with `@skip_user_update = 1` to bypass the protection.

**Impact on Officer Module:**
- Phone number changes go through `user_details.USD_PHONE_NUM` — never directly to `user.USR_PHONE_NUM`
- Status changes (activate/deactivate) go through `user_details.USD_STATUS`
- The `user` table CAN be directly updated for: `USR_TOKEN`, `USR_DEVICE_ID`, `USR_LOGIN_AUTHORITY`, `USR_PASSWORD` (not in the protected list)

---

## 3. Authentication Logic

### 3.1 OTP-Based Authentication

Officers authenticate exclusively via **Phone/OTP**. This is established during officer creation:

1. `User/add_user` is called internally — creates the `user` and `user_details` records with a random throwaway password (via `$Utils.uniqueHash()`).
2. The officer's phone number is set on `user_details.USD_PHONE_NUM` — the trigger syncs it to `user.USR_PHONE_NUM`.
3. `USR_LOGIN_AUTHORITY` is set to `$Const.USER_LOGIN_AUTHORITY_OTP` on the `user` table directly (this column is not trigger-protected).

**Login Flow (handled by infrastructure Two-Factor Auth API):**
1. Officer enters their phone number in the mobile app.
2. Infrastructure sends OTP to the phone via `$Sms` (Twilio).
3. Officer enters the received code.
4. Infrastructure validates the OTP, creates a session token, and returns it to the app.

The officer module does **not** implement login — it only ensures the user record is configured for OTP authentication.

### 3.2 Password Handling

Since officers use OTP, their password field contains a random hash generated at creation time. This password:
- Is never communicated to the officer
- Cannot be used for login (login authority is OTP, not email/password)
- Exists only to satisfy the `NOT NULL` constraint on `USR_PASSWORD`

The infrastructure's `need_change_password` logic (in `platform/funcs/user.js`) has been updated to skip password-expiry checks for non-email-authority users:
```javascript
vals.need_change_password = (user.USR_LOGIN_AUTHORITY == $Const.USER_LOGIN_AUTHORITY_EMAIL && (pwdTooOld || !isHashed));
```

---

## 4. SDS Compliance Verification

### 4.1 Officers List (SDS 4.3.1)

**SDS Requirement:** *"The list is sorted by ABC of the officer's first name. Above the list there is a total number of officers in the table."*

**Implementation:** `get_officers()` returns all officers with default sort `USD_FIRST_NAME ASC` and includes `total_count` in the response. The complete column set specified in SDS 4.3.1 is returned:

| SDS Column | Response Field | Source |
|---|---|---|
| Officer's Full Name | `first_name`, `last_name` | `user_details` |
| Community name | `community_name` | LEFT OUTER JOIN `community` |
| Mobile number | `phone_num` | `user_details` |
| Email | `email` | `user` |
| Address | `address` | `officer` |
| Title | `title` | `officer` |
| Picture | `image_url` | `$Files.SQL` join for URL resolution |
| Description | `description` | `officer` |
| Registration date | `created_on` | `user` |
| Role | `roles` | `officer` (JSON array) |
| Certification badges | `certification_badges` | `officer` (JSON array) |
| Active | `is_active` | Derived from `USR_STATUS === 1` |

### 4.2 Add New Officer (SDS 4.3.2)

**SDS Requirement:** *"An officer is added in Active state and today is the registration date. The new officer is automatically associated with this community."*

**Implementation:** `add_officer()` enforces:
- Mandatory fields: `first_name`, `phone_num`, `community_id`, `title` (all required in API definition)
- Active state: User created with default status `1` (active) via `User/add_user`
- Registration date: `USR_CREATED_ON` set automatically by `User/add_user`
- Community association: `USD_COM_ID` set on `user_details`
- Phone uniqueness: Checked against all non-deleted users before creation
- Email uniqueness: Checked if email is provided
- Community validation: Verifies community exists and is active

**Creation Sequence:**
1. Validate inputs (phone uniqueness, email format/uniqueness, community active)
2. Handle image upload via `$Utils.saveNewImageOrKeepOld()`
3. Call `$executeAPI("User/add_user", ...)` — creates `user` + `user_details` atomically
4. Update `user_details` with phone, image, community ID
5. Set `USR_LOGIN_AUTHORITY = OTP` on `user` table
6. Insert into `officer` table (title, description, address, roles, badges)

### 4.3 Session Termination on Phone Change (SDS 4.3.3)

**SDS Requirement:** *"[Mobile number] is used by the officer to enter his app, therefore if it is changed, the officer must be identified again before login to his app."*

**Implementation in `update_officer()`:**

```
if phone_num is provided AND differs from current:
    → set needsSessionTermination = true

if is_active is explicitly set to false:
    → set needsSessionTermination = true

--- inside transaction ---
UPDATE user_details (phone, email, name, image, community, status)
UPDATE officer (title, description, address, roles, badges)

if needsSessionTermination:
    UPDATE user SET USR_TOKEN='', USR_DEVICE_ID=NULL
--- commit ---

if needsSessionTermination:
    tokenValidator.deleteFromUserCache(userId)
```

**What this achieves:**
1. **Phone change → forced re-authentication:** Clearing `USR_TOKEN` invalidates the officer's current session. The next API call from their app returns `rc: 201` (invalid token), forcing the app to re-enter the login flow. Since their phone number has changed, they must authenticate with the **new** number via OTP.
2. **Cache invalidation:** `deleteFromUserCache()` ensures the token validator's cache (mode 1 or 2) doesn't serve stale session data.
3. **Deactivation → immediate lockout:** Setting status to inactive AND clearing the token ensures the officer cannot continue using the app.

### 4.4 Deletion Constraints (SDS 4.3.4)

**SDS Requirement:** *"The officer can be deleted only if he hasn't logged in to the app yet. Otherwise he can only turn to inactive."*

**Implementation in `delete_officer()`:**

```javascript
// Cannot delete if officer has logged in — must deactivate instead
if (officer.USR_LAST_LOGIN !== null)
{
    return $ERRS.ERR_OFFICER_CANNOT_DELETE;  // RC 526
}
```

**Logic:**
1. Fetch the officer record including `USR_LAST_LOGIN` from the `user` table.
2. If `USR_LAST_LOGIN` is not null, the officer has authenticated at least once → return `ERR_OFFICER_CANNOT_DELETE` (RC 526).
3. If never logged in, proceed with soft-deletion:
   - Clear session tokens (`USR_TOKEN='', USR_DEVICE_ID=NULL`)
   - Soft-delete `user_details` (set `USD_DELETED_ON`, append `/DELETED` to phone and email for uniqueness release)
   - Soft-delete `officer` record (set `OFC_DELETED_ON`)
   - Invalidate token cache

**Rationale for the constraint:** Once an officer has logged in, they may have associated data (calls, shifts, reports, route history). Hard-deleting or fully soft-deleting their profile would orphan those records. Deactivation (setting `is_active: false`) preserves historical data integrity while preventing further app access.

### 4.5 Sort / Filter (SDS 4.3.5)

**SDS Requirement:** *"The manager can sort the table according to each data column... filter according to: Community name, Active/inactive... free search in all the table's columns."*

**Implementation:** `get_officers()` accepts:
- `community_id` — filter by specific community (0 = all)
- `include_inactive` — boolean toggle (default false = active only)
- `search_text` — free-text search across first name, last name, email, phone, and community name
- `sort_by` — validated against whitelist: `first_name`, `last_name`, `community`, `created_on`
- `sort_dir` — `asc` or `desc`

Sort column validation uses a static object mapping to prevent SQL injection:
```javascript
let validSortColumns = {
    "first_name": "USD_FIRST_NAME",
    "last_name": "USD_LAST_NAME",
    "community": "COM_NAME",
    "created_on": "USR_CREATED_ON",
};
```

### 4.6 Officer Evaluations (SDS 4.3.2 / 4.3.3)

**SDS Requirement:** *"A manager can add the officer evaluations. Each evaluation will include: Text, Date, Evaluator name."*

**Implementation:**
- `add_officer_evaluation()` — Accepts `user_id`, `text`, and `date`. The evaluator name is automatically resolved from the current session user's `user_details` record (first name + last name), ensuring attribution accuracy.
- `get_officer_evaluations()` — Returns all non-deleted evaluations for an officer, ordered by date descending.
- `delete_officer_evaluation()` — Soft-deletes by setting `OFE_DELETED_ON`.
- Evaluations are also included inline in the `get_officer()` response under `officer.evaluations[]`.

**Visibility Rule (SDS):** *"This field is visible only for the manager/admin (not to the officer)"* — Enforced via ACL: evaluation endpoints require `$ACL.USER_TYPE_ADMIN`. The officer's `get_my_details` endpoint does NOT include evaluations.

### 4.7 Officer Self-Service (Mobile App)

**`get_my_details`** — Returns the officer's own profile using `this.$Session.userId`. Includes all profile fields, community info, roles, and badges. Does NOT include evaluations.

**`update_my_details`** — Allows the officer to edit their own: first name, last name, email, and address. Officers CANNOT change their phone number (that's admin-only since it affects authentication) or their title/roles/badges/community/status.

### 4.8 Resident-Facing Officers Info (SDS 2.8)

**SDS Requirement:** *"In this screen, the user can see the list of officers currently working in his community and to read about them and their experience. The system will filter the officers list and present only the officers checked in."*

**Implementation in `get_officers_info()`:**

**Purpose:** Provides a read-only list of officers assigned to the requesting resident's community, for display in the resident mobile app's "Officers Information" screen. Only public-facing fields are returned — no private data (phone, email, address, roles) is exposed.

**Logic Flow:**
1. Extract `this.$Session.userId` from the authenticated resident's session token.
2. Query `user_details` to retrieve the resident's `USD_COM_ID` (community assignment). If the resident has no community, return an empty array.
3. Query the `user`, `user_details`, and `officer` tables for active officers (`USR_TYPE = 2`, `USR_STATUS = 1`, `USD_DELETED_ON IS NULL`, `OFC_DELETED_ON IS NULL`) assigned to the same `USD_COM_ID`.
4. Join via `$Files.SQL("USD_IMAGE")` to resolve officer photo URLs.
5. Map results to return only public-facing fields: `user_id`, `first_name`, `last_name`, `title`, `description`, `image_url`.
6. Results are sorted by `USD_FIRST_NAME ASC` (alphabetical by first name, per SDS 2.8.1).

**Checked-In Filter (Pending):**  
SDS 2.8 specifies: *"present only the officers checked in."* The Shift module (Phase 2.3) has not yet been implemented. Once available, a JOIN to the shift/check-in table will be added to filter only officers with an active check-in status. Until then, all active officers in the community are returned as a temporary measure.

**Privacy Boundary:**  
This endpoint deliberately excludes all private officer data:
- ❌ Phone number — private, login credential
- ❌ Email — private
- ❌ Address — private
- ❌ Roles — internal/admin-only
- ❌ Certification badges — internal/admin-only
- ❌ Evaluations — admin-only (SDS: *"visible only for the manager/admin"*)
- ❌ Active status — irrelevant (only active officers are returned)
- ❌ Last login — internal

**ACL:** `$ACL.USER_TYPE_RESIDENT` — only authenticated residents can call this endpoint. Officers and admins use different endpoints for officer data.

---

## 5. Audit Trail

### 5.1 Trigger Definitions

The `db/triggers_def.js` file was updated to include both new tables:

**`officer` table triggers:**
```javascript
{
    name: "officer",
    id: "OFC_USR_ID",
    insert_fields: ["OFC_TITLE", "OFC_DESCRIPTION", "OFC_ADDRESS", "OFC_ROLES", "OFC_CERTIFICATION_BADGES", "OFC_LAST_UPDATE", "OFC_DELETED_ON"],
    update_fields: ["OFC_TITLE", "OFC_DESCRIPTION", "OFC_ADDRESS", "OFC_ROLES", "OFC_CERTIFICATION_BADGES", "OFC_LAST_UPDATE", "OFC_DELETED_ON"],
    log_insert: true,
    log_update: true,
    log_delete: false,
}
```

**`officer_evaluation` table triggers:**
```javascript
{
    name: "officer_evaluation",
    id: "OFE_ID",
    insert_fields: ["OFE_OFC_USR_ID", "OFE_TEXT", "OFE_DATE", "OFE_EVALUATOR_NAME", "OFE_DELETED_ON"],
    update_fields: ["OFE_TEXT", "OFE_DATE", "OFE_EVALUATOR_NAME", "OFE_DELETED_ON"],
    log_insert: true,
    log_update: true,
    log_delete: false,
}
```

These triggers write to the `change_log` table via `sp_insert_change_log`, recording:
- `CLG_TABLE_NAME` — which table was modified
- `CLG_RECORD_ID` — the officer's user ID or evaluation ID
- `CLG_OPERATION` — INSERT or UPDATE
- `CLG_OLD_VALUES` / `CLG_NEW_VALUES` — JSON of changed fields
- `CLG_USER_ID` — who made the change
- `CLG_CREATED_ON` — when

---

## 6. Error Codes

| Code | Constant | Message | When Triggered |
|---|---|---|---|
| 520 | `ERR_OFFICER_NOT_FOUND` | "officer not found" | Officer ID doesn't exist, is not type OFFICER, or is soft-deleted |
| 521 | `ERR_OFFICER_ALREADY_IN_COMMUNITY` | "officer is already assigned to this community" | Reserved for future community assignment logic |
| 522 | `ERR_OFFICER_HAS_ACTIVE_CALLS` | "cannot delete officer with active calls" | Reserved for future call-dependency checks |
| 523 | `ERR_OFFICER_HAS_ACTIVE_SHIFTS` | "cannot delete officer with active shifts" | Reserved for future shift-dependency checks |
| 524 | `ERR_OFFICER_NOT_IN_COMMUNITY` | "officer is not assigned to this community" | Reserved for future community operations |
| 525 | `ERR_OFFICER_NOT_ON_DUTY` | "officer is not on duty" | Reserved for future shift/duty checks |
| 526 | `ERR_OFFICER_CANNOT_DELETE` | "officer has logged in and cannot be deleted, only deactivated" | `delete_officer` when `USR_LAST_LOGIN` is not null |
| 527 | `ERR_OFFICER_EVALUATION_NOT_FOUND` | "officer evaluation not found" | `delete_officer_evaluation` when evaluation ID doesn't exist or is already deleted |

Additionally, the module uses these infrastructure error codes:
- `224` — `ERR_INVALID_PHONE_NUMBER`
- `235` — `ERR_INVALID_EMAIL_ADDRESS`
- `240` — `ERR_USER_EMAIL_ALREADY_EXISTS`
- `241` — `ERR_USER_PHONE_ALREADY_EXISTS`
- `504` — `ERR_COMMUNITY_NOT_FOUND`
- `505` — `ERR_COMMUNITY_IS_NOT_ACTIVE`

---

## 7. Query Patterns

### 7.1 Officer Fetch (Shared Helper)

The `fetchOfficerRecord()` helper performs a 3-table join to validate that a user exists as an active officer:

```sql
SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
       USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_IMAGE, USD_COM_ID,
       OFC_TITLE, OFC_DESCRIPTION, OFC_ADDRESS, OFC_ROLES, OFC_CERTIFICATION_BADGES
FROM `user`
    JOIN `user_details` ON USR_ID = USD_USR_ID
    JOIN `officer` ON USR_ID = OFC_USR_ID
WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL
```

This single query validates:
- User exists in `user` table
- User type is OFFICER
- User is not soft-deleted (via `user_details`)
- Officer record is not soft-deleted

### 7.2 List Query with Dynamic Filters

The `get_officers()` list query uses dynamic WHERE clause construction:

```sql
SELECT ... FROM `user`
    JOIN `user_details` ON USR_ID = USD_USR_ID
    JOIN `officer` ON USR_ID = OFC_USR_ID
    LEFT OUTER JOIN `file` ON USD_IMAGE = FIL_NAME
    LEFT OUTER JOIN `community` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
WHERE USR_TYPE=? AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL
    [AND USD_COM_ID=?]           -- if community_id > 0
    [AND USR_STATUS = 1]         -- if !include_inactive
    [AND (LIKE search across 5 columns)]  -- if search_text provided
ORDER BY ${validSortColumns[sort_by]} ${direction}
```

### 7.3 Image Resolution

Officer profile images use the `$Files.SQL` helper class for file table joins:
```javascript
let filesSql = new $Files.SQL("USD_IMAGE");
// In SELECT: ${filesSql.select()}
// In FROM: ${filesSql.join()}
// In mapping: $Files.getUrl(filesSql.get(row))
```

This resolves the stored filename to a full URL using the file management infrastructure.

---

## 8. Data Flow Diagrams

### 8.1 Add Officer Flow

```
Admin Portal                     Server                          Database
    │                              │                               │
    │ POST add_officer             │                               │
    │─────────────────────────────►│                               │
    │                              │ Validate phone uniqueness     │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ Validate community active     │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ Save image (if provided)      │
    │                              │                               │
    │                              │ $executeAPI("User/add_user")  │
    │                              │──────────────────────────────►│ INSERT user
    │                              │                               │ INSERT user_details
    │                              │◄──────────────────────────────│
    │                              │ UPDATE user_details            │
    │                              │  (phone, image, community)    │
    │                              │──────────────────────────────►│ TRIGGER: sync phone→user
    │                              │◄──────────────────────────────│
    │                              │ UPDATE user                    │
    │                              │  (login_authority = OTP)       │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ INSERT officer                 │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │ {rc:0, user_id: "..."}      │                               │
    │◄─────────────────────────────│                               │
```

### 8.2 Phone Change → Session Termination Flow

```
Admin Portal                     Server                          Database
    │                              │                               │
    │ POST update_officer          │                               │
    │  {phone_num: "new_number"}   │                               │
    │─────────────────────────────►│                               │
    │                              │ Fetch officer record          │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ Detect phone changed          │
    │                              │ → needsSessionTermination=true│
    │                              │                               │
    │                              │ BEGIN TRANSACTION             │
    │                              │ UPDATE user_details phone     │
    │                              │──────────────────────────────►│ TRIGGER: sync phone→user
    │                              │ UPDATE user: clear token      │
    │                              │──────────────────────────────►│
    │                              │ COMMIT                        │
    │                              │                               │
    │                              │ Invalidate token cache        │
    │ {rc:0}                       │                               │
    │◄─────────────────────────────│                               │
    │                              │                               │
    │                              │  ┌─────── Officer App ───────┐│
    │                              │  │ Next API call with old     ││
    │                              │  │ token → rc:201 (invalid)   ││
    │                              │  │ → Redirect to OTP login    ││
    │                              │  └───────────────────────────┘│
```
