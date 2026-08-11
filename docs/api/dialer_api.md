# Dialer API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"Dialer/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All Dialer API endpoints require authentication. A valid `#token` field must be included in the request body.

**Flow Overview:**
1. Call `get_twilio_token` to obtain a short-lived voice access token for the client's calling SDK.
2. Call `start_dialer_session` with a list of entity IDs to queue for dialing. This creates a dialer session and returns the first queued item.
3. Place a call for the current item using the voice access token, then call `log_call_result` to record the outcome.
4. Call `get_next_in_queue` to advance to the next item in the session and repeat step 3, until `has_next` is `false` (the session auto-completes when the queue is exhausted).
5. Optionally, call `pause_dialer` / `resume_dialer` to temporarily halt/continue a session, or `end_dialer_session` to finish it early.
6. Call `get_dialer_session_status` at any time to fetch full session progress and a breakdown of call results.
7. Optionally, call `send_sms` at any time to send a standalone SMS text message (e.g. a follow-up after a missed call) — independent of the dialer session/queue.

A user may only have **one active session at a time**. `log_call_result` can also be used independently of a session (standalone calls) by omitting `session_id`.

---

## Voice Calling Setup

### POST Dialer/get_twilio_token
Issues a short-lived access token used by the client's voice calling SDK to place and receive calls.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<voice_access_token>",
        "identity": "<user_identity>",
        "ttl": 3600
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 460 | Twilio credentials are not configured | Voice calling is not configured on the server. |
    | 461 | TwiML app SID is not configured | Voice calling is not fully configured on the server. |

- **Usage & Flows:**
    Call this before placing any call. The returned `token` is valid for `ttl` seconds; request a new one once it expires or is close to expiring.

---

## Dialer Session Management

### POST Dialer/start_dialer_session
Creates a new dialer session with a queue of entities to call, and returns the first item to call.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `entity_ids` | array | Yes | Non-empty array of entity IDs to queue for dialing. |
    | `entity_type` | string | No | Contextual label for the entities being called (e.g. `"lead"`, `"contact"`, `"customer"`). Defaults to `"generic"`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "session_id": 123,
        "total_items": 10,
        "current_index": 0,
        "first_item": {
            "queue_item_id": 1001,
            "entity_id": "entity-abc",
            "item_order": 0
        }
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 462 | entity_ids must be a non-empty array | `entity_ids` is missing, not an array, or empty. |
    | 463 | queue exceeds maximum allowed size | `entity_ids` has more items than the server allows in a single queue. |
    | 464 | a dialer session is already active for this user | The user already has an active session. The response also includes `existing_session_id` with that session's ID. |

- **Usage & Flows:**
    Use this to begin a dialing run over a list of entities. Place a call for `first_item`, then use `get_next_in_queue` / `log_call_result` to progress through the rest of the queue. If a session is already active, either continue using its ID (via `existing_session_id`) or end it first with `end_dialer_session`.

---

### POST Dialer/pause_dialer
Pauses an active dialer session.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `session_id` | integer | Yes | The dialer session ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "session_id": 123,
        "status": "paused"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 465 | dialer session not found | No session exists with this ID for this user. |
    | 466 | dialer session is not active | The session is not currently in an active state (e.g. already paused or completed). |

- **Usage & Flows:**
    Call this when the user needs to temporarily stop working through the queue (e.g. taking a break). Resume with `resume_dialer`.

---

### POST Dialer/resume_dialer
Resumes a paused dialer session.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `session_id` | integer | Yes | The dialer session ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "session_id": 123,
        "status": "active"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 465 | dialer session not found | No session exists with this ID for this user. |
    | 467 | dialer session is not paused | The session is not currently paused. |

- **Usage & Flows:**
    Call this to continue a session that was previously paused with `pause_dialer`. After resuming, continue using `get_next_in_queue` / `log_call_result` as normal.

---

### POST Dialer/end_dialer_session
Ends a dialer session early. Any remaining un-called items in the queue are marked as skipped.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `session_id` | integer | Yes | The dialer session ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "session_id": 123,
        "status": "completed",
        "stats": {
            "total": 10,
            "completed": 7,
            "answered": 4,
            "skipped": 3,
            "avg_duration": 42.5
        }
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 465 | dialer session not found | No session exists with this ID for this user. |
    | 468 | dialer session is already completed | The session was already completed (either manually or by exhausting the queue). |

- **Usage & Flows:**
    Use this when the user wants to stop working through the queue before it's exhausted. A session also completes automatically (without needing this call) once `get_next_in_queue` reaches the end of the queue.

---

