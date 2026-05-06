var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\1_tagging\\tagCleaner.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

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

assertEquals(
  "inline-values",
  makeTagCleanerText("emo2 tag-0,3 stuff++ 'emo3'"),
  "emo\u00B2 tag\u207B\u2070\u00B3 stuff\u207A\u207A 'emo3'"
);

assertEquals(
  "inline-issue38-values",
  makeTagCleanerText("tag+ tag- tag++ tag-- tag++2 tag--3 tag++++ tag---- tag00 tag0 tag02 tag0,2 tag-02 tag-0,2"),
  "tag\u207A tag\u207B tag\u207A\u207A tag\u207B\u207B tag\u207A\u207A\u00B2 tag\u207B\u207B\u00B3 tag\u207A\u207A\u2074 tag\u207B\u207B\u2074 tag\u2070\u2070 tag\u2070 tag\u2070\u00B2 tag\u2070\u00B2 tag\u207B\u2070\u00B2 tag\u207B\u2070\u00B2"
);

assertEquals(
  "inline-underscore-words-not-values",
  makeTagCleanerText("test_00 test_3 tag00 tag3"),
  "test_00 test_3 tag\u2070\u2070 tag\u00B3"
);

assertEquals(
  "standalone-superscript-to-normal-text",
  makeTagCleanerText("Nr \u00B2 und Wert \u207B\u2070\u00B2 aber tag\u00B2 bleibt"),
  "Nr 2 und Wert -0,2 aber tag\u00B2 bleibt"
);

assertEquals(
  "normal-plus-before-superscript-preserved",
  makeTagCleanerText("Stress+\u00B3"),
  "Stress\u207A\u00B3"
);

assertEquals(
  "explicit-positive-number-min",
  makeTagCleanerTextWithOptions("ks+3", { formatValues: "min" }),
  "ks\u00B3"
);

assertEquals(
  "explicit-positive-number-max",
  makeTagCleanerTextWithOptions("ks3", { formatValues: "max" }),
  "ks\u207A\u00B3"
);

assertEquals(
  "tagbar-merge",
  makeTagCleanerText("Text\n|| tag3 info#\"das ist info\"\n| info2\n| stress laufen emo3"),
  "Text\n\n| emo\u00B3 info\u00B2 tag\u00B3, info:\"das ist info\", laufen\u02E3 stress\u02E3"
);

assertEquals(
  "tagbar-colon-numeric-values",
  makeTagCleanerText("Text\n| geld:+20,3 tag:10, fv:max"),
  "Text\n\n| geld\u207A\u00B2\u2070\u00B3 tag\u207A\u00B9\u2070, fv:max"
);

assertEquals(
  "tagbar-issue38-values-and-templates",
  makeTagCleanerText("Text\n| tag+ tag-- tag++2 tag00 tag02 test:_ test:: _"),
  "Text\n\n| tag\u207A tag\u207B\u207B tag\u207A\u207A\u00B2 tag\u2070\u2070 tag\u2070\u00B2"
);

assertEquals(
  "simple-hash-tags-become-tag-suffix",
  makeTagCleanerText("essen# #essen\n| essen# #essen"),
  "essen\u02E3 essen\u02E3\n\n| essen\u02E3"
);

assertEquals(
  "double-hash-unchanged-without-tag-fields",
  makeTagCleanerText("vor ##essen tag##\n| ##leiste emo2"),
  "vor ##essen tag##\n\n| emo\u00B2, ##leiste"
);

assertEquals(
  "tagbar-top-no-spacing",
  makeTagCleanerTextWithOptions("Text\n| stress laufen emo3", {
    tagBarPosition: "top",
    tagBarSpacing: "none"
  }),
  "| emo\u00B3, laufen\u02E3 stress\u02E3\nText"
);

assertEquals(
  "tagbar-top-default-preserve",
  makeTagCleanerTextWithOptions("Text\n| Stress+3 Ks+3", {
    tagBarPosition: "top",
    tagBarSpacing: "blank"
  }),
  "| Ks\u207A\u00B3 Stress\u207A\u00B3\n\nText"
);

assertEquals(
  "tagbar-auto-top-when-timestamps",
  makeTagCleanerTextWithOptions("0: Start\n2,5: weiter\n| Stress3", {
    tagBarPosition: "auto",
    tagBarSpacing: "blank"
  }),
  "| Stress\u00B3\n\n0: Start\n2,5: weiter"
);

assertEquals(
  "tagbar-double-spacing-top",
  makeTagCleanerTextWithOptions("0: Start\n| Stress3", {
    tagBarPosition: "top",
    tagBarSpacing: "double"
  }),
  "| Stress\u00B3\n\n\n0: Start"
);

assertEquals(
  "tagbar-double-spacing-bottom",
  makeTagCleanerTextWithOptions("Start\n| Stress3", {
    tagBarPosition: "bottom",
    tagBarSpacing: "double"
  }),
  "Start\n\n\n| Stress\u00B3"
);

