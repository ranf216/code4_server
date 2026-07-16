# Resident Module — UI Updates Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Audience:** Web Application Developers  
**Phase:** 2.2  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Sections 2.7, 4.2.3

> This guide specifies the exact UI changes required in the Management Portal to implement the Residents Management feature. Each section describes **what** needs to be built, **why**, and the **exact API integration** required. Refer to the **Resident API — Integration Guide** for full endpoint documentation, JSON payloads, and error code details.

> **Important Note:** All discrepancies between the SDS Figma mockups and this specification have been resolved via `docs/resident_module_questions.md`. Where the SDS/Figma conflicts with this document, **this document takes precedence** as it reflects the final architectural decisions.

---

## 1. Residents Management List Page

### 1.1 Page Overview

**Location in menu:** Management → Residents (per SDS 4.2.3)

**Access:** Any authenticated admin user can view this page (all admin roles: Super Admin, Manager, Planning, Logistics, Finance).

**Purpose:** Display a table of all residents in the system with search, filter, sort, and CRUD capabilities.

**API on page load:** Call `Resident/get_residents` with default parameters:
```json
{
    "#request": "Resident/get_residents",
    "#token": "<token>",
    "community_id": 0,
    "include_inactive": false,
    "search_text": "",
    "sort_by": "",
    "sort_dir": "asc"
}
```

### 1.2 Table Layout

**SDS Reference (Section 4.2.3):** *"The list is sorted by ABC of the resident's first name. Above the list there is a total number of residents in the table."*

#### Total Count Display

Above the table, display the total count:
- **Format:** `"Total: X residents"` where X is `response.total_count`
- **Position:** Top-left, above the table header row
- **Update:** Refresh after every list reload (search, filter, create, update, delete)

#### Table Columns

| Column Header | Data Field | Type | Sortable | Notes |
|---|---|---|---|---|
| Resident Name | `first_name` + `last_name` | text | Yes (`first_name`, `last_name`) | Display as full name. Default sort column (first name, ascending). |
| Community | `community_name` | text | Yes (`community`) | Display community name. Show "—" if `null`. |
| Mobile | `phone_num` | phone | No | Resident's login phone number |
| Email | `email` | text | No | May be a placeholder — show "—" for `@placeholder.local` emails |
| Address | `address` | text | No | Property address. Truncate long addresses with ellipsis. |
| Registration Date | `created_on` | date | Yes (`created_on`) | Format as locale-appropriate date (e.g., "Jan 15, 2026") |
| Active | `is_active` | badge | No | Display as "Yes" / "No" badge with green/red styling |
| Communication Test | `communication_test` | badge | No | Display as "Yes" / "No" or toggle indicator |
| Vehicles | `vehicles` | tags | No | Display as comma-separated list or chips. Show "—" if empty array. |
| Actions | — | buttons | No | Edit, Delete |

#### 1.2.1 Vehicles Display

The `vehicles` field is an array of strings (license plates). Display options:

**Option A — Comma-Separated (Recommended for space):**
```
ABC123, XYZ789
```

**Option B — Chips/Tags:**
```
[ABC123] [XYZ789]
```

If the array is empty, show "—".

#### 1.2.2 No Image Column

**Critical Resolved Decision:** Unlike the Officer table which has a "Picture" column, the Resident table does **NOT** have a profile image column. Residents do not have profile photos. Their `images` field contains property images which are shown only in the detail/edit view, not in the list table.

#### 1.2.3 Detecting Placeholder Emails

When a resident was created without an email, the server generates a placeholder like `+972501234567@placeholder.local`. The UI should detect emails ending with `@placeholder.local` and display "—" instead.

```javascript
function displayEmail(email) {
    if (!email || email.endsWith("@placeholder.local")) return "—";
    return email;
}
```

#### 1.2.4 Actions Column

Each row should have the following action buttons/icons:

1. **Edit** (pencil icon) — Opens the Edit Resident modal (Section 3)
2. **Delete** (trash icon) — Initiates the deletion flow (Section 5)

### 1.3 Toolbar / Filter Bar

