# Asset Module — Deferred Requirements

**Created:** 2026-08-20
**Module:** `platform/api/asset.js`, `platform/funcs/asset.js`

---

## ~~1. Map Item Limit Enforcement (SDS 4.2.6)~~ ✅ Enforcement Implemented — Settings UI Deferred

**Requirement:** A map can have up to 1,000 items (assets + posts + zones combined per community).

**Current behavior:** ✅ Server-side enforcement is active. All four creation endpoints (`create_asset`, `create_assets_batch`, `create_post`, `create_map_zone`) check the combined count of assets + posts + map zones before inserting. The batch endpoint validates `current_count + batch_size`. Error: `ERR_MAP_ITEM_LIMIT_EXCEEDED` (762).

The limit is configurable via `settings:asset → max_map_items_per_community` in the `key_value` table (default 1,000).

**Still deferred:**
- Expose `max_map_items_per_community` in the Settings module API (`Settings/update_asset_settings`).
- Admin Portal UI: display an "Assets Plotted: X / 1000" counter on the map management screen and disable the "Add" buttons when the limit is reached.

---

## 2. Map Zoom Grouping / Clustering (SDS 4.2.6, item 4)

**Requirement:** On zoom out, asset icons in the same area should be grouped. Hovering over the group icon shows the total count and count per asset type.

**Current behavior:** This is a client-side rendering feature. The server returns all assets with coordinates.

**Dependencies:** Client-side map library (e.g., Leaflet, Mapbox GL).

**Implementation notes:** No server changes required for basic clustering (client libraries handle it). If server-side clustering is needed for very large maps, add a `get_assets_clustered` endpoint that returns aggregated counts by grid cell.

---

## ~~3. Acres Calculation for Assets (SDS 4.2.6.1, item 8)~~ ✅ Implemented

**Requirement:** When creating assets, "the acres will be calculated and saved" for each asset.

**Current behavior:** ✅ Implemented. `AST_ACRES decimal(10,4)` column added to the `asset` table. Area is calculated server-side via `calculateAcres(shape, locationObj)` during `create_asset`, `create_assets_batch`, and `update_asset` (recalculated when shape or location changes).

**Formulas:**
- Place (point): 0 acres
- Line: 0 acres
- Circle: `π × r² / 4046.8564224` (radius in meters from location JSON)

**Future consideration:** If polygon shapes are added to assets, implement the Shoelace formula with lat/lng-to-meters projection. This is not currently needed as asset shapes are limited to place/circle/line.

---

## ~~4. Post Permissions (SDS 4.2.6.2)~~ ✅ Schema Implemented — Validation Deferred to Phase 5.1

**Requirement:** The SDS mentions a "Permissions" field on posts.

**Current behavior:** ✅ `PST_PERMISSIONS` JSON column added to the `post` table. The Asset module stores and retrieves the scheduling allocation requirements JSON (`{required_roles:[], required_badges:[], required_equipment:[]}`), exposed as an optional parameter in `create_post` and `update_post`.

**Deferred to Phase 5.1 (Shift Management):**
- Set-intersection validation between `PST_PERMISSIONS` and the assigned officer's `OFC_ROLES`, `OFC_CERTIFICATION_BADGES`, and issued equipment.
- Non-blocking conflict warnings during `Shift/assign_post` or `Shift/validate_allocation`.
- Manager override safeguard allowing acknowledged bypass of eligibility mismatches (per SDS 4.7.3.2).

---

## 5. Undo Mark on Map (SDS 4.2.6.1, item 3)

**Requirement:** After clicking on the map to mark a location, the user can "Undo the mark and remark again."

**Current behavior:** This is entirely a client-side UX feature. The server only receives the final confirmed location.

**Dependencies:** Client-side map editor implementation.

---

## 6. Map Rotation and Navigation (SDS 4.2.6, item 4)

**Requirement:** The map should support rotate, zoom in/out, and pan.

**Current behavior:** Client-side feature. No server involvement.

**Dependencies:** Client-side map library.

---

## 7. Post Order Link from Post (SDS 4.2.6.2, 4.2.7)

