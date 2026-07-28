const path = require('path');
const $ToolPage = require("../platform/infra/tool_page.js");

exports.run = function (req, res)
{
	let html = $Utils.fileGetContents(path.join(__dirname, "../../demos/dialer/index.html"));

	html = $ToolPage.applyCommonReplacements(html, "dialer");

	res.send(html);
}
