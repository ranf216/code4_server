module.exports = {

	// Success
	"ERR_SUCCESS"										: {"rc" : 0,	"message" : "success"},
	"ERR_UNKNOWN_ERROR"									: {"rc" : 1,	"message" : "unknown error"},
	"ERR_API_CRASH"										: {"rc" : 2,	"message" : "unhandled error"},

	// API
	"ERR_API_SERVER_IS_NOT_ACTIVE"						: {"rc" : 100,	"message" : "api server is not active"},
	"ERR_INVALID_API_CALL"								: {"rc" : 101,	"message" : "invalid api call"},
	"ERR_MISSING_API_PARAM"								: {"rc" : 102,	"message" : "missing api param"},
	"ERR_NO_PRIVILEGES"									: {"rc" : 103,	"message" : "current user does not have privileges to perform this action"},
	"ERR_NOT_IMPLEMENTED"								: {"rc" : 104,	"message" : "api method is not implemented"},
	"ERR_INVALID_API_PARAM"								: {"rc" : 105,	"message" : "invalid api param"},
	"ERR_INVALID_USER_ROLE"								: {"rc" : 106,	"message" : "invalid user role"},
	"ERR_DEPRECATED_API"								: {"rc" : 107,	"message" : "deprecated api"},
	"ERR_INVALID_API_MODULE"							: {"rc" : 108,	"message" : "invalid api module"},
	"ERR_INVALID_PASSCODE"								: {"rc" : 109,	"message" : "invalid passcode"},
	"ERR_HTTP_ERROR"									: {"rc" : 110,	"message" : "HTTP error"},
	"ERR_DOWNLOAD_ERROR"								: {"rc" : 111,	"message" : "download error"},
	"ERR_INVALID_MODULE_OR_METHOD"						: {"rc" : 112,	"message" : "invalid module or method"},
	"ERR_NO_TOKEN_FOR_AUTHED_API_CALL"					: {"rc" : 113,	"message" : "no token provided for authenticated api call"},

	// User
	"ERR_INVALID_USER_TOKEN"							: {"rc" : 201,	"message" : "invalid user token"},
	"ERR_USER_NOT_FOUND"								: {"rc" : 202,	"message" : "invalid user or password"},
	"ERR_USER_NOT_EXISTS"								: {"rc" : 203,	"message" : "user does not exist"},
	"ERR_USER_ALREADY_EXISTS"							: {"rc" : 204,	"message" : "user already exists"},
	"ERR_INVALID_USER_TYPE"								: {"rc" : 205,	"message" : "invalid user type"},
	"ERR_INVALID_ACTIVATION_CODE"						: {"rc" : 206,	"message" : "invalid activation code"},
	"ERR_INVALID_FACEBOOK_ACCESS_TOKEN"					: {"rc" : 207,	"message" : "invalid facebook access token"},
	"ERR_INVALID_FACEBOOK_USER_ID"						: {"rc" : 208,	"message" : "invalid facebook user id"},
	"ERR_USER_FACEBOOK_AUTHENTICATION_ERROR"		    : {"rc" : 209,	"message" : "Facebook authentication exception"},
	"ERR_USER_FACEBOOK_AUTHENTICATION_FAILED"		    : {"rc" : 210,	"message" : "Facebook authentication failed"},
	"ERR_USER_FACEBOOK_ERROR_GETTING_PROFILE_PICTURE"  	: {"rc" : 211,	"message" : "Getting facebook profile picture failed",},
	"ERR_USER_FACEBOOK_LOGIN_NOT_ALLOWED"  				: {"rc" : 212,	"message" : "Login with Facebook is not allowed.",},
	"ERR_REQ_FIRST_NAME"								: {"rc" : 213,	"message" : "first name is a required parameter"},
	"ERR_REQ_LAST_NAME"									: {"rc" : 214,	"message" : "last name is a required parameter"},
	"ERR_REQ_EMAIL"										: {"rc" : 215,	"message" : "email is a required parameter"},
	"ERR_REQ_PASSWORD"									: {"rc" : 216,	"message" : "password is a required parameter"},
	"ERR_INVALIDATED_CAPTCHA"							: {"rc" : 217,	"message" : "invalidated captcha"},
	"ERR_ACCOUNT_IS_TEMPORARILY_LOCKED"					: {"rc" : 218,	"message" : "account is temporarily locked"},
	"ERR_INVALID_GOOGLE_USER_ID"						: {"rc" : 219,	"message" : "invalid google user id"},
	"ERR_USER_GOOGLE_AUTHENTICATION_FAILED"			    : {"rc" : 220,	"message" : "Goolge authentication failed"},
	"ERR_USER_GOOGLE_ERROR_GETTING_PROFILE_PICTURE"  	: {"rc" : 221,	"message" : "Getting Google profile picture failed",},
	"ERR_USER_GOOGLE_LOGIN_NOT_ALLOWED"  				: {"rc" : 222,	"message" : "Login with Google is not allowed.",},
	"ERR_INVALID_GOOGLE_ACCESS_TOKEN"					: {"rc" : 223,	"message" : "invalid Google access token"},
	"ERR_INVALID_PHONE_NUMBER"							: {"rc" : 224,	"message" : "invalid phone number"},
	"ERR_INVALID_PHONE_VERIFICATION_TRY_AGAIN"			: {"rc" : 225,	"message" : "invalid phone verification try again"},
	"ERR_INVALID_PHONE_VERIFICATION_SEND_NEW_CODE"		: {"rc" : 226,	"message" : "invalid phone verification send new code"},
	"ERR_INVALID_PHONE_AUTHORIZATION"					: {"rc" : 227,	"message" : "invalid phone authorization"},
	"ERR_USER_PHONE_NOT_FOUND"							: {"rc" : 228,	"message" : "user phone not found"},
	"ERR_INVALID_SOCIAL_AUTHORIZATION"					: {"rc" : 229,	"message" : "invalid social authorization"},
	"ERR_SOCIAL_USER_NOT_FOUND"							: {"rc" : 230,	"message" : "social user not found"},
	"ERR_USER_APPLE_LOGIN_NOT_ALLOWED"  				: {"rc" : 231,	"message" : "Login with Apple is not allowed.",},
	"ERR_INVALID_APPLE_USER_ID"							: {"rc" : 232,	"message" : "invalid Apple user id"},
	"ERR_INVALID_APPLE_ACCESS_TOKEN"					: {"rc" : 233,	"message" : "invalid Apple access token"},
	"ERR_USER_APPLE_AUTHENTICATION_FAILED"			    : {"rc" : 234,	"message" : "Apple authentication failed"},
	"ERR_INVALID_EMAIL_ADDRESS"						    : {"rc" : 235,	"message" : "invalid email address"},
	"ERR_INVALID_EMAIL_VERIFICATION_TRY_AGAIN"			: {"rc" : 236,	"message" : "invalid email verification try again"},
	"ERR_INVALID_EMAIL_VERIFICATION_SEND_NEW_CODE"		: {"rc" : 237,	"message" : "invalid email verification send new code"},
	"ERR_INVALID_EMAIL_AUTHORIZATION"					: {"rc" : 238,	"message" : "invalid email authorization"},
	"ERR_USER_EMAIL_NOT_FOUND"							: {"rc" : 239,	"message" : "user email not found"},
	"ERR_USER_EMAIL_ALREADY_EXISTS"						: {"rc" : 240,	"message" : "user with this email already exists"},
	"ERR_USER_PHONE_ALREADY_EXISTS"						: {"rc" : 241,	"message" : "user with this phone already exists"},
	"ERR_PASSWORD_NOT_MEET_CRITERIA"					: {"rc" : 242,	"message" : $Utils.getPasswordCriteriaError("password must have", "#CHARS# characters", "at least 1 lower case", "at least 1 upper case", "at least 1 number", "at least 1 special character")},
	"ERR_INVALID_VERIFICATION_FACTOR_TYPE"				: {"rc" : 243,	"message" : "Invalid verification factor type"},
	"ERR_INVALID_VERIFICATION_SEND_NEW_CODE"			: {"rc" : 244,	"message" : "Invalid verification send new code"},
	"ERR_NO_ACTION_TO_DO"								: {"rc" : 245,	"message" : "No action to do"},
	"ERR_INVALID_FACTOR_TYPE"							: {"rc" : 246,	"message" : "Invalid factor type"},
	"ERR_INVALID_PASSWORD"								: {"rc" : 247,	"message" : "Invalid password"},
	"ERR_NEW_PASSWORD_CANNOT_BE_SAME_AS_CURRENT"		: {"rc" : 248,	"message" : "The new password cannot be the same as the current password"},
	"ERR_AUTH_GRANT_IS_NOT_ENABLED"						: {"rc" : 249,	"message" : "Authentication grant is not enabled"},
	"ERR_INVALID_AUTH_GRANT"							: {"rc" : 250,	"message" : "Invalid authentication grant"},
	"ERR_AUTH_GRANT_IS_EXPIRED"							: {"rc" : 251,	"message" : "The authentication grant has expired"},

	// Image
	"ERR_IMAGE_NOT_FOUND"								: {"rc" : 301,	"message" : "image not found"},
	"ERR_INVALID_UPLOADED_IMAGE"						: {"rc" : 302,	"message" : "invalid uploaded image"},
	"ERR_INVALID_IMAGE_PARAMS"							: {"rc" : 303,	"message" : "invalid image params"},
	"ERR_INVALID_IMAGE_DATA"							: {"rc" : 304,	"message" : "invalid image data"},
	"ERR_UNSUPPORTED_IMAGE_TYPE"						: {"rc" : 305,	"message" : "unsupported image type"},

	// File
	"ERR_FILE_NOT_FOUND"								: {"rc" : 321,	"message" : "file not found"},
	"ERR_INVALID_UPLOADED_FILE"							: {"rc" : 322,	"message" : "invalid uploaded file"},
	"ERR_INVALID_FILE_PARAMS"							: {"rc" : 323,	"message" : "invalid file params"},
	"ERR_INVALID_FILE_TYPE"								: {"rc" : 324,	"message" : "invalid file type"},
	"ERR_INVALID_FILE_DATA"								: {"rc" : 325,	"message" : "invalid file data"},
	"ERR_INVALID_MULTIPART_UPLOAD_ID"					: {"rc" : 326,	"message" : "invalid multipart upload id"},
	"ERR_INVALID_MULTIPART_UPLOAD_PART_NUM"				: {"rc" : 327,	"message" : "invalid multipart upload part number"},
	"ERR_MISSING_MULTIPART_PARTS"						: {"rc" : 328,	"message" : "missing multipart parts"},
	"ERR_INCONSISTENT_MULTIPART_PARTS"					: {"rc" : 329,	"message" : "inconsistent multipart parts"},
	"ERR_FAILED_TO_WRITE_FILE"							: {"rc" : 330,	"message" : "failed to write file"},
	"ERR_MULTIPART_UPLOAD_PART_NUM_ALREADY_EXIST"		: {"rc" : 331,	"message" : "multipart upload part num already exist"},
	"ERR_INVALID_FILE_NAME"								: {"rc" : 332,	"message" : "invalid file name"},

	// S3
	"ERR_S3_FAILED_TO_SAVE_FILE"						: {"rc" : 341,	"message" : "s3 failed to save file"},
	"ERR_S3_FAILED_TO_CREATE_MULTIPART_UPLOAD"			: {"rc" : 342,	"message" : "s3 failed to create multipart upload"},
	"ERR_S3_FAILED_TO_SAVE_MULTIPART_ITEM"				: {"rc" : 343,	"message" : "s3 failed to save multipart item"},
	"ERR_S3_FAILED_TO_COMPLETE_MULTIPART_UPLOAD"		: {"rc" : 344,	"message" : "s3 failed to complete multipart upload"},
	"ERR_S3_FAILED_TO_GET_FILE"							: {"rc" : 345,	"message" : "s3 failed to get file"},
	"ERR_S3_FAILED_TO_DELETE_FILE"						: {"rc" : 346,	"message" : "s3 failed to delete file"},

	// Services
	"ERR_FAILED_TO_SEND_SMS"							: {"rc" : 361,	"message" : "failed to send sms"},
	"ERR_INVALID_SMS_PROVIDER"							: {"rc" : 362,	"message" : "invalid sms provider"},
	"ERR_NO_EMAIL_PROVIDER_SET"							: {"rc" : 363,	"message" : "no email provider set"},
	"ERR_FAILED_TO_SEND_EMAIL"							: {"rc" : 364,	"message" : "failed to send email"},
	"ERR_FAILED_TO_CREATE_ICAL_EVENT"					: {"rc" : 365,	"message" : "failed to create iCal event"},
	"ERR_JSONDB_INVALID_ID"								: {"rc" : 366,	"message" : "invalid id"},
	"ERR_JSONDB_MISMATCH_IDS_COUNT"						: {"rc" : 367,	"message" : "mismatch ids count"},
	"ERR_JSONDB_INVALID_INDEX"							: {"rc" : 368,	"message" : "invalid index"},
	"ERR_FAILED_TO_ALLOCATE_SHORT_CODE"					: {"rc" : 369,	"message" : "failed to allocate short code"},
	"ERR_INVALID_ACTION_ID"								: {"rc" : 370,	"message" : "Invalid action ID"},
	"ERR_ACTION_STILL_IN_PROGRESS"						: {"rc" : 371,	"message" : "Action still in progress"},
	"ERR_INVALID_LOG_ANALYZER_DATE"						: {"rc" : 372,	"message" : "Invalid date"},

	// DB
	"ERR_DB_GENERAL_ERROR"								: {"rc" : 400,	"message" : "DB general error"},
	"ERR_DB_INSERT_ERROR"								: {"rc" : 401,	"message" : "DB insert error"},
	"ERR_DB_UPDATE_ERROR"								: {"rc" : 402,	"message" : "DB update error"},
	"ERR_DB_DELETE_ERROR"								: {"rc" : 403,	"message" : "DB delete error"},
	"ERR_DB_INVALID_TABLE_NAME"							: {"rc" : 404,	"message" : "DB invalid table name"},
	"ERR_DB_TABLE_PRIMARY_KEY_NOT_SUPPORTED"			: {"rc" : 405,	"message" : "DB table's primary key is not supported"},
	"ERR_DB_INVALID_ROW_ID"								: {"rc" : 406,	"message" : "DB invalid row id"},
	"ERR_DB_INVALID_QUERY"								: {"rc" : 407,	"message" : "DB invalid query"},

	// Data Items
	"ERR_DATA_TABLE_SOURCE_IS_NOT_DB"					: {"rc" : 420,	"message" : "Data table source is not 'db'"},
	"ERR_DATA_TABLE_KEY_IS_MISSING"						: {"rc" : 421,	"message" : "Data table key is missing"},
	"ERR_DATA_TABLE_KEY_ALREADY_EXISTS"					: {"rc" : 422,	"message" : "Data table key already exists"},
	"ERR_DATA_TABLE_KEY_NOT_FOUND"						: {"rc" : 423,	"message" : "Data table key not found"},

	// Cache
	"ERR_CACHE_GENERAL_ERROR"							: {"rc" : 450,	"message" : "cache general error"},
	"ERR_CACHE_INVALID_DATA_COUNT"						: {"rc" : 451,	"message" : "cache put error: invalid data count"},
	"ERR_CACHE_WRITE_FAILED"							: {"rc" : 452,	"message" : "cache put error: failed to write file"},
	"ERR_CACHE_READ_FAILED"								: {"rc" : 453,	"message" : "cache get error: failed to read file"},
	"ERR_CACHE_DELETE_FAILED"							: {"rc" : 454,	"message" : "cache delete error: failed to delete file"},

	// Content

	// =============================================
	// Project-specific error codes (RC 500+)
	// =============================================

	// Community (500-519)
	"ERR_COMMUNITY_NOT_FOUND"							: {"rc" : 500,	"message" : "community not found"},
	"ERR_COMMUNITY_NAME_ALREADY_EXISTS"					: {"rc" : 501,	"message" : "a community with this name already exists"},
	"ERR_COMMUNITY_HAS_ACTIVE_OFFICERS"					: {"rc" : 502,	"message" : "cannot delete community with active officers"},
	"ERR_COMMUNITY_HAS_ACTIVE_RESIDENTS"				: {"rc" : 503,	"message" : "cannot delete community with active residents"},
	"ERR_COMMUNITY_HAS_ACTIVE_CALLS"					: {"rc" : 504,	"message" : "cannot delete community with active calls"},
	"ERR_COMMUNITY_IS_NOT_ACTIVE"						: {"rc" : 505,	"message" : "community is not active"},
	"ERR_FEATURED_OFFICER_NOT_FOUND"					: {"rc" : 506,	"message" : "featured officer not found"},

	// Officer (520-539)
	"ERR_OFFICER_NOT_FOUND"								: {"rc" : 520,	"message" : "officer not found"},
	"ERR_OFFICER_ALREADY_IN_COMMUNITY"					: {"rc" : 521,	"message" : "officer is already assigned to this community"},
	"ERR_OFFICER_HAS_ACTIVE_CALLS"						: {"rc" : 522,	"message" : "cannot delete officer with active calls"},
	"ERR_OFFICER_HAS_ACTIVE_SHIFTS"						: {"rc" : 523,	"message" : "cannot delete officer with active shifts"},
	"ERR_OFFICER_NOT_IN_COMMUNITY"						: {"rc" : 524,	"message" : "officer is not assigned to this community"},
	"ERR_OFFICER_NOT_ON_DUTY"							: {"rc" : 525,	"message" : "officer is not on duty"},
	"ERR_OFFICER_CANNOT_DELETE"							: {"rc" : 526,	"message" : "officer has logged in and cannot be deleted, only deactivated"},
	"ERR_OFFICER_EVALUATION_NOT_FOUND"					: {"rc" : 527,	"message" : "officer evaluation not found"},

	// Resident (540-559)
	"ERR_RESIDENT_NOT_FOUND"							: {"rc" : 540,	"message" : "resident not found"},
	"ERR_RESIDENT_HAS_ACTIVE_CALLS"						: {"rc" : 541,	"message" : "cannot modify resident with active calls"},
	"ERR_RESIDENT_ALREADY_EXISTS"						: {"rc" : 542,	"message" : "resident already exists in this community"},
	"ERR_RESIDENT_CANNOT_DELETE"						: {"rc" : 543,	"message" : "resident has activity and cannot be deleted, only deactivated"},

	// Call (560-589)
	"ERR_CALL_NOT_FOUND"								: {"rc" : 560,	"message" : "call not found"},
	"ERR_CALL_ALREADY_ACCEPTED"							: {"rc" : 561,	"message" : "call has already been accepted"},
	"ERR_CALL_ALREADY_RESOLVED"							: {"rc" : 562,	"message" : "call has already been resolved"},
	"ERR_CALL_ALREADY_CANCELED"							: {"rc" : 563,	"message" : "call has already been canceled"},
	"ERR_CALL_CANNOT_ACCEPT"							: {"rc" : 564,	"message" : "call cannot be accepted in its current status"},
	"ERR_CALL_CANNOT_RESOLVE"							: {"rc" : 565,	"message" : "call cannot be resolved in its current status"},
	"ERR_CALL_CANNOT_CANCEL"							: {"rc" : 566,	"message" : "call cannot be canceled in its current status"},
	"ERR_CALL_ACTIVE_EMERGENCY_EXISTS"					: {"rc" : 567,	"message" : "an active emergency call already exists"},
	"ERR_CALL_INVALID_CATEGORY"							: {"rc" : 568,	"message" : "invalid call category"},
	"ERR_CALL_INVALID_STATUS"							: {"rc" : 569,	"message" : "invalid call status"},
	"ERR_CALL_INVALID_PRIORITY"							: {"rc" : 570,	"message" : "invalid call priority"},
	"ERR_CALL_INVALID_SERVICE_TYPE"						: {"rc" : 571,	"message" : "invalid service type"},
	"ERR_CALL_MEDIA_LIMIT_REACHED"						: {"rc" : 572,	"message" : "maximum number of media files reached"},
	"ERR_CALL_NOT_ASSIGNED_TO_OFFICER"					: {"rc" : 573,	"message" : "call is not assigned to this officer"},
	"ERR_CALL_IS_NOT_TEST"								: {"rc" : 574,	"message" : "only test calls can be deleted"},

	// Task (590-609)
	"ERR_TASK_NOT_FOUND"								: {"rc" : 590,	"message" : "task not found"},
	"ERR_TASK_INVALID_STATUS"							: {"rc" : 591,	"message" : "invalid task status"},
	"ERR_TASK_CANNOT_ACCEPT"							: {"rc" : 592,	"message" : "task cannot be accepted in its current status"},
	"ERR_TASK_CANNOT_COMPLETE"							: {"rc" : 593,	"message" : "task cannot be completed in its current status"},
	"ERR_TASK_CANNOT_CANCEL"							: {"rc" : 594,	"message" : "task cannot be canceled in its current status"},
	"ERR_TASK_CANNOT_REJECT"							: {"rc" : 595,	"message" : "task cannot be rejected in its current status"},
	"ERR_TASK_INVALID_TYPE"								: {"rc" : 596,	"message" : "invalid task type"},

	// Shift (610-639)
	"ERR_SHIFT_NOT_FOUND"								: {"rc" : 610,	"message" : "shift not found"},
	"ERR_SHIFT_INVALID_STATUS"							: {"rc" : 611,	"message" : "invalid shift status"},
	"ERR_SHIFT_CANNOT_PUBLISH"							: {"rc" : 612,	"message" : "shift cannot be published in its current status"},
	"ERR_SHIFT_CANNOT_CANCEL"							: {"rc" : 613,	"message" : "shift cannot be canceled in its current status"},
	"ERR_SHIFT_OFFICER_ALREADY_ALLOCATED"				: {"rc" : 614,	"message" : "officer is already allocated to this shift"},
	"ERR_SHIFT_OFFICER_NOT_ALLOCATED"					: {"rc" : 615,	"message" : "officer is not allocated to this shift"},
	"ERR_SHIFT_OFFICER_CONFLICT"						: {"rc" : 616,	"message" : "officer has a scheduling conflict"},
	"ERR_SHIFT_ALREADY_CHECKED_IN"						: {"rc" : 617,	"message" : "officer has already checked in"},
	"ERR_SHIFT_NOT_CHECKED_IN"							: {"rc" : 618,	"message" : "officer has not checked in"},
	"ERR_SHIFT_INVALID_TIME_RANGE"						: {"rc" : 619,	"message" : "invalid shift time range"},

	// Route (640-659)
	"ERR_ROUTE_NOT_FOUND"								: {"rc" : 640,	"message" : "route not found"},
	"ERR_ROUTE_NO_POSTS_AVAILABLE"						: {"rc" : 641,	"message" : "no posts available for route generation"},
	"ERR_ROUTE_ALREADY_PUSHED"							: {"rc" : 642,	"message" : "route has already been pushed to officer"},
	"ERR_WAYPOINT_NOT_FOUND"							: {"rc" : 643,	"message" : "waypoint not found"},
	"ERR_WAYPOINT_ALREADY_VISITED"						: {"rc" : 644,	"message" : "waypoint has already been visited"},

	// Tracking (660-669)
	"ERR_TRACKING_INVALID_COORDINATES"					: {"rc" : 660,	"message" : "invalid GPS coordinates"},

	// Post Order (670-689)
	"ERR_POST_ORDER_NOT_FOUND"							: {"rc" : 670,	"message" : "post order not found"},
	"ERR_POST_ORDER_CANNOT_PUBLISH"						: {"rc" : 671,	"message" : "post order cannot be published in its current status"},
	"ERR_POST_ORDER_CANNOT_ARCHIVE"						: {"rc" : 672,	"message" : "post order cannot be archived in its current status"},
	"ERR_POST_ORDER_CANNOT_DELETE"						: {"rc" : 673,	"message" : "cannot delete a post order with published history"},
	"ERR_POST_ORDER_SECTION_NOT_FOUND"					: {"rc" : 674,	"message" : "post order section not found"},
	"ERR_POST_ORDER_ALREADY_ACKNOWLEDGED"				: {"rc" : 675,	"message" : "post order version already acknowledged"},
	"ERR_POST_ORDER_INVALID_SECTION_TYPE"				: {"rc" : 676,	"message" : "invalid post order section type"},

	// POI (690-709)
	"ERR_POI_RECORD_NOT_FOUND"							: {"rc" : 690,	"message" : "POI record not found"},
	"ERR_POI_INVALID_RECORD_TYPE"						: {"rc" : 691,	"message" : "invalid POI record type"},
	"ERR_POI_INVALID_THREAT_LEVEL"						: {"rc" : 692,	"message" : "invalid threat level"},
	"ERR_POI_CANNOT_PUBLISH"							: {"rc" : 693,	"message" : "POI record cannot be published in its current status"},
	"ERR_POI_CANNOT_INACTIVATE"							: {"rc" : 694,	"message" : "POI record cannot be inactivated in its current status"},
	"ERR_POI_CANNOT_ARCHIVE"							: {"rc" : 695,	"message" : "POI record cannot be archived in its current status"},

	// Report (710-729)
	"ERR_REPORT_NOT_FOUND"								: {"rc" : 710,	"message" : "report not found"},
	"ERR_REPORT_TEMPLATE_NOT_FOUND"						: {"rc" : 711,	"message" : "report template not found"},
	"ERR_REPORT_CANNOT_SUBMIT"							: {"rc" : 712,	"message" : "report cannot be submitted in its current status"},
	"ERR_REPORT_CANNOT_APPROVE"							: {"rc" : 713,	"message" : "report cannot be approved in its current status"},
	"ERR_REPORT_CANNOT_DELIVER"							: {"rc" : 714,	"message" : "report cannot be delivered in its current status"},

	// Notification (730-739)
	"ERR_NOTIFICATION_NOT_FOUND"						: {"rc" : 730,	"message" : "notification not found"},
	"ERR_NOTIFICATION_INVALID_TYPE"						: {"rc" : 731,	"message" : "invalid notification type"},
	"ERR_NOTIFICATION_ALREADY_READ"						: {"rc" : 732,	"message" : "notification is already marked as read"},

	// Settings (740-749)
	"ERR_SETTING_NOT_FOUND"								: {"rc" : 740,	"message" : "setting not found"},
	"ERR_SETTING_NAME_ALREADY_EXISTS"					: {"rc" : 741,	"message" : "a setting with this name already exists"},
	"ERR_GPS_INTERVAL_NORMAL_OUT_OF_RANGE"				: {"rc" : 742,	"message" : "gps_interval_normal out of range (must be 10-120)"},
	"ERR_GPS_INTERVAL_EMERGENCY_OUT_OF_RANGE"			: {"rc" : 743,	"message" : "gps_interval_emergency out of range (must be 5-30)"},

	// Asset & Post (750-769)
	"ERR_ASSET_NOT_FOUND"								: {"rc" : 750,	"message" : "asset not found"},
	"ERR_ASSET_INVALID_TYPE"							: {"rc" : 751,	"message" : "invalid asset type"},
	"ERR_POST_NOT_FOUND"								: {"rc" : 752,	"message" : "post not found"},
	"ERR_POST_NAME_ALREADY_EXISTS"						: {"rc" : 753,	"message" : "a post with this name already exists in this community"},
	"ERR_MAP_ZONE_NOT_FOUND"							: {"rc" : 754,	"message" : "map zone not found"},

	// Admin User (770-779)
	"ERR_ADMIN_USER_NOT_FOUND"							: {"rc" : 770,	"message" : "admin user not found"},
	"ERR_ADMIN_CANNOT_DELETE_SELF"						: {"rc" : 771,	"message" : "cannot delete your own account"},
	"ERR_ADMIN_CANNOT_EDIT_SELF_ROLE"					: {"rc" : 772,	"message" : "cannot change your own role"},

};
