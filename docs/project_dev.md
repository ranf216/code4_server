# Server Implementation Documentation

**Document Version:** 1.6  
**Last Updated:** 2026-07-10
**Purpose:** Comprehensive documentation of the project server business logic implementation

---

## Phase 0 — Foundation & Configuration

### Admin Roles (`platform/definitions/user_roles.js`)
| Constant | Value | Name |
|---|---|---|
| `USER_ROLE_ACCOUNT_IMPERSONATION` | 1 | Account Impersonation |
| `USER_ROLE_SUPER_ADMIN` | 2 | Super Admin |
| `USER_ROLE_MANAGER` | 3 | Manager |
| `USER_ROLE_PLANNING` | 4 | Planning |
| `USER_ROLE_LOGISTICS` | 5 | Logistics |
| `USER_ROLE_FINANCE` | 6 | Finance |

### User Types (`platform/definitions/user_types.js`)
| Constant | Value | Name |
|---|---|---|
| `USER_TYPE_NA` | 0 | n/a |
| `USER_TYPE_ADMIN` | 1 | admin |
| `USER_TYPE_OFFICER` | 2 | officer |
| `USER_TYPE_RESIDENT` | 3 | resident |

### Project Error Codes (`platform/definitions/errorcodes.en.js`)
Project-specific error codes start at RC 500:
- **500–519** — Community
- **520–539** — Officer
- **540–559** — Resident
- **560–589** — Call
- **590–609** — Task
- **610–639** — Shift
- **640–659** — Route
- **660–669** — Tracking
- **670–689** — Post Order
- **690–709** — POI
- **710–729** — Report
- **730–739** — Notification
- **740–749** — Settings
- **750–769** — Asset & Post
- **770–779** — Admin User

### $DataItems Lookup Tables (`platform/data/`)
| File | Description |
|---|---|
| `service_type.json` | Concierge service types (Dumpsters Recovery, Welfare Check, Property Walk, etc.) |
| `task_type.json` | Task/maintenance report types (Lights, Sprinklers, Leaks, Inspection, Supply Request, etc.) |
| `asset_type.json` | Asset types (Camera, Door, Gate, Fence, Light, Alarm, etc.) |
| `po_section_type.json` | Post Order section types (General Info, Duties, Emergency Procedures, etc.) with `client_visible` attribute |

### Database Tables (V 4.0.0)
| Table | Prefix | Description |
|---|---|---|
| `community` | `COM_` | Managed communities/sites |
| `featured_officer` | `FTO_` | One featured officer banner per community |

### Database Tables (V 4.1.0)
| Table | Prefix | Description |
|---|---|---|
| `data_item` | `DIT_` | Runtime-manageable lookup types (service_type, task_type, asset_type, po_section_type) |

### Database Tables (V 4.2.0)
| Table | Prefix | Description |
|---|---|---|
| `officer` | `OFC_` | Officer-specific profile fields (title, description, address, roles, badges) |
| `officer_evaluation` | `OFE_` | Officer evaluations (text, date, evaluator) — visible to admin/manager only |

### Database Tables (V 4.3.0)
| Table | Prefix | Description |
|---|---|---|
| `notification` | `NTF_` | In-app notification records per user (read/unread, type, payload for deep linking) |


---

## Phase 1 — Core Entities

### 1.1 Settings (`platform/api/settings.js`, `platform/funcs/settings.js`)

Manages system-wide configuration and lookup data items via database tables (multi-instance safe).

#### Data Item CRUD (service_type, task_type, asset_type, po_section_type)

All lookup types are stored in the `data_item` DB table with a `DIT_TABLE` discriminator column. Each data item type supports full CRUD via the same pattern:
- **get_{type}s** — SELECT from `data_item` WHERE `DIT_TABLE`=type AND not soft-deleted
- **add_{type}** — INSERT with auto-generated slug key from name; duplicate key returns `ERR_SETTING_NAME_ALREADY_EXISTS`
- **update_{type}** — UPDATE name (and extra attributes) for existing item; returns `ERR_SETTING_NOT_FOUND` if missing
- **delete_{type}** — Soft delete (SET `DIT_DELETED_ON`); returns `ERR_SETTING_NOT_FOUND` if missing

Type-specific extra attributes (e.g., `client_visible` for po_section_type) are stored in the `DIT_EXTRA` JSON column.

