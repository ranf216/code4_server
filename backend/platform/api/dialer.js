module.exports =
{
    "get_twilio_token"                  : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                        },


    "start_dialer_session"              : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "entity_ids"                    : "a***array of entity IDs to queue for dialing",
                                            "entity_type"                   : "o:s:generic***entity type label for contextual reference (e.g. lead, contact, customer)",
                                        },


    "get_next_in_queue"                 : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "session_id"                    : "i***dialer session ID",
                                        },


    "log_call_result"                   : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "session_id"                    : "o:i:0***dialer session ID (0 if standalone call)",
                                            "entity_id"                     : "s***entity ID that was called",
                                            "phone"                         : "s***phone number dialed (E.164)",
                                            "direction"                     : "o:s:outbound***outbound or inbound",
                                            "result"                        : "s***answered, no_answer, voicemail, busy, failed",
                                            "duration_sec"                  : "o:i:0***call duration in seconds",
                                            "twilio_sid"                    : "o:s:***Twilio Call SID",
                                            "notes"                         : "o:s:***agent notes",
                                        },


    "pause_dialer"                      : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "session_id"                    : "i***dialer session ID",
                                        },


    "resume_dialer"                     : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "session_id"                    : "i***dialer session ID",
                                        },


    "end_dialer_session"                : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "session_id"                    : "i***dialer session ID",
                                        },


    "get_dialer_session_status"         : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "session_id"                    : "i***dialer session ID",
                                        },

    "send_sms"						    : {
                                            "@acl"                          : $Utils.allAuthedUserTypes(),
                                            "#token"                        : "s",
                                            "phone_number"					: "s",
                                            "message"					    : "s",
                                        },

};
