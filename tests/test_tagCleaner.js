var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var helperPath = fso.BuildPath(scriptDir, "..\\core_lib\\helpers_lib.js");
var addonPath = fso.BuildPath(scriptDir, "..\\core\\tagCleaner.js");

eval(fso.OpenTextFile(helperPath, 1).ReadAll());
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
  "inline-issue50-mixed-suffix-conversions",
  makeTagCleanerText("TempoHalb\u02E32 test\u2070\u207003 tag\u00B2\u02E3 tag\u00B2# Tem\u02E300"),
  "TempoHalb\u00B2 test\u2070\u00B3 tag\u02E3 tag\u02E3 Tem\u2070\u2070"
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
  makeTagCleanerTextWithOptions("sa+3", { formatValues: "min" }),
  "sa\u00B3"
);

assertEquals(
  "explicit-positive-number-max",
  makeTagCleanerTextWithOptions("sa3", { formatValues: "max" }),
  "sa\u207A\u00B3"
);

assertEquals(
  "alias-display-short-emoji-suffix",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4\n| emo2", {
    aliasText: "@@Emotion (emo, $): feel",
    cleanerTagText: "short",
    cleanerEmoji: "suffix"
  }),
  "emo$\u00B2 emo$\u00B3 emo$\u2074\n\n| emo$\u00B2"
);

assertEquals(
  "alias-display-emoji-only",
  makeTagCleanerTextWithOptions("emo2", {
    aliasText: "@@Emotion (emo, $): feel",
    cleanerTagText: "none",
    cleanerEmoji: "only"
  }),
  "$\u00B2"
);

assertEquals(
  "alias-display-override-long-emoji-prefix",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4\n| emo2", {
    aliasText: "@@Emotion (emo-, $): feel",
    cleanerTagText: "long",
    cleanerEmoji: "prefix"
  }),
  "$Emotion\u00B2 $Emotion\u00B3 $Emotion\u2074\n\n| $Emotion\u00B2"
);

assertEquals(
  "alias-display-override-short-emoji-suffix",
  makeTagCleanerTextWithOptions("$\u00B2 Emotion3", {
    aliasText: "@@Emotion (emo+,$): feel",
    cleanerTagText: "short",
    cleanerEmoji: "suffix"
  }),
  "emo$\u00B2 emo$\u00B3"
);

assertEquals(
  "alias-display-default-keep",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4", {
    aliasText: "@@Emotion (emo): feel"
  }),
  "emo\u00B2 Emotion\u00B3 feel\u2074"
);

assertEquals(
  "alias-display-header-short",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4\n| Emotion3", {
    aliasText: "@@Emotion (emo-): feel"
  }),
  "emo\u00B2 emo\u00B3 emo\u2074\n\n| emo\u00B3"
);

assertEquals(
  "alias-display-header-long",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4", {
    aliasText: "@@Emotion (emo+): feel"
  }),
  "Emotion\u00B2 Emotion\u00B3 Emotion\u2074"
);

assertEquals(
  "alias-display-header-long-not-read-from-clean-text-by-default",
  makeTagCleanerTextWithOptions("@@Ablenkung (ab+): bei\nab\u00B2", {}),
  "@@Ablenkung (ab+): bei\nab\u00B2"
);

assertEquals(
  "alias-display-header-long-from-alias-text-row",
  makeTagCleanerTextWithOptions("2: ab\u00B2", {
    aliasText: "@@Ablenkung (ab+): bei"
  }),
  "2: Ablenkung\u00B2"
);

assertEquals(
  "alias-display-header-long-from-alias-text-mixed-rows",
  makeTagCleanerTextWithOptions("0: Kopfdruck\u00B9\n1: ab\u00B2, emo\u207A\n\nab\u00B2\n4: ", {
    aliasText: "@@Abschweifen (ab+): Ablenkung, Abgelenkt"
  }),
  "0: Kopfdruck\u00B9\n1: Abschweifen\u00B2, emo\u207A\n\nAbschweifen\u00B2\n4:"
);

assertEquals(
  "alias-display-header-emoji-keep",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4", {
    aliasText: "@@Emotion (emo*, $): feel"
  }),
  "emo\u00B2 Emotion\u00B3 feel\u2074"
);

