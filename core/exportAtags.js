/*
========================================
exportAtags v1.35 (sys 2.00)
========================================

Änderungen
- HTML-Tabellen nutzen Sans-Serif-Schrift
- shortenTableHeaders standardmäßig auf 0 gesetzt
- 0 kürzt Tabellen-Header jetzt auf 10 Zeichen + "."
- nutzt ausgelagerte Helper aus Atag Helpers
- Export für:
  - tags
  - text
  - md
  - rows_md
  - rows_html
  - json
- Tag-Hybrid-System enthalten
- md mit "  \n"
- tags ohne value bleiben in md sichtbar
- tags ohne row bleiben in md normal sichtbar
- Row-Werte im normalen md:
  - avg / sum + [einzelwerte]
  - bei nur 1 Wert ohne []
  - bei rowAggregateMode null nur Werte / Listen
- rows_md / rows_html mit optionaler Header-Kürzung
- shortenTableHeaders:
- -1 = aus
- 0 = 10 Zeichen + "."
- n = n Zeichen + "."

Voraussetzung
- Atag Helpers geladen
- collectAtags() vorhanden

Beispiele

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atags",
  targetFieldType: "tags"
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Debug",
  targetFieldType: "text"
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atag MD",
  targetFieldType: "md"
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atag JSON",
  targetFieldType: "json"
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Rows MD",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowIncludeUnits: true,
  rowAggregateDecimals: 1,
  shortenTableHeaders: 0
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Rows Html",
  targetFieldType: "rows_html",
  rowAggregateMode: "sum",
  rowIncludeUnits: false,
  rowAggregateDecimals: 1,
  shortenTableHeaders: 7
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atags",
  targetFieldType: "tags",
  preserveForeignTagsField: "Tags Extern",
  parserOwnedTagsField: "Tags Parser"
});

var result = collectAtags({
  entryObj: entry(),
  textFields: ["Alias", "Notiz"]
});

exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag MD",
  targetFieldType: "md"
});
*/

// ===== TEXT =====
function buildAtagTextLines(items) {
  var lines = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.attrText != null && it.attrText !== "") lines.push(it.name + ": " + it.attrText);
    else lines.push(it.name);
  }
  return lines;
}

// ===== ROW DATA =====
function collectAtagRowTableData(items) {
  var rows = [];
  var rowIndexMap = {};
  var tagOrder = [];
  var tagSeen = {};

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var num = toNumberIfPossible(it.attrValue);

    if (it.rowValue == null || num == null) continue;

    var rowKey = String(it.rowValue) + "|" + String(it.rowUnit || "") + "|" + String(it.rowRaw || "");

    if (rowIndexMap[rowKey] == null) {
      rowIndexMap[rowKey] = rows.length;
      rows.push({
        rowValue: it.rowValue,
        rowUnit: it.rowUnit || null,
        rowRaw: it.rowRaw || null,
        values: {}
      });
    }

    if (!tagSeen[it.name]) {
      tagSeen[it.name] = true;
      tagOrder.push(it.name);
    }

    rows[rowIndexMap[rowKey]].values[it.name] = num;
  }

  return {
    rows: rows,
    tagOrder: tagOrder
  };
}

function buildAtagRowHeaderLabel(row, includeUnits) {
  if (row == null) return "";

  if (!includeUnits) {
    if (row.rowValue == null) return "";
    return String(row.rowValue).replace(".", ",");
  }

  if (row.rowRaw != null && row.rowRaw !== "") return String(row.rowRaw);
  if (row.rowValue == null) return "";

  var base = String(row.rowValue).replace(".", ",");
  if (row.rowUnit) return base + String(row.rowUnit);

  return base;
}