| API | ACL | Description |
|---|---|---|
| `Settings/get_service_types` | ADMIN, OFFICER, RESIDENT | Get service/incident types list |
| `Settings/add_service_type` | ADMIN | Add a new service type |
| `Settings/update_service_type` | ADMIN | Edit a service type |
| `Settings/delete_service_type` | ADMIN | Delete a service type |
| `Settings/get_task_types` | ADMIN, OFFICER | Get maintenance task types list |
| `Settings/add_task_type` | ADMIN | Add a new task type |
| `Settings/update_task_type` | ADMIN | Edit a task type |
| `Settings/delete_task_type` | ADMIN | Delete a task type |
| `Settings/get_asset_types` | ADMIN | Get asset types list |
| `Settings/add_asset_type` | ADMIN | Add a new asset type |
| `Settings/update_asset_type` | ADMIN | Edit an asset type |
| `Settings/delete_asset_type` | ADMIN | Delete an asset type |
| `Settings/get_po_section_types` | ADMIN | Get post order section types |
| `Settings/add_po_section_type` | ADMIN | Add a post order section type (with `client_visible`) |
| `Settings/update_po_section_type` | ADMIN | Edit a post order section type |
| `Settings/delete_po_section_type` | ADMIN | Delete a post order section type |

#### Configuration Settings (GPS, Notifications, POI, Working Hours)

Configuration settings are persisted in the `key_value` DB table (multi-instance safe). Each config group is stored as a single JSON value under a namespaced key (e.g., `settings:gps`). Defaults are returned when no stored value exists.

| API | ACL | Description |
|---|---|---|
| `Settings/get_gps_settings` | ADMIN | Get GPS & tracking config (intervals, thresholds, map provider) |
| `Settings/update_gps_settings` | ADMIN | Update GPS & tracking config |
| `Settings/get_notification_settings` | ADMIN | Get push notification settings (methods, triggers) |
| `Settings/update_notification_settings` | ADMIN | Update push notification settings |
| `Settings/get_poi_settings` | ADMIN | Get POI & Trespass settings (reminders, archiving, guidance texts) |
| `Settings/update_poi_settings` | ADMIN | Update POI & Trespass settings |
| `Settings/get_working_hours_settings` | ADMIN | Get working hours config (max hours per day) |
| `Settings/update_working_hours_settings` | ADMIN | Update working hours config |

#### GPS Settings Defaults
| Parameter | Default | Description |
|---|---|---|
| `gps_interval_normal` | 30 | Seconds between location updates (normal patrol) |
| `gps_interval_emergency` | 10 | Seconds between location updates (emergency) |
| `gps_stale_threshold` | 2 | Minutes without update before alert |
| `location_history_retention` | 90 | Days to keep GPS history |
| `map_refresh_interval` | 30 | Portal map refresh interval (seconds) |
| `patrol_compliance_threshold` | 15 | Minutes overdue before skip alert |
| `emergency_eta_interval` | 60 | ETA recalculation interval (seconds) |
| `map_provider` | google_maps | Map provider |

#### POI Settings Defaults
| Parameter | Default | Description |
|---|---|---|
| `renewal_reminder_days` | 14 | Days before expiry for reminder |
| `archive_threshold_months` | 24 | Months after expiry before archiving |
| `pdf_export_enabled` | true | Whether PDF export is available |
| `default_poi_guidance` | (text) | Default response guidance for POI |
| `default_trespass_guidance` | (text) | Default response guidance for Trespass |
| `default_red_card_guidance` | (text) | Default response guidance for Metro Red Card |

#### Working Hours Defaults
| Parameter | Default | Description |
|---|---|---|
| `max_hours_per_day` | 8 | Maximum officer working hours per day |

### 1.2 Community (`platform/api/community.js`, `platform/funcs/community.js`)

Manages communities (sites) and featured officer banners. Full CRUD for communities with soft deletion, and upsert/delete for the 1:1 featured officer banner per community.

#### Community CRUD

Communities are stored in the `community` table. Each community has a name, area, GPS coordinates, timezone, map image, map boundaries polygon, and active status. Soft deletion via `COM_DELETED_ON`.

