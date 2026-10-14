# Incident Reports Module — Technical Specification

**Module:** `Report` (`platform/api/report.js`, `platform/funcs/report.js`, `platform/user_modules/report_pdf.js`)  
**Phase:** 7.2  
**Last Updated:** 2026-10-12  
**Governing documents:** `docs/.rules/brain.md`, `docs/sds.md` (§2.5.3, §3.4.4–§3.4.6, §4.4.7, §4.12, §5.4.4), `docs/issues-questions/report-issues-questions.md` (Q1–Q22), `docs/issues-questions/report-audit.md`  
**Related:** Report Templates (`docs/modules/report-template-module-specification.md`), Call, POI, Notification, Settings

---

## 1. Overview

Incident reports are written by officers from a **report template** (Phase 7.1), either:

- **linked to a call** (`service_call`) — system fields are auto-populated from the call,
- **linked to a POI record** ("Report Encounter") — type, description and location are pre-filled from the POI record and the officer's position, or
- **standalone** — e.g. a daily activity log, optionally addressed to a specific resident.

Reports then go through the manager review workflow (single-reviewer lock, change requests, approval with a client section checklist) and are delivered to the client as a **watermarked PDF** rendered from the template style settings.

Design principles:

| Principle | Implementation |
|---|---|
| Immutable template structure | The template's enabled sections, fields and effective style are frozen into `IRP_CONTENT_SNAPSHOT` at creation; template edits/archiving never alter existing reports |
| Audit preservation | Officer-submitted values retained (`IRS_SUBMITTED_VALUES`); every transition and post-submission edit logged in `incident_report_history` with field-level diffs; change-log triggers on all mutable report tables |
| Soft deletion | `*_DELETED_ON` on all entity tables; removed attachments are soft-deleted; no `DELETE FROM` |
| Historical audit JOIN exception | Report reads join master tables without soft-delete filters (§9) |
| Defensive validation | Early-return validation of every parameter, enum (`$DataItems.isValidItemId()`), status and ownership before any write |
| No DB calls in loops | Bulk INSERTs, single `UPDATE ... CASE` for section edits, batched name / file lookups |
| Transactions | All SELECTs before `beginTransaction()`; status transitions conditional on the expected status with `affectedRows` check |

---

## 2. Database Schema

Four tables (migration **V 7.2.0** in `db/UpgradeDB.sql`, plus a follow-up `ALTER TABLE` adding `IRP_POI_ID`; full definitions in `db/db.sql`). Field values are stored as JSON per section (`IRS_VALUES`) keyed by the snapshot field ID — there is no separate per-value table (see Appendix A).

### 2.1 `incident_report` (prefix `IRP_`)

```sql
CREATE TABLE `incident_report` (
  `IRP_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `IRP_RPT_ID` bigint unsigned NOT NULL COMMENT 'FK to report_template the report was created from',
  `IRP_SVC_ID` bigint unsigned DEFAULT NULL COMMENT 'FK to service_call for incident-linked reports (NULL = standalone)',
  `IRP_POI_ID` bigint unsigned DEFAULT NULL COMMENT 'FK to poi_record for POI "Report Encounter" reports (shown under the POI Related Incidents)',
  `IRP_COM_ID` bigint unsigned NOT NULL COMMENT 'Community the report belongs to',
  `IRP_OFC_USR_ID` varchar(128) NOT NULL COMMENT 'Officer who created the report',
  `IRP_CLIENT_USR_ID` varchar(128) DEFAULT NULL COMMENT 'Resident/client the report is delivered to (call creator for incident-linked reports)',
  `IRP_TITLE` varchar(500) NOT NULL COMMENT 'Generated from the template title format',
  `IRP_CATEGORY` varchar(20) NOT NULL COMMENT 'incident, daily_activity, custom (copied from template)',
  `IRP_STATUS` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft, submitted, under_review, changes_requested, approved, delivered',
  `IRP_REVIEW_REQUIRED` tinyint unsigned NOT NULL DEFAULT 0 COMMENT 'Copied from template review_before_client at creation',
  `IRP_ALLOW_OFFICER_EDITING` tinyint unsigned NOT NULL DEFAULT 0 COMMENT 'Copied from template allow_officer_editing at creation',
  `IRP_CONTENT_SNAPSHOT` json NOT NULL COMMENT 'Frozen template structure (sections, fields, style) at creation time',
  `IRP_REVIEWER_USR_ID` varchar(128) DEFAULT NULL COMMENT 'Manager currently (or last) holding the report under review',
  `IRP_CHANGES_COMMENT` varchar(1000) DEFAULT NULL COMMENT 'Latest manager comments when changes were requested',
  `IRP_MANAGEMENT_SUMMARY` varchar(1000) DEFAULT NULL COMMENT 'Optional summary shown at the beginning of the client-facing report',
  `IRP_PDF_FILE_NAME` varchar(1000) DEFAULT NULL COMMENT 'Formatted client PDF generated on delivery',
  `IRP_SUBMITTED_ON` datetime DEFAULT NULL COMMENT 'Latest officer submission',
  `IRP_REVIEW_STARTED_ON` datetime DEFAULT NULL,
  `IRP_APPROVED_ON` datetime DEFAULT NULL,
  `IRP_APPROVED_BY` varchar(128) DEFAULT NULL COMMENT 'NULL when auto-approved (review not required)',
  `IRP_DELIVERED_ON` datetime DEFAULT NULL,
  `IRP_DELIVERED_BY` varchar(128) DEFAULT NULL,
  `IRP_CREATED_ON` datetime NOT NULL,
  `IRP_LAST_UPDATE` datetime DEFAULT NULL,
  `IRP_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`IRP_ID`),
  KEY `IX_IRP_RPT_ID` (`IRP_RPT_ID`),
  KEY `IX_IRP_SVC_ID` (`IRP_SVC_ID`),
  KEY `IX_IRP_POI_ID` (`IRP_POI_ID`),
  KEY `IX_IRP_COM_ID` (`IRP_COM_ID`),
  KEY `IX_IRP_OFC_USR_ID` (`IRP_OFC_USR_ID`),
  KEY `IX_IRP_CLIENT_USR_ID` (`IRP_CLIENT_USR_ID`),
  KEY `IX_IRP_STATUS` (`IRP_STATUS`),
  KEY `IX_IRP_SUBMITTED_ON` (`IRP_SUBMITTED_ON`),
  KEY `IX_IRP_CREATED_ON` (`IRP_CREATED_ON`),
  CONSTRAINT `FK_IRP_RPT_ID` FOREIGN KEY (`IRP_RPT_ID`) REFERENCES `report_template` (`RPT_ID`),
  CONSTRAINT `FK_IRP_SVC_ID` FOREIGN KEY (`IRP_SVC_ID`) REFERENCES `service_call` (`SVC_ID`),
  CONSTRAINT `FK_IRP_POI_ID` FOREIGN KEY (`IRP_POI_ID`) REFERENCES `poi_record` (`POI_ID`),
  CONSTRAINT `FK_IRP_COM_ID` FOREIGN KEY (`IRP_COM_ID`) REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_IRP_OFC_USR_ID` FOREIGN KEY (`IRP_OFC_USR_ID`) REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_IRP_CLIENT_USR_ID` FOREIGN KEY (`IRP_CLIENT_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Notes:
