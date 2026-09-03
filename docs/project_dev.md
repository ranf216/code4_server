# Server Implementation Documentation

**Document Version:** 1.7  
**Last Updated:** 2026-08-13
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

### Database Tables (V 4.4.0)
| Table | Prefix | Description |
|---|---|---|
| `service_call` | `SVC_` | Service/emergency/panic calls with lifecycle tracking, media, officer assignment, and resident feedback |


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

## Phase 3 — Call Management

### 3.1 Call (`platform/api/call.js`, `platform/funcs/call.js`)

Manages the full lifecycle of service calls, emergency calls, panic button alerts, and communication test calls. Residents create calls, officers accept and resolve them, and admins assign officers and manage the call center.

#### Call Categories
| Category | Description | Auto-Priority |
|---|---|---|
| `medical_emergency` | Medical emergency requiring immediate response | urgent |
| `security_emergency` | Security emergency (intrusion, threat, etc.) | urgent |
| `concierge_service` | Concierge/service request (welfare check, package, etc.) | user-selected |
| `test` | Communication test (admin receives, deletable) | normal |
| `panic` | Panic button alert (resident or officer) | urgent |

#### Call Statuses
| Status | Description |
|---|---|
| `new` | Just created, awaiting officer acceptance or admin assignment |
| `accepted` | Officer assigned/accepted, work in progress |
| `resolved` | Call completed by officer |
| `canceled` | Service call canceled by resident or admin |

#### API Endpoints

| API | ACL | Description |
|---|---|---|
| `Call/create_call` | RESIDENT, OFFICER | Create a new call. Officers can only create panic calls. |
| `Call/get_calls` | ALL AUTHED | Paginated list: resident→own, officer→assigned, admin→all. Filters: status, category, community_id, is_open, search_text. |
| `Call/get_call` | ALL AUTHED | Full details of a single call with access control. |
| `Call/update_call` | RESIDENT, OFFICER | Update call: resident edits description/media/schedule (status=new); officer edits comments/confirmation (status=accepted). |
| `Call/cancel_call` | RESIDENT, ADMIN | Cancel a service call (new or accepted). Emergency/panic cannot be canceled. |
| `Call/accept_call` | OFFICER | Officer accepts emergency/panic call ("on the way"). |
| `Call/pass_call` | OFFICER | Officer passes on an emergency/panic call. Adds officer to ignore list; call disappears from their view but remains available to other officers. |
| `Call/resolve_call` | OFFICER, ADMIN | Mark call as resolved. Officer resolves assigned calls (except panic). Panic calls: admin-only closure (duress safeguard). |
| `Call/assign_call` | ADMIN | Assign officer to service call (sets status to accepted). |
| `Call/add_reaction` | RESIDENT | Add like/dislike reaction to resolved call (creator only). |
| `Call/add_comment` | RESIDENT | Add comment to resolved call (creator only). |
| `Call/delete_test_call` | ADMIN | Soft-delete a test call. Only category=test calls can be deleted. |

#### Implementation Details
- **create_call** — Validates category, priority, community membership. For emergency calls, checks that no active emergency exists for the resident. Resolves media file IDs to file names. Auto-sets priority to `urgent` for emergency/panic. Sends push notifications: emergency→all officers in community, concierge_service→all admins (for assignment), panic→all officers in community.
- **get_calls** — Role-based filtering (resident sees own, officer sees assigned + new emergency/panic in community minus passed, admin sees all). Supports pagination (LIMIT/OFFSET, max 100), free-text search across description/address/resident name, and sorting by created_on/status/category/priority.
- **get_call** — Access control: residents see only own calls; officers see emergency/panic in their community OR assigned concierge/test calls; admins see all.
- **update_call** — Role-based field restrictions. Residents can only update while status=new. Officers can only update comments/confirmation while status=accepted and assigned to them.
- **cancel_call** — Only `concierge_service` calls can be canceled. Notifies assigned officer and (if admin cancels) the resident.
- **accept_call** — Verifies officer is in same community. Sets `SVC_OFC_USR_ID` and status to `accepted`. Notifies resident.
- **pass_call** — Adds officer's user ID to `SVC_PASSED_BY` JSON array. Only works on `new` emergency/panic calls in the officer's community. The `get_calls` query uses `JSON_CONTAINS()` to exclude passed calls from that officer's view.
- **resolve_call** — Sets status to `resolved`. Officers are blocked from resolving panic calls (returns `ERR_NO_PRIVILEGES` — duress safeguard). Allows optional confirmation media/video/comments at resolution time. Notifies resident.
- **assign_call** — Admin assigns officer. Validates officer exists and is active. Sets status to `accepted`. Notifies both officer and resident.
- **add_reaction** — Only call creator, only after resolved. Sends `resident_like` notification to officer on like.
- **add_comment** — Only call creator, only after resolved.
- **delete_test_call** — Soft-delete via `SVC_DELETED_ON`. Only `category=test` calls allowed.

