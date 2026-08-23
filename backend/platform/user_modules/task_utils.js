const TABLE_STATUS = "task_status";
const TABLE_PRIORITY = "task_priority";

function idsByAttr(dataTable, attrName, attrVal)
{
	return Object.keys($DataItems.filterItemsIdByAttr(attrName, attrVal, dataTable) || {});
}

module.exports =
{
	__initialize()
	{
		$DataItems.define(TABLE_STATUS);
		$DataItems.define(TABLE_PRIORITY);
	},

	openStatuses()
	{
		return idsByAttr(TABLE_STATUS, "is_open", true);
	},

	closedStatuses()
	{
		return idsByAttr(TABLE_STATUS, "is_open", false);
	},

	isOpenStatus(status)
	{
		return $DataItems.getItemAttr(status, TABLE_STATUS, "is_open") === true;
	},

	/**
	 * Check if an officer/admin has open tasks as assignee.
	 * Used by other modules to guard deletion/deactivation.
	 */
	userHasOpenTasks(userId)
	{
		let openStatuses = idsByAttr(TABLE_STATUS, "is_open", true);
		if (openStatuses.length === 0)
		{
			return false;
		}
		let rows = $Db.executeQuery(
			`SELECT TSK_ID FROM \`task\`
			 WHERE TSK_ASSIGNED_TO=?
			   AND TSK_STATUS IN (${openStatuses.toPlaceholders()})
			   AND TSK_DELETED_ON IS NULL
			 LIMIT 1`,
			[userId, ...openStatuses]);
		return rows.length > 0;
	},

	/**
	 * Check if a community has open tasks.
	 * Used by community module to guard deletion.
	 */
	communityHasOpenTasks(communityId)
	{
		let openStatuses = idsByAttr(TABLE_STATUS, "is_open", true);
		if (openStatuses.length === 0)
		{
			return false;
		}
		let rows = $Db.executeQuery(
			`SELECT TSK_ID FROM \`task\`
			 WHERE TSK_COM_ID=?
			   AND TSK_STATUS IN (${openStatuses.toPlaceholders()})
			   AND TSK_DELETED_ON IS NULL
			 LIMIT 1`,
			[communityId, ...openStatuses]);
		return rows.length > 0;
	},
};
