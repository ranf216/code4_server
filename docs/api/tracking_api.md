# Tracking API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Tracking/<endpoint_name>"`.

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

### Officer Location Updates

The officer mobile app periodically sends GPS coordinates to the server. Each update is appended to a chronological log of positions associated with the officer, their active community, and optionally their current shift and active call.

The transmission interval is configurable:
- **Normal patrol:** Every 30 seconds (default). Configurable range: 10–120 seconds.
- **Emergency response:** Every 10 seconds (default). Configurable range: 5–30 seconds.

These intervals are configured through the Settings module (SDS 5.3) and are not part of the Tracking API itself.

### Location Sources

Each GPS update is tagged with a source indicating how the position was obtained:

| Key | Display Name | Description |
|-----|-------------|-------------|
| `gps` | GPS | Device hardware GPS receiver (default). |
| `network` | Network | Cell tower or Wi-Fi triangulation. |
| `manual` | Manual | Officer manually entered or pinned a location. |

### Live Tracking Map

The management portal displays a real-time map (SDS 4.9) showing all officers who have submitted at least one GPS location. Each officer is represented by a coloured marker indicating their operational status.

### Officer Marker Status Colours

Each officer on the live tracking map is assigned a status colour according to the following priority (highest to lowest):

| Colour | Meaning | Condition |
|--------|---------|-----------|
| Grey | Off duty | Officer is not checked in to a shift. |
| Amber | GPS stale | Officer is checked in but no GPS update has been received within the stale threshold (default: 2 minutes). |
| Blue | Responding | Officer is checked in and actively responding to an accepted emergency call. |
| Red | Waypoint overdue | Officer is checked in, GPS is current, no active call, but a patrol route waypoint is overdue beyond the compliance threshold (default: 15 minutes). |
| Green | Normal | Officer is checked in, GPS is current, no active call, and no compliance issue. |

### ETA Calculation

When an emergency call has been accepted by an officer, the system can calculate an estimated time of arrival (ETA) from the officer's most recent known position to the call location. The calculation uses straight-line (Haversine) distance with two speed baselines:

- **Vehicular:** ~500 m/min (~30 km/h) — primary ETA for vehicular response.
- **Walking:** ~83 m/min (~5 km/h) — secondary ETA for foot-patrol scenarios.

The minimum ETA returned is always 1 minute. ETA is recalculated on each request; there is no server-side caching.

### GPS History Retention

Raw GPS location logs are retained for a configurable number of days (default: 90). A daily cleanup process permanently removes records older than the retention window. This data cannot be recovered once deleted.

---

## Endpoints — Location Updates

### POST Tracking/update_location
*Officer only.* Submits the officer's current GPS position. The location is appended to the officer's GPS log and becomes immediately available for live tracking, history queries, and ETA calculations.

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | An Officer session token. |
    | `latitude` | number | Yes | — | GPS latitude. Valid range: `-90` to `90`. |
    | `longitude` | number | Yes | — | GPS longitude. Valid range: `-180` to `180`. |
    | `accuracy` | number | No | `0` | GPS accuracy in metres. `0` = unknown. |
    | `speed` | number | No | `0` | Speed in metres per second. `0` = unknown. |
    | `heading` | number | No | `0` | Heading/bearing in degrees (0–360). `0` = unknown. |
    | `altitude` | number | No | `0` | Altitude in metres. `0` = unknown. |
    | `source` | string | No | `"gps"` | Location source: `gps`, `network`, or `manual`. |
    | `shift_id` | integer | No | `0` | The officer's active shift ID. `0` = not currently on duty. |
    | `call_id` | integer | No | `0` | The active call ID the officer is responding to. `0` = not responding to a call. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    A successful response confirms the location was recorded. No additional fields are returned.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer. |
    | 201 | invalid user token | Invalid or expired token. |
    | 660 | invalid GPS coordinates | `latitude` is outside `-90..90` or `longitude` is outside `-180..180`, or the values are not finite numbers. |
    | 661 | officer not found or not active | The officer's community could not be resolved (officer record missing or deleted). |
    | 665 | invalid tracking source | The `source` value is not one of: `gps`, `network`, `manual`. |

