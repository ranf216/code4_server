module.exports =
{
	test_post_order_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let testPostId = null;
		let testSectionTypeId = null;
		let testPostOrderId = null;
		let testVersionId = null;

		try
		{
			testResults.push({step: "Starting Post Order API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);

			// =================================================================
			// Setup: create test community, post, and po_section_type
			// =================================================================

			testResults.push({step: "Setup: create test community", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `PO Test Community ${uniqueId}`,
				area: "Test Area",
				latitude: 25.276987,
				longitude: 55.296249,
				location_name: "Test Location",
				timezone: "Asia/Dubai",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test community", status: "failed", error: rv.message, rc: rv.rc, details: rv.details || null});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testCommunityId = rv.community_id;
			testResults.push({step: "Setup: create test community", status: "passed", community_id: testCommunityId});

			testResults.push({step: "Setup: create test post", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO Test Post ${uniqueId}`,
				description: "Test post for post order tests",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.276987, lng: 55.296249})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test post", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testPostId = rv.post_id;
			testResults.push({step: "Setup: create test post", status: "passed", post_id: testPostId});

			testResults.push({step: "Setup: create test po_section_type", status: "running"});
			rv = $executeAPI(session, "Settings/add_po_section_type", {
				name: `PO Section ${uniqueId}`,
				client_visible: true,
				short_description: "Test section type for PO tests",
				active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test po_section_type", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testSectionTypeId = rv.type_id;
			testResults.push({step: "Setup: create test po_section_type", status: "passed", type_id: testSectionTypeId});

			// =================================================================
			// Test 1: create_post_order (happy path)
			// =================================================================

			testResults.push({step: "Test 1: create_post_order", status: "running"});
			rv = $executeAPI(session, "PostOrder/create_post_order", {
				post_id: testPostId,
				review_due_date: "2027-06-01",
				sections: [
					{
						section_type: testSectionTypeId,
						title: "General Info",
						description: "Test description for general information section",
						client_visible: true,
						notes: "Admin-only note",
						attachment_file_ids: []
					}
				]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: create_post_order", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testPostOrderId = rv.post_order_id;
			testResults.push({step: "Test 1: create_post_order", status: "passed", post_order_id: testPostOrderId});

			// =================================================================
			// Test 2: create_post_order (duplicate — expect error 681)
			// =================================================================

			testResults.push({step: "Test 2: create_post_order (duplicate)", status: "running"});
			rv = $executeAPI(session, "PostOrder/create_post_order", {
				post_id: testPostId,
				sections: [{section_type: testSectionTypeId, title: "Dup", description: "", client_visible: false}]
			});
			if (rv.rc === 681)
			{
				testResults.push({step: "Test 2: create_post_order (duplicate)", status: "passed", message: "correctly returned ERR_POST_ORDER_ALREADY_EXISTS (681)"});
			}
			else
			{
				testResults.push({step: "Test 2: create_post_order (duplicate)", status: "warning", message: "expected rc 681", rc: rv.rc});
			}

			// =================================================================
			// Test 3: create_post_order (invalid post ID)
			// =================================================================

			testResults.push({step: "Test 3: create_post_order (invalid post_id)", status: "running"});
			rv = $executeAPI(session, "PostOrder/create_post_order", {
				post_id: 999999999,
				sections: [{section_type: testSectionTypeId, title: "Test", description: "", client_visible: false}]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 3: create_post_order (invalid post_id)", status: "passed", message: "correctly rejected invalid post_id", rc: rv.rc});
			}
			else
			{
				testResults.push({step: "Test 3: create_post_order (invalid post_id)", status: "warning", message: "accepted invalid post_id unexpectedly"});
			}

			// =================================================================
			// Test 4: create_post_order (invalid section_type)
			// =================================================================

			// Create a second post for this test
			testResults.push({step: "Test 4: create_post_order (invalid section_type)", status: "running"});
			let tempPostRv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO Temp Post ${uniqueId}`,
				description: "Temp post",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.277, lng: 55.297})
			});
			if (!$Err.isERR(tempPostRv))
			{
				rv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPostRv.post_id,
					sections: [{section_type: "nonexistent_type_xyz", title: "Test", description: "", client_visible: false}]
				});
				if (rv.rc === 676)
				{
					testResults.push({step: "Test 4: create_post_order (invalid section_type)", status: "passed", message: "correctly returned ERR_POST_ORDER_INVALID_SECTION_TYPE (676)"});
				}
				else
				{
					testResults.push({step: "Test 4: create_post_order (invalid section_type)", status: "warning", message: "expected rc 676", rc: rv.rc});
				}
				// Clean up temp post
				$executeAPI(session, "Asset/delete_post", {post_id: tempPostRv.post_id});
			}
			else
			{
				testResults.push({step: "Test 4: create_post_order (invalid section_type)", status: "failed", error: "Could not create temp post for test"});
			}

			// =================================================================
			// Test 5: create_post_order (exceed attachment limit)
			// =================================================================

			testResults.push({step: "Test 5: create_post_order (exceed attachment limit)", status: "running"});
			let tempPost2Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO Attach Post ${uniqueId}`,
				description: "Attachment test post",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.278, lng: 55.298})
			});
			if (!$Err.isERR(tempPost2Rv))
			{
				rv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost2Rv.post_id,
					sections: [{
						section_type: testSectionTypeId,
						title: "Test",
						description: "",
						client_visible: false,
						attachment_file_ids: [1, 2, 3, 4, 5, 6]
					}]
				});
				if (rv.rc === 679)
				{
					testResults.push({step: "Test 5: create_post_order (exceed attachment limit)", status: "passed", message: "correctly returned ERR_POST_ORDER_MEDIA_LIMIT_REACHED (679)"});
				}
				else
				{
					testResults.push({step: "Test 5: create_post_order (exceed attachment limit)", status: "warning", message: "expected rc 679", rc: rv.rc});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost2Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 5: create_post_order (exceed attachment limit)", status: "failed", error: "Could not create temp post for test"});
			}

			// =================================================================
			// Test 6: get_post_orders_list (admin, default params)
			// =================================================================

			testResults.push({step: "Test 6: get_post_orders_list", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 6: get_post_orders_list", status: "failed", error: "Cannot list - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_post_orders_list", {});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 6: get_post_orders_list", status: "failed", error: rv.message});
				}
				else
				{
					let found = rv.post_orders.find(po => po.post_order_id === testPostOrderId);
					if (found && found.status === "draft" && found.version === "0.0")
					{
						testResults.push({step: "Test 6: get_post_orders_list", status: "passed", total_count: rv.total_count, found_test_po: true});
					}
					else
					{
						testResults.push({step: "Test 6: get_post_orders_list", status: "warning", message: "Test PO not found or unexpected status/version", found: !!found});
					}
				}
			}

			// =================================================================
			// Test 7: get_post_orders_list (filter by community)
			// =================================================================

			testResults.push({step: "Test 7: get_post_orders_list (community filter)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 7: get_post_orders_list (community filter)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_post_orders_list", {community_id: testCommunityId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 7: get_post_orders_list (community filter)", status: "failed", error: rv.message});
				}
				else
				{
					let allMatch = rv.post_orders.every(po => po.community_id === testCommunityId);
					if (allMatch && rv.total_count >= 1)
					{
						testResults.push({step: "Test 7: get_post_orders_list (community filter)", status: "passed", count: rv.total_count});
					}
					else
					{
						testResults.push({step: "Test 7: get_post_orders_list (community filter)", status: "warning", message: "Community filter did not work as expected"});
					}
				}
			}

			// =================================================================
			// Test 8: get_post_orders_list (filter by status)
			// =================================================================

			testResults.push({step: "Test 8: get_post_orders_list (status filter)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_post_orders_list", {status: "draft"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 8: get_post_orders_list (status filter)", status: "failed", error: rv.message});
			}
			else
			{
				let allDraft = rv.post_orders.every(po => po.status === "draft");
				if (allDraft)
				{
					testResults.push({step: "Test 8: get_post_orders_list (status filter)", status: "passed", count: rv.total_count});
				}
				else
				{
					testResults.push({step: "Test 8: get_post_orders_list (status filter)", status: "warning", message: "Status filter returned non-draft records"});
				}
			}

			// =================================================================
			// Test 9: get_post_orders_list (sort, pagination)
			// =================================================================

			testResults.push({step: "Test 9: get_post_orders_list (pagination)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_post_orders_list", {sort_by: "post_name", sort_dir: "desc", offset: 0, limit: 5});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 9: get_post_orders_list (pagination)", status: "failed", error: rv.message});
			}
			else
			{
				let withinLimit = rv.post_orders.length <= 5;
				if (withinLimit)
				{
					testResults.push({step: "Test 9: get_post_orders_list (pagination)", status: "passed", returned: rv.post_orders.length, total: rv.total_count});
				}
				else
				{
					testResults.push({step: "Test 9: get_post_orders_list (pagination)", status: "warning", message: "Returned more than limit"});
				}
			}

			// =================================================================
			// Test 10: get_post_orders_list (search_text)
			// =================================================================

			testResults.push({step: "Test 10: get_post_orders_list (search)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_post_orders_list", {search_text: uniqueId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 10: get_post_orders_list (search)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.post_orders.find(po => po.post_order_id === testPostOrderId);
				if (found)
				{
					testResults.push({step: "Test 10: get_post_orders_list (search)", status: "passed", found: true, total: rv.total_count});
				}
				else
				{
					testResults.push({step: "Test 10: get_post_orders_list (search)", status: "warning", message: "Search did not find test PO"});
				}
			}

			// =================================================================
			// Test 11: get_post_orders_list (review_due_before)
			// =================================================================

			testResults.push({step: "Test 11: get_post_orders_list (review_due_before)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_post_orders_list", {review_due_before: "2028-01-01"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 11: get_post_orders_list (review_due_before)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.post_orders.find(po => po.post_order_id === testPostOrderId);
				if (found)
				{
					testResults.push({step: "Test 11: get_post_orders_list (review_due_before)", status: "passed", found: true});
				}
				else
				{
					testResults.push({step: "Test 11: get_post_orders_list (review_due_before)", status: "warning", message: "Review due filter did not return test PO"});
				}
			}

			// =================================================================
			// Test 12: get_post_order (admin view, draft)
			// =================================================================

			testResults.push({step: "Test 12: get_post_order (admin, draft)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 12: get_post_order (admin, draft)", status: "failed", error: "Cannot get - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: testPostOrderId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 12: get_post_order (admin, draft)", status: "failed", error: rv.message});
				}
				else
				{
					let po = rv.post_order;
					let verified = po.status === "draft" &&
								   po.version === "0.0" &&
								   po.post_id === testPostId &&
								   po.community_id === testCommunityId &&
								   po.review_due_date !== null &&
								   Array.isArray(po.sections) &&
								   po.sections.length === 1 &&
								   po.sections[0].title === "General Info" &&
								   po.sections[0].client_visible === true &&
								   po.sections[0].notes === "Admin-only note";
					if (verified)
					{
						testResults.push({step: "Test 12: get_post_order (admin, draft)", status: "passed", verified: true, section_count: po.sections.length});
					}
					else
					{
						testResults.push({step: "Test 12: get_post_order (admin, draft)", status: "warning", verified: false, message: "Some fields not as expected"});
					}
				}
			}

			// =================================================================
			// Test 13: get_post_order (invalid ID)
			// =================================================================

			testResults.push({step: "Test 13: get_post_order (invalid ID)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: 999999999});
			if (rv.rc === 670)
			{
				testResults.push({step: "Test 13: get_post_order (invalid ID)", status: "passed", message: "correctly returned ERR_POST_ORDER_NOT_FOUND (670)"});
			}
			else
			{
				testResults.push({step: "Test 13: get_post_order (invalid ID)", status: "warning", message: "expected rc 670", rc: rv.rc});
			}

			// =================================================================
			// Test 14: update_post_order (update review_due_date only)
			// =================================================================

			testResults.push({step: "Test 14: update_post_order (review_due_date)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 14: update_post_order (review_due_date)", status: "failed", error: "Cannot update - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/update_post_order", {
					post_order_id: testPostOrderId,
					review_due_date: "2027-12-01"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 14: update_post_order (review_due_date)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 14: update_post_order (review_due_date)", status: "passed"});
				}
			}

			// =================================================================
			// Test 15: update_post_order (replace sections with multiple)
			// =================================================================

			testResults.push({step: "Test 15: update_post_order (replace sections)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 15: update_post_order (replace sections)", status: "failed", error: "Cannot update - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/update_post_order", {
					post_order_id: testPostOrderId,
					sections: [
						{section_type: testSectionTypeId, title: "Updated General", description: "Updated description", client_visible: true, notes: "Updated note"},
						{section_type: testSectionTypeId, title: "Duties Section", description: "Duties and responsibilities", client_visible: false, notes: null}
					]
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 15: update_post_order (replace sections)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 15: update_post_order (replace sections)", status: "passed"});
				}
			}

			// =================================================================
			// Test 16: get_post_order (verify update)
			// =================================================================

			testResults.push({step: "Test 16: get_post_order (verify update)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 16: get_post_order (verify update)", status: "failed", error: "Cannot verify - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: testPostOrderId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 16: get_post_order (verify update)", status: "failed", error: rv.message});
				}
				else
				{
					let po = rv.post_order;
					let verified = po.review_due_date !== null &&
								   Array.isArray(po.sections) &&
								   po.sections.length === 2 &&
								   po.sections[0].title === "Updated General" &&
								   po.sections[1].title === "Duties Section" &&
								   po.sections[1].client_visible === false;
					if (verified)
					{
						testResults.push({step: "Test 16: get_post_order (verify update)", status: "passed", verified: true, section_count: po.sections.length});
					}
					else
					{
						testResults.push({step: "Test 16: get_post_order (verify update)", status: "warning", verified: false, message: "Update not reflected as expected"});
					}
				}
			}

			// =================================================================
			// Test 17: update_post_order (invalid ID)
			// =================================================================

			testResults.push({step: "Test 17: update_post_order (invalid ID)", status: "running"});
			rv = $executeAPI(session, "PostOrder/update_post_order", {post_order_id: 999999999, review_due_date: "2027-01-01"});
			if (rv.rc === 670)
			{
				testResults.push({step: "Test 17: update_post_order (invalid ID)", status: "passed", message: "correctly returned ERR_POST_ORDER_NOT_FOUND (670)"});
			}
			else
			{
				testResults.push({step: "Test 17: update_post_order (invalid ID)", status: "warning", message: "expected rc 670", rc: rv.rc});
			}

			// =================================================================
			// Test 18: publish_post_order (first publish — always 1.0)
			// =================================================================

			testResults.push({step: "Test 18: publish_post_order (first publish)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 18: publish_post_order (first publish)", status: "failed", error: "Cannot publish - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/publish_post_order", {
					post_order_id: testPostOrderId,
					version_type: "minor",
					change_summary: "Initial release for test",
					effective_date: "2027-01-15",
					notify_officers: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 18: publish_post_order (first publish)", status: "failed", error: rv.message});
				}
				else
				{
					testVersionId = rv.version_id;
					let firstPublishCorrect = rv.version === "1.0";
					if (firstPublishCorrect)
					{
						testResults.push({step: "Test 18: publish_post_order (first publish)", status: "passed", version_id: testVersionId, version: rv.version});
					}
					else
					{
						testResults.push({step: "Test 18: publish_post_order (first publish)", status: "warning", message: "First publish should be 1.0", version: rv.version});
					}
				}
			}

			// =================================================================
			// Test 19: publish_post_order (already published — expect error 671)
			// =================================================================

			testResults.push({step: "Test 19: publish_post_order (already published)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 19: publish_post_order (already published)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/publish_post_order", {
					post_order_id: testPostOrderId,
					version_type: "minor",
					change_summary: "Should fail",
					notify_officers: false
				});
				if (rv.rc === 671)
				{
					testResults.push({step: "Test 19: publish_post_order (already published)", status: "passed", message: "correctly returned ERR_POST_ORDER_CANNOT_PUBLISH (671)"});
				}
				else
				{
					testResults.push({step: "Test 19: publish_post_order (already published)", status: "warning", message: "expected rc 671", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 20: get_post_order (verify published state)
			// =================================================================

			testResults.push({step: "Test 20: get_post_order (verify published)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 20: get_post_order (verify published)", status: "failed", error: "Cannot verify - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: testPostOrderId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 20: get_post_order (verify published)", status: "failed", error: rv.message});
				}
				else
				{
					let po = rv.post_order;
					let verified = po.status === "published" &&
								   po.version === "1.0" &&
								   po.effective_date !== null &&
								   po.last_published_on !== null;
					if (verified)
					{
						testResults.push({step: "Test 20: get_post_order (verify published)", status: "passed", verified: true, version: po.version});
					}
					else
					{
						testResults.push({step: "Test 20: get_post_order (verify published)", status: "warning", verified: false, message: "Published state not as expected", status_actual: po.status, version_actual: po.version});
					}
				}
			}

			// =================================================================
			// Test 21: update_post_order (published → auto-draft transition)
			// =================================================================

			testResults.push({step: "Test 21: update_post_order (published→draft)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 21: update_post_order (published→draft)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/update_post_order", {
					post_order_id: testPostOrderId,
					sections: [
						{section_type: testSectionTypeId, title: "Revised General", description: "Revised description v2", client_visible: true, notes: "Revised note"}
					]
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 21: update_post_order (published→draft)", status: "failed", error: rv.message});
				}
				else
				{
					// Verify status is now draft
					let verifyRv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: testPostOrderId});
					if (!$Err.isERR(verifyRv) && verifyRv.post_order.status === "draft")
					{
						testResults.push({step: "Test 21: update_post_order (published→draft)", status: "passed", new_status: "draft"});
					}
					else
					{
						testResults.push({step: "Test 21: update_post_order (published→draft)", status: "warning", message: "Expected status to transition to draft"});
					}
				}
			}

			// =================================================================
			// Test 22: publish_post_order (minor bump → 1.1)
			// =================================================================

			testResults.push({step: "Test 22: publish_post_order (minor bump)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 22: publish_post_order (minor bump)", status: "failed", error: "Cannot publish - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/publish_post_order", {
					post_order_id: testPostOrderId,
					version_type: "minor",
					change_summary: "Minor revision for testing",
					notify_officers: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 22: publish_post_order (minor bump)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.version === "1.1")
					{
						testResults.push({step: "Test 22: publish_post_order (minor bump)", status: "passed", version: rv.version, version_id: rv.version_id});
					}
					else
					{
						testResults.push({step: "Test 22: publish_post_order (minor bump)", status: "warning", message: "Expected version 1.1", version: rv.version});
					}
				}
			}

			// =================================================================
			// Test 23: publish_post_order (major bump → 2.0)
			// =================================================================

			testResults.push({step: "Test 23: publish_post_order (major bump)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 23: publish_post_order (major bump)", status: "failed", error: "Cannot publish - post order was not created"});
			}
			else
			{
				// First transition back to draft
				$executeAPI(session, "PostOrder/update_post_order", {
					post_order_id: testPostOrderId,
					review_due_date: "2028-01-01"
				});

				rv = $executeAPI(session, "PostOrder/publish_post_order", {
					post_order_id: testPostOrderId,
					version_type: "major",
					change_summary: "Major revision for testing",
					notify_officers: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 23: publish_post_order (major bump)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.version === "2.0")
					{
						testResults.push({step: "Test 23: publish_post_order (major bump)", status: "passed", version: rv.version, version_id: rv.version_id});
					}
					else
					{
						testResults.push({step: "Test 23: publish_post_order (major bump)", status: "warning", message: "Expected version 2.0", version: rv.version});
					}
				}
			}

			// =================================================================
			// Test 24: get_version_history
			// =================================================================

			testResults.push({step: "Test 24: get_version_history", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 24: get_version_history", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_version_history", {post_order_id: testPostOrderId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 24: get_version_history", status: "failed", error: rv.message});
				}
				else
				{
					let verified = Array.isArray(rv.versions) &&
								   rv.versions.length === 3 &&
								   rv.versions[0].version === "2.0" &&
								   rv.versions[0].version_type === "major" &&
								   rv.versions[0].change_summary === "Major revision for testing";
					if (verified)
					{
						testResults.push({step: "Test 24: get_version_history", status: "passed", version_count: rv.versions.length});
					}
					else
					{
						let v0 = rv.versions && rv.versions.length > 0 ? rv.versions[0] : null;
						testResults.push({step: "Test 24: get_version_history", status: "warning", message: "Version history not as expected",
							count: rv.versions ? rv.versions.length : 0,
							first_version: v0 ? v0.version : null,
							first_version_type: v0 ? v0.version_type : null,
							first_change_summary: v0 ? v0.change_summary : null,
							first_version_typeof: v0 ? typeof v0.version : null
						});
					}
				}
			}

			// =================================================================
			// Test 25: get_version_history (invalid ID)
			// =================================================================

			testResults.push({step: "Test 25: get_version_history (invalid ID)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_version_history", {post_order_id: 999999999});
			if (rv.rc === 670)
			{
				testResults.push({step: "Test 25: get_version_history (invalid ID)", status: "passed", message: "correctly returned ERR_POST_ORDER_NOT_FOUND (670)"});
			}
			else
			{
				testResults.push({step: "Test 25: get_version_history (invalid ID)", status: "warning", message: "expected rc 670", rc: rv.rc});
			}

			// =================================================================
			// Test 26: get_version (specific version)
			// =================================================================

			testResults.push({step: "Test 26: get_version", status: "running"});
			if (testPostOrderId === null || testVersionId === null)
			{
				testResults.push({step: "Test 26: get_version", status: "failed", error: "Cannot test - post order or version was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_version", {post_order_id: testPostOrderId, version_id: testVersionId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 26: get_version", status: "failed", error: rv.message});
				}
				else
				{
					let v = rv.version;
					let verified = v.version_id === testVersionId &&
								   v.version === "1.0" &&
								   v.change_summary === "Initial release for test" &&
								   Array.isArray(v.sections) &&
								   v.sections.length > 0;
					if (verified)
					{
						testResults.push({step: "Test 26: get_version", status: "passed", verified: true, section_count: v.sections.length});
					}
					else
					{
						testResults.push({step: "Test 26: get_version", status: "warning", verified: false, message: "Version content not as expected"});
					}
				}
			}

			// =================================================================
			// Test 27: get_version (invalid version ID)
			// =================================================================

			testResults.push({step: "Test 27: get_version (invalid version_id)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 27: get_version (invalid version_id)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_version", {post_order_id: testPostOrderId, version_id: 999999999});
				if (rv.rc === 680)
				{
					testResults.push({step: "Test 27: get_version (invalid version_id)", status: "passed", message: "correctly returned ERR_POST_ORDER_VERSION_NOT_FOUND (680)"});
				}
				else
				{
					testResults.push({step: "Test 27: get_version (invalid version_id)", status: "warning", message: "expected rc 680", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 28: archive_post_order
			// =================================================================

			testResults.push({step: "Test 28: archive_post_order", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 28: archive_post_order", status: "failed", error: "Cannot archive - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/archive_post_order", {post_order_id: testPostOrderId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 28: archive_post_order", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 28: archive_post_order", status: "passed"});
				}
			}

			// =================================================================
			// Test 29: get_post_order (verify archived)
			// =================================================================

			testResults.push({step: "Test 29: get_post_order (verify archived)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 29: get_post_order (verify archived)", status: "failed", error: "Cannot verify - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: testPostOrderId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 29: get_post_order (verify archived)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.post_order.status === "archived")
					{
						testResults.push({step: "Test 29: get_post_order (verify archived)", status: "passed", po_status: rv.post_order.status});
					}
					else
					{
						testResults.push({step: "Test 29: get_post_order (verify archived)", status: "warning", message: "Expected status archived", actual: rv.post_order.status});
					}
				}
			}

			// =================================================================
			// Test 30: archive_post_order (already archived — expect error 672)
			// =================================================================

			testResults.push({step: "Test 30: archive_post_order (already archived)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 30: archive_post_order (already archived)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/archive_post_order", {post_order_id: testPostOrderId});
				if (rv.rc === 672)
				{
					testResults.push({step: "Test 30: archive_post_order (already archived)", status: "passed", message: "correctly returned ERR_POST_ORDER_CANNOT_ARCHIVE (672)"});
				}
				else
				{
					testResults.push({step: "Test 30: archive_post_order (already archived)", status: "warning", message: "expected rc 672", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 31: update_post_order (archived — expect error 677)
			// =================================================================

			testResults.push({step: "Test 31: update_post_order (archived)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 31: update_post_order (archived)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/update_post_order", {
					post_order_id: testPostOrderId,
					review_due_date: "2028-06-01"
				});
				if (rv.rc === 677)
				{
					testResults.push({step: "Test 31: update_post_order (archived)", status: "passed", message: "correctly returned ERR_POST_ORDER_CANNOT_EDIT (677)"});
				}
				else
				{
					testResults.push({step: "Test 31: update_post_order (archived)", status: "warning", message: "expected rc 677", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 32: delete_post_order (published history — expect error 673)
			// =================================================================

			testResults.push({step: "Test 32: delete_post_order (has history)", status: "running"});
			if (testPostOrderId === null)
			{
				testResults.push({step: "Test 32: delete_post_order (has history)", status: "failed", error: "Cannot test - post order was not created"});
			}
			else
			{
				rv = $executeAPI(session, "PostOrder/delete_post_order", {post_order_id: testPostOrderId});
				if (rv.rc === 673)
				{
					testResults.push({step: "Test 32: delete_post_order (has history)", status: "passed", message: "correctly returned ERR_POST_ORDER_CANNOT_DELETE (673)"});
				}
				else
				{
					testResults.push({step: "Test 32: delete_post_order (has history)", status: "warning", message: "expected rc 673", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 33: delete_post_order (invalid ID)
			// =================================================================

			testResults.push({step: "Test 33: delete_post_order (invalid ID)", status: "running"});
			rv = $executeAPI(session, "PostOrder/delete_post_order", {post_order_id: 999999999});
			if (rv.rc === 670)
			{
				testResults.push({step: "Test 33: delete_post_order (invalid ID)", status: "passed", message: "correctly returned ERR_POST_ORDER_NOT_FOUND (670)"});
			}
			else
			{
				testResults.push({step: "Test 33: delete_post_order (invalid ID)", status: "warning", message: "expected rc 670", rc: rv.rc});
			}

			// =================================================================
			// Test 34: delete_post_order (create draft without history, then delete)
			// =================================================================

			testResults.push({step: "Test 34: delete_post_order (valid draft)", status: "running"});
			let tempPost3Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO Delete Post ${uniqueId}`,
				description: "Post for delete test",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.279, lng: 55.299})
			});
			if (!$Err.isERR(tempPost3Rv))
			{
				let delPoRv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost3Rv.post_id,
					sections: [{section_type: testSectionTypeId, title: "Temp Section", description: "For deletion", client_visible: false}]
				});
				if (!$Err.isERR(delPoRv))
				{
					rv = $executeAPI(session, "PostOrder/delete_post_order", {post_order_id: delPoRv.post_order_id});
					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 34: delete_post_order (valid draft)", status: "failed", error: rv.message});
					}
					else
					{
						// Verify it's gone
						let verifyRv = $executeAPI(session, "PostOrder/get_post_order", {post_order_id: delPoRv.post_order_id});
						if (verifyRv.rc === 670)
						{
							testResults.push({step: "Test 34: delete_post_order (valid draft)", status: "passed", verified_deleted: true});
						}
						else
						{
							testResults.push({step: "Test 34: delete_post_order (valid draft)", status: "warning", message: "Deleted PO still accessible"});
						}
					}
				}
				else
				{
					testResults.push({step: "Test 34: delete_post_order (valid draft)", status: "failed", error: "Could not create temp PO for delete test"});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost3Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 34: delete_post_order (valid draft)", status: "failed", error: "Could not create temp post for delete test"});
			}

			// =================================================================
			// Test 35: publish_post_order (empty change_summary — expect error)
			// =================================================================

			testResults.push({step: "Test 35: publish_post_order (empty change_summary)", status: "running"});
			// Create a fresh draft for this test
			let tempPost4Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO Summary Post ${uniqueId}`,
				description: "Post for summary test",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.280, lng: 55.300})
			});
			if (!$Err.isERR(tempPost4Rv))
			{
				let summaryPoRv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost4Rv.post_id,
					sections: [{section_type: testSectionTypeId, title: "Test", description: "Test", client_visible: false}]
				});
				if (!$Err.isERR(summaryPoRv))
				{
					rv = $executeAPI(session, "PostOrder/publish_post_order", {
						post_order_id: summaryPoRv.post_order_id,
						version_type: "minor",
						change_summary: "",
						notify_officers: false
					});
					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 35: publish_post_order (empty change_summary)", status: "passed", message: "correctly rejected empty change_summary"});
					}
					else
					{
						testResults.push({step: "Test 35: publish_post_order (empty change_summary)", status: "warning", message: "accepted empty change_summary unexpectedly"});
					}
					// Clean up
					$executeAPI(session, "PostOrder/delete_post_order", {post_order_id: summaryPoRv.post_order_id});
				}
				else
				{
					testResults.push({step: "Test 35: publish_post_order (empty change_summary)", status: "failed", error: "Could not create temp PO"});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost4Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 35: publish_post_order (empty change_summary)", status: "failed", error: "Could not create temp post"});
			}

			// =================================================================
			// Test 36: publish_post_order (invalid version_type)
			// =================================================================

			testResults.push({step: "Test 36: publish_post_order (invalid version_type)", status: "running"});
			let tempPost5Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO VerType Post ${uniqueId}`,
				description: "Post for version_type test",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.281, lng: 55.301})
			});
			if (!$Err.isERR(tempPost5Rv))
			{
				let vtPoRv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost5Rv.post_id,
					sections: [{section_type: testSectionTypeId, title: "Test", description: "Test", client_visible: false}]
				});
				if (!$Err.isERR(vtPoRv))
				{
					rv = $executeAPI(session, "PostOrder/publish_post_order", {
						post_order_id: vtPoRv.post_order_id,
						version_type: "invalid_type_xyz",
						change_summary: "Should fail",
						notify_officers: false
					});
					if ($Err.isERR(rv))
					{
						testResults.push({step: "Test 36: publish_post_order (invalid version_type)", status: "passed", message: "correctly rejected invalid version_type"});
					}
					else
					{
						testResults.push({step: "Test 36: publish_post_order (invalid version_type)", status: "warning", message: "accepted invalid version_type unexpectedly"});
					}
					$executeAPI(session, "PostOrder/delete_post_order", {post_order_id: vtPoRv.post_order_id});
				}
				else
				{
					testResults.push({step: "Test 36: publish_post_order (invalid version_type)", status: "failed", error: "Could not create temp PO"});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost5Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 36: publish_post_order (invalid version_type)", status: "failed", error: "Could not create temp post"});
			}

			// =================================================================
			// Test 37: archive_post_order (draft — expect error 672)
			// =================================================================

			testResults.push({step: "Test 37: archive_post_order (draft)", status: "running"});
			let tempPost6Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO ArchDraft Post ${uniqueId}`,
				description: "Post for archive draft test",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.282, lng: 55.302})
			});
			if (!$Err.isERR(tempPost6Rv))
			{
				let draftPoRv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost6Rv.post_id,
					sections: [{section_type: testSectionTypeId, title: "Test", description: "Test", client_visible: false}]
				});
				if (!$Err.isERR(draftPoRv))
				{
					rv = $executeAPI(session, "PostOrder/archive_post_order", {post_order_id: draftPoRv.post_order_id});
					if (rv.rc === 672)
					{
						testResults.push({step: "Test 37: archive_post_order (draft)", status: "passed", message: "correctly returned ERR_POST_ORDER_CANNOT_ARCHIVE (672)"});
					}
					else
					{
						testResults.push({step: "Test 37: archive_post_order (draft)", status: "warning", message: "expected rc 672", rc: rv.rc});
					}
					$executeAPI(session, "PostOrder/delete_post_order", {post_order_id: draftPoRv.post_order_id});
				}
				else
				{
					testResults.push({step: "Test 37: archive_post_order (draft)", status: "failed", error: "Could not create temp PO"});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost6Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 37: archive_post_order (draft)", status: "failed", error: "Could not create temp post"});
			}

			// =================================================================
			// Test 38: create_post_order (section title exceeds 80 chars)
			// =================================================================

			testResults.push({step: "Test 38: create_post_order (long title)", status: "running"});
			let tempPost7Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO LongTitle Post ${uniqueId}`,
				description: "Post for long title test",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.283, lng: 55.303})
			});
			if (!$Err.isERR(tempPost7Rv))
			{
				let longTitle = "A".repeat(81);
				rv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost7Rv.post_id,
					sections: [{section_type: testSectionTypeId, title: longTitle, description: "", client_visible: false}]
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 38: create_post_order (long title)", status: "passed", message: "correctly rejected title exceeding 80 chars"});
				}
				else
				{
					testResults.push({step: "Test 38: create_post_order (long title)", status: "warning", message: "accepted title >80 chars unexpectedly"});
					$executeAPI(session, "PostOrder/delete_post_order", {post_order_id: rv.post_order_id});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost7Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 38: create_post_order (long title)", status: "failed", error: "Could not create temp post"});
			}

			// =================================================================
			// Test 39: create_post_order (empty sections array — expect error)
			// =================================================================

			testResults.push({step: "Test 39: create_post_order (empty sections)", status: "running"});
			let tempPost8Rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `PO EmptySection Post ${uniqueId}`,
				description: "Post for empty sections test",
				priority: "normal",
				shape: "place",
				location: JSON.stringify({lat: 25.284, lng: 55.304})
			});
			if (!$Err.isERR(tempPost8Rv))
			{
				rv = $executeAPI(session, "PostOrder/create_post_order", {
					post_id: tempPost8Rv.post_id,
					sections: []
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 39: create_post_order (empty sections)", status: "passed", message: "correctly rejected empty sections array"});
				}
				else
				{
					testResults.push({step: "Test 39: create_post_order (empty sections)", status: "warning", message: "accepted empty sections unexpectedly"});
					$executeAPI(session, "PostOrder/delete_post_order", {post_order_id: rv.post_order_id});
				}
				$executeAPI(session, "Asset/delete_post", {post_id: tempPost8Rv.post_id});
			}
			else
			{
				testResults.push({step: "Test 39: create_post_order (empty sections)", status: "failed", error: "Could not create temp post"});
			}

			// =================================================================
			// Test 40: get_post_orders_list (invalid status filter)
			// =================================================================

			testResults.push({step: "Test 40: get_post_orders_list (invalid status)", status: "running"});
			rv = $executeAPI(session, "PostOrder/get_post_orders_list", {status: "nonexistent_status"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 40: get_post_orders_list (invalid status)", status: "passed", message: "correctly rejected invalid status"});
			}
			else
			{
				testResults.push({step: "Test 40: get_post_orders_list (invalid status)", status: "warning", message: "accepted invalid status filter unexpectedly"});
			}

			// =================================================================
			// Cleanup
			// =================================================================

			testResults.push({step: "Cleanup: delete test po_section_type", status: "running"});
			if (testSectionTypeId !== null)
			{
				let delRv = $executeAPI(session, "Settings/delete_po_section_type", {type_id: testSectionTypeId});
				if (!$Err.isERR(delRv))
				{
					testResults.push({step: "Cleanup: delete test po_section_type", status: "passed"});
				}
				else
				{
					testResults.push({step: "Cleanup: delete test po_section_type", status: "warning", error: delRv.message});
				}
			}
			else
			{
				testResults.push({step: "Cleanup: delete test po_section_type", status: "passed", message: "no section type to clean up"});
			}

			testResults.push({step: "Cleanup: delete test post", status: "running"});
			if (testPostId !== null)
			{
				let delRv = $executeAPI(session, "Asset/delete_post", {post_id: testPostId});
				if (!$Err.isERR(delRv))
				{
					testResults.push({step: "Cleanup: delete test post", status: "passed"});
				}
				else
				{
					testResults.push({step: "Cleanup: delete test post", status: "warning", error: delRv.message});
				}
			}
			else
			{
				testResults.push({step: "Cleanup: delete test post", status: "passed", message: "no post to clean up"});
			}

			testResults.push({step: "Cleanup: delete test community", status: "running"});
			if (testCommunityId !== null)
			{
				let delRv = $executeAPI(session, "Community/delete_community", {community_id: testCommunityId});
				if (!$Err.isERR(delRv))
				{
					testResults.push({step: "Cleanup: delete test community", status: "passed"});
				}
				else
				{
					testResults.push({step: "Cleanup: delete test community", status: "warning", error: delRv.message});
				}
			}
			else
			{
				testResults.push({step: "Cleanup: delete test community", status: "passed", message: "no community to clean up"});
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
