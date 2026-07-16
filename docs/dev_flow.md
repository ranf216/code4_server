# Code4 - Development Flow

**Document Version:** 1.0
**Last Updated:** 2026-07-08
**Purpose:** Recommended order of implementation for the Code4 Security Operations Platform server modules

---

## Current State

The project infrastructure is set up with the following **built-in platform modules** already active:
- `user` - Authentication (email/password, phone OTP), session, admin user management, password recovery
- `system` - Health check, debugging, log analysis, service management
- `file` - File upload (base64 and multipart)
- `user_role` - Role management
- `api_test` - API testing

**Disabled modules:** `social_login` (commented out in `using_api.js`).

**Disabled User APIs** (via `"@mode": "off"`): `register`, `register_with_phone`, `register_with_email`, `send_email_code`, `resend_email_code`, `verify_email_code`, `login_with_email` — no self-registration; no email OTP login.

**User types** defined in `platform/definitions/user_types.js`:
- `USER_TYPE_NA` (0) - Not authenticated
- `USER_TYPE_ADMIN` (1) - Management portal users
- `USER_TYPE_OFFICER` (2) - Mobile app users: security officers / patrol team
- `USER_TYPE_RESIDENT` (3) - Mobile app users: community residents / clients

**Admin roles** defined in `platform/definitions/user_roles.js`:
- `USER_ROLE_ACCOUNT_IMPERSONATION` = 1
- `USER_ROLE_SUPER_ADMIN` = 2
- `USER_ROLE_MANAGER` = 3
- `USER_ROLE_PLANNING` = 4
- `USER_ROLE_LOGISTICS` = 5
- `USER_ROLE_FINANCE` = 6

**Implemented project-specific API modules:** `settings` (Phase 1.1), `community` (Phase 1.2), `admin_user` (Phase 1.3), `officer` (Phase 2.1), `resident` (Phase 2.2)

---

## Implementation Phases

### Phase 0 - Foundation & Configuration
**Priority: Immediate | Estimated Complexity: Low**

Before any API module, set up the project-level foundations:

1. ~~**Define admin roles**~~ ✅ Done — `USER_ROLE_SUPER_ADMIN` (2), `USER_ROLE_MANAGER` (3), `USER_ROLE_PLANNING` (4), `USER_ROLE_LOGISTICS` (5), `USER_ROLE_FINANCE` (6) in `platform/definitions/user_roles.js`
2. ~~**Define project error codes**~~ ✅ Done — RC 500–779 in `platform/definitions/errorcodes.en.js`
3. ~~**Add user types**~~ ✅ Done — `USER_TYPE_OFFICER` (2) and `USER_TYPE_RESIDENT` (3) defined in `platform/definitions/user_types.js`
4. ~~**Set up `$DataItems`**~~ ✅ Done — `service_type.json`, `task_type.json`, `asset_type.json`, `po_section_type.json` in `platform/data/`
5. ~~**Create the `community` table**~~ ✅ Done — `community` + `featured_officer` tables in `db/db.sql` and `db/UpgrdeDB.sql` (V 4.0.0)

**Why first:** Every other module depends on user roles, error codes, and the community entity.

---

### Phase 1 - Core Entities (no cross-dependencies)
**Priority: High | Estimated Complexity: Medium**

These are the foundational CRUD modules that all other features depend on. They have minimal dependencies on each other, so they can be developed in parallel or in quick succession.

#### ~~1.1 Settings (`platform/api/settings.js`)~~ ✅ Done
- ~~CRUD for `service_type`, `task_type`, `asset_type`, `po_section_type` via `$DataItems`~~
- ~~GPS & tracking configuration, notification settings, POI settings, working hours~~
- **DB tables:** `data_item` (lookup types CRUD), `key_value` (config settings storage)
- **Depends on:** Phase 0 (roles)
- **Why early:** Other modules reference these lookup types (calls use `service_type`, tasks use `task_type`, assets use `asset_type`, post orders use `po_section_type`)
- **Implementation:** 24 API endpoints (4 CRUD groups × 4 operations + 4 config groups × get/update). Data item CRUD uses the `data_item` table (multi-instance safe). Config settings use the `key_value` table with namespaced keys (e.g., `settings:gps`).

