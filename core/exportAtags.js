/*
========================================
exportAtags v1.41 (sys 2.11)
========================================

Änderungen
- Kopfkommentar gekürzt, damit der Memento-Java-Editor nicht im Export-Script abstürzt
- Exporttypen: tags, text, md, rows_md, rows_html, json
- Tabellen nutzen Alias-Kürzel als Header, optional Langform oder beide Namen
- Row-Tabellen unterstützen avg, sum, Header-Kürzung und HTML/Markdown-Ausgabe

Voraussetzung
- Atag Helpers geladen
- collectAtags() vorhanden

Beispiele

applyTags({
  enabled: true,
  textFields: ["Alias", "Notiz"],
  targetField: "Atags",
  targetFieldType: "tags"
});

applyTags({
  enabled: true,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag MD",
  targetFieldType: "md"
});

applyTags({
  enabled: true,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Rows MD",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowIncludeUnits: true,
  rowAggregateDecimals: 1,
  shortenTableHeaders: 0
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
  var tagHasDecimal = {};
  var tagAgg = {};
  var tagDisplay = {};

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
      tagDisplay[it.name] = it.displayName || it.name;
    }

    if (itemHasDecimalValue(it)) {
      tagHasDecimal[it.name] = true;
    }

    if (!tagAgg[it.name]) {
      tagAgg[it.name] = {
        sum: 0,
        count: 0
      };
    }

    tagAgg[it.name].sum += num;
    tagAgg[it.name].count += 1;
    rows[rowIndexMap[rowKey]].values[it.name] = num;
  }

  return {
    rows: rows,
    tagOrder: tagOrder,
    tagDisplay: tagDisplay,
    tagHasDecimal: tagHasDecimal,
    tagAgg: tagAgg
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
  var rowHasDecimal = {};
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

    if (itemHasDecimalValue(it)) {
      rowHasDecimal[it.name] = true;
    }

    rowMap[it.name].push(num);
  }

  for (var j = 0; j < rowOrder.length; j++) {
    var name = rowOrder[j];
    var vals = rowMap[name];
    var listParts = [];

    for (var k = 0; k < vals.length; k++) {
      listParts.push(formatTagNumberLocale(vals[k], decimals, !!rowHasDecimal[name]));
    }

    if (aggMode === "avg" || aggMode === "sum") {
      var agg = computeAggregate(vals, aggMode);
      var line = name + ": " + formatTagNumberLocale(agg, decimals, !!rowHasDecimal[name]);

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
  var tagDisplay = data.tagDisplay || {};
  var tagHasDecimal = data.tagHasDecimal || {};
  var tagAgg = data.tagAgg || {};
  var mode = cfg && cfg.rowAggregateMode != null ? cfg.rowAggregateMode : "avg";
  var includeUnits = !(cfg && cfg.rowIncludeUnits === false);
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;
  var shortenHeaders = cfg && cfg.shortenTableHeaders != null ? cfg.shortenTableHeaders : 0;

  if (!rows.length || !tagOrder.length) return "";

  var lines = [];
  var header = ["rval"];
  var aligns = [":---"];

  for (var t = 0; t < tagOrder.length; t++) {
    header.push(shortenTableWord(buildAtagTagHeaderLabel(tagOrder[t], tagDisplay[tagOrder[t]], cfg), shortenHeaders));
    aligns.push("---:");
  }

  lines.push("| " + header.join(" | ") + " |");
  lines.push("| " + aligns.join(" | ") + " |");

  for (var ri = 0; ri < rows.length; ri++) {
    var r = rows[ri];
    var cells = [buildAtagRowHeaderLabel(r, includeUnits)];

    for (var tj = 0; tj < tagOrder.length; tj++) {
      var v = r.values[tagOrder[tj]];
      cells.push(v == null ? "" : formatTagNumberLocale(v, decimals, !!tagHasDecimal[tagOrder[tj]]));
    }

    lines.push("| " + cells.join(" | ") + " |");
  }

  if (mode === "avg" || mode === "sum") {
    var aggCells = [mode];

    for (var tk = 0; tk < tagOrder.length; tk++) {
      var aggInfo = tagAgg[tagOrder[tk]];
      var agg = null;
      if (aggInfo && aggInfo.count) {
        agg = mode === "sum" ? aggInfo.sum : (aggInfo.sum / aggInfo.count);
      }
      aggCells.push(agg == null ? "" : formatTagNumberLocale(agg, decimals, !!tagHasDecimal[tagOrder[tk]]));
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
  var tagDisplay = data.tagDisplay || {};
  var tagHasDecimal = data.tagHasDecimal || {};
  var tagAgg = data.tagAgg || {};
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
      escapeHtml(shortenTableWord(buildAtagTagHeaderLabel(tagOrder[t], tagDisplay[tagOrder[t]], cfg), shortenHeaders)) +
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
        escapeHtml(v == null ? "" : formatTagNumberLocale(v, decimals, !!tagHasDecimal[tagOrder[tj]])) +
        "</td>"
      );
    }

    html.push("</tr>");
  }

  if (mode === "avg" || mode === "sum") {
    html.push("<tr>");
    html.push('<td style="text-align:left;">' + escapeHtml(mode) + "</td>");

    for (var tk = 0; tk < tagOrder.length; tk++) {
      var aggInfo = tagAgg[tagOrder[tk]];
      var agg = null;
      if (aggInfo && aggInfo.count) {
        agg = mode === "sum" ? aggInfo.sum : (aggInfo.sum / aggInfo.count);
      }
      html.push(
        '<td style="text-align:right;">' +
        escapeHtml(agg == null ? "" : formatTagNumberLocale(agg, decimals, !!tagHasDecimal[tagOrder[tk]])) +
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
  var sortedItems = sortItemsByTagName(items);
  var targetField = cfg.targetField;
  var targetFieldType = cfg.targetFieldType;

  if (targetFieldType === "tags") {
    var parsedTags = uniqueTagNames(sortedItems, true);
    var metaTags = collectMetaTags(sortedItems);
    parsedTags = sortTagNames(mergeTagLists(parsedTags, metaTags));

    var existingTags = entryObj.field(targetField);
    var doMerge = !(cfg && cfg.mergeWithExistingTags === false);

    if (cfg && cfg.preserveForeignTagsField && cfg.parserOwnedTagsField) {
      var foreignField = cfg.preserveForeignTagsField;
      var parserField = cfg.parserOwnedTagsField;

      var lastParserTags = entryObj.field(parserField);
      var currentForeignTags = sortTagNames(subtractTagLists(existingTags, lastParserTags));

      entryObj.set(foreignField, currentForeignTags);
      entryObj.set(parserField, parsedTags);
      entryObj.set(targetField, sortTagNames(mergeTagLists(currentForeignTags, parsedTags)));
      return;
    }

    if (doMerge) entryObj.set(targetField, sortTagNames(mergeTagLists(existingTags, parsedTags)));
    else entryObj.set(targetField, parsedTags);

    return;
  }

  if (targetFieldType === "text") {
    entryObj.set(targetField, buildAtagTextLines(sortedItems).join("\n"));
    return;
  }

  if (targetFieldType === "md") {
    entryObj.set(targetField, buildAtagNormalMarkdown(items, cfg));
    return;
  }

  if (targetFieldType === "rows_md") {
    entryObj.set(targetField, buildAtagRowsMarkdown(sortedItems, cfg));
    return;
  }

  if (targetFieldType === "rows_html") {
    entryObj.set(targetField, buildAtagRowsHtml(sortedItems, cfg));
    return;
  }

  if (targetFieldType === "json") {
    entryObj.set(targetField, stringifyValueMap(buildValueMap(sortedItems)));
    return;
  }
}

function buildAtagTagHeaderLabel(tagName, displayName, cfg) {
  var mode = cfg && cfg.tableHeaderNames ? String(cfg.tableHeaderNames).toLowerCase() : "short";
  var longName = String(tagName || "");
  var shortName = String(displayName || tagName || "");

  if (mode === "long") return longName;
  if (mode === "both" && shortName && shortName !== longName) return shortName + " (" + longName + ")";
  return shortName || longName;
}
