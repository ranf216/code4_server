# Report Template API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"ReportTemplate/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints require a `#token` field in the request body. Access levels vary per endpoint and are noted individually.

---

## Concepts

### Report Templates

A Report Template defines the structure and formatting of an incident report, daily activity report, or custom report that officers fill out from the mobile app. Managers configure templates in the web portal, deciding which sections to include, which fields appear in each section, and how the final document is formatted.

- Templates are scoped either **globally** (available to all communities) or to **specific communities**.
- Each template consists of one or more **sections**, each containing one or more **fields**.
- Fields can be predefined **system fields** (e.g. Incident Date, Officer Name) or **custom fields** defined by the manager.
- Template names must be unique within overlapping community scopes. A global template name must be unique across all templates. A community-scoped template name must not conflict with global templates or other templates sharing any assigned community.

### Field Constraints

| Element | Limit |
|---------|-------|
| Template Name | Max 80 characters |
| Title Format | Max 500 characters |
| Section Title | Max 80 characters |
| Field Label | Max 80 characters |
| Field Description | Max 500 characters |
| Field Key | Max 50 characters |

### Template Categories

| Value | Display Name |
|-------|-------------|
| `incident` | Incident |
| `daily_activity` | Daily Activity |
| `custom` | Custom |

### Template Status Lifecycle

| Status | Description |
|--------|-------------|
| **Draft** | Template is being edited. Visible to admins only. Not available to officers for report creation. |
| **Active** | Template is live. Visible to officers in their assigned communities (or globally). Available for report creation. Can still be edited in-place by admins. |
| **Archived** | Template is retired. Not available for new reports. Existing reports retain their content. Cannot be edited. |

**Allowed transitions:**

| Action | Allowed From |
|--------|-------------|
| Activate | Draft, Archived |
| Archive | Draft, Active |
| Delete (soft) | Draft only |

An archived template can be restored to Active status.

### Field Types

| Value | Display Name | Config |
|-------|-------------|--------|
| `text` | Text | Optional `max_chars` (integer) |
| `date` | Date | None |
| `location` | Location | None |
| `dropdown` | Dropdown | `dropdown_values` (string array), optional `is_multi_select` (boolean) |
| `file_upload` | File Upload | Optional `max_files` (integer) |
| `digital_signature` | Digital Signature | None |

### System Fields

These predefined field keys can be used in any section. When selected, the label and field type are set by the system.

| Key | Display Name | Type |
|-----|-------------|------|
| `incident_date` | Incident Date | date |
| `incident_time` | Incident Time | text |
| `incident_location` | Incident Location | location |
| `incident_type` | Incident Type | dropdown |
| `incident_description` | Incident Description | text |
| `officer_name` | Officer Name | text |
| `resident_name` | Resident Name | text |
| `community_name` | Community Name | text |
| `call_reference` | Call Reference | text |
| `priority` | Priority | dropdown |
| `media` | Media | file_upload |
| `officer_comments` | Officer Comments | text |

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| **Admin** | Full CRUD: create, edit, duplicate, activate, archive, delete, manage style. Can view templates in all statuses. |
| **Officer** | Read-only: list and view active templates that are global or assigned to the officer's current shift community. |

---

## Endpoints — List & Detail

### POST ReportTemplate/get_templates_list
*Admin or Officer.* Retrieves a paginated, filterable list of report templates. Results are automatically scoped by the caller's role.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `community_id` | integer | No | Filter by community ID. Admin only; `0` or omitted returns all communities. Ignored for officers. |
    | `status` | string | No | Filter by status: `draft`, `active`, `archived`. Admin only. Ignored for officers. |
    | `category` | string | No | Filter by category: `incident`, `daily_activity`, `custom`. |
    | `search_text` | string | No | Free-text search across template name. |
    | `sort_by` | string | No | Sort column: `name` (default), `category`, `status`, `last_modified`. |
    | `sort_dir` | string | No | Sort direction: `asc` (default) or `desc`. |
    | `page` | integer | No | Page number (0-based). Default: `0`. |

