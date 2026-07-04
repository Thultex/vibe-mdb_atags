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
    _recalcCount: 0,
    field: function(name) {
      if (!this._fields.hasOwnProperty(name)) throw new Error("missing field " + name);
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    },
    recalc: function() {
      this._recalcCount++;
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

function makeIteratorLib(entries) {
  return {
    _entries: entries || [],
    entries: function() {
      var i = 0;
      var items = this._entries;
      return {
        next: function() {
          if (i >= items.length) return { done: true };
          return { done: false, value: items[i++] };
        }
      };
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
    DustingDay: makeLib(dayEntries || []),
    DustingInput: makeLib([])
  };
}

function resetWithLibs(current, libs) {
  _currentEntry = current;
  _logs = [];
  _libs = libs;
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

function testWrongTargetDateFieldOnlyBlocksInStrictMode() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    InNote: "nicht erstellen",
    InTag: [],
    DayLinks: null,
    Debug: ""
  });

  reset(input, [day]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "WrongDate",
    sourceDayLinkField: "DayLinks",
    sourceDebugField: "Debug",
    strictTargetValidation: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertEquals("wrong-date-no-create", result.created, false);
  assertEquals("wrong-date-day-count", _libs.DustingDay.entries().length, 1);
  assertEquals("wrong-date-error", input.field("Debug").indexOf("Ziel-Datumsfeld fehlt") >= 0, true);
}

function testNonStrictTargetDateFieldAllowsCreate() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 14:35",
    InNote: "erstellen erlaubt",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertEquals("non-strict-create", result.created, true);
  assertEquals("non-strict-day-count", _libs.DustingDay.entries().length, 2);
}

function testNewInputAddsMissingTagsToExistingDay() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: ["müde"]
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "",
    InTag: ["müde", "erfolg"],
    DayLinks: null
  });

  reset(input, [day]);

  appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("new-input-tags-merged", day.field("OutTags").join(","), "müde,erfolg");
}

function testReusesExistingSourceDayLinkBeforeDateSearch() {
  var linkedDay = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var otherDay = makeEntry({
    Datum: "2020-02-03 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 10:00",
    InNote: "nutzt link",
    InTag: [],
    DayLinks: linkedDay
  });

  reset(input, [linkedDay, otherDay]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertSame("reuse-existing-link-target", result.targetEntry, linkedDay);
  assertEquals("reuse-existing-link-no-create", result.created, false);
  assertEquals("reuse-existing-link-outnote", linkedDay.field("OutNote"), "10: nutzt link");
}

function testRecalcSourceAndTargetWhenConfigured() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "gleiches datum",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    recalcSource: true,
    recalcTarget: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertEquals("recalc-target", day._recalcCount, 1);
  assertEquals("recalc-source", input._recalcCount, 1);
  assertEquals("recalc-result", result.recalculated.join(","), "target,source");
}

function testDebugDayLinkerAccessWritesDiagnostics() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    Debug: ""
  });

  reset(input, [day]);

  debugDayLinkerAccess({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDebugField: "Debug"
  });

  if (String(input.field("Debug")).indexOf("DEBUG Dusting Day Linker") !== 0) {
    fail("debug-linker-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("target entries: 1") < 0) {
    fail("debug-linker-entry-count missing");
  }
}

function testFindsExistingDayFromIteratorEntries() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "iterator day",
    InTag: [],
    DayLinks: null
  });

  resetWithLibs(input, {
    DustingDay: makeIteratorLib([day])
  });

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertSame("iterator-existing-target", result.targetEntry, day);
  assertEquals("iterator-no-create", result.created, false);
  assertEquals("iterator-outnote", day.field("OutNote"), "10: iterator day");
}

testCreatesDayLinksSourceAndAppendsMappedFields();
testDoesNotDuplicateSameLineOrTags();
testSinceFirstUsesTargetDateAsZero();
testWrongTargetDateFieldOnlyBlocksInStrictMode();
testNonStrictTargetDateFieldAllowsCreate();
testNewInputAddsMissingTagsToExistingDay();
testReusesExistingSourceDayLinkBeforeDateSearch();
testRecalcSourceAndTargetWhenConfigured();
testDebugDayLinkerAccessWritesDiagnostics();
testFindsExistingDayFromIteratorEntries();

WScript.Echo("OK");
