# POI Module — App Developer Guide

**Module:** `POI` (Person of Interest)
**Phase:** 6.2
**Audience:** Frontend developers (React Web Portal, React Native Mobile App)

---

## 1. Authentication & Access

All POI endpoints require a valid session token (`#token: "s"`). The token is passed as the `token` parameter in every request.

### 1.1 Access Control Matrix

| Endpoint | Admin | Officer | Notes |
|----------|:-----:|:-------:|-------|
| `POI/get_poi_list` | ✅ | ✅ | Officers see only active records in their community |
| `POI/get_poi_record` | ✅ | ✅ | Officers: active + own community only; no internal notes |
| `POI/create_poi_record` | ✅ | ❌ | |
| `POI/update_poi_record` | ✅ | ❌ | |
| `POI/publish_poi_record` | ✅ | ❌ | |
| `POI/inactivate_poi_record` | ✅ | ❌ | |
| `POI/archive_poi_record` | ✅ | ❌ | |
| `POI/export_poi_record` | ✅ | ❌ | |
| `POI/get_poi_metadata` | ✅ | ✅ | |
| `POI/mark_viewed` | ❌ | ✅ | Clears NEW/UPDATED badges |
| `Settings/get_poi_settings` | ✅ | ❌ | |
| `Settings/update_poi_settings` | ✅ | ❌ | |

### 1.2 Pagination

All list endpoints use **0-based pagination**:
- `offset` — 0-based index of the first record to return (default: `0`).
- `limit` — page size (default: `20`, max: `100`).
- Response includes `total_count` for calculating total pages.

---

## 2. Endpoint Directory

### 2.1 `POI/get_poi_list`

Returns a paginated, filtered list of POI record cards.

**ACL:** Admin, Officer

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `community_id` | int | | `0` | Filter by community (admin only; `0` = all) |
| `record_type` | string | | `""` | Filter: `poi`, `trespass`, `metro_red_card` |
| `status` | string | | `""` | Filter: `draft`, `active`, `expired`, `inactive`, `archived` |
| `threat_level` | string | | `""` | Filter: `low`, `medium`, `high`, `critical` |
| `expiring_within_days` | int | | `0` | Records expiring within N days (`0` = no filter) |
| `search_text` | string | | `""` | Free-text search: name, aliases, summary, record ID |
| `sort_by` | string | | `created_on` | Sort: `created_on`, `threat_level`, `name`, `last_update` |
| `sort_dir` | string | | `desc` | Direction: `asc`, `desc` |
| `offset` | int | | `0` | Pagination offset (0-based) |
| `limit` | int | | `20` | Page size (max 100) |

#### Response

```json
{
  "rc": 0,
  "message": "success",
  "total_count": 42,
  "records": [
    {
      "record_id": 1,
      "record_type": "trespass",
      "record_type_name": "Trespass Order",
      "status": "active",
      "first_name": "John",
      "last_name": "Smith",
      "full_name": "John Smith",
      "known_aliases": "Johnny S, JS",
      "threat_level": "high",
      "threat_level_name": "High",
      "summary": "Subject has active trespass order for Building A",
      "photo_url": "https://storage.example.com/files/abc123.jpg",
      "sites": [
        {"community_id": 5, "community_name": "Riverside Plaza"}
      ],
      "expiry_date": "2025-06-30",
      "created_on": "2025-01-15 09:30:00",
      "last_update": "2025-01-20 14:22:00",
      "view_badge": "updated"
    }
  ]
}
```

**Officer-specific fields:**
- `view_badge` — `"new"`, `"updated"`, or `null`. Only present for officer users.

**Notes:**
- Officers automatically see only `active` records for their community. The `status` and `community_id` filters are ignored for officers.
- `photo_url` is the first photo (`PPH_SORT_ORDER=0`), batch-fetched for the page.
- `threat_level` sort orders by severity: critical → high → medium → low.

---

### 2.2 `POI/get_poi_record`

Returns full details for a single POI record.

