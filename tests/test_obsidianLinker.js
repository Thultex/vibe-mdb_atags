var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\6_integration\\obsidianLinker.js");

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
    id: "123",
    title: "Atomic Habits",
    creationTime: "2026-04-25",
    _fields: fields,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      this._fields[name] = value;
    }
  };
}

function lib() {
  return {
    name: "Connector DB"
  };
}

function entry() {
  return makeEntry({});
}

function testCreatesOverwriteLinkOnlyInOverwriteField() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": ""
  });

  var result = makeObsidianMementoUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "RasObs"
  });

  assertEquals("created-mode", result.mode, "created_overwrite");
  assertContains("overwrite-field", e.field("Overwrite Link"), "[obsidian://advanced-uri");
  assertContains("overwrite-field-target", e.field("Overwrite Link"), "](obsidian://advanced-uri");
  assertContains("overwrite-field-mode", e.field("Overwrite Link"), "mode=overwrite");
  assertContains("overwrite-path", e.field("Overwrite Link"), "Atomic_Habits%20(123).md");
  assertEquals("obsidian-field-untouched", e.field("Obsidian Link"), "");
}

function testUidClearsOverwriteAndWritesConnectedObsidianField() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "old overwrite",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=RasObs&amp;uid=abc123">open</a>'
  });

  var result = makeObsidianMementoUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "RasObs"
  });

  assertEquals("uid-mode", result.mode, "connected_obsidian");
  assertEquals("uid-overwrite-cleared", e.field("Overwrite Link"), "");
  assertEquals("uid-overwrite-return", result.overwriteUri, "");
  assertContains("uid-open-link-label", e.field("Obsidian Link"), "Link: [obsidian://adv-uri?vault=RasObs&uid=abc123]");
  assertContains("uid-open-link", e.field("Obsidian Link"), "(obsidian://adv-uri?vault=RasObs&uid=abc123)");
  if (String(e.field("Obsidian Link")).indexOf("Win:") >= 0) {
    fail("uid-windows-link-should-require-config");
  }
  if (String(e.field("Overwrite Link")).indexOf("mode=overwrite") >= 0) {
    fail("uid-overwrite-should-not-be-written");
  }
}

function testSameFieldMarksExistingObsidianLinkOnly() {
  var e = makeEntry({
    Text: "Body",
    Link: '<a href="obsidian://adv-uri?vault=RasObs&amp;uid=abc123">open</a>'
  });

  var result = makeObsidianMementoUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Link",
    obsidianMarkdownField: "Link",
    vault: "RasObs"
  });

  assertEquals("same-field-mode", result.mode, "connected_obsidian_same_field");
  assertEquals("same-field-overwrite-return", result.overwriteUri, "");
  assertContains("same-field-keeps-open-link", e.field("Link"), "obsidian://adv-uri?vault=RasObs&uid=abc123");
  if (String(e.field("Link")).indexOf("mode=overwrite") >= 0) {
    fail("same-field-should-not-overwrite-existing-obsidian-link");
  }
}

function testConnectedLinkUsesCustomWindowsBaseTemplate() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=RasObs&amp;uid=abc123">open</a>'
  });

  makeObsidianMementoUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "RasObs",
    windowsOpenBase: "http://localhost:3999/go/{uri}"
  });

  assertContains("custom-win-base", e.field("Obsidian Link"), "http://localhost:3999/go/obsidian%3A%2F%2Fadv-uri");
  assertContains("custom-win-label", e.field("Obsidian Link"), "\nWin: [");
}

function testSameFieldCreatesOverwriteWhenNoObsidianLinkExists() {
  var e = makeEntry({
    Text: "Body",
    Link: ""
  });

  var result = makeObsidianMementoUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Link",
    obsidianMarkdownField: "Link",
    vault: "RasObs"
  });

  assertEquals("same-field-create-mode", result.mode, "created_overwrite_same_field");
  assertContains("same-field-create-overwrite", e.field("Link"), "mode=overwrite");
  assertContains("same-field-create-markdown", e.field("Link"), "[obsidian://advanced-uri");
}

testCreatesOverwriteLinkOnlyInOverwriteField();
testUidClearsOverwriteAndWritesConnectedObsidianField();
testSameFieldMarksExistingObsidianLinkOnly();
testConnectedLinkUsesCustomWindowsBaseTemplate();
testSameFieldCreatesOverwriteWhenNoObsidianLinkExists();

WScript.Echo("OK");
