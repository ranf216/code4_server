# Asset Module Audit — Open Questions

Items discovered during the `brain.md` + `code_review_checklist.md` audit that require a decision before changing. Each entry identifies the specific code block and the conflicting/ambiguous rule.

---

1. ~~**Pagination convention: `offset/limit` vs `page/pageSize`**~~ **RESOLVED**

   Refactored `get_assets_list` and `get_posts_list` to follow the brain.md pattern:
   - API parameter changed from `offset`/`limit` to `page` (`"o:i:0"`, 0-based).
   - Page size moved to `runtime_config.js` (`ASSETS_LIST_PAGE_SIZE: 50`, `POSTS_LIST_PAGE_SIZE: 50`).
   - Response fields changed from `total_count` to `num_of_pages` and `num_of_items`.

2. ~~**Optional date fields not validated with `$Utils.validateDateStr()`**~~ **RESOLVED**

   Added explicit `$Utils.validateDateStr()` validation for `installation_date` and `replacement_date` in `create_asset`, `create_assets_batch`, and `update_asset`. Created new error code `ERR_ASSET_INVALID_DATE` (rc 763). Empty values are allowed (clear the date); non-empty values must pass validation.
