const MAX_MEDIA_COUNT = 5;

function fetchCallRecord(callId)
{
    let rows = $Db.executeQuery(
        `SELECT SVC_ID, SVC_CATEGORY, SVC_SERVICE_TYPE, SVC_RES_USR_ID, SVC_OFC_USR_ID,
                SVC_COM_ID, SVC_STATUS, SVC_PRIORITY, SVC_DESCRIPTION,
                SVC_ADDRESS, SVC_CURRENT_ADDRESS, SVC_LATITUDE, SVC_LONGITUDE,
                SVC_SCHEDULED_DATE, SVC_SCHEDULED_TIME_FROM, SVC_SCHEDULED_TIME_TO,
                SVC_MEDIA, SVC_AUDIO, SVC_VIDEO,
                SVC_CONFIRMATION_MEDIA, SVC_CONFIRMATION_VIDEO,
                SVC_OFFICER_COMMENTS, SVC_REACTION, SVC_RESIDENT_COMMENT,
                SVC_PASSED_BY, SVC_ASSIGNED_BY,
                SVC_ACCEPTED_ON, SVC_RESOLVED_ON, SVC_CANCELED_ON,
                SVC_CREATED_ON, SVC_LAST_UPDATE, SVC_DELETED_ON
         FROM \`service_call\`
         WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
        [callId]);
    return rows.length > 0 ? rows[0] : null;
}

function parseMediaArray(jsonVal)
{
    if (!jsonVal)
    {
        return [];
    }
    let arr = (typeof jsonVal === "string") ? JSON.parse(jsonVal) : jsonVal;
    if (!Array.isArray(arr))
    {
        return [];
    }
    return arr.map(name => $Files.getUrl({file_name: name})).filter(url => url);
}

function parsePassedByArray(jsonVal)
{
    if (!jsonVal)
    {
        return [];
    }
    let arr = (typeof jsonVal === "string") ? JSON.parse(jsonVal) : jsonVal;
    return Array.isArray(arr) ? arr : [];
}

function resolveFileList(newFileIds, keepUrls)
{
    let fileNames = [];

    if (keepUrls && keepUrls.length > 0)
    {
        for (let i = 0; i < keepUrls.length; i++)
        {
            let fileName = $Files.getFileNameFromUrl(keepUrls[i]);
            if (!$Utils.empty(fileName))
            {
                fileNames.push(fileName);
            }
        }
    }

    if (newFileIds && newFileIds.length > 0)
    {
        let fileRows = $Db.executeQuery(
            `SELECT FIL_ID, FIL_FILE_NAME FROM \`file\` WHERE FIL_ID IN (${newFileIds.toPlaceholders()})`,
            newFileIds);
        if (fileRows.length !== newFileIds.length)
        {
            return $ERRS.ERR_FILE_NOT_FOUND;
        }
        for (let i = 0; i < fileRows.length; i++)
        {
            fileNames.push(fileRows[i].FIL_FILE_NAME);
        }
    }

    return {file_names: fileNames};
}

function resolveSingleFile(fileId)
{
    if ($Utils.empty(fileId))
    {
        return {file_name: ""};
    }
    let fileRows = $Db.executeQuery(
        `SELECT FIL_FILE_NAME FROM \`file\` WHERE FIL_ID=?`,
        [fileId]);
    if (fileRows.length === 0)
    {
        return $ERRS.ERR_FILE_NOT_FOUND;
    }
    return {file_name: fileRows[0].FIL_FILE_NAME};
}

function mapCallRow(row)
{
    return {
        call_id: row.SVC_ID,
        category: row.SVC_CATEGORY,
        service_type: row.SVC_SERVICE_TYPE || null,
        status: row.SVC_STATUS,
        priority: row.SVC_PRIORITY,
        description: row.SVC_DESCRIPTION || "",
        address: row.SVC_ADDRESS || "",
        current_address: row.SVC_CURRENT_ADDRESS || "",
        latitude: row.SVC_LATITUDE ? parseFloat(row.SVC_LATITUDE) : null,
        longitude: row.SVC_LONGITUDE ? parseFloat(row.SVC_LONGITUDE) : null,
        scheduled_date: row.SVC_SCHEDULED_DATE || null,
        scheduled_time_from: row.SVC_SCHEDULED_TIME_FROM || null,
        scheduled_time_to: row.SVC_SCHEDULED_TIME_TO || null,
        media: parseMediaArray(row.SVC_MEDIA),
        audio_url: row.SVC_AUDIO ? $Files.getUrl({file_name: row.SVC_AUDIO}) : null,
        video_url: row.SVC_VIDEO ? $Files.getUrl({file_name: row.SVC_VIDEO}) : null,
        confirmation_media: parseMediaArray(row.SVC_CONFIRMATION_MEDIA),
        confirmation_video_url: row.SVC_CONFIRMATION_VIDEO ? $Files.getUrl({file_name: row.SVC_CONFIRMATION_VIDEO}) : null,
        officer_comments: row.SVC_OFFICER_COMMENTS || "",
        reaction: row.SVC_REACTION,
        resident_comment: row.SVC_RESIDENT_COMMENT || "",
        resident_user_id: row.SVC_RES_USR_ID,
        resident_name: row.RES_FIRST_NAME ? (row.RES_FIRST_NAME + " " + (row.RES_LAST_NAME || "")).trim() : null,
        officer_user_id: row.SVC_OFC_USR_ID || null,
        officer_name: row.OFC_FIRST_NAME ? (row.OFC_FIRST_NAME + " " + (row.OFC_LAST_NAME || "")).trim() : null,
        community_id: row.SVC_COM_ID,
        community_name: row.COM_NAME || null,
        assigned_by: row.SVC_ASSIGNED_BY || null,
        accepted_on: row.SVC_ACCEPTED_ON || null,
        resolved_on: row.SVC_RESOLVED_ON || null,
        canceled_on: row.SVC_CANCELED_ON || null,
        created_on: row.SVC_CREATED_ON,
        last_update: row.SVC_LAST_UPDATE || null,
    };
}

