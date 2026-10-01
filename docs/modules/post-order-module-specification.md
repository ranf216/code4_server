# Post Orders Module — Technical Specification

**Module:** `platform/api/post_order.js`, `platform/funcs/post_order.js`
**Phase:** 6.1
**SDS References:** §2.9, §3.12, §4.10, §5.4.3

---

## 1. Database Schema & Table Layouts

The Post Orders module introduces five tables following Code4 Hungarian notation conventions. All tables use `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`.

### 1.1 `post_order` (Prefix: `PO_`)

The root entity linking a post order document to a specific post within a community.

```sql
CREATE TABLE `post_order` (
  `PO_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `PO_PST_ID` bigint unsigned NOT NULL COMMENT 'FK to post this order belongs to',
  `PO_COM_ID` bigint unsigned NOT NULL COMMENT 'Denormalized from post for query performance',
  `PO_STATUS` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, published, archived',
  `PO_VERSION_MAJOR` int unsigned NOT NULL DEFAULT 0,
  `PO_VERSION_MINOR` int unsigned NOT NULL DEFAULT 0,
  `PO_EFFECTIVE_DATE` date DEFAULT NULL COMMENT 'Date from which the current version is active',
  `PO_REVIEW_DUE_DATE` date DEFAULT NULL COMMENT 'Optional reminder date for author',
  `PO_CREATED_BY` varchar(128) NOT NULL,
  `PO_LAST_PUBLISHED_BY` varchar(128) DEFAULT NULL,
  `PO_LAST_PUBLISHED_ON` datetime DEFAULT NULL,
  `PO_CREATED_ON` datetime NOT NULL,
  `PO_LAST_UPDATE` datetime DEFAULT NULL,
  `PO_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`PO_ID`),
  KEY `IX_PO_PST_ID` (`PO_PST_ID`),
  KEY `IX_PO_COM_ID` (`PO_COM_ID`),
  KEY `IX_PO_STATUS` (`PO_STATUS`),
  CONSTRAINT `FK_PO_PST_ID` FOREIGN KEY (`PO_PST_ID`) REFERENCES `post` (`PST_ID`),
  CONSTRAINT `FK_PO_COM_ID` FOREIGN KEY (`PO_COM_ID`) REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_PO_CREATED_BY` FOREIGN KEY (`PO_CREATED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `PO_COM_ID` is denormalized from `post.PST_COM_ID` at creation time for query performance (avoids JOINs on list queries filtered by community).
- Version is tracked as separate `PO_VERSION_MAJOR` / `PO_VERSION_MINOR` integer columns (not a string). Displayed as `"Major.Minor"` (e.g., `"2.1"`) in API responses.
- Status uses the `po_status` data item (`$DataItems`): `draft`, `published`, `archived`.

### 1.2 `post_order_section` (Prefix: `POS_`)

Working sections belonging to the current draft/active post order. Sections are replaced in bulk on update (full replacement pattern), never partially modified.

```sql
CREATE TABLE `post_order_section` (
  `POS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `POS_PO_ID` bigint unsigned NOT NULL COMMENT 'FK to post_order',
  `POS_SECTION_TYPE` varchar(60) NOT NULL COMMENT 'Key from po_section_type data item',
  `POS_TITLE` varchar(80) NOT NULL,
  `POS_DESCRIPTION` text COMMENT 'Rich text content, max 10000 chars',
  `POS_CLIENT_VISIBLE` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '1=visible to clients',
  `POS_NOTES` varchar(2000) DEFAULT NULL COMMENT 'Manager/admin only notes',
  `POS_SORT_ORDER` int unsigned NOT NULL DEFAULT 0,
  `POS_CREATED_ON` datetime NOT NULL,
  `POS_LAST_UPDATE` datetime DEFAULT NULL,
  `POS_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`POS_ID`),
  KEY `IX_POS_PO_ID` (`POS_PO_ID`),
  CONSTRAINT `FK_POS_PO_ID` FOREIGN KEY (`POS_PO_ID`) REFERENCES `post_order` (`PO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `POS_SECTION_TYPE` stores a string key from the DB-backed `po_section_type` data item (managed in Settings). Validated with `$DataItems.isValidItemId()`.
- `POS_NOTES` are manager/admin only — never shown to officers or clients.
- Sections are NOT versioned individually. On update, all existing sections are soft-deleted and replaced with the new set (Decision D6). On publish, the current sections are snapshotted into `POV_CONTENT`.

### 1.3 `post_order_attachment` (Prefix: `POF_`)

File attachments linked to individual sections.

```sql
CREATE TABLE `post_order_attachment` (
  `POF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `POF_POS_ID` bigint unsigned NOT NULL COMMENT 'FK to post_order_section',
  `POF_FILE_NAME` varchar(512) NOT NULL,
  `POF_CREATED_ON` datetime NOT NULL,
  `POF_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`POF_ID`),
  KEY `IX_POF_POS_ID` (`POF_POS_ID`),
  CONSTRAINT `FK_POF_POS_ID` FOREIGN KEY (`POF_POS_ID`) REFERENCES `post_order_section` (`POS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- `POF_FILE_NAME` stores the file system file name (resolved via `$Files.getUrl()`). Files are uploaded separately via `File/upload_file_base64`; the post order module receives file IDs, resolves them to file names via a batch query, and stores the names.
- Maximum 5 attachments per section (enforced in application logic). Error: `ERR_POST_ORDER_MEDIA_LIMIT_REACHED` (rc 679).
- File size validation (20 MB) is handled by the `File` module during upload, not by the Post Order module.

### 1.4 `post_order_version` (Prefix: `POV_`)

Immutable version snapshots created on publish. Records are never modified or deleted.

```sql
CREATE TABLE `post_order_version` (
  `POV_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `POV_PO_ID` bigint unsigned NOT NULL COMMENT 'FK to post_order',
  `POV_VERSION_MAJOR` int unsigned NOT NULL,
  `POV_VERSION_MINOR` int unsigned NOT NULL,
  `POV_CHANGE_SUMMARY` varchar(200) NOT NULL COMMENT 'Brief description of changes',
  `POV_VERSION_TYPE` varchar(10) NOT NULL COMMENT 'major or minor',
  `POV_EFFECTIVE_DATE` date NOT NULL,
  `POV_CONTENT` json NOT NULL COMMENT 'Snapshot of sections and attachments at publish time',
  `POV_PUBLISHED_BY` varchar(128) NOT NULL,
  `POV_PUBLISHED_ON` datetime NOT NULL,
  PRIMARY KEY (`POV_ID`),
  KEY `IX_POV_PO_ID` (`POV_PO_ID`),
  CONSTRAINT `FK_POV_PO_ID` FOREIGN KEY (`POV_PO_ID`) REFERENCES `post_order` (`PO_ID`),
  CONSTRAINT `FK_POV_PUBLISHED_BY` FOREIGN KEY (`POV_PUBLISHED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- No `POV_DELETED_ON` column — versions are immutable audit records. No audit trail triggers needed (Rule 1 in `audit_trail.md`).
- `POV_CONTENT` stores a complete JSON snapshot of all sections and their attachments at the moment of publish. This avoids complex version-to-section join tables and makes historical retrieval a single-row fetch (Decision D2).
- `POV_VERSION_TYPE` records whether the bump was `"major"` or `"minor"` (from the `po_version_type` data item).

### 1.5 `post_order_acknowledgement` (Prefix: `POA_`)

Per-version officer acknowledgements. Records are never modified or deleted.

```sql
CREATE TABLE `post_order_acknowledgement` (
  `POA_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `POA_PO_ID` bigint unsigned NOT NULL COMMENT 'FK to post_order',
  `POA_POV_ID` bigint unsigned NOT NULL COMMENT 'FK to post_order_version',
  `POA_USR_ID` varchar(128) NOT NULL COMMENT 'Officer user ID',
  `POA_ACKNOWLEDGED_ON` datetime NOT NULL,
  PRIMARY KEY (`POA_ID`),
  UNIQUE KEY `UQ_POA_VERSION_USER` (`POA_POV_ID`, `POA_USR_ID`),
  KEY `IX_POA_PO_ID` (`POA_PO_ID`),
  KEY `IX_POA_USR_ID` (`POA_USR_ID`),
  CONSTRAINT `FK_POA_PO_ID` FOREIGN KEY (`POA_PO_ID`) REFERENCES `post_order` (`PO_ID`),
  CONSTRAINT `FK_POA_POV_ID` FOREIGN KEY (`POA_POV_ID`) REFERENCES `post_order_version` (`POV_ID`),
  CONSTRAINT `FK_POA_USR_ID` FOREIGN KEY (`POA_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:**
- No `POA_DELETED_ON` column — acknowledgements are immutable. No audit trail triggers needed (Rule 1).
- `UQ_POA_VERSION_USER` unique constraint prevents duplicate acknowledgements per officer per version. The application checks for duplicates before INSERT and also handles `$Db.isDuplicateEntryError()` gracefully for race conditions.
- Publishing a new version generates a new `POV_ID`, automatically requiring officers to re-acknowledge.

### 1.6 Index Summary

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `IX_PO_PST_ID` | `post_order` | `PO_PST_ID` | Post lookup, uniqueness check |
| `IX_PO_COM_ID` | `post_order` | `PO_COM_ID` | Community-scoped list queries |
| `IX_PO_STATUS` | `post_order` | `PO_STATUS` | Status filter in list queries |
| `IX_POS_PO_ID` | `post_order_section` | `POS_PO_ID` | Section retrieval by post order |
| `IX_POF_POS_ID` | `post_order_attachment` | `POF_POS_ID` | Attachment retrieval by section |
| `IX_POV_PO_ID` | `post_order_version` | `POV_PO_ID` | Version history retrieval |
| `IX_POA_PO_ID` | `post_order_acknowledgement` | `POA_PO_ID` | Acknowledgement lookup by PO |
| `IX_POA_USR_ID` | `post_order_acknowledgement` | `POA_USR_ID` | Acknowledgement lookup by officer |
| `UQ_POA_VERSION_USER` | `post_order_acknowledgement` | `(POA_POV_ID, POA_USR_ID)` | Duplicate prevention |

### 1.7 Data Items

| Data Item File | Source | Cache | Purpose |
|----------------|--------|-------|---------|
| `po_status.json` | Static JSON | N/A | Status enum: `draft`, `published`, `archived` |
| `po_version_type.json` | Static JSON | N/A | Version bump type: `minor`, `major` |
| `po_section_type.json` | DB-backed (`data_item` table) | TTL 10 min | Section types (managed in Settings by admin) |

All three are registered via `$DataItems.define()` in the module constructor, producing `$Const.PO_STATUS_*`, `$Const.PO_VERSION_TYPE_*` constants.

---

## 2. State Machine — Post Order Lifecycle

```
                  ┌──────────┐
   create ──────> │  DRAFT   │ <──── edit published
                  └────┬─────┘
                       │ publish
                       v
                  ┌──────────┐
                  │ PUBLISHED│ <──── re-publish after edit
                  └────┬─────┘
                       │ archive
                       v
                  ┌──────────┐
                  │ ARCHIVED │  (terminal — read-only)
                  └──────────┘
```

| Transition | Trigger | Validation |
|------------|---------|------------|
| → Draft | `create_post_order` | Post exists, no active PO for post |
| Draft → Published | `publish_post_order` | Status must be `draft`, valid version_type, change_summary required |
| Published → Draft | `update_post_order` | Auto-transition when editing a published PO |
| Draft → Published | `publish_post_order` | Re-publish after editing |
| Published → Archived | `archive_post_order` | Status must be `published` |
| Draft → (soft-deleted) | `delete_post_order` | Status must be `draft`, no published history |

**First publish rule:** The first publish always produces version `1.0` regardless of the version type selected. Subsequent publishes increment according to the chosen type (`minor` → `1.0 → 1.1`, `major` → `1.1 → 2.0`).

---

## 3. Core Server-Side Business Logic

### 3.1 Post Cardinality & Active Validation (Q1)

One active post order per post is enforced in application logic. Before creating a new PO, the server queries:

```sql
SELECT PO_ID FROM `post_order` WHERE PO_PST_ID=? AND PO_DELETED_ON IS NULL
```

If a row exists, the server returns `ERR_POST_ORDER_ALREADY_EXISTS` (rc 681). A database-level unique constraint is not used because soft-deleted records would conflict with new active records (Decision D1).

### 3.2 Immutable JSON Version Snapshots (Q2)

When `publish_post_order` is called, the server:

1. Fetches all non-deleted sections for the post order via `getSections()`.
2. Fetches all non-deleted attachments for those sections via `getAttachmentsForSections()` (single batch query using `IN` clause).
3. Compiles sections and their attachments into a JSON array and serializes it into `POV_CONTENT`.
4. Inserts the version row within a transaction alongside the header update.

**Snapshot JSON structure:**
```json
[
  {
    "section_type": "general_information",
    "title": "Site Overview",
    "description": "Rich text content...",
    "client_visible": true,
    "notes": "Manager-only note",
    "sort_order": 0,
    "attachments": [
      {
        "attachment_id": 42,
        "url": "https://files.example.com/path/to/file.pdf",
        "created_on": "2026-10-15 14:30:00"
      }
    ]
  }
]
```

This design makes historical version retrieval a single-row fetch. Published content cannot be queried at the individual-section level via SQL, but this trade-off is acceptable since version detail views always display the full document (Decision D2).

### 3.3 Section Visibility & Type Hints (Q3)

- `POS_CLIENT_VISIBLE` is explicitly set per section by the API caller.
- The `po_section_type` data item (DB-backed, managed in Settings §5.4.3) has a `client_visible` attribute in `DIT_EXTRA` that serves as a **UI default hint** for the admin portal's toggle pre-population.
- The server does not enforce the data-item default — admins can override visibility per section for specific posts.
- Officers see all sections (excluding notes). Residents/clients see only sections where `client_visible === true` (notes always excluded).

### 3.4 Version-Gated Acknowledgement Flow (Q4)

**Endpoint:** `PostOrder/acknowledge_post_order`

**Parameters:**
- `post_order_id` (required) — the post order to acknowledge
- `version_id` (optional, default `0`) — version to acknowledge; `0` resolves to the latest published version

**Flow:**
1. Fetch the post order; verify it exists and is published.
2. Verify the officer is allocated to the post (shift_post within last 90 days).
3. Resolve version: if `version_id > 0`, validate it belongs to the specified PO. If `version_id === 0`, resolve the latest published version via `ORDER BY POV_PUBLISHED_ON DESC LIMIT 1`.
4. Check for existing acknowledgement: `SELECT POA_ID WHERE POA_POV_ID=? AND POA_USR_ID=?`.
5. If already acknowledged → return `ERR_POST_ORDER_ALREADY_ACKNOWLEDGED` (rc 675).
6. Insert acknowledgement row. If a race condition triggers the unique constraint, `$Db.isDuplicateEntryError()` returns the same error code gracefully.

**Re-acknowledgement on new version:** Publishing a new version creates a new `POV_ID`. Since acknowledgements are keyed on `(POA_POV_ID, POA_USR_ID)`, officers must re-acknowledge each new version independently.

### 3.5 Dynamic Compliance Calculation (Q5) — Design Only (Not Yet Implemented)

**Formula:**

```
acknowledged_pct = (Officers with POA_POV_ID = Current Published POV_ID)
                   ÷ (Distinct officers assigned to post in shifts within last 90 days)
                   × 100
```

**Denominator calculation:** Uses the `shift_post` table joined with `shift`, filtered to `SFT_DATE >= NOW() - 90 DAYS`. This window aligns with `OFFICER_POST_HISTORY_DAYS = 90`, the same constant used for officer access scoping in `get_post_orders_list` and `acknowledge_post_order`.

**Performance plan:** Compute via a single correlated subquery or batch lookup in `get_post_orders_list`. Return `null` for draft or archived post orders.

**Implementation state:** Deferred to a follow-up enhancement. The acknowledgement table and shift_post tables are in place to support this calculation.

### 3.6 Review Due Date Reminder Cron (Q7) — Design Only (Not Yet Implemented)

**Planned file:** `cron_post_order_review_check.js`

**Behavior:**
1. Runs daily at 04:00 via PM2/ecosystem.config.js.
2. Uses `initStandAlone()` to bootstrap infrastructure without an HTTP server.
3. Queries published post orders where `PO_REVIEW_DUE_DATE <= DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)` and `PO_REVIEW_DUE_DATE >= CURRENT_DATE()`.
4. De-duplicates against recently sent reminders (within last 7 days).
5. Dispatches `post_order_review_due` notifications to the author (`PO_CREATED_BY`) and community managers via `Notification/create_bulk_notifications`.

**Dependencies:** Requires adding `post_order_review_due` to `notification_type.json` and registering the cron in `ecosystem.config.js`.

**Implementation state:** Not yet implemented. `PO_REVIEW_DUE_DATE` column exists and is filterable in the list API via the `review_due_before` parameter.

### 3.7 Media & Attachment Validation (Q9)

| Validation | Enforced By | Limit | Error Code |
|------------|------------|-------|------------|
| Attachments per section | Post Order module (`validateSectionsInput`) | 5 | `ERR_POST_ORDER_MEDIA_LIMIT_REACHED` (rc 679) |
| File size per upload | File module (`File/upload_file`) | 20 MB | `ERR_FILE_TOO_LARGE` (File module error) |
| Video duration | Client-side | 1 min | N/A (client enforcement) |
| File existence | Post Order module (batch query) | N/A | `ERR_FILE_NOT_FOUND` (File module error) |

File IDs provided in `attachment_file_ids` are resolved to file names via a single batch query against the `file` table (outside of any transaction). If any file ID does not exist, the entire request is rejected.

### 3.8 Transaction & Query Patterns

All methods follow the Code4 transaction discipline:

- **All SELECT queries run BEFORE `$Db.beginTransaction()`**.
- **Only INSERT/UPDATE/DELETE statements run inside the transaction**.
- **Every write operation checks `$Db.isError()`** with appropriate rollback.
- **Notifications are dispatched AFTER `$Db.commitTransaction()`** (Decision D4).
- **No database queries inside loops** — sections and attachments use bulk INSERT with multi-value `(?, ?, ?)` placeholders. Attachment file names are resolved in a single batch query using `IN (${ids.toPlaceholders()})`.

### 3.9 Role-Based Access Control

| Role | List | Detail | Create/Edit/Publish/Archive/Delete | Version History | Acknowledge |
|------|------|--------|------------------------------------|-----------------|-------------|
| Admin | All POs (filterable by community, status) | All sections + notes | Full access | Full access | — |
| Officer | Published POs for allocated posts (90-day window) | All sections (no notes), published version content | — | — | Own acknowledgement |
| Resident | Published POs for their community | Client-visible sections only (no notes) | — | — | — |

---

## 4. Cross-Module Hooks & Deferred Requirements

### 4.1 Post Detail Integration (Q8) — Deferred

**Planned change:** Add a `LEFT OUTER JOIN post_order` in `Asset/get_post` and `Asset/get_posts_list` returning `post_order_id` (integer or `null`) directly in post response objects.

**Purpose:** Enables one-click navigation from map post pins to post orders in the admin portal.

**Implementation state:** Deferred to avoid modifying the Asset module in Phase 6.1. The client can discover a post's PO by querying `PostOrder/get_post_orders_list` filtered to the relevant community.

### 4.2 Offline Mobile Caching (Q6) — Client-Side

**Server role:** The server provides full JSON version snapshots (`POV_CONTENT`) via `PostOrder/get_post_order`. No additional server-side caching API is needed.

**Mobile caching blueprint:**
1. When an officer receives a `shift_published` or `shift_starting_soon` notification, the mobile app fetches and caches the active `POV_CONTENT` in local SQLite / `AsyncStorage`.
2. Cached post order snapshots are retained during active shifts.
3. Automatic purge 24 hours after the shift ends or upon user logout, whichever comes first.
4. If a Post Order is updated while the officer is offline, the update is downloaded and a notification displayed when connectivity is restored.

### 4.3 Deferred Requirements Roadmap

The following enhancements are documented for future phases:

| Enhancement | Description | Status |
|-------------|-------------|--------|
| Acknowledged percentage in list view | Dynamic `acknowledged_pct` calculation in `get_post_orders_list` | Design complete (Q5) |
| Review due cron job | Background `cron_post_order_review_check.js` dispatching reminder notifications | Design complete (Q7) |
| Post detail API integration | `post_order_id` field in `Asset/get_post` and `Asset/get_posts_list` | Design complete (Q8) |
| Acknowledgement deadline enforcement | Time window for required acknowledgement with escalation | Conceptual |
| Manager notification for non-acknowledged officers | Alert when officers miss acknowledgement window | Conceptual |
| Interactive quiz verification | Quiz-based acknowledgement requiring correct answers | Conceptual |
| Dynamic macro variable substitution | Template variables in section content (e.g., `#officer_name#`) | Conceptual |
| Automated version diff comparison | Side-by-side diff between published versions | Conceptual |

---

## 5. Error Codes

| Constant | RC | Message | Trigger |
|----------|-----|---------|---------|
| `ERR_POST_ORDER_NOT_FOUND` | 670 | post order not found | Fetch/access denied |
| `ERR_POST_ORDER_CANNOT_PUBLISH` | 671 | post order cannot be published in its current status | Non-draft publish attempt |
| `ERR_POST_ORDER_CANNOT_ARCHIVE` | 672 | post order cannot be archived in its current status | Non-published archive attempt |
| `ERR_POST_ORDER_CANNOT_DELETE` | 673 | cannot delete a post order with published history | Delete with published versions |
| `ERR_POST_ORDER_SECTION_NOT_FOUND` | 674 | post order section not found | Reserved for future use |
| `ERR_POST_ORDER_ALREADY_ACKNOWLEDGED` | 675 | post order version already acknowledged | Duplicate acknowledgement |
| `ERR_POST_ORDER_INVALID_SECTION_TYPE` | 676 | invalid post order section type | Bad section_type key |
| `ERR_POST_ORDER_CANNOT_EDIT` | 677 | post order cannot be edited in its current status | Archived PO edit attempt |
| `ERR_POST_ORDER_DRAFT_EXISTS` | 678 | a draft already exists for this post order | Reserved for future use |
| `ERR_POST_ORDER_MEDIA_LIMIT_REACHED` | 679 | maximum number of attachments per section reached | >5 attachments per section |
| `ERR_POST_ORDER_VERSION_NOT_FOUND` | 680 | post order version not found | Bad version_id |
| `ERR_POST_ORDER_ALREADY_EXISTS` | 681 | a post order already exists for this post | Duplicate PO per post |

---

## 6. Audit Trail

Trigger definitions are registered in `db/triggers_def.js` for the three mutable tables:

| Table | Tracked Fields | Delete Trigger |
|-------|---------------|----------------|
| `post_order` | `PO_STATUS`, `PO_VERSION_MAJOR`, `PO_VERSION_MINOR`, `PO_EFFECTIVE_DATE`, `PO_REVIEW_DUE_DATE`, `PO_LAST_PUBLISHED_BY`, `PO_LAST_PUBLISHED_ON`, `PO_LAST_UPDATE`, `PO_DELETED_ON` | No |
| `post_order_section` | `POS_DELETED_ON` | No |
| `post_order_attachment` | `POF_DELETED_ON` | No |

`post_order_version` and `post_order_acknowledgement` are excluded — they are immutable after insertion (Rule 1 of `audit_trail.md`).

---

## 7. Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/post_order.js` | API endpoint definitions (8 endpoints) |
| `backend/platform/funcs/post_order.js` | Business logic class + helper functions |
| `backend/platform/data/po_status.json` | Status data items (static) |
| `backend/platform/data/po_version_type.json` | Version type data items (static) |
| `backend/platform/data/po_section_type.json` | Section type data pointer (DB-backed) |
| `backend/platform/definitions/errorcodes.en.js` | Error codes rc 670–681 |
| `backend/platform/config/using_api.js` | API registration |
| `db/db.sql` | Full schema DDL |
| `db/UpgradeDB.sql` | Migration DDL |
| `db/triggers_def.js` | Audit trail trigger definitions |
| `docs/issues-questions/post-order-issues-questions.md` | Design decisions log |
| `docs/deferred_requirements/05-asset-enhancements.md` | Post detail integration deferred (item 7) |
| `docs/code-reviews/post-order-review.md` | Code review report |
