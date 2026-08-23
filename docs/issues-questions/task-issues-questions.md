# Task Module — Issues & Questions

**Created:** 2026-08-13  
**Module:** `platform/api/task.js`, `platform/funcs/task.js`

---

## ~~1. Approved Status — Transition Rules~~ ✅ Resolved

**Question:** The SDS references an "Approved" status in the task lifecycle, and it exists in `task_status.json`. However, the SDS does not clearly define:
- Who can set a task to "Approved" status (specific role? e.g., logistics, finance, planning?)
- Under what conditions does a task require approval before completion?
- Is "Approved" a required step for all tasks or only certain task types?

**Resolution:** Implemented as a dedicated `Task/approve_task` endpoint with role-based `@acl` authorization enforced by the framework.

**Rules implemented:**
1. **Who can approve:** Only Admin users with role `USER_ROLE_PLANNING` (4), `USER_ROLE_LOGISTICS` (5), or `USER_ROLE_FINANCE` (6). Enforced via `@acl: [$ACL.USER_TYPE_ADMIN, $ACL.USER_ROLE_PLANNING, $ACL.USER_ROLE_LOGISTICS, $ACL.USER_ROLE_FINANCE]`.
2. **Which tasks require approval:** Only task types listed in `platform/data/task_approval_types.json` — currently `supply_request` and `damaged_equipment`. Validated in business logic via `$DataItems.isValidItemId(task.TSK_TYPE, "task_approval_types")`.
3. **State guard:** Task must be in `accepted` status to transition to `approved`. Routine tasks (lights, sprinklers, leaks, etc.) skip the approval step entirely — they go directly from `accepted` to `completed`.
4. **Atomic reassignment:** `approve_task` accepts an optional `assigned_to` parameter, allowing the approving admin to approve and reassign back to the field officer in a single call.

**Files modified:**
- `backend/platform/api/task.js` — added `approve_task` endpoint with role-based `@acl`
- `backend/platform/funcs/task.js` — added `approve_task()` method with state/type guards
- `backend/platform/data/task_approval_types.json` — new static $DataItems file listing types requiring approval

---

## ~~2. Task Description Length Discrepancy~~ ✅ Resolved

**Question:** The SDS (section 3.8.1) states "Describe Problem (up to 200 characters)" while the DB column is `varchar(500)`.

**Resolution:** The `varchar(500)` DB column is correct. In utf8mb4, characters can occupy up to 4 bytes each. A 200-character client-side limit can require up to 500 bytes of storage. The client enforces the 200-character UI limit; the DB provides sufficient byte-level capacity for multi-byte character sets.

---

## ~~3. Default Assignee (Manager)~~ ✅ Resolved

**Question:** The SDS (section 3.8.1) states "Assign To (required - default community manager)." The concept of a "default community manager" is not modeled in the current DB schema — there is no `COM_DEFAULT_MANAGER` column or similar.

**Resolution:** Implemented dynamic server-side fallback resolution. The `assigned_to` parameter is now optional on `create_task`. When omitted, the server resolves the default assignee using the following cascade:

1. **Community Manager:** Oldest active admin with `USER_ROLE_MANAGER` in the task's community (via `USD_ROLE_ALLOW` bitmask check).
2. **Global Super Admin fallback:** If no community manager found, falls back to the oldest active admin with `USER_ROLE_SUPER_ADMIN` system-wide.
3. **Error:** If neither is found, returns `ERR_TASK_ASSIGNEE_NOT_FOUND`.

This approach requires zero schema changes, adapts automatically as personnel change, and simplifies client integration (client can omit `assigned_to` or send it explicitly).

---

## ~~4. Document Attachments — File Type Validation~~ ✅ Resolved

**Question:** The SDS mentions document attachments for tasks but does not specify which document types are allowed. Should the server validate file MIME types for documents (e.g., PDF only, or also DOCX, XLSX, etc.)?

**Resolution:** Implemented server-side MIME type validation via `resolveDocumentFileIds()`. Document attachments are validated against a strict whitelist before association with the task. Returns `ERR_INVALID_FILE_TYPE` (rc 324) for rejected types.

**Allowed MIME types:**
| Extension | MIME Type | Purpose |
|---|---|---|
| `.pdf` | `application/pdf` | Reports, manuals, guidelines |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Supply lists, inventory |
| `.csv` | `text/csv` | Tabular data, exports |
| `.txt` | `text/plain` | Logs, notes, instructions |
| `.png` | `image/png` | Scanned receipts, diagrams |
| `.jpg`/`.jpeg` | `image/jpeg` | Scanned receipts, visual references |

**Enforcement points:** `create_task` (document_file_ids) and `add_task_media` (document_file_ids). The `FIL_MIME_TYPE` from the `file` table is checked against the whitelist — prevents renamed executables from passing validation.

---

## Resolved Questions

- **Q1 — Approved Status:** Resolved. Dedicated `approve_task` endpoint with role-based `@acl` and `task_approval_types.json` configuration.
- **Q2 — Description Length:** Resolved. `varchar(500)` is correct — accommodates utf8mb4 multi-byte encoding for a 200-character client limit.
- **Q3 — Default Assignee:** Resolved. Dynamic server-side fallback: community Manager → global Super Admin. No schema changes needed.
- **Q4 — Document MIME Validation:** Resolved. Server-side whitelist (pdf, xlsx, csv, txt, png, jpeg) via `resolveDocumentFileIds()`. Returns `ERR_INVALID_FILE_TYPE` on rejection.
