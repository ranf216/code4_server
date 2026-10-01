# Post Order API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"PostOrder/<endpoint_name>"`.

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

### Post Orders

A Post Order is a structured set of instructions attached to a specific post (guard station, gate, patrol point, etc.) within a community. It defines the duties, procedures, emergency protocols, and any other guidance an officer needs when assigned to that post.

- Each post can have at most **one active Post Order** at a time.
- Post Orders are composed of one or more **sections**, each with a configurable section type, title, description, optional admin-only notes, and optional file attachments (up to 5 per section).
- Administrators create and manage Post Orders. Officers and residents/clients consume them in read-only form with role-appropriate visibility.

### Section Constraints

| Field | Limit |
|-------|-------|
| Title | Max 80 characters |
| Description | Max 10,000 characters |
| Notes | Max 2,000 characters (admin-only) |
| Attachments per section | Max 5 files |

### Post Order Status Lifecycle

| Status | Description |
|--------|-------------|
| **Draft** | Post Order is created or being edited. Visible and editable by admins only. Not visible to officers or residents/clients. |
| **Published** | Post Order has been published with a version number. Visible to allocated officers and (for client-visible sections) to residents/clients. Read-only. |
| **Archived** | Post Order has been retired. No longer shown to officers or residents/clients. Retained in version history for audit purposes. Cannot be edited. |

**Allowed transitions:**

| Action | Allowed From |
|--------|-------------|
| Publish | Draft |
| Edit (auto-transition to Draft) | Published |
| Archive | Published |
| Delete | Draft (with no published history only) |

### Versioning

Every time a Post Order is published, an immutable version snapshot is created. The first publish always produces version **1.0** regardless of the requested version type.

| Version Type | Behaviour |
|--------------|-----------|
| **major** | Increments the major number and resets minor to 0 (e.g. 1.1 → 2.0). |
| **minor** | Increments the minor number (e.g. 1.0 → 1.1). |

Each version snapshot captures the full content of all sections and attachments at the moment of publication.

### Role-Based Visibility

| Role | List visibility | Detail visibility |
|------|----------------|-------------------|
| **Admin** | All Post Orders (any status). | Full working sections including notes. |
| **Officer** | Published Post Orders for posts allocated in the last 90 days. | All sections from the latest published version, excluding notes. |
| **Resident/Client** | Published Post Orders for their community. | Client-visible sections only from the latest published version, excluding notes. |

### Acknowledgement

Officers can acknowledge having read a specific version of a Post Order. Each officer can acknowledge each version only once. Acknowledgement requires the Post Order to be in Published status and the officer to be allocated to the associated post.

---

## Endpoints — List & Detail

