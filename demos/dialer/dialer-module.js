/**
 * DialerModule — A reusable, project-agnostic browser dialer built on Twilio Voice SDK.
 *
 * Usage:
 *   const dialer = new DialerModule({
 *       fetchToken: async () => { ... return tokenString; },
 *       logCallResult: async (callData) => { ... },
 *       onStateChange: (state) => { ... },
 *       onQueueUpdate: (queueState) => { ... },
 *       onError: (error) => { ... },
 *       autoAdvanceDelayMs: 2000,
 *       maxQueueSize: 200
 *   });
 *   await dialer.init();
 *   dialer.call('+15551234567', { entity_id: '42', name: 'John Doe' });
 *
 * All backend interaction is abstracted through callbacks passed via the config
 * object, making this module fully decoupled from any domain logic.
 */

(function (root, factory)
{
    if (typeof module === "object" && module.exports)
    {
        module.exports = factory();
    }
    else
    {
        root.DialerModule = factory();
    }
}(typeof self !== "undefined" ? self : this, function ()
{
    "use strict";

    // ── Call state constants ──
    var CallState = Object.freeze({
        IDLE:         "idle",
        CONNECTING:   "connecting",
        RINGING:      "ringing",
        IN_PROGRESS:  "in_progress",
        DISCONNECTED: "disconnected",
        ERROR:        "error"
    });

    // ── Queue state constants ──
    var QueueState = Object.freeze({
        IDLE:      "idle",
        RUNNING:   "running",
        PAUSED:    "paused",
        COMPLETED: "completed"
    });

    // ── Call result constants ──
    var CallResult = Object.freeze({
        ANSWERED:   "answered",
        NO_ANSWER:  "no_answer",
        VOICEMAIL:  "voicemail",
        BUSY:       "busy",
        FAILED:     "failed",
        SKIPPED:    "skipped",
        CANCELLED:  "cancelled"
    });

    // ── Helpers ──
    function noop() {}

    function now()
    {
        return Date.now();
    }

    function validateConfig(cfg)
    {
        if (typeof cfg.fetchToken !== "function")
        {
            throw new Error("DialerModule: config.fetchToken must be an async function that returns a Twilio token string.");
        }
    }

    // ── DialerModule constructor ──
    function DialerModule(config)
    {
        if (!(this instanceof DialerModule))
        {
            return new DialerModule(config);
        }

        config = config || {};
        validateConfig(config);

        // Callbacks (dependency-injected)
        this._fetchToken     = config.fetchToken;
        this._logCallResult  = config.logCallResult  || noop;
        this._onStateChange  = config.onStateChange  || noop;
        this._onQueueUpdate  = config.onQueueUpdate  || noop;
        this._onError        = config.onError        || noop;
        this._onDuration     = config.onDuration     || noop;

        // Settings
        this._autoAdvanceDelayMs = config.autoAdvanceDelayMs || 2000;
        this._maxQueueSize       = config.maxQueueSize       || 200;

        // Internal state
        this._device       = null;
        this._activeCall   = null;
        this._callState    = CallState.IDLE;
        this._isMuted      = false;
        this._callStartedAt = null;
        this._durationTimer = null;
        this._currentContact = null;

        // Queue state
        this._queue        = [];
        this._queueIndex   = -1;
        this._queueState   = QueueState.IDLE;
        this._queueSessionId = null;
        this._advanceTimer = null;
        this._queueStats   = { total: 0, completed: 0, answered: 0, failed: 0, skipped: 0 };
    }

    // ── Static references ──
    DialerModule.CallState  = CallState;
    DialerModule.QueueState = QueueState;
    DialerModule.CallResult = CallResult;

    // ── Prototype ──
    var proto = DialerModule.prototype;

    // ────────────────────────────────────────
    // Initialization
    // ────────────────────────────────────────

    /**
     * Initialize the Twilio Device with a capability token.
     * Must be called before making any calls.
     * @returns {Promise<void>}
     */
    proto.init = async function ()
    {
        var self = this;

        if (typeof Twilio === "undefined" || typeof Twilio.Device === "undefined")
        {
            throw new Error("DialerModule: Twilio Voice SDK not loaded. Include twilio.min.js before initializing.");
        }

        var token = await this._fetchToken();

        this._device = new Twilio.Device(token, {
            logLevel: "warn",
            codecPreferences: ["opus", "pcmu"]
        });

        this._device.on("registered", function ()
        {
            self._emitState(CallState.IDLE);
        });

        this._device.on("error", function (err)
        {
            self._onError({ type: "device", error: err });
        });

        this._device.on("tokenWillExpire", async function ()
        {
            try
            {
                var newToken = await self._fetchToken();
                self._device.updateToken(newToken);
            }
            catch (e)
            {
                self._onError({ type: "token_refresh", error: e });
            }
        });

        await this._device.register();
    };

    /**
     * Destroy the Twilio Device and clean up all state.
     */
    proto.destroy = function ()
    {
        this._stopDurationTimer();
        this._clearAdvanceTimer();

        if (this._activeCall)
        {
            this._activeCall.disconnect();
            this._activeCall = null;
        }

        if (this._device)
        {
            this._device.destroy();
            this._device = null;
        }

        this._callState  = CallState.IDLE;
        this._queueState = QueueState.IDLE;
        this._queue      = [];
        this._queueIndex = -1;
    };

    // ────────────────────────────────────────
    // Single Call
    // ────────────────────────────────────────

    /**
     * Place a call to a phone number.
     * @param {string} phoneNumber — E.164 formatted phone number
     * @param {object} [contactMeta] — Optional metadata (entity_id, name, etc.)
     * @returns {Promise<void>}
     */
    proto.call = async function (phoneNumber, contactMeta)
    {
        if (!this._device)
        {
            throw new Error("DialerModule: Not initialized. Call init() first.");
        }

        if (this._activeCall)
        {
            throw new Error("DialerModule: A call is already active. Hang up first.");
        }

        this._currentContact = {
            phone_number: phoneNumber,
            meta: contactMeta || {}
        };

        this._isMuted = false;
        this._emitState(CallState.CONNECTING);

        var params = { To: phoneNumber };

        // Allow passing extra connect params via metadata
        if (contactMeta && contactMeta.connectParams)
        {
            var extra = contactMeta.connectParams;
            for (var key in extra)
            {
                if (extra.hasOwnProperty(key))
                {
                    params[key] = extra[key];
                }
            }
        }

        var self = this;

        try
        {
            var call = await this._device.connect({ params: params });
            this._activeCall = call;
            this._bindCallEvents(call);
        }
        catch (err)
        {
            this._emitState(CallState.ERROR);
            this._onError({ type: "connect", error: err, contact: this._currentContact });
            this._finalizeCall(CallResult.FAILED);
        }
    };

    /**
     * Hang up the active call.
     */
    proto.hangup = function ()
    {
        if (this._activeCall)
        {
            this._activeCall.disconnect();
        }
    };

    /**
     * Mute the active call.
     */
    proto.mute = function ()
    {
        if (this._activeCall)
        {
            this._activeCall.mute(true);
            this._isMuted = true;
            this._emitState(this._callState); // re-emit with updated mute
        }
    };

    /**
     * Unmute the active call.
     */
    proto.unmute = function ()
    {
        if (this._activeCall)
        {
            this._activeCall.mute(false);
            this._isMuted = false;
            this._emitState(this._callState);
        }
    };

    /**
     * Toggle mute on the active call.
     * @returns {boolean} New mute state
     */
    proto.toggleMute = function ()
    {
        if (this._isMuted)
        {
            this.unmute();
        }
        else
        {
            this.mute();
        }
        return this._isMuted;
    };

    /**
     * Send DTMF tones during an active call.
     * @param {string} digits — e.g. "1", "123#"
     */
    proto.sendDigits = function (digits)
    {
        if (this._activeCall)
        {
            this._activeCall.sendDigits(digits);
        }
    };

    // ────────────────────────────────────────
    // Queue / Bulk Dialing
    // ────────────────────────────────────────

    /**
     * Start a bulk dialing queue.
     * @param {Array<object>} contacts — Array of contact objects.
     *   Each must have at minimum: { phone_number: string }
     *   Optionally: { entity_id, name, ... } (any metadata you wish)
     * @param {string} [sessionId] — Optional external session ID for correlation
     */
    proto.startQueue = function (contacts, sessionId)
    {
        if (!Array.isArray(contacts) || contacts.length === 0)
        {
            throw new Error("DialerModule: contacts must be a non-empty array.");
        }

        if (contacts.length > this._maxQueueSize)
        {
            throw new Error("DialerModule: Queue exceeds max size of " + this._maxQueueSize + ".");
        }

        this._queue = contacts.map(function (c, i)
        {
            return {
                phone_number: c.phone_number,
                meta: c,
                order: i,
                status: "pending",
                result: null,
                duration: 0
            };
        });

        this._queueIndex    = 0;
        this._queueSessionId = sessionId || ("qs_" + now());
        this._queueStats    = { total: contacts.length, completed: 0, answered: 0, failed: 0, skipped: 0 };
        this._queueState    = QueueState.RUNNING;

        this._emitQueueUpdate();
        this._dialCurrentQueueItem();
    };

    /**
     * Pause the queue. The current call (if any) continues, but auto-advance stops.
     */
    proto.pauseQueue = function ()
    {
        if (this._queueState === QueueState.RUNNING)
        {
            this._queueState = QueueState.PAUSED;
            this._clearAdvanceTimer();
            this._emitQueueUpdate();
        }
    };

    /**
     * Resume a paused queue. If no active call, advances to next contact.
     */
    proto.resumeQueue = function ()
    {
        if (this._queueState === QueueState.PAUSED)
        {
            this._queueState = QueueState.RUNNING;
            this._emitQueueUpdate();

            if (!this._activeCall)
            {
                this._advanceQueue();
            }
        }
    };

    /**
     * Stop (end) the queue entirely. Active call is disconnected.
     */
    proto.stopQueue = function ()
    {
        this._clearAdvanceTimer();

        if (this._activeCall)
        {
            this._activeCall.disconnect();
        }

        // Mark remaining items as skipped
        for (var i = this._queueIndex; i < this._queue.length; i++)
        {
            if (this._queue[i].status === "pending")
            {
                this._queue[i].status = "skipped";
                this._queue[i].result = CallResult.CANCELLED;
                this._queueStats.skipped++;
                this._queueStats.completed++;
            }
        }

        this._queueState = QueueState.COMPLETED;
        this._emitQueueUpdate();
    };

    /**
     * Skip the current queued contact. If a call is active it is hung up,
     * and the queue advances.
     */
    proto.skipCurrent = function ()
    {
        if (this._queueState !== QueueState.RUNNING && this._queueState !== QueueState.PAUSED)
        {
            return;
        }

        var item = this._queue[this._queueIndex];
        if (item && item.status === "calling")
        {
            item.status = "skipped";
            item.result = CallResult.SKIPPED;
            this._queueStats.skipped++;
            this._queueStats.completed++;
        }

        if (this._activeCall)
        {
            // Disconnect triggers _onCallDisconnect which will advance queue
            this._skipRequested = true;
            this._activeCall.disconnect();
        }
        else if (this._queueState === QueueState.RUNNING)
        {
            this._advanceQueue();
        }
    };

    /**
     * Get current queue status snapshot.
     * @returns {object}
     */
    proto.getQueueStatus = function ()
    {
        return {
            sessionId:    this._queueSessionId,
            state:        this._queueState,
            currentIndex: this._queueIndex,
            total:        this._queueStats.total,
            completed:    this._queueStats.completed,
            answered:     this._queueStats.answered,
            failed:       this._queueStats.failed,
            skipped:      this._queueStats.skipped,
            remaining:    this._queueStats.total - this._queueStats.completed,
            currentContact: this._queueIndex >= 0 && this._queueIndex < this._queue.length
                ? this._queue[this._queueIndex].meta
                : null
        };
    };

    // ────────────────────────────────────────
    // Read-only getters
    // ────────────────────────────────────────

    proto.getCallState = function ()
    {
        return this._callState;
    };

    proto.isMuted = function ()
    {
        return this._isMuted;
    };

    proto.isCallActive = function ()
    {
        return this._activeCall !== null;
    };

    proto.getCurrentContact = function ()
    {
        return this._currentContact;
    };

    proto.getCallDuration = function ()
    {
        if (!this._callStartedAt)
        {
            return 0;
        }
        return Math.floor((now() - this._callStartedAt) / 1000);
    };

    // ────────────────────────────────────────
    // Internal — Call event binding
    // ────────────────────────────────────────

    proto._bindCallEvents = function (call)
    {
        var self = this;

        call.on("ringing", function ()
        {
            self._emitState(CallState.RINGING);
        });

        call.on("accept", function ()
        {
            self._callStartedAt = now();
            self._startDurationTimer();
            self._emitState(CallState.IN_PROGRESS);
        });

        call.on("disconnect", function ()
        {
            self._onCallDisconnect(CallResult.ANSWERED);
        });

        call.on("cancel", function ()
        {
            self._onCallDisconnect(CallResult.NO_ANSWER);
        });

        call.on("reject", function ()
        {
            self._onCallDisconnect(CallResult.BUSY);
        });

        call.on("error", function (err)
        {
            self._onError({ type: "call", error: err, contact: self._currentContact });
            self._onCallDisconnect(CallResult.FAILED);
        });
    };

    proto._onCallDisconnect = function (result)
    {
        // Guard: if _activeCall is already null we already handled this disconnect
        if (!this._activeCall)
        {
            return;
        }

        var duration = this.getCallDuration();
        this._stopDurationTimer();

        // If the call never connected (ringing -> disconnect), mark as no_answer
        if (result === CallResult.ANSWERED && !this._callStartedAt)
        {
            result = CallResult.NO_ANSWER;
        }

        // If a skip was requested, the queue item was already handled
        var wasSkipped = this._skipRequested;
        this._skipRequested = false;

        var callData = {
            phone_number: this._currentContact ? this._currentContact.phone_number : null,
            meta:         this._currentContact ? this._currentContact.meta : {},
            result:       result,
            duration_sec: duration,
            twilio_sid:   this._activeCall.parameters ? this._activeCall.parameters.CallSid : null,
            timestamp:    new Date().toISOString()
        };

        // Log the call result (fire-and-forget)
        try
        {
            this._logCallResult(callData);
        }
        catch (e)
        {
            this._onError({ type: "log", error: e });
        }

        this._activeCall    = null;
        this._callStartedAt = null;
        this._isMuted       = false;

        this._emitState(CallState.DISCONNECTED);

        // Queue handling
        if (this._queueState === QueueState.RUNNING || this._queueState === QueueState.PAUSED)
        {
            if (!wasSkipped)
            {
                this._updateQueueItem(result, duration);
            }

            if (this._queueState === QueueState.RUNNING)
            {
                this._scheduleAdvance();
            }
        }
        else
        {
            // After a brief moment, set back to idle for non-queue calls
            var self = this;
            setTimeout(function ()
            {
                if (!self._activeCall)
                {
                    self._emitState(CallState.IDLE);
                }
            }, 500);
        }
    };

    // ────────────────────────────────────────
    // Internal — Queue operations
    // ────────────────────────────────────────

    proto._dialCurrentQueueItem = function ()
    {
        if (this._queueIndex >= this._queue.length)
        {
            this._queueState = QueueState.COMPLETED;
            this._emitQueueUpdate();
            return;
        }

        var item = this._queue[this._queueIndex];
        item.status = "calling";
        this._emitQueueUpdate();

        this.call(item.phone_number, item.meta);
    };

    proto._updateQueueItem = function (result, duration)
    {
        var item = this._queue[this._queueIndex];
        if (item)
        {
            item.status   = "completed";
            item.result   = result;
            item.duration = duration;

            this._queueStats.completed++;
            if (result === CallResult.ANSWERED)
            {
                this._queueStats.answered++;
            }
            else if (result === CallResult.FAILED)
            {
                this._queueStats.failed++;
            }
        }
    };

    proto._scheduleAdvance = function ()
    {
        var self = this;
        this._clearAdvanceTimer();

        this._advanceTimer = setTimeout(function ()
        {
            self._advanceQueue();
        }, this._autoAdvanceDelayMs);
    };

    proto._advanceQueue = function ()
    {
        this._queueIndex++;

        if (this._queueIndex >= this._queue.length)
        {
            this._queueState = QueueState.COMPLETED;
            this._emitQueueUpdate();
            return;
        }

        this._emitQueueUpdate();
        this._dialCurrentQueueItem();
    };

    proto._clearAdvanceTimer = function ()
    {
        if (this._advanceTimer)
        {
            clearTimeout(this._advanceTimer);
            this._advanceTimer = null;
        }
    };

    // ────────────────────────────────────────
    // Internal — Duration timer
    // ────────────────────────────────────────

    proto._startDurationTimer = function ()
    {
        var self = this;
        this._stopDurationTimer();

        this._durationTimer = setInterval(function ()
        {
            self._onDuration(self.getCallDuration());
        }, 1000);
    };

    proto._stopDurationTimer = function ()
    {
        if (this._durationTimer)
        {
            clearInterval(this._durationTimer);
            this._durationTimer = null;
        }
    };

    // ────────────────────────────────────────
    // Internal — State emitters
    // ────────────────────────────────────────

    proto._emitState = function (state)
    {
        this._callState = state;

        this._onStateChange({
            callState:      state,
            isMuted:        this._isMuted,
            contact:        this._currentContact,
            duration:       this.getCallDuration(),
            isQueueActive:  this._queueState === QueueState.RUNNING || this._queueState === QueueState.PAUSED
        });
    };

    proto._emitQueueUpdate = function ()
    {
        this._onQueueUpdate(this.getQueueStatus());
    };

    // ── Return constructor ──
    return DialerModule;

}));
