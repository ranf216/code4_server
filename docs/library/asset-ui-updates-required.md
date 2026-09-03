# Asset & Post Module — UI Updates Required

**Module:** Phase 4.1 — Asset, Post & Map Infrastructure
**Version:** 4.6.0
**Audience:** Web Admin Portal and Mobile App UI/UX designers and frontend developers

---

## 1. Admin Web Management Portal

### 1.1 Navigation

Add a new top-level menu item **"Map & Assets"** in the main navigation sidebar, below the existing "Tasks" entry. This menu item expands to reveal three sub-items:

| # | Menu Item | Route | Description |
|---|-----------|-------|-------------|
| 1 | Map Workspace | `/map` | The primary interactive map screen |
| 2 | Posts | `/map/posts` | Post list management grid |
| 3 | Asset Types | `/settings/asset-types` | Data-item management for asset types (via existing Data Items UI) |

---

### 1.2 The Interactive Map Workspace

**Route:** `/map`

This is the primary screen for managing all map infrastructure — assets, posts, and map zones — on a 2D community map.

#### 1.2.1 Layout

The map workspace consists of three areas:

| Area | Position | Description |
|------|----------|-------------|
| **Map Canvas** | Center (fills available width) | Interactive 2D map showing the community map image (`COM_MAP_IMAGE`) or a map-provider base layer (Google Maps / Mapbox). All assets, posts, and zones are rendered as overlays. |
| **Toolbar** | Top bar above the map | Community selector, drawing tools, layer toggles, search, and the live item counter. |
| **Detail Drawer** | Right side panel (collapsible) | Opens when an item is selected. Shows full details and edit/delete actions. |

#### 1.2.2 Toolbar Controls

| Control | Type | Behavior |
|---------|------|----------|
| Community selector | Dropdown | Lists all active communities. Changing community reloads all map data. |
| **Live Map Item Counter** | Badge/chip | Displays: **`Items: 142 / 1,000`** (current count vs. limit). Updates after every create/delete operation. See Section 1.2.3. |
| Layer toggles | Segmented button group | Three toggles: **Assets** (on/off), **Posts** (on/off), **Zones** (on/off). Default: all on. Toggling hides/shows the corresponding layer on the map. |
| Asset type filter | Dropdown (multi-select) | Filters visible assets by type. Populate from `Asset/get_asset_metadata` -> `asset_types`. |
| Zone type filter | Dropdown | Filters visible zones: `All`, `Entry/Exit`, `High Priority`. |
| Search | Text input with 300ms debounce | Filters the visible asset/post list by description/name. |
| Drawing tool selector | Icon button group | See Section 1.2.4. |
| Upload Map | Button | Opens a file picker for uploading the community map image (calls `Asset/upload_community_map`). |

#### 1.2.3 Live Map Item Counter

The counter badge displays the combined total of active assets, posts, and zones for the selected community against the configured maximum (default: 1,000).

**Visual states:**

| Condition | Appearance |
|-----------|------------|
| Below 80% capacity | Default text/background (e.g., `Items: 142 / 1,000`) |
| 80-99% capacity | Orange/warning text (e.g., `Items: 850 / 1,000`) |
| At or above limit | Red background, bold white text (e.g., `Items: 1,000 / 1,000`) |

**Behavior when limit is reached:**
- Disable all drawing tools (grayed out, non-clickable).
- Display a warning tooltip on hover: *"Map item limit reached. Delete existing items or contact an administrator to increase the limit."*
- If the user has items staged in a batch that would exceed the limit, show a modal warning before submission:
  > **Map Item Limit Exceeded**
  > Adding these items would bring the total to 1,048 / 1,000.
  > Please reduce the batch or remove existing items.

**Data source:** Sum `num_of_items` from `Asset/get_assets_list` (page 0) + `num_of_items` from `Asset/get_posts_list` (page 0) + `zones.length` from `Asset/get_map_zones`.

