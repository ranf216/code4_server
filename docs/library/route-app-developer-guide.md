# Phase 5.2 — Patrol Route API: App Developer Integration Guide

**Version:** 5.2.0
**Audience:** Frontend developers (React Web Portal, React Native Mobile App)
**Base URL:** `{server}/api/`
**Authentication:** All endpoints require a valid session token passed as the `token` parameter.

---

## 1. Authentication & Access Model

### 1.1 Token Authentication

Every request must include a `token` parameter (string) containing the authenticated session token obtained from the login flow. Requests without a valid token return `ERR_INVALID_TOKEN`.

### 1.2 ACL Roles

| Role | Constant | Route Endpoints |
|------|----------|----------------|
| **Admin** | `USER_TYPE_ADMIN` | `generate_route`, `get_route`, `update_route`, `push_route`, `get_route_compliance`, `get_route_settings`, `update_route_settings` |
| **Officer** | `USER_TYPE_OFFICER` | `get_route`, `visit_waypoint` |

**Community scoping:** Non-super-admin users can only access routes belonging to their assigned community. Super-admins have cross-community access.

**Officer restrictions:**
- Officers can only see routes assigned to them (`officer_id` must match session user).
- Officers cannot see `draft` routes — only `active` and `completed` routes are visible.

### 1.3 Pagination

This module does not use paginated list endpoints. All data is returned in full per route.

---

## 2. Endpoint Directory

### 2.1 `Route/generate_route`

Generate a patrol route for an officer in a shift. Creates waypoints from the community's active posts using Nearest-Neighbour TSP ordering. Only one route per officer per shift is allowed.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `shift_id` | integer | Yes | — | Shift ID |
| `officer_id` | string | Yes | — | Officer user ID (must be allocated to the shift) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "route": {
        "route_id": 42,
        "shift_id": 15,
        "officer_id": "usr_abc123",
        "community_id": 3,
        "name": "Patrol Route - 2026-10-15",
        "status": "draft",
        "total_distance_m": 2450,
        "total_duration_min": 59,
        "pushed_on": null,
        "pushed_by": null,
        "completed_on": null,
        "created_by": "usr_admin01",
        "created_on": "2026-10-15 08:30:00",
        "last_update": null,
        "waypoints": [
            {
                "waypoint_id": 101,
                "order": 1,
                "post_id": 5,
                "name": "Main Entrance Gate",
                "lat": 33.4484367,
                "lng": -112.0740373,
                "eta_from_prev_min": null,
                "dwell_time_min": 5,
                "priority": "high",
                "notes": "Check ID badges for all visitors"
            },
            {
                "waypoint_id": 102,
                "order": 2,
                "post_id": 8,
                "name": "Parking Structure B",
                "lat": 33.4490123,
                "lng": -112.0735890,
                "eta_from_prev_min": 3,
                "dwell_time_min": 5,
                "priority": "normal",
                "notes": null
            }
        ]
    }
}
```

#### Error Responses

| RC | Constant | When |
|----|----------|------|
| 646 | `ERR_ROUTE_SHIFT_NOT_FOUND` | Shift does not exist or is soft-deleted |
| 647 | `ERR_ROUTE_OFFICER_NOT_ALLOCATED` | Officer is not allocated to this shift |
| 648 | `ERR_ROUTE_DUPLICATE` | A route already exists for this officer and shift |
| 641 | `ERR_ROUTE_NO_POSTS_AVAILABLE` | No posts with valid coordinates in the community |

---

### 2.2 `Route/get_route`

Get route details with waypoints and visit data. Officers can only see routes assigned to them, and only `active` or `completed` routes.

**ACL:** Admin, Officer

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `route_id` | integer | Yes | — | Route ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "route": {
        "route_id": 42,
        "shift_id": 15,
        "officer_id": "usr_abc123",
        "community_id": 3,
        "name": "Patrol Route - 2026-10-15",
        "status": "active",
        "total_distance_m": 2450,
        "total_duration_min": 59,
        "pushed_on": "2026-10-15 08:45:00",
        "pushed_by": "usr_admin01",
        "completed_on": null,
        "created_by": "usr_admin01",
        "created_on": "2026-10-15 08:30:00",
        "last_update": "2026-10-15 08:45:00",
        "shift_date": "2026-10-15",
        "community_name": "Riverside Business Park",
        "officer_name": "John Smith",
        "waypoints": [
            {
                "waypoint_id": 101,
                "order": 1,
                "post_id": 5,
                "name": "Main Entrance Gate",
                "lat": 33.4484367,
                "lng": -112.0740373,
                "eta_from_prev_min": null,
                "dwell_time_min": 5,
                "priority": "high",
                "notes": "Check ID badges for all visitors",
                "visit": {
                    "visit_id": 201,
                    "waypoint_id": 101,
                    "officer_id": "usr_abc123",
                    "visited_on": "2026-10-15 09:05:12",
                    "visit_lat": 33.4484500,
                    "visit_lng": -112.0740100,
                    "deviation_m": 15,
                    "is_manual": false
                }
            },
            {
                "waypoint_id": 102,
                "order": 2,
                "post_id": 8,
                "name": "Parking Structure B",
                "lat": 33.4490123,
                "lng": -112.0735890,
                "eta_from_prev_min": 3,
                "dwell_time_min": 5,
                "priority": "normal",
                "notes": null,
                "visit": null
            }
        ]
    }
}
```

