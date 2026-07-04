var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\core_lib\\inputLinker_lib.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _currentEntry = null;
var _libs = {};
var _logs = [];
var _postEntries = [];
var _linkingTriggerContext = false;

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
  var e = {
    _fields: fields || {},
    _recalcCount: 0,
    _linkCounts: {},
    _unlinkCounts: {},
    field: function(name) {
      if (!this._fields.hasOwnProperty(name)) throw new Error("missing field " + name);
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    },
    link: function(name, entryObj) {
      this._fields[name] = entryObj;
      this._linkCounts[name] = (this._linkCounts[name] || 0) + 1;
    },
    unlink: function(name, entryObj) {
      var current = this._fields[name];
      var next = [];
      var i;

      this._unlinkCounts[name] = (this._unlinkCounts[name] || 0) + 1;

      if (Object.prototype.toString.call(current) !== "[object Array]") current = current == null ? [] : [current];
      for (i = 0; i < current.length; i++) {
        if (current[i] !== entryObj) next.push(current[i]);
      }
      this._fields[name] = next.length === 1 ? next[0] : next;
    },
    recalc: function() {
      this._recalcCount++;
    }
  };
  if (fields && fields.id != null) e.id = fields.id;
  if (fields && fields.deleted != null) e.deleted = fields.deleted;
  return e;
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

function makeCountingSetEntry(fields) {
  var e = makeEntry(fields);
  e._setCounts = {};
  e.set = function(name, value) {
    this._fields[name] = value;
    this._setCounts[name] = (this._setCounts[name] || 0) + 1;
  };
  return e;
}

function makeNoLinkEntry(fields) {
  var e = makeEntry(fields);
  e.link = undefined;
  return e;
}

function makeLib(entries) {
  return {
    _entries: entries || [],
    entries: function() {
      return this._entries;
    },
    findById: function(id) {
      var wanted = String(id || "");
      var i;
      for (i = 0; i < this._entries.length; i++) {
        if (String(this._entries[i].id || "") === wanted) return this._entries[i];
      }
      return null;
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

function masterEntry() {
  return _linkingTriggerContext ? makeEntry({}) : null;
}

function masterLib() {
  return _linkingTriggerContext ? makeLib([]) : null;
}

function postEntry(e) {
  _postEntries.push(e);
}

function customInputLinkerPostEntry(e) {
  _postEntries.push(e);
}

function throwingInputLinkerPostEntry(e) {
  throw new Error("custom failure");
}

function destructiveRowsOnlyPostEntry(e) {
  var lines = String(e.field("OutNote") || "").split(/\r\n|\r|\n/);
  var out = [];
  var i;

  for (i = 0; i < lines.length; i++) {
    if (/^\s*\d+(?:[.,]\d+)?\s*:/.test(lines[i])) out.push(lines[i]);
  }

  e.set("OutNote", out.join("\n"));
}

function reset(input, dayEntries) {
  _currentEntry = input;
  _logs = [];
  _postEntries = [];
  _linkingTriggerContext = false;
  _libs = {
    DustingDay: makeLib(dayEntries || []),
    DustingInput: makeLib([])
  };
}

function resetWithLibs(current, libs) {
  _currentEntry = current;
  _logs = [];
  _postEntries = [];
  _linkingTriggerContext = false;
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("created", result.created, true);
  assertEquals("day-count", _libs.DustingDay.entries().length, 1);
  assertSame("source-linked", input.field("DayLinks"), result.targetEntry);
  assertEquals("source-linked-via-link", input._linkCounts.DayLinks, 1);
  assertEquals("outnote", result.targetEntry.field("OutNote"), "14,5: erste Zeile");
  assertEquals("outtags", result.targetEntry.field("OutTags").join(","), "müde,stress");
}

function testNewInputLinksOnlyByDefault() {
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    InNote: "nur link",
    InTag: ["müde"],
    DayLinks: null
  });

  reset(input, []);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("link-only-created", result.created, true);
  assertSame("link-only-source-linked", input.field("DayLinks"), result.targetEntry);
  assertEquals("link-only-linked", result.linked, true);
  assertEquals("link-only-skipped", result.skipped, true);
  assertEquals("link-only-reason", result.skipReason, "link_only");
  assertEquals("link-only-process-skipped", result.processSkippedLinkOnly, true);
  assertEquals("link-only-no-appended", result.appended.length, 0);
  assertEquals("link-only-no-tags", result.tags.length, 0);
}

function testLinkOnlyDoesNotRequireMap() {
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    DayLinks: null,
    Debug: ""
  });

  reset(input, []);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    sourceDebugField: "Debug"
  });

  assertEquals("link-only-no-map-errors", result.errors.length, 0);
  assertEquals("link-only-no-map-created", result.created, true);
  assertEquals("link-only-no-map-linked", result.linked, true);
  assertSame("link-only-no-map-source-link", input.field("DayLinks"), result.targetEntry);
  assertEquals("link-only-no-map-debug-clear", input.field("Debug"), "");
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

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("no-duplicate-line", day.field("OutNote"), "14,5: erste Zeile");
  assertEquals("unique-tags", day.field("OutTags").join(","), "müde,stress");
}

