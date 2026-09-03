# Asset API — App Developer Integration Guide

**Module:** `Asset`
**Version:** 4.6.0
**Audience:** Mobile (iOS/Android) and Web frontend developers

---

## 1. Authentication & Authorization

All Asset API endpoints require an authenticated session. Include the session token in every request:

```
Header:  token: <session_token>
```

The token is obtained from `User/login_*` endpoints. If the token is missing or expired, the server returns `rc: 113` (no token) or `rc: 201` (invalid token).

### Community Scoping

- **Admins:** Must pass `community_id` explicitly on all creation and list endpoints. Have access to all communities.
- **Officers:** Community is auto-resolved from the officer's `USD_COM_ID` in their user profile. Officers can only view posts and map zones within their own community. Officers do **not** have access to asset CRUD or any write operations.

### Role-Based Access

| Role | Assets (CRUD) | Posts (Read) | Posts (Write) | Map Zones (Read) | Map Zones (Write) | Map Image | Metadata |
|------|--------------|-------------|--------------|-----------------|-------------------|-----------|----------|
| Admin | Full | All communities | Full | All communities | Full | Upload | Yes |
| Officer | No access | Own community | No access | Own community | No access | No access | Yes |

If a non-admin user attempts to call an admin-only endpoint, the server returns `rc: 103` (`ERR_NO_PRIVILEGES`).

---

## 2. API Endpoint Directory

All endpoints are called as: `POST /api` with body `{"module": "Asset", "method": "<method_name>", ...params}`.

---

### 2.1 `Asset/get_assets_list`

Retrieve a paginated list of assets for a community with optional filters.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Yes | — | Community ID |
| `asset_type` | string | No | (all) | Filter by asset type key (from `Asset/get_asset_metadata` -> `asset_types`) |
| `search_text` | string | No | (none) | Free-text search across `description` |
| `sort_by` | string | No | `"created_on"` | Sort column: `created_on`, `asset_type` |
| `sort_dir` | string | No | `"asc"` | Sort direction: `asc` or `desc` |
| `page` | integer | No | `0` | Page number (0-based) |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "num_of_pages": 3,
    "num_of_items": 142,
    "assets": [
        {
            "asset_id": 1,
            "community_id": 10,
            "community_name": "Sunrise Community",
            "asset_type": "camera",
            "asset_type_name": "Camera",
            "shape": "place",
            "location": {"lat": 40.7128, "lng": -74.0060},
            "description": "Hikvision DS-2CD2143 — SN: HK20260501",
            "acres": 0.0,
            "installation_date": "2026-01-15",
            "replacement_date": "2031-01-15",
            "created_by": "usr_abc123",
            "created_on": "2026-08-20 14:30:00",
            "last_update": null
        }
    ]
}
```

**Pagination:** Page size is controlled server-side (default: 50). Use `num_of_pages` to render page controls and `num_of_items` for total count display.

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | `community_id` does not exist or is deleted |
| 751 | `ERR_ASSET_INVALID_TYPE` | `asset_type` filter is not a recognized type |

---

### 2.2 `Asset/get_asset`

Retrieve full details for a single asset.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `asset_id` | integer | Yes | — | Asset ID |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "asset": {
        "asset_id": 1,
        "community_id": 10,
        "community_name": "Sunrise Community",
        "asset_type": "camera",
        "asset_type_name": "Camera",
        "shape": "circle",
        "location": {"lat": 40.7128, "lng": -74.0060, "radius": 150},
        "description": "Parking lot camera cluster coverage area",
        "acres": 1.7422,
        "installation_date": "2026-01-15",
        "replacement_date": "2031-01-15",
        "created_by": "usr_abc123",
        "created_on": "2026-08-20 14:30:00",
        "last_update": "2026-08-21 09:15:00"
    }
}
```

**Notes:**
- `acres` is always a float (e.g., `1.7422`), not a string.
- `location` is a parsed JSON object whose structure varies by `shape` (see Section 4).
- `installation_date` and `replacement_date` are `YYYY-MM-DD` strings or `null`.

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 750 | `ERR_ASSET_NOT_FOUND` | Asset does not exist or was deleted |

---

### 2.3 `Asset/create_asset`

