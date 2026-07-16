# Resident Module — Specification & SDS Compliance

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Phase:** 2.2  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Sections 2.7, 3.10, 4.2.3  
**Module Files:** `platform/api/resident.js`, `platform/funcs/resident.js`  
**Database Migration:** `db/UpgradeDB.sql` (V 4.3.0)

---

## 1. Module Overview

The Resident module manages **residential users (clients)** within the Code4 Axis Security Operations Platform. Residents are community members who use the mobile application to request security services, create emergency calls, and interact with officers. Management portal users (admins/managers) perform CRUD operations on residents through the web portal.

### 1.1 User Type Managed

All users created by this module have `USR_TYPE = 3` (`USER_TYPE_RESIDENT`). Unlike admin users who authenticate via email/password, residents authenticate exclusively via **Phone/OTP** (one-time password sent to their mobile number). This is enforced by setting `USR_LOGIN_AUTHORITY = USER_LOGIN_AUTHORITY_OTP` (value `6`) during resident creation.

### 1.2 File Structure

| File | Purpose |
|---|---|
| `platform/api/resident.js` | API definition — parameter schemas, ACL, documentation hints |
| `platform/funcs/resident.js` | API implementation — all business logic, database interaction, validation |
| `platform/definitions/errorcodes.en.js` | Error code definitions (RC 540–543 for resident) |
| `platform/config/using_api.js` | Module registration (`"resident"` entry) |
| `db/UpgradeDB.sql` | Database migration — creates `resident` table |
| `db/triggers_def.js` | Audit trail trigger definitions for `resident` table |

### 1.3 Endpoint Summary

| Endpoint | ACL | Description |
|---|---|---|
| `Resident/get_residents` | ADMIN | Get list of all residents with filters, search, and sorting |
| `Resident/get_resident` | ADMIN | Get a single resident's full details |
| `Resident/add_resident` | ADMIN | Create a new resident |
| `Resident/update_resident` | ADMIN | Edit resident details, status, community assignment, images |
| `Resident/delete_resident` | ADMIN | Soft-delete a resident (only if never logged in) |
| `Resident/get_my_details` | RESIDENT | Resident retrieves own profile |
| `Resident/update_my_details` | RESIDENT | Resident updates own editable details |
| `Resident/search_residents` | OFFICER | Officer searches residents within their community |

### 1.4 Architectural Patterns

The module follows all infrastructure conventions defined in `docs/brain.md`:

- **Module-level helper functions:** `fetchResidentRecord()`, `mapResidentRow()`, `parseImagesArray()`, and `resolveImagesList()` are defined outside the exported class to eliminate code duplication across methods. These private helpers access `$`-globals freely and receive method-specific data as parameters.
- **Standard class export:** `module.exports = class { ... }` with a `constructor(session)` that stores `this.$Session`.
- **Parameter injection:** API parameters are injected as `this.$param_name` properties by the infrastructure dispatcher.
- **Standard response pattern:** All methods return `{...rc, ...vals}` where `rc` is `$ERRS.ERR_SUCCESS` and `vals` contains response data.
- **Early return for validation:** Validation failures return error objects immediately (e.g., `return $ERRS.ERR_RESIDENT_NOT_FOUND`).
- **Internal API delegation:** User creation is delegated to the built-in `User/add_user` via `$executeAPI()` to reuse infrastructure login/token/session logic.
- **Dynamic UPDATE building:** `update_resident` and `update_my_details` use the array-based pattern (`updateFields[]` + `updateValues[]`) to construct SQL dynamically based on which parameters were provided.
- **Transaction usage:** Multi-table writes use `$Db.beginTransaction()` / `$Db.commitTransaction()` with rollback on error.
- **No SELECTs inside transactions:** All validation queries (existence checks, uniqueness checks, community validation, image resolution) execute before `$Db.beginTransaction()`.
- **Soft deletion only:** All deletions use `*_DELETED_ON` timestamp columns with `/DELETED` suffix appended to phone/email for uniqueness release.
- **API response field mapping:** Database column names are never exposed to the client; `mapResidentRow()` transforms all columns to clean snake_case response fields.
- **File-based image management:** Property images are stored as a JSON array of file names in `RES_IMAGES`. Images are uploaded separately via the File API and referenced by file ID. Old images are never deleted from storage — only removed from the JSON array (infrastructure rule: never delete files).

### 1.5 Key Differences from Officer Module

