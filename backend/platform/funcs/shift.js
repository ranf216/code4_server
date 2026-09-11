const TABLE_SHIFT_STATUS = "shift_status";
const TABLE_RECURRENCE_PATTERN = "shift_recurrence_pattern";
const TABLE_RECURRENCE_END_TYPE = "shift_recurrence_end_type";
const TABLE_UPDATE_SCOPE = "shift_update_scope";

const MAX_NOTES_LENGTH = 500;
const MAX_OCCURRENCES = 365;
const ROLLING_HORIZON_DAYS = 90;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// =========================================================================
// Helpers — record fetchers (no loops, no DB inside transactions)
// =========================================================================

function fetchShiftRecord(shiftId)
{
	let rows = $Db.executeQuery(
		`SELECT SFT_ID, SFT_COM_ID, SFT_SERIES_ID,
		        CAST(SFT_DATE AS CHAR) AS SFT_DATE,
		        SFT_START_TIME, SFT_END_TIME,
		        SFT_IS_OVERNIGHT, SFT_STATUS, SFT_NOTES,
		        SFT_PUBLISHED_ON, SFT_PUBLISHED_BY, SFT_CANCELLED_ON, SFT_CANCELLED_BY,
		        SFT_CREATED_BY, SFT_CREATED_ON, SFT_LAST_UPDATE
		 FROM \`shift\`
		 WHERE SFT_ID=? AND SFT_DELETED_ON IS NULL`,
		[shiftId]);
	return rows.length > 0 ? rows[0] : null;
}

function communityExists(communityId)
{
	let rows = $Db.executeQuery(
		`SELECT COM_ID FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
		[communityId]);
	return rows.length > 0;
}

function getOfficerCommunityId(userId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_COM_ID FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
		[userId]);
	return rows.length > 0 ? rows[0].USD_COM_ID : null;
}

function isActiveOfficerInCommunity(officerId, communityId)
{
	let rows = $Db.executeQuery(
		`SELECT u.USR_ID
		 FROM \`user\` u
		    JOIN \`user_details\` ud ON u.USR_ID = ud.USD_USR_ID
		 WHERE u.USR_ID=? AND u.USR_TYPE=? AND u.USR_STATUS=1
		   AND ud.USD_COM_ID=? AND ud.USD_DELETED_ON IS NULL`,
		[officerId, $Const.USER_TYPE_OFFICER, communityId]);
	return rows.length > 0;
}

function validateOfficersBatch(officerIds, communityId)
{
	if (!officerIds || officerIds.length === 0) return [];
	let placeholders = officerIds.map(() => "?").join(",");
	let rows = $Db.executeQuery(
		`SELECT u.USR_ID
		 FROM \`user\` u
		    JOIN \`user_details\` ud ON u.USR_ID = ud.USD_USR_ID
		 WHERE u.USR_ID IN (${placeholders}) AND u.USR_TYPE=? AND u.USR_STATUS=1
		   AND ud.USD_COM_ID=? AND ud.USD_DELETED_ON IS NULL`,
		[...officerIds, $Const.USER_TYPE_OFFICER, communityId]);
	let validSet = new Set(rows.map(r => r.USR_ID));
	let invalid = officerIds.filter(id => !validSet.has(id));
	return invalid;
}

function getShiftOfficerIds(shiftId)
{
	let rows = $Db.executeQuery(
		`SELECT SFO_OFC_USR_ID FROM \`shift_officer\`
		 WHERE SFO_SFT_ID=? AND SFO_DELETED_ON IS NULL`,
		[shiftId]);
	return rows.map(r => r.SFO_OFC_USR_ID);
}

function getShiftPostAssignments(shiftId)
{
	let rows = $Db.executeQuery(
		`SELECT sp.SHP_ID, sp.SHP_OFC_USR_ID, sp.SHP_PST_ID, p.PST_NAME
		 FROM \`shift_post\` sp
		    JOIN \`post\` p ON sp.SHP_PST_ID = p.PST_ID AND p.PST_DELETED_ON IS NULL
		 WHERE sp.SHP_SFT_ID=? AND sp.SHP_DELETED_ON IS NULL`,
		[shiftId]);
	return rows;
}

function getShiftCheckins(shiftId)
{
	let rows = $Db.executeQuery(
		`SELECT SFC_ID, SFC_OFC_USR_ID, SFC_CHECK_IN_ON, SFC_CHECK_OUT_ON, SFC_TOTAL_HOURS
		 FROM \`shift_checkin\`
		 WHERE SFC_SFT_ID=?`,
		[shiftId]);
	return rows;
}

function isOfficerAllocated(shiftId, officerId)
{
	let rows = $Db.executeQuery(
		`SELECT SFO_ID FROM \`shift_officer\`
		 WHERE SFO_SFT_ID=? AND SFO_OFC_USR_ID=? AND SFO_DELETED_ON IS NULL`,
		[shiftId, officerId]);
	return rows.length > 0;
}

function getOpenCheckin(shiftId, officerId)
{
	let rows = $Db.executeQuery(
		`SELECT SFC_ID, SFC_CHECK_IN_ON FROM \`shift_checkin\`
		 WHERE SFC_SFT_ID=? AND SFC_OFC_USR_ID=? AND SFC_CHECK_OUT_ON IS NULL`,
		[shiftId, officerId]);
	return rows.length > 0 ? rows[0] : null;
}

function hasActiveCheckinOnOtherShift(officerId, excludeShiftId)
{
	let rows = $Db.executeQuery(
		`SELECT ci.SFC_SFT_ID FROM \`shift_checkin\` ci
		    JOIN \`shift\` s ON ci.SFC_SFT_ID = s.SFT_ID
		 WHERE ci.SFC_OFC_USR_ID=? AND ci.SFC_CHECK_OUT_ON IS NULL
		   AND ci.SFC_SFT_ID != ? AND s.SFT_DELETED_ON IS NULL`,
		[officerId, excludeShiftId]);
	return rows.length > 0;
}

function getAdminCommunityId(userId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_COM_ID FROM \`user_details\`
		 WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
		[userId]);
	return (rows.length > 0 && rows[0].USD_COM_ID) ? rows[0].USD_COM_ID : null;
}

function isUserSuperAdmin(session)
{
	return session.isCurrentUserHasRole($Const.USER_ROLE_SUPER_ADMIN);
}

function postExistsAndActive(postId, communityId)
{
	let rows = $Db.executeQuery(
		`SELECT PST_ID FROM \`post\`
		 WHERE PST_ID=? AND PST_COM_ID=? AND PST_IS_ACTIVE=1 AND PST_DELETED_ON IS NULL`,
		[postId, communityId]);
	return rows.length > 0;
}

// =========================================================================
// Helpers — validation
// =========================================================================

function isValidTimeStr(str)
{
	return TIME_REGEX.test(str);
}

function isOvernight(startTime, endTime)
{
	return endTime <= startTime;
}

function validateTimeRange(startTime, endTime)
{
	if (!isValidTimeStr(startTime) || !isValidTimeStr(endTime))
	{
		return false;
	}
	// Identical start/end is invalid
	if (startTime === endTime)
	{
		return false;
	}
	return true;
}

// =========================================================================
// Helpers — mapping
// =========================================================================

function mapShiftRow(row)
{
	return {
		shift_id: row.SFT_ID,
		community_id: row.SFT_COM_ID,
		community_name: row.COM_NAME || null,
		series_id: row.SFT_SERIES_ID || null,
		shift_date: row.SFT_DATE,
		start_time: row.SFT_START_TIME,
		end_time: row.SFT_END_TIME,
		is_overnight: row.SFT_IS_OVERNIGHT === 1,
		status: row.SFT_STATUS,
		notes: row.SFT_NOTES || null,
		published_on: row.SFT_PUBLISHED_ON || null,
		published_by: row.SFT_PUBLISHED_BY || null,
		cancelled_on: row.SFT_CANCELLED_ON || null,
		cancelled_by: row.SFT_CANCELLED_BY || null,
		created_by: row.SFT_CREATED_BY,
		created_on: row.SFT_CREATED_ON,
		last_update: row.SFT_LAST_UPDATE || null,
	};
}

function mapShiftCalendarRow(row)
{
	let mapped = mapShiftRow(row);
	// Enrich with officer names and post info from joined data
	mapped.officers = [];
	mapped.post_name = row.POST_NAME || null;
	return mapped;
}

function mapCheckinRow(row)
{
	return {
		checkin_id: row.SFC_ID,
		shift_id: row.SFC_SFT_ID || null,
		officer_id: row.SFC_OFC_USR_ID,
		officer_name: row.OFFICER_NAME || null,
		check_in_on: row.SFC_CHECK_IN_ON,
		check_out_on: row.SFC_CHECK_OUT_ON || null,
		total_hours: row.SFC_TOTAL_HOURS != null ? parseFloat(row.SFC_TOTAL_HOURS) : null,
		shift_date: row.SFT_DATE || null,
		community_name: row.COM_NAME || null,
	};
}

