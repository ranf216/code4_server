const fs = require('fs');
const path = require('path');

const tablesPath = path.join(__dirname, "..", "db/triggers_def.js");
const triggersPath = path.join(__dirname, "..", "db/triggers.sql");
const dropTriggersPath = path.join(__dirname, "..", "db/triggers_drop.sql");

const tables = require(tablesPath);


let allTriggerNames = [];
let sql = "DELIMITER $$\n\n";

tables.forEach(table =>
{
    allTriggerNames.push(`log_insert_${table.name}`);

    let insertFields = "";
    table.insert_fields.forEach(fld =>
    {
        if (insertFields)
        {
            insertFields += ",\n";
        }
        insertFields += `            '${fld.substring(4).toLocaleLowerCase()}', NEW.${fld}`;
    });

    let updateComapreFields = "";
    let updateOldFields = "";
    let updateNewFields = "";
    table.update_fields.forEach(fld =>
    {
        if (updateOldFields)
        {
            updateComapreFields += " AND\n";
            updateOldFields += ",\n";
            updateNewFields += ",\n";
        }
        updateComapreFields += `        OLD.${fld} <=> NEW.${fld}`;
        updateOldFields += `                '${fld.substring(4).toLocaleLowerCase()}', OLD.${fld}`;
        updateNewFields += `                '${fld.substring(4).toLocaleLowerCase()}', NEW.${fld}`;
    });

    let insertCustom = (table.insert_custom ? `\n${table.insert_custom}` : "");
    let updateCustom = (table.update_custom ? `\n${table.update_custom}` : "");

    sql +=
`
-- ------------------------
-- ${table.name} TRIGGERS

DROP TRIGGER IF EXISTS log_insert_${table.name}$$
CREATE TRIGGER log_insert_${table.name}
AFTER INSERT ON \`${table.name}\`
FOR EACH ROW
BEGIN
    INSERT INTO \`change_log\` (CHL_TABLE, CHL_RECORD_ID, CHL_OPERATION_TYPE, CHL_OLD_VALUES, CHL_NEW_VALUES, CHL_CREATED_ON)
    VALUES (
        '${table.name}',
        NEW.${table.id},
        'INSERT',
        JSON_OBJECT(),
        JSON_OBJECT(
${insertFields}
        ),
        NOW()
    );${insertCustom}
END $$
`;

    if (updateNewFields)
    {
        allTriggerNames.push(`log_update_${table.name}`);

        sql +=
`
DROP TRIGGER IF EXISTS log_update_${table.name}$$
CREATE TRIGGER log_update_${table.name}
AFTER UPDATE ON \`${table.name}\`
FOR EACH ROW
BEGIN
    IF NOT (
${updateComapreFields}
    ) THEN
        INSERT INTO \`change_log\` (CHL_TABLE, CHL_RECORD_ID, CHL_OPERATION_TYPE, CHL_OLD_VALUES, CHL_NEW_VALUES, CHL_CREATED_ON)
        VALUES (
            '${table.name}',
            OLD.${table.id},
            'UPDATE',
            JSON_OBJECT(
${updateOldFields}
            ),
            JSON_OBJECT(
${updateNewFields}
            ),
            NOW()
        );${updateCustom}
    END IF;
END $$
`;
    }

    if (table.log_delete)
    {
        allTriggerNames.push(`log_delete_${table.name}`);

        sql +=
`
DROP TRIGGER IF EXISTS log_delete_${table.name}$$
CREATE TRIGGER log_delete_${table.name}
AFTER DELETE ON \`${table.name}\`
FOR EACH ROW
BEGIN
    INSERT INTO \`change_log\` (CHL_TABLE, CHL_RECORD_ID, CHL_OPERATION_TYPE, CHL_OLD_VALUES, CHL_NEW_VALUES, CHL_CREATED_ON)
    VALUES (
        '${table.name}',
        OLD.${table.id},
        'DELETE',
        '{}',
        '{}',
        NOW()
    );
END $$
`;
    }
});

sql += "\nDELIMITER ;\n";


let fd = fs.openSync(triggersPath, "w");
fs.writeSync(fd, sql);
fs.closeSync(fd);


let delSql = "";
allTriggerNames.forEach(name =>
{
    delSql += `DROP TRIGGER IF EXISTS ${name};\n`;
});

fd = fs.openSync(dropTriggersPath, "w");
fs.writeSync(fd, delSql);
fs.closeSync(fd);