Create a single new asset on the community map.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Yes | — | Community ID |
| `asset_type` | string | Yes | — | Asset type key (from metadata) |
| `shape` | string | No | `"place"` | Shape: `place`, `circle`, `line` |
| `location` | string | Yes | — | Location JSON string (see Section 4) |
| `description` | string | No | `null` | Manufacturer, model, serial number, etc. (max 500 chars) |
| `installation_date` | string | No | `null` | Installation date (`YYYY-MM-DD`) |
| `replacement_date` | string | No | `null` | Replacement date (`YYYY-MM-DD`) |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "asset_id": 42
}
```

**Behavior notes:**
- Server calculates and persists `AST_ACRES` based on `shape` and `location`.
- Dates are validated with server-side format checking. Invalid date strings return rc 763.
- The community's combined map item count (assets + posts + zones) is checked before insertion.

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community does not exist |
| 751 | `ERR_ASSET_INVALID_TYPE` | `asset_type` is not a recognized type |
| 755 | `ERR_ASSET_INVALID_SHAPE` | `shape` is not `place`, `circle`, or `line` |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | Community has reached the maximum number of map items |
| 763 | `ERR_ASSET_INVALID_DATE` | `installation_date` or `replacement_date` is not a valid date |

---

### 2.4 `Asset/create_assets_batch`

Create multiple assets at once. All assets in the batch share the same type, shape, description, and dates, but each has its own location. The entire batch is atomic — if the map item limit would be exceeded, no assets are created.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Yes | — | Community ID |
| `asset_type` | string | Yes | — | Shared asset type key |
| `shape` | string | No | `"place"` | Shared shape |
| `locations` | array | Yes | — | Array of location JSON objects (one per asset) |
| `description` | string | No | `null` | Shared description |
| `installation_date` | string | No | `null` | Shared installation date (`YYYY-MM-DD`) |
| `replacement_date` | string | No | `null` | Shared replacement date (`YYYY-MM-DD`) |

**Constraints:**
- `locations` must be a non-empty array (otherwise rc 760).
- Maximum 100 items per batch (otherwise rc 761).
- Total community map items including the batch must not exceed the limit (otherwise rc 762).

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "asset_ids": [42, 43, 44, 45, 46]
}
```

`asset_ids` contains the auto-increment IDs of all created assets in order.

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community does not exist |
| 751 | `ERR_ASSET_INVALID_TYPE` | Invalid asset type |
| 755 | `ERR_ASSET_INVALID_SHAPE` | Invalid shape |
| 760 | `ERR_ASSET_BATCH_EMPTY` | `locations` array is empty |
| 761 | `ERR_ASSET_BATCH_LIMIT_EXCEEDED` | Batch exceeds 100 items |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | Community limit exceeded |
| 763 | `ERR_ASSET_INVALID_DATE` | Invalid date format |

---

### 2.5 `Asset/update_asset`

Partial update (PATCH-like) — only provided fields are modified. Omit a field or pass `/null/` to leave it unchanged.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `asset_id` | integer | Yes | — | Asset ID |
| `asset_type` | string | No | (unchanged) | New asset type key |
| `shape` | string | No | (unchanged) | New shape |
| `location` | string | No | (unchanged) | New location JSON |
| `description` | string | No | (unchanged) | New description (pass empty string `""` to clear) |
| `installation_date` | string | No | (unchanged) | New date (pass `""` to clear) |
| `replacement_date` | string | No | (unchanged) | New date (pass `""` to clear) |

**Behavior notes:**
- Acreage is automatically recalculated if `shape` or `location` changes.
- Passing an empty string for optional text/date fields clears them to `null`.

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 750 | `ERR_ASSET_NOT_FOUND` | Asset not found |
| 751 | `ERR_ASSET_INVALID_TYPE` | Invalid asset type |
| 755 | `ERR_ASSET_INVALID_SHAPE` | Invalid shape |
| 763 | `ERR_ASSET_INVALID_DATE` | Invalid date format |

---

### 2.6 `Asset/delete_asset`

Soft-delete an asset. The record is not physically removed.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `asset_id` | integer | Yes | — | Asset ID |

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 750 | `ERR_ASSET_NOT_FOUND` | Asset not found or already deleted |

---

### 2.7 `Asset/get_posts_list`

Retrieve a paginated list of posts for a community.

