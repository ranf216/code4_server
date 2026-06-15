var $$ = new Object();

var RestControl =
{
	_savedCalls: new Object(),
	_loadingCall: null,
	_docCache: {},
	
	init: function()
	{
		var fillSelectApi = function(apiCallsArr, userType)
		{
			$("#selectApi").unbind();
			$("#selectApi").html("");

			var opt = document.createElement("option");
			opt.innerHTML = "--- Select API Call ---";
			opt.value = null;
			
			$("#selectApi").append(opt);
			
			apiCallsArr.sort(function(a, b)
			{
				return (a.method > b.method ? 1 : (a.method < b.method ? -1 : 0));
			});
			
			for (var i = 0; i < apiCallsArr.length; i++)
			{
				var apiKey = apiCallsArr[i].module + "/" + apiCallsArr[i].method;
				
				if (userType != "-ALL-")
				{
					if (apiCallAcl[apiKey].indexOf(userType) == -1)
					{
						continue;
					}
				}
				
				var opt = document.createElement("option");
				opt.innerHTML = apiCallNames[apiKey];
				opt.value = apiCallsArr[i].module + "__" + apiCallsArr[i].method;

				if (apiCallExtraData[apiKey].apiModes.includes("superuser"))
				{
					opt.className = "superuser_api";
				}
				if (apiCallExtraData[apiKey].apiModes.includes("upgrade"))
				{
					opt.className = "upgrade_api";
				}
				else if (apiCallExtraData[apiKey].apiModes.includes("test"))
				{
					opt.className = "test_api";
				}
				else if (apiCallExtraData[apiKey].apiModes.includes("deprecated"))
				{
					opt.className = "deprecated_api";
					opt.innerHTML = "&lt;deprecated&gt; " + opt.innerHTML;
				}

				$("#selectApi").append(opt);
			}

			$("#selectApi").unbind().change(function()
			{
				window[$("#selectApi").val()]();
		
				if (RestControl._loadingCall != null)
				{
					RestControl.loadCallData(RestControl._loadingCall);
					RestControl._loadingCall = null;
				}

				RestControl.updateDocButtons();
			});
		};
		
		fillSelectApi(apiCalls, "-ALL-");

		
		var paramsCookie = jQuery.cookie("params");
		if (paramsCookie != null)
		{
			$$ = jQuery.parseJSON(paramsCookie);
		}
		
		var savedCalls = jQuery.cookie("calls");
		if (savedCalls != null)
		{
			RestControl._savedCalls = jQuery.parseJSON(savedCalls);
		}
		

		var opt = document.createElement("option");
		opt.innerHTML = "--- All API ---";
		opt.value = "All API";
		
		$("#selectApiGroup").append(opt);
		
		for (var group in apiGroups)
		{
			var opt = document.createElement("option");
			opt.innerHTML = group;
			opt.value = group;
			$("#selectApiGroup").append(opt);
		}
		
		$("#selectApiGroup").change(function()
		{
			var group = $("#selectApiGroup").val();
			var userType = $("#selectUserTypes").val();
			fillSelectApi(group == "All API" ? apiCalls : apiGroups[group], userType);
			RestControl.updateDocButtons();
		});

		
		var opt = document.createElement("option");
		opt.innerHTML = "--- All User Types and Roles ---";
		opt.value = "-ALL-";
		
		$("#selectUserTypes").append(opt);
		
		var optgroup = document.createElement("optgroup");
		optgroup.label = "User Types";
		$("#selectUserTypes").append(optgroup);
		
		for (var i in userTypes)
		{
			var opt = document.createElement("option");
			opt.innerHTML = userTypes[i];
			opt.value = userTypes[i];
			optgroup.append(opt);
		}
		
		optgroup = document.createElement("optgroup");
		optgroup.label = "Roles";
		$("#selectUserTypes").append(optgroup);
		
		for (var i in userRoles)
		{
			var opt = document.createElement("option");
			opt.innerHTML = userRoles[i];
			opt.value = userRoles[i];
			optgroup.append(opt);
		}
		
		$("#selectUserTypes").change(function()
		{
			var group = $("#selectApiGroup").val();
			var userType = $("#selectUserTypes").val();
			fillSelectApi(group == "All API" ? apiCalls : apiGroups[group], userType);
		});
		
		$("#btnSaveParam").unbind().click(function()
		{
			var paramName = $("#paramName").val().trim();
			var paramValue = $("#paramValue").val();
			if (paramName == "")
			{
				return;
			}
			
			var scriptText = "$$." + paramName + " = \"" + paramValue + "\"";
			$("#scriptLine").val(scriptText);
			RestControl.runScript();
		$("#paramName").val("");
		$("#paramValue").val("");
		});
		
		$("#btnClearAll").unbind().click(function()
		{
			$$ = new Object();
			RestControl.updateParams();
		});
		
		$("#btnSaveCall").unbind().click(function()
		{
			RestControl.saveCall();
		});
		
		$("#btnExportCalls").unbind().click(function()
		{
			RestControl.exportSavedCalls();
		});
		
		$("#btnImportCalls").unbind().click(function()
		{
			RestControl.importSavedCalls();
		});
		
		$("#scriptRunBtn").unbind().click(function()
		{
			RestControl.runScript();
		});
		$("#scriptLine").on("keypress", function(e)
		{
            /* ENTER PRESSED*/
            if (e.keyCode == 13)
			{
				RestControl.runScript();
            }
        });
		
		$("#paramValue").on("keypress", function(e)
		{
            /* ENTER PRESSED*/
            if (e.keyCode == 13)
			{
				$("#btnSaveParam").click();
            }
        });
		
		$("#postJsonBtn").unbind().click(function()
		{
			RestControl.postJsonRequest();
		});

		$("#requestJsonArea").focus(function()
		{
			var $this = $(this);
			$this.select();
		
			// Work around Chrome's little problem
			$this.mouseup(function()
			{
				// Prevent further mouseup intervention
				$this.unbind("mouseup");
				return false;
			});
		});

		$("#wrapContentCheckbox").unbind().change(function()
		{
			var isChecked = $(this).is(":checked");
			if (isChecked)
			{
				$("#request, #postData, #response").addClass("wrap-content");
			}
			else
			{
				$("#request, #postData, #response").removeClass("wrap-content");
			}
		});

		$("#btnDocModule").unbind().click(function()
		{
			RestControl.showModuleDoc();
		});

		$("#btnDocEndpoint").unbind().click(function()
		{
			RestControl.showEndpointDoc();
		});

		$("#docOverlayClose").unbind().click(function()
		{
			RestControl.closeDocPopup();
		});

		$("#docOverlay").click(function(e)
		{
			if (e.target === this)
			{
				RestControl.closeDocPopup();
			}
		});

		$("#btnHelp").unbind().click(function()
		{
			RestControl.showHelp();
		});

		RestControl.resetPage();
	},
	
	resetPage: function()
	{
		$("#documentation").html("");
		$("#getParams").html("<h2>Get Params</h2>");
		$("#postParams").html("<h2>Post Params</h2>");
		$("#request").html("");
		$("#postData").html("");
		$("#response").html("");
		$("#documentation").hide();
		$("#scriptArea").val("");
		$("#requestJsonArea").val("");
		
		RestControl.updateAlerts();
		RestControl.updateParams();
		RestControl.updateSavedCalls();

		if (!USES_GET)
		{
			$("#getParams").hide();
		}
		
		customResetPage();
	},

	updateAlerts: function()
	{
		var html = "";

		for (var apiAlert in apiCallAlerts)
		{
			if (html.length > 0)
			{
				html += "<div class='alertSep'></div>";
			}

			html += "<div class='alertItem'><b>" + apiAlert + "</b> " + apiCallAlerts[apiAlert] + "</div>";
		}

		if (html != "")
		{
			$("#alertsArea").html(html);
			$("#alerts").show();
		}
	},

	updateParams: function()
	{
		var paramList = $("#paramsList");
		if ($.isEmptyObject($$))
		{
			paramList.addClass("noText");
			paramList.html("No parameters set");
		}
		else
		{
			paramList.addClass("hasText");
			paramList.html("");

			for (param in $$)
			{
				var id = Math.floor(Math.random() * 100000000);
				var val = "";
				var paramVal = $$[param];
				
				if (typeof paramVal == "string")
				{
					val = '"' + paramVal + '"'
				}
				else if (Array.isArray(paramVal))
				{
					var tmp = new Object();
					tmp.arr = paramVal;
					var tmpval = JSON.stringify(tmp);
					var ind = tmpval.indexOf(":");
					val = tmpval.substr(ind + 1, tmpval.length - ind - 2);
				}
				else if (typeof paramVal == "object")
				{
					val = JSON.stringify(paramVal);
				}
				else
				{
					val = paramVal;
				}
				
				var html = "<div class='divParam'><span class='vButton' id='cButton_" + id + "' __paramName='" + param + "'>Copy</span> " + param + ": " + val + "<span class='xButton rightFloat' id='xButton_" + id + "' __paramName='" + param + "'>X</span></div>";
				paramList.append(html);
				$("#xButton_" + id).unbind().click(function()
				{
					var paramName = $(this).attr("__paramName");
					delete $$[paramName];
					RestControl.updateParams();
				});
				$("#cButton_" + id).unbind().click(function()
				{
					var paramName = $(this).attr("__paramName");
					var paramVal = $$[paramName];
					var copyVal = (typeof paramVal == "string") ? paramVal : JSON.stringify(paramVal);
					RestControl.copyToClipboard(copyVal);
				});
			}
		}
		
		jQuery.cookie("params", JSON.stringify($$), {expires: 365});
	},
	
	updateSavedCalls: function()
	{
		var callsList = $("#callsList");
		if ($.isEmptyObject(RestControl._savedCalls))
		{
			callsList.addClass("noText");
			callsList.html("No saved calls");
		}
		else
		{
			callsList.addClass("hasText");
			callsList.html("");

			for (param in RestControl._savedCalls)
			{
				var id = Math.floor(Math.random() * 100000000);
				
				var html = "<div class='divCall'><span class='vButton' id='vButton_" + id + "' __paramName='" + param + "'>Load</span> " + param + "<span class='xButton rightFloat' id='xButton_" + id + "' __paramName='" + param + "'>X</span></div>";
				callsList.append(html);
				$("#xButton_" + id).unbind().click(function()
				{
					var paramName = $(this).attr("__paramName");
					delete RestControl._savedCalls[paramName];
					RestControl.updateSavedCalls();
				});
				$("#vButton_" + id).unbind().click(function()
				{
					var paramName = $(this).attr("__paramName");
					RestControl.loadSavedCall(paramName);
				});
			}
		}
		
		jQuery.cookie("calls", JSON.stringify(RestControl._savedCalls), {expires: 365});
	},

	exportSavedCalls: function()
	{
		if ($.isEmptyObject(RestControl._savedCalls))
		{
			alert("No saved calls to export");
			return;
		}

		var json = JSON.stringify(RestControl._savedCalls, null, 2);
		var blob = new Blob([json], {type: "application/json"});
		var url = URL.createObjectURL(blob);
		var a = document.createElement("a");
		a.href = url;
		a.download = "saved_calls.json";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	},

	importSavedCalls: function()
	{
		var input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = function(e)
		{
			var file = e.target.files[0];
			if (!file) return;

			var reader = new FileReader();
			reader.onload = function(ev)
			{
				try
				{
					var calls = JSON.parse(ev.target.result);
					if (typeof calls !== "object" || Array.isArray(calls))
					{
						alert("Invalid saved calls format");
						return;
					}

					for (var key in calls)
					{
						RestControl._savedCalls[key] = calls[key];
					}

					RestControl.updateSavedCalls();
				}
				catch (ex)
				{
					alert("Failed to parse JSON file");
				}
			};
			reader.readAsText(file);
		};
		input.click();
	},
	
	saveCall: function()
	{
		if ($("#selectApi").val() == "null")
		{
			alert("No selected call");
			return;
		}
		
		var d = new Date();
		var dateStr = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
		var defaultName = $("#selectApi").val().replace("__", "/");
		var alias = prompt("Enter call alias", defaultName);
		if (alias == null || alias.trim() == "")
		{
			return;
		}
		
		var callObj = new Object();
		callObj.p = new Object();
		callObj.g = $("#selectApiGroup").val();
		callObj.u = $("#selectUserTypes").val();
		callObj.s = $("#scriptArea").val().trim();
		
		$("#postParams input").each(function()
		{
			var itemId = $(this).attr("id");
			if (itemId.endsWith("_chk"))
			{
				callObj.p[itemId] = ($(this).attr("checked") == "checked" ? 1 : 0);
			}
			else
			{
				callObj.p[itemId] = $(this).val();
			}
		});
		
		RestControl._savedCalls[alias] = callObj;
		RestControl.updateSavedCalls();
	},
	
	loadSavedCall: function(callName)
	{
		RestControl._loadingCall = callName;
		
		var callObj = RestControl._savedCalls[callName];
		$("#selectApiGroup").val(callObj.g);
		$("#selectUserTypes").val(callObj.u);
		$("#selectApiGroup").trigger("change");
		$("#selectApi").val(callObj.p.post_request_0.replace("/", "__"));
		$("#selectApi").trigger("change");
	},
	
	loadCallData: function(callName)
	{
		var callObj = RestControl._savedCalls[callName];
		
		$("#scriptArea").val(callObj.s);

		$("#postParams input").each(function()
		{
			var itemId = $(this).attr("id");
			if (itemId.endsWith("_chk"))
			{
				$(this).attr("checked", (callObj.p[itemId] == 1 ? "checked" : null));
				onClickOptionalCheckbox(this);
			}
			else
			{
				$(this).val(callObj.p[itemId]);
			}
		});
	},
	
	addInstance: function(instId)
	{
		RestControl.resetPage();
	},
	
	createRequest: function(method, url, doc, postParams, getParams, onSuccess, onFail, optionals, docData, paramTypes)
	{
		var reqParams = 
		{
			instId: 0,
			method: method,
			url: url,
			doc: doc,
			postParams: postParams,
			getParams: getParams,
			onSuccess: onSuccess,
			onFail: onFail,
			docCnt: "documentation",
			getParamsCnt: "getParams",
			postParamsCnt: "postParams",
			requestCnt: "request",
			postDataCnt: "postData",
			responseCnt: "response",
			optionals: optionals,
			docData: docData,
			paramTypes: paramTypes
		};
		
		RestControl.resetPage();
		createRequest(reqParams);

		$("#btnPost").unbind().click(function()
		{
			$("#request").html("");
			$("#postData").html("");
			$("#response").html("");

			customOnSuccess = RestControl.onReceiveResultSuccess;
			peformRequest(reqParams);
		});
	},
	
	onReceiveResultSuccess: function(json)
	{
		var scriptAfterExec = $("#scriptArea").val().trim();
		if (scriptAfterExec == "")
		{
			return;
		}
		
		try
		{
			eval(scriptAfterExec);
		}
		catch (e)
		{
			alert("Post execution script error:\n" + e);
		}
		
		RestControl.updateParams();
	},
	
	runScript: function()
	{
		var scriptText = $("#scriptLine").val().trim();
		if (scriptText == "")
		{
			return;
		}
		
		try
		{
			eval(scriptText);
			$("#scriptLine").val("");
		}
		catch (e)
		{
			alert("Script error:\n" + e);
		}
		
		RestControl.updateParams();
	},

	postJsonRequest: function()
	{
		$("#request").html("");
		$("#postData").html("");
		$("#response").html("");

		var postJson = $("#requestJsonArea").val();
		var postData = null;

		try
		{
			postData = JSON.parse(postJson);
		}
		catch
		{
			postData = null;
		}

		if (postData == null)
		{
			$("#postData").html('<div class="invalid_json_error">Invalid JSON</div>');
			return;
		}

		var url = BASE_API_URL;
		$("#request").html("<span>POST " + url + "</span>");
		$("#postData").html(syntaxHighlight(postData));

		$.ajax({
				url: url,
				type: "POST",
				data: JSON.stringify(postData),
				dataType: 'json',
				headers: { 'Content-Type': 'application/json' },
				success: function (json)
				{
					$("#response").html(syntaxHighlight(json));
				},
				error: function()
				{
					$("#response").html(syntaxHighlight(arguments[0].responseText));
				}
		});
	},

	copyToClipboard: function(text)
	{
		if (window.getSelection().toString().length > 0)
		{
			return;
		}

		if (navigator.clipboard)
		{
			navigator.clipboard.writeText(text)
			.then(() =>
			{
				RestControl.showToast("Copied to clipboard!");
			})
			.catch(err =>
			{
				RestControl.showToast("Failed to copy text", true);
			});
		}
		else
		{
			const textarea = document.createElement("textarea");
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			RestControl.showToast("Copied to clipboard!");
		}
	},

	getCurrentModule: function()
	{
		var api = $("#selectApi").val();
		if (api && api !== "null")
		{
			return api.split("__")[0];
		}

		var group = $("#selectApiGroup").val();
		if (group && group !== "All API")
		{
			return group;
		}

		return null;
	},

	getCurrentEndpoint: function()
	{
		var api = $("#selectApi").val();
		if (api && api !== "null")
		{
			var parts = api.split("__");
			return parts.length > 1 ? parts[1] : null;
		}
		return null;
	},

	updateDocButtons: function()
	{
		var module = RestControl.getCurrentModule();
		var endpoint = RestControl.getCurrentEndpoint();

		if (!module)
		{
			$("#btnDocModule").prop("disabled", true);
			$("#btnDocEndpoint").prop("disabled", true);
			return;
		}

		var cached = RestControl._docCache[module];
		if (cached !== undefined)
		{
			$("#btnDocModule").prop("disabled", !cached.exists);
			var hasEndpoint = cached.exists && endpoint && RestControl.findEndpointSection(cached.content, module, endpoint);
			$("#btnDocEndpoint").prop("disabled", !hasEndpoint);
			return;
		}

		$("#btnDocModule").prop("disabled", true);
		$("#btnDocEndpoint").prop("disabled", true);

		$.getJSON("/apiclient/doc?module=" + encodeURIComponent(module), function(data)
		{
			RestControl._docCache[module] = data;
			RestControl.updateDocButtons();
		}).fail(function()
		{
			RestControl._docCache[module] = {exists: false};
		});
	},

	findEndpointSection: function(content, module, endpoint)
	{
		if (!content) return null;

		var searchStr = module + "/" + endpoint;
		var escaped = searchStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		var pattern = new RegExp("^###\\s+\\[?\\w+\\]?\\s+" + escaped, "m");
		var match = pattern.exec(content);

		if (!match) return null;

		var startIdx = match.index;
		var endIdx = content.indexOf("\n---", startIdx + match[0].length);

		if (endIdx === -1)
		{
			return content.substring(startIdx);
		}

		return content.substring(startIdx, endIdx);
	},

	showModuleDoc: function()
	{
		var module = RestControl.getCurrentModule();
		if (!module) return;

		var cached = RestControl._docCache[module];
		if (!cached || !cached.exists) return;

		RestControl.showDocPopup(module + " API", cached.content);
	},

	showEndpointDoc: function()
	{
		var module = RestControl.getCurrentModule();
		var endpoint = RestControl.getCurrentEndpoint();
		if (!module || !endpoint) return;

		var cached = RestControl._docCache[module];
		if (!cached || !cached.exists) return;

		var section = RestControl.findEndpointSection(cached.content, module, endpoint);
		if (!section) return;

		RestControl.showDocPopup(module + "/" + endpoint, section);
	},

	showDocPopup: function(title, markdown)
	{
		var overlay = document.getElementById("docOverlay");
		var titleEl = document.getElementById("docPopupTitle");
		var bodyEl = document.getElementById("docPopupBody");

		titleEl.textContent = title;
		bodyEl.innerHTML = RestControl.renderMarkdown(markdown);
		overlay.style.display = "flex";
	},

	closeDocPopup: function()
	{
		document.getElementById("docOverlay").style.display = "none";
	},

	escapeHtml: function(text)
	{
		return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	},

	inlineFormat: function(text)
	{
		text = RestControl.escapeHtml(text);
		text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
		text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
		text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
		return text;
	},

	renderMarkdown: function(md)
	{
		var lines = md.split("\n");
		var html = "";
		var inCodeBlock = false;
		var codeContent = "";
		var inTable = false;

		for (var i = 0; i < lines.length; i++)
		{
			var line = lines[i];

			if (line.trim().indexOf("```") === 0)
			{
				if (inCodeBlock)
				{
					html += "<pre><code>" + RestControl.escapeHtml(codeContent) + "</code></pre>";
					codeContent = "";
					inCodeBlock = false;
				}
				else
				{
					inCodeBlock = true;
				}
				continue;
			}

			if (inCodeBlock)
			{
				codeContent += (codeContent ? "\n" : "") + line;
				continue;
			}

			if (inTable && line.trim().indexOf("|") !== 0)
			{
				html += "</tbody></table>";
				inTable = false;
			}

			if (/^\s*---+\s*$/.test(line))
			{
				html += "<hr>";
				continue;
			}

			if (line.indexOf("### ") === 0)
			{
				html += "<h3>" + RestControl.inlineFormat(line.substr(4)) + "</h3>";
				continue;
			}
			if (line.indexOf("## ") === 0)
			{
				html += "<h2>" + RestControl.inlineFormat(line.substr(3)) + "</h2>";
				continue;
			}
			if (line.indexOf("# ") === 0)
			{
				html += "<h1>" + RestControl.inlineFormat(line.substr(2)) + "</h1>";
				continue;
			}

			if (line.trim().indexOf("|") === 0)
			{
				if (/^\s*\|[\s\-:|]+\|\s*$/.test(line))
				{
					continue;
				}

				var cells = line.split("|");
				cells = cells.filter(function(c, idx) { return idx > 0 && idx < cells.length - 1; });

				if (!inTable)
				{
					html += "<table><thead><tr>";
					for (var j = 0; j < cells.length; j++)
					{
						html += "<th>" + RestControl.inlineFormat(cells[j].trim()) + "</th>";
					}
					html += "</tr></thead><tbody>";
					inTable = true;
					continue;
				}

				html += "<tr>";
				for (var j = 0; j < cells.length; j++)
				{
					html += "<td>" + RestControl.inlineFormat(cells[j].trim()) + "</td>";
				}
				html += "</tr>";
				continue;
			}

			var listMatch = line.match(/^(\s*)-\s(.*)/);
			if (listMatch)
			{
				var indent = listMatch[1].length;
				html += "<div class='md-list-item' style='padding-left:" + (indent * 6 + 16) + "px'>&bull; " + RestControl.inlineFormat(listMatch[2]) + "</div>";
				continue;
			}

			if (line.trim() === "")
			{
				continue;
			}

			html += "<p>" + RestControl.inlineFormat(line) + "</p>";
		}

		if (inCodeBlock)
		{
			html += "<pre><code>" + RestControl.escapeHtml(codeContent) + "</code></pre>";
		}
		if (inTable)
		{
			html += "</tbody></table>";
		}

		return html;
	},

	showHelp: function()
	{
		var img = function(n) { return '<img src="/public/help/image' + n + '.png" />'; };

		var html = ''
			+ '<h2>API Documentation</h2>'
			+ '<h3>Module Documentation</h3>'
			+ '<p>When you select a module, the <strong>(?) Module</strong> button becomes enabled if documentation is available.</p>'
			+ img(1)
			+ '<p>Click it to open the full module documentation. It covers features and flows beyond just individual endpoints.</p>'
			+ img(2)

			+ '<h3>Endpoint Documentation</h3>'
			+ '<p>When you select an endpoint, the <strong>(?) Endpoint</strong> button becomes enabled.</p>'
			+ img(3)
			+ '<p>Click it to view the specific endpoint documentation.</p>'
			+ img(4)

			+ '<h2>Top Bar Tools</h2>'
			+ '<h3>Clear</h3>'
			+ '<p>Resets the page to its initial state.</p>'
			+ img(5)

			+ '<h3>Wrap Long Lines</h3>'
			+ '<p>When the response contains long content with horizontal scrolling, enable this checkbox to wrap the text.</p>'
			+ img(6)

			+ '<h2>Side Bar Tools</h2>'
			+ '<h3>Post JSON Request</h3>'
			+ '<p>Paste a raw JSON request (e.g. copied from the logtail) and execute it directly.</p>'
			+ img(7)

			+ '<h3>Parameters</h3>'
			+ '<p>Store persistent key-value data on the page. Values can be copied to the clipboard for later use.</p>'
			+ img(8)

			+ '<h3>Saved Calls</h3>'
			+ '<p>After making a call, you can save it along with its request params and <strong>Run After Response</strong> script.</p>'
			+ '<p>In <strong>Run After Response</strong> you can write any valid JavaScript. '
			+ 'Use <code>$$</code> to access the <strong>Parameters</strong> object and <code>json</code> to access the response.</p>'

			+ '<h4>Example</h4>'
			+ '<p>Add this to <code>User/login</code> Run After Response:</p>'
			+ '<pre><code>$$.second_factor_key = json.second_factor_key</code></pre>'
			+ '<p>This saves <code>second_factor_key</code> from the response into the Parameters. '
			+ 'Then in the <code>TwoFactorAuth/send_otp_code</code> call, set the <code>second_factor_key</code> field to <code>$$.second_factor_key</code> and it will be filled automatically.</p>'
			+ '<p>You can save as many calls as you want. Using an existing name overwrites it; a new name adds a new entry.</p>'

			+ '<p>At the bottom of the Saved Calls box, use the <strong>Import</strong> / <strong>Export</strong> buttons to manage your call list. '
			+ 'For example, import this <a href="/public/help/apiclient_import_example.json" download="apiclient_import_example.json">JSON</a> '
			+ 'file to get 3 pre-configured calls for admin login. '
			+ 'Then load and run each call in order. '
			+ 'Notice how the <code>$$</code> object is used in the requests and in Run After Response.</p>'
			+ img(9)

			+ '<h2>User Context</h2>'
			+ '<p>Whenever you log in or register and receive a token, it is automatically added to the context list.</p>'
			+ img(10)
			+ '<p>When calling an endpoint that requires a token, the selected context token is auto-filled.</p>'
			+ img(11);

		RestControl.showDocPopup("API Client Help", "");
		document.getElementById("docPopupBody").innerHTML = html;
	},

	showToast: function(message, isErr = false)
	{
		const toast = document.createElement("div");
		toast.textContent = message;
		toast.style.position = "fixed";
		toast.style.bottom = "40px";
		toast.style.left = "50%";
		toast.style.transform = "translateX(-50%)";
		toast.style.background = (isErr ? "#A00000" : "#333333");
		toast.style.color = "#ffffff";
		toast.style.padding = "10px 20px";
		toast.style.borderRadius = "8px";
		toast.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
		toast.style.zIndex = "9999";
		toast.style.opacity = "0";
		toast.style.transition = "opacity 0.3s";

		document.body.appendChild(toast);

		// Fade in
		requestAnimationFrame(() =>
		{
			toast.style.opacity = "1";
		});

		// Remove after 1 second
		setTimeout(() =>
		{
			toast.style.opacity = "0";
			toast.addEventListener("transitionend", () =>
			{
				toast.remove();
			});
		}, 1000);
	}
};
