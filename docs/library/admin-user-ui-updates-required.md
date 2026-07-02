# Admin User — UI Updates Guide

**Document Version:** 1.0  
**Last Updated:** 2026-07-02  
**Audience:** Web Application Developers  
**Phase:** 1.3  
**SDS Reference:** Code4_Axis SDS 31-MAY-2026, Section 5.2

> This guide specifies the exact UI changes required across the admin portal to implement the Users Management feature. Each section describes **what** needs to be built, **why**, and the **exact API integration** required. Refer to the **Admin User API — Web Developer Integration Guide** for full endpoint documentation, JSON payloads, and error code details.

---

## 1. Users Management List Page

### 1.1 Page Overview

**Location in menu:** Management → Users Management (item 5 in the main menu per SDS 5.1.1)

**Access:** Only users with the **Super Admin** role can view this page. If a non-Super-Admin navigates here, show "Access Denied" or hide the menu item entirely.

**Purpose:** Display a table of all management portal users (admin-type users) with search, filter, sort, and action capabilities.

### 1.2 Table Layout

**SDS Reference (Section 5.2.1):** *"Above the list there is a total number of users in the table. The list is sorted by user first name."*

#### Total Count Display

Above the table, display the total count:
- **Format:** `"Total: X users"` where X is `response.total_count`
- **Position:** Top-left, above the table header row
- **Update:** Refresh after every list reload (search, filter, create, delete, etc.)

#### Table Columns

| Column Header | Data Field | Type | Sortable | Notes |
|---|---|---|---|---|
| First Name | `first_name` | text | Yes | Default sort column (ascending) |
| Last Name | `last_name` | text | Yes | May be empty |
| Mobile Number | `phone_num` | text | No | May be empty |
| Email | `email` | text | Yes | Login identifier |
| Password | — | text | No | See Section 1.2.1 |
| Role | `role` | text | Yes | Display name, not integer (see Section 1.2.2) |
| Registration Date | `created_on` | date | Yes | Format per system date settings |
| Active | `is_active` | yes/no | No | Display as "Yes" / "No" or toggle indicator |
| Actions | — | buttons | No | Edit, Delete, Reset Password |

#### 1.2.1 Password Column — Special Display Logic

**SDS Requirement (Section 5.2.1):** *"Password — only initial password. The user will have to change it during the first login and it will no longer be displayed here."*

The Password column is a **display-only** column. The server does NOT return password values in the `get_users_list` or `get_user` responses. This column exists in the SDS specification for administrative reference but **cannot show actual passwords**.

**Implementation:**
- Display `"•••••••"` (masked placeholder) or `"—"` (em dash) for all users.
- Optionally, display `"(Initial)"` for users who have never logged in (`last_login` is `null`), indicating they still have an initial password pending change.
- This column is non-sortable and non-filterable.

#### 1.2.2 Role Column — Display Mapping

The `role` field in the API response is an integer. Map it to a display name:

| API Value | Display Name |
|---|---|
| 2 | Super Admin |
| 3 | Manager |
| 4 | Planning |
| 5 | Logistics |
| 6 | Finance |
| `null` | — |

Use a colour badge or chip component to visually distinguish roles (e.g., Super Admin in a red/purple badge, Manager in blue, etc.).

#### 1.2.3 Actions Column

Each row should have the following action buttons/icons:

1. **Edit** (pencil icon) — Opens the Edit User modal (Section 3)
2. **Reset Password** (key/lock icon) — Opens the Reset Password dialog (Section 5)
3. **Delete** (trash icon) — Initiates the deletion flow (Section 6)

> **Note:** The Super Admin should NOT be able to see the Delete button on their own row. Alternatively, clicking Delete on their own row can trigger the error handling in Section 6.

### 1.3 Controls Above the Table

#### 1.3.1 "Add User" Button

**SDS Requirement (Section 5.2.2):** *"Above the table there is an Add button which opens the Add New User window."*

- **Label:** "Add User" or "+ Add User"
- **Position:** Top-right, above the table
- **Action:** Opens the Add New User modal (Section 2)

#### 1.3.2 Search Bar

**SDS Requirement (Section 5.2.5):** *"In addition there is also an option for free search in all the table's columns."*

- **Label/Placeholder:** "Search users..."
- **Position:** Top area, near the "Add User" button
- **Behaviour:** Server-side search via `search_text` parameter

