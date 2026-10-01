# POI Module — Technical Specification

**Phase:** 6.2 — Persons of Interest
**Source files:** `platform/api/poi.js`, `platform/funcs/poi.js`, `platform/jobs/cron_poi_lifecycle_check.js`
**Decision log:** `docs/issues-questions/poi-issues-questions.md`

---

## 1. Database Schema

### 1.1 `poi_record` — Primary Entity Table

Stores all Person of Interest, Trespass Order, and Metro Red Card records. Column prefix: `POI_`.

```sql
CREATE TABLE `poi_record` (
  `POI_ID`                        bigint unsigned NOT NULL AUTO_INCREMENT,
  `POI_RECORD_TYPE`               varchar(20) NOT NULL           COMMENT 'poi, trespass, metro_red_card',
  `POI_STATUS`                    varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, active, expired, inactive, archived',
  `POI_FIRST_NAME`                varchar(60) NOT NULL,
  `POI_LAST_NAME`                 varchar(60) NOT NULL,
  `POI_KNOWN_ALIASES`             varchar(200) DEFAULT NULL      COMMENT 'Comma-separated known alternative names',
  `POI_DATE_OF_BIRTH`             date DEFAULT NULL,
  `POI_GENDER`                    varchar(10) DEFAULT NULL       COMMENT 'male, female, unknown',
  `POI_PHYSICAL_DESCRIPTION`      varchar(500) DEFAULT NULL,
  `POI_THREAT_LEVEL`              varchar(20) NOT NULL           COMMENT 'low, medium, high, critical',
  `POI_SUMMARY`                   varchar(300) NOT NULL          COMMENT 'Brief description visible to officers',
  `POI_INTERNAL_NOTES`            text DEFAULT NULL              COMMENT 'Extended notes visible to managers/admins only',
  `POI_INCIDENT_HISTORY_SUMMARY`  varchar(1000) DEFAULT NULL     COMMENT 'POI type only: incident narrative',
  `POI_WATCH_LEVEL_REVIEW_DATE`   date DEFAULT NULL              COMMENT 'POI type only: review reminder date',
  `POI_ASSOCIATED_INDIVIDUALS`    varchar(500) DEFAULT NULL      COMMENT 'POI type only: linked individuals',
  `POI_TRESPASS_NOTICE_NUMBER`    varchar(100) DEFAULT NULL      COMMENT 'Trespass only: notice reference number',
  `POI_ISSUING_AUTHORITY`         varchar(200) DEFAULT NULL      COMMENT 'Trespass & Metro RC: issuing entity',
  `POI_PROPERTY_AREA_COVERED`     varchar(500) DEFAULT NULL      COMMENT 'Trespass only: area covered',
  `POI_ISSUE_DATE`                date DEFAULT NULL              COMMENT 'Trespass & Metro RC: date notice was issued',
  `POI_EXPIRY_DATE`               date DEFAULT NULL              COMMENT 'Trespass & Metro RC: expiry date',
  `POI_NOTICE_DOCUMENT`           varchar(512) DEFAULT NULL      COMMENT 'Trespass only: signed notice file name',
  `POI_RENEWAL_REMINDER_DAYS`     int unsigned DEFAULT NULL      COMMENT 'Days before expiry for renewal reminder',
  `POI_LAW_ENFORCEMENT_CONTACT`   varchar(200) DEFAULT NULL      COMMENT 'Trespass only: LE contact info',
  `POI_CONDITIONS`                text DEFAULT NULL              COMMENT 'Trespass only: specific conditions',
  `POI_RED_CARD_NUMBER`           varchar(100) DEFAULT NULL      COMMENT 'Metro RC only: card number',
  `POI_LINES`                     varchar(500) DEFAULT NULL      COMMENT 'Metro RC only: transit lines/stations covered',
  `POI_CARD_DOCUMENT`             varchar(512) DEFAULT NULL      COMMENT 'Metro RC only: scanned card file name',
  `POI_INACTIVATION_REASON`       text DEFAULT NULL              COMMENT 'Reason for inactivation',
  `POI_APPROVED_BY`               varchar(128) DEFAULT NULL      COMMENT 'User who published the record',
  `POI_APPROVED_ON`               datetime DEFAULT NULL          COMMENT 'Timestamp of publish/approval',
  `POI_CREATED_BY`                varchar(128) NOT NULL,
  `POI_CREATED_ON`                datetime NOT NULL,
  `POI_LAST_UPDATE`               datetime DEFAULT NULL,
  `POI_DELETED_ON`                datetime DEFAULT NULL,
  PRIMARY KEY (`POI_ID`),
  KEY `IX_POI_RECORD_TYPE`  (`POI_RECORD_TYPE`),
  KEY `IX_POI_STATUS`       (`POI_STATUS`),
  KEY `IX_POI_THREAT_LEVEL` (`POI_THREAT_LEVEL`),
  KEY `IX_POI_EXPIRY_DATE`  (`POI_EXPIRY_DATE`),
  KEY `IX_POI_CREATED_ON`   (`POI_CREATED_ON`),
  CONSTRAINT `FK_POI_CREATED_BY`  FOREIGN KEY (`POI_CREATED_BY`)  REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_POI_APPROVED_BY` FOREIGN KEY (`POI_APPROVED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Column groupings:**

| Group | Columns | Applicable Record Types |
|-------|---------|------------------------|
| Identity | `FIRST_NAME`, `LAST_NAME`, `KNOWN_ALIASES`, `DATE_OF_BIRTH`, `GENDER`, `PHYSICAL_DESCRIPTION` | All |
| Assessment | `THREAT_LEVEL`, `SUMMARY`, `INTERNAL_NOTES` | All |
| POI-specific | `INCIDENT_HISTORY_SUMMARY`, `WATCH_LEVEL_REVIEW_DATE`, `ASSOCIATED_INDIVIDUALS` | `poi` only |
| Trespass-specific | `TRESPASS_NOTICE_NUMBER`, `ISSUING_AUTHORITY`, `PROPERTY_AREA_COVERED`, `ISSUE_DATE`, `EXPIRY_DATE`, `NOTICE_DOCUMENT`, `LAW_ENFORCEMENT_CONTACT`, `CONDITIONS` | `trespass` only |
| Metro RC-specific | `RED_CARD_NUMBER`, `ISSUING_AUTHORITY`, `ISSUE_DATE`, `EXPIRY_DATE`, `LINES`, `CARD_DOCUMENT` | `metro_red_card` only |
| Shared | `RENEWAL_REMINDER_DAYS` | `trespass`, `metro_red_card` |
| Lifecycle | `STATUS`, `INACTIVATION_REASON`, `APPROVED_BY`, `APPROVED_ON`, `CREATED_BY`, `CREATED_ON`, `LAST_UPDATE`, `DELETED_ON` | All |

**Note:** `POI_ISSUING_AUTHORITY`, `POI_ISSUE_DATE`, and `POI_EXPIRY_DATE` are shared by both Trespass and Metro Red Card types. Community association is managed through the `poi_site` junction table, not a column on `poi_record`.

### 1.2 `poi_photo` — Subject Photos

Stores photo file references per POI record. Column prefix: `PPH_`.

```sql
CREATE TABLE `poi_photo` (
  `PPH_ID`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `PPH_POI_ID`      bigint unsigned NOT NULL  COMMENT 'FK to poi_record',
  `PPH_FILE_NAME`   varchar(512) NOT NULL,
  `PPH_SORT_ORDER`  int unsigned NOT NULL DEFAULT 0,
  `PPH_CREATED_ON`  datetime NOT NULL,
  `PPH_DELETED_ON`  datetime DEFAULT NULL,
  PRIMARY KEY (`PPH_ID`),
  KEY `IX_PPH_POI_ID` (`PPH_POI_ID`),
  CONSTRAINT `FK_PPH_POI_ID` FOREIGN KEY (`PPH_POI_ID`) REFERENCES `poi_record` (`POI_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Constraints:** Minimum 1 photo, maximum 10 (`MIN_PHOTOS=1`, `MAX_PHOTOS=10`). Photo replacement is a soft-delete-all + re-insert pattern within a transaction. The photo at `PPH_SORT_ORDER=0` is treated as the primary/thumbnail photo in list views.

### 1.3 `poi_site` — Community Assignment Junction

Links a POI record to one or more communities. Column prefix: `PSI_`.

```sql
CREATE TABLE `poi_site` (
  `PSI_ID`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `PSI_POI_ID`      bigint unsigned NOT NULL  COMMENT 'FK to poi_record',
  `PSI_COM_ID`      bigint unsigned NOT NULL  COMMENT 'FK to community',
  `PSI_CREATED_ON`  datetime NOT NULL,
  `PSI_DELETED_ON`  datetime DEFAULT NULL,
  PRIMARY KEY (`PSI_ID`),
  UNIQUE KEY `UQ_PSI_POI_COM` (`PSI_POI_ID`, `PSI_COM_ID`),
  KEY `IX_PSI_COM_ID` (`PSI_COM_ID`),
  CONSTRAINT `FK_PSI_POI_ID` FOREIGN KEY (`PSI_POI_ID`) REFERENCES `poi_record` (`POI_ID`),
  CONSTRAINT `FK_PSI_COM_ID` FOREIGN KEY (`PSI_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**`ON DUPLICATE KEY UPDATE` handling:** When reinserting a previously soft-deleted row, the `INSERT ... ON DUPLICATE KEY UPDATE` restores it by setting `PSI_DELETED_ON=NULL` and refreshing `PSI_CREATED_ON`. This complies with the platform's soft-deletion reactivation convention.

### 1.4 `poi_incident` — Related Incident Links

Links a POI record to existing `service_call` records. Column prefix: `PIN_`.

```sql
CREATE TABLE `poi_incident` (
  `PIN_ID`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `PIN_POI_ID`      bigint unsigned NOT NULL  COMMENT 'FK to poi_record',
  `PIN_SVC_ID`      bigint unsigned NOT NULL  COMMENT 'FK to service_call',
  `PIN_CREATED_ON`  datetime NOT NULL,
  `PIN_DELETED_ON`  datetime DEFAULT NULL,
  PRIMARY KEY (`PIN_ID`),
  UNIQUE KEY `UQ_PIN_POI_SVC` (`PIN_POI_ID`, `PIN_SVC_ID`),
  KEY `IX_PIN_SVC_ID` (`PIN_SVC_ID`),
  CONSTRAINT `FK_PIN_POI_ID` FOREIGN KEY (`PIN_POI_ID`) REFERENCES `poi_record` (`POI_ID`),
  CONSTRAINT `FK_PIN_SVC_ID` FOREIGN KEY (`PIN_SVC_ID`) REFERENCES `service_call` (`SVC_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**`ON DUPLICATE KEY UPDATE` handling:** Same soft-deletion reactivation pattern as `poi_site`.

### 1.5 `poi_export` — PDF Export Audit Log

Immutable audit table recording every PDF export operation. Column prefix: `PXP_`. INSERT-only — no UPDATE or DELETE operations. No audit triggers (per Rule 1 in `audit_trail.md`).

```sql
CREATE TABLE `poi_export` (
  `PXP_ID`           bigint unsigned NOT NULL AUTO_INCREMENT,
  `PXP_POI_ID`       bigint unsigned NOT NULL  COMMENT 'FK to poi_record',
  `PXP_EXPORTED_BY`  varchar(128) NOT NULL     COMMENT 'Admin who initiated export',
  `PXP_FILE_NAME`    varchar(512) DEFAULT NULL COMMENT 'Generated PDF file name',
  `PXP_EXPORTED_ON`  datetime NOT NULL,
  PRIMARY KEY (`PXP_ID`),
  KEY `IX_PXP_POI_ID` (`PXP_POI_ID`),
  CONSTRAINT `FK_PXP_POI_ID`       FOREIGN KEY (`PXP_POI_ID`)      REFERENCES `poi_record` (`POI_ID`),
  CONSTRAINT `FK_PXP_EXPORTED_BY`  FOREIGN KEY (`PXP_EXPORTED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1.6 `poi_view` — Officer View Tracking

Tracks when each officer last viewed each POI record. Used to compute `NEW` and `UPDATED` badges on the mobile app. Column prefix: `PVW_`.

```sql
CREATE TABLE `poi_view` (
  `PVW_ID`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `PVW_POI_ID`     bigint unsigned NOT NULL  COMMENT 'FK to poi_record',
  `PVW_USR_ID`     varchar(128) NOT NULL     COMMENT 'Officer who viewed the record',
  `PVW_VIEWED_ON`  datetime NOT NULL         COMMENT 'Last viewed timestamp',
  PRIMARY KEY (`PVW_ID`),
  UNIQUE KEY `UQ_PVW_POI_USR` (`PVW_POI_ID`, `PVW_USR_ID`),
  KEY `IX_PVW_USR_ID` (`PVW_USR_ID`),
  CONSTRAINT `FK_PVW_POI_ID` FOREIGN KEY (`PVW_POI_ID`) REFERENCES `poi_record` (`POI_ID`),
  CONSTRAINT `FK_PVW_USR_ID` FOREIGN KEY (`PVW_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Upsert pattern:** `INSERT INTO poi_view ... ON DUPLICATE KEY UPDATE PVW_VIEWED_ON=?`. The `UQ_PVW_POI_USR` unique key ensures one view record per officer per POI record.

---

## 2. Data Item Definitions

All data item JSON files are located in `backend/platform/data/`.

### 2.1 `poi_record_type.json`

| Key | Display Name | `$Const` Define |
|-----|-------------|-----------------|
| `poi` | Person of Interest | `POI_RECORD_TYPE_POI` |
| `trespass` | Trespass Order | `POI_RECORD_TYPE_TRESPASS` |
| `metro_red_card` | Metro Red Card | `POI_RECORD_TYPE_METRO_RED_CARD` |

### 2.2 `poi_status.json`

| Key | Display Name | `$Const` Define |
|-----|-------------|-----------------|
| `draft` | Draft | `POI_STATUS_DRAFT` |
| `active` | Active | `POI_STATUS_ACTIVE` |
| `expired` | Expired | `POI_STATUS_EXPIRED` |
| `inactive` | Inactive | `POI_STATUS_INACTIVE` |
| `archived` | Archived | `POI_STATUS_ARCHIVED` |

### 2.3 `poi_threat_level.json`

| Key | Display Name | `$Const` Define |
|-----|-------------|-----------------|
| `low` | Low | `POI_THREAT_LEVEL_LOW` |
| `medium` | Medium | `POI_THREAT_LEVEL_MEDIUM` |
| `high` | High | `POI_THREAT_LEVEL_HIGH` |
| `critical` | Critical | `POI_THREAT_LEVEL_CRITICAL` |

### 2.4 `poi_gender.json`

| Key | Display Name | `$Const` Define |
|-----|-------------|-----------------|
| `male` | Male | `POI_GENDER_MALE` |
| `female` | Female | `POI_GENDER_FEMALE` |
| `unknown` | Unknown | `POI_GENDER_UNKNOWN` |

---

## 3. Resolved Architectural Decisions (Q1–Q8)

The following decisions are formally documented in `docs/issues-questions/poi-issues-questions.md`.

### 3.1 Q1 — Version History & Delta Tracking

**Decision:** No dedicated `poi_version` table. Version history uses:

1. **`POI_LAST_UPDATE`** — timestamp set on every version-level edit.
2. **`poi_view.PVW_VIEWED_ON`** — per-officer last-viewed timestamp.
3. **`change_log`** — system audit trail populated by database triggers (`db/triggers_def.js`).

**Badge logic:**

| Condition | Badge |
|-----------|-------|
| `PVW_VIEWED_ON` does not exist for this officer + record | `new` |
| `POI_LAST_UPDATE > PVW_VIEWED_ON` | `updated` |
| Otherwise | `null` (no badge) |

**Rationale:** Full snapshot tables (`post_order_version`) are reserved for structured multi-section documents. POI records are flat entities where field-level change tracking via `change_log` is sufficient.

### 3.2 Q2 — Single-Step Admin Publishing

**Decision:** Direct publish by Admin/Manager. No multi-step approval queue.

- `publish_poi_record` transitions `draft` → `active`.
- Auto-populates `POI_APPROVED_BY` = current user ID, `POI_APPROVED_ON` = `NOW()`.
- `create_poi_record` supports `publish=true` for inline create-and-publish.

### 3.3 Q3 — Role Scoping & Field Stripping

**ACL:** `@acl: [USER_TYPE_ADMIN, USER_TYPE_OFFICER]` on read endpoints.

**Field stripping for officers (enforced server-side in `mapRecordRow`):**

- `POI_INTERNAL_NOTES` — hidden from officers.
- `POI_INACTIVATION_REASON` — hidden from officers.
- `POI_APPROVED_BY`, `POI_APPROVED_ON`, `POI_CREATED_BY` — hidden from officers.
- Type-specific legal fields (`POI_NOTICE_DOCUMENT`, `POI_CARD_DOCUMENT`, `POI_TRESPASS_NOTICE_NUMBER`, `POI_RED_CARD_NUMBER`, `POI_CONDITIONS`, `POI_LAW_ENFORCEMENT_CONTACT`, `POI_RENEWAL_REMINDER_DAYS`, `POI_INCIDENT_HISTORY_SUMMARY`, `POI_ASSOCIATED_INDIVIDUALS`, `POI_WATCH_LEVEL_REVIEW_DATE`) — hidden from officers.

**Officer-visible type-specific fields (non-sensitive):**

- Trespass: `POI_ISSUING_AUTHORITY`, `POI_PROPERTY_AREA_COVERED`.
- Metro Red Card: `POI_ISSUING_AUTHORITY`, `POI_LINES`.

**Officer community scoping:** Officers see only `active` records assigned to their community via `poi_site`. Enforced in both `get_poi_list` (WHERE subquery) and `get_poi_record` (explicit community ID check).

### 3.4 Q4 — Auto-Expiry Maintenance Cron

**File:** `backend/platform/jobs/cron_poi_lifecycle_check.js`
**PM2 process:** `code4_cron_poi_lifecycle`
**Schedule:** Daily at 03:30 (`cronExpression: "30 3 * * *"`)
**Concurrency guard:** `$EntityLock.acquire("cron", "cron_poi_lifecycle", "system", 300)`

Three operations run sequentially:

1. **Auto-expire:** Queries `poi_record` WHERE `POI_STATUS='active' AND POI_EXPIRY_DATE <= CURRENT_DATE() AND POI_DELETED_ON IS NULL`. Transitions each to `expired`. Batch-fetches officers per community, sends `poi_expired` notifications with FCM push.

2. **Expiry reminders:** Queries active records WHERE `POI_EXPIRY_DATE IS NOT NULL AND POI_EXPIRY_DATE > CURRENT_DATE() AND POI_EXPIRY_DATE <= DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)` using `renewal_reminder_days` (default: 14). Deduplicates against `notification` table (`JSON_EXTRACT(NTF_PAYLOAD, '$.entity_id')`, 24-hour window). Sends `poi_expiring_soon` notifications.

3. **Auto-archive:** Queries records WHERE status is `expired` or `inactive` AND `POI_LAST_UPDATE < DATE_SUB(NOW(), INTERVAL ? MONTH)` using `archive_threshold_months` (default: 24). Transitions each to `archived`.

**Settings read from:** `key_value` table (`settings:poi` namespace), falling back to `runtime_config.js` defaults.

### 3.5 Q5 & Q7 — Officer Field Boundaries

**Decision:** Officers are strictly read-only consumers. They NEVER create, edit, or delete POI records.

- Mutation endpoints (`create`, `update`, `publish`, `inactivate`, `archive`, `export`) are `@acl: [USER_TYPE_ADMIN]` only.
- `mark_viewed` is `@acl: [USER_TYPE_OFFICER]` only.
- **Phase 7 fallback:** Officers can reference a POI Record ID in `Call/create_call` description text until the "Report Encounter" feature is implemented.

### 3.6 Q6 — Watermarked PDF Export Engine

**Endpoint:** `POI/export_poi_record`
**Engine:** `$Export.generate()` with `pdfkit` (already in `package.json`)
**System module dependency:** `export` (enabled in `using_modules.js`)

**Process:**

1. Validate admin ACL (via `@acl`).
2. Check `settings:poi → pdf_export_enabled`. Return `ERR_POI_EXPORT_DISABLED` (rc 704) if false.
3. Fetch record, photos, sites, admin name.
4. Load photo file buffers from storage (`$Files.getFileFromContainer`).
5. Render PDF:
   - Page: LETTER, portrait, 36pt margins.
   - Header: record type (uppercase), full name, status / threat level / record ID.
   - Photos: 120px grid, page-break aware.
   - Sections: Personal Information, Assessment, Assigned Sites, type-specific details, Record Information.
   - **Watermark on every page:** "CONFIDENTIAL – AUTHORISED USE ONLY", "Exported by: {admin name} | {timestamp}".
   - **`POI_INTERNAL_NOTES` is explicitly excluded** from the PDF.
6. Save PDF via `$Export.generate()` which returns `{file_name, file_url}`.
7. Insert audit row into `poi_export` (`PXP_POI_ID`, `PXP_EXPORTED_BY`, `PXP_FILE_NAME`, `PXP_EXPORTED_ON`).
8. Return `{export_id, file_url}`.

### 3.7 Q8 — Notice Document Validation

**Two-boundary validation:**

1. **Upload boundary** (`File/upload_file_base64`): Validates file format (PDF, JPG, PNG) and file size (max 20 MB).
2. **POI endpoint boundary** (`create_poi_record`, `update_poi_record`): Validates that the provided file ID exists in the `file` table via `resolveFileIds()`. Returns `ERR_FILE_NOT_FOUND` (rc 321) if invalid.

---

## 4. Settings Namespace: `settings:poi`

Managed via `Settings/get_poi_settings` and `Settings/update_poi_settings`. Stored in `key_value` table under key `settings:poi`.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `renewal_reminder_days` | int | 14 | Days before expiry to send `poi_expiring_soon` notifications |
| `archive_threshold_months` | int | 24 | Months after expiry/inactivation before auto-archiving |
| `pdf_export_enabled` | bool | true | Enable/disable PDF export functionality |
| `default_poi_guidance` | string | *(long text)* | Default response guidance for POI records |
| `default_trespass_guidance` | string | *(long text)* | Default response guidance for Trespass Orders |
| `default_red_card_guidance` | string | *(long text)* | Default response guidance for Metro Red Cards |

**Fallback chain:** `key_value` table → `runtime_config.js` SETTINGS_DEFAULTS.poi → hardcoded defaults.

---

## 5. State Machine

```
                 publish_poi_record
    ┌─────────┐ ──────────────────────► ┌──────────┐
    │  DRAFT  │                         │  ACTIVE  │
    └─────────┘ ◄── create (publish=T)  └──────────┘
         │                                   │  │
         │ (admin delete = soft-delete)      │  │
         ▼                                   │  │
    ┌─────────┐  auto-expire (cron)    ◄─────┘  │ inactivate_poi_record
    │ EXPIRED │                                  │
    └─────────┘                                  ▼
         │                              ┌──────────┐
         │ archive_poi_record           │ INACTIVE │
         │                              └──────────┘
         ▼                                   │
    ┌──────────┐  archive_poi_record   ◄─────┘
    │ ARCHIVED │  (also via cron auto-archive)
    └──────────┘
```

**Allowed transitions:**

| From | To | Trigger | Mandatory Fields |
|------|----|---------|-----------------|
| `draft` | `active` | `publish_poi_record` or `create(publish=true)` | — |
| `active` | `expired` | Lifecycle cron (daily at 03:30) | `POI_EXPIRY_DATE <= CURRENT_DATE()` |
| `active` | `inactive` | `inactivate_poi_record` | `reason` (stored in `POI_INACTIVATION_REASON`) |
| `expired` | `archived` | `archive_poi_record` or lifecycle cron | — |
| `inactive` | `archived` | `archive_poi_record` or lifecycle cron | — |

**Terminal state:** `archived` — cannot be re-activated.

---

## 6. View Tracking & Badge Logic

### 6.1 Recording a View

When an officer calls `POI/mark_viewed`, the server executes:

```sql
INSERT INTO `poi_view` (PVW_POI_ID, PVW_USR_ID, PVW_VIEWED_ON)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE PVW_VIEWED_ON=?
```

The `UQ_PVW_POI_USR` unique key guarantees one row per officer-record pair.

### 6.2 Badge Computation

Computed server-side in both `get_poi_list` and `get_poi_record` for officer users:

```
IF no PVW_VIEWED_ON exists for (officer, record):
    view_badge = "new"
ELSE IF POI_LAST_UPDATE > PVW_VIEWED_ON:
    view_badge = "updated"
ELSE:
    view_badge = null
```

In `get_poi_list`, view data is batch-fetched for all records on the current page to avoid N+1 queries.

### 6.3 Version-Level vs Always-Editable Fields

Not all field changes trigger the `UPDATED` badge. The following fields are classified as **always-editable** (changes do NOT bump `isVersionUpdate` and therefore do NOT trigger `poi_updated` notifications):

- `internal_notes`
- `renewal_reminder_days`
- `watch_level_review_date`
- `related_incident_ids`

All other field changes on an active record set `isVersionUpdate=true`, which:
1. Updates `POI_LAST_UPDATE`.
2. Sends `poi_updated` notification to officers in assigned communities.
3. Causes the `UPDATED` badge to appear for officers who previously viewed the record.

---

## 7. Notification Types

All notifications are dispatched via `Notification/create_bulk_notifications` with `send_push: true` (FCM).

| Type | Trigger | Recipients | Payload |
|------|---------|------------|---------|
| `poi_active` | `publish_poi_record` or `create(publish=true)` | Officers in assigned communities | `{entity_type: "poi", entity_id: <POI_ID>}` |
| `poi_updated` | `update_poi_record` (version-level change on active record) | Officers in assigned communities | `{entity_type: "poi", entity_id: <POI_ID>}` |
| `poi_inactivated` | `inactivate_poi_record` | Officers in assigned communities | `{entity_type: "poi", entity_id: <POI_ID>}` |
| `poi_expiring_soon` | Lifecycle cron (within `renewal_reminder_days` window) | Officers in assigned communities | `{entity_type: "poi", entity_id: <POI_ID>}` |
| `poi_expired` | Lifecycle cron (expiry date passed) | Officers in assigned communities | `{entity_type: "poi", entity_id: <POI_ID>}` |

**Template variables:** `{poi_type, poi_name}` — e.g., `poi_type: "Trespass Order"`, `poi_name: "John Smith"`.

**Notification settings toggles** (in `runtime_config.js` → `settings:notification`):
- `poi_active_enabled`
- `poi_updated_enabled`
- `poi_inactivated_enabled`
- `poi_expiring_enabled`
- `poi_expired_enabled`

---

## 8. Audit Trail (Trigger Definitions)

Defined in `db/triggers_def.js`. Five of the six POI tables have audit triggers; `poi_export` is excluded (INSERT-only table).

| Table | ID Column | Tracked Fields | `log_delete` |
|-------|-----------|---------------|-------------|
| `poi_record` | `POI_ID` | 30 mutable fields (all except `POI_RECORD_TYPE`, `POI_CREATED_BY`, `POI_CREATED_ON`) | false |
| `poi_photo` | `PPH_ID` | `PPH_DELETED_ON` | false |
| `poi_site` | `PSI_ID` | `PSI_DELETED_ON` | false |
| `poi_incident` | `PIN_ID` | `PIN_DELETED_ON` | false |
| `poi_view` | `PVW_ID` | `PVW_VIEWED_ON` | false |
| `poi_export` | — | *(excluded — INSERT-only audit table)* | — |

---

## 9. Deferred Requirements

Tracked in `docs/deferred_requirements/08-poi-enhancements.md`.

| Item | Feature | Status | Depends On |
|------|---------|--------|------------|
| 3 | Report Encounter (Officer → Incident) | Not implemented | Phase 7 (Report module) |
| 5 | Community Deletion Guard | Not implemented | — |
| 6 | Guidance Text Version Notes | Sub-requirement open | Core settings API done |
| 7 | Bulk Operations | Not implemented | — |
| 8 | Dashboard / Summary Statistics | Not implemented | — |
