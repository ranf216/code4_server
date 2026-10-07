const MAX_FIRST_NAME_LENGTH = 60;
const MAX_LAST_NAME_LENGTH = 60;
const MAX_ALIASES_LENGTH = 200;
const MAX_PHYSICAL_DESC_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 300;
const MAX_INTERNAL_NOTES_LENGTH = 2000;
const MAX_INCIDENT_HISTORY_LENGTH = 1000;
const MAX_ASSOCIATED_INDIVIDUALS_LENGTH = 500;
const MAX_PHOTOS = 10;
const MIN_PHOTOS = 1;

const TABLE_POI_RECORD_TYPE = "poi_record_type";
const TABLE_POI_THREAT_LEVEL = "poi_threat_level";
const TABLE_POI_STATUS = "poi_status";
const TABLE_POI_GENDER = "poi_gender";

// Fields that can be edited at any time without triggering a version update
const ALWAYS_EDITABLE_FIELDS = ["internal_notes", "renewal_reminder_days", "watch_level_review_date", "related_incident_ids"];

// ---------------------------------------------------------------------------
// Helper functions (outside the class — no DB calls inside loops)
// ---------------------------------------------------------------------------

function fetchPoiRecord(recordId)
{
	let rows = $Db.executeQuery(
		`SELECT POI_ID, POI_RECORD_TYPE, POI_STATUS,
		        POI_FIRST_NAME, POI_LAST_NAME, POI_KNOWN_ALIASES,
		        POI_DATE_OF_BIRTH, POI_GENDER, POI_PHYSICAL_DESCRIPTION,
		        POI_THREAT_LEVEL, POI_SUMMARY, POI_INTERNAL_NOTES,
		        POI_INCIDENT_HISTORY_SUMMARY, POI_WATCH_LEVEL_REVIEW_DATE,
		        POI_ASSOCIATED_INDIVIDUALS,
		        POI_TRESPASS_NOTICE_NUMBER, POI_ISSUING_AUTHORITY,
		        POI_PROPERTY_AREA_COVERED, POI_ISSUE_DATE, POI_EXPIRY_DATE,
		        POI_NOTICE_DOCUMENT, POI_RENEWAL_REMINDER_DAYS,
		        POI_LAW_ENFORCEMENT_CONTACT, POI_CONDITIONS,
		        POI_RED_CARD_NUMBER, POI_LINES, POI_CARD_DOCUMENT,
		        POI_INACTIVATION_REASON,
		        POI_APPROVED_BY, POI_APPROVED_ON,
		        POI_CREATED_BY, POI_CREATED_ON, POI_LAST_UPDATE
		 FROM \`poi_record\`
		 WHERE POI_ID=? AND POI_DELETED_ON IS NULL`,
		[recordId]);
	return rows.length > 0 ? rows[0] : null;
}

function getPhotos(recordId)
{
	return $Db.executeQuery(
		`SELECT PPH_ID, PPH_FILE_NAME, PPH_SORT_ORDER
		 FROM \`poi_photo\`
		 WHERE PPH_POI_ID=? AND PPH_DELETED_ON IS NULL
		 ORDER BY PPH_SORT_ORDER ASC, PPH_ID ASC`,
		[recordId]);
}

function getSites(recordId)
{
	return $Db.executeQuery(
		`SELECT PSI_ID, PSI_COM_ID, c.COM_NAME
		 FROM \`poi_site\` s
		    JOIN \`community\` c ON s.PSI_COM_ID = c.COM_ID
		 WHERE s.PSI_POI_ID=? AND s.PSI_DELETED_ON IS NULL
		 ORDER BY c.COM_NAME ASC`,
		[recordId]);
}

function getIncidents(recordId)
{
	return $Db.executeQuery(
		`SELECT PIN_ID, PIN_SVC_ID
		 FROM \`poi_incident\`
		 WHERE PIN_POI_ID=? AND PIN_DELETED_ON IS NULL
		 ORDER BY PIN_SVC_ID ASC`,
		[recordId]);
}

function buildFullName(firstName, lastName)
{
	return ((firstName || "") + " " + (lastName || "")).trim() || null;
}

function mapRecordRow(row, photos, sites, incidents, isOfficer, viewedOn)
{
	let record = {
		record_id: row.POI_ID,
		record_type: row.POI_RECORD_TYPE,
		record_type_name: $DataItems.getItemName(row.POI_RECORD_TYPE, TABLE_POI_RECORD_TYPE) || row.POI_RECORD_TYPE,
		status: row.POI_STATUS,
		first_name: row.POI_FIRST_NAME,
		last_name: row.POI_LAST_NAME,
		full_name: buildFullName(row.POI_FIRST_NAME, row.POI_LAST_NAME),
		known_aliases: row.POI_KNOWN_ALIASES || null,
		date_of_birth: row.POI_DATE_OF_BIRTH || null,
		gender: row.POI_GENDER || null,
		physical_description: row.POI_PHYSICAL_DESCRIPTION || null,
		threat_level: row.POI_THREAT_LEVEL,
		threat_level_name: $DataItems.getItemName(row.POI_THREAT_LEVEL, TABLE_POI_THREAT_LEVEL) || row.POI_THREAT_LEVEL,
		summary: row.POI_SUMMARY,
		photos: photos.map(p => ({
			photo_id: p.PPH_ID,
			url: $Files.getUrl({file_name: p.PPH_FILE_NAME}),
			sort_order: p.PPH_SORT_ORDER
		})),
		sites: sites.map(s => ({
			site_id: s.PSI_ID,
			community_id: s.PSI_COM_ID,
			community_name: s.COM_NAME
		})),
		related_incidents: incidents.map(i => ({
			incident_link_id: i.PIN_ID,
			call_id: i.PIN_SVC_ID
		})),
		expiry_date: row.POI_EXPIRY_DATE || null,
		issue_date: row.POI_ISSUE_DATE || null,
		created_on: row.POI_CREATED_ON,
		last_update: row.POI_LAST_UPDATE || null,
	};

	// Officer view: hide internal/legal fields, add view badge info
	if (isOfficer)
	{
		if (viewedOn === undefined)
		{
			record.view_badge = "new";
		}
		else if (row.POI_LAST_UPDATE && new Date(row.POI_LAST_UPDATE) > new Date(viewedOn))
		{
			record.view_badge = "updated";
		}
		else
		{
			record.view_badge = null;
		}
	}
	else
	{
		// Admin fields
		record.internal_notes = row.POI_INTERNAL_NOTES || null;
		record.inactivation_reason = row.POI_INACTIVATION_REASON || null;
		record.approved_by = row.POI_APPROVED_BY || null;
		record.approved_on = row.POI_APPROVED_ON || null;
		record.created_by = row.POI_CREATED_BY;
		record.created_by_name = null; // populated by caller if needed

		// Type-specific admin fields
		if (row.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_POI)
		{
			record.incident_history_summary = row.POI_INCIDENT_HISTORY_SUMMARY || null;
			record.watch_level_review_date = row.POI_WATCH_LEVEL_REVIEW_DATE || null;
			record.associated_individuals = row.POI_ASSOCIATED_INDIVIDUALS || null;
		}
		else if (row.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_TRESPASS)
		{
			record.trespass_notice_number = row.POI_TRESPASS_NOTICE_NUMBER || null;
			record.issuing_authority = row.POI_ISSUING_AUTHORITY || null;
			record.property_area_covered = row.POI_PROPERTY_AREA_COVERED || null;
			record.notice_document = row.POI_NOTICE_DOCUMENT
				? $Files.getUrl({file_name: row.POI_NOTICE_DOCUMENT})
				: null;
			record.renewal_reminder_days = row.POI_RENEWAL_REMINDER_DAYS;
			record.law_enforcement_contact = row.POI_LAW_ENFORCEMENT_CONTACT || null;
			record.conditions = row.POI_CONDITIONS || null;
		}
		else if (row.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_METRO_RED_CARD)
		{
			record.red_card_number = row.POI_RED_CARD_NUMBER || null;
			record.issuing_authority = row.POI_ISSUING_AUTHORITY || null;
			record.lines = row.POI_LINES || null;
			record.card_document = row.POI_CARD_DOCUMENT
				? $Files.getUrl({file_name: row.POI_CARD_DOCUMENT})
				: null;
			record.renewal_reminder_days = row.POI_RENEWAL_REMINDER_DAYS;
		}
	}

	// Officer-visible type-specific fields (non-sensitive)
	if (isOfficer)
	{
		if (row.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_TRESPASS)
		{
			record.issuing_authority = row.POI_ISSUING_AUTHORITY || null;
			record.property_area_covered = row.POI_PROPERTY_AREA_COVERED || null;
		}
		else if (row.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_METRO_RED_CARD)
		{
			record.issuing_authority = row.POI_ISSUING_AUTHORITY || null;
			record.lines = row.POI_LINES || null;
		}
	}

	return record;
}

