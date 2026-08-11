module.exports =
[
    {
        name: "bulk_action",
        id: "BAC_ID",
        insert_fields: ["BAC_STATUS", "BAC_INFO", "BAC_COMPLETED_ON"],
        update_fields: ["BAC_STATUS", "BAC_INFO", "BAC_COMPLETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "call_log",
        id: "CLG_ID",
        insert_fields: ["CLG_ENTITY_ID", "CLG_USR_ID", "CLG_PHONE", "CLG_DIRECTION", "CLG_RESULT", "CLG_DURATION_SEC", "CLG_TWILIO_SID", "CLG_CREATED_ON"],
        update_fields: ["CLG_RESULT", "CLG_DURATION_SEC", "CLG_NOTES"],
        insert_custom: null,
        update_custom: null,
        log_delete: false,
    },
    {
        name: "dialer_session",
        id: "DLS_ID",
        insert_fields: ["DLS_USR_ID", "DLS_STATUS", "DLS_ENTITY_TYPE", "DLS_TOTAL_ITEMS", "DLS_CURRENT_INDEX", "DLS_CREATED_ON", "DLS_ENDED_ON"],
        update_fields: ["DLS_STATUS", "DLS_CURRENT_INDEX", "DLS_ENDED_ON"],
        insert_custom: null,
        update_custom: null,
        log_delete: false,
    },
    {
        name: "dialer_queue_item",
        id: "DQI_ID",
        insert_fields: ["DQI_DLS_ID", "DQI_ENTITY_ID", "DQI_ENTITY_TYPE", "DQI_ORDER", "DQI_STATUS", "DQI_CREATED_ON"],
        update_fields: ["DQI_STATUS", "DQI_CALL_RESULT", "DQI_DURATION_SEC", "DQI_CALLED_ON"],
        insert_custom: null,
        update_custom: null,
        log_delete: false,
    },
    {
        name: "file_multipart",
        id: "FMP_ID",
        insert_fields: ["FMP_USR_ID", "FMP_PARTS", "FMP_METADATA", "FMP_FILE_NAME", "FMP_ORIG_FILE_NAME", "FMP_CREATED_ON"],
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
        insert_fields: ["MQU_EMAIL_TYPE", "MQU_DATA", "MQU_TRIAL", "MQU_IS_FAILED", "MQU_CREATED_ON"],
        update_fields: ["MQU_TRIAL", "MQU_IS_FAILED"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "queue",
        id: "QUE_MSG_ID",
        insert_fields: ["QUE_ID", "QUE_TEXT", "QUE_CREATED_ON"],
        update_fields: [],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: true,
    },
    {
        name: "service",
        id: "SRV_ID",
        insert_fields: ["SRV_ACTIVE"],
        update_fields: ["SRV_ACTIVE"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "system_user",
        id: "STU_USER_NAME",
        insert_fields: ["STU_STATUS"],
        update_fields: ["STU_STATUS"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "timed_message",
        id: "TIM_ID",
        insert_fields: ["TIM_TYPE", "TIM_CREATED_ON", "TIM_DUE", "TIM_TEXT", "TIM_EXTRA_INDEX_INT", "TIM_EXTRA_INDEX_STR"],
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
        insert_fields: ["USD_TYPE", "USD_EMAIL", "USD_PHONE_NUM", "USD_DELETED_ON", "USD_STATUS", "USD_ROLE_ALLOW", "USD_ROLE_DENY", "USD_FIRST_NAME", "USD_LAST_NAME", "USD_IMAGE", "USD_COM_ID"],
        update_fields: ["USD_TYPE", "USD_EMAIL", "USD_PHONE_NUM", "USD_DELETED_ON", "USD_STATUS", "USD_ROLE_ALLOW", "USD_ROLE_DENY", "USD_FIRST_NAME", "USD_LAST_NAME", "USD_IMAGE", "USD_COM_ID"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
/*---------------------------------------------------------------*/
    {
        name: "community",
        id: "COM_ID",
        insert_fields: ["COM_NAME", "COM_AREA", "COM_LATITUDE", "COM_LONGITUDE", "COM_LOCATION_NAME", "COM_TIMEZONE", "COM_MAP_IMAGE", "COM_MAP_BOUNDARIES", "COM_IS_ACTIVE", "COM_LAST_UPDATE", "COM_DELETED_ON"],
        update_fields: ["COM_NAME", "COM_AREA", "COM_LATITUDE", "COM_LONGITUDE", "COM_LOCATION_NAME", "COM_TIMEZONE", "COM_MAP_IMAGE", "COM_MAP_BOUNDARIES", "COM_IS_ACTIVE", "COM_LAST_UPDATE", "COM_DELETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "data_item",
        id: "DIT_ID",
        insert_fields: ["DIT_NAME", "DIT_EXTRA", "DIT_LAST_UPDATE", "DIT_DELETED_ON"],
        update_fields: ["DIT_NAME", "DIT_EXTRA", "DIT_LAST_UPDATE", "DIT_DELETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "featured_officer",
        id: "FTO_ID",
        insert_fields: ["FTO_COM_ID", "FTO_IMAGE", "FTO_DESCRIPTION", "FTO_CREATED_ON", "FTO_LAST_UPDATE", "FTO_DELETED_ON"],
        update_fields: ["FTO_IMAGE", "FTO_DESCRIPTION", "FTO_LAST_UPDATE", "FTO_DELETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "officer",
        id: "OFC_USR_ID",
        insert_fields: ["OFC_TITLE", "OFC_DESCRIPTION", "OFC_ADDRESS", "OFC_ROLES", "OFC_CERTIFICATION_BADGES", "OFC_LAST_UPDATE", "OFC_DELETED_ON"],
        update_fields: ["OFC_TITLE", "OFC_DESCRIPTION", "OFC_ADDRESS", "OFC_ROLES", "OFC_CERTIFICATION_BADGES", "OFC_LAST_UPDATE", "OFC_DELETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "officer_evaluation",
        id: "OFE_ID",
        insert_fields: ["OFE_OFC_USR_ID", "OFE_TEXT", "OFE_DATE", "OFE_EVALUATOR_NAME", "OFE_DELETED_ON"],
        update_fields: ["OFE_TEXT", "OFE_DATE", "OFE_EVALUATOR_NAME", "OFE_DELETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "resident",
        id: "RES_USR_ID",
        insert_fields: ["RES_ADDRESS", "RES_VEHICLES", "RES_INSTRUCTIONS", "RES_IMAGES", "RES_COMMUNICATION_TEST", "RES_LAST_UPDATE", "RES_DELETED_ON"],
        update_fields: ["RES_ADDRESS", "RES_VEHICLES", "RES_INSTRUCTIONS", "RES_IMAGES", "RES_COMMUNICATION_TEST", "RES_LAST_UPDATE", "RES_DELETED_ON"],
        insert_custom: null, // Optional code to run after the insertion to change_log
        update_custom: null, // Optional code to run after the insertion to change_log
        log_delete: false,
    },
    {
        name: "service_call",
        id: "SVC_ID",
        insert_fields: ["SVC_STATUS", "SVC_OFC_USR_ID", "SVC_PRIORITY", "SVC_DESCRIPTION", "SVC_CURRENT_ADDRESS", "SVC_LATITUDE", "SVC_LONGITUDE", "SVC_SCHEDULED_DATE", "SVC_SCHEDULED_TIME_FROM", "SVC_SCHEDULED_TIME_TO", "SVC_MEDIA", "SVC_AUDIO", "SVC_VIDEO", "SVC_CONFIRMATION_MEDIA", "SVC_CONFIRMATION_VIDEO", "SVC_OFFICER_COMMENTS", "SVC_REACTION", "SVC_RESIDENT_COMMENT", "SVC_PASSED_BY", "SVC_ASSIGNED_BY", "SVC_ACCEPTED_ON", "SVC_RESOLVED_ON", "SVC_CANCELED_ON", "SVC_LAST_UPDATE", "SVC_DELETED_ON"],
        update_fields: ["SVC_STATUS", "SVC_OFC_USR_ID", "SVC_PRIORITY", "SVC_DESCRIPTION", "SVC_CURRENT_ADDRESS", "SVC_LATITUDE", "SVC_LONGITUDE", "SVC_SCHEDULED_DATE", "SVC_SCHEDULED_TIME_FROM", "SVC_SCHEDULED_TIME_TO", "SVC_MEDIA", "SVC_AUDIO", "SVC_VIDEO", "SVC_CONFIRMATION_MEDIA", "SVC_CONFIRMATION_VIDEO", "SVC_OFFICER_COMMENTS", "SVC_REACTION", "SVC_RESIDENT_COMMENT", "SVC_PASSED_BY", "SVC_ASSIGNED_BY", "SVC_ACCEPTED_ON", "SVC_RESOLVED_ON", "SVC_CANCELED_ON", "SVC_LAST_UPDATE", "SVC_DELETED_ON"],
        insert_custom: null,
        update_custom: null,
        log_delete: false,
    },
];