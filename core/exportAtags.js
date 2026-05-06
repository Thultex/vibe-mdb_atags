/*
========================================
A2 exportAtags v1.68 (sys 2.21)
========================================

Notes:
- Exports: tags, text, md, tree_md, rows_md, rows_html, json
- tree_md supports Unicode default and ASCII fallback
- tree_md child values use the same aggregate summaries as md
- tree_md defaults to compact row value counts and hidden category child lists
- tree_md shows child values by default
- tree_md only shows category children that actually occur unless enabled
- tree_md uses Markdown hard line breaks for desktop rendering
- categoryFilter filters all export types by OR categories
- tag export skips empty category tags
- tag export writes spaces as underscores
- tag export prefixes category tags with @
- category parents show aggregated numeric child values in text/md/tree exports
- cumulative +/- values force sum aggregation in row exports
- Keep this header ASCII-only for the Memento editor

Examples:

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
  targetFieldType: "md",
  markdownGroupSeparator: "",
  includeBlankTags: false
});

applyTags({
  enabled: true,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Tree",
  targetFieldType: "tree_md",
  categoryFilter: ["self", "help"],
  includeEmptyCategories: false,
  treeShowValues: true
});

applyTags({
  enabled: true,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Tree ASCII",
  targetFieldType: "tree_md",
  treeStyle: "ascii",
  treeShowValues: false
});
*/

// ===== TEXT =====
function atagCategoryAggregateMode(cfg) {
  if (cfg && cfg.categoryAggregateMode !== undefined) return cfg.categoryAggregateMode;
  if (cfg && cfg.categoryValueMode !== undefined) return cfg.categoryValueMode;
  return "avg";
}

function atagCategoryRowAggregateMode(cfg) {
  if (cfg && cfg.categoryRowAggregateMode !== undefined) return cfg.categoryRowAggregateMode;
  if (cfg && cfg.categoryChildAggregateMode !== undefined) return cfg.categoryChildAggregateMode;
  if (cfg && cfg.rowAggregateMode !== undefined) return cfg.rowAggregateMode;
  return "max";
}

function atagCategoryAggregateDecimals(cfg) {
  if (cfg && cfg.categoryAggregateDecimals != null) return cfg.categoryAggregateDecimals;
  if (cfg && cfg.rowAggregateDecimals != null) return cfg.rowAggregateDecimals;
  return 1;
}

function normalizeAtagDisplayMode(mode, fallback) {
  var s = String(mode == null ? fallback : mode).toLowerCase();
  if (s === "off" || s === "false") return "none";
  if (s === "full") return "all";
  if (s === "name") return "names";
  if (s === "values") return "all";
  return s;
}

function atagRowDisplayValuesMode(cfg, context) {
  var raw = cfg ? (
    cfg.row_display_values != null ? cfg.row_display_values :
    cfg.rowDisplayValues != null ? cfg.rowDisplayValues :
    cfg.rowValueDisplay != null ? cfg.rowValueDisplay :
    cfg.rowDisplayMode
  ) : null;
  return normalizeAtagDisplayMode(raw, context === "tree" ? "count" : "all");
}

function atagCategoryDisplayValuesMode(cfg, context) {
  var raw = cfg ? (
    cfg.cat_display_values != null ? cfg.cat_display_values :
    cfg.category_display_values != null ? cfg.category_display_values :
    cfg.catDisplayValues != null ? cfg.catDisplayValues :
    cfg.categoryDisplayValues != null ? cfg.categoryDisplayValues :
    cfg.categoryValueDisplay != null ? cfg.categoryValueDisplay :
    cfg.categoryDisplayMode
  ) : null;
  return normalizeAtagDisplayMode(raw, context === "tree" ? "none" : "names");
}