### POST Dialer/get_dialer_session_status
Fetches the full status of a dialer session, including a result-breakdown summary and the itemized queue.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `session_id` | integer | Yes | The dialer session ID. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "session": {
            "session_id": 123,
            "status": "active",
            "entity_type": "lead",
            "total_items": 10,
            "current_index": 3,
            "created_on": "2026-01-15 10:00:00",
            "ended_on": null
        },
        "stats": {
            "total": 10,
            "completed": 4,
            "answered": 2,
            "no_answer": 1,
            "voicemail": 1,
            "busy_count": 0,
            "failed": 0,
            "skipped": 0,
            "remaining": 6,
            "avg_duration_sec": 38.2
        },
        "queue_items": [
            {
                "queue_item_id": 1001,
                "entity_id": "entity-abc",
                "item_order": 0,
                "status": "completed",
                "call_result": "answered",
                "duration_sec": 45,
                "called_on": "2026-01-15 10:01:12"
            }
        ]
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 465 | dialer session not found | No session exists with this ID for this user. |

- **Usage & Flows:**
    Use this to poll or display live progress of a session (e.g. a summary dashboard) — status of the session itself, aggregate result counts, and the full itemized queue with each item's outcome.

---

## Queue & Call Logging

### POST Dialer/get_next_in_queue
Advances a dialer session to the next item in its queue.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `session_id` | integer | Yes | The dialer session ID. |

- **Return Values:**

    When there is a next item:
    ```json
    {
        "rc": 0,
        "message": "success",
        "has_next": true,
        "current_index": 4,
        "total_items": 10,
        "remaining": 5,
        "next_item": {
            "queue_item_id": 1005,
            "entity_id": "entity-xyz",
            "item_order": 4
        }
    }
    ```

    When the queue has been exhausted (the session is auto-completed):
    ```json
    {
        "rc": 0,
        "message": "success",
        "has_next": false,
        "session_completed": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 465 | dialer session not found | No session exists with this ID for this user. |
    | 466 | dialer session is not active | The session is paused or already completed. |

- **Usage & Flows:**
    Call this after logging a call result (or when first ready to move on) to fetch the next entity to call. When `has_next` is `false`, the session has been marked completed automatically — call `get_dialer_session_status` for the final summary if needed.

---

### POST Dialer/log_call_result
Records the outcome of a call attempt, whether made as part of an active dialer session or as a standalone call.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `session_id` | integer | No | The dialer session ID. Use `0` (default) for a standalone call not tied to a session. |
    | `entity_id` | string | Yes | The entity ID that was called. |
    | `phone` | string | Yes | The phone number dialed, in E.164 format. |
    | `direction` | string | No | `"outbound"` (default) or `"inbound"`. |
    | `result` | string | Yes | One of: `"answered"`, `"no_answer"`, `"voicemail"`, `"busy"`, `"failed"`. |
    | `duration_sec` | integer | No | Call duration in seconds. Defaults to `0`. |
    | `twilio_sid` | string | No | The call identifier from the voice calling SDK, if available. |
    | `notes` | string | No | Free-text agent notes about the call. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "call_log_id": 5001
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 469 | invalid call result, must be: answered, no_answer, voicemail, busy, failed | `result` is missing or not one of the allowed values. |
    | 470 | invalid direction, must be: outbound or inbound | `direction` is provided but not one of the allowed values. |

- **Usage & Flows:**
    Call this immediately after every call attempt to persist its outcome to the call history. When `session_id` is provided and greater than `0`, the corresponding queue item is also marked as completed with this result. Omit or pass `0` for `session_id` to log a call made outside of any dialer session.

---

## SMS

### POST Dialer/send_sms
Sends a standalone SMS text message. Delegates to the platform's shared `$Sms` module (`system_modules/sms.js`) — **not** the Twilio Voice SDK used for calling.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `phone_number` | string | Yes | Destination phone number, in E.164 format. |
    | `message` | string | Yes | SMS message body text. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 361 | failed to send sms | The SMS provider (e.g. Twilio) failed to send the message, or the client could not be created (`ERR_FAILED_TO_SEND_SMS`). |
    | 362 | invalid sms provider | The `sms` config's `provider` setting is not set to a supported provider (e.g. `"twilio"`) (`ERR_INVALID_SMS_PROVIDER`). |

- **Usage & Flows:**
    Use this to send an ad-hoc SMS to an entity (e.g. a follow-up text after an unanswered call), independent of any dialer session. This endpoint requires the `sms` module/config to be set up separately from `twilio_dialer` (see `platform/config/using_modules.js` and the `sms` config group) — voice calling and SMS use independent Twilio credentials/config.

---

## Configuration

The following server-side settings affect Dialer API behavior:

| Setting | Description |
|---------|-------------|
| Voice calling max queue size | Maximum number of entities allowed in a single `start_dialer_session` call. Exceeding it returns rc `463`. |
| Voice access token lifetime | Duration (in seconds) that a `get_twilio_token` token remains valid, returned as `ttl` in its response. |