- **get_communities** — Lists all non-deleted communities. Optional `include_inactive` flag to include deactivated communities (default: active only). Optional `search_text` for server-side free-text search across community names, officer names, and resident names.
- **get_community** — Returns full community details by ID, including map image URL.
- **add_community** — Creates a new community. `name` and `area` are mandatory. Validates unique name among non-deleted communities. Handles map image upload via `$Utils.saveNewImageOrKeepOld()`. Defaults `is_active` to true. Optional `officers` and `residents` arrays to associate users at creation.
- **update_community** — Dynamic partial update. Only provided fields are modified. Validates unique name if changed. Handles map image replacement. Optional `officers` and `residents` arrays to reassign user associations (replaces current list).
- **delete_community** — Soft deletes (`COM_DELETED_ON`). Server-side association checks block deletion if active officers (rc 502), residents (rc 503), or open calls (rc 504) exist. Deleted community names can be reused.

| API | ACL | Description |
|---|---|---|
| `Community/get_communities` | ADMIN | List all communities |
| `Community/get_community` | ADMIN, OFFICER, RESIDENT | Get a single community by ID |
| `Community/add_community` | ADMIN | Create a new community |
| `Community/update_community` | ADMIN | Update community fields |
| `Community/delete_community` | ADMIN | Soft-delete a community |

#### Featured Officer Banner

Each community can have at most one featured officer banner (1:1, enforced by `UNIQUE KEY UQ_FTO_COM_ID`). The `set_featured_officer` endpoint performs an upsert: inserts if none exists, updates if one already exists, or restores a soft-deleted record. Both `image` and `description` are mandatory per SDS. Soft deletion via `FTO_DELETED_ON`.

| API | ACL | Description |
|---|---|---|
| `Community/get_featured_officer` | ADMIN, OFFICER, RESIDENT | Get featured officer banner for a community |
| `Community/set_featured_officer` | ADMIN | Create or update the featured officer banner |
| `Community/delete_featured_officer` | ADMIN | Remove the featured officer banner |

#### Community Error Codes (500–519)
| Code | Constant | Message |
|---|---|---|
| 500 | `ERR_COMMUNITY_NOT_FOUND` | community not found |
| 501 | `ERR_COMMUNITY_NAME_ALREADY_EXISTS` | a community with this name already exists |
| 502 | `ERR_COMMUNITY_HAS_ACTIVE_OFFICERS` | cannot delete community with active officers |
| 503 | `ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS` | cannot delete community with active residents |
| 504 | `ERR_COMMUNITY_HAS_ACTIVE_CALLS` | cannot delete community with active calls |
| 505 | `ERR_COMMUNITY_IS_NOT_ACTIVE` | community is not active |
| 506 | `ERR_FEATURED_OFFICER_NOT_FOUND` | featured officer not found |

#### Design Notes
- **Helper function:** `fetchCommunityRecord(communityId)` — module-level helper to avoid duplicating the existence check query across 6 methods.
- **Audit trail:** `featured_officer` trigger definition uses `log_delete: false` with `FTO_DELETED_ON` in both `insert_fields` and `update_fields` since soft deletion is used.
- **File handling:** `COM_MAP_IMAGE` and `FTO_IMAGE` use `$Files.SQL` for URL resolution in read operations and `$Utils.saveNewImageOrKeepOld()` for uploads.
- **Active filtering:** `get_communities` defaults to active-only; pass `include_inactive: true` to see deactivated communities.
- **Free-text search:** `get_communities` supports `search_text` parameter for server-side filtering across community names, officer names, and resident names via EXISTS subqueries.
- **Community association:** `user_details.USD_COM_ID` links officers and residents to communities. Managed via `add_community` and `update_community` endpoints.

---

## Phase 2 — People

### 2.1 Officer (`platform/api/officer.js`, `platform/funcs/officer.js`)

Manages officers — the primary operational actors in the system. Full CRUD for admins, self-service endpoints for mobile, and evaluation management. Uses `user` + `user_details` tables for core user fields plus a dedicated `officer` table for officer-specific attributes.

#### Officer CRUD (Admin)

Officers are `USER_TYPE_OFFICER` (2) in the `user` table. Each officer has a login phone number (OTP-based auth), first/last name, email, community assignment, title, description, address, roles, certification badges, and active/inactive status.