**Access:** Admin and Officer.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Admin: Yes / Officer: ignored | `0` | Community ID. Officers: auto-resolved from profile |
| `include_inactive` | boolean | No | `false` | Include inactive posts. Default: active only |
| `search_text` | string | No | (none) | Free-text search across `name` and `description` |
| `sort_by` | string | No | `"name"` | Sort column: `name`, `priority`, `created_on` |
| `sort_dir` | string | No | `"asc"` | Sort direction: `asc` or `desc` |
| `page` | integer | No | `0` | Page number (0-based) |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "num_of_pages": 2,
    "num_of_items": 58,
    "posts": [
        {
            "post_id": 1,
            "community_id": 10,
            "community_name": "Sunrise Community",
            "name": "Main Gate",
            "description": "Primary vehicle and pedestrian entry point",
            "priority": "urgent",
            "shape": "place",
            "location": {"lat": 40.7128, "lng": -74.0060},
            "equipment": "Radio, Body Camera, Flashlight",
            "permissions": {
                "required_roles": ["Supervisor"],
                "required_badges": ["Armed"],
                "required_equipment": ["Radio", "Body Camera"]
            },
            "is_active": true,
            "created_by": "usr_abc123",
            "created_on": "2026-08-20 10:00:00",
            "last_update": null
        }
    ]
}
```

**Notes:**
- `permissions` is a parsed JSON object or `null` if not set.
- `is_active` is a boolean (`true`/`false`).
- By default only active posts are returned. Pass `include_inactive: true` to see deactivated posts.

---

### 2.8 `Asset/get_post`

Retrieve full details for a single post.

**Access:** Admin and Officer (officers: own community only).

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `post_id` | integer | Yes | — | Post ID |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "post": { ... }
}
```

Post object structure is identical to the items in `get_posts_list`.

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 752 | `ERR_POST_NOT_FOUND` | Post not found, deleted, or not in officer's community |

---

### 2.9 `Asset/create_post`

Create a new guard post on the community map.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Yes | — | Community ID |
| `name` | string | Yes | — | Post name (max 60 chars, unique within community) |
| `description` | string | No | `null` | Description (max 200 chars) |
| `priority` | string | No | `"normal"` | Priority: `urgent`, `important`, `normal`, `low` |
| `shape` | string | No | `"place"` | Shape: `place`, `circle`, `line` |
| `location` | string | Yes | — | Location JSON string |
| `equipment` | string | No | `null` | Required equipment free-text |
| `permissions` | string | No | `null` | Scheduling requirements JSON string (see below) |
| `is_active` | boolean | No | `true` | Whether the post starts active |

**Permissions JSON format:**

```json
{
    "required_roles": ["Supervisor", "Patrol"],
    "required_badges": ["Armed", "First Aid"],
    "required_equipment": ["Radio", "Body Camera"]
}
```

All three keys are optional. Omitted keys default to empty arrays.

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "post_id": 15
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 105 | `ERR_INVALID_API_PARAM` | Name is empty or exceeds 60 characters |
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community does not exist |
| 753 | `ERR_POST_NAME_ALREADY_EXISTS` | A post with this name already exists in the community |
| 756 | `ERR_POST_INVALID_PRIORITY` | Invalid priority value |
| 757 | `ERR_POST_INVALID_SHAPE` | Invalid shape value |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | Community map item limit exceeded |

---

### 2.10 `Asset/update_post`

Partial update for a post. Only provided fields are modified.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `post_id` | integer | Yes | — | Post ID |
| `name` | string | No | (unchanged) | New name (must still be unique within community) |
| `description` | string | No | (unchanged) | New description |
| `priority` | string | No | (unchanged) | New priority |
| `shape` | string | No | (unchanged) | New shape |
| `location` | string | No | (unchanged) | New location JSON |
| `equipment` | string | No | (unchanged) | New equipment |
| `permissions` | string | No | (unchanged) | New permissions JSON |
| `is_active` | boolean | No | (unchanged) | Active status toggle |

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 105 | `ERR_INVALID_API_PARAM` | Name is empty or exceeds 60 characters |
| 752 | `ERR_POST_NOT_FOUND` | Post not found |
| 753 | `ERR_POST_NAME_ALREADY_EXISTS` | Duplicate name in community |
| 756 | `ERR_POST_INVALID_PRIORITY` | Invalid priority |
| 757 | `ERR_POST_INVALID_SHAPE` | Invalid shape |

---

### 2.11 `Asset/delete_post`

Soft-delete a post. Posts that have been used in a shift (referenced by the shift module) **cannot** be deleted — they can only be deactivated via `update_post` with `is_active: false`.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `post_id` | integer | Yes | — | Post ID |

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 752 | `ERR_POST_NOT_FOUND` | Post not found |
| 759 | `ERR_POST_HAS_SHIFT_HISTORY` | Post has been used in a shift; deactivate instead |

---

### 2.12 `Asset/get_map_zones`

Retrieve all map zones for a community. Not paginated (zone count per community is small).