// =========================================================================
// Helpers — notifications
// =========================================================================

function sendShiftNotification(session, type, shift, templateVars, targetUserIds, communityId)
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
		payload: JSON.stringify({entity_type: "shift", entity_id: shift.SFT_ID}),
		community_id: communityId || shift.SFT_COM_ID,
	});
}

// =========================================================================
// Helpers — recurring date generation
// =========================================================================

function generateRecurringDates(startDate, pattern, repeatOn, intervalDays, endType, endDate, occurrences)
{
	let dates = [];
	// Extract date-only portion (YYYY-MM-DD) since validateDateStr may append time
	let startDateOnly = String(startDate).substring(0, 10);
	let current = new Date(startDateOnly + "T00:00:00");
	let maxCount = MAX_OCCURRENCES;
	let count = 0;

	if (endType === $Const.SHIFT_RECURRENCE_OCCURRENCES && occurrences > 0)
	{
		maxCount = Math.min(occurrences, MAX_OCCURRENCES);
	}

	let endDateOnly = endDate ? String(endDate).substring(0, 10) : null;
	let limit = endType === $Const.SHIFT_RECURRENCE_END_DATE && endDateOnly ? new Date(endDateOnly + "T23:59:59") : null;

	// Q7: For no_end, enforce a rolling 90-day horizon from start date
	if (endType === $Const.SHIFT_RECURRENCE_NO_END)
	{
		let horizon = new Date(startDateOnly + "T23:59:59");
		horizon.setDate(horizon.getDate() + ROLLING_HORIZON_DAYS);
		limit = horizon;
	}

	// Safety: generate at most MAX_OCCURRENCES + some margin to find enough matching days
	let maxIterations = MAX_OCCURRENCES * 8;
	let iterations = 0;

	while (count < maxCount && iterations < maxIterations)
	{
		iterations++;

		if (limit && current > limit)
		{
			break;
		}

		let dayOfWeek = current.getDay();

		if (pattern === $Const.SHIFT_RECURRENCE_DAILY)
		{
			dates.push(formatDate(current));
			count++;
			current.setDate(current.getDate() + 1);
		}
		else if (pattern === $Const.SHIFT_RECURRENCE_SPECIFIC_DAYS)
		{
			if (repeatOn && repeatOn.indexOf(dayOfWeek) !== -1)
			{
				dates.push(formatDate(current));
				count++;
			}
			current.setDate(current.getDate() + 1);
		}
		else if (pattern === $Const.SHIFT_RECURRENCE_EVERY_X_DAYS)
		{
			dates.push(formatDate(current));
			count++;
			current.setDate(current.getDate() + (intervalDays || 1));
		}
		else
		{
			break;
		}

		if (endType === $Const.SHIFT_RECURRENCE_NO_END && count >= maxCount)
		{
			break;
		}
	}

	return dates;
}

