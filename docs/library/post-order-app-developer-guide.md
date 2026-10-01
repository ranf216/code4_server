# Post Orders — App Developer Integration Guide

**Module:** `PostOrder`
**Phase:** 6.1
**Audience:** Frontend developers (React Web Portal & React Native Mobile App)

---

## 1. Authentication & Access

All Post Order endpoints require a valid session token passed as `#token`.

### Access Control (ACL)

| Role | API Module Name | Description |
|------|-----------------|-------------|
| `USER_TYPE_ADMIN` (1) | Admin / Manager | Full CRUD, publishing, archiving, version history |
| `USER_TYPE_OFFICER` (2) | Officer | View assigned published POs, acknowledge versions |
| `USER_TYPE_RESIDENT` (3) | Resident / Client | View published POs in their community (client-visible sections only) |

### Pagination

All list endpoints use **0-based offset pagination**:
- `offset` (integer, default `0`) — number of records to skip
- `limit` (integer, default `20`, max `100`) — page size
- Response includes `total_count` for calculating total pages: `Math.ceil(total_count / limit)`

---

## 2. Endpoint Directory

### 2.1 `PostOrder/get_post_orders_list`

Returns a paginated list of post orders. Results are scoped by the caller's role.

**ACL:** Admin, Officer, Resident

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `community_id` | i | No | `0` | Filter by community (admin only, `0` = all) |
| `status` | s | No | `""` | Filter by status: `draft`, `published`, `archived` |
| `search_text` | s | No | `""` | Free-text search across post name and community name |
| `review_due_before` | s | No | `""` | Filter POs with review due on or before this date (`YYYY-MM-DD`) |
| `sort_by` | s | No | `community_name` | Sort column: `community_name`, `post_name`, `status`, `last_published_on` |
| `sort_dir` | s | No | `asc` | Sort direction: `asc` or `desc` |
| `offset` | i | No | `0` | Pagination offset |
| `limit` | i | No | `20` | Page size (max 100) |

**Role scoping:**
- **Admin:** Sees all post orders. Can filter by community and status.
- **Officer:** Sees only published POs for posts allocated in the last 90 days. Status filters are ignored.
- **Resident:** Sees only published POs for their community. Status filters are ignored.

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "post_orders": [
    {
      "post_order_id": 1,
      "post_id": 10,
      "post_name": "Main Gate",
      "community_id": 5,
      "community_name": "Sunset Ridge",
      "status": "published",
      "version": "2.1",
      "effective_date": "2026-10-01",
      "review_due_date": "2027-01-01",
      "created_by": "user-uuid-abc",
      "created_by_name": "Jane Smith",
      "last_published_by": "user-uuid-def",
      "last_published_by_name": "John Doe",
      "last_published_on": "2026-10-15 14:30:00",
      "created_on": "2026-09-01 09:00:00",
      "last_update": "2026-10-15 14:30:00"
    }
  ],
  "total_count": 42
}
```

---

### 2.2 `PostOrder/get_post_order`

Returns full details of a single post order including its sections and attachments.

**ACL:** Admin, Officer, Resident

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |

**Role-dependent content:**
- **Admin:** Returns current working sections with all fields including notes and attachment URLs.
- **Officer:** Returns the latest published version's content (from `POV_CONTENT` snapshot). Notes are stripped. All sections visible.
- **Resident:** Returns the latest published version's content filtered to `client_visible === true` sections only. Notes are stripped.

**Response (Admin view):**
```json
{
  "rc": 0,
  "message": "success",
  "post_order": {
    "post_order_id": 1,
    "post_id": 10,
    "post_name": "Main Gate",
    "community_id": 5,
    "community_name": "Sunset Ridge",
    "status": "draft",
    "version": "2.1",
    "effective_date": "2026-10-01",
    "review_due_date": "2027-01-01",
    "created_by": "user-uuid-abc",
    "created_by_name": "Jane Smith",
    "last_published_by": "user-uuid-def",
    "last_published_by_name": "John Doe",
    "last_published_on": "2026-10-15 14:30:00",
    "created_on": "2026-09-01 09:00:00",
    "last_update": "2026-10-16 10:00:00",
    "sections": [
      {
        "section_id": 101,
        "section_type": "general_information",
        "section_type_name": "General Information",
        "title": "Site Overview",
        "description": "Rich text content...",
        "client_visible": true,
        "sort_order": 0,
        "notes": "Internal note for managers",
        "attachments": [
          {
            "attachment_id": 42,
            "url": "https://files.example.com/path/to/file.pdf",
            "created_on": "2026-10-01 12:00:00"
          }
        ],
        "created_on": "2026-10-01 09:00:00",
        "last_update": null
      }
    ]
  }
}
```

**Officer/Resident view:** The `sections` array contains objects from the published JSON snapshot. Officers see all sections (without notes). Residents see only client-visible sections (without notes).

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670) — PO does not exist, is soft-deleted, or the caller does not have access.

---

### 2.3 `PostOrder/create_post_order`

Creates a new post order in `draft` status with initial sections.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_id` | i | Yes | — | Post ID to attach the post order to |
| `review_due_date` | s | No | `""` | Optional review due date (`YYYY-MM-DD`) |
| `sections` | a (JSON array) | Yes | — | Array of section objects |

