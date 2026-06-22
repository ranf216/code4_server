# Community & Settings — UI Updates Guide

**Document Version:** 1.0  
**Last Updated:** 2026-06-21  
**Audience:** Web Application Developers  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026

> This guide specifies the exact UI changes required across the admin portal to align with the recent API and SDS compliance updates. Each section describes **what** needs to change, **why**, and the **exact API integration** required.

---

## 1. Community Module UI Changes

### 1.1 Mandatory Field Validations

#### 1.1.1 "Add New Community" Form — `Area` Field

**Change Required:** The `Area` text input must now be treated as a **mandatory** field.

**Current behavior:** The `Area` field is optional — the form can be submitted without it.

**New behavior:**
- Mark the `Area` field with a required indicator (e.g., red asterisk `*`).
- Add client-side validation to prevent form submission when `Area` is empty.
- If the admin attempts to submit without `Area`, display an inline validation message: *"Area is required."*
- The server will also reject the request with `rc: 102` if `area` is missing, but client-side validation should prevent this from ever reaching the server.

**API reference:**
```json
{
    "#request": "Community/add_community",
    "name": "...",
    "area": "..."
}
```
Both `name` and `area` are mandatory string parameters. The API definition enforces this at the server level.

**Implementation checklist:**
- [ ] Add required asterisk (`*`) to the `Area` field label
- [ ] Add `required` attribute to the `Area` input element
- [ ] Add client-side empty-check validation before calling `add_community`
- [ ] Show inline error message when validation fails
- [ ] Ensure the "Save" button is disabled until all mandatory fields have values

#### 1.1.2 "Featured Officer" Settings — `Image` Upload Field

**Change Required:** The `Image` upload field in the Featured Officer settings panel must now be **mandatory** when saving a banner.

**Current behavior:** The image upload is optional — the form can be submitted with only the description.

**New behavior:**
- Mark the image upload area with a required indicator (e.g., red asterisk `*` or "Required" label).
- Add client-side validation to prevent submission when no image has been uploaded.
- Display a validation message if the admin clicks "Save" without uploading an image: *"An image is required for the featured officer banner."*
- The `description` field is also mandatory — ensure it is validated the same way.
- The server will reject the request with `rc: 102` if either `image` or `description` is missing.

**API reference:**
```json
{
    "#request": "Community/set_featured_officer",
    "community_id": 1,
    "image": "<base64_encoded_image>",
    "description": "Officer Smith — Community Hero"
}
```
Both `image` and `description` are mandatory string parameters.

**Implementation checklist:**
- [ ] Add required indicator to the image upload component
- [ ] Add required indicator to the description text field
- [ ] Add client-side validation: block submission if image is not uploaded
- [ ] Add client-side validation: block submission if description is empty
- [ ] Show inline error messages for each missing field
- [ ] Disable "Save" button until both fields have values
- [ ] Handle `rc: 102` response gracefully (in case client-side validation is bypassed)

---

### 1.2 Direct Associations in Modals

#### 1.2.1 "Add New Community" Modal — Officers & Residents Selectors

**Change Required:** Add multi-select dropdown components for selecting **Officers** and **Residents** to associate with the new community.

**UI specifications:**

1. **Officers multi-select dropdown:**
    - **Label:** "Officers"
    - **Type:** Multi-select dropdown (e.g., Select2, React Select, or equivalent)
    - **Data source:** Populated from the officer users list API (fetch on modal open)
    - **Display format:** Each option should show the officer's full name (first name + last name)
    - **Selection behavior:** Multiple officers can be selected
    - **Required:** No — this is optional. The community can be created without officers.
    - **Placement:** Below the existing form fields, above the "Save" / "Cancel" buttons

