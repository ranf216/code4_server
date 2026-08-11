# Dialer — React Native Developer Guide

This guide explains, in full implementation detail, how to integrate voice calling ("Dialer") capabilities into a React Native mobile app (iOS + Android), using the platform's Dialer API and Twilio's React Native Voice SDK.

It is written to be usable both by a human developer and by an AI coding assistant implementing this feature from scratch — every step, file, and code sample needed is included.

> **Important:** The browser-based `DialerModule` / `@twilio/voice-sdk` used for the web app (see `dialer#dialer~dialer-web-developer-guide.md`) **does not work in React Native** — it relies on browser WebRTC APIs and a `Twilio.Device` global that only exists in a browser JS engine. React Native requires Twilio's dedicated **native** Voice SDK: `@twilio/voice-react-native-sdk`. This guide uses that package. The backend **Dialer API is identical** for both platforms.

---

## 1. Architecture Overview

```
┌─────────────────────┐        HTTPS/JSON         ┌───────────────────┐
│  React Native App   │  ───────────────────────▶ │   Dialer API      │
│  (iOS / Android)    │  ◀─────────────────────── │  (backend server) │
└──────────┬──────────┘                           └───────────────────┘
           │
           │ voice access token
           ▼
┌─────────────────────┐        native SDK         ┌──────────────────┐
│ @twilio/voice-      │  ───────────────────────▶ │  Twilio Cloud /  │
│ react-native-sdk    │                           │  PSTN network    │
└─────────────────────┘                           └──────────────────┘
```

