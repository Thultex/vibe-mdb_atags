var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\5_dusting-day\\dd-linker.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _currentEntry = null;
var _libs = {};
var _logs = [];

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function assertSame(label, actual, expected) {
  if (actual !== expected) fail(label + ": expected same object");
}

function makeEntry(fields) {
  return {
    _fields: fields || {},
    field: function(name) {
      if (!this._fields.hasOwnProperty(name)) throw new Error("missing field " + name);
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    }
  };
}

function makeLib(entries) {
  return {
    _entries: entries || [],
    entries: function() {
      return this._entries;
    },
    create: function(values) {
      var e = makeEntry(values);
      this._entries.push(e);
      return e;
    }
  };
}

function entry() {
  return _currentEntry;
}

function libByName(name) {
  return _libs[name];
}

function log(msg) {
  _logs.push(String(msg));
}

function reset(input, dayEntries) {
  _currentEntry = input;
  _logs = [];
  _libs = {
    DustingDay: makeLib(dayEntries || [])
  };
}

function testCreatesDayLinksSourceAndAppendsMappedFields() {
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    InNote: "erste Zeile\nzweite bleibt",
    InTag: ["müde", "stress"],
    DayLinks: null
  });

  reset(input, []);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("created", result.created, true);
  assertEquals("day-count", _libs.DustingDay.entries().length, 1);
  assertSame("source-linked", input.field("DayLinks"), result.targetEntry);
  assertEquals("outnote", result.targetEntry.field("OutNote"), "14,5: erste Zeile");
  assertEquals("outtags", result.targetEntry.field("OutTags").join(","), "müde,stress");
}

function testDoesNotDuplicateSameLineOrTags() {
  var day = makeEntry({
    Datum: "2020-02-02 14:35",
    OutNote: "14,5: erste Zeile",
    OutTags: ["müde"]
  });
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    InNote: "erste Zeile",
    InTag: ["müde", "stress"],
    DayLinks: null
  });

  reset(input, [day]);

  appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("no-duplicate-line", day.field("OutNote"), "14,5: erste Zeile");
  assertEquals("unique-tags", day.field("OutTags").join(","), "müde,stress");
}

function testSinceFirstUsesTargetDateAsZero() {
  var day = makeEntry({
    Datum: "2020-02-02 14:35",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 16:05",
    InNote: "später",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    rowMode: "sinceFirst",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertEquals("relative-row", day.field("OutNote"), "1,5: später");
}

testCreatesDayLinksSourceAndAppendsMappedFields();
testDoesNotDuplicateSameLineOrTags();
testSinceFirstUsesTargetDateAsZero();

WScript.Echo("OK");