2. **Residents multi-select dropdown:**
    - **Label:** "Residents"
    - **Type:** Multi-select dropdown (same component type as Officers)
    - **Data source:** Populated from the resident users list API (fetch on modal open)
    - **Display format:** Each option should show the resident's full name
    - **Selection behavior:** Multiple residents can be selected
    - **Required:** No — optional.
    - **Placement:** Below the Officers dropdown

**API payload construction:**
When submitting the form, collect the selected IDs into arrays:

```json
{
    "#request": "Community/add_community",
    "#token": "<token>",
    "name": "Riverside Estates",
    "area": "North District",
    "officers": [101, 102, 103],
    "residents": [201, 202]
}
```

- If no officers are selected, omit the `officers` parameter or send `[]`.
- If no residents are selected, omit the `residents` parameter or send `[]`.

**Implementation checklist:**
- [ ] Add Officers multi-select dropdown to the "Add New Community" form
- [ ] Add Residents multi-select dropdown to the "Add New Community" form
- [ ] Fetch officer list on modal open and populate the Officers dropdown
- [ ] Fetch resident list on modal open and populate the Residents dropdown
- [ ] Collect selected IDs into arrays when building the API payload
- [ ] Include `officers` and `residents` arrays in the `add_community` request

#### 1.2.2 "Edit Community" Modal — Officers & Residents Selectors

**Change Required:** Add the same multi-select dropdowns as in the "Add" modal, with **pre-selection** of currently assigned officers and residents.

**UI specifications:**

1. **Officers multi-select dropdown:**
    - Same component as in the "Add" modal
    - **Pre-selected values:** On modal open, pre-select the officers currently assigned to this community
    - **Data source:** Full officer list (so the admin can add new ones or remove existing)

2. **Residents multi-select dropdown:**
    - Same component and behavior as Officers
    - **Pre-selected values:** Currently assigned residents

**Important — Replacement semantics:**
When the admin modifies the officer or resident selections and clicks "Save," the API **replaces the entire list** with the new selection. The admin should be aware that:
- Removing an officer from the multi-select will unassign them from the community.
- Adding a new officer will assign them to the community.
- Officers not in the new list will be unassigned.

**API payload construction:**
Only include `officers`/`residents` in the payload if the selections were **modified** by the admin:

```json
{
    "#request": "Community/update_community",
    "#token": "<token>",
    "community_id": 42,
    "officers": [101, 104],
    "residents": [201, 202, 205]
}
```

> **Critical:** If the admin did NOT change the officer/resident selections, do NOT include those parameters in the request. Including an empty array or the unchanged list would cause unnecessary server operations.

**Implementation checklist:**
- [ ] Add Officers multi-select dropdown to the "Edit Community" form
- [ ] Add Residents multi-select dropdown to the "Edit Community" form
- [ ] On modal open, fetch the full officer/resident lists for dropdown options
- [ ] On modal open, fetch currently assigned officers/residents and pre-select them
- [ ] Track whether the admin modified the selections (dirty flag)
- [ ] Only include `officers`/`residents` in the API payload if selections changed
- [ ] Collect selected IDs into arrays when building the `update_community` payload

---

### 1.3 Server-Side Search Integration

#### 1.3.1 Communities List Page — Free-Text Search Bar

**Change Required:** The search bar on the Communities list page must switch from **client-side filtering** to **server-side search** using the new `search_text` API parameter.

**Current behavior:** The search bar filters the already-loaded communities list in the browser using JavaScript string matching against community names.

**New behavior:**
- When the admin types in the search bar, the UI should call the `get_communities` API with the `search_text` parameter.
- The server performs the search across community names, officer names, and resident names — data that may not be available client-side.
- The UI must replace the current table data with the server's response.

**UI specifications:**

1. **Debounce:** Apply a debounce delay (recommended: 300–500ms) to avoid excessive API calls while the admin is typing.

2. **Minimum characters:** Optionally require a minimum of 2–3 characters before triggering the search. Clearing the search bar (empty string) should reload the full unfiltered list.

3. **Loading indicator:** Show a spinner or loading state in the table while the API call is in progress.

