module.exports =
{
            // =================================================================
            // Assets
            // =================================================================

            "get_assets_list"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get community assets list with optional filters",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "asset_type"                    : "o:s:***Filter by asset type key: " + $DataItems.getListForApiDoc("asset_type"),
                                                    "search_text"                   : "o:s:***Free-text search across description",
                                                    "sort_by"                       : "o:s:created_on***Sort column: created_on, asset_type",
                                                    "sort_dir"                      : "o:s:asc***Sort direction: asc or desc",
                                                    "page"                          : "o:i:0***Page number (0-based)",
                                                },


            "get_asset"                         : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get asset details",
                                                    "#token"                        : "s",
                                                    "asset_id"                      : "i***Asset ID",
                                                },


            "create_asset"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new asset on the community map",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "asset_type"                    : "s***Asset type key: " + $DataItems.getListForApiDoc("asset_type"),
                                                    "shape"                         : "o:s:place***Shape: place, circle, line",
                                                    "location"                      : "s***Location JSON (coordinates object)",
                                                    "description"                   : "o:s:***Description (manufacturer, model, serial number, etc.)",
                                                    "installation_date"             : "o:s:***Installation date (YYYY-MM-DD)",
                                                    "replacement_date"              : "o:s:***Replacement date (YYYY-MM-DD)",
                                                },


            "create_assets_batch"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create multiple assets at once. All assets share the same type, shape, and dates but have individual locations.",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "asset_type"                    : "s***Asset type key: " + $DataItems.getListForApiDoc("asset_type"),
                                                    "shape"                         : "o:s:place***Shape: place, circle, line",
                                                    "locations"                     : "a***Array of location JSON objects",
                                                    "description"                   : "o:s:***Description (shared for all assets)",
                                                    "installation_date"             : "o:s:***Installation date (YYYY-MM-DD, shared)",
                                                    "replacement_date"              : "o:s:***Replacement date (YYYY-MM-DD, shared)",
                                                },


            "update_asset"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit asset details",
                                                    "#token"                        : "s",
                                                    "asset_id"                      : "i***Asset ID",
                                                    "asset_type"                    : "o:s:/null/***Asset type key: " + $DataItems.getListForApiDoc("asset_type"),
                                                    "shape"                         : "o:s:/null/***Shape: place, circle, line",
                                                    "location"                      : "o:s:/null/***Location JSON",
                                                    "description"                   : "o:s:/null/***Description",
                                                    "installation_date"             : "o:s:/null/***Installation date (YYYY-MM-DD)",
                                                    "replacement_date"              : "o:s:/null/***Replacement date (YYYY-MM-DD)",
                                                },


            "delete_asset"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete an asset",
                                                    "#token"                        : "s",
                                                    "asset_id"                      : "i***Asset ID",
                                                },


            // =================================================================
            // Posts
            // =================================================================

            "get_posts_list"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get community posts list. Officers see posts in their community only.",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "o:i:0***Community ID (admin: required, officer: auto-resolved)",
                                                    "include_inactive"              : "o:b:false***Include inactive posts (default: active only)",
                                                    "search_text"                   : "o:s:***Free-text search across name and description",
                                                    "sort_by"                       : "o:s:name***Sort column: name, priority, created_on",
                                                    "sort_dir"                      : "o:s:asc***Sort direction: asc or desc",
                                                    "page"                          : "o:i:0***Page number (0-based)",
                                                },


            "get_post"                          : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get post details",
                                                    "#token"                        : "s",
                                                    "post_id"                       : "i***Post ID",
                                                },


            "create_post"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new post on the community map",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "name"                          : "s***Post name (max 60 chars, unique within community)",
                                                    "description"                   : "o:s:***Description (max 200 chars)",
                                                    "priority"                      : "o:s:normal***Priority: " + $DataItems.getListForApiDoc("post_priority"),
                                                    "shape"                         : "o:s:place***Shape: place, circle, line",
                                                    "location"                      : "s***Location JSON (coordinates object)",
                                                    "equipment"                     : "o:s:***Required equipment for this post",
                                                    "permissions"                   : "o:s:***Scheduling allocation requirements JSON: {required_roles:[], required_badges:[], required_equipment:[]}",
                                                    "is_active"                     : "o:b:true***Is post active (default true)",
                                                },


            "update_post"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit post details",
                                                    "#token"                        : "s",
                                                    "post_id"                       : "i***Post ID",
                                                    "name"                          : "o:s:/null/***Post name (max 60 chars)",
                                                    "description"                   : "o:s:/null/***Description (max 200 chars)",
                                                    "priority"                      : "o:s:/null/***Priority: " + $DataItems.getListForApiDoc("post_priority"),
                                                    "shape"                         : "o:s:/null/***Shape: place, circle, line",
                                                    "location"                      : "o:s:/null/***Location JSON",
                                                    "equipment"                     : "o:s:/null/***Equipment",
                                                    "permissions"                   : "o:s:/null/***Scheduling allocation requirements JSON: {required_roles:[], required_badges:[], required_equipment:[]}",
                                                    "is_active"                     : "o:b:/null/***Active status",
                                                },


            "delete_post"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Delete a post. Posts that have been used in a shift can only be deactivated, not deleted.",
                                                    "#token"                        : "s",
                                                    "post_id"                       : "i***Post ID",
                                                },


            // =================================================================
            // Map Zones
            // =================================================================

            "get_map_zones"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get map zones (entry/exit points, high priority zones) for a community",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "o:i:0***Community ID (admin: required, officer: auto-resolved)",
                                                    "zone_type"                     : "o:s:***Filter by zone type: " + $DataItems.getListForApiDoc("map_zone_type"),
                                                },


            "create_map_zone"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a map zone (entry/exit point or high priority zone)",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "zone_type"                     : "s***Zone type: " + $DataItems.getListForApiDoc("map_zone_type"),
                                                    "name"                          : "s***Zone name",
                                                    "location"                      : "s***Location JSON (coordinates object)",
                                                },


            "update_map_zone"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit a map zone",
                                                    "#token"                        : "s",
                                                    "zone_id"                       : "i***Map zone ID",
                                                    "zone_type"                     : "o:s:/null/***Zone type: " + $DataItems.getListForApiDoc("map_zone_type"),
                                                    "name"                          : "o:s:/null/***Zone name",
                                                    "location"                      : "o:s:/null/***Location JSON",
                                                },


            "delete_map_zone"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete a map zone",
                                                    "#token"                        : "s",
                                                    "zone_id"                       : "i***Map zone ID",
                                                },


            // =================================================================
            // Community Map
            // =================================================================

            "upload_community_map"              : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Upload or replace the 2D community map image",
                                                    "@truncated_request"            : "map_image",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "map_image"                     : "s***Map image (base64)",
                                                },


            // =================================================================
            // Metadata
            // =================================================================

            "get_asset_metadata"                : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get asset types, shapes, post priorities, and zone types for populating dropdowns",
                                                    "#token"                        : "s",
                                                },
};
