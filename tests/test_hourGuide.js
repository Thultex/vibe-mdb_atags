var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\z_others\\hourGuide.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

var _entryThrows = false;
var _logs = [];

function fail(msg) {
  throw new Error(msg);
}

function log(msg) {
  _logs.push(String(msg));
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

function assertLogContains(label, expectedPart) {
  var i;
  for (i = 0; i < _logs.length; i++) {
    if (String(_logs[i]).indexOf(expectedPart) >= 0) return;
  }
  fail(label + ": expected log to contain '" + expectedPart + "' but got '" + _logs.join(" | ") + "'");
}

function makeEntry(fields) {
  return {
    _fields: fields,
    _throwOnMissingSet: false,
    field: function(name) {
      if (!this._fields.hasOwnProperty(name)) throw new Error("missing field " + name);
      return this._fields[name];
    },
    set: function(name, value) {
      if (this._throwOnMissingSet && !this._fields.hasOwnProperty(name)) {
        throw new Error("missing target " + name);
      }
      this._fields[name] = value;
    }
  };
}

function entry() {
  if (_entryThrows) throw new Error("entry not ready");
  return makeEntry({});
}

function testHtmlForPeakWindow() {
  var html = makeHourGuideHtml(4, {});
  assertContains("peak-label", html, "◆ Peak · 3–7 h");
  assertContains("peak-section", html, "FOKUS");
  assertContains("sans-font", html, "font-family:sans-serif");
  assertContains("section-arrow", html, "▸ FOKUS");
  assertContains("section-rule", html, "────────");
  assertContains("row-dash", html, "• <b>Steuern</b> - <i>HF beachten</i>");
}

function testDefaultGuideContentIsComplete() {
  var html = makeHourGuideHtml(8, {});
  assertContains("abklingend-label", html, "Abklingend · 7–10 h");
  assertContains("restored-content", html, "• <b>Spannung</b> - <i>Bewegung</i>");
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

  assertContains("apply-return", html, "Startphase · 0.4–1 h");
  assertEquals("apply-target", e.field("Guide"), html);
}

function testJsonPlanFieldWithFlexibleSections() {
  var json = "{" +
    "\"maxHours\":8," +
    "\"categories\":[\"body\",\"mind\"]," +
    "\"blocks\":[{" +
      "\"label\":\"Custom - 1-2 h\"," +
      "\"from\":1," +
      "\"to\":2," +
      "\"sections\":[" +
        "{\"title\":\"Body\",\"rows\":[[\"Move\",\"**slow** walk\"]]}," +
        "{\"title\":\"Mind\",\"rows\":[{\"title\":\"Plan\",\"text\":\"one thing\"}]}" +
      "]" +
    "}]" +
  "}";
  var e = makeEntry({ Hours: "1,5", Plan: json, Guide: "" });
  var html = applyHourGuide({
    entryObj: e,
    sourceHoursField: "Hours",
    targetField: "Guide",
    planField: "Plan"
  });

  assertContains("json-label", html, "Custom - 1-2 h");
  assertContains("json-section-body", html, "BODY");
  assertContains("json-section-mind", html, "MIND");
  assertContains("json-bold", html, "<b>slow</b> walk");
  assertEquals("json-target", e.field("Guide"), html);
}

function testJsonPlanObjectFormat() {
  var html = makeHourGuideHtml(3, {
    plan: {
      categories: ["social"],
      afternoon: {
        label: "Afternoon",
        from: 2,
        to: 4,
        sections: {
          social: ["reply later"]
        }
      }
    }
  });

  assertContains("object-label", html, "Afternoon");
  assertContains("object-section", html, "SOCIAL");
  assertContains("object-row", html, "reply later");
}

function testJsonMaxHoursFromPlan() {
  var html = makeHourGuideHtml(9, {
    plan: "{\"maxHours\":8,\"blocks\":[{\"label\":\"Late\",\"from\":8,\"to\":10,\"sections\":{\"x\":[\"hide\"]}}]}"
  });

  assertEquals("plan-max-hours", html, "");
}

function testMissingTargetFieldDoesNotThrow() {
  var e = makeEntry({ Hours: "0,5" });
  e._throwOnMissingSet = true;
  _logs = [];

  var html = applyHourGuide({
    entryObj: e,
    sourceHoursField: "Hours",
    targetField: "Missing Guide"
  });

  assertContains("missing-target-return", html, "Startphase · 0.4–1 h");
  assertEquals("missing-target-not-written", e._fields.hasOwnProperty("Missing Guide"), false);
  assertLogContains("missing-target-log", "cannot write target field 'Missing Guide'");
}

function testEntryNotReadyDoesNotThrow() {
  _entryThrows = true;
  _logs = [];
  var html = applyHourGuide({
    sourceHoursField: "Hours",
    targetField: "Guide"
  });
  _entryThrows = false;

  assertEquals("entry-not-ready-empty", html, "");
  assertLogContains("entry-not-ready-log", "entry not available");
}

function testMissingPlanFieldFallsBackToDefault() {
  var e = makeEntry({ Hours: "4" });
  _logs = [];
  var html = applyHourGuide({
    entryObj: e,
    sourceHoursField: "Hours",
    planField: "Missing Plan"
  });

  assertContains("missing-plan-default", html, "Peak · 3–7 h");
  assertLogContains("missing-plan-log", "cannot read plan field 'Missing Plan'");
}

function testMissingSourceFieldLogsAndReturnsEmpty() {
  var e = makeEntry({ Guide: "" });
  _logs = [];
  var html = applyHourGuide({
    entryObj: e,
    sourceHoursField: "Missing Hours",
    targetField: "Guide"
  });

  assertEquals("missing-source-empty", html, "");
  assertLogContains("missing-source-log", "cannot read source field 'Missing Hours'");
}

function testEmptyHoursShowsFirstBlockByDefault() {
  var e = makeEntry({ Hours: "", Guide: "" });
  var html = applyHourGuide({
    entryObj: e,
    sourceHoursField: "Hours",
    targetField: "Guide"
  });

  assertContains("empty-hours-first-block", html, "Aufstehen");
  assertEquals("empty-hours-target", e.field("Guide"), html);
}

function testExplicitSourceEntryFeedsTargetEntry() {
  var source = makeEntry({ Hours: "4" });
  var target = makeEntry({ Guide: "" });
  var html = applyHourGuide({
    entryObj: target,
    sourceEntry: source,
    sourceHoursField: "Hours",
    targetField: "Guide"
  });

  assertContains("source-entry-peak", html, "Peak");
  assertEquals("source-entry-target", target.field("Guide"), html);
}

testHtmlForPeakWindow();
testDefaultGuideContentIsComplete();
testCutoffReturnsEmpty();
testApplyWritesTarget();
testJsonPlanFieldWithFlexibleSections();
testJsonPlanObjectFormat();
testJsonMaxHoursFromPlan();
testMissingTargetFieldDoesNotThrow();
testEntryNotReadyDoesNotThrow();
testMissingPlanFieldFallsBackToDefault();
testMissingSourceFieldLogsAndReturnsEmpty();
testEmptyHoursShowsFirstBlockByDefault();
testExplicitSourceEntryFeedsTargetEntry();

WScript.Echo("OK");
