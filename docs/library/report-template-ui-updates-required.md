# Report Templates — UI Updates Required

**Phase:** 7.1
**SDS References:** §4.12 (Admin Portal — Template Management), §4.12.1 (Template List), §4.12.2 (Create/Edit), §4.12.3 (Formatting)

This document specifies the required user interface changes for the Web Admin Portal and the Officer Mobile App to integrate with the Report Templates server module.

---

## 1. Web Admin Management Portal

### 1.1 Template Directory Workspace (SDS §4.12.1)

**Route:** `/report-templates`

**Data source:** `ReportTemplate/get_templates_list`

#### 1.1.1 List Columns

| Column | Source Field | Description |
|--------|-------------|-------------|
| Template Name | `name` | Link — opens the template editor |
| Community / Site | `communities[]` | Comma-separated community names, or **"Global"** badge when `is_global` is `true` |
| Report Category | `category_name` | Display name (e.g., "Incident", "Daily Activity", "Custom") |
| Sections | `section_count` | Integer count of active sections |
| Status | `status_name` | Badge: **Draft** (grey), **Active** (green), **Archived** (amber) |
| Last Modified | `last_modified` | Date/time of the most recent change |
| Actions | — | Context menu (see below) |

#### 1.1.2 Filters (Above List)

| Filter | Type | API Parameter | Details |
|--------|------|---------------|---------|
| Status tabs | Tab bar | `status` | Four tabs: **All** (no filter), **Active**, **Drafts**, **Archived**. Active tab = default |
| Community | Dropdown (single-select) | `community_id` | Populated from the community list. Default: "All Communities" (`0`) |
| Category | Dropdown (single-select) | `category` | Options from `report_category` data item: Incident, Daily Activity, Custom. Default: empty (all) |
| Search | Text input | `search_text` | Free-text search across template name. Debounce 300ms |

**Sorting:** Clickable column headers. Supported sort columns: `name`, `category`, `status`, `last_modified`. Default: `name ASC`.

**Pagination:** 0-based page. Display page selector using `num_of_items` and `num_of_pages` from the response. Server-controlled page size (20).

#### 1.1.3 Actions

**Top-level actions:**
- **"New Template"** button (top right) — navigates to the template editor in creation mode.

**Row action menu** (context menu or action column):

| Action | Condition | API Call | Behavior |
|--------|-----------|----------|----------|
| Edit | Any non-archived | Navigate | Opens template editor |
| Duplicate | Any status | `duplicate_template` | Creates a draft copy, then navigates to the new template editor |
| Activate | `draft` or `archived` | `activate_template` | Confirm dialog: "Activate this template? It will become available to officers." Refresh list on success |
| Archive | `draft` or `active` | `archive_template` | Confirm dialog: "Archive this template? It will no longer be available for new reports." Refresh list on success |
| Delete | `draft` only | `delete_template` | Destructive confirm dialog (red): "Permanently delete this draft template? This action cannot be undone." Refresh list on success. Handle `rc 724` (not draft) and `rc 725` (linked reports) with toast |

**Visibility rules:**
- **Activate** is hidden when status is `active`.
- **Archive** is hidden when status is `archived`.
- **Delete** is hidden when status is `active` or `archived`.

---

### 1.2 Template Editor Workspace (SDS §4.12.2)

**Routes:** `/report-templates/new` (create) or `/report-templates/:id/edit` (edit)

**Data source (edit mode):** `ReportTemplate/get_template`

The editor is divided into three panels: the **Header Panel** (template metadata), the **Section Builder** (form structure), and the **Style Studio** (formatting settings accessed via a tab or drawer).

#### 1.2.1 Header Panel (SDS §4.12.2.1)

