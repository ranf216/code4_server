# Incident Reports — App Developer Integration Guide

**Module:** `Report`  
**Phase:** 7.2  
**Audience:** Frontend developers (React Web Portal & React Native Mobile App)  
**Last Updated:** 2026-10-12

This guide treats the server as a black box: every request, parameter, response field and error code below is what the API actually accepts and returns. Server internals are described in `docs/modules/report-module-specification.md`.

---

## 1. Authentication, Conventions & Access

### 1.1 Requests

- All endpoints are called as `Report/<method>` and require a valid session token in `#token`.
- Every response contains `rc` (`0` = success) and `message`. Some errors add an `info` string or extra fields (documented per endpoint).
- Date-times are returned as `YYYY-MM-DD HH:MM:SS` strings; dates as `YYYY-MM-DD`.
- File uploads: upload files with the standard file upload API first and pass the returned **file IDs** to the report endpoints.
- URLs returned for PDFs (`pdf_url`) are signed and time-limited when file access levels are enabled — request a fresh URL (`get_report` / `export_report_pdf`) instead of caching it.

### 1.2 Roles

| Role | Can do |
|---|---|
| **Admin / Manager** (`USER_TYPE_ADMIN`) | Review queue (non-draft reports of their communities; super admins: all), start/release review, edit while reviewing, request changes, approve, deliver, export/regenerate PDF, full history |
| **Officer** (`USER_TYPE_OFFICER`) | Create reports (call-linked, POI encounter, standalone), edit own reports while editable, submit/resubmit, view own reports (all statuses) |
| **Resident / Client** (`USER_TYPE_RESIDENT`) | Read-only: delivered reports addressed to them, plus delivered reports without a specific recipient in their community; download the PDF |

Non-super admins with an assigned community only see that community; requests for another community return `rc 103`.

### 1.3 Pagination

`get_reports_list` uses **0-based** pages:
- `page` (default `0`). Page size is server-controlled (currently **20**) — there is no page-size parameter.
- Responses include `num_of_items` and `num_of_pages`.
- Out-of-range pages (`page < 0` or `page >= num_of_pages`) return an empty `reports` array with correct totals.

### 1.4 Report lifecycle

```
draft ─► submitted ─► under_review ─► approved ─► delivered
              ▲            │  │
              └─ release ──┘  └─► changes_requested ─(resubmit)─► under_review
draft ─(template without review)─► approved
```

| Status | Shown to officer as | Officer can edit | Manager actions |
|---|---|---|---|
| `draft` | Draft | ✅ | — (hidden from managers) |
| `submitted` | Submitted | only if the template allows editing after submit | Start review |
| `under_review` | Under Review | ❌ | Edit, request changes, approve, release (reviewer only) |
| `changes_requested` | Changes Requested | ✅ | — |
| `approved` | Approved | ❌ | Deliver |
| `delivered` | Delivered | ❌ | Export / regenerate PDF |

Use the `can_edit` flag returned by `get_report` rather than re-implementing these rules.

---

## 2. Endpoint Directory

| # | Endpoint | ACL |
|---|---|---|
| 2.1 | `Report/get_reports_list` | Admin, Officer, Resident |
| 2.2 | `Report/get_report` | Admin, Officer, Resident |
| 2.3 | `Report/create_report` | Officer |
| 2.4 | `Report/update_report` | Admin, Officer |
| 2.5 | `Report/submit_report` | Officer |
| 2.6 | `Report/start_review` | Admin |
| 2.7 | `Report/release_review` | Admin |
| 2.8 | `Report/request_changes` | Admin |
| 2.9 | `Report/approve_report` | Admin |
| 2.10 | `Report/deliver_report` | Admin |
| 2.11 | `Report/export_report_pdf` | Admin, Resident |
| 2.12 | `Report/get_report_history` | Admin |
| 2.13 | `Report/get_report_for_client` | Resident |
| 2.14 | `Report/get_report_metadata` | Admin, Officer, Resident |

Parameter types: `i` integer, `d` decimal, `s` string, `b` boolean, `n` array of numbers, `a` array (of objects).

---

