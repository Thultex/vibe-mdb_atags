var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var collectorPath = fso.BuildPath(scriptDir, "..\\core_lib\\collectAtags_lib.js");
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\2_syncing\\templateFieldTransfer.js");

eval(fso.OpenTextFile(collectorPath, 1).ReadAll());
eval(fso.OpenTextFile(addonPath, 1).ReadAll());

function fail(message) {
  throw new Error(message);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) fail(label + ": expected '" + expected + "' but got '" + actual + "'");
}

function assertArray(label, actual, expected) {
  var a = actual.join("|");
  var e = expected.join("|");
  if (a !== e) fail(label + ": expected [" + e + "] but got [" + a + "]");
}

function makeEntry(fields, failField) {
  return {
    _fields: fields,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      if (name === failField) throw new Error("write blocked");
      this._fields[name] = value;
    }
  };
}

function testMovesAndResetsFilledTemplates() {
  var entryObj = makeEntry({
    Record: "MetricA:_1\nTaskA:__\nFreitext",
    Notiz: "alt"
  });
  var result = moveFilledTemplates({ entry: entryObj });

  assertEquals("move-basic-target", entryObj.field("Notiz"), "alt\nMetricA1");
  assertEquals("move-basic-source", entryObj.field("Record"), "MetricA:_\nTaskA:__\nFreitext");
  assertArray("move-basic-lines", result.moved, ["MetricA1"]);
  assertArray("move-basic-template-names", result.templateNames, ["MetricA", "TaskA"]);
  assertEquals("move-basic-changed", result.changed, true);
}

function testRowsDecimalsAndClosedSlots() {
  var entryObj = makeEntry({
    Record: "8,5: MetricA:_-1,4\n9: TaskA:_ja_",
    Notiz: ""
  });

  moveFilledTemplates({ entryObj: entryObj });

  assertEquals("row-target", entryObj.field("Notiz"), "8,5: MetricA-1,4\n9: TaskA: ja");
  assertEquals("row-source", entryObj.field("Record"), "8,5: MetricA:_\n9: TaskA:__");
}

function testCompositeTemplatesPreserveSeparators() {
  var entryObj = makeEntry({
    Record: "MetricA:_1, TaskA:__; ActivityA:_ja_",
    Notiz: ""
  });

  var result = moveFilledTemplates({ entryObj: entryObj });

  assertEquals("composite-target", entryObj.field("Notiz"), "MetricA1, ActivityA: ja");
  assertEquals("composite-source", entryObj.field("Record"), "MetricA:_, TaskA:__; ActivityA:__");
  assertArray("composite-names", result.templateNames, ["MetricA", "TaskA", "ActivityA"]);
}

function testPrependDedupeMakesRetryIdempotent() {
  var entryObj = makeEntry({ Record: "MetricA:_1", Notiz: "MetricA1\nalt" });
  var first = moveFilledTemplates({ entry: entryObj, mode: "prepend" });
  var second = moveFilledTemplates({ entry: entryObj, mode: "prepend" });

  assertEquals("dedupe-target", entryObj.field("Notiz"), "MetricA1\nalt");
  assertEquals("dedupe-source", entryObj.field("Record"), "MetricA:_");
  assertEquals("dedupe-first-source-changed", first.sourceChanged, true);
  assertEquals("dedupe-first-target-changed", first.targetChanged, false);
  assertEquals("dedupe-second-changed", second.changed, false);
}

function testReplaceKeepsIncomingLineEvenWhenAlreadyPresent() {
  var entryObj = makeEntry({ Record: "MetricA:_1", Notiz: "alt\nMetricA1" });

  moveFilledTemplates({ entry: entryObj, mode: "replace" });

  assertEquals("replace-target", entryObj.field("Notiz"), "MetricA1");
  assertEquals("replace-source", entryObj.field("Record"), "MetricA:_");
}

function testDoesNotResetSourceWhenTargetWriteFails() {
  var entryObj = makeEntry({ Record: "MetricA:_1", Notiz: "alt" }, "Notiz");
  var result = moveFilledTemplates({ entry: entryObj });

  assertEquals("failed-target-unchanged", entryObj.field("Notiz"), "alt");
  assertEquals("failed-source-not-reset", entryObj.field("Record"), "MetricA:_1");
  assertEquals("failed-target-error", result.errors.length, 1);
}