- Your app never talks to Twilio's REST APIs directly. It only:
  1. Calls the backend's **Dialer API** to get a voice access token, start/track dialing sessions, and log call results.
  2. Uses that token with **`@twilio/voice-react-native-sdk`** (native modules on top of Twilio's native iOS/Android Voice SDKs) to place/receive calls.
- All server-side configuration (Twilio account, TwiML App, phone number) is already set up by the backend team.

---

## 2. Prerequisites

- React Native **0.71+** (bare workflow, or Expo with a custom dev client — this SDK requires native modules and does **not** work in the standard Expo Go sandbox).
- iOS: Xcode, CocoaPods, a real device or simulator (simulator cannot use the microphone for real calls — test outbound audio on a real device).
- Android: minimum SDK 24+ recommended.
- A valid session token (`#token`) for the logged-in user, same as any other authenticated call to your backend.

---

## 3. Install Dependencies

```bash
npm install @twilio/voice-react-native-sdk
# iOS only:
cd ios && pod install && cd ..
```

### 3.1 iOS setup

**`ios/<App>/Info.plist`** — add microphone usage description and (if you intend to support calls while the app is backgrounded/incoming calls) the voip background mode:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access to place and receive calls.</string>

<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>voip</string>
</array>
```

If you plan to support **incoming calls** while the app is in the background/killed, you additionally need:
- A **VoIP Services Certificate** from your Apple Developer account, registered with the backend's Twilio configuration (a backend/DevOps task, not a client-code task).
- PushKit integration (`react-native-voip-push-notification` or similar) to receive the incoming-call VoIP push and register it with the Voice SDK.
- This is an advanced/optional capability — **outbound-only calling** (the primary Dialer use case) does not require any push setup.

### 3.2 Android setup

**`android/app/src/main/AndroidManifest.xml`** — add permissions:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

Request `RECORD_AUDIO` at runtime (see §7).

For **incoming calls** on Android you'd integrate Firebase Cloud Messaging (FCM) and register the device token with the Voice SDK — again, optional/advanced, not required for outbound-only dialing.

---

## 4. Dialer API Reference (Summary)

Full reference: `docs/api/dialer_api.md`. All calls are `POST` JSON with `#request: "Dialer/<endpoint>"` and `#token: "<session_token>"`.

| Endpoint | Purpose |
|---|---|
| `get_twilio_token` | Get a voice access token for the Voice SDK. |
| `start_dialer_session` | Start a bulk-dialing session for a list of entity IDs. Returns the first queue item. |
| `get_next_in_queue` | Advance the **server-side** queue to the next item and fetch it. |
| `log_call_result` | Persist the outcome of a call attempt (session-based or standalone). |
| `pause_dialer` / `resume_dialer` | Pause/resume a session. |
| `end_dialer_session` | Finish a session early (or after the queue is exhausted); returns final stats. |
| `get_dialer_session_status` | Fetch full session progress/stats and the itemized queue. |
| `send_sms` | Send a standalone SMS (`phone_number`, `message`) via the platform's shared `$Sms` module — independent of any dialer session/queue. |

> Unlike the web `DialerModule` (which tracks the dialing queue purely client-side), this guide's React Native implementation advances the queue via the **server** (`get_next_in_queue`) since there is no shared, pre-built RN queue controller — this keeps a single source of truth for session progress across app restarts/background kills, which matters more on mobile.

---

## 5. API Client Helper

**`src/api/dialerApi.ts`**

```typescript
const API_URL = 'https://your-server.example.com/api';

export async function callDialerApi<T = any>(
    method: string,
    params: Record<string, any>,
    token: string
): Promise<T>
{
    const body: Record<string, any> = { ...params };
    body['#request'] = 'Dialer/' + method;
    body['#token']   = token;

    const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const json = await resp.json();

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
```

---

## 6. Voice SDK Concepts (`@twilio/voice-react-native-sdk`)

| Concept | Description |
|---|---|
| `Voice` | Top-level SDK instance. Created once (usually a singleton). Used to place outbound calls (`voice.connect(...)`) and listen for incoming calls (`Voice.Event.CallInvite`). |
| `Call` | Represents an in-progress call (returned by `voice.connect()`, or accepted from a `CallInvite`). Emits lifecycle events. |
| `Call.Event` | `'connected'`, `'ringing'`, `'reconnecting'`, `'reconnected'`, `'disconnected'`, `'connectFailure'`, `'qualityWarningsChanged'`. |
| `Voice.Event` | `'registered'`, `'unregistered'`, `'error'`, `'callInvite'`, `'callInviteAccepted'`, `'callInviteRejected'`. |
| Access token | Same JWT format returned by `Dialer/get_twilio_token` — used identically to the web SDK. |

> Exact event names/API surface can vary slightly between SDK versions — always cross-check against the installed `@twilio/voice-react-native-sdk` version's own README/type definitions. The flow described below (connect → listen for `connected`/`disconnected`/`connectFailure` → log result) is stable across versions.

---

## 7. Permissions Helper

**`src/dialer/permissions.ts`**

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureMicrophonePermission(): Promise<boolean>
{
    if (Platform.OS !== 'android')
    {
        // iOS: the system prompt is triggered automatically on first mic access,
        // driven by the NSMicrophoneUsageDescription entry in Info.plist.
        return true;
    }

    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
            title: 'Microphone Permission',
            message: 'This app needs microphone access to place calls.',
            buttonPositive: 'OK'
        }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
}
```

---

## 8. `useDialer` Hook

**`src/dialer/useDialer.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { Voice, Call } from '@twilio/voice-react-native-sdk';
import { callDialerApi } from '../api/dialerApi';
import { ensureMicrophonePermission } from './permissions';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'in_progress' | 'disconnected' | 'error';

export interface QueueItem
{
    queue_item_id: number;
    entity_id: string;
    item_order: number;
}

