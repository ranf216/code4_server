# Community Module — Compliance & Internals

**Document Version:** 1.0  
**Last Updated:** 2026-06-21  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026  
**Module Files:** `platform/api/community.js`, `platform/funcs/community.js`

---

## 1. Module Overview

The Community module manages **communities** (security-managed sites) and their **featured officer banners** within the Code4 Axis Security Operations Platform. It is implemented as a standard API module pair following the infrastructure's convention-over-configuration architecture.

### 1.1 File Structure

| File | Purpose |
|---|---|
| `platform/api/community.js` | API definition — parameter schemas, ACL, documentation hints |
| `platform/funcs/community.js` | API implementation — all business logic, database interaction, validation |
| `platform/definitions/errorcodes.en.js` | Error code definitions (RC 500–506 for community) |
| `db/db.sql` | Schema for `community` and `featured_officer` tables |
| `db/UpgrdeDB.sql` | Incremental migration scripts for `USD_COM_ID` and `FTO_DELETED_ON` |
| `db/triggers_def.js` | Audit trail trigger definitions for `community`, `featured_officer`, and `user_details` |

### 1.2 Endpoint Summary

| Endpoint | HTTP Method | ACL | Description |
|---|---|---|---|
| `Community/get_communities` | POST | ADMIN | List all communities with optional filters |
| `Community/get_community` | POST | ADMIN, OFFICER, RESIDENT | Get a single community by ID |
| `Community/add_community` | POST | ADMIN | Create a new community |
| `Community/update_community` | POST | ADMIN | Partial update of a community |
| `Community/delete_community` | POST | ADMIN | Soft-delete a community |
| `Community/get_featured_officer` | POST | ADMIN, OFFICER, RESIDENT | Get featured officer banner |
| `Community/set_featured_officer` | POST | ADMIN | Create or update featured officer banner |
| `Community/delete_featured_officer` | POST | ADMIN | Soft-delete featured officer banner |

### 1.3 Architectural Patterns

The module follows all infrastructure conventions:

- **Module-level helper functions:** `fetchCommunityRecord()` and `mapCommunityRow()` are defined outside the exported class to eliminate code duplication across multiple methods. These private helpers access `$`-globals freely.
- **Standard class export:** `module.exports = class { ... }` with a `constructor(session)` that stores `this.$Session`.
- **Parameter injection:** API parameters are injected as `this.$param_name` properties by the infrastructure dispatcher.
- **Standard response pattern:** All methods return `{...rc, ...vals}` where `rc` is `$ERRS.ERR_SUCCESS` and `vals` contains response data.
- **Early return for validation:** Validation failures return error objects immediately (e.g., `return $ERRS.ERR_COMMUNITY_NOT_FOUND`).

---

## 2. Database Schema

### 2.1 `community` Table

Stores all community/site records. Uses the `COM_` column prefix.

