/*=============================================================================================*
*
*	Shared helper for the internal admin "tools" pages (apiclient, logtail, log_analyzer,
*	audit_trail, otp_viewer, socket_viewer, sql_formatter, db_exporter, doc_library).
*
*	Centralizes:
*		- enable_x_tool / restrict_x_to_ip / system login authorization checks
*		- the common {{placeholder}} replacements shared by every tool page
*		(getWebClientMessages, getWebClientEnvironment, environment, system, api_url,
*		tool_name, enable_system_login)
*
*=============================================================================================*/

module.exports =
{
	// Checks enable/restrict-ip/system-login access for a tool page.
	// Returns true if the request is authorized to proceed, false if a response
	// (unauthorize/redirect) was already sent and the caller should stop.
	checkAccess: function(req, res, options)
	{
		if (!options.skipHeaders)
		{
			res.set("Content-Type", "text/html");
			res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
			res.set("Cache-Control", "post-check=0, pre-check=0");
			res.set("Pragma", "no-cache");
		}

		if ($Config.get(options.configKey) != true)
		{
			$Utils.unauthorize();
			return false;
		}

		if (options.restrictConfigKey)
		{
			$Utils.authorizeIP($Config.get(options.restrictConfigKey));
		}

		if ($Config.get("enable_system_login"))
		{
			const systemToken = req.cookies.system_token;
			if (systemToken === undefined)
			{
				res.redirect("/system_login/" + options.toolName);
				return false;
			}

			const encToken = $Cipher.encryptData(systemToken, "static");
			const isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_TOKEN=?`, [encToken])[0].cnt;

			$HttpContext.get("session").closeDb();

			if (!isExist)
			{
				res.redirect("/system_login/" + options.toolName);
				return false;
			}
		}

		return true;
	},

	// Applies the common placeholder replacements shared by every tool page.
	applyCommonReplacements: function(html, toolName)
	{
		return html.replace("{{getWebClientMessages}}", $Utils.getWebClientMessages())
					.replace("{{getWebClientEnvironment}}", $Utils.getWebClientEnvironment())
					.replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
					.replace("{{system}}", $Config.get("SYSTEM_NAME"))
					.replace("{{api_url}}", $Config.get("api_url"))
					.replaceAll("{{tool_name}}", toolName)
					.replace("{{enable_system_login}}", $Config.get("enable_system_login") ? "" : "display: none;");
	}
}
