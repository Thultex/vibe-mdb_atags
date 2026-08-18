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
  var heading = '#### Funktion: `' + functionName + '()`';
  var anchorIndex = text.indexOf(anchor);
  var nextAnchorIndex;
  var section;
  var headingIndex;
  var afterHeading;

  assertTrue(fileName + " overview links " + functionName, text.indexOf('](#' + anchorName + ')') >= 0);
  assertTrue(fileName + " anchors " + functionName, anchorIndex >= 0);
  assertTrue(fileName + " heads " + functionName, text.indexOf(heading, anchorIndex) >= 0);

  nextAnchorIndex = text.indexOf('<a id="', anchorIndex + anchor.length);
  section = text.substring(anchorIndex, nextAnchorIndex >= 0 ? nextAnchorIndex : text.length);
  headingIndex = section.indexOf(heading);
  afterHeading = section.substring(headingIndex + heading.length).replace(/^\s+/, "");
  assertTrue(fileName + " starts " + functionName + " with purpose quote", /^>\s+[^\r\n]+\./.test(afterHeading));
  assertTrue(fileName + " calls " + functionName, section.indexOf(functionName + "(") >= 0);
  assertTrue(fileName + " explains parameters for " + functionName, section.indexOf("Parameter") >= 0);
  assertTrue(fileName + " has no purpose label for " + functionName, section.indexOf("Kurzbeschreibung:") < 0);
}

function assertModulePurposeQuote(text, moduleHeading, fileName) {
  var headingIndex = text.indexOf(moduleHeading);
  var afterHeading;

  assertTrue(fileName + " contains module " + moduleHeading, headingIndex >= 0);
  afterHeading = text.substring(headingIndex + moduleHeading.length).replace(/^\s+/, "");
  assertTrue(fileName + " starts module " + moduleHeading + " with purpose quote", /^>\s+[^\r\n]+\./.test(afterHeading));
}

function assertFunctionConfigOption(text, functionName, optionText, fileName) {
  var anchor = '<a id="' + String(functionName).toLowerCase() + '"></a>';
  var start = text.indexOf(anchor);
  var end;
  var section;

  assertTrue(fileName + " anchors " + functionName + " for config check", start >= 0);
  end = text.indexOf('<a id="', start + anchor.length);
  section = text.substring(start, end >= 0 ? end : text.length);
  assertTrue(fileName + " documents " + optionText + " for " + functionName, section.indexOf(optionText) >= 0);
}