4. **No client-side filtering:** Remove any existing client-side filter logic for the search bar. The server's response is the definitive filtered result.

5. **Preserve filters:** When searching, maintain the current state of the "Include Inactive" checkbox and pass it along with `search_text`.

**API call pattern:**
```javascript
// Debounced search handler
function onSearchInput(searchText)
{
    const payload = {
        "#request": "Community/get_communities",
        "#token": token,
        "search_text": searchText,
        "include_inactive": includeInactiveCheckbox.checked
    };

    const response = await callAPI(payload);
    if (response)
    {
        replaceTableData(response.communities);
    }
}
```

**What the server searches:**
The `search_text` parameter matches against:
- Community names (e.g., searching "River" matches "Riverside Estates")
- First and last names of officers assigned to communities
- First and last names of residents assigned to communities

A community appears in results if **any** of these match. This is a significant improvement over client-side filtering because the client typically does not have officer/resident names loaded in the communities list view.

**Implementation checklist:**
- [ ] Remove existing client-side search/filter logic from the Communities list page
- [ ] Add debounced `input` event handler on the search bar (300–500ms delay)
- [ ] On each debounced input, call `Community/get_communities` with `search_text` and current `include_inactive` state
- [ ] Replace table data with the API response
- [ ] Add loading indicator during API call
- [ ] Handle empty search (clear the `search_text` parameter to get full list)
- [ ] Test: verify that searching for an officer's name returns the officer's assigned community

---

### 1.4 Deletion Error Handling Workflow

#### 1.4.1 Community Deletion — Server-Side Constraint Errors

**Change Required:** Update the community deletion flow to handle the new server-side error codes `502`, `503`, and `504`.

**Current behavior:** The UI may perform client-side checks before deletion or simply call the delete API without handling constraint errors.

**New behavior:**
1. Remove any client-side pre-deletion constraint checks (the server is the single source of truth).
2. Call `Community/delete_community` directly after the admin confirms.
3. Handle the response `rc` to determine if deletion succeeded or was blocked.
4. If blocked (`rc: 502`, `503`, or `504`), show a descriptive prompt offering the alternative of **deactivating** the community instead.

**UI flow — detailed specification:**

```
Step 1: Admin clicks the "Delete" button/icon on a community row
        │
        ▼
Step 2: Show confirmation dialog:
        ┌─────────────────────────────────────────────┐
        │  Delete Community                           │
        │                                             │
        │  Are you sure you want to delete            │
        │  "Riverside Estates"?                       │
        │  This action cannot be undone.              │
        │                                             │
        │              [Cancel]  [Delete]             │
        └─────────────────────────────────────────────┘
        │
        ▼ (Admin clicks "Delete")
Step 3: Call API:
        POST { "#request": "Community/delete_community",
               "community_id": <id> }
        │
        ├── rc: 0 → Success
        │   → Close dialog
        │   → Show success toast: "Community deleted successfully"
        │   → Refresh communities list
        │
        ├── rc: 500 → Community not found
        │   → Show error: "Community not found. It may have already been deleted."
        │   → Refresh communities list
        │
        ├── rc: 502 → Active officers exist
        │   → Show constraint prompt (see below)
        │
        ├── rc: 503 → Active residents exist
        │   → Show constraint prompt (see below)
        │
        └── rc: 504 → Active calls exist
            → Show constraint prompt (see below)
```

**Constraint error prompt (for RC 502, 503, 504):**

```
┌─────────────────────────────────────────────────────────┐
│  Cannot Delete Community                                │
│                                                         │
│  ⚠ "Riverside Estates" cannot be deleted because it     │
│  has active [officers/residents/calls].                  │
│                                                         │
│  You can deactivate the community instead, which will   │
│  prevent new activity while preserving existing data.   │
│                                                         │
│              [Cancel]  [Deactivate Community]            │
└─────────────────────────────────────────────────────────┘
```