function testStringTypeAppendsPlainTextWithoutRowPrefix() {
  var day = makeEntry({
    Datum: "2020-02-02 14:35",
    PlainNote: ""
  });
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    InNote: "plain text",
    DayLinks: null
  });

  reset(input, [day]);

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "PlainNote", type: "string" }
    ]
  });

  assertEquals("plain-string-no-row", day.field("PlainNote"), "plain text");
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

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    rowMode: "sinceFirst",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("relative-row", day.field("OutNote"), "1,5: später");
}

function testRowSourceModeRealtimeSinceUsesTimeMarkerNames() {
  var day = makeEntry({
    Datum: "2020-02-02 14:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 14:35",
    InNote: "nach start",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    rowSourceMode: "realtime_since",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("row-source-mode-realtime-since", day.field("OutNote"), "14,6: nach start");
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "WrongDate",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    strictTargetValidation: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
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

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    trustExistingLink: true,
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("functional-link-wins-target", result.targetEntry, linkedDay);
  assertEquals("functional-link-wins-no-create", result.created, false);
  assertEquals("functional-link-wins-outnote", linkedDay.field("OutNote"), "10: nutzt link");
  assertEquals("functional-link-wins-other-empty", otherDay.field("OutNote"), "");
  assertSame("functional-link-wins-source-kept", input.field("DayLinks"), linkedDay);
}

function testMismatchingSourceDayLinkFallsBackToMatchingDateByDefault() {
  var linkedDay = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var matchingDay = makeEntry({
    Datum: "2020-02-03 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 10:00",
    InNote: "nutzt datum",
    InTag: [],
    DayLinks: linkedDay
  });

  reset(input, [matchingDay, linkedDay]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("mismatch-link-date-target", result.targetEntry, matchingDay);
  assertEquals("mismatch-link-date-no-create", result.created, false);
  assertEquals("mismatch-link-old-empty", linkedDay.field("OutNote"), "");
  assertEquals("mismatch-link-matching-note", matchingDay.field("OutNote"), "10: nutzt datum");
  assertSame("mismatch-link-kept-existing", input.field("DayLinks"), linkedDay);
  assertEquals("mismatch-link-skipped-existing", result.linkSkippedExisting, true);
}

function testMismatchingSourceDayLinkDoesNotRewriteExistingRelationByDefault() {
  var oldDay = makeEntry({
    Datum: "2020-02-01 09:00",
    OutNote: "",
    OutTags: []
  });
  var matchingDay = makeEntry({
    Datum: "2020-02-03 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 10:00",
    InNote: "alter link weg",
    InTag: [],
    DayLinks: oldDay
  });

  reset(input, [matchingDay, oldDay]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("mismatch-unlink-target", result.targetEntry, matchingDay);
  assertEquals("mismatch-unlink-count", result.unlinked, 0);
  assertEquals("mismatch-unlink-call-count", input._unlinkCounts.DayLinks || 0, 0);
  assertEquals("mismatch-link-call-count", input._linkCounts.DayLinks || 0, 0);
  assertSame("mismatch-unlink-final-link", input.field("DayLinks"), oldDay);
  assertEquals("mismatch-existing-link-skipped", result.linkSkippedExisting, true);
  assertEquals("mismatch-unlink-old-empty", oldDay.field("OutNote"), "");
  assertEquals("mismatch-unlink-note", matchingDay.field("OutNote"), "10: alter link weg");
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("broken-link-date-target", result.targetEntry, day);
  assertEquals("broken-link-date-no-create", result.created, false);
  assertEquals("broken-link-date-outnote", day.field("OutNote"), "10: datum fallback");
  assertSame("broken-link-date-link-kept", input.field("DayLinks"), brokenLink);
  assertEquals("broken-link-date-link-skipped", result.linkSkippedExisting, true);
}

function testExistingSourceDayLinkPreventsNewDayCreationWhenTargetMissing() {
  var brokenLink = {};
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "nicht neu erstellen",
    InTag: [],
    DayLinks: brokenLink,
    Debug: ""
  });

  reset(input, []);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("existing-link-no-target-skipped", result.skipped, true);
  assertEquals("existing-link-no-target-reason", result.skipReason, "existing_daylink_no_create");
  assertEquals("existing-link-no-target-create-skipped", result.createSkippedExistingLink, true);
  assertEquals("existing-link-no-target-not-created", result.created, false);
  assertEquals("existing-link-no-target-entry-null", result.targetEntry, null);
  assertEquals("existing-link-no-target-lib-count", _libs.DustingDay.entries().length, 0);
  assertSame("existing-link-no-target-link-kept", input.field("DayLinks"), brokenLink);
  assertEquals("existing-link-no-target-debug", input.field("Debug").indexOf("neuer Tages-Eintrag wird nicht erstellt") >= 0, true);
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertSame("rerun-linked-target", result.targetEntry, day);
  assertEquals("rerun-linked-created", result.created, false);
  assertEquals("rerun-linked-outnote", day.field("OutNote"), "10: alt\n10: neu");
  assertEquals("rerun-linked-outtags", day.field("OutTags").join(","), "alt,neu");
}

function testAlreadyLinkedInputDoesNotRewriteRelationOnRerun() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeCountingSetEntry({
    Date: "2020-02-02 10:00",
    InNote: "neu",
    InTag: [],
    DayLinks: day
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("already-linked-no-rewrite-target", result.targetEntry, day);
  assertEquals("already-linked-no-rewrite-result-linked", result.linked, true);
  assertEquals("already-linked-no-rewrite-daylinks-set-count", input._setCounts.DayLinks || 0, 0);
  assertEquals("already-linked-no-rewrite-daylinks-link-count", input._linkCounts.DayLinks || 0, 0);
  assertEquals("already-linked-no-rewrite-note", day.field("OutNote"), "10: neu");
}

function testExistingDayLinkDoesNotProcessTargetByDefault() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "10: alt",
    OutTags: ["alt"]
  });
  var input = makeCountingSetEntry({
    Date: "2020-02-02 10:00",
    InNote: "neu",
    InTag: ["neu"],
    DayLinks: day,
    Debug: "alter debug"
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    recalcTarget: true,
    postEntry: true,
    openTargetEntry: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertSame("existing-link-default-target", result.targetEntry, day);
  assertEquals("existing-link-default-skipped", result.skipped, true);
  assertEquals("existing-link-default-reason", result.skipReason, "existing_daylink_process_disabled");
  assertEquals("existing-link-default-process-skipped", result.processSkippedExistingLink, true);
  assertEquals("existing-link-default-note-untouched", day.field("OutNote"), "10: alt");
  assertEquals("existing-link-default-tags-untouched", day.field("OutTags").join(","), "alt");
  assertEquals("existing-link-default-no-recalc", day._recalcCount, 0);
  assertEquals("existing-link-default-no-post-entry", _postEntries.length, 0);
  assertEquals("existing-link-default-no-open", result.openResult.attempted, false);
  assertEquals("existing-link-default-no-relation-set", input._setCounts.DayLinks || 0, 0);
  assertEquals("existing-link-default-no-relation-link", input._linkCounts.DayLinks || 0, 0);
  assertEquals("existing-link-default-debug-untouched", input.field("Debug"), "alter debug");
  assertEquals("existing-link-default-no-debug-set", input._setCounts.Debug || 0, 0);
}

function testAlreadyLinkedInputRecognizesRelationWrapperByDate() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    id: "day-1",
    OutNote: "",
    OutTags: []
  });
  var dayWrapper = makeEntry({
    id: "day-1",
    Date: "2020-02-02 18:00",
    OutNote: "anderer wrapper"
  });
  var input = makeCountingSetEntry({
    Date: "2020-02-02 10:00",
    InNote: "wrapper link",
    InTag: [],
    DayLinks: dayWrapper
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("already-linked-wrapper-target", result.targetEntry, day);
  assertEquals("already-linked-wrapper-no-set", input._setCounts.DayLinks || 0, 0);
  assertEquals("already-linked-wrapper-no-link", input._linkCounts.DayLinks || 0, 0);
  assertEquals("already-linked-wrapper-day-note", day.field("OutNote"), "10: wrapper link");
  assertEquals("already-linked-wrapper-untouched", dayWrapper.field("OutNote"), "anderer wrapper");
}

function testLinkedDeletedDayAllowsNewTargetCreation() {
  var deletedDay = makeEntry({
    id: "day-deleted",
    Date: "2020-02-01 09:00",
    deleted: true,
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "neu zuordnen",
    InTag: [],
    DayLinks: deletedDay,
    Debug: ""
  });

  reset(input, [deletedDay]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("deleted-link-id-created", result.created, true);
  assertEquals("deleted-link-id-linked", result.linked, true);
  assertSame("deleted-link-id-new-link", input.field("DayLinks"), result.targetEntry);
  assertEquals("deleted-link-id-link-only", result.skipReason, "link_only");
  assertEquals("deleted-link-id-target-count", _libs.DustingDay.entries().length, 2);
  assertEquals("deleted-link-id-deleted-empty", deletedDay.field("OutNote"), "");
  assertEquals("deleted-link-id-new-empty", ddlSafeField(result.targetEntry, "OutNote", null, null), null);
  assertEquals("deleted-link-id-debug-clear", input.field("Debug"), "");
}

function testRelationWithoutLinkMethodDoesNotSetEntryObjectByDefault() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeNoLinkEntry({
    Date: "2020-02-02 10:00",
    InNote: "nicht per set",
    InTag: [],
    DayLinks: null,
    Debug: ""
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("no-link-method-result-linked", result.linked, false);
  assertEquals("no-link-method-field-unchanged", input.field("DayLinks"), null);
  assertEquals("no-link-method-error", result.errors[0].indexOf("entry.link() fehlt") >= 0, true);
  assertEquals("no-link-method-still-appends", day.field("OutNote"), "10: nicht per set");
}

function testInputLinkerSkipsMementoLinkingTriggerContextByDefault() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "nicht rekursiv",
    InTag: [],
    DayLinks: null,
    Debug: ""
  });

  reset(input, [day]);
  _linkingTriggerContext = true;

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("linking-trigger-skipped", result.skipped, true);
  assertEquals("linking-trigger-skip-reason", result.skipReason, "linking_trigger_context");
  assertEquals("linking-trigger-no-link", input.field("DayLinks"), null);
  assertEquals("linking-trigger-no-append", day.field("OutNote"), "");
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    recalcSource: true,
    recalcTarget: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("recalc-target", day._recalcCount, 1);
  assertEquals("recalc-source", input._recalcCount, 1);
  assertEquals("recalc-result", result.recalculated.join(","), "target,source");
}

