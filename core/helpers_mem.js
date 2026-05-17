/*
========================================
A6 Atag Helpers Mem v1.00 (sys 2.30)
========================================

Notes
- Memento entry/lib wrappers for atag libs.
- Load after core_lib helpers, collect and export libs.

========================================
*/

function getHelpersMemVersion() {
  return {
    name: "helpers_mem",
    version: "1.00",
    sysVersion: "2.30",
    path: "core/helpers_mem.js"
  };
}

function exportAtagsFromCfg(cfg, entryObj, result) {
  exportAtags({
    entryObj: entryObj,
    result: result,
    targetField: cfg.targetField,
    targetFieldType: cfg.targetFieldType,
    mergeWithExistingTags: cfg.mergeWithExistingTags,
    preserveForeignTagsField: cfg.preserveForeignTagsField,
    parserOwnedTagsField: cfg.parserOwnedTagsField,
    rowAggregateMode: cfg.rowAggregateMode,
    rowIncludeUnits: cfg.rowIncludeUnits,
    rowAggregateDecimals: cfg.rowAggregateDecimals,
    categoryAggregateMode: cfg.categoryAggregateMode,
    categoryValueMode: cfg.categoryValueMode,
    categoryRowAggregateMode: cfg.categoryRowAggregateMode,
    categoryChildAggregateMode: cfg.categoryChildAggregateMode,
    categoryAggregateDecimals: cfg.categoryAggregateDecimals,
    categoryFilter: cfg.categoryFilter,
    catFilter: cfg.catFilter,
    cat_display_values: cfg.cat_display_values,
    category_display_values: cfg.category_display_values,
    catDisplayValues: cfg.catDisplayValues,
    categoryDisplayValues: cfg.categoryDisplayValues,
    categoryValueDisplay: cfg.categoryValueDisplay,
    categoryDisplayMode: cfg.categoryDisplayMode,
    shortenTableHeaders: cfg.shortenTableHeaders,
    tableHeaderNames: cfg.tableHeaderNames,
    markdownLabelNames: cfg.markdownLabelNames,
    includeBlankTags: cfg.includeBlankTags,
    markdownGroupSeparators: cfg.markdownGroupSeparators,
    markdownGroupSeparator: cfg.markdownGroupSeparator
  });
}

function collectAtagsFromCfg(cfg, entryObj) {
  return collectAtags({
    entryObj: entryObj,
    textFields: cfg.textFields || [],
    excludeNames: cfg.excludeNames || [],
    multiAliasTargets: cfg.multiAliasTargets
  });
}

function isCfgDisabled(cfg) {
  var v = cfg ? cfg.enabled : null;
  if (v === false || v === 0) return true;
  v = String(v == null ? "" : v).toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

function isCfgCollectResultsEnabled(cfg) {
  var v = cfg ? cfg.collectResults : null;
  if (v === false || v === 0) return false;
  v = String(v == null ? "" : v).toLowerCase();
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}

function applyTags(cfg) {
  cfg = cfg || {};
  if (isCfgDisabled(cfg)) return null;

  var entryObj = cfg.entryObj || (typeof entry === "function" ? entry() : null);
  var result;

  if (!entryObj) return null;

  result = cfg.result || collectAtagsFromCfg(cfg, entryObj);
  exportAtagsFromCfg(cfg, entryObj, result);

  return result;
}

function resolveBulkResult(externalResult, entryObj, index, allEntries) {
  if (typeof externalResult === "function") return externalResult(entryObj, index, allEntries);
  if (Object.prototype.toString.call(externalResult) === "[object Array]") return externalResult[index] || null;
  if (externalResult && typeof externalResult === "object") return externalResult;
  return null;
}

function bulkApplyTags(cfg) {
  cfg = cfg || {};
  if (isCfgDisabled(cfg)) return isCfgCollectResultsEnabled(cfg) ? [] : null;
  if (typeof lib !== "function") return isCfgCollectResultsEnabled(cfg) ? [] : null;

  var all = lib().entries();
  var externalResult = cfg.result;
  var collectResults = isCfgCollectResultsEnabled(cfg);
  var results = collectResults ? [] : null;
  var i;
  var e;
  var result;

  for (i = 0; i < all.length; i++) {
    e = all[i];
    result = resolveBulkResult(externalResult, e, i, all);

    if (!result) result = collectAtagsFromCfg(cfg, e);
    if (collectResults) results.push(result);
    exportAtagsFromCfg(cfg, e, result);
  }

  return results;
}

function bulkExportAtags(cfg) {
  return bulkApplyTags(cfg);
}