**Requirement:** Each post can have a Post Order document linked. The user can view the post order from the post detail, and can click "Create post order" from a post.

**Current behavior:** The `post` table does not have a foreign key to `post_order`. This link will be established when the Post Order module (Phase 6.1) is implemented — the `post_order` table will have a `PO_PST_ID` column referencing `post.PST_ID`.

**Dependencies:** Post Order module (Phase 6.1).

---

## 8. Asset Replacement Date Reminder

**Requirement (implied from SDS 4.2.6.1):** The replacement date field suggests that assets nearing their replacement date should trigger a notification or appear in a dashboard.

**Current behavior:** `AST_REPLACEMENT_DATE` is stored but not monitored. No cron job or notification exists.

**Dependencies:** Settings module, Notification module, cron infrastructure (`initStandAlone()`).

### Implementation Blueprint

#### 8a. Configurable Reminder Window (Settings Module)

- Add `asset_replacement_reminder_days` (default `30`) to the `settings:asset` namespace in the `key_value` table.
- Expose via `Settings/update_asset_settings` and `Settings/get_asset_settings` (or integrate into existing settings endpoints).
- 30 days is recommended as the default — physical assets (cameras, gates, doors) require longer procurement and vendor scheduling than software-level POI records (14 days).

#### 8b. Nightly Cron Job

Create `cron_asset_replacement_check.js` using the standard `initStandAlone()` bootstrap pattern:

1. Fetch the configured lead time from settings (default 30).
2. Run a single query to find assets due for replacement exactly on the target date (prevents duplicate daily alerts):
   ```sql
   SELECT a.AST_ID, a.AST_TYPE, a.AST_DESCRIPTION, a.AST_REPLACEMENT_DATE,
          c.COM_NAME, c.COM_ID
   FROM `asset` a
   JOIN `community` c ON c.COM_ID = a.AST_COM_ID
   WHERE a.AST_DELETED_ON IS NULL
     AND c.COM_DELETED_ON IS NULL
     AND a.AST_REPLACEMENT_DATE = DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
   ```
   Note: The `asset` table has no `AST_NAME` column. Use `AST_TYPE` + `AST_ID` (or `AST_DESCRIPTION` if available) as the display identifier.

3. Fan out notifications using `Notification/create_bulk_notifications` to minimize write overhead.

#### 8c. Notification Type Registration

Add to `platform/data/notification_type.json`:

- **Type key:** `asset_replacement_soon`
- **Title template:** `Asset Replacement Approaching`
- **Message template:** `The #asset_type# asset (#asset_id#) at #community_name# is scheduled for replacement on #replacement_date#.`
- **Placeholders:** `#asset_type#`, `#asset_id#`, `#description#`, `#community_name#`, `#replacement_date#`

#### 8d. Recipient Routing

Notifications should be sent to:
1. All active `USER_TYPE_ADMIN` users associated with the affected community.
2. If `USER_ROLE_LOGISTICS` or equivalent role exists at implementation time, target that role specifically.

#### 8e. Task Module Deep-Link (Optional Enhancement)

Include deep-linking payload in the notification:
```json
{
    "entity_type": "asset",
    "entity_id": 12345,
    "suggested_action": "generate_replacement_task"
}
```
When clicked in the Admin Portal, this opens a pre-populated "Create Task" modal:
- **Task type:** `supply_request` or `damaged_equipment`
- **Description:** Pre-filled with `"Scheduled replacement for [asset_type] (ID: [asset_id]) at [community_name]."`
- **Assignee:** Pre-filled with the community's default manager

This converts a passive alert into an actionable, trackable procurement workflow.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/asset.js` | API endpoint definitions |
| `backend/platform/funcs/asset.js` | Business logic implementation |
| `backend/platform/data/asset_type.json` | Asset type $DataItems (DB-backed) |
| `backend/platform/data/asset_shape.json` | Asset shape $DataItems |
| `backend/platform/data/post_priority.json` | Post priority $DataItems |
| `backend/platform/data/map_zone_type.json` | Map zone type $DataItems |
| `db/db.sql` | Table schemas (post, asset, map_zone) |
| `db/UpgradeDB.sql` | V 4.6.0 migration script |
