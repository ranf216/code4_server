# Resident API — Integration Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Audience:** Web Application Developers (Admin Portal), Mobile App Developers (Resident App, Officer App)  
**Phase:** 2.2  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Sections 2.7, 3.10, 4.2.3

> **Important:** This document treats the server as a **strict black box**. It describes only what the client application sends and receives. No internal server logic, database schemas, or backend implementation details are included.

---

## 1. General API Conventions

### 1.1 Request Format

All API calls are made via **HTTP POST** to the server's API endpoint. Every request body is a JSON object containing at minimum:

```json
{
    "#request": "Resident/endpoint_name",
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

### 1.3 Access Control

The Resident module has three access levels:

| Access Level | Who | Endpoints |
|---|---|---|
| **Admin** | Management portal users (any admin role) | All management endpoints (`get_residents`, `get_resident`, `add_resident`, `update_resident`, `delete_resident`) |
| **Resident** | Mobile app resident users | Self-service endpoints (`get_my_details`, `update_my_details`) |
| **Officer** | Mobile app officer users | Search endpoint (`search_residents`) |

If a user without the required access attempts to call a restricted endpoint, the server returns `rc: 103` (No privileges).

### 1.4 Common Error Codes

These error codes may be returned by **any** endpoint:

| RC | Meaning | Recommended Action |
|---|---|---|
| 0 | Success | Process the response data |
| 102 | Missing required parameter | Check that all mandatory fields are included in the request |
| 103 | No privileges | The current user does not have permission for this action. Show "Access denied" message. |
| 201 | Invalid token | Redirect to login — the session has expired or was terminated |

### 1.5 Resident Module Error Codes

These error codes are specific to the Resident module:

| RC | Constant | Message | When Returned | Recommended UI Action |
|---|---|---|---|---|
| 540 | `ERR_RESIDENT_NOT_FOUND` | "resident not found" | The specified `user_id` does not match an active resident | Show "Resident not found" error. Refresh the residents list. |
| 542 | `ERR_RESIDENT_ALREADY_EXISTS` | "resident already exists in this community" | Attempting to assign a resident to a community they're already in | Show informational message — no action needed |
| 543 | `ERR_RESIDENT_CANNOT_DELETE` | "resident has activity and cannot be deleted, only deactivated" | `delete_resident` when the resident has previously logged in | **Critical:** Display a dialog explaining that deletion is not possible because the resident has already used the app. Advise the user to deactivate instead (set Active = No via `update_resident`). See Section 2.5.5 for detailed implementation. |

Additional error codes that may be returned by specific endpoints:

| RC | Meaning | When Returned |
|---|---|---|
| 224 | Invalid phone number | The `phone_num` field is empty or invalid |
| 235 | Invalid email address | The `email` field is not a valid email format |
| 240 | Email already exists | Another active user already has this email address |
| 241 | Phone already exists | Another active user already has this phone number |
| 321 | File not found | One or more `new_image_ids` do not correspond to existing uploaded files |
| 500 | Community not found | The specified `community_id` does not exist |
| 505 | Community is not active | The specified community exists but is inactive |

---

## 2. Admin Endpoints (Management Portal)

### 2.1 Get Residents List

Retrieves a list of all residents. Use this to populate the Residents Management table.

**When to use:** On page load of the Residents Management screen. Also call this endpoint when the admin changes filters, performs a search, changes sort order, or after any create/update/delete operation to refresh the list.

#### Request

```json
{
    "#request": "Resident/get_residents",
    "#token": "<admin_token>",
    "community_id": 0,
    "include_inactive": false,
    "search_text": "",
    "sort_by": "",
    "sort_dir": "asc"
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `community_id` | integer | No | `0` | Filter by community. `0` returns all communities. |
| `include_inactive` | boolean | No | `false` | When `true`, includes deactivated residents in results. |
| `search_text` | string | No | `""` | Free-text search across name, email, phone, address, community name. |
| `sort_by` | string | No | `""` | Sort column: `"first_name"`, `"last_name"`, `"community"`, `"created_on"`. Empty = default sort (first name ascending). |
| `sort_dir` | string | No | `"asc"` | Sort direction: `"asc"` or `"desc"`. |

#### Response

```json
{
    "rc": 0,
    "message": "success",
    "residents": [
        {
            "user_id": "a1b2c3d4",
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice@example.com",
            "phone_num": "+15551234567",
            "community_id": 1,
            "community_name": "Sunset Estates",
            "address": "456 Oak Avenue, Unit 2B",
            "vehicles": ["ABC123", "XYZ789"],
            "instructions": "Ring doorbell twice. Dog in backyard.",
            "images": [
                "https://domain/files/n/photo1.jpg",
                "https://domain/files/n/photo2.png"
            ],
            "communication_test": false,
            "is_active": true,
            "created_on": "2026-01-15 10:30:00",
            "last_login": "2026-03-01 08:00:00"
        }
    ],
    "total_count": 42
}
```

| Field | Type | Description |
|---|---|---|
| `user_id` | string | Unique resident identifier |
| `first_name` | string | Resident's first name |
| `last_name` | string | Resident's last name |
| `email` | string | Email address (may be a placeholder — see Section 2.1.1) |
| `phone_num` | string | Mobile phone number (login credential) |
| `community_id` | integer | Assigned community ID, or `null` |
| `community_name` | string | Community name, or `null` |
| `address` | string | Property address |
| `vehicles` | array | Array of vehicle license plate strings. Empty array `[]` if none. |
| `instructions` | string | Special instructions for officers. Empty string `""` if none. |
| `images` | array | Array of property image URLs. Empty array `[]` if none. |
| `communication_test` | boolean | Communication test flag |
| `is_active` | boolean | Whether the resident is currently active |
| `created_on` | string | ISO datetime of registration |
| `last_login` | string | ISO datetime of last app login, or `null` if never logged in |
| `total_count` | integer | Total number of residents in the result set |

#### 2.1.1 Detecting Placeholder Emails

When a resident is created without an email, the server generates a placeholder like `+972501234567@placeholder.local`. The UI should detect emails ending with `@placeholder.local` and display "—" instead.

```javascript
function isPlaceholderEmail(email) {
    return email && email.endsWith("@placeholder.local");
}
```

---

### 2.2 Get Single Resident

Retrieves the full details of a single resident. Use this to pre-populate the Edit Resident modal.

**When to use:** When the admin clicks "Edit" on a resident row. Call this to get the latest data before displaying the edit form.

#### Request

```json
{
    "#request": "Resident/get_resident",
    "#token": "<admin_token>",
    "user_id": "a1b2c3d4"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The resident's unique user ID |

#### Response

```json
{
    "rc": 0,
    "message": "success",
    "resident": {
        "user_id": "a1b2c3d4",
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice@example.com",
        "phone_num": "+15551234567",
        "community_id": 1,
        "community_name": "Sunset Estates",
        "address": "456 Oak Avenue, Unit 2B",
        "vehicles": ["ABC123", "XYZ789"],
        "instructions": "Ring doorbell twice. Dog in backyard.",
        "images": [
            "https://domain/files/n/photo1.jpg",
            "https://domain/files/n/photo2.png"
        ],
        "communication_test": false,
        "is_active": true,
        "created_on": "2026-01-15 10:30:00",
        "last_login": "2026-03-01 08:00:00"
    }
}
```

The `resident` object contains the same fields described in `get_residents`.

#### Error Cases

| RC | Scenario | Recommended Action |
|---|---|---|
| 540 | Resident not found | Show "Resident not found — they may have been deleted." Close modal, refresh list. |

---

### 2.3 Add Resident

Creates a new resident and associates them with a community.

**When to use:** When the admin submits the "Add Resident" form.

#### Request

```json
{
    "#request": "Resident/add_resident",
    "#token": "<admin_token>",
    "first_name": "Alice",
    "last_name": "Johnson",
    "phone_num": "+15551234567",
    "email": "alice@example.com",
    "community_id": 1,
    "address": "456 Oak Avenue, Unit 2B",
    "vehicles": ["ABC123", "XYZ789"],
    "instructions": "Ring doorbell twice.",
    "communication_test": false
}
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `first_name` | string | **Yes** | — | Resident's first name. Cannot be empty. |
| `last_name` | string | No | `""` | Resident's last name |
| `phone_num` | string | **Yes** | — | Mobile phone number. Must be unique across the system. This is the resident's login credential. |
| `email` | string | No | — | Email address. Must be unique if provided. If omitted, a system placeholder is generated. |
| `community_id` | integer | **Yes** | — | Community to assign the resident to. Must be an active community. |
| `address` | string | No | `""` | Resident's property address |
| `vehicles` | array | No | `[]` | Vehicle license plates as an array of strings. Example: `["ABC123", "XYZ789"]` |
| `instructions` | string | No | `""` | Special instructions for officers |
| `communication_test` | boolean | No | `false` | Communication test flag |

**Important notes:**
- **Vehicles** must be sent as a JSON array of strings, even if there's only one: `["ABC123"]`
- **No image upload at creation** — images are added after creation via `update_resident`
- The resident is created in **active** state immediately
- The resident can log in immediately via Phone/OTP using the provided `phone_num`

#### Response (Success)

```json
{
    "rc": 0,
    "message": "success",
    "user_id": "generated_unique_id"
}
```

| Field | Type | Description |
|---|---|---|
| `user_id` | string | The newly created resident's unique identifier. Store this for subsequent operations. |

#### Error Cases

| RC | Field to Highlight | Message to Display |
|---|---|---|
| 224 | Mobile Number | "Please enter a valid mobile number" |
| 235 | Email | "Please enter a valid email address" |
| 240 | Email | "This email is already in use by another user" |
| 241 | Mobile Number | "This phone number is already registered in the system" |
| 500 | Community | "Selected community was not found. Please refresh and try again." |
| 505 | Community | "Selected community is not active. Please choose an active community." |

---

### 2.4 Update Resident

Updates a resident's details. Only include fields you want to change — omitted fields remain unchanged.

**When to use:** When the admin submits the "Edit Resident" form.

#### Request — Partial Update Pattern

**Only include fields that have changed.** Always include `user_id`.

```json
{
    "#request": "Resident/update_resident",
    "#token": "<admin_token>",
    "user_id": "a1b2c3d4",
    "first_name": "Alice",
    "phone_num": "+15559876543",
    "vehicles": ["ABC123", "XYZ789", "NEW001"],
    "is_active": true
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The resident's unique user ID |
| `first_name` | string | No | Updated first name. Ignored if empty. |
| `last_name` | string | No | Updated last name. Send empty string to clear. |
| `phone_num` | string | No | Updated phone number. **⚠️ Triggers session termination.** |
| `email` | string | No | Updated email. Must be unique. |
| `community_id` | integer | No | New community to reassign. `0` or omitted = no change. |
| `address` | string | No | Updated property address |
| `vehicles` | array | No | Updated vehicle plates. Send `[]` to clear all vehicles. |
| `instructions` | string | No | Updated special instructions |
| `new_image_ids` | array | No | File IDs of newly uploaded property images (see Section 2.4.1) |
| `keep_images` | array | No | URLs of existing property images to retain (see Section 2.4.1) |
| `communication_test` | boolean | No | Updated flag value |
| `is_active` | boolean | No | `false` to deactivate (**⚠️ triggers session termination**), `true` to reactivate |

#### 2.4.1 Image Management

Property images are managed using a two-step process:

**Step 1 — Upload new images:**
```json
{
    "#request": "File/upload_file_base64",
    "#token": "<admin_token>",
    "data": "<base64_encoded_image_data>",
    "file_name": "property_photo.jpg"
}
```
Response: `{"rc": 0, "file_id": "file_abc123"}`

**Step 2 — Update resident with image references:**
```json
{
    "#request": "Resident/update_resident",
    "#token": "<admin_token>",
    "user_id": "a1b2c3d4",
    "new_image_ids": ["file_abc123", "file_def456"],
    "keep_images": ["https://domain/files/n/existing_photo.jpg"]
}
```

**Image update logic:**
| `new_image_ids` | `keep_images` | Result |
|---|---|---|
| Not sent | Not sent | Images unchanged |
| `["id1"]` | `["url1", "url2"]` | Final images = url1 + url2 + id1 (resolved) |
| `[]` | `["url1"]` | Only url1 is kept; all others removed |
| `[]` | `[]` | All images cleared |
| `["id1"]` | `[]` | Only the new image from id1 |

**Important:** `keep_images` contains the full **URLs** that were received from `get_resident` in the `images` array. The server resolves these back to file references internally.

#### 2.4.2 Partial Update Implementation Guide

```javascript
let payload = {
    "#request": "Resident/update_resident",
    "#token": token,
    "user_id": resident.user_id
};

if (firstName !== resident.first_name) payload.first_name = firstName;
if (lastName !== resident.last_name) payload.last_name = lastName;
if (phoneNum !== resident.phone_num) payload.phone_num = phoneNum;
if (email !== resident.email) payload.email = email;
if (communityId !== resident.community_id) payload.community_id = communityId;
if (address !== resident.address) payload.address = address;
if (vehiclesChanged) payload.vehicles = currentVehicles;
if (instructionsChanged) payload.instructions = currentInstructions;
if (imagesChanged) {
    payload.new_image_ids = newlyUploadedFileIds;
    payload.keep_images = existingImageUrlsToKeep;
}
if (communicationTest !== resident.communication_test) payload.communication_test = communicationTest;
if (isActive !== resident.is_active) payload.is_active = isActive;
```

#### Response (Success)

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Cases

| RC | Field | Message to Display |
|---|---|---|
| 540 | — | "Resident not found. They may have been deleted. Please refresh the page." |
| 224 | Mobile Number | "Please enter a valid mobile number" |
| 235 | Email | "Please enter a valid email address" |
| 240 | Email | "This email is already in use by another user" |
| 241 | Mobile Number | "This phone number is already registered in the system" |
| 321 | Images | "One or more uploaded images could not be found. Please re-upload and try again." |
| 500 | Community | "Selected community was not found" |
| 505 | Community | "Selected community is not active" |
| 542 | Community | "Resident is already assigned to this community" |

---

### 2.5 Delete Resident

Soft-deletes a resident. **Only possible if the resident has never logged into the app.** If they have logged in, you must deactivate them instead.

**When to use:** When the admin clicks "Delete" on a resident row and confirms the action.

#### Request

```json
{
    "#request": "Resident/delete_resident",
    "#token": "<admin_token>",
    "user_id": "a1b2c3d4"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | **Yes** | The resident's unique user ID |

#### Response (Success)

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Cases

| RC | Scenario | Recommended Action |
|---|---|---|
| 540 | Resident not found | Show "Resident not found." Refresh the list. |
| 543 | Resident has already logged in | **See Section 2.5.5 — Critical Fallback UI** |

#### 2.5.5 Critical — Deletion Blocked Fallback (RC 543)

When the server returns `rc: 543`, it means the resident has already logged into the mobile app at least once. The system prevents deletion to protect data integrity (associated calls, history, etc.).

**Required UI Implementation:**

Replace the deletion confirmation dialog with an informational dialog:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Cannot Delete Resident                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ This resident has already logged into the mobile app and cannot     │
│ be deleted from the system.                                         │
│                                                                     │
│ To remove their access, please set their status to Inactive         │
│ instead. This will immediately log them out and prevent future      │
│ logins while preserving their historical data.                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                              [Close]  [Deactivate Resident]         │
└─────────────────────────────────────────────────────────────────────┘
```

**"Deactivate Resident" button behaviour:**
1. Close this dialog
2. Call `Resident/update_resident` with `user_id` and `is_active: false`
3. On success: Show toast "Resident deactivated" and refresh the list
4. Alternatively: Open the Edit Resident modal with the Active toggle highlighted/focused

---

## 3. Resident Self-Service Endpoints (Mobile App)

These endpoints are used by the **Resident mobile application**. They require a resident session token.

### 3.1 Get My Details

Retrieves the authenticated resident's own profile.

**When to use:** On profile screen load. Also call to refresh after a successful update.

#### Request

```json
{
    "#request": "Resident/get_my_details",
    "#token": "<resident_token>"
}
```

No additional parameters required — the server identifies the resident from the session token.

#### Response

```json
{
    "rc": 0,
    "message": "success",
    "resident": {
        "user_id": "a1b2c3d4",
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice@example.com",
        "phone_num": "+15551234567",
        "community_id": 1,
        "community_name": "Sunset Estates",
        "address": "456 Oak Avenue, Unit 2B",
        "vehicles": ["ABC123", "XYZ789"],
        "instructions": "Ring doorbell twice.",
        "images": [
            "https://domain/files/n/photo1.jpg",
            "https://domain/files/n/photo2.png"
        ],
        "communication_test": false,
        "created_on": "2026-01-15 10:30:00"
    }
}
```

**Note:** The self-service response does NOT include `is_active` or `last_login` fields (admin-only data).

#### Field Editability

| Field | Editable by Resident | Notes |
|---|---|---|
| `first_name` | ✅ Yes | Via `update_my_details` |
| `last_name` | ✅ Yes | Via `update_my_details` |
| `email` | ✅ Yes | Via `update_my_details` |
| `address` | ✅ Yes | Via `update_my_details` |
| `instructions` | ✅ Yes | Via `update_my_details` |
| `images` | ✅ Yes | Via `update_my_details` (upload + keep pattern) |
| `phone_num` | ❌ Read-only | Admin-only (login credential) |
| `community_id` / `community_name` | ❌ Read-only | Admin-only assignment |
| `vehicles` | ❌ Read-only | Admin-only management |
| `communication_test` | ❌ Read-only | Admin-only flag |

---

### 3.2 Update My Details

Allows the resident to update their own editable fields.

**When to use:** When the resident submits their profile edit form.

#### Request

```json
{
    "#request": "Resident/update_my_details",
    "#token": "<resident_token>",
    "first_name": "Alice",
    "last_name": "Johnson-Smith",
    "address": "789 New Street, Apt 5",
    "email": "newemail@example.com",
    "instructions": "Updated: Ring doorbell twice. Gate code is 1234.",
    "new_image_ids": ["file_abc123"],
    "keep_images": ["https://domain/files/n/photo1.jpg"]
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `first_name` | string | No | Updated first name. Ignored if empty string. |
| `last_name` | string | No | Updated last name. Send empty string to clear. |
| `address` | string | No | Updated property address |
| `email` | string | No | Updated email. Must be unique across the system. |
| `instructions` | string | No | Updated special instructions for officers |
| `new_image_ids` | array | No | File IDs of newly uploaded property images |
| `keep_images` | array | No | URLs of existing property images to keep |

**Only include fields that have changed.** Omitted fields remain unchanged.

#### Image Management (Same Pattern as Admin)

1. Upload new images via `File/upload_file_base64` → get `file_id`
2. Send `new_image_ids` with the new file IDs
3. Send `keep_images` with the URLs of existing images to retain (from the `images` array in `get_my_details`)

```javascript
// Example: User added one new photo and kept two existing
let payload = {
    "#request": "Resident/update_my_details",
    "#token": residentToken,
    "new_image_ids": [newlyUploadedFileId],
    "keep_images": [existingImages[0], existingImages[1]]  // URLs from get_my_details
};
```

#### Response (Success)

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Cases

| RC | Message to Display |
|---|---|
| 235 | "Please enter a valid email address" |
| 240 | "This email is already in use" |
| 321 | "Image upload failed. Please try again." |
| 540 | "Profile not found. Please log out and log in again." |

#### What the Resident CANNOT Change

The following fields are **not accepted** by `update_my_details`. If the mobile app sends them, they will be silently ignored:

- ❌ `phone_num` — Admin-only (login credential)
- ❌ `community_id` — Admin-only assignment
- ❌ `vehicles` — Admin-only management
- ❌ `communication_test` — Admin-only flag
- ❌ `is_active` — Admin-only control

---

## 4. Officer Endpoint (Officer Mobile App)

### 4.1 Search Residents

Searches for residents by name, license plate, or address within the officer's assigned community.

**When to use:** When the officer types into the resident search field (e.g., during call creation or service dispatch).

**Critical:** The mobile app does **not** need to send a community ID. The server automatically restricts results to the officer's assigned community based on their session. This is a security boundary enforced server-side — the officer can never see residents from other communities.

#### Request

```json
{
    "#request": "Resident/search_residents",
    "#token": "<officer_token>",
    "search_text": "Johnson"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `search_text` | string | **Yes** | Search term. Matches against first name, last name, property address, and vehicle license plates. |

#### Response

```json
{
    "rc": 0,
    "message": "success",
    "residents": [
        {
            "user_id": "a1b2c3d4",
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
|---|---|---|
| `user_id` | string | Resident's unique identifier |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `phone_num` | string | Phone number (for calling the resident) |
| `address` | string | Property address |
| `vehicles` | array | Vehicle license plates |

**Notes:**
- Results are sorted by first name (alphabetical).
- Only **active** residents are returned.
- If the officer has no assigned community, the response will be an empty `residents` array (not an error).
- The response includes only essential fields needed for officer operations. No images, email, or instructions are included in search results.

#### Searching by Vehicle License Plate

The search term is matched against vehicle plates as well as names and addresses. Partial matches work:

```json
{"search_text": "ABC"}     // Matches resident with vehicle "ABC123"
{"search_text": "123"}     // Matches resident with vehicle "ABC123"
{"search_text": "Oak Ave"} // Matches resident at "456 Oak Avenue, Unit 2B"
```

---

## 5. Session Termination Handling

### 5.1 Admin Actions That Terminate Resident Sessions

The following admin actions via `update_resident` will immediately terminate the resident's active mobile app session:

1. **Changing the phone number** — The resident must re-authenticate with the new number
2. **Deactivating** (`is_active: false`) — The resident is locked out entirely

### 5.2 Mobile App Impact

After session termination, the resident's next API call will receive `rc: 201` (invalid token). The mobile app must:

1. Detect `rc: 201` in the global API response handler
2. Clear local token/session storage
3. Redirect to the OTP login screen
4. Optionally show: *"Your session has ended. Please log in again."*

### 5.3 Detecting "Never Logged In" Status

In the admin portal, residents with `last_login: null` have never used the app. This is relevant for:
- **Deletion eligibility:** Only these residents can be deleted (others must be deactivated)
- **Onboarding status:** Consider showing a "Pending" badge for residents who haven't logged in yet

---

## 6. Important Implementation Notes

### 6.1 Residents Have NO Profile Image

Unlike officers (who have a single profile image), residents do **not** have a profile photo. The `images` field represents **property images** (photos of the residence for officer reference), not a personal avatar.

- ❌ Do NOT display a profile image/avatar for residents
- ✅ Display property images in a gallery/carousel format
- The admin portal and mobile app should both clearly label these as "Property Images"

### 6.2 Vehicles Are an Array

Vehicle license plates are always sent and received as a **JSON array of strings**, even for a single vehicle:

```json
"vehicles": ["ABC123"]           // One vehicle
"vehicles": ["ABC123", "XYZ789"] // Multiple vehicles
"vehicles": []                   // No vehicles (clears all)
```

The UI should provide a dynamic input allowing the admin to add/remove multiple plates.

### 6.3 Placeholder Email Pattern

When a resident is created without an email, the system generates: `<phone_num>@placeholder.local`

Examples:
- `+972501234567@placeholder.local`
- `+15551234567@placeholder.local`

The UI should detect and hide these:
```javascript
const isPlaceholder = email.endsWith("@placeholder.local");
```

### 6.4 Communication Test Flag

This is a boolean flag used for testing the communication system with specific residents. Default is `false`. In the UI:
- Display as a toggle switch in Add/Edit forms
- Display as Yes/No or a toggle in the list table
- The flag has no visible effect in the resident's mobile app

### 6.5 Instructions Field

Special instructions are free-text notes written for officers. Examples:
- "Ring doorbell twice. Dog in backyard."
- "Gate code: 5678. Enter through side gate."
- "Elderly resident — may take time to answer door."

Both the resident (`update_my_details`) and admin (`update_resident`) can edit this field.