| Aspect | Officer | Resident |
|---|---|---|
| User type | `USER_TYPE_OFFICER` (2) | `USER_TYPE_RESIDENT` (3) |
| Profile image | Single image via `USD_IMAGE` | No profile image; property images via `RES_IMAGES` JSON array |
| Image handling | `$Utils.saveNewImageOrKeepOld()` (base64 inline) | File API + `new_image_ids` / `keep_images` pattern |
| Domain-specific table | `officer` (title, roles, badges) | `resident` (address, vehicles, instructions, images) |
| Self-editable fields | Name, email, address | Name, email, address, instructions, images |
| Officer-facing endpoint | N/A | `search_residents` (community-scoped) |
| Resident-facing endpoint | `get_officers_info` | N/A |
| Evaluations | Yes (admin-only) | No |

---

## 2. Database Architecture

### 2.1 Multi-Table Design

Resident data spans **three tables** — two provided by the platform infrastructure and one new dedicated table:

```
┌──────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
│       user           │     │     user_details          │     │       resident            │
│ (Authentication)     │◄────┤ (Profile / Status)        │     │ (Resident-specific data)  │
│                      │     │                           │     │                           │
│ USR_ID (PK)          │     │ USD_USR_ID (FK→user)      │     │ RES_USR_ID (PK, FK→user)  │
│ USR_EMAIL            │     │ USD_FIRST_NAME            │     │ RES_ADDRESS               │
│ USR_PASSWORD         │     │ USD_LAST_NAME             │     │ RES_VEHICLES (JSON)       │
│ USR_TYPE = 3         │     │ USD_PHONE_NUM             │     │ RES_INSTRUCTIONS          │
│ USR_STATUS           │     │ USD_EMAIL                 │     │ RES_IMAGES (JSON)         │
│ USR_TOKEN            │     │ USD_IMAGE (NOT USED)      │     │ RES_COMMUNICATION_TEST    │
│ USR_DEVICE_ID        │     │ USD_COM_ID                │     │ RES_CREATED_ON            │
│ USR_LOGIN_AUTHORITY  │     │ USD_STATUS                │     │ RES_LAST_UPDATE           │
│ USR_LAST_LOGIN       │     │ USD_ROLE_ALLOW            │     │ RES_DELETED_ON            │
│ USR_DELETED_ON       │     │ USD_DELETED_ON            │     └──────────────────────────┘
└──────────────────────┘     └──────────────────────────┘
```

**Design Rationale:**

1. **`user` table** — Stores authentication credentials (encrypted token, password hash, device ID, login authority). The resident's phone number is synced here from `user_details` via database triggers. This table is the source of truth for login and session validation by `TokenValidator`.

2. **`user_details` table** — Stores profile data (name, phone, email, status, community assignment). This is the **primary table for profile updates**. Changes to phone, email, and status here are automatically synced to the `user` table via the `update_user_from_details` BEFORE UPDATE trigger.

3. **`resident` table (NEW)** — Stores resident-specific attributes that do not exist in the generic user schema: property address, vehicle license plates (JSON array), special instructions for officers, property images (JSON array of file names), and communication test flag. Linked via `RES_USR_ID` foreign key to `user.USR_ID`.

**Critical Note — `USD_IMAGE` Not Used for Residents:**  
The `user_details.USD_IMAGE` column exists in the platform infrastructure but is explicitly **not used** by the Resident module. Residents do not have profile images. Instead, they have **property images** (photos of their home/property for officer reference) stored in `RES_IMAGES` as a JSON array. This was a resolved architectural decision (see `docs/resident_module_questions.md`, Q2).

### 2.2 `resident` Table Schema

```sql
CREATE TABLE IF NOT EXISTS `resident` (
  `RES_USR_ID` varchar(128) NOT NULL,
  `RES_ADDRESS` varchar(500) NOT NULL DEFAULT '',
  `RES_VEHICLES` json DEFAULT NULL,
  `RES_INSTRUCTIONS` text,
  `RES_IMAGES` json DEFAULT NULL,
  `RES_COMMUNICATION_TEST` tinyint unsigned NOT NULL DEFAULT '0',
  `RES_CREATED_ON` datetime NOT NULL,
  `RES_LAST_UPDATE` datetime DEFAULT NULL,
  `RES_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RES_USR_ID`),
  CONSTRAINT `FK_RES_USR_ID` FOREIGN KEY (`RES_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Column | Type | Description |
