module.exports =
{
			// =================================================================
			// Shift Calendar & CRUD
			// =================================================================

			"get_shifts_calendar"				: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Get shifts for calendar view (day/week/month). Returns shifts for the specified date range.",
													"#token"						: "s",
													"community_id"					: "o:i:0***Community ID (0 = all accessible communities)",
													"date_from"						: "s***Start date (YYYY-MM-DD)",
													"date_to"						: "s***End date (YYYY-MM-DD)",
													"officer_id"					: "o:s:***Filter by officer user ID",
													"status"						: "o:s:***Filter by shift status: " + $DataItems.getListForApiDoc("shift_status"),
													"search_text"					: "o:s:***Free-text search across officer name and community name",
												},


			"get_shift"							: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_OFFICER],
													"@doc"							: "Get shift details including allocated officers and post assignments",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
												},


			"create_shift"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Create a new shift",
													"#token"						: "s",
													"community_id"					: "i***Community ID",
													"shift_date"					: "s***Shift date (YYYY-MM-DD)",
													"start_time"					: "s***Start time (HH:MM, 24h)",
													"end_time"						: "s***End time (HH:MM, 24h)",
													"officer_ids"					: "o:a:***Array of officer user IDs to allocate",
													"notes"							: "o:s:***Free text notes (max 500 chars)",
												},


			"update_shift"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Update shift details. Only draft and published shifts can be updated.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
													"shift_date"					: "o:s:/null/***Shift date (YYYY-MM-DD)",
													"start_time"					: "o:s:/null/***Start time (HH:MM, 24h)",
													"end_time"						: "o:s:/null/***End time (HH:MM, 24h)",
													"notes"							: "o:s:/null/***Free text notes (max 500 chars)",
												},


			"delete_shift"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Delete a draft shift. Only shifts in draft status can be deleted.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
												},


			// =================================================================
			// Shift Lifecycle
			// =================================================================

			"publish_shift"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Publish a draft shift. Sends push notification to all allocated officers. Pass acknowledge_conflicts=true to override scheduling warnings.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
													"acknowledge_conflicts"			: "o:b:false***Set true to acknowledge and override scheduling conflict warnings",
												},


			"cancel_shift"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Cancel a published or draft shift. Sends cancellation notification to allocated officers.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
												},


			// =================================================================
			// Officer Allocation
			// =================================================================

			"allocate_officer"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Allocate an officer to a shift. Returns warnings if conflicts detected. Pass acknowledge_conflicts=true to proceed despite warnings.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
													"officer_id"					: "s***Officer user ID",
													"acknowledge_conflicts"			: "o:b:false***Set true to acknowledge and override scheduling conflict warnings",
												},


			"remove_officer"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Remove an officer from a shift",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
													"officer_id"					: "s***Officer user ID",
												},


			// =================================================================
			// Post Assignment
			// =================================================================

			"assign_post"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Assign a post to an officer in a shift. The officer must already be allocated to the shift.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
													"officer_id"					: "s***Officer user ID",
													"post_id"						: "i***Post ID",
												},


			// =================================================================
			// Check-in / Check-out
			// =================================================================

			"check_in"							: {
													"@acl"							: [$ACL.USER_TYPE_OFFICER],
													"@doc"							: "Officer checks in for a shift. Shift must be published or active.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
												},


			"check_out"							: {
													"@acl"							: [$ACL.USER_TYPE_OFFICER],
													"@doc"							: "Officer checks out from a shift",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
												},


			// =================================================================
			// Officer-facing
			// =================================================================

			"get_my_shifts"						: {
													"@acl"							: [$ACL.USER_TYPE_OFFICER],
													"@doc"							: "Get officer's own shifts list (published, active, or completed)",
													"#token"						: "s",
													"date_from"						: "o:s:***Start date filter (YYYY-MM-DD)",
													"date_to"						: "o:s:***End date filter (YYYY-MM-DD)",
													"status"						: "o:s:***Filter by status: " + $DataItems.getListForApiDoc("shift_status"),
													"page"							: "o:i:0***Page number (0-based)",
												},


			"get_my_hours"						: {
													"@acl"							: [$ACL.USER_TYPE_OFFICER],
													"@doc"							: "Get officer's check-in/check-out hours history",
													"#token"						: "s",
													"date_from"						: "o:s:***Start date filter (YYYY-MM-DD)",
													"date_to"						: "o:s:***End date filter (YYYY-MM-DD)",
													"page"							: "o:i:0***Page number (0-based)",
												},


			// =================================================================
			// Allocation Board & Validation
			// =================================================================

			"get_allocation_board"				: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Get available officers and shifts for a date and community (allocation board data)",
													"#token"						: "s",
													"community_id"					: "i***Community ID",
													"board_date"					: "s***Date to show (YYYY-MM-DD)",
												},


			"validate_allocation"				: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Check for scheduling conflicts: double-booking, overtime, rest gap",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID",
													"officer_id"					: "s***Officer user ID",
												},


			// =================================================================
			// Recurring Shifts
			// =================================================================

			"create_recurring_shifts"			: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Create a series of recurring shifts",
													"#token"						: "s",
													"community_id"					: "i***Community ID",
													"start_date"					: "s***First shift date (YYYY-MM-DD)",
													"start_time"					: "s***Start time (HH:MM, 24h)",
													"end_time"						: "s***End time (HH:MM, 24h)",
													"recurrence_pattern"			: "s***Pattern: " + $DataItems.getListForApiDoc("shift_recurrence_pattern"),
													"repeat_on"						: "o:n:***Array of day numbers (0=Sun..6=Sat) for specific_days pattern",
													"interval_days"					: "o:i:0***Interval for every_x_days pattern",
													"end_type"						: "s***End condition: " + $DataItems.getListForApiDoc("shift_recurrence_end_type"),
													"end_date"						: "o:s:***End date (YYYY-MM-DD) when end_type=end_date",
													"occurrences"					: "o:i:0***Number of occurrences when end_type=occurrences (max 365)",
													"officer_ids"					: "o:a:***Array of officer user IDs to allocate to all shifts",
													"notes"							: "o:s:***Free text notes (max 500 chars)",
												},


			"update_recurring_shifts"			: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@doc"							: "Update recurring shifts. Scope controls which shifts in the series are affected.",
													"#token"						: "s",
													"shift_id"						: "i***Shift ID (the shift being edited)",
													"scope"							: "s***Update scope: " + $DataItems.getListForApiDoc("shift_update_scope"),
													"start_time"					: "o:s:/null/***Start time (HH:MM, 24h)",
													"end_time"						: "o:s:/null/***End time (HH:MM, 24h)",
													"notes"							: "o:s:/null/***Free text notes (max 500 chars)",
												},
};
