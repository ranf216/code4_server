function generateKey(name)
{
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s]/g, '')
		.replace(/\s+/g, '_');
}

module.exports = {

	getList(tableName)
	{
		let rows = $Db.executeQuery(
			`SELECT DIT_KEY, DIT_NAME, DIT_EXTRA
			FROM \`data_item\`
			WHERE DIT_TABLE=? AND DIT_DELETED_ON is null`,
			[tableName]
		);
		return rows.map(row =>
		{
			const item = {
				type_id: row.DIT_KEY,
				name: row.DIT_NAME,
			};
			if (row.DIT_EXTRA)
			{
				const extra = JSON.parse(row.DIT_EXTRA);
				Object.assign(item, extra);
			}
			return item;
		});
	},

	add(tableName, name, extra)
	{
		const key = generateKey(name);

		if ($Utils.empty(key))
		{
			return $ERRS.ERR_INVALID_API_PARAM;
		}

		const extraJson = extra ? JSON.stringify(extra) : null;

		$Db.executeQuery(
			`INSERT INTO \`data_item\` (DIT_TABLE, DIT_KEY, DIT_NAME, DIT_EXTRA, DIT_CREATED_ON)
			VALUES (?, ?, ?, ?, ?)`,
			[tableName, key, name, extraJson, $Utils.now()]
		);

		if ($Db.isDuplicateEntryError())
		{
			return $ERRS.ERR_SETTING_NAME_ALREADY_EXISTS;
		}
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		return { ...$ERRS.ERR_SUCCESS, type_id: key };
	},

	update(tableName, typeId, name, extra)
	{
		let updateFields = ["DIT_NAME=?", "DIT_LAST_UPDATE=?"];
		let updateValues = [name, $Utils.now()];

		if (extra)
		{
			updateFields.push("DIT_EXTRA=?");
			updateValues.push(JSON.stringify(extra));
		}

		updateValues.push(tableName, typeId);

		$Db.executeQuery(
			`UPDATE \`data_item\`
			SET ${updateFields.join(", ")}
			WHERE DIT_TABLE=? AND DIT_KEY=? AND DIT_DELETED_ON is null`,
			updateValues
		);

		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}
		if ($Db.affectedRows() === 0)
		{
			return $ERRS.ERR_SETTING_NOT_FOUND;
		}

		return $ERRS.ERR_SUCCESS;
	},

	delete(tableName, typeId)
	{
		$Db.executeQuery(
			`UPDATE \`data_item\`
			SET DIT_DELETED_ON=?
			WHERE DIT_TABLE=? AND DIT_KEY=? AND DIT_DELETED_ON is null`,
			[$Utils.now(), tableName, typeId]
		);

		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}
		if ($Db.affectedRows() === 0)
		{
			return $ERRS.ERR_SETTING_NOT_FOUND;
		}

		return $ERRS.ERR_SUCCESS;
	},

};
