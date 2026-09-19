# Phase 5.3 — GPS & Live Tracking API: App Developer Integration Guide

**Version:** 5.3.0
**Audience:** Frontend developers (React Web Portal, React Native Mobile App)
**Base URL:** `{server}/api/`
**Authentication:** All endpoints require a valid session token passed as the `token` parameter.

---

## 1. Authentication & Access Model

### 1.1 Token Authentication

Every request must include a `token` parameter (string) containing the authenticated session token obtained from the login flow. Requests without a valid token return `ERR_INVALID_TOKEN`.

### 1.2 ACL Roles

| Role | Constant | Tracking Endpoints |
|------|----------|-------------------|
| **Admin** | `USER_TYPE_ADMIN` | `get_live_tracking`, `get_officer_location`, `get_officer_route_history` |
| **Officer** | `USER_TYPE_OFFICER` | `update_location`, `get_call_eta` |
| **Resident** | `USER_TYPE_RESIDENT` | `get_call_eta` |

**Community scoping:** The `get_live_tracking` endpoint supports an optional `community_id` filter. Non-super-admin users see only officers from their assigned community.

**Row-level access:**
- Officers calling `get_call_eta` can only query calls assigned to them.
- Residents calling `get_call_eta` can only query their own calls.

### 1.3 Pagination

This module does not use paginated list endpoints. `get_officer_route_history` returns all GPS points within the requested time range. For large time windows, consider narrowing the `date_from`/`date_to` range or filtering by `shift_id`.

---

## 2. Endpoint Directory

### 2.1 `Tracking/update_location`

Officer pushes a GPS telemetry ping from their mobile device. Each call creates one row in the GPS log table.

**ACL:** Officer

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `latitude` | decimal | Yes | — | GPS latitude (-90 to 90) |
| `longitude` | decimal | Yes | — | GPS longitude (-180 to 180) |
| `accuracy` | decimal | No | `0` | GPS accuracy in metres (0 = unknown) |
| `speed` | decimal | No | `0` | Speed in m/s (0 = unknown) |
| `heading` | decimal | No | `0` | Heading/bearing in degrees 0–360 (0 = unknown) |
| `altitude` | decimal | No | `0` | Altitude in metres (0 = unknown) |
| `source` | string | No | `"gps"` | Location source: `gps`, `network`, `manual` |
| `shift_id` | integer | No | `0` | Active shift ID (0 = not on duty) |
| `call_id` | integer | No | `0` | Active call ID (0 = not responding to a call) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success"
}
```

#### Error Responses

| RC | Constant | Cause |
|----|----------|-------|
| 660 | `ERR_TRACKING_INVALID_COORDINATES` | `latitude` or `longitude` out of valid range |
| 665 | `ERR_TRACKING_INVALID_SOURCE` | `source` value not in `tracking_source` enum |
| 661 | `ERR_TRACKING_OFFICER_NOT_FOUND` | Officer has no community assignment or is not active |

#### Client Integration Notes

- **Call frequency:** The mobile app should send location updates at the interval specified by `gps_interval_normal` (default 30s) during normal patrol, and `gps_interval_emergency` (default 10s) when responding to an active call. These values are obtained from the Settings API.
- **`shift_id` and `call_id`:** The app should include the current shift ID (from the check-in flow) and active call ID (if responding) so the server can correlate GPS logs with shift and call activity.
- **`source` parameter:** Send `"gps"` for native GPS, `"network"` for cell tower / Wi-Fi positioning, `"manual"` if the officer manually pins a location.
- **Offline handling:** If the device is offline, queue GPS pings locally and submit them when connectivity resumes. Each ping should include the timestamp from when the position was captured (server uses its own timestamp for `GPL_CREATED_ON`).

---

### 2.2 `Tracking/get_live_tracking`

Returns the latest GPS position for all officers who have logged at least one GPS entry, along with their current operational status for the live tracking map.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `community_id` | integer | No | `0` | Filter by community ID (0 = all accessible communities) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officers": [
        {
            "officer_id": "usr_ofc_001",
            "first_name": "John",
            "last_name": "Smith",
            "image": "https://cdn.example.com/profiles/usr_ofc_001.jpg",
            "community_id": 3,
            "community_name": "Oakwood Estates",
            "latitude": 33.4484367,
            "longitude": -112.0740373,
            "accuracy": 8.5,
            "speed": 1.2,
            "heading": 270.0,
            "last_update": "2026-10-15 14:32:10",
            "is_stale": false,
            "status": "green",
            "is_checked_in": true,
            "shift_id": 42,
            "shift_date": "2026-10-15",
            "shift_start_time": "06:00:00",
            "shift_end_time": "14:00:00",
            "active_call_id": null,
            "active_call_category": null
        },
        {
            "officer_id": "usr_ofc_002",
            "first_name": "Jane",
            "last_name": "Doe",
            "image": "",
            "community_id": 3,
            "community_name": "Oakwood Estates",
            "latitude": 33.4512890,
            "longitude": -112.0698450,
            "accuracy": 5.0,
            "speed": 8.3,
            "heading": 90.0,
            "last_update": "2026-10-15 14:31:55",
            "is_stale": false,
            "status": "blue",
            "is_checked_in": true,
            "shift_id": 42,
            "shift_date": "2026-10-15",
            "shift_start_time": "06:00:00",
            "shift_end_time": "14:00:00",
            "active_call_id": 187,
            "active_call_category": "emergency"
        }
    ],
    "stale_threshold_min": 2
}
```

