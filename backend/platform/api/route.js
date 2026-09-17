module.exports =
{
			// =================================================================
			// Route Generation & CRUD
			// =================================================================

			"generate_route"					: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Generate a patrol route for an officer in a shift. Creates waypoints from the community's active posts. Only one route per officer per shift.",
												"#token"						: "s",
												"shift_id"						: "i***Shift ID",
												"officer_id"					: "s***Officer user ID (must be allocated to the shift)",
												},


			"get_route"							: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
												"@doc"							: "Get route details with waypoints and visit data. Officers can only see routes assigned to them.",
												"#token"						: "s",
												"route_id"						: "i***Route ID",
												},


			"update_route"						: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Edit route waypoints (add/remove/reorder). Only draft routes can be updated. Send a full replacement array of waypoints.",
												"#token"						: "s",
												"route_id"						: "i***Route ID",
												"name"							: "o:s:/null/***Route display name",
												"waypoints"						: "s***JSON array of waypoint objects: [{name, lat, lng, post_id?, dwell_time_min?, priority?, notes?}, ...]",
												},


			"push_route"						: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Push a draft route to the officer's app. Transitions route status from draft to active and sends push notification.",
												"#token"						: "s",
												"route_id"						: "i***Route ID",
												},


			// =================================================================
			// Officer-facing
			// =================================================================

			"visit_waypoint"					: {
												"@acl"							: [$ACL.USER_TYPE_OFFICER],
												"@doc"							: "Officer marks a waypoint as visited. Optionally include GPS coordinates for compliance tracking.",
												"#token"						: "s",
												"waypoint_id"					: "i***Waypoint ID",
												"lat"							: "o:d:0***GPS latitude at time of visit",
												"lng"							: "o:d:0***GPS longitude at time of visit",
												"is_manual"						: "o:b:false***True if officer manually marked (GPS insufficient)",
												},


			// =================================================================
			// Compliance
			// =================================================================

			"get_route_compliance"				: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get route compliance report for a shift. Returns waypoint visit percentage, average dwell time vs planned, and per-waypoint details.",
												"#token"						: "s",
												"route_id"						: "i***Route ID",
												},
};
