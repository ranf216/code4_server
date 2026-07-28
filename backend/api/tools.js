const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if ($Config.get("enable_system_login"))
	{
		const systemToken = req.cookies.system_token;
		if (systemToken === undefined)
		{
			res.redirect("/system_login/tools");
			return;
		}

		const encToken = $Cipher.encryptData(systemToken, "static");
		const isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_TOKEN=?`, [encToken])[0].cnt;
		if (!isExist)
		{
			res.redirect("/system_login/tools");
			return;
		}
	}

	const tools = [
		{
			name: "apiclient",
			title: "API Client",
			url: "/apiclient",
			enabled: $Config.get("enable_api_client") === true
		},
		{
			name: "logtail",
			title: "Log Tail",
			url: "/logtail",
			enabled: $Config.get("enable_logtail") === true
		},
		{
			name: "log_analyzer",
			title: "Log Analyzer",
			url: "/log_analyzer",
			enabled: $Config.get("enable_log_analyzer") === true
		},
		{
			name: "audit_trail",
			title: "Audit Trail",
			url: "/audit_trail",
			enabled: $Config.get("enable_audit_trail") === true
		},
		{
			name: "otp_viewer",
			title: "OTP Viewer",
			url: "/otp_viewer",
			enabled: $Config.get("enable_otp_viewer") === true
		},
		{
			name: "socket_viewer",
			title: "Socket Viewer",
			url: "/socket_viewer",
			enabled: $Config.get("enable_socket_viewer") === true
		},
		{
			name: "dialer",
			title: "Dialer",
			url: "/dialer",
			enabled: $Config.get("enable_dialer") === true
		},
		{
			name: "sql_formatter",
			title: "SQL Formatter",
			url: "/sql_formatter",
			enabled: $Config.get("enable_sql_formatter") === true
		},
		{
			name: "db_exporter",
			title: "DB Exporter",
			url: "/db_exporter",
			enabled: $Config.get("enable_db_exporter") === true
		},
		{
			name: "doc_library",
			title: "Doc Library",
			url: "/doc_library",
			enabled: $Config.get("enable_doc_library") === true
		}
	];

	const enabledTools = tools.filter(tool => tool.enabled);
	const toolsJson = JSON.stringify(enabledTools);

	var html = $Utils.fileGetContents(__dirname + "/content/tools.html");

	html = $ToolPage.applyCommonReplacements(html, "tools")
				.replace("{{tools}}", toolsJson);

	res.send(html);
}
