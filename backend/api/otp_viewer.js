const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_otp_viewer", restrictConfigKey: "restrict_otp_viewer_to_ip", toolName: "otp_viewer"}))
	{
		return;
	}

	let html = $Utils.fileGetContents(__dirname + "/content/otp_viewer.html");

	html = $ToolPage.applyCommonReplacements(html, "otp_viewer");

	res.send(html);
}
