module.exports =
{
	test_asset_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let testAssetTypeId = null;
		let testAssetId = null;
		let testBatchAssetIds = null;
		let testPostId = null;
		let testZoneId = null;

		try
		{
			testResults.push({step: "Starting Asset API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);

			// =================================================================
			// Setup: create a test community and a test asset type
			// =================================================================

			testResults.push({step: "Setup: create test community", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `Asset Test Community ${uniqueId}`,
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

			testResults.push({step: "Setup: create test asset type", status: "running"});
			rv = $executeAPI(session, "Settings/add_asset_type", {
				name: `TestAssetType ${uniqueId}`,
				icon: "test_icon.png",
				color: "#FF5733"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test asset type", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testAssetTypeId = rv.type_id;
			testResults.push({step: "Setup: create test asset type", status: "passed", type_id: testAssetTypeId});

			// =================================================================
			// Metadata
			// =================================================================

			testResults.push({step: "Test 1: get_asset_metadata", status: "running"});
			rv = $executeAPI(session, "Asset/get_asset_metadata", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: get_asset_metadata", status: "failed", error: rv.message});
			}
			else
			{
				let hasShapes = Array.isArray(rv.asset_shapes) && rv.asset_shapes.length > 0;
				let hasPriorities = Array.isArray(rv.post_priorities) && rv.post_priorities.length > 0;
				let hasZoneTypes = Array.isArray(rv.map_zone_types) && rv.map_zone_types.length > 0;
				// asset_types is DB-backed and may be empty on a fresh database — only check static items
				if (hasShapes && hasPriorities && hasZoneTypes)
				{
					testResults.push({step: "Test 1: get_asset_metadata", status: "passed",
						asset_types_count: Array.isArray(rv.asset_types) ? rv.asset_types.length : 0,
						asset_shapes_count: rv.asset_shapes.length,
						post_priorities_count: rv.post_priorities.length,
						map_zone_types_count: rv.map_zone_types.length
					});
				}
				else
				{
					testResults.push({step: "Test 1: get_asset_metadata", status: "warning",
						message: "some static metadata arrays are empty or missing",
						has_shapes: hasShapes,
						has_priorities: hasPriorities,
						has_zone_types: hasZoneTypes
					});
				}
			}

			// =================================================================
			// Asset CRUD
			// =================================================================

			// --- Create asset (place, all parameters) ---
			testResults.push({step: "Test 2: create_asset (place, all params)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				shape: "place",
				location: JSON.stringify({lat: 25.276, lng: 55.296}),
				description: "Test camera unit SN-001",
				installation_date: "2026-01-15",
				replacement_date: "2031-01-15"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 2: create_asset (place, all params)", status: "failed", error: rv.message});
			}
			else
			{
				testAssetId = rv.asset_id;
				testResults.push({step: "Test 2: create_asset (place, all params)", status: "passed", asset_id: testAssetId});
			}

			// --- Get asset (verify create) ---
			testResults.push({step: "Test 3: get_asset (verify create)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 3: get_asset (verify create)", status: "failed", error: "Cannot verify - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_asset", {asset_id: testAssetId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 3: get_asset (verify create)", status: "failed", error: rv.message});
				}
				else
				{
					let a = rv.asset;
					let verified = a.asset_id === testAssetId &&
								   a.community_id === testCommunityId &&
								   a.asset_type === testAssetTypeId &&
								   a.shape === "place" &&
								   a.description === "Test camera unit SN-001" &&
								   a.installation_date === "2026-01-15" &&
								   a.replacement_date === "2031-01-15" &&
								   a.acres === 0;
					if (verified)
					{
						testResults.push({step: "Test 3: get_asset (verify create)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 3: get_asset (verify create)", status: "warning", verified: false, message: "Some asset fields not saved correctly"});
					}
				}
			}

			// --- Get assets list ---
			testResults.push({step: "Test 4: get_assets_list", status: "running"});
			rv = $executeAPI(session, "Asset/get_assets_list", {
				community_id: testCommunityId,
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 4: get_assets_list", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.assets.find(a => a.asset_id === testAssetId);
				if (found && rv.num_of_items >= 1)
				{
					testResults.push({step: "Test 4: get_assets_list", status: "passed", num_of_items: rv.num_of_items, num_of_pages: rv.num_of_pages});
				}
				else
				{
					testResults.push({step: "Test 4: get_assets_list", status: "warning", message: "Created asset not found in list", num_of_items: rv.num_of_items});
				}
			}

			// --- Get assets list with type filter ---
			testResults.push({step: "Test 5: get_assets_list (type filter)", status: "running"});
			rv = $executeAPI(session, "Asset/get_assets_list", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 5: get_assets_list (type filter)", status: "failed", error: rv.message});
			}
			else
			{
				let allMatch = rv.assets.every(a => a.asset_type === testAssetTypeId);
				if (allMatch && rv.num_of_items >= 1)
				{
					testResults.push({step: "Test 5: get_assets_list (type filter)", status: "passed", filtered_count: rv.num_of_items});
				}
				else
				{
					testResults.push({step: "Test 5: get_assets_list (type filter)", status: "warning", message: "Filter did not work as expected"});
				}
			}

			// --- Get assets list with search ---
			testResults.push({step: "Test 6: get_assets_list (search)", status: "running"});
			rv = $executeAPI(session, "Asset/get_assets_list", {
				community_id: testCommunityId,
				search_text: "SN-001",
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 6: get_assets_list (search)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.assets.find(a => a.asset_id === testAssetId);
				if (found)
				{
					testResults.push({step: "Test 6: get_assets_list (search)", status: "passed", found: true});
				}
				else
				{
					testResults.push({step: "Test 6: get_assets_list (search)", status: "warning", message: "Search did not find expected asset"});
				}
			}

			// --- Get assets list with sort ---
			testResults.push({step: "Test 7: get_assets_list (sort desc)", status: "running"});
			rv = $executeAPI(session, "Asset/get_assets_list", {
				community_id: testCommunityId,
				sort_by: "created_on",
				sort_dir: "desc",
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 7: get_assets_list (sort desc)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 7: get_assets_list (sort desc)", status: "passed", num_of_items: rv.num_of_items});
			}

			// --- Update asset (partial - description only) ---
			testResults.push({step: "Test 8: update_asset (description only)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 8: update_asset (description only)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {
					asset_id: testAssetId,
					description: "Updated camera unit SN-001-R"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 8: update_asset (description only)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 8: update_asset (description only)", status: "passed"});
				}
			}

			// --- Get asset (verify update) ---
			testResults.push({step: "Test 9: get_asset (verify update)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 9: get_asset (verify update)", status: "failed", error: "Cannot verify - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_asset", {asset_id: testAssetId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 9: get_asset (verify update)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.asset.description === "Updated camera unit SN-001-R" && rv.asset.last_update !== null)
					{
						testResults.push({step: "Test 9: get_asset (verify update)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 9: get_asset (verify update)", status: "warning", verified: false, message: "Description not updated or last_update not set"});
					}
				}
			}

			// --- Update asset (shape to circle - verify acres recalculation) ---
			testResults.push({step: "Test 10: update_asset (circle shape, verify acres)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 10: update_asset (circle shape, verify acres)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {
					asset_id: testAssetId,
					shape: "circle",
					location: JSON.stringify({lat: 25.276, lng: 55.296, radius: 100})
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 10: update_asset (circle shape, verify acres)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_asset", {asset_id: testAssetId});
					if (!$Err.isERR(rv) && rv.asset.shape === "circle" && rv.asset.acres > 0)
					{
						testResults.push({step: "Test 10: update_asset (circle shape, verify acres)", status: "passed", acres: rv.asset.acres});
					}
					else
					{
						testResults.push({step: "Test 10: update_asset (circle shape, verify acres)", status: "warning", message: "Acres not recalculated after shape change"});
					}
				}
			}

			// --- Update asset (dates) ---
			testResults.push({step: "Test 11: update_asset (dates)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 11: update_asset (dates)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {
					asset_id: testAssetId,
					installation_date: "2025-06-01",
					replacement_date: "2030-06-01"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 11: update_asset (dates)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_asset", {asset_id: testAssetId});
					if (!$Err.isERR(rv) && rv.asset.installation_date === "2025-06-01" && rv.asset.replacement_date === "2030-06-01")
					{
						testResults.push({step: "Test 11: update_asset (dates)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 11: update_asset (dates)", status: "warning", verified: false, message: "Dates not updated correctly"});
					}
				}
			}

			// --- Update asset (clear description with empty string) ---
			testResults.push({step: "Test 12: update_asset (clear description)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 12: update_asset (clear description)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {
					asset_id: testAssetId,
					description: ""
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 12: update_asset (clear description)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_asset", {asset_id: testAssetId});
					if (!$Err.isERR(rv) && (rv.asset.description === null || rv.asset.description === ""))
					{
						testResults.push({step: "Test 12: update_asset (clear description)", status: "passed", cleared: true});
					}
					else
					{
						testResults.push({step: "Test 12: update_asset (clear description)", status: "warning", message: "Description not cleared to null"});
					}
				}
			}

			// --- Create asset (circle shape, verify acres calculated) ---
			testResults.push({step: "Test 13: create_asset (circle, verify acres)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				shape: "circle",
				location: JSON.stringify({lat: 25.277, lng: 55.297, radius: 50})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 13: create_asset (circle, verify acres)", status: "failed", error: rv.message});
			}
			else
			{
				let circleAssetId = rv.asset_id;
				rv = $executeAPI(session, "Asset/get_asset", {asset_id: circleAssetId});
				if (!$Err.isERR(rv) && rv.asset.acres > 0)
				{
					testResults.push({step: "Test 13: create_asset (circle, verify acres)", status: "passed", acres: rv.asset.acres, asset_id: circleAssetId});
				}
				else
				{
					testResults.push({step: "Test 13: create_asset (circle, verify acres)", status: "warning", message: "Acres not calculated for circle asset"});
				}
				// Cleanup
				$executeAPI(session, "Asset/delete_asset", {asset_id: circleAssetId});
			}

			// --- Create asset (line shape, verify acres=0) ---
			testResults.push({step: "Test 14: create_asset (line, verify acres=0)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				shape: "line",
				location: JSON.stringify({points: [{lat: 25.276, lng: 55.296}, {lat: 25.277, lng: 55.297}]})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 14: create_asset (line, verify acres=0)", status: "failed", error: rv.message});
			}
			else
			{
				let lineAssetId = rv.asset_id;
				rv = $executeAPI(session, "Asset/get_asset", {asset_id: lineAssetId});
				if (!$Err.isERR(rv) && rv.asset.acres === 0)
				{
					testResults.push({step: "Test 14: create_asset (line, verify acres=0)", status: "passed", acres: rv.asset.acres});
				}
				else
				{
					testResults.push({step: "Test 14: create_asset (line, verify acres=0)", status: "warning", message: "Line asset acres should be 0"});
				}
				// Cleanup
				$executeAPI(session, "Asset/delete_asset", {asset_id: lineAssetId});
			}

			// =================================================================
			// Batch Asset Creation
			// =================================================================

			testResults.push({step: "Test 15: create_assets_batch", status: "running"});
			rv = $executeAPI(session, "Asset/create_assets_batch", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				shape: "place",
				locations: [
					{lat: 25.278, lng: 55.298},
					{lat: 25.279, lng: 55.299},
					{lat: 25.280, lng: 55.300}
				],
				description: "Batch camera",
				installation_date: "2026-03-01",
				replacement_date: "2031-03-01"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 15: create_assets_batch", status: "failed", error: rv.message});
			}
			else
			{
				testBatchAssetIds = rv.asset_ids;
				if (testBatchAssetIds.length === 3)
				{
					testResults.push({step: "Test 15: create_assets_batch", status: "passed", asset_ids: testBatchAssetIds});
				}
				else
				{
					testResults.push({step: "Test 15: create_assets_batch", status: "warning", message: "Expected 3 asset IDs", count: testBatchAssetIds.length});
				}
			}

			// --- Verify batch assets appear in list ---
			testResults.push({step: "Test 16: get_assets_list (verify batch)", status: "running"});
			if (testBatchAssetIds === null)
			{
				testResults.push({step: "Test 16: get_assets_list (verify batch)", status: "failed", error: "Cannot verify - batch was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_assets_list", {community_id: testCommunityId, page: 0});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 16: get_assets_list (verify batch)", status: "failed", error: rv.message});
				}
				else
				{
					let foundCount = testBatchAssetIds.filter(id => rv.assets.find(a => a.asset_id === id)).length;
					if (foundCount === testBatchAssetIds.length)
					{
						testResults.push({step: "Test 16: get_assets_list (verify batch)", status: "passed", found_all: true});
					}
					else
					{
						testResults.push({step: "Test 16: get_assets_list (verify batch)", status: "warning", message: "Not all batch assets found in list", expected: testBatchAssetIds.length, found: foundCount});
					}
				}
			}

			// --- Batch: empty locations (expect rc 760) ---
			testResults.push({step: "Test 17: create_assets_batch (empty locations)", status: "running"});
			rv = $executeAPI(session, "Asset/create_assets_batch", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				locations: []
			});
			if (rv.rc === 760)
			{
				testResults.push({step: "Test 17: create_assets_batch (empty locations)", status: "passed", message: "correctly rejected empty batch with rc 760"});
			}
			else
			{
				testResults.push({step: "Test 17: create_assets_batch (empty locations)", status: "warning", message: "expected rc 760", rc: rv.rc});
			}

			// =================================================================
			// Asset Negative Tests
			// =================================================================

			// --- Create asset with invalid type ---
			testResults.push({step: "Test 18: create_asset (invalid type)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: testCommunityId,
				asset_type: "nonexistent_type_xyz",
				shape: "place",
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if (rv.rc === 751)
			{
				testResults.push({step: "Test 18: create_asset (invalid type)", status: "passed", message: "correctly rejected invalid type with rc 751"});
			}
			else
			{
				testResults.push({step: "Test 18: create_asset (invalid type)", status: "warning", message: "expected rc 751", rc: rv.rc});
			}

			// --- Create asset with invalid shape ---
			testResults.push({step: "Test 19: create_asset (invalid shape)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				shape: "hexagon",
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if (rv.rc === 755)
			{
				testResults.push({step: "Test 19: create_asset (invalid shape)", status: "passed", message: "correctly rejected invalid shape with rc 755"});
			}
			else
			{
				testResults.push({step: "Test 19: create_asset (invalid shape)", status: "warning", message: "expected rc 755", rc: rv.rc});
			}

			// --- Create asset with invalid date ---
			testResults.push({step: "Test 20: create_asset (invalid date)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: testCommunityId,
				asset_type: testAssetTypeId,
				shape: "place",
				location: JSON.stringify({lat: 25.276, lng: 55.296}),
				installation_date: "not-a-date"
			});
			if (rv.rc === 763)
			{
				testResults.push({step: "Test 20: create_asset (invalid date)", status: "passed", message: "correctly rejected invalid date with rc 763"});
			}
			else
			{
				testResults.push({step: "Test 20: create_asset (invalid date)", status: "warning", message: "expected rc 763", rc: rv.rc});
			}

			// --- Create asset with invalid community ---
			testResults.push({step: "Test 21: create_asset (invalid community)", status: "running"});
			rv = $executeAPI(session, "Asset/create_asset", {
				community_id: 999999999,
				asset_type: testAssetTypeId,
				shape: "place",
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if (rv.rc === 500)
			{
				testResults.push({step: "Test 21: create_asset (invalid community)", status: "passed", message: "correctly rejected invalid community with rc 500"});
			}
			else
			{
				testResults.push({step: "Test 21: create_asset (invalid community)", status: "warning", message: "expected rc 500", rc: rv.rc});
			}

			// --- Get asset with invalid ID ---
			testResults.push({step: "Test 22: get_asset (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/get_asset", {asset_id: 999999999});
			if (rv.rc === 750)
			{
				testResults.push({step: "Test 22: get_asset (invalid ID)", status: "passed", message: "correctly returned not found with rc 750"});
			}
			else
			{
				testResults.push({step: "Test 22: get_asset (invalid ID)", status: "warning", message: "expected rc 750", rc: rv.rc});
			}

			// --- Update asset with invalid ID ---
			testResults.push({step: "Test 23: update_asset (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/update_asset", {asset_id: 999999999, description: "Should fail"});
			if (rv.rc === 750)
			{
				testResults.push({step: "Test 23: update_asset (invalid ID)", status: "passed", message: "correctly rejected invalid ID with rc 750"});
			}
			else
			{
				testResults.push({step: "Test 23: update_asset (invalid ID)", status: "warning", message: "expected rc 750", rc: rv.rc});
			}

			// --- Update asset with invalid type ---
			testResults.push({step: "Test 24: update_asset (invalid type)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 24: update_asset (invalid type)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {asset_id: testAssetId, asset_type: "nonexistent_type_xyz"});
				if (rv.rc === 751)
				{
					testResults.push({step: "Test 24: update_asset (invalid type)", status: "passed", message: "correctly rejected invalid type with rc 751"});
				}
				else
				{
					testResults.push({step: "Test 24: update_asset (invalid type)", status: "warning", message: "expected rc 751", rc: rv.rc});
				}
			}

			// --- Update asset with invalid date ---
			testResults.push({step: "Test 25: update_asset (invalid date)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 25: update_asset (invalid date)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {asset_id: testAssetId, replacement_date: "invalid-date"});
				if (rv.rc === 763)
				{
					testResults.push({step: "Test 25: update_asset (invalid date)", status: "passed", message: "correctly rejected invalid date with rc 763"});
				}
				else
				{
					testResults.push({step: "Test 25: update_asset (invalid date)", status: "warning", message: "expected rc 763", rc: rv.rc});
				}
			}

			// --- Get assets list with invalid type filter ---
			testResults.push({step: "Test 26: get_assets_list (invalid type filter)", status: "running"});
			rv = $executeAPI(session, "Asset/get_assets_list", {
				community_id: testCommunityId,
				asset_type: "nonexistent_type_xyz",
				page: 0
			});
			if (rv.rc === 751)
			{
				testResults.push({step: "Test 26: get_assets_list (invalid type filter)", status: "passed", message: "correctly rejected invalid type filter with rc 751"});
			}
			else
			{
				testResults.push({step: "Test 26: get_assets_list (invalid type filter)", status: "warning", message: "expected rc 751", rc: rv.rc});
			}

			// --- Update asset with no changes (should succeed with noop) ---
			testResults.push({step: "Test 27: update_asset (no changes)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 27: update_asset (no changes)", status: "failed", error: "Cannot update - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_asset", {asset_id: testAssetId});
				if (rv.rc === 0)
				{
					testResults.push({step: "Test 27: update_asset (no changes)", status: "passed", message: "noop update succeeded"});
				}
				else
				{
					testResults.push({step: "Test 27: update_asset (no changes)", status: "warning", message: "expected rc 0 for noop", rc: rv.rc});
				}
			}

			// =================================================================
			// Post CRUD
			// =================================================================

			let testPostName = `Test Post ${uniqueId}`;

			// --- Create post (all parameters) ---
			testResults.push({step: "Test 28: create_post (all params)", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: testPostName,
				description: "Main entrance guard station",
				priority: "urgent",
				shape: "place",
				location: JSON.stringify({lat: 25.276, lng: 55.296}),
				equipment: "Radio, Body Camera, Flashlight",
				permissions: JSON.stringify({required_roles: ["Supervisor"], required_badges: ["Armed"], required_equipment: ["Radio"]}),
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 28: create_post (all params)", status: "failed", error: rv.message});
			}
			else
			{
				testPostId = rv.post_id;
				testResults.push({step: "Test 28: create_post (all params)", status: "passed", post_id: testPostId});
			}

			// --- Get post (verify create) ---
			testResults.push({step: "Test 29: get_post (verify create)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 29: get_post (verify create)", status: "failed", error: "Cannot verify - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_post", {post_id: testPostId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 29: get_post (verify create)", status: "failed", error: rv.message});
				}
				else
				{
					let p = rv.post;
					let verified = p.post_id === testPostId &&
								   p.name === testPostName &&
								   p.description === "Main entrance guard station" &&
								   p.priority === "urgent" &&
								   p.shape === "place" &&
								   p.equipment === "Radio, Body Camera, Flashlight" &&
								   p.is_active === true &&
								   p.permissions !== null &&
								   p.permissions.required_roles &&
								   p.permissions.required_roles.length === 1;
					if (verified)
					{
						testResults.push({step: "Test 29: get_post (verify create)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 29: get_post (verify create)", status: "warning", verified: false, message: "Some post fields not saved correctly"});
					}
				}
			}

			// --- Get posts list ---
			testResults.push({step: "Test 30: get_posts_list", status: "running"});
			rv = $executeAPI(session, "Asset/get_posts_list", {
				community_id: testCommunityId,
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 30: get_posts_list", status: "failed", error: rv.message});
			}
			else
			{
				let found = testPostId !== null ? rv.posts.find(p => p.post_id === testPostId) : null;
				if (found && rv.num_of_items >= 1)
				{
					testResults.push({step: "Test 30: get_posts_list", status: "passed", num_of_items: rv.num_of_items, num_of_pages: rv.num_of_pages});
				}
				else
				{
					testResults.push({step: "Test 30: get_posts_list", status: "warning", message: "Created post not found in list"});
				}
			}

			// --- Get posts list with search ---
			testResults.push({step: "Test 31: get_posts_list (search)", status: "running"});
			rv = $executeAPI(session, "Asset/get_posts_list", {
				community_id: testCommunityId,
				search_text: uniqueId,
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 31: get_posts_list (search)", status: "failed", error: rv.message});
			}
			else
			{
				let found = testPostId !== null ? rv.posts.find(p => p.post_id === testPostId) : null;
				if (found)
				{
					testResults.push({step: "Test 31: get_posts_list (search)", status: "passed", found: true});
				}
				else
				{
					testResults.push({step: "Test 31: get_posts_list (search)", status: "warning", message: "Search did not find expected post"});
				}
			}

			// --- Get posts list sort by priority desc ---
			testResults.push({step: "Test 32: get_posts_list (sort priority desc)", status: "running"});
			rv = $executeAPI(session, "Asset/get_posts_list", {
				community_id: testCommunityId,
				sort_by: "priority",
				sort_dir: "desc",
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 32: get_posts_list (sort priority desc)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 32: get_posts_list (sort priority desc)", status: "passed", num_of_items: rv.num_of_items});
			}

			// --- Update post (partial - name and priority) ---
			let updatedPostName = `Updated Post ${uniqueId}`;
			testResults.push({step: "Test 33: update_post (name + priority)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 33: update_post (name + priority)", status: "failed", error: "Cannot update - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_post", {
					post_id: testPostId,
					name: updatedPostName,
					priority: "low"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 33: update_post (name + priority)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_post", {post_id: testPostId});
					if (!$Err.isERR(rv) && rv.post.name === updatedPostName && rv.post.priority === "low")
					{
						testResults.push({step: "Test 33: update_post (name + priority)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 33: update_post (name + priority)", status: "warning", verified: false, message: "Update not reflected"});
					}
				}
			}

			// --- Update post (deactivate) ---
			testResults.push({step: "Test 34: update_post (deactivate)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 34: update_post (deactivate)", status: "failed", error: "Cannot update - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_post", {post_id: testPostId, is_active: false});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 34: update_post (deactivate)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_post", {post_id: testPostId});
					if (!$Err.isERR(rv) && rv.post.is_active === false)
					{
						testResults.push({step: "Test 34: update_post (deactivate)", status: "passed", is_active: false});
					}
					else
					{
						testResults.push({step: "Test 34: update_post (deactivate)", status: "warning", message: "is_active not toggled to false"});
					}
				}
			}

			// --- Get posts list (exclude inactive - should not find deactivated post) ---
			testResults.push({step: "Test 35: get_posts_list (exclude inactive)", status: "running"});
			rv = $executeAPI(session, "Asset/get_posts_list", {
				community_id: testCommunityId,
				include_inactive: false,
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 35: get_posts_list (exclude inactive)", status: "failed", error: rv.message});
			}
			else
			{
				let found = testPostId !== null ? rv.posts.find(p => p.post_id === testPostId) : null;
				if (!found)
				{
					testResults.push({step: "Test 35: get_posts_list (exclude inactive)", status: "passed", message: "inactive post correctly excluded"});
				}
				else
				{
					testResults.push({step: "Test 35: get_posts_list (exclude inactive)", status: "warning", message: "inactive post still appears in active list"});
				}
			}

			// --- Get posts list (include inactive - should find deactivated post) ---
			testResults.push({step: "Test 36: get_posts_list (include inactive)", status: "running"});
			rv = $executeAPI(session, "Asset/get_posts_list", {
				community_id: testCommunityId,
				include_inactive: true,
				page: 0
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 36: get_posts_list (include inactive)", status: "failed", error: rv.message});
			}
			else
			{
				let found = testPostId !== null ? rv.posts.find(p => p.post_id === testPostId) : null;
				if (found)
				{
					testResults.push({step: "Test 36: get_posts_list (include inactive)", status: "passed", message: "inactive post visible with include_inactive"});
				}
				else
				{
					testResults.push({step: "Test 36: get_posts_list (include inactive)", status: "warning", message: "inactive post not found even with include_inactive"});
				}
			}

			// --- Reactivate post ---
			testResults.push({step: "Test 37: update_post (reactivate)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 37: update_post (reactivate)", status: "failed", error: "Cannot update - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_post", {post_id: testPostId, is_active: true});
				if (!$Err.isERR(rv))
				{
					rv = $executeAPI(session, "Asset/get_post", {post_id: testPostId});
					if (!$Err.isERR(rv) && rv.post.is_active === true)
					{
						testResults.push({step: "Test 37: update_post (reactivate)", status: "passed", toggled: true});
					}
					else
					{
						testResults.push({step: "Test 37: update_post (reactivate)", status: "warning", message: "is_active not toggled back to true"});
					}
				}
				else
				{
					testResults.push({step: "Test 37: update_post (reactivate)", status: "failed", error: rv.message});
				}
			}

			// --- Update post permissions ---
			testResults.push({step: "Test 38: update_post (permissions)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 38: update_post (permissions)", status: "failed", error: "Cannot update - post was not created"});
			}
			else
			{
				let newPerms = {required_roles: ["Patrol", "Supervisor"], required_badges: ["First Aid"], required_equipment: ["Radio", "Body Camera"]};
				rv = $executeAPI(session, "Asset/update_post", {
					post_id: testPostId,
					permissions: JSON.stringify(newPerms)
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 38: update_post (permissions)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_post", {post_id: testPostId});
					if (!$Err.isERR(rv) && rv.post.permissions &&
						rv.post.permissions.required_roles.length === 2 &&
						rv.post.permissions.required_badges.length === 1 &&
						rv.post.permissions.required_equipment.length === 2)
					{
						testResults.push({step: "Test 38: update_post (permissions)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 38: update_post (permissions)", status: "warning", verified: false, message: "Permissions not updated correctly"});
					}
				}
			}

			// =================================================================
			// Post Negative Tests
			// =================================================================

			// --- Create post with duplicate name ---
			testResults.push({step: "Test 39: create_post (duplicate name)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 39: create_post (duplicate name)", status: "failed", error: "Cannot test - original post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/create_post", {
					community_id: testCommunityId,
					name: updatedPostName,
					location: JSON.stringify({lat: 25.276, lng: 55.296})
				});
				if (rv.rc === 753)
				{
					testResults.push({step: "Test 39: create_post (duplicate name)", status: "passed", message: "correctly rejected duplicate name with rc 753"});
				}
				else
				{
					testResults.push({step: "Test 39: create_post (duplicate name)", status: "warning", message: "expected rc 753", rc: rv.rc});
				}
			}

			// --- Create post with invalid priority ---
			testResults.push({step: "Test 40: create_post (invalid priority)", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `Invalid Priority Post ${uniqueId}`,
				priority: "super_urgent",
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if (rv.rc === 756)
			{
				testResults.push({step: "Test 40: create_post (invalid priority)", status: "passed", message: "correctly rejected invalid priority with rc 756"});
			}
			else
			{
				testResults.push({step: "Test 40: create_post (invalid priority)", status: "warning", message: "expected rc 756", rc: rv.rc});
			}

			// --- Create post with invalid shape ---
			testResults.push({step: "Test 41: create_post (invalid shape)", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: `Invalid Shape Post ${uniqueId}`,
				shape: "triangle",
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if (rv.rc === 757)
			{
				testResults.push({step: "Test 41: create_post (invalid shape)", status: "passed", message: "correctly rejected invalid shape with rc 757"});
			}
			else
			{
				testResults.push({step: "Test 41: create_post (invalid shape)", status: "warning", message: "expected rc 757", rc: rv.rc});
			}

			// --- Create post with empty name ---
			testResults.push({step: "Test 42: create_post (empty name)", status: "running"});
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: "",
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 42: create_post (empty name)", status: "passed", message: "correctly rejected empty name"});
			}
			else
			{
				testResults.push({step: "Test 42: create_post (empty name)", status: "warning", message: "accepted empty name unexpectedly"});
				$executeAPI(session, "Asset/delete_post", {post_id: rv.post_id});
			}

			// --- Create post with name exceeding 60 chars ---
			testResults.push({step: "Test 43: create_post (name too long)", status: "running"});
			let longPostName = "A".repeat(61) + ` ${uniqueId}`;
			rv = $executeAPI(session, "Asset/create_post", {
				community_id: testCommunityId,
				name: longPostName,
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 43: create_post (name too long)", status: "passed", message: "correctly rejected name exceeding 60 chars"});
			}
			else
			{
				testResults.push({step: "Test 43: create_post (name too long)", status: "warning", message: "accepted name exceeding 60 chars unexpectedly"});
				$executeAPI(session, "Asset/delete_post", {post_id: rv.post_id});
			}

			// --- Get post with invalid ID ---
			testResults.push({step: "Test 44: get_post (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/get_post", {post_id: 999999999});
			if (rv.rc === 752)
			{
				testResults.push({step: "Test 44: get_post (invalid ID)", status: "passed", message: "correctly returned not found with rc 752"});
			}
			else
			{
				testResults.push({step: "Test 44: get_post (invalid ID)", status: "warning", message: "expected rc 752", rc: rv.rc});
			}

			// --- Update post with invalid ID ---
			testResults.push({step: "Test 45: update_post (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/update_post", {post_id: 999999999, name: "Should Fail"});
			if (rv.rc === 752)
			{
				testResults.push({step: "Test 45: update_post (invalid ID)", status: "passed", message: "correctly rejected invalid ID with rc 752"});
			}
			else
			{
				testResults.push({step: "Test 45: update_post (invalid ID)", status: "warning", message: "expected rc 752", rc: rv.rc});
			}

			// --- Update post with no changes (should succeed as noop) ---
			testResults.push({step: "Test 46: update_post (no changes)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 46: update_post (no changes)", status: "failed", error: "Cannot update - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_post", {post_id: testPostId});
				if (rv.rc === 0)
				{
					testResults.push({step: "Test 46: update_post (no changes)", status: "passed", message: "noop update succeeded"});
				}
				else
				{
					testResults.push({step: "Test 46: update_post (no changes)", status: "warning", message: "expected rc 0 for noop", rc: rv.rc});
				}
			}

			// =================================================================
			// Map Zone CRUD
			// =================================================================

			// --- Create map zone (entry_exit) ---
			testResults.push({step: "Test 47: create_map_zone (entry_exit)", status: "running"});
			rv = $executeAPI(session, "Asset/create_map_zone", {
				community_id: testCommunityId,
				zone_type: "entry_exit",
				name: `Main Gate ${uniqueId}`,
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 47: create_map_zone (entry_exit)", status: "failed", error: rv.message});
			}
			else
			{
				testZoneId = rv.zone_id;
				testResults.push({step: "Test 47: create_map_zone (entry_exit)", status: "passed", zone_id: testZoneId});
			}

			// --- Get map zones (verify create) ---
			testResults.push({step: "Test 48: get_map_zones (verify create)", status: "running"});
			rv = $executeAPI(session, "Asset/get_map_zones", {community_id: testCommunityId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 48: get_map_zones (verify create)", status: "failed", error: rv.message});
			}
			else
			{
				let found = testZoneId !== null ? rv.zones.find(z => z.zone_id === testZoneId) : null;
				if (found && found.zone_type === "entry_exit" && found.name === `Main Gate ${uniqueId}`)
				{
					testResults.push({step: "Test 48: get_map_zones (verify create)", status: "passed", verified: true, zones_count: rv.zones.length});
				}
				else
				{
					testResults.push({step: "Test 48: get_map_zones (verify create)", status: "warning", verified: false, message: "Created zone not found or fields mismatch"});
				}
			}

			// --- Get map zones with type filter ---
			testResults.push({step: "Test 49: get_map_zones (type filter)", status: "running"});
			rv = $executeAPI(session, "Asset/get_map_zones", {
				community_id: testCommunityId,
				zone_type: "entry_exit"
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 49: get_map_zones (type filter)", status: "failed", error: rv.message});
			}
			else
			{
				let allMatch = rv.zones.every(z => z.zone_type === "entry_exit");
				if (allMatch)
				{
					testResults.push({step: "Test 49: get_map_zones (type filter)", status: "passed", filtered_count: rv.zones.length});
				}
				else
				{
					testResults.push({step: "Test 49: get_map_zones (type filter)", status: "warning", message: "Filter did not work as expected"});
				}
			}

			// --- Create second zone (high_priority) ---
			testResults.push({step: "Test 50: create_map_zone (high_priority)", status: "running"});
			let secondZoneId = null;
			rv = $executeAPI(session, "Asset/create_map_zone", {
				community_id: testCommunityId,
				zone_type: "high_priority",
				name: `Priority Zone ${uniqueId}`,
				location: JSON.stringify({points: [{lat: 25.276, lng: 55.296}, {lat: 25.277, lng: 55.297}, {lat: 25.278, lng: 55.296}, {lat: 25.276, lng: 55.296}]})
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 50: create_map_zone (high_priority)", status: "failed", error: rv.message});
			}
			else
			{
				secondZoneId = rv.zone_id;
				testResults.push({step: "Test 50: create_map_zone (high_priority)", status: "passed", zone_id: secondZoneId});
			}

			// --- Update map zone ---
			testResults.push({step: "Test 51: update_map_zone", status: "running"});
			if (testZoneId === null)
			{
				testResults.push({step: "Test 51: update_map_zone", status: "failed", error: "Cannot update - zone was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_map_zone", {
					zone_id: testZoneId,
					name: `Updated Gate ${uniqueId}`,
					zone_type: "high_priority"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 51: update_map_zone", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "Asset/get_map_zones", {community_id: testCommunityId});
					if (!$Err.isERR(rv))
					{
						let found = rv.zones.find(z => z.zone_id === testZoneId);
						if (found && found.name === `Updated Gate ${uniqueId}` && found.zone_type === "high_priority")
						{
							testResults.push({step: "Test 51: update_map_zone", status: "passed", verified: true});
						}
						else
						{
							testResults.push({step: "Test 51: update_map_zone", status: "warning", verified: false, message: "Update not reflected"});
						}
					}
					else
					{
						testResults.push({step: "Test 51: update_map_zone", status: "failed", error: rv.message});
					}
				}
			}

			// --- Update map zone location ---
			testResults.push({step: "Test 52: update_map_zone (location)", status: "running"});
			if (testZoneId === null)
			{
				testResults.push({step: "Test 52: update_map_zone (location)", status: "failed", error: "Cannot update - zone was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_map_zone", {
					zone_id: testZoneId,
					location: JSON.stringify({lat: 25.280, lng: 55.300})
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 52: update_map_zone (location)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 52: update_map_zone (location)", status: "passed"});
				}
			}

			// --- Update map zone with no changes (noop) ---
			testResults.push({step: "Test 53: update_map_zone (no changes)", status: "running"});
			if (testZoneId === null)
			{
				testResults.push({step: "Test 53: update_map_zone (no changes)", status: "failed", error: "Cannot update - zone was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_map_zone", {zone_id: testZoneId});
				if (rv.rc === 0)
				{
					testResults.push({step: "Test 53: update_map_zone (no changes)", status: "passed", message: "noop update succeeded"});
				}
				else
				{
					testResults.push({step: "Test 53: update_map_zone (no changes)", status: "warning", message: "expected rc 0 for noop", rc: rv.rc});
				}
			}

			// =================================================================
			// Map Zone Negative Tests
			// =================================================================

			// --- Create map zone with invalid type ---
			testResults.push({step: "Test 54: create_map_zone (invalid type)", status: "running"});
			rv = $executeAPI(session, "Asset/create_map_zone", {
				community_id: testCommunityId,
				zone_type: "nonexistent_zone_type",
				name: `Bad Zone ${uniqueId}`,
				location: JSON.stringify({lat: 25.276, lng: 55.296})
			});
			if (rv.rc === 758)
			{
				testResults.push({step: "Test 54: create_map_zone (invalid type)", status: "passed", message: "correctly rejected invalid zone type with rc 758"});
			}
			else
			{
				testResults.push({step: "Test 54: create_map_zone (invalid type)", status: "warning", message: "expected rc 758", rc: rv.rc});
			}

			// --- Get map zones with invalid type filter ---
			testResults.push({step: "Test 55: get_map_zones (invalid type filter)", status: "running"});
			rv = $executeAPI(session, "Asset/get_map_zones", {
				community_id: testCommunityId,
				zone_type: "nonexistent_zone_type"
			});
			if (rv.rc === 758)
			{
				testResults.push({step: "Test 55: get_map_zones (invalid type filter)", status: "passed", message: "correctly rejected invalid type filter with rc 758"});
			}
			else
			{
				testResults.push({step: "Test 55: get_map_zones (invalid type filter)", status: "warning", message: "expected rc 758", rc: rv.rc});
			}

			// --- Update map zone with invalid ID ---
			testResults.push({step: "Test 56: update_map_zone (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/update_map_zone", {zone_id: 999999999, name: "Should Fail"});
			if (rv.rc === 754)
			{
				testResults.push({step: "Test 56: update_map_zone (invalid ID)", status: "passed", message: "correctly rejected invalid ID with rc 754"});
			}
			else
			{
				testResults.push({step: "Test 56: update_map_zone (invalid ID)", status: "warning", message: "expected rc 754", rc: rv.rc});
			}

			// --- Delete map zone with invalid ID ---
			testResults.push({step: "Test 57: delete_map_zone (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/delete_map_zone", {zone_id: 999999999});
			if (rv.rc === 754)
			{
				testResults.push({step: "Test 57: delete_map_zone (invalid ID)", status: "passed", message: "correctly returned not found with rc 754"});
			}
			else
			{
				testResults.push({step: "Test 57: delete_map_zone (invalid ID)", status: "warning", message: "expected rc 754", rc: rv.rc});
			}

			// --- Update map zone with invalid type ---
			testResults.push({step: "Test 58: update_map_zone (invalid type)", status: "running"});
			if (testZoneId === null)
			{
				testResults.push({step: "Test 58: update_map_zone (invalid type)", status: "failed", error: "Cannot update - zone was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/update_map_zone", {zone_id: testZoneId, zone_type: "nonexistent_zone_type"});
				if (rv.rc === 758)
				{
					testResults.push({step: "Test 58: update_map_zone (invalid type)", status: "passed", message: "correctly rejected invalid type with rc 758"});
				}
				else
				{
					testResults.push({step: "Test 58: update_map_zone (invalid type)", status: "warning", message: "expected rc 758", rc: rv.rc});
				}
			}

			// =================================================================
			// Delete Asset (verify soft-delete)
			// =================================================================

			testResults.push({step: "Test 59: delete_asset", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 59: delete_asset", status: "failed", error: "Cannot delete - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/delete_asset", {asset_id: testAssetId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 59: delete_asset", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 59: delete_asset", status: "passed"});
				}
			}

			// --- Verify deleted asset is not found ---
			testResults.push({step: "Test 60: get_asset (verify deletion)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 60: get_asset (verify deletion)", status: "failed", error: "Cannot verify - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_asset", {asset_id: testAssetId});
				if (rv.rc === 750)
				{
					testResults.push({step: "Test 60: get_asset (verify deletion)", status: "passed", verified_deleted: true});
				}
				else
				{
					testResults.push({step: "Test 60: get_asset (verify deletion)", status: "warning", message: "Deleted asset still accessible"});
				}
			}

			// --- Verify deleted asset not in list ---
			testResults.push({step: "Test 61: get_assets_list (verify deletion)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 61: get_assets_list (verify deletion)", status: "failed", error: "Cannot verify - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_assets_list", {community_id: testCommunityId, page: 0});
				if (!$Err.isERR(rv))
				{
					let found = rv.assets.find(a => a.asset_id === testAssetId);
					if (!found)
					{
						testResults.push({step: "Test 61: get_assets_list (verify deletion)", status: "passed", verified_deleted: true});
					}
					else
					{
						testResults.push({step: "Test 61: get_assets_list (verify deletion)", status: "warning", message: "Deleted asset still in list"});
					}
				}
				else
				{
					testResults.push({step: "Test 61: get_assets_list (verify deletion)", status: "failed", error: rv.message});
				}
			}

			// --- Delete already-deleted asset (expect rc 750) ---
			testResults.push({step: "Test 62: delete_asset (already deleted)", status: "running"});
			if (testAssetId === null)
			{
				testResults.push({step: "Test 62: delete_asset (already deleted)", status: "failed", error: "Cannot test - asset was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/delete_asset", {asset_id: testAssetId});
				if (rv.rc === 750)
				{
					testResults.push({step: "Test 62: delete_asset (already deleted)", status: "passed", message: "correctly returned not found for already-deleted asset"});
				}
				else
				{
					testResults.push({step: "Test 62: delete_asset (already deleted)", status: "warning", message: "expected rc 750 for already-deleted asset", rc: rv.rc});
				}
			}

			// =================================================================
			// Delete Post
			// =================================================================

			testResults.push({step: "Test 63: delete_post", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 63: delete_post", status: "failed", error: "Cannot delete - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/delete_post", {post_id: testPostId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 63: delete_post", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 63: delete_post", status: "passed"});
				}
			}

			// --- Verify deleted post is not found ---
			testResults.push({step: "Test 64: get_post (verify deletion)", status: "running"});
			if (testPostId === null)
			{
				testResults.push({step: "Test 64: get_post (verify deletion)", status: "failed", error: "Cannot verify - post was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_post", {post_id: testPostId});
				if (rv.rc === 752)
				{
					testResults.push({step: "Test 64: get_post (verify deletion)", status: "passed", verified_deleted: true});
				}
				else
				{
					testResults.push({step: "Test 64: get_post (verify deletion)", status: "warning", message: "Deleted post still accessible"});
				}
			}

			// --- Delete post with invalid ID ---
			testResults.push({step: "Test 65: delete_post (invalid ID)", status: "running"});
			rv = $executeAPI(session, "Asset/delete_post", {post_id: 999999999});
			if (rv.rc === 752)
			{
				testResults.push({step: "Test 65: delete_post (invalid ID)", status: "passed", message: "correctly returned not found with rc 752"});
			}
			else
			{
				testResults.push({step: "Test 65: delete_post (invalid ID)", status: "warning", message: "expected rc 752", rc: rv.rc});
			}

			// =================================================================
			// Delete Map Zones
			// =================================================================

			testResults.push({step: "Test 66: delete_map_zone", status: "running"});
			if (testZoneId === null)
			{
				testResults.push({step: "Test 66: delete_map_zone", status: "failed", error: "Cannot delete - zone was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/delete_map_zone", {zone_id: testZoneId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 66: delete_map_zone", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 66: delete_map_zone", status: "passed"});
				}
			}

			// --- Verify deleted zone not in list ---
			testResults.push({step: "Test 67: get_map_zones (verify deletion)", status: "running"});
			if (testZoneId === null)
			{
				testResults.push({step: "Test 67: get_map_zones (verify deletion)", status: "failed", error: "Cannot verify - zone was not created"});
			}
			else
			{
				rv = $executeAPI(session, "Asset/get_map_zones", {community_id: testCommunityId});
				if (!$Err.isERR(rv))
				{
					let found = rv.zones.find(z => z.zone_id === testZoneId);
					if (!found)
					{
						testResults.push({step: "Test 67: get_map_zones (verify deletion)", status: "passed", verified_deleted: true});
					}
					else
					{
						testResults.push({step: "Test 67: get_map_zones (verify deletion)", status: "warning", message: "Deleted zone still in list"});
					}
				}
				else
				{
					testResults.push({step: "Test 67: get_map_zones (verify deletion)", status: "failed", error: rv.message});
				}
			}

			// --- Delete second zone ---
			if (secondZoneId !== null)
			{
				$executeAPI(session, "Asset/delete_map_zone", {zone_id: secondZoneId});
			}

			// =================================================================
			// Cleanup: delete batch assets, asset type, community
			// =================================================================

			testResults.push({step: "Cleanup: delete batch assets", status: "running"});
			if (testBatchAssetIds !== null)
			{
				let deletedCount = 0;
				for (let i = 0; i < testBatchAssetIds.length; i++)
				{
					let delRv = $executeAPI(session, "Asset/delete_asset", {asset_id: testBatchAssetIds[i]});
					if (!$Err.isERR(delRv)) deletedCount++;
				}
				testResults.push({step: "Cleanup: delete batch assets", status: "passed", deleted: deletedCount});
			}
			else
			{
				testResults.push({step: "Cleanup: delete batch assets", status: "passed", message: "no batch assets to clean up"});
			}

			testResults.push({step: "Cleanup: delete test asset type", status: "running"});
			if (testAssetTypeId !== null)
			{
				let delRv = $executeAPI(session, "Settings/delete_asset_type", {type_id: testAssetTypeId});
				if (!$Err.isERR(delRv))
				{
					testResults.push({step: "Cleanup: delete test asset type", status: "passed"});
				}
				else
				{
					testResults.push({step: "Cleanup: delete test asset type", status: "warning", error: delRv.message});
				}
			}
			else
			{
				testResults.push({step: "Cleanup: delete test asset type", status: "passed", message: "no asset type to clean up"});
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