|---|---|---|
| `RES_USR_ID` | varchar(128) | Primary key and foreign key to `user.USR_ID` |
| `RES_ADDRESS` | varchar(500) | Resident's property address |
| `RES_VEHICLES` | json | JSON array of vehicle license plate strings (e.g., `["ABC123", "XYZ789"]`) |
| `RES_INSTRUCTIONS` | text | Special instructions for officers (e.g., "Ring doorbell twice", "Dog in backyard") |
| `RES_IMAGES` | json | JSON array of file name strings from the `file` table (not URLs — resolved at read time) |
| `RES_COMMUNICATION_TEST` | tinyint unsigned | Flag: `0` = normal, `1` = communication test enabled |
| `RES_CREATED_ON` | datetime | Record creation timestamp |
| `RES_LAST_UPDATE` | datetime | Last modification timestamp |
| `RES_DELETED_ON` | datetime | Soft-deletion timestamp (`NULL` = active) |

### 2.3 Critical Database Trigger: `deny_update_user_details_from_user`

The infrastructure's `user` table has a BEFORE UPDATE trigger that **blocks** direct modification of certain synchronized columns:

- `USR_TYPE`
- `USR_EMAIL`
- `USR_PHONE_NUM`
- `USR_STATUS`
- `USR_ROLE_ALLOW` / `USR_ROLE_DENY`
- `USR_DELETED_ON`

These columns can **only** be updated via the `user_details` table. The `update_user_from_details` trigger on `user_details` then propagates changes to the `user` table with `@skip_user_update = 1` to bypass the protection.

**Impact on Resident Module:**
- Phone number changes go through `user_details.USD_PHONE_NUM` — never directly to `user.USR_PHONE_NUM`
- Status changes (activate/deactivate) go through `user_details.USD_STATUS`
- The `user` table CAN be directly updated for: `USR_TOKEN`, `USR_DEVICE_ID`, `USR_LOGIN_AUTHORITY`, `USR_PASSWORD` (not in the protected list)

---

## 3. Authentication Logic

### 3.1 OTP-Based Authentication

Residents authenticate exclusively via **Phone/OTP**. This is established during resident creation:

1. `User/add_user` is called internally — creates the `user` and `user_details` records with a random throwaway password (via `$Utils.uniqueHash()`).
2. The resident's phone number is set on `user_details.USD_PHONE_NUM` — the trigger syncs it to `user.USR_PHONE_NUM`.
3. `USR_LOGIN_AUTHORITY` is set to `$Const.USER_LOGIN_AUTHORITY_OTP` (value `6`) on the `user` table directly (this column is not trigger-protected).

**Login Flow (handled by infrastructure Two-Factor Auth API):**
1. Resident enters their phone number in the mobile app.
2. Infrastructure sends OTP to the phone via `$Sms` (Twilio).
3. Resident enters the received code.
4. Infrastructure validates the OTP, creates a session token, and returns it to the app.

The resident module does **not** implement login — it only ensures the user record is configured for OTP authentication.

### 3.2 Password Handling

Since residents use OTP, their password field contains a random hash generated at creation time. This password:
- Is never communicated to the resident
- Cannot be used for login (login authority is OTP, not email/password)
- Exists only to satisfy the `NOT NULL` constraint on `USR_PASSWORD`

The infrastructure's `need_change_password` logic (in `platform/funcs/user.js`) skips password-expiry checks for non-email-authority users:
```javascript
vals.need_change_password = (user.USR_LOGIN_AUTHORITY == $Const.USER_LOGIN_AUTHORITY_EMAIL && (pwdTooOld || !isHashed));
```

---

## 4. SDS Compliance Verification

### 4.1 Residents List (SDS 4.2.3)

**SDS Requirement:** *"The list is sorted by ABC of the resident's first name. Above the list there is a total number of residents in the table."*

**Implementation:** `get_residents()` returns all residents with default sort `USD_FIRST_NAME ASC` and includes `total_count` in the response. The complete column set specified in SDS 4.2.3 is returned:

| SDS Column | Response Field | Source |
|---|---|---|
| Resident's Full Name | `first_name`, `last_name` | `user_details` |
| Community name | `community_name` | LEFT OUTER JOIN `community` |
| Mobile number | `phone_num` | `user_details` |
| Email | `email` | `user` |
| Address | `address` | `resident` |
| Vehicle numbers | `vehicles` | `resident` (JSON array) |
| Special Instructions | `instructions` | `resident` |
| Property Images | `images` | `resident` (JSON → URLs via `$Files.getUrl()`) |
| Communication Test | `communication_test` | `resident` |
| Registration date | `created_on` | `user` |
| Active | `is_active` | Derived from `USR_STATUS === 1` |
| Last Login | `last_login` | `user` |

