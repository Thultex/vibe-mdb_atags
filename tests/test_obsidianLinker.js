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

function assertNotContains(label, actual, unexpectedPart) {
  if (String(actual).indexOf(unexpectedPart) >= 0) {
    fail(label + ": expected text not to contain '" + unexpectedPart + "' but got '" + actual + "'");
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

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: false
  });

  assertEquals("created-mode", result.mode, "created_overwrite");
  assertEquals("created-open-attempted", result.openResult.attempted, false);
  assertContains("overwrite-field", e.field("Overwrite Link"), "[obsidian://advanced-uri");
  assertContains("overwrite-field-target", e.field("Overwrite Link"), "](obsidian://advanced-uri");
  assertContains("overwrite-field-mode", e.field("Overwrite Link"), "mode=overwrite");
  assertContains("overwrite-path", e.field("Overwrite Link"), "Atomic_Habits%20(123).md");
  assertNotContains("overwrite-no-tags-by-default", obsExtractQueryParam(e.field("Overwrite Link"), "data"), "\ntags:");
  assertEquals("obsidian-field-untouched", e.field("Obsidian Link"), "");
}

function testCreatesOverwriteLinkInConfiguredFolderPath() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": ""
  });

  linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    folderPath: "Inbox\\Memento Notes\\",
    tags: "custom/tag/",
    folderAsTag: true
  });

  assertContains("configured-folder-path", e.field("Overwrite Link"), "filepath=Inbox%2FMemento%20Notes%2FAtomic_Habits%20(123).md");
  assertContains("configured-tags", obsExtractQueryParam(e.field("Overwrite Link"), "data"), "\ntags: [\"Inbox/Memento_Notes\", \"custom/tag\"]\n");
  assertNotContains("configured-tags-no-trailing-slash", obsExtractQueryParam(e.field("Overwrite Link"), "data"), "custom/tag/\"");
}

function testFolderAsTagUsesDefaultFolderWithoutTrailingSlash() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": ""
  });

  linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    folderAsTag: true
  });

  assertContains("default-folder-as-tag", obsExtractQueryParam(e.field("Overwrite Link"), "data"), "\ntags: \"memento/Connector_DB\"\n");
}

function testUidClearsOverwriteAndWritesConnectedObsidianField() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "old overwrite",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=ExampleVault&amp;uid=abc123">open</a>'
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: false
  });

  assertEquals("uid-mode", result.mode, "connected_obsidian");
  assertEquals("uid-open-attempted", result.openResult.attempted, false);
  assertEquals("uid-overwrite-cleared", e.field("Overwrite Link"), "");
  assertEquals("uid-overwrite-return", result.overwriteUri, "");
  assertContains("uid-open-link-label", e.field("Obsidian Link"), "[obsidian://adv-uri?vault=ExampleVault&uid=abc123]");
  assertContains("uid-open-link", e.field("Obsidian Link"), "(obsidian://adv-uri?vault=ExampleVault&uid=abc123)");
  if (String(e.field("Obsidian Link")).indexOf("Link: [") >= 0) {
    fail("uid-existing-link-should-not-have-link-prefix");
  }
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
    Link: '<a href="obsidian://adv-uri?vault=ExampleVault&amp;uid=abc123">open</a>'
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Link",
    obsidianMarkdownField: "Link",
    vault: "ExampleVault"
  });

  assertEquals("same-field-mode", result.mode, "connected_obsidian_same_field");
  assertEquals("same-field-overwrite-return", result.overwriteUri, "");
  assertContains("same-field-keeps-open-link", e.field("Link"), "obsidian://adv-uri?vault=ExampleVault&uid=abc123");
  if (String(e.field("Link")).indexOf("mode=overwrite") >= 0) {
    fail("same-field-should-not-overwrite-existing-obsidian-link");
  }
}