**Section object schema:**
```json
{
  "section_type": "general_information",
  "title": "Site Overview",
  "description": "Rich text content...",
  "client_visible": true,
  "notes": "Manager-only note",
  "attachment_file_ids": [101, 102]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `section_type` | string | Yes | Key from `po_section_type` data item |
| `title` | string | Yes | Section title (max 80 chars) |
| `description` | string | No | Rich text content (max 10,000 chars) |
| `client_visible` | boolean | Yes | Whether this section is visible to residents/clients |
| `notes` | string | No | Manager/admin-only notes (max 2,000 chars) |
| `attachment_file_ids` | array | No | File IDs from `File/upload_file_base64` (max 5 per section) |

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "post_order_id": 1
}
```

**Errors:**
- `ERR_POST_NOT_FOUND` (rc 752) — Post does not exist.
- `ERR_POST_ORDER_ALREADY_EXISTS` (rc 681) — An active post order already exists for this post.
- `ERR_POST_ORDER_INVALID_SECTION_TYPE` (rc 676) — Invalid section type key.
- `ERR_POST_ORDER_MEDIA_LIMIT_REACHED` (rc 679) — More than 5 attachments in a section.
- `ERR_FILE_NOT_FOUND` — One or more attachment file IDs do not exist.
- `ERR_INVALID_API_PARAM` — Invalid section title length, description length, or malformed sections array.

---

### 2.4 `PostOrder/update_post_order`

Updates a post order. If the PO is currently published, it auto-transitions to draft. Only draft POs can be edited; archived POs cannot.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |
| `review_due_date` | s | No | `/null/` | Updated review due date (`YYYY-MM-DD`). Send empty string to clear. Omit or send `/null/` to leave unchanged. |
| `sections` | a (JSON array) | No | `/null/` | Full replacement array of sections. If provided, replaces ALL existing sections. Omit or send `/null/` to leave sections unchanged. |

**Section object schema:** Same as `create_post_order`.

**Behavior:**
- When a published PO is edited, the status auto-transitions to `draft`. Officers and residents continue seeing the last published version (from `post_order_version`) until the new draft is re-published.
- Sections use a **full replacement pattern**: if `sections` is provided, all existing sections are soft-deleted and the new set is inserted.

**Response:**
```json
{
  "rc": 0,
  "message": "success"
}
```

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670)
- `ERR_POST_ORDER_CANNOT_EDIT` (rc 677) — PO is archived.
- Same section validation errors as `create_post_order`.

---

### 2.5 `PostOrder/publish_post_order`

Publishes a draft post order. Creates a new immutable version snapshot and optionally notifies allocated officers.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |
| `version_type` | s | Yes | — | Version bump type: `minor` or `major` |
| `change_summary` | s | Yes | — | Brief description of changes (max 200 chars) |
| `effective_date` | s | No | today | Effective date (`YYYY-MM-DD`) |
| `notify_officers` | b | No | `true` | Whether to send push notifications to allocated officers |

**Version numbering:**
- First publish: always `1.0` (regardless of version type).
- Minor bump: `1.0` → `1.1` → `1.2` ...
- Major bump: `1.2` → `2.0`

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "version_id": 5,
  "version": "2.0"
}
```

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670)
- `ERR_POST_ORDER_CANNOT_PUBLISH` (rc 671) — PO is not in draft status.

---

### 2.6 `PostOrder/archive_post_order`

Archives a published post order. Archived POs are no longer shown to officers or clients.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |

**Response:**
```json
{
  "rc": 0,
  "message": "success"
}
```

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670)
- `ERR_POST_ORDER_CANNOT_ARCHIVE` (rc 672) — PO is not in published status.

---

### 2.7 `PostOrder/delete_post_order`

Soft-deletes a draft post order that has no published history.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |

**Response:**
```json
{
  "rc": 0,
  "message": "success"
}
```

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670)
- `ERR_POST_ORDER_CANNOT_DELETE` (rc 673) — PO is not draft, or has published history.

---

### 2.8 `PostOrder/get_version_history`

Returns a chronological list of all published versions for a post order.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "versions": [
    {
      "version_id": 5,
      "version": "2.0",
      "change_summary": "Updated emergency procedures",
      "version_type": "major",
      "effective_date": "2026-10-15",
      "published_by": "user-uuid-def",
      "published_by_name": "John Doe",
      "published_on": "2026-10-15 14:30:00"
    }
  ]
}
```

---

### 2.9 `PostOrder/get_version`

Returns a specific historical version including its full content snapshot.

**ACL:** Admin only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |
| `version_id` | i | Yes | — | Version ID |