### POST PostOrder/get_post_orders_list
*Admin, Officer, or Resident/Client.* Retrieves a paginated, filterable list of Post Orders. Results are automatically scoped by the caller's role.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `community_id` | integer | No | Filter by community ID. Admin only; `0` or omitted returns all communities. Ignored for officers and residents. |
    | `status` | string | No | Filter by status: `draft`, `published`, `archived`. Admin only. |
    | `search_text` | string | No | Free-text search across post name and community name. |
    | `review_due_before` | string | No | Filter Post Orders with review due on or before this date (`YYYY-MM-DD`). Admin only. |
    | `sort_by` | string | No | Sort column: `community_name` (default), `post_name`, `status`, `last_published_on`. |
    | `sort_dir` | string | No | Sort direction: `asc` (default) or `desc`. |
    | `offset` | integer | No | Pagination offset. Default: `0`. |
    | `limit` | integer | No | Page size. Default: `20`, max: `100`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "post_orders": [
            {
                "post_order_id": 1,
                "post_id": 5,
                "post_name": "Main Gate",
                "community_id": 1,
                "community_name": "Sunset Estates",
                "status": "published",
                "version": "1.0",
                "effective_date": "2026-03-15",
                "review_due_date": "2027-03-15",
                "created_by": "abc123",
                "created_by_name": "John Admin",
                "last_published_by": "abc123",
                "last_published_by_name": "John Admin",
                "last_published_on": "2026-03-15 10:00:00",
                "created_on": "2026-03-10 09:00:00",
                "last_update": "2026-03-15 10:00:00"
            }
        ],
        "total_count": 1
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `post_order_id` | integer | Unique Post Order identifier. |
    | `post_id` | integer | The post this Post Order is attached to. |
    | `post_name` | string | Display name of the post. |
    | `community_id` | integer | The community the post belongs to. |
    | `community_name` | string | Display name of the community. |
    | `status` | string | Current status: `draft`, `published`, or `archived`. |
    | `version` | string | Current version number (e.g. `"1.0"`, `"2.3"`). Draft before first publish shows `"0.0"`. |
    | `effective_date` | string or `null` | Date the current version became effective (`YYYY-MM-DD`). |
    | `review_due_date` | string or `null` | Date by which the Post Order should be reviewed. |
    | `created_by` | string | User ID of the creator. |
    | `created_by_name` | string or `null` | Full name of the creator. |
    | `last_published_by` | string or `null` | User ID of the last publisher. |
    | `last_published_by_name` | string or `null` | Full name of the last publisher. |
    | `last_published_on` | string or `null` | Datetime of the most recent publish. |
    | `created_on` | string | Datetime of creation. |
    | `last_update` | string or `null` | Datetime of last modification. |
    | `total_count` | integer | Total number of matching records (for pagination). |

    Results are sorted by the specified column, then by post name ascending.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter is missing or invalid. |
    | 201 | invalid user token | Invalid or expired token. |

    Officers with no post allocations in the last 90 days receive an empty list. Residents without a community assignment receive an empty list.

- **Usage & Flows:**
    Called by the management portal to populate the Post Orders list view (SDS 4.10.2). The `community_id` filter maps to the Community dropdown. The `status` filter maps to the status chips. The `review_due_before` filter is used by the "Review Due" filter to highlight Post Orders approaching their review deadline. Officers call this endpoint from the Post Orders tab in the mobile app (SDS 3.12.1); the API automatically scopes results to the officer's allocated posts. Residents call this from their Post Orders screen (SDS 2.9); results are scoped to their community.

---