function testRunsPostEntryOnTargetWhenConfigured() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "post target",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    postEntry: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("post-entry-target-count", _postEntries.length, 1);
  assertSame("post-entry-target-entry", _postEntries[0], day);
  assertEquals("post-entry-target-result", result.postEntries.join(","), "target");
}

function testSuccessfulRunClearsExistingSourceDebugField() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "debug clear",
    InTag: [],
    DayLinks: null,
    Debug: "alter fehler"
  });

  reset(input, [day]);

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("successful-run-clears-source-debug", input.field("Debug"), "");
}

function testRunsPostEntryOnSourceWhenConfigured() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "post source",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    postEntry: true,
    postEntryTarget: "source",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("post-entry-source-count", _postEntries.length, 1);
  assertSame("post-entry-source-entry", _postEntries[0], input);
  assertEquals("post-entry-source-result", result.postEntries.join(","), "source");
}

function testRunsNamedPostEntryFunctionWhenConfigured() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "post named",
    InTag: [],
    DayLinks: null
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    postEntry: true,
    postEntryName: "customInputLinkerPostEntry",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("post-entry-named-count", _postEntries.length, 1);
  assertSame("post-entry-named-entry", _postEntries[0], day);
  assertEquals("post-entry-named-result", result.postEntries.join(","), "target");
}