export function useDialer(getToken: () => string)
{
    const voiceRef        = useRef<Voice | null>(null);
    const activeCallRef   = useRef<Call | null>(null);
    const sessionIdRef     = useRef<number | null>(null);
    const callStartRef     = useRef<number | null>(null);
    const currentEntityRef = useRef<{ entity_id: string; phone: string } | null>(null);

    const [isReady, setIsReady]      = useState(false);
    const [callState, setCallState]   = useState<CallState>('idle');
    const [duration, setDuration]     = useState(0);
    const [error, setError]           = useState<unknown>(null);
    const [queueItem, setQueueItem]   = useState<QueueItem | null>(null);
    const [queueDone, setQueueDone]   = useState(false);

    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchToken = useCallback(async () =>
    {
        const resp = await callDialerApi('get_twilio_token', {}, getToken());
        return resp.token as string;
    }, [getToken]);

    const init = useCallback(async () =>
    {
        const hasMic = await ensureMicrophonePermission();
        if (!hasMic)
        {
            throw new Error('Microphone permission denied');
        }

        const token = await fetchToken();
        const voice = new Voice();

        voice.on(Voice.Event.Error, (err: unknown) => setError(err));

        voiceRef.current = voice;
        // Registration is only required if you plan to receive incoming calls / push
        // notifications. For outbound-only dialing, holding a token per-call is enough,
        // but registering also lets you get proactive token-expiry handling on some SDK
        // versions. If you skip registration, simply refetch a token before each connect().
        try { await voice.register(token); } catch (e) { /* optional; ignore if unsupported for outbound-only use */ }

        setIsReady(true);
    }, [fetchToken]);

    const destroy = useCallback(() =>
    {
        stopDurationTimer();
        if (activeCallRef.current)
        {
            activeCallRef.current.disconnect();
            activeCallRef.current = null;
        }
        if (voiceRef.current)
        {
            voiceRef.current.unregister().catch(() => {});
            voiceRef.current = null;
        }
        setIsReady(false);
        setCallState('idle');
    }, []);

    function startDurationTimer()
    {
        stopDurationTimer();
        callStartRef.current = Date.now();
        durationTimerRef.current = setInterval(() =>
        {
            setDuration(Math.floor((Date.now() - (callStartRef.current || Date.now())) / 1000));
        }, 1000);
    }

    function stopDurationTimer()
    {
        if (durationTimerRef.current)
        {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
        }
        callStartRef.current = null;
        setDuration(0);
    }

    async function logResult(result: string, twilioSid: string | null)
    {
        const dur = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0;
        const entity = currentEntityRef.current;

        try
        {
            await callDialerApi('log_call_result', {
                session_id:   sessionIdRef.current || 0,
                entity_id:    entity?.entity_id || '0',
                phone:        entity?.phone || '',
                result,
                duration_sec: dur,
                twilio_sid:   twilioSid || '',
                notes:        ''
            }, getToken());
        }
        catch (e)
        {
            setError(e);
        }
    }

    const bindCallEvents = useCallback((call: Call) =>
    {
        call.on(Call.Event.Ringing, () => setCallState('ringing'));

        call.on(Call.Event.Connected, () =>
        {
            setCallState('in_progress');
            startDurationTimer();
        });

        call.on(Call.Event.Disconnected, async () =>
        {
            const wasConnected = callStartRef.current !== null;
            stopDurationTimer();
            setCallState('disconnected');

            await logResult(wasConnected ? 'answered' : 'no_answer', call.getSid?.() ?? null);

            activeCallRef.current = null;
            setCallState('idle');
        });

        call.on(Call.Event.ConnectFailure, async (err: unknown) =>
        {
            setError(err);
            stopDurationTimer();
            await logResult('failed', null);
            activeCallRef.current = null;
            setCallState('idle');
        });
    }, []);

    /** Place a single outbound call. */
    const call = useCallback(async (phone: string, entityId: string) =>
    {
        if (activeCallRef.current)
        {
            throw new Error('A call is already active.');
        }

        currentEntityRef.current = { entity_id: entityId, phone };
        setCallState('connecting');

        // Refresh the token right before connecting to avoid using a stale one.
        const token = await fetchToken();

        const call = await voiceRef.current!.connect(token, { params: { To: phone } });
        activeCallRef.current = call;
        bindCallEvents(call);
    }, [fetchToken, bindCallEvents]);

    const hangup = useCallback(() =>
    {
        activeCallRef.current?.disconnect();
    }, []);

    const mute = useCallback((muted: boolean) =>
    {
        activeCallRef.current?.mute(muted);
    }, []);

    const sendDigits = useCallback((digits: string) =>
    {
        activeCallRef.current?.sendDigits(digits);
    }, []);

    // ── Server-driven queue (bulk dialing) ──

    const startSession = useCallback(async (entityIds: Array<string | number>, entityType = 'contact') =>
    {
        const resp = await callDialerApi('start_dialer_session', { entity_ids: entityIds, entity_type: entityType }, getToken());
        sessionIdRef.current = resp.session_id;
        setQueueDone(false);
        setQueueItem(resp.first_item);
        return resp;
    }, [getToken]);

    const advanceQueue = useCallback(async () =>
    {
        if (!sessionIdRef.current) return null;

        const resp = await callDialerApi('get_next_in_queue', { session_id: sessionIdRef.current }, getToken());
        if (!resp.has_next)
        {
            setQueueDone(true);
            setQueueItem(null);
            sessionIdRef.current = null;
            return null;
        }

        setQueueItem(resp.next_item);
        return resp.next_item;
    }, [getToken]);

    const pauseSession = useCallback(async () =>
    {
        if (sessionIdRef.current) await callDialerApi('pause_dialer', { session_id: sessionIdRef.current }, getToken());
    }, [getToken]);

    const resumeSession = useCallback(async () =>
    {
        if (sessionIdRef.current) await callDialerApi('resume_dialer', { session_id: sessionIdRef.current }, getToken());
    }, [getToken]);

    const endSession = useCallback(async () =>
    {
        if (!sessionIdRef.current) return null;
        const resp = await callDialerApi('end_dialer_session', { session_id: sessionIdRef.current }, getToken());
        sessionIdRef.current = null;
        setQueueItem(null);
        setQueueDone(true);
        return resp;
    }, [getToken]);

    const getSessionStatus = useCallback(async () =>
    {
        if (!sessionIdRef.current) return null;
        return callDialerApi('get_dialer_session_status', { session_id: sessionIdRef.current }, getToken());
    }, [getToken]);

    useEffect(() => () => destroy(), [destroy]);

    return {
        isReady, callState, duration, error, queueItem, queueDone,
        init, destroy, call, hangup, mute, sendDigits,
        startSession, advanceQueue, pauseSession, resumeSession, endSession, getSessionStatus
    };
}
```

---

## 9. Example Screen

**`src/dialer/DialerScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { useDialer } from './useDialer';
import { useAuth } from '../auth/useAuth'; // your existing auth hook, provides current session token

