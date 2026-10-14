module.exports =
{
	test_report_apis(session)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let testResults = [];
		let adminUserId = session.userId;

		// Track created entities for cleanup
		let testCommunityId = null;
		let officerAId = null;
		let officerBId = null;
		let resident1Id = null;
		let resident2Id = null;
		let fileId1 = null;
		let fileId2 = null;
		let templateAId = null;
		let templateBId = null;
		let callId = null;
		let poiId = null;
		let reportAId = null;
		let reportCallId = null;
		let reportPoiId = null;
		let reportBId = null;
		let createdReportIds = [];

		// 1x1 PNGs (base64) for attachment uploads.
		// Image 1 (media field) has an invalid zlib checksum on purpose: delivery must not embed it
		// (it would crash pdfkit's async decoder) but list it by file name. Image 2 (signature) is valid and embedded.
		let testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
		let testImageBase64_2 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";

		function buildResult()
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

		function restoreSession()
		{
			session.accountImpersonationStack = null;
			session.userId = adminUserId;
			session.userType = $Const.USER_TYPE_ADMIN;
		}

		// Executes an API as another user; the admin session is always restored
		function callAs(userId, apiName, params)
		{
			try
			{
				session.impersonateAccount(userId);
				return $executeAPI(session, apiName, params);
			}
			finally
			{
				restoreSession();
			}
		}

		function running(step)
		{
			testResults.push({step: step, status: "running"});
		}

		// The status key is set last so result data can never override it
		function passed(step, data = {})
		{
			testResults.push({step: step, ...data, status: "passed"});
		}

		function failed(step, error, data = {})
		{
			testResults.push({step: step, error: error, ...data, status: "failed"});
		}

		function warning(step, message, data = {})
		{
			testResults.push({step: step, message: message, ...data, status: "warning"});
		}

		function expectRc(step, rv, expectedRc, okMessage)
		{
			if (rv && rv.rc === expectedRc)
			{
				passed(step, {message: okMessage});
			}
			else
			{
				warning(step, "expected rc " + expectedRc, {rc: rv ? rv.rc : null, error: rv ? rv.message : null});
			}
		}

		function skipped(step, reason)
		{
			failed(step, "Cannot test - " + reason);
		}

		// Locates a field (and its section) by field_key in a get_report response
		function findField(report, fieldKey)
		{
			for (let i = 0; i < report.sections.length; i++)
			{
				let field = report.sections[i].fields.find(f => f.field_key === fieldKey);
				if (field)
				{
					return {section: report.sections[i], field: field};
				}
			}
			return null;
		}

		function findSection(report, title)
		{
			return report.sections.find(s => s.title === title) || null;
		}

		function getReportAs(userId, reportId)
		{
			let rv;
			if (userId === adminUserId)
			{
				rv = $executeAPI(session, "Report/get_report", {report_id: reportId});
			}
			else
			{
				rv = callAs(userId, "Report/get_report", {report_id: reportId});
			}
			return $Err.isERR(rv) ? null : rv.report;
		}

		// Updates a single section of report A as the given user
		function updateSingle(userId, sectionId, values, extra = {})
		{
			let params = {report_id: reportAId, sections: [{report_section_id: sectionId, values: values, ...extra}]};
			if (userId === adminUserId)
			{
				return $executeAPI(session, "Report/update_report", params);
			}
			return callAs(userId, "Report/update_report", params);
		}

		function countNotifications(userId, type, reportId)
		{
			let rows = $Db.executeQuery(
				`SELECT COUNT(*) total FROM \`notification\`
				 WHERE NTF_USR_ID=? AND NTF_TYPE=? AND JSON_EXTRACT(NTF_PAYLOAD, '$.entity_id')=? AND NTF_DELETED_ON IS NULL`,
				[userId, type, reportId]);
			return rows.length > 0 ? rows[0].total : 0;
		}

		try
		{
			testResults.push({step: "Starting Report API tests", status: "info"});

			let uniqueId = $Utils.uniqueHash().substring(0, 8);
			let randomPhone = () => "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
			let rv;

			// =================================================================
			// Setup: community, officers, residents, files, templates, call, POI
			// =================================================================

			running("Setup: create test community");
			rv = $executeAPI(session, "Community/add_community", {
				name: `RPT Test Comm ${uniqueId}`,
				area: "Test Area",
				latitude: 25.276987,
				longitude: 55.296249,
				location_name: "Test Location",
				timezone: "Asia/Dubai",
				is_active: true
			});
			if ($Err.isERR(rv))
			{
				failed("Setup: create test community", rv.message);
				return buildResult();
			}
			testCommunityId = rv.community_id;
			passed("Setup: create test community", {community_id: testCommunityId});

			running("Setup: create officer A");
			rv = $executeAPI(session, "Officer/add_officer", {
				first_name: `RptOfcA ${uniqueId}`,
				last_name: "Author",
				phone_num: randomPhone(),
				email: `rpt_ofc_a_${uniqueId}@test.com`,
				community_id: testCommunityId,
				title: "Security Officer",
				address: "Officer A Address"
			});
			if ($Err.isERR(rv))
			{
				failed("Setup: create officer A", rv.message);
				return buildResult();
			}
			officerAId = rv.user_id;
			passed("Setup: create officer A", {user_id: officerAId});

			running("Setup: create officer B");
			rv = $executeAPI(session, "Officer/add_officer", {
				first_name: `RptOfcB ${uniqueId}`,
				last_name: "Other",
				phone_num: randomPhone(),
				email: `rpt_ofc_b_${uniqueId}@test.com`,
				community_id: testCommunityId,
				title: "Security Officer",
				address: "Officer B Address"
			});
			if ($Err.isERR(rv))
			{
				failed("Setup: create officer B", rv.message);
			}
			else
			{
				officerBId = rv.user_id;
				passed("Setup: create officer B", {user_id: officerBId});
			}

			running("Setup: create resident 1");
			rv = $executeAPI(session, "Resident/add_resident", {
				first_name: `RptRes1 ${uniqueId}`,
				last_name: "Client",
				phone_num: randomPhone(),
				email: `rpt_res1_${uniqueId}@test.com`,
				community_id: testCommunityId,
				address: "1 Report Lane"
			});
			if ($Err.isERR(rv))
			{
				failed("Setup: create resident 1", rv.message);
				return buildResult();
			}
			resident1Id = rv.user_id;
			passed("Setup: create resident 1", {user_id: resident1Id});

			running("Setup: create resident 2");
			rv = $executeAPI(session, "Resident/add_resident", {
				first_name: `RptRes2 ${uniqueId}`,
				last_name: "Neighbour",
				phone_num: randomPhone(),
				email: `rpt_res2_${uniqueId}@test.com`,
				community_id: testCommunityId,
				address: "2 Report Lane"
			});
			if ($Err.isERR(rv))
			{
				failed("Setup: create resident 2", rv.message);
			}
			else
			{
				resident2Id = rv.user_id;
				passed("Setup: create resident 2", {user_id: resident2Id});
			}

			running("Setup: upload test files");
			let up1 = $executeAPI(session, "File/upload_file_base64", {file_name: `rpt_photo_${uniqueId}.png`, file_data: testImageBase64});
			let up2 = $executeAPI(session, "File/upload_file_base64", {file_name: `rpt_sig_${uniqueId}.png`, file_data: testImageBase64_2});
			if ($Err.isERR(up1) || $Err.isERR(up2))
			{
				failed("Setup: upload test files", ($Err.isERR(up1) ? up1 : up2).message);
			}
			else
			{
				fileId1 = up1.file_id;
				fileId2 = up2.file_id;
				passed("Setup: upload test files", {file_id_1: fileId1, file_id_2: fileId2});
			}

			// Template A: review required, officer may edit after submit
			running("Setup: create + activate template A (review required, officer editing allowed)");
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Report Test Template A ${uniqueId}`,
				category: "incident",
				community_ids: [testCommunityId],
				title_format: "Incident - {community} - {incident_type}",
				review_before_client: true,
				allow_officer_editing: true,
				sections: [
					{
						title: "Incident Details",
						is_enabled: true,
						is_required: true,
						client_visible: true,
						fields: [
							{field_key: "incident_date", label: "Incident Date", field_type: "date", is_system_field: true, is_required: false},
							{field_key: "incident_type", label: "Incident Type", field_type: "dropdown", is_system_field: true, is_required: false},
							{field_key: "incident_location", label: "Location", field_type: "location", is_system_field: true, is_required: false},
							{field_key: "incident_description", label: "Description", field_type: "text", is_system_field: true, is_required: false},
							{field_key: "officer_name", label: "Officer", field_type: "text", is_system_field: true, is_required: false},
							{field_key: "call_reference", label: "Call Reference", field_type: "text", is_system_field: true, is_required: false},
							{field_key: "custom_narrative", label: "Narrative", field_type: "text", config: {max_chars: 500}, is_system_field: false, is_required: true}
						]
					},
					{
						title: "Internal Assessment",
						is_enabled: true,
						is_required: false,
						client_visible: false,
						fields: [
							{field_key: "custom_risk", label: "Risk", field_type: "dropdown", config: {dropdown_values: ["Low", "Medium", "High"], is_multi_select: true}, is_system_field: false, is_required: false},
							{field_key: "custom_internal", label: "Internal Notes", field_type: "text", is_system_field: false, is_required: false}
						]
					},
					{
						title: "Evidence",
						is_enabled: true,
						is_required: false,
						client_visible: true,
						fields: [
							{field_key: "media", label: "Photos", field_type: "file_upload", config: {max_files: 2}, is_system_field: true, is_required: false},
							{field_key: "custom_signature", label: "Witness Signature", field_type: "digital_signature", is_system_field: false, is_required: true}
						]
					},
					{
						title: "Disabled Section",
						is_enabled: false,
						is_required: false,
						client_visible: true,
						fields: [
							{field_key: "custom_disabled", label: "Never Shown", field_type: "text", is_system_field: false, is_required: false}
						]
					}
				]
			});
			if (!$Err.isERR(rv))
			{
				templateAId = rv.template_id;
				rv = $executeAPI(session, "ReportTemplate/activate_template", {template_id: templateAId});
			}
			if ($Err.isERR(rv) || templateAId === null)
			{
				failed("Setup: create + activate template A (review required, officer editing allowed)", rv.message);
				return buildResult();
			}
			passed("Setup: create + activate template A (review required, officer editing allowed)", {template_id: templateAId});

			// Template B: no review (auto-approve), no officer editing after submit
			running("Setup: create + activate template B (no review)");
			rv = $executeAPI(session, "ReportTemplate/create_template", {
				name: `Report Test Template B ${uniqueId}`,
				category: "daily_activity",
				community_ids: [testCommunityId],
				title_format: "Daily Log - {date}",
				review_before_client: false,
				allow_officer_editing: false,
				sections: [
					{
						title: "Daily Log",
						is_enabled: true,
						is_required: true,
						client_visible: true,
						fields: [
							{field_key: "officer_name", label: "Officer", field_type: "text", is_system_field: true, is_required: false},
							{field_key: "custom_log", label: "Log Entry", field_type: "text", is_system_field: false, is_required: true}
						]
					}
				]
			});
			if (!$Err.isERR(rv))
			{
				templateBId = rv.template_id;
				rv = $executeAPI(session, "ReportTemplate/activate_template", {template_id: templateBId});
			}
			if ($Err.isERR(rv) || templateBId === null)
			{
				failed("Setup: create + activate template B (no review)", rv.message);
			}
			else
			{
				passed("Setup: create + activate template B (no review)", {template_id: templateBId});
			}

			running("Setup: create security emergency call (as resident 1)");
			rv = callAs(resident1Id, "Call/create_call", {
				category: "security_emergency",
				description: `Break-in reported ${uniqueId}`,
				address: "1 Report Lane",
				current_address: "Rear gate",
				latitude: "25.2770000",
				longitude: "55.2960000"
			});
			if ($Err.isERR(rv))
			{
				failed("Setup: create security emergency call (as resident 1)", rv.message);
			}
			else
			{
				callId = rv.call_id;
				passed("Setup: create security emergency call (as resident 1)", {call_id: callId});
			}

			running("Setup: create active POI record");
			if (fileId1 === null)
			{
				skipped("Setup: create active POI record", "photo was not uploaded");
			}
			else
			{
				rv = $executeAPI(session, "Poi/create_poi_record", {
					record_type: "poi",
					first_name: `RptPOI ${uniqueId}`,
					last_name: "Subject",
					known_aliases: "Shadow",
					gender: "male",
					physical_description: "Tall, dark jacket",
					threat_level: "medium",
					summary: `Report encounter test subject ${uniqueId}`,
					community_ids: [testCommunityId],
					photo_file_ids: [fileId1],
					related_incident_ids: [],
					publish: true
				});
				if ($Err.isERR(rv))
				{
					failed("Setup: create active POI record", rv.message);
				}
				else
				{
					poiId = rv.record_id;
					passed("Setup: create active POI record", {record_id: poiId});
				}
			}

			// =================================================================
			// Test 1: get_report_metadata
			// =================================================================

			running("Test 1: get_report_metadata");
			rv = $executeAPI(session, "Report/get_report_metadata", {});
			if ($Err.isERR(rv))
			{
				failed("Test 1: get_report_metadata", rv.message);
			}
			else
			{
				let ok = rv.statuses.delivered !== undefined && rv.categories.incident !== undefined && rv.history_actions.pdf_regenerated !== undefined;
				if (ok)
				{
					passed("Test 1: get_report_metadata", {statuses: Object.keys(rv.statuses).length});
				}
				else
				{
					warning("Test 1: get_report_metadata", "missing expected lookup values");
				}
			}

			// =================================================================
			// Creation
			// =================================================================

			running("Test 2: create_report (standalone, client recipient, initial values)");
			rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, client_user_id: resident1Id});
			if ($Err.isERR(rv))
			{
				failed("Test 2: create_report (standalone, client recipient, initial values)", rv.message);
				return buildResult();
			}
			reportAId = rv.report_id;
			createdReportIds.push(reportAId);
			passed("Test 2: create_report (standalone, client recipient, initial values)", {report_id: reportAId, title: rv.title});

			running("Test 3: get_report (officer view, verify draft + auto-population)");
			let reportA = getReportAs(officerAId, reportAId);
			if (!reportA)
			{
				failed("Test 3: get_report (officer view, verify draft + auto-population)", "report not returned");
			}
			else
			{
				let officerField = findField(reportA, "officer_name");
				let ok = reportA.status === "draft" &&
					reportA.client_user_id === resident1Id &&
					reportA.can_edit === true &&
					reportA.sections.length === 3 &&
					!findSection(reportA, "Disabled Section") &&
					officerField && officerField.field.is_auto_populated === true && officerField.field.is_locked === true &&
					reportA.history === undefined && reportA.review_lock === undefined &&
					reportA.sections.every(s => s.manager_notes === undefined);
				if (ok)
				{
					passed("Test 3: get_report (officer view, verify draft + auto-population)", {sections: reportA.sections.length});
				}
				else
				{
					warning("Test 3: get_report (officer view, verify draft + auto-population)", "unexpected report content");
				}
			}

			running("Test 4: create_report (call-linked, auto-populated from call)");
			if (callId === null)
			{
				skipped("Test 4: create_report (call-linked, auto-populated from call)", "call was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, call_id: callId});
				if ($Err.isERR(rv))
				{
					failed("Test 4: create_report (call-linked, auto-populated from call)", rv.message);
				}
				else
				{
					reportCallId = rv.report_id;
					createdReportIds.push(reportCallId);
					let r = getReportAs(officerAId, reportCallId);
					let desc = r ? findField(r, "incident_description") : null;
					let ref = r ? findField(r, "call_reference") : null;
					let type = r ? findField(r, "incident_type") : null;
					let ok = r && r.call_id === callId && r.client_user_id === resident1Id &&
						desc && String(desc.field.value).includes(uniqueId) && desc.field.is_locked === false &&
						ref && ref.field.value === String(callId) && ref.field.is_locked === true &&
						type && type.field.value === "Security Emergency" && type.field.is_locked === true;
					if (ok)
					{
						passed("Test 4: create_report (call-linked, auto-populated from call)", {report_id: reportCallId, title: rv.title});
					}
					else
					{
						warning("Test 4: create_report (call-linked, auto-populated from call)", "auto-population or locking not as expected", {report_id: reportCallId});
					}
				}
			}

			running("Test 5: create_report (POI Report Encounter, officer location)");
			if (poiId === null)
			{
				skipped("Test 5: create_report (POI Report Encounter, officer location)", "POI record was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, poi_id: poiId, latitude: 25.2771, longitude: 55.2961, location_address: "North gate"});
				if ($Err.isERR(rv))
				{
					failed("Test 5: create_report (POI Report Encounter, officer location)", rv.message);
				}
				else
				{
					reportPoiId = rv.report_id;
					createdReportIds.push(reportPoiId);
					let r = getReportAs(officerAId, reportPoiId);
					let type = r ? findField(r, "incident_type") : null;
					let desc = r ? findField(r, "incident_description") : null;
					let loc = r ? findField(r, "incident_location") : null;
					let ok = r && r.poi_id === poiId &&
						type && type.field.value === "Person of Interest" &&
						desc && String(desc.field.value).includes("POI Record #" + poiId) && String(desc.field.value).includes("Shadow") && desc.field.is_locked === false &&
						loc && loc.field.value && loc.field.value.address === "North gate" && Number(loc.field.value.latitude) === 25.2771 && loc.field.is_locked === true;
					if (ok)
					{
						passed("Test 5: create_report (POI Report Encounter, officer location)", {report_id: reportPoiId});
					}
					else
					{
						warning("Test 5: create_report (POI Report Encounter, officer location)", "POI pre-fill not as expected", {report_id: reportPoiId});
					}
				}
			}

			running("Test 6: create_report (standalone, no recipient, template without review)");
			if (templateBId === null)
			{
				skipped("Test 6: create_report (standalone, no recipient, template without review)", "template B was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/create_report", {template_id: templateBId});
				if ($Err.isERR(rv))
				{
					failed("Test 6: create_report (standalone, no recipient, template without review)", rv.message);
				}
				else
				{
					reportBId = rv.report_id;
					createdReportIds.push(reportBId);
					passed("Test 6: create_report (standalone, no recipient, template without review)", {report_id: reportBId, title: rv.title});
				}
			}

			// =================================================================
			// Creation — negative tests
			// =================================================================

			running("Test 7: create_report (invalid template)");
			rv = callAs(officerAId, "Report/create_report", {template_id: 999999999});
			expectRc("Test 7: create_report (invalid template)", rv, 711, "correctly rejected unknown template");

			running("Test 8: create_report (invalid call)");
			rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, call_id: 999999999});
			expectRc("Test 8: create_report (invalid call)", rv, 735, "correctly rejected unknown call");

			running("Test 9: create_report (client_user_id on a call-linked report)");
			if (callId === null)
			{
				skipped("Test 9: create_report (client_user_id on a call-linked report)", "call was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, call_id: callId, client_user_id: resident2Id || resident1Id});
				expectRc("Test 9: create_report (client_user_id on a call-linked report)", rv, 105, "correctly rejected recipient on call-linked report");
			}

			running("Test 10: create_report (client is not a resident)");
			rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, client_user_id: officerBId || adminUserId});
			expectRc("Test 10: create_report (client is not a resident)", rv, 740, "correctly rejected non-resident recipient");

			running("Test 11: create_report (invalid POI)");
			rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, poi_id: 999999999});
			expectRc("Test 11: create_report (invalid POI)", rv, 741, "correctly rejected unknown POI record");

			running("Test 12: create_report (POI encounter, latitude out of range)");
			if (poiId === null)
			{
				skipped("Test 12: create_report (POI encounter, latitude out of range)", "POI record was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/create_report", {template_id: templateAId, poi_id: poiId, latitude: 200, longitude: 10});
				expectRc("Test 12: create_report (POI encounter, latitude out of range)", rv, 731, "correctly rejected invalid coordinates");
			}

			// Internal $executeAPI calls do not apply @acl (only HTTP requests do) - verify the ACL definitions instead
			running("Test 13: ACL definitions (officer-only / admin-only / resident-only endpoints)");
			let reportApis = $API.Report || {};
			let aclIs = (api, types) => !!reportApis[api] && JSON.stringify([...reportApis[api]["@acl"]].sort()) === JSON.stringify([...types].sort());
			let aclOk = aclIs("create_report", [$ACL.USER_TYPE_OFFICER]) &&
				aclIs("submit_report", [$ACL.USER_TYPE_OFFICER]) &&
				aclIs("start_review", [$ACL.USER_TYPE_ADMIN]) &&
				aclIs("approve_report", [$ACL.USER_TYPE_ADMIN]) &&
				aclIs("deliver_report", [$ACL.USER_TYPE_ADMIN]) &&
				aclIs("get_report_history", [$ACL.USER_TYPE_ADMIN]) &&
				aclIs("export_report_pdf", [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_RESIDENT]) &&
				aclIs("get_report_for_client", [$ACL.USER_TYPE_RESIDENT]);
			if (aclOk)
			{
				passed("Test 13: ACL definitions (officer-only / admin-only / resident-only endpoints)", {endpoints: Object.keys(reportApis).length});
			}
			else
			{
				warning("Test 13: ACL definitions (officer-only / admin-only / resident-only endpoints)", "unexpected @acl definitions");
			}

			// =================================================================
			// Officer editing
			// =================================================================

			let narrative = reportA ? findField(reportA, "custom_narrative") : null;
			let risk = reportA ? findField(reportA, "custom_risk") : null;
			let internal = reportA ? findField(reportA, "custom_internal") : null;
			let media = reportA ? findField(reportA, "media") : null;
			let signature = reportA ? findField(reportA, "custom_signature") : null;
			let officerName = reportA ? findField(reportA, "officer_name") : null;
			let fieldsReady = narrative && risk && internal && media && signature && officerName;

			running("Test 14: update_report (officer, all field types)");
			if (!fieldsReady || fileId1 === null)
			{
				skipped("Test 14: update_report (officer, all field types)", "report fields or files not available");
			}
			else
			{
				let values1 = {};
				values1[narrative.field.field_id] = "Rear door forced open; suspect left on foot.";
				let values2 = {};
				values2[risk.field.field_id] = ["High", "Medium"];
				values2[internal.field.field_id] = "Check CCTV";
				let values3 = {};
				values3[media.field.field_id] = {attachment_ids: [], file_ids: [fileId1]};
				values3[signature.field.field_id] = {attachment_ids: [], file_ids: [fileId2]};
				rv = callAs(officerAId, "Report/update_report", {
					report_id: reportAId,
					sections: [
						{report_section_id: narrative.section.report_section_id, values: values1},
						{report_section_id: risk.section.report_section_id, values: values2},
						{report_section_id: media.section.report_section_id, values: values3}
					]
				});
				if ($Err.isERR(rv))
				{
					failed("Test 14: update_report (officer, all field types)", rv.message);
				}
				else
				{
					let r = getReportAs(officerAId, reportAId);
					let ok = r &&
						findField(r, "custom_narrative").field.value === "Rear door forced open; suspect left on foot." &&
						JSON.stringify(findField(r, "custom_risk").field.value) === JSON.stringify(["High", "Medium"]) &&
						findField(r, "media").field.attachments.length === 1 &&
						findField(r, "custom_signature").field.attachments.length === 1 &&
						rv.changed === true;
					if (ok)
					{
						passed("Test 14: update_report (officer, all field types)", {changed: rv.changed});
					}
					else
					{
						warning("Test 14: update_report (officer, all field types)", "values not persisted as expected");
					}
				}
			}

			running("Test 15: update_report (locked auto-populated field)");
			if (!fieldsReady)
			{
				skipped("Test 15: update_report (locked auto-populated field)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, officerName.section.report_section_id, {[officerName.field.field_id]: "Somebody Else"});
				expectRc("Test 15: update_report (locked auto-populated field)", rv, 732, "correctly rejected change of a locked field");
			}

			running("Test 16: update_report (invalid dropdown option)");
			if (!fieldsReady)
			{
				skipped("Test 16: update_report (invalid dropdown option)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, risk.section.report_section_id, {[risk.field.field_id]: ["Extreme"]});
				expectRc("Test 16: update_report (invalid dropdown option)", rv, 731, "correctly rejected unknown option");
			}

			running("Test 17: update_report (text above max_chars)");
			if (!fieldsReady)
			{
				skipped("Test 17: update_report (text above max_chars)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, narrative.section.report_section_id, {[narrative.field.field_id]: "x".repeat(501)});
				expectRc("Test 17: update_report (text above max_chars)", rv, 731, "correctly rejected 501 characters (max 500)");
			}

			running("Test 18: update_report (text at max_chars boundary)");
			if (!fieldsReady)
			{
				skipped("Test 18: update_report (text at max_chars boundary)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, internal.section.report_section_id, {[internal.field.field_id]: "y".repeat(500)});
				if ($Err.isERR(rv))
				{
					warning("Test 18: update_report (text at max_chars boundary)", "rejected a 500-character value", {rc: rv.rc});
				}
				else
				{
					passed("Test 18: update_report (text at max_chars boundary)");
				}
			}

			running("Test 19: update_report (unknown section)");
			rv = updateSingle(officerAId, 999999999, {});
			expectRc("Test 19: update_report (unknown section)", rv, 733, "correctly rejected unknown report section");

			running("Test 20: update_report (attachment not in field)");
			if (!fieldsReady)
			{
				skipped("Test 20: update_report (attachment not in field)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, media.section.report_section_id, {[media.field.field_id]: {attachment_ids: [999999999], file_ids: []}});
				expectRc("Test 20: update_report (attachment not in field)", rv, 739, "correctly rejected foreign attachment");
			}

			running("Test 21: update_report (file limit exceeded)");
			if (!fieldsReady || fileId2 === null)
			{
				skipped("Test 21: update_report (file limit exceeded)", "report fields or files not available");
			}
			else
			{
				let current = getReportAs(officerAId, reportAId);
				let keep = findField(current, "media").field.attachments.map(a => a.attachment_id);
				rv = updateSingle(officerAId, media.section.report_section_id, {[media.field.field_id]: {attachment_ids: keep, file_ids: [fileId1, fileId2]}});
				expectRc("Test 21: update_report (file limit exceeded)", rv, 738, "correctly rejected 3 files (max 2)");
			}

			running("Test 22: update_report (unknown uploaded file ID)");
			if (!fieldsReady)
			{
				skipped("Test 22: update_report (unknown uploaded file ID)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, media.section.report_section_id, {[media.field.field_id]: {attachment_ids: [], file_ids: ["no_such_file_" + uniqueId]}});
				expectRc("Test 22: update_report (unknown uploaded file ID)", rv, 321, "correctly rejected unknown file ID");
			}

			running("Test 23: update_report (missing sections parameter)");
			rv = callAs(officerAId, "Report/update_report", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				passed("Test 23: update_report (missing sections parameter)", {message: "correctly rejected", rc: rv.rc});
			}
			else
			{
				warning("Test 23: update_report (missing sections parameter)", "accepted missing sections");
			}

			running("Test 24: update_report (no effective change)");
			if (!fieldsReady)
			{
				skipped("Test 24: update_report (no effective change)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, narrative.section.report_section_id, {[narrative.field.field_id]: "Rear door forced open; suspect left on foot."});
				if (!$Err.isERR(rv) && rv.changed === false)
				{
					passed("Test 24: update_report (no effective change)", {changed: false});
				}
				else
				{
					warning("Test 24: update_report (no effective change)", "expected changed=false", {rc: rv.rc, changed: rv.changed});
				}
			}

			running("Test 25: update_report (unicode + special characters)");
			if (!fieldsReady)
			{
				skipped("Test 25: update_report (unicode + special characters)", "report fields not available");
			}
			else
			{
				let unicodeText = `Notes & "quotes" <tags> 测试 Тест ${uniqueId}`;
				rv = updateSingle(officerAId, internal.section.report_section_id, {[internal.field.field_id]: unicodeText});
				let r = $Err.isERR(rv) ? null : getReportAs(officerAId, reportAId);
				if (r && findField(r, "custom_internal").field.value === unicodeText)
				{
					passed("Test 25: update_report (unicode + special characters)");
				}
				else
				{
					warning("Test 25: update_report (unicode + special characters)", "value not stored verbatim", {rc: rv.rc});
				}
			}

			running("Test 26: update_report (editable auto-populated description)");
			if (reportCallId === null)
			{
				skipped("Test 26: update_report (editable auto-populated description)", "call-linked report was not created");
			}
			else
			{
				let rc1 = getReportAs(officerAId, reportCallId);
				let desc = rc1 ? findField(rc1, "incident_description") : null;
				let narr = rc1 ? findField(rc1, "custom_narrative") : null;
				rv = desc ? callAs(officerAId, "Report/update_report", {
					report_id: reportCallId,
					sections: [{report_section_id: desc.section.report_section_id, values: {[desc.field.field_id]: "Expanded call description", [narr.field.field_id]: "Call narrative"}}]
				}) : {rc: -1};
				if ($Err.isERR(rv))
				{
					failed("Test 26: update_report (editable auto-populated description)", rv.message || "field not found");
				}
				else
				{
					passed("Test 26: update_report (editable auto-populated description)");
				}
			}

			// =================================================================
			// Listing & access scoping
			// =================================================================

			running("Test 27: get_reports_list (officer, own drafts + search)");
			rv = callAs(officerAId, "Report/get_reports_list", {statuses: ["draft"], search_text: uniqueId});
			if ($Err.isERR(rv))
			{
				failed("Test 27: get_reports_list (officer, own drafts + search)", rv.message);
			}
			else
			{
				let ids = rv.reports.map(r => r.report_id);
				if (ids.includes(reportAId) && rv.reports.every(r => r.status === "draft") && rv.num_of_items >= 1 && rv.num_of_pages >= 1)
				{
					passed("Test 27: get_reports_list (officer, own drafts + search)", {num_of_items: rv.num_of_items});
				}
				else
				{
					warning("Test 27: get_reports_list (officer, own drafts + search)", "own draft not listed");
				}
			}

			running("Test 28: get_reports_list (other officer does not see the report)");
			if (officerBId === null)
			{
				skipped("Test 28: get_reports_list (other officer does not see the report)", "officer B was not created");
			}
			else
			{
				rv = callAs(officerBId, "Report/get_reports_list", {});
				if (!$Err.isERR(rv) && !rv.reports.some(r => r.report_id === reportAId))
				{
					passed("Test 28: get_reports_list (other officer does not see the report)");
				}
				else
				{
					warning("Test 28: get_reports_list (other officer does not see the report)", "foreign report visible", {rc: rv.rc});
				}
			}

			running("Test 29: get_report (other officer)");
			if (officerBId === null)
			{
				skipped("Test 29: get_report (other officer)", "officer B was not created");
			}
			else
			{
				rv = callAs(officerBId, "Report/get_report", {report_id: reportAId});
				expectRc("Test 29: get_report (other officer)", rv, 710, "correctly hid another officer's report");
			}

			running("Test 30: get_report (admin, draft is hidden)");
			rv = $executeAPI(session, "Report/get_report", {report_id: reportAId});
			expectRc("Test 30: get_report (admin, draft is hidden)", rv, 710, "drafts are not visible to managers");

			running("Test 31: get_report (invalid ID)");
			rv = $executeAPI(session, "Report/get_report", {report_id: 999999999});
			expectRc("Test 31: get_report (invalid ID)", rv, 710, "correctly returned not found");

			// =================================================================
			// Submission
			// =================================================================

			running("Test 32: submit_report (required fields missing)");
			if (reportPoiId === null)
			{
				skipped("Test 32: submit_report (required fields missing)", "POI report was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/submit_report", {report_id: reportPoiId});
				let hasNarrative = rv.rc === 730 && Array.isArray(rv.missing_fields) && rv.missing_fields.some(m => m.label === "Narrative");
				if (hasNarrative)
				{
					passed("Test 32: submit_report (required fields missing)", {missing_fields: rv.missing_fields.length});
				}
				else
				{
					warning("Test 32: submit_report (required fields missing)", "expected rc 730 with Narrative in missing_fields", {rc: rv.rc});
				}
			}

			running("Test 33: submit_report (other officer)");
			if (officerBId === null)
			{
				skipped("Test 33: submit_report (other officer)", "officer B was not created");
			}
			else
			{
				rv = callAs(officerBId, "Report/submit_report", {report_id: reportAId});
				expectRc("Test 33: submit_report (other officer)", rv, 710, "correctly rejected foreign submission");
			}

			running("Test 34: submit_report (draft -> submitted)");
			rv = callAs(officerAId, "Report/submit_report", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 34: submit_report (draft -> submitted)", rv.message, {missing_fields: rv.missing_fields});
			}
			else
			{
				if (rv.status === "submitted")
				{
					passed("Test 34: submit_report (draft -> submitted)", {report_status: rv.status});
				}
				else
				{
					warning("Test 34: submit_report (draft -> submitted)", "unexpected status", {report_status: rv.status});
				}
			}

			running("Test 35: submit_report (already submitted)");
			rv = callAs(officerAId, "Report/submit_report", {report_id: reportAId});
			expectRc("Test 35: submit_report (already submitted)", rv, 712, "correctly rejected double submission");

			running("Test 36: notification side effect (report_submitted to a manager)");
			let submittedNotifs = $Db.executeQuery(
				`SELECT COUNT(*) total FROM \`notification\`
				 WHERE NTF_TYPE=? AND JSON_EXTRACT(NTF_PAYLOAD, '$.entity_id')=? AND NTF_DELETED_ON IS NULL`,
				["report_submitted", reportAId]);
			if (submittedNotifs[0].total > 0)
			{
				passed("Test 36: notification side effect (report_submitted to a manager)", {count: submittedNotifs[0].total});
			}
			else
			{
				warning("Test 36: notification side effect (report_submitted to a manager)", "no report_submitted notification (setting disabled or no manager)");
			}

			running("Test 37: update_report (officer while submitted, template allows editing)");
			if (!fieldsReady)
			{
				skipped("Test 37: update_report (officer while submitted, template allows editing)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, internal.section.report_section_id, {[internal.field.field_id]: "Edited after submit"});
				if ($Err.isERR(rv))
				{
					failed("Test 37: update_report (officer while submitted, template allows editing)", rv.message);
				}
				else
				{
					passed("Test 37: update_report (officer while submitted, template allows editing)", {changed: rv.changed});
				}
			}

			// =================================================================
			// Admin queue
			// =================================================================

			running("Test 38: get_reports_list (admin, all filters)");
			rv = $executeAPI(session, "Report/get_reports_list", {
				statuses: ["submitted"],
				community_ids: [testCommunityId],
				officer_user_ids: [officerAId],
				category: "incident",
				review_required: true,
				from_date: "2000-01-01",
				to_date: "2099-12-31",
				search_text: String(reportAId),
				sort_by: "report_id",
				sort_dir: "asc",
				page: 0
			});
			if ($Err.isERR(rv))
			{
				failed("Test 38: get_reports_list (admin, all filters)", rv.message);
			}
			else
			{
				let item = rv.reports.find(r => r.report_id === reportAId);
				if (item && item.status === "submitted" && item.review_lock && item.review_lock.is_locked === false && item.officer_user_id === officerAId)
				{
					passed("Test 38: get_reports_list (admin, all filters)", {num_of_items: rv.num_of_items});
				}
				else
				{
					warning("Test 38: get_reports_list (admin, all filters)", "submitted report not found with expected fields");
				}
			}

			running("Test 39: get_reports_list (admin, drafts excluded)");
			rv = $executeAPI(session, "Report/get_reports_list", {community_ids: [testCommunityId]});
			if (!$Err.isERR(rv) && rv.reports.every(r => r.status !== "draft"))
			{
				passed("Test 39: get_reports_list (admin, drafts excluded)", {num_of_items: rv.num_of_items});
			}
			else
			{
				warning("Test 39: get_reports_list (admin, drafts excluded)", "draft visible to admin", {rc: rv.rc});
			}

			running("Test 40: get_reports_list (invalid status filter)");
			rv = $executeAPI(session, "Report/get_reports_list", {statuses: ["no_such_status"]});
			expectRc("Test 40: get_reports_list (invalid status filter)", rv, 737, "correctly rejected invalid status");

			running("Test 41: get_reports_list (invalid category)");
			rv = $executeAPI(session, "Report/get_reports_list", {category: "no_such_category"});
			expectRc("Test 41: get_reports_list (invalid category)", rv, 716, "correctly rejected invalid category");

			running("Test 42: get_reports_list (invalid date)");
			rv = $executeAPI(session, "Report/get_reports_list", {from_date: "2026-13-45"});
			expectRc("Test 42: get_reports_list (invalid date)", rv, 105, "correctly rejected invalid date");

			running("Test 43: get_reports_list (page out of range)");
			let pageHigh = $executeAPI(session, "Report/get_reports_list", {community_ids: [testCommunityId], page: 9999});
			let pageNeg = $executeAPI(session, "Report/get_reports_list", {community_ids: [testCommunityId], page: -1});
			if (!$Err.isERR(pageHigh) && pageHigh.reports.length === 0 && !$Err.isERR(pageNeg) && pageNeg.reports.length === 0 && pageHigh.num_of_items === pageNeg.num_of_items)
			{
				passed("Test 43: get_reports_list (page out of range)", {num_of_items: pageHigh.num_of_items, num_of_pages: pageHigh.num_of_pages});
			}
			else
			{
				warning("Test 43: get_reports_list (page out of range)", "expected empty pages with totals");
			}

			// =================================================================
			// Review workflow
			// =================================================================

			running("Test 44: approve_report (without review)");
			rv = $executeAPI(session, "Report/approve_report", {report_id: reportAId});
			expectRc("Test 44: approve_report (without review)", rv, 713, "approval requires an active review");

			running("Test 45: request_changes (without review)");
			rv = $executeAPI(session, "Report/request_changes", {report_id: reportAId, comments: "Too early"});
			expectRc("Test 45: request_changes (without review)", rv, 729, "change request requires an active review");

			running("Test 46: update_report (admin without review)");
			if (!fieldsReady)
			{
				skipped("Test 46: update_report (admin without review)", "report fields not available");
			}
			else
			{
				rv = updateSingle(adminUserId, internal.section.report_section_id, {}, {manager_notes: "Too early"});
				expectRc("Test 46: update_report (admin without review)", rv, 726, "admin edits require an active review");
			}

			running("Test 47: start_review (submitted -> under_review)");
			rv = $executeAPI(session, "Report/start_review", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 47: start_review (submitted -> under_review)", rv.message);
			}
			else
			{
				if (rv.status === "under_review" && !!rv.expires_on)
				{
					passed("Test 47: start_review (submitted -> under_review)", {expires_on: rv.expires_on});
				}
				else
				{
					warning("Test 47: start_review (submitted -> under_review)", "unexpected response", {report_status: rv.status});
				}
			}

			running("Test 48: start_review (same reviewer refreshes lock)");
			rv = $executeAPI(session, "Report/start_review", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 48: start_review (same reviewer refreshes lock)", rv.message);
			}
			else
			{
				passed("Test 48: start_review (same reviewer refreshes lock)", {expires_on: rv.expires_on});
			}

			running("Test 49: notification side effect (report_under_review to officer)");
			let underReviewCount = countNotifications(officerAId, "report_under_review", reportAId);
			if (underReviewCount > 0)
			{
				passed("Test 49: notification side effect (report_under_review to officer)", {count: underReviewCount});
			}
			else
			{
				warning("Test 49: notification side effect (report_under_review to officer)", "no notification (setting may be disabled)");
			}

			running("Test 50: update_report (officer while under review)");
			if (!fieldsReady)
			{
				skipped("Test 50: update_report (officer while under review)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, internal.section.report_section_id, {[internal.field.field_id]: "Should fail"});
				expectRc("Test 50: update_report (officer while under review)", rv, 726, "officer cannot edit during review");
			}

			running("Test 51: get_reports_list (admin, lock indicator)");
			rv = $executeAPI(session, "Report/get_reports_list", {statuses: ["under_review"], community_ids: [testCommunityId]});
			if ($Err.isERR(rv))
			{
				failed("Test 51: get_reports_list (admin, lock indicator)", rv.message);
			}
			else
			{
				let item = rv.reports.find(r => r.report_id === reportAId);
				if (item && item.review_lock.is_locked === true && item.review_lock.locked_by === adminUserId && item.reviewer_user_id === adminUserId && !!item.review_lock.expires_on)
				{
					passed("Test 51: get_reports_list (admin, lock indicator)", {locked_by_name: item.review_lock.locked_by_name});
				}
				else
				{
					warning("Test 51: get_reports_list (admin, lock indicator)", "lock indicator not as expected");
				}
			}

			running("Test 52: update_report (admin: value, manager notes, client visibility)");
			if (!fieldsReady)
			{
				skipped("Test 52: update_report (admin: value, manager notes, client visibility)", "report fields not available");
			}
			else
			{
				rv = $executeAPI(session, "Report/update_report", {
					report_id: reportAId,
					sections: [
						{report_section_id: narrative.section.report_section_id, values: {[narrative.field.field_id]: "Rear door forced open (verified on CCTV)."}, manager_notes: "Verified with CCTV footage"},
						{report_section_id: media.section.report_section_id, client_included: false}
					]
				});
				if ($Err.isERR(rv))
				{
					failed("Test 52: update_report (admin: value, manager notes, client visibility)", rv.message);
				}
				else
				{
					let adminView = getReportAs(adminUserId, reportAId);
					let n = adminView ? findField(adminView, "custom_narrative") : null;
					let ok = adminView && n &&
						n.field.value === "Rear door forced open (verified on CCTV)." &&
						n.field.submitted_value === "Rear door forced open; suspect left on foot." &&
						n.section.manager_notes === "Verified with CCTV footage" &&
						findSection(adminView, "Evidence").client_included === false &&
						adminView.can_edit === true && adminView.review_lock.is_locked === true;
					if (ok)
					{
						passed("Test 52: update_report (admin: value, manager notes, client visibility)");
					}
					else
					{
						warning("Test 52: update_report (admin: value, manager notes, client visibility)", "admin edits not reflected as expected");
					}
				}
			}

			running("Test 53: get_report (officer view hides manager data)");
			let officerView = getReportAs(officerAId, reportAId);
			if (officerView && officerView.sections.every(s => s.manager_notes === undefined) && officerView.sections.every(s => s.fields.every(f => f.submitted_value === undefined)) && officerView.review_lock === undefined && officerView.history === undefined && officerView.can_edit === false)
			{
				passed("Test 53: get_report (officer view hides manager data)");
			}
			else
			{
				warning("Test 53: get_report (officer view hides manager data)", "manager-only data exposed to officer");
			}

			running("Test 54: update_report (admin, locked field)");
			if (!fieldsReady)
			{
				skipped("Test 54: update_report (admin, locked field)", "report fields not available");
			}
			else
			{
				rv = updateSingle(adminUserId, officerName.section.report_section_id, {[officerName.field.field_id]: "Manager Override"});
				expectRc("Test 54: update_report (admin, locked field)", rv, 732, "locked for managers too");
			}

			running("Test 55: request_changes (empty comments)");
			rv = $executeAPI(session, "Report/request_changes", {report_id: reportAId, comments: "   "});
			expectRc("Test 55: request_changes (empty comments)", rv, 734, "comments are mandatory");

			running("Test 56: request_changes (comments above 1000 chars)");
			rv = $executeAPI(session, "Report/request_changes", {report_id: reportAId, comments: "c".repeat(1001)});
			expectRc("Test 56: request_changes (comments above 1000 chars)", rv, 105, "correctly rejected 1001 characters");

			running("Test 57: request_changes (under_review -> changes_requested)");
			rv = $executeAPI(session, "Report/request_changes", {report_id: reportAId, comments: `Add the suspect description ${uniqueId}`});
			if ($Err.isERR(rv))
			{
				failed("Test 57: request_changes (under_review -> changes_requested)", rv.message);
			}
			else
			{
				let r = getReportAs(officerAId, reportAId);
				if (rv.status === "changes_requested" && r && r.changes_comment === `Add the suspect description ${uniqueId}` && r.can_edit === true)
				{
					passed("Test 57: request_changes (under_review -> changes_requested)");
				}
				else
				{
					warning("Test 57: request_changes (under_review -> changes_requested)", "officer view does not show the change request");
				}
			}

			running("Test 58: notification side effect (report_changes_requested to officer)");
			let changesCount = countNotifications(officerAId, "report_changes_requested", reportAId);
			if (changesCount > 0)
			{
				passed("Test 58: notification side effect (report_changes_requested to officer)", {count: changesCount});
			}
			else
			{
				warning("Test 58: notification side effect (report_changes_requested to officer)", "no notification (setting may be disabled)");
			}

			running("Test 59: submit_report (resubmission returns to the same reviewer)");
			if (fieldsReady)
			{
				updateSingle(officerAId, narrative.section.report_section_id, {[narrative.field.field_id]: "Rear door forced; male, 1.80m, dark hoodie."});
			}
			rv = callAs(officerAId, "Report/submit_report", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 59: submit_report (resubmission returns to the same reviewer)", rv.message);
			}
			else
			{
				if (rv.status === "under_review")
				{
					passed("Test 59: submit_report (resubmission returns to the same reviewer)", {report_status: rv.status});
				}
				else
				{
					warning("Test 59: submit_report (resubmission returns to the same reviewer)", "expected under_review", {report_status: rv.status});
				}
			}

			let sectionIds = officerView ? officerView.sections.map(s => s.report_section_id) : [];
			let detailsSectionId = narrative ? narrative.section.report_section_id : null;
			let evidenceSectionId = media ? media.section.report_section_id : null;

			running("Test 60: approve_report (unknown section in checklist)");
			rv = $executeAPI(session, "Report/approve_report", {report_id: reportAId, included_section_ids: [999999999]});
			expectRc("Test 60: approve_report (unknown section in checklist)", rv, 733, "correctly rejected unknown section");

			running("Test 61: approve_report (summary above 1000 chars)");
			rv = $executeAPI(session, "Report/approve_report", {report_id: reportAId, management_summary: "s".repeat(1001)});
			expectRc("Test 61: approve_report (summary above 1000 chars)", rv, 105, "correctly rejected 1001 characters");

			running("Test 62: approve_report (checklist + management summary)");
			if (detailsSectionId === null || evidenceSectionId === null)
			{
				skipped("Test 62: approve_report (checklist + management summary)", "section IDs not available");
			}
			else
			{
				rv = $executeAPI(session, "Report/approve_report", {
					report_id: reportAId,
					included_section_ids: [detailsSectionId, evidenceSectionId],
					management_summary: "Resolved on site; no further action required."
				});
				if ($Err.isERR(rv))
				{
					failed("Test 62: approve_report (checklist + management summary)", rv.message);
				}
				else
				{
					let adminView = getReportAs(adminUserId, reportAId);
					let flags = adminView ? adminView.sections.map(s => ({id: s.report_section_id, inc: s.client_included})) : [];
					let ok = rv.status === "approved" && adminView &&
						adminView.management_summary === "Resolved on site; no further action required." &&
						flags.every(f => f.inc === (f.id === detailsSectionId || f.id === evidenceSectionId)) &&
						adminView.review_lock.is_locked === false;
					if (ok)
					{
						passed("Test 62: approve_report (checklist + management summary)", {sections: sectionIds.length});
					}
					else
					{
						warning("Test 62: approve_report (checklist + management summary)", "inclusion / summary / lock not as expected", {flags: flags});
					}
				}
			}

			// =================================================================
			// Review lock conflicts and release (call-linked report)
			// =================================================================

			running("Test 63: submit_report (call-linked report)");
			if (reportCallId === null)
			{
				skipped("Test 63: submit_report (call-linked report)", "call-linked report was not created");
			}
			else
			{
				rv = callAs(officerAId, "Report/submit_report", {report_id: reportCallId});
				if (!$Err.isERR(rv) && rv.status === "submitted")
				{
					passed("Test 63: submit_report (call-linked report)");
				}
				else
				{
					failed("Test 63: submit_report (call-linked report)", rv.message || "unexpected status", {missing_fields: rv.missing_fields});
				}
			}

			running("Test 64: deliver_report (not approved)");
			if (reportCallId === null)
			{
				skipped("Test 64: deliver_report (not approved)", "call-linked report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Report/deliver_report", {report_id: reportCallId});
				expectRc("Test 64: deliver_report (not approved)", rv, 714, "only approved reports can be delivered");
			}

			running("Test 65: start_review (held by another user)");
			if (reportCallId === null || officerBId === null)
			{
				skipped("Test 65: start_review (held by another user)", "prerequisites not created");
			}
			else
			{
				$EntityLock.acquire("incident_report", reportCallId, officerBId);
				rv = $executeAPI(session, "Report/start_review", {report_id: reportCallId});
				$EntityLock.release("incident_report", reportCallId, officerBId);
				if (rv.rc === 727 && rv.locked_by === officerBId && !!rv.expires_on)
				{
					passed("Test 65: start_review (held by another user)", {locked_by_name: rv.locked_by_name});
				}
				else
				{
					warning("Test 65: start_review (held by another user)", "expected rc 727 with lock details", {rc: rv.rc});
				}
			}

			running("Test 66: release_review (under_review -> submitted)");
			if (reportCallId === null)
			{
				skipped("Test 66: release_review (under_review -> submitted)", "call-linked report was not created");
			}
			else
			{
				$executeAPI(session, "Report/start_review", {report_id: reportCallId});
				rv = $executeAPI(session, "Report/release_review", {report_id: reportCallId});
				let item = $executeAPI(session, "Report/get_reports_list", {statuses: ["submitted"], search_text: String(reportCallId)});
				let listed = !$Err.isERR(item) ? item.reports.find(r => r.report_id === reportCallId) : null;
				if (!$Err.isERR(rv) && rv.status === "submitted" && listed && listed.review_lock.is_locked === false && listed.reviewer_user_id === null)
				{
					passed("Test 66: release_review (under_review -> submitted)");
				}
				else
				{
					warning("Test 66: release_review (under_review -> submitted)", "release not reflected", {rc: rv.rc});
				}
			}

			running("Test 67: release_review (not under review)");
			if (reportCallId === null)
			{
				skipped("Test 67: release_review (not under review)", "call-linked report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Report/release_review", {report_id: reportCallId});
				expectRc("Test 67: release_review (not under review)", rv, 728, "correctly rejected release of a submitted report");
			}

			// =================================================================
			// Delivery & PDF
			// =================================================================

			running("Test 68: deliver_report (approved -> delivered)");
			rv = $executeAPI(session, "Report/deliver_report", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 68: deliver_report (approved -> delivered)", rv.message);
			}
			else
			{
				if (rv.status === "delivered" && !$Utils.empty(rv.pdf_url))
				{
					passed("Test 68: deliver_report (approved -> delivered)", {pdf_url: rv.pdf_url});
				}
				else
				{
					warning("Test 68: deliver_report (approved -> delivered)", "missing pdf_url or wrong status", {report_status: rv.status});
				}
			}

			running("Test 69: delivered PDF stored under the container file name");
			let pdfRow = $Db.executeQuery(
				`SELECT IRP_PDF_FILE_NAME, FIL_ACCESS_LEVEL
				 FROM \`incident_report\`
					 LEFT OUTER JOIN \`file\` ON IRP_PDF_FILE_NAME = FIL_FILE_NAME
				 WHERE IRP_ID=?`,
				[reportAId]);
			if (pdfRow.length > 0 && !$Utils.empty(pdfRow[0].IRP_PDF_FILE_NAME) && !$Utils.empty(pdfRow[0].FIL_ACCESS_LEVEL))
			{
				passed("Test 69: delivered PDF stored under the container file name", {access_level: pdfRow[0].FIL_ACCESS_LEVEL});
			}
			else
			{
				warning("Test 69: delivered PDF stored under the container file name", "PDF file name does not match a stored file");
			}

			running("Test 70: update_report (after delivery)");
			if (!fieldsReady)
			{
				skipped("Test 70: update_report (after delivery)", "report fields not available");
			}
			else
			{
				rv = updateSingle(officerAId, internal.section.report_section_id, {[internal.field.field_id]: "Too late"});
				expectRc("Test 70: update_report (after delivery)", rv, 726, "delivered reports are final");
			}

			running("Test 71: request_changes (after delivery)");
			rv = $executeAPI(session, "Report/request_changes", {report_id: reportAId, comments: "Too late"});
			expectRc("Test 71: request_changes (after delivery)", rv, 729, "delivered reports are final");

			running("Test 72: export_report_pdf (admin, stored PDF)");
			rv = $executeAPI(session, "Report/export_report_pdf", {report_id: reportAId});
			if (!$Err.isERR(rv) && rv.regenerated === false && !$Utils.empty(rv.pdf_url))
			{
				passed("Test 72: export_report_pdf (admin, stored PDF)");
			}
			else
			{
				warning("Test 72: export_report_pdf (admin, stored PDF)", "unexpected export response", {rc: rv.rc});
			}

			running("Test 73: export_report_pdf (admin, regenerate=true)");
			rv = $executeAPI(session, "Report/export_report_pdf", {report_id: reportAId, regenerate: true});
			if (!$Err.isERR(rv) && rv.regenerated === true && !$Utils.empty(rv.pdf_url))
			{
				passed("Test 73: export_report_pdf (admin, regenerate=true)");
			}
			else
			{
				warning("Test 73: export_report_pdf (admin, regenerate=true)", "regeneration not reported", {rc: rv.rc, error: rv.message});
			}

			running("Test 74: export_report_pdf (not delivered)");
			if (reportCallId === null)
			{
				skipped("Test 74: export_report_pdf (not delivered)", "call-linked report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Report/export_report_pdf", {report_id: reportCallId});
				expectRc("Test 74: export_report_pdf (not delivered)", rv, 742, "PDF only available after delivery");
			}

			running("Test 75: get_report_history (full audit trail)");
			rv = $executeAPI(session, "Report/get_report_history", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 75: get_report_history (full audit trail)", rv.message);
			}
			else
			{
				let actions = rv.history.map(h => h.action);
				let expected = ["created", "submitted", "review_started", "updated", "changes_requested", "approved", "delivered", "pdf_regenerated"];
				let missing = expected.filter(a => !actions.includes(a));
				let managerEdit = rv.history.find(h => h.action === "updated" && h.user_id === adminUserId);
				if (missing.length === 0 && managerEdit && Array.isArray(managerEdit.changes) && managerEdit.changes.length > 0)
				{
					passed("Test 75: get_report_history (full audit trail)", {entries: rv.history.length});
				}
				else
				{
					warning("Test 75: get_report_history (full audit trail)", "history incomplete", {missing: missing});
				}
			}

			running("Test 76: get_report_history (draft report)");
			if (reportPoiId === null)
			{
				skipped("Test 76: get_report_history (draft report)", "POI report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Report/get_report_history", {report_id: reportPoiId});
				expectRc("Test 76: get_report_history (draft report)", rv, 710, "draft history hidden from managers");
			}

			// =================================================================
			// Resident / client access
			// =================================================================

			running("Test 77: get_reports_list (resident, delivered report)");
			rv = callAs(resident1Id, "Report/get_reports_list", {category: "incident"});
			if ($Err.isERR(rv))
			{
				failed("Test 77: get_reports_list (resident, delivered report)", rv.message);
			}
			else
			{
				let item = rv.reports.find(r => r.report_id === reportAId);
				if (item && !$Utils.empty(item.pdf_url) && item.status === undefined && item.officer_name === undefined && !rv.reports.some(r => r.report_id === reportCallId))
				{
					passed("Test 77: get_reports_list (resident, delivered report)", {num_of_items: rv.num_of_items});
				}
				else
				{
					warning("Test 77: get_reports_list (resident, delivered report)", "resident list not as expected");
				}
			}

			running("Test 78: get_report_for_client (client-included sections only)");
			rv = callAs(resident1Id, "Report/get_report_for_client", {report_id: reportAId});
			if ($Err.isERR(rv))
			{
				failed("Test 78: get_report_for_client (client-included sections only)", rv.message);
			}
			else
			{
				let titles = rv.report.sections.map(s => s.title);
				let ok = titles.includes("Incident Details") && titles.includes("Evidence") && !titles.includes("Internal Assessment") &&
					rv.report.sections.every(s => s.manager_notes === undefined && s.client_included === undefined) &&
					rv.report.sections.every(s => s.fields.every(f => f.config === undefined && f.is_locked === undefined)) &&
					rv.report.management_summary === "Resolved on site; no further action required." &&
					rv.report.status === undefined;
				if (ok)
				{
					passed("Test 78: get_report_for_client (client-included sections only)", {sections: titles});
				}
				else
				{
					warning("Test 78: get_report_for_client (client-included sections only)", "internal data exposed or sections wrong", {sections: titles});
				}
			}

			running("Test 79: get_report (resident gets the client view)");
			rv = callAs(resident1Id, "Report/get_report", {report_id: reportAId});
			if (!$Err.isERR(rv) && rv.report.sections.every(s => s.title !== "Internal Assessment") && rv.report.history === undefined)
			{
				passed("Test 79: get_report (resident gets the client view)");
			}
			else
			{
				warning("Test 79: get_report (resident gets the client view)", "resident received a non-client view", {rc: rv.rc});
			}

			running("Test 80: export_report_pdf (resident, regenerate ignored)");
			rv = callAs(resident1Id, "Report/export_report_pdf", {report_id: reportAId, regenerate: true});
			if (!$Err.isERR(rv) && rv.regenerated === false && !$Utils.empty(rv.pdf_url))
			{
				passed("Test 80: export_report_pdf (resident, regenerate ignored)");
			}
			else
			{
				warning("Test 80: export_report_pdf (resident, regenerate ignored)", "unexpected response", {rc: rv.rc});
			}

			running("Test 81: notification side effect (new_incident_report to recipient)");
			let clientCount = countNotifications(resident1Id, "new_incident_report", reportAId);
			if (clientCount > 0)
			{
				passed("Test 81: notification side effect (new_incident_report to recipient)", {count: clientCount});
			}
			else
			{
				warning("Test 81: notification side effect (new_incident_report to recipient)", "no notification (setting may be disabled)");
			}

			running("Test 82: get_report_for_client (other resident, addressed report)");
			if (resident2Id === null)
			{
				skipped("Test 82: get_report_for_client (other resident, addressed report)", "resident 2 was not created");
			}
			else
			{
				rv = callAs(resident2Id, "Report/get_report_for_client", {report_id: reportAId});
				expectRc("Test 82: get_report_for_client (other resident, addressed report)", rv, 710, "addressed report hidden from other residents");
			}

			running("Test 83: get_report_for_client (undelivered report)");
			if (reportCallId === null)
			{
				skipped("Test 83: get_report_for_client (undelivered report)", "call-linked report was not created");
			}
			else
			{
				rv = callAs(resident1Id, "Report/get_report_for_client", {report_id: reportCallId});
				expectRc("Test 83: get_report_for_client (undelivered report)", rv, 710, "undelivered report hidden from residents");
			}

			// =================================================================
			// Review not required (template B) + community-wide visibility
			// =================================================================

			running("Test 84: submit_report (review not required -> approved)");
			if (reportBId === null)
			{
				skipped("Test 84: submit_report (review not required -> approved)", "template B report was not created");
			}
			else
			{
				let rb = getReportAs(officerAId, reportBId);
				let log = rb ? findField(rb, "custom_log") : null;
				if (log)
				{
					callAs(officerAId, "Report/update_report", {report_id: reportBId, sections: [{report_section_id: log.section.report_section_id, values: {[log.field.field_id]: "Patrol completed, no incidents."}}]});
				}
				rv = callAs(officerAId, "Report/submit_report", {report_id: reportBId});
				if (!$Err.isERR(rv) && rv.status === "approved")
				{
					passed("Test 84: submit_report (review not required -> approved)");
				}
				else
				{
					warning("Test 84: submit_report (review not required -> approved)", "expected auto-approval", {rc: rv.rc, report_status: rv.status});
				}
			}

			running("Test 85: deliver_report (community-wide report)");
			if (reportBId === null)
			{
				skipped("Test 85: deliver_report (community-wide report)", "template B report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Report/deliver_report", {report_id: reportBId});
				if ($Err.isERR(rv))
				{
					failed("Test 85: deliver_report (community-wide report)", rv.message);
				}
				else
				{
					passed("Test 85: deliver_report (community-wide report)");
				}
			}

			running("Test 86: get_report_for_client (community-wide, any resident of the community)");
			if (reportBId === null || resident2Id === null)
			{
				skipped("Test 86: get_report_for_client (community-wide, any resident of the community)", "prerequisites not created");
			}
			else
			{
				let r1 = callAs(resident1Id, "Report/get_report_for_client", {report_id: reportBId});
				let r2 = callAs(resident2Id, "Report/get_report_for_client", {report_id: reportBId});
				if (!$Err.isERR(r1) && !$Err.isERR(r2))
				{
					passed("Test 86: get_report_for_client (community-wide, any resident of the community)");
				}
				else
				{
					warning("Test 86: get_report_for_client (community-wide, any resident of the community)", "community-wide report not visible", {rc1: r1.rc, rc2: r2.rc});
				}
			}

			running("Test 87: no new_incident_report broadcast for community-wide reports");
			if (reportBId === null || resident2Id === null)
			{
				skipped("Test 87: no new_incident_report broadcast for community-wide reports", "prerequisites not created");
			}
			else
			{
				let broadcast = countNotifications(resident2Id, "new_incident_report", reportBId);
				if (broadcast === 0)
				{
					passed("Test 87: no new_incident_report broadcast for community-wide reports");
				}
				else
				{
					warning("Test 87: no new_incident_report broadcast for community-wide reports", "residents were notified", {count: broadcast});
				}
			}

			running("Test 88: get_report_history (auto-approval logged)");
			if (reportBId === null)
			{
				skipped("Test 88: get_report_history (auto-approval logged)", "template B report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Report/get_report_history", {report_id: reportBId});
				let auto = !$Err.isERR(rv) ? rv.history.find(h => h.action === "auto_approved") : null;
				if (auto && auto.user_id === null && auto.to_status === "approved")
				{
					passed("Test 88: get_report_history (auto-approval logged)");
				}
				else
				{
					warning("Test 88: get_report_history (auto-approval logged)", "auto_approved entry missing", {rc: rv.rc});
				}
			}

			// =================================================================
			// POI integration
			// =================================================================

			running("Test 89: Poi/get_poi_record related_reports (officer sees own draft)");
			if (poiId === null || reportPoiId === null)
			{
				skipped("Test 89: Poi/get_poi_record related_reports (officer sees own draft)", "POI report was not created");
			}
			else
			{
				rv = callAs(officerAId, "Poi/get_poi_record", {record_id: poiId});
				let found = !$Err.isERR(rv) && Array.isArray(rv.record.related_reports) && rv.record.related_reports.some(r => r.report_id === reportPoiId && r.status === "draft");
				if (found)
				{
					passed("Test 89: Poi/get_poi_record related_reports (officer sees own draft)");
				}
				else
				{
					warning("Test 89: Poi/get_poi_record related_reports (officer sees own draft)", "linked report not returned", {rc: rv.rc});
				}
			}

			running("Test 90: Poi/get_poi_record related_reports (admin, drafts hidden)");
			if (poiId === null || reportPoiId === null)
			{
				skipped("Test 90: Poi/get_poi_record related_reports (admin, drafts hidden)", "POI report was not created");
			}
			else
			{
				rv = $executeAPI(session, "Poi/get_poi_record", {record_id: poiId});
				if (!$Err.isERR(rv) && Array.isArray(rv.record.related_reports) && !rv.record.related_reports.some(r => r.report_id === reportPoiId))
				{
					passed("Test 90: Poi/get_poi_record related_reports (admin, drafts hidden)");
				}
				else
				{
					warning("Test 90: Poi/get_poi_record related_reports (admin, drafts hidden)", "draft visible to admin", {rc: rv.rc});
				}
			}

			running("Test 91: get_report_metadata (as resident)");
			rv = callAs(resident1Id, "Report/get_report_metadata", {});
			if ($Err.isERR(rv))
			{
				failed("Test 91: get_report_metadata (as resident)", rv.message);
			}
			else
			{
				passed("Test 91: get_report_metadata (as resident)");
			}

			// =================================================================
			// Cleanup: soft-delete test reports and POI record, archive templates
			// =================================================================

			let now = $Utils.now();
			if (createdReportIds.length > 0)
			{
				$Db.executeQuery(
					`UPDATE \`incident_report\` SET IRP_DELETED_ON=? WHERE IRP_ID IN (${createdReportIds.toPlaceholders()}) AND IRP_DELETED_ON IS NULL`,
					[now, ...createdReportIds]);
			}
			if (poiId !== null)
			{
				$Db.executeQuery("UPDATE `poi_record` SET POI_DELETED_ON=? WHERE POI_ID=?", [now, poiId]);
			}
			if (templateAId !== null)
			{
				$executeAPI(session, "ReportTemplate/archive_template", {template_id: templateAId});
			}
			if (templateBId !== null)
			{
				$executeAPI(session, "ReportTemplate/archive_template", {template_id: templateBId});
			}

			testResults.push({step: "All tests completed", status: "success"});
		}
		catch (error)
		{
			testResults.push({step: "Exception occurred", status: "error", error: error.message, stack: error.stack});

			if (session.accountImpersonationStack !== null)
			{
				restoreSession();
			}
		}

		return buildResult();
	}
};
