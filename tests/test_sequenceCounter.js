var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\3_workflow\\sequenceCounter.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function makeEntry(id, fields) {
  return {
    id: id,
    _fields: fields,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    }
  };
}

function makeFunctionIdEntry(id, fields) {
  var e = makeEntry(id, fields);
  e.id = function() {
    return id;
  };
  return e;
}

function testBulkSequenceAndSpree() {
  var entries = [
    makeEntry("1", { Date: "2026-04-01", Dose: "10" }),
    makeEntry("2", { Date: "2026-04-02", Dose: "10" }),
    makeEntry("3", { Date: "2026-04-03", Dose: "20" }),
    makeEntry("4", { Date: "2026-04-04", Dose: "10" })
  ];

  updateSequenceSpree({
    entries: entries,
    fieldDate: "Date",
    groupFields: ["Dose"],
    fieldSequence: "Seq",
    fieldSpree: "Spree",
    fieldSequenceMax: "SeqMax",
    fieldSpreeMax: "SpreeMax"
  });

  assertEquals("entry-1-seq", entries[0].field("Seq"), 1);
  assertEquals("entry-1-spree", entries[0].field("Spree"), 1);
  assertEquals("entry-1-spree-max", entries[0].field("SpreeMax"), 2);
  assertEquals("entry-2-seq", entries[1].field("Seq"), 1);
  assertEquals("entry-2-spree", entries[1].field("Spree"), 2);
  assertEquals("entry-3-seq", entries[2].field("Seq"), 2);
  assertEquals("entry-4-seq", entries[3].field("Seq"), 3);
  assertEquals("sequence-max", entries[3].field("SeqMax"), 3);
}

function testBiasedSpreeMarksFirstEntries() {
  var entries = [
    makeEntry("1", { Date: "2026-04-01", Dose: "10" }),
    makeEntry("2", { Date: "2026-04-02", Dose: "10" }),
    makeEntry("3", { Date: "2026-04-03", Dose: "10" }),
    makeEntry("4", { Date: "2026-04-04", Dose: "20" })
  ];

  updateSequenceSpree({
    entries: entries,
    fieldDate: "Date",
    groupFields: ["Dose"],
    fieldSpree: "Spree",
    fieldBiasedSpree: "Biased",
    biasedSpreeCount: 2
  });

  assertEquals("biased-spree-first", entries[0].field("Biased"), true);
  assertEquals("biased-spree-second", entries[1].field("Biased"), true);
  assertEquals("biased-spree-third", entries[2].field("Biased"), false);
  assertEquals("biased-spree-new-block", entries[3].field("Biased"), true);
}

function testExplicitZeroRefreshesSkippedBiasedSpreeFlags() {
  var current = makeEntry("2", { Date: "2026-04-02", Dose: "10", Biased: true });
  var entries = [
    makeEntry("1", { Date: "2026-04-01", Dose: "10", Biased: true }),
    current,
    makeEntry("3", { Date: "2026-04-03", Dose: "10", Biased: true })
  ];

  updateSequenceSpree({
    entries: entries,
    currentEntry: current,
    fieldDate: "Date",
    groupFields: ["Dose"],
    fieldSpree: "Spree",
    fieldBiasedSpree: "Biased",
    biasedSpreeCount: 0
  });

  assertEquals("biased-zero-refreshes-previous", entries[0].field("Biased"), false);
  assertEquals("biased-zero-refreshes-current", current.field("Biased"), false);
  assertEquals("biased-zero-refreshes-next", entries[2].field("Biased"), false);
  assertEquals("biased-zero-keeps-other-fields-skipped", entries[0].field("Spree"), undefined);
}