Position above the table, below the page title. Contains:

#### 1.3.1 Add Resident Button

- **Position:** Top-right of the toolbar
- **Label:** "Add Resident" or "+" icon with tooltip
- **Action:** Opens the Add Resident modal (Section 2)

#### 1.3.2 Community Filter Dropdown

- **SDS Requirement (4.2.3):** Filter by community name
- **Type:** Dropdown / select
- **Options:** "All Communities" (default, sends `community_id: 0`) + list of all active communities
- **Data source:** Use the communities list from `Community/get_communities` (or from a cached communities response)
- **Behaviour:** Selecting a community immediately refreshes the residents list with `community_id` set to the selected community's ID

#### 1.3.3 Active/Inactive Toggle

- **Type:** Toggle button, segmented control, or checkbox
- **Options:** "Active Only" (default) / "All" (includes inactive)
- **Behaviour:** Toggling sends `include_inactive: true/false` and refreshes the list

#### 1.3.4 Search Input

- **Type:** Text input with search icon
- **Placeholder:** "Search residents..."
- **Behaviour:** Debounce input (300–500ms). Send `search_text` to the server on each change. Clear button to reset.
- **Server-side search:** The server searches across first name, last name, email, phone, address, and community name. Do NOT implement client-side filtering.

#### 1.3.5 Sort Controls

- **Implementation:** Clickable column headers for sortable columns. Click toggles between ascending/descending.
- **Valid sort values:** `"first_name"`, `"last_name"`, `"community"`, `"created_on"`
- **Visual indicator:** Arrow icon (↑/↓) on the active sort column

---

## 2. Add Resident Modal

### 2.1 Modal Overview

**Trigger:** Click "Add Resident" button in the toolbar.

**Title:** "Add New Resident"

**API endpoint:** `Resident/add_resident`

### 2.2 Form Fields

| Field Label | Parameter | Input Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| First Name | `first_name` | text input | **Yes** | Non-empty | — |
| Last Name | `last_name` | text input | No | — | — |
| Mobile Number | `phone_num` | phone input | **Yes** | Non-empty, phone format | **Login credential.** Display helper text: *"This number will be used for the resident's app login via OTP."* |
| Email | `email` | email input | No | Valid email format (if provided) | — |
| Community | `community_id` | dropdown | **Yes** | Must select a community | Populated from communities list. Only show active communities. |
| Address | `address` | text input / textarea | No | — | Property address. Consider using a larger input for long addresses. |
| Vehicles | `vehicles` | dynamic list input | No | — | See Section 2.3 for implementation details |
| Instructions | `instructions` | textarea | No | — | Special instructions for officers. Multi-line input. |
| Communication Test | `communication_test` | toggle switch | No | — | Default: No/Off. Label: "Communication Test" |

### 2.3 Dynamic Vehicles Input

**Implementation — Tag/Chip Input with Add Button:**

Provide a text input with an "Add" button (or Enter key support). Each entered license plate is added as a removable chip/tag:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Vehicle Numbers                                                      │
│                                                                     │
│ [ABC123 ×] [XYZ789 ×]                                              │
│                                                                     │
│ ┌─────────────────────────────────────┐ ┌─────────┐                │
│ │ Enter license plate...              │ │ + Add   │                │
│ └─────────────────────────────────────┘ └─────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

**Behaviour:**
1. Admin types a license plate number and clicks "Add" (or presses Enter)
2. The plate appears as a chip with an × button to remove
3. The `vehicles` parameter is constructed as an array: `["ABC123", "XYZ789"]`
4. If no vehicles are entered, send `vehicles: []` or omit the field entirely
5. There is **no limit** on the number of vehicles that can be added

### 2.4 Critical — No Profile Image Field

**Resolved Decision:** Residents do **NOT** have a profile image. Do NOT include a photo upload field in the Add Resident form. This is different from the Officer module which has a photo upload.

Property images are added **after** creation via the Edit Resident modal (Section 3).

### 2.5 Form Behaviour

