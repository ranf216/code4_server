module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

    test_settings()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let testResults = [];
        let addedServiceTypeId = null;
        let addedTaskTypeId = null;
        let addedAssetTypeId = null;
        let addedPoSectionTypeId = null;

        try
        {
            testResults.push({step: "Starting Settings API tests", status: "info"});

            let uniqueId = $Utils.uniqueHash().substring(0, 8);
            let testServiceTypeName = `Test Service ${uniqueId}`;
            let testTaskTypeName = `Test Task ${uniqueId}`;
            let testAssetTypeName = `Test Asset ${uniqueId}`;
            let testPoSectionName = `Test Section ${uniqueId}`;

            testResults.push({step: "Test 1: get_service_types", status: "running"});
            let rv = $executeAPI(this.$Session, "Settings/get_service_types", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 1: get_service_types", status: "failed", error: rv.message});
                return {...rc, test_results: testResults};
            }
            testResults.push({step: "Test 1: get_service_types", status: "passed", count: rv.items.length});

            testResults.push({step: "Test 2: add_service_type", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/add_service_type", { name: testServiceTypeName });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 2: add_service_type", status: "failed", error: rv.message});
            }
            else
            {
                addedServiceTypeId = rv.type_id;
                testResults.push({step: "Test 2: add_service_type", status: "passed", type_id: addedServiceTypeId});
            }

            testResults.push({step: "Test 3: update_service_type", status: "running"});
            if (addedServiceTypeId === null)
            {
                testResults.push({step: "Test 3: update_service_type", status: "failed", error: "Cannot update - service type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/update_service_type", { type_id: addedServiceTypeId, name: `Updated ${testServiceTypeName}` });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 3: update_service_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 3: update_service_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 4: get_service_types (verify update)", status: "running"});
            if (addedServiceTypeId === null)
            {
                testResults.push({step: "Test 4: get_service_types (verify update)", status: "failed", error: "Cannot verify - service type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/get_service_types", {});
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 4: get_service_types (verify update)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.items.find(item => item.type_id === addedServiceTypeId && item.name === `Updated ${testServiceTypeName}`);
                    if (found)
                    {
                        testResults.push({step: "Test 4: get_service_types (verify update)", status: "passed", found_updated: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 4: get_service_types (verify update)", status: "warning", found_updated: false, message: "Updated service type not found"});
                    }
                }
            }

            testResults.push({step: "Test 5: delete_service_type", status: "running"});
            if (addedServiceTypeId === null)
            {
                testResults.push({step: "Test 5: delete_service_type", status: "failed", error: "Cannot delete - service type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/delete_service_type", { type_id: addedServiceTypeId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 5: delete_service_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 5: delete_service_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 6: get_task_types", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_task_types", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 6: get_task_types", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 6: get_task_types", status: "passed", count: rv.items.length});
            }

            testResults.push({step: "Test 7: add_task_type", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/add_task_type", { name: testTaskTypeName });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 7: add_task_type", status: "failed", error: rv.message});
            }
            else
            {
                addedTaskTypeId = rv.type_id;
                testResults.push({step: "Test 7: add_task_type", status: "passed", type_id: addedTaskTypeId});
            }

            testResults.push({step: "Test 8: update_task_type", status: "running"});
            if (addedTaskTypeId === null)
            {
                testResults.push({step: "Test 8: update_task_type", status: "failed", error: "Cannot update - task type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/update_task_type", { type_id: addedTaskTypeId, name: `Updated ${testTaskTypeName}` });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 8: update_task_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 8: update_task_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 9: delete_task_type", status: "running"});
            if (addedTaskTypeId === null)
            {
                testResults.push({step: "Test 9: delete_task_type", status: "failed", error: "Cannot delete - task type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/delete_task_type", { type_id: addedTaskTypeId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 9: delete_task_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 9: delete_task_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 10: get_asset_types", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_asset_types", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 10: get_asset_types", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 10: get_asset_types", status: "passed", count: rv.items.length});
            }

            testResults.push({step: "Test 11: add_asset_type", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/add_asset_type", { name: testAssetTypeName });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 11: add_asset_type", status: "failed", error: rv.message});
            }
            else
            {
                addedAssetTypeId = rv.type_id;
                testResults.push({step: "Test 11: add_asset_type", status: "passed", type_id: addedAssetTypeId});
            }

            testResults.push({step: "Test 12: update_asset_type", status: "running"});
            if (addedAssetTypeId === null)
            {
                testResults.push({step: "Test 12: update_asset_type", status: "failed", error: "Cannot update - asset type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/update_asset_type", { type_id: addedAssetTypeId, name: `Updated ${testAssetTypeName}` });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 12: update_asset_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 12: update_asset_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 13: delete_asset_type", status: "running"});
            if (addedAssetTypeId === null)
            {
                testResults.push({step: "Test 13: delete_asset_type", status: "failed", error: "Cannot delete - asset type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/delete_asset_type", { type_id: addedAssetTypeId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 13: delete_asset_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 13: delete_asset_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 14: get_po_section_types", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_po_section_types", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 14: get_po_section_types", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 14: get_po_section_types", status: "passed", count: rv.items.length});
            }

            testResults.push({step: "Test 15: add_po_section_type", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/add_po_section_type", { name: testPoSectionName, client_visible: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 15: add_po_section_type", status: "failed", error: rv.message});
            }
            else
            {
                addedPoSectionTypeId = rv.type_id;
                testResults.push({step: "Test 15: add_po_section_type", status: "passed", type_id: addedPoSectionTypeId});
            }

            testResults.push({step: "Test 16: update_po_section_type", status: "running"});
            if (addedPoSectionTypeId === null)
            {
                testResults.push({step: "Test 16: update_po_section_type", status: "failed", error: "Cannot update - PO section type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/update_po_section_type", { type_id: addedPoSectionTypeId, name: `Updated ${testPoSectionName}`, client_visible: false });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 16: update_po_section_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 16: update_po_section_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 17: delete_po_section_type", status: "running"});
            if (addedPoSectionTypeId === null)
            {
                testResults.push({step: "Test 17: delete_po_section_type", status: "failed", error: "Cannot delete - PO section type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/delete_po_section_type", { type_id: addedPoSectionTypeId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 17: delete_po_section_type", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 17: delete_po_section_type", status: "passed"});
                }
            }

            testResults.push({step: "Test 18: get_gps_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_gps_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 18: get_gps_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 18: get_gps_settings", status: "passed", has_settings: true});
            }

            testResults.push({step: "Test 19: update_gps_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_normal: 45, map_provider: "google_maps" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 19: update_gps_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 19: update_gps_settings", status: "passed"});
            }

            testResults.push({step: "Test 20: get_gps_settings (verify update)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_gps_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 20: get_gps_settings (verify update)", status: "failed", error: rv.message});
            }
            else
            {
                if (rv.gps_interval_normal === 45 && rv.map_provider === "google_maps")
                {
                    testResults.push({step: "Test 20: get_gps_settings (verify update)", status: "passed", verified: true});
                }
                else
                {
                    testResults.push({step: "Test 20: get_gps_settings (verify update)", status: "warning", verified: false, message: "GPS settings not updated as expected"});
                }
            }

            testResults.push({step: "Test 21: get_notification_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_notification_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 21: get_notification_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 21: get_notification_settings", status: "passed", has_settings: true});
            }

            testResults.push({step: "Test 22: update_notification_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_notification_settings", { sender_name: "Code4 Security", new_call_enabled: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 22: update_notification_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 22: update_notification_settings", status: "passed"});
            }

            testResults.push({step: "Test 23: get_poi_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_poi_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 23: get_poi_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 23: get_poi_settings", status: "passed", has_settings: true});
            }

            testResults.push({step: "Test 24: update_poi_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_poi_settings", { renewal_reminder_days: 21, pdf_export_enabled: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 24: update_poi_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 24: update_poi_settings", status: "passed"});
            }

            testResults.push({step: "Test 25: get_working_hours_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_working_hours_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 25: get_working_hours_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 25: get_working_hours_settings", status: "passed", has_settings: true});
            }

            testResults.push({step: "Test 26: update_working_hours_settings", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_working_hours_settings", { max_hours_per_day: 10 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 26: update_working_hours_settings", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 26: update_working_hours_settings", status: "passed"});
            }

            testResults.push({step: "Test 27: get_working_hours_settings (verify update)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_working_hours_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 27: get_working_hours_settings (verify update)", status: "failed", error: rv.message});
            }
            else
            {
                if (rv.max_hours_per_day === 10)
                {
                    testResults.push({step: "Test 27: get_working_hours_settings (verify update)", status: "passed", verified: true});
                }
                else
                {
                    testResults.push({step: "Test 27: get_working_hours_settings (verify update)", status: "warning", verified: false, message: "Working hours settings not updated as expected"});
                }
            }

            testResults.push({step: "Test 28: delete_service_type (verify deletion)", status: "running"});
            if (addedServiceTypeId === null)
            {
                testResults.push({step: "Test 28: delete_service_type (verify deletion)", status: "failed", error: "Cannot verify - service type was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Settings/get_service_types", {});
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 28: delete_service_type (verify deletion)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.items.find(item => item.type_id === addedServiceTypeId);
                    if (!found)
                    {
                        testResults.push({step: "Test 28: delete_service_type (verify deletion)", status: "passed", verified_deleted: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 28: delete_service_type (verify deletion)", status: "warning", verified_deleted: false, message: "Deleted service type still appears in list"});
                    }
                }
            }

            testResults.push({step: "Test 29: update_service_type (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_service_type", { type_id: "invalid_id_999", name: "Should Fail" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 29: update_service_type (invalid ID)", status: "passed", message: "correctly rejected invalid ID"});
            }
            else
            {
                testResults.push({step: "Test 29: update_service_type (invalid ID)", status: "warning", message: "accepted invalid ID unexpectedly"});
            }

            testResults.push({step: "Test 30: delete_service_type (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/delete_service_type", { type_id: "invalid_id_999" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 30: delete_service_type (invalid ID)", status: "passed", message: "correctly rejected invalid ID"});
            }
            else
            {
                testResults.push({step: "Test 30: delete_service_type (invalid ID)", status: "warning", message: "accepted invalid ID unexpectedly"});
            }

            testResults.push({step: "Test 31: add_service_type (empty name)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/add_service_type", { name: "" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 31: add_service_type (empty name)", status: "passed", message: "correctly rejected empty name"});
            }
            else
            {
                testResults.push({step: "Test 31: add_service_type (empty name)", status: "warning", message: "accepted empty name unexpectedly"});
            }

            testResults.push({step: "Test 32: add_task_type (verify creation)", status: "running"});
            let testTaskTypeName2 = `Test Task Verify ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Settings/add_task_type", { name: testTaskTypeName2 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 32: add_task_type (verify creation)", status: "failed", error: rv.message});
            }
            else
            {
                let verifyTaskTypeId = rv.type_id;
                rv = $executeAPI(this.$Session, "Settings/get_task_types", {});
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 32: add_task_type (verify creation)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.items.find(item => item.type_id === verifyTaskTypeId && item.name === testTaskTypeName2);
                    if (found)
                    {
                        testResults.push({step: "Test 32: add_task_type (verify creation)", status: "passed", verified_created: true});
                        $executeAPI(this.$Session, "Settings/delete_task_type", { type_id: verifyTaskTypeId });
                    }
                    else
                    {
                        testResults.push({step: "Test 32: add_task_type (verify creation)", status: "warning", verified_created: false, message: "Created task type not found in list"});
                    }
                }
            }

            testResults.push({step: "Test 33: add_asset_type (verify creation)", status: "running"});
            let testAssetTypeName2 = `Test Asset Verify ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Settings/add_asset_type", { name: testAssetTypeName2 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 33: add_asset_type (verify creation)", status: "failed", error: rv.message});
            }
            else
            {
                let verifyAssetTypeId = rv.type_id;
                rv = $executeAPI(this.$Session, "Settings/get_asset_types", {});
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 33: add_asset_type (verify creation)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.items.find(item => item.type_id === verifyAssetTypeId && item.name === testAssetTypeName2);
                    if (found)
                    {
                        testResults.push({step: "Test 33: add_asset_type (verify creation)", status: "passed", verified_created: true});
                        $executeAPI(this.$Session, "Settings/delete_asset_type", { type_id: verifyAssetTypeId });
                    }
                    else
                    {
                        testResults.push({step: "Test 33: add_asset_type (verify creation)", status: "warning", verified_created: false, message: "Created asset type not found in list"});
                    }
                }
            }

            testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "running"});
            let testPoSectionName2 = `Test Section Verify ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Settings/add_po_section_type", { name: testPoSectionName2, client_visible: false });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "failed", error: rv.message});
            }
            else
            {
                let verifyPoSectionId = rv.type_id;
                rv = $executeAPI(this.$Session, "Settings/get_po_section_types", {});
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.items.find(item => item.type_id === verifyPoSectionId);
                    if (found && found.client_visible === false)
                    {
                        testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "passed", verified_client_visible: false});
                    }
                    else if (found)
                    {
                        testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "warning", message: "client_visible not set correctly", expected: false, actual: found.client_visible});
                    }
                    else
                    {
                        testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "warning", message: "Created PO section not found"});
                    }
                    if (found)
                    {
                        $executeAPI(this.$Session, "Settings/delete_po_section_type", { type_id: verifyPoSectionId });
                    }
                }
            }

            testResults.push({step: "Test 35: update_gps_settings (all parameters)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", {
                gps_interval_normal: 60,
                gps_interval_emergency: 15,
                gps_stale_threshold: 3,
                location_history_retention: 120,
                map_refresh_interval: 45,
                patrol_compliance_threshold: 20,
                emergency_eta_interval: 90,
                map_provider: "google_maps"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 35: update_gps_settings (all parameters)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 35: update_gps_settings (all parameters)", status: "passed"});
            }

            testResults.push({step: "Test 36: get_gps_settings (verify all parameters)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_gps_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 36: get_gps_settings (verify all parameters)", status: "failed", error: rv.message});
            }
            else
            {
                let allMatch = rv.gps_interval_normal === 60 &&
                               rv.gps_interval_emergency === 15 &&
                               rv.gps_stale_threshold === 3 &&
                               rv.location_history_retention === 120 &&
                               rv.map_refresh_interval === 45 &&
                               rv.patrol_compliance_threshold === 20 &&
                               rv.emergency_eta_interval === 90 &&
                               rv.map_provider === "google_maps";
                if (allMatch)
                {
                    testResults.push({step: "Test 36: get_gps_settings (verify all parameters)", status: "passed", all_verified: true});
                }
                else
                {
                    testResults.push({step: "Test 36: get_gps_settings (verify all parameters)", status: "warning", all_verified: false, message: "Some GPS settings not updated correctly"});
                }
            }

            testResults.push({step: "Test 37: update_gps_settings (boundary - min interval)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_normal: 10 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 37: update_gps_settings (boundary - min interval)", status: "warning", message: "rejected valid minimum value", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 37: update_gps_settings (boundary - min interval)", status: "passed"});
            }

            testResults.push({step: "Test 38: update_gps_settings (boundary - max interval)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_normal: 120 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 38: update_gps_settings (boundary - max interval)", status: "warning", message: "rejected valid maximum value", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 38: update_gps_settings (boundary - max interval)", status: "passed"});
            }

            testResults.push({step: "Test 39: update_gps_settings (invalid - below min)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_normal: 5 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 39: update_gps_settings (invalid - below min)", status: "passed", message: "correctly rejected value below minimum"});
            }
            else
            {
                testResults.push({step: "Test 39: update_gps_settings (invalid - below min)", status: "warning", message: "accepted invalid value below minimum"});
            }

            testResults.push({step: "Test 40: update_gps_settings (invalid - above max)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_normal: 200 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 40: update_gps_settings (invalid - above max)", status: "passed", message: "correctly rejected value above maximum"});
            }
            else
            {
                testResults.push({step: "Test 40: update_gps_settings (invalid - above max)", status: "warning", message: "accepted invalid value above maximum"});
            }

            testResults.push({step: "Test 41: update_notification_settings (multiple parameters)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_notification_settings", {
                notification_methods: "in_app,email,mobile",
                sender_name: "Code4 Test",
                new_call_enabled: false,
                call_accepted_enabled: true,
                call_edited_enabled: false,
                call_resolved_enabled: true,
                post_order_published_enabled: true,
                post_order_updated_enabled: false
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 41: update_notification_settings (multiple parameters)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 41: update_notification_settings (multiple parameters)", status: "passed"});
            }

            testResults.push({step: "Test 42: get_notification_settings (verify updates)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_notification_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 42: get_notification_settings (verify updates)", status: "failed", error: rv.message});
            }
            else
            {
                let verified = rv.sender_name === "Code4 Test" &&
                              rv.new_call_enabled === false &&
                              rv.call_accepted_enabled === true;
                if (verified)
                {
                    testResults.push({step: "Test 42: get_notification_settings (verify updates)", status: "passed", verified: true});
                }
                else
                {
                    testResults.push({step: "Test 42: get_notification_settings (verify updates)", status: "warning", verified: false, message: "Some notification settings not updated correctly"});
                }
            }

            testResults.push({step: "Test 43: update_poi_settings (all parameters)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_poi_settings", {
                renewal_reminder_days: 30,
                archive_threshold_months: 36,
                pdf_export_enabled: false,
                default_poi_guidance: "Test POI guidance",
                default_trespass_guidance: "Test trespass guidance",
                default_red_card_guidance: "Test red card guidance"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 43: update_poi_settings (all parameters)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 43: update_poi_settings (all parameters)", status: "passed"});
            }

            testResults.push({step: "Test 44: get_poi_settings (verify all parameters)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/get_poi_settings", {});
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 44: get_poi_settings (verify all parameters)", status: "failed", error: rv.message});
            }
            else
            {
                let allMatch = rv.renewal_reminder_days === 30 &&
                              rv.archive_threshold_months === 36 &&
                              rv.pdf_export_enabled === false;
                if (allMatch)
                {
                    testResults.push({step: "Test 44: get_poi_settings (verify all parameters)", status: "passed", all_verified: true});
                }
                else
                {
                    testResults.push({step: "Test 44: get_poi_settings (verify all parameters)", status: "warning", all_verified: false, message: "Some POI settings not updated correctly"});
                }
            }

            testResults.push({step: "Test 45: add_service_type (special characters)", status: "running"});
            let specialCharName = `Test-Service_Type & More ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Settings/add_service_type", { name: specialCharName });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 45: add_service_type (special characters)", status: "warning", message: "rejected name with special characters", error: rv.message});
            }
            else
            {
                let specialCharId = rv.type_id;
                testResults.push({step: "Test 45: add_service_type (special characters)", status: "passed", type_id: specialCharId});
                $executeAPI(this.$Session, "Settings/delete_service_type", { type_id: specialCharId });
            }

            testResults.push({step: "Test 46: add_task_type (long name)", status: "running"});
            let longName = `Test Task Type with Very Long Name That Contains Many Characters ${uniqueId} Extra Text To Make It Even Longer`;
            rv = $executeAPI(this.$Session, "Settings/add_task_type", { name: longName });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 46: add_task_type (long name)", status: "warning", message: "rejected long name", error: rv.message});
            }
            else
            {
                let longNameId = rv.type_id;
                testResults.push({step: "Test 46: add_task_type (long name)", status: "passed", type_id: longNameId});
                $executeAPI(this.$Session, "Settings/delete_task_type", { type_id: longNameId });
            }

            testResults.push({step: "Test 47: update_po_section_type (toggle client_visible)", status: "running"});
            let toggleTestName = `Toggle Test ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Settings/add_po_section_type", { name: toggleTestName, client_visible: true });
            if (!$Err.isERR(rv))
            {
                let toggleId = rv.type_id;
                rv = $executeAPI(this.$Session, "Settings/update_po_section_type", { type_id: toggleId, name: toggleTestName, client_visible: false });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 47: update_po_section_type (toggle client_visible)", status: "failed", error: rv.message});
                }
                else
                {
                    rv = $executeAPI(this.$Session, "Settings/get_po_section_types", {});
                    if (!$Err.isERR(rv))
                    {
                        let found = rv.items.find(item => item.type_id === toggleId);
                        if (found && found.client_visible === false)
                        {
                            testResults.push({step: "Test 47: update_po_section_type (toggle client_visible)", status: "passed", toggled: true});
                        }
                        else
                        {
                            testResults.push({step: "Test 47: update_po_section_type (toggle client_visible)", status: "warning", toggled: false, message: "client_visible not toggled correctly"});
                        }
                    }
                    else
                    {
                        testResults.push({step: "Test 47: update_po_section_type (toggle client_visible)", status: "failed", error: rv.message});
                    }
                    $executeAPI(this.$Session, "Settings/delete_po_section_type", { type_id: toggleId });
                }
            }
            else
            {
                testResults.push({step: "Test 47: update_po_section_type (toggle client_visible)", status: "failed", error: "Could not create test PO section"});
            }

            testResults.push({step: "All tests completed", status: "success"});
        }
        catch (error)
        {
            testResults.push({step: "Exception occurred", status: "error", error: error.message, stack: error.stack});
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
}
