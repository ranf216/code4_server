# Phase 5.3 — GPS & Live Tracking: Technical Specification

**Version:** 5.3.0
**Module:** `platform/api/tracking.js`, `platform/funcs/tracking.js`
**SDS Reference:** 2.4.1.3.1, 4.9.1–4.9.6, 5.3

---

## 1. Overview

The GPS & Live Tracking module provides real-time officer location telemetry for operational visibility, emergency response coordination, and patrol compliance monitoring. Officers push GPS position updates from their mobile devices. Administrators view live officer positions on a map with color-coded status indicators. The module integrates with the Shift (Phase 5.1), Route (Phase 5.2), and Call (Phase 3.1) modules to provide contextual status evaluation.

### 1.1 Module Boundaries

| Concern | Owner | Notes |
|---------|-------|-------|
| GPS telemetry ingestion and storage | `tracking.js` (API + funcs) | This module |
| Live officer map positions with status | `tracking.js` (API + funcs) | This module |
| Single officer location lookup | `tracking.js` (API + funcs) | This module |
| Historical GPS track retrieval | `tracking.js` (API + funcs) | This module |
| Emergency call ETA calculation | `tracking.js` (API + funcs) | This module |
| GPS settings (get/update) | `settings.js` (API + funcs) | Shared Settings module |
| Route settings (patrol compliance threshold) | `settings.js` (API + funcs) | Shared Settings module |
| GPS log retention cleanup | `cron_gps_log_cleanup.js` | Standalone PM2 cron job |
| Shift check-in/check-out status | `shift.js` | Shift module (Phase 5.1) |
| Patrol route & waypoint compliance | `route.js`, `route_utils.js` | Route module (Phase 5.2) |
| Emergency call status & assignment | `call.js` | Call module (Phase 3.1) |
| Background GPS push notifications | Deferred (Phase 5.3.1) | See Section 9 |
| Google Maps Directions API integration | Deferred (Phase 5.3.1) | See Section 9 |
| Native geofencing alerts | Deferred (Phase 5.3.1) | See Section 9 |
| Nearest-officer dispatch | Deferred (Call module enhancement) | See Section 9 |

---

## 2. Database Schema

### 2.1 `gps_log` (Prefix: `GPL_`)

Append-only GPS telemetry log. Records are never individually updated or soft-deleted. Retention cleanup is performed by `cron_gps_log_cleanup.js` via bounded batch hard-deletion.

```sql
CREATE TABLE IF NOT EXISTS `gps_log` (
  `GPL_ID`          bigint unsigned  NOT NULL AUTO_INCREMENT,
  `GPL_OFC_USR_ID`  varchar(128)     NOT NULL     COMMENT 'Officer user ID (FK to user)',
  `GPL_COM_ID`      bigint unsigned  NOT NULL     COMMENT 'Community ID at time of logging',
  `GPL_LATITUDE`    decimal(10,7)    NOT NULL,
  `GPL_LONGITUDE`   decimal(10,7)    NOT NULL,
  `GPL_ACCURACY`    decimal(7,2)     DEFAULT NULL COMMENT 'GPS accuracy in metres',
  `GPL_SPEED`       decimal(7,2)     DEFAULT NULL COMMENT 'Speed in m/s',
  `GPL_HEADING`     decimal(5,2)     DEFAULT NULL COMMENT 'Heading/bearing in degrees (0-360)',
  `GPL_ALTITUDE`    decimal(8,2)     DEFAULT NULL COMMENT 'Altitude in metres',
  `GPL_SFT_ID`      bigint unsigned  DEFAULT NULL COMMENT 'Active shift ID at time of logging',
  `GPL_SVC_ID`      bigint unsigned  DEFAULT NULL COMMENT 'Active call ID at time of logging',
  `GPL_SOURCE`      varchar(20)      NOT NULL DEFAULT 'gps' COMMENT 'Location source: gps, network, manual',
  `GPL_CREATED_ON`  datetime         NOT NULL,
  PRIMARY KEY (`GPL_ID`),
  KEY `IX_GPL_OFC_USR_ID`  (`GPL_OFC_USR_ID`),
  KEY `IX_GPL_COM_ID`      (`GPL_COM_ID`),
  KEY `IX_GPL_CREATED_ON`  (`GPL_CREATED_ON`),
  KEY `IX_GPL_OFC_CREATED` (`GPL_OFC_USR_ID`, `GPL_CREATED_ON`),
  CONSTRAINT `FK_GPL_OFC_USR_ID` FOREIGN KEY (`GPL_OFC_USR_ID`) REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_GPL_COM_ID`     FOREIGN KEY (`GPL_COM_ID`)     REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design decisions:**

