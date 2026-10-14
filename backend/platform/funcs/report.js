const MAX_CHANGES_COMMENT_LENGTH = 1000;
const MAX_MANAGEMENT_SUMMARY_LENGTH = 1000;
const MAX_MANAGER_NOTES_LENGTH = 2000;
const MAX_LOCATION_ADDRESS_LENGTH = 500;
const MAX_REPORT_TITLE_LENGTH = 500;
const MAX_NOTIFICATION_MESSAGE_LENGTH = 1000;
const DEFAULT_TEXT_MAX_CHARS = 10000;

const REVIEW_LOCK_TABLE = "incident_report";

const TABLE_REPORT_STATUS = "report_status";
const TABLE_REPORT_HISTORY_ACTION = "report_history_action";
const TABLE_REPORT_CATEGORY = "report_category";
const TABLE_REPORT_TEMPLATE_STATUS = "report_template_status";
const TABLE_REPORT_FIELD_TYPE = "report_field_type";
const TABLE_REPORT_SYSTEM_FIELD = "report_system_field";
const TABLE_REPORT_PDF_IMAGE_EXT = "report_pdf_image_ext";
const TABLE_SERVICE_TYPE = "service_type";
const TABLE_CALL_CATEGORY = "call_category";
const TABLE_CALL_PRIORITY = "call_priority";

// ---------------------------------------------------------------------------
// Module-level helper functions (no DB calls inside loops)
// ---------------------------------------------------------------------------

function isFileFieldType(fieldType)
{
	return $DataItems.getItemAttr(fieldType, TABLE_REPORT_FIELD_TYPE, "is_file") === true;
}

function isSameValue(a, b)
{
	return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
}

function fetchReportRecord(reportId)
{
	let rows = $Db.executeQuery(
		`SELECT IRP_ID, IRP_RPT_ID, IRP_SVC_ID, IRP_POI_ID, IRP_COM_ID, IRP_OFC_USR_ID, IRP_CLIENT_USR_ID,
		        IRP_TITLE, IRP_CATEGORY, IRP_STATUS, IRP_REVIEW_REQUIRED, IRP_ALLOW_OFFICER_EDITING,
		        IRP_CONTENT_SNAPSHOT, IRP_REVIEWER_USR_ID, IRP_CHANGES_COMMENT, IRP_MANAGEMENT_SUMMARY,
		        IRP_PDF_FILE_NAME, IRP_SUBMITTED_ON, IRP_REVIEW_STARTED_ON, IRP_APPROVED_ON, IRP_APPROVED_BY,
		        IRP_DELIVERED_ON, IRP_DELIVERED_BY, IRP_CREATED_ON, IRP_LAST_UPDATE,
		        COM_NAME, RPT_NAME
		 FROM \`incident_report\`
			 JOIN \`community\` ON IRP_COM_ID = COM_ID
			 JOIN \`report_template\` ON IRP_RPT_ID = RPT_ID
		 WHERE IRP_ID=? AND IRP_DELETED_ON IS NULL`,
		[reportId]);
	return rows.length > 0 ? rows[0] : null;
}

function getReportSections(reportId)
{
	return $Db.executeQuery(
		`SELECT IRS_ID, IRS_RTS_ID, IRS_TITLE, IRS_SORT_ORDER, IRS_CLIENT_INCLUDED,
		        IRS_VALUES, IRS_SUBMITTED_VALUES, IRS_MANAGER_NOTES
		 FROM \`incident_report_section\`
		 WHERE IRS_IRP_ID=? AND IRS_DELETED_ON IS NULL
		 ORDER BY IRS_SORT_ORDER ASC`,
		[reportId]);
}

function getReportAttachments(reportId)
{
	return $Db.executeQuery(
		`SELECT IRA_ID, IRA_IRS_ID, IRA_FIELD_ID, IRA_FILE_NAME, IRA_UPLOADED_BY
		 FROM \`incident_report_attachment\`
		 WHERE IRA_IRP_ID=? AND IRA_DELETED_ON IS NULL
		 ORDER BY IRA_SORT_ORDER ASC, IRA_ID ASC`,
		[reportId]);
}

function getReportHistory(reportId)
{
	return $Db.executeQuery(
		`SELECT IRH_ID, IRH_ACTION, IRH_FROM_STATUS, IRH_TO_STATUS, IRH_USR_ID, IRH_COMMENT, IRH_CHANGES, IRH_CREATED_ON
		 FROM \`incident_report_history\`
		 WHERE IRH_IRP_ID=?
		 ORDER BY IRH_CREATED_ON ASC, IRH_ID ASC`,
		[reportId]);
}

// Standalone report recipient must be an active resident of the report community
function isValidClientRecipient(clientUserId, communityId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_USR_ID FROM \`user_details\`
		 WHERE USD_USR_ID=? AND USD_TYPE=? AND USD_STATUS=? AND USD_COM_ID=? AND USD_DELETED_ON IS NULL`,
		[clientUserId, $Const.USER_TYPE_RESIDENT, $Const.USER_STATUS_ACTIVE, communityId]);
	return rows.length > 0;
}

// Officer's latest GPS position as {latitude, longitude} (empty object when none)
function latestLocationOf(userId)
{
	let row = $Funcs.getOfficerLatestLocation(userId);
	return row ? {latitude: parseFloat(row.GPL_LATITUDE), longitude: parseFloat(row.GPL_LONGITUDE)} : {};
}

// Admin community scoping: non-super admins with an assigned community only see that community
function getAdminScopeCommunityId(session)
{
	if ($Funcs.isUserSuperAdmin(session))
	{
		return null;
	}
	return $Funcs.getAdminCommunityId(session.userId);
}

function canAdminAccessReport(session, record)
{
	let scopeComId = getAdminScopeCommunityId(session);
	return !scopeComId || Number(scopeComId) === Number(record.IRP_COM_ID);
}

function isOfficerEditable(record)
{
	let editableStatuses = [$Const.REPORT_STATUS_DRAFT, $Const.REPORT_STATUS_CHANGES_REQUESTED];
	if (record.IRP_ALLOW_OFFICER_EDITING === 1)
	{
		editableStatuses.push($Const.REPORT_STATUS_SUBMITTED);
	}
	return editableStatuses.includes(record.IRP_STATUS);
}

// Verifies the user is the recorded reviewer and holds (or re-acquires) the review lock.
// Must be called before beginTransaction() - the lock procedure commits on its own.
function holdsReviewLock(record, userId)
{
	if (record.IRP_REVIEWER_USR_ID !== userId)
	{
		return false;
	}
	let lock = $EntityLock.acquire(REVIEW_LOCK_TABLE, record.IRP_ID, userId);
	return lock.acquired === true;
}

// Active admins with the Manager role in the report community; falls back to Super Admins
function getResponsibleManagerIds(communityId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_USR_ID, USD_TYPE, USD_COM_ID, USD_ROLE_ALLOW, USD_ROLE_DENY
		 FROM \`user_details\`
		 WHERE USD_TYPE=? AND USD_STATUS=? AND USD_DELETED_ON IS NULL`,
		[$Const.USER_TYPE_ADMIN, $Const.USER_STATUS_ACTIVE]);

	let hasRole = (r, role) => $UserRoles.doesUserHaveRole({userType: r.USD_TYPE, allowRolesBits: r.USD_ROLE_ALLOW, denyRolesBits: r.USD_ROLE_DENY}, role);

	let managers = rows.filter(r => Number(r.USD_COM_ID) === Number(communityId) && hasRole(r, $Const.USER_ROLE_MANAGER));
	if (managers.length === 0)
	{
		managers = rows.filter(r => hasRole(r, $Const.USER_ROLE_SUPER_ADMIN));
	}
	return managers.map(r => r.USD_USR_ID);
}

function sendReportNotification(session, type, record, templateVars, targetUserIds, message = null)
{
	let uniqueIds = [...new Set((targetUserIds || []).filter(id => !$Utils.empty(id)))];
	if (uniqueIds.length === 0)
	{
		return;
	}
	let params = {
		target_user_ids: uniqueIds,
		type: type,
		template_vars: JSON.stringify(templateVars),
		payload: JSON.stringify({entity_type: "report", entity_id: record.IRP_ID}),
		community_id: record.IRP_COM_ID,
		send_push: true
	};
	if (message)
	{
		params.message = message.substring(0, MAX_NOTIFICATION_MESSAGE_LENGTH);
	}
	$executeAPI(session, "Notification/create_bulk_notifications", params);
}

// ---------------------------------------------------------------------------
// Snapshot & state helpers
// ---------------------------------------------------------------------------

// Freezes the template structure (enabled sections only) and its effective style into the report
function buildSnapshot(template)
{
	return {
		template_id: template.template_id,
		template_name: template.name,
		category: template.category,
		title_format: template.title_format,
		review_before_client: template.review_before_client === true,
		allow_officer_editing: template.allow_officer_editing === true,
		style: {...$ReportPdf.getDefaultStyle(), ...(template.style || {})},
		sections: (template.sections || []).filter(s => s.is_enabled).map(s => ({
			section_id: s.section_id,
			title: s.title,
			sort_order: s.sort_order,
			is_required: s.is_required === true,
			client_visible: s.client_visible === true,
			fields: (s.fields || []).map(f => ({
				field_id: f.field_id,
				field_key: f.field_key,
				label: f.label,
				description: f.description || null,
				field_type: f.field_type,
				config: f.config || null,
				sort_order: f.sort_order,
				is_system_field: f.is_system_field === true,
				is_required: f.is_required === true,
				is_auto_populated: false,
				is_locked: false
			}))
		}))
	};
}

function indexSnapshot(snapshot)
{
	let index = {};
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		let fieldsById = {};
		for (let j = 0; j < s.fields.length; j++)
		{
			fieldsById[s.fields[j].field_id] = s.fields[j];
		}
		index[s.section_id] = {section: s, fieldsById: fieldsById};
	}
	return index;
}

function createEmptyState(snapshot)
{
	let state = {sections: {}};
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		state.sections[s.section_id] = {
			irsId: null,
			values: {},
			submittedValues: null,
			managerNotes: null,
			clientIncluded: s.client_visible,
			attachments: {}
		};
	}
	return state;
}

