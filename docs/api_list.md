# Code4 - API List

## Overview

This document lists all APIs required for the Code4 Security Operations Platform, following the architecture and conventions defined in `docs/brain.md`.

**User Types:**
- `USER_TYPE_NA` (0) — Not authenticated
- `USER_TYPE_ADMIN` (1) — Management portal users (Super Admin, Manager, Planning, Logistics, Finance)
- `USER_TYPE_OFFICER` (2) — Mobile app users: security officers / patrol team
- `USER_TYPE_RESIDENT` (3) — Mobile app users: community residents / clients

**Admin Roles (sequential; `$UserRoles` converts to bitmasks internally):**
- `USER_ROLE_SUPER_ADMIN` = 2
- `USER_ROLE_MANAGER` = 3
- `USER_ROLE_PLANNING` = 4
- `USER_ROLE_LOGISTICS` = 5
- `USER_ROLE_FINANCE` = 6

---

## API Modules

### 1. Community (`platform/api/community.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Community/get_communities_list` | ADMIN | Get paginated list of communities with filters (active, search) |
| `Community/get_community` | ADMIN | Get community details by ID |
| `Community/add_community` | ADMIN | Create a new community |
| `Community/update_community` | ADMIN | Edit community details |
| `Community/delete_community` | ADMIN | Soft-delete community (only if no officers/residents/calls) |
| `Community/get_community_officers` | ADMIN | Get officers list for a community |
| `Community/get_community_residents` | ADMIN | Get residents list for a community |
| `Community/get_community_calls` | ADMIN | Get calls list for a community |
| `Community/assign_officer_to_community` | ADMIN | Associate an officer with a community |
| `Community/remove_officer_from_community` | ADMIN | Remove officer from community |
| `Community/get_featured_officer` | ADMIN, OFFICER, RESIDENT | Get featured officer banner for a community |
| `Community/update_featured_officer` | ADMIN | Update featured officer banner |
| `Community/delete_featured_officer` | ADMIN | Remove featured officer banner |

---

### 2. Resident (`platform/api/resident.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Resident/get_residents_list` | ADMIN | Get paginated list of residents with filters |
| `Resident/get_resident` | ADMIN | Get resident details |
| `Resident/add_resident` | ADMIN | Create a new resident in a community |
| `Resident/update_resident` | ADMIN | Edit resident details |
| `Resident/delete_resident` | ADMIN | Soft-delete resident (only if never logged in) |
| `Resident/get_my_details` | RESIDENT | Resident gets own details |
| `Resident/update_my_details` | RESIDENT | Resident updates own details |
| `Resident/search_resident` | OFFICER | Officer searches for a resident (by name, plate, address) |

---

### 3. Officer (`platform/api/officer.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Officer/get_officers_list` | ADMIN | Get paginated list of officers with filters |
| `Officer/get_officer` | ADMIN | Get officer details |
| `Officer/add_officer` | ADMIN | Create a new officer |
| `Officer/update_officer` | ADMIN | Edit officer details |
| `Officer/delete_officer` | ADMIN | Soft-delete officer (only if never logged in) |
| `Officer/get_my_details` | OFFICER | Officer gets own details |
| `Officer/update_my_details` | OFFICER | Officer updates own details |
| `Officer/get_officers_info` | RESIDENT | Resident gets officer info for their community |
| `Officer/add_evaluation` | ADMIN | Add evaluation to an officer |
| `Officer/get_evaluations` | ADMIN | Get officer evaluations |

---