- The **report number** shown to users is `IRP_ID` (used in notifications as `#report_number#`).
- The **review lock** is held in the infrastructure `entity_lock` table (§5); `IRP_REVIEWER_USR_ID` / `IRP_REVIEW_STARTED_ON` record who holds the review.
- `IRP_REVIEW_REQUIRED` and `IRP_ALLOW_OFFICER_EDITING` are copied from the template at creation so later template changes do not affect in-flight reports.

### 2.2 `incident_report_section` (prefix `IRS_`)

```sql
CREATE TABLE `incident_report_section` (
  `IRS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `IRS_IRP_ID` bigint unsigned NOT NULL COMMENT 'FK to incident_report',
  `IRS_RTS_ID` bigint unsigned NOT NULL COMMENT 'Template section ID inside IRP_CONTENT_SNAPSHOT',
  `IRS_TITLE` varchar(80) NOT NULL,
  `IRS_SORT_ORDER` int unsigned NOT NULL DEFAULT 0,
  `IRS_CLIENT_INCLUDED` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=section is included in the client-facing report',
  `IRS_VALUES` json DEFAULT NULL COMMENT 'Current field values keyed by snapshot field ID',
  `IRS_SUBMITTED_VALUES` json DEFAULT NULL COMMENT 'Field values as last submitted by the officer (retained for audit)',
  `IRS_MANAGER_NOTES` varchar(2000) DEFAULT NULL COMMENT 'Manager notes block added during review',
  `IRS_CREATED_ON` datetime NOT NULL,
  `IRS_LAST_UPDATE` datetime DEFAULT NULL,
  `IRS_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`IRS_ID`),
  KEY `IX_IRS_IRP_ID` (`IRS_IRP_ID`),
  CONSTRAINT `FK_IRS_IRP_ID` FOREIGN KEY (`IRS_IRP_ID`) REFERENCES `incident_report` (`IRP_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- One row per **enabled** template section (bulk-inserted at creation in snapshot order).
- `IRS_CLIENT_INCLUDED` defaults from the template section's `client_visible` flag and can be overridden per report by the reviewing manager (`update_report`, or the `approve_report` checklist).
- `IRS_MANAGER_NOTES` is admin-only data (never returned to officers or residents, never rendered in the PDF).

`IRS_VALUES` format (non-file fields only, keyed by snapshot `field_id`):

```json
{
	"101": "2026-10-01",
	"102": "Security Emergency",
	"103": {"address": "1 Main St", "latitude": 32.1, "longitude": 34.8},
	"104": "Officer narrative text",
	"105": ["High", "Escalated"]
}
```

### 2.3 `incident_report_attachment` (prefix `IRA_`)

