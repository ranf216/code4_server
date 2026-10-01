const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_poi_lifecycle_check");

$DataItems.define("poi_record_type");
$DataItems.define("poi_status");

process.on("SIGINT", (code) =>
{
	$Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
	console.log(`Service is not active shutdown with: ${code}`);
	isc.endStandAlone($ERRS.ERR_SUCCESS);
});

// Run daily at 03:30
$Utils.createCron({cronExpression: "30 3 * * *"}, doPoiLifecycleCheck);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);


const DEFAULT_RENEWAL_REMINDER_DAYS = 14;
const DEFAULT_ARCHIVE_THRESHOLD_MONTHS = 24;


/**
 * Daily maintenance job for POI records:
 *   1. Auto-expire active records past their expiry date
 *   2. Send expiring-soon reminders for records within the reminder window
 *   3. Auto-archive expired/inactive records past the archive threshold
 */
function doPoiLifecycleCheck()
{
	let lock = $EntityLock.acquire("cron", "cron_poi_lifecycle", "system", 300);
	if (!lock.acquired)
	{
		$Logger.logString($Const.LL_INFO, "POI lifecycle: skipping — another instance is running");
		return;
	}

	try
	{
		let settings = getPoiSettings();
		let now = $Utils.now();

		let expiredCount = autoExpireRecords(settings, now);
		let reminderCount = sendExpiryReminders(settings, now);
		let archivedCount = autoArchiveRecords(settings, now);

		if (expiredCount > 0 || reminderCount > 0 || archivedCount > 0)
		{
			$Logger.logString($Const.LL_INFO,
				`POI lifecycle: expired=${expiredCount}, reminders=${reminderCount}, archived=${archivedCount}`);
		}
	}
	catch (e)
	{
		$Logger.logString($Const.LL_ERROR, `POI lifecycle check error: ${e.message}`);
	}

	$EntityLock.release("cron", "cron_poi_lifecycle", "system");
}


/**
 * Transition active records with POI_EXPIRY_DATE <= today to 'expired'.
 * Send poi_expired notifications to officers in assigned communities.
 */
function autoExpireRecords(settings, now)
{
	let records = $Db.executeQuery(
		`SELECT r.POI_ID, r.POI_RECORD_TYPE, r.POI_FIRST_NAME, r.POI_LAST_NAME
		 FROM \`poi_record\` r
		 WHERE r.POI_STATUS = ?
		   AND r.POI_EXPIRY_DATE IS NOT NULL
		   AND r.POI_EXPIRY_DATE <= CURRENT_DATE()
		   AND r.POI_DELETED_ON IS NULL`,
		[$Const.POI_STATUS_ACTIVE]);

	if (records.length === 0)
	{
		return 0;
	}

	let expiredCount = 0;
	let recordIds = records.map(r => r.POI_ID);

	// Batch-fetch community assignments for all expiring records
	let siteRows = $Db.executeQuery(
		`SELECT PSI_POI_ID, PSI_COM_ID
		 FROM \`poi_site\`
		 WHERE PSI_POI_ID IN (${recordIds.toPlaceholders()}) AND PSI_DELETED_ON IS NULL`,
		recordIds);

	let sitesMap = {};
	for (let i = 0; i < siteRows.length; i++)
	{
		let sr = siteRows[i];
		if (!sitesMap[sr.PSI_POI_ID])
		{
			sitesMap[sr.PSI_POI_ID] = [];
		}
		sitesMap[sr.PSI_POI_ID].push(sr.PSI_COM_ID);
	}

	// Update status for all records in one query
	$Db.executeQuery(
		`UPDATE \`poi_record\`
		 SET POI_STATUS=?, POI_LAST_UPDATE=?
		 WHERE POI_ID IN (${recordIds.toPlaceholders()}) AND POI_STATUS=? AND POI_DELETED_ON IS NULL`,
		[$Const.POI_STATUS_EXPIRED, now, ...recordIds, $Const.POI_STATUS_ACTIVE]);

	if ($Db.isError())
	{
		$Logger.logString($Const.LL_ERROR, `Failed to auto-expire POI records: ${$Db.lastErrorMsg()}`);
		return 0;
	}

	expiredCount = $Db.affectedRows();

	// Batch-fetch officers for all affected communities (avoid DB calls in loop)
	let allComIds = [];
	for (let key in sitesMap)
	{
		allComIds = allComIds.concat(sitesMap[key]);
	}
	let officersByCommunity = batchFetchOfficersByCommunity([...new Set(allComIds)]);

	// Send notifications per record (different communities per record)
	for (let i = 0; i < records.length; i++)
	{
		let record = records[i];
		let communityIds = sitesMap[record.POI_ID] || [];
		if (communityIds.length === 0) continue;

		let officerIds = resolveOfficerIds(officersByCommunity, communityIds);
		if (officerIds.length === 0) continue;

		let fullName = buildFullName(record.POI_FIRST_NAME, record.POI_LAST_NAME);
		let typeName = getRecordTypeName(record.POI_RECORD_TYPE);

		insertNotifications(officerIds, "poi_expired",
			"POI Expired",
			typeName + " " + fullName + " has expired",
			{entity_type: "poi", entity_id: record.POI_ID},
			now);
	}

	return expiredCount;
}