### 4.2 Add New Resident (SDS 2.7.1)

**SDS Requirement:** *"A resident is added in Active state and today is the registration date. The new resident is automatically associated with this community."*

**Implementation:** `add_resident()` enforces:
- Mandatory fields: `first_name`, `phone_num`, `community_id` (all required in API definition)
- Active state: User created with default status `1` (active) via `User/add_user`
- Registration date: `USR_CREATED_ON` set automatically by `User/add_user`
- Community association: `USD_COM_ID` set on `user_details`
- Phone uniqueness: Checked against all non-deleted users before creation
- Email uniqueness: Checked if email is provided
- Community validation: Verifies community exists and is active

**Creation Sequence:**
1. Validate inputs (phone format, phone uniqueness, email format/uniqueness, community active)
2. Call `$executeAPI("User/add_user", ...)` — creates `user` + `user_details` atomically
3. Begin transaction
4. Update `user_details` with phone number and community ID
5. Set `USR_LOGIN_AUTHORITY = OTP` on `user` table
6. Insert into `resident` table (address, vehicles, instructions, communication_test)
7. Commit transaction

**Note — No Images at Creation:**  
The `add_resident` endpoint does NOT accept image parameters. Images are added afterward via `update_resident` using the File API upload flow. This separates concerns: user creation is a single atomic operation; image management is a subsequent operation with its own validation.

### 4.3 Partial Update Parameter Strategy

Both `update_resident` and `update_my_details` implement partial (PATCH-like) update semantics: only fields explicitly included in the request are modified; omitted fields retain their current database values.

**Implementation:** Optional parameters that should preserve existing values when omitted use `/null/` as their default in the API definition (`platform/api/resident.js`). This causes the infrastructure to inject `null` when the client does not send the field. The implementation then checks each field with `$Utils.isset()` — which returns `false` for `null` — skipping the update for that column.

**Affected parameters in `update_resident`:**
| Parameter | Definition | Behavior when omitted |
|---|---|---|
| `last_name` | `o:s:/null/` | Preserves current last name |
| `address` | `o:s:/null/` | Preserves current address |
| `vehicles` | `o:a:/null/` | Preserves current vehicles array |
| `instructions` | `o:s:/null/` | Preserves current instructions |
| `new_image_ids` | `o:a:/null/` | Preserves current images (no image change) |
| `keep_images` | `o:a:/null/` | Preserves current images (no image change) |
| `communication_test` | `o:b:/null/` | Preserves current flag value |
| `is_active` | `o:b:/null/` | Preserves current active status |

**Affected parameters in `update_my_details`:**
| Parameter | Definition | Behavior when omitted |
|---|---|---|
| `last_name` | `o:s:/null/` | Preserves current last name |
| `address` | `o:s:/null/` | Preserves current address |
| `instructions` | `o:s:/null/` | Preserves current instructions |
| `new_image_ids` | `o:a:/null/` | Preserves current images (no image change) |
| `keep_images` | `o:a:/null/` | Preserves current images (no image change) |

**Contrast with clearable fields:** Parameters using `o:s:` (empty string default) or `o:i:0` (zero default) — such as `first_name`, `phone_num`, `email`, `community_id` — are treated as "always present" by `$Utils.isset()` when sent, but these are fields that require explicit validation (phone uniqueness, email format) and are only processed when non-empty via `$Utils.empty()` checks in the implementation.

### 4.4 Session Termination on Phone Change (SDS 2.7.1)

**SDS Requirement:** Mirrors the officer pattern — the mobile number is the resident's login credential. Changing it requires re-identification.

**Implementation in `update_resident()`:**

```
if phone_num is provided AND differs from current:
    → set needsSessionTermination = true

if is_active is explicitly set to false:
    → set needsSessionTermination = true

--- inside transaction ---
UPDATE user_details (phone, email, name, community, status)
UPDATE resident (address, vehicles, instructions, images, communication_test)

if needsSessionTermination:
    UPDATE user SET USR_TOKEN='', USR_DEVICE_ID=NULL
--- commit ---

if needsSessionTermination:
    tokenValidator.deleteFromUserCache(userId)
```

