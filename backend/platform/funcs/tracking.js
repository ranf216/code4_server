const TABLE_TRACKING_SOURCE = "tracking_source";
const TABLE_CALL_STATUS = "call_status";

const GPS_STALE_THRESHOLD_DEFAULT_MIN = 2;
const WALKING_SPEED_M_PER_MIN = 83; // ~5 km/h
const VEHICULAR_SPEED_M_PER_MIN = 500; // ~30 km/h — emergency vehicular response

// =========================================================================
// Helpers — coordinate validation
// =========================================================================

function isValidLatitude(lat)
{
	return typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng)
{
	return typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180;
}

// =========================================================================
// Helpers — Haversine straight-line distance (metres)
// =========================================================================

function haversineDistanceM(lat1, lng1, lat2, lng2)
{
	let R = 6371000;
	let dLat = (lat2 - lat1) * Math.PI / 180;
	let dLng = (lng2 - lng1) * Math.PI / 180;
	let a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
		+ Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
		* Math.sin(dLng / 2) * Math.sin(dLng / 2);
	let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

// =========================================================================
// Helpers — record fetchers
// =========================================================================

function fetchOfficerRecord(officerId)
{
	let rows = $Db.executeQuery(
		`SELECT OFC_USR_ID
		 FROM \`officer\`
		 WHERE OFC_USR_ID=? AND OFC_DELETED_ON IS NULL`,
		[officerId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchLatestLocation(officerId)
{
	let rows = $Db.executeQuery(
		`SELECT GPL_ID, GPL_OFC_USR_ID, GPL_COM_ID,
		        GPL_LATITUDE, GPL_LONGITUDE,
		        GPL_ACCURACY, GPL_SPEED, GPL_HEADING, GPL_ALTITUDE,
		        GPL_SFT_ID, GPL_SVC_ID, GPL_SOURCE, GPL_CREATED_ON
		 FROM \`gps_log\`
		 WHERE GPL_OFC_USR_ID=?
		 ORDER BY GPL_CREATED_ON DESC
		 LIMIT 1`,
		[officerId]);
	return rows.length > 0 ? rows[0] : null;
}

function getGpsSettings()
{
	let settings = { ...$Config.get("SETTINGS_DEFAULTS").gps };
	try
	{
		let rows = $Db.executeQuery(
			`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
			[$Const.KVL_SETTINGS_GPS]);
		if (rows.length > 0 && rows[0].KVL_VALUE)
		{
			let stored = JSON.parse(rows[0].KVL_VALUE);
			for (let key of Object.keys(stored))
			{
				if (key in settings)
				{
					settings[key] = stored[key];
				}
			}
		}
	}
	catch (e) { /* use defaults */ }
	return settings;
}

function getRouteSettings()
{
	let settings = { ...$Config.get("SETTINGS_DEFAULTS").route };
	try
	{
		let rows = $Db.executeQuery(
			`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
			[$Const.KVL_SETTINGS_ROUTE]);
		if (rows.length > 0 && rows[0].KVL_VALUE)
		{
			let stored = JSON.parse(rows[0].KVL_VALUE);
			for (let key of Object.keys(stored))
			{
				if (key in settings)
				{
					settings[key] = stored[key];
				}
			}
		}
	}
	catch (e) { /* use defaults */ }
	return settings;
}

// =========================================================================
// Helpers — waypoint overdue check for live tracking (SDS 4.9.2 red status)
// =========================================================================

/**
 * For a set of officer IDs, determine which officers have overdue unvisited
 * waypoints on their active patrol routes.
 * Returns a Set of officer IDs that should be marked "red".
 *
 * Algorithm:
 *   For each active route, calculate the expected arrival time at each
 *   waypoint: PTR_PUSHED_ON + cumulative ETA + cumulative dwell of prior
 *   waypoints.  If the first unvisited waypoint's expected arrival +
 *   patrol_compliance_threshold_min has passed → officer is overdue.
 *
 * No DB queries inside loops — uses batch IN(...) queries.
 */
function getOfficersWithOverdueWaypoints(officerIds, now)
{
	if (officerIds.length === 0)
	{
		return new Set();
	}

	let routeSettings = getRouteSettings();
	let complianceThresholdMin = routeSettings.patrol_compliance_threshold_min || 15;

	// --- batch fetch active routes for these officers ---
	let routes = $Db.executeQuery(
		`SELECT PTR_ID, PTR_OFC_USR_ID, PTR_PUSHED_ON
		 FROM \`patrol_route\`
		 WHERE PTR_OFC_USR_ID IN (${officerIds.toPlaceholders()})
		   AND PTR_STATUS=?
		   AND PTR_DELETED_ON IS NULL`,
		[...officerIds, $Const.ROUTE_STATUS_ACTIVE]);

	if (routes.length === 0)
	{
		return new Set();
	}

	let routeIds = routes.map(r => r.PTR_ID);
	let routeMap = {};
	for (let i = 0; i < routes.length; i++)
	{
		routeMap[routes[i].PTR_ID] = routes[i];
	}

	// --- batch fetch all waypoints for those routes ---
	let waypoints = $Db.executeQuery(
		`SELECT PTW_ID, PTW_PTR_ID, PTW_ORDER, PTW_ETA_FROM_PREV_MIN, PTW_DWELL_TIME_MIN
		 FROM \`patrol_waypoint\`
		 WHERE PTW_PTR_ID IN (${routeIds.toPlaceholders()})
		   AND PTW_DELETED_ON IS NULL
		 ORDER BY PTW_PTR_ID, PTW_ORDER ASC`,
		[...routeIds]);

	// --- batch fetch visits for those routes ---
	let visits = $Db.executeQuery(
		`SELECT WPV_PTW_ID
		 FROM \`waypoint_visit\`
		 WHERE WPV_PTR_ID IN (${routeIds.toPlaceholders()})`,
		[...routeIds]);

	let visitedSet = new Set();
	for (let i = 0; i < visits.length; i++)
	{
		visitedSet.add(visits[i].WPV_PTW_ID);
	}

	// --- group waypoints by route ---
	let waypointsByRoute = {};
	for (let i = 0; i < waypoints.length; i++)
	{
		let wp = waypoints[i];
		if (!waypointsByRoute[wp.PTW_PTR_ID])
		{
			waypointsByRoute[wp.PTW_PTR_ID] = [];
		}
		waypointsByRoute[wp.PTW_PTR_ID].push(wp);
	}

	// --- evaluate overdue status per route ---
	let overdueOfficers = new Set();
	let nowMs = new Date(now).getTime();

	for (let routeId of routeIds)
	{
		let route = routeMap[routeId];
		let wps = waypointsByRoute[routeId];
		if (!wps || wps.length === 0 || !route.PTR_PUSHED_ON)
		{
			continue;
		}

		let pushedMs = new Date(route.PTR_PUSHED_ON).getTime();
		let cumulativeMin = 0;

		for (let j = 0; j < wps.length; j++)
		{
			let wp = wps[j];
			cumulativeMin += (wp.PTW_ETA_FROM_PREV_MIN || 0);

			if (!visitedSet.has(wp.PTW_ID))
			{
				// First unvisited waypoint — check if overdue
				let expectedArrivalMs = pushedMs + (cumulativeMin * 60000);
				let deadlineMs = expectedArrivalMs + (complianceThresholdMin * 60000);

				if (nowMs > deadlineMs)
				{
					overdueOfficers.add(route.PTR_OFC_USR_ID);
				}
				break; // only need to check the first unvisited waypoint per route
			}

			// Visited waypoint — add its dwell time to cumulative for next waypoint
			cumulativeMin += (wp.PTW_DWELL_TIME_MIN || 0);
		}
	}

	return overdueOfficers;
}

function mapLocationToResponse(row)
{
	return {
		latitude: Number(row.GPL_LATITUDE),
		longitude: Number(row.GPL_LONGITUDE),
		accuracy: row.GPL_ACCURACY ? Number(row.GPL_ACCURACY) : null,
		speed: row.GPL_SPEED ? Number(row.GPL_SPEED) : null,
		heading: row.GPL_HEADING ? Number(row.GPL_HEADING) : null,
		altitude: row.GPL_ALTITUDE ? Number(row.GPL_ALTITUDE) : null,
		source: row.GPL_SOURCE,
		shift_id: row.GPL_SFT_ID || null,
		call_id: row.GPL_SVC_ID || null,
		recorded_on: row.GPL_CREATED_ON,
	};
}

// =========================================================================
// Module class
// =========================================================================

module.exports = class
{
	constructor(session = null)
	{
		if (session !== null) { this.$Session = session; }

		$DataItems.define(TABLE_TRACKING_SOURCE);
		$DataItems.define(TABLE_CALL_STATUS);
	}


	// =====================================================================
	// update_location — Officer sends GPS position
	// =====================================================================

	update_location()
	{
		let lat = this.$latitude;
		let lng = this.$longitude;

		// --- validate coordinates ---
		if (!isValidLatitude(lat) || !isValidLongitude(lng))
		{
			return $ERRS.ERR_TRACKING_INVALID_COORDINATES;
		}

		// --- validate source ---
		let source = this.$source;
		if (!$DataItems.isValidItemId(source, TABLE_TRACKING_SOURCE))
		{
			return $ERRS.ERR_TRACKING_INVALID_SOURCE;
		}

		// --- resolve officer community ---
		let userId = this.$Session.userId;
		let communityId = $Funcs.getUserCommunityId(userId);
		if (!communityId)
		{
			return $ERRS.ERR_TRACKING_OFFICER_NOT_FOUND;
		}

		let now = $Utils.now();
		let accuracy = this.$accuracy || null;
		let speed = this.$speed || null;
		let heading = this.$heading || null;
		let altitude = this.$altitude || null;
		let shiftId = this.$shift_id || null;
		let callId = this.$call_id || null;

		// --- insert GPS log entry ---
		$Db.executeQuery(
			`INSERT INTO \`gps_log\`
			 (GPL_OFC_USR_ID, GPL_COM_ID, GPL_LATITUDE, GPL_LONGITUDE,
			  GPL_ACCURACY, GPL_SPEED, GPL_HEADING, GPL_ALTITUDE,
			  GPL_SFT_ID, GPL_SVC_ID, GPL_SOURCE, GPL_CREATED_ON)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[userId, communityId, lat, lng,
			 accuracy, speed, heading, altitude,
			 shiftId, callId, source, now]);
		if ($Db.isError()) return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());

		return { ...$ERRS.ERR_SUCCESS };
	}


	// =====================================================================
	// get_live_tracking — Admin: all checked-in officers' latest positions
	// =====================================================================

	get_live_tracking()
	{
		let vals = {};
		let communityId = this.$community_id;

		// --- build community filter ---
		let communityCondition = "";
		let communityParams = [];

		if (communityId > 0)
		{
			if (!$Funcs.communityExists(communityId))
			{
				return $ERRS.ERR_COMMUNITY_NOT_FOUND;
			}
			communityCondition = " AND gps_log.GPL_COM_ID=?";
			communityParams = [communityId];
		}

		// --- GPS stale threshold ---
		let gpsSettings = getGpsSettings();
		let staleThresholdMin = gpsSettings.gps_stale_threshold || GPS_STALE_THRESHOLD_DEFAULT_MIN;

		// --- get latest location per officer who has logged at least one position ---
		// Uses a subquery to find the MAX GPL_ID per officer, then joins to get full row.
		let rows = $Db.executeQuery(
			`SELECT gps_log.GPL_ID, gps_log.GPL_OFC_USR_ID, gps_log.GPL_COM_ID,
			        gps_log.GPL_LATITUDE, gps_log.GPL_LONGITUDE,
			        gps_log.GPL_ACCURACY, gps_log.GPL_SPEED, gps_log.GPL_HEADING, gps_log.GPL_ALTITUDE,
			        gps_log.GPL_SFT_ID, gps_log.GPL_SVC_ID, gps_log.GPL_SOURCE, gps_log.GPL_CREATED_ON,
			        user_details.USD_FIRST_NAME, user_details.USD_LAST_NAME,
			        user_details.USD_IMAGE,
			        community.COM_NAME,
			        shift_checkin.SFC_CHECK_IN_ON,
			        shift.SFT_START_TIME, shift.SFT_END_TIME,
			        CAST(shift.SFT_DATE AS CHAR) SFT_DATE,
			        service_call.SVC_ID SVC_ACTIVE_CALL_ID,
			        service_call.SVC_CATEGORY SVC_ACTIVE_CALL_CATEGORY
			 FROM \`gps_log\`
			 	JOIN (
			 		SELECT GPL_OFC_USR_ID, MAX(GPL_ID) MAX_GPL_ID
			 		FROM \`gps_log\`
			 		GROUP BY GPL_OFC_USR_ID
			 	) latest ON gps_log.GPL_ID = latest.MAX_GPL_ID
			 	JOIN \`user_details\` ON gps_log.GPL_OFC_USR_ID = user_details.USD_USR_ID
			 		AND user_details.USD_DELETED_ON IS NULL
			 	JOIN \`officer\` ON gps_log.GPL_OFC_USR_ID = officer.OFC_USR_ID
			 		AND officer.OFC_DELETED_ON IS NULL
			 	JOIN \`community\` ON gps_log.GPL_COM_ID = community.COM_ID
			 		AND community.COM_DELETED_ON IS NULL
			 	LEFT OUTER JOIN \`shift_checkin\` ON gps_log.GPL_OFC_USR_ID = shift_checkin.SFC_OFC_USR_ID
			 		AND gps_log.GPL_SFT_ID = shift_checkin.SFC_SFT_ID
			 		AND shift_checkin.SFC_CHECK_OUT_ON IS NULL
			 	LEFT OUTER JOIN \`shift\` ON gps_log.GPL_SFT_ID = shift.SFT_ID
			 		AND shift.SFT_DELETED_ON IS NULL
			 	LEFT OUTER JOIN \`service_call\` ON gps_log.GPL_SVC_ID = service_call.SVC_ID
			 		AND service_call.SVC_STATUS = ?
			 		AND service_call.SVC_DELETED_ON IS NULL
			 WHERE 1=1${communityCondition}`,
			[$Const.CALL_STATUS_ACCEPTED, ...communityParams]);

		let nowStr = $Utils.now();
		let now = new Date(nowStr);

		// --- Pre-evaluate: collect officers eligible for red (waypoint skip) check ---
		// Officers who are checked in, not stale, and have no active call would
		// otherwise be "green".  Among these, any with an overdue unvisited
		// waypoint should be "red" per SDS 4.9.2.
		let greenCandidateIds = [];
		for (let i = 0; i < rows.length; i++)
		{
			let r = rows[i];
			let isCheckedIn = !!r.SFC_CHECK_IN_ON;
			let isStale = ((now - new Date(r.GPL_CREATED_ON)) / 60000) > staleThresholdMin;
			let hasActiveCall = !!r.SVC_ACTIVE_CALL_ID;
			if (isCheckedIn && !isStale && !hasActiveCall)
			{
				greenCandidateIds.push(r.GPL_OFC_USR_ID);
			}
		}

		// Batch check overdue waypoints (no DB queries in loops)
		let overdueOfficers = getOfficersWithOverdueWaypoints(greenCandidateIds, nowStr);

		vals.officers = rows.map(r =>
		{
			let lastUpdate = new Date(r.GPL_CREATED_ON);
			let minutesSinceUpdate = (now - lastUpdate) / 60000;
			let isStale = minutesSinceUpdate > staleThresholdMin;
			let isCheckedIn = !!r.SFC_CHECK_IN_ON;
			let hasActiveCall = !!r.SVC_ACTIVE_CALL_ID;

			// Determine officer status colour per SDS 4.9.2
			// Priority: grey → amber → blue → red → green
			let status;
			if (!isCheckedIn)
			{
				status = "grey";
			}
			else if (isStale)
			{
				status = "amber";
			}
			else if (hasActiveCall)
			{
				status = "blue";
			}
			else if (overdueOfficers.has(r.GPL_OFC_USR_ID))
			{
				status = "red";
			}
			else
			{
				status = "green";
			}

			return {
				officer_id: r.GPL_OFC_USR_ID,
				first_name: r.USD_FIRST_NAME || "",
				last_name: r.USD_LAST_NAME || "",
				image: r.USD_IMAGE || "",
				community_id: r.GPL_COM_ID,
				community_name: r.COM_NAME,
				latitude: Number(r.GPL_LATITUDE),
				longitude: Number(r.GPL_LONGITUDE),
				accuracy: r.GPL_ACCURACY ? Number(r.GPL_ACCURACY) : null,
				speed: r.GPL_SPEED ? Number(r.GPL_SPEED) : null,
				heading: r.GPL_HEADING ? Number(r.GPL_HEADING) : null,
				last_update: r.GPL_CREATED_ON,
				is_stale: isStale,
				status: status,
				is_checked_in: isCheckedIn,
				shift_id: r.GPL_SFT_ID || null,
				shift_date: r.SFT_DATE || null,
				shift_start_time: r.SFT_START_TIME || null,
				shift_end_time: r.SFT_END_TIME || null,
				active_call_id: r.SVC_ACTIVE_CALL_ID || null,
				active_call_category: r.SVC_ACTIVE_CALL_CATEGORY || null,
			};
		});

		vals.stale_threshold_min = staleThresholdMin;

		return { ...$ERRS.ERR_SUCCESS, ...vals };
	}


	// =====================================================================
	// get_officer_location — Admin: single officer current location
	// =====================================================================

	get_officer_location()
	{
		let vals = {};
		let officerId = this.$officer_id;

		// --- validate officer ---
		let officer = fetchOfficerRecord(officerId);
		if (!officer)
		{
			return $ERRS.ERR_TRACKING_OFFICER_NOT_FOUND;
		}

		// --- get latest GPS entry ---
		let location = fetchLatestLocation(officerId);
		if (!location)
		{
			return $ERRS.ERR_TRACKING_NO_LOCATION_DATA;
		}

		// --- get officer details ---
		let detailRows = $Db.executeQuery(
			`SELECT USD_FIRST_NAME, USD_LAST_NAME, USD_IMAGE, USD_COM_ID
			 FROM \`user_details\`
			 WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
			[officerId]);
		let details = detailRows.length > 0 ? detailRows[0] : {};

		// --- GPS stale check ---
		let gpsSettings = getGpsSettings();
		let staleThresholdMin = gpsSettings.gps_stale_threshold || GPS_STALE_THRESHOLD_DEFAULT_MIN;
		let now = new Date($Utils.now());
		let lastUpdate = new Date(location.GPL_CREATED_ON);
		let minutesSinceUpdate = (now - lastUpdate) / 60000;

		// --- check-in status ---
		let checkinRows = $Db.executeQuery(
			`SELECT SFC_SFT_ID, SFC_CHECK_IN_ON
			 FROM \`shift_checkin\`
			 WHERE SFC_OFC_USR_ID=? AND SFC_CHECK_OUT_ON IS NULL
			 ORDER BY SFC_CHECK_IN_ON DESC
			 LIMIT 1`,
			[officerId]);
		let isCheckedIn = checkinRows.length > 0;

		// --- active call ---
		let callRows = $Db.executeQuery(
			`SELECT SVC_ID, SVC_CATEGORY
			 FROM \`service_call\`
			 WHERE SVC_OFC_USR_ID=? AND SVC_STATUS=? AND SVC_DELETED_ON IS NULL
			 LIMIT 1`,
			[officerId, $Const.CALL_STATUS_ACCEPTED]);
		let hasActiveCall = callRows.length > 0;

		vals.officer_id = officerId;
		vals.first_name = details.USD_FIRST_NAME || "";
		vals.last_name = details.USD_LAST_NAME || "";
		vals.image = details.USD_IMAGE || "";
		vals.community_id = details.USD_COM_ID || null;
		vals.location = mapLocationToResponse(location);
		vals.is_stale = minutesSinceUpdate > staleThresholdMin;
		vals.minutes_since_update = Math.round(minutesSinceUpdate);
		vals.is_checked_in = isCheckedIn;
		vals.active_call_id = hasActiveCall ? callRows[0].SVC_ID : null;
		vals.active_call_category = hasActiveCall ? callRows[0].SVC_CATEGORY : null;

		return { ...$ERRS.ERR_SUCCESS, ...vals };
	}


	// =====================================================================
	// get_officer_route_history — Admin: GPS track for a time range
	// =====================================================================

	get_officer_route_history()
	{
		let vals = {};
		let officerId = this.$officer_id;
		let dateFrom = this.$date_from;
		let dateTo = this.$date_to;
		let shiftId = this.$shift_id;

		// --- validate officer ---
		let officer = fetchOfficerRecord(officerId);
		if (!officer)
		{
			return $ERRS.ERR_TRACKING_OFFICER_NOT_FOUND;
		}

		// --- validate date range ---
		if ($Utils.empty(dateFrom) || $Utils.empty(dateTo))
		{
			return $ERRS.ERR_TRACKING_INVALID_TIME_RANGE;
		}
		let from = new Date(dateFrom);
		let to = new Date(dateTo);
		if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to)
		{
			return $ERRS.ERR_TRACKING_INVALID_TIME_RANGE;
		}

		// --- build query ---
		let conditions = ["GPL_OFC_USR_ID=?", "GPL_CREATED_ON >= ?", "GPL_CREATED_ON <= ?"];
		let params = [officerId, dateFrom, dateTo];

		if (shiftId > 0)
		{
			conditions.push("GPL_SFT_ID=?");
			params.push(shiftId);
		}

		let rows = $Db.executeQuery(
			`SELECT GPL_ID, GPL_OFC_USR_ID, GPL_COM_ID,
			        GPL_LATITUDE, GPL_LONGITUDE,
			        GPL_ACCURACY, GPL_SPEED, GPL_HEADING, GPL_ALTITUDE,
			        GPL_SFT_ID, GPL_SVC_ID, GPL_SOURCE, GPL_CREATED_ON
			 FROM \`gps_log\`
			 WHERE ${conditions.join(" AND ")}
			 ORDER BY GPL_CREATED_ON ASC`,
			params);

		vals.officer_id = officerId;
		vals.date_from = dateFrom;
		vals.date_to = dateTo;
		vals.num_of_items = rows.length;
		vals.points = rows.map(r => mapLocationToResponse(r));

		return { ...$ERRS.ERR_SUCCESS, ...vals };
	}


	// =====================================================================
	// get_call_eta — Officer/Resident: ETA for active emergency call
	// =====================================================================

	get_call_eta()
	{
		let vals = {};
		let callId = this.$call_id;

		// --- fetch call ---
		let callRows = $Db.executeQuery(
			`SELECT SVC_ID, SVC_STATUS, SVC_CATEGORY,
			        SVC_OFC_USR_ID, SVC_RES_USR_ID, SVC_COM_ID,
			        SVC_LATITUDE, SVC_LONGITUDE, SVC_CURRENT_ADDRESS
			 FROM \`service_call\`
			 WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
			[callId]);
		if (callRows.length === 0)
		{
			return $ERRS.ERR_TRACKING_CALL_NOT_FOUND;
		}
		let call = callRows[0];

		// --- call must be accepted (officer responding) ---
		if (call.SVC_STATUS !== $Const.CALL_STATUS_ACCEPTED)
		{
			return $ERRS.ERR_TRACKING_CALL_NOT_ACTIVE;
		}

		// --- ACL: residents can only query their own calls ---
		if (this.$Session.userType === $Const.USER_TYPE_RESIDENT)
		{
			if (call.SVC_RES_USR_ID !== this.$Session.userId)
			{
				return $ERRS.ERR_TRACKING_CALL_NOT_FOUND;
			}
		}

		// --- ACL: officers can only query calls assigned to them ---
		if (this.$Session.userType === $Const.USER_TYPE_OFFICER)
		{
			if (call.SVC_OFC_USR_ID !== this.$Session.userId)
			{
				return $ERRS.ERR_TRACKING_CALL_NOT_FOUND;
			}
		}

		// --- call must have coordinates ---
		let callLat = call.SVC_LATITUDE ? Number(call.SVC_LATITUDE) : null;
		let callLng = call.SVC_LONGITUDE ? Number(call.SVC_LONGITUDE) : null;
		if (callLat === null || callLng === null)
		{
			return { ...$ERRS.ERR_SUCCESS, eta_available: false, reason: "call has no location coordinates" };
		}

		// --- officer must have a recent location ---
		let officerId = call.SVC_OFC_USR_ID;
		if (!officerId)
		{
			return { ...$ERRS.ERR_SUCCESS, eta_available: false, reason: "no officer assigned" };
		}
		let location = fetchLatestLocation(officerId);
		if (!location)
		{
			return { ...$ERRS.ERR_SUCCESS, eta_available: false, reason: "no officer location data" };
		}

		let officerLat = Number(location.GPL_LATITUDE);
		let officerLng = Number(location.GPL_LONGITUDE);

		// --- calculate distance and ETA ---
		// Emergency call response uses vehicular speed (~30 km/h) as the
		// default baseline.  Walking speed (~5 km/h) is provided as a
		// secondary estimate for foot-patrol scenarios.
		let distanceM = haversineDistanceM(officerLat, officerLng, callLat, callLng);
		let etaVehicularMin = Math.max(1, Math.round(distanceM / VEHICULAR_SPEED_M_PER_MIN));
		let etaWalkingMin = Math.max(1, Math.round(distanceM / WALKING_SPEED_M_PER_MIN));

		vals.eta_available = true;
		vals.distance_m = Math.round(distanceM);
		vals.eta_min = etaVehicularMin;
		vals.eta_walking_min = etaWalkingMin;
		vals.officer_latitude = officerLat;
		vals.officer_longitude = officerLng;
		vals.officer_last_update = location.GPL_CREATED_ON;
		vals.call_latitude = callLat;
		vals.call_longitude = callLng;
		vals.call_address = call.SVC_CURRENT_ADDRESS || null;

		return { ...$ERRS.ERR_SUCCESS, ...vals };
	}
};
