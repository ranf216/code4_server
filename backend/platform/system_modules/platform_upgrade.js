module.exports =
{
	performUpgrade(toVersion = 0 /* All */)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const kvls = $Db.executeQuery(`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`, [$Const.KVL_API_VERSION]);
		const apiVer = Number(kvls.length == 0 ? 1 : kvls[0].KVL_VALUE);

        if (toVersion == 0)
        {
            toVersion = $Config.get("api_version");
        }

        for (let i = apiVer + 1; i <= toVersion; i++)
        {
            if (!$SystemUpgrade[`upgradeV${i}`]())
            {
				return {"rc" : 3, "message" : `Upgrade to V${i} failed`};
            }

    		$Db.executeQuery(`INSERT INTO \`key_value\` (KVL_KEY, KVL_VALUE) VALUES (?, ?)
							    ON DUPLICATE KEY UPDATE KVL_VALUE=VALUES(KVL_VALUE)`, [$Const.KVL_API_VERSION, "" + i]);

            vals[`upgrade_v${i}`] = "success";
        }

		return {...rc, ...vals};
	},

	performInfraUpgrade(toVersion = "all")
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const kvls = $Db.executeQuery(`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`, [$Const.KVL_INFRA_VERSION]);
		const apiVer = (kvls.length == 0 ? "1.0.0" : kvls[0].KVL_VALUE);

        if (toVersion == "all" || $Utils.empty(toVersion))
        {
            toVersion = $Config.get("infra_version");
        }

        const funcs = this.getListOfUpgrades(apiVer, toVersion);

        funcs.every(func =>
        {
            const newVer = func.split("_").slice(1).join(".");
            if (!this[func]())
            {
				rc = {"rc" : 3, "message" : `Upgrade to V${newVer} failed`};
                return false;
            }

    		$Db.executeQuery(`INSERT INTO \`key_value\` (KVL_KEY, KVL_VALUE) VALUES (?, ?)
							    ON DUPLICATE KEY UPDATE KVL_VALUE=VALUES(KVL_VALUE)`, [$Const.KVL_INFRA_VERSION, newVer]);

            vals[`upgrade_v${newVer}`] = "success";

            return true;
        });

		return {...rc, ...vals};
	},

    getListOfUpgrades(fromVersion, toVersion)
    {
        const methods = Object.getOwnPropertyNames(this);
        const upgradePattern = /^upgrade_(\d+)_(\d+)_(\d+)$/;

        const parseVersion = (versionStr) =>
        {
            const parts = versionStr.split(".");
            return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
        };

        const compareVersions = (a, b) =>
        {
            for (let i = 0; i < 3; i++)
            {
                if (a[i] !== b[i])
                {
                    return a[i] - b[i];
                }
            }
            return 0;
        };

        const fromParts = fromVersion ? parseVersion(fromVersion) : null;
        const toParts = toVersion ? parseVersion(toVersion) : null;

        const result = [];

        for (const method of methods)
        {
            const match = upgradePattern.exec(method);
            if (!match)
            {
                continue;
            }

            const methodParts = [Number(match[1]), Number(match[2]), Number(match[3])];

            if (fromParts && compareVersions(methodParts, fromParts) <= 0)
            {
                continue;
            }

            if (toParts && compareVersions(methodParts, toParts) > 0)
            {
                continue;
            }

            result.push({ name: method, parts: methodParts });
        }

        result.sort((a, b) => compareVersions(a.parts, b.parts));

        return result.map(item => item.name);
    },