| Field | Type | Required | Max Length | Create Mode | Edit Mode |
|-------|------|----------|------------|-------------|-----------|
| Template Name | Text input | Yes | 80 chars | Editable | Editable |
| Report Category | Dropdown | Yes | — | Editable. Options: `Incident`, `Daily Activity`, `Custom` (from `report_category` data item) | Editable |
| Community / Site | Multi-select picker | Yes | — | See §1.3 | See §1.3 |
| Report Title Format | Text input | Yes | 500 chars | Editable. Show placeholder hint: `"e.g., Incident Report - {community} - {date}"`. Display available placeholder chips below the input: `{date}`, `{community}`, `{officer}`, `{template_name}`, `{incident_type}` | Editable |
| Status | Badge | — | — | Auto-set to "Draft" (read-only) | Read-only badge |
| Review Before Client | Toggle switch | No | — | Default: Off. Label: "Route to manager review before client delivery" | Editable |
| Allow Officer Editing | Toggle switch | No | — | Default: Off. Label: "Allow officers to edit submitted reports" | Editable |
| Created By | Text | — | — | Hidden (not yet created) | Read-only. Display `created_by_name` |
| Created On | Timestamp | — | — | Hidden | Read-only |
| Last Update | Timestamp | — | — | Hidden | Read-only. Display `last_update` |

**Save behavior:**
- **Create mode:** Calls `ReportTemplate/create_template`. On success, navigates to edit mode with the returned `template_id`.
- **Edit mode:** Calls `ReportTemplate/update_template`. Only send changed fields. If sections were modified, send the full `sections` array. If only header fields changed, omit `sections` to avoid unnecessary section replacement.

#### 1.2.2 Section Builder (SDS §4.12.2.2)

The section builder is a vertically-stacked list of draggable section cards. The order of sections in the visual list maps to the `sort_order` values in the API payload.

**Section card elements:**

| Element | Type | Required | Details |
|---------|------|----------|---------|
| Drag handle | Icon | — | Vertical grip icon on the left edge. Drag-and-drop to reorder sections |
| Section Title | Text input | Yes | Max 80 characters. Placeholder: "Section Title" |
| Enabled toggle | Switch | Yes | Default: On. Label: "Enabled". When Off, section is excluded from the officer form and report output |
| Required toggle | Switch | Yes | Default: On. Label: "Required". When On, officers must complete this section |
| Client-Visible toggle | Switch | Yes | Default: On. Label: "Visible to Client". When Off, section is internal-only |
| Field list | Nested list | Yes | Ordered list of field editors within the section (see below) |
| Add Field button | Button | — | "Add Field" — appends a new blank field editor to the bottom of the section's field list |
| Remove Section button | Icon button | — | Trash icon. Confirm dialog: "Remove this section and all its fields?" |

**"Add Section" button:** Positioned below the last section card. Appends a new empty section card.

**Minimum:** At least one section with at least one field is required. Validate before save. If validation fails on save, show inline errors on the empty section(s).

#### 1.2.3 Field Editor (SDS §4.12.2.2.1)

Each field within a section is a collapsible row or card:

| Element | Type | Required | Details |
|---------|------|----------|---------|
| Drag handle | Icon | — | Reorder fields within the section |
| Field Source | Radio / Toggle | Yes | **System Field** or **Custom Field** (maps to `is_system_field`) |
| System Field Picker | Dropdown | Yes (if system) | Shown when source = System Field. Populated from `report_system_field` data item. Available options: Incident Date, Incident Time, Incident Location, Incident Type, Incident Description, Officer Name, Resident Name, Community Name, Call Reference, Priority, Media, Officer Comments. Selecting a system field auto-populates `field_key`, `label`, `field_type`, and `is_system_field=true`. Auto-populated fields should be visible but read-only |
| Field Key | Text input | Yes (if custom) | Shown when source = Custom Field. Auto-generated as `custom_{sectionIdx}_{fieldIdx}` but editable. Max 50 chars |
| Label | Text input | Yes | Display label. Max 80 chars. Auto-filled from system field name if applicable |
| Description | Text input | No | Help text / placeholder. Max 500 chars |
| Field Type | Dropdown | Yes | Options from `report_field_type` data item: Text, Date, Location, Dropdown, File Upload, Digital Signature. Auto-set for system fields |
| Required toggle | Switch | Yes | Default: On. Label: "Required". Maps to `is_required` (RTF_IS_REQUIRED) |
| Config panel | Dynamic | Conditional | Type-specific configuration (see below) |
| Remove Field button | Icon button | — | Trash icon. Removes the field from the section |