#### 1.2.4 Drawing Tools

The drawing toolbar provides shape tools for placing items on the map. Each tool corresponds to a shape type.

| Tool | Icon | Shape | Description |
|------|------|-------|-------------|
| **Place Marker** | Pin icon | `place` | Click on the map to place a single point marker. |
| **Circle** | Circle icon | `circle` | Click to set center, drag to set radius. Display radius in meters as the user drags. |
| **Line** | Polyline icon | `line` | Click to add waypoints, double-click to finish. |
| **Polygon** | Polygon icon | (zone only) | Click to add vertices, double-click or click first vertex to close. Used for map zones. |

**Undo behavior:** After placing a marker or drawing a shape, show an "Undo" button (or Ctrl+Z) to clear the last mark and allow the user to re-draw. The server only receives the final confirmed coordinates.

**Drawing mode flow:**

1. User selects a drawing tool.
2. User selects the entity type being created: **Asset**, **Post**, or **Map Zone** (via a secondary selector or right-click context menu).
3. User draws on the map.
4. On completion, a creation form modal appears pre-filled with the drawn coordinates.
5. User fills in remaining fields (type, name, description, etc.) and submits.
6. On success, the new item appears on the map immediately.

#### 1.2.5 Map Layer Rendering

Each entity type is rendered with distinct visual styling:

**Assets:**