#### ~~1.2 Community (`platform/api/community.js`)~~ ✅ Done
- ~~Full CRUD for communities + featured officer banner~~
- **DB tables:** `community`, `featured_officer`
- **Depends on:** Phase 0
- **Why early:** Nearly every entity in the system is scoped to a community
- **Implementation:** 7 API endpoints — `get_communities`, `get_community`, `add_community`, `update_community`, `delete_community`, `get_featured_officer`, `set_featured_officer`, `delete_featured_officer`. Supports free-text search, inactive filtering, map image upload, officer/resident association, and timezone per community.

#### ~~1.3 Admin User (`platform/api/admin_user.js`)~~ ✅ Done
- ~~Management system user CRUD (Super Admin only), password reset, change password~~
- **DB tables:** Uses existing `user` / `user_details` tables
- **Depends on:** Phase 0 (roles)
- **Why early:** Needed to manage portal users before testing other admin-facing APIs
- **Implementation:** 8 API endpoints — `get_admin_users`, `get_admin_user`, `add_admin_user`, `update_admin_user`, `delete_admin_user`, `change_admin_user_role`, `reset_admin_user_password`, `change_my_password`. Supports free-text search, sorting, soft deletion, email-change with mandatory initial password, session termination, and last-active-admin protection.

---

### Phase 2 - People (Officers & Residents)
**Priority: High | Estimated Complexity: Medium**

Officers and residents are the primary actors. Calls, tasks, shifts, and all operational modules depend on them.

#### ~~2.1 Officer (`platform/api/officer.js`)~~ ✅ Done
- ~~Officer CRUD (admin), self-details (mobile), evaluations~~
- ~~Creates users with `USER_TYPE_OFFICER` (2)~~
- **DB tables:** `officer`, `officer_evaluation`
- **Depends on:** Community (Phase 1.2)
- **Why before Resident:** Officers are needed to accept calls, be assigned to shifts, and handle all operational workflows
- **Implementation:** 11 API endpoints — `get_officers`, `get_officer`, `add_officer`, `update_officer`, `delete_officer`, `get_my_details`, `update_my_details`, `get_officers_info`, `get_officer_evaluations`, `add_officer_evaluation`, `delete_officer_evaluation`. Supports free-text search, sorting, community filtering, image upload, phone OTP login authority, roles/certification badges (JSON arrays), evaluations with evaluator name, soft-delete (only if never logged in), session termination on deactivation/phone change, and resident-facing officer list.

#### ~~2.2 Resident (`platform/api/resident.js`)~~ ✅ Done
- ~~Resident CRUD (admin), self-details (mobile), search by officer~~
- ~~Creates users with `USER_TYPE_RESIDENT` (3)~~
- **DB tables:** `resident`
- **Depends on:** Community (Phase 1.2)
- **Implementation:** 8 API endpoints — `get_residents`, `get_resident`, `add_resident`, `update_resident`, `delete_resident`, `get_my_details`, `update_my_details`, `search_residents`. Supports free-text search, sorting, community filtering, property images (JSON array, up to 10), vehicle license plates (JSON array), special instructions, communication test flag, phone OTP login authority, soft-delete (only if no activity), session termination on deactivation/phone change, officer-facing resident search (scoped to community), and TODO placeholders for active-call checks (Phase 3).

#### 2.3 Notification (`platform/api/notification.js`)
- Get notifications, mark read, unread count
- **DB tables:** `notification`
- **Depends on:** Phase 0
- **Why here:** Starting from Phase 3, most operations trigger push notifications. Having the notification infrastructure ready before implementing calls/tasks avoids backtracking.

---

### Phase 3 - Core Operations
**Priority: High | Estimated Complexity: High**

The primary operational workflows. This is the heart of the application.

