module.exports =
{
            "get_poi_list"                      : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get paginated list of POI/Trespass/Metro Red Card records. Admins see all statuses; officers see only active records for their community.",
                                                    "#token"                        : "s",
                                                    "community_id"                  : "o:i:0***Filter by community ID (admin only, 0 = all)",
                                                    "record_type"                   : "o:s:***Filter by record type: " + $DataItems.getListForApiDoc("poi_record_type"),
                                                    "status"                        : "o:s:***Filter by status: " + $DataItems.getListForApiDoc("poi_status"),
                                                    "threat_level"                  : "o:s:***Filter by threat level: " + $DataItems.getListForApiDoc("poi_threat_level"),
                                                    "expiring_within_days"          : "o:i:0***Filter records expiring within N days (0 = no filter)",
                                                    "search_text"                   : "o:s:***Free-text search across name, aliases, record ID, and summary",
                                                    "sort_by"                       : "o:s:created_on***Sort column: created_on, threat_level, name, last_update",
                                                    "sort_dir"                      : "o:s:desc***Sort direction: asc or desc",
                                                    "offset"                        : "o:i:0***Pagination offset",
                                                    "limit"                         : "o:i:20***Page size (max 100)",
                                                },


            "get_poi_record"                    : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get full POI record details. Officers see only active records for their community; internal notes and legal documents are hidden from officers.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                },


            "create_poi_record"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Create a new POI/Trespass/Metro Red Card record. Created in draft status unless publish=true.",
                                                    "#token"                        : "s",
                                                    "record_type"                   : "s***Record type: " + $DataItems.getListForApiDoc("poi_record_type"),
                                                    "first_name"                    : "s***First name (max 60 chars)",
                                                    "last_name"                     : "s***Last name (max 60 chars)",
                                                    "known_aliases"                 : "o:s:***Comma-separated aliases (max 200 chars)",
                                                    "date_of_birth"                 : "o:s:***Date of birth (YYYY-MM-DD)",
                                                    "gender"                        : "o:s:***Gender: " + $DataItems.getListForApiDoc("poi_gender"),
                                                    "physical_description"          : "o:s:***Physical description (max 500 chars)",
                                                    "threat_level"                  : "s***Threat level: " + $DataItems.getListForApiDoc("poi_threat_level"),
                                                    "summary"                       : "s***Summary of why flagged (max 300 chars, visible to officers)",
                                                    "internal_notes"                : "o:s:***Internal notes, manager-only (max 2000 chars)",
                                                    "community_ids"                 : "n***Array of community IDs to assign",
                                                    "photo_file_ids"                : "n***Array of photo file IDs (at least 1, max 10)",
                                                    "related_incident_ids"          : "o:n:***Array of related call/incident IDs",
                                                    "incident_history_summary"      : "o:s:***Incident history (POI only, max 1000 chars)",
                                                    "watch_level_review_date"       : "o:s:***Watch review date (POI only, YYYY-MM-DD)",
                                                    "associated_individuals"        : "o:s:***Associated individuals (POI only, max 500 chars)",
                                                    "trespass_notice_number"        : "o:s:***Notice reference number (Trespass only)",
                                                    "issuing_authority"             : "o:s:***Issuing authority (Trespass & Metro RC)",
                                                    "property_area_covered"         : "o:s:***Property/area covered (Trespass only)",
                                                    "issue_date"                    : "o:s:***Issue date (Trespass & Metro RC, YYYY-MM-DD)",
                                                    "expiry_date"                   : "o:s:***Expiry date (Trespass & Metro RC, YYYY-MM-DD)",
                                                    "notice_document_file_id"       : "o:s:***Notice document file ID (Trespass only)",
                                                    "renewal_reminder_days"         : "o:i:-1***Days before expiry for reminder (-1 = use settings default)",
                                                    "law_enforcement_contact"       : "o:s:***Law enforcement contact (Trespass only)",
                                                    "conditions"                    : "o:s:***Conditions on trespass order",
                                                    "red_card_number"               : "o:s:***Red card number (Metro RC only)",
                                                    "lines"                         : "o:s:***Transit lines/stations covered (Metro RC only)",
                                                    "card_document_file_id"         : "o:s:***Card document file ID (Metro RC only)",
                                                    "publish"                       : "o:b:false***If true, immediately publish (status=active). Otherwise save as draft.",
                                                },


            "update_poi_record"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Update a POI record. Only draft and active records can be edited. Some fields can be edited at any time; others trigger a version update on active records.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                    "first_name"                    : "o:s:/null/***First name (max 60 chars)",
                                                    "last_name"                     : "o:s:/null/***Last name (max 60 chars)",
                                                    "known_aliases"                 : "o:s:/null/***Comma-separated aliases (max 200 chars)",
                                                    "date_of_birth"                 : "o:s:/null/***Date of birth (YYYY-MM-DD)",
                                                    "gender"                        : "o:s:/null/***Gender: " + $DataItems.getListForApiDoc("poi_gender"),
                                                    "physical_description"          : "o:s:/null/***Physical description (max 500 chars)",
                                                    "threat_level"                  : "o:s:/null/***Threat level: " + $DataItems.getListForApiDoc("poi_threat_level"),
                                                    "summary"                       : "o:s:/null/***Summary (max 300 chars)",
                                                    "internal_notes"                : "o:s:/null/***Internal notes (max 2000 chars)",
                                                    "community_ids"                 : "o:n:/null/***Array of community IDs (replaces current sites)",
                                                    "photo_file_ids"                : "o:n:/null/***Array of photo file IDs (replaces current photos, at least 1, max 10)",
                                                    "related_incident_ids"          : "o:n:/null/***Array of related incident IDs (replaces current links)",
                                                    "incident_history_summary"      : "o:s:/null/***Incident history (POI only)",
                                                    "watch_level_review_date"       : "o:s:/null/***Watch review date (POI only, YYYY-MM-DD)",
                                                    "associated_individuals"        : "o:s:/null/***Associated individuals (POI only)",
                                                    "trespass_notice_number"        : "o:s:/null/***Notice number (Trespass only)",
                                                    "issuing_authority"             : "o:s:/null/***Issuing authority (Trespass & Metro RC)",
                                                    "property_area_covered"         : "o:s:/null/***Property/area (Trespass only)",
                                                    "issue_date"                    : "o:s:/null/***Issue date (YYYY-MM-DD)",
                                                    "expiry_date"                   : "o:s:/null/***Expiry date (YYYY-MM-DD)",
                                                    "notice_document_file_id"       : "o:s:/null/***Notice document file ID (Trespass)",
                                                    "renewal_reminder_days"         : "o:i:-1***Days before expiry for reminder (-1 = skip)",
                                                    "law_enforcement_contact"       : "o:s:/null/***Law enforcement contact (Trespass only)",
                                                    "conditions"                    : "o:s:/null/***Conditions (Trespass only)",
                                                    "red_card_number"               : "o:s:/null/***Red card number (Metro RC only)",
                                                    "lines"                         : "o:s:/null/***Transit lines (Metro RC only)",
                                                    "card_document_file_id"         : "o:s:/null/***Card document file ID (Metro RC)",
                                                },


            "publish_poi_record"                : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Publish a draft POI record (status changes to active). Sends push notifications to officers in assigned communities.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                    "notify_officers"               : "o:b:true***Send push notifications to officers in assigned communities",
                                                },


            "inactivate_poi_record"             : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Inactivate an active POI record with a mandatory reason. Sends notification to officers.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                    "reason"                        : "s***Mandatory inactivation reason",
                                                },


            "archive_poi_record"                : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Archive an expired or inactive POI record. Archived records cannot be re-activated.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                },


            "export_poi_record"                 : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN],
                                                    "@doc"                          : "Export a POI record as PDF. Logs the export with admin name and timestamp.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                },


            "get_poi_metadata"                  : {
                                                    "@acl"                          : [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Get POI metadata: record types, threat levels, statuses, genders, and response guidance texts.",
                                                    "#token"                        : "s",
                                                },


            "mark_viewed"                       : {
                                                    "@acl"                          : [$ACL.USER_TYPE_OFFICER],
                                                    "@doc"                          : "Officer marks a POI record as viewed. Updates or creates a view timestamp used for NEW/UPDATED badges.",
                                                    "#token"                        : "s",
                                                    "record_id"                     : "i***POI Record ID",
                                                },
};
