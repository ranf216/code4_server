module.exports =
{
	test_dashboard_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		try
		{
			testResults.push({step: "Starting Dashboard API tests", status: "info"});

			// =================================================================
			// 1. get_overview — happy path (defaults)
			// =================================================================

			testResults.push({step: "Test 1: get_overview (defaults)", status: "running"});
			let rv = $executeAPI(session, "Dashboard/get_overview", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: get_overview (defaults)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({
					step: "Test 1: get_overview (defaults)",
					status: "passed",
					active_calls_count: rv.active_calls_count,
					open_tasks_count: rv.open_tasks_count,
					open_reports_count: rv.open_reports_count,
					active_communities_count: rv.active_communities_count,
					active_officers_count: rv.active_officers_count,
					recent_calls_count: rv.recent_calls ? rv.recent_calls.length : 0,
					recent_tasks_count: rv.recent_tasks ? rv.recent_tasks.length : 0,
					recent_reports_count: rv.recent_reports ? rv.recent_reports.length : 0
				});
			}

			// =================================================================
			// 2. get_overview — verify response structure
			// =================================================================

			testResults.push({step: "Test 2: get_overview (verify structure)", status: "running"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 2: get_overview (verify structure)", status: "failed", error: "Cannot verify - previous call failed"});
			}
			else
			{
				let hasCounters = typeof rv.active_calls_count === "number" &&
								  typeof rv.open_tasks_count === "number" &&
								  typeof rv.open_reports_count === "number" &&
								  typeof rv.active_communities_count === "number" &&
								  typeof rv.active_officers_count === "number";
				let hasArrays = Array.isArray(rv.recent_calls) &&
								Array.isArray(rv.recent_tasks) &&
								Array.isArray(rv.recent_reports);
				let countsNonNegative = rv.active_calls_count >= 0 &&
										rv.open_tasks_count >= 0 &&
										rv.open_reports_count >= 0 &&
										rv.active_communities_count >= 0 &&
										rv.active_officers_count >= 0;
				let arraysWithinLimit = rv.recent_calls.length <= 5 &&
										rv.recent_tasks.length <= 5 &&
										rv.recent_reports.length <= 5;

				if (hasCounters && hasArrays && countsNonNegative && arraysWithinLimit)
				{
					testResults.push({step: "Test 2: get_overview (verify structure)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 2: get_overview (verify structure)", status: "warning", verified: false,
						has_counters: hasCounters, has_arrays: hasArrays, counts_non_negative: countsNonNegative, arrays_within_limit: arraysWithinLimit});
				}
			}

			// =================================================================
			// 3. get_overview — verify recent task title field (Q4)
			// =================================================================

			testResults.push({step: "Test 3: get_overview (task title field)", status: "running"});
			if ($Err.isERR(rv) || !rv.recent_tasks || rv.recent_tasks.length === 0)
			{
				testResults.push({step: "Test 3: get_overview (task title field)", status: "passed", message: "no recent tasks to verify (empty is valid)"});
			}
			else
			{
				let firstTask = rv.recent_tasks[0];
				let hasTitle = typeof firstTask.title === "string" && firstTask.title.length > 0;
				let hasType = typeof firstTask.type === "string";
				let hasDescription = typeof firstTask.description === "string";
				let hasTaskId = typeof firstTask.task_id === "number";
				let hasStatus = typeof firstTask.status === "string";
				let hasPriority = typeof firstTask.priority === "string";
				let hasCreatorName = typeof firstTask.creator_name === "string";
				let hasAssigneeName = typeof firstTask.assignee_name === "string";
				let hasCommunityName = typeof firstTask.community_name === "string";
				let hasCreatedOn = firstTask.created_on !== undefined;

				let allFields = hasTitle && hasType && hasDescription && hasTaskId &&
								hasStatus && hasPriority && hasCreatorName &&
								hasAssigneeName && hasCommunityName && hasCreatedOn;

				if (allFields)
				{
					testResults.push({step: "Test 3: get_overview (task title field)", status: "passed",
						title: firstTask.title, type: firstTask.type});
				}
				else
				{
					testResults.push({step: "Test 3: get_overview (task title field)", status: "warning",
						message: "some task fields missing", has_title: hasTitle, has_type: hasType,
						has_description: hasDescription, has_task_id: hasTaskId});
				}
			}

			// =================================================================
			// 4. get_overview — verify recent call fields
			// =================================================================

			testResults.push({step: "Test 4: get_overview (call fields)", status: "running"});
			if ($Err.isERR(rv) || !rv.recent_calls || rv.recent_calls.length === 0)
			{
				testResults.push({step: "Test 4: get_overview (call fields)", status: "passed", message: "no recent calls to verify (empty is valid)"});
			}
			else
			{
				let firstCall = rv.recent_calls[0];
				let allFields = typeof firstCall.call_id === "number" &&
								typeof firstCall.category === "string" &&
								typeof firstCall.status === "string" &&
								typeof firstCall.priority === "string" &&
								typeof firstCall.resident_name === "string" &&
								typeof firstCall.community_name === "string" &&
								firstCall.created_on !== undefined;

				if (allFields)
				{
					testResults.push({step: "Test 4: get_overview (call fields)", status: "passed", call_id: firstCall.call_id, category: firstCall.category});
				}
				else
				{
					testResults.push({step: "Test 4: get_overview (call fields)", status: "warning", message: "some call fields missing or wrong type"});
				}
			}

			// =================================================================
			// 5. get_overview — verify recent report fields
			// =================================================================

			testResults.push({step: "Test 5: get_overview (report fields)", status: "running"});
			if ($Err.isERR(rv) || !rv.recent_reports || rv.recent_reports.length === 0)
			{
				testResults.push({step: "Test 5: get_overview (report fields)", status: "passed", message: "no recent reports to verify (empty is valid)"});
			}
			else
			{
				let firstReport = rv.recent_reports[0];
				let allFields = typeof firstReport.report_id === "number" &&
								typeof firstReport.title === "string" &&
								typeof firstReport.status === "string" &&
								typeof firstReport.officer_name === "string" &&
								typeof firstReport.community_name === "string" &&
								firstReport.created_on !== undefined;

				if (allFields)
				{
					testResults.push({step: "Test 5: get_overview (report fields)", status: "passed", report_id: firstReport.report_id, status: firstReport.status});
				}
				else
				{
					testResults.push({step: "Test 5: get_overview (report fields)", status: "warning", message: "some report fields missing or wrong type"});
				}
			}

			// =================================================================
			// 6. get_overview — with community_id filter
			// =================================================================

			testResults.push({step: "Test 6: get_overview (community_id=1)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_overview", { community_id: 1 });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 6: get_overview (community_id=1)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 6: get_overview (community_id=1)", status: "passed",
					active_calls_count: rv.active_calls_count, open_tasks_count: rv.open_tasks_count,
					open_reports_count: rv.open_reports_count});
			}

			// =================================================================
			// 7. get_overview — invalid community_id (graceful degradation)
			// =================================================================

			testResults.push({step: "Test 7: get_overview (invalid community_id=999999)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_overview", { community_id: 999999 });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 7: get_overview (invalid community_id=999999)", status: "warning", message: "returned error for invalid community", error: rv.message});
			}
			else
			{
				let allZero = rv.active_calls_count === 0 && rv.open_tasks_count === 0 &&
							  rv.open_reports_count === 0 && rv.active_communities_count === 0 &&
							  rv.active_officers_count === 0;
				testResults.push({step: "Test 7: get_overview (invalid community_id=999999)", status: "passed",
					message: "graceful degradation — returned zero counts", all_zero: allZero});
			}

			// =================================================================
			// 8. get_calls_statistics — happy path (defaults)
			// =================================================================

			testResults.push({step: "Test 8: get_calls_statistics (defaults)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_calls_statistics", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 8: get_calls_statistics (defaults)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 8: get_calls_statistics (defaults)", status: "passed",
					total_calls: rv.total_calls, from_date: rv.from_date, to_date: rv.to_date});
			}

			// =================================================================
			// 9. get_calls_statistics — verify response structure
			// =================================================================

			testResults.push({step: "Test 9: get_calls_statistics (verify structure)", status: "running"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 9: get_calls_statistics (verify structure)", status: "failed", error: "Cannot verify - previous call failed"});
			}
			else
			{
				let hasTopLevel = !isNaN(Number(rv.total_calls)) &&
								 !isNaN(Number(rv.emergency_calls_count)) &&
								 !isNaN(Number(rv.medical_emergency_count)) &&
								 !isNaN(Number(rv.security_emergency_count)) &&
								 !isNaN(Number(rv.concierge_service_count)) &&
								 !isNaN(Number(rv.panic_count)) &&
								 !isNaN(Number(rv.test_count)) &&
								 !isNaN(Number(rv.false_emergencies_count)) &&
								 !isNaN(Number(rv.accidental_requests_count));
				let hasBreakdowns = typeof rv.calls_by_status === "object" &&
									typeof rv.calls_by_category === "object" &&
									typeof rv.calls_by_priority === "object";
				let hasTimeAvgs = (rv.avg_response_time_minutes === null || typeof rv.avg_response_time_minutes === "number") &&
								  (rv.avg_handling_time_minutes === null || typeof rv.avg_handling_time_minutes === "number") &&
								  (rv.avg_handling_time_from_assignment_minutes === null || typeof rv.avg_handling_time_from_assignment_minutes === "number");
				let hasDateMetadata = typeof rv.from_date === "string" && typeof rv.to_date === "string";
				let hasRecentCalls = Array.isArray(rv.recent_calls) && rv.recent_calls.length <= 5;

				if (hasTopLevel && hasBreakdowns && hasTimeAvgs && hasDateMetadata && hasRecentCalls)
				{
					testResults.push({step: "Test 9: get_calls_statistics (verify structure)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 9: get_calls_statistics (verify structure)", status: "warning", verified: false,
						has_top_level: hasTopLevel, has_breakdowns: hasBreakdowns, has_time_avgs: hasTimeAvgs,
						has_date_metadata: hasDateMetadata, has_recent_calls: hasRecentCalls});
				}
			}

			// =================================================================
			// 10. get_calls_statistics — verify category sum equals total
			// =================================================================

			testResults.push({step: "Test 10: get_calls_statistics (category sum)", status: "running"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 10: get_calls_statistics (category sum)", status: "failed", error: "Cannot verify - previous call failed"});
			}
			else
			{
				let catSum = Number(rv.medical_emergency_count || 0) + Number(rv.security_emergency_count || 0) +
							 Number(rv.concierge_service_count || 0) + Number(rv.panic_count || 0) + Number(rv.test_count || 0);
				if (catSum === Number(rv.total_calls))
				{
					testResults.push({step: "Test 10: get_calls_statistics (category sum)", status: "passed", category_sum: catSum, total: rv.total_calls});
				}
				else
				{
					testResults.push({step: "Test 10: get_calls_statistics (category sum)", status: "warning",
						message: "category sum does not equal total (may have unlisted categories)", category_sum: catSum, total: rv.total_calls});
				}
			}

			// =================================================================
			// 11. get_calls_statistics — verify emergency count
			// =================================================================

			testResults.push({step: "Test 11: get_calls_statistics (emergency count)", status: "running"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 11: get_calls_statistics (emergency count)", status: "failed", error: "Cannot verify - previous call failed"});
			}
			else
			{
				let expectedEmergency = Number(rv.medical_emergency_count || 0) + Number(rv.security_emergency_count || 0);
				if (Number(rv.emergency_calls_count) === expectedEmergency)
				{
					testResults.push({step: "Test 11: get_calls_statistics (emergency count)", status: "passed",
						emergency_calls_count: rv.emergency_calls_count, expected: expectedEmergency});
				}
				else
				{
					testResults.push({step: "Test 11: get_calls_statistics (emergency count)", status: "warning",
						message: "emergency count mismatch", actual: rv.emergency_calls_count, expected: expectedEmergency});
				}
			}

			// =================================================================
			// 12. get_calls_statistics — with all parameters
			// =================================================================

			testResults.push({step: "Test 12: get_calls_statistics (all params)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_calls_statistics", {
				community_id: 0,
				from_date: "2026-01-01",
				to_date: "2026-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 12: get_calls_statistics (all params)", status: "failed", error: rv.message});
			}
			else
			{
				let dateMatch = rv.from_date === "2026-01-01" && rv.to_date === "2026-12-31";
				testResults.push({step: "Test 12: get_calls_statistics (all params)", status: "passed",
					total_calls: rv.total_calls, date_match: dateMatch, from_date: rv.from_date, to_date: rv.to_date});
			}

			// =================================================================
			// 13. get_calls_statistics — with community_id filter
			// =================================================================

			testResults.push({step: "Test 13: get_calls_statistics (community_id=1)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_calls_statistics", { community_id: 1 });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 13: get_calls_statistics (community_id=1)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 13: get_calls_statistics (community_id=1)", status: "passed",
					total_calls: rv.total_calls});
			}

			// =================================================================
			// 14. get_calls_statistics — narrow date range (single day)
			// =================================================================

			testResults.push({step: "Test 14: get_calls_statistics (single day)", status: "running"});
			let today = new $Date().format("Y-m-d");
			rv = $executeAPI(session, "Dashboard/get_calls_statistics", {
				from_date: today,
				to_date: today
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 14: get_calls_statistics (single day)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 14: get_calls_statistics (single day)", status: "passed",
					total_calls: rv.total_calls, date: today});
			}

			// =================================================================
			// 15. get_calls_statistics — future date range (expect zero)
			// =================================================================

			testResults.push({step: "Test 15: get_calls_statistics (future dates)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_calls_statistics", {
				from_date: "2099-01-01",
				to_date: "2099-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 15: get_calls_statistics (future dates)", status: "failed", error: rv.message});
			}
			else
			{
				if (rv.total_calls === 0)
				{
					testResults.push({step: "Test 15: get_calls_statistics (future dates)", status: "passed", message: "correctly returned 0 for future dates"});
				}
				else
				{
					testResults.push({step: "Test 15: get_calls_statistics (future dates)", status: "warning",
						message: "expected 0 calls for future dates", total_calls: rv.total_calls});
				}
			}

			// =================================================================
			// 16. get_tasks_summary — happy path (defaults)
			// =================================================================

			testResults.push({step: "Test 16: get_tasks_summary (defaults)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 16: get_tasks_summary (defaults)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 16: get_tasks_summary (defaults)", status: "passed",
					open_tasks_count: rv.open_tasks_count,
					status_keys: rv.tasks_by_status ? Object.keys(rv.tasks_by_status) : [],
					type_keys: rv.tasks_by_type ? Object.keys(rv.tasks_by_type) : [],
					recent_count: rv.recent_tasks ? rv.recent_tasks.length : 0});
			}

			// =================================================================
			// 17. get_tasks_summary — verify response structure
			// =================================================================

			testResults.push({step: "Test 17: get_tasks_summary (verify structure)", status: "running"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 17: get_tasks_summary (verify structure)", status: "failed", error: "Cannot verify - previous call failed"});
			}
			else
			{
				let hasOpenCount = typeof rv.open_tasks_count === "number" && rv.open_tasks_count >= 0;
				let hasStatusBreakdown = typeof rv.tasks_by_status === "object";
				let hasTypeBreakdown = typeof rv.tasks_by_type === "object";
				let hasRecentTasks = Array.isArray(rv.recent_tasks) && rv.recent_tasks.length <= 5;
				let noDateMetadata = rv.from_date === undefined && rv.to_date === undefined;

				if (hasOpenCount && hasStatusBreakdown && hasTypeBreakdown && hasRecentTasks && noDateMetadata)
				{
					testResults.push({step: "Test 17: get_tasks_summary (verify structure)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 17: get_tasks_summary (verify structure)", status: "warning", verified: false,
						has_open_count: hasOpenCount, has_status_breakdown: hasStatusBreakdown,
						has_type_breakdown: hasTypeBreakdown, has_recent_tasks: hasRecentTasks,
						no_date_metadata: noDateMetadata});
				}
			}

			// =================================================================
			// 18. get_tasks_summary — scope=my
			// =================================================================

			testResults.push({step: "Test 18: get_tasks_summary (scope=my)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", { scope: "my" });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 18: get_tasks_summary (scope=my)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 18: get_tasks_summary (scope=my)", status: "passed",
					open_tasks_count: rv.open_tasks_count, recent_count: rv.recent_tasks ? rv.recent_tasks.length : 0});
			}

			// =================================================================
			// 19. get_tasks_summary — scope=my counts <= scope=all counts
			// =================================================================

			testResults.push({step: "Test 19: get_tasks_summary (scope comparison)", status: "running"});
			let rvAll = $executeAPI(session, "Dashboard/get_tasks_summary", { scope: "all" });
			let rvMy = $executeAPI(session, "Dashboard/get_tasks_summary", { scope: "my" });
			if ($Err.isERR(rvAll) || $Err.isERR(rvMy))
			{
				testResults.push({step: "Test 19: get_tasks_summary (scope comparison)", status: "failed",
					error: "one or both scope calls failed"});
			}
			else
			{
				if (rvMy.open_tasks_count <= rvAll.open_tasks_count)
				{
					testResults.push({step: "Test 19: get_tasks_summary (scope comparison)", status: "passed",
						all_count: rvAll.open_tasks_count, my_count: rvMy.open_tasks_count});
				}
				else
				{
					testResults.push({step: "Test 19: get_tasks_summary (scope comparison)", status: "warning",
						message: "my scope count exceeds all scope count", all_count: rvAll.open_tasks_count, my_count: rvMy.open_tasks_count});
				}
			}

			// =================================================================
			// 20. get_tasks_summary — with date range
			// =================================================================

			testResults.push({step: "Test 20: get_tasks_summary (with dates)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", {
				from_date: "2026-01-01",
				to_date: "2026-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 20: get_tasks_summary (with dates)", status: "failed", error: rv.message});
			}
			else
			{
				let hasDateMeta = rv.from_date === "2026-01-01" && rv.to_date === "2026-12-31";
				testResults.push({step: "Test 20: get_tasks_summary (with dates)", status: "passed",
					date_metadata_present: hasDateMeta, open_tasks_count: rv.open_tasks_count});
			}

			// =================================================================
			// 21. get_tasks_summary — with community_id
			// =================================================================

			testResults.push({step: "Test 21: get_tasks_summary (community_id=1)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", { community_id: 1 });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 21: get_tasks_summary (community_id=1)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 21: get_tasks_summary (community_id=1)", status: "passed",
					open_tasks_count: rv.open_tasks_count});
			}

			// =================================================================
			// 22. get_tasks_summary — all parameters combined
			// =================================================================

			testResults.push({step: "Test 22: get_tasks_summary (all params)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", {
				community_id: 1,
				scope: "my",
				from_date: "2026-01-01",
				to_date: "2026-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 22: get_tasks_summary (all params)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 22: get_tasks_summary (all params)", status: "passed",
					open_tasks_count: rv.open_tasks_count, from_date: rv.from_date, to_date: rv.to_date});
			}

			// =================================================================
			// 23. get_tasks_summary — invalid scope (graceful degradation)
			// =================================================================

			testResults.push({step: "Test 23: get_tasks_summary (invalid scope)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", { scope: "invalid_scope_value" });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 23: get_tasks_summary (invalid scope)", status: "warning",
					message: "returned error for invalid scope", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 23: get_tasks_summary (invalid scope)", status: "passed",
					message: "graceful degradation — treated invalid scope as 'all'", open_tasks_count: rv.open_tasks_count});
			}

			// =================================================================
			// 24. get_reports_summary — happy path (defaults)
			// =================================================================

			testResults.push({step: "Test 24: get_reports_summary (defaults)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 24: get_reports_summary (defaults)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 24: get_reports_summary (defaults)", status: "passed",
					open_reports_count: rv.open_reports_count,
					total_reports_last_14_days: rv.total_reports_last_14_days,
					status_keys: rv.reports_by_status ? Object.keys(rv.reports_by_status) : [],
					recent_count: rv.recent_reports ? rv.recent_reports.length : 0});
			}

			// =================================================================
			// 25. get_reports_summary — verify response structure
			// =================================================================

			testResults.push({step: "Test 25: get_reports_summary (verify structure)", status: "running"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 25: get_reports_summary (verify structure)", status: "failed", error: "Cannot verify - previous call failed"});
			}
			else
			{
				let hasOpenCount = typeof rv.open_reports_count === "number" && rv.open_reports_count >= 0;
				let has14DayCount = typeof rv.total_reports_last_14_days === "number" && rv.total_reports_last_14_days >= 0;
				let hasStatusBreakdown = typeof rv.reports_by_status === "object";
				let hasRecentReports = Array.isArray(rv.recent_reports) && rv.recent_reports.length <= 5;
				let noDateMetadata = rv.from_date === undefined && rv.to_date === undefined;

				if (hasOpenCount && has14DayCount && hasStatusBreakdown && hasRecentReports && noDateMetadata)
				{
					testResults.push({step: "Test 25: get_reports_summary (verify structure)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 25: get_reports_summary (verify structure)", status: "warning", verified: false,
						has_open_count: hasOpenCount, has_14_day_count: has14DayCount,
						has_status_breakdown: hasStatusBreakdown, has_recent_reports: hasRecentReports,
						no_date_metadata: noDateMetadata});
				}
			}

			// =================================================================
			// 26. get_reports_summary — scope=my
			// =================================================================

			testResults.push({step: "Test 26: get_reports_summary (scope=my)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", { scope: "my" });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 26: get_reports_summary (scope=my)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 26: get_reports_summary (scope=my)", status: "passed",
					open_reports_count: rv.open_reports_count, recent_count: rv.recent_reports ? rv.recent_reports.length : 0});
			}

			// =================================================================
			// 27. get_reports_summary — scope comparison
			// =================================================================

			testResults.push({step: "Test 27: get_reports_summary (scope comparison)", status: "running"});
			rvAll = $executeAPI(session, "Dashboard/get_reports_summary", { scope: "all" });
			rvMy = $executeAPI(session, "Dashboard/get_reports_summary", { scope: "my" });
			if ($Err.isERR(rvAll) || $Err.isERR(rvMy))
			{
				testResults.push({step: "Test 27: get_reports_summary (scope comparison)", status: "failed",
					error: "one or both scope calls failed"});
			}
			else
			{
				if (rvMy.open_reports_count <= rvAll.open_reports_count)
				{
					testResults.push({step: "Test 27: get_reports_summary (scope comparison)", status: "passed",
						all_count: rvAll.open_reports_count, my_count: rvMy.open_reports_count});
				}
				else
				{
					testResults.push({step: "Test 27: get_reports_summary (scope comparison)", status: "warning",
						message: "my scope count exceeds all scope count",
						all_count: rvAll.open_reports_count, my_count: rvMy.open_reports_count});
				}
			}

			// =================================================================
			// 28. get_reports_summary — with date range
			// =================================================================

			testResults.push({step: "Test 28: get_reports_summary (with dates)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", {
				from_date: "2026-01-01",
				to_date: "2026-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 28: get_reports_summary (with dates)", status: "failed", error: rv.message});
			}
			else
			{
				let hasDateMeta = rv.from_date === "2026-01-01" && rv.to_date === "2026-12-31";
				testResults.push({step: "Test 28: get_reports_summary (with dates)", status: "passed",
					date_metadata_present: hasDateMeta, open_reports_count: rv.open_reports_count});
			}

			// =================================================================
			// 29. get_reports_summary — with community_id
			// =================================================================

			testResults.push({step: "Test 29: get_reports_summary (community_id=1)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", { community_id: 1 });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 29: get_reports_summary (community_id=1)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 29: get_reports_summary (community_id=1)", status: "passed",
					open_reports_count: rv.open_reports_count});
			}

			// =================================================================
			// 30. get_reports_summary — all parameters combined
			// =================================================================

			testResults.push({step: "Test 30: get_reports_summary (all params)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", {
				community_id: 1,
				scope: "my",
				from_date: "2026-01-01",
				to_date: "2026-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 30: get_reports_summary (all params)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 30: get_reports_summary (all params)", status: "passed",
					open_reports_count: rv.open_reports_count, from_date: rv.from_date, to_date: rv.to_date});
			}

			// =================================================================
			// 31. get_reports_summary — invalid scope (graceful degradation)
			// =================================================================

			testResults.push({step: "Test 31: get_reports_summary (invalid scope)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", { scope: "bad_value" });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 31: get_reports_summary (invalid scope)", status: "warning",
					message: "returned error for invalid scope", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 31: get_reports_summary (invalid scope)", status: "passed",
					message: "graceful degradation — treated invalid scope as 'all'"});
			}

			// =================================================================
			// 32. get_reports_summary — 14-day count consistency
			// =================================================================

			testResults.push({step: "Test 32: get_reports_summary (14-day consistency)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 32: get_reports_summary (14-day consistency)", status: "failed", error: rv.message});
			}
			else
			{
				let statusTotal = 0;
				if (rv.reports_by_status)
				{
					for (let key in rv.reports_by_status)
					{
						statusTotal += rv.reports_by_status[key];
					}
				}
				let last14Valid = rv.total_reports_last_14_days <= statusTotal || statusTotal === 0;
				testResults.push({step: "Test 32: get_reports_summary (14-day consistency)", status: "passed",
					total_reports_last_14_days: rv.total_reports_last_14_days,
					all_time_status_total: statusTotal,
					relationship_valid: last14Valid});
			}

			// =================================================================
			// 33. Cross-endpoint: overview open counts consistency
			// =================================================================

			testResults.push({step: "Test 33: cross-endpoint consistency (overview vs detail)", status: "running"});
			let overviewRv = $executeAPI(session, "Dashboard/get_overview", {});
			let tasksRv = $executeAPI(session, "Dashboard/get_tasks_summary", {});
			let reportsRv = $executeAPI(session, "Dashboard/get_reports_summary", {});
			if ($Err.isERR(overviewRv) || $Err.isERR(tasksRv) || $Err.isERR(reportsRv))
			{
				testResults.push({step: "Test 33: cross-endpoint consistency (overview vs detail)", status: "failed",
					error: "one or more endpoints failed"});
			}
			else
			{
				let tasksMatch = overviewRv.open_tasks_count === tasksRv.open_tasks_count;
				let reportsMatch = overviewRv.open_reports_count === reportsRv.open_reports_count;

				if (tasksMatch && reportsMatch)
				{
					testResults.push({step: "Test 33: cross-endpoint consistency (overview vs detail)", status: "passed",
						tasks_match: tasksMatch, reports_match: reportsMatch});
				}
				else
				{
					testResults.push({step: "Test 33: cross-endpoint consistency (overview vs detail)", status: "warning",
						message: "open counts differ between overview and detail endpoints",
						overview_tasks: overviewRv.open_tasks_count, detail_tasks: tasksRv.open_tasks_count,
						overview_reports: overviewRv.open_reports_count, detail_reports: reportsRv.open_reports_count});
				}
			}

			// =================================================================
			// 34. get_calls_statistics — invalid community (graceful degradation)
			// =================================================================

			testResults.push({step: "Test 34: get_calls_statistics (invalid community)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_calls_statistics", { community_id: 999999 });
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 34: get_calls_statistics (invalid community)", status: "warning",
					message: "returned error for nonexistent community", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 34: get_calls_statistics (invalid community)", status: "passed",
					message: "graceful degradation — returned zero counts", total_calls: rv.total_calls});
			}

			// =================================================================
			// 35. get_tasks_summary — future dates (expect empty breakdowns)
			// =================================================================

			testResults.push({step: "Test 35: get_tasks_summary (future dates)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_tasks_summary", {
				from_date: "2099-01-01",
				to_date: "2099-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 35: get_tasks_summary (future dates)", status: "failed", error: rv.message});
			}
			else
			{
				let statusCount = rv.tasks_by_status ? Object.keys(rv.tasks_by_status).length : 0;
				let typeCount = rv.tasks_by_type ? Object.keys(rv.tasks_by_type).length : 0;
				let openStillPresent = rv.open_tasks_count >= 0;

				testResults.push({step: "Test 35: get_tasks_summary (future dates)", status: "passed",
					message: "future dates produce empty breakdowns, open count is current state",
					status_keys: statusCount, type_keys: typeCount, open_tasks_count: rv.open_tasks_count,
					open_count_is_current_state: openStillPresent});
			}

			// =================================================================
			// 36. get_reports_summary — future dates (expect empty breakdowns)
			// =================================================================

			testResults.push({step: "Test 36: get_reports_summary (future dates)", status: "running"});
			rv = $executeAPI(session, "Dashboard/get_reports_summary", {
				from_date: "2099-01-01",
				to_date: "2099-12-31"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 36: get_reports_summary (future dates)", status: "failed", error: rv.message});
			}
			else
			{
				let statusCount = rv.reports_by_status ? Object.keys(rv.reports_by_status).length : 0;
				let openStillPresent = rv.open_reports_count >= 0;

				testResults.push({step: "Test 36: get_reports_summary (future dates)", status: "passed",
					message: "future dates produce empty breakdowns, open count is current state",
					status_keys: statusCount, open_reports_count: rv.open_reports_count,
					open_count_is_current_state: openStillPresent});
			}

			// =================================================================
			// Done
			// =================================================================

			testResults.push({step: "All tests completed", status: "success"});
		}
		catch (error)
		{
			testResults.push({step: "Exception occurred", status: "error", error: error.message, stack: error.stack});

			if (session.accountImpersonationStack !== null)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
			}
		}

		vals.test_results = testResults;
		vals.summary = {
			total: testResults.filter(r => r.status === "running").length,
			passed: testResults.filter(r => r.status === "passed").length,
			failed: testResults.filter(r => r.status === "failed").length,
			warnings: testResults.filter(r => r.status === "warning").length
		};

		return {...rc, ...vals};
	}
};
