var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\z_others\\hourGuide.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

function fail(msg) {
  throw new Error(msg);
}

function assertContains(label, actual, expectedPart) {
  if (String(actual).indexOf(expectedPart) < 0) {
    fail(label + ": expected text to contain '" + expectedPart + "' but got '" + actual + "'");
  }
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
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

function entry() {
  return makeEntry({});
}

function testHtmlForPeakWindow() {
  var html = makeHourGuideHtml(4, {});
  assertContains("peak-label", html, "Peak - 3-7 h");
  assertContains("peak-section", html, "FOCUS");
}

function testCutoffReturnsEmpty() {
  assertEquals("cutoff-empty", makeHourGuideHtml(16, { maxHours: 16 }), "");
  assertEquals("invalid-empty", makeHourGuideHtml("nope", {}), "");
}

function testApplyWritesTarget() {
  var e = makeEntry({ Hours: "0,5", Guide: "" });
  var html = applyHourGuide({
    entryObj: e,
    sourceHoursField: "Hours",
    targetField: "Guide"
  });

  assertContains("apply-return", html, "Start phase");
  assertEquals("apply-target", e.field("Guide"), html);
}

testHtmlForPeakWindow();
testCutoffReturnsEmpty();
testApplyWritesTarget();

WScript.Echo("OK");
