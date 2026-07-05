function fetchAdminUserRecord(userId)
{
    let rows = $Db.executeQuery(
        `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON,
                USR_LAST_LOGIN, USR_PASSWORD,
                USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM,
                USD_ROLE_ALLOW, USD_ROLE_DENY
         FROM \`user\`
            JOIN \`user_details\` ON USR_ID = USD_USR_ID
         WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL`,
        [userId, $Const.USER_TYPE_ADMIN]);
    return rows.length > 0 ? rows[0] : null;
}

function getActiveAdminCount()
{
    let rows = $Db.executeQuery(
        `SELECT COUNT(*) cnt
         FROM \`user\`
            JOIN \`user_details\` ON USR_ID = USD_USR_ID
         WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_DELETED_ON IS NULL`,
        [$Const.USER_TYPE_ADMIN]);
    return rows[0].cnt;
}

function mapAdminUserRow(row)
{
    let roles = $Utils.getCalculatedUserRoles($Const.USER_TYPE_ADMIN, row.USD_ROLE_ALLOW, row.USD_ROLE_DENY);
    let primaryRole = roles.length > 0 ? roles[0] : null;

    return {
        user_id: row.USR_ID,
        first_name: row.USD_FIRST_NAME,
        last_name: row.USD_LAST_NAME,
        email: row.USR_EMAIL,
        phone_num: row.USD_PHONE_NUM,
        role: primaryRole,
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
    // Admin Users
    // =========================================================================

    get_admin_users()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let conditions = ["USR_TYPE=?", "USD_DELETED_ON IS NULL"];
        let params = [$Const.USER_TYPE_ADMIN];

        if (!this.$include_inactive)
        {
            conditions.push("USR_STATUS = 1");
        }

        if (!$Utils.empty(this.$search_text))
        {
            let term = "%" + this.$search_text + "%";
            conditions.push(
                `(USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ? OR USR_EMAIL LIKE ? OR USD_PHONE_NUM LIKE ?)`);
            params.push(term, term, term, term);
        }

        let validSortColumns = {
            "first_name": "USD_FIRST_NAME",
            "last_name": "USD_LAST_NAME",
            "email": "USR_EMAIL",
            "role": "USD_ROLE_ALLOW",
            "created_on": "USR_CREATED_ON",
        };
        let orderBy = "USD_FIRST_NAME ASC";
        if (!$Utils.empty(this.$sort_by) && validSortColumns[this.$sort_by])
        {
            let direction = (this.$sort_dir === "desc") ? "DESC" : "ASC";
            orderBy = `${validSortColumns[this.$sort_by]} ${direction}`;
        }

        let users = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON,
                    USR_LAST_LOGIN,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM,
                    USD_ROLE_ALLOW, USD_ROLE_DENY
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
             WHERE ${conditions.join(" AND ")}
             ORDER BY ${orderBy}`, params);

        vals.users = users.map(row => mapAdminUserRow(row));
        vals.total_count = vals.users.length;

        return {...rc, ...vals};
    }

    get_admin_user()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let user = fetchAdminUserRecord(this.$user_id);
        if (!user)
        {
            return $ERRS.ERR_ADMIN_USER_NOT_FOUND;
        }

        vals.user = mapAdminUserRow(user);

        return {...rc, ...vals};
    }

    add_admin_user()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        // Validate email
        if (!$Utils.validateEmail(this.$email))
        {
            return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
        }

        // Validate first name is not empty
        if ($Utils.empty(this.$first_name))
        {
            return $ERRS.ERR_REQ_FIRST_NAME;
        }

        // Validate password criteria
        if (!$Utils.isValidPassword(this.$password))
        {
            return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
        }

        // Check email uniqueness
        let existing = $Db.executeQuery(
            `SELECT USR_ID FROM \`user\`
             WHERE USR_EMAIL=? AND USR_DELETED_ON IS NULL`,
            [this.$email]);
        if (existing.length > 0)
        {
            return $ERRS.ERR_USER_EMAIL_ALREADY_EXISTS;
        }

        // Validate role
        let isValidRole = $Globals.allUserRoles.some(r => r[1] == this.$role);
        if (!isValidRole)
        {
            return $ERRS.ERR_INVALID_USER_ROLE;
        }

        // Create user via built-in User/add_user
        let addResult = $executeAPI(this.$Session, "User/add_user", {
            first_name: this.$first_name,
            last_name: this.$last_name || "",
            email: this.$email,
            password: this.$password,
            type: $Const.USER_TYPE_ADMIN,
        });
        if ($Err.isERR(addResult))
        {
            return addResult;
        }

        let newUserId = addResult.userid;

        // Set phone number if provided
        if (!$Utils.empty(this.$phone_num))
        {
            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_PHONE_NUM=? WHERE USD_USR_ID=?`,
                [this.$phone_num, newUserId]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        // Set role via $UserRoles module
        let roleResult = $UserRoles.setUserRoles(newUserId, [this.$role], [], [], []);
        if ($Err.isERR(roleResult))
        {
            return roleResult;
        }

        $Db.executeQuery(
            `UPDATE \`user\` SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?`,
            [this.$password, $Utils.now(), newUserId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        vals.user_id = newUserId;
        return {...rc, ...vals};
    }

    update_admin_user()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let user = fetchAdminUserRecord(this.$user_id);
        if (!user)
        {
            return $ERRS.ERR_ADMIN_USER_NOT_FOUND;
        }

        // Cannot deactivate if last active admin
        if ($Utils.isset(this.$is_active) && this.$is_active === false && user.USR_STATUS === 1)
        {
            let activeCount = getActiveAdminCount();
            if (activeCount <= 1)
            {
                return $ERRS.ERR_ADMIN_CANNOT_DELETE_SELF;
            }
        }

        // Determine if email is being changed
        let emailChanged = !$Utils.empty(this.$email) && this.$email !== user.USR_EMAIL;

        // Validate email if being changed
        if (emailChanged)
        {
            if (!$Utils.validateEmail(this.$email))
            {
                return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
            }

            let existing = $Db.executeQuery(
                `SELECT USR_ID FROM \`user\`
                 WHERE USR_EMAIL=? AND USR_DELETED_ON IS NULL AND USR_ID!=?`,
                [this.$email, this.$user_id]);
            if (existing.length > 0)
            {
                return $ERRS.ERR_USER_EMAIL_ALREADY_EXISTS;
            }

            // SDS 5.2.3: initial_password is mandatory when email changes
            if ($Utils.empty(this.$initial_password))
            {
                return $Err.errWithInfo("ERR_MISSING_API_PARAM", "initial_password");
            }

            // Validate initial_password criteria
            if (!$Utils.isValidPassword(this.$initial_password))
            {
                return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
            }
        }

        // Build dynamic update for user_details
        let updateFields = [];
        let updateValues = [];

        if (!$Utils.empty(this.$first_name))
        {
            updateFields.push("USD_FIRST_NAME=?");
            updateValues.push(this.$first_name);
        }
        if ($Utils.isset(this.$last_name))
        {
            updateFields.push("USD_LAST_NAME=?");
            updateValues.push(this.$last_name);
        }
        if (emailChanged)
        {
            updateFields.push("USD_EMAIL=?");
            updateValues.push(this.$email);
        }
        if ($Utils.isset(this.$phone_num))
        {
            updateFields.push("USD_PHONE_NUM=?");
            updateValues.push(this.$phone_num);
        }
        if ($Utils.isset(this.$is_active))
        {
            updateFields.push("USD_STATUS=?");
            updateValues.push(this.$is_active ? 1 : 0);
        }

        let needsUserUpdate = emailChanged || ($Utils.isset(this.$is_active) && this.$is_active === false);

        if (updateFields.length > 0 || needsUserUpdate)
        {
            $Db.beginTransaction();

            if (updateFields.length > 0)
            {
                updateValues.push(this.$user_id);
                $Db.executeQuery(
                    `UPDATE \`user_details\` SET ${updateFields.join(", ")} WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
                    updateValues);
                if ($Db.isError())
                {
                    $Db.rollbackTransaction();
                    return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
                }
            }

            // Email change: store X-prefixed password and clear session (atomic)
            if (emailChanged)
            {
                $Db.executeQuery(
                    `UPDATE \`user\` SET USR_EMAIL=?, USR_PASSWORD=?, USR_TOKEN='', USR_DEVICE_ID=NULL, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?`,
                    [this.$email, this.$initial_password, $Utils.now(), this.$user_id]);
                if ($Db.isError())
                {
                    $Db.rollbackTransaction();
                    return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
                }
            }
            // If user was deactivated (and email was NOT changed), clear their token
            else if ($Utils.isset(this.$is_active) && this.$is_active === false)
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

            // Invalidate token cache if session was terminated
            if (emailChanged || ($Utils.isset(this.$is_active) && this.$is_active === false))
            {
                this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);
            }
        }

        return rc;
    }

    reset_admin_user_password()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let user = fetchAdminUserRecord(this.$user_id);
        if (!user)
        {
            return $ERRS.ERR_ADMIN_USER_NOT_FOUND;
        }

        // Validate password criteria
        if (!$Utils.isValidPassword(this.$password))
        {
            return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
        }

        $Db.executeQuery(
            `UPDATE \`user\` SET USR_PASSWORD=?, USR_TOKEN='', USR_DEVICE_ID=NULL, USR_PASSWORD_CREATED_ON=?
             WHERE USR_ID=?`,
            [this.$password, $Utils.now(), this.$user_id]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);

        return rc;
    }

    delete_admin_user()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let user = fetchAdminUserRecord(this.$user_id);
        if (!user)
        {
            return $ERRS.ERR_ADMIN_USER_NOT_FOUND;
        }

        // Cannot delete yourself
        if (this.$user_id === this.$Session.userId)
        {
            return $ERRS.ERR_ADMIN_CANNOT_DELETE_SELF;
        }

        // Cannot delete if last active admin
        let activeCount = getActiveAdminCount();
        if (activeCount <= 1 && user.USR_STATUS === 1)
        {
            return $ERRS.ERR_ADMIN_CANNOT_DELETE_SELF;
        }

        // Soft-delete via user_details (trigger syncs to user table)
        let now = $Utils.now();

        $Db.beginTransaction();

        $Db.executeQuery(
            `UPDATE \`user\` SET USR_TOKEN='', USR_DEVICE_ID=NULL WHERE USR_ID=?`,
            [this.$user_id]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        $Db.executeQuery(
            `UPDATE \`user_details\` SET USD_DELETED_ON=?, USD_EMAIL=CONCAT(USD_EMAIL, '/DELETED'), USD_PHONE_NUM=CONCAT(USD_PHONE_NUM, '/DELETED')
             WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
            [now, this.$user_id]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        $Db.commitTransaction();

        this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);

        return rc;
    }

    change_admin_user_role()
    {
        let rc = $ERRS.ERR_SUCCESS;

        // Cannot change your own role
        if (this.$user_id === this.$Session.userId)
        {
            return $ERRS.ERR_ADMIN_CANNOT_EDIT_SELF_ROLE;
        }

        let user = fetchAdminUserRecord(this.$user_id);
        if (!user)
        {
            return $ERRS.ERR_ADMIN_USER_NOT_FOUND;
        }

        // Validate role
        let isValidRole = $Globals.allUserRoles.some(r => r[1] == this.$role);
        if (!isValidRole)
        {
            return $ERRS.ERR_INVALID_USER_ROLE;
        }

        // Reset all current roles, then set the new one
        let currentRoles = $Utils.getCalculatedUserRoles($Const.USER_TYPE_ADMIN, user.USD_ROLE_ALLOW, user.USD_ROLE_DENY);
        let roleResult = $UserRoles.setUserRoles(this.$user_id, [this.$role], currentRoles.filter(r => r != this.$role), [], []);
        if ($Err.isERR(roleResult))
        {
            return roleResult;
        }

        return rc;
    }

    change_my_password()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        // Fetch current user
        let user = fetchAdminUserRecord(userId);
        if (!user)
        {
            return $ERRS.ERR_ADMIN_USER_NOT_FOUND;
        }

        // Verify current password
        if (!$Utils.isCorrectPwd(userId, this.$current_password, user.USR_PASSWORD))
        {
            return $ERRS.ERR_INVALID_PASSWORD;
        }

        // Validate new password criteria
        if (!$Utils.isValidPassword(this.$new_password))
        {
            return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
        }

        // New password cannot be same as current
        if (this.$new_password === this.$current_password)
        {
            return $ERRS.ERR_NEW_PASSWORD_CANNOT_BE_SAME_AS_CURRENT;
        }

        // Update password
        let hashedPassword = $Utils.hash(userId + this.$new_password);

        $Db.executeQuery(
            `UPDATE \`user\` SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?`,
            [hashedPassword, $Utils.now(), userId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }
};