function testMarkdownLinkDoesNotSelfNestOnRepeatedRuns() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": "[obsidian://adv-uri?vault=ExampleVault&uid=abc123](obsidian://adv-uri?vault=ExampleVault&uid=abc123)"
  });

  var first = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault"
  });
  var firstText = e.field("Obsidian Link");
  var second = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault"
  });

  assertEquals("markdown-repeat-first-mode", first.mode, "connected_obsidian");
  assertEquals("markdown-repeat-second-mode", second.mode, "connected_obsidian");
  assertEquals("markdown-repeat-stable", e.field("Obsidian Link"), firstText);
  assertEquals("markdown-repeat-text", e.field("Obsidian Link"), "[obsidian://adv-uri?vault=ExampleVault&uid=abc123](obsidian://adv-uri?vault=ExampleVault&uid=abc123)");
}

function testConnectedLinkUsesCustomWindowsBaseTemplate() {
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=ExampleVault&amp;uid=abc123">open</a>'
  });

  linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    windowsOpenBase: "http://localhost:3999/go/{uri}"
  });

  assertContains("custom-win-base", e.field("Obsidian Link"), "http://localhost:3999/go/obsidian%3A%2F%2Fadv-uri");
  assertContains("custom-win-label", e.field("Obsidian Link"), "\nWin: [");
}

function testOpenOptionCallsConfiguredOpenFunctionForConnectedLink() {
  var openedUri = "";
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "old overwrite",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=ExampleVault&amp;uid=abc123">open</a>'
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: true,
    openFunction: function(uri) {
      openedUri = uri;
    }
  });

  assertEquals("open-option-mode", result.mode, "connected_obsidian");
  assertEquals("open-option-attempted", result.openResult.attempted, true);
  assertEquals("open-option-ok", result.openResult.ok, true);
  assertEquals("open-option-method", result.openResult.method, "openFunction");
  assertEquals("open-option-uri", openedUri, "obsidian://adv-uri?vault=ExampleVault&uid=abc123");
}

function testFolderAsTagDoesNotBlockOpeningExistingLink() {
  var openedUri = "";
  var uri = "obsidian://adv-uri?vault=RasObs&uid=cbd6a875-9335-4d9b-a347-bc0ccd78fea9";
  var e = makeEntry({
    "Obsidian Link": uri
  });

  var result = linkObsidianUri({
    entryObj: e,
    obsidianMarkdownField: "Obsidian Link",
    folderAsTag: true,
    openFunction: function(uri) {
      openedUri = uri;
    }
  });

  assertEquals("folder-as-tag-existing-mode", result.mode, "connected_obsidian_same_field");
  assertEquals("folder-as-tag-existing-open-ok", result.openResult.ok, true);
  assertEquals("folder-as-tag-existing-open-uri", openedUri, uri);
}

function testOpenOptionCallsConfiguredOpenFunctionForCreateLink() {
  var openedUri = "";
  var e = makeEntry({
    Text: "Body",
    Link: ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Link",
    obsidianMarkdownField: "Link",
    vault: "ExampleVault",
    open: true,
    openFunction: function(uri) {
      openedUri = uri;
    }
  });

  assertEquals("open-create-mode", result.mode, "opened_overwrite_pending_insert_same_field");
  assertEquals("open-create-ok", result.openResult.ok, true);
  assertContains("open-create-uri", openedUri, "obsidian://advanced-uri");
  assertContains("open-create-mode-param", openedUri, "mode=overwrite");
  assertEquals("open-create-pending", e.field("Link"), "Link: EINFÜGEN");
  assertEquals("open-create-overwrite-return", result.overwriteUri, "");
}

function testOpenCreateSeparateFieldsClearsOverwriteAndMarksPendingInsert() {
  var openedUri = "";
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "",
    "Obsidian Link": ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: true,
    openFunction: function(uri) {
      openedUri = uri;
    }
  });

  assertEquals("open-separate-mode", result.mode, "opened_overwrite_pending_insert");
  assertContains("open-separate-uri", openedUri, "obsidian://advanced-uri");
  assertEquals("open-separate-overwrite-cleared", e.field("Overwrite Link"), "");
  assertEquals("open-separate-pending", e.field("Obsidian Link"), "Link: EINFÜGEN");
}

