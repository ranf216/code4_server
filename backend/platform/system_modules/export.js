/*
*   Generic tabular export module.
*
*   Domain modules build the rows, this module owns formatting, serializing, saving and the download url.
*
*   Column definition:  {header, key, width, type}
*   Column types:       text (default), number, date, datetime, bool, phone, list
*
*   Direct usage:
*       $Export.generate({
*           name        : "patient_export",
*           format      : $Const.EXPORT_FORMAT_XLSX,
*           owner       : userId,
*           sheets      : [{title: "Patients", columns: [...], rows: [...]}],
*       });
*
*   Registry usage (definitions in platform/definitions/exports.js):
*       $Export.run("patients", {patient_ids: [...]}, "xlsx");
*
*   PDF exports are free form - instead of columns and rows, the definition supplies a render(doc, data, params)
*   function that draws into a pdfkit document:
*       $Export.generate({
*           name        : "calendar_export",
*           format      : $Const.EXPORT_FORMAT_PDF,
*           owner       : userId,
*           page        : {size: "LETTER", layout: "landscape", margin: 24},
*           render      : doc => {...},
*       });
*/

const CONTENT_TYPES =
{
    csv     : "text/csv",
    xlsx    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf     : "application/pdf",
};

const TABULAR_FORMATS = ["csv", "xlsx"];

let definitions = null;

function _formatValue(value, type)
{
    if (value === null || value === undefined || value === "" || value === $Const.DATE_NULL)
    {
        return "";
    }

    switch (type)
    {
        case "number":
            return (isNaN(value) ? String(value) : Number(value));

        case "date":
        case "datetime":
        {
            const date = new $Date(value);
            if (!date.isValid())
            {
                return String(value);
            }
            return date.format(type == "date" ? "Y-m-d" : "Y-m-d H:i");
        }

        case "bool":
            return ($Utils.empty(value) ? "No" : "Yes");

        case "phone":
            return $Utils.formatPhone(value);

        case "list":
            return (Array.isArray(value) ? value.filter(v => !$Utils.empty(v)).join(", ") : String(value));

        default:
            return String(value);
    }
}

