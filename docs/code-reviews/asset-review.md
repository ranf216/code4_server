# Asset Module Code Review Report

**Review Date:** 2026-08-28  
**Reviewer:** Devin (automated audit)  
**Review Criteria:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`

---

## Scope & Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/asset.js` | API definition |
| `backend/platform/funcs/asset.js` | Business logic (assets, posts, map zones, community map) |
| `backend/platform/data/asset_type.json` | Asset type data items (DB-backed) |
| `backend/platform/data/asset_shape.json` | Asset shape data items (static) |
| `backend/platform/data/post_priority.json` | Post priority data items (static) |
| `backend/platform/data/map_zone_type.json` | Map zone type data items (static) |
| `backend/platform/definitions/errorcodes.en.js` | Error code definitions (rc 750-762) |
| `backend/platform/config/using_api.js` | API registration |
| `backend/platform/config/runtime_config.js` | Page size configuration |
| `db/db.sql` | Full schema — `asset`, `post`, `map_zone` tables |
| `db/UpgradeDB.sql` | Migration — matching `CREATE TABLE IF NOT EXISTS` |

---

## Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 3 | Fixed |
| Medium | 1 | Fixed |
| Low | 0 | — |
| Informational | 2 | Documented |

---

## High Findings (Fixed)

### 1. Hardcoded Data-Item ID in `calculateAcres`

**Rule:** brain.md — "Always use `$Const` references for data-item IDs — never literal strings."

**Location:** `funcs/asset.js`, `calculateAcres()` function

**Before:**
```js
if (!locationObj || shape !== "circle")
```

**After:**
```js
if (!locationObj || shape !== $Const.ASSET_SHAPE_CIRCLE)
```

**Rationale:** The `asset_shape.json` data-items file defines `"define": "ASSET_SHAPE_CIRCLE"`, which is registered via `$DataItems.define(TABLE_ASSET_SHAPE)` in the constructor. The literal string `"circle"` bypasses rename-safety, won't surface in find-references, and silently breaks if the data-item key changes.

---

## Medium Findings (Fixed)

### 2. Inconsistent Location Parsing in `update_asset`

**Rule:** brain.md — DRY / "Extract shared logic to module-level functions"

**Location:** `funcs/asset.js`, `update_asset()`, acres recalculation block

**Before:**
```js
let effectiveLocation = (this.$location !== null && this.$location !== undefined)
    ? parseLocationJson(this.$location)
    : (asset.AST_LOCATION ? (typeof asset.AST_LOCATION === "string"
        ? JSON.parse(asset.AST_LOCATION) : asset.AST_LOCATION) : null);
```

**After:**
```js
let effectiveLocation = (this.$location !== null && this.$location !== undefined)
    ? parseLocationJson(this.$location)
    : parseLocationJson(asset.AST_LOCATION);
```

**Rationale:** The inline `typeof`/`JSON.parse` ternary duplicated the logic already in `parseLocationJson()`. Using the helper keeps the code DRY and ensures consistent null/error handling.

### 3. Pagination Convention: `offset/limit` Replaced with `page/pageSize`

**Rule:** brain.md — "Paginated List Endpoint" pattern uses `page` (0-based) with `page * pageSize`, returning `num_of_pages` and `num_of_items`.

**Location:** `api/asset.js` + `funcs/asset.js` — `get_assets_list`, `get_posts_list`

**Before:** API accepted `offset` and `limit` parameters. Responses returned `total_count`.

**After:**
- API accepts `page` (`"o:i:0"`, 0-based)
- Page sizes set in `runtime_config.js` (`ASSETS_LIST_PAGE_SIZE: 50`, `POSTS_LIST_PAGE_SIZE: 50`)
- Responses return `num_of_pages` and `num_of_items`

### 4. Date Fields Not Validated Before Insertion

**Rule:** brain.md — `$Utils.validateDateStr()` for date validation

**Location:** `funcs/asset.js` — `create_asset()`, `create_assets_batch()`, `update_asset()`

**Affected fields:** `installation_date`, `replacement_date`

**Before:** Optional date strings passed directly to MySQL `date` columns without server-side format validation.

**After:** Both fields validated with `$Utils.validateDateStr()` when non-empty. Invalid dates return `ERR_ASSET_INVALID_DATE` (rc 763). Empty values are allowed (clear the date to `null`).

---

## Informational Findings (No Action Required)

### 5. `asset_type` Is a DB-Backed Data Table

**Observation:** `asset_type.json` is a DB-backed data table (`"source": "db"`) with TTL-based cross-instance caching. The `$DataItems.define(TABLE_ASSET_TYPE)` call in the constructor is a safe no-op for DB-backed tables (no `define` attributes in `data_item` rows). This means `$Const.ASSET_TYPE_*` constants are NOT available — but they are not used in any logic, so this is correct.

### 6. `postHasShiftHistory` Uses Information Schema Query

**Observation:** The function queries `information_schema.TABLES` to check if the `shift_post` table exists before querying it. This is a defensive pattern for optional module dependencies. The two sequential SELECT queries are acceptable here (not inside a loop, second query is gated by the first).

---

## Checklist Compliance

### Database Query Patterns
- [x] No `$Db.executeQuery()` inside loops — batch insert builds params in memory, single multi-row INSERT
- [x] All SELECT queries before any write operations — no transactions used; each method follows read-then-write order
- [x] Using `IN` clauses with placeholders where applicable
- [x] Multi-value INSERT with `(?,?,?,...)` placeholders in `create_assets_batch`
- [x] Data structures prepared in memory before DB writes

### Soft Deletion
- [x] No `DELETE FROM` statements — all removals use `UPDATE SET *_DELETED_ON=?`
- [x] All queries filter `WHERE *_DELETED_ON IS NULL`

