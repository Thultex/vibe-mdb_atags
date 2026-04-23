var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\timeMarker.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

function print(s) {
  WScript.Echo(String(s));
}

function fail(msg) {
  throw new Error(msg);
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

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function testInlineInsertForSingleTextLine() {
  var entryObj = makeEntry({
    Note: "test",
    Hours: 2
  });

  appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5,
    maxHours: 30
  });

  assertEquals("inline-single-line", entryObj.field("Note"), "2: test");
}

function testSkipsWhenDefaultLimitExceeded() {
  var entryObj = makeEntry({
    Note: "start",
    Hours: 30.2
  });

  appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5
  });

  assertEquals("default-limit-skip", entryObj.field("Note"), "start");
}

function testAllowsDisablingLimit() {
  var entryObj = makeEntry({
    Note: "start",
    Hours: 30.5
  });

  appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5,
    maxHours: null
  });

  assertEquals("disable-limit", entryObj.field("Note"), "30,5: start");
}

function testKeepsExistingTimeBlockFormatting() {
  var entryObj = makeEntry({
    Note: "1: info\n\ntest",
    Hours: 2
  });

  appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5,
    maxHours: 30
  });

  assertEquals("existing-block", entryObj.field("Note"), "1: info\n2: \n\ntest");
}

testInlineInsertForSingleTextLine();
testSkipsWhenDefaultLimitExceeded();
testAllowsDisablingLimit();
testKeepsExistingTimeBlockFormatting();

print("OK");
