# Asset API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Asset/<endpoint_name>"`.

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

### Assets

An asset represents a physical item placed on a community map — cameras, doors, windows, sensors, or any other infrastructure element that needs to be tracked.

- Each asset belongs to exactly one community.
- Assets are classified by a **type** (configured in Settings) and a **shape** that determines how they appear on the map: `place` (point marker), `circle` (area with radius), or `line` (path between points).
- For `circle` assets, the system automatically calculates and stores an **acreage** value based on the radius. For `place` and `line` shapes, acreage is `0`.
- Assets support optional **installation date** and **replacement date** for lifecycle tracking.
- Deleting an asset is a **soft delete** — it is marked as removed but retained for audit history.
- A community has a configurable combined limit on total map items (assets + posts + map zones). The default limit is 1,000. Creating an asset that would exceed this limit is rejected.

### Batch Asset Creation

Multiple assets sharing the same type, shape, and dates can be created in a single request by providing an array of individual locations. The maximum batch size is 100 items per request.

### Posts

A post represents a named location within a community where officers may be stationed during a shift — a gate, entrance, guardhouse, or checkpoint.

- Each post has a **unique name** within its community (maximum 60 characters).
- Posts have an **active/inactive** status. By default, only active posts appear in list queries.
- Posts support a **priority** level (`urgent`, `important`, `normal`, `low`) and optional **equipment** requirements.
- Posts support a **permissions** field that defines scheduling allocation requirements — the roles, badges, and equipment an officer must have to be eligible for assignment to this post.
- A post that has been used in a shift (has shift history) **cannot be deleted** — it can only be deactivated by setting `is_active` to `false`.
- Posts are soft-deleted when removed.
- Officers can view posts within their own community. Admins can view posts across all communities.

### Map Zones

Map zones mark special areas on a community map, such as entry/exit points or high-priority patrol zones.

- Each zone has a **type** (`entry_exit` or `high_priority`) and a **name**.
- Map zones are soft-deleted when removed.
- Officers can view zones within their own community.

### Map Item Limit

Assets, posts, and map zones share a combined per-community cap. The default maximum is 1,000 items. This limit applies to all creation endpoints (single asset, batch asset, post, and map zone).

### Community Map Image

Admins can upload or replace a 2D community map image used as a visual backdrop for the map view.

---

## Endpoints — Metadata

