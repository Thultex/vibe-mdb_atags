var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\tagCleaner.js");

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
  "emo\u207A\u00B2 tag\u207B\u2070\u00B3 stuff\u207A\u207A 'emo3'"
);

assertEquals(
  "tagbar-merge",
  makeTagCleanerText("Text\n|| tag3 info#\"das ist info\"\n| info2\n| stress laufen emo3"),
  "Text\n\n|| emo\u207A\u00B3 info\u207A\u00B2 tag\u207A\u00B3 info#\"das ist info\" laufen# stress#"
);

var once = makeTagCleanerText("Text\n|| tag3 info#\"das ist info\"\n| info2\n| stress laufen emo3");
assertEquals("recursive-stable", makeTagCleanerText(once), once);

var entryObj = makeEntry({
  Note: "emo2\n| stress laufen"
});

applyTagCleaner({
  entryObj: entryObj,
  textField: "Note"
});

assertEquals("apply-same-field", entryObj.field("Note"), "emo\u207A\u00B2\n\n|| laufen# stress#");

applyTagCleaner({
  entryObj: entryObj,
  textField: "Note"
});

assertEquals("apply-same-field-recursive", entryObj.field("Note"), "emo\u207A\u00B2\n\n|| laufen# stress#");

WScript.Echo("OK");