function collectAtagCategoryChildValues(items, childNames, cfg) {
  var valuesByChild = {};
  var out = [];
  var childSet = {};
  var childOrder = [];
  var childHasDecimal = {};
  var mode = atagCategoryRowAggregateMode(cfg);
  var i;
  var it;
  var name;
  var key;
  var num;
  var vals;
  var agg;

  for (i = 0; i < (childNames || []).length; i++) {
    name = String(childNames[i] || "");
    if (!name) continue;
    key = name.toLowerCase();
    if (childSet[key]) continue;
    childSet[key] = name;
    childOrder.push(key);
  }

  for (i = 0; i < (items || []).length; i++) {
    it = items[i];
    if (!it || atagItemIsCategory(it)) continue;
    key = String(it.name || "").toLowerCase();
    if (!childSet[key]) continue;
    num = toNumberIfPossible(it.attrValue);
    if (num == null) continue;
    if (!valuesByChild[key]) valuesByChild[key] = [];
    valuesByChild[key].push(num);
    if (itemHasDecimalValue(it)) childHasDecimal[key] = true;
  }

  for (i = 0; i < childOrder.length; i++) {
    key = childOrder[i];
    vals = valuesByChild[key] || [];
    if (!vals.length) continue;
    agg = computeAggregate(vals, mode);
    if (agg == null) continue;
    out.push({
      name: childSet[key],
      value: agg,
      hasDecimal: !!childHasDecimal[key]
    });
  }

  return out;
}

function formatAtagCategorySummary(item, items, cfg, context) {
  var children = isArrayValue(item && item.attrValue) ? item.attrValue : [];
  var values = collectAtagCategoryChildValues(items, children, cfg);
  var decimals = atagCategoryAggregateDecimals(cfg);
  var mode = atagCategoryAggregateMode(cfg);
  var nums = [];
  var names = [];
  var detailParts = [];
  var forceDecimal = false;
  var i;
  var agg;
  var displayMode = atagCategoryDisplayValuesMode(cfg, context || "default");

  for (i = 0; i < values.length; i++) {
    nums.push(values[i].value);
    names.push(values[i].name);
    detailParts.push(values[i].name + ": " + formatTagNumberLocale(values[i].value, decimals, values[i].hasDecimal));
    if (values[i].hasDecimal) forceDecimal = true;
  }

  if (nums.length) {
    agg = computeAggregate(nums, mode);
    if (agg != null) {
      var text = formatTagNumberLocale(agg, decimals, forceDecimal);
      if (displayMode === "count") text += " [" + names.length + "]";
      else if (displayMode === "names") text += " [" + names.join(", ") + "]";
      else if (displayMode === "all") text += " [" + detailParts.join(", ") + "]";
      return text;
    }
  }

  if (children.length) {
    if (displayMode === "none") return "";
    if (displayMode === "count") return "[" + children.length + "]";
    return children.join(", ");
  }
  return item && item.attrText != null ? item.attrText : "";
}

function collectAtagValueSummary(itemName, items, cfg, context) {
  var vals = [];
  var parts = [];
  var firstItem = null;
  var hasDecimal = false;
  var cumulative = false;
  var mode = cfg && cfg.rowAggregateMode !== undefined ? cfg.rowAggregateMode : "avg";
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;
  var displayMode = atagRowDisplayValuesMode(cfg, context || "default");
  var i;
  var it;
  var num;
  var agg;

  for (i = 0; i < (items || []).length; i++) {
    it = items[i];
    if (!it || atagItemIsCategory(it)) continue;
    if (String(it.name || "").toLowerCase() !== String(itemName || "").toLowerCase()) continue;
    if (!firstItem) firstItem = it;
    num = toNumberIfPossible(it.attrValue);
    if (num == null) continue;
    vals.push(num);
    parts.push(formatTagNumberLocale(num, decimals, itemHasDecimalValue(it)));
    if (itemHasDecimalValue(it)) hasDecimal = true;
    if (it.cumulative === true) cumulative = true;
  }

  if (vals.length) {
    if (cumulative) mode = "sum";
    agg = computeAggregate(vals, mode);
    if (agg == null) return null;
    return {
      text: formatTagNumberLocale(agg, decimals, hasDecimal) + (parts.length > 1 && displayMode === "count" ? " [" + parts.length + "]" : "") + (parts.length > 1 && displayMode === "all" ? " [" + parts.join(", ") + "]" : ""),
      item: firstItem
    };
  }

  if (firstItem && firstItem.attrText != null && firstItem.attrText !== "") {
    return {
      text: String(formatMarkdownValue("", firstItem.attrText, firstItem.rawText)).replace(/^:\s*/, ""),
      item: firstItem
    };
  }

  return null;
}