```sql
CREATE TABLE `incident_report_attachment` (
  `IRA_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `IRA_IRP_ID` bigint unsigned NOT NULL COMMENT 'FK to incident_report',
  `IRA_IRS_ID` bigint unsigned NOT NULL COMMENT 'FK to incident_report_section',
  `IRA_FIELD_ID` bigint unsigned NOT NULL COMMENT 'Template field ID inside IRP_CONTENT_SNAPSHOT (file_upload / digital_signature fields)',
  `IRA_FILE_NAME` varchar(1000) NOT NULL,
  `IRA_UPLOADED_BY` varchar(128) NOT NULL COMMENT 'User who attached the file (officer, manager, or call import)',
  `IRA_SORT_ORDER` int unsigned NOT NULL DEFAULT 0,
  `IRA_CREATED_ON` datetime NOT NULL,
  `IRA_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`IRA_ID`),
  KEY `IX_IRA_IRP_ID` (`IRA_IRP_ID`),
  KEY `IX_IRA_IRS_ID` (`IRA_IRS_ID`),
  CONSTRAINT `FK_IRA_IRP_ID` FOREIGN KEY (`IRA_IRP_ID`) REFERENCES `incident_report` (`IRP_ID`),
  CONSTRAINT `FK_IRA_IRS_ID` FOREIGN KEY (`IRA_IRS_ID`) REFERENCES `incident_report_section` (`IRS_ID`),
  CONSTRAINT `FK_IRA_UPLOADED_BY` FOREIGN KEY (`IRA_UPLOADED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- File metadata (size, MIME type, access level) lives in the infrastructure `file` table; attachments reference the stored file name.
- Clients upload files through the standard file upload API and pass the resulting **file IDs**; the module resolves them to file names in one query (`$Funcs.getFileNamesByIds`).

### 2.4 `incident_report_history` (prefix `IRH_`)

