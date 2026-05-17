var fso = new ActiveXObject("Scripting.FileSystemObject");
var shell = new ActiveXObject("WScript.Shell");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var collectPath = fso.BuildPath(scriptDir, "..\\core\\collectAtags.js");
var code = fso.OpenTextFile(collectPath, 1).ReadAll();

eval(code);

function print(s) {
  WScript.Echo(String(s));
}

function fail(msg) {
  throw new Error(msg);
}

function makeEntry(fields) {
  return {
    field: function(name) {
      return fields[name];
    }
  };
}

function entry() {
  return null;
}

function findItem(items, name) {
  var i;
  for (i = 0; i < items.length; i++) {
    if (items[i].name === name) return items[i];
  }
  return null;
}

function dumpItems(input) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var i;
  for (i = 0; i < result.items.length; i++) {
    print(
      "item[" + i + "] name=" + result.items[i].name +
      " attrText=" + result.items[i].attrText +
      " attrValue=" + result.items[i].attrValue +
      " rowValue=" + result.items[i].rowValue +
      " rowUnit=" + result.items[i].rowUnit
    );
  }
}

function assertItem(label, input, expectedName, expectedAttrText, expectedAttrValue, expectedRowValue, expectedRowUnit) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, expectedName);

  if (!item) fail(label + ": item '" + expectedName + "' not found in " + input);
  if (item.attrText !== expectedAttrText) fail(label + ": attrText expected '" + expectedAttrText + "' but got '" + item.attrText + "'");
  if (String(item.attrValue) !== String(expectedAttrValue)) fail(label + ": attrValue expected '" + expectedAttrValue + "' but got '" + item.attrValue + "'");
  if (String(item.rowValue) !== String(expectedRowValue)) fail(label + ": rowValue expected '" + expectedRowValue + "' but got '" + item.rowValue + "'");
  if (String(item.rowUnit) !== String(expectedRowUnit)) fail(label + ": rowUnit expected '" + expectedRowUnit + "' but got '" + item.rowUnit + "'");
}

function assertDisplayName(label, input, expectedName, expectedDisplayName) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, expectedName);

  if (!item) fail(label + ": item '" + expectedName + "' not found in " + input);
  if (item.displayName !== expectedDisplayName) fail(label + ": displayName expected '" + expectedDisplayName + "' but got '" + item.displayName + "'");
}

function assertArray(label, actual, expected) {
  var i;
  if (!actual || actual.length !== expected.length) {
    fail(label + ": expected length " + expected.length + " but got " + (actual ? actual.length : "null"));
  }
  for (i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      fail(label + "[" + i + "]: expected '" + expected[i] + "' but got '" + actual[i] + "'");
    }
  }
}

function assertCats(label, input, expectedName, expectedCats) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, expectedName);

  if (!item) fail(label + ": item '" + expectedName + "' not found in " + input);
  assertArray(label + "-cats", item.cats, expectedCats);
}

function assertCategoryTag(label, input, categoryName, expectedMembers, expectedDisplayName) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, categoryName);

  if (!item) fail(label + ": category '" + categoryName + "' not found in " + input);
  assertArray(label + "-members", item.attrValue, expectedMembers);
  if (item.kind !== "category" || item.isCategory !== true) {
    fail(label + ": expected category marker");
  }
  if (expectedMembers.length > 1 && item.attrText !== expectedMembers.join(", ")) {
    fail(label + ": attrText expected '" + expectedMembers.join(", ") + "' but got '" + item.attrText + "'");
  }
  if (expectedDisplayName != null && item.displayName !== expectedDisplayName) {
    fail(label + ": displayName expected '" + expectedDisplayName + "' but got '" + item.displayName + "'");
  }
}

function assertCategorySigns(label, input, categoryName, expectedSigns) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, categoryName);
  var signs;
  var k;

  if (!item) fail(label + ": category '" + categoryName + "' not found in " + input);
  signs = item.categoryChildSigns || {};
  for (k in expectedSigns) {
    if (!expectedSigns.hasOwnProperty(k)) continue;
    if (signs[k] !== expectedSigns[k]) {
      fail(label + ": sign for '" + k + "' expected '" + expectedSigns[k] + "' but got '" + signs[k] + "'");
    }
  }
}

