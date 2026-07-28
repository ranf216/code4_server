# Dialer — Web Developer Guide (Vue / Angular)

This guide explains, in full implementation detail, how to integrate voice calling ("Dialer") capabilities into a web application built with Vue.js or Angular, using the platform's Dialer API and the reusable `DialerModule` browser controller.

It is written to be usable both by a human developer and by an AI coding assistant implementing this feature from scratch — every step, file, and code sample needed is included.

---

## 1. Architecture Overview

```
┌──────────────────┐        HTTPS/JSON         ┌───────────────────┐
│  Your Web App    │  ───────────────────────▶ │   Dialer API      │
│  (Vue / Angular) │  ◀─────────────────────── │  (backend server) │
└────────┬─────────┘                           └───────────────────┘
         │
         │ voice access token
         ▼
┌────────────────────┐        WebRTC           ┌──────────────────┐
│  Twilio Voice SDK  │  ─────────────────────▶ │  Twilio Cloud /  │
│  (browser, WebRTC) │                         │  PSTN network    │
└────────────────────┘                         └──────────────────┘
```

- Your web app never talks to Twilio's REST APIs directly. It only:
  1. Calls the backend's **Dialer API** to get a voice access token, to start/track dialing sessions, and to log call results.
  2. Uses that token with the **Twilio Voice JS SDK** (WebRTC, runs entirely in the browser) to actually place/receive calls.
- All server-side configuration (Twilio account, TwiML App, phone number) is already set up by the backend team. As a web developer you only need the **Dialer API** and the **Voice SDK**.

---

## 2. Prerequisites

- **HTTPS.** The browser's `getUserMedia` (microphone access) required by WebRTC only works on `https://` origins (or `http://localhost` for local dev).
- **A valid session token (`#token`)** for the logged-in user. All Dialer API endpoints require authentication — obtain this the same way your app already authenticates for other API calls (login endpoint of your platform).
- **Browser support:** Chrome, Firefox, Safari, Edge (modern versions). Voice SDK uses WebRTC.
- **Microphone permission:** the browser will prompt the user for microphone access the first time a call is placed. Make sure your app's UX explains this before the browser prompt appears.

---

## 3. Install Dependencies

### Option A — npm package (recommended for Vue/Angular apps with a bundler)

```bash
npm install @twilio/voice-sdk
```

### Option B — CDN script tag (no bundler / quick prototyping)

```html
<script src="https://sdk.twilio.com/js/voice/releases/2.11.0/twilio.min.js"></script>
```

Either way, you end up with a `Device` class (npm) or a global `Twilio.Device` (CDN) — both expose the same API.

---

## 4. The `DialerModule` Controller

Rather than talking to the Voice SDK directly, use the framework-agnostic `DialerModule` controller. It wraps the Voice SDK, exposes a simple call/queue API, and is dependency-injected with your own API callbacks — so it has **zero knowledge of your backend** beyond the callbacks you give it.

Copy the file into your project (it has no external dependencies and works as a plain ES/UMD module):

- Source: `demos/dialer/dialer-module.js` in this repository.
- Also available already hosted by the backend server at: `/dialer/dialer-module.js`

Place it at, e.g., `src/lib/dialer-module.js` in your Vue/Angular project.

### 4.1 Making the Voice SDK available to `DialerModule`

