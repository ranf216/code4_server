# Report Templates — App Developer Integration Guide

**Module:** `ReportTemplate`
**Phase:** 7.1
**Audience:** Frontend developers (React Web Portal & React Native Mobile App)

---

## 1. Authentication & Access

All Report Template endpoints require a valid session token passed as `#token`.

### Access Control (ACL)

| Role | API Constant | Description |
|------|-------------|-------------|
| `USER_TYPE_ADMIN` (1) | Admin / Manager | Full CRUD: create, edit, duplicate, activate, archive, delete, style management |
| `USER_TYPE_OFFICER` (2) | Officer | Read-only: list active templates for their shift community, view template details |

### Pagination

The `get_templates_list` endpoint uses **0-based page pagination**:
- `page` (integer, default `0`) — 0-based page number.
- Page size is **server-controlled** (`REPORT_TEMPLATES_PAGE_SIZE`, currently `20`). There is no client-supplied page size parameter.
- Response includes `num_of_items` (total count) and `num_of_pages` (total pages).
- Requesting a page out of range (`page < 0` or `page >= num_of_pages`) returns an empty `templates` array with correct `num_of_items` and `num_of_pages`.

---

## 2. Endpoint Directory

### 2.1 `ReportTemplate/get_templates_list`

Returns a paginated list of report templates. Results are automatically scoped by the caller's role.

**ACL:** Admin, Officer

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `community_id` | i | No | `0` | Filter by community (admin only, `0` = all) |
| `status` | s | No | `""` | Filter by status: `draft`, `active`, `archived` (admin only) |
| `category` | s | No | `""` | Filter by category: `incident`, `daily_activity`, `custom` |
| `search_text` | s | No | `""` | Free-text search across template name (LIKE match) |
| `sort_by` | s | No | `name` | Sort column: `name`, `category`, `status`, `last_modified` |
| `sort_dir` | s | No | `asc` | Sort direction: `asc` or `desc` |
| `page` | i | No | `0` | Page number (0-based) |