#### Call Error Codes (560–589)
| Code | Constant | Message |
|---|---|---|
| 560 | `ERR_CALL_NOT_FOUND` | call not found |
| 561 | `ERR_CALL_ALREADY_ACCEPTED` | call has already been accepted |
| 562 | `ERR_CALL_ALREADY_RESOLVED` | call has already been resolved |
| 563 | `ERR_CALL_ALREADY_CANCELED` | call has already been canceled |
| 564 | `ERR_CALL_CANNOT_ACCEPT` | call cannot be accepted in its current status |
| 565 | `ERR_CALL_CANNOT_RESOLVE` | call cannot be resolved in its current status |
| 566 | `ERR_CALL_CANNOT_CANCEL` | call cannot be canceled in its current status |
| 567 | `ERR_CALL_ACTIVE_EMERGENCY_EXISTS` | an active emergency call already exists |
| 568 | `ERR_CALL_INVALID_CATEGORY` | invalid call category |
| 569 | `ERR_CALL_INVALID_STATUS` | invalid call status |
| 570 | `ERR_CALL_INVALID_PRIORITY` | invalid call priority |
| 571 | `ERR_CALL_INVALID_SERVICE_TYPE` | invalid service type |
| 572 | `ERR_CALL_MEDIA_LIMIT_REACHED` | maximum number of media files reached |
| 573 | `ERR_CALL_NOT_ASSIGNED_TO_OFFICER` | call is not assigned to this officer |
| 574 | `ERR_CALL_IS_NOT_TEST` | only test calls can be deleted |

#### Design Notes
- **Soft deletion:** Uses `SVC_DELETED_ON` timestamp for test call deletion only. Regular calls are never deleted (status lifecycle: new→accepted→resolved or canceled).
- **Media handling:** Resident media (`SVC_MEDIA`) and officer confirmation media (`SVC_CONFIRMATION_MEDIA`) are JSON arrays of file names (max 5 each). Files are uploaded separately via `File/upload_file_base64` or multipart upload; file IDs are resolved to file names at call creation/update time.
- **Notifications:** Uses `$executeAPI` to create notifications via the Notification module. Emergency/panic→bulk to all officers in community. Service→officers. Accept/resolve/cancel→individual to affected parties.
- **Priority override:** Emergency and panic calls always get `urgent` priority regardless of user input.
- **Access control:** Layered — ACL restricts user types, then business logic restricts to relevant records (own calls, assigned calls, same community).
- **Deferred features:** See `docs/deferred_requirements/03-call-enhancements.md` for ETA calculation, location-based dispatch, 2-way panic communication, export/share, and advanced analytics.

### 3.2 Task (`platform/api/task.js`, `platform/funcs/task.js`)

Manages maintenance tasks/work orders lifecycle. Officers and admins create tasks, assign them, and track progress through a multi-state workflow with comments and media attachments.

#### Task Status Lifecycle
| Status | Description |
|---|---|
| `new` | Just created, awaiting acceptance |
| `accepted` | Assignee accepted the task |
| `approved` | Task approved (e.g., by logistics/finance/planning) |
| `completed` | Task completed by assignee (closed) |
| `rejected` | Task rejected by assignee (closed) |
| `canceled` | Task canceled by creator (closed) |

