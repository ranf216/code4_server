module.exports =
{
	"SYSTEM_NAME"														: "Code4",

	"SYSTEM_ERROR_REPORT_REST_SECS"										: 300,
	"SYSTEM_ERROR_REPORT_COUNT_BEFORE_REST"								: 5,

	"virtual_phone_nums"												: { // Enables login with virtual phone nubers and verification codes
		"phones"	: [
//							"+12125555555", List of virtual phone numbers
					],
		"codes"		: [
//							"1111", List of codes, corresponding the phone nmubers
					],
	},

	"SETTINGS_DEFAULTS"													: {
		"gps": {
			gps_interval_normal: 30,
			gps_interval_emergency: 10,
			gps_stale_threshold: 2,
			location_history_retention: 90,
			map_refresh_interval: 30,
			patrol_compliance_threshold: 15,
			emergency_eta_interval: 60,
			map_provider: "google_maps",
		},
		"notification": {
			notification_methods: "in_app,email,mobile",
			notification_title: "",
			sender_name: "",
			new_call_enabled: true,
			call_accepted_enabled: true,
			call_edited_enabled: true,
			call_resolved_enabled: true,
			post_order_published_enabled: true,
			post_order_updated_enabled: true,
			poi_active_enabled: true,
			poi_updated_enabled: true,
			poi_inactivated_enabled: true,
			poi_expiring_enabled: true,
			poi_expired_enabled: true,
			report_submitted_enabled: true,
			report_approved_enabled: true,
			report_changes_enabled: true,
			report_delivered_enabled: true,
		},
		"poi": {
			renewal_reminder_days: 14,
			archive_threshold_months: 24,
			pdf_export_enabled: true,
			default_poi_guidance: "This individual is flagged for awareness only. Do not approach, detain, or confront. Observe and report. If you observe this individual on site, document their presence, actions, and any interactions. Notify your supervisor immediately.",
			default_trespass_guidance: "This individual is subject to a formal trespass order and is prohibited from entering the specified property. If you observe this individual on site: (1) Do not use physical force unless lawfully justified. (2) Verbally advise the individual that they are trespassing and must leave. (3) If they refuse to leave, contact law enforcement. (4) Document the encounter using the incident reporting tool.",
			default_red_card_guidance: "This individual holds an active transit exclusion (Metro Red Card) and is prohibited from the specified transit facilities and surrounding areas. If you observe this individual: (1) Verbally advise them of their exclusion and request they leave. (2) If they refuse, contact Metro Transit Authority dispatch and local law enforcement. (3) Document the encounter. Do not use physical force unless lawfully justified.",
		},
		"working_hours": {
			max_hours_per_day: 8,
		},
	},
};
