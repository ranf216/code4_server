module.exports =
{
			"get_overview"					: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get dashboard overview — aggregate counts and recent items for the homepage dashboard cards",
												"#token"						: "s",
												"community_id"					: "o:i:0***Filter all counts/items to a specific community (0 = all communities)",
											},


			"get_calls_statistics"			: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get calls statistics with community and date-range filters (SDS 4.5.1.1). Returns response time averages, counts by category, canceled call counts.",
												"#token"						: "s",
												"community_id"					: "o:i:0***Filter to a specific community (0 = all)",
												"from_date"						: "o:s:***Start date for statistics window (YYYY-MM-DD). Default: last 30 days",
												"to_date"						: "o:s:***End date for statistics window (YYYY-MM-DD). Default: today",
											},


			"get_tasks_summary"				: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get tasks summary for dashboard (SDS 4.5.2). Returns open count, recent open tasks sorted by priority, breakdowns by status and type.",
												"#token"						: "s",
												"community_id"					: "o:i:0***Filter to a specific community (0 = all)",
												"scope"							: "o:s:all***'all' = all tasks, 'my' = tasks assigned to me",
												"from_date"						: "o:s:***Start date for breakdowns (YYYY-MM-DD). Omit for all-time",
												"to_date"						: "o:s:***End date for breakdowns (YYYY-MM-DD). Omit for all-time",
											},


			"get_reports_summary"			: {
												"@acl"							: [$ACL.USER_TYPE_ADMIN],
												"@doc"							: "Get incident reports summary for dashboard (SDS 4.5.5). Returns open count, total in last 14 days, recent open reports, breakdown by status.",
												"#token"						: "s",
												"community_id"					: "o:i:0***Filter to a specific community (0 = all)",
												"scope"							: "o:s:all***'all' = all reports, 'my' = reports where I am the reviewer",
												"from_date"						: "o:s:***Start date for breakdowns (YYYY-MM-DD). Omit for all-time",
												"to_date"						: "o:s:***End date for breakdowns (YYYY-MM-DD). Omit for all-time",
											},
};