function buildStateFromRows(sectionRows, attachmentRows)
{
	let state = {sections: {}};
	let irsToSection = {};
	for (let i = 0; i < sectionRows.length; i++)
	{
		let r = sectionRows[i];
		irsToSection[r.IRS_ID] = r.IRS_RTS_ID;
		state.sections[r.IRS_RTS_ID] = {
			irsId: r.IRS_ID,
			values: $Funcs.parseJson(r.IRS_VALUES, {}) || {},
			submittedValues: $Funcs.parseJson(r.IRS_SUBMITTED_VALUES, null),
			managerNotes: r.IRS_MANAGER_NOTES || null,
			clientIncluded: r.IRS_CLIENT_INCLUDED === 1,
			attachments: {}
		};
	}
	for (let i = 0; i < attachmentRows.length; i++)
	{
		let a = attachmentRows[i];
		let sectionId = irsToSection[a.IRA_IRS_ID];
		if (sectionId === undefined)
		{
			continue;
		}
		let attachments = state.sections[sectionId].attachments;
		if (!attachments[a.IRA_FIELD_ID])
		{
			attachments[a.IRA_FIELD_ID] = [];
		}
		attachments[a.IRA_FIELD_ID].push({attachment_id: a.IRA_ID, file_name: a.IRA_FILE_NAME, uploaded_by: a.IRA_UPLOADED_BY});
	}
	return state;
}

function loadReportContent(record)
{
	let snapshot = $Funcs.parseJson(record.IRP_CONTENT_SNAPSHOT, null) || {sections: [], style: {}};
	let sectionRows = getReportSections(record.IRP_ID);
	let attachmentRows = getReportAttachments(record.IRP_ID);
	return {snapshot: snapshot, sectionRows: sectionRows, state: buildStateFromRows(sectionRows, attachmentRows)};
}

function getCallTypeName(call)
{
	if (!$Utils.empty(call.service_type))
	{
		return $DataItems.getItemName(call.service_type, TABLE_SERVICE_TYPE) || call.service_type;
	}
	return $DataItems.getItemName(call.category, TABLE_CALL_CATEGORY) || call.category;
}

// Auto-populated fields are locked unless the system field allows editing (lock_on_auto attribute)
function isFieldLocked(field)
{
	return field.is_locked !== undefined ? field.is_locked === true : field.is_auto_populated === true;
}

function hasValue(value)
{
	return value !== null && value !== undefined && value !== "";
}

// POI "Report Encounter" pre-fill: record type, subject details and the officer's current location
function getPoiAutoValues(poi, location)
{
	let values = {};
	if (!poi)
	{
		return values;
	}
	let description = "Encounter with " + (poi.full_name || "") + (poi.known_aliases ? " (aliases: " + poi.known_aliases + ")" : "") + " - POI Record #" + poi.record_id;
	values[$Const.REPORT_SYSTEM_FIELD_INCIDENT_TYPE] = poi.record_type_name || poi.record_type;
	values[$Const.REPORT_SYSTEM_FIELD_INCIDENT_DESCRIPTION] = description;
	if (location && (hasValue(location.address) || (hasValue(location.latitude) && hasValue(location.longitude))))
	{
		values[$Const.REPORT_SYSTEM_FIELD_INCIDENT_LOCATION] = {address: location.address || null, latitude: location.latitude, longitude: location.longitude};
	}
	return values;
}

// Pre-populates system fields from the session, the call and/or the POI record (call values take precedence)
function applyAutoPopulation(snapshot, state, ctx)
{
	let auto = {};
	auto[$Const.REPORT_SYSTEM_FIELD_OFFICER_NAME] = ctx.officerName;
	auto[$Const.REPORT_SYSTEM_FIELD_COMMUNITY_NAME] = ctx.communityName;

	let mediaFiles = [];
	let call = ctx.call;
	if (call)
	{
		let created = call.created_on ? new $Date(call.created_on) : null;
		let address = call.current_address || call.address || null;
		let hasCoords = call.latitude !== null && call.longitude !== null;

		auto[$Const.REPORT_SYSTEM_FIELD_INCIDENT_DATE] = (created && created.isValid()) ? created.format("Y-m-d") : null;
		auto[$Const.REPORT_SYSTEM_FIELD_INCIDENT_TIME] = (created && created.isValid()) ? created.format("H:i") : null;
		auto[$Const.REPORT_SYSTEM_FIELD_INCIDENT_LOCATION] = (address || hasCoords) ? {address: address, latitude: call.latitude, longitude: call.longitude} : null;
		auto[$Const.REPORT_SYSTEM_FIELD_INCIDENT_TYPE] = getCallTypeName(call);
		auto[$Const.REPORT_SYSTEM_FIELD_INCIDENT_DESCRIPTION] = call.description || null;
		auto[$Const.REPORT_SYSTEM_FIELD_RESIDENT_NAME] = call.resident_name || null;
		auto[$Const.REPORT_SYSTEM_FIELD_CALL_REFERENCE] = String(call.call_id);
		auto[$Const.REPORT_SYSTEM_FIELD_PRIORITY] = call.priority ? ($DataItems.getItemName(call.priority, TABLE_CALL_PRIORITY) || call.priority) : null;
		auto[$Const.REPORT_SYSTEM_FIELD_OFFICER_COMMENTS] = call.officer_comments || null;

		mediaFiles = (call.media || []).map(url => $Files.getFileNameFromUrl(url)).filter(name => !$Utils.empty(name));
	}

	for (let [key, value] of Object.entries(getPoiAutoValues(ctx.poi, ctx.location)))
	{
		if ($Utils.empty(auto[key]))
		{
			auto[key] = value;
		}
	}

	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		let sec = state.sections[s.section_id];
		for (let j = 0; j < s.fields.length; j++)
		{
			let f = s.fields[j];
			if (!f.is_system_field)
			{
				continue;
			}
			if (isFileFieldType(f.field_type))
			{
				// Call media is imported as regular attachments - officers/managers may still add or remove files
				if (f.field_key === $Const.REPORT_SYSTEM_FIELD_MEDIA && mediaFiles.length > 0)
				{
					sec.attachments[f.field_id] = mediaFiles.slice(0, getMaxFiles(f)).map(name => ({attachment_id: null, file_name: name}));
				}
				continue;
			}
			let value = auto[f.field_key];
			if ($Utils.empty(value))
			{
				continue;
			}
			sec.values[f.field_id] = value;
			f.is_auto_populated = true;
			f.is_locked = $DataItems.getItemAttr(f.field_key, TABLE_REPORT_SYSTEM_FIELD, "lock_on_auto") === true;
		}
	}
}

function getMaxFiles(field)
{
	let cfg = field.config || {};
	let max = parseInt(cfg.max_files);
	if (!max || max < 1)
	{
		max = parseInt($DataItems.getItemAttr(field.field_type, TABLE_REPORT_FIELD_TYPE, "default_max_files")) || 1;
	}
	return max;
}

function getIncidentTypeValue(snapshot, state)
{
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		for (let j = 0; j < s.fields.length; j++)
		{
			let f = s.fields[j];
			if (f.is_system_field && f.field_key === $Const.REPORT_SYSTEM_FIELD_INCIDENT_TYPE)
			{
				let value = state.sections[s.section_id].values[f.field_id];
				if (!$Utils.empty(value))
				{
					return Array.isArray(value) ? value.join(", ") : String(value);
				}
			}
		}
	}
	return "";
}

function buildReportTitle(snapshot, state, ctx)
{
	let replacements = {
		"{date}": $ReportPdf.formatDate(ctx.date, snapshot.style),
		"{community}": ctx.communityName || "",
		"{officer}": ctx.officerName || "",
		"{template_name}": snapshot.template_name || "",
		"{incident_type}": getIncidentTypeValue(snapshot, state) || ctx.fallbackIncidentType || ""
	};
	let title = snapshot.title_format || snapshot.template_name || "";
	for (let [placeholder, value] of Object.entries(replacements))
	{
		title = title.split(placeholder).join(value);
	}
	title = title.trim() || snapshot.template_name || "Report";
	return title.substring(0, MAX_REPORT_TITLE_LENGTH);
}

// ---------------------------------------------------------------------------
// Field value validation
// ---------------------------------------------------------------------------

function invalidValue(field, info)
{
	return {error: $Err.errWithInfo("ERR_REPORT_INVALID_FIELD_VALUE", field.label + (info ? ": " + info : ""))};
}

function normalizeFieldValue(field, raw)
{
	if (raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0))
	{
		return {value: null};
	}

	let cfg = field.config || {};

	switch (field.field_type)
	{
		case $Const.REPORT_FIELD_TYPE_TEXT:
		{
			if (typeof raw === "object")
			{
				return invalidValue(field, "text expected");
			}
			let text = String(raw).trim();
			let maxChars = parseInt(cfg.max_chars) || DEFAULT_TEXT_MAX_CHARS;
			if (text.length > maxChars)
			{
				return invalidValue(field, "exceeds " + maxChars + " characters");
			}
			return {value: text || null};
		}

		case $Const.REPORT_FIELD_TYPE_DATE:
		{
			let date = (typeof raw === "string") ? $Utils.validateDateStr(raw.trim(), true) : false;
			if (!date)
			{
				return invalidValue(field, "date expected (YYYY-MM-DD)");
			}
			return {value: date.substring(0, 10)};
		}

		case $Const.REPORT_FIELD_TYPE_LOCATION:
		{
			let loc = (typeof raw === "string") ? {address: raw} : raw;
			if (typeof loc !== "object" || Array.isArray(loc))
			{
				return invalidValue(field, "location expected");
			}
			let address = $Utils.empty(loc.address) ? null : String(loc.address).trim();
			if (address && address.length > MAX_LOCATION_ADDRESS_LENGTH)
			{
				return invalidValue(field, "address exceeds " + MAX_LOCATION_ADDRESS_LENGTH + " characters");
			}
			let hasLat = loc.latitude !== null && loc.latitude !== undefined && loc.latitude !== "";
			let hasLng = loc.longitude !== null && loc.longitude !== undefined && loc.longitude !== "";
			if (hasLat !== hasLng)
			{
				return invalidValue(field, "both latitude and longitude are required");
			}
			let lat = hasLat ? Number(loc.latitude) : null;
			let lng = hasLng ? Number(loc.longitude) : null;
			if (hasLat && (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180))
			{
				return invalidValue(field, "invalid coordinates");
			}
			if (!address && !hasLat)
			{
				return {value: null};
			}
			return {value: {address: address, latitude: lat, longitude: lng}};
		}

		case $Const.REPORT_FIELD_TYPE_DROPDOWN:
		{
			let options = Array.isArray(cfg.dropdown_values) && cfg.dropdown_values.length > 0 ? cfg.dropdown_values.map(String) : null;
			if (cfg.is_multi_select === true)
			{
				let list = Array.isArray(raw) ? raw : [raw];
				if (list.some(v => v === null || typeof v === "object"))
				{
					return invalidValue(field, "list of options expected");
				}
				list = [...new Set(list.map(v => String(v).trim()).filter(v => v.length > 0))];
				if (options && list.some(v => !options.includes(v)))
				{
					return invalidValue(field, "invalid option");
				}
				return {value: list.length > 0 ? list : null};
			}
			if (typeof raw === "object")
			{
				return invalidValue(field, "single option expected");
			}
			let option = String(raw).trim();
			if (options && !options.includes(option))
			{
				return invalidValue(field, "invalid option");
			}
			return {value: option || null};
		}

		default:
			return invalidValue(field, "unsupported field type");
	}
}

