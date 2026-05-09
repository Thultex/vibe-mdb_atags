var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var helperPath = fso.BuildPath(scriptDir, "..\\core\\helpers.js");
var collectPath = fso.BuildPath(scriptDir, "..\\core\\collectAtags.js");
var exportPath = fso.BuildPath(scriptDir, "..\\core\\exportAtags.js");

eval(fso.OpenTextFile(helperPath, 1).ReadAll());
eval(fso.OpenTextFile(collectPath, 1).ReadAll());
eval(fso.OpenTextFile(exportPath, 1).ReadAll());

function fail(msg) {
  throw new Error(msg);
}

function entry() {
  return null;
}

function makeEntry(fields) {
  return {
    field: function(name) {
      return fields[name];
    },
    set: function(name, value) {
      fields[name] = value;
    }
  };
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
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

function item(name, attrText, attrValue, rawText, rowValue, rowUnit, rowRaw, displayName, cats, kind, cumulative) {
  var out = {
    name: name,
    attrText: attrText,
    attrValue: attrValue,
    rawText: rawText,
    rowValue: rowValue == null ? null : rowValue,
    rowUnit: rowUnit || null,
    rowRaw: rowRaw || null,
    displayName: displayName || name,
    cats: cats || []
  };
  if (kind) {
    out.kind = kind;
    if (kind === "category") out.isCategory = true;
  }
  if (cumulative) out.cumulative = true;
  return out;
}

var baseItems = [
  item("zeta", "+2", 2, "+2"),
  item("alpha", "+1", 1, "+1"),
  item("mailtag", "a@example.com", "a@example.com", "a@example.com"),
  item("linktag", "https://example.com", "https://example.com", "https://example.com"),
  item("teltag", "+49 123456", "+49 123456", "+49 123456"),
  item("realtag", "+1,5", 1.5, "+1,5"),
  item("textbeta", "beta", "beta", "beta"),
  item("textalpha", "alpha", "alpha", "alpha"),
  item("listtag", "a,b", ["a", "b"], "a,b"),
  item("plainz", null, null, "plainz"),
  item("plaina", null, null, "plaina")
];

var rowItems = [
  item("zeta", "+2", 2, "+2", 2, "h", "2h"),
  item("alpha", "+1", 1, "+1", 2, "h", "2h"),
  item("middle", "+3", 3, "+3", 3, "h", "3h"),
  item("LongRowName", "+4", 4, "+4", 4, "h", "4h", "lr")
];

var shortRowItems = [
  item("Kopfschmerz", "+2", 2, "+2", 0.5, null, "0,5", "ks"),
  item("Innere_Anspannung", "+1", 1, "+1", 0.5, null, "0,5", "IA")
];

var entryObj;

entryObj = makeEntry({ Tags: ["foreign"] });
exportAtags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "Tags",
  targetFieldType: "tags"
});
assertArray("tags", entryObj.field("Tags"), ["alpha", "email", "foreign", "link", "linktag", "listtag", "mailtag", "plaina", "plainz", "realtag", "tel", "teltag", "textalpha", "textbeta", "zeta"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: [item("Soziales_Regeln", "+1", 1, "+1")] },
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false
});
assertArray("tags-preserve-underscore", entryObj.field("Tags"), ["Soziales_Regeln"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("Soziales_Regeln", "+1", 1, "+1"),
      item("Soziales Regeln", "+2", 2, "+2")
    ]
  },
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false
});
assertArray("tags-space-to-underscore-dedupe", entryObj.field("Tags"), ["Soziales_Regeln"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("prot", "Bechler", "Bechler", "Bechler"),
      item("prot", "Enda", "Enda", "Enda"),
      item("info", "Erstens, Zweitens", "Erstens, Zweitens", "Erstens, Zweitens"),
      item("info", "Drittens", "Drittens", "Drittens")
    ]
  },
  targetField: "Text",
  targetFieldType: "text"
});
assertEqual(
  "text-joins-repeated-strings",
  entryObj.field("Text"),
  "info: Erstens, Zweitens, Drittens\nprot: Bechler, Enda"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("prot", "test und interessant", "test und interessant", "\"test und interessant\""),
      item("prot", "auch Test", "auch Test", "auch Test")
    ]
  },
  targetField: "MD",
  targetFieldType: "md"
});
assertEqual(
  "md-joins-repeated-texts",
  entryObj.field("MD"),
  "prot: test und interessant, auch Test"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("prot", "Bechler", "Bechler", "Bechler"),
      item("prot", "Enda", "Enda", "Enda")
    ]
  },
  targetField: "Text",
  targetFieldType: "text",
  rowAggregateMode: "last"
});
assertEqual("text-string-last-follows-row-aggregate-mode", entryObj.field("Text"), "prot: Enda");

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("prot", "Bechler", "Bechler", "Bechler"),
      item("prot", "Enda", "Enda", "Enda")
    ]
  },
  targetField: "Json",
  targetFieldType: "json"
});
assertEqual("json-joins-repeated-strings", entryObj.field("Json"), "{\"prot\":\"Bechler, Enda\"}");

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("Soziales_Regeln", "Spielen", ["Spielen"], "Spielen", null, null, null, "sr", [], "category"),
      item("Spielen", "+2", 2, "+2", null, null, null, "Sp", ["Soziales_Regeln"])
    ]
  },
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false
});
assertArray("tags-keep-category-tags-with-children", entryObj.field("Tags"), ["@Soziales_Regeln", "Spielen"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("Soziales_Regeln", "", [], "", null, null, null, "sr", [], "category"),
      item("Spielen", "+2", 2, "+2")
    ]
  },
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false
});
assertArray("tags-skip-empty-category-tags", entryObj.field("Tags"), ["Spielen"]);