```sql
CREATE TABLE `incident_report_history` (
  `IRH_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `IRH_IRP_ID` bigint unsigned NOT NULL COMMENT 'FK to incident_report',
  `IRH_ACTION` varchar(30) NOT NULL COMMENT 'report_history_action data item key',
  `IRH_FROM_STATUS` varchar(30) DEFAULT NULL,
  `IRH_TO_STATUS` varchar(30) DEFAULT NULL,
  `IRH_USR_ID` varchar(128) DEFAULT NULL COMMENT 'Acting user (NULL = system)',
  `IRH_COMMENT` varchar(1000) DEFAULT NULL,
  `IRH_CHANGES` json DEFAULT NULL COMMENT 'Field-level change log for content edits',
  `IRH_CREATED_ON` datetime NOT NULL,
  PRIMARY KEY (`IRH_ID`),
  KEY `IX_IRH_IRP_ID` (`IRH_IRP_ID`),
  CONSTRAINT `FK_IRH_IRP_ID` FOREIGN KEY (`IRH_IRP_ID`) REFERENCES `incident_report` (`IRP_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- Insert-only audit table (no `DELETED_ON`, no change-log trigger — audit_trail.md Rule 1).
- `IRH_CHANGES` example (post-submission edit):

```json
[
	{"report_section_id": 51, "section_title": "Details", "field_id": 104, "label": "Narrative", "old_value": "Door forced", "new_value": "Rear door forced open"},
	{"report_section_id": 52, "section_title": "Internal", "field": "client_included", "old_value": false, "new_value": true},
	{"report_section_id": 51, "section_title": "Details", "field_id": 106, "label": "Photos", "attachments_added": ["a1b2.jpg"], "attachments_removed": [{"attachment_id": 9, "file_name": "c3d4.jpg"}]}
]
```

### 2.5 Index Usage

| Index | Used by |
|---|---|
| `IX_IRP_STATUS`, `IX_IRP_COM_ID`, `IX_IRP_SUBMITTED_ON` | Admin review queue (`get_reports_list`: status set, community scope, submitted-date filter/sort) |
| `IX_IRP_OFC_USR_ID`, `IX_IRP_CREATED_ON` | Officer list (own reports, created-date filter/sort) |
| `IX_IRP_CLIENT_USR_ID` | Resident list (addressed reports) |
| `IX_IRP_SVC_ID` | `call_id` filter |
| `IX_IRP_POI_ID` | `Poi/get_poi_record` → `related_reports` |
| `IX_IRP_RPT_ID` | `ReportTemplate/delete_template` linked-report guard |
| `IX_IRS_IRP_ID`, `IX_IRA_IRP_ID`, `IX_IRA_IRS_ID`, `IX_IRH_IRP_ID` | Loading a report's sections, attachments and history |

### 2.6 Audit-Trail Triggers (`db/triggers_def.js`)

| Table | Tracked fields (insert + update) | Delete trigger |
|---|---|---|
| `incident_report` | `IRP_TITLE`, `IRP_STATUS`, `IRP_REVIEWER_USR_ID`, `IRP_CHANGES_COMMENT`, `IRP_MANAGEMENT_SUMMARY`, `IRP_PDF_FILE_NAME`, `IRP_SUBMITTED_ON`, `IRP_REVIEW_STARTED_ON`, `IRP_APPROVED_ON`, `IRP_APPROVED_BY`, `IRP_DELIVERED_ON`, `IRP_DELIVERED_BY`, `IRP_LAST_UPDATE`, `IRP_DELETED_ON` | No |
| `incident_report_section` | `IRS_CLIENT_INCLUDED`, `IRS_VALUES`, `IRS_SUBMITTED_VALUES`, `IRS_MANAGER_NOTES`, `IRS_LAST_UPDATE`, `IRS_DELETED_ON` | No |
| `incident_report_attachment` | `IRA_DELETED_ON` | No |
| `incident_report_history` | — (insert-only audit table) | — |

---

## 3. Content Snapshot (`IRP_CONTENT_SNAPSHOT`)

Built by `buildSnapshot(template)` from `ReportTemplate/get_template`:

```json
{
	"template_id": 7,
	"template_name": "Incident Report - Standard",
	"category": "incident",
	"title_format": "Incident - {community} - {date} - {incident_type}",
	"review_before_client": true,
	"allow_officer_editing": false,
	"style": {
		"company_logo": "logo_ab12.png", "accent_color": "#003366", "header_layout": "standard",
		"font": "arial", "page_numbering": true, "confidentiality_footer": "Confidential",
		"date_format": "mm_dd_yyyy", "section_breaks": "continuous", "include_cover_page": false
	},
	"sections": [
		{
			"section_id": 11, "title": "Incident Details", "sort_order": 0, "is_required": true, "client_visible": true,
			"fields": [
				{"field_id": 101, "field_key": "incident_date", "label": "Date", "description": null, "field_type": "date",
				 "config": null, "sort_order": 0, "is_system_field": true, "is_required": true,
				 "is_auto_populated": true, "is_locked": true}
			]
		}
	]
}
```

- Only **enabled** template sections are frozen.
- `style` is the template style merged over `$ReportPdf.getDefaultStyle()` (default accent `#003366`).
- `is_auto_populated` / `is_locked` are set per field at creation (§4.4).
- Title placeholders: `{date}` (creation date, template date format), `{community}`, `{officer}`, `{template_name}`, `{incident_type}` (re-rendered on officer edits); max 500 characters.

---

## 4. Business Logic

### 4.1 Creation (`create_report`, officer)

```
validate officer community ─► template (ReportTemplate/get_template: active + available to the community)
   ─► call_id?  (Call/get_call; community = call community; client = call creator if resident)
   ─► client_user_id? (standalone only; active resident of the report community — rc 740)
   ─► poi_id? (Poi/get_poi_record: active + assigned to officer community — rc 741; location from params or latest GPS)
   ─► snapshot + auto-population ─► optional initial values (validated) ─► title
   ─► TRANSACTION: INSERT report, bulk INSERT sections, bulk INSERT attachments (call media), INSERT history(created)
```

### 4.2 Standalone Recipient Scope (Q1, Q13, Q19)

| Report type | `IRP_CLIENT_USR_ID` | Visible to (once delivered) | `new_incident_report` notification |
|---|---|---|---|
| Call-linked, call created by a resident | Call creator | That resident | Yes |
| Call-linked, call created by an officer (e.g. panic) | `NULL` | All residents of the report community | No |
| Standalone with `client_user_id` | Selected resident (validated: active resident of the report community, else `ERR_REPORT_INVALID_CLIENT` 740; not allowed on call-linked reports) | That resident | Yes |
| Standalone without `client_user_id` | `NULL` | All residents of the report community | No (Q19 — no community-wide broadcast) |

Resident access check (`canResidentAccessReport`):

```js
if (record.IRP_STATUS !== $Const.REPORT_STATUS_DELIVERED)
{
	return false;
}
if (record.IRP_CLIENT_USR_ID === userId)
{
	return true;
}
return $Utils.empty(record.IRP_CLIENT_USR_ID) && Number($Funcs.getUserCommunityId(userId)) === Number(record.IRP_COM_ID);
```

### 4.3 POI "Report Encounter" (Q3, Q22)

- `poi_id` is validated through `$executeAPI("Poi/get_poi_record")` and stored in `IRP_POI_ID`.
- Pre-population (only into fields the call did not populate — **call values take precedence**):

| System field | Value | Locked |
|---|---|---|
| `incident_type` | POI record type **display name** (`Person of Interest`, `Trespass Order`, `Metro Red Card`) | Yes |
| `incident_description` | `Encounter with <full name> (aliases: <aliases>) - POI Record #<id>` | No (editable) |
| `incident_location` | `{address: location_address, latitude, longitude}` from the request, else the officer's latest `gps_log` point | Yes |

- `Poi/get_poi_record` returns `related_reports` (admins: all non-draft linked reports; officers: their own linked reports) next to `related_incidents` (calls).

### 4.4 Auto-Population & Field Locking (Q10)

| Source | System fields |
|---|---|
| Session | `officer_name`, `community_name` |
| Call | `incident_date`, `incident_time`, `incident_location`, `incident_type` (service type / category name), `incident_description`, `resident_name`, `call_reference`, `priority` (name), `officer_comments`; call media → `media` attachments |
| POI | §4.3 |

Locking is data-driven by the `lock_on_auto` attribute in `platform/data/report_system_field.json`: populated fields are locked for officers **and** managers (`ERR_REPORT_FIELD_LOCKED` 732) except `incident_description`, `officer_comments` and `media` (`lock_on_auto: false`). Empty system fields stay editable.

### 4.5 Field Validation

| Field type | Accepted value | Rules |
|---|---|---|
| `text` | string | ≤ `config.max_chars` (default 10,000) |
| `date` | `YYYY-MM-DD` | `$Utils.validateDateStr()` |
| `location` | `{address, latitude, longitude}` or address string | address ≤ 500; lat −90..90, lng −180..180, both or neither |
| `dropdown` | string; array when `config.is_multi_select` | must be in `config.dropdown_values` |
| `file_upload`, `digital_signature` | `{attachment_ids: [kept], file_ids: [new]}` | ≤ `config.max_files` (defaults: 10 / 1 via `default_max_files`); kept IDs must belong to the field (rc 739); new file IDs must exist (rc 321) |

Invalid values return `ERR_REPORT_INVALID_FIELD_VALUE` (731) with the field label in `info`.

### 4.6 Required-Field Rules at Submit (Q11)

- **Required section:** every required field filled (if none is required, at least one field filled).
- **Optional section:** may be skipped entirely; once any of its fields is filled, its required fields are enforced.
- Failure: `ERR_REPORT_REQUIRED_FIELDS_MISSING` (730) with `missing_fields: [{report_section_id, section_title, field_id, label}]`.

---

## 5. State Machine & Review Lock

### 5.1 Statuses (`platform/data/report_status.json`)

| Status | `is_open` | `manager_visible` | Officer can edit | Manager can edit |
|---|---|---|---|---|
| `draft` | no | no | yes | — |
| `submitted` | yes | yes | only if `IRP_ALLOW_OFFICER_EDITING` | no |
| `under_review` | yes | yes | no | reviewing manager only |
| `changes_requested` | yes | yes | yes | no |
| `approved` | no | yes | no | no |
| `delivered` | no | yes | no | no (final) |

### 5.2 Transitions

```
draft ──submit──► submitted ──start_review──► under_review ──approve──► approved ──deliver──► delivered
  │                  ▲                            │   │
  │                  └──────release_review────────┘   └──request_changes──► changes_requested
  │                                                                              │
  └── (review not required) ──submit──► approved            submit (same reviewer) ◄┘──► under_review
```

| API | From | To | Guard | History action(s) | Notification |
|---|---|---|---|---|---|
| `submit_report` | `draft`, `changes_requested` | `submitted` | owner; required fields | `submitted` | `report_submitted` → responsible managers |
| `submit_report` (review not required — Q4) | `draft`, `changes_requested` | `approved` | as above | `submitted` + `auto_approved` | `report_submitted` → responsible managers |
| `submit_report` (resubmission — Q5) | `changes_requested` | `under_review` | reviewer lock re-acquired for the requesting manager (fallback `submitted`) | `submitted` | `report_submitted` → reviewer |
| `start_review` | `submitted` (or `under_review` with expired lock) | `under_review` | `$EntityLock.acquire()` | `review_started` | `report_under_review` → officer |
| `release_review` | `under_review` | `submitted` | caller is reviewer | `review_released` | — |
| `request_changes` | `under_review` | `changes_requested` | caller holds lock; comments 1–1000 chars | `changes_requested` | `report_changes_requested` → officer |
| `approve_report` | `under_review` | `approved` | caller holds lock | `approved` | `report_approved` → officer |
| `deliver_report` | `approved` | `delivered` | PDF rendered first | `delivered` | `report_delivered` → officer; `new_incident_report` → recipient |
| `export_report_pdf` (regenerate) | `delivered` | `delivered` | admin | `pdf_regenerated` | — |

Every transition is executed by `commitStatusTransition()`: a conditional `UPDATE ... WHERE IRP_ID=? AND IRP_STATUS=<expected>` checked with `affectedRows`, plus its history rows, in one transaction:

```js
$Db.beginTransaction();

$Db.executeQuery(
	`UPDATE \`incident_report\` SET ${setClause}, IRP_LAST_UPDATE=?
	 WHERE IRP_ID=? AND IRP_STATUS=? AND IRP_DELETED_ON IS NULL`,
	[...setParams, now, record.IRP_ID, fromStatus]);
