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

function makeEntry(fields) {
  return {
    _fields: fields,
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

testCopiesLatestPreviousEntry();
testMapAndOnlyIfEmpty();

WScript.Echo("OK");
