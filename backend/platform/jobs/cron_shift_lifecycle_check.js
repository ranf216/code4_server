const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_shift_lifecycle_check");

process.on("SIGINT", (code) =>
{
	$Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
	console.log(`Service is not active shutdown with: ${code}`);
	isc.endStandAlone($ERRS.ERR_SUCCESS);
});

// Run every 5 minutes
$Utils.createCron({secondsInterval: 300}, doLifecycleCheck);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);


function doLifecycleCheck()
{
	try
	{
		let settings = $ShiftUtils.getShiftSettings();
		let graceMins = settings.auto_checkout_grace_mins || 60;
		let now = $Utils.now();

		// 1. Auto-close stale open check-ins past shift end + grace period
		let staleCheckins = $Db.executeQuery(
			`SELECT ci.SFC_ID, ci.SFC_CHECK_IN_ON, ci.SFC_SFT_ID, ci.SFC_OFC_USR_ID,
			        s.SFT_DATE, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT
			 FROM \`shift_checkin\` ci
			    JOIN \`shift\` s ON ci.SFC_SFT_ID = s.SFT_ID
			 WHERE ci.SFC_CHECK_OUT_ON IS NULL
			   AND s.SFT_STATUS = ?
			   AND s.SFT_DELETED_ON IS NULL`,
			[$Const.SHIFT_STATUS_ACTIVE]);

		let autoClosedCount = 0;
		for (let i = 0; i < staleCheckins.length; i++)
		{
			let ci = staleCheckins[i];
			let endDateTime = new Date(ci.SFT_DATE + "T" + ci.SFT_END_TIME);
			if (ci.SFT_IS_OVERNIGHT)
			{
				endDateTime.setDate(endDateTime.getDate() + 1);
			}
			// Add grace period
			endDateTime.setMinutes(endDateTime.getMinutes() + graceMins);

			if (new Date(now) > endDateTime)
			{
				// Auto-close: set checkout to scheduled end time (not grace end)
				let scheduledEnd = new Date(ci.SFT_DATE + "T" + ci.SFT_END_TIME);
				if (ci.SFT_IS_OVERNIGHT)
				{
					scheduledEnd.setDate(scheduledEnd.getDate() + 1);
				}
				let checkOutTime = scheduledEnd.toISOString().slice(0, 19).replace("T", " ");

				let checkInTime = new Date(ci.SFC_CHECK_IN_ON);
				let totalHours = Math.round(((scheduledEnd - checkInTime) / (1000 * 60 * 60)) * 100) / 100;
				if (totalHours < 0) totalHours = 0;

				$Db.executeQuery(
					`UPDATE \`shift_checkin\`
					 SET SFC_CHECK_OUT_ON=?, SFC_TOTAL_HOURS=?, SFC_AUTO_CHECKOUT=1,
					     SFC_NOTES='Auto-closed by lifecycle cron after grace period'
					 WHERE SFC_ID=? AND SFC_CHECK_OUT_ON IS NULL`,
					[checkOutTime, totalHours, ci.SFC_ID]);

				if (!$Db.isError())
				{
					autoClosedCount++;
				}
			}
		}

		if (autoClosedCount > 0)
		{
			$Logger.logString($Const.LL_INFO, `Auto-closed ${autoClosedCount} stale check-ins`);
		}

		// 2. Auto-complete active shifts where all check-ins are closed and grace period has expired
		let activeShifts = $Db.executeQuery(
			`SELECT s.SFT_ID, s.SFT_DATE, s.SFT_END_TIME, s.SFT_IS_OVERNIGHT
			 FROM \`shift\` s
			 WHERE s.SFT_STATUS = ? AND s.SFT_DELETED_ON IS NULL`,
			[$Const.SHIFT_STATUS_ACTIVE]);

		let completedCount = 0;
		for (let i = 0; i < activeShifts.length; i++)
		{
			let shift = activeShifts[i];
			let endDateTime = new Date(shift.SFT_DATE + "T" + shift.SFT_END_TIME);
			if (shift.SFT_IS_OVERNIGHT)
			{
				endDateTime.setDate(endDateTime.getDate() + 1);
			}
			endDateTime.setMinutes(endDateTime.getMinutes() + graceMins);

			if (new Date(now) <= endDateTime)
			{
				continue;
			}

			// Check that no open check-ins remain
			let openCi = $Db.executeQuery(
				`SELECT 1 FROM \`shift_checkin\`
				 WHERE SFC_SFT_ID=? AND SFC_CHECK_OUT_ON IS NULL LIMIT 1`,
				[shift.SFT_ID]);

			if (openCi.length === 0)
			{
				$Db.executeQuery(
					`UPDATE \`shift\` SET SFT_STATUS=?, SFT_LAST_UPDATE=?
					 WHERE SFT_ID=? AND SFT_STATUS=? AND SFT_DELETED_ON IS NULL`,
					[$Const.SHIFT_STATUS_COMPLETED, now, shift.SFT_ID, $Const.SHIFT_STATUS_ACTIVE]);

				if (!$Db.isError())
				{
					completedCount++;
				}
			}
		}

		if (completedCount > 0)
		{
			$Logger.logString($Const.LL_INFO, `Auto-completed ${completedCount} shifts`);
		}
	}
	catch (e)
	{
		$Logger.logString($Const.LL_ERROR, `Lifecycle check error: ${e.message}`);
	}
}
