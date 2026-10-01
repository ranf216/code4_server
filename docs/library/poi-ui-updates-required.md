# POI Module — UI Updates Required

**Phase:** 6.2 — Persons of Interest
**Audience:** Frontend developers (Web Admin Portal, Mobile Officer App)

---

## 1. Web Admin Portal — POI Registry Workspace

### 1.1 Navigation & Entry Point

Add a **"POI Registry"** item to the main admin sidebar navigation, below "Post Orders" and above "Reports". Icon suggestion: shield or person-alert.

### 1.2 POI Dashboard — Registry Table

**Route:** `/poi`

#### Tab Navigation

Display record type tabs for filtering:

| Tab | API Filter | Description |
|-----|-----------|-------------|
| All | `record_type=""` | All record types |
| Persons of Interest | `record_type="poi"` | POI records only |
| Trespass Orders | `record_type="trespass"` | Trespass orders only |
| Metro Red Cards | `record_type="metro_red_card"` | Metro Red Cards only |

Each tab shows the count of matching records (from `total_count` in the API response).

#### Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Photo | `photo_url` | Circular thumbnail, 40px. Placeholder if `null` |
| Name | `full_name` | Bold. Show `known_aliases` in grey below if present |
| Type | `record_type_name` | Pill badge |
| Threat Level | `threat_level_name` | Color-coded pill (see below) |
| Status | `status` | Color-coded pill (see below) |
| Communities | `sites[].community_name` | Comma-joined, truncate with "+N" |
| Expiry | `expiry_date` | Red text if within 14 days. "—" if null |
| Last Updated | `last_update` | Relative time (e.g., "2h ago") |
| Actions | — | Detail, Edit, Status actions (context menu) |

#### Status Pill Colors

| Status | Background | Text |
|--------|-----------|------|
| Draft | `#E0E0E0` (grey) | `#616161` |
| Active | `#E8F5E9` (green) | `#2E7D32` |
| Expired | `#FFF3E0` (orange) | `#E65100` |
| Inactive | `#FFEBEE` (red) | `#C62828` |
| Archived | `#F5F5F5` (light grey) | `#9E9E9E` |

#### Threat Level Pill Colors

| Level | Background | Text | Icon |
|-------|-----------|------|------|
| Critical | `#F44336` (red) | `#FFFFFF` | ⚠ filled |
| High | `#FF9800` (orange) | `#FFFFFF` | ⚠ outline |
| Medium | `#FFC107` (amber) | `#333333` | — |
| Low | `#2196F3` (blue) | `#FFFFFF` | — |

#### Toolbar

- **Search:** Text input bound to `search_text` parameter. Searches across name, aliases, summary, and record ID. Debounce 400ms.
- **Status filter:** Dropdown bound to `status` parameter. Options from `POI/get_poi_metadata → statuses`.
- **Community filter:** Dropdown bound to `community_id` parameter. Options from existing community list endpoint.
- **Threat level filter:** Dropdown bound to `threat_level` parameter. Options from `POI/get_poi_metadata → threat_levels`.
- **Expiring soon:** Toggle/chip that sets `expiring_within_days=14`.
- **Sort:** Column header click toggles `sort_by` + `sort_dir`.
- **"+ New Record"** button: Opens the authoring modal.

#### Pagination

Standard 0-based pagination bar using `offset`, `limit`, and `total_count`. Default page size: 20.

---

### 1.3 POI Authoring Modal / Drawer

**Trigger:** "+ New Record" button or "Edit" action on existing record.
**API:** `POI/create_poi_record` (new) or `POI/update_poi_record` (edit).

#### Step 1 — Record Type & Subject Profile

| Field | API Parameter | Validation | Notes |
|-------|--------------|------------|-------|
| Record Type | `record_type` | Required (create only) | Radio group: Person of Interest, Trespass Order, Metro Red Card. Locked after creation. |
| First Name | `first_name` | Required, max 60 chars | |
| Last Name | `last_name` | Required, max 60 chars | |
| Known Aliases | `known_aliases` | Max 200 chars | Comma-separated text input |
| Date of Birth | `date_of_birth` | `YYYY-MM-DD` | Date picker |
| Gender | `gender` | Optional | Dropdown from `POI/get_poi_metadata → genders` |

