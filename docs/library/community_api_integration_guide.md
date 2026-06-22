# Community API — Integration Guide

**Document Version:** 1.0  
**Last Updated:** 2026-06-21  
**Audience:** Web Application Developers  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026

> **Important:** This document treats the server as a **strict black box**. It describes only what the web application sends and receives. No internal server logic, database schemas, or backend implementation details are included.

---

## 1. General API Conventions

### 1.1 Request Format

All API calls are made via **HTTP POST** to the server's API endpoint. Every request body is a JSON object containing at minimum:

```json
{
    "#request": "Community/endpoint_name",
    "#token": "<user_authentication_token>",
    ...additional parameters...
}
```

- **`#request`** — The API endpoint identifier in `ModuleName/method_name` format.
- **`#token`** — The authenticated user's session token obtained from the login flow.

### 1.2 Standard Response Format

Every API response returns a JSON object with at least two fields:

```json
{
    "rc": 0,
    "message": "success"
}
```

- **`rc`** (integer) — The return code. `0` means success. Any non-zero value indicates an error.
- **`message`** (string) — A human-readable message describing the result.

**Additional data fields** are included alongside `rc` and `message` when the endpoint returns data.

### 1.3 Common Error Codes

These error codes may be returned by any endpoint:

| RC | Meaning | Recommended Action |
|---|---|---|
| 0 | Success | Process the response data |
| 102 | Missing required parameter | Check that all mandatory fields are included in the request |
| 103 | No privileges | The current user does not have permission for this action |
| 201 | Invalid token | Redirect to login — the session has expired |

### 1.4 Community-Specific Error Codes

| RC | Meaning | When Returned |
|---|---|---|
| 500 | Community not found | The specified `community_id` does not exist or has been deleted |
| 501 | Community name already exists | Another active community already uses this name |
| 502 | Cannot delete — active officers | The community has officers currently assigned to it |
| 503 | Cannot delete — active residents | The community has residents currently assigned to it |
| 504 | Cannot delete — active calls | The community has open/unresolved calls |
| 505 | Community is not active | The community is deactivated |
| 506 | Featured officer not found | No featured officer banner exists for this community |

---

## 2. Community Endpoints

### 2.1 Get Communities List

Retrieves a list of all communities. Use this to populate the Communities list/table page in the admin portal.

**When to use:** On page load of the Communities management screen. Also call this endpoint whenever the admin performs a search, toggling the "include inactive" filter, or after any create/update/delete operation to refresh the list.

#### Request

```json
{
    "#request": "Community/get_communities",
    "#token": "<token>",
    "include_inactive": false,
    "search_text": ""
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `include_inactive` | boolean | No | `false` | Set to `true` to include deactivated communities in the results. By default, only active communities are returned. |
| `search_text` | string | No | `""` | Free-text search query. When provided, the server filters communities whose name matches OR whose associated officer/resident names match the search term. Leave empty or omit to return all communities. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "communities": [
        {
            "community_id": 1,
            "name": "Riverside Estates",
            "area": "North District",
            "latitude": 34.0522000,
            "longitude": -118.2437000,
            "location_name": "123 Main St, Los Angeles, CA",
            "timezone": "America/Los_Angeles",
            "map_image_url": "https://files.example.com/media/abc123.jpg",
            "map_boundaries": "{\"type\":\"Polygon\",\"coordinates\":[...]}",
            "is_active": true,
            "created_on": "2026-01-15 09:30:00",
            "last_update": "2026-03-20 14:15:00"
        },
        ...
    ]
}
```

| Response Field | Type | Description |
|---|---|---|
| `communities` | array | Array of community objects |
| `community_id` | integer | Unique community identifier |
| `name` | string | Community name |
| `area` | string | Area description |
| `latitude` | decimal | GPS latitude (may be `null`) |
| `longitude` | decimal | GPS longitude (may be `null`) |
| `location_name` | string | Formatted address (may be `null`) |
| `timezone` | string | Timezone identifier (may be `null`) |
| `map_image_url` | string | Full URL to the map image (may be `null` or empty) |
| `map_boundaries` | string | JSON polygon string (may be `null`) |
| `is_active` | boolean | Whether the community is currently active |
| `created_on` | string | Creation timestamp (YYYY-MM-DD HH:mm:ss) |
| `last_update` | string | Last modification timestamp (may be `null`) |

