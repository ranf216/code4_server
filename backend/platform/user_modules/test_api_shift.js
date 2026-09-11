module.exports =
{
	test_shift_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let testOfficerId = null;
		let testOfficerId2 = null;
		let testPostId = null;
		let testShiftId = null;
		let testShiftId2 = null;
		let recurringSeriesId = null;
		let recurringShiftIds = null;

		try
		{
			testResults.push({step: "Starting Shift API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);
			let testOfficerFirst = `TestShiftOfc ${uniqueId}`;
			let testOfficerLast = `OfcLast ${uniqueId}`;
			let testOfficerPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testOfficerEmail = `shiftofc_${uniqueId}@test.com`;
			let testOfficerFirst2 = `TestShiftOfc2 ${uniqueId}`;
			let testOfficerLast2 = `OfcLast2 ${uniqueId}`;
			let testOfficerPhone2 = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testOfficerEmail2 = `shiftofc2_${uniqueId}@test.com`;

			// Tomorrow and day after for shift dates
			let tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			let tomorrowStr = tomorrow.toISOString().split("T")[0];

			let dayAfter = new Date();
			dayAfter.setDate(dayAfter.getDate() + 2);
			let dayAfterStr = dayAfter.toISOString().split("T")[0];

			let nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			let nextWeekStr = nextWeek.toISOString().split("T")[0];

			let twoWeeks = new Date();
			twoWeeks.setDate(twoWeeks.getDate() + 14);
			let twoWeeksStr = twoWeeks.toISOString().split("T")[0];

			// =================================================================
			// Setup: Create community, officers, and post
			// =================================================================

			testResults.push({step: "Setup: create test community", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `Shift Test Community ${uniqueId}`,
				area: "Test Area",
				latitude: 25.276987,
				longitude: 55.296249,
				location_name: "Test Location",
				timezone: "Asia/Dubai",
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
				first_name: testOfficerFirst,
				last_name: testOfficerLast,
				phone_num: testOfficerPhone,
				email: testOfficerEmail,
				community_id: testCommunityId,
				title: `Security Officer ${uniqueId}`,
				address: "Test Officer Address"
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
				first_name: testOfficerFirst2,
				last_name: testOfficerLast2,
				phone_num: testOfficerPhone2,
				email: testOfficerEmail2,
				community_id: testCommunityId,
				title: `Security Officer 2 ${uniqueId}`,
				address: "Test Officer 2 Address"
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

			// Create a post for post-assignment tests
			testResults.push({step: "Setup: create test post", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `Test Post ${uniqueId}`,
				location: JSON.stringify({latitude: 25.276987, longitude: 55.296249})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test post", status: "warning", error: rv.message, message: "Post tests will be skipped"});
			}
			else
			{
				testPostId = rv.post_id;
				testResults.push({step: "Setup: create test post", status: "passed", post_id: testPostId});
			}

			// =================================================================
			// Test 1: create_shift
			// =================================================================

			testResults.push({step: "Test 1: create_shift", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: tomorrowStr,
				start_time: "08:00",
				end_time: "16:00",
				notes: "Test shift created by API test"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: create_shift", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testShiftId = rv.shift_id;
			testResults.push({step: "Test 1: create_shift", status: "passed", shift_id: testShiftId});

			// =================================================================
			// Test 2: create_shift (with officers pre-allocated)
			// =================================================================

			testResults.push({step: "Test 2: create_shift (with officers)", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: dayAfterStr,
				start_time: "09:00",
				end_time: "17:00",
				officer_ids: [testOfficerId],
				notes: "Test shift with pre-allocated officer"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 2: create_shift (with officers)", status: "failed", error: rv.message});
			}
			else
			{
				testShiftId2 = rv.shift_id;
				testResults.push({step: "Test 2: create_shift (with officers)", status: "passed", shift_id: testShiftId2});
			}

			// =================================================================
			// Test 3: create_shift (overnight)
			// =================================================================

			testResults.push({step: "Test 3: create_shift (overnight)", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: nextWeekStr,
				start_time: "22:00",
				end_time: "06:00",
				notes: "Overnight shift test"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 3: create_shift (overnight)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 3: create_shift (overnight)", status: "passed", shift_id: rv.shift_id});
				// Clean up this one right away
				$executeAPI(session, "Shift/delete_shift", {shift_id: rv.shift_id});
			}

			// =================================================================
			// Test 4: create_shift (invalid time range)
			// =================================================================

			testResults.push({step: "Test 4: create_shift (invalid time range)", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: tomorrowStr,
				start_time: "25:00",
				end_time: "16:00"
			});
			if ($Err.isERR(rv) && rv.rc === 619)
			{
				testResults.push({step: "Test 4: create_shift (invalid time range)", status: "passed", message: "correctly rejected invalid time with rc 619"});
			}
			else
			{
				testResults.push({step: "Test 4: create_shift (invalid time range)", status: "warning", message: "expected rc 619 for invalid time range", rc: rv.rc});
			}

			// =================================================================
			// Test 5: create_shift (invalid community)
			// =================================================================

			testResults.push({step: "Test 5: create_shift (invalid community)", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: 999999999,
				shift_date: tomorrowStr,
				start_time: "08:00",
				end_time: "16:00"
			});
			if ($Err.isERR(rv) && rv.rc === 500)
			{
				testResults.push({step: "Test 5: create_shift (invalid community)", status: "passed", message: "correctly rejected invalid community with rc 500"});
			}
			else
			{
				testResults.push({step: "Test 5: create_shift (invalid community)", status: "warning", message: "expected rc 500 for invalid community", rc: rv.rc});
			}

			// =================================================================
			// Test 6: get_shift
			// =================================================================

			testResults.push({step: "Test 6: get_shift", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 6: get_shift", status: "failed", error: "Cannot get - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/get_shift", {shift_id: testShiftId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 6: get_shift", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.shift || rv;
					let verified = s.shift_id === testShiftId &&
								   s.notes === "Test shift created by API test";
					if (verified)
					{
						testResults.push({step: "Test 6: get_shift", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 6: get_shift", status: "warning", verified: false, message: "Shift fields not saved correctly"});
					}
				}
			}

			// =================================================================
			// Test 7: get_shift (invalid ID)
			// =================================================================

			testResults.push({step: "Test 7: get_shift (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Shift/get_shift", {shift_id: 999999999});
			if ($Err.isERR(rv) && rv.rc === 610)
			{
				testResults.push({step: "Test 7: get_shift (invalid ID)", status: "passed", message: "correctly returned not found with rc 610"});
			}
			else
			{
				testResults.push({step: "Test 7: get_shift (invalid ID)", status: "warning", message: "expected rc 610 for invalid shift ID", rc: rv.rc});
			}

			// =================================================================
			// Test 8: get_shifts_calendar
			// =================================================================

			testResults.push({step: "Test 8: get_shifts_calendar", status: "running"});
			rv = $executeAPI(session, "Shift/get_shifts_calendar", {
				community_id: testCommunityId,
				date_from: tomorrowStr,
				date_to: dayAfterStr
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 8: get_shifts_calendar", status: "failed", error: rv.message});
			}
			else
			{
				let shifts = rv.shifts || rv.items || [];
				let found = shifts.find(s => s.shift_id === testShiftId);
				if (found)
				{
					testResults.push({step: "Test 8: get_shifts_calendar", status: "passed", count: shifts.length, found_test_shift: true});
				}
				else
				{
					testResults.push({step: "Test 8: get_shifts_calendar", status: "warning", count: shifts.length, message: "Test shift not found in calendar results"});
				}
			}

			// =================================================================
			// Test 9: get_shifts_calendar (all communities)
			// =================================================================

			testResults.push({step: "Test 9: get_shifts_calendar (all communities)", status: "running"});
			rv = $executeAPI(session, "Shift/get_shifts_calendar", {
				community_id: 0,
				date_from: tomorrowStr,
				date_to: dayAfterStr
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 9: get_shifts_calendar (all communities)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 9: get_shifts_calendar (all communities)", status: "passed"});
			}

			// =================================================================
			// Test 10: get_shifts_calendar (with status filter)
			// =================================================================

			testResults.push({step: "Test 10: get_shifts_calendar (status filter)", status: "running"});
			rv = $executeAPI(session, "Shift/get_shifts_calendar", {
				community_id: testCommunityId,
				date_from: tomorrowStr,
				date_to: dayAfterStr,
				status: "draft"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 10: get_shifts_calendar (status filter)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 10: get_shifts_calendar (status filter)", status: "passed"});
			}

			// =================================================================
			// Test 11: update_shift
			// =================================================================

			testResults.push({step: "Test 11: update_shift", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 11: update_shift", status: "failed", error: "Cannot update - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/update_shift", {
					shift_id: testShiftId,
					start_time: "09:00",
					end_time: "17:00",
					notes: "Updated test shift notes"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 11: update_shift", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 11: update_shift", status: "passed"});
				}
			}

			// =================================================================
			// Test 12: get_shift (verify update)
			// =================================================================

			testResults.push({step: "Test 12: get_shift (verify update)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 12: get_shift (verify update)", status: "failed", error: "Cannot verify - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/get_shift", {shift_id: testShiftId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 12: get_shift (verify update)", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.shift || rv;
					if (s.notes === "Updated test shift notes")
					{
						testResults.push({step: "Test 12: get_shift (verify update)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 12: get_shift (verify update)", status: "warning", verified: false, message: "Notes not updated correctly"});
					}
				}
			}

			// =================================================================
			// Test 13: update_shift (invalid ID)
			// =================================================================

			testResults.push({step: "Test 13: update_shift (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Shift/update_shift", {shift_id: 999999999, notes: "Should Fail"});
			if ($Err.isERR(rv) && rv.rc === 610)
			{
				testResults.push({step: "Test 13: update_shift (invalid ID)", status: "passed", message: "correctly rejected invalid shift ID with rc 610"});
			}
			else
			{
				testResults.push({step: "Test 13: update_shift (invalid ID)", status: "warning", message: "expected rc 610 for invalid shift ID", rc: rv.rc});
			}

			// =================================================================
			// Test 14: allocate_officer
			// =================================================================

			testResults.push({step: "Test 14: allocate_officer", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 14: allocate_officer", status: "failed", error: "Cannot allocate - shift or officer not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/allocate_officer", {
					shift_id: testShiftId,
					officer_id: testOfficerId,
					acknowledge_conflicts: true
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 14: allocate_officer", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 14: allocate_officer", status: "passed"});
				}
			}

			// =================================================================
			// Test 15: allocate_officer (second officer)
			// =================================================================

			testResults.push({step: "Test 15: allocate_officer (second officer)", status: "running"});
			if (testShiftId === null || testOfficerId2 === null)
			{
				testResults.push({step: "Test 15: allocate_officer (second officer)", status: "failed", error: "Cannot allocate - shift or officer2 not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/allocate_officer", {
					shift_id: testShiftId,
					officer_id: testOfficerId2,
					acknowledge_conflicts: true
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 15: allocate_officer (second officer)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 15: allocate_officer (second officer)", status: "passed"});
				}
			}

			// =================================================================
			// Test 16: allocate_officer (duplicate, expect error)
			// =================================================================

			testResults.push({step: "Test 16: allocate_officer (duplicate)", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 16: allocate_officer (duplicate)", status: "failed", error: "Cannot test - shift or officer not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/allocate_officer", {
					shift_id: testShiftId,
					officer_id: testOfficerId,
					acknowledge_conflicts: true
				});
				if ($Err.isERR(rv) && rv.rc === 614)
				{
					testResults.push({step: "Test 16: allocate_officer (duplicate)", status: "passed", message: "correctly rejected duplicate allocation with rc 614"});
				}
				else
				{
					testResults.push({step: "Test 16: allocate_officer (duplicate)", status: "warning", message: "expected rc 614 for duplicate allocation", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 17: allocate_officer (officer not in community)
			// =================================================================

			testResults.push({step: "Test 17: allocate_officer (wrong community)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 17: allocate_officer (wrong community)", status: "failed", error: "Cannot test - shift not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/allocate_officer", {
					shift_id: testShiftId,
					officer_id: "nonexistent_officer_id_12345",
					acknowledge_conflicts: true
				});
				if ($Err.isERR(rv) && rv.rc === 623)
				{
					testResults.push({step: "Test 17: allocate_officer (wrong community)", status: "passed", message: "correctly rejected with rc 623"});
				}
				else
				{
					testResults.push({step: "Test 17: allocate_officer (wrong community)", status: "warning", message: "expected rc 623 for officer not in community", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 18: validate_allocation
			// =================================================================

			testResults.push({step: "Test 18: validate_allocation", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 18: validate_allocation", status: "failed", error: "Cannot validate - shift or officer not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/validate_allocation", {
					shift_id: testShiftId,
					officer_id: testOfficerId
				});
				// This is a dry-run — may return rc:0 or rc:616 with warnings
				if (rv.rc === 0 || rv.rc === 616)
				{
					testResults.push({step: "Test 18: validate_allocation", status: "passed", rc: rv.rc, has_warnings: rv.warnings ? rv.warnings.length > 0 : false});
				}
				else
				{
					testResults.push({step: "Test 18: validate_allocation", status: "warning", message: "unexpected rc from validate_allocation", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 19: get_allocation_board
			// =================================================================

			testResults.push({step: "Test 19: get_allocation_board", status: "running"});
			rv = $executeAPI(session, "Shift/get_allocation_board", {
				community_id: testCommunityId,
				board_date: tomorrowStr
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 19: get_allocation_board", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 19: get_allocation_board", status: "passed"});
			}

			// =================================================================
			// Test 20: assign_post
			// =================================================================

			testResults.push({step: "Test 20: assign_post", status: "running"});
			if (testShiftId === null || testOfficerId === null || testPostId === null)
			{
				testResults.push({step: "Test 20: assign_post", status: "failed", error: "Cannot assign post - shift, officer, or post not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/assign_post", {
					shift_id: testShiftId,
					officer_id: testOfficerId,
					post_id: testPostId
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 20: assign_post", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 20: assign_post", status: "passed"});
				}
			}

			// =================================================================
			// Test 21: assign_post (officer not allocated, expect error)
			// =================================================================

			testResults.push({step: "Test 21: assign_post (unallocated officer)", status: "running"});
			if (testShiftId === null || testPostId === null)
			{
				testResults.push({step: "Test 21: assign_post (unallocated officer)", status: "failed", error: "Cannot test - shift or post not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/assign_post", {
					shift_id: testShiftId,
					officer_id: "nonexistent_officer_id_12345",
					post_id: testPostId
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 21: assign_post (unallocated officer)", status: "passed", message: "correctly rejected unallocated officer", rc: rv.rc});
				}
				else
				{
					testResults.push({step: "Test 21: assign_post (unallocated officer)", status: "warning", message: "expected error for unallocated officer"});
				}
			}

			// =================================================================
			// Test 22: assign_post (invalid post, expect error)
			// =================================================================

			testResults.push({step: "Test 22: assign_post (invalid post)", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 22: assign_post (invalid post)", status: "failed", error: "Cannot test - shift or officer not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/assign_post", {
					shift_id: testShiftId,
					officer_id: testOfficerId,
					post_id: 999999999
				});
				if ($Err.isERR(rv) && rv.rc === 622)
				{
					testResults.push({step: "Test 22: assign_post (invalid post)", status: "passed", message: "correctly rejected invalid post with rc 622"});
				}
				else
				{
					testResults.push({step: "Test 22: assign_post (invalid post)", status: "warning", message: "expected rc 622 for invalid post", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 23: publish_shift
			// =================================================================

			testResults.push({step: "Test 23: publish_shift", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 23: publish_shift", status: "failed", error: "Cannot publish - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/publish_shift", {
					shift_id: testShiftId,
					acknowledge_conflicts: true
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 23: publish_shift", status: "failed", error: rv.message, rc: rv.rc});
				}
				else
				{
					testResults.push({step: "Test 23: publish_shift", status: "passed"});
				}
			}

			// =================================================================
			// Test 24: get_shift (verify status = published)
			// =================================================================

			testResults.push({step: "Test 24: get_shift (verify published)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 24: get_shift (verify published)", status: "failed", error: "Cannot verify - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/get_shift", {shift_id: testShiftId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 24: get_shift (verify published)", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.shift || rv;
					if (s.status === "published")
					{
						testResults.push({step: "Test 24: get_shift (verify published)", status: "passed", status: s.status});
					}
					else
					{
						testResults.push({step: "Test 24: get_shift (verify published)", status: "warning", message: "shift status not published", actual_status: s.status});
					}
				}
			}

			// =================================================================
			// Test 25: publish_shift (already published, expect error)
			// =================================================================

			testResults.push({step: "Test 25: publish_shift (already published)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 25: publish_shift (already published)", status: "failed", error: "Cannot test - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/publish_shift", {shift_id: testShiftId});
				if ($Err.isERR(rv) && rv.rc === 612)
				{
					testResults.push({step: "Test 25: publish_shift (already published)", status: "passed", message: "correctly rejected with rc 612"});
				}
				else
				{
					testResults.push({step: "Test 25: publish_shift (already published)", status: "warning", message: "expected rc 612 for already published shift", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 26: update_shift (published shift — should succeed)
			// =================================================================

			testResults.push({step: "Test 26: update_shift (published)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 26: update_shift (published)", status: "failed", error: "Cannot test - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/update_shift", {
					shift_id: testShiftId,
					notes: "Updated after publish"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 26: update_shift (published)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 26: update_shift (published)", status: "passed"});
				}
			}

			// =================================================================
			// Test 27: check_in (as officer)
			// =================================================================

			testResults.push({step: "Test 27: check_in (as officer)", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 27: check_in (as officer)", status: "failed", error: "Cannot check in - shift or officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/check_in", {shift_id: testShiftId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 27: check_in (as officer)", status: "failed", error: rv.message, rc: rv.rc});
					}
					else
					{
						testResults.push({step: "Test 27: check_in (as officer)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 27: check_in (as officer)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 28: get_shift (verify status = active)
			// =================================================================

			testResults.push({step: "Test 28: get_shift (verify active)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 28: get_shift (verify active)", status: "failed", error: "Cannot verify - shift was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/get_shift", {shift_id: testShiftId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 28: get_shift (verify active)", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.shift || rv;
					if (s.status === "active")
					{
						testResults.push({step: "Test 28: get_shift (verify active)", status: "passed", status: s.status});
					}
					else
					{
						testResults.push({step: "Test 28: get_shift (verify active)", status: "warning", message: "shift status not active after check-in", actual_status: s.status});
					}
				}
			}

			// =================================================================
			// Test 29: check_in (duplicate, expect hard-block rc 617)
			// =================================================================

			testResults.push({step: "Test 29: check_in (duplicate, expect 617)", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 29: check_in (duplicate, expect 617)", status: "failed", error: "Cannot test - shift or officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/check_in", {shift_id: testShiftId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv) && rv.rc === 617)
					{
						testResults.push({step: "Test 29: check_in (duplicate, expect 617)", status: "passed", message: "correctly hard-blocked with rc 617"});
					}
					else
					{
						testResults.push({step: "Test 29: check_in (duplicate, expect 617)", status: "warning", message: "expected rc 617 for duplicate check-in", rc: rv.rc});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 29: check_in (duplicate, expect 617)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 30: check_in (officer2 on same shift while officer1 is active on another — cross-shift block)
			// =================================================================

			testResults.push({step: "Test 30: check_in (officer2)", status: "running"});
			if (testShiftId === null || testOfficerId2 === null)
			{
				testResults.push({step: "Test 30: check_in (officer2)", status: "failed", error: "Cannot test - shift or officer2 not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId2);

					rv = $executeAPI(session, "Shift/check_in", {shift_id: testShiftId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 30: check_in (officer2)", status: "failed", error: rv.message, rc: rv.rc});
					}
					else
					{
						testResults.push({step: "Test 30: check_in (officer2)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 30: check_in (officer2)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 31: get_my_shifts (as officer)
			// =================================================================

			testResults.push({step: "Test 31: get_my_shifts (as officer)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 31: get_my_shifts (as officer)", status: "failed", error: "Cannot test - officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/get_my_shifts", {page: 0});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 31: get_my_shifts (as officer)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 31: get_my_shifts (as officer)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 31: get_my_shifts (as officer)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 32: get_my_shifts (with date filter)
			// =================================================================

			testResults.push({step: "Test 32: get_my_shifts (date filter)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 32: get_my_shifts (date filter)", status: "failed", error: "Cannot test - officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/get_my_shifts", {
						date_from: tomorrowStr,
						date_to: dayAfterStr,
						page: 0
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 32: get_my_shifts (date filter)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 32: get_my_shifts (date filter)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 32: get_my_shifts (date filter)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 33: get_my_hours (as officer)
			// =================================================================

			testResults.push({step: "Test 33: get_my_hours (as officer)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 33: get_my_hours (as officer)", status: "failed", error: "Cannot test - officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/get_my_hours", {page: 0});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 33: get_my_hours (as officer)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 33: get_my_hours (as officer)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 33: get_my_hours (as officer)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 34: check_out (as officer)
			// =================================================================

			testResults.push({step: "Test 34: check_out (as officer)", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 34: check_out (as officer)", status: "failed", error: "Cannot check out - shift or officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/check_out", {shift_id: testShiftId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 34: check_out (as officer)", status: "failed", error: rv.message, rc: rv.rc});
					}
					else
					{
						testResults.push({step: "Test 34: check_out (as officer)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 34: check_out (as officer)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 35: check_out (not checked in, expect error)
			// =================================================================

			testResults.push({step: "Test 35: check_out (not checked in)", status: "running"});
			if (testShiftId === null || testOfficerId === null)
			{
				testResults.push({step: "Test 35: check_out (not checked in)", status: "failed", error: "Cannot test - shift or officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/check_out", {shift_id: testShiftId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv) && rv.rc === 618)
					{
						testResults.push({step: "Test 35: check_out (not checked in)", status: "passed", message: "correctly rejected with rc 618"});
					}
					else
					{
						testResults.push({step: "Test 35: check_out (not checked in)", status: "warning", message: "expected rc 618 for check-out without check-in", rc: rv.rc});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 35: check_out (not checked in)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 36: check_out (officer2)
			// =================================================================

			testResults.push({step: "Test 36: check_out (officer2)", status: "running"});
			if (testShiftId === null || testOfficerId2 === null)
			{
				testResults.push({step: "Test 36: check_out (officer2)", status: "failed", error: "Cannot test - shift or officer2 not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId2);

					rv = $executeAPI(session, "Shift/check_out", {shift_id: testShiftId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 36: check_out (officer2)", status: "failed", error: rv.message, rc: rv.rc});
					}
					else
					{
						testResults.push({step: "Test 36: check_out (officer2)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 36: check_out (officer2)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Test 37: remove_officer (uses a separate draft shift)
			// =================================================================

			testResults.push({step: "Test 37: remove_officer", status: "running"});
			if (testOfficerId === null || testOfficerId2 === null)
			{
				testResults.push({step: "Test 37: remove_officer", status: "failed", error: "Cannot remove - officers not created"});
			}
			else
			{
				// Create a draft shift specifically for remove_officer test
				let removeTestShiftId = null;
				rv = $executeAPI(session, "Shift/create_shift", {
					community_id: testCommunityId,
					shift_date: tomorrowStr,
					start_time: "18:00",
					end_time: "22:00",
					notes: "Shift for remove_officer test"
				});
				if (!$Err.isERR(rv))
				{
					removeTestShiftId = rv.shift_id;
					// Allocate officer2
					$executeAPI(session, "Shift/allocate_officer", {shift_id: removeTestShiftId, officer_id: testOfficerId2});
					// Now remove officer2
					rv = $executeAPI(session, "Shift/remove_officer", {
						shift_id: removeTestShiftId,
						officer_id: testOfficerId2
					});
					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 37: remove_officer", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 37: remove_officer", status: "passed"});
					}
					// Clean up
					$executeAPI(session, "Shift/delete_shift", {shift_id: removeTestShiftId});
				}
				else
				{
					testResults.push({step: "Test 37: remove_officer", status: "failed", error: "Could not create shift for remove test: " + rv.message});
				}
			}

			// =================================================================
			// Test 38: remove_officer (not allocated, expect error)
			// =================================================================

			testResults.push({step: "Test 38: remove_officer (not allocated)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 38: remove_officer (not allocated)", status: "failed", error: "Cannot test - officer not created"});
			}
			else
			{
				// Create a draft shift for this test
				let removeTest2ShiftId = null;
				rv = $executeAPI(session, "Shift/create_shift", {
					community_id: testCommunityId,
					shift_date: tomorrowStr,
					start_time: "18:00",
					end_time: "22:00",
					notes: "Shift for remove_officer not-allocated test"
				});
				if (!$Err.isERR(rv))
				{
					removeTest2ShiftId = rv.shift_id;
					rv = $executeAPI(session, "Shift/remove_officer", {
						shift_id: removeTest2ShiftId,
						officer_id: testOfficerId
					});
					if ($Err.isERR(rv) && rv.rc === 615)
					{
						testResults.push({step: "Test 38: remove_officer (not allocated)", status: "passed", message: "correctly rejected with rc 615"});
					}
					else
					{
						testResults.push({step: "Test 38: remove_officer (not allocated)", status: "warning", message: "expected rc 615 for officer not allocated", rc: rv.rc});
					}
					// Clean up
					$executeAPI(session, "Shift/delete_shift", {shift_id: removeTest2ShiftId});
				}
				else
				{
					testResults.push({step: "Test 38: remove_officer (not allocated)", status: "failed", error: "Could not create shift: " + rv.message});
				}
			}

			// =================================================================
			// Test 39: cancel_shift (using testShiftId2 — still in draft)
			// =================================================================

			testResults.push({step: "Test 39: cancel_shift", status: "running"});
			if (testShiftId2 === null)
			{
				testResults.push({step: "Test 39: cancel_shift", status: "failed", error: "Cannot cancel - shift2 was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/cancel_shift", {shift_id: testShiftId2});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 39: cancel_shift", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 39: cancel_shift", status: "passed"});
				}
			}

			// =================================================================
			// Test 40: cancel_shift (already cancelled, expect error)
			// =================================================================

			testResults.push({step: "Test 40: cancel_shift (already cancelled)", status: "running"});
			if (testShiftId2 === null)
			{
				testResults.push({step: "Test 40: cancel_shift (already cancelled)", status: "failed", error: "Cannot test - shift2 was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/cancel_shift", {shift_id: testShiftId2});
				if ($Err.isERR(rv) && rv.rc === 628)
				{
					testResults.push({step: "Test 40: cancel_shift (already cancelled)", status: "passed", message: "correctly rejected with rc 628"});
				}
				else if ($Err.isERR(rv) && rv.rc === 613)
				{
					testResults.push({step: "Test 40: cancel_shift (already cancelled)", status: "passed", message: "correctly rejected with rc 613"});
				}
				else
				{
					testResults.push({step: "Test 40: cancel_shift (already cancelled)", status: "warning", message: "expected rc 613 or 628 for already cancelled shift", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 41: delete_shift (draft only — create a new draft to delete)
			// =================================================================

			testResults.push({step: "Test 41: delete_shift", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: nextWeekStr,
				start_time: "10:00",
				end_time: "18:00",
				notes: "Shift to be deleted"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 41: delete_shift", status: "failed", error: "Could not create shift for deletion test: " + rv.message});
			}
			else
			{
				let deleteShiftId = rv.shift_id;
				rv = $executeAPI(session, "Shift/delete_shift", {shift_id: deleteShiftId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 41: delete_shift", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 41: delete_shift", status: "passed", deleted_shift_id: deleteShiftId});
				}
			}

			// =================================================================
			// Test 42: delete_shift (verify deletion)
			// =================================================================

			testResults.push({step: "Test 42: delete_shift (verify deletion)", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: nextWeekStr,
				start_time: "11:00",
				end_time: "19:00"
			});
			if (!$Err.isERR(rv))
			{
				let verifyDeleteId = rv.shift_id;
				$executeAPI(session, "Shift/delete_shift", {shift_id: verifyDeleteId});
				rv = $executeAPI(session, "Shift/get_shift", {shift_id: verifyDeleteId});
				if ($Err.isERR(rv) && rv.rc === 610)
				{
					testResults.push({step: "Test 42: delete_shift (verify deletion)", status: "passed", verified_deleted: true});
				}
				else
				{
					testResults.push({step: "Test 42: delete_shift (verify deletion)", status: "warning", message: "deleted shift still accessible"});
				}
			}
			else
			{
				testResults.push({step: "Test 42: delete_shift (verify deletion)", status: "failed", error: "Could not create shift for verification"});
			}

			// =================================================================
			// Test 43: delete_shift (published, expect error)
			// =================================================================

			testResults.push({step: "Test 43: delete_shift (published, expect error)", status: "running"});
			if (testShiftId === null)
			{
				testResults.push({step: "Test 43: delete_shift (published, expect error)", status: "failed", error: "Cannot test - shift not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/delete_shift", {shift_id: testShiftId});
				if ($Err.isERR(rv) && rv.rc === 621)
				{
					testResults.push({step: "Test 43: delete_shift (published, expect error)", status: "passed", message: "correctly rejected non-draft deletion with rc 621"});
				}
				else
				{
					testResults.push({step: "Test 43: delete_shift (published, expect error)", status: "warning", message: "expected rc 621 for non-draft delete", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 44: create_recurring_shifts (daily, end_date)
			// =================================================================

			testResults.push({step: "Test 44: create_recurring_shifts (daily)", status: "running"});
			rv = $executeAPI(session, "Shift/create_recurring_shifts", {
				community_id: testCommunityId,
				start_date: nextWeekStr,
				start_time: "08:00",
				end_time: "16:00",
				recurrence_pattern: "daily",
				end_type: "end_date",
				end_date: twoWeeksStr,
				notes: "Daily recurring test"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 44: create_recurring_shifts (daily)", status: "failed", error: rv.message});
			}
			else
			{
				recurringSeriesId = rv.series_id;
				recurringShiftIds = rv.shift_ids || [];
				testResults.push({step: "Test 44: create_recurring_shifts (daily)", status: "passed", series_id: recurringSeriesId, shift_count: rv.shift_count || recurringShiftIds.length});
			}

			// =================================================================
			// Test 45: create_recurring_shifts (specific_days, occurrences)
			// =================================================================

			testResults.push({step: "Test 45: create_recurring_shifts (specific_days)", status: "running"});
			rv = $executeAPI(session, "Shift/create_recurring_shifts", {
				community_id: testCommunityId,
				start_date: nextWeekStr,
				start_time: "09:00",
				end_time: "17:00",
				recurrence_pattern: "specific_days",
				repeat_on: [1, 3, 5],
				end_type: "occurrences",
				occurrences: 6,
				notes: "Specific days recurring test (Mon/Wed/Fri)"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 45: create_recurring_shifts (specific_days)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 45: create_recurring_shifts (specific_days)", status: "passed", series_id: rv.series_id, shift_count: rv.shift_count});
				// Clean up these shifts
				if (rv.shift_ids)
				{
					for (let sid of rv.shift_ids)
					{
						$executeAPI(session, "Shift/delete_shift", {shift_id: sid});
					}
				}
			}

			// =================================================================
			// Test 46: create_recurring_shifts (every_x_days, no_end)
			// =================================================================

			testResults.push({step: "Test 46: create_recurring_shifts (no_end)", status: "running"});
			rv = $executeAPI(session, "Shift/create_recurring_shifts", {
				community_id: testCommunityId,
				start_date: nextWeekStr,
				start_time: "14:00",
				end_time: "22:00",
				recurrence_pattern: "every_x_days",
				interval_days: 3,
				end_type: "no_end",
				notes: "Every 3 days, no end test"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 46: create_recurring_shifts (no_end)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 46: create_recurring_shifts (no_end)", status: "passed", series_id: rv.series_id, shift_count: rv.shift_count});
				// Clean up these shifts
				if (rv.shift_ids)
				{
					for (let sid of rv.shift_ids)
					{
						$executeAPI(session, "Shift/delete_shift", {shift_id: sid});
					}
				}
			}

			// =================================================================
			// Test 47: create_recurring_shifts (invalid pattern, expect error)
			// =================================================================

			testResults.push({step: "Test 47: create_recurring_shifts (invalid pattern)", status: "running"});
			rv = $executeAPI(session, "Shift/create_recurring_shifts", {
				community_id: testCommunityId,
				start_date: nextWeekStr,
				start_time: "08:00",
				end_time: "16:00",
				recurrence_pattern: "invalid_pattern",
				end_type: "end_date",
				end_date: twoWeeksStr
			});
			if ($Err.isERR(rv) && rv.rc === 624)
			{
				testResults.push({step: "Test 47: create_recurring_shifts (invalid pattern)", status: "passed", message: "correctly rejected invalid pattern with rc 624"});
			}
			else
			{
				testResults.push({step: "Test 47: create_recurring_shifts (invalid pattern)", status: "warning", message: "expected rc 624 for invalid recurrence pattern", rc: rv.rc});
			}

			// =================================================================
			// Test 48: update_recurring_shifts (this_only)
			// =================================================================

			testResults.push({step: "Test 48: update_recurring_shifts (this_only)", status: "running"});
			if (recurringShiftIds === null || recurringShiftIds.length === 0)
			{
				testResults.push({step: "Test 48: update_recurring_shifts (this_only)", status: "failed", error: "Cannot test - no recurring shifts created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/update_recurring_shifts", {
					shift_id: recurringShiftIds[0],
					scope: "this_only",
					notes: "Updated this shift only"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 48: update_recurring_shifts (this_only)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 48: update_recurring_shifts (this_only)", status: "passed"});
				}
			}

			// =================================================================
			// Test 49: update_recurring_shifts (this_and_future)
			// =================================================================

			testResults.push({step: "Test 49: update_recurring_shifts (this_and_future)", status: "running"});
			if (recurringShiftIds === null || recurringShiftIds.length < 2)
			{
				testResults.push({step: "Test 49: update_recurring_shifts (this_and_future)", status: "failed", error: "Cannot test - not enough recurring shifts"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/update_recurring_shifts", {
					shift_id: recurringShiftIds[1],
					scope: "this_and_future",
					start_time: "08:30",
					end_time: "16:30"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 49: update_recurring_shifts (this_and_future)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 49: update_recurring_shifts (this_and_future)", status: "passed"});
				}
			}

			// =================================================================
			// Test 50: update_recurring_shifts (all)
			// =================================================================

			testResults.push({step: "Test 50: update_recurring_shifts (all)", status: "running"});
			if (recurringShiftIds === null || recurringShiftIds.length === 0)
			{
				testResults.push({step: "Test 50: update_recurring_shifts (all)", status: "failed", error: "Cannot test - no recurring shifts created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/update_recurring_shifts", {
					shift_id: recurringShiftIds[0],
					scope: "all",
					notes: "Updated all shifts in series"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 50: update_recurring_shifts (all)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 50: update_recurring_shifts (all)", status: "passed"});
				}
			}

			// =================================================================
			// Test 51: get_shifts_calendar (search_text filter)
			// =================================================================

			testResults.push({step: "Test 51: get_shifts_calendar (search_text)", status: "running"});
			rv = $executeAPI(session, "Shift/get_shifts_calendar", {
				community_id: testCommunityId,
				date_from: tomorrowStr,
				date_to: twoWeeksStr,
				search_text: testOfficerFirst
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 51: get_shifts_calendar (search_text)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 51: get_shifts_calendar (search_text)", status: "passed"});
			}

			// =================================================================
			// Test 52: get_shifts_calendar (officer_id filter)
			// =================================================================

			testResults.push({step: "Test 52: get_shifts_calendar (officer_id filter)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 52: get_shifts_calendar (officer_id filter)", status: "failed", error: "Cannot test - officer not created"});
			}
			else
			{
				rv = $executeAPI(session, "Shift/get_shifts_calendar", {
					community_id: testCommunityId,
					date_from: tomorrowStr,
					date_to: twoWeeksStr,
					officer_id: testOfficerId
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 52: get_shifts_calendar (officer_id filter)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 52: get_shifts_calendar (officer_id filter)", status: "passed"});
				}
			}

			// =================================================================
			// Test 53: publish_shift (no officers, expect error)
			// =================================================================

			testResults.push({step: "Test 53: publish_shift (no officers)", status: "running"});
			rv = $executeAPI(session, "Shift/create_shift", {
				community_id: testCommunityId,
				shift_date: nextWeekStr,
				start_time: "12:00",
				end_time: "20:00"
			});
			if (!$Err.isERR(rv))
			{
				let noOfficerShiftId = rv.shift_id;
				rv = $executeAPI(session, "Shift/publish_shift", {shift_id: noOfficerShiftId});
				if ($Err.isERR(rv) && rv.rc === 629)
				{
					testResults.push({step: "Test 53: publish_shift (no officers)", status: "passed", message: "correctly rejected publish without officers with rc 629"});
				}
				else
				{
					testResults.push({step: "Test 53: publish_shift (no officers)", status: "warning", message: "expected rc 629 for publish without officers", rc: rv.rc});
				}
				$executeAPI(session, "Shift/delete_shift", {shift_id: noOfficerShiftId});
			}
			else
			{
				testResults.push({step: "Test 53: publish_shift (no officers)", status: "failed", error: "Could not create shift for test"});
			}

			// =================================================================
			// Test 54: get_my_hours (with date filter, as officer)
			// =================================================================

			testResults.push({step: "Test 54: get_my_hours (date filter)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 54: get_my_hours (date filter)", status: "failed", error: "Cannot test - officer not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Shift/get_my_hours", {
						date_from: tomorrowStr,
						date_to: dayAfterStr,
						page: 0
					});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 54: get_my_hours (date filter)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 54: get_my_hours (date filter)", status: "passed"});
					}
				}
				catch (impErr)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 54: get_my_hours (date filter)", status: "failed", error: impErr.message});
				}
			}

			// =================================================================
			// Cleanup: delete recurring shifts
			// =================================================================

			if (recurringShiftIds && recurringShiftIds.length > 0)
			{
				for (let sid of recurringShiftIds)
				{
					$executeAPI(session, "Shift/delete_shift", {shift_id: sid});
				}
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
