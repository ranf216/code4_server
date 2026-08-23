# Task Module — UI Updates Required

**Module:** Phase 3.2 — Task (Maintenance)  
**Version:** 4.5.0  
**Audience:** Web Admin Portal and Mobile App UI/UX designers and frontend developers

---

## 1. Admin Web Management Portal

### 1.1 Task Dashboard Grid

**Location:** New top-level menu item "Tasks" in the main navigation sidebar.

**Grid columns:**

| # | Column | Source Field | Width | Notes |
|---|--------|-------------|-------|-------|
| 1 | ID | `task_id` | 60px | Right-aligned, clickable → opens detail view |
| 2 | Type | `task_type_name` | 120px | Display name from metadata |
| 3 | Description | `description` | Flex | Truncate with ellipsis at 80 characters |
| 4 | Priority | `priority` | 90px | Color-coded badge (see Priority Visual Encoding below) |
| 5 | Status | `status` | 100px | Color-coded status tag (see Status Visual Encoding below) |
| 6 | Assigned To | `assigned_to_name` | 130px | Full name. Show "Unassigned" in muted text if null |
| 7 | Community | `community_name` | 130px | Community name |
| 8 | Created | `created_on` | 130px | Formatted date-time, relative time tooltip |
| 9 | Last Update | `last_update` | 130px | Formatted date-time. Show "—" if null |

**Priority visual encoding:**

