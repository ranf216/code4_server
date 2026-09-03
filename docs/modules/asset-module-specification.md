# Asset, Post & Map Infrastructure Module — Architectural Specification

**Module:** Phase 4.1 — Asset & Post API
**Version:** 4.6.0
**Last Updated:** 2026-08-28

---

## 1. Overview

The Asset module provides the map infrastructure layer of the Code4 Axis Security Operations Platform. It manages three core entity types — **assets** (physical security devices), **posts** (guard station locations), and **map zones** (geographic areas of interest) — all scoped to communities and plotted on the community map. The module also handles community map image uploads and provides a unified metadata endpoint for populating client-side dropdowns.

### Module Files

| File | Purpose |
|------|---------|
| `backend/platform/api/asset.js` | API endpoint definitions (20 endpoints) |
| `backend/platform/funcs/asset.js` | Business logic implementation |
| `backend/platform/data/asset_type.json` | Asset type registry ($DataItems, DB-backed, cached with 10s TTL) |
| `backend/platform/data/asset_shape.json` | Asset shape enum ($DataItems, static): `place`, `circle`, `line` |
| `backend/platform/data/post_priority.json` | Post priority enum ($DataItems, static): `urgent`, `important`, `normal`, `low` |
| `backend/platform/data/map_zone_type.json` | Map zone type enum ($DataItems, static): `entry_exit`, `high_priority` |

### Registration

- **API:** Registered as `"asset"` in `backend/platform/config/using_api.js`.
- **Runtime Config:** `ASSETS_LIST_PAGE_SIZE` (50) and `POSTS_LIST_PAGE_SIZE` (50) in `backend/platform/config/runtime_config.js`.
- **Error Codes:** RC 750-763 in `backend/platform/definitions/errorcodes.en.js`.
- **Audit Trail:** `asset`, `post`, and `map_zone` trigger definitions in `db/triggers_def.js`.

---

## 2. Table Definitions & Schema

### 2.1 `post` (Prefix: `PST_`)

Guard station locations where officers are assigned during shifts.