- **Usage & Flows:**
    The officer mobile app calls this endpoint at a regular interval determined by the GPS Transmission Interval setting (SDS 5.3). During normal patrol the default interval is 30 seconds; during an active emergency response it decreases to 10 seconds. The app should include the current `shift_id` if the officer is checked in to a shift, and the `call_id` if the officer has accepted an emergency call. This context allows the live tracking map and route history to display richer information.

---

## Endpoints — Live Tracking & History

### POST Tracking/get_live_tracking
*Admin only.* Retrieves the latest GPS position for every officer who has submitted at least one location update. Used to populate the Live Tracking map in the management portal (SDS 4.9).

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | An Admin session token. |
    | `community_id` | integer | No | `0` | Filter officers by community. `0` = return officers from all accessible communities. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officers":
        [
            {
                "officer_id": "abc123",
                "first_name": "John",
                "last_name": "Smith",
                "image": "https://...",
                "community_id": 5,
                "community_name": "Riverside Community",
                "latitude": 33.4484,
                "longitude": -112.074,
                "accuracy": 8.5,
                "speed": 1.2,
                "heading": 270,
                "last_update": "2025-01-15 14:32:10",
                "is_stale": false,
                "status": "green",
                "is_checked_in": true,
                "shift_id": 100,
                "shift_date": "2025-01-15",
                "shift_start_time": "08:00",
                "shift_end_time": "16:00",
                "active_call_id": null,
                "active_call_category": null
            }
        ],
        "stale_threshold_min": 2
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `officers` | array | One entry per officer with at least one GPS record. |
    | `officers[].officer_id` | string | The officer's user ID. |
    | `officers[].first_name` | string | Officer first name. |
    | `officers[].last_name` | string | Officer last name. |
    | `officers[].image` | string | Officer profile image URL (empty string if none). |
    | `officers[].community_id` | integer | Community ID from the officer's latest GPS log. |
    | `officers[].community_name` | string | Community display name. |
    | `officers[].latitude` | number | Latest GPS latitude. |
    | `officers[].longitude` | number | Latest GPS longitude. |
    | `officers[].accuracy` | number/null | GPS accuracy in metres, or `null` if not reported. |
    | `officers[].speed` | number/null | Speed in m/s, or `null` if not reported. |
    | `officers[].heading` | number/null | Heading in degrees, or `null` if not reported. |
    | `officers[].last_update` | string | Timestamp of the most recent GPS update (`YYYY-MM-DD HH:MM:SS`). |
    | `officers[].is_stale` | boolean | `true` if the last GPS update exceeds the stale threshold. |
    | `officers[].status` | string | Marker colour: `green`, `blue`, `amber`, `red`, or `grey`. See the Status Colours table above. |
    | `officers[].is_checked_in` | boolean | `true` if the officer is currently checked in to a shift. |
    | `officers[].shift_id` | integer/null | Active shift ID, or `null` if not on a shift. |
    | `officers[].shift_date` | string/null | Shift date (`YYYY-MM-DD`), or `null`. |
    | `officers[].shift_start_time` | string/null | Shift start time (`HH:MM`), or `null`. |
    | `officers[].shift_end_time` | string/null | Shift end time (`HH:MM`), or `null`. |
    | `officers[].active_call_id` | integer/null | ID of the currently accepted call, or `null`. |
    | `officers[].active_call_category` | string/null | Category of the active call (e.g. `medical_emergency`), or `null`. |
    | `stale_threshold_min` | number | The configured GPS stale threshold in minutes. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 500 | community not found | The specified `community_id` does not exist. |