#### Search Behavior

The `search_text` parameter triggers a **server-side search**. The server matches the query against:
1. Community names
2. First and last names of officers assigned to the community
3. First and last names of residents assigned to the community

A community is included in the results if **any** of the above match. The search is case-insensitive and supports partial matching (e.g., searching "River" will match "Riverside Estates").

> **Important:** Do NOT implement client-side filtering when `search_text` is used. Always send the search query to the server and use the returned list as-is. The server applies the search across data that may not be present in the client's current view (e.g., associated user names).

---

### 2.2 Get Single Community

Retrieves full details for a specific community. Use this when opening the community detail view or edit form.

**When to use:** When the admin clicks on a community row to view its details, or when opening the "Edit Community" modal.

#### Request

```json
{
    "#request": "Community/get_community",
    "#token": "<token>",
    "community_id": 1
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `community_id` | integer | **Yes** | The community ID to retrieve |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "community": {
        "community_id": 1,
        "name": "Riverside Estates",
        "area": "North District",
        "latitude": 34.0522000,
        "longitude": -118.2437000,
        "location_name": "123 Main St, Los Angeles, CA",
        "timezone": "America/Los_Angeles",
        "map_image_url": "https://files.example.com/media/abc123.jpg",
        "map_boundaries": "{\"type\":\"Polygon\",\"coordinates\":[...]}",
        "is_active": true,
        "created_on": "2026-01-15 09:30:00",
        "last_update": "2026-03-20 14:15:00"
    }
}
```

#### Error Response

| RC | When |
|---|---|
| 500 | The specified `community_id` does not exist |

---

### 2.3 Add Community

Creates a new community. Use this when the admin submits the "Add New Community" form.

**When to use:** When the admin clicks "Save" on the "Add New Community" modal/form. After a successful response, refresh the communities list and optionally navigate to the new community's detail view.

#### Request

```json
{
    "#request": "Community/add_community",
    "#token": "<token>",
    "name": "Riverside Estates",
    "area": "North District",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "location_name": "123 Main St, Los Angeles, CA",
    "timezone": "America/Los_Angeles",
    "map_image": "<base64_encoded_image_data>",
    "map_boundaries": "{\"type\":\"Polygon\",\"coordinates\":[...]}",
    "is_active": true,
    "officers": [101, 102, 103],
    "residents": [201, 202]
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | **Yes** | — | Community name. Must be unique among active communities. |
| `area` | string | **Yes** | — | Area description. **Mandatory** — the server will reject the request if this is missing. |
| `latitude` | decimal | No | `0` | GPS latitude coordinate |
| `longitude` | decimal | No | `0` | GPS longitude coordinate |
| `location_name` | string | No | `""` | Human-readable location/address |
| `timezone` | string | No | `""` | Timezone identifier (e.g., `"America/Los_Angeles"`) |
| `map_image` | string | No | `""` | Base64-encoded map image. Omit or send empty string if no image. |
| `map_boundaries` | string | No | `""` | JSON string representing the map boundary polygon |
| `is_active` | boolean | No | `true` | Whether the community should be active upon creation |
| `officers` | number[] | No | `[]` | Array of officer user IDs to assign to this community |
| `residents` | number[] | No | `[]` | Array of resident user IDs to assign to this community |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "community_id": 42
}
```

| Response Field | Type | Description |
|---|---|---|
| `community_id` | integer | The ID of the newly created community |

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 102 | `name` or `area` is missing | Highlight the missing field(s) and show a validation message |
| 501 | A community with this name already exists | Show "A community with this name already exists" near the name field |

#### Officers & Residents Arrays

The `officers` and `residents` parameters accept arrays of user IDs. These IDs correspond to officer and resident accounts already registered in the system.

**UI implementation:** Use multi-select dropdown components populated from the officer/resident user lists. Collect the selected user IDs into arrays and include them in the request payload.

```json
{
    "officers": [101, 102, 103],
    "residents": [201, 202, 203, 204]
}
```

If no officers or residents should be assigned, omit the parameters entirely or send empty arrays.

