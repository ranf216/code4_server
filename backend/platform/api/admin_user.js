module.exports =
{
            "get_admin_users"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get list of all management system users (admin type)",
                                                    "#token"                        : "s",
                                                    "include_inactive"              : "o:b:false***Include inactive users (default false)",
                                                    "search_text"                   : "o:s:***Free-text search across name, email, phone",
                                                    "sort_by"                       : "o:s:***Sort column: first_name, last_name, email, role, created_on",
                                                    "sort_dir"                      : "o:s:asc***Sort direction: asc or desc",
                                                },


            "get_admin_user"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get a single admin user by ID",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***User ID",
                                                },


            "add_admin_user"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new management system user",
                                                    "@protected_request"            : "password",
                                                    "#token"                        : "s",
                                                    "first_name"                    : "s***User first name",
                                                    "last_name"                     : "o:s:***User last name",
                                                    "email"                         : "s***Email address (used for login)",
                                                    "password"                      : "s***Initial password (user must change on first login)",
                                                    "phone_num"                     : "o:s:***Mobile phone number",
                                                    "role"                          : "i***Role type: " + $Utils.getUserRolesListForApiDoc(),
                                                },


            "update_admin_user"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update a management system user's details",
                                                    "@protected_request"            : "initial_password",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***User ID",
                                                    "first_name"                    : "o:s:***User first name",
                                                    "last_name"                     : "o:s:***User last name",
                                                    "email"                         : "o:s:***Email address (if changed, initial password must also be set)",
                                                    "phone_num"                     : "o:s:***Mobile phone number",
                                                    "is_active"                     : "o:b:true***Active status",
                                                    "initial_password"              : "o:s:***Initial password (required when email is changed)",
                                                },


            "reset_admin_user_password"         : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Reset a user's password to a new initial password. User will be required to change it on next login.",
                                                    "@protected_request"            : "password",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***User ID",
                                                    "password"                      : "s***New initial password",
                                                },


            "delete_admin_user"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete a management system user. Cannot delete if the user is the last active admin.",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***User ID",
                                                },


            "change_admin_user_role"            : {
                                                    "@acl"                          : [$ACL.USER_ROLE_SUPER_ADMIN],
                                                    "@doc"                          : "Change a user's role. Only accessible by super admins.",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***User ID",
                                                    "role"                          : "i***New role type: " + $Utils.getUserRolesListForApiDoc(),
                                                },


            "change_my_password"                : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Change the current admin user's own password (voluntary, non-mandatory change).",
                                                    "@protected_request"            : "current_password,new_password",
                                                    "#token"                        : "s",
                                                    "current_password"              : "s***Current password",
                                                    "new_password"                  : "s***New password",
                                                },

};
