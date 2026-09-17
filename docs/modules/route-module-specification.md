# Phase 5.2 — Patrol Route Optimisation: Technical Specification

**Version:** 5.2.0
**Module:** `platform/api/route.js`, `platform/funcs/route.js`, `platform/user_modules/route_utils.js`
**SDS Reference:** 3.11, 4.8.1–4.8.3, 4.9.1–4.9.2

---

## 1. Overview

The Patrol Route Optimisation module generates, manages, and tracks sequential patrol routes for officers during shifts. It automates waypoint sequencing using a Nearest-Neighbour TSP heuristic, supports manual route editing by administrators, records GPS-verified waypoint visits, and provides compliance reporting.

### 1.1 Module Boundaries

| Concern | Owner | Notes |
|---------|-------|-------|
| Route generation, editing, push, visit recording, compliance | `route.js` (API + funcs) | This module |
| Route settings (get/update) | `settings.js` (API + funcs) | Shared Settings module |
| Route utility helpers (cross-module) | `route_utils.js` | User module (`$RouteUtils`) |
| Auto-generation on shift publish | `shift.js → publish_shift()` | Shift module hook |
| Auto-completion on shift end | `shift.js → check_out()`, `cron_shift_lifecycle_check.js` | Shift module + cron hook |
| Waypoint skip alert cron | Deferred (Phase 5.2.1) | See Section 9 |
| Live tracking map overlay | Deferred (Phase 5.3) | GPS Tracking module |

---

## 2. Database Schema

### 2.1 `patrol_route` (Prefix: `PTR_`)

Stores one patrol route per officer per shift. Soft-deleted.

