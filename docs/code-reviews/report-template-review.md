# Report Template Module Code Review Report

**Review Date:** 2026-10-04  
**Reviewer:** Devin (automated audit)  
**Review Criteria:** `docs/.rules/brain.md`, `docs/.rules/code_review_checklist.md`

---

## Scope & Files Reviewed

| File | Role |
|------|------|
| `backend/platform/api/report_template.js` | API definition (10 endpoints) |
| `backend/platform/funcs/report_template.js` | Business logic (~1,350 lines) |
| `backend/platform/data/report_category.json` | Report category data items (static) |
| `backend/platform/data/report_template_status.json` | Template status data items (static, with defines) |
| `backend/platform/data/report_field_type.json` | Field type data items (static, with defines) |
| `backend/platform/data/report_system_field.json` | System field data items (static, with defines + custom attrs) |
| `backend/platform/data/report_header_layout.json` | Header layout data items (static, with defines) |
| `backend/platform/data/report_date_format.json` | Date format data items (static, with defines + pattern attr) |
| `backend/platform/data/report_section_breaks.json` | Section breaks data items (static, with defines) |
| `backend/platform/data/report_font.json` | Font data items (static, with defines) |
| `backend/platform/definitions/errorcodes.en.js` | Error code definitions (rc 711, 715–725) |
| `backend/platform/config/using_api.js` | API registration |
| `backend/platform/config/runtime_config.js` | `REPORT_TEMPLATES_PAGE_SIZE` (value: 20) |
| `db/db.sql` | Full schema — `report_template`, `report_template_community`, `report_template_section`, `report_template_field` |
| `db/UpgradeDB.sql` | Migration V 7.1.0 + V 7.1.1 |

---

## Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Fixed |
| High | 1 | Fixed |
| Medium | 1 | Fixed |
| Low | 0 | — |
| Informational | 4 | Documented |

---

## Critical Findings (Fixed)

### 1. Pagination Was 1-Based (Must Be 0-Based)

**Rule:** brain.md §Pagination Must Be 0-Based — *"All paginated APIs must use 0-based page numbering. Page 0 is the first page."*

**Location:** `api/report_template.js` line 13, `funcs/report_template.js` `get_templates_list()`

**Before (api):**
```js
"page": "o:i:1***Page number (1-based)",
```

**Before (funcs):**
```js
let page = Math.max(1, this.$page);
let offset = (page - 1) * pageSize;
```

**After (api):**
```js
"page": "o:i:0***Page number (0-based)",
```

**After (funcs):**
```js
let page = parseInt(this.$page) || 0;
let offset = page * pageSize;
```

**Rationale:** Every other paginated endpoint in the codebase (`shift.js`, `asset.js`) uses `"o:i:0"` and `offset = page * pageSize`. The 1-based pattern was inconsistent and violated the explicit brain.md rule.

---

### 2. Page Bounds Check Used Wrong Pattern

**Rule:** brain.md §Page Size Must Come from `runtime_config.js` — *"if `page < 0` or `page >= num_of_pages`, return an empty items array"*

**Location:** `funcs/report_template.js` `get_templates_list()`, pagination block

**Before:**
```js
let numOfPages = Math.ceil(totalCount / pageSize);
if (page > numOfPages && totalCount > 0)
{
    return {...$ERRS.ERR_SUCCESS, templates: [], total_count: totalCount, ...};
}
```

**After:**
```js
let numOfPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
if (page < 0 || page >= numOfPages)
{
    return {...$ERRS.ERR_SUCCESS, templates: [], num_of_items: totalCount, num_of_pages: numOfPages};
}
```

**Rationale:** The old pattern allowed `page > numOfPages` to pass through when `totalCount === 0`, potentially producing an empty OFFSET query. The canonical pattern `page < 0 || page >= numOfPages` catches both negative pages and beyond-last-page. Also, when `totalCount` is 0, `numOfPages` is now correctly 0 (not `NaN` from `Math.ceil(0/20)=0`, which was coincidentally correct but the ternary is more explicit).

---

## High Findings (Fixed)

### 3. Pagination Response Fields Did Not Match Canonical Pattern

**Rule:** brain.md §Paginated List Endpoint pattern — `{num_of_pages, num_of_items, items: [...]}`

