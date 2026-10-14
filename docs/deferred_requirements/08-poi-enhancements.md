# 08 — POI Enhancements (Deferred)

Requirements identified during POI module implementation that are out of scope for the initial build.

---

## ~~1. PDF Export Generation~~ ✅ Implemented

**Source:** SDS §4.11, dev_flow §6.2
**Status:** Fully implemented using the platform's `$Export.generate()` system with `pdfkit`.

### Implementation:
- [x] Uses existing `pdfkit` dependency (already in `package.json`) via `$Export.generate()`
- [x] Generate PDF with: photos (embedded from file storage), name, aliases, DOB, physical description, threat level, summary, sites, dates, type-specific fields
- [x] Watermark on each page: admin name, export date/time, "CONFIDENTIAL – AUTHORISED USE ONLY"
- [x] Internal notes excluded from PDF output
- [x] Generated PDF saved via `$Files.saveFileFromString()`, `PXP_FILE_NAME` populated in `poi_export`
- [x] `export_poi_record` returns `{export_id, file_url}` for download

**Note:** Uses the same `$Export.generate()` infrastructure available to Call Report and Shift Report modules.

---

## ~~2. Automatic Expiry Scheduler~~ ✅ Implemented

**Source:** SDS §4.11.5
**Status:** Fully implemented as `cron_poi_lifecycle_check.js`.

### Implementation:
- [x] Daily cron job at 03:30 (`cron_poi_lifecycle_check.js`) registered in `ecosystem.config.js`
- [x] Auto-expire: transitions active records with `POI_EXPIRY_DATE <= CURRENT_DATE()` to `expired`
- [x] Sends `poi_expired` notifications (in-app + FCM push) to officers in assigned communities
- [x] Expiry reminders: sends `poi_expiring_soon` notification within `renewal_reminder_days` window (dedup: 24-hour cooldown)
- [x] Auto-archive: transitions expired/inactive records older than `archive_threshold_months` to `archived`

---

## ~~3. Report Encounter (Officer → Incident Creation)~~ ✅ Implemented (Phase 7.2)
**Source:** SDS §3.13.2
**Status:** Implemented per Report decision Q3 (option b — direct POI link, `incident_report.IRP_POI_ID`).

### Implementation:
- [x] Officer taps "Report Encounter" on the POI detail screen → `Report/create_report` with `poi_id` (+ optional `latitude`, `longitude`, `location_address`)
- [x] Pre-populates the incident report with:
  - Person name, known aliases and POI Record ID in `incident_description` (editable)
  - Record type as `incident_type`
  - Officer's current GPS location as `incident_location` (parameters, or the officer's latest `gps_log` point)
- [x] The resulting report is linked to the POI record (`IRP_POI_ID`) and returned under "Related Incidents" by `POI/get_poi_record` as `related_reports` (alongside call links in `related_incidents`)
- [x] Depends on: Report module (dev_flow §7.2 ✅)

Open follow-up details (record type display name, call/POI precedence, related-report visibility): `docs/issues-questions/report-issues-questions.md` Q22.

---

## ~~4. Version History and Audit Trail~~ ✅ Resolved — Not Needed

**Source:** SDS §4.11.2, §4.11.3
**Status:** Resolved per architectural decision Q1.

**Decision:** No dedicated `poi_version` table needed. Full snapshot tables are reserved for structured multi-section documents (Post Orders). POI records track changes via:
- `POI_LAST_UPDATE` timestamp for officer NEW/UPDATED badge logic
- `poi_view` (`PVW_VIEWED_ON`) for per-officer view state
- System-level audit trail in `change_log` table (via DB triggers in `db/triggers_def.js`)

---

## 5. Community Deletion Guard
**Source:** Architectural pattern from deferred requirement 05 (assets)
**Status:** Not implemented.

### Requirements:
- [ ] Prevent community deletion while active POI records reference that community via `poi_site`
- [ ] Add check in community delete/archive flow similar to existing active-call safeguards

---

## ~~6. POI Settings Management API~~ — Partially Complete (Core API Done)
**Source:** SDS §5.4.4
**Status:** Core endpoints implemented. Guidance text version notes remain open.

### Implementation:
- [x] `Settings/get_poi_settings` endpoint reads POI settings from `key_value` table (`settings:poi` namespace)
- [x] `Settings/update_poi_settings` endpoint allows admin to update all configuration keys
- [x] Supported keys: `renewal_reminder_days`, `archive_threshold_months`, `pdf_export_enabled`
- [x] Supported keys: `default_poi_guidance`, `default_trespass_guidance`, `default_red_card_guidance`

### Remaining:
- [ ] Include version note explaining guidance text changes (audit logging enhancement when default response instructions are updated)

---

## 7. Bulk Operations
**Source:** SDS §4.11.6 mentions batch actions
**Status:** Not implemented.

### Requirements:
- [ ] Batch inactivation of multiple records
- [ ] Batch archiving of expired/inactive records
- [ ] Batch export (multiple records in one PDF)

---

## 8. POI Dashboard / Summary Statistics
**Source:** SDS §4.11.7
**Status:** Not implemented.

### Requirements:
- [ ] Summary statistics: count by type, status, threat level
- [ ] Expiring-soon count
- [ ] Recently viewed / trending records
- [ ] Community-level breakdown