#### Step 2 — Physical Description & Photos

| Field | API Parameter | Validation | Notes |
|-------|--------------|------------|-------|
| Physical Description | `physical_description` | Max 500 chars | Textarea |
| Photos | `photo_file_ids` | Min 1, max 10 | Upload via `File/upload_file_base64`. Drag-to-reorder sets `sort_order`. First photo = primary. |

Photo uploader requirements:
- Grid layout showing uploaded photos.
- Drag-and-drop reordering (order maps to array index).
- Add/remove individual photos.
- Visual indicator for the primary photo (index 0).
- On edit: pre-populate with existing photos from `get_poi_record → photos[]`.

#### Step 3 — Assessment & Notes

| Field | API Parameter | Validation | Notes |
|-------|--------------|------------|-------|
| Threat Level | `threat_level` | Required | Dropdown with color indicators from metadata |
| Summary | `summary` | Required, max 300 chars | Textarea. Explain: "Visible to officers in the field" |
| Internal Notes | `internal_notes` | Max 2000 chars | Textarea. Label: "Admin/Manager only — NOT visible to officers" |

#### Step 4 — Type-Specific Fields

**Conditionally shown based on `record_type`:**

**POI type:**

| Field | API Parameter | Notes |
|-------|--------------|-------|
| Incident History Summary | `incident_history_summary` | Max 1000 chars |
| Watch Level Review Date | `watch_level_review_date` | Date picker |
| Associated Individuals | `associated_individuals` | Max 500 chars |

**Trespass type:**

| Field | API Parameter | Required | Notes |
|-------|--------------|:--------:|-------|
| Notice Number | `trespass_notice_number` | ✅ | |
| Issuing Authority | `issuing_authority` | ✅ | |
| Property/Area Covered | `property_area_covered` | ✅ | |
| Issue Date | `issue_date` | ✅ | Date picker |
| Expiry Date | `expiry_date` | ✅ | Date picker |
| Notice Document | `notice_document_file_id` | ✅ | File upload (PDF/JPG/PNG, max 20 MB) |
| Law Enforcement Contact | `law_enforcement_contact` | | |
| Conditions | `conditions` | | |
| Renewal Reminder Days | `renewal_reminder_days` | | Default from settings |

**Metro Red Card type:**

| Field | API Parameter | Required | Notes |
|-------|--------------|:--------:|-------|
| Card Number | `red_card_number` | ✅ | |
| Issuing Authority | `issuing_authority` | ✅ | |
| Issue Date | `issue_date` | ✅ | Date picker |
| Expiry Date | `expiry_date` | ✅ | Date picker |
| Transit Lines/Stations | `lines` | | |
| Card Document | `card_document_file_id` | | File upload |
| Renewal Reminder Days | `renewal_reminder_days` | | Default from settings |

#### Step 5 — Assignment & Links

| Field | API Parameter | Validation | Notes |
|-------|--------------|------------|-------|
| Assigned Communities | `community_ids` | Min 1 | Multi-select from community list |
| Related Incidents | `related_incident_ids` | Optional | Searchable multi-select of service_call records |

#### Submit Actions

| Button | Behavior |
|--------|----------|
| Save as Draft | `create_poi_record` with `publish=false` |
| Save & Publish | `create_poi_record` with `publish=true` |
| Save Changes | `update_poi_record` (edit mode) |

---

### 1.4 POI Detail View

**Route:** `/poi/:id`
**API:** `POI/get_poi_record`

#### Layout

- **Header bar:** Full name, record type pill, threat level pill, status pill.
- **Photo gallery:** All photos with lightbox zoom. Primary photo displayed large.
- **Detail sections:** Personal Information, Assessment, Assigned Sites, Related Incidents, Type-specific fields, Record History (created/approved/last updated).
- **Internal Notes section:** Highlighted with a distinct background (admin-only label).

#### Action Buttons

| Button | API | Condition |
|--------|-----|-----------|
| Edit | Navigate to authoring modal | Status = `draft` or `active` |
| Publish | `POI/publish_poi_record` | Status = `draft` |
| Inactivate | `POI/inactivate_poi_record` | Status = `active`. Prompt for reason. |
| Archive | `POI/archive_poi_record` | Status = `expired` or `inactive` |
| Export PDF | `POI/export_poi_record` | Always (if `pdf_export_enabled`) |

