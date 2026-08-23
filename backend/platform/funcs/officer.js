function fetchOfficerRecord(userId)
{
    let rows = $Db.executeQuery(
        `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
                USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_IMAGE, USD_COM_ID,
                OFC_TITLE, OFC_DESCRIPTION, OFC_ADDRESS, OFC_ROLES, OFC_CERTIFICATION_BADGES
         FROM \`user\`
            JOIN \`user_details\` ON USR_ID = USD_USR_ID
            JOIN \`officer\` ON USR_ID = OFC_USR_ID
         WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL`,
        [userId, $Const.USER_TYPE_OFFICER]);
    return rows.length > 0 ? rows[0] : null;
}

function mapOfficerRow(row, filesSql)
{
    return {
        user_id: row.USR_ID,
        first_name: row.USD_FIRST_NAME,
        last_name: row.USD_LAST_NAME,
        email: row.USR_EMAIL,
        phone_num: row.USD_PHONE_NUM,
        image_url: $Files.getUrl(filesSql.get(row)),
        community_id: row.USD_COM_ID,
        community_name: row.COM_NAME || null,
        title: row.OFC_TITLE,
        description: row.OFC_DESCRIPTION,
        address: row.OFC_ADDRESS,
        roles: row.OFC_ROLES ? (typeof row.OFC_ROLES === "string" ? JSON.parse(row.OFC_ROLES) : row.OFC_ROLES) : [],
        certification_badges: row.OFC_CERTIFICATION_BADGES ? (typeof row.OFC_CERTIFICATION_BADGES === "string" ? JSON.parse(row.OFC_CERTIFICATION_BADGES) : row.OFC_CERTIFICATION_BADGES) : [],
        is_active: row.USR_STATUS === 1,
        created_on: row.USR_CREATED_ON,
        last_login: row.USR_LAST_LOGIN,
    };
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
    // Officers - Admin CRUD
    // =========================================================================

    get_officers()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let filesSql = new $Files.SQL("USD_IMAGE");

        let conditions = ["USR_TYPE=?", "USD_DELETED_ON IS NULL", "OFC_DELETED_ON IS NULL"];
        let params = [$Const.USER_TYPE_OFFICER];

        if (this.$community_id > 0)
        {
            conditions.push("USD_COM_ID=?");
            params.push(this.$community_id);
        }

        if (!this.$include_inactive)
        {
            conditions.push("USR_STATUS = 1");
        }

        if (!$Utils.empty(this.$search_text))
        {
            let term = "%" + this.$search_text + "%";
            conditions.push(
                `(USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ? OR USR_EMAIL LIKE ? OR USD_PHONE_NUM LIKE ? OR COM_NAME LIKE ?)`);
            params.push(term, term, term, term, term);
        }

        let validSortColumns = {
            "first_name": "USD_FIRST_NAME",
            "last_name": "USD_LAST_NAME",
            "community": "COM_NAME",
            "created_on": "USR_CREATED_ON",
        };
        let orderBy = "USD_FIRST_NAME ASC";
        if (!$Utils.empty(this.$sort_by) && validSortColumns[this.$sort_by])
        {
            let direction = (this.$sort_dir === "desc") ? "DESC" : "ASC";
            orderBy = `${validSortColumns[this.$sort_by]} ${direction}`;
        }

        let officers = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, ${filesSql.select()}, USD_COM_ID,
                    OFC_TITLE, OFC_DESCRIPTION, OFC_ADDRESS, OFC_ROLES, OFC_CERTIFICATION_BADGES,
                    COM_NAME
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`officer\` ON USR_ID = OFC_USR_ID
                ${filesSql.join()}
                LEFT OUTER JOIN \`community\` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
             WHERE ${conditions.join(" AND ")}
             ORDER BY ${orderBy}`, params);

        vals.officers = officers.map(row => mapOfficerRow(row, filesSql));
        vals.total_count = vals.officers.length;

        return {...rc, ...vals};
    }

    get_officer()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let filesSql = new $Files.SQL("USD_IMAGE");

        let rows = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, ${filesSql.select()}, USD_COM_ID,
                    OFC_TITLE, OFC_DESCRIPTION, OFC_ADDRESS, OFC_ROLES, OFC_CERTIFICATION_BADGES,
                    COM_NAME
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`officer\` ON USR_ID = OFC_USR_ID
                ${filesSql.join()}
                LEFT OUTER JOIN \`community\` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
             WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL`,
            [this.$user_id, $Const.USER_TYPE_OFFICER]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        vals.officer = mapOfficerRow(rows[0], filesSql);

        // Include evaluations for admin view
        let evaluations = $Db.executeQuery(
            `SELECT OFE_ID, OFE_TEXT, OFE_DATE, OFE_EVALUATOR_NAME, OFE_CREATED_ON
             FROM \`officer_evaluation\`
             WHERE OFE_OFC_USR_ID=? AND OFE_DELETED_ON IS NULL
             ORDER BY OFE_DATE DESC`,
            [this.$user_id]);

        vals.officer.evaluations = evaluations.map(e => ({
            evaluation_id: e.OFE_ID,
            text: e.OFE_TEXT,
            date: e.OFE_DATE,
            evaluator_name: e.OFE_EVALUATOR_NAME,
            created_on: e.OFE_CREATED_ON,
        }));

        return {...rc, ...vals};
    }

    add_officer()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        // Validate phone number
        if ($Utils.empty(this.$phone_num))
        {
            return $ERRS.ERR_INVALID_PHONE_NUMBER;
        }

        // Validate community exists and is active
        let community = $Db.executeQuery(
            `SELECT COM_ID, COM_IS_ACTIVE FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
            [this.$community_id]);
        if (community.length === 0)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }
        if (community[0].COM_IS_ACTIVE !== 1)
        {
            return $ERRS.ERR_COMMUNITY_IS_NOT_ACTIVE;
        }

        // Check phone uniqueness
        let existingPhone = $Db.executeQuery(
            `SELECT USR_ID FROM \`user\`
             WHERE USR_PHONE_NUM=? AND USR_DELETED_ON IS NULL`,
            [this.$phone_num]);
        if (existingPhone.length > 0)
        {
            return $ERRS.ERR_USER_PHONE_ALREADY_EXISTS;
        }

        // Check email uniqueness if provided
        if (!$Utils.empty(this.$email))
        {
            if (!$Utils.validateEmail(this.$email))
            {
                return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
            }

            let existingEmail = $Db.executeQuery(
                `SELECT USR_ID FROM \`user\`
                 WHERE USR_EMAIL=? AND USR_DELETED_ON IS NULL`,
                [this.$email]);
            if (existingEmail.length > 0)
            {
                return $ERRS.ERR_USER_EMAIL_ALREADY_EXISTS;
            }
        }

        // Handle image upload
        let imageName = "";
        if (!$Utils.empty(this.$image))
        {
            let rv = $Utils.saveNewImageOrKeepOld(this.$Session.userId, this.$image, null, "officer");
            if ($Err.isERR(rv)) return rv;
            imageName = rv.image_name;
        }

        // Create user via built-in User/add_user
        let email = !$Utils.empty(this.$email) ? this.$email : this.$phone_num + "@placeholder.local";
        let addResult = $executeAPI(this.$Session, "User/add_user", {
            first_name: this.$first_name,
            last_name: this.$last_name || "",
            email: email,
            password: $Utils.uniqueHash(),
            type: $Const.USER_TYPE_OFFICER,
        });
        if ($Err.isERR(addResult))
        {
            return addResult;
        }

        let newUserId = addResult.userid;
        let now = $Utils.now();

        let rolesJson = (this.$roles && this.$roles.length > 0) ? JSON.stringify(this.$roles) : null;
        let badgesJson = (this.$certification_badges && this.$certification_badges.length > 0) ? JSON.stringify(this.$certification_badges) : null;

        $Db.beginTransaction();

        // Update user_details with phone, image, and community
        $Db.executeQuery(
            `UPDATE \`user_details\` SET USD_PHONE_NUM=?, USD_IMAGE=?, USD_COM_ID=? WHERE USD_USR_ID=?`,
            [this.$phone_num, imageName, this.$community_id, newUserId]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Set login authority to OTP (officers login via phone)
        // Note: USR_PHONE_NUM is synced from user_details via trigger — do not set it directly
        $Db.executeQuery(
            `UPDATE \`user\` SET USR_LOGIN_AUTHORITY=? WHERE USR_ID=?`,
            [$Const.USER_LOGIN_AUTHORITY_OTP, newUserId]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Create officer record
        $Db.executeQuery(
            `INSERT INTO \`officer\`
             (OFC_USR_ID, OFC_TITLE, OFC_DESCRIPTION, OFC_ADDRESS, OFC_ROLES, OFC_CERTIFICATION_BADGES, OFC_CREATED_ON)
             VALUES (?,?,?,?,?,?,?)`,
            [newUserId, this.$title, this.$description || null, this.$address || "",
             rolesJson, badgesJson, now]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        $Db.commitTransaction();

        vals.user_id = newUserId;
        return {...rc, ...vals};
    }

    update_officer()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let officer = fetchOfficerRecord(this.$user_id);
        if (!officer)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        // Validate email if being changed
        if (!$Utils.empty(this.$email) && this.$email !== officer.USR_EMAIL)
        {
            if (!$Utils.validateEmail(this.$email))
            {
                return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
            }

            let existingEmail = $Db.executeQuery(
                `SELECT USR_ID FROM \`user\`
                 WHERE USR_EMAIL=? AND USR_DELETED_ON IS NULL AND USR_ID!=?`,
                [this.$email, this.$user_id]);
            if (existingEmail.length > 0)
            {
                return $ERRS.ERR_USER_EMAIL_ALREADY_EXISTS;
            }
        }

        // Validate phone if being changed
        if (!$Utils.empty(this.$phone_num) && this.$phone_num !== officer.USD_PHONE_NUM)
        {
            let existingPhone = $Db.executeQuery(
                `SELECT USR_ID FROM \`user\`
                 WHERE USR_PHONE_NUM=? AND USR_DELETED_ON IS NULL AND USR_ID!=?`,
                [this.$phone_num, this.$user_id]);
            if (existingPhone.length > 0)
            {
                return $ERRS.ERR_USER_PHONE_ALREADY_EXISTS;
            }
        }

        // Validate community if being changed
        if (this.$community_id > 0 && this.$community_id !== officer.USD_COM_ID)
        {
            let community = $Db.executeQuery(
                `SELECT COM_ID, COM_IS_ACTIVE FROM \`community\` WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
                [this.$community_id]);
            if (community.length === 0)
            {
                return $ERRS.ERR_COMMUNITY_NOT_FOUND;
            }
            if (community[0].COM_IS_ACTIVE !== 1)
            {
                return $ERRS.ERR_COMMUNITY_IS_NOT_ACTIVE;
            }

            // Cannot move an officer to another community while they are handling open calls
            if ($CallUtils.officerHasOpenCalls(this.$user_id))
            {
                return $ERRS.ERR_OFFICER_HAS_ACTIVE_CALLS;
            }
        }

        // Cannot deactivate an officer while they are handling open calls
        if ($Utils.isset(this.$is_active) && this.$is_active === false && officer.USR_STATUS === 1
            && $CallUtils.officerHasOpenCalls(this.$user_id))
        {
            return $ERRS.ERR_OFFICER_HAS_ACTIVE_CALLS;
        }

        // Handle image
        let newImageName = null;
        if ($Utils.isset(this.$image))
        {
            if (this.$image === "")
            {
                newImageName = "";
            }
            else
            {
                let rv = $Utils.saveNewImageOrKeepOld(this.$Session.userId, this.$image, officer.USD_IMAGE, "officer");
                if ($Err.isERR(rv)) return rv;
                newImageName = rv.image_name;
            }
        }

        // Build user_details update
        let udFields = [];
        let udValues = [];

        if (!$Utils.empty(this.$first_name))
        {
            udFields.push("USD_FIRST_NAME=?");
            udValues.push(this.$first_name);
        }
        if ($Utils.isset(this.$last_name))
        {
            udFields.push("USD_LAST_NAME=?");
            udValues.push(this.$last_name);
        }
        if (!$Utils.empty(this.$email) && this.$email !== officer.USR_EMAIL)
        {
            udFields.push("USD_EMAIL=?");
            udValues.push(this.$email);
        }
        if (!$Utils.empty(this.$phone_num) && this.$phone_num !== officer.USD_PHONE_NUM)
        {
            udFields.push("USD_PHONE_NUM=?");
            udValues.push(this.$phone_num);
        }
        if (this.$community_id > 0 && this.$community_id !== officer.USD_COM_ID)
        {
            udFields.push("USD_COM_ID=?");
            udValues.push(this.$community_id);
        }
        if (newImageName !== null)
        {
            udFields.push("USD_IMAGE=?");
            udValues.push(newImageName);
        }
        if ($Utils.isset(this.$is_active))
        {
            udFields.push("USD_STATUS=?");
            udValues.push(this.$is_active ? 1 : 0);
        }

        // Build officer table update
        let ofcFields = [];
        let ofcValues = [];

        if (!$Utils.empty(this.$title))
        {
            ofcFields.push("OFC_TITLE=?");
            ofcValues.push(this.$title);
        }
        if ($Utils.isset(this.$description))
        {
            ofcFields.push("OFC_DESCRIPTION=?");
            ofcValues.push(this.$description);
        }
        if ($Utils.isset(this.$address))
        {
            ofcFields.push("OFC_ADDRESS=?");
            ofcValues.push(this.$address);
        }
        if ($Utils.isset(this.$roles))
        {
            ofcFields.push("OFC_ROLES=?");
            ofcValues.push(this.$roles.length > 0 ? JSON.stringify(this.$roles) : null);
        }
        if ($Utils.isset(this.$certification_badges))
        {
            ofcFields.push("OFC_CERTIFICATION_BADGES=?");
            ofcValues.push(this.$certification_badges.length > 0 ? JSON.stringify(this.$certification_badges) : null);
        }

        let now = $Utils.now();
        let needsSessionTermination = false;

        // Phone change requires re-identification (clear token)
        if (!$Utils.empty(this.$phone_num) && this.$phone_num !== officer.USD_PHONE_NUM)
        {
            needsSessionTermination = true;
        }

        // Deactivation terminates session
        if ($Utils.isset(this.$is_active) && this.$is_active === false)
        {
            needsSessionTermination = true;
        }

        $Db.beginTransaction();

        if (udFields.length > 0)
        {
            udValues.push(this.$user_id);
            $Db.executeQuery(
                `UPDATE \`user_details\` SET ${udFields.join(", ")} WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
                udValues);
            if ($Db.isError())
            {
                $Db.rollbackTransaction();
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        if (ofcFields.length > 0)
        {
            ofcFields.push("OFC_LAST_UPDATE=?");
            ofcValues.push(now);
            ofcValues.push(this.$user_id);
            $Db.executeQuery(
                `UPDATE \`officer\` SET ${ofcFields.join(", ")} WHERE OFC_USR_ID=? AND OFC_DELETED_ON IS NULL`,
                ofcValues);
            if ($Db.isError())
            {
                $Db.rollbackTransaction();
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        // Clear session if phone changed or deactivated
        // Note: USR_PHONE_NUM is synced from user_details via trigger — do not set it directly
        if (needsSessionTermination)
        {
            $Db.executeQuery(
                `UPDATE \`user\` SET USR_TOKEN='', USR_DEVICE_ID=NULL WHERE USR_ID=?`,
                [this.$user_id]);
            if ($Db.isError())
            {
                $Db.rollbackTransaction();
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        $Db.commitTransaction();

        if (needsSessionTermination)
        {
            this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);
        }

        return rc;
    }

    delete_officer()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let officer = fetchOfficerRecord(this.$user_id);
        if (!officer)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        // Cannot delete an officer that has any call history (past or present) — only deactivate
        if ($CallUtils.officerHasAnyCalls(this.$user_id))
        {
            return $ERRS.ERR_OFFICER_CANNOT_DELETE;
        }

        // Cannot delete if officer has logged in — must deactivate instead
        if (officer.USR_LAST_LOGIN !== null)
        {
            return $ERRS.ERR_OFFICER_CANNOT_DELETE;
        }

        let now = $Utils.now();

        $Db.beginTransaction();

        // Clear session
        $Db.executeQuery(
            `UPDATE \`user\` SET USR_TOKEN='', USR_DEVICE_ID=NULL WHERE USR_ID=?`,
            [this.$user_id]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Soft-delete user_details
        $Db.executeQuery(
            `UPDATE \`user_details\` SET USD_DELETED_ON=?, USD_EMAIL=CONCAT(USD_EMAIL, '/DELETED'), USD_PHONE_NUM=CONCAT(USD_PHONE_NUM, '/DELETED')
             WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
            [now, this.$user_id]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Soft-delete officer record
        $Db.executeQuery(
            `UPDATE \`officer\` SET OFC_DELETED_ON=?, OFC_LAST_UPDATE=? WHERE OFC_USR_ID=? AND OFC_DELETED_ON IS NULL`,
            [now, now, this.$user_id]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        $Db.commitTransaction();

        this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);

        return rc;
    }

    // =========================================================================
    // Officer Self-Service (Mobile)
    // =========================================================================

    get_my_details()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let filesSql = new $Files.SQL("USD_IMAGE");

        let rows = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, ${filesSql.select()}, USD_COM_ID,
                    OFC_TITLE, OFC_DESCRIPTION, OFC_ADDRESS, OFC_ROLES, OFC_CERTIFICATION_BADGES,
                    COM_NAME
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`officer\` ON USR_ID = OFC_USR_ID
                ${filesSql.join()}
                LEFT OUTER JOIN \`community\` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
             WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL`,
            [userId, $Const.USER_TYPE_OFFICER]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        vals.officer = mapOfficerRow(rows[0], filesSql);

        return {...rc, ...vals};
    }

    update_my_details()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let officer = fetchOfficerRecord(userId);
        if (!officer)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        // Validate email if being changed
        if (!$Utils.empty(this.$email) && this.$email !== officer.USR_EMAIL)
        {
            if (!$Utils.validateEmail(this.$email))
            {
                return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
            }

            let existingEmail = $Db.executeQuery(
                `SELECT USR_ID FROM \`user\`
                 WHERE USR_EMAIL=? AND USR_DELETED_ON IS NULL AND USR_ID!=?`,
                [this.$email, userId]);
            if (existingEmail.length > 0)
            {
                return $ERRS.ERR_USER_EMAIL_ALREADY_EXISTS;
            }
        }

        // Build user_details update (officer can edit: first_name, last_name, email)
        let udFields = [];
        let udValues = [];

        if (!$Utils.empty(this.$first_name))
        {
            udFields.push("USD_FIRST_NAME=?");
            udValues.push(this.$first_name);
        }
        if ($Utils.isset(this.$last_name))
        {
            udFields.push("USD_LAST_NAME=?");
            udValues.push(this.$last_name);
        }
        if (!$Utils.empty(this.$email) && this.$email !== officer.USR_EMAIL)
        {
            udFields.push("USD_EMAIL=?");
            udValues.push(this.$email);
        }

        // Build officer table update (officer can edit: address)
        let ofcFields = [];
        let ofcValues = [];

        if ($Utils.isset(this.$address))
        {
            ofcFields.push("OFC_ADDRESS=?");
            ofcValues.push(this.$address);
        }

        $Db.beginTransaction();

        if (udFields.length > 0)
        {
            udValues.push(userId);
            $Db.executeQuery(
                `UPDATE \`user_details\` SET ${udFields.join(", ")} WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
                udValues);
            if ($Db.isError())
            {
                $Db.rollbackTransaction();
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        if (ofcFields.length > 0)
        {
            ofcFields.push("OFC_LAST_UPDATE=?");
            ofcValues.push($Utils.now());
            ofcValues.push(userId);
            $Db.executeQuery(
                `UPDATE \`officer\` SET ${ofcFields.join(", ")} WHERE OFC_USR_ID=? AND OFC_DELETED_ON IS NULL`,
                ofcValues);
            if ($Db.isError())
            {
                $Db.rollbackTransaction();
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        $Db.commitTransaction();

        return rc;
    }

    // =========================================================================
    // Resident-Facing — Officers Info (SDS 2.8)
    // =========================================================================

    get_officers_info()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        // Get resident's community
        let residentRows = $Db.executeQuery(
            `SELECT USD_COM_ID FROM \`user_details\`
             WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
            [userId]);
        if (residentRows.length === 0 || !residentRows[0].USD_COM_ID)
        {
            vals.officers = [];
            return {...rc, ...vals};
        }

        let communityId = residentRows[0].USD_COM_ID;

        let filesSql = new $Files.SQL("USD_IMAGE");

        // TODO: Once the Shift module (Phase 2.3) is implemented, add a JOIN to the
        //       shift/check-in table to filter only officers currently checked in,
        //       per SDS 2.8: "present only the officers checked in."
        //       For now, all active officers in the community are returned.
        let rows = $Db.executeQuery(
            `SELECT USR_ID, USD_FIRST_NAME, USD_LAST_NAME, ${filesSql.select()},
                    OFC_TITLE, OFC_DESCRIPTION
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`officer\` ON USR_ID = OFC_USR_ID
                ${filesSql.join()}
             WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_COM_ID=?
               AND USD_DELETED_ON IS NULL AND OFC_DELETED_ON IS NULL
             ORDER BY USD_FIRST_NAME ASC`,
            [$Const.USER_TYPE_OFFICER, communityId]);

        vals.officers = rows.map(row => ({
            user_id: row.USR_ID,
            first_name: row.USD_FIRST_NAME,
            last_name: row.USD_LAST_NAME,
            title: row.OFC_TITLE,
            description: row.OFC_DESCRIPTION,
            image_url: $Files.getUrl(filesSql.get(row)),
        }));

        return {...rc, ...vals};
    }

    // =========================================================================
    // Officer Evaluations
    // =========================================================================

    get_officer_evaluations()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let officer = fetchOfficerRecord(this.$user_id);
        if (!officer)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        let evaluations = $Db.executeQuery(
            `SELECT OFE_ID, OFE_TEXT, OFE_DATE, OFE_EVALUATOR_NAME, OFE_CREATED_ON
             FROM \`officer_evaluation\`
             WHERE OFE_OFC_USR_ID=? AND OFE_DELETED_ON IS NULL
             ORDER BY OFE_DATE DESC`,
            [this.$user_id]);

        vals.evaluations = evaluations.map(e => ({
            evaluation_id: e.OFE_ID,
            text: e.OFE_TEXT,
            date: e.OFE_DATE,
            evaluator_name: e.OFE_EVALUATOR_NAME,
            created_on: e.OFE_CREATED_ON,
        }));

        return {...rc, ...vals};
    }

    add_officer_evaluation()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let officer = fetchOfficerRecord(this.$user_id);
        if (!officer)
        {
            return $ERRS.ERR_OFFICER_NOT_FOUND;
        }

        // Get evaluator name from session
        let evaluatorRows = $Db.executeQuery(
            `SELECT USD_FIRST_NAME, USD_LAST_NAME FROM \`user_details\` WHERE USD_USR_ID=?`,
            [this.$Session.userId]);
        let evaluatorName = evaluatorRows.length > 0
            ? (evaluatorRows[0].USD_FIRST_NAME + " " + evaluatorRows[0].USD_LAST_NAME).trim()
            : "Unknown";

        $Db.executeQuery(
            `INSERT INTO \`officer_evaluation\`
             (OFE_OFC_USR_ID, OFE_TEXT, OFE_DATE, OFE_EVALUATOR_NAME, OFE_CREATED_ON)
             VALUES (?,?,?,?,?)`,
            [this.$user_id, this.$text, this.$date, evaluatorName, $Utils.now()]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        vals.evaluation_id = $Db.insertId();
        return {...rc, ...vals};
    }

    delete_officer_evaluation()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let existing = $Db.executeQuery(
            `SELECT OFE_ID FROM \`officer_evaluation\` WHERE OFE_ID=? AND OFE_DELETED_ON IS NULL`,
            [this.$evaluation_id]);
        if (existing.length === 0)
        {
            return $ERRS.ERR_OFFICER_EVALUATION_NOT_FOUND;
        }

        $Db.executeQuery(
            `UPDATE \`officer_evaluation\` SET OFE_DELETED_ON=? WHERE OFE_ID=? AND OFE_DELETED_ON IS NULL`,
            [$Utils.now(), this.$evaluation_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }
};
