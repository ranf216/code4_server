# Resident Module (Phase 2.2) — Questions & Design Decisions

**Purpose:** Clarification needed before implementing `platform/api/resident.js` + `platform/funcs/resident.js`

---

## Proposed Endpoints

Based on my analysis of SDS sections 2.7, 3.10, 4.2.3:

| API | ACL | Description |
|---|---|---|
| `Resident/get_residents` | ADMIN | List all residents (with community filter, search, sort) |
| `Resident/get_resident` | ADMIN | Get a single resident by user ID |
| `Resident/add_resident` | ADMIN | Create a new resident |
| `Resident/update_resident` | ADMIN | Update resident details |
| `Resident/delete_resident` | ADMIN | Soft-delete a resident |
| `Resident/get_my_details` | RESIDENT | Get own profile |
| `Resident/update_my_details` | RESIDENT | Update own editable fields |
| `Resident/search_residents` | OFFICER | Search residents by name, license plate, address (SDS 3.10) |

---

## Proposed DB Table: `resident`

```sql
CREATE TABLE `resident` (
  `RES_USR_ID` varchar(128) NOT NULL,
  `RES_ADDRESS` varchar(500) NOT NULL DEFAULT '',
  `RES_VEHICLES` json DEFAULT NULL,           -- Array of license plate strings
  `RES_INSTRUCTIONS` text,                    -- Special instructions for officers
  `RES_IMAGES` json DEFAULT NULL,             -- Array of image file names (up to 10)
  `RES_COMMUNICATION_TEST` tinyint unsigned NOT NULL DEFAULT '0',
  `RES_CREATED_ON` datetime NOT NULL,
  `RES_LAST_UPDATE` datetime DEFAULT NULL,
  `RES_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RES_USR_ID`),
  CONSTRAINT `FK_RES_USR_ID` FOREIGN KEY (`RES_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Questions

### Q1 — Community editable by resident? ✅ ANSWERED

~~SDS 2.7.1 marks "Community name" as **editable: yes** but also says *"Taken from the system during identification."*~~

**Answer:** Residents CANNOT change their own community from the mobile app. Only admin can reassign.

---

### Q2 — Resident images (property photos) ✅ ANSWERED

**Answer:**
- (a) Residents do NOT have a profile image. `USD_IMAGE` is not used for residents.
- (b) Admin CAN view/edit property images via `update_resident`.

**Implementation:** JSON array of file names in `RES_IMAGES`, max 10, managed by both resident (`update_my_details`) and admin (`update_resident`).

---

### Q3 — Vehicle numbers ✅ ANSWERED

**Answer:** No server-side maximum. Store as JSON array in `RES_VEHICLES`, no count enforcement.

---

### Q4 — Error code `ERR_RESIDENT_ALREADY_EXISTS` (542) ✅ ANSWERED

**Answer:** Used when trying to reassign a resident to a community they already belong to (i.e., the target community is the same as their current community).

---

### Q5 — `search_residents` scope (Officer endpoint, SDS 3.10) ✅ ANSWERED

**Answer:** Strictly limited to the officer's assigned community.

---

### Q6 — Delete checks ✅ ANSWERED

**Answer:**
1. **Delete:** Blocked if resident has ANY activity (i.e., created calls in the past, active or not). Will add error 543 `ERR_RESIDENT_CANNOT_DELETE` — "resident has activity and cannot be deleted, only deactivated".
2. **Inactivate / Move community:** Blocked if resident has ACTIVE calls. Uses error 541 `ERR_RESIDENT_HAS_ACTIVE_CALLS`.

**Implementation notes:**
- `delete_resident`: check for any calls (past or present) → 543 if found
- `update_resident` (is_active=false or community change): check for active calls → 541 if found
- Call table doesn't exist yet (Phase 3), so these checks will be added as TODO placeholders until the Call module is implemented.

---

### Q7 — `update_my_details` editable fields for resident ✅ ANSWERED

**Answer:** Residents can edit: name, address, email, images, instructions. NOT phone, community, or vehicles. Vehicles are admin-managed only.

---

### Q8 — Additional error codes needed? ✅ ANSWERED

**Answer:** Free to add error codes as needed during development (within the 540–559 range).

---

## Summary of My Assumptions (will proceed with these unless corrected)

1. Community is NOT editable by the resident (admin only)
2. No separate profile image — only property images in `RES_IMAGES`
3. Vehicles stored as JSON array, no server-side max
4. `ERR_RESIDENT_ALREADY_EXISTS` → will not use (phone/email uniqueness handled by infrastructure)
5. `search_residents` limited to officer's community
6. Delete requires "never logged in" check; will add `ERR_RESIDENT_CANNOT_DELETE` (543)
7. Resident can self-edit: name, address, email, images, instructions
8. Admin can edit all fields including vehicles, communication_test, community, is_active
