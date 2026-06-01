module.exports =
[
    {
        name: "bulk_action",
        id: "BAC_ID",
        insert_fields: ["BAC_SESSION_INFO", "BAC_STATUS", "BAC_MODULE", "BAC_METHOD", "BAC_DATA", "BAC_INFO", "BAC_CREATED_ON"],
        update_fields: ["BAC_STATUS", "BAC_INFO", "BAC_COMPLETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "file_multipart",
        id: "FMP_ID",
        insert_fields: ["FMP_USR_ID", "FMP_PARTS", "FMP_METADATA", "FMP_FILE_NAME", "FMP_ORIG_FILE_NAME"],
        update_fields: ["FMP_PARTS"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "key_value",
        id: "KVL_KEY",
        insert_fields: ["KVL_VALUE"],
        update_fields: ["KVL_VALUE"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "mailer_queue",
        id: "MQU_ID",
        insert_fields: ["MQU_EMAIL_TYPE", "MQU_DATA", "MQU_TRIAL", "MQU_IS_FAILED"],
        update_fields: ["MQU_TRIAL", "MQU_IS_FAILED"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "queue",
        id: "QUE_MSG_ID",
        insert_fields: ["QUE_ID", "QUE_TEXT"],
        update_fields: [],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "timed_message",
        id: "TIM_ID",
        insert_fields: ["TIM_TYPE", "TIM_DUE", "TIM_TEXT", "TIM_EXTRA_INDEX_INT", "TIM_EXTRA_INDEX_STR"],
        update_fields: [],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "user",
        id: "USR_ID",
        insert_fields: ["USR_OS_TYPE", "USR_OS_VERSION", "USR_DEVICE_MODEL", "USR_APP_VERSION"],
        update_fields: ["USR_OS_TYPE", "USR_OS_VERSION", "USR_DEVICE_MODEL", "USR_APP_VERSION"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "user_details",
        id: "USD_USR_ID",
        insert_fields: ["USD_TYPE", "USD_EMAIL", "USD_PHONE_NUM", "USD_DELETED_ON", "USD_STATUS", "USD_ROLE_ALLOW", "USD_ROLE_DENY", "USD_FIRST_NAME", "USD_LAST_NAME", "USD_IMAGE"],
        update_fields: ["USD_TYPE", "USD_EMAIL", "USD_PHONE_NUM", "USD_DELETED_ON", "USD_STATUS", "USD_ROLE_ALLOW", "USD_ROLE_DENY", "USD_FIRST_NAME", "USD_LAST_NAME", "USD_IMAGE"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
];