- **Return Values:**
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
                    {
                        "community_id": 5,
                        "community_name": "Sunset Ridge"
                    }
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

    | Field | Type | Description |
    |-------|------|-------------|
    | `template_id` | integer | Unique template identifier. |
    | `name` | string | Template name. |
    | `category` | string | Category identifier: `incident`, `daily_activity`, or `custom`. |
    | `category_name` | string | Human-readable category label. |
    | `status` | string | Current status: `draft`, `active`, or `archived`. |
    | `status_name` | string | Human-readable status label. |
    | `is_global` | boolean | `true` if the template is available to all communities. |
    | `communities` | array | List of assigned communities, each with `community_id` and `community_name`. Empty for global templates. |
    | `section_count` | integer | Number of active sections. |
    | `created_by_name` | string or `null` | Full name of the creator. |
    | `created_on` | string | Datetime of creation. |
    | `last_modified` | string or `null` | Datetime of last modification. Falls back to `created_on` if never modified. |
    | `num_of_items` | integer | Total number of matching records (for pagination). |
    | `num_of_pages` | integer | Total number of pages. |

    Page size is server-controlled (currently 20). Requesting a page beyond the last page returns an empty `templates` array with the correct `num_of_items` and `num_of_pages`.

    **Officer scoping:** Officers always receive only `active` templates that are either global or assigned to the officer's current shift community. The `status` and `community_id` filter parameters are ignored for officers.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter is missing or invalid. |
    | 201 | invalid user token | Invalid or expired token. |
    | 716 | invalid report category | The `category` filter value is not a valid category. |
    | 722 | invalid template status | The `status` filter value is not a valid status (admin only). |

- **Usage & Flows:**
    Called by the management portal to populate the Template List view (SDS 4.12.1). The `status` filter maps to the status tabs (All / Active / Drafts / Archived). The `community_id` filter maps to the Community dropdown. The `category` filter maps to the Category dropdown. Officers call this endpoint from the mobile app when selecting a template to create a new report; the API automatically scopes results to the officer's active-shift community.

---

### POST ReportTemplate/get_template
*Admin or Officer.* Retrieves full details of a single report template including all sections, fields, community assignments, and style settings.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `template_id` | integer | Yes | The Report Template ID to retrieve. |