function resolveFileIds(fileIds)
{
	if (!fileIds || fileIds.length === 0)
	{
		return {};
	}
	let uniqueIds = [...new Set(fileIds)];
	let rows = $Db.executeQuery(
		`SELECT FIL_ID, FIL_FILE_NAME FROM \`file\` WHERE FIL_ID IN (${uniqueIds.toPlaceholders()})`,
		uniqueIds);
	let map = {};
	for (let i = 0; i < rows.length; i++)
	{
		map[rows[i].FIL_ID] = rows[i].FIL_FILE_NAME;
	}
	return map;
}

function validateCommunityIds(communityIds)
{
	if (!Array.isArray(communityIds) || communityIds.length === 0)
	{
		return false;
	}
	let uniqueIds = [...new Set(communityIds)];
	let rows = $Db.executeQuery(
		`SELECT COM_ID FROM \`community\` WHERE COM_ID IN (${uniqueIds.toPlaceholders()}) AND COM_DELETED_ON IS NULL`,
		uniqueIds);
	return rows.length === uniqueIds.length;
}

function validateIncidentIds(incidentIds)
{
	if (!incidentIds || incidentIds.length === 0)
	{
		return true;
	}
	let uniqueIds = [...new Set(incidentIds)];
	let rows = $Db.executeQuery(
		`SELECT SVC_ID FROM \`service_call\` WHERE SVC_ID IN (${uniqueIds.toPlaceholders()}) AND SVC_DELETED_ON IS NULL`,
		uniqueIds);
	return rows.length === uniqueIds.length;
}

