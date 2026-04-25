var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\readableAtagText.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
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

function entry() {
  return null;
}

var mockEntries = [];

function lib() {
  return {
    entries: function() {
      return mockEntries;
    }
  };
}

assertEquals(
  "row-inline",
  makeReadableAtagText("0: ks2, SchM1", {
    rowMode: true
  }),
  "0: ks, SchM\n  | ks\u00B2 SchM\u00B9"
);

assertEquals(
  "alias-short-row-line",
  makeReadableAtagText("@@Kopfschmerz (ks): Kopfschmerzen, ks, Kschm, SchM\n0: ks2, SchM1", {
    rowMode: true
  }),
  "@@Kopfschmerz (ks): Kopfschmerzen, ks, Kschm, SchM\n0: ks, SchM\n  | ks\u00B2 ks\u00B9"
);

assertEquals(
  "alias-without-list",
  makeReadableAtagText("@@Wirkung (Wk)\n@@Gut\n0,7: erste leicht Wirkung++, leichtes W\u00E4rmegef\u00FChl ##W\u00E4rme #gut, leichter R\u00FCckgang Stress0/Angst-2/Scham-0,5, Idee#laufen, Gedanke#\"was ist morgen\"", {
    rowMode: true
  }),
  "@@Wirkung (Wk)\n@@Gut\n0,7: Erste leicht Wirkung, leichtes W\u00E4rmegef\u00FChl gut, leichter R\u00FCckgang Stress/Angst/Scham, Idee: \"laufen\", Gedanke: \"was ist morgen\".\n  | Angst\u207B\u00B2 Scham\u207B\u2070\u2075 Stress\u2070 Wk\u207A\u207A, Gut\u207F W\u00E4rme\u207F"
);

assertEquals(
  "double-hash-prefix-suffix-removed",
  makeReadableAtagText("0: Vor ##Schlafmangel nach Schlafmangel## Ende", {
    rowMode: true,
    aliasText: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM"
  }),
  "0: Vor nach Ende\n  | SchlM\u207F"
);

assertEquals(
  "double-hash-punctuation-removed",
  makeReadableAtagText("0: Vor ##test, Mitte test##. Ende", {
    rowMode: true
  }),
  "0: Vor Mitte. Ende\n  | test\u207F"
);

assertEquals(
  "user-repro-hash-suffix-row",
  makeReadableAtagText("0: Etwas Schlafmangel2 test##\n1: \n2,5: ", {
    rowMode: true,
    aliasText: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM"
  }),
  "0: Etwas Schlafmangel\n  | SchlM\u00B2, test\u207F\n1: \n2,5: "
);

assertEquals(
  "alias-short-same-text",
  makeReadableAtagText("@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM\n0: Etwas Schlafmangel2", {
    rowMode: true
  }),
  "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM\n0: Etwas Schlafmangel\n  | SchlM\u00B2"
);

assertEquals(
  "alias-short-separate-text",
  makeReadableAtagText("0: Etwas Schlafmangel2", {
    rowMode: true,
    aliasText: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM"
  }),
  "0: Etwas Schlafmangel\n  | SchlM\u00B2"
);

assertEquals(
  "global-line",
  makeReadableAtagText("test##12,5\ninfo##\"neuer lauf\"\ntag:1, #trial:", {
    rowMode: true
  }),
  "tag: 1, trial:\n\n|| tag\u207A\u00B9, info: \"neuer lauf\" test: 12,5, trial\u207F"
);

assertEquals(
  "blank-line-tagged",
  makeReadableAtagText("0: ks2\n1: ok", {
    rowMode: true,
    blankLineBetweenRows: "tagged"
  }),
  "0: ks\n  | ks\u00B2\n\n1: ok"
);

assertEquals(
  "blank-line-never-removes-existing",
  makeReadableAtagText("0: ks2\n\n1: ok\n\n2: b1", {
    rowMode: true,
    blankLineBetweenRows: "never"
  }),
  "0: ks\n  | ks\u00B2\n1: ok\n2: b\n  | b\u00B9"
);

assertEquals(
  "quoted-ignored",
  makeReadableAtagText("0: Text 'ks2 soll bleiben' emo4", {
    rowMode: true
  }),
  "0: Text 'ks2 soll bleiben' emo\n  | emo\u2074"
);