function applyFileFieldUpdate(field, sec, raw, fileMap)
{
	let current = sec.attachments[field.field_id] || [];
	let input = (raw === null || raw === undefined || raw === "") ? {} : raw;
	if (typeof input !== "object" || Array.isArray(input))
	{
		return invalidValue(field, "{attachment_ids, file_ids} expected");
	}

	let keepIds = Array.isArray(input.attachment_ids) ? [...new Set(input.attachment_ids.map(Number))] : [];
	let newFileIds = Array.isArray(input.file_ids) ? [...new Set(input.file_ids.map(String))] : [];

	for (let i = 0; i < keepIds.length; i++)
	{
		if (!current.some(a => a.attachment_id === keepIds[i]))
		{
			return {error: $Err.errWithInfo("ERR_REPORT_INVALID_ATTACHMENT", field.label)};
		}
	}

	// Unsaved entries (attachment_id null) only exist while creating a report (call media import) and are always kept
	let next = current.filter(a => a.attachment_id === null || keepIds.includes(a.attachment_id));
	let removed = current.filter(a => a.attachment_id !== null && !keepIds.includes(a.attachment_id));
	for (let i = 0; i < newFileIds.length; i++)
	{
		next.push({attachment_id: null, file_name: fileMap[newFileIds[i]]});
	}

	let maxFiles = getMaxFiles(field);
	if (next.length > maxFiles)
	{
		return {error: $Err.errWithInfo("ERR_REPORT_FILE_LIMIT_REACHED", field.label + " (max " + maxFiles + ")")};
	}

	sec.attachments[field.field_id] = next;

	return {
		changed: removed.length > 0 || newFileIds.length > 0,
		removed: removed,
		added: newFileIds.map(id => fileMap[id])
	};
}

// Applies section updates to the in-memory state. Returns {changedSections, toRemove, changes} or {error}.
// updates: [{sectionId (snapshot section id), values, manager_notes, client_included}]
function applySectionUpdates(snapshot, state, updates, isAdmin)
{
	let index = indexSnapshot(snapshot);

	// Resolve all new file IDs in a single query
	let newFileIds = [];
	for (let i = 0; i < updates.length; i++)
	{
		let u = updates[i];
		let entry = index[u.sectionId];
		if (!entry || !state.sections[u.sectionId])
		{
			return {error: $ERRS.ERR_REPORT_INVALID_SECTION};
		}
		if (u.values === null || u.values === undefined)
		{
			continue;
		}
		if (typeof u.values !== "object" || Array.isArray(u.values))
		{
			return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "section values must be an object keyed by field_id")};
		}
		for (let [fieldId, raw] of Object.entries(u.values))
		{
			let field = entry.fieldsById[fieldId];
			if (field && isFileFieldType(field.field_type) && raw && Array.isArray(raw.file_ids))
			{
				newFileIds.push(...raw.file_ids.map(String));
			}
		}
	}
	newFileIds = [...new Set(newFileIds)];
	let fileMap = $Funcs.getFileNamesByIds(newFileIds);
	if (Object.keys(fileMap).length !== newFileIds.length)
	{
		return {error: $ERRS.ERR_FILE_NOT_FOUND};
	}

	let changedSections = new Set();
	let toRemove = [];
	let changes = [];

	for (let i = 0; i < updates.length; i++)
	{
		let u = updates[i];
		let entry = index[u.sectionId];
		let sec = state.sections[u.sectionId];
		let base = {report_section_id: sec.irsId, section_title: entry.section.title};

		if (u.values)
		{
			for (let [fieldId, raw] of Object.entries(u.values))
			{
				let field = entry.fieldsById[fieldId];
				if (!field)
				{
					return {error: $Err.errWithInfo("ERR_REPORT_INVALID_FIELD_VALUE", "unknown field_id " + fieldId)};
				}

				if (isFileFieldType(field.field_type))
				{
					let rv = applyFileFieldUpdate(field, sec, raw, fileMap);
					if (rv.error)
					{
						return rv;
					}
					if (rv.changed)
					{
						toRemove.push(...rv.removed.map(a => a.attachment_id));
						changes.push({...base, field_id: field.field_id, label: field.label,
							attachments_added: rv.added,
							attachments_removed: rv.removed.map(a => ({attachment_id: a.attachment_id, file_name: a.file_name}))});
						changedSections.add(u.sectionId);
					}
					continue;
				}

				let rv = normalizeFieldValue(field, raw);
				if (rv.error)
				{
					return rv;
				}
				let oldValue = sec.values[field.field_id];
				if (isSameValue(oldValue, rv.value))
				{
					continue;
				}
				if (isFieldLocked(field))
				{
					return {error: $Err.errWithInfo("ERR_REPORT_FIELD_LOCKED", field.label)};
				}
				if (rv.value === null)
				{
					delete sec.values[field.field_id];
				}
				else
				{
					sec.values[field.field_id] = rv.value;
				}
				changes.push({...base, field_id: field.field_id, label: field.label, old_value: oldValue === undefined ? null : oldValue, new_value: rv.value});
				changedSections.add(u.sectionId);
			}
		}

		if (!isAdmin)
		{
			continue;
		}

		if (u.manager_notes !== null && u.manager_notes !== undefined)
		{
			let notes = String(u.manager_notes).trim() || null;
			if (notes && notes.length > MAX_MANAGER_NOTES_LENGTH)
			{
				return {error: $Err.errWithInfo("ERR_INVALID_API_PARAM", "manager_notes exceeds " + MAX_MANAGER_NOTES_LENGTH + " characters")};
			}
			if (notes !== sec.managerNotes)
			{
				changes.push({...base, field: "manager_notes", old_value: sec.managerNotes, new_value: notes});
				sec.managerNotes = notes;
				changedSections.add(u.sectionId);
			}
		}

		if (u.client_included !== null && u.client_included !== undefined)
		{
			let included = u.client_included === true || u.client_included === 1 || u.client_included === "true";
			if (included !== sec.clientIncluded)
			{
				changes.push({...base, field: "client_included", old_value: sec.clientIncluded, new_value: included});
				sec.clientIncluded = included;
				changedSections.add(u.sectionId);
			}
		}
	}

	return {changedSections: changedSections, toRemove: toRemove, changes: changes};
}

function isFieldFilled(field, sec)
{
	if (isFileFieldType(field.field_type))
	{
		return (sec.attachments[field.field_id] || []).length > 0;
	}
	let value = sec.values[field.field_id];
	if (field.field_type === $Const.REPORT_FIELD_TYPE_LOCATION)
	{
		return !!value && (!$Utils.empty(value.address) || (value.latitude !== null && value.latitude !== undefined));
	}
	return !$Utils.empty(value);
}

// Required sections must be completed; optional sections may be skipped entirely,
// but once any of their fields is filled, their required fields must be filled too.
function getMissingRequiredFields(snapshot, state)
{
	let missing = [];
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		let sec = state.sections[s.section_id];
		if (!sec)
		{
			continue;
		}
		let filled = s.fields.map(f => isFieldFilled(f, sec));
		let anyFilled = filled.some(v => v);
		if (!s.is_required && !anyFilled)
		{
			continue;
		}
		let hasRequiredFields = false;
		for (let j = 0; j < s.fields.length; j++)
		{
			if (!s.fields[j].is_required)
			{
				continue;
			}
			hasRequiredFields = true;
			if (!filled[j])
			{
				missing.push({report_section_id: sec.irsId, section_title: s.title, field_id: s.fields[j].field_id, label: s.fields[j].label});
			}
		}
		if (s.is_required && !hasRequiredFields && !anyFilled)
		{
			missing.push({report_section_id: sec.irsId, section_title: s.title, field_id: null, label: null});
		}
	}
	return missing;
}

// ---------------------------------------------------------------------------
// Write helpers (called inside transactions only)
// ---------------------------------------------------------------------------

function insertSections(reportId, snapshot, state, now)
{
	let placeholders = snapshot.sections.map(() => "(?,?,?,?,?,CAST(? AS JSON),?,?)").join(",");
	let params = [];
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		let sec = state.sections[s.section_id];
		params.push(reportId, s.section_id, s.title, s.sort_order, sec.clientIncluded ? 1 : 0, JSON.stringify(sec.values), now, now);
	}
	$Db.executeQuery(
		`INSERT INTO \`incident_report_section\`
		 (IRS_IRP_ID, IRS_RTS_ID, IRS_TITLE, IRS_SORT_ORDER, IRS_CLIENT_INCLUDED, IRS_VALUES, IRS_CREATED_ON, IRS_LAST_UPDATE)
		 VALUES ${placeholders}`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	// MySQL: bulk INSERT returns the first auto-increment ID; subsequent IDs are contiguous
	let firstId = $Db.insertId();
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		state.sections[snapshot.sections[i].section_id].irsId = firstId + i;
	}
	return null;
}