/**
 * Send poi_expiring_soon reminders for active records expiring within
 * the configured reminder window. Dedup: skip records where a reminder
 * notification was already sent within the last 24 hours.
 */
function sendExpiryReminders(settings, now)
{
	let reminderDays = settings.renewal_reminder_days || DEFAULT_RENEWAL_REMINDER_DAYS;

	let records = $Db.executeQuery(
		`SELECT r.POI_ID, r.POI_RECORD_TYPE, r.POI_FIRST_NAME, r.POI_LAST_NAME, r.POI_EXPIRY_DATE
		 FROM \`poi_record\` r
		 WHERE r.POI_STATUS = ?
		   AND r.POI_EXPIRY_DATE IS NOT NULL
		   AND r.POI_EXPIRY_DATE > CURRENT_DATE()
		   AND r.POI_EXPIRY_DATE <= DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
		   AND r.POI_DELETED_ON IS NULL`,
		[$Const.POI_STATUS_ACTIVE, reminderDays]);

	if (records.length === 0)
	{
		return 0;
	}

	let recordIds = records.map(r => r.POI_ID);

	// Dedup: check which records already had a reminder notification in the last 24 hours
	let oneDayAgo = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000);
	let oneDayAgoStr = oneDayAgo.toISOString().slice(0, 19).replace("T", " ");

	let alreadyNotified = $Db.executeQuery(
		`SELECT DISTINCT JSON_EXTRACT(NTF_PAYLOAD, '$.entity_id') poi_id
		 FROM \`notification\`
		 WHERE NTF_TYPE=?
		   AND NTF_CREATED_ON >= ?
		   AND NTF_DELETED_ON IS NULL`,
		["poi_expiring_soon", oneDayAgoStr]);

	let notifiedIds = new Set(alreadyNotified.map(r => parseInt(r.poi_id)));
	let toRemind = records.filter(r => !notifiedIds.has(r.POI_ID));

	if (toRemind.length === 0)
	{
		return 0;
	}

	// Batch-fetch community assignments
	let remindIds = toRemind.map(r => r.POI_ID);
	let siteRows = $Db.executeQuery(
		`SELECT PSI_POI_ID, PSI_COM_ID
		 FROM \`poi_site\`
		 WHERE PSI_POI_ID IN (${remindIds.toPlaceholders()}) AND PSI_DELETED_ON IS NULL`,
		remindIds);

	let sitesMap = {};
	for (let i = 0; i < siteRows.length; i++)
	{
		let sr = siteRows[i];
		if (!sitesMap[sr.PSI_POI_ID])
		{
			sitesMap[sr.PSI_POI_ID] = [];
		}
		sitesMap[sr.PSI_POI_ID].push(sr.PSI_COM_ID);
	}

	// Batch-fetch officers for all affected communities (avoid DB calls in loop)
	let allRemindComIds = [];
	for (let key in sitesMap)
	{
		allRemindComIds = allRemindComIds.concat(sitesMap[key]);
	}
	let officersByCommunity = batchFetchOfficersByCommunity([...new Set(allRemindComIds)]);

	let reminderCount = 0;
	for (let i = 0; i < toRemind.length; i++)
	{
		let record = toRemind[i];
		let communityIds = sitesMap[record.POI_ID] || [];
		if (communityIds.length === 0) continue;

		let officerIds = resolveOfficerIds(officersByCommunity, communityIds);
		if (officerIds.length === 0) continue;

		let fullName = buildFullName(record.POI_FIRST_NAME, record.POI_LAST_NAME);
		let typeName = getRecordTypeName(record.POI_RECORD_TYPE);
		let expiryDate = record.POI_EXPIRY_DATE;
		if (expiryDate instanceof Date)
		{
			expiryDate = expiryDate.toISOString().slice(0, 10);
		}

		insertNotifications(officerIds, "poi_expiring_soon",
			"POI Expiring Soon",
			typeName + " " + fullName + " expires on " + expiryDate,
			{entity_type: "poi", entity_id: record.POI_ID},
			now);

		reminderCount++;
	}

	return reminderCount;
}


/**
 * Transition expired/inactive records older than archive_threshold_months to 'archived'.
 */