- **Usage & Flows:**
    The management portal's Live Tracking page (SDS 4.9) calls this endpoint at the configured Map Auto-Refresh Interval (default: 30 seconds). The response provides everything needed to render the map: officer positions, status colours, shift context, and active call information. When `community_id` is `0`, all officers across all communities are returned, allowing the portal to display a multi-community overview. The `stale_threshold_min` value is included so the consumer can display stale-alert timing consistently.

---

### POST Tracking/get_officer_location
*Admin only.* Retrieves a single officer's current location and detailed status. Provides richer information than the list returned by `get_live_tracking`, including the full location record and time-since-update.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `officer_id` | string | Yes | The officer's user ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officer_id": "abc123",
        "first_name": "John",
        "last_name": "Smith",
        "image": "https://...",
        "community_id": 5,
        "location":
        {
            "latitude": 33.4484,
            "longitude": -112.074,
            "accuracy": 8.5,
            "speed": 1.2,
            "heading": 270,
            "altitude": 345,
            "source": "gps",
            "shift_id": 100,
            "call_id": null,
            "recorded_on": "2025-01-15 14:32:10"
        },
        "is_stale": false,
        "minutes_since_update": 1,
        "is_checked_in": true,
        "active_call_id": null,
        "active_call_category": null
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `officer_id` | string | The officer's user ID. |
    | `first_name` | string | Officer first name. |
    | `last_name` | string | Officer last name. |
    | `image` | string | Officer profile image URL (empty string if none). |
    | `community_id` | integer/null | Officer's community ID. |
    | `location` | object | The most recent GPS record for this officer. |
    | `location.latitude` | number | GPS latitude. |
    | `location.longitude` | number | GPS longitude. |
    | `location.accuracy` | number/null | GPS accuracy in metres. |
    | `location.speed` | number/null | Speed in m/s. |
    | `location.heading` | number/null | Heading in degrees. |
    | `location.altitude` | number/null | Altitude in metres. |
    | `location.source` | string | Location source: `gps`, `network`, or `manual`. |
    | `location.shift_id` | integer/null | Shift ID at the time of the update, or `null`. |
    | `location.call_id` | integer/null | Call ID at the time of the update, or `null`. |
    | `location.recorded_on` | string | Timestamp when the position was recorded (`YYYY-MM-DD HH:MM:SS`). |
    | `is_stale` | boolean | `true` if the location update exceeds the stale threshold. |
    | `minutes_since_update` | number | Whole minutes elapsed since the last GPS update. |
    | `is_checked_in` | boolean | `true` if the officer is currently checked in to a shift. |
    | `active_call_id` | integer/null | ID of the currently accepted call, or `null`. |
    | `active_call_category` | string/null | Category of the active call, or `null`. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 661 | officer not found or not active | The `officer_id` does not match an active officer. |
    | 664 | no location data available for this officer | The officer exists but has never submitted a GPS location. |

- **Usage & Flows:**
    Called from the Officer Info Panel in the Live Tracking map (SDS 4.9.3) when an admin taps on an officer marker. The response provides the full location detail including altitude, speed, source, and the exact number of minutes since the last update. This allows the portal to display a detailed officer status card.

---

### POST Tracking/get_officer_route_history
*Admin only.* Retrieves an officer's GPS track within a specified time range. Returns an array of location points ordered chronologically, suitable for rendering a route polyline on a map or for auditing patrol compliance.