function testPostEntryDoesNotLoseFreeTextInStringRowsTarget() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "#tagbar\n\nfreier text\n9: alt",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "neu",
    InTag: [],
    DayLinks: day
  });

  reset(input, [day]);

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processExistingLink: true,
    postEntry: true,
    postEntryName: "destructiveRowsOnlyPostEntry",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("post-entry-preserves-string-row-free-text", day.field("OutNote"), "9: alt\n10: neu\n\n#tagbar\n\nfreier text");
}

function testPostEntryErrorIncludesFunctionAndMessage() {
  var day = makeEntry({
    Datum: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "post fail",
    InTag: [],
    DayLinks: null,
    Debug: ""
  });

  reset(input, [day]);

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Datum",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    postEntry: true,
    postEntryName: "throwingInputLinkerPostEntry",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("post-entry-fail-result-empty", result.postEntries.length, 0);
  assertEquals("post-entry-fail-error-detail", result.errors[0].indexOf("PostEntry fehlgeschlagen: target via throwingInputLinkerPostEntry - custom failure") >= 0, true);
  assertEquals("post-entry-fail-debug-detail", input.field("Debug").indexOf("custom failure") >= 0, true);
}

function testDebugDayLinkerAccessWritesDiagnostics() {
  var day = makeEntry({
    id: "debug-day",
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    DayLinks: day,
    Debug: ""
  });

  reset(input, [day]);

  debugInputLinkerAccess({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDebugField: "Debug"
  });

  if (String(input.field("Debug")).indexOf("file: inputLinker_lib.js") !== 0) {
    fail("debug-linker-file-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("DEBUG Input Linker") < 0) {
    fail("debug-linker-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("target entries: 1") < 0) {
    fail("debug-linker-entry-count missing");
  }

  if (String(input.field("Debug")).indexOf("name: Input Linker") < 0) {
    fail("debug-linker-name missing");
  }

  if (String(input.field("Debug")).indexOf("version: 0.61") < 0) {
    fail("debug-linker-version missing");
  }

  if (String(input.field("Debug")).indexOf("time: ") < 0) {
    fail("debug-linker-time missing");
  }

  if (_logs.join("\n").indexOf("DEBUG Input Linker") < 0) {
    fail("debug-linker-log missing");
  }

  if (_logs.join("\n").indexOf("version: 0.61") < 0) {
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

  if (String(input.field("Debug")).indexOf("rowSourceMode: realtime") < 0) {
    fail("debug-linker-row-source-mode missing");
  }

  if (String(input.field("Debug")).indexOf("source entry id:") < 0) {
    fail("debug-linker-source-id missing");
  }

  if (String(input.field("Debug")).indexOf("source date values raw:") < 0) {
    fail("debug-linker-values-date missing");
  }

  if (String(input.field("Debug")).indexOf("trigger field() raw:") < 0) {
    fail("debug-linker-trigger-field missing");
  }

  if (String(input.field("Debug")).indexOf("source DayLinks length: 1") < 0) {
    fail("debug-linker-daylinks-length missing");
  }

  if (String(input.field("Debug")).indexOf("source DayLink[0] id: debug-day") < 0) {
    fail("debug-linker-daylink-id missing");
  }

  if (String(input.field("Debug")).indexOf("target findById DayLink[0]: entry-like object") < 0) {
    fail("debug-linker-findbyid missing");
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
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

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
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

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
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

  linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    sourceDebugField: "Debug",
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  if (String(input.field("Debug")).indexOf("file: inputLinker_lib.js") !== 0) {
    fail("error-debug-file-prefix missing");
  }

  if (String(input.field("Debug")).indexOf("version: 0.61") < 0) {
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
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

  var result = linkInputEntryToTarget({
    targetLib: "DustingDay",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    daySearchLimit: 1,
    map: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("day-search-limit-create", result.created, true);
  assertEquals("day-search-limit-count", _libs.DustingDay.entries().length, 3);
  assertEquals("day-search-limit-old-empty", oldMatch.field("OutNote"), "");
}

function testRefreshDayLinksMatchingInputsAndAppends() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "day refresh",
    InTag: ["tag1"],
    DayLinks: null
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    findMatchingEntries: true,
    linkNewEntries: true,
    processAllEntries: true,
    processMode: "append",
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("refresh-day-input-count", result.inputs, 1);
  assertEquals("refresh-day-linked-count", result.linked, 1);
  assertSame("refresh-day-link-set", input.field("DayLinks"), day);
  assertEquals("refresh-day-outnote", day.field("OutNote"), "10: day refresh");
  assertEquals("refresh-day-tags", day.field("OutTags").join(","), "tag1");
}

function testRefreshDayAppendAllAllowsDuplicateRowsAndTags() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "10: doppelt",
    OutTags: ["tag1"]
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "doppelt",
    InTag: ["tag1"],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    processAllEntries: true,
    processMode: "append all",
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("refresh-append-all-mode", result.mode, "append_all");
  assertEquals("refresh-append-all-note", day.field("OutNote"), "10: doppelt\n10: doppelt");
  assertEquals("refresh-append-all-tags", day.field("OutTags").join(","), "tag1,tag1");
}

function testRefreshDaySkipsInputsLinkedToOtherDayByDefault() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var otherDay = makeEntry({
    Date: "2020-02-02 08:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "nicht stehlen",
    InTag: ["tag1"],
    DayLinks: otherDay
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    findMatchingEntries: true,
    linkNewEntries: true,
    processAllEntries: true,
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("refresh-skip-other-inputs", result.inputs, 0);
  assertEquals("refresh-skip-other-count", result.skippedLinkedToOther, 1);
  assertSame("refresh-skip-other-link-kept", input.field("DayLinks"), otherDay);
  assertEquals("refresh-skip-other-note-empty", day.field("OutNote"), "");
}

function testRefreshDayRebuildClearsMappedTargetsBeforeApplyingLinkedInputs() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "stale",
    OutTags: ["stale"]
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "fresh",
    InTag: ["freshTag"],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    processAllEntries: true,
    processMode: "rebuild",
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("refresh-rebuild-mode", result.mode, "rebuild");
  assertEquals("refresh-rebuild-cleared", result.cleared.join(","), "OutNote,OutTags");
  assertEquals("refresh-rebuild-note", day.field("OutNote"), "stale\n10: fresh");
  assertEquals("refresh-rebuild-tags", day.field("OutTags").join(","), "freshTag");
}

function testRefreshDayRebuildKeepsFreeTextInStringRowsTarget() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "#tagbar\n\n9: stale\nfreier text\n10: alt",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 11:00",
    InNote: "fresh",
    InTag: [],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    processAllEntries: true,
    processMode: "rebuild",
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("refresh-rebuild-keeps-free-text", day.field("OutNote"), "#tagbar\n\nfreier text\n11: fresh");
}

function testRefreshDayRebuildKeepsFreeTextWhenSameTargetHasMixedMapTypes() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "#tagbar\nfreier text\n9: stale",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 11:00",
    InNote: "fresh row",
    ExtraNote: "fresh plain",
    InTag: [],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    processAllEntries: true,
    processMode: "rebuild",
    processMap: [
      { from: "ExtraNote", to: "OutNote", type: "string" },
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("refresh-rebuild-mixed-map-keeps-free-text", day.field("OutNote"), "#tagbar\nfreier text\nfresh plain\n11: fresh row");
}

function testRefreshDayCanProcessOneSourceEntry() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-03 10:00",
    InNote: "direkt",
    InTag: [],
    DayLinks: null
  });

  resetWithLibs(day, {
    DustingInput: makeLib([])
  });

  var result = refreshTargetFromInputEntries({
    entries: input,
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    linkNewEntries: true,
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("refresh-one-input-count", result.inputs, 1);
  assertSame("refresh-one-link", input.field("DayLinks"), day);
  assertEquals("refresh-one-note", day.field("OutNote"), "10: direkt");
}

function testRefreshDayRunsPostEntryOnTargetWhenConfigured() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "post vom day",
    InTag: [],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAllEntries: true,
    postEntry: true,
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("refresh-post-entry-count", _postEntries.length, 1);
  assertSame("refresh-post-entry-target", _postEntries[0], day);
  assertEquals("refresh-post-entry-result", result.postEntries.join(","), "target");
}

function testRefreshCurrentTargetUsesCurrentEntry() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "current day",
    InTag: [],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  var result = refreshCurrentTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAllEntries: true,
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertSame("refresh-current-target", result.targetEntry, day);
  assertEquals("refresh-current-note", day.field("OutNote"), "10: current day");
}

function testRefreshCurrentTargetFromLinkedInputProcessesOnlyThatEntry() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: []
  });
  var linkedInput = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "gelinkt",
    InTag: ["a"],
    DayLinks: day
  });
  var otherInput = makeEntry({
    Date: "2020-02-02 11:00",
    InNote: "nicht anfassen",
    InTag: ["b"],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([linkedInput, otherInput])
  });

  var result = refreshCurrentTargetFromLinkedInputEntry({
    inputEntry: linkedInput,
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    postEntry: true,
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" },
      { from: "InTag", to: "OutTags", type: "tag" }
    ]
  });

  assertEquals("refresh-linked-one-input-count", result.inputs, 1);
  assertEquals("refresh-linked-one-note", day.field("OutNote"), "10: gelinkt");
  assertEquals("refresh-linked-one-tags", day.field("OutTags").join(","), "a");
  assertEquals("refresh-linked-one-post-entry", result.postEntries.join(","), "target");
}

