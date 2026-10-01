# Post Order Module — Issues & Questions

**Created:** 2026-10-20
**Module:** `platform/api/post_order.js`, `platform/funcs/post_order.js`
**Phase:** 6.1

---

## Resolved Questions

### 1. Post Order ↔ Post Relationship — RESOLVED

**Question:** Should a column be added to the `post` table to link to post orders, or should the link go the other direction?

**Resolution:** The `post_order` table has `PO_PST_ID` referencing `post.PST_ID`. No column was added to the `post` table. A unique constraint is enforced in application code (one PO per post, querying `WHERE PO_DELETED_ON IS NULL`). The client can discover a post's PO by querying `PostOrder/get_post_orders_list` filtered to that post's community, or by the `PO_PST_ID` value in the response.

---

### 2. Version Snapshot Storage — RESOLVED

**Question:** Should published versions store section data as normalized rows in separate versioned tables, or as a JSON snapshot?

**Resolution:** JSON snapshot in `post_order_version.POV_CONTENT` (JSON column). This provides immutable historical records without complex version-to-section join tables. Sections, attachments, notes, and ordering are all captured. Trade-off: published content cannot be queried at the individual-section level via SQL, but version retrieval is a single-row fetch.

---

### 3. Section Client Visibility Default — RESOLVED

**Question:** Should `POS_CLIENT_VISIBLE` default to the `client_visible` attribute defined in the `po_section_type` data item, or should the API caller always specify it?

**Resolution:** The API requires the caller to provide `client_visible` per section. The `po_section_type` data item's `client_visible` attribute in `DIT_EXTRA` serves as a UI hint for the admin portal to pre-populate the toggle — the server does not enforce it as a default. This allows admins to override per-section visibility for specific posts.

---

### 4. Acknowledgement Flow Details (SDS §3.12.4) — RESOLVED

**Decision:** Version-Gated Boolean Acknowledgement via `PostOrder/acknowledge_post_order`.

**Workflow & Rules:**
1. **Version Isolation:** Acknowledgements are recorded per version (`POA_POV_ID`). Publishing a new major or minor version (`POV_ID`) automatically requires assigned officers to re-acknowledge the new version.
2. **Atomic Action:** Acknowledgement is a simple boolean action. `PostOrder/acknowledge_post_order` accepts `post_order_id` (required) and `version_id` (optional, defaults to latest published version). Optional comments or text confirmations are omitted to maintain a friction-free mobile workflow.
3. **Duplicate Prevention:** If an officer attempts to acknowledge a version they have already acknowledged, the server returns `rc: 675 (ERR_POST_ORDER_ALREADY_ACKNOWLEDGED)`.
4. **Version Validation:** When `version_id` is explicitly provided, the server validates that the version belongs to the specified post order before recording the acknowledgement.

**Implementation state:** Fully implemented. The `post_order_acknowledgement` table stores `POA_PO_ID`, `POA_POV_ID`, and `POA_USR_ID` with a unique constraint on `(POA_POV_ID, POA_USR_ID)`.

**Deferred:**
- Acknowledgement deadline / time window enforcement
- Manager notification for non-acknowledged officers
- Acknowledged percentage in list view (see Q5)

---

### 5. Acknowledged Percentage in List View (SDS §4.10.2) — RESOLVED (Design Only)

**Decision:** Compute `acknowledged_pct` dynamically for admin list view.

**Implementation Details:**
1. **Definition of Allocated Officers:** Officers assigned to shifts (`shift_post`) associated with the post within the last 90 days (matching the existing `OFFICER_POST_HISTORY_DAYS` constant used for officer access scoping).
2. **Calculation Formula:**
   `acknowledged_pct = (unique officers with POA_POV_ID = current published POV_ID) / (total distinct officers assigned to post in last 90 days) × 100`
3. **Performance Optimization:** In `PostOrder/get_post_orders_list`, compute `acknowledged_pct` using a single subquery or batch lookup rather than N+1 queries. Return `null` for draft post orders.

**Implementation state:** Not yet implemented in `get_post_orders_list`. The acknowledgement table and shift_post tables exist and can be queried. To be added in a follow-up enhancement.

---

### 6. Offline Mobile Caching Strategy (SDS §3.12.3) — RESOLVED (Client-Side)

**Decision:** Client-side storage blueprint (React Native).

**Implementation Guidance:**
1. **Server Role:** The server provides full JSON version snapshots (`POV_CONTENT`) via `PostOrder/get_post_order`.
2. **Mobile Caching:** When an officer receives a `shift_published` or `shift_starting_soon` notification, the mobile app fetches and caches the active `POV_CONTENT` in local SQLite / `AsyncStorage`.
3. **Cache Purge:** Cached post order snapshots are retained locally during active shifts and automatically purged 24 hours after the shift ends or upon user logout.

**Implementation state:** No server changes required. Documented for mobile team.

---

### 7. Review Due Date Reminder Notification — RESOLVED (Design Only)