- **API Parameters:**
    | Parameter | Type | Required | Default | Description |
    |-----------|------|----------|---------|-------------|
    | `#token` | string | Yes | — | An Admin session token. |
    | `officer_id` | string | Yes | — | The officer's user ID. |
    | `date_from` | string | Yes | — | Start of the time range (`YYYY-MM-DD HH:MM:SS`). |
    | `date_to` | string | Yes | — | End of the time range (`YYYY-MM-DD HH:MM:SS`). |
    | `shift_id` | integer | No | `0` | Filter results to a specific shift. `0` = include all shifts. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "officer_id": "abc123",
        "date_from": "2025-01-15 08:00:00",
        "date_to": "2025-01-15 16:00:00",
        "num_of_items": 3,
        "points":
        [
            {
                "latitude": 33.4484,
                "longitude": -112.074,
                "accuracy": 8.5,
                "speed": 1.2,
                "heading": 270,
                "altitude": 345,
                "source": "gps",
                "shift_id": 100,
                "call_id": null,
                "recorded_on": "2025-01-15 08:15:30"
            },
            {
                "latitude": 33.4490,
                "longitude": -112.073,
                "accuracy": 6.0,
                "speed": 0.8,
                "heading": 180,
                "altitude": 344,
                "source": "gps",
                "shift_id": 100,
                "call_id": null,
                "recorded_on": "2025-01-15 08:16:00"
            },
            {
                "latitude": 33.4495,
                "longitude": -112.072,
                "accuracy": 50.0,
                "speed": null,
                "heading": null,
                "altitude": null,
                "source": "network",
                "shift_id": 100,
                "call_id": null,
                "recorded_on": "2025-01-15 08:16:30"
            }
        ]
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `officer_id` | string | The queried officer's user ID (echo of input). |
    | `date_from` | string | Start of the requested time range (echo of input). |
    | `date_to` | string | End of the requested time range (echo of input). |
    | `num_of_items` | number | Total number of GPS points in the response. |
    | `points` | array | Chronologically ordered GPS records within the time range. |
    | `points[].latitude` | number | GPS latitude. |
    | `points[].longitude` | number | GPS longitude. |
    | `points[].accuracy` | number/null | GPS accuracy in metres. |
    | `points[].speed` | number/null | Speed in m/s. |
    | `points[].heading` | number/null | Heading in degrees. |
    | `points[].altitude` | number/null | Altitude in metres. |
    | `points[].source` | string | Location source: `gps`, `network`, or `manual`. |
    | `points[].shift_id` | integer/null | Shift ID at the time of the update, or `null`. |
    | `points[].call_id` | integer/null | Call ID at the time of the update, or `null`. |
    | `points[].recorded_on` | string | Timestamp of the GPS record (`YYYY-MM-DD HH:MM:SS`). |

    When no GPS records exist within the specified range, `num_of_items` is `0` and `points` is an empty array.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid or expired token. |
    | 661 | officer not found or not active | The `officer_id` does not match an active officer. |
    | 666 | invalid time range | `date_from` or `date_to` is empty, unparseable, or `date_from` is after `date_to`. |

- **Usage & Flows:**
    Used by the management portal to render an officer's GPS track as a polyline on the map. Admins can select a date range and optionally filter by shift to review patrol coverage. The `shift_id` filter is useful when an officer worked multiple shifts in a day and the admin wants to isolate a single shift's track. Points include the `call_id` field, which allows the consumer to highlight segments of the track where the officer was responding to an emergency call.

    Note: GPS history is subject to a retention policy (default: 90 days). Queries for dates beyond the retention window will return empty results.

---

## Endpoints — ETA

### POST Tracking/get_call_eta
*Officer or Resident.* Calculates the estimated time of arrival for the responding officer on an active emergency call. Uses straight-line (Haversine) distance from the officer's most recent known GPS position to the call's reported location.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Officer or Resident session token. |
    | `call_id` | integer | Yes | The emergency call ID. |

- **Access Rules:**
    - **Officers** can only query calls that are assigned to them (i.e. the officer accepted the call).
    - **Residents** can only query calls that they created.
    - Attempting to access another user's call returns `rc 662` (call not found).

