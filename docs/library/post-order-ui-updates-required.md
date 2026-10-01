# Post Orders — UI Updates Required

**Phase:** 6.1
**SDS References:** §2.9 (Client App), §3.12 (Officer App), §4.10 (Admin Portal), §5.4.3 (Settings)

This document specifies the required user interface changes for the Web Admin Portal, Officer Mobile App, and Resident/Client Mobile App to integrate with the Post Orders server module.

---

## 1. Web Admin Management Portal

### 1.1 Post Order List View (SDS §4.10.2)

**Route:** `/post-orders`

**Data source:** `PostOrder/get_post_orders_list`

**List columns:**

| Column | Source Field | Description |
|--------|-------------|-------------|
| Post Order ID | `post_order_id` | Auto-generated ID |
| Community / Site | `community_name` | Community the post belongs to |
| Post Name | `post_name` | Link — opens the post detail (Asset module) |
| Status | `status` | Badge: Draft (grey), Published (green), Archived (amber) |
| Current Version | `version` | Formatted string (e.g., "2.1") |
| Last Published | `last_published_on` | Date/time of the most recent publish |
| Last Published By | `last_published_by_name` | Manager display name |
| Review Due | `review_due_date` | Date — highlight red if overdue (before today) |
| Acknowledged (%) | — | **Deferred.** Display "—" until `acknowledged_pct` is implemented in the API |

**Filters (above list):**
- Community (multi-select dropdown)
- Status (dropdown: Draft, Published, Archived)
- Review Due Before (date picker, with "Overdue" shortcut button setting the date to today)
- Free-text search (applies to post name and community name)

**Sorting:** Clickable column headers. Supported sort columns: `community_name`, `post_name`, `status`, `last_published_on`. Default: `community_name ASC`.

**Pagination:** 0-based offset. Display page selector using `total_count` from the response. Default page size: 20.

**Actions:**
- "Create Post Order" button (top right) → navigates to the editor in creation mode
- Row click → navigates to the Post Order detail/editor

---

### 1.2 Post Order Editor Workspace (SDS §4.10.3, §4.10.4)

**Route:** `/post-orders/new` (create) or `/post-orders/:id/edit` (edit)

The editor is divided into two areas: the **header panel** (read-only metadata) and the **section builder** (interactive editor).

#### 1.2.1 Header Panel

| Field | Behavior |
|-------|----------|
| Post Order ID | Auto-generated, read-only (shown after creation) |
| Post | **Create mode:** Post selector (dropdown/search of available posts without an active PO). **Edit mode:** Read-only display of the linked post name |
| Community | Auto-populated from the selected post. Read-only |
| Status | Badge showing current status. Read-only |
| Version | Current version string (e.g., "1.2"). Read-only |
| Author | Auto-populated from the creating admin's name. Read-only |
| Effective Date | Read-only (set during publish) |
| Review Due Date | Date picker. Optional. Maps to `review_due_date` parameter |
| Created On | Timestamp. Read-only |
| Last Published By / On | Read-only (updated after publish) |

#### 1.2.2 Section Builder

The section builder is a vertically-stacked list of section cards. Each card contains:

| Element | Type | Details |
|---------|------|---------|
| Section Type | Dropdown | Populated from `po_section_type` data items (Settings §5.4.3). Only active types shown in the "Add Section" dropdown. Existing sections with inactive types are displayed but flagged |
| Section Title | Text input | Max 80 characters. Pre-filled from the section type name but editable |
| Description | Rich text editor (WYSIWYG / Markdown) | Max 10,000 characters. Supports formatted text. Shows character count |
| Client-Visible Toggle | Switch | Boolean. Pre-populated from the section type's `client_visible` default (from `DIT_EXTRA`) but overridable. Label: "Visible to Clients" |
| Notes | Text area | Max 2,000 characters. Label: "Internal Notes (admin/manager only)". Visually distinguished (e.g., yellow background or info icon) |
| Attachments | File uploader | Upload area supporting PDF, JPEG/PNG images, and video (up to 1 min). Shows current attachment count with "X / 5" indicator. Max 5 per section. Each attachment shows a preview thumbnail, file name, and a remove button. Files are uploaded via `File/upload_file_base64`; returned file IDs are stored in the `attachment_file_ids` array |
| Drag Handle | Icon | Left-side grip icon for drag-and-drop reordering |
| Remove Button | Icon button | Removes the section from the editor (with confirmation) |