function testRowLabelCanBeAddedOrReplaced() {
  var addEntry = makeEntry({ Record: "MetricA:_1", Notiz: "" });
  var replaceEntry = makeEntry({ Record: "2: MetricA:_1", Notiz: "" });

  moveFilledTemplates({ entry: addEntry, rowLabel: "4,5" });
  moveFilledTemplates({ entry: replaceEntry, rowLabel: 7, rowMode: "replace" });

  assertEquals("row-label-added", addEntry.field("Notiz"), "4,5: MetricA1");
  assertEquals("row-label-replaced", replaceEntry.field("Notiz"), "7: MetricA1");
}

function testConvertsTemplateVariantsToNormalTags() {
  var entryObj = makeEntry({
    Record: "NegativeA:_-3\nPositiveA:_+2\nDecimalA:_-1,4\nCumulativeA:_++\nNullA:_00\nTextA:_rewre\nPhraseA:_two words_",
    Notiz: ""
  });

  moveFilledTemplates({ entry: entryObj });

  assertEquals(
    "normal-tag-variants",
    entryObj.field("Notiz"),
    "NegativeA-3\nPositiveA+2\nDecimalA-1,4\nCumulativeA++\nNullA00\nTextA: rewre\nPhraseA: \"two words\""
  );
  assertEquals(
    "normal-tag-variant-reset",
    entryObj.field("Record"),
    "NegativeA:_\nPositiveA:_\nDecimalA:_\nCumulativeA:_\nNullA:_\nTextA:_\nPhraseA:__"
  );
}

function testStringRowsGenerateLabelsFromEntryDate() {
  var entryObj = makeEntry({
    Datum: "2026-07-22 11:30",
    Record: "MetricA:_1\nTaskA:_go_",
    Notiz: "old"
  });

  moveFilledTemplates({
    entry: entryObj,
    fieldDate: "Datum",
    mode: "append",
    datatype: "string_rows"
  });

  assertEquals("generated-row-target", entryObj.field("Notiz"), "old\n11,5: MetricA1\n11,5: TaskA: go");
  assertEquals("generated-row-source", entryObj.field("Record"), "MetricA:_\nTaskA:__");
}

function testPrependRowShorthandGeneratesAndPrependsRows() {
  var entryObj = makeEntry({
    Datum: "2026-07-22 08:00",
    Record: "MetricA:_2",
    Notiz: "9: old"
  });

  moveFilledTemplates({ entry: entryObj, fieldDate: "Datum", mode: "prepend_row" });

  assertEquals("prepend-row-target", entryObj.field("Notiz"), "8: MetricA2\n9: old");
}

function testCombinedHelperAndDisabledMode() {
  var entryObj = makeEntry({ Record: "MetricA:_1", Notiz: "", record_complete: false });
  var combined = moveAndTrackTemplates({
    entry: entryObj,
    result: { items: [{ name: "MetricA", attrText: "+1", rawText: "1" }] },
    completeField: "record_complete"
  });
  var disabledEntry = makeEntry({ Record: "TaskA:_ja_", Notiz: "", record_complete: false });
  var disabled = moveAndTrackTemplates({ entry: disabledEntry, enabled: false });

  assertEquals("combined-target", entryObj.field("Notiz"), "MetricA1");
  assertEquals("combined-source", entryObj.field("Record"), "MetricA:_");
  assertEquals("combined-complete", combined.complete, true);
  assertEquals("disabled-target", disabledEntry.field("Notiz"), "");
  assertEquals("disabled-source", disabledEntry.field("Record"), "TaskA:_ja_");
  assertEquals("disabled-complete-unchanged", disabledEntry.field("record_complete"), false);
  assertEquals("disabled-changed", disabled.changed, false);
}

testMovesAndResetsFilledTemplates();
testRowsDecimalsAndClosedSlots();
testCompositeTemplatesPreserveSeparators();
testPrependDedupeMakesRetryIdempotent();
testReplaceKeepsIncomingLineEvenWhenAlreadyPresent();
testDoesNotResetSourceWhenTargetWriteFails();
testRowLabelCanBeAddedOrReplaced();
testConvertsTemplateVariantsToNormalTags();
testStringRowsGenerateLabelsFromEntryDate();
testPrependRowShorthandGeneratesAndPrependsRows();
testCombinedHelperAndDisabledMode();

WScript.Echo("OK");
