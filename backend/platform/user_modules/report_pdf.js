// Incident report PDF renderer ($ReportPdf).
// Draws the client-facing report into a pdfkit document according to the template style settings.
// Data is prepared by funcs/report.js (deliver_report) - this module only draws.

const TABLE_REPORT_HEADER_LAYOUT = "report_header_layout";
const TABLE_REPORT_FONT = "report_font";
const TABLE_REPORT_DATE_FORMAT = "report_date_format";
const TABLE_REPORT_SECTION_BREAKS = "report_section_breaks";
const TABLE_REPORT_FIELD_TYPE = "report_field_type";

const DEFAULT_ACCENT_COLOR = "#003366";
const DEFAULT_FONT = "Helvetica";
const DEFAULT_FONT_BOLD = "Helvetica-Bold";
const DEFAULT_DATE_PATTERN = "Y-m-d";
const PAGE_SETUP = {size: "LETTER", layout: "portrait", margin: 54};
const FOOTER_OFFSET = 36;
const RUNNING_HEADER_OFFSET = 24;
const WATERMARK_FONT_SIZE = 40;
const WATERMARK_COLOR = "#888888";
const WATERMARK_DEFAULT_OPACITY = 0.15;
const IMAGE_SIZE = 140;
const IMAGE_GAP = 10;
const TEXT_COLOR = "#000000";
const MUTED_COLOR = "#555555";

function getFonts(style)
{
	return {
		regular: $DataItems.getItemAttr(style.font, TABLE_REPORT_FONT, "pdf_font") || DEFAULT_FONT,
		bold: $DataItems.getItemAttr(style.font, TABLE_REPORT_FONT, "pdf_font_bold") || DEFAULT_FONT_BOLD
	};
}

function getAccentColor(style)
{
	return /^#[0-9A-Fa-f]{6}$/.test(style.accent_color || "") ? style.accent_color : DEFAULT_ACCENT_COLOR;
}

function contentBox(doc)
{
	let left = doc.page.margins.left;
	let width = doc.page.width - left - doc.page.margins.right;
	return {left: left, width: width, bottom: doc.page.height - doc.page.margins.bottom};
}

function ensureSpace(doc, height)
{
	if (doc.y + height > contentBox(doc).bottom)
	{
		doc.addPage();
	}
}

function drawLogo(doc, logo, x, y, maxWidth, maxHeight)
{
	if (!logo)
	{
		return false;
	}
	try
	{
		doc.image(logo, x, y, {fit: [maxWidth, maxHeight]});
		return true;
	}
	catch (e)
	{
		return false;
	}
}

function getMetaLines(data, style, self)
{
	return [
		"Report ID: " + data.report_id,
		"Site: " + (data.community_name || ""),
		"Officer: " + (data.officer_name || ""),
		"Date: " + self.formatDate(data.created_on, style),
		"Category: " + (data.category_name || "")
	];
}

