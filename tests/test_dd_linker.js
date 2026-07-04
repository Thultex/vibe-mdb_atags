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

function testWrongTargetDateFieldDoesNotCreateDuplicateDay() {
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
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertEquals("wrong-date-no-create", result.created, false);
  assertEquals("wrong-date-day-count", _libs.DustingDay.entries().length, 1);
  assertEquals("wrong-date-error", input.field("Debug").indexOf("Ziel-Datumsfeld fehlt") >= 0, true);
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

function testRefreshDayEntryFromLinkedInputs() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "aus day erstellt",
    InTag: ["methode"],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshDayEntryFromInputs({
    sourceLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("refresh-input-count", result.inputs.length, 1);
  assertEquals("refresh-outnote", day.field("OutNote"), "10: aus day erstellt");
  assertEquals("refresh-tags", day.field("OutTags").join(","), "methode");
}

function testRefreshDayEntryLinksSameDateInput() {
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

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  refreshDayEntryFromInputs({
    sourceLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertSame("refresh-links-input", input.field("DayLinks"), day);
  assertEquals("refresh-same-date-outnote", day.field("OutNote"), "10: gleiches datum");
}

testCreatesDayLinksSourceAndAppendsMappedFields();
testDoesNotDuplicateSameLineOrTags();
testSinceFirstUsesTargetDateAsZero();
testWrongTargetDateFieldDoesNotCreateDuplicateDay();
testNewInputAddsMissingTagsToExistingDay();
testRefreshDayEntryFromLinkedInputs();
testRefreshDayEntryLinksSameDateInput();

WScript.Echo("OK");