**Transitions:**
- New → Accepted (via `accept_task`)
- New/Accepted → Rejected (via `reject_task`)
- Accepted/Approved → Completed (via `complete_task`)
- New → Canceled (via `cancel_task`, creator only; admins can cancel any open task)
- Any open status → Reassigned (via `reassign_task`, keeps current status)

#### Task Priorities
| Priority | Description |
|---|---|
| `urgent` | Immediate attention required |
| `important` | High priority |
| `normal` | Standard priority (default) |
| `low` | Low priority |

#### API Endpoints

| API | ACL | Description |
|---|---|---|
| `Task/create_task` | ADMIN, OFFICER | Create a new maintenance task with type, description, priority, assignee, and optional media |
| `Task/get_tasks_list` | ADMIN, OFFICER | Paginated list with filters: status, type, priority, community, scope (all/assigned_to_me/created_by_me), date range, search |
| `Task/get_task` | ADMIN, OFFICER | Full task details including comments and media |
| `Task/update_task` | ADMIN, OFFICER | Update description, priority, address, ETA (admin only). Only while task is open. |
| `Task/accept_task` | ADMIN, OFFICER | Accept a task (status must be new). Sets assignee to accepting user. |
| `Task/approve_task` | ADMIN (Planning/Logistics/Finance roles) | Approve a task that requires approval (supply_request, damaged_equipment). Status must be accepted. Optionally reassigns atomically. |
| `Task/reject_task` | ADMIN, OFFICER | Reject a task with mandatory reason comment. Status must be new or accepted. |
| `Task/complete_task` | ADMIN, OFFICER | Complete a task with optional resolution comment and confirmation media. Status must be accepted or approved. |
| `Task/cancel_task` | ADMIN, OFFICER | Cancel a task. Officers: only own tasks in status new. Admins: any open task. |
| `Task/reassign_task` | ADMIN, OFFICER | Reassign task to another user. Task must be in open status. |
| `Task/add_task_comment` | ADMIN, OFFICER | Add a comment to a task |
| `Task/add_task_media` | ADMIN, OFFICER | Upload images (max 5), video (max 1), or documents to a task |
| `Task/get_task_metadata` | ADMIN, OFFICER | Get task types, statuses, and priorities for dropdowns |

#### Implementation Details
- **create_task** — Validates task_type (via `$DataItems.isValidItemId`), priority. `assigned_to` is optional: if omitted, the server dynamically resolves the default assignee (community Manager → global Super Admin fallback via `USD_ROLE_ALLOW` bitmask). Determines community from officer's `user_details` or assignee. Resolves media file IDs to file names. Inserts task and media records. Notifies assignee.
- **get_tasks_list** — Officers scoped to their community. Supports pagination (LIMIT/OFFSET, max 100), free-text search across description/address/user names, date range, status/type/priority filters, scope filter, and sorting.
- **get_task** — Returns full task with comments and media arrays. Officers restricted to own community.
- **update_task** — Only while in open status. ETA field is admin-only. Notifies creator and assignee.
- **accept_task** — Sets status to `accepted`, updates `TSK_ASSIGNED_TO` and `TSK_ACCEPTED_BY` to current user. Notifies creator.
- **approve_task** — Role-gated via `@acl` (Planning/Logistics/Finance). Verifies task type requires approval (`task_approval_types` $DataItems). Sets status from `accepted` to `approved`. Supports optional atomic reassignment back to field officer. Notifies creator and assignee.
- **reject_task** — Adds rejection reason as comment, sets status to `rejected`. Notifies creator.
- **complete_task** — Sets status to `completed`. Supports optional resolution comment and confirmation media. Notifies creator.
- **cancel_task** — Officers can only cancel their own tasks in status `new`. Admins can cancel any open task. Notifies assignee.
- **reassign_task** — Validates new assignee exists and is active. Officers can reassign only if they are current assignee or creator. Notifies new and previous assignees.
- **add_task_comment** — Inserts comment record, updates task's `TSK_LAST_UPDATE`. Notifies creator and assignee.
- **add_task_media** — Inserts media records (image/video/document) with optional `is_confirmation` flag. Max 5 images per upload call.