- **Return Values (ETA available):**
    ```json
    {
        "rc": 0,
        "message": "success",
        "eta_available": true,
        "distance_m": 1250,
        "eta_min": 3,
        "eta_walking_min": 16,
        "officer_latitude": 33.4484,
        "officer_longitude": -112.074,
        "officer_last_update": "2025-01-15 14:32:10",
        "call_latitude": 33.452,
        "call_longitude": -112.071,
        "call_address": "456 Emergency Lane"
    }
    ```

    | Field | Type | Description |
    |-------|------|-------------|
    | `eta_available` | boolean | `true` when all data required for ETA calculation is present. |
    | `distance_m` | number | Straight-line distance in metres (rounded to nearest integer). |
    | `eta_min` | number | Estimated arrival time in minutes assuming vehicular speed (~30 km/h). Minimum: `1`. |
    | `eta_walking_min` | number | Estimated arrival time in minutes assuming walking speed (~5 km/h). Minimum: `1`. |
    | `officer_latitude` | number | Officer's most recent GPS latitude. |
    | `officer_longitude` | number | Officer's most recent GPS longitude. |
    | `officer_last_update` | string | Timestamp of the officer's last GPS update (`YYYY-MM-DD HH:MM:SS`). |
    | `call_latitude` | number | Call location latitude. |
    | `call_longitude` | number | Call location longitude. |
    | `call_address` | string/null | Call location address text, or `null` if not provided. |

- **Return Values (ETA not available):**

    When the system cannot calculate an ETA, a success response is still returned but with `eta_available` set to `false` and a `reason` string:

    ```json
    {
        "rc": 0,
        "message": "success",
        "eta_available": false,
        "reason": "no officer location data"
    }
    ```

    | Reason | Description |
    |--------|-------------|
    | `"call has no location coordinates"` | The call record does not have latitude/longitude. |
    | `"no officer assigned"` | No officer has accepted the call yet. |
    | `"no officer location data"` | The assigned officer has never submitted a GPS location. |

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Officer or Resident. |
    | 201 | invalid user token | Invalid or expired token. |
    | 662 | call not found | The `call_id` does not exist, or the caller does not have access to this call (wrong officer or wrong resident). |
    | 663 | call is not in an active state for ETA calculation | The call exists but is not in `accepted` status (e.g. it has already been resolved or cancelled). |

- **Usage & Flows:**
    Both the resident app and officer app display ETA information while an emergency call is active (SDS 2.4.1.3.1, SDS 3.4.2.2.2). The consumer app should poll this endpoint at a regular interval (recommended: 60 seconds, configurable via Emergency ETA Recalculation Interval setting) to display up-to-date arrival estimates.

    The ETA uses straight-line Haversine distance, not road-network routing. The vehicular ETA (`eta_min`) assumes approximately 30 km/h, suitable for urban emergency response. The walking ETA (`eta_walking_min`) assumes approximately 5 km/h, suitable for foot-patrol officers. The consumer app can choose which value to display based on the officer's mode of transport.

    When `eta_available` is `false`, the consumer should display a contextual message (e.g. "Waiting for officer location...") rather than an ETA value.

---

## Error Code Reference

| rc | Constant | Message |
|----|----------|---------|
| 0 | — | success |
| 103 | — | current user does not have privileges |
| 201 | — | invalid user token |
| 500 | ERR_COMMUNITY_NOT_FOUND | community not found |
| 660 | ERR_TRACKING_INVALID_COORDINATES | invalid GPS coordinates |
| 661 | ERR_TRACKING_OFFICER_NOT_FOUND | officer not found or not active |
| 662 | ERR_TRACKING_CALL_NOT_FOUND | call not found |
| 663 | ERR_TRACKING_CALL_NOT_ACTIVE | call is not in an active state for ETA calculation |
| 664 | ERR_TRACKING_NO_LOCATION_DATA | no location data available for this officer |
| 665 | ERR_TRACKING_INVALID_SOURCE | invalid tracking source |
| 666 | ERR_TRACKING_INVALID_TIME_RANGE | invalid time range |
