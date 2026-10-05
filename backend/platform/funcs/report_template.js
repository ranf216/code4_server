const MAX_TEMPLATE_NAME_LENGTH = 80;
const MAX_TITLE_FORMAT_LENGTH = 500;
const MAX_SECTION_TITLE_LENGTH = 80;
const MAX_FIELD_LABEL_LENGTH = 80;
const MAX_FIELD_DESCRIPTION_LENGTH = 500;
const MAX_FIELD_KEY_LENGTH = 50;

const TABLE_REPORT_CATEGORY = "report_category";
const TABLE_REPORT_TEMPLATE_STATUS = "report_template_status";
const TABLE_REPORT_FIELD_TYPE = "report_field_type";
const TABLE_REPORT_SYSTEM_FIELD = "report_system_field";
const TABLE_REPORT_HEADER_LAYOUT = "report_header_layout";
const TABLE_REPORT_DATE_FORMAT = "report_date_format";
const TABLE_REPORT_SECTION_BREAKS = "report_section_breaks";
const TABLE_REPORT_FONT = "report_font";

// ---------------------------------------------------------------------------
// Module-level helper functions (no DB calls inside loops)
// ---------------------------------------------------------------------------

function fetchTemplateRecord(templateId)
{
	let rows = $Db.executeQuery(
		`SELECT rpt.RPT_ID, rpt.RPT_NAME, rpt.RPT_CATEGORY, rpt.RPT_STATUS,
		        rpt.RPT_TITLE_FORMAT, rpt.RPT_IS_GLOBAL, rpt.RPT_REVIEW_BEFORE_CLIENT,
		        rpt.RPT_ALLOW_OFFICER_EDITING, rpt.RPT_STYLE, rpt.RPT_CREATED_BY,
		        rpt.RPT_CREATED_ON, rpt.RPT_LAST_UPDATE,
		        ud.USD_FIRST_NAME CREATOR_FIRST_NAME, ud.USD_LAST_NAME CREATOR_LAST_NAME
		 FROM \`report_template\` rpt
		    LEFT OUTER JOIN \`user_details\` ud ON rpt.RPT_CREATED_BY = ud.USD_USR_ID
		 WHERE rpt.RPT_ID=? AND rpt.RPT_DELETED_ON IS NULL`,
		[templateId]);
	return rows.length > 0 ? rows[0] : null;
}

function getTemplateCommunities(templateId)
{
	return $Db.executeQuery(
		`SELECT rtc.RTC_ID, rtc.RTC_COM_ID, c.COM_NAME
		 FROM \`report_template_community\` rtc
		    JOIN \`community\` c ON rtc.RTC_COM_ID = c.COM_ID
		 WHERE rtc.RTC_RPT_ID=? AND rtc.RTC_DELETED_ON IS NULL
		 ORDER BY c.COM_NAME ASC`,
		[templateId]);
}

function getTemplateSections(templateId)
{
	return $Db.executeQuery(
		`SELECT RTS_ID, RTS_RPT_ID, RTS_TITLE, RTS_SORT_ORDER, RTS_IS_ENABLED,
		        RTS_IS_REQUIRED, RTS_CLIENT_VISIBLE, RTS_CREATED_ON, RTS_LAST_UPDATE
		 FROM \`report_template_section\`
		 WHERE RTS_RPT_ID=? AND RTS_DELETED_ON IS NULL
		 ORDER BY RTS_SORT_ORDER ASC`,
		[templateId]);
}

function getSectionFields(sectionIds)
{
	if (sectionIds.length === 0)
	{
		return {};
	}
	let rows = $Db.executeQuery(
		`SELECT RTF_ID, RTF_RTS_ID, RTF_FIELD_KEY, RTF_LABEL, RTF_DESCRIPTION,
		        RTF_FIELD_TYPE, RTF_CONFIG, RTF_SORT_ORDER, RTF_IS_SYSTEM_FIELD, RTF_IS_REQUIRED
		 FROM \`report_template_field\`
		 WHERE RTF_RTS_ID IN (${sectionIds.toPlaceholders()}) AND RTF_DELETED_ON IS NULL
		 ORDER BY RTF_SORT_ORDER ASC`,
		sectionIds);

	let map = {};
	for (let i = 0; i < rows.length; i++)
	{
		let r = rows[i];
		if (!map[r.RTF_RTS_ID])
		{
			map[r.RTF_RTS_ID] = [];
		}
		let config = r.RTF_CONFIG;
		if (typeof config === "string" && config)
		{
			config = JSON.parse(config);
		}
		map[r.RTF_RTS_ID].push({
			field_id: r.RTF_ID,
			field_key: r.RTF_FIELD_KEY,
			label: r.RTF_LABEL,
			description: r.RTF_DESCRIPTION || null,
			field_type: r.RTF_FIELD_TYPE,
			config: config || null,
			sort_order: r.RTF_SORT_ORDER,
			is_system_field: r.RTF_IS_SYSTEM_FIELD === 1,
			is_required: r.RTF_IS_REQUIRED === 1
		});
	}
	return map;
}

function mapSectionRow(row, fields)
{
	return {
		section_id: row.RTS_ID,
		title: row.RTS_TITLE,
		sort_order: row.RTS_SORT_ORDER,
		is_enabled: row.RTS_IS_ENABLED === 1,
		is_required: row.RTS_IS_REQUIRED === 1,
		client_visible: row.RTS_CLIENT_VISIBLE === 1,
		fields: fields
	};
}