entryObj = makeEntry({
  Tags: ["zForeign", "alpha", "mForeign"],
  ParserTags: ["alpha"]
});
exportAtags({
  entryObj: entryObj,
  result: { items: [item("beta", "+1", 1, "+1")] },
  targetField: "Tags",
  targetFieldType: "tags",
  preserveForeignTagsField: "ForeignTags",
  parserOwnedTagsField: "ParserTags"
});
assertArray("foreign-tags", entryObj.field("ForeignTags"), ["mForeign", "zForeign"]);
assertArray("parser-tags", entryObj.field("ParserTags"), ["beta"]);
assertArray("preserved-tags", entryObj.field("Tags"), ["beta", "mForeign", "zForeign"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "MD",
  targetFieldType: "md"
});
assertEqual(
  "md",
  entryObj.field("MD"),
  "linktag: [example.com](https://example.com)  \n" +
  "mailtag: [a@example.com](mailto:a@example.com)  \n" +
  "teltag: [+49 123456](tel:+49123456)\n\n" +
  "alpha: +1  \n" +
  "zeta: +2  \n" +
  "realtag: +1,5\n\n" +
  "textalpha: alpha  \n" +
  "textbeta: beta  \n" +
  "listtag: a,b"
);

entryObj = makeEntry({});
applyTags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "MD",
  targetFieldType: "md"
});
assertEqual(
  "apply-md-default-group-separator",
  entryObj.field("MD"),
  "linktag: [example.com](https://example.com)  \n" +
  "mailtag: [a@example.com](mailto:a@example.com)  \n" +
  "teltag: [+49 123456](tel:+49123456)\n\n" +
  "alpha: +1  \n" +
  "zeta: +2  \n" +
  "realtag: +1,5\n\n" +
  "textalpha: alpha  \n" +
  "textbeta: beta  \n" +
  "listtag: a,b"
);

