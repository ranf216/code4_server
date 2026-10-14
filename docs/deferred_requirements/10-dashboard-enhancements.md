# 10 — Dashboard & Analytics Enhancements (Deferred)

**Created:** 2026-10-13
**Module:** `platform/api/dashboard.js`, `platform/funcs/dashboard.js`

Requirements identified while implementing the Dashboard module (Phase 8.1) that are out of scope for the initial build.

---

## 1. Advanced Call Statistics & Trend Analysis (SDS §4.5.1.3)

**Requirement:** "Calls Pattern & Trend Analysis page" — analytics identifying recurring issues, hotspots, escalation patterns, and emerging risks across properties.

**Current behavior:** Not implemented. The basic call statistics (response time, handling time, counts by category/status/priority, false emergencies) are available via `Dashboard/get_calls_statistics`.

**Dependencies:** Analytics infrastructure, potentially charting/visualization support, and finalization of capabilities with the tech team (SDS note: "Capabilities should be finalized with the tech team").

**Implementation notes:** Could be a separate `get_calls_analytics` endpoint returning daily/weekly/monthly aggregates for trend charts, plus per-officer workload statistics (`calls by officer`).

---

## 2. Calls by Officer Workload (SDS §4.5.1.1 implied)

**Requirement:** Dashboard statistic showing call counts and response metrics per officer.

**Current behavior:** Not implemented. The `get_calls_statistics` endpoint provides aggregate counts but does not break down by assigned officer.

**Dependencies:** None — data is available in `service_call.SVC_OFC_USR_ID`.

**Implementation notes:** Add an optional `group_by_officer` flag or a separate endpoint that returns per-officer counts, average response times, and workload distribution.

---

## 3. Calls List / Real-Time Alerts Table (SDS §4.5.1.2)

**Requirement:** Dashboard section with a real-time alerts/notifications table showing new emergency calls, new service calls, call accepted events, canceled calls, and dislike reactions — each leading to the call details.

**Current behavior:** Not implemented. The `get_calls_statistics` endpoint returns 5 recent open calls but not a real-time event stream or notifications table.

**Dependencies:** WebSocket or server-sent events infrastructure for real-time updates. The notification module covers push notifications, but not a dashboard-embedded alerts feed.

---

## 4. Overall Information Section (SDS §4.5.3)

**Requirement:** "To be completed after finalizing functionality" — additional dashboard information beyond active calls, open tasks, and incident reports.

**Current behavior:** The `get_overview` endpoint returns aggregate counts (active calls, open tasks, open reports, active communities, active officers). Additional "overall info" items are TBD per SDS.

**Dependencies:** Finalization of requirements with stakeholders.

---

## 5. Live Tracking Section (SDS §4.5.4)

**Requirement:** Dashboard button opening a map page with real-time GPS tracking of officers, patrols, assets, and emergency calls. Includes officer name selection, filters (officers/on-duty/calls/assets), color-coded map markers, and configurable refresh interval.

**Current behavior:** Not implemented in the Dashboard module. The Tracking module (Phase 5.3) provides GPS data and officer location endpoints, but there is no dashboard-integrated map view.

**Dependencies:** Tracking module (Phase 5.3 ✅), map rendering (client-side), asset location data.

**Implementation notes:** This is primarily a client-side feature. The server already provides `Tracking/get_community_officers_location` which could power the map. A dedicated dashboard endpoint may be needed for combined officer + call + asset overlays.

---

## 6. Calls Totals Popup Graph (SDS §4.5.1)

**Requirement:** "A button for Totals" showing a popup with a graph of totals — selection by status, showing number of calls for each call type.

**Current behavior:** The data is available via `Dashboard/get_calls_statistics` (`calls_by_status`, `calls_by_category`). The popup graph visualization is a client-side feature.

**Dependencies:** Client-side charting library.

**Implementation notes:** No additional server endpoint needed — the data is already returned by `get_calls_statistics`.

---

## 7. Tasks Totals Popup Graph (SDS §4.5.2)

**Requirement:** "A button for Totals" showing a popup with a graph of totals — selection by status, showing number of tasks for each task type.

**Current behavior:** The data is available via `Dashboard/get_tasks_summary` (`tasks_by_status`, `tasks_by_type`). The popup graph visualization is a client-side feature.

**Dependencies:** Client-side charting library.

**Implementation notes:** No additional server endpoint needed — the data is already returned by `get_tasks_summary`.

---

## 8. Reports "All Statuses" Toggle (SDS §4.5.5)

**Requirement:** "5 recent open reports, with an option to change to all statuses" — toggle to see recent reports across all statuses, not just open ones.

**Current behavior:** `Dashboard/get_reports_summary` returns only open reports (submitted, under_review, changes_requested). There is no toggle for "all statuses" mode.

**Dependencies:** None — minor enhancement.

**Implementation notes:** Add an optional `include_closed` or `status_filter` parameter to `get_reports_summary` that, when set, includes approved/delivered/draft reports in the recent list and adjusts the count accordingly.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/dashboard.js` | API endpoint definitions |
| `backend/platform/funcs/dashboard.js` | Business logic implementation |
| `docs/sds.md` §4.5 | Dashboard SDS requirements |
| `docs/deferred_requirements/03-call-enhancements.md` §8 | Call statistics (partially implemented) |
| `docs/deferred_requirements/04-task-enhancements.md` §4 | Task dashboard (fully implemented) |
| `docs/deferred_requirements/09-report-enhancements.md` §1 | Report dashboard (fully implemented) |
