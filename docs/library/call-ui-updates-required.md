# Call Module — UI & Layout Updates Required

**Phase:** 2.3 — Call Module  
**Audience:** Frontend developers (Admin Portal web, Resident mobile app, Officer mobile app)  
**Last Updated:** 2026-08-11

This document describes the exact UI and layout updates required in the Admin Management Portal and Mobile Applications to support the Call module. All data flows reference the APIs documented in `docs/library/call-app-developer-guide.md`.

---

## 1. Admin Management Portal (Web)

### 1.1 Active Calls View — Dispatch Dashboard

**Location:** New primary navigation item: **"Calls"** or **"Dispatch"**.

**Layout:** Real-time table/card view of all incoming calls.

**Data Source:** `Call/get_calls` with `is_open=true`.

#### 1.1.1 Call List Table

| Column | Source Field | Notes |
|---|---|---|
| Call # | `call_id` | Clickable — opens call detail panel |
| Category | `category` | Display as badge with color coding (see §1.1.3) |
| Status | `status` | Badge: green=new, blue=accepted, gray=resolved |
| Priority | `priority` | Badge with urgency color |
| Resident | `resident_name` | Full name of caller |
| Community | `community_name` | Community where call originated |
| Officer | `officer_name` | Assigned officer (empty if `new`) |
| Created | `created_on` | Relative time (e.g., "3 min ago") + absolute on hover |

#### 1.1.2 Filtering Controls

- **Status dropdown:** All, New, Accepted, Resolved, Canceled
- **Category dropdown:** All, Medical Emergency, Security Emergency, Panic, Concierge Service, Test
- **Community dropdown:** All communities, or specific community
- **Search bar:** Free-text search (maps to `search_text` parameter)
- **View toggle:** Active / History (maps to `is_open` parameter)

#### 1.1.3 Emergency/Panic Alert Treatment (SDS 4.4.6)

When a call with `category` = `medical_emergency`, `security_emergency`, or `panic` arrives with `status=new`:

- **Visual:** The row/card must have a **flashing red background** or pulsing red border to indicate an active emergency.
- **Audio:** Play an **audible alarm tone** that repeats until the admin acknowledges or the call is accepted by an officer.
- **Sticky positioning:** Emergency/panic calls in `new` status should always appear at the **top** of the list, regardless of sort order.
- **Desktop notification:** If the browser supports it, fire a system-level desktop notification with the call category and community name.

**Panic-specific enhancement:** Panic calls should have a distinct, more urgent visual treatment than standard emergencies (e.g., different alarm sound, larger alert badge, or full-screen overlay).

#### 1.1.4 Real-Time Updates

- Subscribe to WebSocket `new_notification` events with type `new_service_call`, `new_emergency`, or `panic_button`.
- On receiving a notification, automatically refresh the calls list or prepend the new call to the view without requiring manual page refresh.
- Status changes (accepted, resolved, canceled) should also trigger a list refresh.

### 1.2 Call Detail Panel / Modal

**Triggered by:** Clicking a call row in the list.

**Data Source:** `Call/get_call` with the selected `call_id`.

#### 1.2.1 Detail Sections

**Header:**
- Call ID, category badge, status badge, priority badge
- Created timestamp, last update timestamp

**Caller Information:**
- Resident name (`resident_name`)
- Address (`address`)
- Current location (`current_address`) — highlight for emergencies
- GPS coordinates (`latitude`, `longitude`) — display on an inline map if available

**Call Description:**
- Description text (`description`)
- Media gallery (`media` array — display as thumbnail grid, clickable for full-size)
- Audio player (`audio_url`)
- Video player (`video_url`)

**Schedule (concierge only):**
- Scheduled date (`scheduled_date`)
- Time range (`scheduled_time_from` – `scheduled_time_to`)

**Officer Information (if accepted):**
- Officer name (`officer_name`)
- Assigned by (`assigned_by`) — if admin-assigned
- Accepted on (`accepted_on`)

**Resolution (if resolved):**
- Resolved on (`resolved_on`)
- Officer comments (`officer_comments`)
- Confirmation media gallery (`confirmation_media`)
- Confirmation video player (`confirmation_video_url`)
- Resident reaction (`reaction`: thumbs up/down icon)
- Resident comment (`resident_comment`)

### 1.3 Concierge Assignment Panel