- **No `GPL_DELETED_ON` column:** This is a telemetry/log table (same category as `log`, `login_log`, `waypoint_visit`). Records are never individually soft-deleted. Cleanup is via retention-based bulk hard-deletion by `cron_gps_log_cleanup.js` (Design Decision D1).
- **No audit trail triggers:** Per `audit_trail.md` Rule 1, immutable log/telemetry tables are excluded from `triggers_def.js`.
- **`GPL_OFC_USR_ID` (not generic `USR_ID`):** Only officers submit GPS telemetry. The column name reflects this constraint.
- **`GPL_SVC_ID`:** Captures the active call ID at time of logging, enabling historical analysis of officer movements during emergency responses.
- **`GPL_SOURCE`:** Tracks how the position was obtained (`gps`, `network`, `manual`). Validated against `$DataItems` enum `tracking_source`.

**Indexes:**

| Index | Columns | Purpose |
|-------|---------|---------|
| `IX_GPL_OFC_USR_ID` | `GPL_OFC_USR_ID` | Single-officer latest location lookup |
| `IX_GPL_COM_ID` | `GPL_COM_ID` | Community-filtered live tracking queries |
| `IX_GPL_CREATED_ON` | `GPL_CREATED_ON` | Retention cleanup (`DELETE WHERE GPL_CREATED_ON < ?`) |
| `IX_GPL_OFC_CREATED` | `GPL_OFC_USR_ID`, `GPL_CREATED_ON` | Compound index for officer route history queries with time range filtering |

### 2.2 Settings Storage (`key_value` Table)

GPS tracking configuration is stored as a JSON object under `settings:gps` in the `key_value` table, managed through the shared Settings module. Defaults are defined in `runtime_config.js → SETTINGS_DEFAULTS.gps`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `gps_interval_normal` | integer | `30` | GPS update interval in seconds during normal patrol |
| `gps_interval_emergency` | integer | `10` | GPS update interval in seconds during emergency response |
| `gps_stale_threshold` | integer | `2` | Minutes before a GPS position is considered stale (amber marker) |
| `location_history_retention` | integer | `90` | Days to retain GPS log entries before cleanup |
| `map_refresh_interval` | integer | `30` | Seconds between live tracking map auto-refreshes (client-side) |
| `patrol_compliance_threshold` | integer | `15` | Minutes before an unvisited waypoint triggers an overdue status |
| `emergency_eta_interval` | integer | `60` | Seconds between ETA recalculation during emergency response (client-side) |
| `map_provider` | string | `"google_maps"` | Map tile provider identifier |

Route compliance settings are stored separately under `settings:route` in the `key_value` table:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `patrol_compliance_threshold_min` | integer | `15` | Minutes of grace before a waypoint is considered overdue |

### 2.3 Data Items

**`tracking_source` (`platform/data/tracking_source.json`):**

| ID | Name | Constant |
|----|------|----------|
| `gps` | GPS | `$Const.TRACKING_SOURCE_GPS` |
| `network` | Network | `$Const.TRACKING_SOURCE_NETWORK` |
| `manual` | Manual | `$Const.TRACKING_SOURCE_MANUAL` |

---

## 3. API Endpoints Summary

| # | Endpoint | ACL | Description |
|---|----------|-----|-------------|
| 1 | `Tracking/update_location` | Officer | Push GPS telemetry ping |
| 2 | `Tracking/get_live_tracking` | Admin | Live map: all officers' latest positions with status |
| 3 | `Tracking/get_officer_location` | Admin | Single officer's current location and status |
| 4 | `Tracking/get_officer_route_history` | Admin | Historical GPS breadcrumb trail for a time range |
| 5 | `Tracking/get_call_eta` | Officer, Resident | ETA for an active emergency call |

GPS settings are managed through the shared Settings module (`Settings/get_settings`, `Settings/update_settings`), not through dedicated tracking endpoints.

---

