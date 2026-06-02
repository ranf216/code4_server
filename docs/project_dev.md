# Server Implementation Documentation

**Document Version:** 1.1  
**Last Updated:** 2026
**Purpose:** Comprehensive documentation of the project server business logic implementation

---

## Phase 0 — Foundation & Configuration

### Admin Roles (`platform/definitions/user_roles.js`)
| Constant | Value | Name |
|---|---|---|
| `USER_ROLE_ACCOUNT_IMPERSONATION` | 1 | Account Impersonation |
| `USER_ROLE_SUPER_ADMIN` | 2 | Super Admin |
| `USER_ROLE_MANAGER` | 3 | Manager |
| `USER_ROLE_PLANNING` | 4 | Planning |
| `USER_ROLE_LOGISTICS` | 5 | Logistics |
| `USER_ROLE_FINANCE` | 6 | Finance |

### User Types (`platform/definitions/user_types.js`)
| Constant | Value | Name |
|---|---|---|
| `USER_TYPE_NA` | 0 | n/a |
| `USER_TYPE_ADMIN` | 1 | admin |
| `USER_TYPE_OFFICER` | 2 | officer |
| `USER_TYPE_RESIDENT` | 3 | resident |

### Project Error Codes (`platform/definitions/errorcodes.en.js`)
Project-specific error codes start at RC 500:
- **500–519** — Community
- **520–539** — Officer
- **540–559** — Resident
- **560–589** — Call
- **590–609** — Task
- **610–639** — Shift
- **640–659** — Route
- **660–669** — Tracking
- **670–689** — Post Order
- **690–709** — POI
- **710–729** — Report
- **730–739** — Notification
- **740–749** — Settings
- **750–769** — Asset & Post
- **770–779** — Admin User

### $DataItems Lookup Tables (`platform/data/`)
| File | Description |
|---|---|
| `service_type.json` | Concierge service types (Dumpsters Recovery, Welfare Check, Property Walk, etc.) |
| `task_type.json` | Task/maintenance report types (Lights, Sprinklers, Leaks, Inspection, Supply Request, etc.) |
| `asset_type.json` | Asset types (Camera, Door, Gate, Fence, Light, Alarm, etc.) |
| `po_section_type.json` | Post Order section types (General Info, Duties, Emergency Procedures, etc.) with `client_visible` attribute |

### Database Tables (V 4.0.0)
| Table | Prefix | Description |
|---|---|---|
| `community` | `COM_` | Managed communities/sites |
| `featured_officer` | `FTO_` | One featured officer banner per community |


---

## Development Best Practices

For comprehensive development best practices, including database code guidelines, implementation checklists, and common patterns, see the **"Critical Rules & Best Practices"** section in `docs/brain.md`.

Key reminders:
- **Never** execute `$Db.executeQuery()` inside loops - use bulk operations with `IN` clauses
- **Never** include `SELECT` queries inside transactions - fetch all data before `$Db.beginTransaction()`
- Always use soft deletion pattern (`UPDATE SET *_DELETED_ON=?`) instead of `DELETE FROM`
- Prepare data in memory before starting transactions to minimize lock time

See `docs/brain.md` for complete guidelines, code examples, and pre-implementation checklist.