**Triggered by:** Clicking an **"Assign Officer"** button on a `new` concierge service call.

**Layout:** Modal dialog with the following fields:

| Field | Source | Notes |
|---|---|---|
| Call summary | From call detail | Read-only: call ID, description, community, scheduled time |
| Officer selector | Officer list API | Dropdown or searchable list of active officers |
| Confirm button | `Call/assign_call` | Sends `call_id` + `officer_user_id` |

**Behavior:**
- On successful assignment, the call status transitions to `accepted` automatically.
- Close the modal and refresh the call detail to show the assigned officer.
- If the call has already been accepted (RC `568`), show an error message: *"This call has already been assigned to an officer."*

**Note:** The officer selector should ideally show officers from the same community as the call. Use the officer list API filtered by community.

### 1.4 Resolve Call Action

**Location:** Button in the call detail panel. Visible for all `accepted` calls.

**Label:** "Resolve Call"

**On click:** Open a confirmation dialog with optional fields:

| Field | Type | Required | Maps to |
|---|---|---|---|
| Officer Comments | Textarea | No | `officer_comments` |
| Confirmation Photos | File upload (max 5) | No | `confirmation_media_file_ids` |
| Confirmation Video | File upload (1) | No | `confirmation_video_file_id` |

**Important — Panic Calls:** For `panic` category calls, display a visual callout in the resolve dialog:
> **Security Notice:** You are closing a panic alert. Please confirm that safety has been verified via direct communication with the officer on scene.

Admins are the **only** users who can resolve panic calls. The resolve button should always be available for admins regardless of call category.

### 1.5 Cancel Call Action

**Location:** Button in the call detail panel. **Only visible for concierge service calls** in `new` or `accepted` status.

**Behavior:** Confirmation dialog → calls `Call/cancel_call`.

**Important:** Do NOT show a cancel button for emergency or panic calls. The API will reject it (RC `572`), but the button should not be rendered at all for these categories.

### 1.6 Delete Test Call Action

**Location:** Button in the call detail panel. **Only visible for `test` category calls.**

**Behavior:** Confirmation dialog → calls `Call/delete_test_call`.

---

## 2. Resident Mobile App

### 2.1 Emergency & Panic Buttons

**Location:** Main dashboard / home screen of the resident app.

#### 2.1.1 Emergency Button

**Label:** "Emergency" or split into "Medical Emergency" / "Security Emergency"

**Design:**
- Large, prominent button(s) with red/orange color scheme.
- Single-tap activation with a brief confirmation prompt: *"Are you sure you want to send an emergency alert?"*
- On confirm → call `Call/create_call` with appropriate `category`.

**Input collection (optional, shown as expandable form after confirmation):**
- Description text field
- Current location / address (auto-fill from GPS if available)
- Attach photo (camera or gallery → `File/upload_file_base64` → pass file ID in `media_file_ids`)
- Record audio (record → upload → pass file ID in `audio_file_id`)

**Recommendation:** For maximum speed, allow creating the emergency with just the button press (description and media are optional). The resident can add details afterward via `Call/update_call` while the call is still `new`.

#### 2.1.2 Panic Button

**Label:** "Panic" or "SOS"

**Design:**
- Dedicated button, visually distinct from standard emergency buttons.
- Consider a long-press activation (3 seconds) to prevent accidental triggers.
- Minimal input required — automatically captures GPS coordinates and sends immediately.

**Payload:** `{ category: "panic", latitude: "<gps>", longitude: "<gps>" }`

#### 2.1.3 Active Call Reassurance Screen

After creating an emergency or panic call, display an **active call screen**:

**While status = `new` (waiting for officer):**
- Animated waiting indicator (e.g., pulsing circle)
- Text: *"Your alert has been sent. An officer is being dispatched."*
- Call details summary (category, time created)
- Option to add description/media if not yet provided

**When status = `accepted` (officer responding):**
- Officer name and title displayed prominently
- Text: *"Officer [name] is responding to your call."*
- Show accepted timestamp

**Transition trigger:** Listen for `call_accepted` push notification or WebSocket event → refresh call details → update the screen.

### 2.2 Concierge Service Request Form

**Location:** Secondary action from dashboard or a "Services" section.

**Form Fields:**

