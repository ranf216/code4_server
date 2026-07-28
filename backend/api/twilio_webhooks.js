/**
 * Twilio Voice Webhooks
 *
 * Handles incoming webhook requests from Twilio when a call is initiated
 * via the Twilio Voice SDK (browser client).
 *
 * The TwiML App in the Twilio console must have its Voice Request URL
 * pointed to: https://{your-server}/webhooks/twilio/voice
 */
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

module.exports =
{
    /**
     * POST /webhooks/twilio/voice
     *
     * Called by Twilio when the browser SDK initiates an outbound call via
     * device.connect({ params: { To: '+1...' } }).
     *
     * Responds with TwiML that dials the destination number using the
     * configured caller ID.
     */
    voice: function (req, res)
    {
        const twiml = new VoiceResponse();

        const to = req.body.To;
        const callerId = $Config.get("twilio_dialer", "caller_id");

        if (to)
        {
            // If the To param looks like a phone number, dial it
            if (/^[\d\+\-\(\) ]+$/.test(to))
            {
                const dial = twiml.dial({ callerId: callerId });
                dial.number(to);
            }
            else
            {
                // Otherwise treat it as a Twilio Client identity (browser-to-browser)
                const dial = twiml.dial({ callerId: callerId });
                dial.client(to);
            }
        }
        else
        {
            twiml.say("No destination number was provided.");
        }

        res.type("text/xml");
        res.send(twiml.toString());
    },

    /**
     * POST /webhooks/twilio/status
     *
     * Optional status callback. Twilio sends call status updates here
     * (initiated, ringing, answered, completed) if configured on the
     * TwiML App or on the <Dial> verb.
     *
     * For now we just log the event. In the future this can update
     * call_log records with Twilio-reported duration and status.
     */
    status: function (req, res)
    {
        const callSid     = req.body.CallSid;
        const callStatus  = req.body.CallStatus;
        const callDuration = req.body.CallDuration || 0;

        $Logger.logString($Const.LL_DEBUG,
            `Twilio status callback: SID=${callSid} status=${callStatus} duration=${callDuration}s`);

        res.sendStatus(200);
    }
};
