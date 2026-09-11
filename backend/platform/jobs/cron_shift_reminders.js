const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_shift_reminders");

process.on("SIGINT", (code) =>
{
	$Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
	console.log(`Service is not active shutdown with: ${code}`);
	isc.endStandAlone($ERRS.ERR_SUCCESS);
});

// Run every 2 minutes
$Utils.createCron({secondsInterval: 120}, doShiftReminders);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);


function doShiftReminders()
{
	try
	{
		let settings = $ShiftUtils.getShiftSettings();
		let leadMins = settings.shift_starting_soon_lead_mins || 30;
		let now = $Utils.now();
		let nowDate = new Date(now);

		// Find published shifts starting within the lead window that have allocated officers without check-ins
		let targetDate = nowDate.toISOString().slice(0, 10);

		// Calculate lead window: shifts starting between now and now + leadMins
		let leadEnd = new Date(nowDate);
		leadEnd.setMinutes(leadEnd.getMinutes() + leadMins);

		let nowTime = nowDate.toTimeString().slice(0, 5);
		let leadEndTime = leadEnd.toTimeString().slice(0, 5);

		// Handle date boundary: leadEnd might be tomorrow
		let leadEndDate = leadEnd.toISOString().slice(0, 10);

		let shifts;
		if (targetDate === leadEndDate)
		{
			// Same day: simple time range check
			shifts = $Db.executeQuery(
				`SELECT s.SFT_ID, s.SFT_DATE, s.SFT_START_TIME, s.SFT_COM_ID
				 FROM \`shift\` s
				 WHERE s.SFT_STATUS = ? AND s.SFT_DELETED_ON IS NULL
				   AND s.SFT_DATE = ?
				   AND s.SFT_START_TIME >= ? AND s.SFT_START_TIME <= ?`,
				[$Const.SHIFT_STATUS_PUBLISHED, targetDate, nowTime, leadEndTime]);
		}
		else
		{
			// Cross-midnight: shifts today after nowTime OR shifts tomorrow before leadEndTime
			shifts = $Db.executeQuery(
				`SELECT s.SFT_ID, s.SFT_DATE, s.SFT_START_TIME, s.SFT_COM_ID
				 FROM \`shift\` s
				 WHERE s.SFT_STATUS = ? AND s.SFT_DELETED_ON IS NULL
				   AND ((s.SFT_DATE = ? AND s.SFT_START_TIME >= ?)
				    OR  (s.SFT_DATE = ? AND s.SFT_START_TIME <= ?))`,
				[$Const.SHIFT_STATUS_PUBLISHED, targetDate, nowTime, leadEndDate, leadEndTime]);
		}

		if (shifts.length === 0)
		{
			return;
		}

		let totalNotified = 0;

		for (let i = 0; i < shifts.length; i++)
		{
			let shift = shifts[i];

			// Get allocated officers who have NOT yet checked in
			let uncheckedOfficers = $Db.executeQuery(
				`SELECT so.SFO_OFC_USR_ID
				 FROM \`shift_officer\` so
				 WHERE so.SFO_SFT_ID=? AND so.SFO_DELETED_ON IS NULL
				   AND NOT EXISTS (
				       SELECT 1 FROM \`shift_checkin\` ci
				       WHERE ci.SFC_SFT_ID = so.SFO_SFT_ID AND ci.SFC_OFC_USR_ID = so.SFO_OFC_USR_ID
				   )`,
				[shift.SFT_ID]);

			if (uncheckedOfficers.length === 0)
			{
				continue;
			}

			let officerIds = uncheckedOfficers.map(r => r.SFO_OFC_USR_ID);

			// Deduplicate: skip officers already notified about this shift within the last 2 hours
			let twoHoursAgo = new Date(nowDate);
			twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
			let twoHoursAgoStr = twoHoursAgo.toISOString().slice(0, 19).replace("T", " ");

			let alreadyNotified = $Db.executeQuery(
				`SELECT NTF_USR_ID FROM \`notification\`
				 WHERE NTF_TYPE='shift_starting_soon'
				   AND NTF_USR_ID IN (${officerIds.map(() => "?").join(",")})
				   AND NTF_PAYLOAD LIKE ?
				   AND NTF_CREATED_ON >= ?`,
				[...officerIds, `%"entity_id":${shift.SFT_ID}%`, twoHoursAgoStr]);

			let notifiedSet = new Set(alreadyNotified.map(r => r.NTF_USR_ID));
			let toNotify = officerIds.filter(id => !notifiedSet.has(id));

			if (toNotify.length === 0)
			{
				continue;
			}

			// Insert notifications directly (no session available in cron)
			let title = "Shift Starting Soon";
			let message = "Your shift on " + shift.SFT_DATE + " at " + shift.SFT_START_TIME + " is starting soon.";
			let payload = JSON.stringify({entity_type: "shift", entity_id: shift.SFT_ID});

			let valuePlaceholders = [];
			let insertParams = [];
			for (let j = 0; j < toNotify.length; j++)
			{
				valuePlaceholders.push("(?, ?, ?, ?, ?, ?)");
				insertParams.push(
					toNotify[j],
					"shift_starting_soon",
					title,
					message,
					payload,
					now
				);
			}

			$Db.executeQuery(
				`INSERT INTO \`notification\` (NTF_USR_ID, NTF_TYPE, NTF_TITLE, NTF_MESSAGE, NTF_PAYLOAD, NTF_CREATED_ON)
				 VALUES ${valuePlaceholders.join(", ")}`,
				insertParams);

			if (!$Db.isError())
			{
				totalNotified += toNotify.length;
			}

			// Send push notifications via FCM if available
			if (typeof $Fcm !== "undefined" && $Fcm)
			{
				let deviceRows = $Db.executeQuery(
					`SELECT USR_ID, USR_DEVICE_ID FROM \`user\`
					 WHERE USR_ID IN (${toNotify.map(() => "?").join(",")}) AND USR_STATUS=1
					       AND USR_DEVICE_ID IS NOT NULL AND USR_DEVICE_ID != ''`,
					toNotify);

				for (let j = 0; j < deviceRows.length; j++)
				{
					try
					{
						$Fcm.sendToDevice(deviceRows[j].USR_DEVICE_ID, {
							notification: {title: title, body: message},
							data: {entity_type: "shift", entity_id: String(shift.SFT_ID)},
						});
					}
					catch (e) { /* FCM failures are non-fatal */ }
				}
			}
		}

		if (totalNotified > 0)
		{
			$Logger.logString($Const.LL_INFO, `Sent ${totalNotified} shift starting-soon reminders`);
		}
	}
	catch (e)
	{
		$Logger.logString($Const.LL_ERROR, `Shift reminders error: ${e.message}`);
	}
}