**Location:** `funcs/report_template.js` `get_templates_list()`, all three return points

**Before:**
```js
return {...$ERRS.ERR_SUCCESS, templates: templates, total_count: totalCount,
        num_of_pages: numOfPages, page: page, page_size: pageSize};
```

**After:**
```js
return {...$ERRS.ERR_SUCCESS, templates: templates, num_of_items: totalCount,
        num_of_pages: numOfPages};
```

**Rationale:** Every other paginated endpoint (`shift.js`, `asset.js`) returns `num_of_items` (not `total_count`) and does not include `page` or `page_size` in responses. `page_size` is server-controlled and must not be leaked. Returning `page` is redundant since the client sent it.

---

## Medium Findings (Fixed)

### 4. `fetchTemplateRecord` Used `SELECT rpt.*`

**Rule:** brain.md §Query Optimization — *"Always include specific columns in SELECT (avoid `SELECT *` in production)"*

**Location:** `funcs/report_template.js`, `fetchTemplateRecord()` function

**Before:**
```js
`SELECT rpt.*,
        u.USR_FIRST_NAME CREATOR_FIRST_NAME, u.USR_LAST_NAME CREATOR_LAST_NAME
 FROM \`report_template\` rpt ...`
```

**After:**
```js
`SELECT rpt.RPT_ID, rpt.RPT_NAME, rpt.RPT_CATEGORY, rpt.RPT_STATUS,
        rpt.RPT_TITLE_FORMAT, rpt.RPT_IS_GLOBAL, rpt.RPT_REVIEW_BEFORE_CLIENT,
        rpt.RPT_ALLOW_OFFICER_EDITING, rpt.RPT_STYLE, rpt.RPT_CREATED_BY,
        rpt.RPT_CREATED_ON, rpt.RPT_LAST_UPDATE,
        u.USR_FIRST_NAME CREATOR_FIRST_NAME, u.USR_LAST_NAME CREATOR_LAST_NAME
 FROM \`report_template\` rpt ...`