### 4. Call (`platform/api/call.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Call/create_service_call` | RESIDENT | Resident creates a service (concierge) call |
| `Call/create_emergency_call` | RESIDENT | Resident creates an emergency call (security/medical) |
| `Call/create_panic_call` | OFFICER, RESIDENT | Resident or officer triggers panic button |
| `Call/create_test_call` | RESIDENT | Resident creates a communication test call |
| `Call/get_call` | ADMIN, OFFICER, RESIDENT | Get call details |
| `Call/get_open_calls` | ADMIN, OFFICER, RESIDENT | Get open calls list (filtered by role/community) |
| `Call/get_calls_history` | ADMIN, OFFICER, RESIDENT | Get closed/canceled calls history |
| `Call/update_call` | OFFICER | Update call details (officer adds comments/media) |
| `Call/cancel_call` | ADMIN, OFFICER, RESIDENT | Cancel a call |
| `Call/accept_call` | OFFICER | Officer accepts an emergency call |
| `Call/pass_call` | OFFICER | Officer passes an emergency call |
| `Call/resolve_call` | OFFICER | Officer resolves/closes a call |
| `Call/assign_officer` | ADMIN | Manager assigns officer to a service call |
| `Call/add_call_media` | OFFICER, RESIDENT | Upload images/video/audio to a call |
| `Call/add_call_document` | ADMIN, OFFICER | Upload document to a call |
| `Call/add_call_comment` | ADMIN, OFFICER, RESIDENT | Add communication/comment to a panic call |
| `Call/like_call` | RESIDENT | Resident likes a resolved call |
| `Call/delete_test_call` | ADMIN | Delete a test emergency call |
| `Call/get_call_metadata` | ADMIN, OFFICER, RESIDENT | Get call types, categories (data items) |
| `Call/export_call` | ADMIN | Export call as excel/email |
| `Call/get_calls_statistics` | ADMIN | Get calls dashboard statistics |

---

### 5. Task (`platform/api/task.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Task/get_tasks_list` | ADMIN, OFFICER | Get paginated tasks list with filters |
| `Task/get_task` | ADMIN, OFFICER | Get task details |
| `Task/create_task` | ADMIN, OFFICER | Create a new maintenance task |
| `Task/update_task` | ADMIN, OFFICER | Update task details |
| `Task/accept_task` | ADMIN, OFFICER | Accept and assign task to self |
| `Task/reject_task` | ADMIN, OFFICER | Reject a task with reason |
| `Task/complete_task` | ADMIN, OFFICER | Complete a task |
| `Task/cancel_task` | ADMIN, OFFICER | Cancel a task (by creator only, if still New) |
| `Task/reassign_task` | ADMIN, OFFICER | Reassign task to another user |
| `Task/add_task_comment` | ADMIN, OFFICER | Add comment to a task |
| `Task/add_task_media` | ADMIN, OFFICER | Upload images/video/document to a task |
| `Task/get_task_metadata` | ADMIN, OFFICER | Get task types list |

---

### 6. Shift (`platform/api/shift.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Shift/get_shifts_calendar` | ADMIN | Get shifts for calendar view (day/week/month) |
| `Shift/get_shift` | ADMIN, OFFICER | Get shift details |
| `Shift/create_shift` | ADMIN | Create a new shift |
| `Shift/update_shift` | ADMIN | Update shift details |
| `Shift/delete_shift` | ADMIN | Cancel/delete a draft shift |
| `Shift/cancel_shift` | ADMIN | Cancel a published shift |
| `Shift/publish_shift` | ADMIN | Publish a shift (notify officers) |
| `Shift/allocate_officer` | ADMIN | Allocate officer to a shift |
| `Shift/remove_officer` | ADMIN | Remove officer from a shift |
| `Shift/assign_post` | ADMIN | Assign post to an officer in a shift |
| `Shift/check_in` | OFFICER | Officer checks in for a shift |
| `Shift/check_out` | OFFICER | Officer checks out from a shift |
| `Shift/get_my_shifts` | OFFICER | Officer gets own shifts list |
| `Shift/get_my_hours` | OFFICER | Officer gets check-in/out hours history |
| `Shift/get_allocation_board` | ADMIN | Get available officers and shifts for drag-and-drop |
| `Shift/validate_allocation` | ADMIN | Check for conflicts (double-booking, overtime, rest gap) |
| `Shift/create_recurring_shifts` | ADMIN | Create a series of recurring shifts |
| `Shift/update_recurring_shifts` | ADMIN | Update recurring shifts (this/future/all) |

---

### 7. Route (`platform/api/route.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Route/generate_route` | ADMIN | Generate AI patrol route for a shift |
| `Route/get_route` | ADMIN, OFFICER | Get route details with waypoints |
| `Route/update_route` | ADMIN | Edit route (add/remove/reorder waypoints) |
| `Route/push_route` | ADMIN | Push updated route to officer's app |
| `Route/visit_waypoint` | OFFICER | Officer marks a waypoint as visited |
| `Route/get_route_compliance` | ADMIN | Get route compliance report for a shift |