The message should be specific to the error code:
- **RC 502:** "...has active officers assigned to it."
- **RC 503:** "...has active residents assigned to it."
- **RC 504:** "...has open calls that have not been resolved."

**Deactivation action:**
If the admin clicks **[Deactivate Community]**, call the update API:

```json
{
    "#request": "Community/update_community",
    "#token": "<token>",
    "community_id": 42,
    "is_active": false
}
```

On success (`rc: 0`):
- Close the prompt
- Show success toast: "Community deactivated successfully"
- Refresh the communities list

**Implementation checklist:**
- [ ] Remove any client-side pre-deletion checks for officer/resident/call associations
- [ ] Implement the two-step deletion dialog (confirm → call API)
- [ ] Handle `rc: 502` — show "active officers" constraint prompt with deactivate option
- [ ] Handle `rc: 503` — show "active residents" constraint prompt with deactivate option
- [ ] Handle `rc: 504` — show "active calls" constraint prompt with deactivate option
- [ ] Implement the deactivation action (call `update_community` with `is_active: false`)
- [ ] Handle `rc: 500` — show "not found" message and refresh list
- [ ] Test: attempt to delete a community with assigned officers and verify prompt appears

---

## 2. Settings Module UI Changes

### 2.1 Asset Types Form

#### 2.1.1 Add/Edit Asset Type — `Icon` and `Color` Fields

**Change Required:** The "Add Asset Type" and "Edit Asset Type" forms must include an **icon upload** component and a **color picker/text input**. Both fields are **mandatory**.

**New fields:**

1. **Icon upload component:**
    - **Label:** "Icon" with required indicator (`*`)
    - **Type:** File upload (image) — the uploaded file must be processed through the File API first, then the returned `file_id` is sent in the asset type request
    - **Upload flow:**
        1. Admin selects an image file
        2. Upload via `File/upload_file_base64` API
        3. Receive `file_id` in the response
        4. Include `file_id` as the `icon` parameter in the asset type request
    - **Display:** Show a thumbnail preview of the uploaded image
    - **Required:** **Yes** — form cannot be submitted without an icon

2. **Color input:**
    - **Label:** "Color" with required indicator (`*`)
    - **Type:** Color picker component OR text input accepting hex color codes (e.g., `#FF5733`)
    - **Validation:** Must be a valid hex color code
    - **Display:** Show a color swatch preview next to the input
    - **Required:** **Yes** — form cannot be submitted without a color

**API payloads:**

Add Asset Type:
```json
{
    "#request": "Settings/add_asset_type",
    "#token": "<token>",
    "name": "Security Camera",
    "icon": "<file_id_from_upload>",
    "color": "#FF5733"
}
```

Update Asset Type:
```json
{
    "#request": "Settings/update_asset_type",
    "#token": "<token>",
    "type_id": "security_camera",
    "name": "Security Camera HD",
    "icon": "<file_id_from_upload>",
    "color": "#3366FF"
}
```

**Reading existing values:**
When editing, call `Settings/get_asset_types` to retrieve current values. Each item includes:
- `icon` — URL string of the current icon image (or `null` if not set)
- `color` — hex color string (or `null` if not set)

**Implementation checklist:**
- [ ] Add icon upload component to the Add Asset Type form
- [ ] Add icon upload component to the Edit Asset Type form
- [ ] Implement file upload flow via File API to get `file_id`
- [ ] Add color picker/text input to both forms
- [ ] Mark both fields as required with validation
- [ ] Show thumbnail preview for the icon
- [ ] Show color swatch preview for the color
- [ ] Include `icon` and `color` in the API payloads
- [ ] Pre-populate icon preview and color on the Edit form from existing data
- [ ] Validate hex color format client-side

---

### 2.2 Post Order Section Types Form

#### 2.2.1 Add/Edit Post Order Section Type — `Short Description` and `Active` Fields