**"Add Section" button:** Appears below the last section card. Opens a dropdown of active section types. Selecting a type adds a new card with the title and client-visible toggle pre-populated from the data item.

**Section ordering:** Drag-and-drop reordering updates the `sort_order` values. The array index in the `sections` parameter determines final ordering.

**Save Draft button:** Calls `PostOrder/create_post_order` (create mode) or `PostOrder/update_post_order` (edit mode). Displays a success toast.

**Publish button:** Opens the Publish Version Modal (§1.3).

---

### 1.3 Publish Version Modal (SDS §4.10.5.1)

Triggered by the "Publish" button in the editor when the PO is in draft status.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Version Type | Radio buttons | Yes | **Minor update** (e.g., 1.0 → 1.1) or **Major update** (e.g., 1.1 → 2.0). Shows the resulting version number preview |
| Change Summary | Text area | Yes | Max 200 characters. Placeholder: "Briefly describe what changed..." |
| Effective Date | Date picker | Yes | Defaults to today. Can be set to a future date |
| Notify Officers | Toggle switch | Yes | Default: On. Label: "Send push notification to allocated officers" |

**Note for first publish:** The version type radio is informational only — the first publish always produces version `1.0`. Display a helper text: "First publish will create version 1.0."

**Confirm action:** Calls `PostOrder/publish_post_order`. On success, displays the new version number and refreshes the editor header. Navigates back to the list or stays in the editor (based on UX preference).

---

### 1.4 Compliance & Acknowledgement Dashboard (SDS §4.10.2) — Deferred

**Planned location:** Expandable panel within the Post Order detail view.

**Planned components:**
- **Progress bar gauge:** Displaying `acknowledged_pct` computed over the 90-day shift allocation window. Color-coded: green ≥80%, amber 50–79%, red <50%.
- **Officer checklist table:** Expandable accordion showing officers allocated to the post (from shift_post within last 90 days), with columns: Officer Name, Badge #, Acknowledged (Yes/No), Acknowledged On (timestamp or "Pending").

**Implementation state:** Deferred. The `acknowledged_pct` field is not yet returned by `PostOrder/get_post_orders_list`. A dedicated `get_post_order_acknowledgements` endpoint does not yet exist. Show "—" in the list view for the Acknowledged column until the server API is extended.

---

### 1.5 Version History Panel (SDS §4.10.7)

**Location:** Accessible from the Post Order detail screen via a "Version History" tab or side panel.

**Data source:** `PostOrder/get_version_history`

**Table columns:**

| Column | Source Field |
|--------|-------------|
| Version | `version` (e.g., "2.1") |
| Published By | `published_by_name` |
| Published At | `published_on` |
| Effective Date | `effective_date` |
| Change Summary | `change_summary` |
| Version Type | `version_type` — Badge: Major (blue), Minor (grey) |

**Actions:**
- "View" button on each row → calls `PostOrder/get_version` and opens a read-only view of the historical version's sections and attachments.

---

### 1.6 Delete & Archive Actions (SDS §4.10.6)

| Action | Button Location | Conditions | API Call |
|--------|----------------|------------|----------|
| Delete | Editor toolbar or list context menu | Draft status, no published history | `PostOrder/delete_post_order` |
| Archive | Editor toolbar or list context menu | Published status | `PostOrder/archive_post_order` |

- **Delete:** Show confirmation dialog: "This will permanently remove the draft post order. This action cannot be undone." Call `PostOrder/delete_post_order`. On success, navigate to the list.
- **Archive:** Show confirmation dialog: "Archiving will remove this post order from officers and clients. It will remain in version history." Call `PostOrder/archive_post_order`. On success, refresh the detail view showing archived status.
- Archived POs are read-only. Hide the Edit, Publish, and Delete buttons. Show only the Version History panel.

---

### 1.7 Map & Post Integration (Deferred — Q8)

**Planned changes to the Asset/Map module:**

- **Post detail drawer:** Add a "Post Order" section showing the linked PO status and version, with a "View Post Order" link navigating to `/post-orders/:id/edit`. Show a "Create Post Order" button if no PO exists for the post.
- **Post list view:** Add a "Post Order" column showing the PO ID or "—" if none exists.