| Priority | Badge Color | Icon |
|----------|-------------|------|
| `urgent` | Red (#DC3545), bold text | Exclamation circle |
| `important` | Orange (#FD7E14) | Arrow up |
| `normal` | Blue (#0D6EFD) | Minus (neutral) |
| `low` | Gray (#6C757D) | Arrow down |

**Status visual encoding:**

| Status | Tag Color | Background |
|--------|-----------|------------|
| `new` | White text | Blue (#0D6EFD) |
| `accepted` | White text | Teal (#0DCAF0) |
| `approved` | White text | Indigo (#6610F2) |
| `completed` | White text | Green (#198754) |
| `rejected` | White text | Red (#DC3545) |
| `canceled` | White text | Gray (#6C757D) |

**Toolbar controls:**

| Control | Type | Behavior |
|---------|------|----------|
| Status filter | Dropdown (multi-select) | Filters by one or more statuses. Populate from `Task/get_task_metadata` → `task_statuses` |
| Type filter | Dropdown | Filters by task type. Populate from `task_types` |
| Priority filter | Dropdown | Filters by priority. Populate from `task_priorities` |
| Community filter | Dropdown | Admin only. Lists all active communities. Default: "All" (value `0`) |
| Active/History toggle | Segmented button | Three states: "Active" (`is_open: true` — open + recently completed <24h), "History" (`is_open: false` — canceled, rejected, completed >24h), "All" (`is_open: null`) |
| Search | Text input with debounce (300ms) | Maps to `search_text` parameter |
| Date range | Date picker (from/to) | Maps to `date_from` / `date_to` |
| Sort | Column header click | Toggles `sort_by` + `sort_dir`. Show sort indicator arrow |
| Create Task | Primary button (top-right) | Opens Create Task modal |

**Pagination:**
- Use `offset` / `limit` with `total_count` to render page controls.
- Default page size: 20. Allow 20/50/100 selector.
- Display "Showing X–Y of Z tasks".

**Empty state:** Show "No tasks found" with a call-to-action "Create Task" button when the list is empty.

**Auto-refresh:** Optionally refresh the list every 60 seconds to surface new tasks and status changes. Disable auto-refresh when any modal is open.

---

### 1.2 Task Detail View

**Access:** Click any row in the Task Dashboard Grid, or navigate via push notification deep-link.

**API call:** `Task/get_task` with the selected `task_id`.

**Layout — Three sections:**

#### Section A: Task Header

| Field | Display |
|-------|---------|
| Task ID + Type | "Task #42 — Supply Request" (bold heading) |
| Status | Color-coded tag (same encoding as grid) |
| Priority | Color-coded badge |
| Community | Community name |
| Created by | Creator's full name, creation date |
| Assigned to | Assignee's full name. Clickable "Reassign" link (admins only, open tasks only) |
| ETA | Date-time or "Not set". Editable inline (admin only, open tasks only) |

#### Section B: Activity Timeline

Display comments and media in a unified chronological timeline:
- **Comments** shown as chat-style bubbles with author name, text, and timestamp.
- **Media** shown as thumbnail grid (images/video) or file-name links (documents) with uploader name and timestamp.
- **Confirmation media** distinguished with a "Confirmation" badge on the thumbnail.
- Add Comment input at the bottom of the timeline (always visible).

#### Section C: Action Bar

Display action buttons based on the task's current status and the logged-in admin's role. **All buttons should be conditionally rendered based on the rules below.**

| Button | Visible When | API Call |
|--------|-------------|----------|
| Accept | Status = `new` | `Task/accept_task` |
| Approve | Status = `accepted` AND task type requires approval AND admin has approval privilege | `Task/approve_task` |
| Complete | Status = `accepted` or `approved` | `Task/complete_task` |
| Reject | Status = `new` or `accepted` | `Task/reject_task` |
| Cancel | Any open status | `Task/cancel_task` |
| Reassign | Any open status | `Task/reassign_task` |
| Edit | Any open status | `Task/update_task` |
| Add Media | Always (task exists) | `Task/add_task_media` |

---

### 1.3 Create Task Modal

**Trigger:** "Create Task" button in the dashboard toolbar.

**Form fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Task Type | Dropdown | Yes | Populated from `Task/get_task_metadata` → `task_types` |
| Description | Textarea | Yes | Max 500 characters, show character counter |
| Priority | Dropdown | No | Default: "Normal". Populated from `task_priorities` |
| Address | Text input | No | Max 500 characters |
| Assign To | User search/dropdown | No | Search active officers/admins. If left empty, server auto-assigns |
| Community | Dropdown | Conditional | Show for admins. Auto-set when "Assign To" is selected (derived from assignee's community). If both are empty, uses admin's community |
| Images | File upload area | No | Accept image types, max 5 files. Show thumbnail previews |
| Video | File upload button | No | Accept video types, max 1 file. Show video thumbnail |
| Documents | File upload area | No | Accept PDF, XLSX, CSV, TXT, PNG, JPEG. Show filename list |

**Submit flow:**
1. Upload each attached file via `File/upload_file_base64`, collecting `file_id` values.
2. Call `Task/create_task` with all form data + collected file IDs.
3. On success: close modal, refresh the grid, show success toast with the new task ID.
4. On error: display the error message inline. Do not close the modal.

**"Assign To" dropdown behavior:**
- Show a search input that queries active users.
- Display user name and community in each option.
- Include a "Auto-assign (default manager)" placeholder option when the field is empty.

---

### 1.4 Approval Modal

**Trigger:** "Approve" button in the task detail action bar.

**Visibility rule:** The "Approve" button must be **hidden** unless ALL of the following are true:
1. Task status is `accepted`.
2. Task type is in the approval-required list (`supply_request`, `damaged_equipment`). Check the task's `task_type` against the approval types obtained from the task metadata or a hardcoded client-side list.
3. The logged-in admin has an approval-eligible role. Check the session user's roles for Planning, Logistics, or Finance. If the user is an admin (any admin can approve per OR semantics), the button is also visible.

**Modal contents:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Reassign To | User dropdown | No | Optional: reassign the task to a different officer during approval. If left empty, the current assignee is retained |
| Approval Notes | Textarea | No | Added as a comment via `Task/add_task_comment` before approval |

**Submit flow:**
1. If approval notes provided: call `Task/add_task_comment` first.
2. Call `Task/approve_task` with optional `assigned_to`.
3. On success: close modal, refresh task detail, show toast "Task approved".

---

### 1.5 Rejection Modal

**Trigger:** "Reject" button in the task detail action bar.

**Modal contents:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Rejection Reason | Textarea | Yes | Mandatory. Maps to `comment` parameter |

**Submit:** `Task/reject_task` with `task_id` and `comment`.

---

### 1.6 Completion Modal

**Trigger:** "Complete" button in the task detail action bar.

**Modal contents:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Resolution Comment | Textarea | No | Optional summary of how the task was resolved |
| Confirmation Images | File upload | No | Max 5 images proving completion |
| Confirmation Video | File upload | No | Max 1 video |

**Submit flow:**
1. Upload confirmation files via `File/upload_file_base64`.
2. Call `Task/complete_task` with `task_id`, optional `comment`, and file IDs.

---

### 1.7 Reassign Modal

**Trigger:** "Reassign" link in the task header or "Reassign" button in the action bar.

**Modal contents:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| New Assignee | User search/dropdown | Yes | Search active officers/admins |

**Submit:** `Task/reassign_task` with `task_id` and `assigned_to`.

---

### 1.8 Role-Based Control Summary (Admin Portal)

| UI Element | Admin (no role) | Admin + Planning/Logistics/Finance |
|-----------|----------------|-----------------------------------|
| View all tasks | Yes | Yes |
| Create task | Yes | Yes |
| Edit task | Yes | Yes |
| Accept task | Yes | Yes |
| **Approve button** | **Yes (all admins)** | **Yes** |
| Complete task | Yes | Yes |
| Reject task | Yes | Yes |
| Cancel task | Yes (any open) | Yes (any open) |
| Reassign task | Yes | Yes |
| Set ETA | Yes | Yes |

**Note:** Since ACL uses OR semantics, all admin users can approve tasks. The Planning/Logistics/Finance roles extend approval access to non-admin users who hold those roles.

---

## 2. Officer Mobile App

### 2.1 Task Navigation

Add a "Tasks" tab in the bottom navigation bar (between existing tabs as determined by UX).

**Tab icon:** Clipboard or wrench icon.

**Badge:** Show the count of tasks assigned to the officer in open statuses. Query with `Task/get_tasks_list { scope: "assigned_to_me", is_open: true, limit: 0 }` and use `total_count` as the badge value. Refresh on app foreground and after push notifications.

---

### 2.2 Create Task Button

**Location:** Floating action button (FAB) on the task list screen, or a "+" button in the navigation bar.

**Form layout — streamlined for field use:**

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| Task Type | Segmented pills or dropdown | Yes | Show icons for common types (wrench = maintenance, box = supply request, warning = damaged equipment) |
| Description | Multi-line text input | Yes | Auto-expand, max 500 chars, character counter |
| Priority | Horizontal pill selector | No | Default "Normal". Color-coded pills matching priority encoding |
| Address | Text input | No | Include a "Use Current Location" button that fills the address from GPS (if available) |
| Images | Camera + gallery button | No | Tap to open camera or gallery. Show thumbnail strip. Max 5. Allow swipe-to-remove |
| Video | Video capture button | No | Tap to record or select. Show video thumbnail. Max 1 |
| Documents | File picker button | No | Open system file picker. Show filename list with file-type icons |

**Submit behavior:**
1. Show a loading spinner overlay.
2. Upload each file sequentially via `File/upload_file_base64`.
3. Call `Task/create_task` (no `assigned_to` — server auto-assigns).
4. On success: navigate to the new task's detail screen. Show success toast.
5. On error: show inline error banner. Keep form populated for retry.

**Offline draft (future enhancement):** If the device is offline, save the form locally and auto-submit when connectivity is restored.

---

### 2.3 Task List Screen

**Two tabs at the top:**

| Tab | API Parameters | Content |
|-----|---------------|---------|
| **My Tasks** | `scope: "assigned_to_me", is_open: true, sort_by: "priority", sort_dir: "desc"` | Active tasks: open statuses + completed tasks less than 24h old, sorted by priority |
| **History** | `scope: "assigned_to_me", is_open: false, sort_by: "created_on", sort_dir: "desc"` | Archived tasks: canceled and rejected immediately, completed only after 24h |

**24-hour history rule:** When an officer completes a task, it does NOT immediately disappear from "My Tasks". The task remains visible in the active feed for 24 hours as visual confirmation of work done, then automatically transitions to History. Canceled tasks move to History immediately.

**Task card layout (each list item):**

```
┌─────────────────────────────────────────────┐
│ [Priority Badge]  Task #42                  │
│ Maintenance                                 │
│                                             │
│ Broken window in lobby                      │
│ Building A, Floor 3                         │
│                                             │
│ [Status Tag]          Created: 2h ago       │
└─────────────────────────────────────────────┘
```

- **Priority badge:** Left-edge colored stripe or circular badge using priority color encoding.
- **Urgent indicator:** For `urgent` priority, apply a subtle pulsing red glow animation on the card's left border to draw immediate attention. Do NOT use a full-card flash — this must be non-disruptive.
- **Status tag:** Color-coded pill at the bottom-left.
- **Timestamps:** Use relative time ("2h ago", "Yesterday") with exact date-time in a tooltip/long-press.

**Pull-to-refresh:** Reload the current tab's data.

**Infinite scroll:** Load more items using `offset` pagination when scrolling near the bottom.

**Empty states:**
- **My Tasks (empty):** "No tasks assigned to you. You're all caught up!"
- **History (empty):** "No completed tasks yet."

---

### 2.4 Task Detail Screen

**Access:** Tap a task card in the list, or deep-link from a push notification.

**API call:** `Task/get_task`.

**Layout sections:**

#### Section 1: Header Card

| Field | Display |
|-------|---------|
| Task type + ID | "Supply Request #42" |
| Status | Large color-coded tag |
| Priority | Badge with icon |
| Description | Full text (expandable if long) |
| Address | With a "Navigate" link that opens the device's map app |
| Created by | Name + relative date |
| Assigned to | Name |
| ETA | Date-time or "Not set" |

#### Section 2: Progress Tracker

A horizontal step indicator showing the task lifecycle:

**For approval-required task types** (e.g., `supply_request`, `damaged_equipment`):
```
[ New ] ──── [ Accepted ] ──── [ Approved ] ──── [ Completed ]
   ●              ●                ○                  ○
```

**For routine task types** (e.g., `maintenance`):
```
[ New ] ──── [ Accepted ] ──── [ Completed ]
   ●              ●                ○
```

- Completed steps: filled circle, bold text.
- Current step: filled circle, highlighted color.
- Future steps: empty circle, muted text.
- If rejected/canceled: show a red "X" step at the point of rejection/cancellation.

**Pending Approval state:** When the task type requires approval and the status is `accepted`, display a prominent banner:
```
┌─────────────────────────────────────────┐
│  ⏳ Pending Approval                    │
│  This task requires admin approval      │
│  before it can be completed.            │
└─────────────────────────────────────────┘
```

#### Section 3: Activity Feed

Chronological timeline of comments and media (same as admin, but mobile-optimized):
- Comments as chat bubbles with avatar initials.
- Media as a horizontal scrollable thumbnail strip.
- Confirmation media distinguished with a green "Confirmation" badge.
- "Add Comment" input pinned at the bottom of the screen.

#### Section 4: Action Buttons

Fixed at the bottom of the screen. Show only the actions available for the current state:

| Status | Primary Action | Secondary Actions |
|--------|---------------|-------------------|
| `new` (assigned to me) | **Accept** (green, full-width) | — |
| `new` (created by me) | — | Cancel |
| `accepted` (routine type) | **Complete** (green) | Add Media, Reject |
| `accepted` (approval type) | *Disabled "Complete" with tooltip "Awaiting approval"* | Add Media, Reject |
| `approved` | **Complete** (green) | Add Media |
| `completed` | *No actions* | — |
| `rejected` | *No actions* | — |
| `canceled` | *No actions* | — |

---

### 2.5 Action Restrictions — Approval-Required Tasks

For task types that require approval (`supply_request`, `damaged_equipment`):

1. **After acceptance (status = `accepted`):**
   - The progress tracker shows "Pending Approval" between Accepted and Completed.
   - The "Complete" button is **disabled** with gray styling and a label: "Awaiting admin approval".
   - Tapping the disabled button shows a tooltip/snackbar: "This task requires admin approval before it can be completed."
   - The officer CAN still:
     - Add comments.
     - Add media attachments.
     - Reject the task (if circumstances changed).

2. **After admin approval (status = `approved`):**
   - The progress tracker advances to show "Approved" as completed.
   - The "Complete" button becomes **enabled** with green styling.
   - A file attachment area appears labeled "Attach Confirmation" for uploading completion evidence (receipts, photos).
   - The "Complete" action opens a bottom sheet with:
     - Optional resolution comment text field.
     - Confirmation image upload (camera + gallery, max 5).
     - Confirmation video upload (camera, max 1).
     - "Mark Complete" submit button.

---

### 2.6 Completion Flow (Mobile)

**Trigger:** Tap the "Complete" button on an accepted (routine) or approved (approval-required) task.

**Bottom sheet contents:**

```
┌─────────────────────────────────────────┐
│  Complete Task #42                      │
│                                         │
│  Resolution Notes (optional)            │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Confirmation Photos                    │
│  [📷 Camera] [🖼 Gallery]  (max 5)    │
│  ┌──────┐ ┌──────┐                     │
│  │ img1 │ │ img2 │                     │
│  └──────┘ └──────┘                     │
│                                         │
│  Confirmation Video                     │
│  [🎥 Record]  (max 1)                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │       ✓  Mark Complete            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Submit flow:**
1. Upload confirmation files via `File/upload_file_base64`.
2. Call `Task/complete_task` with the task ID, comment, and file IDs.
3. On success: dismiss bottom sheet, refresh detail screen, show success animation.

---

### 2.7 Rejection Flow (Mobile)

**Trigger:** Tap "Reject" in the secondary actions.

**Bottom sheet:**
- Mandatory "Rejection Reason" textarea.
- "Reject Task" button (red).

**Submit:** `Task/reject_task` with `task_id` and `comment`.

---

### 2.8 Push Notification Handling

| Notification Type | In-App Banner Text | Action on Tap |
|------------------|-------------------|---------------|
| `new_task` | "New task assigned: [task_type]" | Navigate to task detail |
| `task_accepted` | "Task #[id] accepted by [name]" | Navigate to task detail |
| `task_completed` | "Task #[id] completed by [name]" | Navigate to task detail |
| `task_rejected` | "Task #[id] rejected by [name]" | Navigate to task detail |
| `task_canceled` | "Task #[id] canceled" | Navigate to task detail |
| `task_reassigned` | "Task #[id] reassigned to you" | Navigate to task detail |
| `task_commented` | "[name] commented on task #[id]" | Navigate to task detail, scroll to latest comment |
| `task_update` | "Task #[id] updated" | Navigate to task detail |

**Badge management:** After the user views the task detail screen, decrement the notification badge count.

---

## 3. Shared UI Components

### 3.1 Priority Selector (Reusable)

A horizontal row of tappable pills, one per priority. The active selection has a filled background with the priority color; inactive pills have an outlined style.

```
  [ Urgent ]  [ Important ]  [ Normal ]  [ Low ]
      red        orange        blue       gray
```

### 3.2 Status Tag (Reusable)

A compact pill/badge component that accepts a status ID and renders the appropriate color and label. Used in grids, cards, and detail views.

### 3.3 Task Type Icon Map

| Task Type Key | Suggested Icon | Description |
|--------------|---------------|-------------|
| `maintenance` | Wrench | General maintenance |
| `supply_request` | Box/Package | Supply procurement |
| `damaged_equipment` | Warning triangle | Equipment damage report |
| `inspection` | Magnifying glass | Inspection task |
| `cleaning` | Broom | Cleaning task |

Since task types are DB-backed, new types may not have predefined icons. Provide a default icon (clipboard) for unknown types.

---

## 4. Accessibility & Localization Notes

- All status and priority labels should use the display names from `Task/get_task_metadata`, not hardcoded strings. This supports future localization.
- Color-coded elements (priority badges, status tags) must also display text labels. Do not rely solely on color to convey meaning.
- All buttons must have accessible labels for screen readers.
- Form validation errors should be announced to assistive technologies.
- The progress tracker step indicators must be keyboard-navigable on web and accessible via VoiceOver/TalkBack on mobile.
