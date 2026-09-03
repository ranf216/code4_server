# Asset Module — Issues & Questions

**Created:** 2026-08-20
**Module:** `platform/api/asset.js`, `platform/funcs/asset.js`

---

## ~~1. Post Permissions Field~~ ✅ Resolved

**SDS Reference:** 4.2.6.2 — Post parameters table includes "Permissions" with comment "Question — is this required?"

**Question:** Should posts have a permissions field? If so, what does it control?

**Decision:** Implemented as `PST_PERMISSIONS` (JSON column, nullable) on the `post` table. The field stores **scheduling allocation requirements** — not portal-level ACL — defining the minimum eligibility an officer must possess to be assigned to this post during a shift:

```json
{
    "required_roles": ["Supervisor", "Patrol"],
    "required_badges": ["Armed", "First Aid"],
    "required_equipment": ["Radio", "Body Camera"]
}
```

All three keys are optional; omitted keys default to empty arrays (no restriction). The column mirrors `OFC_ROLES` and `OFC_CERTIFICATION_BADGES` on the `officer` table for easy set-intersection validation.

**Phase 4.1 scope:** Store and retrieve only. The API accepts, persists, and returns the JSON object without validation of its contents.

**Phase 5.1 scope (deferred):** The Shift module will perform set-intersection checks between `PST_PERMISSIONS` and the assigned officer's roles/badges/equipment during shift allocation. Mismatches will produce **non-blocking warnings** that managers can acknowledge and override (per SDS 4.7.3.2).

---

## 2. Asset Replacement Date — Reminder Behavior

**SDS Reference:** 4.2.6.1 — "Replacement Date: In case the asset should be renewed after a period of time. TBD if this is needed"

**Question:** Should the replacement date trigger a notification/reminder when approaching? If so, how many days in advance?

**Decision:** Yes, implement as a nightly cron job with a configurable lead time (default 30 days). The full implementation blueprint — including Settings integration, cron query, notification type registration, recipient routing, and optional Task deep-linking — is documented in `05-asset-enhancements.md` item 8. Phase 4.1 stores the date only; the reminder system is deferred to Phase 5.

---

## ~~3. Map Item Limit — Exact Number~~ ✅ Resolved

**SDS Reference:** 4.2.6 — "A map can have up to 1,000 (?) items."

**Question:** Is 1,000 the confirmed limit for total map items per community? Should this be configurable?

**Decision:** Implemented. Server-side enforcement is active in Phase 4.1 with a default limit of 1,000 map items per community (assets + posts + map zones combined). The limit is checked before every creation endpoint (`create_asset`, `create_assets_batch`, `create_post`, `create_map_zone`). For batch creation, the total is validated as `current_count + batch_size`.

The limit is configurable: when `settings:asset → max_map_items_per_community` is set in the `key_value` table, it overrides the default. Until the Settings asset namespace is built, the hardcoded default of 1,000 applies. Error code: `ERR_MAP_ITEM_LIMIT_EXCEEDED` (762).

---

## ~~4. Acres Calculation~~ ✅ Resolved

**SDS Reference:** 4.2.6.1, item 8 — "The system then creates and saves the assets separately, for each asset the acres will be calculated and saved."

**Question:** Is the acres/area calculation required server-side, or is this a client-side display concern? What formula should be used for different shapes?

**Decision:** Implemented server-side. The `AST_ACRES decimal(10,4)` column stores the calculated area for each asset. Calculation is performed automatically on the backend during `create_asset`, `create_assets_batch`, and `update_asset` (when shape or location changes).

**Formulas by shape:**
- **Place (point):** 0 acres (zero-dimensional)
- **Line:** 0 acres (one-dimensional; if a future phase introduces buffer width, formula expands to length x width)
- **Circle:** `π × r² / 4046.8564224` where r = radius in meters from the location JSON

The calculation is pure arithmetic (no external service dependency). Server-side guarantees consistent values across all clients (web, iOS, Android).
