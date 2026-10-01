# POI Module — Issues and Questions

## ~~Q1: Version History Implementation~~ ✅ Resolved

SDS §4.11.2 mentions "Version History – a log of all changes" and §4.11.3 says "Editing the rest of the fields will create a new version of the record." However, `dev_flow.md` does not list a `poi_version` table (unlike `post_order_version` for post orders).

**Resolution:** No dedicated `poi_version` table needed. Full snapshot tables (like `post_order_version`) are reserved for structured, multi-section documents like Post Orders. For POI records, tracking changes via `POI_LAST_UPDATE` and field-level modifications in the system's global audit trail (`change_log` table via DB triggers in `db/triggers_def.js`) is sufficient. Officer NEW/UPDATED badges compare `POI_LAST_UPDATE` against the officer's last view timestamp in `poi_view` (`PVW_VIEWED_ON`).

---

## ~~Q2: Approval Process~~ ✅ Resolved

SDS §4.11.1 asks "Do we need an approval process, or the record published automatically?" and includes "Approved By" and "Approval Date" fields marked as "(Auto)."

**Resolution:** Direct Publish by Admin / Manager (Single-Step / Auto-Approve). Super Admins and local Managers have direct publishing authority. When an authorized admin publishes a POI record, `POI_APPROVED_BY` is automatically populated with the admin's user ID and `POI_APPROVED_ON` is set to `NOW()`. A multi-step supervisor approval queue is omitted to avoid unnecessary administrative latency when flagging high-threat trespassers.

---

## ~~Q3: Supervisor Role Representation~~ ✅ Resolved

SDS §3.13 says "supervisors and officers" can view POI records, but the codebase defines officer as `USER_TYPE_OFFICER = 2` with no distinct supervisor user type. Supervisors appear to be officers with a specific role flag.

**Resolution:** Grant View Access to All Authenticated Admins & Officers (`@acl: [USER_TYPE_ADMIN, USER_TYPE_OFFICER]`). "Supervisor" is an operational role designation stored inside an officer's `OFC_ROLES` JSON array (e.g., `["Supervisor", "Patrol"]`), not a separate platform user type. Since field officers need visibility to identify trespassed individuals on site, all officers in the affected community can view active records. Manager-only fields (e.g., `POI_INTERNAL_NOTES`, legal notice PDFs) are stripped server-side before returning payloads to officers.

---

## ~~Q4: Automatic Expiry & Archiving~~ ✅ Resolved — Implemented

SDS §4.11.5 says "System transitions status automatically on the expiry date" for Trespass Orders and Metro Red Cards.

**Resolution:** Implemented `cron_poi_lifecycle_check.js` daily background cron job.
1. **Daily Execution:** Runs daily at 03:30 via `$Utils.createCron({cronExpression: "30 3 * * *"}, ...)`.
2. **Auto-Expiry:** Queries `poi_record` where `POI_STATUS = 'active'` and `POI_EXPIRY_DATE <= CURRENT_DATE()`, transitions to `'expired'`. Sends `poi_expired` notifications to officers in assigned communities.
3. **Expiry Reminders:** Queries active records with `POI_EXPIRY_DATE` within the configured `renewal_reminder_days` window. Sends `poi_expiring_soon` notifications (with dedup to prevent daily re-sends).
4. **Auto-Archiving:** Queries records with status `'expired'` or `'inactive'` older than `archive_threshold_months` (from `settings:poi`, default: 24 months), transitions to `'archived'`.
5. **PM2 Registration:** Added `code4_cron_poi_lifecycle` to `ecosystem.config.js`.

---

## ~~Q5: Report Encounter (Officer → Incident)~~ ✅ Resolved — Deferred to Phase 7

SDS §3.13.2 describes an officer "Report Encounter" action from the POI detail screen.

**Resolution:** Deferred to Phase 7 (Report Module). Creating formal incident reports from POI screens belongs in Phase 7.1/7.2 (`report_template.js` / `report.js`). In the interim, officers can use `Call/create_call` to issue an emergency/security call referencing the POI Record ID in the description. The `poi_incident` table supports linking POI records to existing `service_call` records.

---

## ~~Q6: PDF Export Library & Watermarking~~ ✅ Resolved — Implemented

SDS §4.11 requires PDF export with watermarking.

**Resolution:** Server-side PDF generation using the platform's existing `$Export.generate()` system with `pdfkit` (already in `package.json`).
1. `POI/export_poi_record` validates admin ACL and checks `settings:poi → pdf_export_enabled`.
2. Renders PDF with mandatory watermark on each page: "CONFIDENTIAL – AUTHORISED USE ONLY", admin name, export date/time.
3. Includes: photos, name, aliases, DOB, physical description, threat level, summary, sites, type-specific fields (dates, authorities, conditions).
4. Excludes: `POI_INTERNAL_NOTES`.
5. Saves generated PDF via `$Export.generate()` which handles file saving and returns `{file_id, file_url}`.
6. Updates `PXP_FILE_NAME` in the `poi_export` audit table.

---

## ~~Q7: Officer Can Create POI via "Report Encounter"?~~ ✅ Resolved

SDS §3.13.2 implies officers can create an encounter-linked incident from the POI screen. However, SDS §4.11 clearly states "Add/edit: Admins and managers only."

**Resolution:** Confirmed: Officers NEVER create, edit, or delete POI records directly. POI registry management is strictly Admin/Manager-only (`@acl: [USER_TYPE_ADMIN]`). The "Report Encounter" is a call/incident creation action, not a POI creation action — deferred to Phase 7.

---

## ~~Q8: Notice Document Upload & File Validation~~ ✅ Resolved

SDS §4.11.4 lists "Scanned Copy of Trespass Notice" as a type-specific field.

**Resolution:** Validate file reference at POI endpoint; enforce file size/type at upload boundary.
1. For Trespass Orders and Metro Red Cards, `notice_document_file_id` / `card_document_file_id` is passed during `create_poi_record` or `update_poi_record`.
2. The POI module verifies the provided file ID exists in the `file` table (via `resolveFileIds()`).
3. File format (PDF, JPG, PNG) and file size (max 20 MB) are validated server-side during upload in `File/upload_file_base64`.

---

### Summary Table

| Item | Topic | Decision | Implementation |
|------|-------|----------|---------------|
| Q1 | Version History | No `poi_version` table; `POI_LAST_UPDATE` + `poi_view` | Already in place |
| Q2 | Approval Process | Single-step auto-approve by Admin | `POI/publish_poi_record` |
| Q3 | Supervisor Access | All Admins & Officers (`@acl`) | Manager-only fields stripped |
| Q4 | Auto-Expiry Cron | Daily cron at 03:30 | `cron_poi_lifecycle_check.js` |
| Q5/Q7 | Report Encounter | Officers read-only; deferred to Phase 7 | `Call/create_call` fallback |
| Q6 | PDF Export | `pdfkit` via `$Export.generate()` with watermark | `POI/export_poi_record` |
| Q8 | File Validation | Validate ID existence; size/MIME at `File` upload | `File/upload_file_base64` |
