module.exports = {
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