| Field | Type | Required | Maps to |
|---|---|---|---|
| Service Type | Dropdown | Yes | `service_type` |
| Description | Textarea | No | `description` |
| Priority | Segmented control | No (default: normal) | `priority` |
| Preferred Date | Date picker | No | `scheduled_date` |
| Preferred Time From | Time picker | No | `scheduled_time_from` |
| Preferred Time To | Time picker | No | `scheduled_time_to` |
| Photos | Image picker (max 5) | No | `media_file_ids` |
| Audio Note | Audio recorder | No | `audio_file_id` |

**Service Type Dropdown:** Populate from the server's configured service types (available via settings API).

**On submit:** Upload any media files first, then call `Call/create_call` with `category: "concierge_service"`.

**Post-submit screen:** Confirmation message: *"Your service request has been submitted. A manager will review and assign an officer."*

### 2.3 My Calls List

**Location:** Tab or section in the resident app.

**Data Source:** `Call/get_calls` (resident token → automatically filtered to own calls).

**Layout:** Two tabs or segments:
- **Active** (`is_open=true`) — calls in `new` or `accepted` status
- **History** (`is_open=false`) — resolved and canceled calls

Each call card should show: category icon/badge, status badge, description preview, created date, officer name (if accepted).

### 2.4 Call Detail Screen

**On tap from My Calls list** → `Call/get_call`.

Display all call fields as described in §1.2.1 (adapted for mobile layout).

**Action buttons (contextual):**
- **Edit** — visible only if call is `new` (resident can update) → navigates to edit form using `Call/update_call`.
- **Cancel** — visible only for concierge service calls in `new`/`accepted` status → `Call/cancel_call`.

### 2.5 Resolution Feedback Screen

When a call transitions to `resolved`, prompt the resident to provide feedback.

**Layout:**
- Officer comments and confirmation media displayed as a summary.
- **Reaction:** Thumbs up / thumbs down buttons → `Call/add_reaction` with `reaction: 1` or `reaction: -1`.
- **Comment:** Text field + submit button → `Call/add_comment`.

This screen can be shown as a modal overlay on the call detail or as a dedicated screen navigated to from the `call_resolved` push notification.

---

## 3. Officer Mobile App

### 3.1 Panic Trigger Button

**Location:** Always accessible from the main navigation bar or as a floating action button.

**Design:**
- Prominent red "SOS" or "PANIC" button.
- Long-press activation (3 seconds) recommended to prevent accidental triggers.
- On activation → `Call/create_call` with `category: "panic"`, auto-captured GPS coordinates.

**Post-trigger screen:** *"Panic alert sent. All officers in your community have been notified. Awaiting operator response."*

### 3.2 Dispatch Queue (Emergency/Panic Feed)

**Location:** Primary tab — "Dispatch" or "Alerts"

**Data Source:** `Call/get_calls` with `is_open=true`. The server automatically filters to show:
- Unassigned emergency/panic calls in the officer's community
- Calls assigned to this officer

**Layout:** Card-based feed, sorted by creation time (newest first).

#### 3.2.1 Emergency/Panic Call Card

| Element | Source | Visual |
|---|---|---|
| Category | `category` | Color-coded icon (red for emergency, flashing for panic) |
| Status | `status` | Badge |
| Resident Name | `resident_name` | Bold text |
| Location | `current_address` or `address` | Below name |
| Time | `created_on` | Relative time ("2 min ago") |
| **Accept Button** | `Call/accept_call` | Green, prominent |
| **Pass Button** | `Call/pass_call` | Gray/secondary |

**Accept button behavior:**
- On tap → call `Call/accept_call`.
- On success → navigate to the active call detail screen.
- On RC `568` (already accepted) → show toast: *"This call has already been accepted by another officer."* Remove the card from the feed.

**Pass button behavior:**
- On tap → brief confirmation: *"Pass this call? It will be removed from your feed."*
- On confirm → call `Call/pass_call`.
- On success → animate the card out of the feed. The call is no longer visible to this officer.

#### 3.2.2 Real-Time Updates

- Subscribe to push notifications of type `new_emergency` and `panic_button`.
- On receiving → prepend the new call to the dispatch queue with entry animation.
- Play a distinct alert sound for each type (more urgent for panic).

### 3.3 Task List (Assigned Concierge Service Calls)

**Location:** Secondary tab — "My Tasks" or "Assigned"

**Data Source:** `Call/get_calls` with `is_open=true`, `category=concierge_service`.

