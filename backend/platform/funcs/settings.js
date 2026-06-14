function getSettings(kvKey, defaults)
{
    let rows = $Db.executeQuery(
        `SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`,
        [kvKey]
    );

    const result = { ...defaults };
    if (rows.length > 0 && rows[0].KVL_VALUE)
    {
        const stored = JSON.parse(rows[0].KVL_VALUE);
        for (const [key, value] of Object.entries(stored))
        {
            if (key in result)
            {
                result[key] = value;
            }
        }
    }
    return result;
}

function updateSettings(kvKey, defaults, values)
{
    const toStore = {};
    for (const key of Object.keys(defaults))
    {
        if (key in values && values[key] !== undefined)
        {
            toStore[key] = values[key];
        }
    }

    const json = JSON.stringify(toStore);

    $Db.executeQuery(
        `INSERT INTO \`key_value\` (KVL_KEY, KVL_VALUE) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE KVL_VALUE=?`,
        [kvKey, json, json]
    );

    if ($Db.isError())
    {
        return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
    }

    return $ERRS.ERR_SUCCESS;
}


module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

    // =========================================================================
    // Service Types
    // =========================================================================

    get_service_types()
    {
        const items = $DataItemsCrud.getList("service_type");
        return { ...$ERRS.ERR_SUCCESS, items };
    }

    add_service_type()
    {
        return $DataItemsCrud.add("service_type", this.$name, null);
    }

    update_service_type()
    {
        return $DataItemsCrud.update("service_type", this.$type_id, this.$name, null);
    }

    delete_service_type()
    {
        return $DataItemsCrud.delete("service_type", this.$type_id);
    }

    // =========================================================================
    // Task Types
    // =========================================================================

    get_task_types()
    {
        const items = $DataItemsCrud.getList("task_type");
        return { ...$ERRS.ERR_SUCCESS, items };
    }

    add_task_type()
    {
        return $DataItemsCrud.add("task_type", this.$name, null);
    }

    update_task_type()
    {
        return $DataItemsCrud.update("task_type", this.$type_id, this.$name, null);
    }

    delete_task_type()
    {
        return $DataItemsCrud.delete("task_type", this.$type_id);
    }

    // =========================================================================
    // Asset Types
    // =========================================================================

    get_asset_types()
    {
        const items = $DataItemsCrud.getList("asset_type");
        return { ...$ERRS.ERR_SUCCESS, items };
    }

    add_asset_type()
    {
        return $DataItemsCrud.add("asset_type", this.$name, { icon: this.$icon, color: this.$color });
    }

    update_asset_type()
    {
        return $DataItemsCrud.update("asset_type", this.$type_id, this.$name, { icon: this.$icon, color: this.$color });
    }

    delete_asset_type()
    {
        return $DataItemsCrud.delete("asset_type", this.$type_id);
    }

    // =========================================================================
    // Post Order Section Types
    // =========================================================================

    get_po_section_types()
    {
        const items = $DataItemsCrud.getList("po_section_type");
        return { ...$ERRS.ERR_SUCCESS, items };
    }

    add_po_section_type()
    {
        return $DataItemsCrud.add("po_section_type", this.$name, { client_visible: this.$client_visible, short_description: this.$short_description, active: this.$active });
    }

    update_po_section_type()
    {
        return $DataItemsCrud.update("po_section_type", this.$type_id, this.$name, { client_visible: this.$client_visible, short_description: this.$short_description, active: this.$active });
    }

    delete_po_section_type()
    {
        return $DataItemsCrud.delete("po_section_type", this.$type_id);
    }

    // =========================================================================
    // GPS Settings
    // =========================================================================

    get_gps_settings()
    {
        const settings = getSettings($Const.KVL_SETTINGS_GPS, $Config.get("SETTINGS_DEFAULTS").gps);
        return { ...$ERRS.ERR_SUCCESS, ...settings };
    }

    update_gps_settings()
    {
        if (this.$gps_interval_normal !== undefined &&
            (this.$gps_interval_normal < 10 || this.$gps_interval_normal > 120))
        {
            return $ERRS.ERR_GPS_INTERVAL_NORMAL_OUT_OF_RANGE;
        }
        if (this.$gps_interval_emergency !== undefined &&
            (this.$gps_interval_emergency < 5 || this.$gps_interval_emergency > 30))
        {
            return $ERRS.ERR_GPS_INTERVAL_EMERGENCY_OUT_OF_RANGE;
        }

        const values = {
            gps_interval_normal: this.$gps_interval_normal,
            gps_interval_emergency: this.$gps_interval_emergency,
            gps_stale_threshold: this.$gps_stale_threshold,
            location_history_retention: this.$location_history_retention,
            map_refresh_interval: this.$map_refresh_interval,
            patrol_compliance_threshold: this.$patrol_compliance_threshold,
            emergency_eta_interval: this.$emergency_eta_interval,
            map_provider: this.$map_provider,
        };
        updateSettings($Const.KVL_SETTINGS_GPS, $Config.get("SETTINGS_DEFAULTS").gps, values);
        return $ERRS.ERR_SUCCESS;
    }

    // =========================================================================
    // Notification Settings
    // =========================================================================

    get_notification_settings()
    {
        const settings = getSettings($Const.KVL_SETTINGS_NOTIFICATION, $Config.get("SETTINGS_DEFAULTS").notification);
        return { ...$ERRS.ERR_SUCCESS, ...settings };
    }

    update_notification_settings()
    {
        const values = {
            notification_methods: this.$notification_methods,
            notification_title: this.$notification_title,
            sender_name: this.$sender_name,
            new_call_enabled: this.$new_call_enabled,
            call_accepted_enabled: this.$call_accepted_enabled,
            call_edited_enabled: this.$call_edited_enabled,
            call_resolved_enabled: this.$call_resolved_enabled,
            post_order_published_enabled: this.$post_order_published_enabled,
            post_order_updated_enabled: this.$post_order_updated_enabled,
            poi_active_enabled: this.$poi_active_enabled,
            poi_updated_enabled: this.$poi_updated_enabled,
            poi_inactivated_enabled: this.$poi_inactivated_enabled,
            poi_expiring_enabled: this.$poi_expiring_enabled,
            poi_expired_enabled: this.$poi_expired_enabled,
            report_submitted_enabled: this.$report_submitted_enabled,
            report_approved_enabled: this.$report_approved_enabled,
            report_changes_enabled: this.$report_changes_enabled,
            report_delivered_enabled: this.$report_delivered_enabled,
        };
        updateSettings($Const.KVL_SETTINGS_NOTIFICATION, $Config.get("SETTINGS_DEFAULTS").notification, values);
        return $ERRS.ERR_SUCCESS;
    }

    // =========================================================================
    // POI Settings
    // =========================================================================

    get_poi_settings()
    {
        const settings = getSettings($Const.KVL_SETTINGS_POI, $Config.get("SETTINGS_DEFAULTS").poi);
        return { ...$ERRS.ERR_SUCCESS, ...settings };
    }

    update_poi_settings()
    {
        const values = {
            renewal_reminder_days: this.$renewal_reminder_days,
            archive_threshold_months: this.$archive_threshold_months,
            pdf_export_enabled: this.$pdf_export_enabled,
            default_poi_guidance: this.$default_poi_guidance,
            default_trespass_guidance: this.$default_trespass_guidance,
            default_red_card_guidance: this.$default_red_card_guidance,
        };
        updateSettings($Const.KVL_SETTINGS_POI, $Config.get("SETTINGS_DEFAULTS").poi, values);
        return $ERRS.ERR_SUCCESS;
    }

    // =========================================================================
    // Working Hours Settings
    // =========================================================================

    get_working_hours_settings()
    {
        const settings = getSettings($Const.KVL_SETTINGS_WORKING_HOURS, $Config.get("SETTINGS_DEFAULTS").working_hours);
        return { ...$ERRS.ERR_SUCCESS, ...settings };
    }

    update_working_hours_settings()
    {
        const values = {
            max_hours_per_day: this.$max_hours_per_day,
        };
        updateSettings($Const.KVL_SETTINGS_WORKING_HOURS, $Config.get("SETTINGS_DEFAULTS").working_hours, values);
        return $ERRS.ERR_SUCCESS;
    }
}
