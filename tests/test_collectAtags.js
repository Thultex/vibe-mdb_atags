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

if (WScript.Arguments.length > 0) {
  dumpItems(WScript.Arguments(0));
  WScript.Quit(0);
}

assertSimpleTag("hash-prefix", "#tag", "tag");
assertItem("plain-int", "tag3", "tag", "+3", 3, null, null);
assertItem("plus-int", "tag+3", "tag", "+3", 3, null, null);
assertItem("minus-int", "tag-2", "tag", "-2", -2, null, null);
assertItem("plusplus", "tag++", "tag", "+2", 2, null, null);
assertItem("plus-decimal", "emo+1,3", "emo", "+1,3", 1.3, null, null);
assertItem("minus-decimal", "emo-12,32", "emo", "-12,32", -12.32, null, null);
assertItem("colon-number", "tag: 5", "tag", "+5", 5, null, null);
assertItem("colon-text", "tag: \"text\"", "tag", "text", "text", null, null);
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
assertMissing("quoted-simple-hash-inside-text", "10: Kopfruhe1, Innere_Anspannung1 geringer, Klarheit1, ' das hier# sollte aber nicht#23 drin sein'", "hier");
assertMissing("quoted-hash-value-inside-text", "10: Kopfruhe1, Innere_Anspannung1 geringer, Klarheit1, ' das hier# sollte aber nicht#23 drin sein'", "nicht");
assertMissing("quoted-colon-inside-text", "'tag: 5'", "tag");
assertItem("quoted-text-outside-row", "10: Kopfruhe1, Innere_Anspannung1 geringer, Klarheit1, ' das hier# sollte aber nicht#23 drin sein'", "Kopfruhe", "+1", 1, 10, null);

print("OK");
