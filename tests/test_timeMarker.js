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

  var hasMarkers = appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5,
    maxHours: 30
  });

  assertEquals("inline-single-line", entryObj.field("Note"), "2: test");
  assertEquals("append-return-true-after-insert", hasMarkers, true);
}

function testAppendReturnsFalseWithoutSourceAndNoMarkers() {
  var entryObj = makeEntry({
    Note: "test"
  });

  var hasMarkers = appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5,
    maxHours: 30
  });

  assertEquals("append-without-source-keeps-text", entryObj.field("Note"), "test");
  assertEquals("append-return-false-without-source-no-markers", hasMarkers, false);
}

function testAppendReturnsTrueWithoutSourceWhenMarkersExist() {
  var entryObj = makeEntry({
    Note: "1: test"
  });

  var hasMarkers = appendTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    insertMode: "time_block_top",
    stepHours: 0.5,
    maxHours: 30
  });

  assertEquals("append-without-source-keeps-marker-text", entryObj.field("Note"), "1: test");
  assertEquals("append-return-true-without-source-existing-marker", hasMarkers, true);
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
    Note: "13: SymptomB\u207A\u00B2, Sa\u207A\u00B9\n\n15: ",
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

  assertEquals("remove-blank-between-filled-and-current-timestamp", entryObj.field("Note"), "13: SymptomB\u207A\u00B2, Sa\u207A\u00B9\n15: ");
}

