var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\2_syncing\\dustMerger.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _entries = [];
var _opened = null;

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function assertArrayEquals(label, actual, expected) {
  var i;

  if (actual.length !== expected.length) {
    fail(label + ": expected length " + expected.length + " but got " + actual.length);
  }

  for (i = 0; i < actual.length; i++) {
    if (String(actual[i]) !== String(expected[i])) {
      fail(label + ": expected '" + expected.join(",") + "' but got '" + actual.join(",") + "'");
    }
  }
}

function assertSame(label, actual, expected) {
  if (actual !== expected) fail(label + ": expected same object");
}

function makeEntry(fields) {
  return {
    _fields: fields || {},
    id: fields && fields.id != null ? fields.id : null,
    _trashed: false,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    },
    trash: function() {
      this._trashed = true;
    },
    show: function() {
      _opened = this;
    }
  };
}

function lib() {
  return {
    entries: function() {
      return _entries;
    }
  };
}

function entry() {
  return _entries[0];
}

function testMergesCurrentIntoOlderEntry() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Titel: "neu",
    Notiz: "test2",
    Record: "r2",
    Tags: ["test", "neu"]
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 09:30",
    Notiz: "9,5: test1",
    Record: "9,5: r1",
    Tags: ["test"],
    "Merge Json": ""
  });
  _entries = [newer, older];
  _opened = null;

  var result = dustMerge({
    fieldDate: "Datum",
    titleField: "Titel",
    mergeJsonField: "Merge Json",
    searchLimit: 5,
    mergeWindowHours: 4,
    rowStepHours: 0.5,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" },
      { name: "Record", mode: "prepend", datatype: "string_rows" },
      { name: "Tags", mode: "append", datatype: "tag" }
    ]
  });

  assertEquals("merged", result.merged, true);
  assertSame("target", result.targetEntry, older);
  assertEquals("note", older.field("Notiz"), "9,5: test1\n11: test2");
  assertEquals("record", older.field("Record"), "11: r2\n9,5: r1");
  assertArrayEquals("tags", older.field("Tags"), ["test", "neu"]);
  assertEquals("source-trashed", newer._trashed, true);
  assertSame("opened", _opened, older);
  assertEquals("merge-json-has-title", String(older.field("Merge Json")).indexOf("\"title\":\"neu\"") >= 0, true);
}

function testDoesNotDuplicateExactRows() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "11: test2"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "11: test2"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeWindowHours: 4,
    trashMergedEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("not-merged", result.merged, false);
  assertEquals("note-unchanged", older.field("Notiz"), "11: test2");
  assertEquals("source-not-trashed", newer._trashed, false);
}

function testBlockMapStopsMergeWhenTargetFieldHasContent() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old",
    Status: "locked"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeWindowHours: 4,
    blockMap: [{ name: "Status" }],
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("blocked-merge", result.merged, false);
  assertArrayEquals("blocked-field", result.blocked, ["Status"]);
  assertEquals("note-unchanged", older.field("Notiz"), "old");
}

function testDayStartAndWindowMustMatch() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 03:00",
    Notiz: "new"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-06 23:30",
    Notiz: "old"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    dayStartHour: 4,
    mergeWindowHours: 6,
    trashMergedEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("same-dusting-day-merged", result.merged, true);
  assertEquals("note", older.field("Notiz"), "old\n3: new");
}

function testSkipFieldStopsMergeOnSourceEntry() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new",
    "Nicht mergen": true
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    skipField: "Nicht mergen",
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("skip-merge", result.merged, false);
  assertArrayEquals("skip-blocked", result.blocked, ["Nicht mergen"]);
  assertEquals("note-unchanged", older.field("Notiz"), "old");
}

function testEqualDatesUseIdAsOlderTieBreaker() {
  var newer = makeEntry({
    id: "b",
    Datum: "2026-07-07 11:00",
    Notiz: "new"
  });
  var older = makeEntry({
    id: "a",
    Datum: "2026-07-07 11:00",
    Notiz: "old"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("equal-date-merged", result.merged, true);
  assertSame("equal-date-target", result.targetEntry, older);
  assertEquals("equal-date-note", older.field("Notiz"), "old\n11: new");
}

function testTrashedSourceIsNotMerged() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old"
  });
  newer._trashed = true;
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("trashed-source-not-merged", result.merged, false);
  assertEquals("trashed-source-error", result.errors[0], "Aktueller Eintrag ist im Papierkorb");
  assertEquals("trashed-source-note-unchanged", older.field("Notiz"), "old");
}

function testTrashedTargetIsSkipped() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new"
  });
  var trashedOlder = makeEntry({
    id: "old1",
    Datum: "2026-07-07 10:30",
    Notiz: "trashed"
  });
  var activeOlder = makeEntry({
    id: "old2",
    Datum: "2026-07-07 10:00",
    Notiz: "active"
  });
  trashedOlder._trashed = true;
  _entries = [newer, trashedOlder, activeOlder];

  var result = dustMerge({
    fieldDate: "Datum",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("trashed-target-merged-active", result.merged, true);
  assertSame("trashed-target-skipped", result.targetEntry, activeOlder);
  assertEquals("trashed-target-note-unchanged", trashedOlder.field("Notiz"), "trashed");
  assertEquals("active-target-note", activeOlder.field("Notiz"), "active\n11: new");
}

function testAlreadyMergedSourceIsSkippedByMergeJson() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old",
    "Merge Json": "[{\"id\":\"new\",\"time\":\"2026-07-07T11:00:00\",\"title\":\"\",\"fields\":1}]"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeJsonField: "Merge Json",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("already-merged", result.alreadyMerged, true);
  assertEquals("already-merged-no-merge", result.merged, false);
  assertEquals("already-merged-note-unchanged", older.field("Notiz"), "old");
}

function testDebugFieldWritesStatusToSourceEntry() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new",
    Debug: ""
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old"
  });
  _entries = [newer, older];

  dustMerge({
    fieldDate: "Datum",
    debugField: "Debug",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("debug-has-version", String(newer.field("Debug")).indexOf("DustMerger v") === 0, true);
  assertEquals("debug-has-stage", String(newer.field("Debug")).indexOf("stage: merged") >= 0, true);
}

testMergesCurrentIntoOlderEntry();
testDoesNotDuplicateExactRows();
testBlockMapStopsMergeWhenTargetFieldHasContent();
testDayStartAndWindowMustMatch();
testSkipFieldStopsMergeOnSourceEntry();
testEqualDatesUseIdAsOlderTieBreaker();
testTrashedSourceIsNotMerged();
testTrashedTargetIsSkipped();
testAlreadyMergedSourceIsSkippedByMergeJson();
testDebugFieldWritesStatusToSourceEntry();

WScript.Echo("test_dustMerger ok");
