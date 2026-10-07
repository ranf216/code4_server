# POI API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Poi/<endpoint_name>"`.

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

### Record Types

The POI module manages three distinct record types under a unified data model. Each type determines which fields are required, what response guidance officers receive, and how lifecycle rules apply.

| Key | Display Name | Purpose |
|-----|-------------|---------|
| `poi` | Person of Interest | Flagged for monitoring based on prior incidents, suspicious behaviour, or intelligence. Informational only — no legal order. |
| `trespass` | Trespass Order | Formal legal notice prohibiting an individual from a property. Has an expiry date and requires a notice document. |
| `metro_red_card` | Metro Red Card | Transit authority–issued exclusion notice for metro/transit facilities. Externally issued, entered by a manager. |

### Record Lifecycle

Records follow a strict status lifecycle. The permitted transitions are:

| From | To | Trigger |
|------|----|---------|
| `draft` | `active` | Admin publishes the record (`publish_poi_record` or `create_poi_record` with `publish=true`). |
| `active` | `expired` | Automatic — the system transitions the record when the expiry date is reached (Trespass and Metro RC only). |
| `active` | `inactive` | Admin inactivates the record with a mandatory reason (`inactivate_poi_record`). |
| `expired` | `archived` | Admin archives the record (`archive_poi_record`). |
| `inactive` | `archived` | Admin archives the record (`archive_poi_record`). |

Archived records cannot be re-activated.

| Status | Visible to Officers | Editable |
|--------|---------------------|----------|
| `draft` | No | Yes |
| `active` | Yes | Yes (version-level edits trigger NEW/UPDATED badges) |
| `expired` | No | No |
| `inactive` | No | No |
| `archived` | No | No |

### Officer View Badges

When an officer accesses POI records, each record carries a `view_badge` field:

- `"new"` — The officer has never viewed this record.
- `"updated"` — The record has been modified since the officer last viewed it (version-level edits only).
- `null` — The officer's view is up to date.

Badges are cleared when the officer calls `mark_viewed`.

### Version-Level vs Always-Editable Fields

When an **active** record is updated, most field changes create a new version (triggering UPDATED badges for officers). The following fields can be edited at any time without creating a new version:

- `internal_notes`
- `renewal_reminder_days`
- `watch_level_review_date`
- `related_incident_ids`

### Threat Levels

| Key | Display Name |
|-----|-------------|
| `low` | Low |
| `medium` | Medium |
| `high` | High |
| `critical` | Critical |

### Genders

| Key | Display Name |
|-----|-------------|
| `male` | Male |
| `female` | Female |
| `unknown` | Unknown |

### Push Notifications

The system sends push notifications at key lifecycle events:

- **Record Published / Activated** — All officers checked in or on upcoming shifts within 24 hours at affected communities.
- **Record Updated (version-level)** — All officers at affected communities.
- **Record Inactivated** — All officers notified the record should be disregarded.
- **Record Expiring Soon** — Within the renewal reminder window (default 14 days) — creating manager and admins receive push and email.
- **Record Expired** — Creating manager and admins notified; officers notified the record is removed.

---

## Endpoints

