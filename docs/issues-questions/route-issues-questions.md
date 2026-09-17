# Route Module — Issues & Questions

**Created:** 2026-10-01
**Module:** `platform/api/route.js`, `platform/funcs/route.js`

---

## Resolved Questions

### Q1: Should there be one route per shift or one route per officer per shift?

**Answer:** One route per officer per shift. Each allocated officer gets their own patrol route with waypoints tailored to their post assignments. Enforced via duplicate check in `generate_route()` and the combination of `PTR_SFT_ID + PTR_OFC_USR_ID` columns.

### Q2: What happens to the route when an officer is removed from a shift?

**Answer:** Routes are not automatically deleted when an officer is removed from a shift. The route remains in the database with its current status. This is consistent with the soft-deletion pattern used throughout the project. Automatic route cleanup on officer removal is deferred — see `docs/deferred_requirements/07-route-enhancements.md`.

### Q3: Should route generation include all community posts or only posts assigned to the officer?

**Answer:** Both. Assigned posts (from `shift_post`) are included first as mandatory waypoints. Remaining active community posts are added after them. This aligns with SDS 4.8.1: "Existing Post Assignments — All allocated posts are incorporated as mandatory waypoints."

### Q4: How should waypoint ordering work during generation?

**Answer:** Nearest-Neighbour TSP heuristic. Assigned (mandatory) waypoints are ordered first using nearest-neighbour from the first post, then optional community waypoints are appended continuing the NN chain from where mandatory waypoints end. This produces a distance-optimised route without external API dependencies. Per-leg ETA and total route distance are calculated using Haversine straight-line distance at ~5 km/h walking pace. **Previously:** simple database order; **Now:** NN-TSP with Haversine.

### Q5: AI Route Engine — What service/algorithm should be used?

**Answer:** Phase 5.2 baseline uses a pure, deterministic **Nearest-Neighbour TSP** algorithm implemented in `route.js` (`orderWaypointsByNearestNeighbour`). Uses Haversine distance calculations — no external API dependencies. Starts from first assigned post, visits closest unvisited mandatory post at each step, then continues the chain through optional community posts. Total distance (`PTR_TOTAL_DISTANCE_M`) and per-leg ETA (`PTW_ETA_FROM_PREV_MIN`) are now populated during generation. External solver integration (Google OR-Tools / OSRM) remains deferred to Phase 5.2.1 — see `docs/deferred_requirements/07-route-enhancements.md §1`.

### Q6: Auto-generate on shift publish — should this be default behavior?

**Answer:** **Yes — configurable, default: enabled.** Setting key: `auto_generate_routes_on_publish` in `settings:route` namespace (stored in `key_value`, default: `true`). When `Shift/publish_shift` succeeds, it calls `Route/generate_route` for each allocated officer. Route generation failures are logged as warnings but do not block the shift publish. On-demand generation via `Route/generate_route` remains available at all times. Managed via `Settings/get_route_settings` and `Settings/update_route_settings`.

### Q7: Waypoint skip alert threshold — is 15 minutes the confirmed default?

**Answer:** **Confirmed: 15 minutes.** Setting key: `patrol_compliance_threshold_min` in `settings:route` (default: `15`, range: 5–60). The threshold is now stored and retrievable via `Settings/get_route_settings` / `Settings/update_route_settings`. Cron-based waypoint skip monitoring (`cron_route_compliance_check.js`) remains deferred — see `docs/deferred_requirements/07-route-enhancements.md §7`.

### Q8: Should route completion auto-trigger when shift ends?

**Answer:** **Yes — auto-complete with partial compliance score.** When a shift transitions to `completed` (via `Shift/check_out` all-officers-out logic or `cron_shift_lifecycle_check.js`), all associated active routes (`PTR_STATUS = 'active'`) are automatically transitioned to `completed` via `$RouteUtils.completeActiveRoutesForShift()`. Unvisited waypoints remain marked as unvisited — compliance percentage is calculated on demand by `Route/get_route_compliance`. Routes are never left in `active` state after shift completion to prevent stale map overlay noise in Live Tracking.

---

## Open Questions / Blockers

_None at this time. All architectural questions have been resolved and implemented._

---

## Implementation Notes

- Error codes 640–652 allocated for Route module
- Notification types `route_pushed`, `waypoint_skipped`, `route_updated`, `officer_off_route` registered in `notification_type.json`
- Route settings: `auto_generate_routes_on_publish` (bool, default: true), `patrol_compliance_threshold_min` (int, default: 15)
- Route generation uses Nearest-Neighbour TSP with Haversine distance — no external dependencies
- Auto-generate on publish: `publish_shift()` → `Route/generate_route` per officer (non-blocking on failure)
- Auto-complete on shift end: `$RouteUtils.completeActiveRoutesForShift()` called from `check_out()` and `cron_shift_lifecycle_check.js`
- No trigger_def.js updates per user instructions
- No test API creation per user instructions
- No API documentation in docs/api/ per user instructions