1. **Mandatory field indicators:** Mark First Name, Mobile Number, and Community with a red asterisk (*) or "Required" label.
2. **Submit button:** Disabled until all mandatory fields have values.
3. **On submit:**
   - Show loading indicator
   - Call `Resident/add_resident`
   - On success (`rc: 0`): Close modal, show success toast ("Resident created successfully"), refresh the residents list
   - On error: Show error message inline (see Section 2.6)
4. **Cancel button:** Closes modal without saving.

### 2.6 Error Handling

| RC | Field | Message to Display |
|---|---|---|
| 224 | Mobile Number | "Please enter a valid mobile number" |
| 235 | Email | "Please enter a valid email address" |
| 240 | Email | "This email is already in use by another user" |
| 241 | Mobile Number | "This phone number is already registered in the system" |
| 500 | Community | "Selected community was not found. Please refresh and try again." |
| 505 | Community | "Selected community is not active. Please choose an active community." |

---

## 3. Edit Resident Modal

### 3.1 Modal Overview

**Trigger:** Click "Edit" button on a resident row in the list.

**Title:** "Edit Resident — {First Name} {Last Name}"

**Data Loading:** On modal open, call `Resident/get_resident` with the resident's `user_id`. Pre-populate all fields with the response data.

**API endpoint for save:** `Resident/update_resident`

### 3.2 Form Fields

| Field Label | Parameter | Input Type | Editable | Pre-fill Source | Notes |
|---|---|---|---|---|---|
| First Name | `first_name` | text input | Yes | `resident.first_name` | — |
| Last Name | `last_name` | text input | Yes | `resident.last_name` | — |
| Mobile Number | `phone_num` | phone input | Yes | `resident.phone_num` | **⚠️ See Section 3.3 — Warning Banner** |
| Email | `email` | email input | Yes | `resident.email` | Hide placeholder emails (show empty field instead) |
| Community | `community_id` | dropdown | Yes | `resident.community_id` | — |
| Address | `address` | text input / textarea | Yes | `resident.address` | — |
| Vehicles | `vehicles` | dynamic list input | Yes | `resident.vehicles` | Pre-populate with existing plates as chips |
| Instructions | `instructions` | textarea | Yes | `resident.instructions` | — |
| Communication Test | `communication_test` | toggle switch | Yes | `resident.communication_test` | — |
| Active | `is_active` | toggle switch | Yes | `resident.is_active` | See Section 3.4 |
| Registration Date | — | text (read-only) | **No** | `resident.created_on` | Display only, not editable |
| Last Login | — | text (read-only) | **No** | `resident.last_login` | Display "Never" if `null` |
| Property Images | — | gallery (read-only) | See 3.5 | `resident.images` | Admin CAN manage images. See Section 3.5 |

### 3.3 Critical UI Warning — Phone Number Change

**Implementation:**

When the user modifies the Mobile Number field (the value differs from the pre-populated value), dynamically display a **warning banner** immediately below or above the phone field:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ WARNING                                                          │
│                                                                     │
│ Changing the mobile number will immediately log this resident out   │
│ of their mobile app. They must re-authenticate using the new        │
│ number via OTP.                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Styling:** Use a yellow/amber warning colour with a warning icon (⚠️). The banner should be visually prominent.

**Trigger logic:**
```javascript
const originalPhone = resident.phone_num; // from get_resident response
const currentPhone = phoneInput.value;

if (currentPhone !== originalPhone && currentPhone !== "") {
    showPhoneChangeWarning();
} else {
    hidePhoneChangeWarning();
}
```

**On form submit with phone change:** Optionally show a confirmation dialog:  
*"You are about to change this resident's login phone number. They will be immediately logged out and must re-authenticate with the new number. Continue?"*  
[Cancel] [Continue]

### 3.4 Active/Inactive Toggle

Display as a toggle switch or checkbox:
- **Active (true):** Green/enabled state
- **Inactive (false):** Red/disabled state

When the user toggles from Active to Inactive, show a warning similar to the phone change:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ WARNING                                                          │
│                                                                     │
│ Deactivating this resident will immediately log them out of the     │
│ mobile app. They will not be able to log in until reactivated.      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Property Images Section

