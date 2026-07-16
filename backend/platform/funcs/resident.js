function fetchResidentRecord(userId)
{
    let rows = $Db.executeQuery(
        `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
                USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_COM_ID,
                RES_ADDRESS, RES_VEHICLES, RES_INSTRUCTIONS, RES_IMAGES, RES_COMMUNICATION_TEST
         FROM \`user\`
            JOIN \`user_details\` ON USR_ID = USD_USR_ID
            JOIN \`resident\` ON USR_ID = RES_USR_ID
         WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL`,
        [userId, $Const.USER_TYPE_RESIDENT]);
    return rows.length > 0 ? rows[0] : null;
}

function mapResidentRow(row)
{
    let imagesArr = row.RES_IMAGES ? (typeof row.RES_IMAGES === "string" ? JSON.parse(row.RES_IMAGES) : row.RES_IMAGES) : [];
    return {
        user_id: row.USR_ID,
        first_name: row.USD_FIRST_NAME,
        last_name: row.USD_LAST_NAME,
        email: row.USR_EMAIL,
        phone_num: row.USD_PHONE_NUM,
        community_id: row.USD_COM_ID,
        community_name: row.COM_NAME || null,
        address: row.RES_ADDRESS,
        vehicles: row.RES_VEHICLES ? (typeof row.RES_VEHICLES === "string" ? JSON.parse(row.RES_VEHICLES) : row.RES_VEHICLES) : [],
        instructions: row.RES_INSTRUCTIONS || "",
        images: parseImagesArray(imagesArr),
        communication_test: row.RES_COMMUNICATION_TEST === 1,
        is_active: row.USR_STATUS === 1,
        created_on: row.USR_CREATED_ON,
        last_login: row.USR_LAST_LOGIN,
    };
}

function parseImagesArray(imagesArr)
{
    if (!imagesArr || imagesArr.length === 0)
    {
        return [];
    }
    return imagesArr.map(name => $Files.getUrl({file_name: name})).filter(url => url);
}