function categorySummaryItem(item, items, cfg) {
  var clone;
  if (!atagItemIsCategory(item)) return item;
  clone = {};
  for (var k in item) {
    if (item.hasOwnProperty(k)) clone[k] = item[k];
  }
  clone.attrText = formatAtagCategorySummary(item, items, cfg);
  clone.rawText = clone.attrText;
  return clone;
}

function includeAtagTextItem(item, cfg) {
  if (cfg && cfg.includeBlankTags === true) return true;
  return !(item && (item.attrText == null || item.attrText === ""));
}

function buildAtagTextLines(items, cfg) {
  var lines = [];
  for (var i = 0; i < items.length; i++) {
    var it = categorySummaryItem(items[i], items, cfg);
    if (!includeAtagTextItem(it, cfg)) continue;
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
        count: 0,
        cumulative: false
      };
    }

    tagAgg[it.name].sum += num;
    tagAgg[it.name].count += 1;
    if (it.cumulative === true) tagAgg[it.name].cumulative = true;
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
  var outputItems = [];
  var rowMap = {};
  var rowFirstItem = {};
  var rowHasDecimal = {};
  var rowCumulative = {};
  var separatorSourceCount = 0;
  var aggMode = cfg && cfg.rowAggregateMode !== undefined ? cfg.rowAggregateMode : "avg";
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;

  function addOutput(sortItem, line) {
    outputItems.push({
      sortItem: sortItem,
      line: line
    });
  }

  function outputCategory(sortItem) {
    var group = getMarkdownSortGroup(sortItem);
    if (group <= 3) return "link";
    if (group <= 5) return "number";
    if (group <= 7) return "text";
    return "blank";
  }

  for (var i = 0; i < items.length; i++) {
    var it = categorySummaryItem(items[i], items, cfg);
    var label = markdownItemLabel(it, cfg);

    separatorSourceCount++;
    if (!includeAtagTextItem(it, cfg)) continue;

    if (it.rowValue == null) {
      addOutput(it, formatMarkdownValue(label, it.attrText, it.rawText));
      continue;
    }

    var num = toNumberIfPossible(it.attrValue);
    if (num == null) {
      addOutput(it, formatMarkdownValue(label, it.attrText, it.rawText));
      continue;
    }

    if (!rowMap[it.name]) {
      rowMap[it.name] = [];
      rowFirstItem[it.name] = it;
    }

    if (itemHasDecimalValue(it)) {
      rowHasDecimal[it.name] = true;
    }
    if (it.cumulative === true) {
      rowCumulative[it.name] = true;
    }

    rowMap[it.name].push(num);
  }

  for (var name in rowMap) {
    if (!rowMap.hasOwnProperty(name)) continue;

    var vals = rowMap[name];
    var listParts = [];
    var firstItem = rowFirstItem[name];
    var rowLabel = markdownItemLabel(firstItem, cfg);

    for (var k = 0; k < vals.length; k++) {
      listParts.push(formatTagNumberLocale(vals[k], decimals, !!rowHasDecimal[name]));
    }

    if (aggMode === "avg" || aggMode === "sum") {
      var effectiveAggMode = rowCumulative[name] ? "sum" : aggMode;
      var agg = computeAggregate(vals, effectiveAggMode);
      var aggText = formatTagNumberLocale(agg, decimals, !!rowHasDecimal[name]);
      var line = rowLabel + ": " + aggText;

      if (listParts.length > 1) {
        line += "  [" + listParts.join(", ") + "]";
      }

      addOutput({
        name: firstItem.name,
        displayName: firstItem.displayName,
        attrText: aggText,
        attrValue: agg,
        rawText: aggText,
        cumulative: !!rowCumulative[name]
      }, line);
    } else {
      if (listParts.length === 1) {
        addOutput(firstItem, rowLabel + ": " + listParts[0]);
      } else if (listParts.length > 1) {
        addOutput(firstItem, rowLabel + "  [" + listParts.join(", ") + "]");
      }
    }
  }

  outputItems.sort(function(a, b) {
    return compareMarkdownItems(a.sortItem, b.sortItem, cfg);
  });

  var separator = "";
  if (
    cfg &&
    Object.prototype.hasOwnProperty.call(cfg, "markdownGroupSeparator") &&
    cfg.markdownGroupSeparator !== undefined
  ) {
    separator = cfg.markdownGroupSeparator;
  }
  if (cfg && (cfg.markdownGroupSeparators === false || cfg.markdownGroupSeparators === 0)) {
    separator = null;
  }
  var lastCategory = null;
  var category;
  var rendered = "";
  var lineBreak;

  for (var oi = 0; oi < outputItems.length; oi++) {
    category = outputCategory(outputItems[oi].sortItem);

    if (oi > 0) {
      lineBreak = "  \n";
      if (separator != null && separatorSourceCount > 5 && lastCategory != null && category !== lastCategory) {
        lineBreak = separator === "" ? "\n\n" : "  \n" + String(separator) + "  \n";
      }
      rendered += lineBreak;
    }

    rendered += outputItems[oi].line;
    lastCategory = category;
  }

  return rendered;
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
        agg = (mode === "sum" || aggInfo.cumulative === true) ? aggInfo.sum : (aggInfo.sum / aggInfo.count);
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
        agg = (mode === "sum" || aggInfo.cumulative === true) ? aggInfo.sum : (aggInfo.sum / aggInfo.count);
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

