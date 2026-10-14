// =========================================================================
// Constants
// =========================================================================

const TABLE_CALL_CATEGORY = "call_category";
const TABLE_CALL_STATUS = "call_status";
const TABLE_TASK_STATUS = "task_status";
const TABLE_TASK_TYPE = "task_type";
const TABLE_TASK_PRIORITY = "task_priority";
const TABLE_REPORT_STATUS = "report_status";


// =========================================================================
// Helpers
// =========================================================================

function buildCommunityCondition(tablePrefixCol, communityId, conditions, params)
{
	if (communityId > 0)
	{
		conditions.push(`${tablePrefixCol} = ?`);
		params.push(communityId);
	}
}

function buildDateRangeConditions(dateCol, fromDate, toDate, conditions, params)
{
	if (fromDate)
	{
		conditions.push(`${dateCol} >= ?`);
		params.push(fromDate + " 00:00:00");
	}
	if (toDate)
	{
		conditions.push(`${dateCol} <= ?`);
		params.push(toDate + " 23:59:59");
	}
}

function buildOpenStatusCondition(statusCol, tableName, conditions, params)
{
	let openStatuses = $Funcs.getDataItemIdsByAttr(tableName, "is_open", true);
	conditions.push(`${statusCol} IN (${openStatuses.toPlaceholders()})`);
	params.push(...openStatuses);
}

function buildPriorityOrderSql(col)
{
	let sql = `CASE
		WHEN ${col} = ? THEN 1
		WHEN ${col} = ? THEN 2
		WHEN ${col} = ? THEN 3
		WHEN ${col} = ? THEN 4
		ELSE 5
	END`;
	let params = [
		$Const.TASK_PRIORITY_URGENT,
		$Const.TASK_PRIORITY_IMPORTANT,
		$Const.TASK_PRIORITY_NORMAL,
		$Const.TASK_PRIORITY_LOW
	];
	return { sql, params };
}

function mapRecentCallRow(row)
{
	return {
		call_id:			row.SVC_ID,
		category:			row.SVC_CATEGORY,
		service_type:		row.SVC_SERVICE_TYPE || "",
		status:				row.SVC_STATUS,
		priority:			row.SVC_PRIORITY,
		description:		row.SVC_DESCRIPTION || "",
		resident_name:		((row.RES_FIRST || "") + " " + (row.RES_LAST || "")).trim(),
		officer_name:		row.OFC_FIRST ? ((row.OFC_FIRST || "") + " " + (row.OFC_LAST || "")).trim() : "",
		community_name:		row.COM_NAME || "",
		created_on:			row.SVC_CREATED_ON,
	};
}

function mapRecentTaskRow(row)
{
	return {
		task_id:			row.TSK_ID,
		title:				$DataItems.getItemName(row.TSK_TYPE, TABLE_TASK_TYPE) || row.TSK_TYPE,
		type:				row.TSK_TYPE,
		status:				row.TSK_STATUS,
		priority:			row.TSK_PRIORITY,
		description:		row.TSK_DESCRIPTION || "",
		creator_name:		((row.CRE_FIRST || "") + " " + (row.CRE_LAST || "")).trim(),
		assignee_name:		((row.ASN_FIRST || "") + " " + (row.ASN_LAST || "")).trim(),
		community_name:		row.COM_NAME || "",
		created_on:			row.TSK_CREATED_ON,
	};
}

function mapRecentReportRow(row)
{
	return {
		report_id:			row.IRP_ID,
		title:				row.IRP_TITLE,
		category:			row.IRP_CATEGORY,
		status:				row.IRP_STATUS,
		officer_name:		((row.OFC_FIRST || "") + " " + (row.OFC_LAST || "")).trim(),
		community_name:		row.COM_NAME || "",
		created_on:			row.IRP_CREATED_ON,
	};
}


// =========================================================================
// Module
// =========================================================================