function testPendingInsertDoesNotOpenOrOverwriteAgain() {
  var opened = 0;
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "old overwrite",
    "Obsidian Link": "Link: EINFÜGEN"
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: true,
    openFunction: function() {
      opened += 1;
    }
  });

  assertEquals("pending-insert-mode", result.mode, "pending_insert");
  assertEquals("pending-insert-not-opened", opened, 0);
  assertEquals("pending-insert-overwrite-cleared", e.field("Overwrite Link"), "");
  assertEquals("pending-insert-kept", e.field("Obsidian Link"), "Link: EINFÜGEN");
}

function testOpenOptionFallsBackToJavaTypeRundllOnDesktop() {
  var openedArgs = null;
  var previousJava = typeof Java === "undefined" ? null : Java;
  var hadJava = typeof Java !== "undefined";
  var e = makeEntry({
    Text: "Body",
    "Overwrite Link": "old overwrite",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=ExampleVault&amp;uid=abc123">open</a>'
  });

  Java = {
    type: function(name) {
      if (name === "java.awt.Desktop") {
        return {
          getDesktop: function() {
            return {
              browse: function() {
                throw new Error("Desktop browse blocked");
              }
            };
          }
        };
      }
      if (name === "java.net.URI") {
        return function(uri) {
          this.uri = uri;
        };
      }
      if (name === "java.lang.ProcessBuilder") {
        return function(args) {
          openedArgs = args;
          this.start = function() {};
        };
      }
      throw new Error("Unexpected Java type " + name);
    }
  };

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Overwrite Link",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: true
  });

  assertEquals("open-java-rundll-method", result.openResult.method, "java_type_rundll32");
  assertEquals("open-java-rundll-command", openedArgs[0], "rundll32.exe");
  assertEquals("open-java-rundll-handler", openedArgs[1], "url.dll,FileProtocolHandler");
  assertEquals("open-java-rundll-uri", openedArgs[2], "obsidian://adv-uri?vault=ExampleVault&uid=abc123");

  if (hadJava) {
    Java = previousJava;
  } else {
    Java = undefined;
  }
}

function testSameFieldCreatesOverwriteWhenNoObsidianLinkExists() {
  var e = makeEntry({
    Text: "Body",
    Link: ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    overwriteMarkdownField: "Link",
    obsidianMarkdownField: "Link",
    vault: "ExampleVault"
  });

  assertEquals("same-field-create-mode", result.mode, "created_overwrite_same_field");
  assertContains("same-field-create-overwrite", e.field("Link"), "mode=overwrite");
  assertContains("same-field-create-markdown", e.field("Link"), "[obsidian://advanced-uri");
}

function testObsidianOnlyFieldCreatesOverwriteLink() {
  var e = makeEntry({
    Text: "Body",
    "Obsidian Link": ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault"
  });

  assertEquals("obsidian-only-mode", result.mode, "created_overwrite_same_field");
  assertContains("obsidian-only-field", e.field("Obsidian Link"), "[obsidian://advanced-uri");
  assertContains("obsidian-only-field-mode", e.field("Obsidian Link"), "mode=overwrite");
  assertContains("obsidian-only-overwrite-return", result.overwriteUri, "obsidian://advanced-uri");
  assertEquals("obsidian-only-open-attempted", result.openResult.attempted, false);
}