## 4. Core Business Logic

### 4.1 Coordinate Validation

All latitude/longitude values are validated before storage:

```
isValidLatitude(lat):  typeof number AND isFinite AND -90 ≤ lat ≤ 90
isValidLongitude(lng): typeof number AND isFinite AND -180 ≤ lng ≤ 180
```

Invalid coordinates return `ERR_TRACKING_INVALID_COORDINATES` (rc 660).

### 4.2 Haversine Distance Calculation

The module implements the Haversine formula as a module-level helper function `haversineDistanceM(lat1, lng1, lat2, lng2)` for computing straight-line (great-circle) distance between two coordinate pairs in metres.

**Formula:**

```
R = 6,371,000 m (Earth mean radius)
dLat = (lat2 - lat1) × π / 180
dLng = (lng2 - lng1) × π / 180
a = sin²(dLat/2) + cos(lat1 × π/180) × cos(lat2 × π/180) × sin²(dLng/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c
```

**Usage:** ETA calculation in `get_call_eta`. Also duplicated in `route.js` for waypoint distance calculations (Design Decision D2 — consolidation to a shared `geo_utils.js` deferred).

### 4.3 Emergency Response ETA Engine (`get_call_eta`)

Computes real-time straight-line transit distance and estimated arrival time for an officer responding to an emergency call.

**Speed constants:**

| Mode | Constant | Value | Equivalent |
|------|----------|-------|------------|
| Vehicular (primary) | `VEHICULAR_SPEED_M_PER_MIN` | 500 m/min | ~30 km/h |
| Walking (secondary) | `WALKING_SPEED_M_PER_MIN` | 83 m/min | ~5 km/h |

**Calculation:**

```
distance_m      = haversineDistanceM(officer_lat, officer_lng, call_lat, call_lng)
eta_min         = max(1, round(distance_m / 500))     — vehicular estimate
eta_walking_min = max(1, round(distance_m / 83))      — foot patrol estimate
```

**Minimum ETA:** Both estimates floor at 1 minute.

**Graceful degradation:** When ETA cannot be calculated, the response returns `eta_available: false` with a `reason` string:
- `"call has no location coordinates"` — call lacks `SVC_LATITUDE`/`SVC_LONGITUDE`
- `"no officer assigned"` — call has no `SVC_OFC_USR_ID`
- `"no officer location data"` — assigned officer has no `gps_log` entries

**Access control:**
- Officers can only query calls assigned to them
- Residents can only query their own calls
- Admins are not included in ACL (ETA is an operational/field endpoint)

### 4.4 Officer Marker Status Colour Evaluation (SDS 4.9.2)

The `get_live_tracking` endpoint evaluates each officer's map marker colour using a strict priority hierarchy. The first matching condition determines the status:

| Priority | Status | Colour | Hex | Condition |
|----------|--------|--------|-----|-----------|
| 1 (highest) | `grey` | Grey | `#6C757D` | Not checked in / off duty (no active `shift_checkin` with `SFC_CHECK_OUT_ON IS NULL`) |
| 2 | `amber` | Amber | `#FFC107` | Checked in, but last GPS ping age > `gps_stale_threshold` minutes (default: 2 min) |
| 3 | `blue` | Blue | `#0D6EFD` | Checked in and actively responding to an emergency call (`SVC_STATUS = accepted`, matched via `$Const.CALL_STATUS_ACCEPTED`) |
| 4 | `red` | Red | `#DC3545` | Checked in, assigned to an active patrol route with an unvisited waypoint whose expected arrival + `patrol_compliance_threshold_min` (default: 15 min) has expired |
| 5 (lowest) | `green` | Green | `#198754` | Checked in, GPS recent, no active call, no compliance issues |

**Performance pattern:** Only officers who would otherwise be `green` (checked in, not stale, no active call) are evaluated for waypoint overdue status. This avoids unnecessary route/waypoint queries for officers already classified as grey/amber/blue.

### 4.5 Waypoint Overdue Detection (`getOfficersWithOverdueWaypoints`)

Batch evaluation of patrol route compliance for a set of officers. No database queries inside loops.

**Algorithm:**

