const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_sql_formatter", restrictConfigKey: "restrict_sql_formatter_to_ip", toolName: "sql_formatter"}))
	{
		return;
	}

	var html = $Utils.fileGetContents(__dirname + "/content/sql_formatter.html");

	html = $ToolPage.applyCommonReplacements(html, "sql_formatter");

	res.send(html);
}