**Access:** Admin and Officer.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Admin: Yes / Officer: ignored | `0` | Community ID |
| `zone_type` | string | No | (all) | Filter: `entry_exit`, `high_priority` |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "zones": [
        {
            "zone_id": 1,
            "community_id": 10,
            "community_name": "Sunrise Community",
            "zone_type": "entry_exit",
            "zone_type_name": "Entry/Exit Point",
            "name": "Main Gate",
            "location": {"lat": 40.7128, "lng": -74.0060},
            "created_by": "usr_abc123",
            "created_on": "2026-08-20 10:00:00",
            "last_update": null
        }
    ]
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community not found |
| 758 | `ERR_MAP_ZONE_INVALID_TYPE` | Invalid zone type filter |

---

### 2.13 `Asset/create_map_zone`

Create a map zone (entry/exit point or high-priority zone).

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Yes | — | Community ID |
| `zone_type` | string | Yes | — | Zone type: `entry_exit` or `high_priority` |
| `name` | string | Yes | — | Zone name |
| `location` | string | Yes | — | Location JSON string (point or polygon) |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "zone_id": 5
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community not found |
| 758 | `ERR_MAP_ZONE_INVALID_TYPE` | Invalid zone type |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | Community map item limit exceeded |

---

### 2.14 `Asset/update_map_zone`

Partial update for a map zone.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `zone_id` | integer | Yes | — | Zone ID |
| `zone_type` | string | No | (unchanged) | New zone type |
| `name` | string | No | (unchanged) | New name |
| `location` | string | No | (unchanged) | New location JSON |

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 754 | `ERR_MAP_ZONE_NOT_FOUND` | Zone not found |
| 758 | `ERR_MAP_ZONE_INVALID_TYPE` | Invalid zone type |

---

### 2.15 `Asset/delete_map_zone`

Soft-delete a map zone.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `zone_id` | integer | Yes | — | Zone ID |

**Success response:**

```json
{
    "rc": 0,
    "message": "success"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 754 | `ERR_MAP_ZONE_NOT_FOUND` | Zone not found |

---

### 2.16 `Asset/upload_community_map`

Upload or replace the 2D community map image.

**Access:** Admin only.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | Yes | — | Community ID |
| `map_image` | string | Yes | — | Base64-encoded image data |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "map_image_url": "https://cdn.example.com/images/community/img_abc123.jpg"
}
```

**Error codes:**

| RC | Constant | Cause |
|----|----------|-------|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community not found |
| 302 | `ERR_INVALID_UPLOADED_IMAGE` | Invalid image data |

---

### 2.17 `Asset/get_asset_metadata`

Retrieve all enum values for populating dropdowns in the UI. Call this once on screen load and cache the result client-side.

**Access:** Admin and Officer.

**Request:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |

**Success response:**

```json
{
    "rc": 0,
    "message": "success",
    "asset_types": [
        {"id": "camera", "name": "Camera"},
        {"id": "gate", "name": "Gate"},
        {"id": "door", "name": "Door"},
        {"id": "alarm", "name": "Alarm"},
        {"id": "fence", "name": "Fence"}
    ],
    "asset_shapes": [
        {"id": "place", "name": "Place"},
        {"id": "circle", "name": "Circle"},
        {"id": "line", "name": "Line"}
    ],
    "post_priorities": [
        {"id": "urgent", "name": "Urgent"},
        {"id": "important", "name": "Important"},
        {"id": "normal", "name": "Normal"},
        {"id": "low", "name": "Low"}
    ],
    "map_zone_types": [
        {"id": "entry_exit", "name": "Entry/Exit Point"},
        {"id": "high_priority", "name": "High Priority Zone"}
    ]
}
```

**Notes:**
- `asset_types` is DB-backed and may vary between deployments. Always fetch from this endpoint rather than hardcoding.
- `asset_shapes`, `post_priorities`, and `map_zone_types` are static enums.

---

## 3. Response Codes Summary

### Success

| RC | Constant | Meaning |
|----|----------|---------|
| 0 | `ERR_SUCCESS` | Operation completed successfully |

### General Errors

| RC | Constant | Meaning |
|----|----------|---------|
| 103 | `ERR_NO_PRIVILEGES` | User role does not have access to this endpoint |
| 105 | `ERR_INVALID_API_PARAM` | A required parameter is missing or invalid |
| 113 | `ERR_NO_TOKEN_FOR_AUTHED_API_CALL` | Token header missing |
| 201 | `ERR_INVALID_USER_TOKEN` | Token is invalid or expired |
| 500 | `ERR_COMMUNITY_NOT_FOUND` | Community does not exist or is deleted |

