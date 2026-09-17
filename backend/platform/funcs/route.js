const TABLE_ROUTE_STATUS = "route_status";
const TABLE_WAYPOINT_PRIORITY = "waypoint_priority";

const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;
const DEFAULT_DWELL_TIME_MIN = 5;
const MAX_WAYPOINTS = 200;
const WALKING_SPEED_M_PER_MIN = 83; // ~5 km/h walking pace

// =========================================================================
// Helpers — record fetchers (no loops, no DB inside transactions)
// =========================================================================

function fetchRouteRecord(routeId)
{
	let rows = $Db.executeQuery(
		`SELECT PTR_ID, PTR_SFT_ID, PTR_OFC_USR_ID, PTR_COM_ID,
		        PTR_NAME, PTR_STATUS,
		        PTR_TOTAL_DISTANCE_M, PTR_TOTAL_DURATION_MIN,
		        PTR_PUSHED_ON, PTR_PUSHED_BY,
		        PTR_COMPLETED_ON,
		        PTR_CREATED_BY, PTR_CREATED_ON, PTR_LAST_UPDATE
		 FROM \`patrol_route\`
		 WHERE PTR_ID=? AND PTR_DELETED_ON IS NULL`,
		[routeId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchRouteByShiftAndOfficer(shiftId, officerId)
{
	let rows = $Db.executeQuery(
		`SELECT PTR_ID FROM \`patrol_route\`
		 WHERE PTR_SFT_ID=? AND PTR_OFC_USR_ID=? AND PTR_DELETED_ON IS NULL`,
		[shiftId, officerId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchShiftRecord(shiftId)
{
	let rows = $Db.executeQuery(
		`SELECT SFT_ID, SFT_COM_ID, SFT_STATUS,
		        CAST(SFT_DATE AS CHAR) SFT_DATE,
		        SFT_START_TIME, SFT_END_TIME
		 FROM \`shift\`
		 WHERE SFT_ID=? AND SFT_DELETED_ON IS NULL`,
		[shiftId]);
	return rows.length > 0 ? rows[0] : null;
}

function isOfficerAllocatedToShift(shiftId, officerId)
{
	let rows = $Db.executeQuery(
		`SELECT SFO_ID FROM \`shift_officer\`
		 WHERE SFO_SFT_ID=? AND SFO_OFC_USR_ID=? AND SFO_DELETED_ON IS NULL`,
		[shiftId, officerId]);
	return rows.length > 0;
}

function getActivePostsForCommunity(communityId)
{
	let rows = $Db.executeQuery(
		`SELECT PST_ID, PST_NAME, PST_PRIORITY, PST_LOCATION, PST_DESCRIPTION
		 FROM \`post\`
		 WHERE PST_COM_ID=? AND PST_IS_ACTIVE=1 AND PST_DELETED_ON IS NULL
		 ORDER BY PST_PRIORITY ASC, PST_ID ASC`,
		[communityId]);
	return rows;
}

function getShiftPostAssignmentsForOfficer(shiftId, officerId)
{
	let rows = $Db.executeQuery(
		`SELECT SHP_PST_ID, PST_NAME, PST_PRIORITY, PST_LOCATION, PST_DESCRIPTION
		 FROM \`shift_post\`
		 	JOIN \`post\` ON SHP_PST_ID = PST_ID AND PST_DELETED_ON IS NULL
		 WHERE SHP_SFT_ID=? AND SHP_OFC_USR_ID=? AND SHP_DELETED_ON IS NULL`,
		[shiftId, officerId]);
	return rows;
}

function fetchRouteWaypoints(routeId)
{
	let rows = $Db.executeQuery(
		`SELECT PTW_ID, PTW_PTR_ID, PTW_ORDER, PTW_PST_ID,
		        PTW_NAME, PTW_LAT, PTW_LNG,
		        PTW_ETA_FROM_PREV_MIN, PTW_DWELL_TIME_MIN,
		        PTW_PRIORITY, PTW_NOTES,
		        PTW_CREATED_ON
		 FROM \`patrol_waypoint\`
		 WHERE PTW_PTR_ID=? AND PTW_DELETED_ON IS NULL
		 ORDER BY PTW_ORDER ASC`,
		[routeId]);
	return rows;
}

function fetchWaypointRecord(waypointId)
{
	let rows = $Db.executeQuery(
		`SELECT PTW_ID, PTW_PTR_ID, PTW_ORDER, PTW_PST_ID,
		        PTW_NAME, PTW_LAT, PTW_LNG,
		        PTW_DWELL_TIME_MIN, PTW_PRIORITY, PTW_NOTES
		 FROM \`patrol_waypoint\`
		 WHERE PTW_ID=? AND PTW_DELETED_ON IS NULL`,
		[waypointId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchWaypointVisits(routeId)
{
	let rows = $Db.executeQuery(
		`SELECT WPV_ID, WPV_PTW_ID, WPV_PTR_ID, WPV_OFC_USR_ID,
		        WPV_VISITED_ON, WPV_VISIT_LAT, WPV_VISIT_LNG,
		        WPV_DEVIATION_M, WPV_IS_MANUAL
		 FROM \`waypoint_visit\`
		 WHERE WPV_PTR_ID=?`,
		[routeId]);
	return rows;
}

function isWaypointVisited(waypointId)
{
	let rows = $Db.executeQuery(
		`SELECT WPV_ID FROM \`waypoint_visit\` WHERE WPV_PTW_ID=?`,
		[waypointId]);
	return rows.length > 0;
}

// =========================================================================
// Helpers — Nearest-Neighbor TSP ordering
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

/**
 * Nearest-Neighbor TSP heuristic.
 * Orders waypoints by visiting the closest unvisited neighbour at each step.
 * Assigned (mandatory) waypoints are ordered first, then optional waypoints are
 * appended using the same nearest-neighbour logic continuing from where the
 * mandatory chain ends.
 *
 * @param {Array} waypoints  - Array of {lat, lng, is_assigned, ...} objects
 * @returns {Array}          - Same objects in optimised visit order
 */
function orderWaypointsByNearestNeighbour(waypoints)
{
	if (waypoints.length <= 2)
	{
		return waypoints;
	}

	let assigned = [];
	let optional = [];
	for (let i = 0; i < waypoints.length; i++)
	{
		if (waypoints[i].is_assigned)
		{
			assigned.push(waypoints[i]);
		}
		else
		{
			optional.push(waypoints[i]);
		}
	}

	// Apply NN ordering to assigned waypoints
	let orderedAssigned = nnSort(assigned);

	// Continue NN chain for optional waypoints, starting from last assigned waypoint
	let orderedOptional = [];
	if (optional.length > 0)
	{
		let startLat, startLng;
		if (orderedAssigned.length > 0)
		{
			let last = orderedAssigned[orderedAssigned.length - 1];
			startLat = last.lat;
			startLng = last.lng;
		}
		else
		{
			startLat = optional[0].lat;
			startLng = optional[0].lng;
		}
		orderedOptional = nnSortFrom(optional, startLat, startLng);
	}

	return orderedAssigned.concat(orderedOptional);
}

function nnSort(points)
{
	if (points.length <= 1)
	{
		return points.slice();
	}
	// Start from first point
	return nnSortFrom(points, points[0].lat, points[0].lng);
}

function nnSortFrom(points, startLat, startLng)
{
	let remaining = points.slice();
	let result = [];
	let curLat = startLat;
	let curLng = startLng;

	while (remaining.length > 0)
	{
		let bestIdx = 0;
		let bestDist = haversineDistanceM(curLat, curLng, remaining[0].lat, remaining[0].lng);

		for (let i = 1; i < remaining.length; i++)
		{
			let d = haversineDistanceM(curLat, curLng, remaining[i].lat, remaining[i].lng);
			if (d < bestDist)
			{
				bestDist = d;
				bestIdx = i;
			}
		}

		let chosen = remaining.splice(bestIdx, 1)[0];
		result.push(chosen);
		curLat = chosen.lat;
		curLng = chosen.lng;
	}

	return result;
}

// =========================================================================
// Helpers — total route distance
// =========================================================================

function calculateTotalDistanceM(orderedWaypoints)
{
	let total = 0;
	for (let i = 1; i < orderedWaypoints.length; i++)
	{
		total += haversineDistanceM(
			orderedWaypoints[i - 1].lat, orderedWaypoints[i - 1].lng,
			orderedWaypoints[i].lat, orderedWaypoints[i].lng);
	}
	return Math.round(total);
}

// =========================================================================
// Helpers — validation
// =========================================================================

function isValidLat(lat)
{
	return typeof lat === "number" && lat >= -90 && lat <= 90;
}

function isValidLng(lng)
{
	return typeof lng === "number" && lng >= -180 && lng <= 180;
}

function calculateDeviationMetres(lat1, lng1, lat2, lng2)
{
	return Math.round(haversineDistanceM(lat1, lng1, lat2, lng2));
}

// =========================================================================
// Helpers — mapping
// =========================================================================

function mapRouteRow(row)
{
	return {
		route_id: row.PTR_ID,
		shift_id: row.PTR_SFT_ID,
		officer_id: row.PTR_OFC_USR_ID,
		community_id: row.PTR_COM_ID,
		name: row.PTR_NAME || null,
		status: row.PTR_STATUS,
		total_distance_m: row.PTR_TOTAL_DISTANCE_M || null,
		total_duration_min: row.PTR_TOTAL_DURATION_MIN || null,
		pushed_on: row.PTR_PUSHED_ON || null,
		pushed_by: row.PTR_PUSHED_BY || null,
		completed_on: row.PTR_COMPLETED_ON || null,
		created_by: row.PTR_CREATED_BY,
		created_on: row.PTR_CREATED_ON,
		last_update: row.PTR_LAST_UPDATE || null,
	};
}

function mapWaypointRow(row)
{
	return {
		waypoint_id: row.PTW_ID,
		order: row.PTW_ORDER,
		post_id: row.PTW_PST_ID || null,
		name: row.PTW_NAME,
		lat: parseFloat(row.PTW_LAT),
		lng: parseFloat(row.PTW_LNG),
		eta_from_prev_min: row.PTW_ETA_FROM_PREV_MIN || null,
		dwell_time_min: row.PTW_DWELL_TIME_MIN,
		priority: row.PTW_PRIORITY,
		notes: row.PTW_NOTES || null,
	};
}

function mapVisitRow(row)
{
	return {
		visit_id: row.WPV_ID,
		waypoint_id: row.WPV_PTW_ID,
		officer_id: row.WPV_OFC_USR_ID,
		visited_on: row.WPV_VISITED_ON,
		visit_lat: row.WPV_VISIT_LAT != null ? parseFloat(row.WPV_VISIT_LAT) : null,
		visit_lng: row.WPV_VISIT_LNG != null ? parseFloat(row.WPV_VISIT_LNG) : null,
		deviation_m: row.WPV_DEVIATION_M || null,
		is_manual: row.WPV_IS_MANUAL === 1,
	};
}

// =========================================================================
// Helpers — post location parsing
// =========================================================================

function extractPostCoordinates(post)
{
	// PST_LOCATION is a JSON column: {lat:..., lng:..., ...} or {center:{lat,lng}, radius:...}
	let loc = post.PST_LOCATION;
	if (!loc) return null;

	if (typeof loc === "string")
	{
		try { loc = JSON.parse(loc); }
		catch (e)
		{
			return null;
		}
	}

	if (loc.lat != null && loc.lng != null)
	{
		return {lat: parseFloat(loc.lat), lng: parseFloat(loc.lng)};
	}
	if (loc.center && loc.center.lat != null && loc.center.lng != null)
	{
		return {lat: parseFloat(loc.center.lat), lng: parseFloat(loc.center.lng)};
	}
	// Line shape — use first point
	if (loc.points && loc.points.length > 0 && loc.points[0].lat != null)
	{
		return {lat: parseFloat(loc.points[0].lat), lng: parseFloat(loc.points[0].lng)};
	}
	return null;
}

// =========================================================================
// Helpers — notifications
// =========================================================================

function sendRouteNotification(session, type, route, templateVars, targetUserIds, communityId)
{
	if (!targetUserIds || targetUserIds.length === 0)
	{
		return;
	}

	let uniqueIds = [...new Set(targetUserIds)];
	if (uniqueIds.length === 0)
	{
		return;
	}

	$executeAPI(session, "Notification/create_bulk_notifications", {
		target_user_ids: uniqueIds,
		type: type,
		template_vars: JSON.stringify(templateVars),
		payload: JSON.stringify({entity_type: "route", entity_id: route.PTR_ID}),
		community_id: communityId || route.PTR_COM_ID,
	});
}


// =========================================================================
// Module class
// =========================================================================

module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
		$DataItems.define(TABLE_ROUTE_STATUS);
		$DataItems.define(TABLE_WAYPOINT_PRIORITY);
	}

	// =========================================================================
	// Generate Route
	// =========================================================================

	generate_route()
	{
		let userId = this.$Session.userId;

		// Validate shift
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_ROUTE_SHIFT_NOT_FOUND;
		}

		// Community access check for non-super admins
		if (!$Funcs.isUserSuperAdmin(this.$Session))
		{
			let adminComId = $Funcs.getAdminCommunityId(userId);
			if (adminComId && adminComId !== shift.SFT_COM_ID)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
		}

		// Validate officer is allocated to the shift
		if (!isOfficerAllocatedToShift(this.$shift_id, this.$officer_id))
		{
			return $ERRS.ERR_ROUTE_OFFICER_NOT_ALLOCATED;
		}

		// Check for duplicate route
		let existing = fetchRouteByShiftAndOfficer(this.$shift_id, this.$officer_id);
		if (existing)
		{
			return $ERRS.ERR_ROUTE_DUPLICATE;
		}

		// Gather waypoint sources:
		// 1. Posts assigned to this officer in this shift (mandatory waypoints)
		// 2. Other active posts in the community (optional waypoints)
		let assignedPosts = getShiftPostAssignmentsForOfficer(this.$shift_id, this.$officer_id);
		let allPosts = getActivePostsForCommunity(shift.SFT_COM_ID);

		// Build waypoint list — assigned posts first, then remaining community posts
		let assignedPostIds = new Set(assignedPosts.map(p => p.SHP_PST_ID));
		let waypointSources = [];

		// Add assigned posts first (mandatory)
		for (let i = 0; i < assignedPosts.length; i++)
		{
			let p = assignedPosts[i];
			let coords = extractPostCoordinates(p);
			if (coords)
			{
				waypointSources.push({
					post_id: p.SHP_PST_ID,
					name: p.PST_NAME,
					lat: coords.lat,
					lng: coords.lng,
					priority: p.PST_PRIORITY || $Const.WAYPOINT_PRIORITY_NORMAL,
					notes: p.PST_DESCRIPTION || null,
					is_assigned: true,
				});
			}
		}

		// Add remaining community posts
		for (let i = 0; i < allPosts.length; i++)
		{
			let p = allPosts[i];
			if (assignedPostIds.has(p.PST_ID)) continue;
			let coords = extractPostCoordinates(p);
			if (coords)
			{
				waypointSources.push({
					post_id: p.PST_ID,
					name: p.PST_NAME,
					lat: coords.lat,
					lng: coords.lng,
					priority: p.PST_PRIORITY || $Const.WAYPOINT_PRIORITY_NORMAL,
					notes: p.PST_DESCRIPTION || null,
					is_assigned: false,
				});
			}
		}

		if (waypointSources.length === 0)
		{
			return $ERRS.ERR_ROUTE_NO_POSTS_AVAILABLE;
		}

		// Optimise waypoint ordering using Nearest-Neighbour TSP heuristic
		let orderedWaypoints = orderWaypointsByNearestNeighbour(waypointSources);

		// Calculate total route distance (straight-line via Haversine)
		let totalDistanceM = calculateTotalDistanceM(orderedWaypoints);

		// Generate route name
		let routeName = "Patrol Route - " + shift.SFT_DATE;

		let now = $Utils.now();

		// Calculate total estimated duration: dwell time + rough travel estimate (walking ~5 km/h)
		let totalDwellMin = orderedWaypoints.length * DEFAULT_DWELL_TIME_MIN;
		let travelMin = Math.round(totalDistanceM / WALKING_SPEED_M_PER_MIN);
		let totalDurationMin = totalDwellMin + travelMin;

		$Db.beginTransaction();

		// Insert patrol_route
		$Db.executeQuery(
			`INSERT INTO \`patrol_route\`
			 (PTR_SFT_ID, PTR_OFC_USR_ID, PTR_COM_ID, PTR_NAME, PTR_STATUS,
			  PTR_TOTAL_DISTANCE_M, PTR_TOTAL_DURATION_MIN,
			  PTR_CREATED_BY, PTR_CREATED_ON)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[this.$shift_id, this.$officer_id, shift.SFT_COM_ID, routeName,
			 $Const.ROUTE_STATUS_DRAFT, totalDistanceM, totalDurationMin, userId, now]);
		if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg()); }

		let routeId = $Db.insertId();

		// Bulk insert waypoints with per-leg ETA
		let wpValues = [];
		let wpParams = [];
		for (let i = 0; i < orderedWaypoints.length; i++)
		{
			let wp = orderedWaypoints[i];
			let order = i + 1;
			let etaFromPrev = null;
			if (i > 0)
			{
				let prev = orderedWaypoints[i - 1];
				let legM = haversineDistanceM(prev.lat, prev.lng, wp.lat, wp.lng);
				etaFromPrev = Math.max(1, Math.round(legM / WALKING_SPEED_M_PER_MIN));
			}
			wpValues.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
			wpParams.push(routeId, order, wp.post_id, wp.name,
				wp.lat, wp.lng, etaFromPrev, DEFAULT_DWELL_TIME_MIN, wp.priority,
				wp.notes, now);
		}

		$Db.executeQuery(
			`INSERT INTO \`patrol_waypoint\`
			 (PTW_PTR_ID, PTW_ORDER, PTW_PST_ID, PTW_NAME,
			  PTW_LAT, PTW_LNG, PTW_ETA_FROM_PREV_MIN, PTW_DWELL_TIME_MIN,
			  PTW_PRIORITY, PTW_NOTES, PTW_CREATED_ON)
			 VALUES ${wpValues.join(", ")}`,
			wpParams);
		if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg()); }

		$Db.commitTransaction();

		// Fetch the created route
		let route = fetchRouteRecord(routeId);
		let waypoints = fetchRouteWaypoints(routeId);

		let mapped = mapRouteRow(route);
		mapped.waypoints = waypoints.map(mapWaypointRow);

		return {...$ERRS.ERR_SUCCESS, route: mapped};
	}

	// =========================================================================
	// Get Route
	// =========================================================================

	get_route()
	{
		let userType = this.$Session.userType;
		let userId = this.$Session.userId;

		let route = fetchRouteRecord(this.$route_id);
		if (!route)
		{
			return $ERRS.ERR_ROUTE_NOT_FOUND;
		}

		// Officers can only see routes assigned to them
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			if (route.PTR_OFC_USR_ID !== userId)
			{
				return $ERRS.ERR_ROUTE_NOT_FOUND;
			}
			// Officers can only see pushed (active) or completed routes
			if (route.PTR_STATUS === $Const.ROUTE_STATUS_DRAFT)
			{
				return $ERRS.ERR_ROUTE_NOT_FOUND;
			}
		}
		else
		{
			// Admin community access check
			if (!$Funcs.isUserSuperAdmin(this.$Session))
			{
				let adminComId = $Funcs.getAdminCommunityId(userId);
				if (adminComId && adminComId !== route.PTR_COM_ID)
				{
					return $ERRS.ERR_NO_PRIVILEGES;
				}
			}
		}

		// Fetch waypoints and visits
		let waypoints = fetchRouteWaypoints(this.$route_id);
		let visits = fetchWaypointVisits(this.$route_id);

		// Build visit map by waypoint ID
		let visitMap = {};
		for (let i = 0; i < visits.length; i++)
		{
			visitMap[visits[i].WPV_PTW_ID] = mapVisitRow(visits[i]);
		}

		let mapped = mapRouteRow(route);

		// Enrich with shift date and community name
		let shift = fetchShiftRecord(route.PTR_SFT_ID);
		mapped.shift_date = shift ? shift.SFT_DATE : null;

		let comRows = $Db.executeQuery(
			`SELECT COM_NAME FROM \`community\` WHERE COM_ID=?`,
			[route.PTR_COM_ID]);
		mapped.community_name = comRows.length > 0 ? comRows[0].COM_NAME : null;

		// Officer name
		mapped.officer_name = $Funcs.getUserName(route.PTR_OFC_USR_ID);

		mapped.waypoints = waypoints.map(wp =>
		{
			let wpMapped = mapWaypointRow(wp);
			wpMapped.visit = visitMap[wp.PTW_ID] || null;
			return wpMapped;
		});

		return {...$ERRS.ERR_SUCCESS, route: mapped};
	}

	// =========================================================================
	// Update Route
	// =========================================================================

	update_route()
	{
		let userId = this.$Session.userId;

		let route = fetchRouteRecord(this.$route_id);
		if (!route)
		{
			return $ERRS.ERR_ROUTE_NOT_FOUND;
		}

		// Only draft routes can have their waypoints replaced
		if (route.PTR_STATUS !== $Const.ROUTE_STATUS_DRAFT)
		{
			return $ERRS.ERR_ROUTE_CANNOT_UPDATE;
		}

		// Community access check
		if (!$Funcs.isUserSuperAdmin(this.$Session))
		{
			let adminComId = $Funcs.getAdminCommunityId(userId);
			if (adminComId && adminComId !== route.PTR_COM_ID)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
		}

		// Parse waypoints
		let waypoints;
		try
		{
			waypoints = typeof this.$waypoints === "string" ? JSON.parse(this.$waypoints) : this.$waypoints;
		}
		catch (e)
		{
			return $ERRS.ERR_ROUTE_INVALID_WAYPOINTS;
		}

		if (!Array.isArray(waypoints) || waypoints.length === 0)
		{
			return $ERRS.ERR_ROUTE_INVALID_WAYPOINTS;
		}

		if (waypoints.length > MAX_WAYPOINTS)
		{
			return $ERRS.ERR_ROUTE_INVALID_WAYPOINTS;
		}

		// Validate all waypoints before transaction
		for (let i = 0; i < waypoints.length; i++)
		{
			let wp = waypoints[i];
			if (!wp.name || typeof wp.name !== "string")
			{
				return $ERRS.ERR_ROUTE_INVALID_WAYPOINTS;
			}
			if (!isValidLat(wp.lat) || !isValidLng(wp.lng))
			{
				return $ERRS.ERR_ROUTE_INVALID_COORDINATES;
			}
			if (wp.priority && !$DataItems.isValidItemId(wp.priority, TABLE_WAYPOINT_PRIORITY))
			{
				return $ERRS.ERR_ROUTE_INVALID_WAYPOINTS;
			}
		}

		let now = $Utils.now();

		// Update route name if provided
		let routeName = route.PTR_NAME;
		if (this.$name !== undefined && this.$name !== null)
		{
			routeName = this.$name.substring(0, MAX_NAME_LENGTH);
		}

		$Db.beginTransaction();

		// Soft-delete existing waypoints
		$Db.executeQuery(
			`UPDATE \`patrol_waypoint\` SET PTW_DELETED_ON=?
			 WHERE PTW_PTR_ID=? AND PTW_DELETED_ON IS NULL`,
			[now, this.$route_id]);
		if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg()); }

		// Insert new waypoints in bulk
		let totalDwellMin = 0;
		let wpValues = [];
		let wpParams = [];

		for (let i = 0; i < waypoints.length; i++)
		{
			let wp = waypoints[i];
			let order = i + 1;
			let dwellTime = (wp.dwell_time_min != null && wp.dwell_time_min > 0)
				? wp.dwell_time_min : DEFAULT_DWELL_TIME_MIN;
			let priority = wp.priority || $Const.WAYPOINT_PRIORITY_NORMAL;
			let notes = wp.notes ? wp.notes.substring(0, MAX_NOTES_LENGTH) : null;
			let postId = wp.post_id || null;
			let etaFromPrev = wp.eta_from_prev_min || null;

			totalDwellMin += dwellTime;

			wpValues.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
			wpParams.push(this.$route_id, order, postId, wp.name.substring(0, MAX_NAME_LENGTH),
				wp.lat, wp.lng, etaFromPrev, dwellTime, priority, notes, now);
		}

		$Db.executeQuery(
			`INSERT INTO \`patrol_waypoint\`
			 (PTW_PTR_ID, PTW_ORDER, PTW_PST_ID, PTW_NAME,
			  PTW_LAT, PTW_LNG, PTW_ETA_FROM_PREV_MIN, PTW_DWELL_TIME_MIN,
			  PTW_PRIORITY, PTW_NOTES, PTW_CREATED_ON)
			 VALUES ${wpValues.join(", ")}`,
			wpParams);
		if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg()); }

		// Update route metadata
		$Db.executeQuery(
			`UPDATE \`patrol_route\`
			 SET PTR_NAME=?, PTR_TOTAL_DURATION_MIN=?, PTR_LAST_UPDATE=?
			 WHERE PTR_ID=?`,
			[routeName, totalDwellMin, now, this.$route_id]);
		if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg()); }

		$Db.commitTransaction();

		// Fetch updated route
		let updatedRoute = fetchRouteRecord(this.$route_id);
		let updatedWaypoints = fetchRouteWaypoints(this.$route_id);

		let mapped = mapRouteRow(updatedRoute);
		mapped.waypoints = updatedWaypoints.map(mapWaypointRow);

		return {...$ERRS.ERR_SUCCESS, route: mapped};
	}

	// =========================================================================
	// Push Route
	// =========================================================================

	push_route()
	{
		let userId = this.$Session.userId;

		let route = fetchRouteRecord(this.$route_id);
		if (!route)
		{
			return $ERRS.ERR_ROUTE_NOT_FOUND;
		}

		// Only draft routes can be pushed
		if (route.PTR_STATUS !== $Const.ROUTE_STATUS_DRAFT)
		{
			if (route.PTR_STATUS === $Const.ROUTE_STATUS_ACTIVE)
			{
				return $ERRS.ERR_ROUTE_ALREADY_PUSHED;
			}
			return $ERRS.ERR_ROUTE_INVALID_STATUS;
		}

		// Community access check
		if (!$Funcs.isUserSuperAdmin(this.$Session))
		{
			let adminComId = $Funcs.getAdminCommunityId(userId);
			if (adminComId && adminComId !== route.PTR_COM_ID)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
		}

		// Ensure route has waypoints
		let waypoints = fetchRouteWaypoints(this.$route_id);
		if (waypoints.length === 0)
		{
			return $ERRS.ERR_ROUTE_INVALID_WAYPOINTS;
		}

		let now = $Utils.now();

		$Db.executeQuery(
			`UPDATE \`patrol_route\`
			 SET PTR_STATUS=?, PTR_PUSHED_ON=?, PTR_PUSHED_BY=?, PTR_LAST_UPDATE=?
			 WHERE PTR_ID=?`,
			[$Const.ROUTE_STATUS_ACTIVE, now, userId, now, this.$route_id]);
		if ($Db.isError()) return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());

		// Fetch shift date for notification
		let shift = fetchShiftRecord(route.PTR_SFT_ID);
		let shiftDate = shift ? shift.SFT_DATE : "";

		// Send push notification to officer
		sendRouteNotification(this.$Session, "route_pushed", route, {
			route_name: route.PTR_NAME || "Patrol Route",
			shift_date: shiftDate,
		}, [route.PTR_OFC_USR_ID], route.PTR_COM_ID);

		return {...$ERRS.ERR_SUCCESS};
	}

	// =========================================================================
	// Visit Waypoint
	// =========================================================================

	visit_waypoint()
	{
		let userId = this.$Session.userId;

		let waypoint = fetchWaypointRecord(this.$waypoint_id);
		if (!waypoint)
		{
			return $ERRS.ERR_WAYPOINT_NOT_FOUND;
		}

		// Fetch route to verify ownership
		let route = fetchRouteRecord(waypoint.PTW_PTR_ID);
		if (!route)
		{
			return $ERRS.ERR_ROUTE_NOT_FOUND;
		}

		// Officer must be the assigned officer
		if (route.PTR_OFC_USR_ID !== userId)
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}

		// Route must be active (pushed)
		if (route.PTR_STATUS !== $Const.ROUTE_STATUS_ACTIVE)
		{
			return $ERRS.ERR_ROUTE_NOT_PUSHED;
		}

		// Check if waypoint already visited
		if (isWaypointVisited(this.$waypoint_id))
		{
			return $ERRS.ERR_WAYPOINT_ALREADY_VISITED;
		}

		// Calculate deviation if GPS coordinates provided
		let visitLat = (this.$lat && this.$lat !== 0) ? this.$lat : null;
		let visitLng = (this.$lng && this.$lng !== 0) ? this.$lng : null;
		let deviationM = null;

		if (visitLat != null && visitLng != null)
		{
			deviationM = calculateDeviationMetres(
				parseFloat(waypoint.PTW_LAT), parseFloat(waypoint.PTW_LNG),
				visitLat, visitLng);
		}

		let isManual = this.$is_manual ? 1 : 0;
		let now = $Utils.now();

		// Fetch all data before transaction (no SELECTs inside transactions)
		let totalWaypoints = fetchRouteWaypoints(route.PTR_ID);
		let totalVisits = fetchWaypointVisits(route.PTR_ID);

		// Pre-calculate whether all waypoints will be visited after this insert
		let visitedWaypointIds = new Set(totalVisits.map(v => v.WPV_PTW_ID));
		visitedWaypointIds.add(this.$waypoint_id);

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`waypoint_visit\`
			 (WPV_PTW_ID, WPV_PTR_ID, WPV_OFC_USR_ID,
			  WPV_VISITED_ON, WPV_VISIT_LAT, WPV_VISIT_LNG,
			  WPV_DEVIATION_M, WPV_IS_MANUAL, WPV_CREATED_ON)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[this.$waypoint_id, route.PTR_ID, userId,
			 now, visitLat, visitLng,
			 deviationM, isManual, now]);
		if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg()); }

		let allVisited = true;
		for (let i = 0; i < totalWaypoints.length; i++)
		{
			if (!visitedWaypointIds.has(totalWaypoints[i].PTW_ID))
			{
				allVisited = false;
				break;
			}
		}

		if (allVisited)
		{
			$Db.executeQuery(
				`UPDATE \`patrol_route\`
				 SET PTR_STATUS=?, PTR_COMPLETED_ON=?, PTR_LAST_UPDATE=?
				 WHERE PTR_ID=?`,
				[$Const.ROUTE_STATUS_COMPLETED, now, now, route.PTR_ID]);
			if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg()); }
		}

		$Db.commitTransaction();

		return {
			...$ERRS.ERR_SUCCESS,
			visit: {
				waypoint_id: this.$waypoint_id,
				visited_on: now,
				deviation_m: deviationM,
				is_manual: isManual === 1,
				route_completed: allVisited,
			},
		};
	}

	// =========================================================================
	// Get Route Compliance
	// =========================================================================

	get_route_compliance()
	{
		let userId = this.$Session.userId;

		let route = fetchRouteRecord(this.$route_id);
		if (!route)
		{
			return $ERRS.ERR_ROUTE_NOT_FOUND;
		}

		// Community access check
		if (!$Funcs.isUserSuperAdmin(this.$Session))
		{
			let adminComId = $Funcs.getAdminCommunityId(userId);
			if (adminComId && adminComId !== route.PTR_COM_ID)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
		}

		let waypoints = fetchRouteWaypoints(this.$route_id);
		let visits = fetchWaypointVisits(this.$route_id);

		// Build visit map
		let visitMap = {};
		for (let i = 0; i < visits.length; i++)
		{
			visitMap[visits[i].WPV_PTW_ID] = visits[i];
		}

		let totalWaypoints = waypoints.length;
		let visitedCount = 0;
		let totalPlannedDwellMin = 0;
		let totalDeviationM = 0;
		let deviationCount = 0;
		let manualVisitCount = 0;

		let waypointDetails = [];

		for (let i = 0; i < waypoints.length; i++)
		{
			let wp = waypoints[i];
			let visit = visitMap[wp.PTW_ID] || null;

			totalPlannedDwellMin += wp.PTW_DWELL_TIME_MIN;

			let detail = {
				waypoint_id: wp.PTW_ID,
				order: wp.PTW_ORDER,
				name: wp.PTW_NAME,
				priority: wp.PTW_PRIORITY,
				planned_dwell_min: wp.PTW_DWELL_TIME_MIN,
				visited: visit != null,
				visited_on: visit ? visit.WPV_VISITED_ON : null,
				deviation_m: visit ? visit.WPV_DEVIATION_M : null,
				is_manual: visit ? (visit.WPV_IS_MANUAL === 1) : false,
			};

			if (visit)
			{
				visitedCount++;
				if (visit.WPV_DEVIATION_M != null)
				{
					totalDeviationM += visit.WPV_DEVIATION_M;
					deviationCount++;
				}
				if (visit.WPV_IS_MANUAL === 1)
				{
					manualVisitCount++;
				}
			}

			waypointDetails.push(detail);
		}

		let compliancePercent = totalWaypoints > 0
			? Math.round((visitedCount / totalWaypoints) * 100)
			: 0;

		let avgDeviationM = deviationCount > 0
			? Math.round(totalDeviationM / deviationCount)
			: null;

		// Fetch officer name and shift info
		let officerName = $Funcs.getUserName(route.PTR_OFC_USR_ID);
		let shift = fetchShiftRecord(route.PTR_SFT_ID);

		return {
			...$ERRS.ERR_SUCCESS,
			compliance: {
				route_id: route.PTR_ID,
				route_name: route.PTR_NAME,
				officer_id: route.PTR_OFC_USR_ID,
				officer_name: officerName,
				shift_id: route.PTR_SFT_ID,
				shift_date: shift ? shift.SFT_DATE : null,
				route_status: route.PTR_STATUS,
				total_waypoints: totalWaypoints,
				visited_count: visitedCount,
				compliance_percent: compliancePercent,
				total_planned_dwell_min: totalPlannedDwellMin,
				avg_deviation_m: avgDeviationM,
				manual_visit_count: manualVisitCount,
				waypoints: waypointDetails,
			},
		};
	}
};