### POST Poi/get_poi_metadata
*Admin or Officer.* Returns all enumeration values used by the POI module and the current response guidance texts configured by the administrator.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid Admin or Officer session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "record_types":
        {
            "poi": {"name": {"en": "Person of Interest"}},
            "trespass": {"name": {"en": "Trespass Order"}},
            "metro_red_card": {"name": {"en": "Metro Red Card"}}
        },
        "threat_levels":
        {
            "low": {"name": {"en": "Low"}},
            "medium": {"name": {"en": "Medium"}},
            "high": {"name": {"en": "High"}},
            "critical": {"name": {"en": "Critical"}}
        },
        "statuses":
        {
            "draft": {"name": {"en": "Draft"}},
            "active": {"name": {"en": "Active"}},
            "expired": {"name": {"en": "Expired"}},
            "inactive": {"name": {"en": "Inactive"}},
            "archived": {"name": {"en": "Archived"}}
        },
        "genders":
        {
            "male": {"name": {"en": "Male"}},
            "female": {"name": {"en": "Female"}},
            "unknown": {"name": {"en": "Unknown"}}
        },
        "guidance":
        {
            "poi": "This individual has been flagged for awareness only...",
            "trespass": "This individual is prohibited from this property...",
            "metro_red_card": "This individual has an active transit exclusion..."
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `record_types` | object | Map of record type keys to their display-name objects. |
    | `threat_levels` | object | Map of threat level keys to their display-name objects. |
    | `statuses` | object | Map of status keys to their display-name objects. |
    | `genders` | object | Map of gender keys to their display-name objects. |
    | `guidance` | object | Current default response guidance text per record type, as configured in POI settings. May be empty strings if not configured. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called once when the POI module is loaded to populate filter dropdowns, badge colours, and record-type selectors (SDS §4.11). The `guidance` object provides the response guidance text shown to officers on each record's detail screen (SDS §3.13.2). On the officer app, only `record_types`, `threat_levels`, and `guidance` are typically needed.

---

### POST Poi/get_poi_list
*Admin or Officer.* Returns a paginated list of POI / Trespass / Metro Red Card records. Admins see all statuses; officers see only active records for their assigned community.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid Admin or Officer session token. |
    | `community_id` | integer | No | Filter by community. Admin only; `0` or omitted = all communities. Ignored for officers (auto-scoped to their community). |
    | `record_type` | string | No | Filter by record type: `poi`, `trespass`, or `metro_red_card`. |
    | `status` | string | No | Filter by status: `draft`, `active`, `expired`, `inactive`, or `archived`. Admin only; officers always see `active` only. |
    | `threat_level` | string | No | Filter by threat level: `low`, `medium`, `high`, or `critical`. |
    | `expiring_within_days` | integer | No | Show only records whose expiry date falls within the next N days. `0` or omitted = no filter. |
    | `search_text` | string | No | Free-text search across first name, last name, known aliases, summary, and record ID. |
    | `sort_by` | string | No | Sort column. One of: `created_on` (default), `threat_level`, `name`, `last_update`. |
    | `sort_dir` | string | No | Sort direction: `asc` or `desc` (default). |
    | `offset` | integer | No | Pagination offset. Default: `0`. |
    | `limit` | integer | No | Page size: `1`–`100`. Default: `20`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "total_count": 42,
        "records":
        [
            {
                "record_id": 1,
                "record_type": "poi",
                "record_type_name": "Person of Interest",
                "status": "active",
                "first_name": "John",
                "last_name": "Doe",
                "full_name": "John Doe",
                "known_aliases": "JD, Johnny",
                "threat_level": "high",
                "threat_level_name": "High",
                "summary": "Prior incidents at Building A",
                "photo_url": "https://domain/n/abc123.png",
                "sites":
                [
                    {
                        "community_id": 5,
                        "community_name": "Sunset Estates"
                    }
                ],
                "expiry_date": null,
                "created_on": "2026-01-15 10:30:00",
                "last_update": "2026-02-20 14:00:00",
                "view_badge": "new"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `total_count` | integer | Total number of records matching the filters (before pagination). |
    | `records` | array | Page of record summary objects. |
    | `records[].record_id` | integer | Unique record identifier. |
    | `records[].record_type` | string | Record type key: `poi`, `trespass`, or `metro_red_card`. |
    | `records[].record_type_name` | string | Localised display name of the record type. |
    | `records[].status` | string | Current status: `draft`, `active`, `expired`, `inactive`, or `archived`. |
    | `records[].first_name` | string | First name. |
    | `records[].last_name` | string | Last name. |
    | `records[].full_name` | string | Combined first and last name. |
    | `records[].known_aliases` | string \| null | Comma-separated aliases, or `null`. |
    | `records[].threat_level` | string | Threat level key. |
    | `records[].threat_level_name` | string | Localised display name of the threat level. |
    | `records[].summary` | string | Summary description (officer-visible). |
    | `records[].photo_url` | string \| null | URL of the first (primary) photo, or `null` if no photos. |
    | `records[].sites` | array | Communities the record is assigned to. Each entry has `community_id` (integer) and `community_name` (string). |
    | `records[].expiry_date` | string \| null | Expiry date in `YYYY-MM-DD` format, or `null` (POI type has no expiry). |
    | `records[].created_on` | string | Creation datetime. |
    | `records[].last_update` | string \| null | Last modification datetime, or `null`. |
    | `records[].view_badge` | string \| null | **Officer only.** `"new"`, `"updated"`, or `null`. Not present for admins. |

    For officers, the list is automatically scoped to active records at the officer's assigned community.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 691 | invalid POI record type | The `record_type` filter value is not a recognised type. |
    | 692 | invalid threat level | The `threat_level` filter value is not a recognised level. |
    | 700 | invalid POI status | The `status` filter value is not a recognised status. |

- **Usage & Flows:**
    Powers both the manager POI list (SDS §4.11.2) and the officer POI & Trespass tab (SDS §3.13.1). On the manager portal, the default view shows draft and active records filtered to the manager's communities with sorting by creation date. On the officer app, the list is auto-scoped to active records for the officer's community, sorted by threat level (critical first). Use `search_text` for the free-text search bar. Use `expiring_within_days` to surface records nearing expiry.

---

### POST Poi/get_poi_record
*Admin or Officer.* Returns the full details of a single POI record. Officers see only active records for their community; sensitive fields (internal notes, legal documents) are hidden from officers.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid Admin or Officer session token. |
    | `record_id` | integer | Yes | The ID of the POI record to retrieve. |

- **Return Values:**

    **Common fields (all roles):**
    ```json
    {
        "rc": 0,
        "message": "success",
        "record":
        {
            "record_id": 1,
            "record_type": "trespass",
            "record_type_name": "Trespass Order",
            "status": "active",
            "first_name": "Jane",
            "last_name": "Smith",
            "full_name": "Jane Smith",
            "known_aliases": null,
            "date_of_birth": "1985-03-20",
            "gender": "female",
            "physical_description": "5'6\", brown hair, blue eyes",
            "threat_level": "medium",
            "threat_level_name": "Medium",
            "summary": "Trespass order issued for Building C",
            "photos":
            [
                {
                    "photo_id": 10,
                    "url": "https://domain/n/photo1.png",
                    "sort_order": 0
                }
            ],
            "sites":
            [
                {
                    "site_id": 3,
                    "community_id": 5,
                    "community_name": "Sunset Estates"
                }
            ],
            "related_incidents":
            [
                {
                    "incident_link_id": 7,
                    "call_id": 42
                }
            ],
            "expiry_date": "2026-12-31",
            "issue_date": "2026-01-15",
            "created_on": "2026-01-15 10:30:00",
            "last_update": "2026-02-20 14:00:00"
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `record.record_id` | integer | Unique record identifier. |
    | `record.record_type` | string | `poi`, `trespass`, or `metro_red_card`. |
    | `record.record_type_name` | string | Localised display name. |
    | `record.status` | string | Current lifecycle status. |
    | `record.first_name` | string | First name. |
    | `record.last_name` | string | Last name. |
    | `record.full_name` | string | Combined first and last name. |
    | `record.known_aliases` | string \| null | Comma-separated aliases. |
    | `record.date_of_birth` | string \| null | Date of birth (`YYYY-MM-DD`). |
    | `record.gender` | string \| null | Gender key: `male`, `female`, or `unknown`. |
    | `record.physical_description` | string \| null | Physical description text. |
    | `record.threat_level` | string | Threat level key. |
    | `record.threat_level_name` | string | Localised display name of the threat level. |
    | `record.summary` | string | Summary (officer-visible). |
    | `record.photos` | array | Photo objects with `photo_id` (integer), `url` (string), and `sort_order` (integer). |
    | `record.sites` | array | Assigned sites with `site_id` (integer), `community_id` (integer), and `community_name` (string). |
    | `record.related_incidents` | array | Linked incidents with `incident_link_id` (integer) and `call_id` (integer). |
    | `record.expiry_date` | string \| null | Expiry date (`YYYY-MM-DD`), or `null`. |
    | `record.issue_date` | string \| null | Issue date (`YYYY-MM-DD`), or `null`. |
    | `record.created_on` | string | Creation datetime. |
    | `record.last_update` | string \| null | Last modification datetime. |

    **Admin-only fields** (not present for officers):

    | Field | Type | Description |
    |-------|------|-------------|
    | `record.internal_notes` | string \| null | Manager/admin-only notes (max 2000 chars). |
    | `record.inactivation_reason` | string \| null | Reason provided when the record was inactivated. |
    | `record.approved_by` | string \| null | User ID of the admin who published the record. |
    | `record.approved_by_name` | string \| null | Display name of the approving admin. |
    | `record.approved_on` | string \| null | Datetime the record was published. |
    | `record.created_by` | string | User ID of the admin who created the record. |
    | `record.created_by_name` | string \| null | Display name of the creator. |

    **Admin-only, POI type** (`record_type = "poi"`):

    | Field | Type | Description |
    |-------|------|-------------|
    | `record.incident_history_summary` | string \| null | Incident history narrative (max 1000 chars). |
    | `record.watch_level_review_date` | string \| null | Date to review the watch level (`YYYY-MM-DD`). |
    | `record.associated_individuals` | string \| null | Names of associated individuals (max 500 chars). |

    **Trespass type fields** (`record_type = "trespass"`):

    *Admin sees all; officer sees only `issuing_authority` and `property_area_covered`.*

    | Field | Type | Visible To | Description |
    |-------|------|-----------|-------------|
    | `record.trespass_notice_number` | string \| null | Admin | Notice reference number. |
    | `record.issuing_authority` | string \| null | Admin, Officer | Authority that issued the order. |
    | `record.property_area_covered` | string \| null | Admin, Officer | Property or area the order covers. |
    | `record.notice_document` | string \| null | Admin | URL to the uploaded notice document. |
    | `record.renewal_reminder_days` | integer | Admin | Days before expiry to send a renewal reminder. |
    | `record.law_enforcement_contact` | string \| null | Admin | Law enforcement contact information. |
    | `record.conditions` | string \| null | Admin | Conditions on the trespass order. |

    **Metro Red Card type fields** (`record_type = "metro_red_card"`):

    *Admin sees all; officer sees only `issuing_authority` and `lines`.*

    | Field | Type | Visible To | Description |
    |-------|------|-----------|-------------|
    | `record.red_card_number` | string \| null | Admin | Red card reference number. |
    | `record.issuing_authority` | string \| null | Admin, Officer | Authority that issued the card. |
    | `record.lines` | string \| null | Admin, Officer | Transit lines, stations, or zones covered. |
    | `record.card_document` | string \| null | Admin | URL to the uploaded card document. |
    | `record.renewal_reminder_days` | integer | Admin | Days before expiry to send a renewal reminder. |

    **Officer-only fields:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `record.view_badge` | string \| null | `"new"`, `"updated"`, or `null`. |
    | `record.response_guidance` | string | Default response guidance text for this record type, as configured in settings. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 690 | POI record not found | The record does not exist, has been deleted, or the officer does not have access (wrong community or non-active status). |

- **Usage & Flows:**
    Powers the record detail screen for both managers (SDS §4.11.1) and officers (SDS §3.13.2). On the officer app, the `response_guidance` field provides type-specific instructions. The `view_badge` field controls the NEW / UPDATED indicators. The photo gallery is populated from the `photos` array (first photo displayed prominently). Officers can tap "Report Encounter" from this screen to pre-populate a new incident report with the individual's details (SDS §3.13.2).

---

### POST Poi/create_poi_record
*Admin only.* Creates a new POI, Trespass Order, or Metro Red Card record. The record is created in `draft` status unless `publish=true`, in which case it is immediately set to `active` and push notifications are sent to officers in the assigned communities.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `record_type` | string | Yes | `poi`, `trespass`, or `metro_red_card`. |
    | `first_name` | string | Yes | First name (max 60 chars). |
    | `last_name` | string | Yes | Last name (max 60 chars). |
    | `threat_level` | string | Yes | `low`, `medium`, `high`, or `critical`. |
    | `summary` | string | Yes | Summary of why the individual is flagged (max 300 chars, visible to officers). |
    | `community_ids` | array | Yes | Array of community IDs to assign the record to (at least 1). |
    | `photo_file_ids` | array | Yes | Array of previously uploaded file IDs for photos (at least 1, max 10). |
    | `known_aliases` | string | No | Comma-separated aliases (max 200 chars). |
    | `date_of_birth` | string | No | Date of birth (`YYYY-MM-DD`). |
    | `gender` | string | No | `male`, `female`, or `unknown`. |
    | `physical_description` | string | No | Physical description (max 500 chars). |
    | `internal_notes` | string | No | Manager-only notes (max 2000 chars, never shown to officers). |
    | `related_incident_ids` | array | No | Array of related call/incident IDs. |
    | `publish` | boolean | No | If `true`, immediately publish (status → `active`). Default: `false` (saves as `draft`). |

    **POI-only parameters** (`record_type = "poi"`):

    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `incident_history_summary` | string | No | Incident history narrative (max 1000 chars, manager only). |
    | `watch_level_review_date` | string | No | Date to review the watch level (`YYYY-MM-DD`). |
    | `associated_individuals` | string | No | Associated individuals (max 500 chars). |

    **Trespass-only parameters** (`record_type = "trespass"`):

    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `trespass_notice_number` | string | Yes* | Notice reference number. |
    | `issuing_authority` | string | Yes* | Authority that issued the order. |
    | `property_area_covered` | string | Yes* | Property or area the order covers. |
    | `issue_date` | string | Yes* | Issue date (`YYYY-MM-DD`). |
    | `expiry_date` | string | Yes* | Expiry date (`YYYY-MM-DD`). |
    | `notice_document_file_id` | string | Yes* | File ID of the uploaded notice document. |
    | `renewal_reminder_days` | integer | No | Days before expiry to send a renewal reminder. `-1` = use the system default (typically 14 days). |
    | `law_enforcement_contact` | string | No | Law enforcement contact information. |
    | `conditions` | string | No | Conditions on the trespass order. |

    *\* Required when `record_type` is `trespass`.*

    **Metro Red Card–only parameters** (`record_type = "metro_red_card"`):

    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `red_card_number` | string | Yes* | Red card reference number. |
    | `issuing_authority` | string | Yes* | Authority that issued the card. |
    | `issue_date` | string | Yes* | Issue date (`YYYY-MM-DD`). |
    | `expiry_date` | string | Yes* | Expiry date (`YYYY-MM-DD`). |
    | `lines` | string | No | Transit lines, stations, or zones covered. |
    | `card_document_file_id` | string | No | File ID of the uploaded card document. |
    | `renewal_reminder_days` | integer | No | Days before expiry to send a renewal reminder. `-1` = use the system default (typically 14 days). |

    *\* Required when `record_type` is `metro_red_card`.*

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "record_id": 42
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `record_id` | integer | The ID of the newly created record. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 105 | invalid api param (*field_name*) | A required field is missing, empty, or exceeds its maximum length. The parenthesized suffix identifies the offending parameter (e.g. `first_name`, `summary`). |
    | 201 | invalid user token | Invalid or expired token. |
    | 321 | file not found | One or more file IDs in `photo_file_ids`, `notice_document_file_id`, or `card_document_file_id` do not correspond to a valid uploaded file. |
    | 500 | community not found | One or more community IDs in `community_ids` do not exist. |
    | 691 | invalid POI record type | The `record_type` value is not recognised. |
    | 692 | invalid threat level | The `threat_level` value is not recognised. |
    | 697 | at least one photo is required | `photo_file_ids` is empty or not provided. |
    | 698 | maximum number of photos reached | More than 10 photo file IDs were provided. |
    | 699 | at least one site/community is required | `community_ids` is empty or not provided. |
    | 701 | invalid gender | The `gender` value is not recognised. |
    | 705 | required trespass order fields are missing | A required trespass-specific field is missing (notice number, authority, area, dates, or notice document). |
    | 706 | required metro red card fields are missing | A required metro red card–specific field is missing (card number, authority, or dates). |

- **Usage & Flows:**
    Used on the manager portal's Create POI/TI/MRC form (SDS §4.11.1). Photos and documents must be uploaded first via the File API (`File/upload_file_base64`), then their file IDs are passed here. Communities are selected from the community list. Setting `publish=true` immediately activates the record and sends push notifications to officers at the assigned communities (SDS §4.11.6). Setting `publish=false` (default) saves the record as a draft, visible only to admins — no notifications are sent.

---

### POST Poi/update_poi_record
*Admin only.* Updates an existing POI record. Only records in `draft` or `active` status can be edited. On active records, most field changes create a new version (triggering UPDATED badges for officers); see "Version-Level vs Always-Editable Fields" above.

All parameters except `record_id` are optional. Only the fields included in the request are modified; omitted fields remain unchanged.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `record_id` | integer | Yes | The ID of the record to update. |
    | `first_name` | string | No | First name (max 60 chars). |
    | `last_name` | string | No | Last name (max 60 chars). |
    | `known_aliases` | string | No | Comma-separated aliases (max 200 chars). |
    | `date_of_birth` | string | No | Date of birth (`YYYY-MM-DD`). |
    | `gender` | string | No | `male`, `female`, or `unknown`. |
    | `physical_description` | string | No | Physical description (max 500 chars). |
    | `threat_level` | string | No | `low`, `medium`, `high`, or `critical`. |
    | `summary` | string | No | Summary (max 300 chars). |
    | `internal_notes` | string | No | Manager-only notes (max 2000 chars). Always-editable (no version bump). |
    | `community_ids` | array | No | Array of community IDs (replaces all current site assignments; at least 1). |
    | `photo_file_ids` | array | No | Array of photo file IDs (replaces all current photos; at least 1, max 10). |
    | `related_incident_ids` | array | No | Array of related incident IDs (replaces current links). Always-editable (no version bump). |
    | `incident_history_summary` | string | No | Incident history (POI only). |
    | `watch_level_review_date` | string | No | Watch review date (`YYYY-MM-DD`, POI only). Always-editable (no version bump). |
    | `associated_individuals` | string | No | Associated individuals (POI only). |
    | `trespass_notice_number` | string | No | Notice number (Trespass only). |
    | `issuing_authority` | string | No | Issuing authority (Trespass & Metro RC). |
    | `property_area_covered` | string | No | Property/area (Trespass only). |
    | `issue_date` | string | No | Issue date (`YYYY-MM-DD`). |
    | `expiry_date` | string | No | Expiry date (`YYYY-MM-DD`). |
    | `notice_document_file_id` | string | No | Replacement notice document file ID (Trespass only). |
    | `renewal_reminder_days` | integer | No | Days before expiry for reminder. Always-editable (no version bump). `-1` = skip (do not change). |
    | `law_enforcement_contact` | string | No | Law enforcement contact (Trespass only). |
    | `conditions` | string | No | Conditions (Trespass only). |
    | `red_card_number` | string | No | Red card number (Metro RC only). |
    | `lines` | string | No | Transit lines (Metro RC only). |
    | `card_document_file_id` | string | No | Replacement card document file ID (Metro RC only). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    On success, the record is updated. If the record is active and the update is version-level, officers see an UPDATED badge. If the update triggers a version change on an active record, push notifications are sent to officers at the affected communities.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 105 | invalid api param (*field_name*) | A field value is invalid or exceeds its maximum length. The parenthesized suffix identifies the offending parameter. |
    | 201 | invalid user token | Invalid or expired token. |
    | 321 | file not found | A provided file ID does not correspond to a valid uploaded file. |
    | 500 | community not found | A community ID does not exist. |
    | 690 | POI record not found | The record does not exist or has been deleted. |
    | 692 | invalid threat level | The `threat_level` value is not recognised. |
    | 696 | POI record cannot be edited in its current status | The record is in `expired`, `inactive`, or `archived` status. |
    | 697 | at least one photo is required | `photo_file_ids` was provided but is empty. |
    | 698 | maximum number of photos reached | More than 10 photo file IDs were provided. |
    | 699 | at least one site/community is required | `community_ids` was provided but is empty. |
    | 701 | invalid gender | The `gender` value is not recognised. |

- **Usage & Flows:**
    Powers the Edit Record form on the manager portal (SDS §4.11.3). Only the fields being changed need to be included. When replacing photos or communities, the full new set must be provided — partial additions are not supported; the existing set is fully replaced. Editing `internal_notes`, `renewal_reminder_days`, `watch_level_review_date`, or `related_incident_ids` does not create a new version (SDS §4.11.3).

---

### POST Poi/publish_poi_record
*Admin only.* Publishes a draft POI record, changing its status from `draft` to `active`. Once active, the record becomes visible to officers at the assigned communities, and push notifications are sent.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `record_id` | integer | Yes | The ID of the draft record to publish. |
    | `notify_officers` | boolean | No | Whether to send push notifications to officers. Default: `true`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 690 | POI record not found | The record does not exist or has been deleted. |
    | 693 | POI record cannot be published in its current status | The record is not in `draft` status (e.g., already active, expired, inactive, or archived). |

- **Usage & Flows:**
    Called from the manager portal after reviewing a draft record (SDS §4.11.1). Publishing sets the approval fields (approved by, approved on) and triggers push notifications to all officers at the assigned communities who are checked in or on upcoming shifts within 24 hours (SDS §4.11.6). The `notify_officers` flag can suppress notifications when needed (e.g., bulk migration).

---

### POST Poi/inactivate_poi_record
*Admin only.* Inactivates an active POI record with a mandatory reason. The record is immediately removed from officer views and a notification is sent.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `record_id` | integer | Yes | The ID of the record to inactivate. |
    | `reason` | string | Yes | Mandatory reason for inactivation (e.g., concern resolved, order lifted, card cancelled). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 690 | POI record not found | The record does not exist or has been deleted. |
    | 694 | POI record cannot be inactivated in its current status | The record is not in `active` status. |
    | 702 | inactivation reason is required | The `reason` parameter is empty or missing. |

- **Usage & Flows:**
    Called from the record action menu on the manager portal (SDS §4.11.3.1). The consumer app should present a confirmation dialog requiring the admin to enter a reason. Once inactivated, the record is hidden from all officer views and a push notification is sent informing officers the record should be disregarded (SDS §4.11.6). Records can never be permanently deleted.

---

### POST Poi/archive_poi_record
*Admin only.* Archives an expired or inactive POI record. Archived records cannot be re-activated; they remain accessible via the Archived status filter.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `record_id` | integer | Yes | The ID of the record to archive. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 690 | POI record not found | The record does not exist or has been deleted. |
    | 695 | POI record cannot be archived in its current status | The record is not in `expired` or `inactive` status. Only expired or inactive records can be archived. |

- **Usage & Flows:**
    Used by admins to archive records that have been expired or inactive past the configured archive threshold (SDS §4.11.5). Archived records remain visible via the "Archived" status filter on the manager list but cannot be edited or re-activated. The consumer app may offer this as a bulk or individual action.

---

### POST Poi/export_poi_record
*Admin only.* Exports a POI record as a watermarked PDF for law enforcement or legal use. The export is logged with the admin's identity and timestamp.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `record_id` | integer | Yes | The ID of the record to export. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "export_id": 15,
        "file_url": "https://domain/n/poi_export_42.pdf"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `export_id` | integer | Unique identifier for this export event (for audit purposes). |
    | `file_url` | string | URL to download the generated PDF. |

    The PDF includes:
    - Header with record type, name, status, threat level, and record ID.
    - Embedded photos.
    - Personal details: name, aliases, DOB, gender, physical description.
    - Assessment: threat level and summary. Internal notes are **excluded**.
    - Assigned sites.
    - Type-specific fields (trespass details, metro red card details).
    - Record information: creation date, approval date, last update.
    - Watermark on every page: "CONFIDENTIAL – AUTHORISED USE ONLY" with the admin's name and export date/time.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 690 | POI record not found | The record does not exist or has been deleted. |
    | 704 | PDF export is not enabled | The PDF export feature has been disabled in POI settings. |

- **Usage & Flows:**
    Called from the record detail or list action menu on the manager portal (SDS §4.11.4). The consumer app should offer a "Download" or "Export" button and open the returned `file_url`. Every export is recorded in an audit log. The admin must check that PDF export is enabled in settings before calling this endpoint; the API returns error 704 if disabled.

---

### POST Poi/mark_viewed
*Officer only.* Marks a POI record as viewed by the current officer. This updates or creates a view timestamp used to compute the `view_badge` field (`"new"` / `"updated"` / `null`).

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `record_id` | integer | Yes | The ID of the record being viewed. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 690 | POI record not found | The record does not exist, is not active, or the officer's community is not assigned to this record. |

- **Usage & Flows:**
    Called automatically by the officer app when the officer opens a POI record detail screen (SDS §3.13.2). After this call, the `view_badge` for this record returns `null` until the record is updated with a version-level edit. The consumer app should call this endpoint once per detail view — repeated calls are idempotent (the view timestamp is simply refreshed).

---
