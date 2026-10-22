module.exports =
{
    "test_settings"                         : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Settings module APIs (CRUD for data items + config settings)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_community"                        : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Community module APIs (CRUD for communities + featured officer)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_admin_user"                       : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Admin User module APIs (CRUD, password reset, search & sort)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_officer_apis"                     : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Officer module APIs (CRUD, evaluations, self-service, search & sort)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_resident_apis"                    : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Resident module APIs (CRUD, self-service, officer search, image management)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_notifications_apis"               : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Notification module APIs (CRUD, read status, bulk, template rendering, filters, pagination, deletion)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_call_apis"                        : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Call module APIs (create, get, update, cancel, accept, pass, resolve, assign, reaction, comment, add_call_document, delete_test_call)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_task_apis"                        : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Task module APIs (create, get, list, update, accept, approve, reject, complete, cancel, reassign, comment, media, metadata)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_asset_apis"                       : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Asset module APIs (asset CRUD, batch create, post CRUD, map zone CRUD, metadata, map upload)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_shift_apis"                       : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Shift module APIs (create, get, calendar, update, publish, cancel, delete, allocate, remove, assign_post, check_in, check_out, my_shifts, my_hours, allocation_board, validate, recurring)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_route_apis"                       : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Route module APIs (generate, get, update, push, visit_waypoint, compliance, route settings, error paths, officer impersonation, auto-completion)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_tracking_apis"                    : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Tracking module APIs (update_location, get_live_tracking, get_officer_location, get_officer_route_history, get_call_eta, error paths, ACL, boundary values)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_post_order_apis"                  : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Post Order module APIs (create, get, list, update, publish, archive, delete, version history, get version, acknowledge, state transitions, edge cases)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_poi_apis"                         : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all POI module APIs (create, get, list, update, publish, inactivate, archive, export, metadata, mark_viewed, officer view, state transitions, edge cases)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_report_template_apis"             : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Report Template module APIs (create, get, list, update, duplicate, activate, archive, delete, get_style, update_style, state transitions, edge cases)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_report_apis"                      : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Report module APIs (create from call / POI / standalone, update, submit, review lock, request changes, approve, deliver, PDF export, history, client view, metadata, access scoping, state transitions, edge cases)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                                "log_req_res"                   : "o:b:false***log request and response JSONs for each API call",
                                            },

    "test_dashboard_apis"                   : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Dashboard module APIs (get_overview, get_calls_statistics, get_tasks_summary, get_reports_summary, scope filtering, date ranges, community filtering, response structure, cross-endpoint consistency)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                                "log_req_res"                   : "o:b:false***log request and response JSONs for each API call",
                                            },

};