assertEquals(
  "tagbar-auto-bottom-without-timestamps",
  makeTagCleanerTextWithOptions("Start\n| Stress3", {
    tagBarPosition: "auto",
    tagBarSpacing: "blank"
  }),
  "Start\n\n| Stress\u00B3"
);

assertEquals(
  "tagbar-format-values-min",
  makeTagCleanerTextWithOptions("fv: \"min\"\nText\n| Stress+3 Ks+3", {
    tagBarPosition: "top",
    tagBarSpacing: "blank"
  }),
  "| Ks\u00B3 Stress\u00B3, fv:min\n\nText"
);

assertEquals(
  "tagbar-format-values-none",
  makeTagCleanerTextWithOptions("|| fv: \"none\"\nText emo2\n| Stress+3 Ks+3", {
    tagBarPosition: "top",
    tagBarSpacing: "none"
  }),
  "| Ks+3 Stress+3, fv:none\nText emo2"
);

assertEquals(
  "tagbar-double-colon-preserves-space",
  makeTagCleanerText("Text\n| aussage:: Inhalt compact::Inhalt test_b::sdfd"),
  "Text\n\n| aussage:: Inhalt compact:: Inhalt test_b:: sdfd"
);

assertEquals(
  "inline-double-colon-adds-space",
  makeTagCleanerText("test_b::sdfd bleibt"),
  "test_b:: sdfd bleibt"
);

assertEquals(
  "tagbar-single-colon-underscore-string",
  makeTagCleanerText("Text\n| test_b: sdfd"),
  "Text\n\n| test_b:sdfd"
);

assertEquals(
  "inline-single-colon-underscore-not-normalized",
  makeTagCleanerText("test_b: sdfd bleibt"),
  "test_b: sdfd bleibt"
);

assertEquals(
  "tagbar-function-tags-last-and-single-word-unquoted",
  makeTagCleanerText("Text\n| zeta#\"einwort\" beta#\"zwei worte\" fv: max alpha3 leer"),
  "Text\n\n| alpha\u207A\u00B3, beta:\"zwei worte\" zeta:einwort, leer\u02E3, fv:max"
);

assertEquals(
  "tagbar-trailing-commas-do-not-grow",
  makeTagCleanerText(makeTagCleanerText("Text\n| zeta:einwort,,, leer#,, fv: min,,,")),
  "Text\n\n| zeta:einwort, leer\u02E3, fv:min"
);

assertEquals(
  "tagbar-value-trailing-comma-stays-value",
  makeTagCleanerText(makeTagCleanerText("Text\n| Stress3, leer")),
  "Text\n\n| Stress\u00B3, leer\u02E3"
);

assertEquals(
  "tagbar-decimal-value-trailing-comma-stays-value",
  makeTagCleanerText(makeTagCleanerText("Text\n| Stress-0,5, leer")),
  "Text\n\n| Stress\u207B\u2070\u2075, leer\u02E3"
);

assertEquals(
  "tagbar-quoted-trailing-comma-kept",
  makeTagCleanerText("Text\n| zeta#\"einwort,\" leer"),
  "Text\n\n| zeta:einwort,, leer\u02E3"
);

assertEquals(
  "tagbar-top-no-spacing-recursive",
  makeTagCleanerTextWithOptions("|| emo\u00B3 laufen# stress#\n\nText", {
    tagBarPosition: "top",
    tagBarSpacing: "none"
  }),
  "| emo\u00B3, laufen\u02E3 stress\u02E3\nText"
);

var entryObj = makeEntry({
  Note: "emo2\n| stress laufen"
});

applyTagCleaner({
  entryObj: entryObj,
  textField: "Note"
});

assertEquals("apply-same-field", entryObj.field("Note"), "emo\u00B2\n\n| laufen\u02E3 stress\u02E3");

applyTagCleaner({
  entryObj: entryObj,
  textField: "Note"
});

assertEquals("apply-same-field-recursive", entryObj.field("Note"), "emo\u00B2\n\n| laufen\u02E3 stress\u02E3");

var userTagEntry = makeEntry({
  Note: "\nvor ##essen  text tag##\n| ##leiste emo2\n",
  Tags: ["alt"],
  UserTags: []
});

applyTagCleaner({
  entryObj: userTagEntry,
  textField: "Note",
  tagFields: ["Tags", "UserTags"]
});

assertEquals("double-hash-note-cleaned", userTagEntry.field("Note"), "vor text\n\n| emo\u00B2");
assertEquals("double-hash-tags", userTagEntry.field("Tags").join(","), "alt,essen,leiste,tag");
assertEquals("double-hash-user-tags", userTagEntry.field("UserTags").join(","), "essen,leiste,tag");

WScript.Echo("OK");




