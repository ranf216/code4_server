const https = require('https');

module.exports =
{
	call: function(preset, userMessage, promptVars)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const apiKey = $Config.get("openai", "api_key");
		if ($Utils.empty(apiKey))
		{
			return $ERRS.ERR_AI_SERVICE_UNAVAILABLE;
		}

		const config = $Config.get("openai", preset);
		if ($Utils.empty(config))
		{
			$Logger.logString($Const.LL_ERROR, `OpenAI preset '${preset}' not found in config`);
			return $ERRS.ERR_AI_SERVICE_UNAVAILABLE;
		}

		const maxLength = config.max_text_length || 5000;
		if (userMessage.length > maxLength)
		{
			return $ERRS.ERR_AI_TEXT_TOO_LONG;
		}

		let systemPrompt = config.system_prompt || "";
		if (promptVars)
		{
			for (const key in promptVars)
			{
				systemPrompt = systemPrompt.split(`{${key}}`).join(promptVars[key]);
			}
		}

		const requestBody = JSON.stringify({
			model: config.model || "gpt-4o-mini",
			messages: [
				{role: "system", content: systemPrompt},
				{role: "user", content: userMessage}
			],
			temperature: config.temperature != null ? config.temperature : 0.3,
		});

		const options = {
			hostname: 'api.openai.com',
			port: 443,
			path: '/v1/chat/completions',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
				'Content-Length': Buffer.byteLength(requestBody),
			},
		};

		let asyncDone = false;
		let responseData = null;
		let responseError = null;

		const req = https.request(options, (res) =>
		{
			let body = '';
			res.on('data', (chunk) => { body += chunk; });
			res.on('end', () =>
			{
				try
				{
					const parsed = JSON.parse(body);
					if (res.statusCode !== 200)
					{
						responseError = parsed.error ? parsed.error.message : `HTTP ${res.statusCode}`;
					}
					else if (parsed.choices && parsed.choices.length > 0)
					{
						responseData = parsed.choices[0].message.content.trim();
					}
					else
					{
						responseError = "No response returned";
					}
				}
				catch (e)
				{
					responseError = "Failed to parse response";
				}
				asyncDone = true;
			});
		});

		req.on('error', (e) =>
		{
			responseError = e.message;
			asyncDone = true;
		});

		req.write(requestBody);
		req.end();

		const timeoutMs = $Config.get("openai", "timeout_ms") || 15000;
		setTimeout(() =>
		{
			if (!asyncDone)
			{
				responseError = "Request timeout";
				asyncDone = true;
			}
		}, timeoutMs);

		require('deasync').loopWhile(function() { return !asyncDone; });

		if (responseError)
		{
			$Logger.logString($Const.LL_ERROR, `OpenAI [${preset}] error: ${responseError}`);
			return $Err.errWithInfo("ERR_AI_TRANSLATION_FAILED", responseError);
		}

		vals.result = responseData;

		return {...rc, ...vals};
	},

	translate: function(text, targetLanguage)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const rv = this.call("translation", text, {target_language: targetLanguage});
		if ($Err.isERR(rv))
		{
			return rv;
		}

		vals.translated_text = rv.result;

		return {...rc, ...vals};
	}
};