1. Batch-fetch all active routes for candidate officers (`IN(...)` query on `patrol_route`).
2. Batch-fetch all waypoints for those routes (`IN(...)` query on `patrol_waypoint`).
3. Batch-fetch all visits for those routes (`IN(...)` query on `waypoint_visit`).
4. Build in-memory maps: `routeMap{}`, `waypointsByRoute{}`, `visitedSet` (Set).
5. For each route, iterate waypoints in order:
   - Accumulate `PTW_ETA_FROM_PREV_MIN` as `cumulativeMin`.
   - First unvisited waypoint: compute `expectedArrivalMs = PTR_PUSHED_ON + cumulativeMin × 60000`.
   - If `now > expectedArrivalMs + complianceThresholdMin × 60000`, officer is overdue.
   - Add visited waypoints' `PTW_DWELL_TIME_MIN` to cumulative for subsequent waypoints.
6. Return a `Set` of overdue officer IDs for O(1) lookup.

### 4.6 Location Response Mapping

All GPS data returned to the client passes through `mapLocationToResponse(row)` to convert database column names to clean snake_case:

| DB Column | Response Field | Type |
|-----------|---------------|------|
| `GPL_LATITUDE` | `latitude` | number |
| `GPL_LONGITUDE` | `longitude` | number |
| `GPL_ACCURACY` | `accuracy` | number or null |
| `GPL_SPEED` | `speed` | number or null (m/s) |
| `GPL_HEADING` | `heading` | number or null (degrees) |
| `GPL_ALTITUDE` | `altitude` | number or null (metres) |
| `GPL_SOURCE` | `source` | string |
| `GPL_SFT_ID` | `shift_id` | integer or null |
| `GPL_SVC_ID` | `call_id` | integer or null |
| `GPL_CREATED_ON` | `recorded_on` | datetime string |

---

## 5. Background Jobs

### 5.1 GPS Log Retention Cleanup (`cron_gps_log_cleanup.js`)

**PM2 process name:** `code4_cron_gps_log_cleanup`
**Schedule:** Daily at 03:00 (`0 3 * * *`)
**Bootstrap:** `initStandAlone()` — runs as an independent PM2 process with full `$Db`, `$Config`, `$Const`, `$Logger`, `$Date` access.

**Algorithm:**

1. Read `location_history_retention` from `settings:gps` (default: 90 days).
2. Calculate cutoff datetime: `now - retentionDays`.
3. Loop: `DELETE FROM gps_log WHERE GPL_CREATED_ON < ? LIMIT 5000` until affected rows < 5000.
4. Log total deleted count.

**Batch size:** 5,000 rows per DELETE iteration. Avoids long-running table locks on high-volume telemetry tables.

**Hard deletion rationale:** `gps_log` has no `DELETED_ON` column. It is an append-only telemetry table where records are never individually modified. Bulk retention cleanup via hard deletion is the correct approach, consistent with other log/queue tables in the system (Design Decision D1).

---

## 6. Error Codes

| Constant | RC | Message | Endpoint(s) |
|----------|-----|---------|-------------|
| `ERR_TRACKING_INVALID_COORDINATES` | 660 | invalid GPS coordinates | `update_location` |
| `ERR_TRACKING_OFFICER_NOT_FOUND` | 661 | officer not found or not active | `update_location`, `get_officer_location`, `get_officer_route_history` |
| `ERR_TRACKING_CALL_NOT_FOUND` | 662 | call not found | `get_call_eta` |
| `ERR_TRACKING_CALL_NOT_ACTIVE` | 663 | call is not in an active state for ETA calculation | `get_call_eta` |
| `ERR_TRACKING_NO_LOCATION_DATA` | 664 | no location data available for this officer | `get_officer_location` |
| `ERR_TRACKING_INVALID_SOURCE` | 665 | invalid tracking source | `update_location` |
| `ERR_TRACKING_INVALID_TIME_RANGE` | 666 | invalid time range | `get_officer_route_history` |

Additionally, `ERR_COMMUNITY_NOT_FOUND` (from the community module) is returned by `get_live_tracking` when `community_id > 0` references a non-existent community.

---

## 7. Cross-Module Integration

### 7.1 Shift Module (Phase 5.1)

- `shift_checkin` table is queried to determine officer check-in status (grey vs. active marker).
- `shift` table provides shift date/time information in live tracking response.
- `GPL_SFT_ID` captures the active shift at time of GPS logging for historical correlation.

### 7.2 Route Module (Phase 5.2)

