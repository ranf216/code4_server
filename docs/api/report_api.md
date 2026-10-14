# Report API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Report/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable. Some errors add an `info` string (e.g. the name of the invalid field) or extra fields documented per endpoint.

**Authentication:** All endpoints require a `#token` field in the request body. Access levels vary per endpoint and are noted individually.

---

## Concepts

### Incident Reports

An incident report is written by an officer from a **report template** (see the Report Template API) and is either:

- **Call-linked** — created from an emergency or service call; incident details are filled in automatically from the call (SDS §3.4.4).
- **POI encounter** — created from a POI record ("Report Encounter"); the subject and the officer's location are filled in automatically (SDS §3.13.2).
- **Standalone** — e.g. a daily activity log; optionally addressed to a specific resident.

The structure (sections, fields) and the formatting of a report are fixed when the report is created. Later changes to the template never alter existing reports.

The report number shown to users is `report_id`.

### Report Lifecycle (SDS §3.4.5)

| Status | Meaning | Officer can edit | Manager actions |
|--------|---------|------------------|-----------------|
| `draft` | Being written by the officer. Not visible to managers. | Yes | — |
| `submitted` | Waiting for review. | Only if the template allows editing after submission | Start review |
| `under_review` | A manager is reviewing the report. | No | Edit, request changes, approve, release (reviewing manager only) |
| `changes_requested` | Sent back to the officer with comments. | Yes | — |
| `approved` | Ready to be delivered. | No | Deliver |
| `delivered` | Delivered to the client. Final — no further edits. | No | Download / regenerate PDF |

```
draft ──submit──► submitted ──start_review──► under_review ──approve──► approved ──deliver──► delivered
                     ▲                            │   │
                     └──────release_review────────┘   └──request_changes──► changes_requested ──submit──► under_review
draft ──submit (template without review)──► approved
```

- When the template does not require a manager review, submitting moves the report directly to `approved`; a manager then delivers it.
- A report resubmitted after `changes_requested` returns directly to the manager who requested the changes.

### Roles

| Role | Access |
|------|--------|
| **Admin / Manager** | All non-draft reports of the communities they manage (super admins: all communities). Review, edit during review, request changes, approve, deliver, download/regenerate PDF, full history. |
| **Officer** | Their own reports (all statuses). Create, edit while editable, submit and resubmit. |
| **Resident / Client** | Read-only access to delivered reports addressed to them, plus delivered reports without a specific recipient in their own community. PDF download. |

### Client Recipient (SDS §2.5.3)

| Report type | Delivered to |
|-------------|--------------|
| Call-linked, call opened by a resident | That resident |
| Call-linked, call opened by an officer (e.g. panic call) | All residents of the report's community (community-wide) |
| Standalone with `client_user_id` | The selected resident |
| Standalone without `client_user_id` | All residents of the report's community (community-wide) |

Only reports with a specific recipient send the "New Incident Report" notification; community-wide reports appear in the residents' report list without a notification.

### Field Values

Each report contains sections; each section contains fields. Values are sent and returned per field, keyed by `field_id`:

| `field_type` | Value sent / returned |
|--------------|-----------------------|
| `text` | String. Maximum length: the field's `config.max_chars` (default 10,000). |
| `date` | `YYYY-MM-DD` string. |
| `location` | Object `{"address": "...", "latitude": 32.08, "longitude": 34.78}` (or a plain address string). Address max 500 characters; latitude −90..90, longitude −180..180; latitude and longitude must be sent together. |
| `dropdown` | String, or an array of strings when `config.is_multi_select` is `true`. Values must be one of `config.dropdown_values`. |
| `file_upload`, `digital_signature` | Send `{"attachment_ids": [<attachments to keep>], "file_ids": [<newly uploaded file IDs>]}`. Attachments not listed in `attachment_ids` are removed. Returned as an `attachments` array; `value` is `null`. Maximum files: `config.max_files` (default 10; digital signature: 1). |

Upload files with the File API first and pass the returned file IDs. Send `null` or `""` to clear a value.

### Auto-Filled and Locked Fields

When a report is created, system fields are filled in automatically:

| Source | Fields |
|--------|--------|
| Always | Officer name, community name |
| Linked call | Incident date and time, location, incident type, description, resident name, call reference, priority, officer comments; call photos are attached to the media field |
| POI encounter (fields not already filled from a call) | Incident type (POI record type name, e.g. `Trespass Order`), description (subject name, aliases and POI Record ID), location (officer's current position) |

Auto-filled fields are returned with `is_auto_populated: true`. They are **locked** (`is_locked: true`, cannot be changed by the officer or the manager) except **incident description**, **officer comments** and **media**, which stay editable.

### Required Fields (submission)

- **Required section:** all of its required fields must be filled (if it has no required field, at least one field must be filled).
- **Optional section:** may be left empty; once any of its fields is filled, its required fields must be filled too.

### Review Lock (SDS §4.4.7.1)

Only one manager can review a report at a time. Starting a review locks the report for **30 minutes**; every reviewer action (edit, request changes, approve) refreshes the lock. An expired lock can be taken over by another manager with `start_review`. Closing the review without a decision (`release_review`) returns the report to `submitted`.

### Client Visibility

Each section has a `client_included` flag. It defaults to the template's "client visible" setting and can be changed by the reviewing manager (`update_report` or the approval checklist). Clients only ever receive included sections; manager notes, internal sections and the officer's original values are never shown to clients.

### Client PDF (SDS §2.5.3, §4.4.7.4)

Generated on delivery from the template formatting settings. Every page carries a diagonal **"CONFIDENTIAL – AUTHORISED USE ONLY"** watermark, a header (community, report title, report ID) and a footer (delivery date/time, "Generated by Code4 Axis Security Operations", page X of Y). JPEG and PNG attachments are embedded; other files (and images that cannot be decoded) are listed by file name. PDF URLs are signed and time-limited — request a fresh URL rather than storing it.

### Pagination

`get_reports_list` uses 0-based pages. Page size is server-controlled (currently 20); there is no page-size parameter. Requesting a page outside the range returns an empty `reports` array with correct `num_of_items` and `num_of_pages`.

### Notifications (SDS §5.4.4)

| Event | Notification type | Recipient |
|-------|-------------------|-----------|
| Report submitted | `report_submitted` | Community managers (or the returning reviewer on resubmission) |
| Review started | `report_under_review` | Officer |
| Changes requested | `report_changes_requested` (message includes the comments) | Officer |
| Report approved | `report_approved` | Officer |
| Report delivered | `report_delivered` | Officer |
| Report delivered | `new_incident_report` | Specific client recipient only |

Each notification carries `payload: {"entity_type": "report", "entity_id": <report_id>}`. The toggles are managed with `Settings/update_notification_settings` (`report_submitted_enabled`, `report_under_review_enabled`, `report_changes_enabled`, `report_approved_enabled`, `report_delivered_enabled`).

---

## Endpoints — List & Detail

### POST Report/get_reports_list
*Admin, Officer or Resident.* Returns a paginated list of incident reports, automatically scoped by the caller's role.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `community_ids` | array of integers | No | Admin only: filter by communities. |
    | `officer_user_ids` | array of strings | No | Admin only: filter by author (officer user IDs). |
    | `statuses` | array of strings | No | Admin and officer: filter by status (`draft`, `submitted`, `under_review`, `changes_requested`, `approved`, `delivered`). Drafts are never returned to admins. |
    | `category` | string | No | Filter by category: `incident`, `daily_activity`, `custom`. |
    | `review_required` | boolean | No | Admin only: `true` / `false`; omit for all. |
    | `call_id` | integer | No | Reports linked to a call. Default `0` (all). |
    | `from_date` | string | No | `YYYY-MM-DD`. Admin: submitted date; officer: created date; resident: delivered date. |
    | `to_date` | string | No | `YYYY-MM-DD` (inclusive), same date as `from_date`. |
    | `search_text` | string | No | Admin: title, report ID or officer name. Officer / resident: title. |
    | `sort_by` | string | No | Admin only: `submitted_on` (default), `created_on`, `status`, `title`, `report_id`. |
    | `sort_dir` | string | No | Admin only: `asc` or `desc` (default). |
    | `page` | integer | No | Page number (0-based). Default `0`. |

- **Return Values (admin / officer):**
    ```json
    {
        "rc": 0,
        "message": "success",
        "reports":
        [
            {
                "report_id": 128,
                "title": "Incident - Oak Park - Security Emergency",
                "community_id": 5,
                "community_name": "Oak Park",
                "category": "incident",
                "category_name": "Incident",
                "call_id": 9042,
                "created_on": "2026-10-12 08:14:03",
                "delivered_on": null,
                "reviewer_user_id": "u_a1c9...",
                "reviewer_name": "Maria Lopez",
                "review_started_on": "2026-10-12 09:25:00",
                "review_lock":
                {
                    "is_locked": true,
                    "locked_by": "u_a1c9...",
                    "locked_by_name": "Maria Lopez",
                    "expires_on": "2026-10-12 09:55:00"
                },
                "template_id": 7,
                "template_name": "Incident Report - Standard",
                "status": "under_review",
                "status_name": "Under Review",
                "officer_user_id": "u_31f2...",
                "officer_name": "Bob Carter",
                "review_required": true,
                "submitted_on": "2026-10-12 09:02:41",
                "last_update": "2026-10-12 09:25:00"
            }
        ],
        "num_of_items": 37,
        "num_of_pages": 2
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `report_id` | integer | Report number. |
    | `title` | string | Report title (generated from the template title format). |
    | `community_id`, `community_name` | integer, string | Community of the report. |
    | `category`, `category_name` | string | Report category. |
    | `call_id` | integer \| null | Linked call, or `null`. |
    | `created_on` | string | Creation datetime. |
    | `delivered_on` | string \| null | Delivery datetime. |
    | `reviewer_user_id`, `reviewer_name` | string \| null | Manager reviewing (or who last reviewed) the report. **Admin only.** |
    | `review_started_on` | string \| null | Start of the current review. **Admin only.** |
    | `review_lock` | object | Current review lock: `is_locked`, `locked_by`, `locked_by_name`, `expires_on` (all `null` when not locked). **Admin only.** An `under_review` report with `is_locked: false` can be taken over. |
    | `template_id`, `template_name` | integer, string | Source template. |
    | `status`, `status_name` | string | Report status. |
    | `officer_user_id`, `officer_name` | string | Author. |
    | `review_required` | boolean | Whether the report goes through manager review. |
    | `submitted_on` | string \| null | Latest submission datetime. |
    | `last_update` | string \| null | Last modification datetime. |
    | `num_of_items`, `num_of_pages` | integer | Pagination totals. |

- **Return Values (resident):** each item contains only `report_id`, `title`, `community_id`, `community_name`, `category`, `category_name`, `call_id`, `created_on` (date of the incident report), `delivered_on` and `pdf_url` (signed PDF URL).

    **Role scoping:** officers receive their own reports, newest first; residents receive delivered reports addressed to them or community-wide in their community, most recently delivered first; admins receive non-draft reports of the communities they manage.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A parameter has an invalid type. |
    | 103 | current user does not have privileges to perform this action | An admin filtered by a community they do not manage. |
    | 105 | invalid api param | `from_date` or `to_date` is not a valid date (`info` names the parameter). |
    | 201 | invalid user token | Invalid or expired token. |
    | 716 | invalid report category | Invalid `category` filter. |
    | 737 | invalid report status | Invalid value in `statuses`. |

- **Usage & Flows:**
    Admin portal: Incident Reports queue (SDS §4.4.7) — tabs map to `statuses` (e.g. Pending Review = `["submitted", "under_review"]`), with community, author, category, review-required and submitted-date filters; `review_lock` drives the lock indicator and countdown. Officer app: My Reports (drafts, changes requested, in review, completed). Resident app / portal: Reports list (SDS §2.5.3) with View and Download PDF actions. Use `call_id` to show the reports of a call.

---

### POST Report/get_report
*Admin, Officer or Resident.* Returns the full content of a report. The content depends on the caller's role; residents receive the client view (identical to `get_report_for_client`).

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `report_id` | integer | Yes | Report ID. |

- **Return Values (admin view):**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report":
        {
            "report_id": 128,
            "title": "Incident - Oak Park - Security Emergency",
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
            "review_lock":
            {
                "is_locked": true,
                "locked_by": "u_a1c9...",
                "locked_by_name": "Maria Lopez",
                "expires_on": "2026-10-12 09:55:00"
            },
            "can_edit": true,
            "sections":
            [
                {
                    "report_section_id": 501,
                    "section_id": 11,
                    "title": "Incident Details",
                    "sort_order": 0,
                    "is_required": true,
                    "client_included": true,
                    "manager_notes": "Verified with CCTV footage",
                    "fields":
                    [
                        {
                            "field_id": 104,
                            "field_key": "custom_narrative",
                            "label": "Narrative",
                            "field_type": "text",
                            "value": "Rear door forced open (verified on CCTV).",
                            "description": null,
                            "config": {"max_chars": 500},
                            "is_system_field": false,
                            "is_required": true,
                            "is_auto_populated": false,
                            "is_locked": false,
                            "submitted_value": "Rear door forced open."
                        },
                        {
                            "field_id": 106,
                            "field_key": "media",
                            "label": "Photos",
                            "field_type": "file_upload",
                            "value": null,
                            "attachments": [{"attachment_id": 77, "url": "https://domain/files/a/..."}],
                            "description": null,
                            "config": {"max_files": 5},
                            "is_system_field": true,
                            "is_required": false,
                            "is_auto_populated": false,
                            "is_locked": false
                        }
                    ]
                }
            ],
            "history":
            [
                {
                    "history_id": 1,
                    "action": "created",
                    "action_name": "Created",
                    "from_status": null,
                    "to_status": "draft",
                    "user_id": "u_31f2...",
                    "user_name": "Bob Carter",
                    "comment": null,
                    "changes": null,
                    "created_on": "2026-10-12 08:14:03"
                }
            ]
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `poi_id` | integer \| null | POI record of a Report Encounter, or `null`. |
    | `client_user_id`, `client_name` | string \| null | Specific client recipient; `null` = community-wide. |
    | `allow_officer_editing` | boolean | Whether the officer may edit after submission. |
    | `changes_comment` | string \| null | Latest manager comments when changes were requested. |
    | `management_summary` | string \| null | Summary shown at the top of the client report. |
    | `approved_on`, `approved_by_name` | string \| null | Approval (`approved_by_name` is `null` when approved automatically). |
    | `delivered_on`, `delivered_by_name` | string \| null | Delivery. |
    | `pdf_url` | string \| null | Signed URL of the client PDF (delivered reports). |
    | `reviewer_user_id`, `reviewer_name`, `review_started_on`, `review_lock` | — | Review state (see `get_reports_list`). **Admin only.** |
    | `can_edit` | boolean | Whether the caller can currently edit (officer: editable status; admin: reviewing the report). |
    | `sections[].report_section_id` | integer | ID used by `update_report` and the approval checklist. |
    | `sections[].section_id` | integer | Template section ID (used for initial values in `create_report`). |
    | `sections[].client_included` | boolean | Included in the client report. |
    | `sections[].manager_notes` | string \| null | Internal manager notes. **Admin only.** |
    | `fields[].value` | varies | See Field Values. `null` for file fields. |
    | `fields[].attachments` | array | File fields only: `attachment_id`, `url`. |
    | `fields[].config` | object \| null | Field constraints (`max_chars`, `dropdown_values`, `is_multi_select`, `max_files`). |
    | `fields[].is_auto_populated` / `is_locked` | boolean | Auto-filled / read-only. |
    | `fields[].submitted_value` | varies | The officer's last submitted value (non-file fields). **Admin only** — use it to show manager edits. |
    | `history` | array | Audit trail (see `get_report_history`). **Admin only.** |

    **Officer view:** same structure without `reviewer_user_id`, `reviewer_name`, `review_started_on`, `review_lock`, `history`, `manager_notes` and `submitted_value`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | An admin requested a report of a community they do not manage. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist, is not the officer's own report, is a draft (admin), or is not accessible to the resident. |

- **Usage & Flows:**
    Admin portal: Review Studio (SDS §4.4.7.1–§4.4.7.3) — render sections and fields, compare `value` with `submitted_value`, show manager notes and the lock countdown; enable editing only when `can_edit` is `true`. Officer app: report form (fields with `is_locked: true` are read-only) and read-only view of submitted reports; show `changes_comment` as a revision banner when the status is `changes_requested`.

---

### POST Report/get_report_for_client
*Resident only.* Returns the client view of a delivered report: client-included sections only, without internal data.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A Resident session token. |
    | `report_id` | integer | Yes | Report ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report":
        {
            "report_id": 128,
            "title": "Incident - Oak Park - Security Emergency",
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
            "pdf_url": "https://domain/files/a/...",
            "sections":
            [
                {
                    "report_section_id": 501,
                    "title": "Incident Details",
                    "sort_order": 0,
                    "fields":
                    [
                        {
                            "field_id": 104,
                            "field_key": "custom_narrative",
                            "label": "Narrative",
                            "field_type": "text",
                            "value": "Rear door forced open."
                        },
                        {
                            "field_id": 106,
                            "field_key": "media",
                            "label": "Photos",
                            "field_type": "file_upload",
                            "value": null,
                            "attachments": [{"url": "https://domain/files/a/..."}]
                        }
                    ]
                }
            ]
        }
    }
    ```

    Only sections included for the client are returned. Status, review data, manager notes, field configuration and the officer's original values are never included.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist, is not delivered, or is addressed to another resident / another community. |

- **Usage & Flows:**
    Resident app / portal: report detail view opened from the Reports list or from a `new_incident_report` notification (SDS §2.5.3). Show the management summary first, then the sections, and offer a Download PDF button (`export_report_pdf`).

---

### POST Report/get_report_metadata
*Admin, Officer or Resident.* Returns the lookup values used by report screens.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "statuses":
        {
            "draft": "Draft",
            "submitted": "Submitted",
            "under_review": "Under Review",
            "changes_requested": "Changes Requested",
            "approved": "Approved",
            "delivered": "Delivered"
        },
        "categories":
        {
            "incident": "Incident",
            "daily_activity": "Daily Activity",
            "custom": "Custom"
        },
        "history_actions":
        {
            "created": "Created",
            "updated": "Updated",
            "submitted": "Submitted",
            "auto_approved": "Auto-Approved",
            "review_started": "Review Started",
            "review_released": "Review Released",
            "changes_requested": "Changes Requested",
            "approved": "Approved",
            "delivered": "Delivered",
            "pdf_regenerated": "PDF Regenerated"
        }
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Load once per session to populate status tabs and badges, category filters and history labels.

---

### POST Report/get_report_history
*Admin only.* Returns the complete audit trail of a report: status transitions, edits after submission (field by field), review actions, delivery and PDF regeneration.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `report_id` | integer | Yes | Report ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "history":
        [
            {
                "history_id": 4,
                "action": "changes_requested",
                "action_name": "Changes Requested",
                "from_status": "under_review",
                "to_status": "changes_requested",
                "user_id": "u_a1c9...",
                "user_name": "Maria Lopez",
                "comment": "Add the suspect description",
                "changes": null,
                "created_on": "2026-10-12 09:40:00"
            },
            {
                "history_id": 5,
                "action": "updated",
                "action_name": "Updated",
                "from_status": "changes_requested",
                "to_status": "changes_requested",
                "user_id": "u_31f2...",
                "user_name": "Bob Carter",
                "comment": null,
                "changes":
                [
                    {
                        "report_section_id": 501,
                        "section_title": "Incident Details",
                        "field_id": 104,
                        "label": "Narrative",
                        "old_value": "Door forced",
                        "new_value": "Rear door forced; male, 1.80m, dark hoodie"
                    }
                ],
                "created_on": "2026-10-12 10:05:12"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `action`, `action_name` | string | `created`, `updated`, `submitted`, `auto_approved`, `review_started`, `review_released`, `changes_requested`, `approved`, `delivered`, `pdf_regenerated`. |
    | `from_status`, `to_status` | string \| null | Status before / after the action. |
    | `user_id`, `user_name` | string \| null | Acting user; `null` for automatic actions (`auto_approved`). |
    | `comment` | string \| null | Change-request comments, or review take-over notes. |
    | `changes` | array \| object \| null | Field-level changes: `{report_section_id, section_title, field_id, label, old_value, new_value}`; file fields: `attachments_added` (file names) / `attachments_removed` (`attachment_id`, `file_name`); section settings: `field` = `manager_notes` or `client_included` with `old_value` / `new_value`. Approval: `{included_section_ids, excluded_section_ids}`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Admin, or the report belongs to a community they do not manage. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist or is a draft. |

- **Usage & Flows:**
    Review Studio history timeline (SDS §4.4.7.1–§4.4.7.4). Expand `changes` to show what was edited and by whom after submission.

---

## Endpoints — Create & Edit

### POST Report/create_report
*Officer only.* Creates a new draft report from an active template available to the officer's community — linked to a call, a POI record, or standalone.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `template_id` | integer | Yes | An active template available to the officer's community. |
    | `call_id` | integer | No | Linked call. Default `0` (not call-linked). |
    | `client_user_id` | string | No | **Standalone reports only:** the resident the report is delivered to (must be an active resident of the report's community). Empty = community-wide. Not allowed together with `call_id`. |
    | `poi_id` | integer | No | POI record for a Report Encounter (must be active and assigned to the officer's community). Default `0`. |
    | `latitude` | decimal | No | Officer's current latitude (POI encounter). If `latitude`/`longitude` are omitted, the officer's last tracked position is used. |
    | `longitude` | decimal | No | Officer's current longitude (POI encounter). |
    | `location_address` | string | No | Address text for the encounter location. |
    | `sections` | array | No | Initial values: `[{"section_id": <template section id>, "values": {"<field_id>": <value>}}]` (see Field Values). |

    **Example (POI encounter):**
    ```json
    {
        "#request": "Report/create_report",
        "#token": "...",
        "template_id": 7,
        "poi_id": 42,
        "latitude": 32.0853,
        "longitude": 34.7818,
        "location_address": "North gate"
    }
    ```

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "title": "Incident - Oak Park - Trespass Order"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `report_id` | integer | New report ID (status `draft`). |
    | `title` | string | Generated title. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `template_id` is missing or a parameter has an invalid type. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Officer. |
    | 105 | invalid api param | `client_user_id` was sent together with `call_id`. |
    | 201 | invalid user token | Invalid or expired token. |
    | 321 | file not found | An initial file value references an unknown file ID. |
    | 500 | community not found | The officer is not assigned to a community. |
    | 711 | report template not found | The template does not exist, is not active, or is not available to the officer's community. |
    | 720 | at least one section is required | The template has no sections. |
    | 731 | invalid report field value | An initial value or the encounter coordinates are invalid (`info` names the field). |
    | 732 | auto-populated report fields cannot be changed | An initial value targets a locked auto-filled field. |
    | 733 | invalid report section | An initial value references an unknown section. |
    | 735 | call not found or not accessible for this report | The call does not exist or the officer cannot access it. |
    | 738 | maximum number of files reached for this report field | Too many files for a file field. |
    | 740 | client must be an active resident of the report community | `client_user_id` is not an active resident of the community. |
    | 741 | POI record not found or not accessible for this report | The POI record does not exist, is not active, or is not assigned to the officer's community. |

- **Usage & Flows:**
    Officer app (SDS §3.4.4): "Write Report" from Call Details (`call_id`), "Report Encounter" from POI Details (`poi_id` + device GPS, SDS §3.13.2), or "New Report" from the Reports screen (optional resident picker). After creation, call `get_report` to render the form.

---

### POST Report/update_report
*Admin or Officer.* Saves changes to a report. Officers edit their own editable reports; managers edit while holding the review and can also set manager notes and section client visibility.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `report_id` | integer | Yes | Report ID. |
    | `sections` | array | Yes | `[{"report_section_id": 501, "values": {"<field_id>": <value>}, "manager_notes": "...", "client_included": true}]`. Only the sections and fields sent are changed. `manager_notes` (max 2000 characters) and `client_included` are applied for managers only. |

    **When editing is allowed:**
    - **Officer:** own report in `draft` or `changes_requested`, or `submitted` when the template allows editing after submission.
    - **Admin:** only while reviewing the report (`under_review`, after `start_review`).

    **Example:**
    ```json
    {
        "#request": "Report/update_report",
        "#token": "...",
        "report_id": 128,
        "sections":
        [
            {
                "report_section_id": 501,
                "values":
                {
                    "104": "Rear door forced open; suspect left on foot.",
                    "105": ["High"],
                    "106": {"attachment_ids": [77], "file_ids": ["f_9c2e..."]}
                }
            },
            {
                "report_section_id": 502,
                "manager_notes": "Verified with CCTV",
                "client_included": false
            }
        ]
    }
    ```

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "title": "Incident - Oak Park - Security Emergency",
        "changed": true
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `title` | string | Current title (may change when the incident type is edited). |
    | `changed` | boolean | `false` when nothing differed from the stored report. |

    Edits made after the first submission are recorded in the report history field by field.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` or `sections` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is a Resident, or an admin outside their communities. |
    | 105 | invalid api param | `values` is not an object, or `manager_notes` exceeds 2000 characters. |
    | 201 | invalid user token | Invalid or expired token. |
    | 321 | file not found | A `file_ids` entry is unknown. |
    | 710 | report not found | Not the officer's own report, or a draft (admin). |
    | 726 | report cannot be edited in its current status | The report is not editable now (e.g. under review for the officer, delivered, or its status changed meanwhile). |
    | 731 | invalid report field value | A value does not match its field type or constraints (`info` names the field). |
    | 732 | auto-populated report fields cannot be changed | A locked auto-filled field was changed. |
    | 733 | invalid report section | Unknown `report_section_id`. |
    | 736 | report is not under review by this manager | The admin has not started the review or no longer holds it. |
    | 738 | maximum number of files reached for this report field | Too many files for the field. |
    | 739 | attachment not found in this report field | An `attachment_ids` entry does not belong to the field. |

- **Usage & Flows:**
    Officer app: save draft / auto-save while filling the form; upload files first, then send `file_ids`. Admin portal (SDS §4.4.7.2): edit values, add manager notes per section and toggle section visibility for the client.

---

### POST Report/submit_report
*Officer only.* Submits a draft report, or resubmits a report after changes were requested. Required fields are validated.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `report_id` | integer | Yes | Own report in `draft` or `changes_requested`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "status": "submitted"
    }
    ```

    | `status` | Meaning |
    |----------|---------|
    | `submitted` | Sent for review; managers are notified. |
    | `approved` | The template does not require review — approved automatically, waiting for delivery. |
    | `under_review` | Resubmission — returned directly to the reviewing manager. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | Not the officer's own report. |
    | 712 | report cannot be submitted in its current status | The report is not in `draft` or `changes_requested` (or its status changed meanwhile). |
    | 730 | required report fields are missing | Required fields are empty. The response adds `missing_fields`: `[{"report_section_id": 501, "section_title": "Incident Details", "field_id": 104, "label": "Narrative"}]` (`field_id: null` = a required section has no content). |

- **Usage & Flows:**
    Officer app "Submit" / "Resubmit" (SDS §3.4.4, §3.4.5). On `730`, navigate to the first missing field and highlight all `missing_fields`.

---

## Endpoints — Review

### POST Report/start_review
*Admin only.* Opens a submitted report for review: the status changes to `under_review` and the report is locked for other managers for 30 minutes.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `report_id` | integer | Yes | A `submitted` report, or an `under_review` report whose lock has expired. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "status": "under_review",
        "expires_on": "2026-10-12 09:55:00"
    }
    ```

    Calling it again while reviewing refreshes the lock and returns the new `expires_on`. The officer receives a `report_under_review` notification when a submitted report is opened.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Admin, or the report belongs to a community they do not manage. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist or is a draft. |
    | 727 | report is under review by another manager | Another manager holds the review. The response adds `locked_by`, `locked_by_name` and `expires_on`. |
    | 728 | report cannot be reviewed in its current status | The report is not `submitted` / `under_review`. |

- **Usage & Flows:**
    "Start Review" in the Review Studio (SDS §4.4.7.1). While the studio is open, call it periodically (e.g. every 10 minutes) to keep the lock alive.

---

### POST Report/release_review
*Admin only.* Closes the review without a decision: the report returns to `submitted` and the lock is released.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `report_id` | integer | Yes | A report under review by the caller. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "status": "submitted"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Admin, or the report belongs to a community they do not manage. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist or is a draft. |
    | 728 | report cannot be reviewed in its current status | The report is not under review. |
    | 736 | report is not under review by this manager | Another manager is reviewing the report. |

- **Usage & Flows:**
    Call when the manager leaves the Review Studio without approving or requesting changes (SDS §4.4.7.1: "closes the report without taking action").

---

### POST Report/request_changes
*Admin only.* Sends the report back to the officer with mandatory comments.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `report_id` | integer | Yes | A report under review by the caller. |
    | `comments` | string | Yes | What must be corrected (1–1000 characters). Shown to the officer as `changes_comment` and included in the notification. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "status": "changes_requested"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` or `comments` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Admin, or the report belongs to a community they do not manage. |
    | 105 | invalid api param | `comments` exceeds 1000 characters. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist or is a draft. |
    | 729 | changes cannot be requested for the report in its current status | The report is not under review. |
    | 734 | comments are required when requesting changes | `comments` is empty. |
    | 736 | report is not under review by this manager | The caller has not started the review or no longer holds it. |

- **Usage & Flows:**
    "Request Changes" modal in the Review Studio (SDS §4.4.7.3). The officer receives a `report_changes_requested` notification and can edit and resubmit.

---

### POST Report/approve_report
*Admin only.* Approves a report under review, optionally setting which sections the client receives and a management summary.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `report_id` | integer | Yes | A report under review by the caller. |
    | `included_section_ids` | array of integers | No | `report_section_id` values to include in the client report; all other sections are excluded. Omit to keep the current inclusion. |
    | `management_summary` | string | No | Shown at the top of the client report (max 1000 characters). Empty = no summary. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "status": "approved"
    }
    ```

    The review lock is released and the officer receives a `report_approved` notification.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Admin, or the report belongs to a community they do not manage. |
    | 105 | invalid api param | `management_summary` exceeds 1000 characters. |
    | 201 | invalid user token | Invalid or expired token. |
    | 710 | report not found | The report does not exist or is a draft. |
    | 713 | report cannot be approved in its current status | The report is not under review. |
    | 733 | invalid report section | An `included_section_ids` entry is not a section of the report. |
    | 736 | report is not under review by this manager | The caller has not started the review or no longer holds it. |

- **Usage & Flows:**
    "Approve" in the Review Studio (SDS §4.4.7.3): show the section inclusion checklist (pre-checked from `client_included`) and the optional management summary, then call this endpoint. Deliver afterwards with `deliver_report`.

---

## Endpoints — Delivery & PDF

### POST Report/deliver_report
*Admin only.* Delivers an approved report to the client: generates the watermarked client PDF, marks the report as delivered (final) and notifies the officer and the specific client recipient.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `report_id` | integer | Yes | An `approved` report. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "status": "delivered",
        "pdf_url": "https://domain/files/a/..."
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `pdf_url` | string | Signed, time-limited URL of the generated PDF. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is not an Admin, or the report belongs to a community they do not manage. |
    | 201 | invalid user token | Invalid or expired token. |
    | 321 | file not found | The generated PDF could not be stored. |
    | 484 | failed to generate the export file | PDF generation failed; the report stays `approved` and the call can be retried. |
    | 710 | report not found | The report does not exist or is a draft. |
    | 714 | report cannot be delivered in its current status | The report is not `approved` (or its status changed meanwhile). |

- **Usage & Flows:**
    "Deliver to Client" in the Review Studio (SDS §4.4.7.4). Confirm with the manager first (delivery is final), show progress while the PDF is generated, then open `pdf_url`.

---

### POST Report/export_report_pdf
*Admin or Resident.* Returns a fresh download URL of the watermarked client PDF of a delivered report. Admins can regenerate the PDF.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin or Resident session token. |
    | `report_id` | integer | Yes | A delivered report (residents: addressed to them or community-wide in their community). |
    | `regenerate` | boolean | No | Admin only: re-render the PDF from the delivered content (original delivery date kept; logged in the history as `pdf_regenerated`). Default `false`. Ignored for residents. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "report_id": 128,
        "pdf_url": "https://domain/files/a/...",
        "regenerated": false
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `pdf_url` | string | Signed, time-limited download URL. |
    | `regenerated` | boolean | `true` when a new PDF was generated by this call. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `report_id` is missing. |
    | 103 | current user does not have privileges to perform this action | The caller is an Officer, or an admin outside their communities. |
    | 201 | invalid user token | Invalid or expired token. |
    | 321 | file not found | A regenerated PDF could not be stored. |
    | 484 | failed to generate the export file | Regeneration failed; the previous PDF remains available. |
    | 710 | report not found | The report does not exist, is a draft (admin), or is not accessible to the resident. |
    | 742 | the report PDF is only available once the report is delivered | The report has not been delivered yet (admin). |

- **Usage & Flows:**
    "Download PDF" in the resident Reports list and report view (SDS §2.5.3), and in the admin portal for delivered reports. Always request a fresh URL when the user taps Download — URLs expire.

---