function buildFullName(first, last)
{
	let name = ((first || "") + " " + (last || "")).trim();
	return name || null;
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

function checkTemplateNameUnique(name, communityIds, isGlobal, excludeTemplateId)
{
	// Check name uniqueness within overlapping communities
	// Global templates: name must not conflict with any other template (global or community-specific)
	// Community templates: name must not conflict within the same communities or with global templates
	let params = [name];
	let excludeClause = "";
	if (excludeTemplateId)
	{
		excludeClause = " AND rpt.RPT_ID!=?";
		params.push(excludeTemplateId);
	}

	if (isGlobal)
	{
		// Global template: check against all non-deleted templates with the same name
		let rows = $Db.executeQuery(
			`SELECT rpt.RPT_ID FROM \`report_template\` rpt
			 WHERE rpt.RPT_NAME=? AND rpt.RPT_DELETED_ON IS NULL${excludeClause}`,
			params);
		return rows.length === 0;
	}
	else
	{
		// Community template: check against global templates and templates sharing at least one community
		let rows = $Db.executeQuery(
			`SELECT rpt.RPT_ID FROM \`report_template\` rpt
			 WHERE rpt.RPT_NAME=? AND rpt.RPT_DELETED_ON IS NULL${excludeClause}
			   AND (rpt.RPT_IS_GLOBAL=1
			        OR EXISTS (SELECT 1 FROM \`report_template_community\` rtc
			                   WHERE rtc.RTC_RPT_ID=rpt.RPT_ID AND rtc.RTC_DELETED_ON IS NULL
			                     AND rtc.RTC_COM_ID IN (${communityIds.toPlaceholders()})))`,
			[...params, ...communityIds]);
		return rows.length === 0;
	}
}

function validateSectionsInput(sections)
{
	if (!Array.isArray(sections) || sections.length === 0)
	{
		return {error: $ERRS.ERR_REPORT_TEMPLATE_SECTION_REQUIRED};
	}

	let prepared = [];
	for (let i = 0; i < sections.length; i++)
	{
		let s = sections[i];
		if (!s.title || String(s.title).trim().length === 0)
		{
			return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "section title is required")};
		}
		if (String(s.title).length > MAX_SECTION_TITLE_LENGTH)
		{
			return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "section title exceeds " + MAX_SECTION_TITLE_LENGTH + " characters")};
		}

		// Validate fields
		if (!Array.isArray(s.fields) || s.fields.length === 0)
		{
			return {error: $ERRS.ERR_REPORT_TEMPLATE_FIELD_REQUIRED};
		}

		let preparedFields = [];
		for (let j = 0; j < s.fields.length; j++)
		{
			let f = s.fields[j];
			if (!f.label || String(f.label).trim().length === 0)
			{
				return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "field label is required")};
			}
			if (String(f.label).length > MAX_FIELD_LABEL_LENGTH)
			{
				return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "field label exceeds " + MAX_FIELD_LABEL_LENGTH + " characters")};
			}
			if (!f.field_type || !$DataItems.isValidItemId(f.field_type, TABLE_REPORT_FIELD_TYPE))
			{
				return {error: $ERRS.ERR_REPORT_TEMPLATE_INVALID_FIELD_TYPE};
			}

			let isSystemField = false;
			let fieldKey = "custom_" + i + "_" + j;
			if (f.field_key && f.is_system_field)
			{
				if (!$DataItems.isValidItemId(f.field_key, TABLE_REPORT_SYSTEM_FIELD))
				{
					return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "invalid system field key: " + f.field_key)};
				}
				isSystemField = true;
				fieldKey = f.field_key;
			}
			else if (f.field_key)
			{
				fieldKey = String(f.field_key).substring(0, MAX_FIELD_KEY_LENGTH);
			}

			let config = null;
			if (f.config && typeof f.config === "object")
			{
				config = f.config;
			}

			preparedFields.push({
				field_key: fieldKey,
				label: String(f.label).trim(),
				description: f.description ? String(f.description).substring(0, MAX_FIELD_DESCRIPTION_LENGTH) : null,
				field_type: f.field_type,
				config: config,
				sort_order: j,
				is_system_field: isSystemField,
				is_required: f.is_required !== false ? 1 : 0
			});
		}

		prepared.push({
			title: String(s.title).trim(),
			is_enabled: s.is_enabled !== false ? 1 : 0,
			is_required: s.is_required !== false ? 1 : 0,
			client_visible: s.client_visible !== false ? 1 : 0,
			sort_order: i,
			fields: preparedFields
		});
	}

	return {sections: prepared};
}

