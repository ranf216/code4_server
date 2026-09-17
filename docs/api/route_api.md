# Route API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Route/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints require a `#token` field in the request body. Access control is specified per endpoint.

---

## Concepts

### Patrol Route Lifecycle

A patrol route is an ordered sequence of waypoints generated for a specific officer on a specific shift. Routes progress through three lifecycle stages:

- **Draft** — Created via `generate_route`. The route exists only in the management portal and is invisible to the officer. Admins can reorder, add, or remove waypoints while the route is in draft status.
- **Active** — Pushed to the officer via `push_route`. The officer receives a push notification and the route becomes visible in the officer mobile app. Once active, waypoints can no longer be edited.
- **Completed** — All waypoints have been visited, or the shift has ended. No further visits can be recorded.

### Waypoints

Each waypoint represents a location the officer must visit during their patrol. Waypoints are generated from the community's active posts and ordered using a nearest-neighbour algorithm for efficient patrol coverage.

Waypoint attributes include:
- **order** — Sequential position in the patrol route (1-based).
- **name** — Display name (typically the post name or a custom label).
- **lat / lng** — GPS coordinates of the location.
- **post_id** — Reference to the originating post (may be `null` for custom waypoints added during editing).
- **eta_from_prev_min** — Estimated travel time in minutes from the previous waypoint.
- **dwell_time_min** — Planned time in minutes the officer should spend at this location.
- **priority** — Waypoint priority level: `critical`, `high`, `normal`, or `low`.

### Waypoint Visits

When an officer marks a waypoint as visited, the system records:
- The GPS coordinates at the time of the visit (if available).
- The deviation in metres between the officer's GPS position and the planned waypoint location.
- Whether the visit was recorded automatically (GPS proximity) or manually by the officer.

When the last unvisited waypoint on an active route is visited, the route automatically transitions to **completed** status.

### Compliance

Route compliance measures how thoroughly an officer followed their assigned patrol route. The compliance report provides:
- Percentage of waypoints visited.
- Average GPS deviation from planned locations.
- Per-waypoint breakdown of visit status, timing, and deviation.

---

## Endpoints — Route Generation & CRUD

