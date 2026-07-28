const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_audit_trail", restrictConfigKey: "restrict_audit_trail_to_ip", toolName: "audit_trail"}))
	{
		return;
	}

	const triggersDef = require("../../db/triggers_def.js");
	const tableOptions = triggersDef.sort((a, b) => a.name.localeCompare(b.name)).map(t => `<option value="${t.name}">${t.name}</option>`).join("");

	let html = $Utils.fileGetContents(__dirname + "/content/audit_trail.html");

	html = $ToolPage.applyCommonReplacements(html, "audit_trail")
				.replace("{{table_options}}", tableOptions);

	res.send(html);
}
