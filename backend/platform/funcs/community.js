function fetchCommunityRecord(communityId)
{
    let rows = $Db.executeQuery(
        `SELECT COM_ID, COM_NAME, COM_MAP_IMAGE
         FROM \`community\`
         WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
        [communityId]);
    return rows.length > 0 ? rows[0] : null;
}

function mapCommunityRow(c, filesSql)
{
    return {
        community_id: c.COM_ID,
        name: c.COM_NAME,
        area: c.COM_AREA,
        latitude: c.COM_LATITUDE,
        longitude: c.COM_LONGITUDE,
        location_name: c.COM_LOCATION_NAME,
        timezone: c.COM_TIMEZONE,
        map_image_url: $Files.getUrl(filesSql.get(c)),
        map_boundaries: c.COM_MAP_BOUNDARIES,
        is_active: c.COM_IS_ACTIVE === 1,
        created_on: c.COM_CREATED_ON,
        last_update: c.COM_LAST_UPDATE,
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
    // Communities
    // =========================================================================

    get_communities()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let filesSql = new $Files.SQL("COM_MAP_IMAGE");

        let conditions = ["COM_DELETED_ON IS NULL"];
        let params = [];

        if (!this.$include_inactive)
        {
            conditions.push("COM_IS_ACTIVE = 1");
        }

        if (!$Utils.empty(this.$search_text))
        {
            let term = "%" + this.$search_text + "%";
            conditions.push(
                `(COM_NAME LIKE ? OR EXISTS (
                    SELECT 1 FROM \`user_details\`
                    WHERE USD_COM_ID = COM_ID
                      AND USD_DELETED_ON IS NULL
                      AND (USD_FIRST_NAME LIKE ? OR USD_LAST_NAME LIKE ?)
                ))`);
            params.push(term, term, term);
        }

        let communities = $Db.executeQuery(
            `SELECT COM_ID, COM_NAME, COM_AREA, COM_LATITUDE, COM_LONGITUDE,
                    COM_LOCATION_NAME, COM_TIMEZONE, ${filesSql.select()},
                    COM_MAP_BOUNDARIES, COM_IS_ACTIVE, COM_CREATED_ON, COM_LAST_UPDATE,
                    (SELECT COUNT(*) FROM \`user_details\` WHERE USD_COM_ID = COM_ID AND USD_TYPE = ? AND USD_DELETED_ON IS NULL) as COM_OFFICER_COUNT,
                    (SELECT COUNT(*) FROM \`user_details\` WHERE USD_COM_ID = COM_ID AND USD_TYPE = ? AND USD_DELETED_ON IS NULL) as COM_RESIDENT_COUNT
             FROM \`community\`
                ${filesSql.join()}
             WHERE ${conditions.join(" AND ")}
             ORDER BY COM_NAME`, [$Const.USER_TYPE_OFFICER, $Const.USER_TYPE_RESIDENT, ...params]);

        vals.communities = communities.map(c => ({
            ...mapCommunityRow(c, filesSql),
            officer_count: c.COM_OFFICER_COUNT,
            resident_count: c.COM_RESIDENT_COUNT,
        }));

        return {...rc, ...vals};
    }

    get_community()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let filesSql = new $Files.SQL("COM_MAP_IMAGE");

        let rows = $Db.executeQuery(
            `SELECT COM_ID, COM_NAME, COM_AREA, COM_LATITUDE, COM_LONGITUDE,
                    COM_LOCATION_NAME, COM_TIMEZONE, ${filesSql.select()},
                    COM_MAP_BOUNDARIES, COM_IS_ACTIVE, COM_CREATED_ON, COM_LAST_UPDATE
             FROM \`community\`
                ${filesSql.join()}
             WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
            [this.$community_id]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }

        vals.community = mapCommunityRow(rows[0], filesSql);

        return {...rc, ...vals};
    }

    add_community()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let existing = $Db.executeQuery(
            `SELECT COM_ID FROM \`community\` WHERE COM_NAME=? AND COM_DELETED_ON IS NULL`,
            [this.$name]);
        if (existing.length > 0)
        {
            return $ERRS.ERR_COMMUNITY_NAME_ALREADY_EXISTS;
        }

        let mapImageName = "";
        if (!$Utils.empty(this.$map_image))
        {
            let rv = $Utils.saveNewImageOrKeepOld(this.$Session.userId, this.$map_image, null, "community");
            if ($Err.isERR(rv)) return rv;
            mapImageName = rv.image_name;
        }

        let isActive = this.$is_active === false ? 0 : 1;

        $Db.executeQuery(
            `INSERT INTO \`community\`
             (COM_NAME, COM_AREA, COM_LATITUDE, COM_LONGITUDE, COM_LOCATION_NAME,
              COM_TIMEZONE, COM_MAP_IMAGE, COM_MAP_BOUNDARIES, COM_IS_ACTIVE, COM_CREATED_ON)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [this.$name, this.$area, this.$latitude || null, this.$longitude || null,
             this.$location_name || null, this.$timezone || null, mapImageName,
             this.$map_boundaries || null, isActive, $Utils.now()]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        let communityId = $Db.insertId();

        if (this.$officers && this.$officers.length > 0)
        {
            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_COM_ID=?
                 WHERE USD_USR_ID IN (${this.$officers.toPlaceholders()})
                   AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
                [communityId, ...this.$officers, $Const.USER_TYPE_OFFICER]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        if (this.$residents && this.$residents.length > 0)
        {
            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_COM_ID=?
                 WHERE USD_USR_ID IN (${this.$residents.toPlaceholders()})
                   AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
                [communityId, ...this.$residents, $Const.USER_TYPE_RESIDENT]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        vals.community_id = communityId;
        return {...rc, ...vals};
    }

    update_community()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let community = fetchCommunityRecord(this.$community_id);
        if (!community)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }

        if (!$Utils.empty(this.$name) && this.$name !== community.COM_NAME)
        {
            let existing = $Db.executeQuery(
                `SELECT COM_ID FROM \`community\` WHERE COM_NAME=? AND COM_DELETED_ON IS NULL AND COM_ID!=?`,
                [this.$name, this.$community_id]);
            if (existing.length > 0)
            {
                return $ERRS.ERR_COMMUNITY_NAME_ALREADY_EXISTS;
            }
        }

        let updateFields = [];
        let updateValues = [];

        if (!$Utils.empty(this.$name))
        {
            updateFields.push("COM_NAME=?");
            updateValues.push(this.$name);
        }
        if ($Utils.isset(this.$area) && this.$area !== "")
        {
            updateFields.push("COM_AREA=?");
            updateValues.push(this.$area);
        }
        if ($Utils.isset(this.$latitude) && this.$latitude !== 0)
        {
            updateFields.push("COM_LATITUDE=?");
            updateValues.push(this.$latitude);
        }
        if ($Utils.isset(this.$longitude) && this.$longitude !== 0)
        {
            updateFields.push("COM_LONGITUDE=?");
            updateValues.push(this.$longitude);
        }
        if ($Utils.isset(this.$location_name) && this.$location_name !== "")
        {
            updateFields.push("COM_LOCATION_NAME=?");
            updateValues.push(this.$location_name);
        }
        if ($Utils.isset(this.$timezone) && this.$timezone !== "")
        {
            updateFields.push("COM_TIMEZONE=?");
            updateValues.push(this.$timezone);
        }
        if ($Utils.isset(this.$map_image))
        {
            let newImageName = community.COM_MAP_IMAGE;
            if (this.$map_image === "")
            {
                newImageName = "";
            }
            else
            {
                let rv = $Utils.saveNewImageOrKeepOld(this.$Session.userId, this.$map_image, null, "community");
                if ($Err.isERR(rv)) return rv;
                newImageName = rv.image_name;
            }
            updateFields.push("COM_MAP_IMAGE=?");
            updateValues.push(newImageName);
        }
        if ($Utils.isset(this.$map_boundaries) && this.$map_boundaries !== "")
        {
            updateFields.push("COM_MAP_BOUNDARIES=?");
            updateValues.push(this.$map_boundaries);
        }
        if ($Utils.isset(this.$is_active))
        {
            updateFields.push("COM_IS_ACTIVE=?");
            updateValues.push(this.$is_active ? 1 : 0);
        }

        if (updateFields.length > 0)
        {
            updateFields.push("COM_LAST_UPDATE=?");
            updateValues.push($Utils.now());
            updateValues.push(this.$community_id);

            $Db.executeQuery(
                `UPDATE \`community\` SET ${updateFields.join(", ")} WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
                updateValues);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        if (this.$officers.length > 0)
        {
            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_COM_ID=NULL
                 WHERE USD_COM_ID=? AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
                [this.$community_id, $Const.USER_TYPE_OFFICER]);

            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_COM_ID=?
                 WHERE USD_USR_ID IN (${this.$officers.toPlaceholders()})
                   AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
                [this.$community_id, ...this.$officers, $Const.USER_TYPE_OFFICER]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        if (this.$residents.length > 0)
        {
            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_COM_ID=NULL
                 WHERE USD_COM_ID=? AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
                [this.$community_id, $Const.USER_TYPE_RESIDENT]);

            $Db.executeQuery(
                `UPDATE \`user_details\` SET USD_COM_ID=?
                 WHERE USD_USR_ID IN (${this.$residents.toPlaceholders()})
                   AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
                [this.$community_id, ...this.$residents, $Const.USER_TYPE_RESIDENT]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        return rc;
    }

    delete_community()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let community = fetchCommunityRecord(this.$community_id);
        if (!community)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }

        let officerCount = $Db.executeQuery(
            `SELECT COUNT(*) cnt FROM \`user_details\`
             WHERE USD_COM_ID=? AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
            [this.$community_id, $Const.USER_TYPE_OFFICER]);
        if (officerCount[0].cnt > 0)
        {
            return $ERRS.ERR_COMMUNITY_HAS_ACTIVE_OFFICERS;
        }

        let residentCount = $Db.executeQuery(
            `SELECT COUNT(*) cnt FROM \`user_details\`
             WHERE USD_COM_ID=? AND USD_TYPE=? AND USD_DELETED_ON IS NULL`,
            [this.$community_id, $Const.USER_TYPE_RESIDENT]);
        if (residentCount[0].cnt > 0)
        {
            return $ERRS.ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS;
        }

        if ($CallUtils.communityHasOpenCalls(this.$community_id))
        {
            return $ERRS.ERR_COMMUNITY_HAS_ACTIVE_CALLS;
        }

        let now = $Utils.now();
        $Db.executeQuery(
            `UPDATE \`community\` SET COM_DELETED_ON=?, COM_LAST_UPDATE=? WHERE COM_ID=? AND COM_DELETED_ON IS NULL`,
            [now, now, this.$community_id]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }

    // =========================================================================
    // Featured Officer
    // =========================================================================

    get_featured_officer()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let community = fetchCommunityRecord(this.$community_id);
        if (!community)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }

        let filesSql = new $Files.SQL("FTO_IMAGE");

        let rows = $Db.executeQuery(
            `SELECT FTO_ID, FTO_COM_ID, ${filesSql.select()}, FTO_DESCRIPTION,
                    FTO_CREATED_ON, FTO_LAST_UPDATE
             FROM \`featured_officer\`
                ${filesSql.join()}
             WHERE FTO_COM_ID=? AND FTO_DELETED_ON IS NULL`,
            [this.$community_id]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_FEATURED_OFFICER_NOT_FOUND;
        }

        let o = rows[0];
        vals.featured_officer = {
            featured_officer_id: o.FTO_ID,
            community_id: o.FTO_COM_ID,
            image_url: $Files.getUrl(filesSql.get(o)),
            description: o.FTO_DESCRIPTION,
            created_on: o.FTO_CREATED_ON,
            last_update: o.FTO_LAST_UPDATE,
        };

        return {...rc, ...vals};
    }

    set_featured_officer()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let community = fetchCommunityRecord(this.$community_id);
        if (!community)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }

        let existing = $Db.executeQuery(
            `SELECT FTO_ID, FTO_IMAGE, FTO_DELETED_ON FROM \`featured_officer\` WHERE FTO_COM_ID=?`,
            [this.$community_id]);

        let activeRecord = existing.length > 0 && existing[0].FTO_DELETED_ON === null ? existing[0] : null;
        let softDeletedRecord = existing.length > 0 && existing[0].FTO_DELETED_ON !== null ? existing[0] : null;

        let oldImage = activeRecord ? activeRecord.FTO_IMAGE : null;
        let rv = $Utils.saveNewImageOrKeepOld(this.$Session.userId, this.$image, oldImage, "featured_officer");
        if ($Err.isERR(rv)) return rv;
        let imageName = rv.image_name;

        if (activeRecord)
        {
            $Db.executeQuery(
                `UPDATE \`featured_officer\` SET FTO_IMAGE=?, FTO_DESCRIPTION=?, FTO_LAST_UPDATE=? WHERE FTO_ID=?`,
                [imageName, this.$description, $Utils.now(), activeRecord.FTO_ID]);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }

            vals.featured_officer_id = activeRecord.FTO_ID;
        }
        else if (softDeletedRecord)
        {
            $Db.executeQuery(
                `UPDATE \`featured_officer\` SET FTO_IMAGE=?, FTO_DESCRIPTION=?, FTO_LAST_UPDATE=?, FTO_DELETED_ON=NULL WHERE FTO_ID=?`,
                [imageName, this.$description, $Utils.now(), softDeletedRecord.FTO_ID]);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }

            vals.featured_officer_id = softDeletedRecord.FTO_ID;
        }
        else
        {
            $Db.executeQuery(
                `INSERT INTO \`featured_officer\`
                 (FTO_COM_ID, FTO_IMAGE, FTO_DESCRIPTION, FTO_CREATED_ON)
                 VALUES (?,?,?,?)`,
                [this.$community_id, imageName, this.$description, $Utils.now()]);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
            }

            vals.featured_officer_id = $Db.insertId();
        }

        return {...rc, ...vals};
    }

    delete_featured_officer()
    {
        let rc = $ERRS.ERR_SUCCESS;

        let community = fetchCommunityRecord(this.$community_id);
        if (!community)
        {
            return $ERRS.ERR_COMMUNITY_NOT_FOUND;
        }

        let existing = $Db.executeQuery(
            `SELECT FTO_ID FROM \`featured_officer\` WHERE FTO_COM_ID=? AND FTO_DELETED_ON IS NULL`,
            [this.$community_id]);
        if (existing.length === 0)
        {
            return $ERRS.ERR_FEATURED_OFFICER_NOT_FOUND;
        }

        let now = $Utils.now();
        $Db.executeQuery(
            `UPDATE \`featured_officer\` SET FTO_DELETED_ON=?, FTO_LAST_UPDATE=? WHERE FTO_ID=? AND FTO_DELETED_ON IS NULL`,
            [now, now, existing[0].FTO_ID]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return rc;
    }
};
