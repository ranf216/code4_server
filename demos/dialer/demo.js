/**
 * Dialer Module Demo — wiring script.
 *
 * This file shows exactly how a developer would instantiate DialerModule,
 * provide the required callbacks, and bind it to a UI.
 *
 * All callbacks are wired to the real server-side Dialer API.
 */

(function ()
{
    "use strict";

    // ────────────────────────────────────────
    // Server configuration
    // ────────────────────────────────────────
    var API_BASE_URL = "http://localhost:8081/api";

    // ────────────────────────────────────────
    // DOM references
    // ────────────────────────────────────────
    var $  = function (id) { return document.getElementById(id); };

    var inputApiUrl    = $("input-api-url");
    var inputAuthToken = $("input-auth-token");

    var btnInit        = $("btn-init");
    var btnDestroy     = $("btn-destroy");
    var initBadge      = $("init-badge");

    var inputPhone     = $("input-phone");
    var inputName      = $("input-name");
    var btnCall        = $("btn-call");
    var btnMute        = $("btn-mute");
    var btnHangup      = $("btn-hangup");
    var callBadge      = $("call-badge");
    var callInfo       = $("call-info");
    var callContactName = $("call-contact-name");
    var callPhoneDisplay = $("call-phone-display");
    var callDuration   = $("call-duration");

    var btnStartQueue  = $("btn-start-queue");
    var btnPauseQueue  = $("btn-pause-queue");
    var btnResumeQueue = $("btn-resume-queue");
    var btnSkip        = $("btn-skip");
    var btnStopQueue   = $("btn-stop-queue");
    var queueBadge     = $("queue-badge");
    var queueStats     = $("queue-stats");
    var queueList      = $("queue-list");

    var statTotal      = $("stat-total");
    var statCompleted  = $("stat-completed");
    var statAnswered   = $("stat-answered");
    var statFailed     = $("stat-failed");
    var statSkipped    = $("stat-skipped");
    var statRemaining  = $("stat-remaining");

    var eventLog       = $("event-log");

    // ────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────

    function log(msg)
    {
        var ts = new Date().toLocaleTimeString();
        eventLog.textContent += "[" + ts + "] " + msg + "\n";
        eventLog.scrollTop = eventLog.scrollHeight;
    }

    function formatDuration(sec)
    {
        var m = String(Math.floor(sec / 60)).padStart(2, "0");
        var s = String(sec % 60).padStart(2, "0");
        return m + ":" + s;
    }

    function setBadge(el, state)
    {
        el.className = "badge badge-" + state;
        el.textContent = state.replace("_", " ");
    }

    function getApiUrl()
    {
        return (inputApiUrl.value.trim() || API_BASE_URL).replace(/\/+$/, "");
    }

    function getAuthToken()
    {
        return inputAuthToken.value.trim();
    }

    /**
     * Generic helper for calling the server-side Dialer API.
     * @param {string} method — API method name (e.g. "get_twilio_token")
     * @param {object} [params] — key/value pairs to send
     * @returns {Promise<object>} parsed JSON response
     */
    async function apiCall(method, params)
    {
        var url = getApiUrl();

        var body = params || {};
        body["#request"] = "Dialer/" + method;
        body["#token"] = getAuthToken();

        var resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        var json = await resp.json();

        if (json.rc === undefined)
        {
            log("API ERROR [" + method + "] — unexpected response: " + JSON.stringify(json));
            throw new Error("Unexpected API response");
        }

        if (json.rc !== 0)
        {
            log("API ERROR [" + method + "] rc=" + json.rc + " — " + (json.message || ""));
            throw new Error(json.message || "API call failed (rc=" + json.rc + ")");
        }

        return json;
    }

    // ────────────────────────────────────────
    // Sample contacts for the queue demo
    // ────────────────────────────────────────
    var sampleContacts = [
        { phone_number: "+15551000001", entity_id: 101, name: "Alice Johnson" },
        { phone_number: "+15551000002", entity_id: 102, name: "Bob Smith" },
        { phone_number: "+15551000003", entity_id: 103, name: "Carol White" },
        { phone_number: "+15551000004", entity_id: 104, name: "David Brown" },
        { phone_number: "+15551000005", entity_id: 105, name: "Eve Davis" }
    ];

    // ────────────────────────────────────────
    // Dialer instance & session state
    // ────────────────────────────────────────
    var dialer = null;
    var isInitialized = false;
    var activeSessionId = null;

    // ────────────────────────────────────────
    // Dependency-injected callbacks (wired to server API)
    // ────────────────────────────────────────

    /**
     * Fetch a Twilio capability token from the server.
     */
    async function fetchToken()
    {
        log("fetchToken → requesting token from server…");

        var resp = await apiCall("get_twilio_token");

        log("fetchToken → received token (ttl=" + resp.ttl + "s, identity=" + resp.identity + ")");
        return resp.token;
    }

    /**
     * Log a call result to the server.
     */
    async function logCallResult(callData)
    {
        log(
            "logCallResult → " + callData.result +
            " | phone: " + callData.phone_number +
            " | duration: " + callData.duration_sec + "s" +
            (callData.meta && callData.meta.name ? " | " + callData.meta.name : "")
        );

        try
        {
            await apiCall("log_call_result", {
                session_id:   activeSessionId || 0,
                entity_id:    callData.meta.entity_id || 0,
                phone:        callData.phone_number,
                result:       callData.result,
                duration_sec: callData.duration_sec,
                twilio_sid:   callData.twilio_sid || "",
                notes:        ""
            });

            log("logCallResult → saved to server");
        }
        catch (e)
        {
            log("logCallResult → server error: " + e.message);
        }
    }

    /**
     * Called whenever the call state changes. Update the UI accordingly.
     */
    function onStateChange(state)
    {
        log("stateChange → " + state.callState + (state.isMuted ? " [MUTED]" : ""));

        setBadge(callBadge, state.callState);

        var isActive = state.callState === DialerModule.CallState.CONNECTING
            || state.callState === DialerModule.CallState.RINGING
            || state.callState === DialerModule.CallState.IN_PROGRESS;

        btnCall.disabled    = isActive || !isInitialized;
        btnMute.disabled    = !isActive;
        btnHangup.disabled  = !isActive;
        btnMute.textContent = state.isMuted ? "Unmute" : "Mute";

        if (state.contact)
        {
            callContactName.textContent  = state.contact.meta.name || "Unknown";
            callPhoneDisplay.textContent = state.contact.phone_number;
            callInfo.style.display = "block";
        }

        if (state.callState === DialerModule.CallState.IDLE ||
            state.callState === DialerModule.CallState.DISCONNECTED)
        {
            callDuration.textContent = "00:00";

            if (state.callState === DialerModule.CallState.IDLE && !state.isQueueActive)
            {
                callInfo.style.display = "none";
            }
        }
    }

    /**
     * Called whenever the queue status changes.
     */
    function onQueueUpdate(qs)
    {
        log("queueUpdate → state: " + qs.state + " | " + qs.completed + "/" + qs.total + " completed");

        setBadge(queueBadge, qs.state);
        queueStats.style.display = "flex";

        statTotal.textContent     = qs.total;
        statCompleted.textContent = qs.completed;
        statAnswered.textContent  = qs.answered;
        statFailed.textContent    = qs.failed;
        statSkipped.textContent   = qs.skipped;
        statRemaining.textContent = qs.remaining;

        var isRunning = qs.state === DialerModule.QueueState.RUNNING;
        var isPaused  = qs.state === DialerModule.QueueState.PAUSED;
        var isDone    = qs.state === DialerModule.QueueState.COMPLETED;

        btnStartQueue.disabled  = isRunning || isPaused;
        btnPauseQueue.disabled  = !isRunning;
        btnResumeQueue.disabled = !isPaused;
        btnSkip.disabled        = !(isRunning || isPaused);
        btnStopQueue.disabled   = !(isRunning || isPaused);

        if (isDone)
        {
            btnStartQueue.disabled = false;
            btnPauseQueue.disabled = true;
            btnResumeQueue.disabled = true;
            btnSkip.disabled = true;
            btnStopQueue.disabled = true;

            // End the server-side session when queue completes
            if (activeSessionId)
            {
                endServerSession();
            }
        }

        renderQueueList(qs);
    }

    function renderQueueList(qs)
    {
        // Retrieve queue items from the dialer internals for display
        var items = dialer._queue; // demo-only peek
        queueList.innerHTML = "";

        for (var i = 0; i < items.length; i++)
        {
            var li = document.createElement("li");
            if (i === qs.currentIndex && qs.state !== DialerModule.QueueState.COMPLETED)
            {
                li.className = "active";
            }

            var nameSpan = document.createElement("span");
            nameSpan.textContent = (i + 1) + ". " + (items[i].meta.name || items[i].phone_number);

            var resultSpan = document.createElement("span");
            var displayStatus = items[i].result || items[i].status;
            resultSpan.className = "q-result q-result-" + displayStatus;
            resultSpan.textContent = displayStatus;

            li.appendChild(nameSpan);
            li.appendChild(resultSpan);
            queueList.appendChild(li);
        }
    }

    /**
     * Called on dialer errors.
     */
    function onError(err)
    {
        log("ERROR → type: " + err.type + " | " + (err.error && err.error.message ? err.error.message : JSON.stringify(err.error)));
    }

    /**
     * Called every second during an active call with the current duration.
     */
    function onDuration(sec)
    {
        callDuration.textContent = formatDuration(sec);
    }

    // ────────────────────────────────────────
    // Server-side session helpers
    // ────────────────────────────────────────

    async function startServerSession(entityIds)
    {
        try
        {
            var resp = await apiCall("start_dialer_session", {
                entity_ids:  entityIds,
                entity_type: "demo_contact"
            });

            activeSessionId = resp.session_id;
            log("Server session started → id=" + activeSessionId + " | items=" + resp.total_items);
            return resp;
        }
        catch (e)
        {
            log("Failed to start server session: " + e.message);
            activeSessionId = null;
            return null;
        }
    }

    async function endServerSession()
    {
        if (!activeSessionId)
        {
            return;
        }

        try
        {
            var resp = await apiCall("end_dialer_session", {
                session_id: activeSessionId
            });

            log("Server session ended → id=" + activeSessionId +
                " | completed=" + (resp.stats ? resp.stats.completed : "?") +
                " | answered=" + (resp.stats ? resp.stats.answered : "?"));
        }
        catch (e)
        {
            log("Failed to end server session: " + e.message);
        }

        activeSessionId = null;
    }

    async function pauseServerSession()
    {
        if (!activeSessionId)
        {
            return;
        }

        try
        {
            await apiCall("pause_dialer", { session_id: activeSessionId });
            log("Server session paused → id=" + activeSessionId);
        }
        catch (e)
        {
            log("Failed to pause server session: " + e.message);
        }
    }

    async function resumeServerSession()
    {
        if (!activeSessionId)
        {
            return;
        }

        try
        {
            await apiCall("resume_dialer", { session_id: activeSessionId });
            log("Server session resumed → id=" + activeSessionId);
        }
        catch (e)
        {
            log("Failed to resume server session: " + e.message);
        }
    }

    // ────────────────────────────────────────
    // Create the DialerModule instance
    // ────────────────────────────────────────

    function createDialer()
    {
        return new DialerModule({
            fetchToken:         fetchToken,
            logCallResult:      logCallResult,
            onStateChange:      onStateChange,
            onQueueUpdate:      onQueueUpdate,
            onError:            onError,
            onDuration:         onDuration,
            autoAdvanceDelayMs: 2000,
            maxQueueSize:       200
        });
    }

    // ────────────────────────────────────────
    // Button handlers
    // ────────────────────────────────────────

    btnInit.addEventListener("click", async function ()
    {
        if (!getAuthToken())
        {
            log("Please enter an auth token before initializing.");
            return;
        }

        try
        {
            btnInit.disabled = true;
            log("Initializing dialer…");

            dialer = createDialer();
            await dialer.init();

            isInitialized = true;
            setBadge(initBadge, "running");
            initBadge.textContent = "Ready";
            btnDestroy.disabled    = false;
            btnCall.disabled       = false;
            btnStartQueue.disabled = false;

            log("Dialer initialized and ready.");
        }
        catch (e)
        {
            log("Init failed: " + e.message);
            btnInit.disabled = false;
        }
    });

    btnDestroy.addEventListener("click", async function ()
    {
        if (activeSessionId)
        {
            await endServerSession();
        }

        if (dialer)
        {
            dialer.destroy();
            dialer = null;
        }

        isInitialized = false;
        setBadge(initBadge, "idle");
        initBadge.textContent = "Not Ready";
        btnInit.disabled       = false;
        btnDestroy.disabled    = true;
        btnCall.disabled       = true;
        btnMute.disabled       = true;
        btnHangup.disabled     = true;
        btnStartQueue.disabled = true;
        btnPauseQueue.disabled = true;
        btnResumeQueue.disabled = true;
        btnSkip.disabled       = true;
        btnStopQueue.disabled  = true;
        callInfo.style.display = "none";
        queueStats.style.display = "none";
        queueList.innerHTML    = "";
        setBadge(callBadge, "idle");
        setBadge(queueBadge, "idle");

        log("Dialer destroyed.");
    });

    btnCall.addEventListener("click", function ()
    {
        var phone = inputPhone.value.trim();
        var name  = inputName.value.trim();

        if (!phone)
        {
            log("Please enter a phone number.");
            return;
        }

        dialer.call(phone, { entity_id: 0, name: name || "Unknown" });
    });

    btnMute.addEventListener("click", function ()
    {
        dialer.toggleMute();
    });

    btnHangup.addEventListener("click", function ()
    {
        dialer.hangup();
    });

    btnStartQueue.addEventListener("click", async function ()
    {
        var entityIds = sampleContacts.map(function (c) { return c.entity_id; });

        log("Starting server session for " + sampleContacts.length + " contacts…");
        var session = await startServerSession(entityIds);

        log("Starting bulk dialing queue with " + sampleContacts.length + " contacts…");
        dialer.startQueue(sampleContacts, session ? String(session.session_id) : null);
    });

    btnPauseQueue.addEventListener("click", async function ()
    {
        dialer.pauseQueue();
        await pauseServerSession();
        log("Queue paused.");
    });

    btnResumeQueue.addEventListener("click", async function ()
    {
        dialer.resumeQueue();
        await resumeServerSession();
        log("Queue resumed.");
    });

    btnSkip.addEventListener("click", function ()
    {
        dialer.skipCurrent();
        log("Skipping current contact.");
    });

    btnStopQueue.addEventListener("click", async function ()
    {
        dialer.stopQueue();
        await endServerSession();
        log("Queue stopped.");
    });

})();