### POST PostOrder/get_post_order
*Admin, Officer, or Resident/Client.* Retrieves full details of a single Post Order including its sections and attachments.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `post_order_id` | integer | Yes | The Post Order ID to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "post_order": {
            "post_order_id": 1,
            "post_id": 5,
            "post_name": "Main Gate",
            "community_id": 1,
            "community_name": "Sunset Estates",
            "status": "published",
            "version": "1.0",
            "effective_date": "2026-03-15",
            "review_due_date": "2027-03-15",
            "created_by": "abc123",
            "created_by_name": "John Admin",
            "last_published_by": "abc123",
            "last_published_by_name": "John Admin",
            "last_published_on": "2026-03-15 10:00:00",
            "created_on": "2026-03-10 09:00:00",
            "last_update": "2026-03-15 10:00:00",
            "sections": [
                {
                    "section_id": 10,
                    "section_type": "po_section_general",
                    "section_type_name": "General Instructions",
                    "title": "Gate Procedures",
                    "description": "All visitors must present valid ID...",
                    "client_visible": true,
                    "sort_order": 0,
                    "notes": "Remind officers to log every visitor",
                    "attachments": [
                        {
                            "attachment_id": 1,
                            "url": "https://cdn.example.com/files/gate-map.pdf",
                            "created_on": "2026-03-10 09:00:00"
                        }
                    ],
                    "created_on": "2026-03-10 09:00:00",
                    "last_update": null
                }
            ]
        }
    }
    ```

    The `post_order` object contains all header fields from `get_post_orders_list`, plus:

    | Field | Type | Description |
    |-------|------|-------------|
    | `sections` | array | List of section objects ordered by `sort_order`. |

    **Section object fields (admin view):**

    | Field | Type | Description |
    |-------|------|-------------|
    | `section_id` | integer | Unique section identifier. |
    | `section_type` | string | Section type identifier. |
    | `section_type_name` | string | Human-readable section type name. |
    | `title` | string | Section title (max 80 characters). |
    | `description` | string | Section body content. |
    | `client_visible` | boolean | Whether this section is visible to residents/clients. |
    | `sort_order` | integer | Display order (0-based). |
    | `notes` | string or `null` | Admin-only notes. **Only included for admin callers.** |
    | `attachments` | array | File attachments, each with `attachment_id`, `url`, and `created_on`. |
    | `created_on` | string | Datetime the section was created. |
    | `last_update` | string or `null` | Datetime of last modification. |

    **Officer view:** Sections are served from the latest published version snapshot. All sections are included. The `notes` field is excluded.

    **Resident/Client view:** Sections are served from the latest published version snapshot. Only sections with `client_visible: true` are included. The `notes` field is excluded.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 670 | post order not found | No active Post Order exists with the given ID, or the caller does not have access (officer not allocated to the post, resident not in the community, or the Post Order is not published). |

- **Usage & Flows:**
    Called when opening a Post Order from the list view (SDS 4.10.3, 3.12.2, 2.9). Admins see the current working content and can proceed to edit. Officers and residents see the latest published version with role-appropriate section filtering.

---

## Endpoints — Create & Update

### POST PostOrder/create_post_order
*Admin only.* Creates a new Post Order for a post in Draft status with initial sections.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_id` | integer | Yes | The post to attach the Post Order to. Only one Post Order per post is allowed. |
    | `review_due_date` | string | No | Optional review due date (`YYYY-MM-DD`). |
    | `sections` | array | Yes | Array of section objects (at least one required). |

    **Section object:**

    | Field | Type | Required | Description |
    |-------|------|----------|-------------|
    | `section_type` | string | Yes | A valid section type identifier (configured in Settings). |
    | `title` | string | Yes | Section title (max 80 characters). |
    | `description` | string | No | Section body content (max 10,000 characters). |
    | `client_visible` | boolean | No | Whether this section is visible to residents/clients. Default: `false`. |
    | `notes` | string | No | Admin-only notes (max 2,000 characters). |
    | `attachment_file_ids` | array | No | Array of file IDs (from the File upload API) to attach. Max 5 per section. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "post_order_id": 1
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `post_order_id` | integer | The ID of the newly created Post Order. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter is missing or invalid (e.g. empty title, title exceeds 80 characters, empty sections array). |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 676 | invalid post order section type | One or more sections have an invalid `section_type`. |
    | 679 | maximum number of attachments per section reached | A section has more than 5 attachment file IDs. |
    | 681 | a post order already exists for this post | The specified post already has an active Post Order. |
    | 752 | post not found | No active post exists with the given `post_id`. |

- **Usage & Flows:**
    Called from the "Create Post Order" form in the management portal (SDS 4.10.3). The consumer selects a post, fills in header fields and at least one section, then submits. The Post Order is created in Draft status at version 0.0. The consumer should call `publish_post_order` separately to make it visible to officers. Section types are configured in Settings (SDS 5.4.3) and should be loaded by the consumer before rendering the section form.

---