- **Return Values:**
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
                "confidentiality_footer": "CONFIDENTIAL",
                "date_format": "mm_dd_yyyy",
                "section_breaks": "continuous",
                "include_cover_page": false
            },
            "communities": [
                {
                    "community_id": 5,
                    "community_name": "Sunset Ridge"
                }
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

    The `template` object contains all header fields from `get_templates_list`, plus:

    | Field | Type | Description |
    |-------|------|-------------|
    | `title_format` | string | Report title pattern with placeholders (`{date}`, `{community}`, `{officer}`, `{template_name}`, `{incident_type}`). |
    | `review_before_client` | boolean | Whether completed reports are routed to manager review before client delivery. |
    | `allow_officer_editing` | boolean | Whether officers can edit submitted reports before manager review. |
    | `style` | object | Formatting/style settings (see `get_template_style` for field details). |
    | `communities` | array | Assigned communities, each with `community_id` and `community_name`. |
    | `sections` | array | Ordered list of section objects. |
    | `created_by` | string | User ID of the creator. |
    | `created_by_name` | string or `null` | Full name of the creator. |
    | `last_update` | string or `null` | Datetime of last modification. |

    **Section object fields:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `section_id` | integer | Unique section identifier. |
    | `title` | string | Section heading (max 80 characters). |
    | `sort_order` | integer | Display order (0-based). |
    | `is_enabled` | boolean | Whether the section is active in the template. |
    | `is_required` | boolean | Whether the officer must complete this section. |
    | `client_visible` | boolean | Whether the section appears in the client-facing report. |
    | `fields` | array | Ordered list of field objects within this section. |

    **Field object fields:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `field_id` | integer | Unique field identifier. |
    | `field_key` | string | System field key or custom identifier. |
    | `label` | string | Display label. |
    | `description` | string or `null` | Help text. |
    | `field_type` | string | One of: `text`, `date`, `location`, `dropdown`, `file_upload`, `digital_signature`. |
    | `config` | object or `null` | Type-specific configuration (e.g. `{"max_chars": 2000}` for text, `{"dropdown_values": ["A","B"], "is_multi_select": false}` for dropdown). |
    | `sort_order` | integer | Display order within the section (0-based). |
    | `is_system_field` | boolean | `true` for predefined incident fields, `false` for custom fields. |
    | `is_required` | boolean | Whether this field is mandatory when filling the report. |

    **Officer scoping:** Officers can only access `active` templates that are global or assigned to their community. All other cases return `rc 711`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, the template has been deleted, or the officer does not have access. |

- **Usage & Flows:**
    Called when opening a template from the list view (SDS 4.12.2) to populate the Template Editor, or by the officer mobile app to render the report creation form. The `sections` array provides the complete form schema. The `style` object provides formatting settings for PDF generation.

---

## Endpoints — Create & Update

### POST ReportTemplate/create_template
*Admin only.* Creates a new report template in Draft status with sections, fields, and community assignments.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `name` | string | Yes | Template name. Must be unique within overlapping community scope. Max 80 characters. |
    | `category` | string | Yes | Report category: `incident`, `daily_activity`, or `custom`. |
    | `community_ids` | array | Yes | Array of community IDs. Empty array `[]` creates a global template. |
    | `title_format` | string | Yes | Report title pattern. Max 500 characters. Supports placeholders: `{date}`, `{community}`, `{officer}`, `{template_name}`, `{incident_type}`. |
    | `review_before_client` | boolean | No | Route completed reports to manager review before client delivery. Default: `false`. |
    | `allow_officer_editing` | boolean | No | Allow officers to edit submitted reports before manager review. Default: `false`. |
    | `sections` | array | Yes | Array of section objects (at least one required). Each section must have at least one field. |

    **Section object:**

    | Field | Type | Required | Description |
    |-------|------|----------|-------------|
    | `title` | string | Yes | Section heading. Max 80 characters. |
    | `is_enabled` | boolean | No | Whether the section is active. Default: `true`. |
    | `is_required` | boolean | No | Whether the officer must complete this section. Default: `true`. |
    | `client_visible` | boolean | No | Whether the section appears in the client-facing report. Default: `true`. |
    | `fields` | array | Yes | Array of field objects (at least one required). |

    **Field object:**

    | Field | Type | Required | Description |
    |-------|------|----------|-------------|
    | `field_key` | string | Yes | System field key (from the System Fields list) or a custom identifier. Max 50 characters. |
    | `label` | string | Yes | Display label. Max 80 characters. |
    | `description` | string | No | Help text. Max 500 characters. |
    | `field_type` | string | Yes | One of: `text`, `date`, `location`, `dropdown`, `file_upload`, `digital_signature`. |
    | `config` | object | No | Type-specific configuration (see Field Types table above). |
    | `is_system_field` | boolean | No | `true` for predefined incident fields. Default: `false`. |
    | `is_required` | boolean | No | Whether this field is mandatory when filling the report. Default: `true`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "template_id": 15
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `template_id` | integer | The ID of the newly created template. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter is missing (e.g. empty name, missing title_format). |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 105 | invalid api param | A parameter value exceeds its max length (e.g. name > 80 characters, title_format > 500 characters). |
    | 201 | invalid user token | Invalid or expired token. |
    | 715 | a template with this name already exists in this community | Duplicate name within overlapping community scope. |
    | 716 | invalid report category | The `category` value is not valid. |
    | 719 | invalid report field type | A field has an unrecognised `field_type`. |
    | 720 | at least one section is required | The `sections` array is empty. |
    | 721 | at least one field is required per section | A section has an empty `fields` array. |
    | 723 | one or more community IDs are invalid | One or more IDs in `community_ids` do not correspond to an existing community. |

- **Usage & Flows:**
    Called from the Template Editor (SDS 4.12.2) when the manager clicks "Save" after filling in the header settings and building the section structure. The new template is always created in Draft status. To make it available to officers, follow up with `activate_template`.

---

### POST ReportTemplate/update_template
*Admin only.* Updates template header settings and/or replaces the full section/field structure. Only provided parameters are applied — omitted fields retain their current values.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The Report Template ID to update. |
    | `name` | string | No | New template name. Max 80 characters. |
    | `category` | string | No | New category: `incident`, `daily_activity`, or `custom`. |
    | `community_ids` | array | No | New community IDs. Empty array switches to global. Omit to keep current assignments. |
    | `title_format` | string | No | New title pattern. Max 500 characters. |
    | `review_before_client` | boolean | No | New review-before-client setting. |
    | `allow_officer_editing` | boolean | No | New officer editing setting. |
    | `sections` | array | No | Full replacement section array (same structure as `create_template`). Omit to keep current sections. |

    **Important:** When `sections` is provided, all existing sections and their fields are replaced with the new array. This is a full replacement — there is no partial section patching. Section and field IDs will change. Omit `sections` entirely to update only header fields without touching the section structure.

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "template_id": 15
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, or it has been deleted. |
    | 715 | a template with this name already exists in this community | Duplicate name within overlapping community scope. |
    | 716 | invalid report category | The `category` value is not valid. |
    | 719 | invalid report field type | A field has an unrecognised `field_type`. |
    | 720 | at least one section is required | The `sections` array is empty. |
    | 721 | at least one field is required per section | A section has an empty `fields` array. |
    | 723 | one or more community IDs are invalid | One or more IDs in `community_ids` do not correspond to an existing community. |
    | 724 | template cannot be edited in its current status | The template is archived. Archive templates cannot be edited. |

- **Usage & Flows:**
    Called from the Template Editor (SDS 4.12.2) when the manager saves changes. The consumer should send only the fields that changed. If the section structure was modified (sections added, removed, reordered, or fields changed), the consumer must send the complete `sections` array. If only header fields changed (name, category, etc.), omit `sections` to avoid unnecessary section replacement.

---

### POST ReportTemplate/duplicate_template
*Admin only.* Deep-copies an existing template (header, style, sections, fields, community assignments) into a new Draft template.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The source Report Template ID to duplicate. |
    | `name` | string | No | Custom name for the copy. Default: `"Copy of <original name>"` (truncated to 80 characters if needed). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "template_id": 16
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `template_id` | integer | The ID of the newly created duplicate template. |

    The duplicate is always created in `draft` status regardless of the source template's status. The `created_by` is set to the calling admin. Style settings (including the logo reference) and community assignments are copied.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | The source template does not exist or has been deleted. |
    | 715 | a template with this name already exists in this community | The duplicate name conflicts with an existing template. |

- **Usage & Flows:**
    Called from the Template List action menu (SDS 4.12.1) when the manager clicks "Duplicate". After creation, the consumer should navigate to the Template Editor for the new template ID to allow the manager to review and modify the copy before activating it.

---

## Endpoints — Status Transitions

### POST ReportTemplate/activate_template
*Admin only.* Transitions a Draft or Archived template to Active status, making it visible to officers for report creation.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The Report Template ID to activate. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "template_id": 15
    }
    ```

    **Activation prerequisites:** The template must have at least one section, and every section must have at least one field. These are validated before activation.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, or it has been deleted. |
    | 717 | template cannot be activated in its current status | The template is already Active. |
    | 720 | at least one section is required | The template has no sections. |
    | 721 | at least one field is required per section | One or more sections have no fields. |

- **Usage & Flows:**
    Called from the Template List action menu or the Template Editor (SDS 4.12.2.3) when the manager activates a template. For Draft templates, this is the final step before officers can use the template. For Archived templates, this restores the template to Active status.

---

### POST ReportTemplate/archive_template
*Admin only.* Retires a template to Archived status. Archived templates are not available for new reports. Existing reports are unaffected.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The Report Template ID to archive. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "template_id": 15
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, or it has been deleted. |
    | 718 | template cannot be archived in its current status | The template is already Archived. |

- **Usage & Flows:**
    Called from the Template List action menu (SDS 4.12.1, 4.12.2.3) when the manager archives a template. The consumer should show a confirmation dialog before calling this endpoint. After archiving, the template remains in the list with an "Archived" badge and can be restored via `activate_template`.

---

### POST ReportTemplate/delete_template
*Admin only.* Soft-deletes a template and all its child records (community assignments, sections, fields). Only Draft templates can be deleted.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The Report Template ID to delete. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "template_id": 15
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, or it has already been deleted. |
    | 724 | template cannot be edited in its current status | The template is not in Draft status. Active or Archived templates must be archived instead of deleted. |
    | 725 | template cannot be deleted because it has linked reports | The template has linked incident reports and cannot be removed. |

- **Usage & Flows:**
    Called from the Template List action menu (SDS 4.12.1) when the manager deletes a draft template. The consumer should show a destructive confirmation dialog. The "Delete" action should only be presented for templates in Draft status. For Active or Archived templates, offer "Archive" instead.

---

## Endpoints — Style / Formatting

### POST ReportTemplate/get_template_style
*Admin only.* Returns the template's formatting/style settings as a standalone object.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The Report Template ID. |

- **Return Values:**
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
            "confidentiality_footer": "CONFIDENTIAL – FOR AUTHORISED RECIPIENTS ONLY",
            "date_format": "mm_dd_yyyy",
            "section_breaks": "continuous",
            "include_cover_page": false
        }
    }
    ```

    **Style object fields:**

    | Field | Type | Default | Description |
    |-------|------|---------|-------------|
    | `company_logo` | string or `null` | `null` | Logo image filename. Resolve the download URL via the File API. |
    | `accent_color` | string or `null` | `null` | Hex colour for section headings and dividers (e.g. `#1A2B3C`). |
    | `header_layout` | string | `standard` | One of: `compact`, `standard`, `full_width_banner`. |
    | `font` | string | `arial` | One of: `arial`, `calibri`, `times_new_roman`. |
    | `page_numbering` | boolean | `true` | Show page numbers in the footer. |
    | `confidentiality_footer` | string or `null` | `null` | Footer text printed on each page. |
    | `date_format` | string | `mm_dd_yyyy` | One of: `mm_dd_yyyy`, `dd_mm_yyyy`, `yyyy_mm_dd`. |
    | `section_breaks` | string | `continuous` | One of: `new_page`, `continuous`. |
    | `include_cover_page` | boolean | `false` | Generate a dedicated cover page with report title, site name, officer name, date, and logo. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, or it has been deleted. |

