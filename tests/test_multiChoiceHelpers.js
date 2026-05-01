var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\3_workflow\\multiChoiceHelpers.js");

eval(fso.OpenTextFile(addonPath, 1).ReadAll());

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function assertArray(label, actual, expected) {
  if (!actual || actual.length !== expected.length) {
    fail(label + ": expected length " + expected.length + " but got " + (actual ? actual.length : "null"));
  }

  for (var i = 0; i < expected.length; i++) {
    if (String(actual[i]) !== String(expected[i])) {
      fail(label + "[" + i + "]: expected '" + expected[i] + "' but got '" + actual[i] + "'");
    }
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

function makeHostList(items) {
  return {
    length: items.length,
    item: function(index) {
      return items[index];
    },
    toString: function() {
      return "[" + items.join(", ") + "]";
    }
  };
}

function makeJavaList(items) {
  return {
    size: function() {
      return items.length;
    },
    get: function(index) {
      return items[index];
    },
    toString: function() {
      return "[" + items.join(", ") + "]";
    }
  };
}

function testAppendAddsValue() {
  var entryObj = makeEntry({
    Typ: ["Start"]
  });

  var changed = multiChoiceAppend({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("append-adds-return", changed, true);
  assertArray("append-adds-value", entryObj.field("Typ"), ["Start", "Tag"]);
}

function testAppendSkipsDuplicate() {
  var entryObj = makeEntry({
    Typ: ["Tag"]
  });

  var changed = multiChoiceAppend({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("append-duplicate-return", changed, false);
  assertArray("append-duplicate-keeps-value", entryObj.field("Typ"), ["Tag"]);
}

function testAppendNormalizesScalar() {
  var entryObj = makeEntry({
    Typ: "Start"
  });

  var changed = multiChoiceAppend({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("append-scalar-return", changed, true);
  assertArray("append-scalar-normalized", entryObj.field("Typ"), ["Start", "Tag"]);
}

function testAppendNormalizesHostList() {
  var entryObj = makeEntry({
    Typ: makeHostList(["freiwort"])
  });

  var changed = multiChoiceAppend({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("append-host-list-return", changed, true);
  assertArray("append-host-list-normalized", entryObj.field("Typ"), ["freiwort", "Tag"]);
}

function testRemoveDeletesValue() {
  var entryObj = makeEntry({
    Typ: ["Start", "Tag", "End"]
  });

  var changed = multiChoiceRemove({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("remove-value-return", changed, true);
  assertArray("remove-value", entryObj.field("Typ"), ["Start", "End"]);
}

function testRemoveSkipsMissing() {
  var entryObj = makeEntry({
    Typ: ["Start"]
  });

  var changed = multiChoiceRemove({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("remove-missing-return", changed, false);
  assertArray("remove-missing-keeps-value", entryObj.field("Typ"), ["Start"]);
}

function testRemoveNormalizesScalarToEmpty() {
  var entryObj = makeEntry({
    Typ: "Tag"
  });

  var changed = multiChoiceRemove({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("remove-scalar-return", changed, true);
  assertArray("remove-scalar-empty", entryObj.field("Typ"), []);
}

function testRemoveNormalizesJavaList() {
  var entryObj = makeEntry({
    Typ: makeJavaList(["freiwort", "Tag"])
  });

  var changed = multiChoiceRemove({
    entryObj: entryObj,
    field: "Typ",
    value: "Tag"
  });

  assertEquals("remove-java-list-return", changed, true);
  assertArray("remove-java-list-normalized", entryObj.field("Typ"), ["freiwort"]);
}

testAppendAddsValue();
testAppendSkipsDuplicate();
testAppendNormalizesScalar();
testAppendNormalizesHostList();
testRemoveDeletesValue();
testRemoveNormalizesJavaList();
testRemoveSkipsMissing();
testRemoveNormalizesScalarToEmpty();

WScript.Echo("OK");