const CONTACTS = [
    { entity_id: '101', phone_number: '+15551000001', name: 'Alice Johnson' },
    { entity_id: '102', phone_number: '+15551000002', name: 'Bob Smith' },
    { entity_id: '103', phone_number: '+15551000003', name: 'Carol White' }
];

export function DialerScreen()
{
    const { token } = useAuth();
    const dialer = useDialer(() => token);

    const [phone, setPhone] = useState('+15551234567');

    return (
        <View style={{ padding: 16 }}>
            {!dialer.isReady && <Button title="Initialize Dialer" onPress={() => dialer.init()} />}

            {dialer.isReady && (
                <>
                    <Text>Call state: {dialer.callState} | Duration: {dialer.duration}s</Text>

                    <TextInput value={phone} onChangeText={setPhone} placeholder="+15551234567" style={{ borderWidth: 1, marginVertical: 8, padding: 8 }} />
                    <Button title="Call" onPress={() => dialer.call(phone, '0')} />
                    <Button title="Hang up" onPress={() => dialer.hangup()} />

                    <View style={{ height: 24 }} />
                    <Text>Bulk Queue</Text>
                    <Button
                        title="Start Queue"
                        onPress={async () =>
                        {
                            const entityIds = CONTACTS.map(c => c.entity_id);
                            await dialer.startSession(entityIds, 'contact');
                            const item = dialer.queueItem;
                            if (item)
                            {
                                const contact = CONTACTS.find(c => c.entity_id === item.entity_id);
                                if (contact) await dialer.call(contact.phone_number, contact.entity_id);
                            }
                        }}
                    />

                    <Button
                        title="Next in Queue"
                        onPress={async () =>
                        {
                            const item = await dialer.advanceQueue();
                            if (item)
                            {
                                const contact = CONTACTS.find(c => c.entity_id === item.entity_id);
                                if (contact) await dialer.call(contact.phone_number, contact.entity_id);
                            }
                        }}
                    />

                    <Button title="Pause" onPress={() => dialer.pauseSession()} />
                    <Button title="Resume" onPress={() => dialer.resumeSession()} />
                    <Button title="End Session" onPress={() => dialer.endSession()} />

                    {dialer.queueDone && <Text>Queue completed.</Text>}
                </>
            )}

            {dialer.error != null && <Text style={{ color: 'red' }}>{String(dialer.error)}</Text>}
        </View>
    );
}
```

> This example advances the queue manually via a button for clarity. In production, call `dialer.advanceQueue()` automatically from the `Call.Event.Disconnected`/`ConnectFailure` handlers (inside `useDialer`, after `logResult` completes) to replicate the web `DialerModule`'s auto-advance behavior — add a short delay (e.g. `setTimeout`, mirroring the web guide's `autoAdvanceDelayMs`) before doing so.

---

## 10. Sending SMS

`Dialer/send_sms` does not use `@twilio/voice-react-native-sdk` at all — it's a plain backend call. Use it wherever appropriate (e.g. a "Text" button next to "Call", or automatically after a missed-call outcome):

```typescript
import { callDialerApi } from '../api/dialerApi';