### POST PostOrder/update_post_order
*Admin only.* Updates header fields and/or replaces all sections of an existing Post Order. Editing a Published Post Order automatically transitions it to Draft status.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_order_id` | integer | Yes | The Post Order ID to update. |
    | `review_due_date` | string | No | Updated review due date (`YYYY-MM-DD`). Send empty string to clear. |
    | `sections` | array | No | Full replacement array of section objects. If provided, all existing sections are replaced. If omitted, sections remain unchanged. |

    The `sections` array format is identical to `create_post_order`.

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
    | 102 | missing api param | A section field is invalid (e.g. empty title, title exceeds 80 characters, empty sections array). |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 670 | post order not found | No active Post Order exists with the given ID. |
    | 676 | invalid post order section type | One or more sections have an invalid `section_type`. |
    | 677 | post order cannot be edited in its current status | The Post Order is Archived. |
    | 679 | maximum number of attachments per section reached | A section has more than 5 attachment file IDs. |

- **Usage & Flows:**
    Called from the Post Order editor in the management portal (SDS 4.10.4). If the Post Order is currently Published, the API automatically transitions it to Draft; the current Published version remains visible to officers and residents until the new Draft is re-published. The consumer sends only the header fields that changed. If sections are modified, the full section array must be provided (partial section updates are not supported). Only one Draft can exist per Post Order (SDS 4.10.4).

---

## Endpoints — Lifecycle

### POST PostOrder/publish_post_order
*Admin only.* Publishes a Draft Post Order, creating an immutable version snapshot and optionally notifying allocated officers.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_order_id` | integer | Yes | The Post Order ID to publish. |
    | `version_type` | string | Yes | Version bump type: `major` or `minor`. Ignored on first publish (always 1.0). |
    | `change_summary` | string | Yes | Brief description of changes (max 200 characters, cannot be empty). |
    | `effective_date` | string | No | Effective date (`YYYY-MM-DD`). Defaults to today if omitted. |
    | `notify_officers` | boolean | No | Send push notifications to allocated officers. Default: `true`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "version_id": 1,
        "version": "1.0"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `version_id` | integer | The ID of the newly created version. |
    | `version` | string | The published version number (e.g. `"1.0"`, `"2.3"`). |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | `version_type` is invalid, `change_summary` is empty or exceeds 200 characters. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 670 | post order not found | No active Post Order exists with the given ID. |
    | 671 | post order cannot be published in its current status | The Post Order is not in Draft status (already Published or Archived). |

- **Usage & Flows:**
    Called from the Publish dialog in the management portal (SDS 4.10.5.1). The consumer presents a form with version type selection (`major` / `minor`), a change summary text field, an effective date picker (defaulting to today), and a notification toggle. On first publish, the version is always `1.0` regardless of the selected version type. When `notify_officers` is `true`, a push notification is sent to all officers currently allocated to the post (SDS 4.7.4 notification types: "Post Order Published" for first publish, "Post Order Updated" for subsequent publishes).

---

### POST PostOrder/archive_post_order
*Admin only.* Archives a Published Post Order. Archived Post Orders are no longer shown to officers or residents/clients.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_order_id` | integer | Yes | The Post Order ID to archive. |

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
    | 670 | post order not found | No active Post Order exists with the given ID. |
    | 672 | post order cannot be archived in its current status | The Post Order is not Published (e.g. it is a Draft or already Archived). |

- **Usage & Flows:**
    Called from the Post Order detail screen when the manager archives a Post Order (SDS 4.10.5). Only Published Post Orders can be archived. Once archived, a new Post Order must be created for the post if instructions are needed again. The archived Post Order and its version history remain accessible for audit.

---

### POST PostOrder/delete_post_order
*Admin only.* Soft-deletes a Draft Post Order that has never been published.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_order_id` | integer | Yes | The Post Order ID to delete. |

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
    | 670 | post order not found | No active Post Order exists with the given ID. |
    | 673 | cannot delete a post order with published history | The Post Order has been published at least once, or is not in Draft status. Use `archive_post_order` instead for Published or Archived Post Orders. |

- **Usage & Flows:**
    Called from the Post Order detail screen when deleting a draft (SDS 4.10.6). Only Draft Post Orders with no published history can be deleted. If the Post Order has ever been published, the consumer should offer the Archive action instead.

---

## Endpoints — Version History