**Layout:** List of concierge service calls assigned to this officer by an admin.

#### 3.3.1 Task Card

| Element | Source | Visual |
|---|---|---|
| Service Type | `service_type` | Icon + label |
| Description | `description` | Preview text |
| Scheduled Date | `scheduled_date` | Date badge |
| Time Slot | `scheduled_time_from` – `scheduled_time_to` | Time range |
| Resident | `resident_name` | Name + address |
| Status | `status` | Badge (always `accepted` for assigned tasks) |

**On tap → Navigate to task detail screen** → `Call/get_call`.

### 3.4 Active Call Detail Screen (Officer View)

When an officer is actively handling a call (status = `accepted`):

#### 3.4.1 Information Display

- Full call details (all fields from the call object)
- Resident location on embedded map (if coordinates available)
- Media gallery, audio/video players

#### 3.4.2 Officer Actions

**Add Comments / Evidence:**
- Text input for `officer_comments`
- Photo capture for `confirmation_media_file_ids` (max 5)
- Video capture for `confirmation_video_file_id`
- Submit via `Call/update_call`

**Resolve Call:**
- "Resolve" button → opens resolution form with optional comments and media
- Submits via `Call/resolve_call`

#### 3.4.3 Panic Call Restriction (CRITICAL)

**When `call.category === "panic"`:**

- **DO NOT render a "Resolve" button.**
- **Display an informational banner at the top or bottom of the screen:**

  > **Awaiting Operator Closure — Maintain communication.**

- The officer can still:
  - Add/update comments via `Call/update_call`
  - Upload confirmation media via `Call/update_call`
- But the officer **cannot** close the call. Only an admin (operator) can resolve panic calls.

**Implementation check:** If the officer attempts to call `Call/resolve_call` on a panic call, the server returns RC `103` (No Privileges). However, the UI should prevent this attempt entirely by hiding the resolve button.

### 3.5 Call History

**Location:** Third tab or section — "History"

**Data Source:** `Call/get_calls` with `is_open=false`.

Shows all resolved and canceled calls the officer was involved in. Read-only — no action buttons.

Each history card shows: category, resident name, resolution date, officer comments preview, resident reaction (if any).

---

## 4. Notification Handling (All Apps)

### 4.1 Push Notification Actions

| Notification Type | App | Action on Tap |
|---|---|---|
| `new_emergency` | Officer | Navigate to dispatch queue |
| `panic_button` | Officer | Navigate to dispatch queue with panic filter |
| `new_service_call` | Admin Portal | Navigate to active calls dashboard |
| `call_accepted` | Resident | Navigate to active call screen (show officer info) |
| `call_updated` | Resident / Officer | Navigate to call detail (refresh data) |
| `call_resolved` | Resident | Navigate to resolution feedback screen |
| `call_canceled` | Resident / Officer | Navigate to call detail (show canceled state) |
| `resident_like` | Officer | Navigate to call detail (informational) |

### 4.2 WebSocket Real-Time Events

Subscribe to `new_notification` WebSocket events. The payload includes:
- `type` — notification type string
- `title` — notification title
- `message` — notification body text

Use these events for in-app real-time updates without requiring the user to tap a push notification.

---

## 5. Visual Design Guidelines

### 5.1 Category Color Coding

| Category | Color | Icon Suggestion |
|---|---|---|
| Medical Emergency | Red (#E53E3E) | Medical cross / ambulance |
| Security Emergency | Orange (#DD6B20) | Shield / alert triangle |
| Panic | Dark Red (#C53030) with pulsing animation | SOS / exclamation |
| Concierge Service | Blue (#3182CE) | Concierge bell / wrench |
| Test | Gray (#718096) | Test tube / checkmark |

### 5.2 Status Badge Colors

| Status | Color | Label |
|---|---|---|
| New | Yellow/Amber (#D69E2E) | NEW |
| Accepted | Blue (#3182CE) | ACCEPTED |
| Resolved | Green (#38A169) | RESOLVED |
| Canceled | Gray (#A0AEC0) | CANCELED |

### 5.3 Priority Indicators

| Priority | Color | Visual |
|---|---|---|
| Urgent | Red | Filled red dot / exclamation icon |
| Important | Orange | Filled orange dot |
| Normal | Blue | Filled blue dot |
| Low | Gray | Outline dot |
