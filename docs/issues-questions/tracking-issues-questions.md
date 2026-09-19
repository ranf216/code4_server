# Tracking Module — Issues & Questions

**Created:** 2026-10-15
**Module:** `platform/api/tracking.js`, `platform/funcs/tracking.js`
**Phase:** 5.3

---

## Resolved Questions

### 1. GPS Push Notifications — Required? (SDS 4.9.6) — RESOLVED

The SDS marks GPS push notifications with "Question - is this required?":
- **GPS Signal Lost** — notify manager when officer GPS stale beyond threshold
- **GPS Restored** — notify manager when signal recovers
- **Officer Off-Route** — notify manager when officer deviates from route for 5+ minutes
- **ETA Updated** — notify resident when ETA changes by 2+ minutes

**Resolution:** Deferred to Phase 5.3.1 (background monitoring cron). The Live Tracking Dashboard (`Tracking/get_live_tracking`) provides instant visual status feedback via marker colours (Amber for stale GPS, Red for overdue waypoints, Blue for active calls). Notification type keys remain registered in `notification_type.json` for future dispatch. Automated push alerts require a continuous high-frequency monitoring process (`cron_tracking_monitor.js`) which is deferred.

---

### 2. ETA Calculation Method (SDS 2.4.1.3.1, 5.3) — RESOLVED

**SDS states:** "Emergency ETA Recalculation Interval: How often ETA is recalculated using the Maps API during an emergency response. Default: 60 s."

**Resolution:** Haversine straight-line distance confirmed as baseline. `Tracking/get_call_eta` provides two speed estimates:
- **Vehicular (~30 km/h):** Primary ETA for emergency response (`eta_min`)
- **Walking (~5 km/h):** Secondary estimate for foot-patrol scenarios (`eta_walking_min`)

External Google Maps Directions API integration is deferred to Phase 5.3.1 behind an optional configuration key in `settings:gps` (`use_google_directions_api: false`).

---

### 3. Location History Retention Cleanup (SDS 5.3) — RESOLVED

**Setting:** `location_history_retention: 90` (days) in `runtime_config.js`.

**Resolution:** Implemented via `cron_gps_log_cleanup.js`. Runs daily at 03:00. Reads `location_history_retention` from `settings:gps` (default 90 days). Hard-deletes `gps_log` records older than the retention threshold in batches of 5,000 to avoid long-running locks. Registered in `ecosystem.config.js` as `code4_cron_gps_log_cleanup`.

---

### 4. Waypoint Skip Alert Integration (SDS 4.9.2) — RESOLVED

**SDS Reference:** 4.9.2 — Officer Marker Status Colours (Red = Checked in, waypoint skipped)

**Resolution:** Integrated into `Tracking/get_live_tracking`. When compiling the active officer list, officer marker colours are evaluated in strict priority order:
1. **Grey:** Not checked in or off duty
2. **Amber:** Checked in, GPS stale (> `gps_stale_threshold`, default 2 min)
3. **Blue:** Checked in, responding to emergency call (`SVC_STATUS = 'accepted'`)
4. **Red:** Checked in, active patrol route has an unvisited waypoint whose scheduled time + `patrol_compliance_threshold_min` (from `settings:route`, default 15 min) has expired
5. **Green:** Checked in, active, GPS recent, no compliance issues

Waypoint overdue detection uses batch `IN(...)` queries — no DB queries inside loops. Only green-candidate officers (checked in, not stale, no active call) are evaluated for route compliance.

---

## Open Questions

### 5. Location-Based Officer Dispatch (Deferred Req 03-call #1)

The Call module's deferred requirement #1 describes auto-dispatching the closest officer based on GPS proximity. Now that GPS tracking exists, this can be implemented.

**Dependencies met:** GPS Tracking module (this module) provides real-time officer locations.

**Not in scope for Tracking:** This is a Call module enhancement. The Tracking module provides the data; the dispatch logic belongs in `call.js`.

**Recommendation:** Create a cross-module helper (e.g. `$TrackingUtils.getNearestOfficers(communityId, lat, lng)`) in a future iteration, then wire it into `Call/create_emergency_call`.

---

### 6. Targeted Call Pass/Relay (Deferred Req 03-call #3)

Similar to #5 above. The Call module's `pass_call` could be enhanced to route the passed call to the next-nearest officer using GPS proximity data.

**Not in scope for Tracking:** This is a Call module enhancement.

---

### 7. Task ETA Auto-Calculation (Deferred Req 04-task #1)

The Task module's deferred requirement #1 describes auto-calculating ETA based on officer GPS location and task address. Now that GPS tracking exists, this could be implemented.

**Not in scope for Tracking:** This is a Task module enhancement that depends on a geolocation service (`$Geolocation`).

---

## Design Decisions

### D1. No DELETED_ON Column on gps_log

The `gps_log` table does not include a `*_DELETED_ON` column. This is a telemetry/log table similar to `waypoint_visit`. Records are never individually soft-deleted; cleanup is via retention-based bulk hard deletion by `cron_gps_log_cleanup.js` (daily at 03:00).

### D2. Haversine Distance Duplication

The `haversineDistanceM()` function is duplicated from `route.js` into `tracking.js`. A shared `geo_utils.js` user module was considered but deferred to avoid modifying the existing route module in this phase. Consolidation is recommended when either module is next modified.

### D3. Officer Status Colour Logic — Full SDS 4.9.2

The `get_live_tracking` endpoint implements the complete officer status colour scheme from SDS 4.9.2:
- **Grey:** Not checked in / off duty
- **Amber:** Checked in, GPS signal stale (> threshold)
- **Blue:** Checked in, responding to an emergency call
- **Red:** Checked in, active patrol with overdue unvisited waypoint (> compliance threshold)
- **Green:** Checked in, no active call, GPS recent, all waypoints on schedule

Priority order: Grey > Amber > Blue > Red > Green

### D4. No WebSocket Push on Location Update

`update_location` currently only writes to the database. Real-time WebSocket push to the management portal (for live map auto-refresh) is not implemented. The SDS 4.9.5 describes a polling-based refresh (default 30s) which is served by `get_live_tracking`.

### D5. ETA Speed Baselines

`get_call_eta` returns two ETA estimates for emergency calls:
- `eta_min`: Vehicular speed (~30 km/h / 500 m/min) — primary estimate
- `eta_walking_min`: Walking speed (~5 km/h / 83 m/min) — secondary estimate for foot patrol

Both use Haversine straight-line distance. Road-distance routing via external API is deferred.

---

## Related Deferred Requirements

| Source | Item | Tracking Overlap | Action |
|--------|------|-----------------|--------|
| 03-call #1 | Location-based dispatch | GPS data now available | Call module enhancement (future) |
| 03-call #2 | ETA calculation | Implemented via `get_call_eta` (straight-line, vehicular + walking) | Maps API integration deferred |
| 03-call #3 | Targeted call relay | GPS data now available | Call module enhancement (future) |
| 04-task #1 | Task ETA auto-calc | GPS data now available | Task module enhancement (future) |
| 07-route #7 | Waypoint skip alerts | Integrated into `get_live_tracking` red status | Monitoring cron deferred to Phase 5.3.1 |
