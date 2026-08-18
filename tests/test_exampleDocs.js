var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var repoDir = fso.GetParentFolderName(scriptDir);

function fail(message) {
  throw new Error(message);
}

function assertTrue(label, value) {
  if (!value) fail(label + ": expected truthy value");
}

function read(relPath) {
  return fso.OpenTextFile(fso.BuildPath(repoDir, relPath), 1).ReadAll();
}

function assertOrdered(text, labels, fileName) {
  var lastIndex = -1;
  var i;
  var index;
  for (i = 0; i < labels.length; i++) {
    index = text.indexOf(labels[i]);
    assertTrue(fileName + " contains " + labels[i], index >= 0);
    assertTrue(fileName + " orders " + labels[i], index > lastIndex);
    lastIndex = index;
  }
}

function assertFunctionExample(text, functionName, fileName) {
  var anchorName = String(functionName).toLowerCase();
  var anchor = '<a id="' + anchorName + '"></a>';
  var anchorIndex = text.indexOf(anchor);
  var nextAnchorIndex;
  var section;

  assertTrue(fileName + " overview links " + functionName, text.indexOf('](#' + anchorName + ')') >= 0);
  assertTrue(fileName + " anchors " + functionName, anchorIndex >= 0);
  assertTrue(fileName + " heads " + functionName, text.indexOf('#### `' + functionName + '()`', anchorIndex) >= 0);

  nextAnchorIndex = text.indexOf('<a id="', anchorIndex + anchor.length);
  section = text.substring(anchorIndex, nextAnchorIndex >= 0 ? nextAnchorIndex : text.length);
  assertTrue(fileName + " calls " + functionName, section.indexOf(functionName + "(") >= 0);
  assertTrue(fileName + " explains parameters for " + functionName, section.indexOf("Parameter") >= 0);
}

var modules = [
  ["core\\_checkVersions.js", "A1"],
  ["core\\helpers.js", "A2"],
  ["core\\restoreAtags.js", "A3"],
  ["core\\tagCleaner.js", "A4"],
  ["core_lib\\collectAtags_lib.js", "#1"],
  ["core_lib\\exportAtags_lib.js", "#2"],
  ["core_lib\\helpers_lib.js", "#3"],
  ["addons\\1_tagging\\tagPairParser.js", "B2"],
  ["addons\\2_syncing\\globalFieldSync.js", "B3"],
  ["addons\\2_syncing\\syncLastFromLatest.js", "B4"],
  ["addons\\2_syncing\\dustMerger.js", "B10"],
  ["addons\\2_syncing\\templateFieldTransfer.js", "B11"],
  ["addons\\3_workflow\\floatingAverage.js", "B5"],
  ["addons\\3_workflow\\sequenceCounter.js", "B6"],
  ["addons\\3_workflow\\timeMarker.js", "B7"],
  ["addons\\6_integration\\obsidianLinker.js", "B8"],
  ["addons\\6_integration\\wikiLinker.js", "B9"],
  ["addons\\z_generell\\multiChoiceHelpers.js", "C1"],
  ["addons\\z_generell\\typedTextFields.js", "C2"],
  ["addons\\z_others\\hourGuide.js", "C3"]
];

var forbiddenHeaderText = /\b(?:Changes|Notes|Usage|Examples|Aenderungen|Anwendung|Beispiele)\b/i;
var i;
var source;
var headerEnd;
var header;
var afterHeader;

for (i = 0; i < modules.length; i++) {
  source = read(modules[i][0]);
  headerEnd = source.indexOf("*/");
  assertTrue(modules[i][0] + " has header end", headerEnd >= 0);
  header = source.substring(0, headerEnd + 2);
  assertTrue(modules[i][0] + " starts with compact header", /^\/\*\r?\n={40}\r?\n/.test(header));
  assertTrue(modules[i][0] + " has module id", header.indexOf("\n" + modules[i][1] + " ") >= 0);
  assertTrue(modules[i][0] + " has sys 3.00", / v\d+\.\d+ \(sys 3\.00\)\r?\n={40}\r?\n\*\/$/.test(header));
  assertTrue(modules[i][0] + " has no embedded docs", !forbiddenHeaderText.test(header));
  afterHeader = source.substring(headerEnd + 2).replace(/^\s+/, "");
  assertTrue(modules[i][0] + " has no duplicate copy header", afterHeader.indexOf("/*") !== 0);
}