- `patrol_route`, `patrol_waypoint`, and `waypoint_visit` tables are queried for waypoint overdue detection.
- Route settings (`patrol_compliance_threshold_min`) determine the red-marker threshold.
- `$Const.ROUTE_STATUS_ACTIVE` identifies routes eligible for compliance checks.

### 7.3 Call Module (Phase 3.1)

- `service_call` table is queried for active call status (blue marker, ETA calculation).
- `$Const.CALL_STATUS_ACCEPTED` identifies officers responding to emergencies.
- `SVC_LATITUDE`/`SVC_LONGITUDE` provide the call location for ETA distance calculation.
- `GPL_SVC_ID` captures the active call at time of GPS logging.

### 7.4 Shared Utilities

- `$Funcs.getUserCommunityId(userId)` — resolves officer community for GPS log insertion.
- `$Funcs.communityExists(communityId)` — validates community filter in live tracking.

---

## 8. Security & Access Control

| Endpoint | ACL | Row-Level Restriction |
|----------|-----|-----------------------|
| `update_location` | `USER_TYPE_OFFICER` | Officer can only log their own position (userId from session) |
| `get_live_tracking` | `USER_TYPE_ADMIN` | Community-filtered; non-super-admins see only their community |
| `get_officer_location` | `USER_TYPE_ADMIN` | Any valid officer ID |
| `get_officer_route_history` | `USER_TYPE_ADMIN` | Any valid officer ID |
| `get_call_eta` | `USER_TYPE_OFFICER`, `USER_TYPE_RESIDENT` | Officers: only calls assigned to them. Residents: only their own calls. |

---

## 9. Deferred Requirements & Future Enhancements

### 9.1 Unblocked by Phase 5.3 (Cross-Module)

These items are now technically feasible because GPS telemetry data is available, but belong to their respective module owners:

| Source | Item | Status | Owner |
|--------|------|--------|-------|
| `03-call-enhancements.md` #1 | Location-based nearest-officer dispatch | Unblocked | Call module |
| `03-call-enhancements.md` #3 | Targeted call pass/relay to nearest officer | Unblocked | Call module |
| `04-task-enhancements.md` #1 | Task ETA auto-calculation from officer GPS | Unblocked | Task module |

### 9.2 Deferred Tracking Enhancements (Phase 5.3.1)

| Item | Description | Dependencies |
|------|-------------|-------------|
| Background GPS push notifications | Automated alerts for GPS stale, GPS restored, officer off-route, ETA change (SDS 4.9.6). Requires a continuous monitoring cron (`cron_tracking_monitor.js`). | Notification types registered in `notification_type.json` |
| Google Maps Directions API | Road-distance ETA instead of Haversine straight-line. Controlled by `settings:gps → use_google_directions_api`. | External API key, billing |
| Native geofencing alerts | Client-side geofence triggers when officer enters/exits community boundary. | Mobile app platform APIs |
| Mobile offline location batching | Queue GPS pings when device is offline, bulk-upload on reconnect. | Client-side queue, bulk insert endpoint |
| WebSocket push on location update | Real-time push to admin portal instead of polling. Currently the admin dashboard polls every 30s via `get_live_tracking`. | WebSocket infrastructure |
| Haversine consolidation | Extract `haversineDistanceM()` to shared `geo_utils.js` user module, removing duplication between `tracking.js` and `route.js`. | Minor refactor |

---

## 10. File Inventory

| File | Purpose |
|------|---------|
| `backend/platform/api/tracking.js` | API endpoint definitions (5 endpoints) |
| `backend/platform/funcs/tracking.js` | Business logic implementation (~700 lines) |
| `backend/platform/data/tracking_source.json` | Location source `$DataItems` enum |
| `backend/platform/jobs/cron_gps_log_cleanup.js` | Daily GPS log retention cleanup cron |
| `backend/platform/definitions/errorcodes.en.js` | Error codes (rc 660–666) |
| `backend/platform/config/using_api.js` | API registration |
| `backend/platform/config/runtime_config.js` | `SETTINGS_DEFAULTS.gps` defaults |
| `ecosystem.config.js` | PM2 process registration for cron job |
| `db/db.sql` | `gps_log` table DDL |
| `db/UpgradeDB.sql` | V 5.3.0 migration script |