#### Database Tables (V 4.5.0)
| Table | Prefix | Description |
|---|---|---|
| `task` | `TSK_` | Main task records with status lifecycle |
| `task_comment` | `TCM_` | Comments on tasks (text + commenter) |
| `task_media` | `TMD_` | Media attachments (images, video, documents) with confirmation flag |

#### $DataItems Files
| File | Type | Description |
|---|---|---|
| `task_type.json` | DB-backed | Admin-managed task types (Lights, Sprinklers, etc.) |
| `task_status.json` | Static | Task statuses with `is_open` attribute |
| `task_priority.json` | Static | Task priorities (urgent, important, normal, low) |

#### Task Error Codes (590–609)
| Code | Constant | Message |
|---|---|---|
| 590 | `ERR_TASK_NOT_FOUND` | task not found |
| 591 | `ERR_TASK_INVALID_STATUS` | invalid task status |
| 592 | `ERR_TASK_CANNOT_ACCEPT` | task cannot be accepted in its current status |
| 593 | `ERR_TASK_CANNOT_COMPLETE` | task cannot be completed in its current status |
| 594 | `ERR_TASK_CANNOT_CANCEL` | task cannot be canceled in its current status |
| 595 | `ERR_TASK_CANNOT_REJECT` | task cannot be rejected in its current status |
| 596 | `ERR_TASK_INVALID_TYPE` | invalid task type |
| 597 | `ERR_TASK_INVALID_PRIORITY` | invalid task priority |
| 598 | `ERR_TASK_MEDIA_LIMIT_REACHED` | maximum number of media files reached for this task |
| 599 | `ERR_TASK_CANNOT_REASSIGN` | task cannot be reassigned in its current status |
| 600 | `ERR_TASK_ASSIGNEE_NOT_FOUND` | assignee user not found |
| 601 | `ERR_TASK_COMMENT_NOT_FOUND` | task comment not found |

#### Notification Types
| Type | Trigger | Recipients |
|---|---|---|
| `new_task` | Task created | Assignee |
| `task_accepted` | Task accepted | Creator |
| `task_completed` | Task completed | Creator |
| `task_rejected` | Task rejected | Creator |
| `task_canceled` | Task canceled | Assignee |
| `task_reassigned` | Task reassigned | New assignee (+ old assignee) |
| `task_commented` | Comment added | Creator + assignee |
| `task_update` | Task details updated | Creator + assignee |

#### Design Notes
- **Soft deletion:** Tasks use `TSK_DELETED_ON` timestamp. Comments and media use their own `*_DELETED_ON` columns.
- **Community scoping:** Officers are restricted to tasks within their community. Admins see all.
- **Media handling:** Media (images, video, documents) stored in separate `task_media` table (not JSON columns). This allows tracking per-file metadata (uploader, type, confirmation flag).
- **Confirmation media:** Resolution/confirmation attachments are flagged with `TMD_IS_CONFIRMATION=1` to distinguish from initial task media.
- **Notifications:** Uses `$executeAPI` to create bulk notifications. All status changes notify relevant parties.
- **Deferred features:** See `docs/deferred_requirements/04-task-enhancements.md` for ETA integration with GPS, vendor assignment, task templates, and dashboard analytics.

---

## Phase 4 — Map & Physical Infrastructure

### 4.1 Asset (`platform/api/asset.js`, `platform/funcs/asset.js`)

The Asset module manages physical infrastructure on community maps: assets (cameras, doors, gates, etc.), posts (guard stations where officers are assigned during shifts), map zones (entry/exit points, high-priority zones), and community map image upload.

#### Database Tables (V 4.6.0)