// ===== CATEGORY FILTER =====
function normalizeAtagCategoryFilter(cfg) {
  var raw = cfg ? (cfg.categoryFilter != null ? cfg.categoryFilter : cfg.catFilter) : null;
  var parts;
  var out = [];
  var seen = {};
  var i;
  var name;
  var key;

  if (raw == null || raw === "" || raw === false) return [];
  if (isArrayValue(raw)) parts = raw;
  else parts = String(raw).split(",");

  for (i = 0; i < parts.length; i++) {
    name = String(parts[i] || "").replace(/^\s+|\s+$/g, "");
    if (!name) continue;
    key = name.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(name);
  }

  return out;
}

function categoryFilterHasKey(filterMap, name) {
  return !!filterMap[String(name || "").toLowerCase()];
}

function buildAtagCategoryFilterMap(filters) {
  var map = {};
  var i;

  for (i = 0; i < filters.length; i++) {
    map[String(filters[i]).toLowerCase()] = true;
  }

  return map;
}

function atagItemIsCategory(item) {
  return !!(item && (item.isCategory === true || item.kind === "category" || item.type === "category"));
}

function filterAtagItemsForTagField(items) {
  var out = [];
  var value;
  for (var i = 0; i < items.length; i++) {
    if (!atagItemIsCategory(items[i])) {
      out.push(items[i]);
      continue;
    }
    value = items[i].attrValue;
    if (isArrayValue(value) && value.length) out.push(items[i]);
  }
  return out;
}

function formatAtagTagFieldName(name) {
  return String(name || "").replace(/^\s+|\s+$/g, "").replace(/\s+/g, "_").replace(/_+/g, "_");
}