#### Officer Status Values

The `status` field indicates the officer's operational state for map marker colouring. Evaluated in strict priority order:

| Status | Colour | Hex | Meaning |
|--------|--------|-----|---------|
| `grey` | Grey | `#6C757D` | Not checked in or off duty |
| `amber` | Amber | `#FFC107` | Checked in but GPS signal stale (last update > threshold) |
| `blue` | Blue | `#0D6EFD` | Checked in and responding to an active emergency call |
| `red` | Red | `#DC3545` | Checked in, active patrol route has an overdue unvisited waypoint |
| `green` | Green | `#198754` | Checked in, GPS active, no compliance issues |

#### Client Integration Notes

- **Polling interval:** Refresh this endpoint every `map_refresh_interval` seconds (default: 30s) from Settings.
- **Map rendering:** Use the `latitude`/`longitude` to position officer markers. Apply the `status` colour to the marker ring/pin.
- **Stale indicator:** When `is_stale` is `true`, consider showing a dimmed marker or "last seen X ago" tooltip based on `last_update`.
- **Active call overlay:** When `active_call_id` is not null, the officer is responding to a call. Consider showing a pulsing animation on the marker.

---

### 2.3 `Tracking/get_officer_location`

Fetches the latest GPS position and operational context for a single officer.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `officer_id` | string | Yes | — | Officer user ID |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officer_id": "usr_ofc_001",
    "first_name": "John",
    "last_name": "Smith",
    "image": "https://cdn.example.com/profiles/usr_ofc_001.jpg",
    "community_id": 3,
    "location": {
        "latitude": 33.4484367,
        "longitude": -112.0740373,
        "accuracy": 8.5,
        "speed": 1.2,
        "heading": 270.0,
        "altitude": 345.0,
        "source": "gps",
        "shift_id": 42,
        "call_id": null,
        "recorded_on": "2026-10-15 14:32:10"
    },
    "is_stale": false,
    "minutes_since_update": 1,
    "is_checked_in": true,
    "active_call_id": null,
    "active_call_category": null
}
```

#### Error Responses

| RC | Constant | Cause |
|----|----------|-------|
| 661 | `ERR_TRACKING_OFFICER_NOT_FOUND` | Officer ID not found or officer is deleted |
| 664 | `ERR_TRACKING_NO_LOCATION_DATA` | Officer exists but has no GPS log entries |

---

### 2.4 `Tracking/get_officer_route_history`

Returns an officer's GPS track as an array of location points for a specified time window, ordered chronologically. Used for historical breadcrumb playback.

**ACL:** Admin

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `officer_id` | string | Yes | — | Officer user ID |
| `date_from` | string | Yes | — | Start datetime (`YYYY-MM-DD HH:MM:SS`) |
| `date_to` | string | Yes | — | End datetime (`YYYY-MM-DD HH:MM:SS`) |
| `shift_id` | integer | No | `0` | Filter by shift ID (0 = all shifts in range) |

#### Success Response

```json
{
    "rc": 0,
    "message": "success",
    "officer_id": "usr_ofc_001",
    "date_from": "2026-10-15 06:00:00",
    "date_to": "2026-10-15 14:00:00",
    "num_of_items": 3,
    "points": [
        {
            "latitude": 33.4484367,
            "longitude": -112.0740373,
            "accuracy": 5.0,
            "speed": 0.0,
            "heading": null,
            "altitude": 345.0,
            "source": "gps",
            "shift_id": 42,
            "call_id": null,
            "recorded_on": "2026-10-15 06:01:30"
        },
        {
            "latitude": 33.4490123,
            "longitude": -112.0735890,
            "accuracy": 8.0,
            "speed": 1.4,
            "heading": 45.0,
            "altitude": 346.0,
            "source": "gps",
            "shift_id": 42,
            "call_id": null,
            "recorded_on": "2026-10-15 06:02:00"
        },
        {
            "latitude": 33.4495678,
            "longitude": -112.0730456,
            "accuracy": 6.0,
            "speed": 1.5,
            "heading": 48.0,
            "altitude": 346.0,
            "source": "gps",
            "shift_id": 42,
            "call_id": 187,
            "recorded_on": "2026-10-15 06:02:30"
        }
    ]
}
```

#### Error Responses

| RC | Constant | Cause |
|----|----------|-------|
| 661 | `ERR_TRACKING_OFFICER_NOT_FOUND` | Officer ID not found or deleted |
| 666 | `ERR_TRACKING_INVALID_TIME_RANGE` | `date_from`/`date_to` missing, unparseable, or `from > to` |

#### Client Integration Notes

- **Polyline rendering:** Connect the `points` array in order to render the officer's movement trail on the map.
- **Speed colouring:** Use the `speed` field (in m/s) to colour-code polyline segments (e.g. stationary = grey, walking = blue, driving = green).
- **Call correlation:** Points where `call_id` is non-null indicate the officer was responding to a call at that time. Consider highlighting these segments.
- **No pagination:** All points in the time range are returned. For long time windows with many points, the response may be large. Use `shift_id` to narrow the scope.

---

### 2.5 `Tracking/get_call_eta`

Calculates the straight-line distance and estimated arrival time from the responding officer's last known GPS position to the emergency call location.

**ACL:** Officer, Resident

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `token` | string | Yes | — | Session token |
| `call_id` | integer | Yes | — | Call ID |

#### Success Response (ETA Available)

```json
{
    "rc": 0,
    "message": "success",
    "eta_available": true,
    "distance_m": 2450,
    "eta_min": 5,
    "eta_walking_min": 30,
    "officer_latitude": 33.4484367,
    "officer_longitude": -112.0740373,
    "officer_last_update": "2026-10-15 14:32:10",
    "call_latitude": 33.4520100,
    "call_longitude": -112.0710200,
    "call_address": "123 Oak Street, Unit 4B"
}
```

#### Success Response (ETA Unavailable)

When ETA cannot be calculated, the response still returns `rc: 0` with `eta_available: false` and a reason:

```json
{
    "rc": 0,
    "message": "success",
    "eta_available": false,
    "reason": "no officer location data"
}
```

Possible `reason` values:
- `"call has no location coordinates"` — the call has no latitude/longitude
- `"no officer assigned"` — the call has no assigned officer
- `"no officer location data"` — the assigned officer has no GPS log entries

#### Error Responses

| RC | Constant | Cause |
|----|----------|-------|
| 662 | `ERR_TRACKING_CALL_NOT_FOUND` | Call ID not found, deleted, or access denied (not your call) |
| 663 | `ERR_TRACKING_CALL_NOT_ACTIVE` | Call is not in `accepted` status (officer must be actively responding) |

#### Client Integration Notes

- **Polling:** During an active emergency response, poll this endpoint at `emergency_eta_interval` seconds (default: 60s) from Settings to show updated ETA as the officer moves.
- **Distance display:** `distance_m` is the straight-line (Haversine) distance. Consider displaying as "~X.X km" for distances > 1000m and "~X m" otherwise.
- **ETA display:** `eta_min` is the primary vehicular estimate (~30 km/h). `eta_walking_min` is a secondary foot-patrol estimate (~5 km/h). Display the primary ETA prominently; show walking ETA as a secondary note.
- **Graceful fallback:** Always check `eta_available` before rendering ETA data. When `false`, display the `reason` as a user-friendly message.

---

## 3. Error Code Directory

| RC | Constant | Message | Endpoints |
|----|----------|---------|-----------|
| 660 | `ERR_TRACKING_INVALID_COORDINATES` | invalid GPS coordinates | `update_location` |
| 661 | `ERR_TRACKING_OFFICER_NOT_FOUND` | officer not found or not active | `update_location`, `get_officer_location`, `get_officer_route_history` |
| 662 | `ERR_TRACKING_CALL_NOT_FOUND` | call not found | `get_call_eta` |
| 663 | `ERR_TRACKING_CALL_NOT_ACTIVE` | call is not in an active state for ETA calculation | `get_call_eta` |
| 664 | `ERR_TRACKING_NO_LOCATION_DATA` | no location data available for this officer | `get_officer_location` |
| 665 | `ERR_TRACKING_INVALID_SOURCE` | invalid tracking source | `update_location` |
| 666 | `ERR_TRACKING_INVALID_TIME_RANGE` | invalid time range | `get_officer_route_history` |

---

## 4. GPS Settings Reference

GPS settings are managed through the shared Settings module (`Settings/get_settings` and `Settings/update_settings` with key `settings:gps`), not through dedicated tracking endpoints.

| Setting Key | Type | Default | Used By |
|-------------|------|---------|---------|
| `gps_interval_normal` | integer (sec) | `30` | Mobile app: normal patrol GPS push interval |
| `gps_interval_emergency` | integer (sec) | `10` | Mobile app: emergency response GPS push interval |
| `gps_stale_threshold` | integer (min) | `2` | Server: amber marker threshold in `get_live_tracking` |
| `location_history_retention` | integer (days) | `90` | Server: GPS log cleanup cron retention period |
| `map_refresh_interval` | integer (sec) | `30` | Web portal: live tracking map polling interval |
| `patrol_compliance_threshold` | integer (min) | `15` | Server: waypoint overdue red marker threshold |
| `emergency_eta_interval` | integer (sec) | `60` | Mobile app: ETA polling interval during active call |
| `map_provider` | string | `"google_maps"` | Client: map tile provider identifier |

---

## 5. Mobile Background Telemetry Guidelines

### 5.1 GPS Push Lifecycle

1. **On shift check-in:** Start background GPS service at `gps_interval_normal` (30s).
2. **On call accept:** Switch to `gps_interval_emergency` (10s). Include `call_id` in `update_location` calls.
3. **On call resolve/cancel:** Revert to `gps_interval_normal`. Clear `call_id`.
4. **On shift check-out:** Stop background GPS service.

### 5.2 Source Selection

| Platform API Result | `source` Value |
|--------------------|----------------|
| High-accuracy GPS fix | `"gps"` |
| Cell tower / Wi-Fi positioning | `"network"` |
| User manually pins location on map | `"manual"` |

### 5.3 Power-Saving Considerations

- On iOS, use `CLLocationManager` with `allowsBackgroundLocationUpdates = true` and `pausesLocationUpdatesAutomatically = false` during active shifts.
- On Android, use a foreground service with the `ACCESS_FINE_LOCATION` permission and a persistent notification.
- If the OS throttles location updates (e.g. Doze mode), send the last known position with `source: "network"` at the normal interval to maintain staleness tracking.

### 5.4 Offline Queue

When the device loses network connectivity:
1. Continue capturing GPS positions locally with timestamps.
2. Queue `update_location` payloads in persistent storage (AsyncStorage/MMKV).
3. On reconnect, submit queued pings in chronological order.
4. Note: The server records its own `GPL_CREATED_ON` timestamp at insertion time. Queued pings will have the server's receipt time, not the original capture time. This is acceptable for the current implementation.
