var $$ = new Object();

var RestControl =
{
	_savedCalls: new Object(),
	_loadingCall: null,
	
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
		if (alias == "")
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