**Role scoping:**
- **Admin:** Full list. All filter parameters are available. Can filter by `status`, `community_id`, `category`, and `search_text`.
- **Officer:** Sees only `active` templates that are global or assigned to the officer's current shift community. The `status` and `community_id` filters are ignored. If the officer has no assigned community, an empty result set is returned.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "templates": [
    {
      "template_id": 1,
      "name": "Incident Report - Standard",
      "category": "incident",
      "category_name": "Incident",
      "status": "active",
      "status_name": "Active",
      "is_global": false,
      "communities": [
        { "community_id": 5, "community_name": "Sunset Ridge" },
        { "community_id": 12, "community_name": "Oakwood Estates" }
      ],
      "section_count": 4,
      "created_by_name": "Jane Smith",
      "created_on": "2026-09-01 09:00:00",
      "last_modified": "2026-10-15 14:30:00"
    }
  ],
  "num_of_items": 42,
  "num_of_pages": 3
}
```

**Notes:**
- `communities` is an array of `{community_id, community_name}` objects. Empty array for global templates.
- `category_name` and `status_name` are display-friendly labels resolved from data items.
- `section_count` is the count of active (non-deleted) sections.
- `last_modified` is `RPT_LAST_UPDATE` when present, otherwise `RPT_CREATED_ON`.

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | Invalid `category` filter value |
| 722 | `ERR_REPORT_TEMPLATE_INVALID_STATUS` | Invalid `status` filter value (admin) |

---

### 2.2 `ReportTemplate/get_template`

Returns the full template definition including all sections, fields, community assignments, and style metadata.

**ACL:** Admin, Officer

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |

**Role scoping:**
- **Admin:** Can access any non-deleted template.
- **Officer:** Can only access `active` templates that are global or assigned to the officer's community. All other cases return `rc 711` (not found).

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template": {
    "template_id": 1,
    "name": "Incident Report - Standard",
    "category": "incident",
    "category_name": "Incident",
    "status": "active",
    "status_name": "Active",
    "title_format": "Incident Report - {community} - {date}",
    "is_global": false,
    "review_before_client": true,
    "allow_officer_editing": false,
    "style": {
      "company_logo": "img_rpt_abc123.jpg",
      "accent_color": "#1A2B3C",
      "header_layout": "standard",
      "font": "arial",
      "page_numbering": true,
      "confidentiality_footer": "CONFIDENTIAL - FOR AUTHORISED RECIPIENTS ONLY",
      "date_format": "mm_dd_yyyy",
      "section_breaks": "continuous",
      "include_cover_page": false
    },
    "communities": [
      { "community_id": 5, "community_name": "Sunset Ridge" }
    ],
    "sections": [
      {
        "section_id": 10,
        "title": "Incident Details",
        "sort_order": 0,
        "is_enabled": true,
        "is_required": true,
        "client_visible": true,
        "fields": [
          {
            "field_id": 100,
            "field_key": "incident_date",
            "label": "Incident Date",
            "description": null,
            "field_type": "date",
            "config": null,
            "sort_order": 0,
            "is_system_field": true,
            "is_required": true
          },
          {
            "field_id": 101,
            "field_key": "custom_0_1",
            "label": "Secondary Vehicle Plate",
            "description": "Optional plate number for second vehicle",
            "field_type": "text",
            "config": { "max_chars": 20 },
            "sort_order": 1,
            "is_system_field": false,
            "is_required": false
          }
        ]
      }
    ],
    "created_by": "user-uuid-abc",
    "created_by_name": "Jane Smith",
    "created_on": "2026-09-01 09:00:00",
    "last_update": "2026-10-15 14:30:00"
  }
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found, deleted, or officer lacks access |

---

### 2.3 `ReportTemplate/create_template`

Creates a new report template in `draft` status with sections, fields, and community assignments.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `name` | s | Yes | — | Template name (max 80 chars, must be unique within overlapping community scope) |
| `category` | s | Yes | — | Report category: `incident`, `daily_activity`, `custom` |
| `community_ids` | n | Yes | — | Array of community IDs. Empty array `[]` = global template |
| `title_format` | s | Yes | — | Report title pattern (max 500 chars). Placeholders: `{date}`, `{community}`, `{officer}`, `{template_name}`, `{incident_type}` |
| `review_before_client` | b | No | `false` | Route completed reports to manager review before client delivery |
| `allow_officer_editing` | b | No | `false` | Allow officers to edit submitted reports before manager review |
| `sections` | a | Yes | — | Array of section objects (see below) |

**Section object structure:**
```json
{
  "title": "Incident Details",
  "is_enabled": true,
  "is_required": true,
  "client_visible": true,
  "fields": [
    {
      "field_key": "incident_date",
      "label": "Incident Date",
      "description": null,
      "field_type": "date",
      "config": null,
      "is_system_field": true,
      "is_required": true
    },
    {
      "field_key": "custom_notes",
      "label": "Additional Notes",
      "description": "Any extra information about the incident",
      "field_type": "text",
      "config": { "max_chars": 2000 },
      "is_system_field": false,
      "is_required": false
    }
  ]
}
```

**Section fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | Yes | — | Section heading (max 80 chars) |
| `is_enabled` | boolean | No | `true` | Whether the section is active in the template |
| `is_required` | boolean | No | `true` | Whether the officer must complete this section |
| `client_visible` | boolean | No | `true` | Whether the section appears in the client-facing report |
| `fields` | array | Yes | — | Array of field objects (minimum 1 field per section) |

**Field object fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `field_key` | string | Yes | — | System field key (from `report_system_field` data item) or custom identifier (max 50 chars) |
| `label` | string | Yes | — | Field display label (max 80 chars) |
| `description` | string | No | `null` | Help text / placeholder (max 500 chars) |
| `field_type` | string | Yes | — | One of: `text`, `date`, `location`, `dropdown`, `file_upload`, `digital_signature` |
| `config` | object | No | `null` | Type-specific configuration (see Config Options below) |
| `is_system_field` | boolean | No | `false` | `true` for predefined incident fields, `false` for custom |
| `is_required` | boolean | No | `true` | Whether this field is mandatory when filling the report |

**Config options by field type:**

| Field Type | Config Property | Type | Description |
|------------|----------------|------|-------------|
| `text` | `max_chars` | integer | Maximum character count |
| `dropdown` | `dropdown_values` | string[] | Array of dropdown option strings |
| `dropdown` | `is_multi_select` | boolean | Allow multiple selections |
| `file_upload` | `max_files` | integer | Maximum number of file uploads |
| `date`, `location`, `digital_signature` | — | — | No config required |

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 715 | `ERR_REPORT_TEMPLATE_NAME_EXISTS` | Duplicate name in overlapping community scope |
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | Invalid category value |
| 719 | `ERR_REPORT_TEMPLATE_INVALID_FIELD_TYPE` | Unknown field type |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | Empty sections array |
| 721 | `ERR_REPORT_TEMPLATE_FIELD_REQUIRED` | A section has no fields |
| 723 | `ERR_REPORT_TEMPLATE_INVALID_COMMUNITY` | One or more community IDs don't exist |

---

### 2.4 `ReportTemplate/update_template`

Updates template header settings and/or replaces the full section/field structure. All parameters except `template_id` are optional — only provided fields are updated.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |
| `name` | s | No | `/null/` | New template name (max 80 chars) |
| `category` | s | No | `/null/` | New category: `incident`, `daily_activity`, `custom` |
| `community_ids` | n | No | `/null/` | New community IDs. Empty array = global. Omit to keep current |
| `title_format` | s | No | `/null/` | New title pattern (max 500 chars) |
| `review_before_client` | b | No | `/null/` | New review-before-client flag |
| `allow_officer_editing` | b | No | `/null/` | New officer editing flag |
| `sections` | a | No | `/null/` | Full replacement section array (same structure as create). Omit to keep current sections |

**Important:** When `sections` is provided, all existing sections and their fields are soft-deleted and replaced with the new array. This is a full replacement — there is no partial section patching. Omit `sections` entirely to update only header fields without touching the section structure.

**Status restriction:** Only `draft` and `active` templates can be updated. Attempting to update an `archived` template returns `rc 724`.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found or deleted |
| 715 | `ERR_REPORT_TEMPLATE_NAME_EXISTS` | Duplicate name in overlapping community scope |
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | Invalid category value |
| 719 | `ERR_REPORT_TEMPLATE_INVALID_FIELD_TYPE` | Unknown field type in sections |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | Empty sections array |
| 721 | `ERR_REPORT_TEMPLATE_FIELD_REQUIRED` | A section has no fields |
| 723 | `ERR_REPORT_TEMPLATE_INVALID_COMMUNITY` | Invalid community ID |
| 724 | `ERR_REPORT_TEMPLATE_CANNOT_EDIT` | Template is archived |

---

### 2.5 `ReportTemplate/duplicate_template`

Deep-copies an existing template (header, style, sections, fields, community assignments) into a new `draft` template.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Source template ID to duplicate |
| `name` | s | No | `""` | Custom name for the copy. Defaults to `"Copy of <original name>"` (truncated to 80 chars) |

**Behavior:**
- The new template is always created in `draft` status, regardless of the source template's status.
- Style JSON (`RPT_STYLE`) is copied as-is, including the logo file reference.
- Community assignments are duplicated.
- All sections and fields are deep-copied with fresh IDs.
- The `created_by` is set to the calling admin, not the original creator.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 16
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Source template not found or deleted |
| 715 | `ERR_REPORT_TEMPLATE_NAME_EXISTS` | Duplicate name conflict |

---

### 2.6 `ReportTemplate/activate_template`

Transitions a `draft` or `archived` template to `active` status, making it visible to officers for report creation.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |

**Activation prerequisites:**
- Template must have at least one non-deleted section.
- Every section must have at least one non-deleted field.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found or deleted |
| 717 | `ERR_REPORT_TEMPLATE_CANNOT_ACTIVATE` | Template is already `active` |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | Template has no sections |
| 721 | `ERR_REPORT_TEMPLATE_FIELD_REQUIRED` | One or more sections have no fields |

---

### 2.7 `ReportTemplate/archive_template`

Retires an `active` or `draft` template to `archived` status. Archived templates are not available for new reports. Existing reports are unaffected.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found or deleted |
| 718 | `ERR_REPORT_TEMPLATE_CANNOT_ARCHIVE` | Template is already `archived` |

---

### 2.8 `ReportTemplate/delete_template`

Soft-deletes a template and all child records (community assignments, sections, fields). Restricted to `draft` status only.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |

**Restrictions:**
- Only templates in `draft` status can be deleted. Active or archived templates must be archived instead.
- **Phase 7.2:** When the `incident_report` table exists, deletion will also check for linked reports and return `rc 725` if any exist.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found or already deleted |
| 724 | `ERR_REPORT_TEMPLATE_CANNOT_EDIT` | Template is not in draft status |
| 725 | `ERR_REPORT_TEMPLATE_HAS_LINKED_REPORTS` | Template has linked reports (Phase 7.2) |

---

### 2.9 `ReportTemplate/get_template_style`

Returns the template's formatting/style settings as a standalone JSON object.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15,
  "style": {
    "company_logo": "img_rpt_abc123.jpg",
    "accent_color": "#1A2B3C",
    "header_layout": "standard",
    "font": "arial",
    "page_numbering": true,
    "confidentiality_footer": "CONFIDENTIAL - FOR AUTHORISED RECIPIENTS ONLY",
    "date_format": "mm_dd_yyyy",
    "section_breaks": "continuous",
    "include_cover_page": false
  }
}
```

