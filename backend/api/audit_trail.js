exports.run = function (req, res)
{
	res.set("Content-Type", "text/html");
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
	res.set("Cache-Control", "post-check=0, pre-check=0");
	res.set("Pragma", "no-cache");

	if ($Config.get("enable_audit_trail") != true)
	{
		$Utils.unauthorize();
		return;
	}

	$Utils.authorizeIP($Config.get("restrict_audit_trail_to_ip"));

	if ($Config.get("enable_system_login"))
	{
		const systemToken = req.cookies.system_token;
		if (systemToken === undefined)
		{
			res.redirect("/system_login/audit_trail");
			return;
		}

		const encToken = $Cipher.encryptData(systemToken, "static");
		const isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_TOKEN=?`, [encToken])[0].cnt;
		if (!isExist)
		{
			res.redirect("/system_login/audit_trail");
			return;
		}
	}

	const triggersDef = require("../../db/triggers_def.js");
	const tableOptions = triggersDef.sort((a, b) => a.name.localeCompare(b.name)).map(t => `<option value="${t.name}">${t.name}</option>`).join("");

	let html = $Utils.fileGetContents(__dirname + "/content/audit_trail.html");

	html = html.replace("{{getWebClientMessages}}", $Utils.getWebClientMessages())
				.replace("{{getWebClientEnvironment}}", $Utils.getWebClientEnvironment())
				.replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
				.replace("{{system}}", $Config.get("SYSTEM_NAME"))
				.replace("{{api_url}}", $Config.get("api_url"))
				.replace("{{table_options}}", tableOptions)
				.replace("{{enable_system_login}}", $Config.get("enable_system_login") ? "" : "display: none;");

	res.send(html);
}