function formatAtagTagFieldItemName(item) {
  var n = formatAtagTagFieldName(item && item.name);
  if (n && atagItemIsCategory(item)) n = "@" + n;
  return n;
}

function formatAtagTagFieldNames(names) {
  var out = [];
  var seen = {};
  var i;
  var n;
  var k;

  for (i = 0; i < (names || []).length; i++) {
    n = formatAtagTagFieldName(names[i]);
    if (!n) continue;
    k = n.toLowerCase();
    if (!seen[k]) {
      seen[k] = 1;
      out.push(n);
    }
  }

  return out;
}

function uniqueAtagTagFieldItemNames(items, skipAuto) {
  var out = [];
  var seen = {};
  var i;
  var n;
  var k;

  for (i = 0; i < (items || []).length; i++) {
    if (skipAuto && isAutoGeneratedName(items[i] && items[i].name)) continue;
    n = formatAtagTagFieldItemName(items[i]);
    if (!n) continue;
    k = n.toLowerCase();
    if (!seen[k]) {
      seen[k] = 1;
      out.push(n);
    }
  }

  return out;
}

function filterAtagItemsByCategory(items, cfg) {
  var filters = normalizeAtagCategoryFilter(cfg);
  var filterMap;
  var childrenMap = {};
  var out = [];
  var i;
  var j;
  var it;
  var cats;
  var key;
  var child;

  if (!filters.length) return items;

  filterMap = buildAtagCategoryFilterMap(filters);

  for (i = 0; i < items.length; i++) {
    it = items[i];
    if (!atagItemIsCategory(it)) continue;
    if (!categoryFilterHasKey(filterMap, it.name)) continue;
    if (!isArrayValue(it.attrValue)) continue;

    for (j = 0; j < it.attrValue.length; j++) {
      child = String(it.attrValue[j] || "");
      if (child) childrenMap[child.toLowerCase()] = true;
    }
  }

  for (i = 0; i < items.length; i++) {
    it = items[i];
    if (!it) continue;

    key = String(it.name || "").toLowerCase();
    if (childrenMap[key]) {
      out.push(it);
      continue;
    }

    if (atagItemIsCategory(it) && categoryFilterHasKey(filterMap, it.name)) {
      out.push(it);
      continue;
    }

    cats = it.cats || [];
    for (j = 0; j < cats.length; j++) {
      if (categoryFilterHasKey(filterMap, cats[j])) {
        out.push(it);
        break;
      }
    }
  }

  return out;
}