### POST PostOrder/get_version_history
*Admin only.* Retrieves the chronological list of all published versions for a Post Order.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_order_id` | integer | Yes | The Post Order ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "versions": [
            {
                "version_id": 3,
                "version": "2.0",
                "change_summary": "Major revision of gate procedures",
                "version_type": "major",
                "effective_date": "2026-06-01",
                "published_by": "abc123",
                "published_by_name": "John Admin",
                "published_on": "2026-05-28 14:30:00"
            },
            {
                "version_id": 2,
                "version": "1.1",
                "change_summary": "Updated emergency contacts",
                "version_type": "minor",
                "effective_date": "2026-04-15",
                "published_by": "abc123",
                "published_by_name": "John Admin",
                "published_on": "2026-04-12 09:00:00"
            },
            {
                "version_id": 1,
                "version": "1.0",
                "change_summary": "Initial publication",
                "version_type": "minor",
                "effective_date": "2026-03-15",
                "published_by": "abc123",
                "published_by_name": "John Admin",
                "published_on": "2026-03-15 10:00:00"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `version_id` | integer | Unique version identifier. |
    | `version` | string | Version number (e.g. `"1.0"`, `"2.3"`). |
    | `change_summary` | string | Brief description of changes provided at publish time. |
    | `version_type` | string | The bump type used: `major` or `minor`. |
    | `effective_date` | string | Date the version became effective (`YYYY-MM-DD`). |
    | `published_by` | string | User ID of the admin who published this version. |
    | `published_by_name` | string or `null` | Full name of the publisher. |
    | `published_on` | string | Datetime the version was published. |

    Versions are returned in reverse chronological order (most recent first).

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 670 | post order not found | No active Post Order exists with the given ID. |

- **Usage & Flows:**
    Called from the Version History panel on the Post Order detail screen (SDS 4.10.7). Displays a chronological timeline of all published versions with their change summaries. Selecting a version calls `get_version` to view the full content snapshot.

---

### POST PostOrder/get_version
*Admin only.* Retrieves the full content snapshot of a specific published version, including all sections and attachments as they existed at publish time.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_order_id` | integer | Yes | The Post Order ID. |
    | `version_id` | integer | Yes | The version ID to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "version": {
            "version_id": 1,
            "version": "1.0",
            "change_summary": "Initial publication",
            "version_type": "minor",
            "effective_date": "2026-03-15",
            "published_by": "abc123",
            "published_by_name": "John Admin",
            "published_on": "2026-03-15 10:00:00",
            "sections": [
                {
                    "section_type": "po_section_general",
                    "title": "Gate Procedures",
                    "description": "All visitors must present valid ID...",
                    "client_visible": true,
                    "notes": "Remind officers to log every visitor",
                    "sort_order": 0,
                    "attachments": [
                        {
                            "attachment_id": 1,
                            "url": "https://cdn.example.com/files/gate-map.pdf",
                            "created_on": "2026-03-10 09:00:00"
                        }
                    ]
                }
            ]
        }
    }
    ```

    The `version` object contains all fields from `get_version_history`, plus:

    | Field | Type | Description |
    |-------|------|-------------|
    | `sections` | array | Immutable snapshot of all sections as they existed when this version was published. Includes `section_type`, `title`, `description`, `client_visible`, `notes`, `sort_order`, and `attachments`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 670 | post order not found | No active Post Order exists with the given `post_order_id`. |
    | 680 | post order version not found | No version exists with the given `version_id` for this Post Order. |

- **Usage & Flows:**
    Called from the Version History panel when a manager selects a specific version to view (SDS 4.10.7). Displays the full read-only content of the Post Order as it was at the time of that publication. This allows managers to compare historical versions and audit changes.

---

## Endpoints — Acknowledgement

### POST PostOrder/acknowledge_post_order
*Officer only.* Records that the officer has read and acknowledged a specific (or the latest) published version of a Post Order.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `post_order_id` | integer | Yes | The Post Order ID to acknowledge. |
    | `version_id` | integer | No | The specific version ID to acknowledge. Default: `0` (acknowledges the latest published version). |

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
    | 670 | post order not found | No active published Post Order exists with the given ID, or the officer is not allocated to the associated post. |
    | 675 | post order version already acknowledged | The officer has already acknowledged this version. |
    | 680 | post order version not found | The specified `version_id` does not exist for this Post Order, or no published version exists. |

- **Usage & Flows:**
    Called from the Post Order detail screen in the officer mobile app when the officer taps the "Acknowledge" button (SDS 3.12.4). The Post Order must be Published and the officer must be allocated to the associated post (within the last 90 days). If `version_id` is omitted or `0`, the latest published version is acknowledged automatically. Each officer can acknowledge each version only once; duplicate acknowledgements are rejected.

---