function insertPhotos(recordId, fileNames, now)
{
	if (fileNames.length === 0)
	{
		return null;
	}
	let placeholders = fileNames.map(() => "(?,?,?,?)").join(", ");
	let params = [];
	for (let i = 0; i < fileNames.length; i++)
	{
		params.push(recordId, fileNames[i], i, now);
	}
	$Db.executeQuery(
		`INSERT INTO \`poi_photo\` (PPH_POI_ID, PPH_FILE_NAME, PPH_SORT_ORDER, PPH_CREATED_ON)
		 VALUES ${placeholders}`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function insertSites(recordId, communityIds, now)
{
	if (communityIds.length === 0)
	{
		return null;
	}
	let uniqueIds = [...new Set(communityIds)];
	let placeholders = uniqueIds.map(() => "(?,?,?)").join(", ");
	let params = [];
	for (let i = 0; i < uniqueIds.length; i++)
	{
		params.push(recordId, uniqueIds[i], now);
	}
	// ON DUPLICATE KEY UPDATE restores soft-deleted rows with same (POI_ID, COM_ID)
	$Db.executeQuery(
		`INSERT INTO \`poi_site\` (PSI_POI_ID, PSI_COM_ID, PSI_CREATED_ON)
		 VALUES ${placeholders}
		 ON DUPLICATE KEY UPDATE PSI_DELETED_ON=NULL, PSI_CREATED_ON=VALUES(PSI_CREATED_ON)`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function insertIncidents(recordId, incidentIds, now)
{
	if (!incidentIds || incidentIds.length === 0)
	{
		return null;
	}
	let uniqueIds = [...new Set(incidentIds)];
	let placeholders = uniqueIds.map(() => "(?,?,?)").join(", ");
	let params = [];
	for (let i = 0; i < uniqueIds.length; i++)
	{
		params.push(recordId, uniqueIds[i], now);
	}
	// ON DUPLICATE KEY UPDATE restores soft-deleted rows with same (POI_ID, SVC_ID)
	$Db.executeQuery(
		`INSERT INTO \`poi_incident\` (PIN_POI_ID, PIN_SVC_ID, PIN_CREATED_ON)
		 VALUES ${placeholders}
		 ON DUPLICATE KEY UPDATE PIN_DELETED_ON=NULL, PIN_CREATED_ON=VALUES(PIN_CREATED_ON)`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function softDeletePhotos(recordId, now)
{
	$Db.executeQuery(
		`UPDATE \`poi_photo\` SET PPH_DELETED_ON=? WHERE PPH_POI_ID=? AND PPH_DELETED_ON IS NULL`,
		[now, recordId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function softDeleteSites(recordId, now)
{
	$Db.executeQuery(
		`UPDATE \`poi_site\` SET PSI_DELETED_ON=? WHERE PSI_POI_ID=? AND PSI_DELETED_ON IS NULL`,
		[now, recordId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function softDeleteIncidents(recordId, now)
{
	$Db.executeQuery(
		`UPDATE \`poi_incident\` SET PIN_DELETED_ON=? WHERE PIN_POI_ID=? AND PIN_DELETED_ON IS NULL`,
		[now, recordId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function getOfficerIdsForCommunities(communityIds)
{
	if (!communityIds || communityIds.length === 0)
	{
		return [];
	}
	let uniqueIds = [...new Set(communityIds)];
	let rows = $Db.executeQuery(
		`SELECT DISTINCT ud.USD_USR_ID
		 FROM \`user_details\` ud
		    JOIN \`user\` u ON ud.USD_USR_ID = u.USR_ID
		 WHERE ud.USD_COM_ID IN (${uniqueIds.toPlaceholders()})
		   AND u.USR_TYPE=?
		   AND u.USR_STATUS=?
		   AND ud.USD_DELETED_ON IS NULL`,
		[...uniqueIds, $Const.USER_TYPE_OFFICER, $Const.USER_STATUS_ACTIVE]);
	return rows.map(r => r.USD_USR_ID);
}

function getSiteIds(recordId)
{
	let rows = $Db.executeQuery(
		`SELECT PSI_COM_ID FROM \`poi_site\` WHERE PSI_POI_ID=? AND PSI_DELETED_ON IS NULL`,
		[recordId]);
	return rows.map(r => r.PSI_COM_ID);
}

function sendPoiNotification(session, type, record, templateVars, targetUserIds)
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
		payload: JSON.stringify({entity_type: "poi", entity_id: record.POI_ID}),
		send_push: true
	});
}

function getPoiSettings()
{
	let rows = $Db.executeQuery(
		`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
		[$Const.KVL_SETTINGS_POI]);
	if (rows.length > 0)
	{
		try
		{
			return JSON.parse(rows[0].KVL_VALUE);
		}
		catch (e)
		{
			// fall through to defaults
		}
	}
	let defaults = $Config.get("SETTINGS_DEFAULTS");
	return (defaults && defaults.poi) ? defaults.poi : {};
}

function getRecordTypeName(recordType)
{
	return $DataItems.getItemName(recordType, TABLE_POI_RECORD_TYPE) || recordType;
}


module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
		$DataItems.define(TABLE_POI_RECORD_TYPE);
		$DataItems.define(TABLE_POI_THREAT_LEVEL);
		$DataItems.define(TABLE_POI_STATUS);
		$DataItems.define(TABLE_POI_GENDER);
	}

	// =========================================================================
	// Get POI List
	// =========================================================================

	get_poi_list()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let conditions = ["r.POI_DELETED_ON IS NULL"];
		let params = [];

		// Role-based scoping
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			// Officers see only active records for their community
			let communityId = $Funcs.getUserCommunityId(userId);
			if (!communityId)
			{
				return {...$ERRS.ERR_SUCCESS, records: [], total_count: 0};
			}
			conditions.push("r.POI_STATUS=?");
			params.push($Const.POI_STATUS_ACTIVE);
			conditions.push("EXISTS (SELECT 1 FROM `poi_site` ps WHERE ps.PSI_POI_ID = r.POI_ID AND ps.PSI_COM_ID=? AND ps.PSI_DELETED_ON IS NULL)");
			params.push(communityId);
		}
		else
		{
			// Admin: optional filters
			if (this.$community_id > 0)
			{
				conditions.push("EXISTS (SELECT 1 FROM `poi_site` ps WHERE ps.PSI_POI_ID = r.POI_ID AND ps.PSI_COM_ID=? AND ps.PSI_DELETED_ON IS NULL)");
				params.push(this.$community_id);
			}

			if (!$Utils.empty(this.$status))
			{
				if (!$DataItems.isValidItemId(this.$status, TABLE_POI_STATUS))
				{
					return $ERRS.ERR_POI_INVALID_STATUS;
				}
				conditions.push("r.POI_STATUS=?");
				params.push(this.$status);
			}
		}

		// Common filters
		if (!$Utils.empty(this.$record_type))
		{
			if (!$DataItems.isValidItemId(this.$record_type, TABLE_POI_RECORD_TYPE))
			{
				return $ERRS.ERR_POI_INVALID_RECORD_TYPE;
			}
			conditions.push("r.POI_RECORD_TYPE=?");
			params.push(this.$record_type);
		}

		if (!$Utils.empty(this.$threat_level))
		{
			if (!$DataItems.isValidItemId(this.$threat_level, TABLE_POI_THREAT_LEVEL))
			{
				return $ERRS.ERR_POI_INVALID_THREAT_LEVEL;
			}
			conditions.push("r.POI_THREAT_LEVEL=?");
			params.push(this.$threat_level);
		}

		if (this.$expiring_within_days > 0)
		{
			conditions.push("r.POI_EXPIRY_DATE IS NOT NULL AND r.POI_EXPIRY_DATE <= DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)");
			params.push(this.$expiring_within_days);
		}

		if (!$Utils.empty(this.$search_text))
		{
			let searchParam = "%" + this.$search_text + "%";
			conditions.push("(CONCAT(r.POI_FIRST_NAME, ' ', r.POI_LAST_NAME) LIKE ? OR r.POI_KNOWN_ALIASES LIKE ? OR r.POI_SUMMARY LIKE ? OR CAST(r.POI_ID AS CHAR) LIKE ?)");
			params.push(searchParam, searchParam, searchParam, searchParam);
		}

		let whereClause = conditions.join(" AND ");

		// Sort
		let sortColumn = "r.POI_CREATED_ON";
		let validSorts = {
			created_on: "r.POI_CREATED_ON",
			threat_level: `FIELD(r.POI_THREAT_LEVEL, '${$Const.POI_THREAT_LEVEL_CRITICAL}', '${$Const.POI_THREAT_LEVEL_HIGH}', '${$Const.POI_THREAT_LEVEL_MEDIUM}', '${$Const.POI_THREAT_LEVEL_LOW}')`,
			name: "r.POI_FIRST_NAME",
			last_update: "r.POI_LAST_UPDATE"
		};
		if (this.$sort_by && validSorts[this.$sort_by])
		{
			sortColumn = validSorts[this.$sort_by];
		}
		let sortDir = (this.$sort_dir === "asc") ? "ASC" : "DESC";

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`poi_record\` r
			 WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		// Limit / offset
		let limit = Math.min(Math.max(this.$limit || 20, 1), 100);
		let offset = Math.max(this.$offset || 0, 0);

		// Fetch page
		let rows = $Db.executeQuery(
			`SELECT r.POI_ID, r.POI_RECORD_TYPE, r.POI_STATUS,
			        r.POI_FIRST_NAME, r.POI_LAST_NAME, r.POI_KNOWN_ALIASES,
			        r.POI_THREAT_LEVEL, r.POI_SUMMARY,
			        r.POI_EXPIRY_DATE, r.POI_CREATED_ON, r.POI_LAST_UPDATE
			 FROM \`poi_record\` r
			 WHERE ${whereClause}
			 ORDER BY ${sortColumn} ${sortDir}, r.POI_ID DESC
			 LIMIT ${limit} OFFSET ${offset}`,
			params);

		if (rows.length === 0)
		{
			return {...$ERRS.ERR_SUCCESS, records: [], total_count: totalCount};
		}

		// Batch-fetch first photo for each record
		let recordIds = rows.map(r => r.POI_ID);
		let photoRows = $Db.executeQuery(
			`SELECT PPH_POI_ID, PPH_FILE_NAME
			 FROM \`poi_photo\`
			 WHERE PPH_POI_ID IN (${recordIds.toPlaceholders()}) AND PPH_DELETED_ON IS NULL AND PPH_SORT_ORDER=0
			 ORDER BY PPH_ID ASC`,
			recordIds);
		let firstPhotoMap = {};
		for (let i = 0; i < photoRows.length; i++)
		{
			if (!firstPhotoMap[photoRows[i].PPH_POI_ID])
			{
				firstPhotoMap[photoRows[i].PPH_POI_ID] = photoRows[i].PPH_FILE_NAME;
			}
		}

		// Batch-fetch sites for each record
		let siteRows = $Db.executeQuery(
			`SELECT ps.PSI_POI_ID, ps.PSI_COM_ID, c.COM_NAME
			 FROM \`poi_site\` ps
			    JOIN \`community\` c ON ps.PSI_COM_ID = c.COM_ID
			 WHERE ps.PSI_POI_ID IN (${recordIds.toPlaceholders()}) AND ps.PSI_DELETED_ON IS NULL
			 ORDER BY c.COM_NAME ASC`,
			recordIds);
		let sitesMap = {};
		for (let i = 0; i < siteRows.length; i++)
		{
			let sr = siteRows[i];
			if (!sitesMap[sr.PSI_POI_ID])
			{
				sitesMap[sr.PSI_POI_ID] = [];
			}
			sitesMap[sr.PSI_POI_ID].push({community_id: sr.PSI_COM_ID, community_name: sr.COM_NAME});
		}

		// Batch-fetch view status for officers
		let viewMap = {};
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let viewRows = $Db.executeQuery(
				`SELECT PVW_POI_ID, PVW_VIEWED_ON
				 FROM \`poi_view\`
				 WHERE PVW_POI_ID IN (${recordIds.toPlaceholders()}) AND PVW_USR_ID=?`,
				[...recordIds, userId]);
			for (let i = 0; i < viewRows.length; i++)
			{
				viewMap[viewRows[i].PVW_POI_ID] = viewRows[i].PVW_VIEWED_ON;
			}
		}

		let records = rows.map(row =>
		{
			let r = {
				record_id: row.POI_ID,
				record_type: row.POI_RECORD_TYPE,
				record_type_name: getRecordTypeName(row.POI_RECORD_TYPE),
				status: row.POI_STATUS,
				first_name: row.POI_FIRST_NAME,
				last_name: row.POI_LAST_NAME,
				full_name: buildFullName(row.POI_FIRST_NAME, row.POI_LAST_NAME),
				known_aliases: row.POI_KNOWN_ALIASES || null,
				threat_level: row.POI_THREAT_LEVEL,
				threat_level_name: $DataItems.getItemName(row.POI_THREAT_LEVEL, TABLE_POI_THREAT_LEVEL) || row.POI_THREAT_LEVEL,
				summary: row.POI_SUMMARY,
				photo_url: firstPhotoMap[row.POI_ID]
					? $Files.getUrl({file_name: firstPhotoMap[row.POI_ID]})
					: null,
				sites: sitesMap[row.POI_ID] || [],
				expiry_date: row.POI_EXPIRY_DATE || null,
				created_on: row.POI_CREATED_ON,
				last_update: row.POI_LAST_UPDATE || null,
			};

			// Officer: add view badge
			if (userType === $Const.USER_TYPE_OFFICER)
			{
				let viewedOn = viewMap[row.POI_ID];
				if (viewedOn === undefined)
				{
					r.view_badge = "new";
				}
				else if (row.POI_LAST_UPDATE && new Date(row.POI_LAST_UPDATE) > new Date(viewedOn))
				{
					r.view_badge = "updated";
				}
				else
				{
					r.view_badge = null;
				}
			}

			return r;
		});

		return {...$ERRS.ERR_SUCCESS, records: records, total_count: totalCount};
	}

	// =========================================================================
	// Get POI Record
	// =========================================================================

	get_poi_record()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;
		let isOfficer = (userType === $Const.USER_TYPE_OFFICER);

		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		// Fetch sites once (needed for both access check and response)
		let sites = getSites(record.POI_ID);

		// Access control for officers
		if (isOfficer)
		{
			if (record.POI_STATUS !== $Const.POI_STATUS_ACTIVE)
			{
				return $ERRS.ERR_POI_RECORD_NOT_FOUND;
			}
			let communityId = $Funcs.getUserCommunityId(userId);
			let siteComIds = sites.map(s => s.PSI_COM_ID);
			if (siteComIds.indexOf(communityId) === -1)
			{
				return $ERRS.ERR_POI_RECORD_NOT_FOUND;
			}
		}

		// Fetch remaining related data
		let photos = getPhotos(record.POI_ID);
		let incidents = getIncidents(record.POI_ID);

		// View tracking for officers
		let viewedOn = undefined;
		if (isOfficer)
		{
			let viewRows = $Db.executeQuery(
				`SELECT PVW_VIEWED_ON FROM \`poi_view\` WHERE PVW_POI_ID=? AND PVW_USR_ID=?`,
				[record.POI_ID, userId]);
			if (viewRows.length > 0)
			{
				viewedOn = viewRows[0].PVW_VIEWED_ON;
			}
		}

		let result = mapRecordRow(record, photos, sites, incidents, isOfficer, viewedOn);

		// Add admin-only enrichment
		if (!isOfficer)
		{
			let userNames = $Funcs.getUserNames(
				[record.POI_CREATED_BY, record.POI_APPROVED_BY].filter(id => !$Utils.empty(id))
			);
			result.created_by_name = userNames[record.POI_CREATED_BY] || null;
			if (record.POI_APPROVED_BY)
			{
				result.approved_by_name = userNames[record.POI_APPROVED_BY] || null;
			}
		}

		// Add response guidance for officers
		if (isOfficer)
		{
			let settings = getPoiSettings();
			if (record.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_POI)
			{
				result.response_guidance = settings.default_poi_guidance || "";
			}
			else if (record.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_TRESPASS)
			{
				result.response_guidance = settings.default_trespass_guidance || "";
			}
			else if (record.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_METRO_RED_CARD)
			{
				result.response_guidance = settings.default_red_card_guidance || "";
			}
		}

		return {...$ERRS.ERR_SUCCESS, record: result};
	}

	// =========================================================================
	// Create POI Record
	// =========================================================================

	create_poi_record()
	{
		let userId = this.$Session.userId;

		// Validate record type
		if (!$DataItems.isValidItemId(this.$record_type, TABLE_POI_RECORD_TYPE))
		{
			return $ERRS.ERR_POI_INVALID_RECORD_TYPE;
		}

		// Validate threat level
		if (!$DataItems.isValidItemId(this.$threat_level, TABLE_POI_THREAT_LEVEL))
		{
			return $ERRS.ERR_POI_INVALID_THREAT_LEVEL;
		}

		// Validate names
		if ($Utils.empty(this.$first_name) || this.$first_name.length > MAX_FIRST_NAME_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "first_name");
		}
		if ($Utils.empty(this.$last_name) || this.$last_name.length > MAX_LAST_NAME_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "last_name");
		}

		// Validate optional string lengths
		if (this.$known_aliases && this.$known_aliases.length > MAX_ALIASES_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "known_aliases");
		}
		if (this.$physical_description && this.$physical_description.length > MAX_PHYSICAL_DESC_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "physical_description");
		}
		if ($Utils.empty(this.$summary) || this.$summary.length > MAX_SUMMARY_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "summary");
		}
		if (this.$internal_notes && this.$internal_notes.length > MAX_INTERNAL_NOTES_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "internal_notes");
		}
		if (this.$incident_history_summary && this.$incident_history_summary.length > MAX_INCIDENT_HISTORY_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "incident_history_summary");
		}
		if (this.$associated_individuals && this.$associated_individuals.length > MAX_ASSOCIATED_INDIVIDUALS_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "associated_individuals");
		}

		// Validate gender if provided
		if (!$Utils.empty(this.$gender) && !$DataItems.isValidItemId(this.$gender, TABLE_POI_GENDER))
		{
			return $ERRS.ERR_POI_INVALID_GENDER;
		}

		// Validate photos (at least 1, max 10)
		if (!Array.isArray(this.$photo_file_ids) || this.$photo_file_ids.length < MIN_PHOTOS)
		{
			return $ERRS.ERR_POI_PHOTO_REQUIRED;
		}
		if (this.$photo_file_ids.length > MAX_PHOTOS)
		{
			return $ERRS.ERR_POI_PHOTO_LIMIT_REACHED;
		}

		// Validate communities (at least 1)
		if (!Array.isArray(this.$community_ids) || this.$community_ids.length === 0)
		{
			return $ERRS.ERR_POI_SITE_REQUIRED;
		}
		if (!validateCommunityIds(this.$community_ids))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		// Validate type-specific required fields
		if (this.$record_type === $Const.POI_RECORD_TYPE_TRESPASS)
		{
			if ($Utils.empty(this.$trespass_notice_number) ||
				$Utils.empty(this.$issuing_authority) ||
				$Utils.empty(this.$property_area_covered) ||
				$Utils.empty(this.$issue_date) ||
				$Utils.empty(this.$expiry_date))
			{
				return $ERRS.ERR_POI_TRESPASS_FIELDS_REQUIRED;
			}
			if ($Utils.empty(this.$notice_document_file_id))
			{
				return $ERRS.ERR_POI_TRESPASS_FIELDS_REQUIRED;
			}
		}
		else if (this.$record_type === $Const.POI_RECORD_TYPE_METRO_RED_CARD)
		{
			if ($Utils.empty(this.$red_card_number) ||
				$Utils.empty(this.$issuing_authority) ||
				$Utils.empty(this.$issue_date) ||
				$Utils.empty(this.$expiry_date))
			{
				return $ERRS.ERR_POI_RED_CARD_FIELDS_REQUIRED;
			}
		}

		// Resolve file IDs (SELECTs — before transaction)
		let allFileIds = [...this.$photo_file_ids];
		if (!$Utils.empty(this.$notice_document_file_id))
		{
			allFileIds.push(this.$notice_document_file_id);
		}
		if (!$Utils.empty(this.$card_document_file_id))
		{
			allFileIds.push(this.$card_document_file_id);
		}
		let fileNameMap = resolveFileIds(allFileIds);
		if (Object.keys(fileNameMap).length !== [...new Set(allFileIds)].length)
		{
			return $ERRS.ERR_FILE_NOT_FOUND;
		}

		let photoFileNames = this.$photo_file_ids.map(id => fileNameMap[id]);

		// Validate incidents if provided
		let relatedIncidentIds = this.$related_incident_ids || [];
		if (relatedIncidentIds.length > 0 && !validateIncidentIds(relatedIncidentIds))
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "related_incident_ids");
		}

		// Determine renewal reminder days
		let renewalReminderDays = null;
		if (this.$record_type !== $Const.POI_RECORD_TYPE_POI)
		{
			if (this.$renewal_reminder_days >= 0)
			{
				renewalReminderDays = this.$renewal_reminder_days;
			}
			else
			{
				let settings = getPoiSettings();
				renewalReminderDays = settings.renewal_reminder_days || 14;
			}
		}

		let shouldPublish = (this.$publish === true || this.$publish === "true");
		let status = shouldPublish ? $Const.POI_STATUS_ACTIVE : $Const.POI_STATUS_DRAFT;
		let now = $Utils.now();

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`poi_record\`
			 (POI_RECORD_TYPE, POI_STATUS, POI_FIRST_NAME, POI_LAST_NAME,
			  POI_KNOWN_ALIASES, POI_DATE_OF_BIRTH, POI_GENDER,
			  POI_PHYSICAL_DESCRIPTION, POI_THREAT_LEVEL, POI_SUMMARY,
			  POI_INTERNAL_NOTES, POI_INCIDENT_HISTORY_SUMMARY,
			  POI_WATCH_LEVEL_REVIEW_DATE, POI_ASSOCIATED_INDIVIDUALS,
			  POI_TRESPASS_NOTICE_NUMBER, POI_ISSUING_AUTHORITY,
			  POI_PROPERTY_AREA_COVERED, POI_ISSUE_DATE, POI_EXPIRY_DATE,
			  POI_NOTICE_DOCUMENT, POI_RENEWAL_REMINDER_DAYS,
			  POI_LAW_ENFORCEMENT_CONTACT, POI_CONDITIONS,
			  POI_RED_CARD_NUMBER, POI_LINES, POI_CARD_DOCUMENT,
			  POI_APPROVED_BY, POI_APPROVED_ON,
			  POI_CREATED_BY, POI_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			[
				this.$record_type, status, this.$first_name, this.$last_name,
				$Utils.empty(this.$known_aliases) ? null : this.$known_aliases,
				$Utils.empty(this.$date_of_birth) ? null : this.$date_of_birth,
				$Utils.empty(this.$gender) ? null : this.$gender,
				$Utils.empty(this.$physical_description) ? null : this.$physical_description,
				this.$threat_level, this.$summary,
				$Utils.empty(this.$internal_notes) ? null : this.$internal_notes,
				$Utils.empty(this.$incident_history_summary) ? null : this.$incident_history_summary,
				$Utils.empty(this.$watch_level_review_date) ? null : this.$watch_level_review_date,
				$Utils.empty(this.$associated_individuals) ? null : this.$associated_individuals,
				$Utils.empty(this.$trespass_notice_number) ? null : this.$trespass_notice_number,
				$Utils.empty(this.$issuing_authority) ? null : this.$issuing_authority,
				$Utils.empty(this.$property_area_covered) ? null : this.$property_area_covered,
				$Utils.empty(this.$issue_date) ? null : this.$issue_date,
				$Utils.empty(this.$expiry_date) ? null : this.$expiry_date,
				!$Utils.empty(this.$notice_document_file_id) ? fileNameMap[this.$notice_document_file_id] : null,
				renewalReminderDays,
				$Utils.empty(this.$law_enforcement_contact) ? null : this.$law_enforcement_contact,
				$Utils.empty(this.$conditions) ? null : this.$conditions,
				$Utils.empty(this.$red_card_number) ? null : this.$red_card_number,
				$Utils.empty(this.$lines) ? null : this.$lines,
				!$Utils.empty(this.$card_document_file_id) ? fileNameMap[this.$card_document_file_id] : null,
				shouldPublish ? userId : null,
				shouldPublish ? now : null,
				userId, now
			]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let recordId = $Db.insertId();

		// Insert photos
		let photoErr = insertPhotos(recordId, photoFileNames, now);
		if (photoErr)
		{
			$Db.rollbackTransaction();
			return photoErr;
		}

		// Insert sites
		let siteErr = insertSites(recordId, this.$community_ids, now);
		if (siteErr)
		{
			$Db.rollbackTransaction();
			return siteErr;
		}

		// Insert incidents
		let incidentErr = insertIncidents(recordId, relatedIncidentIds, now);
		if (incidentErr)
		{
			$Db.rollbackTransaction();
			return incidentErr;
		}

		$Db.commitTransaction();

		// Send notifications if published
		if (shouldPublish)
		{
			let officerIds = getOfficerIdsForCommunities(this.$community_ids);
			let fullName = buildFullName(this.$first_name, this.$last_name);
			sendPoiNotification(this.$Session, "poi_active",
				{POI_ID: recordId},
				{poi_type: getRecordTypeName(this.$record_type), poi_name: fullName},
				officerIds);
		}

		return {...$ERRS.ERR_SUCCESS, record_id: recordId};
	}

	// =========================================================================
	// Update POI Record
	// =========================================================================

	update_poi_record()
	{
		let userId = this.$Session.userId;

		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		// Can only edit draft or active records
		if (record.POI_STATUS !== $Const.POI_STATUS_DRAFT &&
			record.POI_STATUS !== $Const.POI_STATUS_ACTIVE)
		{
			return $ERRS.ERR_POI_CANNOT_EDIT;
		}

		let updates = [];
		let params = [];
		let isVersionUpdate = false;

		// First name
		if (this.$first_name !== null && this.$first_name !== undefined)
		{
			if ($Utils.empty(this.$first_name) || this.$first_name.length > MAX_FIRST_NAME_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "first_name");
			}
			updates.push("POI_FIRST_NAME=?");
			params.push(this.$first_name);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("first_name") === -1) isVersionUpdate = true;
		}

		// Last name
		if (this.$last_name !== null && this.$last_name !== undefined)
		{
			if ($Utils.empty(this.$last_name) || this.$last_name.length > MAX_LAST_NAME_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "last_name");
			}
			updates.push("POI_LAST_NAME=?");
			params.push(this.$last_name);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("last_name") === -1) isVersionUpdate = true;
		}

		// Known aliases
		if (this.$known_aliases !== null && this.$known_aliases !== undefined)
		{
			if (this.$known_aliases.length > MAX_ALIASES_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "known_aliases");
			}
			updates.push("POI_KNOWN_ALIASES=?");
			params.push($Utils.empty(this.$known_aliases) ? null : this.$known_aliases);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("known_aliases") === -1) isVersionUpdate = true;
		}

		// Date of birth
		if (this.$date_of_birth !== null && this.$date_of_birth !== undefined)
		{
			updates.push("POI_DATE_OF_BIRTH=?");
			params.push($Utils.empty(this.$date_of_birth) ? null : this.$date_of_birth);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("date_of_birth") === -1) isVersionUpdate = true;
		}

		// Gender
		if (this.$gender !== null && this.$gender !== undefined)
		{
			if (!$Utils.empty(this.$gender) && !$DataItems.isValidItemId(this.$gender, TABLE_POI_GENDER))
			{
				return $ERRS.ERR_POI_INVALID_GENDER;
			}
			updates.push("POI_GENDER=?");
			params.push($Utils.empty(this.$gender) ? null : this.$gender);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("gender") === -1) isVersionUpdate = true;
		}

		// Physical description
		if (this.$physical_description !== null && this.$physical_description !== undefined)
		{
			if (this.$physical_description.length > MAX_PHYSICAL_DESC_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "physical_description");
			}
			updates.push("POI_PHYSICAL_DESCRIPTION=?");
			params.push($Utils.empty(this.$physical_description) ? null : this.$physical_description);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("physical_description") === -1) isVersionUpdate = true;
		}

		// Threat level
		if (this.$threat_level !== null && this.$threat_level !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$threat_level, TABLE_POI_THREAT_LEVEL))
			{
				return $ERRS.ERR_POI_INVALID_THREAT_LEVEL;
			}
			updates.push("POI_THREAT_LEVEL=?");
			params.push(this.$threat_level);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("threat_level") === -1) isVersionUpdate = true;
		}

		// Summary
		if (this.$summary !== null && this.$summary !== undefined)
		{
			if ($Utils.empty(this.$summary) || this.$summary.length > MAX_SUMMARY_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "summary");
			}
			updates.push("POI_SUMMARY=?");
			params.push(this.$summary);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("summary") === -1) isVersionUpdate = true;
		}

		// Internal notes (always editable)
		if (this.$internal_notes !== null && this.$internal_notes !== undefined)
		{
			if (this.$internal_notes.length > MAX_INTERNAL_NOTES_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "internal_notes");
			}
			updates.push("POI_INTERNAL_NOTES=?");
			params.push($Utils.empty(this.$internal_notes) ? null : this.$internal_notes);
		}

		// POI-specific fields
		if (this.$incident_history_summary !== null && this.$incident_history_summary !== undefined)
		{
			if (this.$incident_history_summary.length > MAX_INCIDENT_HISTORY_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "incident_history_summary");
			}
			updates.push("POI_INCIDENT_HISTORY_SUMMARY=?");
			params.push($Utils.empty(this.$incident_history_summary) ? null : this.$incident_history_summary);
		}

		// Watch level review date (always editable)
		if (this.$watch_level_review_date !== null && this.$watch_level_review_date !== undefined)
		{
			updates.push("POI_WATCH_LEVEL_REVIEW_DATE=?");
			params.push($Utils.empty(this.$watch_level_review_date) ? null : this.$watch_level_review_date);
		}

		if (this.$associated_individuals !== null && this.$associated_individuals !== undefined)
		{
			if (this.$associated_individuals.length > MAX_ASSOCIATED_INDIVIDUALS_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "associated_individuals");
			}
			updates.push("POI_ASSOCIATED_INDIVIDUALS=?");
			params.push($Utils.empty(this.$associated_individuals) ? null : this.$associated_individuals);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("associated_individuals") === -1) isVersionUpdate = true;
		}

		// Trespass-specific
		if (this.$trespass_notice_number !== null && this.$trespass_notice_number !== undefined)
		{
			updates.push("POI_TRESPASS_NOTICE_NUMBER=?");
			params.push($Utils.empty(this.$trespass_notice_number) ? null : this.$trespass_notice_number);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("trespass_notice_number") === -1) isVersionUpdate = true;
		}

		if (this.$issuing_authority !== null && this.$issuing_authority !== undefined)
		{
			updates.push("POI_ISSUING_AUTHORITY=?");
			params.push($Utils.empty(this.$issuing_authority) ? null : this.$issuing_authority);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("issuing_authority") === -1) isVersionUpdate = true;
		}

		if (this.$property_area_covered !== null && this.$property_area_covered !== undefined)
		{
			updates.push("POI_PROPERTY_AREA_COVERED=?");
			params.push($Utils.empty(this.$property_area_covered) ? null : this.$property_area_covered);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("property_area_covered") === -1) isVersionUpdate = true;
		}

		if (this.$issue_date !== null && this.$issue_date !== undefined)
		{
			updates.push("POI_ISSUE_DATE=?");
			params.push($Utils.empty(this.$issue_date) ? null : this.$issue_date);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("issue_date") === -1) isVersionUpdate = true;
		}

		if (this.$expiry_date !== null && this.$expiry_date !== undefined)
		{
			updates.push("POI_EXPIRY_DATE=?");
			params.push($Utils.empty(this.$expiry_date) ? null : this.$expiry_date);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("expiry_date") === -1) isVersionUpdate = true;
		}

		// Renewal reminder days (always editable)
		if (this.$renewal_reminder_days >= 0)
		{
			updates.push("POI_RENEWAL_REMINDER_DAYS=?");
			params.push(this.$renewal_reminder_days);
		}

		if (this.$law_enforcement_contact !== null && this.$law_enforcement_contact !== undefined)
		{
			updates.push("POI_LAW_ENFORCEMENT_CONTACT=?");
			params.push($Utils.empty(this.$law_enforcement_contact) ? null : this.$law_enforcement_contact);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("law_enforcement_contact") === -1) isVersionUpdate = true;
		}

		if (this.$conditions !== null && this.$conditions !== undefined)
		{
			updates.push("POI_CONDITIONS=?");
			params.push($Utils.empty(this.$conditions) ? null : this.$conditions);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("conditions") === -1) isVersionUpdate = true;
		}

		// Metro RC specific
		if (this.$red_card_number !== null && this.$red_card_number !== undefined)
		{
			updates.push("POI_RED_CARD_NUMBER=?");
			params.push($Utils.empty(this.$red_card_number) ? null : this.$red_card_number);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("red_card_number") === -1) isVersionUpdate = true;
		}

		if (this.$lines !== null && this.$lines !== undefined)
		{
			updates.push("POI_LINES=?");
			params.push($Utils.empty(this.$lines) ? null : this.$lines);
			if (ALWAYS_EDITABLE_FIELDS.indexOf("lines") === -1) isVersionUpdate = true;
		}

		// Document file updates (resolve before transaction)
		if (!$Utils.empty(this.$notice_document_file_id))
		{
			let fileMap = resolveFileIds([this.$notice_document_file_id]);
			if (!fileMap[this.$notice_document_file_id])
			{
				return $ERRS.ERR_FILE_NOT_FOUND;
			}
			updates.push("POI_NOTICE_DOCUMENT=?");
			params.push(fileMap[this.$notice_document_file_id]);
			isVersionUpdate = true;
		}

		if (!$Utils.empty(this.$card_document_file_id))
		{
			let fileMap = resolveFileIds([this.$card_document_file_id]);
			if (!fileMap[this.$card_document_file_id])
			{
				return $ERRS.ERR_FILE_NOT_FOUND;
			}
			updates.push("POI_CARD_DOCUMENT=?");
			params.push(fileMap[this.$card_document_file_id]);
			isVersionUpdate = true;
		}

		// Photos replacement (resolve before transaction)
		let newPhotoFileNames = null;
		if (this.$photo_file_ids !== null && this.$photo_file_ids !== undefined)
		{
			if (!Array.isArray(this.$photo_file_ids) || this.$photo_file_ids.length < MIN_PHOTOS)
			{
				return $ERRS.ERR_POI_PHOTO_REQUIRED;
			}
			if (this.$photo_file_ids.length > MAX_PHOTOS)
			{
				return $ERRS.ERR_POI_PHOTO_LIMIT_REACHED;
			}
			let photoFileMap = resolveFileIds(this.$photo_file_ids);
			if (Object.keys(photoFileMap).length !== [...new Set(this.$photo_file_ids)].length)
			{
				return $ERRS.ERR_FILE_NOT_FOUND;
			}
			newPhotoFileNames = this.$photo_file_ids.map(id => photoFileMap[id]);
			isVersionUpdate = true;
		}

		// Community IDs replacement
		let newCommunityIds = null;
		if (this.$community_ids !== null && this.$community_ids !== undefined)
		{
			if (!Array.isArray(this.$community_ids) || this.$community_ids.length === 0)
			{
				return $ERRS.ERR_POI_SITE_REQUIRED;
			}
			if (!validateCommunityIds(this.$community_ids))
			{
				return $ERRS.ERR_COMMUNITY_NOT_FOUND;
			}
			newCommunityIds = this.$community_ids;
			isVersionUpdate = true;
		}

		// Incident IDs replacement (always editable)
		let newIncidentIds = null;
		if (this.$related_incident_ids !== null && this.$related_incident_ids !== undefined)
		{
			if (!Array.isArray(this.$related_incident_ids))
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "related_incident_ids");
			}
			if (this.$related_incident_ids.length > 0 && !validateIncidentIds(this.$related_incident_ids))
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "related_incident_ids");
			}
			newIncidentIds = this.$related_incident_ids;
		}

		if (updates.length === 0 && newPhotoFileNames === null && newCommunityIds === null && newIncidentIds === null)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("POI_LAST_UPDATE=?");
		params.push(now);

		$Db.beginTransaction();

		// Update record
		params.push(this.$record_id);
		$Db.executeQuery(
			`UPDATE \`poi_record\` SET ${updates.join(", ")} WHERE POI_ID=? AND POI_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Replace photos if provided
		if (newPhotoFileNames !== null)
		{
			let delErr = softDeletePhotos(this.$record_id, now);
			if (delErr)
			{
				$Db.rollbackTransaction();
				return delErr;
			}
			let insErr = insertPhotos(this.$record_id, newPhotoFileNames, now);
			if (insErr)
			{
				$Db.rollbackTransaction();
				return insErr;
			}
		}

		// Replace sites if provided
		if (newCommunityIds !== null)
		{
			let delErr = softDeleteSites(this.$record_id, now);
			if (delErr)
			{
				$Db.rollbackTransaction();
				return delErr;
			}
			let insErr = insertSites(this.$record_id, newCommunityIds, now);
			if (insErr)
			{
				$Db.rollbackTransaction();
				return insErr;
			}
		}

		// Replace incidents if provided
		if (newIncidentIds !== null)
		{
			let delErr = softDeleteIncidents(this.$record_id, now);
			if (delErr)
			{
				$Db.rollbackTransaction();
				return delErr;
			}
			if (newIncidentIds.length > 0)
			{
				let insErr = insertIncidents(this.$record_id, newIncidentIds, now);
				if (insErr)
				{
					$Db.rollbackTransaction();
					return insErr;
				}
			}
		}

		$Db.commitTransaction();

		// Send notification if active record had a version-level update
		if (record.POI_STATUS === $Const.POI_STATUS_ACTIVE && isVersionUpdate)
		{
			let communityIds = newCommunityIds || getSiteIds(this.$record_id);
			let officerIds = getOfficerIdsForCommunities(communityIds);
			let fullName = buildFullName(
				this.$first_name || record.POI_FIRST_NAME,
				this.$last_name || record.POI_LAST_NAME
			);
			sendPoiNotification(this.$Session, "poi_updated",
				{POI_ID: this.$record_id},
				{poi_type: getRecordTypeName(record.POI_RECORD_TYPE), poi_name: fullName},
				officerIds);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Publish POI Record
	// =========================================================================

	publish_poi_record()
	{
		let userId = this.$Session.userId;

		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		if (record.POI_STATUS !== $Const.POI_STATUS_DRAFT)
		{
			return $ERRS.ERR_POI_CANNOT_PUBLISH;
		}

		let now = $Utils.now();

		// Get community IDs before transaction (SELECT)
		let communityIds = getSiteIds(this.$record_id);
		let notifyOfficers = this.$notify_officers !== false && this.$notify_officers !== "false";
		let officerIds = [];
		if (notifyOfficers)
		{
			officerIds = getOfficerIdsForCommunities(communityIds);
		}

		$Db.executeQuery(
			`UPDATE \`poi_record\`
			 SET POI_STATUS=?, POI_APPROVED_BY=?, POI_APPROVED_ON=?, POI_LAST_UPDATE=?
			 WHERE POI_ID=? AND POI_DELETED_ON IS NULL`,
			[$Const.POI_STATUS_ACTIVE, userId, now, now, this.$record_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Send notifications
		if (notifyOfficers && officerIds.length > 0)
		{
			let fullName = buildFullName(record.POI_FIRST_NAME, record.POI_LAST_NAME);
			sendPoiNotification(this.$Session, "poi_active",
				{POI_ID: this.$record_id},
				{poi_type: getRecordTypeName(record.POI_RECORD_TYPE), poi_name: fullName},
				officerIds);
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Inactivate POI Record
	// =========================================================================

	inactivate_poi_record()
	{
		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		if (record.POI_STATUS !== $Const.POI_STATUS_ACTIVE)
		{
			return $ERRS.ERR_POI_CANNOT_INACTIVATE;
		}

		if ($Utils.empty(this.$reason))
		{
			return $ERRS.ERR_POI_INACTIVATION_REASON_REQUIRED;
		}

		let now = $Utils.now();

		// Get community IDs and officer IDs before update (SELECTs)
		let communityIds = getSiteIds(this.$record_id);
		let officerIds = getOfficerIdsForCommunities(communityIds);

		$Db.executeQuery(
			`UPDATE \`poi_record\`
			 SET POI_STATUS=?, POI_INACTIVATION_REASON=?, POI_LAST_UPDATE=?
			 WHERE POI_ID=? AND POI_DELETED_ON IS NULL`,
			[$Const.POI_STATUS_INACTIVE, this.$reason, now, this.$record_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Send notification to officers
		let fullName = buildFullName(record.POI_FIRST_NAME, record.POI_LAST_NAME);
		sendPoiNotification(this.$Session, "poi_inactivated",
			{POI_ID: this.$record_id},
			{poi_type: getRecordTypeName(record.POI_RECORD_TYPE), poi_name: fullName},
			officerIds);

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Archive POI Record
	// =========================================================================

	archive_poi_record()
	{
		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		if (record.POI_STATUS !== $Const.POI_STATUS_EXPIRED &&
			record.POI_STATUS !== $Const.POI_STATUS_INACTIVE)
		{
			return $ERRS.ERR_POI_CANNOT_ARCHIVE;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`poi_record\`
			 SET POI_STATUS=?, POI_LAST_UPDATE=?
			 WHERE POI_ID=? AND POI_DELETED_ON IS NULL`,
			[$Const.POI_STATUS_ARCHIVED, now, this.$record_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Export POI Record
	// =========================================================================

	export_poi_record()
	{
		let userId = this.$Session.userId;

		// Check if export is enabled
		let settings = getPoiSettings();
		if (settings.pdf_export_enabled === false)
		{
			return $ERRS.ERR_POI_EXPORT_DISABLED;
		}

		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		// Gather related data (SELECTs before transaction)
		let photos = getPhotos(record.POI_ID);
		let sites = getSites(record.POI_ID);
		let adminName = $Funcs.getUserName(userId);
		let fullName = buildFullName(record.POI_FIRST_NAME, record.POI_LAST_NAME);
		let typeName = getRecordTypeName(record.POI_RECORD_TYPE);
		let threatName = $DataItems.getItemName(record.POI_THREAT_LEVEL, TABLE_POI_THREAT_LEVEL) || record.POI_THREAT_LEVEL;

		// Load photo file contents for embedding in PDF
		let photoBuffers = [];
		for (let i = 0; i < photos.length; i++)
		{
			try
			{
				let content = $Files.getFileFromContainer(photos[i].PPH_FILE_NAME);
				if (content)
				{
					photoBuffers.push(content);
				}
			}
			catch (e) { /* skip unreadable photos */ }
		}

		let now = $Utils.now();
		let exportDate = now;

		// Generate PDF via platform export system
		let exportResult = $Export.generate({
			name: "poi_export_" + record.POI_ID,
			format: $Const.EXPORT_FORMAT_PDF,
			owner: userId,
			accessLevel: $Const.FILE_ACCESS_LEVEL_LIMITED,
			page: {size: "LETTER", layout: "portrait", margin: 36},
			render: function(doc)
			{
				let pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
				let leftX = doc.page.margins.left;
				let yPos = doc.page.margins.top;

				// --- Watermark function (called on each page) ---
				let addWatermark = function()
				{
					doc.save();
					doc.fontSize(9).fillColor("#999999")
						.text("CONFIDENTIAL \u2013 AUTHORISED USE ONLY", leftX, doc.page.height - 60, {width: pageWidth, align: "center"});
					doc.text("Exported by: " + adminName + " | " + exportDate, leftX, doc.page.height - 48, {width: pageWidth, align: "center"});
					doc.restore();
				};

				// --- Header ---
				doc.fontSize(18).fillColor("#333333")
					.text(typeName.toUpperCase(), leftX, yPos, {width: pageWidth, align: "center"});
				yPos += 28;

				doc.fontSize(14).fillColor("#000000")
					.text(fullName, leftX, yPos, {width: pageWidth, align: "center"});
				yPos += 24;

				// Status and threat level
				doc.fontSize(10).fillColor("#666666")
					.text("Status: " + (record.POI_STATUS || "").toUpperCase() +
						"    |    Threat Level: " + threatName.toUpperCase() +
						"    |    Record ID: " + record.POI_ID,
						leftX, yPos, {width: pageWidth, align: "center"});
				yPos += 22;

				doc.moveTo(leftX, yPos).lineTo(leftX + pageWidth, yPos).stroke("#cccccc");
				yPos += 12;

				// --- Photos ---
				if (photoBuffers.length > 0)
				{
					doc.fontSize(11).fillColor("#333333").text("Photos", leftX, yPos);
					yPos += 16;

					let photoX = leftX;
					let photoSize = 120;
					let photoGap = 10;
					for (let i = 0; i < photoBuffers.length; i++)
					{
						if (photoX + photoSize > leftX + pageWidth)
						{
							photoX = leftX;
							yPos += photoSize + photoGap;
						}
						if (yPos + photoSize > doc.page.height - 80)
						{
							addWatermark();
							doc.addPage();
							yPos = doc.page.margins.top;
							photoX = leftX;
						}
						try
						{
							doc.image(photoBuffers[i], photoX, yPos, {width: photoSize, height: photoSize, fit: [photoSize, photoSize]});
						}
						catch (e) { /* skip corrupt image */ }
						photoX += photoSize + photoGap;
					}
					yPos += photoSize + 16;
				}

				// --- Personal Details Section ---
				let addSection = function(title)
				{
					if (yPos > doc.page.height - 100)
					{
						addWatermark();
						doc.addPage();
						yPos = doc.page.margins.top;
					}
					doc.fontSize(11).fillColor("#333333").text(title, leftX, yPos);
					yPos += 16;
				};

				let addField = function(label, value)
				{
					if (!value) return;
					if (yPos > doc.page.height - 80)
					{
						addWatermark();
						doc.addPage();
						yPos = doc.page.margins.top;
					}
					doc.fontSize(9).fillColor("#666666").text(label + ":", leftX, yPos, {continued: true})
						.fillColor("#000000").text("  " + value);
					yPos += 14;
				};

				addSection("Personal Information");
				addField("First Name", record.POI_FIRST_NAME);
				addField("Last Name", record.POI_LAST_NAME);
				if (record.POI_KNOWN_ALIASES) addField("Known Aliases", record.POI_KNOWN_ALIASES);
				if (record.POI_DATE_OF_BIRTH) addField("Date of Birth", String(record.POI_DATE_OF_BIRTH).slice(0, 10));
				if (record.POI_GENDER) addField("Gender", $DataItems.getItemName(record.POI_GENDER, TABLE_POI_GENDER) || record.POI_GENDER);
				if (record.POI_PHYSICAL_DESCRIPTION) addField("Physical Description", record.POI_PHYSICAL_DESCRIPTION);
				yPos += 6;

				addSection("Assessment");
				addField("Threat Level", threatName);
				addField("Summary", record.POI_SUMMARY);
				// POI_INTERNAL_NOTES intentionally excluded from export
				yPos += 6;

				// Sites
				if (sites.length > 0)
				{
					addSection("Assigned Sites");
					let siteNames = sites.map(s => s.COM_NAME).join(", ");
					addField("Communities", siteNames);
					yPos += 6;
				}

				// Type-specific fields
				if (record.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_POI)
				{
					if (record.POI_INCIDENT_HISTORY_SUMMARY || record.POI_ASSOCIATED_INDIVIDUALS || record.POI_WATCH_LEVEL_REVIEW_DATE)
					{
						addSection("POI Details");
						if (record.POI_INCIDENT_HISTORY_SUMMARY) addField("Incident History", record.POI_INCIDENT_HISTORY_SUMMARY);
						if (record.POI_WATCH_LEVEL_REVIEW_DATE) addField("Watch Level Review Date", String(record.POI_WATCH_LEVEL_REVIEW_DATE).slice(0, 10));
						if (record.POI_ASSOCIATED_INDIVIDUALS) addField("Associated Individuals", record.POI_ASSOCIATED_INDIVIDUALS);
						yPos += 6;
					}
				}
				else if (record.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_TRESPASS)
				{
					addSection("Trespass Order Details");
					addField("Notice Number", record.POI_TRESPASS_NOTICE_NUMBER);
					addField("Issuing Authority", record.POI_ISSUING_AUTHORITY);
					addField("Property / Area Covered", record.POI_PROPERTY_AREA_COVERED);
					if (record.POI_ISSUE_DATE) addField("Issue Date", String(record.POI_ISSUE_DATE).slice(0, 10));
					if (record.POI_EXPIRY_DATE) addField("Expiry Date", String(record.POI_EXPIRY_DATE).slice(0, 10));
					if (record.POI_LAW_ENFORCEMENT_CONTACT) addField("Law Enforcement Contact", record.POI_LAW_ENFORCEMENT_CONTACT);
					if (record.POI_CONDITIONS) addField("Conditions", record.POI_CONDITIONS);
					yPos += 6;
				}
				else if (record.POI_RECORD_TYPE === $Const.POI_RECORD_TYPE_METRO_RED_CARD)
				{
					addSection("Metro Red Card Details");
					addField("Card Number", record.POI_RED_CARD_NUMBER);
					addField("Issuing Authority", record.POI_ISSUING_AUTHORITY);
					if (record.POI_ISSUE_DATE) addField("Issue Date", String(record.POI_ISSUE_DATE).slice(0, 10));
					if (record.POI_EXPIRY_DATE) addField("Expiry Date", String(record.POI_EXPIRY_DATE).slice(0, 10));
					if (record.POI_LINES) addField("Transit Lines", record.POI_LINES);
					yPos += 6;
				}

				// Dates
				addSection("Record Information");
				addField("Created On", String(record.POI_CREATED_ON).slice(0, 19));
				if (record.POI_APPROVED_ON) addField("Approved On", String(record.POI_APPROVED_ON).slice(0, 19));
				if (record.POI_LAST_UPDATE) addField("Last Updated", String(record.POI_LAST_UPDATE).slice(0, 19));

				// Watermark on the last page
				addWatermark();
			}
		});

		if ($Err.isERR(exportResult))
		{
			return exportResult;
		}

		// Log the export in audit table
		$Db.executeQuery(
			`INSERT INTO \`poi_export\` (PXP_POI_ID, PXP_EXPORTED_BY, PXP_FILE_NAME, PXP_EXPORTED_ON)
			 VALUES (?,?,?,?)`,
			[this.$record_id, userId, exportResult.file_name, now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let exportId = $Db.insertId();

		return {...$ERRS.ERR_SUCCESS, export_id: exportId, file_url: exportResult.file_url};
	}

	// =========================================================================
	// Get POI Metadata
	// =========================================================================

	get_poi_metadata()
	{
		let settings = getPoiSettings();

		return {
			...$ERRS.ERR_SUCCESS,
			record_types: $DataItems.getList(TABLE_POI_RECORD_TYPE),
			threat_levels: $DataItems.getList(TABLE_POI_THREAT_LEVEL),
			statuses: $DataItems.getList(TABLE_POI_STATUS),
			genders: $DataItems.getList(TABLE_POI_GENDER),
			guidance: {
				poi: settings.default_poi_guidance || "",
				trespass: settings.default_trespass_guidance || "",
				metro_red_card: settings.default_red_card_guidance || "",
			},
		};
	}

	// =========================================================================
	// Mark Viewed
	// =========================================================================

	mark_viewed()
	{
		let userId = this.$Session.userId;

		let record = fetchPoiRecord(this.$record_id);
		if (!record)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		// Must be active
		if (record.POI_STATUS !== $Const.POI_STATUS_ACTIVE)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		// Verify officer is in a community the record is assigned to
		let communityId = $Funcs.getUserCommunityId(userId);
		let sites = getSiteIds(record.POI_ID);
		if (sites.indexOf(communityId) === -1)
		{
			return $ERRS.ERR_POI_RECORD_NOT_FOUND;
		}

		let now = $Utils.now();

		// Upsert: insert or update viewed timestamp
		$Db.executeQuery(
			`INSERT INTO \`poi_view\` (PVW_POI_ID, PVW_USR_ID, PVW_VIEWED_ON)
			 VALUES (?,?,?)
			 ON DUPLICATE KEY UPDATE PVW_VIEWED_ON=?`,
			[this.$record_id, userId, now, now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}
};
