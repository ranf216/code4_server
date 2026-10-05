# Report Template Module — Issues and Questions

## ~~Q1: Template Name Uniqueness Scope~~ ✅ Resolved

SDS §4.12 states template names should be unique but does not specify the scope of uniqueness (global, per-community, or within overlapping assignments).

**Resolution:** Enforce overlapping community scope. A global template's name must not conflict with any other template. A community-specific template's name must not conflict with global templates or templates sharing at least one community. This prevents officers assigned to a community from seeing duplicate template names in their selection picker.

---

## ~~Q2: Archived Template Re-activation~~ ✅ Resolved

SDS §4.12.1 lists archive as an action but does not explicitly state whether archived templates can be re-activated.

**Resolution:** Allow re-activation via `activate_template`. Re-activation provides operational flexibility for seasonal, event-specific, or recurring security report types (e.g., "Holiday Patrol Report") without forcing administrators to reconstruct multi-section schemas. Aligns with lifecycle patterns in POI and Shift Series.

---

## ~~Q3: Active Template Editing & In-Place Schema Updates~~ ✅ Resolved

SDS does not specify whether active (published) templates can be edited in-place or must be returned to draft first.

**Resolution:** Approved for Phase 7.1; snapshot mandate required for Phase 7.2.
1. **Phase 7.1:** Editing active templates in-place is approved while no in-flight reports exist.
2. **Phase 7.2 Integration Requirement:** When Phase 7.2 (`report.js`) is implemented, creating a report from a template **must freeze a JSON snapshot** of the template's sections and fields into `incident_report.RPT_CONTENT_SNAPSHOT` (following the Post Order Version `POV_CONTENT` pattern). This guarantees that subsequent edits to a report template will never break historical report rendering or audit logs.

---

## ~~Q4: Template Deletion vs. Archival~~ ✅ Resolved — Implemented

SDS does not mention hard deletion of templates.

**Resolution:** Archival is primary; soft-delete (`delete_template`) supported for drafts.
1. **Archival (`status = 'archived'`):** The primary operational mechanism to retire active templates while preserving historical report integrity.
2. **Soft-Delete (`delete_template` setting `RPT_DELETED_ON = NOW()`):** `delete_template` endpoint restricted to templates in `draft` status. Returns `ERR_REPORT_TEMPLATE_CANNOT_EDIT` (rc 724) if the template is not in draft status. When Phase 7.2 adds the `incident_report` table, the endpoint will also check for linked reports and return `ERR_REPORT_TEMPLATE_HAS_LINKED_REPORTS` (rc 725) if any exist.

---

## ~~Q5: Company Logo Storage (SDS §4.12.3)~~ ✅ Resolved

SDS §4.12.3 specifies a company logo in the formatting settings.

**Resolution:** Store logo file reference inside `RPT_STYLE` JSON blob (e.g., `{"company_logo": "img_filename.jpg", ...}`) via `$Utils.saveNewImageOrKeepOld()`. Follows platform design standards used across resident properties and system settings.

---

## ~~Q6: Officer Access to Template List~~ ✅ Resolved — Implemented

SDS §4.12 shows the template list as a management screen. Officers need to select a template when creating reports.

**Resolution:** Enable dual Admin/Officer ACL on `get_templates_list`. When invoked by an officer, the backend automatically enforces server-side filters: returning only templates where `status = 'active'` and the template is assigned globally or to the officer's community. Admin filters (status, community_id, search, sort) remain fully available for admin users.

---

## ~~Q7: Field-Level Required/Optional Configuration (SDS §4.12.2)~~ ✅ Resolved — Implemented

SDS §4.12.2 mentions "Required" toggle at the section level. Per-field granularity is needed for real-world security reporting.

**Resolution:** Added `RTF_IS_REQUIRED` column (tinyint unsigned, default 1) to `report_template_field`. Section-level `RTS_IS_REQUIRED` controls whether the entire section is mandatory, while `RTF_IS_REQUIRED` controls individual field validation (e.g., "Narrative" is mandatory but "Secondary Vehicle Plate" is optional within the same section). Field `is_required` is accepted in the sections input array and returned in all field responses.