function testCurrentEntryOnlyAndEmptyClear() {
  var current = makeEntry("2", { Date: "2026-04-02", Dose: "10" });
  var empty = makeEntry("3", { Date: "2026-04-03", Dose: "", Seq: "old", Spree: "old" });
  var entries = [
    makeEntry("1", { Date: "2026-04-01", Dose: "10" }),
    current,
    empty
  ];

  updateSequenceSpree({
    entries: entries,
    currentEntry: current,
    fieldDate: "Date",
    groupFields: ["Dose"],
    fieldSequence: "Seq",
    fieldSpree: "Spree",
    fieldSequenceMax: "SeqMax",
    fieldSpreeMax: "SpreeMax"
  });

  assertEquals("current-seq", current.field("Seq"), 1);
  assertEquals("current-spree", current.field("Spree"), 2);
  assertEquals("other-not-written", entries[0].field("Seq"), undefined);
  assertEquals("empty-not-cleared-when-not-current", empty.field("Seq"), "old");

  updateSequenceSpree({
    entries: entries,
    currentEntry: empty,
    fieldDate: "Date",
    groupFields: ["Dose"],
    fieldSequence: "Seq",
    fieldSpree: "Spree",
    fieldBiasedSpree: "Biased",
    biasedSpreeCount: 1,
    clearOnEmpty: true
  });

  assertEquals("empty-cleared-seq", empty.field("Seq"), null);
  assertEquals("empty-cleared-spree", empty.field("Spree"), null);
  assertEquals("empty-cleared-biased", empty.field("Biased"), null);
}

function testIssue25SingleCurrentEntryWithoutSequenceMax() {
  var current = makeFunctionIdEntry("1", {
    Einnahmedatum: "2026-04-01",
    Dosis: "10"
  });

  updateSequenceSpree({
    entries: [current],
    currentEntry: current,
    fieldDate: "Einnahmedatum",
    groupFields: ["Dosis"],
    fieldSequence: "Reihe",
    fieldSpree: "Spree",
    fieldSpreeMax: "Spree Max"
  });

  assertEquals("issue-25-sequence", current.field("Reihe"), 1);
  assertEquals("issue-25-spree", current.field("Spree"), 1);
  assertEquals("issue-25-spree-max", current.field("Spree Max"), 1);
}

function testCurrentEntryContinuesLatestSequenceWhenMissingFromEntries() {
  var current = makeFunctionIdEntry("3", {
    Einnahmedatum: "2026-04-03",
    Dosis: "10"
  });
  var entries = [
    makeFunctionIdEntry("1", { Einnahmedatum: "2026-04-01", Dosis: "10" }),
    makeFunctionIdEntry("2", { Einnahmedatum: "2026-04-02", Dosis: "10" })
  ];

  updateSequenceSpree({
    entries: entries,
    currentEntry: current,
    fieldDate: "Einnahmedatum",
    groupFields: ["Dosis"],
    fieldSequence: "Reihe",
    fieldSpree: "Spree",
    fieldSequenceMax: "Reihe Max",
    fieldSpreeMax: "Spree Max"
  });

  assertEquals("current-missing-continues-sequence", current.field("Reihe"), 1);
  assertEquals("current-missing-continues-spree", current.field("Spree"), 3);
  assertEquals("current-missing-spree-max", current.field("Spree Max"), 3);
  assertEquals("previous-not-written", entries[0].field("Reihe"), undefined);
}

function testCurrentEntryReplacesStaleEntryFromLibEntries() {
  var stale = makeFunctionIdEntry("2", {
    Einnahmedatum: "2026-04-02",
    Dosis: "20"
  });
  var current = makeFunctionIdEntry("2", {
    Einnahmedatum: "2026-04-02",
    Dosis: "10"
  });
  var entries = [
    makeFunctionIdEntry("1", { Einnahmedatum: "2026-04-01", Dosis: "10" }),
    stale
  ];

  updateSequenceSpree({
    entries: entries,
    currentEntry: current,
    fieldDate: "Einnahmedatum",
    groupFields: ["Dosis"],
    fieldSequence: "Reihe",
    fieldSpree: "Spree",
    fieldSpreeMax: "Spree Max"
  });

  assertEquals("current-replaces-stale-sequence", current.field("Reihe"), 1);
  assertEquals("current-replaces-stale-spree", current.field("Spree"), 2);
  assertEquals("stale-entry-not-written", stale.field("Reihe"), undefined);
}

testBulkSequenceAndSpree();
testBiasedSpreeMarksFirstEntries();
testExplicitZeroRefreshesSkippedBiasedSpreeFlags();
testCurrentEntryOnlyAndEmptyClear();
testIssue25SingleCurrentEntryWithoutSequenceMax();
testCurrentEntryContinuesLatestSequenceWhenMissingFromEntries();
testCurrentEntryReplacesStaleEntryFromLibEntries();

WScript.Echo("OK");