/*---------------------------------------------------------------------------------------------*/

    upgrade_3_9_1()
    {
        const usds = $Db.executeQuery(`SELECT USD_USR_ID, USD_PHONE_NUM, USD_PHONE_COUNTRY_CODE FROM \`user_details\` WHERE USD_PHONE_NUM IS NOT NULL AND USD_PHONE_NUM != ''`, []);

        for (const usr of usds)
        {
            const phoneNum = $CountryUtils.makeIntlPhoneNumber(usr.USD_PHONE_NUM, usr.USD_PHONE_COUNTRY_CODE);
            $Db.executeQuery(`UPDATE \`user_details\` SET USD_PHONE_NUM=? WHERE USD_USR_ID=?`, [phoneNum, usr.USD_USR_ID]);
            if ($Db.isError())
            {
                return false;
            }
        }

        $Db.executeQuery(`ALTER TABLE \`user\` DROP COLUMN \`USR_PHONE_COUNTRY_CODE\`,
                            DROP INDEX \`IX_USR_PHONE\`,
                            ADD INDEX \`IX_USR_PHONE\` USING BTREE(\`USR_PHONE_NUM\`);`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        $Db.executeQuery(`ALTER TABLE \`user_details\` DROP COLUMN \`USD_PHONE_COUNTRY_CODE\`;`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        $Db.executeQuery(`ALTER TABLE \`user_details\` ADD INDEX IX_USD_EMAIL(\`USD_EMAIL\`),
                                ADD INDEX IX_USD_PHONE_NUM(\`USD_PHONE_NUM\`);`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        $Db.executeQuery(`ALTER TABLE \`otp_auth\` CHANGE COLUMN \`OTP_FIELD1\` \`OTP_FIELD\` VARCHAR(200) NOT NULL,
                                DROP COLUMN \`OTP_FIELD2\`,
                                DROP PRIMARY KEY,
                                ADD PRIMARY KEY  USING BTREE(\`OTP_FIELD\`);`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        //-----------------------------------------------------------------------------------------
        // Triggers

        $Db.executeQuery(`DROP TRIGGER IF EXISTS update_user_from_details;`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        $Db.executeQuery(
`CREATE TRIGGER update_user_from_details
BEFORE UPDATE ON user_details
FOR EACH ROW
BEGIN

    SET @skip_user_update = 1;

    IF NEW.USD_TYPE               <> OLD.USD_TYPE               THEN UPDATE \`user\` SET USR_TYPE               = NEW.USD_TYPE               WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_EMAIL              <> OLD.USD_EMAIL              THEN UPDATE \`user\` SET USR_EMAIL              = NEW.USD_EMAIL              WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_PHONE_NUM          <> OLD.USD_PHONE_NUM          THEN UPDATE \`user\` SET USR_PHONE_NUM          = NEW.USD_PHONE_NUM          WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_STATUS             <> OLD.USD_STATUS             THEN UPDATE \`user\` SET USR_STATUS             = NEW.USD_STATUS             WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_ROLE_ALLOW         <> OLD.USD_ROLE_ALLOW         THEN UPDATE \`user\` SET USR_ROLE_ALLOW         = NEW.USD_ROLE_ALLOW         WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_ROLE_DENY          <> OLD.USD_ROLE_DENY          THEN UPDATE \`user\` SET USR_ROLE_DENY          = NEW.USD_ROLE_DENY          WHERE USR_ID = NEW.USD_USR_ID; END IF;

    IF (NEW.USD_DELETED_ON <> OLD.USD_DELETED_ON OR (NEW.USD_DELETED_ON is null AND OLD.USD_DELETED_ON is not null) OR (NEW.USD_DELETED_ON is not null AND  OLD.USD_DELETED_ON is null)) THEN
      UPDATE \`user\` SET USR_DELETED_ON = NEW.USD_DELETED_ON WHERE USR_ID = NEW.USD_USR_ID;
    END IF;

    SET @skip_user_update = NULL;

END`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        $Db.executeQuery(`DROP TRIGGER IF EXISTS deny_update_user_details_from_user;`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        $Db.executeQuery(
`CREATE TRIGGER deny_update_user_details_from_user
BEFORE UPDATE ON user
FOR EACH ROW
BEGIN

    IF @skip_user_update IS NULL THEN
        IF NEW.USR_TYPE               <> OLD.USR_TYPE               THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_TYPE. Must update from user_details'; END IF;
        IF NEW.USR_EMAIL              <> OLD.USR_EMAIL              THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_EMAIL. Must update from user_details'; END IF;
        IF NEW.USR_PHONE_NUM          <> OLD.USR_PHONE_NUM          THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_PHONE_NUM. Must update from user_details'; END IF;
        IF NEW.USR_STATUS             <> OLD.USR_STATUS             THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_STATUS. Must update from user_details'; END IF;
        IF NEW.USR_ROLE_ALLOW         <> OLD.USR_ROLE_ALLOW         THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_ROLE_ALLOW. Must update from user_details'; END IF;
        IF NEW.USR_ROLE_DENY          <> OLD.USR_ROLE_DENY          THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_ROLE_DENY. Must update from user_details'; END IF;

        IF (NEW.USR_DELETED_ON <> OLD.USR_DELETED_ON OR (NEW.USR_DELETED_ON is null AND OLD.USR_DELETED_ON is not null) OR (NEW.USR_DELETED_ON is not null AND  OLD.USR_DELETED_ON is null)) THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_DELETED_ON. Must update from user_details';
        END IF;
    END IF;

END`, [], false, true);
        if ($Db.isError())
        {
            return false;
        }

        return true;
    },

    upgrade_3_10_1()
    {
        if (!encryptTokensInTable('user', 'USR_ID', 'USR_TOKEN'))
        {
            return false;
        }

        if (!encryptTokensInTable('login_log', 'LOL_ID', 'LOL_USR_TOKEN'))
        {
            return false;
        }

        if (!encryptTokensInTable('system_user', 'STU_USER_NAME', 'STU_TOKEN'))
        {
            return false;
        }

        return true;
    },
}

function encryptTokensInTable(tableName, idColumn, tokenColumn)
{
    const batchSize = 1000;
    let processedCount = 0;

    while (true)
    {
        const batch = $Db.executeQuery(
            `SELECT ${idColumn}, ${tokenColumn} FROM \`${tableName}\` WHERE ${tokenColumn} != '' AND CHAR_LENGTH(${tokenColumn}) = 64 LIMIT ?`,
            [`${batchSize}`]
        );
        if ($Db.isError())
        {
            return false;
        }

        if (batch.length === 0)
        {
            break;
        }

        const encryptedTokens = [];
        const ids = [];

        for (const row of batch)
        {
            try
            {
                const encryptedToken = $Cipher.encryptData(row[tokenColumn], "static");
                encryptedTokens.push(encryptedToken);
                ids.push(row[idColumn]);
            }
            catch (err)
            {
                $Logger.error(`Failed to encrypt token for ${tableName} ${row[idColumn]}: ${err.message}`);
                return false;
            }
        }

        const caseClauses = ids.map((id, index) => `WHEN ? THEN ?`).join(' ');
        const params = [];
        for (let i = 0; i < ids.length; i++)
        {
            params.push(ids[i], encryptedTokens[i]);
        }
        params.push(...ids);

        $Db.beginTransaction();

        $Db.executeQuery(
            `UPDATE \`${tableName}\` SET ${tokenColumn} = CASE ${idColumn} ${caseClauses} END WHERE ${idColumn} IN (${ids.toPlaceholders()})`,
            params
        );
        if ($Db.isError())
        {
            $Db.rollbackTransaction();
            return false;
        }

        $Db.commitTransaction();

        processedCount += batch.length;
    }

    return true;
}
