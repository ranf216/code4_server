module.exports =
{
            "create_call"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Create a new call (emergency, service, panic, or test). Officers can only create panic calls.",
                                                    "#token"                        : "s",
                                                    "category"                      : "s***Call category: medical_emergency, security_emergency, concierge_service, test, panic",
                                                    "service_type"                  : "o:s:***Service type key (required for concierge_service): " + $DataItems.getListForApiDoc("service_type"),
                                                    "description"                   : "o:s:***Call description",
                                                    "address"                       : "o:s:***Resident home address",
                                                    "current_address"               : "o:s:***Current location description (for emergencies)",
                                                    "latitude"                      : "o:s:***Current latitude",
                                                    "longitude"                     : "o:s:***Current longitude",
                                                    "priority"                      : "o:s:normal***Priority: urgent, important, normal, low",
                                                    "scheduled_date"                : "o:s:***Scheduled date YYYY-MM-DD (for concierge_service)",
                                                    "scheduled_time_from"           : "o:s:***Scheduled time range start HH:MM (for concierge_service)",
                                                    "scheduled_time_to"             : "o:s:***Scheduled time range end HH:MM (for concierge_service)",
                                                    "media_file_ids"                : "o:a:***File IDs of attached images (max 5, from File/upload_file_base64)",
                                                    "audio_file_id"                 : "o:s:***File ID of audio recording",
                                                    "video_file_id"                 : "o:s:***File ID of video recording",
                                                },


            "get_calls"                         : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Get paginated list of calls. Residents see own calls, officers see assigned calls, admins see all.",
                                                    "#token"                        : "s",
                                                    "status"                        : "o:s:***Filter by status: new, accepted, resolved, canceled",
                                                    "category"                      : "o:s:***Filter by category: medical_emergency, security_emergency, concierge_service, test, panic",
                                                    "community_id"                  : "o:i:0***Filter by community ID (admin only, 0 = all)",
                                                    "is_open"                       : "o:b:/null/***Filter open calls (new+accepted) or closed (resolved+canceled)",
                                                    "search_text"                   : "o:s:***Free-text search across description, address, resident name",
                                                    "sort_by"                       : "o:s:***Sort column: created_on, status, category, priority",
                                                    "sort_dir"                      : "o:s:desc***Sort direction: asc or desc",
                                                    "offset"                        : "o:i:0***Pagination offset",
                                                    "limit"                         : "o:i:20***Page size (max 100)",
                                                },


            "get_call"                          : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Get full details of a single call",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                },


            "update_call"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Update a call. Residents can update description, media, schedule, priority (only while status=new). Officers can update officer_comments and confirmation media (only while assigned and status=accepted).",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                    "description"                   : "o:s:/null/***Call description (resident only)",
                                                    "priority"                      : "o:s:***Priority: urgent, important, normal, low (resident only)",
                                                    "scheduled_date"                : "o:s:/null/***Scheduled date YYYY-MM-DD (resident only, concierge_service)",
                                                    "scheduled_time_from"           : "o:s:/null/***Scheduled time start HH:MM (resident only, concierge_service)",
                                                    "scheduled_time_to"             : "o:s:/null/***Scheduled time end HH:MM (resident only, concierge_service)",
                                                    "media_file_ids"                : "o:a:/null/***New media file IDs (resident only, max 5)",
                                                    "keep_media"                    : "o:a:/null/***URLs of existing media to keep (resident only)",
                                                    "audio_file_id"                 : "o:s:/null/***Audio file ID (resident only)",
                                                    "video_file_id"                 : "o:s:/null/***Video file ID (resident only)",
                                                    "officer_comments"              : "o:s:/null/***Officer comments (officer only)",
                                                    "confirmation_media_file_ids"   : "o:a:/null/***Officer confirmation image file IDs (officer only, max 5)",
                                                    "keep_confirmation_media"       : "o:a:/null/***URLs of existing confirmation media to keep (officer only)",
                                                    "confirmation_video_file_id"    : "o:s:/null/***Officer confirmation video file ID (officer only)",
                                                },


            "cancel_call"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT, $ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Cancel a service call. Only service calls in status new or accepted can be canceled. Emergency/panic calls cannot be canceled.",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                },


            "accept_call"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Officer accepts an emergency call (marks as 'on the way'). Call must be in status=new and category must be emergency.",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                },


            "pass_call"                         : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Officer passes on an emergency/panic call. The call disappears from this officer's open calls list but remains visible to all other officers in the community.",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                },


            "resolve_call"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Mark a call as resolved. Officer can resolve assigned calls in status=accepted. Admin can resolve panic calls.",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                    "officer_comments"              : "o:s:***Final officer comments",
                                                    "confirmation_media_file_ids"   : "o:a:***Officer confirmation image file IDs (max 5)",
                                                    "confirmation_video_file_id"    : "o:s:***Officer confirmation video file ID",
                                                },


            "assign_call"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Assign an officer to a service call. Call must be in status=new. Sets status to accepted.",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                    "officer_user_id"               : "s***Officer user ID to assign",
                                                },


            "add_reaction"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Add a like/dislike reaction to a resolved call (resident who created the call only)",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                    "reaction"                      : "i***Reaction: 1=like, -1=dislike",
                                                },


            "add_comment"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Add a comment to a resolved call (resident who created the call only)",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                    "comment"                       : "s***Resident comment text",
                                                },


            "delete_test_call"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Soft-delete a test call. Only calls with category=test can be deleted.",
                                                    "#token"                        : "s",
                                                    "call_id"                       : "i***Call ID",
                                                },

};