assertEquals(
  "quoted-hash-visible-values",
  makeReadableAtagText("5: Nacken, Unruhe, \"test das hier\"#4,1, 'und das'#'das das', sowie: \"das hier\".", {
    rowMode: true
  }),
  "5: Nacken, Unruhe, 'test das hier': 4,1, 'und das': \"das das\", sowie: \"das hier\".\n  | test_das_hier\u2074\u00B9"
);

assertEquals(
  "existing-readable-line-not-duplicated",
  makeReadableAtagText("0: ks, SchM\n  | Ks\u00B2 SchlM\u00B9", {
    rowMode: true
  }),
  "0: ks, SchM\n  | Ks\u00B2 SchlM\u00B9"
);

assertEquals(
  "existing-readable-line-normalized",
  makeReadableAtagText("0: ks, SchM\n  | Ks SchlM+2", {
    rowMode: true
  }),
  "0: ks, SchM\n  | SchlM\u207A\u00B2, Ks\u207F"
);

assertEquals(
  "row-tags-replace-existing-readable-line",
  makeReadableAtagText("0: ks##, SchM+3\n  | Ks\u00B2 SchlM\u00B9", {
    rowMode: true,
    aliasText: "@@Schlafmangel (SchlM): SchM\n@@Kopfschmerzen (Ks): ks"
  }),
  "0: SchM\n  | SchlM\u207A\u00B3, Ks\u207F"
);

assertEquals(
  "plain-text",
  makeReadableAtagText("Heute spazieren# und muede1", {
    rowMode: false,
    plainTextMode: true
  }),
  "Heute spazieren und muede\n  | muede\u00B9, spazieren\u207F"
);

var entryObj = makeEntry({
  Alias: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM",
  Note: "@@Kopfschmerz (ks): ks\n0: ks2"
});

applyReadableAtagText({
  entryObj: entryObj,
  sourceTextField: "Note",
  targetTextField: "Readable",
  rowMode: true
});

assertEquals("apply-target", entryObj.field("Readable"), "@@Kopfschmerz (ks): ks\n0: ks\n  | ks\u00B2");
assertEquals("source-unchanged", entryObj.field("Note"), "@@Kopfschmerz (ks): ks\n0: ks2");

var entryObj2 = makeEntry({
  Alias: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM",
  Note: "0: Etwas Schlafmangel2"
});

applyReadableAtagText({
  entryObj: entryObj2,
  sourceTextField: "Note",
  targetTextField: "Readable",
  aliasTextFields: ["Alias"],
  rowMode: true
});

assertEquals("apply-configured-alias-field", entryObj2.field("Readable"), "0: Etwas Schlafmangel\n  | SchlM\u00B2");

var entryObj3 = makeEntry({
  Aliasfeld: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug, -Schlaf, SchM, SchlM",
  Note: "0: Etwas Schlafmangel2 test##\n1: \n2,5: "
});

applyReadableAtagText({
  entryObj: entryObj3,
  sourceTextField: "Note",
  targetTextField: "Readable",
  aliasTextFields: ["Aliasfeld"],
  rowMode: true
});

assertEquals("apply-user-repro-configured-alias", entryObj3.field("Readable"), "0: Etwas Schlafmangel\n  | SchlM\u00B2, test\u207F\n1: \n2,5: ");

var entryObj4 = makeEntry({
  "Atag Aliases": "@@Schlafmangel (SchlM): Schlafentzug, -Schlaf, SchM, SchlM",
  Notiz: "0: Etwas Schlafmangel2 test## tr#3\n1: "
});

applyReadableAtagText({
  entryObj: entryObj4,
  sourceTextField: "Notiz",
  targetTextField: "Notiz Read",
  aliasTextFields: ["Atag Aliases"],
  rowMode: true,
  tagSeparators: "space"
});

assertEquals("apply-user-exact-call", entryObj4.field("Notiz Read"), "0: Etwas Schlafmangel tr\n  | SchlM\u00B2 tr\u00B3, test\u207F\n1: ");

var entryObj5 = makeEntry({
  Notiz: "0: Etwas Schlafmangel2 test## tr#3\n1: "
});