### Transaction Handling
- [x] No transactions in current implementation — single write operations per method do not require transactions
- [x] Every INSERT/UPDATE/DELETE is followed by `$Db.isError()` check with proper `$Err.DBError()` return

### API Response Quality
- [x] No database column names exposed — all responses use clean `snake_case` names via `mapAssetRow`, `mapPostRow`, `mapZoneRow`
- [x] Proper error codes from `$ERRS` (rc 750-762)

### Data Items & Enums
- [x] No hardcoded arrays for enum values — all use `$DataItems` with JSON files in `platform/data/`
- [x] Validation via `$DataItems.isValidItemId()` for asset_type, asset_shape, post_priority, map_zone_type
- [x] `$DataItems.define()` for all four tables called in the constructor
- [x] `$DataItems.getListForApiDoc()` used in API definitions for documentation

### Security & Best Practices
- [x] All queries use `?` placeholders — no string concatenation with user input
- [x] Multi-value INSERT in batch creation uses placeholder pattern
- [x] Input parameters validated (type, shape, priority, zone_type, name length, uniqueness)
- [x] No database functions for JS-computable operations (acres calculated in JS)
- [x] Code follows established style: Allman braces, tab indentation, `$`-global access

### Performance
- [x] Minimized query count — single query for lists, single query for counts
- [x] Bulk `UNION ALL` for map-item count (3 tables in one query)
- [x] Multi-row INSERT for batch creation
- [x] No N+1 query problems
- [x] Indexed columns used in WHERE: `IX_AST_COM_ID`, `IX_AST_TYPE`, `IX_PST_COM_ID`, `IX_PST_IS_ACTIVE`, `IX_MZN_COM_ID`, `IX_MZN_TYPE`

### SQL Conventions
- [x] Table names in backticks
- [x] Column prefixes: `AST_`, `PST_`, `MZN_`, `COM_`
- [x] `LEFT OUTER JOIN` (not `LEFT JOIN`)
- [x] No `AS` keyword for aliases
- [x] `JOIN` indented on new line, one tab more than `FROM`
- [x] Soft deletion via `*_DELETED_ON` timestamp columns
- [x] Timestamps set via `$Utils.now()`
- [x] JSON columns stored as JSON strings, parsed in code

### Schema Consistency
- [x] `db/db.sql` and `db/UpgradeDB.sql` schemas match exactly for all three tables
- [x] All columns SELECTed in queries match the schema
- [x] All columns INSERTed match the schema column order and count
- [x] `AST_ACRES` decimal(10,4) — persisted on create, batch create, and update
- [x] `PST_PERMISSIONS` JSON — stored on create and update, returned on read

### API Definition Conventions
- [x] `@acl` uses `$ACL.USER_TYPE_*` constants
- [x] `@doc` present on all endpoints
- [x] Optional parameters use `o:TYPE:DEFAULT` format
- [x] `/null/` used for update parameters that should be distinguishable from "not provided"
- [x] `@truncated_request` on `upload_community_map` for base64 image logging
- [x] `***` doc separator used consistently

### Module Structure
- [x] Helper functions at module scope (outside class): `fetchAssetRecord`, `fetchPostRecord`, `fetchMapZoneRecord`, `communityExists`, `getOfficerCommunityId`, `getMaxMapItems`, `getMapItemCount`, `calculateAcres`, `parseLocationJson`, `mapAssetRow`, `mapPostRow`, `mapZoneRow`, `postHasShiftHistory`
- [x] Class methods match API definition keys
- [x] Constructor follows `if (session !== null) { this.$Session = session; }` pattern
- [x] Constants at module scope: `TABLE_*`, `MAX_BATCH_SIZE`, `DEFAULT_MAX_MAP_ITEMS`, `SQ_METERS_PER_ACRE`
- [x] `"asset"` registered in `using_api.js`

### Error Code Allocation
- [x] Asset & Post block: rc 750-762, within the project-specific 500+ range
- [x] No overlapping rc values with other modules
- [x] Error names follow `ERR_` prefix convention
- [x] Error messages are descriptive and user-friendly

---

## Changes Applied

| # | File | Change | Severity |
|---|------|--------|----------|
| 1 | `backend/platform/funcs/asset.js` | Replace `"circle"` literal with `$Const.ASSET_SHAPE_CIRCLE` | High |
| 2 | `backend/platform/funcs/asset.js` | Replace inline JSON.parse ternary with `parseLocationJson()` call | Medium |
| 3 | `backend/platform/api/asset.js` | Replace `offset`/`limit` params with `page` on list endpoints | High |
| 4 | `backend/platform/funcs/asset.js` | Use `$Config.get()` page size, return `num_of_pages`/`num_of_items` | High |
| 5 | `backend/platform/config/runtime_config.js` | Add `ASSETS_LIST_PAGE_SIZE` and `POSTS_LIST_PAGE_SIZE` (50) | High |
| 6 | `backend/platform/definitions/errorcodes.en.js` | Add `ERR_ASSET_INVALID_DATE` (rc 763) | High |
| 7 | `backend/platform/funcs/asset.js` | Add `$Utils.validateDateStr()` for date fields in create/batch/update | High |

---

## Verification

- [x] `node -c` syntax check passes for `api/asset.js`, `funcs/asset.js`, `errorcodes.en.js`, `using_api.js`, `runtime_config.js`
- [x] All four JSON data files parse without errors
- [x] `db/db.sql` and `db/UpgradeDB.sql` schemas are consistent
- [x] `git status` confirms only expected files are modified/untracked
- [x] No commits or pushes performed
