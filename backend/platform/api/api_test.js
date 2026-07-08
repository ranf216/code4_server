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

};