```sql
CREATE TABLE IF NOT EXISTS `patrol_route` (
  `PTR_ID`                 bigint unsigned NOT NULL AUTO_INCREMENT,
  `PTR_SFT_ID`             bigint unsigned NOT NULL  COMMENT 'FK to shift',
  `PTR_OFC_USR_ID`         varchar(128)    NOT NULL  COMMENT 'Officer user ID this route is assigned to',
  `PTR_COM_ID`             bigint unsigned NOT NULL  COMMENT 'Community this route belongs to',
  `PTR_NAME`               varchar(100)    DEFAULT NULL COMMENT 'Route display name (auto-generated or manager-set)',
  `PTR_STATUS`             varchar(20)     NOT NULL DEFAULT 'draft' COMMENT 'draft, active, completed',
  `PTR_TOTAL_DISTANCE_M`   int unsigned    DEFAULT NULL COMMENT 'Total estimated distance in metres',
  `PTR_TOTAL_DURATION_MIN`  int unsigned    DEFAULT NULL COMMENT 'Total estimated duration in minutes',
  `PTR_PUSHED_ON`          datetime        DEFAULT NULL COMMENT 'When route was pushed to officer app',
  `PTR_PUSHED_BY`          varchar(128)    DEFAULT NULL COMMENT 'Admin who pushed the route',
  `PTR_COMPLETED_ON`       datetime        DEFAULT NULL COMMENT 'When all waypoints were visited or shift ended',
  `PTR_CREATED_BY`         varchar(128)    NOT NULL,
  `PTR_CREATED_ON`         datetime        NOT NULL,
  `PTR_LAST_UPDATE`        datetime        DEFAULT NULL,
  `PTR_DELETED_ON`         datetime        DEFAULT NULL,
  PRIMARY KEY (`PTR_ID`),
  KEY `IX_PTR_SFT_ID`      (`PTR_SFT_ID`),
  KEY `IX_PTR_OFC_USR_ID`  (`PTR_OFC_USR_ID`),
  KEY `IX_PTR_COM_ID`      (`PTR_COM_ID`),
  KEY `IX_PTR_STATUS`      (`PTR_STATUS`),
  CONSTRAINT `FK_PTR_SFT_ID`       FOREIGN KEY (`PTR_SFT_ID`)      REFERENCES `shift` (`SFT_ID`),
  CONSTRAINT `FK_PTR_OFC_USR_ID`   FOREIGN KEY (`PTR_OFC_USR_ID`)  REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_PTR_COM_ID`       FOREIGN KEY (`PTR_COM_ID`)      REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_PTR_CREATED_BY`   FOREIGN KEY (`PTR_CREATED_BY`)  REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Cardinality constraint:** One route per officer per shift. Enforced at the application layer in `generate_route()` via a pre-insert uniqueness check on `PTR_SFT_ID + PTR_OFC_USR_ID` (Q1).

### 2.2 `patrol_waypoint` (Prefix: `PTW_`)

Ordered waypoints within a patrol route. Soft-deleted (delete-and-replace pattern on route update).

```sql
CREATE TABLE IF NOT EXISTS `patrol_waypoint` (
  `PTW_ID`                 bigint unsigned NOT NULL AUTO_INCREMENT,
  `PTW_PTR_ID`             bigint unsigned NOT NULL  COMMENT 'FK to patrol_route',
  `PTW_ORDER`              int unsigned    NOT NULL  COMMENT 'Sequential order in the route (1-based)',
  `PTW_PST_ID`             bigint unsigned DEFAULT NULL COMMENT 'FK to post (NULL for manually-added waypoints)',
  `PTW_NAME`               varchar(100)    NOT NULL  COMMENT 'Location name (post name or auto-generated label)',
  `PTW_LAT`                decimal(10,7)   NOT NULL  COMMENT 'Latitude',
  `PTW_LNG`                decimal(10,7)   NOT NULL  COMMENT 'Longitude',
  `PTW_ETA_FROM_PREV_MIN`  int unsigned    DEFAULT NULL COMMENT 'Estimated travel time from previous waypoint in minutes',
  `PTW_DWELL_TIME_MIN`     int unsigned    NOT NULL DEFAULT 5 COMMENT 'Recommended dwell time in minutes',
  `PTW_PRIORITY`           varchar(20)     NOT NULL DEFAULT 'normal' COMMENT 'critical, high, normal, low',
  `PTW_NOTES`              varchar(500)    DEFAULT NULL COMMENT 'Special instructions for this waypoint',
  `PTW_CREATED_ON`         datetime        NOT NULL,
  `PTW_DELETED_ON`         datetime        DEFAULT NULL,
  PRIMARY KEY (`PTW_ID`),
  KEY `IX_PTW_PTR_ID`  (`PTW_PTR_ID`),
  KEY `IX_PTW_PST_ID`  (`PTW_PST_ID`),
  KEY `IX_PTW_ORDER`   (`PTW_PTR_ID`, `PTW_ORDER`),
  CONSTRAINT `FK_PTW_PTR_ID` FOREIGN KEY (`PTW_PTR_ID`) REFERENCES `patrol_route` (`PTR_ID`),
  CONSTRAINT `FK_PTW_PST_ID` FOREIGN KEY (`PTW_PST_ID`) REFERENCES `post` (`PST_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.3 `waypoint_visit` (Prefix: `WPV_`)

Append-only audit log of officer waypoint visits. No soft-deletion column — records are immutable once created.

```sql
CREATE TABLE IF NOT EXISTS `waypoint_visit` (
  `WPV_ID`                 bigint unsigned NOT NULL AUTO_INCREMENT,
  `WPV_PTW_ID`             bigint unsigned NOT NULL  COMMENT 'FK to patrol_waypoint',
  `WPV_PTR_ID`             bigint unsigned NOT NULL  COMMENT 'FK to patrol_route (denormalised for faster queries)',
  `WPV_OFC_USR_ID`         varchar(128)    NOT NULL  COMMENT 'Officer who visited',
  `WPV_VISITED_ON`         datetime        NOT NULL  COMMENT 'Timestamp of visit',
  `WPV_VISIT_LAT`          decimal(10,7)   DEFAULT NULL COMMENT 'GPS latitude at time of visit',
  `WPV_VISIT_LNG`          decimal(10,7)   DEFAULT NULL COMMENT 'GPS longitude at time of visit',
  `WPV_DEVIATION_M`        int unsigned    DEFAULT NULL COMMENT 'Distance in metres from planned waypoint location',
  `WPV_IS_MANUAL`          tinyint unsigned NOT NULL DEFAULT 0 COMMENT '1 if officer tapped Mark as Visited manually',
  `WPV_CREATED_ON`         datetime        NOT NULL,
  PRIMARY KEY (`WPV_ID`),
  UNIQUE KEY `UQ_WPV_WAYPOINT` (`WPV_PTW_ID`),
  KEY `IX_WPV_PTR_ID`       (`WPV_PTR_ID`),
  KEY `IX_WPV_OFC_USR_ID`   (`WPV_OFC_USR_ID`),
  CONSTRAINT `FK_WPV_PTW_ID`      FOREIGN KEY (`WPV_PTW_ID`)     REFERENCES `patrol_waypoint` (`PTW_ID`),
  CONSTRAINT `FK_WPV_PTR_ID`      FOREIGN KEY (`WPV_PTR_ID`)     REFERENCES `patrol_route` (`PTR_ID`),
  CONSTRAINT `FK_WPV_OFC_USR_ID`  FOREIGN KEY (`WPV_OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key design decisions:**
- `UQ_WPV_WAYPOINT` enforces one visit per waypoint (prevents double-logging).
- `WPV_PTR_ID` is denormalised from `patrol_waypoint.PTW_PTR_ID` to allow compliance queries to fetch all visits for a route without joining through `patrol_waypoint`.
- No `WPV_DELETED_ON` — visits are append-only audit records, never updated or deleted.

### 2.4 Index Strategy

| Index | Table | Purpose |
|-------|-------|---------|
| `IX_PTR_SFT_ID` | `patrol_route` | Find all routes for a given shift |
| `IX_PTR_OFC_USR_ID` | `patrol_route` | Find all routes assigned to an officer |
| `IX_PTR_COM_ID` | `patrol_route` | Community-scoped route queries |
| `IX_PTR_STATUS` | `patrol_route` | Filter by route lifecycle status |
| `IX_PTW_PTR_ID` | `patrol_waypoint` | Fetch all waypoints for a route |
| `IX_PTW_PST_ID` | `patrol_waypoint` | Reverse-lookup: which routes include a given post |
| `IX_PTW_ORDER` | `patrol_waypoint` | Compound index for ordered waypoint retrieval per route |
| `UQ_WPV_WAYPOINT` | `waypoint_visit` | One visit per waypoint (unique constraint) |
| `IX_WPV_PTR_ID` | `waypoint_visit` | Fetch all visits for a route (compliance queries) |
| `IX_WPV_OFC_USR_ID` | `waypoint_visit` | Officer visit history |

### 2.5 Audit Trail Triggers

Configured in `db/triggers_def.js`:

- **`patrol_route`** — INSERT + UPDATE triggers track: `PTR_NAME`, `PTR_STATUS`, `PTR_TOTAL_DISTANCE_M`, `PTR_TOTAL_DURATION_MIN`, `PTR_PUSHED_ON`, `PTR_PUSHED_BY`, `PTR_COMPLETED_ON`, `PTR_LAST_UPDATE`, `PTR_DELETED_ON`. No DELETE trigger (soft-deletion).
- **`patrol_waypoint`** — INSERT + UPDATE triggers track: `PTW_DELETED_ON`. All other fields are set once on creation and replaced via soft-delete-and-reinsert. No DELETE trigger.
- **`waypoint_visit`** — No triggers. Append-only table (Rule 1 exclusion: records are never updated or deleted).

---

## 3. Data Enumerations

### 3.1 Route Status (`route_status.json`)

| ID | Display Name | `$Const` | Description |
|----|-------------|----------|-------------|
| `draft` | Draft | `ROUTE_STATUS_DRAFT` | Generated but not yet pushed to officer. Admin can edit waypoints. |
| `active` | Active | `ROUTE_STATUS_ACTIVE` | Pushed to officer's app. Officer can record waypoint visits. |
| `completed` | Completed | `ROUTE_STATUS_COMPLETED` | All waypoints visited, or shift ended. Immutable. |

### 3.2 Waypoint Priority (`waypoint_priority.json`)

| ID | Display Name | `$Const` |
|----|-------------|----------|
| `critical` | Critical | `WAYPOINT_PRIORITY_CRITICAL` |
| `high` | High | `WAYPOINT_PRIORITY_HIGH` |
| `normal` | Normal | `WAYPOINT_PRIORITY_NORMAL` |
| `low` | Low | `WAYPOINT_PRIORITY_LOW` |

### 3.3 Notification Types (Route-related entries in `notification_type.json`)

| Type Key | Title | Message Template |
|----------|-------|-----------------|
| `route_pushed` | New Patrol Route | A patrol route (#route_name#) has been pushed to your shift on #shift_date# |
| `route_updated` | Route Updated | Route #route_name# has been updated |
| `waypoint_skipped` | Waypoint Skipped | #officer_name# skipped waypoint #waypoint_name# on route #route_name# |
| `officer_off_route` | Officer Off Route | #officer_name# has deviated from assigned route #route_name# |

---

## 4. Configuration

### 4.1 Runtime Settings (`settings:route` Namespace)

Stored in the `key_value` table under key `$Const.KVL_SETTINGS_ROUTE` (`"settings:route"`).
Defaults defined in `runtime_config.js → SETTINGS_DEFAULTS.route`.

| Setting | Type | Default | Range | Description |
|---------|------|---------|-------|-------------|
| `auto_generate_routes_on_publish` | boolean | `true` | — | When `true`, `publish_shift()` auto-generates routes for all allocated officers (Q6). |
| `patrol_compliance_threshold_min` | integer | `15` | 5–60 | Minutes overdue at a waypoint before triggering a compliance alert (Q7). |

**API access:** `Settings/get_route_settings` (read), `Settings/update_route_settings` (write). Both ADMIN-only.

### 4.2 Constants

| Constant | Value | Source |
|----------|-------|--------|
| `MAX_NAME_LENGTH` | 100 | `funcs/route.js` |
| `MAX_NOTES_LENGTH` | 500 | `funcs/route.js` |
| `DEFAULT_DWELL_TIME_MIN` | 5 | `funcs/route.js` |
| `MAX_WAYPOINTS` | 200 | `funcs/route.js` |
| `WALKING_SPEED_M_PER_MIN` | 83 (~5 km/h) | `funcs/route.js` |
| `KVL_SETTINGS_ROUTE` | `"settings:route"` | `definitions/constants.js` |

---

## 5. Route Lifecycle State Machine

```
                   generate_route()
                        |
                        v
                   +---------+
                   |  draft  |  <-- Admin can edit waypoints (update_route)
                   +---------+
                        |
                   push_route()
                        |
                        v
                   +---------+
                   |  active |  <-- Officer records visits (visit_waypoint)
                   +---------+
                      /    \
          all waypoints     shift ends
            visited        (check_out / cron)
                |               |
                v               v
                   +------------+
                   | completed  |
                   +------------+
```

### 5.1 Transition Rules

| From | To | Trigger | Side Effects |
|------|----|---------|-------------|
| *(new)* | `draft` | `Route/generate_route` | Route + waypoints created in a single transaction. `PTR_TOTAL_DISTANCE_M` and `PTR_TOTAL_DURATION_MIN` calculated. |
| `draft` | `active` | `Route/push_route` | Sets `PTR_PUSHED_ON`, `PTR_PUSHED_BY`. Sends `route_pushed` notification to officer. |
| `active` | `completed` | `Route/visit_waypoint` (when all waypoints visited) | Sets `PTR_COMPLETED_ON` within the visit transaction. |
| `active` | `completed` | `$RouteUtils.completeActiveRoutesForShift()` | Bulk-updates all active routes for a shift. Called from `check_out()` and `cron_shift_lifecycle_check.js`. |

### 5.2 Disallowed Transitions

- `active` -> `draft` (no unpush)
- `completed` -> any (terminal state)
- `draft` -> `completed` (must be pushed first)

---

## 6. Core Server-Side Business Logic

### 6.1 Route Generation (`generate_route`)

**Decision log:** Q1 (one route per officer per shift), Q3 (assigned + community posts), Q4 (NN-TSP ordering), Q5 (Haversine, no external APIs).

**Algorithm:**

1. **Validate inputs:**
   - Shift must exist and not be soft-deleted.
   - Non-super-admin must belong to the shift's community.
   - Officer must be allocated to the shift (`shift_officer` table).
   - No existing route for this officer+shift combination (return `ERR_ROUTE_DUPLICATE`).

2. **Gather waypoint sources:**
   - **Mandatory waypoints:** Query `shift_post JOIN post` for posts assigned to this officer in this shift. These become mandatory waypoints.
   - **Optional waypoints:** Query `post` for all active posts in the shift's community. Exclude posts already in the mandatory set.
   - For each post, extract GPS coordinates from the `PST_LOCATION` JSON column (supports `{lat, lng}`, `{center: {lat, lng}, radius}`, and `{points: [{lat, lng}, ...]}` shapes — uses first point for line shapes).
   - Posts with unparseable or missing coordinates are silently excluded.

3. **Order by Nearest-Neighbour TSP:**
   - Separate waypoints into `assigned[]` and `optional[]`.
   - Apply `nnSort(assigned)` starting from the first assigned post — at each step, visit the closest unvisited assigned post by Haversine distance.
   - Apply `nnSortFrom(optional, lastAssignedLat, lastAssignedLng)` — continue the chain from where mandatory waypoints end.
   - Concatenate: mandatory ordered list + optional ordered list.

4. **Calculate route metrics:**
   - `PTR_TOTAL_DISTANCE_M`: Sum of Haversine distances between consecutive waypoints.
   - `PTW_ETA_FROM_PREV_MIN`: Per-leg travel time at walking pace (83 m/min). Minimum 1 minute per leg.
   - `PTR_TOTAL_DURATION_MIN`: Total dwell time (waypoint count * 5 min) + total travel time.

5. **Persist in transaction:**
   - INSERT into `patrol_route` → get `$Db.insertId()`.
   - Bulk INSERT all waypoints into `patrol_waypoint` in a single multi-value INSERT.
   - `$Db.isError()` checked after each write; rollback on failure.

### 6.2 Haversine Distance Formula

Used for all geographic distance calculations (straight-line, no road network).

```
R = 6,371,000 metres (Earth radius)
dLat = (lat2 - lat1) * PI / 180
dLng = (lng2 - lng1) * PI / 180
a = sin(dLat/2)^2 + cos(lat1 * PI/180) * cos(lat2 * PI/180) * sin(dLng/2)^2
c = 2 * atan2(sqrt(a), sqrt(1-a))
distance = R * c
```

**Accuracy note:** Haversine provides straight-line ("as the crow flies") distance. Actual walking/driving distances will be longer. Sufficient for waypoint ordering and approximate ETAs. Road-network distance via Google Maps Directions API or OSRM is deferred to Phase 5.2.1.

### 6.3 Nearest-Neighbour TSP Heuristic

```
function nnSortFrom(points, startLat, startLng):
    remaining = copy of points
    result = []
    curLat = startLat, curLng = startLng

    while remaining is not empty:
        bestIdx = index of closest point to (curLat, curLng) by Haversine
        chosen = remaining.splice(bestIdx, 1)
        result.push(chosen)
        curLat = chosen.lat, curLng = chosen.lng

    return result
```

**Complexity:** O(n^2) where n = number of waypoints. With `MAX_WAYPOINTS = 200`, worst case is 40,000 Haversine calculations — negligible for server-side generation.

**Optimality:** NN-TSP typically produces routes within 20–25% of optimal. Acceptable for patrol routes where exact optimality is not critical. External solver integration (Google OR-Tools) deferred to Phase 5.2.1.

### 6.4 Route Update (`update_route`)

Only draft routes can be updated. Uses a **soft-delete-and-replace** pattern:

1. Validate route exists, status = `draft`, admin has community access.
2. Parse and validate waypoint array (JSON): each must have `name`, valid `lat`/`lng`, optional `priority` (validated against `$DataItems`), `dwell_time_min`, `notes`.
3. Max 200 waypoints.
4. Transaction:
   - Soft-delete all existing waypoints: `UPDATE patrol_waypoint SET PTW_DELETED_ON=? WHERE PTW_PTR_ID=? AND PTW_DELETED_ON IS NULL`.
   - Bulk INSERT replacement waypoints.
   - UPDATE route metadata (`PTR_NAME`, `PTR_TOTAL_DURATION_MIN`, `PTR_LAST_UPDATE`).
5. Return updated route with new waypoints.

### 6.5 Push Route (`push_route`)

Transitions `draft` -> `active`:

1. Validate route exists, status = `draft` (return `ERR_ROUTE_ALREADY_PUSHED` if active, `ERR_ROUTE_INVALID_STATUS` otherwise).
2. Verify route has at least one waypoint.
3. UPDATE: Set `PTR_STATUS='active'`, `PTR_PUSHED_ON`, `PTR_PUSHED_BY`, `PTR_LAST_UPDATE`.
4. Send `route_pushed` push notification to the officer via `Notification/create_bulk_notifications`.

### 6.6 Visit Waypoint (`visit_waypoint`)

Officer-only endpoint for recording waypoint visits:

1. Validate waypoint exists (not soft-deleted).
2. Fetch parent route — officer must be the assigned officer.
3. Route must be `active` (return `ERR_ROUTE_NOT_PUSHED` otherwise).
4. Waypoint must not already be visited (`UQ_WPV_WAYPOINT` also enforces this at DB level).
5. **GPS deviation calculation:** If officer provides `lat`/`lng`, calculate Haversine distance from waypoint's planned `PTW_LAT`/`PTW_LNG`. Store as `WPV_DEVIATION_M` (integer metres).
6. **All-waypoints-visited check** (computed before the transaction, no SELECT inside transaction):
   - Fetch all waypoints and all existing visits.
   - Build a set of visited waypoint IDs + the current waypoint.
   - If all waypoints are now visited, auto-complete the route within the same transaction.
7. Transaction:
   - INSERT into `waypoint_visit`.
   - If all visited: UPDATE `patrol_route` SET `PTR_STATUS='completed'`, `PTR_COMPLETED_ON`.
8. Return visit details including `route_completed: true/false`.

### 6.7 Route Compliance (`get_route_compliance`)

Admin-only read endpoint returning compliance metrics:

- `compliance_percent`: `Math.round((visited_count / total_waypoints) * 100)`
- `avg_deviation_m`: Average `WPV_DEVIATION_M` across visits with GPS data.
- `manual_visit_count`: Count of visits where `WPV_IS_MANUAL = 1`.
- `total_planned_dwell_min`: Sum of all waypoints' `PTW_DWELL_TIME_MIN`.
- Per-waypoint detail array with visit status, deviation, and manual flag.

---

## 7. Cross-Module Integration

### 7.1 Auto-Generation on Shift Publish (Q6)

**File:** `funcs/shift.js → publish_shift()`

After the shift status is updated to `published` and officers are notified:

```
if (routeSettings.auto_generate_routes_on_publish)
    for each officerId in allocatedOfficers:
        try:
            $executeAPI(session, "Route/generate_route", {shift_id, officer_id})
        catch routeErr:
            $Logger.logString(WARNING, "Auto route generation failed for officer ...")
```

- Controlled by `settings:route → auto_generate_routes_on_publish`.
- Failures are logged as warnings — they never block the shift publish.
- Each officer's route is generated independently via `$executeAPI` (not raw DB inside loop).

### 7.2 Auto-Completion on Shift End (Q8)

**File:** `funcs/shift.js → check_out()` and `jobs/cron_shift_lifecycle_check.js`

When a shift transitions to `completed`:

```js
$RouteUtils.completeActiveRoutesForShift(shiftId, now);
```

- Queries all `patrol_route` records with `PTR_SFT_ID=? AND PTR_STATUS='active'`.
- Bulk-updates to `status='completed'` using `IN (toPlaceholders())`.
- Unvisited waypoints remain unchanged — compliance percentage is calculated on-demand by `get_route_compliance`.
- Wrapped in try/catch — failures do not block shift completion.

### 7.3 Route Settings (`$RouteUtils.getRouteSettings()`)

**File:** `user_modules/route_utils.js`

Reads `key_value` for `settings:route`, merges with `SETTINGS_DEFAULTS.route` from `runtime_config.js`. Falls back to defaults on parse error.

---

## 8. Error Codes

| Error Constant | RC | Message | Trigger |
|----------------|----:|---------|---------|
| `ERR_ROUTE_NOT_FOUND` | 640 | route not found | Route ID does not exist or is soft-deleted |
| `ERR_ROUTE_NO_POSTS_AVAILABLE` | 641 | no posts available for route generation | No posts with valid coordinates in the community |
| `ERR_ROUTE_ALREADY_PUSHED` | 642 | route has already been pushed to officer | `push_route` on an already-active route |
| `ERR_WAYPOINT_NOT_FOUND` | 643 | waypoint not found | Waypoint ID does not exist or is soft-deleted |
| `ERR_WAYPOINT_ALREADY_VISITED` | 644 | waypoint has already been visited | `visit_waypoint` on a waypoint with existing visit record |
| `ERR_ROUTE_INVALID_STATUS` | 645 | invalid route status for this operation | Status transition not permitted |
| `ERR_ROUTE_SHIFT_NOT_FOUND` | 646 | shift not found or not accessible | Shift ID invalid or soft-deleted |
| `ERR_ROUTE_OFFICER_NOT_ALLOCATED` | 647 | officer is not allocated to this shift | Officer not in `shift_officer` for the given shift |
| `ERR_ROUTE_DUPLICATE` | 648 | a route already exists for this officer and shift | One route per officer per shift constraint |
| `ERR_ROUTE_INVALID_WAYPOINTS` | 649 | at least one waypoint is required | Empty or malformed waypoint array |
| `ERR_ROUTE_INVALID_COORDINATES` | 650 | invalid waypoint coordinates | `lat` not in [-90, 90] or `lng` not in [-180, 180] |
| `ERR_ROUTE_CANNOT_UPDATE` | 651 | route cannot be updated in its current status | `update_route` on non-draft route |
| `ERR_ROUTE_NOT_PUSHED` | 652 | route has not been pushed to officer yet | `visit_waypoint` on a draft route |

---

## 9. Deferred Requirements

The following capabilities are specified in the SDS but deferred beyond Phase 5.2.0. Full details in `docs/deferred_requirements/07-route-enhancements.md`.

| # | Requirement | SDS Ref | Dependency | Notes |
|---|------------|---------|------------|-------|
| 1 | AI route engine (incident hotspots, officer GPS start, shift duration, time-of-day weighting) | 4.8.1 | GPS Tracking (Phase 5.3), Analytics | NN-TSP baseline shipped; external solver integration (OR-Tools / OSRM) deferred to Phase 5.2.1. |
| 3 | Coverage Priority Zones | 4.8.1 | Map zone frequency config | `map_zone` table exists (Asset module) but not referenced by route generation. |
| 4 | Vehicle vs. Foot Patrol | 4.8.1 | `patrol_type` field on `shift_officer` or `patrol_route` | All routes currently assume walking pace (~5 km/h). |
| 5 | Route Regeneration API | 4.8.3 | — | Soft-delete + re-generate in one transaction. Or `overwrite: true` param on `generate_route`. |
| 7 | Waypoint Skip Alert Cron (`cron_route_compliance_check.js`) | 4.9.2 | GPS Tracking (Phase 5.3) | Threshold setting implemented (`patrol_compliance_threshold_min`). Notification type registered. Cron not yet created. |
| 11 | Officer Navigation Deep-Link | 3.11 | Client-side only | Waypoint coordinates are in API responses. Deep-link to Google/Apple Maps is a mobile app feature. |
| — | NFC / Barcode physical waypoint scanning | — | Hardware, mobile SDK | Future alternative to GPS-based visit verification. |
| — | Offline mobile map tile caching | — | Mobile app architecture | For areas with poor connectivity. |
| — | Live telemetry overlay on tracking map | 4.9.1 | GPS Tracking (Phase 5.3) | Real-time officer position on route polyline overlay. |

---

## 10. File Inventory

| File | Purpose |
|------|---------|
| `backend/platform/api/route.js` | API endpoint definitions (6 endpoints) |
| `backend/platform/funcs/route.js` | Business logic, helpers, TSP algorithm |
| `backend/platform/user_modules/route_utils.js` | `$RouteUtils` — route settings, cross-module helpers |
| `backend/platform/api/settings.js` | `get_route_settings`, `update_route_settings` API definitions |
| `backend/platform/funcs/settings.js` | Route settings CRUD implementation |
| `backend/platform/config/runtime_config.js` | `SETTINGS_DEFAULTS.route` defaults |
| `backend/platform/config/using_api.js` | `"route"` registered in API list |
| `backend/platform/config/using_modules.js` | `"route_utils"` registered in user modules list |
| `backend/platform/definitions/constants.js` | `KVL_SETTINGS_ROUTE` constant |
| `backend/platform/definitions/errorcodes.en.js` | Error codes rc 640–652 |
| `backend/platform/data/route_status.json` | `$DataItems` for route status enum |
| `backend/platform/data/waypoint_priority.json` | `$DataItems` for waypoint priority enum |
| `backend/platform/data/notification_type.json` | Push notification type definitions |
| `backend/platform/funcs/shift.js` | Auto-generate on publish, auto-complete on checkout |
| `backend/platform/jobs/cron_shift_lifecycle_check.js` | Auto-complete routes on shift lifecycle close |
| `db/db.sql` | Full table schemas |
| `db/UpgradeDB.sql` | V 5.2.0 migration script |
| `db/triggers_def.js` | Audit trail trigger definitions for `patrol_route`, `patrol_waypoint` |
