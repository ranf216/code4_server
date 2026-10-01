module.exports =
{
            "get_post_orders_list"              : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get paginated list of post orders. Admins see all; officers see published POs for posts allocated in last 90 days; residents see published POs for their communities (client-visible sections only).",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "o:i:0***Filter by community ID (admin only, 0 = all)",
                                                    "status"                        : "o:s:***Filter by status: " + $DataItems.getListForApiDoc("po_status"),
                                                    "search_text"                   : "o:s:***Free-text search across post name and community name",
                                                    "review_due_before"             : "o:s:***Filter POs with review due on or before this date (YYYY-MM-DD)",
                                                    "sort_by"                       : "o:s:community_name***Sort column: community_name, post_name, status, last_published_on",
                                                    "sort_dir"                      : "o:s:asc***Sort direction: asc or desc",
                                                    "offset"                        : "o:i:0***Pagination offset",
                                                    "limit"                         : "o:i:20***Page size (max 100)",
                                                },


            "get_post_order"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get full details of a single post order including sections and attachments. Officers see the latest published version; managers see current working content. Residents see published client-visible sections only.",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                },


            "create_post_order"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new post order for a post. Only one post order per post is allowed. Created in draft status.",
                                                    "#token"                        : "s",
                                                    "post_id"                       : "i***Post ID to attach the post order to",
                                                    "review_due_date"               : "o:s:***Optional review due date (YYYY-MM-DD)",
                                                    "sections"                      : "a***Array of section objects: [{section_type, title, description, client_visible, notes, attachment_file_ids}]",
                                                },


            "update_post_order"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update a post order. Editing a published PO creates a draft automatically. Only draft POs can be edited.",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                    "review_due_date"               : "o:s:/null/***Updated review due date (YYYY-MM-DD)",
                                                    "sections"                      : "o:a:/null/***Full replacement array of sections: [{section_type, title, description, client_visible, notes, attachment_file_ids}]. If provided, replaces all existing sections.",
                                                },


            "publish_post_order"                : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Publish a draft post order. Creates a new version and notifies allocated officers.",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                    "version_type"                  : "s***Version bump type: " + $DataItems.getListForApiDoc("po_version_type"),
                                                    "change_summary"                : "s***Brief description of changes (max 200 chars)",
                                                    "effective_date"                : "o:s:***Effective date (YYYY-MM-DD, defaults to today)",
                                                    "notify_officers"               : "o:b:true***Send push notifications to allocated officers",
                                                },


            "archive_post_order"                : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Archive a published post order. Archived POs are no longer shown to officers or clients.",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                },


            "delete_post_order"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Delete a draft post order with no published history. Published or archived POs can only be archived.",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                },


            "get_version_history"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get chronological list of all published versions for a post order",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                },


            "get_version"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get a specific historical version of a post order including its snapshot content",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                    "version_id"                    : "i***Version ID",
                                                },


            "acknowledge_post_order"            : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Acknowledge reading a specific or the current published version of a post order",
                                                    "#token"                        : "s",
                                                    "post_order_id"                 : "i***Post Order ID",
                                                    "version_id"                    : "o:i:0***Version ID to acknowledge (0 = latest published version)",
                                                },
};
