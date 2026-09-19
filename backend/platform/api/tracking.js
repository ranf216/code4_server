module.exports =
{
			// =================================================================
			// Officer-facing — location updates
			// =================================================================

			"update_location"					: {
												"@acl"							: [$ACL.USER_TYPE_OFFICER],
												"@doc"							: "Officer sends a GPS location update. Stores the current position in the GPS log for live tracking and history.",
												"#token"						: "s",
												"latitude"						: "d***GPS latitude (-90 to 90)",
												"longitude"						: "d***GPS longitude (-180 to 180)",
												"accuracy"						: "o:d:0***GPS accuracy in metres (0 = unknown)",
												"speed"							: "o:d:0***Speed in m/s (0 = unknown)",
												"heading"						: "o:d:0***Heading/bearing in degrees 0-360 (0 = unknown)",
												"altitude"						: "o:d:0***Altitude in metres (0 = unknown)",
												"source"						: "o:s:gps***Location source: " + $DataItems.getListForApiDoc("tracking_source"),
												"shift_id"						: "o:i:0***Active shift ID (0 = not on duty)",
												"call_id"						: "o:i:0***Active call ID (0 = not responding to a call)",
												},


			// =================================================================
			// Admin-facing — live tracking & history
			// =================================================================

			"get_live_tracking"					: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get all checked-in officers' latest GPS positions for the live tracking map. Returns one entry per officer with current status, shift, and active call information.",
												"#token"						: "s",
												"community_id"					: "o:i:0***Filter by community ID (0 = all accessible communities)",
												},


			"get_officer_location"				: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get a specific officer's current location and status details.",
												"#token"						: "s",
												"officer_id"					: "s***Officer user ID",
												},


			"get_officer_route_history"			: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get an officer's GPS track for a time range. Returns an array of location points ordered chronologically.",
												"#token"						: "s",
												"officer_id"					: "s***Officer user ID",
												"date_from"						: "s***Start datetime (YYYY-MM-DD HH:MM:SS)",
												"date_to"						: "s***End datetime (YYYY-MM-DD HH:MM:SS)",
												"shift_id"						: "o:i:0***Filter by shift ID (0 = all shifts)",
												},


			// =================================================================
			// ETA — officer & resident facing
			// =================================================================

			"get_call_eta"						: {
												"@acl"							: [$ACL.USER_TYPE_OFFICER, $ACL.USER_TYPE_RESIDENT],
												"@doc"							: "Get ETA for an active emergency call. Calculates straight-line distance from the responding officer's last known location to the call location. Returns distance and estimated arrival time.",
												"#token"						: "s",
												"call_id"						: "i***Call ID",
												},
};