// ===== NORMAL MD =====
function buildAtagNormalMarkdown(items, cfg) {
  var sortedItems = getSortedMarkdownItems(items);
  var normalLines = [];
  var rowMap = {};
  var rowOrder = [];
  var aggMode = cfg && cfg.rowAggregateMode !== undefined ? cfg.rowAggregateMode : "avg";
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;

  for (var i = 0; i < sortedItems.length; i++) {
    var it = sortedItems[i];

    if (it.rowValue == null) {
      normalLines.push(formatMarkdownValue(it.name, it.attrText, it.rawText));
      continue;
    }

    var num = toNumberIfPossible(it.attrValue);
    if (num == null) {
      normalLines.push(formatMarkdownValue(it.name, it.attrText, it.rawText));
      continue;
    }

    if (!rowMap[it.name]) {
      rowMap[it.name] = [];
      rowOrder.push(it.name);
    }

    rowMap[it.name].push(num);
  }

  for (var j = 0; j < rowOrder.length; j++) {
    var name = rowOrder[j];
    var vals = rowMap[name];
    var listParts = [];

    for (var k = 0; k < vals.length; k++) {
      listParts.push(formatNumberLocale(vals[k], decimals));
    }

    if (aggMode === "avg" || aggMode === "sum") {
      var agg = computeAggregate(vals, aggMode);
      var line = name + ": " + formatNumberLocale(agg, decimals);

      if (listParts.length > 1) {
        line += "  [" + listParts.join(", ") + "]";
      }

      normalLines.push(line);
    } else {
      if (listParts.length === 1) {
        normalLines.push(name + ": " + listParts[0]);
      } else if (listParts.length > 1) {
        normalLines.push(name + "  [" + listParts.join(", ") + "]");
      }
    }
  }

  return normalLines.join("  \n");
}

// ===== ROWS MD =====
function buildAtagRowsMarkdown(items, cfg) {
  var data = collectAtagRowTableData(items);
  var rows = data.rows;
  var tagOrder = data.tagOrder;
  var mode = cfg && cfg.rowAggregateMode != null ? cfg.rowAggregateMode : "avg";
  var includeUnits = !(cfg && cfg.rowIncludeUnits === false);
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;
  var shortenHeaders = cfg && cfg.shortenTableHeaders != null ? cfg.shortenTableHeaders : 0;

  if (!rows.length || !tagOrder.length) return "";

  var lines = [];
  var header = ["rval"];
  var aligns = [":---"];

  for (var t = 0; t < tagOrder.length; t++) {
    header.push(shortenTableWord(tagOrder[t], shortenHeaders));
    aligns.push("---:");
  }

  lines.push("| " + header.join(" | ") + " |");
  lines.push("| " + aligns.join(" | ") + " |");

  for (var ri = 0; ri < rows.length; ri++) {
    var r = rows[ri];
    var cells = [buildAtagRowHeaderLabel(r, includeUnits)];

    for (var tj = 0; tj < tagOrder.length; tj++) {
      var v = r.values[tagOrder[tj]];
      cells.push(v == null ? "" : formatNumberLocale(v, decimals));
    }

    lines.push("| " + cells.join(" | ") + " |");
  }

  if (mode === "avg" || mode === "sum") {
    var aggCells = [mode];

    for (var tk = 0; tk < tagOrder.length; tk++) {
      var vals = [];

      for (var rk = 0; rk < rows.length; rk++) {
        var vv = rows[rk].values[tagOrder[tk]];
        if (vv != null) vals.push(vv);
      }

      var agg = computeAggregate(vals, mode);
      aggCells.push(agg == null ? "" : formatNumberLocale(agg, decimals));
    }

    lines.push("| " + aggCells.join(" | ") + " |");
  }

  return lines.join("  \n");
}