async function sendFollowUpSms(phone: string, token: string)
{
    await callDialerApi('send_sms', {
        phone_number: phone,
        message: 'Sorry we missed you — please call us back at your convenience.'
    }, token);
}
```

No native setup, permissions, or Voice SDK initialization required beyond having a valid session token.

---

## 11. Single Call vs. Bulk Queue

| | Single Call | Bulk Queue |
|---|---|---|
| Trigger | `dialer.call(phone, entityId)` | `dialer.startSession(entityIds)` then `dialer.call(...)` per item, advancing with `dialer.advanceQueue()` |
| Server session | Not required (`session_id: 0` when logging) | Required — session and queue position live on the server |
| Auto-advance | N/A | Implement in the `Disconnected`/`ConnectFailure` handlers as noted above |
| Resilience | N/A | Because the queue position lives server-side, the app can call `get_dialer_session_status` after a restart/crash to resume exactly where it left off |

---

## 12. Error Handling

- **API errors:** every Dialer API call returns `{ rc, message }`. See `docs/api/dialer_api.md` for the full `rc` reference (e.g. `464` session already active, `465` session not found, `469`/`470` invalid result/direction).
- **Voice SDK errors:** surfaced via `Voice.Event.Error` and `Call.Event.ConnectFailure`. Common causes: expired/invalid token, no network, microphone permission denied, no answer/busy handled as normal call outcomes (not SDK errors).
- **Token expiry:** this guide refetches a fresh token immediately before every `connect()` call (see `call()` in the hook) rather than relying on token auto-refresh, since long-lived registration/refresh behavior varies by SDK version — this is the simplest, most robust approach for outbound-only dialing.

---

## 13. Testing

- Use a **real device** — simulators/emulators have limited or no microphone/audio routing support for WebRTC-based calls.
- For UI/flow testing without placing real calls, mock the `useDialer` hook's `call`/`advanceQueue` functions to simulate state transitions (`connecting` → `ringing` → `in_progress` → `disconnected`) on timers, mirroring `demos/dialer/twilio-mock.js`'s approach for the web app.

---

## 14. Production Checklist

- [ ] Real device testing on both iOS and Android for audio quality/permissions.
- [ ] `NSMicrophoneUsageDescription` (iOS) and `RECORD_AUDIO` (Android) permission handling in place and tested (including the "permission denied" path).
- [ ] Backend `twilio_dialer` config fully set (backend concern — calls fail with `rc 460/461` otherwise).
- [ ] Valid, non-expired session `#token` before calling `dialer.init()`.
- [ ] `dialer.destroy()` called on logout / screen unmount to release the microphone and native call resources.
- [ ] Decide whether incoming-call support (VoIP push / FCM) is in scope; if not, skip all push-related native setup — outbound-only dialing does not need it.
- [ ] Verify behavior when the app is backgrounded mid-call on both platforms (iOS `audio`/`voip` background modes, Android foreground service if applicable).
