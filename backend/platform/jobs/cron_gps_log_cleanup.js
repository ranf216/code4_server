const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_gps_log_cleanup");

process.on("SIGINT", (code) =>
{
	$Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
	console.log(`Service is not active shutdown with: ${code}`);
	isc.endStandAlone($ERRS.ERR_SUCCESS);
});

// Run daily at 03:00
$Utils.createCron({cronExpression: "0 3 * * *"}, doGpsLogCleanup);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);


const GPS_RETENTION_DEFAULT_DAYS = 90;
const BATCH_SIZE = 5000;

/**
 * Daily maintenance job — removes GPS log entries older than the configured
 * retention period (settings:gps → location_history_retention, default 90 days).
 *
 * gps_log is an append-only telemetry table (no DELETED_ON column), so rows
 * are hard-deleted.  Deletion is batched to avoid long-running locks on
 * large tables.
 */
function doGpsLogCleanup()
{
	try
	{
		// --- load retention setting ---
		let retentionDays = GPS_RETENTION_DEFAULT_DAYS;
		try
		{
			let settings = { ...$Config.get("SETTINGS_DEFAULTS").gps };
			let rows = $Db.executeQuery(
				`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
				[$Const.KVL_SETTINGS_GPS]);
			if (rows.length > 0 && rows[0].KVL_VALUE)
			{
				let stored = JSON.parse(rows[0].KVL_VALUE);
				if (stored.location_history_retention > 0)
				{
					retentionDays = stored.location_history_retention;
				}
			}
			else if (settings.location_history_retention > 0)
			{
				retentionDays = settings.location_history_retention;
			}
		}
		catch (e) { /* use default */ }

		// --- calculate cutoff date ---
		let cutoff = new $Date();
		cutoff.addDays(-retentionDays);
		let cutoffStr = cutoff.format("Y-m-d H:i:s");

		// --- batch delete to avoid long-running locks ---
		let totalDeleted = 0;
		let deleted;
		do
		{
			$Db.executeQuery(
				`DELETE FROM \`gps_log\`
				 WHERE GPL_CREATED_ON < ?
				 LIMIT ?`,
				[cutoffStr, String(BATCH_SIZE)]);

			deleted = $Db.affectedRows();
			totalDeleted += deleted;
		}
		while (deleted >= BATCH_SIZE);

		if (totalDeleted > 0)
		{
			$Logger.logString($Const.LL_INFO, `GPS log cleanup: removed ${totalDeleted} records older than ${retentionDays} days (cutoff: ${cutoffStr})`);
		}
	}
	catch (e)
	{
		$Logger.logString($Const.LL_ERROR, `GPS log cleanup error: ${e.message}`);
	}
}