**Notes:**
- `visit` is `null` for unvisited waypoints; an object for visited ones.
- `shift_date`, `community_name`, and `officer_name` are enrichment fields not stored on the route itself.
- Officers see the same structure but cannot access `draft` routes or routes assigned to other officers.

#### Error Responses

| RC | Constant | When |
|----|----------|------|
| 640 | `ERR_ROUTE_NOT_FOUND` | Route does not exist, is soft-deleted, or officer lacks access |

---

### 2.3 `Route/update_route`

Replace all waypoints on a draft route. Sends a full replacement array — existing waypoints are soft-deleted and replaced.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `route_id` | integer | Yes | — | Route ID (must be in `draft` status) |
| `name` | string | No | *(unchanged)* | Route display name. Send `/null/` to skip. Max 100 characters. |
| `waypoints` | string | Yes | — | JSON array of waypoint objects (see below). Max 200 waypoints. |

#### Waypoint Object Schema

```json
{
    "name": "North Perimeter Fence",
    "lat": 33.4501234,
    "lng": -112.0728901,
    "post_id": 12,
    "dwell_time_min": 10,
    "priority": "high",
    "eta_from_prev_min": 4,
    "notes": "Check fence line for damage"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Waypoint display name. Max 100 characters. |
| `lat` | number | Yes | — | Latitude (-90 to 90) |
| `lng` | number | Yes | — | Longitude (-180 to 180) |
| `post_id` | integer | No | `null` | Link to a post record. `null` for custom waypoints. |
| `dwell_time_min` | integer | No | 5 | Recommended dwell time in minutes |
| `priority` | string | No | `"normal"` | One of: `critical`, `high`, `normal`, `low` |
| `eta_from_prev_min` | integer | No | `null` | Estimated travel time from previous waypoint |
| `notes` | string | No | `null` | Special instructions. Max 500 characters. |

#### Success Response

Same structure as `generate_route` — returns the updated route with new waypoints.

#### Error Responses

| RC | Constant | When |
|----|----------|------|
| 640 | `ERR_ROUTE_NOT_FOUND` | Route does not exist or is soft-deleted |
| 651 | `ERR_ROUTE_CANNOT_UPDATE` | Route is not in `draft` status |
| 649 | `ERR_ROUTE_INVALID_WAYPOINTS` | Empty array, >200 items, or malformed waypoint objects |
| 650 | `ERR_ROUTE_INVALID_COORDINATES` | Latitude or longitude out of valid range |

---

### 2.4 `Route/push_route`

Push a draft route to the officer's mobile app. Transitions route status from `draft` to `active` and sends a push notification.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `route_id` | integer | Yes | — | Route ID (must be in `draft` status) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | Constant | When |
|----|----------|------|
| 640 | `ERR_ROUTE_NOT_FOUND` | Route does not exist or is soft-deleted |
| 642 | `ERR_ROUTE_ALREADY_PUSHED` | Route is already `active` |
| 645 | `ERR_ROUTE_INVALID_STATUS` | Route is `completed` (terminal state) |
| 649 | `ERR_ROUTE_INVALID_WAYPOINTS` | Route has no waypoints |

**Side effect:** A `route_pushed` push notification is sent to the officer with template variables `#route_name#` and `#shift_date#`. Payload includes `{ entity_type: "route", entity_id: <route_id> }` for deep-linking.

---

### 2.5 `Route/visit_waypoint`

Officer marks a waypoint as visited. Optionally includes GPS coordinates for compliance tracking. If this is the last unvisited waypoint, the route auto-completes.

**ACL:** Officer

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `waypoint_id` | integer | Yes | — | Waypoint ID |
| `lat` | decimal | No | `0` | GPS latitude at time of visit |
| `lng` | decimal | No | `0` | GPS longitude at time of visit |
| `is_manual` | boolean | No | `false` | `true` if officer manually marked (GPS insufficient) |