assertEquals(
  "alias-display-header-emoji-only",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4", {
    aliasText: "@@Emotion (emo, $): feel"
  }),
  "$\u00B2 $\u00B3 $\u2074"
);

assertEquals(
  "alias-display-header-short-with-emoji",
  makeTagCleanerTextWithOptions("emo2 Emotion3 feel4", {
    aliasText: "@@Emotion (emo-, $): feel"
  }),
  "emo\u00B2 emo\u00B3 emo\u2074"
);

assertEquals(
  "alias-display-issue54-default-emoji-only-without-short",
  makeTagCleanerTextWithOptions("timer\u00B2", {
    aliasText: "@@timer(,$): timerhilfe"
  }),
  "$\u00B2"
);

assertEquals(
  "alias-display-issue54-plus-without-short-emoji-to-long",
  makeTagCleanerTextWithOptions("$\u00B2 timer\u00B3", {
    aliasText: "@@timer(+,$): timerhilfe"
  }),
  "timer\u00B2 timer\u00B3"
);

assertEquals(
  "alias-display-issue54-minus-without-short-ignored",
  makeTagCleanerTextWithOptions("$\u00B2 timer\u00B3", {
    aliasText: "@@timer(-,$): timerhilfe"
  }),
  "$\u00B2 timer\u00B3"
);

assertEquals(
  "alias-display-issue54-star-without-short-keeps-all",
  makeTagCleanerTextWithOptions("$\u00B2 timer\u00B3", {
    aliasText: "@@timer(*,$): timerhilfe"
  }),
  "$\u00B2 timer\u00B3"
);

assertEquals(
  "alias-display-issue54-short-plus-emoji-to-long",
  makeTagCleanerTextWithOptions("tim\u00B2 Timer\u00B3 $\u2074", {
    aliasText: "@@Timer(tim+,$): timerhilfe"
  }),
  "Timer\u00B2 Timer\u00B3 Timer\u2074"
);

assertEquals(
  "alias-display-issue54-short-minus-emoji-to-short",
  makeTagCleanerTextWithOptions("tim\u00B2 Timer\u00B3 $\u2074", {
    aliasText: "@@Timer(tim-,$): timerhilfe"
  }),
  "tim\u00B2 tim\u00B3 tim\u2074"
);

assertEquals(
  "tagbar-merge",
  makeTagCleanerText("Text\n|| tag3 info#\"das ist info\"\n| info2\n| stress activityc emo3"),
  "Text\n\n\"| emo\u00B3 info\u00B2 tag\u00B3, info:\"das ist info\", activityc\u02E3 stress\u02E3"
);

assertEquals(
  "tagbar-colon-numeric-values",
  makeTagCleanerText("Text\n| geld:+20,3 tag:10, fv:max"),
  "Text\n\n| geld\u207A\u00B2\u2070\u00B3 tag\u207A\u00B9\u2070, fv:max"
);

assertEquals(
  "tagbar-no-space-after-pipe",
  makeTagCleanerText("Text\n|tag1"),
  "Text\n\n| tag\u00B9"
);

assertEquals(
  "tagbar-superscript-value-token",
  makeTagCleanerText("Text\n| test\u00B2"),
  "Text\n\n| test\u00B2"
);

assertEquals(
  "tagbar-split-superscript-value-token",
  makeTagCleanerText("Text\n| test \u00B2"),
  "Text\n\n| test\u00B2"
);

assertEquals(
  "exclusive-tagbar-output-uses-plain-runtime-quote",
  makeTagCleanerText("Text\n|| test\u00B2").split("\n")[2].charAt(0),
  String.fromCharCode(34)
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
  "double-hash-markers-move-to-tagbar",
  makeTagCleanerText("vor ##essen tag##\n| ##leiste emo2"),
  "vor\n\n| emo\u00B2, essen\u02E3 leiste\u02E3 tag\u02E3"
);

assertEquals(
  "double-hash-markers-with-values-move-to-tagbar",
  makeTagCleanerText("vor ##essen2 tag##3"),
  "vor\n\n| essen\u00B2 tag\u00B3"
);

assertEquals(
  "double-hash-markers-with-string-values-move-to-tagbar",
  makeTagCleanerText("vor tag##inhalt info##\"das ist ein test\""),
  "vor\n\n| info:\"das ist ein test\" tag:inhalt"
);

