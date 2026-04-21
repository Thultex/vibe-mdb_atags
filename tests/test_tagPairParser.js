var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var parserPath = fso.BuildPath(scriptDir, "..\\addons\\tagPairParser.js");

eval(fso.OpenTextFile(parserPath, 1).ReadAll());

function print(s) {
  WScript.Echo(String(s));
}

if (!Array.isArray) {
  Array.isArray = function(val) {
    return Object.prototype.toString.call(val) === "[object Array]";
  };
}

if (!String.prototype.trim) {
  String.prototype.trim = function() {
    return String(this).replace(/^\s+|\s+$/g, "");
  };
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

function assertArray(label, actual, expected) {
  var a = actual.join("|");
  var e = expected.join("|");
  if (a !== e) fail(label + ": expected [" + e + "] but got [" + a + "]");
}

function testStandaloneParser() {
  var entryObj = makeEntry({
    Tags: ["emo", "1,23", "mood", "--", "test"],
    Notiz: "hallo"
  });

  var out = applyTagPairParser({
    entryObj: entryObj,
    tagField: "Tags",
    targetTextField: "Notiz"
  });

  assertArray("standalone-tags", entryObj.field("Tags"), ["emo", "mood", "test"]);
  assertEquals("standalone-note", entryObj.field("Notiz"), "hallo\nemo#1,23\nmood#-2");
  assertArray("standalone-adds", out.textAdds, ["emo#1,23", "mood#-2"]);
}

function testKeepOriginalValueTag() {
  var entryObj = makeEntry({
    Tags: ["emo", "++", "test"],
    Note: ""
  });

  applyTagPairParser({
    entryObj: entryObj,
    tagField: "Tags",
    targetTextField: "Note",
    keepOriginalValueTag: true,
    appendMode: "comma"
  });

  assertArray("keep-tags", entryObj.field("Tags"), ["emo", "++", "test"]);
  assertEquals("keep-note", entryObj.field("Note"), "emo#+2");
}

testStandaloneParser();
testKeepOriginalValueTag();

print("OK");
