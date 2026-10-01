const MAX_ATTACHMENTS_PER_SECTION = 5;
const MAX_SECTION_TITLE_LENGTH = 80;
const MAX_SECTION_DESCRIPTION_LENGTH = 10000;
const MAX_SECTION_NOTES_LENGTH = 2000;
const MAX_CHANGE_SUMMARY_LENGTH = 200;
const OFFICER_POST_HISTORY_DAYS = 90;

const TABLE_PO_STATUS = "po_status";
const TABLE_PO_VERSION_TYPE = "po_version_type";
const TABLE_PO_SECTION_TYPE = "po_section_type";

// ---------------------------------------------------------------------------
// Helper functions (outside the class — no DB calls inside loops)
// ---------------------------------------------------------------------------

function fetchPostOrderRecord(poId)
{
	let rows = $Db.executeQuery(
		`SELECT PO_ID, PO_PST_ID, PO_COM_ID, PO_STATUS,
		        PO_VERSION_MAJOR, PO_VERSION_MINOR,
		        PO_EFFECTIVE_DATE, PO_REVIEW_DUE_DATE,
		        PO_CREATED_BY, PO_LAST_PUBLISHED_BY, PO_LAST_PUBLISHED_ON,
		        PO_CREATED_ON, PO_LAST_UPDATE
		 FROM \`post_order\`
		 WHERE PO_ID=? AND PO_DELETED_ON IS NULL`,
		[poId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchPostRecord(postId)
{
	let rows = $Db.executeQuery(
		`SELECT PST_ID, PST_COM_ID, PST_NAME, PST_IS_ACTIVE
		 FROM \`post\`
		 WHERE PST_ID=? AND PST_DELETED_ON IS NULL`,
		[postId]);
	return rows.length > 0 ? rows[0] : null;
}

function hasPublishedHistory(poId)
{
	let rows = $Db.executeQuery(
		`SELECT COUNT(*) cnt FROM \`post_order_version\` WHERE POV_PO_ID=?`,
		[poId]);
	return rows.length > 0 && rows[0].cnt > 0;
}

function getLatestVersionId(poId)
{
	let rows = $Db.executeQuery(
		`SELECT POV_ID FROM \`post_order_version\`
		 WHERE POV_PO_ID=?
		 ORDER BY POV_PUBLISHED_ON DESC
		 LIMIT 1`,
		[poId]);
	return rows.length > 0 ? rows[0].POV_ID : null;
}

function getSections(poId)
{
	let rows = $Db.executeQuery(
		`SELECT POS_ID, POS_PO_ID, POS_SECTION_TYPE, POS_TITLE,
		        POS_DESCRIPTION, POS_CLIENT_VISIBLE, POS_NOTES,
		        POS_SORT_ORDER, POS_CREATED_ON, POS_LAST_UPDATE
		 FROM \`post_order_section\`
		 WHERE POS_PO_ID=? AND POS_DELETED_ON IS NULL
		 ORDER BY POS_SORT_ORDER ASC, POS_ID ASC`,
		[poId]);
	return rows;
}

function getAttachmentsForSections(sectionIds)
{
	if (!sectionIds || sectionIds.length === 0)
	{
		return {};
	}
	let rows = $Db.executeQuery(
		`SELECT POF_ID, POF_POS_ID, POF_FILE_NAME, POF_CREATED_ON
		 FROM \`post_order_attachment\`
		 WHERE POF_POS_ID IN (${sectionIds.toPlaceholders()}) AND POF_DELETED_ON IS NULL
		 ORDER BY POF_CREATED_ON ASC`,
		sectionIds);

	let map = {};
	for (let i = 0; i < rows.length; i++)
	{
		let r = rows[i];
		if (!map[r.POF_POS_ID])
		{
			map[r.POF_POS_ID] = [];
		}
		map[r.POF_POS_ID].push({
			attachment_id: r.POF_ID,
			url: $Files.getUrl({file_name: r.POF_FILE_NAME}),
			created_on: r.POF_CREATED_ON
		});
	}
	return map;
}

function mapSectionRow(row, attachments, includeNotes)
{
	let section = {
		section_id: row.POS_ID,
		section_type: row.POS_SECTION_TYPE,
		section_type_name: $DataItems.getItemName(row.POS_SECTION_TYPE, TABLE_PO_SECTION_TYPE) || row.POS_SECTION_TYPE,
		title: row.POS_TITLE,
		description: row.POS_DESCRIPTION || "",
		client_visible: row.POS_CLIENT_VISIBLE === 1,
		sort_order: row.POS_SORT_ORDER,
		attachments: attachments || [],
		created_on: row.POS_CREATED_ON,
		last_update: row.POS_LAST_UPDATE || null,
	};
	if (includeNotes)
	{
		section.notes = row.POS_NOTES || null;
	}
	return section;
}

function buildFullName(firstName, lastName)
{
	return ((firstName || "") + " " + (lastName || "")).trim() || null;
}

function insertSections(poId, sections, now)
{
	if (sections.length === 0)
	{
		return null;
	}

	// Bulk insert all sections in one query (no DB calls in loops)
	let sectionPlaceholders = sections.map(() => "(?,?,?,?,?,?,?,?)").join(", ");
	let sectionParams = [];
	for (let i = 0; i < sections.length; i++)
	{
		let s = sections[i];
		sectionParams.push(poId, s.section_type, s.title, s.description || "",
			s.client_visible ? 1 : 0, s.notes || null, i, now);
	}

	$Db.executeQuery(
		`INSERT INTO \`post_order_section\`
		 (POS_PO_ID, POS_SECTION_TYPE, POS_TITLE, POS_DESCRIPTION,
		  POS_CLIENT_VISIBLE, POS_NOTES, POS_SORT_ORDER, POS_CREATED_ON)
		 VALUES ${sectionPlaceholders}`,
		sectionParams);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}

	// MySQL: bulk INSERT returns the first auto-increment ID; subsequent IDs are contiguous
	let firstSectionId = $Db.insertId();

	// Bulk insert all attachments across all sections in one query
	let attachPlaceholders = [];
	let attachParams = [];
	for (let i = 0; i < sections.length; i++)
	{
		let sectionId = firstSectionId + i;
		let fileNames = sections[i]._file_names;
		if (fileNames && fileNames.length > 0)
		{
			for (let j = 0; j < fileNames.length; j++)
			{
				attachPlaceholders.push("(?, ?, ?)");
				attachParams.push(sectionId, fileNames[j], now);
			}
		}
	}

	if (attachPlaceholders.length > 0)
	{
		$Db.executeQuery(
			`INSERT INTO \`post_order_attachment\` (POF_POS_ID, POF_FILE_NAME, POF_CREATED_ON)
			 VALUES ${attachPlaceholders.join(", ")}`,
			attachParams);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}
	}

	return null;
}

function softDeleteSections(poId, now)
{
	// Soft-delete attachments for all sections of this PO
	$Db.executeQuery(
		`UPDATE \`post_order_attachment\`
		 SET POF_DELETED_ON=?
		 WHERE POF_POS_ID IN (
		     SELECT POS_ID FROM \`post_order_section\`
		     WHERE POS_PO_ID=? AND POS_DELETED_ON IS NULL
		 ) AND POF_DELETED_ON IS NULL`,
		[now, poId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}

	// Soft-delete sections
	$Db.executeQuery(
		`UPDATE \`post_order_section\`
		 SET POS_DELETED_ON=?
		 WHERE POS_PO_ID=? AND POS_DELETED_ON IS NULL`,
		[now, poId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}

	return null;
}

function snapshotSections(poId)
{
	let sections = getSections(poId);
	let sectionIds = sections.map(s => s.POS_ID);
	let attachmentMap = getAttachmentsForSections(sectionIds);

	let snapshot = [];
	for (let i = 0; i < sections.length; i++)
	{
		let s = sections[i];
		let atts = attachmentMap[s.POS_ID] || [];
		snapshot.push({
			section_type: s.POS_SECTION_TYPE,
			title: s.POS_TITLE,
			description: s.POS_DESCRIPTION || "",
			client_visible: s.POS_CLIENT_VISIBLE === 1,
			notes: s.POS_NOTES || null,
			sort_order: s.POS_SORT_ORDER,
			attachments: atts
		});
	}
	return JSON.stringify(snapshot);
}

function getOfficerAllocatedPostIds(userId)
{
	let cutoffDate = new $Date().addDays(-OFFICER_POST_HISTORY_DAYS).format("Y-m-d");
	let rows = $Db.executeQuery(
		`SELECT DISTINCT SHP_PST_ID
		 FROM \`shift_post\`
		    JOIN \`shift\` ON SHP_SFT_ID = SFT_ID
		 WHERE SHP_OFC_USR_ID=?
		   AND SFT_DATE >= ?
		   AND SHP_DELETED_ON IS NULL
		   AND SFT_DELETED_ON IS NULL`,
		[userId, cutoffDate]);
	return rows.map(r => r.SHP_PST_ID);
}

function getAllocatedOfficerIds(postId)
{
	let rows = $Db.executeQuery(
		`SELECT DISTINCT SHP_OFC_USR_ID
		 FROM \`shift_post\`
		    JOIN \`shift\` ON SHP_SFT_ID = SFT_ID
		 WHERE SHP_PST_ID=?
		   AND SFT_STATUS IN (?, ?)
		   AND SHP_DELETED_ON IS NULL
		   AND SFT_DELETED_ON IS NULL`,
		[postId, $Const.SHIFT_STATUS_PUBLISHED, $Const.SHIFT_STATUS_ACTIVE]);
	return rows.map(r => r.SHP_OFC_USR_ID);
}

function sendPostOrderNotification(session, type, postOrder, postName, templateVars, targetUserIds, communityId)
{
	if (!targetUserIds || targetUserIds.length === 0)
	{
		return;
	}

	let uniqueIds = [...new Set(targetUserIds.filter(id => !$Utils.empty(id)))];
	if (uniqueIds.length === 0)
	{
		return;
	}

	$executeAPI(session, "Notification/create_bulk_notifications", {
		target_user_ids: uniqueIds,
		type: type,
		template_vars: JSON.stringify(templateVars),
		payload: JSON.stringify({entity_type: "post_order", entity_id: postOrder.PO_ID}),
		community_id: communityId || postOrder.PO_COM_ID,
		send_push: true
	});
}

function validateSectionsInput(sections)
{
	if (!Array.isArray(sections) || sections.length === 0)
	{
		return {error: $ERRS.ERR_INVALID_API_PARAM};
	}

	let allFileIds = [];

	for (let i = 0; i < sections.length; i++)
	{
		let s = sections[i];
		if (typeof s !== "object" || s === null)
		{
			return {error: $ERRS.ERR_INVALID_API_PARAM};
		}

		// section_type
		if ($Utils.empty(s.section_type) || !$DataItems.isValidItemId(s.section_type, TABLE_PO_SECTION_TYPE))
		{
			return {error: $ERRS.ERR_POST_ORDER_INVALID_SECTION_TYPE};
		}

		// title
		if ($Utils.empty(s.title) || s.title.length > MAX_SECTION_TITLE_LENGTH)
		{
			return {error: $ERRS.ERR_INVALID_API_PARAM};
		}

		// description
		if (s.description && s.description.length > MAX_SECTION_DESCRIPTION_LENGTH)
		{
			return {error: $ERRS.ERR_INVALID_API_PARAM};
		}

		// notes
		if (s.notes && s.notes.length > MAX_SECTION_NOTES_LENGTH)
		{
			return {error: $ERRS.ERR_INVALID_API_PARAM};
		}

		// attachments
		let fileIds = s.attachment_file_ids || [];
		if (fileIds.length > MAX_ATTACHMENTS_PER_SECTION)
		{
			return {error: $ERRS.ERR_POST_ORDER_MEDIA_LIMIT_REACHED};
		}
		if (fileIds.length > 0)
		{
			allFileIds = allFileIds.concat(fileIds);
		}
	}

	// Resolve all file IDs in one batch query (not inside loop)
	let fileNameMap = {};
	if (allFileIds.length > 0)
	{
		let uniqueFileIds = [...new Set(allFileIds)];
		let fileRows = $Db.executeQuery(
			`SELECT FIL_ID, FIL_FILE_NAME FROM \`file\` WHERE FIL_ID IN (${uniqueFileIds.toPlaceholders()})`,
			uniqueFileIds);
		if (fileRows.length !== uniqueFileIds.length)
		{
			return {error: $ERRS.ERR_FILE_NOT_FOUND};
		}
		for (let i = 0; i < fileRows.length; i++)
		{
			fileNameMap[fileRows[i].FIL_ID] = fileRows[i].FIL_FILE_NAME;
		}
	}

	// Attach resolved file_names to each section
	let prepared = [];
	for (let i = 0; i < sections.length; i++)
	{
		let s = sections[i];
		let fileIds = s.attachment_file_ids || [];
		let fileNames = [];
		for (let j = 0; j < fileIds.length; j++)
		{
			fileNames.push(fileNameMap[fileIds[j]]);
		}
		prepared.push({
			section_type: s.section_type,
			title: s.title,
			description: s.description || "",
			client_visible: s.client_visible === true || s.client_visible === "true" || s.client_visible === 1,
			notes: s.notes || null,
			_file_names: fileNames,
		});
	}

	return {sections: prepared};
}


module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
		$DataItems.define(TABLE_PO_STATUS);
		$DataItems.define(TABLE_PO_VERSION_TYPE);
		$DataItems.define(TABLE_PO_SECTION_TYPE);
	}

	// =========================================================================
	// Get Post Orders List
	// =========================================================================

	get_post_orders_list()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let conditions = ["po.PO_DELETED_ON IS NULL"];
		let params = [];

		// Role-based scoping
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			// Officers see only published POs for posts they've been allocated to in last 90 days
			let postIds = getOfficerAllocatedPostIds(userId);
			if (postIds.length === 0)
			{
				return {...$ERRS.ERR_SUCCESS, post_orders: [], total_count: 0};
			}
			conditions.push(`po.PO_PST_ID IN (${postIds.toPlaceholders()})`);
			params.push(...postIds);
			conditions.push("po.PO_STATUS=?");
			params.push($Const.PO_STATUS_PUBLISHED);
		}
		else if (userType === $Const.USER_TYPE_RESIDENT)
		{
			// Residents see only published POs for their communities
			let communityId = $Funcs.getUserCommunityId(userId);
			if (!communityId)
			{
				return {...$ERRS.ERR_SUCCESS, post_orders: [], total_count: 0};
			}
			conditions.push("po.PO_COM_ID=?");
			params.push(communityId);
			conditions.push("po.PO_STATUS=?");
			params.push($Const.PO_STATUS_PUBLISHED);
		}
		else
		{
			// Admin: optional community filter
			if (this.$community_id > 0)
			{
				conditions.push("po.PO_COM_ID=?");
				params.push(this.$community_id);
			}

			// Admin: optional status filter
			if (!$Utils.empty(this.$status))
			{
				if (!$DataItems.isValidItemId(this.$status, TABLE_PO_STATUS))
				{
					return $ERRS.ERR_INVALID_API_PARAM;
				}
				conditions.push("po.PO_STATUS=?");
				params.push(this.$status);
			}
		}

		// Review due filter (admin only)
		if (!$Utils.empty(this.$review_due_before) && userType === $Const.USER_TYPE_ADMIN)
		{
			conditions.push("po.PO_REVIEW_DUE_DATE IS NOT NULL AND po.PO_REVIEW_DUE_DATE <= ?");
			params.push(this.$review_due_before);
		}

		// Free-text search
		if (!$Utils.empty(this.$search_text))
		{
			let searchParam = "%" + this.$search_text + "%";
			conditions.push("(p.PST_NAME LIKE ? OR c.COM_NAME LIKE ?)");
			params.push(searchParam, searchParam);
		}

		let whereClause = conditions.join(" AND ");

		// Sort
		let sortColumn = "c.COM_NAME";
		let validSorts = {
			community_name: "c.COM_NAME",
			post_name: "p.PST_NAME",
			status: "po.PO_STATUS",
			last_published_on: "po.PO_LAST_PUBLISHED_ON"
		};
		if (this.$sort_by && validSorts[this.$sort_by])
		{
			sortColumn = validSorts[this.$sort_by];
		}
		let sortDir = (this.$sort_dir === "desc") ? "DESC" : "ASC";

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`post_order\` po
			    JOIN \`post\` p ON po.PO_PST_ID = p.PST_ID
			    JOIN \`community\` c ON po.PO_COM_ID = c.COM_ID
			 WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		// Limit / offset
		let limit = Math.min(Math.max(this.$limit || 20, 1), 100);
		let offset = Math.max(this.$offset || 0, 0);

		// Fetch page
		let rows = $Db.executeQuery(
			`SELECT po.PO_ID, po.PO_PST_ID, po.PO_COM_ID, po.PO_STATUS,
			        po.PO_VERSION_MAJOR, po.PO_VERSION_MINOR,
			        po.PO_EFFECTIVE_DATE, po.PO_REVIEW_DUE_DATE,
			        po.PO_CREATED_BY, po.PO_LAST_PUBLISHED_BY, po.PO_LAST_PUBLISHED_ON,
			        po.PO_CREATED_ON, po.PO_LAST_UPDATE,
			        p.PST_NAME,
			        c.COM_NAME,
			        creator_ud.USD_FIRST_NAME CREATOR_FIRST_NAME,
			        creator_ud.USD_LAST_NAME CREATOR_LAST_NAME,
			        publisher_ud.USD_FIRST_NAME PUBLISHER_FIRST_NAME,
			        publisher_ud.USD_LAST_NAME PUBLISHER_LAST_NAME
			 FROM \`post_order\` po
			    JOIN \`post\` p ON po.PO_PST_ID = p.PST_ID
			    JOIN \`community\` c ON po.PO_COM_ID = c.COM_ID
			    LEFT OUTER JOIN \`user_details\` creator_ud ON po.PO_CREATED_BY = creator_ud.USD_USR_ID
			    LEFT OUTER JOIN \`user_details\` publisher_ud ON po.PO_LAST_PUBLISHED_BY = publisher_ud.USD_USR_ID
			 WHERE ${whereClause}
			 ORDER BY ${sortColumn} ${sortDir}, p.PST_NAME ASC
			 LIMIT ${limit} OFFSET ${offset}`,
			params);

		let postOrders = rows.map(row => ({
			post_order_id: row.PO_ID,
			post_id: row.PO_PST_ID,
			post_name: row.PST_NAME,
			community_id: row.PO_COM_ID,
			community_name: row.COM_NAME,
			status: row.PO_STATUS,
			version: row.PO_VERSION_MAJOR + "." + row.PO_VERSION_MINOR,
			effective_date: row.PO_EFFECTIVE_DATE || null,
			review_due_date: row.PO_REVIEW_DUE_DATE || null,
			created_by: row.PO_CREATED_BY,
			created_by_name: buildFullName(row.CREATOR_FIRST_NAME, row.CREATOR_LAST_NAME),
			last_published_by: row.PO_LAST_PUBLISHED_BY || null,
			last_published_by_name: buildFullName(row.PUBLISHER_FIRST_NAME, row.PUBLISHER_LAST_NAME),
			last_published_on: row.PO_LAST_PUBLISHED_ON || null,
			created_on: row.PO_CREATED_ON,
			last_update: row.PO_LAST_UPDATE || null,
		}));

		return {...$ERRS.ERR_SUCCESS, post_orders: postOrders, total_count: totalCount};
	}

	// =========================================================================
	// Get Post Order
	// =========================================================================

	get_post_order()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let rows = $Db.executeQuery(
			`SELECT po.PO_ID, po.PO_PST_ID, po.PO_COM_ID, po.PO_STATUS,
			        po.PO_VERSION_MAJOR, po.PO_VERSION_MINOR,
			        po.PO_EFFECTIVE_DATE, po.PO_REVIEW_DUE_DATE,
			        po.PO_CREATED_BY, po.PO_LAST_PUBLISHED_BY, po.PO_LAST_PUBLISHED_ON,
			        po.PO_CREATED_ON, po.PO_LAST_UPDATE,
			        p.PST_NAME,
			        c.COM_NAME,
			        creator_ud.USD_FIRST_NAME CREATOR_FIRST_NAME,
			        creator_ud.USD_LAST_NAME CREATOR_LAST_NAME,
			        publisher_ud.USD_FIRST_NAME PUBLISHER_FIRST_NAME,
			        publisher_ud.USD_LAST_NAME PUBLISHER_LAST_NAME
			 FROM \`post_order\` po
			    JOIN \`post\` p ON po.PO_PST_ID = p.PST_ID
			    JOIN \`community\` c ON po.PO_COM_ID = c.COM_ID
			    LEFT OUTER JOIN \`user_details\` creator_ud ON po.PO_CREATED_BY = creator_ud.USD_USR_ID
			    LEFT OUTER JOIN \`user_details\` publisher_ud ON po.PO_LAST_PUBLISHED_BY = publisher_ud.USD_USR_ID
			 WHERE po.PO_ID=? AND po.PO_DELETED_ON IS NULL`,
			[this.$post_order_id]);

		if (rows.length === 0)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		let row = rows[0];

		// Access control
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			// Officers can only see published POs for posts they're allocated to
			if (row.PO_STATUS !== $Const.PO_STATUS_PUBLISHED)
			{
				return $ERRS.ERR_POST_ORDER_NOT_FOUND;
			}
			let postIds = getOfficerAllocatedPostIds(userId);
			if (postIds.indexOf(row.PO_PST_ID) === -1)
			{
				return $ERRS.ERR_POST_ORDER_NOT_FOUND;
			}
		}
		else if (userType === $Const.USER_TYPE_RESIDENT)
		{
			// Residents can only see published POs in their community
			if (row.PO_STATUS !== $Const.PO_STATUS_PUBLISHED)
			{
				return $ERRS.ERR_POST_ORDER_NOT_FOUND;
			}
			let communityId = $Funcs.getUserCommunityId(userId);
			if (row.PO_COM_ID !== communityId)
			{
				return $ERRS.ERR_POST_ORDER_NOT_FOUND;
			}
		}

		let postOrder = {
			post_order_id: row.PO_ID,
			post_id: row.PO_PST_ID,
			post_name: row.PST_NAME,
			community_id: row.PO_COM_ID,
			community_name: row.COM_NAME,
			status: row.PO_STATUS,
			version: row.PO_VERSION_MAJOR + "." + row.PO_VERSION_MINOR,
			effective_date: row.PO_EFFECTIVE_DATE || null,
			review_due_date: row.PO_REVIEW_DUE_DATE || null,
			created_by: row.PO_CREATED_BY,
			created_by_name: buildFullName(row.CREATOR_FIRST_NAME, row.CREATOR_LAST_NAME),
			last_published_by: row.PO_LAST_PUBLISHED_BY || null,
			last_published_by_name: buildFullName(row.PUBLISHER_FIRST_NAME, row.PUBLISHER_LAST_NAME),
			last_published_on: row.PO_LAST_PUBLISHED_ON || null,
			created_on: row.PO_CREATED_ON,
			last_update: row.PO_LAST_UPDATE || null,
		};

		// For officers and residents: serve content from latest published version
		if (userType === $Const.USER_TYPE_OFFICER || userType === $Const.USER_TYPE_RESIDENT)
		{
			let latestVersionId = getLatestVersionId(row.PO_ID);
			if (latestVersionId)
			{
				let versionRows = $Db.executeQuery(
					`SELECT POV_CONTENT FROM \`post_order_version\` WHERE POV_ID=?`,
					[latestVersionId]);
				if (versionRows.length > 0)
				{
					let content = typeof versionRows[0].POV_CONTENT === "string"
						? JSON.parse(versionRows[0].POV_CONTENT)
						: versionRows[0].POV_CONTENT;

					// Filter for residents: only client-visible sections
					if (userType === $Const.USER_TYPE_RESIDENT)
					{
						content = content.filter(s => s.client_visible === true);
						// Remove notes from each section
						content = content.map(s => {
							let {notes, ...rest} = s;
							return rest;
						});
					}
					else
					{
						// Officers see all sections but not notes
						content = content.map(s => {
							let {notes, ...rest} = s;
							return rest;
						});
					}
					postOrder.sections = content;
				}
			}
			else
			{
				postOrder.sections = [];
			}
		}
		else
		{
			// Admin: show current working sections with all fields
			let sectionRows = getSections(row.PO_ID);
			let sectionIds = sectionRows.map(s => s.POS_ID);
			let attachmentMap = getAttachmentsForSections(sectionIds);

			postOrder.sections = sectionRows.map(s => mapSectionRow(s, attachmentMap[s.POS_ID] || [], true));
		}

		return {...$ERRS.ERR_SUCCESS, post_order: postOrder};
	}

	// =========================================================================
	// Create Post Order
	// =========================================================================

	create_post_order()
	{
		let userId = this.$Session.userId;

		// Validate post exists
		let post = fetchPostRecord(this.$post_id);
		if (!post)
		{
			return $ERRS.ERR_POST_NOT_FOUND;
		}

		// Check if a post order already exists for this post
		let existingRows = $Db.executeQuery(
			`SELECT PO_ID FROM \`post_order\`
			 WHERE PO_PST_ID=? AND PO_DELETED_ON IS NULL`,
			[this.$post_id]);
		if (existingRows.length > 0)
		{
			return $ERRS.ERR_POST_ORDER_ALREADY_EXISTS;
		}

		// Validate and resolve sections (reads file table — before transaction)
		let sectionResult = validateSectionsInput(this.$sections);
		if (sectionResult.error)
		{
			return sectionResult.error;
		}
		let preparedSections = sectionResult.sections;

		let now = $Utils.now();

		$Db.beginTransaction();

		// Insert post order
		$Db.executeQuery(
			`INSERT INTO \`post_order\`
			 (PO_PST_ID, PO_COM_ID, PO_STATUS, PO_VERSION_MAJOR, PO_VERSION_MINOR,
			  PO_REVIEW_DUE_DATE, PO_CREATED_BY, PO_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?)`,
			[this.$post_id, post.PST_COM_ID, $Const.PO_STATUS_DRAFT, 0, 0,
			 $Utils.empty(this.$review_due_date) ? null : this.$review_due_date,
			 userId, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let poId = $Db.insertId();

		// Insert sections
		let sectionErr = insertSections(poId, preparedSections, now);
		if (sectionErr)
		{
			$Db.rollbackTransaction();
			return sectionErr;
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, post_order_id: poId};
	}

	// =========================================================================
	// Update Post Order
	// =========================================================================

	update_post_order()
	{
		let userId = this.$Session.userId;

		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Cannot edit archived POs
		if (po.PO_STATUS === $Const.PO_STATUS_ARCHIVED)
		{
			return $ERRS.ERR_POST_ORDER_CANNOT_EDIT;
		}

		// If currently published, transition to draft (editing creates a new draft)
		let needsStatusChange = (po.PO_STATUS === $Const.PO_STATUS_PUBLISHED);

		// Validate sections if provided (reads file table — before transaction)
		let preparedSections = null;
		if (this.$sections !== null && this.$sections !== undefined)
		{
			let sectionResult = validateSectionsInput(this.$sections);
			if (sectionResult.error)
			{
				return sectionResult.error;
			}
			preparedSections = sectionResult.sections;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Update header fields
		let updates = ["PO_LAST_UPDATE=?"];
		let params = [now];

		if (needsStatusChange)
		{
			updates.push("PO_STATUS=?");
			params.push($Const.PO_STATUS_DRAFT);
		}

		if (this.$review_due_date !== null && this.$review_due_date !== undefined)
		{
			let val = $Utils.empty(this.$review_due_date) ? null : this.$review_due_date;
			updates.push("PO_REVIEW_DUE_DATE=?");
			params.push(val);
		}

		params.push(this.$post_order_id);
		$Db.executeQuery(
			`UPDATE \`post_order\` SET ${updates.join(", ")} WHERE PO_ID=? AND PO_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Replace sections if provided
		if (preparedSections !== null)
		{
			let deleteErr = softDeleteSections(this.$post_order_id, now);
			if (deleteErr)
			{
				$Db.rollbackTransaction();
				return deleteErr;
			}
			let sectionErr = insertSections(this.$post_order_id, preparedSections, now);
			if (sectionErr)
			{
				$Db.rollbackTransaction();
				return sectionErr;
			}
		}

		$Db.commitTransaction();

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Publish Post Order
	// =========================================================================

	publish_post_order()
	{
		let userId = this.$Session.userId;

		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Can only publish a draft
		if (po.PO_STATUS !== $Const.PO_STATUS_DRAFT)
		{
			return $ERRS.ERR_POST_ORDER_CANNOT_PUBLISH;
		}

		// Validate version type
		if (!$DataItems.isValidItemId(this.$version_type, TABLE_PO_VERSION_TYPE))
		{
			return $ERRS.ERR_INVALID_API_PARAM;
		}

		// Validate change summary
		if ($Utils.empty(this.$change_summary) || this.$change_summary.length > MAX_CHANGE_SUMMARY_LENGTH)
		{
			return $ERRS.ERR_INVALID_API_PARAM;
		}

		// Calculate new version number
		let versionMajor = po.PO_VERSION_MAJOR;
		let versionMinor = po.PO_VERSION_MINOR;
		let isFirstPublish = (versionMajor === 0 && versionMinor === 0);

		if (isFirstPublish)
		{
			// First publish: always 1.0 regardless of version_type
			versionMajor = 1;
			versionMinor = 0;
		}
		else if (this.$version_type === $Const.PO_VERSION_TYPE_MAJOR)
		{
			versionMajor = versionMajor + 1;
			versionMinor = 0;
		}
		else
		{
			versionMinor = versionMinor + 1;
		}

		let effectiveDate = $Utils.empty(this.$effective_date) ? new $Date().format("Y-m-d") : this.$effective_date;
		let notifyOfficers = this.$notify_officers !== false && this.$notify_officers !== "false";

		// Snapshot current sections (SELECT — before transaction)
		let contentSnapshot = snapshotSections(this.$post_order_id);

		// Fetch post name for notification (SELECT — before transaction)
		let post = fetchPostRecord(po.PO_PST_ID);
		let postName = post ? post.PST_NAME : "Unknown";

		// Get officer IDs for notification (SELECT — before transaction)
		let officerIds = [];
		if (notifyOfficers)
		{
			officerIds = getAllocatedOfficerIds(po.PO_PST_ID);
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Insert version snapshot
		$Db.executeQuery(
			`INSERT INTO \`post_order_version\`
			 (POV_PO_ID, POV_VERSION_MAJOR, POV_VERSION_MINOR, POV_CHANGE_SUMMARY,
			  POV_VERSION_TYPE, POV_EFFECTIVE_DATE, POV_CONTENT, POV_PUBLISHED_BY, POV_PUBLISHED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			[this.$post_order_id, versionMajor, versionMinor, this.$change_summary,
			 this.$version_type, effectiveDate, contentSnapshot, userId, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let versionId = $Db.insertId();

		// Update post order header
		$Db.executeQuery(
			`UPDATE \`post_order\`
			 SET PO_STATUS=?, PO_VERSION_MAJOR=?, PO_VERSION_MINOR=?,
			     PO_EFFECTIVE_DATE=?, PO_LAST_PUBLISHED_BY=?, PO_LAST_PUBLISHED_ON=?, PO_LAST_UPDATE=?
			 WHERE PO_ID=? AND PO_DELETED_ON IS NULL`,
			[$Const.PO_STATUS_PUBLISHED, versionMajor, versionMinor,
			 effectiveDate, userId, now, now,
			 this.$post_order_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		// Send notifications (after commit)
		if (notifyOfficers && officerIds.length > 0)
		{
			let notificationType = isFirstPublish
				? "post_order_published"
				: "post_order_updated";

			sendPostOrderNotification(this.$Session, notificationType, po, postName,
				{post_order_name: postName},
				officerIds, po.PO_COM_ID);
		}

		return {...$ERRS.ERR_SUCCESS, version_id: versionId, version: versionMajor + "." + versionMinor};
	}

	// =========================================================================
	// Archive Post Order
	// =========================================================================

	archive_post_order()
	{
		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Can only archive a published PO
		if (po.PO_STATUS !== $Const.PO_STATUS_PUBLISHED)
		{
			return $ERRS.ERR_POST_ORDER_CANNOT_ARCHIVE;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`post_order\`
			 SET PO_STATUS=?, PO_LAST_UPDATE=?
			 WHERE PO_ID=? AND PO_DELETED_ON IS NULL`,
			[$Const.PO_STATUS_ARCHIVED, now, this.$post_order_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Delete Post Order
	// =========================================================================

	delete_post_order()
	{
		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Can only delete a draft with no published history
		if (po.PO_STATUS !== $Const.PO_STATUS_DRAFT)
		{
			return $ERRS.ERR_POST_ORDER_CANNOT_DELETE;
		}

		if (hasPublishedHistory(this.$post_order_id))
		{
			return $ERRS.ERR_POST_ORDER_CANNOT_DELETE;
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Soft-delete sections and attachments
		let deleteErr = softDeleteSections(this.$post_order_id, now);
		if (deleteErr)
		{
			$Db.rollbackTransaction();
			return deleteErr;
		}

		// Soft-delete the post order
		$Db.executeQuery(
			`UPDATE \`post_order\` SET PO_DELETED_ON=? WHERE PO_ID=?`,
			[now, this.$post_order_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Get Version History
	// =========================================================================

	get_version_history()
	{
		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		let rows = $Db.executeQuery(
			`SELECT pov.POV_ID, pov.POV_VERSION_MAJOR, pov.POV_VERSION_MINOR,
			        pov.POV_CHANGE_SUMMARY, pov.POV_VERSION_TYPE,
			        pov.POV_EFFECTIVE_DATE, pov.POV_PUBLISHED_BY, pov.POV_PUBLISHED_ON,
			        ud.USD_FIRST_NAME, ud.USD_LAST_NAME
			 FROM \`post_order_version\` pov
			    LEFT OUTER JOIN \`user_details\` ud ON pov.POV_PUBLISHED_BY = ud.USD_USR_ID
			 WHERE pov.POV_PO_ID=?
			 ORDER BY pov.POV_PUBLISHED_ON DESC`,
			[this.$post_order_id]);

		let versions = rows.map(r => ({
			version_id: r.POV_ID,
			version: r.POV_VERSION_MAJOR + "." + r.POV_VERSION_MINOR,
			change_summary: r.POV_CHANGE_SUMMARY,
			version_type: r.POV_VERSION_TYPE,
			effective_date: r.POV_EFFECTIVE_DATE,
			published_by: r.POV_PUBLISHED_BY,
			published_by_name: buildFullName(r.USD_FIRST_NAME, r.USD_LAST_NAME),
			published_on: r.POV_PUBLISHED_ON,
		}));

		return {...$ERRS.ERR_SUCCESS, versions: versions};
	}

	// =========================================================================
	// Get Version
	// =========================================================================

	get_version()
	{
		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		let rows = $Db.executeQuery(
			`SELECT pov.POV_ID, pov.POV_PO_ID, pov.POV_VERSION_MAJOR, pov.POV_VERSION_MINOR,
			        pov.POV_CHANGE_SUMMARY, pov.POV_VERSION_TYPE,
			        pov.POV_EFFECTIVE_DATE, pov.POV_CONTENT,
			        pov.POV_PUBLISHED_BY, pov.POV_PUBLISHED_ON,
			        ud.USD_FIRST_NAME, ud.USD_LAST_NAME
			 FROM \`post_order_version\` pov
			    LEFT OUTER JOIN \`user_details\` ud ON pov.POV_PUBLISHED_BY = ud.USD_USR_ID
			 WHERE pov.POV_ID=? AND pov.POV_PO_ID=?`,
			[this.$version_id, this.$post_order_id]);

		if (rows.length === 0)
		{
			return $ERRS.ERR_POST_ORDER_VERSION_NOT_FOUND;
		}

		let r = rows[0];
		let content = typeof r.POV_CONTENT === "string" ? JSON.parse(r.POV_CONTENT) : r.POV_CONTENT;

		return {
			...$ERRS.ERR_SUCCESS,
			version: {
				version_id: r.POV_ID,
				version: r.POV_VERSION_MAJOR + "." + r.POV_VERSION_MINOR,
				change_summary: r.POV_CHANGE_SUMMARY,
				version_type: r.POV_VERSION_TYPE,
				effective_date: r.POV_EFFECTIVE_DATE,
				published_by: r.POV_PUBLISHED_BY,
				published_by_name: buildFullName(r.USD_FIRST_NAME, r.USD_LAST_NAME),
				published_on: r.POV_PUBLISHED_ON,
				sections: content,
			}
		};
	}

	// =========================================================================
	// Acknowledge Post Order
	// =========================================================================

	acknowledge_post_order()
	{
		let userId = this.$Session.userId;

		let po = fetchPostOrderRecord(this.$post_order_id);
		if (!po)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Must be published
		if (po.PO_STATUS !== $Const.PO_STATUS_PUBLISHED)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Officer must be allocated to this post
		let postIds = getOfficerAllocatedPostIds(userId);
		if (postIds.indexOf(po.PO_PST_ID) === -1)
		{
			return $ERRS.ERR_POST_ORDER_NOT_FOUND;
		}

		// Resolve version: explicit version_id or default to latest published
		let versionId;
		if (this.$version_id > 0)
		{
			// Validate the supplied version belongs to this post order
			let versionRows = $Db.executeQuery(
				`SELECT POV_ID FROM \`post_order_version\` WHERE POV_ID=? AND POV_PO_ID=?`,
				[this.$version_id, this.$post_order_id]);
			if (versionRows.length === 0)
			{
				return $ERRS.ERR_POST_ORDER_VERSION_NOT_FOUND;
			}
			versionId = this.$version_id;
		}
		else
		{
			versionId = getLatestVersionId(this.$post_order_id);
			if (!versionId)
			{
				return $ERRS.ERR_POST_ORDER_VERSION_NOT_FOUND;
			}
		}

		// Check if already acknowledged
		let existingRows = $Db.executeQuery(
			`SELECT POA_ID FROM \`post_order_acknowledgement\`
			 WHERE POA_POV_ID=? AND POA_USR_ID=?`,
			[versionId, userId]);
		if (existingRows.length > 0)
		{
			return $ERRS.ERR_POST_ORDER_ALREADY_ACKNOWLEDGED;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`INSERT INTO \`post_order_acknowledgement\`
			 (POA_PO_ID, POA_POV_ID, POA_USR_ID, POA_ACKNOWLEDGED_ON)
			 VALUES (?,?,?,?)`,
			[this.$post_order_id, versionId, userId, now]);
		if ($Db.isError())
		{
			// Unique constraint (POA_POV_ID, POA_USR_ID) handles concurrent duplicate requests
			if ($Db.isDuplicateEntryError())
			{
				return $ERRS.ERR_POST_ORDER_ALREADY_ACKNOWLEDGED;
			}
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}
};
