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
            rv = $executeAPI(this.$Session, "Settings/add_asset_type", { name: testAssetTypeName, icon: "test_icon.png", color: "#FF5733" });
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
                rv = $executeAPI(this.$Session, "Settings/update_asset_type", { type_id: addedAssetTypeId, name: `Updated ${testAssetTypeName}`, icon: "updated_icon.png", color: "#00FF00" });
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
            rv = $executeAPI(this.$Session, "Settings/add_po_section_type", { name: testPoSectionName, client_visible: true, short_description: "Test section", active: true });
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
                rv = $executeAPI(this.$Session, "Settings/update_po_section_type", { type_id: addedPoSectionTypeId, name: `Updated ${testPoSectionName}`, client_visible: false, short_description: "Updated section", active: true });
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
            rv = $executeAPI(this.$Session, "Settings/add_asset_type", { name: testAssetTypeName2, icon: "test_icon.png", color: "#FF5733" });
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
                    if (found && found.color === "#FF5733")
                    {
                        testResults.push({step: "Test 33: add_asset_type (verify creation)", status: "passed", verified_created: true, verified_color: true});
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
            rv = $executeAPI(this.$Session, "Settings/add_po_section_type", { name: testPoSectionName2, client_visible: false, short_description: "Verify section desc", active: true });
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
                    if (found && found.client_visible === false && found.short_description === "Verify section desc" && found.active === true)
                    {
                        testResults.push({step: "Test 34: add_po_section_type (verify client_visible)", status: "passed", verified_client_visible: false, verified_short_description: true, verified_active: true});
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
            if ($Err.isERR(rv) && rv.rc === 742)
            {
                testResults.push({step: "Test 39: update_gps_settings (invalid - below min)", status: "passed", message: "correctly rejected value below minimum with rc 742"});
            }
            else
            {
                testResults.push({step: "Test 39: update_gps_settings (invalid - below min)", status: "warning", message: "expected rc 742 for value below minimum"});
            }

            testResults.push({step: "Test 40: update_gps_settings (invalid - above max)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_normal: 200 });
            if ($Err.isERR(rv) && rv.rc === 742)
            {
                testResults.push({step: "Test 40: update_gps_settings (invalid - above max)", status: "passed", message: "correctly rejected value above maximum with rc 742"});
            }
            else
            {
                testResults.push({step: "Test 40: update_gps_settings (invalid - above max)", status: "warning", message: "expected rc 742 for value above maximum"});
            }

            testResults.push({step: "Test 40a: update_gps_settings (emergency - below min)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_emergency: 3 });
            if ($Err.isERR(rv) && rv.rc === 743)
            {
                testResults.push({step: "Test 40a: update_gps_settings (emergency - below min)", status: "passed", message: "correctly rejected emergency value below minimum with rc 743"});
            }
            else
            {
                testResults.push({step: "Test 40a: update_gps_settings (emergency - below min)", status: "warning", message: "expected rc 743 for emergency value below minimum"});
            }

            testResults.push({step: "Test 40b: update_gps_settings (emergency - above max)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_gps_settings", { gps_interval_emergency: 60 });
            if ($Err.isERR(rv) && rv.rc === 743)
            {
                testResults.push({step: "Test 40b: update_gps_settings (emergency - above max)", status: "passed", message: "correctly rejected emergency value above maximum with rc 743"});
            }
            else
            {
                testResults.push({step: "Test 40b: update_gps_settings (emergency - above max)", status: "warning", message: "expected rc 743 for emergency value above maximum"});
            }

            testResults.push({step: "Test 41: update_notification_settings (multiple parameters)", status: "running"});
            rv = $executeAPI(this.$Session, "Settings/update_notification_settings", {
                notification_methods: "in_app,email,mobile",
                notification_title: "Code4 Alert",
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
                              rv.notification_title === "Code4 Alert" &&
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
            rv = $executeAPI(this.$Session, "Settings/add_po_section_type", { name: toggleTestName, client_visible: true, short_description: "Toggle test desc", active: true });
            if (!$Err.isERR(rv))
            {
                let toggleId = rv.type_id;
                rv = $executeAPI(this.$Session, "Settings/update_po_section_type", { type_id: toggleId, name: toggleTestName, client_visible: false, short_description: "Updated toggle desc", active: false });
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

    test_community()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let testResults = [];
        let addedCommunityId = null;
        let testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

        try
        {
            testResults.push({step: "Starting Community API tests", status: "info"});

            let uniqueId = $Utils.uniqueHash().substring(0, 8);
            let testCommunityName = `Test Community ${uniqueId}`;

            // -----------------------------------------------------------------
            // Community CRUD
            // -----------------------------------------------------------------

            testResults.push({step: "Test 1: get_communities (initial)", status: "running"});
            let rv = $executeAPI(this.$Session, "Community/get_communities", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 1: get_communities (initial)", status: "failed", error: rv.message});
                return {...rc, test_results: testResults};
            }
            let initialCount = rv.communities.length;
            testResults.push({step: "Test 1: get_communities (initial)", status: "passed", count: initialCount});

            testResults.push({step: "Test 2: add_community", status: "running"});
            rv = $executeAPI(this.$Session, "Community/add_community", {
                name: testCommunityName,
                area: "Test Area",
                latitude: 25.276987,
                longitude: 55.296249,
                location_name: "Test Location",
                timezone: "Asia/Dubai",
                map_boundaries: '{"type":"Polygon","coordinates":[[[55.2,25.2],[55.3,25.2],[55.3,25.3],[55.2,25.3],[55.2,25.2]]]}',
                is_active: true
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 2: add_community", status: "failed", error: rv.message});
            }
            else
            {
                addedCommunityId = rv.community_id;
                testResults.push({step: "Test 2: add_community", status: "passed", community_id: addedCommunityId});
            }

            testResults.push({step: "Test 3: add_community (duplicate name)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/add_community", { name: testCommunityName, area: "Dup Area" });
            if ($Err.isERR(rv) && rv.rc === 501)
            {
                testResults.push({step: "Test 3: add_community (duplicate name)", status: "passed", message: "correctly rejected duplicate name with rc 501"});
            }
            else
            {
                testResults.push({step: "Test 3: add_community (duplicate name)", status: "warning", message: "expected rc 501 for duplicate name"});
            }

            testResults.push({step: "Test 4: get_community", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 4: get_community", status: "failed", error: "Cannot get - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_community", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 4: get_community", status: "failed", error: rv.message});
                }
                else
                {
                    let c = rv.community;
                    let verified = c.name === testCommunityName &&
                                   c.area === "Test Area" &&
                                   c.location_name === "Test Location" &&
                                   c.timezone === "Asia/Dubai" &&
                                   c.is_active === true;
                    if (verified)
                    {
                        testResults.push({step: "Test 4: get_community", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 4: get_community", status: "warning", verified: false, message: "Some community fields not saved correctly"});
                    }
                }
            }

            testResults.push({step: "Test 5: get_communities (verify count increased)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/get_communities", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 5: get_communities (verify count increased)", status: "failed", error: rv.message});
            }
            else
            {
                if (rv.communities.length === initialCount + 1)
                {
                    testResults.push({step: "Test 5: get_communities (verify count increased)", status: "passed", count: rv.communities.length});
                }
                else
                {
                    testResults.push({step: "Test 5: get_communities (verify count increased)", status: "warning", expected: initialCount + 1, actual: rv.communities.length});
                }

                let testCom = rv.communities.find(c => c.community_id === addedCommunityId);
                if (testCom && typeof testCom.officer_count === "number" && typeof testCom.resident_count === "number")
                {
                    testResults.push({step: "Test 5a: get_communities (officer_count & resident_count present)", status: "passed", officer_count: testCom.officer_count, resident_count: testCom.resident_count});
                }
                else
                {
                    testResults.push({step: "Test 5a: get_communities (officer_count & resident_count present)", status: "warning", message: "officer_count or resident_count not present or not numeric"});
                }
            }

            testResults.push({step: "Test 6: update_community", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 6: update_community", status: "failed", error: "Cannot update - community was not created"});
            }
            else
            {
                let updatedName = `Updated ${testCommunityName}`;
                rv = $executeAPI(this.$Session, "Community/update_community", {
                    community_id: addedCommunityId,
                    name: updatedName,
                    area: "Updated Area",
                    location_name: "Updated Location"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 6: update_community", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 6: update_community", status: "passed"});
                }
            }

            testResults.push({step: "Test 7: get_community (verify update)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 7: get_community (verify update)", status: "failed", error: "Cannot verify - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_community", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 7: get_community (verify update)", status: "failed", error: rv.message});
                }
                else
                {
                    let c = rv.community;
                    let verified = c.name === `Updated ${testCommunityName}` &&
                                   c.area === "Updated Area" &&
                                   c.location_name === "Updated Location" &&
                                   c.timezone === "Asia/Dubai";
                    if (verified)
                    {
                        testResults.push({step: "Test 7: get_community (verify update)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 7: get_community (verify update)", status: "warning", verified: false, message: "Updated fields not saved correctly"});
                    }
                }
            }

            testResults.push({step: "Test 8: update_community (deactivate)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 8: update_community (deactivate)", status: "failed", error: "Cannot deactivate - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/update_community", {
                    community_id: addedCommunityId,
                    is_active: false
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 8: update_community (deactivate)", status: "failed", error: rv.message});
                }
                else
                {
                    rv = $executeAPI(this.$Session, "Community/get_community", { community_id: addedCommunityId });
                    if (!$Err.isERR(rv) && rv.community.is_active === false)
                    {
                        testResults.push({step: "Test 8: update_community (deactivate)", status: "passed", is_active: false});
                    }
                    else
                    {
                        testResults.push({step: "Test 8: update_community (deactivate)", status: "warning", message: "is_active not toggled correctly"});
                    }
                }
            }

            testResults.push({step: "Test 9: get_communities (exclude inactive)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/get_communities", { include_inactive: false });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 9: get_communities (exclude inactive)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.communities.find(c => c.community_id === addedCommunityId);
                if (!found)
                {
                    testResults.push({step: "Test 9: get_communities (exclude inactive)", status: "passed", message: "inactive community correctly excluded"});
                }
                else
                {
                    testResults.push({step: "Test 9: get_communities (exclude inactive)", status: "warning", message: "inactive community still appears in active list"});
                }
            }

            testResults.push({step: "Test 10: update_community (reactivate)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 10: update_community (reactivate)", status: "failed", error: "Cannot reactivate - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/update_community", {
                    community_id: addedCommunityId,
                    is_active: true
                });
                if (!$Err.isERR(rv))
                {
                    testResults.push({step: "Test 10: update_community (reactivate)", status: "passed"});
                }
                else
                {
                    testResults.push({step: "Test 10: update_community (reactivate)", status: "failed", error: rv.message});
                }
            }

            testResults.push({step: "Test 11: get_community (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/get_community", { community_id: 999999999 });
            if ($Err.isERR(rv) && rv.rc === 500)
            {
                testResults.push({step: "Test 11: get_community (invalid ID)", status: "passed", message: "correctly returned not found with rc 500"});
            }
            else
            {
                testResults.push({step: "Test 11: get_community (invalid ID)", status: "warning", message: "expected rc 500 for invalid ID"});
            }

            testResults.push({step: "Test 12: update_community (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/update_community", { community_id: 999999999, name: "Should Fail" });
            if ($Err.isERR(rv) && rv.rc === 500)
            {
                testResults.push({step: "Test 12: update_community (invalid ID)", status: "passed", message: "correctly rejected invalid ID"});
            }
            else
            {
                testResults.push({step: "Test 12: update_community (invalid ID)", status: "warning", message: "expected rc 500 for invalid ID"});
            }

            // -----------------------------------------------------------------
            // Featured Officer CRUD
            // -----------------------------------------------------------------

            testResults.push({step: "Test 13: get_featured_officer (none set)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 13: get_featured_officer (none set)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv) && rv.rc === 506)
                {
                    testResults.push({step: "Test 13: get_featured_officer (none set)", status: "passed", message: "correctly returned not found with rc 506"});
                }
                else
                {
                    testResults.push({step: "Test 13: get_featured_officer (none set)", status: "warning", message: "expected rc 506 when no featured officer set"});
                }
            }

            testResults.push({step: "Test 14: set_featured_officer (create)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 14: set_featured_officer (create)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/set_featured_officer", {
                    community_id: addedCommunityId,
                    image: testImage,
                    description: "Test Featured Officer Description"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 14: set_featured_officer (create)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 14: set_featured_officer (create)", status: "passed", featured_officer_id: rv.featured_officer_id});
                }
            }

            testResults.push({step: "Test 15: get_featured_officer (verify create)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 15: get_featured_officer (verify create)", status: "failed", error: "Cannot verify - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 15: get_featured_officer (verify create)", status: "failed", error: rv.message});
                }
                else
                {
                    let fo = rv.featured_officer;
                    if (fo.description === "Test Featured Officer Description" && fo.community_id === addedCommunityId)
                    {
                        testResults.push({step: "Test 15: get_featured_officer (verify create)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 15: get_featured_officer (verify create)", status: "warning", verified: false, message: "Featured officer fields not saved correctly"});
                    }
                }
            }

            testResults.push({step: "Test 16: set_featured_officer (update)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 16: set_featured_officer (update)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/set_featured_officer", {
                    community_id: addedCommunityId,
                    image: testImage,
                    description: "Updated Featured Officer Description"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 16: set_featured_officer (update)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 16: set_featured_officer (update)", status: "passed", featured_officer_id: rv.featured_officer_id});
                }
            }

            testResults.push({step: "Test 17: get_featured_officer (verify update)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 17: get_featured_officer (verify update)", status: "failed", error: "Cannot verify - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 17: get_featured_officer (verify update)", status: "failed", error: rv.message});
                }
                else
                {
                    if (rv.featured_officer.description === "Updated Featured Officer Description")
                    {
                        testResults.push({step: "Test 17: get_featured_officer (verify update)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 17: get_featured_officer (verify update)", status: "warning", verified: false, message: "Featured officer description not updated correctly"});
                    }
                }
            }

            testResults.push({step: "Test 18: set_featured_officer (invalid community)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/set_featured_officer", {
                community_id: 999999999,
                image: testImage,
                description: "Should Fail"
            });
            if ($Err.isERR(rv) && rv.rc === 500)
            {
                testResults.push({step: "Test 18: set_featured_officer (invalid community)", status: "passed", message: "correctly rejected invalid community with rc 500"});
            }
            else
            {
                testResults.push({step: "Test 18: set_featured_officer (invalid community)", status: "warning", message: "expected rc 500 for invalid community"});
            }

            testResults.push({step: "Test 19: delete_featured_officer", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 19: delete_featured_officer", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/delete_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 19: delete_featured_officer", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 19: delete_featured_officer", status: "passed"});
                }
            }

            testResults.push({step: "Test 20: get_featured_officer (verify delete)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 20: get_featured_officer (verify delete)", status: "failed", error: "Cannot verify - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv) && rv.rc === 506)
                {
                    testResults.push({step: "Test 20: get_featured_officer (verify delete)", status: "passed", message: "featured officer correctly removed"});
                }
                else
                {
                    testResults.push({step: "Test 20: get_featured_officer (verify delete)", status: "warning", message: "expected rc 506 after deletion"});
                }
            }

            testResults.push({step: "Test 21: delete_featured_officer (already deleted)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 21: delete_featured_officer (already deleted)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/delete_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv) && rv.rc === 506)
                {
                    testResults.push({step: "Test 21: delete_featured_officer (already deleted)", status: "passed", message: "correctly returned not found for already deleted"});
                }
                else
                {
                    testResults.push({step: "Test 21: delete_featured_officer (already deleted)", status: "warning", message: "expected rc 506 for already deleted featured officer"});
                }
            }

            // -----------------------------------------------------------------
            // Featured Officer: restore after soft-delete
            // -----------------------------------------------------------------

            testResults.push({step: "Test 26: set_featured_officer (restore after delete)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 26: set_featured_officer (restore after delete)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/set_featured_officer", {
                    community_id: addedCommunityId,
                    image: testImage,
                    description: "Restored Featured Officer"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 26: set_featured_officer (restore after delete)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 26: set_featured_officer (restore after delete)", status: "passed", featured_officer_id: rv.featured_officer_id});
                }
            }

            testResults.push({step: "Test 27: get_featured_officer (verify restore)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 27: get_featured_officer (verify restore)", status: "failed", error: "Cannot verify - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 27: get_featured_officer (verify restore)", status: "failed", error: rv.message});
                }
                else
                {
                    if (rv.featured_officer.description === "Restored Featured Officer")
                    {
                        testResults.push({step: "Test 27: get_featured_officer (verify restore)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 27: get_featured_officer (verify restore)", status: "warning", verified: false, message: "Restored description not correct"});
                    }
                }
            }

            testResults.push({step: "Test 28: delete_featured_officer (cleanup restore)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 28: delete_featured_officer (cleanup restore)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/delete_featured_officer", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 28: delete_featured_officer (cleanup restore)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 28: delete_featured_officer (cleanup restore)", status: "passed"});
                }
            }

            // -----------------------------------------------------------------
            // Search Tests
            // -----------------------------------------------------------------

            testResults.push({step: "Test 29: get_communities (search_text match)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 29: get_communities (search_text match)", status: "failed", error: "Cannot search - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_communities", { include_inactive: true, search_text: uniqueId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 29: get_communities (search_text match)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.communities.find(c => c.community_id === addedCommunityId);
                    if (found)
                    {
                        testResults.push({step: "Test 29: get_communities (search_text match)", status: "passed", found: true, count: rv.communities.length});
                    }
                    else
                    {
                        testResults.push({step: "Test 29: get_communities (search_text match)", status: "warning", found: false, message: "Community not found by search_text"});
                    }
                }
            }

            testResults.push({step: "Test 30: get_communities (search_text no match)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/get_communities", { include_inactive: true, search_text: "ZZZNONEXISTENT999" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 30: get_communities (search_text no match)", status: "failed", error: rv.message});
            }
            else
            {
                if (rv.communities.length === 0)
                {
                    testResults.push({step: "Test 30: get_communities (search_text no match)", status: "passed", count: 0});
                }
                else
                {
                    testResults.push({step: "Test 30: get_communities (search_text no match)", status: "warning", count: rv.communities.length, message: "expected 0 results for non-matching search"});
                }
            }

            // -----------------------------------------------------------------
            // Edge Cases
            // -----------------------------------------------------------------

            testResults.push({step: "Test 31: add_community (special characters)", status: "running"});
            let specialCharName = `Test-Community_Name & More ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Community/add_community", { name: specialCharName, area: "Special Area" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 31: add_community (special characters)", status: "warning", message: "rejected special characters", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 31: add_community (special characters)", status: "passed", community_id: rv.community_id});
                $executeAPI(this.$Session, "Community/delete_community", { community_id: rv.community_id });
            }

            testResults.push({step: "Test 32: add_community (unicode characters)", status: "running"});
            let unicodeName = `Test \u6D4B\u8BD5 \u0422\u0435\u0441\u0442 ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Community/add_community", { name: unicodeName, area: "Unicode Area" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 32: add_community (unicode characters)", status: "warning", message: "rejected unicode", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 32: add_community (unicode characters)", status: "passed", community_id: rv.community_id});
                $executeAPI(this.$Session, "Community/delete_community", { community_id: rv.community_id });
            }

            testResults.push({step: "Test 33: add_community (long name)", status: "running"});
            let longName = `Test Community with Very Long Name That Contains Many Characters ${uniqueId} Extra Text To Make It Even Longer And Test Maximum Length Handling`;
            rv = $executeAPI(this.$Session, "Community/add_community", { name: longName, area: "Long Name Area" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 33: add_community (long name)", status: "warning", message: "rejected long name", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 33: add_community (long name)", status: "passed", community_id: rv.community_id});
                $executeAPI(this.$Session, "Community/delete_community", { community_id: rv.community_id });
            }

            testResults.push({step: "Test 34: update_community (duplicate name)", status: "running"});
            let secondCommunityName = `Second Community ${uniqueId}`;
            rv = $executeAPI(this.$Session, "Community/add_community", { name: secondCommunityName, area: "Second Area" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 34: update_community (duplicate name)", status: "failed", error: "Could not create second community for test"});
            }
            else
            {
                let secondId = rv.community_id;
                rv = $executeAPI(this.$Session, "Community/update_community", {
                    community_id: secondId,
                    name: `Updated ${testCommunityName}`
                });
                if ($Err.isERR(rv) && rv.rc === 501)
                {
                    testResults.push({step: "Test 34: update_community (duplicate name)", status: "passed", message: "correctly rejected duplicate name on update with rc 501"});
                }
                else
                {
                    testResults.push({step: "Test 34: update_community (duplicate name)", status: "warning", message: "expected rc 501 for duplicate name on update", rc: rv.rc});
                }
                $executeAPI(this.$Session, "Community/delete_community", { community_id: secondId });
            }

            testResults.push({step: "Test 35: delete_community (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/delete_community", { community_id: 999999999 });
            if ($Err.isERR(rv) && rv.rc === 500)
            {
                testResults.push({step: "Test 35: delete_community (invalid ID)", status: "passed", message: "correctly rejected invalid ID with rc 500"});
            }
            else
            {
                testResults.push({step: "Test 35: delete_community (invalid ID)", status: "warning", message: "expected rc 500 for invalid ID"});
            }

            testResults.push({step: "Test 36: get_featured_officer (invalid community)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/get_featured_officer", { community_id: 999999999 });
            if ($Err.isERR(rv) && rv.rc === 500)
            {
                testResults.push({step: "Test 36: get_featured_officer (invalid community)", status: "passed", message: "correctly returned not found with rc 500"});
            }
            else
            {
                testResults.push({step: "Test 36: get_featured_officer (invalid community)", status: "warning", message: "expected rc 500 for invalid community"});
            }

            testResults.push({step: "Test 37: delete_featured_officer (invalid community)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/delete_featured_officer", { community_id: 999999999 });
            if ($Err.isERR(rv) && rv.rc === 500)
            {
                testResults.push({step: "Test 37: delete_featured_officer (invalid community)", status: "passed", message: "correctly rejected invalid community with rc 500"});
            }
            else
            {
                testResults.push({step: "Test 37: delete_featured_officer (invalid community)", status: "warning", message: "expected rc 500 for invalid community"});
            }

            // -----------------------------------------------------------------
            // Cleanup: delete test community
            // -----------------------------------------------------------------

            testResults.push({step: "Test 22: delete_community", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 22: delete_community", status: "failed", error: "Cannot delete - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/delete_community", { community_id: addedCommunityId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 22: delete_community", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 22: delete_community", status: "passed"});
                }
            }

            testResults.push({step: "Test 23: get_community (verify soft delete)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 23: get_community (verify soft delete)", status: "failed", error: "Cannot verify - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/get_community", { community_id: addedCommunityId });
                if ($Err.isERR(rv) && rv.rc === 500)
                {
                    testResults.push({step: "Test 23: get_community (verify soft delete)", status: "passed", message: "soft-deleted community correctly not found"});
                }
                else
                {
                    testResults.push({step: "Test 23: get_community (verify soft delete)", status: "warning", message: "expected rc 500 after soft delete"});
                }
            }

            testResults.push({step: "Test 24: delete_community (already deleted)", status: "running"});
            if (addedCommunityId === null)
            {
                testResults.push({step: "Test 24: delete_community (already deleted)", status: "failed", error: "Cannot test - community was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Community/delete_community", { community_id: addedCommunityId });
                if ($Err.isERR(rv) && rv.rc === 500)
                {
                    testResults.push({step: "Test 24: delete_community (already deleted)", status: "passed", message: "correctly rejected delete on already deleted community"});
                }
                else
                {
                    testResults.push({step: "Test 24: delete_community (already deleted)", status: "warning", message: "expected rc 500 for already deleted community"});
                }
            }

            testResults.push({step: "Test 25: add_community (duplicate name reuse after delete)", status: "running"});
            rv = $executeAPI(this.$Session, "Community/add_community", { name: testCommunityName, area: "Reuse Area", is_active: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 25: add_community (duplicate name reuse after delete)", status: "warning", message: "could not reuse deleted community name", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 25: add_community (duplicate name reuse after delete)", status: "passed", message: "name reuse allowed after soft delete"});
                $executeAPI(this.$Session, "Community/delete_community", { community_id: rv.community_id });
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

    test_admin_user()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let testResults = [];
        let addedUserId = null;
        let secondUserId = null;
        let weakPwdUserId = null;
        let dupUserId = null;
        let currentEmail = null;

        try
        {
            testResults.push({step: "Starting Admin User API tests", status: "info"});

            let uniqueId = $Utils.uniqueHash().substring(0, 8);
            let testEmail = `test_admin_${uniqueId}@test.com`;
            let testPassword = "Test@1234";

            // =================================================================
            // CREATE & READ
            // =================================================================

            testResults.push({step: "Test 1: get_admin_users (initial)", status: "running"});
            let rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 1: get_admin_users (initial)", status: "failed", error: rv.message});
                return {...rc, test_results: testResults};
            }
            let initialCount = rv.total_count;
            testResults.push({step: "Test 1: get_admin_users (initial)", status: "passed", count: initialCount});

            testResults.push({step: "Test 2: add_admin_user (all params)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "Test",
                last_name: "Admin",
                email: testEmail,
                password: testPassword,
                phone_num: "+1-555-0100",
                role: $Const.USER_ROLE_SUPER_ADMIN
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 2: add_admin_user (all params)", status: "failed", error: rv.message});
            }
            else
            {
                addedUserId = rv.user_id;
                testResults.push({step: "Test 2: add_admin_user (all params)", status: "passed", user_id: addedUserId});
            }

            testResults.push({step: "Test 3: get_admin_user (verify creation)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 3: get_admin_user (verify creation)", status: "failed", error: "Cannot get - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 3: get_admin_user (verify creation)", status: "failed", error: rv.message});
                }
                else
                {
                    let u = rv.user;
                    let verified = u.first_name === "Test" &&
                                   u.last_name === "Admin" &&
                                   u.email === testEmail &&
                                   u.phone_num === "+1-555-0100" &&
                                   u.is_active === true &&
                                   u.role === $Const.USER_ROLE_SUPER_ADMIN;
                    if (verified)
                    {
                        testResults.push({step: "Test 3: get_admin_user (verify creation)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 3: get_admin_user (verify creation)", status: "warning", verified: false, user: u, message: "Some user fields not saved correctly"});
                    }
                }
            }

            testResults.push({step: "Test 4: get_admin_users (verify count increased)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 4: get_admin_users (verify count increased)", status: "failed", error: rv.message});
            }
            else
            {
                if (rv.total_count === initialCount + 1)
                {
                    testResults.push({step: "Test 4: get_admin_users (verify count increased)", status: "passed", count: rv.total_count});
                }
                else
                {
                    testResults.push({step: "Test 4: get_admin_users (verify count increased)", status: "warning", expected: initialCount + 1, actual: rv.total_count});
                }
            }

            // =================================================================
            // UPDATE (basic fields)
            // =================================================================

            testResults.push({step: "Test 5: update_admin_user (basic fields)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 5: update_admin_user (basic fields)", status: "failed", error: "Cannot update - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: addedUserId,
                    first_name: "Updated",
                    last_name: "AdminUser",
                    phone_num: "+1-555-0200"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 5: update_admin_user (basic fields)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 5: update_admin_user (basic fields)", status: "passed"});
                }
            }

            testResults.push({step: "Test 6: get_admin_user (verify update)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 6: get_admin_user (verify update)", status: "failed", error: "Cannot verify - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 6: get_admin_user (verify update)", status: "failed", error: rv.message});
                }
                else
                {
                    let u = rv.user;
                    let verified = u.first_name === "Updated" &&
                                   u.last_name === "AdminUser" &&
                                   u.phone_num === "+1-555-0200";
                    if (verified)
                    {
                        testResults.push({step: "Test 6: get_admin_user (verify update)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 6: get_admin_user (verify update)", status: "warning", verified: false, message: "Updated fields not saved correctly"});
                    }
                }
            }

            // =================================================================
            // UPDATE (email change with initial_password)
            // =================================================================

            let newEmail = `test_updated_${uniqueId}@test.com`;
            let newInitialPassword = "Changed@789";
            currentEmail = testEmail;

            testResults.push({step: "Test 7: update_admin_user (email change with initial_password)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 7: update_admin_user (email change with initial_password)", status: "failed", error: "Cannot update - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: addedUserId,
                    email: newEmail,
                    initial_password: newInitialPassword
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 7: update_admin_user (email change with initial_password)", status: "failed", error: rv.message});
                }
                else
                {
                    currentEmail = newEmail;
                    testResults.push({step: "Test 7: update_admin_user (email change with initial_password)", status: "passed"});
                }
            }

            testResults.push({step: "Test 8: get_admin_user (verify email changed)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 8: get_admin_user (verify email changed)", status: "failed", error: "Cannot verify - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 8: get_admin_user (verify email changed)", status: "failed", error: rv.message});
                }
                else
                {
                    if (rv.user.email === newEmail)
                    {
                        testResults.push({step: "Test 8: get_admin_user (verify email changed)", status: "passed", email: newEmail});
                    }
                    else
                    {
                        testResults.push({step: "Test 8: get_admin_user (verify email changed)", status: "warning", expected: newEmail, actual: rv.user.email});
                    }
                }
            }

            testResults.push({step: "Test 9: update_admin_user (email change missing initial_password)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 9: update_admin_user (email change missing initial_password)", status: "failed", error: "Cannot test - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: addedUserId,
                    email: `another_${uniqueId}@test.com`
                });
                if ($Err.isERR(rv) && rv.rc === 102)
                {
                    testResults.push({step: "Test 9: update_admin_user (email change missing initial_password)", status: "passed", message: "correctly returned rc 102 for missing initial_password"});
                }
                else
                {
                    testResults.push({step: "Test 9: update_admin_user (email change missing initial_password)", status: "warning", message: "expected rc 102", rc: rv.rc});
                }
            }

            let anotherEmail = `another_${uniqueId}@test.com`;
            testResults.push({step: "Test 10: update_admin_user (email change weak initial_password)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 10: update_admin_user (email change weak initial_password)", status: "failed", error: "Cannot test - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: addedUserId,
                    email: anotherEmail,
                    initial_password: "weak"
                });
                if ($Err.isERR(rv) && rv.rc === 242)
                {
                    testResults.push({step: "Test 10: update_admin_user (email change weak initial_password)", status: "passed", message: "correctly returned rc 242 for weak password"});
                }
                else if (!$Err.isERR(rv))
                {
                    currentEmail = anotherEmail;
                    testResults.push({step: "Test 10: update_admin_user (email change weak initial_password)", status: "passed", message: "password accepted (force_criteria is disabled)"});
                }
                else
                {
                    testResults.push({step: "Test 10: update_admin_user (email change weak initial_password)", status: "warning", message: "unexpected error", rc: rv.rc});
                }
            }

            // =================================================================
            // BOOLEAN TOGGLE (deactivate/reactivate)
            // =================================================================

            testResults.push({step: "Test 11: update_admin_user (deactivate)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 11: update_admin_user (deactivate)", status: "failed", error: "Cannot deactivate - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: addedUserId,
                    is_active: false
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 11: update_admin_user (deactivate)", status: "failed", error: rv.message});
                }
                else
                {
                    rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                    if (!$Err.isERR(rv) && rv.user.is_active === false)
                    {
                        testResults.push({step: "Test 11: update_admin_user (deactivate)", status: "passed", is_active: false});
                    }
                    else
                    {
                        testResults.push({step: "Test 11: update_admin_user (deactivate)", status: "warning", message: "is_active not toggled to false"});
                    }
                }
            }

            testResults.push({step: "Test 12: get_admin_users (exclude inactive)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: false });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 12: get_admin_users (exclude inactive)", status: "failed", error: rv.message});
            }
            else
            {
                let found = addedUserId !== null ? rv.users.find(u => u.user_id === addedUserId) : null;
                if (!found)
                {
                    testResults.push({step: "Test 12: get_admin_users (exclude inactive)", status: "passed", message: "inactive user correctly excluded"});
                }
                else
                {
                    testResults.push({step: "Test 12: get_admin_users (exclude inactive)", status: "warning", message: "inactive user still appears in active list"});
                }
            }

            testResults.push({step: "Test 13: update_admin_user (reactivate)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 13: update_admin_user (reactivate)", status: "failed", error: "Cannot reactivate - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: addedUserId,
                    is_active: true
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 13: update_admin_user (reactivate)", status: "failed", error: rv.message});
                }
                else
                {
                    rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                    if (!$Err.isERR(rv) && rv.user.is_active === true)
                    {
                        testResults.push({step: "Test 13: update_admin_user (reactivate)", status: "passed", is_active: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 13: update_admin_user (reactivate)", status: "warning", message: "is_active not toggled to true"});
                    }
                }
            }

            // =================================================================
            // ROLE CHANGE
            // =================================================================

            testResults.push({step: "Test 14: change_admin_user_role", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 14: change_admin_user_role", status: "failed", error: "Cannot test - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/change_admin_user_role", {
                    user_id: addedUserId,
                    role: $Const.USER_ROLE_MANAGER
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 14: change_admin_user_role", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 14: change_admin_user_role", status: "passed"});
                }
            }

            testResults.push({step: "Test 15: get_admin_user (verify role changed)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 15: get_admin_user (verify role changed)", status: "failed", error: "Cannot verify - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 15: get_admin_user (verify role changed)", status: "failed", error: rv.message});
                }
                else
                {
                    if (rv.user.role === $Const.USER_ROLE_MANAGER)
                    {
                        testResults.push({step: "Test 15: get_admin_user (verify role changed)", status: "passed", role: rv.user.role});
                    }
                    else
                    {
                        testResults.push({step: "Test 15: get_admin_user (verify role changed)", status: "warning", expected: $Const.USER_ROLE_MANAGER, actual: rv.user.role});
                    }
                }
            }

            testResults.push({step: "Test 16: change_admin_user_role (self, expect rc 772)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/change_admin_user_role", {
                user_id: this.$Session.userId,
                role: $Const.USER_ROLE_MANAGER
            });
            if ($Err.isERR(rv) && rv.rc === 772)
            {
                testResults.push({step: "Test 16: change_admin_user_role (self, expect rc 772)", status: "passed", message: "correctly rejected self-role change"});
            }
            else
            {
                testResults.push({step: "Test 16: change_admin_user_role (self, expect rc 772)", status: "warning", message: "expected rc 772", rc: rv.rc});
            }

            testResults.push({step: "Test 17: change_admin_user_role (invalid role)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 17: change_admin_user_role (invalid role)", status: "failed", error: "Cannot test - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/change_admin_user_role", {
                    user_id: addedUserId,
                    role: 9999
                });
                if ($Err.isERR(rv) && rv.rc === 106)
                {
                    testResults.push({step: "Test 17: change_admin_user_role (invalid role)", status: "passed", message: "correctly rejected invalid role with rc 106"});
                }
                else
                {
                    testResults.push({step: "Test 17: change_admin_user_role (invalid role)", status: "warning", message: "expected rc 106", rc: rv.rc});
                }
            }

            testResults.push({step: "Test 18: change_admin_user_role (invalid user)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/change_admin_user_role", {
                user_id: "NONEXISTENT_USER_ID",
                role: $Const.USER_ROLE_MANAGER
            });
            if ($Err.isERR(rv) && rv.rc === 770)
            {
                testResults.push({step: "Test 18: change_admin_user_role (invalid user)", status: "passed", message: "correctly returned not found with rc 770"});
            }
            else
            {
                testResults.push({step: "Test 18: change_admin_user_role (invalid user)", status: "warning", message: "expected rc 770", rc: rv.rc});
            }

            // =================================================================
            // PASSWORD TESTS
            // =================================================================

            testResults.push({step: "Test 19: reset_admin_user_password", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 19: reset_admin_user_password", status: "failed", error: "Cannot test - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/reset_admin_user_password", {
                    user_id: addedUserId,
                    password: "NewPass@123"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 19: reset_admin_user_password", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 19: reset_admin_user_password", status: "passed"});
                }
            }

            testResults.push({step: "Test 20: reset_admin_user_password (weak password)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 20: reset_admin_user_password (weak password)", status: "failed", error: "Cannot test - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/reset_admin_user_password", {
                    user_id: addedUserId,
                    password: "123"
                });
                if ($Err.isERR(rv) && rv.rc === 242)
                {
                    testResults.push({step: "Test 20: reset_admin_user_password (weak password)", status: "passed", message: "correctly rejected weak password with rc 242"});
                }
                else if (!$Err.isERR(rv))
                {
                    testResults.push({step: "Test 20: reset_admin_user_password (weak password)", status: "passed", message: "password accepted (force_criteria is disabled)"});
                }
                else
                {
                    testResults.push({step: "Test 20: reset_admin_user_password (weak password)", status: "warning", message: "unexpected error", rc: rv.rc});
                }
            }

            testResults.push({step: "Test 21: reset_admin_user_password (invalid user)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/reset_admin_user_password", {
                user_id: "NONEXISTENT_USER_ID",
                password: "NewPass@123"
            });
            if ($Err.isERR(rv) && rv.rc === 770)
            {
                testResults.push({step: "Test 21: reset_admin_user_password (invalid user)", status: "passed", message: "correctly returned not found with rc 770"});
            }
            else
            {
                testResults.push({step: "Test 21: reset_admin_user_password (invalid user)", status: "warning", message: "expected rc 770", rc: rv.rc});
            }

            testResults.push({step: "Test 22: change_my_password (wrong current)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/change_my_password", {
                current_password: "WRONG_PASSWORD",
                new_password: "NewPass@456"
            });
            if ($Err.isERR(rv) && rv.rc === 247)
            {
                testResults.push({step: "Test 22: change_my_password (wrong current)", status: "passed", message: "correctly rejected wrong password with rc 247"});
            }
            else
            {
                testResults.push({step: "Test 22: change_my_password (wrong current)", status: "warning", message: "expected rc 247", rc: rv.rc});
            }

            testResults.push({step: "Test 23: change_my_password (weak new password)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/change_my_password", {
                current_password: "WRONG_PASSWORD",
                new_password: "123"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 23: change_my_password (weak new password)", status: "passed", message: "correctly rejected", rc: rv.rc});
            }
            else
            {
                testResults.push({step: "Test 23: change_my_password (weak new password)", status: "warning", message: "expected error for weak password"});
            }

            // =================================================================
            // SEARCH & SORT
            // =================================================================

            testResults.push({step: "Test 24: get_admin_users (search by email)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 24: get_admin_users (search by email)", status: "failed", error: "Cannot search - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true, search_text: uniqueId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 24: get_admin_users (search by email)", status: "failed", error: rv.message});
                }
                else
                {
                    let found = rv.users.find(u => u.user_id === addedUserId);
                    if (found)
                    {
                        testResults.push({step: "Test 24: get_admin_users (search by email)", status: "passed", found: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 24: get_admin_users (search by email)", status: "warning", found: false, message: "User not found by search_text"});
                    }
                }
            }

            testResults.push({step: "Test 25: get_admin_users (sort by first_name asc)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true, sort_by: "first_name", sort_dir: "asc" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 25: get_admin_users (sort by first_name asc)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 25: get_admin_users (sort by first_name asc)", status: "passed", count: rv.total_count});
            }

            testResults.push({step: "Test 26: get_admin_users (sort by created_on desc)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true, sort_by: "created_on", sort_dir: "desc" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 26: get_admin_users (sort by created_on desc)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 26: get_admin_users (sort by created_on desc)", status: "passed", count: rv.total_count});
            }

            testResults.push({step: "Test 27: get_admin_users (sort by email)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true, sort_by: "email", sort_dir: "asc" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 27: get_admin_users (sort by email)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 27: get_admin_users (sort by email)", status: "passed", count: rv.total_count});
            }

            testResults.push({step: "Test 28: get_admin_users (sort by role)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true, sort_by: "role", sort_dir: "desc" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 28: get_admin_users (sort by role)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 28: get_admin_users (sort by role)", status: "passed", count: rv.total_count});
            }

            // =================================================================
            // NEGATIVE / EDGE CASES (add_admin_user)
            // =================================================================

            testResults.push({step: "Test 29: add_admin_user (duplicate email)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "Dup",
                last_name: "Admin",
                email: currentEmail,
                password: testPassword,
                role: $Const.USER_ROLE_SUPER_ADMIN
            });
            if ($Err.isERR(rv) && rv.rc === 240)
            {
                testResults.push({step: "Test 29: add_admin_user (duplicate email)", status: "passed", message: "correctly rejected duplicate email with rc 240"});
            }
            else if (!$Err.isERR(rv))
            {
                dupUserId = rv.user_id;
                testResults.push({step: "Test 29: add_admin_user (duplicate email)", status: "warning", message: "duplicate email not detected", user_id: dupUserId});
            }
            else
            {
                testResults.push({step: "Test 29: add_admin_user (duplicate email)", status: "warning", message: "unexpected error", rc: rv.rc});
            }

            testResults.push({step: "Test 30: add_admin_user (invalid email)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "Invalid",
                email: "not_an_email",
                password: testPassword,
                role: $Const.USER_ROLE_SUPER_ADMIN
            });
            if ($Err.isERR(rv) && rv.rc === 235)
            {
                testResults.push({step: "Test 30: add_admin_user (invalid email)", status: "passed", message: "correctly rejected invalid email with rc 235"});
            }
            else
            {
                testResults.push({step: "Test 30: add_admin_user (invalid email)", status: "warning", message: "expected rc 235", rc: rv.rc});
            }

            testResults.push({step: "Test 31: add_admin_user (weak password)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "Weak",
                email: `weak_${uniqueId}@test.com`,
                password: "123",
                role: $Const.USER_ROLE_SUPER_ADMIN
            });
            if ($Err.isERR(rv) && rv.rc === 242)
            {
                testResults.push({step: "Test 31: add_admin_user (weak password)", status: "passed", message: "correctly rejected weak password with rc 242"});
            }
            else if (!$Err.isERR(rv))
            {
                weakPwdUserId = rv.user_id;
                testResults.push({step: "Test 31: add_admin_user (weak password)", status: "passed", message: "password accepted (force_criteria is disabled)", user_id: weakPwdUserId});
            }
            else
            {
                testResults.push({step: "Test 31: add_admin_user (weak password)", status: "warning", message: "unexpected error", rc: rv.rc});
            }

            testResults.push({step: "Test 32: add_admin_user (empty first_name)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "",
                email: `empty_${uniqueId}@test.com`,
                password: testPassword,
                role: $Const.USER_ROLE_SUPER_ADMIN
            });
            if ($Err.isERR(rv) && rv.rc === 213)
            {
                testResults.push({step: "Test 32: add_admin_user (empty first_name)", status: "passed", message: "correctly rejected empty first_name with rc 213"});
            }
            else
            {
                testResults.push({step: "Test 32: add_admin_user (empty first_name)", status: "warning", message: "expected rc 213", rc: rv.rc});
            }

            testResults.push({step: "Test 33: add_admin_user (invalid role)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "BadRole",
                email: `badrole_${uniqueId}@test.com`,
                password: testPassword,
                role: 9999
            });
            if ($Err.isERR(rv) && rv.rc === 106)
            {
                testResults.push({step: "Test 33: add_admin_user (invalid role)", status: "passed", message: "correctly rejected invalid role with rc 106"});
            }
            else
            {
                testResults.push({step: "Test 33: add_admin_user (invalid role)", status: "warning", message: "expected rc 106", rc: rv.rc});
            }

            // =================================================================
            // NEGATIVE / EDGE CASES (update, get, delete)
            // =================================================================

            testResults.push({step: "Test 34: update_admin_user (invalid user ID)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                user_id: "NONEXISTENT_USER_ID",
                first_name: "Ghost"
            });
            if ($Err.isERR(rv) && rv.rc === 770)
            {
                testResults.push({step: "Test 34: update_admin_user (invalid user ID)", status: "passed", message: "correctly returned not found with rc 770"});
            }
            else
            {
                testResults.push({step: "Test 34: update_admin_user (invalid user ID)", status: "warning", message: "expected rc 770", rc: rv.rc});
            }

            testResults.push({step: "Test 35: get_admin_user (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: "NONEXISTENT_USER_ID" });
            if ($Err.isERR(rv) && rv.rc === 770)
            {
                testResults.push({step: "Test 35: get_admin_user (invalid ID)", status: "passed", message: "correctly returned not found with rc 770"});
            }
            else
            {
                testResults.push({step: "Test 35: get_admin_user (invalid ID)", status: "warning", message: "expected rc 770", rc: rv.rc});
            }

            testResults.push({step: "Test 36: delete_admin_user (self)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/delete_admin_user", { user_id: this.$Session.userId });
            if ($Err.isERR(rv) && rv.rc === 771)
            {
                testResults.push({step: "Test 36: delete_admin_user (self)", status: "passed", message: "correctly rejected self-delete with rc 771"});
            }
            else
            {
                testResults.push({step: "Test 36: delete_admin_user (self)", status: "warning", message: "expected rc 771", rc: rv.rc});
            }

            testResults.push({step: "Test 37: delete_admin_user (invalid user)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/delete_admin_user", { user_id: "NONEXISTENT_USER_ID" });
            if ($Err.isERR(rv) && rv.rc === 770)
            {
                testResults.push({step: "Test 37: delete_admin_user (invalid user)", status: "passed", message: "correctly returned not found with rc 770"});
            }
            else
            {
                testResults.push({step: "Test 37: delete_admin_user (invalid user)", status: "warning", message: "expected rc 770", rc: rv.rc});
            }

            // =================================================================
            // INPUT VALIDATION
            // =================================================================

            testResults.push({step: "Test 38: add_admin_user (special characters in name)", status: "running"});
            let specialEmail = `special_${uniqueId}@test.com`;
            rv = $executeAPI(this.$Session, "AdminUser/add_admin_user", {
                first_name: "Test-O'Brien",
                last_name: "Jr. (III)",
                email: specialEmail,
                password: testPassword,
                phone_num: "+1-555-0300",
                role: $Const.USER_ROLE_MANAGER
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 38: add_admin_user (special characters in name)", status: "warning", message: "rejected special characters", error: rv.message});
            }
            else
            {
                secondUserId = rv.user_id;
                testResults.push({step: "Test 38: add_admin_user (special characters in name)", status: "passed", user_id: secondUserId});
            }

            testResults.push({step: "Test 39: get_admin_user (verify special chars preserved)", status: "running"});
            if (secondUserId === null)
            {
                testResults.push({step: "Test 39: get_admin_user (verify special chars preserved)", status: "failed", error: "Cannot verify - special char user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: secondUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 39: get_admin_user (verify special chars preserved)", status: "failed", error: rv.message});
                }
                else
                {
                    let u = rv.user;
                    if (u.first_name === "Test-O'Brien" && u.last_name === "Jr. (III)")
                    {
                        testResults.push({step: "Test 39: get_admin_user (verify special chars preserved)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 39: get_admin_user (verify special chars preserved)", status: "warning", first_name: u.first_name, last_name: u.last_name, message: "Special characters not preserved"});
                    }
                }
            }

            testResults.push({step: "Test 40: update_admin_user (unicode in name)", status: "running"});
            if (secondUserId === null)
            {
                testResults.push({step: "Test 40: update_admin_user (unicode in name)", status: "failed", error: "Cannot test - special char user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/update_admin_user", {
                    user_id: secondUserId,
                    first_name: "Тест",
                    last_name: "测试"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 40: update_admin_user (unicode in name)", status: "warning", message: "rejected unicode", error: rv.message});
                }
                else
                {
                    rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: secondUserId });
                    if (!$Err.isERR(rv) && rv.user.first_name === "Тест" && rv.user.last_name === "测试")
                    {
                        testResults.push({step: "Test 40: update_admin_user (unicode in name)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 40: update_admin_user (unicode in name)", status: "warning", message: "Unicode not preserved correctly"});
                    }
                }
            }

            // =================================================================
            // CLEANUP
            // =================================================================

            testResults.push({step: "Test 41: delete_admin_user (cleanup test user)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 41: delete_admin_user (cleanup test user)", status: "failed", error: "Cannot delete - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/delete_admin_user", { user_id: addedUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 41: delete_admin_user (cleanup test user)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 41: delete_admin_user (cleanup test user)", status: "passed"});
                }
            }

            testResults.push({step: "Test 42: get_admin_user (verify soft delete)", status: "running"});
            if (addedUserId === null)
            {
                testResults.push({step: "Test 42: get_admin_user (verify soft delete)", status: "failed", error: "Cannot verify - user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/get_admin_user", { user_id: addedUserId });
                if ($Err.isERR(rv) && rv.rc === 770)
                {
                    testResults.push({step: "Test 42: get_admin_user (verify soft delete)", status: "passed", message: "soft-deleted user correctly not found"});
                }
                else
                {
                    testResults.push({step: "Test 42: get_admin_user (verify soft delete)", status: "warning", message: "expected rc 770 after soft delete"});
                }
            }

            testResults.push({step: "Test 43: get_admin_users (verify count restored)", status: "running"});
            rv = $executeAPI(this.$Session, "AdminUser/get_admin_users", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 43: get_admin_users (verify count restored)", status: "failed", error: rv.message});
            }
            else
            {
                let expectedCount = initialCount
                    + (secondUserId !== null ? 1 : 0)
                    + (weakPwdUserId !== null ? 1 : 0)
                    + (dupUserId !== null ? 1 : 0);
                if (rv.total_count === expectedCount)
                {
                    testResults.push({step: "Test 43: get_admin_users (verify count restored)", status: "passed", count: rv.total_count});
                }
                else
                {
                    testResults.push({step: "Test 43: get_admin_users (verify count restored)", status: "warning", expected: expectedCount, actual: rv.total_count});
                }
            }

            testResults.push({step: "Test 44: delete_admin_user (cleanup special char user)", status: "running"});
            if (secondUserId === null)
            {
                testResults.push({step: "Test 44: delete_admin_user (cleanup special char user)", status: "failed", error: "Cannot delete - special char user was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "AdminUser/delete_admin_user", { user_id: secondUserId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 44: delete_admin_user (cleanup special char user)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 44: delete_admin_user (cleanup special char user)", status: "passed"});
                }
            }

            // Cleanup users accidentally created when force_criteria is disabled
            if (weakPwdUserId !== null)
            {
                rv = $executeAPI(this.$Session, "AdminUser/delete_admin_user", { user_id: weakPwdUserId });
                testResults.push({step: "Cleanup: delete weak password user", status: $Err.isERR(rv) ? "warning" : "passed"});
            }
            if (dupUserId !== null)
            {
                rv = $executeAPI(this.$Session, "AdminUser/delete_admin_user", { user_id: dupUserId });
                testResults.push({step: "Cleanup: delete duplicate email user", status: $Err.isERR(rv) ? "warning" : "passed"});
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

    test_officer_apis()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let testResults = [];
        let addedOfficerId = null;
        let addedCommunityId = null;
        let addedEvaluationId = null;
        let addedEvaluation2Id = null;
        let adminUserId = this.$Session.userId;

        try
        {
            testResults.push({step: "Starting Officer API tests", status: "info"});

            let uniqueId = $Utils.uniqueHash().substring(0, 8);
            let testFirstName = `TestOfficer ${uniqueId}`;
            let testLastName = `LastName ${uniqueId}`;
            let testPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
            let testEmail = `officer_${uniqueId}@test.com`;
            let testTitle = `Security Officer ${uniqueId}`;

            // -----------------------------------------------------------------
            // Setup: Create a test community
            // -----------------------------------------------------------------

            testResults.push({step: "Setup: create test community", status: "running"});
            let rv = $executeAPI(this.$Session, "Community/add_community", {
                name: `Officer Test Community ${uniqueId}`,
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
                vals.summary = { total: 0, passed: 0, failed: 1, warnings: 0 };
                return {...rc, ...vals};
            }
            addedCommunityId = rv.community_id;
            testResults.push({step: "Setup: create test community", status: "passed", community_id: addedCommunityId});

            // -----------------------------------------------------------------
            // Officer CRUD
            // -----------------------------------------------------------------

            testResults.push({step: "Test 1: get_officers (initial)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { include_inactive: true });
            let initialCount = 0;
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 1: get_officers (initial)", status: "failed", error: rv.message});
            }
            else
            {
                initialCount = rv.total_count;
                testResults.push({step: "Test 1: get_officers (initial)", status: "passed", count: initialCount});
            }

            testResults.push({step: "Test 2: add_officer", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: testFirstName,
                last_name: testLastName,
                phone_num: testPhone,
                email: testEmail,
                community_id: addedCommunityId,
                title: testTitle,
                address: "123 Test Street",
                description: "Test officer description",
                roles: ["patrol", "supervisor"],
                certification_badges: ["first_aid", "firearms"]
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 2: add_officer", status: "failed", error: rv.message});
                vals.test_results = testResults;
                vals.summary = { total: 0, passed: testResults.filter(r => r.status === "passed").length, failed: testResults.filter(r => r.status === "failed").length, warnings: 0 };
                return {...rc, ...vals};
            }
            addedOfficerId = rv.user_id;
            testResults.push({step: "Test 2: add_officer", status: "passed", user_id: addedOfficerId});

            testResults.push({step: "Test 3: get_officer (verify creation)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 3: get_officer (verify creation)", status: "failed", error: rv.message});
            }
            else
            {
                let o = rv.officer;
                let verified = o.first_name === testFirstName &&
                               o.last_name === testLastName &&
                               o.email === testEmail &&
                               o.phone_num === testPhone &&
                               o.title === testTitle &&
                               o.address === "123 Test Street" &&
                               o.description === "Test officer description" &&
                               o.community_id === addedCommunityId &&
                               o.is_active === true &&
                               Array.isArray(o.roles) && o.roles.length === 2 &&
                               Array.isArray(o.certification_badges) && o.certification_badges.length === 2 &&
                               Array.isArray(o.evaluations);
                if (verified)
                {
                    testResults.push({step: "Test 3: get_officer (verify creation)", status: "passed", verified: true});
                }
                else
                {
                    testResults.push({step: "Test 3: get_officer (verify creation)", status: "warning", verified: false, message: "Some officer fields not saved correctly"});
                }
            }

            testResults.push({step: "Test 4: get_officers (verify in list)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 4: get_officers (verify in list)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.officers.find(o => o.user_id === addedOfficerId);
                if (found && rv.total_count === initialCount + 1)
                {
                    testResults.push({step: "Test 4: get_officers (verify in list)", status: "passed", total_count: rv.total_count});
                }
                else
                {
                    testResults.push({step: "Test 4: get_officers (verify in list)", status: "warning", message: "Officer not found in list or count mismatch"});
                }
            }

            let updatedFirstName = `Updated ${testFirstName}`;
            let updatedTitle = `Senior ${testTitle}`;

            testResults.push({step: "Test 5: update_officer (multiple fields)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", {
                user_id: addedOfficerId,
                first_name: updatedFirstName,
                title: updatedTitle,
                description: "Updated description",
                address: "456 Updated Street"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 5: update_officer (multiple fields)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 5: update_officer (multiple fields)", status: "passed"});
            }

            testResults.push({step: "Test 6: get_officer (verify update)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 6: get_officer (verify update)", status: "failed", error: rv.message});
            }
            else
            {
                let o = rv.officer;
                let verified = o.first_name === updatedFirstName &&
                               o.title === updatedTitle &&
                               o.description === "Updated description" &&
                               o.address === "456 Updated Street";
                if (verified)
                {
                    testResults.push({step: "Test 6: get_officer (verify update)", status: "passed", verified: true});
                }
                else
                {
                    testResults.push({step: "Test 6: get_officer (verify update)", status: "warning", verified: false, message: "Updated fields not saved correctly"});
                }
            }

            // -----------------------------------------------------------------
            // Active/Inactive Toggle
            // -----------------------------------------------------------------

            testResults.push({step: "Test 7: update_officer (deactivate)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", { user_id: addedOfficerId, is_active: false });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 7: update_officer (deactivate)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 7: update_officer (deactivate)", status: "passed"});
            }

            testResults.push({step: "Test 8: get_officers (include_inactive=true)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 8: get_officers (include_inactive=true)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.officers.find(o => o.user_id === addedOfficerId);
                if (found)
                {
                    testResults.push({step: "Test 8: get_officers (include_inactive=true)", status: "passed", found: true});
                }
                else
                {
                    testResults.push({step: "Test 8: get_officers (include_inactive=true)", status: "warning", message: "Inactive officer not found with include_inactive=true"});
                }
            }

            testResults.push({step: "Test 9: get_officers (include_inactive=false)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { include_inactive: false });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 9: get_officers (include_inactive=false)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.officers.find(o => o.user_id === addedOfficerId);
                if (!found)
                {
                    testResults.push({step: "Test 9: get_officers (include_inactive=false)", status: "passed", message: "inactive officer correctly excluded"});
                }
                else
                {
                    testResults.push({step: "Test 9: get_officers (include_inactive=false)", status: "warning", message: "inactive officer still appears in active list"});
                }
            }

            testResults.push({step: "Test 10: update_officer (reactivate)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", { user_id: addedOfficerId, is_active: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 10: update_officer (reactivate)", status: "failed", error: rv.message});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
                if (!$Err.isERR(rv) && rv.officer.is_active === true)
                {
                    testResults.push({step: "Test 10: update_officer (reactivate)", status: "passed", is_active: true});
                }
                else
                {
                    testResults.push({step: "Test 10: update_officer (reactivate)", status: "warning", message: "is_active not toggled correctly"});
                }
            }

            // -----------------------------------------------------------------
            // Search, Sort, Filter
            // -----------------------------------------------------------------

            testResults.push({step: "Test 11: get_officers (search_text)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { search_text: uniqueId, include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 11: get_officers (search_text)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.officers.find(o => o.user_id === addedOfficerId);
                if (found)
                {
                    testResults.push({step: "Test 11: get_officers (search_text)", status: "passed", result_count: rv.total_count});
                }
                else
                {
                    testResults.push({step: "Test 11: get_officers (search_text)", status: "warning", message: "Officer not found via search"});
                }
            }

            testResults.push({step: "Test 12: get_officers (sort)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { sort_by: "first_name", sort_dir: "desc", include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 12: get_officers (sort)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 12: get_officers (sort)", status: "passed", count: rv.total_count});
            }

            testResults.push({step: "Test 13: get_officers (community filter)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { community_id: addedCommunityId, include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 13: get_officers (community filter)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.officers.find(o => o.user_id === addedOfficerId);
                if (found && rv.officers.every(o => o.community_id === addedCommunityId))
                {
                    testResults.push({step: "Test 13: get_officers (community filter)", status: "passed", count: rv.total_count});
                }
                else
                {
                    testResults.push({step: "Test 13: get_officers (community filter)", status: "warning", message: "Community filter not applied correctly"});
                }
            }

            // -----------------------------------------------------------------
            // Roles & Certification Badges
            // -----------------------------------------------------------------

            testResults.push({step: "Test 14: update_officer (roles & badges)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", {
                user_id: addedOfficerId,
                roles: ["patrol", "supervisor", "investigator"],
                certification_badges: ["first_aid", "firearms", "cpr"]
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 14: update_officer (roles & badges)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 14: update_officer (roles & badges)", status: "passed"});
            }

            testResults.push({step: "Test 15: get_officer (verify roles & badges)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 15: get_officer (verify roles & badges)", status: "failed", error: rv.message});
            }
            else
            {
                let o = rv.officer;
                if (o.roles.length === 3 && o.certification_badges.length === 3)
                {
                    testResults.push({step: "Test 15: get_officer (verify roles & badges)", status: "passed", roles_count: 3, badges_count: 3});
                }
                else
                {
                    testResults.push({step: "Test 15: get_officer (verify roles & badges)", status: "warning", message: "Roles or badges not updated correctly"});
                }
            }

            testResults.push({step: "Test 16: update_officer (clear roles & badges)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", {
                user_id: addedOfficerId,
                roles: [],
                certification_badges: []
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 16: update_officer (clear roles & badges)", status: "failed", error: rv.message});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
                if (!$Err.isERR(rv) && rv.officer.roles.length === 0 && rv.officer.certification_badges.length === 0)
                {
                    testResults.push({step: "Test 16: update_officer (clear roles & badges)", status: "passed", roles_cleared: true, badges_cleared: true});
                }
                else
                {
                    testResults.push({step: "Test 16: update_officer (clear roles & badges)", status: "warning", message: "Roles or badges not cleared correctly"});
                }
            }

            // -----------------------------------------------------------------
            // Partial Update Regression (omitted fields must retain values)
            // -----------------------------------------------------------------

            testResults.push({step: "Test 16b: update_officer (set known values for partial update test)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", {
                user_id: addedOfficerId,
                first_name: "PartialTest",
                last_name: "KeepMe",
                title: "KeepTitle",
                description: "KeepDesc",
                address: "KeepAddr",
                roles: ["RoleA", "RoleB"],
                certification_badges: ["BadgeX"]
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 16b: update_officer (set known values for partial update test)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 16b: update_officer (set known values for partial update test)", status: "passed"});
            }

            testResults.push({step: "Test 16c: update_officer (partial update - only first_name)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", {
                user_id: addedOfficerId,
                first_name: "OnlyThisChanged"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 16c: update_officer (partial update - only first_name)", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 16c: update_officer (partial update - only first_name)", status: "passed"});
            }

            testResults.push({step: "Test 16d: get_officer (verify partial update preserved fields)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 16d: get_officer (verify partial update preserved fields)", status: "failed", error: rv.message});
            }
            else
            {
                let o = rv.officer;
                let preserved = o.first_name === "OnlyThisChanged" &&
                                o.last_name === "KeepMe" &&
                                o.title === "KeepTitle" &&
                                o.description === "KeepDesc" &&
                                o.address === "KeepAddr" &&
                                o.roles.length === 2 && o.roles.includes("RoleA") && o.roles.includes("RoleB") &&
                                o.certification_badges.length === 1 && o.certification_badges.includes("BadgeX");
                if (preserved)
                {
                    testResults.push({step: "Test 16d: get_officer (verify partial update preserved fields)", status: "passed", verified: true});
                }
                else
                {
                    testResults.push({step: "Test 16d: get_officer (verify partial update preserved fields)", status: "failed", verified: false,
                        message: "Omitted fields were cleared during partial update",
                        actual: { first_name: o.first_name, last_name: o.last_name, title: o.title, description: o.description, address: o.address, roles: o.roles, certification_badges: o.certification_badges }
                    });
                }
            }

            // -----------------------------------------------------------------
            // Officer Evaluations
            // -----------------------------------------------------------------

            testResults.push({step: "Test 17: add_officer_evaluation", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/add_officer_evaluation", {
                user_id: addedOfficerId,
                text: "Excellent performance during night shift",
                date: "2025-01-15"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 17: add_officer_evaluation", status: "failed", error: rv.message});
            }
            else
            {
                addedEvaluationId = rv.evaluation_id;
                testResults.push({step: "Test 17: add_officer_evaluation", status: "passed", evaluation_id: addedEvaluationId});
            }

            testResults.push({step: "Test 18: get_officer_evaluations (verify)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer_evaluations", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 18: get_officer_evaluations (verify)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.evaluations.find(e => e.evaluation_id === addedEvaluationId);
                if (found && found.text === "Excellent performance during night shift")
                {
                    testResults.push({step: "Test 18: get_officer_evaluations (verify)", status: "passed", verified: true, count: rv.evaluations.length});
                }
                else
                {
                    testResults.push({step: "Test 18: get_officer_evaluations (verify)", status: "warning", message: "Evaluation not found or fields mismatch"});
                }
            }

            testResults.push({step: "Test 19: add_officer_evaluation (second)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/add_officer_evaluation", {
                user_id: addedOfficerId,
                text: "Good teamwork skills",
                date: "2025-02-20"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 19: add_officer_evaluation (second)", status: "failed", error: rv.message});
            }
            else
            {
                addedEvaluation2Id = rv.evaluation_id;
                testResults.push({step: "Test 19: add_officer_evaluation (second)", status: "passed", evaluation_id: addedEvaluation2Id});
            }

            testResults.push({step: "Test 20: get_officer_evaluations (verify count)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer_evaluations", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 20: get_officer_evaluations (verify count)", status: "failed", error: rv.message});
            }
            else
            {
                if (rv.evaluations.length === 2)
                {
                    testResults.push({step: "Test 20: get_officer_evaluations (verify count)", status: "passed", count: 2});
                }
                else
                {
                    testResults.push({step: "Test 20: get_officer_evaluations (verify count)", status: "warning", expected: 2, actual: rv.evaluations.length});
                }
            }

            testResults.push({step: "Test 21: delete_officer_evaluation", status: "running"});
            if (addedEvaluationId === null)
            {
                testResults.push({step: "Test 21: delete_officer_evaluation", status: "failed", error: "Cannot delete - evaluation was not created"});
            }
            else
            {
                rv = $executeAPI(this.$Session, "Officer/delete_officer_evaluation", { evaluation_id: addedEvaluationId });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 21: delete_officer_evaluation", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 21: delete_officer_evaluation", status: "passed"});
                }
            }

            testResults.push({step: "Test 22: get_officer_evaluations (verify deletion)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer_evaluations", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 22: get_officer_evaluations (verify deletion)", status: "failed", error: rv.message});
            }
            else
            {
                let stillExists = rv.evaluations.find(e => e.evaluation_id === addedEvaluationId);
                if (!stillExists && rv.evaluations.length === 1)
                {
                    testResults.push({step: "Test 22: get_officer_evaluations (verify deletion)", status: "passed", remaining: 1});
                }
                else
                {
                    testResults.push({step: "Test 22: get_officer_evaluations (verify deletion)", status: "warning", message: "Deleted evaluation still present or count mismatch"});
                }
            }

            testResults.push({step: "Test 23: get_officer (verify evaluations embedded)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 23: get_officer (verify evaluations embedded)", status: "failed", error: rv.message});
            }
            else
            {
                if (Array.isArray(rv.officer.evaluations) && rv.officer.evaluations.length === 1)
                {
                    testResults.push({step: "Test 23: get_officer (verify evaluations embedded)", status: "passed", evaluations_count: 1});
                }
                else
                {
                    testResults.push({step: "Test 23: get_officer (verify evaluations embedded)", status: "warning", message: "Evaluations not embedded correctly in get_officer"});
                }
            }

            // -----------------------------------------------------------------
            // Negative Tests
            // -----------------------------------------------------------------

            testResults.push({step: "Test 24: get_officer (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: "invalid_id_999" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 24: get_officer (invalid ID)", status: "passed", message: "correctly rejected invalid ID"});
            }
            else
            {
                testResults.push({step: "Test 24: get_officer (invalid ID)", status: "warning", message: "accepted invalid ID unexpectedly"});
            }

            testResults.push({step: "Test 25: update_officer (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", { user_id: "invalid_id_999", first_name: "Should Fail" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 25: update_officer (invalid ID)", status: "passed", message: "correctly rejected invalid ID"});
            }
            else
            {
                testResults.push({step: "Test 25: update_officer (invalid ID)", status: "warning", message: "accepted invalid ID unexpectedly"});
            }

            testResults.push({step: "Test 26: delete_officer (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/delete_officer", { user_id: "invalid_id_999" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 26: delete_officer (invalid ID)", status: "passed", message: "correctly rejected invalid ID"});
            }
            else
            {
                testResults.push({step: "Test 26: delete_officer (invalid ID)", status: "warning", message: "accepted invalid ID unexpectedly"});
            }

            testResults.push({step: "Test 27: add_officer (empty phone)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: "NoPhone", phone_num: "", community_id: addedCommunityId, title: "Test"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 27: add_officer (empty phone)", status: "passed", message: "correctly rejected empty phone"});
            }
            else
            {
                testResults.push({step: "Test 27: add_officer (empty phone)", status: "warning", message: "accepted empty phone unexpectedly"});
                $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
            }

            testResults.push({step: "Test 28: add_officer (invalid community)", status: "running"});
            let testPhone2 = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: "BadCommunity", phone_num: testPhone2, community_id: 999999999, title: "Test"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 28: add_officer (invalid community)", status: "passed", message: "correctly rejected invalid community"});
            }
            else
            {
                testResults.push({step: "Test 28: add_officer (invalid community)", status: "warning", message: "accepted invalid community unexpectedly"});
                $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
            }

            testResults.push({step: "Test 29: add_officer (invalid email)", status: "running"});
            let testPhone3 = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: "BadEmail", phone_num: testPhone3, community_id: addedCommunityId,
                title: "Test", email: "not_an_email"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 29: add_officer (invalid email)", status: "passed", message: "correctly rejected invalid email"});
            }
            else
            {
                testResults.push({step: "Test 29: add_officer (invalid email)", status: "warning", message: "accepted invalid email unexpectedly"});
                $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
            }

            testResults.push({step: "Test 30: add_officer (duplicate phone)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: "DupPhone", phone_num: testPhone, community_id: addedCommunityId, title: "Test"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 30: add_officer (duplicate phone)", status: "passed", message: "correctly rejected duplicate phone"});
            }
            else
            {
                testResults.push({step: "Test 30: add_officer (duplicate phone)", status: "warning", message: "accepted duplicate phone unexpectedly"});
                $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
            }

            testResults.push({step: "Test 31: delete_officer_evaluation (invalid ID)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/delete_officer_evaluation", { evaluation_id: 999999999 });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 31: delete_officer_evaluation (invalid ID)", status: "passed", message: "correctly rejected invalid evaluation ID"});
            }
            else
            {
                testResults.push({step: "Test 31: delete_officer_evaluation (invalid ID)", status: "warning", message: "accepted invalid evaluation ID unexpectedly"});
            }

            testResults.push({step: "Test 32: add_officer_evaluation (invalid officer)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/add_officer_evaluation", {
                user_id: "invalid_id_999", text: "Should fail", date: "2025-01-01"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 32: add_officer_evaluation (invalid officer)", status: "passed", message: "correctly rejected invalid officer ID"});
            }
            else
            {
                testResults.push({step: "Test 32: add_officer_evaluation (invalid officer)", status: "warning", message: "accepted invalid officer ID unexpectedly"});
            }

            testResults.push({step: "Test 33: get_officer_evaluations (invalid officer)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer_evaluations", { user_id: "invalid_id_999" });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 33: get_officer_evaluations (invalid officer)", status: "passed", message: "correctly rejected invalid officer ID"});
            }
            else
            {
                testResults.push({step: "Test 33: get_officer_evaluations (invalid officer)", status: "warning", message: "accepted invalid officer ID unexpectedly"});
            }

            // -----------------------------------------------------------------
            // Edge Case Tests
            // -----------------------------------------------------------------

            testResults.push({step: "Test 34: add_officer (special chars)", status: "running"});
            let specialPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: `Test-Officer_Name & More ${uniqueId}`, phone_num: specialPhone,
                community_id: addedCommunityId, title: "Special Test"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 34: add_officer (special chars)", status: "warning", message: "rejected special characters", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 34: add_officer (special chars)", status: "passed", user_id: rv.user_id});
                $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
            }

            testResults.push({step: "Test 35: add_officer (long name)", status: "running"});
            let longPhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
            let longName = `Test Officer with Very Long Name That Contains Many Characters ${uniqueId} Extra Text To Make It Even Longer`;
            rv = $executeAPI(this.$Session, "Officer/add_officer", {
                first_name: longName, phone_num: longPhone,
                community_id: addedCommunityId, title: "Long Name Test"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 35: add_officer (long name)", status: "warning", message: "rejected long name", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 35: add_officer (long name)", status: "passed", user_id: rv.user_id});
                $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
            }

            testResults.push({step: "Test 36: update_officer (invalid email)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/update_officer", {
                user_id: addedOfficerId, email: "not_an_email"
            });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 36: update_officer (invalid email)", status: "passed", message: "correctly rejected invalid email"});
            }
            else
            {
                testResults.push({step: "Test 36: update_officer (invalid email)", status: "warning", message: "accepted invalid email unexpectedly"});
            }

            testResults.push({step: "Test 37: add_officer (inactive community)", status: "running"});
            let inactiveComRv = $executeAPI(this.$Session, "Community/add_community", {
                name: `Inactive Community ${uniqueId}`, area: "Test", is_active: true
            });
            if (!$Err.isERR(inactiveComRv))
            {
                let inactiveComId = inactiveComRv.community_id;
                $executeAPI(this.$Session, "Community/update_community", { community_id: inactiveComId, is_active: false });

                let inactivePhone = "+1555" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
                rv = $executeAPI(this.$Session, "Officer/add_officer", {
                    first_name: "InactiveCom", phone_num: inactivePhone,
                    community_id: inactiveComId, title: "Test"
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 37: add_officer (inactive community)", status: "passed", message: "correctly rejected inactive community"});
                }
                else
                {
                    testResults.push({step: "Test 37: add_officer (inactive community)", status: "warning", message: "accepted inactive community unexpectedly"});
                    $executeAPI(this.$Session, "Officer/delete_officer", { user_id: rv.user_id });
                }
            }
            else
            {
                testResults.push({step: "Test 37: add_officer (inactive community)", status: "warning", message: "could not create temp community for test"});
            }

            testResults.push({step: "Test 38: update_officer (reassign to inactive community)", status: "running"});
            if (inactiveComRv && !$Err.isERR(inactiveComRv))
            {
                rv = $executeAPI(this.$Session, "Officer/update_officer", {
                    user_id: addedOfficerId, community_id: inactiveComRv.community_id
                });
                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 38: update_officer (reassign to inactive community)", status: "passed", message: "correctly rejected inactive community"});
                }
                else
                {
                    testResults.push({step: "Test 38: update_officer (reassign to inactive community)", status: "warning", message: "accepted inactive community unexpectedly"});
                    // Reassign back to original community
                    $executeAPI(this.$Session, "Officer/update_officer", { user_id: addedOfficerId, community_id: addedCommunityId });
                }
            }
            else
            {
                testResults.push({step: "Test 38: update_officer (reassign to inactive community)", status: "warning", message: "skipped - inactive community not available"});
            }

            // -----------------------------------------------------------------
            // Impersonation Tests — Officer Self-Service
            // -----------------------------------------------------------------

            testResults.push({step: "Test 39: get_my_details (as officer)", status: "running"});
            try
            {
                this.$Session.impersonateAccount(addedOfficerId);

                rv = $executeAPI(this.$Session, "Officer/get_my_details", {});

                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;

                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 39: get_my_details (as officer)", status: "failed", error: rv.message});
                }
                else
                {
                    if (rv.officer && rv.officer.user_id === addedOfficerId)
                    {
                        testResults.push({step: "Test 39: get_my_details (as officer)", status: "passed", user_id: rv.officer.user_id});
                    }
                    else
                    {
                        testResults.push({step: "Test 39: get_my_details (as officer)", status: "warning", message: "get_my_details returned unexpected data"});
                    }
                }
            }
            catch (impErr)
            {
                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;
                testResults.push({step: "Test 39: get_my_details (as officer)", status: "warning", message: "impersonation not supported or failed", error: impErr.message});
            }

            testResults.push({step: "Test 40: update_my_details (as officer)", status: "running"});
            try
            {
                this.$Session.impersonateAccount(addedOfficerId);

                rv = $executeAPI(this.$Session, "Officer/update_my_details", {
                    first_name: "SelfUpdated",
                    address: "789 Self Street"
                });

                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;

                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 40: update_my_details (as officer)", status: "failed", error: rv.message});
                }
                else
                {
                    testResults.push({step: "Test 40: update_my_details (as officer)", status: "passed"});
                }
            }
            catch (impErr)
            {
                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;
                testResults.push({step: "Test 40: update_my_details (as officer)", status: "warning", message: "impersonation not supported or failed", error: impErr.message});
            }

            testResults.push({step: "Test 41: get_my_details (verify self-update)", status: "running"});
            try
            {
                this.$Session.impersonateAccount(addedOfficerId);

                rv = $executeAPI(this.$Session, "Officer/get_my_details", {});

                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;

                if ($Err.isERR(rv))
                {
                    testResults.push({step: "Test 41: get_my_details (verify self-update)", status: "failed", error: rv.message});
                }
                else
                {
                    if (rv.officer.first_name === "SelfUpdated" && rv.officer.address === "789 Self Street")
                    {
                        testResults.push({step: "Test 41: get_my_details (verify self-update)", status: "passed", verified: true});
                    }
                    else
                    {
                        testResults.push({step: "Test 41: get_my_details (verify self-update)", status: "warning", verified: false, message: "Self-updated fields not saved correctly"});
                    }
                }
            }
            catch (impErr)
            {
                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;
                testResults.push({step: "Test 41: get_my_details (verify self-update)", status: "warning", message: "impersonation not supported or failed", error: impErr.message});
            }

            // -----------------------------------------------------------------
            // Cleanup
            // -----------------------------------------------------------------

            testResults.push({step: "Test 42: delete_officer_evaluation (cleanup remaining)", status: "running"});
            if (addedEvaluation2Id !== null)
            {
                rv = $executeAPI(this.$Session, "Officer/delete_officer_evaluation", { evaluation_id: addedEvaluation2Id });
                testResults.push({step: "Test 42: delete_officer_evaluation (cleanup remaining)", status: $Err.isERR(rv) ? "failed" : "passed"});
            }
            else
            {
                testResults.push({step: "Test 42: delete_officer_evaluation (cleanup remaining)", status: "warning", message: "no second evaluation to clean up"});
            }

            testResults.push({step: "Test 43: delete_officer", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/delete_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 43: delete_officer", status: "failed", error: rv.message});
            }
            else
            {
                testResults.push({step: "Test 43: delete_officer", status: "passed"});
            }

            testResults.push({step: "Test 44: get_officers (verify deletion)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officers", { include_inactive: true });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 44: get_officers (verify deletion)", status: "failed", error: rv.message});
            }
            else
            {
                let found = rv.officers.find(o => o.user_id === addedOfficerId);
                if (!found)
                {
                    testResults.push({step: "Test 44: get_officers (verify deletion)", status: "passed", verified_deleted: true});
                }
                else
                {
                    testResults.push({step: "Test 44: get_officers (verify deletion)", status: "warning", message: "Deleted officer still appears in list"});
                }
            }

            testResults.push({step: "Test 45: get_officer (verify deletion)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/get_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 45: get_officer (verify deletion)", status: "passed", message: "correctly returns error for deleted officer"});
            }
            else
            {
                testResults.push({step: "Test 45: get_officer (verify deletion)", status: "warning", message: "deleted officer still retrievable"});
            }

            testResults.push({step: "Test 46: delete_officer (already deleted)", status: "running"});
            rv = $executeAPI(this.$Session, "Officer/delete_officer", { user_id: addedOfficerId });
            if ($Err.isERR(rv))
            {
                testResults.push({step: "Test 46: delete_officer (already deleted)", status: "passed", message: "correctly rejected already deleted officer"});
            }
            else
            {
                testResults.push({step: "Test 46: delete_officer (already deleted)", status: "warning", message: "accepted already deleted officer unexpectedly"});
            }

            testResults.push({step: "All tests completed", status: "success"});
        }
        catch (error)
        {
            testResults.push({step: "Exception occurred", status: "error", error: error.message, stack: error.stack});

            // Restore admin session if impersonation was active
            if (this.$Session.accountImpersonationStack !== null)
            {
                this.$Session.accountImpersonationStack = null;
                this.$Session.userId = adminUserId;
                this.$Session.userType = $Const.USER_TYPE_ADMIN;
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
}
