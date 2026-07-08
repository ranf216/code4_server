# Officer Module — UI Updates Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-08  
**Audience:** Web Application Developers  
**Phase:** 2.1  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 4.3

> This guide specifies the exact UI changes required in the Management Portal to implement the Officers Management feature. Each section describes **what** needs to be built, **why**, and the **exact API integration** required. Refer to the **Officer API — Integration Guide** for full endpoint documentation, JSON payloads, and error code details.

---

## 1. Officers Management List Page

### 1.1 Page Overview

**Location in menu:** Management → Officers (per SDS 4.3)

**Access:** Any authenticated admin user can view this page (all admin roles: Super Admin, Manager, Planning, Logistics, Finance).

**Purpose:** Display a table of all security officers in the system with search, filter, sort, and CRUD capabilities.

**API on page load:** Call `Officer/get_officers` with default parameters:
```json
{
    "#request": "Officer/get_officers",
    "#token": "<token>",
    "community_id": 0,
    "include_inactive": false,
    "search_text": "",
    "sort_by": "",
    "sort_dir": "asc"
}
```

### 1.2 Table Layout

**SDS Reference (Section 4.3.1):** *"The list is sorted by ABC of the officer's first name. Above the list there is a total number of officers in the table."*

#### Total Count Display

Above the table, display the total count:
- **Format:** `"Total: X officers"` where X is `response.total_count`
- **Position:** Top-left, above the table header row
- **Update:** Refresh after every list reload (search, filter, create, update, delete)

#### Table Columns

| Column Header | Data Field | Type | Sortable | Notes |
|---|---|---|---|---|
| Officer Name | `first_name` + `last_name` | text | Yes (`first_name`, `last_name`) | Display as full name. Default sort column (first name, ascending). |
| Community | `community_name` | text | Yes (`community`) | Display community name. Show "—" if `null`. |
| Mobile | `phone_num` | phone | No | Officer's login phone number |
| Email | `email` | text | No | May be empty or a system placeholder — show "—" for placeholder emails |
| Title | `title` | text | No | Job title |
| Role | `roles` | tags | No | Display as coloured chips/tags. Show "—" if empty array. |
| Active | `is_active` | badge | No | Display as "Yes" / "No" badge with green/red styling |
| Actions | — | buttons | No | Edit, Delete |

#### 1.2.1 Image Column (Optional Enhancement)

Per SDS 4.3.1, "Picture" is listed as a column. For the table view, display a small avatar thumbnail:
- If `image_url` is non-empty: show the image as a circular thumbnail (32×32px)
- If `image_url` is empty: show a default avatar icon with the officer's initials

#### 1.2.2 Roles Display

The `roles` field is an array of strings. Render each role as a distinct chip/tag:
```
["Patrol", "Investigation"] → [Patrol] [Investigation]
```
Use a consistent colour palette for visual distinction. If the array is empty, show "—".

#### 1.2.3 Actions Column

Each row should have the following action buttons/icons:

1. **Edit** (pencil icon) — Opens the Edit Officer modal (Section 3)
2. **Delete** (trash icon) — Initiates the deletion flow (Section 5)

#### 1.2.4 Detecting Placeholder Emails

When an officer is created without an email, the server generates a placeholder like `+972501234567@placeholder.local`. The UI should detect emails ending with `@placeholder.local` and display "—" instead.

### 1.3 Toolbar / Filter Bar

Position above the table, below the page title. Contains:

#### 1.3.1 Add Officer Button

- **Position:** Top-right of the toolbar
- **Label:** "Add Officer" or "+" icon with tooltip
- **Action:** Opens the Add Officer modal (Section 2)

#### 1.3.2 Community Filter Dropdown

- **SDS Requirement (4.3.5):** *"Filter by community name"*
- **Type:** Dropdown / select
- **Options:** "All Communities" (default, sends `community_id: 0`) + list of all active communities
- **Data source:** Use the communities list from `Community/get_communities` (or from a cached communities response)
- **Behaviour:** Selecting a community immediately refreshes the officers list with `community_id` set to the selected community's ID

#### 1.3.3 Active/Inactive Toggle