function formatDate(d)
{
	let y = d.getFullYear();
	let m = String(d.getMonth() + 1).padStart(2, "0");
	let day = String(d.getDate()).padStart(2, "0");
	return y + "-" + m + "-" + day;
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
		$DataItems.define(TABLE_SHIFT_STATUS);
		$DataItems.define(TABLE_RECURRENCE_PATTERN);
		$DataItems.define(TABLE_RECURRENCE_END_TYPE);
		$DataItems.define(TABLE_UPDATE_SCOPE);
	}

	// =========================================================================
	// Get Shifts Calendar
	// =========================================================================

	get_shifts_calendar()
	{
		let dateFrom = $Utils.validateDateStr(this.$date_from);
		let dateTo = $Utils.validateDateStr(this.$date_to);
		if (!dateFrom || !dateTo)
		{
			return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
		}

		let conditions = ["s.SFT_DELETED_ON IS NULL"];
		let params = [];

		conditions.push("s.SFT_DATE >= ?");
		params.push(dateFrom);
		conditions.push("s.SFT_DATE <= ?");
		params.push(dateTo);

		// Q8: Community access scoping — non-super admins scoped to their assigned community
		let requestedCommunityId = this.$community_id;
		if (!isUserSuperAdmin(this.$Session))
		{
			let adminComId = getAdminCommunityId(this.$Session.userId);
			if (adminComId)
			{
				// Admin has a community assignment — enforce it
				if (requestedCommunityId && requestedCommunityId > 0 && requestedCommunityId !== adminComId)
				{
					return $ERRS.ERR_NO_PRIVILEGES;
				}
				requestedCommunityId = adminComId;
			}
		}

		// Community filter
		if (requestedCommunityId && requestedCommunityId > 0)
		{
			if (!communityExists(requestedCommunityId))
			{
				return $ERRS.ERR_COMMUNITY_NOT_FOUND;
			}
			conditions.push("s.SFT_COM_ID=?");
			params.push(requestedCommunityId);
		}

		// Status filter
		if (!$Utils.empty(this.$status))
		{
			if (!$DataItems.isValidItemId(this.$status, TABLE_SHIFT_STATUS))
			{
				return $ERRS.ERR_SHIFT_INVALID_STATUS;
			}
			conditions.push("s.SFT_STATUS=?");
			params.push(this.$status);
		}

		// Officer filter
		if (!$Utils.empty(this.$officer_id))
		{
			conditions.push("EXISTS (SELECT 1 FROM `shift_officer` so WHERE so.SFO_SFT_ID = s.SFT_ID AND so.SFO_OFC_USR_ID=? AND so.SFO_DELETED_ON IS NULL)");
			params.push(this.$officer_id);
		}

		// Free-text search on community name
		if (!$Utils.empty(this.$search_text))
		{
			let term = "%" + this.$search_text + "%";
			conditions.push("c.COM_NAME LIKE ?");
			params.push(term);
		}

		let whereClause = conditions.join(" AND ");

		let rows = $Db.executeQuery(
			`SELECT s.SFT_ID, s.SFT_COM_ID, s.SFT_SERIES_ID,
			        CAST(s.SFT_DATE AS CHAR) AS SFT_DATE,
			        s.SFT_START_TIME, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT,
			        s.SFT_STATUS, s.SFT_NOTES,
			        s.SFT_PUBLISHED_ON, s.SFT_PUBLISHED_BY,
			        s.SFT_CANCELLED_ON, s.SFT_CANCELLED_BY,
			        s.SFT_CREATED_BY, s.SFT_CREATED_ON, s.SFT_LAST_UPDATE,
			        c.COM_NAME
			 FROM \`shift\` s
			    LEFT OUTER JOIN \`community\` c ON s.SFT_COM_ID = c.COM_ID
			 WHERE ${whereClause}
			 ORDER BY s.SFT_DATE ASC, s.SFT_START_TIME ASC`,
			params);

		// Collect all shift IDs for batch officer+post lookup
		let shiftIds = rows.map(r => r.SFT_ID);
		let officerMap = {};
		let postMap = {};

		if (shiftIds.length > 0)
		{
			let placeholders = shiftIds.map(() => "?").join(",");

			// Batch fetch allocated officers
			let officerRows = $Db.executeQuery(
				`SELECT so.SFO_SFT_ID, so.SFO_OFC_USR_ID,
				        ud.USD_FIRST_NAME, ud.USD_LAST_NAME
				 FROM \`shift_officer\` so
				    JOIN \`user_details\` ud ON so.SFO_OFC_USR_ID = ud.USD_USR_ID AND ud.USD_DELETED_ON IS NULL
				 WHERE so.SFO_SFT_ID IN (${placeholders}) AND so.SFO_DELETED_ON IS NULL`,
				shiftIds);

			for (let i = 0; i < officerRows.length; i++)
			{
				let r = officerRows[i];
				if (!officerMap[r.SFO_SFT_ID])
				{
					officerMap[r.SFO_SFT_ID] = [];
				}
				officerMap[r.SFO_SFT_ID].push({
					officer_id: r.SFO_OFC_USR_ID,
					name: ((r.USD_FIRST_NAME || "") + " " + (r.USD_LAST_NAME || "")).trim(),
				});
			}

			// Batch fetch post assignments
			let postRows = $Db.executeQuery(
				`SELECT sp.SHP_SFT_ID, sp.SHP_OFC_USR_ID, sp.SHP_PST_ID, p.PST_NAME
				 FROM \`shift_post\` sp
				    JOIN \`post\` p ON sp.SHP_PST_ID = p.PST_ID AND p.PST_DELETED_ON IS NULL
				 WHERE sp.SHP_SFT_ID IN (${placeholders}) AND sp.SHP_DELETED_ON IS NULL`,
				shiftIds);

			for (let i = 0; i < postRows.length; i++)
			{
				let r = postRows[i];
				if (!postMap[r.SHP_SFT_ID])
				{
					postMap[r.SHP_SFT_ID] = [];
				}
				postMap[r.SHP_SFT_ID].push({
					officer_id: r.SHP_OFC_USR_ID,
					post_id: r.SHP_PST_ID,
					post_name: r.PST_NAME,
				});
			}
		}

		let shifts = rows.map(r =>
		{
			let mapped = mapShiftRow(r);
			mapped.officers = officerMap[r.SFT_ID] || [];
			mapped.posts = postMap[r.SFT_ID] || [];
			return mapped;
		});

		return {...$ERRS.ERR_SUCCESS, shifts: shifts};
	}

	// =========================================================================
	// Get Shift
	// =========================================================================

	get_shift()
	{
		let userType = this.$Session.userType;
		let userId = this.$Session.userId;

		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		// Officers can only see published/active/completed shifts they are allocated to
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			if (shift.SFT_STATUS === $Const.SHIFT_STATUS_DRAFT || shift.SFT_STATUS === $Const.SHIFT_STATUS_CANCELLED)
			{
				return $ERRS.ERR_SHIFT_NOT_FOUND;
			}
			if (!isOfficerAllocated(this.$shift_id, userId))
			{
				return $ERRS.ERR_SHIFT_NOT_FOUND;
			}
		}

		// Enrich with community name
		let comRows = $Db.executeQuery(
			`SELECT COM_NAME FROM \`community\` WHERE COM_ID=?`,
			[shift.SFT_COM_ID]);
		shift.COM_NAME = comRows.length > 0 ? comRows[0].COM_NAME : null;

		let mapped = mapShiftRow(shift);

		// Get allocated officers with names
		let officerRows = $Db.executeQuery(
			`SELECT so.SFO_OFC_USR_ID, ud.USD_FIRST_NAME, ud.USD_LAST_NAME
			 FROM \`shift_officer\` so
			    JOIN \`user_details\` ud ON so.SFO_OFC_USR_ID = ud.USD_USR_ID AND ud.USD_DELETED_ON IS NULL
			 WHERE so.SFO_SFT_ID=? AND so.SFO_DELETED_ON IS NULL`,
			[this.$shift_id]);

		mapped.officers = officerRows.map(r => ({
			officer_id: r.SFO_OFC_USR_ID,
			name: ((r.USD_FIRST_NAME || "") + " " + (r.USD_LAST_NAME || "")).trim(),
		}));

		// Get post assignments
		let postAssignments = getShiftPostAssignments(this.$shift_id);
		mapped.posts = postAssignments.map(r => ({
			officer_id: r.SHP_OFC_USR_ID,
			post_id: r.SHP_PST_ID,
			post_name: r.PST_NAME,
		}));

		// Get check-in records
		let checkins = getShiftCheckins(this.$shift_id);
		mapped.checkins = checkins.map(r => ({
			officer_id: r.SFC_OFC_USR_ID,
			check_in_on: r.SFC_CHECK_IN_ON,
			check_out_on: r.SFC_CHECK_OUT_ON || null,
			total_hours: r.SFC_TOTAL_HOURS != null ? parseFloat(r.SFC_TOTAL_HOURS) : null,
		}));

		return {...$ERRS.ERR_SUCCESS, shift: mapped};
	}

	// =========================================================================
	// Create Shift
	// =========================================================================

	create_shift()
	{
		let userId = this.$Session.userId;

		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let shiftDate = $Utils.validateDateStr(this.$shift_date);
		if (!shiftDate)
		{
			return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
		}

		if (!validateTimeRange(this.$start_time, this.$end_time))
		{
			return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
		}

		let overnight = isOvernight(this.$start_time, this.$end_time) ? 1 : 0;
		let notes = null;
		if (!$Utils.empty(this.$notes))
		{
			notes = this.$notes.substring(0, MAX_NOTES_LENGTH);
		}

		// Validate officer IDs before transaction (batch — no DB in loop)
		let officerIds = [];
		if (this.$officer_ids && this.$officer_ids.length > 0)
		{
			officerIds = [...new Set(this.$officer_ids)];
			let invalidOfficers = validateOfficersBatch(officerIds, this.$community_id);
			if (invalidOfficers.length > 0)
			{
				return $ERRS.ERR_SHIFT_OFFICER_NOT_IN_COMMUNITY;
			}
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`shift\`
			 (SFT_COM_ID, SFT_DATE, SFT_START_TIME, SFT_END_TIME, SFT_IS_OVERNIGHT,
			  SFT_STATUS, SFT_NOTES, SFT_CREATED_BY, SFT_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			[this.$community_id, shiftDate, this.$start_time, this.$end_time, overnight,
			 $Const.SHIFT_STATUS_DRAFT, notes, userId, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let shiftId = $Db.insertId();

		// Bulk insert officers
		if (officerIds.length > 0)
		{
			let placeholders = officerIds.map(() => "(?,?,?)").join(", ");
			let params = [];
			for (let i = 0; i < officerIds.length; i++)
			{
				params.push(shiftId, officerIds[i], now);
			}

			$Db.executeQuery(
				`INSERT INTO \`shift_officer\` (SFO_SFT_ID, SFO_OFC_USR_ID, SFO_CREATED_ON)
				 VALUES ${placeholders}`,
				params);
			if ($Db.isError())
			{
				$Db.rollbackTransaction();
				return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
			}
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, shift_id: shiftId};
	}

	// =========================================================================
	// Update Shift
	// =========================================================================

	update_shift()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		// Only draft and published shifts can be updated
		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT && shift.SFT_STATUS !== $Const.SHIFT_STATUS_PUBLISHED)
		{
			return $ERRS.ERR_SHIFT_CANNOT_UPDATE;
		}

		let updates = [];
		let params = [];

		if (this.$shift_date !== null && this.$shift_date !== undefined)
		{
			let shiftDate = $Utils.validateDateStr(this.$shift_date);
			if (!shiftDate) return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			updates.push("SFT_DATE=?");
			params.push(shiftDate);
		}

		let effectiveStart = (this.$start_time !== null && this.$start_time !== undefined) ? this.$start_time : shift.SFT_START_TIME;
		let effectiveEnd = (this.$end_time !== null && this.$end_time !== undefined) ? this.$end_time : shift.SFT_END_TIME;

		if (this.$start_time !== null && this.$start_time !== undefined)
		{
			if (!isValidTimeStr(this.$start_time)) return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			updates.push("SFT_START_TIME=?");
			params.push(this.$start_time);
		}

		if (this.$end_time !== null && this.$end_time !== undefined)
		{
			if (!isValidTimeStr(this.$end_time)) return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			updates.push("SFT_END_TIME=?");
			params.push(this.$end_time);
		}

		// Validate combined time range if either changed
		let startChanged = this.$start_time !== null && this.$start_time !== undefined;
		let endChanged = this.$end_time !== null && this.$end_time !== undefined;
		if (startChanged || endChanged)
		{
			if (!validateTimeRange(effectiveStart, effectiveEnd))
			{
				return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			}
			updates.push("SFT_IS_OVERNIGHT=?");
			params.push(isOvernight(effectiveStart, effectiveEnd) ? 1 : 0);
		}

		if (this.$notes !== null && this.$notes !== undefined)
		{
			updates.push("SFT_NOTES=?");
			params.push($Utils.empty(this.$notes) ? null : this.$notes.substring(0, MAX_NOTES_LENGTH));
		}

		if (updates.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("SFT_LAST_UPDATE=?");
		params.push(now);
		params.push(this.$shift_id);

		$Db.executeQuery(
			`UPDATE \`shift\` SET ${updates.join(", ")} WHERE SFT_ID=? AND SFT_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify allocated officers if shift was already published
		if (shift.SFT_STATUS === $Const.SHIFT_STATUS_PUBLISHED)
		{
			let officerIds = getShiftOfficerIds(this.$shift_id);
			let shiftDateStr = (this.$shift_date !== null && this.$shift_date !== undefined) ? this.$shift_date : String(shift.SFT_DATE);
			sendShiftNotification(this.$Session, "shift_updated", shift,
				{shift_date: shiftDateStr},
				officerIds, shift.SFT_COM_ID);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Delete Shift
	// =========================================================================

	delete_shift()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT)
		{
			return $ERRS.ERR_SHIFT_CANNOT_DELETE;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`shift\` SET SFT_DELETED_ON=?, SFT_LAST_UPDATE=? WHERE SFT_ID=? AND SFT_DELETED_ON IS NULL`,
			[now, now, this.$shift_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Publish Shift
	// =========================================================================

	publish_shift()
	{
		let userId = this.$Session.userId;

		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT)
		{
			return $ERRS.ERR_SHIFT_CANNOT_PUBLISH;
		}

		// Must have at least one allocated officer
		let officerIds = getShiftOfficerIds(this.$shift_id);
		if (officerIds.length === 0)
		{
			return $ERRS.ERR_SHIFT_NO_OFFICERS;
		}

		// Q1: Warn-only conflict check for all allocated officers — return warnings unless acknowledged
		// Note: per-officer validation loop is acceptable here; officer count per shift is typically small (2-10)
		if (!this.$acknowledge_conflicts)
		{
			// Batch-fetch officer names upfront to avoid N+1 queries inside the loop
			let officerNameMap = $Funcs.getUserNames(officerIds);
			let allWarnings = [];
			for (let i = 0; i < officerIds.length; i++)
			{
				let validationResult = this._runAllocationValidation(shift, officerIds[i]);
				if (validationResult && validationResult.has_conflicts)
				{
					let officerName = officerNameMap[officerIds[i]] || "Unknown";
					for (let j = 0; j < validationResult.warnings.length; j++)
					{
						allWarnings.push({...validationResult.warnings[j], officer_id: officerIds[i], officer_name: officerName});
					}
				}
			}
			if (allWarnings.length > 0)
			{
				return {...$ERRS.ERR_SHIFT_OFFICER_CONFLICT, warnings: allWarnings, requires_acknowledgment: true};
			}
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`shift\`
			 SET SFT_STATUS=?, SFT_PUBLISHED_ON=?, SFT_PUBLISHED_BY=?, SFT_LAST_UPDATE=?
			 WHERE SFT_ID=? AND SFT_DELETED_ON IS NULL`,
			[$Const.SHIFT_STATUS_PUBLISHED, now, userId, now, this.$shift_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify all allocated officers
		sendShiftNotification(this.$Session, "shift_published", shift,
			{shift_date: String(shift.SFT_DATE)},
			officerIds, shift.SFT_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Cancel Shift
	// =========================================================================

	cancel_shift()
	{
		let userId = this.$Session.userId;

		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (shift.SFT_STATUS === $Const.SHIFT_STATUS_ACTIVE || shift.SFT_STATUS === $Const.SHIFT_STATUS_COMPLETED || shift.SFT_STATUS === $Const.SHIFT_STATUS_CANCELLED)
		{
			return $ERRS.ERR_SHIFT_CANNOT_CANCEL;
		}

		let officerIds = getShiftOfficerIds(this.$shift_id);
		let wasPublished = shift.SFT_STATUS === $Const.SHIFT_STATUS_PUBLISHED;

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`shift\`
			 SET SFT_STATUS=?, SFT_CANCELLED_ON=?, SFT_CANCELLED_BY=?, SFT_LAST_UPDATE=?
			 WHERE SFT_ID=? AND SFT_DELETED_ON IS NULL`,
			[$Const.SHIFT_STATUS_CANCELLED, now, userId, now, this.$shift_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify allocated officers only if shift was published
		if (wasPublished && officerIds.length > 0)
		{
			sendShiftNotification(this.$Session, "shift_cancelled", shift,
				{shift_date: String(shift.SFT_DATE)},
				officerIds, shift.SFT_COM_ID);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Allocate Officer
	// =========================================================================

	allocate_officer()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT && shift.SFT_STATUS !== $Const.SHIFT_STATUS_PUBLISHED)
		{
			return $ERRS.ERR_SHIFT_CANNOT_UPDATE;
		}

		if (!isActiveOfficerInCommunity(this.$officer_id, shift.SFT_COM_ID))
		{
			return $ERRS.ERR_SHIFT_OFFICER_NOT_IN_COMMUNITY;
		}

		if (isOfficerAllocated(this.$shift_id, this.$officer_id))
		{
			return $ERRS.ERR_SHIFT_OFFICER_ALREADY_ALLOCATED;
		}

		// Q1: Warn-only conflict check — return warnings unless acknowledged
		if (!this.$acknowledge_conflicts)
		{
			let validationResult = this._runAllocationValidation(shift, this.$officer_id);
			if (validationResult && validationResult.has_conflicts)
			{
				return {...$ERRS.ERR_SHIFT_OFFICER_CONFLICT, warnings: validationResult.warnings, requires_acknowledgment: true};
			}
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`INSERT INTO \`shift_officer\` (SFO_SFT_ID, SFO_OFC_USR_ID, SFO_CREATED_ON)
			 VALUES (?,?,?)`,
			[this.$shift_id, this.$officer_id, now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		// Notify the officer if shift is already published
		if (shift.SFT_STATUS === $Const.SHIFT_STATUS_PUBLISHED)
		{
			sendShiftNotification(this.$Session, "shift_published", shift,
				{shift_date: String(shift.SFT_DATE)},
				[this.$officer_id], shift.SFT_COM_ID);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Remove Officer
	// =========================================================================

	remove_officer()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		// Q6: Allow removal from draft, published, AND active shifts
		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT && shift.SFT_STATUS !== $Const.SHIFT_STATUS_PUBLISHED && shift.SFT_STATUS !== $Const.SHIFT_STATUS_ACTIVE)
		{
			return $ERRS.ERR_SHIFT_CANNOT_UPDATE;
		}

		if (!isOfficerAllocated(this.$shift_id, this.$officer_id))
		{
			return $ERRS.ERR_SHIFT_OFFICER_NOT_ALLOCATED;
		}

		// Q6: Check for open check-in — auto-close it before removal
		let openCheckin = getOpenCheckin(this.$shift_id, this.$officer_id);

		let now = $Utils.now();

		$Db.beginTransaction();

		// Q6: Auto-close open check-in if exists
		if (openCheckin)
		{
			let checkInTime = new Date(openCheckin.SFC_CHECK_IN_ON);
			let checkOutTime = new Date(now);
			let totalHours = Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100) / 100;

			$Db.executeQuery(
				`UPDATE \`shift_checkin\`
				 SET SFC_CHECK_OUT_ON=?, SFC_TOTAL_HOURS=?, SFC_NOTES='Auto-closed via mid-shift manager removal'
				 WHERE SFC_ID=?`,
				[now, totalHours, openCheckin.SFC_ID]);
			if ($Db.isError())
			{
				$Db.rollbackTransaction();
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}
		}

		// Soft-delete officer allocation
		$Db.executeQuery(
			`UPDATE \`shift_officer\`
			 SET SFO_DELETED_ON=?
			 WHERE SFO_SFT_ID=? AND SFO_OFC_USR_ID=? AND SFO_DELETED_ON IS NULL`,
			[now, this.$shift_id, this.$officer_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Soft-delete post assignments for this officer in this shift
		$Db.executeQuery(
			`UPDATE \`shift_post\`
			 SET SHP_DELETED_ON=?
			 WHERE SHP_SFT_ID=? AND SHP_OFC_USR_ID=? AND SHP_DELETED_ON IS NULL`,
			[now, this.$shift_id, this.$officer_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		// Notify the removed officer if shift was published or active
		if (shift.SFT_STATUS === $Const.SHIFT_STATUS_PUBLISHED || shift.SFT_STATUS === $Const.SHIFT_STATUS_ACTIVE)
		{
			sendShiftNotification(this.$Session, "shift_updated", shift,
				{shift_date: String(shift.SFT_DATE)},
				[this.$officer_id], shift.SFT_COM_ID);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Assign Post
	// =========================================================================

	assign_post()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_DRAFT && shift.SFT_STATUS !== $Const.SHIFT_STATUS_PUBLISHED)
		{
			return $ERRS.ERR_SHIFT_CANNOT_UPDATE;
		}

		if (!isOfficerAllocated(this.$shift_id, this.$officer_id))
		{
			return $ERRS.ERR_SHIFT_OFFICER_NOT_ALLOCATED;
		}

		if (!postExistsAndActive(this.$post_id, shift.SFT_COM_ID))
		{
			return $ERRS.ERR_SHIFT_POST_NOT_FOUND;
		}

		// Check if this exact assignment already exists
		let existing = $Db.executeQuery(
			`SELECT SHP_ID FROM \`shift_post\`
			 WHERE SHP_SFT_ID=? AND SHP_OFC_USR_ID=? AND SHP_PST_ID=? AND SHP_DELETED_ON IS NULL`,
			[this.$shift_id, this.$officer_id, this.$post_id]);
		if (existing.length > 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		// Q5: Post eligibility warning (non-blocking — returns warning alongside success)
		let eligibilityWarning = null;
		let eligibility = $ShiftUtils.validatePostEligibility(this.$officer_id, this.$post_id);
		if (eligibility)
		{
			let parts = [];
			if (eligibility.missing_roles.length > 0) parts.push("roles: " + eligibility.missing_roles.join(", "));
			if (eligibility.missing_badges.length > 0) parts.push("badges: " + eligibility.missing_badges.join(", "));
			eligibilityWarning = {
				type: "post_eligibility_mismatch",
				missing_roles: eligibility.missing_roles,
				missing_badges: eligibility.missing_badges,
				message: "Officer lacks required " + parts.join(" and "),
			};
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`INSERT INTO \`shift_post\` (SHP_SFT_ID, SHP_OFC_USR_ID, SHP_PST_ID, SHP_CREATED_ON)
			 VALUES (?,?,?,?)`,
			[this.$shift_id, this.$officer_id, this.$post_id, now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		if (eligibilityWarning)
		{
			return {...$ERRS.ERR_SUCCESS, warning: eligibilityWarning};
		}
		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Check In
	// =========================================================================

	check_in()
	{
		let userId = this.$Session.userId;

		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		// Must be published or active
		if (shift.SFT_STATUS !== $Const.SHIFT_STATUS_PUBLISHED && shift.SFT_STATUS !== $Const.SHIFT_STATUS_ACTIVE)
		{
			return $ERRS.ERR_SHIFT_INVALID_STATUS;
		}

		if (!isOfficerAllocated(this.$shift_id, userId))
		{
			return $ERRS.ERR_SHIFT_OFFICER_NOT_ALLOCATED;
		}

		// Check for existing open check-in on this shift
		let openCheckin = getOpenCheckin(this.$shift_id, userId);
		if (openCheckin)
		{
			return $ERRS.ERR_SHIFT_ALREADY_CHECKED_IN;
		}

		// Q1: Hard-block — cannot be actively checked in on another overlapping shift
		if (hasActiveCheckinOnOtherShift(userId, this.$shift_id))
		{
			return $ERRS.ERR_SHIFT_ALREADY_CHECKED_IN;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`shift_checkin\` (SFC_SFT_ID, SFC_OFC_USR_ID, SFC_CHECK_IN_ON, SFC_CREATED_ON)
			 VALUES (?,?,?,?)`,
			[this.$shift_id, userId, now, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		// Capture insert ID before the UPDATE overwrites it
		let checkinId = $Db.insertId();

		// Transition shift to active if it's still published
		if (shift.SFT_STATUS === $Const.SHIFT_STATUS_PUBLISHED)
		{
			$Db.executeQuery(
				`UPDATE \`shift\` SET SFT_STATUS=?, SFT_LAST_UPDATE=?
				 WHERE SFT_ID=? AND SFT_STATUS=? AND SFT_DELETED_ON IS NULL`,
				[$Const.SHIFT_STATUS_ACTIVE, now, this.$shift_id, $Const.SHIFT_STATUS_PUBLISHED]);
			if ($Db.isError())
			{
				$Db.rollbackTransaction();
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, checkin_id: checkinId};
	}

	// =========================================================================
	// Check Out
	// =========================================================================

	check_out()
	{
		let userId = this.$Session.userId;

		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (!isOfficerAllocated(this.$shift_id, userId))
		{
			return $ERRS.ERR_SHIFT_OFFICER_NOT_ALLOCATED;
		}

		let openCheckin = getOpenCheckin(this.$shift_id, userId);
		if (!openCheckin)
		{
			return $ERRS.ERR_SHIFT_NOT_CHECKED_IN;
		}

		let now = $Utils.now();
		let checkInTime = new Date(openCheckin.SFC_CHECK_IN_ON);
		let checkOutTime = new Date(now);
		let totalHours = Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100) / 100;

		$Db.executeQuery(
			`UPDATE \`shift_checkin\`
			 SET SFC_CHECK_OUT_ON=?, SFC_TOTAL_HOURS=?
			 WHERE SFC_ID=?`,
			[now, totalHours, openCheckin.SFC_ID]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Check if all officers have checked out — if so, mark shift completed
		let allOfficerIds = getShiftOfficerIds(this.$shift_id);
		if (allOfficerIds.length > 0 && shift.SFT_STATUS === $Const.SHIFT_STATUS_ACTIVE)
		{
			let placeholders = allOfficerIds.map(() => "?").join(",");
			let openRows = $Db.executeQuery(
				`SELECT SFC_ID FROM \`shift_checkin\`
				 WHERE SFC_SFT_ID=? AND SFC_OFC_USR_ID IN (${placeholders}) AND SFC_CHECK_OUT_ON IS NULL`,
				[this.$shift_id, ...allOfficerIds]);

			if (openRows.length === 0)
			{
				// All officers checked out — auto-complete the shift
				$Db.executeQuery(
					`UPDATE \`shift\` SET SFT_STATUS=?, SFT_LAST_UPDATE=?
					 WHERE SFT_ID=? AND SFT_STATUS=? AND SFT_DELETED_ON IS NULL`,
					[$Const.SHIFT_STATUS_COMPLETED, now, this.$shift_id, $Const.SHIFT_STATUS_ACTIVE]);
				if ($Db.isError())
				{
					return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
				}
			}
		}

		return {...$ERRS.ERR_SUCCESS, total_hours: totalHours};
	}

	// =========================================================================
	// Get My Shifts (Officer)
	// =========================================================================

	get_my_shifts()
	{
		let userId = this.$Session.userId;

		let visibleStatuses = [$Const.SHIFT_STATUS_PUBLISHED, $Const.SHIFT_STATUS_ACTIVE, $Const.SHIFT_STATUS_COMPLETED];
		let conditions = [
			"s.SFT_DELETED_ON IS NULL",
			`s.SFT_STATUS IN (${visibleStatuses.toPlaceholders()})`,
			"EXISTS (SELECT 1 FROM `shift_officer` so WHERE so.SFO_SFT_ID = s.SFT_ID AND so.SFO_OFC_USR_ID=? AND so.SFO_DELETED_ON IS NULL)",
		];
		let params = [...visibleStatuses, userId];

		if (!$Utils.empty(this.$date_from))
		{
			let dateFrom = $Utils.validateDateStr(this.$date_from);
			if (dateFrom)
			{
				conditions.push("s.SFT_DATE >= ?");
				params.push(dateFrom);
			}
		}

		if (!$Utils.empty(this.$date_to))
		{
			let dateTo = $Utils.validateDateStr(this.$date_to);
			if (dateTo)
			{
				conditions.push("s.SFT_DATE <= ?");
				params.push(dateTo);
			}
		}

		if (!$Utils.empty(this.$status))
		{
			if ($DataItems.isValidItemId(this.$status, TABLE_SHIFT_STATUS))
			{
				conditions.push("s.SFT_STATUS=?");
				params.push(this.$status);
			}
		}

		let whereClause = conditions.join(" AND ");

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total FROM \`shift\` s WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		// Pagination
		let pageSize = $Config.get("SHIFTS_LIST_PAGE_SIZE") || 20;
		let page = parseInt(this.$page, 10) || 0;
		let offset = page * pageSize;

		let rows = $Db.executeQuery(
			`SELECT s.SFT_ID, s.SFT_COM_ID, s.SFT_SERIES_ID,
			        CAST(s.SFT_DATE AS CHAR) AS SFT_DATE,
			        s.SFT_START_TIME, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT,
			        s.SFT_STATUS, s.SFT_NOTES,
			        s.SFT_PUBLISHED_ON, s.SFT_PUBLISHED_BY,
			        s.SFT_CANCELLED_ON, s.SFT_CANCELLED_BY,
			        s.SFT_CREATED_BY, s.SFT_CREATED_ON, s.SFT_LAST_UPDATE,
			        c.COM_NAME
			 FROM \`shift\` s
			    LEFT OUTER JOIN \`community\` c ON s.SFT_COM_ID = c.COM_ID
			 WHERE ${whereClause}
			 ORDER BY s.SFT_DATE DESC, s.SFT_START_TIME ASC
			 LIMIT ${pageSize} OFFSET ${offset}`,
			params);

		// Batch fetch post assignments for officer's shifts
		let shiftIds = rows.map(r => r.SFT_ID);
		let postMap = {};
		if (shiftIds.length > 0)
		{
			let placeholders = shiftIds.map(() => "?").join(",");
			let postRows = $Db.executeQuery(
				`SELECT sp.SHP_SFT_ID, sp.SHP_PST_ID, p.PST_NAME
				 FROM \`shift_post\` sp
				    JOIN \`post\` p ON sp.SHP_PST_ID = p.PST_ID AND p.PST_DELETED_ON IS NULL
				 WHERE sp.SHP_SFT_ID IN (${placeholders}) AND sp.SHP_OFC_USR_ID=? AND sp.SHP_DELETED_ON IS NULL`,
				[...shiftIds, userId]);

			for (let i = 0; i < postRows.length; i++)
			{
				let r = postRows[i];
				if (!postMap[r.SHP_SFT_ID])
				{
					postMap[r.SHP_SFT_ID] = [];
				}
				postMap[r.SHP_SFT_ID].push({post_id: r.SHP_PST_ID, post_name: r.PST_NAME});
			}
		}

		let shifts = rows.map(r =>
		{
			let mapped = mapShiftRow(r);
			mapped.posts = postMap[r.SFT_ID] || [];
			return mapped;
		});

		return {...$ERRS.ERR_SUCCESS, num_of_pages: Math.ceil(totalCount / pageSize), num_of_items: totalCount, shifts: shifts};
	}

	// =========================================================================
	// Get My Hours (Officer)
	// =========================================================================

	get_my_hours()
	{
		let userId = this.$Session.userId;

		let conditions = ["ci.SFC_OFC_USR_ID=?", "s.SFT_DELETED_ON IS NULL"];
		let params = [userId];

		if (!$Utils.empty(this.$date_from))
		{
			let dateFrom = $Utils.validateDateStr(this.$date_from);
			if (dateFrom)
			{
				conditions.push("s.SFT_DATE >= ?");
				params.push(dateFrom);
			}
		}

		if (!$Utils.empty(this.$date_to))
		{
			let dateTo = $Utils.validateDateStr(this.$date_to);
			if (dateTo)
			{
				conditions.push("s.SFT_DATE <= ?");
				params.push(dateTo);
			}
		}

		let whereClause = conditions.join(" AND ");

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`shift_checkin\` ci
			    JOIN \`shift\` s ON ci.SFC_SFT_ID = s.SFT_ID
			 WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		let pageSize = $Config.get("SHIFTS_LIST_PAGE_SIZE") || 20;
		let page = parseInt(this.$page, 10) || 0;
		let offset = page * pageSize;

		let rows = $Db.executeQuery(
			`SELECT ci.SFC_ID, ci.SFC_SFT_ID, ci.SFC_OFC_USR_ID,
			        ci.SFC_CHECK_IN_ON, ci.SFC_CHECK_OUT_ON, ci.SFC_TOTAL_HOURS,
			        CAST(s.SFT_DATE AS CHAR) AS SFT_DATE, c.COM_NAME
			 FROM \`shift_checkin\` ci
			    JOIN \`shift\` s ON ci.SFC_SFT_ID = s.SFT_ID
			    LEFT OUTER JOIN \`community\` c ON s.SFT_COM_ID = c.COM_ID
			 WHERE ${whereClause}
			 ORDER BY ci.SFC_CHECK_IN_ON DESC
			 LIMIT ${pageSize} OFFSET ${offset}`,
			params);

		let checkins = rows.map(r => mapCheckinRow(r));

		return {...$ERRS.ERR_SUCCESS, num_of_pages: Math.ceil(totalCount / pageSize), num_of_items: totalCount, checkins: checkins};
	}

	// =========================================================================
	// Get Allocation Board
	// =========================================================================

	get_allocation_board()
	{
		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let boardDate = $Utils.validateDateStr(this.$board_date);
		if (!boardDate)
		{
			return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
		}

		// Get all active officers in the community
		let officers = $Db.executeQuery(
			`SELECT u.USR_ID, ud.USD_FIRST_NAME, ud.USD_LAST_NAME
			 FROM \`user\` u
			    JOIN \`user_details\` ud ON u.USR_ID = ud.USD_USR_ID AND ud.USD_DELETED_ON IS NULL
			 WHERE u.USR_TYPE=? AND u.USR_STATUS=1
			   AND ud.USD_COM_ID=?
			 ORDER BY ud.USD_FIRST_NAME ASC, ud.USD_LAST_NAME ASC`,
			[$Const.USER_TYPE_OFFICER, this.$community_id]);

		// Get shifts for the date
		let openStatuses = [$Const.SHIFT_STATUS_DRAFT, $Const.SHIFT_STATUS_PUBLISHED, $Const.SHIFT_STATUS_ACTIVE];
		let shifts = $Db.executeQuery(
			`SELECT s.SFT_ID, s.SFT_COM_ID, s.SFT_SERIES_ID,
			        CAST(s.SFT_DATE AS CHAR) AS SFT_DATE,
			        s.SFT_START_TIME, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT,
			        s.SFT_STATUS, s.SFT_NOTES,
			        s.SFT_PUBLISHED_ON, s.SFT_PUBLISHED_BY,
			        s.SFT_CANCELLED_ON, s.SFT_CANCELLED_BY,
			        s.SFT_CREATED_BY, s.SFT_CREATED_ON, s.SFT_LAST_UPDATE,
			        c.COM_NAME
			 FROM \`shift\` s
			    LEFT OUTER JOIN \`community\` c ON s.SFT_COM_ID = c.COM_ID
			 WHERE s.SFT_COM_ID=? AND s.SFT_DATE=? AND s.SFT_DELETED_ON IS NULL
			   AND s.SFT_STATUS IN (${openStatuses.toPlaceholders()})
			 ORDER BY s.SFT_START_TIME ASC`,
			[this.$community_id, boardDate, ...openStatuses]);

		// Batch fetch allocated officers for all shifts
		let shiftIds = shifts.map(r => r.SFT_ID);
		let officerMap = {};
		if (shiftIds.length > 0)
		{
			let placeholders = shiftIds.map(() => "?").join(",");
			let allocRows = $Db.executeQuery(
				`SELECT SFO_SFT_ID, SFO_OFC_USR_ID
				 FROM \`shift_officer\`
				 WHERE SFO_SFT_ID IN (${placeholders}) AND SFO_DELETED_ON IS NULL`,
				shiftIds);

			for (let i = 0; i < allocRows.length; i++)
			{
				let r = allocRows[i];
				if (!officerMap[r.SFO_SFT_ID])
				{
					officerMap[r.SFO_SFT_ID] = [];
				}
				officerMap[r.SFO_SFT_ID].push(r.SFO_OFC_USR_ID);
			}
		}

		// Calculate weekly hours for each officer (Mon-Sun of the board date week)
		let dateObj = new Date(boardDate + "T00:00:00");
		let dayOfWeek = dateObj.getDay();
		let mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		let monday = new Date(dateObj);
		monday.setDate(monday.getDate() + mondayOffset);
		let sunday = new Date(monday);
		sunday.setDate(sunday.getDate() + 6);

		let weekStart = formatDate(monday);
		let weekEnd = formatDate(sunday);

		let officerIds = officers.map(o => o.USR_ID);
		let hoursMap = {};

		if (officerIds.length > 0)
		{
			let placeholders = officerIds.map(() => "?").join(",");
			let hoursRows = $Db.executeQuery(
				`SELECT ci.SFC_OFC_USR_ID, SUM(ci.SFC_TOTAL_HOURS) weekly_hours
				 FROM \`shift_checkin\` ci
				    JOIN \`shift\` s ON ci.SFC_SFT_ID = s.SFT_ID
				 WHERE ci.SFC_OFC_USR_ID IN (${placeholders})
				   AND s.SFT_DATE >= ? AND s.SFT_DATE <= ?
				   AND ci.SFC_TOTAL_HOURS IS NOT NULL
				 GROUP BY ci.SFC_OFC_USR_ID`,
				[...officerIds, weekStart, weekEnd]);

			for (let i = 0; i < hoursRows.length; i++)
			{
				hoursMap[hoursRows[i].SFC_OFC_USR_ID] = parseFloat(hoursRows[i].weekly_hours) || 0;
			}
		}

		let mappedOfficers = officers.map(o => ({
			officer_id: o.USR_ID,
			name: ((o.USD_FIRST_NAME || "") + " " + (o.USD_LAST_NAME || "")).trim(),
			weekly_hours: hoursMap[o.USR_ID] || 0,
		}));

		let mappedShifts = shifts.map(r =>
		{
			let mapped = mapShiftRow(r);
			mapped.allocated_officer_ids = officerMap[r.SFT_ID] || [];
			return mapped;
		});

		return {...$ERRS.ERR_SUCCESS, officers: mappedOfficers, shifts: mappedShifts};
	}

	// =========================================================================
	// Validate Allocation
	// =========================================================================

	validate_allocation()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		let result = this._runAllocationValidation(shift, this.$officer_id);
		return {...$ERRS.ERR_SUCCESS, warnings: result.warnings, has_conflicts: result.has_conflicts};
	}

	// =========================================================================
	// Internal: Allocation Validation (shared by validate_allocation, allocate_officer, publish_shift)
	// =========================================================================

	_runAllocationValidation(shift, officerId)
	{
		let settings = $ShiftUtils.getShiftSettings();
		let warnings = [];
		let openStatuses = [$Const.SHIFT_STATUS_DRAFT, $Const.SHIFT_STATUS_PUBLISHED, $Const.SHIFT_STATUS_ACTIVE];

		let shiftStart = shift.SFT_START_TIME;
		let shiftEnd = shift.SFT_END_TIME;
		let shiftDate = shift.SFT_DATE;
		let shiftId = shift.SFT_ID;

		// 1. Double-booking: overlapping shifts for this officer on the same date
		let overlapping = $Db.executeQuery(
			`SELECT s.SFT_ID, CAST(s.SFT_DATE AS CHAR) AS SFT_DATE,
			        s.SFT_START_TIME, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT
			 FROM \`shift\` s
			    JOIN \`shift_officer\` so ON s.SFT_ID = so.SFO_SFT_ID
			 WHERE so.SFO_OFC_USR_ID=? AND so.SFO_DELETED_ON IS NULL
			   AND s.SFT_DELETED_ON IS NULL AND s.SFT_STATUS IN (${openStatuses.toPlaceholders()})
			   AND s.SFT_ID != ?
			   AND s.SFT_DATE=?`,
			[officerId, ...openStatuses, shiftId, shiftDate]);

		for (let i = 0; i < overlapping.length; i++)
		{
			let other = overlapping[i];
			let overlap = false;

			if (!shift.SFT_IS_OVERNIGHT && !other.SFT_IS_OVERNIGHT)
			{
				overlap = shiftStart < other.SFT_END_TIME && shiftEnd > other.SFT_START_TIME;
			}
			else
			{
				overlap = true;
			}

			if (overlap)
			{
				warnings.push({
					type: "double_booking",
					message: "Officer has an overlapping shift (ID: " + other.SFT_ID + ") on " + other.SFT_DATE,
					conflicting_shift_id: other.SFT_ID,
				});
			}
		}

		// 2. Consecutive shift gap: configurable minimum rest period (Q4)
		let adjacentDays = $Db.executeQuery(
			`SELECT s.SFT_ID, CAST(s.SFT_DATE AS CHAR) AS SFT_DATE,
			        s.SFT_START_TIME, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT
			 FROM \`shift\` s
			    JOIN \`shift_officer\` so ON s.SFT_ID = so.SFO_SFT_ID
			 WHERE so.SFO_OFC_USR_ID=? AND so.SFO_DELETED_ON IS NULL
			   AND s.SFT_DELETED_ON IS NULL AND s.SFT_STATUS IN (${openStatuses.toPlaceholders()})
			   AND s.SFT_ID != ?
			   AND s.SFT_DATE >= DATE_SUB(?, INTERVAL 1 DAY)
			   AND s.SFT_DATE <= DATE_ADD(?, INTERVAL 1 DAY)`,
			[officerId, ...openStatuses, shiftId, shiftDate, shiftDate]);

		let minRestHours = settings.min_rest_gap_hours || 8;
		for (let i = 0; i < adjacentDays.length; i++)
		{
			let adj = adjacentDays[i];
			let thisStart = new Date(shiftDate + "T" + shiftStart);
			let thisEnd = new Date(shiftDate + "T" + shiftEnd);
			if (shift.SFT_IS_OVERNIGHT) thisEnd.setDate(thisEnd.getDate() + 1);

			let adjStart = new Date(adj.SFT_DATE + "T" + adj.SFT_START_TIME);
			let adjEnd = new Date(adj.SFT_DATE + "T" + adj.SFT_END_TIME);
			if (adj.SFT_IS_OVERNIGHT) adjEnd.setDate(adjEnd.getDate() + 1);

			let gap;
			if (thisEnd <= adjStart)
			{
				gap = (adjStart - thisEnd) / (1000 * 60 * 60);
			}
			else if (adjEnd <= thisStart)
			{
				gap = (thisStart - adjEnd) / (1000 * 60 * 60);
			}
			else
			{
				continue;
			}

			if (gap < minRestHours)
			{
				warnings.push({
					type: "rest_gap",
					message: "Only " + gap.toFixed(1) + " hours rest before/after shift (ID: " + adj.SFT_ID + "). Minimum is " + minRestHours + " hours.",
					conflicting_shift_id: adj.SFT_ID,
					gap_hours: Math.round(gap * 10) / 10,
				});
			}
		}

		// 3. Weekly hours overtime check (Q3)
		let dateObj = new Date(shiftDate + "T00:00:00");
		let dayOfWeek = dateObj.getDay();
		let mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		let monday = new Date(dateObj);
		monday.setDate(monday.getDate() + mondayOffset);
		let sunday = new Date(monday);
		sunday.setDate(sunday.getDate() + 6);

		let weekStart = formatDate(monday);
		let weekEnd = formatDate(sunday);

		let hoursRows = $Db.executeQuery(
			`SELECT COALESCE(SUM(
			    TIMESTAMPDIFF(MINUTE, CONCAT(s.SFT_DATE, ' ', s.SFT_START_TIME),
			        IF(s.SFT_IS_OVERNIGHT, CONCAT(DATE_ADD(s.SFT_DATE, INTERVAL 1 DAY), ' ', s.SFT_END_TIME),
			           CONCAT(s.SFT_DATE, ' ', s.SFT_END_TIME))
			    )
			 ), 0) / 60.0 planned_hours
			 FROM \`shift\` s
			    JOIN \`shift_officer\` so ON s.SFT_ID = so.SFO_SFT_ID
			 WHERE so.SFO_OFC_USR_ID=? AND so.SFO_DELETED_ON IS NULL
			   AND s.SFT_DELETED_ON IS NULL AND s.SFT_STATUS IN (${openStatuses.toPlaceholders()})
			   AND s.SFT_DATE >= ? AND s.SFT_DATE <= ?`,
			[officerId, ...openStatuses, weekStart, weekEnd]);

		let thisStartCalc = new Date("2000-01-01T" + shiftStart);
		let thisEndCalc = new Date("2000-01-01T" + shiftEnd);
		if (shift.SFT_IS_OVERNIGHT) thisEndCalc.setDate(thisEndCalc.getDate() + 1);
		let shiftDurationHours = (thisEndCalc - thisStartCalc) / (1000 * 60 * 60);

		let existingPlannedHours = hoursRows.length > 0 ? parseFloat(hoursRows[0].planned_hours) : 0;
		let totalPlannedHours = existingPlannedHours + shiftDurationHours;
		let maxWeeklyHours = settings.max_weekly_hours || 48;

		if (totalPlannedHours > maxWeeklyHours)
		{
			warnings.push({
				type: "overtime",
				message: "Officer would have " + totalPlannedHours.toFixed(1) + " planned hours this week (max " + maxWeeklyHours + ").",
				planned_hours: Math.round(totalPlannedHours * 10) / 10,
			});
		}

		// 4. Post eligibility check (Q5) — validate assigned posts against officer capabilities
		let postAssignments = getShiftPostAssignments(shiftId);
		let officerPosts = postAssignments.filter(p => p.SHP_OFC_USR_ID === officerId);
		for (let i = 0; i < officerPosts.length; i++)
		{
			let eligibility = $ShiftUtils.validatePostEligibility(officerId, officerPosts[i].SHP_PST_ID);
			if (eligibility)
			{
				let parts = [];
				if (eligibility.missing_roles.length > 0) parts.push("roles: " + eligibility.missing_roles.join(", "));
				if (eligibility.missing_badges.length > 0) parts.push("badges: " + eligibility.missing_badges.join(", "));
				warnings.push({
					type: "post_eligibility_mismatch",
					post_id: officerPosts[i].SHP_PST_ID,
					post_name: officerPosts[i].PST_NAME,
					missing_roles: eligibility.missing_roles,
					missing_badges: eligibility.missing_badges,
					message: "Officer lacks required " + parts.join(" and ") + " for post '" + officerPosts[i].PST_NAME + "'",
				});
			}
		}

		return {warnings: warnings, has_conflicts: warnings.length > 0};
	}

	// =========================================================================
	// Create Recurring Shifts
	// =========================================================================

	create_recurring_shifts()
	{
		let userId = this.$Session.userId;

		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let startDate = $Utils.validateDateStr(this.$start_date);
		if (!startDate)
		{
			return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
		}

		if (!validateTimeRange(this.$start_time, this.$end_time))
		{
			return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
		}

		if (!$DataItems.isValidItemId(this.$recurrence_pattern, TABLE_RECURRENCE_PATTERN))
		{
			return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
		}

		if (!$DataItems.isValidItemId(this.$end_type, TABLE_RECURRENCE_END_TYPE))
		{
			return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
		}

		// Validate pattern-specific params
		let repeatOn = null;
		if (this.$recurrence_pattern === $Const.SHIFT_RECURRENCE_SPECIFIC_DAYS)
		{
			if (!this.$repeat_on || this.$repeat_on.length === 0)
			{
				return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
			}
			repeatOn = this.$repeat_on.map(d => parseInt(d)).filter(d => d >= 0 && d <= 6);
			if (repeatOn.length === 0)
			{
				return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
			}
		}

		let intervalDays = null;
		if (this.$recurrence_pattern === $Const.SHIFT_RECURRENCE_EVERY_X_DAYS)
		{
			intervalDays = this.$interval_days || 1;
			if (intervalDays < 1)
			{
				return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
			}
		}

		// Validate end condition
		let endDate = null;
		let occurrences = null;
		if (this.$end_type === $Const.SHIFT_RECURRENCE_END_DATE)
		{
			endDate = $Utils.validateDateStr(this.$end_date);
			if (!endDate)
			{
				return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
			}
		}
		else if (this.$end_type === $Const.SHIFT_RECURRENCE_OCCURRENCES)
		{
			occurrences = this.$occurrences || 0;
			if (occurrences < 1 || occurrences > MAX_OCCURRENCES)
			{
				return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
			}
		}

		let overnight = isOvernight(this.$start_time, this.$end_time) ? 1 : 0;
		let notes = null;
		if (!$Utils.empty(this.$notes))
		{
			notes = this.$notes.substring(0, MAX_NOTES_LENGTH);
		}

		// Validate officer IDs before transaction (batch — no DB in loop)
		let officerIds = [];
		if (this.$officer_ids && this.$officer_ids.length > 0)
		{
			officerIds = [...new Set(this.$officer_ids)];
			let invalidOfficers = validateOfficersBatch(officerIds, this.$community_id);
			if (invalidOfficers.length > 0)
			{
				return $ERRS.ERR_SHIFT_OFFICER_NOT_IN_COMMUNITY;
			}
		}

		// Generate recurring dates
		let dates = generateRecurringDates(startDate, this.$recurrence_pattern, repeatOn,
			intervalDays, this.$end_type, endDate, occurrences);

		if (dates.length === 0)
		{
			return $ERRS.ERR_SHIFT_INVALID_RECURRENCE;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Create series record
		$Db.executeQuery(
			`INSERT INTO \`shift_series\`
			 (SFS_COM_ID, SFS_RECURRENCE_PATTERN, SFS_REPEAT_ON, SFS_INTERVAL_DAYS,
			  SFS_END_TYPE, SFS_END_DATE, SFS_OCCURRENCES,
			  SFS_START_TIME, SFS_END_TIME, SFS_IS_OVERNIGHT, SFS_NOTES,
			  SFS_CREATED_BY, SFS_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			[this.$community_id, this.$recurrence_pattern,
			 repeatOn ? JSON.stringify(repeatOn) : null, intervalDays,
			 this.$end_type, endDate, occurrences,
			 this.$start_time, this.$end_time, overnight, notes,
			 userId, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let seriesId = $Db.insertId();

		// Bulk insert shifts
		let shiftPlaceholders = dates.map(() => "(?,?,?,?,?,?,?,?,?,?,?)").join(", ");
		let shiftParams = [];
		for (let i = 0; i < dates.length; i++)
		{
			shiftParams.push(
				this.$community_id, seriesId, dates[i],
				this.$start_time, this.$end_time, overnight,
				$Const.SHIFT_STATUS_DRAFT, notes, userId, now, null);
		}

		$Db.executeQuery(
			`INSERT INTO \`shift\`
			 (SFT_COM_ID, SFT_SERIES_ID, SFT_DATE, SFT_START_TIME, SFT_END_TIME, SFT_IS_OVERNIGHT,
			  SFT_STATUS, SFT_NOTES, SFT_CREATED_BY, SFT_CREATED_ON, SFT_DELETED_ON)
			 VALUES ${shiftPlaceholders}`,
			shiftParams);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let firstShiftId = $Db.insertId();

		// Bulk insert officer allocations for all shifts
		if (officerIds.length > 0)
		{
			let allocPlaceholders = [];
			let allocParams = [];
			for (let i = 0; i < dates.length; i++)
			{
				let sid = firstShiftId + i;
				for (let j = 0; j < officerIds.length; j++)
				{
					allocPlaceholders.push("(?,?,?)");
					allocParams.push(sid, officerIds[j], now);
				}
			}

			$Db.executeQuery(
				`INSERT INTO \`shift_officer\` (SFO_SFT_ID, SFO_OFC_USR_ID, SFO_CREATED_ON)
				 VALUES ${allocPlaceholders.join(", ")}`,
				allocParams);
			if ($Db.isError())
			{
				$Db.rollbackTransaction();
				return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
			}
		}

		$Db.commitTransaction();

		let shiftIds = [];
		for (let i = 0; i < dates.length; i++)
		{
			shiftIds.push(firstShiftId + i);
		}

		return {...$ERRS.ERR_SUCCESS, series_id: seriesId, shift_ids: shiftIds, shifts_created: dates.length};
	}

	// =========================================================================
	// Update Recurring Shifts
	// =========================================================================

	update_recurring_shifts()
	{
		let shift = fetchShiftRecord(this.$shift_id);
		if (!shift)
		{
			return $ERRS.ERR_SHIFT_NOT_FOUND;
		}

		if (!shift.SFT_SERIES_ID)
		{
			return $ERRS.ERR_SHIFT_SERIES_NOT_FOUND;
		}

		if (!$DataItems.isValidItemId(this.$scope, TABLE_UPDATE_SCOPE))
		{
			return $ERRS.ERR_INVALID_API_PARAM;
		}

		let updates = [];
		let params = [];

		let effectiveStart = (this.$start_time !== null && this.$start_time !== undefined) ? this.$start_time : shift.SFT_START_TIME;
		let effectiveEnd = (this.$end_time !== null && this.$end_time !== undefined) ? this.$end_time : shift.SFT_END_TIME;

		if (this.$start_time !== null && this.$start_time !== undefined)
		{
			if (!isValidTimeStr(this.$start_time)) return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			updates.push("SFT_START_TIME=?");
			params.push(this.$start_time);
		}

		if (this.$end_time !== null && this.$end_time !== undefined)
		{
			if (!isValidTimeStr(this.$end_time)) return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			updates.push("SFT_END_TIME=?");
			params.push(this.$end_time);
		}

		let startChanged = this.$start_time !== null && this.$start_time !== undefined;
		let endChanged = this.$end_time !== null && this.$end_time !== undefined;
		if (startChanged || endChanged)
		{
			if (!validateTimeRange(effectiveStart, effectiveEnd))
			{
				return $ERRS.ERR_SHIFT_INVALID_TIME_RANGE;
			}
			updates.push("SFT_IS_OVERNIGHT=?");
			params.push(isOvernight(effectiveStart, effectiveEnd) ? 1 : 0);
		}

		if (this.$notes !== null && this.$notes !== undefined)
		{
			updates.push("SFT_NOTES=?");
			params.push($Utils.empty(this.$notes) ? null : this.$notes.substring(0, MAX_NOTES_LENGTH));
		}

		if (updates.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("SFT_LAST_UPDATE=?");
		params.push(now);

		let editableStatuses = [$Const.SHIFT_STATUS_DRAFT, $Const.SHIFT_STATUS_PUBLISHED];
		params.push(...editableStatuses);

		let scopeCondition = "";
		if (this.$scope === $Const.SHIFT_UPDATE_THIS_ONLY)
		{
			scopeCondition = "AND SFT_ID=?";
			params.push(this.$shift_id);
		}
		else if (this.$scope === $Const.SHIFT_UPDATE_THIS_AND_FUTURE)
		{
			scopeCondition = "AND SFT_SERIES_ID=? AND SFT_DATE >= ?";
			params.push(shift.SFT_SERIES_ID, shift.SFT_DATE);
		}
		else if (this.$scope === $Const.SHIFT_UPDATE_ALL)
		{
			scopeCondition = "AND SFT_SERIES_ID=?";
			params.push(shift.SFT_SERIES_ID);
		}

		$Db.executeQuery(
			`UPDATE \`shift\` SET ${updates.join(", ")}
			 WHERE SFT_DELETED_ON IS NULL AND SFT_STATUS IN (${editableStatuses.toPlaceholders()}) ${scopeCondition}`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify officers on published shifts in the series
		let affectedPublished = $Db.executeQuery(
			`SELECT DISTINCT so.SFO_OFC_USR_ID
			 FROM \`shift\` s
			    JOIN \`shift_officer\` so ON s.SFT_ID = so.SFO_SFT_ID AND so.SFO_DELETED_ON IS NULL
			 WHERE s.SFT_SERIES_ID=? AND s.SFT_STATUS=? AND s.SFT_DELETED_ON IS NULL`,
			[shift.SFT_SERIES_ID, $Const.SHIFT_STATUS_PUBLISHED]);

		if (affectedPublished.length > 0)
		{
			let notifyIds = affectedPublished.map(r => r.SFO_OFC_USR_ID);
			sendShiftNotification(this.$Session, "shift_updated", shift,
				{shift_date: String(shift.SFT_DATE)},
				notifyIds, shift.SFT_COM_ID);
		}

		return $ERRS.ERR_SUCCESS;
	}
};