function drawHeader(doc, data, style, fonts, accent, self)
{
	let box = contentBox(doc);
	let top = doc.y;
	let meta = getMetaLines(data, style, self);

	if (style.header_layout === $Const.REPORT_HEADER_LAYOUT_COMPACT)
	{
		let hasLogo = drawLogo(doc, data.logo, box.left, top, 80, 30);
		let titleX = hasLogo ? box.left + 90 : box.left;
		doc.font(fonts.bold).fontSize(16).fillColor(TEXT_COLOR)
			.text(data.title, titleX, top + 6, {width: box.width - (titleX - box.left)});
		doc.font(fonts.regular).fontSize(9).fillColor(MUTED_COLOR)
			.text(meta.join("   |   "), box.left, Math.max(doc.y, top + 36) + 4, {width: box.width});
	}
	else if (style.header_layout === $Const.REPORT_HEADER_LAYOUT_FULL_WIDTH_BANNER)
	{
		let bannerHeight = 70;
		doc.save().rect(box.left, top, box.width, bannerHeight).fill(accent).restore();
		let hasLogo = drawLogo(doc, data.logo, box.left + 10, top + 10, 100, bannerHeight - 20);
		let titleX = hasLogo ? box.left + 120 : box.left + 12;
		doc.font(fonts.bold).fontSize(18).fillColor("#FFFFFF")
			.text(data.title, titleX, top + 22, {width: box.width - (titleX - box.left) - 12, height: bannerHeight - 24, ellipsis: true});
		doc.font(fonts.regular).fontSize(9).fillColor(MUTED_COLOR)
			.text(meta.join("   |   "), box.left, top + bannerHeight + 8, {width: box.width});
	}
	else
	{
		// Standard: logo left, title and metadata right
		let hasLogo = drawLogo(doc, data.logo, box.left, top, 120, 60);
		let textX = hasLogo ? box.left + 135 : box.left;
		let textWidth = box.width - (textX - box.left);
		doc.font(fonts.bold).fontSize(18).fillColor(TEXT_COLOR).text(data.title, textX, top, {width: textWidth});
		doc.font(fonts.regular).fontSize(9).fillColor(MUTED_COLOR);
		meta.forEach(line => doc.text(line, textX, doc.y + 1, {width: textWidth}));
		doc.y = Math.max(doc.y, hasLogo ? top + 60 : top);
	}

	doc.y += 8;
	doc.save().moveTo(box.left, doc.y).lineTo(box.left + box.width, doc.y).lineWidth(2).strokeColor(accent).stroke().restore();
	doc.y += 14;
	doc.x = box.left;
}

function drawCoverPage(doc, data, style, fonts, self)
{
	let box = contentBox(doc);
	let y = doc.page.margins.top + 80;
	if (drawLogo(doc, data.logo, box.left + (box.width - 200) / 2, y, 200, 100))
	{
		y += 130;
	}
	doc.font(fonts.bold).fontSize(26).fillColor(TEXT_COLOR).text(data.title, box.left, y, {width: box.width, align: "center"});
	doc.moveDown(2);
	doc.font(fonts.regular).fontSize(13).fillColor(MUTED_COLOR);
	doc.text(data.community_name || "", box.left, doc.y, {width: box.width, align: "center"});
	doc.moveDown(0.5);
	doc.text("Officer: " + (data.officer_name || ""), box.left, doc.y, {width: box.width, align: "center"});
	doc.moveDown(0.5);
	doc.text(self.formatDate(data.created_on, style), box.left, doc.y, {width: box.width, align: "center"});
}

function drawSectionHeading(doc, title, fonts, accent)
{
	let box = contentBox(doc);
	ensureSpace(doc, 60);
	let top = doc.y;
	doc.save().rect(box.left, top, box.width, 20).fill(accent).restore();
	doc.font(fonts.bold).fontSize(11).fillColor("#FFFFFF").text(title, box.left + 8, top + 5, {width: box.width - 16, height: 14, ellipsis: true});
	doc.y = top + 28;
	doc.x = box.left;
}

function drawImages(doc, images)
{
	let box = contentBox(doc);
	let x = box.left;
	ensureSpace(doc, IMAGE_SIZE);
	let rowTop = doc.y;
	for (let i = 0; i < images.length; i++)
	{
		if (x + IMAGE_SIZE > box.left + box.width)
		{
			x = box.left;
			rowTop += IMAGE_SIZE + IMAGE_GAP;
		}
		if (rowTop + IMAGE_SIZE > contentBox(doc).bottom)
		{
			doc.addPage();
			rowTop = doc.y;
			x = box.left;
		}
		try
		{
			doc.image(images[i], x, rowTop, {fit: [IMAGE_SIZE, IMAGE_SIZE]});
		}
		catch (e)
		{
			// skip unreadable/corrupt image
		}
		x += IMAGE_SIZE + IMAGE_GAP;
	}
	doc.y = rowTop + IMAGE_SIZE + IMAGE_GAP;
	doc.x = box.left;
}