### POST Asset/get_asset_metadata
*Admin or Officer.* Retrieves the lists of asset types, asset shapes, post priorities, and map zone types used to populate dropdown menus in the consumer app.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid Admin or Officer session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "asset_types": [
            {
                "id": "camera",
                "name": "Camera"
            }
        ],
        "asset_shapes": [
            {
                "id": "place",
                "name": "Place"
            },
            {
                "id": "circle",
                "name": "Circle"
            },
            {
                "id": "line",
                "name": "Line"
            }
        ],
        "post_priorities": [
            {
                "id": "urgent",
                "name": "Urgent"
            },
            {
                "id": "important",
                "name": "Important"
            },
            {
                "id": "normal",
                "name": "Normal"
            },
            {
                "id": "low",
                "name": "Low"
            }
        ],
        "map_zone_types": [
            {
                "id": "entry_exit",
                "name": "Entry/Exit Point"
            },
            {
                "id": "high_priority",
                "name": "High Priority Zone"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `asset_types` | array | Available asset types configured in Settings. Each entry has `id` (key) and `name` (display label). May be empty if no types are configured. |
    | `asset_shapes` | array | Fixed set of shape options: `place`, `circle`, `line`. |
    | `post_priorities` | array | Fixed set of priority levels: `urgent`, `important`, `normal`, `low`. |
    | `map_zone_types` | array | Fixed set of zone types: `entry_exit`, `high_priority`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called once when the asset management screen loads to populate all dropdown selectors — asset type, shape, priority, and zone type. The consumer app should cache these values for the duration of the session. Asset types are managed in Settings (SDS 5.4.2); shapes, priorities, and zone types are system-defined.

---

## Endpoints — Assets

### POST Asset/get_assets_list
*Admin only.* Retrieves a paginated list of assets for a specific community, with optional filters for type, text search, and sort order.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to list assets for. |
    | `asset_type` | string | No | Filter by asset type key (e.g., `"camera"`). Must be a valid asset type from metadata. |
    | `search_text` | string | No | Free-text search across the asset description field. |
    | `sort_by` | string | No | Sort column. Values: `created_on` (default), `asset_type`. |
    | `sort_dir` | string | No | Sort direction. Values: `asc` (default), `desc`. |
    | `page` | integer | No | Page number, 0-based. Default: `0`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "num_of_pages": 1,
        "num_of_items": 3,
        "assets": [
            {
                "asset_id": 1,
                "community_id": 5,
                "community_name": "Sunset Estates",
                "asset_type": "camera",
                "asset_type_name": "Camera",
                "shape": "circle",
                "location": {"lat": 25.276, "lng": 55.296, "radius": 100},
                "description": "PTZ Camera SN-4821",
                "acres": 7.763,
                "installation_date": "2026-01-15",
                "replacement_date": "2031-01-15",
                "created_by": 1,
                "created_on": "2026-01-15 10:30:00",
                "last_update": "2026-02-20 14:00:00"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `num_of_pages` | integer | Total number of pages available. |
    | `num_of_items` | integer | Total number of assets matching the filters. |
    | `assets` | array | Array of asset objects for the current page. |
    | `asset_id` | integer | Unique asset identifier. |
    | `community_id` | integer | ID of the community this asset belongs to. |
    | `community_name` | string | Display name of the community, or `null`. |
    | `asset_type` | string | Asset type key. |
    | `asset_type_name` | string | Human-readable asset type name. |
    | `shape` | string | Shape: `place`, `circle`, or `line`. |
    | `location` | object | Coordinates object. Structure varies by shape (see Location Formats below). |
    | `description` | string | Asset description, or `null`. |
    | `acres` | number | Calculated acreage. Positive for `circle` shapes; `0` for `place` and `line`. |
    | `installation_date` | string | Installation date in `YYYY-MM-DD` format, or `null`. |
    | `replacement_date` | string | Replacement date in `YYYY-MM-DD` format, or `null`. |
    | `created_by` | integer | User ID of the creator. |
    | `created_on` | string | ISO datetime of creation. |
    | `last_update` | string | ISO datetime of last modification, or `null`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |
    | 751 | invalid asset type | The provided `asset_type` filter is not a recognized asset type key. |

- **Usage & Flows:**
    Called to populate the asset list view in the management portal (SDS 4.2.7). The consumer app should present this alongside the post list, allowing the user to toggle between them. Supports the free-text search (SDS 4.2.7, item 5) and filtering by asset type. Pagination is 0-based; page size is server-configured.

---

### POST Asset/get_asset
*Admin only.* Retrieves the full details of a single asset by its ID.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `asset_id` | integer | Yes | The ID of the asset to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "asset":
        {
            "asset_id": 1,
            "community_id": 5,
            "community_name": "Sunset Estates",
            "asset_type": "camera",
            "asset_type_name": "Camera",
            "shape": "circle",
            "location": {"lat": 25.276, "lng": 55.296, "radius": 100},
            "description": "PTZ Camera SN-4821",
            "acres": 7.763,
            "installation_date": "2026-01-15",
            "replacement_date": "2031-01-15",
            "created_by": 1,
            "created_on": "2026-01-15 10:30:00",
            "last_update": "2026-02-20 14:00:00"
        }
    }
    ```

    Field descriptions are the same as in `get_assets_list`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 750 | asset not found | The specified `asset_id` does not exist or has been soft-deleted. |

- **Usage & Flows:**
    Called when the user clicks on an asset in the map or list view to open its detail panel (SDS 4.2.6.1, review/edit/delete). The consumer app displays all asset fields and provides Edit and Delete actions.

---

### POST Asset/create_asset
*Admin only.* Creates a new asset on the community map.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to add the asset to. |
    | `asset_type` | string | Yes | Asset type key from metadata (e.g., `"camera"`). |
    | `shape` | string | No | Shape of the asset. Values: `place` (default), `circle`, `line`. |
    | `location` | string | Yes | Location JSON string. See Location Formats below. |
    | `description` | string | No | Description text (manufacturer, model, serial number, etc.). |
    | `installation_date` | string | No | Installation date in `YYYY-MM-DD` format. |
    | `replacement_date` | string | No | Replacement date in `YYYY-MM-DD` format. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "asset_id": 42
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `asset_id` | integer | The unique ID of the newly created asset. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |
    | 751 | invalid asset type | The provided `asset_type` is not a recognized asset type key. |
    | 755 | invalid asset shape | The provided `shape` is not one of `place`, `circle`, `line`. |
    | 762 | maximum number of map items reached | The community has reached the combined limit for assets, posts, and map zones. |
    | 763 | invalid date format | One of the date fields is not in valid `YYYY-MM-DD` format. |

- **Usage & Flows:**
    Called when the user adds a single asset on the community map (SDS 4.2.6.1). The consumer app should:
    1. Let the user draw/mark a location on the map (point, circle, or line).
    2. Open a form to fill in asset type, description, and dates.
    3. Send the request with the selected location and form values.
    4. On success, add the asset to the map display using the returned `asset_id`.

    Acreage is calculated server-side and does not need to be sent by the consumer.

---

### POST Asset/create_assets_batch
*Admin only.* Creates multiple assets at once. All assets share the same type, shape, and dates but have individual locations.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to add the assets to. |
    | `asset_type` | string | Yes | Asset type key from metadata. |
    | `shape` | string | No | Shape for all assets. Values: `place` (default), `circle`, `line`. |
    | `locations` | array | Yes | Array of location objects, one per asset. Maximum 100 items. |
    | `description` | string | No | Shared description for all assets. |
    | `installation_date` | string | No | Shared installation date in `YYYY-MM-DD` format. |
    | `replacement_date` | string | No | Shared replacement date in `YYYY-MM-DD` format. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "asset_ids": [42, 43, 44]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `asset_ids` | array | Array of integer IDs for all created assets, in the same order as the `locations` array. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |
    | 751 | invalid asset type | The provided `asset_type` is not a recognized asset type key. |
    | 755 | invalid asset shape | The provided `shape` is not one of `place`, `circle`, `line`. |
    | 760 | batch asset list is empty | The `locations` array is empty. |
    | 761 | batch asset list exceeds maximum allowed size | The `locations` array contains more than 100 items. |
    | 762 | maximum number of map items reached | Adding all batch items would exceed the community's combined map item limit. |
    | 763 | invalid date format | One of the date fields is not in valid `YYYY-MM-DD` format. |

- **Usage & Flows:**
    Called when the user uses the "Add Multiple Assets" feature (SDS 4.2.6.1, batch activity). The consumer app should:
    1. Let the user mark multiple points on the map.
    2. Once the user clicks "Complete", open a single form for shared asset details (type, shape, description, dates).
    3. Send all marked locations in the `locations` array.
    4. On success, add all assets to the map using the returned `asset_ids`.

    Each asset gets its own acreage calculation server-side.

---

### POST Asset/update_asset
*Admin only.* Edits asset details. Supports partial updates — only the fields provided are changed; omitted fields remain unchanged.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `asset_id` | integer | Yes | The ID of the asset to update. |
    | `asset_type` | string | No | New asset type key. |
    | `shape` | string | No | New shape: `place`, `circle`, or `line`. |
    | `location` | string | No | New location JSON string. |
    | `description` | string | No | New description. Send an empty string to clear. |
    | `installation_date` | string | No | New installation date in `YYYY-MM-DD` format. Send an empty string to clear. |
    | `replacement_date` | string | No | New replacement date in `YYYY-MM-DD` format. Send an empty string to clear. |

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
    | 750 | asset not found | The specified `asset_id` does not exist or has been soft-deleted. |
    | 751 | invalid asset type | The provided `asset_type` is not a recognized asset type key. |
    | 755 | invalid asset shape | The provided `shape` is not one of `place`, `circle`, `line`. |
    | 763 | invalid date format | One of the date fields is not in valid `YYYY-MM-DD` format. |

- **Usage & Flows:**
    Called when the user clicks Edit on an asset detail panel (SDS 4.2.6.1, review/edit). The consumer app should:
    1. Pre-populate the form with the current asset values from `get_asset`.
    2. Send only the changed fields.
    3. On success, refresh the asset detail view.

    When `shape` or `location` is changed, the server automatically recalculates acreage. If only unrelated fields (e.g., `description`) are updated, acreage remains unchanged.

---

### POST Asset/delete_asset
*Admin only.* Soft-deletes an asset. The asset is marked as removed and will no longer appear in list or detail queries.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `asset_id` | integer | Yes | The ID of the asset to delete. |

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
    | 750 | asset not found | The specified `asset_id` does not exist or has already been soft-deleted. |

- **Usage & Flows:**
    Called when the user clicks Delete on an asset (SDS 4.2.6.1, review/edit/delete). The consumer app should present a confirmation dialog: *"Are you sure you would like to delete the asset?"* with Yes/Close buttons. On confirmation, call this endpoint and remove the asset from the map display.

---

## Endpoints — Posts

### POST Asset/get_posts_list
*Admin or Officer.* Retrieves a paginated list of posts for a community. Officers automatically see only their assigned community's posts.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin or Officer session token. |
    | `community_id` | integer | Conditional | Required for Admin. Officers' community is auto-resolved from their profile. |
    | `include_inactive` | boolean | No | When `true`, inactive posts are included. Default: `false` (active posts only). |
    | `search_text` | string | No | Free-text search across post name and description. |
    | `sort_by` | string | No | Sort column. Values: `name` (default), `priority`, `created_on`. |
    | `sort_dir` | string | No | Sort direction. Values: `asc` (default), `desc`. |
    | `page` | integer | No | Page number, 0-based. Default: `0`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "num_of_pages": 1,
        "num_of_items": 2,
        "posts": [
            {
                "post_id": 1,
                "community_id": 5,
                "community_name": "Sunset Estates",
                "name": "Main Gate",
                "description": "Front entrance guard station",
                "priority": "urgent",
                "shape": "place",
                "location": {"lat": 25.276, "lng": 55.296},
                "equipment": "Radio, Body Camera",
                "permissions":
                {
                    "required_roles": ["Supervisor"],
                    "required_badges": ["Armed"],
                    "required_equipment": ["Radio"]
                },
                "is_active": true,
                "created_by": 1,
                "created_on": "2026-01-15 10:30:00",
                "last_update": null
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `num_of_pages` | integer | Total number of pages available. |
    | `num_of_items` | integer | Total number of posts matching the filters. |
    | `posts` | array | Array of post objects for the current page. |
    | `post_id` | integer | Unique post identifier. |
    | `community_id` | integer | ID of the community this post belongs to. |
    | `community_name` | string | Display name of the community, or `null`. |
    | `name` | string | Post name. |
    | `description` | string | Post description, or `null`. |
    | `priority` | string | Priority level: `urgent`, `important`, `normal`, or `low`. |
    | `shape` | string | Shape: `place`, `circle`, or `line`. |
    | `location` | object | Coordinates object. |
    | `equipment` | string | Required equipment description, or `null`. |
    | `permissions` | object | Scheduling allocation requirements (see Permissions Format below), or `null`. |
    | `is_active` | boolean | Whether the post is currently active. |
    | `created_by` | integer | User ID of the creator. |
    | `created_on` | string | ISO datetime of creation. |
    | `last_update` | string | ISO datetime of last modification, or `null`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |

- **Usage & Flows:**
    Called to populate the post list view in the management portal (SDS 4.2.7). The default view shows only active posts; the user can toggle the `include_inactive` filter to see deactivated posts as well (SDS 4.2.7, item 6). Free-text search (SDS 4.2.7, item 5) filters across post name and description. Officers use this endpoint in the officer app to view their assigned community's posts.

---

### POST Asset/get_post
*Admin or Officer.* Retrieves the full details of a single post by its ID. Officers can only view posts within their own community.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin or Officer session token. |
    | `post_id` | integer | Yes | The ID of the post to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "post":
        {
            "post_id": 1,
            "community_id": 5,
            "community_name": "Sunset Estates",
            "name": "Main Gate",
            "description": "Front entrance guard station",
            "priority": "urgent",
            "shape": "place",
            "location": {"lat": 25.276, "lng": 55.296},
            "equipment": "Radio, Body Camera",
            "permissions":
            {
                "required_roles": ["Supervisor"],
                "required_badges": ["Armed"],
                "required_equipment": ["Radio"]
            },
            "is_active": true,
            "created_by": 1,
            "created_on": "2026-01-15 10:30:00",
            "last_update": null
        }
    }
    ```

    Field descriptions are the same as in `get_posts_list`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 752 | post not found | The specified `post_id` does not exist, has been soft-deleted, or (for officers) belongs to a different community. |

- **Usage & Flows:**
    Called when the user clicks on a post in the map or list view to open its detail panel. Officers see this when viewing their assigned post during shift check-in (SDS 3.11). The consumer app displays post name, location, equipment, permissions, and a link to the associated post order document if one exists (SDS 4.2.6.2).

---

### POST Asset/create_post
*Admin only.* Creates a new post on the community map.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to add the post to. |
    | `name` | string | Yes | Post name. Maximum 60 characters. Must be unique within the community. |
    | `description` | string | No | Description text. Maximum 200 characters. |
    | `priority` | string | No | Priority level. Values: `urgent`, `important`, `normal` (default), `low`. |
    | `shape` | string | No | Shape of the post marker. Values: `place` (default), `circle`, `line`. |
    | `location` | string | Yes | Location JSON string. See Location Formats below. |
    | `equipment` | string | No | Required equipment description for this post. |
    | `permissions` | string | No | Scheduling allocation requirements as a JSON string. See Permissions Format below. |
    | `is_active` | boolean | No | Whether the post is active. Default: `true`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "post_id": 7
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `post_id` | integer | The unique ID of the newly created post. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |
    | 753 | a post with this name already exists | Another active post in the same community already has this name. |
    | 756 | invalid post priority | The provided `priority` is not one of `urgent`, `important`, `normal`, `low`. |
    | 757 | invalid post shape | The provided `shape` is not one of `place`, `circle`, `line`. |
    | 762 | maximum number of map items reached | The community has reached the combined limit for assets, posts, and map zones. |

- **Usage & Flows:**
    Called when the user adds a post on the community map (SDS 4.2.6.2). The process is analogous to adding an asset:
    1. The user marks a location on the map.
    2. A form opens to fill in post name, description, priority, equipment, and permissions.
    3. On success, the post appears on the map and in the post list.

    The permissions field is optional and defines which officers are eligible to be allocated to this post during shift scheduling. It is stored as-is and validated during shift assignment in a future phase.

---

### POST Asset/update_post
*Admin only.* Edits post details. Supports partial updates — only the fields provided are changed.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_id` | integer | Yes | The ID of the post to update. |
    | `name` | string | No | New post name. Maximum 60 characters. Must remain unique within the community. |
    | `description` | string | No | New description. Maximum 200 characters. Send an empty string to clear. |
    | `priority` | string | No | New priority level: `urgent`, `important`, `normal`, `low`. |
    | `shape` | string | No | New shape: `place`, `circle`, `line`. |
    | `location` | string | No | New location JSON string. |
    | `equipment` | string | No | New equipment text. Send an empty string to clear. |
    | `permissions` | string | No | New permissions JSON string. Send an empty string to clear. |
    | `is_active` | boolean | No | Set active status. Use `false` to deactivate a post. |

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
    | 752 | post not found | The specified `post_id` does not exist or has been soft-deleted. |
    | 753 | a post with this name already exists | Another active post in the same community already has the new name. |
    | 756 | invalid post priority | The provided `priority` is not a recognized priority key. |
    | 757 | invalid post shape | The provided `shape` is not one of `place`, `circle`, `line`. |

- **Usage & Flows:**
    Called when the user edits a post from the detail panel or list view (SDS 4.2.7). To deactivate a post that cannot be deleted (because it has shift history), send `is_active: false`. The consumer app should visually distinguish inactive posts in the list (e.g., greyed out or with an "Inactive" badge).

---

### POST Asset/delete_post
*Admin only.* Deletes a post. Posts that have been used in a shift can only be deactivated, not deleted.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `post_id` | integer | Yes | The ID of the post to delete. |

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
    | 752 | post not found | The specified `post_id` does not exist or has already been soft-deleted. |
    | 759 | post has been used in a shift | The post has shift history and cannot be deleted. Use `update_post` with `is_active: false` to deactivate it instead. |

- **Usage & Flows:**
    Called when the user clicks Delete on a post (SDS 4.2.7, item 2). The consumer app should present a confirmation dialog before calling this endpoint. If the server returns `rc: 759`, the consumer should inform the user that the post cannot be deleted because it has been used in a shift, and offer to deactivate it instead.

---

## Endpoints — Map Zones

### POST Asset/get_map_zones
*Admin or Officer.* Retrieves all map zones for a community. Officers automatically see only their assigned community's zones.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin or Officer session token. |
    | `community_id` | integer | Conditional | Required for Admin. Officers' community is auto-resolved from their profile. |
    | `zone_type` | string | No | Filter by zone type: `entry_exit` or `high_priority`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "zones": [
            {
                "zone_id": 1,
                "community_id": 5,
                "community_name": "Sunset Estates",
                "zone_type": "entry_exit",
                "zone_type_name": "Entry/Exit Point",
                "name": "Main Gate",
                "location": {"lat": 25.276, "lng": 55.296},
                "created_by": 1,
                "created_on": "2026-01-15 10:30:00",
                "last_update": null
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `zones` | array | Array of map zone objects. Not paginated; returns all matching zones. |
    | `zone_id` | integer | Unique map zone identifier. |
    | `community_id` | integer | ID of the community this zone belongs to. |
    | `community_name` | string | Display name of the community, or `null`. |
    | `zone_type` | string | Zone type key: `entry_exit` or `high_priority`. |
    | `zone_type_name` | string | Human-readable zone type name. |
    | `name` | string | Zone display name. |
    | `location` | object | Coordinates object. |
    | `created_by` | integer | User ID of the creator. |
    | `created_on` | string | ISO datetime of creation. |
    | `last_update` | string | ISO datetime of last modification, or `null`. |

    Results are sorted by zone type, then by name alphabetically.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |
    | 758 | invalid map zone type | The provided `zone_type` filter is not `entry_exit` or `high_priority`. |

- **Usage & Flows:**
    Called to load map zones for display on the community map (SDS 4.2.6). Entry/exit points and high-priority zones are rendered as distinct overlays. The `zone_type` filter can be used to load only one category at a time if needed by the UI.

---

### POST Asset/create_map_zone
*Admin only.* Creates a new map zone (entry/exit point or high-priority zone).

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to add the zone to. |
    | `zone_type` | string | Yes | Zone type: `entry_exit` or `high_priority`. |
    | `name` | string | Yes | Zone display name. |
    | `location` | string | Yes | Location JSON string. See Location Formats below. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "zone_id": 3
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `zone_id` | integer | The unique ID of the newly created map zone. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |
    | 758 | invalid map zone type | The provided `zone_type` is not `entry_exit` or `high_priority`. |
    | 762 | maximum number of map items reached | The community has reached the combined limit for assets, posts, and map zones. |

- **Usage & Flows:**
    Called when the user adds an entry/exit point or high-priority zone on the community map (SDS 4.2.6). The user marks a location or area on the map, selects the zone type, enters a name, and saves.

---

### POST Asset/update_map_zone
*Admin only.* Edits a map zone. Supports partial updates — only the fields provided are changed.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `zone_id` | integer | Yes | The ID of the map zone to update. |
    | `zone_type` | string | No | New zone type: `entry_exit` or `high_priority`. |
    | `name` | string | No | New zone name. |
    | `location` | string | No | New location JSON string. |

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
    | 754 | map zone not found | The specified `zone_id` does not exist or has been soft-deleted. |
    | 758 | invalid map zone type | The provided `zone_type` is not `entry_exit` or `high_priority`. |

- **Usage & Flows:**
    Called when the user edits a map zone from the map view. The consumer app should pre-populate the edit form with the current zone values from `get_map_zones`.

---

### POST Asset/delete_map_zone
*Admin only.* Soft-deletes a map zone.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `zone_id` | integer | Yes | The ID of the map zone to delete. |

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
    | 754 | map zone not found | The specified `zone_id` does not exist or has already been soft-deleted. |

- **Usage & Flows:**
    Called when the user deletes a map zone from the map view. The consumer app should present a confirmation dialog before calling this endpoint.

---

## Endpoints — Community Map

### POST Asset/upload_community_map
*Admin only.* Uploads or replaces the 2D community map image used as a backdrop for the map view.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The community to upload the map for. |
    | `map_image` | string | Yes | The map image as a base64-encoded string. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "map_image_url": "https://domain/n/abc123.png"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `map_image_url` | string | The URL of the uploaded map image. Use this URL to display the map in the consumer app. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist or has been deleted. |

- **Usage & Flows:**
    Called from the community map management screen (SDS 4.2.6) when the user uploads a 2D map image. If a map already exists, it is replaced. The returned `map_image_url` should be used as the map backdrop. The consumer app should allow the user to set map boundaries after uploading.

---

## Reference

### Location Formats

The `location` parameter is a JSON string whose structure depends on the shape:

**Place (point):**
```json
{
    "lat": 25.276987,
    "lng": 55.296249
}
```

**Circle (area with radius in meters):**
```json
{
    "lat": 25.276987,
    "lng": 55.296249,
    "radius": 100
}
```

**Line (path of connected points):**
```json
{
    "points": [
        {"lat": 25.276, "lng": 55.296},
        {"lat": 25.277, "lng": 55.297}
    ]
}
```

**Polygon (zone boundary):**
```json
{
    "points": [
        {"lat": 25.276, "lng": 55.296},
        {"lat": 25.277, "lng": 55.297},
        {"lat": 25.278, "lng": 55.296},
        {"lat": 25.276, "lng": 55.296}
    ]
}
```

### Permissions Format

The `permissions` field on posts defines scheduling allocation requirements. It is a JSON object with three optional arrays:

```json
{
    "required_roles": ["Supervisor", "Patrol"],
    "required_badges": ["Armed", "First Aid"],
    "required_equipment": ["Radio", "Body Camera"]
}
```

| Key | Type | Description |
|-----|------|-------------|
| `required_roles` | array of strings | Officer roles required for eligibility. |
| `required_badges` | array of strings | Certifications or badges the officer must hold. |
| `required_equipment` | array of strings | Equipment the officer must have available. |

All three keys are optional. When provided, they are used during shift scheduling to filter eligible officers for post assignment (future phase).

### Error Code Reference

| rc | Constant | Message |
|----|----------|---------|
| 103 | ERR_NO_PRIVILEGES | current user does not have privileges |
| 201 | ERR_INVALID_TOKEN | invalid user token |
| 500 | ERR_COMMUNITY_NOT_FOUND | community not found |
| 750 | ERR_ASSET_NOT_FOUND | asset not found |
| 751 | ERR_ASSET_INVALID_TYPE | invalid asset type |
| 752 | ERR_POST_NOT_FOUND | post not found |
| 753 | ERR_POST_NAME_ALREADY_EXISTS | a post with this name already exists in this community |
| 754 | ERR_MAP_ZONE_NOT_FOUND | map zone not found |
| 755 | ERR_ASSET_INVALID_SHAPE | invalid asset shape |
| 756 | ERR_POST_INVALID_PRIORITY | invalid post priority |
| 757 | ERR_POST_INVALID_SHAPE | invalid post shape |
| 758 | ERR_MAP_ZONE_INVALID_TYPE | invalid map zone type |
| 759 | ERR_POST_HAS_SHIFT_HISTORY | post has been used in a shift and cannot be deleted |
| 760 | ERR_ASSET_BATCH_EMPTY | batch asset list is empty |
| 761 | ERR_ASSET_BATCH_LIMIT_EXCEEDED | batch asset list exceeds maximum allowed size |
| 762 | ERR_MAP_ITEM_LIMIT_EXCEEDED | maximum number of map items reached for this community |
| 763 | ERR_ASSET_INVALID_DATE | invalid date format |