var coreExamples = read("examples.md");
assertOrdered(coreExamples, ["## `core_lib`", "### #1", "### #2", "### #3", "## `core`", "### A1", "### A2", "### A3", "### A4"], "examples.md");
assertTrue("examples.md contains collector example", coreExamples.indexOf("collectAtags({") >= 0);
assertTrue("examples.md contains cleaner example", coreExamples.indexOf("cleanTags({") >= 0);

var aggregationExampleOptions = [
  "valueMode:",
  "rowAggregateMode:",
  "rowAggregateDecimals:",
  "categoryRowAggregateMode:",
  "categoryChildAggregateMode:",
  "categoryChildValueMode:",
  "categoryAggregateMode:",
  "categoryValueMode:",
  "categoryAggregateDecimals:"
];
for (i = 0; i < aggregationExampleOptions.length; i++) {
  assertTrue(
    "examples.md contains aggregation option " + aggregationExampleOptions[i],
    coreExamples.indexOf(aggregationExampleOptions[i]) >= 0
  );
}
assertTrue("markdown example shows avg category default", coreExamples.indexOf('categoryAggregateMode: "avg"') >= 0);
assertTrue("tree example shows max_add_abs category default", coreExamples.indexOf('categoryValueMode: "max_add_abs"') >= 0);
assertTrue("restore example shows max_add_abs category default", coreExamples.indexOf('categoryAggregateMode: "max_add_abs"') >= 0);

var corePublicFunctions = [
  "collectAtags",
  "trackTagsComplete",
  "exportAtags",
  "computeAggregate",
  "getLibsVersionsConfig",
  "checkLibVersions",
  "checkAtagLibVersions",
  "applyTags",
  "bulkApplyTags",
  "bulkExportAtags",
  "restoreAtags",
  "bulkRestoreAtags",
  "cleanTags",
  "cleanTemplateTags"
];
for (i = 0; i < corePublicFunctions.length; i++) {
  assertFunctionExample(coreExamples, corePublicFunctions[i], "examples.md");
}

var pluginExamples = read("examples_plugins.md");
assertOrdered(pluginExamples, ["## `1_tagging`", "## `2_syncing`", "## `3_workflow`", "## `6_integration`", "## `z_generell`", "## `z_others`"], "examples_plugins.md");
assertTrue("plugin examples contain template transfer", pluginExamples.indexOf("moveFilledTemplates({") >= 0);
assertTrue("template transfer example uses since mode", pluginExamples.indexOf('sourceMode: "realtime_since"') >= 0);
assertTrue("template transfer example uses datetime field", pluginExamples.indexOf('startDatetimeField: "Einnahmedatum"') >= 0);

var pluginPublicFunctions = [
  "applyTagPairParser",
  "bulkApplyTagPairParser",
  "syncFieldTo",
  "syncFieldBack",
  "syncFieldAll",
  "findNewestEntry",
  "getNewestLibraryEntry",
  "syncLastFromLatest",
  "dustMerge",
  "dustMerger",
  "getTemplateFieldNames",
  "moveFilledTemplates",
  "moveAndTrackTemplates",
  "updateAverage",
  "updateSequenceSpree",
  "appendTimeMarker",
  "cleanupTimeMarker",
  "clearTimeMarkerRows",
  "linkObsidianUri",
  "formatObsidianUri",
  "applyWikiLinker",
  "multiChoiceAppend",
  "multiChoiceRemove",
  "syncTypedTextFields",
  "applyHourGuide"
];
for (i = 0; i < pluginPublicFunctions.length; i++) {
  assertFunctionExample(pluginExamples, pluginPublicFunctions[i], "examples_plugins.md");
}

WScript.Echo("OK: module headers and centralized examples");
