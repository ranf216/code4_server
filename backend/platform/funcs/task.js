const MAX_IMAGES_COUNT = 5;
const MAX_VIDEO_COUNT = 1;
const TABLE_STATUS = "task_status";
const TABLE_PRIORITY = "task_priority";
const TABLE_TYPE = "task_type";
const TABLE_APPROVAL_TYPES = "task_approval_types";
const TABLE_ALLOWED_DOC_MIMES = "task_allowed_document_mimes";

function fetchTaskRecord(taskId)
{
	let rows = $Db.executeQuery(
		`SELECT TSK_ID, TSK_COM_ID, TSK_TYPE, TSK_STATUS, TSK_PRIORITY,
		        TSK_DESCRIPTION, TSK_ADDRESS, TSK_CREATED_BY, TSK_ASSIGNED_TO,
		        TSK_ACCEPTED_BY, TSK_ETA,
		        TSK_ACCEPTED_ON, TSK_COMPLETED_ON, TSK_REJECTED_ON, TSK_CANCELED_ON,
		        TSK_CREATED_ON, TSK_LAST_UPDATE, TSK_DELETED_ON
		 FROM \`task\`
		 WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
		[taskId]);
	return rows.length > 0 ? rows[0] : null;
}

function getUserName(userId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_FIRST_NAME, USD_LAST_NAME FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
		[userId]);
	if (rows.length === 0)
	{
		return "Unknown";
	}
	return (rows[0].USD_FIRST_NAME + " " + (rows[0].USD_LAST_NAME || "")).trim();
}

function getOfficerCommunityId(userId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_COM_ID FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
		[userId]);
	return rows.length > 0 ? rows[0].USD_COM_ID : null;
}

function isValidAssignee(userId)
{
	let rows = $Db.executeQuery(
		`SELECT USR_ID FROM \`user\`
		    JOIN \`user_details\` ON USR_ID = USD_USR_ID
		 WHERE USR_ID=? AND USR_STATUS=? AND USD_DELETED_ON IS NULL`,
		[userId, $Const.USER_STATUS_ACTIVE]);
	return rows.length > 0;
}

function resolveDefaultAssignee(communityId)
{
	// 1. Find the oldest active admin with Manager role in this community
	let rows = $Db.executeQuery(
		`SELECT USD_USR_ID, USD_TYPE, USD_ROLE_ALLOW, USD_ROLE_DENY
		 FROM \`user_details\`
		    JOIN \`user\` ON USR_ID = USD_USR_ID
		 WHERE USD_COM_ID=?
		   AND USD_TYPE=?
		   AND USD_STATUS=?
		   AND USD_DELETED_ON IS NULL
		 ORDER BY \`user\`.USR_CREATED_ON ASC`,
		[communityId, $Const.USER_TYPE_ADMIN, $Const.USER_STATUS_ACTIVE]);

	for (let i = 0; i < rows.length; i++)
	{
		let userInfo = {userType: rows[i].USD_TYPE, allowRolesBits: rows[i].USD_ROLE_ALLOW, denyRolesBits: rows[i].USD_ROLE_DENY};
		if ($UserRoles.doesUserHaveRole(userInfo, $Const.USER_ROLE_MANAGER))
		{
			return rows[i].USD_USR_ID;
		}
	}

	// 2. Fallback: oldest active Super Admin in the system
	rows = $Db.executeQuery(
		`SELECT USD_USR_ID, USD_TYPE, USD_ROLE_ALLOW, USD_ROLE_DENY
		 FROM \`user_details\`
		    JOIN \`user\` ON USR_ID = USD_USR_ID
		 WHERE USD_TYPE=?
		   AND USD_STATUS=?
		   AND USD_DELETED_ON IS NULL
		 ORDER BY \`user\`.USR_CREATED_ON ASC`,
		[$Const.USER_TYPE_ADMIN, $Const.USER_STATUS_ACTIVE]);

	for (let i = 0; i < rows.length; i++)
	{
		let userInfo = {userType: rows[i].USD_TYPE, allowRolesBits: rows[i].USD_ROLE_ALLOW, denyRolesBits: rows[i].USD_ROLE_DENY};
		if ($UserRoles.doesUserHaveRole(userInfo, $Const.USER_ROLE_SUPER_ADMIN))
		{
			return rows[i].USD_USR_ID;
		}
	}

	return null;
}

function isOpenStatus(status)
{
	return $DataItems.getItemAttr(status, TABLE_STATUS, "is_open") === true;
}

function openStatusIds()
{
	return Object.keys($DataItems.filterItemsIdByAttr("is_open", true, TABLE_STATUS) || {});
}