---

### 2.4 Update Community

Updates an existing community. Only the fields included in the request are modified — omitted fields remain unchanged.

**When to use:** When the admin clicks "Save" on the "Edit Community" modal/form. After a successful response, refresh the communities list and/or the community detail view.

#### Request

```json
{
    "#request": "Community/update_community",
    "#token": "<token>",
    "community_id": 42,
    "name": "Riverside Estates Updated",
    "area": "South District",
    "officers": [101, 104],
    "residents": [201, 202, 205]
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `community_id` | integer | **Yes** | — | The community ID to update |
| `name` | string | No | `""` | New community name (must be unique if changed) |
| `area` | string | No | `""` | Updated area description |
| `latitude` | decimal | No | `0` | Updated latitude |
| `longitude` | decimal | No | `0` | Updated longitude |
| `location_name` | string | No | `""` | Updated location name |
| `timezone` | string | No | `""` | Updated timezone |
| `map_image` | string | No | `""` | New base64 map image. Send empty string `""` to **clear** the existing image. Omit to keep the current image. |
| `map_boundaries` | string | No | `""` | Updated map boundaries JSON |
| `is_active` | boolean | No | `true` | Updated active status |
| `officers` | number[] | No | `[]` | **Replacement** list of officer user IDs. When provided with at least one ID, the server **replaces** all current officer assignments with this new list. Omit to keep current assignments unchanged. |
| `residents` | number[] | No | `[]` | **Replacement** list of resident user IDs. Same behavior as `officers`. |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 500 | Community not found or was deleted | Show "Community not found" and redirect to the list |
| 501 | Another community already has this name | Show "A community with this name already exists" near the name field |

#### Important: Officers/Residents Replacement Behavior

When you send the `officers` or `residents` parameter with at least one ID, the server performs a **full replacement**:
- All currently assigned officers/residents for this community are unassigned.
- Only the IDs in the new array are assigned.

**Example:** If the community currently has officers `[101, 102, 103]` and you send `officers: [101, 104]`, the result will be that only officers 101 and 104 are assigned. Officer 102 and 103 will be unassigned.

**To keep current assignments unchanged:** Simply omit the `officers`/`residents` parameters from the request entirely.

> **Note:** Sending an empty array `[]` is treated the same as omitting the parameter — no changes are made to the current assignments.

---

### 2.5 Delete Community

Soft-deletes a community. The server performs validation checks before deletion.

**When to use:** When the admin clicks "Delete" on a community and confirms the action in a confirmation dialog. The UI must be prepared to handle specific error codes that indicate why the deletion was blocked.

#### Request

```json
{
    "#request": "Community/delete_community",
    "#token": "<token>",
    "community_id": 42
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `community_id` | integer | **Yes** | The community ID to delete |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses — Deletion Constraints

The server actively validates that no active associations exist before allowing deletion. If any check fails, the server returns a specific error code:

| RC | Meaning | Recommended UI Action |
|---|---|---|
| 500 | Community not found | Show "Community not found" and refresh the list |
| 502 | Community has active officers | Display a message: *"This community cannot be deleted because it has active officers assigned to it. Please reassign or remove all officers before deleting, or consider deactivating the community instead."* |
| 503 | Community has active residents | Display a message: *"This community cannot be deleted because it has active residents assigned to it. Please reassign or remove all residents before deleting, or consider deactivating the community instead."* |
| 504 | Community has active calls | Display a message: *"This community cannot be deleted because it has open calls. Please resolve or close all calls before deleting, or consider deactivating the community instead."* |

#### Recommended Deletion Flow

```
[1] Admin clicks "Delete" button
        │
        ▼
[2] Show confirmation dialog:
    "Are you sure you want to delete [Community Name]?"
        │
        ▼ (Admin confirms)
[3] Call Community/delete_community
        │
        ├─ rc: 0    → Show success toast, refresh communities list
        │
        ├─ rc: 502  → Show prompt: "Cannot delete. Community has active officers.
        │              Consider deactivating the community instead."
        │              [Deactivate] [Cancel]
        │
        ├─ rc: 503  → Show prompt: "Cannot delete. Community has active residents.
        │              Consider deactivating the community instead."
        │              [Deactivate] [Cancel]
        │
        └─ rc: 504  → Show prompt: "Cannot delete. Community has open calls.
                       Consider deactivating the community instead."
                       [Deactivate] [Cancel]
```

If the admin clicks **[Deactivate]** in the prompt, call `Community/update_community` with `is_active: false`:

```json
{
    "#request": "Community/update_community",
    "#token": "<token>",
    "community_id": 42,
    "is_active": false
}
```

---

## 3. Featured Officer Endpoints

Each community can have a single "Featured Officer" banner displayed on the community's dashboard. These endpoints manage that banner.

### 3.1 Get Featured Officer

Retrieves the featured officer banner for a specific community.

**When to use:** When loading the community detail page or the community dashboard to display the featured officer section. If `rc: 506` is returned, the UI should show an empty/placeholder state or a "Set Featured Officer" button.

#### Request

```json
{
    "#request": "Community/get_featured_officer",
    "#token": "<token>",
    "community_id": 1
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `community_id` | integer | **Yes** | The community ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "featured_officer": {
        "featured_officer_id": 10,
        "community_id": 1,
        "image_url": "https://files.example.com/media/officer_banner.jpg",
        "description": "Officer John Smith — 15 years of dedicated service to the Riverside community.",
        "created_on": "2026-02-10 08:00:00",
        "last_update": "2026-05-01 16:30:00"
    }
}
```

| Response Field | Type | Description |
|---|---|---|
| `featured_officer` | object | The featured officer banner data |
| `featured_officer_id` | integer | Unique banner identifier |
| `community_id` | integer | The associated community ID |
| `image_url` | string | Full URL to the banner image |
| `description` | string | Banner description text |
| `created_on` | string | Creation timestamp |
| `last_update` | string | Last modification timestamp (may be `null`) |

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 500 | Community not found | Show "Community not found" and navigate away |
| 506 | No featured officer banner exists | Show empty state with a "Set Featured Officer" button/link |

---

### 3.2 Set Featured Officer

Creates or updates the featured officer banner for a community. If a banner already exists, it is updated. If it was previously deleted, it is restored. If none exists, a new one is created.

**When to use:** When the admin clicks "Save" on the Featured Officer settings panel within the community detail page.

#### Request

```json
{
    "#request": "Community/set_featured_officer",
    "#token": "<token>",
    "community_id": 1,
    "image": "<base64_encoded_image_data>",
    "description": "Officer John Smith — Community Hero of the Month"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `community_id` | integer | **Yes** | The community ID |
| `image` | string | **Yes** | Base64-encoded banner image. **Mandatory** — the server will reject the request without it (RC 102). |
| `description` | string | **Yes** | Banner description text. **Mandatory** — the server will reject the request without it (RC 102). |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "featured_officer_id": 10
}
```

| Response Field | Type | Description |
|---|---|---|
| `featured_officer_id` | integer | The ID of the created or updated banner |

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 102 | `image` or `description` is missing | Highlight the missing field(s) with validation messages |
| 500 | Community not found | Show "Community not found" and navigate away |

#### UI Validation Requirements

Both `image` and `description` are **mandatory**. The UI must:
1. Require the admin to upload an image before the form can be submitted.
2. Require the description text field to be non-empty.
3. Disable the "Save" button until both fields have values.
4. Show clear validation messages if the admin attempts to submit without either field.

---

### 3.3 Delete Featured Officer

Removes the featured officer banner from a community.

**When to use:** When the admin clicks "Remove Banner" or "Delete" on the featured officer section and confirms the action.

#### Request

```json
{
    "#request": "Community/delete_featured_officer",
    "#token": "<token>",
    "community_id": 1
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `community_id` | integer | **Yes** | The community ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | When | Recommended UI Action |
|---|---|---|
| 500 | Community not found | Show "Community not found" and navigate away |
| 506 | No featured officer banner to delete | Show "No featured officer banner exists" info message |

---

## 4. Complete Error Code Reference

### 4.1 Community Error Codes (RC 500–519)

| RC | Constant Name | Description | Affected Endpoints |
|---|---|---|---|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | The community does not exist or has been deleted | All endpoints except `get_communities` |
| 501 | `ERR_COMMUNITY_NAME_ALREADY_EXISTS` | A non-deleted community with this name already exists | `add_community`, `update_community` |
| 502 | `ERR_COMMUNITY_HAS_ACTIVE_OFFICERS` | Deletion blocked — active officers are assigned | `delete_community` |
| 503 | `ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS` | Deletion blocked — active residents are assigned | `delete_community` |
| 504 | `ERR_COMMUNITY_HAS_ACTIVE_CALLS` | Deletion blocked — open/unresolved calls exist | `delete_community` |
| 505 | `ERR_COMMUNITY_IS_NOT_ACTIVE` | The community is deactivated | Reserved for future use |
| 506 | `ERR_FEATURED_OFFICER_NOT_FOUND` | No active featured officer banner for this community | `get_featured_officer`, `delete_featured_officer` |

### 4.2 Standard Error Handling Pattern

Every API response should be checked using a consistent pattern:

```javascript
async function callAPI(payload)
{
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.rc !== 0)
    {
        switch (data.rc)
        {
            case 102:
                showValidationError("Please fill in all required fields: " + data.param);
                break;
            case 103:
                showError("You do not have permission to perform this action.");
                break;
            case 201:
                redirectToLogin();
                break;
            default:
                showError(data.message);
                break;
        }
        return null;
    }

    return data;
}
```

---

## 5. Typical Integration Workflows

### 5.1 Communities List Page

```
Page Load:
    → Call get_communities { include_inactive: <checkbox_state> }
    → Populate table with response.communities

