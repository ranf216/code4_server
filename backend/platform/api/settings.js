module.exports =
{
            "get_service_types"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
                                                    "@doc"                          : "Get list of service/incident types",
                                                    "#token"                        : "s",
                                                },


            "add_service_type"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Add a new service/incident type",
                                                    "#token"                        : "s",
                                                    "name"                          : "s***Name of the service type",
                                                },


            "update_service_type"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit a service/incident type name",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                    "name"                          : "s***New name for the service type",
                                                },


            "delete_service_type"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Delete a service/incident type",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                },


            "get_task_types"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get list of maintenance task types",
                                                    "#token"                        : "s",
                                                },


            "add_task_type"                     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Add a new maintenance task type",
                                                    "#token"                        : "s",
                                                    "name"                          : "s***Name of the task type",
                                                },


            "update_task_type"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit a maintenance task type name",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                    "name"                          : "s***New name for the task type",
                                                },


            "delete_task_type"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Delete a maintenance task type",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                },


            "get_asset_types"                   : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get list of asset types",
                                                    "#token"                        : "s",
                                                },


            "add_asset_type"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Add a new asset type",
                                                    "#token"                        : "s",
                                                    "name"                          : "s***Name of the asset type",
                                                },


            "update_asset_type"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit an asset type name",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                    "name"                          : "s***New name for the asset type",
                                                },


            "delete_asset_type"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Delete an asset type",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                },


            "get_po_section_types"              : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get list of post order section types",
                                                    "#token"                        : "s",
                                                },


            "add_po_section_type"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Add a new post order section type",
                                                    "#token"                        : "s",
                                                    "name"                          : "s***Name of the section type",
                                                    "client_visible"                : "b***Whether this section is visible to clients",
                                                },


            "update_po_section_type"            : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Edit a post order section type",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                    "name"                          : "s***New name for the section type",
                                                    "client_visible"                : "b***Whether this section is visible to clients",
                                                },


            "delete_po_section_type"            : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Delete a post order section type",
                                                    "#token"                        : "s",
                                                    "type_id"                       : "s***The type key identifier",
                                                },


            "get_gps_settings"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get GPS & tracking configuration",
                                                    "#token"                        : "s",
                                                },


            "update_gps_settings"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update GPS & tracking configuration",
                                                    "#token"                        : "s",
                                                    "gps_interval_normal"           : "o:i:30***GPS transmission interval in seconds during normal patrol (10-120). Default: 30",
                                                    "gps_interval_emergency"        : "o:i:10***GPS transmission interval in seconds during emergency (5-30). Default: 10",
                                                    "gps_stale_threshold"           : "o:i:2***Minutes without GPS update before alert. Default: 2",
                                                    "location_history_retention"    : "o:i:90***Days to retain GPS history. Default: 90",
                                                    "map_refresh_interval"          : "o:i:30***Portal map refresh interval in seconds. Default: 30",
                                                    "patrol_compliance_threshold"   : "o:i:15***Minutes overdue at waypoint before skip alert. Default: 15",
                                                    "emergency_eta_interval"        : "o:i:60***ETA recalculation interval in seconds. Default: 60",
                                                    "map_provider"                  : "o:s:google_maps***Map provider (google_maps). Default: google_maps",
                                                },


            "get_notification_settings"         : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get push notification settings",
                                                    "#token"                        : "s",
                                                },


            "update_notification_settings"      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update push notification settings",
                                                    "#token"                        : "s",
                                                    "notification_methods"          : "o:s:in_app,email,mobile***Comma-separated methods: in_app, email, mobile",
                                                    "sender_name"                   : "o:s:***Notification sender name",
                                                    "new_call_enabled"              : "o:b:true***Enable notification for new calls",
                                                    "call_accepted_enabled"         : "o:b:true***Enable notification for call accepted",
                                                    "call_edited_enabled"           : "o:b:true***Enable notification for call edited",
                                                    "call_resolved_enabled"         : "o:b:true***Enable notification for call resolved",
                                                    "post_order_published_enabled"  : "o:b:true***Enable notification for post order published",
                                                    "post_order_updated_enabled"    : "o:b:true***Enable notification for post order updated",
                                                    "poi_active_enabled"            : "o:b:true***Enable notification for new active POI",
                                                    "poi_updated_enabled"           : "o:b:true***Enable notification for POI updated",
                                                    "poi_inactivated_enabled"       : "o:b:true***Enable notification for POI inactivated",
                                                    "poi_expiring_enabled"          : "o:b:true***Enable notification for POI expiring soon",
                                                    "poi_expired_enabled"           : "o:b:true***Enable notification for POI expired",
                                                    "report_submitted_enabled"      : "o:b:true***Enable notification for report submitted",
                                                    "report_approved_enabled"       : "o:b:true***Enable notification for report approved",
                                                    "report_changes_enabled"        : "o:b:true***Enable notification for report changes requested",
                                                    "report_delivered_enabled"      : "o:b:true***Enable notification for report delivered",
                                                },


            "get_poi_settings"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get POI & Trespass settings",
                                                    "#token"                        : "s",
                                                },


            "update_poi_settings"               : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update POI & Trespass settings",
                                                    "#token"                        : "s",
                                                    "renewal_reminder_days"         : "o:i:14***Days before expiry to send renewal reminder. Default: 14",
                                                    "archive_threshold_months"      : "o:i:24***Months after expiry before eligible for archiving. Default: 24",
                                                    "pdf_export_enabled"            : "o:b:true***Whether PDF export is available. Default: true",
                                                    "default_poi_guidance"          : "o:s:***Default response guidance for Person of Interest records",
                                                    "default_trespass_guidance"     : "o:s:***Default response guidance for Trespass Order records",
                                                    "default_red_card_guidance"     : "o:s:***Default response guidance for Metro Red Card records",
                                                },


            "get_working_hours_settings"        : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Get working hours configuration",
                                                    "#token"                        : "s",
                                                },


            "update_working_hours_settings"     : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update working hours configuration",
                                                    "#token"                        : "s",
                                                    "max_hours_per_day"             : "o:i:8***Maximum working hours per day for officers. Default: 8",
                                                },

};