function resolveFileIds(fileIds)
{
	if (!fileIds || fileIds.length === 0)
	{
		return {file_names: []};
	}
	let fileRows = $Db.executeQuery(
		`SELECT FIL_ID, FIL_FILE_NAME FROM \`file\` WHERE FIL_ID IN (${fileIds.toPlaceholders()})`,
		fileIds);
	if (fileRows.length !== fileIds.length)
	{
		return $ERRS.ERR_FILE_NOT_FOUND;
	}
	return {file_names: fileRows.map(r => r.FIL_FILE_NAME)};
}

function resolveDocumentFileIds(fileIds)
{
	if (!fileIds || fileIds.length === 0)
	{
		return {file_names: []};
	}
	let fileRows = $Db.executeQuery(
		`SELECT FIL_ID, FIL_FILE_NAME, FIL_MIME_TYPE FROM \`file\` WHERE FIL_ID IN (${fileIds.toPlaceholders()})`,
		fileIds);
	if (fileRows.length !== fileIds.length)
	{
		return $ERRS.ERR_FILE_NOT_FOUND;
	}
	for (let i = 0; i < fileRows.length; i++)
	{
		if (!$DataItems.isValidItemId(fileRows[i].FIL_MIME_TYPE, TABLE_ALLOWED_DOC_MIMES))
		{
			return $ERRS.ERR_INVALID_FILE_TYPE;
		}
	}
	return {file_names: fileRows.map(r => r.FIL_FILE_NAME)};
}