Search:
    → On search input change (debounced):
        → Call get_communities { search_text: <input_value>, include_inactive: <checkbox_state> }
        → Replace table data with response.communities

Toggle "Show Inactive":
    → Call get_communities { include_inactive: <new_state>, search_text: <current_search> }
    → Replace table data

After Create/Update/Delete:
    → Re-call get_communities with current filter state to refresh
```

### 5.2 Add Community Modal

```
Modal Open:
    → Fetch officer list (from Officer module) for multi-select dropdown
    → Fetch resident list (from Resident module) for multi-select dropdown

Form Validation (client-side):
    → name: required, non-empty
    → area: required, non-empty
    → All other fields: optional

Submit:
    → Collect all form values
    → Build officers array: [selected officer IDs]
    → Build residents array: [selected resident IDs]
    → Call add_community with all values
    → On rc: 0 → Close modal, refresh list, show success toast
    → On rc: 501 → Show "Name already exists" error on name field
    → On rc: 102 → Show validation errors for missing fields
```

### 5.3 Edit Community Modal

```
Modal Open:
    → Call get_community { community_id }
    → Populate form with response.community
    → Fetch officer list and pre-select currently assigned officers
    → Fetch resident list and pre-select currently assigned residents

Submit:
    → Collect only changed values
    → Include officers/residents arrays ONLY if the admin changed the selections
    → Call update_community with changed values + community_id
    → On rc: 0 → Close modal, refresh list
    → On rc: 500 → Show "Community not found", close modal, refresh list
    → On rc: 501 → Show "Name already exists" error
```

### 5.4 Delete Community Flow

```
Admin clicks "Delete":
    → Show confirmation dialog
    → On confirm:
        → Call delete_community { community_id }
        → On rc: 0 → Refresh list, show success toast
        → On rc: 502/503/504 → Show constraint error with deactivation option
            → If admin clicks "Deactivate":
                → Call update_community { community_id, is_active: false }
                → Refresh list
```

### 5.5 Featured Officer Management

```
Community Detail Page Load:
    → Call get_featured_officer { community_id }
    → On rc: 0 → Display banner with image and description
    → On rc: 506 → Show "No featured officer" placeholder with "Set" button

Set/Update Banner:
    → Admin uploads image and enters description
    → Validate: both image and description are non-empty
    → Call set_featured_officer { community_id, image: <base64>, description: <text> }
    → On rc: 0 → Refresh the featured officer display

Remove Banner:
    → Admin clicks "Remove"
    → Show confirmation dialog
    → Call delete_featured_officer { community_id }
    → On rc: 0 → Show empty placeholder state
```