- **SDS Requirement (4.3.5):** *"Filter by Active/Inactive"*
- **Type:** Toggle button, segmented control, or checkbox
- **Options:** "Active Only" (default) / "All" (includes inactive)
- **Behaviour:** Toggling sends `include_inactive: true/false` and refreshes the list

#### 1.3.4 Search Input

- **SDS Requirement (4.3.5):** *"Free search in all the table's columns"*
- **Type:** Text input with search icon
- **Placeholder:** "Search officers..."
- **Behaviour:** Debounce input (300–500ms). Send `search_text` to the server on each change. Clear button to reset.
- **Server-side search:** The server searches across first name, last name, email, phone, and community name. Do NOT implement client-side filtering.

#### 1.3.5 Sort Controls

- **SDS Requirement (4.3.5):** *"Sort the table according to each data column by clicking on its header"*
- **Implementation:** Clickable column headers for sortable columns. Click toggles between ascending/descending.
- **Valid sort values:** `"first_name"`, `"last_name"`, `"community"`, `"created_on"`
- **Visual indicator:** Arrow icon (↑/↓) on the active sort column

---

## 2. Add Officer Modal

### 2.1 Modal Overview

**Trigger:** Click "Add Officer" button in the toolbar.

**Title:** "Add New Officer"

**API endpoint:** `Officer/add_officer`

### 2.2 Form Fields

| Field Label | Parameter | Input Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| First Name | `first_name` | text input | **Yes** | Non-empty | — |
| Last Name | `last_name` | text input | No | — | — |
| Mobile Number | `phone_num` | phone input | **Yes** | Non-empty, phone format | **Login credential.** Display helper text: *"This number will be used for the officer's app login via OTP."* |
| Email | `email` | email input | No | Valid email format (if provided) | — |
| Community | `community_id` | dropdown | **Yes** | Must select a community | Populated from communities list. Only show active communities. |
| Title | `title` | text input | **Yes** | Non-empty | E.g., "Patrol Officer", "Senior Guard" |
| Address | `address` | text input | No | — | Officer's home/base address |
| Description | `description` | textarea | No | — | Free-text. Multi-line input. |
| Photo | `image` | file upload | No | Image files only (jpg, png) | Convert to base64 before sending. Show preview after selection. |
| Roles | `roles` | multi-select / tag input | No | — | Free-form tags OR selection from a predefined list. See Section 2.3. |
| Certification Badges | `certification_badges` | multi-select / tag input | No | — | Free-form tags OR selection from a predefined list. See Section 2.3. |

### 2.3 Roles and Badges Input

Roles and badges are sent as arrays of strings. Implementation options:

**Option A — Tag Input (Recommended):**  
A text field where the user types a role/badge name and presses Enter to add it as a tag/chip. Tags can be removed by clicking the × button.

**Option B — Multi-Select from Predefined List:**  
If the organization has a known set of roles/badges, present them as a multi-select checklist or dropdown with checkboxes. The selected items become the array.

**Option C — Hybrid:**  
Multi-select with predefined options + ability to type custom values.

The array is sent as:
```json
"roles": ["Patrol", "Investigation", "K9 Unit"]
```

### 2.4 Form Behaviour

1. **Mandatory field indicators:** Mark First Name, Mobile Number, Community, and Title with a red asterisk (*) or "Required" label.
2. **Submit button:** Disabled until all mandatory fields have values.
3. **On submit:** 
   - Show loading indicator
   - Call `Officer/add_officer`
   - On success (`rc: 0`): Close modal, show success toast ("Officer created successfully"), refresh the officers list
   - On error: Show error message inline (see Section 2.5)
4. **Cancel button:** Closes modal without saving.

### 2.5 Error Handling

| RC | Field | Message to Display |
|---|---|---|
| 224 | Mobile Number | "Please enter a valid mobile number" |
| 235 | Email | "Please enter a valid email address" |
| 240 | Email | "This email is already in use by another user" |
| 241 | Mobile Number | "This phone number is already registered in the system" |
| 504 | Community | "Selected community was not found. Please refresh and try again." |
| 505 | Community | "Selected community is not active. Please choose an active community." |

---

## 3. Edit Officer Modal

### 3.1 Modal Overview