applyReadableAtagText({
  entryObj: entryObj5,
  sourceTextField: "Notiz",
  targetTextField: "Notiz Read",
  result: {
    items: [
      {
        name: "Schlafmangel",
        displayName: "SchlM",
        attrText: "+2",
        attrValue: 2,
        rawText: "2",
        rowValue: 0,
        rowUnit: null,
        rowRaw: "0"
      },
      {
        name: "test",
        displayName: "test",
        attrText: null,
        attrValue: null,
        rawText: "",
        rowValue: 0,
        rowUnit: null,
        rowRaw: "0"
      },
      {
        name: "tr",
        displayName: "tr",
        attrText: "+3",
        attrValue: 3,
        rawText: "3",
        rowValue: 0,
        rowUnit: null,
        rowRaw: "0"
      }
    ]
  },
  rowMode: true
});

assertEquals("apply-result-tag-lines", entryObj5.field("Notiz Read"), "0: Etwas Schlafmangel tr\n  | SchlM\u00B2 tr\u00B3, test\u207F\n1: ");

var entryObjDisabled = makeEntry({
  Note: "0: ks2",
  Readable: "keep"
});

var disabledReadable = applyReadableAtagText({
  entryObj: entryObjDisabled,
  enabled: false,
  sourceTextField: "Note",
  targetTextField: "Readable",
  rowMode: true
});

assertEquals("readable-disabled-return", disabledReadable, "0: ks2");
assertEquals("readable-disabled-target-unchanged", entryObjDisabled.field("Readable"), "keep");

var entryObj6 = makeEntry({
  Alias: "@@Schlafmangel (SchlM): Schlafentzug, -Schlaf, SchM, SchlM",
  Notiz: "0: Etwas Schlafmangel2 test## tr#3\n1: "
});

applyReadableAtagText({
  entryObj: entryObj6,
  sourceTextField: "Notiz",
  targetTextField: "Notiz",
  aliasTextFields: ["Alias"],
  rowMode: true
});

var once = entryObj6.field("Notiz");

applyReadableAtagText({
  entryObj: entryObj6,
  sourceTextField: "Notiz",
  targetTextField: "Notiz",
  aliasTextFields: ["Alias"],
  rowMode: true
});

assertEquals("same-field-idempotent-row", entryObj6.field("Notiz"), once);

var entryObj7 = makeEntry({
  Notiz: "test##12,5\ninfo##\"neuer lauf\"\ntag:1, #trial:"
});

applyReadableAtagText({
  entryObj: entryObj7,
  sourceTextField: "Notiz",
  targetTextField: "Notiz",
  rowMode: true
});

once = entryObj7.field("Notiz");

applyReadableAtagText({
  entryObj: entryObj7,
  sourceTextField: "Notiz",
  targetTextField: "Notiz",
  rowMode: true
});

assertEquals("same-field-idempotent-global", entryObj7.field("Notiz"), once);

var entryObj8 = makeEntry({
  Note: "0: ks2",
  Backup: "   "
});

applyReadableAtagText({
  entryObj: entryObj8,
  sourceTextField: "Note",
  targetTextField: "Note",
  backupTextField: "Backup",
  rowMode: true
});

assertEquals("backup-written-on-empty", entryObj8.field("Backup"), "0: ks2");
assertEquals("backup-source-rewritten", entryObj8.field("Note"), "0: ks\n  | ks\u00B2");

applyReadableAtagText({
  entryObj: entryObj8,
  sourceTextField: "Note",
  targetTextField: "Note",
  backupTextField: "Backup",
  rowMode: true
});

assertEquals("backup-not-overwritten", entryObj8.field("Backup"), "0: ks2");

mockEntries = [
  makeEntry({ Note: "0: a1", Backup: "" }),
  makeEntry({ Note: "0: b2", Backup: "already" })
];

bulkApplyReadableAtagText({
  sourceTextField: "Note",
  targetTextField: "Note",
  backupTextField: "Backup",
  rowMode: true
});

assertEquals("bulk-backup-written", mockEntries[0].field("Backup"), "0: a1");
assertEquals("bulk-backup-not-overwritten", mockEntries[1].field("Backup"), "already");
assertEquals("bulk-entry-0-rewritten", mockEntries[0].field("Note"), "0: a\n  | a\u00B9");
assertEquals("bulk-entry-1-rewritten", mockEntries[1].field("Note"), "0: b\n  | b\u00B2");

WScript.Echo("OK");