```sql
CREATE TABLE `post` (
  `PST_ID`          bigint unsigned  NOT NULL AUTO_INCREMENT,
  `PST_COM_ID`      bigint unsigned  NOT NULL
                                     COMMENT 'Community this post belongs to',
  `PST_NAME`        varchar(60)      NOT NULL
                                     COMMENT 'Unique within community',
  `PST_DESCRIPTION`  varchar(200)    DEFAULT NULL,
  `PST_PRIORITY`    varchar(20)      NOT NULL DEFAULT 'normal'
                                     COMMENT 'urgent, important, normal, low',
  `PST_SHAPE`       varchar(20)      NOT NULL DEFAULT 'place'
                                     COMMENT 'place, circle, line',
  `PST_LOCATION`    json             DEFAULT NULL
                                     COMMENT 'GeoJSON coordinates (point, circle centre+radius, line array)',
  `PST_EQUIPMENT`   text             COMMENT 'Required equipment for this post',
  `PST_PERMISSIONS` json             DEFAULT NULL
                                     COMMENT 'Scheduling allocation requirements:
                                      {required_roles:[], required_badges:[], required_equipment:[]}',
  `PST_IS_ACTIVE`   tinyint unsigned NOT NULL DEFAULT '1',
  `PST_CREATED_BY`  varchar(128)     NOT NULL,
  `PST_CREATED_ON`  datetime         NOT NULL,
  `PST_LAST_UPDATE` datetime         DEFAULT NULL,
  `PST_DELETED_ON`  datetime         DEFAULT NULL,
  PRIMARY KEY (`PST_ID`),
  KEY `IX_PST_COM_ID`    (`PST_COM_ID`),
  KEY `IX_PST_IS_ACTIVE` (`PST_IS_ACTIVE`),
  UNIQUE KEY `UQ_PST_COM_NAME` (`PST_COM_ID`, `PST_NAME`),
  CONSTRAINT `FK_PST_COM_ID`     FOREIGN KEY (`PST_COM_ID`)     REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_PST_CREATED_BY` FOREIGN KEY (`PST_CREATED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Column notes:**
- `PST_NAME` — Enforced unique per community via `UQ_PST_COM_NAME` composite unique key. Validated to 1-60 characters in application code.
- `PST_SHAPE` — Uses the `asset_shape` $DataItems enum. Posts can be a point (`place`), a circular patrol zone (`circle`), or a linear path (`line`).
- `PST_LOCATION` — JSON object whose structure varies by shape (see Section 3.3).
- `PST_EQUIPMENT` — Free-text list of physical equipment required at the post (e.g., "Radio, Body Camera, Flashlight").
- `PST_PERMISSIONS` — JSON scheduling eligibility requirements (see Section 3.1).
- `PST_IS_ACTIVE` — Allows deactivation without deletion, critical for posts with shift history.

**Index rationale:**
- `IX_PST_COM_ID` — All list queries are community-scoped.
- `IX_PST_IS_ACTIVE` — Active/inactive filtering on list endpoints.
- `UQ_PST_COM_NAME` — Database-level enforcement of name uniqueness per community.

**Soft deletion:** All queries filter `PST_DELETED_ON IS NULL`. Posts with shift history (checked via `shift_post` table) cannot be deleted; they can only be deactivated via `PST_IS_ACTIVE = 0`.

---

### 2.2 `asset` (Prefix: `AST_`)

Physical security infrastructure items (cameras, gates, doors, alarms, fences, etc.) plotted on the community map.

```sql
CREATE TABLE `asset` (
  `AST_ID`                bigint unsigned  NOT NULL AUTO_INCREMENT,
  `AST_COM_ID`            bigint unsigned  NOT NULL
                                           COMMENT 'Community this asset belongs to',
  `AST_TYPE`              varchar(100)     NOT NULL
                                           COMMENT 'data_item asset_type key',
  `AST_SHAPE`             varchar(20)      NOT NULL DEFAULT 'place'
                                           COMMENT 'place, circle, line',
  `AST_LOCATION`          json             DEFAULT NULL
                                           COMMENT 'GeoJSON coordinates (point, circle centre+radius, line array)',
  `AST_DESCRIPTION`       varchar(500)     DEFAULT NULL
                                           COMMENT 'Manufacturer, model, serial number, etc.',
  `AST_ACRES`             decimal(10,4)    NOT NULL DEFAULT 0.0000
                                           COMMENT 'Calculated area in acres (circle=pi*r^2/4046.86, place/line=0)',
  `AST_INSTALLATION_DATE` date             DEFAULT NULL,
  `AST_REPLACEMENT_DATE`  date             DEFAULT NULL,
  `AST_CREATED_BY`        varchar(128)     NOT NULL,
  `AST_CREATED_ON`        datetime         NOT NULL,
  `AST_LAST_UPDATE`       datetime         DEFAULT NULL,
  `AST_DELETED_ON`        datetime         DEFAULT NULL,
  PRIMARY KEY (`AST_ID`),
  KEY `IX_AST_COM_ID` (`AST_COM_ID`),
  KEY `IX_AST_TYPE`   (`AST_TYPE`),
  CONSTRAINT `FK_AST_COM_ID`     FOREIGN KEY (`AST_COM_ID`)     REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_AST_CREATED_BY` FOREIGN KEY (`AST_CREATED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Column notes:**
- `AST_TYPE` — References the `asset_type` data-item table, which is DB-backed (community-configurable). Example types: Camera, Gate, Door, Alarm, Fence, Sensor, Barrier.
- `AST_SHAPE` — Uses the `asset_shape` $DataItems enum (`place`, `circle`, `line`).
- `AST_LOCATION` — JSON object whose structure varies by shape (see Section 3.3).
- `AST_DESCRIPTION` — Free-text field for manufacturer, model, serial number, or any identifying detail.
- `AST_ACRES` — Server-calculated area persisted on create and recalculated on update when shape or location changes (see Section 3.2).
- `AST_INSTALLATION_DATE` / `AST_REPLACEMENT_DATE` — Optional lifecycle dates. Validated with `$Utils.validateDateStr()` when provided. Invalid formats return `ERR_ASSET_INVALID_DATE` (rc 763).

**Index rationale:**
- `IX_AST_COM_ID` — All list queries are community-scoped.
- `IX_AST_TYPE` — Type-based filtering on the list endpoint.

**Soft deletion:** All queries filter `AST_DELETED_ON IS NULL`. No `DELETE FROM asset` statements exist.

---

### 2.3 `map_zone` (Prefix: `MZN_`)

Geographic zones of special operational significance on the community map.

```sql
CREATE TABLE `map_zone` (
  `MZN_ID`          bigint unsigned  NOT NULL AUTO_INCREMENT,
  `MZN_COM_ID`      bigint unsigned  NOT NULL
                                     COMMENT 'Community this zone belongs to',
  `MZN_TYPE`        varchar(30)      NOT NULL
                                     COMMENT 'entry_exit, high_priority',
  `MZN_NAME`        varchar(100)     NOT NULL,
  `MZN_LOCATION`    json             DEFAULT NULL
                                     COMMENT 'GeoJSON coordinates (point or polygon)',
  `MZN_CREATED_BY`  varchar(128)     NOT NULL,
  `MZN_CREATED_ON`  datetime         NOT NULL,
  `MZN_LAST_UPDATE` datetime         DEFAULT NULL,
  `MZN_DELETED_ON`  datetime         DEFAULT NULL,
  PRIMARY KEY (`MZN_ID`),
  KEY `IX_MZN_COM_ID` (`MZN_COM_ID`),
  KEY `IX_MZN_TYPE`   (`MZN_TYPE`),
  CONSTRAINT `FK_MZN_COM_ID`     FOREIGN KEY (`MZN_COM_ID`)     REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_MZN_CREATED_BY` FOREIGN KEY (`MZN_CREATED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Column notes:**
- `MZN_TYPE` — Uses the `map_zone_type` $DataItems enum: `entry_exit` (Entry/Exit Point) and `high_priority` (High Priority Zone).
- `MZN_NAME` — A human-readable label for the zone (e.g., "Main Gate", "East Parking Lot").
- `MZN_LOCATION` — JSON coordinates representing a point or polygon boundary (see Section 3.3).

**Index rationale:**
- `IX_MZN_COM_ID` — Community-scoped queries.
- `IX_MZN_TYPE` — Type-based filtering.

**Soft deletion:** All queries filter `MZN_DELETED_ON IS NULL`.

---

## 3. Core Server-Side Business Logic & Helpers

### 3.1 `PST_PERMISSIONS` — Scheduling Eligibility Requirements

The `PST_PERMISSIONS` column stores a JSON object defining the eligibility criteria that an officer should meet to be assigned to a given post during shift scheduling.

**JSON schema:**

```json
{
    "required_roles": ["Supervisor", "Patrol"],
    "required_badges": ["Armed", "First Aid"],
    "required_equipment": ["Radio", "Body Camera"]
}
```

| Key | Type | Description |
|-----|------|-------------|
| `required_roles` | `string[]` | Role names that the assigned officer should hold (from `OFC_ROLES`). |
| `required_badges` | `string[]` | Certification badge keys the officer should possess (from `OFC_CERTIFICATION_BADGES`). |
| `required_equipment` | `string[]` | Equipment items the officer should be issued (free-text tags). |

**Behavioral rules:**
- All three keys are optional. An omitted key is treated as an empty array `[]` (no requirement).
- A `null` or absent `permissions` value means the post has no eligibility restrictions.
- The Asset module stores and retrieves the JSON as-is. It does **not** perform set-intersection validation against officer profiles.

**Phase 5.1 integration (deferred):** The Shift module will consume `PST_PERMISSIONS` during `Shift/assign_post` and `Shift/validate_allocation`. When an officer does not possess all required roles, badges, or equipment, the system will generate a **non-blocking warning** with a manager override safeguard, per SDS 4.7.3.2. This is documented in `docs/deferred_requirements/05-asset-enhancements.md` item 4.

---

### 3.2 Acres Calculation (`calculateAcres`)

Server-side acreage calculation is performed during asset creation and recalculated on update when `shape` or `location` changes. The result is persisted in `AST_ACRES`.

**Module constant:** `SQ_METERS_PER_ACRE = 4046.8564224`

**Formulas by shape:**

| Shape | Formula | Result |
|-------|---------|--------|
| `place` (point) | — | `0.0000` |
| `line` | — | `0.0000` |
| `circle` | `pi * r^2 / 4046.8564224` | Rounded to 4 decimal places |

The `circle` formula extracts `radius` (in meters) from the location JSON object's `radius` property. If `radius` is `0`, missing, or negative, the result is `0`.

**Implementation (`calculateAcres` helper):**

```js
function calculateAcres(shape, locationObj)
{
    if (!locationObj || shape !== $Const.ASSET_SHAPE_CIRCLE)
    {
        return 0;
    }
    let radius = locationObj.radius || 0;
    if (radius <= 0)
    {
        return 0;
    }
    let sqMeters = Math.PI * radius * radius;
    return Math.round((sqMeters / SQ_METERS_PER_ACRE) * 10000) / 10000;
}
```

**Update path — effective value logic:** When `update_asset` is called, acreage is only recalculated if `shape` or `location` was provided in the request. The calculation uses **effective values**: the new parameter if supplied, otherwise the existing database column value. This prevents zeroing out acreage when only non-geometric fields (description, dates) are updated.

**Future consideration:** If polygon shapes are added to assets, the Shoelace/Gauss area formula with latitude/longitude-to-meters geodesic projection should be implemented. This is not currently needed — asset shapes are limited to `place`, `circle`, and `line`.

---

### 3.3 Location JSON Structure

All three entity types store coordinates in a JSON column. The structure varies by shape:

**Place (point):**
```json
{
    "lat": 40.7128,
    "lng": -74.0060
}
```

**Circle:**
```json
{
    "lat": 40.7128,
    "lng": -74.0060,
    "radius": 150
}
```
`radius` is in meters. Used by `calculateAcres` for area computation.

**Line:**
```json
{
    "points": [
        {"lat": 40.7128, "lng": -74.0060},
        {"lat": 40.7138, "lng": -74.0050},
        {"lat": 40.7148, "lng": -74.0040}
    ]
}
```

**Map zone (point or polygon):**
Map zones may use a point or a polygon. Polygon structure:
```json
{
    "points": [
        {"lat": 40.7128, "lng": -74.0060},
        {"lat": 40.7138, "lng": -74.0050},
        {"lat": 40.7148, "lng": -74.0040},
        {"lat": 40.7128, "lng": -74.0060}
    ]
}
```

**Parsing:** The `parseLocationJson` helper handles both string and already-parsed object inputs, returning `null` for empty or malformed data.

---

### 3.4 Map Item Limit Enforcement

The platform enforces a configurable upper bound on the total number of map items (assets + posts + map zones) per community to prevent performance degradation on the map workspace.

**Configuration:**
- Stored in `key_value` table under key `settings:asset` as a JSON value containing `max_map_items_per_community`.
- Default fallback: `1000` (via `DEFAULT_MAX_MAP_ITEMS` constant).
- The Settings module will expose `Settings/update_asset_settings` in a future phase.

**Count helper (`getMapItemCount`):**

A single aggregate query across all three tables using `UNION ALL`:

```sql
SELECT COUNT(*) AS total_items
FROM (
    SELECT AST_ID FROM `asset`
    WHERE AST_COM_ID=? AND AST_DELETED_ON IS NULL
    UNION ALL
    SELECT PST_ID FROM `post`
    WHERE PST_COM_ID=? AND PST_DELETED_ON IS NULL
    UNION ALL
    SELECT MZN_ID FROM `map_zone`
    WHERE MZN_COM_ID=? AND MZN_DELETED_ON IS NULL
) combined_map_items
```

**Limit helper (`getMaxMapItems`):**

Reads `settings:asset` from the `key_value` table. If the key exists and contains a positive `max_map_items_per_community` value, that value is used. Otherwise, falls back to `DEFAULT_MAX_MAP_ITEMS` (1000). Wrapped in a try/catch for resilience against malformed JSON.

**Enforcement points:**

| Endpoint | Check |
|----------|-------|
| `create_asset` | `current_count + 1 > max` |
| `create_assets_batch` | `current_count + batch_size > max` |
| `create_post` | `current_count + 1 > max` |
| `create_map_zone` | `current_count + 1 > max` |

All four checks are **pre-flight** — they run before any INSERT. If the limit is exceeded, the endpoint returns `ERR_MAP_ITEM_LIMIT_EXCEEDED` (rc 762) immediately. For batch creation, the entire batch is rejected atomically if the combined total would exceed the limit.

---

### 3.5 Map Row Formatting Helpers

Three helper functions transform raw database rows into clean API response objects, ensuring:

1. **No database column names exposed** — all keys use `snake_case` API names.
2. **JSON columns parsed** — `location` and `permissions` are returned as native objects (not JSON strings).
3. **Numeric casting** — `acres` is cast via `parseFloat()` so it returns as a float (e.g., `4.256`) rather than a string.
4. **Data-item display names** — `asset_type_name` and `zone_type_name` are resolved via `$DataItems.getItemName()`.
5. **Boolean casting** — `is_active` is returned as `true`/`false` (not `1`/`0`).

| Helper | Entity | Key fields |
|--------|--------|------------|
| `mapAssetRow(row)` | Asset | `asset_id`, `community_id`, `community_name`, `asset_type`, `asset_type_name`, `shape`, `location`, `description`, `acres`, `installation_date`, `replacement_date`, `created_by`, `created_on`, `last_update` |
| `mapPostRow(row)` | Post | `post_id`, `community_id`, `community_name`, `name`, `description`, `priority`, `shape`, `location`, `equipment`, `permissions`, `is_active`, `created_by`, `created_on`, `last_update` |
| `mapZoneRow(row)` | Map Zone | `zone_id`, `community_id`, `community_name`, `zone_type`, `zone_type_name`, `name`, `location`, `created_by`, `created_on`, `last_update` |

---

### 3.6 Officer Community Scoping

Officers do not pass `community_id` — their community is auto-resolved from `user_details.USD_COM_ID`. This scoping applies to:

| Endpoint | Behavior |
|----------|----------|
| `get_posts_list` | Officer community auto-resolved; returns empty list if no community assigned |
| `get_post` | Officers can only view posts in their own community |
| `get_map_zones` | Officer community auto-resolved; returns empty list if no community assigned |

Asset CRUD is admin-only and always requires an explicit `community_id`.

---

### 3.7 Post Deletion Guard

Posts that have been used in a shift (referenced by the `shift_post` junction table) cannot be deleted — they can only be deactivated by setting `is_active = false` via `update_post`. The `postHasShiftHistory` helper performs a defensive check:

1. Queries `information_schema.TABLES` to check if `shift_post` exists (the Shift module may not yet be deployed).
2. If the table exists, queries for any `SHP_PST_ID` reference to the target post.
3. If references exist, returns `ERR_POST_HAS_SHIFT_HISTORY` (rc 759).

This defensive pattern ensures the Asset module works correctly both before and after the Shift module is deployed.

---

### 3.8 Date Validation

The `installation_date` and `replacement_date` fields on assets are validated with `$Utils.validateDateStr()` in all write paths:

| Endpoint | Behavior |
|----------|----------|
| `create_asset` | Both dates validated when non-empty |
| `create_assets_batch` | Both dates validated once (shared across batch) |
| `update_asset` | Each date validated when provided (non-null); empty string clears to `null` |

Invalid date formats return `ERR_ASSET_INVALID_DATE` (rc 763).

---

## 4. Data Items & Enum Registry

### 4.1 Static Data Items

| File | Table | Defines Constants | Keys |
|------|-------|-------------------|------|
| `asset_shape.json` | `asset_shape` | `ASSET_SHAPE_PLACE`, `ASSET_SHAPE_CIRCLE`, `ASSET_SHAPE_LINE` | `place`, `circle`, `line` |
| `post_priority.json` | `post_priority` | `POST_PRIORITY_URGENT`, `POST_PRIORITY_IMPORTANT`, `POST_PRIORITY_NORMAL`, `POST_PRIORITY_LOW` | `urgent`, `important`, `normal`, `low` |
| `map_zone_type.json` | `map_zone_type` | `MAP_ZONE_TYPE_ENTRY_EXIT`, `MAP_ZONE_TYPE_HIGH_PRIORITY` | `entry_exit`, `high_priority` |

All three are registered via `$DataItems.define()` in the module constructor, making their constants available globally as `$Const.ASSET_SHAPE_CIRCLE`, etc.

### 4.2 DB-Backed Data Items

| File | Table | Notes |
|------|-------|-------|
| `asset_type.json` | `asset_type` | `"source": "db"`, cached with 10-second TTL. Entries managed via the Data Items API. No `$Const` constants generated (DB-backed items have no `define` property). |

---

## 5. Error Codes

| RC | Constant | Message | Trigger |
|----|----------|---------|---------|
| 750 | `ERR_ASSET_NOT_FOUND` | asset not found | `get_asset`, `update_asset`, `delete_asset` — record missing or already deleted |
| 751 | `ERR_ASSET_INVALID_TYPE` | invalid asset type | `create_asset`, `create_assets_batch`, `update_asset`, `get_assets_list` — `asset_type` not in $DataItems |
| 752 | `ERR_POST_NOT_FOUND` | post not found | `get_post`, `update_post`, `delete_post` — record missing or already deleted |
| 753 | `ERR_POST_NAME_ALREADY_EXISTS` | a post with this name already exists in this community | `create_post`, `update_post` — uniqueness violation |
| 754 | `ERR_MAP_ZONE_NOT_FOUND` | map zone not found | `update_map_zone`, `delete_map_zone` — record missing or already deleted |
| 755 | `ERR_ASSET_INVALID_SHAPE` | invalid asset shape | `create_asset`, `create_assets_batch`, `update_asset` — `shape` not in $DataItems |
| 756 | `ERR_POST_INVALID_PRIORITY` | invalid post priority | `create_post`, `update_post` — `priority` not in $DataItems |
| 757 | `ERR_POST_INVALID_SHAPE` | invalid post shape | `create_post`, `update_post` — `shape` not in $DataItems |
| 758 | `ERR_MAP_ZONE_INVALID_TYPE` | invalid map zone type | `create_map_zone`, `update_map_zone`, `get_map_zones` — `zone_type` not in $DataItems |
| 759 | `ERR_POST_HAS_SHIFT_HISTORY` | post has been used in a shift and cannot be deleted, only deactivated | `delete_post` — post referenced by `shift_post` |
| 760 | `ERR_ASSET_BATCH_EMPTY` | batch asset list is empty | `create_assets_batch` — empty `locations` array |
| 761 | `ERR_ASSET_BATCH_LIMIT_EXCEEDED` | batch asset list exceeds maximum allowed size | `create_assets_batch` — `locations.length > 100` |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | maximum number of map items reached for this community | All four creation endpoints — combined count exceeds community limit |
| 763 | `ERR_ASSET_INVALID_DATE` | invalid date format | `create_asset`, `create_assets_batch`, `update_asset` — `installation_date` or `replacement_date` fails `$Utils.validateDateStr()` |

---

## 6. Deferred Requirements & Cross-Module Hooks

### 6.1 Scheduling Validation (Phase 5.1 — Shift Management)

`PST_PERMISSIONS` will be consumed by the Shift module:

1. During `Shift/assign_post` or `Shift/validate_allocation`, the system performs a set-intersection check between the post's `required_roles` / `required_badges` / `required_equipment` and the assigned officer's `OFC_ROLES`, `OFC_CERTIFICATION_BADGES`, and issued equipment records.
2. A mismatch produces a **warning-with-override alert** — the assignment is not blocked, but the scheduling manager receives a conflict notification and must explicitly acknowledge the override.
3. Override acknowledgments are persisted in the shift allocation audit log.

Full specification deferred to the Shift module design document. See `docs/deferred_requirements/05-asset-enhancements.md` item 4.

### 6.2 Asset Replacement Reminders (Notification Module Integration)

A nightly cron job (`cron_asset_replacement_check.js`) will query assets approaching their `AST_REPLACEMENT_DATE` and send `asset_replacement_soon` notifications to community administrators.

**Blueprint:**

1. **Configurable lead time:** `asset_replacement_reminder_days` (default 30 days) stored in `settings:asset` namespace in the `key_value` table.
2. **Query pattern:** Single SELECT with `AST_REPLACEMENT_DATE = DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)` to target the exact lead-time date (prevents duplicate daily alerts).
3. **Notification type:** `asset_replacement_soon` registered in `platform/data/notification_type.json` with placeholders: `#asset_type#`, `#asset_id#`, `#description#`, `#community_name#`, `#replacement_date#`.
4. **Recipients:** All active `USER_TYPE_ADMIN` users associated with the affected community. If a `USER_ROLE_LOGISTICS` role exists, target that role specifically.
5. **Optional deep-link:** Notification payload includes `entity_type: "asset"` and `entity_id` for opening a pre-populated "Create Task" modal in the Admin Portal.

Full specification in `docs/deferred_requirements/05-asset-enhancements.md` item 8.

### 6.3 Settings Module Exposure

- `max_map_items_per_community` — Expose in `Settings/update_asset_settings` and `Settings/get_asset_settings` so admins can adjust the map item limit per community.
- `asset_replacement_reminder_days` — Expose alongside the above for configuring the replacement notification lead time.

### 6.4 Map Clustering (Client-Side)

On zoom out, asset icons in the same area should be grouped. This is entirely a client-side rendering feature — no server changes required. The server returns full coordinate data. See `docs/deferred_requirements/05-asset-enhancements.md` item 2.

---

## 7. Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/asset.js` | API endpoint definitions |
| `backend/platform/funcs/asset.js` | Business logic implementation |
| `backend/platform/data/asset_type.json` | Asset type $DataItems (DB-backed) |
| `backend/platform/data/asset_shape.json` | Asset shape $DataItems (static) |
| `backend/platform/data/post_priority.json` | Post priority $DataItems (static) |
| `backend/platform/data/map_zone_type.json` | Map zone type $DataItems (static) |
| `backend/platform/config/using_api.js` | Module registration |
| `backend/platform/config/runtime_config.js` | Page size configuration |
| `backend/platform/definitions/errorcodes.en.js` | Error codes (RC 750-763) |
| `db/db.sql` | Full schema (post, asset, map_zone) |
| `db/UpgradeDB.sql` | V 4.6.0 migration script |
| `db/triggers_def.js` | Audit trail trigger definitions |
| `docs/deferred_requirements/05-asset-enhancements.md` | Deferred requirements tracking |
| `docs/issues-questions/asset-issues-questions.md` | Open design questions |
