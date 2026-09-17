# Route Module — Deferred Requirements

**Created:** 2026-10-01
**Module:** `platform/api/route.js`, `platform/funcs/route.js`

---

## ~~1. AI Route Generation Engine (SDS 4.8.1)~~ — Partially Resolved

**Requirement:** The route engine should analyse site layouts, incident history, officer locations, and operational priorities to recommend optimal patrol routes. Inputs include: incident hotspots (last 90 days), officer GPS start position, shift duration, vehicle/foot patrol type, time of day, and coverage priority zones.

**Resolved (Phase 5.2):** Nearest-Neighbour TSP algorithm implemented in `route.js` (`orderWaypointsByNearestNeighbour`). Uses Haversine distance for greedy nearest-neighbour ordering. Mandatory (assigned) waypoints are ordered first, then optional (community) waypoints continue the chain. No external API dependencies.

**Still deferred (Phase 5.2.1):** Incident hotspot weighting, officer GPS start position integration, shift duration constraints, vehicle/foot patrol distinction, coverage priority zone injection. External solver integration (Google OR-Tools / OSRM) for large route sets. These require GPS Tracking module (Phase 5.3) and analytics infrastructure.

---

## ~~2. Automatic Route Generation on Shift Publish (SDS 4.8.1)~~ — ✅ Resolved

**Resolved:** Implemented in `shift.js → publish_shift()`. Controlled by `settings:route → auto_generate_routes_on_publish` (default: `true`). After shift status update succeeds, calls `Route/generate_route` for each allocated officer. Failures are logged as warnings but do not block the publish. Setting managed via `Settings/get_route_settings` / `Settings/update_route_settings`.

---

## 3. Coverage Priority Zones (SDS 4.8.1)

**Requirement:** Manager-defined high-priority zones (map polygons) must be visited at a defined frequency. The route engine should incorporate these as mandatory/weighted waypoints.

**Current behavior:** Map zones exist in the `map_zone` table (from Asset module) but are not referenced by the Route module.

**Dependencies:** Map zone types for priority zones, frequency configuration.

**Implementation notes:** Add a `settings:route → zone_visit_frequency_min` configuration. During route generation, query `map_zone` records with type=priority for the community and inject centroid waypoints at appropriate intervals.

---

## 4. Vehicle vs Foot Patrol (SDS 4.8.1)

**Requirement:** Route type and waypoint spacing are adjusted based on whether the officer is on foot or in a vehicle.

**Current behavior:** All routes assume walking pace (~5 km/h). `WALKING_SPEED_M_PER_MIN` constant used for ETA calculation.

**Dependencies:** Officer role/assignment metadata indicating patrol type. Potentially `OFC_PATROL_TYPE` column on `officer` or `shift_officer`.

**Implementation notes:** Add a `patrol_type` field to `shift_officer` or `patrol_route` (values: `foot`, `vehicle`). Adjust `WALKING_SPEED_M_PER_MIN` to `VEHICLE_SPEED_M_PER_MIN` (~333 m/min, ~20 km/h) for vehicle patrols. Adjust default dwell times accordingly.

---

## 5. Route Regeneration (SDS 4.8.3)

**Requirement:** Manager can click "Regenerate" to discard manual edits and run the AI engine again on an existing route.

**Current behavior:** Not implemented. Manager must delete the route and call `generate_route` again. The current implementation prevents duplicate routes (same officer + shift), so regeneration would need to soft-delete the existing route first.

**Implementation notes:** Add a `Route/regenerate_route` API that soft-deletes the existing route and creates a new one in a single transaction. Alternatively, modify `generate_route` to accept an `overwrite: true` parameter.

---

## 6. Manager Drag-and-Drop Route Editing (SDS 4.8.3)

**Requirement:** The manager can drag waypoints to adjust the route manually, add new waypoints by clicking on the map, remove waypoints via X icon, and reorder via drag-and-drop in the waypoint list panel.

**Current behavior:** `Route/update_route` supports full waypoint array replacement. The client-side drag-and-drop UI would call this API with the reordered/modified array. Server-side support is complete.

