/**
 * Twilio Voice SDK Mock — for demo/testing only.
 *
 * Provides a fake Twilio.Device and Twilio.Call that simulate call lifecycle
 * events (ringing → accept → disconnect) with configurable timers.
 * Replace this file with the real twilio.min.js for production use.
 */

(function (root)
{
    "use strict";

    // ── Tiny EventEmitter ──
    function Emitter()
    {
        this._handlers = {};
    }

    Emitter.prototype.on = function (evt, fn)
    {
        if (!this._handlers[evt])
        {
            this._handlers[evt] = [];
        }
        this._handlers[evt].push(fn);
    };

    Emitter.prototype.emit = function (evt)
    {
        var args = Array.prototype.slice.call(arguments, 1);
        var fns = this._handlers[evt] || [];
        for (var i = 0; i < fns.length; i++)
        {
            fns[i].apply(null, args);
        }
    };

    Emitter.prototype.removeAllListeners = function ()
    {
        this._handlers = {};
    };

    // ── Mock Call ──
    function MockCall(params)
    {
        Emitter.call(this);
        this._params   = params || {};
        this._muted    = false;
        this._timers   = [];
        this._disconnected = false;
    }

    MockCall.prototype = Object.create(Emitter.prototype);
    MockCall.prototype.constructor = MockCall;

    MockCall.prototype.mute = function (val)
    {
        this._muted = val;
    };

    MockCall.prototype.sendDigits = function (digits)
    {
        // no-op in mock
    };

    MockCall.prototype.disconnect = function ()
    {
        if (this._disconnected)
        {
            return;
        }
        this._disconnected = true;

        for (var i = 0; i < this._timers.length; i++)
        {
            clearTimeout(this._timers[i]);
        }

        this.emit("disconnect");
    };

    MockCall.prototype._simulateLifecycle = function ()
    {
        var self = this;

        // Simulate random outcomes weighted towards answered
        var rand = Math.random();
        var outcome; // answered, no_answer, busy
        if (rand < 0.70)
        {
            outcome = "answered";
        }
        else if (rand < 0.85)
        {
            outcome = "no_answer";
        }
        else
        {
            outcome = "busy";
        }

        // Ringing after 300ms
        this._timers.push(setTimeout(function ()
        {
            if (self._disconnected) return;
            self.emit("ringing");
        }, 300));

        if (outcome === "answered")
        {
            // Accept after 1.2s
            this._timers.push(setTimeout(function ()
            {
                if (self._disconnected) return;
                self.emit("accept");
            }, 1200));

            // Auto-disconnect after 3–7s (simulate call duration)
            var dur = 3000 + Math.floor(Math.random() * 4000);
            this._timers.push(setTimeout(function ()
            {
                if (self._disconnected) return;
                self.disconnect();
            }, 1200 + dur));
        }
        else if (outcome === "no_answer")
        {
            // Cancel after 4s (no pick up)
            this._timers.push(setTimeout(function ()
            {
                if (self._disconnected) return;
                self._disconnected = true;
                self.emit("cancel");
            }, 4000));
        }
        else
        {
            // Reject after 2s (busy)
            this._timers.push(setTimeout(function ()
            {
                if (self._disconnected) return;
                self._disconnected = true;
                self.emit("reject");
            }, 2000));
        }
    };

    // ── Mock Device ──
    function MockDevice(token, options)
    {
        Emitter.call(this);
        this._token   = token;
        this._options = options || {};
    }

    MockDevice.prototype = Object.create(Emitter.prototype);
    MockDevice.prototype.constructor = MockDevice;

    MockDevice.prototype.register = function ()
    {
        var self = this;
        return new Promise(function (resolve)
        {
            setTimeout(function ()
            {
                self.emit("registered");
                resolve();
            }, 200);
        });
    };

    MockDevice.prototype.connect = function (opts)
    {
        var call = new MockCall(opts ? opts.params : {});
        call._simulateLifecycle();
        return Promise.resolve(call);
    };

    MockDevice.prototype.updateToken = function (newToken)
    {
        this._token = newToken;
    };

    MockDevice.prototype.destroy = function ()
    {
        this.removeAllListeners();
    };

    // ── Expose as global Twilio namespace ──
    root.Twilio = root.Twilio || {};
    root.Twilio.Device = MockDevice;

})(typeof self !== "undefined" ? self : this);