**Change Required:** Add a **short description** text input and an **active status** toggle to the Post Order Section Type forms.

**New fields:**

1. **Short Description:**
    - **Label:** "Short Description" with required indicator (`*`)
    - **Type:** Single-line text input or small textarea
    - **Purpose:** Brief description of what this section type covers
    - **Required:** **Yes** — mandatory parameter

2. **Active toggle:**
    - **Label:** "Active"
    - **Type:** Toggle switch or checkbox
    - **Purpose:** Controls whether this section type is available for use in post orders
    - **Default:** `true` (active) for new section types
    - **Required:** **Yes** — mandatory parameter

**API payloads:**

Add Post Order Section Type:
```json
{
    "#request": "Settings/add_po_section_type",
    "#token": "<token>",
    "name": "Vehicle Patrol Procedures",
    "client_visible": true,
    "short_description": "Instructions for conducting vehicle-based security patrols",
    "active": true
}
```

Update Post Order Section Type:
```json
{
    "#request": "Settings/update_po_section_type",
    "#token": "<token>",
    "type_id": "vehicle_patrol_procedures",
    "name": "Vehicle Patrol Procedures",
    "client_visible": true,
    "short_description": "Updated patrol instructions for vehicle-based routes",
    "active": true
}
```

**Reading existing values:**
When editing, the `Settings/get_po_section_types` response includes:
- `short_description` — current description text (or `null` if not previously set)
- `active` — boolean indicating current active status (defaults to `true` if not previously set)

**Implementation checklist:**
- [ ] Add "Short Description" text input to the Add Post Order Section Type form
- [ ] Add "Short Description" text input to the Edit Post Order Section Type form
- [ ] Add "Active" toggle switch to both forms
- [ ] Mark "Short Description" as required with validation
- [ ] Default the "Active" toggle to `true` for new section types
- [ ] Include `short_description` and `active` in the API payloads
- [ ] Pre-populate both fields on the Edit form from existing data
- [ ] Handle `null` values for `short_description` (display as empty) and `active` (treat as `true`)

---

### 2.3 Push Notifications Settings

#### 2.3.1 Notification Settings — `Notification Title` Field

**Change Required:** Add a text input field for the admin to define a custom **notification title** that is displayed in push notifications.

**New field:**

1. **Notification Title:**
    - **Label:** "Notification Title"
    - **Type:** Single-line text input
    - **Purpose:** Defines the title text shown in push notifications sent to officers and residents
    - **Default:** Empty string (server will use a system default if not set)
    - **Required:** No — optional field
    - **Placement:** In the Push Notifications settings section, near the existing "Sender Name" field

**API payload:**

Update Notification Settings:
```json
{
    "#request": "Settings/update_notification_settings",
    "#token": "<token>",
    "notification_title": "Code4 Axis Security Alert",
    "sender_name": "Code4 Command Center",
    "new_call_enabled": true,
    "call_accepted_enabled": true
    ...
}
```

**Reading existing value:**
When loading the notification settings page, call `Settings/get_notification_settings`. The response includes:
- `notification_title` — current title text (empty string if not set)

**UI layout recommendation:**
Place the "Notification Title" input alongside the existing "Sender Name" field, as they both control how push notifications appear to recipients:

