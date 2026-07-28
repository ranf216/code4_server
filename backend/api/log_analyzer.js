const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_log_analyzer", restrictConfigKey: "restrict_log_analyzer_to_ip", toolName: "log_analyzer"}))
	{
		return;
	}

	let html = $Utils.fileGetContents(__dirname + "/content/log_analyzer.html");

	html = $ToolPage.applyCommonReplacements(html, "log_analyzer")
				.replaceAll("{{project}}", $Config.get("project_log_type_name"));

	res.send(html);
}