**Style field reference:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `company_logo` | string \| null | `null` | Logo image filename (resolve URL via `File/get_file_url`) |
| `accent_color` | string \| null | `null` | Hex colour for section headings and dividers (e.g., `#1A2B3C`) |
| `header_layout` | string | `standard` | `compact`, `standard`, or `full_width_banner` |
| `font` | string | `arial` | `arial`, `calibri`, or `times_new_roman` |
| `page_numbering` | boolean | `true` | Show page numbers in footer |
| `confidentiality_footer` | string \| null | `null` | Footer text for each page |
| `date_format` | string | `mm_dd_yyyy` | `mm_dd_yyyy`, `dd_mm_yyyy`, or `yyyy_mm_dd` |
| `section_breaks` | string | `continuous` | `new_page` or `continuous` |
| `include_cover_page` | boolean | `false` | Generate a dedicated cover page |

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found or deleted |

---

### 2.10 `ReportTemplate/update_template_style`

Updates individual style fields. Only provided parameters are applied — omitted fields retain their current values.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Report Template ID |
| `company_logo` | s | No | `/null/` | Base64 image data, or empty string `""` to remove the logo |
| `accent_color` | s | No | `/null/` | Hex colour (e.g., `#1A2B3C`), or empty string to clear |
| `header_layout` | s | No | `/null/` | `compact`, `standard`, `full_width_banner` |
| `font` | s | No | `/null/` | `arial`, `calibri`, `times_new_roman` |
| `page_numbering` | b | No | `/null/` | Show page numbers |
| `confidentiality_footer` | s | No | `/null/` | Footer text, or empty string to clear |
| `date_format` | s | No | `/null/` | `mm_dd_yyyy`, `dd_mm_yyyy`, `yyyy_mm_dd` |
| `section_breaks` | s | No | `/null/` | `new_page`, `continuous` |
| `include_cover_page` | b | No | `/null/` | Generate cover page |