**ACL:** Admin, Officer

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_id` | int | ✅ | — | POI Record ID |

#### Response (Admin)

```json
{
  "rc": 0,
  "message": "success",
  "record": {
    "record_id": 1,
    "record_type": "trespass",
    "record_type_name": "Trespass Order",
    "status": "active",
    "first_name": "John",
    "last_name": "Smith",
    "full_name": "John Smith",
    "known_aliases": "Johnny S",
    "date_of_birth": "1985-03-15",
    "gender": "male",
    "physical_description": "6ft, brown hair, scar on left cheek",
    "threat_level": "high",
    "threat_level_name": "High",
    "summary": "Subject has active trespass order",
    "photos": [
      {"photo_id": 10, "url": "https://...", "sort_order": 0},
      {"photo_id": 11, "url": "https://...", "sort_order": 1}
    ],
    "sites": [
      {"site_id": 3, "community_id": 5, "community_name": "Riverside Plaza"}
    ],
    "related_incidents": [
      {"incident_link_id": 7, "call_id": 42}
    ],
    "expiry_date": "2025-06-30",
    "issue_date": "2024-06-30",
    "created_on": "2025-01-15 09:30:00",
    "last_update": "2025-01-20 14:22:00",
    "internal_notes": "Subject has prior conviction history",
    "inactivation_reason": null,
    "approved_by": "admin_001",
    "approved_by_name": "Jane Admin",
    "approved_on": "2025-01-15 10:00:00",
    "created_by": "admin_001",
    "created_by_name": "Jane Admin",
    "trespass_notice_number": "TN-2024-0042",
    "issuing_authority": "City of Springfield PD",
    "property_area_covered": "Building A and surrounding parking lot",
    "notice_document": "https://storage.example.com/files/notice_scan.pdf",
    "renewal_reminder_days": 14,
    "law_enforcement_contact": "Officer Jones, 555-0199",
    "conditions": "Subject must remain 500ft from premises"
  }
}
```

#### Response (Officer)

Officers receive a reduced payload:

- **Excluded fields:** `internal_notes`, `inactivation_reason`, `approved_by`, `approved_on`, `created_by`, and all type-specific legal/admin fields (`trespass_notice_number`, `red_card_number`, `notice_document`, `card_document`, `conditions`, `law_enforcement_contact`, `renewal_reminder_days`, `incident_history_summary`, `watch_level_review_date`, `associated_individuals`).
- **Added fields:**
  - `view_badge` — `"new"`, `"updated"`, or `null`.
  - `response_guidance` — actionable text from `settings:poi` (e.g., "DO NOT APPROACH ALONE...").
- **Visible type-specific fields (non-sensitive):**
  - Trespass: `issuing_authority`, `property_area_covered`.
  - Metro RC: `issuing_authority`, `lines`.

---

### 2.3 `POI/create_poi_record`

Creates a new POI/Trespass/Metro Red Card record.

**ACL:** Admin only

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_type` | string | ✅ | — | `poi`, `trespass`, `metro_red_card` |
| `first_name` | string | ✅ | — | Max 60 chars |
| `last_name` | string | ✅ | — | Max 60 chars |
| `known_aliases` | string | | `""` | Comma-separated, max 200 chars |
| `date_of_birth` | string | | `""` | `YYYY-MM-DD` |
| `gender` | string | | `""` | `male`, `female`, `unknown` |
| `physical_description` | string | | `""` | Max 500 chars |
| `threat_level` | string | ✅ | — | `low`, `medium`, `high`, `critical` |
| `summary` | string | ✅ | — | Max 300 chars (visible to officers) |
| `internal_notes` | string | | `""` | Max 2000 chars (admin-only) |
| `community_ids` | array | ✅ | — | Array of community IDs (min 1) |
| `photo_file_ids` | array | ✅ | — | Array of file IDs (min 1, max 10) |
| `related_incident_ids` | array | | `[]` | Array of service_call IDs |
| `incident_history_summary` | string | | `""` | POI only, max 1000 chars |
| `watch_level_review_date` | string | | `""` | POI only, `YYYY-MM-DD` |
| `associated_individuals` | string | | `""` | POI only, max 500 chars |
| `trespass_notice_number` | string | | `""` | Trespass only (required for trespass) |
| `issuing_authority` | string | | `""` | Trespass & Metro RC (required for both) |
| `property_area_covered` | string | | `""` | Trespass only (required for trespass) |
| `issue_date` | string | | `""` | Trespass & Metro RC, `YYYY-MM-DD` (required for both) |
| `expiry_date` | string | | `""` | Trespass & Metro RC, `YYYY-MM-DD` (required for both) |
| `notice_document_file_id` | int | | `0` | Trespass only (required for trespass, must be > 0) |
| `renewal_reminder_days` | int | | `-1` | Days before expiry for reminder (`-1` = use settings default) |
| `law_enforcement_contact` | string | | `""` | Trespass only |
| `conditions` | string | | `""` | Trespass only |
| `red_card_number` | string | | `""` | Metro RC only (required) |
| `lines` | string | | `""` | Metro RC only |
| `card_document_file_id` | int | | `0` | Metro RC only |
| `publish` | bool | | `false` | If `true`, immediately publish (draft → active) |

**Type-specific required fields:**