```

**Rationale:** Enumerating columns avoids pulling unnecessary data (e.g. `RPT_DELETED_ON` is always NULL due to the WHERE filter), makes the query contract explicit, and prevents breakage if columns are added later.

---

## Informational Notes

### I1. Table Aliases Used Throughout

**Rule:** brain.md §SQL conventions — *"Don't use table aliases if not needed."*

**Observation:** The module uses `rpt`, `rtc`, `u`, `c` aliases on `report_template`, `report_template_community`, `user`, and `community` tables in nearly all queries. This is **justified and acceptable** here because:
- `get_templates_list()` builds dynamic WHERE conditions as strings that are later interpolated into template literals — the `rpt.` prefix disambiguates when conditions referencing subquery tables (`rtc.RTC_RPT_ID`) are combined.
- EXISTS subqueries alias the same table (`report_template_community rtc`) and need disambiguation from the outer query.
- `user` is a MySQL reserved word; while backtick-quoting handles it in FROM, the `u.` prefix keeps JOIN ON conditions clean.

**Status:** No change needed.

---

### I2. `ON DUPLICATE KEY UPDATE` in `insertCommunities`

**Observation:** The `insertCommunities()` helper uses `ON DUPLICATE KEY UPDATE RTC_DELETED_ON=NULL, RTC_CREATED_ON=VALUES(RTC_CREATED_ON)`. This is a correct and efficient upsert pattern that handles the case where a community assignment was previously soft-deleted and is being re-assigned. The `UNIQUE KEY UQ_RTC_RPT_COM (RTC_RPT_ID, RTC_COM_ID)` supports this.

**Status:** No change needed — correct pattern.

---

### I3. `$Utils.isset()` vs Explicit Null Checks

**Observation:** The module uses `this.$param !== null && this.$param !== undefined` for checking `/null/` optional parameters instead of `$Utils.isset(this.$param)`. Both patterns are functionally equivalent because the infrastructure skips `/null/` parameters entirely when not provided. The explicit comparison is actually more precise — `$Utils.isset()` checks for `undefined` only (property existence), while the double check correctly handles both the undefined-when-skipped and the null edge case.

**Status:** No change needed — both patterns are valid.

---

### I4. UpgradeDB.sql V 7.1.1 ALTER TABLE Is Redundant for New Installs

**Observation:** The V 7.1.0 CREATE TABLE for `report_template_field` already includes the `RTF_IS_REQUIRED` column. The V 7.1.1 ALTER TABLE `ADD COLUMN IF NOT EXISTS` is a no-op for fresh installs. It exists as a safety net for hypothetical environments that ran V 7.1.0 before the column was added to the CREATE TABLE. Since neither version has been deployed, the ALTER TABLE is harmless but redundant.

**Status:** Kept as defensive measure — `IF NOT EXISTS` ensures idempotency.

---

## Checklist Compliance (post-fix)

### Database Query Patterns
- [x] No `$Db.executeQuery()` inside `for`, `while`, or `forEach` loops
- [x] All `SELECT` queries are BEFORE `$Db.beginTransaction()`
- [x] Using `IN (${ids.toPlaceholders()})` for multiple IDs
- [x] Using multi-value INSERT for bulk inserts
- [x] Prepared data structures (maps, arrays) in memory before transaction

### Soft Deletion
- [x] No `DELETE FROM` statements
- [x] Using `UPDATE SET *_DELETED_ON=?` for deletions
- [x] All queries filter `WHERE *_DELETED_ON IS NULL`

### Transaction Handling
- [x] Transaction contains ONLY INSERT/UPDATE/DELETE (no SELECT)
- [x] Every INSERT/UPDATE/DELETE checks `$Db.isError()`
- [x] Proper rollback on error: `$Db.rollbackTransaction()`
- [x] Transaction commits at the end: `$Db.commitTransaction()`

### API Response Quality
- [x] No database field names exposed
- [x] Clean snake_case names in API responses
- [x] Proper error codes returned from `$ERRS`

### Data Items & Enums
- [x] No hardcoded arrays/lists for enum/lookup values
- [x] Validation uses `$DataItems.isValidItemId()`
- [x] `$DataItems.define()` called in constructor for all 8 tables

### API Parameter Types
- [x] Scalar IDs use `i` (integer)
- [x] `n` used only for genuine array of numbers (`community_ids`)
- [x] Optional params have valid defaults
- [x] `/null/` used where "not sent" must be distinguishable from a concrete value

### DRY — Shared Utilities
- [x] `$Funcs.getUserCommunityId()` used instead of duplicating community lookup
- [x] Module-level helpers extracted (`fetchTemplateRecord`, `validateSectionsInput`, `insertSections`, `getSectionFields`, etc.)
- [x] `buildFullName()` reused across list and detail endpoints

### Pagination
- [x] Page size from `$Config.get("REPORT_TEMPLATES_PAGE_SIZE")`
- [x] No `page_size` parameter in API definition
- [x] Page is 0-based (`"o:i:0"`, `offset = page * pageSize`)
- [x] Bounds check: `page < 0 || page >= numOfPages` returns empty with metadata

### Security & Best Practices
- [x] Using parameterized queries (no string concatenation)
- [x] All user input uses `?` placeholders
- [x] Multi-value INSERT uses placeholder pattern
- [x] Sort column validated against whitelist
- [x] `$Const` references used for all data-item IDs
- [x] No `SELECT *` in production queries

### Performance
- [x] Minimized number of database queries
- [x] Used bulk operations (sections, fields, communities)
- [x] Batch-fetched communities and section counts in list endpoint (no N+1)
- [x] Transaction kept short — all reads before `beginTransaction()`
- [x] Indexed columns used in WHERE clauses (`IX_RPT_STATUS`, `IX_RPT_CATEGORY`, `IX_RTS_RPT_ID`, `IX_RTF_RTS_ID`)

---

## Code Style Compliance

- [x] Tab indentation throughout
- [x] Allman-style braces (opening brace on own line)
- [x] Exception 1 followed: `return {` stays on same line (ASI prevention)
- [x] SQL uses `JOIN` (not `INNER JOIN`) and `LEFT OUTER JOIN` (not `LEFT JOIN`)
- [x] SQL does not use `AS` keyword for aliases
- [x] Column prefixes follow table abbreviation (`RPT_`, `RTC_`, `RTS_`, `RTF_`)
- [x] Table names wrapped in backticks
- [x] `$DataItems.define()` calls in constructor only
- [x] Helper functions defined outside class at module scope