**What this achieves:**
1. **Phone change → forced re-authentication:** Clearing `USR_TOKEN` invalidates the resident's current session. The next API call from their app returns `rc: 201` (invalid token), forcing the app to re-enter the login flow. Since their phone number has changed, they must authenticate with the **new** number via OTP.
2. **Cache invalidation:** `deleteFromUserCache()` ensures the token validator's cache doesn't serve stale session data.
3. **Deactivation → immediate lockout:** Setting status to inactive AND clearing the token ensures the resident cannot continue using the app.

### 4.5 Deletion Constraints (SDS 2.7.1)

**SDS Requirement:** Mirrors the officer deletion pattern — residents who have used the app cannot be hard-deleted.

**Implementation in `delete_resident()`:**

```javascript
// Cannot delete if resident has logged in — must deactivate instead
if (resident.USR_LAST_LOGIN !== null)
{
    return $ERRS.ERR_RESIDENT_CANNOT_DELETE;  // RC 543
}
```

**Logic:**
1. Fetch the resident record including `USR_LAST_LOGIN` from the `user` table.
2. If `USR_LAST_LOGIN` is not null, the resident has authenticated at least once → return `ERR_RESIDENT_CANNOT_DELETE` (RC 543).
3. If never logged in, proceed with soft-deletion:
   - Clear session tokens (`USR_TOKEN='', USR_DEVICE_ID=NULL`)
   - Soft-delete `user_details` (set `USD_DELETED_ON`, append `/DELETED` to phone and email for uniqueness release)
   - Soft-delete `resident` record (set `RES_DELETED_ON`)
   - Invalidate token cache

**Rationale for the constraint:** Once a resident has logged in, they may have associated data (calls, check-ins, communication history). Hard-deleting or fully soft-deleting their profile would orphan those records. Deactivation (setting `is_active: false`) preserves historical data integrity while preventing further app access.

**Future Enhancement (Phase 3):** Once the Call module is implemented, `delete_resident` will additionally check for ANY call history (past or present). If the resident has even a single call record, deletion will be blocked regardless of login status. The code has TODO placeholders for this check.

### 4.6 Sort / Filter (SDS 4.2.3)

**SDS Requirement:** *"The manager can sort the table according to each data column... filter according to: Community name, Active/inactive... free search in all the table's columns."*

**Implementation:** `get_residents()` accepts:
- `community_id` — filter by specific community (0 = all)
- `include_inactive` — boolean toggle (default false = active only)
- `search_text` — free-text search across first name, last name, email, phone, address, and community name
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

### 4.7 Resident Self-Service — Edit Constraints (SDS 2.7)

**SDS Requirement:** Residents can update certain profile fields from the mobile app, but core administrative fields are locked.

**Implementation in `update_my_details()`:**

The API definition (`platform/api/resident.js`) restricts the accepted parameters for the `update_my_details` endpoint to:

| Allowed Field | Parameter | Rationale |
|---|---|---|
| First name | `first_name` | Self-service |
| Last name | `last_name` | Self-service |
| Address | `address` | Resident knows their own address |
| Email | `email` | Self-service |
| Instructions | `instructions` | Resident provides context for officers |
| Property images | `new_image_ids`, `keep_images` | Resident photographs own property |

**Explicitly Excluded (Admin-Only) Fields:**
| Field | Why Admin-Only |
|---|---|
| Phone number | Login credential — changing it requires admin oversight and triggers re-auth |
| Community | Administrative assignment — residents cannot switch communities |
| Vehicles | Admin-managed field per SDS 2.7.1 |
| Communication test | Administrative flag |
| Active status | Administrative control |

**Enforcement mechanism:** The infrastructure API dispatcher rejects any parameters not defined in the API schema. If a resident sends `phone_num` or `community_id`, the parameter is simply not injected into `this.$param_name` — it is silently ignored. The endpoint never sees or processes fields outside its defined schema.

### 4.8 Property Images — Architecture (Resolved Decision Q2)

**Resolved Decision (`docs/resident_module_questions.md`, Q2):**
- (a) Residents do NOT have profile images (`USD_IMAGE` is not used for residents).
- (b) Admin CAN view and edit property images via `update_resident`.
- Both the resident (`update_my_details`) and admin (`update_resident`) can manage property images.

**Storage Format:**  
`RES_IMAGES` stores a JSON array of file **names** (not URLs, not file IDs):
```json
["abc123_photo1.jpg", "def456_photo2.png"]
```