### Asset-Specific Errors

| RC | Constant | Meaning |
|----|----------|---------|
| 750 | `ERR_ASSET_NOT_FOUND` | Asset not found or already deleted |
| 751 | `ERR_ASSET_INVALID_TYPE` | Asset type key not recognized |
| 752 | `ERR_POST_NOT_FOUND` | Post not found or already deleted |
| 753 | `ERR_POST_NAME_ALREADY_EXISTS` | Post name not unique within community |
| 754 | `ERR_MAP_ZONE_NOT_FOUND` | Map zone not found or already deleted |
| 755 | `ERR_ASSET_INVALID_SHAPE` | Shape not `place`, `circle`, or `line` |
| 756 | `ERR_POST_INVALID_PRIORITY` | Priority not recognized |
| 757 | `ERR_POST_INVALID_SHAPE` | Shape not recognized |
| 758 | `ERR_MAP_ZONE_INVALID_TYPE` | Zone type not recognized |
| 759 | `ERR_POST_HAS_SHIFT_HISTORY` | Post used in shifts, cannot delete — deactivate instead |
| 760 | `ERR_ASSET_BATCH_EMPTY` | Batch locations array is empty |
| 761 | `ERR_ASSET_BATCH_LIMIT_EXCEEDED` | Batch exceeds 100 items |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | Community map item limit reached |
| 763 | `ERR_ASSET_INVALID_DATE` | Date field format is invalid |

---

## 4. Location JSON Structures

All location parameters are passed as JSON strings. The structure depends on the shape:

### Place (Point)

```json
{"lat": 40.7128, "lng": -74.0060}
```

### Circle

```json
{"lat": 40.7128, "lng": -74.0060, "radius": 150}
```

`radius` is in meters. The server uses it to calculate acreage for assets.

### Line

```json
{
    "points": [
        {"lat": 40.7128, "lng": -74.0060},
        {"lat": 40.7138, "lng": -74.0050},
        {"lat": 40.7148, "lng": -74.0040}
    ]
}
```

### Map Zone (Point or Polygon)

Map zones can use either a point or a polygon coordinate array:

```json
{
    "points": [
        {"lat": 40.7128, "lng": -74.0060},
        {"lat": 40.7138, "lng": -74.0050},
        {"lat": 40.7148, "lng": -74.0040},
        {"lat": 40.7128, "lng": -74.0060}
    ]
}
```

For polygon boundaries, the first and last point should be identical to close the shape.

---

## 5. Integration Patterns

### 5.1 Initial Screen Load

When the map management screen loads:

1. Call `Asset/get_asset_metadata` to populate all dropdowns. Cache client-side for the session.
2. Call `Asset/get_assets_list` with `page: 0` to fetch the first page of assets.
3. Call `Asset/get_posts_list` with `page: 0` to fetch the first page of posts.
4. Call `Asset/get_map_zones` to fetch all zones (not paginated).
5. Optionally, use the metadata `asset_types` list to render legend/filter chips on the map.

### 5.2 Batch Asset Plotting

For bulk asset placement (e.g., plotting 20 cameras along a fence line):

1. Collect all coordinates client-side as the admin clicks on the map.
2. Call `Asset/create_assets_batch` with all coordinates in the `locations` array.
3. On success, use the returned `asset_ids` array to render markers immediately.
4. On `rc: 762`, display a limit-exceeded warning and show the current count vs. maximum.

### 5.3 Handling the Map Item Limit

Before enabling "Add" buttons, you may optionally call `Asset/get_assets_list`, `Asset/get_posts_list`, and `Asset/get_map_zones` to calculate the current total from `num_of_items` + zones count. Compare against the known limit (default: 1000) to proactively disable drawing tools.

If you do not pre-check, the server will return `rc: 762` on any creation attempt that exceeds the limit.

### 5.4 Partial Updates

For update endpoints (`update_asset`, `update_post`, `update_map_zone`), only send the fields that actually changed. The server uses a `/null/` sentinel to distinguish "not provided" from "clear this field":

- **Omitting a parameter** = no change to that field.
- **Sending an empty string `""`** = clear the field to `null` (for text/date fields).

### 5.5 Post Deletion vs. Deactivation

When calling `Asset/delete_post`:
- If `rc: 0` is returned, the post was successfully soft-deleted.
- If `rc: 759` is returned, the post has shift history. Show the user a message:
  > "This post has been used in a shift and cannot be deleted. Would you like to deactivate it instead?"
  If confirmed, call `Asset/update_post` with `is_active: false`.