### 2.1 `Report/get_reports_list`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `#token` | s | Yes | — | Session token |
| `community_ids` | n | No | `[]` | Admin only: community filter |
| `officer_user_ids` | a | No | `[]` | Admin only: author (officer user ID) filter |
| `statuses` | a | No | `[]` | Admin / officer: status keys (`draft`, `submitted`, `under_review`, `changes_requested`, `approved`, `delivered`) |
| `category` | s | No | `""` | `incident`, `daily_activity`, `custom` |
| `review_required` | b | No | omitted = all | Admin only |
| `call_id` | i | No | `0` | Reports linked to a call |
| `from_date` | s | No | `""` | `YYYY-MM-DD` — **admin: submitted date, officer: created date, resident: delivered date** |
| `to_date` | s | No | `""` | `YYYY-MM-DD` (inclusive, same column as `from_date`) |
| `search_text` | s | No | `""` | Admin: title, report ID, officer name. Officer / resident: title |
| `sort_by` | s | No | `submitted_on` | Admin only: `submitted_on`, `created_on`, `status`, `title`, `report_id` |
| `sort_dir` | s | No | `desc` | Admin only: `asc` / `desc` |
| `page` | i | No | `0` | 0-based page |

**Role scoping:** officers — own reports, newest created first; residents — delivered reports (addressed to them or community-wide), newest delivered first; admins — non-draft reports.

**Response (admin / officer):**
```json
{
	"rc": 0,
	"message": "success",
	"reports": [
		{
			"report_id": 128,
			"title": "Incident - Oak Park - 10/12/2026 - Security Emergency",
			"community_id": 5,
			"community_name": "Oak Park",
			"category": "incident",
			"category_name": "Incident",
			"call_id": 9042,
			"created_on": "2026-10-12 08:14:03",
			"delivered_on": null,
			"template_id": 7,
			"template_name": "Incident Report - Standard",
			"status": "submitted",
			"status_name": "Submitted",
			"officer_user_id": "u_31f2...",
			"officer_name": "Bob Carter",
			"review_required": true,
			"submitted_on": "2026-10-12 09:02:41",
			"last_update": "2026-10-12 09:02:41",
			"reviewer_user_id": "u_a1c9...",
			"reviewer_name": "Maria Lopez",
			"review_started_on": "2026-10-12 09:25:00",
			"review_lock": {"is_locked": true, "locked_by": "u_a1c9...", "locked_by_name": "Maria Lopez", "expires_on": "2026-10-12 09:55:00"}
		}
	],
	"num_of_items": 37,
	"num_of_pages": 2
}
```

`reviewer_user_id`, `reviewer_name`, `review_started_on` and `review_lock` are returned to **admins only** (queue lock indicators; `expires_on` drives the countdown). `is_locked: false` means nobody currently holds the review (an `under_review` report with an expired lock can be taken over with `start_review`).

**Response item (resident):** `report_id`, `title`, `community_id`, `community_name`, `category`, `category_name`, `call_id`, `created_on` (date of incident report), `delivered_on`, `pdf_url`.

**Errors:** `737` invalid status filter, `716` invalid category, `105` invalid date (`info`: `from_date` / `to_date`), `103` community outside admin scope.

---

### 2.2 `Report/get_report`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `#token` | s | Yes | Session token |
| `report_id` | i | Yes | Report ID |

Residents receive exactly the `get_report_for_client` response (§2.13).