**Implementation:**
- Apply a **debounce delay** (300–500ms) to avoid excessive API calls.
- On each debounced input, call `AdminUser/get_users_list` with `search_text` plus current filter/sort state.
- Replace table data with the server response.
- Clearing the search bar reloads the full unfiltered list.

```javascript
// Debounced search handler
function onSearchInput(searchText)
{
    const payload = {
        "#request": "AdminUser/get_users_list",
        "#token": token,
        "search_text": searchText,
        "include_inactive": includeInactiveCheckbox.checked,
        "sort_by": currentSortBy,
        "sort_dir": currentSortDir
    };

    const response = await callAPI(payload);
    if (response)
    {
        replaceTableData(response.users);
        updateTotalCount(response.total_count);
    }
}
```

> **Important:** Do NOT implement client-side filtering. The server searches across first name, last name, email, and phone number. Always use the server response as-is.

#### 1.3.3 "Include Inactive" Filter

**SDS Requirement (Section 5.2.5):** *"The admin can filter the table according to the following options: 1. Active/inactive"*

- **Type:** Checkbox or toggle switch
- **Label:** "Show Inactive Users" or "Include Inactive"
- **Default:** Unchecked (only active users shown)
- **Behaviour:** When toggled, call `get_users_list` with `include_inactive` set to the new state. Maintain current search and sort parameters.

#### 1.3.4 Sortable Column Headers

**SDS Requirement (Section 5.2.5):** *"The admin can sort the table according to each data column by clicking on its header."*

- Clicking a sortable column header cycles: **ascending → descending → ascending**
- Show a sort indicator (arrow up/down) on the active sort column
- Valid sort columns: `first_name`, `last_name`, `email`, `role`, `created_on`
- On sort change, call `get_users_list` with updated `sort_by` and `sort_dir`

**API call pattern:**
```json
{
    "#request": "AdminUser/get_users_list",
    "#token": "<token>",
    "sort_by": "email",
    "sort_dir": "desc",
    "include_inactive": false,
    "search_text": ""
}
```

### 1.4 Implementation Checklist — Users List Page

- [ ] Create the Users Management page accessible from the main menu
- [ ] Restrict page access to Super Admin role only
- [ ] Display total user count above the table
- [ ] Implement table with all specified columns (Section 1.2)
- [ ] Map role integer values to display names with colour badges
- [ ] Handle Password column display (masked or placeholder)
- [ ] Add "Add User" button that opens Add modal
- [ ] Implement server-side search with debounce (300–500ms)
- [ ] Implement "Include Inactive" checkbox/toggle filter
- [ ] Implement sortable column headers with sort indicators
- [ ] Add action buttons (Edit, Reset Password, Delete) per row
- [ ] Call `get_users_list` on page load with default parameters
- [ ] Re-call `get_users_list` after any create/update/delete to refresh

---

## 2. Add New User Modal

### 2.1 Modal Overview

**SDS Reference (Section 5.2.2):** Defines the "Add New User" window with mandatory and optional fields.

**Trigger:** Clicking the "Add User" button on the Users Management list page.

### 2.2 Form Fields

| Field Label | Parameter | Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| First Name | `first_name` | Text input | **Yes** ★ | Non-empty | |
| Last Name | `last_name` | Text input | No | — | Optional |
| Mobile Number | `phone_num` | Phone input | No | — | Optional, phone format |
| Email | `email` | Email input | **Yes** ★ | Valid email format | Used for system login |
| Password | `password` | Password input | **Yes** ★ | See Section 2.3 | Initial password only |
| Role | `role` | Dropdown | **Yes** ★ | Valid role value | See Section 2.4 |

★ = Mark with red asterisk required indicator

### 2.3 Password Field Requirements

**SDS Requirement (Section 5.2.2):** *"Password — only initial password. The user will have to change it during the first login."*

**UI specifications:**