```
┌─ Push Notification Appearance ──────────────────────┐
│                                                     │
│  Notification Title:  [_________________________]   │
│  Sender Name:         [_________________________]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Implementation checklist:**
- [ ] Add "Notification Title" text input to the Push Notifications settings form
- [ ] Include `notification_title` in the `update_notification_settings` API payload
- [ ] Pre-populate the field from `get_notification_settings` response on page load
- [ ] Handle empty/null value (display as empty input, allow admin to set or clear)
- [ ] Position near the "Sender Name" field for logical grouping

---

## 3. Summary of All UI Changes

### Community Module

| Screen | Change | Priority | API Endpoint |
|---|---|---|---|
| Add Community modal | Make `Area` field mandatory | **High** | `Community/add_community` |
| Add Community modal | Add Officers multi-select dropdown | **High** | `Community/add_community` |
| Add Community modal | Add Residents multi-select dropdown | **High** | `Community/add_community` |
| Edit Community modal | Add Officers multi-select dropdown (pre-selected) | **High** | `Community/update_community` |
| Edit Community modal | Add Residents multi-select dropdown (pre-selected) | **High** | `Community/update_community` |
| Communities list page | Replace client-side search with server-side `search_text` | **High** | `Community/get_communities` |
| Community deletion flow | Handle RC 502/503/504 with deactivation prompt | **High** | `Community/delete_community` |
| Featured Officer panel | Make `Image` upload mandatory | **High** | `Community/set_featured_officer` |
| Featured Officer panel | Make `Description` field mandatory | **High** | `Community/set_featured_officer` |

### Settings Module

| Screen | Change | Priority | API Endpoint |
|---|---|---|---|
| Add/Edit Asset Type form | Add mandatory `Icon` upload component | **High** | `Settings/add_asset_type`, `Settings/update_asset_type` |
| Add/Edit Asset Type form | Add mandatory `Color` picker/input | **High** | `Settings/add_asset_type`, `Settings/update_asset_type` |
| Add/Edit PO Section Type form | Add mandatory `Short Description` input | **High** | `Settings/add_po_section_type`, `Settings/update_po_section_type` |
| Add/Edit PO Section Type form | Add `Active` toggle switch | **High** | `Settings/add_po_section_type`, `Settings/update_po_section_type` |
| Push Notifications settings | Add `Notification Title` text input | **Medium** | `Settings/update_notification_settings` |

---

## 4. Testing Checklist

### Community Module Tests

- [ ] **Add Community:** Verify `Area` field validation — submit without area, expect client-side error
- [ ] **Add Community:** Verify officers/residents dropdowns appear and are populated
- [ ] **Add Community:** Create community with officers/residents selected, verify they are assigned
- [ ] **Edit Community:** Verify pre-selection of currently assigned officers/residents
- [ ] **Edit Community:** Modify officer selections, save, verify the list is replaced
- [ ] **Edit Community:** Do NOT modify selections, save, verify no changes to associations
- [ ] **Search:** Type in search bar, verify API call with `search_text` parameter
- [ ] **Search:** Search for an officer name, verify the officer's community appears in results
- [ ] **Search:** Clear search, verify full list is restored
- [ ] **Search:** Verify no client-side filtering is applied
- [ ] **Delete:** Delete a community with no associations → expect success
- [ ] **Delete:** Delete a community with active officers → expect RC 502, deactivation prompt
- [ ] **Delete:** Delete a community with active residents → expect RC 503, deactivation prompt
- [ ] **Delete:** Click "Deactivate" in the constraint prompt → verify community becomes inactive
- [ ] **Featured Officer:** Try saving without image → expect validation error
- [ ] **Featured Officer:** Try saving without description → expect validation error
- [ ] **Featured Officer:** Save with both fields → expect success

### Settings Module Tests

- [ ] **Asset Type:** Try adding without icon → expect validation error
- [ ] **Asset Type:** Try adding without color → expect validation error
- [ ] **Asset Type:** Add with icon and color → verify both are saved and displayed
- [ ] **Asset Type:** Edit — verify icon preview and color swatch load from existing data
- [ ] **PO Section Type:** Try adding without short_description → expect validation error
- [ ] **PO Section Type:** Add with short_description and active=true → verify saved
- [ ] **PO Section Type:** Edit — verify short_description and active toggle pre-populate
- [ ] **PO Section Type:** Toggle active to false, save, verify status changes
- [ ] **Notifications:** Verify notification_title input appears on settings page
- [ ] **Notifications:** Set a title, save, reload page, verify title persists