function autoArchiveRecords(settings, now)
{
	let thresholdMonths = settings.archive_threshold_months || DEFAULT_ARCHIVE_THRESHOLD_MONTHS;

	$Db.executeQuery(
		`UPDATE \`poi_record\`
		 SET POI_STATUS=?, POI_LAST_UPDATE=?
		 WHERE POI_STATUS IN (?, ?)
		   AND POI_LAST_UPDATE IS NOT NULL
		   AND POI_LAST_UPDATE <= DATE_SUB(?, INTERVAL ? MONTH)
		   AND POI_DELETED_ON IS NULL`,
		[$Const.POI_STATUS_ARCHIVED, now, $Const.POI_STATUS_EXPIRED, $Const.POI_STATUS_INACTIVE, now, thresholdMonths]);

	if ($Db.isError())
	{
		$Logger.logString($Const.LL_ERROR, `Failed to auto-archive POI records: ${$Db.lastErrorMsg()}`);
		return 0;
	}

	return $Db.affectedRows();
}


// ---------------------------------------------------------------------------
// Shared helper functions (no module session available in cron context)
// ---------------------------------------------------------------------------

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
		catch (e) { /* fall through */ }
	}
	let defaults = $Config.get("SETTINGS_DEFAULTS");
	return (defaults && defaults.poi) ? defaults.poi : {};
}

function buildFullName(firstName, lastName)
{
	return ((firstName || "") + " " + (lastName || "")).trim() || "Unknown";
}

function getRecordTypeName(recordType)
{
	return $DataItems.getItemName(recordType, "poi_record_type") || recordType;
}

function batchFetchOfficersByCommunity(communityIds)
{
	if (!communityIds || communityIds.length === 0)
	{
		return {};
	}
	let rows = $Db.executeQuery(
		`SELECT ud.USD_COM_ID, ud.USD_USR_ID
		 FROM \`user_details\` ud
		    JOIN \`user\` u ON ud.USD_USR_ID = u.USR_ID
		 WHERE ud.USD_COM_ID IN (${communityIds.toPlaceholders()})
		   AND u.USR_TYPE=?
		   AND u.USR_STATUS=?
		   AND ud.USD_DELETED_ON IS NULL`,
		[...communityIds, $Const.USER_TYPE_OFFICER, $Const.USER_STATUS_ACTIVE]);
	let map = {};
	for (let i = 0; i < rows.length; i++)
	{
		if (!map[rows[i].USD_COM_ID])
		{
			map[rows[i].USD_COM_ID] = [];
		}
		map[rows[i].USD_COM_ID].push(rows[i].USD_USR_ID);
	}
	return map;
}

function resolveOfficerIds(officersByCommunity, communityIds)
{
	let ids = [];
	for (let i = 0; i < communityIds.length; i++)
	{
		let comOfficers = officersByCommunity[communityIds[i]] || [];
		for (let j = 0; j < comOfficers.length; j++)
		{
			ids.push(comOfficers[j]);
		}
	}
	return [...new Set(ids)];
}

/**
 * Insert notification records directly (no session available in cron).
 * Mirrors the pattern from cron_shift_reminders.js.
 */
function insertNotifications(userIds, type, title, message, payloadObj, now)
{
	if (!userIds || userIds.length === 0) return;
	let uniqueIds = [...new Set(userIds)];
	let payload = JSON.stringify(payloadObj);

	let valuePlaceholders = [];
	let insertParams = [];
	for (let i = 0; i < uniqueIds.length; i++)
	{
		valuePlaceholders.push("(?, ?, ?, ?, ?, ?)");
		insertParams.push(uniqueIds[i], type, title, message, payload, now);
	}

	$Db.executeQuery(
		`INSERT INTO \`notification\` (NTF_USR_ID, NTF_TYPE, NTF_TITLE, NTF_MESSAGE, NTF_PAYLOAD, NTF_CREATED_ON)
		 VALUES ${valuePlaceholders.join(", ")}`,
		insertParams);

	if ($Db.isError())
	{
		$Logger.logString($Const.LL_WARNING, `Failed to insert POI notifications (${type}): ${$Db.lastErrorMsg()}`);
		return;
	}

	// Send push notifications via FCM if available
	if (typeof $Fcm !== "undefined" && $Fcm)
	{
		let deviceRows = $Db.executeQuery(
			`SELECT USR_ID, USR_DEVICE_ID FROM \`user\`
			 WHERE USR_ID IN (${uniqueIds.toPlaceholders()}) AND USR_STATUS=?
			   AND USR_DEVICE_ID IS NOT NULL AND USR_DEVICE_ID != ''`,
			[...uniqueIds, $Const.USER_STATUS_ACTIVE]);

		for (let j = 0; j < deviceRows.length; j++)
		{
			try
			{
				$Fcm.sendToDevice(deviceRows[j].USR_DEVICE_ID, {
					notification: {title: title, body: message},
					data: payloadObj,
				});
			}
			catch (e) { /* FCM failures are non-fatal */ }
		}
	}
}