entryObj = makeEntry({ Note: "@@Pos: x\n@@Neg: -x\nx2" });
applyTags({
  entryObj: entryObj,
  textFields: ["Note"],
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false,
  multiAliasTargets: true
});
assertArray("apply-multi-alias-targets", entryObj.field("Tags"), ["Neg", "Pos"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("blankname", null, null, ""),
      item("category", "tag1,tag2", ["tag1", "tag2"], "tag1,tag2", null, null, null, "cat", [], "category"),
      item("listtag", "a,b", ["a", "b"], "a,b"),
      item("textname", "abc", "abc", "abc")
    ]
  },
  targetField: "MD",
  targetFieldType: "md",
  includeBlankTags: true,
  markdownGroupSeparator: null
});
assertEqual(
  "md-category-sorts-before-blank",
  entryObj.field("MD"),
  "textname: abc  \n" +
  "listtag: a,b  \n" +
  "category: tag1, tag2  \n" +
  "blankname"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("kaufen", "pc,garten", ["pc", "garten"], "pc,garten", null, null, null, "kf", [], "category"),
      item("pc", "+10", 10, "+10"),
      item("pc", "+30", 30, "+30"),
      item("garten", "+24", 24, "+24"),
      item("garten", "+20", 20, "+20")
    ]
  },
  targetField: "MD",
  targetFieldType: "md",
  markdownGroupSeparator: null
});
assertEqual(
  "md-category-aggregates-child-row-max-then-cat-avg",
  entryObj.field("MD"),
  "garten: +24  \n" +
  "garten: +20  \n" +
  "pc: +10  \n" +
  "pc: +30  \n" +
  "kaufen: 27 - [pc, garten]"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("kaufen", "pc,garten", ["pc", "garten"], "pc,garten", null, null, null, "kf", [], "category"),
      item("pc", "+10", 10, "+10"),
      item("pc", "+30", 30, "+30"),
      item("garten", "+24", 24, "+24"),
      item("garten", "+20", 20, "+20")
    ]
  },
  targetField: "Text",
  targetFieldType: "text",
  categoryRowAggregateMode: "avg",
  categoryAggregateMode: "add"
});
assertEqual(
  "text-category-custom-aggregate-modes",
  entryObj.field("Text"),
  "garten: +24\ngarten: +20\nkaufen: 42 - [pc, garten]\npc: +10\npc: +30"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("spannung_schmerz", "Kopfschmerz,Nackenschmerz,Spannung", ["Kopfschmerz", "Nackenschmerz", "Spannung"], "Kopfschmerz,Nackenschmerz,Spannung", null, null, null, "ss", [], "category"),
      item("Kopfschmerz", "+1", 1, "+1", 1, null, "1"),
      item("Kopfschmerz", "+3", 3, "+3", 2, null, "2"),
      item("Nackenschmerz", "+2", 2, "+2", 1, null, "1"),
      item("Spannung", "+2", 2, "+2", 1, null, "1")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1
});
assertEqual(
  "tree_md-child-values-use-md-aggregation",
  entryObj.field("Tree"),
  "spannung_schmerz 2  \n" +
  "\u251c\u2500\u2500 Kopfschmerz 2 [2]  \n" +
  "\u251c\u2500\u2500 Nackenschmerz 2  \n" +
  "\u2514\u2500\u2500 Spannung 2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("spannung_schmerz", "Kopfschmerz,Nackenschmerz,Spannung", ["Kopfschmerz", "Nackenschmerz", "Spannung"], "Kopfschmerz,Nackenschmerz,Spannung", null, null, null, "ss", [], "category"),
      item("Kopfschmerz", "+1", 1, "+1", 1, null, "1"),
      item("Kopfschmerz", "+3", 3, "+3", 2, null, "2"),
      item("Nackenschmerz", "+2", 2, "+2", 1, null, "1"),
      item("Spannung", "+2", 2, "+2", 1, null, "1")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  rowAggregateDecimals: 1
});
assertEqual(
  "tree_md-default-row-aggregation-is-max",
  entryObj.field("Tree"),
  "spannung_schmerz 2,3  \n" +
  "\u251c\u2500\u2500 Kopfschmerz 3 [2]  \n" +
  "\u251c\u2500\u2500 Nackenschmerz 2  \n" +
  "\u2514\u2500\u2500 Spannung 2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("spannung_schmerz", "Kopfschmerz,Nackenschmerz,Spannung", ["Kopfschmerz", "Nackenschmerz", "Spannung"], "Kopfschmerz,Nackenschmerz,Spannung", null, null, null, "ss", [], "category"),
      item("Kopfschmerz", "+1", 1, "+1", 1, null, "1"),
      item("Kopfschmerz", "+3", 3, "+3", 2, null, "2"),
      item("Nackenschmerz", "+2", 2, "+2", 1, null, "1"),
      item("Spannung", "+2", 2, "+2", 1, null, "1")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  row_display_values: "all",
  cat_display_values: "names",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1
});
assertEqual(
  "tree_md-display-values-all",
  entryObj.field("Tree"),
  "spannung_schmerz 2 - [Kopfschmerz, Nackenschmerz, Spannung]  \n" +
  "\u251c\u2500\u2500 Kopfschmerz 2 - [1, 3]  \n" +
  "\u251c\u2500\u2500 Nackenschmerz 2  \n" +
  "\u2514\u2500\u2500 Spannung 2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("self", "tag1,tag2", ["tag1", "tag2"], "tag1,tag2", null, null, null, "sf")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  treeIncludeMissingChildren: true
});
assertEqual(
  "tree_md-unicode-default",
  entryObj.field("Tree"),
  "self  \n" +
  "\u251c\u2500\u2500 tag1  \n" +
  "\u2514\u2500\u2500 tag2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("self", "tag1,tag2", ["tag1", "tag2"], "tag1,tag2", null, null, null, "sf")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  treeStyle: "ascii",
  treeIncludeMissingChildren: true
});
assertEqual(
  "tree_md-ascii",
  entryObj.field("Tree"),
  "self  \n" +
  "|-- tag1  \n" +
  "`-- tag2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("self", "tag1,tag2", ["tag1", "tag2"], "tag1,tag2", null, null, null, "sf"),
      item("help", "tag1", ["tag1"], "tag1"),
      item("tag1", "+3", 3, "+3", null, null, null, "tg1", ["self", "help"]),
      item("tag2", "+3", 3, "+3", null, null, null, "tg2", ["self"]),
      item("solo", "+1", 1, "+1")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md"
});
assertEqual(
  "tree_md",
  entryObj.field("Tree"),
  "help 3  \n" +
  "\u2514\u2500\u2500 tag1 3  \n  \n" +
  "self 3  \n" +
  "\u251c\u2500\u2500 tag1 3  \n" +
  "\u2514\u2500\u2500 tag2 3"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("self", "tag1,tag2", ["tag1", "tag2"], "tag1,tag2", null, null, null, "sf"),
      item("tag1", "+3", 3, "+3", null, null, null, "tg1", ["self"]),
      item("tag2", null, null, "", null, null, null, "tg2", ["self"])
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  treeShowValues: false
});
assertEqual(
  "tree_md-values-can-be-disabled",
  entryObj.field("Tree"),
  "self  \n" +
  "\u251c\u2500\u2500 tag1  \n" +
  "\u2514\u2500\u2500 tag2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("test", "ttt,missing", ["ttt", "missing"], "ttt,missing", null, null, null, "test", [], "category"),
      item("ttt", "+1", 1, "+1")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md"
});
assertEqual(
  "tree_md-only-occurring-fixed-children",
  entryObj.field("Tree"),
  "test 1  \n" +
  "\u2514\u2500\u2500 ttt 1"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("test", "missing", ["missing"], "missing", null, null, null, "test", [], "category")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md"
});
assertEqual("tree_md-hides-category-with-only-missing-children", entryObj.field("Tree"), "");