- **get_officers** — Lists all non-deleted officers. Optional `community_id` filter, `include_inactive` (default: active only), `search_text` for free-text search across name, email, phone, community name. Sortable by `first_name`, `last_name`, `community`, `created_on`.
- **get_officer** — Returns full officer details by user ID including evaluations array. Returns `ERR_OFFICER_NOT_FOUND` (520) if not found.
- **add_officer** — Creates a new officer. Validates phone uniqueness, email uniqueness (if provided), and community existence/active status. Creates user via `User/add_user` with OTP login authority. Sets community association, image, and officer-specific fields. Returns new `user_id`.
- **update_officer** — Dynamic partial update across `user_details` and `officer` tables. Phone change requires re-identification (terminates session). Email and community changes validated. Deactivation terminates session.
- **delete_officer** — Soft deletes officer only if they have never logged in (`USR_LAST_LOGIN IS NULL`). Otherwise returns `ERR_OFFICER_CANNOT_DELETE` (526). Appends `/DELETED` to email and phone.

#### Officer Self-Service (Mobile)

- **get_my_details** — Officer retrieves their own profile. Same data as `get_officer` but without evaluations.
- **update_my_details** — Officer can edit: first_name, last_name, address, email. Cannot edit: title, phone, community, image, roles, badges.

#### Officer Evaluations (Admin-only)

Evaluations are stored in `officer_evaluation` table. Each has text, date, and evaluator name (auto-populated from session). Visible only to admin/manager, never to the officer.

- **get_officer_evaluations** — Get all evaluations for an officer ordered by date descending.
- **add_officer_evaluation** — Add a new evaluation. Evaluator name auto-derived from the current admin session.
- **delete_officer_evaluation** — Soft-delete an evaluation.

| API | ACL | Description |
|---|---|---|
| `Officer/get_officers` | ADMIN | List all officers |
| `Officer/get_officer` | ADMIN | Get a single officer by ID (with evaluations) |
| `Officer/add_officer` | ADMIN | Create a new officer |
| `Officer/update_officer` | ADMIN | Update officer details |
| `Officer/delete_officer` | ADMIN | Soft-delete an officer |
| `Officer/get_my_details` | OFFICER | Get own officer profile |
| `Officer/update_my_details` | OFFICER | Update own editable fields |
| `Officer/get_officer_evaluations` | ADMIN | Get evaluations for an officer |
| `Officer/add_officer_evaluation` | ADMIN | Add an evaluation |
| `Officer/delete_officer_evaluation` | ADMIN | Soft-delete an evaluation |

#### Officer Error Codes (520–539)
| Code | Constant | Message |
|---|---|---|
| 520 | `ERR_OFFICER_NOT_FOUND` | officer not found |
| 521 | `ERR_OFFICER_ALREADY_IN_COMMUNITY` | officer is already assigned to this community |
| 522 | `ERR_OFFICER_HAS_ACTIVE_CALLS` | cannot delete officer with active calls |
| 523 | `ERR_OFFICER_HAS_ACTIVE_SHIFTS` | cannot delete officer with active shifts |
| 524 | `ERR_OFFICER_NOT_IN_COMMUNITY` | officer is not assigned to this community |
| 525 | `ERR_OFFICER_NOT_ON_DUTY` | officer is not on duty |
| 526 | `ERR_OFFICER_CANNOT_DELETE` | officer has logged in and cannot be deleted, only deactivated |
| 527 | `ERR_OFFICER_EVALUATION_NOT_FOUND` | officer evaluation not found |

#### Design Notes
- **Helper functions:** `fetchOfficerRecord(userId)` — module-level helper joining `user`, `user_details`, and `officer` tables. `mapOfficerRow(row, filesSql)` — maps DB columns to API response fields.
- **DB tables:** Leverages existing `user` + `user_details` for core user fields (name, email, phone, status, community, image). Dedicated `officer` table for officer-specific attributes (title, description, address, roles, badges).
- **Login authority:** Officers use OTP phone login (`USER_LOGIN_AUTHORITY_OTP = 6`). On creation, `USR_LOGIN_AUTHORITY` is set to OTP.
- **Session termination:** Phone changes, deactivation clear `USR_TOKEN` and `USR_DEVICE_ID`, plus invalidate the token cache.
- **JSON columns:** `OFC_ROLES` and `OFC_CERTIFICATION_BADGES` use MySQL JSON type to store arrays of strings.
- **Soft deletion cascade:** `delete_officer` soft-deletes both `user_details` (via `USD_DELETED_ON`) and `officer` (via `OFC_DELETED_ON`).
- **Evaluation auto-evaluator:** `add_officer_evaluation` automatically derives the evaluator name from the admin's `user_details` record.