function insertSections(templateId, sections, now)
{
	if (sections.length === 0)
	{
		return null;
	}

	// Bulk insert all sections in one query (no DB calls in loops)
	let sectionPlaceholders = sections.map(() => "(?,?,?,?,?,?,?,?)").join(",");
	let sectionParams = [];
	for (let i = 0; i < sections.length; i++)
	{
		let s = sections[i];
		sectionParams.push(templateId, s.title, s.sort_order, s.is_enabled,
			s.is_required, s.client_visible, now, now);
	}

	$Db.executeQuery(
		`INSERT INTO \`report_template_section\`
		 (RTS_RPT_ID, RTS_TITLE, RTS_SORT_ORDER, RTS_IS_ENABLED, RTS_IS_REQUIRED, RTS_CLIENT_VISIBLE, RTS_CREATED_ON, RTS_LAST_UPDATE)
		 VALUES ${sectionPlaceholders}`,
		sectionParams);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}

	// MySQL: bulk INSERT returns the first auto-increment ID; subsequent IDs are contiguous
	let firstSectionId = $Db.insertId();

	// Bulk insert all fields across all sections in one query
	let fieldPlaceholders = [];
	let fieldParams = [];
	for (let i = 0; i < sections.length; i++)
	{
		let sectionId = firstSectionId + i;
		let fields = sections[i].fields;
		for (let j = 0; j < fields.length; j++)
		{
			let f = fields[j];
			fieldPlaceholders.push("(?,?,?,?,?,?,?,?,?,?)");
			fieldParams.push(
				sectionId, f.field_key, f.label, f.description, f.field_type,
				f.config ? JSON.stringify(f.config) : null,
				f.sort_order, f.is_system_field ? 1 : 0, f.is_required, now
			);
		}
	}

	if (fieldPlaceholders.length > 0)
	{
		$Db.executeQuery(
			`INSERT INTO \`report_template_field\`
			 (RTF_RTS_ID, RTF_FIELD_KEY, RTF_LABEL, RTF_DESCRIPTION, RTF_FIELD_TYPE, RTF_CONFIG, RTF_SORT_ORDER, RTF_IS_SYSTEM_FIELD, RTF_IS_REQUIRED, RTF_CREATED_ON)
			 VALUES ${fieldPlaceholders.join(",")}`,
			fieldParams);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}
	}

	return null;
}

function getExistingSectionIds(templateId)
{
	let rows = $Db.executeQuery(
		`SELECT RTS_ID FROM \`report_template_section\` WHERE RTS_RPT_ID=? AND RTS_DELETED_ON IS NULL`,
		[templateId]);
	return rows.map(r => r.RTS_ID);
}

