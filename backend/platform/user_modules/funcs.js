module.exports =
{
	/**
	 * Get a single user's full name by user ID.
	 * Returns "Unknown" if the user is not found.
	 */
	getUserName(userId)
	{
		let rows = $Db.executeQuery(
			`SELECT USD_FIRST_NAME, USD_LAST_NAME FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
			[userId]);
		if (rows.length === 0)
		{
			return "Unknown";
		}
		return ((rows[0].USD_FIRST_NAME || "") + " " + (rows[0].USD_LAST_NAME || "")).trim();
	},

	/**
	 * Check whether a community exists (not soft-deleted).
	 */
	communityExists(communityId)
	{
		let rows = $Db.executeQuery(
			`SELECT COM_ID FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
			[communityId]);
		return rows.length > 0;
	},

	/**
	 * Get the community ID for a user (officer or admin) from user_details.
	 * Returns null if user not found or no community assigned.
	 */
	getUserCommunityId(userId)
	{
		let rows = $Db.executeQuery(
			`SELECT USD_COM_ID FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
			[userId]);
		return rows.length > 0 ? rows[0].USD_COM_ID : null;
	},

	/**
	 * Get the community ID for an admin user. Returns null if user not found
	 * or community is not set (falsy).
	 */
	getAdminCommunityId(userId)
	{
		let rows = $Db.executeQuery(
			`SELECT USD_COM_ID FROM \`user_details\`
			 WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
			[userId]);
		return (rows.length > 0 && rows[0].USD_COM_ID) ? rows[0].USD_COM_ID : null;
	},

	/**
	 * Check whether the session user has the SUPER_ADMIN role.
	 */
	isUserSuperAdmin(session)
	{
		return session.isCurrentUserHasRole($Const.USER_ROLE_SUPER_ADMIN);
	},

	/**
	 * Batch-fetch user names for multiple user IDs in a single query.
	 * Returns an object keyed by user ID: { userId: "First Last", ... }
	 * Missing users are mapped to "Unknown".
	 */
	getUserNames(userIds)
	{
		let map = {};
		if (!userIds || userIds.length === 0)
		{
			return map;
		}

		let uniqueIds = [...new Set(userIds)];
		let rows = $Db.executeQuery(
			`SELECT USD_USR_ID, USD_FIRST_NAME, USD_LAST_NAME
			 FROM \`user_details\`
			 WHERE USD_USR_ID IN (${uniqueIds.toPlaceholders()}) AND USD_DELETED_ON IS NULL`,
			uniqueIds);

		for (let i = 0; i < rows.length; i++)
		{
			let r = rows[i];
			map[r.USD_USR_ID] = ((r.USD_FIRST_NAME || "") + " " + (r.USD_LAST_NAME || "")).trim();
		}

		// Fill missing IDs with "Unknown"
		for (let i = 0; i < uniqueIds.length; i++)
		{
			if (!map[uniqueIds[i]])
			{
				map[uniqueIds[i]] = "Unknown";
			}
		}

		return map;
	},
};
