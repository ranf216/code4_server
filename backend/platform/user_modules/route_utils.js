module.exports =
{
	__initialize()
	{
		$DataItems.define("route_status");
	},

	getRouteSettings()
	{
		let settings = { ...$Config.get("SETTINGS_DEFAULTS").route };
		try
		{
			let rows = $Db.executeQuery(
				`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
				[$Const.KVL_SETTINGS_ROUTE]);
			if (rows.length > 0 && rows[0].KVL_VALUE)
			{
				let stored = JSON.parse(rows[0].KVL_VALUE);
				for (let key of Object.keys(stored))
				{
					if (key in settings)
					{
						settings[key] = stored[key];
					}
				}
			}
		}
		catch (e) { /* use defaults */ }
		return settings;
	},

	/**
	 * Auto-complete all active routes for a given shift.
	 * Called when a shift transitions to completed status.
	 * Unvisited waypoints stay as-is for compliance reporting.
	 *
	 * @param {number} shiftId
	 * @param {string} now - Current timestamp from $Utils.now()
	 */
	completeActiveRoutesForShift(shiftId, now)
	{
		let activeRoutes = $Db.executeQuery(
			`SELECT PTR_ID FROM \`patrol_route\`
			 WHERE PTR_SFT_ID=? AND PTR_STATUS=? AND PTR_DELETED_ON IS NULL`,
			[shiftId, $Const.ROUTE_STATUS_ACTIVE]);

		if (activeRoutes.length === 0)
		{
			return 0;
		}

		let routeIds = activeRoutes.map(r => r.PTR_ID);

		$Db.executeQuery(
			`UPDATE \`patrol_route\`
			 SET PTR_STATUS=?, PTR_COMPLETED_ON=?, PTR_LAST_UPDATE=?
			 WHERE PTR_ID IN (${routeIds.toPlaceholders()}) AND PTR_STATUS=?`,
			[$Const.ROUTE_STATUS_COMPLETED, now, now, ...routeIds, $Const.ROUTE_STATUS_ACTIVE]);

		return activeRoutes.length;
	},

	/**
	 * Check whether a shift has any active (not yet completed/deleted) routes.
	 */
	shiftHasActiveRoutes(shiftId)
	{
		let rows = $Db.executeQuery(
			`SELECT 1 FROM \`patrol_route\`
			 WHERE PTR_SFT_ID=? AND PTR_STATUS=? AND PTR_DELETED_ON IS NULL
			 LIMIT 1`,
			[shiftId, $Const.ROUTE_STATUS_ACTIVE]);
		return rows.length > 0;
	},
};
