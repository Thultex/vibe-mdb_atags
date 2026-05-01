var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var helperPath = fso.BuildPath(scriptDir, "..\\core\\helpers.js");
var exportPath = fso.BuildPath(scriptDir, "..\\core\\exportAtags.js");

eval(fso.OpenTextFile(helperPath, 1).ReadAll());
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

function item(name, attrText, attrValue, rawText, rowValue, rowUnit, rowRaw, displayName) {
  return {
    name: name,
    attrText: attrText,
    attrValue: attrValue,
    rawText: rawText,
    rowValue: rowValue == null ? null : rowValue,
    rowUnit: rowUnit || null,
    rowRaw: rowRaw || null,
    displayName: displayName || name
  };
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
  "teltag: [+49 123456](tel:+49123456)  \n" +
  "◇  \n" +
  "alpha: +1  \n" +
  "zeta: +2  \n" +
  "realtag: +1,5  \n" +
  "◇  \n" +
  "textalpha: alpha  \n" +
  "textbeta: beta  \n" +
  "listtag: a,b  \n" +
  "◇  \n" +
  "plaina  \n" +
  "plainz"
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
  "listtag: a,b  \n" +
  "plaina  \n" +
  "plainz"
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
  "listtag: a,b  \n" +
  "* * *  \n" +
  "plaina  \n" +
  "plainz"
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
  targetFieldType: "md"
});
assertEqual(
  "md-row-aggregate-sorted-with-values-and-alias",
  entryObj.field("MD"),
  "LongRowName: 2,5  [3, 2]  \n" +
  "textname: abc  \n" +
  "blankname"
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
  "lr: 2,5  [3, 2]"
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
  "alpha: +1\nlinktag: https://example.com\nlisttag: a,b\nmailtag: a@example.com\nplaina\nplainz\nrealtag: +1,5\nteltag: +49 123456\ntextalpha: alpha\ntextbeta: beta\nzeta: +2"
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
