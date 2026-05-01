var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\3_workflow\\timeMarker.js");

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

function testCleansWhenDefaultLimitExceeded() {
  var entryObj = makeEntry({
    Note: "1: \n\n1,5: info\n\n2: \n\n3: weiter",
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

  assertEquals("default-limit-cleanup", entryObj.field("Note"), "1,5: info\n3: weiter");
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

function testRemovesOldEmptyMarkersWhenAddingNewOne() {
  var entryObj = makeEntry({
    Note: "1: \n1,5: info\n\ntest",
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

  assertEquals("remove-old-empty-marker", entryObj.field("Note"), "1,5: info\n2: \n\ntest");
}

function testRemovesBlankLinesLeftBetweenTimestamps() {
  var entryObj = makeEntry({
    Note: "1: info\n\n1,5: \n\n2: weiter\n\ntest",
    Hours: 2.5
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

  assertEquals("remove-blank-between-timestamps", entryObj.field("Note"), "1: info\n2: weiter\n2,5: \n\ntest");
}

function testRemovesBlankBetweenNewMarkerAndSingleTextLine() {
  var entryObj = makeEntry({
    Note: "1: \n\ntext",
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

  assertEquals("remove-blank-between-current-marker-and-text", entryObj.field("Note"), "2: text");
}

function testRemovesBlankBetweenFilledAndCurrentTimestamp() {
  var entryObj = makeEntry({
    Note: "13: Nackenschmerzen\u207A\u00B2, Ks\u207A\u00B9\n\n15: ",
    Hours: 15
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

  assertEquals("remove-blank-between-filled-and-current-timestamp", entryObj.field("Note"), "13: Nackenschmerzen\u207A\u00B2, Ks\u207A\u00B9\n15: ");
}

function testWritesCleanedBlankWhenSameTimestampAlreadyExists() {
  var entryObj = makeEntry({
    Note: "13: Nackenschmerzen\u207A\u00B2, Ks\u207A\u00B9\n\n15: weiter",
    Hours: 15
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

  assertEquals("write-cleaned-blank-when-same-timestamp-exists", entryObj.field("Note"), "13: Nackenschmerzen\u207A\u00B2, Ks\u207A\u00B9\n15: weiter");
}

function testUsesColonPlaceholderAsCurrentMarker() {
  var entryObj = makeEntry({
    Note: ": Text",
    Hours: 12.5
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

  assertEquals("colon-placeholder-current-marker", entryObj.field("Note"), "12,5: Text");
}

function testUsesColonPlaceholderAfterExistingMarker() {
  var entryObj = makeEntry({
    Note: "0: Nase zu, ks\u00B2\n: sadf",
    Hours: 3
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

  assertEquals("colon-placeholder-after-existing-marker", entryObj.field("Note"), "0: Nase zu, ks\u00B2\n3: sadf");
}

function testRemovesEmptyColonPlaceholder() {
  var entryObj = makeEntry({
    Note: ":\n\nText",
    Hours: 12.5
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

  assertEquals("empty-colon-placeholder", entryObj.field("Note"), "12,5: Text");
}

function testCleanupPlaceholdersDoesNotInsertMarker() {
  var entryObj = makeEntry({
    Note: "Intro\n: Text",
    Hours: 2
  });

  cleanupTimeMarkerPlaceholders({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    stepHours: 0.5
  });

  assertEquals("cleanup-placeholders-no-insert", entryObj.field("Note"), "Intro\n: Text");
}

function testCleanupRemovesWhitespaceOnlyTimestamp() {
  var entryObj = makeEntry({
    Note: "1: Info\n3:   \nText"
  });

  cleanupTimeMarkerPlaceholders({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-whitespace-only-timestamp", entryObj.field("Note"), "1: Info\nText");
}

function testCleanupRemovesTrailingEmptyTimestamp() {
  var entryObj = makeEntry({
    Note: "0: Nase zu, ks\u00B2\n3: "
  });

  cleanupTimeMarkerPlaceholders({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-trailing-empty-timestamp", entryObj.field("Note"), "0: Nase zu, ks\u00B2");
}

function testCleanupRemovesTrailingEmptyTimestampWithCarriageReturn() {
  var entryObj = makeEntry({
    Note: "0: Nase zu, ks\u00B2\r3: "
  });

  cleanupTimeMarkerPlaceholders({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-cr-trailing-empty-timestamp", entryObj.field("Note"), "0: Nase zu, ks\u00B2");
}

function testCleanupRemovesNonBreakingSpaceTimestamp() {
  var entryObj = makeEntry({
    Note: "0: Nase zu, ks\u00B2\n3:\u00A0"
  });

  cleanupTimeMarkerPlaceholders({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-nbsp-empty-timestamp", entryObj.field("Note"), "0: Nase zu, ks\u00B2");
}

function testCleanupAcceptsTextFieldAlias() {
  var entryObj = makeEntry({
    Note: "0: Nase zu, ks\u00B2\n3: "
  });

  cleanupTimeMarkerPlaceholders({
    entryObj: entryObj,
    textField: "Note"
  });

  assertEquals("cleanup-accepts-text-field-alias", entryObj.field("Note"), "0: Nase zu, ks\u00B2");
}

testInlineInsertForSingleTextLine();
testSkipsWhenDefaultLimitExceeded();
testCleansWhenDefaultLimitExceeded();
testAllowsDisablingLimit();
testKeepsExistingTimeBlockFormatting();
testRemovesOldEmptyMarkersWhenAddingNewOne();
testRemovesBlankLinesLeftBetweenTimestamps();
testRemovesBlankBetweenNewMarkerAndSingleTextLine();
testRemovesBlankBetweenFilledAndCurrentTimestamp();
testWritesCleanedBlankWhenSameTimestampAlreadyExists();
testUsesColonPlaceholderAsCurrentMarker();
testUsesColonPlaceholderAfterExistingMarker();
testRemovesEmptyColonPlaceholder();
testCleanupPlaceholdersDoesNotInsertMarker();
testCleanupRemovesWhitespaceOnlyTimestamp();
testCleanupRemovesTrailingEmptyTimestamp();
testCleanupRemovesTrailingEmptyTimestampWithCarriageReturn();
testCleanupRemovesNonBreakingSpaceTimestamp();
testCleanupAcceptsTextFieldAlias();

print("OK");
