# Resident API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Resident/<endpoint_name>"`.

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

### Residents

Residents are community members (clients) who use the mobile application to request services, create emergency calls, and interact with officers. They are managed by admins through the management portal.

- Residents authenticate exclusively via **Phone/OTP** (one-time password sent to their mobile number). They do not use email/password login.
- Each resident is associated with exactly **one community** at a time. Community reassignment is admin-only.
- Residents are created in **active** state by default.
- Deleting a resident is a **soft delete** — only permitted if the resident has never logged in to the app. Residents who have logged in must be deactivated instead.
- Changing a resident's phone number or deactivating them **terminates their active session**, forcing re-authentication.

### Property Images

Residents can have property images associated with their profile. These are uploaded separately via the File API (`File/upload_file_base64` or multipart upload), which returns file IDs. The update endpoints then receive the file IDs of newly uploaded images and URLs of existing images to keep.

- Images are managed by both admins (`update_resident`) and residents themselves (`update_my_details`).
- There is no server-enforced limit on the number of images; the client application controls the maximum.
- Get endpoints return images as an array of full URLs.

### Vehicles

Residents can register vehicle license plates. These are stored as an array of strings. There is no server-enforced limit on the number of vehicles.

---

## Endpoints — Admin Resident Management

### POST Resident/get_residents
*Admin only.* Retrieves the list of all residents with optional filters, search, and sorting.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `community_id` | integer | No | Filter by community. `0` or omitted returns all communities. |
    | `include_inactive` | boolean | No | When `true`, inactive residents are included. Default: `false`. |
    | `search_text` | string | No | Free-text search across first name, last name, email, phone number, address, and community name. |
    | `sort_by` | string | No | Sort column. Accepted values: `first_name`, `last_name`, `community`, `created_on`. Default: `first_name`. |
    | `sort_dir` | string | No | Sort direction: `asc` or `desc`. Default: `asc`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "residents": [
            {
                "user_id": "abc123",
                "first_name": "Alice",
                "last_name": "Johnson",
                "email": "alice@example.com",
                "phone_num": "+15551234567",
                "community_id": 1,
                "community_name": "Sunset Estates",
                "address": "456 Oak Avenue, Unit 2B",
                "vehicles": ["ABC123", "XYZ789"],
                "instructions": "Ring doorbell twice.",
                "images": ["https://domain/files/n/img1.jpg", "https://domain/files/n/img2.jpg"],
                "communication_test": false,
                "is_active": true,
                "created_on": "2026-01-15 10:30:00",
                "last_login": "2026-03-01 08:00:00"
            }
        ],
        "total_count": 1
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | Unique resident identifier. |
    | `first_name` | string | Resident's first name. |
    | `last_name` | string | Resident's last name. |
    | `email` | string | Resident's email address. |
    | `phone_num` | string | Mobile phone number (used for OTP login). |
    | `community_id` | integer | ID of the assigned community, or `null`. |
    | `community_name` | string | Name of the assigned community, or `null`. |
    | `address` | string | Resident's property address. |
    | `vehicles` | array of strings | List of vehicle license plates. Empty array if none. |
    | `instructions` | string | Special instructions for officers. Empty string if none. |
    | `images` | array of strings | URLs of property images. Empty array if none. |
    | `communication_test` | boolean | Whether communication test flag is set. |
    | `is_active` | boolean | Whether the resident is currently active. |
    | `created_on` | string | ISO datetime of registration. |
    | `last_login` | string | ISO datetime of last app login, or `null` if never logged in. |
    | `total_count` | integer | Total number of residents in the result set. |

    The list is sorted by first name ascending by default. By default, only active residents are returned. Soft-deleted residents are never included.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |

- **Usage & Flows:**
    Called by the management portal to populate the Residents List (SDS 2.7). The `include_inactive` parameter maps to the active/inactive filter toggle. The `community_id` parameter implements the community name filter. The `search_text` parameter supports free-text search across all displayed columns. The `sort_by` and `sort_dir` parameters allow column-based sorting.

---

