# Admin User Module — Deferred Enhancements

These enhancements were identified during implementation of the `admin_user` module but deferred for future work.

---

## 1. Add Pagination to `get_admin_users`

**Context:** Currently `get_admin_users` returns all results without pagination. This is acceptable for small admin teams but won't scale beyond ~50 users.

**What to do:**
- Add optional parameters `page` (int, default 1) and `page_size` (int, default 20) to the API definition in `backend/platform/api/admin_user.js`.
- In `backend/platform/funcs/admin_user.js`, add `LIMIT ? OFFSET ?` to the SQL query in `get_admin_users()`.
- Return `total_count` (full count without LIMIT) and `page`/`page_size` in the response so the client can render pagination controls.
- Update the test in `backend/platform/funcs/api_test.js` (`test_admin_user`) to verify pagination behavior.

---

## 2. Add `last_password_change` to User Response

**Context:** The `USR_PASSWORD_CREATED_ON` column already exists in the `user` table. Exposing it in the admin user response would help admins identify users with stale passwords.

**What to do:**
- In `backend/platform/funcs/admin_user.js`, add `u.USR_PASSWORD_CREATED_ON` to the SELECT in `fetchAdminUserRecord()` and in `get_admin_users()`.
- In `mapAdminUserRow()`, add `last_password_change: row.USR_PASSWORD_CREATED_ON` to the returned object.
- No API definition change needed (response fields are not declared in the API definition).

---

## 3. Email Notification on Password Reset

**Context:** When an admin resets another user's password via `reset_admin_user_password`, the user currently has no way to know their new password unless the admin communicates it manually.

**What to do:**
- In `backend/platform/funcs/admin_user.js` → `reset_admin_user_password()`, after storing the new password, send an email using `$Mailer.sendMailFromTemplate()`.
- Use an appropriate email template (e.g., `$Const.EMAIL_TEMPLATE_RESET_PASSWORD`). Check `backend/platform/definitions/constants.js` for available template constants.
- The email should contain the full password (including the "X" prefix — it is an integral part of the password).
- Same applies to `add_admin_user()` — consider emailing the initial password to the new user.

---

## 4. Audit Log for Role Changes and Password Resets

**Context:** Security-sensitive actions (role changes, password resets, user deletion) should be logged for audit trail purposes.

**What to do:**
- Determine if an `audit_log` table exists in the DB schema (`db/db.sql`). If not, create one with fields like: `log_id`, `action`, `target_user_id`, `performed_by_user_id`, `details` (JSON), `created_on`.
- In `backend/platform/funcs/admin_user.js`, add audit log inserts after:
  - `change_admin_user_role()` — log old role → new role
  - `reset_admin_user_password()` — log that password was reset (do NOT log the password itself)
  - `delete_admin_user()` — log deletion
  - `update_admin_user()` — log which fields were changed
- Consider creating a shared utility function or system module for audit logging if it will be reused across other modules.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/platform/api/admin_user.js` | API endpoint definitions |
| `backend/platform/funcs/admin_user.js` | Business logic implementation |
| `backend/platform/funcs/api_test.js` | Test suite (`test_admin_user()`) |
| `backend/platform/config/using_modules.js` | System modules (includes `user_roles`) |
| `docs/admin_user_questions.md` | Original questions & design decisions |