**Trigger:** Click "Edit" button on an officer row in the list.

**Title:** "Edit Officer — {First Name} {Last Name}"

**Data Loading:** On modal open, call `Officer/get_officer` with the officer's `user_id`. Pre-populate all fields with the response data.

**API endpoint for save:** `Officer/update_officer`

### 3.2 Form Fields

| Field Label | Parameter | Input Type | Editable | Pre-fill Source | Notes |
|---|---|---|---|---|---|
| First Name | `first_name` | text input | Yes | `officer.first_name` | — |
| Last Name | `last_name` | text input | Yes | `officer.last_name` | — |
| Mobile Number | `phone_num` | phone input | Yes | `officer.phone_num` | **⚠️ See Section 3.3 — Warning Banner** |
| Email | `email` | email input | Yes | `officer.email` | Hide placeholder emails |
| Community | `community_id` | dropdown | Yes | `officer.community_id` | SDS 4.3.3: *"If the community is changed, the officer will no longer receive calls from the previous community."* |
| Title | `title` | text input | Yes | `officer.title` | — |
| Address | `address` | text input | Yes | `officer.address` | — |
| Description | `description` | textarea | Yes | `officer.description` | — |
| Photo | `image` | file upload | Yes | Show current `officer.image_url` | Allow replace or remove |
| Roles | `roles` | multi-select / tags | Yes | `officer.roles` | Pre-populate with existing roles |
| Certification Badges | `certification_badges` | multi-select / tags | Yes | `officer.certification_badges` | Pre-populate with existing badges |
| Active | `is_active` | toggle switch | Yes | `officer.is_active` | See Section 3.4 |
| Registration Date | — | text (read-only) | **No** | `officer.created_on` | Display only, not editable (SDS 4.3.3) |
| Last Login | — | text (read-only) | **No** | `officer.last_login` | Display "Never" if `null` |

### 3.3 Critical UI Warning — Phone Number Change

**SDS Requirement (4.3.3):** *"[Mobile number] is used by the officer to enter his app, therefore if it is changed, the officer must be identified again before login to his app."*

**Implementation:**

When the user modifies the Mobile Number field (the value differs from the pre-populated value), dynamically display a **warning banner** immediately below or above the phone field:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ WARNING                                                          │
│                                                                     │
│ Changing the mobile number will immediately log this officer out    │
│ of their mobile app. They must re-authenticate using the new        │
│ number via OTP.                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Styling:** Use a yellow/amber warning colour with a warning icon (⚠️). The banner should be visually prominent.

**Trigger logic:**
```javascript
const originalPhone = officer.phone_num; // from get_officer response
const currentPhone = phoneInput.value;

if (currentPhone !== originalPhone && currentPhone !== "") {
    showPhoneChangeWarning();
} else {
    hidePhoneChangeWarning();
}
```

**On form submit with phone change:** Optionally show a confirmation dialog:  
*"You are about to change this officer's login phone number. They will be immediately logged out and must re-authenticate with the new number. Continue?"*  
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
│ Deactivating this officer will immediately log them out of the      │
│ mobile app. They will not be able to log in until reactivated.      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Image Handling

- **Current image:** Display the current photo from `image_url` as a preview.
- **Change image:** Provide a "Change Photo" button that opens a file picker. After selection, show the new image preview. Convert to base64 for the request.
- **Remove image:** Provide a "Remove Photo" button (×) that clears the preview and sends `image: ""` in the update request.
- **No change:** If the user does not interact with the photo, do NOT include `image` in the request payload.

### 3.6 Form Submission

**Partial update pattern:** Only include fields that have **changed** from their original pre-populated values. Always include `user_id`.

```javascript
let payload = { "#request": "Officer/update_officer", "#token": token, "user_id": officer.user_id };

if (firstName !== officer.first_name) payload.first_name = firstName;
if (lastName !== officer.last_name) payload.last_name = lastName;
if (phoneNum !== officer.phone_num) payload.phone_num = phoneNum;
if (email !== officer.email) payload.email = email;
if (communityId !== officer.community_id) payload.community_id = communityId;
if (title !== officer.title) payload.title = title;
if (address !== officer.address) payload.address = address;
if (description !== officer.description) payload.description = description;
if (imageChanged) payload.image = newImageBase64; // or "" for removal
if (rolesChanged) payload.roles = currentRoles;
if (badgesChanged) payload.certification_badges = currentBadges;
if (isActive !== officer.is_active) payload.is_active = isActive;
```

