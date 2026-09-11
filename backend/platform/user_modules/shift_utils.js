module.exports =
{
	__initialize()
	{
		$DataItems.define("shift_status");
	},

	communityHasActiveShifts(communityId)
	{
		let openStatuses = [$Const.SHIFT_STATUS_DRAFT, $Const.SHIFT_STATUS_PUBLISHED, $Const.SHIFT_STATUS_ACTIVE];
		let rows = $Db.executeQuery(
			`SELECT 1 FROM \`shift\`
			 WHERE SFT_COM_ID=? AND SFT_STATUS IN (${openStatuses.toPlaceholders()})
			   AND SFT_DELETED_ON IS NULL
			 LIMIT 1`,
			[communityId, ...openStatuses]);
		return rows.length > 0;
	},

	officerHasActiveShifts(officerId)
	{
		let openStatuses = [$Const.SHIFT_STATUS_DRAFT, $Const.SHIFT_STATUS_PUBLISHED, $Const.SHIFT_STATUS_ACTIVE];
		let rows = $Db.executeQuery(
			`SELECT 1 FROM \`shift_officer\` so
			    JOIN \`shift\` s ON so.SFO_SFT_ID = s.SFT_ID
			 WHERE so.SFO_OFC_USR_ID=? AND so.SFO_DELETED_ON IS NULL
			   AND s.SFT_STATUS IN (${openStatuses.toPlaceholders()})
			   AND s.SFT_DELETED_ON IS NULL
			 LIMIT 1`,
			[officerId, ...openStatuses]);
		return rows.length > 0;
	},

	getShiftSettings()
	{
		let settings = { ...$Config.get("SETTINGS_DEFAULTS").shift };
		try
		{
			let rows = $Db.executeQuery(
				`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
				[$Const.KVL_SETTINGS_SHIFT]);
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

	getOfficerCapabilities(officerId)
	{
		let rows = $Db.executeQuery(
			`SELECT OFC_ROLES, OFC_CERTIFICATION_BADGES
			 FROM \`officer\`
			 WHERE OFC_USR_ID=? AND OFC_DELETED_ON IS NULL`,
			[officerId]);
		if (rows.length === 0)
		{
			return { roles: [], badges: [] };
		}
		let row = rows[0];
		let roles = [];
		let badges = [];
		try { roles = row.OFC_ROLES ? JSON.parse(row.OFC_ROLES) : []; } catch (e) {}
		try { badges = row.OFC_CERTIFICATION_BADGES ? JSON.parse(row.OFC_CERTIFICATION_BADGES) : []; } catch (e) {}
		if (!Array.isArray(roles)) roles = [];
		if (!Array.isArray(badges)) badges = [];
		return { roles, badges };
	},

	getPostPermissions(postId)
	{
		let rows = $Db.executeQuery(
			`SELECT PST_PERMISSIONS FROM \`post\`
			 WHERE PST_ID=? AND PST_DELETED_ON IS NULL`,
			[postId]);
		if (rows.length === 0 || !rows[0].PST_PERMISSIONS)
		{
			return null;
		}
		try
		{
			let perms = JSON.parse(rows[0].PST_PERMISSIONS);
			return perms;
		}
		catch (e)
		{
			return null;
		}
	},

	validatePostEligibility(officerId, postId)
	{
		let perms = this.getPostPermissions(postId);
		if (!perms)
		{
			return null;
		}

		let caps = this.getOfficerCapabilities(officerId);

		let missingRoles = [];
		let missingBadges = [];

		if (perms.required_roles && Array.isArray(perms.required_roles))
		{
			missingRoles = perms.required_roles.filter(r => !caps.roles.includes(r));
		}

		if (perms.required_badges && Array.isArray(perms.required_badges))
		{
			missingBadges = perms.required_badges.filter(b => !caps.badges.includes(b));
		}

		if (missingRoles.length === 0 && missingBadges.length === 0)
		{
			return null;
		}

		return {
			missing_roles: missingRoles,
			missing_badges: missingBadges,
		};
	},
};