function softDeleteSections(templateId, existingSectionIds, now)
{
	// Soft-delete fields first (via pre-fetched section IDs)
	if (existingSectionIds.length > 0)
	{
		$Db.executeQuery(
			`UPDATE \`report_template_field\` SET RTF_DELETED_ON=?
			 WHERE RTF_RTS_ID IN (${existingSectionIds.toPlaceholders()}) AND RTF_DELETED_ON IS NULL`,
			[now, ...existingSectionIds]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}
	}
	// Soft-delete sections
	$Db.executeQuery(
		`UPDATE \`report_template_section\` SET RTS_DELETED_ON=?
		 WHERE RTS_RPT_ID=? AND RTS_DELETED_ON IS NULL`,
		[now, templateId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function insertCommunities(templateId, communityIds, now)
{
	if (communityIds.length === 0)
	{
		return null;
	}
	let uniqueIds = [...new Set(communityIds)];
	let placeholders = [];
	let params = [];
	for (let i = 0; i < uniqueIds.length; i++)
	{
		placeholders.push("(?,?,?)");
		params.push(templateId, uniqueIds[i], now);
	}
	$Db.executeQuery(
		`INSERT INTO \`report_template_community\` (RTC_RPT_ID, RTC_COM_ID, RTC_CREATED_ON)
		 VALUES ${placeholders.join(",")}
		 ON DUPLICATE KEY UPDATE RTC_DELETED_ON=NULL, RTC_CREATED_ON=VALUES(RTC_CREATED_ON)`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function softDeleteCommunities(templateId, now)
{
	$Db.executeQuery(
		`UPDATE \`report_template_community\` SET RTC_DELETED_ON=?
		 WHERE RTC_RPT_ID=? AND RTC_DELETED_ON IS NULL`,
		[now, templateId]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function parseStyleJson(style)
{
	if (!style)
	{
		return null;
	}
	if (typeof style === "string")
	{
		try
		{
			return JSON.parse(style);
		}
		catch (e)
		{
			return null;
		}
	}
	return style;
}

// ---------------------------------------------------------------------------
// Exported API class
// ---------------------------------------------------------------------------

module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
		$DataItems.define(TABLE_REPORT_CATEGORY);
		$DataItems.define(TABLE_REPORT_TEMPLATE_STATUS);
		$DataItems.define(TABLE_REPORT_FIELD_TYPE);
		$DataItems.define(TABLE_REPORT_SYSTEM_FIELD);
		$DataItems.define(TABLE_REPORT_HEADER_LAYOUT);
		$DataItems.define(TABLE_REPORT_DATE_FORMAT);
		$DataItems.define(TABLE_REPORT_SECTION_BREAKS);
		$DataItems.define(TABLE_REPORT_FONT);
	}

	// =========================================================================
	// Get Templates List
	// =========================================================================

	get_templates_list()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let conditions = ["rpt.RPT_DELETED_ON IS NULL"];
		let params = [];

		// Officer scoping: only active templates for their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let communityId = $Funcs.getUserCommunityId(userId);
			if (!communityId)
			{
				return {...$ERRS.ERR_SUCCESS, templates: [], num_of_items: 0, num_of_pages: 0};
			}
			conditions.push("rpt.RPT_STATUS=?");
			params.push($Const.REPORT_TEMPLATE_STATUS_ACTIVE);
			conditions.push(
				"(rpt.RPT_IS_GLOBAL=1 OR EXISTS (SELECT 1 FROM `report_template_community` rtc WHERE rtc.RTC_RPT_ID=rpt.RPT_ID AND rtc.RTC_COM_ID=? AND rtc.RTC_DELETED_ON IS NULL))");
			params.push(communityId);
		}
		else
		{
			// Admin: optional community filter
			if (this.$community_id > 0)
			{
				conditions.push(
					"(rpt.RPT_IS_GLOBAL=1 OR EXISTS (SELECT 1 FROM `report_template_community` rtc WHERE rtc.RTC_RPT_ID=rpt.RPT_ID AND rtc.RTC_COM_ID=? AND rtc.RTC_DELETED_ON IS NULL))");
				params.push(this.$community_id);
			}

			// Status filter (admin only — officers always see active)
			if (!$Utils.empty(this.$status))
			{
				if (!$DataItems.isValidItemId(this.$status, TABLE_REPORT_TEMPLATE_STATUS))
				{
					return $ERRS.ERR_REPORT_TEMPLATE_INVALID_STATUS;
				}
				conditions.push("rpt.RPT_STATUS=?");
				params.push(this.$status);
			}
		}

		// Category filter
		if (!$Utils.empty(this.$category))
		{
			if (!$DataItems.isValidItemId(this.$category, TABLE_REPORT_CATEGORY))
			{
				return $ERRS.ERR_REPORT_TEMPLATE_INVALID_CATEGORY;
			}
			conditions.push("rpt.RPT_CATEGORY=?");
			params.push(this.$category);
		}

		// Search
		if (!$Utils.empty(this.$search_text))
		{
			conditions.push("rpt.RPT_NAME LIKE ?");
			params.push("%" + this.$search_text + "%");
		}

		let whereClause = conditions.join(" AND ");

		// Count total
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total FROM \`report_template\` rpt WHERE ${whereClause}`, params);
		let totalCount = countRows[0].total;

		// Sort
		let sortMap = {
			"name": "rpt.RPT_NAME",
			"category": "rpt.RPT_CATEGORY",
			"status": "rpt.RPT_STATUS",
			"last_modified": "COALESCE(rpt.RPT_LAST_UPDATE, rpt.RPT_CREATED_ON)"
		};
		let sortCol = sortMap[this.$sort_by] || sortMap["name"];
		let sortDir = (this.$sort_dir === "desc") ? "DESC" : "ASC";

		// Pagination
		let pageSize = $Config.get("REPORT_TEMPLATES_PAGE_SIZE");
		let page = parseInt(this.$page) || 0;
		let numOfPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

		// Out-of-bounds page returns empty without hitting DB
		if (page < 0 || page >= numOfPages)
		{
			return {...$ERRS.ERR_SUCCESS, templates: [], num_of_items: totalCount, num_of_pages: numOfPages};
		}

		let offset = page * pageSize;

		let rows = $Db.executeQuery(
			`SELECT rpt.RPT_ID, rpt.RPT_NAME, rpt.RPT_CATEGORY, rpt.RPT_STATUS,
			        rpt.RPT_IS_GLOBAL, rpt.RPT_CREATED_ON, rpt.RPT_LAST_UPDATE,
			        ud.USD_FIRST_NAME CREATOR_FIRST_NAME, ud.USD_LAST_NAME CREATOR_LAST_NAME
			 FROM \`report_template\` rpt
			    LEFT OUTER JOIN \`user_details\` ud ON rpt.RPT_CREATED_BY = ud.USD_USR_ID
			 WHERE ${whereClause}
			 ORDER BY ${sortCol} ${sortDir}
			 LIMIT ${pageSize} OFFSET ${offset}`,
			params);

		// Batch-fetch community assignments
		let templateIds = rows.map(r => r.RPT_ID);
		let commMap = {};
		if (templateIds.length > 0)
		{
			let commRows = $Db.executeQuery(
				`SELECT rtc.RTC_RPT_ID, rtc.RTC_COM_ID, c.COM_NAME
				 FROM \`report_template_community\` rtc
				    JOIN \`community\` c ON rtc.RTC_COM_ID = c.COM_ID
				 WHERE rtc.RTC_RPT_ID IN (${templateIds.toPlaceholders()}) AND rtc.RTC_DELETED_ON IS NULL
				 ORDER BY c.COM_NAME ASC`,
				templateIds);
			for (let i = 0; i < commRows.length; i++)
			{
				let cr = commRows[i];
				if (!commMap[cr.RTC_RPT_ID])
				{
					commMap[cr.RTC_RPT_ID] = [];
				}
				commMap[cr.RTC_RPT_ID].push({community_id: cr.RTC_COM_ID, community_name: cr.COM_NAME});
			}
		}

		// Batch-fetch section counts
		let sectionCountMap = {};
		if (templateIds.length > 0)
		{
			let scRows = $Db.executeQuery(
				`SELECT RTS_RPT_ID, COUNT(*) section_count
				 FROM \`report_template_section\`
				 WHERE RTS_RPT_ID IN (${templateIds.toPlaceholders()}) AND RTS_DELETED_ON IS NULL
				 GROUP BY RTS_RPT_ID`,
				templateIds);
			for (let i = 0; i < scRows.length; i++)
			{
				sectionCountMap[scRows[i].RTS_RPT_ID] = scRows[i].section_count;
			}
		}

		let templates = rows.map(r => ({
			template_id: r.RPT_ID,
			name: r.RPT_NAME,
			category: r.RPT_CATEGORY,
			category_name: $DataItems.getItemName(r.RPT_CATEGORY, TABLE_REPORT_CATEGORY),
			status: r.RPT_STATUS,
			status_name: $DataItems.getItemName(r.RPT_STATUS, TABLE_REPORT_TEMPLATE_STATUS),
			is_global: r.RPT_IS_GLOBAL === 1,
			communities: commMap[r.RPT_ID] || [],
			section_count: sectionCountMap[r.RPT_ID] || 0,
			created_by_name: buildFullName(r.CREATOR_FIRST_NAME, r.CREATOR_LAST_NAME),
			created_on: r.RPT_CREATED_ON,
			last_modified: r.RPT_LAST_UPDATE || r.RPT_CREATED_ON
		}));

		return {...$ERRS.ERR_SUCCESS, templates: templates, num_of_items: totalCount, num_of_pages: numOfPages};
	}

	// =========================================================================
	// Get Template
	// =========================================================================

	get_template()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Officer access: only active templates for their communities
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			if (record.RPT_STATUS !== $Const.REPORT_TEMPLATE_STATUS_ACTIVE)
			{
				return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
			}
			if (!record.RPT_IS_GLOBAL)
			{
				let communityId = $Funcs.getUserCommunityId(userId);
				let communities = getTemplateCommunities(this.$template_id);
				let comIds = communities.map(c => c.RTC_COM_ID);
				if (comIds.indexOf(communityId) === -1)
				{
					return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
				}
			}
		}

		// Build response
		let communities = getTemplateCommunities(this.$template_id);
		let sectionRows = getTemplateSections(this.$template_id);
		let sectionIds = sectionRows.map(s => s.RTS_ID);
		let fieldMap = getSectionFields(sectionIds);

		let sections = sectionRows.map(s => mapSectionRow(s, fieldMap[s.RTS_ID] || []));

		let template = {
			template_id: record.RPT_ID,
			name: record.RPT_NAME,
			category: record.RPT_CATEGORY,
			category_name: $DataItems.getItemName(record.RPT_CATEGORY, TABLE_REPORT_CATEGORY),
			status: record.RPT_STATUS,
			status_name: $DataItems.getItemName(record.RPT_STATUS, TABLE_REPORT_TEMPLATE_STATUS),
			title_format: record.RPT_TITLE_FORMAT,
			is_global: record.RPT_IS_GLOBAL === 1,
			review_before_client: record.RPT_REVIEW_BEFORE_CLIENT === 1,
			allow_officer_editing: record.RPT_ALLOW_OFFICER_EDITING === 1,
			style: parseStyleJson(record.RPT_STYLE),
			communities: communities.map(c => ({community_id: c.RTC_COM_ID, community_name: c.COM_NAME})),
			sections: sections,
			created_by: record.RPT_CREATED_BY,
			created_by_name: buildFullName(record.CREATOR_FIRST_NAME, record.CREATOR_LAST_NAME),
			created_on: record.RPT_CREATED_ON,
			last_update: record.RPT_LAST_UPDATE || null
		};

		return {...$ERRS.ERR_SUCCESS, template: template};
	}

	// =========================================================================
	// Create Template
	// =========================================================================

	create_template()
	{
		let userId = this.$Session.userId;

		// Validate category
		if (!$DataItems.isValidItemId(this.$category, TABLE_REPORT_CATEGORY))
		{
			return $ERRS.ERR_REPORT_TEMPLATE_INVALID_CATEGORY;
		}

		// Validate name length
		if ($Utils.empty(this.$name) || String(this.$name).trim().length === 0)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "template name is required");
		}
		if (String(this.$name).length > MAX_TEMPLATE_NAME_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "template name exceeds " + MAX_TEMPLATE_NAME_LENGTH + " characters");
		}

		// Validate title format
		if ($Utils.empty(this.$title_format) || String(this.$title_format).trim().length === 0)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "title format is required");
		}
		if (String(this.$title_format).length > MAX_TITLE_FORMAT_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "title format exceeds " + MAX_TITLE_FORMAT_LENGTH + " characters");
		}

		// Determine global vs community-specific
		let isGlobal = !Array.isArray(this.$community_ids) || this.$community_ids.length === 0;
		let communityIds = isGlobal ? [] : this.$community_ids;

		// Validate community IDs
		if (!isGlobal)
		{
			if (!validateCommunityIds(communityIds))
			{
				return $ERRS.ERR_REPORT_TEMPLATE_INVALID_COMMUNITY;
			}
		}

		// Check name uniqueness (read — before transaction)
		if (!checkTemplateNameUnique(String(this.$name).trim(), communityIds, isGlobal, null))
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NAME_EXISTS;
		}

		// Validate sections (read — before transaction)
		let sectionResult = validateSectionsInput(this.$sections);
		if (sectionResult.error)
		{
			return sectionResult.error;
		}
		let preparedSections = sectionResult.sections;

		let now = $Utils.now();

		$Db.beginTransaction();

		// Insert template record
		$Db.executeQuery(
			`INSERT INTO \`report_template\`
			 (RPT_NAME, RPT_CATEGORY, RPT_STATUS, RPT_TITLE_FORMAT, RPT_IS_GLOBAL,
			  RPT_REVIEW_BEFORE_CLIENT, RPT_ALLOW_OFFICER_EDITING, RPT_CREATED_BY, RPT_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			[String(this.$name).trim(), this.$category, $Const.REPORT_TEMPLATE_STATUS_DRAFT,
			 String(this.$title_format).trim(), isGlobal ? 1 : 0,
			 this.$review_before_client ? 1 : 0, this.$allow_officer_editing ? 1 : 0,
			 userId, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let templateId = $Db.insertId();

		// Insert community assignments
		if (!isGlobal)
		{
			let commErr = insertCommunities(templateId, communityIds, now);
			if (commErr)
			{
				$Db.rollbackTransaction();
				return commErr;
			}
		}

		// Insert sections and fields
		let sectionErr = insertSections(templateId, preparedSections, now);
		if (sectionErr)
		{
			$Db.rollbackTransaction();
			return sectionErr;
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, template_id: templateId};
	}

	// =========================================================================
	// Update Template
	// =========================================================================

	update_template()
	{
		let userId = this.$Session.userId;

		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Cannot edit archived templates
		if (record.RPT_STATUS === $Const.REPORT_TEMPLATE_STATUS_ARCHIVED)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_CANNOT_EDIT;
		}

		// Validate category if provided
		if (this.$category !== null && this.$category !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$category, TABLE_REPORT_CATEGORY))
			{
				return $ERRS.ERR_REPORT_TEMPLATE_INVALID_CATEGORY;
			}
		}

		// Validate name if provided
		if (this.$name !== null && this.$name !== undefined)
		{
			if ($Utils.empty(this.$name) || String(this.$name).trim().length === 0)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "template name is required");
			}
			if (String(this.$name).length > MAX_TEMPLATE_NAME_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "template name exceeds " + MAX_TEMPLATE_NAME_LENGTH + " characters");
			}
		}

		// Validate title format if provided
		if (this.$title_format !== null && this.$title_format !== undefined)
		{
			if ($Utils.empty(this.$title_format) || String(this.$title_format).trim().length === 0)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "title format is required");
			}
			if (String(this.$title_format).length > MAX_TITLE_FORMAT_LENGTH)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "title format exceeds " + MAX_TITLE_FORMAT_LENGTH + " characters");
			}
		}

		// Determine community changes
		let communityIdsProvided = this.$community_ids !== null && this.$community_ids !== undefined;
		let isGlobal = record.RPT_IS_GLOBAL === 1;
		let communityIds = [];
		if (communityIdsProvided)
		{
			isGlobal = !Array.isArray(this.$community_ids) || this.$community_ids.length === 0;
			communityIds = isGlobal ? [] : this.$community_ids;
			if (!isGlobal && !validateCommunityIds(communityIds))
			{
				return $ERRS.ERR_REPORT_TEMPLATE_INVALID_COMMUNITY;
			}
		}

		// Check name uniqueness if name or communities changed (read — before transaction)
		let newName = (this.$name !== null && this.$name !== undefined) ? String(this.$name).trim() : record.RPT_NAME;
		let checkCommunityIds = communityIdsProvided ? communityIds : [];
		let checkIsGlobal = communityIdsProvided ? isGlobal : (record.RPT_IS_GLOBAL === 1);
		if (!communityIdsProvided && !checkIsGlobal)
		{
			let existingComms = getTemplateCommunities(this.$template_id);
			checkCommunityIds = existingComms.map(c => c.RTC_COM_ID);
		}
		if (!checkTemplateNameUnique(newName, checkCommunityIds, checkIsGlobal, this.$template_id))
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NAME_EXISTS;
		}

		// Validate sections if provided (read — before transaction)
		let preparedSections = null;
		let existingSectionIds = [];
		if (this.$sections !== null && this.$sections !== undefined)
		{
			let sectionResult = validateSectionsInput(this.$sections);
			if (sectionResult.error)
			{
				return sectionResult.error;
			}
			preparedSections = sectionResult.sections;
			// Pre-fetch section IDs for soft-delete (read — before transaction)
			existingSectionIds = getExistingSectionIds(this.$template_id);
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Build update query
		let updates = ["RPT_LAST_UPDATE=?"];
		let params = [now];

		if (this.$name !== null && this.$name !== undefined)
		{
			updates.push("RPT_NAME=?");
			params.push(String(this.$name).trim());
		}
		if (this.$category !== null && this.$category !== undefined)
		{
			updates.push("RPT_CATEGORY=?");
			params.push(this.$category);
		}
		if (this.$title_format !== null && this.$title_format !== undefined)
		{
			updates.push("RPT_TITLE_FORMAT=?");
			params.push(String(this.$title_format).trim());
		}
		if (this.$review_before_client !== null && this.$review_before_client !== undefined)
		{
			updates.push("RPT_REVIEW_BEFORE_CLIENT=?");
			params.push(this.$review_before_client ? 1 : 0);
		}
		if (this.$allow_officer_editing !== null && this.$allow_officer_editing !== undefined)
		{
			updates.push("RPT_ALLOW_OFFICER_EDITING=?");
			params.push(this.$allow_officer_editing ? 1 : 0);
		}
		if (communityIdsProvided)
		{
			updates.push("RPT_IS_GLOBAL=?");
			params.push(isGlobal ? 1 : 0);
		}

		params.push(this.$template_id);
		$Db.executeQuery(
			`UPDATE \`report_template\` SET ${updates.join(",")} WHERE RPT_ID=? AND RPT_DELETED_ON IS NULL`, params);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Update community assignments if provided
		if (communityIdsProvided)
		{
			let delErr = softDeleteCommunities(this.$template_id, now);
			if (delErr)
			{
				$Db.rollbackTransaction();
				return delErr;
			}
			if (!isGlobal)
			{
				let insErr = insertCommunities(this.$template_id, communityIds, now);
				if (insErr)
				{
					$Db.rollbackTransaction();
					return insErr;
				}
			}
		}

		// Replace sections if provided
		if (preparedSections !== null)
		{
			let delErr = softDeleteSections(this.$template_id, existingSectionIds, now);
			if (delErr)
			{
				$Db.rollbackTransaction();
				return delErr;
			}
			let insErr = insertSections(this.$template_id, preparedSections, now);
			if (insErr)
			{
				$Db.rollbackTransaction();
				return insErr;
			}
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, template_id: this.$template_id};
	}

	// =========================================================================
	// Duplicate Template
	// =========================================================================

	duplicate_template()
	{
		let userId = this.$Session.userId;

		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Read all data before transaction
		let communities = getTemplateCommunities(this.$template_id);
		let sectionRows = getTemplateSections(this.$template_id);
		let sectionIds = sectionRows.map(s => s.RTS_ID);
		let fieldMap = getSectionFields(sectionIds);

		// Determine new name
		let newName = (!$Utils.empty(this.$name)) ? String(this.$name).trim() : "Copy of " + record.RPT_NAME;
		if (newName.length > MAX_TEMPLATE_NAME_LENGTH)
		{
			newName = newName.substring(0, MAX_TEMPLATE_NAME_LENGTH);
		}

		let isGlobal = record.RPT_IS_GLOBAL === 1;
		let communityIds = communities.map(c => c.RTC_COM_ID);

		// Check name uniqueness (read — before transaction)
		if (!checkTemplateNameUnique(newName, communityIds, isGlobal, null))
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NAME_EXISTS;
		}

		// Prepare sections for insertion
		let preparedSections = sectionRows.map((s, idx) => {
			let fields = (fieldMap[s.RTS_ID] || []).map((f, fIdx) => ({
				field_key: f.field_key,
				label: f.label,
				description: f.description,
				field_type: f.field_type,
				config: f.config,
				sort_order: fIdx,
				is_system_field: f.is_system_field,
				is_required: f.is_required ? 1 : 0
			}));
			return {
				title: s.RTS_TITLE,
				is_enabled: s.RTS_IS_ENABLED,
				is_required: s.RTS_IS_REQUIRED,
				client_visible: s.RTS_CLIENT_VISIBLE,
				sort_order: idx,
				fields: fields
			};
		});

		let now = $Utils.now();

		$Db.beginTransaction();

		// Insert new template record (always as draft)
		$Db.executeQuery(
			`INSERT INTO \`report_template\`
			 (RPT_NAME, RPT_CATEGORY, RPT_STATUS, RPT_TITLE_FORMAT, RPT_IS_GLOBAL,
			  RPT_REVIEW_BEFORE_CLIENT, RPT_ALLOW_OFFICER_EDITING, RPT_STYLE, RPT_CREATED_BY, RPT_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?,?)`,
			[newName, record.RPT_CATEGORY, $Const.REPORT_TEMPLATE_STATUS_DRAFT,
			 record.RPT_TITLE_FORMAT, isGlobal ? 1 : 0,
			 record.RPT_REVIEW_BEFORE_CLIENT, record.RPT_ALLOW_OFFICER_EDITING,
			 record.RPT_STYLE ? (typeof record.RPT_STYLE === "string" ? record.RPT_STYLE : JSON.stringify(record.RPT_STYLE)) : null,
			 userId, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let newTemplateId = $Db.insertId();

		// Copy community assignments
		if (!isGlobal && communityIds.length > 0)
		{
			let commErr = insertCommunities(newTemplateId, communityIds, now);
			if (commErr)
			{
				$Db.rollbackTransaction();
				return commErr;
			}
		}

		// Copy sections and fields
		let sectionErr = insertSections(newTemplateId, preparedSections, now);
		if (sectionErr)
		{
			$Db.rollbackTransaction();
			return sectionErr;
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, template_id: newTemplateId};
	}

	// =========================================================================
	// Archive Template
	// =========================================================================

	archive_template()
	{
		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Can only archive draft or active templates
		if (record.RPT_STATUS === $Const.REPORT_TEMPLATE_STATUS_ARCHIVED)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_CANNOT_ARCHIVE;
		}

		let now = $Utils.now();

		$Db.executeQuery(
			`UPDATE \`report_template\` SET RPT_STATUS=?, RPT_LAST_UPDATE=? WHERE RPT_ID=? AND RPT_DELETED_ON IS NULL`,
			[$Const.REPORT_TEMPLATE_STATUS_ARCHIVED, now, this.$template_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...$ERRS.ERR_SUCCESS, template_id: this.$template_id};
	}

	// =========================================================================
	// Activate Template
	// =========================================================================

	activate_template()
	{
		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Can activate draft or archived templates
		if (record.RPT_STATUS === $Const.REPORT_TEMPLATE_STATUS_ACTIVE)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_CANNOT_ACTIVATE;
		}

		// Ensure template has at least one section with at least one field
		let sectionRows = getTemplateSections(this.$template_id);
		if (sectionRows.length === 0)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_SECTION_REQUIRED;
		}
		let sectionIds = sectionRows.map(s => s.RTS_ID);
		let fieldMap = getSectionFields(sectionIds);
		for (let i = 0; i < sectionRows.length; i++)
		{
			let fields = fieldMap[sectionRows[i].RTS_ID] || [];
			if (fields.length === 0)
			{
				return $ERRS.ERR_REPORT_TEMPLATE_FIELD_REQUIRED;
			}
		}

		let now = $Utils.now();

		$Db.executeQuery(
			`UPDATE \`report_template\` SET RPT_STATUS=?, RPT_LAST_UPDATE=? WHERE RPT_ID=? AND RPT_DELETED_ON IS NULL`,
			[$Const.REPORT_TEMPLATE_STATUS_ACTIVE, now, this.$template_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...$ERRS.ERR_SUCCESS, template_id: this.$template_id};
	}

	// =========================================================================
	// Delete Template
	// =========================================================================

	delete_template()
	{
		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Only draft templates can be deleted; active/archived must be archived instead
		if (record.RPT_STATUS !== $Const.REPORT_TEMPLATE_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_CANNOT_EDIT;
		}

		// Check for linked reports (Phase 7.2: incident_report table)
		// When the report table exists, check: SELECT COUNT(*) FROM incident_report WHERE RPT_TEMPLATE_ID=? AND RPT_DELETED_ON IS NULL
		// For now, drafts have no reports since Phase 7.2 is not yet implemented

		// Pre-fetch section IDs for cascade soft-delete (read — before transaction)
		let existingSectionIds = getExistingSectionIds(this.$template_id);

		let now = $Utils.now();

		$Db.beginTransaction();

		// Soft-delete template
		$Db.executeQuery(
			`UPDATE \`report_template\` SET RPT_DELETED_ON=?, RPT_LAST_UPDATE=? WHERE RPT_ID=? AND RPT_DELETED_ON IS NULL`,
			[now, now, this.$template_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Soft-delete community assignments
		let commErr = softDeleteCommunities(this.$template_id, now);
		if (commErr)
		{
			$Db.rollbackTransaction();
			return commErr;
		}

		// Soft-delete sections and fields
		let secErr = softDeleteSections(this.$template_id, existingSectionIds, now);
		if (secErr)
		{
			$Db.rollbackTransaction();
			return secErr;
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, template_id: this.$template_id};
	}

	// =========================================================================
	// Get Template Style
	// =========================================================================

	get_template_style()
	{
		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		let style = parseStyleJson(record.RPT_STYLE) || {
			company_logo: null,
			accent_color: null,
			header_layout: $Const.REPORT_HEADER_LAYOUT_STANDARD,
			font: $Const.REPORT_FONT_ARIAL,
			page_numbering: true,
			confidentiality_footer: null,
			date_format: $Const.REPORT_DATE_FORMAT_MM_DD_YYYY,
			section_breaks: $Const.REPORT_SECTION_BREAKS_CONTINUOUS,
			include_cover_page: false
		};

		return {...$ERRS.ERR_SUCCESS, template_id: this.$template_id, style: style};
	}

	// =========================================================================
	// Update Template Style
	// =========================================================================

	update_template_style()
	{
		let userId = this.$Session.userId;

		let record = fetchTemplateRecord(this.$template_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		// Parse existing style or create defaults
		let style = parseStyleJson(record.RPT_STYLE) || {
			company_logo: null,
			accent_color: null,
			header_layout: $Const.REPORT_HEADER_LAYOUT_STANDARD,
			font: $Const.REPORT_FONT_ARIAL,
			page_numbering: true,
			confidentiality_footer: null,
			date_format: $Const.REPORT_DATE_FORMAT_MM_DD_YYYY,
			section_breaks: $Const.REPORT_SECTION_BREAKS_CONTINUOUS,
			include_cover_page: false
		};

		// Validate and apply each style field if provided
		if (this.$header_layout !== null && this.$header_layout !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$header_layout, TABLE_REPORT_HEADER_LAYOUT))
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "invalid header layout");
			}
			style.header_layout = this.$header_layout;
		}

		if (this.$font !== null && this.$font !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$font, TABLE_REPORT_FONT))
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "invalid font");
			}
			style.font = this.$font;
		}

		if (this.$date_format !== null && this.$date_format !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$date_format, TABLE_REPORT_DATE_FORMAT))
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "invalid date format");
			}
			style.date_format = this.$date_format;
		}

		if (this.$section_breaks !== null && this.$section_breaks !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$section_breaks, TABLE_REPORT_SECTION_BREAKS))
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "invalid section breaks");
			}
			style.section_breaks = this.$section_breaks;
		}

		if (this.$accent_color !== null && this.$accent_color !== undefined)
		{
			style.accent_color = this.$accent_color === "" ? null : this.$accent_color;
		}

		if (this.$confidentiality_footer !== null && this.$confidentiality_footer !== undefined)
		{
			style.confidentiality_footer = this.$confidentiality_footer === "" ? null : this.$confidentiality_footer;
		}

		if (this.$page_numbering !== null && this.$page_numbering !== undefined)
		{
			style.page_numbering = !!this.$page_numbering;
		}

		if (this.$include_cover_page !== null && this.$include_cover_page !== undefined)
		{
			style.include_cover_page = !!this.$include_cover_page;
		}

		// Handle company logo
		if (this.$company_logo !== null && this.$company_logo !== undefined)
		{
			if (this.$company_logo === "")
			{
				style.company_logo = null;
			}
			else
			{
				let rv = $Utils.saveNewImageOrKeepOld(userId, this.$company_logo, null, "report_template");
				if ($Err.isERR(rv))
				{
					return rv;
				}
				style.company_logo = rv.image_name;
			}
		}

		let now = $Utils.now();

		$Db.executeQuery(
			`UPDATE \`report_template\` SET RPT_STYLE=?, RPT_LAST_UPDATE=? WHERE RPT_ID=? AND RPT_DELETED_ON IS NULL`,
			[JSON.stringify(style), now, this.$template_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...$ERRS.ERR_SUCCESS, template_id: this.$template_id, style: style};
	}
};
