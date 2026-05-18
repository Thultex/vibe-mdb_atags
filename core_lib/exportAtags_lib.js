/*
========================================
#2 exportAtags Lib v1.83 (sys 2.30)
========================================

Notes:
- Exports: tags, text, md, tree_md, rows_md, rows_html, json
- tree_md supports Unicode default and ASCII fallback
- tree_md child values use the same aggregate summaries as md
- tree_md defaults to compact row value counts and hidden category child lists
- tree_md shows child values by default
- tree_md only shows category children that actually occur unless enabled
- tree_md uses Markdown hard line breaks for desktop rendering
- tree_md defaults repeated child row values to max unless rowAggregateMode is explicit
- categoryFilter filters all export types by OR categories
- tag export skips empty category tags
- tag export writes spaces as underscores
- tag export prefixes category tags with @
- category parents show aggregated numeric child values in text/md/tree exports
- tree_md category parents default to max_abs for signed fixed children
- negated category children are marked with subscript minus before the name in category displays
- category and tree value summaries reuse a per-export value index
- repeated string aggregation returns early when no repeated string tags exist
- category and string aggregation share one item clone helper
- rows_md and rows_html share row table view construction
- rows_html renders table rows through a shared helper
- repeated string values aggregate with first, last, or join
- category aliases with trailing +/- apply that sign after child aggregation
- cumulative +/- values force sum aggregation in row exports
- Keep this header ASCII-only for the Memento editor

Examples:

These examples use applyTags() from core/helpers.js.
When only this remote lib is loaded, call exportAtags() directly or load core/helpers.js after the libs.

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
function getExportAtagsLibVersion() {
  return {
    name: "exportAtags_lib",
    version: "1.83",
    sysVersion: "2.30",
    path: "core_lib/exportAtags_lib.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("exportAtags_lib", "1.83", "2.30", "core_lib/exportAtags_lib.js");
}
function atagCategoryAggregateMode(cfg, context) {
  if (cfg && cfg.categoryAggregateMode !== undefined) return cfg.categoryAggregateMode;
  if (cfg && cfg.categoryValueMode !== undefined) return cfg.categoryValueMode;
  if (context === "tree") return "max_abs";
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

function atagStringAggregateMode(cfg) {
  var raw = cfg ? (
    cfg.stringAggregateMode != null ? cfg.stringAggregateMode :
    cfg.textAggregateMode != null ? cfg.textAggregateMode :
    cfg.stringValueMode != null ? cfg.stringValueMode :
    cfg.rowAggregateMode
  ) : null;
  var mode = String(raw == null ? "" : raw).toLowerCase();
  if (mode === "first" || mode === "last" || mode === "join") return mode;
  return "join";
}

function atagStringJoinSeparator(cfg) {
  return cfg && cfg.stringJoinSeparator != null ? String(cfg.stringJoinSeparator) : ", ";
}

function atagMarkdownDetailPrefix(context) {
  return " - [";
}

function atagCountDetailPrefix(context) {
  return " [";
}

function atagValueDetailPrefix(displayMode, context) {
  return displayMode === "count" ? atagCountDetailPrefix(context) : atagMarkdownDetailPrefix(context);
}

function atagCategoryDetailPrefix(displayMode, context) {
  return displayMode === "count" ? atagCountDetailPrefix(context) : atagMarkdownDetailPrefix(context);
}

function atagCategoryChildNamePrefix(sign) {
  return sign === -1 ? "\u208B" : "";
}

function formatAtagCategoryChildDetail(name, sign, value, decimals, hasDecimal) {
  return atagCategoryChildNamePrefix(sign) + String(name || "") + ": " + formatTagNumberLocale(value, decimals, hasDecimal);
}

function buildAtagValueIndex(items) {
  var byName = {};
  var i;
  var it;
  var key;

  for (i = 0; i < (items || []).length; i++) {
    it = items[i];
    if (!it || atagItemIsCategory(it)) continue;
    key = String(it.name || "").toLowerCase();
    if (!key) continue;
    if (!byName[key]) byName[key] = [];
    byName[key].push(it);
  }

  return {
    byName: byName
  };
}

function atagValueIndexList(index, name) {
  var key = String(name || "").toLowerCase();
  if (index && index.byName && index.byName[key]) return index.byName[key];
  return null;
}

function collectAtagCategoryChildValues(items, childNames, cfg, categoryItem, valueIndex) {
  var valuesByChild = {};
  var out = [];
  var childSet = {};
  var childOrder = [];
  var childHasDecimal = {};
  var childSigns = categoryItem && categoryItem.categoryChildSigns ? categoryItem.categoryChildSigns : {};
  var mode = atagCategoryRowAggregateMode(cfg);
  var i;
  var it;
  var name;
  var key;
  var num;
  var vals;
  var agg;
  var list;
  var li;

  for (i = 0; i < (childNames || []).length; i++) {
    name = String(childNames[i] || "");
    if (!name) continue;
    key = name.toLowerCase();
    if (childSet[key]) continue;
    childSet[key] = name;
    childOrder.push(key);
  }

  if (!valueIndex) valueIndex = buildAtagValueIndex(items);

  for (i = 0; i < childOrder.length; i++) {
    key = childOrder[i];
    list = atagValueIndexList(valueIndex, childSet[key]) || [];
    for (li = 0; li < list.length; li++) {
      it = list[li];
      num = toNumberIfPossible(it.attrValue);
      if (num == null) continue;
      if (childSigns[key] === -1) num = -num;
      if (!valuesByChild[key]) valuesByChild[key] = [];
      valuesByChild[key].push(num);
      if (itemHasDecimalValue(it)) childHasDecimal[key] = true;
    }
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
      hasDecimal: !!childHasDecimal[key],
      sign: childSigns[key] === -1 ? -1 : 1
    });
  }

  return out;
}

function formatAtagCategorySummary(item, items, cfg, context, valueIndex) {
  var children = isArrayValue(item && item.attrValue) ? item.attrValue : [];
  var values = collectAtagCategoryChildValues(items, children, cfg, item, valueIndex);
  var decimals = atagCategoryAggregateDecimals(cfg);
  var mode = atagCategoryAggregateMode(cfg, context);
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
    detailParts.push(formatAtagCategoryChildDetail(values[i].name, values[i].sign, values[i].value, decimals, values[i].hasDecimal));
    if (values[i].hasDecimal) forceDecimal = true;
  }

  if (nums.length) {
    agg = computeAggregate(nums, mode);
    if (agg != null) {
      if (item && item.categorySign === -1) agg = -agg;
      var text = formatTagNumberLocale(agg, decimals, forceDecimal);
      if (displayMode === "count") text += atagCategoryDetailPrefix(displayMode, context) + names.length + "]";
      else if (displayMode === "names") text += atagCategoryDetailPrefix(displayMode, context) + names.join(", ") + "]";
      else if (displayMode === "all") text += atagCategoryDetailPrefix(displayMode, context) + detailParts.join(", ") + "]";
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

function collectAtagValueSummary(itemName, items, cfg, context, valueMultiplier, valueIndex) {
  var vals = [];
  var parts = [];
  var firstItem = null;
  var hasDecimal = false;
  var cumulative = false;
  var multiplier = valueMultiplier === -1 ? -1 : 1;
  var mode = cfg && cfg.rowAggregateMode !== undefined ? cfg.rowAggregateMode : (context === "tree" ? "max" : "avg");
  var decimals = cfg && cfg.rowAggregateDecimals != null ? cfg.rowAggregateDecimals : 1;
  var displayMode = atagRowDisplayValuesMode(cfg, context || "default");
  var i;
  var it;
  var num;
  var agg;
  var list;

  if (!valueIndex) valueIndex = buildAtagValueIndex(items);
  list = atagValueIndexList(valueIndex, itemName) || [];

  for (i = 0; i < list.length; i++) {
    it = list[i];
    if (!firstItem) firstItem = it;
    num = toNumberIfPossible(it.attrValue);
    if (num == null) continue;
    num *= multiplier;
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
      text: formatTagNumberLocale(agg, decimals, hasDecimal) + (parts.length > 1 && displayMode === "count" ? atagValueDetailPrefix(displayMode, context) + parts.length + "]" : "") + (parts.length > 1 && displayMode === "all" ? atagValueDetailPrefix(displayMode, context) + parts.join(", ") + "]" : ""),
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

function categorySummaryItem(item, items, cfg, context, valueIndex) {
  var clone;
  if (!atagItemIsCategory(item)) return item;
  clone = cloneAtagItem(item);
  clone.attrText = formatAtagCategorySummary(item, items, cfg, context, valueIndex);
  clone.rawText = clone.attrText;
  return clone;
}

function includeAtagTextItem(item, cfg) {
  if (cfg && cfg.includeBlankTags === true) return true;
  return !(item && (item.attrText == null || item.attrText === ""));
}

function atagCanAggregateStringItem(item) {
  if (!item || atagItemIsCategory(item)) return false;
  if (item.attrText == null || item.attrText === "") return false;
  if (toNumberIfPossible(item.attrValue) != null) return false;
  if (isLinkRaw(item.rawText) || isEmailRaw(item.rawText) || isTelRaw(item.rawText)) return false;
  return typeof item.attrValue === "string" || isArrayValue(item.attrValue);
}

function atagStringParts(item) {
  var out = [];
  var val = item ? item.attrValue : null;
  var i;
  if (isArrayValue(val)) {
    for (i = 0; i < val.length; i++) {
      if (val[i] != null && val[i] !== "") out.push(String(val[i]));
    }
    return out;
  }
  if (item && item.attrText != null && item.attrText !== "") out.push(String(item.attrText));
  return out;
}

function cloneAtagItem(item) {
  var clone = {};
  var k;
  for (k in item) {
    if (item.hasOwnProperty(k)) clone[k] = item[k];
  }
  return clone;
}

function aggregateAtagRepeatedStringItems(items, cfg) {
  var groups = {};
  var out = [];
  var emitted = {};
  var hasRepeated = false;
  var mode = atagStringAggregateMode(cfg);
  var separator = atagStringJoinSeparator(cfg);
  var i;
  var it;
  var key;
  var group;
  var clone;
  var parts;

  for (i = 0; i < (items || []).length; i++) {
    it = items[i];
    if (!atagCanAggregateStringItem(it)) continue;
    key = String(it.name || "").toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        items: [],
        parts: []
      };
    }
    if (groups[key].items.length > 0) hasRepeated = true;
    groups[key].items.push(it);
    parts = atagStringParts(it);
    groups[key].parts = groups[key].parts.concat(parts);
  }

  if (!hasRepeated) return items;
  out = [];

  for (i = 0; i < (items || []).length; i++) {
    it = items[i];
    if (!atagCanAggregateStringItem(it)) {
      out.push(it);
      continue;
    }

    key = String(it.name || "").toLowerCase();
    group = groups[key];
    if (!group || group.items.length <= 1) {
      out.push(it);
      continue;
    }
    if (emitted[key]) continue;
    emitted[key] = true;

    if (mode === "last") clone = cloneAtagItem(group.items[group.items.length - 1]);
    else clone = cloneAtagItem(group.items[0]);

    if (mode === "join") {
      clone.attrText = group.parts.join(separator);
      clone.attrValue = clone.attrText;
      clone.rawText = clone.attrText;
    }

    out.push(clone);
  }

  return out;
}

function buildAtagTextLines(items, cfg) {
  var lines = [];
  var valueIndex = buildAtagValueIndex(items);
  for (var i = 0; i < items.length; i++) {
    var it = categorySummaryItem(items[i], items, cfg, "text", valueIndex);
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
  var valueIndex = buildAtagValueIndex(items);
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
    var it = categorySummaryItem(items[i], items, cfg, "md", valueIndex);
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
        line += atagMarkdownDetailPrefix("md") + listParts.join(", ") + "]";
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
        addOutput(firstItem, rowLabel + atagMarkdownDetailPrefix("md") + listParts.join(", ") + "]");
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

function buildAtagRowTableView(items, cfg) {
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
  var header;
  var bodyRows = [];
  var aggregateRow = null;
  var ri;
  var r;
  var cells;
  var tj;
  var v;
  var tk;
  var aggInfo;
  var agg;

  if (!rows.length || !tagOrder.length) return null;

  header = ["rval"];

  for (var t = 0; t < tagOrder.length; t++) {
    header.push(shortenTableWord(buildAtagTagHeaderLabel(tagOrder[t], tagDisplay[tagOrder[t]], cfg), shortenHeaders));
  }

  for (ri = 0; ri < rows.length; ri++) {
    r = rows[ri];
    cells = [buildAtagRowHeaderLabel(r, includeUnits)];

    for (tj = 0; tj < tagOrder.length; tj++) {
      v = r.values[tagOrder[tj]];
      cells.push(v == null ? "" : formatTagNumberLocale(v, decimals, !!tagHasDecimal[tagOrder[tj]]));
    }

    bodyRows.push(cells);
  }

  if (mode === "avg" || mode === "sum") {
    aggregateRow = [mode];

    for (tk = 0; tk < tagOrder.length; tk++) {
      aggInfo = tagAgg[tagOrder[tk]];
      agg = null;
      if (aggInfo && aggInfo.count) {
        agg = (mode === "sum" || aggInfo.cumulative === true) ? aggInfo.sum : (aggInfo.sum / aggInfo.count);
      }
      aggregateRow.push(agg == null ? "" : formatTagNumberLocale(agg, decimals, !!tagHasDecimal[tagOrder[tk]]));
    }
  }

  return {
    header: header,
    bodyRows: bodyRows,
    aggregateRow: aggregateRow
  };
}

// ===== ROWS MD =====
function buildAtagRowsMarkdown(items, cfg) {
  var view = buildAtagRowTableView(items, cfg);
  var lines = [];
  var aligns;
  var i;

  if (!view) return "";

  aligns = [":---"];
  for (i = 1; i < view.header.length; i++) aligns.push("---:");

  lines.push("| " + view.header.join(" | ") + " |");
  lines.push("| " + aligns.join(" | ") + " |");

  for (i = 0; i < view.bodyRows.length; i++) {
    lines.push("| " + view.bodyRows[i].join(" | ") + " |");
  }

  if (view.aggregateRow) {
    lines.push("| " + view.aggregateRow.join(" | ") + " |");
  }

  return lines.join("  \n");
}

// ===== ROWS HTML =====
function renderAtagHtmlTableRow(cells, cellTag) {
  var tag = cellTag || "td";
  var html = ["<tr>"];
  var i;

  for (i = 0; i < cells.length; i++) {
    html.push(
      "<" + tag + ' style="text-align:' + (i === 0 ? "left" : "right") + ';">' +
      escapeHtml(cells[i]) +
      "</" + tag + ">"
    );
  }

  html.push("</tr>");
  return html.join("");
}

function buildAtagRowsHtml(items, cfg) {
  var view = buildAtagRowTableView(items, cfg);
  var html = [];
  var i;

  if (!view) return "";

  html.push('<table style="font-family:sans-serif;">');
  html.push("<thead>");
  html.push(renderAtagHtmlTableRow(view.header, "th"));
  html.push("</thead>");
  html.push("<tbody>");

  for (i = 0; i < view.bodyRows.length; i++) {
    html.push(renderAtagHtmlTableRow(view.bodyRows[i], "td"));
  }

  if (view.aggregateRow) {
    html.push(renderAtagHtmlTableRow(view.aggregateRow, "td"));
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
  var valueIndex = buildAtagValueIndex(items);
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
        childSeen: {},
        childSigns: {},
        categoryItem: null
      };
      order.push(key);
    } else if (displayName && categories[key].displayName === categories[key].name) {
      categories[key].displayName = displayName;
    }

    return categories[key];
  }

  function rememberCategoryItem(catObj, item) {
    var signs;
    var signKey;
    if (!catObj || !item) return;
    catObj.categoryItem = item;
    signs = item.categoryChildSigns || {};
    for (signKey in signs) {
      if (signs.hasOwnProperty(signKey)) catObj.childSigns[signKey] = signs[signKey];
    }
  }

  function rememberItem(item) {
    var key;
    if (!item || atagItemIsCategory(item)) return;
    key = String(item.name || "").toLowerCase();
    if (!key || itemByName[key]) return;
    itemByName[key] = item;
  }

  function treeChildLabel(name, catObj) {
    var label = String(name || "");
    var summary;
    var sign = catObj && catObj.childSigns ? catObj.childSigns[label.toLowerCase()] : null;

    if (!showValues) return label;

    summary = collectAtagValueSummary(name, items, cfg, "tree", sign, valueIndex);
    if (!summary || !summary.text) return label;

    return atagCategoryChildNamePrefix(sign) + label + " " + summary.text;
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
      rememberCategoryItem(cat, it);
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
      lines.push((j === cat.children.length - 1 ? lastBranch : branch) + treeChildLabel(cat.children[j], cat));
    }
  }

  return lines.join("  \n");

  function treeCategoryLabel(catObj) {
    var summaryItem = {};
    var source = catObj.categoryItem || {};
    var prop;
    var summary;
    for (prop in source) {
      if (source.hasOwnProperty(prop)) summaryItem[prop] = source[prop];
    }
    summaryItem.attrValue = catObj.children;
    summary = formatAtagCategorySummary(summaryItem, items, cfg, "tree", valueIndex);
    var label = catObj.name;
    if (showValues && summary && /^\S/.test(summary)) label += " " + summary;
    return label;
  }
}

// ===== EXPORT =====
function exportAtags(cfg) {
  cfg = cfg || {};
  var entryObj = cfg.entryObj || (typeof entry === "function" ? entry() : null);
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
    entryObj.set(targetField, buildAtagTextLines(aggregateAtagRepeatedStringItems(sortedItems, cfg), cfg).join("\n"));
    return;
  }

  if (targetFieldType === "md") {
    entryObj.set(targetField, buildAtagNormalMarkdown(aggregateAtagRepeatedStringItems(items, cfg), cfg));
    return;
  }

  if (targetFieldType === "tree_md") {
    entryObj.set(targetField, buildAtagTreeMarkdown(aggregateAtagRepeatedStringItems(sortedItems, cfg), cfg));
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
    entryObj.set(targetField, stringifyValueMap(buildValueMap(aggregateAtagRepeatedStringItems(sortedItems, cfg))));
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
