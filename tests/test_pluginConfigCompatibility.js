var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var globalEntryCalls = 0;
var globalLibCalls = 0;

if (!Array.isArray) {
  Array.isArray = function(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  };
}

function read(relPath) {
  return fso.OpenTextFile(fso.BuildPath(scriptDir, "..\\" + relPath), 1).ReadAll();
}

function fail(message) {
  throw new Error(message);
}

function assertTrue(label, value) {
  if (!value) fail(label + ": expected truthy value");
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function makeEntry(values) {
  return {
    values: values || {},
    writes: [],
    field: function(name) { return this.values[name]; },
    set: function(name, value) {
      this.values[name] = value;
      this.writes.push({ name: name, value: value });
    },
    id: function() { return 1; }
  };
}

var fallbackEntry = makeEntry({});

function entry() {
  globalEntryCalls++;
  return fallbackEntry;
}

function lib() {
  globalLibCalls++;
  return {
    entries: function() { return []; },
    fields: function() { return []; }
  };
}

var modules = [
  "addons\\1_tagging\\tagPairParser.js",
  "addons\\2_syncing\\globalFieldSync.js",
  "addons\\2_syncing\\syncLastFromLatest.js",
  "addons\\2_syncing\\dustMerger.js",
  "addons\\2_syncing\\templateFieldTransfer.js",
  "addons\\3_workflow\\floatingAverage.js",
  "addons\\3_workflow\\sequenceCounter.js",
  "addons\\3_workflow\\timeMarker.js",
  "addons\\6_integration\\obsidianLinker.js",
  "addons\\6_integration\\wikiLinker.js",
  "addons\\z_generell\\multiChoiceHelpers.js",
  "addons\\z_generell\\typedTextFields.js",
  "addons\\z_others\\hourGuide.js"
];

for (var moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
  eval(read(modules[moduleIndex]));
}

var entryCallsBeforeDisabled = globalEntryCalls;
var libCallsBeforeDisabled = globalLibCalls;

applyTagPairParser({ enabled: false });
bulkApplyTagPairParser({ enabled: false });
syncFieldTo({ enabled: false });
syncFieldBack({ enabled: false });
syncFieldAll({ enabled: false });
syncLastFromLatest({ enabled: false });
dustMerge({ enabled: false });
getTemplateFieldNames({ enabled: false });
moveFilledTemplates({ enabled: false });
moveAndTrackTemplates({ enabled: false });
updateAverage({ enabled: false });
updateSequenceSpree({ enabled: false });
appendTimeMarker({ enabled: false });
cleanupTimeMarker({ enabled: false });
clearTimeMarkerRows({ enabled: false });
linkObsidianUri({ enabled: false });
formatObsidianUri({ enabled: false });
applyWikiLinker({ enabled: false });
multiChoiceAppend({ enabled: false });
multiChoiceRemove({ enabled: false });
syncTypedTextFields({ enabled: false });
applyHourGuide({ enabled: false });

assertEquals("disabled operations do not resolve global entry", globalEntryCalls, entryCallsBeforeDisabled);
assertEquals("disabled operations do not resolve global library", globalLibCalls, libCallsBeforeDisabled);

var explicitEntry = makeEntry({
  Tags: [],
  Notiz: "",
  Titel: "Beispiel",
  hours: 0
});
var explicitCallsStart = globalEntryCalls;

applyTagPairParser({ entry: explicitEntry, tagField: "Tags", targetTextField: "Notiz" });
syncFieldTo({ entry: explicitEntry, entries: [explicitEntry], fields: ["Notiz"] });
syncFieldBack({ entry: explicitEntry, entries: [explicitEntry], fields: ["Notiz"] });
syncFieldAll({ entry: explicitEntry, entries: [explicitEntry], fields: ["Notiz"] });
syncLastFromLatest({ entry: explicitEntry, entries: [explicitEntry], fields: ["Notiz"] });
assertTrue("dust merge uses entry alias", dustMerge({ entry: explicitEntry, entries: [], fieldDate: "Datum" }).sourceEntry === explicitEntry);
getTemplateFieldNames({ entry: explicitEntry, sourceField: "Notiz" });
moveFilledTemplates({ entry: explicitEntry, sourceField: "Notiz", targetField: "Record" });
updateAverage({ entry: explicitEntry, entries: [explicitEntry] });
updateSequenceSpree({ entry: explicitEntry, entries: [explicitEntry] });
appendTimeMarker({ entry: explicitEntry, targetTextField: "Notiz" });
cleanupTimeMarker({ entry: explicitEntry, targetTextField: "Notiz" });
clearTimeMarkerRows({ entry: explicitEntry, targetTextField: "Notiz" });
linkObsidianUri({ entry: explicitEntry });
formatObsidianUri({ entry: explicitEntry });
applyWikiLinker({ entry: explicitEntry, sourceTitleField: "Titel", targetField: "Wikipedia" });
multiChoiceAppend({ entry: explicitEntry, field: "Auswahl", value: "A" });
multiChoiceRemove({ entry: explicitEntry, field: "Auswahl", value: "A" });
syncTypedTextFields({ entry: explicitEntry });
applyHourGuide({ entry: explicitEntry, sourceHoursField: "hours" });

assertEquals("explicit entry alias avoids global entry", globalEntryCalls, explicitCallsStart);

var firstEntry = makeEntry({ A: "alt" });
var currentEntry = makeEntry({ A: "neu", Notiz: "1: A\n2: B" });
syncFieldBack({ entry: currentEntry, entries: [firstEntry, currentEntry], field: ["A"], overwrite: true });
assertEquals("global sync accepts field alias", firstEntry.field("A"), "neu");

var cleaned = cleanupTimeMarker({ entry: currentEntry, field: ["Notiz"] });
assertTrue("time marker accepts field array alias", cleaned && typeof cleaned.Notiz !== "undefined");

WScript.Echo("OK: plugin entry/enabled compatibility");