1. **Input type:** Password field with show/hide toggle (eye icon)
2. **Validation criteria** (enforce client-side, server also validates):
   - Minimum 8 characters
   - At least 1 lowercase letter (a-z)
   - At least 1 uppercase letter (A-Z)
   - At least 1 number (0-9)
   - At least 1 special character (@, #, $, !, etc.)
3. **Real-time strength indicator:** Show a password strength meter or checklist below the field that updates as the user types:

```
Password Requirements:
  ✓ At least 8 characters
  ✗ At least 1 lowercase letter
  ✓ At least 1 uppercase letter
  ✓ At least 1 number
  ✗ At least 1 special character
```

4. **Helper text:** Below the field, display: *"This is the initial password. The user will be required to change it on their first login."*

### 2.4 Role Dropdown

**SDS note (Section 5.2.2):** *"Role type — Currently only admin."* — This was written when only Admin existed. The platform now supports multiple roles.

**Dropdown options:**

| Display Label | Value |
|---|---|
| Super Admin | 2 |
| Manager | 3 |
| Planning | 4 |
| Logistics | 5 |
| Finance | 6 |

- **Default selection:** Manager (value 3) — or require explicit selection with a placeholder "Select role..."
- **Required:** Yes — the form cannot be submitted without a role selection.

### 2.5 Form Submission

**API call:**
```json
{
    "#request": "AdminUser/add_user",
    "#token": "<token>",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@code4.com",
    "password": "InitPass@123",
    "phone_num": "+1-555-0100",
    "role": 3
}
```

**Client-side validation before submit:**
1. `first_name` is non-empty
2. `email` is a valid email format
3. `password` meets all criteria (Section 2.3)
4. `role` is selected (not placeholder)

**Disable the "Save" button** until all mandatory fields have valid values.

### 2.6 Error Handling

| Server RC | UI Action |
|---|---|
| 0 | Close modal → refresh users list → show success toast: "User created successfully" |
| 102 | Highlight missing mandatory field(s) with inline error messages |
| 106 | Show "Invalid role selected" on the role dropdown |
| 213 | Show "First name is required" inline on the first name field |
| 235 | Show "Please enter a valid email address" inline on the email field |
| 240 | Show "A user with this email already exists" inline on the email field |
| 242 | Show the server's `message` field (password criteria details) inline on the password field |

### 2.7 Post-Creation Note

**SDS Requirement:** *"A user is added in Active state and today is the registration date."*

The server handles this automatically:
- The new user is created in **Active** status.
- The registration date (`created_on`) is set to the current date/time.
- No UI action needed for these — they are server-side defaults.

### 2.8 Implementation Checklist — Add User Modal

- [ ] Create Add User modal/dialog component
- [ ] Add all form fields per Section 2.2 with required indicators
- [ ] Implement password field with show/hide toggle and strength indicator
- [ ] Implement password criteria checklist (real-time validation as user types)
- [ ] Add helper text below password field about first-login change
- [ ] Create role dropdown with all role options (Section 2.4)
- [ ] Add client-side validation for all mandatory fields
- [ ] Disable "Save" button until all mandatory fields are valid
- [ ] Call `AdminUser/add_user` on form submission
- [ ] Handle all error responses per Section 2.6 with inline field errors
- [ ] On success: close modal, refresh list, show toast

---

## 3. Edit User Modal

### 3.1 Modal Overview

**SDS Reference (Section 5.2.3):** Defines the editable and non-editable fields in the user details window.

**Trigger:** Clicking the "Edit" button/icon on a user row in the Users Management list.

### 3.2 Data Loading

On modal open, call `AdminUser/get_user` to fetch the user's current data:

```json
{
    "#request": "AdminUser/get_user",
    "#token": "<token>",
    "user_id": "<selected_user_id>"
}
```

Populate all form fields with the response data.

### 3.3 Form Fields

| Field Label | Parameter | Type | Editable | Pre-populated From | Notes |
|---|---|---|---|---|---|
| First Name | `first_name` | Text input | **Yes** | `user.first_name` | |
| Last Name | `last_name` | Text input | **Yes** | `user.last_name` | |
| Mobile Number | `phone_num` | Phone input | **Yes** | `user.phone_num` | |
| Email | `email` | Text input | **Yes** | `user.email` | See Section 3.4 |
| Initial Password | `initial_password` | Password input | **Dynamic** | — | Only visible/required when email is changed (Section 3.4) |
| Role | `role` | Dropdown | **Yes** ★ | `user.role` | See Section 3.5 |
| Registration Date | — | Read-only | **No** | `user.created_on` | Display only, not editable |
| Active | `is_active` | Toggle | **Yes** | `user.is_active` | See Section 3.6 |

★ Formal deviation from SDS — see Section 3.5.

### 3.4 Email Field — Dynamic Initial Password Requirement

**SDS Requirement (Section 5.2.3):** *"Email — it is used by the user to enter the system, therefore if it is changed, an initial password must be given as well and the user must login again to the system."*

**Implementation:** The `update_user` endpoint accepts an `initial_password` parameter that is **conditionally mandatory** — required only when the email address is being changed. The server handles the email change, password reset, and session termination in a single atomic operation.

**Dynamic UI logic:**

When the Super Admin edits the `email` field so that its value **differs** from the original value loaded from `get_user`:

1. **Dynamically display** a new **"Initial Password"** input field directly below the email field.
2. **Field specifications:**
   - **Label:** "Initial Password"
   - **Input type:** Password field with **show/hide toggle** (eye icon)
   - **Real-time password criteria checklist** (same component as Add User modal, Section 2.3):
     ```
     Password Requirements:
       ✓ At least 8 characters
       ✗ At least 1 lowercase letter
       ✓ At least 1 uppercase letter
       ✓ At least 1 number
       ✗ At least 1 special character
     ```
   - **Helper text:** *"Required when changing email. The user will be logged out and must change this password on their next login."*
3. **Dynamically mandatory:** The "Initial Password" field becomes a **required field** — the "Save" button must remain disabled until the password meets all criteria.
4. **Disappears when email reverts:** If the Super Admin changes the email back to the original value, the "Initial Password" field should **disappear** and its value should be cleared. It is no longer required.
5. **Warning banner:** Show an informational warning when the password field is visible:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠ Changing the email will immediately log this user out.    │
│  They must log back in with the new email and initial       │
│  password, then set a new permanent password.               │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Role Dropdown — Editable (Formal SDS Deviation)

**SDS Requirement (Section 5.2.3):** The SDS marks "Role type" as **not editable**.

**Design Decision:** A formal deviation was made to allow Super Admins to change a user's role. The SDS was written when only "Admin" existed as a role. With the introduction of Manager, Planning, Logistics, and Finance roles, role editing is operationally necessary.

**UI specifications:**

1. **Dropdown options:** Same as Add User modal (Section 2.4)
2. **Pre-selected value:** The user's current role from `user.role`
3. **Self-role restriction:** If the user being edited is the **currently logged-in Super Admin** (i.e., their `user_id` matches the caller's own ID), **disable the role dropdown** and show a tooltip: *"You cannot change your own role."*
4. **Server-side enforcement:** Even if the dropdown is not disabled client-side, the server returns `rc: 772` if a Super Admin tries to change their own role.

### 3.6 Active Status Toggle

**UI specifications:**

1. **Type:** Toggle switch or checkbox
2. **Label:** "Active"
3. **Pre-set:** `user.is_active` (true = on, false = off)
4. **Deactivation warning:** When the Super Admin toggles from active to inactive, show a warning:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠ Deactivating this user will immediately log them     │
│  out and prevent them from logging in until reactivated. │
└─────────────────────────────────────────────────────────┘
```

### 3.7 Form Submission

**Only send changed values.** Compare each field with its original value loaded from `get_user`. Only include fields that were modified in the API request.

**API call (example — only changed fields):**
```json
{
    "#request": "AdminUser/update_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "last_name": "Johnson",
    "is_active": false
}
```

**API call (example — email change with required initial password):**
```json
{
    "#request": "AdminUser/update_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "email": "new.email@code4.com",
    "initial_password": "TempPass@789"
}
```

> **Important:** Always include `user_id`. Only include other parameters if their values changed. When `email` is changed, `initial_password` is **mandatory** — the server will reject the request without it (RC 102).

### 3.8 Error Handling

| Server RC | UI Action |
|---|---|
| 0 | Close modal → refresh users list → show success toast: "User updated successfully" |
| 770 | Show "User not found — they may have been deleted." → close modal → refresh list |
| 771 | Show "Cannot deactivate — last admin" prompt (Section 3.8.1) |
| 772 | Show "You cannot change your own role" inline on the role dropdown |
| 102 | Show "An initial password is required when changing the email address" inline on the initial password field |
| 106 | Show "Invalid role selected" inline on the role dropdown |
| 235 | Show "Please enter a valid email address" inline on the email field |
| 240 | Show "A user with this email already exists" inline on the email field |
| 242 | Show password criteria error (from server `message` field) inline on the initial password field |

#### 3.8.1 Last Admin Deactivation Prompt (RC 771)

When the server blocks deactivation because the target is the last active admin:

```
┌─────────────────────────────────────────────────────────┐
│  Cannot Deactivate User                                 │
│                                                         │
│  ⚠ This user cannot be deactivated because they are     │
│  the last active admin in the system.                   │
│                                                         │
│  At least one admin account must remain active at all   │
│  times to ensure system access is never lost.           │
│                                                         │
│                                          [OK]           │
└─────────────────────────────────────────────────────────┘
```

### 3.9 Implementation Checklist — Edit User Modal

- [ ] Create Edit User modal/dialog component
- [ ] On modal open, call `get_user` and populate all fields
- [ ] Display Registration Date as read-only
- [ ] Implement dynamic "Initial Password" field that appears when email is changed (Section 3.4)
- [ ] Add show/hide toggle and real-time password criteria checklist to Initial Password field
- [ ] Disable "Save" button when Initial Password is visible but does not meet criteria
- [ ] Hide Initial Password field (and clear its value) when email reverts to original
- [ ] Show warning banner when Initial Password field is visible (Section 3.4)
- [ ] Include `initial_password` in the `update_user` payload when email is changed
- [ ] Implement role dropdown with pre-selection from current value
- [ ] Disable role dropdown when editing own account (Section 3.5)
- [ ] Add "You cannot change your own role" tooltip on disabled role dropdown
- [ ] Implement Active toggle with deactivation warning (Section 3.6)
- [ ] Track field changes (dirty flags) to send only modified values
- [ ] Call `AdminUser/update_user` with only changed fields + `user_id`
- [ ] Handle all error responses per Section 3.8 with inline field errors
- [ ] Handle RC 102 (missing initial_password) with inline error on password field
- [ ] Handle RC 242 (password criteria) with inline error on password field
- [ ] Handle RC 771 with the "last admin" prompt (Section 3.8.1)
- [ ] On success: close modal, refresh list, show toast

---

## 4. Password Workflows

### 4.1 Password Change on First Login (Mandatory)

**SDS Requirement (Section 5.2.2):** *"The user will have to change it during the first login."*

This workflow is handled by the **platform infrastructure**, not the Admin User module directly. However, the web app must implement the UI for it.

#### 4.1.1 Detection

After calling `User/login`:
- If the server returns a **restricted token** (X-token), the user has an initial password that must be changed.
- The web app must detect this and redirect to the mandatory password change screen.

> **Implementation note:** Check the login response for the indicator that a mandatory password change is required. Do NOT navigate to the dashboard. Instead, show the password change form described below.

#### 4.1.2 Mandatory Change Password Screen

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│                  Change Your Password                    │
│                                                         │
│  Your password must be changed before you can           │
│  continue. This is required for your first login.       │
│                                                         │
│  New Password:          [_________________________]     │
│  Confirm New Password:  [_________________________]     │
│                                                         │
│  Password Requirements:                                 │
│    ✓ At least 8 characters                              │
│    ✗ At least 1 lowercase letter                        │
│    ✓ At least 1 uppercase letter                        │
│    ✓ At least 1 number                                  │
│    ✗ At least 1 special character                       │
│                                                         │
│                           [Change Password]             │
└─────────────────────────────────────────────────────────┘
```

**Fields:**
- **New Password:** Password input with show/hide toggle
- **Confirm New Password:** Must match New Password (client-side check only)
- **Password criteria checklist:** Real-time validation as user types

**API call:**
```json
{
    "#request": "User/mandatory_change_password",
    "#token": "<x_token>",
    "password": "NewSecurePass@456"
}
```

> **Critical:** Use `User/mandatory_change_password` (infrastructure endpoint), NOT `AdminUser/change_password`. Use the X-token from the login response.

**Success:** The server returns a normal token. Store it and navigate to the dashboard.

**Error handling:**
| RC | Action |
|---|---|
| 0 | Store new token → navigate to dashboard |
| 242 | Show password criteria error inline |

#### 4.1.3 Implementation Checklist — Mandatory Password Change

- [ ] Detect restricted token (X-token) in login response
- [ ] Redirect to mandatory password change screen (not dashboard)
- [ ] Implement password change form with real-time criteria checklist
- [ ] Add "Confirm Password" field with client-side match validation
- [ ] Call `User/mandatory_change_password` with X-token
- [ ] On success: store normal token, navigate to dashboard
- [ ] On criteria error (RC 242): show inline error message

---

### 4.2 Voluntary Password Change (Self-Service)

**Purpose:** Any admin user can change their own password at any time from account settings.

#### 4.2.1 Location

Add a **"Change Password"** option in:
- The user profile menu (top-right dropdown)
- OR a dedicated "Account Settings" / "Security" page

#### 4.2.2 Change Password Form

```
┌─────────────────────────────────────────────────────────┐
│                  Change Your Password                    │
│                                                         │
│  Current Password:      [_________________________]     │
│  New Password:          [_________________________]     │
│  Confirm New Password:  [_________________________]     │
│                                                         │
│  Password Requirements:                                 │
│    ✓ At least 8 characters                              │
│    ✓ At least 1 lowercase letter                        │
│    ✓ At least 1 uppercase letter                        │
│    ✓ At least 1 number                                  │
│    ✓ At least 1 special character                       │
│                                                         │
│                [Cancel]  [Change Password]               │
└─────────────────────────────────────────────────────────┘
```

**Fields:**
- **Current Password:** Required. Verifies the user knows their existing password.
- **New Password:** Required. Must meet all criteria.
- **Confirm New Password:** Client-side match check only (not sent to server).

**Client-side validation:**
1. Current password is non-empty
2. New password meets all criteria (Section 2.3 of the Add modal)
3. Confirm password matches new password
4. New password is different from current password (show inline warning if same)

**API call:**
```json
{
    "#request": "AdminUser/change_password",
    "#token": "<token>",
    "current_password": "CurrentPass@123",
    "new_password": "NewSecurePass@456"
}
```

#### 4.2.3 Error Handling

| Server RC | UI Action |
|---|---|
| 0 | Show success toast: "Password changed successfully." User remains logged in. |
| 247 | Show "The current password you entered is incorrect." inline on the Current Password field |
| 242 | Show the server's `message` field inline on the New Password field |
| 248 | Show "Your new password must be different from your current password." inline on the New Password field |

#### 4.2.4 Implementation Checklist — Voluntary Password Change

- [ ] Add "Change Password" option in user profile menu or settings page
- [ ] Implement change password form with three fields
- [ ] Add password criteria checklist (real-time validation)
- [ ] Add "Confirm Password" match validation (client-side)
- [ ] Prevent submission if new password equals current password (client-side warning)
- [ ] Call `AdminUser/change_password` on form submission
- [ ] Handle RC 247 (wrong current password) with inline error
- [ ] Handle RC 242 (criteria not met) with inline error
- [ ] Handle RC 248 (same as current) with inline error
- [ ] On success: show toast, keep user logged in, close form

---

## 5. Reset Password Action

### 5.1 Overview

**SDS Requirement (Section 5.2.3.1):** *"Any admin user can reset another user's password. This action changes the user's password back to the initial one and the user will have to login again and change it."*

**Note:** In the current implementation, only **Super Admins** can reset passwords (endpoint ACL restriction).

### 5.2 Trigger Points

The Reset Password action can be triggered from:
1. **Users list — Actions column:** A "Reset Password" button/icon on each user row
2. **Edit User modal:** A "Reset Password" button/link within the modal

### 5.3 Reset Password Dialog

```
┌──────────────────────────────────────────────────────────┐
│  Reset Password for [First Name] [Last Name]             │
│                                                          │
│  New Initial Password:  [_________________________]      │
│                                                          │
│  Password Requirements:                                  │
│    ✓ At least 8 characters                               │
│    ✗ At least 1 lowercase letter                         │
│    ✓ At least 1 uppercase letter                         │
│    ✓ At least 1 number                                   │
│    ✗ At least 1 special character                        │
│                                                          │
│  ⚠ Warning:                                              │
│  • The user will be logged out immediately.              │
│  • They must change this password on their next login.   │
│  • You must communicate the new password to the user     │
│    through a secure channel.                             │
│                                                          │
│                          [Cancel]  [Reset Password]      │
└──────────────────────────────────────────────────────────┘
```

**Fields:**
- **New Initial Password:** Password input with show/hide toggle. Must meet all password criteria.
- **Password criteria checklist:** Real-time validation as the Super Admin types.

### 5.4 API Call

```json
{
    "#request": "AdminUser/reset_password",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "password": "NewInitPass@789"
}
```

### 5.5 Error Handling

| Server RC | UI Action |
|---|---|
| 0 | Close dialog → show success toast: "Password reset successfully. The user must change it on their next login." |
| 770 | Show "User not found — they may have been deleted." → close dialog → refresh list |
| 242 | Show password criteria error inline on the password field |

### 5.6 Post-Reset Behaviour (Important for UI)

After a successful reset:
- The target user is **immediately logged out** everywhere.
- If the target user is currently viewing the admin portal, their next API call will return `rc: 201` (invalid token) — which the web app should handle by redirecting to the login page.
- The Super Admin must **manually communicate** the new initial password to the user.

### 5.7 Implementation Checklist — Reset Password

- [ ] Add "Reset Password" button/icon in the users list Actions column
- [ ] Optionally add "Reset Password" button in the Edit User modal
- [ ] Create Reset Password dialog with password input and criteria checklist
- [ ] Add warning text about logout and manual password communication
- [ ] Add show/hide toggle on password field
- [ ] Validate password criteria client-side before enabling "Reset" button
- [ ] Call `AdminUser/reset_password` on form submission
- [ ] Handle RC 242 (criteria not met) with inline error
- [ ] Handle RC 770 (user not found) with message and list refresh
- [ ] On success: close dialog, show success toast

---

## 6. User Deletion Flow

### 6.1 Overview

**SDS Requirement (Section 5.2.4):** *"The user can be deleted as long as he is not the only user in the table. One admin user must remain in the users table."*

### 6.2 Trigger

The Delete action is triggered from the **Users list — Actions column** (trash icon).

### 6.3 Confirmation Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Delete User                                            │
│                                                         │
│  Are you sure you want to delete                        │
│  "[First Name] [Last Name]"?                            │
│                                                         │
│  This action cannot be undone. The user will be         │
│  permanently removed from the system.                   │
│                                                         │
│                         [Cancel]  [Delete]              │
└─────────────────────────────────────────────────────────┘
```

### 6.4 API Call

```json
{
    "#request": "AdminUser/delete_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6..."
}
```

### 6.5 Error Handling — Deletion Constraints

| Server RC | UI Action |
|---|---|
| 0 | Close dialog → refresh users list → show success toast: "User deleted successfully" |
| 770 | Show "User not found — they may have already been deleted." → refresh list |
| 771 | Show constraint prompt (Section 6.5.1) |

#### 6.5.1 Constraint Prompt (RC 771)

The `rc: 771` error is returned when:
- The Super Admin is trying to delete their own account, OR
- The target user is the last remaining active admin

**Constraint prompt UI:**

```
┌─────────────────────────────────────────────────────────┐
│  Cannot Delete User                                     │
│                                                         │
│  ⚠ "[First Name] [Last Name]" cannot be deleted.        │
│                                                         │
│  Possible reasons:                                      │
│  • You cannot delete your own account.                  │
│  • This is the last active admin in the system.         │
│    At least one admin must remain at all times.         │
│                                                         │
│  You can deactivate the user instead, which will        │
│  prevent their access while preserving the account.     │
│                                                         │
│              [Cancel]  [Deactivate Instead]              │
└─────────────────────────────────────────────────────────┘
```

**Deactivation action:**
If the Super Admin clicks **[Deactivate Instead]**, call:

```json
{
    "#request": "AdminUser/update_user",
    "#token": "<token>",
    "user_id": "a1b2c3d4e5f6...",
    "is_active": false
}
```

| Deactivation RC | Action |
|---|---|
| 0 | Close prompt → refresh list → show toast: "User deactivated successfully" |
| 771 | Show "Cannot deactivate — this is the last active admin. At least one admin must remain active." → [OK] button only |

> **Note:** If the Super Admin is trying to delete their own account AND they are the last admin, the deactivation will also fail with RC 771. In this case, show the final "last admin" message with no further action options.

### 6.6 Implementation Checklist — User Deletion

- [ ] Add "Delete" button/icon in the users list Actions column
- [ ] Optionally hide Delete button on the Super Admin's own row
- [ ] Implement confirmation dialog with user name
- [ ] Call `AdminUser/delete_user` on confirmation
- [ ] Handle RC 770 (user not found) with message and list refresh
- [ ] Handle RC 771 with constraint prompt showing deactivation option
- [ ] Implement deactivation fallback via `update_user` { is_active: false }
- [ ] Handle deactivation RC 771 (last admin) with final informational message
- [ ] On success: close dialog, refresh list, show toast

---

## 7. Summary of All UI Changes

| Screen | Component | Priority | API Endpoint(s) |
|---|---|---|---|
| Users Management page | Full table with columns, count, search, filter, sort | **High** | `AdminUser/get_users_list` |
| Users Management page | "Add User" button | **High** | — (opens modal) |
| Users Management page | Action buttons per row (Edit, Reset, Delete) | **High** | — (triggers flows) |
| Add User modal | Full form with all fields, role dropdown, password validation | **High** | `AdminUser/add_user` |
| Edit User modal | Pre-populated form with dirty tracking, role editing | **High** | `AdminUser/get_user`, `AdminUser/update_user` |
| Edit User modal | Deactivation warning and last-admin error handling | **High** | `AdminUser/update_user` |
| Edit User modal | Dynamic Initial Password field on email change | **High** | `AdminUser/update_user` |
| Reset Password dialog | Password input with criteria validation | **High** | `AdminUser/reset_password` |
| Delete User flow | Confirmation → constraint handling → deactivation fallback | **High** | `AdminUser/delete_user`, `AdminUser/update_user` |
| Login flow | Mandatory password change detection and redirect | **High** | `User/login`, `User/mandatory_change_password` |
| Account settings | Voluntary change password form | **High** | `AdminUser/change_password` |

---

## 8. Testing Checklist

### Users List Page
- [ ] Page loads with users table populated from `get_users_list`
- [ ] Total count displays correctly above the table
- [ ] Role column shows display names (not integers) with badges
- [ ] Search bar triggers server-side search (verify API call with `search_text`)
- [ ] "Include Inactive" toggle refreshes list with deactivated users
- [ ] Column sort works (click header → API call with `sort_by`/`sort_dir`)
- [ ] Page is inaccessible to non-Super-Admin users (RC 103 or hidden menu)

### Add User
- [ ] Modal opens from "Add User" button
- [ ] All mandatory fields show required indicators
- [ ] Password criteria checklist updates in real-time
- [ ] "Save" button disabled until all mandatory fields are valid
- [ ] On success: modal closes, list refreshes, toast shown
- [ ] On RC 240: "Email already exists" shown inline
- [ ] On RC 242: password criteria error shown inline

### Edit User
- [ ] Modal opens with pre-populated data from `get_user`
- [ ] Only changed fields are sent in `update_user` request
- [ ] Role dropdown pre-selects current role
- [ ] Role dropdown disabled when editing own account
- [ ] "Cannot change your own role" tooltip visible on disabled dropdown
- [ ] On RC 771 (deactivation): "last admin" prompt displayed
- [ ] On RC 772: "Cannot change your own role" message shown
- [ ] Email change dynamically shows "Initial Password" field with criteria checklist
- [ ] "Save" disabled when Initial Password is visible but criteria not met
- [ ] Reverting email to original hides Initial Password field and clears its value
- [ ] `initial_password` is included in payload when email is changed
- [ ] On RC 102: "Initial password required" shown on password field
- [ ] On RC 242: password criteria error shown on Initial Password field
- [ ] Warning banner displayed when Initial Password field is visible

### Reset Password
- [ ] Dialog opens with password input and criteria checklist
- [ ] Warning text about logout and manual communication visible
- [ ] "Reset" button disabled until password meets all criteria
- [ ] On success: dialog closes, toast shown
- [ ] On RC 242: criteria error shown inline

### Delete User
- [ ] Confirmation dialog shows user's full name
- [ ] On success: list refreshes, toast shown
- [ ] On RC 771: constraint prompt with "Deactivate Instead" option
- [ ] "Deactivate Instead" calls `update_user` with `is_active: false`
- [ ] If deactivation also returns RC 771: final "last admin" message shown
- [ ] Delete button hidden or error-handled for own account

### Password Flows
- [ ] New user login triggers mandatory password change screen
- [ ] Mandatory change uses `User/mandatory_change_password` with X-token
- [ ] After mandatory change: normal token stored, dashboard loaded
- [ ] Voluntary change from account settings uses `AdminUser/change_password`
- [ ] Voluntary change: user stays logged in after success
- [ ] RC 247: "Wrong current password" shown inline
- [ ] RC 248: "Same as current" shown inline