**Logo handling:**
- Send a base64-encoded image to upload a new logo. The server saves it via `$Utils.saveNewImageOrKeepOld()`.
- Send an empty string `""` to remove the existing logo.
- Omit the parameter to keep the current logo.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "template_id": 15,
  "style": {
    "company_logo": "img_rpt_new456.jpg",
    "accent_color": "#FF5733",
    "header_layout": "full_width_banner",
    "font": "calibri",
    "page_numbering": true,
    "confidentiality_footer": null,
    "date_format": "dd_mm_yyyy",
    "section_breaks": "new_page",
    "include_cover_page": true
  }
}
```

**Possible errors:**

| rc | Constant | Cause |
|----|----------|-------|
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template not found or deleted |
| (generic) | `ERR_INVALID_API_PARAM` | Invalid `header_layout`, `font`, `date_format`, or `section_breaks` value |

---

## 3. Error Code Directory

All module error codes in the Report range (710–725):

| rc | Constant | Message | Endpoints |
|----|----------|---------|-----------|
| 710 | `ERR_REPORT_NOT_FOUND` | report not found | *Reserved for Phase 7.2* |
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | report template not found | get_template, update_template, duplicate_template, archive_template, activate_template, delete_template, get_template_style, update_template_style |
| 712 | `ERR_REPORT_CANNOT_SUBMIT` | report cannot be submitted in its current status | *Reserved for Phase 7.2* |
| 713 | `ERR_REPORT_CANNOT_APPROVE` | report cannot be approved in its current status | *Reserved for Phase 7.2* |
| 714 | `ERR_REPORT_CANNOT_DELIVER` | report cannot be delivered in its current status | *Reserved for Phase 7.2* |
| 715 | `ERR_REPORT_TEMPLATE_NAME_EXISTS` | a template with this name already exists in this community | create_template, update_template, duplicate_template |
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | invalid report category | create_template, update_template, get_templates_list |
| 717 | `ERR_REPORT_TEMPLATE_CANNOT_ACTIVATE` | template cannot be activated in its current status | activate_template |
| 718 | `ERR_REPORT_TEMPLATE_CANNOT_ARCHIVE` | template cannot be archived in its current status | archive_template |
| 719 | `ERR_REPORT_TEMPLATE_INVALID_FIELD_TYPE` | invalid report field type | create_template, update_template |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | at least one section is required | create_template, update_template, activate_template |
| 721 | `ERR_REPORT_TEMPLATE_FIELD_REQUIRED` | at least one field is required per section | create_template, update_template, activate_template |
| 722 | `ERR_REPORT_TEMPLATE_INVALID_STATUS` | invalid template status | get_templates_list (admin status filter) |
| 723 | `ERR_REPORT_TEMPLATE_INVALID_COMMUNITY` | one or more community IDs are invalid | create_template, update_template |
| 724 | `ERR_REPORT_TEMPLATE_CANNOT_EDIT` | template cannot be edited in its current status | update_template, delete_template |
| 725 | `ERR_REPORT_TEMPLATE_HAS_LINKED_REPORTS` | template cannot be deleted because it has linked reports | delete_template *(Phase 7.2)* |

---

## 4. Data Item Reference

These data items are available for populating dropdowns and validating inputs:

| Data Item Table | Values | UI Usage |
|-----------------|--------|----------|
| `report_category` | `incident`, `daily_activity`, `custom` | Category dropdown in template editor |
| `report_template_status` | `draft`, `active`, `archived` | Status filter in list view, status badge |
| `report_field_type` | `text`, `date`, `location`, `dropdown`, `file_upload`, `digital_signature` | Field type dropdown in section editor |
| `report_system_field` | `incident_date`, `incident_time`, `incident_location`, `incident_type`, `incident_description`, `officer_name`, `resident_name`, `community_name`, `call_reference`, `priority`, `media`, `officer_comments` | System field picker in section editor |
| `report_header_layout` | `compact`, `standard`, `full_width_banner` | Header layout dropdown in style editor |
| `report_font` | `arial`, `calibri`, `times_new_roman` | Font dropdown in style editor |
| `report_date_format` | `mm_dd_yyyy`, `dd_mm_yyyy`, `yyyy_mm_dd` | Date format dropdown in style editor |
| `report_section_breaks` | `new_page`, `continuous` | Section breaks dropdown in style editor |

---

## 5. Integration Notes

### 5.1 Template Name Uniqueness

Template names must be unique within overlapping community scopes:
- A **global** template's name must be unique across all templates (global and community-specific).
- A **community-specific** template's name must not conflict with global templates or any template that shares at least one community assignment.

When a name conflict is detected, the server returns `rc 715`. The UI should display the error message and prompt the user to choose a different name.

### 5.2 Section Replacement Semantics

`update_template` uses full section replacement when the `sections` parameter is provided:
- **Send sections:** All existing sections and fields are soft-deleted, then the provided array is inserted as the new structure. Section and field IDs will change.
- **Omit sections:** Only header fields (name, category, community_ids, etc.) are updated. Existing sections and fields remain untouched.

The client must always send the complete section/field tree when modifying sections. Partial updates (e.g., adding a single field to an existing section) require re-sending the entire sections array.

### 5.3 Style vs. Template Updates

Style settings are managed through dedicated endpoints (`get_template_style` / `update_template_style`), separate from template header and section updates. This separation allows:
- Style changes without triggering section replacement.
- Dedicated UI panels for formatting vs. structure.
- Independent save actions for style and structure.

### 5.4 Phase 7.2 Preview

When Phase 7.2 (Incident Reports) is implemented:
- Officers will select a template from `get_templates_list` to create a new report.
- The `get_template` response provides the full form schema (sections + fields) for rendering the report entry form.
- `review_before_client` and `allow_officer_editing` will drive the report submission workflow.
- The template's section/field structure will be frozen as a snapshot at report creation time. Subsequent template edits will not affect existing reports.
