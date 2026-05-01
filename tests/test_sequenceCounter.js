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
    clearOnEmpty: true
  });

  assertEquals("empty-cleared-seq", empty.field("Seq"), null);
  assertEquals("empty-cleared-spree", empty.field("Spree"), null);
}

testBulkSequenceAndSpree();
testCurrentEntryOnlyAndEmptyClear();

WScript.Echo("OK");