function testObsidianOnlyOpenFailureKeepsOverwriteLink() {
  var e = makeEntry({
    Text: "Body",
    "Obsidian Link": ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: true,
    openFunction: function() {
      throw new Error("blocked");
    }
  });

  assertEquals("obsidian-only-open-fail-mode", result.mode, "open_failed_created_overwrite_same_field");
  assertContains("obsidian-only-open-fail-field", e.field("Obsidian Link"), "[obsidian://advanced-uri");
  assertContains("obsidian-only-open-fail-return", result.overwriteUri, "obsidian://advanced-uri");
  assertEquals("obsidian-only-open-fail-attempted", result.openResult.attempted, true);
  assertEquals("obsidian-only-open-fail-ok", result.openResult.ok, false);
}

function testObsidianOnlyFieldStillOpensExistingObsidianLink() {
  var openedUri = "";
  var e = makeEntry({
    Text: "Body",
    "Obsidian Link": "[obsidian://adv-uri?vault=ExampleVault&uid=abc123](obsidian://adv-uri?vault=ExampleVault&uid=abc123)"
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    open: true,
    openFunction: function(uri) {
      openedUri = uri;
    }
  });

  assertEquals("obsidian-only-existing-mode", result.mode, "connected_obsidian_same_field");
  assertEquals("obsidian-only-existing-open", openedUri, "obsidian://adv-uri?vault=ExampleVault&uid=abc123");
  assertEquals("obsidian-only-existing-field", e.field("Obsidian Link"), "[obsidian://adv-uri?vault=ExampleVault&uid=abc123](obsidian://adv-uri?vault=ExampleVault&uid=abc123)");
}

function testFormatOnlyDoesNotCreateOrOpenOverwriteLink() {
  var opened = 0;
  var e = makeEntry({
    Text: "Body",
    "Obsidian Link": ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    formatOnly: true,
    open: true,
    openFunction: function() {
      opened += 1;
    }
  });

  assertEquals("format-only-mode", result.mode, "format_only_no_link");
  assertEquals("format-only-field", e.field("Obsidian Link"), "");
  assertEquals("format-only-overwrite-return", result.overwriteUri, "");
  assertEquals("format-only-open-attempted", result.openResult.attempted, false);
  assertEquals("format-only-not-opened", opened, 0);
}

function testFormatOnlyStillFormatsExistingObsidianLink() {
  var opened = 0;
  var e = makeEntry({
    Text: "Body",
    "Obsidian Link": '<a href="obsidian://adv-uri?vault=ExampleVault&amp;uid=abc123">open</a>'
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    formatOnly: true,
    open: true,
    openFunction: function() {
      opened += 1;
    }
  });

  assertEquals("format-only-existing-mode", result.mode, "connected_obsidian_same_field");
  assertEquals("format-only-existing-not-opened", opened, 0);
  assertEquals("format-only-existing-open-attempted", result.openResult.attempted, false);
  assertEquals("format-only-existing-field", e.field("Obsidian Link"), "[obsidian://adv-uri?vault=ExampleVault&uid=abc123](obsidian://adv-uri?vault=ExampleVault&uid=abc123)");
}

function testFormatsRegularObsidianPathLink() {
  var uri = "obsidian://open?vault=ExampleVault&file=Folder%2FAtomic%20Habits.md";
  var e = makeEntry({
    "Obsidian Link": uri
  });

  var result = formatObsidianUri({
    entryObj: e,
    field: "Obsidian Link"
  });

  assertEquals("path-link-mode", result.mode, "connected_obsidian_same_field");
  assertEquals("path-link-uri", result.obsidianUri, uri);
  assertEquals("path-link-field", e.field("Obsidian Link"), "[" + uri + "](" + uri + ")");
}

function testFormatPreservesExistingVaultAndDropsTrailingParenthesis() {
  var uri = "obsidian://adv-uri?vault=RasObs&uid=cbd6a875-9335-4d9b-a347-bc0ccd78fea9";
  var e = makeEntry({
    "Obsidian Link": uri + ")"
  });

  var result = formatObsidianUri({
    entryObj: e,
    field: "Obsidian Link"
  });

  assertEquals("existing-vault-uri", result.obsidianUri, uri);
  assertEquals("existing-vault-field", e.field("Obsidian Link"), "[" + uri + "](" + uri + ")");
  assertNotContains("existing-vault-no-example", e.field("Obsidian Link"), "ExampleVault");
  assertNotContains("existing-vault-no-encoded-parenthesis", e.field("Obsidian Link"), "%29");
}

