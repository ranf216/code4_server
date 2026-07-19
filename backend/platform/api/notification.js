module.exports =
{
            "get_notifications"                 : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Get paginated list of notifications for the current user",
                                                    "#token"                        : "s",
                                                    "is_read"                       : "o:b:/null/***Filter by read status: true=read only, false=unread only, omit=all",
                                                    "type"                          : "o:s:***Filter by notification type",
                                                    "from_date"                     : "o:s:***Filter notifications created on or after this date (YYYY-MM-DD)",
                                                    "to_date"                       : "o:s:***Filter notifications created on or before this date (YYYY-MM-DD)",
                                                    "offset"                        : "o:i:0***Pagination offset",
                                                    "limit"                         : "o:i:20***Page size (max 100)",
                                                },


            "get_unread_count"                  : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Get the count of unread notifications for the current user",
                                                    "#token"                        : "s",
                                                },


            "mark_as_read"                      : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Mark a specific notification as read",
                                                    "#token"                        : "s",
                                                    "notification_id"               : "i***Notification ID",
                                                },


            "mark_all_as_read"                  : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Mark all unread notifications as read for the current user",
                                                    "#token"                        : "s",
                                                },


            "create_notification"               : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Create a notification for a target user. Used internally by other modules via $executeAPI. Either provide title+message directly, or omit them and provide template_vars to use the type's default template.",
                                                    "#token"                        : "s",
                                                    "target_user_id"                : "s***Recipient user ID",
                                                    "type"                          : "s***Notification type key: " + $DataItems.getListForApiDoc("notification_type"),
                                                    "title"                         : "o:s:***Notification title (optional if template_vars provided)",
                                                    "message"                       : "o:s:***Notification message text (optional if template_vars provided)",
                                                    "template_vars"                 : "o:s:/null/***JSON object with placeholder values for template rendering (e.g. {officer_name, call_number})",
                                                    "payload"                       : "o:s:***JSON string with additional data for deep linking (entity_type, entity_id, etc.)",
                                                    "community_id"                  : "o:i:0***Community context ID",
                                                    "send_push"                     : "o:b:true***Also send a push notification via FCM",
                                                },


            "create_bulk_notifications"         : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Create notifications for multiple users at once. Used internally by other modules via $executeAPI. Either provide title+message directly, or omit them and provide template_vars to use the type's default template.",
                                                    "#token"                        : "s",
                                                    "target_user_ids"               : "a***Array of recipient user IDs",
                                                    "type"                          : "s***Notification type key: " + $DataItems.getListForApiDoc("notification_type"),
                                                    "title"                         : "o:s:***Notification title (optional if template_vars provided)",
                                                    "message"                       : "o:s:***Notification message text (optional if template_vars provided)",
                                                    "template_vars"                 : "o:s:/null/***JSON object with placeholder values for template rendering (e.g. {officer_name, call_number})",
                                                    "payload"                       : "o:s:***JSON string with additional data for deep linking",
                                                    "community_id"                  : "o:i:0***Community context ID",
                                                    "send_push"                     : "o:b:true***Also send push notifications via FCM",
                                                },


            "delete_notification"               : {
                                                    "@acl"                          : $Utils.allAuthedUserTypes(),
                                                    "@doc"                          : "Soft-delete a notification (only the notification owner can delete)",
                                                    "#token"                        : "s",
                                                    "notification_id"               : "i***Notification ID",
                                                },
};