**GPS notes:**
- If `lat` and `lng` are both `0` (default), they are stored as `null` (no GPS data).
- When GPS coordinates are provided, the server calculates `deviation_m` — the Haversine straight-line distance in metres between the officer's position and the waypoint's planned position.

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "visit": {
        "waypoint_id": 101,
        "visited_on": "2026-10-15 09:05:12",
        "deviation_m": 15,
        "is_manual": false,
        "route_completed": false
    }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `waypoint_id` | integer | The visited waypoint ID |
| `visited_on` | datetime | Server timestamp of the visit |
| `deviation_m` | integer or null | Distance from planned location. `null` if no GPS provided. |
| `is_manual` | boolean | Whether the visit was manually marked |
| `route_completed` | boolean | `true` if this was the last unvisited waypoint and the route is now `completed` |

#### Error Responses

| RC | Constant | When |
|----|----------|------|
| 643 | `ERR_WAYPOINT_NOT_FOUND` | Waypoint does not exist or is soft-deleted |
| 640 | `ERR_ROUTE_NOT_FOUND` | Parent route does not exist |
| 652 | `ERR_ROUTE_NOT_PUSHED` | Route is still in `draft` status |
| 644 | `ERR_WAYPOINT_ALREADY_VISITED` | Waypoint has already been visited |

---

### 2.6 `Route/get_route_compliance`

