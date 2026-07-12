module.exports =
{
            "get_officers"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get list of all officers",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "o:i:0***Filter by community ID (0 = all)",
                                                    "include_inactive"              : "o:b:false***Include inactive officers (default false)",
                                                    "search_text"                   : "o:s:***Free-text search across name, email, phone, community",
                                                    "sort_by"                       : "o:s:***Sort column: first_name, last_name, community, created_on",
                                                    "sort_dir"                      : "o:s:asc***Sort direction: asc or desc",
                                                },


            "get_officer"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get a single officer by user ID (includes evaluations)",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Officer user ID",
                                                },


            "add_officer"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new officer",
                                                    "@truncated_request"            : "image",
                                                    "#token"                        : "s",
                                                    "first_name"                    : "s***Officer first name",
                                                    "last_name"                     : "o:s:***Officer last name",
                                                    "phone_num"                     : "s***Mobile phone number (used for login)",
                                                    "email"                         : "o:s:***Email address",
                                                    "community_id"                  : "i***Community to associate the officer with",
                                                    "title"                         : "s***Officer title",
                                                    "address"                       : "o:s:***Officer address",
                                                    "description"                   : "o:s:***Officer description",
                                                    "image"                         : "o:s:***Officer photo (base64)",
                                                    "roles"                         : "o:a:***Officer roles (array of strings)",
                                                    "certification_badges"          : "o:a:***Certification badges (array of strings)",
                                                },


            "update_officer"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update an officer's details",
                                                    "@truncated_request"            : "image",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Officer user ID",
                                                    "first_name"                    : "o:s:***Officer first name",
                                                    "last_name"                     : "o:s:/null/***Officer last name",
                                                    "phone_num"                     : "o:s:***Mobile phone number",
                                                    "email"                         : "o:s:***Email address",
                                                    "community_id"                  : "o:i:0***Community ID to reassign",
                                                    "title"                         : "o:s:***Officer title",
                                                    "address"                       : "o:s:/null/***Officer address",
                                                    "description"                   : "o:s:/null/***Officer description",
                                                    "image"                         : "o:s:/null/***Officer photo (base64)",
                                                    "roles"                         : "o:a:/null/***Officer roles (array of strings)",
                                                    "certification_badges"          : "o:a:/null/***Certification badges (array of strings)",
                                                    "is_active"                     : "o:b:/null/***Active status",
                                                },


            "delete_officer"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete an officer. Only possible if officer has never logged in; otherwise deactivate via update_officer.",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Officer user ID",
                                                },


            "get_my_details"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get the current officer's own profile details",
                                                    "#token"                        : "s",
                                                },


            "update_my_details"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Update the current officer's own editable details (name, address, email)",
                                                    "#token"                        : "s",
                                                    "first_name"                    : "o:s:***First name",
                                                    "last_name"                     : "o:s:/null/***Last name",
                                                    "address"                       : "o:s:/null/***Address",
                                                    "email"                         : "o:s:***Email address",
                                                },


            "get_officers_info"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get public details of checked-in officers for the resident's community (SDS 2.8)",
                                                    "#token"                        : "s",
                                                },


            "get_officer_evaluations"           : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get all evaluations for an officer (visible only to admin/manager)",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Officer user ID",
                                                },


            "add_officer_evaluation"            : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Add a new evaluation for an officer",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Officer user ID",
                                                    "text"                          : "s***Evaluation text",
                                                    "date"                          : "s***Evaluation date (YYYY-MM-DD)",
                                                },


            "delete_officer_evaluation"         : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete an officer evaluation",
                                                    "#token"                        : "s",
                                                    "evaluation_id"                 : "i***Evaluation ID",
                                                },

};
