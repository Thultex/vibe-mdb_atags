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

function makeWriteOnlyEntry(fields, unreadableFields) {
  var e = makeEntry(fields);
  var unreadable = unreadableFields || {};
  e.field = function(name) {
    if (unreadable[name]) throw new Error("unreadable field " + name);
    if (!this._fields.hasOwnProperty(name)) throw new Error("missing field " + name);
    return this._fields[name];
  };
  return e;
}

function makeThrowAfterSetEntry(fields, throwFields) {
  var e = makeEntry(fields);
  var throws = throwFields || {};
  e.set = function(name, value) {
    this._fields[name] = value;
    if (throws[name]) throw new Error("throw after set " + name);
  };
  return e;
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

function makeNativeArrayLike(items) {
  return {
    length: items.length,
    get: function(index) {
      return items[index];
    },
    toString: function() {
      return "org.mozilla.javascript.NativeArray@abc";
    }
  };
}

function makeArrayLikeWithEntriesPairs(items) {
  return {
    length: items.length,
    get: function(index) {
      return items[index];
    },
    entries: function() {
      var i = 0;
      return {
        next: function() {
          if (i >= items.length) return { done: true };
          return { done: false, value: [i, items[i++]] };
        }
      };
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

function testExistingFunctionalSourceDayLinkWinsOverDateSearch() {
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

  assertSame("functional-link-wins-target", result.targetEntry, linkedDay);
  assertEquals("functional-link-wins-no-create", result.created, false);
  assertEquals("functional-link-wins-outnote", linkedDay.field("OutNote"), "10: nutzt link");
  assertEquals("functional-link-wins-other-empty", otherDay.field("OutNote"), "");
  assertSame("functional-link-wins-source-kept", input.field("DayLinks"), linkedDay);
}

function testBrokenSourceDayLinkFallsBackToDateSearch() {
  var brokenLink = {};
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "datum fallback",
    InTag: [],
    DayLinks: brokenLink
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

  assertSame("broken-link-date-target", result.targetEntry, day);
  assertEquals("broken-link-date-no-create", result.created, false);
  assertEquals("broken-link-date-outnote", day.field("OutNote"), "10: datum fallback");
  assertSame("broken-link-date-relinked", input.field("DayLinks"), day);
}

function testAlreadyLinkedInputCanAddNewMappedValuesOnRerun() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "10: alt",
    OutTags: ["alt"]
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "neu",
    InTag: ["alt", "neu"],
    DayLinks: day
  });

  reset(input, [day]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertSame("rerun-linked-target", result.targetEntry, day);
  assertEquals("rerun-linked-created", result.created, false);
  assertEquals("rerun-linked-outnote", day.field("OutNote"), "10: alt\n10: neu");
  assertEquals("rerun-linked-outtags", day.field("OutTags").join(","), "alt,neu");
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

  if (String(input.field("Debug")).indexOf("file: dd-linker.js") !== 0) {
    fail("debug-linker-file-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("DEBUG Dusting Day Linker") < 0) {
    fail("debug-linker-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("target entries: 1") < 0) {
    fail("debug-linker-entry-count missing");
  }

  if (String(input.field("Debug")).indexOf("version: 0.27") < 0) {
    fail("debug-linker-version missing");
  }

  if (String(input.field("Debug")).indexOf("time: ") < 0) {
    fail("debug-linker-time missing");
  }

  if (_logs.join("\n").indexOf("DEBUG Dusting Day Linker") < 0) {
    fail("debug-linker-log missing");
  }

  if (_logs.join("\n").indexOf("version: 0.27") < 0) {
    fail("debug-linker-log-version missing");
  }

  if (_logs.length !== 1) {
    fail("debug-linker-log-should-be-single-block");
  }

  if (String(input.field("Debug")).indexOf("dayStartHour: 4") < 0) {
    fail("debug-linker-day-start missing");
  }

  if (String(input.field("Debug")).indexOf("daySearchLimit: 10") < 0) {
    fail("debug-linker-day-search-limit missing");
  }
}

function testWriteOnlyTargetFieldsDoNotProduceFalseReadErrors() {
  var day = makeWriteOnlyEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  }, {
    OutNote: true,
    OutTags: true
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "write only",
    InTag: ["tagx"],
    DayLinks: null
  });

  reset(input, [day]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("write-only-no-errors", result.errors.length, 0);
  assertEquals("write-only-outnote", day._fields.OutNote, "10: write only");
  assertEquals("write-only-outtags", day._fields.OutTags.join(","), "tagx");
}

function testNativeArrayLikeTagsAreUnpacked() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "",
    InTag: makeNativeArrayLike(["alpha", "beta"]),
    DayLinks: null
  });

  reset(input, [day]);

  appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("native-array-tags", day.field("OutTags").join(","), "alpha,beta");
}

function testArrayLikeTagsDoNotUseEntriesPairs() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "",
    InTag: makeArrayLikeWithEntriesPairs(["asddfsa"]),
    DayLinks: null
  });

  reset(input, [day]);

  appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("array-like-tags-no-index", day.field("OutTags").join(","), "asddfsa");
}