| Table | Prefix | Purpose |
|-------|--------|---------|
| `post` | `PST_` | Named guard posts within a community. Unique name per community. Has `PST_IS_ACTIVE` for soft deactivation. `PST_PERMISSIONS` (JSON) stores scheduling allocation requirements. FK to `community` and `user`. |
| `asset` | `AST_` | Physical infrastructure items (cameras, doors, etc.) placed on the community map. `AST_ACRES` stores server-calculated area. FK to `community` and `user`. |
| `map_zone` | `MZN_` | Entry/exit points and high-priority zones drawn on the community map. FK to `community` and `user`. |

All three tables use the standard soft-delete pattern (`*_DELETED_ON`).

#### $DataItems Files

| File | Defines | Constants |
|------|---------|-----------|
| `asset_type.json` | DB-backed lookup (`source: "db"`) | Managed via Settings CRUD |
| `asset_shape.json` | `place`, `circle`, `line` | `$Const.ASSET_SHAPE_PLACE`, `$Const.ASSET_SHAPE_CIRCLE`, `$Const.ASSET_SHAPE_LINE` |
| `post_priority.json` | `urgent`, `important`, `normal`, `low` | `$Const.POST_PRIORITY_URGENT`, `$Const.POST_PRIORITY_IMPORTANT`, `$Const.POST_PRIORITY_NORMAL`, `$Const.POST_PRIORITY_LOW` |
| `map_zone_type.json` | `entry_exit`, `high_priority` | `$Const.MAP_ZONE_TYPE_ENTRY_EXIT`, `$Const.MAP_ZONE_TYPE_HIGH_PRIORITY` |

#### API Endpoints

| Endpoint | ACL | Description |
|----------|-----|-------------|
| `Asset/get_assets_list` | ADMIN | Paginated asset list with type/search filters |
| `Asset/get_asset` | ADMIN | Get single asset details |
| `Asset/create_asset` | ADMIN | Create asset on map |
| `Asset/create_assets_batch` | ADMIN | Batch-create up to 100 assets with shared metadata |
| `Asset/update_asset` | ADMIN | Edit asset details |
| `Asset/delete_asset` | ADMIN | Soft-delete an asset |
| `Asset/get_posts_list` | ADMIN, OFFICER | Paginated post list (officers: own community only) |
| `Asset/get_post` | ADMIN, OFFICER | Get single post details |
| `Asset/create_post` | ADMIN | Create a named post (unique within community) |
| `Asset/update_post` | ADMIN | Edit post details (name, priority, shape, location, equipment, active status) |
| `Asset/delete_post` | ADMIN | Delete post (blocked if used in shifts — use deactivation instead) |
| `Asset/get_map_zones` | ADMIN, OFFICER | Get entry/exit points and high-priority zones |
| `Asset/create_map_zone` | ADMIN | Create a map zone |
| `Asset/update_map_zone` | ADMIN | Edit a map zone |
| `Asset/delete_map_zone` | ADMIN | Soft-delete a map zone |
| `Asset/upload_community_map` | ADMIN | Upload or replace the 2D community map image |
| `Asset/get_asset_metadata` | ADMIN, OFFICER | Get dropdowns: asset types, shapes, post priorities, zone types |

#### Implementation Details

