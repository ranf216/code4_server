const Admin = require('firebase-admin');
let adminIsInit = false;

module.exports =
{
    __initialize()
    {
        if (!adminIsInit)
        {
            try
            {
                Admin.initializeApp({credential: Admin.credential.cert($Const.CONFIG_PATH + "/" + $Config.get("google_fb_key"))});
                adminIsInit = true;
            }
            catch (e)
            {
                $Logger.logString($Const.LL_ERROR, "Failed to initialize Firebase: " + e);
            }
        }
    },

    sendNotification: function(registrationId, title, text, payload, sound = null)
	{
        if (!adminIsInit)
        {
            $Logger.logString($Const.LL_ERROR, "Firebase not initialized");
            return false;
        }

        if (!$Utils.empty(payload))
        {
            Object.entries(payload).forEach(function(prop)
            {
                let key = prop[0];
                let val = prop[1];

        		if (!$Utils.isString(val))
                {
                    if ($Utils.isObject(val) || Array.isArray(val))
                    {
                        payload[key] = JSON.stringify(val);
                    }
                    else
                    {
                        payload[key] = `${val}`;
                    }
                }
            });
        }

		if (Array.isArray(registrationId))
        {
            registrationId.forEach(regId =>
            {
                this.sendNotification(regId, title, text, payload);
            }, this);

            return true;
		}

        $Logger.logString($Const.LL_DEBUG, "sendNotification(registration_id=" + JSON.stringify(registrationId) +
                                    ", title=" + title + ", text=" + text + ", payload=" + JSON.stringify(payload) + ", sound=" + sound);

        let message =
        {
            token: registrationId,
            notification:
            {
                title: title, 
                body: text, 
//				sound: ($Utils.empty(sound) ? 'default' : sound)
            },

//			content_available: true,
//			priority: "high"
        };

        if (!$Utils.empty(payload))
        {
            message.data = payload;
        }


        let isSuccess;
        let asyncDone = false;

        Admin.messaging().send(message)
            .then((response) => {
                $Logger.queueString($Const.LL_DEBUG, "sendNotification succeeded: " + JSON.stringify(response));
                isSuccess = true;
                asyncDone = true;
            })
            .catch((error) => {
                $Logger.queueString($Const.LL_DEBUG, "sendNotification failed: " + JSON.stringify(error));
                isSuccess = false;
                asyncDone = true;
            });

        require('deasync').loopWhile(function(){return !asyncDone;});

    	$Logger.logQueue();

        return isSuccess;
    }
}