**Resolution at Read Time:**  
The `parseImagesArray()` helper resolves file names to full URLs:
```javascript
function parseImagesArray(imagesArr)
{
    if (!imagesArr || imagesArr.length === 0)
    {
        return [];
    }
    return imagesArr.map(name => $Files.getUrl({file_name: name})).filter(url => url);
}
```

This returns public-accessible URLs like `https://domain/files/n/abc123_photo1.jpg` to the client.

**Update Flow (File API + `new_image_ids` / `keep_images`):**

1. Client uploads images via `File/upload_file_base64` (or multipart upload) → receives `file_id` for each.
2. Client calls `update_resident` or `update_my_details` with:
   - `new_image_ids`: array of file IDs from step 1
   - `keep_images`: array of URLs of existing images to retain
3. Server resolves via `resolveImagesList()`:
   - `keep_images` URLs → extract file names via `$Files.getFileNameFromUrl()`
   - `new_image_ids` → batch lookup in `file` table to get `FIL_FILE_NAME`
   - If any `new_image_ids` don't exist → return `ERR_FILE_NOT_FOUND` (RC 321)
4. Final `RES_IMAGES` = concatenation of kept file names + new file names
5. If both arrays are empty → `RES_IMAGES` is set to `null` (clears all images)
6. If neither parameter is provided → images are unchanged (no-op)

**Infrastructure Rule — Never Delete Files:**  
When images are removed from the `RES_IMAGES` array (by not including them in `keep_images`), the actual file records in the `file` table and the physical files on storage are **never deleted**. Only the reference is removed from the JSON array. This adheres to the platform's data retention policy.

**No Server-Side Image Count Limit:**  
Per resolved decision (Q3 extrapolation), there is no server-enforced maximum on the number of property images. The client application controls the limit (currently 10 in the mobile app UI). This keeps the backend flexible for future requirements.

### 4.9 Search Residents — Officer Endpoint (SDS 3.10)

**SDS Requirement (Section 3.10):** *"The officer can search for residents by name, license plate, or address in their assigned community."*

**Implementation in `search_residents()`:**

**Security Boundary — Community Scoping:**
1. Extract `this.$Session.userId` from the authenticated officer's session token.
2. Query `user_details` to retrieve the officer's `USD_COM_ID` (community assignment).
3. If the officer has no community → return empty `residents` array (not an error).
4. Use the officer's community ID as a **mandatory** filter in the search query.

**Search Logic:**
```sql
WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_COM_ID=?
  AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL
  AND (USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ? OR RES_ADDRESS LIKE ? OR RES_VEHICLES LIKE ?)
ORDER BY USD_FIRST_NAME ASC
```

**Key Design Decisions:**
- The officer does NOT send a `community_id` parameter — it is automatically extracted from their session. This prevents any possibility of an officer querying residents outside their assigned area.
- Only active residents are returned (`USR_STATUS=1`).
- Vehicle search uses `LIKE` on the JSON column — MySQL performs a text match against the serialized JSON string, which naturally matches partial license plate fragments.
- Results return a minimal field set (user_id, name, phone, address, vehicles) — no images, email, or other sensitive data.

### 4.10 Community Re-Assignment (Resolved Decision Q1)

**Resolved Decision (`docs/resident_module_questions.md`, Q1):**  
Residents CANNOT change their own community from the mobile app. Only admin can reassign via `update_resident` with `community_id`.

**Implementation:**
- `update_my_details` API definition does NOT include `community_id` as a parameter.
- `update_resident` validates the new community (exists + active) and checks it differs from current.
- If `community_id` matches the resident's current community → returns `ERR_RESIDENT_ALREADY_EXISTS` (RC 542) to prevent no-op reassignment.

### 4.11 Vehicles — No Server-Side Limit (Resolved Decision Q3)

**Resolved Decision (`docs/resident_module_questions.md`, Q3):**  
No server-side maximum on vehicle count. Store as JSON array, no count enforcement.

**Implementation:**
- `RES_VEHICLES` is a JSON column accepting any array of strings.
- `add_resident` and `update_resident` both accept `vehicles` as an array parameter.
- Serialized via `JSON.stringify()` before storage; `null` stored if empty array.
- `update_my_details` does NOT accept `vehicles` — vehicle management is admin-only.

---

## 5. Audit Trail

### 5.1 Trigger Definitions

The `db/triggers_def.js` file includes the `resident` table:

**`resident` table triggers:**
```javascript
{
    name: "resident",
    id: "RES_USR_ID",
    insert_fields: ["RES_ADDRESS", "RES_VEHICLES", "RES_INSTRUCTIONS", "RES_IMAGES", "RES_COMMUNICATION_TEST", "RES_LAST_UPDATE", "RES_DELETED_ON"],
    update_fields: ["RES_ADDRESS", "RES_VEHICLES", "RES_INSTRUCTIONS", "RES_IMAGES", "RES_COMMUNICATION_TEST", "RES_LAST_UPDATE", "RES_DELETED_ON"],
    log_insert: true,
    log_update: true,
    log_delete: false,
}
```

These triggers write to the `change_log` table via `sp_insert_change_log`, recording:
- `CLG_TABLE_NAME` — "resident"
- `CLG_RECORD_ID` — the resident's user ID
- `CLG_OPERATION` — INSERT or UPDATE
- `CLG_OLD_VALUES` / `CLG_NEW_VALUES` — JSON of changed fields
- `CLG_USER_ID` — who made the change
- `CLG_CREATED_ON` — when

---

## 6. Error Codes

| Code | Constant | Message | When Triggered |
|---|---|---|---|
| 540 | `ERR_RESIDENT_NOT_FOUND` | "resident not found" | Resident ID doesn't exist, is not type RESIDENT, or is soft-deleted |
| 541 | `ERR_RESIDENT_HAS_ACTIVE_CALLS` | "cannot modify resident with active calls" | Reserved for Phase 3 — Call module dependency checks |
| 542 | `ERR_RESIDENT_ALREADY_EXISTS` | "resident already exists in this community" | `update_resident` when target `community_id` matches resident's current community |
| 543 | `ERR_RESIDENT_CANNOT_DELETE` | "resident has activity and cannot be deleted, only deactivated" | `delete_resident` when `USR_LAST_LOGIN` is not null |

Additionally, the module uses these infrastructure error codes:
- `224` — `ERR_INVALID_PHONE_NUMBER`
- `235` — `ERR_INVALID_EMAIL_ADDRESS`
- `240` — `ERR_USER_EMAIL_ALREADY_EXISTS`
- `241` — `ERR_USER_PHONE_ALREADY_EXISTS`
- `321` — `ERR_FILE_NOT_FOUND` (invalid `new_image_ids`)
- `500` — `ERR_COMMUNITY_NOT_FOUND`
- `505` — `ERR_COMMUNITY_IS_NOT_ACTIVE`

---

## 7. Query Patterns

### 7.1 Resident Fetch (Shared Helper)

The `fetchResidentRecord()` helper performs a 3-table join to validate that a user exists as an active resident:

```sql
SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
       USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_COM_ID,
       RES_ADDRESS, RES_VEHICLES, RES_INSTRUCTIONS, RES_IMAGES, RES_COMMUNICATION_TEST
FROM `user`
    JOIN `user_details` ON USR_ID = USD_USR_ID
    JOIN `resident` ON USR_ID = RES_USR_ID
WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL
```

This single query validates:
- User exists in `user` table
- User type is RESIDENT
- User is not soft-deleted (via `user_details`)
- Resident record is not soft-deleted

### 7.2 List Query with Dynamic Filters

The `get_residents()` list query uses dynamic WHERE clause construction:

```sql
SELECT ... FROM `user`
    JOIN `user_details` ON USR_ID = USD_USR_ID
    JOIN `resident` ON USR_ID = RES_USR_ID
    LEFT OUTER JOIN `community` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
WHERE USR_TYPE=? AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL
    [AND USD_COM_ID=?]           -- if community_id > 0
    [AND USR_STATUS = 1]         -- if !include_inactive
    [AND (LIKE search across 6 columns)]  -- if search_text provided
ORDER BY ${validSortColumns[sort_by]} ${direction}
```

### 7.3 Image Resolution

Resident property images use the custom `parseImagesArray()` / `resolveImagesList()` helpers rather than the officer's `$Files.SQL` join pattern. This is because:
1. Residents have **multiple** images (array), not a single image reference.
2. Images are stored as a JSON array of file names in `RES_IMAGES`, not a single foreign key.
3. Resolution happens in JavaScript after the query, using `$Files.getUrl()` per file name.

This approach avoids complex JSON-to-JOIN transformations in SQL and keeps the query simple.

---

## 8. Data Flow Diagrams