function bulkUpdateSections(reportId, state, sectionIds, now)
{
	let sections = [...sectionIds].map(id => state.sections[id]);
	if (sections.length === 0)
	{
		return null;
	}
	let irsIds = sections.map(s => s.irsId);
	let valuesCase = sections.map(() => "WHEN ? THEN CAST(? AS JSON)").join(" ");
	let notesCase = sections.map(() => "WHEN ? THEN ?").join(" ");
	let includedCase = sections.map(() => "WHEN ? THEN ?").join(" ");
	let params = [];
	sections.forEach(s => params.push(s.irsId, JSON.stringify(s.values)));
	sections.forEach(s => params.push(s.irsId, s.managerNotes));
	sections.forEach(s => params.push(s.irsId, s.clientIncluded ? 1 : 0));
	params.push(now, reportId, ...irsIds);

	$Db.executeQuery(
		`UPDATE \`incident_report_section\`
		 SET IRS_VALUES = CASE IRS_ID ${valuesCase} END,
		     IRS_MANAGER_NOTES = CASE IRS_ID ${notesCase} END,
		     IRS_CLIENT_INCLUDED = CASE IRS_ID ${includedCase} END,
		     IRS_LAST_UPDATE = ?
		 WHERE IRS_IRP_ID=? AND IRS_ID IN (${irsIds.toPlaceholders()}) AND IRS_DELETED_ON IS NULL`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

// Inserts all unsaved attachments (attachment_id null) of the given sections in a single query
function insertPendingAttachments(reportId, state, sectionIds, userId, now)
{
	let placeholders = [];
	let params = [];
	for (let sectionId of sectionIds)
	{
		let sec = state.sections[sectionId];
		for (let [fieldId, list] of Object.entries(sec.attachments))
		{
			for (let i = 0; i < list.length; i++)
			{
				if (list[i].attachment_id !== null)
				{
					continue;
				}
				placeholders.push("(?,?,?,?,?,?,?)");
				params.push(reportId, sec.irsId, fieldId, list[i].file_name, userId, i, now);
			}
		}
	}
	if (placeholders.length === 0)
	{
		return null;
	}
	$Db.executeQuery(
		`INSERT INTO \`incident_report_attachment\`
		 (IRA_IRP_ID, IRA_IRS_ID, IRA_FIELD_ID, IRA_FILE_NAME, IRA_UPLOADED_BY, IRA_SORT_ORDER, IRA_CREATED_ON)
		 VALUES ${placeholders.join(",")}`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

function softDeleteAttachments(reportId, attachmentIds, now)
{
	if (attachmentIds.length === 0)
	{
		return null;
	}
	$Db.executeQuery(
		`UPDATE \`incident_report_attachment\` SET IRA_DELETED_ON=?
		 WHERE IRA_IRP_ID=? AND IRA_ID IN (${attachmentIds.toPlaceholders()}) AND IRA_DELETED_ON IS NULL`,
		[now, reportId, ...attachmentIds]);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

// entries: [{action, from, to, userId, comment, changes}]
function insertHistory(reportId, entries, now)
{
	let placeholders = entries.map(() => "(?,?,?,?,?,?,?,?)").join(",");
	let params = [];
	for (let i = 0; i < entries.length; i++)
	{
		let e = entries[i];
		params.push(reportId, e.action, e.from || null, e.to || null, e.userId || null, e.comment || null,
			e.changes ? JSON.stringify(e.changes) : null, now);
	}
	$Db.executeQuery(
		`INSERT INTO \`incident_report_history\`
		 (IRH_IRP_ID, IRH_ACTION, IRH_FROM_STATUS, IRH_TO_STATUS, IRH_USR_ID, IRH_COMMENT, IRH_CHANGES, IRH_CREATED_ON)
		 VALUES ${placeholders}`,
		params);
	if ($Db.isError())
	{
		return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
	}
	return null;
}

// Runs a status transition (conditional on the current status) plus history inside one transaction.
// Returns null on success, an error object otherwise.
function commitStatusTransition(record, fromStatus, setClause, setParams, history, staleError, extraWrites = null)
{
	let now = $Utils.now();

	$Db.beginTransaction();

	$Db.executeQuery(
		`UPDATE \`incident_report\` SET ${setClause}, IRP_LAST_UPDATE=?
		 WHERE IRP_ID=? AND IRP_STATUS=? AND IRP_DELETED_ON IS NULL`,
		[...setParams, now, record.IRP_ID, fromStatus]);
	if ($Db.isError())
	{
		$Db.rollbackTransaction();
		return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
	}
	if ($Db.affectedRows() === 0)
	{
		$Db.rollbackTransaction();
		return staleError;
	}

	if (extraWrites)
	{
		let err = extraWrites(now);
		if (err)
		{
			$Db.rollbackTransaction();
			return err;
		}
	}

	let histErr = insertHistory(record.IRP_ID, history, now);
	if (histErr)
	{
		$Db.rollbackTransaction();
		return histErr;
	}

	$Db.commitTransaction();
	return null;
}

// ---------------------------------------------------------------------------
// Response mapping
// ---------------------------------------------------------------------------

function mapFieldView(field, sec, mode)
{
	let isFile = isFileFieldType(field.field_type);
	let view = {
		field_id: field.field_id,
		field_key: field.field_key,
		label: field.label,
		field_type: field.field_type,
		value: isFile ? null : (sec.values[field.field_id] === undefined ? null : sec.values[field.field_id])
	};
	if (isFile)
	{
		view.attachments = (sec.attachments[field.field_id] || []).map(a => {
			let item = {url: $Files.getUrl({file_name: a.file_name})};
			if (mode !== "client")
			{
				item.attachment_id = a.attachment_id;
			}
			return item;
		});
	}
	if (mode !== "client")
	{
		view.description = field.description;
		view.config = field.config;
		view.is_system_field = field.is_system_field;
		view.is_required = field.is_required;
		view.is_auto_populated = field.is_auto_populated === true;
		view.is_locked = isFieldLocked(field);
	}
	if (mode === "admin" && !isFile)
	{
		let submitted = sec.submittedValues ? sec.submittedValues[field.field_id] : undefined;
		view.submitted_value = submitted === undefined ? null : submitted;
	}
	return view;
}

function mapSections(snapshot, state, mode)
{
	let sections = [];
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		let sec = state.sections[s.section_id];
		if (!sec || (mode === "client" && !sec.clientIncluded))
		{
			continue;
		}
		let view = {
			report_section_id: sec.irsId,
			title: s.title,
			sort_order: s.sort_order,
			fields: s.fields.map(f => mapFieldView(f, sec, mode))
		};
		if (mode !== "client")
		{
			view.section_id = s.section_id;
			view.is_required = s.is_required;
			view.client_included = sec.clientIncluded;
		}
		if (mode === "admin")
		{
			view.manager_notes = sec.managerNotes;
		}
		sections.push(view);
	}
	return sections;
}

function mapHistory(rows)
{
	let names = $Funcs.getUserNames(rows.map(r => r.IRH_USR_ID).filter(id => !$Utils.empty(id)));
	return rows.map(r => ({
		history_id: r.IRH_ID,
		action: r.IRH_ACTION,
		action_name: $DataItems.getItemName(r.IRH_ACTION, TABLE_REPORT_HISTORY_ACTION) || r.IRH_ACTION,
		from_status: r.IRH_FROM_STATUS || null,
		to_status: r.IRH_TO_STATUS || null,
		user_id: r.IRH_USR_ID || null,
		user_name: r.IRH_USR_ID ? names[r.IRH_USR_ID] : null,
		comment: r.IRH_COMMENT || null,
		changes: $Funcs.parseJson(r.IRH_CHANGES, null),
		created_on: r.IRH_CREATED_ON
	}));
}

function buildReportView(record, snapshot, state, mode, userId)
{
	let names = $Funcs.getUserNames([record.IRP_OFC_USR_ID, record.IRP_CLIENT_USR_ID, record.IRP_REVIEWER_USR_ID,
		record.IRP_APPROVED_BY, record.IRP_DELIVERED_BY].filter(id => !$Utils.empty(id)));
	let nameOf = id => (id ? names[id] : null);

	let report = {
		report_id: record.IRP_ID,
		title: record.IRP_TITLE,
		template_name: record.RPT_NAME,
		category: record.IRP_CATEGORY,
		category_name: $DataItems.getItemName(record.IRP_CATEGORY, TABLE_REPORT_CATEGORY) || record.IRP_CATEGORY,
		community_id: record.IRP_COM_ID,
		community_name: record.COM_NAME,
		call_id: record.IRP_SVC_ID || null,
		officer_name: nameOf(record.IRP_OFC_USR_ID),
		management_summary: record.IRP_MANAGEMENT_SUMMARY || null,
		created_on: record.IRP_CREATED_ON,
		delivered_on: record.IRP_DELIVERED_ON || null,
		pdf_url: getPdfUrl(record.IRP_PDF_FILE_NAME),
		sections: mapSections(snapshot, state, mode)
	};

	if (mode === "client")
	{
		return report;
	}

	Object.assign(report, {
		template_id: record.IRP_RPT_ID,
		poi_id: record.IRP_POI_ID || null,
		status: record.IRP_STATUS,
		status_name: $DataItems.getItemName(record.IRP_STATUS, TABLE_REPORT_STATUS) || record.IRP_STATUS,
		officer_user_id: record.IRP_OFC_USR_ID,
		client_user_id: record.IRP_CLIENT_USR_ID || null,
		client_name: nameOf(record.IRP_CLIENT_USR_ID),
		review_required: record.IRP_REVIEW_REQUIRED === 1,
		allow_officer_editing: record.IRP_ALLOW_OFFICER_EDITING === 1,
		changes_comment: record.IRP_CHANGES_COMMENT || null,
		submitted_on: record.IRP_SUBMITTED_ON || null,
		approved_on: record.IRP_APPROVED_ON || null,
		approved_by_name: nameOf(record.IRP_APPROVED_BY),
		delivered_by_name: nameOf(record.IRP_DELIVERED_BY),
		last_update: record.IRP_LAST_UPDATE || null
	});

	if (mode === "officer")
	{
		report.can_edit = record.IRP_OFC_USR_ID === userId && isOfficerEditable(record);
		return report;
	}

	let lock = $EntityLock.check(REVIEW_LOCK_TABLE, record.IRP_ID);
	Object.assign(report, {
		reviewer_user_id: record.IRP_REVIEWER_USR_ID || null,
		reviewer_name: nameOf(record.IRP_REVIEWER_USR_ID),
		review_started_on: record.IRP_REVIEW_STARTED_ON || null,
		review_lock: {
			is_locked: lock.is_locked === true,
			locked_by: lock.is_locked ? lock.locked_by : null,
			locked_by_name: lock.is_locked ? $Funcs.getUserName(lock.locked_by) : null,
			expires_on: lock.is_locked ? lock.expires_on : null
		},
		can_edit: record.IRP_STATUS === $Const.REPORT_STATUS_UNDER_REVIEW && record.IRP_REVIEWER_USR_ID === userId,
		history: mapHistory(getReportHistory(record.IRP_ID))
	});
	return report;
}

function loadFileBuffer(fileName)
{
	try
	{
		return $Files.getFileFromContainer(fileName) || null;
	}
	catch (e)
	{
		return null;
	}
}

function isEmbeddableImage(fileName)
{
	let ext = String(fileName || "").split(".").pop().toLowerCase();
	return $DataItems.isValidItemId(ext, TABLE_REPORT_PDF_IMAGE_EXT);
}

function getSafeLogo(fileName)
{
	let buffer = $Utils.empty(fileName) ? null : loadFileBuffer(fileName);
	return (buffer && $Funcs.isPdfSafeImage(buffer)) ? buffer : null;
}

// Client-facing content for the PDF renderer (client-included sections only, manager notes excluded)
function buildPdfData(record, snapshot, state, officerName, deliveredOn)
{
	let style = {...$ReportPdf.getDefaultStyle(), ...(snapshot.style || {})};
	let sections = [];
	for (let i = 0; i < snapshot.sections.length; i++)
	{
		let s = snapshot.sections[i];
		let sec = state.sections[s.section_id];
		if (!sec || !sec.clientIncluded)
		{
			continue;
		}
		sections.push({
			title: s.title,
			fields: s.fields.map(f => {
				// Images are embedded only when they decode safely; anything else is listed by file name
				let images = [];
				let files = [];
				let attachments = sec.attachments[f.field_id] || [];
				for (let j = 0; j < attachments.length; j++)
				{
					let buffer = isEmbeddableImage(attachments[j].file_name) ? loadFileBuffer(attachments[j].file_name) : null;
					if (buffer && $Funcs.isPdfSafeImage(buffer))
					{
						images.push(buffer);
					}
					else
					{
						files.push(attachments[j].file_name);
					}
				}
				return {
					label: f.label,
					field_type: f.field_type,
					value: sec.values[f.field_id] === undefined ? null : sec.values[f.field_id],
					is_file: isFileFieldType(f.field_type),
					images: images,
					files: files
				};
			})
		});
	}
	return {
		report_id: record.IRP_ID,
		title: record.IRP_TITLE,
		community_name: record.COM_NAME,
		officer_name: officerName,
		category_name: $DataItems.getItemName(record.IRP_CATEGORY, TABLE_REPORT_CATEGORY) || record.IRP_CATEGORY,
		created_on: record.IRP_CREATED_ON,
		delivered_on: deliveredOn,
		management_summary: record.IRP_MANAGEMENT_SUMMARY || null,
		style: style,
		logo: getSafeLogo(style.company_logo),
		sections: sections
	};
}

// Signed, time-limited URL of a client PDF (stored with limited access)
function getPdfUrl(fileName)
{
	return $Utils.empty(fileName) ? null : $Files.getUrl({file_name: fileName, access_level: $Const.FILE_ACCESS_LEVEL_LIMITED});
}

// Renders the client PDF and returns the stored file name ($Export's file_name is the original name, not the stored one)
function generateClientPdf(record, userId, officerName, deliveredOn)
{
	let content = loadReportContent(record);
	let pdfData = buildPdfData(record, content.snapshot, content.state, officerName, deliveredOn);

	// The PDF engine (pdfkit) and the renderer may throw - fail the request cleanly before any status change
	let exportRv;
	try
	{
		exportRv = $Export.generate({
			name: "incident_report_" + record.IRP_ID,
			format: $Const.EXPORT_FORMAT_PDF,
			owner: userId,
			accessLevel: $Const.FILE_ACCESS_LEVEL_LIMITED,
			title: record.IRP_TITLE,
			creator: $Config.get("SYSTEM_NAME"),
			page: $ReportPdf.getPageSetup(),
			render: doc => $ReportPdf.render(doc, pdfData)
		});
	}
	catch (e)
	{
		$Logger.logString($Const.LL_ERROR, `Report ${record.IRP_ID}: PDF generation failed - ${e.message}`);
		return {error: $ERRS.ERR_EXPORT_FAILED};
	}
	if ($Err.isERR(exportRv))
	{
		return {error: exportRv};
	}

	let fileName = $Funcs.getFileNamesByIds([exportRv.file_id])[exportRv.file_id];
	if (!fileName)
	{
		return {error: $ERRS.ERR_FILE_NOT_FOUND};
	}
	return {fileName: fileName};
}

// Delivered reports are visible to their recipient, or community-wide (no recipient) to residents of the report community (Q1)
function canResidentAccessReport(record, userId)
{
	if (record.IRP_STATUS !== $Const.REPORT_STATUS_DELIVERED)
	{
		return false;
	}
	if (record.IRP_CLIENT_USR_ID === userId)
	{
		return true;
	}
	return $Utils.empty(record.IRP_CLIENT_USR_ID) && Number($Funcs.getUserCommunityId(userId)) === Number(record.IRP_COM_ID);
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
		$DataItems.define(TABLE_REPORT_STATUS);
		$DataItems.define(TABLE_REPORT_HISTORY_ACTION);
		$DataItems.define(TABLE_REPORT_CATEGORY);
		$DataItems.define(TABLE_REPORT_TEMPLATE_STATUS);
		$DataItems.define(TABLE_REPORT_FIELD_TYPE);
		$DataItems.define(TABLE_REPORT_SYSTEM_FIELD);
	}

	// =========================================================================
	// Get Reports List
	// =========================================================================

	get_reports_list()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		let conditions = ["IRP_DELETED_ON IS NULL"];
		let params = [];
		let dateColumn;
		let orderBy;

		if (userType === $Const.USER_TYPE_RESIDENT)
		{
			// Delivered reports addressed to the resident, or with no specific recipient in the resident's community (Q1)
			conditions.push("IRP_STATUS=?", "(IRP_CLIENT_USR_ID=? OR (IRP_CLIENT_USR_ID IS NULL AND IRP_COM_ID=?))");
			params.push($Const.REPORT_STATUS_DELIVERED, userId, $Funcs.getUserCommunityId(userId) || 0);
			dateColumn = "IRP_DELIVERED_ON";
			orderBy = "IRP_DELIVERED_ON DESC, IRP_ID DESC";
		}
		else if (userType === $Const.USER_TYPE_OFFICER)
		{
			conditions.push("IRP_OFC_USR_ID=?");
			params.push(userId);
			dateColumn = "IRP_CREATED_ON";
			orderBy = "IRP_CREATED_ON DESC, IRP_ID DESC";
		}
		else
		{
			// Drafts are visible only to the creating officer
			let visibleStatuses = $Funcs.getDataItemIdsByAttr(TABLE_REPORT_STATUS, "manager_visible", true);
			conditions.push(`IRP_STATUS IN (${visibleStatuses.toPlaceholders()})`);
			params.push(...visibleStatuses);

			let communityIds = (Array.isArray(this.$community_ids) ? this.$community_ids : []).map(Number).filter(id => id > 0);
			let scopeComId = getAdminScopeCommunityId(this.$Session);
			if (scopeComId)
			{
				if (communityIds.length > 0 && !communityIds.includes(Number(scopeComId)))
				{
					return $ERRS.ERR_NO_PRIVILEGES;
				}
				communityIds = [Number(scopeComId)];
			}
			if (communityIds.length > 0)
			{
				conditions.push(`IRP_COM_ID IN (${communityIds.toPlaceholders()})`);
				params.push(...communityIds);
			}

			let officerIds = (Array.isArray(this.$officer_user_ids) ? this.$officer_user_ids : []).filter(id => !$Utils.empty(id)).map(String);
			if (officerIds.length > 0)
			{
				conditions.push(`IRP_OFC_USR_ID IN (${officerIds.toPlaceholders()})`);
				params.push(...officerIds);
			}

			if (this.$review_required === true || this.$review_required === false)
			{
				conditions.push("IRP_REVIEW_REQUIRED=?");
				params.push(this.$review_required ? 1 : 0);
			}

			dateColumn = "IRP_SUBMITTED_ON";
			let sortMap = {
				"submitted_on": "IRP_SUBMITTED_ON",
				"created_on": "IRP_CREATED_ON",
				"status": "IRP_STATUS",
				"title": "IRP_TITLE",
				"report_id": "IRP_ID"
			};
			let sortCol = sortMap[this.$sort_by] || sortMap["submitted_on"];
			let sortDir = (this.$sort_dir === "asc") ? "ASC" : "DESC";
			orderBy = `${sortCol} ${sortDir}, IRP_ID DESC`;
		}

		// Status filter (admin / officer)
		let statuses = Array.isArray(this.$statuses) ? this.$statuses.filter(s => !$Utils.empty(s)) : [];
		if (userType !== $Const.USER_TYPE_RESIDENT && statuses.length > 0)
		{
			if (statuses.some(s => !$DataItems.isValidItemId(s, TABLE_REPORT_STATUS)))
			{
				return $ERRS.ERR_REPORT_INVALID_STATUS;
			}
			conditions.push(`IRP_STATUS IN (${statuses.toPlaceholders()})`);
			params.push(...statuses);
		}

		if (!$Utils.empty(this.$category))
		{
			if (!$DataItems.isValidItemId(this.$category, TABLE_REPORT_CATEGORY))
			{
				return $ERRS.ERR_REPORT_TEMPLATE_INVALID_CATEGORY;
			}
			conditions.push("IRP_CATEGORY=?");
			params.push(this.$category);
		}

		if (this.$call_id > 0)
		{
			conditions.push("IRP_SVC_ID=?");
			params.push(this.$call_id);
		}

		if (!$Utils.empty(this.$from_date))
		{
			let fromDate = $Utils.validateDateStr(this.$from_date, true);
			if (!fromDate)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "from_date");
			}
			conditions.push(`${dateColumn} >= ?`);
			params.push(fromDate);
		}

		if (!$Utils.empty(this.$to_date))
		{
			let toDate = $Utils.validateDateStr(this.$to_date, true, true);
			if (!toDate)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "to_date");
			}
			conditions.push(`${dateColumn} <= ?`);
			params.push(toDate);
		}

		if (!$Utils.empty(this.$search_text))
		{
			let term = "%" + this.$search_text + "%";
			if (userType === $Const.USER_TYPE_ADMIN)
			{
				let searchConds = ["IRP_TITLE LIKE ?", "USD_FIRST_NAME LIKE ?", "USD_LAST_NAME LIKE ?", "CONCAT(USD_FIRST_NAME, ' ', USD_LAST_NAME) LIKE ?"];
				params.push(term, term, term, term);
				if (/^\d+$/.test(String(this.$search_text).trim()))
				{
					searchConds.push("IRP_ID=?");
					params.push(Number(this.$search_text));
				}
				conditions.push("(" + searchConds.join(" OR ") + ")");
			}
			else
			{
				conditions.push("IRP_TITLE LIKE ?");
				params.push(term);
			}
		}

		let whereClause = conditions.join(" AND ");
		let fromClause =
			`FROM \`incident_report\`
				 JOIN \`community\` ON IRP_COM_ID = COM_ID
				 JOIN \`report_template\` ON IRP_RPT_ID = RPT_ID
				 JOIN \`user_details\` ON IRP_OFC_USR_ID = USD_USR_ID`;

		let countRows = $Db.executeQuery(`SELECT COUNT(*) total ${fromClause} WHERE ${whereClause}`, params);
		let totalItems = countRows[0].total;

		let pageSize = $Config.get("REPORTS_LIST_PAGE_SIZE");
		let page = parseInt(this.$page) || 0;
		let numOfPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

		if (page < 0 || page >= numOfPages)
		{
			return {...$ERRS.ERR_SUCCESS, reports: [], num_of_items: totalItems, num_of_pages: numOfPages};
		}

		let offset = page * pageSize;

		let rows = $Db.executeQuery(
			`SELECT IRP_ID, IRP_RPT_ID, IRP_SVC_ID, IRP_COM_ID, IRP_OFC_USR_ID, IRP_TITLE, IRP_CATEGORY, IRP_STATUS,
			        IRP_REVIEW_REQUIRED, IRP_REVIEWER_USR_ID, IRP_REVIEW_STARTED_ON,
			        IRP_PDF_FILE_NAME, IRP_SUBMITTED_ON, IRP_DELIVERED_ON, IRP_CREATED_ON, IRP_LAST_UPDATE,
			        COM_NAME, RPT_NAME, USD_FIRST_NAME, USD_LAST_NAME
			 ${fromClause}
			 WHERE ${whereClause}
			 ORDER BY ${orderBy}
			 LIMIT ${pageSize} OFFSET ${offset}`,
			params);

		// Admin queue: reviewer names and active review locks of the page, batched (no per-row queries)
		let reviewerNames = {};
		let activeLocks = {};
		if (userType === $Const.USER_TYPE_ADMIN && rows.length > 0)
		{
			activeLocks = $EntityLock.checkMany(REVIEW_LOCK_TABLE, rows.map(r => r.IRP_ID));
			let userIds = rows.map(r => r.IRP_REVIEWER_USR_ID).concat(Object.values(activeLocks).map(l => l.locked_by));
			reviewerNames = $Funcs.getUserNames([...new Set(userIds.filter(id => !$Utils.empty(id)))]);
		}

		let reports = rows.map(r => {
			let item = {
				report_id: r.IRP_ID,
				title: r.IRP_TITLE,
				community_id: r.IRP_COM_ID,
				community_name: r.COM_NAME,
				category: r.IRP_CATEGORY,
				category_name: $DataItems.getItemName(r.IRP_CATEGORY, TABLE_REPORT_CATEGORY) || r.IRP_CATEGORY,
				call_id: r.IRP_SVC_ID || null,
				created_on: r.IRP_CREATED_ON,
				delivered_on: r.IRP_DELIVERED_ON || null
			};
			if (userType === $Const.USER_TYPE_RESIDENT)
			{
				item.pdf_url = getPdfUrl(r.IRP_PDF_FILE_NAME);
				return item;
			}
			if (userType === $Const.USER_TYPE_ADMIN)
			{
				let lock = activeLocks[r.IRP_ID];
				let isLocked = !!lock && lock.is_locked === true;
				Object.assign(item, {
					reviewer_user_id: r.IRP_REVIEWER_USR_ID || null,
					reviewer_name: r.IRP_REVIEWER_USR_ID ? reviewerNames[r.IRP_REVIEWER_USR_ID] : null,
					review_started_on: r.IRP_REVIEW_STARTED_ON || null,
					review_lock: {
						is_locked: isLocked,
						locked_by: isLocked ? lock.locked_by : null,
						locked_by_name: isLocked ? (reviewerNames[lock.locked_by] || null) : null,
						expires_on: isLocked ? lock.expires_on : null
					}
				});
			}
			return {
				...item,
				template_id: r.IRP_RPT_ID,
				template_name: r.RPT_NAME,
				status: r.IRP_STATUS,
				status_name: $DataItems.getItemName(r.IRP_STATUS, TABLE_REPORT_STATUS) || r.IRP_STATUS,
				officer_user_id: r.IRP_OFC_USR_ID,
				officer_name: ((r.USD_FIRST_NAME || "") + " " + (r.USD_LAST_NAME || "")).trim(),
				review_required: r.IRP_REVIEW_REQUIRED === 1,
				submitted_on: r.IRP_SUBMITTED_ON || null,
				last_update: r.IRP_LAST_UPDATE || null
			};
		});

		return {...$ERRS.ERR_SUCCESS, reports: reports, num_of_items: totalItems, num_of_pages: numOfPages};
	}

	// =========================================================================
	// Get Report
	// =========================================================================

	get_report()
	{
		let userId = this.$Session.userId;
		let userType = this.$Session.userType;

		if (userType === $Const.USER_TYPE_RESIDENT)
		{
			return this.get_report_for_client();
		}

		let record = fetchReportRecord(this.$report_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}

		let mode;
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			if (record.IRP_OFC_USR_ID !== userId)
			{
				return $ERRS.ERR_REPORT_NOT_FOUND;
			}
			mode = "officer";
		}
		else
		{
			if (record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
			{
				return $ERRS.ERR_REPORT_NOT_FOUND;
			}
			if (!canAdminAccessReport(this.$Session, record))
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
			mode = "admin";
		}

		let content = loadReportContent(record);
		return {...$ERRS.ERR_SUCCESS, report: buildReportView(record, content.snapshot, content.state, mode, userId)};
	}

	// =========================================================================
	// Create Report
	// =========================================================================

	create_report()
	{
		let userId = this.$Session.userId;

		let officerComId = $Funcs.getUserCommunityId(userId);
		if (!officerComId)
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		// Template access rules (active + available for the officer's community) are enforced by the template module
		let tplRv = $executeAPI(this.$Session, "ReportTemplate/get_template", {template_id: this.$template_id});
		if ($Err.isERR(tplRv) || tplRv.template.status !== $Const.REPORT_TEMPLATE_STATUS_ACTIVE)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_NOT_FOUND;
		}

		let snapshot = buildSnapshot(tplRv.template);
		if (snapshot.sections.length === 0)
		{
			return $ERRS.ERR_REPORT_TEMPLATE_SECTION_REQUIRED;
		}

		// Incident-linked report: call access rules are enforced by the call module
		let call = null;
		let communityId = officerComId;
		let communityName;
		let clientUserId = null;
		if (this.$call_id > 0)
		{
			let callRv = $executeAPI(this.$Session, "Call/get_call", {call_id: this.$call_id});
			if ($Err.isERR(callRv))
			{
				return $ERRS.ERR_REPORT_INVALID_CALL;
			}
			call = callRv.call;
			communityId = call.community_id;
			communityName = call.community_name || $Funcs.getCommunityName(communityId);
			if (!$Utils.empty(call.resident_user_id) && $Utils.getUserType(call.resident_user_id) === $Const.USER_TYPE_RESIDENT)
			{
				clientUserId = call.resident_user_id;
			}
		}
		else
		{
			communityName = $Funcs.getCommunityName(communityId);
		}

		// Standalone report recipient (Q1): optional resident; empty = community-wide once delivered
		if (!$Utils.empty(this.$client_user_id))
		{
			if (call)
			{
				return $Err.errWithInfo("ERR_INVALID_API_PARAM", "client_user_id is only allowed for standalone reports");
			}
			if (!isValidClientRecipient(this.$client_user_id, communityId))
			{
				return $ERRS.ERR_REPORT_INVALID_CLIENT;
			}
			clientUserId = this.$client_user_id;
		}

		// POI "Report Encounter" (Q3): POI access rules (active + assigned to the officer's community) are enforced by the POI module
		let poi = null;
		let location = null;
		if (this.$poi_id > 0)
		{
			let poiRv = $executeAPI(this.$Session, "Poi/get_poi_record", {record_id: this.$poi_id});
			if ($Err.isERR(poiRv))
			{
				return $ERRS.ERR_REPORT_INVALID_POI;
			}
			poi = poiRv.record;

			let rawLocation = (this.$latitude !== undefined && this.$longitude !== undefined)
				? {latitude: this.$latitude, longitude: this.$longitude}
				: latestLocationOf(userId);
			rawLocation.address = this.$location_address || null;
			let locRv = normalizeFieldValue({label: "location", field_type: $Const.REPORT_FIELD_TYPE_LOCATION, config: null}, rawLocation);
			if (locRv.error)
			{
				return locRv.error;
			}
			location = locRv.value;
		}

		let officerName = $Funcs.getUserName(userId);
		let state = createEmptyState(snapshot);
		applyAutoPopulation(snapshot, state, {call: call, poi: poi, location: location, officerName: officerName, communityName: communityName});

		// Optional initial values (keyed by template section id)
		let changes = [];
		if (Array.isArray(this.$sections) && this.$sections.length > 0)
		{
			let updates = this.$sections.map(s => ({sectionId: Number((s || {}).section_id), values: (s || {}).values}));
			let applied = applySectionUpdates(snapshot, state, updates, false);
			if (applied.error)
			{
				return applied.error;
			}
			changes = applied.changes;
		}

		let now = $Utils.now();
		let title = buildReportTitle(snapshot, state, {
			date: now,
			communityName: communityName,
			officerName: officerName,
			fallbackIncidentType: call ? getCallTypeName(call) : (poi ? (poi.record_type_name || poi.record_type) : "")
		});

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`incident_report\`
			 (IRP_RPT_ID, IRP_SVC_ID, IRP_POI_ID, IRP_COM_ID, IRP_OFC_USR_ID, IRP_CLIENT_USR_ID, IRP_TITLE, IRP_CATEGORY, IRP_STATUS,
			  IRP_REVIEW_REQUIRED, IRP_ALLOW_OFFICER_EDITING, IRP_CONTENT_SNAPSHOT, IRP_CREATED_ON, IRP_LAST_UPDATE)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?)`,
			[snapshot.template_id, call ? call.call_id : null, poi ? poi.record_id : null, communityId, userId, clientUserId, title, snapshot.category,
			 $Const.REPORT_STATUS_DRAFT, snapshot.review_before_client ? 1 : 0, snapshot.allow_officer_editing ? 1 : 0,
			 JSON.stringify(snapshot), now, now]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		let reportId = $Db.insertId();

		let err = insertSections(reportId, snapshot, state, now);
		if (!err)
		{
			err = insertPendingAttachments(reportId, state, Object.keys(state.sections), userId, now);
		}
		if (!err)
		{
			err = insertHistory(reportId, [{action: $Const.REPORT_HISTORY_ACTION_CREATED, to: $Const.REPORT_STATUS_DRAFT, userId: userId,
				changes: changes.length > 0 ? changes : null}], now);
		}
		if (err)
		{
			$Db.rollbackTransaction();
			return err;
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, report_id: reportId, title: title};
	}

	// =========================================================================
	// Update Report
	// =========================================================================

	update_report()
	{
		let userId = this.$Session.userId;
		let isAdmin = this.$Session.userType === $Const.USER_TYPE_ADMIN;

		let record = fetchReportRecord(this.$report_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}

		if (isAdmin)
		{
			if (record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
			{
				return $ERRS.ERR_REPORT_NOT_FOUND;
			}
			if (!canAdminAccessReport(this.$Session, record))
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
			if (record.IRP_STATUS !== $Const.REPORT_STATUS_UNDER_REVIEW)
			{
				return $ERRS.ERR_REPORT_CANNOT_EDIT;
			}
			// Reviewer must hold the review lock (acquired/refreshed before the transaction)
			if (!holdsReviewLock(record, userId))
			{
				return $ERRS.ERR_REPORT_NOT_UNDER_REVIEW_BY_USER;
			}
		}
		else
		{
			if (record.IRP_OFC_USR_ID !== userId)
			{
				return $ERRS.ERR_REPORT_NOT_FOUND;
			}
			if (!isOfficerEditable(record))
			{
				return $ERRS.ERR_REPORT_CANNOT_EDIT;
			}
		}

		if (!Array.isArray(this.$sections) || this.$sections.length === 0)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "sections");
		}

		let content = loadReportContent(record);
		let irsToSection = {};
		for (let i = 0; i < content.sectionRows.length; i++)
		{
			irsToSection[content.sectionRows[i].IRS_ID] = content.sectionRows[i].IRS_RTS_ID;
		}

		let updates = [];
		for (let i = 0; i < this.$sections.length; i++)
		{
			let s = this.$sections[i] || {};
			let sectionId = irsToSection[Number(s.report_section_id)];
			if (sectionId === undefined)
			{
				return $ERRS.ERR_REPORT_INVALID_SECTION;
			}
			updates.push({sectionId: sectionId, values: s.values, manager_notes: s.manager_notes, client_included: s.client_included});
		}

		let applied = applySectionUpdates(content.snapshot, content.state, updates, isAdmin);
		if (applied.error)
		{
			return applied.error;
		}
		if (applied.changes.length === 0)
		{
			return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, title: record.IRP_TITLE, changed: false};
		}

		// Officer edits may change {incident_type} in the title
		let title = record.IRP_TITLE;
		if (!isAdmin)
		{
			title = buildReportTitle(content.snapshot, content.state, {
				date: record.IRP_CREATED_ON,
				communityName: record.COM_NAME,
				officerName: $Funcs.getUserName(record.IRP_OFC_USR_ID),
				fallbackIncidentType: ""
			});
		}

		let now = $Utils.now();

		$Db.beginTransaction();

		// Conditional on the status read above - a concurrent transition (e.g. start_review) aborts the edit
		let err = null;
		$Db.executeQuery(
			`UPDATE \`incident_report\` SET IRP_TITLE=?, IRP_LAST_UPDATE=?
			 WHERE IRP_ID=? AND IRP_STATUS=? AND IRP_DELETED_ON IS NULL`,
			[title, now, record.IRP_ID, record.IRP_STATUS]);
		if ($Db.isError())
		{
			err = $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}
		else if ($Db.affectedRows() === 0)
		{
			err = $ERRS.ERR_REPORT_CANNOT_EDIT;
		}
		if (!err)
		{
			err = bulkUpdateSections(record.IRP_ID, content.state, applied.changedSections, now);
		}
		if (!err)
		{
			err = softDeleteAttachments(record.IRP_ID, applied.toRemove, now);
		}
		if (!err)
		{
			err = insertPendingAttachments(record.IRP_ID, content.state, applied.changedSections, userId, now);
		}
		// Edits after submission are tracked in the audit trail (original officer values are kept in IRS_SUBMITTED_VALUES)
		if (!err && record.IRP_STATUS !== $Const.REPORT_STATUS_DRAFT)
		{
			err = insertHistory(record.IRP_ID, [{action: $Const.REPORT_HISTORY_ACTION_UPDATED, from: record.IRP_STATUS, to: record.IRP_STATUS,
				userId: userId, changes: applied.changes}], now);
		}
		if (err)
		{
			$Db.rollbackTransaction();
			return err;
		}

		$Db.commitTransaction();

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, title: title, changed: true};
	}

	// =========================================================================
	// Submit Report
	// =========================================================================

	submit_report()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_OFC_USR_ID !== userId)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}

		let fromStatus = record.IRP_STATUS;
		if (![$Const.REPORT_STATUS_DRAFT, $Const.REPORT_STATUS_CHANGES_REQUESTED].includes(fromStatus))
		{
			return $ERRS.ERR_REPORT_CANNOT_SUBMIT;
		}

		let content = loadReportContent(record);
		let missing = getMissingRequiredFields(content.snapshot, content.state);
		if (missing.length > 0)
		{
			return {...$ERRS.ERR_REPORT_REQUIRED_FIELDS_MISSING, missing_fields: missing};
		}

		// Next status: review not required -> approved; resubmission after changes -> back to the same reviewer; otherwise -> submitted
		let toStatus = $Const.REPORT_STATUS_SUBMITTED;
		let reviewerId = null;
		if (record.IRP_REVIEW_REQUIRED !== 1)
		{
			toStatus = $Const.REPORT_STATUS_APPROVED;
		}
		else if (fromStatus === $Const.REPORT_STATUS_CHANGES_REQUESTED && !$Utils.empty(record.IRP_REVIEWER_USR_ID))
		{
			let lock = $EntityLock.acquire(REVIEW_LOCK_TABLE, record.IRP_ID, record.IRP_REVIEWER_USR_ID);
			if (lock.acquired)
			{
				toStatus = $Const.REPORT_STATUS_UNDER_REVIEW;
				reviewerId = record.IRP_REVIEWER_USR_ID;
			}
		}

		let now = $Utils.now();
		let history = [{action: $Const.REPORT_HISTORY_ACTION_SUBMITTED, from: fromStatus,
			to: toStatus === $Const.REPORT_STATUS_APPROVED ? $Const.REPORT_STATUS_SUBMITTED : toStatus, userId: userId}];
		if (toStatus === $Const.REPORT_STATUS_APPROVED)
		{
			history.push({action: $Const.REPORT_HISTORY_ACTION_AUTO_APPROVED, from: $Const.REPORT_STATUS_SUBMITTED, to: toStatus, userId: null});
		}

		let err = commitStatusTransition(record, fromStatus,
			`IRP_STATUS=?, IRP_SUBMITTED_ON=?, IRP_CHANGES_COMMENT=NULL, IRP_REVIEWER_USR_ID=?, IRP_REVIEW_STARTED_ON=?,
			 IRP_APPROVED_ON=?, IRP_APPROVED_BY=NULL`,
			[toStatus, now, reviewerId, reviewerId ? now : null, toStatus === $Const.REPORT_STATUS_APPROVED ? now : null],
			history,
			$ERRS.ERR_REPORT_CANNOT_SUBMIT,
			() => {
				// Retain the officer-submitted values for the review audit trail
				$Db.executeQuery(
					`UPDATE \`incident_report_section\` SET IRS_SUBMITTED_VALUES = IRS_VALUES
					 WHERE IRS_IRP_ID=? AND IRS_DELETED_ON IS NULL`,
					[record.IRP_ID]);
				return $Db.isError() ? $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg()) : null;
			});
		if (err)
		{
			if (reviewerId)
			{
				$EntityLock.release(REVIEW_LOCK_TABLE, record.IRP_ID, reviewerId);
			}
			return err;
		}

		let officerName = $Funcs.getUserName(userId);
		let recipients = reviewerId ? [reviewerId] : getResponsibleManagerIds(record.IRP_COM_ID);
		sendReportNotification(this.$Session, "report_submitted", record,
			{report_number: String(record.IRP_ID), officer_name: officerName}, recipients);

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: toStatus};
	}

	// =========================================================================
	// Start Review
	// =========================================================================

	start_review()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (!canAdminAccessReport(this.$Session, record))
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}

		let fromStatus = record.IRP_STATUS;
		if (![$Const.REPORT_STATUS_SUBMITTED, $Const.REPORT_STATUS_UNDER_REVIEW].includes(fromStatus))
		{
			return $ERRS.ERR_REPORT_CANNOT_REVIEW;
		}

		// Atomic lock acquisition (expired locks are taken over)
		let lock = $EntityLock.acquire(REVIEW_LOCK_TABLE, record.IRP_ID, userId);
		if (!lock.acquired)
		{
			return {...$ERRS.ERR_REPORT_LOCKED, locked_by: lock.locked_by, locked_by_name: $Funcs.getUserName(lock.locked_by), expires_on: lock.expires_on};
		}

		// Already reviewing - lock refreshed
		if (fromStatus === $Const.REPORT_STATUS_UNDER_REVIEW && record.IRP_REVIEWER_USR_ID === userId)
		{
			return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: fromStatus, expires_on: lock.expires_on};
		}

		let previousReviewer = record.IRP_REVIEWER_USR_ID;
		let err = commitStatusTransition(record, fromStatus,
			"IRP_STATUS=?, IRP_REVIEWER_USR_ID=?, IRP_REVIEW_STARTED_ON=?",
			[$Const.REPORT_STATUS_UNDER_REVIEW, userId, $Utils.now()],
			[{action: $Const.REPORT_HISTORY_ACTION_REVIEW_STARTED, from: fromStatus, to: $Const.REPORT_STATUS_UNDER_REVIEW, userId: userId,
				comment: (fromStatus === $Const.REPORT_STATUS_UNDER_REVIEW && previousReviewer) ? "Review taken over from " + $Funcs.getUserName(previousReviewer) + " (lock expired)" : null}],
			$ERRS.ERR_REPORT_CANNOT_REVIEW);
		if (err)
		{
			$EntityLock.release(REVIEW_LOCK_TABLE, record.IRP_ID, userId);
			return err;
		}

		if (fromStatus === $Const.REPORT_STATUS_SUBMITTED)
		{
			sendReportNotification(this.$Session, "report_under_review", record,
				{report_number: String(record.IRP_ID), reviewer_name: $Funcs.getUserName(userId)}, [record.IRP_OFC_USR_ID]);
		}

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: $Const.REPORT_STATUS_UNDER_REVIEW, expires_on: lock.expires_on};
	}

	// =========================================================================
	// Release Review
	// =========================================================================

	release_review()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (!canAdminAccessReport(this.$Session, record))
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}
		if (record.IRP_STATUS !== $Const.REPORT_STATUS_UNDER_REVIEW)
		{
			return $ERRS.ERR_REPORT_CANNOT_REVIEW;
		}
		if (record.IRP_REVIEWER_USR_ID !== userId)
		{
			return $ERRS.ERR_REPORT_NOT_UNDER_REVIEW_BY_USER;
		}

		let err = commitStatusTransition(record, $Const.REPORT_STATUS_UNDER_REVIEW,
			"IRP_STATUS=?, IRP_REVIEWER_USR_ID=NULL, IRP_REVIEW_STARTED_ON=NULL",
			[$Const.REPORT_STATUS_SUBMITTED],
			[{action: $Const.REPORT_HISTORY_ACTION_REVIEW_RELEASED, from: $Const.REPORT_STATUS_UNDER_REVIEW, to: $Const.REPORT_STATUS_SUBMITTED, userId: userId}],
			$ERRS.ERR_REPORT_CANNOT_REVIEW);
		if (err)
		{
			return err;
		}

		$EntityLock.release(REVIEW_LOCK_TABLE, record.IRP_ID, userId);

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: $Const.REPORT_STATUS_SUBMITTED};
	}

	// =========================================================================
	// Approve Report
	// =========================================================================

	approve_report()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (!canAdminAccessReport(this.$Session, record))
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}
		if (record.IRP_STATUS !== $Const.REPORT_STATUS_UNDER_REVIEW)
		{
			return $ERRS.ERR_REPORT_CANNOT_APPROVE;
		}

		let summary = $Utils.empty(this.$management_summary) ? null : String(this.$management_summary).trim();
		if (summary && summary.length > MAX_MANAGEMENT_SUMMARY_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "management_summary exceeds " + MAX_MANAGEMENT_SUMMARY_LENGTH + " characters");
		}

		// Section inclusion checklist (validated against the report sections before the transaction)
		let includedIds = null;
		let excludedIds = [];
		if (Array.isArray(this.$included_section_ids))
		{
			let sectionIds = getReportSections(record.IRP_ID).map(s => s.IRS_ID);
			includedIds = [...new Set(this.$included_section_ids.map(Number))];
			if (includedIds.some(id => !sectionIds.includes(id)))
			{
				return $ERRS.ERR_REPORT_INVALID_SECTION;
			}
			excludedIds = sectionIds.filter(id => !includedIds.includes(id));
		}

		if (!holdsReviewLock(record, userId))
		{
			return $ERRS.ERR_REPORT_NOT_UNDER_REVIEW_BY_USER;
		}

		let now = $Utils.now();
		let err = commitStatusTransition(record, $Const.REPORT_STATUS_UNDER_REVIEW,
			"IRP_STATUS=?, IRP_APPROVED_ON=?, IRP_APPROVED_BY=?, IRP_MANAGEMENT_SUMMARY=?",
			[$Const.REPORT_STATUS_APPROVED, now, userId, summary],
			[{action: $Const.REPORT_HISTORY_ACTION_APPROVED, from: $Const.REPORT_STATUS_UNDER_REVIEW, to: $Const.REPORT_STATUS_APPROVED, userId: userId,
				changes: includedIds ? {included_section_ids: includedIds, excluded_section_ids: excludedIds} : null}],
			$ERRS.ERR_REPORT_CANNOT_APPROVE,
			(ts) => {
				if (includedIds && includedIds.length > 0)
				{
					$Db.executeQuery(
						`UPDATE \`incident_report_section\` SET IRS_CLIENT_INCLUDED=1, IRS_LAST_UPDATE=?
						 WHERE IRS_IRP_ID=? AND IRS_ID IN (${includedIds.toPlaceholders()})`,
						[ts, record.IRP_ID, ...includedIds]);
					if ($Db.isError())
					{
						return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
					}
				}
				if (excludedIds.length > 0)
				{
					$Db.executeQuery(
						`UPDATE \`incident_report_section\` SET IRS_CLIENT_INCLUDED=0, IRS_LAST_UPDATE=?
						 WHERE IRS_IRP_ID=? AND IRS_ID IN (${excludedIds.toPlaceholders()})`,
						[ts, record.IRP_ID, ...excludedIds]);
					if ($Db.isError())
					{
						return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
					}
				}
				return null;
			});
		if (err)
		{
			return err;
		}

		$EntityLock.release(REVIEW_LOCK_TABLE, record.IRP_ID, userId);

		sendReportNotification(this.$Session, "report_approved", record, {report_number: String(record.IRP_ID)}, [record.IRP_OFC_USR_ID]);

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: $Const.REPORT_STATUS_APPROVED};
	}

	// =========================================================================
	// Request Changes
	// =========================================================================

	request_changes()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (!canAdminAccessReport(this.$Session, record))
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}
		if (record.IRP_STATUS !== $Const.REPORT_STATUS_UNDER_REVIEW)
		{
			return $ERRS.ERR_REPORT_CANNOT_REQUEST_CHANGES;
		}

		let comments = $Utils.empty(this.$comments) ? "" : String(this.$comments).trim();
		if (comments.length === 0)
		{
			return $ERRS.ERR_REPORT_CHANGES_COMMENT_REQUIRED;
		}
		if (comments.length > MAX_CHANGES_COMMENT_LENGTH)
		{
			return $Err.errWithInfo("ERR_INVALID_API_PARAM", "comments exceed " + MAX_CHANGES_COMMENT_LENGTH + " characters");
		}

		if (!holdsReviewLock(record, userId))
		{
			return $ERRS.ERR_REPORT_NOT_UNDER_REVIEW_BY_USER;
		}

		// The reviewer is kept so that the resubmitted report returns to the same manager
		let err = commitStatusTransition(record, $Const.REPORT_STATUS_UNDER_REVIEW,
			"IRP_STATUS=?, IRP_CHANGES_COMMENT=?",
			[$Const.REPORT_STATUS_CHANGES_REQUESTED, comments],
			[{action: $Const.REPORT_HISTORY_ACTION_CHANGES_REQUESTED, from: $Const.REPORT_STATUS_UNDER_REVIEW, to: $Const.REPORT_STATUS_CHANGES_REQUESTED,
				userId: userId, comment: comments}],
			$ERRS.ERR_REPORT_CANNOT_REQUEST_CHANGES);
		if (err)
		{
			return err;
		}

		$EntityLock.release(REVIEW_LOCK_TABLE, record.IRP_ID, userId);

		sendReportNotification(this.$Session, "report_changes_requested", record, {report_number: String(record.IRP_ID)},
			[record.IRP_OFC_USR_ID], "Changes requested on report " + record.IRP_ID + ": " + comments);

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: $Const.REPORT_STATUS_CHANGES_REQUESTED};
	}

	// =========================================================================
	// Deliver Report
	// =========================================================================

	deliver_report()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (!canAdminAccessReport(this.$Session, record))
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}
		if (record.IRP_STATUS !== $Const.REPORT_STATUS_APPROVED)
		{
			return $ERRS.ERR_REPORT_CANNOT_DELIVER;
		}

		// Generate the formatted client PDF before changing the status
		let now = $Utils.now();
		let officerName = $Funcs.getUserName(record.IRP_OFC_USR_ID);
		let pdf = generateClientPdf(record, userId, officerName, now);
		if (pdf.error)
		{
			return pdf.error;
		}

		let err = commitStatusTransition(record, $Const.REPORT_STATUS_APPROVED,
			"IRP_STATUS=?, IRP_DELIVERED_ON=?, IRP_DELIVERED_BY=?, IRP_PDF_FILE_NAME=?",
			[$Const.REPORT_STATUS_DELIVERED, now, userId, pdf.fileName],
			[{action: $Const.REPORT_HISTORY_ACTION_DELIVERED, from: $Const.REPORT_STATUS_APPROVED, to: $Const.REPORT_STATUS_DELIVERED, userId: userId}],
			$ERRS.ERR_REPORT_CANNOT_DELIVER);
		if (err)
		{
			return err;
		}

		sendReportNotification(this.$Session, "report_delivered", record, {report_number: String(record.IRP_ID)}, [record.IRP_OFC_USR_ID]);
		if (!$Utils.empty(record.IRP_CLIENT_USR_ID))
		{
			sendReportNotification(this.$Session, "new_incident_report", record,
				{report_number: String(record.IRP_ID), officer_name: officerName}, [record.IRP_CLIENT_USR_ID]);
		}

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, status: $Const.REPORT_STATUS_DELIVERED, pdf_url: getPdfUrl(pdf.fileName)};
	}

	// =========================================================================
	// Export Report PDF
	// =========================================================================

	export_report_pdf()
	{
		let userId = this.$Session.userId;
		let isAdmin = this.$Session.userType === $Const.USER_TYPE_ADMIN;

		let record = fetchReportRecord(this.$report_id);
		if (!record)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (isAdmin)
		{
			if (record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
			{
				return $ERRS.ERR_REPORT_NOT_FOUND;
			}
			if (!canAdminAccessReport(this.$Session, record))
			{
				return $ERRS.ERR_NO_PRIVILEGES;
			}
		}
		else if (!canResidentAccessReport(record, userId))
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (record.IRP_STATUS !== $Const.REPORT_STATUS_DELIVERED)
		{
			return $ERRS.ERR_REPORT_CANNOT_EXPORT;
		}

		// Regeneration (admin only): on request, or when the delivered PDF reference is missing
		let regenerate = isAdmin && (this.$regenerate === true || $Utils.empty(record.IRP_PDF_FILE_NAME));
		if (!regenerate)
		{
			if ($Utils.empty(record.IRP_PDF_FILE_NAME))
			{
				return $ERRS.ERR_REPORT_CANNOT_EXPORT;
			}
			return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, pdf_url: getPdfUrl(record.IRP_PDF_FILE_NAME), regenerated: false};
		}

		// Re-rendered from the frozen snapshot with the original delivery date
		let pdf = generateClientPdf(record, userId, $Funcs.getUserName(record.IRP_OFC_USR_ID), record.IRP_DELIVERED_ON);
		if (pdf.error)
		{
			return pdf.error;
		}

		let err = commitStatusTransition(record, $Const.REPORT_STATUS_DELIVERED,
			"IRP_PDF_FILE_NAME=?",
			[pdf.fileName],
			[{action: $Const.REPORT_HISTORY_ACTION_PDF_REGENERATED, from: $Const.REPORT_STATUS_DELIVERED, to: $Const.REPORT_STATUS_DELIVERED, userId: userId}],
			$ERRS.ERR_REPORT_CANNOT_EXPORT);
		if (err)
		{
			return err;
		}

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, pdf_url: getPdfUrl(pdf.fileName), regenerated: true};
	}

	// =========================================================================
	// Get Report History
	// =========================================================================

	get_report_history()
	{
		let record = fetchReportRecord(this.$report_id);
		if (!record || record.IRP_STATUS === $Const.REPORT_STATUS_DRAFT)
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}
		if (!canAdminAccessReport(this.$Session, record))
		{
			return $ERRS.ERR_NO_PRIVILEGES;
		}

		return {...$ERRS.ERR_SUCCESS, report_id: record.IRP_ID, history: mapHistory(getReportHistory(record.IRP_ID))};
	}

	// =========================================================================
	// Get Report For Client
	// =========================================================================

	get_report_for_client()
	{
		let userId = this.$Session.userId;

		let record = fetchReportRecord(this.$report_id);
		if (!record || !canResidentAccessReport(record, userId))
		{
			return $ERRS.ERR_REPORT_NOT_FOUND;
		}

		let content = loadReportContent(record);
		return {...$ERRS.ERR_SUCCESS, report: buildReportView(record, content.snapshot, content.state, "client", userId)};
	}

	// =========================================================================
	// Get Report Metadata
	// =========================================================================

	get_report_metadata()
	{
		return {
			...$ERRS.ERR_SUCCESS,
			statuses: $DataItems.getList(TABLE_REPORT_STATUS),
			categories: $DataItems.getList(TABLE_REPORT_CATEGORY),
			history_actions: $DataItems.getList(TABLE_REPORT_HISTORY_ACTION)
		};
	}
};
