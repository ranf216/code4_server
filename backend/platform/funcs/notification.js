function mapNotificationRow(row)
{
    let payload = null;
    if (!$Utils.empty(row.NTF_PAYLOAD))
    {
        if (typeof row.NTF_PAYLOAD === "object")
        {
            payload = row.NTF_PAYLOAD;
        }
        else
        {
            try
            {
                payload = JSON.parse(row.NTF_PAYLOAD);
            }
            catch (e)
            {
                payload = null;
            }
        }
    }

    return {
        notification_id: row.NTF_ID,
        type: row.NTF_TYPE,
        title: row.NTF_TITLE,
        message: row.NTF_MESSAGE,
        payload: payload,
        is_read: row.NTF_IS_READ === 1,
        read_on: row.NTF_READ_ON,
        sender_id: row.NTF_SENDER_ID,
        community_id: row.NTF_COMMUNITY_ID,
        created_on: row.NTF_CREATED_ON,
    };
}

function insertNotification(targetUserId, type, title, message, payload, senderId, communityId)
{
    let payloadStr = null;
    if (!$Utils.empty(payload))
    {
        payloadStr = (typeof payload === "string") ? payload : JSON.stringify(payload);
    }

    $Db.executeQuery(
        `INSERT INTO \`notification\` (NTF_USR_ID, NTF_TYPE, NTF_TITLE, NTF_MESSAGE, NTF_PAYLOAD, NTF_SENDER_ID, NTF_COMMUNITY_ID, NTF_CREATED_ON)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [targetUserId, type, title, message, payloadStr, senderId, communityId || null, $Utils.now()]);

    if ($Db.isError())
    {
        return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
    }

    return { ...$ERRS.ERR_SUCCESS, notification_id: $Db.insertId() };
}

const TYPE_TO_SETTING_MAP = {
    "new_emergency":            "new_call_enabled",
    "new_service_call":         "new_call_enabled",
    "call_accepted":            "call_accepted_enabled",
    "call_resolved":            "call_resolved_enabled",
    "call_updated":             "call_edited_enabled",
    "report_submitted":         "report_submitted_enabled",
    "report_approved":          "report_approved_enabled",
    "report_changes_requested": "report_changes_enabled",
    "report_delivered":         "report_delivered_enabled",
    "post_order_published":     "post_order_published_enabled",
    "post_order_updated":       "post_order_updated_enabled",
    "poi_active":               "poi_active_enabled",
    "poi_updated":              "poi_updated_enabled",
    "poi_inactivated":          "poi_inactivated_enabled",
    "poi_expiring_soon":        "poi_expiring_enabled",
    "poi_expired":              "poi_expired_enabled",
};

function getNotificationSettings()
{
    let rows = $Db.executeQuery(
        `SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
        [$Const.KVL_SETTINGS_NOTIFICATION]);

    let settings = { ...$Config.get("SETTINGS_DEFAULTS").notification };
    if (rows.length > 0 && rows[0].KVL_VALUE)
    {
        try
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
        catch (e) {}
    }

    return settings;
}

function isTypeEnabled(type, settings)
{
    let settingKey = TYPE_TO_SETTING_MAP[type];
    if (!settingKey)
    {
        return true;
    }
    return settings[settingKey] !== false;
}

function renderTemplate(type, vars)
{
    let title = $DataItems.getItemAttr(type, "notification_type", "title_template");
    let message = $DataItems.getItemAttr(type, "notification_type", "message_template");

    if ($Utils.empty(title) || $Utils.empty(message))
    {
        return null;
    }

    if (typeof vars === "string")
    {
        try { vars = JSON.parse(vars); }
        catch (e) { vars = null; }
    }

    if (vars && typeof vars === "object")
    {
        for (let [key, value] of Object.entries(vars))
        {
            let placeholder = new RegExp("#" + key + "#", "g");
            title = title.replace(placeholder, value);
            message = message.replace(placeholder, value);
        }
    }

    return { title, message };
}

function resolveNotificationText(type, title, message, templateVars)
{
    if (!$Utils.empty(title) && !$Utils.empty(message))
    {
        return { title, message };
    }

    let rendered = renderTemplate(type, templateVars);
    if (!rendered)
    {
        return null;
    }

    return {
        title:   !$Utils.empty(title) ? title : rendered.title,
        message: !$Utils.empty(message) ? message : rendered.message,
    };
}

