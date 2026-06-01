module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

	login()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const usrs = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_EMAIL=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
								[this.$email, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_EMAIL]);
		if (usrs.length == 0)
		{
			return $ERRS.ERR_USER_NOT_FOUND;
		}
		const usr = usrs[0];


		const lastFailed = new $Date(usr.USR_LAST_FAILED_LOGIN);
		const lfts = lastFailed.getTimestamp();

		const today = new $Date();
		const ts = today.getTimestamp();
		
		if (ts - lfts < $Config.get("failed_login_cooldown_time"))
		{
			if (usr.USR_FAILED_LOGIN_COUNT >= $Config.get("max_failed_login_retries"))
			{
				return $ERRS.ERR_ACCOUNT_IS_TEMPORARILY_LOCKED;
			}
		}
		else
		{
			$Db.executeQuery(`UPDATE \`user\` SET USR_FAILED_LOGIN_COUNT=0 WHERE USR_ID=?`, [usr.USR_ID]);
			usr.USR_FAILED_LOGIN_COUNT = 0;
		}

		
		if (!$Utils.isCorrectPwd(usr.USR_ID, this.$password, usr.USR_PASSWORD))
		{
			$Db.executeQuery(`UPDATE \`user\` SET USR_FAILED_LOGIN_COUNT=?, USR_LAST_FAILED_LOGIN=? WHERE USR_ID=?`,
								[usr.USR_FAILED_LOGIN_COUNT + 1, $Utils.now(), usr.USR_ID]);
			return $ERRS.ERR_USER_NOT_FOUND;
		}

		if ($Config.get("use_2factor_auth"))
		{
			const secondFactorKey = $Utils.uniqueHash();
			const validSecs = $Config.get("otp_verification", "auth_key_valid_for_seconds");
			const validTrhu = new $Date().addSeconds(validSecs).format();

			$Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_KEY=?, USR_2ND_FACTOR_KEY_VALID_THRU=? WHERE USR_ID=?`, [secondFactorKey, validTrhu, usr.USR_ID]);

			vals.second_factor_key = secondFactorKey;
			vals.phone_num = $Utils.getObscuredPhone(usr.USR_PHONE_NUM);
			vals.email = $Utils.getObscuredEmail(usr.USR_EMAIL);

			this._updateDeviceInfo(usr.USR_ID, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version);
		}
		else
		{
			rc = this._performLogin(usr, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);
		}

		return {...rc, ...vals};
	}

	login_with_auth_grant()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let grant = null;

		if (!$Config.get("auth_grant", "is_enabled"))
		{
			return $ERRS.ERR_AUTH_GRANT_IS_NOT_ENABLED;
		}

		const authGrant = $Cipher.decryptData(this.$auth_grant, this.$grant_id);
		if ($Utils.empty(authGrant))
		{
			return $ERRS.ERR_INVALID_AUTH_GRANT;
		}

		try
		{
			grant = JSON.parse(authGrant);
			if ($Utils.empty(grant))
			{
				return $ERRS.ERR_INVALID_AUTH_GRANT;
			}
		}
		catch (err)
		{
			return $ERRS.ERR_INVALID_AUTH_GRANT;
		}

		if (grant.grant_id != this.$grant_id)
		{
			return $ERRS.ERR_INVALID_AUTH_GRANT;
		}

		if (new $Date(grant.issue_time).diff(new $Date()) > $Config.get("auth_grant", "valid_for_seconds"))
		{
			return $ERRS.ERR_AUTH_GRANT_IS_EXPIRED;
		}


		const usrs = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_ID=? AND USR_STATUS=? AND USR_DELETED_ON is null`,
								[grant.user_id, $Const.USER_STATUS_ACTIVE]);
		if (usrs.length == 0)
		{
			return $ERRS.ERR_USER_NOT_FOUND;
		}
		const usr = usrs[0];


		if ($Config.get("use_2factor_auth"))
		{
			const secondFactorKey = $Utils.uniqueHash();
			const validSecs = $Config.get("otp_verification", "auth_key_valid_for_seconds");
			const validTrhu = new $Date().addSeconds(validSecs).format();

			$Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_KEY=?, USR_2ND_FACTOR_KEY_VALID_THRU=? WHERE USR_ID=?`, [secondFactorKey, validTrhu, usr.USR_ID]);

			vals.second_factor_key = secondFactorKey;
			vals.phone_num = $Utils.getObscuredPhone(usr.USR_PHONE_NUM);
			vals.email = $Utils.getObscuredEmail(usr.USR_EMAIL);
		}
		else
		{
			rc = this._performLogin(usr, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);
		}

		return {...rc, ...vals};
	}

	get_login_auth_grant()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (!$Config.get("auth_grant", "is_enabled"))
		{
			return $ERRS.ERR_AUTH_GRANT_IS_NOT_ENABLED;
		}

		const grantId = $Utils.uniqueHash();

		const grant = {
			user_id: this.$Session.userId,
			grant_id: grantId,
			issue_time: $Utils.now(),
		};

		const authGrant = $Cipher.encryptData(JSON.stringify(grant), grantId);

		vals.grant_id = grantId;
		vals.auth_grant = authGrant;

		return {...rc, ...vals};
	}

	register()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		if (this.$first_name == "")
		{
			return $ERRS.ERR_REQ_FIRST_NAME;
		}
		if (this.$last_name == "")
		{
			return $ERRS.ERR_REQ_LAST_NAME;
		}
		if (!$Utils.validateEmail(this.$email))
		{
			return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
		}
		if (!$Utils.isValidPassword(this.$password))
		{
			return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
		}
		
		const usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_EMAIL=? AND USR_DELETED_ON is null`, [this.$email]);
		if (usrs.length > 0)
		{
			return $ERRS.ERR_USER_ALREADY_EXISTS;
		}

		const token = ($Config.get("use_2factor_auth") ? "" : $Utils.uniqueHash());
		const userId = $Utils.uniqueHash();
		const encToken = ($Config.get("use_2factor_auth") ? "" : $Cipher.encryptData(token, "static"));

		$Db.beginTransaction();

		$Db.executeQuery(`INSERT INTO \`user\` (USR_ID, USR_EMAIL, USR_PASSWORD, USR_TOKEN, USR_CREATED_ON, USR_TYPE, USR_STATUS, USR_LOGIN_AUTHORITY,
												USR_LANG, USR_PASSWORD_CREATED_ON)
								VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[userId, this.$email, $Utils.hash(userId + this.$password), encToken, $Utils.now(), $Const.USER_TYPE_REGULAR, $Const.USER_STATUS_ACTIVE,
						$Const.USER_LOGIN_AUTHORITY_EMAIL, this.$language, $Utils.now()]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`INSERT INTO \`user_details\` (USD_USR_ID, USD_EMAIL, USD_TYPE, USD_STATUS, USD_FIRST_NAME, USD_LAST_NAME)
								VALUES (?, ?, ?, ?, ?, ?)`,
				[userId, this.$email, $Const.USER_TYPE_REGULAR, $Const.USER_STATUS_ACTIVE, this.$first_name, this.$last_name]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}
		
		this._updateDeviceInfo(userId, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version);

		$Db.commitTransaction();


		if ($Config.get("use_2factor_auth"))
		{
			const secondFactorKey = $Utils.uniqueHash();
			const validSecs = $Config.get("otp_verification", "auth_key_valid_for_seconds");
			const validTrhu = new $Date().addSeconds(validSecs).format();

			$Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_KEY=?, USR_2ND_FACTOR_KEY_VALID_THRU=? WHERE USR_ID=?`, [secondFactorKey, validTrhu, userId]);

			vals.second_factor_key = secondFactorKey;
			vals.email = $Utils.getObscuredEmail(this.$email);
		}
		else
		{
			this._logLogin(userId, encToken);
			vals.token = token;
		}
		
		return {...rc, ...vals};
	}

	send_sms_code()
	{
		let phoneNumber = $CountryUtils.makeIntlPhoneNumber(this.$phone_num, this.$country_code);
		if ($Utils.empty(phoneNumber))
		{
			return $ERRS.ERR_INVALID_PHONE_NUMBER;
		}

		return this._send_otp_code($Const.OTP_TYPE_PHONE, phoneNumber);
	}
	
	send_email_code()
	{
		return this._send_otp_code($Const.OTP_TYPE_EMAIL, this.$email);
	}
	
	_send_otp_code(otpType, field, isInternal = false)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let code;

		if (otpType == $Const.OTP_TYPE_PHONE)
		{
			if ($Config.get("otp_verification", "predef_phone_nums").includes(field))
			{
				code = $Config.get("otp_verification", "predef_otp_code");
				$Logger.logString($Const.LL_WARNING, `User entered with predefined number`);
			}
			else
			{
				let rv = $Sms.sendVerificationCode(field);
				if ($Err.isERR(rv))
				{
					return rv;
				}
		
				code = rv.code;
			}
		}
		else
		{
			field = field.toLowerCase();
			if (!$Utils.validateEmail(field))
			{
				return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
			}
			
			let rv = $Mailer.sendEmailVerificationCode(field);
			if ($Err.isERR(rv))
			{
				return rv;
			}
		
			code = rv.code;
		}
	
		let validSecs = $Config.get("otp_verification", "code_valid_for_seconds");
		let validThru = new $Date().addSeconds(validSecs).format();
		let authKey = $Utils.uniqueHash();
	
		$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
		$Db.executeQuery("INSERT INTO `otp_auth` (OTP_FIELD, OTP_VERIFICATION, OTP_VALID_THRU, OTP_AUTH_KEY) VALUES (?, ?, ?, ?)", [field, code, validThru, authKey]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		if (isInternal)
		{
			vals.auth_key = authKey;
		}
	
		return {...rc, ...vals};
	}

	resend_sms_code()
	{
		let phoneNumber = $CountryUtils.makeIntlPhoneNumber(this.$phone_num, this.$country_code);
		if ($Utils.empty(phoneNumber))
		{
			return $ERRS.ERR_INVALID_PHONE_NUMBER;
		}

		return this._resend_otp_code($Const.OTP_TYPE_PHONE, phoneNumber);
	}
	
	resend_email_code()
	{
		return this._resend_otp_code($Const.OTP_TYPE_EMAIL, this.$email);
	}
	
	_resend_otp_code(otpType, field)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (otpType == $Const.OTP_TYPE_EMAIL)
		{
			field = field.toLowerCase();
			if (!$Utils.validateEmail(field))
			{
				return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
			}
		}

		let otps = $Db.executeQuery(`SELECT * FROM \`otp_auth\` WHERE OTP_FIELD=?`, [field]);
		if (otps.length == 0)
		{
			return $ERRS[`ERR_INVALID_${otpType}_VERIFICATION_SEND_NEW_CODE`];
		}

		if (otps[0].OTP_VALID_THRU < $Utils.now())
		{
			$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
			return $ERRS[`ERR_INVALID_${otpType}_VERIFICATION_SEND_NEW_CODE`];
		}

		let code = otps[0].OTP_VERIFICATION;

		if (otpType == $Const.OTP_TYPE_PHONE)
		{
			if ($Config.get("otp_verification", "predef_phone_nums").includes(field))
			{
				$Logger.logString($Const.LL_WARNING, `User entered with predefined number`);
			}
			else
			{
				let rv = $Sms.resendVerificationCode(field, code);
				if ($Err.isERR(rv))
				{
					return rv;
				}
			}
		}
		else
		{
			let rv = $Mailer.resendEmailVerificationCode(field, code);
			if ($Err.isERR(rv))
			{
				return rv;
			}
		}

		return {...rc, ...vals};
	}

	verify_sms_code()
	{
		let phoneNumber = $CountryUtils.makeIntlPhoneNumber(this.$phone_num, this.$country_code);
		if ($Utils.empty(phoneNumber))
		{
			return $ERRS.ERR_INVALID_PHONE_NUMBER;
		}

		return this._verify_otp_code($Const.OTP_TYPE_PHONE, phoneNumber, this.$verification_code);
	}

	verify_email_code()
	{
		return this._verify_otp_code($Const.OTP_TYPE_EMAIL, this.$email, this.$verification_code);
	}

	_verify_otp_code(otpType, field, verificationCode)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let phoneNumber;
		
		if (otpType == $Const.OTP_TYPE_PHONE)
		{
			phoneNumber = $CountryUtils.getIntlPhoneNumber(field);
			if ($Utils.empty(phoneNumber))
			{
				return $ERRS.ERR_INVALID_PHONE_NUMBER;
			}
		
			field = phoneNumber.intlFormat;
		}		
		else
		{
			field = field.toLowerCase();
			if (!$Utils.validateEmail(field))
			{
				return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
			}
		}

		let otps = $Db.executeQuery("SELECT * FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
		if (otps.length == 0)
		{
			return $ERRS[`ERR_INVALID_${otpType}_VERIFICATION_SEND_NEW_CODE`];
		}
		
		if (otps[0].OTP_VALID_THRU < $Utils.now())
		{
			$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
			return $ERRS[`ERR_INVALID_${otpType}_VERIFICATION_SEND_NEW_CODE`];
		}
		
		if ($Config.get("otp_verification", "enable_backdoor_code") == true && verificationCode == $Config.get("otp_verification", "backdoor_code"))
		{
			$Logger.logString($Const.LL_WARNING, `User entered with backdoor code: ${field}`);
		}
		else if (otpType == $Const.OTP_TYPE_PHONE &&
				$Config.get("otp_verification", "predef_phone_nums").includes(phoneNumber.intlFormat) &&
				verificationCode ==  $Config.get("otp_verification", "predef_otp_code"))
		{
			$Logger.logString($Const.LL_WARNING, `User entered with predefined number: ${field}`);
		}
		else if (otpType == $Const.OTP_TYPE_EMAIL &&
				$Config.get("otp_verification", "predef_email_addresses").includes(field) &&
				verificationCode ==  $Config.get("otp_verification", "predef_otp_code"))
		{
			$Logger.logString($Const.LL_WARNING, `User entered with predefined email address: ${field}`);
		}
		else if (otpType == $Const.OTP_TYPE_PHONE &&
				$Config.get("virtual_phone_nums", "phones").includes(phoneNumber.intlFormat) &&
				verificationCode == $Config.get("virtual_phone_nums", "codes")[$Config.get("virtual_phone_nums", "phones").indexOf(phoneNumber.intlFormat)])
		{
			$Logger.logString($Const.LL_WARNING, `User entered with virtual phone number: ${field}`);
		}
		else if ($Config.get("otp_verification", "override_otp_code_verification") == false && otps[0].OTP_VERIFICATION != verificationCode)
		{
			if (otps[0].OTP_TRY_NUM >= $Config.get("otp_verification", "max_tries") - 1)
			{
				$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
				return $ERRS[`ERR_INVALID_${otpType}_VERIFICATION_SEND_NEW_CODE`];
			}
			else
			{
				$Db.executeQuery("UPDATE `otp_auth` SET OTP_TRY_NUM=OTP_TRY_NUM+1 WHERE OTP_FIELD=?", [field]);
				return $ERRS[`ERR_INVALID_${otpType}_VERIFICATION_TRY_AGAIN`];
			}
		}
		
		let validSecs = $Config.get("otp_verification", "auth_key_valid_for_seconds");
		let newValidThru = new $Date().addSeconds(validSecs).format();

		$Db.executeQuery("UPDATE `otp_auth` SET OTP_VALID_THRU=? WHERE OTP_FIELD=?", [newValidThru, field]);
		
		vals.auth_key = otps[0].OTP_AUTH_KEY;

		if ($Config.get("otp_verification", "return_is_registered"))
		{
			let usrs;

			if (otpType == $Const.OTP_TYPE_PHONE)
			{
				usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_PHONE_NUM=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
										[field, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_OTP]);
			}
			else
			{
				usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_EMAIL=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
										[field, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_OTP]);
			}

			vals.is_registered = (usrs.length == 0 ? false : true);
		}

		return {...rc, ...vals};
	}

	login_with_phone()
	{
		return this._login_with_otp($Const.OTP_TYPE_PHONE, this.$auth_key, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);
	}

	login_with_email()
	{
		return this._login_with_otp($Const.OTP_TYPE_EMAIL, this.$auth_key, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);
	}

	_login_with_otp(otpType, auth_key, device_id, os_type, os_version, device_model, app_version, language)
	{
		$Utils.setCurrUserLang(language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let otp = this._getOtpByAuthKey(otpType, auth_key);
		if ($Err.isERR(otp))
		{
			return otp;
		}

		$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [otp.OTP_FIELD]);

		let usrs;

		if (otpType == $Const.OTP_TYPE_PHONE)
		{
			usrs = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_PHONE_NUM=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?
									ORDER BY USR_LAST_LOGIN DESC, USR_CREATED_ON DESC`,
									[otp.OTP_FIELD, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_OTP]);
		}
		else
		{
			// For email OTP, search for both OTP and EMAIL login authority users
			// This allows users created with EMAIL authority to use 2FA via email code
			usrs = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_EMAIL=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY IN (?, ?)
									ORDER BY USR_LAST_LOGIN DESC, USR_CREATED_ON DESC`,
									[otp.OTP_FIELD, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_OTP, $Const.USER_LOGIN_AUTHORITY_EMAIL]);
		}

		if (usrs.length == 0)
		{
			return $ERRS[`ERR_USER_${otpType}_NOT_FOUND`];
		}
		
		rc = this._performLogin(usrs[0], device_id, os_type, os_version, device_model, app_version, language);

		return {...rc, ...vals};
	}

	register_with_phone()
	{
		return this._register_with_otp($Const.OTP_TYPE_PHONE, this.$auth_key, this.$first_name, this.$last_name, this.$email, "", "", this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);
	}

	register_with_email()
	{
		return this._register_with_otp($Const.OTP_TYPE_EMAIL, this.$auth_key, this.$first_name, this.$last_name, "", this.$phone_num, this.$country_code, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);
	}

	_register_with_otp(otpType, auth_key, first_name, last_name, email, phone_num, country_code, device_id, os_type, os_version, device_model, app_version, language)
	{
		$Utils.setCurrUserLang(language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		if (first_name == "")
		{
			return $ERRS.ERR_REQ_FIRST_NAME;
		}
		if (last_name == "")
		{
			return $ERRS.ERR_REQ_LAST_NAME;
		}

		let otp = this._getOtpByAuthKey(otpType, auth_key);
		if ($Err.isERR(otp))
		{
			return otp;
		}

		let field;
		let phoneNumber;

		if (otpType == $Const.OTP_TYPE_PHONE)
		{
			if (email == "")
			{
				return $ERRS.ERR_REQ_EMAIL;
			}
			if (!$Utils.validateEmail(email))
			{
				return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
			}
	
			phoneNumber = otp.OTP_FIELD;
			field = phoneNumber;
		}
		else
		{
			phoneNumber = $CountryUtils.makeIntlPhoneNumber(phone_num, country_code);
			if ($Utils.empty(phoneNumber))
			{
				return $ERRS.ERR_INVALID_PHONE_NUMBER;
			}
	
			email = otp.OTP_FIELD;
			field = email;
		}

		let usrs = $Db.executeQuery(`SELECT USR_EMAIL, USR_PHONE_NUM
									FROM \`user\`
									WHERE (USR_PHONE_NUM=? OR USR_EMAIL=?) AND USR_LOGIN_AUTHORITY=? AND USR_DELETED_ON is null`,
									[phoneNumber, email, $Const.USER_LOGIN_AUTHORITY_OTP]);
		if (usrs.length > 0)
		{
			let usr = usrs[0];

			if (otpType == $Const.OTP_TYPE_PHONE && email == usr.USR_EMAIL)
			{
				return $ERRS.ERR_USER_EMAIL_ALREADY_EXISTS;
			}
			else if (otpType == $Const.OTP_TYPE_EMAIL && phoneNumber == usr.USR_PHONE_NUM)
			{
				return $ERRS.ERR_USER_PHONE_ALREADY_EXISTS;
			}

			$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
			return $ERRS.ERR_USER_ALREADY_EXISTS;
		}

		const token = $Utils.uniqueHash();
		const userId = $Utils.uniqueHash();
		const encToken = $Cipher.encryptData(token, "static");

		$Db.beginTransaction();

		$Db.executeQuery(`INSERT INTO \`user\` (USR_ID, USR_EMAIL, USR_PASSWORD, USR_TOKEN, USR_CREATED_ON, USR_TYPE, USR_STATUS, USR_LOGIN_AUTHORITY, USR_PHONE_NUM, USR_LANG)
												VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[userId, email, '', encToken, $Utils.now(), $Const.USER_TYPE_REGULAR, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_OTP, phoneNumber, language]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`INSERT INTO \`user_details\` (USD_USR_ID, USD_EMAIL, USD_TYPE, USD_STATUS, USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM)
								VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[userId, email, $Const.USER_TYPE_REGULAR, $Const.USER_STATUS_ACTIVE, first_name, last_name, phoneNumber]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [field]);
		
		this._updateDeviceInfo(userId, device_id, os_type, os_version, device_model, app_version);
		this._logLogin(userId, encToken);

		$Db.commitTransaction();

		vals.token = token;
		
		return {...rc, ...vals};
	}

	logout()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		this.$Session.tokenValidator.deleteFromUserCache(this.$Session.userId);
		$Db.executeQuery(`UPDATE \`user\` SET USR_TOKEN='', USR_DEVICE_ID='' WHERE USR_ID=?`, [this.$Session.userId]);

		return {...rc, ...vals};
	}

	update_device_info()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		this._updateDeviceInfo(this.$Session.userId, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version);

		return {...rc, ...vals};
	}

	update_user_language()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		this.$Session.tokenValidator.deleteFromUserCache(this.$Session.userId);
		$Db.executeQuery(`UPDATE \`user\` SET USR_LANG=? WHERE USR_ID=?`, [this.$language, this.$Session.userId]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...rc, ...vals};
	}

	_performLogin(user, device_id, os_type, os_version, device_model, app_version, language = null)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if ($Utils.empty(language)) language = $Config.get("default_language");

		let userId = user.USR_ID;
		
		let reuseToken = $Config.get("reuse_token_on_login");
		let encToken = user.USR_TOKEN;
		let token = $Cipher.decryptData(encToken, "static");
		// checkign the validity of the token
		let isValidToken = this.$Session.tokenValidator.isValidToken(token);

		// if the token is not valid or we are not re-using token, 
		// we create a new token and update the user record
		if (!isValidToken || !reuseToken)
		{
			token = $Utils.uniqueHash();
			encToken = $Cipher.encryptData(token, "static");

			this.$Session.tokenValidator.deleteFromUserCache(userId);

			$Db.executeQuery(`UPDATE \`user\` SET USR_LAST_LOGIN=?, USR_LAST_ACCESS=?, USR_TOKEN=?, USR_LANG=?, USR_FAILED_LOGIN_COUNT=0 WHERE USR_ID=?`,
												[$Utils.now(), $Utils.now(), encToken, language, userId]);
			if ($Db.isError())
			{
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}
		}
		else
		{
			this.$Session.tokenValidator.deleteFromUserCache(userId);
			$Db.executeQuery(`UPDATE \`user\` SET USR_LAST_LOGIN=?, USR_LAST_ACCESS=?, USR_LANG=?, USR_FAILED_LOGIN_COUNT=0 WHERE USR_ID=?`,
												[$Utils.now(), $Utils.now(), language, userId]);
		}

		this._updateDeviceInfo(userId, device_id, os_type, os_version, device_model, app_version);
		this._logLogin(userId, encToken);

		vals.token = token;
		vals.type = user.USR_TYPE;
		vals.first_name = user.USD_FIRST_NAME;
		vals.last_name = user.USD_LAST_NAME;

		return {...rc, ...vals};
	}

	_getOtpByAuthKey(otpType, auth_key)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let otps = $Db.executeQuery("SELECT OTP_FIELD, OTP_VALID_THRU FROM `otp_auth`  WHERE  OTP_AUTH_KEY=?", [auth_key]);
		if (otps.length == 0)
		{
			return $ERRS[`ERR_INVALID_${otpType}_AUTHORIZATION`];
		}
		
		let otp = otps[0];
		if (otp.OTP_VALID_THRU < $Utils.now())
		{
			$Db.executeQuery("DELETE FROM `otp_auth` WHERE OTP_FIELD=?", [otp.OTP_FIELD]);
			return $ERRS[`ERR_INVALID_${otpType}_AUTHORIZATION`];
		}
		
		vals.OTP_FIELD = otp.OTP_FIELD;
		
		return {...rc, ...vals};
	}

	_updateDeviceInfo(user_id, device_id, os_type, os_version, device_model, app_version)
	{
		let sets =[];
		let params = [];

		if (!$Utils.empty(device_id))
		{
			sets.push("USR_DEVICE_ID = ?");
			params.push(device_id);
		}

		if (!$Utils.empty(os_type))
		{
			sets.push("USR_OS_TYPE = ?");
			params.push(os_type);
		}

		if (!$Utils.empty(os_version))
		{
			sets.push("USR_OS_VERSION = ?");
			params.push(os_version);
		}

		if (!$Utils.empty(device_model))
		{
			sets.push("USR_DEVICE_MODEL = ?");
			params.push(device_model);
		}
		
		if (!$Utils.empty(app_version))
		{
			sets.push("USR_APP_VERSION = ?");
			params.push(app_version);
		}

		if ($Utils.empty(sets))
		{
			return;
		}

		let set = sets.join(",");

		let query = `UPDATE \`user\` SET ${set} WHERE USR_ID = ?`;	
		params.push(user_id);
		
		$Db.executeQuery(query, params);
	}

	add_user()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		
		if (this.$type != $Const.USER_TYPE_ADMIN && this.$type != $Const.USER_TYPE_REGULAR)
		{
			return $ERRS.ERR_INVALID_USER_TYPE;
		}

		let usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_EMAIL=? AND USR_DELETED_ON is null`, [this.$email]);
		if (usrs.length > 0)
		{
			return $ERRS.ERR_USER_ALREADY_EXISTS;
		}

		
		let userId = $Utils.uniqueHash();

		$Db.beginTransaction();

		$Db.executeQuery(`INSERT INTO \`user\` (USR_ID, USR_EMAIL, USR_PASSWORD, USR_CREATED_ON, USR_TYPE, USR_STATUS, USR_LOGIN_AUTHORITY, USR_PASSWORD_CREATED_ON)
									VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
									[userId, this.$email, $Utils.hash(userId + this.$password), $Utils.now(), this.$type, $Const.USER_STATUS_ACTIVE,
									$Const.USER_LOGIN_AUTHORITY_EMAIL, $Utils.now()]);

		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`INSERT INTO \`user_details\` (USD_USR_ID, USD_EMAIL, USD_TYPE, USD_STATUS, USD_FIRST_NAME, USD_LAST_NAME)
								VALUES (?, ?, ?, ?, ?, ?)`,
									[userId, this.$email, this.$type, $Const.USER_STATUS_ACTIVE, this.$first_name, this.$last_name]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		vals.userid = userId;

		return {...rc, ...vals};
	}

	update_user()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		
		if (this.$type != $Const.USER_TYPE_ADMIN && this.$type != $Const.USER_TYPE_REGULAR)
		{
			return $ERRS.ERR_INVALID_USER_TYPE;
		}

		let usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_ID=? AND USR_DELETED_ON is null`, [this.$user_id]);
		if (usrs.length == 0)
		{
			return $ERRS.ERR_USER_NOT_EXISTS;
		}

		
		$Db.executeQuery(`UPDATE \`user_details\` SET USD_FIRST_NAME=?, USD_LAST_NAME=?, USD_EMAIL=?, USD_TYPE=?, USD_STATUS=? WHERE USD_USR_ID=?`,
							[this.$first_name, this.$last_name, this.$email, this.$type, this.$status, this.$user_id]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);

		return {...rc, ...vals};
	}

	delete_user()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		
		let usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_ID=? AND USR_DELETED_ON is null`, [this.$user_id]);
		if (usrs.length == 0)
		{
			return $ERRS.ERR_USER_NOT_EXISTS;
		}

		$Db.beginTransaction();

		$Db.executeQuery(`UPDATE \`user\` SET USR_TOKEN='', USR_DEVICE_ID=null WHERE USR_ID=?`, [this.$user_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`UPDATE \`user_details\` SET USD_DELETED_ON=?, USD_STATUS=0, USD_PHONE_NUM=concat(USD_PHONE_NUM, '/DELETED'), USD_EMAIL=concat(USD_EMAIL, '/DELETED') WHERE USD_USR_ID=?`,
												[$Utils.now(), this.$user_id]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);
		
		return {...rc, ...vals};
	}

	get_users()
	{
		let vals = {"users": []};
		let rc = $ERRS.ERR_SUCCESS;

		vals.users = $Db.executeQuery(`SELECT USR_ID user_id, USR_EMAIL email, USD_FIRST_NAME 'first_name', USD_LAST_NAME 'last_name', USR_CREATED_ON 'create',
												USR_LAST_LOGIN last_login, USR_LAST_ACCESS last_access, USR_TYPE 'type', USR_STATUS 'status'
										FROM \`user\`
											JOIN \`user_details\` ON USR_ID=USD_USR_ID
										WHERE USR_DELETED_ON is null
										ORDER BY USR_CREATED_ON`, []);

		return {...rc, ...vals};
	}

	forgot_password()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		$Utils.setCurrUserLang(this.$language);

		const usrs = $Db.executeQuery(`SELECT USR_ID, USD_FIRST_NAME, USD_LAST_NAME
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_EMAIL=?`, [this.$email]);
		if (usrs.length == 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		const activation = $Utils.uniqueHash();
		const link = $Config.get("restore_pwd_url") + `?userid=${usrs[0].USR_ID}&activation=${activation}`;

		$Db.executeQuery(`UPDATE \`user\` SET USR_RESET_CODE=? WHERE USR_ID=?`, [activation, usrs[0].USR_ID]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}
	
		$Mailer.sendMailFromTemplate(this.$email, $Const.EMAIL_TEMPLATE_FORGOT_PASSWORD, {"#NAME#": `${usrs[0].USD_FIRST_NAME} ${usrs[0].USD_LAST_NAME}`, "#LINK#": link});

		if (!$Config.get("env_is_production"))
		{
			vals.link = link;
			$Logger.debug(`Send email to ${this.$email}: Link - {{${link}}}`, "Debug/OTP");
		}

		return {...rc, ...vals};
	}

	reset_password()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

        if (!$Utils.isValidPassword(this.$password))
        {
            return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
        }

		let usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_ID=? AND USR_RESET_CODE=? AND USR_DELETED_ON is null`, [this.$user_id, this.$activation_code]);
		if (usrs.length > 0)
		{
			$Db.executeQuery(`UPDATE \`user\` SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=?, USR_RESET_CODE='' WHERE USR_ID=?`,
							[$Utils.hash(this.$user_id + this.$password), $Utils.now(), this.$user_id]);
			if ($Db.isError())
			{
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}
			
			this.$Session.tokenValidator.deleteFromUserCache(this.$user_id);
		}
		else
		{
			rc = $ERRS.ERR_INVALID_ACTIVATION_CODE;
		}

		return {...rc, ...vals};
	}

	delete_profile()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		
		let usrs = $Db.executeQuery(`SELECT USR_STATUS FROM \`user\` WHERE USR_ID=?`, [this.$Session.userId]);
		if (usrs.length == 0)
		{
			return $ERRS.ERR_USER_NOT_EXISTS;
		}
	
		$Db.beginTransaction();

		$Db.executeQuery(`UPDATE \`user\` SET USR_TOKEN='', USR_DEVICE_ID=null WHERE USR_ID=?`, [this.$Session.userId]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`UPDATE \`user_details\` SET USD_DELETED_ON=?, USD_STATUS=0, USD_PHONE_NUM=concat(USD_PHONE_NUM, '/DELETED'), USD_EMAIL=concat(USD_EMAIL, '/DELETED') WHERE USD_USR_ID=?`,
												[$Utils.now(), this.$Session.userId]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}
	
		$Db.commitTransaction();

		this.$Session.tokenValidator.deleteFromUserCache(this.$Session.userId);
		
		return {...rc, ...vals};
	}

	__create_admin()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;


		let usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_EMAIL=?`, [this.$email]);
		if (usrs.length > 0)
		{
			return $ERRS.ERR_USER_ALREADY_EXISTS;
		}

		
		let userId = $Utils.uniqueHash();

		$Db.beginTransaction();

		$Db.executeQuery(`INSERT INTO \`user\` (USR_ID, USR_EMAIL, USR_PASSWORD, USR_CREATED_ON, USR_TYPE, USR_STATUS, USR_LOGIN_AUTHORITY) VALUES (?, ?, ?, ?, ?, ?, ?)`,
									[userId, this.$email, $Utils.hash(userId + this.$password), $Utils.now(), $Const.USER_TYPE_ADMIN,
									$Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_EMAIL]);

		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`INSERT INTO \`user_details\` (USD_USR_ID, USD_EMAIL, USD_TYPE, USD_STATUS, USD_FIRST_NAME, USD_LAST_NAME)
								VALUES (?, ?, ?, ?, ?, ?)`,
									[userId, this.$email, $Const.USER_TYPE_ADMIN, $Const.USER_STATUS_ACTIVE, "Admin - " + this.$email, ""]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();


		vals.userid = userId;

		return {...rc, ...vals};
	}

	__create_null_user()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;


		const isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`user\` WHERE USR_ID=?`, [$Const.NULL_USER_ID])[0].cnt;
		if (isExist)
		{
			return $ERRS.ERR_USER_ALREADY_EXISTS;
		}

		
		const userId = $Const.NULL_USER_ID;
		const email = "null.user@null.user";

		$Db.beginTransaction();

		$Db.executeQuery(`INSERT INTO \`user\` (USR_ID, USR_EMAIL, USR_PASSWORD, USR_CREATED_ON, USR_TYPE, USR_STATUS, USR_LOGIN_AUTHORITY) VALUES (?, ?, ?, ?, ?, ?, ?)`,
									[userId, email, "", $Utils.now(), $Const.USER_TYPE_NA, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_EMAIL]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`INSERT INTO \`user_details\` (USD_USR_ID, USD_EMAIL, USD_TYPE, USD_STATUS, USD_FIRST_NAME, USD_LAST_NAME)
								VALUES (?, ?, ?, ?, ?, ?)`,
									[userId, email, $Const.USER_TYPE_NA, $Const.USER_STATUS_ACTIVE, "Null", "User"]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();


		vals.userid = userId;

		return {...rc, ...vals};
	}

	system_login()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let stus = $Db.executeQuery(`SELECT * FROM \`system_user\` WHERE STU_USER_NAME=? AND STU_STATUS=1`, [this.$user_name]);
		if (stus.length > 0)
		{
			let lastFailed = new $Date(stus[0].STU_LAST_FAILED_LOGIN);
			let lfts = lastFailed.getTimestamp();

			let today = new $Date();
			let ts = today.getTimestamp();
			
			if (ts - lfts < $Config.get("failed_login_cooldown_time"))
			{
				if (stus[0].STU_FAILED_LOGIN_COUNT >= $Config.get("max_failed_login_retries"))
				{
					return $ERRS.ERR_ACCOUNT_IS_TEMPORARILY_LOCKED;
				}
			}
			else
			{
				$Db.executeQuery(`UPDATE \`system_user\` SET STU_FAILED_LOGIN_COUNT=0 WHERE STU_USER_NAME=?`, [this.$user_name]);
				stus[0].STU_FAILED_LOGIN_COUNT = 0;
			}
		}
		
		if (stus.length > 0 && stus[0].STU_PASSWORD == $Utils.hash(this.$user_name + this.$password))
		{
			if (!$Utils.empty(stus[0].STU_TOKEN))
			{
				vals.token = $Cipher.decryptData(stus[0].STU_TOKEN, "static");
			}
			else
			{
				const token = $Utils.uniqueHash();
				const encToken = $Cipher.encryptData(token, "static");
				vals.token = token;

				$Db.executeQuery(`UPDATE \`system_user\` SET STU_TOKEN=? WHERE STU_USER_NAME=?`, [encToken, this.$user_name]);
				if ($Db.isError())
				{
					return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
				}
			}
		}
		else
		{
			rc = $ERRS.ERR_USER_NOT_FOUND;
			
			if (stus.length > 0)
			{
				$Db.executeQuery(`UPDATE \`system_user\` SET STU_FAILED_LOGIN_COUNT=?, STU_LAST_FAILED_LOGIN=? WHERE STU_USER_NAME=?`,
								[stus[0].STU_FAILED_LOGIN_COUNT + 1, $Utils.now(), this.$user_name]);
			}
		}

		return {...rc, ...vals};
	}

	system_logout()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const encToken = $Cipher.encryptData(this.$token, "static");
		$Db.executeQuery(`UPDATE \`system_user\` SET STU_TOKEN='' WHERE STU_TOKEN=?`, [encToken]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...rc, ...vals};
	}

	__set_system_user()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let password = $Utils.hash(this.$user_name + this.$password);
		let isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_USER_NAME=?`, [this.$user_name])[0].cnt;

		if (isExist)
		{
			$Db.executeQuery(`UPDATE \`system_user\` SET STU_PASSWORD=?, STU_TOKEN='' WHERE STU_USER_NAME=?`, [password, this.$user_name]);
			if ($Db.isError())
			{
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}
		}
		else
		{
			$Db.executeQuery(`INSERT INTO \`system_user\` (STU_USER_NAME, STU_PASSWORD, STU_CREATED_ON) VALUES (?, ?, ?)`, [this.$user_name, password, $Utils.now()]);
			if ($Db.isError())
			{
				return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
			}
		}

		return {...rc, ...vals};
	}

	_logLogin(userId, encToken)
	{
		if (!$Config.get("enable_login_log"))
		{
			return;
		}
	
		$Db.executeQuery(`INSERT INTO \`login_log\` (LOL_USR_ID, LOL_USR_TOKEN, LOL_CREATED_ON) VALUES (?, ?, ?)`, [userId, encToken, $Utils.now()]);
		if ($Db.isError())
		{
			$Logger.logString($Const.LL_ERROR, `Failed to log the login`);
		}
	}
}