**Dependencies:** Client-side map editing implementation only. No additional server changes needed.

---

## 7. Waypoint Skip Alerts (SDS 4.9.2)

**Requirement:** If an officer skips a waypoint (overdue by configurable threshold, default: 15 min), trigger a patrol compliance alert. Officer marker turns red on the live tracking map.

**Current behavior:** Threshold setting implemented: `settings:route → patrol_compliance_threshold_min` (default: 15, range: 5–60). Notification type `waypoint_skipped` registered. No monitoring cron exists yet.

**Dependencies:** Cron job infrastructure, GPS Tracking module (Phase 5.3).

**Implementation notes:** Create `cron_route_compliance_check.js` that runs every 5 minutes. For each active route, check if the current waypoint (earliest unvisited by `PTW_ORDER`) has been overdue beyond the threshold (based on `PTR_PUSHED_ON` + cumulative ETA to that waypoint). If so, send a `waypoint_skipped` notification to admins. Read threshold via `$RouteUtils.getRouteSettings()`.

---

## ~~8. ETA Calculation Between Waypoints (SDS 4.8.2)~~ — ✅ Resolved

**Resolved:** `PTW_ETA_FROM_PREV_MIN` is now populated during route generation using Haversine straight-line distance at walking pace (~5 km/h / 83 m/min). Each leg gets `Math.max(1, Math.round(legM / WALKING_SPEED_M_PER_MIN))`. Road-distance ETAs via Google Maps Directions API remain deferred to when an external routing service is integrated (Phase 5.2.1).

---

## ~~9. Total Route Distance Calculation (SDS 4.8.2)~~ — ✅ Resolved

**Resolved:** `PTR_TOTAL_DISTANCE_M` is now populated during route generation using Haversine straight-line distance between consecutive ordered waypoints via `calculateTotalDistanceM()`. `PTR_TOTAL_DURATION_MIN` includes both dwell time and travel estimate. Road-distance calculation via Directions API remains deferred.

---

## ~~10. Route Auto-Completion on Shift End~~ — ✅ Resolved

**Resolved:** When a shift transitions to `completed` (via `Shift/check_out` all-officers-out logic or `cron_shift_lifecycle_check.js`), all associated active routes are auto-completed via `$RouteUtils.completeActiveRoutesForShift()`. Unvisited waypoints remain as-is — compliance percentage calculated on demand by `Route/get_route_compliance`. Routes are never left `active` after shift completion.

---

## 11. Officer Navigation Deep-Link (SDS 3.11)

**Requirement:** Navigation instructions are provided via the device's default maps application (Google Maps or Apple Maps). The app deep-links to the maps app with the next waypoint as the destination.

**Current behavior:** Waypoint coordinates are returned in the API response. Deep-linking is a client-side feature.

**Dependencies:** Client-side implementation only. No server changes needed.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/route.js` | API endpoint definitions |
| `backend/platform/funcs/route.js` | Business logic implementation |
| `backend/platform/user_modules/route_utils.js` | Route settings + cross-module helpers |
| `backend/platform/data/route_status.json` | Route status $DataItems |
| `backend/platform/data/waypoint_priority.json` | Waypoint priority $DataItems |
| `backend/platform/data/notification_type.json` | Notification types (route_pushed, waypoint_skipped, route_updated, officer_off_route) |
| `backend/platform/config/runtime_config.js` | SETTINGS_DEFAULTS.route section |
| `backend/platform/definitions/constants.js` | KVL_SETTINGS_ROUTE constant |
| `backend/platform/api/settings.js` | get_route_settings / update_route_settings API |
| `backend/platform/funcs/settings.js` | Route settings CRUD implementation |
| `backend/platform/funcs/shift.js` | Auto-generate on publish + auto-complete on checkout |
| `backend/platform/jobs/cron_shift_lifecycle_check.js` | Auto-complete routes on shift lifecycle close |
| `db/db.sql` | Table schemas (patrol_route, patrol_waypoint, waypoint_visit) |
| `db/UpgradeDB.sql` | V 5.2.0 migration script |