- **Usage & Flows:**
    Called when opening the Template Formatting panel (SDS 4.12.3). The style settings are managed independently from the template header and sections, allowing the manager to adjust formatting without affecting the section structure.

---

### POST ReportTemplate/update_template_style
*Admin only.* Updates individual style fields. Only provided parameters are applied — omitted fields retain their current values.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `template_id` | integer | Yes | The Report Template ID. |
    | `company_logo` | string | No | Base64-encoded image data to upload a new logo, or empty string `""` to remove the existing logo. Omit to keep current. |
    | `accent_color` | string | No | Hex colour (e.g. `#FF5733`), or empty string `""` to clear. |
    | `header_layout` | string | No | One of: `compact`, `standard`, `full_width_banner`. |
    | `font` | string | No | One of: `arial`, `calibri`, `times_new_roman`. |
    | `page_numbering` | boolean | No | Show page numbers in the footer. |
    | `confidentiality_footer` | string | No | Footer text, or empty string `""` to clear. |
    | `date_format` | string | No | One of: `mm_dd_yyyy`, `dd_mm_yyyy`, `yyyy_mm_dd`. |
    | `section_breaks` | string | No | One of: `new_page`, `continuous`. |
    | `include_cover_page` | boolean | No | Generate a cover page. |

- **Return Values:**
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

    The response includes the full `style` object after the update, reflecting both the changed and unchanged fields.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 105 | invalid api param | A dropdown-type style field has an invalid value (e.g. unknown `header_layout`, `font`, `date_format`, or `section_breaks`). The error includes a description of which field is invalid. |
    | 201 | invalid user token | Invalid or expired token. |
    | 711 | report template not found | No template exists with the given ID, or it has been deleted. |

- **Usage & Flows:**
    Called from the Template Formatting panel (SDS 4.12.3, 4.12.3.1) when the manager saves formatting changes. The consumer should send only the fields that the manager changed. The returned `style` object can be used to refresh the local state. For the company logo, send base64-encoded image data to upload; send an empty string to remove; omit the field to keep the current logo.

---
