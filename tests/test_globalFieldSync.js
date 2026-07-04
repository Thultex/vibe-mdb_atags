var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\2_syncing\\globalFieldSync.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _entries = [];
var _entryThrows = false;
var _libThrows = false;

function print(s) {
  WScript.Echo(String(s));
}

function fail(msg) {
  throw new Error(msg);
}

function makeEntry(fields, libraryObj) {
  return {
    _fields: fields,
    library: libraryObj || null,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    }
  };
}

function makeEntryWithLibFunction(fields, libraryObj) {
  var e = makeEntry(fields);
  e.library = function() {
    return libraryObj;
  };
  return e;
}

function makeLibrary(entries) {
  return {
    _entries: entries || [],
    entries: function() {
      return this._entries;
    }
  };
}

function lib() {
  return {
    entries: function() {
      if (_libThrows) throw new Error("lib not ready");
      return _entries;
    }
  };
}

function entry() {
  if (_entryThrows) throw new Error("entry not ready");
  return _entries[0];
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

function testSyncFieldToFallsBackToNextFilledEntry() {
  var target = makeEntry({ Note: "" });
  _entries = [
    makeEntry({ Note: "" }),
    makeEntry({ Note: "source" }),
    target
  ];

  var result = syncFieldTo({
    entryObj: target,
    fields: ["Note"]
  });

  assertEquals("fallback-sync-target", target.field("Note"), "source");
  assertArrayEquals("fallback-sync-updated", result.updated, ["Note"]);
}

function testSyncFieldToStopsAfterFirstTwentyEntries() {
  var i;
  var target = makeEntry({ Note: "" });

  _entries = [makeEntry({ Note: "" })];
  for (i = 1; i < 20; i++) {
    _entries.push(makeEntry({ Note: "" }));
  }
  _entries.push(makeEntry({ Note: "too-far" }));
  _entries.push(target);

  var result = syncFieldTo({
    entryObj: target,
    fields: ["Note"]
  });

  assertEquals("fallback-limit-target", target.field("Note"), "");
  assertArrayEquals("fallback-limit-skipped", result.skipped, ["Note"]);
}

function testSyncFieldBackSkipsEmptyCurrentValue() {
  var first = makeEntry({ Note: "keep" });
  var current = makeEntry({ Note: "" });
  _entries = [first, current];

  var result = syncFieldBack({
    entryObj: current,
    fields: ["Note"],
    overwrite: true
  });

  assertEquals("back-sync-empty-source", first.field("Note"), "keep");
  assertArrayEquals("back-sync-empty-skipped", result.skipped, ["Note"]);
}

function testSyncFieldBackUsesPassedEntryLibrary() {
  var wrongFirst = makeEntry({ Note: "wrong" });
  var rightFirst = makeEntry({ Note: "right" });
  var current;
  var foreignLib;

  current = makeEntry({ Note: "from current" });
  foreignLib = makeLibrary([rightFirst, current]);
  current.library = foreignLib;
  _entries = [wrongFirst];

  var result = syncFieldBack({
    entryObj: current,
    fields: ["Note"],
    overwrite: true
  });

  assertEquals("back-sync-entry-lib-target", rightFirst.field("Note"), "from current");
  assertEquals("back-sync-entry-lib-wrong-unchanged", wrongFirst.field("Note"), "wrong");
  assertArrayEquals("back-sync-entry-lib-updated", result.updated, ["Note"]);
}

function testSyncFieldBackUsesPassedEntryLibraryFunction() {
  var wrongFirst = makeEntry({ Note: "wrong" });
  var rightFirst = makeEntry({ Note: "right" });
  var foreignLib = makeLibrary([rightFirst]);
  var current = makeEntryWithLibFunction({ Note: "from function" }, foreignLib);
  foreignLib._entries.push(current);
  _entries = [wrongFirst];

  syncFieldBack({
    entryObj: current,
    fields: ["Note"],
    overwrite: true
  });

  assertEquals("back-sync-entry-lib-function-target", rightFirst.field("Note"), "from function");
  assertEquals("back-sync-entry-lib-function-wrong-unchanged", wrongFirst.field("Note"), "wrong");
}

function testSyncFieldToSkipsWhenEntryNotReady() {
  _entryThrows = true;
  _entries = [makeEntry({ Note: "source" })];

  var result = syncFieldTo({
    fields: ["Note"],
    overwrite: true
  });

  _entryThrows = false;

  assertArrayEquals("entry-not-ready-updated", result.updated, []);
  assertArrayEquals("entry-not-ready-skipped", result.skipped, []);
}

function testSyncFieldToSkipsWhenLibNotReady() {
  var target = makeEntry({ Note: "" });
  _libThrows = true;

  var result = syncFieldTo({
    entryObj: target,
    fields: ["Note"],
    overwrite: true
  });

  _libThrows = false;

  assertEquals("lib-not-ready-target", target.field("Note"), "");
  assertArrayEquals("lib-not-ready-updated", result.updated, []);
}

testSyncFieldToFallsBackToNextFilledEntry();
testSyncFieldToStopsAfterFirstTwentyEntries();
testSyncFieldBackSkipsEmptyCurrentValue();
testSyncFieldBackUsesPassedEntryLibrary();
testSyncFieldBackUsesPassedEntryLibraryFunction();
testSyncFieldToSkipsWhenEntryNotReady();
testSyncFieldToSkipsWhenLibNotReady();

print("OK");
