# Report Template Module — Technical Specification

**Module:** `platform/api/report_template.js`, `platform/funcs/report_template.js`
**Phase:** 7.1
**SDS References:** §4.12, §4.12.1, §4.12.2, §4.12.3
**Decision Log:** `docs/issues-questions/report-template-issues-questions.md` (Q1–Q7)

---

## 1. Database Schema & Table Layouts

The Report Template module introduces four tables following Code4 Hungarian notation conventions. All tables use `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`.

### 1.1 `report_template` (Prefix: `RPT_`)

The root entity defining a reusable report template with lifecycle management, community scoping, and embedded style metadata.

```sql
CREATE TABLE `report_template` (
  `RPT_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `RPT_NAME` varchar(80) NOT NULL,
  `RPT_CATEGORY` varchar(20) NOT NULL COMMENT 'incident, daily_activity, custom',
  `RPT_STATUS` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, active, archived',
  `RPT_TITLE_FORMAT` varchar(500) NOT NULL COMMENT 'Report title pattern with placeholders: {date}, {community}, {officer}, {template_name}, {incident_type}',
  `RPT_IS_GLOBAL` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '1=available to all communities',
  `RPT_REVIEW_BEFORE_CLIENT` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '1=route to manager review before client delivery',
  `RPT_ALLOW_OFFICER_EDITING` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '1=officers can edit after submit',
  `RPT_STYLE` json DEFAULT NULL COMMENT 'Template formatting/style settings JSON',
  `RPT_CREATED_BY` varchar(128) NOT NULL,
  `RPT_CREATED_ON` datetime NOT NULL,
  `RPT_LAST_UPDATE` datetime DEFAULT NULL,
  `RPT_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RPT_ID`),
  KEY `IX_RPT_STATUS` (`RPT_STATUS`),
  KEY `IX_RPT_CATEGORY` (`RPT_CATEGORY`),
  CONSTRAINT `FK_RPT_CREATED_BY` FOREIGN KEY (`RPT_CREATED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `RPT_CATEGORY` stores a string key from the `report_category` data item: `incident`, `daily_activity`, `custom`. Validated with `$DataItems.isValidItemId()`.
- `RPT_STATUS` stores a string key from the `report_template_status` data item: `draft`, `active`, `archived`. Transitions are enforced in application logic (see §2.2).
- `RPT_TITLE_FORMAT` is a pattern string used for auto-generating report titles during Phase 7.2 report creation. Supports placeholders `{date}`, `{community}`, `{officer}`, `{template_name}`, `{incident_type}`.
- `RPT_IS_GLOBAL` — when `1`, the template is available to all communities. When `0`, community assignments are stored in `report_template_community`.
- `RPT_REVIEW_BEFORE_CLIENT` and `RPT_ALLOW_OFFICER_EDITING` are workflow flags consumed by the Phase 7.2 report lifecycle engine.
- `RPT_STYLE` is a JSON blob storing all formatting/style settings. Parsed and stringified in application code per brain.md convention. See §2.5 for the JSON schema.
- `RPT_CREATED_BY` stores the admin user ID. No `RPT_UPDATED_BY` column — updates are tracked via `RPT_LAST_UPDATE` timestamp and the `change_log` audit trail triggers.

### 1.2 `report_template_community` (Prefix: `RTC_`)

Junction table linking non-global templates to one or more communities.

```sql
CREATE TABLE `report_template_community` (
  `RTC_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `RTC_RPT_ID` bigint unsigned NOT NULL COMMENT 'FK to report_template',
  `RTC_COM_ID` bigint unsigned NOT NULL COMMENT 'FK to community',
  `RTC_CREATED_ON` datetime NOT NULL,
  `RTC_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RTC_ID`),
  UNIQUE KEY `UQ_RTC_RPT_COM` (`RTC_RPT_ID`, `RTC_COM_ID`),
  KEY `IX_RTC_COM_ID` (`RTC_COM_ID`),
  CONSTRAINT `FK_RTC_RPT_ID` FOREIGN KEY (`RTC_RPT_ID`) REFERENCES `report_template` (`RPT_ID`),
  CONSTRAINT `FK_RTC_COM_ID` FOREIGN KEY (`RTC_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `UQ_RTC_RPT_COM` prevents duplicate template–community pairs and supports `ON DUPLICATE KEY UPDATE` for re-activation of soft-deleted assignments.
- Community assignment updates use a delete-and-reinsert pattern: soft-delete all existing rows, then insert new assignments. The `ON DUPLICATE KEY UPDATE RTC_DELETED_ON=NULL` clause handles upsert when reassigning previously removed communities.
- Global templates (`RPT_IS_GLOBAL=1`) have zero rows in this table.

### 1.3 `report_template_section` (Prefix: `RTS_`)

Ordered sections within a template. Sections define the structural blocks of a report form.

```sql
CREATE TABLE `report_template_section` (
  `RTS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `RTS_RPT_ID` bigint unsigned NOT NULL COMMENT 'FK to report_template',
  `RTS_TITLE` varchar(80) NOT NULL,
  `RTS_SORT_ORDER` int unsigned NOT NULL DEFAULT 0,
  `RTS_IS_ENABLED` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=section is active in the template',
  `RTS_IS_REQUIRED` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=officer must complete this section',
  `RTS_CLIENT_VISIBLE` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=visible in client-facing report',
  `RTS_CREATED_ON` datetime NOT NULL,
  `RTS_LAST_UPDATE` datetime DEFAULT NULL,
  `RTS_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RTS_ID`),
  KEY `IX_RTS_RPT_ID` (`RTS_RPT_ID`),
  CONSTRAINT `FK_RTS_RPT_ID` FOREIGN KEY (`RTS_RPT_ID`) REFERENCES `report_template` (`RPT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `RTS_IS_ENABLED` allows a section to be temporarily hidden from the officer's form without deleting it from the template definition.
- `RTS_IS_REQUIRED` controls whether the entire section must be completed. Orthogonal to field-level `RTF_IS_REQUIRED` (Q7).
- `RTS_CLIENT_VISIBLE` excludes internal-only sections from the client-facing report output. SDS §4.12.2.2 specifies this as a per-section toggle.
- Sections are replaced in bulk on `update_template` (full replacement pattern): existing sections are soft-deleted, then new sections are bulk-inserted. Individual section patching is not supported — the client always sends the full section array.

### 1.4 `report_template_field` (Prefix: `RTF_`)

Individual data-entry fields within a section. Supports both predefined system fields (incident data) and custom fields.

```sql
CREATE TABLE `report_template_field` (
  `RTF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `RTF_RTS_ID` bigint unsigned NOT NULL COMMENT 'FK to report_template_section',
  `RTF_FIELD_KEY` varchar(50) NOT NULL COMMENT 'System field key or custom identifier',
  `RTF_LABEL` varchar(80) NOT NULL,
  `RTF_DESCRIPTION` varchar(500) DEFAULT NULL,
  `RTF_FIELD_TYPE` varchar(20) NOT NULL COMMENT 'text, date, location, dropdown, file_upload, digital_signature',
  `RTF_CONFIG` json DEFAULT NULL COMMENT 'Type-specific config: max_chars, dropdown_values, max_files, is_multi_select',
  `RTF_SORT_ORDER` int unsigned NOT NULL DEFAULT 0,
  `RTF_IS_SYSTEM_FIELD` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '1=predefined incident field, 0=custom',
  `RTF_IS_REQUIRED` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=field value is mandatory when filling report',
  `RTF_CREATED_ON` datetime NOT NULL,
  `RTF_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RTF_ID`),
  KEY `IX_RTF_RTS_ID` (`RTF_RTS_ID`),
  CONSTRAINT `FK_RTF_RTS_ID` FOREIGN KEY (`RTF_RTS_ID`) REFERENCES `report_template_section` (`RTS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `RTF_FIELD_KEY` identifies the field. For system fields (`RTF_IS_SYSTEM_FIELD=1`), this is a key from the `report_system_field` data item (e.g., `incident_date`, `officer_name`, `media`). For custom fields, this is auto-generated as `custom_{sectionIdx}_{fieldIdx}` or a client-supplied key truncated to 50 characters.
- `RTF_FIELD_TYPE` stores a key from the `report_field_type` data item. Validated with `$DataItems.isValidItemId()`. Available types:
  | Type ID | Name | SDS Reference | Config Options |
  |---------|------|---------------|----------------|
  | `text` | Text | §4.12.2.2.1 | `max_chars` (integer) |
  | `date` | Date | §4.12.2.2.1 | — |
  | `location` | Location | §4.12.2.2.1 | — |
  | `dropdown` | Dropdown | §4.12.2.2.1 | `dropdown_values` (array), `is_multi_select` (boolean) |
  | `file_upload` | File Upload | §4.12.2.2.1 | `max_files` (integer) |
  | `digital_signature` | Digital Signature | §4.12.2.2.1 | — |
- `RTF_CONFIG` stores a JSON object with type-specific configuration. Stored as `JSON.stringify()` in application code, parsed on read.
- `RTF_IS_REQUIRED` (Q7) allows field-level optional/mandatory control. Default `1` (required). Section-level `RTS_IS_REQUIRED` and field-level `RTF_IS_REQUIRED` are orthogonal — a field can be optional within a mandatory section (e.g., "Secondary Vehicle Plate" is optional but the "Vehicle Information" section is required).
- Fields are replaced in bulk alongside their parent sections. Individual field patching is not supported.

### 1.5 Indexes

| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `IX_RPT_STATUS` | `report_template` | `RPT_STATUS` | List filtering by lifecycle status |
| `IX_RPT_CATEGORY` | `report_template` | `RPT_CATEGORY` | List filtering by report category |
| `UQ_RTC_RPT_COM` | `report_template_community` | `RTC_RPT_ID`, `RTC_COM_ID` | Uniqueness + upsert support |
| `IX_RTC_COM_ID` | `report_template_community` | `RTC_COM_ID` | Officer community lookup in EXISTS subquery |
| `IX_RTS_RPT_ID` | `report_template_section` | `RTS_RPT_ID` | Section retrieval by template |
| `IX_RTF_RTS_ID` | `report_template_field` | `RTF_RTS_ID` | Field retrieval by section |

**Note:** All queries include `*_DELETED_ON IS NULL` in WHERE clauses per brain.md soft-deletion convention. Composite indexes including `_DELETED_ON` are not currently defined; they can be added if query performance analysis shows benefit at scale.

---

## 2. Core Server-Side Business Logic

### 2.1 Template Name Uniqueness Scope (Q1)

Template name uniqueness is enforced across overlapping community scopes to prevent officers from seeing duplicate template names in their selection picker.

**Rules:**
- **Global template** (`RPT_IS_GLOBAL=1`): Name must not conflict with *any* other non-deleted template (global or community-specific).
- **Community-specific template**: Name must not conflict with global templates or templates sharing at least one community assignment.

**Implementation:** The `checkTemplateNameUnique()` helper executes a single SELECT before the transaction. For community-specific templates, it uses an EXISTS subquery to detect overlap:

```sql
SELECT rpt.RPT_ID FROM `report_template` rpt
WHERE rpt.RPT_NAME=? AND rpt.RPT_DELETED_ON IS NULL AND rpt.RPT_ID!=?
  AND (rpt.RPT_IS_GLOBAL=1
       OR EXISTS (SELECT 1 FROM `report_template_community` rtc
                  WHERE rtc.RTC_RPT_ID=rpt.RPT_ID AND rtc.RTC_DELETED_ON IS NULL
                    AND rtc.RTC_COM_ID IN (?,?,?)))
```

**Error:** `ERR_REPORT_TEMPLATE_NAME_EXISTS` (rc 715).

### 2.2 Lifecycle State Machine & Re-activation (Q2)

```
              activate_template
        ┌────────────────────────────────┐
        │                                │
        ▼          activate_template     │
    ┌───────┐  ──────────────────►  ┌────────┐
    │ DRAFT │                       │ ACTIVE │
    └───────┘  ◄──────────────────  └────────┘
        │          (not supported)       │
        │                                │
        │      archive_template          │  archive_template
        │                                ▼
        │                          ┌──────────┐
        └─────────────────────────►│ ARCHIVED │
               archive_template    └──────────┘
```

**State transitions:**

| Current Status | Action | Target Status | Validation |
|----------------|--------|---------------|------------|
| `draft` | `activate_template` | `active` | Must have ≥1 section, each section must have ≥1 field |
| `draft` | `archive_template` | `archived` | — |
| `active` | `archive_template` | `archived` | — |
| `archived` | `activate_template` | `active` | Must have ≥1 section, each section must have ≥1 field |
| `active` | `activate_template` | — | Returns `ERR_REPORT_TEMPLATE_CANNOT_ACTIVATE` (rc 717) |
| `archived` | `archive_template` | — | Returns `ERR_REPORT_TEMPLATE_CANNOT_ARCHIVE` (rc 718) |

**Re-activation (Q2):** Archived templates can be re-activated via `activate_template`. This provides operational flexibility for seasonal, event-specific, or recurring security report types (e.g., "Holiday Patrol Report") without forcing administrators to reconstruct multi-section schemas. Aligns with lifecycle patterns in POI and Shift Series.

**$Const references:** All status comparisons use `$Const.REPORT_TEMPLATE_STATUS_DRAFT`, `$Const.REPORT_TEMPLATE_STATUS_ACTIVE`, `$Const.REPORT_TEMPLATE_STATUS_ARCHIVED` (registered via `$DataItems.define("report_template_status")` in the constructor).

### 2.3 In-Place Schema Editing & Phase 7.2 Snapshot Mandate (Q3)

**Phase 7.1 behavior:** Active templates can be edited in-place via `update_template`. Both draft and active templates accept updates. Only archived templates are locked (`ERR_REPORT_TEMPLATE_CANNOT_EDIT`, rc 724).

**Phase 7.2 integration mandate:** When `report.js` is implemented, creating a report from a template **must freeze a JSON snapshot** of the template's sections and fields into `incident_report.RPT_CONTENT_SNAPSHOT`. This follows the Post Order Version `POV_CONTENT` pattern:
- The snapshot captures the full section/field hierarchy at report creation time.
- Subsequent edits to the template do not retroactively alter existing reports.
- Report rendering always reads from the frozen snapshot, never from the live template schema.

### 2.4 Restricted Soft-Deletion & Linked Report Guard (Q4)

`delete_template` performs a cascade soft-delete restricted by the following guards:

| Guard | Condition | Error |
|-------|-----------|-------|
| Status check | Template must be in `draft` status | `ERR_REPORT_TEMPLATE_CANNOT_EDIT` (rc 724) |
| Linked reports | Template must have 0 linked reports | `ERR_REPORT_TEMPLATE_HAS_LINKED_REPORTS` (rc 725) |

**Note:** The linked-report check is deferred to Phase 7.2 when the `incident_report` table is created. The placeholder comment is in the code.

**Cascade soft-delete order (inside a single transaction):**
1. `report_template` — set `RPT_DELETED_ON`
2. `report_template_community` — set `RTC_DELETED_ON` for all template communities
3. `report_template_field` — set `RTF_DELETED_ON` for fields belonging to the template's sections (fetched before the transaction)
4. `report_template_section` — set `RTS_DELETED_ON` for all template sections

**Pre-transaction reads:** Section IDs are fetched before `$Db.beginTransaction()` per brain.md convention (no SELECT inside transactions).

### 2.5 Brand Style & Logo Storage (Q5)

`RPT_STYLE` stores a JSON object with the following schema:

```json
{
  "company_logo": "img_rpt_abc123.jpg",
  "accent_color": "#1A2B3C",
  "header_layout": "standard",
  "font": "arial",
  "page_numbering": true,
  "confidentiality_footer": "CONFIDENTIAL – FOR AUTHORISED RECIPIENTS ONLY",
  "date_format": "mm_dd_yyyy",
  "section_breaks": "continuous",
  "include_cover_page": false
}
```

| Field | Type | Validation | Default | Data Item Table |
|-------|------|------------|---------|-----------------|
| `company_logo` | string \| null | Saved via `$Utils.saveNewImageOrKeepOld()`, error checked with `$Err.isERR()` | `null` | — |
| `accent_color` | string \| null | Hex color string (e.g., `#1A2B3C`) | `null` | — |
| `header_layout` | string | `$DataItems.isValidItemId()` | `$Const.REPORT_HEADER_LAYOUT_STANDARD` | `report_header_layout` |
| `font` | string | `$DataItems.isValidItemId()` | `$Const.REPORT_FONT_ARIAL` | `report_font` |
| `page_numbering` | boolean | — | `true` | — |
| `confidentiality_footer` | string \| null | — | `null` | — |
| `date_format` | string | `$DataItems.isValidItemId()` | `$Const.REPORT_DATE_FORMAT_MM_DD_YYYY` | `report_date_format` |
| `section_breaks` | string | `$DataItems.isValidItemId()` | `$Const.REPORT_SECTION_BREAKS_CONTINUOUS` | `report_section_breaks` |
| `include_cover_page` | boolean | — | `false` | — |

**Style endpoints:** Style is managed through dedicated endpoints (`get_template_style`, `update_template_style`) separate from template header/section updates. This separation allows style customization without triggering section replacement logic.

### 2.6 Dual Admin/Officer ACL Scoping (Q6)

Two endpoints grant officer access: `get_templates_list` and `get_template`.

**`get_templates_list` officer behavior:**
- Status is forced to `active` (officer cannot filter by draft/archived).
- Templates are filtered to: `RPT_IS_GLOBAL=1 OR EXISTS(community match)`.
- The officer's community is resolved via `$Funcs.getUserCommunityId(userId)`.
- If the officer has no assigned community, an empty result set is returned immediately (no DB query).

**`get_template` officer behavior:**
- If the template status is not `active`, returns `ERR_REPORT_TEMPLATE_NOT_FOUND` (rc 711).
- If the template is not global, the officer's community must appear in `report_template_community`.
- Failed access checks return `ERR_REPORT_TEMPLATE_NOT_FOUND` (not a 403/unauthorized) to avoid leaking template existence.

**All mutating endpoints** (`create_template`, `update_template`, `duplicate_template`, `archive_template`, `activate_template`, `delete_template`, `get_template_style`, `update_template_style`) are restricted to `USER_TYPE_ADMIN` only.

### 2.7 Field-Level Validation — RTF_IS_REQUIRED (Q7)

Field-level requiredness is orthogonal to section-level requiredness:

| `RTS_IS_REQUIRED` | `RTF_IS_REQUIRED` | Officer experience |
|--------------------|--------------------|--------------------|
| 1 (section required) | 1 (field required) | Must fill this field to submit |
| 1 (section required) | 0 (field optional) | Can leave blank (e.g., "Secondary Vehicle Plate") |
| 0 (section optional) | 1 (field required) | If officer enters anything in the section, this field becomes mandatory |
| 0 (section optional) | 0 (field optional) | Fully optional |

**Implementation:** `is_required` is accepted in the field object within the sections input array. Defaults to `true` (required) when not explicitly set to `false`. Stored as `tinyint unsigned` (`1` or `0`). Returned as a boolean in all field responses (`r.RTF_IS_REQUIRED === 1`).

---

## 3. Data Items

The module registers eight data item tables in the constructor via `$DataItems.define()`:

| Table | Keys | $Const Prefix | Notes |
|-------|------|---------------|-------|
| `report_category` | `incident`, `daily_activity`, `custom` | `REPORT_CATEGORY_*` | Report type classification |
| `report_template_status` | `draft`, `active`, `archived` | `REPORT_TEMPLATE_STATUS_*` | Lifecycle state machine |
| `report_field_type` | `text`, `date`, `location`, `dropdown`, `file_upload`, `digital_signature` | `REPORT_FIELD_TYPE_*` | Field input control type |
| `report_system_field` | `incident_date`, `incident_time`, `incident_location`, `incident_type`, `incident_description`, `officer_name`, `resident_name`, `community_name`, `call_reference`, `priority`, `media`, `officer_comments` | `REPORT_SYSTEM_FIELD_*` | Pre-defined incident fields (each has a `field_type` attribute) |
| `report_header_layout` | `compact`, `standard`, `full_width_banner` | `REPORT_HEADER_LAYOUT_*` | PDF header layout options |
| `report_date_format` | `mm_dd_yyyy`, `dd_mm_yyyy`, `yyyy_mm_dd` | `REPORT_DATE_FORMAT_*` | Date rendering format (each has a `pattern` attribute) |
| `report_section_breaks` | `new_page`, `continuous` | `REPORT_SECTION_BREAKS_*` | PDF section break behavior |
| `report_font` | `arial`, `calibri`, `times_new_roman` | `REPORT_FONT_*` | PDF font family |

---

## 4. Error Codes

Report-range error codes (710–729). Codes 710–714 are shared with the Phase 7.2 Report module.

| Code | Constant | Message | Used By |
|------|----------|---------|---------|
| 710 | `ERR_REPORT_NOT_FOUND` | report not found | Phase 7.2 |
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | report template not found | `get_template`, `update_template`, `duplicate_template`, `archive_template`, `activate_template`, `delete_template`, `get_template_style`, `update_template_style` |
| 712 | `ERR_REPORT_CANNOT_SUBMIT` | report cannot be submitted in its current status | Phase 7.2 |
| 713 | `ERR_REPORT_CANNOT_APPROVE` | report cannot be approved in its current status | Phase 7.2 |
| 714 | `ERR_REPORT_CANNOT_DELIVER` | report cannot be delivered in its current status | Phase 7.2 |
| 715 | `ERR_REPORT_TEMPLATE_NAME_EXISTS` | a template with this name already exists in this community | `create_template`, `update_template`, `duplicate_template` |
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | invalid report category | `create_template`, `update_template`, `get_templates_list` |
| 717 | `ERR_REPORT_TEMPLATE_CANNOT_ACTIVATE` | template cannot be activated in its current status | `activate_template` |
| 718 | `ERR_REPORT_TEMPLATE_CANNOT_ARCHIVE` | template cannot be archived in its current status | `archive_template` |
| 719 | `ERR_REPORT_TEMPLATE_INVALID_FIELD_TYPE` | invalid report field type | `create_template`, `update_template` |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | at least one section is required | `create_template`, `update_template`, `activate_template` |
| 721 | `ERR_REPORT_TEMPLATE_FIELD_REQUIRED` | at least one field is required per section | `create_template`, `update_template`, `activate_template` |
| 722 | `ERR_REPORT_TEMPLATE_INVALID_STATUS` | invalid template status | `get_templates_list` (admin filter validation) |
| 723 | `ERR_REPORT_TEMPLATE_INVALID_COMMUNITY` | one or more community IDs are invalid | `create_template`, `update_template` |
| 724 | `ERR_REPORT_TEMPLATE_CANNOT_EDIT` | template cannot be edited in its current status | `update_template`, `delete_template` |
| 725 | `ERR_REPORT_TEMPLATE_HAS_LINKED_REPORTS` | template cannot be deleted because it has linked reports | `delete_template` (Phase 7.2) |

---

## 5. Runtime Configuration

| Key | Value | Location | Description |
|-----|-------|----------|-------------|
| `REPORT_TEMPLATES_PAGE_SIZE` | `20` | `config/runtime_config.js` | Server-controlled page size for `get_templates_list`. Not a client parameter. |

---

## 6. API Endpoints

The module exposes 10 endpoints through `platform/api/report_template.js`. Registered in `config/using_api.js` as `"report_template"`.

| Endpoint | ACL | Purpose |
|----------|-----|---------|
| `get_templates_list` | Admin, Officer | Paginated list with role-based scoping |
| `get_template` | Admin, Officer | Full template detail with sections and fields |
| `create_template` | Admin | Create draft template |
| `update_template` | Admin | Update header, sections, and fields |
| `duplicate_template` | Admin | Deep-copy into new draft |
| `archive_template` | Admin | Transition to archived |
| `activate_template` | Admin | Transition draft/archived to active |
| `delete_template` | Admin | Cascade soft-delete (draft only) |
| `get_template_style` | Admin | Read style JSON |
| `update_template_style` | Admin | Patch style fields (logo, colors, fonts, layout) |

---

## 7. Cross-Module Hooks & Deferred Requirements

### 7.1 Phase 7.2 — Incident Report Binding

When `incident_report` is implemented:
1. `incident_report.RPT_TEMPLATE_ID` will reference `report_template.RPT_ID`.
2. `incident_report.RPT_CONTENT_SNAPSHOT` will store a frozen JSON of the template's sections and fields at report creation time.
3. `delete_template` will query `incident_report` to enforce the linked-report guard (rc 725).
4. `RPT_REVIEW_BEFORE_CLIENT` and `RPT_ALLOW_OFFICER_EDITING` will drive the report submission/review workflow.
5. `RPT_TITLE_FORMAT` will be evaluated by the report creation engine to auto-generate report titles.

### 7.2 Deferred Roadmap

The following enhancements are tracked for future phases:

| Item | Description | Dependency |
|------|-------------|------------|
| Template versioning history | Major/minor version tracking with version diff display | Phase 7.2 snapshot infrastructure |
| Conditional field logic | Show/hide fields based on dropdown or checkbox values in other fields | UI builder complexity |
| PDF layout preview | Live preview of the formatted report in the template editor | `$Export` PDF renderer integration |
| Template import/export | JSON export/import for sharing templates across deployments | None |
| Default template seeding | System-provided default templates for common report types | Business requirements from Code4 |

### 7.3 Audit Trail

Audit trail triggers are defined in `db/triggers_def.js` for all four tables:

| Table | Tracked Fields | Delete Trigger |
|-------|---------------|----------------|
| `report_template` | name, category, status, title_format, is_global, review/editing flags, style, last_update, deleted_on | No |
| `report_template_community` | deleted_on | No |
| `report_template_section` | deleted_on | No |
| `report_template_field` | deleted_on | No |

Generated SQL: `db/triggers.sql` (AFTER INSERT + AFTER UPDATE for each table).