#### 3.1 Call (`platform/api/call.js`)
- Create service/emergency/panic/test calls, accept/pass/resolve/cancel, media/document/comment management, like reaction, statistics, export
- Complex status lifecycle: New -> Accepted -> Resolved / Canceled
- Push notifications to officers on new calls, status changes
- WebSocket real-time updates for panic calls
- **DB tables:** `call`, `call_media`, `call_document`, `call_comment`
- **Depends on:** Community, Officer, Resident, Notification
- **Why first in Phase 3:** Calls are the central feature of the platform - emergency response, concierge services, and panic buttons. All other operational features (reports, tracking, dashboard) reference calls.

#### 3.2 Task (`platform/api/task.js`)
- Maintenance task CRUD, status lifecycle (New -> Accepted -> Approved -> Completed / Rejected / Canceled), comments, media
- **DB tables:** `task`, `task_comment`, `task_media`
- **Depends on:** Community, Officer, Notification, Settings (task_type)
- **Can be parallel with:** Call (3.1) - no direct dependency

---

### Phase 4 - Map & Physical Infrastructure
**Priority: Medium | Estimated Complexity: Medium**

Map elements (posts, assets, zones) are needed before shifts/routes can be fully functional.

#### 4.1 Asset (`platform/api/asset.js`)
- Assets CRUD (cameras, doors, etc.), posts CRUD (physical guard posts), map zones, community map upload, batch asset creation
- **DB tables:** `post`, `asset`, `map_zone`
- **Depends on:** Community, Settings (asset_type)
- **Why before Shifts:** Shifts assign officers to posts, and routes use posts as waypoints

---

### Phase 5 - Scheduling & Operations
**Priority: Medium | Estimated Complexity: High**

Shift management and patrol routes are complex features that depend on officers, posts, and community setup.

#### 5.1 Shift (`platform/api/shift.js`)
- Shift calendar, CRUD, publish, officer allocation/removal, post assignment, check-in/out, recurring series, allocation board, conflict validation
- **DB tables:** `shift`, `shift_series`, `shift_officer`, `shift_post`, `shift_checkin`
- **Depends on:** Community, Officer, Asset/Post (Phase 4.1)
- **Why before Route:** Routes are generated per shift, assigned to officers within shifts

#### 5.2 Route (`platform/api/route.js`)
- AI patrol route generation, route CRUD, push to officer, waypoint visit tracking, compliance reports
- **DB tables:** `patrol_route`, `patrol_waypoint`, `waypoint_visit`
- **Depends on:** Shift (5.1), Asset/Post (4.1), Officer

#### 5.3 Tracking (`platform/api/tracking.js`)
- GPS location updates, live tracking map, officer location, route history, call ETA
- **DB tables:** `gps_log`
- **Depends on:** Officer, Call (for ETA), Shift (for on-duty context)
- **Can start in parallel with:** 5.1/5.2 since its core (location updates) is independent

---

### Phase 6 - Knowledge Base & Documentation
**Priority: Medium | Estimated Complexity: Medium-High**

Post orders and POI records are reference/knowledge systems that officers consume during shifts.

#### 6.1 Post Order (`platform/api/post_order.js`)
- Post order CRUD with sections, publish lifecycle (Draft -> Published -> Archived), version history, officer acknowledgement
- **DB tables:** `post_order`, `post_order_section`, `post_order_attachment`, `post_order_version`, `post_order_ack`
- **Depends on:** Community, Post (Phase 4.1), Settings (po_section_type)

#### 6.2 POI (`platform/api/poi.js`)
- Person of Interest / Trespass Order / Metro Red Card CRUD, publish lifecycle, export PDF, site assignment, incident linking, view tracking
- **DB tables:** `poi_record`, `poi_photo`, `poi_site`, `poi_incident`, `poi_export`, `poi_view`
- **Depends on:** Community, Call (for incident linking)
- **Can be parallel with:** Post Order (6.1)

---

### Phase 7 - Reporting
**Priority: Medium | Estimated Complexity: High**

Reports depend on templates and are generated from calls, making them late-stage features.

#### 7.1 Report Template (`platform/api/report_template.js`)
- Template CRUD, sections with configurable fields, community assignment, styling/formatting, duplicate, activate/archive
- **DB tables:** `report_template`, `report_template_community`, `report_template_section`, `report_template_field`
- **Depends on:** Community
- **Why before Report:** Officers need templates to create reports

