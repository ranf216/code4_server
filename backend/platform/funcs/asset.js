const TABLE_ASSET_TYPE = "asset_type";
const TABLE_ASSET_SHAPE = "asset_shape";
const TABLE_POST_PRIORITY = "post_priority";
const TABLE_MAP_ZONE_TYPE = "map_zone_type";
const MAX_BATCH_SIZE = 100;
// Default map item limit per community (assets + posts + zones).
// Will be overridden by settings:asset → max_map_items_per_community when available.
const DEFAULT_MAX_MAP_ITEMS = 1000;

function fetchAssetRecord(assetId)
{
	let rows = $Db.executeQuery(
		`SELECT AST_ID, AST_COM_ID, AST_TYPE, AST_SHAPE, AST_LOCATION,
		        AST_DESCRIPTION, AST_ACRES, AST_INSTALLATION_DATE, AST_REPLACEMENT_DATE,
		        AST_CREATED_BY, AST_CREATED_ON, AST_LAST_UPDATE
		 FROM \`asset\`
		 WHERE AST_ID=? AND AST_DELETED_ON IS NULL`,
		[assetId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchPostRecord(postId)
{
	let rows = $Db.executeQuery(
		`SELECT PST_ID, PST_COM_ID, PST_NAME, PST_DESCRIPTION, PST_PRIORITY,
		        PST_SHAPE, PST_LOCATION, PST_EQUIPMENT, PST_PERMISSIONS,
		        PST_IS_ACTIVE, PST_CREATED_BY, PST_CREATED_ON, PST_LAST_UPDATE
		 FROM \`post\`
		 WHERE PST_ID=? AND PST_DELETED_ON IS NULL`,
		[postId]);
	return rows.length > 0 ? rows[0] : null;
}

function fetchMapZoneRecord(zoneId)
{
	let rows = $Db.executeQuery(
		`SELECT MZN_ID, MZN_COM_ID, MZN_TYPE, MZN_NAME, MZN_LOCATION,
		        MZN_CREATED_BY, MZN_CREATED_ON, MZN_LAST_UPDATE
		 FROM \`map_zone\`
		 WHERE MZN_ID=? AND MZN_DELETED_ON IS NULL`,
		[zoneId]);
	return rows.length > 0 ? rows[0] : null;
}

function communityExists(communityId)
{
	let rows = $Db.executeQuery(
		`SELECT COM_ID FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
		[communityId]);
	return rows.length > 0;
}

function getOfficerCommunityId(userId)
{
	let rows = $Db.executeQuery(
		`SELECT USD_COM_ID FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
		[userId]);
	return rows.length > 0 ? rows[0].USD_COM_ID : null;
}

function getMaxMapItems()
{
	// Read from settings:asset namespace if available; fall back to default
	try
	{
		let rows = $Db.executeQuery(
			`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY='settings:asset'`);
		if (rows.length > 0)
		{
			let settings = JSON.parse(rows[0].KVL_VALUE);
			if (settings.max_map_items_per_community > 0)
			{
				return settings.max_map_items_per_community;
			}
		}
	}
	catch (e) { /* use default */ }
	return DEFAULT_MAX_MAP_ITEMS;
}

function getMapItemCount(communityId)
{
	let rows = $Db.executeQuery(
		`SELECT COUNT(*) AS total_items
		 FROM (
		     SELECT AST_ID FROM \`asset\`
		     WHERE AST_COM_ID=? AND AST_DELETED_ON IS NULL
		     UNION ALL
		     SELECT PST_ID FROM \`post\`
		     WHERE PST_COM_ID=? AND PST_DELETED_ON IS NULL
		     UNION ALL
		     SELECT MZN_ID FROM \`map_zone\`
		     WHERE MZN_COM_ID=? AND MZN_DELETED_ON IS NULL
		 ) combined_map_items`,
		[communityId, communityId, communityId]);
	return rows.length > 0 ? rows[0].total_items : 0;
}

const SQ_METERS_PER_ACRE = 4046.8564224;

/**
 * Calculate area in acres for an asset based on its shape and location.
 * - place (point): 0 acres
 * - line: 0 acres
 * - circle: pi * r^2 / SQ_METERS_PER_ACRE  (radius in meters from location JSON)
 */
function calculateAcres(shape, locationObj)
{
	if (!locationObj || shape !== $Const.ASSET_SHAPE_CIRCLE)
	{
		return 0;
	}
	let radius = locationObj.radius || 0;
	if (radius <= 0)
	{
		return 0;
	}
	let sqMeters = Math.PI * radius * radius;
	return Math.round((sqMeters / SQ_METERS_PER_ACRE) * 10000) / 10000;
}

function parseLocationJson(locationStr)
{
	if ($Utils.empty(locationStr))
	{
		return null;
	}
	try
	{
		return typeof locationStr === "string" ? JSON.parse(locationStr) : locationStr;
	}
	catch (e)
	{
		return null;
	}
}

function mapAssetRow(row)
{
	return {
		asset_id: row.AST_ID,
		community_id: row.AST_COM_ID,
		community_name: row.COM_NAME || null,
		asset_type: row.AST_TYPE,
		asset_type_name: $DataItems.getItemName(row.AST_TYPE, TABLE_ASSET_TYPE) || row.AST_TYPE,
		shape: row.AST_SHAPE,
		location: row.AST_LOCATION ? (typeof row.AST_LOCATION === "string" ? JSON.parse(row.AST_LOCATION) : row.AST_LOCATION) : null,
		description: row.AST_DESCRIPTION || null,
		acres: row.AST_ACRES != null ? parseFloat(row.AST_ACRES) : 0,
		installation_date: row.AST_INSTALLATION_DATE || null,
		replacement_date: row.AST_REPLACEMENT_DATE || null,
		created_by: row.AST_CREATED_BY,
		created_on: row.AST_CREATED_ON,
		last_update: row.AST_LAST_UPDATE || null,
	};
}

function mapPostRow(row)
{
	return {
		post_id: row.PST_ID,
		community_id: row.PST_COM_ID,
		community_name: row.COM_NAME || null,
		name: row.PST_NAME,
		description: row.PST_DESCRIPTION || null,
		priority: row.PST_PRIORITY,
		shape: row.PST_SHAPE,
		location: row.PST_LOCATION ? (typeof row.PST_LOCATION === "string" ? JSON.parse(row.PST_LOCATION) : row.PST_LOCATION) : null,
		equipment: row.PST_EQUIPMENT || null,
		// PST_PERMISSIONS: scheduling allocation requirements (roles, badges, equipment).
		// Validated during shift assignment in Phase 5.1; stored as-is here.
		permissions: row.PST_PERMISSIONS ? (typeof row.PST_PERMISSIONS === "string" ? JSON.parse(row.PST_PERMISSIONS) : row.PST_PERMISSIONS) : null,
		is_active: row.PST_IS_ACTIVE === 1,
		created_by: row.PST_CREATED_BY,
		created_on: row.PST_CREATED_ON,
		last_update: row.PST_LAST_UPDATE || null,
	};
}

function mapZoneRow(row)
{
	return {
		zone_id: row.MZN_ID,
		community_id: row.MZN_COM_ID,
		community_name: row.COM_NAME || null,
		zone_type: row.MZN_TYPE,
		zone_type_name: $DataItems.getItemName(row.MZN_TYPE, TABLE_MAP_ZONE_TYPE) || row.MZN_TYPE,
		name: row.MZN_NAME,
		location: row.MZN_LOCATION ? (typeof row.MZN_LOCATION === "string" ? JSON.parse(row.MZN_LOCATION) : row.MZN_LOCATION) : null,
		created_by: row.MZN_CREATED_BY,
		created_on: row.MZN_CREATED_ON,
		last_update: row.MZN_LAST_UPDATE || null,
	};
}

function postHasShiftHistory(postId)
{
	// Check if the `shift_post` table exists and references this post.
	// If the shift module is not yet deployed, this will return false gracefully.
	try
	{
		let rows = $Db.executeQuery(
			`SELECT 1 FROM information_schema.TABLES
			 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shift_post'`);
		if (rows.length === 0)
		{
			return false;
		}
		let refs = $Db.executeQuery(
			`SELECT 1 FROM \`shift_post\` WHERE SHP_PST_ID=? LIMIT 1`,
			[postId]);
		return refs.length > 0;
	}
	catch (e)
	{
		return false;
	}
}


module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
		$DataItems.define(TABLE_ASSET_TYPE);
		$DataItems.define(TABLE_ASSET_SHAPE);
		$DataItems.define(TABLE_POST_PRIORITY);
		$DataItems.define(TABLE_MAP_ZONE_TYPE);
	}

	// =========================================================================
	// Get Assets List
	// =========================================================================

	get_assets_list()
	{
		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let conditions = ["a.AST_DELETED_ON IS NULL", "a.AST_COM_ID=?"];
		let params = [this.$community_id];

		// Asset type filter
		if (!$Utils.empty(this.$asset_type))
		{
			if (!$DataItems.isValidItemId(this.$asset_type, TABLE_ASSET_TYPE))
			{
				return $ERRS.ERR_ASSET_INVALID_TYPE;
			}
			conditions.push("a.AST_TYPE=?");
			params.push(this.$asset_type);
		}

		// Free-text search
		if (!$Utils.empty(this.$search_text))
		{
			conditions.push("a.AST_DESCRIPTION LIKE ?");
			params.push("%" + this.$search_text + "%");
		}

		let whereClause = conditions.join(" AND ");

		// Sort
		let sortColumn = "a.AST_CREATED_ON";
		let validSorts = {created_on: "a.AST_CREATED_ON", asset_type: "a.AST_TYPE"};
		if (this.$sort_by && validSorts[this.$sort_by])
		{
			sortColumn = validSorts[this.$sort_by];
		}
		let sortDir = (this.$sort_dir === "desc") ? "DESC" : "ASC";

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total FROM \`asset\` a WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		// Pagination
		let pageSize = $Config.get("ASSETS_LIST_PAGE_SIZE");
		let offset = this.$page * pageSize;

		// Fetch page
		let rows = $Db.executeQuery(
			`SELECT a.AST_ID, a.AST_COM_ID, a.AST_TYPE, a.AST_SHAPE, a.AST_LOCATION,
			        a.AST_DESCRIPTION, a.AST_ACRES, a.AST_INSTALLATION_DATE, a.AST_REPLACEMENT_DATE,
			        a.AST_CREATED_BY, a.AST_CREATED_ON, a.AST_LAST_UPDATE,
			        c.COM_NAME
			 FROM \`asset\` a
			    LEFT OUTER JOIN \`community\` c ON a.AST_COM_ID = c.COM_ID
			 WHERE ${whereClause}
			 ORDER BY ${sortColumn} ${sortDir}
			 LIMIT ${pageSize} OFFSET ${offset}`,
			params);

		return {...$ERRS.ERR_SUCCESS, num_of_pages: Math.ceil(totalCount / pageSize), num_of_items: totalCount, assets: rows.map(r => mapAssetRow(r))};
	}

	// =========================================================================
	// Get Asset
	// =========================================================================

	get_asset()
	{
		let asset = fetchAssetRecord(this.$asset_id);
		if (!asset)
		{
			return $ERRS.ERR_ASSET_NOT_FOUND;
		}

		// Enrich with community name
		let rows = $Db.executeQuery(
			`SELECT COM_NAME FROM \`community\` WHERE COM_ID=?`,
			[asset.AST_COM_ID]);
		asset.COM_NAME = rows.length > 0 ? rows[0].COM_NAME : null;

		return {...$ERRS.ERR_SUCCESS, asset: mapAssetRow(asset)};
	}

	// =========================================================================
	// Create Asset
	// =========================================================================

	create_asset()
	{
		let userId = this.$Session.userId;

		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		// Map item limit check
		if (getMapItemCount(this.$community_id) + 1 > getMaxMapItems())
		{
			return $ERRS.ERR_MAP_ITEM_LIMIT_EXCEEDED;
		}

		if (!$DataItems.isValidItemId(this.$asset_type, TABLE_ASSET_TYPE))
		{
			return $ERRS.ERR_ASSET_INVALID_TYPE;
		}

		if (!$DataItems.isValidItemId(this.$shape, TABLE_ASSET_SHAPE))
		{
			return $ERRS.ERR_ASSET_INVALID_SHAPE;
		}

		let installationDate = null;
		if (!$Utils.empty(this.$installation_date))
		{
			installationDate = $Utils.validateDateStr(this.$installation_date);
			if (!installationDate) return $ERRS.ERR_ASSET_INVALID_DATE;
		}

		let replacementDate = null;
		if (!$Utils.empty(this.$replacement_date))
		{
			replacementDate = $Utils.validateDateStr(this.$replacement_date);
			if (!replacementDate) return $ERRS.ERR_ASSET_INVALID_DATE;
		}

		let locationObj = parseLocationJson(this.$location);
		let acres = calculateAcres(this.$shape, locationObj);

		let now = $Utils.now();
		$Db.executeQuery(
			`INSERT INTO \`asset\`
			 (AST_COM_ID, AST_TYPE, AST_SHAPE, AST_LOCATION, AST_DESCRIPTION, AST_ACRES,
			  AST_INSTALLATION_DATE, AST_REPLACEMENT_DATE, AST_CREATED_BY, AST_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?,?)`,
			[this.$community_id,
			 this.$asset_type,
			 this.$shape,
			 locationObj ? JSON.stringify(locationObj) : null,
			 this.$description || null,
			 acres,
			 installationDate,
			 replacementDate,
			 userId,
			 now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		return {...$ERRS.ERR_SUCCESS, asset_id: $Db.insertId()};
	}

	// =========================================================================
	// Create Assets Batch
	// =========================================================================

	create_assets_batch()
	{
		let userId = this.$Session.userId;

		if (!this.$locations || this.$locations.length === 0)
		{
			return $ERRS.ERR_ASSET_BATCH_EMPTY;
		}

		if (this.$locations.length > MAX_BATCH_SIZE)
		{
			return $ERRS.ERR_ASSET_BATCH_LIMIT_EXCEEDED;
		}

		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		// Map item limit check (total + new batch size)
		if (getMapItemCount(this.$community_id) + this.$locations.length > getMaxMapItems())
		{
			return $ERRS.ERR_MAP_ITEM_LIMIT_EXCEEDED;
		}

		if (!$DataItems.isValidItemId(this.$asset_type, TABLE_ASSET_TYPE))
		{
			return $ERRS.ERR_ASSET_INVALID_TYPE;
		}

		if (!$DataItems.isValidItemId(this.$shape, TABLE_ASSET_SHAPE))
		{
			return $ERRS.ERR_ASSET_INVALID_SHAPE;
		}

		let installationDate = null;
		if (!$Utils.empty(this.$installation_date))
		{
			installationDate = $Utils.validateDateStr(this.$installation_date);
			if (!installationDate) return $ERRS.ERR_ASSET_INVALID_DATE;
		}

		let replacementDate = null;
		if (!$Utils.empty(this.$replacement_date))
		{
			replacementDate = $Utils.validateDateStr(this.$replacement_date);
			if (!replacementDate) return $ERRS.ERR_ASSET_INVALID_DATE;
		}

		let now = $Utils.now();
		let count = this.$locations.length;

		// Build bulk INSERT — prepare data in memory before DB write
		let placeholders = this.$locations.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(", ");
		let params = [];
		for (let i = 0; i < count; i++)
		{
			let locationObj = parseLocationJson(this.$locations[i]);
			let acres = calculateAcres(this.$shape, locationObj);
			params.push(
				this.$community_id,
				this.$asset_type,
				this.$shape,
				locationObj ? JSON.stringify(locationObj) : null,
				this.$description || null,
				acres,
				installationDate,
				replacementDate,
				userId,
				now);
		}

		$Db.executeQuery(
			`INSERT INTO \`asset\`
			 (AST_COM_ID, AST_TYPE, AST_SHAPE, AST_LOCATION, AST_DESCRIPTION, AST_ACRES,
			  AST_INSTALLATION_DATE, AST_REPLACEMENT_DATE, AST_CREATED_BY, AST_CREATED_ON)
			 VALUES ${placeholders}`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		// MySQL multi-row INSERT returns the first auto-increment ID; subsequent IDs are contiguous
		let firstId = $Db.insertId();
		let assetIds = [];
		for (let i = 0; i < count; i++)
		{
			assetIds.push(firstId + i);
		}

		return {...$ERRS.ERR_SUCCESS, asset_ids: assetIds};
	}

	// =========================================================================
	// Update Asset
	// =========================================================================

	update_asset()
	{
		let asset = fetchAssetRecord(this.$asset_id);
		if (!asset)
		{
			return $ERRS.ERR_ASSET_NOT_FOUND;
		}

		let updates = [];
		let params = [];

		if (this.$asset_type !== null && this.$asset_type !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$asset_type, TABLE_ASSET_TYPE))
			{
				return $ERRS.ERR_ASSET_INVALID_TYPE;
			}
			updates.push("AST_TYPE=?");
			params.push(this.$asset_type);
		}

		if (this.$shape !== null && this.$shape !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$shape, TABLE_ASSET_SHAPE))
			{
				return $ERRS.ERR_ASSET_INVALID_SHAPE;
			}
			updates.push("AST_SHAPE=?");
			params.push(this.$shape);
		}

		if (this.$location !== null && this.$location !== undefined)
		{
			let locationObj = parseLocationJson(this.$location);
			updates.push("AST_LOCATION=?");
			params.push(locationObj ? JSON.stringify(locationObj) : null);
		}

		if (this.$description !== null && this.$description !== undefined)
		{
			updates.push("AST_DESCRIPTION=?");
			params.push($Utils.empty(this.$description) ? null : this.$description);
		}

		if (this.$installation_date !== null && this.$installation_date !== undefined)
		{
			let installationDate = null;
			if (!$Utils.empty(this.$installation_date))
			{
				installationDate = $Utils.validateDateStr(this.$installation_date);
				if (!installationDate) return $ERRS.ERR_ASSET_INVALID_DATE;
			}
			updates.push("AST_INSTALLATION_DATE=?");
			params.push(installationDate);
		}

		if (this.$replacement_date !== null && this.$replacement_date !== undefined)
		{
			let replacementDate = null;
			if (!$Utils.empty(this.$replacement_date))
			{
				replacementDate = $Utils.validateDateStr(this.$replacement_date);
				if (!replacementDate) return $ERRS.ERR_ASSET_INVALID_DATE;
			}
			updates.push("AST_REPLACEMENT_DATE=?");
			params.push(replacementDate);
		}

		// Recalculate acres if shape or location changed
		if ((this.$shape !== null && this.$shape !== undefined) ||
		    (this.$location !== null && this.$location !== undefined))
		{
			let effectiveShape = (this.$shape !== null && this.$shape !== undefined) ? this.$shape : asset.AST_SHAPE;
			let effectiveLocation = (this.$location !== null && this.$location !== undefined)
				? parseLocationJson(this.$location)
				: parseLocationJson(asset.AST_LOCATION);
			updates.push("AST_ACRES=?");
			params.push(calculateAcres(effectiveShape, effectiveLocation));
		}

		if (updates.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("AST_LAST_UPDATE=?");
		params.push(now);
		params.push(this.$asset_id);

		$Db.executeQuery(
			`UPDATE \`asset\` SET ${updates.join(", ")} WHERE AST_ID=? AND AST_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Delete Asset
	// =========================================================================

	delete_asset()
	{
		let asset = fetchAssetRecord(this.$asset_id);
		if (!asset)
		{
			return $ERRS.ERR_ASSET_NOT_FOUND;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`asset\` SET AST_DELETED_ON=?, AST_LAST_UPDATE=? WHERE AST_ID=? AND AST_DELETED_ON IS NULL`,
			[now, now, this.$asset_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Get Posts List
	// =========================================================================

	get_posts_list()
	{
		let userType = this.$Session.userType;
		let communityId = this.$community_id;

		// Officers: auto-resolve community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			communityId = getOfficerCommunityId(this.$Session.userId);
			if (!communityId)
			{
				return {...$ERRS.ERR_SUCCESS, posts: [], total_count: 0};
			}
		}

		if (!communityId || communityId <= 0)
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		if (!communityExists(communityId))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let conditions = ["p.PST_DELETED_ON IS NULL", "p.PST_COM_ID=?"];
		let params = [communityId];

		// Active filter (default: active only)
		if (!this.$include_inactive)
		{
			conditions.push("p.PST_IS_ACTIVE=1");
		}

		// Free-text search
		if (!$Utils.empty(this.$search_text))
		{
			let term = "%" + this.$search_text + "%";
			conditions.push("(p.PST_NAME LIKE ? OR p.PST_DESCRIPTION LIKE ?)");
			params.push(term, term);
		}

		let whereClause = conditions.join(" AND ");

		// Sort
		let sortColumn = "p.PST_NAME";
		let validSorts = {name: "p.PST_NAME", priority: "p.PST_PRIORITY", created_on: "p.PST_CREATED_ON"};
		if (this.$sort_by && validSorts[this.$sort_by])
		{
			sortColumn = validSorts[this.$sort_by];
		}
		let sortDir = (this.$sort_dir === "desc") ? "DESC" : "ASC";

		// Count
		let countRows = $Db.executeQuery(
			`SELECT COUNT(*) total FROM \`post\` p WHERE ${whereClause}`,
			params);
		let totalCount = countRows.length > 0 ? countRows[0].total : 0;

		// Pagination
		let pageSize = $Config.get("POSTS_LIST_PAGE_SIZE");
		let offset = this.$page * pageSize;

		// Fetch page
		let rows = $Db.executeQuery(
			`SELECT p.PST_ID, p.PST_COM_ID, p.PST_NAME, p.PST_DESCRIPTION, p.PST_PRIORITY,
			        p.PST_SHAPE, p.PST_LOCATION, p.PST_EQUIPMENT, p.PST_PERMISSIONS,
			        p.PST_IS_ACTIVE, p.PST_CREATED_BY, p.PST_CREATED_ON, p.PST_LAST_UPDATE,
			        c.COM_NAME
			 FROM \`post\` p
			    LEFT OUTER JOIN \`community\` c ON p.PST_COM_ID = c.COM_ID
			 WHERE ${whereClause}
			 ORDER BY ${sortColumn} ${sortDir}
			 LIMIT ${pageSize} OFFSET ${offset}`,
			params);

		return {...$ERRS.ERR_SUCCESS, num_of_pages: Math.ceil(totalCount / pageSize), num_of_items: totalCount, posts: rows.map(r => mapPostRow(r))};
	}

	// =========================================================================
	// Get Post
	// =========================================================================

	get_post()
	{
		let userType = this.$Session.userType;
		let userId = this.$Session.userId;

		let post = fetchPostRecord(this.$post_id);
		if (!post)
		{
			return $ERRS.ERR_POST_NOT_FOUND;
		}

		// Officers can only view posts in their community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			let officerCommunityId = getOfficerCommunityId(userId);
			if (post.PST_COM_ID !== officerCommunityId)
			{
				return $ERRS.ERR_POST_NOT_FOUND;
			}
		}

		// Enrich with community name
		let rows = $Db.executeQuery(
			`SELECT COM_NAME FROM \`community\` WHERE COM_ID=?`,
			[post.PST_COM_ID]);
		post.COM_NAME = rows.length > 0 ? rows[0].COM_NAME : null;

		return {...$ERRS.ERR_SUCCESS, post: mapPostRow(post)};
	}

	// =========================================================================
	// Create Post
	// =========================================================================

	create_post()
	{
		let userId = this.$Session.userId;

		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		// Map item limit check
		if (getMapItemCount(this.$community_id) + 1 > getMaxMapItems())
		{
			return $ERRS.ERR_MAP_ITEM_LIMIT_EXCEEDED;
		}

		// Validate name length
		let postName = (this.$name || "").trim();
		if (postName.length === 0 || postName.length > 60)
		{
			return $ERRS.ERR_INVALID_API_PARAM;
		}

		// Check uniqueness within community
		let existing = $Db.executeQuery(
			`SELECT PST_ID FROM \`post\`
			 WHERE PST_COM_ID=? AND PST_NAME=? AND PST_DELETED_ON IS NULL`,
			[this.$community_id, postName]);
		if (existing.length > 0)
		{
			return $ERRS.ERR_POST_NAME_ALREADY_EXISTS;
		}

		if (!$DataItems.isValidItemId(this.$priority, TABLE_POST_PRIORITY))
		{
			return $ERRS.ERR_POST_INVALID_PRIORITY;
		}

		if (!$DataItems.isValidItemId(this.$shape, TABLE_ASSET_SHAPE))
		{
			return $ERRS.ERR_POST_INVALID_SHAPE;
		}

		let locationObj = parseLocationJson(this.$location);
		let permissionsObj = parseLocationJson(this.$permissions);
		let isActive = this.$is_active === false ? 0 : 1;

		let now = $Utils.now();
		$Db.executeQuery(
			`INSERT INTO \`post\`
			 (PST_COM_ID, PST_NAME, PST_DESCRIPTION, PST_PRIORITY, PST_SHAPE,
			  PST_LOCATION, PST_EQUIPMENT, PST_PERMISSIONS, PST_IS_ACTIVE,
			  PST_CREATED_BY, PST_CREATED_ON)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
			[this.$community_id,
			 postName,
			 this.$description || null,
			 this.$priority,
			 this.$shape,
			 locationObj ? JSON.stringify(locationObj) : null,
			 this.$equipment || null,
			 permissionsObj ? JSON.stringify(permissionsObj) : null,
			 isActive,
			 userId,
			 now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		return {...$ERRS.ERR_SUCCESS, post_id: $Db.insertId()};
	}

	// =========================================================================
	// Update Post
	// =========================================================================

	update_post()
	{
		let post = fetchPostRecord(this.$post_id);
		if (!post)
		{
			return $ERRS.ERR_POST_NOT_FOUND;
		}

		let updates = [];
		let params = [];

		if (this.$name !== null && this.$name !== undefined)
		{
			let postName = (this.$name || "").trim();
			if (postName.length === 0 || postName.length > 60)
			{
				return $ERRS.ERR_INVALID_API_PARAM;
			}
			// Check uniqueness
			if (postName !== post.PST_NAME)
			{
				let existing = $Db.executeQuery(
					`SELECT PST_ID FROM \`post\`
					 WHERE PST_COM_ID=? AND PST_NAME=? AND PST_DELETED_ON IS NULL AND PST_ID!=?`,
					[post.PST_COM_ID, postName, this.$post_id]);
				if (existing.length > 0)
				{
					return $ERRS.ERR_POST_NAME_ALREADY_EXISTS;
				}
			}
			updates.push("PST_NAME=?");
			params.push(postName);
		}

		if (this.$description !== null && this.$description !== undefined)
		{
			updates.push("PST_DESCRIPTION=?");
			params.push($Utils.empty(this.$description) ? null : this.$description);
		}

		if (this.$priority !== null && this.$priority !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$priority, TABLE_POST_PRIORITY))
			{
				return $ERRS.ERR_POST_INVALID_PRIORITY;
			}
			updates.push("PST_PRIORITY=?");
			params.push(this.$priority);
		}

		if (this.$shape !== null && this.$shape !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$shape, TABLE_ASSET_SHAPE))
			{
				return $ERRS.ERR_POST_INVALID_SHAPE;
			}
			updates.push("PST_SHAPE=?");
			params.push(this.$shape);
		}

		if (this.$location !== null && this.$location !== undefined)
		{
			let locationObj = parseLocationJson(this.$location);
			updates.push("PST_LOCATION=?");
			params.push(locationObj ? JSON.stringify(locationObj) : null);
		}

		if (this.$equipment !== null && this.$equipment !== undefined)
		{
			updates.push("PST_EQUIPMENT=?");
			params.push($Utils.empty(this.$equipment) ? null : this.$equipment);
		}

		if (this.$permissions !== null && this.$permissions !== undefined)
		{
			let permissionsObj = parseLocationJson(this.$permissions);
			updates.push("PST_PERMISSIONS=?");
			params.push(permissionsObj ? JSON.stringify(permissionsObj) : null);
		}

		if (this.$is_active !== null && this.$is_active !== undefined)
		{
			updates.push("PST_IS_ACTIVE=?");
			params.push(this.$is_active ? 1 : 0);
		}

		if (updates.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("PST_LAST_UPDATE=?");
		params.push(now);
		params.push(this.$post_id);

		$Db.executeQuery(
			`UPDATE \`post\` SET ${updates.join(", ")} WHERE PST_ID=? AND PST_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Delete Post
	// =========================================================================

	delete_post()
	{
		let post = fetchPostRecord(this.$post_id);
		if (!post)
		{
			return $ERRS.ERR_POST_NOT_FOUND;
		}

		// A post that has been used in a shift cannot be deleted, only deactivated
		if (postHasShiftHistory(this.$post_id))
		{
			return $ERRS.ERR_POST_HAS_SHIFT_HISTORY;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`post\` SET PST_DELETED_ON=?, PST_LAST_UPDATE=? WHERE PST_ID=? AND PST_DELETED_ON IS NULL`,
			[now, now, this.$post_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Get Map Zones
	// =========================================================================

	get_map_zones()
	{
		let userType = this.$Session.userType;
		let communityId = this.$community_id;

		// Officers: auto-resolve community
		if (userType === $Const.USER_TYPE_OFFICER)
		{
			communityId = getOfficerCommunityId(this.$Session.userId);
			if (!communityId)
			{
				return {...$ERRS.ERR_SUCCESS, zones: []};
			}
		}

		if (!communityId || communityId <= 0)
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		if (!communityExists(communityId))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let conditions = ["z.MZN_DELETED_ON IS NULL", "z.MZN_COM_ID=?"];
		let params = [communityId];

		if (!$Utils.empty(this.$zone_type))
		{
			if (!$DataItems.isValidItemId(this.$zone_type, TABLE_MAP_ZONE_TYPE))
			{
				return $ERRS.ERR_MAP_ZONE_INVALID_TYPE;
			}
			conditions.push("z.MZN_TYPE=?");
			params.push(this.$zone_type);
		}

		let rows = $Db.executeQuery(
			`SELECT z.MZN_ID, z.MZN_COM_ID, z.MZN_TYPE, z.MZN_NAME, z.MZN_LOCATION,
			        z.MZN_CREATED_BY, z.MZN_CREATED_ON, z.MZN_LAST_UPDATE,
			        c.COM_NAME
			 FROM \`map_zone\` z
			    LEFT OUTER JOIN \`community\` c ON z.MZN_COM_ID = c.COM_ID
			 WHERE ${conditions.join(" AND ")}
			 ORDER BY z.MZN_TYPE ASC, z.MZN_NAME ASC`,
			params);

		return {...$ERRS.ERR_SUCCESS, zones: rows.map(r => mapZoneRow(r))};
	}

	// =========================================================================
	// Create Map Zone
	// =========================================================================

	create_map_zone()
	{
		let userId = this.$Session.userId;

		if (!communityExists(this.$community_id))
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		// Map item limit check
		if (getMapItemCount(this.$community_id) + 1 > getMaxMapItems())
		{
			return $ERRS.ERR_MAP_ITEM_LIMIT_EXCEEDED;
		}

		if (!$DataItems.isValidItemId(this.$zone_type, TABLE_MAP_ZONE_TYPE))
		{
			return $ERRS.ERR_MAP_ZONE_INVALID_TYPE;
		}

		let locationObj = parseLocationJson(this.$location);

		let now = $Utils.now();
		$Db.executeQuery(
			`INSERT INTO \`map_zone\`
			 (MZN_COM_ID, MZN_TYPE, MZN_NAME, MZN_LOCATION, MZN_CREATED_BY, MZN_CREATED_ON)
			 VALUES (?,?,?,?,?,?)`,
			[this.$community_id,
			 this.$zone_type,
			 this.$name,
			 locationObj ? JSON.stringify(locationObj) : null,
			 userId,
			 now]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		return {...$ERRS.ERR_SUCCESS, zone_id: $Db.insertId()};
	}

	// =========================================================================
	// Update Map Zone
	// =========================================================================

	update_map_zone()
	{
		let zone = fetchMapZoneRecord(this.$zone_id);
		if (!zone)
		{
			return $ERRS.ERR_MAP_ZONE_NOT_FOUND;
		}

		let updates = [];
		let params = [];

		if (this.$zone_type !== null && this.$zone_type !== undefined)
		{
			if (!$DataItems.isValidItemId(this.$zone_type, TABLE_MAP_ZONE_TYPE))
			{
				return $ERRS.ERR_MAP_ZONE_INVALID_TYPE;
			}
			updates.push("MZN_TYPE=?");
			params.push(this.$zone_type);
		}

		if (this.$name !== null && this.$name !== undefined)
		{
			updates.push("MZN_NAME=?");
			params.push(this.$name);
		}

		if (this.$location !== null && this.$location !== undefined)
		{
			let locationObj = parseLocationJson(this.$location);
			updates.push("MZN_LOCATION=?");
			params.push(locationObj ? JSON.stringify(locationObj) : null);
		}

		if (updates.length === 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let now = $Utils.now();
		updates.push("MZN_LAST_UPDATE=?");
		params.push(now);
		params.push(this.$zone_id);

		$Db.executeQuery(
			`UPDATE \`map_zone\` SET ${updates.join(", ")} WHERE MZN_ID=? AND MZN_DELETED_ON IS NULL`,
			params);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Delete Map Zone
	// =========================================================================

	delete_map_zone()
	{
		let zone = fetchMapZoneRecord(this.$zone_id);
		if (!zone)
		{
			return $ERRS.ERR_MAP_ZONE_NOT_FOUND;
		}

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`map_zone\` SET MZN_DELETED_ON=?, MZN_LAST_UPDATE=? WHERE MZN_ID=? AND MZN_DELETED_ON IS NULL`,
			[now, now, this.$zone_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return $ERRS.ERR_SUCCESS;
	}

	// =========================================================================
	// Upload Community Map
	// =========================================================================

	upload_community_map()
	{
		let userId = this.$Session.userId;

		let comRows = $Db.executeQuery(
			`SELECT COM_ID, COM_MAP_IMAGE FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
			[this.$community_id]);
		if (comRows.length === 0)
		{
			return $ERRS.ERR_COMMUNITY_NOT_FOUND;
		}

		let oldImage = comRows[0].COM_MAP_IMAGE;
		let rv = $Utils.saveNewImageOrKeepOld(userId, this.$map_image, oldImage, "community");
		if ($Err.isERR(rv)) return rv;

		let now = $Utils.now();
		$Db.executeQuery(
			`UPDATE \`community\` SET COM_MAP_IMAGE=?, COM_LAST_UPDATE=? WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
			[rv.image_name, now, this.$community_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		let filesSql = new $Files.SQL("COM_MAP_IMAGE");
		let mapRows = $Db.executeQuery(
			`SELECT ${filesSql.select()} FROM \`community\` ${filesSql.join()} WHERE COM_ID=?`,
			[this.$community_id]);

		let mapImageUrl = mapRows.length > 0 ? $Files.getUrl(filesSql.get(mapRows[0])) : null;

		return {...$ERRS.ERR_SUCCESS, map_image_url: mapImageUrl};
	}

	// =========================================================================
	// Get Asset Metadata
	// =========================================================================

	get_asset_metadata()
	{
		return {
			...$ERRS.ERR_SUCCESS,
			asset_types: $DataItems.getList(TABLE_ASSET_TYPE),
			asset_shapes: $DataItems.getList(TABLE_ASSET_SHAPE),
			post_priorities: $DataItems.getList(TABLE_POST_PRIORITY),
			map_zone_types: $DataItems.getList(TABLE_MAP_ZONE_TYPE)
		};
	}
};
