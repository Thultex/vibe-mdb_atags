/*
========================================
A2 exportAtags v1.59 (sys 2.21)
========================================

Notes:
- Exports: tags, text, md, tree_md, rows_md, rows_html, json
- tree_md supports Unicode default and ASCII fallback
- tree_md shows child values by default
- tree_md uses Markdown hard line breaks for desktop rendering
- categoryFilter filters all export types by OR categories
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
function includeAtagTextItem(item, cfg) {
  if (cfg && cfg.includeBlankTags === true) return true;
  return !(item && (item.attrText == null || item.attrText === ""));
}

function buildAtagTextLines(items, cfg) {
  var lines = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
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
  var outputItems = [];
  var rowMap = {};
  var rowFirstItem = {};
  var rowHasDecimal = {};
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
    var it = items[i];
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
      var agg = computeAggregate(vals, aggMode);
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
        rawText: aggText
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
    var item;
    var label = String(name || "");
    var val;

    if (!showValues) return label;

    item = itemByName[label.toLowerCase()];
    if (!item) return label;
    if (item.attrText == null || item.attrText === "") return label;

    val = formatMarkdownValue("", item.attrText, item.rawText);
    val = String(val || "").replace(/^:\s*/, "");
    if (!val) return label;

    return label + " " + val;
  }

  for (i = 0; i < items.length; i++) {
    it = items[i];
    if (!it) continue;
    rememberItem(it);

    if (isArrayValue(it.attrValue)) {
      cat = ensureCategory(it.name, it.displayName || it.name);
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

    if (!cat.children.length && !includeEmpty) continue;

    if (lines.length) lines.push("");
    lines.push(cat.displayName || cat.name);

    for (j = 0; j < cat.children.length; j++) {
      lines.push((j === cat.children.length - 1 ? lastBranch : branch) + treeChildLabel(cat.children[j]));
    }
  }

  return lines.join("  \n");
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