---

### 1.3 Admin User (`platform/api/admin_user.js`, `platform/funcs/admin_user.js`)

Manages management portal users (admin type). Full CRUD for admin users with soft deletion, password management, and role assignment. Uses existing `user` and `user_details` tables (no new DB tables).

#### Admin User CRUD

Admin users are `USER_TYPE_ADMIN` (1) in the `user` table. Each user has a login email, first/last name, phone number, an assigned role, and active/inactive status. Soft deletion via `USD_DELETED_ON` on `user_details`.

- **get_admin_users** — Lists all non-deleted admin users. Optional `include_inactive` (default: active only). Optional `search_text` for free-text search across first name, last name, email, phone. Sortable by `first_name`, `last_name`, `email`, `role`, `created_on`.
- **get_admin_user** — Returns a single admin user by ID. Returns `ERR_ADMIN_USER_NOT_FOUND` (770) if not found.
- **add_admin_user** — Creates a new admin user via `User/add_user`. Validates email format & uniqueness, password criteria, and role validity. Sets phone number and role after creation. Password is stored as initial (user must change on first login).
- **update_admin_user** — Dynamic partial update. Only provided fields are modified. If email is changed, `initial_password` is mandatory (SDS 5.2.3) — sessions are terminated and user must re-login. Deactivating the last active admin is blocked. Deactivation also terminates sessions.
- **delete_admin_user** — Soft delete. Cannot delete self. Cannot delete the last active admin. Terminates sessions and appends `/DELETED` to email and phone to free uniqueness constraints.

#### Role Management

- **change_admin_user_role** — Super Admin only. Changes a user's role. Cannot change own role. Resets previous roles and sets the new one via `$UserRoles.setUserRoles()`.

#### Password Management

- **reset_admin_user_password** — Resets a user's password to a new initial password. Terminates active sessions. User must change password on next login.
- **change_my_password** — Allows the current user to voluntarily change their own password. Verifies current password, validates new password criteria, and ensures new password differs from current. Stores hashed password via `$Utils.hash(userId + newPassword)`.

| API | ACL | Description |
|---|---|---|
| `AdminUser/get_admin_users` | ADMIN | List all management system users |
| `AdminUser/get_admin_user` | ADMIN | Get a single admin user by ID |
| `AdminUser/add_admin_user` | ADMIN | Create a new admin user |
| `AdminUser/update_admin_user` | ADMIN | Update admin user details |
| `AdminUser/delete_admin_user` | ADMIN | Soft-delete an admin user |
| `AdminUser/change_admin_user_role` | SUPER_ADMIN | Change a user's role |
| `AdminUser/reset_admin_user_password` | ADMIN | Reset a user's password |
| `AdminUser/change_my_password` | ADMIN | Change own password |

#### Admin User Error Codes (770–779)
| Code | Constant | Message |
|---|---|---|
| 770 | `ERR_ADMIN_USER_NOT_FOUND` | admin user not found |
| 771 | `ERR_ADMIN_CANNOT_DELETE_SELF` | cannot delete your own account |
| 772 | `ERR_ADMIN_CANNOT_EDIT_SELF_ROLE` | cannot change your own role |

#### Design Notes
- **Helper functions:** `fetchAdminUserRecord(userId)` and `getActiveAdminCount()` are module-level helpers. `mapAdminUserRow(row)` maps DB columns to API response fields using `$Utils.getCalculatedUserRoles()` for role resolution.
- **No new DB tables:** Leverages existing `user` and `user_details` tables with `USR_TYPE = USER_TYPE_ADMIN` filter.
- **Session termination:** Email changes, password resets, and deactivation clear `USR_TOKEN` and `USR_DEVICE_ID`, plus invalidate the token cache via `tokenValidator.deleteFromUserCache()`.
- **Protected requests:** `add_admin_user` masks `password`, `update_admin_user` masks `initial_password`, `reset_admin_user_password` masks `password`, `change_my_password` masks `current_password` and `new_password` in request logs.