**On success:** Close modal, show success toast, refresh the officers list.

### 3.7 Error Handling

| RC | Field | Message to Display |
|---|---|---|
| 520 | — | "Officer not found. They may have been deleted. Please refresh the page." |
| 235 | Email | "Please enter a valid email address" |
| 240 | Email | "This email is already in use by another user" |
| 241 | Mobile Number | "This phone number is already registered in the system" |
| 504 | Community | "Selected community was not found" |
| 505 | Community | "Selected community is not active" |

---

## 4. Evaluations Panel

### 4.1 Panel Overview

**Location:** Within the Edit Officer modal — either as a dedicated **tab** ("Details" | "Evaluations") or as a **collapsible section** below the main officer fields.

**SDS Requirement (4.3.2 & 4.3.3):** *"This field is visible only for the manager/admin (not to the officer)."* — Since this is in the admin portal, this requirement is inherently satisfied.

**Data source:** The evaluations are included in the `get_officer` response under `officer.evaluations[]`. For dedicated refresh, use `Officer/get_officer_evaluations`.

### 4.2 Evaluations List

Display evaluations as a vertical timeline or card list, ordered by date (newest first):

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📝 Evaluations                                          [+ Add New] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ June 15, 2026                            by Sarah Manager    🗑️ │ │
│ │                                                                 │ │
│ │ Excellent performance during emergency drill. Responded         │ │
│ │ quickly and followed all protocols.                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ April 1, 2026                            by John Admin       🗑️ │ │
│ │                                                                 │ │
│ │ Good communication with residents. Needs improvement in         │ │
│ │ report writing.                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ No more evaluations.                                                │
└─────────────────────────────────────────────────────────────────────┘
```

Each evaluation card displays:
- **Date** — formatted from `evaluation.date` (e.g., "June 15, 2026")
- **Evaluator** — from `evaluation.evaluator_name` (e.g., "by Sarah Manager")
- **Text** — full evaluation content from `evaluation.text`
- **Delete button** — trash icon (🗑️) to soft-delete the evaluation

**Empty state:** If no evaluations exist, show: *"No evaluations have been added yet."*

### 4.3 Add Evaluation Form

**Trigger:** Click "Add New" button (+ icon) in the evaluations panel header.

**Form type:** Inline form that expands within the panel, OR a small sub-modal.

#### Form Fields

| Field Label | Parameter | Input Type | Required | Notes |
|---|---|---|---|---|
| Date | `date` | date picker | **Yes** | Default to today's date. Format: YYYY-MM-DD. |
| Evaluation Text | `text` | textarea | **Yes** | Multi-line input. Minimum height: 3 rows. |

> **Note — Evaluator Name:** The evaluator name is **automatically determined by the server** from the currently logged-in admin's profile. Do NOT include an evaluator name input field in the form. The evaluator name displayed in the list comes from the server response.

#### Submit Behaviour

1. Call `Officer/add_officer_evaluation` with `user_id`, `text`, and `date`.
2. On success (`rc: 0`):
   - Close the inline form
   - Prepend the new evaluation to the list (or re-fetch evaluations)
   - Show brief success indicator
3. On error:
   - `rc: 520` — "Officer not found" (edge case — officer was deleted while modal was open)

### 4.4 Delete Evaluation

**Trigger:** Click the delete (🗑️) button on an evaluation card.

**Confirmation:** Show a confirmation dialog:  
*"Are you sure you want to delete this evaluation?"*  
[Cancel] [Delete]

**On confirm:**
1. Call `Officer/delete_officer_evaluation` with `evaluation_id`.
2. On success (`rc: 0`): Remove the evaluation card from the list with a fade-out animation.
3. On error `rc: 527`: Show "Evaluation not found — it may have already been deleted." and remove it from the UI.

---

## 5. Delete Officer Flow

### 5.1 Trigger

Click the "Delete" (trash icon) button on an officer row in the list table.

### 5.2 Confirmation Dialog

Before calling the API, show a confirmation dialog:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Delete Officer                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Are you sure you want to delete officer                             │
│ "{First Name} {Last Name}"?                                         │
│                                                                     │
│ This action cannot be undone.                                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [Cancel]  [Delete]           │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 API Call

On "Delete" confirmation, call:
```json
{
    "#request": "Officer/delete_officer",
    "#token": "<token>",
    "user_id": "<officer_user_id>"
}
```

### 5.4 Success Handling

On `rc: 0`:
- Close the confirmation dialog
- Show success toast: "Officer deleted successfully"
- Refresh the officers list

### 5.5 Critical Error Handling — RC 526 (Cannot Delete)

**This is the most important error to handle gracefully.**

When the server returns `rc: 526`, it means the officer has already logged into the mobile app at least once. The system prevents deletion to protect data integrity.

**UI Implementation:** Replace the confirmation dialog with an informational dialog:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Cannot Delete Officer                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ This officer has already logged into the mobile app and cannot      │
│ be deleted from the system.                                         │
│                                                                     │
│ To remove their access, please set their status to Inactive         │
│ instead. This will immediately log them out and prevent future      │
│ logins while preserving their historical data.                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                              [Close]  [Deactivate Officer]          │
└─────────────────────────────────────────────────────────────────────┘
```