| Field | `poi` | `trespass` | `metro_red_card` |
|-------|:-----:|:---------:|:----------------:|
| `trespass_notice_number` | — | ✅ | — |
| `issuing_authority` | — | ✅ | ✅ |
| `property_area_covered` | — | ✅ | — |
| `issue_date` | — | ✅ | ✅ |
| `expiry_date` | — | ✅ | ✅ |
| `notice_document_file_id` | — | ✅ (> 0) | — |
| `red_card_number` | — | — | ✅ |

#### Response

```json
{
  "rc": 0,
  "message": "success",
  "record_id": 42
}
```

---

### 2.4 `POI/update_poi_record`

Updates an existing draft or active POI record. Only sends fields you want to change — all fields use `/null/` as the skip sentinel (when `null` is received, the field is not modified).

**ACL:** Admin only

#### Parameters

Same fields as `create_poi_record` except:
- `record_type` cannot be changed.
- `record_id` (int, required) replaces `record_type`.
- All fields are optional (use `/null/` to skip).
- `photo_file_ids` replaces the entire photo set (soft-delete + re-insert).
- `community_ids` replaces the entire site set (soft-delete + re-insert).
- `related_incident_ids` replaces the entire incident link set.
- `notice_document_file_id` and `card_document_file_id` use `-1` to skip (not `/null/`).
- `renewal_reminder_days` uses `-1` to skip.

**Version-level vs always-editable:**

Changes to `internal_notes`, `renewal_reminder_days`, `watch_level_review_date`, and `related_incident_ids` do NOT trigger `poi_updated` notifications or bump the UPDATED badge. All other field changes on an active record do.

#### Response

```json
{"rc": 0, "message": "success"}
```

---

### 2.5 `POI/publish_poi_record`

Publishes a draft record (transitions to active).

**ACL:** Admin only

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_id` | int | ✅ | — | POI Record ID |
| `notify_officers` | bool | | `true` | Send push notifications to officers |

#### Response

```json
{"rc": 0, "message": "success"}
```

**Side effects:** Sends `poi_active` push notification to officers in assigned communities (unless `notify_officers=false`).

---

### 2.6 `POI/inactivate_poi_record`

Inactivates an active record with a mandatory reason.

**ACL:** Admin only

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_id` | int | ✅ | — | POI Record ID |
| `reason` | string | ✅ | — | Mandatory inactivation reason |

#### Response

```json
{"rc": 0, "message": "success"}
```

**Side effects:** Sends `poi_inactivated` notification to officers.

---

### 2.7 `POI/archive_poi_record`

Archives an expired or inactive record. Archived records cannot be re-activated.

**ACL:** Admin only

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_id` | int | ✅ | — | POI Record ID |

#### Response

```json
{"rc": 0, "message": "success"}
```

---

### 2.8 `POI/export_poi_record`

Generates a watermarked PDF export of a POI record and logs the export for audit.

**ACL:** Admin only

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_id` | int | ✅ | — | POI Record ID |

#### Response

```json
{
  "rc": 0,
  "message": "success",
  "export_id": 7,
  "file_url": "https://storage.example.com/exports/poi_export_42.pdf"
}
```

**PDF content:** Photos, personal details, assessment, sites, type-specific details, record dates. Internal notes are excluded. Every page includes a "CONFIDENTIAL – AUTHORISED USE ONLY" watermark with the admin's name and export timestamp.

---

### 2.9 `POI/get_poi_metadata`

Returns lookup lists for form dropdowns and the current response guidance texts.

**ACL:** Admin, Officer

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |

#### Response

```json
{
  "rc": 0,
  "message": "success",
  "record_types": [
    {"id": "poi", "name": "Person of Interest"},
    {"id": "trespass", "name": "Trespass Order"},
    {"id": "metro_red_card", "name": "Metro Red Card"}
  ],
  "threat_levels": [
    {"id": "low", "name": "Low"},
    {"id": "medium", "name": "Medium"},
    {"id": "high", "name": "High"},
    {"id": "critical", "name": "Critical"}
  ],
  "statuses": [
    {"id": "draft", "name": "Draft"},
    {"id": "active", "name": "Active"},
    {"id": "expired", "name": "Expired"},
    {"id": "inactive", "name": "Inactive"},
    {"id": "archived", "name": "Archived"}
  ],
  "genders": [
    {"id": "male", "name": "Male"},
    {"id": "female", "name": "Female"},
    {"id": "unknown", "name": "Unknown"}
  ],
  "guidance": {
    "poi": "This individual is flagged for awareness only...",
    "trespass": "This individual is subject to a formal trespass order...",
    "metro_red_card": "This individual holds an active transit exclusion..."
  }
}
```

---

### 2.10 `POI/mark_viewed`

Logs or updates the officer's view timestamp for a POI record, clearing the NEW/UPDATED badge.

**ACL:** Officer only

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `token` | string | ✅ | — | Session token |
| `record_id` | int | ✅ | — | POI Record ID |