#### 7.2 Report (`platform/api/report.js`)
- Incident report creation (from call or standalone), edit, submit, approval workflow (Draft -> Submitted -> Under Review -> Approved -> Delivered), client view
- **DB tables:** `incident_report`, `incident_report_section`, `incident_report_attachment`
- **Depends on:** Report Template (7.1), Call (3.1), Officer, Community

---

### Phase 8 - Dashboard & Analytics
**Priority: Low | Estimated Complexity: Medium**

Dashboard aggregates data from all other modules, so it must be last.

#### 8.1 Dashboard (`platform/api/dashboard.js`)
- Overview (counts, recent items), calls statistics, tasks summary, reports summary
- **DB tables:** None (reads from all other tables)
- **Depends on:** Call, Task, Report, Tracking (essentially everything)

---

## Summary - Implementation Order

| Order | Module | Key Dependencies | Files to Create |
|-------|--------|-----------------|-----------------|
| 0 | Foundation | - | `user_roles.js`, `errorcodes.en.js`, DB updates |
| 1.1 | Settings | Roles | `api/settings.js`, `funcs/settings.js` |
| 1.2 | Community | Roles | `api/community.js`, `funcs/community.js` |
| 1.3 | Admin User | Roles | `api/admin_user.js`, `funcs/admin_user.js` |
| 2.1 | Officer | Community | `api/officer.js`, `funcs/officer.js` |
| 2.2 | Resident | Community | `api/resident.js`, `funcs/resident.js` |
| 2.3 | Notification | - | `api/notification.js`, `funcs/notification.js` |
| 3.1 | Call | Community, Officer, Resident | `api/call.js`, `funcs/call.js` |
| 3.2 | Task | Community, Officer | `api/task.js`, `funcs/task.js` |
| 4.1 | Asset | Community | `api/asset.js`, `funcs/asset.js` |
| 5.1 | Shift | Community, Officer, Post | `api/shift.js`, `funcs/shift.js` |
| 5.2 | Route | Shift, Post | `api/route.js`, `funcs/route.js` |
| 5.3 | Tracking | Officer, Call | `api/tracking.js`, `funcs/tracking.js` |
| 6.1 | Post Order | Community, Post | `api/post_order.js`, `funcs/post_order.js` |
| 6.2 | POI | Community, Call | `api/poi.js`, `funcs/poi.js` |
| 7.1 | Report Template | Community | `api/report_template.js`, `funcs/report_template.js` |
| 7.2 | Report | Template, Call, Officer | `api/report.js`, `funcs/report.js` |
| 8.1 | Dashboard | All modules | `api/dashboard.js`, `funcs/dashboard.js` |

---

## Per-Module Checklist

For **each module** implementation, follow this sequence:

1. **DB tables** - Add to `db/db.sql` and `db/UpgrdeDB.sql`
2. **Error codes** - Add project-specific error codes to `errorcodes.en.js`
3. **API definition** - Create `platform/api/<module>.js` with parameter schemas and ACL
4. **API implementation** - Create `platform/funcs/<module>.js` with business logic
5. **Register module** - Add to `platform/config/using_api.js`
6. **Tests** - Add test methods in `platform/funcs/api_test.js`
7. **Code review** - Run through `docs/code_review_checklist.md`
8. **Document** - Update `docs/project_dev.md` with new flows

---

## Notes

- **Parallel opportunities:** Within each phase, modules listed can often be developed in parallel (e.g., Officer + Resident in Phase 2, Call + Task in Phase 3, Post Order + POI in Phase 6)
- **Phase 2 features** (from SDS section 1.8) are out of scope for initial development: Financial Tracking, Logistics & Supply, Vehicle Maintenance, Billing & Payments, Predictive Analytics
- **Push notifications** should be wired into Call, Task, Shift, POI, and Report modules as each is implemented, not deferred
- **WebSocket** real-time updates are critical for: Panic calls (two-way communication), Live tracking map, Call status changes
- **Testing** via the built-in API client (`/apiclient`) should be done continuously after each module
