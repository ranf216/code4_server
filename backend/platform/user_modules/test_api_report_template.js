module.exports =
{
	test_report_template_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId1 = null;
		let testCommunityId2 = null;
		let testTemplateId = null;
		let testDuplicateId = null;

		try
		{
			testResults.push({step: "Starting Report Template API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);

			// =================================================================
			// Setup: create two test communities for scoping tests
			// =================================================================

			testResults.push({step: "Setup: create test community 1", status: "running"});
			let rv = $executeAPI(session, "Community/add_community", {
				name: `RT Test Comm A ${uniqueId}`,
				area: "Test Area A",
				latitude: 25.276987,
				longitude: 55.296249,
				location_name: "Test Location A",
				timezone: "Asia/Dubai",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test community 1", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testCommunityId1 = rv.community_id;
			testResults.push({step: "Setup: create test community 1", status: "passed", community_id: testCommunityId1});

			testResults.push({step: "Setup: create test community 2", status: "running"});
			rv = $executeAPI(session, "Community/add_community", {
				name: `RT Test Comm B ${uniqueId}`,
				area: "Test Area B",
				latitude: 25.286987,
				longitude: 55.306249,
				location_name: "Test Location B",
				timezone: "Asia/Dubai",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Setup: create test community 2", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testCommunityId2 = rv.community_id;
			testResults.push({step: "Setup: create test community 2", status: "passed", community_id: testCommunityId2});

			// =================================================================
			// Test 1: create_template (community-scoped, all parameters)
			// =================================================================

			let testTemplateName = `Test Report Template ${uniqueId}`;
			testResults.push({step: "Test 1: create_template (all parameters)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: testTemplateName,
				category: "incident",
				community_ids: [testCommunityId1, testCommunityId2],
				title_format: "Incident Report - {community} - {date}",
				review_before_client: true,
				allow_officer_editing: false,
				sections: [
					{
						title: "Incident Details",
						is_enabled: true,
						is_required: true,
						client_visible: true,
						fields: [
							{field_key: "incident_date", label: "Incident Date", field_type: "date", is_system_field: true, is_required: true},
							{field_key: "incident_location", label: "Incident Location", field_type: "location", is_system_field: true, is_required: true},
							{field_key: "incident_description", label: "Description", description: "Describe what happened", field_type: "text", config: {max_chars: 5000}, is_system_field: true, is_required: true}
						]
					},
					{
						title: "Vehicle Information",
						is_enabled: true,
						is_required: true,
						client_visible: true,
						fields: [
							{field_key: "custom_vehicle_plate", label: "Vehicle Plate", field_type: "text", config: {max_chars: 20}, is_system_field: false, is_required: true},
							{field_key: "custom_vehicle_plate_2", label: "Secondary Vehicle Plate", field_type: "text", config: {max_chars: 20}, is_system_field: false, is_required: false}
						]
					},
					{
						title: "Evidence",
						is_enabled: true,
						is_required: false,
						client_visible: false,
						fields: [
							{field_key: "media", label: "Photos/Videos", field_type: "file_upload", config: {max_files: 10}, is_system_field: true, is_required: false},
							{field_key: "custom_witness_sig", label: "Witness Signature", field_type: "digital_signature", is_system_field: false, is_required: false}
						]
					}
				]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 1: create_template (all parameters)", status: "failed", error: rv.message});
				vals.test_results = testResults;
				vals.summary = {
					total: testResults.filter(r => r.status === "running").length,
					passed: testResults.filter(r => r.status === "passed").length,
					failed: testResults.filter(r => r.status === "failed").length,
					warnings: testResults.filter(r => r.status === "warning").length
				};
				return {...rc, ...vals};
			}
			testTemplateId = rv.template_id;
			testResults.push({step: "Test 1: create_template (all parameters)", status: "passed", template_id: testTemplateId});

			// =================================================================
			// Test 2: get_template (verify creation)
			// =================================================================

			testResults.push({step: "Test 2: get_template (verify creation)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 2: get_template (verify creation)", status: "failed", error: rv.message});
			}
			else
			{
				let t = rv.template;
				let verified = t.name === testTemplateName &&
					t.category === "incident" &&
					t.status === "draft" &&
					t.title_format === "Incident Report - {community} - {date}" &&
					t.is_global === false &&
					t.review_before_client === true &&
					t.allow_officer_editing === false &&
					t.communities.length === 2 &&
					t.sections.length === 3 &&
					t.sections[0].fields.length === 3 &&
					t.sections[1].fields.length === 2 &&
					t.sections[2].fields.length === 2;
				if (verified)
				{
					testResults.push({step: "Test 2: get_template (verify creation)", status: "passed", verified: true, section_count: t.sections.length});
				}
				else
				{
					testResults.push({step: "Test 2: get_template (verify creation)", status: "warning", verified: false, message: "Some template fields not saved correctly"});
				}
			}

			// =================================================================
			// Test 3: get_template (verify field-level details)
			// =================================================================

			testResults.push({step: "Test 3: get_template (verify field details)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 3: get_template (verify field details)", status: "failed", error: rv.message});
			}
			else
			{
				let sec1 = rv.template.sections[0];
				let sec2 = rv.template.sections[1];
				let sec3 = rv.template.sections[2];
				let verifiedFields =
					sec1.title === "Incident Details" &&
					sec1.is_required === true &&
					sec1.client_visible === true &&
					sec1.fields[0].field_key === "incident_date" &&
					sec1.fields[0].is_system_field === true &&
					sec1.fields[0].is_required === true &&
					sec2.fields[1].label === "Secondary Vehicle Plate" &&
					sec2.fields[1].is_required === false &&
					sec3.is_required === false &&
					sec3.client_visible === false &&
					sec3.fields[0].field_type === "file_upload" &&
					sec3.fields[1].field_type === "digital_signature";
				if (verifiedFields)
				{
					testResults.push({step: "Test 3: get_template (verify field details)", status: "passed", verified: true});
				}
				else
				{
					testResults.push({step: "Test 3: get_template (verify field details)", status: "warning", verified: false, message: "Field-level details do not match"});
				}
			}

			// =================================================================
			// Test 4: get_templates_list (verify created template in list)
			// =================================================================

			testResults.push({step: "Test 4: get_templates_list (verify in list)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 4: get_templates_list (verify in list)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.templates.find(t => t.template_id === testTemplateId);
				if (found && found.name === testTemplateName && found.section_count === 3)
				{
					testResults.push({step: "Test 4: get_templates_list (verify in list)", status: "passed", num_of_items: rv.num_of_items, num_of_pages: rv.num_of_pages});
				}
				else
				{
					testResults.push({step: "Test 4: get_templates_list (verify in list)", status: "warning", message: "Created template not found in list or data mismatch"});
				}
			}

			// =================================================================
			// Test 5: get_templates_list (filter by status)
			// =================================================================

			testResults.push({step: "Test 5: get_templates_list (filter status=draft)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {status: "draft"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 5: get_templates_list (filter status=draft)", status: "failed", error: rv.message});
			}
			else
			{
				let allDraft = rv.templates.every(t => t.status === "draft");
				let found = rv.templates.find(t => t.template_id === testTemplateId);
				if (allDraft && found)
				{
					testResults.push({step: "Test 5: get_templates_list (filter status=draft)", status: "passed", count: rv.templates.length});
				}
				else
				{
					testResults.push({step: "Test 5: get_templates_list (filter status=draft)", status: "warning", message: "Filter not applied correctly"});
				}
			}

			// =================================================================
			// Test 6: get_templates_list (filter by community)
			// =================================================================

			testResults.push({step: "Test 6: get_templates_list (filter community)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {community_id: testCommunityId1});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 6: get_templates_list (filter community)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.templates.find(t => t.template_id === testTemplateId);
				if (found)
				{
					testResults.push({step: "Test 6: get_templates_list (filter community)", status: "passed", count: rv.templates.length});
				}
				else
				{
					testResults.push({step: "Test 6: get_templates_list (filter community)", status: "warning", message: "Template not found when filtering by assigned community"});
				}
			}

			// =================================================================
			// Test 7: get_templates_list (filter by category)
			// =================================================================

			testResults.push({step: "Test 7: get_templates_list (filter category=incident)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {category: "incident"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 7: get_templates_list (filter category=incident)", status: "failed", error: rv.message});
			}
			else
			{
				let allIncident = rv.templates.every(t => t.category === "incident");
				if (allIncident)
				{
					testResults.push({step: "Test 7: get_templates_list (filter category=incident)", status: "passed", count: rv.templates.length});
				}
				else
				{
					testResults.push({step: "Test 7: get_templates_list (filter category=incident)", status: "warning", message: "Category filter not applied correctly"});
				}
			}

			// =================================================================
			// Test 8: get_templates_list (search_text)
			// =================================================================

			testResults.push({step: "Test 8: get_templates_list (search_text)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {search_text: uniqueId});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 8: get_templates_list (search_text)", status: "failed", error: rv.message});
			}
			else
			{
				let found = rv.templates.find(t => t.template_id === testTemplateId);
				if (found)
				{
					testResults.push({step: "Test 8: get_templates_list (search_text)", status: "passed", count: rv.templates.length});
				}
				else
				{
					testResults.push({step: "Test 8: get_templates_list (search_text)", status: "warning", message: "Template not found via search_text"});
				}
			}

			// =================================================================
			// Test 9: get_templates_list (sort_by, sort_dir)
			// =================================================================

			testResults.push({step: "Test 9: get_templates_list (sort_by=name, sort_dir=desc)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {sort_by: "name", sort_dir: "desc"});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 9: get_templates_list (sort_by=name, sort_dir=desc)", status: "failed", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 9: get_templates_list (sort_by=name, sort_dir=desc)", status: "passed", count: rv.templates.length});
			}

			// =================================================================
			// Test 10: get_templates_list (pagination page out of range)
			// =================================================================

			testResults.push({step: "Test 10: get_templates_list (page out of range)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {page: 9999});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 10: get_templates_list (page out of range)", status: "failed", error: rv.message});
			}
			else
			{
				if (rv.templates.length === 0 && typeof rv.num_of_items === "number" && typeof rv.num_of_pages === "number")
				{
					testResults.push({step: "Test 10: get_templates_list (page out of range)", status: "passed", empty_result: true, num_of_items: rv.num_of_items});
				}
				else
				{
					testResults.push({step: "Test 10: get_templates_list (page out of range)", status: "warning", message: "Out-of-range page did not return empty list"});
				}
			}

			// =================================================================
			// Test 11: update_template (header fields only)
			// =================================================================

			testResults.push({step: "Test 11: update_template (header fields)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 11: update_template (header fields)", status: "failed", error: "Cannot update - template was not created"});
			}
			else
			{
				let updatedName = `Updated RT ${uniqueId}`;
				rv = $executeAPI(session, "ReportTemplate/update_template", {
					template_id: testTemplateId,
					name: updatedName,
					category: "daily_activity",
					title_format: "Daily Report - {community} - {date}",
					review_before_client: false,
					allow_officer_editing: true
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 11: update_template (header fields)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 11: update_template (header fields)", status: "passed", template_id: rv.template_id});
				}
			}

			// =================================================================
			// Test 12: get_template (verify update)
			// =================================================================

			testResults.push({step: "Test 12: get_template (verify update)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 12: get_template (verify update)", status: "failed", error: "Cannot verify - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 12: get_template (verify update)", status: "failed", error: rv.message});
				}
				else
				{
					let t = rv.template;
					let verified = t.name === `Updated RT ${uniqueId}` &&
						t.category === "daily_activity" &&
						t.title_format === "Daily Report - {community} - {date}" &&
						t.review_before_client === false &&
						t.allow_officer_editing === true &&
						t.sections.length === 3;
					if (verified)
					{
						testResults.push({step: "Test 12: get_template (verify update)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 12: get_template (verify update)", status: "warning", verified: false, message: "Updated fields not saved correctly"});
					}
				}
			}

			// =================================================================
			// Test 13: update_template (change community assignments to global)
			// =================================================================

			testResults.push({step: "Test 13: update_template (switch to global)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 13: update_template (switch to global)", status: "failed", error: "Cannot update - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template", {
					template_id: testTemplateId,
					community_ids: []
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 13: update_template (switch to global)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
					if (!$Err.isERR(rv) && rv.template.is_global === true && rv.template.communities.length === 0)
					{
						testResults.push({step: "Test 13: update_template (switch to global)", status: "passed", is_global: true});
					}
					else
					{
						testResults.push({step: "Test 13: update_template (switch to global)", status: "warning", message: "Template not switched to global correctly"});
					}
				}
			}

			// =================================================================
			// Test 14: update_template (switch back to community-scoped)
			// =================================================================

			testResults.push({step: "Test 14: update_template (switch back to community)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 14: update_template (switch back to community)", status: "failed", error: "Cannot update - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template", {
					template_id: testTemplateId,
					community_ids: [testCommunityId1]
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 14: update_template (switch back to community)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
					if (!$Err.isERR(rv) && rv.template.is_global === false && rv.template.communities.length === 1)
					{
						testResults.push({step: "Test 14: update_template (switch back to community)", status: "passed", communities: rv.template.communities.length});
					}
					else
					{
						testResults.push({step: "Test 14: update_template (switch back to community)", status: "warning", message: "Community assignment not restored correctly"});
					}
				}
			}

			// =================================================================
			// Test 15: update_template (replace sections)
			// =================================================================

			testResults.push({step: "Test 15: update_template (replace sections)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 15: update_template (replace sections)", status: "failed", error: "Cannot update - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template", {
					template_id: testTemplateId,
					sections: [
						{
							title: "Replaced Section",
							is_enabled: true,
							is_required: true,
							client_visible: true,
							fields: [
								{field_key: "officer_name", label: "Officer Name", field_type: "text", is_system_field: true, is_required: true},
								{field_key: "custom_dropdown", label: "Severity", field_type: "dropdown", config: {dropdown_values: ["Low", "Medium", "High"], is_multi_select: false}, is_system_field: false, is_required: true}
							]
						}
					]
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 15: update_template (replace sections)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
					if (!$Err.isERR(rv) && rv.template.sections.length === 1 && rv.template.sections[0].title === "Replaced Section" && rv.template.sections[0].fields.length === 2)
					{
						testResults.push({step: "Test 15: update_template (replace sections)", status: "passed", new_section_count: 1, new_field_count: 2});
					}
					else
					{
						testResults.push({step: "Test 15: update_template (replace sections)", status: "warning", message: "Sections not replaced correctly"});
					}
				}
			}

			// =================================================================
			// Test 16: get_template_style (default style)
			// =================================================================

			testResults.push({step: "Test 16: get_template_style (defaults)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 16: get_template_style (defaults)", status: "failed", error: "Cannot get style - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/get_template_style", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 16: get_template_style (defaults)", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.style;
					let hasDefaults = s.header_layout === "standard" &&
						s.font === "arial" &&
						s.page_numbering === true &&
						s.date_format === "mm_dd_yyyy" &&
						s.section_breaks === "continuous" &&
						s.include_cover_page === false;
					if (hasDefaults)
					{
						testResults.push({step: "Test 16: get_template_style (defaults)", status: "passed", verified_defaults: true});
					}
					else
					{
						testResults.push({step: "Test 16: get_template_style (defaults)", status: "warning", verified_defaults: false, message: "Default style values differ from expected"});
					}
				}
			}

			// =================================================================
			// Test 17: update_template_style (all parameters)
			// =================================================================

			testResults.push({step: "Test 17: update_template_style (all parameters)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 17: update_template_style (all parameters)", status: "failed", error: "Cannot update style - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					accent_color: "#FF5733",
					header_layout: "full_width_banner",
					font: "calibri",
					page_numbering: false,
					confidentiality_footer: "CONFIDENTIAL - TEST",
					date_format: "dd_mm_yyyy",
					section_breaks: "new_page",
					include_cover_page: true
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 17: update_template_style (all parameters)", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.style;
					let allMatch = s.accent_color === "#FF5733" &&
						s.header_layout === "full_width_banner" &&
						s.font === "calibri" &&
						s.page_numbering === false &&
						s.confidentiality_footer === "CONFIDENTIAL - TEST" &&
						s.date_format === "dd_mm_yyyy" &&
						s.section_breaks === "new_page" &&
						s.include_cover_page === true;
					if (allMatch)
					{
						testResults.push({step: "Test 17: update_template_style (all parameters)", status: "passed", all_verified: true});
					}
					else
					{
						testResults.push({step: "Test 17: update_template_style (all parameters)", status: "warning", all_verified: false, message: "Some style fields not applied correctly"});
					}
				}
			}

			// =================================================================
			// Test 18: get_template_style (verify persistence)
			// =================================================================

			testResults.push({step: "Test 18: get_template_style (verify persistence)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 18: get_template_style (verify persistence)", status: "failed", error: "Cannot verify - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/get_template_style", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 18: get_template_style (verify persistence)", status: "failed", error: rv.message});
				}
				else
				{
					let s = rv.style;
					if (s.accent_color === "#FF5733" && s.font === "calibri" && s.include_cover_page === true)
					{
						testResults.push({step: "Test 18: get_template_style (verify persistence)", status: "passed", verified: true});
					}
					else
					{
						testResults.push({step: "Test 18: get_template_style (verify persistence)", status: "warning", verified: false, message: "Style not persisted correctly after re-read"});
					}
				}
			}

			// =================================================================
			// Test 19: update_template_style (clear accent_color)
			// =================================================================

			testResults.push({step: "Test 19: update_template_style (clear accent_color)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 19: update_template_style (clear accent_color)", status: "failed", error: "Cannot update - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					accent_color: ""
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 19: update_template_style (clear accent_color)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.style.accent_color === null)
					{
						testResults.push({step: "Test 19: update_template_style (clear accent_color)", status: "passed", accent_color: null});
					}
					else
					{
						testResults.push({step: "Test 19: update_template_style (clear accent_color)", status: "warning", message: "accent_color not cleared to null"});
					}
				}
			}

			// =================================================================
			// Test 20: activate_template (draft -> active)
			// =================================================================

			testResults.push({step: "Test 20: activate_template (draft -> active)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 20: activate_template (draft -> active)", status: "failed", error: "Cannot activate - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/activate_template", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 20: activate_template (draft -> active)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
					if (!$Err.isERR(rv) && rv.template.status === "active")
					{
						testResults.push({step: "Test 20: activate_template (draft -> active)", status: "passed", new_status: "active"});
					}
					else
					{
						testResults.push({step: "Test 20: activate_template (draft -> active)", status: "warning", message: "Template not activated"});
					}
				}
			}

			// =================================================================
			// Test 21: activate_template (already active - expect rc 717)
			// =================================================================

			testResults.push({step: "Test 21: activate_template (already active)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 21: activate_template (already active)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/activate_template", {template_id: testTemplateId});
				if (rv.rc === 717)
				{
					testResults.push({step: "Test 21: activate_template (already active)", status: "passed", message: "correctly returned rc 717"});
				}
				else
				{
					testResults.push({step: "Test 21: activate_template (already active)", status: "warning", message: "expected rc 717", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 22: update_template (active template - should succeed)
			// =================================================================

			testResults.push({step: "Test 22: update_template (active template)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 22: update_template (active template)", status: "failed", error: "Cannot update - template was not created"});
			}
			else
			{
				let activeName = `Active RT ${uniqueId}`;
				rv = $executeAPI(session, "ReportTemplate/update_template", {
					template_id: testTemplateId,
					name: activeName
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 22: update_template (active template)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 22: update_template (active template)", status: "passed"});
				}
			}

			// =================================================================
			// Test 23: archive_template (active -> archived)
			// =================================================================

			testResults.push({step: "Test 23: archive_template (active -> archived)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 23: archive_template (active -> archived)", status: "failed", error: "Cannot archive - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/archive_template", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 23: archive_template (active -> archived)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
					if (!$Err.isERR(rv) && rv.template.status === "archived")
					{
						testResults.push({step: "Test 23: archive_template (active -> archived)", status: "passed", new_status: "archived"});
					}
					else
					{
						testResults.push({step: "Test 23: archive_template (active -> archived)", status: "warning", message: "Template not archived"});
					}
				}
			}

			// =================================================================
			// Test 24: archive_template (already archived - expect rc 718)
			// =================================================================

			testResults.push({step: "Test 24: archive_template (already archived)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 24: archive_template (already archived)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/archive_template", {template_id: testTemplateId});
				if (rv.rc === 718)
				{
					testResults.push({step: "Test 24: archive_template (already archived)", status: "passed", message: "correctly returned rc 718"});
				}
				else
				{
					testResults.push({step: "Test 24: archive_template (already archived)", status: "warning", message: "expected rc 718", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 25: update_template (archived - expect rc 724)
			// =================================================================

			testResults.push({step: "Test 25: update_template (archived - expect error)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 25: update_template (archived - expect error)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template", {
					template_id: testTemplateId,
					name: "Should Fail"
				});
				if (rv.rc === 724)
				{
					testResults.push({step: "Test 25: update_template (archived - expect error)", status: "passed", message: "correctly returned rc 724"});
				}
				else
				{
					testResults.push({step: "Test 25: update_template (archived - expect error)", status: "warning", message: "expected rc 724", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 26: activate_template (archived -> active re-activation)
			// =================================================================

			testResults.push({step: "Test 26: activate_template (archived -> active)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 26: activate_template (archived -> active)", status: "failed", error: "Cannot reactivate - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/activate_template", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 26: activate_template (archived -> active)", status: "failed", error: rv.message});
				}
				else
				{
					rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
					if (!$Err.isERR(rv) && rv.template.status === "active")
					{
						testResults.push({step: "Test 26: activate_template (archived -> active)", status: "passed", new_status: "active"});
					}
					else
					{
						testResults.push({step: "Test 26: activate_template (archived -> active)", status: "warning", message: "Template not re-activated"});
					}
				}
			}

			// =================================================================
			// Test 27: duplicate_template (default name)
			// =================================================================

			testResults.push({step: "Test 27: duplicate_template (default name)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 27: duplicate_template (default name)", status: "failed", error: "Cannot duplicate - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/duplicate_template", {template_id: testTemplateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 27: duplicate_template (default name)", status: "failed", error: rv.message});
				}
				else
				{
					testDuplicateId = rv.template_id;
					let dupRv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testDuplicateId});
					if (!$Err.isERR(dupRv) && dupRv.template.status === "draft" && dupRv.template.sections.length === 1)
					{
						testResults.push({step: "Test 27: duplicate_template (default name)", status: "passed", duplicate_id: testDuplicateId, name: dupRv.template.name, sections: dupRv.template.sections.length});
					}
					else
					{
						testResults.push({step: "Test 27: duplicate_template (default name)", status: "warning", message: "Duplicate not created correctly"});
					}
				}
			}

			// =================================================================
			// Test 28: duplicate_template (custom name)
			// =================================================================

			testResults.push({step: "Test 28: duplicate_template (custom name)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 28: duplicate_template (custom name)", status: "failed", error: "Cannot duplicate - template was not created"});
			}
			else
			{
				let customDupName = `Custom Dup ${uniqueId}`;
				rv = $executeAPI(session, "ReportTemplate/duplicate_template", {template_id: testTemplateId, name: customDupName});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 28: duplicate_template (custom name)", status: "failed", error: rv.message});
				}
				else
				{
					let dupId2 = rv.template_id;
					let dupRv = $executeAPI(session, "ReportTemplate/get_template", {template_id: dupId2});
					if (!$Err.isERR(dupRv) && dupRv.template.name === customDupName)
					{
						testResults.push({step: "Test 28: duplicate_template (custom name)", status: "passed", name: dupRv.template.name});
					}
					else
					{
						testResults.push({step: "Test 28: duplicate_template (custom name)", status: "warning", message: "Custom name not applied to duplicate"});
					}
					// Cleanup: delete this duplicate (it's in draft)
					$executeAPI(session, "ReportTemplate/delete_template", {template_id: dupId2});
				}
			}

			// =================================================================
			// Test 29: delete_template (active - expect rc 724)
			// =================================================================

			testResults.push({step: "Test 29: delete_template (active - expect error)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 29: delete_template (active - expect error)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/delete_template", {template_id: testTemplateId});
				if (rv.rc === 724)
				{
					testResults.push({step: "Test 29: delete_template (active - expect error)", status: "passed", message: "correctly returned rc 724 for non-draft template"});
				}
				else
				{
					testResults.push({step: "Test 29: delete_template (active - expect error)", status: "warning", message: "expected rc 724", rc: rv.rc});
				}
			}

			// =================================================================
			// Test 30: delete_template (draft duplicate - should succeed)
			// =================================================================

			testResults.push({step: "Test 30: delete_template (draft)", status: "running"});
			if (testDuplicateId === null)
			{
				testResults.push({step: "Test 30: delete_template (draft)", status: "failed", error: "Cannot delete - duplicate was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/delete_template", {template_id: testDuplicateId});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 30: delete_template (draft)", status: "failed", error: rv.message});
				}
				else
				{
					testResults.push({step: "Test 30: delete_template (draft)", status: "passed", template_id: testDuplicateId});
				}
			}

			// =================================================================
			// Test 31: get_template (verify deletion)
			// =================================================================

			testResults.push({step: "Test 31: get_template (verify deletion)", status: "running"});
			if (testDuplicateId === null)
			{
				testResults.push({step: "Test 31: get_template (verify deletion)", status: "failed", error: "Cannot verify - duplicate was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testDuplicateId});
				if (rv.rc === 711)
				{
					testResults.push({step: "Test 31: get_template (verify deletion)", status: "passed", message: "deleted template correctly returns rc 711"});
				}
				else
				{
					testResults.push({step: "Test 31: get_template (verify deletion)", status: "warning", message: "expected rc 711 for deleted template", rc: rv.rc});
				}
			}

			// =================================================================
			// Negative & Edge Case Tests
			// =================================================================

			// Test 32: get_template (invalid ID)
			testResults.push({step: "Test 32: get_template (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: 999999999});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 32: get_template (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 32: get_template (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 33: create_template (invalid category)
			testResults.push({step: "Test 33: create_template (invalid category)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Invalid Cat ${uniqueId}`,
				category: "bogus_category",
				community_ids: [],
				title_format: "Test - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if (rv.rc === 716)
			{
				testResults.push({step: "Test 33: create_template (invalid category)", status: "passed", message: "correctly returned rc 716"});
			}
			else
			{
				testResults.push({step: "Test 33: create_template (invalid category)", status: "warning", message: "expected rc 716", rc: rv.rc});
			}

			// Test 34: create_template (invalid field type)
			testResults.push({step: "Test 34: create_template (invalid field type)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Invalid FT ${uniqueId}`,
				category: "incident",
				community_ids: [],
				title_format: "Test - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "bogus_type", is_system_field: false}]}]
			});
			if (rv.rc === 719)
			{
				testResults.push({step: "Test 34: create_template (invalid field type)", status: "passed", message: "correctly returned rc 719"});
			}
			else
			{
				testResults.push({step: "Test 34: create_template (invalid field type)", status: "warning", message: "expected rc 719", rc: rv.rc});
			}

			// Test 35: create_template (empty sections)
			testResults.push({step: "Test 35: create_template (empty sections)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Empty Sec ${uniqueId}`,
				category: "incident",
				community_ids: [],
				title_format: "Test - {date}",
				sections: []
			});
			if (rv.rc === 720)
			{
				testResults.push({step: "Test 35: create_template (empty sections)", status: "passed", message: "correctly returned rc 720"});
			}
			else
			{
				testResults.push({step: "Test 35: create_template (empty sections)", status: "warning", message: "expected rc 720", rc: rv.rc});
			}

			// Test 36: create_template (section with empty fields)
			testResults.push({step: "Test 36: create_template (section with no fields)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Empty Fields ${uniqueId}`,
				category: "incident",
				community_ids: [],
				title_format: "Test - {date}",
				sections: [{title: "S1", fields: []}]
			});
			if (rv.rc === 721)
			{
				testResults.push({step: "Test 36: create_template (section with no fields)", status: "passed", message: "correctly returned rc 721"});
			}
			else
			{
				testResults.push({step: "Test 36: create_template (section with no fields)", status: "warning", message: "expected rc 721", rc: rv.rc});
			}

			// Test 37: create_template (invalid community ID)
			testResults.push({step: "Test 37: create_template (invalid community ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Bad Comm ${uniqueId}`,
				category: "incident",
				community_ids: [999999999],
				title_format: "Test - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if (rv.rc === 723)
			{
				testResults.push({step: "Test 37: create_template (invalid community ID)", status: "passed", message: "correctly returned rc 723"});
			}
			else
			{
				testResults.push({step: "Test 37: create_template (invalid community ID)", status: "warning", message: "expected rc 723", rc: rv.rc});
			}

			// Test 38: create_template (duplicate name - expect rc 715)
			testResults.push({step: "Test 38: create_template (duplicate name)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 38: create_template (duplicate name)", status: "failed", error: "Cannot test - original template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/get_template", {template_id: testTemplateId});
				if (!$Err.isERR(rv))
				{
					let existingName = rv.template.name;
					rv = $executeAPI(session, "ReportTemplate/create_template", {
						name: existingName,
						category: "incident",
						community_ids: [testCommunityId1],
						title_format: "Test - {date}",
						sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
					});
					if (rv.rc === 715)
					{
						testResults.push({step: "Test 38: create_template (duplicate name)", status: "passed", message: "correctly returned rc 715"});
					}
					else
					{
						testResults.push({step: "Test 38: create_template (duplicate name)", status: "warning", message: "expected rc 715", rc: rv.rc});
					}
				}
				else
				{
					testResults.push({step: "Test 38: create_template (duplicate name)", status: "failed", error: "Could not fetch existing template for name check"});
				}
			}

			// Test 39: get_templates_list (invalid status filter)
			testResults.push({step: "Test 39: get_templates_list (invalid status)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {status: "bogus_status"});
			if (rv.rc === 722)
			{
				testResults.push({step: "Test 39: get_templates_list (invalid status)", status: "passed", message: "correctly returned rc 722"});
			}
			else
			{
				testResults.push({step: "Test 39: get_templates_list (invalid status)", status: "warning", message: "expected rc 722", rc: rv.rc});
			}

			// Test 40: get_templates_list (invalid category filter)
			testResults.push({step: "Test 40: get_templates_list (invalid category)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_templates_list", {category: "bogus_category"});
			if (rv.rc === 716)
			{
				testResults.push({step: "Test 40: get_templates_list (invalid category)", status: "passed", message: "correctly returned rc 716"});
			}
			else
			{
				testResults.push({step: "Test 40: get_templates_list (invalid category)", status: "warning", message: "expected rc 716", rc: rv.rc});
			}

			// Test 41: update_template_style (invalid header_layout)
			testResults.push({step: "Test 41: update_template_style (invalid header_layout)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 41: update_template_style (invalid header_layout)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					header_layout: "bogus_layout"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 41: update_template_style (invalid header_layout)", status: "passed", message: "correctly rejected invalid header_layout"});
				}
				else
				{
					testResults.push({step: "Test 41: update_template_style (invalid header_layout)", status: "warning", message: "accepted invalid header_layout"});
				}
			}

			// Test 42: update_template_style (invalid font)
			testResults.push({step: "Test 42: update_template_style (invalid font)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 42: update_template_style (invalid font)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					font: "comic_sans"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 42: update_template_style (invalid font)", status: "passed", message: "correctly rejected invalid font"});
				}
				else
				{
					testResults.push({step: "Test 42: update_template_style (invalid font)", status: "warning", message: "accepted invalid font"});
				}
			}

			// Test 43: update_template_style (invalid date_format)
			testResults.push({step: "Test 43: update_template_style (invalid date_format)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 43: update_template_style (invalid date_format)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					date_format: "yy/mm/dd"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 43: update_template_style (invalid date_format)", status: "passed", message: "correctly rejected invalid date_format"});
				}
				else
				{
					testResults.push({step: "Test 43: update_template_style (invalid date_format)", status: "warning", message: "accepted invalid date_format"});
				}
			}

			// Test 44: update_template_style (invalid section_breaks)
			testResults.push({step: "Test 44: update_template_style (invalid section_breaks)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 44: update_template_style (invalid section_breaks)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					section_breaks: "page_break_everywhere"
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 44: update_template_style (invalid section_breaks)", status: "passed", message: "correctly rejected invalid section_breaks"});
				}
				else
				{
					testResults.push({step: "Test 44: update_template_style (invalid section_breaks)", status: "warning", message: "accepted invalid section_breaks"});
				}
			}

			// Test 45: create_template (special characters in name)
			testResults.push({step: "Test 45: create_template (special characters)", status: "running"});
			let specialName = `Test-RT_Special & (More) ${uniqueId}`;
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: specialName,
				category: "custom",
				community_ids: [],
				title_format: "Special - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 45: create_template (special characters)", status: "warning", message: "rejected special characters", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 45: create_template (special characters)", status: "passed", template_id: rv.template_id});
				// Cleanup
				$executeAPI(session, "ReportTemplate/delete_template", {template_id: rv.template_id});
			}

			// Test 46: create_template (unicode name)
			testResults.push({step: "Test 46: create_template (unicode)", status: "running"});
			let unicodeName = `Test 测试 تقرير ${uniqueId}`;
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: unicodeName,
				category: "incident",
				community_ids: [],
				title_format: "Unicode - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 46: create_template (unicode)", status: "warning", message: "rejected unicode name", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 46: create_template (unicode)", status: "passed", template_id: rv.template_id});
				$executeAPI(session, "ReportTemplate/delete_template", {template_id: rv.template_id});
			}

			// Test 47: create_template (long name at boundary - 80 chars)
			testResults.push({step: "Test 47: create_template (80-char boundary name)", status: "running"});
			let boundaryName = "A".repeat(71) + " " + uniqueId;
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: boundaryName,
				category: "incident",
				community_ids: [],
				title_format: "Long - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 47: create_template (80-char boundary name)", status: "warning", message: "rejected boundary-length name", error: rv.message});
			}
			else
			{
				testResults.push({step: "Test 47: create_template (80-char boundary name)", status: "passed", template_id: rv.template_id, name_length: boundaryName.length});
				$executeAPI(session, "ReportTemplate/delete_template", {template_id: rv.template_id});
			}

			// Test 48: create_template (name exceeds 80 chars)
			testResults.push({step: "Test 48: create_template (name > 80 chars)", status: "running"});
			let tooLongName = "B".repeat(81);
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: tooLongName,
				category: "incident",
				community_ids: [],
				title_format: "TooLong - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 48: create_template (name > 80 chars)", status: "passed", message: "correctly rejected name exceeding 80 chars"});
			}
			else
			{
				testResults.push({step: "Test 48: create_template (name > 80 chars)", status: "warning", message: "accepted name exceeding 80 chars"});
				$executeAPI(session, "ReportTemplate/delete_template", {template_id: rv.template_id});
			}

			// Test 49: create_template (empty name)
			testResults.push({step: "Test 49: create_template (empty name)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: "",
				category: "incident",
				community_ids: [],
				title_format: "Test - {date}",
				sections: [{title: "S1", fields: [{field_key: "f1", label: "F1", field_type: "text", is_system_field: false}]}]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 49: create_template (empty name)", status: "passed", message: "correctly rejected empty name"});
			}
			else
			{
				testResults.push({step: "Test 49: create_template (empty name)", status: "warning", message: "accepted empty name"});
				$executeAPI(session, "ReportTemplate/delete_template", {template_id: rv.template_id});
			}

			// Test 50: create_template (global template with all field types)
			testResults.push({step: "Test 50: create_template (all field types)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `All Types ${uniqueId}`,
				category: "daily_activity",
				community_ids: [],
				title_format: "Daily - {date}",
				sections: [
					{
						title: "All Types Section",
						is_enabled: true,
						is_required: true,
						client_visible: true,
						fields: [
							{field_key: "ft_text", label: "Text Field", field_type: "text", config: {max_chars: 1000}, is_system_field: false, is_required: true},
							{field_key: "ft_date", label: "Date Field", field_type: "date", is_system_field: false, is_required: true},
							{field_key: "ft_location", label: "Location Field", field_type: "location", is_system_field: false, is_required: false},
							{field_key: "ft_dropdown", label: "Dropdown Field", field_type: "dropdown", config: {dropdown_values: ["A", "B", "C"], is_multi_select: true}, is_system_field: false, is_required: true},
							{field_key: "ft_file", label: "File Upload Field", field_type: "file_upload", config: {max_files: 3}, is_system_field: false, is_required: false},
							{field_key: "ft_sig", label: "Signature Field", field_type: "digital_signature", is_system_field: false, is_required: false}
						]
					}
				]
			});
			if ($Err.isERR(rv))
			{
				testResults.push({step: "Test 50: create_template (all field types)", status: "failed", error: rv.message});
			}
			else
			{
				let allTypesId = rv.template_id;
				let getResult = $executeAPI(session, "ReportTemplate/get_template", {template_id: allTypesId});
				if (!$Err.isERR(getResult))
				{
					let fields = getResult.template.sections[0].fields;
					let typesCorrect = fields.length === 6 &&
						fields[0].field_type === "text" &&
						fields[1].field_type === "date" &&
						fields[2].field_type === "location" &&
						fields[3].field_type === "dropdown" &&
						fields[4].field_type === "file_upload" &&
						fields[5].field_type === "digital_signature";
					if (typesCorrect)
					{
						testResults.push({step: "Test 50: create_template (all field types)", status: "passed", field_count: fields.length, all_types_verified: true});
					}
					else
					{
						testResults.push({step: "Test 50: create_template (all field types)", status: "warning", message: "Field types not stored correctly"});
					}
				}
				else
				{
					testResults.push({step: "Test 50: create_template (all field types)", status: "warning", message: "Could not verify field types"});
				}
				// Cleanup
				$executeAPI(session, "ReportTemplate/delete_template", {template_id: allTypesId});
			}

			// Test 51: get_template_style (non-existent template)
			testResults.push({step: "Test 51: get_template_style (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/get_template_style", {template_id: 999999999});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 51: get_template_style (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 51: get_template_style (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 52: update_template_style (non-existent template)
			testResults.push({step: "Test 52: update_template_style (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/update_template_style", {template_id: 999999999, font: "arial"});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 52: update_template_style (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 52: update_template_style (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 53: activate_template (non-existent template)
			testResults.push({step: "Test 53: activate_template (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/activate_template", {template_id: 999999999});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 53: activate_template (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 53: activate_template (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 54: archive_template (non-existent template)
			testResults.push({step: "Test 54: archive_template (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/archive_template", {template_id: 999999999});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 54: archive_template (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 54: archive_template (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 55: delete_template (non-existent template)
			testResults.push({step: "Test 55: delete_template (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/delete_template", {template_id: 999999999});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 55: delete_template (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 55: delete_template (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 56: duplicate_template (non-existent template)
			testResults.push({step: "Test 56: duplicate_template (invalid ID)", status: "running"});
			rv = $executeAPI(session, "ReportTemplate/duplicate_template", {template_id: 999999999});
			if (rv.rc === 711)
			{
				testResults.push({step: "Test 56: duplicate_template (invalid ID)", status: "passed", message: "correctly returned rc 711"});
			}
			else
			{
				testResults.push({step: "Test 56: duplicate_template (invalid ID)", status: "warning", message: "expected rc 711", rc: rv.rc});
			}

			// Test 57: update_template_style (toggle page_numbering to true/false)
			testResults.push({step: "Test 57: update_template_style (toggle booleans)", status: "running"});
			if (testTemplateId === null)
			{
				testResults.push({step: "Test 57: update_template_style (toggle booleans)", status: "failed", error: "Cannot test - template was not created"});
			}
			else
			{
				rv = $executeAPI(session, "ReportTemplate/update_template_style", {
					template_id: testTemplateId,
					page_numbering: true,
					include_cover_page: false
				});
				if ($Err.isERR(rv))
				{
					testResults.push({step: "Test 57: update_template_style (toggle booleans)", status: "failed", error: rv.message});
				}
				else
				{
					if (rv.style.page_numbering === true && rv.style.include_cover_page === false)
					{
						testResults.push({step: "Test 57: update_template_style (toggle booleans)", status: "passed", page_numbering: true, include_cover_page: false});
					}
					else
					{
						testResults.push({step: "Test 57: update_template_style (toggle booleans)", status: "warning", message: "Boolean toggles not applied correctly"});
					}
				}
			}

			// =================================================================
			// Cleanup: archive the main test template (leave it non-deleted)
			// =================================================================

			if (testTemplateId !== null)
			{
				// Ensure it's archived for cleanup (may already be active from re-activation test)
				$executeAPI(session, "ReportTemplate/archive_template", {template_id: testTemplateId});
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