function testSuccessfulRefreshClearsExistingTargetDebugField() {
  var day = makeEntry({
    Date: "2020-02-02 09:00",
    OutNote: "",
    OutTags: [],
    Debug: "alter fehler"
  });
  var input = makeEntry({
    Date: "2020-02-02 10:00",
    InNote: "refresh debug",
    InTag: [],
    DayLinks: day
  });

  resetWithLibs(day, {
    DustingInput: makeLib([input])
  });

  refreshTargetFromInputEntries({
    inputLib: "DustingInput",
    sourceDateField: "Date",
    targetDateField: "Date",
    sourceDayLinkField: "DayLinks",
    processAfterLink: true,
    processAllEntries: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "OutNote", type: "string_rows" }
    ]
  });

  assertEquals("successful-refresh-clears-target-debug", day.field("Debug"), "");
}

testCreatesDayLinksSourceAndAppendsMappedFields();
testNewInputLinksOnlyByDefault();
testLinkOnlyDoesNotRequireMap();
testDoesNotDuplicateSameLineOrTags();
testStringTypeAppendsPlainTextWithoutRowPrefix();
testSinceFirstUsesTargetDateAsZero();
testRowSourceModeRealtimeSinceUsesTimeMarkerNames();
testWrongTargetDateFieldOnlyBlocksInStrictMode();
testNonStrictTargetDateFieldAllowsCreate();
testNewInputAddsMissingTagsToExistingDay();
testExistingFunctionalSourceDayLinkWinsOverDateSearch();
testMismatchingSourceDayLinkFallsBackToMatchingDateByDefault();
testMismatchingSourceDayLinkDoesNotRewriteExistingRelationByDefault();
testBrokenSourceDayLinkFallsBackToDateSearch();
testExistingSourceDayLinkPreventsNewDayCreationWhenTargetMissing();
testAlreadyLinkedInputCanAddNewMappedValuesOnRerun();
testAlreadyLinkedInputDoesNotRewriteRelationOnRerun();
testExistingDayLinkDoesNotProcessTargetByDefault();
testAlreadyLinkedInputRecognizesRelationWrapperByDate();
testLinkedDeletedDayAllowsNewTargetCreation();
testRelationWithoutLinkMethodDoesNotSetEntryObjectByDefault();
testInputLinkerSkipsMementoLinkingTriggerContextByDefault();
testRecalcSourceAndTargetWhenConfigured();
testRunsPostEntryOnTargetWhenConfigured();
testSuccessfulRunClearsExistingSourceDebugField();
testRunsPostEntryOnSourceWhenConfigured();
testRunsNamedPostEntryFunctionWhenConfigured();
testPostEntryDoesNotLoseFreeTextInStringRowsTarget();
testPostEntryErrorIncludesFunctionAndMessage();
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
testRefreshDayLinksMatchingInputsAndAppends();
testRefreshDayAppendAllAllowsDuplicateRowsAndTags();
testRefreshDaySkipsInputsLinkedToOtherDayByDefault();
testRefreshDayRebuildClearsMappedTargetsBeforeApplyingLinkedInputs();
testRefreshDayRebuildKeepsFreeTextInStringRowsTarget();
testRefreshDayRebuildKeepsFreeTextWhenSameTargetHasMixedMapTypes();
testRefreshDayCanProcessOneSourceEntry();
testRefreshDayRunsPostEntryOnTargetWhenConfigured();
testRefreshCurrentTargetUsesCurrentEntry();
testRefreshCurrentTargetFromLinkedInputProcessesOnlyThatEntry();
testSuccessfulRefreshClearsExistingTargetDebugField();

WScript.Echo("OK");