// ===== ROWS HTML =====
function buildAtagRowsHtml(items, cfg) {
  var data = collectAtagRowTableData(items);
  var rows = data.rows;
  var tagOrder = data.tagOrder;
  var mode = cfg && cfg.rowAggregateMode != null ? cfg.rowAggregateMode : "avg";
  var includeUnits = !(cfg && cfg.rowIncludeUnits === false);
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;
  var shortenHeaders = cfg && cfg.shortenTableHeaders != null ? cfg.shortenTableHeaders : 0;

  if (!rows.length || !tagOrder.length) return "";

  var html = [];
  html.push('<table style="font-family:sans-serif;">');
  html.push("<thead>");
  html.push("<tr>");
  html.push('<th style="text-align:left;">rval</th>');

  for (var t = 0; t < tagOrder.length; t++) {
    html.push(
      '<th style="text-align:right;">' +
      escapeHtml(shortenTableWord(tagOrder[t], shortenHeaders)) +
      "</th>"
    );
  }

  html.push("</tr>");
  html.push("</thead>");
  html.push("<tbody>");

  for (var ri = 0; ri < rows.length; ri++) {
    var r = rows[ri];
    html.push("<tr>");
    html.push('<td style="text-align:left;">' + escapeHtml(buildAtagRowHeaderLabel(r, includeUnits)) + "</td>");

    for (var tj = 0; tj < tagOrder.length; tj++) {
      var v = r.values[tagOrder[tj]];
      html.push(
        '<td style="text-align:right;">' +
        escapeHtml(v == null ? "" : formatNumberLocale(v, decimals)) +
        "</td>"
      );
    }

    html.push("</tr>");
  }

  if (mode === "avg" || mode === "sum") {
    html.push("<tr>");
    html.push('<td style="text-align:left;">' + escapeHtml(mode) + "</td>");

    for (var tk = 0; tk < tagOrder.length; tk++) {
      var vals = [];

      for (var rk = 0; rk < rows.length; rk++) {
        var vv = rows[rk].values[tagOrder[tk]];
        if (vv != null) vals.push(vv);
      }

      var agg = computeAggregate(vals, mode);
      html.push(
        '<td style="text-align:right;">' +
        escapeHtml(agg == null ? "" : formatNumberLocale(agg, decimals)) +
        "</td>"
      );
    }

    html.push("</tr>");
  }

  html.push("</tbody>");
  html.push("</table>");

  return html.join("");
}

// ===== EXPORT =====
function exportAtags(cfg) {
  var entryObj = cfg.entryObj || entry();
  if (!entryObj) return;

  var result = cfg.result || {};
  var items = result.items || [];
  var targetField = cfg.targetField;
  var targetFieldType = cfg.targetFieldType;

  if (targetFieldType === "tags") {
    var parsedTags = uniqueTagNames(items, true);
    var metaTags = collectMetaTags(items);
    parsedTags = mergeTagLists(parsedTags, metaTags);

    var existingTags = entryObj.field(targetField);
    var doMerge = !(cfg && cfg.mergeWithExistingTags === false);

    if (cfg && cfg.preserveForeignTagsField && cfg.parserOwnedTagsField) {
      var foreignField = cfg.preserveForeignTagsField;
      var parserField = cfg.parserOwnedTagsField;

      var lastParserTags = entryObj.field(parserField);
      var currentForeignTags = subtractTagLists(existingTags, lastParserTags);

      entryObj.set(foreignField, currentForeignTags);
      entryObj.set(parserField, parsedTags);
      entryObj.set(targetField, mergeTagLists(currentForeignTags, parsedTags));
      return;
    }

    if (doMerge) entryObj.set(targetField, mergeTagLists(existingTags, parsedTags));
    else entryObj.set(targetField, parsedTags);

    return;
  }

  if (targetFieldType === "text") {
    entryObj.set(targetField, buildAtagTextLines(items).join("\n"));
    return;
  }

  if (targetFieldType === "md") {
    entryObj.set(targetField, buildAtagNormalMarkdown(items, cfg));
    return;
  }

  if (targetFieldType === "rows_md") {
    entryObj.set(targetField, buildAtagRowsMarkdown(items, cfg));
    return;
  }

  if (targetFieldType === "rows_html") {
    entryObj.set(targetField, buildAtagRowsHtml(items, cfg));
    return;
  }

  if (targetFieldType === "json") {
    entryObj.set(targetField, JSON.stringify(buildValueMap(items)));
    return;
  }
}