#### Export PDF Behavior

1. Click "Export PDF" → show loading spinner.
2. Call `POI/export_poi_record`.
3. On success: open `file_url` in new tab or trigger browser download.
4. On `ERR_POI_EXPORT_DISABLED` (rc 704): show "PDF export is currently disabled" message.

---

### 1.5 POI System Settings Panel

**Route:** `/settings` → "POI Settings" section (or tab)
**API:** `Settings/get_poi_settings`, `Settings/update_poi_settings`

| Setting | Type | Description |
|---------|------|-------------|
| Renewal Reminder Days | Number input | Days before expiry to send reminder notifications |
| Archive Threshold Months | Number input | Months after expiry/inactivation before auto-archiving |
| PDF Export Enabled | Toggle switch | Enable/disable PDF export |
| Default POI Guidance | Textarea | Default response guidance for POI records |
| Default Trespass Guidance | Textarea | Default response guidance for Trespass Orders |
| Default Red Card Guidance | Textarea | Default response guidance for Metro Red Cards |

**Guidance text note:** These default texts are shown to officers in the field when they view a record. Preview panel recommended to show how the text will appear on the mobile app.

---

## 2. Officer Mobile App — POI Field Directory

### 2.1 Navigation & Entry Point

Add a **"POI Directory"** item to the officer's main navigation (bottom tab bar or hamburger menu). Icon: shield or person-alert. Show a **red dot indicator** if any records have `view_badge="new"` or `view_badge="updated"`.

### 2.2 POI List Screen

**API:** `POI/get_poi_list`

The list is automatically scoped to the officer's community. Only `active` records are returned.

#### Sort Order

Default sort: `sort_by=threat_level`, `sort_dir=asc` (critical first).

#### List Card Layout

```
┌──────────────────────────────────────────┐
│ ┌─────┐  John Smith            [NEW]    │
│ │photo│  Trespass Order                  │
│ │ 40px│  ████ HIGH                       │
│ └─────┘  Riverside Plaza | Exp: Jun 30   │
└──────────────────────────────────────────┘
```

| Element | Source | Notes |
|---------|--------|-------|
| Thumbnail | `photo_url` | 40px circle, placeholder if null |
| Name | `full_name` | Bold, primary text |
| Aliases | `known_aliases` | Secondary text, grey, truncated |
| Type | `record_type_name` | Subtitle |
| Threat Level | `threat_level` + `threat_level_name` | Color-coded inline badge |
| Communities | `sites[].community_name` | Subtitle, comma-joined |
| Expiry | `expiry_date` | Red text if within 14 days |
| Badge | `view_badge` | See badge styles below |

#### Badge Styles

| Badge | Label | Background | Text Color |
|-------|-------|-----------|------------|
| `"new"` | NEW | `#1976D2` (bright blue) | `#FFFFFF` |
| `"updated"` | UPDATED | `#F57C00` (amber) | `#FFFFFF` |
| `null` | *(no badge)* | — | — |

#### Search

Text input at top of list, bound to `search_text`. Searches across name, aliases, summary, and record ID. Debounce 400ms.

#### Pull-to-Refresh

Standard pull-to-refresh reloads the list from `offset=0`.

---

### 2.3 POI Detail Screen

**API:** `POI/get_poi_record`, then immediately call `POI/mark_viewed`

When the officer opens a record's detail screen:
1. Fetch full record via `POI/get_poi_record`.
2. Immediately call `POI/mark_viewed` with the same `record_id` to clear the badge.

#### Response Guidance Warning Card

**Position:** Fixed at the top of the detail screen, before any other content.
**Visibility:** Always shown when `response_guidance` is non-empty.

| Threat Level | Card Background | Border | Icon |
|-------------|----------------|--------|------|
| `critical` | `#FFEBEE` (light red) | 2px solid `#F44336` | ⚠ red |
| `high` | `#FFF3E0` (light orange) | 2px solid `#FF9800` | ⚠ orange |
| `medium` | `#FFFDE7` (light yellow) | 2px solid `#FFC107` | ⚠ amber |
| `low` | `#E3F2FD` (light blue) | 2px solid `#2196F3` | ℹ blue |