**Implementation state:** Deferred. The `post_order_id` field is not yet included in `Asset/get_post` or `Asset/get_posts_list` responses. Clients can discover a post's PO by querying `PostOrder/get_post_orders_list` filtered by community as an interim solution.

---

### 1.8 Settings: Post Order Section Types (SDS §5.4.3)

**Route:** `/settings/post-order-section-types`

**Data source:** Standard `$DataItems` CRUD for the `po_section_type` data item (DB-backed).

**Table columns:**

| Column | Data Item Field | Description |
|--------|-----------------|-------------|
| Section Type | `DIT_NAME` | Type name (e.g., "General Information") |
| Client Visible Default | `DIT_EXTRA.client_visible` | Toggle — default visibility hint for new sections |
| Description | `DIT_EXTRA.description` | Short description |
| Active | Active/Deleted status | Only active types appear in the "Add Section" dropdown |

**Actions:**
- Add new section type
- Edit existing type name, client_visible default, and description
- Deactivate a type (soft-delete). Existing post orders using the type are unaffected

---

## 2. Officer Mobile App (React Native)

### 2.1 Post Orders Tab (SDS §3.12.1)

**Location:** Navigation bar tab — "Post Orders"

**Data source:** `PostOrder/get_post_orders_list` (officer-scoped: shows only published POs for allocated posts in last 90 days)

**List item layout:**

| Element | Source Field | Position |
|---------|-------------|----------|
| Post Name | `post_name` | Primary text (bold) |
| Community | `community_name` | Secondary text |
| Version | `version` | Right-aligned badge (e.g., "v2.1") |
| Last Updated | `last_published_on` | Tertiary text (relative time, e.g., "2 days ago") |
| Acknowledgement Status | Local state + API | Badge: Green "Acknowledged" or Amber "Pending" |

**Note on acknowledgement badge:** The current API does not return per-officer acknowledgement status in the list. The mobile app should track acknowledged version IDs locally (e.g., `AsyncStorage`) and compare against the returned `version` to determine display state. Alternatively, fetch the full PO detail on-demand.

**Filtering:** The list is pre-filtered server-side (only published POs for allocated posts). No additional client-side filters are required, but a pull-to-refresh gesture should be implemented.

**Empty state:** "No post orders available." Displayed when the officer has no allocated posts with published POs.

---

### 2.2 Post Order Viewer (SDS §3.12.2)

**Triggered by:** Tapping a list item in the Post Orders tab.

**Data source:** `PostOrder/get_post_order` (officer view — returns published version content, no notes)

**Layout:**

#### Header Bar
| Element | Source |
|---------|--------|
| Post Name | `post_name` |
| Version Badge | `version` (e.g., "v2.1") |
| Effective Date | `effective_date` |
| Status | "Published" badge |

#### Sections List (Scrollable)

Sections are displayed as **collapsible accordion panels**, initially collapsed, listed in `sort_order` sequence.

Each expanded panel contains:

| Element | Behavior |
|---------|----------|
| Section Type Icon | Color-coded icon based on section type |
| Section Title | Bold heading |
| Description | Rendered rich text content |
| Attachments | Inline viewers — PDF opens in-app viewer, images display inline, videos play in the in-app player (up to 1 minute) |
| Client-Visible Badge | Small "Client Visible" tag on sections where `client_visible === true` |

**Notes field:** NOT displayed to officers (stripped server-side).

---

### 2.3 Acknowledgement Footer (SDS §3.12.4)

**Location:** Sticky bottom sheet at the bottom of the Post Order Viewer.

**States:**