**Response (admin view):**
```json
{
	"rc": 0,
	"message": "success",
	"report": {
		"report_id": 128,
		"title": "Incident - Oak Park - 10/12/2026 - Security Emergency",
		"template_id": 7,
		"template_name": "Incident Report - Standard",
		"poi_id": null,
		"category": "incident",
		"category_name": "Incident",
		"community_id": 5,
		"community_name": "Oak Park",
		"call_id": 9042,
		"status": "under_review",
		"status_name": "Under Review",
		"officer_user_id": "u_31f2...",
		"officer_name": "Bob Carter",
		"client_user_id": "u_88aa...",
		"client_name": "Ann Resident",
		"review_required": true,
		"allow_officer_editing": false,
		"changes_comment": null,
		"management_summary": null,
		"created_on": "2026-10-12 08:14:03",
		"submitted_on": "2026-10-12 09:02:41",
		"approved_on": null,
		"approved_by_name": null,
		"delivered_on": null,
		"delivered_by_name": null,
		"last_update": "2026-10-12 09:30:11",
		"pdf_url": null,
		"reviewer_user_id": "u_a1c9...",
		"reviewer_name": "Maria Lopez",
		"review_started_on": "2026-10-12 09:25:00",
		"review_lock": {"is_locked": true, "locked_by": "u_a1c9...", "locked_by_name": "Maria Lopez", "expires_on": "2026-10-12 09:55:00"},
		"can_edit": true,
		"sections": [
			{
				"report_section_id": 501,
				"section_id": 11,
				"title": "Incident Details",
				"sort_order": 0,
				"is_required": true,
				"client_included": true,
				"manager_notes": null,
				"fields": [
					{
						"field_id": 101, "field_key": "incident_date", "label": "Date", "field_type": "date",
						"value": "2026-10-12", "description": null, "config": null,
						"is_system_field": true, "is_required": true, "is_auto_populated": true, "is_locked": true,
						"submitted_value": "2026-10-12"
					},
					{
						"field_id": 106, "field_key": "media", "label": "Photos", "field_type": "file_upload",
						"value": null, "attachments": [{"attachment_id": 77, "url": "https://.../files/a/..."}],
						"description": null, "config": {"max_files": 5},
						"is_system_field": true, "is_required": false, "is_auto_populated": false, "is_locked": false
					}
				]
			}
		],
		"history": [
			{"history_id": 1, "action": "created", "action_name": "Created", "from_status": null, "to_status": "draft",
			 "user_id": "u_31f2...", "user_name": "Bob Carter", "comment": null, "changes": null, "created_on": "2026-10-12 08:14:03"}
		]
	}
}
```

**Officer view:** same report header and sections, but **without** the review fields (`reviewer_user_id`, `reviewer_name`, `review_started_on`, `review_lock`), `history`, `manager_notes` and `submitted_value`. It includes `client_user_id`, `client_name`, `changes_comment` and `can_edit`. `submitted_value` (admin) is only present on non-file fields.

**Field values by type:**

| `field_type` | `value` |
|---|---|
| `text` | string |
| `date` | `YYYY-MM-DD` |
| `location` | `{address, latitude, longitude}` |
| `dropdown` | string, or array when `config.is_multi_select` |
| `file_upload`, `digital_signature` | `null` — files are in `attachments` |

**Errors:** `710` not found / not accessible (officer: not own; admin: draft), `103` admin outside community.

---

### 2.3 `Report/create_report` (Officer)

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `#token` | s | Yes | — | Session token |
| `template_id` | i | Yes | — | Active template available to the officer's community |
| `call_id` | i | No | `0` | Source call (0 = not call-linked) |
| `client_user_id` | s | No | `""` | **Standalone only:** resident recipient; empty = visible to all residents of the community once delivered |
| `poi_id` | i | No | `0` | POI record for a "Report Encounter" |
| `latitude` / `longitude` | d | No | omitted | Officer's current position (POI encounter). Omitted → latest GPS position |
| `location_address` | s | No | `""` | Address text for the encounter location |
| `sections` | a | No | omitted | Initial values: `[{section_id: <template section id>, values: {<field_id>: <value>}}]` |

What the server pre-fills (fields are returned as `is_auto_populated: true`):
- Always: officer name, community name.
- Call-linked: incident date/time, location, type, description, resident name, call reference, priority, officer comments; call photos are attached to the `media` field.
- POI encounter (only fields not filled from a call): incident type (`Trespass Order`, ...), description (`Encounter with <name> (aliases: ...) - POI Record #<id>`), location.

Locked after pre-fill (`is_locked: true`): everything except `incident_description`, `officer_comments` and `media`.

**Request (POI encounter):**
```json
{
	"#token": "…",
	"template_id": 7,
	"poi_id": 42,
	"latitude": 32.0853,
	"longitude": 34.7818,
	"location_address": "North gate"
}
```

**Response:**
```json
{"rc": 0, "message": "success", "report_id": 128, "title": "Incident - Oak Park - 10/12/2026 - Trespass Order"}
```

**Errors:** `500` officer has no community, `711` template unavailable, `720` template has no sections, `735` call not accessible, `740` invalid `client_user_id` (or `105` when combined with `call_id`), `741` POI not accessible, `731` invalid value / coordinates, `732` locked field, `733` unknown section, `738` file limit, `321` unknown file ID.

---

### 2.4 `Report/update_report` (Admin, Officer)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `#token` | s | Yes | Session token |
| `report_id` | i | Yes | Report ID |
| `sections` | a | Yes | `[{report_section_id, values: {<field_id>: <value>}, manager_notes, client_included}]` |

