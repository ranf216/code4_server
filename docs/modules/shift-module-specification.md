# Phase 5.1 — Shift Management & Scheduling: Technical Specification

**Version:** 1.0
**Last Updated:** 2026-09-10
**Module:** `platform/api/shift.js`, `platform/funcs/shift.js`
**SDS Reference:** Section 4.7 — Shift Management & Officer Allocation

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Data Items & Enumerations](#2-data-items--enumerations)
3. [Error Codes](#3-error-codes)
4. [Configuration & Settings](#4-configuration--settings)
5. [Shift Status Lifecycle](#5-shift-status-lifecycle)
6. [Core Business Logic](#6-core-business-logic)
7. [Recurring Shifts](#7-recurring-shifts)
8. [Allocation Validation Engine](#8-allocation-validation-engine)
9. [Check-In / Check-Out & Hours Tracking](#9-check-in--check-out--hours-tracking)
10. [Background Cron Jobs](#10-background-cron-jobs)
11. [Notifications](#11-notifications)
12. [Cross-Module Integration](#12-cross-module-integration)
13. [Deferred Requirements](#13-deferred-requirements)
14. [File Inventory](#14-file-inventory)

---

## 1. Database Schema

### 1.1 `shift_series` (Prefix: `SFS_`)

Stores recurring shift template metadata. One series record generates many `shift` instances.

```sql
CREATE TABLE `shift_series` (
  `SFS_ID`                   bigint unsigned NOT NULL AUTO_INCREMENT,
  `SFS_COM_ID`               bigint unsigned NOT NULL    COMMENT 'Community this series belongs to',
  `SFS_RECURRENCE_PATTERN`   varchar(30)     NOT NULL    COMMENT 'daily, specific_days, every_x_days',
  `SFS_REPEAT_ON`            json            DEFAULT NULL COMMENT 'Array of day numbers for specific_days (0=Sun..6=Sat)',
  `SFS_INTERVAL_DAYS`        int unsigned    DEFAULT NULL COMMENT 'Interval for every_x_days pattern',
  `SFS_END_TYPE`             varchar(20)     NOT NULL    COMMENT 'end_date, occurrences, no_end',
  `SFS_END_DATE`             date            DEFAULT NULL COMMENT 'End date when end_type=end_date',
  `SFS_OCCURRENCES`          int unsigned    DEFAULT NULL COMMENT 'Number of occurrences when end_type=occurrences',
  `SFS_START_TIME`           time            NOT NULL    COMMENT 'Shift start time (24h)',
  `SFS_END_TIME`             time            NOT NULL    COMMENT 'Shift end time (24h)',
  `SFS_IS_OVERNIGHT`         tinyint unsigned NOT NULL DEFAULT '0' COMMENT '1 if shift crosses midnight',
  `SFS_NOTES`                varchar(500)    DEFAULT NULL,
  `SFS_CREATED_BY`           varchar(128)    NOT NULL,
  `SFS_CREATED_ON`           datetime        NOT NULL,
  `SFS_LAST_UPDATE`          datetime        DEFAULT NULL,
  `SFS_DELETED_ON`           datetime        DEFAULT NULL,
  PRIMARY KEY (`SFS_ID`),
  KEY `IX_SFS_COM_ID` (`SFS_COM_ID`),
  CONSTRAINT `FK_SFS_COM_ID`      FOREIGN KEY (`SFS_COM_ID`)      REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_SFS_CREATED_BY`  FOREIGN KEY (`SFS_CREATED_BY`)  REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Notes:** Insert-only in the current implementation. No UPDATE operations exist yet. Audit trail triggers are therefore not defined for this table (per Rule 1 of `audit_trail.md`).

### 1.2 `shift` (Prefix: `SFT_`)

Individual shift instances. Each shift belongs to one community, and optionally to one series.

```sql
CREATE TABLE `shift` (
  `SFT_ID`            bigint unsigned  NOT NULL AUTO_INCREMENT,
  `SFT_COM_ID`        bigint unsigned  NOT NULL    COMMENT 'Community this shift belongs to',
  `SFT_SERIES_ID`     bigint unsigned  DEFAULT NULL COMMENT 'FK to shift_series for recurring shifts',
  `SFT_DATE`          date             NOT NULL    COMMENT 'Calendar date of the shift',
  `SFT_START_TIME`    time             NOT NULL    COMMENT 'Shift start time (24h)',
  `SFT_END_TIME`      time             NOT NULL    COMMENT 'Shift end time (24h)',
  `SFT_IS_OVERNIGHT`  tinyint unsigned NOT NULL DEFAULT '0' COMMENT '1 if shift end time is next day',
  `SFT_STATUS`        varchar(20)      NOT NULL DEFAULT 'draft'
                                                   COMMENT 'draft, published, active, completed, cancelled',
  `SFT_NOTES`         varchar(500)     DEFAULT NULL COMMENT 'Free text visible to allocated officers',
  `SFT_PUBLISHED_ON`  datetime         DEFAULT NULL,
  `SFT_PUBLISHED_BY`  varchar(128)     DEFAULT NULL,
  `SFT_CANCELLED_ON`  datetime         DEFAULT NULL,
  `SFT_CANCELLED_BY`  varchar(128)     DEFAULT NULL,
  `SFT_CREATED_BY`    varchar(128)     NOT NULL,
  `SFT_CREATED_ON`    datetime         NOT NULL,
  `SFT_LAST_UPDATE`   datetime         DEFAULT NULL,
  `SFT_DELETED_ON`    datetime         DEFAULT NULL,
  PRIMARY KEY (`SFT_ID`),
  KEY `IX_SFT_COM_ID`      (`SFT_COM_ID`),
  KEY `IX_SFT_DATE`        (`SFT_DATE`),
  KEY `IX_SFT_STATUS`      (`SFT_STATUS`),
  KEY `IX_SFT_SERIES_ID`   (`SFT_SERIES_ID`),
  KEY `IX_SFT_CREATED_ON`  (`SFT_CREATED_ON`),
  CONSTRAINT `FK_SFT_COM_ID`      FOREIGN KEY (`SFT_COM_ID`)    REFERENCES `community` (`COM_ID`),
  CONSTRAINT `FK_SFT_SERIES_ID`   FOREIGN KEY (`SFT_SERIES_ID`) REFERENCES `shift_series` (`SFS_ID`),
  CONSTRAINT `FK_SFT_CREATED_BY`  FOREIGN KEY (`SFT_CREATED_BY`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Indexes optimized for:** Calendar range queries (`IX_SFT_DATE`), status filtering (`IX_SFT_STATUS`), community scoping (`IX_SFT_COM_ID`), series membership (`IX_SFT_SERIES_ID`).

### 1.3 `shift_officer` (Prefix: `SFO_`)

Many-to-many allocation of officers to shifts. Uses soft deletion.

```sql
CREATE TABLE `shift_officer` (
  `SFO_ID`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `SFO_SFT_ID`      bigint unsigned NOT NULL    COMMENT 'FK to shift',
  `SFO_OFC_USR_ID`   varchar(128)    NOT NULL    COMMENT 'Officer user ID',
  `SFO_CREATED_ON`   datetime        NOT NULL,
  `SFO_DELETED_ON`   datetime        DEFAULT NULL,
  PRIMARY KEY (`SFO_ID`),
  UNIQUE KEY `UQ_SFO_SHIFT_OFFICER` (`SFO_SFT_ID`, `SFO_OFC_USR_ID`),
  KEY `IX_SFO_OFC_USR_ID` (`SFO_OFC_USR_ID`),
  CONSTRAINT `FK_SFO_SFT_ID`      FOREIGN KEY (`SFO_SFT_ID`)     REFERENCES `shift` (`SFT_ID`),
  CONSTRAINT `FK_SFO_OFC_USR_ID`  FOREIGN KEY (`SFO_OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design notes:** The `UNIQUE KEY` prevents duplicate active allocations. Soft-deleted records (`SFO_DELETED_ON IS NOT NULL`) are excluded from all queries. Re-allocation after removal inserts a new row.

### 1.4 `shift_post` (Prefix: `SHP_`)

Officer-post assignments within a shift. An officer must be allocated to the shift before a post can be assigned.

```sql
CREATE TABLE `shift_post` (
  `SHP_ID`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `SHP_SFT_ID`      bigint unsigned NOT NULL    COMMENT 'FK to shift',
  `SHP_OFC_USR_ID`   varchar(128)    NOT NULL    COMMENT 'Officer user ID',
  `SHP_PST_ID`       bigint unsigned NOT NULL    COMMENT 'FK to post',
  `SHP_CREATED_ON`   datetime        NOT NULL,
  `SHP_DELETED_ON`   datetime        DEFAULT NULL,
  PRIMARY KEY (`SHP_ID`),
  KEY `IX_SHP_SFT_ID`      (`SHP_SFT_ID`),
  KEY `IX_SHP_OFC_USR_ID`  (`SHP_OFC_USR_ID`),
  KEY `IX_SHP_PST_ID`      (`SHP_PST_ID`),
  CONSTRAINT `FK_SHP_SFT_ID`      FOREIGN KEY (`SHP_SFT_ID`)     REFERENCES `shift` (`SFT_ID`),
  CONSTRAINT `FK_SHP_OFC_USR_ID`  FOREIGN KEY (`SHP_OFC_USR_ID`) REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_SHP_PST_ID`      FOREIGN KEY (`SHP_PST_ID`)     REFERENCES `post` (`PST_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Note:** The prefix `SHP_` (not `SFP_`) was chosen to match the pre-existing reference in `asset.js` which queries `SHP_PST_ID` (see decision R5).

### 1.5 `shift_checkin` (Prefix: `SFC_`)

Officer check-in/check-out audit records. Immutable once created (no `SFC_DELETED_ON` column) — check-in records serve as the audit trail and must not be deleted (decision R2).

```sql
CREATE TABLE `shift_checkin` (
  `SFC_ID`             bigint unsigned NOT NULL AUTO_INCREMENT,
  `SFC_SFT_ID`         bigint unsigned NOT NULL    COMMENT 'FK to shift',
  `SFC_OFC_USR_ID`      varchar(128)    NOT NULL    COMMENT 'Officer user ID',
  `SFC_CHECK_IN_ON`     datetime        NOT NULL,
  `SFC_CHECK_OUT_ON`    datetime        DEFAULT NULL,
  `SFC_TOTAL_HOURS`     decimal(6,2)    DEFAULT NULL COMMENT 'Total hours calculated at check-out',
  `SFC_AUTO_CHECKOUT`   tinyint(1)      NOT NULL DEFAULT '0'
                                                    COMMENT '1 if auto-closed by cron or manager removal',
  `SFC_NOTES`           varchar(500)    DEFAULT NULL COMMENT 'System or manual notes on check-in record',
  `SFC_CREATED_ON`      datetime        NOT NULL,
  PRIMARY KEY (`SFC_ID`),
  KEY `IX_SFC_SFT_ID`      (`SFC_SFT_ID`),
  KEY `IX_SFC_OFC_USR_ID`  (`SFC_OFC_USR_ID`),
  CONSTRAINT `FK_SFC_SFT_ID`      FOREIGN KEY (`SFC_SFT_ID`)     REFERENCES `shift` (`SFT_ID`),
  CONSTRAINT `FK_SFC_OFC_USR_ID`  FOREIGN KEY (`SFC_OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 2. Data Items & Enumerations

All enumeration values are registered via `$DataItems.define()` in the class constructor and use `$Const` references throughout the code. JSON definition files reside in `backend/platform/data/`.

### 2.1 `shift_status`

| ID | Name |
|----|------|
| `draft` | Draft |
| `published` | Published |
| `active` | Active |
| `completed` | Completed |
| `cancelled` | Cancelled |

**Constants:** `$Const.SHIFT_STATUS_DRAFT`, `$Const.SHIFT_STATUS_PUBLISHED`, `$Const.SHIFT_STATUS_ACTIVE`, `$Const.SHIFT_STATUS_COMPLETED`, `$Const.SHIFT_STATUS_CANCELLED`

### 2.2 `shift_recurrence_pattern`

| ID | Name |
|----|------|
| `daily` | Daily |
| `specific_days` | Specific Days |
| `every_x_days` | Every X Days |

**Constants:** `$Const.SHIFT_RECURRENCE_DAILY`, `$Const.SHIFT_RECURRENCE_SPECIFIC_DAYS`, `$Const.SHIFT_RECURRENCE_EVERY_X_DAYS`

### 2.3 `shift_recurrence_end_type`

| ID | Name |
|----|------|
| `end_date` | End Date |
| `occurrences` | Occurrences |
| `no_end` | No End |

**Constants:** `$Const.SHIFT_RECURRENCE_END_DATE`, `$Const.SHIFT_RECURRENCE_END_OCCURRENCES`, `$Const.SHIFT_RECURRENCE_END_NO_END`

### 2.4 `shift_update_scope`

| ID | Name |
|----|------|
| `this_only` | This Only |
| `this_and_future` | This and Future |
| `all` | All |

**Constants:** `$Const.SHIFT_UPDATE_THIS_ONLY`, `$Const.SHIFT_UPDATE_THIS_AND_FUTURE`, `$Const.SHIFT_UPDATE_ALL`

---

## 3. Error Codes

All shift error codes are in the range **610-639**.

| Error Code | RC | Message |
|------------|-----|---------|
| `ERR_SHIFT_NOT_FOUND` | 610 | shift not found |
| `ERR_SHIFT_INVALID_STATUS` | 611 | invalid shift status |
| `ERR_SHIFT_CANNOT_PUBLISH` | 612 | shift cannot be published in its current status |
| `ERR_SHIFT_CANNOT_CANCEL` | 613 | shift cannot be canceled in its current status |
| `ERR_SHIFT_OFFICER_ALREADY_ALLOCATED` | 614 | officer is already allocated to this shift |
| `ERR_SHIFT_OFFICER_NOT_ALLOCATED` | 615 | officer is not allocated to this shift |
| `ERR_SHIFT_OFFICER_CONFLICT` | 616 | officer has a scheduling conflict |
| `ERR_SHIFT_ALREADY_CHECKED_IN` | 617 | officer has already checked in |
| `ERR_SHIFT_NOT_CHECKED_IN` | 618 | officer has not checked in |
| `ERR_SHIFT_INVALID_TIME_RANGE` | 619 | invalid shift time range |
| `ERR_SHIFT_CANNOT_UPDATE` | 620 | shift cannot be updated in its current status |
| `ERR_SHIFT_CANNOT_DELETE` | 621 | only draft shifts can be deleted |
| `ERR_SHIFT_POST_NOT_FOUND` | 622 | post not found or not active |
| `ERR_SHIFT_OFFICER_NOT_IN_COMMUNITY` | 623 | officer does not belong to the shift community |
| `ERR_SHIFT_INVALID_RECURRENCE` | 624 | invalid recurrence configuration |
| `ERR_SHIFT_SERIES_NOT_FOUND` | 625 | shift series not found |
| `ERR_SHIFT_ALREADY_ACTIVE` | 626 | shift is already active |
| `ERR_SHIFT_ALREADY_COMPLETED` | 627 | shift is already completed |
| `ERR_SHIFT_ALREADY_CANCELLED` | 628 | shift is already cancelled |
| `ERR_SHIFT_NO_OFFICERS` | 629 | shift has no allocated officers and cannot be published |

**Cross-module error:** `ERR_COMMUNITY_HAS_ACTIVE_SHIFTS` (rc: 507) — returned by `Community/delete_community` when active shifts exist.

---

## 4. Configuration & Settings

### 4.1 Runtime Config (`runtime_config.js`)

| Key | Default | Purpose |
|-----|---------|---------|
| `SHIFTS_LIST_PAGE_SIZE` | 20 | Page size for `get_my_shifts` and `get_my_hours` pagination |
| `SETTINGS_DEFAULTS.shift` | (see below) | Default shift settings when no DB overrides exist |

### 4.2 Shift Settings (DB-backed via `key_value` table)

Retrieved via `$ShiftUtils.getShiftSettings()`. Configurable through `Settings/get_shift_settings` and `Settings/update_shift_settings` APIs.

| Setting | Default | Purpose |
|---------|---------|---------|
| `max_weekly_hours` | 48 | Maximum planned hours per officer per week before overtime warning |
| `min_rest_gap_hours` | 8 | Minimum rest gap (hours) between consecutive shifts |
| `auto_checkout_grace_mins` | 60 | Grace period after shift end before cron auto-closes check-ins |
| `shift_starting_soon_lead_mins` | 30 | How many minutes before shift start to send reminder notifications |
| `early_checkin_window_mins` | 30 | How early an officer can check in before shift start time |

---

## 5. Shift Status Lifecycle

### 5.1 State Machine

```
                                    +-- cancel_shift() --> [cancelled]
                                    |
[draft] -- publish_shift() --> [published] -- check_in() --> [active] -- check_out() --> [completed]
  |                                 |                           |
  +-- delete_shift() (hard)         +-- cron (no checkins) --+  +-- cron (all checked out) --> [completed]
                                       (auto-cancel)            +-- cron (stale checkin) --> auto-checkout
```

### 5.2 Transition Rules

| From | To | Trigger | Conditions |
|------|----|---------|------------|
| `draft` | `published` | `publish_shift()` | At least one officer allocated; conflicts acknowledged if present |
| `draft` | `cancelled` | `cancel_shift()` | Always allowed |
| `draft` | (deleted) | `delete_shift()` | Soft-deletes the shift record |
| `published` | `active` | `check_in()` | First officer check-in transitions shift to active |
| `published` | `cancelled` | `cancel_shift()` | Always allowed |
| `active` | `completed` | `check_out()` | Last officer checks out; all check-ins now closed |
| `active` | `completed` | Cron lifecycle | End time + grace period passed, all check-ins closed |

### 5.3 Hybrid Transition Model (Decision Q2)

Status transitions use a **hybrid approach**:

1. **Event-driven:** `check_in()` transitions published to active; `check_out()` transitions active to completed when all officers have checked out.
2. **Cron-driven:** `cron_shift_lifecycle_check.js` handles edge cases — auto-closes stale check-ins past the grace period and auto-completes shifts that should have ended.

---

## 6. Core Business Logic

### 6.1 Shift CRUD

#### `create_shift`
- Validates community exists, time range is valid (HH:MM 24h format, regex `/^([01]\d|2[0-3]):([0-5]\d)$/`).
- Detects overnight shifts (`end_time <= start_time`), sets `SFT_IS_OVERNIGHT = 1`.
- Validates notes length (max 500 chars).
- Optionally allocates officers in the same transaction (validates each officer belongs to the community).
- Status: `draft`.

#### `update_shift`
- Only `draft` and `published` shifts can be updated.
- Supports partial updates — fields set to `/null/` in the API are skipped.
- Recalculates `SFT_IS_OVERNIGHT` if start or end time changes.
- Published shift updates send `shift_updated` notification to allocated officers.

#### `delete_shift`
- Only `draft` shifts can be deleted (soft deletion: sets `SFT_DELETED_ON`).

### 6.2 Double-Booking Safeguard (Decision Q1)

**Dual-layer behaviour:**

| Context | Behaviour | Error |
|---------|-----------|-------|
| Allocation (`allocate_officer`) | Warn-only — returns `rc: 616` with `warnings[]` and `requires_acknowledgment: true`. Client must re-call with `acknowledge_conflicts: true` to proceed. | `ERR_SHIFT_OFFICER_CONFLICT` |
| Publishing (`publish_shift`) | Warn-only — validates all allocated officers in batch. Same acknowledgment flow. | `ERR_SHIFT_OFFICER_CONFLICT` |
| Check-in (`check_in`) | **Hard block** — if the officer has an open check-in (`SFC_CHECK_OUT_ON IS NULL`) on any shift, the check-in is rejected. | `ERR_SHIFT_ALREADY_CHECKED_IN` (rc: 617) |

### 6.3 Mid-Shift Officer Removal (Decision Q6)

`remove_officer()` on an active shift:

1. Fetches shift and officer allocation (before transaction).
2. Begins transaction.
3. Auto-closes any open check-in: `SFC_CHECK_OUT_ON = NOW()`, calculates `SFC_TOTAL_HOURS`, sets `SFC_NOTES = 'Auto-closed via mid-shift manager removal'`.
4. Soft-deletes the `shift_officer` record.
5. Soft-deletes all `shift_post` records for this officer on this shift.
6. Commits transaction.
7. Sends `shift_cancelled` notification to the removed officer (after commit).

### 6.4 Admin Access Control (Decision Q8)

- **Super Admins** (`user_details.USD_COM_ID IS NULL`): Access all communities. `community_id = 0` in `get_shifts_calendar` returns shifts across all communities.
- **Local Admins** (`user_details.USD_COM_ID IS NOT NULL`): Scoped to their assigned community. Requests for other communities return `ERR_NO_PRIVILEGES` (rc: 103).
- Backward compatible: existing admins without community assignments are treated as super admins.

---

## 7. Recurring Shifts

### 7.1 Creation (`create_recurring_shifts`)

1. Validates recurrence configuration:
   - `daily`: generates one shift per day from `start_date`.
   - `specific_days`: validates `repeat_on` array (day numbers 0-6), generates shifts only on matching weekdays.
   - `every_x_days`: validates `interval_days > 0`, generates shifts at the specified interval.
2. End condition determines how many shifts to generate:
   - `end_date`: generates until the end date (inclusive).
   - `occurrences`: generates exactly N shifts (max 365).
   - `no_end`: generates shifts for a **rolling 90-day horizon** from today (`ROLLING_HORIZON_DAYS = 90`).
3. Creates a `shift_series` record first, then bulk-inserts all shift instances with `SFT_SERIES_ID` pointing to the series.
4. Optionally allocates officers to all generated shifts in a single bulk INSERT.
5. All shifts are created in `draft` status. Each is independently publishable, updatable, and cancellable (Decision R4).

### 7.2 Updating (`update_recurring_shifts`)

Supports three scopes:

| Scope | Behaviour |
|-------|-----------|
| `this_only` | Updates only the target shift. Series link preserved. |
| `this_and_future` | Updates the target shift and all future shifts in the same series that are still in `draft` or `published` status. |
| `all` | Updates all shifts in the series that are in `draft` or `published` status. |

Active, completed, and cancelled shifts are never modified by recurring updates.

### 7.3 Rolling Horizon (Decision Q7)

For `no_end` series, `ROLLING_HORIZON_DAYS = 90` controls how far ahead shifts are generated. A future cron extension (`cron_recurring_shifts_extend.js`, deferred) would periodically check no-end series and generate additional shifts to maintain the 90-day horizon.

---

## 8. Allocation Validation Engine

### 8.1 `_runAllocationValidation(shift, officerId)`

Called by `allocate_officer`, `publish_shift`, and `validate_allocation`. Performs three checks:

#### 8.1.1 Double-Booking Check
Queries for overlapping shifts where the officer is allocated:
- Same date (or adjacent date for overnight shifts)
- Overlapping time range
- Shift not deleted, not cancelled
- Officer allocation not soft-deleted

Returns warning type: `DOUBLE_BOOKING`

#### 8.1.2 Rest Gap Check
Queries the officer's adjacent shifts (before and after the target shift). Calculates the gap in hours. If gap < `min_rest_gap_hours` setting, returns warning.

Returns warning type: `REST_GAP_WARNING`

#### 8.1.3 Weekly Hours Check
Calculates the officer's total planned hours for the ISO week containing the shift date. Compares against `max_weekly_hours` setting.

Returns warning type: `OVERTIME_WARNING`

### 8.2 Post Eligibility Validation (Decision Q5)

`validatePostEligibility(officerId, postId)` performs a set-intersection:

1. Fetches post's `PST_PERMISSIONS` JSON containing `required_roles` and `required_badges`.
2. Fetches officer's `OFC_ROLES` and `OFC_CERTIFICATION_BADGES` via `$ShiftUtils.getOfficerCapabilities()`.
3. Checks that every required role/badge is present in the officer's capabilities.
4. Returns non-blocking warning `POST_ELIGIBILITY_MISMATCH` if mismatched.

**Equipment validation is deferred** — the `officer` table does not yet have an `OFC_EQUIPMENT` column.

### 8.3 Warning Response Structure

When conflicts are detected, the API returns:

```json
{
  "rc": 616,
  "message": "officer has a scheduling conflict",
  "warnings": [
    {
      "type": "DOUBLE_BOOKING",
      "officer_id": "abc123...",
      "officer_name": "John Smith",
      "conflicting_shift_id": 42,
      "conflicting_shift_date": "2026-09-15"
    },
    {
      "type": "OVERTIME_WARNING",
      "officer_id": "abc123...",
      "officer_name": "John Smith",
      "current_weekly_hours": 44.5,
      "max_weekly_hours": 48,
      "additional_hours": 8
    }
  ],
  "requires_acknowledgment": true
}
```

---

## 9. Check-In / Check-Out & Hours Tracking

### 9.1 Check-In (`check_in`)

- **ACL:** Officer only.
- Validates shift is `published` or `active`.
- Validates officer is allocated to the shift (active allocation, not soft-deleted).
- **Hard-blocks** if officer has an open check-in on ANY shift (`SFC_CHECK_OUT_ON IS NULL`) — returns `ERR_SHIFT_ALREADY_CHECKED_IN` (rc: 617).
- If shift is `published`, transitions it to `active` (first check-in).
- Inserts `shift_checkin` record with `SFC_CHECK_IN_ON = NOW()`.

### 9.2 Check-Out (`check_out`)

- **ACL:** Officer only.
- Finds the officer's open check-in record for this shift.
- Calculates total hours: `(check_out_time - check_in_time) / 3600000`, rounded to 2 decimal places.
- Updates: `SFC_CHECK_OUT_ON = NOW()`, `SFC_TOTAL_HOURS = calculated`.
- **Auto-completion:** After check-out, queries all allocated officers. If ALL have closed check-ins and the shift is `active`, transitions shift to `completed`.

### 9.3 Hours Calculation

`SFC_TOTAL_HOURS` is stored as `DECIMAL(6,2)` and calculated as:

```
totalHours = Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100) / 100
```

---

## 10. Background Cron Jobs

### 10.1 `cron_shift_lifecycle_check.js`

**Schedule:** Configurable via `ecosystem.config.js` (runs periodically).
**Bootstrap:** `initStandAlone()` with SIGINT handler.
**Data item initialization:** `$ShiftUtils` module defines `shift_status` for `$Const` availability.

#### Processing steps:

1. **Auto-close stale check-ins:** Finds open check-in records (`SFC_CHECK_OUT_ON IS NULL`) on active shifts where `SFT_END_TIME + auto_checkout_grace_mins` has passed. For each:
   - Sets `SFC_CHECK_OUT_ON`, calculates `SFC_TOTAL_HOURS`.
   - Sets `SFC_AUTO_CHECKOUT = 1`.
   - Sets `SFC_NOTES = 'Auto-closed by lifecycle cron after grace period'`.

2. **Auto-complete active shifts:** Finds active shifts where end time + grace period has passed AND no open check-ins remain. Transitions each to `completed`.

### 10.2 `cron_shift_reminders.js`

**Schedule:** Configurable via `ecosystem.config.js` (runs periodically).

#### Processing steps:

1. Reads `shift_starting_soon_lead_mins` from shift settings (default: 30 minutes).
2. Queries published shifts starting within the lead window.
3. For each shift, finds allocated officers who have NOT yet checked in.
4. **Deduplication:** Checks the `notification` table for existing `shift_starting_soon` notifications sent to each officer within the last 2 hours. Skips already-notified officers.
5. Bulk-inserts notification records directly (not via the Notification API, since cron runs outside a session context).
6. Sends FCM push notifications where device tokens are available. FCM errors are caught and logged without failing the batch.

---

## 11. Notifications

### 11.1 Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `shift_published` | `publish_shift()` | All allocated officers |
| `shift_updated` | `update_shift()` (published shifts) | All allocated officers |
| `shift_cancelled` | `cancel_shift()`, `remove_officer()` | All allocated officers / removed officer |
| `shift_starting_soon` | `cron_shift_reminders.js` | Officers not yet checked in |

### 11.2 Delivery Pattern

- API context: Uses `sendShiftNotification()` helper which calls `$executeAPI(session, "Notification/create_bulk_notifications", ...)` after the transaction commits (Decision R1).
- Cron context: Inserts directly into the `notification` table and sends FCM pushes independently.

---

## 12. Cross-Module Integration

### 12.1 Community Module

- **Deletion guard:** `$ShiftUtils.communityHasActiveShifts(communityId)` is called in `Community/delete_community`. Returns `true` if any shift with status `published` or `active` exists for the community. Error: `ERR_COMMUNITY_HAS_ACTIVE_SHIFTS` (rc: 507). (Decision Q10)

### 12.2 Settings Module

- **Get/Update APIs:** `Settings/get_shift_settings` and `Settings/update_shift_settings` manage the five configurable shift parameters stored in the `key_value` table under the key `settings:shift`.

### 12.3 Asset Module

- **Post deletion guard:** `asset.js` queries `SHP_PST_ID` to check if a post has been used in shift assignments. Error: `ERR_POST_HAS_SHIFT_HISTORY` (rc: 759).

### 12.4 Future Integration Points

| Phase | Integration |
|-------|-------------|
| 5.2 — Route Optimization | Waypoint assignments per shift; AI-generated patrol routes linked to shift_post records |
| 5.3 — Live GPS Telemetry | Real-time officer position tracking during active shifts; geofence compliance |
| 7.1 — Reporting | Auto-generated shift summary reports on completion |

---

## 13. Deferred Requirements

See `docs/deferred_requirements/06-shift-enhancements.md` for the full list:

1. **Equipment validation** — `OFC_EQUIPMENT` column not yet in schema.
2. ~~Shift starting-soon reminders~~ — IMPLEMENTED.
3. **AI patrol route generation** — Depends on Phase 5.2.
4. **Allocation board drag-and-drop auto-check** — Client-side; server APIs ready.
5. **Recurring shift detach from series** — `this_only` scope does not clear `SFT_SERIES_ID`.
6. **Shift summary/report generation** — Depends on Phase 7.1.
7. **Active call checks on officer removal** — Depends on Call module integration.
8. ~~Community deletion guard~~ — IMPLEMENTED.
9. **Batch allocation validation** — N+1 query pattern in `publish_shift()` accepted for now (bounded by small officer counts).

---

## 14. File Inventory

| File | Purpose |
|------|---------|
| `backend/platform/api/shift.js` | API endpoint definitions (18 endpoints) |
| `backend/platform/funcs/shift.js` | Business logic implementation (~2000 lines) |
| `backend/platform/user_modules/shift_utils.js` | Shared shift utilities (`$ShiftUtils`) |
| `backend/platform/user_modules/funcs.js` | Shared helpers (`$Funcs.getUserName`, `$Funcs.getUserNames`) |
| `backend/platform/api/settings.js` | Shift settings API (get/update) |
| `backend/platform/funcs/settings.js` | Shift settings implementation |
| `backend/platform/jobs/cron_shift_lifecycle_check.js` | Auto-close stale check-ins, auto-complete shifts |
| `backend/platform/jobs/cron_shift_reminders.js` | Starting-soon push notifications |
| `backend/platform/data/shift_status.json` | Shift status data items |
| `backend/platform/data/shift_recurrence_pattern.json` | Recurrence pattern data items |
| `backend/platform/data/shift_recurrence_end_type.json` | Recurrence end-type data items |
| `backend/platform/data/shift_update_scope.json` | Update scope data items |
| `backend/platform/definitions/errorcodes.en.js` | Error codes (610-629) |
| `backend/platform/definitions/constants.js` | `$Const` key definitions |
| `backend/platform/config/runtime_config.js` | `SHIFTS_LIST_PAGE_SIZE`, `SETTINGS_DEFAULTS.shift` |
| `backend/platform/config/using_api.js` | API module registration |
| `backend/platform/config/using_modules.js` | User module registration |
| `backend/platform/funcs/community.js` | Community deletion guard integration |
| `db/db.sql` | Full schema (5 shift tables) |
| `db/UpgradeDB.sql` | Phase 5.1 migration script |
| `db/triggers_def.js` | Audit trail trigger definitions (4 shift tables) |
| `ecosystem.config.js` | PM2 cron job configuration |
