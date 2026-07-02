# Admin User Module — Questions & Design Decisions

This document lists questions, assumptions, and design decisions made during implementation of the Admin User API module.

---

## Questions for Clarification

### Q1: Role Assignment via `update_admin_user` — RESOLVED

**Decision:** A dedicated `change_admin_user_role` endpoint was added with `@acl: [$ACL.USER_ROLE_SUPER_ADMIN]`.

- Only users with the `super_admin` role (value 2) can change another user's role.
- A user cannot change their own role (`ERR_ADMIN_CANNOT_EDIT_SELF_ROLE`).
- Role changes are kept separate from `update_admin_user` for security isolation.

### Q2: Password "X" Prefix UX Implication — RESOLVED

The "X" is an integral part of the password. It should be viewed and sent as such — no special UI handling needed. The stored value (e.g., `"XMyPass@123"`) is the actual password the user enters at login.

### Q3: Soft Deletion and Email/Phone Uniqueness

When soft-deleting a user, the implementation appends `/DELETED` to the email and phone number in `user_details` (same as the built-in `User/delete_user`). This frees up the email for re-registration while preserving audit trail. **Confirmed** this is the existing infrastructure pattern.

### Q4: `$Utils.getUserRolesListForApiDoc()` — VERIFIED

This utility exists in `infra/utils.js` and generates an HTML string for API documentation. ✅ No action needed.

### Q5: `$Utils.isCorrectPwd()` — VERIFIED

Signature: `isCorrectPwd(userId, inputPwd, dbPwd)`. When password starts with "X", it does direct string comparison. Otherwise, it hashes `userId + inputPwd` and compares. ✅ No action needed.

### Q6: `$UserRoles` Module — RESOLVED

The `user_roles` system module has been **enabled** in `using_modules.js`. The `admin_user` module uses `$UserRoles.setUserRoles()` for all role management. No direct access to `USD_ROLE_ALLOW`/`USD_ROLE_DENY` fields.

### Q7: `USR_PASSWORD_CREATED_ON` — VERIFIED

Column exists in the `user` table (`datetime DEFAULT NULL`). ✅ No action needed.

---

## Assumptions Made

1. **Admin users have `USR_TYPE = 1`** (USER_TYPE_ADMIN as defined in `user_types.js`).
2. **Active status is stored in `USR_STATUS`** where `1 = active, 0 = inactive`.
3. **The built-in `User/add_user`** API correctly handles user creation including password hashing, token generation, and `user_details` creation.
4. **Roles are bitmask-based** and managed via `USD_ROLE_ALLOW` and `USD_ROLE_DENY` columns.
5. **Only one primary role** is assigned per admin user (the role parameter is a single integer value representing a role bit).
6. **Sorting by role** uses `USD_ROLE_ALLOW` column value directly, which may not produce meaningful alphabetical ordering by role name.
7. **Token clearing** (`USR_TOKEN=''`) effectively logs the user out by invalidating their session.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Separate `admin_user` module vs. extending built-in `User` | Keeps project-specific logic isolated from infrastructure. Allows different ACL and validation rules. |
| Using `$executeAPI` for `add_user` | Reuses built-in user creation logic (password hashing, `user_details` sync triggers). Avoids duplicating complex logic. |
| `delete_admin_user` appends `/DELETED` to email | Frees email for re-registration while preserving audit trail. |
| `reset_admin_user_password` clears token | Forces immediate session termination for security. |
| `change_my_password` requires current password | Prevents unauthorized password changes even with a valid token. |
| No pagination on `get_admin_users` | Admin user lists are typically small (<100). Pagination can be added if needed. |

---

## Future Enhancements

- [x] Add `change_admin_user_role` endpoint — DONE (super_admin only)
- [ ] Add pagination if admin user count grows beyond 50
- [ ] Consider adding `last_password_change` to user response
- [ ] Consider email notification on password reset
- [ ] Add audit log entries for role changes and password resets