- **Officer:** own report in `draft`, `changes_requested` (or `submitted` when `allow_officer_editing`). `manager_notes` / `client_included` are ignored.
- **Admin:** only while holding the review (`under_review`, after `start_review`). May also set `manager_notes` (≤ 2000 chars) and `client_included` (section visibility override for the client view / PDF).
- Only the sections and fields you send are changed. Send `null` / `""` to clear a value.
- File fields: `{"attachment_ids": [<attachments to keep>], "file_ids": [<newly uploaded file IDs>]}` — attachments not listed in `attachment_ids` are removed.

**Request:**
```json
{
	"#token": "…",
	"report_id": 128,
	"sections": [
		{
			"report_section_id": 501,
			"values": {
				"104": "Rear door forced open; suspect left on foot.",
				"105": ["High"],
				"106": {"attachment_ids": [77], "file_ids": ["f_9c2e..."]}
			}
		},
		{"report_section_id": 502, "manager_notes": "Verified with CCTV", "client_included": false}
	]
}
```

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "title": "…", "changed": true}` (`changed: false` when nothing differed).

**Errors:** `726` not editable now (status changed meanwhile), `736` admin not holding the review, `731`, `732`, `733`, `738`, `739`, `321`, `105` (`sections` missing / `manager_notes` too long).

---

### 2.5 `Report/submit_report` (Officer)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `#token` | s | Yes | Session token |
| `report_id` | i | Yes | Own report in `draft` or `changes_requested` |

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "status": "submitted"}`

`status` in the response is:
- `submitted` — normal submission (managers notified),
- `approved` — the template does not require review,
- `under_review` — resubmission after changes requested; returned to the same manager.

**Error `730` (required fields missing):**
```json
{
	"rc": 730,
	"message": "required report fields are missing",
	"missing_fields": [{"report_section_id": 501, "section_title": "Incident Details", "field_id": 104, "label": "Narrative"}]
}
```
`field_id: null` means a required section has no content at all. Other errors: `712` wrong status, `710`.

---

### 2.6 `Report/start_review` (Admin)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `#token` | s | Yes | Session token |
| `report_id` | i | Yes | `submitted` report (or `under_review` with an expired lock) |

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "status": "under_review", "expires_on": "2026-10-12 09:55:00"}`

- The lock lasts **30 minutes** and is refreshed by every reviewer action (edit, approve, request changes). Calling `start_review` again while reviewing simply refreshes it.
- **Error `727`** — another manager holds the review:
```json
{"rc": 727, "message": "report is under review by another manager", "locked_by": "u_77d0...", "locked_by_name": "Dan Hill", "expires_on": "2026-10-12 09:41:12"}
```
Other errors: `728` wrong status, `103`, `710`.

### 2.7 `Report/release_review` (Admin)

Closes the review without action (status back to `submitted`, lock released). Call it when the manager leaves the review screen without deciding.

| Parameter | Type | Required |
|---|---|---|
| `#token` | s | Yes |
| `report_id` | i | Yes |

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "status": "submitted"}` — errors `728`, `736`, `710`, `103`.

### 2.8 `Report/request_changes` (Admin)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `#token` | s | Yes | Session token |
| `report_id` | i | Yes | Report under review by the caller |
| `comments` | s | Yes | What must be corrected (1–1000 chars) — shown to the officer as `changes_comment` |

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "status": "changes_requested"}` — errors `734` empty comments, `105` too long, `729`, `736`.

### 2.9 `Report/approve_report` (Admin)

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `#token` | s | Yes | — | Session token |
| `report_id` | i | Yes | — | Report under review by the caller |
| `included_section_ids` | n | No | omitted = keep current inclusion | Report section IDs included in the client report; all other sections are excluded |
| `management_summary` | s | No | `""` | Shown at the top of the client report (≤ 1000 chars) |

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "status": "approved"}` — errors `713`, `733` unknown section ID, `736`, `105`.

### 2.10 `Report/deliver_report` (Admin)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `#token` | s | Yes | Session token |
| `report_id` | i | Yes | `approved` report |

Generates the watermarked client PDF, sets the report to `delivered` (final — no further edits) and notifies the officer and the specific recipient (community-wide reports are not broadcast).

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "status": "delivered", "pdf_url": "https://.../files/a/..."}` — errors `714`, `484` PDF generation failed.

### 2.11 `Report/export_report_pdf` (Admin, Resident)

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `#token` | s | Yes | — | Session token |
| `report_id` | i | Yes | — | Delivered report |
| `regenerate` | b | No | `false` | Admin only: re-render the PDF from the frozen report (original delivery date kept; logged in history) |