- **Shapes:** All map elements (assets, posts) support three shapes: `place` (single point), `circle` (centre + radius), `line` (array of coordinates). Validated via `$DataItems.isValidItemId()` against `asset_shape`.
- **Acres calculation:** `AST_ACRES` is calculated server-side on every insert/update: place=0, line=0, circle=`π×r²/4046.86` (radius in meters from location JSON). Ensures consistent values across all clients.
- **Location storage:** Coordinates are stored as JSON in `*_LOCATION` columns. The server accepts and returns parsed JSON objects.
- **Post uniqueness:** Post names must be unique within a community. Enforced both at DB level (`UQ_PST_COM_NAME`) and in application code.
- **Post permissions:** `PST_PERMISSIONS` (JSON, nullable) stores scheduling allocation requirements: `{required_roles:[], required_badges:[], required_equipment:[]}`. Phase 4.1 stores and retrieves only; Phase 5.1 (Shift) will validate officer eligibility against these requirements during shift assignment (non-blocking warnings with manager override).
- **Post deletion guard:** Posts that have been referenced by the Shift module (`shift_post` table) cannot be deleted — they can only be deactivated (`PST_IS_ACTIVE=0`). The guard uses `information_schema` to check if the `shift_post` table exists (graceful when Shift module is not yet deployed).
- **Map item limit:** All creation endpoints enforce a configurable per-community cap (default 1,000) on total map items (assets + posts + zones). Configurable via `settings:asset → max_map_items_per_community` in `key_value`. Error: `ERR_MAP_ITEM_LIMIT_EXCEEDED` (762).
- **Batch asset creation:** `create_assets_batch` creates up to 100 assets in a single transaction, sharing asset type, shape, description, and dates across all items. Each asset gets its own location from the `locations` array. The map item limit check validates `current_count + batch_size` before inserting.
- **Community map upload:** Uses `$Utils.saveNewImageOrKeepOld()` to save the map image, updates `community.COM_MAP_IMAGE`, and returns the resolved URL via `$Files.SQL` + `$Files.getUrl()`.
- **Officer access:** Officers can view posts and map zones in their own community. Community ID is auto-resolved from `user_details.USD_COM_ID`.

#### Asset & Post Error Codes (750–769)

| RC | Constant | Message |
|----|----------|---------|
| 750 | `ERR_ASSET_NOT_FOUND` | asset not found |
| 751 | `ERR_ASSET_INVALID_TYPE` | invalid asset type |
| 752 | `ERR_POST_NOT_FOUND` | post not found |
| 753 | `ERR_POST_NAME_ALREADY_EXISTS` | a post with this name already exists in this community |
| 754 | `ERR_MAP_ZONE_NOT_FOUND` | map zone not found |
| 755 | `ERR_ASSET_INVALID_SHAPE` | invalid asset shape |
| 756 | `ERR_POST_INVALID_PRIORITY` | invalid post priority |
| 757 | `ERR_POST_INVALID_SHAPE` | invalid post shape |
| 758 | `ERR_MAP_ZONE_INVALID_TYPE` | invalid map zone type |
| 759 | `ERR_POST_HAS_SHIFT_HISTORY` | post has been used in a shift and cannot be deleted, only deactivated |
| 760 | `ERR_ASSET_BATCH_EMPTY` | batch asset list is empty |
| 761 | `ERR_ASSET_BATCH_LIMIT_EXCEEDED` | batch asset list exceeds maximum allowed size |
| 762 | `ERR_MAP_ITEM_LIMIT_EXCEEDED` | maximum number of map items reached for this community |

#### Design Notes

- **No notifications:** The Asset module does not trigger notifications. Notifications for post-related events (e.g., post order updates, shift changes) are handled by the Post Order and Shift modules respectively.
- **No status lifecycle:** Assets and map zones do not have a status field. Posts use `PST_IS_ACTIVE` as a simple boolean toggle rather than a multi-state lifecycle.
- **Post Orders link:** Posts serve as the anchor for Post Orders (Phase 6.1). The `post_order` table will reference `PST_ID` as a foreign key.
- **Shift dependency:** Posts are used as waypoints and officer assignments in shifts (Phase 5.1). The `shift_post` table will reference `PST_ID`.
- **Deferred features:** See `docs/deferred_requirements/05-asset-enhancements.md` for map item grouping/clustering, acres calculation, permissions per post, and the 1,000-item limit enforcement.

---

## Development Best Practices

For comprehensive development best practices, including database code guidelines, implementation checklists, and common patterns, see the **"Critical Rules & Best Practices"** section in `docs/brain.md`.

Key reminders:
- **Never** execute `$Db.executeQuery()` inside loops - use bulk operations with `IN` clauses
- **Never** include `SELECT` queries inside transactions - fetch all data before `$Db.beginTransaction()`
- Always use soft deletion pattern (`UPDATE SET *_DELETED_ON=?`) instead of `DELETE FROM`
- Prepare data in memory before starting transactions to minimize lock time

See `docs/brain.md` for complete guidelines, code examples, and pre-implementation checklist.
