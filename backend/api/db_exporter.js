// Active exports tracking for server-side abort
const activeExports = {};

// Configuration for export defaults
const EXPORT_CONFIG = {
    // Tables to exclude from export entirely
    excludeTables: [
        // 'cache_table',
        // 'temp_logs'
    ],
    
    // Tables to export structure only (no data)
    excludeDataTables: [
        'log',
        'change_log',
    ]
};

exports.run = function (req, res)
{
    if ($Config.get("enable_db_exporter") != true)
    {
        $Utils.unauthorize();
        return;
    }

    $Utils.authorizeIP($Config.get("restrict_db_exporter_to_ip"));

    var html = $Utils.fileGetContents(__dirname + "/content/db_exporter.html");

    html = html.replace("{{getWebClientMessages}}", $Utils.getWebClientMessages())
                .replace("{{getWebClientEnvironment}}", $Utils.getWebClientEnvironment())
                .replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
                .replace("{{system}}", $Config.get("SYSTEM_NAME"));

    res.send(html);
}

exports.getDbStructure = function (req, res)
{
    if ($Config.get("enable_db_exporter") != true)
    {
        return res.status(403).json({ error: "DB Exporter is disabled" });
    }

    $Utils.authorizeIP($Config.get("restrict_db_exporter_to_ip"));

    const schema = $Config.get("db_schema");
    const result = {
        tables: [],
        views: [],
        procedures: [],
        triggers: []
    };

    try
    {
        // Get tables
        const tables = $Db.executeQuery(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `, [schema]);

        tables.forEach(table => {
            const tableName = table.TABLE_NAME;
            const shouldExclude = EXPORT_CONFIG.excludeTables.includes(tableName);
            const shouldExcludeData = EXPORT_CONFIG.excludeDataTables.includes(tableName);
            
            result.tables.push({
                name: tableName,
                exportTable: !shouldExclude,
                exportData: !shouldExclude && !shouldExcludeData
            });
        });

        // Get views
        const views = $Db.executeQuery(`
            SELECT TABLE_NAME 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `, [schema]);

        views.forEach(view => {
            result.views.push({
                name: view.TABLE_NAME,
                exportView: true
            });
        });

        // Get stored procedures and functions
        const procedures = $Db.executeQuery(`
            SELECT ROUTINE_NAME, ROUTINE_TYPE
            FROM information_schema.ROUTINES 
            WHERE ROUTINE_SCHEMA = ?
            ORDER BY ROUTINE_NAME
        `, [schema]);

        procedures.forEach(proc => {
            result.procedures.push({
                name: proc.ROUTINE_NAME,
                type: proc.ROUTINE_TYPE,
                exportProcedure: true
            });
        });

        // Get triggers
        const triggers = $Db.executeQuery(`
            SELECT TRIGGER_NAME 
            FROM information_schema.TRIGGERS 
            WHERE TRIGGER_SCHEMA = ?
            ORDER BY TRIGGER_NAME
        `, [schema]);

        triggers.forEach(trigger => {
            result.triggers.push({
                name: trigger.TRIGGER_NAME,
                exportTrigger: true
            });
        });

        res.json(result);
    }
    catch (error)
    {
        console.error("Error getting DB structure:", error);
        res.status(500).json({ error: error.message });
    }
}

exports.stopExport = function (req, res)
{
    if ($Config.get("enable_db_exporter") != true)
    {
        return res.status(403).json({ error: "DB Exporter is disabled" });
    }

    $Utils.authorizeIP($Config.get("restrict_db_exporter_to_ip"));

    const exportId = req.query.id;
    if (exportId && activeExports[exportId])
    {
        activeExports[exportId].aborted = true;
        return res.json({ rc: 0, message: "Export stop signal sent" });
    }

    return res.json({ rc: 1, message: "Export not found" });
}

exports.exportDb = function (req, res)
{
    if ($Config.get("enable_db_exporter") != true)
    {
        return res.status(403).json({ error: "DB Exporter is disabled" });
    }

    $Utils.authorizeIP($Config.get("restrict_db_exporter_to_ip"));

    const schema = $Config.get("db_schema");
    const exportData = JSON.parse(req.body);

    // Generate filename and set headers before streaming
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + 
                   String(now.getMinutes()).padStart(2, '0');
    const filename = `${schema} ${dateStr} ${timeStr}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Track client abort
    const exportId = req.query.id || Date.now().toString();
    activeExports[exportId] = { aborted: false };
    
    req.on('aborted', () => {
        activeExports[exportId].aborted = true;
        console.log('Client aborted the request');
    });

    try
    {
        // Calculate total items to export
        const totalTables = exportData.tables.filter(t => t.exportTable).length;
        const totalViews = exportData.views.filter(v => v.exportView).length;
        const totalProcedures = exportData.procedures.filter(p => p.exportProcedure).length;
        const totalTriggers = exportData.triggers.filter(t => t.exportTrigger).length;
        const totalItems = totalTables + totalViews + totalProcedures + totalTriggers;
        let currentItem = 0;

        // Safe write helper - checks if client aborted
        const safeWrite = (data) => {
            if (activeExports[exportId].aborted || req.aborted) {
                console.log('Export aborted, stopping write');
                return false;
            }
            try {
                res.write(data);
                return true;
            } catch (e) {
                console.log('Write exception:', e.message);
                return false;
            }
        };

        // Progress callback function
        const progressCallback = (type, name, currentRow, totalRows) => {
            const progress = {
                currentItem: currentItem,
                totalItems: totalItems,
                currentType: type,
                currentName: name,
                currentRow: currentRow || 0,
                totalRows: totalRows || 0
            };
            // Send progress as SQL comment that will be ignored during import
            return safeWrite(`-- PROGRESS: ${JSON.stringify(progress)}\n`);
        };

        if (safeWrite(`-- Database Export\n`) === false) return;
        if (safeWrite(`-- Schema: ${schema}\n`) === false) return;
        if (safeWrite(`-- Generated: ${new Date().toISOString()}\n\n`) === false) return;
        if (safeWrite(`/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET NAMES utf8mb4 */;\n\n`) === false) return;
        if (safeWrite(`/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\n`) === false) return;
        if (safeWrite(`/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n\n`) === false) return;

        // Export tables
        for (const table of exportData.tables)
        {
            if (table.exportTable)
            {
                currentItem++;
                const result = exportTable(res, schema, table.name, table.exportData, progressCallback, currentItem, totalItems, safeWrite);
                if (result === false) {
                    console.log('Export cancelled during table export');
                    return;
                }
            }
        }

        // Export views
        for (const view of exportData.views)
        {
            if (view.exportView)
            {
                currentItem++;
                if (progressCallback('view', view.name, 0, 0) === false) return;
                if (exportView(res, schema, view.name, safeWrite) === false) return;
            }
        }

        // Export procedures
        for (const proc of exportData.procedures)
        {
            if (proc.exportProcedure)
            {
                currentItem++;
                if (progressCallback('procedure', proc.name, 0, 0) === false) return;
                if (exportProcedure(res, schema, proc.name, proc.type, safeWrite) === false) return;
            }
        }

        // Export triggers
        for (const trigger of exportData.triggers)
        {
            if (trigger.exportTrigger)
            {
                currentItem++;
                if (progressCallback('trigger', trigger.name, 0, 0) === false) return;
                if (exportTrigger(res, schema, trigger.name, safeWrite) === false) return;
            }
        }

        if (safeWrite(`\n/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`) === false) return;
        if (safeWrite(`/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`) === false) return;
        if (safeWrite(`/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`) === false) return;
        if (safeWrite(`/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`) === false) return;

        res.end();
    }
    catch (error)
    {
        console.error("Error exporting database:", error);
        if (!res.headersSent)
        {
            res.status(500).json({ error: error.message });
        }
        else
        {
            res.end();
        }
    }
    finally
    {
        delete activeExports[exportId];
    }
}

const DATA_BATCH_SIZE = 1000;

function exportTable(res, schema, tableName, exportData, progressCallback, currentItem, totalItems, safeWrite)
{
    if (safeWrite(`-- Table: ${tableName}\n`) === false) return false;
    if (safeWrite(`DROP TABLE IF EXISTS \`${tableName}\`;\n`) === false) return false;

    // Get CREATE TABLE statement
    const createResult = $Db.executeQuery(`SHOW CREATE TABLE \`${tableName}\``);
    let createTableSql = createResult[0]['Create Table'];
    
    // Keep JSON columns as-is (don't change NOT NULL)
    // Keep functional/expression-based indexes in CREATE TABLE statement
    // (Previously these were extracted and added as ALTER TABLE, which caused DB crashes)
    
    // Remove AUTO_INCREMENT value from CREATE TABLE when exporting data
    // We'll add it back after data insertion to ensure correct value
    let autoIncrementValue = null;
    if (exportData)
    {
        const autoIncrementMatch = createTableSql.match(/AUTO_INCREMENT=(\d+)/);
        if (autoIncrementMatch)
        {
            autoIncrementValue = autoIncrementMatch[1];
            createTableSql = createTableSql.replace(/\s+AUTO_INCREMENT=\d+/, '');
        }
    }
    
    if (safeWrite(createTableSql + ';\n\n') === false) return false;

    // Export data if requested
    if (exportData)
    {
        // Get column metadata
        const columnInfo = $Db.executeQuery(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `, [schema, tableName]);
        
        const columnMetaMap = {};
        columnInfo.forEach(col => {
            const colType = col.DATA_TYPE.toLowerCase();
            columnMetaMap[col.COLUMN_NAME] = {
                type: colType,
                nullable: col.IS_NULLABLE === 'YES',
                hasDefault: col.COLUMN_DEFAULT !== null
            };
        });

        // Get total row count to determine if there is data to export
        const countResult = $Db.executeQuery(`SELECT COUNT(*) total FROM \`${tableName}\``);
        const totalRows = countResult[0].total;
        
        // Send initial progress for this table
        if (progressCallback)
        {
            if (progressCallback('table', tableName, 0, totalRows) === false) return false;
        }
        
        if (totalRows > 0)
        {
            if (safeWrite(`-- Data for table: ${tableName}\n`) === false) return false;
            if (safeWrite(`/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;\n`) === false) return false;
            
            let columns = null;
            let columnList = null;
            
            // Fetch and stream data in batches to avoid loading entire table into memory
            for (let offset = 0; offset < totalRows; offset += DATA_BATCH_SIZE)
            {
                // Send progress update
                if (progressCallback)
                {
                    if (progressCallback('table', tableName, offset, totalRows) === false)
                    {
                        console.log(`Export cancelled during table ${tableName} data export`);
                        return false;
                    }
                }

                const rows = $Db.executeQuery(
                    `SELECT * FROM \`${tableName}\` LIMIT ${DATA_BATCH_SIZE} OFFSET ${offset}`
                );
                
                if (rows.length === 0) break;
                
                // Get columns from first batch
                if (columns === null)
                {
                    columns = Object.keys(rows[0]);
                    columnList = columns.map(col => `\`${col}\``).join(', ');
                }
                
                // Insert in batches of 5 rows
                for (let i = 0; i < rows.length; i += 5)
                {
                    const batch = rows.slice(i, i + 5);
                    let sql = `INSERT INTO \`${tableName}\` (${columnList}) VALUES\n`;
                    
                    const values = batch.map(row => {
                        const vals = columns.map(col => {
                            const val = row[col];
                            const meta = columnMetaMap[col];
                            const isJsonType = meta && meta.type === 'json';
                            
                            // Handle NULL
                            if (val === null || val === undefined) return 'NULL';
                            
                            // Handle JSON columns - export as hex binary with CAST
                            if (isJsonType) {
                                let jsonStr;
                                if (typeof val === 'object') {
                                    // MySQL driver returns JSON as parsed objects/arrays
                                    jsonStr = JSON.stringify(val);
                                } else {
                                    jsonStr = String(val);
                                }
                                // Convert JSON string to hex binary representation and wrap with CAST
                                // CAST is required to convert from binary charset to character string for JSON columns
                                const hexStr = Buffer.from(jsonStr, 'utf8').toString('hex').toUpperCase();
                                return `CAST(0x${hexStr} AS CHAR)`;
                            }
                            
                            // Handle objects/arrays (non-JSON typed columns that return objects)
                            if (typeof val === 'object' && !Buffer.isBuffer(val) && !(val instanceof Date)) {
                                const strVal = JSON.stringify(val);
                                const escaped = strVal
                                    .replace(/\\/g, '\\\\')
                                    .replace(/'/g, "''")
                                    .replace(/\n/g, '\\n')
                                    .replace(/\r/g, '\\r')
                                    .replace(/\t/g, '\\t')
                                    .replace(/\0/g, '\\0');
                                return `'${escaped}'`;
                            }
                            
                            // Handle numbers
                            if (typeof val === 'number') return val;
                            
                            // Handle booleans
                            if (typeof val === 'boolean') return val ? 1 : 0;
                            
                            // Handle Date objects
                            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                            
                            // Handle Buffer (BLOB/BINARY data)
                            if (Buffer.isBuffer(val)) {
                                if (val.length === 0) return 'NULL';
                                return `0x${val.toString('hex')}`;
                            }
                            
                            // Handle strings
                            const strVal = String(val);
                            
                            // For non-JSON columns: empty string handling
                            if (strVal === '') {
                                return "''";
                            }
                            
                            // Escape special characters for SQL
                            const escaped = strVal
                                .replace(/\\/g, '\\\\')
                                .replace(/'/g, "''")
                                .replace(/\n/g, '\\n')
                                .replace(/\r/g, '\\r')
                                .replace(/\t/g, '\\t')
                                .replace(/\0/g, '\\0');
                            
                            return `'${escaped}'`;
                        });
                        return `(${vals.join(', ')})`;
                    });
                    
                    sql += values.join(',\n') + ';\n';
                    if (safeWrite(sql) === false) return false;
                }
            }
            
            // Send final progress for this table
            if (progressCallback)
            {
                if (progressCallback('table', tableName, totalRows, totalRows) === false) return false;
            }
            
            if (safeWrite(`/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;\n\n`) === false) return false;
        }
        
        // Reset AUTO_INCREMENT value after data insertion
        if (autoIncrementValue !== null)
        {
            if (safeWrite(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT=${autoIncrementValue};\n\n`) === false) return false;
        }
    }
    else
    {
        // Structure only - send progress
        if (progressCallback)
        {
            if (progressCallback('table', tableName, 0, 0) === false) return false;
        }
    }
    
    return true;
}

function exportView(res, schema, viewName, safeWrite)
{
    if (safeWrite(`-- View: ${viewName}\n`) === false) return false;
    if (safeWrite(`DROP VIEW IF EXISTS \`${viewName}\`;\n`) === false) return false;

    const createResult = $Db.executeQuery(`SHOW CREATE VIEW \`${viewName}\``);
    if (safeWrite(createResult[0]['Create View'].replace(/^CREATE.*?VIEW/, 'CREATE VIEW') + ';\n\n') === false) return false;
    
    return true;
}

function exportProcedure(res, schema, procName, procType, safeWrite)
{
    const type = procType.toUpperCase();
    if (safeWrite(`-- ${type}: ${procName}\n`) === false) return false;
    if (safeWrite(`DROP ${type} IF EXISTS \`${procName}\`;\n`) === false) return false;
    if (safeWrite(`DELIMITER $$\n`) === false) return false;

    const showCmd = type === 'PROCEDURE' ? 'SHOW CREATE PROCEDURE' : 'SHOW CREATE FUNCTION';
    const createResult = $Db.executeQuery(`${showCmd} \`${procName}\``);
    const createKey = type === 'PROCEDURE' ? 'Create Procedure' : 'Create Function';
    
    if (safeWrite(createResult[0][createKey] + '$$\n') === false) return false;
    if (safeWrite(`DELIMITER ;\n\n`) === false) return false;
    
    return true;
}

function exportTrigger(res, schema, triggerName, safeWrite)
{
    if (safeWrite(`-- Trigger: ${triggerName}\n`) === false) return false;
    if (safeWrite(`DROP TRIGGER IF EXISTS \`${triggerName}\`;\n`) === false) return false;
    if (safeWrite(`DELIMITER $$\n`) === false) return false;

    const createResult = $Db.executeQuery(`SHOW CREATE TRIGGER \`${triggerName}\``);
    if (safeWrite(createResult[0]['SQL Original Statement'] + '$$\n') === false) return false;
    if (safeWrite(`DELIMITER ;\n\n`) === false) return false;
    
    return true;
}