Get compliance metrics for a route. Returns visit percentages, deviation averages, and per-waypoint detail.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `route_id` | integer | Yes | — | Route ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "compliance": {
        "route_id": 42,
        "route_name": "Patrol Route - 2026-10-15",
        "officer_id": "usr_abc123",
        "officer_name": "John Smith",
        "shift_id": 15,
        "shift_date": "2026-10-15",
        "route_status": "completed",
        "total_waypoints": 8,
        "visited_count": 6,
        "compliance_percent": 75,
        "total_planned_dwell_min": 40,
        "avg_deviation_m": 23,
        "manual_visit_count": 1,
        "waypoints": [
            {
                "waypoint_id": 101,
                "order": 1,
                "name": "Main Entrance Gate",
                "priority": "high",
                "planned_dwell_min": 5,
                "visited": true,
                "visited_on": "2026-10-15 09:05:12",
                "deviation_m": 15,
                "is_manual": false
            },
            {
                "waypoint_id": 102,
                "order": 2,
                "name": "Parking Structure B",
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
| `compliance_percent` | integer | `round((visited_count / total_waypoints) * 100)`. 0 if no waypoints. |
| `avg_deviation_m` | integer or null | Average GPS deviation across visits with GPS data. `null` if no GPS data. |
| `manual_visit_count` | integer | Number of visits marked manually (no GPS verification). |
| `total_planned_dwell_min` | integer | Sum of all waypoints' planned dwell times. |

#### Error Responses

| RC | Constant | When |
|----|----------|------|
| 640 | `ERR_ROUTE_NOT_FOUND` | Route does not exist or is soft-deleted |

---

### 2.7 `Settings/get_route_settings`

Get patrol route configuration values.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "auto_generate_routes_on_publish": true,
    "patrol_compliance_threshold_min": 15
}
```

---

### 2.8 `Settings/update_route_settings`

Update patrol route configuration values. Only send fields you want to change.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `auto_generate_routes_on_publish` | boolean | No | `true` | Auto-generate routes on shift publish |
| `patrol_compliance_threshold_min` | integer | No | `15` | Minutes overdue threshold (5–60) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Validation

- `patrol_compliance_threshold_min` must be between 5 and 60 (inclusive). Out-of-range values return `ERR_INVALID_API_PARAM`.

---

## 3. Complete Error Code Reference

| RC | Constant | Message |
|----|----------|---------|
| 640 | `ERR_ROUTE_NOT_FOUND` | route not found |
| 641 | `ERR_ROUTE_NO_POSTS_AVAILABLE` | no posts available for route generation |
| 642 | `ERR_ROUTE_ALREADY_PUSHED` | route has already been pushed to officer |
| 643 | `ERR_WAYPOINT_NOT_FOUND` | waypoint not found |
| 644 | `ERR_WAYPOINT_ALREADY_VISITED` | waypoint has already been visited |
| 645 | `ERR_ROUTE_INVALID_STATUS` | invalid route status for this operation |
| 646 | `ERR_ROUTE_SHIFT_NOT_FOUND` | shift not found or not accessible |
| 647 | `ERR_ROUTE_OFFICER_NOT_ALLOCATED` | officer is not allocated to this shift |
| 648 | `ERR_ROUTE_DUPLICATE` | a route already exists for this officer and shift |
| 649 | `ERR_ROUTE_INVALID_WAYPOINTS` | at least one waypoint is required |
| 650 | `ERR_ROUTE_INVALID_COORDINATES` | invalid waypoint coordinates |
| 651 | `ERR_ROUTE_CANNOT_UPDATE` | route cannot be updated in its current status |
| 652 | `ERR_ROUTE_NOT_PUSHED` | route has not been pushed to officer yet |

---

## 4. Push Notifications

### 4.1 `route_pushed`

| Field | Value |
|-------|-------|
| **Trigger** | `Route/push_route` succeeds |
| **Recipients** | The assigned officer |
| **Title** | New Patrol Route |
| **Message** | A patrol route (#route_name#) has been pushed to your shift on #shift_date# |
| **Payload** | `{ entity_type: "route", entity_id: <route_id> }` |
| **Deep-link** | Open Active Patrol Screen for this route |

### 4.2 `waypoint_skipped`

| Field | Value |
|-------|-------|
| **Trigger** | Deferred — will be fired by `cron_route_compliance_check.js` (Phase 5.2.1) |
| **Recipients** | Admin/supervisor users for the community |
| **Title** | Waypoint Skipped |
| **Message** | #officer_name# skipped waypoint #waypoint_name# on route #route_name# |
| **Payload** | `{ entity_type: "route", entity_id: <route_id> }` |
| **Deep-link** | Open Route Compliance Dashboard for this route |

### 4.3 `route_updated`

| Field | Value |
|-------|-------|
| **Trigger** | Reserved for future use (route modification during active shift) |
| **Recipients** | The assigned officer |
| **Title** | Route Updated |
| **Message** | Route #route_name# has been updated |

### 4.4 `officer_off_route`

| Field | Value |
|-------|-------|
| **Trigger** | Reserved for future use (GPS Tracking module, Phase 5.3) |
| **Recipients** | Admin/supervisor users |
| **Title** | Officer Off Route |
| **Message** | #officer_name# has deviated from assigned route #route_name# |

---

## 5. Typical Integration Flows

### 5.1 Admin: Create & Push a Route

```
1. POST Route/generate_route { shift_id: 15, officer_id: "usr_abc123" }
   → Receives draft route with auto-ordered waypoints

2. (Optional) Review waypoints, reorder via drag-and-drop
   POST Route/update_route { route_id: 42, waypoints: [...reordered array...] }

3. POST Route/push_route { route_id: 42 }
   → Route becomes active, officer receives push notification
```

### 5.2 Officer: Patrol a Route

```
1. Receive "New Patrol Route" push notification
   → Deep-link to Active Patrol Screen

2. GET Route/get_route { route_id: 42 }
   → Render waypoint list and map polyline

3. Arrive at waypoint #1
   POST Route/visit_waypoint { waypoint_id: 101, lat: 33.448, lng: -112.074 }
   → Response: { deviation_m: 15, route_completed: false }

4. Continue to waypoint #2 ...

5. Visit last waypoint
   POST Route/visit_waypoint { waypoint_id: 108, lat: 33.450, lng: -112.071 }
   → Response: { route_completed: true }
```

### 5.3 Admin: Review Compliance

```
1. GET Route/get_route_compliance { route_id: 42 }
   → compliance_percent: 75, avg_deviation_m: 23, per-waypoint details
```

### 5.4 Auto-Generation on Shift Publish

When the admin calls `Shift/publish_shift`, the server automatically generates routes for all allocated officers (if `auto_generate_routes_on_publish` is enabled in settings). No additional API calls are needed. The generated routes are in `draft` status and must still be pushed individually via `Route/push_route`.

---

## 6. Data Type Reference

| API Type Code | Description | Example |
|---------------|-------------|---------|
| `i` | Integer (required) | `route_id`, `shift_id`, `waypoint_id` |
| `s` | String (required) | `token`, `officer_id`, `waypoints` (JSON string) |
| `o:s:/null/` | Optional string, default `/null/` (means "not sent") | `name` in `update_route` |
| `o:d:0` | Optional decimal, default `0` | `lat`, `lng` in `visit_waypoint` |
| `o:b:false` | Optional boolean, default `false` | `is_manual` in `visit_waypoint` |
| `o:b:true` | Optional boolean, default `true` | `auto_generate_routes_on_publish` |
| `o:i:15` | Optional integer, default `15` | `patrol_compliance_threshold_min` |
