module.exports =
{
            "get_residents"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get list of all residents",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "o:i:0***Filter by community ID (0 = all)",
                                                    "include_inactive"              : "o:b:false***Include inactive residents (default false)",
                                                    "search_text"                   : "o:s:***Free-text search across name, email, phone, address, community",
                                                    "sort_by"                       : "o:s:***Sort column: first_name, last_name, community, created_on",
                                                    "sort_dir"                      : "o:s:asc***Sort direction: asc or desc",
                                                },


            "get_resident"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get a single resident by user ID",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Resident user ID",
                                                },


            "add_resident"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new resident",
                                                    "#token"                        : "s",
                                                    "first_name"                    : "s***Resident first name",
                                                    "last_name"                     : "o:s:***Resident last name",
                                                    "phone_num"                     : "s***Mobile phone number (used for login)",
                                                    "email"                         : "o:s:***Email address",
                                                    "community_id"                  : "i***Community to associate the resident with",
                                                    "address"                       : "o:s:***Resident address",
                                                    "vehicles"                      : "o:a:***Vehicle license plates (array of strings)",
                                                    "instructions"                  : "o:s:***Special instructions for officers",
                                                    "communication_test"            : "o:b:false***Communication test flag (default false)",
                                                },


            "update_resident"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update a resident's details",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Resident user ID",
                                                    "first_name"                    : "o:s:***Resident first name",
                                                    "last_name"                     : "o:s:/null/***Resident last name",
                                                    "phone_num"                     : "o:s:***Mobile phone number",
                                                    "email"                         : "o:s:***Email address",
                                                    "community_id"                  : "o:i:0***Community ID to reassign",
                                                    "address"                       : "o:s:/null/***Resident address",
                                                    "vehicles"                      : "o:a:/null/***Vehicle license plates (array of strings)",
                                                    "instructions"                  : "o:s:/null/***Special instructions for officers",
                                                    "new_image_ids"                 : "o:a:/null/***File IDs of newly uploaded property images (from File/upload_file_base64 or multipart upload)",
                                                    "keep_images"                   : "o:a:/null/***URLs of existing property images to keep",
                                                    "communication_test"            : "o:b:/null/***Communication test flag",
                                                    "is_active"                     : "o:b:/null/***Active status",
                                                },


            "delete_resident"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete a resident. Only possible if resident has no activity (calls); otherwise deactivate via update_resident.",
                                                    "#token"                        : "s",
                                                    "user_id"                       : "s***Resident user ID",
                                                },


            "get_my_details"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get the current resident's own profile details",
                                                    "#token"                        : "s",
                                                },


            "update_my_details"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Update the current resident's own editable details (name, address, email, images, instructions)",
                                                    "#token"                        : "s",
                                                    "first_name"                    : "o:s:***First name",
                                                    "last_name"                     : "o:s:/null/***Last name",
                                                    "address"                       : "o:s:/null/***Address",
                                                    "email"                         : "o:s:***Email address",
                                                    "instructions"                  : "o:s:/null/***Special instructions for officers",
                                                    "new_image_ids"                 : "o:a:/null/***File IDs of newly uploaded property images (from File/upload_file_base64 or multipart upload)",
                                                    "keep_images"                   : "o:a:/null/***URLs of existing property images to keep",
                                                },


            "search_residents"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Search residents in the officer's community by name, license plate, or address (SDS 3.10)",
                                                    "#token"                        : "s",
                                                    "search_text"                   : "s***Search term (matches name, license plate, or address)",
                                                },

};