### 8.1 Add Resident Flow

```
Admin Portal                     Server                          Database
    │                              │                               │
    │ POST add_resident            │                               │
    │─────────────────────────────►│                               │
    │                              │ Validate phone uniqueness     │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ Validate community active     │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ Validate email (if provided)  │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │                               │
    │                              │ $executeAPI("User/add_user")  │
    │                              │──────────────────────────────►│ INSERT user
    │                              │                               │ INSERT user_details
    │                              │◄──────────────────────────────│
    │                              │ BEGIN TRANSACTION             │
    │                              │ UPDATE user_details            │
    │                              │  (phone, community)           │
    │                              │──────────────────────────────►│ TRIGGER: sync phone→user
    │                              │◄──────────────────────────────│
    │                              │ UPDATE user                    │
    │                              │  (login_authority = OTP)       │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ INSERT resident                │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ COMMIT                        │
    │ {rc:0, user_id: "..."}      │                               │
    │◄─────────────────────────────│                               │
```

### 8.2 Image Update Flow (update_resident / update_my_details)

```
Client App                       Server                          Database / Storage
    │                              │                               │
    │ POST File/upload_file_base64 │                               │
    │  {data: "base64...",         │                               │
    │   file_name: "photo.jpg"}    │                               │
    │─────────────────────────────►│                               │
    │                              │ Save file to storage          │
    │                              │──────────────────────────────►│ INSERT file
    │ {rc:0, file_id: "id1"}      │                               │
    │◄─────────────────────────────│                               │
    │                              │                               │
    │ POST update_resident         │                               │
    │  {user_id: "...",            │                               │
    │   new_image_ids: ["id1"],    │                               │
    │   keep_images: ["url1"]}     │                               │
    │─────────────────────────────►│                               │
    │                              │ Fetch resident record         │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │ Resolve keep_images → names   │
    │                              │ Resolve new_image_ids → names │
    │                              │──────────────────────────────►│ SELECT FIL_FILE_NAME
    │                              │◄──────────────────────────────│
    │                              │                               │
    │                              │ BEGIN TRANSACTION             │
    │                              │ UPDATE resident SET            │
    │                              │  RES_IMAGES = '["old","new"]' │
    │                              │──────────────────────────────►│
    │                              │ COMMIT                        │
    │ {rc:0}                       │                               │
    │◄─────────────────────────────│                               │
```

### 8.3 Phone Change → Session Termination Flow

```
Admin Portal                     Server                          Database
    │                              │                               │
    │ POST update_resident         │                               │
    │  {phone_num: "new_number"}   │                               │
    │─────────────────────────────►│                               │
    │                              │ Fetch resident record         │
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
    │                              │  ┌─────── Resident App ─────┐ │
    │                              │  │ Next API call with old     ││
    │                              │  │ token → rc:201 (invalid)   ││
    │                              │  │ → Redirect to OTP login    ││
    │                              │  └───────────────────────────┘ │
```

### 8.4 Officer Search Flow

```
Officer App                      Server                          Database
    │                              │                               │
    │ POST search_residents        │                               │
    │  {search_text: "John"}       │                               │
    │─────────────────────────────►│                               │
    │                              │ Extract officer's userId      │
    │                              │  from session token           │
    │                              │                               │
    │                              │ Get officer's USD_COM_ID      │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │                               │
    │                              │ Search residents WHERE        │
    │                              │  USD_COM_ID = officer's       │
    │                              │  AND (name/address/vehicles   │
    │                              │       LIKE '%John%')          │
    │                              │──────────────────────────────►│
    │                              │◄──────────────────────────────│
    │                              │                               │
    │ {rc:0, residents: [...]}     │                               │
    │◄─────────────────────────────│                               │
```

---

## 9. Future Enhancements (Phase 3+)

### 9.1 Call Module Integration

When the Call module is implemented:
- `update_resident` will check for active calls before community reassignment (ERR_RESIDENT_HAS_ACTIVE_CALLS, RC 541)
- `update_resident` will check for active calls before deactivation
- `delete_resident` will check for ANY call history (past or present) — not just `USR_LAST_LOGIN`

### 9.2 Checked-In Officer Filter

SDS 3.10 implies officers search residents during active duty. Future phases may add a check-in requirement before `search_residents` is accessible.

### 9.3 Notification on Admin Changes

Future phases may add push notifications to residents when admins modify their profile (community change, phone change, deactivation).