function testPostEffectLeavesEmptyFieldUntouched() {
  var setCalls = 0;
  var e = makeEntry({
    "Obsidian Link": ""
  });
  e.set = function(name, value) {
    setCalls += 1;
    this._fields[name] = value;
  };

  var result = formatObsidianUri({
    entryObj: e,
    field: "Obsidian Link"
  });

  assertEquals("post-effect-empty-mode", result.mode, "format_only_no_link");
  assertEquals("post-effect-empty-field", e.field("Obsidian Link"), "");
  assertEquals("post-effect-empty-set-calls", setCalls, 0);
}

function testPostEffectLeavesNonObsidianUrlUntouched() {
  var setCalls = 0;
  var url = "https://example.org/note";
  var e = makeEntry({
    "Obsidian Link": url
  });
  e.set = function(name, value) {
    setCalls += 1;
    this._fields[name] = value;
  };

  var result = formatObsidianUri({
    entryObj: e,
    field: "Obsidian Link"
  });

  assertEquals("post-effect-web-url-mode", result.mode, "format_only_no_link");
  assertEquals("post-effect-web-url-field", e.field("Obsidian Link"), url);
  assertEquals("post-effect-web-url-set-calls", setCalls, 0);
}

function testCreateOverwriteLinkFalseIsFormatOnlyAlias() {
  var e = makeEntry({
    Text: "Body",
    "Obsidian Link": ""
  });

  var result = linkObsidianUri({
    entryObj: e,
    libObj: lib(),
    contentField: "Text",
    obsidianMarkdownField: "Obsidian Link",
    vault: "ExampleVault",
    createOverwriteLink: false
  });

  assertEquals("create-overwrite-false-mode", result.mode, "format_only_no_link");
  assertEquals("create-overwrite-false-field", e.field("Obsidian Link"), "");
}

testCreatesOverwriteLinkOnlyInOverwriteField();
testCreatesOverwriteLinkInConfiguredFolderPath();
testFolderAsTagUsesDefaultFolderWithoutTrailingSlash();
testUidClearsOverwriteAndWritesConnectedObsidianField();
testSameFieldMarksExistingObsidianLinkOnly();
testMarkdownLinkDoesNotSelfNestOnRepeatedRuns();
testConnectedLinkUsesCustomWindowsBaseTemplate();
testOpenOptionCallsConfiguredOpenFunctionForConnectedLink();
testFolderAsTagDoesNotBlockOpeningExistingLink();
testOpenOptionCallsConfiguredOpenFunctionForCreateLink();
testOpenCreateSeparateFieldsClearsOverwriteAndMarksPendingInsert();
testPendingInsertDoesNotOpenOrOverwriteAgain();
testOpenOptionFallsBackToJavaTypeRundllOnDesktop();
testSameFieldCreatesOverwriteWhenNoObsidianLinkExists();
testObsidianOnlyFieldCreatesOverwriteLink();
testObsidianOnlyOpenFailureKeepsOverwriteLink();
testObsidianOnlyFieldStillOpensExistingObsidianLink();
testFormatOnlyDoesNotCreateOrOpenOverwriteLink();
testFormatOnlyStillFormatsExistingObsidianLink();
testFormatsRegularObsidianPathLink();
testFormatPreservesExistingVaultAndDropsTrailingParenthesis();
testPostEffectLeavesEmptyFieldUntouched();
testPostEffectLeavesNonObsidianUrlUntouched();
testCreateOverwriteLinkFalseIsFormatOnlyAlias();

WScript.Echo("OK");