**Resolved Decision:** Admin CAN view and edit property images via the Edit Resident modal. This section provides full image management capability.

#### 3.5.1 Display

Show the resident's current property images in a gallery/grid layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Property Images                                         [+ Upload]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│ │          │  │          │  │          │                          │
│ │  Photo 1 │  │  Photo 2 │  │  Photo 3 │                          │
│ │          │  │          │  │          │                          │
│ │    [×]   │  │    [×]   │  │    [×]   │                          │
│ └──────────┘  └──────────┘  └──────────┘                          │
│                                                                     │
│ These images show the resident's property for officer reference.    │
└─────────────────────────────────────────────────────────────────────┘
```

- Display each image from the `resident.images` array as a thumbnail (e.g., 120×120px)
- Each thumbnail has a remove button (×)
- An "Upload" button allows adding new images

#### 3.5.2 Image Upload Flow

**Upload button behaviour:**
1. Open a file picker (accept: `image/*`)
2. On file selection, upload immediately via `File/upload_file_base64`:
   ```json
   {
       "#request": "File/upload_file_base64",
       "#token": "<token>",
       "data": "<base64_encoded_image>",
       "file_name": "property_photo.jpg"
   }
   ```
3. On success, store the returned `file_id` in a local array of new uploads
4. Show the image preview in the gallery alongside existing images

#### 3.5.3 Image Removal

When the admin clicks × on an existing image:
- Remove it from the `keep_images` array (the local tracking of which existing URLs to keep)
- Visually fade out or remove the thumbnail
- The actual removal happens when the form is saved

When the admin clicks × on a newly uploaded image:
- Remove its `file_id` from the local `new_image_ids` array
- Remove the thumbnail

#### 3.5.4 Image Save Logic

On form submit, construct the image parameters:

```javascript
// Existing images that the admin kept (didn't remove)
let keepImages = resident.images.filter(url => !removedImages.includes(url));

// Newly uploaded file IDs
let newImageIds = uploadedFiles.map(f => f.file_id);

// Only include image params if anything changed
if (removedImages.length > 0 || newImageIds.length > 0) {
    payload.keep_images = keepImages;
    payload.new_image_ids = newImageIds;
}
```

#### 3.5.5 Empty State

If no images exist, show:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Property Images                                         [+ Upload]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ No property images uploaded.                                        │
│ Upload images of the residence for officer reference.               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Form Submission

**Partial update pattern:** Only include fields that have **changed** from their original pre-populated values. Always include `user_id`.

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
if (instructions !== resident.instructions) payload.instructions = instructions;
if (imagesChanged) {
    payload.new_image_ids = newlyUploadedFileIds;
    payload.keep_images = existingImageUrlsKept;
}
if (communicationTest !== resident.communication_test) payload.communication_test = communicationTest;
if (isActive !== resident.is_active) payload.is_active = isActive;
```

**On success:** Close modal, show success toast, refresh the residents list.

### 3.7 Error Handling

| RC | Field | Message to Display |
|---|---|---|
| 540 | — | "Resident not found. They may have been deleted. Please refresh the page." |
| 224 | Mobile Number | "Please enter a valid mobile number" |
| 235 | Email | "Please enter a valid email address" |
| 240 | Email | "This email is already in use by another user" |
| 241 | Mobile Number | "This phone number is already registered in the system" |
| 321 | Images | "One or more uploaded images could not be found. Please re-upload." |
| 500 | Community | "Selected community was not found" |
| 505 | Community | "Selected community is not active" |
| 542 | Community | "Resident is already in this community" |

---

## 4. Delete Resident Flow

### 4.1 Trigger

Click the "Delete" (trash icon) button on a resident row in the list table.

### 4.2 Confirmation Dialog

Before calling the API, show a confirmation dialog:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Delete Resident                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Are you sure you want to delete resident                            │
│ "{First Name} {Last Name}"?                                         │
│                                                                     │
│ This action cannot be undone.                                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [Cancel]  [Delete]           │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 API Call

On "Delete" confirmation, call:
```json
{
    "#request": "Resident/delete_resident",
    "#token": "<token>",
    "user_id": "<resident_user_id>"
}
```

### 4.4 Success Handling

On `rc: 0`:
- Close the confirmation dialog
- Show success toast: "Resident deleted successfully"
- Refresh the residents list

### 4.5 Critical Error Handling — RC 543 (Cannot Delete)

**This is the most important error to handle gracefully.**

When the server returns `rc: 543`, it means the resident has already logged into the mobile app at least once. The system prevents deletion to protect data integrity.

**UI Implementation:** Replace the confirmation dialog with an informational dialog:

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

### 4.6 Other Error Handling

| RC | Action |
|---|---|
| 540 | Show "Resident not found — they may have already been deleted." Refresh the list. |

---

## 5. UI State Indicators

### 5.1 Active/Inactive Visual Distinction

Residents with `is_active: false` should be visually distinguished in the list:
- **Row styling:** Dimmed/greyed-out row, or reduced opacity (0.6)
- **Active badge:** Red "Inactive" badge vs. green "Active" badge
- **Note:** Inactive residents are only shown when `include_inactive: true` filter is enabled

### 5.2 Never Logged In Indicator

Residents with `last_login: null` have never used the app. Consider adding a subtle indicator:
- Small badge: "Pending" or "Not yet logged in"
- This helps admins identify residents who need onboarding assistance
- Also signals that deletion (rather than deactivation) is possible for these residents

### 5.3 Communication Test Indicator

In the list table, display the `communication_test` field as:
- A green "Yes" badge when `true`
- A grey "No" badge or "—" when `false`
- Alternatively, use a small icon indicator (e.g., a checkmark or signal icon)

### 5.4 Loading States

- **List loading:** Show skeleton rows or spinner while `get_residents` is pending
- **Modal loading:** Show spinner overlay while `get_resident` loads the detail data
- **Form submission:** Disable the submit button and show a loading indicator during API calls
- **Delete confirmation:** Disable the "Delete" button while the API call is in progress
- **Image upload:** Show progress indicator on each image being uploaded

---

## 6. Key Differences from Officer Module

Developers familiar with the Officer Management UI should note these differences:

| Aspect | Officer Module | Resident Module |
|---|---|---|
| Profile image | Single profile photo (avatar in list + upload in form) | **No profile image.** Property images gallery in edit only. |
| Image upload | Inline base64 in `add_officer`/`update_officer` | Separate File API upload → `new_image_ids` / `keep_images` |
| Title field | Yes (job title) | No |
| Roles/Badges | Multi-select tag inputs | No |
| Description | Yes (free text) | No |
| Vehicles | No | Yes (dynamic array input) |
| Instructions | No | Yes (textarea) |
| Communication Test | No | Yes (toggle) |
| Evaluations panel | Yes (admin-only section in edit modal) | No |
| Mandatory fields (Add) | First Name, Phone, Community, Title | First Name, Phone, Community |
| Self-service editable | Name, Email, Address | Name, Email, Address, Instructions, Images |

---

## 7. Mobile App Developer Notes

### 7.1 Resident App Profile Screen

The resident mobile app uses two endpoints:

1. **`Resident/get_my_details`** — Load the resident's profile on the profile screen
2. **`Resident/update_my_details`** — Submit editable field changes

### 7.2 Editable vs. Read-Only Fields

Display all resident profile fields, but only allow editing of:
- ✅ First Name
- ✅ Last Name
- ✅ Address
- ✅ Email
- ✅ Instructions (special instructions for officers)
- ✅ Property Images (upload/remove)

All other fields are **read-only** in the mobile app:
- ❌ Phone Number (admin-only — changing it affects login)
- ❌ Community (admin-managed)
- ❌ Vehicles (admin-managed)
- ❌ Communication Test (admin-managed)

### 7.3 Property Images in Mobile App

The resident's profile screen should include a "Property Images" section where the resident can:
1. View current property images (from `resident.images` URLs)
2. Upload new images (camera or gallery picker → `File/upload_file_base64` → collect `file_id`)
3. Remove existing images (remove from `keep_images`)
4. Save changes via `update_my_details` with `new_image_ids` and `keep_images`

**Label clearly:** "Property Images — Photos of your home for officer reference"

### 7.4 Session Termination Handling

The resident's session may be terminated at any time by an admin (phone change, deactivation, deletion). The mobile app must handle `rc: 201` (invalid token) on **every** API call:

- Detect `rc: 201` in the global API response handler
- Clear local token/session storage
- Redirect to the OTP login screen
- Optionally show: *"Your session has ended. Please log in again."*

### 7.5 No Profile Avatar

The resident mobile app should NOT display a profile avatar/photo for the resident. There is no `image_url` field. The `images` array is for property photos only — display them in a dedicated section, not as the user's avatar.

---

## 8. Complete Page Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Management > Residents                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Total: 42 residents                                    [+ Add Resident]     │
│                                                                             │
│ ┌──────────────────┐ ┌─────────────────┐ ┌────────────────────────────┐    │
│ │ All Communities ▼│ │ ☑ Active Only  │ │ 🔍 Search residents...     │    │
│ └──────────────────┘ └─────────────────┘ └────────────────────────────┘    │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Name ↑    │Community│Mobile      │Email      │Address   │Reg Date│...  │ │
│ ├───────────┼─────────┼────────────┼───────────┼──────────┼────────┼─────┤ │
│ │Alice      │Sunset   │+1555123... │alice@...  │456 Oak...│Jan 15  │ ✏️🗑│ │
│ │Johnson    │Estates  │            │           │          │2026    │     │ │
│ ├───────────┼─────────┼────────────┼───────────┼──────────┼────────┼─────┤ │
│ │Bob        │Green    │+1555987... │—          │789 Pine..│Feb 20  │ ✏️🗑│ │
│ │Williams   │Valley   │            │           │          │2026    │     │ │
│ ├───────────┼─────────┼────────────┼───────────┼──────────┼────────┼─────┤ │
│ │...        │...      │...         │...        │...       │...     │...  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Checklist for Implementation

Use this checklist to track implementation progress:

- [ ] **List Page**
  - [ ] Table with all specified columns
  - [ ] Total count display
  - [ ] Community filter dropdown
  - [ ] Active/Inactive toggle filter
  - [ ] Search input (debounced, server-side)
  - [ ] Column header sort (first_name, last_name, community, created_on)
  - [ ] Placeholder email detection ("—" for `@placeholder.local`)
  - [ ] No image/avatar column
  - [ ] Active/Inactive badge styling
  - [ ] Communication Test indicator
  - [ ] Vehicles display (comma-separated or chips)
  - [ ] Edit and Delete action buttons per row

- [ ] **Add Resident Modal**
  - [ ] First Name (required)
  - [ ] Last Name
  - [ ] Mobile Number (required) with OTP helper text
  - [ ] Email (with format validation)
  - [ ] Community dropdown (required, active communities only)
  - [ ] Address
  - [ ] Vehicles dynamic input (add/remove chips)
  - [ ] Instructions textarea
  - [ ] Communication Test toggle (default: off)
  - [ ] NO profile image upload field
  - [ ] Error handling for all error codes

- [ ] **Edit Resident Modal**
  - [ ] Pre-populate from `get_resident` response
  - [ ] All fields from Add modal (editable)
  - [ ] Active/Inactive toggle with deactivation warning
  - [ ] Phone number change warning banner
  - [ ] Property Images section (gallery + upload + remove)
  - [ ] Registration Date (read-only)
  - [ ] Last Login (read-only, "Never" if null)
  - [ ] Partial update (only send changed fields)
  - [ ] Error handling for all error codes

- [ ] **Delete Flow**
  - [ ] Confirmation dialog
  - [ ] Success toast + list refresh
  - [ ] RC 543 fallback dialog with "Deactivate" button
  - [ ] RC 540 handling

- [ ] **UI States**
  - [ ] Loading skeletons/spinners
  - [ ] Inactive row dimming (when shown)
  - [ ] "Never logged in" indicator
  - [ ] Image upload progress indicators
