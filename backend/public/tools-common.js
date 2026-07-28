/*=============================================================================================*
*
*	Shared client-side helpers for the internal admin "tools" pages.
*	Requires jquery, jquery.cookie, and the following globals to be defined
*	before this script is included:
*
*		var API_URL = "{{api_url}}";
*		var TOOL_NAME = "{{tool_name}}";
*
*=============================================================================================*/

function makeApiCall(request, callback)
{
	$.ajax({
			url: API_URL,
			type: "POST",
			data: JSON.stringify(request),
			dataType: 'json',
			headers: { 'Content-Type': 'application/json' },
			success: function (json)
			{
				if (json.rc == undefined)
				{
					alert(JSON.stringify(json));
					return;
				}

				callback(json);
			},
			error: function()
			{
				alert(arguments[0].responseText);
			}
	});
}

function doOnLogout()
{
	if (!confirm("Are you sure you want to logout?"))
	{
		return;
	}

	makeApiCall({"#request": "User/system_logout", "token": jQuery.cookie("system_token")}, function(rc)
	{
		jQuery.removeCookie("system_token");
		window.location = "/system_login/" + TOOL_NAME;
	});
}
