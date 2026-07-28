const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_socket_viewer", restrictConfigKey: "restrict_socket_viewer_to_ip", toolName: "socket_viewer"}))
	{
		return;
	}

	let html = $Utils.fileGetContents(__dirname + "/content/socket_viewer.html");

	html = $ToolPage.applyCommonReplacements(html, "socket_viewer")
				.replaceAll("{{socket_url}}", $SOCKET_PUBLIC_URL);

	res.send(html);
}