function drawField(doc, field, style, fonts, self)
{
	let box = contentBox(doc);
	let text = field.is_file ? field.files.join(", ") : self.formatFieldValue(field, style);
	let hasContent = !$Utils.empty(text) || field.images.length > 0;

	doc.font(fonts.bold).fontSize(9);
	ensureSpace(doc, doc.heightOfString(field.label, {width: box.width}) + 14);
	doc.fillColor(MUTED_COLOR).text(field.label, box.left, doc.y, {width: box.width});

	doc.font(fonts.regular).fontSize(10).fillColor(TEXT_COLOR);
	if (!hasContent)
	{
		doc.text("-", box.left, doc.y + 1, {width: box.width});
	}
	if (!$Utils.empty(text))
	{
		doc.text(text, box.left, doc.y + 1, {width: box.width});
	}
	if (field.images.length > 0)
	{
		doc.y += 4;
		drawImages(doc, field.images);
	}
	doc.y += 8;
	doc.x = box.left;
}

function drawWatermark(doc, fonts)
{
	let text = $Config.get("REPORT_PDF_WATERMARK_TEXT");
	if ($Utils.empty(text))
	{
		return;
	}
	let cx = doc.page.width / 2;
	let cy = doc.page.height / 2;
	let width = Math.sqrt(doc.page.width * doc.page.width + doc.page.height * doc.page.height) * 0.85;
	doc.save();
	doc.rotate(-Math.atan2(doc.page.height, doc.page.width) * 180 / Math.PI, {origin: [cx, cy]});
	doc.fillOpacity($Config.get("REPORT_PDF_WATERMARK_OPACITY") || WATERMARK_DEFAULT_OPACITY);
	doc.font(fonts.bold).fontSize(WATERMARK_FONT_SIZE).fillColor(WATERMARK_COLOR)
		.text(String(text), cx - width / 2, cy - WATERMARK_FONT_SIZE / 2, {width: width, align: "center", lineBreak: false});
	doc.restore();
}

// Watermark, running audit header and footer on every page (drawn after the content, pages are buffered)
function drawPageDecorations(doc, data, style, fonts, self)
{
	let range = doc.bufferedPageRange();
	let headerText = [data.community_name, data.title, "Report ID: " + data.report_id].filter(t => !$Utils.empty(t)).join("   |   ");
	let deliveredText = "Delivered: " + self.formatDateTime(data.delivered_on, style);
	let generatedBy = $Config.get("REPORT_PDF_GENERATED_BY_TEXT") || "";

	for (let i = range.start; i < range.start + range.count; i++)
	{
		doc.switchToPage(i);
		let box = contentBox(doc);
		// Writing outside the margins would make pdfkit add a page - lift the margins while decorating
		let margins = {...doc.page.margins};
		doc.page.margins.top = 0;
		doc.page.margins.bottom = 0;

		drawWatermark(doc, fonts);

		doc.font(fonts.regular).fontSize(8).fillColor(MUTED_COLOR);
		doc.text(headerText, box.left, RUNNING_HEADER_OFFSET, {width: box.width, align: "center", lineBreak: false, height: 10, ellipsis: true});

		let y = doc.page.height - FOOTER_OFFSET;
		if (!$Utils.empty(style.confidentiality_footer))
		{
			doc.text(String(style.confidentiality_footer), box.left, y, {width: box.width, align: "center", lineBreak: false});
		}
		doc.text(deliveredText, box.left, y + 11, {width: box.width, align: "left", lineBreak: false});
		doc.text(generatedBy, box.left, y + 11, {width: box.width, align: "center", lineBreak: false});
		if (style.page_numbering !== false)
		{
			doc.text("Page " + (i - range.start + 1) + " of " + range.count, box.left, y + 11, {width: box.width, align: "right", lineBreak: false});
		}

		doc.page.margins.top = margins.top;
		doc.page.margins.bottom = margins.bottom;
	}
}