function testSetThrowAfterWriteDoesNotLogFalseTargetErrorsByDefault() {
  var day = makeThrowAfterSetEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  }, {
    OutNote: true,
    OutTags: true
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "trotz throw geschrieben",
    InTag: ["tagx"],
    DayLinks: null,
    Debug: ""
  });

  reset(input, [day]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("throw-after-write-no-errors", result.errors.length, 0);
  assertEquals("throw-after-write-outnote", day._fields.OutNote, "10: trotz throw geschrieben");
  assertEquals("throw-after-write-outtags", day._fields.OutTags.join(","), "tagx");
  assertEquals("throw-after-write-debug-empty", input.field("Debug"), "");
}

function testErrorDebugStartsWithFileVersionAndTime() {
  var input = makeEntry({
    Date: "",
    InNote: "",
    InTag: [],
    DayLinks: null,
    Debug: ""
  });

  reset(input, []);

  appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  if (String(input.field("Debug")).indexOf("file: dd-linker.js") !== 0) {
    fail("error-debug-file-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("version: 0.27") < 0) {
    fail("error-debug-version missing");
  }

  if (String(input.field("Debug")).indexOf("time: ") < 0) {
    fail("error-debug-time missing");
  }

  if (_logs.length !== 1) {
    fail("error-debug-log-should-be-single-block");
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

function testUsesPreviousDayBeforeFourOnlyWhenSameCalendarDayIsMissing() {
  var day = makeEntry({
    Date: "2020-02-02 14:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 03:30",
    InNote: "noch vortag",
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

  assertSame("boundary-fallback-prev-day-target", result.targetEntry, day);
  assertEquals("boundary-fallback-prev-day-no-create", result.created, false);
  assertEquals("boundary-fallback-prev-day-count", _libs.DustingDay.entries().length, 1);
  assertEquals("boundary-fallback-prev-day-note", day.field("OutNote"), "3,5: noch vortag");
}

function testBeforeFourPrefersSameCalendarDayOverPreviousDay() {
  var previousDay = makeEntry({
    Date: "2020-02-02 14:00",
    OutNote: "",
    OutTags: []
  });
  var sameDay = makeEntry({
    Date: "2020-02-03 02:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 03:30",
    InNote: "gleicher tag gewinnt",
    InTag: [],
    DayLinks: null
  });

  reset(input, [sameDay, previousDay]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertSame("boundary-same-day-target", result.targetEntry, sameDay);
  assertEquals("boundary-same-day-no-create", result.created, false);
  assertEquals("boundary-same-day-prev-empty", previousDay.field("OutNote"), "");
  assertEquals("boundary-same-day-note", sameDay.field("OutNote"), "3,5: gleicher tag gewinnt");
}

function testAfterFourCreatesNextDustingDayWhenSameDayIsMissing() {
  var day = makeEntry({
    Date: "2020-02-02 14:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 04:10",
    InNote: "neuer tag",
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

  assertEquals("boundary-after-four-create", result.created, true);
  assertEquals("boundary-after-four-day-count", _libs.DustingDay.entries().length, 2);
  assertEquals("boundary-after-four-note", result.targetEntry.field("OutNote"), "4: neuer tag");
}

function testDaySearchLimitRestrictsDateReuse() {
  var oldMatch = makeEntry({
    Date: "2020-02-02 14:00",
    OutNote: "",
    OutTags: []
  });
  var recentOther = makeEntry({
    Date: "2020-02-01 14:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 15:00",
    InNote: "limit test",
    InTag: [],
    DayLinks: null
  });

  reset(input, [recentOther, oldMatch]);

  var result = appendToDayEntry({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    daySearchLimit: 1,
    map: [
      { from: "InNote", to: "OutNote", type: "string" }
    ]
  });

  assertEquals("day-search-limit-create", result.created, true);
  assertEquals("day-search-limit-count", _libs.DustingDay.entries().length, 3);
  assertEquals("day-search-limit-old-empty", oldMatch.field("OutNote"), "");
}

testCreatesDayLinksSourceAndAppendsMappedFields();
testDoesNotDuplicateSameLineOrTags();
testSinceFirstUsesTargetDateAsZero();
testWrongTargetDateFieldOnlyBlocksInStrictMode();
testNonStrictTargetDateFieldAllowsCreate();
testNewInputAddsMissingTagsToExistingDay();
testExistingFunctionalSourceDayLinkWinsOverDateSearch();
testBrokenSourceDayLinkFallsBackToDateSearch();
testAlreadyLinkedInputCanAddNewMappedValuesOnRerun();
testRecalcSourceAndTargetWhenConfigured();
testDebugDayLinkerAccessWritesDiagnostics();
testWriteOnlyTargetFieldsDoNotProduceFalseReadErrors();
testNativeArrayLikeTagsAreUnpacked();
testArrayLikeTagsDoNotUseEntriesPairs();
testSetThrowAfterWriteDoesNotLogFalseTargetErrorsByDefault();
testErrorDebugStartsWithFileVersionAndTime();
testFindsExistingDayFromIteratorEntries();
testUsesPreviousDayBeforeFourOnlyWhenSameCalendarDayIsMissing();
testBeforeFourPrefersSameCalendarDayOverPreviousDay();
testAfterFourCreatesNextDustingDayWhenSameDayIsMissing();
testDaySearchLimitRestrictsDateReuse();

WScript.Echo("OK");