function sendPushToUser(targetUserId, title, message, payload)
{
    if (typeof $Fcm === "undefined" || !$Fcm)
    {
        return;
    }

    let rows = $Db.executeQuery(
        `SELECT USR_DEVICE_ID FROM \`user\` WHERE USR_ID=? AND USR_STATUS=1 AND USR_DEVICE_ID IS NOT NULL AND USR_DEVICE_ID != ''`,
        [targetUserId]);

    if (rows.length === 0)
    {
        return;
    }

    let payloadObj = {};
    if (!$Utils.empty(payload))
    {
        try
        {
            payloadObj = (typeof payload === "string") ? JSON.parse(payload) : payload;
        }
        catch (e)
        {
            payloadObj = {};
        }
    }

    $Fcm.sendNotification(rows[0].USR_DEVICE_ID, title, message, payloadObj);
}

function sendEmailToUser(targetUserId, title, message)
{
    let rows = $Db.executeQuery(
        `SELECT USR_EMAIL FROM \`user\` WHERE USR_ID=? AND USR_STATUS=1 AND USR_EMAIL IS NOT NULL AND USR_EMAIL != ''`,
        [targetUserId]);

    if (rows.length === 0)
    {
        return;
    }

    $Mailer.sendMailFromTemplate(rows[0].USR_EMAIL, $Const.EMAIL_TEMPLATE_NOTIFICATION, { "#TITLE#": title, "#MESSAGE#": message });
}

function sendSocketToUser(targetUserId, notificationId, type, title, message)
{
    if (typeof $SocketService === "undefined" || !$SocketService)
    {
        return;
    }

    let data = JSON.stringify({
        event:           "new_notification",
        notification_id: notificationId,
        type:            type,
        title:           title,
        message:         message,
    });

    new $SocketService($Config.get("socket")).sendMessage(targetUserId, data);
}