### POST Route/generate_route
*Admin only.* Generates a patrol route for a specific officer on a specific shift. Waypoints are created from the community's active posts and ordered for efficient coverage. Only one route per officer per shift is permitted.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `shift_id` | integer | Yes | The shift to generate the route for. |
    | `officer_id` | string | Yes | The officer's user ID. Must be allocated to the specified shift. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "route":
        {
            "route_id": 1,
            "shift_id": 100,
            "officer_id": "abc123",
            "community_id": 5,
            "name": "Patrol Route — Officer Name",
            "status": "draft",
            "total_distance_m": 1250,
            "total_duration_min": 45,
            "pushed_on": null,
            "pushed_by": null,
            "completed_on": null,
            "created_by": "admin_user_id",
            "created_on": "2025-01-15 08:30:00",
            "last_update": null,
            "shift_date": "2025-01-16",
            "community_name": "Riverside Community",
            "officer_name": "John Smith",
            "waypoints":
            [
                {
                    "waypoint_id": 1,
                    "order": 1,
                    "post_id": 10,
                    "name": "Main Gate",
                    "lat": 33.4484,
                    "lng": -112.074,
                    "eta_from_prev_min": null,
                    "dwell_time_min": 5,
                    "priority": "normal",
                    "notes": "Front entrance checkpoint",
                    "visit": null
                },
                {
                    "waypoint_id": 2,
                    "order": 2,
                    "post_id": 11,
                    "name": "Parking Lot B",
                    "lat": 33.4495,
                    "lng": -112.073,
                    "eta_from_prev_min": 2,
                    "dwell_time_min": 5,
                    "priority": "normal",
                    "notes": null,
                    "visit": null
                }
            ]
        }
    }
    ```

    The `route` object contains full route metadata, enriched with `shift_date`, `community_name`, and `officer_name`. The `waypoints` array is ordered by `order` (ascending). Each waypoint's `visit` field is `null` when unvisited.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 641 | no active posts available for route generation | The community has no active posts with valid GPS coordinates. |
    | 646 | shift not found | The specified `shift_id` does not exist. |
    | 647 | officer is not allocated to this shift | The specified officer is not allocated to the shift. |
    | 648 | a route already exists for this officer on this shift | A route was already generated for this officer/shift combination. |

- **Usage & Flows:**
    Called from the Shift Management portal (SDS 4.8) after officers are allocated. Routes can be generated on demand by an admin, or automatically when a shift is published (controlled by the `auto_generate_routes_on_publish` route setting). Each officer on a shift gets their own independent route.

---

### POST Route/get_route
*Admin or Officer.* Retrieves full route details including waypoints and visit data. Officers can only view routes assigned to them that have been pushed (active or completed).

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | A valid session token (Admin or Officer). |
    | `route_id` | integer | Yes | The route ID to retrieve. |

- **Return Values:**
    The response structure is identical to `generate_route`. For routes with visits recorded, each waypoint's `visit` field contains:

    ```json
    {
        "visit_id": 1,
        "waypoint_id": 5,
        "officer_id": "abc123",
        "visited_on": "2025-01-16 09:15:22",
        "visit_lat": 33.4485,
        "visit_lng": -112.0741,
        "deviation_m": 14,
        "is_manual": false,
        "created_on": "2025-01-16 09:15:22"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `visit_id` | integer | Unique visit record identifier. |
    | `waypoint_id` | integer | The waypoint that was visited. |
    | `officer_id` | string | The officer who recorded the visit. |
    | `visited_on` | string | Timestamp of the visit. |
    | `visit_lat` | number/null | GPS latitude at time of visit (`null` if manual visit without GPS). |
    | `visit_lng` | number/null | GPS longitude at time of visit (`null` if manual visit without GPS). |
    | `deviation_m` | integer/null | Distance in metres between the officer's GPS position and the planned waypoint location. `null` for manual visits without GPS. |
    | `is_manual` | boolean | `true` if the officer manually marked the waypoint as visited; `false` if recorded via GPS proximity. |
    | `created_on` | string | Record creation timestamp. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller does not have access to this route's community. |
    | 201 | invalid user token | Invalid or expired token. |
    | 640 | route not found | The route does not exist, or the officer is trying to view a route not assigned to them, or the route is still in draft status (officers cannot see draft routes). |

- **Usage & Flows:**
    Called by the management portal to display route details on the Shift Management screen (SDS 4.8). Called by the officer mobile app to display the active patrol route with an interactive map showing numbered waypoint pins (SDS 3.11). Officers see their route only after it has been pushed.

---

### POST Route/update_route
*Admin only.* Replaces the waypoints on a draft route. Send the full ordered array of waypoints — existing waypoints are removed and replaced. Only routes in **draft** status can be updated.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `route_id` | integer | Yes | The route ID to update. |
    | `name` | string | No | New display name for the route. |
    | `waypoints` | string | Yes | JSON array of waypoint objects. Each object must include `name` (string), `lat` (number, -90 to 90), and `lng` (number, -180 to 180). Optional fields: `post_id` (integer), `dwell_time_min` (integer, defaults to 5), `priority` (string: `critical`, `high`, `normal`, or `low`; defaults to `normal`), `notes` (string). |

- **Return Values:**
    Same structure as `generate_route` — the full updated route with recalculated distances and ETAs.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or does not have access to this route's community. |
    | 201 | invalid user token | Invalid or expired token. |
    | 640 | route not found | The specified `route_id` does not exist. |
    | 649 | at least one waypoint is required | The waypoints array is empty, missing required fields (`name`), exceeds the 200-waypoint limit, or contains an invalid priority value. |
    | 650 | invalid waypoint coordinates | One or more waypoints have `lat` outside -90..90 or `lng` outside -180..180. |
    | 651 | route cannot be updated in current status | The route is active or completed; only draft routes can be edited. |

- **Usage & Flows:**
    Used from the Shift Management portal (SDS 4.8) to customize a generated route before pushing it to the officer. Admins can reorder waypoints, add custom waypoints not tied to posts, remove unnecessary stops, and adjust dwell times and priorities.

---

### POST Route/push_route
*Admin only.* Pushes a draft route to the officer's mobile app, transitioning its status from **draft** to **active**. The officer receives a push notification.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `route_id` | integer | Yes | The route ID to push. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or does not have access to this route's community. |
    | 201 | invalid user token | Invalid or expired token. |
    | 640 | route not found | The specified `route_id` does not exist. |
    | 642 | route has already been pushed | The route is already in active status. |
    | 645 | route status does not allow this operation | The route is in completed status; only draft routes can be pushed. |
    | 649 | at least one waypoint is required | The route has no waypoints. |

- **Usage & Flows:**
    Called from the Shift Management portal (SDS 4.8) after the admin has reviewed and optionally edited the route. Once pushed, the route appears in the officer's mobile app (SDS 3.11) and the officer can begin visiting waypoints. This action is irreversible — a pushed route cannot be returned to draft.

---

## Endpoints — Officer-Facing

### POST Route/visit_waypoint
*Officer only.* Records a waypoint visit. If GPS coordinates are provided, the system calculates the deviation from the planned waypoint location. When the last unvisited waypoint on a route is visited, the route automatically transitions to **completed** status.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer session token. |
    | `waypoint_id` | integer | Yes | The waypoint to mark as visited. |
    | `lat` | number | No | GPS latitude at the time of visit. Default: `0` (no GPS). |
    | `lng` | number | No | GPS longitude at the time of visit. Default: `0` (no GPS). |
    | `is_manual` | boolean | No | `true` if the officer is manually marking the visit (e.g., GPS is insufficient). Default: `false`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "visit":
        {
            "waypoint_id": 5,
            "visited_on": "2025-01-16 09:15:22",
            "deviation_m": 14,
            "is_manual": false,
            "route_completed": false
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `waypoint_id` | integer | The visited waypoint. |
    | `visited_on` | string | Timestamp of the visit. |
    | `deviation_m` | integer/null | Distance in metres between the officer's GPS and the waypoint location. `null` if no GPS was provided. |
    | `is_manual` | boolean | Whether the visit was manually recorded. |
    | `route_completed` | boolean | `true` if this was the last unvisited waypoint and the route is now completed. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The officer is not assigned to this waypoint's route. |
    | 201 | invalid user token | Invalid or expired token. |
    | 643 | waypoint not found | The specified `waypoint_id` does not exist. |
    | 644 | waypoint has already been visited | A visit has already been recorded for this waypoint. |
    | 652 | route has not been pushed yet | The route is still in draft status; visits can only be recorded on active routes. |

- **Usage & Flows:**
    Called from the officer mobile app (SDS 3.11) when the officer arrives at a waypoint. The app can trigger this automatically when the officer's GPS position falls within a configurable radius of the waypoint, or the officer can tap "Mark as Visited" to record a manual visit. When `route_completed` returns `true`, the app should update the route display to show the completed status.

---

## Endpoints — Compliance

### POST Route/get_route_compliance
*Admin only.* Retrieves a compliance report for a patrol route, showing waypoint visit coverage, GPS deviation statistics, and per-waypoint details.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `route_id` | integer | Yes | The route ID to get compliance for. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "compliance":
        {
            "route_id": 1,
            "route_name": "Patrol Route — John Smith",
            "officer_id": "abc123",
            "officer_name": "John Smith",
            "shift_id": 100,
            "shift_date": "2025-01-16",
            "route_status": "active",
            "total_waypoints": 5,
            "visited_count": 3,
            "compliance_percent": 60,
            "total_planned_dwell_min": 25,
            "avg_deviation_m": 18,
            "manual_visit_count": 1,
            "waypoints":
            [
                {
                    "waypoint_id": 1,
                    "order": 1,
                    "name": "Main Gate",
                    "priority": "normal",
                    "planned_dwell_min": 5,
                    "visited": true,
                    "visited_on": "2025-01-16 09:15:22",
                    "deviation_m": 14,
                    "is_manual": false
                },
                {
                    "waypoint_id": 2,
                    "order": 2,
                    "name": "Parking Lot B",
                    "priority": "normal",
                    "planned_dwell_min": 5,
                    "visited": false,
                    "visited_on": null,
                    "deviation_m": null,
                    "is_manual": false
                }
            ]
        }
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `route_id` | integer | The route identifier. |
    | `route_name` | string | Display name of the route. |
    | `officer_id` | string | The assigned officer's user ID. |
    | `officer_name` | string | The assigned officer's full name. |
    | `shift_id` | integer | The associated shift ID. |
    | `shift_date` | string | The shift date (YYYY-MM-DD). |
    | `route_status` | string | Current route status: `draft`, `active`, or `completed`. |
    | `total_waypoints` | integer | Total number of waypoints on the route. |
    | `visited_count` | integer | Number of waypoints that have been visited. |
    | `compliance_percent` | integer | Percentage of waypoints visited (0–100). |
    | `total_planned_dwell_min` | integer | Sum of all planned dwell times across waypoints. |
    | `avg_deviation_m` | integer/null | Average GPS deviation in metres across all GPS-tracked visits. `null` if no GPS visits were recorded. |
    | `manual_visit_count` | integer | Number of visits that were manually recorded by the officer. |
    | `waypoints` | array | Per-waypoint compliance details (see table below). |

    **Per-waypoint fields:**

    | Field | Type | Description |
    |-------|------|-------------|
    | `waypoint_id` | integer | Waypoint identifier. |
    | `order` | integer | Sequence position in the route. |
    | `name` | string | Waypoint display name. |
    | `priority` | string | Waypoint priority level. |
    | `planned_dwell_min` | integer | Planned dwell time at this waypoint. |
    | `visited` | boolean | Whether this waypoint has been visited. |
    | `visited_on` | string/null | Timestamp of the visit, or `null` if not visited. |
    | `deviation_m` | integer/null | GPS deviation in metres, or `null` if not visited or no GPS data. |
    | `is_manual` | boolean | Whether the visit was manually recorded. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin or does not have access to this route's community. |
    | 201 | invalid user token | Invalid or expired token. |
    | 640 | route not found | The specified `route_id` does not exist. |

- **Usage & Flows:**
    Used by the management portal (SDS 4.9) to display patrol compliance on the Live Tracking & Compliance dashboard. Managers can monitor real-time route progress for active routes and review completed route compliance after shifts end. The `compliance_percent` drives the compliance gauge, while the per-waypoint `deviation_m` helps identify off-route patrol behaviour.

---