**Response:**
```json
{
  "rc": 0,
  "message": "success",
  "version": {
    "version_id": 5,
    "version": "2.0",
    "change_summary": "Updated emergency procedures",
    "version_type": "major",
    "effective_date": "2026-10-15",
    "published_by": "user-uuid-def",
    "published_by_name": "John Doe",
    "published_on": "2026-10-15 14:30:00",
    "sections": [
      {
        "section_type": "general_information",
        "title": "Site Overview",
        "description": "...",
        "client_visible": true,
        "notes": "...",
        "sort_order": 0,
        "attachments": [...]
      }
    ]
  }
}
```

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670)
- `ERR_POST_ORDER_VERSION_NOT_FOUND` (rc 680)

---

### 2.10 `PostOrder/acknowledge_post_order`

Records the officer's acknowledgement of a specific or the current published version.

**ACL:** Officer only

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `#token` | s | Yes | — | Session token |
| `post_order_id` | i | Yes | — | Post Order ID |
| `version_id` | i | No | `0` | Version ID to acknowledge. `0` = latest published version. |

**Response:**
```json
{
  "rc": 0,
  "message": "success"
}
```

**Errors:**
- `ERR_POST_ORDER_NOT_FOUND` (rc 670) — PO does not exist, is not published, or officer is not allocated to the post.
- `ERR_POST_ORDER_VERSION_NOT_FOUND` (rc 680) — Specified version does not exist or does not belong to the specified PO.
- `ERR_POST_ORDER_ALREADY_ACKNOWLEDGED` (rc 675) — Officer has already acknowledged this version.

---

## 3. Error Code Directory

| Constant | RC | Message | Trigger |
|----------|-----|---------|---------|
| `ERR_POST_ORDER_NOT_FOUND` | 670 | post order not found | PO missing, deleted, or access denied |
| `ERR_POST_ORDER_CANNOT_PUBLISH` | 671 | post order cannot be published in its current status | Non-draft publish attempt |
| `ERR_POST_ORDER_CANNOT_ARCHIVE` | 672 | post order cannot be archived in its current status | Non-published archive attempt |
| `ERR_POST_ORDER_CANNOT_DELETE` | 673 | cannot delete a post order with published history | Delete with published versions |
| `ERR_POST_ORDER_SECTION_NOT_FOUND` | 674 | post order section not found | Reserved |
| `ERR_POST_ORDER_ALREADY_ACKNOWLEDGED` | 675 | post order version already acknowledged | Duplicate acknowledgement |
| `ERR_POST_ORDER_INVALID_SECTION_TYPE` | 676 | invalid post order section type | Bad section type key |
| `ERR_POST_ORDER_CANNOT_EDIT` | 677 | post order cannot be edited in its current status | Archived PO edit attempt |
| `ERR_POST_ORDER_DRAFT_EXISTS` | 678 | a draft already exists for this post order | Reserved |
| `ERR_POST_ORDER_MEDIA_LIMIT_REACHED` | 679 | maximum number of attachments per section reached | >5 attachments per section |
| `ERR_POST_ORDER_VERSION_NOT_FOUND` | 680 | post order version not found | Bad version_id |
| `ERR_POST_ORDER_ALREADY_EXISTS` | 681 | a post order already exists for this post | Duplicate PO per post |

---

## 4. Push Notifications

| Notification Type | Trigger | Recipients | Deep-Link Payload |
|-------------------|---------|------------|-------------------|
| `post_order_published` | First publish (version `1.0`) | Officers allocated to the post | `{"entity_type": "post_order", "entity_id": <PO_ID>}` |
| `post_order_updated` | Subsequent version published | Officers allocated to the post | `{"entity_type": "post_order", "entity_id": <PO_ID>}` |
| `post_order_review_due` | Review due date approaching (7-day lead) | Author + community managers | `{"entity_type": "post_order", "entity_id": <PO_ID>}` |

**Notes:**
- `post_order_published` and `post_order_updated` are sent only when `notify_officers` is `true` (default).
- `post_order_review_due` is planned for a future cron job — not yet implemented.
- Notifications are dispatched via `Notification/create_bulk_notifications` after the publish transaction commits.

---

## 5. Typical Workflows

### 5.1 Creating & Publishing a New Post Order

```
1. Upload attachments     →  File/upload_file_base64  (get file_ids)
2. Create draft PO        →  PostOrder/create_post_order
3. (Optional) Edit draft  →  PostOrder/update_post_order
4. Publish                →  PostOrder/publish_post_order
```

### 5.2 Editing an Existing Published Post Order

```
1. Upload new attachments →  File/upload_file_base64  (if needed)
2. Update PO              →  PostOrder/update_post_order  (auto-transitions to draft)
3. Re-publish             →  PostOrder/publish_post_order
```

During steps 2–3, officers and residents continue seeing the last published version.

### 5.3 Officer Acknowledges a Post Order

```
1. View PO list           →  PostOrder/get_post_orders_list
2. Open PO detail         →  PostOrder/get_post_order
3. Acknowledge            →  PostOrder/acknowledge_post_order  (version_id=0 for latest)
```

### 5.4 Admin Reviews Version History

```
1. Open PO detail         →  PostOrder/get_post_order
2. View version list      →  PostOrder/get_version_history
3. View specific version  →  PostOrder/get_version
```