---

### Resident Module (`platform/api/resident.js`)

Manages residents (security service clients/homeowners). Residents belong to a single community and use phone OTP to log in to the mobile app.

#### DB Table: `resident`
| Column | Type | Description |
|---|---|---|
| `RES_USR_ID` | varchar(128) PK, FK→user | Links to user table |
| `RES_ADDRESS` | varchar(500) | Resident address |
| `RES_VEHICLES` | json | Array of vehicle license plate strings |
| `RES_INSTRUCTIONS` | text | Special instructions for officers |
| `RES_IMAGES` | json | Array of property image file names (up to 10) |
| `RES_COMMUNICATION_TEST` | tinyint | Communication test flag (0/1) |
| `RES_CREATED_ON` | datetime | Record creation timestamp |
| `RES_LAST_UPDATE` | datetime | Last modification timestamp |
| `RES_DELETED_ON` | datetime | Soft-delete timestamp |

#### Admin CRUD

- **get_residents** — List all residents with optional community filter, active/inactive filter, free-text search (name, email, phone, address, community), and sorting.
- **get_resident** — Get a single resident by user ID with full details.
- **add_resident** — Creates a new resident. Validates phone uniqueness, community existence/active status, email format/uniqueness. Creates user via `User/add_user` with `USER_TYPE_RESIDENT`, sets OTP login authority, creates `resident` record.
- **update_resident** — Dynamic partial update. Validates email/phone uniqueness, community changes. Blocks deactivation and community move if resident has active calls (TODO: Call module Phase 3). Handles property images (base64 save). Phone change or deactivation terminates session.
- **delete_resident** — Soft delete. Blocked if resident has any activity (calls past or present → `ERR_RESIDENT_CANNOT_DELETE`). Falls back to "never logged in" check until Call module is implemented. Terminates session, appends `/DELETED` to email/phone.

#### Resident Self-Service (Mobile)

- **get_my_details** — Returns the resident's own profile including community name and property image URLs.
- **update_my_details** — Resident can edit: first_name, last_name, email, address, instructions, images. Cannot edit: phone, community, vehicles.

#### Officer-Facing

- **search_residents** — Officer searches for residents in their own community by name, license plate, or address (SDS 3.10). Returns: name, phone, address, vehicles.

| API | ACL | Description |
|---|---|---|
| `Resident/get_residents` | ADMIN | List all residents |
| `Resident/get_resident` | ADMIN | Get a single resident by ID |
| `Resident/add_resident` | ADMIN | Create a new resident |
| `Resident/update_resident` | ADMIN | Update resident details |
| `Resident/delete_resident` | ADMIN | Soft-delete a resident |
| `Resident/get_my_details` | RESIDENT | Get own profile |
| `Resident/update_my_details` | RESIDENT | Update own editable details |
| `Resident/search_residents` | OFFICER | Search residents in officer's community |

#### Resident Error Codes (540–559)
| Code | Constant | Message |
|---|---|---|
| 540 | `ERR_RESIDENT_NOT_FOUND` | resident not found |
| 541 | `ERR_RESIDENT_HAS_ACTIVE_CALLS` | cannot modify resident with active calls |
| 542 | `ERR_RESIDENT_ALREADY_EXISTS` | resident already exists in this community |
| 543 | `ERR_RESIDENT_CANNOT_DELETE` | resident has activity and cannot be deleted, only deactivated |

#### Design Notes
- **Helper functions:** `fetchResidentRecord(userId)` fetches joined user+user_details+resident record. `mapResidentRow(row)` maps DB columns to API response fields. `saveImagesArray(userId, newArr, existingJson)` handles base64 image saving with existing file preservation. `parseImagesArray(imagesArr)` converts stored file names to URLs.
- **No profile image:** Residents do not use `USD_IMAGE`. Property images are stored in `RES_IMAGES` as a JSON array.
- **Vehicles:** Admin-managed only. Stored as JSON array in `RES_VEHICLES`.
- **Session termination:** Phone changes and deactivation clear `USR_TOKEN`/`USR_DEVICE_ID` and invalidate token cache.
- **TODO placeholders:** Active-call checks for delete/deactivate/community-move will be implemented when the Call module (Phase 3) is built.

### 2.3 Notification (`platform/api/notification.js`, `platform/funcs/notification.js`)

