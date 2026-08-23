module.exports =
{
            "create_task"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Create a new maintenance task. The task is created with status 'new' and assigned to the specified user.",
                                                    "#token"                        : "s",
                                                    "task_type"                     : "s***Task type key: " + $DataItems.getListForApiDoc("task_type"),
                                                    "description"                   : "s***Task description (max 500 chars)",
                                                    "priority"                      : "o:s:normal***Priority: " + $DataItems.getListForApiDoc("task_priority"),
                                                    "address"                       : "o:s:***Location/address",
                                                    "assigned_to"                   : "o:s:***User ID to assign the task to. If omitted, auto-resolves to the community's default manager.",
                                                    "media_file_ids"                : "o:a:***File IDs of attached images (max 5, from File/upload_file_base64)",
                                                    "video_file_id"                 : "o:s:***File ID of video recording (max 1)",
                                                    "document_file_ids"             : "o:a:***File IDs of attached documents",
                                                },


            "get_tasks_list"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get paginated list of tasks. Officers see tasks in their community (assigned to them or created by them). Admins see all tasks.",
                                                    "#token"                        : "s",
                                                    "status"                        : "o:s:***Filter by status: " + $DataItems.getListForApiDoc("task_status"),
                                                    "task_type"                     : "o:s:***Filter by task type key",
                                                    "priority"                      : "o:s:***Filter by priority: " + $DataItems.getListForApiDoc("task_priority"),
                                                    "community_id"                  : "o:i:0***Filter by community ID (admin only, 0 = all)",
                                                    "is_open"                       : "o:b:/null/***Filter open tasks (new+accepted+approved) or closed (completed+rejected+canceled)",
                                                    "scope"                         : "o:s:all***Scope filter: all, assigned_to_me, created_by_me",
                                                    "search_text"                   : "o:s:***Free-text search across description, address, user names",
                                                    "date_from"                     : "o:s:***Filter tasks created from this date (YYYY-MM-DD)",
                                                    "date_to"                       : "o:s:***Filter tasks created up to this date (YYYY-MM-DD)",
                                                    "sort_by"                       : "o:s:created_on***Sort column: created_on, priority, status, task_type",
                                                    "sort_dir"                      : "o:s:desc***Sort direction: asc or desc",
                                                    "offset"                        : "o:i:0***Pagination offset",
                                                    "limit"                         : "o:i:20***Page size (max 100)",
                                                },


            "get_task"                          : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get full details of a single task including comments and media",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                },


            "update_task"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Update task details. Can update description, priority, address, ETA. Only allowed while task is in an open status.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "description"                   : "o:s:/null/***Updated description",
                                                    "priority"                      : "o:s:/null/***Updated priority: " + $DataItems.getListForApiDoc("task_priority"),
                                                    "address"                       : "o:s:/null/***Updated address",
                                                    "eta"                           : "o:s:/null/***ETA datetime (YYYY-MM-DD HH:mm:ss, admin only)",
                                                },


            "accept_task"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Accept a task. Changes status to 'accepted' and assigns the task to the current user. Task must be in status 'new'.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                },


            "approve_task"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_ROLE_PLANNING, $ACL.USER_ROLE_LOGISTICS, $ACL.USER_ROLE_FINANCE],
                                                    "@doc"                          : "Approve a task. Only for task types requiring approval (supply_request, damaged_equipment). Changes status from 'accepted' to 'approved'. Optionally reassigns the task back to the field officer.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "assigned_to"                   : "o:s:***Reassign task to this user (approve + reassign atomically)",
                                                },


            "reject_task"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Reject a task with a reason. Changes status to 'rejected'. Task must be in an open status (new or accepted).",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "comment"                       : "s***Rejection reason",
                                                },


            "complete_task"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Complete a task. Changes status to 'completed'. Task must be in status 'accepted' or 'approved'. Optionally add a resolution comment and confirmation media.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "comment"                       : "o:s:***Resolution comment",
                                                    "confirmation_media_file_ids"   : "o:a:***File IDs of confirmation images (max 5)",
                                                    "confirmation_video_file_id"    : "o:s:***File ID of confirmation video",
                                                },


            "cancel_task"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Cancel a task. Only the creator can cancel, and only while status is 'new'. Admins can cancel any open task.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                },


            "reassign_task"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Reassign a task to another user. Task must be in an open status.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "assigned_to"                   : "s***New assignee user ID",
                                                },


            "add_task_comment"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Add a comment to a task",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "comment"                       : "s***Comment text",
                                                },


            "add_task_media"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Upload media (images, video, or document) to a task. Max 5 images, 1 video, unlimited documents per upload.",
                                                    "#token"                        : "s",
                                                    "task_id"                       : "i***Task ID",
                                                    "media_file_ids"                : "o:a:***File IDs of images (max 5)",
                                                    "video_file_id"                 : "o:s:***File ID of video",
                                                    "document_file_ids"             : "o:a:***File IDs of documents",
                                                    "is_confirmation"               : "o:b:false***If true, media is marked as confirmation/resolution media",
                                                },


            "get_task_metadata"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get task types, statuses, and priorities for populating dropdowns",
                                                    "#token"                        : "s",
                                                },
};
