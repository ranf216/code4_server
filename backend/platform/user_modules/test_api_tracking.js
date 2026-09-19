module.exports =
{
	test_tracking_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let testOfficerId = null;
		let testResidentId = null;
		let testShiftId = null;
		let testCallId = null;

		try
		{
			testResults.push({step: "Starting Tracking API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);
			let testOfficerPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testOfficerEmail = `trkofc_${uniqueId}@test.com`;
			let testResidentPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testResidentEmail = `trkres_${uniqueId}@test.com`;

			let tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			let tomorrowStr = tomorrow.toISOString().split("T")[0];

			// =================================================================
			// Setup: Create community, officer, resident, shift
			// =================================================================

			testResults.push({step: "Setup: create test community", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `Tracking Test Community ${uniqueId}`,
				area: "Test Area",
				latitude: 33.4484,
				longitude: -112.0740,
				location_name: "Tracking Test Location",
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

			testResults.push({step: "Setup: create test officer", status: "running"});
			rv = $executeAPI(session, "Officer/add_officer", {
				first_name: `TrkOfc ${uniqueId}`,
				last_name: `Last ${uniqueId}`,
				phone_num: testOfficerPhone,
				email: testOfficerEmail,
				community_id: testCommunityId,
				title: "Security Officer",
				address: "Tracking Test Address"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test officer", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {total: 0, passed: 0, failed: 1, warnings: 0};
				return {...rc, ...vals};
			}
			testOfficerId = rv.user_id;
			testResults.push({step: "Setup: create test officer", status: "passed", user_id: testOfficerId});

			testResults.push({step: "Setup: create test resident", status: "running"});
			rv = $executeAPI(session, "Resident/add_resident", {
				first_name: `TrkRes ${uniqueId}`,
				last_name: `ResLast ${uniqueId}`,
				phone_num: testResidentPhone,
				email: testResidentEmail,
				community_id: testCommunityId,
				address: "123 Test Street"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test resident", status: "failed", error: rv.message});
			}
			else
			{
				testResidentId = rv.user_id;
				testResults.push({step: "Setup: create test resident", status: "passed", user_id: testResidentId});
			}

			// Create a shift for context (not strictly required but useful for shift_id testing)
			testResults.push({step: "Setup: create test shift", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: tomorrowStr,
				start_time: "08:00",
				end_time: "16:00",
				notes: "Tracking test shift"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test shift", status: "warning", error: rv.message});
			}
			else
			{
				testShiftId = rv.shift_id;
				testResults.push({step: "Setup: create test shift", status: "passed", shift_id: testShiftId});
			}


			// =================================================================
			// Test 1: update_location (as officer, all parameters)
			// =================================================================

			testResults.push({step: "Test 1: update_location (all parameters)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 33.4484367,
					longitude: -112.0740373,
					accuracy: 8.5,
					speed: 1.2,
					heading: 270.0,
					altitude: 345.0,
					source: "gps",
					shift_id: testShiftId || 0,
					call_id: 0
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 1: update_location (all parameters)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 1: update_location (all parameters)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 1: update_location (all parameters)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 2: update_location (minimal parameters — only lat/lng)
			// =================================================================

			testResults.push({step: "Test 2: update_location (minimal params)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 33.4490123,
					longitude: -112.0735890
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 2: update_location (minimal params)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 2: update_location (minimal params)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 2: update_location (minimal params)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 3: update_location (network source)
			// =================================================================

			testResults.push({step: "Test 3: update_location (network source)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 33.4495000,
					longitude: -112.0730000,
					accuracy: 50.0,
					source: "network"
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 3: update_location (network source)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 3: update_location (network source)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 3: update_location (network source)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 4: update_location (manual source)
			// =================================================================

			testResults.push({step: "Test 4: update_location (manual source)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 33.4500000,
					longitude: -112.0725000,
					source: "manual"
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 4: update_location (manual source)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 4: update_location (manual source)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 4: update_location (manual source)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 5: update_location (invalid latitude — out of range)
			// =================================================================

			testResults.push({step: "Test 5: update_location (invalid latitude)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 95.0,
					longitude: -112.0740373
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if (rv.rc === 660)
				{
					testResults.push({step: "Test 5: update_location (invalid latitude)", status: "passed", message: "correctly rejected out-of-range latitude with rc 660"});
				}
				else
				{
					testResults.push({step: "Test 5: update_location (invalid latitude)", status: "warning", message: "expected rc 660 for invalid latitude", rc: rv.rc});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 5: update_location (invalid latitude)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 6: update_location (invalid longitude — out of range)
			// =================================================================

			testResults.push({step: "Test 6: update_location (invalid longitude)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 33.4484367,
					longitude: 200.0
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if (rv.rc === 660)
				{
					testResults.push({step: "Test 6: update_location (invalid longitude)", status: "passed", message: "correctly rejected out-of-range longitude with rc 660"});
				}
				else
				{
					testResults.push({step: "Test 6: update_location (invalid longitude)", status: "warning", message: "expected rc 660 for invalid longitude", rc: rv.rc});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 6: update_location (invalid longitude)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 7: update_location (invalid source)
			// =================================================================

			testResults.push({step: "Test 7: update_location (invalid source)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 33.4484367,
					longitude: -112.0740373,
					source: "invalid_source"
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if (rv.rc === 665)
				{
					testResults.push({step: "Test 7: update_location (invalid source)", status: "passed", message: "correctly rejected invalid source with rc 665"});
				}
				else
				{
					testResults.push({step: "Test 7: update_location (invalid source)", status: "warning", message: "expected rc 665 for invalid source", rc: rv.rc});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 7: update_location (invalid source)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 8: update_location (boundary — latitude at limits)
			// =================================================================

			testResults.push({step: "Test 8: update_location (boundary lat -90)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: -90.0,
					longitude: -112.0740373
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 8: update_location (boundary lat -90)", status: "warning", message: "rejected valid boundary latitude -90", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 8: update_location (boundary lat -90)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 8: update_location (boundary lat -90)", status: "error", error: impErr.message});
			}

			testResults.push({step: "Test 9: update_location (boundary lat +90)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 90.0,
					longitude: 0
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 9: update_location (boundary lat +90)", status: "warning", message: "rejected valid boundary latitude +90", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 9: update_location (boundary lat +90)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 9: update_location (boundary lat +90)", status: "error", error: impErr.message});
			}

			testResults.push({step: "Test 10: update_location (boundary lng -180)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 0,
					longitude: -180.0
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 10: update_location (boundary lng -180)", status: "warning", message: "rejected valid boundary longitude -180", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 10: update_location (boundary lng -180)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 10: update_location (boundary lng -180)", status: "error", error: impErr.message});
			}

			testResults.push({step: "Test 11: update_location (boundary lng +180)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/update_location", {
					latitude: 0,
					longitude: 180.0
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 11: update_location (boundary lng +180)", status: "warning", message: "rejected valid boundary longitude +180", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 11: update_location (boundary lng +180)", status: "passed"});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 11: update_location (boundary lng +180)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 12: get_live_tracking (as admin, all communities)
			// =================================================================

			testResults.push({step: "Test 12: get_live_tracking (all communities)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_live_tracking", {
				community_id: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 12: get_live_tracking (all communities)", status: "failed", error: rv.message});
			}
			else
			{
				let hasOfficers = Array.isArray(rv.officers);
				let hasThreshold = typeof rv.stale_threshold_min === "number";
				testResults.push({step: "Test 12: get_live_tracking (all communities)", status: "passed", officer_count: hasOfficers ? rv.officers.length : 0, has_threshold: hasThreshold});
			}


			// =================================================================
			// Test 13: get_live_tracking (filtered by community)
			// =================================================================

			testResults.push({step: "Test 13: get_live_tracking (by community)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_live_tracking", {
				community_id: testCommunityId
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 13: get_live_tracking (by community)", status: "failed", error: rv.message});
			}
			else
			{
				// Should find our test officer who just pushed GPS data
				let found = rv.officers.find(o => o.officer_id === testOfficerId);
				if (found)
				{
					testResults.push({step: "Test 13: get_live_tracking (by community)", status: "passed", found_officer: true, status_value: found.status});
				}
				else
				{
					testResults.push({step: "Test 13: get_live_tracking (by community)", status: "warning", found_officer: false, message: "test officer not found in live tracking"});
				}
			}


			// =================================================================
			// Test 14: get_live_tracking (verify officer response fields)
			// =================================================================

			testResults.push({step: "Test 14: get_live_tracking (verify fields)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_live_tracking", {
				community_id: testCommunityId
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 14: get_live_tracking (verify fields)", status: "failed", error: rv.message});
			}
			else
			{
				let officer = rv.officers.find(o => o.officer_id === testOfficerId);
				if (officer)
				{
					let fieldsOk = typeof officer.latitude === "number" &&
								   typeof officer.longitude === "number" &&
								   typeof officer.first_name === "string" &&
								   typeof officer.last_name === "string" &&
								   typeof officer.status === "string" &&
								   typeof officer.is_stale === "boolean" &&
								   typeof officer.is_checked_in === "boolean" &&
								   officer.community_id === testCommunityId &&
								   typeof officer.last_update === "string" &&
								   ["green", "amber", "blue", "red", "grey"].indexOf(officer.status) !== -1;
					if (fieldsOk)
					{
						testResults.push({step: "Test 14: get_live_tracking (verify fields)", status: "passed", verified: true, officer_status: officer.status});
					}
					else
					{
						testResults.push({step: "Test 14: get_live_tracking (verify fields)", status: "warning", verified: false, message: "Some officer fields missing or wrong type"});
					}
				}
				else
				{
					testResults.push({step: "Test 14: get_live_tracking (verify fields)", status: "warning", message: "test officer not found"});
				}
			}


			// =================================================================
			// Test 15: get_live_tracking (invalid community)
			// =================================================================

			testResults.push({step: "Test 15: get_live_tracking (invalid community)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_live_tracking", {
				community_id: 999999999
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 15: get_live_tracking (invalid community)", status: "passed", message: "correctly rejected invalid community", rc: rv.rc});
			}
			else
			{
				testResults.push({step: "Test 15: get_live_tracking (invalid community)", status: "warning", message: "expected error for non-existent community"});
			}


			// =================================================================
			// Test 16: get_officer_location (as admin)
			// =================================================================

			testResults.push({step: "Test 16: get_officer_location", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_location", {
				officer_id: testOfficerId
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 16: get_officer_location", status: "failed", error: rv.message});
			}
			else
			{
				let hasLocation = rv.location && typeof rv.location.latitude === "number" && typeof rv.location.longitude === "number";
				let hasOfficerFields = rv.officer_id === testOfficerId &&
									  typeof rv.first_name === "string" &&
									  typeof rv.last_name === "string" &&
									  typeof rv.is_stale === "boolean" &&
									  typeof rv.is_checked_in === "boolean" &&
									  typeof rv.minutes_since_update === "number";
				if (hasLocation && hasOfficerFields)
				{
					testResults.push({step: "Test 16: get_officer_location", status: "passed", verified: true, is_stale: rv.is_stale, minutes_since_update: rv.minutes_since_update});
				}
				else
				{
					testResults.push({step: "Test 16: get_officer_location", status: "warning", verified: false, message: "Some fields missing or wrong type"});
				}
			}


			// =================================================================
			// Test 17: get_officer_location (verify location data matches)
			// =================================================================

			testResults.push({step: "Test 17: get_officer_location (verify data)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_location", {
				officer_id: testOfficerId
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 17: get_officer_location (verify data)", status: "failed", error: rv.message});
			}
			else
			{
				// Last location pushed was manual source at 33.45, -112.0725
				let loc = rv.location;
				let hasSource = typeof loc.source === "string";
				let hasRecordedOn = typeof loc.recorded_on === "string";
				if (hasSource && hasRecordedOn)
				{
					testResults.push({step: "Test 17: get_officer_location (verify data)", status: "passed", source: loc.source, recorded_on: loc.recorded_on, latitude: loc.latitude, longitude: loc.longitude});
				}
				else
				{
					testResults.push({step: "Test 17: get_officer_location (verify data)", status: "warning", message: "location data incomplete"});
				}
			}


			// =================================================================
			// Test 18: get_officer_location (invalid officer ID)
			// =================================================================

			testResults.push({step: "Test 18: get_officer_location (invalid officer)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_location", {
				officer_id: "nonexistent_officer_999"
			});
			if (rv.rc === 661)
			{
				testResults.push({step: "Test 18: get_officer_location (invalid officer)", status: "passed", message: "correctly returned rc 661 for non-existent officer"});
			}
			else
			{
				testResults.push({step: "Test 18: get_officer_location (invalid officer)", status: "warning", message: "expected rc 661", rc: rv.rc});
			}


			// =================================================================
			// Test 19: get_officer_route_history (valid time range)
			// =================================================================

			let now = new Date();
			let oneHourAgo = new Date(now.getTime() - 3600000);
			let oneHourLater = new Date(now.getTime() + 3600000);

			let formatDatetime = function(d)
			{
				let pad = function(n) { return n < 10 ? "0" + n : String(n); };
				return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
			};

			testResults.push({step: "Test 19: get_officer_route_history", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: formatDatetime(oneHourAgo),
				date_to: formatDatetime(oneHourLater)
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 19: get_officer_route_history", status: "failed", error: rv.message});
			}
			else
			{
				let hasPoints = Array.isArray(rv.points);
				let hasCount = typeof rv.num_of_items === "number";
				// We pushed multiple GPS points earlier, so should have at least some results
				if (hasPoints && hasCount && rv.num_of_items > 0)
				{
					testResults.push({step: "Test 19: get_officer_route_history", status: "passed", num_of_items: rv.num_of_items, point_count: rv.points.length});
				}
				else if (hasPoints && hasCount)
				{
					testResults.push({step: "Test 19: get_officer_route_history", status: "warning", num_of_items: rv.num_of_items, message: "no GPS points found in time range"});
				}
				else
				{
					testResults.push({step: "Test 19: get_officer_route_history", status: "warning", message: "unexpected response structure"});
				}
			}


			// =================================================================
			// Test 20: get_officer_route_history (verify point fields)
			// =================================================================

			testResults.push({step: "Test 20: get_officer_route_history (verify fields)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: formatDatetime(oneHourAgo),
				date_to: formatDatetime(oneHourLater)
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 20: get_officer_route_history (verify fields)", status: "failed", error: rv.message});
			}
			else if (rv.points.length > 0)
			{
				let pt = rv.points[0];
				let fieldsOk = typeof pt.latitude === "number" &&
							   typeof pt.longitude === "number" &&
							   typeof pt.recorded_on === "string" &&
							   pt.source !== undefined;
				if (fieldsOk)
				{
					testResults.push({step: "Test 20: get_officer_route_history (verify fields)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 20: get_officer_route_history (verify fields)", status: "warning", verified: false, message: "point fields not as expected"});
				}
			}
			else
			{
				testResults.push({step: "Test 20: get_officer_route_history (verify fields)", status: "warning", message: "no points to verify"});
			}


			// =================================================================
			// Test 21: get_officer_route_history (with shift_id filter)
			// =================================================================

			testResults.push({step: "Test 21: get_officer_route_history (shift filter)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 21: get_officer_route_history (shift filter)", status: "failed", error: "Cannot test - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Tracking/get_officer_route_history", {
					officer_id: testOfficerId,
					date_from: formatDatetime(oneHourAgo),
					date_to: formatDatetime(oneHourLater),
					shift_id: testShiftId
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 21: get_officer_route_history (shift filter)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 21: get_officer_route_history (shift filter)", status: "passed", num_of_items: rv.num_of_items});
				}
			}


			// =================================================================
			// Test 22: get_officer_route_history (invalid officer)
			// =================================================================

			testResults.push({step: "Test 22: get_officer_route_history (invalid officer)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: "nonexistent_officer_999",
				date_from: formatDatetime(oneHourAgo),
				date_to: formatDatetime(oneHourLater)
			});
			if (rv.rc === 661)
			{
				testResults.push({step: "Test 22: get_officer_route_history (invalid officer)", status: "passed", message: "correctly returned rc 661"});
			}
			else
			{
				testResults.push({step: "Test 22: get_officer_route_history (invalid officer)", status: "warning", message: "expected rc 661", rc: rv.rc});
			}


			// =================================================================
			// Test 23: get_officer_route_history (missing date_from)
			// =================================================================

			testResults.push({step: "Test 23: get_officer_route_history (missing date_from)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: "",
				date_to: formatDatetime(oneHourLater)
			});
			if (rv.rc === 666)
			{
				testResults.push({step: "Test 23: get_officer_route_history (missing date_from)", status: "passed", message: "correctly returned rc 666 for missing date_from"});
			}
			else
			{
				testResults.push({step: "Test 23: get_officer_route_history (missing date_from)", status: "warning", message: "expected rc 666", rc: rv.rc});
			}


			// =================================================================
			// Test 24: get_officer_route_history (inverted date range)
			// =================================================================

			testResults.push({step: "Test 24: get_officer_route_history (inverted range)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: formatDatetime(oneHourLater),
				date_to: formatDatetime(oneHourAgo)
			});
			if (rv.rc === 666)
			{
				testResults.push({step: "Test 24: get_officer_route_history (inverted range)", status: "passed", message: "correctly returned rc 666 for from > to"});
			}
			else
			{
				testResults.push({step: "Test 24: get_officer_route_history (inverted range)", status: "warning", message: "expected rc 666", rc: rv.rc});
			}


			// =================================================================
			// Test 25: get_officer_route_history (invalid date format)
			// =================================================================

			testResults.push({step: "Test 25: get_officer_route_history (invalid date format)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: "not-a-date",
				date_to: "also-not-a-date"
			});
			if (rv.rc === 666)
			{
				testResults.push({step: "Test 25: get_officer_route_history (invalid date format)", status: "passed", message: "correctly returned rc 666 for invalid date format"});
			}
			else
			{
				testResults.push({step: "Test 25: get_officer_route_history (invalid date format)", status: "warning", message: "expected rc 666", rc: rv.rc});
			}


			// =================================================================
			// Test 26: get_officer_route_history (empty time range — no data)
			// =================================================================

			testResults.push({step: "Test 26: get_officer_route_history (empty range)", status: "running"});
			let farFuture = new Date(now.getTime() + 86400000 * 365);
			let farFuture2 = new Date(farFuture.getTime() + 3600000);
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: formatDatetime(farFuture),
				date_to: formatDatetime(farFuture2)
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 26: get_officer_route_history (empty range)", status: "failed", error: rv.message});
			}
			else
			{
				if (rv.num_of_items === 0)
				{
					testResults.push({step: "Test 26: get_officer_route_history (empty range)", status: "passed", message: "correctly returned 0 points for future range"});
				}
				else
				{
					testResults.push({step: "Test 26: get_officer_route_history (empty range)", status: "warning", message: "expected 0 points", num_of_items: rv.num_of_items});
				}
			}


			// =================================================================
			// Test 27: get_call_eta (setup: create emergency call and accept)
			// =================================================================

			// Create an emergency call as the resident, then accept as the officer
			let etaCallId = null;

			testResults.push({step: "Test 27: get_call_eta (setup: create call)", status: "running"});
			if (testResidentId === null)
			{
				testResults.push({step: "Test 27: get_call_eta (setup: create call)", status: "failed", error: "Cannot test - resident was not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testResidentId);

					rv = $executeAPI(session, "Call/create_call", {
						category: "medical_emergency",
						description: "Tracking test emergency call",
						current_address: "456 Emergency Lane",
						latitude: "33.4520100",
						longitude: "-112.0710200"
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 27: get_call_eta (setup: create call)", status: "failed", error: rv.message});
					}
					else
					{
						testCallId = rv.call_id;
						testResults.push({step: "Test 27: get_call_eta (setup: create call)", status: "passed", call_id: testCallId});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 27: get_call_eta (setup: create call)", status: "error", error: impErr.message});
				}
			}

			// Accept the call as the officer
			testResults.push({step: "Test 28: get_call_eta (setup: accept call)", status: "running"});
			if (testCallId === null)
			{
				testResults.push({step: "Test 28: get_call_eta (setup: accept call)", status: "failed", error: "Cannot accept - call was not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Call/accept_call", {
						call_id: testCallId
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 28: get_call_eta (setup: accept call)", status: "failed", error: rv.message});
					}
					else
					{
						etaCallId = testCallId;
						testResults.push({step: "Test 28: get_call_eta (setup: accept call)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 28: get_call_eta (setup: accept call)", status: "error", error: impErr.message});
				}
			}


			// =================================================================
			// Test 29: get_call_eta (as officer)
			// =================================================================

			testResults.push({step: "Test 29: get_call_eta (as officer)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 29: get_call_eta (as officer)", status: "failed", error: "Cannot test - no accepted call available"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Tracking/get_call_eta", {
						call_id: etaCallId
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 29: get_call_eta (as officer)", status: "failed", error: rv.message});
					}
					else if (rv.eta_available === true)
					{
						let fieldsOk = typeof rv.distance_m === "number" &&
									   typeof rv.eta_min === "number" &&
									   typeof rv.eta_walking_min === "number" &&
									   typeof rv.officer_latitude === "number" &&
									   typeof rv.officer_longitude === "number" &&
									   typeof rv.officer_last_update === "string" &&
									   typeof rv.call_latitude === "number" &&
									   typeof rv.call_longitude === "number";
						if (fieldsOk)
						{
							testResults.push({step: "Test 29: get_call_eta (as officer)", status: "passed", distance_m: rv.distance_m, eta_min: rv.eta_min, eta_walking_min: rv.eta_walking_min});
						}
						else
						{
							testResults.push({step: "Test 29: get_call_eta (as officer)", status: "warning", message: "ETA fields missing or wrong type"});
						}
					}
					else
					{
						testResults.push({step: "Test 29: get_call_eta (as officer)", status: "warning", eta_available: false, reason: rv.reason});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 29: get_call_eta (as officer)", status: "error", error: impErr.message});
				}
			}


			// =================================================================
			// Test 30: get_call_eta (as resident — own call)
			// =================================================================

			testResults.push({step: "Test 30: get_call_eta (as resident)", status: "running"});
			if (etaCallId === null || testResidentId === null)
			{
				testResults.push({step: "Test 30: get_call_eta (as resident)", status: "failed", error: "Cannot test - no accepted call or resident not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testResidentId);

					rv = $executeAPI(session, "Tracking/get_call_eta", {
						call_id: etaCallId
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 30: get_call_eta (as resident)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 30: get_call_eta (as resident)", status: "passed", eta_available: rv.eta_available});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 30: get_call_eta (as resident)", status: "error", error: impErr.message});
				}
			}


			// =================================================================
			// Test 31: get_call_eta (invalid call ID)
			// =================================================================

			testResults.push({step: "Test 31: get_call_eta (invalid call ID)", status: "running"});
			try
			{
				session.impersonateAccount(testOfficerId);

				rv = $executeAPI(session, "Tracking/get_call_eta", {
					call_id: 999999999
				});

				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;

				if (rv.rc === 662)
				{
					testResults.push({step: "Test 31: get_call_eta (invalid call ID)", status: "passed", message: "correctly returned rc 662 for non-existent call"});
				}
				else
				{
					testResults.push({step: "Test 31: get_call_eta (invalid call ID)", status: "warning", message: "expected rc 662", rc: rv.rc});
				}
			}
			catch (impErr)
			{
				session.accountImpersonationStack = null;
				session.userId = adminUserId;
				session.userType = $Const.USER_TYPE_ADMIN;
				testResults.push({step: "Test 31: get_call_eta (invalid call ID)", status: "error", error: impErr.message});
			}


			// =================================================================
			// Test 32: get_call_eta (verify ETA reasonableness)
			// =================================================================

			testResults.push({step: "Test 32: get_call_eta (verify ETA values)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 32: get_call_eta (verify ETA values)", status: "failed", error: "Cannot test - no accepted call"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Tracking/get_call_eta", {
						call_id: etaCallId
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if (!$Err.isERR(rv) && rv.eta_available === true)
					{
						// ETA walking should be longer than vehicular
						let walkingLonger = rv.eta_walking_min >= rv.eta_min;
						// Distance should be positive
						let distPositive = rv.distance_m > 0;
						// Minimum ETA is 1
						let minEta = rv.eta_min >= 1 && rv.eta_walking_min >= 1;

						if (walkingLonger && distPositive && minEta)
						{
							testResults.push({step: "Test 32: get_call_eta (verify ETA values)", status: "passed", walking_longer: true, distance_positive: true, min_eta_ok: true});
						}
						else
						{
							testResults.push({step: "Test 32: get_call_eta (verify ETA values)", status: "warning", walking_longer: walkingLonger, distance_positive: distPositive, min_eta_ok: minEta});
						}
					}
					else
					{
						testResults.push({step: "Test 32: get_call_eta (verify ETA values)", status: "warning", message: "ETA not available for verification"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 32: get_call_eta (verify ETA values)", status: "error", error: impErr.message});
				}
			}


			// =================================================================
			// Test 33: get_call_eta (resident accessing another resident's call)
			// =================================================================

			testResults.push({step: "Test 33: get_call_eta (wrong resident)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 33: get_call_eta (wrong resident)", status: "failed", error: "Cannot test - no accepted call"});
			}
			else
			{
				// Create a second resident to try accessing the first resident's call
				let otherResidentPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
				let otherResidentEmail = `trkres2_${uniqueId}@test.com`;
				let otherResidentId = null;

				rv = $executeAPI(session, "Resident/add_resident", {
					first_name: `TrkRes2 ${uniqueId}`,
					last_name: `ResLast2 ${uniqueId}`,
					phone_num: otherResidentPhone,
					email: otherResidentEmail,
					community_id: testCommunityId,
					address: "789 Other Street"
				});
				if (!$Err.isERR(rv))
				{
					otherResidentId = rv.user_id;
				}

				if (otherResidentId === null)
				{
					testResults.push({step: "Test 33: get_call_eta (wrong resident)", status: "warning", message: "could not create second resident"});
				}
				else
				{
					try
					{
						session.impersonateAccount(otherResidentId);

						rv = $executeAPI(session, "Tracking/get_call_eta", {
							call_id: etaCallId
						});

						session.accountImpersonationStack = null;
						session.userId = adminUserId;
						session.userType = $Const.USER_TYPE_ADMIN;

						if (rv.rc === 662)
						{
							testResults.push({step: "Test 33: get_call_eta (wrong resident)", status: "passed", message: "correctly blocked other resident with rc 662"});
						}
						else
						{
							testResults.push({step: "Test 33: get_call_eta (wrong resident)", status: "warning", message: "expected rc 662 for other resident accessing call", rc: rv.rc});
						}
					}
					catch (impErr)
					{
						session.accountImpersonationStack = null;
						session.userId = adminUserId;
						session.userType = $Const.USER_TYPE_ADMIN;
						testResults.push({step: "Test 33: get_call_eta (wrong resident)", status: "error", error: impErr.message});
					}
				}
			}


			// =================================================================
			// Test 34: get_call_eta (officer accessing another officer's call)
			// =================================================================

			testResults.push({step: "Test 34: get_call_eta (wrong officer)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 34: get_call_eta (wrong officer)", status: "failed", error: "Cannot test - no accepted call"});
			}
			else
			{
				let otherOfficerPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
				let otherOfficerEmail = `trkofc2_${uniqueId}@test.com`;
				let otherOfficerId = null;

				rv = $executeAPI(session, "Officer/add_officer", {
					first_name: `TrkOfc2 ${uniqueId}`,
					last_name: `Last2 ${uniqueId}`,
					phone_num: otherOfficerPhone,
					email: otherOfficerEmail,
					community_id: testCommunityId,
					title: "Security Officer 2",
					address: "Other Officer Address"
				});
				if (!$Err.isERR(rv))
				{
					otherOfficerId = rv.user_id;
				}

				if (otherOfficerId === null)
				{
					testResults.push({step: "Test 34: get_call_eta (wrong officer)", status: "warning", message: "could not create second officer"});
				}
				else
				{
					try
					{
						session.impersonateAccount(otherOfficerId);

						rv = $executeAPI(session, "Tracking/get_call_eta", {
							call_id: etaCallId
						});

						session.accountImpersonationStack = null;
						session.userId = adminUserId;
						session.userType = $Const.USER_TYPE_ADMIN;

						if (rv.rc === 662)
						{
							testResults.push({step: "Test 34: get_call_eta (wrong officer)", status: "passed", message: "correctly blocked other officer with rc 662"});
						}
						else
						{
							testResults.push({step: "Test 34: get_call_eta (wrong officer)", status: "warning", message: "expected rc 662 for other officer accessing call", rc: rv.rc});
						}
					}
					catch (impErr)
					{
						session.accountImpersonationStack = null;
						session.userId = adminUserId;
						session.userType = $Const.USER_TYPE_ADMIN;
						testResults.push({step: "Test 34: get_call_eta (wrong officer)", status: "error", error: impErr.message});
					}
				}
			}


			// =================================================================
			// Test 35: update_location (push more GPS with call_id context)
			// =================================================================

			testResults.push({step: "Test 35: update_location (with call_id)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 35: update_location (with call_id)", status: "failed", error: "Cannot test - no accepted call"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Tracking/update_location", {
						latitude: 33.4510000,
						longitude: -112.0715000,
						accuracy: 5.0,
						speed: 8.3,
						heading: 90.0,
						altitude: 344.0,
						source: "gps",
						shift_id: testShiftId || 0,
						call_id: etaCallId
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 35: update_location (with call_id)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 35: update_location (with call_id)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 35: update_location (with call_id)", status: "error", error: impErr.message});
				}
			}


			// =================================================================
			// Test 36: get_officer_route_history (verify call_id in points)
			// =================================================================

			testResults.push({step: "Test 36: get_officer_route_history (verify call_id)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 36: get_officer_route_history (verify call_id)", status: "failed", error: "Cannot verify - no call"});
			}
			else
			{
				rv = $executeAPI(session, "Tracking/get_officer_route_history", {
					officer_id: testOfficerId,
					date_from: formatDatetime(oneHourAgo),
					date_to: formatDatetime(oneHourLater)
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 36: get_officer_route_history (verify call_id)", status: "failed", error: rv.message});
				}
				else
				{
					let pointWithCall = rv.points.find(p => p.call_id === etaCallId);
					if (pointWithCall)
					{
						testResults.push({step: "Test 36: get_officer_route_history (verify call_id)", status: "passed", verified: true, call_id: pointWithCall.call_id});
					}
					else
					{
						testResults.push({step: "Test 36: get_officer_route_history (verify call_id)", status: "warning", verified: false, message: "no point found with expected call_id"});
					}
				}
			}


			// =================================================================
			// Test 37: get_call_eta (updated ETA after officer moved closer)
			// =================================================================

			testResults.push({step: "Test 37: get_call_eta (updated after move)", status: "running"});
			if (etaCallId === null)
			{
				testResults.push({step: "Test 37: get_call_eta (updated after move)", status: "failed", error: "Cannot test - no accepted call"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Tracking/get_call_eta", {
						call_id: etaCallId
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if (!$Err.isERR(rv) && rv.eta_available === true)
					{
						// Officer moved closer (33.451, -112.0715) to call (33.452, -112.071)
						// Distance should be relatively small
						testResults.push({step: "Test 37: get_call_eta (updated after move)", status: "passed", distance_m: rv.distance_m, eta_min: rv.eta_min});
					}
					else if (!$Err.isERR(rv))
					{
						testResults.push({step: "Test 37: get_call_eta (updated after move)", status: "warning", eta_available: false, reason: rv.reason});
					}
					else
					{
						testResults.push({step: "Test 37: get_call_eta (updated after move)", status: "failed", error: rv.message});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 37: get_call_eta (updated after move)", status: "error", error: impErr.message});
				}
			}


			// =================================================================
			// Test 38: get_officer_route_history (chronological order)
			// =================================================================

			testResults.push({step: "Test 38: get_officer_route_history (order check)", status: "running"});
			rv = $executeAPI(session, "Tracking/get_officer_route_history", {
				officer_id: testOfficerId,
				date_from: formatDatetime(oneHourAgo),
				date_to: formatDatetime(oneHourLater)
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 38: get_officer_route_history (order check)", status: "failed", error: rv.message});
			}
			else if (rv.points.length >= 2)
			{
				let inOrder = true;
				for (let i = 1; i < rv.points.length; i++)
				{
					if (rv.points[i].recorded_on < rv.points[i - 1].recorded_on)
					{
						inOrder = false;
						break;
					}
				}
				if (inOrder)
				{
					testResults.push({step: "Test 38: get_officer_route_history (order check)", status: "passed", verified_order: true, point_count: rv.points.length});
				}
				else
				{
					testResults.push({step: "Test 38: get_officer_route_history (order check)", status: "warning", verified_order: false, message: "points not in chronological order"});
				}
			}
			else
			{
				testResults.push({step: "Test 38: get_officer_route_history (order check)", status: "warning", message: "not enough points to verify order", count: rv.points.length});
			}


			// =================================================================
			// Cleanup: resolve call via admin delete_test_call
			// =================================================================

			if (testCallId !== null)
			{
				$executeAPI(session, "Call/delete_test_call", { call_id: testCallId });
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
