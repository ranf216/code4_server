/*
*   Export definitions used by $Export.run(name, params, format)
*
*   name            - the export name used by the api caller
*   title           - worksheet title (xlsx) / document title (pdf)
*   file_name       - generated file name prefix
*   default_format  - format used when the caller does not specify one
*   formats         - optional white list of the formats this export supports
*   max_rows        - maximum number of rows allowed in a single export
*   access_level    - access level of the generated file
*   columns         - [{header, key, width, type}], type: text|number|date|datetime|bool|phone|list
*   build           - function(params, session) that queries and shapes the data, and returns one of:
*                         {...rc, rows}      - the rows of the export, rendered using the "columns" above
*                         {...rc, sheets}    - [{title, columns, rows}], for a multi sheet export or when the
*                                              columns are known only at runtime (overrides "columns" above)
*                         an error rc object - returned as is to the api caller, no file is created
*   render          - pdf exports only - function(doc, data, params) that draws into the pdfkit document,
*                     where data is whatever build() returned. build() may also return "page" ({size, layout,
*                     margin}) and "title" to override the definition's page setup and document title.
*/

module.exports =
{
    "example"                           : {
                                            title           : "Example",
                                            file_name       : "example_export",
                                            default_format  : $Const.EXPORT_FORMAT_CSV,
                                            max_rows        : 5000,
                                            access_level    : $Const.FILE_ACCESS_LEVEL_LIMITED,
                                            columns         : [
                                                { header: "Column 1",           key: "col1",                width: 12 },
                                                { header: "Column 2",           key: "col2",                width: 15, type: "text" },
                                            ],
                                            build           : function(params, session)
                                                              {
                                                                let vals = {};
                                                                let rc = $ERRS.ERR_SUCCESS;

                                                                vals.rows = [
                                                                    { col1: "Value 1", col2: "Value 2" },
                                                                    { col1: "Value 3", col2: "Value 4" },
                                                                ];

                                                                return {...rc, ...vals};
                                                              },
                                        },
};