entryObj = makeEntry({ Note: "@@@help: Spielen, Musik\nSpielen1" });
applyTags({
  entryObj: entryObj,
  textFields: ["Note"],
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false
});
assertArray("apply-tags-skips-missing-alias-children", entryObj.field("Tags"), ["@help", "Spielen"]);

entryObj = makeEntry({ Note: "@@@help: Spielen, Musik\nSpielen1" });
applyTags({
  entryObj: entryObj,
  textFields: ["Note"],
  targetField: "MD",
  targetFieldType: "md"
});
assertEqual(
  "apply-md-skips-missing-alias-children",
  entryObj.field("MD"),
  "Spielen: +1  \n" +
  "help: 1 - [Spielen]"
);

entryObj = makeEntry({ Note: "@@@help: Spielen, Musik\nSpielen1" });
applyTags({
  entryObj: entryObj,
  textFields: ["Note"],
  targetField: "Json",
  targetFieldType: "json"
});
assertEqual(
  "apply-json-skips-missing-alias-children",
  entryObj.field("Json"),
  "{\"help\":[\"Spielen\"],\"Spielen\":1}"
);

entryObj = makeEntry({ Note: "@@@help: Spielen, Musik" });
applyTags({
  entryObj: entryObj,
  textFields: ["Note"],
  targetField: "Tags",
  targetFieldType: "tags",
  mergeWithExistingTags: false
});
assertArray("apply-tags-no-category-from-only-alias", entryObj.field("Tags"), []);


entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("empty", "", [], "", null, null, null, "e"),
      item("solo", "+1", 1, "+1")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md"
});
assertEqual("tree_md-skips-empty-categories", entryObj.field("Tree"), "");

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("empty", "", [], "", null, null, null, "e")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  includeEmptyCategories: true
});
assertEqual("tree_md-includes-empty-categories", entryObj.field("Tree"), "empty");

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("help", "Spielen,Musik", ["Spielen", "Musik"], "Spielen,Musik", null, null, null, "help", [], "category"),
      item("home", "Haushalt", ["Haushalt"], "Haushalt", null, null, null, "home", [], "category"),
      item("Spielen", "+2", 2, "+2", null, null, null, "Sp", ["help"]),
      item("Musik", "laut", "laut", "laut", null, null, null, "Mu", ["help"]),
      item("Haushalt", "+1", 1, "+1", null, null, null, "HH", ["home"]),
      item("Andere", "+9", 9, "+9")
    ]
  },
  targetField: "MD",
  targetFieldType: "md",
  categoryFilter: ["help"]
});
assertEqual(
  "category-filter-md",
  entryObj.field("MD"),
  "Spielen: +2  \n" +
  "Musik: laut  \n" +
  "help: 2 - [Spielen]"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("help", "Spielen,Musik", ["Spielen", "Musik"], "Spielen,Musik", null, null, null, "help", [], "category"),
      item("home", "Haushalt", ["Haushalt"], "Haushalt", null, null, null, "home", [], "category"),
      item("Spielen", "+2", 2, "+2", null, null, null, "Sp", ["help"]),
      item("Musik", "laut", "laut", "laut", null, null, null, "Mu", ["help"]),
      item("Haushalt", "+1", 1, "+1", null, null, null, "HH", ["home"]),
      item("Andere", "+9", 9, "+9")
    ]
  },
  targetField: "Tags",
  targetFieldType: "tags",
  categoryFilter: ["help", "home"],
  mergeWithExistingTags: false
});
assertArray("category-filter-tags", entryObj.field("Tags"), ["@help", "@home", "Haushalt", "Musik", "Spielen"]);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("help", "Spielen,Musik", ["Spielen", "Musik"], "Spielen,Musik", null, null, null, "help", [], "category"),
      item("home", "Haushalt", ["Haushalt"], "Haushalt", null, null, null, "home", [], "category"),
      item("Spielen", "+2", 2, "+2", null, null, null, "Sp", ["help"]),
      item("Musik", "laut", "laut", "laut", null, null, null, "Mu", ["help"]),
      item("Haushalt", "+1", 1, "+1", null, null, null, "HH", ["home"]),
      item("Andere", "+9", 9, "+9")
    ]
  },
  targetField: "Json",
  targetFieldType: "json",
  categoryFilter: "home"
});
assertEqual(
  "category-filter-json",
  entryObj.field("Json"),
  "{\"Haushalt\":1,\"home\":[\"Haushalt\"]}"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("help", "Spielen,Musik", ["Spielen", "Musik"], "Spielen,Musik", null, null, null, "help", [], "category"),
      item("home", "Haushalt", ["Haushalt"], "Haushalt", null, null, null, "home", [], "category"),
      item("Spielen", "+2", 2, "+2", null, null, null, "Sp", ["help"]),
      item("Musik", "laut", "laut", "laut", null, null, null, "Mu", ["help"]),
      item("Haushalt", "+1", 1, "+1", null, null, null, "HH", ["home"]),
      item("Andere", "+9", 9, "+9")
    ]
  },
  targetField: "Tree",
  targetFieldType: "tree_md",
  categoryFilter: ["help"]
});
assertEqual(
  "category-filter-tree",
  entryObj.field("Tree"),
  "help 2  \n" +
  "\u251c\u2500\u2500 Musik laut  \n" +
  "\u2514\u2500\u2500 Spielen 2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "MD",
  targetFieldType: "md",
  markdownGroupSeparator: null
});
assertEqual(
  "md-group-separator-null-disabled",
  entryObj.field("MD"),
  "linktag: [example.com](https://example.com)  \n" +
  "mailtag: [a@example.com](mailto:a@example.com)  \n" +
  "teltag: [+49 123456](tel:+49123456)  \n" +
  "alpha: +1  \n" +
  "zeta: +2  \n" +
  "realtag: +1,5  \n" +
  "textalpha: alpha  \n" +
  "textbeta: beta  \n" +
  "listtag: a,b"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "MD",
  targetFieldType: "md",
  markdownGroupSeparator: "* * *"
});
assertEqual(
  "md-group-separator-custom",
  entryObj.field("MD"),
  "linktag: [example.com](https://example.com)  \n" +
  "mailtag: [a@example.com](mailto:a@example.com)  \n" +
  "teltag: [+49 123456](tel:+49123456)  \n" +
  "* * *  \n" +
  "alpha: +1  \n" +
  "zeta: +2  \n" +
  "realtag: +1,5  \n" +
  "* * *  \n" +
  "textalpha: alpha  \n" +
  "textbeta: beta  \n" +
  "listtag: a,b"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("textname", "abc", "abc", "abc"),
      item("blankname", null, null, ""),
      item("LongRowName", "+3", 3, "+3", 1, null, "1", "lr"),
      item("LongRowName", "+2", 2, "+2", 2, null, "2", "lr")
    ]
  },
  targetField: "MD",
  targetFieldType: "md",
  includeBlankTags: true
});
assertEqual(
  "md-include-blank-tags-opt-in",
  entryObj.field("MD"),
  "LongRowName: 2,5 - [3, 2]  \n" +
  "textname: abc  \n" +
  "blankname"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("Score", "+1", 1, "+1", 1, null, "1"),
      item("Score", "+2", 2, "+2", 2, null, "2"),
      item("Score", "+3", 3, "+3", 3, null, "3"),
      item("Score", "+4", 4, "+4", 4, null, "4"),
      item("Texttag", "abc", "abc", "abc"),
      item("Blanktag", null, null, "")
    ]
  },
  targetField: "MD",
  targetFieldType: "md"
});
assertEqual(
  "md-group-separators-count-original-tags",
  entryObj.field("MD"),
  "Score: 2,5 - [1, 2, 3, 4]\n\n" +
  "Texttag: abc"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("LongRowName", "+3", 3, "+3", 1, null, "1", "lr"),
      item("LongRowName", "+2", 2, "+2", 2, null, "2", "lr")
    ]
  },
  targetField: "MD",
  targetFieldType: "md",
  markdownLabelNames: "short"
});
assertEqual(
  "md-short-labels-explicit",
  entryObj.field("MD"),
  "lr: 2,5 - [3, 2]"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("Pulse", "+", 1, "+", 1, null, "1", "Pulse", [], null, true),
      item("Pulse", "+", 1, "+", 2, null, "2", "Pulse", [], null, true)
    ]
  },
  targetField: "MD",
  targetFieldType: "md",
  rowAggregateMode: "avg"
});
assertEqual(
  "md-cumulative-forces-sum",
  entryObj.field("MD"),
  "Pulse: 2 - [1, 1]"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: rowItems },
  targetField: "Rows",
  targetFieldType: "rows_md",
  rowAggregateMode: "sum",
  rowAggregateDecimals: 1,
  shortenTableHeaders: -1
});
assertEqual(
  "rows_md",
  entryObj.field("Rows"),
  "| rval | alpha | lr | middle | zeta |  \n" +
  "| :--- | ---: | ---: | ---: | ---: |  \n" +
  "| 2h | 1 |  |  | 2 |  \n" +
  "| 4h |  | 4 |  |  |  \n" +
  "| 3h |  |  | 3 |  |  \n" +
  "| sum | 1 | 4 | 3 | 2 |"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: shortRowItems },
  targetField: "Rows",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1,
  shortenTableHeaders: -1
});
assertEqual(
  "rows_md-short-headers-by-default",
  entryObj.field("Rows"),
  "| rval | IA | ks |  \n" +
  "| :--- | ---: | ---: |  \n" +
  "| 0,5 | 1 | 2 |  \n" +
  "| avg | 1 | 2 |"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("Pulse", "+", 1, "+", 1, null, "1", "Pulse", [], null, true),
      item("Pulse", "++", 2, "++", 2, null, "2", "Pulse", [], null, true)
    ]
  },
  targetField: "Rows",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1,
  shortenTableHeaders: -1
});
assertEqual(
  "rows_md-cumulative-forces-sum",
  entryObj.field("Rows"),
  "| rval | Pulse |  \n" +
  "| :--- | ---: |  \n" +
  "| 1 | 1 |  \n" +
  "| 2 | 2 |  \n" +
  "| avg | 3 |"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: shortRowItems },
  targetField: "Rows",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1,
  shortenTableHeaders: -1,
  tableHeaderNames: "long"
});
assertEqual(
  "rows_md-long-headers",
  entryObj.field("Rows"),
  "| rval | Innere_Anspannung | Kopfschmerz |  \n" +
  "| :--- | ---: | ---: |  \n" +
  "| 0,5 | 1 | 2 |  \n" +
  "| avg | 1 | 2 |"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: shortRowItems },
  targetField: "Rows",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1,
  shortenTableHeaders: -1,
  tableHeaderNames: "both"
});
assertEqual(
  "rows_md-both-headers",
  entryObj.field("Rows"),
  "| rval | IA (Innere_Anspannung) | ks (Kopfschmerz) |  \n" +
  "| :--- | ---: | ---: |  \n" +
  "| 0,5 | 1 | 2 |  \n" +
  "| avg | 1 | 2 |"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "Text",
  targetFieldType: "text"
});
assertEqual(
  "text",
  entryObj.field("Text"),
  "alpha: +1\nlinktag: https://example.com\nlisttag: a,b\nmailtag: a@example.com\nrealtag: +1,5\nteltag: +49 123456\ntextalpha: alpha\ntextbeta: beta\nzeta: +2"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: { items: baseItems },
  targetField: "Json",
  targetFieldType: "json"
});
assertEqual(
  "json",
  entryObj.field("Json"),
  "{\"alpha\":1,\"linktag\":\"https://example.com\",\"listtag\":\"a,b\",\"mailtag\":\"a@example.com\",\"plaina\":null,\"plainz\":null,\"realtag\":1.5,\"teltag\":\"+49 123456\",\"textalpha\":\"alpha\",\"textbeta\":\"beta\",\"zeta\":2}"
);

entryObj = makeEntry({});
exportAtags({
  entryObj: entryObj,
  result: {
    items: [
      item("emo", "+1", 1, "+1"),
      item("emo", "+3", 3, "+3"),
      item("info", "a", "a", "a"),
      item("info", "b", "b", "b")
    ]
  },
  targetField: "Json",
  targetFieldType: "json"
});
assertEqual(
  "json-repeated-values",
  entryObj.field("Json"),
  "{\"emo\":[1,3],\"info\":\"a, b\"}"
);

entryObj = makeEntry({ MD: "keep" });
var disabledResult = applyTags({
  entryObj: entryObj,
  enabled: 0,
  result: { items: baseItems },
  targetField: "MD",
  targetFieldType: "md"
});
assertEqual("apply-disabled-target-unchanged", entryObj.field("MD"), "keep");
assertEqual("apply-disabled-null-result", disabledResult, null);

WScript.Echo("OK");