**Decision:** Implement `cron_post_order_review_check.js` maintenance job.

**Implementation Details:**
1. Add a daily background cron job (`cron_post_order_review_check.js`) running at 04:00.
2. Query published post orders where `PO_REVIEW_DUE_DATE` is within the next 7 days (`PO_REVIEW_DUE_DATE <= NOW() + 7 DAYS`) and no reminder notification has been dispatched in the last 7 days.
3. Dispatch a `post_order_review_due` notification (in-app + push) to the author (`PO_CREATED_BY`) and community managers.
4. Requires adding `post_order_review_due` to `notification_type.json` and registering the cron in `ecosystem.config.js`.

**Implementation state:** Not yet implemented. `PO_REVIEW_DUE_DATE` column exists and is filterable in the list API (`review_due_before` parameter). To be added in a follow-up enhancement.

---

### 8. Post Detail API — Post Order ID Inclusion — RESOLVED (Design Only)

**Decision:** Enhance `Asset/get_post` and `Asset/get_posts_list` with `post_order_id`.

**Implementation Details:**
- Add a `LEFT OUTER JOIN post_order` (`PO_PST_ID = PST_ID AND PO_DELETED_ON IS NULL`) in `Asset/get_post` and `Asset/get_posts_list`.
- Return `post_order_id` (integer or `null`) directly in post response objects, enabling one-click navigation from map post pins to post orders.

**Implementation state:** Not yet implemented. Deferred to avoid modifying the Asset module in Phase 6.1. To be added in a follow-up enhancement.

---

### 9. Attachment File Validation (Size & Duration) — RESOLVED

**Decision:** Multi-layer file and media validation.

**Implementation Details:**
1. **Section Attachment Count:** `PostOrder/create_post_order` and `PostOrder/update_post_order` enforce a maximum of 5 attachments per section. Exceeding the limit returns `rc: 679 (ERR_POST_ORDER_MEDIA_LIMIT_REACHED)`.
2. **File Size (20 MB):** Max file size is validated server-side during base64 upload in `File/upload_file`. The Post Order module validates file existence by ID but does not re-validate size.
3. **Video Duration (1 Min):** Enforced client-side during mobile video recording/selection. Server-side duration checks are deferred to a media processing pipeline if one is added.

**Implementation state:** Attachment count limit fully implemented. File size and video duration enforced externally (File module / client).

---

## Design Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | One PO per post (app-level check, not DB unique constraint) | Soft deletes make a unique index on `PO_PST_ID` problematic (a deleted PO + active PO would conflict). Application-level check queries `WHERE PO_DELETED_ON IS NULL`. |
| D2 | JSON snapshot for version content | Avoids complex versioned-section tables. Historical versions are immutable and fetched as a single row. |
| D3 | Bulk INSERT for sections + contiguous ID calculation for attachments | Matches `create_assets_batch` pattern. Avoids DB calls in loops. |
| D4 | Notification sent after transaction commit | Prevents notifications for failed publishes. Matches task module pattern. |
| D5 | Edit published → auto-transition to draft | Officers continue seeing the last published version (from `post_order_version`) while the admin edits the working copy. |
| D6 | Full section replacement on update | Simpler than differential patching. Supports free reordering and section type changes. |
| D7 | `acknowledge_post_order` version_id is optional | Defaults to latest published version if omitted, keeping the mobile UX simple. Explicit version_id supported for precision. |

---

## Summary of Post Order Decisions & Error Codes

| Item | Topic | Decision | Configuration / Error Code |
|:-----|:------|:---------|:---------------------------|
| **Q1** | Post Link | `PO_PST_ID` in `post_order`; unique constraint in app code | Application-level `PO_DELETED_ON IS NULL` check |
| **Q2** | Version Content | Immutable JSON snapshot in `post_order_version.POV_CONTENT` | Single-row fetch |
| **Q3** | Visibility Default | Explicit parameter per section; `po_section_type` acts as UI hint | `POS_CLIENT_VISIBLE` |
| **Q4** | Acknowledgements | Tracked per `POV_ID`; simple boolean action; optional `version_id` | `rc: 675 (ERR_POST_ORDER_ALREADY_ACKNOWLEDGED)` |
| **Q5** | Ack Percentage | Computed dynamically against 90-day `shift_post` officers | `acknowledged_pct` in list view (future) |
| **Q6** | Offline Caching | Client-side React Native local cache; purged 24h post-shift | Mobile app responsibility |
| **Q7** | Review Reminder | Background cron checking `PO_REVIEW_DUE_DATE` (7-day lead) | `cron_post_order_review_check.js` (future) |
| **Q8** | Post API Link | Include `post_order_id` in `Asset/get_post` & `get_posts_list` | `LEFT OUTER JOIN post_order` (future) |
| **Q9** | Attachments | Max 5 attachments per section; 20 MB file size limit | `rc: 679 (ERR_POST_ORDER_MEDIA_LIMIT_REACHED)` |