if ($Db.isError())
{
	$Db.rollbackTransaction();
	return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
}
if ($Db.affectedRows() === 0)
{
	$Db.rollbackTransaction();
	return staleError;
}
```

`update_report` uses the same guard (`WHERE IRP_STATUS=<status read>`) so an officer edit cannot overwrite a report a manager has just taken under review (`ERR_REPORT_CANNOT_EDIT` 726).

### 5.3 Review Lock (Q6, Q7)

- Implemented with the infrastructure `$EntityLock` (`entity_lock` table, lock table key `incident_report`, TTL `ENTITY_LOCK_DEFAULT_TTL_SECONDS` = **1800 s / 30 min**) plus `IRP_REVIEWER_USR_ID`.
- `start_review` acquires the lock atomically; another manager receives `ERR_REPORT_LOCKED` (727) with `locked_by`, `locked_by_name`, `expires_on`.
- Every reviewer action (`update_report`, `approve_report`, `request_changes`) re-acquires/refreshes the lock **before** its transaction; a manager who is not the reviewer or has lost the lock receives `ERR_REPORT_NOT_UNDER_REVIEW_BY_USER` (736).
- An expired lock may be taken over by another manager via `start_review` (logged: "Review taken over ... (lock expired)").
- The lock is released after approve / request changes / release; `get_report` is side-effect free (admin view returns `review_lock: {is_locked, locked_by, locked_by_name, expires_on}`).
- Lock procedures commit on their own, so they are **never** called inside a report transaction.

### 5.4 Manager Routing (Q8)

Responsible managers for `report_submitted`: active admins with the **Manager** role whose `USD_COM_ID` equals the report community; if none, all active **Super Admins** (single query, filtered in memory with `$UserRoles.doesUserHaveRole()`).

---

## 6. Data Visibility & Isolation (Q9, Q20, Q21)

| Data | Admin (`get_report`) | Officer (own report) | Resident / PDF |
|---|---|---|---|
| All sections | ✅ | ✅ (needed to fill internal sections — Q20) | Client-included sections only |
| `manager_notes` | ✅ | ❌ | ❌ |
| `submitted_value` per field | ✅ | ❌ | ❌ |
| Field config / `is_locked` / `is_auto_populated` | ✅ | ✅ | ❌ |
| `changes_comment` | ✅ | ✅ | ❌ |
| `management_summary` | ✅ | ✅ | ✅ |
| Review lock, reviewer, history | ✅ | ❌ | ❌ |
| Drafts | ❌ (hidden from managers) | ✅ | ❌ |

Client inclusion follows the per-report `IRS_CLIENT_INCLUDED` flag (template `client_visible` default, manager override — Q21).

---

## 7. PDF Rendering Engine (Q2, Q17)

Generated at delivery (`deliver_report`) and on admin regeneration (`export_report_pdf` with `regenerate=true`) by `generateClientPdf()` → `$Export.generate({format: pdf, accessLevel: limited, render: doc => $ReportPdf.render(doc, data)})` (pdfkit).

| Element | Specification | Source |
|---|---|---|
| Watermark | Diagonal `"CONFIDENTIAL – AUTHORISED USE ONLY"`, 15% opacity, every page | `REPORT_PDF_WATERMARK_TEXT`, `REPORT_PDF_WATERMARK_OPACITY` (`runtime_config.js`) |
| Running header | Community name · report title · Report ID | every page |
| Footer | Delivery date/time · `"Generated by Code4 Axis Security Operations"` · `Page X of Y` (template `page_numbering`) · template confidentiality footer | `REPORT_PDF_GENERATED_BY_TEXT` |
| Accent colour | Template `accent_color`, default **`#003366`** (Code4 Navy) — section heading bars, header divider, full-width banner | `$ReportPdf` `DEFAULT_ACCENT_COLOR` |
| Header layout | `compact`, `standard`, `full_width_banner` | template style |
| Font | Arial/Calibri → Helvetica, Times New Roman → Times (`pdf_font` / `pdf_font_bold` in `report_font.json`) | template style |
| Cover page / section breaks / date format | Template style settings | template style |
| Content | Management summary + client-included sections; JPEG/PNG attachments embedded (`report_pdf_image_ext.json`) when they pass `$Funcs.isPdfSafeImage()` — corrupt or non-image files are listed by name (a corrupt PNG would otherwise abort the Node process inside pdfkit's async decoder); manager notes and internal sections excluded | report data |

Storage & URLs:
- Saved with `limited` access; `IRP_PDF_FILE_NAME` stores the **stored** file name (resolved from the export `file_id` — `$Export`'s `file_name` is the original export name).
- `pdf_url` is built with `$Files.getUrl({file_name, access_level: limited})` — a signed, time-limited URL for the authenticated session when `file_access_level` is enabled.
- Regeneration re-renders from the frozen snapshot with the **original** delivery date and logs `pdf_regenerated`.

---

## 8. Listing & Filters (Q16)

`get_reports_list` — 0-based pagination, page size `REPORTS_LIST_PAGE_SIZE` (20), bounds check before querying, response key `reports` with `num_of_items` / `num_of_pages` (audit Q2).

| Role | Scope | Date filter column | Sort |
|---|---|---|---|
| Admin | Non-draft (`manager_visible`), community-scoped for non-super admins (`USD_COM_ID`) | `IRP_SUBMITTED_ON` | `submitted_on` (default), `created_on`, `status`, `title`, `report_id` |
| Officer | Own reports (all statuses) | `IRP_CREATED_ON` | created desc |
| Resident | Delivered + (addressed to them OR community-wide in their community) | `IRP_DELIVERED_ON` | delivered desc |

Filters: `statuses` (admin/officer), `category`, `community_ids` (admin), `officer_user_ids` (admin — author filter), `review_required` (admin), `call_id`, `from_date` / `to_date`, `search_text` (admin: title, report ID, officer name; others: title).

Admin list items also carry `reviewer_user_id`, `reviewer_name`, `review_started_on` and `review_lock {is_locked, locked_by, locked_by_name, expires_on}` for queue lock indicators. Locks for the page are read in **one** query through the infrastructure batch API `$EntityLock.checkMany("incident_report", reportIds)` (non-expired locks, evaluated with the DB clock) and names are batched with `$Funcs.getUserNames()` — no per-row queries and no direct `entity_lock` access (audit Q3).

---

## 9. Historical Audit JOIN Exception (audit Q1)

Report reads (`fetchReportRecord`, `get_reports_list`) join `community`, `report_template` and `user_details` **without** `*_DELETED_ON IS NULL` filters on the joined tables:

```sql
SELECT ...
FROM `incident_report`
	JOIN `community` ON IRP_COM_ID = COM_ID
	JOIN `report_template` ON IRP_RPT_ID = RPT_ID
WHERE IRP_ID=? AND IRP_DELETED_ON IS NULL
```

- **Historical audit entities** (`incident_report`, `poi_export`, `shift_history`, `call_log`) keep full metadata attribution after an officer, template or community is soft-deleted.
- **Active/operational queries** must still filter deleted rows — the module does so for template selection, call and POI validation, recipient validation, manager routing and community lookups.

---

## 10. Cross-Module Integration

| Module | Direction | Integration |
|---|---|---|
| Report Template | Report → Template | `ReportTemplate/get_template` (officer access rules) for the snapshot; `delete_template` blocked by linked reports (`ERR_REPORT_TEMPLATE_HAS_LINKED_REPORTS` 725) |
| Call | Report → Call | `Call/get_call` for validation, community, recipient and auto-population; media import |
| POI | both | `Poi/get_poi_record` validation/pre-fill; `related_reports` in `get_poi_record` |
| Resident / Community | Report → user data | Recipient validation, resident community scope, community names |
| Tracking | Report → `gps_log` | `$Funcs.getOfficerLatestLocation()` for encounter location |
| Notification | Report → Notification | `Notification/create_bulk_notifications` with `payload {entity_type: "report", entity_id}` |
| Settings | Notification toggles | `report_submitted_enabled`, `report_under_review_enabled`, `report_approved_enabled`, `report_changes_enabled`, `report_delivered_enabled` (also governs `new_incident_report`) |
| Files / Export | Report → infra | `$Funcs.getFileNamesByIds`, `$Files.getUrl`, `$Export.generate` |
| Entity Lock | Report → infra | Review lock (`acquire` / `release` / `check`); batched queue indicators via `checkMany` |

### Notification templates

| Type | Recipient | Message |
|---|---|---|
| `report_submitted` | Responsible managers / returning reviewer | Report #N submitted by <officer> for review |
| `report_under_review` | Officer | Report #N is being reviewed by <manager> |
| `report_changes_requested` | Officer | Changes requested on report #N: <comments> |
| `report_approved` | Officer | Report #N has been approved |
| `report_delivered` | Officer | Report #N has been delivered to the client |
| `new_incident_report` | Specific recipient only | Incident report #N filed by <officer> |

---

## 11. Error Codes (Report band 710–749)

| rc | Constant | Raised by |
|---|---|---|
| 710 | `ERR_REPORT_NOT_FOUND` | Unknown / inaccessible report (incl. drafts for managers, undelivered for residents) |
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | `create_report` — template missing, inactive or not available |
| 712 | `ERR_REPORT_CANNOT_SUBMIT` | `submit_report` — wrong status / concurrent change |
| 713 | `ERR_REPORT_CANNOT_APPROVE` | `approve_report` — not `under_review` |
| 714 | `ERR_REPORT_CANNOT_DELIVER` | `deliver_report` — not `approved` |
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | `get_reports_list` — invalid category filter |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | `create_report` — template has no enabled section |
| 726 | `ERR_REPORT_CANNOT_EDIT` | `update_report` — not editable in the current status / concurrent transition |
| 727 | `ERR_REPORT_LOCKED` | `start_review` — held by another manager |
| 728 | `ERR_REPORT_CANNOT_REVIEW` | `start_review` / `release_review` — wrong status |
| 729 | `ERR_REPORT_CANNOT_REQUEST_CHANGES` | `request_changes` — not `under_review` |
| 730 | `ERR_REPORT_REQUIRED_FIELDS_MISSING` | `submit_report` (`missing_fields`) |
| 731 | `ERR_REPORT_INVALID_FIELD_VALUE` | create / update value validation |
| 732 | `ERR_REPORT_FIELD_LOCKED` | create / update — locked auto-populated field |
| 733 | `ERR_REPORT_INVALID_SECTION` | unknown section / inclusion ID |
| 734 | `ERR_REPORT_CHANGES_COMMENT_REQUIRED` | `request_changes` — empty comments |
| 735 | `ERR_REPORT_INVALID_CALL` | `create_report` — call not accessible |
| 736 | `ERR_REPORT_NOT_UNDER_REVIEW_BY_USER` | reviewer actions without the review / lock |
| 737 | `ERR_REPORT_INVALID_STATUS` | `get_reports_list` — invalid status filter |
| 738 | `ERR_REPORT_FILE_LIMIT_REACHED` | file field above `max_files` |
| 739 | `ERR_REPORT_INVALID_ATTACHMENT` | kept attachment not in the field |
| 740 | `ERR_REPORT_INVALID_CLIENT` | `create_report` — `client_user_id` not an active resident of the community |
| 741 | `ERR_REPORT_INVALID_POI` | `create_report` — POI not accessible |
| 742 | `ERR_REPORT_CANNOT_EXPORT` | `export_report_pdf` — report not delivered / no PDF |

Generic codes used: 103 `ERR_NO_PRIVILEGES` (admin outside community scope), 105 `ERR_INVALID_API_PARAM` (with `info`), 321 `ERR_FILE_NOT_FOUND`, 500 `ERR_COMMUNITY_NOT_FOUND` (officer without community), 401/402 DB errors.

---

## 12. Configuration

| Key (`runtime_config.js`) | Default | Purpose |
|---|---|---|
| `REPORTS_LIST_PAGE_SIZE` | `20` | List page size |
| `REPORT_PDF_WATERMARK_TEXT` | `CONFIDENTIAL – AUTHORISED USE ONLY` | PDF watermark |
| `REPORT_PDF_WATERMARK_OPACITY` | `0.15` | Watermark opacity |
| `REPORT_PDF_GENERATED_BY_TEXT` | `Generated by Code4 Axis Security Operations` | PDF footer |
| `SYSTEM_NAME` | `Code4` | PDF creator metadata |
| `SETTINGS_DEFAULTS.notification.report_*_enabled` | `true` | Notification toggles |

---

## 13. Deferred Requirements (`docs/deferred_requirements/09-report-enhancements.md`)

| # | Item | Status |
|---|---|---|
| 1 | Dashboard incident-reports widget (SDS §4.5.5) | Deferred — Phase 8.1 |
| 2 | Incident pattern & trend analytics (SDS §1.8) | Deferred |
| 3 | Linked reports embedded in `Call/get_call` | Partial — `call_id` list filter available |
| 4 | Automatic revert of `under_review` when the lock expires (cron) | Deferred |
| 5 | Delete / discard draft reports | Deferred |
| 6 | Embedded TTF fonts / non-Latin text in the PDF | Deferred |
| 7 | Email delivery with PDF attachment | ✅ Resolved — not needed (notification-driven, Q14) |
| — | Multi-manager collaborative review | Not planned — the SDS mandates a single reviewer (Q6/Q7) |
| — | Pre-delivery PDF preview | Not implemented — `export_report_pdf` is available once delivered |

---

## Appendix A — Brief vs. Implementation Mapping

The Phase 7.2 documentation brief (2026-10-12) proposed names that differ from the implemented schema/API. The implementation (and this document) remain authoritative:

| Brief | Implementation |
|---|---|
| 5 tables incl. `incident_report_value` (`IRV_`) | 4 tables; values as JSON in `IRS_VALUES` keyed by snapshot field ID |
| `IRP_NUMBER` | `IRP_ID` is the report number |
| `IRP_CLL_ID` | `IRP_SVC_ID` (FK to `service_call`) |
| `IRP_REVIEW_LOCKED_BY` / `IRP_REVIEW_LOCKED_AT` | `$EntityLock` (`entity_lock`) + `IRP_REVIEWER_USR_ID` / `IRP_REVIEW_STARTED_ON` |
| `*_AT` timestamps | `*_ON` timestamps (`IRP_SUBMITTED_ON`, `IRP_APPROVED_ON`, `IRP_DELIVERED_ON`) |
| `IRS_DESCRIPTION`, `IRS_SEQUENCE`, `IRS_CLIENT_VISIBLE` | `IRS_SORT_ORDER`, `IRS_CLIENT_INCLUDED` (descriptions in the snapshot) |
| `IRA_FILE_ID`, `IRA_FILE_TYPE`, `IRA_FILE_SIZE`, `IRA_CAPTION`, `IRA_UPLOADED_ON` | `IRA_FIELD_ID`, `IRA_FILE_NAME`, `IRA_SORT_ORDER`, `IRA_CREATED_ON` (metadata in `file`) |
| `IRH_PREV_STATUS`, `IRH_NEW_STATUS`, `IRH_MANAGER_NOTES` | `IRH_FROM_STATUS`, `IRH_TO_STATUS`, `IRH_ACTION`, `IRH_COMMENT`, `IRH_CHANGES`; manager notes in `IRS_MANAGER_NOTES` |
| Index names `IX_IRP_STATUS_COM`, ... | §2.5 |
| Error codes 730–755 (`ERR_REPORT_NOT_FOUND` 730, ...) | §11 (`ERR_REPORT_NOT_FOUND` 710, `ERR_REPORT_LOCKED` 727, ...) |
| `create_report` / `submit_report` for ADMIN | Officer only (SDS: reports are written by officers) |