**Content:** The `response_guidance` text from the API response. Use bold, larger font for readability in the field. Example:

> ⚠ **RESPONSE GUIDANCE**
>
> This individual is subject to a formal trespass order and is prohibited from entering the specified property. If you observe this individual on site: (1) Do not use physical force unless lawfully justified. (2) Verbally advise the individual that they are trespassing and must leave. (3) If they refuse to leave, contact law enforcement. (4) Document the encounter using the incident reporting tool.

#### Detail Sections

1. **Photo Gallery:** Horizontal scrollable strip. Tap to view full-screen.
2. **Subject Information:** Name, aliases, DOB, gender, physical description.
3. **Assessment:** Threat level (color-coded), summary text.
4. **Type-Specific Details (non-sensitive only):**
   - Trespass: Issuing Authority, Property/Area Covered.
   - Metro RC: Issuing Authority, Transit Lines.
5. **Assigned Communities:** List of community names.
6. **Record Dates:** Expiry date (highlighted if soon), created date.

**Note:** Internal notes, legal documents, notice numbers, card numbers, conditions, and law enforcement contacts are NOT shown to officers.

---

### 2.4 Direct Emergency Call Action

**Position:** Floating action button (FAB) or prominent button at the bottom of the detail screen.
**Label:** "Report Encounter" or "Initiate Call"

**Behavior (Phase 6.2 — interim implementation):**

1. Officer taps "Report Encounter".
2. Navigate to the Create Call screen (`Call/create_call`).
3. Pre-fill the call description with: `"[POI #{record_id}] {full_name} ({record_type_name}) — encountered at {current_location}"`.
4. Officer completes and submits the call normally.

**Note:** Full encounter-to-incident linking is deferred to Phase 7. The current implementation uses a text reference only.

---

### 2.5 Push Notification Handling

When the officer receives a POI push notification:

| Notification Type | Display Title | Tap Action |
|-------------------|--------------|------------|
| `poi_active` | "New {poi_type}: {poi_name}" | Navigate to POI detail screen |
| `poi_updated` | "{poi_type} Updated: {poi_name}" | Navigate to POI detail screen |
| `poi_inactivated` | "{poi_type} Inactivated: {poi_name}" | Navigate to POI list (record no longer visible) |
| `poi_expiring_soon` | "{poi_type} Expiring Soon: {poi_name}" | Navigate to POI detail screen |
| `poi_expired` | "{poi_type} Expired: {poi_name}" | Navigate to POI list (record no longer visible) |

**Deep-link:** Extract `entity_type` and `entity_id` from the payload. If `entity_type === "poi"`, navigate to the POI detail screen with `record_id = entity_id`.

---

## 3. Implementation Checklist

### Web Admin Portal

- [ ] Add "POI Registry" to sidebar navigation
- [ ] Implement POI list page with tabs, filters, search, pagination
- [ ] Implement status and threat level pill components with correct colors
- [ ] Implement POI authoring modal with 5-step form
- [ ] Implement photo uploader with drag-to-reorder
- [ ] Implement type-specific conditional field sections
- [ ] Implement POI detail view with action buttons
- [ ] Implement PDF export trigger with download
- [ ] Implement inactivation reason prompt dialog
- [ ] Add POI settings panel to Settings page
- [ ] Wire up all API calls with error handling (see error directory)

### Officer Mobile App

- [ ] Add "POI Directory" to main navigation with red dot indicator
- [ ] Implement POI list screen with threat-level default sort
- [ ] Implement NEW/UPDATED badge display on list cards
- [ ] Implement search bar with debounced `search_text`
- [ ] Implement POI detail screen
- [ ] Implement response guidance warning card with threat-level colors
- [ ] Call `mark_viewed` on detail screen open
- [ ] Implement photo gallery with full-screen view
- [ ] Implement "Report Encounter" button with call pre-fill
- [ ] Handle POI push notifications with deep-link to detail screen
- [ ] Implement pull-to-refresh on list screen