---

### 8. Post Order (`platform/api/post_order.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `PostOrder/get_post_orders_list` | ADMIN, OFFICER, RESIDENT | Get post orders list (filtered by role) |
| `PostOrder/get_post_order` | ADMIN, OFFICER, RESIDENT | Get post order full content |
| `PostOrder/create_post_order` | ADMIN | Create a new post order |
| `PostOrder/update_post_order` | ADMIN | Edit post order sections |
| `PostOrder/publish_post_order` | ADMIN | Publish a draft post order (creates new version) |
| `PostOrder/archive_post_order` | ADMIN | Archive a post order |
| `PostOrder/delete_post_order` | ADMIN | Delete a draft post order with no published history |
| `PostOrder/get_version_history` | ADMIN | Get post order version history |
| `PostOrder/get_version` | ADMIN | Get a specific historical version |
| `PostOrder/acknowledge_post_order` | OFFICER | Officer acknowledges reading a post order |

---

### 9. POI (`platform/api/poi.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `POI/get_poi_list` | ADMIN, OFFICER | Get POI/Trespass/MRC records list |
| `POI/get_poi_record` | ADMIN, OFFICER | Get full record details |
| `POI/create_poi_record` | ADMIN | Create a new POI/Trespass/MRC record |
| `POI/update_poi_record` | ADMIN | Edit record details |
| `POI/publish_poi_record` | ADMIN | Publish draft record (Active) |
| `POI/inactivate_poi_record` | ADMIN | Inactivate a record with reason |
| `POI/archive_poi_record` | ADMIN | Archive expired/inactive records |
| `POI/export_poi_record` | ADMIN | Export record as PDF |
| `POI/get_poi_metadata` | ADMIN, OFFICER | Get threat levels, record types |
| `POI/mark_viewed` | OFFICER | Officer marks record as viewed |

---

### 10. Report (`platform/api/report.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Report/get_reports_list` | ADMIN, OFFICER, RESIDENT | Get incident reports list with filters |
| `Report/get_report` | ADMIN, OFFICER, RESIDENT | Get full report content |
| `Report/create_report` | OFFICER | Officer creates a new report (from call or standalone) |
| `Report/update_report` | ADMIN, OFFICER | Edit report content |
| `Report/submit_report` | OFFICER | Officer submits a draft report |
| `Report/approve_report` | ADMIN | Manager approves a report |
| `Report/deliver_report` | ADMIN | Manager delivers report to client |
| `Report/request_changes` | ADMIN | Manager requests changes on a report |
| `Report/get_report_for_client` | RESIDENT | Client views a delivered report |

---

### 11. Report Template (`platform/api/report_template.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `ReportTemplate/get_templates_list` | ADMIN | Get templates list |
| `ReportTemplate/get_template` | ADMIN, OFFICER | Get template details (officer needs for form) |
| `ReportTemplate/create_template` | ADMIN | Create a new report template |
| `ReportTemplate/update_template` | ADMIN | Edit template settings and sections |
| `ReportTemplate/duplicate_template` | ADMIN | Duplicate an existing template |
| `ReportTemplate/archive_template` | ADMIN | Archive a template |
| `ReportTemplate/activate_template` | ADMIN | Activate a draft template |
| `ReportTemplate/get_template_style` | ADMIN | Get template style/formatting settings |
| `ReportTemplate/update_template_style` | ADMIN | Update template formatting settings |

---

### 12. Asset (`platform/api/asset.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Asset/get_assets_list` | ADMIN | Get community assets list |
| `Asset/get_asset` | ADMIN | Get asset details |
| `Asset/create_asset` | ADMIN | Create a new asset on map |
| `Asset/create_assets_batch` | ADMIN | Create multiple assets at once |
| `Asset/update_asset` | ADMIN | Edit asset details |
| `Asset/delete_asset` | ADMIN | Delete an asset |
| `Asset/get_posts_list` | ADMIN, OFFICER | Get community posts list |
| `Asset/get_post` | ADMIN, OFFICER | Get post details |
| `Asset/create_post` | ADMIN | Create a new post on map |
| `Asset/update_post` | ADMIN | Edit post details |
| `Asset/delete_post` | ADMIN | Delete/inactivate a post |
| `Asset/get_map_zones` | ADMIN, OFFICER | Get map zones (entry/exit, priority zones) |
| `Asset/create_map_zone` | ADMIN | Create a map zone |
| `Asset/update_map_zone` | ADMIN | Edit a map zone |
| `Asset/delete_map_zone` | ADMIN | Delete a map zone |
| `Asset/upload_community_map` | ADMIN | Upload 2D community map |

