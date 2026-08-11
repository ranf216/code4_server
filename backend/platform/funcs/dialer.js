const twilio = require('twilio');

module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

    _validCallResults()
    {
        return ["answered", "no_answer", "voicemail", "busy", "failed"];
    }

    _validDirections()
    {
        return ["outbound", "inbound"];
    }

    get_twilio_token()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const accountSid = $Config.get("twilio_dialer", "auth_id");
        const authToken = $Config.get("twilio_dialer", "auth_token");
        const twimlAppSid = $Config.get("twilio_dialer", "twiml_app_sid");
        const tokenTtl = $Config.get("twilio_dialer", "token_ttl_sec") || 3600;

        if ($Utils.empty(accountSid) || $Utils.empty(authToken))
        {
            return $ERRS.ERR_DIALER_TWILIO_NOT_CONFIGURED;
        }

        if ($Utils.empty(twimlAppSid))
        {
            return $ERRS.ERR_DIALER_TWIML_APP_NOT_CONFIGURED;
        }

        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: true,
        });

        const token = new AccessToken(accountSid, $Config.get("twilio_dialer", "api_key_sid"), $Config.get("twilio_dialer", "api_key_secret"), {
            identity: this.$Session.userId,
            ttl: tokenTtl,
        });

        token.addGrant(voiceGrant);

        vals.token = token.toJwt();
        vals.identity = this.$Session.userId;
        vals.ttl = tokenTtl;

        return {...rc, ...vals};
    }

    start_dialer_session()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let entityIds = this.$entity_ids;

        if (!Array.isArray(entityIds) || entityIds.length === 0)
        {
            return $ERRS.ERR_DIALER_INVALID_ENTITY_IDS;
        }

        // Normalize: cast each element to string (supports both int and string IDs)
        entityIds = entityIds.map(id => String(id));

        let maxQueueSize = $Config.get("twilio_dialer", "max_queue_size") || 200;
        if (entityIds.length > maxQueueSize)
        {
            return $ERRS.ERR_DIALER_QUEUE_EXCEEDS_MAX;
        }

        let now = $Utils.now();
        let entityType = this.$entity_type || "generic";

        $Db.beginTransaction();

        // Lock this user's row for the duration of the transaction so concurrent
        // start_dialer_session calls from the same user are serialized. This lets us
        // safely check-then-insert the "one active session per user" invariant, since
        // dialer_session has no unique constraint to enforce it at the DB level.
        $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_ID = ? FOR UPDATE`, [this.$Session.userId]);

        let activeSession = $Db.executeQuery(
            `SELECT DLS_ID
            FROM \`dialer_session\`
            WHERE DLS_USR_ID = ?
                AND DLS_STATUS = 'active'
            LIMIT 1`, [this.$Session.userId]);

        if (activeSession.length > 0)
        {
            $Db.rollbackTransaction();
            return {...$ERRS.ERR_DIALER_SESSION_ALREADY_ACTIVE, existing_session_id: activeSession[0].DLS_ID};
        }

        $Db.executeQuery(
            `INSERT INTO \`dialer_session\` (DLS_USR_ID, DLS_STATUS, DLS_ENTITY_TYPE, DLS_TOTAL_ITEMS, DLS_CURRENT_INDEX, DLS_CREATED_ON)
            VALUES (?, 'active', ?, ?, 0, ?)`,
            [this.$Session.userId, entityType, entityIds.length, now]);

        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        let sessionId = $Db.insertId();

        let queueValues = [];
        let queueParams = [];

        for (let i = 0; i < entityIds.length; i++)
        {
            queueValues.push("(?, ?, ?, ?, 'pending', ?)");
            queueParams.push(sessionId, entityIds[i], entityType, i, now);
        }

        $Db.executeQuery(
            `INSERT INTO \`dialer_queue_item\` (DQI_DLS_ID, DQI_ENTITY_ID, DQI_ENTITY_TYPE, DQI_ORDER, DQI_STATUS, DQI_CREATED_ON)
            VALUES ${queueValues.join(", ")}`, queueParams);

        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        $Db.commitTransaction();

        let firstItem = $Db.executeQuery(
            `SELECT DQI_ID queue_item_id, DQI_ENTITY_ID entity_id, DQI_ORDER item_order
            FROM \`dialer_queue_item\`
            WHERE DQI_DLS_ID = ?
                AND DQI_ORDER = 0`,
            [sessionId]);

        vals.session_id = sessionId;
        vals.total_items = entityIds.length;
        vals.current_index = 0;
        vals.first_item = firstItem.length > 0 ? firstItem[0] : null;

        return {...rc, ...vals};
    }

    get_next_in_queue()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let sessions = $Db.executeQuery(
            `SELECT DLS_ID, DLS_STATUS, DLS_CURRENT_INDEX, DLS_TOTAL_ITEMS
            FROM \`dialer_session\`
            WHERE DLS_ID = ?
                AND DLS_USR_ID = ?`,
            [this.$session_id, this.$Session.userId]);

        if (sessions.length === 0)
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_FOUND;
        }

        let session = sessions[0];

        if (session.DLS_STATUS !== "active")
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_ACTIVE;
        }

        let nextIndex = session.DLS_CURRENT_INDEX + 1;

        if (nextIndex >= session.DLS_TOTAL_ITEMS)
        {
            $Db.executeQuery(
                `UPDATE \`dialer_session\`
                SET DLS_STATUS = 'completed', DLS_ENDED_ON = ?
                WHERE DLS_ID = ?`,
                [$Utils.now(), this.$session_id]);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }

            vals.has_next = false;
            vals.session_completed = true;
            return {...rc, ...vals};
        }

        $Db.executeQuery(
            `UPDATE \`dialer_session\`
            SET DLS_CURRENT_INDEX = ?
            WHERE DLS_ID = ?`,
            [nextIndex, this.$session_id]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        let nextItem = $Db.executeQuery(
            `SELECT DQI_ID queue_item_id, DQI_ENTITY_ID entity_id, DQI_ORDER item_order
            FROM \`dialer_queue_item\`
            WHERE DQI_DLS_ID = ?
                AND DQI_ORDER = ?`,
            [this.$session_id, nextIndex]);

        vals.has_next = true;
        vals.current_index = nextIndex;
        vals.total_items = session.DLS_TOTAL_ITEMS;
        vals.remaining = session.DLS_TOTAL_ITEMS - nextIndex - 1;
        vals.next_item = nextItem.length > 0 ? nextItem[0] : null;

        return {...rc, ...vals};
    }

    log_call_result()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let result = this.$result;
        if (!this._validCallResults().includes(result))
        {
            return $ERRS.ERR_DIALER_INVALID_CALL_RESULT;
        }

        let direction = this.$direction || "outbound";
        if (!this._validDirections().includes(direction))
        {
            return $ERRS.ERR_DIALER_INVALID_DIRECTION;
        }

        let now = $Utils.now();

        $Db.executeQuery(
            `INSERT INTO \`call_log\` (CLG_ENTITY_ID, CLG_USR_ID, CLG_PHONE, CLG_DIRECTION, CLG_RESULT, CLG_DURATION_SEC, CLG_TWILIO_SID, CLG_NOTES, CLG_CREATED_ON)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [String(this.$entity_id), this.$Session.userId, this.$phone, direction, result, this.$duration_sec || 0, this.$twilio_sid || null, this.$notes || null, now]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        vals.call_log_id = $Db.insertId();

        if (this.$session_id > 0)
        {
            $Db.executeQuery(
                `UPDATE \`dialer_queue_item\`
                SET DQI_STATUS = 'completed', DQI_CALL_RESULT = ?, DQI_DURATION_SEC = ?, DQI_CALLED_ON = ?
                WHERE DQI_DLS_ID = ?
                    AND DQI_ENTITY_ID = ?
                    AND DQI_STATUS IN ('pending', 'calling')
                ORDER BY DQI_ORDER DESC
                LIMIT 1`,
                [result, this.$duration_sec || 0, now, this.$session_id, String(this.$entity_id)]);

            if ($Db.isError())
            {
                $Logger.logString($Const.LL_WARNING, `log_call_result: failed to update dialer_queue_item for session ${this.$session_id}, entity ${this.$entity_id}: ${$Db.lastErrorMsg()}`);
            }
        }

        return {...rc, ...vals};
    }

    pause_dialer()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let sessions = $Db.executeQuery(
            `SELECT DLS_ID, DLS_STATUS
            FROM \`dialer_session\`
            WHERE DLS_ID = ?
                AND DLS_USR_ID = ?`,
            [this.$session_id, this.$Session.userId]);

        if (sessions.length === 0)
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_FOUND;
        }

        if (sessions[0].DLS_STATUS !== "active")
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_ACTIVE;
        }

        $Db.executeQuery(
            `UPDATE \`dialer_session\`
            SET DLS_STATUS = 'paused'
            WHERE DLS_ID = ?`,
            [this.$session_id]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        vals.session_id = this.$session_id;
        vals.status = "paused";

        return {...rc, ...vals};
    }

    resume_dialer()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let sessions = $Db.executeQuery(
            `SELECT DLS_ID, DLS_STATUS
            FROM \`dialer_session\`
            WHERE DLS_ID = ?
                AND DLS_USR_ID = ?`,
            [this.$session_id, this.$Session.userId]);

        if (sessions.length === 0)
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_FOUND;
        }

        if (sessions[0].DLS_STATUS !== "paused")
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_PAUSED;
        }

        $Db.executeQuery(
            `UPDATE \`dialer_session\`
            SET DLS_STATUS = 'active'
            WHERE DLS_ID = ?`,
            [this.$session_id]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        vals.session_id = this.$session_id;
        vals.status = "active";

        return {...rc, ...vals};
    }

    end_dialer_session()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let sessions = $Db.executeQuery(
            `SELECT DLS_ID, DLS_STATUS
            FROM \`dialer_session\`
            WHERE DLS_ID = ?
                AND DLS_USR_ID = ?`,
            [this.$session_id, this.$Session.userId]);

        if (sessions.length === 0)
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_FOUND;
        }

        if (sessions[0].DLS_STATUS === "completed")
        {
            return $ERRS.ERR_DIALER_SESSION_ALREADY_COMPLETED;
        }

        let now = $Utils.now();

        $Db.beginTransaction();

        $Db.executeQuery(
            `UPDATE \`dialer_session\`
            SET DLS_STATUS = 'completed', DLS_ENDED_ON = ?
            WHERE DLS_ID = ?`,
            [now, this.$session_id]);

        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        $Db.executeQuery(
            `UPDATE \`dialer_queue_item\`
            SET DQI_STATUS = 'skipped'
            WHERE DQI_DLS_ID = ?
                AND DQI_STATUS = 'pending'`,
            [this.$session_id]);

        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        $Db.commitTransaction();

        let stats = $Db.executeQuery(
            `SELECT
                COUNT(*) total,
                SUM(CASE WHEN DQI_STATUS = 'completed' THEN 1 ELSE 0 END) completed,
                SUM(CASE WHEN DQI_CALL_RESULT = 'answered' THEN 1 ELSE 0 END) answered,
                SUM(CASE WHEN DQI_STATUS = 'skipped' THEN 1 ELSE 0 END) skipped,
                COALESCE(AVG(CASE WHEN DQI_DURATION_SEC > 0 THEN DQI_DURATION_SEC ELSE NULL END), 0) avg_duration
            FROM \`dialer_queue_item\`
            WHERE DQI_DLS_ID = ?`,
            [this.$session_id]);

        vals.session_id = this.$session_id;
        vals.status = "completed";
        vals.stats = stats.length > 0 ? stats[0] : {};

        return {...rc, ...vals};
    }

    get_dialer_session_status()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let sessions = $Db.executeQuery(
            `SELECT DLS_ID session_id, DLS_STATUS status, DLS_ENTITY_TYPE entity_type,
                DLS_TOTAL_ITEMS total_items, DLS_CURRENT_INDEX current_index,
                DLS_CREATED_ON created_on, DLS_ENDED_ON ended_on
            FROM \`dialer_session\`
            WHERE DLS_ID = ?
                AND DLS_USR_ID = ?`,
            [this.$session_id, this.$Session.userId]);

        if (sessions.length === 0)
        {
            return $ERRS.ERR_DIALER_SESSION_NOT_FOUND;
        }

        vals.session = sessions[0];

        vals.stats = $Db.executeQuery(
            `SELECT
                COUNT(*) total,
                SUM(CASE WHEN DQI_STATUS = 'completed' THEN 1 ELSE 0 END) completed,
                SUM(CASE WHEN DQI_CALL_RESULT = 'answered' THEN 1 ELSE 0 END) answered,
                SUM(CASE WHEN DQI_CALL_RESULT = 'no_answer' THEN 1 ELSE 0 END) no_answer,
                SUM(CASE WHEN DQI_CALL_RESULT = 'voicemail' THEN 1 ELSE 0 END) voicemail,
                SUM(CASE WHEN DQI_CALL_RESULT = 'busy' THEN 1 ELSE 0 END) busy_count,
                SUM(CASE WHEN DQI_CALL_RESULT = 'failed' THEN 1 ELSE 0 END) failed,
                SUM(CASE WHEN DQI_STATUS = 'skipped' THEN 1 ELSE 0 END) skipped,
                SUM(CASE WHEN DQI_STATUS = 'pending' THEN 1 ELSE 0 END) remaining,
                COALESCE(AVG(CASE WHEN DQI_DURATION_SEC > 0 THEN DQI_DURATION_SEC ELSE NULL END), 0) avg_duration_sec
            FROM \`dialer_queue_item\`
            WHERE DQI_DLS_ID = ?`,
            [this.$session_id]);

        vals.queue_items = $Db.executeQuery(
            `SELECT DQI_ID queue_item_id, DQI_ENTITY_ID entity_id, DQI_ORDER item_order,
                DQI_STATUS status, DQI_CALL_RESULT call_result, DQI_DURATION_SEC duration_sec,
                DQI_CALLED_ON called_on
            FROM \`dialer_queue_item\`
            WHERE DQI_DLS_ID = ?
            ORDER BY DQI_ORDER ASC`,
            [this.$session_id]);

        return {...rc, ...vals};
    }

    send_sms()
    {
        return $Sms.sendSms(this.$phone_number, this.$message);
    }
};