**"Deactivate Officer" button behaviour:**
1. Close this dialog
2. Call `Officer/update_officer` with `user_id` and `is_active: false`
3. On success: Show toast "Officer deactivated" and refresh the list
4. Alternatively: Open the Edit Officer modal with the Active toggle highlighted/focused

### 5.6 Other Error Handling

| RC | Action |
|---|---|
| 520 | Show "Officer not found — they may have already been deleted." Refresh the list. |

---

## 6. UI State Indicators

### 6.1 Active/Inactive Visual Distinction

Officers with `is_active: false` should be visually distinguished in the list:
- **Row styling:** Dimmed/greyed-out row, or reduced opacity (0.6)
- **Active badge:** Red "Inactive" badge vs. green "Active" badge
- **Note:** Inactive officers are only shown when `include_inactive: true` filter is enabled

### 6.2 Never Logged In Indicator

Officers with `last_login: null` have never used the app. Consider adding a subtle indicator:
- Small badge: "Pending" or "Not yet logged in"
- This can help admins identify officers who need onboarding assistance

### 6.3 Loading States

- **List loading:** Show skeleton rows or spinner while `get_officers` is pending
- **Modal loading:** Show spinner overlay while `get_officer` loads the detail data
- **Form submission:** Disable the submit button and show a loading indicator during API calls
- **Delete confirmation:** Disable the "Delete" button while the API call is in progress

---

## 7. Mobile App Developer Notes

### 7.1 Officer App Profile Screen

The officer mobile app uses two endpoints:

1. **`Officer/get_my_details`** — Load the officer's profile on the profile screen
2. **`Officer/update_my_details`** — Submit editable field changes

### 7.2 Editable vs. Read-Only Fields

Display all officer profile fields, but only allow editing of:
- ✅ First Name
- ✅ Last Name
- ✅ Address
- ✅ Email

All other fields are **read-only** in the mobile app:
- ❌ Phone Number (admin-only — changing it affects login)
- ❌ Title (admin-managed)
- ❌ Community (admin-managed)
- ❌ Roles (admin-managed)
- ❌ Certification Badges (admin-managed)
- ❌ Active Status (admin-managed)
- ❌ Photo (admin-managed)

### 7.3 Session Termination Handling

The officer's session may be terminated at any time by an admin (phone change, deactivation, deletion). The mobile app must handle `rc: 201` (invalid token) on **every** API call:

- Detect `rc: 201` in the global API response handler
- Clear local token/session storage
- Redirect to the OTP login screen
- Optionally show: *"Your session has ended. Please log in again."*

### 7.4 Evaluations Not Visible

Per SDS requirements, evaluations are **never** shown to the officer. The `get_my_details` response does not include evaluations. Do not create a UI section for evaluations in the officer app.