---

### 13. Tracking (`platform/api/tracking.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Tracking/update_location` | OFFICER | Officer sends GPS location update |
| `Tracking/get_live_tracking` | ADMIN | Get all officer locations for live map |
| `Tracking/get_officer_location` | ADMIN | Get specific officer's current location |
| `Tracking/get_officer_route_history` | ADMIN | Get officer's GPS track for a time range |
| `Tracking/get_call_eta` | OFFICER, RESIDENT | Get ETA for an active emergency call |

---

### 14. Dashboard (`platform/api/dashboard.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Dashboard/get_overview` | ADMIN | Get dashboard overview (counts, recent items) |
| `Dashboard/get_calls_statistics` | ADMIN | Get calls statistics with filters |
| `Dashboard/get_tasks_summary` | ADMIN | Get tasks summary for dashboard |
| `Dashboard/get_reports_summary` | ADMIN | Get reports summary for dashboard |

---

### 15. Settings (`platform/api/settings.js`)

| API | ACL | Description |
|-----|-----|-------------|
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
| `Settings/add_po_section_type` | ADMIN | Add a post order section type |
| `Settings/update_po_section_type` | ADMIN | Edit a post order section type |
| `Settings/delete_po_section_type` | ADMIN | Delete a post order section type |
| `Settings/get_gps_settings` | ADMIN | Get GPS & tracking configuration |
| `Settings/update_gps_settings` | ADMIN | Update GPS & tracking configuration |
| `Settings/get_notification_settings` | ADMIN | Get push notification settings |
| `Settings/update_notification_settings` | ADMIN | Update push notification settings |
| `Settings/get_poi_settings` | ADMIN | Get POI & Trespass settings |
| `Settings/update_poi_settings` | ADMIN | Update POI & Trespass settings |
| `Settings/get_working_hours_settings` | ADMIN | Get working hours config |
| `Settings/update_working_hours_settings` | ADMIN | Update working hours config |

---

### 16. Notification (`platform/api/notification.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `Notification/get_notifications` | ADMIN, OFFICER, RESIDENT | Get user's notifications list |
| `Notification/mark_read` | ADMIN, OFFICER, RESIDENT | Mark notification as read |
| `Notification/mark_all_read` | ADMIN, OFFICER, RESIDENT | Mark all notifications as read |
| `Notification/get_unread_count` | ADMIN, OFFICER, RESIDENT | Get unread notifications count |

---

### 17. Admin User (`platform/api/admin_user.js`)

| API | ACL | Description |
|-----|-----|-------------|
| `AdminUser/get_users_list` | ADMIN (Super Admin role) | Get management system users list |
| `AdminUser/get_user` | ADMIN (Super Admin role) | Get user details |
| `AdminUser/add_user` | ADMIN (Super Admin role) | Create a new management user |
| `AdminUser/update_user` | ADMIN (Super Admin role) | Edit management user details |
| `AdminUser/delete_user` | ADMIN (Super Admin role) | Soft-delete a management user |
| `AdminUser/reset_password` | ADMIN (Super Admin role) | Reset user password to initial |
| `AdminUser/change_password` | ADMIN | User changes own password |

---

## Notes

- All list APIs support pagination (`page` parameter) with a configurable page size.
- All list APIs support relevant filters and free-text search as described in the SDS.
- ACL definitions use `USER_TYPE_ADMIN`, `USER_TYPE_OFFICER`, and `USER_TYPE_RESIDENT` constants.
- Role-based access within ADMIN type is enforced via `$UserRoles` checks in implementation.
- Officer vs Resident access is enforced at ACL level via separate user types.
- All timestamps use UTC; timezone conversion happens on the client side.
- Push notifications are triggered within the relevant API implementations using `$Fcm`.
- WebSocket notifications for real-time updates use `$SocketService`.
- File uploads use the built-in `File/upload_file` API; references are stored in entity tables.