**Type-specific config panels:**

| Field Type | Config UI | API Config Object |
|------------|-----------|-------------------|
| **Text** | "Max Characters" number input (optional) | `{ "max_chars": 2000 }` |
| **Date** | No additional config | `null` |
| **Location** | No additional config | `null` |
| **Dropdown** | "Options" — tag input or list editor for dropdown values. "Allow Multiple Selections" toggle | `{ "dropdown_values": ["Option A", "Option B"], "is_multi_select": false }` |
| **File Upload** | "Max Files" number input (optional) | `{ "max_files": 5 }` |
| **Digital Signature** | No additional config | `null` |

---

### 1.3 Community Assignment Picker

**Location:** Header Panel, "Community / Site" field.

**Component:** Multi-select community picker with a master "Global" checkbox.

| Element | Behavior |
|---------|----------|
| "Global Template (All Communities)" checkbox | When checked: clears individual community selections, disables the community multi-select. Sends `community_ids: []` to the API |
| Community multi-select | Populated from the community list. Searchable. When communities are selected: unchecks the Global checkbox. Sends `community_ids: [5, 12, ...]` |

**Validation:**
- At least one community must be selected, OR the Global checkbox must be checked.
- Display inline error if neither condition is met on save.

**Edit mode:** Pre-populate from `template.communities[]` (community-specific) or check the Global checkbox (when `template.is_global` is `true`).

---

### 1.4 Brand Styling & Formatting Studio (SDS §4.12.3)

**Data source:** `ReportTemplate/get_template_style`
**Save action:** `ReportTemplate/update_template_style`

The style editor can be implemented as a separate tab within the template editor, or as a slide-out drawer accessible via a "Format" button. Style changes are saved independently from template header/section changes.

#### 1.4.1 Style Fields

| Field | UI Control | API Parameter | Details |
|-------|-----------|---------------|---------|
| Company Logo | Image uploader | `company_logo` | Accept JPEG/PNG. Show current logo preview with a "Remove" button. Upload sends base64 data; remove sends empty string `""` |
| Accent Colour | Colour picker | `accent_color` | Hex colour input with visual picker. Used for section heading bars and dividers. Optional — show "Clear" button to reset to `null` |
| Header Layout | Dropdown | `header_layout` | Options: **Compact** (logo + title on one line), **Standard** (logo left, title and metadata right), **Full-width Banner**. Default: Standard |
| Font | Dropdown | `font` | Options: **Arial** (default), **Calibri**, **Times New Roman** |
| Page Numbering | Toggle switch | `page_numbering` | Default: On. "Show page numbers in footer" |
| Confidentiality Footer | Text input | `confidentiality_footer` | Optional. Placeholder: `"e.g., CONFIDENTIAL – FOR AUTHORISED RECIPIENTS ONLY"`. Appears on each page footer |
| Date Format | Dropdown | `date_format` | Options: **MM/DD/YYYY**, **DD/MM/YYYY**, **YYYY-MM-DD**. Applies to all dates in the generated report. Default: MM/DD/YYYY |
| Section Breaks | Dropdown | `section_breaks` | Options: **Each section on a new page**, **Continuous (separated by line)**. Default: Continuous |
| Include Cover Page | Toggle switch | `include_cover_page` | Default: Off. "Generate a dedicated cover page with report title, site name, officer name, date, and logo" |

#### 1.4.2 Style Save Behavior

- Style fields are saved independently from the template structure.
- Only send parameters that the user changed (the API is patch-style; omitted fields keep current values).
- On successful save, update the local style state from the `style` object in the response.
- Show a "Saved" toast on success.

---

## 2. Officer Mobile App

### 2.1 Template Selection Sheet (Phase 7.2 Integration)