| Asset Type | Icon | Color |
|------------|------|-------|
| Camera | Camera icon | Blue (#0D6EFD) |
| Gate | Gate/barrier icon | Green (#198754) |
| Door | Door icon | Teal (#0DCAF0) |
| Alarm | Bell/alarm icon | Red (#DC3545) |
| Fence | Fence/line icon | Gray (#6C757D) |
| Other types | Generic pin | Purple (#6610F2) |

For `circle` shapes, render a semi-transparent fill with the asset's color. For `line` shapes, render a colored polyline.

**Posts:**

| Priority | Marker Color | Icon |
|----------|-------------|------|
| `urgent` | Red (#DC3545) | Exclamation shield |
| `important` | Orange (#FD7E14) | Shield with arrow |
| `normal` | Blue (#0D6EFD) | Shield |
| `low` | Gray (#6C757D) | Shield (muted) |

Inactive posts should be rendered with 40% opacity and a strikethrough on the label.

**Map Zones:**

| Zone Type | Fill Color | Border |
|-----------|-----------|--------|
| `entry_exit` | Green fill (#19875433, 20% opacity) | Green border (#198754), 2px dashed |
| `high_priority` | Red fill (#DC354533, 20% opacity) | Red border (#DC3545), 2px solid |

Zone labels should be centered within the polygon or next to the point marker.

#### 1.2.6 Map Clustering (Deferred)

When many assets are plotted in a small area, the map library should group overlapping icons into cluster badges on zoom out. Hovering over a cluster shows:
- Total item count.
- Breakdown by asset type (e.g., "3 Cameras, 2 Gates, 1 Door").

Clicking a cluster zooms in to reveal individual items. This is a client-side rendering feature using the map library's clustering plugin (e.g., Leaflet.markercluster, Mapbox GL supercluster).

---

### 1.3 Asset Detail Drawer

When the user clicks an asset on the map or in a list, the right-side detail drawer opens.

**Drawer sections:**

| # | Section | Content |
|---|---------|---------|
| 1 | **Header** | Asset type icon + type name (e.g., "Camera"). Asset ID in muted text. |
| 2 | **Location** | Map pin mini-view (a small static map showing the asset's position). |
| 3 | **Acreage** | **Read-only** field: *"Area: 4.2560 Acres"*. Display only for `circle` shapes; hide for `place` and `line` (which are always 0). Format to 4 decimal places. |
| 4 | **Details** | Description, shape, installation date, replacement date. |
| 5 | **Lifecycle** | Created by, created on, last update. |
| 6 | **Actions** | "Edit" button (opens edit modal), "Delete" button (with confirmation dialog). |

**Acreage display rules:**
- Show `"Area: X.XXXX Acres"` prominently for circle assets.
- For place/line assets, do not show an acreage field (it would always be 0.0000).

---

### 1.4 Post Detail Drawer

| # | Section | Content |
|---|---------|---------|
| 1 | **Header** | Post name. Priority badge (color-coded, see encoding below). Active/Inactive status tag. |
| 2 | **Location** | Map pin mini-view. |
| 3 | **Description** | Post description text. |
| 4 | **Equipment** | Equipment requirements free-text. Show "None specified" in muted text if null. |
| 5 | **Eligibility Requirements** | Display the `permissions` JSON in a structured view (see Section 1.5). |
| 6 | **Lifecycle** | Created by, created on, last update. |
| 7 | **Actions** | "Edit", "Delete", "Deactivate/Activate" toggle. |

**Priority visual encoding:**

| Priority | Badge Color | Icon |
|----------|-------------|------|
| `urgent` | Red (#DC3545), bold text | Exclamation circle |
| `important` | Orange (#FD7E14) | Arrow up |
| `normal` | Blue (#0D6EFD) | Minus (neutral) |
| `low` | Gray (#6C757D) | Arrow down |

---

### 1.5 Post Eligibility Configuration Panel

When creating or editing a post, the form includes a **"Scheduling Eligibility Requirements"** section for configuring `PST_PERMISSIONS`.

**Layout:** Three sub-sections, each with a multi-select dropdown (or tag input):

| # | Field | Source | Behavior |
|---|-------|--------|----------|
| 1 | **Required Roles** | Officer roles list (from officer module metadata or a hardcoded list until role management is built) | Multi-select dropdown. Selected items saved as `required_roles` array. |
| 2 | **Required Badges** | Certification badges list (from officer module metadata) | Multi-select dropdown. Selected items saved as `required_badges` array. |
| 3 | **Required Equipment** | Free-text tag input | Admin types equipment names and presses Enter to add tags. Saved as `required_equipment` array. |

**Display in read mode:** Show as tag chips, grouped by category:

```
Roles:      [Supervisor]  [Patrol]
Badges:     [Armed]  [First Aid]
Equipment:  [Radio]  [Body Camera]
```

If all three arrays are empty or `permissions` is null, show: *"No eligibility requirements configured."*

**Note:** The Shift module (Phase 5.1) will use these requirements to generate warnings during officer assignment. Until then, this data is informational only.

---

### 1.6 Posts Grid View

**Route:** `/map/posts`

An alternative table view of all posts for the selected community (supplementing the map visualization).

**Grid columns:**

| # | Column | Source Field | Width | Notes |
|---|--------|-------------|-------|-------|
| 1 | ID | `post_id` | 60px | Right-aligned, clickable -> opens detail drawer |
| 2 | Name | `name` | 150px | Clickable -> opens detail drawer |
| 3 | Priority | `priority` | 90px | Color-coded badge |
| 4 | Shape | `shape` | 80px | Capitalized label |
| 5 | Equipment | `equipment` | Flex | Truncate with ellipsis at 60 chars |
| 6 | Status | `is_active` | 80px | Green "Active" / Gray "Inactive" tag |
| 7 | Created | `created_on` | 130px | Formatted date-time |
| 8 | Last Update | `last_update` | 130px | Formatted date-time or "---" |

**Toolbar controls:**

| Control | Type | Behavior |
|---------|------|----------|
| Community selector | Dropdown | Admin only. Reload on change. |
| Active/Inactive toggle | Segmented button | "Active" (default, `include_inactive: false`), "All" (`include_inactive: true`) |
| Priority filter | Dropdown | Filters by priority |
| Search | Text input (300ms debounce) | Maps to `search_text` |
| Sort | Column header click | Toggles `sort_by` + `sort_dir` |
| Page controls | Previous/Next + page indicator | Uses `page` parameter, displays `num_of_items` total |

---

### 1.7 Create/Edit Asset Modal

A modal dialog for creating or editing an asset.

**Form fields:**

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Community | Dropdown (disabled on edit) | Yes (create) | Populate from communities list |
| 2 | Asset Type | Dropdown | Yes | Populate from `asset_types` metadata |
| 3 | Shape | Radio group | Yes | `Place` (default), `Circle`, `Line` |
| 4 | Location | Map picker (read-only coordinates display) | Yes | Coordinates from the map drawing tool |
| 5 | Description | Textarea (500 char max) | No | Manufacturer, model, serial number |
| 6 | Installation Date | Date picker | No | `YYYY-MM-DD` |
| 7 | Replacement Date | Date picker | No | `YYYY-MM-DD` |

**On edit:** Pre-populate all fields. Community is read-only. Show current acreage as a read-only informational field if shape is circle.

---

### 1.8 Create/Edit Post Modal

**Form fields:**

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Community | Dropdown (disabled on edit) | Yes (create) | Populate from communities list |
| 2 | Name | Text input (60 char max) | Yes | Must be unique within community |
| 3 | Description | Textarea (200 char max) | No | |
| 4 | Priority | Dropdown | No (default: `normal`) | Populate from `post_priorities` metadata |
| 5 | Shape | Radio group | No (default: `place`) | `Place`, `Circle`, `Line` |
| 6 | Location | Map picker | Yes | Coordinates from drawing tool |
| 7 | Equipment | Textarea | No | Free-text equipment requirements |
| 8 | Eligibility Requirements | Multi-select panel | No | See Section 1.5 |
| 9 | Active | Toggle switch | No (default: on) | |

**Uniqueness error handling:** If `rc: 753` is returned on save, display inline validation error: *"A post with this name already exists in the selected community."*

---

### 1.9 Create/Edit Map Zone Modal

**Form fields:**

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Community | Dropdown (disabled on edit) | Yes (create) | |
| 2 | Zone Type | Dropdown | Yes | `Entry/Exit Point`, `High Priority Zone` |
| 3 | Name | Text input (100 char max) | Yes | |
| 4 | Location | Map picker / polygon drawer | Yes | Point or polygon coordinates |

---

### 1.10 Upload Community Map Modal

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Community | Dropdown | Yes | |
| 2 | Map Image | File picker + drag-and-drop zone | Yes | Accepted formats: PNG, JPG. Display a preview before upload. |

On upload success, refresh the map canvas background with the new image URL returned in the response.

---

### 1.11 Deletion Confirmation Dialogs

**Standard deletion (assets, zones):**

> **Delete Asset?**
> This action cannot be undone. The asset will be permanently removed from the map.
> [Cancel] [Delete]

**Post deletion with shift history:**

When `delete_post` returns `rc: 759`:

> **Cannot Delete Post**
> "Main Gate" has been used in shift scheduling and cannot be deleted.
> You can deactivate it instead to hide it from scheduling.
> [Cancel] [Deactivate Post]

If the user clicks "Deactivate Post", call `Asset/update_post` with `is_active: false`.

---

## 2. Officer Mobile App

### 2.1 The Interactive Map Overlay

**Screen:** Community Map (existing screen, enhanced with new layers).

Officers see their community map with three overlay layers:

| Layer | Visibility | Icon Style |
|-------|-----------|------------|
| **Assets** | Always visible | Small colored icons by asset type (same color scheme as admin, but smaller scale) |
| **Posts** | Always visible, priority color-coded | Shield markers with priority color fill |
| **Map Zones** | Always visible | Semi-transparent colored polygons with border |

**Layer toggle:** A floating action button group in the bottom-right corner allows officers to toggle individual layers on/off for map clarity.

**Clustering:** When zoomed out, items are clustered into numbered badges (client-side). Tap a cluster to zoom into individual items.

---

### 2.2 Asset Detail Bottom Sheet

When an officer taps an asset marker on the map, a bottom sheet slides up with:

| # | Section | Content |
|---|---------|---------|
| 1 | **Header** | Asset type icon + type name (e.g., "Camera"). |
| 2 | **Description** | Full description text (manufacturer, model, serial number). Show "No description" in muted text if null. |
| 3 | **Location** | GPS coordinates displayed as `40.7128, -74.0060`. Tap to open in native maps app. |
| 4 | **Lifecycle** | Installation date, replacement date. Highlight replacement date in orange if within 30 days of current date; red if overdue. |

**Read-only:** Officers cannot edit or delete assets.

---

### 2.3 Post Detail Bottom Sheet

When an officer taps a post marker:

| # | Section | Content |
|---|---------|---------|
| 1 | **Header** | Post name. Priority badge (color-coded). |
| 2 | **Description** | Full description text. |
| 3 | **Equipment** | Required equipment list. Displayed as a bulleted list. If null, show "No equipment specified." |
| 4 | **Eligibility Requirements** | Structured display of `permissions` (roles as tags, badges as tags, equipment as tags). If null, show "Open to all officers." |
| 5 | **Status** | Active/Inactive indicator. |

**Future integration (Phase 5.1):** Once shift scheduling is built, tapping a post will also show:
- Current shift assignment (which officer is posted here now).
- Upcoming shift schedule.
- Quick action: "Navigate to Post" (opens directions in native maps).

---

### 2.4 Map Zone Rendering on Mobile

Map zones are rendered as semi-transparent colored overlays:

| Zone Type | Fill | Border |
|-----------|------|--------|
| Entry/Exit | Green, 15% opacity | Green, 1.5px dashed |
| High Priority | Red, 15% opacity | Red, 1.5px solid |

Tapping a zone shows a small info bubble with the zone name and type. Zones are always visible (no detail bottom sheet needed beyond the info bubble).

---

### 2.5 Offline Considerations

The officer mobile app should cache the last-fetched asset, post, and zone data for offline map rendering. When the device comes back online:

1. Re-fetch all map data.
2. Diff against cached data.
3. Animate any changed/new/removed markers with a brief flash effect.

GPS coordinates stored in the location JSON are sufficient for offline rendering — no additional server calls are needed to draw the map overlay.

---

## 3. Shared Design Tokens

To ensure visual consistency between the web admin portal and mobile apps:

### 3.1 Color Palette (Asset Module)

| Token | Hex | Usage |
|-------|-----|-------|
| `asset-camera` | #0D6EFD | Camera markers |
| `asset-gate` | #198754 | Gate markers |
| `asset-door` | #0DCAF0 | Door markers |
| `asset-alarm` | #DC3545 | Alarm markers |
| `asset-fence` | #6C757D | Fence markers |
| `asset-other` | #6610F2 | Other/unknown type markers |
| `post-urgent` | #DC3545 | Urgent priority |
| `post-important` | #FD7E14 | Important priority |
| `post-normal` | #0D6EFD | Normal priority |
| `post-low` | #6C757D | Low priority |
| `zone-entry-exit` | #198754 | Entry/exit zone fill and border |
| `zone-high-priority` | #DC3545 | High-priority zone fill and border |
| `counter-normal` | — | Default text styling |
| `counter-warning` | #FD7E14 | 80-99% capacity |
| `counter-critical` | #DC3545 | At or above limit |

### 3.2 Map Marker Sizes

| Context | Marker Size | Label Font |
|---------|------------|------------|
| Web Admin (default zoom) | 32x32 px | 12px |
| Web Admin (zoomed out) | 24x24 px | 10px |
| Mobile App (default) | 28x28 px | 11px |
| Mobile App (selected) | 36x36 px, with pulse animation | 13px bold |