function insertTaskMedia(taskId, userId, fileNames, mediaType, isConfirmation)
{
	if (!fileNames || fileNames.length === 0)
	{
		return null;
	}
	let now = $Utils.now();
	let placeholders = fileNames.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
	let params = [];
	for (let i = 0; i < fileNames.length; i++)
	{
		params.push(taskId, userId, fileNames[i], mediaType, isConfirmation ? 1 : 0, now);
	}
	$Db.executeQuery(
		`INSERT INTO \`task_media\` (TMD_TSK_ID, TMD_USR_ID, TMD_FILE_NAME, TMD_MEDIA_TYPE, TMD_IS_CONFIRMATION, TMD_CREATED_ON) VALUES ${placeholders}`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function getTaskMedia(taskId)
{
	let rows = $Db.executeQuery(
		`SELECT TMD_ID, TMD_FILE_NAME, TMD_MEDIA_TYPE, TMD_IS_CONFIRMATION, TMD_USR_ID, TMD_CREATED_ON
		 FROM \`task_media\`
		 WHERE TMD_TSK_ID=? AND TMD_DELETED_ON IS NULL
		 ORDER BY TMD_CREATED_ON ASC`,
		[taskId]);
	return rows.map(r => ({
		media_id: r.TMD_ID,
		url: $Files.getUrl({file_name: r.TMD_FILE_NAME}),
		media_type: r.TMD_MEDIA_TYPE,
		is_confirmation: r.TMD_IS_CONFIRMATION === 1,
		uploaded_by: r.TMD_USR_ID,
		created_on: r.TMD_CREATED_ON
	}));
}

function getTaskComments(taskId)
{
	let rows = $Db.executeQuery(
		`SELECT tc.TCM_ID, tc.TCM_USR_ID, tc.TCM_TEXT, tc.TCM_CREATED_ON,
		        ud.USD_FIRST_NAME, ud.USD_LAST_NAME
		 FROM \`task_comment\` tc
		    LEFT OUTER JOIN \`user_details\` ud ON tc.TCM_USR_ID = ud.USD_USR_ID
		 WHERE tc.TCM_TSK_ID=? AND tc.TCM_DELETED_ON IS NULL
		 ORDER BY tc.TCM_CREATED_ON ASC`,
		[taskId]);
	return rows.map(r => ({
		comment_id: r.TCM_ID,
		user_id: r.TCM_USR_ID,
		user_name: buildFullName(r.USD_FIRST_NAME, r.USD_LAST_NAME) || "Unknown",
		text: r.TCM_TEXT,
		created_on: r.TCM_CREATED_ON
	}));
}

function buildFullName(firstName, lastName)
{
	return ((firstName || "") + " " + (lastName || "")).trim() || null;
}

function mapTaskRow(row)
{
	return {
		task_id: row.TSK_ID,
		community_id: row.TSK_COM_ID,
		community_name: row.COM_NAME || null,
		task_type: row.TSK_TYPE,
		task_type_name: $DataItems.getItemName(row.TSK_TYPE, TABLE_TYPE) || row.TSK_TYPE,
		status: row.TSK_STATUS,
		priority: row.TSK_PRIORITY,
		description: row.TSK_DESCRIPTION || "",
		address: row.TSK_ADDRESS || null,
		created_by: row.TSK_CREATED_BY,
		created_by_name: buildFullName(row.CREATOR_FIRST_NAME, row.CREATOR_LAST_NAME),
		assigned_to: row.TSK_ASSIGNED_TO,
		assigned_to_name: buildFullName(row.ASSIGNEE_FIRST_NAME, row.ASSIGNEE_LAST_NAME),
		accepted_by: row.TSK_ACCEPTED_BY || null,
		eta: row.TSK_ETA || null,
		accepted_on: row.TSK_ACCEPTED_ON || null,
		completed_on: row.TSK_COMPLETED_ON || null,
		rejected_on: row.TSK_REJECTED_ON || null,
		canceled_on: row.TSK_CANCELED_ON || null,
		created_on: row.TSK_CREATED_ON,
		last_update: row.TSK_LAST_UPDATE || null,
	};
}

function sendTaskNotification(session, type, task, templateVars, targetUserIds, communityId)
{
	if (!targetUserIds || targetUserIds.length === 0)
	{
		return;
	}

	// Deduplicate and remove null/empty
	let uniqueIds = [...new Set(targetUserIds.filter(id => !$Utils.empty(id)))];
	if (uniqueIds.length === 0)
	{
		return;
	}

	$executeAPI(session, "Notification/create_bulk_notifications", {
		target_user_ids: uniqueIds,
		type: type,
		template_vars: JSON.stringify(templateVars),
		payload: JSON.stringify({entity_type: "task", entity_id: task.TSK_ID}),
		community_id: communityId || task.TSK_COM_ID,
		send_push: true
	});
}


module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
	}

	// =========================================================================
	// Create Task
	// =========================================================================

	create_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		// Validate task_type
		if (!$DataItems.isValidItemId(this.$task_type, TABLE_TYPE))
		{
			return $ERRS.ERR_TASK_INVALID_TYPE;
		}

		// Validate priority
		if (!$DataItems.isValidItemId(this.$priority, TABLE_PRIORITY))
		{
			return $ERRS.ERR_TASK_INVALID_PRIORITY;
		}

		// Determine community
		let communityId;
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			communityId = getOfficerCommunityId(userId);
			if (!communityId)
			{
				return $ERRS.ERR_COMMUNITY_NOT_FOUND;
			}
		}
		else
		{
			// Admin: determine community from assignee (if provided) or from creator
			if (!$Utils.empty(this.$assigned_to))
			{
				communityId = getOfficerCommunityId(this.$assigned_to);
			}
			if (!communityId)
			{
				communityId = getOfficerCommunityId(userId);
			}
			if (!communityId)
			{
				return $ERRS.ERR_COMMUNITY_NOT_FOUND;
			}
		}

		// Resolve assignee: explicit or server-side default manager fallback
		let assignedTo = this.$assigned_to;
		if ($Utils.empty(assignedTo))
		{
			assignedTo = resolveDefaultAssignee(communityId);
			if (!assignedTo)
			{
				return $ERRS.ERR_TASK_ASSIGNEE_NOT_FOUND;
			}
		}
		else
		{
			if (!isValidAssignee(assignedTo))
			{
				return $ERRS.ERR_TASK_ASSIGNEE_NOT_FOUND;
			}
		}

		// Resolve media files
		let mediaFileNames = [];
		if (this.$media_file_ids && this.$media_file_ids.length > 0)
		{
			if (this.$media_file_ids.length > MAX_IMAGES_COUNT)
			{
				return $ERRS.ERR_TASK_MEDIA_LIMIT_REACHED;
			}
			let rv = resolveFileIds(this.$media_file_ids);
			if ($Err.isERR(rv)) return rv;
			mediaFileNames = rv.file_names;
		}

		// Resolve video file
		let videoFileName = null;
		if (!$Utils.empty(this.$video_file_id))
		{
			let rv = resolveFileIds([this.$video_file_id]);
			if ($Err.isERR(rv)) return rv;
			videoFileName = rv.file_names[0];
		}

		// Resolve document files
		let documentFileNames = [];
		if (this.$document_file_ids && this.$document_file_ids.length > 0)
		{
			let rv = resolveDocumentFileIds(this.$document_file_ids);
			if ($Err.isERR(rv)) return rv;
			documentFileNames = rv.file_names;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Insert task
		$Db.executeQuery(
			`INSERT INTO \`task\`
			 (TSK_COM_ID, TSK_TYPE, TSK_STATUS, TSK_PRIORITY, TSK_DESCRIPTION,
			  TSK_ADDRESS, TSK_CREATED_BY, TSK_ASSIGNED_TO, TSK_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			[communityId,
			 this.$task_type,
			 $Const.TASK_STATUS_NEW,
			 this.$priority,
			 this.$description || "",
			 this.$address || null,
			 userId,
			 assignedTo,
			 now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let taskId = $Db.insertId();

		// Insert media
		let mediaErr = insertTaskMedia(taskId, userId, mediaFileNames, "image", false);
		if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }
		if (videoFileName)
		{
			mediaErr = insertTaskMedia(taskId, userId, [videoFileName], "video", false);
			if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }
		}
		mediaErr = insertTaskMedia(taskId, userId, documentFileNames, "document", false);
		if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }

		$Db.commitTransaction();

		// Send notification to assignee
		let creatorName = getUserName(userId);
		let taskTypeName = $DataItems.getItemName(this.$task_type, TABLE_TYPE) || this.$task_type;

		if (assignedTo !== userId)
		{
			sendTaskNotification(this.$Session, "new_task",
				{TSK_ID: taskId, TSK_COM_ID: communityId},
				{task_id: String(taskId), task_type: taskTypeName, creator_name: creatorName},
				[assignedTo], communityId);
		}

		return {...$ERRS.ERR_SUCCESS, task_id: taskId};
	}

	// =========================================================================
	// Get Tasks List
	// =========================================================================

	get_tasks_list()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let conditions = ["t.TSK_DELETED_ON IS NULL"];
		let params = [];

		// Community scoping
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let communityId = getOfficerCommunityId(userId);
			if (!communityId)
			{
				return {...$ERRS.ERR_SUCCESS, tasks: [], total_count: 0};
			}
			conditions.push("t.TSK_COM_ID=?");
			params.push(communityId);
		}
		else if (this.$community_id > 0)
		{
			conditions.push("t.TSK_COM_ID=?");
			params.push(this.$community_id);
		}

		// Status filter
		if (!$Utils.empty(this.$status))
		{
			if (!$DataItems.isValidItemId(this.$status, TABLE_STATUS))
			{
				return $ERRS.ERR_TASK_INVALID_STATUS;
			}
			conditions.push("t.TSK_STATUS=?");
			params.push(this.$status);
		}

		// Open/closed filter — implements the 24-hour history rule (SDS 3.8.3.1):
		// Active feed: open statuses + completed tasks less than 24h old.
		// History feed: canceled + rejected immediately, completed only after 24h.
		if (this.$is_open !== null && this.$is_open !== undefined && this.$is_open !== "")
		{
			let openIds = openStatusIds();
			let closedIds = Object.keys($DataItems.filterItemsIdByAttr("is_open", false, TABLE_STATUS) || {});
			let cutoff = new $Date().addHours(-24).format("Y-m-d H:i:s");

			if (this.$is_open)
			{
				// Active: open statuses OR (completed AND completed_on within last 24h)
				if (openIds.length > 0)
				{
					conditions.push(
						`(t.TSK_STATUS IN (${openIds.toPlaceholders()}) OR (t.TSK_STATUS=? AND t.TSK_COMPLETED_ON > ?))`);
					params.push(...openIds, $Const.TASK_STATUS_COMPLETED, cutoff);
				}
			}
			else
			{
				// History: canceled + rejected immediately, completed only after 24h
				let immediateHistoryIds = closedIds.filter(s => s !== $Const.TASK_STATUS_COMPLETED);
				if (immediateHistoryIds.length > 0)
				{
					conditions.push(
						`(t.TSK_STATUS IN (${immediateHistoryIds.toPlaceholders()}) OR (t.TSK_STATUS=? AND t.TSK_COMPLETED_ON <= ?))`);
					params.push(...immediateHistoryIds, $Const.TASK_STATUS_COMPLETED, cutoff);
				}
				else
				{
					conditions.push(`(t.TSK_STATUS=? AND t.TSK_COMPLETED_ON <= ?)`);
					params.push($Const.TASK_STATUS_COMPLETED, cutoff);
				}
			}
		}

		// Task type filter
		if (!$Utils.empty(this.$task_type))
		{
			conditions.push("t.TSK_TYPE=?");
			params.push(this.$task_type);
		}

		// Priority filter
		if (!$Utils.empty(this.$priority))
		{
			conditions.push("t.TSK_PRIORITY=?");
			params.push(this.$priority);
		}

		// Scope filter (officer: assigned_to_me, created_by_me, all)
		if (!$Utils.empty(this.$scope) && this.$scope !== "all")
		{
			if (this.$scope === "assigned_to_me")
			{
				conditions.push("t.TSK_ASSIGNED_TO=?");
				params.push(userId);
			}
			else if (this.$scope === "created_by_me")
			{
				conditions.push("t.TSK_CREATED_BY=?");
				params.push(userId);
			}
		}

		// Date range filter
		if (!$Utils.empty(this.$date_from))
		{
			conditions.push("t.TSK_CREATED_ON >= ?");
			params.push(this.$date_from + " 00:00:00");
		}
		if (!$Utils.empty(this.$date_to))
		{
			conditions.push("t.TSK_CREATED_ON <= ?");
			params.push(this.$date_to + " 23:59:59");
		}

		// Free-text search
		if (!$Utils.empty(this.$search_text))
		{
			let searchParam = "%" + this.$search_text + "%";
			conditions.push("(t.TSK_DESCRIPTION LIKE ? OR t.TSK_ADDRESS LIKE ? OR creator_ud.USD_FIRST_NAME LIKE ? OR creator_ud.USD_LAST_NAME LIKE ? OR assignee_ud.USD_FIRST_NAME LIKE ? OR assignee_ud.USD_LAST_NAME LIKE ?)");
			params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
		}

		let whereClause = conditions.join(" AND ");

		// Sort
		let sortColumn = "t.TSK_CREATED_ON";
		let validSorts = {created_on: "t.TSK_CREATED_ON", priority: "t.TSK_PRIORITY", status: "t.TSK_STATUS", task_type: "t.TSK_TYPE"};
		if (this.$sort_by && validSorts[this.$sort_by])
		{
			sortColumn = validSorts[this.$sort_by];
		}
		let sortDir = (this.$sort_dir === "asc") ? "ASC" : "DESC";

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`task\` t
			    LEFT OUTER JOIN \`user_details\` creator_ud ON t.TSK_CREATED_BY = creator_ud.USD_USR_ID
			    LEFT OUTER JOIN \`user_details\` assignee_ud ON t.TSK_ASSIGNED_TO = assignee_ud.USD_USR_ID
			 WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		// Limit / offset
		let limit = Math.min(Math.max(this.$limit || 20, 1), 100);
		let offset = Math.max(this.$offset || 0, 0);

		// Fetch page
		let rows = $Db.executeQuery(
			`SELECT t.TSK_ID, t.TSK_COM_ID, t.TSK_TYPE, t.TSK_STATUS, t.TSK_PRIORITY,
			        t.TSK_DESCRIPTION, t.TSK_ADDRESS, t.TSK_CREATED_BY, t.TSK_ASSIGNED_TO,
			        t.TSK_ACCEPTED_BY, t.TSK_ETA,
			        t.TSK_ACCEPTED_ON, t.TSK_COMPLETED_ON, t.TSK_REJECTED_ON, t.TSK_CANCELED_ON,
			        t.TSK_CREATED_ON, t.TSK_LAST_UPDATE,
			        c.COM_NAME,
			        creator_ud.USD_FIRST_NAME CREATOR_FIRST_NAME,
			        creator_ud.USD_LAST_NAME CREATOR_LAST_NAME,
			        assignee_ud.USD_FIRST_NAME ASSIGNEE_FIRST_NAME,
			        assignee_ud.USD_LAST_NAME ASSIGNEE_LAST_NAME
			 FROM \`task\` t
			    LEFT OUTER JOIN \`community\` c ON t.TSK_COM_ID = c.COM_ID
			    LEFT OUTER JOIN \`user_details\` creator_ud ON t.TSK_CREATED_BY = creator_ud.USD_USR_ID
			    LEFT OUTER JOIN \`user_details\` assignee_ud ON t.TSK_ASSIGNED_TO = assignee_ud.USD_USR_ID
			 WHERE ${whereClause}
			 ORDER BY ${sortColumn} ${sortDir}
			 LIMIT ${limit} OFFSET ${offset}`,
			params);

		let tasks = rows.map(row => mapTaskRow(row));

		return {...$ERRS.ERR_SUCCESS, tasks: tasks, total_count: totalCount};
	}

	// =========================================================================
	// Get Task
	// =========================================================================

	get_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let rows = $Db.executeQuery(
			`SELECT t.TSK_ID, t.TSK_COM_ID, t.TSK_TYPE, t.TSK_STATUS, t.TSK_PRIORITY,
			        t.TSK_DESCRIPTION, t.TSK_ADDRESS, t.TSK_CREATED_BY, t.TSK_ASSIGNED_TO,
			        t.TSK_ACCEPTED_BY, t.TSK_ETA,
			        t.TSK_ACCEPTED_ON, t.TSK_COMPLETED_ON, t.TSK_REJECTED_ON, t.TSK_CANCELED_ON,
			        t.TSK_CREATED_ON, t.TSK_LAST_UPDATE,
			        c.COM_NAME,
			        creator_ud.USD_FIRST_NAME CREATOR_FIRST_NAME,
			        creator_ud.USD_LAST_NAME CREATOR_LAST_NAME,
			        assignee_ud.USD_FIRST_NAME ASSIGNEE_FIRST_NAME,
			        assignee_ud.USD_LAST_NAME ASSIGNEE_LAST_NAME
			 FROM \`task\` t
			    LEFT OUTER JOIN \`community\` c ON t.TSK_COM_ID = c.COM_ID
			    LEFT OUTER JOIN \`user_details\` creator_ud ON t.TSK_CREATED_BY = creator_ud.USD_USR_ID
			    LEFT OUTER JOIN \`user_details\` assignee_ud ON t.TSK_ASSIGNED_TO = assignee_ud.USD_USR_ID
			 WHERE t.TSK_ID=? AND t.TSK_DELETED_ON IS NULL`,
			[this.$task_id]);
		if (rows.length === 0)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		let row = rows[0];

		// Officers can only view tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (row.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		let task = mapTaskRow(row);
		task.comments = getTaskComments(this.$task_id);
		task.media = getTaskMedia(this.$task_id);

		return {...$ERRS.ERR_SUCCESS, task: task};
	}

	// =========================================================================
	// Update Task
	// =========================================================================

	update_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Must be in an open status
		if (!isOpenStatus(task.TSK_STATUS))
		{
			return $ERRS.ERR_TASK_INVALID_STATUS;
		}

		// Officers can only update tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (task.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		let updates = [];
		let params = [];

		if (this.$description !== null && this.$description !== undefined)
		{
			updates.push("TSK_DESCRIPTION=?");
			params.push(this.$description);
		}

		if (this.$priority !== null && this.$priority !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$priority, TABLE_PRIORITY))
			{
				return $ERRS.ERR_TASK_INVALID_PRIORITY;
			}
			updates.push("TSK_PRIORITY=?");
			params.push(this.$priority);
		}

		if (this.$address !== null && this.$address !== undefined)
		{
			updates.push("TSK_ADDRESS=?");
			params.push(this.$address);
		}

		// ETA — admin only
		if (this.$eta !== null && this.$eta !== undefined)
		{
			if (userType !== $Const.USER_TYPE_ADMIN)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
			let etaVal = $Utils.empty(this.$eta) ? null : this.$eta;
			updates.push("TSK_ETA=?");
			params.push(etaVal);
		}

		if (updates.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("TSK_LAST_UPDATE=?");
		params.push(now);
		params.push(this.$task_id);

		$Db.executeQuery(
			`UPDATE \`task\` SET ${updates.join(", ")} WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify relevant parties
		let userName = getUserName(userId);
		let notifyTargets = [task.TSK_CREATED_BY, task.TSK_ASSIGNED_TO].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_update", task,
			{task_id: String(task.TSK_ID), user_name: userName},
			notifyTargets, task.TSK_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Accept Task
	// =========================================================================

	accept_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Officers can only accept tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (task.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		// Must be in status 'new'
		if (task.TSK_STATUS !== $Const.TASK_STATUS_NEW)
		{
			return $ERRS.ERR_TASK_CANNOT_ACCEPT;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`task\`
			 SET TSK_STATUS=?, TSK_ASSIGNED_TO=?, TSK_ACCEPTED_BY=?, TSK_ACCEPTED_ON=?, TSK_LAST_UPDATE=?
			 WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[$Const.TASK_STATUS_ACCEPTED, userId, userId, now, now, this.$task_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify the creator
		let officerName = getUserName(userId);
		let notifyTargets = [task.TSK_CREATED_BY].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_accepted", task,
			{task_id: String(task.TSK_ID), officer_name: officerName},
			notifyTargets, task.TSK_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Approve Task
	// =========================================================================

	approve_task()
	{
		let userId = this.$Session.userId;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Task must be in "accepted" status to transition to "approved"
		if (task.TSK_STATUS !== $Const.TASK_STATUS_ACCEPTED)
		{
			return $ERRS.ERR_TASK_INVALID_STATUS;
		}

		// Only task types that require approval can be approved
		if (!$DataItems.isValidItemId(task.TSK_TYPE, TABLE_APPROVAL_TYPES))
		{
			return $ERRS.ERR_TASK_INVALID_STATUS;
		}

		let updates = ["TSK_STATUS=?"];
		let params = [$Const.TASK_STATUS_APPROVED];

		// Optional atomic reassignment (approve + reassign in one call)
		if (!$Utils.empty(this.$assigned_to))
		{
			if (!isValidAssignee(this.$assigned_to))
			{
				return $ERRS.ERR_TASK_ASSIGNEE_NOT_FOUND;
			}
			updates.push("TSK_ASSIGNED_TO=?");
			params.push(this.$assigned_to);
		}

		let now = $Utils.now();
		updates.push("TSK_LAST_UPDATE=?");
		params.push(now);
		params.push(this.$task_id);

		$Db.executeQuery(
			`UPDATE \`task\` SET ${updates.join(", ")} WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify relevant parties
		let userName = getUserName(userId);
		let notifyTargets = [task.TSK_CREATED_BY, task.TSK_ASSIGNED_TO];

		// If reassigned, also notify the new assignee
		if (!$Utils.empty(this.$assigned_to) && this.$assigned_to !== task.TSK_ASSIGNED_TO)
		{
			notifyTargets.push(this.$assigned_to);
		}

		notifyTargets = notifyTargets.filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_update", task,
			{task_id: String(task.TSK_ID), user_name: userName},
			notifyTargets, task.TSK_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Reject Task
	// =========================================================================

	reject_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Officers can only reject tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (task.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		// Must be in an open status (new or accepted)
		if (task.TSK_STATUS !== $Const.TASK_STATUS_NEW && task.TSK_STATUS !== $Const.TASK_STATUS_ACCEPTED)
		{
			return $ERRS.ERR_TASK_CANNOT_REJECT;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Add rejection comment
		$Db.executeQuery(
			`INSERT INTO \`task_comment\` (TCM_TSK_ID, TCM_USR_ID, TCM_TEXT, TCM_CREATED_ON) VALUES (?,?,?,?)`,
			[this.$task_id, userId, this.$comment, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		// Update task status
		$Db.executeQuery(
			`UPDATE \`task\`
			 SET TSK_STATUS=?, TSK_REJECTED_ON=?, TSK_LAST_UPDATE=?
			 WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[$Const.TASK_STATUS_REJECTED, now, now, this.$task_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		// Notify the creator
		let officerName = getUserName(userId);
		let notifyTargets = [task.TSK_CREATED_BY].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_rejected", task,
			{task_id: String(task.TSK_ID), officer_name: officerName},
			notifyTargets, task.TSK_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Complete Task
	// =========================================================================

	complete_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Officers can only complete tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (task.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		// Must be in accepted or approved status
		if (task.TSK_STATUS !== $Const.TASK_STATUS_ACCEPTED && task.TSK_STATUS !== $Const.TASK_STATUS_APPROVED)
		{
			return $ERRS.ERR_TASK_CANNOT_COMPLETE;
		}

		// Resolve confirmation media BEFORE transaction (SELECTs must precede writes)
		let confirmMediaFileNames = [];
		if (this.$confirmation_media_file_ids && this.$confirmation_media_file_ids.length > 0)
		{
			if (this.$confirmation_media_file_ids.length > MAX_IMAGES_COUNT)
			{
				return $ERRS.ERR_TASK_MEDIA_LIMIT_REACHED;
			}
			let rv = resolveFileIds(this.$confirmation_media_file_ids);
			if ($Err.isERR(rv)) return rv;
			confirmMediaFileNames = rv.file_names;
		}

		let confirmVideoFileName = null;
		if (!$Utils.empty(this.$confirmation_video_file_id))
		{
			let rv = resolveFileIds([this.$confirmation_video_file_id]);
			if ($Err.isERR(rv)) return rv;
			confirmVideoFileName = rv.file_names[0];
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Add resolution comment if provided
		if (!$Utils.empty(this.$comment))
		{
			$Db.executeQuery(
				`INSERT INTO \`task_comment\` (TCM_TSK_ID, TCM_USR_ID, TCM_TEXT, TCM_CREATED_ON) VALUES (?,?,?,?)`,
				[this.$task_id, userId, this.$comment, now]);
			if ($Db.isError())
			{
				$Db.rollbackTransaction();
				return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
			}
		}

		// Insert confirmation media
		let mediaErr = insertTaskMedia(this.$task_id, userId, confirmMediaFileNames, "image", true);
		if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }

		if (confirmVideoFileName)
		{
			mediaErr = insertTaskMedia(this.$task_id, userId, [confirmVideoFileName], "video", true);
			if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }
		}

		// Update task status
		$Db.executeQuery(
			`UPDATE \`task\`
			 SET TSK_STATUS=?, TSK_COMPLETED_ON=?, TSK_LAST_UPDATE=?
			 WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[$Const.TASK_STATUS_COMPLETED, now, now, this.$task_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		// Notify the creator
		let officerName = getUserName(userId);
		let notifyTargets = [task.TSK_CREATED_BY].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_completed", task,
			{task_id: String(task.TSK_ID), officer_name: officerName},
			notifyTargets, task.TSK_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Cancel Task
	// =========================================================================

	cancel_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Must be in an open status
		if (!isOpenStatus(task.TSK_STATUS))
		{
			return $ERRS.ERR_TASK_CANNOT_CANCEL;
		}

		// Officers can only cancel tasks they created and only while status is new
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			if (task.TSK_CREATED_BY !== userId)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
			if (task.TSK_STATUS !== $Const.TASK_STATUS_NEW)
			{
				return $ERRS.ERR_TASK_CANNOT_CANCEL;
			}
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`task\`
			 SET TSK_STATUS=?, TSK_CANCELED_ON=?, TSK_LAST_UPDATE=?
			 WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[$Const.TASK_STATUS_CANCELED, now, now, this.$task_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify the assignee
		let userName = getUserName(userId);
		let notifyTargets = [task.TSK_ASSIGNED_TO].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_canceled", task,
			{task_id: String(task.TSK_ID), user_name: userName},
			notifyTargets, task.TSK_COM_ID);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Reassign Task
	// =========================================================================

	reassign_task()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Must be in an open status
		if (!isOpenStatus(task.TSK_STATUS))
		{
			return $ERRS.ERR_TASK_CANNOT_REASSIGN;
		}

		// Validate new assignee
		if (!isValidAssignee(this.$assigned_to))
		{
			return $ERRS.ERR_TASK_ASSIGNEE_NOT_FOUND;
		}

		// Officers can only reassign if they are the current assignee or creator
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			if (task.TSK_ASSIGNED_TO !== userId && task.TSK_CREATED_BY !== userId)
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`task\`
			 SET TSK_ASSIGNED_TO=?, TSK_LAST_UPDATE=?
			 WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[this.$assigned_to, now, this.$task_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Notify the new assignee
		let userName = getUserName(userId);
		let notifyTargets = [this.$assigned_to].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_reassigned", task,
			{task_id: String(task.TSK_ID), user_name: userName},
			notifyTargets, task.TSK_COM_ID);

		// Also notify the previous assignee if different
		if (task.TSK_ASSIGNED_TO !== this.$assigned_to && task.TSK_ASSIGNED_TO !== userId)
		{
			sendTaskNotification(this.$Session, "task_reassigned", task,
				{task_id: String(task.TSK_ID), user_name: userName},
				[task.TSK_ASSIGNED_TO], task.TSK_COM_ID);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Add Task Comment
	// =========================================================================

	add_task_comment()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Officers can only comment on tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (task.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`task_comment\` (TCM_TSK_ID, TCM_USR_ID, TCM_TEXT, TCM_CREATED_ON) VALUES (?,?,?,?)`,
			[this.$task_id, userId, this.$comment, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let commentId = $Db.insertId();

		// Update task last_update
		$Db.executeQuery(
			`UPDATE \`task\` SET TSK_LAST_UPDATE=? WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[now, this.$task_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		// Notify relevant parties
		let userName = getUserName(userId);
		let notifyTargets = [task.TSK_CREATED_BY, task.TSK_ASSIGNED_TO].filter(id => id !== userId);
		sendTaskNotification(this.$Session, "task_commented", task,
			{task_id: String(task.TSK_ID), user_name: userName},
			notifyTargets, task.TSK_COM_ID);

		return {...$ERRS.ERR_SUCCESS, comment_id: commentId};
	}

	// =========================================================================
	// Add Task Media
	// =========================================================================

	add_task_media()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let task = fetchTaskRecord(this.$task_id);
		if (!task)
		{
			return $ERRS.ERR_TASK_NOT_FOUND;
		}

		// Officers can only add media to tasks in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (task.TSK_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_TASK_NOT_FOUND;
			}
		}

		let isConfirmation = this.$is_confirmation === true || this.$is_confirmation === "true";

		// Resolve all files BEFORE transaction (SELECTs must precede writes)
		let imageFileNames = [];
		if (this.$media_file_ids && this.$media_file_ids.length > 0)
		{
			if (this.$media_file_ids.length > MAX_IMAGES_COUNT)
			{
				return $ERRS.ERR_TASK_MEDIA_LIMIT_REACHED;
			}
			let rv = resolveFileIds(this.$media_file_ids);
			if ($Err.isERR(rv)) return rv;
			imageFileNames = rv.file_names;
		}

		let videoFileName = null;
		if (!$Utils.empty(this.$video_file_id))
		{
			let rv = resolveFileIds([this.$video_file_id]);
			if ($Err.isERR(rv)) return rv;
			videoFileName = rv.file_names[0];
		}

		let documentFileNames = [];
		if (this.$document_file_ids && this.$document_file_ids.length > 0)
		{
			let rv = resolveDocumentFileIds(this.$document_file_ids);
			if ($Err.isERR(rv)) return rv;
			documentFileNames = rv.file_names;
		}

		if (imageFileNames.length === 0 && !videoFileName && documentFileNames.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Insert media
		let mediaErr = insertTaskMedia(this.$task_id, userId, imageFileNames, "image", isConfirmation);
		if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }

		if (videoFileName)
		{
			mediaErr = insertTaskMedia(this.$task_id, userId, [videoFileName], "video", isConfirmation);
			if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }
		}

		mediaErr = insertTaskMedia(this.$task_id, userId, documentFileNames, "document", isConfirmation);
		if (mediaErr) { $Db.rollbackTransaction(); return mediaErr; }

		// Update task last_update
		$Db.executeQuery(
			`UPDATE \`task\` SET TSK_LAST_UPDATE=? WHERE TSK_ID=? AND TSK_DELETED_ON IS NULL`,
			[now, this.$task_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Get Task Metadata
	// =========================================================================

	get_task_metadata()
	{
		return {
			...$ERRS.ERR_SUCCESS,
			task_types: $DataItems.getList(TABLE_TYPE),
			task_statuses: $DataItems.getList(TABLE_STATUS),
			task_priorities: $DataItems.getList(TABLE_PRIORITY)
		};
	}
};
