var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\z_generell\\typedTextFields.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _fields = [];
var _entries = [];
var _currentEntry = null;

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function assertArray(label, actual, expected) {
  var i;

  if (!actual || actual.length !== expected.length) {
    fail(label + ": expected length " + expected.length + " but got " + (actual ? actual.length : "null"));
  }

  for (i = 0; i < expected.length; i++) {
    if (String(actual[i]) !== String(expected[i])) {
      fail(label + "[" + i + "]: expected '" + expected[i] + "' but got '" + actual[i] + "'");
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

function makeHostList(items) {
  return {
    length: items.length,
    item: function(index) {
      return items[index];
    }
  };
}

function lib() {
  return {
    fields: function() {
      return _fields;
    },
    entries: function() {
      return _entries;
    }
  };
}

function entry() {
  return _currentEntry;
}

function reset(fields, entries, currentEntry) {
  _fields = fields;
  _entries = entries || [];
  _currentEntry = currentEntry || entries[0];
}

function testSyncCurrentEntryByDefault() {
  var e = makeEntry({
    "Zahl(t-i)": " 42 mg",
    Zahl: null
  });
  reset(["Zahl(t-i)", "Zahl"], [e], e);

  var result = syncTypedTextFields();

  assertEquals("default-current-value", e.field("Zahl"), 42);
  assertEquals("default-current-changed", result.changedPairs, 1);
}

function testSyncMultipleTypes() {
  var e = makeEntry({
    "Datum(t-dd)": "02.05.2026 13:45",
    Datum: null,
    "Dauer(t-d)": "1h 30min",
    Dauer: null,
    "Real(t-r)": "1.234,5 mg",
    Real: null,
    "Tags(t-tag)": "alpha, beta|alpha; gamma",
    Tags: []
  });
  reset(["Datum(t-dd)", "Datum", "Dauer(t-d)", "Dauer", "Real(t-r)", "Real", "Tags(t-tag)", "Tags"], [e], e);

  var result = syncTypedTextFields(e);

  assertEquals("multi-types-changed", result.changedPairs, 4);
  assertEquals("duration-minutes", e.field("Dauer"), 90);
  assertEquals("real-localized", e.field("Real"), 1234.5);
  assertArray("tag-list", e.field("Tags"), ["alpha", "beta", "gamma"]);
  assertEquals("date-year", e.field("Datum").getFullYear(), 2026);
  assertEquals("date-month", e.field("Datum").getMonth(), 4);
}

function testOnlyIfTargetEmptySkipsFilledTarget() {
  var e = makeEntry({
    "Zahl(t-i)": "42",
    Zahl: 7
  });
  reset(["Zahl(t-i)", "Zahl"], [e], e);

  var result = syncTypedTextFields(e, {
    onlyIfTargetEmpty: true
  });

  assertEquals("only-empty-keeps-target", e.field("Zahl"), 7);
  assertEquals("only-empty-skipped", result.skippedPairs, 1);
}

function testClearSourceAfterWrite() {
  var e = makeEntry({
    "Zahl(t-i)": "42",
    Zahl: null
  });
  reset(["Zahl(t-i)", "Zahl"], [e], e);

  var result = syncTypedTextFields(e, {
    clearSource: true
  });

  assertEquals("clear-source-target", e.field("Zahl"), 42);
  assertEquals("clear-source-source", e.field("Zahl(t-i)"), "");
  assertEquals("clear-source-changed", result.changedPairs, 1);
}

function testDryRunReportsWithoutWriting() {
  var e = makeEntry({
    "Zahl(t-i)": "42",
    Zahl: null
  });
  reset(["Zahl(t-i)", "Zahl"], [e], e);

  var result = syncTypedTextFields(e, {
    dryRun: true
  });

  assertEquals("dry-run-target", e.field("Zahl"), null);
  assertEquals("dry-run-changed", result.changedPairs, 1);
}

function testBulkHostListEntries() {
  var e1 = makeEntry({
    "Zahl(t-i)": "1",
    Zahl: null
  });
  var e2 = makeEntry({
    "Zahl(t-i)": "2",
    Zahl: null
  });
  reset(["Zahl(t-i)", "Zahl"], [e1, e2], e1);

  var result = syncTypedTextFields(makeHostList([e1, e2]));

  assertEquals("bulk-host-e1", e1.field("Zahl"), 1);
  assertEquals("bulk-host-e2", e2.field("Zahl"), 2);
  assertEquals("bulk-host-processed", result.entriesProcessed, 2);
  assertEquals("bulk-host-changed", result.changedPairs, 2);
}

function testAmbiguousTargetSkips() {
  var e = makeEntry({
    "Wert(t-i)": "1",
    Wert: null,
    "Wert [alt]": null
  });
  reset(["Wert(t-i)", "Wert", "Wert [alt]"], [e], e);

  var result = syncTypedTextFields(e);

  assertEquals("ambiguous-target-skipped", result.skippedPairs, 1);
  assertEquals("ambiguous-target-unchanged", e.field("Wert"), null);
}

testSyncCurrentEntryByDefault();
testSyncMultipleTypes();
testOnlyIfTargetEmptySkipsFilledTarget();
testClearSourceAfterWrite();
testDryRunReportsWithoutWriting();
testBulkHostListEntries();
testAmbiguousTargetSkips();

WScript.Echo("OK");
