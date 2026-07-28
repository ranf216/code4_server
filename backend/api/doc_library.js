const path = require('path');
const fs = require('fs');
const $ToolPage = require("../platform/infra/tool_page.js");

const LIBRARY_DIR = path.join(__dirname, "../../docs/library");

exports.run = function (req, res)
{
	if (!$ToolPage.checkAccess(req, res, {configKey: "enable_doc_library", restrictConfigKey: "restrict_doc_library_to_ip", toolName: "doc_library"}))
	{
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
				var treeFilename = entry;
				var configMatch = entry.match(/^([A-Za-z0-9_]+)#(.+)$/);
				if (configMatch)
				{
					var configToken = configMatch[1];
					if ($Config.get("enable_" + configToken) != true)
					{
						continue;
					}
					treeFilename = configMatch[2];
				}

				files.push({
					filename: entry,
					treeFilename: treeFilename,
					display: fileNameToDisplay(treeFilename)
				});
			}
		}
	}
	catch (e)
	{
		console.log("doc_library: failed to read library dir", e.message);
	}

	var html = $Utils.fileGetContents(__dirname + "/content/doc_library.html");

	html = $ToolPage.applyCommonReplacements(html, "doc_library")
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

exports.getImage = function (req, res)
{
	if ($Config.get("enable_doc_library") != true)
	{
		$Utils.unauthorize();
		return;
	}

	var filename = req.params.imageName;
	if (!filename || filename.indexOf("..") !== -1)
	{
		res.status(400).json({ error: "Invalid filename" });
		return;
	}

	var filePath = path.join(LIBRARY_DIR, "images", filename);
	try
	{
		var stat = fs.statSync(filePath);
		if (!stat.isFile())
		{
			res.status(404).json({ error: "File not found" });
			return;
		}
		var ext = path.extname(filename).toLowerCase();
		var mimeTypes = {
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".gif": "image/gif",
			".svg": "image/svg+xml",
			".webp": "image/webp"
		};
		var contentType = mimeTypes[ext] || "application/octet-stream";
		res.type(contentType).sendFile(filePath);
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