function getOfficerCommunityId(userId)
{
    let rows = $Db.executeQuery(
        `SELECT USD_COM_ID FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
        [userId]);
    return rows.length > 0 ? rows[0].USD_COM_ID : null;
}

function getActiveAdminIds()
{
    let rows = $Db.executeQuery(
        `SELECT USR_ID
         FROM \`user\`
            JOIN \`user_details\` ON USR_ID = USD_USR_ID
         WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_DELETED_ON IS NULL`,
        [$Const.USER_TYPE_ADMIN]);
    return rows.map(r => r.USR_ID);
}

function getOfficerIdsInCommunity(communityId)
{
    let rows = $Db.executeQuery(
        `SELECT USR_ID
         FROM \`user\`
            JOIN \`user_details\` ON USR_ID = USD_USR_ID
            JOIN \`officer\` ON USR_ID = OFC_USR_ID
         WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_COM_ID=?
           AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL`,
        [$Const.USER_TYPE_OFFICER, communityId]);
    return rows.map(r => r.USR_ID);
}

function getUserName(userId)
{
    let rows = $Db.executeQuery(
        `SELECT USD_FIRST_NAME, USD_LAST_NAME FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
        [userId]);
    if (rows.length === 0)
    {
        return "Unknown";
    }
    return (rows[0].USD_FIRST_NAME + " " + (rows[0].USD_LAST_NAME || "")).trim();
}

module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

    // =========================================================================
    // Create Call
    // =========================================================================

    create_call()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;
        let userType = this.$Session.userType;

        // Validate category
        if (!$DataItems.isValidItemId(this.$category, "call_category"))
        {
            return $ERRS.ERR_CALL_INVALID_CATEGORY;
        }

        // Officers can only create panic calls
        if (userType === $Const.USER_TYPE_OFFICER && this.$category !== $Const.CALL_CATEGORY_PANIC)
        {
            return $ERRS.ERR_NO_PRIVILEGES;
        }

        // Validate priority
        if (!$DataItems.isValidItemId(this.$priority, "call_priority"))
        {
            return $ERRS.ERR_CALL_INVALID_PRIORITY;
        }

        // Validate service_type for concierge calls
        if (this.$category === $Const.CALL_CATEGORY_CONCIERGE_SERVICE)
        {
            if ($Utils.empty(this.$service_type))
            {
                return $ERRS.ERR_CALL_INVALID_SERVICE_TYPE;
            }
            if (!$DataItems.isValidItemId(this.$service_type, "service_type"))
            {
                return $ERRS.ERR_CALL_INVALID_SERVICE_TYPE;
            }
        }

        // Get creator's community
        let creatorRows = $Db.executeQuery(
            `SELECT USD_COM_ID FROM \`user_details\` WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
            [userId]);
        if (creatorRows.length === 0 || !creatorRows[0].USD_COM_ID)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }
        let communityId = creatorRows[0].USD_COM_ID;

        // For emergency categories, check if resident already has an active emergency
        if ($CallUtils.isEmergencyCategory(this.$category))
        {
            let emergencyCategories = $CallUtils.emergencyCategories();
            let openStatuses = $CallUtils.openStatuses();

            let activeEmergency = $Db.executeQuery(
                `SELECT SVC_ID FROM \`service_call\`
                 WHERE SVC_RES_USR_ID=?
                   AND SVC_CATEGORY IN (${emergencyCategories.toPlaceholders()})
                   AND SVC_STATUS IN (${openStatuses.toPlaceholders()})
                   AND SVC_DELETED_ON IS NULL
                 LIMIT 1`,
                [userId, ...emergencyCategories, ...openStatuses]);
            if (activeEmergency.length > 0)
            {
                return $ERRS.ERR_CALL_ACTIVE_EMERGENCY_EXISTS;
            }
        }

        // Resolve media files
        let mediaJson = null;
        if (this.$media_file_ids && this.$media_file_ids.length > 0)
        {
            if (this.$media_file_ids.length > MAX_MEDIA_COUNT)
            {
                return $ERRS.ERR_CALL_MEDIA_LIMIT_REACHED;
            }
            let rv = resolveFileList(this.$media_file_ids, null);
            if ($Err.isERR(rv)) return rv;
            mediaJson = JSON.stringify(rv.file_names);
        }

        // Resolve audio file
        let audioFileName = null;
        if (!$Utils.empty(this.$audio_file_id))
        {
            let rv = resolveSingleFile(this.$audio_file_id);
            if ($Err.isERR(rv)) return rv;
            audioFileName = rv.file_name;
        }

        // Resolve video file
        let videoFileName = null;
        if (!$Utils.empty(this.$video_file_id))
        {
            let rv = resolveSingleFile(this.$video_file_id);
            if ($Err.isERR(rv)) return rv;
            videoFileName = rv.file_name;
        }

        let now = $Utils.now();

        // Determine priority based on category
        let priority = this.$priority;
        if ($CallUtils.forcesUrgentPriority(this.$category))
        {
            priority = $Const.CALL_PRIORITY_URGENT;
        }

        $Db.executeQuery(
            `INSERT INTO \`service_call\`
             (SVC_CATEGORY, SVC_SERVICE_TYPE, SVC_RES_USR_ID, SVC_COM_ID, SVC_STATUS, SVC_PRIORITY,
              SVC_DESCRIPTION, SVC_ADDRESS, SVC_CURRENT_ADDRESS, SVC_LATITUDE, SVC_LONGITUDE,
              SVC_SCHEDULED_DATE, SVC_SCHEDULED_TIME_FROM, SVC_SCHEDULED_TIME_TO,
              SVC_MEDIA, SVC_AUDIO, SVC_VIDEO, SVC_CREATED_ON)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [this.$category,
             this.$category === $Const.CALL_CATEGORY_CONCIERGE_SERVICE ? this.$service_type : null,
             userId,
             communityId,
             $Const.CALL_STATUS_NEW,
             priority,
             this.$description || null,
             this.$address || null,
             this.$current_address || null,
             this.$latitude ? parseFloat(this.$latitude) : null,
             this.$longitude ? parseFloat(this.$longitude) : null,
             this.$scheduled_date || null,
             this.$scheduled_time_from || null,
             this.$scheduled_time_to || null,
             mediaJson,
             audioFileName,
             videoFileName,
             now]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        let callId = $Db.insertId();
        vals.call_id = callId;

        // Send notifications based on category
        let creatorName = getUserName(userId);

        if ($CallUtils.isEmergencyCategory(this.$category))
        {
            // Notify all officers in community
            let officerIds = getOfficerIdsInCommunity(communityId);
            if (officerIds.length > 0)
            {
                $executeAPI(this.$Session, "Notification/create_bulk_notifications", {
                    target_user_ids: officerIds,
                    type: "new_emergency",
                    template_vars: JSON.stringify({call_number: String(callId), call_creator: creatorName, service_category: this.$category}),
                    payload: JSON.stringify({entity_type: "call", entity_id: callId}),
                    community_id: communityId,
                    send_push: true
                });
            }
        }
        else if (this.$category === $Const.CALL_CATEGORY_CONCIERGE_SERVICE)
        {
            // Notify all active admins — concierge calls require admin assignment, not officer broadcast
            let adminIds = getActiveAdminIds();
            if (adminIds.length > 0)
            {
                $executeAPI(this.$Session, "Notification/create_bulk_notifications", {
                    target_user_ids: adminIds,
                    type: "new_service_call",
                    template_vars: JSON.stringify({call_number: String(callId), call_creator: creatorName, service_category: this.$service_type || "service"}),
                    payload: JSON.stringify({entity_type: "call", entity_id: callId}),
                    community_id: communityId,
                    send_push: true
                });
            }
        }
        else if (this.$category === $Const.CALL_CATEGORY_PANIC)
        {
            // Notify all officers in community
            let officerIds = getOfficerIdsInCommunity(communityId);
            if (officerIds.length > 0)
            {
                $executeAPI(this.$Session, "Notification/create_bulk_notifications", {
                    target_user_ids: officerIds,
                    type: "panic_button",
                    template_vars: JSON.stringify({officer_name: creatorName, location: this.$current_address || this.$address || "Unknown"}),
                    payload: JSON.stringify({entity_type: "call", entity_id: callId}),
                    community_id: communityId,
                    send_push: true
                });
            }
        }

        return {...rc, ...vals};
    }

    // =========================================================================
    // Get Calls (paginated, role-filtered)
    // =========================================================================

    get_calls()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;
        let userType = this.$Session.userType;

        let conditions = ["SVC_DELETED_ON IS NULL"];
        let params = [];

        // Role-based filtering
        if (userType === $Const.USER_TYPE_RESIDENT)
        {
            conditions.push("SVC_RES_USR_ID=?");
            params.push(userId);
        }
        else if (userType === $Const.USER_TYPE_OFFICER)
        {
            // Emergency/panic: community-wide (minus passed). Concierge/test: assigned-only.
            let officerComId = getOfficerCommunityId(userId) || 0;

            let broadcastCategories = $CallUtils.broadcastCategories();

            conditions.push(
                `(SVC_OFC_USR_ID=? OR (SVC_CATEGORY IN (${broadcastCategories.toPlaceholders()})
                   AND SVC_COM_ID=? AND (SVC_PASSED_BY IS NULL OR NOT JSON_CONTAINS(SVC_PASSED_BY, ?))))`);
            params.push(userId, ...broadcastCategories, officerComId, JSON.stringify(userId));
        }
        else if (userType === $Const.USER_TYPE_ADMIN)
        {
            if (this.$community_id > 0)
            {
                conditions.push("SVC_COM_ID=?");
                params.push(this.$community_id);
            }
        }

        // Status filter
        if (!$Utils.empty(this.$status))
        {
            if (!$DataItems.isValidItemId(this.$status, "call_status"))
            {
                return $ERRS.ERR_CALL_INVALID_STATUS;
            }
            conditions.push("SVC_STATUS=?");
            params.push(this.$status);
        }

        // Category filter
        if (!$Utils.empty(this.$category))
        {
            if (!$DataItems.isValidItemId(this.$category, "call_category"))
            {
                return $ERRS.ERR_CALL_INVALID_CATEGORY;
            }
            conditions.push("SVC_CATEGORY=?");
            params.push(this.$category);
        }

        // Open/closed filter
        if ($Utils.isset(this.$is_open))
        {
            let statusSet = this.$is_open ? $CallUtils.openStatuses() : $CallUtils.closedStatuses();
            conditions.push(`SVC_STATUS IN (${statusSet.toPlaceholders()})`);
            params.push(...statusSet);
        }

        // Free-text search
        if (!$Utils.empty(this.$search_text))
        {
            let term = "%" + this.$search_text + "%";
            conditions.push(
                `(SVC_DESCRIPTION LIKE ? OR SVC_ADDRESS LIKE ? OR RES_USD.USD_FIRST_NAME LIKE ? OR RES_USD.USD_LAST_NAME LIKE ?)`);
            params.push(term, term, term, term);
        }

        // Sorting
        let validSortColumns = {
            "created_on": "SVC_CREATED_ON",
            "status": "SVC_STATUS",
            "category": "SVC_CATEGORY",
            "priority": "SVC_PRIORITY",
        };
        let orderBy = "SVC_CREATED_ON DESC";
        if (!$Utils.empty(this.$sort_by) && validSortColumns[this.$sort_by])
        {
            let direction = (this.$sort_dir === "asc") ? "ASC" : "DESC";
            orderBy = `${validSortColumns[this.$sort_by]} ${direction}`;
        }

        // Pagination
        let offset = this.$offset || 0;
        let limit = this.$limit || 20;
        if (limit > 100) limit = 100;

        // Count query
        let countRows = $Db.executeQuery(
            `SELECT COUNT(*) cnt
             FROM \`service_call\`
                LEFT OUTER JOIN \`user_details\` RES_USD ON SVC_RES_USR_ID = RES_USD.USD_USR_ID
             WHERE ${conditions.join(" AND ")}`,
            params);
        let totalCount = countRows[0].cnt;

        // Data query
        let rows = $Db.executeQuery(
            `SELECT SVC_ID, SVC_CATEGORY, SVC_SERVICE_TYPE, SVC_RES_USR_ID, SVC_OFC_USR_ID,
                    SVC_COM_ID, SVC_STATUS, SVC_PRIORITY, SVC_DESCRIPTION,
                    SVC_ADDRESS, SVC_CURRENT_ADDRESS, SVC_LATITUDE, SVC_LONGITUDE,
                    SVC_SCHEDULED_DATE, SVC_SCHEDULED_TIME_FROM, SVC_SCHEDULED_TIME_TO,
                    SVC_MEDIA, SVC_AUDIO, SVC_VIDEO,
                    SVC_CONFIRMATION_MEDIA, SVC_CONFIRMATION_VIDEO,
                    SVC_OFFICER_COMMENTS, SVC_REACTION, SVC_RESIDENT_COMMENT,
                    SVC_ASSIGNED_BY, SVC_ACCEPTED_ON, SVC_RESOLVED_ON, SVC_CANCELED_ON,
                    SVC_CREATED_ON, SVC_LAST_UPDATE,
                    RES_USD.USD_FIRST_NAME RES_FIRST_NAME, RES_USD.USD_LAST_NAME RES_LAST_NAME,
                    OFC_USD.USD_FIRST_NAME OFC_FIRST_NAME, OFC_USD.USD_LAST_NAME OFC_LAST_NAME,
                    COM.COM_NAME
             FROM \`service_call\`
                LEFT OUTER JOIN \`user_details\` RES_USD ON SVC_RES_USR_ID = RES_USD.USD_USR_ID
                LEFT OUTER JOIN \`user_details\` OFC_USD ON SVC_OFC_USR_ID = OFC_USD.USD_USR_ID
                LEFT OUTER JOIN \`community\` COM ON SVC_COM_ID = COM.COM_ID AND COM.COM_DELETED_ON IS NULL
             WHERE ${conditions.join(" AND ")}
             ORDER BY ${orderBy}
             LIMIT ${limit} OFFSET ${offset}`,
            params);

        vals.calls = rows.map(row => mapCallRow(row));
        vals.total_count = totalCount;
        vals.offset = offset;
        vals.limit = limit;

        return {...rc, ...vals};
    }

    // =========================================================================
    // Get Single Call
    // =========================================================================

    get_call()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;
        let userType = this.$Session.userType;

        let rows = $Db.executeQuery(
            `SELECT SVC_ID, SVC_CATEGORY, SVC_SERVICE_TYPE, SVC_RES_USR_ID, SVC_OFC_USR_ID,
                    SVC_COM_ID, SVC_STATUS, SVC_PRIORITY, SVC_DESCRIPTION,
                    SVC_ADDRESS, SVC_CURRENT_ADDRESS, SVC_LATITUDE, SVC_LONGITUDE,
                    SVC_SCHEDULED_DATE, SVC_SCHEDULED_TIME_FROM, SVC_SCHEDULED_TIME_TO,
                    SVC_MEDIA, SVC_AUDIO, SVC_VIDEO,
                    SVC_CONFIRMATION_MEDIA, SVC_CONFIRMATION_VIDEO,
                    SVC_OFFICER_COMMENTS, SVC_REACTION, SVC_RESIDENT_COMMENT,
                    SVC_ASSIGNED_BY, SVC_ACCEPTED_ON, SVC_RESOLVED_ON, SVC_CANCELED_ON,
                    SVC_CREATED_ON, SVC_LAST_UPDATE,
                    RES_USD.USD_FIRST_NAME RES_FIRST_NAME, RES_USD.USD_LAST_NAME RES_LAST_NAME,
                    OFC_USD.USD_FIRST_NAME OFC_FIRST_NAME, OFC_USD.USD_LAST_NAME OFC_LAST_NAME,
                    COM.COM_NAME
             FROM \`service_call\`
                LEFT OUTER JOIN \`user_details\` RES_USD ON SVC_RES_USR_ID = RES_USD.USD_USR_ID
                LEFT OUTER JOIN \`user_details\` OFC_USD ON SVC_OFC_USR_ID = OFC_USD.USD_USR_ID
                LEFT OUTER JOIN \`community\` COM ON SVC_COM_ID = COM.COM_ID AND COM.COM_DELETED_ON IS NULL
             WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [this.$call_id]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        let call = rows[0];

        // Access control: residents can only view their own calls
        if (userType === $Const.USER_TYPE_RESIDENT && call.SVC_RES_USR_ID !== userId)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Access control: officers — emergency/panic: community-wide; concierge/test: assigned-only
        if (userType === $Const.USER_TYPE_OFFICER)
        {
            if ($CallUtils.isBroadcastCategory(call.SVC_CATEGORY))
            {
                // Emergency/panic: officer must be in same community
                let officerComId = getOfficerCommunityId(userId);
                if (call.SVC_COM_ID !== officerComId && call.SVC_OFC_USR_ID !== userId)
                {
                    return $ERRS.ERR_CALL_NOT_FOUND;
                }
            }
            else
            {
                // Concierge/test: officer must be explicitly assigned
                if (call.SVC_OFC_USR_ID !== userId)
                {
                    return $ERRS.ERR_CALL_NOT_FOUND;
                }
            }
        }

        vals.call = mapCallRow(call);

        return {...rc, ...vals};
    }

    // =========================================================================
    // Update Call
    // =========================================================================

    update_call()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;
        let userType = this.$Session.userType;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        let fields = [];
        let values = [];

        if (userType === $Const.USER_TYPE_RESIDENT)
        {
            // Resident can only update their own calls in status=new
            if (call.SVC_RES_USR_ID !== userId)
            {
                return $ERRS.ERR_CALL_NOT_FOUND;
            }
            if (call.SVC_STATUS !== $Const.CALL_STATUS_NEW)
            {
                return $ERRS.ERR_CALL_CANNOT_ACCEPT;
            }

            if ($Utils.isset(this.$description))
            {
                fields.push("SVC_DESCRIPTION=?");
                values.push(this.$description);
            }
            if (!$Utils.empty(this.$priority))
            {
                if (!$DataItems.isValidItemId(this.$priority, "call_priority"))
                {
                    return $ERRS.ERR_CALL_INVALID_PRIORITY;
                }
                fields.push("SVC_PRIORITY=?");
                values.push(this.$priority);
            }
            if ($Utils.isset(this.$scheduled_date))
            {
                fields.push("SVC_SCHEDULED_DATE=?");
                values.push(this.$scheduled_date || null);
            }
            if ($Utils.isset(this.$scheduled_time_from))
            {
                fields.push("SVC_SCHEDULED_TIME_FROM=?");
                values.push(this.$scheduled_time_from || null);
            }
            if ($Utils.isset(this.$scheduled_time_to))
            {
                fields.push("SVC_SCHEDULED_TIME_TO=?");
                values.push(this.$scheduled_time_to || null);
            }

            // Handle media update
            let mediaChanged = $Utils.isset(this.$media_file_ids) || $Utils.isset(this.$keep_media);
            if (mediaChanged)
            {
                let newIds = this.$media_file_ids || [];
                let keepUrls = this.$keep_media || [];
                if (newIds.length + keepUrls.length > MAX_MEDIA_COUNT)
                {
                    return $ERRS.ERR_CALL_MEDIA_LIMIT_REACHED;
                }
                if (newIds.length === 0 && keepUrls.length === 0)
                {
                    fields.push("SVC_MEDIA=?");
                    values.push(null);
                }
                else
                {
                    let rv = resolveFileList(newIds, keepUrls);
                    if ($Err.isERR(rv)) return rv;
                    fields.push("SVC_MEDIA=?");
                    values.push(JSON.stringify(rv.file_names));
                }
            }

            // Handle audio update
            if ($Utils.isset(this.$audio_file_id))
            {
                if ($Utils.empty(this.$audio_file_id))
                {
                    fields.push("SVC_AUDIO=?");
                    values.push(null);
                }
                else
                {
                    let rv = resolveSingleFile(this.$audio_file_id);
                    if ($Err.isERR(rv)) return rv;
                    fields.push("SVC_AUDIO=?");
                    values.push(rv.file_name);
                }
            }

            // Handle video update
            if ($Utils.isset(this.$video_file_id))
            {
                if ($Utils.empty(this.$video_file_id))
                {
                    fields.push("SVC_VIDEO=?");
                    values.push(null);
                }
                else
                {
                    let rv = resolveSingleFile(this.$video_file_id);
                    if ($Err.isERR(rv)) return rv;
                    fields.push("SVC_VIDEO=?");
                    values.push(rv.file_name);
                }
            }
        }
        else if (userType === $Const.USER_TYPE_OFFICER)
        {
            // Officer can only update calls assigned to them in status=accepted
            if (call.SVC_OFC_USR_ID !== userId)
            {
                return $ERRS.ERR_CALL_NOT_ASSIGNED_TO_OFFICER;
            }
            if (call.SVC_STATUS !== $Const.CALL_STATUS_ACCEPTED)
            {
                return $ERRS.ERR_CALL_CANNOT_RESOLVE;
            }

            if ($Utils.isset(this.$officer_comments))
            {
                fields.push("SVC_OFFICER_COMMENTS=?");
                values.push(this.$officer_comments);
            }

            // Handle confirmation media
            let confirmMediaChanged = $Utils.isset(this.$confirmation_media_file_ids) || $Utils.isset(this.$keep_confirmation_media);
            if (confirmMediaChanged)
            {
                let newIds = this.$confirmation_media_file_ids || [];
                let keepUrls = this.$keep_confirmation_media || [];
                if (newIds.length + keepUrls.length > MAX_MEDIA_COUNT)
                {
                    return $ERRS.ERR_CALL_MEDIA_LIMIT_REACHED;
                }
                if (newIds.length === 0 && keepUrls.length === 0)
                {
                    fields.push("SVC_CONFIRMATION_MEDIA=?");
                    values.push(null);
                }
                else
                {
                    let rv = resolveFileList(newIds, keepUrls);
                    if ($Err.isERR(rv)) return rv;
                    fields.push("SVC_CONFIRMATION_MEDIA=?");
                    values.push(JSON.stringify(rv.file_names));
                }
            }

            // Handle confirmation video
            if ($Utils.isset(this.$confirmation_video_file_id))
            {
                if ($Utils.empty(this.$confirmation_video_file_id))
                {
                    fields.push("SVC_CONFIRMATION_VIDEO=?");
                    values.push(null);
                }
                else
                {
                    let rv = resolveSingleFile(this.$confirmation_video_file_id);
                    if ($Err.isERR(rv)) return rv;
                    fields.push("SVC_CONFIRMATION_VIDEO=?");
                    values.push(rv.file_name);
                }
            }
        }
        else
        {
            return $ERRS.ERR_NO_PRIVILEGES;
        }

        if (fields.length === 0)
        {
            return rc;
        }

        fields.push("SVC_LAST_UPDATE=?");
        values.push($Utils.now());
        values.push(this.$call_id);

        $Db.executeQuery(
            `UPDATE \`service_call\` SET ${fields.join(", ")} WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            values);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Notify call_updated
        if (userType === $Const.USER_TYPE_RESIDENT && call.SVC_OFC_USR_ID)
        {
            $executeAPI(this.$Session, "Notification/create_notification", {
                target_user_id: call.SVC_OFC_USR_ID,
                type: "call_updated",
                template_vars: JSON.stringify({call_number: String(this.$call_id)}),
                payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
                community_id: call.SVC_COM_ID,
                send_push: true
            });
        }
        else if (userType === $Const.USER_TYPE_OFFICER)
        {
            $executeAPI(this.$Session, "Notification/create_notification", {
                target_user_id: call.SVC_RES_USR_ID,
                type: "call_updated",
                template_vars: JSON.stringify({call_number: String(this.$call_id)}),
                payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
                community_id: call.SVC_COM_ID,
                send_push: true
            });
        }

        return rc;
    }

    // =========================================================================
    // Cancel Call
    // =========================================================================

    cancel_call()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;
        let userType = this.$Session.userType;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Only service calls can be canceled
        if (call.SVC_CATEGORY !== $Const.CALL_CATEGORY_CONCIERGE_SERVICE)
        {
            return $ERRS.ERR_CALL_CANNOT_CANCEL;
        }

        // Residents can only cancel their own calls
        if (userType === $Const.USER_TYPE_RESIDENT && call.SVC_RES_USR_ID !== userId)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Check status
        if (call.SVC_STATUS === $Const.CALL_STATUS_CANCELED)
        {
            return $ERRS.ERR_CALL_ALREADY_CANCELED;
        }
        if (call.SVC_STATUS === $Const.CALL_STATUS_RESOLVED)
        {
            return $ERRS.ERR_CALL_ALREADY_RESOLVED;
        }
        if (!$CallUtils.isOpenStatus(call.SVC_STATUS))
        {
            return $ERRS.ERR_CALL_CANNOT_CANCEL;
        }

        let now = $Utils.now();

        $Db.executeQuery(
            `UPDATE \`service_call\` SET SVC_STATUS=?, SVC_CANCELED_ON=?, SVC_LAST_UPDATE=?
             WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [$Const.CALL_STATUS_CANCELED, now, now, this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Notify officer if assigned
        if (call.SVC_OFC_USR_ID)
        {
            $executeAPI(this.$Session, "Notification/create_notification", {
                target_user_id: call.SVC_OFC_USR_ID,
                type: "call_canceled",
                template_vars: JSON.stringify({call_number: String(this.$call_id)}),
                payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
                community_id: call.SVC_COM_ID,
                send_push: true
            });
        }

        // Notify resident if admin canceled
        if (userType === $Const.USER_TYPE_ADMIN)
        {
            $executeAPI(this.$Session, "Notification/create_notification", {
                target_user_id: call.SVC_RES_USR_ID,
                type: "call_canceled",
                template_vars: JSON.stringify({call_number: String(this.$call_id)}),
                payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
                community_id: call.SVC_COM_ID,
                send_push: true
            });
        }

        return rc;
    }

    // =========================================================================
    // Accept Call (Officer)
    // =========================================================================

    accept_call()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Only emergency and panic calls can be accepted by officer
        if (!$CallUtils.isBroadcastCategory(call.SVC_CATEGORY))
        {
            return $ERRS.ERR_CALL_CANNOT_ACCEPT;
        }

        if (call.SVC_STATUS === $Const.CALL_STATUS_ACCEPTED)
        {
            return $ERRS.ERR_CALL_ALREADY_ACCEPTED;
        }
        if (call.SVC_STATUS !== $Const.CALL_STATUS_NEW)
        {
            return $ERRS.ERR_CALL_CANNOT_ACCEPT;
        }

        // Verify officer is in same community
        let officerComId = getOfficerCommunityId(userId);
        if (!officerComId || officerComId !== call.SVC_COM_ID)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        let now = $Utils.now();

        $Db.executeQuery(
            `UPDATE \`service_call\` SET SVC_STATUS=?, SVC_OFC_USR_ID=?, SVC_ACCEPTED_ON=?, SVC_LAST_UPDATE=?
             WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [$Const.CALL_STATUS_ACCEPTED, userId, now, now, this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Notify resident
        let officerName = getUserName(userId);
        $executeAPI(this.$Session, "Notification/create_notification", {
            target_user_id: call.SVC_RES_USR_ID,
            type: "call_accepted",
            template_vars: JSON.stringify({officer_name: officerName, call_number: String(this.$call_id)}),
            payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
            community_id: call.SVC_COM_ID,
            send_push: true
        });

        return rc;
    }

    // =========================================================================
    // Pass Call (Officer declines — remove from their list)
    // =========================================================================

    pass_call()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Can only pass calls that are new (not yet accepted) and emergency/panic
        if (call.SVC_STATUS !== $Const.CALL_STATUS_NEW)
        {
            return $ERRS.ERR_CALL_CANNOT_ACCEPT;
        }
        if (!$CallUtils.isBroadcastCategory(call.SVC_CATEGORY))
        {
            return $ERRS.ERR_CALL_CANNOT_ACCEPT;
        }

        // Verify officer is in same community
        let officerComId = getOfficerCommunityId(userId);
        if (!officerComId || officerComId !== call.SVC_COM_ID)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Add officer to passed_by list
        let passedBy = parsePassedByArray(call.SVC_PASSED_BY);
        if (!passedBy.includes(userId))
        {
            passedBy.push(userId);
        }

        $Db.executeQuery(
            `UPDATE \`service_call\` SET SVC_PASSED_BY=?, SVC_LAST_UPDATE=? WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [JSON.stringify(passedBy), $Utils.now(), this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }

    // =========================================================================
    // Resolve Call
    // =========================================================================

    resolve_call()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;
        let userType = this.$Session.userType;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        if (call.SVC_STATUS === $Const.CALL_STATUS_RESOLVED)
        {
            return $ERRS.ERR_CALL_ALREADY_RESOLVED;
        }
        if (call.SVC_STATUS === $Const.CALL_STATUS_CANCELED)
        {
            return $ERRS.ERR_CALL_ALREADY_CANCELED;
        }
        if (call.SVC_STATUS !== $Const.CALL_STATUS_ACCEPTED)
        {
            return $ERRS.ERR_CALL_CANNOT_RESOLVE;
        }

        // Officer can resolve only calls assigned to them — but NEVER panic calls
        if (userType === $Const.USER_TYPE_OFFICER)
        {
            if (call.SVC_CATEGORY === $Const.CALL_CATEGORY_PANIC)
            {
                return $ERRS.ERR_NO_PRIVILEGES;
            }
            if (call.SVC_OFC_USR_ID !== userId)
            {
                return $ERRS.ERR_CALL_NOT_ASSIGNED_TO_OFFICER;
            }
        }

        // Resolve confirmation media if provided
        let confirmFields = [];
        let confirmValues = [];

        if (this.$confirmation_media_file_ids && this.$confirmation_media_file_ids.length > 0)
        {
            if (this.$confirmation_media_file_ids.length > MAX_MEDIA_COUNT)
            {
                return $ERRS.ERR_CALL_MEDIA_LIMIT_REACHED;
            }
            let rv = resolveFileList(this.$confirmation_media_file_ids, null);
            if ($Err.isERR(rv)) return rv;
            confirmFields.push("SVC_CONFIRMATION_MEDIA=?");
            confirmValues.push(JSON.stringify(rv.file_names));
        }

        if (!$Utils.empty(this.$confirmation_video_file_id))
        {
            let rv = resolveSingleFile(this.$confirmation_video_file_id);
            if ($Err.isERR(rv)) return rv;
            confirmFields.push("SVC_CONFIRMATION_VIDEO=?");
            confirmValues.push(rv.file_name);
        }

        if (!$Utils.empty(this.$officer_comments))
        {
            confirmFields.push("SVC_OFFICER_COMMENTS=?");
            confirmValues.push(this.$officer_comments);
        }

        let now = $Utils.now();
        let setClause = "SVC_STATUS=?, SVC_RESOLVED_ON=?, SVC_LAST_UPDATE=?";
        let allValues = [$Const.CALL_STATUS_RESOLVED, now, now];

        if (confirmFields.length > 0)
        {
            setClause += ", " + confirmFields.join(", ");
            allValues = allValues.concat(confirmValues);
        }
        allValues.push(this.$call_id);

        $Db.executeQuery(
            `UPDATE \`service_call\` SET ${setClause} WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            allValues);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Notify resident
        let resolverName = getUserName(userId);
        $executeAPI(this.$Session, "Notification/create_notification", {
            target_user_id: call.SVC_RES_USR_ID,
            type: "call_resolved",
            template_vars: JSON.stringify({officer_name: resolverName, call_number: String(this.$call_id)}),
            payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
            community_id: call.SVC_COM_ID,
            send_push: true
        });

        return rc;
    }

    // =========================================================================
    // Assign Call (Admin)
    // =========================================================================

    assign_call()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        if (call.SVC_STATUS !== $Const.CALL_STATUS_NEW)
        {
            if (call.SVC_STATUS === $Const.CALL_STATUS_ACCEPTED)
            {
                return $ERRS.ERR_CALL_ALREADY_ACCEPTED;
            }
            return $ERRS.ERR_CALL_CANNOT_ACCEPT;
        }

        // Validate officer exists and is active
        let officerRows = $Db.executeQuery(
            `SELECT USR_ID, USD_COM_ID
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`officer\` ON USR_ID = OFC_USR_ID
             WHERE USR_ID=? AND USR_TYPE=? AND USR_STATUS=1
               AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL`,
            [this.$officer_user_id, $Const.USER_TYPE_OFFICER]);
        if (officerRows.length === 0)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        let now = $Utils.now();

        $Db.executeQuery(
            `UPDATE \`service_call\`
             SET SVC_STATUS=?, SVC_OFC_USR_ID=?, SVC_ASSIGNED_BY=?, SVC_ACCEPTED_ON=?, SVC_LAST_UPDATE=?
             WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [$Const.CALL_STATUS_ACCEPTED, this.$officer_user_id, userId, now, now, this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Notify officer of assignment
        let officerName = getUserName(this.$officer_user_id);
        $executeAPI(this.$Session, "Notification/create_notification", {
            target_user_id: this.$officer_user_id,
            type: "call_accepted",
            template_vars: JSON.stringify({officer_name: officerName, call_number: String(this.$call_id)}),
            payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
            community_id: call.SVC_COM_ID,
            send_push: true
        });

        // Notify resident
        $executeAPI(this.$Session, "Notification/create_notification", {
            target_user_id: call.SVC_RES_USR_ID,
            type: "call_accepted",
            template_vars: JSON.stringify({officer_name: officerName, call_number: String(this.$call_id)}),
            payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
            community_id: call.SVC_COM_ID,
            send_push: true
        });

        return rc;
    }

    // =========================================================================
    // Add Reaction (Resident)
    // =========================================================================

    add_reaction()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Must be the call creator
        if (call.SVC_RES_USR_ID !== userId)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Must be resolved
        if (call.SVC_STATUS !== $Const.CALL_STATUS_RESOLVED)
        {
            return $ERRS.ERR_CALL_CANNOT_RESOLVE;
        }

        // Validate reaction value
        if (this.$reaction !== 1 && this.$reaction !== -1)
        {
            return $ERRS.ERR_INVALID_API_PARAM;
        }

        $Db.executeQuery(
            `UPDATE \`service_call\` SET SVC_REACTION=?, SVC_LAST_UPDATE=? WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [this.$reaction, $Utils.now(), this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Notify officer of like
        if (this.$reaction === 1 && call.SVC_OFC_USR_ID)
        {
            let residentName = getUserName(userId);
            $executeAPI(this.$Session, "Notification/create_notification", {
                target_user_id: call.SVC_OFC_USR_ID,
                type: "resident_like",
                template_vars: JSON.stringify({resident_name: residentName, call_number: String(this.$call_id)}),
                payload: JSON.stringify({entity_type: "call", entity_id: this.$call_id}),
                community_id: call.SVC_COM_ID,
                send_push: true
            });
        }

        return rc;
    }

    // =========================================================================
    // Add Comment (Resident)
    // =========================================================================

    add_comment()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Must be the call creator
        if (call.SVC_RES_USR_ID !== userId)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        // Must be resolved
        if (call.SVC_STATUS !== $Const.CALL_STATUS_RESOLVED)
        {
            return $ERRS.ERR_CALL_CANNOT_RESOLVE;
        }

        $Db.executeQuery(
            `UPDATE \`service_call\` SET SVC_RESIDENT_COMMENT=?, SVC_LAST_UPDATE=? WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [this.$comment, $Utils.now(), this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }

    // =========================================================================
    // Delete Test Call (Admin)
    // =========================================================================

    delete_test_call()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let call = fetchCallRecord(this.$call_id);
        if (!call)
        {
            return $ERRS.ERR_CALL_NOT_FOUND;
        }

        if (call.SVC_CATEGORY !== $Const.CALL_CATEGORY_TEST)
        {
            return $ERRS.ERR_CALL_IS_NOT_TEST;
        }

        let now = $Utils.now();

        $Db.executeQuery(
            `UPDATE \`service_call\` SET SVC_DELETED_ON=?, SVC_LAST_UPDATE=? WHERE SVC_ID=? AND SVC_DELETED_ON IS NULL`,
            [now, now, this.$call_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }
};