function _escapeCsvValue(value)
{
    if (typeof value === "number")
    {
        return String(value);
    }

    let str = String(value);

    // Neutralize spreadsheet formula injection - the value is data, never a formula
    if (/^[=+\-@\t\r]/.test(str))
    {
        str = "'" + str;
    }

    if (/[",\r\n]/.test(str))
    {
        str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

function _buildCsv(sheet)
{
    const lines = [sheet.columns.map(col => _escapeCsvValue(col.header)).join(",")];

    sheet.rows.forEach(row =>
    {
        lines.push(sheet.columns.map(col => _escapeCsvValue(_formatValue(row[col.key], col.type))).join(","));
    });

    // BOM, otherwise Excel reads the file as ANSI and mangles any non-ascii character
    return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf8");
}

function _buildXlsx(sheets, creator)
{
    const ExcelJS = require("exceljs");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = creator;
    workbook.created = new Date();

    sheets.forEach((sheet, index) =>
    {
        const worksheet = workbook.addWorksheet(sheet.title || `Sheet${index + 1}`);

        worksheet.columns = sheet.columns.map(col => ({header: col.header, key: col.key, width: col.width || 20}));

        sheet.rows.forEach(row =>
        {
            const values = {};
            sheet.columns.forEach(col =>
            {
                values[col.key] = _formatValue(row[col.key], col.type);
            });
            worksheet.addRow(values);
        });

        const headerRow = worksheet.getRow(1);
        headerRow.font = {bold: true};
        headerRow.alignment = {vertical: "middle"};

        worksheet.views = [{state: "frozen", ySplit: 1}];
        worksheet.autoFilter = {from: {row: 1, column: 1}, to: {row: 1, column: sheet.columns.length}};
    });

    let buffer = null;
    let error = null;
    let asyncDone = false;

    workbook.xlsx.writeBuffer().then(buf =>
    {
        buffer = buf;
        asyncDone = true;
    }).catch(err =>
    {
        error = err;
        asyncDone = true;
    });

    require('deasync').loopWhile(function(){return !asyncDone;});

    if (error)
    {
        $Logger.logString($Const.LL_ERROR, `Failed to write xlsx buffer: ${error.message}`);
        return null;
    }

    return buffer;
}

/*
*   Free form document rendering - the caller supplies render(doc), where doc is a PDFDocument.
*   page: {size, layout, margin} - see http://pdfkit.org/docs/paper_sizes.html
*/
function _buildPdf(render, page, info)
{
    const PDFDocument = require("pdfkit");

    const doc = new PDFDocument({
        size            : (page.size || "LETTER"),
        layout          : (page.layout || "portrait"),
        margin          : ($Utils.isset(page.margin) ? page.margin : 36),
        bufferPages     : true,
        info            : info,
    });

    const chunks = [];
    let error = null;
    let asyncDone = false;

    doc.on("data", chunk => chunks.push(chunk));

    doc.on("end", function()
    {
        asyncDone = true;
    });

    doc.on("error", function(err)
    {
        error = err;
        asyncDone = true;
    });

    try
    {
        render(doc);
        doc.end();
    }
    catch (e)
    {
        $Logger.logString($Const.LL_ERROR, `Failed to render pdf: ${e.message}\n${e.stack}`);
        return null;
    }

    require('deasync').loopWhile(function(){return !asyncDone;});

    if (error)
    {
        $Logger.logString($Const.LL_ERROR, `Failed to write pdf: ${error.message}`);
        return null;
    }

    return Buffer.concat(chunks);
}

module.exports =
{
    generate(spec)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const isPdf = (spec.format == $Const.EXPORT_FORMAT_PDF);
        const format = (isPdf || TABULAR_FORMATS.includes(spec.format) ? spec.format : $Const.EXPORT_FORMAT_CSV);
        const creator = spec.creator || "SurgiStream";

        let fileData;
        let numOfRows = 0;

        if (isPdf)
        {
            if (typeof spec.render !== "function")
            {
                return $ERRS.ERR_EXPORT_NO_RENDERER;
            }

            fileData = _buildPdf(spec.render, spec.page || {}, {Title: spec.title || spec.name, Author: creator});
        }
        else
        {
            const maxRows = spec.maxRows || $Config.get("EXPORT_MAX_ROWS");
            const sheets = (Array.isArray(spec.sheets) ? spec.sheets : [{title: spec.title, columns: spec.columns, rows: spec.rows}]);

            for (const sheet of sheets)
            {
                if ($Utils.empty(sheet.columns) || !Array.isArray(sheet.columns))
                {
                    return $ERRS.ERR_EXPORT_INVALID_COLUMNS;
                }

                sheet.rows = (Array.isArray(sheet.rows) ? sheet.rows : []);
                numOfRows += sheet.rows.length;
            }

            if (numOfRows == 0)
            {
                return $ERRS.ERR_EXPORT_NO_DATA;
            }

            if (numOfRows > maxRows)
            {
                return $Err.errWithInfo("ERR_EXPORT_TOO_MANY_ROWS", `${numOfRows} rows, max is ${maxRows}`);
            }

            // csv is a single table - only the first sheet is exported
            fileData = (format == $Const.EXPORT_FORMAT_XLSX ? _buildXlsx(sheets, creator) : _buildCsv(sheets[0]));
        }

        if (fileData === null)
        {
            return $ERRS.ERR_EXPORT_FAILED;
        }

        const fileName = `${spec.name || "export"}_${$Utils.simpleUniqueHash()}.${format}`;
        const accessLevel = spec.accessLevel || $Const.FILE_ACCESS_LEVEL_LIMITED;

        const rv = $Files.saveFileFromString(spec.owner || null, fileData, fileName, CONTENT_TYPES[format], accessLevel);
        if ($Err.isERR(rv))
        {
            return rv;
        }

        vals.file_id = rv.file_id;
        vals.file_name = fileName;
        vals.file_url = $Files.getUrl(rv.file_name);

        // num_of_rows is meaningless for a rendered pdf - it is only returned for tabular formats
        if (!isPdf)
        {
            vals.num_of_rows = numOfRows;
        }

        return {...rc, ...vals};
    },

    run(name, params = {}, format = null, session = null)
    {
        const definition = this.getDefinition(name);
        if (definition === null)
        {
            return $Err.errWithInfo("ERR_EXPORT_INVALID_DEFINITION", name);
        }

        session = session || $HttpContext.get("session");
        format = format || definition.default_format;

        if (!$Utils.empty(definition.formats) && !definition.formats.includes(format))
        {
            return $Err.errWithInfo("ERR_EXPORT_UNSUPPORTED_FORMAT", `${name}: ${format}`);
        }

        const rv = definition.build(params, session);
        if ($Err.isERR(rv))
        {
            return rv;
        }

        const spec =
        {
            name        : definition.file_name || name,
            format      : format,
            title       : definition.title || name,
            owner       : session.userId,
            accessLevel : definition.access_level,
            maxRows     : definition.max_rows,
        };

        if (format == $Const.EXPORT_FORMAT_PDF)
        {
            if (typeof definition.render !== "function")
            {
                return $Err.errWithInfo("ERR_EXPORT_NO_RENDERER", name);
            }

            // The builder may override the page setup according to the data (e.g. landscape for a month view)
            spec.page = (rv.page ? rv.page : (definition.page || {}));
            spec.title = (rv.title ? rv.title : spec.title);
            spec.render = doc => definition.render(doc, rv, params);

            return this.generate(spec);
        }

        spec.sheets = (rv.sheets ? rv.sheets : [{title: spec.title, columns: definition.columns, rows: rv.rows}]);

        return this.generate(spec);
    },

    getDefinition(name)
    {
        if (definitions === null)
        {
            definitions = require($Const.DEFS_PATH + "/exports.js");
        }

        if (!$Utils.isset(definitions[name]) || $Utils.empty(definitions[name].build))
        {
            return null;
        }

        return definitions[name];
    },
}
