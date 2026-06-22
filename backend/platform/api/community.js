module.exports =
{
            "get_communities"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get list of all communities",
                                                    "#token"                        : "s",
                                                    "include_inactive"              : "o:b:false***Include inactive communities (default false)",
                                                    "search_text"                   : "o:s:***Free-text search across community/officer/resident names",
                                                },


            "get_community"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get a single community by ID",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                },


            "add_community"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new community",
                                                    "@truncated_request"            : "map_image",
                                                    "#token"                        : "s",
                                                    "name"                          : "s***Community name",
                                                    "area"                          : "s***Area description",
                                                    "latitude"                      : "o:d:0***Latitude coordinate",
                                                    "longitude"                     : "o:d:0***Longitude coordinate",
                                                    "location_name"                 : "o:s:***Location name",
                                                    "timezone"                      : "o:s:***Timezone identifier",
                                                    "map_image"                     : "o:s:***Map image (base64)",
                                                    "map_boundaries"                : "o:s:***Map boundaries (JSON polygon)",
                                                    "is_active"                     : "o:b:true***Is community active (default true)",
                                                    "officers"                      : "o:n:***Officer user IDs to associate",
                                                    "residents"                     : "o:n:***Resident user IDs to associate",
                                                },


            "update_community"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update a community",
                                                    "@truncated_request"            : "map_image",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "name"                          : "o:s:***Community name",
                                                    "area"                          : "o:s:***Area description",
                                                    "latitude"                      : "o:d:0***Latitude coordinate",
                                                    "longitude"                     : "o:d:0***Longitude coordinate",
                                                    "location_name"                 : "o:s:***Location name",
                                                    "timezone"                      : "o:s:***Timezone identifier",
                                                    "map_image"                     : "o:s:***Map image (base64)",
                                                    "map_boundaries"                : "o:s:***Map boundaries (JSON polygon)",
                                                    "is_active"                     : "o:b:true***Is community active",
                                                    "officers"                      : "o:n:***Officer user IDs to associate (replaces current list)",
                                                    "residents"                     : "o:n:***Resident user IDs to associate (replaces current list)",
                                                },


            "delete_community"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete a community",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                },


            "get_featured_officer"              : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get the featured officer banner for a community",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                },


            "set_featured_officer"              : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create or update the featured officer banner for a community",
                                                    "@truncated_request"            : "image",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                    "image"                         : "s***Featured officer image (base64)",
                                                    "description"                   : "s***Featured officer description",
                                                },


            "delete_featured_officer"           : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete the featured officer banner for a community",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "i***Community ID",
                                                },

};