module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
		$DataItems.define(TABLE_CALL_CATEGORY);
		$DataItems.define(TABLE_CALL_STATUS);
		$DataItems.define(TABLE_TASK_STATUS);
		$DataItems.define(TABLE_TASK_TYPE);
		$DataItems.define(TABLE_TASK_PRIORITY);
		$DataItems.define(TABLE_REPORT_STATUS);
	}


	// =====================================================================
	// get_overview — aggregate counts + recent items for homepage cards
	// =====================================================================

	get_overview()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let communityId = parseInt(this.$community_id) || 0;

		// --- Active calls count -----------------------------------------------
		let callConditions = ["SVC_DELETED_ON IS NULL"];
		let callParams = [];
		buildOpenStatusCondition("SVC_STATUS", TABLE_CALL_STATUS, callConditions, callParams);
		buildCommunityCondition("SVC_COM_ID", communityId, callConditions, callParams);

		let callCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`service_call\`
			 WHERE ${callConditions.join(" AND ")}`,
			callParams);
		vals.active_calls_count = callCountRows[0].total;

		// --- Open tasks count -------------------------------------------------
		let taskConditions = ["TSK_DELETED_ON IS NULL"];
		let taskParams = [];
		buildOpenStatusCondition("TSK_STATUS", TABLE_TASK_STATUS, taskConditions, taskParams);
		buildCommunityCondition("TSK_COM_ID", communityId, taskConditions, taskParams);

		let taskCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`task\`
			 WHERE ${taskConditions.join(" AND ")}`,
			taskParams);
		vals.open_tasks_count = taskCountRows[0].total;

		// --- Open reports count -----------------------------------------------
		let reportConditions = ["IRP_DELETED_ON IS NULL"];
		let reportParams = [];
		buildOpenStatusCondition("IRP_STATUS", TABLE_REPORT_STATUS, reportConditions, reportParams);
		buildCommunityCondition("IRP_COM_ID", communityId, reportConditions, reportParams);

		let reportCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`incident_report\`
			 WHERE ${reportConditions.join(" AND ")}`,
			reportParams);
		vals.open_reports_count = reportCountRows[0].total;

		// --- Active communities count -----------------------------------------
		let comConditions = ["COM_IS_ACTIVE = 1", "COM_DELETED_ON IS NULL"];
		let comParams = [];
		if (communityId > 0)
		{
			comConditions.push("COM_ID = ?");
			comParams.push(communityId);
		}

		let comCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`community\`
			 WHERE ${comConditions.join(" AND ")}`,
			comParams);
		vals.active_communities_count = comCountRows[0].total;

		// --- Active officers count --------------------------------------------
		let ofcConditions = [
			"OFC_DELETED_ON IS NULL",
			"USD_DELETED_ON IS NULL",
			"USD_STATUS = 1"
		];
		let ofcParams = [];
		if (communityId > 0)
		{
			ofcConditions.push("USD_COM_ID = ?");
			ofcParams.push(communityId);
		}

		let ofcCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`officer\`
				JOIN \`user_details\` ON OFC_USR_ID = USD_USR_ID
			 WHERE ${ofcConditions.join(" AND ")}`,
			ofcParams);
		vals.active_officers_count = ofcCountRows[0].total;

		// --- 5 recent open calls ----------------------------------------------
		let recentCallConditions = ["SVC_DELETED_ON IS NULL"];
		let recentCallParams = [];
		buildOpenStatusCondition("SVC_STATUS", TABLE_CALL_STATUS, recentCallConditions, recentCallParams);
		buildCommunityCondition("SVC_COM_ID", communityId, recentCallConditions, recentCallParams);

		let recentCallRows = $Db.executeQuery(
			`SELECT service_call.SVC_ID, SVC_CATEGORY, SVC_SERVICE_TYPE, SVC_STATUS,
					SVC_PRIORITY, SVC_DESCRIPTION, SVC_CREATED_ON,
					res_ud.USD_FIRST_NAME RES_FIRST, res_ud.USD_LAST_NAME RES_LAST,
					ofc_ud.USD_FIRST_NAME OFC_FIRST, ofc_ud.USD_LAST_NAME OFC_LAST,
					community.COM_NAME
			 FROM \`service_call\`
				JOIN \`user_details\` res_ud ON SVC_RES_USR_ID = res_ud.USD_USR_ID
				LEFT OUTER JOIN \`user_details\` ofc_ud ON SVC_OFC_USR_ID = ofc_ud.USD_USR_ID
				LEFT OUTER JOIN \`community\` ON SVC_COM_ID = COM_ID
			 WHERE ${recentCallConditions.join(" AND ")}
			 ORDER BY SVC_CREATED_ON DESC
			 LIMIT 5`,
			recentCallParams);
		vals.recent_calls = recentCallRows.map(mapRecentCallRow);

		// --- 5 recent open tasks (sorted by priority) -------------------------
		let recentTaskConditions = ["TSK_DELETED_ON IS NULL"];
		let recentTaskParams = [];
		buildOpenStatusCondition("TSK_STATUS", TABLE_TASK_STATUS, recentTaskConditions, recentTaskParams);
		buildCommunityCondition("TSK_COM_ID", communityId, recentTaskConditions, recentTaskParams);

		let priorityOrder = buildPriorityOrderSql("TSK_PRIORITY");
		let recentTaskRows = $Db.executeQuery(
			`SELECT task.TSK_ID, TSK_TYPE, TSK_STATUS, TSK_PRIORITY, TSK_DESCRIPTION, TSK_CREATED_ON,
					cre_ud.USD_FIRST_NAME CRE_FIRST, cre_ud.USD_LAST_NAME CRE_LAST,
					asn_ud.USD_FIRST_NAME ASN_FIRST, asn_ud.USD_LAST_NAME ASN_LAST,
					community.COM_NAME
			 FROM \`task\`
				JOIN \`user_details\` cre_ud ON TSK_CREATED_BY = cre_ud.USD_USR_ID
				JOIN \`user_details\` asn_ud ON TSK_ASSIGNED_TO = asn_ud.USD_USR_ID
				LEFT OUTER JOIN \`community\` ON TSK_COM_ID = COM_ID
			 WHERE ${recentTaskConditions.join(" AND ")}
			 ORDER BY ${priorityOrder.sql}, TSK_CREATED_ON DESC
			 LIMIT 5`,
			[...recentTaskParams, ...priorityOrder.params]);
		vals.recent_tasks = recentTaskRows.map(mapRecentTaskRow);

		// --- 5 recent open reports --------------------------------------------
		let recentReportConditions = ["IRP_DELETED_ON IS NULL"];
		let recentReportParams = [];
		buildOpenStatusCondition("IRP_STATUS", TABLE_REPORT_STATUS, recentReportConditions, recentReportParams);
		buildCommunityCondition("IRP_COM_ID", communityId, recentReportConditions, recentReportParams);

		let recentReportRows = $Db.executeQuery(
			`SELECT incident_report.IRP_ID, IRP_TITLE, IRP_CATEGORY, IRP_STATUS, IRP_CREATED_ON,
					ofc_ud.USD_FIRST_NAME OFC_FIRST, ofc_ud.USD_LAST_NAME OFC_LAST,
					community.COM_NAME
			 FROM \`incident_report\`
				JOIN \`user_details\` ofc_ud ON IRP_OFC_USR_ID = ofc_ud.USD_USR_ID
				LEFT OUTER JOIN \`community\` ON IRP_COM_ID = COM_ID
			 WHERE ${recentReportConditions.join(" AND ")}
			 ORDER BY IRP_CREATED_ON DESC
			 LIMIT 5`,
			recentReportParams);
		vals.recent_reports = recentReportRows.map(mapRecentReportRow);

		return { ...rc, ...vals };
	}


	// =====================================================================
	// get_calls_statistics — detailed call stats with filters (SDS 4.5.1.1)
	// =====================================================================

	get_calls_statistics()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let communityId = parseInt(this.$community_id) || 0;
		let fromDate = this.$from_date || new $Date().addDays(-30).format("Y-m-d");
		let toDate = this.$to_date || new $Date().format("Y-m-d");

		// --- Base conditions --------------------------------------------------
		let baseConditions = ["SVC_DELETED_ON IS NULL"];
		let baseParams = [];
		buildCommunityCondition("SVC_COM_ID", communityId, baseConditions, baseParams);
		buildDateRangeConditions("SVC_CREATED_ON", fromDate, toDate, baseConditions, baseParams);

		let baseWhere = baseConditions.join(" AND ");

		// --- Total calls + breakdown by category and status (single query) ----
		let caseParams = [
			$Const.CALL_CATEGORY_MEDICAL_EMERGENCY,
			$Const.CALL_CATEGORY_SECURITY_EMERGENCY,
			$Const.CALL_CATEGORY_CONCIERGE_SERVICE,
			$Const.CALL_CATEGORY_PANIC,
			$Const.CALL_CATEGORY_TEST,
			$Const.CALL_CATEGORY_MEDICAL_EMERGENCY, $Const.CALL_CATEGORY_SECURITY_EMERGENCY,
			$Const.CALL_STATUS_NEW,
			$Const.CALL_STATUS_ACCEPTED,
			$Const.CALL_STATUS_RESOLVED,
			$Const.CALL_STATUS_CANCELED,
			$Const.CALL_STATUS_CANCELED, $Const.CALL_CATEGORY_MEDICAL_EMERGENCY, $Const.CALL_CATEGORY_SECURITY_EMERGENCY,
			$Const.CALL_STATUS_CANCELED, $Const.CALL_CATEGORY_CONCIERGE_SERVICE,
		];

		let aggRows = $Db.executeQuery(
			`SELECT
				COUNT(*) total_calls,
				SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) medical_emergency_count,
				SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) security_emergency_count,
				SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) concierge_service_count,
				SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) panic_count,
				SUM(CASE WHEN SVC_CATEGORY = ? THEN 1 ELSE 0 END) test_count,
				SUM(CASE WHEN SVC_CATEGORY IN (?,?) THEN 1 ELSE 0 END) emergency_calls_count,
				SUM(CASE WHEN SVC_STATUS = ? THEN 1 ELSE 0 END) status_new,
				SUM(CASE WHEN SVC_STATUS = ? THEN 1 ELSE 0 END) status_accepted,
				SUM(CASE WHEN SVC_STATUS = ? THEN 1 ELSE 0 END) status_resolved,
				SUM(CASE WHEN SVC_STATUS = ? THEN 1 ELSE 0 END) status_canceled,
				SUM(CASE WHEN SVC_STATUS = ? AND SVC_CATEGORY IN (?,?) THEN 1 ELSE 0 END) false_emergencies_count,
				SUM(CASE WHEN SVC_STATUS = ? AND SVC_CATEGORY = ? THEN 1 ELSE 0 END) accidental_requests_count
			 FROM \`service_call\`
			 WHERE ${baseWhere}`,
			[...caseParams, ...baseParams]);

		let agg = aggRows[0];
		vals.total_calls = Number(agg.total_calls);
		vals.emergency_calls_count = Number(agg.emergency_calls_count);
		vals.medical_emergency_count = Number(agg.medical_emergency_count);
		vals.security_emergency_count = Number(agg.security_emergency_count);
		vals.concierge_service_count = Number(agg.concierge_service_count);
		vals.panic_count = Number(agg.panic_count);
		vals.test_count = Number(agg.test_count);
		vals.false_emergencies_count = Number(agg.false_emergencies_count);
		vals.accidental_requests_count = Number(agg.accidental_requests_count);

		vals.calls_by_status = {
			[$Const.CALL_STATUS_NEW]:		Number(agg.status_new),
			[$Const.CALL_STATUS_ACCEPTED]:	Number(agg.status_accepted),
			[$Const.CALL_STATUS_RESOLVED]:	Number(agg.status_resolved),
			[$Const.CALL_STATUS_CANCELED]:	Number(agg.status_canceled),
		};

		vals.calls_by_category = {
			[$Const.CALL_CATEGORY_MEDICAL_EMERGENCY]:	Number(agg.medical_emergency_count),
			[$Const.CALL_CATEGORY_SECURITY_EMERGENCY]:	Number(agg.security_emergency_count),
			[$Const.CALL_CATEGORY_CONCIERGE_SERVICE]:	Number(agg.concierge_service_count),
			[$Const.CALL_CATEGORY_PANIC]:				Number(agg.panic_count),
			[$Const.CALL_CATEGORY_TEST]:				Number(agg.test_count),
		};

		// --- Average response time (emergencies: creation → acceptance) -------
		let respConditions = [
			...baseConditions,
			"SVC_CATEGORY IN (?,?)",
			"SVC_ACCEPTED_ON IS NOT NULL"
		];
		let respParams = [
			...baseParams,
			$Const.CALL_CATEGORY_MEDICAL_EMERGENCY,
			$Const.CALL_CATEGORY_SECURITY_EMERGENCY
		];

		let respRows = $Db.executeQuery(
			`SELECT
				AVG(TIMESTAMPDIFF(SECOND, SVC_CREATED_ON, SVC_ACCEPTED_ON)) avg_seconds
			 FROM \`service_call\`
			 WHERE ${respConditions.join(" AND ")}`,
			respParams);

		let avgRespSec = respRows[0].avg_seconds;
		vals.avg_response_time_minutes = avgRespSec !== null ? Math.round((avgRespSec / 60) * 100) / 100 : null;

		// --- Average handling time (concierge: creation → resolution) ---------
		let handleConditions = [
			...baseConditions,
			"SVC_CATEGORY = ?",
			"SVC_RESOLVED_ON IS NOT NULL"
		];
		let handleParams = [...baseParams, $Const.CALL_CATEGORY_CONCIERGE_SERVICE];

		let handleRows = $Db.executeQuery(
			`SELECT
				AVG(TIMESTAMPDIFF(SECOND, SVC_CREATED_ON, SVC_RESOLVED_ON)) avg_total_seconds,
				AVG(TIMESTAMPDIFF(SECOND, SVC_ACCEPTED_ON, SVC_RESOLVED_ON)) avg_from_assign_seconds
			 FROM \`service_call\`
			 WHERE ${handleConditions.join(" AND ")}`,
			handleParams);

		let avgTotalSec = handleRows[0].avg_total_seconds;
		let avgFromAssignSec = handleRows[0].avg_from_assign_seconds;
		vals.avg_handling_time_minutes = avgTotalSec !== null ? Math.round((avgTotalSec / 60) * 100) / 100 : null;
		vals.avg_handling_time_from_assignment_minutes = avgFromAssignSec !== null ? Math.round((avgFromAssignSec / 60) * 100) / 100 : null;

		// --- Calls by priority ------------------------------------------------
		let prioRows = $Db.executeQuery(
			`SELECT SVC_PRIORITY, COUNT(*) cnt
			 FROM \`service_call\`
			 WHERE ${baseWhere}
			 GROUP BY SVC_PRIORITY`,
			[...baseParams]);

		vals.calls_by_priority = {};
		for (let row of prioRows)
		{
			vals.calls_by_priority[row.SVC_PRIORITY] = Number(row.cnt);
		}

		// --- 5 recent open calls (for the dashboard list) ---------------------
		let recentConditions = ["SVC_DELETED_ON IS NULL"];
		let recentParams = [];
		buildOpenStatusCondition("SVC_STATUS", TABLE_CALL_STATUS, recentConditions, recentParams);
		buildCommunityCondition("SVC_COM_ID", communityId, recentConditions, recentParams);

		let recentRows = $Db.executeQuery(
			`SELECT service_call.SVC_ID, SVC_CATEGORY, SVC_SERVICE_TYPE, SVC_STATUS,
					SVC_PRIORITY, SVC_DESCRIPTION, SVC_CREATED_ON,
					res_ud.USD_FIRST_NAME RES_FIRST, res_ud.USD_LAST_NAME RES_LAST,
					ofc_ud.USD_FIRST_NAME OFC_FIRST, ofc_ud.USD_LAST_NAME OFC_LAST,
					community.COM_NAME
			 FROM \`service_call\`
				JOIN \`user_details\` res_ud ON SVC_RES_USR_ID = res_ud.USD_USR_ID
				LEFT OUTER JOIN \`user_details\` ofc_ud ON SVC_OFC_USR_ID = ofc_ud.USD_USR_ID
				LEFT OUTER JOIN \`community\` ON SVC_COM_ID = COM_ID
			 WHERE ${recentConditions.join(" AND ")}
			 ORDER BY SVC_CREATED_ON DESC
			 LIMIT 5`,
			recentParams);
		vals.recent_calls = recentRows.map(mapRecentCallRow);

		// --- Filter metadata --------------------------------------------------
		vals.from_date = fromDate;
		vals.to_date = toDate;

		return { ...rc, ...vals };
	}


	// =====================================================================
	// get_tasks_summary — tasks dashboard section (SDS 4.5.2)
	// =====================================================================

	get_tasks_summary()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let communityId = parseInt(this.$community_id) || 0;
		let scope = this.$scope || "all";
		let fromDate = this.$from_date || "";
		let toDate = this.$to_date || "";
		let userId = this.$Session.userId;

		// --- Core conditions (no date range) ----------------------------------
		let coreConditions = ["TSK_DELETED_ON IS NULL"];
		let coreParams = [];
		buildCommunityCondition("TSK_COM_ID", communityId, coreConditions, coreParams);
		if (scope === "my")
		{
			coreConditions.push("TSK_ASSIGNED_TO = ?");
			coreParams.push(userId);
		}

		// --- Date-filtered conditions (for breakdowns) ------------------------
		let dateConditions = [...coreConditions];
		let dateParams = [...coreParams];
		buildDateRangeConditions("TSK_CREATED_ON", fromDate, toDate, dateConditions, dateParams);
		let dateWhere = dateConditions.join(" AND ");

		// --- Open tasks count (current state, no date range) ------------------
		let openConditions = [...coreConditions];
		let openParams = [...coreParams];
		buildOpenStatusCondition("TSK_STATUS", TABLE_TASK_STATUS, openConditions, openParams);

		let openCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`task\`
			 WHERE ${openConditions.join(" AND ")}`,
			openParams);
		vals.open_tasks_count = openCountRows[0].total;

		// --- Tasks by status (date-filtered) ----------------------------------
		let statusRows = $Db.executeQuery(
			`SELECT TSK_STATUS, COUNT(*) cnt
			 FROM \`task\`
			 WHERE ${dateWhere}
			 GROUP BY TSK_STATUS`,
			[...dateParams]);

		vals.tasks_by_status = {};
		for (let row of statusRows)
		{
			vals.tasks_by_status[row.TSK_STATUS] = Number(row.cnt);
		}

		// --- Tasks by type (date-filtered) ------------------------------------
		let typeRows = $Db.executeQuery(
			`SELECT TSK_TYPE, COUNT(*) cnt
			 FROM \`task\`
			 WHERE ${dateWhere}
			 GROUP BY TSK_TYPE`,
			[...dateParams]);

		vals.tasks_by_type = {};
		for (let row of typeRows)
		{
			vals.tasks_by_type[row.TSK_TYPE] = Number(row.cnt);
		}

		// --- 5 recent open tasks sorted by priority (current state) -----------
		let recentConditions = ["TSK_DELETED_ON IS NULL"];
		let recentParams = [];
		buildOpenStatusCondition("TSK_STATUS", TABLE_TASK_STATUS, recentConditions, recentParams);
		buildCommunityCondition("TSK_COM_ID", communityId, recentConditions, recentParams);
		if (scope === "my")
		{
			recentConditions.push("TSK_ASSIGNED_TO = ?");
			recentParams.push(userId);
		}

		let priorityOrder = buildPriorityOrderSql("TSK_PRIORITY");
		let recentRows = $Db.executeQuery(
			`SELECT task.TSK_ID, TSK_TYPE, TSK_STATUS, TSK_PRIORITY, TSK_DESCRIPTION, TSK_CREATED_ON,
					cre_ud.USD_FIRST_NAME CRE_FIRST, cre_ud.USD_LAST_NAME CRE_LAST,
					asn_ud.USD_FIRST_NAME ASN_FIRST, asn_ud.USD_LAST_NAME ASN_LAST,
					community.COM_NAME
			 FROM \`task\`
				JOIN \`user_details\` cre_ud ON TSK_CREATED_BY = cre_ud.USD_USR_ID
				JOIN \`user_details\` asn_ud ON TSK_ASSIGNED_TO = asn_ud.USD_USR_ID
				LEFT OUTER JOIN \`community\` ON TSK_COM_ID = COM_ID
			 WHERE ${recentConditions.join(" AND ")}
			 ORDER BY ${priorityOrder.sql}, TSK_CREATED_ON DESC
			 LIMIT 5`,
			[...recentParams, ...priorityOrder.params]);
		vals.recent_tasks = recentRows.map(mapRecentTaskRow);

		// --- Filter metadata --------------------------------------------------
		if (fromDate) vals.from_date = fromDate;
		if (toDate) vals.to_date = toDate;

		return { ...rc, ...vals };
	}


	// =====================================================================
	// get_reports_summary — reports dashboard section (SDS 4.5.5)
	// =====================================================================

	get_reports_summary()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let communityId = parseInt(this.$community_id) || 0;
		let scope = this.$scope || "all";
		let fromDate = this.$from_date || "";
		let toDate = this.$to_date || "";
		let userId = this.$Session.userId;

		// --- Core conditions (no date range) ----------------------------------
		let coreConditions = ["IRP_DELETED_ON IS NULL"];
		let coreParams = [];
		buildCommunityCondition("IRP_COM_ID", communityId, coreConditions, coreParams);
		if (scope === "my")
		{
			coreConditions.push("IRP_REVIEWER_USR_ID = ?");
			coreParams.push(userId);
		}

		// --- Date-filtered conditions (for breakdowns) ------------------------
		let dateConditions = [...coreConditions];
		let dateParams = [...coreParams];
		buildDateRangeConditions("IRP_CREATED_ON", fromDate, toDate, dateConditions, dateParams);
		let dateWhere = dateConditions.join(" AND ");

		// --- Open reports count (current state, no date range) ----------------
		let openConditions = [...coreConditions];
		let openParams = [...coreParams];
		buildOpenStatusCondition("IRP_STATUS", TABLE_REPORT_STATUS, openConditions, openParams);

		let openCountRows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`incident_report\`
			 WHERE ${openConditions.join(" AND ")}`,
			openParams);
		vals.open_reports_count = openCountRows[0].total;

		// --- Total reports in the last 14 days (current state) ----------------
		let fourteenDaysAgo = new $Date().addDays(-14).format("Y-m-d") + " 00:00:00";

		let last14Conditions = [...coreConditions, "IRP_CREATED_ON >= ?"];
		let last14Params = [...coreParams, fourteenDaysAgo];

		let last14Rows = $Db.executeQuery(
			`SELECT COUNT(*) total
			 FROM \`incident_report\`
			 WHERE ${last14Conditions.join(" AND ")}`,
			last14Params);
		vals.total_reports_last_14_days = last14Rows[0].total;

		// --- Reports by status (date-filtered) --------------------------------
		let statusRows = $Db.executeQuery(
			`SELECT IRP_STATUS, COUNT(*) cnt
			 FROM \`incident_report\`
			 WHERE ${dateWhere}
			 GROUP BY IRP_STATUS`,
			[...dateParams]);

		vals.reports_by_status = {};
		for (let row of statusRows)
		{
			vals.reports_by_status[row.IRP_STATUS] = Number(row.cnt);
		}

		// --- 5 recent open reports (current state) ----------------------------
		let recentConditions = ["IRP_DELETED_ON IS NULL"];
		let recentParams = [];
		buildOpenStatusCondition("IRP_STATUS", TABLE_REPORT_STATUS, recentConditions, recentParams);
		buildCommunityCondition("IRP_COM_ID", communityId, recentConditions, recentParams);
		if (scope === "my")
		{
			recentConditions.push("IRP_REVIEWER_USR_ID = ?");
			recentParams.push(userId);
		}

		let recentRows = $Db.executeQuery(
			`SELECT incident_report.IRP_ID, IRP_TITLE, IRP_CATEGORY, IRP_STATUS, IRP_CREATED_ON,
					ofc_ud.USD_FIRST_NAME OFC_FIRST, ofc_ud.USD_LAST_NAME OFC_LAST,
					community.COM_NAME
			 FROM \`incident_report\`
				JOIN \`user_details\` ofc_ud ON IRP_OFC_USR_ID = ofc_ud.USD_USR_ID
				LEFT OUTER JOIN \`community\` ON IRP_COM_ID = COM_ID
			 WHERE ${recentConditions.join(" AND ")}
			 ORDER BY IRP_CREATED_ON DESC
			 LIMIT 5`,
			recentParams);
		vals.recent_reports = recentRows.map(mapRecentReportRow);

		// --- Filter metadata --------------------------------------------------
		if (fromDate) vals.from_date = fromDate;
		if (toDate) vals.to_date = toDate;

		return { ...rc, ...vals };
	}
};