function assertSimpleTag(label, input, expectedName) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, expectedName);

  if (!item) fail(label + ": item '" + expectedName + "' not found in " + input);
  if (item.attrText !== null) fail(label + ": expected null attrText but got '" + item.attrText + "'");
  if (item.attrValue !== null) fail(label + ": expected null attrValue but got '" + item.attrValue + "'");
}

function assertMissing(label, input, unexpectedName) {
  var result = collectAtags({
    entryObj: makeEntry({ Note: input }),
    textFields: ["Note"]
  });
  var item = findItem(result.items, unexpectedName);

  if (item) fail(label + ": unexpected item '" + unexpectedName + "' found in " + input);
}

function assertItemsWithOptions(label, input, options, expected) {
  var cfg = options || {};
  var result;
  var i;
  var found;
  var item;

  cfg.entryObj = makeEntry({ Note: input });
  cfg.textFields = ["Note"];
  result = collectAtags(cfg);

  for (i = 0; i < expected.length; i++) {
    found = false;
    for (var j = 0; j < result.items.length; j++) {
      item = result.items[j];
      if (
        item.name === expected[i].name &&
        item.attrText === expected[i].attrText &&
        String(item.attrValue) === String(expected[i].attrValue)
      ) {
        found = true;
        break;
      }
    }
    if (!found) {
      fail(label + ": expected item " + expected[i].name + " " + expected[i].attrText + " not found");
    }
  }
}

if (WScript.Arguments.length > 0) {
  dumpItems(WScript.Arguments(0));
  WScript.Quit(0);
}

