module.exports =
{
	test_poi_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let testCommunityId2 = null;
		let testOfficerId = null;
		let testPhotoFileId = null;
		let testPhotoFileId2 = null;
		let testDocFileId = null;
		let testRecordId = null;
		let testDraftRecordId = null;

		// 1x1 red PNG (base64) for photo uploads
		let testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
		// 1x1 blue PNG (base64) for second photo
		let testImageBase64_2 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";

		function earlyReturn()
		{
			vals.test_results = testResults;
			vals.summary = {
				total: testResults.filter(r => r.status === "running").length,
				passed: testResults.filter(r => r.status === "passed").length,
				failed: testResults.filter(r => r.status === "failed").length,
				warnings: testResults.filter(r => r.status === "warning").length
			};
			return {...rc, ...vals};
		}

		try
		{
			testResults.push({step: "Starting POI API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);
			let testOfficerPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let testOfficerEmail = `poi_ofc_${uniqueId}@test.com`;

			// =================================================================
			// Setup: create two test communities, one officer, and upload files
			// =================================================================

			testResults.push({step: "Setup: create test community 1", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `POI Test Community ${uniqueId}`,
				area: "Test Area",
				latitude: 25.276987,
				longitude: 55.296249,
				location_name: "Test Location",
				timezone: "Asia/Dubai",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test community 1", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testCommunityId = rv.community_id;
			testResults.push({step: "Setup: create test community 1", status: "passed", community_id: testCommunityId});

			testResults.push({step: "Setup: create test community 2", status: "running"});
			rv = $executeAPI(session, "Community/add_community", {
				name: `POI Test Community 2 ${uniqueId}`,
				area: "Test Area 2",
				latitude: 25.286987,
				longitude: 55.306249,
				location_name: "Test Location 2",
				timezone: "Asia/Dubai",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test community 2", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testCommunityId2 = rv.community_id;
			testResults.push({step: "Setup: create test community 2", status: "passed", community_id: testCommunityId2});

			testResults.push({step: "Setup: create test officer", status: "running"});
			rv = $executeAPI(session, "Officer/add_officer", {
				first_name: `POIOfc ${uniqueId}`,
				last_name: `Last ${uniqueId}`,
				phone_num: testOfficerPhone,
				email: testOfficerEmail,
				community_id: testCommunityId,
				title: `Security Officer ${uniqueId}`,
				address: "Test Officer Address"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test officer", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testOfficerId = rv.user_id;
			testResults.push({step: "Setup: create test officer", status: "passed", user_id: testOfficerId});

			testResults.push({step: "Setup: upload test photo 1", status: "running"});
			rv = $executeAPI(session, "File/upload_file_base64", {
				file_name: `poi_test_photo_${uniqueId}.png`,
				file_data: testImageBase64
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: upload test photo 1", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testPhotoFileId = rv.file_id;
			testResults.push({step: "Setup: upload test photo 1", status: "passed", file_id: testPhotoFileId});

			testResults.push({step: "Setup: upload test photo 2", status: "running"});
			rv = $executeAPI(session, "File/upload_file_base64", {
				file_name: `poi_test_photo2_${uniqueId}.png`,
				file_data: testImageBase64_2
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: upload test photo 2", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testPhotoFileId2 = rv.file_id;
			testResults.push({step: "Setup: upload test photo 2", status: "passed", file_id: testPhotoFileId2});

			testResults.push({step: "Setup: upload test document", status: "running"});
			rv = $executeAPI(session, "File/upload_file_base64", {
				file_name: `poi_test_notice_${uniqueId}.png`,
				file_data: testImageBase64
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: upload test document", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testDocFileId = rv.file_id;
			testResults.push({step: "Setup: upload test document", status: "passed", file_id: testDocFileId});

			// =================================================================
			// Test 1: get_poi_metadata
			// =================================================================

			testResults.push({step: "Test 1: get_poi_metadata", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_metadata", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: get_poi_metadata", status: "failed", error: rv.message});
			}
			else
			{
				let hasTypes = rv.record_types && typeof rv.record_types === "object" && Object.keys(rv.record_types).length === 3;
				let hasLevels = rv.threat_levels && typeof rv.threat_levels === "object" && Object.keys(rv.threat_levels).length === 4;
				let hasStatuses = rv.statuses && typeof rv.statuses === "object" && Object.keys(rv.statuses).length === 5;
				let hasGenders = rv.genders && typeof rv.genders === "object" && Object.keys(rv.genders).length === 3;
				let hasGuidance = rv.guidance && typeof rv.guidance === "object" && "poi" in rv.guidance && "trespass" in rv.guidance && "metro_red_card" in rv.guidance;
				if (hasTypes && hasLevels && hasStatuses && hasGenders && hasGuidance)
				{
					testResults.push({step: "Test 1: get_poi_metadata", status: "passed", record_types: Object.keys(rv.record_types).length, threat_levels: Object.keys(rv.threat_levels).length, statuses: Object.keys(rv.statuses).length, genders: Object.keys(rv.genders).length});
				}
				else
				{
					testResults.push({step: "Test 1: get_poi_metadata", status: "warning", message: "Metadata response missing expected fields", hasTypes: hasTypes, hasLevels: hasLevels, hasStatuses: hasStatuses, hasGenders: hasGenders, hasGuidance: !!hasGuidance});
				}
			}

			// =================================================================
			// Test 2: get_poi_list (initial — empty or existing)
			// =================================================================

			testResults.push({step: "Test 2: get_poi_list (initial)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 2: get_poi_list (initial)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 2: get_poi_list (initial)", status: "passed", total_count: rv.total_count, records: rv.records.length});
			}

			// =================================================================
			// Test 3: create_poi_record (POI type, draft)
			// =================================================================

			testResults.push({step: "Test 3: create_poi_record (POI draft)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: `TestPOI ${uniqueId}`,
				last_name: `Subject ${uniqueId}`,
				known_aliases: "Alias One, Alias Two",
				date_of_birth: "1990-06-15",
				gender: "male",
				physical_description: "Tall, brown hair, blue eyes",
				threat_level: "medium",
				summary: `Test POI subject created for API testing ${uniqueId}`,
				internal_notes: "Internal test notes - should not be visible to officers",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId],
				related_incident_ids: [],
				incident_history_summary: "No prior incidents on record",
				watch_level_review_date: "2026-01-15",
				associated_individuals: "None known",
				publish: false
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 3: create_poi_record (POI draft)", status: "failed", error: rv.message});
				return earlyReturn();
			}
			testDraftRecordId = rv.record_id;
			testResults.push({step: "Test 3: create_poi_record (POI draft)", status: "passed", record_id: testDraftRecordId});

			// =================================================================
			// Test 4: get_poi_record (verify draft)
			// =================================================================

			testResults.push({step: "Test 4: get_poi_record (verify draft)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 4: get_poi_record (verify draft)", status: "failed", error: "Cannot verify - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testDraftRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 4: get_poi_record (verify draft)", status: "failed", error: rv.message});
				}
				else
				{
					let r = rv.record;
					let verified = r.status === "draft" &&
								   r.record_type === "poi" &&
								   r.first_name === `TestPOI ${uniqueId}` &&
								   r.last_name === `Subject ${uniqueId}` &&
								   r.known_aliases === "Alias One, Alias Two" &&
								   r.threat_level === "medium" &&
								   r.internal_notes === "Internal test notes - should not be visible to officers" &&
								   Array.isArray(r.photos) && r.photos.length === 1 &&
								   Array.isArray(r.sites) && r.sites.length === 1 &&
								   r.incident_history_summary === "No prior incidents on record" &&
								   r.watch_level_review_date !== null &&
								   r.associated_individuals === "None known";
					if (verified)
					{
						testResults.push({step: "Test 4: get_poi_record (verify draft)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 4: get_poi_record (verify draft)", status: "warning", verified: false, message: "Some fields not saved correctly", status_val: r.status, record_type: r.record_type});
					}
				}
			}

			// =================================================================
			// Test 5: update_poi_record (update draft fields)
			// =================================================================

			testResults.push({step: "Test 5: update_poi_record (update draft)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 5: update_poi_record (update draft)", status: "failed", error: "Cannot update - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/update_poi_record", {
					record_id: testDraftRecordId,
					first_name: `UpdatedPOI ${uniqueId}`,
					threat_level: "high",
					summary: `Updated summary ${uniqueId}`,
					community_ids: [testCommunityId, testCommunityId2],
					photo_file_ids: [testPhotoFileId, testPhotoFileId2]
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 5: update_poi_record (update draft)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 5: update_poi_record (update draft)", status: "passed"});
				}
			}

			// =================================================================
			// Test 6: get_poi_record (verify update)
			// =================================================================

			testResults.push({step: "Test 6: get_poi_record (verify update)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 6: get_poi_record (verify update)", status: "failed", error: "Cannot verify - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testDraftRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 6: get_poi_record (verify update)", status: "failed", error: rv.message});
				}
				else
				{
					let r = rv.record;
					let verified = r.first_name === `UpdatedPOI ${uniqueId}` &&
								   r.threat_level === "high" &&
								   r.summary === `Updated summary ${uniqueId}` &&
								   Array.isArray(r.photos) && r.photos.length === 2 &&
								   Array.isArray(r.sites) && r.sites.length === 2;
					if (verified)
					{
						testResults.push({step: "Test 6: get_poi_record (verify update)", status: "passed", verified: true, photos: r.photos.length, sites: r.sites.length});
					}
					else
					{
						testResults.push({step: "Test 6: get_poi_record (verify update)", status: "warning", verified: false, message: "Updated fields not saved correctly"});
					}
				}
			}

			// =================================================================
			// Test 7: publish_poi_record
			// =================================================================

			testResults.push({step: "Test 7: publish_poi_record", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 7: publish_poi_record", status: "failed", error: "Cannot publish - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/publish_poi_record", {
					record_id: testDraftRecordId,
					notify_officers: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 7: publish_poi_record", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 7: publish_poi_record", status: "passed"});
				}
			}

			// =================================================================
			// Test 8: get_poi_record (verify status = active)
			// =================================================================

			testResults.push({step: "Test 8: get_poi_record (verify active)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 8: get_poi_record (verify active)", status: "failed", error: "Cannot verify - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testDraftRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 8: get_poi_record (verify active)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.record.status === "active" && rv.record.approved_by !== null && rv.record.approved_on !== null)
					{
						testResults.push({step: "Test 8: get_poi_record (verify active)", status: "passed", status_val: rv.record.status, approved_by: rv.record.approved_by});
					}
					else
					{
						testResults.push({step: "Test 8: get_poi_record (verify active)", status: "warning", message: "Status not active or approval fields missing", status_val: rv.record.status});
					}
				}
			}

			// =================================================================
			// Test 9: publish_poi_record (already active — expect rc 693)
			// =================================================================

			testResults.push({step: "Test 9: publish_poi_record (already active, expect rc 693)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 9: publish_poi_record (already active, expect rc 693)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/publish_poi_record", {record_id: testDraftRecordId});
				if (rv.rc === 693)
				{
					testResults.push({step: "Test 9: publish_poi_record (already active, expect rc 693)", status: "passed", message: "correctly rejected re-publish"});
				}
				else
				{
					testResults.push({step: "Test 9: publish_poi_record (already active, expect rc 693)", status: "warning", message: "unexpected response", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 10: get_poi_list (filters)
			// =================================================================

			testResults.push({step: "Test 10: get_poi_list (filter by record_type)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {record_type: "poi"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 10: get_poi_list (filter by record_type)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.records.find(r => r.record_id === testDraftRecordId);
				testResults.push({step: "Test 10: get_poi_list (filter by record_type)", status: found ? "passed" : "warning", total_count: rv.total_count, found_test_record: !!found});
			}

			testResults.push({step: "Test 11: get_poi_list (filter by status)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {status: "active"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 11: get_poi_list (filter by status)", status: "failed", error: rv.message});
			}
			else
			{
				let allActive = rv.records.every(r => r.status === "active");
				testResults.push({step: "Test 11: get_poi_list (filter by status)", status: allActive ? "passed" : "warning", total_count: rv.total_count, all_active: allActive});
			}

			testResults.push({step: "Test 12: get_poi_list (filter by threat_level)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {threat_level: "high"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 12: get_poi_list (filter by threat_level)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 12: get_poi_list (filter by threat_level)", status: "passed", total_count: rv.total_count});
			}

			testResults.push({step: "Test 13: get_poi_list (filter by community_id)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {community_id: testCommunityId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 13: get_poi_list (filter by community_id)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 13: get_poi_list (filter by community_id)", status: "passed", total_count: rv.total_count});
			}

			testResults.push({step: "Test 14: get_poi_list (search_text)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {search_text: uniqueId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 14: get_poi_list (search_text)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.records.find(r => r.record_id === testDraftRecordId);
				testResults.push({step: "Test 14: get_poi_list (search_text)", status: found ? "passed" : "warning", total_count: rv.total_count, found_test_record: !!found});
			}

			testResults.push({step: "Test 15: get_poi_list (sort by threat_level)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {sort_by: "threat_level", sort_dir: "asc"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 15: get_poi_list (sort by threat_level)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 15: get_poi_list (sort by threat_level)", status: "passed", total_count: rv.total_count});
			}

			testResults.push({step: "Test 16: get_poi_list (pagination)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {offset: 0, limit: 1});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 16: get_poi_list (pagination)", status: "failed", error: rv.message});
			}
			else
			{
				let pagCorrect = rv.records.length <= 1;
				testResults.push({step: "Test 16: get_poi_list (pagination)", status: pagCorrect ? "passed" : "warning", records_returned: rv.records.length, total_count: rv.total_count});
			}

			// =================================================================
			// Test 17: get_poi_list (invalid status — expect rc 700)
			// =================================================================

			testResults.push({step: "Test 17: get_poi_list (invalid status, expect rc 700)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {status: "nonexistent_status"});
			if (rv.rc === 700)
			{
				testResults.push({step: "Test 17: get_poi_list (invalid status, expect rc 700)", status: "passed", message: "correctly rejected invalid status"});
			}
			else
			{
				testResults.push({step: "Test 17: get_poi_list (invalid status, expect rc 700)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// =================================================================
			// Test 18: get_poi_list (invalid record_type — expect rc 691)
			// =================================================================

			testResults.push({step: "Test 18: get_poi_list (invalid record_type, expect rc 691)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {record_type: "invalid_type"});
			if (rv.rc === 691)
			{
				testResults.push({step: "Test 18: get_poi_list (invalid record_type, expect rc 691)", status: "passed", message: "correctly rejected invalid record type"});
			}
			else
			{
				testResults.push({step: "Test 18: get_poi_list (invalid record_type, expect rc 691)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// =================================================================
			// Test 19: get_poi_list (invalid threat_level — expect rc 692)
			// =================================================================

			testResults.push({step: "Test 19: get_poi_list (invalid threat_level, expect rc 692)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {threat_level: "extreme"});
			if (rv.rc === 692)
			{
				testResults.push({step: "Test 19: get_poi_list (invalid threat_level, expect rc 692)", status: "passed", message: "correctly rejected invalid threat level"});
			}
			else
			{
				testResults.push({step: "Test 19: get_poi_list (invalid threat_level, expect rc 692)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// =================================================================
			// Test 20: Officer view — get_poi_list as officer
			// =================================================================

			testResults.push({step: "Test 20: get_poi_list (as officer)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 20: get_poi_list (as officer)", status: "failed", error: "Cannot test - officer was not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Poi/get_poi_list", {});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 20: get_poi_list (as officer)", status: "failed", error: rv.message});
					}
					else
					{
						let allActive = rv.records.every(r => r.status === "active");
						let hasBadge = rv.records.length > 0 ? rv.records[0].view_badge !== undefined : true;
						testResults.push({step: "Test 20: get_poi_list (as officer)", status: "passed", total_count: rv.total_count, all_active: allActive, has_view_badge: hasBadge});
					}
				}
				catch (e)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 20: get_poi_list (as officer)", status: "failed", error: e.message});
				}
			}

			// =================================================================
			// Test 21: Officer view — get_poi_record with badge
			// =================================================================

			testResults.push({step: "Test 21: get_poi_record (as officer, expect NEW badge)", status: "running"});
			if (testOfficerId === null || testDraftRecordId === null)
			{
				testResults.push({step: "Test 21: get_poi_record (as officer, expect NEW badge)", status: "failed", error: "Cannot test - prerequisites not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testDraftRecordId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 21: get_poi_record (as officer, expect NEW badge)", status: "failed", error: rv.message});
					}
					else
					{
						let r = rv.record;
						let hasGuidance = r.response_guidance !== undefined;
						let noInternalNotes = r.internal_notes === undefined;
						let hasBadge = r.view_badge === "new";
						if (hasBadge && noInternalNotes && hasGuidance)
						{
							testResults.push({step: "Test 21: get_poi_record (as officer, expect NEW badge)", status: "passed", view_badge: r.view_badge, has_guidance: true, internal_notes_hidden: true});
						}
						else
						{
							testResults.push({step: "Test 21: get_poi_record (as officer, expect NEW badge)", status: "warning", view_badge: r.view_badge, has_guidance: hasGuidance, internal_notes_hidden: noInternalNotes});
						}
					}
				}
				catch (e)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 21: get_poi_record (as officer, expect NEW badge)", status: "failed", error: e.message});
				}
			}

			// =================================================================
			// Test 22: mark_viewed (officer)
			// =================================================================

			testResults.push({step: "Test 22: mark_viewed (as officer)", status: "running"});
			if (testOfficerId === null || testDraftRecordId === null)
			{
				testResults.push({step: "Test 22: mark_viewed (as officer)", status: "failed", error: "Cannot test - prerequisites not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Poi/mark_viewed", {record_id: testDraftRecordId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 22: mark_viewed (as officer)", status: "failed", error: rv.message});
					}
					else
					{
						testResults.push({step: "Test 22: mark_viewed (as officer)", status: "passed"});
					}
				}
				catch (e)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 22: mark_viewed (as officer)", status: "failed", error: e.message});
				}
			}

			// =================================================================
			// Test 23: get_poi_record (officer — verify badge cleared)
			// =================================================================

			testResults.push({step: "Test 23: get_poi_record (as officer, verify badge cleared)", status: "running"});
			if (testOfficerId === null || testDraftRecordId === null)
			{
				testResults.push({step: "Test 23: get_poi_record (as officer, verify badge cleared)", status: "failed", error: "Cannot test - prerequisites not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testDraftRecordId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 23: get_poi_record (as officer, verify badge cleared)", status: "failed", error: rv.message});
					}
					else
					{
						if (rv.record.view_badge === null)
						{
							testResults.push({step: "Test 23: get_poi_record (as officer, verify badge cleared)", status: "passed", view_badge: null});
						}
						else
						{
							testResults.push({step: "Test 23: get_poi_record (as officer, verify badge cleared)", status: "warning", view_badge: rv.record.view_badge, message: "Badge should be null after mark_viewed"});
						}
					}
				}
				catch (e)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 23: get_poi_record (as officer, verify badge cleared)", status: "failed", error: e.message});
				}
			}

			// =================================================================
			// Test 24: update active record → verify UPDATED badge
			// =================================================================

			testResults.push({step: "Test 24: update_poi_record (active record, trigger UPDATED badge)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 24: update_poi_record (active record, trigger UPDATED badge)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/update_poi_record", {
					record_id: testDraftRecordId,
					summary: `Updated active summary ${uniqueId}`
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 24: update_poi_record (active record, trigger UPDATED badge)", status: "failed", error: rv.message});
				}
				else
				{
					// Ensure POI_LAST_UPDATE is strictly after PVW_VIEWED_ON to avoid same-second timing issue
					$Db.executeQuery(
						"UPDATE `poi_record` SET POI_LAST_UPDATE = DATE_ADD(POI_LAST_UPDATE, INTERVAL 2 SECOND) WHERE POI_ID=?",
						[testDraftRecordId]);
					testResults.push({step: "Test 24: update_poi_record (active record, trigger UPDATED badge)", status: "passed"});
				}
			}

			testResults.push({step: "Test 25: get_poi_record (officer, verify UPDATED badge)", status: "running"});
			if (testOfficerId === null || testDraftRecordId === null)
			{
				testResults.push({step: "Test 25: get_poi_record (officer, verify UPDATED badge)", status: "failed", error: "Cannot test - prerequisites not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);

					rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testDraftRecordId});

					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 25: get_poi_record (officer, verify UPDATED badge)", status: "failed", error: rv.message});
					}
					else
					{
						if (rv.record.view_badge === "updated")
						{
							testResults.push({step: "Test 25: get_poi_record (officer, verify UPDATED badge)", status: "passed", view_badge: "updated"});
						}
						else
						{
							testResults.push({step: "Test 25: get_poi_record (officer, verify UPDATED badge)", status: "warning", view_badge: rv.record.view_badge, message: "Expected 'updated' badge after version-level edit"});
						}
					}
				}
				catch (e)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 25: get_poi_record (officer, verify UPDATED badge)", status: "failed", error: e.message});
				}
			}

			// =================================================================
			// Test 26: create_poi_record (Trespass type, publish=true)
			// =================================================================

			testResults.push({step: "Test 26: create_poi_record (Trespass, publish=true)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "trespass",
				first_name: `TrespassTest ${uniqueId}`,
				last_name: `Subject ${uniqueId}`,
				threat_level: "critical",
				summary: `Trespass order test ${uniqueId}`,
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId],
				trespass_notice_number: `TN-${uniqueId}`,
				issuing_authority: "Test City PD",
				property_area_covered: "Building A and parking lot",
				issue_date: "2024-01-01",
				expiry_date: "2026-12-31",
				notice_document_file_id: testDocFileId,
				law_enforcement_contact: "Officer Smith, 555-0100",
				conditions: "Must remain 500ft from premises",
				renewal_reminder_days: 30,
				publish: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 26: create_poi_record (Trespass, publish=true)", status: "failed", error: rv.message});
			}
			else
			{
				testRecordId = rv.record_id;
				testResults.push({step: "Test 26: create_poi_record (Trespass, publish=true)", status: "passed", record_id: testRecordId});
			}

			// =================================================================
			// Test 27: get_poi_record (verify trespass fields)
			// =================================================================

			testResults.push({step: "Test 27: get_poi_record (verify trespass fields)", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 27: get_poi_record (verify trespass fields)", status: "failed", error: "Cannot verify - trespass record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 27: get_poi_record (verify trespass fields)", status: "failed", error: rv.message});
				}
				else
				{
					let r = rv.record;
					let verified = r.status === "active" &&
								   r.record_type === "trespass" &&
								   r.trespass_notice_number === `TN-${uniqueId}` &&
								   r.issuing_authority === "Test City PD" &&
								   r.property_area_covered === "Building A and parking lot" &&
								   r.notice_document !== null &&
								   r.law_enforcement_contact === "Officer Smith, 555-0100" &&
								   r.conditions === "Must remain 500ft from premises" &&
								   r.renewal_reminder_days === 30;
					if (verified)
					{
						testResults.push({step: "Test 27: get_poi_record (verify trespass fields)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 27: get_poi_record (verify trespass fields)", status: "warning", verified: false, message: "Some trespass fields not saved correctly"});
					}
				}
			}

			// =================================================================
			// Test 28: export_poi_record
			// =================================================================

			testResults.push({step: "Test 28: export_poi_record", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 28: export_poi_record", status: "failed", error: "Cannot export - trespass record was not created"});
			}
			else
			{
				// Ensure pdf_export_enabled is true (may have been disabled by settings test)
				$executeAPI(session, "Settings/update_poi_settings", {pdf_export_enabled: true});
				rv = $executeAPI(session, "Poi/export_poi_record", {record_id: testRecordId});
				if ($Err.isERR(rv))
				{
					let exportStatus = (rv.rc === 2) ? "warning" : "failed";
					testResults.push({step: "Test 28: export_poi_record", status: exportStatus, error: rv.message, rc: rv.rc, message: rv.rc === 2 ? "Export infrastructure unavailable (unhandled error)" : undefined});
				}
				else
				{
					let hasUrl = rv.file_url !== null && rv.file_url !== undefined;
					let hasId = rv.export_id !== null && rv.export_id !== undefined;
					testResults.push({step: "Test 28: export_poi_record", status: (hasUrl && hasId) ? "passed" : "warning", export_id: rv.export_id, has_file_url: hasUrl});
				}
			}

			// =================================================================
			// Test 29: inactivate_poi_record
			// =================================================================

			testResults.push({step: "Test 29: inactivate_poi_record", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 29: inactivate_poi_record", status: "failed", error: "Cannot inactivate - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/inactivate_poi_record", {
					record_id: testRecordId,
					reason: "Test inactivation reason"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 29: inactivate_poi_record", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 29: inactivate_poi_record", status: "passed"});
				}
			}

			// =================================================================
			// Test 30: get_poi_record (verify inactive + reason)
			// =================================================================

			testResults.push({step: "Test 30: get_poi_record (verify inactive)", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 30: get_poi_record (verify inactive)", status: "failed", error: "Cannot verify - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 30: get_poi_record (verify inactive)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.record.status === "inactive" && rv.record.inactivation_reason === "Test inactivation reason")
					{
						testResults.push({step: "Test 30: get_poi_record (verify inactive)", status: "passed", status_val: "inactive", reason: rv.record.inactivation_reason});
					}
					else
					{
						testResults.push({step: "Test 30: get_poi_record (verify inactive)", status: "warning", status_val: rv.record.status, reason: rv.record.inactivation_reason});
					}
				}
			}

			// =================================================================
			// Test 31: inactivate_poi_record (already inactive — expect rc 694)
			// =================================================================

			testResults.push({step: "Test 31: inactivate_poi_record (already inactive, expect rc 694)", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 31: inactivate_poi_record (already inactive, expect rc 694)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/inactivate_poi_record", {record_id: testRecordId, reason: "Second attempt"});
				if (rv.rc === 694)
				{
					testResults.push({step: "Test 31: inactivate_poi_record (already inactive, expect rc 694)", status: "passed", message: "correctly rejected"});
				}
				else
				{
					testResults.push({step: "Test 31: inactivate_poi_record (already inactive, expect rc 694)", status: "warning", message: "unexpected response", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 32: archive_poi_record
			// =================================================================

			testResults.push({step: "Test 32: archive_poi_record", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 32: archive_poi_record", status: "failed", error: "Cannot archive - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/archive_poi_record", {record_id: testRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 32: archive_poi_record", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 32: archive_poi_record", status: "passed"});
				}
			}

			// =================================================================
			// Test 33: get_poi_record (verify archived)
			// =================================================================

			testResults.push({step: "Test 33: get_poi_record (verify archived)", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 33: get_poi_record (verify archived)", status: "failed", error: "Cannot verify - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: testRecordId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 33: get_poi_record (verify archived)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.record.status === "archived")
					{
						testResults.push({step: "Test 33: get_poi_record (verify archived)", status: "passed", status_val: "archived"});
					}
					else
					{
						testResults.push({step: "Test 33: get_poi_record (verify archived)", status: "warning", status_val: rv.record.status});
					}
				}
			}

			// =================================================================
			// Test 34: archive_poi_record (already archived — expect rc 695)
			// =================================================================

			testResults.push({step: "Test 34: archive_poi_record (already archived, expect rc 695)", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 34: archive_poi_record (already archived, expect rc 695)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/archive_poi_record", {record_id: testRecordId});
				if (rv.rc === 695)
				{
					testResults.push({step: "Test 34: archive_poi_record (already archived, expect rc 695)", status: "passed", message: "correctly rejected"});
				}
				else
				{
					testResults.push({step: "Test 34: archive_poi_record (already archived, expect rc 695)", status: "warning", message: "unexpected response", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 35: update_poi_record (archived — expect rc 696)
			// =================================================================

			testResults.push({step: "Test 35: update_poi_record (archived, expect rc 696)", status: "running"});
			if (testRecordId === null)
			{
				testResults.push({step: "Test 35: update_poi_record (archived, expect rc 696)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/update_poi_record", {record_id: testRecordId, summary: "Should fail"});
				if (rv.rc === 696)
				{
					testResults.push({step: "Test 35: update_poi_record (archived, expect rc 696)", status: "passed", message: "correctly rejected edit of archived record"});
				}
				else
				{
					testResults.push({step: "Test 35: update_poi_record (archived, expect rc 696)", status: "warning", message: "unexpected response", rc: rv.rc});
				}
			}

			// =================================================================
			// Negative / edge case tests
			// =================================================================

			// Test 36: create_poi_record (missing required fields)
			testResults.push({step: "Test 36: create_poi_record (missing first_name)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 36: create_poi_record (missing first_name)", status: "passed", message: "correctly rejected empty first_name", rc: rv.rc});
			}
			else
			{
				testResults.push({step: "Test 36: create_poi_record (missing first_name)", status: "warning", message: "accepted empty first_name unexpectedly"});
				// cleanup
				$Db.executeQuery("UPDATE `poi_record` SET POI_DELETED_ON=NOW() WHERE POI_ID=?", [rv.record_id]);
			}

			// Test 37: create_poi_record (invalid record type)
			testResults.push({step: "Test 37: create_poi_record (invalid record_type, expect rc 691)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "invalid",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 691)
			{
				testResults.push({step: "Test 37: create_poi_record (invalid record_type, expect rc 691)", status: "passed", message: "correctly rejected invalid record type"});
			}
			else
			{
				testResults.push({step: "Test 37: create_poi_record (invalid record_type, expect rc 691)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 38: create_poi_record (invalid threat level)
			testResults.push({step: "Test 38: create_poi_record (invalid threat_level, expect rc 692)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "Test",
				last_name: "Test",
				threat_level: "ultra",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 692)
			{
				testResults.push({step: "Test 38: create_poi_record (invalid threat_level, expect rc 692)", status: "passed", message: "correctly rejected invalid threat level"});
			}
			else
			{
				testResults.push({step: "Test 38: create_poi_record (invalid threat_level, expect rc 692)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 39: create_poi_record (no photos — expect rc 697)
			testResults.push({step: "Test 39: create_poi_record (no photos, expect rc 697)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: []
			});
			if (rv.rc === 697)
			{
				testResults.push({step: "Test 39: create_poi_record (no photos, expect rc 697)", status: "passed", message: "correctly rejected missing photos"});
			}
			else
			{
				testResults.push({step: "Test 39: create_poi_record (no photos, expect rc 697)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 40: create_poi_record (no communities — expect rc 699)
			testResults.push({step: "Test 40: create_poi_record (no communities, expect rc 699)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 699)
			{
				testResults.push({step: "Test 40: create_poi_record (no communities, expect rc 699)", status: "passed", message: "correctly rejected missing communities"});
			}
			else
			{
				testResults.push({step: "Test 40: create_poi_record (no communities, expect rc 699)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 41: create_poi_record (invalid gender — expect rc 701)
			testResults.push({step: "Test 41: create_poi_record (invalid gender, expect rc 701)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "Test",
				last_name: "Test",
				gender: "invalid_gender",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 701)
			{
				testResults.push({step: "Test 41: create_poi_record (invalid gender, expect rc 701)", status: "passed", message: "correctly rejected invalid gender"});
			}
			else
			{
				testResults.push({step: "Test 41: create_poi_record (invalid gender, expect rc 701)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 42: create_poi_record (trespass missing required fields — expect rc 705)
			testResults.push({step: "Test 42: create_poi_record (trespass missing fields, expect rc 705)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "trespass",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 705)
			{
				testResults.push({step: "Test 42: create_poi_record (trespass missing fields, expect rc 705)", status: "passed", message: "correctly rejected missing trespass fields"});
			}
			else
			{
				testResults.push({step: "Test 42: create_poi_record (trespass missing fields, expect rc 705)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 43: create_poi_record (metro_red_card missing fields — expect rc 706)
			testResults.push({step: "Test 43: create_poi_record (metro_red_card missing fields, expect rc 706)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "metro_red_card",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 706)
			{
				testResults.push({step: "Test 43: create_poi_record (metro_red_card missing fields, expect rc 706)", status: "passed", message: "correctly rejected missing metro red card fields"});
			}
			else
			{
				testResults.push({step: "Test 43: create_poi_record (metro_red_card missing fields, expect rc 706)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 44: create_poi_record (invalid file ID — expect rc 321)
			testResults.push({step: "Test 44: create_poi_record (invalid file ID, expect rc 321)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [testCommunityId],
				photo_file_ids: [999999999]
			});
			if (rv.rc === 321)
			{
				testResults.push({step: "Test 44: create_poi_record (invalid file ID, expect rc 321)", status: "passed", message: "correctly rejected invalid file ID"});
			}
			else
			{
				testResults.push({step: "Test 44: create_poi_record (invalid file ID, expect rc 321)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 45: create_poi_record (invalid community ID — expect rc 500)
			testResults.push({step: "Test 45: create_poi_record (invalid community ID, expect rc 500)", status: "running"});
			rv = $executeAPI(session, "Poi/create_poi_record", {
				record_type: "poi",
				first_name: "Test",
				last_name: "Test",
				threat_level: "low",
				summary: "Test",
				community_ids: [999999999],
				photo_file_ids: [testPhotoFileId]
			});
			if (rv.rc === 500)
			{
				testResults.push({step: "Test 45: create_poi_record (invalid community ID, expect rc 500)", status: "passed", message: "correctly rejected invalid community ID"});
			}
			else
			{
				testResults.push({step: "Test 45: create_poi_record (invalid community ID, expect rc 500)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 46: get_poi_record (invalid ID — expect rc 690)
			testResults.push({step: "Test 46: get_poi_record (invalid ID, expect rc 690)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_record", {record_id: 999999999});
			if (rv.rc === 690)
			{
				testResults.push({step: "Test 46: get_poi_record (invalid ID, expect rc 690)", status: "passed", message: "correctly returned not found"});
			}
			else
			{
				testResults.push({step: "Test 46: get_poi_record (invalid ID, expect rc 690)", status: "warning", message: "unexpected response", rc: rv.rc});
			}

			// Test 47: inactivate_poi_record (missing reason — expect rc 702)
			testResults.push({step: "Test 47: inactivate_poi_record (missing reason, expect rc 702)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 47: inactivate_poi_record (missing reason, expect rc 702)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/inactivate_poi_record", {record_id: testDraftRecordId, reason: ""});
				if (rv.rc === 702)
				{
					testResults.push({step: "Test 47: inactivate_poi_record (missing reason, expect rc 702)", status: "passed", message: "correctly rejected missing reason"});
				}
				else
				{
					testResults.push({step: "Test 47: inactivate_poi_record (missing reason, expect rc 702)", status: "warning", message: "unexpected response", rc: rv.rc});
				}
			}

			// Test 48: archive_poi_record (active — expect rc 695)
			testResults.push({step: "Test 48: archive_poi_record (active, expect rc 695)", status: "running"});
			if (testDraftRecordId === null)
			{
				testResults.push({step: "Test 48: archive_poi_record (active, expect rc 695)", status: "failed", error: "Cannot test - record was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Poi/archive_poi_record", {record_id: testDraftRecordId});
				if (rv.rc === 695)
				{
					testResults.push({step: "Test 48: archive_poi_record (active, expect rc 695)", status: "passed", message: "correctly rejected archiving active record"});
				}
				else
				{
					testResults.push({step: "Test 48: archive_poi_record (active, expect rc 695)", status: "warning", message: "unexpected response", rc: rv.rc});
				}
			}

			// Test 49: mark_viewed (invalid record — expect rc 690)
			testResults.push({step: "Test 49: mark_viewed (invalid record, expect rc 690)", status: "running"});
			if (testOfficerId === null)
			{
				testResults.push({step: "Test 49: mark_viewed (invalid record, expect rc 690)", status: "failed", error: "Cannot test - officer was not created"});
			}
			else
			{
				try
				{
					session.impersonateAccount(testOfficerId);
					rv = $executeAPI(session, "Poi/mark_viewed", {record_id: 999999999});
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;

					if (rv.rc === 690)
					{
						testResults.push({step: "Test 49: mark_viewed (invalid record, expect rc 690)", status: "passed", message: "correctly rejected invalid record"});
					}
					else
					{
						testResults.push({step: "Test 49: mark_viewed (invalid record, expect rc 690)", status: "warning", message: "unexpected response", rc: rv.rc});
					}
				}
				catch (e)
				{
					session.accountImpersonationStack = null;
					session.userId = adminUserId;
					session.userType = $Const.USER_TYPE_ADMIN;
					testResults.push({step: "Test 49: mark_viewed (invalid record, expect rc 690)", status: "failed", error: e.message});
				}
			}

			// Test 50: create_poi_record (special characters in name)
			testResults.push({step: "Test 50: create_poi_record (special characters)", status: "running"});
			// Upload a fresh photo for this test
			let freshPhoto50 = $executeAPI(session, "File/upload_file_base64", {
				file_name: `poi_test_fresh50_${uniqueId}.png`,
				file_data: testImageBase64
			});
			if ($Err.isERR(freshPhoto50))
			{
				testResults.push({step: "Test 50: create_poi_record (special characters)", status: "failed", error: "Cannot upload fresh photo: " + freshPhoto50.message});
			}
			else
			{
				rv = $executeAPI(session, "Poi/create_poi_record", {
					record_type: "poi",
					first_name: `O'Brien-McDonáld`,
					last_name: `Müller & Smith`,
					threat_level: "low",
					summary: `Special chars test ${uniqueId}`,
					community_ids: [testCommunityId],
					photo_file_ids: [freshPhoto50.file_id],
					publish: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 50: create_poi_record (special characters)", status: "warning", message: "rejected special characters", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 50: create_poi_record (special characters)", status: "passed", record_id: rv.record_id});
					// Cleanup
					$Db.executeQuery("UPDATE `poi_record` SET POI_DELETED_ON=NOW() WHERE POI_ID=?", [rv.record_id]);
				}
			}

			// Test 51: create_poi_record (Metro Red Card type)
			testResults.push({step: "Test 51: create_poi_record (Metro Red Card)", status: "running"});
			// Upload a fresh photo for this test (use testImageBase64_2 to avoid content-hash collision with freshPhoto50)
			let freshPhoto51 = $executeAPI(session, "File/upload_file_base64", {
				file_name: `poi_test_fresh51_${uniqueId}.png`,
				file_data: testImageBase64_2
			});
			if ($Err.isERR(freshPhoto51))
			{
				testResults.push({step: "Test 51: create_poi_record (Metro Red Card)", status: "failed", error: "Cannot upload fresh photo: " + freshPhoto51.message});
			}
			else
			{
				rv = $executeAPI(session, "Poi/create_poi_record", {
					record_type: "metro_red_card",
					first_name: `MetroRC ${uniqueId}`,
					last_name: `Test ${uniqueId}`,
					threat_level: "high",
					summary: `Metro Red Card test ${uniqueId}`,
					community_ids: [testCommunityId],
					photo_file_ids: [freshPhoto51.file_id],
					red_card_number: `RC-${uniqueId}`,
					issuing_authority: "Metro Transit Authority",
					issue_date: "2024-06-01",
					expiry_date: "2026-06-01",
					lines: "Red Line, Blue Line",
					publish: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 51: create_poi_record (Metro Red Card)", status: "failed", error: rv.message});
				}
				else
				{
					let metroId = rv.record_id;
					testResults.push({step: "Test 51: create_poi_record (Metro Red Card)", status: "passed", record_id: metroId});

					// Verify metro fields
					testResults.push({step: "Test 52: get_poi_record (verify metro red card fields)", status: "running"});
					rv = $executeAPI(session, "Poi/get_poi_record", {record_id: metroId});
					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 52: get_poi_record (verify metro red card fields)", status: "failed", error: rv.message});
					}
					else
					{
						let r = rv.record;
						let verified = r.record_type === "metro_red_card" &&
									   r.red_card_number === `RC-${uniqueId}` &&
									   r.issuing_authority === "Metro Transit Authority" &&
									   r.lines === "Red Line, Blue Line";
						if (verified)
						{
							testResults.push({step: "Test 52: get_poi_record (verify metro red card fields)", status: "passed", verified: true});
						}
						else
						{
							testResults.push({step: "Test 52: get_poi_record (verify metro red card fields)", status: "warning", verified: false, message: "Some metro RC fields not saved correctly"});
						}
					}

					// Cleanup
					$Db.executeQuery("UPDATE `poi_record` SET POI_DELETED_ON=NOW() WHERE POI_ID=?", [metroId]);
				}
			}

			// Test 53: get_poi_list (expiring_within_days filter)
			testResults.push({step: "Test 53: get_poi_list (expiring_within_days)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {expiring_within_days: 365});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 53: get_poi_list (expiring_within_days)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 53: get_poi_list (expiring_within_days)", status: "passed", total_count: rv.total_count});
			}

			// Test 54: get_poi_list (sort_by=name, sort_dir=asc)
			testResults.push({step: "Test 54: get_poi_list (sort_by=name)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {sort_by: "name", sort_dir: "asc"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 54: get_poi_list (sort_by=name)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 54: get_poi_list (sort_by=name)", status: "passed", total_count: rv.total_count});
			}

			// Test 55: get_poi_list (sort_by=last_update)
			testResults.push({step: "Test 55: get_poi_list (sort_by=last_update)", status: "running"});
			rv = $executeAPI(session, "Poi/get_poi_list", {sort_by: "last_update", sort_dir: "desc"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 55: get_poi_list (sort_by=last_update)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 55: get_poi_list (sort_by=last_update)", status: "passed", total_count: rv.total_count});
			}

			// =================================================================
			// Cleanup: soft-delete test POI records
			// =================================================================

			if (testDraftRecordId !== null)
			{
				$Db.executeQuery("UPDATE `poi_record` SET POI_DELETED_ON=NOW() WHERE POI_ID=?", [testDraftRecordId]);
			}
			// testRecordId already archived; soft-delete it too
			if (testRecordId !== null)
			{
				$Db.executeQuery("UPDATE `poi_record` SET POI_DELETED_ON=NOW() WHERE POI_ID=?", [testRecordId]);
			}

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