assertEquals(
  "double-hash-markers-in-timestamp-rows-move-to-tagbar",
  makeTagCleanerText("0: vor tag##inhalt\n| base"),
  "0: vor\n\n| tag:inhalt, base\u02E3"
);

assertEquals(
  "tagbar-top-no-spacing",
  makeTagCleanerTextWithOptions("Text\n| stress activityc emo3", {
    tagBarPosition: "top",
    tagBarSpacing: "none"
  }),
  "| emo\u00B3, activityc\u02E3 stress\u02E3\nText"
);

assertEquals(
  "tagbar-top-default-preserve",
  makeTagCleanerTextWithOptions("Text\n| Stress+3 Sa+3", {
    tagBarPosition: "top",
    tagBarSpacing: "blank"
  }),
  "| Sa\u207A\u00B3 Stress\u207A\u00B3\n\nText"
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
  makeTagCleanerTextWithOptions("fv: \"min\"\nText\n| Stress+3 Sa+3", {
    tagBarPosition: "top",
    tagBarSpacing: "blank"
  }),
  "| Sa\u00B3 Stress\u00B3, fv:min\n\nText"
);

assertEquals(
  "tagbar-format-values-none",
  makeTagCleanerTextWithOptions("|| fv: \"none\"\nText emo2\n| Stress+3 Sa+3", {
    tagBarPosition: "top",
    tagBarSpacing: "none"
  }),
  "\"| Sa+3 Stress+3, fv:none\nText emo2"
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
  makeTagCleanerTextWithOptions("|| emo\u00B3 activityc# stress#\n\nText", {
    tagBarPosition: "top",
    tagBarSpacing: "none"
  }),
  "\"| emo\u00B3, activityc\u02E3 stress\u02E3\nText"
);

assertEquals(
  "exclusive-tagbar-keeps-body-values-plain",
  makeTagCleanerText("tag2\n|\" stress3"),
  "tag2\n\n\"| stress\u00B3"
);

assertEquals(
  "double-bar-cleans-to-exclusive-tagbar",
  makeTagCleanerText("tag2\n|| stress3"),
  "tag2\n\n\"| stress\u00B3"
);

assertEquals(
  "empty-bar-cleans-to-exclusive-by-default",
  makeTagCleanerText("tag2\n|"),
  "tag2\n\n\"|"
);

assertEquals(
  "empty-bar-exclusive-can-be-disabled",
  makeTagCleanerTextWithOptions("tag2\n|", { singleBarExclusive: false }),
  "tag\u00B2"
);

assertEquals(
  "line-split-crlf",
  makeTagCleanerTextWithOptions("tag2\r\n| stress3", {}),
  "tag\u00B2\n\n| stress\u00B3"
);

var entryObj = makeEntry({
  Note: "emo2\n| stress activityc"
});

applyTagCleaner({
  entryObj: entryObj,
  textField: "Note"
});

assertEquals("apply-same-field", entryObj.field("Note"), "emo\u00B2\n\n| activityc\u02E3 stress\u02E3");

var cleanEntryObj = makeEntry({
  Note: "tag2\n| stress3"
});

applyCleanTags({
  entryObj: cleanEntryObj,
  textField: "Note"
});

assertEquals("apply-clean-tags-alias", cleanEntryObj.field("Note"), "tag\u00B2\n\n| stress\u00B3");

var defaultCleanEntryObj = makeEntry({
  Notiz: "tag2\n| stress3"
});

applyCleanTags({
  entryObj: defaultCleanEntryObj
});

assertEquals("apply-clean-tags-default-field", defaultCleanEntryObj.field("Notiz"), "tag\u00B2\n\n| stress\u00B3");

var defaultAliasEntryObj = makeEntry({
  Alias: "@@Ablenkung (ab+): bei",
  Notiz: "0: ab\u00B2\n\nab\u00B2"
});

applyCleanTags({
  entryObj: defaultAliasEntryObj
});

assertEquals("apply-clean-tags-default-passive-alias-field", defaultAliasEntryObj.field("Notiz"), "0: Ablenkung\u00B2\n\nAblenkung\u00B2");
assertEquals("apply-clean-tags-default-passive-alias-unchanged", defaultAliasEntryObj.field("Alias"), "@@Ablenkung (ab+): bei");

WScript.Echo("OK");
