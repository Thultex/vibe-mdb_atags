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
  assertEquals("source-stop-written", String(newer.field("Merge Json")).indexOf("\"stop\":true") >= 0, true);
  assertEquals("source-stop-target", String(newer.field("Merge Json")).indexOf("\"mergedIntoId\":\"old\"") >= 0, true);
  assertEquals("source-stop-trash-attempted", String(newer.field("Merge Json")).indexOf("\"trashAttempted\":true") >= 0, true);
  assertEquals("source-stop-trashed", String(newer.field("Merge Json")).indexOf("\"trashed\":true") >= 0, true);
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

function testDoesNotMergeEmptyTemplateRows() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "1: Mal_sehen:__\nMal_sehen:__\nText:_ja_"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
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

  assertEquals("empty-template-merged", result.merged, true);
  assertEquals("empty-template-note", older.field("Notiz"), "old\n11: Text:_ja_");
}

function testRealtimeSinceRowsAreShiftedToTargetDate() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "0: start\n0,5: next"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 09:30",
    Notiz: "9,5: old"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    rowSourceMode: "realtime_since",
    rowStepHours: 0.5,
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("relative-row-merged", result.merged, true);
  assertEquals("relative-row-note", older.field("Notiz"), "9,5: old\n1,5: start\n2: next");
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

function testPreviousDayGraceCanMergeAcrossMidnight() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-08 00:15",
    Notiz: "new"
  });
  var tooOld = makeEntry({
    id: "old1",
    Datum: "2026-07-07 19:15",
    Notiz: "too old"
  });
  var older = makeEntry({
    id: "old2",
    Datum: "2026-07-07 20:29",
    Notiz: "old"
  });
  _entries = [newer, tooOld, older];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeWindowHours: 4,
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("midnight-grace-merged", result.merged, true);
  assertSame("midnight-grace-target", result.targetEntry, older);
  assertEquals("midnight-grace-note", older.field("Notiz"), "old\n0,5: new");
  assertEquals("midnight-grace-too-old-unchanged", tooOld.field("Notiz"), "too old");
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

function testSourceStopJsonSkipsCurrentEntry() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new",
    "Merge Json": "[{\"id\":\"new\",\"time\":\"2026-07-07T11:00:00\",\"title\":\"\",\"fields\":1,\"stop\":true,\"mergedIntoId\":\"old\"}]"
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeJsonField: "Merge Json",
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("source-stop-not-merged", result.merged, false);
  assertEquals("source-stop-flag", result.sourceStopped, true);
  assertEquals("source-stop-note-unchanged", older.field("Notiz"), "old");
}

function testStoppedCandidateDoesNotCountAgainstSearchLimit() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "new"
  });
  var stoppedOlder = makeEntry({
    id: "old1",
    Datum: "2026-07-07 10:30",
    Notiz: "stopped",
    "Merge Json": "[{\"id\":\"old1\",\"time\":\"2026-07-07T10:30:00\",\"title\":\"\",\"fields\":1,\"stop\":true,\"mergedIntoId\":\"older\"}]"
  });
  var activeOlder = makeEntry({
    id: "old2",
    Datum: "2026-07-07 10:00",
    Notiz: "active"
  });
  _entries = [newer, stoppedOlder, activeOlder];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeJsonField: "Merge Json",
    searchLimit: 1,
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("stopped-target-merged-active", result.merged, true);
  assertSame("stopped-target-skipped", result.targetEntry, activeOlder);
  assertEquals("stopped-target-note-unchanged", stoppedOlder.field("Notiz"), "stopped");
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

function testForceMergeFieldIgnoresAlreadyMergedJson() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "newer text",
    "Merge Json": "[{\"id\":\"new\",\"time\":\"2026-07-07T11:00:00\",\"title\":\"\",\"fields\":1,\"stop\":true,\"mergedIntoId\":\"old\"}]",
    "Merge erzwingen": true
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
    forceMergeField: "Merge erzwingen",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("force-merge-enabled", result.forceMerge, true);
  assertEquals("force-merge-not-already", result.alreadyMerged, false);
  assertEquals("force-merge-not-stopped", result.sourceStopped, false);
  assertEquals("force-merge-merged", result.merged, true);
  assertEquals("force-merge-note", older.field("Notiz"), "old\n11: newer text");
}

function testForceMergeFieldAppendsExistingRowsAgain() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-07 11:00",
    Notiz: "11: nochmal",
    "Merge Json": "[{\"id\":\"new\",\"time\":\"2026-07-07T11:00:00\",\"title\":\"\",\"fields\":1,\"stop\":true,\"mergedIntoId\":\"old\"}]",
    "Merge erzwingen": true
  });
  var older = makeEntry({
    id: "old",
    Datum: "2026-07-07 10:00",
    Notiz: "old\n11: nochmal",
    "Merge Json": "[{\"id\":\"new\",\"time\":\"2026-07-07T11:00:00\",\"title\":\"\",\"fields\":1}]"
  });
  _entries = [newer, older];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeJsonField: "Merge Json",
    forceMergeField: "Merge erzwingen",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("force-existing-row-merged", result.merged, true);
  assertEquals("force-existing-row-note", older.field("Notiz"), "old\n11: nochmal\n11: nochmal");
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

function testNoTargetWritesSourceAttemptStatus() {
  var newer = makeEntry({
    id: "new",
    Datum: "2026-07-08 00:15",
    Notiz: "new",
    "Merge Json": ""
  });
  _entries = [newer];

  var result = dustMerge({
    fieldDate: "Datum",
    mergeJsonField: "Merge Json",
    trashMergedEntry: false,
    openTargetEntry: false,
    map: [
      { name: "Notiz", mode: "append", datatype: "string_rows" }
    ]
  });

  assertEquals("no-target-not-merged", result.merged, false);
  assertEquals("no-target-status", String(newer.field("Merge Json")).indexOf("\"status\":\"no_target\"") >= 0, true);
  assertEquals("no-target-not-stop", String(newer.field("Merge Json")).indexOf("\"stop\":true") < 0, true);
}

testMergesCurrentIntoOlderEntry();
testDoesNotDuplicateExactRows();
testDoesNotMergeEmptyTemplateRows();
testRealtimeSinceRowsAreShiftedToTargetDate();
testBlockMapStopsMergeWhenTargetFieldHasContent();
testDayStartAndWindowMustMatch();
testPreviousDayGraceCanMergeAcrossMidnight();
testSkipFieldStopsMergeOnSourceEntry();
testEqualDatesUseIdAsOlderTieBreaker();
testSourceStopJsonSkipsCurrentEntry();
testStoppedCandidateDoesNotCountAgainstSearchLimit();
testAlreadyMergedSourceIsSkippedByMergeJson();
testForceMergeFieldIgnoresAlreadyMergedJson();
testForceMergeFieldAppendsExistingRowsAgain();
testDebugFieldWritesStatusToSourceEntry();
testNoTargetWritesSourceAttemptStatus();

WScript.Echo("test_dustMerger ok");