**Response:** `{"rc": 0, "message": "success", "report_id": 128, "pdf_url": "https://.../files/a/...", "regenerated": false}`

**Errors:** `742` report not delivered (admin), `710` not accessible (resident), `103`.

### 2.12 `Report/get_report_history` (Admin)

| Parameter | Type | Required |
|---|---|---|
| `#token` | s | Yes |
| `report_id` | i | Yes |

**Response:**
```json
{
	"rc": 0,
	"message": "success",
	"report_id": 128,
	"history": [
		{"history_id": 4, "action": "changes_requested", "action_name": "Changes Requested", "from_status": "under_review", "to_status": "changes_requested",
		 "user_id": "u_a1c9...", "user_name": "Maria Lopez", "comment": "Add the suspect description", "changes": null, "created_on": "2026-10-12 09:40:00"},
		{"history_id": 5, "action": "updated", "action_name": "Updated", "from_status": "changes_requested", "to_status": "changes_requested",
		 "user_id": "u_31f2...", "user_name": "Bob Carter", "comment": null,
		 "changes": [{"report_section_id": 501, "section_title": "Incident Details", "field_id": 104, "label": "Narrative", "old_value": "Door forced", "new_value": "Rear door forced; male, 1.80m, black hoodie"}],
		 "created_on": "2026-10-12 10:05:12"}
	]
}
```

History actions: `created`, `updated`, `submitted`, `auto_approved`, `review_started`, `review_released`, `changes_requested`, `approved`, `delivered`, `pdf_regenerated`. `changes` entries contain `field_id`/`label` + `old_value`/`new_value`, or `attachments_added`/`attachments_removed`, or `field: "manager_notes" | "client_included"`.

### 2.13 `Report/get_report_for_client` (Resident)

| Parameter | Type | Required |
|---|---|---|
| `#token` | s | Yes |
| `report_id` | i | Yes |

**Response:**
```json
{
	"rc": 0,
	"message": "success",
	"report": {
		"report_id": 128,
		"title": "Incident - Oak Park - 10/12/2026 - Security Emergency",
		"template_name": "Incident Report - Standard",
		"category": "incident",
		"category_name": "Incident",
		"community_id": 5,
		"community_name": "Oak Park",
		"call_id": 9042,
		"officer_name": "Bob Carter",
		"management_summary": "Resolved on site; no further action required.",
		"created_on": "2026-10-12 08:14:03",
		"delivered_on": "2026-10-12 11:00:00",
		"pdf_url": "https://.../files/a/...",
		"sections": [
			{"report_section_id": 501, "title": "Incident Details", "sort_order": 0,
			 "fields": [{"field_id": 104, "field_key": "custom_0_3", "label": "Narrative", "field_type": "text", "value": "…"},
			            {"field_id": 106, "field_key": "media", "label": "Photos", "field_type": "file_upload", "value": null, "attachments": [{"url": "https://…"}]}]}
		]
	}
}
```

Only client-included sections are returned; manager notes, internal sections and field configuration are never included. **Errors:** `710`.

### 2.14 `Report/get_report_metadata`

**Response:**
```json
{
	"rc": 0,
	"message": "success",
	"statuses": {"draft": "Draft", "submitted": "Submitted", "under_review": "Under Review", "changes_requested": "Changes Requested", "approved": "Approved", "delivered": "Delivered"},
	"categories": {"incident": "Incident", "daily_activity": "Daily Activity", "custom": "Custom"},
	"history_actions": {"created": "Created", "updated": "Updated", "…": "…"}
}
```

---

## 3. Related Endpoints

| Endpoint | Use |
|---|---|
| `ReportTemplate/get_templates_list`, `ReportTemplate/get_template` | Officer template picker / form structure before `create_report` |
| `Poi/get_poi_record` | `related_reports: [{report_id, title, status, status_name, created_on}]` — show under "Related Incidents" next to `related_incidents` (calls); tap opens the report |
| `Settings/get_notification_settings`, `Settings/update_notification_settings` | Toggles `report_submitted_enabled`, `report_under_review_enabled`, `report_approved_enabled`, `report_changes_enabled`, `report_delivered_enabled` |
| Notifications | Types `report_submitted`, `report_under_review`, `report_changes_requested`, `report_approved`, `report_delivered`, `new_incident_report`; `payload = {"entity_type": "report", "entity_id": <report_id>}` → open the report |

