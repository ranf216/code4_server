exports.run = function (req, res)
{
	if ($Config.get("enable_api_client") != true)
	{
		$Utils.unauthorize();
		return;
	}

	var html = $Utils.fileGetContents(__dirname + "/content/sql_formatter.html");

	html = html.replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
				.replace("{{system}}", $Config.get("SYSTEM_NAME"));

	res.send(html);
}