#### Response

```json
{"rc": 0, "message": "success"}
```

**Preconditions:** Record must be `active` and assigned to the officer's community. Returns `ERR_POI_RECORD_NOT_FOUND` (rc 690) otherwise.

---

### 2.11 `Settings/get_poi_settings` & `Settings/update_poi_settings`

**ACL:** Admin only

**`get_poi_settings` response:**

```json
{
  "rc": 0,
  "message": "success",
  "settings": {
    "renewal_reminder_days": 14,
    "archive_threshold_months": 24,
    "pdf_export_enabled": true,
    "default_poi_guidance": "...",
    "default_trespass_guidance": "...",
    "default_red_card_guidance": "..."
  }
}
```

**`update_poi_settings` parameters:** Same keys as the settings object. Only send keys you want to change.

---

## 3. Error Code Directory

All POI error codes are in the range **rc 690–706**.

| Code | Constant | rc | Message |
|------|----------|:--:|---------|
| `ERR_POI_RECORD_NOT_FOUND` | — | 690 | POI record not found |
| `ERR_POI_INVALID_RECORD_TYPE` | — | 691 | invalid POI record type |
| `ERR_POI_INVALID_THREAT_LEVEL` | — | 692 | invalid threat level |
| `ERR_POI_CANNOT_PUBLISH` | — | 693 | POI record cannot be published in its current status |
| `ERR_POI_CANNOT_INACTIVATE` | — | 694 | POI record cannot be inactivated in its current status |
| `ERR_POI_CANNOT_ARCHIVE` | — | 695 | POI record cannot be archived in its current status |
| `ERR_POI_CANNOT_EDIT` | — | 696 | POI record cannot be edited in its current status |
| `ERR_POI_PHOTO_REQUIRED` | — | 697 | at least one photo is required |
| `ERR_POI_PHOTO_LIMIT_REACHED` | — | 698 | maximum number of photos reached |
| `ERR_POI_SITE_REQUIRED` | — | 699 | at least one site/community is required |
| `ERR_POI_INVALID_STATUS` | — | 700 | invalid POI status |
| `ERR_POI_INVALID_GENDER` | — | 701 | invalid gender |
| `ERR_POI_INACTIVATION_REASON_REQUIRED` | — | 702 | inactivation reason is required |
| `ERR_POI_EXPIRY_DATE_REQUIRED` | — | 703 | expiry date is required for this record type |
| `ERR_POI_EXPORT_DISABLED` | — | 704 | PDF export is not enabled |
| `ERR_POI_TRESPASS_FIELDS_REQUIRED` | — | 705 | required trespass order fields are missing |
| `ERR_POI_RED_CARD_FIELDS_REQUIRED` | — | 706 | required metro red card fields are missing |

**Additional errors from other modules that POI endpoints may return:**

| Constant | rc | When |
|----------|:--:|------|
| `ERR_INVALID_API_PARAM` | 105 | String length exceeded or invalid format |
| `ERR_FILE_NOT_FOUND` | 321 | Photo or document file ID not found |
| `ERR_COMMUNITY_NOT_FOUND` | 500 | Community ID does not exist |
| `ERR_DB_INSERT_ERROR` | 401 | Database insert failure |
| `ERR_DB_UPDATE_ERROR` | 402 | Database update failure |

---

## 4. Push Notification Types

| Type | Event | Payload | Recipients |
|------|-------|---------|------------|
| `poi_active` | Record published | `{entity_type: "poi", entity_id}` | Officers in assigned communities |
| `poi_updated` | Active record edited (version-level) | `{entity_type: "poi", entity_id}` | Officers in assigned communities |
| `poi_inactivated` | Record inactivated | `{entity_type: "poi", entity_id}` | Officers in assigned communities |
| `poi_expiring_soon` | Expiry within reminder window (cron) | `{entity_type: "poi", entity_id}` | Officers in assigned communities |
| `poi_expired` | Record expired (cron) | `{entity_type: "poi", entity_id}` | Officers in assigned communities |

**Mobile deep-link:** Use `entity_type` + `entity_id` from the notification payload to navigate to the POI detail screen. Call `POI/mark_viewed` when the detail screen is displayed.

---

## 5. File Upload Workflow

Photos and legal documents must be uploaded before creating/updating a POI record:

1. Upload file via `File/upload_file_base64` → receives `file_id`.
2. Pass the `file_id`(s) to `create_poi_record` or `update_poi_record`.
3. The server resolves `file_id` → `file_name` via the `file` table.

**Constraints:**
- Photos: min 1, max 10 per record.
- Document files: validated at upload boundary for format (PDF, JPG, PNG) and size (max 20 MB).
- Invalid file IDs return `ERR_FILE_NOT_FOUND` (rc 321).
