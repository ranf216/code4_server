module.exports =
{
	test_route_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let testOfficerId = null;
		let testOfficerId2 = null;
		let testPostId1 = null;
		let testPostId2 = null;
		let testPostId3 = null;
		let testShiftId = null;
		let testRouteId = null;
		let testRouteId2 = null;

		try
		{
			testResults.push({step: "Starting Route API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);
			let testOfficerPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testOfficerEmail = `rteofc_${uniqueId}@test.com`;
			let testOfficerPhone2 = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testOfficerEmail2 = `rteofc2_${uniqueId}@test.com`;

			let tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			let tomorrowStr = tomorrow.toISOString().split("T")[0];

			// =================================================================
			// Setup: Create community, officers, posts, shift, allocations
			// =================================================================

			testResults.push({step: "Setup: create test community", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `Route Test Community ${uniqueId}`,
				area: "Test Area",
				latitude: 33.4484,
				longitude: -112.0740,
				location_name: "Route Test Location",
				timezone: "America/Phoenix",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test community", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {total: 0, passed: 0, failed: 1, warnings: 0};
				return {...rc, ...vals};
			}
			testCommunityId = rv.community_id;
			testResults.push({step: "Setup: create test community", status: "passed", community_id: testCommunityId});

			testResults.push({step: "Setup: create test officer 1", status: "running"});
			rv = $executeAPI(session, "Officer/add_officer", {
				first_name: `RteOfc ${uniqueId}`,
				last_name: `Last ${uniqueId}`,
				phone_num: testOfficerPhone,
				email: testOfficerEmail,
				community_id: testCommunityId,
				title: "Security Officer",
				address: "Route Test Address"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test officer 1", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {total: 0, passed: 0, failed: 1, warnings: 0};
				return {...rc, ...vals};
			}
			testOfficerId = rv.user_id;
			testResults.push({step: "Setup: create test officer 1", status: "passed", user_id: testOfficerId});

			testResults.push({step: "Setup: create test officer 2", status: "running"});
			rv = $executeAPI(session, "Officer/add_officer", {
				first_name: `RteOfc2 ${uniqueId}`,
				last_name: `Last2 ${uniqueId}`,
				phone_num: testOfficerPhone2,
				email: testOfficerEmail2,
				community_id: testCommunityId,
				title: "Security Officer 2",
				address: "Route Test Address 2"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test officer 2", status: "failed", error: rv.message});
			}
			else
			{
				testOfficerId2 = rv.user_id;
				testResults.push({step: "Setup: create test officer 2", status: "passed", user_id: testOfficerId2});
			}

			// Create three posts with GPS coordinates (needed for route generation)
			testResults.push({step: "Setup: create test post 1", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `Main Gate ${uniqueId}`,
				description: "Front entrance checkpoint",
				priority: "urgent",
				location: JSON.stringify({lat: 33.4484, lng: -112.0740})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test post 1", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {total: 0, passed: 0, failed: 1, warnings: 0};
				return {...rc, ...vals};
			}
			testPostId1 = rv.post_id;
			testResults.push({step: "Setup: create test post 1", status: "passed", post_id: testPostId1});

			testResults.push({step: "Setup: create test post 2", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `Parking Lot ${uniqueId}`,
				description: "North parking structure",
				priority: "normal",
				location: JSON.stringify({lat: 33.4495, lng: -112.0730})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test post 2", status: "failed", error: rv.message});
			}
			else
			{
				testPostId2 = rv.post_id;
				testResults.push({step: "Setup: create test post 2", status: "passed", post_id: testPostId2});
			}

			testResults.push({step: "Setup: create test post 3", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `Loading Dock ${uniqueId}`,
				description: "Rear loading area",
				priority: "low",
				location: JSON.stringify({lat: 33.4470, lng: -112.0720})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test post 3", status: "failed", error: rv.message});
			}
			else
			{
				testPostId3 = rv.post_id;
				testResults.push({step: "Setup: create test post 3", status: "passed", post_id: testPostId3});
			}

			// Create shift, allocate officers, assign post to officer 1
			testResults.push({step: "Setup: create test shift", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: tomorrowStr,
				start_time: "08:00",
				end_time: "16:00",
				notes: "Route test shift"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test shift", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {total: 0, passed: 0, failed: 1, warnings: 0};
				return {...rc, ...vals};
			}
			testShiftId = rv.shift_id;
			testResults.push({step: "Setup: create test shift", status: "passed", shift_id: testShiftId});

			testResults.push({step: "Setup: allocate officer 1", status: "running"});
			rv = $executeAPI(session, "Shift/allocate_officer", {
				shift_id: testShiftId,
				officer_id: testOfficerId,
				acknowledge_conflicts: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: allocate officer 1", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {total: 0, passed: 0, failed: 1, warnings: 0};
				return {...rc, ...vals};
			}
			testResults.push({step: "Setup: allocate officer 1", status: "passed"});

			if (testOfficerId2 !== null)
			{
				testResults.push({step: "Setup: allocate officer 2", status: "running"});
				rv = $executeAPI(session, "Shift/allocate_officer", {
					shift_id: testShiftId,
					officer_id: testOfficerId2,
					acknowledge_conflicts: true
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Setup: allocate officer 2", status: "warning", error: rv.message});
				}
				else
				{
					testResults.push({step: "Setup: allocate officer 2", status: "passed"});
				}
			}

			// Assign post 1 to officer 1 (makes it a mandatory waypoint)
			testResults.push({step: "Setup: assign post to officer 1", status: "running"});
			rv = $executeAPI(session, "Shift/assign_post", {
				shift_id: testShiftId,
				officer_id: testOfficerId,
				post_id: testPostId1
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: assign post to officer 1", status: "warning", error: rv.message, message: "Post assignment failed — route may have fewer mandatory waypoints"});
			}
			else
			{
				testResults.push({step: "Setup: assign post to officer 1", status: "passed"});
			}

			// =================================================================
			// Test 1: generate_route
			// =================================================================

			testResults.push({step: "Test 1: generate_route", status: "running"});
			rv = $executeAPI(session, "Route/generate_route", {
				shift_id: testShiftId,
				officer_id: testOfficerId
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: generate_route", status: "failed", error: rv.message, rc: rv.rc});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testRouteId = rv.route.route_id;
			let generatedRoute = rv.route;
			testResults.push({step: "Test 1: generate_route", status: "passed", route_id: testRouteId, waypoint_count: generatedRoute.waypoints.length});

			// =================================================================
			// Test 2: generate_route (verify route fields)
			// =================================================================

			testResults.push({step: "Test 2: generate_route (verify fields)", status: "running"});
			let fieldsOk = generatedRoute.status === "draft" &&
						   generatedRoute.shift_id === testShiftId &&
						   generatedRoute.officer_id === testOfficerId &&
						   generatedRoute.community_id === testCommunityId &&
						   generatedRoute.total_distance_m != null &&
						   generatedRoute.total_duration_min != null &&
						   generatedRoute.waypoints.length >= 1 &&
						   generatedRoute.pushed_on === null &&
						   generatedRoute.completed_on === null;
			if (fieldsOk)
			{
				testResults.push({step: "Test 2: generate_route (verify fields)", status: "passed", verified: true, total_distance_m: generatedRoute.total_distance_m, total_duration_min: generatedRoute.total_duration_min});
			}
			else
			{
				testResults.push({step: "Test 2: generate_route (verify fields)", status: "warning", verified: false, message: "Some route fields not as expected"});
			}

			// =================================================================
			// Test 3: generate_route (verify waypoint ordering and fields)
			// =================================================================

			testResults.push({step: "Test 3: generate_route (verify waypoints)", status: "running"});
			let waypointsOk = true;
			let firstWp = generatedRoute.waypoints[0];
			if (!firstWp || !firstWp.name || firstWp.lat === undefined || firstWp.lng === undefined || firstWp.order !== 1)
			{
				waypointsOk = false;
			}
			// Verify ordering is sequential
			for (let i = 0; i < generatedRoute.waypoints.length; i++)
			{
				if (generatedRoute.waypoints[i].order !== i + 1)
				{
					waypointsOk = false;
					break;
				}
			}
			if (waypointsOk)
			{
				testResults.push({step: "Test 3: generate_route (verify waypoints)", status: "passed", verified: true});
			}
			else
			{
				testResults.push({step: "Test 3: generate_route (verify waypoints)", status: "warning", verified: false, message: "Waypoint ordering or fields not as expected"});
			}

			// =================================================================
			// Test 4: generate_route (duplicate, expect ERR_ROUTE_DUPLICATE rc 648)
			// =================================================================

			testResults.push({step: "Test 4: generate_route (duplicate)", status: "running"});
			rv = $executeAPI(session, "Route/generate_route", {
				shift_id: testShiftId,
				officer_id: testOfficerId
			});
			if ($Err.isERR(rv) && rv.rc === 648)
			{
				testResults.push({step: "Test 4: generate_route (duplicate)", status: "passed", message: "correctly rejected duplicate route with rc 648"});
			}
			else
			{
				testResults.push({step: "Test 4: generate_route (duplicate)", status: "warning", message: "expected rc 648 for duplicate route", rc: rv.rc});
			}

			// =================================================================
			// Test 5: generate_route (invalid shift, expect ERR_ROUTE_SHIFT_NOT_FOUND rc 646)
			// =================================================================

			testResults.push({step: "Test 5: generate_route (invalid shift)", status: "running"});
			rv = $executeAPI(session, "Route/generate_route", {
				shift_id: 999999999,
				officer_id: testOfficerId
			});
			if ($Err.isERR(rv) && rv.rc === 646)
			{
				testResults.push({step: "Test 5: generate_route (invalid shift)", status: "passed", message: "correctly rejected invalid shift with rc 646"});
			}
			else
			{
				testResults.push({step: "Test 5: generate_route (invalid shift)", status: "warning", message: "expected rc 646 for invalid shift", rc: rv.rc});
			}

			// =================================================================
			// Test 6: generate_route (officer not allocated, expect rc 647)
			// =================================================================

			testResults.push({step: "Test 6: generate_route (officer not allocated)", status: "running"});
			rv = $executeAPI(session, "Route/generate_route", {
				shift_id: testShiftId,
				officer_id: "nonexistent_officer_id_99999"
			});
			if ($Err.isERR(rv) && rv.rc === 647)
			{
				testResults.push({step: "Test 6: generate_route (officer not allocated)", status: "passed", message: "correctly rejected unallocated officer with rc 647"});
			}
			else
			{
				testResults.push({step: "Test 6: generate_route (officer not allocated)", status: "warning", message: "expected rc 647 for unallocated officer", rc: rv.rc});
			}

			// =================================================================
			// Test 7: generate_route (officer 2 — for later compliance testing)
			// =================================================================

			if (testOfficerId2 !== null)
			{
				testResults.push({step: "Test 7: generate_route (officer 2)", status: "running"});
				rv = $executeAPI(session, "Route/generate_route", {
					shift_id: testShiftId,
					officer_id: testOfficerId2
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 7: generate_route (officer 2)", status: "warning", error: rv.message, rc: rv.rc});
				}
				else
				{
					testRouteId2 = rv.route.route_id;
					testResults.push({step: "Test 7: generate_route (officer 2)", status: "passed", route_id: testRouteId2});
				}
			}

			// =================================================================
			// Test 8: get_route (admin)
			// =================================================================

			testResults.push({step: "Test 8: get_route (admin)", status: "running"});
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 8: get_route (admin)", status: "failed", error: rv.message});
			}
			else
			{
				let r = rv.route;
				let verified = r.route_id === testRouteId &&
							   r.shift_id === testShiftId &&
							   r.officer_id === testOfficerId &&
							   r.officer_name != null &&
							   r.community_name != null &&
							   r.shift_date != null &&
							   Array.isArray(r.waypoints) &&
							   r.waypoints.length >= 1;
				if (verified)
				{
					testResults.push({step: "Test 8: get_route (admin)", status: "passed", verified: true, waypoint_count: r.waypoints.length});
				}
				else
				{
					testResults.push({step: "Test 8: get_route (admin)", status: "warning", verified: false, message: "Route fields not as expected"});
				}
			}

			// =================================================================
			// Test 9: get_route (officer sees draft — expect ERR_ROUTE_NOT_FOUND rc 640)
			// =================================================================

			testResults.push({step: "Test 9: get_route (officer, draft route)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv) && rv.rc === 640)
				{
					testResults.push({step: "Test 9: get_route (officer, draft route)", status: "passed", message: "correctly hid draft route from officer with rc 640"});
				}
				else
				{
					testResults.push({step: "Test 9: get_route (officer, draft route)", status: "warning", message: "expected rc 640 for officer viewing draft route", rc: rv.rc});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 9: get_route (officer, draft route)", status: "failed", error: impErr.message});
			}

			// =================================================================
			// Test 10: get_route (invalid ID, expect rc 640)
			// =================================================================

			testResults.push({step: "Test 10: get_route (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Route/get_route", {route_id: 999999999});
			if ($Err.isERR(rv) && rv.rc === 640)
			{
				testResults.push({step: "Test 10: get_route (invalid ID)", status: "passed", message: "correctly returned not found with rc 640"});
			}
			else
			{
				testResults.push({step: "Test 10: get_route (invalid ID)", status: "warning", message: "expected rc 640 for invalid route ID", rc: rv.rc});
			}

			// =================================================================
			// Test 11: update_route (reorder waypoints)
			// =================================================================

			testResults.push({step: "Test 11: update_route (reorder waypoints)", status: "running"});
			// Fetch current waypoints and reverse their order
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 11: update_route (reorder waypoints)", status: "failed", error: rv.message});
			}
			else
			{
				let currentWps = rv.route.waypoints;
				// Note: generate_route stores post priorities (urgent/important/normal/low)
				// but update_route validates against waypoint priorities (critical/high/normal/low).
				// Map post priorities to valid waypoint priorities for the update.
				let postToWpPriority = {"urgent": "critical", "important": "high"};
				let reversedWps = currentWps.slice().reverse().map(wp =>
				{
					let wpPriority = postToWpPriority[wp.priority] || wp.priority;
					return {
						name: wp.name,
						lat: wp.lat,
						lng: wp.lng,
						post_id: wp.post_id,
						dwell_time_min: wp.dwell_time_min,
						priority: wpPriority,
						notes: wp.notes
					};
				});

				rv = $executeAPI(session, "Route/update_route", {
					route_id: testRouteId,
					name: `Updated Route ${uniqueId}`,
					waypoints: reversedWps
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 11: update_route (reorder waypoints)", status: "failed", error: rv.message, rc: rv.rc});
				}
				else
				{
					let updatedName = rv.route.name;
					let updatedCount = rv.route.waypoints.length;
					if (updatedName === `Updated Route ${uniqueId}` && updatedCount === currentWps.length)
					{
						testResults.push({step: "Test 11: update_route (reorder waypoints)", status: "passed", name: updatedName, waypoint_count: updatedCount});
					}
					else
					{
						testResults.push({step: "Test 11: update_route (reorder waypoints)", status: "warning", message: "Updated route name or count mismatch"});
					}
				}
			}

			// =================================================================
			// Test 12: update_route (add custom waypoint)
			// =================================================================

			testResults.push({step: "Test 12: update_route (add custom waypoint)", status: "running"});
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 12: update_route (add custom waypoint)", status: "failed", error: rv.message});
			}
			else
			{
				let postToWpPriority2 = {"urgent": "critical", "important": "high"};
				let wps = rv.route.waypoints.map(wp =>
				{
					let wpPriority = postToWpPriority2[wp.priority] || wp.priority;
					return {name: wp.name, lat: wp.lat, lng: wp.lng, post_id: wp.post_id, dwell_time_min: wp.dwell_time_min, priority: wpPriority, notes: wp.notes};
				});
				// Add a custom (non-post) waypoint
				wps.push({
					name: `Custom Checkpoint ${uniqueId}`,
					lat: 33.4480,
					lng: -112.0750,
					dwell_time_min: 10,
					priority: "critical",
					notes: "Test custom waypoint"
				});

				rv = $executeAPI(session, "Route/update_route", {
					route_id: testRouteId,
					waypoints: wps
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 12: update_route (add custom waypoint)", status: "failed", error: rv.message});
				}
				else
				{
					let lastWp = rv.route.waypoints[rv.route.waypoints.length - 1];
					if (lastWp && lastWp.name === `Custom Checkpoint ${uniqueId}` && lastWp.priority === "critical" && lastWp.dwell_time_min === 10)
					{
						testResults.push({step: "Test 12: update_route (add custom waypoint)", status: "passed", custom_waypoint_id: lastWp.waypoint_id});
					}
					else
					{
						testResults.push({step: "Test 12: update_route (add custom waypoint)", status: "warning", message: "Custom waypoint not found or fields mismatch"});
					}
				}
			}

			// =================================================================
			// Test 13: update_route (empty waypoints, expect rc 649)
			// =================================================================

			testResults.push({step: "Test 13: update_route (empty waypoints)", status: "running"});
			rv = $executeAPI(session, "Route/update_route", {
				route_id: testRouteId,
				waypoints: []
			});
			if ($Err.isERR(rv) && rv.rc === 649)
			{
				testResults.push({step: "Test 13: update_route (empty waypoints)", status: "passed", message: "correctly rejected empty waypoints with rc 649"});
			}
			else
			{
				testResults.push({step: "Test 13: update_route (empty waypoints)", status: "warning", message: "expected rc 649 for empty waypoints", rc: rv.rc});
			}

			// =================================================================
			// Test 14: update_route (invalid coordinates, expect rc 650)
			// =================================================================

			testResults.push({step: "Test 14: update_route (invalid coordinates)", status: "running"});
			rv = $executeAPI(session, "Route/update_route", {
				route_id: testRouteId,
				waypoints: [{name: "Bad Coords", lat: 999, lng: -112.074}]
			});
			if ($Err.isERR(rv) && rv.rc === 650)
			{
				testResults.push({step: "Test 14: update_route (invalid coordinates)", status: "passed", message: "correctly rejected invalid coordinates with rc 650"});
			}
			else
			{
				testResults.push({step: "Test 14: update_route (invalid coordinates)", status: "warning", message: "expected rc 650 for invalid coordinates", rc: rv.rc});
			}

			// =================================================================
			// Test 15: update_route (invalid priority, expect rc 649)
			// =================================================================

			testResults.push({step: "Test 15: update_route (invalid priority)", status: "running"});
			rv = $executeAPI(session, "Route/update_route", {
				route_id: testRouteId,
				waypoints: [{name: "Bad Priority", lat: 33.448, lng: -112.074, priority: "super_ultra_critical"}]
			});
			if ($Err.isERR(rv) && rv.rc === 649)
			{
				testResults.push({step: "Test 15: update_route (invalid priority)", status: "passed", message: "correctly rejected invalid priority with rc 649"});
			}
			else
			{
				testResults.push({step: "Test 15: update_route (invalid priority)", status: "warning", message: "expected rc 649 for invalid priority", rc: rv.rc});
			}

			// =================================================================
			// Test 16: update_route (invalid route ID, expect rc 640)
			// =================================================================

			testResults.push({step: "Test 16: update_route (invalid route ID)", status: "running"});
			rv = $executeAPI(session, "Route/update_route", {
				route_id: 999999999,
				waypoints: [{name: "Test", lat: 33.448, lng: -112.074}]
			});
			if ($Err.isERR(rv) && rv.rc === 640)
			{
				testResults.push({step: "Test 16: update_route (invalid route ID)", status: "passed", message: "correctly returned not found with rc 640"});
			}
			else
			{
				testResults.push({step: "Test 16: update_route (invalid route ID)", status: "warning", message: "expected rc 640 for invalid route ID", rc: rv.rc});
			}

			// =================================================================
			// Test 17: push_route
			// =================================================================

			testResults.push({step: "Test 17: push_route", status: "running"});
			rv = $executeAPI(session, "Route/push_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 17: push_route", status: "failed", error: rv.message, rc: rv.rc});
			}
			else
			{
				testResults.push({step: "Test 17: push_route", status: "passed"});
			}

			// =================================================================
			// Test 18: get_route (verify status = active after push)
			// =================================================================

			testResults.push({step: "Test 18: get_route (verify active)", status: "running"});
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 18: get_route (verify active)", status: "failed", error: rv.message});
			}
			else
			{
				let r = rv.route;
				if (r.status === "active" && r.pushed_on != null && r.pushed_by != null)
				{
					testResults.push({step: "Test 18: get_route (verify active)", status: "passed", route_status: r.status, pushed_on: r.pushed_on});
				}
				else
				{
					testResults.push({step: "Test 18: get_route (verify active)", status: "warning", message: "Route status not active after push", actual_status: r.status});
				}
			}

			// =================================================================
			// Test 19: push_route (already pushed, expect ERR_ROUTE_ALREADY_PUSHED rc 642)
			// =================================================================

			testResults.push({step: "Test 19: push_route (already pushed)", status: "running"});
			rv = $executeAPI(session, "Route/push_route", {route_id: testRouteId});
			if ($Err.isERR(rv) && rv.rc === 642)
			{
				testResults.push({step: "Test 19: push_route (already pushed)", status: "passed", message: "correctly rejected already-pushed route with rc 642"});
			}
			else
			{
				testResults.push({step: "Test 19: push_route (already pushed)", status: "warning", message: "expected rc 642 for already pushed route", rc: rv.rc});
			}

			// =================================================================
			// Test 20: push_route (invalid route ID, expect rc 640)
			// =================================================================

			testResults.push({step: "Test 20: push_route (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Route/push_route", {route_id: 999999999});
			if ($Err.isERR(rv) && rv.rc === 640)
			{
				testResults.push({step: "Test 20: push_route (invalid ID)", status: "passed", message: "correctly returned not found with rc 640"});
			}
			else
			{
				testResults.push({step: "Test 20: push_route (invalid ID)", status: "warning", message: "expected rc 640 for invalid route ID", rc: rv.rc});
			}

			// =================================================================
			// Test 21: update_route (active route, expect ERR_ROUTE_CANNOT_UPDATE rc 651)
			// =================================================================

			testResults.push({step: "Test 21: update_route (active route)", status: "running"});
			rv = $executeAPI(session, "Route/update_route", {
				route_id: testRouteId,
				waypoints: [{name: "Should Fail", lat: 33.448, lng: -112.074}]
			});
			if ($Err.isERR(rv) && rv.rc === 651)
			{
				testResults.push({step: "Test 21: update_route (active route)", status: "passed", message: "correctly rejected update on active route with rc 651"});
			}
			else
			{
				testResults.push({step: "Test 21: update_route (active route)", status: "warning", message: "expected rc 651 for updating active route", rc: rv.rc});
			}

			// =================================================================
			// Test 22: get_route (officer can see active route)
			// =================================================================

			testResults.push({step: "Test 22: get_route (officer, active route)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 22: get_route (officer, active route)", status: "failed", error: rv.message, rc: rv.rc});
				}
				else
				{
					let r = rv.route;
					if (r.route_id === testRouteId && r.status === "active" && Array.isArray(r.waypoints))
					{
						testResults.push({step: "Test 22: get_route (officer, active route)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 22: get_route (officer, active route)", status: "warning", message: "Officer route data mismatch"});
					}
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 22: get_route (officer, active route)", status: "failed", error: impErr.message});
			}

			// =================================================================
			// Test 23: get_route (officer 2 cannot see officer 1's route)
			// =================================================================

			if (testOfficerId2 !== null)
			{
				testResults.push({step: "Test 23: get_route (officer 2, wrong route)", status: "running"});
				try
				{
					session.impersonateAccount(testOfficerId2);

					rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv) && rv.rc === 640)
					{
						testResults.push({step: "Test 23: get_route (officer 2, wrong route)", status: "passed", message: "correctly hid route from wrong officer with rc 640"});
					}
					else
					{
						testResults.push({step: "Test 23: get_route (officer 2, wrong route)", status: "warning", message: "expected rc 640 for wrong officer", rc: rv.rc});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 23: get_route (officer 2, wrong route)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 24: visit_waypoint (as officer, with GPS)
			// =================================================================

			testResults.push({step: "Test 24: visit_waypoint (with GPS)", status: "running"});
			// Fetch the route to get the first waypoint ID
			let waypointIds = [];
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if (!$Err.isERR(rv) && rv.route.waypoints.length > 0)
			{
				waypointIds = rv.route.waypoints.map(wp => wp.waypoint_id);
			}

			if (waypointIds.length === 0)
			{
				testResults.push({step: "Test 24: visit_waypoint (with GPS)", status: "failed", error: "No waypoints available for visit test"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Route/visit_waypoint", {
						waypoint_id: waypointIds[0],
						lat: 33.4485,
						lng: -112.0741,
						is_manual: false
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 24: visit_waypoint (with GPS)", status: "failed", error: rv.message, rc: rv.rc});
					}
					else
					{
						let v = rv.visit;
						if (v.waypoint_id === waypointIds[0] && v.visited_on != null && v.deviation_m != null && v.is_manual === false)
						{
							testResults.push({step: "Test 24: visit_waypoint (with GPS)", status: "passed", deviation_m: v.deviation_m, route_completed: v.route_completed});
						}
						else
						{
							testResults.push({step: "Test 24: visit_waypoint (with GPS)", status: "warning", message: "Visit response fields mismatch"});
						}
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 24: visit_waypoint (with GPS)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 25: visit_waypoint (already visited, expect rc 644)
			// =================================================================

			testResults.push({step: "Test 25: visit_waypoint (already visited)", status: "running"});
			if (waypointIds.length === 0)
			{
				testResults.push({step: "Test 25: visit_waypoint (already visited)", status: "failed", error: "No waypoints available"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Route/visit_waypoint", {
						waypoint_id: waypointIds[0],
						lat: 33.4485,
						lng: -112.0741
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv) && rv.rc === 644)
					{
						testResults.push({step: "Test 25: visit_waypoint (already visited)", status: "passed", message: "correctly rejected duplicate visit with rc 644"});
					}
					else
					{
						testResults.push({step: "Test 25: visit_waypoint (already visited)", status: "warning", message: "expected rc 644 for already visited waypoint", rc: rv.rc});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 25: visit_waypoint (already visited)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 26: visit_waypoint (manual, no GPS)
			// =================================================================

			testResults.push({step: "Test 26: visit_waypoint (manual, no GPS)", status: "running"});
			if (waypointIds.length < 2)
			{
				testResults.push({step: "Test 26: visit_waypoint (manual, no GPS)", status: "failed", error: "Not enough waypoints for manual visit test"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Route/visit_waypoint", {
						waypoint_id: waypointIds[1],
						is_manual: true
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 26: visit_waypoint (manual, no GPS)", status: "failed", error: rv.message, rc: rv.rc});
					}
					else
					{
						let v = rv.visit;
						if (v.is_manual === true && v.deviation_m === null)
						{
							testResults.push({step: "Test 26: visit_waypoint (manual, no GPS)", status: "passed", is_manual: true, deviation_m: null});
						}
						else
						{
							testResults.push({step: "Test 26: visit_waypoint (manual, no GPS)", status: "warning", message: "Manual visit fields mismatch"});
						}
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 26: visit_waypoint (manual, no GPS)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 27: visit_waypoint (invalid waypoint ID, expect rc 643)
			// =================================================================

			testResults.push({step: "Test 27: visit_waypoint (invalid waypoint)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Route/visit_waypoint", {
					waypoint_id: 999999999,
					lat: 33.448,
					lng: -112.074
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv) && rv.rc === 643)
				{
					testResults.push({step: "Test 27: visit_waypoint (invalid waypoint)", status: "passed", message: "correctly rejected invalid waypoint with rc 643"});
				}
				else
				{
					testResults.push({step: "Test 27: visit_waypoint (invalid waypoint)", status: "warning", message: "expected rc 643 for invalid waypoint ID", rc: rv.rc});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 27: visit_waypoint (invalid waypoint)", status: "failed", error: impErr.message});
			}

			// =================================================================
			// Test 28: visit_waypoint (officer 2 on officer 1's route, expect ERR_NO_PRIVILEGES)
			// =================================================================

			if (testOfficerId2 !== null && waypointIds.length >= 3)
			{
				testResults.push({step: "Test 28: visit_waypoint (wrong officer)", status: "running"});
				try
				{
					session.impersonateAccount(testOfficerId2);

					rv = $executeAPI(session, "Route/visit_waypoint", {
						waypoint_id: waypointIds[2],
						lat: 33.448,
						lng: -112.074
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 28: visit_waypoint (wrong officer)", status: "passed", message: "correctly rejected wrong officer", rc: rv.rc});
					}
					else
					{
						testResults.push({step: "Test 28: visit_waypoint (wrong officer)", status: "warning", message: "expected error for wrong officer visiting waypoint"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 28: visit_waypoint (wrong officer)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 29: get_route (verify visit data in waypoints)
			// =================================================================

			testResults.push({step: "Test 29: get_route (verify visits)", status: "running"});
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 29: get_route (verify visits)", status: "failed", error: rv.message});
			}
			else
			{
				let r = rv.route;
				let visitedCount = r.waypoints.filter(wp => wp.visit !== null).length;
				if (visitedCount >= 2)
				{
					// Verify first waypoint has GPS visit data
					let wp1Visit = r.waypoints.find(wp => wp.waypoint_id === waypointIds[0]);
					let hasGpsVisit = wp1Visit && wp1Visit.visit && wp1Visit.visit.deviation_m != null && wp1Visit.visit.is_manual === false;

					// Verify second waypoint has manual visit data
					let wp2Visit = r.waypoints.find(wp => wp.waypoint_id === waypointIds[1]);
					let hasManualVisit = wp2Visit && wp2Visit.visit && wp2Visit.visit.is_manual === true;

					if (hasGpsVisit && hasManualVisit)
					{
						testResults.push({step: "Test 29: get_route (verify visits)", status: "passed", visited_count: visitedCount, gps_verified: true, manual_verified: true});
					}
					else
					{
						testResults.push({step: "Test 29: get_route (verify visits)", status: "warning", visited_count: visitedCount, message: "Visit data not fully verified"});
					}
				}
				else
				{
					testResults.push({step: "Test 29: get_route (verify visits)", status: "warning", visited_count: visitedCount, message: "Expected at least 2 visited waypoints"});
				}
			}

			// =================================================================
			// Test 30: get_route_compliance
			// =================================================================

			testResults.push({step: "Test 30: get_route_compliance", status: "running"});
			rv = $executeAPI(session, "Route/get_route_compliance", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 30: get_route_compliance", status: "failed", error: rv.message});
			}
			else
			{
				let c = rv.compliance;
				let verified = c.route_id === testRouteId &&
							   c.officer_id === testOfficerId &&
							   c.officer_name != null &&
							   c.shift_id === testShiftId &&
							   typeof c.total_waypoints === "number" &&
							   typeof c.visited_count === "number" &&
							   typeof c.compliance_percent === "number" &&
							   c.visited_count >= 2 &&
							   c.compliance_percent > 0 &&
							   typeof c.manual_visit_count === "number" &&
							   c.manual_visit_count >= 1 &&
							   Array.isArray(c.waypoints);
				if (verified)
				{
					testResults.push({step: "Test 30: get_route_compliance", status: "passed", compliance_percent: c.compliance_percent, visited: c.visited_count, total: c.total_waypoints, manual_count: c.manual_visit_count, avg_deviation_m: c.avg_deviation_m});
				}
				else
				{
					testResults.push({step: "Test 30: get_route_compliance", status: "warning", message: "Compliance fields not as expected", compliance: c});
				}
			}

			// =================================================================
			// Test 31: get_route_compliance (invalid route ID, expect rc 640)
			// =================================================================

			testResults.push({step: "Test 31: get_route_compliance (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Route/get_route_compliance", {route_id: 999999999});
			if ($Err.isERR(rv) && rv.rc === 640)
			{
				testResults.push({step: "Test 31: get_route_compliance (invalid ID)", status: "passed", message: "correctly returned not found with rc 640"});
			}
			else
			{
				testResults.push({step: "Test 31: get_route_compliance (invalid ID)", status: "warning", message: "expected rc 640 for invalid route ID", rc: rv.rc});
			}

			// =================================================================
			// Test 32: visit remaining waypoints → route auto-completes
			// =================================================================

			testResults.push({step: "Test 32: visit_waypoint (complete route)", status: "running"});
			if (waypointIds.length < 3)
			{
				testResults.push({step: "Test 32: visit_waypoint (complete route)", status: "warning", message: "Not enough unvisited waypoints to test auto-completion"});
			}
			else
			{
				let lastVisitResult = null;
				let visitError = null;

				try
				{
					session.impersonateAccount(testOfficerId);

					// Visit all remaining waypoints (index 2 onwards)
					for (let i = 2; i < waypointIds.length; i++)
					{
						rv = $executeAPI(session, "Route/visit_waypoint", {
							waypoint_id: waypointIds[i],
							lat: 33.4470 + (i * 0.001),
							lng: -112.0740 + (i * 0.001),
							is_manual: false
						});
						if ($Err.isERR(rv))
						{
							visitError = rv;
							break;
						}
						lastVisitResult = rv.visit;
					}

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if (visitError)
					{
						testResults.push({step: "Test 32: visit_waypoint (complete route)", status: "failed", error: visitError.message, rc: visitError.rc});
					}
					else if (lastVisitResult && lastVisitResult.route_completed === true)
					{
						testResults.push({step: "Test 32: visit_waypoint (complete route)", status: "passed", route_completed: true});
					}
					else
					{
						testResults.push({step: "Test 32: visit_waypoint (complete route)", status: "warning", message: "route_completed not true after visiting all waypoints", last_visit: lastVisitResult});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 32: visit_waypoint (complete route)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 33: get_route (verify status = completed)
			// =================================================================

			testResults.push({step: "Test 33: get_route (verify completed)", status: "running"});
			rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 33: get_route (verify completed)", status: "failed", error: rv.message});
			}
			else
			{
				let r = rv.route;
				if (r.status === "completed" && r.completed_on != null)
				{
					testResults.push({step: "Test 33: get_route (verify completed)", status: "passed", route_status: r.status, completed_on: r.completed_on});
				}
				else
				{
					testResults.push({step: "Test 33: get_route (verify completed)", status: "warning", message: "Route not completed after all visits", actual_status: r.status});
				}
			}

			// =================================================================
			// Test 34: get_route_compliance (completed route — 100%)
			// =================================================================

			testResults.push({step: "Test 34: get_route_compliance (100%)", status: "running"});
			rv = $executeAPI(session, "Route/get_route_compliance", {route_id: testRouteId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 34: get_route_compliance (100%)", status: "failed", error: rv.message});
			}
			else
			{
				let c = rv.compliance;
				if (c.compliance_percent === 100 && c.visited_count === c.total_waypoints && c.route_status === "completed")
				{
					testResults.push({step: "Test 34: get_route_compliance (100%)", status: "passed", compliance_percent: 100, visited: c.visited_count, total: c.total_waypoints});
				}
				else
				{
					testResults.push({step: "Test 34: get_route_compliance (100%)", status: "warning", message: "Expected 100% compliance", compliance_percent: c.compliance_percent});
				}
			}

			// =================================================================
			// Test 35: push_route (completed route, expect ERR_ROUTE_INVALID_STATUS rc 645)
			// =================================================================

			testResults.push({step: "Test 35: push_route (completed route)", status: "running"});
			rv = $executeAPI(session, "Route/push_route", {route_id: testRouteId});
			if ($Err.isERR(rv) && rv.rc === 645)
			{
				testResults.push({step: "Test 35: push_route (completed route)", status: "passed", message: "correctly rejected push on completed route with rc 645"});
			}
			else
			{
				testResults.push({step: "Test 35: push_route (completed route)", status: "warning", message: "expected rc 645 for completed route push", rc: rv.rc});
			}

			// =================================================================
			// Test 36: visit_waypoint (on draft route — expect ERR_ROUTE_NOT_PUSHED rc 652)
			// =================================================================

			if (testRouteId2 !== null)
			{
				testResults.push({step: "Test 36: visit_waypoint (draft route)", status: "running"});
				// Route 2 is still in draft — get its waypoints
				rv = $executeAPI(session, "Route/get_route", {route_id: testRouteId2});
				if (!$Err.isERR(rv) && rv.route.waypoints.length > 0)
				{
					let wp2Id = rv.route.waypoints[0].waypoint_id;

					try
					{
						session.impersonateAccount(testOfficerId2);

						rv = $executeAPI(session, "Route/visit_waypoint", {
							waypoint_id: wp2Id,
							lat: 33.448,
							lng: -112.074
						});

						session.accountImpersonationStack = null;
						session.userId = adminUserId;
						session.userType = $Const.USER_TYPE_ADMIN;

						if ($Err.isERR(rv) && rv.rc === 652)
						{
							testResults.push({step: "Test 36: visit_waypoint (draft route)", status: "passed", message: "correctly rejected visit on draft route with rc 652"});
						}
						else
						{
							testResults.push({step: "Test 36: visit_waypoint (draft route)", status: "warning", message: "expected rc 652 for visit on draft route", rc: rv.rc});
						}
					}
					catch (impErr)
					{
						session.accountImpersonationStack = null;
						session.userId = adminUserId;
						session.userType = $Const.USER_TYPE_ADMIN;
						testResults.push({step: "Test 36: visit_waypoint (draft route)", status: "failed", error: impErr.message});
					}
				}
				else
				{
					testResults.push({step: "Test 36: visit_waypoint (draft route)", status: "failed", error: "Could not fetch route 2 waypoints"});
				}
			}

			// =================================================================
			// Test 37: get_route_settings
			// =================================================================

			testResults.push({step: "Test 37: get_route_settings", status: "running"});
			rv = $executeAPI(session, "Settings/get_route_settings", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 37: get_route_settings", status: "failed", error: rv.message});
			}
			else
			{
				if (typeof rv.auto_generate_routes_on_publish === "boolean" && typeof rv.patrol_compliance_threshold_min === "number")
				{
					testResults.push({step: "Test 37: get_route_settings", status: "passed", auto_generate: rv.auto_generate_routes_on_publish, threshold: rv.patrol_compliance_threshold_min});
				}
				else
				{
					testResults.push({step: "Test 37: get_route_settings", status: "warning", message: "Route settings missing expected fields"});
				}
			}

			// =================================================================
			// Test 38: update_route_settings
			// =================================================================

			testResults.push({step: "Test 38: update_route_settings", status: "running"});
			rv = $executeAPI(session, "Settings/update_route_settings", {
				auto_generate_routes_on_publish: false,
				patrol_compliance_threshold_min: 30
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 38: update_route_settings", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 38: update_route_settings", status: "passed"});
			}

			// =================================================================
			// Test 39: get_route_settings (verify update)
			// =================================================================

			testResults.push({step: "Test 39: get_route_settings (verify update)", status: "running"});
			rv = $executeAPI(session, "Settings/get_route_settings", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 39: get_route_settings (verify update)", status: "failed", error: rv.message});
			}
			else
			{
				if (rv.auto_generate_routes_on_publish === false && rv.patrol_compliance_threshold_min === 30)
				{
					testResults.push({step: "Test 39: get_route_settings (verify update)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 39: get_route_settings (verify update)", status: "warning", verified: false, message: "Route settings not updated as expected"});
				}
			}

			// =================================================================
			// Test 40: update_route_settings (boundary — min threshold)
			// =================================================================

			testResults.push({step: "Test 40: update_route_settings (min threshold)", status: "running"});
			rv = $executeAPI(session, "Settings/update_route_settings", {
				patrol_compliance_threshold_min: 5
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 40: update_route_settings (min threshold)", status: "warning", message: "rejected valid minimum value", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 40: update_route_settings (min threshold)", status: "passed"});
			}

			// =================================================================
			// Test 41: update_route_settings (boundary — max threshold)
			// =================================================================

			testResults.push({step: "Test 41: update_route_settings (max threshold)", status: "running"});
			rv = $executeAPI(session, "Settings/update_route_settings", {
				patrol_compliance_threshold_min: 60
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 41: update_route_settings (max threshold)", status: "warning", message: "rejected valid maximum value", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 41: update_route_settings (max threshold)", status: "passed"});
			}

			// =================================================================
			// Test 42: update_route_settings (restore defaults)
			// =================================================================

			testResults.push({step: "Test 42: update_route_settings (restore defaults)", status: "running"});
			rv = $executeAPI(session, "Settings/update_route_settings", {
				auto_generate_routes_on_publish: true,
				patrol_compliance_threshold_min: 15
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 42: update_route_settings (restore defaults)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 42: update_route_settings (restore defaults)", status: "passed"});
			}

			// =================================================================
			// Test 43: generate_route on shift with no posts (expect rc 641)
			// =================================================================

			testResults.push({step: "Test 43: generate_route (no posts community)", status: "running"});
			// Create an empty community + shift + officer allocation to test no-posts error
			let emptyComId = null;
			let emptyOfficerId = null;
			let emptyShiftId = null;
			let emptyUniqueId = $Utils.uniqueHash().substring(0, 8);

			rv = $executeAPI(session, "Community/add_community", {
				name: `Empty Route Test ${emptyUniqueId}`,
				area: "Empty Area",
				latitude: 40.7128,
				longitude: -74.0060,
				location_name: "Empty Location",
				timezone: "America/New_York",
				is_active: true
			});
			if (!$Err.isERR(rv))
			{
				emptyComId = rv.community_id;

				let emptyPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
				rv = $executeAPI(session, "Officer/add_officer", {
					first_name: `EmptyOfc ${emptyUniqueId}`,
					last_name: "Test",
					phone_num: emptyPhone,
					email: `emptyofc_${emptyUniqueId}@test.com`,
					community_id: emptyComId,
					title: "Officer",
					address: "Empty Address"
				});
				if (!$Err.isERR(rv))
				{
					emptyOfficerId = rv.user_id;
					rv = $executeAPI(session, "Shift/create_shift", {
						community_id: emptyComId,
						shift_date: tomorrowStr,
						start_time: "08:00",
						end_time: "16:00"
					});
					if (!$Err.isERR(rv))
					{
						emptyShiftId = rv.shift_id;
						$executeAPI(session, "Shift/allocate_officer", {
							shift_id: emptyShiftId,
							officer_id: emptyOfficerId,
							acknowledge_conflicts: true
						});

						rv = $executeAPI(session, "Route/generate_route", {
							shift_id: emptyShiftId,
							officer_id: emptyOfficerId
						});
						if ($Err.isERR(rv) && rv.rc === 641)
						{
							testResults.push({step: "Test 43: generate_route (no posts community)", status: "passed", message: "correctly rejected with rc 641 — no posts available"});
						}
						else
						{
							testResults.push({step: "Test 43: generate_route (no posts community)", status: "warning", message: "expected rc 641 for community with no posts", rc: rv.rc});
						}
					}
					else
					{
						testResults.push({step: "Test 43: generate_route (no posts community)", status: "failed", error: "Could not create empty shift"});
					}
				}
				else
				{
					testResults.push({step: "Test 43: generate_route (no posts community)", status: "failed", error: "Could not create empty officer"});
				}
			}
			else
			{
				testResults.push({step: "Test 43: generate_route (no posts community)", status: "failed", error: "Could not create empty community"});
			}

			testResults.push({step: "All tests completed", status: "success"});
		}
		catch (error)
		{
			testResults.push({step: "Exception occurred", status: "error", error: error.message, stack: error.stack});

			// Restore session if impersonation was used
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