function assertUsesGermanUmlauts(text, fileName) {
  var replacementWords = /\b(?:fuer|oeffentlichen|aufgefuehrt|muessen|benoetigte|uebersicht|prueft|pruefen|vollstaendigkeit|unvollstaendige|gewaehlten|ausgewaehlte|zurueck|zusaetzlich|rueckgabe|fuehrt|eintraege|unveraendert|vollstaendigen|auszufuehren|anfuegen|behaelt|gefuellte|uebersprungen|zugehoerige|geaenderten|aenderungszeit|waehlt|aelteren|zusammenfuehrt|oeffnen|oeffnet|unabhaengige|maximalzaehler|fuegt|ueberspringt|schuetzt|uebertragung|sprachabhaengige|angefuegt)\b/i;
  assertTrue(fileName + " uses real German umlauts", !replacementWords.test(text));
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
assertUsesGermanUmlauts(coreExamples, "examples.md");
assertTrue("examples.md contains collector example", coreExamples.indexOf("collectAtags({") >= 0);
assertTrue("examples.md contains cleaner example", coreExamples.indexOf("cleanTags({") >= 0);
assertTrue("examples.md links shared option values", coreExamples.indexOf("](#gemeinsame-optionswerte)") >= 0);
assertTrue("examples.md contains aggregation table", coreExamples.indexOf("| Wert | Unterstützte Aliase | Wirkung | Beispielergebnis |") >= 0);

var aggregationModes = [
  "min",
  "max",
  "max_abs",
  "min_abs",
  "max_add_abs",
  "sum",
  "avg",
  "median",
  "first",
  "last",
  "amount"
];
for (i = 0; i < aggregationModes.length; i++) {
  assertTrue(
    "examples.md lists aggregation mode " + aggregationModes[i],
    coreExamples.indexOf("| `" + aggregationModes[i] + "` |") >= 0
  );
}
assertTrue("examples.md lists add aggregation alias", coreExamples.indexOf("| `sum` | `add` |") >= 0);
assertTrue("examples.md lists count aggregation alias", coreExamples.indexOf("| `amount` | `count` |") >= 0);

var exportTargetTypes = ["tags", "text", "md", "tree_md", "rows_md", "rows_html", "json"];
for (i = 0; i < exportTargetTypes.length; i++) {
  assertTrue(
    "examples.md lists export target type " + exportTargetTypes[i],
    coreExamples.indexOf("| `" + exportTargetTypes[i] + "` |") >= 0
  );
}

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
assertTrue("export example shows normal comment default", coreExamples.indexOf("showComments: true") >= 0);
assertTrue("export example shows category comment default", coreExamples.indexOf("showCommentsCategory: false") >= 0);
assertTrue("examples document sparse comment JSON", coreExamples.indexOf("`_atagComments`") >= 0 && coreExamples.indexOf("`index`") >= 0);
assertTrue("examples document hash comments", coreExamples.indexOf("emo#3#info") >= 0);
assertTrue("examples document compact text comments", coreExamples.indexOf('emo"sfas"(info)') >= 0);
assertTrue("examples document literal comment content", coreExamples.indexOf("ED²(p1)") >= 0 && coreExamples.indexOf("ED²(p¹)") >= 0);
assertTrue("examples document tree count braces", coreExamples.indexOf("`{2}`") >= 0);
assertTrue("examples document markdown aggregate separator", coreExamples.indexOf("1 → [2, 0]") >= 0);

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

var coreModules = [
  '### #1 `collectAtags_lib.js`',
  '### #2 `exportAtags_lib.js`',
  '### #3 `helpers_lib.js`',
  '### A1 `_checkVersions.js`',
  '### A2 `helpers.js`',
  '### A3 `restoreAtags.js`',
  '### A4 `tagCleaner.js`'
];
for (i = 0; i < coreModules.length; i++) {
  assertModulePurposeQuote(coreExamples, coreModules[i], "examples.md");
}

var pluginExamples = read("examples_plugins.md");
assertOrdered(pluginExamples, ["## `1_tagging`", "## `2_syncing`", "## `3_workflow`", "## `6_integration`", "## `z_generell`", "## `z_others`"], "examples_plugins.md");
assertUsesGermanUmlauts(pluginExamples, "examples_plugins.md");
assertTrue("plugin examples contain template transfer", pluginExamples.indexOf("moveFilledTemplates({") >= 0);
assertTrue("template transfer example uses since mode", pluginExamples.indexOf('sourceMode: "realtime_since"') >= 0);
assertTrue("template transfer example uses datetime field", pluginExamples.indexOf('startDatetimeField: "Einnahmedatum"') >= 0);
assertTrue("plugin examples link shared option values", pluginExamples.indexOf("](#gemeinsame-optionswerte)") >= 0);
assertTrue("plugin examples list all source modes", /`sourceMode`:[^\r\n]*`realtime`[^\r\n]*`realtime_since`[^\r\n]*`datetime`[^\r\n]*`hours`/.test(pluginExamples));
assertTrue("plugin examples list all round modes", /`roundMode`:[^\r\n]*`round`[^\r\n]*`floor`[^\r\n]*`ceil`/.test(pluginExamples));
assertTrue("plugin examples list all insert modes", /`insertMode`:[^\r\n]*`append`[^\r\n]*`prepend`[^\r\n]*`time_block_top`/.test(pluginExamples));
assertTrue("plugin examples explain common entry option", pluginExamples.indexOf("### Gemeinsame Aufrufsteuerung") >= 0 && pluginExamples.indexOf("`entryObj`") >= 0);
assertTrue("plugin examples explain enabled option", pluginExamples.indexOf("`enabled`: `true`") >= 0);
assertTrue("plugin examples show field array alias", pluginExamples.indexOf('field: ["Field1", "Field2"]') >= 0);

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

var pluginConfigFunctions = [
  "applyTagPairParser",
  "bulkApplyTagPairParser",
  "syncFieldTo",
  "syncFieldBack",
  "syncFieldAll",
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
for (i = 0; i < pluginConfigFunctions.length; i++) {
  assertFunctionConfigOption(pluginExamples, pluginConfigFunctions[i], "enabled: true", "examples_plugins.md");
}

var pluginModules = [
  '### B2 `tagPairParser.js`',
  '### B3 `globalFieldSync.js`',
  '### B4 `syncLastFromLatest.js`',
  '### B10 `dustMerger.js`',
  '### B11 `templateFieldTransfer.js`',
  '### B5 `floatingAverage.js`',
  '### B6 `sequenceCounter.js`',
  '### B7 `timeMarker.js`',
  '### B8 `obsidianLinker.js`',
  '### B9 `wikiLinker.js`',
  '### C1 `multiChoiceHelpers.js`',
  '### C2 `typedTextFields.js`',
  '### C3 `hourGuide.js`'
];
for (i = 0; i < pluginModules.length; i++) {
  assertModulePurposeQuote(pluginExamples, pluginModules[i], "examples_plugins.md");
}

WScript.Echo("OK: module headers and centralized examples");
