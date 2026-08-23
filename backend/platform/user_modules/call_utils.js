const TABLE_CATEGORY = "call_category";
const TABLE_STATUS = "call_status";
const TABLE_PRIORITY = "call_priority";

const OWNER_COLUMNS =
{
    resident: "SVC_RES_USR_ID",
    officer: "SVC_OFC_USR_ID",
    community: "SVC_COM_ID",
};

// Returns the ids of every item in dataTable whose attribute equals attrVal.
function idsByAttr(dataTable, attrName, attrVal)
{
    return Object.keys($DataItems.filterItemsIdByAttr(attrName, attrVal, dataTable) || {});
}

function hasAttr(dataTable, dataId, attrName)
{
    return $DataItems.getItemAttr(dataId, dataTable, attrName) === true;
}

function callsExist(owner, ownerId, openOnly)
{
    let column = OWNER_COLUMNS[owner];
    if ($Utils.empty(column) || $Utils.empty(ownerId))
    {
        return false;
    }

    let conditions = [`${column}=?`, "SVC_DELETED_ON IS NULL"];
    let params = [ownerId];

    if (openOnly)
    {
        let openStatuses = idsByAttr(TABLE_STATUS, "is_open", true);
        conditions.push(`SVC_STATUS IN (${openStatuses.toPlaceholders()})`);
        params.push(...openStatuses);
    }

    let rows = $Db.executeQuery(
        `SELECT SVC_ID FROM \`service_call\`
         WHERE ${conditions.join(" AND ")}
         LIMIT 1`,
        params);

    return rows.length > 0;
}

module.exports =
{
    __initialize()
    {
        $DataItems.define(TABLE_CATEGORY);
        $DataItems.define(TABLE_STATUS);
        $DataItems.define(TABLE_PRIORITY);
    },

    // ---- Derived id sets (sourced from platform/data/*.json via $DataItems) ----

    openStatuses()
    {
        return idsByAttr(TABLE_STATUS, "is_open", true);
    },

    closedStatuses()
    {
        return idsByAttr(TABLE_STATUS, "is_open", false);
    },

    emergencyCategories()
    {
        return idsByAttr(TABLE_CATEGORY, "is_emergency", true);
    },

    // Categories broadcast to every officer in the community, rather than to a single assignee.
    broadcastCategories()
    {
        return idsByAttr(TABLE_CATEGORY, "is_broadcast", true);
    },

    // ---- Predicates ----

    isOpenStatus(status)
    {
        return hasAttr(TABLE_STATUS, status, "is_open");
    },

    isEmergencyCategory(category)
    {
        return hasAttr(TABLE_CATEGORY, category, "is_emergency");
    },

    isBroadcastCategory(category)
    {
        return hasAttr(TABLE_CATEGORY, category, "is_broadcast");
    },

    // Categories whose priority is forced to urgent regardless of the requested value.
    forcesUrgentPriority(category)
    {
        return hasAttr(TABLE_CATEGORY, category, "forces_urgent");
    },

    // ---- Cross-module call-existence guards ----

    residentHasOpenCalls(userId)
    {
        return callsExist("resident", userId, true);
    },

    residentHasAnyCalls(userId)
    {
        return callsExist("resident", userId, false);
    },

    officerHasOpenCalls(userId)
    {
        return callsExist("officer", userId, true);
    },

    officerHasAnyCalls(userId)
    {
        return callsExist("officer", userId, false);
    },

    communityHasOpenCalls(communityId)
    {
        return callsExist("community", communityId, true);
    },
};
