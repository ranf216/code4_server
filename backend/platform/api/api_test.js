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

};