module.exports =
{
	__initialize()
	{
		$DataItems.define(TABLE_REPORT_HEADER_LAYOUT);
		$DataItems.define(TABLE_REPORT_FONT);
		$DataItems.define(TABLE_REPORT_DATE_FORMAT);
		$DataItems.define(TABLE_REPORT_SECTION_BREAKS);
		$DataItems.define(TABLE_REPORT_FIELD_TYPE);
	},

	/**
	 * Default report style - used when a template has no style settings (mirrors Report Template defaults).
	 */
	getDefaultStyle()
	{
		return {
			company_logo: null,
			accent_color: null,
			header_layout: $Const.REPORT_HEADER_LAYOUT_STANDARD,
			font: $Const.REPORT_FONT_ARIAL,
			page_numbering: true,
			confidentiality_footer: null,
			date_format: $Const.REPORT_DATE_FORMAT_MM_DD_YYYY,
			section_breaks: $Const.REPORT_SECTION_BREAKS_CONTINUOUS,
			include_cover_page: false
		};
	},

	getPageSetup()
	{
		return {...PAGE_SETUP};
	},

	/**
	 * Formats a date using the template date format setting.
	 */
	formatDate(value, style)
	{
		if ($Utils.empty(value))
		{
			return "";
		}
		let pattern = $DataItems.getItemAttr((style || {}).date_format, TABLE_REPORT_DATE_FORMAT, "pattern") || DEFAULT_DATE_PATTERN;
		let date = new $Date(value);
		return date.isValid() ? date.format(pattern) : String(value);
	},

	/**
	 * Formats a date and time (H:i) using the template date format setting.
	 */
	formatDateTime(value, style)
	{
		if ($Utils.empty(value))
		{
			return "";
		}
		let date = new $Date(value);
		return date.isValid() ? this.formatDate(value, style) + " " + date.format("H:i") : String(value);
	},

	/**
	 * Formats a non-file field value as display text.
	 */
	formatFieldValue(field, style)
	{
		let value = field.value;
		if (value === null || value === undefined || value === "")
		{
			return "";
		}
		switch (field.field_type)
		{
			case $Const.REPORT_FIELD_TYPE_DATE:
				return this.formatDate(value, style);

			case $Const.REPORT_FIELD_TYPE_LOCATION:
			{
				let parts = [];
				if (!$Utils.empty(value.address))
				{
					parts.push(value.address);
				}
				if (value.latitude !== null && value.latitude !== undefined && value.longitude !== null && value.longitude !== undefined)
				{
					parts.push("(" + value.latitude + ", " + value.longitude + ")");
				}
				return parts.join(" ");
			}

			default:
				return Array.isArray(value) ? value.join(", ") : String(value);
		}
	},

	/**
	 * Draws the client-facing report.
	 * data: {report_id, title, community_name, officer_name, category_name, created_on, delivered_on,
	 *        management_summary, style, logo (Buffer|null), sections: [{title, fields: [{label, field_type, value, is_file, images, files}]}]}
	 */
	render(doc, data)
	{
		let style = {...this.getDefaultStyle(), ...(data.style || {})};
		let fonts = getFonts(style);
		let accent = getAccentColor(style);

		if (style.include_cover_page === true)
		{
			drawCoverPage(doc, data, style, fonts, this);
			doc.addPage();
		}

		drawHeader(doc, data, style, fonts, accent, this);

		if (!$Utils.empty(data.management_summary))
		{
			let box = contentBox(doc);
			drawSectionHeading(doc, "Management Summary", fonts, accent);
			doc.font(fonts.regular).fontSize(10).fillColor(TEXT_COLOR).text(data.management_summary, box.left, doc.y, {width: box.width});
			doc.y += 12;
		}

		for (let i = 0; i < data.sections.length; i++)
		{
			let section = data.sections[i];
			if (i > 0)
			{
				if (style.section_breaks === $Const.REPORT_SECTION_BREAKS_NEW_PAGE)
				{
					doc.addPage();
				}
				else
				{
					let box = contentBox(doc);
					ensureSpace(doc, 20);
					doc.save().moveTo(box.left, doc.y).lineTo(box.left + box.width, doc.y).lineWidth(0.5).strokeColor("#CCCCCC").stroke().restore();
					doc.y += 10;
				}
			}
			drawSectionHeading(doc, section.title, fonts, accent);
			section.fields.forEach(field => drawField(doc, field, style, fonts, this));
		}

		drawPageDecorations(doc, data, style, fonts, this);
	},
};
