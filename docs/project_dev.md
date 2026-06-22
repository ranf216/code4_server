# Server Implementation Documentation

**Document Version:** 1.3  
**Last Updated:** 2026-06-16
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

## Development Best Practices

For comprehensive development best practices, including database code guidelines, implementation checklists, and common patterns, see the **"Critical Rules & Best Practices"** section in `docs/brain.md`.

Key reminders:
- **Never** execute `$Db.executeQuery()` inside loops - use bulk operations with `IN` clauses
- **Never** include `SELECT` queries inside transactions - fetch all data before `$Db.beginTransaction()`
- Always use soft deletion pattern (`UPDATE SET *_DELETED_ON=?`) instead of `DELETE FROM`
- Prepare data in memory before starting transactions to minimize lock time

See `docs/brain.md` for complete guidelines, code examples, and pre-implementation checklist.
