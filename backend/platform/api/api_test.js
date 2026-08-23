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
                                                "@doc"                          : "Test all Call module APIs (create, get, update, cancel, accept, pass, resolve, assign, reaction, comment, delete_test_call)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

    "test_task_apis"                        : {
                                                "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                "@doc"                          : "Test all Task module APIs (create, get, list, update, accept, approve, reject, complete, cancel, reassign, comment, media, metadata)",
                                                "@mode"                         : "test",
                                                "#token"                        : "s",
                                            },

};