**Data source:** `ReportTemplate/get_templates_list` (officer session automatically scopes to active templates for the officer's shift community).

**When shown:** When the officer initiates "Write a Report" (either standalone from the Reports page, or incident-linked from a call page). This is a Phase 7.2 feature — the UI component should be built during Phase 7.1 frontend development to be ready for integration.

#### 2.1.1 Template List

| Element | Details |
|---------|---------|
| Layout | Grid (2 columns) or single-column list. User preference or based on device width |
| Card content | Template name (bold), category badge (Incident / Daily Activity / Custom), section count indicator (e.g., "4 sections"), community name or "Global" badge |
| Empty state | "No report templates are available for your community." |
| Loading | Skeleton cards (4 placeholders) |
| Refresh | Pull-to-refresh gesture triggers `get_templates_list` reload |

**Sorting:** Default alphabetical by name. No user-configurable sorting needed — the list is expected to be short (typically 3–10 templates per community).

**Selection:** Tapping a card either navigates directly to the report creation form (Phase 7.2) or opens the Template Details Card (§2.2) for preview.

#### 2.1.2 Category Grouping (Optional Enhancement)

If more than 5 templates are returned, group them by `category_name` with section headers:
- **Incident**
- **Daily Activity**
- **Custom**

### 2.2 Template Details Card

**Data source:** `ReportTemplate/get_template` (called with the selected `template_id`)

Displays a read-only preview of the template structure before the officer commits to starting a report.

#### 2.2.1 Card Layout

| Element | Source | Details |
|---------|--------|---------|
| Template Name | `template.name` | Large text, top of card |
| Category | `template.category_name` | Badge below name |
| Community | `template.communities[].community_name` or "Global" | Subtitle text |
| Section Breakdown | `template.sections[]` | Ordered list of section titles. For each section, show: title, required badge (if `is_required`), field count, enabled/disabled indicator |
| Required Fields Indicator | Computed | Count of required fields across all enabled sections: "X required fields" |
| Estimated Completion | Computed (optional) | Rough estimate based on field count and types. E.g., "~10 min" at ~1 min per field. This is a soft UX enhancement, not a server value |

#### 2.2.2 Section Preview List

For each section in `template.sections[]`:

| Element | Details |
|---------|---------|
| Section title | Bold text. Show strikethrough or greyed-out style if `is_enabled` is `false` |
| Required badge | Small "Required" badge if `is_required` is `true` |
| Client-visible indicator | Eye icon if `client_visible` is `true`. Hidden-eye icon if `false` |
| Field list | Collapsed by default. Expandable to show field labels with type icons and required indicators |

#### 2.2.3 Action Buttons

| Button | Behavior |
|--------|----------|
| "Start Report" | Primary action. Navigates to the report creation form (Phase 7.2), passing the `template_id` |
| "Back" / Dismiss | Returns to the template selection sheet |

---

## 3. Shared UI Components

### 3.1 Status Badge Component

Reusable badge component for template status:

| Status | Colour | Label |
|--------|--------|-------|
| `draft` | Grey (#6B7280) | Draft |
| `active` | Green (#10B981) | Active |
| `archived` | Amber (#F59E0B) | Archived |

### 3.2 Category Badge Component

| Category | Colour | Label |
|----------|--------|-------|
| `incident` | Red (#EF4444) | Incident |
| `daily_activity` | Blue (#3B82F6) | Daily Activity |
| `custom` | Purple (#8B5CF6) | Custom |

### 3.3 Global Badge

When `is_global` is `true`, display a "Global" badge (teal, #14B8A6) in place of community names.

### 3.4 Field Type Icons

| Field Type | Suggested Icon | Description |
|------------|---------------|-------------|
| `text` | Text cursor / "Aa" | Free text input |
| `date` | Calendar | Date picker |
| `location` | Map pin | GPS / address |
| `dropdown` | Chevron-down / List | Select list |
| `file_upload` | Paperclip / Upload | File attachment |
| `digital_signature` | Pen / Signature | Signature pad |

---

## 4. Deferred UI Items

The following UI elements are documented for future phases but should NOT be implemented in Phase 7.1:

| Item | Phase | Notes |
|------|-------|-------|
| Report creation form (officer mobile) | 7.2 | Renders the template sections/fields as a fillable form |
| Report list & detail view | 7.2 | Admin and officer report management |
| PDF preview in style editor | Future | Live preview of formatted report output |
| Template version history | Future | Diff view between template versions |
| Conditional field logic builder | Future | Show/hide field rules in the section editor |
| Template import/export | Future | JSON file download/upload for template portability |