Manages in-app notification storage, retrieval, and read-state tracking. Provides creation endpoints for other modules to call via `$executeAPI`. Optionally sends FCM push notifications when the `fcm` module is enabled.

#### API Endpoints

| API | ACL | Description |
|---|---|---|
| `Notification/get_notifications` | ALL AUTHED | Get paginated list of notifications for the current user. Supports filters: `is_read`, `type`, `from_date`, `to_date`. |
| `Notification/get_unread_count` | ALL AUTHED | Get unread notification count for the current user |
| `Notification/mark_as_read` | ALL AUTHED | Mark a single notification as read |
| `Notification/mark_all_as_read` | ALL AUTHED | Mark all unread notifications as read |
| `Notification/create_notification` | ALL AUTHED | Create a notification for a single user (internal use via `$executeAPI`) |
| `Notification/create_bulk_notifications` | ALL AUTHED | Create notifications for multiple users at once (internal use via `$executeAPI`) |
| `Notification/delete_notification` | ALL AUTHED | Soft-delete a notification (owner only) |

#### Usage by Other Modules

Other modules create notifications by calling:
```js
$executeAPI(this.$Session, "Notification/create_notification", {
    target_user_id: recipientUserId,
    type: "call_accepted",
    title: "Call Accepted",
    message: "Your call was accepted by Officer Smith",
    payload: JSON.stringify({ entity_type: "call", entity_id: callId }),
    community_id: communityId,
    send_push: true
});
```

For bulk notifications (e.g., all officers in a community):
```js
$executeAPI(this.$Session, "Notification/create_bulk_notifications", {
    target_user_ids: officerUserIds,
    type: "new_emergency",
    title: "New Emergency Call",
    message: "A new emergency call was opened",
    payload: JSON.stringify({ entity_type: "call", entity_id: callId }),
    community_id: communityId,
    send_push: true
});
```

#### Notification Types

Valid types: `new_emergency`, `new_service_call`, `call_accepted`, `call_resolved`, `call_updated`, `call_canceled`, `resident_like`, `new_incident_report`, `report_submitted`, `report_approved`, `report_changes_requested`, `report_delivered`, `shift_published`, `shift_updated`, `shift_cancelled`, `shift_starting_soon`, `route_updated`, `post_order_published`, `post_order_updated`, `poi_active`, `poi_updated`, `poi_inactivated`, `poi_expiring_soon`, `poi_expired`, `task_update`, `panic_button`, `gps_signal_lost`, `officer_off_route`, `general`.

#### Notification Error Codes (730–739)
| Code | Constant | Message |
|---|---|---|
| 730 | `ERR_NOTIFICATION_NOT_FOUND` | notification not found |
| 731 | `ERR_NOTIFICATION_INVALID_TYPE` | invalid notification type |
| 732 | `ERR_NOTIFICATION_ALREADY_READ` | notification is already marked as read |

#### Design Notes
- **Soft deletion:** Uses `NTF_DELETED_ON` timestamp pattern.
- **Bulk insert:** `create_bulk_notifications` uses a single INSERT with multiple value sets (no queries in loops).
- **FCM graceful degradation:** Push delivery is silently skipped when FCM module is not loaded (`typeof $Fcm === "undefined"`).
- **Pagination:** `get_notifications` uses LIMIT/OFFSET (passed as strings per infrastructure rules). Max page size: 100.
- **Helper functions:** `mapNotificationRow(row)` maps DB columns to API response. `insertNotification(...)` handles single record creation. `sendPushToUser(...)` handles FCM delivery.
- **Open items:** See `docs/notification_questions.md` for pending design decisions.

---

## Development Best Practices

For comprehensive development best practices, including database code guidelines, implementation checklists, and common patterns, see the **"Critical Rules & Best Practices"** section in `docs/brain.md`.

Key reminders:
- **Never** execute `$Db.executeQuery()` inside loops - use bulk operations with `IN` clauses
- **Never** include `SELECT` queries inside transactions - fetch all data before `$Db.beginTransaction()`
- Always use soft deletion pattern (`UPDATE SET *_DELETED_ON=?`) instead of `DELETE FROM`
- Prepare data in memory before starting transactions to minimize lock time

See `docs/brain.md` for complete guidelines, code examples, and pre-implementation checklist.