```sql
CREATE TABLE `community` (
    `COM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `COM_NAME` varchar(200) NOT NULL,
    `COM_AREA` varchar(500) NOT NULL DEFAULT '',
    `COM_LATITUDE` decimal(10,7) DEFAULT NULL,
    `COM_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `COM_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `COM_TIMEZONE` varchar(100) DEFAULT NULL,
    `COM_MAP_IMAGE` varchar(200) NOT NULL DEFAULT '',
    `COM_MAP_BOUNDARIES` text,
    `COM_IS_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
    `COM_CREATED_ON` datetime NOT NULL,
    `COM_LAST_UPDATE` datetime DEFAULT NULL,
    `COM_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`COM_ID`),
    KEY `IX_COM_NAME` (`COM_NAME`),
    KEY `IX_COM_IS_ACTIVE` (`COM_IS_ACTIVE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key design decisions:**
- **Soft deletion** via `COM_DELETED_ON` — records are never physically deleted; all queries filter with `COM_DELETED_ON IS NULL`.
- **`COM_MAP_IMAGE`** stores a file reference (filename string), not binary data. URL resolution is handled by `$Files.SQL` at query time.
- **`COM_IS_ACTIVE`** is a status flag separate from soft deletion — a community can be deactivated (`COM_IS_ACTIVE = 0`) without being deleted.
- **`COM_AREA`** is `NOT NULL DEFAULT ''` — the API enforces it as mandatory on creation, but the schema allows empty for backward compatibility.

### 2.2 `featured_officer` Table

Stores the featured officer banner for each community. 1:1 relationship enforced by `UNIQUE KEY` on `FTO_COM_ID`.

```sql
CREATE TABLE `featured_officer` (
    `FTO_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `FTO_COM_ID` bigint unsigned NOT NULL,
    `FTO_IMAGE` varchar(200) NOT NULL DEFAULT '',
    `FTO_DESCRIPTION` text NOT NULL,
    `FTO_CREATED_ON` datetime NOT NULL,
    `FTO_LAST_UPDATE` datetime DEFAULT NULL,
    `FTO_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`FTO_ID`),
    UNIQUE KEY `UQ_FTO_COM_ID` (`FTO_COM_ID`),
    CONSTRAINT `FK_FTO_COM_ID` FOREIGN KEY (`FTO_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key design decisions:**
- **1:1 relationship** via `UNIQUE KEY UQ_FTO_COM_ID` — each community can have at most one featured officer banner.
- **Soft deletion** via `FTO_DELETED_ON` — allows the `set_featured_officer` upsert to restore a previously deleted banner rather than creating a duplicate.
- **`FTO_IMAGE`** is stored as a file reference, resolved via `$Files.SQL("FTO_IMAGE")`.

### 2.3 `user_details` Table — Community Association Column

The `USD_COM_ID` column in the `user_details` table links officers and residents to their assigned community.

```sql
ALTER TABLE `user_details`
    ADD COLUMN `USD_COM_ID` bigint unsigned DEFAULT NULL AFTER `USD_IMAGE`,
    ADD KEY `IX_USD_COM_ID` (`USD_COM_ID`),
    ADD CONSTRAINT `FK_USD_COM_ID` FOREIGN KEY (`USD_COM_ID`) REFERENCES `community` (`COM_ID`);
```

**Design:**
- **`NULL`** means unassigned — the officer/resident is not associated with any community.
- **Foreign key** to `community.COM_ID` ensures referential integrity.
- **Indexed** for efficient lookups when querying officers/residents by community.
- Officers are identified by `USD_TYPE = 2` (`$Const.USER_TYPE_OFFICER`), residents by `USD_TYPE = 3` (`$Const.USER_TYPE_RESIDENT`).

### 2.4 Audit Trail Configuration

Both `community` and `featured_officer` tables are configured for audit logging via `db/triggers_def.js`:

**`community` trigger:**
- **ID column:** `COM_ID`
- **Tracked insert fields:** `COM_NAME`, `COM_AREA`, `COM_LATITUDE`, `COM_LONGITUDE`, `COM_LOCATION_NAME`, `COM_TIMEZONE`, `COM_MAP_IMAGE`, `COM_MAP_BOUNDARIES`, `COM_IS_ACTIVE`, `COM_LAST_UPDATE`, `COM_DELETED_ON`
- **Tracked update fields:** Same as insert fields
- **`log_delete: false`** — physical deletes are not logged because the module uses soft deletion exclusively

**`featured_officer` trigger:**
- **ID column:** `FTO_ID`
- **Tracked insert fields:** `FTO_COM_ID`, `FTO_IMAGE`, `FTO_DESCRIPTION`, `FTO_CREATED_ON`, `FTO_LAST_UPDATE`, `FTO_DELETED_ON`
- **Tracked update fields:** `FTO_IMAGE`, `FTO_DESCRIPTION`, `FTO_LAST_UPDATE`, `FTO_DELETED_ON`
- **`log_delete: false`** — soft deletion only

**`user_details` trigger (updated):**
- `USD_COM_ID` was added to both `insert_fields` and `update_fields` to track community association changes in the audit log.

---

## 3. Endpoint Implementation Details

### 3.1 `get_communities`

**Purpose:** Retrieve a list of all non-deleted communities with optional filtering.

**API Definition:**
```
"get_communities": {
    "@acl":              [$ACL.USER_TYPE_ADMIN],
    "#token":            "s",
    "include_inactive":  "o:b:false***Include inactive communities (default false)",
    "search_text":       "o:s:***Free-text search across community/officer/resident names"
}
```

**Implementation flow:**
1. Initialize `$Files.SQL("COM_MAP_IMAGE")` for map image URL resolution.
2. Build a dynamic `WHERE` clause starting with `COM_DELETED_ON IS NULL`.
3. If `include_inactive` is `false` (default), append `COM_IS_ACTIVE = 1`.
4. If `search_text` is non-empty, append a compound condition using `LIKE` for community names and an `EXISTS` subquery for associated officer/resident names.
5. Execute a single query selecting all community fields plus file join columns and correlated subqueries for `officer_count` and `resident_count`.
6. Map each row through `mapCommunityRow()` to produce API-friendly field names, appending `officer_count` and `resident_count` from the subquery results.
7. Return `{ rc: 0, communities: [...] }`.

**SQL query structure (with search):**
```sql
SELECT COM_ID, COM_NAME, COM_AREA, COM_LATITUDE, COM_LONGITUDE,
       COM_LOCATION_NAME, COM_TIMEZONE, <filesSql.select()>,
       COM_MAP_BOUNDARIES, COM_IS_ACTIVE, COM_CREATED_ON, COM_LAST_UPDATE,
       (SELECT COUNT(*) FROM `user_details` WHERE USD_COM_ID = COM_ID AND USD_TYPE = ? AND USD_DELETED_ON IS NULL) as COM_OFFICER_COUNT,
       (SELECT COUNT(*) FROM `user_details` WHERE USD_COM_ID = COM_ID AND USD_TYPE = ? AND USD_DELETED_ON IS NULL) as COM_RESIDENT_COUNT
FROM `community`
    <filesSql.join()>
WHERE COM_DELETED_ON IS NULL
  AND COM_IS_ACTIVE = 1
  AND (COM_NAME LIKE ? OR EXISTS (
      SELECT 1 FROM `user_details`
      WHERE USD_COM_ID = COM_ID
        AND USD_DELETED_ON IS NULL
        AND (USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ?)
  ))
ORDER BY COM_NAME
```

The two subquery parameters (`$Const.USER_TYPE_OFFICER`, `$Const.USER_TYPE_RESIDENT`) are prepended to the params array before any condition parameters.

**Convention compliance:**
- No table aliases used — column prefixes (`COM_*`, `USD_*`) ensure uniqueness per SQL alias rules.
- No queries inside loops — single query retrieves all data.
- `?` placeholders for all user input (search term) — SQL injection prevention.
- API response field mapping via `mapCommunityRow()` — no DB column names exposed.
- Soft deletion filter (`COM_DELETED_ON IS NULL`) applied to both outer query and EXISTS subquery (`USD_DELETED_ON IS NULL`).

### 3.2 `get_community`

**Purpose:** Retrieve full details for a single community by ID.

**API Definition:**
```
"get_community": {
    "@acl":          [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
    "#token":        "s",
    "community_id":  "i***Community ID"
}
```

**Implementation flow:**
1. Initialize `$Files.SQL("COM_MAP_IMAGE")` for URL resolution.
2. Query for the community by `COM_ID` with `COM_DELETED_ON IS NULL`.
3. If not found, return `$ERRS.ERR_COMMUNITY_NOT_FOUND` (RC 500).
4. Map the row through `mapCommunityRow()`.
5. Return `{ rc: 0, community: {...} }`.

### 3.3 `add_community`

**Purpose:** Create a new community with optional officer/resident associations.

**API Definition:**
```
"add_community": {
    "@acl":              [$ACL.USER_TYPE_ADMIN],
    "@truncated_request": "map_image",
    "#token":            "s",
    "name":              "s***Community name",
    "area":              "s***Area description",
    "latitude":          "o:d:0***Latitude coordinate",
    "longitude":         "o:d:0***Longitude coordinate",
    "location_name":     "o:s:***Location name",
    "timezone":          "o:s:***Timezone identifier",
    "map_image":         "o:s:***Map image (base64)",
    "map_boundaries":    "o:s:***Map boundaries (JSON polygon)",
    "is_active":         "o:b:true***Is community active (default true)",
    "officers":          "o:n:***Officer user IDs to associate",
    "residents":         "o:n:***Resident user IDs to associate"
}
```

**Implementation flow:**
1. **Duplicate name check:** Query for existing non-deleted community with the same name. Return `ERR_COMMUNITY_NAME_ALREADY_EXISTS` (RC 501) if found.
2. **Map image handling:** If `map_image` is non-empty, save via `$Utils.saveNewImageOrKeepOld()` with `null` as existing image (new record). Check `$Err.isERR()` on result.
3. **Active status:** Convert boolean `is_active` to integer (0/1) for DB storage.
4. **INSERT:** Create the community record with all fields. Check `$Db.isError()` after insert. Retrieve `$Db.insertId()`.
5. **Officer association:** If `officers` array has length > 0, execute a bulk `UPDATE` on `user_details` setting `USD_COM_ID` for the specified user IDs where `USD_TYPE` is officer and `USD_DELETED_ON IS NULL`. Check `$Db.isError()`.
6. **Resident association:** Same pattern as officers but with `USD_TYPE` = resident. Check `$Db.isError()`.
7. Return `{ rc: 0, community_id: <new_id> }`.

**Convention compliance:**
- `@truncated_request: "map_image"` prevents base64 image data from flooding request logs.
- `$Utils.saveNewImageOrKeepOld()` follows the standard image upload pattern from `brain.md`.
- `$Db.isError()` checked after every write operation.
- Bulk `UPDATE` with `IN (${array.toPlaceholders()})` — no queries inside loops.
- `name` and `area` are mandatory (no `o:` prefix in type definition).

### 3.4 `update_community`

**Purpose:** Partial update of community fields and/or officer/resident associations.

**API Definition:**
```
"update_community": {
    "@acl":              [$ACL.USER_TYPE_ADMIN],
    "@truncated_request": "map_image",
    "#token":            "s",
    "community_id":      "i***Community ID",
    "name":              "o:s:***Community name",
    "area":              "o:s:***Area description",
    "latitude":          "o:d:0***Latitude coordinate",
    "longitude":         "o:d:0***Longitude coordinate",
    "location_name":     "o:s:***Location name",
    "timezone":          "o:s:***Timezone identifier",
    "map_image":         "o:s:***Map image (base64)",
    "map_boundaries":    "o:s:***Map boundaries (JSON polygon)",
    "is_active":         "o:b:true***Is community active",
    "officers":          "o:n:***Officer user IDs to associate (replaces current list)",
    "residents":         "o:n:***Resident user IDs to associate (replaces current list)"
}
```

**Implementation flow:**
1. **Existence check:** `fetchCommunityRecord()` — return `ERR_COMMUNITY_NOT_FOUND` (RC 500) if not found.
2. **Name uniqueness:** If `name` is non-empty and differs from current, check for duplicates among non-deleted communities (excluding self).
3. **Dynamic UPDATE building:** Array-based pattern from `brain.md`. Each optional field is checked with `$Utils.isset()` / `!$Utils.empty()` and its default value to determine if the client explicitly provided it. Only provided fields are added to the `updateFields`/`updateValues` arrays.
4. **Map image update:** Follows the standard update-existing-image pattern — `$Utils.isset()` check, empty string clears the image, non-empty string processes via `$Utils.saveNewImageOrKeepOld()`.
5. **Execute UPDATE:** If any fields changed, append `COM_LAST_UPDATE` and execute. Check `$Db.isError()`.
6. **Officer reassignment:** If `officers` array has length > 0, first clear all existing officer associations for this community (`SET USD_COM_ID=NULL`), then bulk-assign the new list. Check `$Db.isError()`.
7. **Resident reassignment:** Same pattern as officers. Check `$Db.isError()`.
8. Return `{ rc: 0 }`.

**Key design note — Empty array handling:**
The API framework defaults unsent `o:n:` parameters to `[]` (empty array). Since empty arrays are truthy in JavaScript, the code uses `this.$officers.length > 0` (not `if (this.$officers)`) to gate the association logic. This prevents accidentally clearing all associations when the client omits the parameter entirely.

### 3.5 `delete_community`

**Purpose:** Soft-delete a community after verifying no active associations exist.

**API Definition:**
```
"delete_community": {
    "@acl":          [$ACL.USER_TYPE_ADMIN],
    "#token":        "s",
    "community_id":  "i***Community ID"
}
```

**Implementation flow:**
1. **Existence check:** `fetchCommunityRecord()` — return `ERR_COMMUNITY_NOT_FOUND` (RC 500) if not found.
2. **Active officers check:** `SELECT COUNT(*) cnt` from `user_details` where `USD_COM_ID` matches, `USD_TYPE` = officer, and not soft-deleted. If count > 0, return `ERR_COMMUNITY_HAS_ACTIVE_OFFICERS` (RC 502).
3. **Active residents check:** Same pattern with `USD_TYPE` = resident. If count > 0, return `ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS` (RC 503).
4. **Active calls check:** `TODO` — placeholder for future `call` module integration. Will check for open calls (`CAL_CLOSED_ON IS NULL AND CAL_DELETED_ON IS NULL`) and return `ERR_COMMUNITY_HAS_ACTIVE_CALLS` (RC 504).
5. **Soft delete:** `UPDATE community SET COM_DELETED_ON=?, COM_LAST_UPDATE=? WHERE COM_ID=? AND COM_DELETED_ON IS NULL`. Check `$Db.isError()`.
6. Return `{ rc: 0 }`.

### 3.6 `get_featured_officer`

**Purpose:** Retrieve the featured officer banner for a community.

**Implementation flow:**
1. **Community existence check** via `fetchCommunityRecord()`.
2. Initialize `$Files.SQL("FTO_IMAGE")` for image URL resolution.
3. Query `featured_officer` by `FTO_COM_ID` with `FTO_DELETED_ON IS NULL`.
4. If not found, return `ERR_FEATURED_OFFICER_NOT_FOUND` (RC 506).
5. Map to API-friendly fields and return `{ rc: 0, featured_officer: {...} }`.

### 3.7 `set_featured_officer`

**Purpose:** Create, update, or restore the featured officer banner for a community. Functions as an upsert.

**API Definition:**
```
"set_featured_officer": {
    "@acl":              [$ACL.USER_TYPE_ADMIN],
    "@truncated_request": "image",
    "#token":            "s",
    "community_id":      "i***Community ID",
    "image":             "s***Featured officer image (base64)",
    "description":       "s***Featured officer description"
}
```

**Implementation flow:**
1. **Community existence check** via `fetchCommunityRecord()`.
2. **Mandatory parameter enforcement:** Both `image` and `description` are defined as required strings (`"s"`, no `o:` prefix). The API framework rejects any request missing either parameter with `ERR_MISSING_API_PARAM` (RC 102) before this method executes. This applies to **all** requests — both initial creation and subsequent updates. The SDS mandates that all parameters are mandatory for the featured officer banner; there is no "keep existing image" flow.
3. **Fetch existing record** (including soft-deleted): `SELECT FTO_ID, FTO_IMAGE, FTO_DELETED_ON FROM featured_officer WHERE FTO_COM_ID=?` (no `FTO_DELETED_ON IS NULL` filter).
4. Determine if there is an **active record** (`FTO_DELETED_ON IS NULL`) or a **soft-deleted record** (`FTO_DELETED_ON IS NOT NULL`).
5. **Process image:** `$Utils.saveNewImageOrKeepOld()` is called with the client-provided `image` (always present) and the old image reference from the active record (or `null` if no active record exists). The old image parameter is used solely for internal file management — it does not make the client-side `image` parameter optional.
6. **Branch logic:**
   - **Active record exists:** `UPDATE` the existing record with the new image, description, and `FTO_LAST_UPDATE`.
   - **Soft-deleted record exists:** `UPDATE` the record, setting new values and clearing `FTO_DELETED_ON=NULL` to restore it.
   - **No record exists:** `INSERT` a new record.
7. Check `$Db.isError()` after each write.
8. Return `{ rc: 0, featured_officer_id: <id> }`.

**Design rationale:** The upsert pattern with soft-deletion restoration prevents violating the `UNIQUE KEY UQ_FTO_COM_ID` constraint. A simple `INSERT` would fail if a soft-deleted record already exists for the community.

### 3.8 `delete_featured_officer`

**Purpose:** Soft-delete the featured officer banner for a community.

**Implementation flow:**
1. **Community existence check** via `fetchCommunityRecord()`.
2. Query for active (non-deleted) featured officer record.
3. If not found, return `ERR_FEATURED_OFFICER_NOT_FOUND` (RC 506).
4. **Soft delete:** `UPDATE featured_officer SET FTO_DELETED_ON=?, FTO_LAST_UPDATE=? WHERE FTO_ID=? AND FTO_DELETED_ON IS NULL`. Check `$Db.isError()`.
5. Return `{ rc: 0 }`.

---

## 4. SDS Compliance Verification

### 4.1 Server-Side Deletion Constraints

**SDS Requirement:** The server must prevent deletion of a community that has active officers, residents, or open calls associated with it. The server must return specific error codes for each case.

**Implementation:**

The `delete_community` method performs three sequential checks before allowing soft deletion:

1. **Active officers (RC 502):** Executes `SELECT COUNT(*) cnt FROM user_details WHERE USD_COM_ID=? AND USD_TYPE=? AND USD_DELETED_ON IS NULL` with `$Const.USER_TYPE_OFFICER` (value: 2). If `cnt > 0`, returns `$ERRS.ERR_COMMUNITY_HAS_ACTIVE_OFFICERS`.

2. **Active residents (RC 503):** Same query pattern with `$Const.USER_TYPE_RESIDENT` (value: 3). If `cnt > 0`, returns `$ERRS.ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS`.

3. **Active calls (RC 504):** Currently a `TODO` placeholder. When the `call` module is implemented, this will check `SELECT COUNT(*) cnt FROM call WHERE CAL_COM_ID=? AND CAL_CLOSED_ON IS NULL AND CAL_DELETED_ON IS NULL`. Returns `$ERRS.ERR_COMMUNITY_HAS_ACTIVE_CALLS`.

**Compliance status:** The deletion constraint logic is fully implemented for officers and residents. The calls check is prepared as a placeholder pending the `call` module implementation. Error codes 502, 503, and 504 are defined in `errorcodes.en.js`.

**Why server-side:** These checks MUST be server-side (not client-side) because:
- Client-side checks can be bypassed.
- Multiple clients may modify associations concurrently.
- The server is the single source of truth for data integrity.

### 4.2 Mandatory Parameters

**SDS Requirement:** The `area` field must be mandatory when creating a community. The `image` field must be mandatory when setting a featured officer.

**Implementation:**

- **`area` in `add_community`:** Defined as `"s***Area description"` (type `s` = required string, no `o:` prefix). The API framework automatically rejects requests missing this parameter with `ERR_MISSING_API_PARAM` (RC 102) before the funcs method is even called.

- **`image` in `set_featured_officer`:** Defined as `"s***Featured officer image (base64)"` (required string). Same framework-level enforcement.

- **`description` in `set_featured_officer`:** Also defined as `"s***Featured officer description"` (required string).

**Compliance status:** Fully compliant. The mandatory enforcement is handled at the infrastructure level by the API parameter parser in `main.js`, ensuring that no business logic can execute without these fields being present.

### 4.3 Direct Officer/Resident Associations

**SDS Requirement:** The `add_community` and `update_community` endpoints must support directly associating officers and residents to the community via array parameters.

**Implementation:**

- **API parameters:** Both endpoints define `"officers": "o:n:***..."` and `"residents": "o:n:***..."` (optional arrays of numbers).

- **`add_community` association logic:**
    - After inserting the community record, if `officers` has length > 0:
        ```sql
        UPDATE `user_details` SET USD_COM_ID=?
        WHERE USD_USR_ID IN (?,?,...)
          AND USD_TYPE=? AND USD_DELETED_ON IS NULL
        ```
    - Same pattern for `residents`.
    - Uses `Array.toPlaceholders()` for safe `IN` clause construction — no queries in loops.

- **`update_community` association logic (replace strategy):**
    - If `officers` has length > 0:
        1. **Clear existing:** `UPDATE user_details SET USD_COM_ID=NULL WHERE USD_COM_ID=? AND USD_TYPE=? AND USD_DELETED_ON IS NULL`
        2. **Assign new:** `UPDATE user_details SET USD_COM_ID=? WHERE USD_USR_ID IN (?,?,...) AND USD_TYPE=? AND USD_DELETED_ON IS NULL`
    - Same pattern for `residents`.
    - The "clear then assign" approach ensures a full replacement of the association list.

- **Empty array safeguard:** The API framework defaults unsent `o:n:` params to `[]`. The code gates on `this.$officers.length > 0` to prevent accidental clearing when the parameter is not sent.

**Compliance status:** Fully compliant. The association model uses the existing `user_details.USD_COM_ID` foreign key column. All operations use bulk SQL — no queries in loops.

### 4.4 Server-Side Free-Text Search

**SDS Requirement:** The `get_communities` endpoint must support a `search_text` parameter that filters communities by matching against community names, associated officer names, and associated resident names.

**Implementation:**

- **API parameter:** `"search_text": "o:s:***Free-text search across community/officer/resident names"` (optional string, default empty).

- **Search logic:** When `search_text` is non-empty, a compound SQL condition is appended:
    ```sql
    (COM_NAME LIKE ? OR EXISTS (
        SELECT 1 FROM `user_details`
        WHERE USD_COM_ID = COM_ID
          AND USD_DELETED_ON IS NULL
          AND (USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ?)
    ))
    ```
    The search term is wrapped with `%` wildcards for substring matching: `"%" + this.$search_text + "%"`.

- **Design decisions:**
    - Uses `EXISTS` subquery rather than `JOIN` to avoid duplicate rows when multiple users match.
    - The subquery searches both `USD_FIRST_NAME` and `USD_LAST_NAME` — covers both officers and residents without needing a `USD_TYPE` filter (matching any associated user is sufficient).
    - Soft-deleted users are excluded via `USD_DELETED_ON IS NULL`.
    - All user input uses `?` placeholders — SQL injection prevention.

**Compliance status:** Fully compliant. The search is entirely server-side, uses parameterized queries, and covers all three required search targets (community names, officer names, resident names).

---

## 5. Error Codes

All community-related error codes are defined in `platform/definitions/errorcodes.en.js` under the **Community (500–519)** range:

| RC | Constant | Message | Used By |
|---|---|---|---|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | community not found | `get_community`, `update_community`, `delete_community`, `get_featured_officer`, `set_featured_officer`, `delete_featured_officer` |
| 501 | `ERR_COMMUNITY_NAME_ALREADY_EXISTS` | a community with this name already exists | `add_community`, `update_community` |
| 502 | `ERR_COMMUNITY_HAS_ACTIVE_OFFICERS` | cannot delete community with active officers | `delete_community` |
| 503 | `ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS` | cannot delete community with active residents | `delete_community` |
| 504 | `ERR_COMMUNITY_HAS_ACTIVE_CALLS` | cannot delete community with active calls | `delete_community` (TODO) |
| 505 | `ERR_COMMUNITY_IS_NOT_ACTIVE` | community is not active | Reserved for future use |
| 506 | `ERR_FEATURED_OFFICER_NOT_FOUND` | featured officer not found | `get_featured_officer`, `delete_featured_officer` |

Additionally, the following infrastructure error codes may be returned:
- **RC 102** (`ERR_MISSING_API_PARAM`) — when a mandatory parameter is missing (e.g., `name`, `area`, `image`, `description`).
- **RC 103** (`ERR_NO_PRIVILEGES`) — when a non-admin user attempts an admin-only operation.
- **RC 201** (`ERR_INVALID_USER_TOKEN`) — when the authentication token is invalid or expired.

---

## 6. File Handling

### 6.1 Map Image (`COM_MAP_IMAGE`)

- **Read operations:** `$Files.SQL("COM_MAP_IMAGE")` generates the necessary `LEFT OUTER JOIN` with the `file` table and provides `select()` and `join()` methods. The resulting URL is extracted via `$Files.getUrl(filesSql.get(row))`.
- **Create (add_community):** If `map_image` is non-empty, `$Utils.saveNewImageOrKeepOld(userId, base64Data, null, "community")` saves the file and returns `rv.image_name`.
- **Update (update_community):** If `map_image` is explicitly set to empty string `""`, the column is cleared (file reference removed but file is NOT deleted from disk per the "Never Delete Uploaded Files" rule). If non-empty, a new file is saved.
- **`@truncated_request: "map_image"`** in the API definition prevents base64 data from being logged.

### 6.2 Featured Officer Image (`FTO_IMAGE`)

- **Read operations:** `$Files.SQL("FTO_IMAGE")` with the same pattern as above.
- **Create/Update (set_featured_officer):** `$Utils.saveNewImageOrKeepOld(userId, base64Data, oldImage, "featured_officer")`. The `oldImage` is taken from the active record if one exists.
- **`@truncated_request: "image"`** prevents base64 logging.

---

## 7. Data Flow Diagrams

### 7.1 Add Community with Associations

```
Client → POST Community/add_community
    { name, area, officers: [101, 102], residents: [201, 202] }
         │
         ▼
    [1] Check duplicate name → ERR 501 if exists
    [2] Save map_image if provided
    [3] INSERT INTO community → get COM_ID
    [4] UPDATE user_details SET USD_COM_ID=COM_ID
        WHERE USD_USR_ID IN (101, 102) AND USD_TYPE=2
    [5] UPDATE user_details SET USD_COM_ID=COM_ID
        WHERE USD_USR_ID IN (201, 202) AND USD_TYPE=3
         │
         ▼
    Response: { rc: 0, community_id: <new_id> }
```

### 7.2 Delete Community with Constraint Checks

```
Client → POST Community/delete_community
    { community_id: 5 }
         │
         ▼
    [1] Fetch community → ERR 500 if not found
    [2] COUNT officers where USD_COM_ID=5 → ERR 502 if > 0
    [3] COUNT residents where USD_COM_ID=5 → ERR 503 if > 0
    [4] COUNT open calls where CAL_COM_ID=5 → ERR 504 if > 0 (TODO)
    [5] UPDATE community SET COM_DELETED_ON=now() WHERE COM_ID=5
         │
         ▼
    Response: { rc: 0 }
```

### 7.3 Set Featured Officer (Upsert)

```
Client → POST Community/set_featured_officer
    { community_id: 5, image: "<base64>", description: "Officer Smith" }
         │
         ▼
    [1] Fetch community → ERR 500 if not found
    [2] SELECT existing featured_officer (including soft-deleted)
    [3] Save image via $Utils.saveNewImageOrKeepOld()
         │
         ├─ Active record exists → UPDATE image, description, last_update
         ├─ Soft-deleted exists  → UPDATE image, description, last_update, CLEAR FTO_DELETED_ON
         └─ No record exists    → INSERT new record
         │
         ▼
    Response: { rc: 0, featured_officer_id: <id> }
```