// ===== TREE MD =====
function buildAtagTreeMarkdown(items, cfg) {
  var categories = {};
  var itemByName = {};
  var order = [];
  var includeEmpty = !!(cfg && (cfg.includeEmptyCategories === true || cfg.showEmptyCategories === true));
  var includeMissingChildren = !!(cfg && (
    cfg.treeIncludeMissingChildren === true ||
    cfg.includeMissingTreeChildren === true ||
    cfg.treeShowAllChildren === true
  ));
  var showValues = !(cfg && (cfg.treeShowValues === false || cfg.includeTreeValues === false));
  var i;
  var j;
  var it;
  var cats;
  var cat;
  var child;
  var catKey;
  var childKey;
  var lines = [];
  var style = cfg && cfg.treeStyle != null ? String(cfg.treeStyle).toLowerCase() : "unicode";
  var branch = style === "unicode" ? "\u251c\u2500\u2500 " : "|-- ";
  var lastBranch = style === "unicode" ? "\u2514\u2500\u2500 " : "`-- ";

  function ensureCategory(name, displayName) {
    var key = String(name || "").toLowerCase();
    if (!name) return null;

    if (!categories[key]) {
      categories[key] = {
        name: name,
        displayName: displayName || name,
        children: [],
        childSeen: {}
      };
      order.push(key);
    } else if (displayName && categories[key].displayName === categories[key].name) {
      categories[key].displayName = displayName;
    }

    return categories[key];
  }

  function rememberItem(item) {
    var key;
    if (!item || atagItemIsCategory(item)) return;
    key = String(item.name || "").toLowerCase();
    if (!key || itemByName[key]) return;
    itemByName[key] = item;
  }

  function treeChildLabel(name) {
    var label = String(name || "");
    var summary;

    if (!showValues) return label;

    summary = collectAtagValueSummary(label, items, cfg, "tree");
    if (!summary || !summary.text) return label;

    return label + " " + summary.text;
  }

  function treeChildExists(name) {
    return !!itemByName[String(name || "").toLowerCase()];
  }

  function visibleTreeChildren(children) {
    var out = [];
    var idx;
    var name;

    if (includeMissingChildren) return children;

    for (idx = 0; idx < children.length; idx++) {
      name = children[idx];
      if (treeChildExists(name)) out.push(name);
    }

    return out;
  }

  for (i = 0; i < items.length; i++) {
    it = items[i];
    if (!it) continue;
    rememberItem(it);

    if (isArrayValue(it.attrValue)) {
      cat = ensureCategory(it.name, it.name);
      for (j = 0; j < it.attrValue.length; j++) {
        child = String(it.attrValue[j] || "");
        if (!child) continue;
        childKey = child.toLowerCase();
        if (!cat.childSeen[childKey]) {
          cat.childSeen[childKey] = true;
          cat.children.push(child);
        }
      }
    }

    cats = it.cats || [];
    for (j = 0; j < cats.length; j++) {
      cat = ensureCategory(cats[j], cats[j]);
      if (!cat) continue;
      child = it.name;
      childKey = String(child || "").toLowerCase();
      if (!child || childKey === String(cats[j]).toLowerCase()) continue;
      if (!cat.childSeen[childKey]) {
        cat.childSeen[childKey] = true;
        cat.children.push(child);
      }
    }
  }

  order.sort(function(a, b) {
    return compareTagNames(categories[a].name, categories[b].name);
  });

  for (i = 0; i < order.length; i++) {
    catKey = order[i];
    cat = categories[catKey];
    cat.children = sortTagNames(cat.children);
    cat.children = visibleTreeChildren(cat.children);

    if (!cat.children.length && !includeEmpty) continue;

    if (lines.length) lines.push("");
    lines.push(treeCategoryLabel(cat));

    for (j = 0; j < cat.children.length; j++) {
      lines.push((j === cat.children.length - 1 ? lastBranch : branch) + treeChildLabel(cat.children[j]));
    }
  }

  return lines.join("  \n");

  function treeCategoryLabel(catObj) {
    var summary = formatAtagCategorySummary({ attrValue: catObj.children }, items, cfg, "tree");
    var label = catObj.name;
    if (showValues && summary && /^\S/.test(summary)) label += " " + summary;
    return label;
  }
}

// ===== EXPORT =====
function exportAtags(cfg) {
  var entryObj = cfg.entryObj || entry();
  if (!entryObj) return;

  var result = cfg.result || {};
  var items = filterAtagItemsByCategory(result.items || [], cfg);
  var sortedItems = sortItemsByTagName(items);
  var targetField = cfg.targetField;
  var targetFieldType = cfg.targetFieldType;

  if (targetFieldType === "tags") {
    var tagFieldItems = filterAtagItemsForTagField(sortedItems);
    var parsedTags = uniqueAtagTagFieldItemNames(tagFieldItems, true);
    var metaTags = formatAtagTagFieldNames(collectMetaTags(tagFieldItems));
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
    entryObj.set(targetField, buildAtagTextLines(sortedItems, cfg).join("\n"));
    return;
  }

  if (targetFieldType === "md") {
    entryObj.set(targetField, buildAtagNormalMarkdown(items, cfg));
    return;
  }

  if (targetFieldType === "tree_md") {
    entryObj.set(targetField, buildAtagTreeMarkdown(sortedItems, cfg));
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