assertSimpleTag("hash-prefix", "#tag", "tag");
assertSimpleTag("cleaner-simple-tag-suffix", "tag\u02E3", "tag");
assertSimpleTag("cleaner-simple-tag-suffix-bar", "|| tag\u02E3", "tag");
assertItem("plain-int", "tag3", "tag", "+3", 3, null, null);
assertItem("plus-int", "tag+3", "tag", "+3", 3, null, null);
assertItem("minus-int", "tag-2", "tag", "-2", -2, null, null);
assertItem("plus-cumulative", "tag+", "tag", "+", 1, null, null);
assertItem("minus-cumulative", "tag-", "tag", "-", -1, null, null);
assertItem("plusplus", "tag++", "tag", "++", 2, null, null);
assertItem("minusminus", "tag--", "tag", "--", -2, null, null);
assertItem("plusplus-with-suffix", "tag++2", "tag", "++2", 2, null, null);
assertItem("minusminus-with-suffix", "tag--3", "tag", "--3", -3, null, null);
assertItem("plusplus-with-zero-suffix", "tag++02", "tag", "++02", 2, null, null);
assertItem("minusminus-with-zero-suffix", "tag--02", "tag", "--02", -2, null, null);
assertItem("large-cumulative-suffix", "tag++324", "tag", "++324", 324, null, null);
assertItem("long-plus-run-cumulative", "tag++++", "tag", "++4", 4, null, null);
assertItem("long-minus-run-cumulative", "tag----", "tag", "--4", -4, null, null);
assertItem("zero-null", "tag00", "tag", "00", null, null, null);
assertItem("zero-number", "tag0", "tag", "0", 0, null, null);
assertItem("zero-decimal-compact", "tag02", "tag", "0,2", 0.2, null, null);
assertItem("zero-decimal-comma", "tag0,2", "tag", "0,2", 0.2, null, null);
assertItem("negative-zero-decimal-compact", "tag-02", "tag", "-0,2", -0.2, null, null);
assertItem("negative-zero-decimal-comma", "tag-0,2", "tag", "-0,2", -0.2, null, null);
assertMissing("underscore-word-zero-null-not-tag", "test_00", "test");
assertMissing("underscore-word-number-not-tag", "test_3", "test");
assertItem("plus-decimal", "emo+1,3", "emo", "+1,3", 1.3, null, null);
assertItem("minus-decimal", "emo-12,32", "emo", "-12,32", -12.32, null, null);
assertItem("colon-number", "tag: 5", "tag", "+5", 5, null, null);
assertItem("colon-text", "tag: \"text\"", "tag", "text", "text", null, null);
assertItem("colon-compact-text", "tag:inhalt", "tag", "inhalt", "inhalt", null, null);
assertItem("colon-double-text", "tag:: inhalt", "tag", "inhalt", "inhalt", null, null);
assertItem("colon-double-quoted-sentence", "Aussage:: \"das ist ein Satz\"", "Aussage", "das ist ein Satz", "das ist ein Satz", null, null);
assertMissing("colon-template-ignored", "test:_", "test");
assertMissing("colon-explicit-template-ignored", "test:: _", "test");
assertMissing("colon-normal-text-not-tag", "text: inhalt", "text");
assertItem("inverted-tag-value", "inhalt(:tag)", "tag", "inhalt", "inhalt", null, null);
assertItem("inverted-tag-quoted-sentence", "\"das ist ein Satz\"(:Aussage)", "Aussage", "das ist ein Satz", "das ist ein Satz", null, null);
assertItem("inverted-tag-row", "2: \"foo\"(:Aussage)", "Aussage", "foo", "foo", 2, null);
assertItem("inverted-tag-alias", "@@Aussage (A)\n\"das ist\"(:A)", "Aussage", "das ist", "das ist", null, null);
assertSimpleTag("quoted-tag", "'tag name'#", "tag_name");
assertSimpleTag("quoted-tag-double", "\"tag name\"#", "tag_name");
assertItem("quoted-hash-decimal", "\"test das hier\"#4,1,", "test_das_hier", "4,1", 4.1, null, null);
assertItem("quoted-hash-int", "'und das'#7", "und_das", "+7", 7, null, null);
assertItem("quoted-hash-single-text", "'und das'#'das das'", "und_das", "das das", "das das", null, null);
assertItem("quoted-hash-double-text", "'und das'#\"das hier\"", "und_das", "das hier", "das hier", null, null);
assertItem("hash-number", "test#5,", "test", "+5", 5, null, null);
assertItem("hash-text", "test#string", "test", "string", "string", null, null);
assertItem("row-plus", "5h: emo3", "emo", "+3", 3, 5, "h");
assertItem("row-decimal", "2,5: focus+1", "focus", "+1", 1, 2.5, null);
assertMissing("unsigned-decimal-disallowed", "emo1,2", "emo");
assertMissing("quoted-num-token-single", "'emo3'", "emo");
assertMissing("quoted-num-token-double", "\"emo3\"", "emo");
assertItem("quote-outside-token", "\"emo3\" focus2", "focus", "+2", 2, null, null);
assertMissing("quoted-simple-hash-inside-text", "10: MetricC1, MetricB1 geringer, MetricD1, ' das hier# sollte aber nicht#23 drin sein'", "hier");
assertMissing("quoted-hash-value-inside-text", "10: MetricC1, MetricB1 geringer, MetricD1, ' das hier# sollte aber nicht#23 drin sein'", "nicht");
assertMissing("quoted-colon-inside-text", "'tag: 5'", "tag");
assertItem("quoted-text-outside-row", "10: MetricC1, MetricB1 geringer, MetricD1, ' das hier# sollte aber nicht#23 drin sein'", "MetricC", "+1", 1, 10, null);
assertItem("alias-short", "@@SymptomA (sa): SymptomA, SymAlias\nsa2", "SymptomA", "+2", 2, null, null);
assertDisplayName("alias-short-display", "@@SymptomA (sa): SymptomA, SymAlias\nSymptomA2", "SymptomA", "sa");
assertItem("alias-duplicate-default-last-wins", "@@Pos: x\n@@Neg: -x\nx2", "Neg", "-2", -2, null, null);
assertMissing("alias-duplicate-default-no-first-target", "@@Pos: x\n@@Neg: -x\nx2", "Pos");
assertItemsWithOptions(
  "alias-duplicate-multi-targets",
  "@@Pos: x\n@@Neg: -x\nx2",
  { multiAliasTargets: true },
  [
    { name: "Pos", attrText: "+2", attrValue: 2 },
    { name: "Neg", attrText: "-2", attrValue: -2 }
  ]
);
assertItemsWithOptions(
  "alias-duplicate-multi-targets-hash",
  "@@Pos: x\n@@Neg: -x\nx#2",
  { multiAliasTargets: true },
  [
    { name: "Pos", attrText: "+2", attrValue: 2 },
    { name: "Neg", attrText: "-2", attrValue: -2 }
  ]
);
assertCats("alias-category-on-parsed-tag", "@@tag1 (tg1)[self, help]: 3\ntg1#3", "tag1", ["self", "help"]);
assertCategoryTag("alias-category-item", "@@@self (sf)\n@@tag1 (tg1)[self]: 3\n@@tag2 (tg2)[self]: 3\ntg1# tg2#", "self", ["tag1", "tag2"], "sf");
assertMissing("cat-alias-is-not-normal-tag-alias", "@@@self (sf)\nsf2", "self");
assertMissing("cat-alias-fixed-children-without-occurrence", "@@@help: ActivityA, ActivityB, ActivityC", "help");
assertCategoryTag("cat-alias-fixed-children-with-occurrence", "@@@help: ActivityA, ActivityB, ActivityC\nActivityA1", "help", ["ActivityA"], "help");
assertCategoryTag("cat-alias-fixed-negative-child", "@@@Body: -SymptomA, BodySafe\nSymptomA2 BodySafe1", "Body", ["SymptomA", "BodySafe"], "Body");
assertCategorySigns("cat-alias-fixed-negative-child-sign", "@@@Body: -SymptomA, BodySafe\nSymptomA2 BodySafe1", "Body", { symptoma: -1, bodysafe: 1 });
assertCategoryTag("cat-alias-fixed-negative-short-child", "@@@Body: -sa, BodySafe\n@@SymptomA (sa)\nsa2 BodySafe1", "Body", ["SymptomA", "BodySafe"], "Body");
assertCategorySigns("cat-alias-fixed-negative-short-child-sign", "@@@Body: -sa, BodySafe\n@@SymptomA (sa)\nsa2 BodySafe1", "Body", { symptoma: -1, bodysafe: 1 });
assertCategoryTag("cat-alias-fixed-negative-short-child-before-cat", "@@SymptomA (sa)\n@@@Body: -sa, BodySafe\nsa2 BodySafe1", "Body", ["SymptomA", "BodySafe"], "Body");
assertCategoryTag("cat-alias-fixed-negative-long-child-with-separate-alias", "@@SymptomA (SA):  sa\n@@@Body: -SymptomA\nsa2", "Body", ["SymptomA"], "Body");
assertCategorySigns("cat-alias-fixed-negative-long-child-with-separate-alias-sign", "@@SymptomA (SA):  sa\n@@@Body: -SymptomA\nsa2", "Body", { symptoma: -1 });
assertCategoryTag("cat-alias-fixed-negative-long-child-with-superscript-alias", "@@SymptomA (SA):  sa\n@@@Body: -SymptomA\nsa\u00B2", "Body", ["SymptomA"], "Body");
assertCategorySigns("cat-alias-fixed-negative-long-child-with-superscript-alias-sign", "@@SymptomA (SA):  sa\n@@@Body: -SymptomA\nsa\u00B2", "Body", { symptoma: -1 });
assertCategoryTag("cat-alias-fixed-negative-long-child-with-readable-superscript-alias", "@@SymptomA (SA):  sa\n@@@Body: -SymptomA\n| sa\u00B2", "Body", ["SymptomA"], "Body");
assertCategoryTag("cat-alias-children-are-not-aliases", "@@@help: ActivityA, ActivityB\n@@ActivityA (Sp): play\nplay2", "help", ["ActivityA"], "help");
assertCategoryTag("alias-category-line-without-prefix", "tag1 (tg1)[self]: 3\ntag2 (tg2)[self]: 3\ntg1# tg2#", "self", ["tag1", "tag2"], "self");
assertItem("alias-fixed-bare", "@@SymptomA (SA): sa, SymptomAlias1\n#SymptomAlias", "SymptomA", "+1", 1, null, null);
assertItem("alias-fixed-overrides-value", "@@SymptomA (SA): sa, SymptomAlias1\nSymptomAlias3", "SymptomA", "+1", 1, null, null);
assertItem("alias-fixed-tagbar", "@@SymptomA (SA): sa, SymptomAlias1\n|| SymptomAlias", "SymptomA", "+1", 1, null, null);
assertMissing("alias-line-not-parsed", "@@SymptomA (SA): sa, SymptomAlias1", "SymptomA");
assertItem("alias-short-without-list", "@@Wirkung (Wk)\nWk++", "Wirkung", "++", 2, null, null);
assertDisplayName("alias-short-without-list-display", "@@Wirkung (Wk)\nWirkung++", "Wirkung", "Wk");
assertItem("superscript-normal-text-plus", "emo\u207A\u00B2", "emo", "+2", 2, null, null);
assertItem("superscript-normal-text-decimal", "tag\u207B\u2070\u00B3", "tag", "-0,3", -0.3, null, null);
assertItem("superscript-normal-text-plusplus", "stuff\u207A\u207A", "stuff", "++", 2, null, null);
assertItem("superscript-large-cumulative-with-word-number", "test_345\u207A\u207A\u00B3\u00B2\u2074", "test_345", "++324", 324, null, null);
assertItem("superscript-long-plus-run-cumulative", "tag\u207A\u207A\u207A\u207A", "tag", "++4", 4, null, null);
assertItem("superscript-normal-text-null", "tag\u2070\u2070", "tag", "00", null, null, null);
assertItem("alias-declaration-without-short", "@@Gut\n| Gut\u207F", "Gut", null, null, null, null);
assertItem("readable-row-superscript", "@@Wirkung (Wk)\n0,7: Text\n| MetricF\u207B\u00B2 Stress\u2070 MetricG\u207B\u2070\u2075 Wk\u207A\u00B2  Gut\u207F W\u00E4rme\u207F", "MetricF", "-2", -2, 0.7, null);
assertItem("readable-row-decimal-superscript", "0,7: Text\n| MetricG\u207B\u2070\u2075", "MetricG", "-0,5", -0.5, 0.7, null);
assertItem("readable-row-alias-superscript", "@@Wirkung (Wk)\n0,7: Text\n| Wk\u207A\u00B2", "Wirkung", "+2", 2, 0.7, null);
assertItem("readable-row-alias-plusplus", "@@Wirkung (Wk)\n0,7: Text\n| Wk\u207A\u207A", "Wirkung", "++", 2, 0.7, null);
assertSimpleTag("readable-row-bare-superscript", "0,7: Text\n| Gut\u207F", "Gut");
assertItem("readable-global-number", "|| tag\u207A\u00B9  test: 12,5  info: \"neuer lauf\"  trial\u207F", "tag", "+1", 1, null, null);
assertItem("readable-global-decimal", "|| tag\u207A\u00B9  info: \"neuer lauf\" test: 12,5  trial\u207F", "test", "12,5", 12.5, null, null);
assertItem("readable-global-text", "|| tag\u207A\u00B9  test: 12,5  info: \"neuer lauf\"  trial\u207F", "info", "neuer lauf", "neuer lauf", null, null);
assertSimpleTag("readable-global-bare", "|| tag\u207A\u00B9  test: 12,5  info: \"neuer lauf\"  trial\u207F", "trial");
assertItem("exclusive-readable-leading-quote", "bodytag2\n\"| tag\u00B3", "tag", "+3", 3, null, null);
assertMissing("exclusive-readable-leading-quote-skips-body", "bodytag2\n\"| tag\u00B3", "bodytag");
assertItem("readable-global-double-bar-is-not-exclusive-body", "bodytag2\n|| tag\u00B3", "bodytag", "+2", 2, null, null);

print("OK");
