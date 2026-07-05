var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\2_syncing\\syncLastFromLatest.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _entries = [];

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
  if (actual !== expected) {
    fail(label + ": expected same object");
  }
}

function makeEntry(fields) {
  return {
    _fields: fields,
    id: fields && fields.id != null ? fields.id : null,
    modifiedTime: fields && fields.modifiedTime != null ? fields.modifiedTime : null,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
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

function testCopiesLatestPreviousEntry() {
  var current = makeEntry({ Einnahmedatum: "2026-04-03", Dosis: "" });
  _entries = [
    current,
    makeEntry({ Einnahmedatum: "2026-04-01", Dosis: "10" }),
    makeEntry({ Einnahmedatum: "2026-04-02", Dosis: "20" })
  ];

  var result = syncLastFromLatest({
    fields: ["Dosis"],
    fieldDate: "Einnahmedatum"
  });

  assertEquals("latest-value", current.field("Dosis"), "20");
  assertArrayEquals("latest-updated", result.updated, ["Dosis"]);
}

function testMapAndOnlyIfEmpty() {
  var current = makeEntry({ Einnahmedatum: "2026-04-03", Dosis: "keep", Wirkstoff: "" });
  _entries = [
    current,
    makeEntry({ Einnahmedatum: "2026-04-02", WS: "ABC", SourceDose: "30" })
  ];

  var result = syncLastFromLatest({
    fieldDate: "Einnahmedatum",
    onlyIfEmpty: true,
    map: {
      Dosis: "SourceDose",
      Wirkstoff: "WS"
    }
  });

  assertEquals("only-empty-keeps-target", current.field("Dosis"), "keep");
  assertEquals("map-updates-empty", current.field("Wirkstoff"), "ABC");
  assertArrayEquals("map-updated", result.updated, ["Wirkstoff"]);
  assertArrayEquals("map-skipped", result.skipped, ["Dosis"]);
}

function testSyncWithoutDateFieldUsesNewestLibraryEntry() {
  var current = makeEntry({ Dosis: "" });
  var newest = makeEntry({ Dosis: "20" });
  var older = makeEntry({ Dosis: "10" });
  _entries = [current, newest, older];

  var result = syncLastFromLatest({
    fields: ["Dosis"]
  });

  assertEquals("no-date-newest-value", current.field("Dosis"), "20");
  assertSame("no-date-source-entry", result.sourceEntry, newest);
}

function testDateFieldScanDefaultsCanBeLimited() {
  var current = makeEntry({ Einnahmedatum: "2026-04-04", Dosis: "" });
  var inRange = makeEntry({ Einnahmedatum: "2026-04-01", Dosis: "10" });
  var ignoredNewer = makeEntry({ Einnahmedatum: "2026-04-03", Dosis: "30" });
  _entries = [current, inRange, makeEntry({ Einnahmedatum: "2026-04-02", Dosis: "20" }), ignoredNewer];

  var result = syncLastFromLatest({
    fieldDate: "Einnahmedatum",
    maxEntries: 3,
    fields: ["Dosis"]
  });

  assertEquals("date-max-entries-value", current.field("Dosis"), "20");
}

function testDateFieldMaxEntriesZeroUsesNewestEntry() {
  var current = makeEntry({ Einnahmedatum: "2026-04-04", Dosis: "" });
  var newest = makeEntry({ Einnahmedatum: "2026-04-01", Dosis: "10" });
  var newerByDate = makeEntry({ Einnahmedatum: "2026-04-03", Dosis: "30" });
  _entries = [current, newest, newerByDate];

  var result = syncLastFromLatest({
    fieldDate: "Einnahmedatum",
    maxEntries: 0,
    fields: ["Dosis"]
  });

  assertEquals("date-zero-newest-value", current.field("Dosis"), "10");
  assertSame("date-zero-newest-source", result.sourceEntry, newest);
}

function testDateFieldMaxEntriesMinusOneScansAll() {
  var current = makeEntry({ Einnahmedatum: "2026-04-04", Dosis: "" });
  var inRange = makeEntry({ Einnahmedatum: "2026-04-01", Dosis: "10" });
  var later = makeEntry({ Einnahmedatum: "2026-04-03", Dosis: "30" });
  _entries = [current, inRange, makeEntry({ Einnahmedatum: "2026-04-02", Dosis: "" }), later];

  var result = syncLastFromLatest({
    fieldDate: "Einnahmedatum",
    maxEntries: -1,
    fields: ["Dosis"]
  });

  assertEquals("date-minus-one-value", current.field("Dosis"), "30");
  assertSame("date-minus-one-source", result.sourceEntry, later);
}

function testFindNewestEntryUsesModifiedTimeAndIdFallback() {
  var old = makeEntry({ id: 1, modifiedTime: 100, Name: "old" });
  var sameTimeLowerId = makeEntry({ id: 2, modifiedTime: 200, Name: "lower" });
  var newest = makeEntry({ id: 3, modifiedTime: 200, Name: "newest" });

  var result = findNewestEntry([old, newest, sameTimeLowerId]);

  assertSame("newest-entry", result, newest);
}

function testFindNewestEntryMaxScanCanTradePrecisionForSpeed() {
  var first = makeEntry({ id: 1, modifiedTime: 100, Name: "first" });
  var later = makeEntry({ id: 2, modifiedTime: 300, Name: "later" });

  var result = findNewestEntry([first, later], { maxScan: 1 });

  assertSame("max-scan-first-only", result, first);
}

function testGetNewestLibraryEntryDefaultsToFirstEntry() {
  var first = makeEntry({ id: 1, modifiedTime: 100, Name: "first" });
  var modifiedLater = makeEntry({ id: 2, modifiedTime: 300, Name: "modified" });
  _entries = [first, modifiedLater];

  assertSame("newest-default-first", getNewestLibraryEntry(), first);
  assertSame("newest-modified-mode", getNewestLibraryEntry({ mode: "modified" }), modifiedLater);
}

function testClearTemplateSlotsWhenCopyingLatestValue() {
  var current = makeEntry({ Datum: "2026-07-05", Record: "" });
  var previous = makeEntry({
    Datum: "2026-07-04",
    Record: "Laufen:_2 km_\nLaufen::__\nLaufen#_warm_\nLaufen::_ja_\nNotiz_normal_bleibt"
  });
  _entries = [current, previous];

  var result = syncLastFromLatest({
    fields: ["Record"],
    fieldDate: "Datum",
    clearTemplateSlots: true
  });

  assertEquals("clear-template-slots-record", current.field("Record"), "Laufen:__\nLaufen::__\nLaufen#__\nLaufen::__\nNotiz_normal_bleibt");
  assertArrayEquals("clear-template-slots-updated", result.updated, ["Record"]);
}

function testTemplateSlotsCanUseCustomMarker() {
  var current = makeEntry({ Datum: "2026-07-05", Record: "" });
  var previous = makeEntry({
    Datum: "2026-07-04",
    Record: "Laufen:~2 km~\nLaufen#~warm~\nLaufen:_bleibt_"
  });
  _entries = [current, previous];

  syncLastFromLatest({
    fields: ["Record"],
    fieldDate: "Datum",
    clearTemplateSlots: true,
    templateSlotMarker: "~"
  });

  assertEquals("custom-template-slot-marker", current.field("Record"), "Laufen:~~\nLaufen#~~\nLaufen:_bleibt_");
}

testCopiesLatestPreviousEntry();
testMapAndOnlyIfEmpty();
testSyncWithoutDateFieldUsesNewestLibraryEntry();
testDateFieldScanDefaultsCanBeLimited();
testDateFieldMaxEntriesZeroUsesNewestEntry();
testDateFieldMaxEntriesMinusOneScansAll();
testFindNewestEntryUsesModifiedTimeAndIdFallback();
testFindNewestEntryMaxScanCanTradePrecisionForSpeed();
testGetNewestLibraryEntryDefaultsToFirstEntry();
testClearTemplateSlotsWhenCopyingLatestValue();
testTemplateSlotsCanUseCustomMarker();

WScript.Echo("OK");