---

## 4. Error Directory

| rc | Constant | Meaning / UI handling |
|---|---|---|
| 103 | `ERR_NO_PRIVILEGES` | Admin outside community scope |
| 105 | `ERR_INVALID_API_PARAM` | Invalid parameter (`info` names it) |
| 321 | `ERR_FILE_NOT_FOUND` | Uploaded file ID unknown — re-upload |
| 484 | `ERR_EXPORT_FAILED` | PDF generation failed — retry |
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Officer has no community assigned |
| 710 | `ERR_REPORT_NOT_FOUND` | Report missing or not accessible — refresh the list |
| 711 | `ERR_REPORT_TEMPLATE_NOT_FOUND` | Template no longer available — reload templates |
| 712 | `ERR_REPORT_CANNOT_SUBMIT` | Status changed — reload the report |
| 713 | `ERR_REPORT_CANNOT_APPROVE` | Not under review |
| 714 | `ERR_REPORT_CANNOT_DELIVER` | Not approved |
| 716 | `ERR_REPORT_TEMPLATE_INVALID_CATEGORY` | Invalid category filter |
| 720 | `ERR_REPORT_TEMPLATE_SECTION_REQUIRED` | Template has no sections |
| 726 | `ERR_REPORT_CANNOT_EDIT` | Not editable (status changed) — reload, show read-only |
| 727 | `ERR_REPORT_LOCKED` | Another manager reviews it — show `locked_by_name` / `expires_on` |
| 728 | `ERR_REPORT_CANNOT_REVIEW` | Not reviewable in its status |
| 729 | `ERR_REPORT_CANNOT_REQUEST_CHANGES` | Not under review |
| 730 | `ERR_REPORT_REQUIRED_FIELDS_MISSING` | Highlight `missing_fields` |
| 731 | `ERR_REPORT_INVALID_FIELD_VALUE` | Highlight the field named in `info` |
| 732 | `ERR_REPORT_FIELD_LOCKED` | Field is read-only (should not be editable in the UI) |
| 733 | `ERR_REPORT_INVALID_SECTION` | Unknown section — reload |
| 734 | `ERR_REPORT_CHANGES_COMMENT_REQUIRED` | Comments mandatory |
| 735 | `ERR_REPORT_INVALID_CALL` | Call not accessible |
| 736 | `ERR_REPORT_NOT_UNDER_REVIEW_BY_USER` | Review lost / not started — call `start_review` |
| 737 | `ERR_REPORT_INVALID_STATUS` | Invalid status filter |
| 738 | `ERR_REPORT_FILE_LIMIT_REACHED` | Too many files for the field (`info`: max) |
| 739 | `ERR_REPORT_INVALID_ATTACHMENT` | Kept attachment not in the field — reload |
| 740 | `ERR_REPORT_INVALID_CLIENT` | Recipient must be an active resident of the community |
| 741 | `ERR_REPORT_INVALID_POI` | POI record not accessible |
| 742 | `ERR_REPORT_CANNOT_EXPORT` | PDF only available after delivery |

---

## 5. Integration Recipes

**Officer — report from a call**
1. `ReportTemplate/get_templates_list` → pick a template.
2. `Report/create_report {template_id, call_id}` → `report_id`.
3. `Report/get_report` → render the form from `sections[].fields[]` (`is_locked` → read-only).
4. `Report/update_report` on save; `Report/submit_report` when done; handle `730`.

**Officer — revision loop**
1. Notification `report_changes_requested` → `get_report` → show `changes_comment`.
2. Edit (`update_report`) → `submit_report` (returns `under_review`).

**Manager — review**
1. `get_reports_list {statuses: ["submitted"]}`.
2. `start_review` (handle `727`) → `get_report` (admin view, `submitted_value` per field for comparison).
3. Optional `update_report` (values / `manager_notes` / `client_included`).
4. `request_changes {comments}` **or** `approve_report {included_section_ids, management_summary}` → `deliver_report`.
5. Leaving without a decision → `release_review`.

**Resident**
1. `get_reports_list` → `get_report_for_client`.
2. `export_report_pdf` for a fresh download URL.
