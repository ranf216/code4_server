# 09 — Incident Report Enhancements (Deferred)

**Created:** 2026-10-12
**Module:** `platform/api/report.js`, `platform/funcs/report.js`, `platform/user_modules/report_pdf.js`

Requirements identified while implementing the Report module (Phase 7.2) that are out of scope for the initial build. Design decisions and open follow-up questions are tracked in `docs/issues-questions/report-issues-questions.md`.

---

## ~~1. Dashboard — Incident Reports Section (SDS §4.5.5)~~ ✅ Done

**Requirement:** Dashboard widget with the number of open reports (submitted, under review, changes requested), total reports in the last 2 weeks, "assigned to me" toggle, 5 most recent open reports (title, officer, creation date), "select" and "show all" navigation.

**Status:** ✅ **Implemented (Phase 8.1 Dashboard).**
- [x] Open reports count — submitted, under_review, changes_requested (`Dashboard/get_reports_summary`)
- [x] Total reports in last 14 days
- [x] "Assigned to me" toggle via `scope=my` (filters by `IRP_REVIEWER_USR_ID`)
- [x] 5 most recent open reports with title, officer name, creation date
- [x] Community filter

**Dependencies:** ~~Dashboard module (Phase 8.1).~~ Dashboard module (Phase 8.1 ✅).

---

## 2. Incident Pattern & Trend Analysis (SDS §1.8 item 3)

**Requirement:** Analytics identifying recurring issues, hotspots, escalation patterns and emerging risks across properties, based on reports.

**Current behavior:** Not implemented. Report values are stored as JSON per section (`IRS_VALUES`), keyed by snapshot field ID; system fields (`incident_type`, `incident_location`, `incident_date`) can be extracted from the snapshot for analytics.

**Dependencies:** Analytics infrastructure / Dashboard advanced statistics (SDS §4.5.1.3).

---

## 3. Calls ↔ Reports Cross-Navigation in the Call Module (SDS §2.5.1.1, §3.4.4 note)

**Requirement:** "Each report is listed in the call's detail screen" and the client can open "Reports" filtered by the call.

**Current behavior:** Partially covered — `Report/get_reports_list` supports a `call_id` filter for all roles. `Call/get_call` does not embed the linked reports list or a report count.

**Implementation notes:** Optionally add `report_count` / `reports` (id, title, status) to `Call/get_call`, scoped per role (residents: delivered reports addressed to them only).

---

## 4. Stale Review Lock Auto-Revert

**Requirement (SDS §4.4.7.1):** "If the reviewing manager closes the report without taking action, the status reverts to Submitted."

**Current behavior:** Explicit `Report/release_review` reverts the status. If the manager simply closes the browser, the `$EntityLock` expires after 30 minutes and any other manager can take the report over via `start_review`, but the status remains `under_review` until then.

**Implementation notes:** A cron (Entity Lock Guard pattern) could revert `under_review` reports whose lock expired back to `submitted`, and call `$EntityLock.cleanup()`.

---

## 5. Delete / Discard Draft Reports

**Requirement:** Not specified in the SDS. Officers may need to discard drafts created by mistake.

**Current behavior:** No delete endpoint. Drafts are visible only to the creating officer.

**Implementation notes:** `Report/delete_report` (officer, own drafts only, soft delete via `IRP_DELETED_ON` and cascade to sections/attachments).

---

## 6. PDF Fonts and Non-Latin Characters

**Requirement (SDS §4.12.3):** Fonts Arial / Calibri / Times New Roman.

**Current behavior:** Mapped to pdfkit built-in fonts (`pdf_font` / `pdf_font_bold` attributes in `report_font.json`): Arial and Calibri → Helvetica, Times New Roman → Times. Built-in fonts support WinAnsi characters only.

**Implementation notes:** Embed TTF files via `doc.registerFont()` (licensing to be confirmed) if exact fonts or non-Latin text are required.

---

## ~~7. Report Share / Email Delivery~~ ✅ Resolved — Not Needed

**Requirement (SDS §4.4.7.4):** "Generate the formatted report ... and deliver immediately upon confirmation to the client. (By email? Only notification?)"

**Decision (Report Q14):** Notification-driven delivery (in-app, push and email according to the notification settings) with in-app PDF download (`pdf_url`). No email with the PDF attached.
