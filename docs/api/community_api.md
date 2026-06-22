# Community API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Community/<endpoint_name>"`.

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

### Communities

A community represents a physical property, neighbourhood, or customer site managed within the platform. Each community has a name, geographic area, optional map and coordinates, and an active/inactive state.

- Communities have a **unique name** constraint — no two active communities may share the same name.
- Communities are created in **active** state by default.
- Deleting a community is a **soft delete** — it is marked as removed but retained for historical reference.
- A community cannot be deleted while it has active officers, residents, or open calls associated with it.
- Officers and residents can be associated with a community at creation time or via update.

### Featured Officer Banner

Each community may have a single featured officer banner displayed to residents in the mobile app. The banner consists of an image and a description. It does not need to represent a specific officer — it is a promotional or informational banner managed by admins.

- Only one banner exists per community at any time.
- Setting a banner when one already exists **updates** the existing banner.
- Setting a banner after it was previously deleted **restores** it with the new content.
- Both image and description are **mandatory** when setting a banner.

---

## Endpoints — Communities

### POST Community/get_communities
*Admin only.* Retrieves the list of all communities, optionally including inactive ones and filtered by a search term.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `include_inactive` | boolean | No | When `true`, inactive communities are included in the results. Default: `false`. |
    | `search_text` | string | No | Free-text search term. Filters communities whose name matches, or that have an associated officer or resident whose name matches. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "communities": [
            {
                "community_id": 1,
                "name": "Sunset Estates",
                "area": "Downtown District",
                "latitude": 25.276987,
                "longitude": 55.296249,
                "location_name": "Main Street",
                "timezone": "Asia/Dubai",
                "map_image_url": "https://domain/n/abc123.png",
                "map_boundaries": "{\"type\":\"Polygon\",\"coordinates\":[...]}",
                "is_active": true,
                "created_on": "2026-01-15 10:30:00",
                "last_update": "2026-02-20 14:00:00"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `community_id` | integer | Unique community identifier. |
    | `name` | string | Community display name. |
    | `area` | string | Area description / address of the neighbourhood. |
    | `latitude` | number | Latitude coordinate of the community. |
    | `longitude` | number | Longitude coordinate of the community. |
    | `location_name` | string | Human-readable location name, or `null`. |
    | `timezone` | string | IANA timezone identifier (e.g., `"Asia/Dubai"`), or `null`. |
    | `map_image_url` | string | URL to the community map image, or `null` if not uploaded. |
    | `map_boundaries` | string | JSON polygon defining map boundaries, or `null`. |
    | `is_active` | boolean | Whether the community is currently active. |
    | `created_on` | string | ISO datetime of creation. |
    | `last_update` | string | ISO datetime of last modification, or `null`. |

    The list is sorted alphabetically by community name. By default, only active communities are returned. Soft-deleted communities are never included.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called by the management portal to populate the Communities / Customers List (SDS 4.2.1). The `include_inactive` parameter maps to the active/inactive filter toggle (SDS 4.2.1.4). The `search_text` parameter supports the free-text search across community names, officer names, and resident names (SDS 4.2.1.4).

---

### POST Community/get_community
*Admin, Officer, or Resident.* Retrieves the full details of a single community by its ID.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `community_id` | integer | Yes | The ID of the community to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "community": {
            "community_id": 1,
            "name": "Sunset Estates",
            "area": "Downtown District",
            "latitude": 25.276987,
            "longitude": 55.296249,
            "location_name": "Main Street",
            "timezone": "Asia/Dubai",
            "map_image_url": "https://domain/n/abc123.png",
            "map_boundaries": "{\"type\":\"Polygon\",\"coordinates\":[...]}",
            "is_active": true,
            "created_on": "2026-01-15 10:30:00",
            "last_update": "2026-02-20 14:00:00"
        }
    }
    ```

    The `community` object contains the same fields described in `get_communities`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | No active community exists with the given `community_id`. |

- **Usage & Flows:**
    Called when opening the community detail view or edit form (SDS 4.2.1.2). Also used by officer and resident apps to retrieve their assigned community details.

---

### POST Community/add_community
*Admin only.* Creates a new community with the specified details and optionally associates officers and residents.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `name` | string | Yes | Community name. Must be unique among active communities. |
    | `area` | string | Yes | Area description — address or neighbourhood boundary description. |
    | `latitude` | number | No | Latitude coordinate. Default: `0`. |
    | `longitude` | number | No | Longitude coordinate. Default: `0`. |
    | `location_name` | string | No | Human-readable location name. |
    | `timezone` | string | No | IANA timezone identifier (e.g., `"Asia/Dubai"`). |
    | `map_image` | string | No | Base64-encoded map image. |
    | `map_boundaries` | string | No | JSON polygon string defining the community boundaries. |
    | `is_active` | boolean | No | Whether the community is active. Default: `true`. |
    | `officers` | array of integers | No | User IDs of officers to associate with this community. |
    | `residents` | array of integers | No | User IDs of residents to associate with this community. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "community_id": 1
    }
    ```

    Returns the generated `community_id` for the newly created community.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | A required parameter (`name` or `area`) is missing or empty. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 501 | a community with this name already exists | Another active community already uses this name. |

- **Usage & Flows:**
    Called from the "Add New Community" modal in the management portal (SDS 4.2.1.1). The `name` and `area` fields are mandatory. Officers and residents can be associated during creation via the multi-select dropdowns (SDS 4.2.1.1). The community is created in active state by default. A previously soft-deleted community's name may be reused.

---

### POST Community/update_community
*Admin only.* Updates one or more fields of an existing community. Only provided fields are modified; omitted fields retain their current values.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The ID of the community to update. |
    | `name` | string | No | New community name. Must be unique among active communities. |
    | `area` | string | No | Updated area description. |
    | `latitude` | number | No | Updated latitude coordinate. |
    | `longitude` | number | No | Updated longitude coordinate. |
    | `location_name` | string | No | Updated location name. |
    | `timezone` | string | No | Updated IANA timezone identifier. |
    | `map_image` | string | No | Base64-encoded replacement map image. Send empty string to clear. |
    | `map_boundaries` | string | No | Updated JSON polygon string for map boundaries. |
    | `is_active` | boolean | No | Set `false` to deactivate or `true` to reactivate the community. |
    | `officers` | array of integers | No | Replacement list of officer user IDs. When provided, **replaces** the entire current officer association — previous officers are unlinked and only the specified IDs are linked. |
    | `residents` | array of integers | No | Replacement list of resident user IDs. When provided, **replaces** the entire current resident association. |

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
    | 500 | community not found | No active community exists with the given `community_id`. |
    | 501 | a community with this name already exists | Another active community already uses the provided `name`. |

- **Usage & Flows:**
    Called from the community edit form (SDS 4.2.1.2). Supports partial updates — only send the fields that changed. The `is_active` toggle implements the activate/deactivate workflow (SDS 4.2.1.2). When `officers` or `residents` arrays are provided, they perform a **full replacement** of the current association list — to add a single officer, the consumer must send the complete desired list including existing associations.

---

### POST Community/delete_community
*Admin only.* Soft-deletes a community. The community is marked as removed but retained for historical reference.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The ID of the community to delete. |

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
    | 500 | community not found | No active community exists with the given `community_id`, or it was already deleted. |
    | 502 | cannot delete community with active officers | The community still has officers associated with it. Remove or reassign them first. |
    | 503 | cannot delete community with active residents | The community still has residents associated with it. Remove or reassign them first. |
    | 504 | cannot delete community with active calls | The community still has open calls. Resolve or close them first. |

- **Usage & Flows:**
    Called from the community management list (SDS 4.2.1.3). The community can only be deleted when it has no active officers, residents, or open calls. If the community has active associations, the consumer should display the appropriate error message and suggest deactivating the community instead. After deletion, the community name becomes available for reuse by a new community.

---

## Endpoints — Featured Officer Banner

### POST Community/get_featured_officer
*Admin, Officer, or Resident.* Retrieves the featured officer banner for a specific community.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token. |
    | `community_id` | integer | Yes | The ID of the community whose banner to retrieve. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "featured_officer": {
            "featured_officer_id": 1,
            "community_id": 1,
            "image_url": "https://domain/n/abc123.png",
            "description": "Officer Smith — Community Hero",
            "created_on": "2026-01-15 10:30:00",
            "last_update": "2026-02-20 14:00:00"
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `featured_officer_id` | integer | Unique banner identifier. |
    | `community_id` | integer | The community this banner belongs to. |
    | `image_url` | string | URL to the banner image. |
    | `description` | string | Banner description text. |
    | `created_on` | string | ISO datetime of creation. |
    | `last_update` | string | ISO datetime of last modification, or `null`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | No active community exists with the given `community_id`. |
    | 506 | featured officer not found | No active banner exists for this community. |

- **Usage & Flows:**
    Called by the resident mobile app to display the featured officer banner on the Officer Information screen (SDS 2.8.3). Also used by the management portal when opening the Featured Officer management view (SDS 4.2.5). If `rc` is `506`, the consumer app should display a default banner design.

---

### POST Community/set_featured_officer
*Admin only.* Creates or updates the featured officer banner for a community. If a banner already exists, it is updated in place. If a banner was previously deleted, it is restored with the new content.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The ID of the community to set the banner for. |
    | `image` | string | Yes | Base64-encoded banner image. |
    | `description` | string | Yes | Banner description text. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "featured_officer_id": 1
    }
    ```

    Returns the `featured_officer_id` of the created or updated banner.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 102 | missing api param | Either `image` or `description` is missing or empty. |
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | No active community exists with the given `community_id`. |

- **Usage & Flows:**
    Called from the Featured Officer management view in the management portal (SDS 4.2.5). Both `image` and `description` are mandatory on every call — the consumer must always send both fields. This endpoint acts as an upsert:
    - **No banner exists:** A new banner is created.
    - **Banner exists:** The existing banner is updated with the new image and description.
    - **Banner was deleted:** The deleted banner is restored with the new content.

---

### POST Community/delete_featured_officer
*Admin only.* Soft-deletes the featured officer banner for a community.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | Yes | The ID of the community whose banner to delete. |

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
    | 500 | community not found | No active community exists with the given `community_id`. |
    | 506 | featured officer not found | No active banner exists for this community (either never created or already deleted). |

- **Usage & Flows:**
    Called from the Featured Officer management view when the admin removes the current banner (SDS 4.2.5). After deletion, `get_featured_officer` will return `rc: 506` and the resident app should display a default banner design. The banner can be recreated later via `set_featured_officer`.

---