function testWritesCleanedBlankWhenSameTimestampAlreadyExists() {
  var entryObj = makeEntry({
    Note: "13: SymptomB\u207A\u00B2, Sa\u207A\u00B9\n\n15: weiter",
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

  assertEquals("write-cleaned-blank-when-same-timestamp-exists", entryObj.field("Note"), "13: SymptomB\u207A\u00B2, Sa\u207A\u00B9\n15: weiter");
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
    Note: "0: StatusA, sa\u00B2\n: sadf",
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

  assertEquals("colon-placeholder-after-existing-marker", entryObj.field("Note"), "0: StatusA, sa\u00B2\n3: sadf");
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

function testCleanupFillsColonPlaceholderWithCurrentMarker() {
  var entryObj = makeEntry({
    Note: "Intro\n: Text",
    Hours: 2
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    stepHours: 0.5
  });

  assertEquals("cleanup-placeholders-fills-current", entryObj.field("Note"), "2: Text\n\nIntro");
}

function testCleanupFillsColonPlaceholderWithSourceAfterExistingMarker() {
  var entryObj = makeEntry({
    Note: "12: jjh\n15: ufg\n: igu",
    Hours: 16
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    stepHours: 0.5
  });

  assertEquals("cleanup-colon-placeholder-source-after-existing-marker", entryObj.field("Note"), "12: jjh\n15: ufg\n16: igu");
}

function testCleanupFillsColonPlaceholderWithZeroSource() {
  var entryObj = makeEntry({
    Note: ": utfz",
    Hours: 0
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    stepHours: 0.5
  });

  assertEquals("cleanup-colon-placeholder-zero-source", entryObj.field("Note"), "0: utfz");
}

function testCleanupRemovesWhitespaceOnlyTimestamp() {
  var entryObj = makeEntry({
    Note: "1: Info\n3:   \nText"
  });

  var hasMarkers = cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-whitespace-only-timestamp", entryObj.field("Note"), "1: Info\n\nText");
  assertEquals("cleanup-return-true-when-marker-remains", hasMarkers, true);
}

function testCleanupRemovesTemplateOnlyTimestamp() {
  var entryObj = makeEntry({
    Note: "1: Testing: __\n2: Other: _; Third#__\n3: Inhalt"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-template-only-timestamp", entryObj.field("Note"), "3: Inhalt");
}

function testCleanupKeepsFilledTemplateSlotTimestamp() {
  var entryObj = makeEntry({
    Note: "1: Testing: _safd_\n2: Other: __"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-keeps-filled-template-slot-timestamp", entryObj.field("Note"), "1: Testing: _safd_");
}

function testCleanupMovesRowsAboveDoubleColonText() {
  var entryObj = makeEntry({
    Note: "15,5: tst(:inhalt)\nnur normaler text:: der interresant ist\n16: neue row"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-moves-rows-above-double-colon-text", entryObj.field("Note"), "15,5: tst(:inhalt)\n16: neue row\n\nnur normaler text:: der interresant ist");
}

function testCleanupKeepsBlankLinesInsideFreeText() {
  var entryObj = makeEntry({
    Note: "1: info\n\nFreitext eins\n\nFreitext zwei\n\n2: weiter"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-keeps-blank-lines-inside-free-text", entryObj.field("Note"), "1: info\n2: weiter\n\nFreitext eins\n\nFreitext zwei");
}

function testCleanupFillsColonPlaceholderWithCurrentRowAfterEmptyRow() {
  var entryObj = makeEntry({
    Note: "15,5: tst(:inhalt)\n\n16: \n\nnur normaler text:: der interresant ist\n: test",
    Hours: 17
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    sourceMode: "hours",
    sourceHoursField: "Hours",
    stepHours: 0.5
  });

  assertEquals("cleanup-fills-colon-placeholder-with-current-row-after-empty-row", entryObj.field("Note"), "15,5: tst(:inhalt)\n17: test\n\nnur normaler text:: der interresant ist");
}

function testCleanupRemovesTrailingEmptyTimestamp() {
  var entryObj = makeEntry({
    Note: "0: StatusA, sa\u00B2\n3: "
  });

  var hasMarkers = cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-trailing-empty-timestamp", entryObj.field("Note"), "0: StatusA, sa\u00B2");
  assertEquals("cleanup-return-true-after-trailing-empty", hasMarkers, true);
}

function testCleanupRemovesTrailingEmptyTimestampWithCarriageReturn() {
  var entryObj = makeEntry({
    Note: "0: StatusA, sa\u00B2\r3: "
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-cr-trailing-empty-timestamp", entryObj.field("Note"), "0: StatusA, sa\u00B2");
}

function testCleanupRemovesNonBreakingSpaceTimestamp() {
  var entryObj = makeEntry({
    Note: "0: StatusA, sa\u00B2\n3:\u00A0"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-nbsp-empty-timestamp", entryObj.field("Note"), "0: StatusA, sa\u00B2");
}

function testCleanupAcceptsTextFieldAlias() {
  var entryObj = makeEntry({
    Note: "0: StatusA, sa\u00B2\n3: "
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    textField: "Note"
  });

  assertEquals("cleanup-accepts-text-field-alias", entryObj.field("Note"), "0: StatusA, sa\u00B2");
}

function testCleanupMergesSameRowsWhenConfigured() {
  var entryObj = makeEntry({
    Note: "19: hallo\n19: das ist spannend\n20: weiter"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRows: true
  });

  assertEquals("cleanup-merges-same-rows", entryObj.field("Note"), "19: hallo; das ist spannend\n20: weiter");
}

function testCleanupMergesSameRowsKeepsExactDuplicatesByDefault() {
  var entryObj = makeEntry({
    Note: "19: hallo\n19: hallo\n20: weiter"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRows: true
  });

  assertEquals("cleanup-merges-same-rows-keeps-exact-duplicates-by-default", entryObj.field("Note"), "19: hallo; hallo\n20: weiter");
}

function testCleanupMergesSameRowsWithoutExactDuplicatesWhenConfigured() {
  var entryObj = makeEntry({
    Note: "19: hallo\n19: hallo\n19: das ist spannend\n20: weiter"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRowContents: true,
    mergeSameRows: true
  });

  assertEquals("cleanup-merges-same-rows-without-exact-duplicates", entryObj.field("Note"), "19: hallo; das ist spannend\n20: weiter");
}

function testCleanupMergesSameRowsWithBoxedBooleanOptions() {
  var entryObj = makeEntry({
    Note: "2,5: 1. test\u00B9\n2,5: 2. test\u00B2\n2,5: 3. test\u00B3\n2,5: 4. test\u2074\n3,5: sa\n\n ds"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRowContents: new Boolean(true),
    mergeSameRows: new Boolean(true)
  });

  assertEquals("cleanup-merges-same-rows-with-boxed-booleans", entryObj.field("Note"), "2,5: 1. test\u00B9; 2. test\u00B2; 3. test\u00B3; 4. test\u2074\n3,5: sa\n\n ds");
}

function testCleanupMergesSameRowsWithDefaultSeparator() {
  var entryObj = makeEntry({
    Note: "2,5: 1. test\u00B9\n2,5: 2. test\u00B2\n2,5: 3. test\u00B3\n2,5: 4. test\u2074\n3,5: sa\n\nds"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRowContents: true,
    mergeSameRows: true
  });

  assertEquals("cleanup-merges-same-rows-with-default-separator", entryObj.field("Note"), "2,5: 1. test\u00B9; 2. test\u00B2; 3. test\u00B3; 4. test\u2074\n3,5: sa\n\nds");
}

function testCleanupMergedRowsAreIdempotentWhenRepeated() {
  var entryObj = makeEntry({
    Note: "2: 1. test\u00B9; 2. test\u00B2\n2: 1. test\u00B9\n2: 2. test\u00B2\n3: 3. test\u00B3; 4. test\u2074\n3: 3. test\u00B3\n3: 4. test\u2074\n\nfrei"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRowContents: true,
    mergeSameRows: true
  });

  assertEquals("cleanup-merged-rows-idempotent-first-pass", entryObj.field("Note"), "2: 1. test\u00B9; 2. test\u00B2\n3: 3. test\u00B3; 4. test\u2074\n\nfrei");

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRowContents: true,
    mergeSameRows: true
  });

  assertEquals("cleanup-merged-rows-idempotent-second-pass", entryObj.field("Note"), "2: 1. test\u00B9; 2. test\u00B2\n3: 3. test\u00B3; 4. test\u2074\n\nfrei");
}

function testCleanupRemovesExactDuplicateRowsWithoutMergingSameTimestamps() {
  var entryObj = makeEntry({
    Note: "19: hallo\n19: hallo\n19: das ist spannend\n20: weiter"
  });

  cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note",
    mergeSameRowContents: true
  });

  assertEquals("cleanup-removes-exact-duplicate-rows-without-merging-same-timestamps", entryObj.field("Note"), "19: hallo\n19: das ist spannend\n20: weiter");
}

function testCleanupReturnsFalseWhenNoMarkersRemain() {
  var entryObj = makeEntry({
    Note: "3: "
  });

  var hasMarkers = cleanupTimeMarker({
    entryObj: entryObj,
    targetTextField: "Note"
  });

  assertEquals("cleanup-removes-only-empty-marker", entryObj.field("Note"), "");
  assertEquals("cleanup-return-false-when-no-marker-remains", hasMarkers, false);
}

testInlineInsertForSingleTextLine();
testAppendReturnsFalseWithoutSourceAndNoMarkers();
testAppendReturnsTrueWithoutSourceWhenMarkersExist();
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
testCleanupFillsColonPlaceholderWithCurrentMarker();
testCleanupFillsColonPlaceholderWithSourceAfterExistingMarker();
testCleanupFillsColonPlaceholderWithZeroSource();
testCleanupRemovesWhitespaceOnlyTimestamp();
testCleanupRemovesTemplateOnlyTimestamp();
testCleanupKeepsFilledTemplateSlotTimestamp();
testCleanupMovesRowsAboveDoubleColonText();
testCleanupKeepsBlankLinesInsideFreeText();
testCleanupFillsColonPlaceholderWithCurrentRowAfterEmptyRow();
testCleanupRemovesTrailingEmptyTimestamp();
testCleanupRemovesTrailingEmptyTimestampWithCarriageReturn();
testCleanupRemovesNonBreakingSpaceTimestamp();
testCleanupAcceptsTextFieldAlias();
testCleanupMergesSameRowsWhenConfigured();
testCleanupMergesSameRowsKeepsExactDuplicatesByDefault();
testCleanupMergesSameRowsWithoutExactDuplicatesWhenConfigured();
testCleanupMergesSameRowsWithBoxedBooleanOptions();
testCleanupMergesSameRowsWithDefaultSeparator();
testCleanupMergedRowsAreIdempotentWhenRepeated();
testCleanupRemovesExactDuplicateRowsWithoutMergingSameTimestamps();
testCleanupReturnsFalseWhenNoMarkersRemain();

print("OK");
