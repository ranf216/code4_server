const zlib = require("zlib");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

module.exports =
{
	/**
	 * Check that an image buffer can be embedded in a pdfkit document without crashing the process.
	 * pdfkit decodes PNG image data asynchronously (zlib callbacks) - a corrupt PNG then throws inside
	 * $Export's deasync wait loop and aborts Node ("async hook stack has become corrupted").
	 * JPEG: pdfkit parses markers synchronously (errors are catchable) - signature check only.
	 * PNG: walks the chunks and inflates the IDAT stream synchronously to verify it.
	 */
	isPdfSafeImage(buffer)
	{
		if (!Buffer.isBuffer(buffer) || buffer.length < 12)
		{
			return false;
		}
		if (buffer[0] === 0xFF && buffer[1] === 0xD8)
		{
			return true;
		}
		if (!buffer.slice(0, 8).equals(PNG_SIGNATURE))
		{
			return false;
		}

		let pos = 8;
		let hasHeader = false;
		let idatChunks = [];
		while (pos + 8 <= buffer.length)
		{
			let length = buffer.readUInt32BE(pos);
			let type = buffer.toString("ascii", pos + 4, pos + 8);
			if (pos + 12 + length > buffer.length)
			{
				return false;
			}
			if (type === "IHDR")
			{
				hasHeader = true;
			}
			else if (type === "IDAT")
			{
				idatChunks.push(buffer.slice(pos + 8, pos + 8 + length));
			}
			else if (type === "IEND")
			{
				break;
			}
			pos += 12 + length;
		}
		if (!hasHeader || idatChunks.length === 0)
		{
			return false;
		}

		try
		{
			zlib.inflateSync(Buffer.concat(idatChunks));
			return true;
		}
		catch (e)
		{
			return false;
		}
	},

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
	 * Get a community name by ID. Returns an empty string if not found (or soft-deleted).
	 */
	getCommunityName(communityId)
	{
		let rows = $Db.executeQuery(
			`SELECT COM_NAME FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
			[communityId]);
		return rows.length > 0 ? rows[0].COM_NAME : "";
	},

	/**
	 * Batch-resolve uploaded file IDs to stored file names in a single query.
	 * Returns an object keyed by file ID: { fileId: "file_name.ext", ... }. Unknown IDs are omitted.
	 */
	getFileNamesByIds(fileIds)
	{
		let map = {};
		if (!fileIds || fileIds.length === 0)
		{
			return map;
		}

		let uniqueIds = [...new Set(fileIds)];
		let rows = $Db.executeQuery(
			`SELECT FIL_ID, FIL_FILE_NAME FROM \`file\` WHERE FIL_ID IN (${uniqueIds.toPlaceholders()})`,
			uniqueIds);

		for (let i = 0; i < rows.length; i++)
		{
			map[rows[i].FIL_ID] = rows[i].FIL_FILE_NAME;
		}

		return map;
	},

	/**
	 * Parse a JSON column value. Returns `fallback` for null/undefined/empty values or invalid JSON.
	 * Non-string values (already parsed by the driver) are returned as-is.
	 */
	parseJson(val, fallback = null)
	{
		if (val === null || val === undefined || val === "")
		{
			return fallback;
		}
		if (typeof val !== "string")
		{
			return val;
		}
		try
		{
			return JSON.parse(val);
		}
		catch (e)
		{
			return fallback;
		}
	},

	/**
	 * Get the IDs of all items in a $DataItems table whose attribute equals the given value.
	 */
	getDataItemIdsByAttr(dataTable, attrName, attrVal)
	{
		return Object.keys($DataItems.filterItemsIdByAttr(attrName, attrVal, dataTable) || {});
	},

	/**
	 * Get an officer's latest GPS log entry, or null if none exists.
	 */
	getOfficerLatestLocation(officerId)
	{
		let rows = $Db.executeQuery(
			`SELECT GPL_ID, GPL_OFC_USR_ID, GPL_COM_ID,
			        GPL_LATITUDE, GPL_LONGITUDE,
			        GPL_ACCURACY, GPL_SPEED, GPL_HEADING, GPL_ALTITUDE,
			        GPL_SFT_ID, GPL_SVC_ID, GPL_SOURCE, GPL_CREATED_ON
			 FROM \`gps_log\`
			 WHERE GPL_OFC_USR_ID=?
			 ORDER BY GPL_CREATED_ON DESC, GPL_ID DESC
			 LIMIT 1`,
			[officerId]);
		return rows.length > 0 ? rows[0] : null;
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