`DialerModule` expects a **global** `Twilio.Device` class (matching the browser SDK's original distribution style). If you installed the npm package, expose it once during app bootstrap:

```js
// src/main.js (Vue) or src/main.ts (Angular) — run once at app startup
import { Device } from '@twilio/voice-sdk';

window.Twilio = window.Twilio || {};
window.Twilio.Device = Device;
```

If you used the CDN script tag, `window.Twilio.Device` already exists — skip this step.

### 4.2 `DialerModule` API Reference

```js
const dialer = new DialerModule({
    fetchToken:         async () => { /* return a token string */ },
    logCallResult:       async (callData) => { /* persist result */ },
    onStateChange:       (state) => { /* update UI */ },
    onQueueUpdate:       (queueState) => { /* update UI */ },
    onError:             (error) => { /* handle error */ },
    onDuration:          (seconds) => { /* live call timer */ },
    autoAdvanceDelayMs:  2000,   // delay before auto-advancing the queue after a call ends
    maxQueueSize:        200     // client-side guard, mirrors the server's limit
});
```

| Config Option | Required | Description |
|---|---|---|
| `fetchToken` | **Yes** | `async () => string`. Must return a Twilio voice access token — call `Dialer/get_twilio_token` here. |
| `logCallResult` | No | `(callData) => void\|Promise`. Called after every call ends. Persist the result — call `Dialer/log_call_result` here. |
| `onStateChange` | No | `(state) => void`. Fired on every call-state transition (idle, connecting, ringing, in_progress, disconnected, error). |
| `onQueueUpdate` | No | `(queueState) => void`. Fired whenever the bulk-dialing queue's state or progress changes. |
| `onError` | No | `(error) => void`. Fired on device/call/token-refresh/logging errors. |
| `onDuration` | No | `(seconds) => void`. Fired every second while a call is in progress. |
| `autoAdvanceDelayMs` | No | Milliseconds to wait after a call ends before auto-dialing the next queue item. Default `2000`. |
| `maxQueueSize` | No | Client-side cap on queue size (should be `≤` the server's `max_queue_size`, default `200`). |

**Instance methods:**

| Method | Description |
|---|---|
| `await dialer.init()` | Fetches a token and registers the Voice SDK device. Call once before placing any call. |
| `dialer.destroy()` | Tears down the device and cancels any active call/queue. Call on component unmount / logout. |
| `dialer.call(phoneNumber, contactMeta)` | Places a single outbound call. `contactMeta` is any object you want passed back in `callData.meta` (e.g. `{ entity_id, name }`). |
| `dialer.hangup()` | Ends the active call. |
| `dialer.mute()` / `dialer.unmute()` / `dialer.toggleMute()` | Mute controls for the active call. |
| `dialer.sendDigits(digits)` | Sends DTMF tones, e.g. `"1"`, `"123#"`. |
| `dialer.startQueue(contacts, sessionId)` | Starts bulk dialing. `contacts` is `Array<{ phone_number, ...anyMeta }>`. `sessionId` should be the `session_id` from `Dialer/start_dialer_session` (as a string). |
| `dialer.pauseQueue()` / `dialer.resumeQueue()` | Pause/resume the bulk queue (current call, if any, is unaffected by pause). |
| `dialer.skipCurrent()` | Skips the current queue item (hangs up if a call is active) and advances. |
| `dialer.stopQueue()` | Ends the queue entirely; marks remaining pending items as skipped. |
| `dialer.getQueueStatus()` | Returns a snapshot: `{ sessionId, state, currentIndex, total, completed, answered, failed, skipped, remaining, currentContact }`. |
| `dialer.getCallState()` / `dialer.isMuted()` / `dialer.isCallActive()` / `dialer.getCurrentContact()` / `dialer.getCallDuration()` | Read-only getters. |

**State constants:** `DialerModule.CallState` = `IDLE, CONNECTING, RINGING, IN_PROGRESS, DISCONNECTED, ERROR`. `DialerModule.QueueState` = `IDLE, RUNNING, PAUSED, COMPLETED`. `DialerModule.CallResult` = `ANSWERED, NO_ANSWER, VOICEMAIL, BUSY, FAILED, SKIPPED, CANCELLED`.

**`callData` shape passed to `logCallResult`:**
```js
{
    phone_number: "+15551234567",
    meta:         { entity_id: "42", name: "Jane Doe" }, // whatever you passed to dialer.call()/startQueue()
    result:       "answered", // one of DialerModule.CallResult values
    duration_sec: 37,
    twilio_sid:   "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // or null
    timestamp:    "2026-01-15T10:01:12.000Z"
}
```

---

## 5. Dialer API Reference (Summary)

Full reference: `docs/api/dialer_api.md`. All calls are `POST` JSON with `#request: "Dialer/<endpoint>"` and `#token: "<session_token>"`.

| Endpoint | Purpose | Called from |
|---|---|---|
| `get_twilio_token` | Get a voice access token | `fetchToken` callback |
| `start_dialer_session` | Start a bulk-dialing session for a list of entity IDs | Before `dialer.startQueue(...)` |
| `get_next_in_queue` | (Optional — `DialerModule` advances its own local queue; use this only if you need server-side queue tracking independent of the client) | — |
| `log_call_result` | Persist the outcome of a call | `logCallResult` callback |
| `pause_dialer` / `resume_dialer` | Keep server-side session state in sync with `dialer.pauseQueue()` / `dialer.resumeQueue()` | Queue pause/resume button handlers |
| `end_dialer_session` | Finish a session (also call this when the local queue completes) | `onQueueUpdate` when `state === COMPLETED`, or a "stop" button |
| `get_dialer_session_status` | Fetch full session progress/stats (e.g. for a dashboard) | Anywhere you need a live status view |

> **Note:** `DialerModule` manages its own **local** queue state (used for the UI/auto-dial loop) independently from the **server-side** dialer session. You are responsible for keeping them in sync by calling `start_dialer_session` when you call `dialer.startQueue()`, and `end_dialer_session` when the queue finishes or is stopped. See the wiring example below.

---

## 6. Vue 3 Integration (Composition API)

### 6.1 API client helper — `src/api/dialerApi.js`

```js
const API_URL = import.meta.env.VITE_API_URL || "https://your-server.example.com/api";

export async function callDialerApi(method, params, token)
{
    const body = params || {};
    body["#request"] = "Dialer/" + method;
    body["#token"] = token;

    const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const json = await resp.json();

    if (json.rc === undefined)
    {
        throw new Error("Unexpected API response");
    }

    if (json.rc !== 0)
    {
        throw new Error(json.message || ("API call failed (rc=" + json.rc + ")"));
    }

    return json;
}
```

### 6.2 Composable — `src/composables/useDialer.js`

```js
import { ref, reactive, onBeforeUnmount } from "vue";
import DialerModule from "../lib/dialer-module.js";
import { callDialerApi } from "../api/dialerApi.js";

export function useDialer(getAuthToken)
{
    const callState   = ref(DialerModule.CallState.IDLE);
    const isMuted      = ref(false);
    const duration     = ref(0);
    const currentContact = ref(null);
    const queue        = reactive({ state: DialerModule.QueueState.IDLE, total: 0, completed: 0, answered: 0, failed: 0, skipped: 0, remaining: 0 });
    const isReady      = ref(false);
    const lastError    = ref(null);

    let dialer = null;
    let sessionId = null;

    async function fetchToken()
    {
        const resp = await callDialerApi("get_twilio_token", {}, getAuthToken());
        return resp.token;
    }

    async function logCallResult(callData)
    {
        await callDialerApi("log_call_result", {
            session_id:   sessionId || 0,
            entity_id:    callData.meta && callData.meta.entity_id || 0,
            phone:        callData.phone_number,
            result:       callData.result,
            duration_sec: callData.duration_sec,
            twilio_sid:   callData.twilio_sid || "",
            notes:        ""
        }, getAuthToken());
    }

    function onStateChange(state)
    {
        callState.value      = state.callState;
        isMuted.value         = state.isMuted;
        duration.value        = state.duration;
        currentContact.value  = state.contact;
    }

    function onQueueUpdate(qs)
    {
        queue.state     = qs.state;
        queue.total     = qs.total;
        queue.completed = qs.completed;
        queue.answered  = qs.answered;
        queue.failed    = qs.failed;
        queue.skipped   = qs.skipped;
        queue.remaining = qs.remaining;

        if (qs.state === DialerModule.QueueState.COMPLETED && sessionId)
        {
            callDialerApi("end_dialer_session", { session_id: sessionId }, getAuthToken()).catch(() => {});
            sessionId = null;
        }
    }

    function onError(err)
    {
        lastError.value = err;
    }

    function onDuration(sec)
    {
        duration.value = sec;
    }

    async function init()
    {
        dialer = new DialerModule({
            fetchToken, logCallResult, onStateChange, onQueueUpdate, onError, onDuration,
            autoAdvanceDelayMs: 2000,
            maxQueueSize: 200
        });
        await dialer.init();
        isReady.value = true;
    }

    function destroy()
    {
        if (dialer) { dialer.destroy(); dialer = null; }
        isReady.value = false;
    }

    function call(phoneNumber, meta)
    {
        dialer.call(phoneNumber, meta);
    }

    function hangup()      { dialer.hangup(); }
    function toggleMute()  { dialer.toggleMute(); }
    function sendDigits(d) { dialer.sendDigits(d); }

    async function startQueue(contacts)
    {
        const entityIds = contacts.map(c => c.entity_id);
        const resp = await callDialerApi("start_dialer_session", { entity_ids: entityIds, entity_type: "contact" }, getAuthToken());
        sessionId = resp.session_id;
        dialer.startQueue(contacts, String(sessionId));
    }

    async function pauseQueue()
    {
        dialer.pauseQueue();
        if (sessionId) await callDialerApi("pause_dialer", { session_id: sessionId }, getAuthToken());
    }

    async function resumeQueue()
    {
        dialer.resumeQueue();
        if (sessionId) await callDialerApi("resume_dialer", { session_id: sessionId }, getAuthToken());
    }

    function skipCurrent() { dialer.skipCurrent(); }

    async function stopQueue()
    {
        dialer.stopQueue();
        if (sessionId)
        {
            await callDialerApi("end_dialer_session", { session_id: sessionId }, getAuthToken());
            sessionId = null;
        }
    }

    onBeforeUnmount(() => destroy());

    return {
        callState, isMuted, duration, currentContact, queue, isReady, lastError,
        init, destroy, call, hangup, toggleMute, sendDigits,
        startQueue, pauseQueue, resumeQueue, skipCurrent, stopQueue
    };
}
```

### 6.3 Component usage — `src/components/DialerPanel.vue`

```vue
<template>
    <div>
        <button v-if="!isReady" @click="init">Initialize Dialer</button>

        <div v-if="isReady">
            <p>Call state: {{ callState }} | Duration: {{ duration }}s</p>

            <input v-model="phone" placeholder="+15551234567" />
            <button @click="call(phone, { entity_id: 1, name: 'Test' })">Call</button>
            <button @click="hangup">Hang up</button>
            <button @click="toggleMute">{{ isMuted ? 'Unmute' : 'Mute' }}</button>

            <hr />

            <p>Queue: {{ queue.state }} ({{ queue.completed }}/{{ queue.total }})</p>
            <button @click="startQueue(contacts)">Start Queue</button>
            <button @click="pauseQueue">Pause</button>
            <button @click="resumeQueue">Resume</button>
            <button @click="skipCurrent">Skip</button>
            <button @click="stopQueue">Stop</button>
        </div>

        <p v-if="lastError" style="color:red">{{ lastError.type }}: {{ lastError.error?.message }}</p>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useDialer } from "../composables/useDialer.js";
import { useAuthStore } from "../stores/auth.js"; // your existing auth store

const auth = useAuthStore();
const phone = ref("+15551234567");
const contacts = [
    { phone_number: "+15551000001", entity_id: 101, name: "Alice" },
    { phone_number: "+15551000002", entity_id: 102, name: "Bob" }
];

const {
    callState, isMuted, duration, queue, isReady, lastError,
    init, call, hangup, toggleMute,
    startQueue, pauseQueue, resumeQueue, skipCurrent, stopQueue
} = useDialer(() => auth.token);
</script>
```

---

## 7. Angular Integration

### 7.1 Service — `src/app/dialer/dialer.service.ts`

```typescript
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
// @ts-ignore — plain JS UMD module, no type declarations
import DialerModule from '../../lib/dialer-module.js';
import { AuthService } from '../auth/auth.service';

export interface QueueState
{
    state: string;
    total: number;
    completed: number;
    answered: number;
    failed: number;
    skipped: number;
    remaining: number;
}

@Injectable({ providedIn: 'root' })
export class DialerService
{
    private dialer: any = null;
    private sessionId: number | null = null;

    readonly callState$   = new BehaviorSubject<string>('idle');
    readonly isReady$      = new BehaviorSubject<boolean>(false);
    readonly queueState$   = new BehaviorSubject<QueueState>({ state: 'idle', total: 0, completed: 0, answered: 0, failed: 0, skipped: 0, remaining: 0 });
    readonly error$        = new BehaviorSubject<any>(null);

    constructor(private http: HttpClient, private auth: AuthService, private zone: NgZone) {}

    private async callApi(method: string, params: Record<string, any> = {})
    {
        const body: any = { ...params };
        body['#request'] = 'Dialer/' + method;
        body['#token']   = this.auth.getToken();

        const json: any = await firstValueFrom(this.http.post(this.auth.apiUrl, body));

        if (json.rc === undefined)
        {
            throw new Error('Unexpected API response');
        }
        if (json.rc !== 0)
        {
            throw new Error(json.message || `API call failed (rc=${json.rc})`);
        }
        return json;
    }

    async init(): Promise<void>
    {
        this.dialer = new DialerModule({
            fetchToken: async () =>
            {
                const resp = await this.callApi('get_twilio_token');
                return resp.token;
            },
            logCallResult: async (callData: any) =>
            {
                await this.callApi('log_call_result', {
                    session_id:   this.sessionId || 0,
                    entity_id:    (callData.meta && callData.meta.entity_id) || 0,
                    phone:        callData.phone_number,
                    result:       callData.result,
                    duration_sec: callData.duration_sec,
                    twilio_sid:   callData.twilio_sid || '',
                    notes:        ''
                });
            },
            onStateChange: (state: any) => this.zone.run(() => this.callState$.next(state.callState)),
            onQueueUpdate: (qs: any) => this.zone.run(() =>
            {
                this.queueState$.next(qs);
                if (qs.state === DialerModule.QueueState.COMPLETED && this.sessionId)
                {
                    this.callApi('end_dialer_session', { session_id: this.sessionId }).catch(() => {});
                    this.sessionId = null;
                }
            }),
            onError: (err: any) => this.zone.run(() => this.error$.next(err)),
            autoAdvanceDelayMs: 2000,
            maxQueueSize: 200
        });

        await this.dialer.init();
        this.isReady$.next(true);
    }

    destroy(): void
    {
        if (this.dialer) { this.dialer.destroy(); this.dialer = null; }
        this.isReady$.next(false);
    }

    call(phoneNumber: string, meta: any): void { this.dialer.call(phoneNumber, meta); }
    hangup(): void { this.dialer.hangup(); }
    toggleMute(): boolean { return this.dialer.toggleMute(); }
    sendDigits(digits: string): void { this.dialer.sendDigits(digits); }

    async startQueue(contacts: Array<{ phone_number: string; entity_id: number | string }>): Promise<void>
    {
        const entityIds = contacts.map(c => c.entity_id);
        const resp = await this.callApi('start_dialer_session', { entity_ids: entityIds, entity_type: 'contact' });
        this.sessionId = resp.session_id;
        this.dialer.startQueue(contacts, String(this.sessionId));
    }

    async pauseQueue(): Promise<void>
    {
        this.dialer.pauseQueue();
        if (this.sessionId) await this.callApi('pause_dialer', { session_id: this.sessionId });
    }

    async resumeQueue(): Promise<void>
    {
        this.dialer.resumeQueue();
        if (this.sessionId) await this.callApi('resume_dialer', { session_id: this.sessionId });
    }

    skipCurrent(): void { this.dialer.skipCurrent(); }

    async stopQueue(): Promise<void>
    {
        this.dialer.stopQueue();
        if (this.sessionId)
        {
            await this.callApi('end_dialer_session', { session_id: this.sessionId });
            this.sessionId = null;
        }
    }
}
```

### 7.2 Component usage — `src/app/dialer/dialer-panel.component.ts`

```typescript
import { Component, OnDestroy } from '@angular/core';
import { DialerService } from './dialer.service';

@Component({
    selector: 'app-dialer-panel',
    template: `
        <button *ngIf="!(dialer.isReady$ | async)" (click)="dialer.init()">Initialize Dialer</button>

        <div *ngIf="dialer.isReady$ | async">
            <p>Call state: {{ dialer.callState$ | async }}</p>
            <input [(ngModel)]="phone" placeholder="+15551234567" />
            <button (click)="dialer.call(phone, { entity_id: 1, name: 'Test' })">Call</button>
            <button (click)="dialer.hangup()">Hang up</button>
            <button (click)="dialer.toggleMute()">Mute/Unmute</button>

            <p>Queue: {{ (dialer.queueState$ | async)?.state }}</p>
            <button (click)="dialer.startQueue(contacts)">Start Queue</button>
            <button (click)="dialer.pauseQueue()">Pause</button>
            <button (click)="dialer.resumeQueue()">Resume</button>
            <button (click)="dialer.skipCurrent()">Skip</button>
            <button (click)="dialer.stopQueue()">Stop</button>
        </div>
    `
})
export class DialerPanelComponent implements OnDestroy
{
    phone = '+15551234567';
    contacts = [
        { phone_number: '+15551000001', entity_id: 101, name: 'Alice' },
        { phone_number: '+15551000002', entity_id: 102, name: 'Bob' }
    ];

    constructor(public dialer: DialerService) {}

    ngOnDestroy(): void { this.dialer.destroy(); }
}
```

---

## 8. Single Call vs. Bulk Queue

| | Single Call | Bulk Queue |
|---|---|---|
| Trigger | `dialer.call(phone, meta)` | `dialer.startQueue(contacts, sessionId)` |
| Server session | Not required (`session_id: 0` when logging result) | Requires `start_dialer_session` first |
| Auto-advance | N/A | Automatic, after `autoAdvanceDelayMs` following each call |
| Use case | Ad-hoc calls from a contact detail page | Working through a list (e.g. a lead list, follow-up queue) |

---

## 9. Error Handling

- **API errors:** every Dialer API call returns `{ rc, message }`. `rc !== 0` is an error — see `docs/api/dialer_api.md` for the full list of `rc` codes and scenarios (e.g. `464` session already active, `469` invalid call result, etc.). Surface `message` to the user or log it.
- **Voice SDK errors:** surfaced via the `onError` callback with a `{ type, error, contact? }` shape. `type` is one of `"device"`, `"connect"`, `"call"`, `"token_refresh"`, `"log"`.
- **Token expiry:** `DialerModule` automatically refreshes the voice token internally (via your `fetchToken` callback) when Twilio signals it's about to expire — no action needed on your part beyond keeping `fetchToken` working.

---

## 10. Testing Offline (No Real Twilio Account Needed)

For local development/demoing without placing real calls, swap the Voice SDK for the provided mock:

```html
<!-- instead of the real SDK -->
<script src="/dialer/twilio-mock.js"></script>
```

`twilio-mock.js` implements a fake `Twilio.Device` that simulates ringing → accept/no-answer/busy → disconnect with randomized timers, so you can exercise the full UI/queue flow without any backend Twilio configuration. Do **not** ship this in production.

---

## 11. Production Checklist

- [ ] App served over **HTTPS**.
- [ ] Backend `twilio_dialer` config is fully set (Twilio Account SID/Auth Token, API Key, TwiML App SID, caller ID) — this is a backend concern, not yours, but calls will fail with `rc 460/461` if incomplete.
- [ ] User has a valid, non-expired session `#token` before calling `dialer.init()`.
- [ ] Microphone permission UX (explain before prompting).
- [ ] Real `@twilio/voice-sdk` (or CDN `twilio.min.js`) — **not** `twilio-mock.js`.
- [ ] Call `dialer.destroy()` on logout / route away from the calling screen to release the microphone and close the WebRTC connection.
- [ ] Handle `onError` to surface actionable messages to the agent (e.g. mic permission denied, network issues).