### POST Resident/get_resident
*Admin only.* Retrieves the full details of a single resident.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The resident's unique user ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "resident":
        {
            "user_id": "abc123",
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice@example.com",
            "phone_num": "+15551234567",
            "community_id": 1,
            "community_name": "Sunset Estates",
            "address": "456 Oak Avenue, Unit 2B",
            "vehicles": ["ABC123", "XYZ789"],
            "instructions": "Ring doorbell twice.",
            "images": ["https://domain/files/n/img1.jpg"],
            "communication_test": false,
            "is_active": true,
            "created_on": "2026-01-15 10:30:00",
            "last_login": "2026-03-01 08:00:00"
        }
    }
    ```

    The `resident` object contains all fields described in `get_residents`.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 540 | resident not found | No active resident exists with the given `user_id`. |

- **Usage & Flows:**
    Called when opening the resident detail or edit form in the management portal (SDS 2.7.1).

---

### POST Resident/add_resident
*Admin only.* Creates a new resident and associates them with a community.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `first_name` | string | Yes | Resident's first name. |
    | `last_name` | string | No | Resident's last name. |
    | `phone_num` | string | Yes | Mobile phone number (must be unique across the system). Used for OTP login. |
    | `email` | string | No | Email address (must be unique if provided). |
    | `community_id` | integer | Yes | ID of the community to associate the resident with. |
    | `address` | string | No | Resident's property address. |
    | `vehicles` | array of strings | No | Vehicle license plates. |
    | `instructions` | string | No | Special instructions for officers. |
    | `communication_test` | boolean | No | Communication test flag. Default: `false`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "user_id": "generated_unique_id"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | The newly created resident's unique user ID. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 224 | invalid phone number | Phone number is empty or invalid. |
    | 235 | invalid email address | Email format is invalid (when provided). |
    | 240 | user with this email already exists | The email is already in use by another active user. |
    | 241 | user with this phone already exists | The phone number is already in use by another active user. |
    | 500 | community not found | No active community exists with the given `community_id`. |
    | 505 | community is not active | The specified community exists but is not active. |

- **Usage & Flows:**
    Called from the management portal when an admin adds a new resident to a community (SDS 2.7.1). The resident is immediately created in active state and can begin using the mobile app via Phone/OTP login. No initial images are set during creation — they are added via `update_resident` afterward using the File API upload flow.

---

### POST Resident/update_resident
*Admin only.* Updates a resident's details. Only provided fields are changed; omitted fields remain unchanged.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The resident's unique user ID. |
    | `first_name` | string | No | Updated first name (ignored if empty). |
    | `last_name` | string | No | Updated last name. Set to empty string to clear. |
    | `phone_num` | string | No | Updated phone number (must be unique; triggers session termination). |
    | `email` | string | No | Updated email address (must be unique). |
    | `community_id` | integer | No | New community ID to reassign. `0` or omitted means no change. |
    | `address` | string | No | Updated property address. |
    | `vehicles` | array of strings | No | Updated vehicle plates. Send empty array to clear. |
    | `instructions` | string | No | Updated instructions. |
    | `new_image_ids` | array of strings | No | File IDs of newly uploaded property images (from `File/upload_file_base64` or multipart upload). |
    | `keep_images` | array of strings | No | URLs of existing property images to keep. Images not in this list are removed from the resident's profile. |
    | `communication_test` | boolean | No | Updated communication test flag. |
    | `is_active` | boolean | No | Set to `false` to deactivate (terminates session), `true` to reactivate. |

    **Image update logic:** If neither `new_image_ids` nor `keep_images` is provided, images remain unchanged. If either is provided, the final image list becomes: resolved images from `keep_images` + resolved images from `new_image_ids`. To clear all images, send both as empty arrays.

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
    | 235 | invalid email address | Email format is invalid. |
    | 240 | user with this email already exists | The new email is already in use. |
    | 241 | user with this phone already exists | The new phone number is already in use. |
    | 321 | file not found | One or more `new_image_ids` do not correspond to existing uploaded files. |
    | 500 | community not found | The target community does not exist. |
    | 505 | community is not active | The target community is not active. |
    | 540 | resident not found | No active resident exists with the given `user_id`. |
    | 542 | resident already exists in this community | The `community_id` matches the resident's current community. |

- **Usage & Flows:**
    Called from the management portal when editing resident details (SDS 2.7.1). Image management workflow: (1) upload images via `File/upload_file_base64`, (2) call `update_resident` with new file IDs and URLs of images to retain. Changing phone number or deactivating triggers session termination — the resident will need to re-authenticate on their next app access.

---

### POST Resident/delete_resident
*Admin only.* Soft-deletes a resident. Only possible if the resident has never logged in; otherwise, deactivation via `update_resident` is required.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The resident's unique user ID. |

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
    | 540 | resident not found | No active resident exists with the given `user_id`. |
    | 543 | resident has activity and cannot be deleted | The resident has logged in at least once. Use deactivation instead. |

- **Usage & Flows:**
    Called from the management portal when an admin removes a recently-added resident who has not yet used the app. Once a resident has logged in, deletion is blocked and the admin must use `update_resident` with `is_active: false` instead.

---

## Endpoints — Resident Self-Service (Mobile)

### POST Resident/get_my_details
*Resident only.* Retrieves the current authenticated resident's own profile details.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A Resident session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "resident":
        {
            "user_id": "abc123",
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice@example.com",
            "phone_num": "+15551234567",
            "community_id": 1,
            "community_name": "Sunset Estates",
            "address": "456 Oak Avenue, Unit 2B",
            "vehicles": ["ABC123", "XYZ789"],
            "instructions": "Ring doorbell twice.",
            "images": ["https://domain/files/n/img1.jpg"],
            "communication_test": false,
            "created_on": "2026-01-15 10:30:00"
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | The resident's own user ID. |
    | `first_name` | string | First name. |
    | `last_name` | string | Last name. |
    | `email` | string | Email address. |
    | `phone_num` | string | Mobile phone number (read-only for the resident). |
    | `community_id` | integer | Assigned community ID (read-only for the resident). |
    | `community_name` | string | Community name (read-only for the resident). |
    | `address` | string | Property address. |
    | `vehicles` | array of strings | Vehicle license plates. |
    | `instructions` | string | Special instructions for officers. |
    | `images` | array of strings | URLs of property images. |
    | `communication_test` | boolean | Communication test flag. |
    | `created_on` | string | ISO datetime of registration. |

    Note: `is_active` and `last_login` are not returned in the self-service endpoint.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |
    | 540 | resident not found | The authenticated user's resident record is not found (edge case). |

- **Usage & Flows:**
    Called by the mobile app to populate the resident's profile/settings screen. Provides all editable fields for display and pre-filling the edit form.

---

### POST Resident/update_my_details
*Resident only.* Allows the resident to update their own editable profile fields. Residents cannot change their phone number or community — those are admin-only.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A Resident session token. |
    | `first_name` | string | No | Updated first name (ignored if empty). |
    | `last_name` | string | No | Updated last name. |
    | `address` | string | No | Updated property address. |
    | `email` | string | No | Updated email (must be unique). |
    | `instructions` | string | No | Updated special instructions for officers. |
    | `new_image_ids` | array of strings | No | File IDs of newly uploaded property images. |
    | `keep_images` | array of strings | No | URLs of existing property images to keep. |

    **Image update logic:** Same as `update_resident` — if neither image parameter is provided, images remain unchanged. To clear all, send both as empty arrays.

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
    | 201 | invalid user token | Invalid or expired token. |
    | 235 | invalid email address | Email format is invalid. |
    | 240 | user with this email already exists | The new email is already in use by another user. |
    | 321 | file not found | One or more `new_image_ids` do not correspond to existing uploaded files. |
    | 540 | resident not found | The authenticated user's resident record is not found (edge case). |

- **Usage & Flows:**
    Called from the mobile app when the resident edits their profile. Image workflow: upload via `File/upload_file_base64`, then call this endpoint with file IDs and URLs of images to retain.

---

## Endpoints — Officer-Facing

### POST Resident/search_residents
*Officer only.* Searches residents within the officer's assigned community by name, license plate, or address.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `search_text` | string | Yes | Search term to match against first name, last name, address, or vehicle plates. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "residents": [
            {
                "user_id": "abc123",
                "first_name": "Alice",
                "last_name": "Johnson",
                "phone_num": "+15551234567",
                "address": "456 Oak Avenue, Unit 2B",
                "vehicles": ["ABC123", "XYZ789"]
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `user_id` | string | Resident's unique identifier. |
    | `first_name` | string | Resident's first name. |
    | `last_name` | string | Resident's last name. |
    | `phone_num` | string | Resident's phone number. |
    | `address` | string | Property address. |
    | `vehicles` | array of strings | Vehicle license plates. |

    Results are strictly limited to the officer's own community. Only active residents are returned. Results are sorted by first name ascending.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Invalid or expired token. |

    If the officer has no assigned community, an empty `residents` array is returned (not an error).

- **Usage & Flows:**
    Called by the officer mobile app when searching for a resident during a service or emergency call (SDS 3.10). The officer types a name, license plate, or address fragment and receives matching residents from their community. The search is scoped to ensure officers only see residents within their own operational area.

---
