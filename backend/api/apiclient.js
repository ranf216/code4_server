const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_api_client", restrictConfigKey: "restrict_api_client_to_ip", toolName: "apiclient"}))
	{
		return;
	}

	var html = $Utils.fileGetContents(__dirname + "/content/apiclient.html");

	html = $ToolPage.applyCommonReplacements(html, "apiclient");

	res.send(html);
}

exports.getDoc = function(req, res)
{
	if ($Config.get("enable_api_client") != true)
	{
		res.status(403).json({exists: false});
		return;
	}

	$Utils.authorizeIP($Config.get("restrict_api_client_to_ip"));

	var moduleName = req.query.module;
	if (!moduleName || !/^[a-zA-Z0-9_]+$/.test(moduleName))
	{
		res.json({exists: false});
		return;
	}

	var path = require('path');
	var fs = require('fs');
	var snakeName = moduleName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
	var docPath = path.join(__dirname, '..', '..', 'docs', 'api', snakeName + '_api.md');

	if (!fs.existsSync(docPath))
	{
		res.json({exists: false});
		return;
	}

	var content = fs.readFileSync(docPath, 'utf8');
	res.json({exists: true, content: content});
}
