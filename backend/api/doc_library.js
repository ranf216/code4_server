const path = require('path');
const fs = require('fs');

const LIBRARY_DIR = path.join(__dirname, "../../docs/library");

exports.run = function (req, res)
{
	if ($Config.get("enable_doc_library") != true)
	{
		$Utils.unauthorize();
		return;
	}

	var files = [];
	try
	{
		var entries = fs.readdirSync(LIBRARY_DIR);
		for (var i = 0; i < entries.length; i++)
		{
			var entry = entries[i];
			if (entry.endsWith(".md"))
			{
				files.push({
					filename: entry,
					display: fileNameToDisplay(entry)
				});
			}
		}
	}
	catch (e)
	{
		console.log("doc_library: failed to read library dir", e.message);
	}

	var html = $Utils.fileGetContents(__dirname + "/content/doc_library.html");

	html = html.replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
				.replace("{{system}}", $Config.get("SYSTEM_NAME"))
				.replace("{{files}}", JSON.stringify(files));

	res.send(html);
}

exports.getFile = function (req, res)
{
	if ($Config.get("enable_doc_library") != true)
	{
		$Utils.unauthorize();
		return;
	}

	var filename = req.query.name;
	if (!filename || filename.indexOf("..") !== -1 || filename.indexOf("/") !== -1 || filename.indexOf("\\") !== -1)
	{
		res.status(400).json({ error: "Invalid filename" });
		return;
	}

	var filePath = path.join(LIBRARY_DIR, filename);
	try
	{
		var content = fs.readFileSync(filePath, "utf8");
		res.type("text/plain").send(content);
	}
	catch (e)
	{
		res.status(404).json({ error: "File not found" });
	}
}

function fileNameToDisplay(filename)
{
	var name = filename.replace(/\.md$/, "");
	name = name.replace(/[-_]/g, " ");
	name = name.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
	return name;
}
