# Deferred Requirements — Call Module Enhancements

## Status: Deferred to future phases

These features are documented in the SDS but are **not implemented** in the initial Call module (Phase 3). They require additional infrastructure (GPS tracking, WebSocket messaging, external API integrations) that is not yet available.

---

## 1. Location-Based Officer Dispatch (SDS 2.4.1.3.1)

**Requirement:** When an emergency call is created, automatically dispatch the closest available officer based on GPS proximity.

**Current behavior:** Emergency calls notify **all active officers** in the resident's community. First officer to accept gets the call.

**Dependencies:** GPS Tracking module (Phase 2.3), real-time officer location data.

**Implementation notes:** Once GPS tracking is available, add a proximity sort to officer notification and potentially auto-assign the closest officer.

---

## 2. ETA Calculation (SDS 2.4.1.3.1)

**Requirement:** Display estimated time of arrival (ETA) from officer's current location to the caller's location.

**Current behavior:** Not implemented.

**Dependencies:** GPS Tracking module, Google Maps Directions API integration, real-time officer location.

---

## 3. Emergency Call Pass/Relay (SDS 2.4.1.3.1)

**Requirement:** If an officer cannot respond to an emergency, they can "pass" it to the next nearest officer.

**Current behavior:** Not implemented. Officer simply doesn't accept the call; another officer can accept it since status remains `new`.

**Dependencies:** GPS Tracking module for next-nearest-officer determination.

---

## 4. Panic Button Two-Way Communication (SDS 2.4.3)

**Requirement:** After panic button is activated, enable two-way messaging between the user and the management system operator.

**Current behavior:** Panic calls are created and officers are notified, but there is no real-time chat/messaging channel.

**Dependencies:** WebSocket messaging infrastructure, real-time chat module.

---

## 5. Continuous Audio Recording (SDS 2.4.1.3.2)

**Requirement:** During an emergency, the app records audio continuously in the background and uploads it.

**Current behavior:** Single audio file can be attached at call creation. Continuous recording is a client-side feature; server only stores the file reference.

**Dependencies:** Client-side implementation only. Server support is already in place (audio_file_id parameter).

---

## 6. Documents & Transcriptions (SDS 2.4.1.3.2, 4.4.2)

**Requirement:** Attach documents to calls, and provide AI-powered transcription of audio/video attachments.

**Current behavior:** Not implemented. Only images, single audio, and single video are supported.

**Dependencies:** AI transcription service integration, document file type support.

---

## 7. Share/Export Incident (SDS 3.4.1.5, 4.4.3)

**Requirement:** Officers and admins can share/export call details as a formatted report (PDF or similar).

**Current behavior:** Not implemented.

**Dependencies:** Report generation module, PDF export library.

---

## 8. Call Statistics & Advanced Analytics (SDS 4.5.1.1, 4.5.1.3)

**Requirement:** Dashboard showing call statistics: open calls, average response time, calls by category, calls by officer, trends over time.

**Current behavior:** Not implemented. Basic `get_calls` with pagination covers listing.

**Dependencies:** Analytics/dashboard module. Can be built as separate read-only endpoints using aggregate queries.

---

## 9. Out-of-Service Zone Detection (SDS 2.4.1.4)

**Requirement:** Detect when the resident is outside the community's service area and display a warning.

**Current behavior:** Not implemented. Calls are created regardless of location.

**Dependencies:** Community map boundaries (`COM_MAP_BOUNDARIES`), GPS coordinates comparison.

---

## 10. History Retention / Auto-Archive (SDS 2.5.2)

**Requirement:** Resolved service calls automatically move from "open calls" to "history" after 24 hours. History may have a configurable retention period (e.g., 90 days).

**Current behavior:** Filtering is based on status (resolved/canceled = closed). The 24-hour transition is handled client-side by comparing `SVC_RESOLVED_ON` + 24h. No auto-archive cron job exists.

**Dependencies:** Cron job for archival (if server-side filtering is desired). Currently deferred as client-side filtering is sufficient.

---

## 11. Active-Call Checks in Resident/Officer Modules

**Requirement:** Block resident deletion/deactivation/community-move if they have active calls. Block officer deactivation if they have active calls.

**Current behavior:** TODO placeholders exist in resident.js. Now that the `service_call` table exists, these checks can be implemented.

**Implementation:** Query `service_call` WHERE `SVC_RES_USR_ID=?` (or `SVC_OFC_USR_ID=?`) AND `SVC_STATUS IN ('new','accepted')`. If rows exist, return `ERR_RESIDENT_HAS_ACTIVE_CALLS` or `ERR_OFFICER_HAS_ACTIVE_CALLS`.

**Status:** Ready to implement — can be done as a follow-up patch to the resident and officer modules.