function resolveImagesList(newImageIds, keepImageUrls)
{
    let fileNames = [];

    // Resolve keep_images: extract file names from URLs
    if (keepImageUrls && keepImageUrls.length > 0)
    {
        for (let i = 0; i < keepImageUrls.length; i++)
        {
            let fileName = $Files.getFileNameFromUrl(keepImageUrls[i]);
            if (!$Utils.empty(fileName))
            {
                fileNames.push(fileName);
            }
        }
    }

    // Resolve new_image_ids: batch lookup file names from file table
    if (newImageIds && newImageIds.length > 0)
    {
        let fileRows = $Db.executeQuery(
            `SELECT FIL_ID, FIL_FILE_NAME FROM \`file\` WHERE FIL_ID IN (${newImageIds.toPlaceholders()})`,
            newImageIds);
        if (fileRows.length !== newImageIds.length)
        {
            return $ERRS.ERR_FILE_NOT_FOUND;
        }
        for (let i = 0; i < fileRows.length; i++)
        {
            fileNames.push(fileRows[i].FIL_FILE_NAME);
        }
    }

    return {images: fileNames};
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
    // Residents - Admin CRUD
    // =========================================================================

    get_residents()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let conditions = ["USR_TYPE=?", "USD_DELETED_ON IS NULL", "RES_DELETED_ON IS NULL"];
        let params = [$Const.USER_TYPE_RESIDENT];

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
                `(USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ? OR USR_EMAIL LIKE ? OR USD_PHONE_NUM LIKE ? OR RES_ADDRESS LIKE ? OR COM_NAME LIKE ?)`);
            params.push(term, term, term, term, term, term);
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

        let residents = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_COM_ID,
                    RES_ADDRESS, RES_VEHICLES, RES_INSTRUCTIONS, RES_IMAGES, RES_COMMUNICATION_TEST,
                    COM_NAME
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`resident\` ON USR_ID = RES_USR_ID
                LEFT OUTER JOIN \`community\` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
             WHERE ${conditions.join(" AND ")}
             ORDER BY ${orderBy}`, params);

        vals.residents = residents.map(row => mapResidentRow(row));
        vals.total_count = vals.residents.length;

        return {...rc, ...vals};
    }

    get_resident()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let rows = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON, USR_LAST_LOGIN,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_COM_ID,
                    RES_ADDRESS, RES_VEHICLES, RES_INSTRUCTIONS, RES_IMAGES, RES_COMMUNICATION_TEST,
                    COM_NAME
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`resident\` ON USR_ID = RES_USR_ID
                LEFT OUTER JOIN \`community\` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
             WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL`,
            [this.$user_id, $Const.USER_TYPE_RESIDENT]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_RESIDENT_NOT_FOUND;
        }

        vals.resident = mapResidentRow(rows[0]);

        return {...rc, ...vals};
    }

    add_resident()
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

        // Create user via built-in User/add_user
        let email = !$Utils.empty(this.$email) ? this.$email : this.$phone_num + "@placeholder.local";
        let addResult = $executeAPI(this.$Session, "User/add_user", {
            first_name: this.$first_name,
            last_name: this.$last_name || "",
            email: email,
            password: $Utils.uniqueHash(),
            type: $Const.USER_TYPE_RESIDENT,
        });
        if ($Err.isERR(addResult))
        {
            return addResult;
        }

        let newUserId = addResult.userid;
        let now = $Utils.now();

        let vehiclesJson = (this.$vehicles && this.$vehicles.length > 0) ? JSON.stringify(this.$vehicles) : null;

        $Db.beginTransaction();

        // Update user_details with phone and community
        $Db.executeQuery(
            `UPDATE \`user_details\` SET USD_PHONE_NUM=?, USD_COM_ID=? WHERE USD_USR_ID=?`,
            [this.$phone_num, this.$community_id, newUserId]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Set login authority to OTP (residents login via phone)
        $Db.executeQuery(
            `UPDATE \`user\` SET USR_LOGIN_AUTHORITY=? WHERE USR_ID=?`,
            [$Const.USER_LOGIN_AUTHORITY_OTP, newUserId]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        // Create resident record
        $Db.executeQuery(
            `INSERT INTO \`resident\`
             (RES_USR_ID, RES_ADDRESS, RES_VEHICLES, RES_INSTRUCTIONS, RES_COMMUNICATION_TEST, RES_CREATED_ON)
             VALUES (?,?,?,?,?,?)`,
            [newUserId, this.$address || "", vehiclesJson, this.$instructions || null,
             this.$communication_test ? 1 : 0, now]);
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        $Db.commitTransaction();

        vals.user_id = newUserId;
        return {...rc, ...vals};
    }

    update_resident()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let resident = fetchResidentRecord(this.$user_id);
        if (!resident)
        {
            return $ERRS.ERR_RESIDENT_NOT_FOUND;
        }

        // Validate email if being changed
        if (!$Utils.empty(this.$email) && this.$email !== resident.USR_EMAIL)
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
        if (!$Utils.empty(this.$phone_num) && this.$phone_num !== resident.USD_PHONE_NUM)
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
        if (this.$community_id > 0 && this.$community_id !== resident.USD_COM_ID)
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

            // TODO: Once Call module (Phase 3) is implemented, check for active calls before community change
            // let activeCalls = $Db.executeQuery(
            //     `SELECT CAL_ID FROM \`call\` WHERE CAL_RES_USR_ID=? AND CAL_STATUS IN (...)`, [this.$user_id]);
            // if (activeCalls.length > 0) return $ERRS.ERR_RESIDENT_HAS_ACTIVE_CALLS;
        }
        else if (this.$community_id > 0 && this.$community_id === resident.USD_COM_ID)
        {
            return $ERRS.ERR_RESIDENT_ALREADY_EXISTS;
        }

        // Check active calls before deactivation
        if ($Utils.isset(this.$is_active) && this.$is_active === false && resident.USR_STATUS === 1)
        {
            // TODO: Once Call module (Phase 3) is implemented, check for active calls before deactivation
            // let activeCalls = $Db.executeQuery(
            //     `SELECT CAL_ID FROM \`call\` WHERE CAL_RES_USR_ID=? AND CAL_STATUS IN (...)`, [this.$user_id]);
            // if (activeCalls.length > 0) return $ERRS.ERR_RESIDENT_HAS_ACTIVE_CALLS;
        }

        // Handle images (uploaded separately via File/upload_file_base64 or multipart upload)
        let imagesChanged = $Utils.isset(this.$new_image_ids) || $Utils.isset(this.$keep_images);
        let newImagesJson = null;
        if (imagesChanged)
        {
            let newIds = this.$new_image_ids || [];
            let keepUrls = this.$keep_images || [];

            if (newIds.length === 0 && keepUrls.length === 0)
            {
                // Both empty = clear all images
                newImagesJson = null;
            }
            else
            {
                let rv = resolveImagesList(newIds, keepUrls);
                if ($Err.isERR(rv)) return rv;
                newImagesJson = JSON.stringify(rv.images);
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
        if (!$Utils.empty(this.$email) && this.$email !== resident.USR_EMAIL)
        {
            udFields.push("USD_EMAIL=?");
            udValues.push(this.$email);
        }
        if (!$Utils.empty(this.$phone_num) && this.$phone_num !== resident.USD_PHONE_NUM)
        {
            udFields.push("USD_PHONE_NUM=?");
            udValues.push(this.$phone_num);
        }
        if (this.$community_id > 0 && this.$community_id !== resident.USD_COM_ID)
        {
            udFields.push("USD_COM_ID=?");
            udValues.push(this.$community_id);
        }
        if ($Utils.isset(this.$is_active))
        {
            udFields.push("USD_STATUS=?");
            udValues.push(this.$is_active ? 1 : 0);
        }

        // Build resident table update
        let resFields = [];
        let resValues = [];

        if ($Utils.isset(this.$address))
        {
            resFields.push("RES_ADDRESS=?");
            resValues.push(this.$address);
        }
        if ($Utils.isset(this.$vehicles))
        {
            resFields.push("RES_VEHICLES=?");
            resValues.push(this.$vehicles.length > 0 ? JSON.stringify(this.$vehicles) : null);
        }
        if ($Utils.isset(this.$instructions))
        {
            resFields.push("RES_INSTRUCTIONS=?");
            resValues.push(this.$instructions || null);
        }
        if (imagesChanged)
        {
            resFields.push("RES_IMAGES=?");
            resValues.push(newImagesJson);
        }
        if ($Utils.isset(this.$communication_test))
        {
            resFields.push("RES_COMMUNICATION_TEST=?");
            resValues.push(this.$communication_test ? 1 : 0);
        }

        let now = $Utils.now();
        let needsSessionTermination = false;

        // Phone change requires re-identification (clear token)
        if (!$Utils.empty(this.$phone_num) && this.$phone_num !== resident.USD_PHONE_NUM)
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

        if (resFields.length > 0)
        {
            resFields.push("RES_LAST_UPDATE=?");
            resValues.push(now);
            resValues.push(this.$user_id);
            $Db.executeQuery(
                `UPDATE \`resident\` SET ${resFields.join(", ")} WHERE RES_USR_ID=? AND RES_DELETED_ON IS NULL`,
                resValues);
            if ($Db.isError())
            {
                $Db.rollbackTransaction();
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        // Clear session if phone changed or deactivated
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

    delete_resident()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let resident = fetchResidentRecord(this.$user_id);
        if (!resident)
        {
            return $ERRS.ERR_RESIDENT_NOT_FOUND;
        }

        // TODO: Once Call module (Phase 3) is implemented, check for ANY calls (past or present)
        // let anyCalls = $Db.executeQuery(
        //     `SELECT CAL_ID FROM \`call\` WHERE CAL_RES_USR_ID=? LIMIT 1`, [this.$user_id]);
        // if (anyCalls.length > 0) return $ERRS.ERR_RESIDENT_CANNOT_DELETE;

        // For now, use the same pattern as officer: cannot delete if ever logged in
        if (resident.USR_LAST_LOGIN !== null)
        {
            return $ERRS.ERR_RESIDENT_CANNOT_DELETE;
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

        // Soft-delete resident record
        $Db.executeQuery(
            `UPDATE \`resident\` SET RES_DELETED_ON=?, RES_LAST_UPDATE=? WHERE RES_USR_ID=? AND RES_DELETED_ON IS NULL`,
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
    // Resident Self-Service (Mobile)
    // =========================================================================

    get_my_details()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let rows = $Db.executeQuery(
            `SELECT USR_ID, USR_EMAIL, USR_STATUS, USR_CREATED_ON,
                    USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_COM_ID,
                    RES_ADDRESS, RES_VEHICLES, RES_INSTRUCTIONS, RES_IMAGES, RES_COMMUNICATION_TEST,
                    COM_NAME
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`resident\` ON USR_ID = RES_USR_ID
                LEFT OUTER JOIN \`community\` ON USD_COM_ID = COM_ID AND COM_DELETED_ON IS NULL
             WHERE USR_ID=? AND USR_TYPE=? AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL`,
            [userId, $Const.USER_TYPE_RESIDENT]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_RESIDENT_NOT_FOUND;
        }

        let row = rows[0];
        vals.resident = {
            user_id: row.USR_ID,
            first_name: row.USD_FIRST_NAME,
            last_name: row.USD_LAST_NAME,
            email: row.USR_EMAIL,
            phone_num: row.USD_PHONE_NUM,
            community_id: row.USD_COM_ID,
            community_name: row.COM_NAME || null,
            address: row.RES_ADDRESS,
            vehicles: row.RES_VEHICLES ? (typeof row.RES_VEHICLES === "string" ? JSON.parse(row.RES_VEHICLES) : row.RES_VEHICLES) : [],
            instructions: row.RES_INSTRUCTIONS || "",
            images: parseImagesArray(row.RES_IMAGES ? (typeof row.RES_IMAGES === "string" ? JSON.parse(row.RES_IMAGES) : row.RES_IMAGES) : []),
            communication_test: row.RES_COMMUNICATION_TEST === 1,
            created_on: row.USR_CREATED_ON,
        };

        return {...rc, ...vals};
    }

    update_my_details()
    {
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        let resident = fetchResidentRecord(userId);
        if (!resident)
        {
            return $ERRS.ERR_RESIDENT_NOT_FOUND;
        }

        // Validate email if being changed
        if (!$Utils.empty(this.$email) && this.$email !== resident.USR_EMAIL)
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

        // Handle images (uploaded separately via File/upload_file_base64 or multipart upload)
        let imagesChanged = $Utils.isset(this.$new_image_ids) || $Utils.isset(this.$keep_images);
        let newImagesJson = null;
        if (imagesChanged)
        {
            let newIds = this.$new_image_ids || [];
            let keepUrls = this.$keep_images || [];

            if (newIds.length === 0 && keepUrls.length === 0)
            {
                // Both empty = clear all images
                newImagesJson = null;
            }
            else
            {
                let rv = resolveImagesList(newIds, keepUrls);
                if ($Err.isERR(rv)) return rv;
                newImagesJson = JSON.stringify(rv.images);
            }
        }

        // Build user_details update (resident can edit: first_name, last_name, email)
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
        if (!$Utils.empty(this.$email) && this.$email !== resident.USR_EMAIL)
        {
            udFields.push("USD_EMAIL=?");
            udValues.push(this.$email);
        }

        // Build resident table update (resident can edit: address, instructions, images)
        let resFields = [];
        let resValues = [];

        if ($Utils.isset(this.$address))
        {
            resFields.push("RES_ADDRESS=?");
            resValues.push(this.$address);
        }
        if ($Utils.isset(this.$instructions))
        {
            resFields.push("RES_INSTRUCTIONS=?");
            resValues.push(this.$instructions || null);
        }
        if (imagesChanged)
        {
            resFields.push("RES_IMAGES=?");
            resValues.push(newImagesJson);
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

        if (resFields.length > 0)
        {
            resFields.push("RES_LAST_UPDATE=?");
            resValues.push($Utils.now());
            resValues.push(userId);
            $Db.executeQuery(
                `UPDATE \`resident\` SET ${resFields.join(", ")} WHERE RES_USR_ID=? AND RES_DELETED_ON IS NULL`,
                resValues);
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
    // Officer-Facing — Search Residents (SDS 3.10)
    // =========================================================================

    search_residents()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        let userId = this.$Session.userId;

        // Get officer's community
        let officerRows = $Db.executeQuery(
            `SELECT USD_COM_ID FROM \`user_details\`
             WHERE USD_USR_ID=? AND USD_DELETED_ON IS NULL`,
            [userId]);
        if (officerRows.length === 0 || !officerRows[0].USD_COM_ID)
        {
            vals.residents = [];
            return {...rc, ...vals};
        }

        let communityId = officerRows[0].USD_COM_ID;
        let term = "%" + this.$search_text + "%";

        let rows = $Db.executeQuery(
            `SELECT USR_ID, USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM,
                    RES_ADDRESS, RES_VEHICLES
             FROM \`user\`
                JOIN \`user_details\` ON USR_ID = USD_USR_ID
                JOIN \`resident\` ON USR_ID = RES_USR_ID
             WHERE USR_TYPE=? AND USR_STATUS=1 AND USD_COM_ID=?
               AND USD_DELETED_ON IS NULL AND RES_DELETED_ON IS NULL
               AND (USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ? OR RES_ADDRESS LIKE ? OR RES_VEHICLES LIKE ?)
             ORDER BY USD_FIRST_NAME ASC`,
            [$Const.USER_TYPE_RESIDENT, communityId, term, term, term, term]);

        vals.residents = rows.map(row => ({
            user_id: row.USR_ID,
            first_name: row.USD_FIRST_NAME,
            last_name: row.USD_LAST_NAME,
            phone_num: row.USD_PHONE_NUM,
            address: row.RES_ADDRESS,
            vehicles: row.RES_VEHICLES ? (typeof row.RES_VEHICLES === "string" ? JSON.parse(row.RES_VEHICLES) : row.RES_VEHICLES) : [],
        }));

        return {...rc, ...vals};
    }
};