#### State A — Not Yet Acknowledged (Current Version)
```
┌──────────────────────────────────────────────────┐
│  📋 Version 2.1                                  │
│  ⚠️ This is a new version. Please review and     │
│     acknowledge.                                  │
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │     ✅  ACKNOWLEDGE POST ORDER               ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

- Warning text appears only if the officer has acknowledged a **previous** version but not the current one.
- Button calls `PostOrder/acknowledge_post_order` with `version_id: 0` (latest published).
- On success: transition to State B with a success animation.

#### State B — Already Acknowledged
```
┌──────────────────────────────────────────────────┐
│  ✅ Acknowledged on Oct 15, 2026 at 2:30 PM      │
│     Version 2.1                                   │
└──────────────────────────────────────────────────┘
```

- Green background/border.
- Acknowledgement timestamp from local storage or API response.

#### Error Handling
- `ERR_POST_ORDER_ALREADY_ACKNOWLEDGED` (rc 675): Transition to State B (treat as success — race condition or stale UI).
- `ERR_POST_ORDER_NOT_FOUND` (rc 670): Show toast "This post order is no longer available" and navigate back to the list.

---

### 2.4 Offline Storage & Indicator (SDS §3.12.3) — Design Specification

#### Caching Strategy
1. **Trigger:** When the officer receives a `shift_published` or `shift_starting_soon` push notification, the app fetches published PO content (`PostOrder/get_post_order`) for all posts in the upcoming shift and caches the response in local SQLite or `AsyncStorage`.
2. **Cache key:** `post_order:{PO_ID}:version:{version_string}`
3. **Offline reading:** If the device is offline, the viewer loads from cache. All text and attachment URLs are resolved.
4. **Cache invalidation:** On `post_order_updated` push notification, re-fetch the PO and update the cache.
5. **Cache purge:** 24 hours after the shift ends, or on user logout, whichever comes first.

#### Visual Indicator

| Location | Element | Behavior |
|----------|---------|----------|
| Post Order Viewer header | "Available Offline" tag (cloud-with-checkmark icon) | Shown when the PO content is cached locally |
| Post Order Viewer header | "Offline" banner (yellow) | Shown when the device is offline and viewing cached content |
| Post Orders list | Offline-available icon (small cloud icon) | Shown next to POs that have been cached |

---

### 2.5 Push Notification Handling

| Notification Type | Action on Tap | Deep-Link |
|-------------------|---------------|-----------|
| `post_order_published` | Navigate to Post Order Viewer | `/post-orders/:entity_id` |
| `post_order_updated` | Navigate to Post Order Viewer + re-fetch content | `/post-orders/:entity_id` |
| `post_order_review_due` | Navigate to Post Order Editor (admin only) | `/post-orders/:entity_id/edit` |

---

## 3. Resident/Client Mobile App (React Native)

### 3.1 Post Orders View (SDS §2.9)

**Location:** Dedicated section in the main navigation — "Post Orders"

**Data source:** `PostOrder/get_post_orders_list` (resident-scoped: published POs for communities associated with the client's account)

**List item layout:**

| Element | Source Field |
|---------|-------------|
| Post Name | `post_name` |
| Community | `community_name` |
| Version | `version` |
| Effective Date | `effective_date` |

**Restrictions (per SDS §2.9):**
- Read-only view — no editing or acknowledgement capabilities.
- Only published post orders are visible.
- Only sections marked `client_visible === true` are displayed.
- Notes are never shown.

### 3.2 Post Order Detail View

**Data source:** `PostOrder/get_post_order` (resident view — only client-visible sections, no notes)

**Layout:** Same collapsible section panels as the officer viewer (§2.2), but:
- No acknowledgement footer
- No offline caching indicator
- No notes displayed
- Only client-visible sections shown

**Header:**
| Element | Source |
|---------|--------|
| Post Name | `post_name` |
| Version | `version` |
| Effective Date | `effective_date` |

---

## 4. Implementation Priority

| Priority | Component | Dependency |
|----------|-----------|------------|
| P0 | Post Order List View (Admin) | API ready |
| P0 | Post Order Editor + Section Builder (Admin) | API ready |
| P0 | Publish Version Modal (Admin) | API ready |
| P0 | Post Orders Tab + Viewer (Officer) | API ready |
| P0 | Acknowledgement Footer (Officer) | API ready |
| P1 | Version History Panel (Admin) | API ready |
| P1 | Delete & Archive UI (Admin) | API ready |
| P1 | Resident Post Orders View | API ready |
| P1 | Settings: Section Types (Admin) | DataItems CRUD ready |
| P2 | Offline Caching (Officer) | Client-side implementation |
| P2 | Compliance Dashboard (Admin) | Server API extension needed |
| P3 | Map/Post Integration (Admin) | Server API extension needed (Q8) |