function sendSocketToUsers(targetUserIds, type, title, message)
{
    if (typeof $SocketService === "undefined" || !$SocketService)
    {
        return;
    }

    let data = JSON.stringify({
        event:   "new_notification",
        type:    type,
        title:   title,
        message: message,
    });

    new $SocketService($Config.get("socket")).sendMultiMessage(targetUserIds, data);
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
    // Read
    // =========================================================================

    get_notifications()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId } = this.$Session;

        let conditions = ["NTF_USR_ID=?", "NTF_DELETED_ON IS NULL"];
        let params = [userId];

        if (this.$is_read === true)
        {
            conditions.push("NTF_IS_READ = 1");
        }
        else if (this.$is_read === false)
        {
            conditions.push("NTF_IS_READ = 0");
        }

        if (!$Utils.empty(this.$type))
        {
            conditions.push("NTF_TYPE = ?");
            params.push(this.$type);
        }

        if (!$Utils.empty(this.$from_date))
        {
            let fromDate = $Utils.validateDateStr(this.$from_date, true);
            if (fromDate)
            {
                conditions.push("NTF_CREATED_ON >= ?");
                params.push(fromDate);
            }
        }

        if (!$Utils.empty(this.$to_date))
        {
            let toDate = $Utils.validateDateStr(this.$to_date, true, true);
            if (toDate)
            {
                conditions.push("NTF_CREATED_ON <= ?");
                params.push(toDate);
            }
        }

        let maxPageSize = $Config.get("NOTIFICATION_MAX_PAGE_SIZE");
        let pageSize = parseInt(this.$limit) || 20;
        if (pageSize > maxPageSize)
        {
            pageSize = maxPageSize;
        }
        if (pageSize < 1)
        {
            pageSize = 1;
        }

        let offset = parseInt(this.$offset) || 0;
        if (offset < 0)
        {
            offset = 0;
        }

        let countRows = $Db.executeQuery(
            `SELECT COUNT(*) cnt
             FROM \`notification\`
             WHERE ${conditions.join(" AND ")}`, params);

        let totalCount = countRows[0].cnt;

        let rows = $Db.executeQuery(
            `SELECT NTF_ID, NTF_TYPE, NTF_TITLE, NTF_MESSAGE, NTF_PAYLOAD,
                    NTF_IS_READ, NTF_READ_ON, NTF_SENDER_ID, NTF_COMMUNITY_ID, NTF_CREATED_ON
             FROM \`notification\`
             WHERE ${conditions.join(" AND ")}
             ORDER BY NTF_CREATED_ON DESC
             LIMIT ? OFFSET ?`, [...params, `${pageSize}`, `${offset}`]);

        vals.notifications = rows.map(row => mapNotificationRow(row));
        vals.total_count = totalCount;
        vals.offset = offset;
        vals.limit = pageSize;

        return {...rc, ...vals};
    }

    get_unread_count()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId } = this.$Session;

        let rows = $Db.executeQuery(
            `SELECT COUNT(*) cnt
             FROM \`notification\`
             WHERE NTF_USR_ID=? AND NTF_IS_READ=0 AND NTF_DELETED_ON IS NULL`,
            [userId]);

        vals.unread_count = rows[0].cnt;

        return {...rc, ...vals};
    }

    // =========================================================================
    // Write
    // =========================================================================

    mark_as_read()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId } = this.$Session;

        let rows = $Db.executeQuery(
            `SELECT NTF_ID, NTF_IS_READ
             FROM \`notification\`
             WHERE NTF_ID=? AND NTF_USR_ID=? AND NTF_DELETED_ON IS NULL`,
            [this.$notification_id, userId]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_NOTIFICATION_NOT_FOUND;
        }

        if (rows[0].NTF_IS_READ === 1)
        {
            return $ERRS.ERR_NOTIFICATION_ALREADY_READ;
        }

        $Db.executeQuery(
            `UPDATE \`notification\`
             SET NTF_IS_READ=1, NTF_READ_ON=?
             WHERE NTF_ID=? AND NTF_DELETED_ON IS NULL`,
            [$Utils.now(), this.$notification_id]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    mark_all_as_read()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId } = this.$Session;

        $Db.executeQuery(
            `UPDATE \`notification\`
             SET NTF_IS_READ=1, NTF_READ_ON=?
             WHERE NTF_USR_ID=? AND NTF_IS_READ=0 AND NTF_DELETED_ON IS NULL`,
            [$Utils.now(), userId]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        vals.updated_count = $Db.affectedRows();

        return {...rc, ...vals};
    }

    create_notification()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId: senderId } = this.$Session;

        if (!$DataItems.isValidItemId(this.$type, "notification_type"))
        {
            return $ERRS.ERR_NOTIFICATION_INVALID_TYPE;
        }

        let text = resolveNotificationText(this.$type, this.$title, this.$message, this.$template_vars);
        if (!text)
        {
            return $Err.errWithInfo("ERR_INVALID_API_PARAM", "title/message or template_vars required");
        }
        let title = text.title;
        let message = text.message;

        let settings = getNotificationSettings();

        if (!isTypeEnabled(this.$type, settings))
        {
            return {...rc, ...vals, skipped: true};
        }

        let rv = insertNotification(
            this.$target_user_id,
            this.$type,
            title,
            message,
            this.$payload,
            senderId,
            this.$community_id
        );

        if ($Err.isERR(rv))
        {
            return rv;
        }

        vals.notification_id = rv.notification_id;

        if (this.$send_push)
        {
            let methods = settings.notification_methods.split(",").map(m => m.trim());

            if (methods.includes("mobile"))
            {
                sendPushToUser(this.$target_user_id, title, message, this.$payload);
            }

            if (methods.includes("email"))
            {
                sendEmailToUser(this.$target_user_id, title, message);
            }
        }

        sendSocketToUser(this.$target_user_id, vals.notification_id, this.$type, title, message);

        return {...rc, ...vals};
    }

    create_bulk_notifications()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId: senderId } = this.$Session;

        if (!$DataItems.isValidItemId(this.$type, "notification_type"))
        {
            return $ERRS.ERR_NOTIFICATION_INVALID_TYPE;
        }

        let text = resolveNotificationText(this.$type, this.$title, this.$message, this.$template_vars);
        if (!text)
        {
            return $Err.errWithInfo("ERR_INVALID_API_PARAM", "title/message or template_vars required");
        }
        let title = text.title;
        let message = text.message;

        let settings = getNotificationSettings();

        if (!isTypeEnabled(this.$type, settings))
        {
            return {...rc, ...vals, skipped: true};
        }

        let targetUserIds = this.$target_user_ids;
        if (!Array.isArray(targetUserIds) || targetUserIds.length === 0)
        {
            return $Err.errWithInfo("ERR_INVALID_API_PARAM", "target_user_ids");
        }

        let payloadStr = null;
        if (!$Utils.empty(this.$payload))
        {
            payloadStr = (typeof this.$payload === "string") ? this.$payload : JSON.stringify(this.$payload);
        }

        let now = $Utils.now();
        let communityId = this.$community_id || null;

        let valuePlaceholders = [];
        let insertParams = [];
        for (let i = 0; i < targetUserIds.length; i++)
        {
            valuePlaceholders.push("(?, ?, ?, ?, ?, ?, ?, ?)");
            insertParams.push(
                targetUserIds[i],
                this.$type,
                title,
                message,
                payloadStr,
                senderId,
                communityId,
                now
            );
        }

        $Db.executeQuery(
            `INSERT INTO \`notification\` (NTF_USR_ID, NTF_TYPE, NTF_TITLE, NTF_MESSAGE, NTF_PAYLOAD, NTF_SENDER_ID, NTF_COMMUNITY_ID, NTF_CREATED_ON)
             VALUES ${valuePlaceholders.join(", ")}`,
            insertParams);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        vals.created_count = targetUserIds.length;

        if (this.$send_push)
        {
            let methods = settings.notification_methods.split(",").map(m => m.trim());

            if (methods.includes("mobile") && typeof $Fcm !== "undefined" && $Fcm)
            {
                let deviceRows = $Db.executeQuery(
                    `SELECT USR_ID, USR_DEVICE_ID FROM \`user\`
                     WHERE USR_ID IN (${targetUserIds.toPlaceholders()}) AND USR_STATUS=1
                           AND USR_DEVICE_ID IS NOT NULL AND USR_DEVICE_ID != ''`,
                    targetUserIds);

                let pushPayload = {};
                if (!$Utils.empty(this.$payload))
                {
                    try
                    {
                        pushPayload = (typeof this.$payload === "string") ? JSON.parse(this.$payload) : this.$payload;
                    }
                    catch (e)
                    {
                        pushPayload = {};
                    }
                }

                for (let i = 0; i < deviceRows.length; i++)
                {
                    $Fcm.sendNotification(deviceRows[i].USR_DEVICE_ID, title, message, pushPayload);
                }
            }

            if (methods.includes("email"))
            {
                let emailRows = $Db.executeQuery(
                    `SELECT USR_ID, USR_EMAIL FROM \`user\`
                     WHERE USR_ID IN (${targetUserIds.toPlaceholders()}) AND USR_STATUS=1
                           AND USR_EMAIL IS NOT NULL AND USR_EMAIL != ''`,
                    targetUserIds);

                for (let i = 0; i < emailRows.length; i++)
                {
                    $Mailer.sendMailFromTemplate(emailRows[i].USR_EMAIL, $Const.EMAIL_TEMPLATE_NOTIFICATION, { "#TITLE#": title, "#MESSAGE#": message });
                }
            }
        }

        sendSocketToUsers(targetUserIds, this.$type, title, message);

        return {...rc, ...vals};
    }

    delete_notification()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const { userId } = this.$Session;

        let rows = $Db.executeQuery(
            `SELECT NTF_ID
             FROM \`notification\`
             WHERE NTF_ID=? AND NTF_USR_ID=? AND NTF_DELETED_ON IS NULL`,
            [this.$notification_id, userId]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_NOTIFICATION_NOT_FOUND;
        }

        $Db.executeQuery(
            `UPDATE \`notification\`
             SET NTF_DELETED_ON=?
             WHERE NTF_ID=? AND NTF_USR_ID=? AND NTF_DELETED_ON IS NULL`,
            [$Utils.now(), this.$notification_id, userId]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }
}
