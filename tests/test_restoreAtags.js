var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var restorePath = fso.BuildPath(scriptDir, "..\\core\\restoreAtags.js");

eval(fso.OpenTextFile(restorePath, 1).ReadAll());

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

function makeIdEntry(id, fields) {
  var e = makeEntry(fields);
  e.id = id;
  return e;
}

function makeFunctionIdEntry(id, fields) {
  var e = makeEntry(fields);
  e.id = function() {
    return id;
  };
  return e;
}

function makeStrictEntry(fields) {
  return {
    _fields: fields,
    field: function(name) {
      return this._fields[name];
    },
    set: function(name, value) {
      if (!this._fields.hasOwnProperty(name)) throw new Error("missing field " + name);
      this._fields[name] = value;
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

function testDirectMapIsExclusiveByDefault() {
  var entryObj = makeEntry({
    Json: "{\"emo\":2,\"info\":\"a,b\",\"other\":5}",
    Other_t: "keep"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Json",
    map: {
      emo: "Emotion",
      info: { field: "Info", force_type: "list" }
    }
  });

  assertEqual("map-number", entryObj.field("Emotion"), 2);
  assertArray("map-list", entryObj.field("Info"), ["a", "b"]);
  assertEqual("map-exclusive-no-auto", entryObj.field("other_t"), undefined);
}

function testMappingsCanRunAdditionalAutoRestore() {
  var entryObj = makeEntry({
    Json: "{\"emo\":2,\"other\":5}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Json",
    mappings: ["emo - Emotion"],
    additional: true
  });

  assertEqual("additional-map", entryObj.field("Emotion"), 2);
  assertEqual("additional-auto", entryObj.field("other_"), 5);
}

function testAutoRestoreUsesUnderscoreSuffixByDefault() {
  var entryObj = makeEntry({
    Json: "{\"emo\":2,\"info\":\"a,b\"}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Json"
  });

  assertEqual("default-underscore-suffix", entryObj.field("emo_"), 2);
  assertArray("default-list-suffix", entryObj.field("info_l"), ["a", "b"]);
}

function testAliasFieldNotationBuildsMappings() {
  var entryObj = makeEntry({
    Alias: "@@Kopfschmerz (KSch)[Kopf Feld]: ks, Kopfdruck1",
    Json: "{\"Kopfschmerz\":3,\"other\":5}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Json",
    aliasTextFields: ["Alias"],
    mode: "exclusive"
  });

  assertEqual("alias-field-base", entryObj.field("Kopf Feld"), 3);
  assertEqual("alias-field-exclusive", entryObj.field("other_t"), undefined);
}

function testRestoreGroupClearsMappedFieldsAndHonorsLimit() {
  var first = makeEntry({
    Json: "{\"emo\":2}",
    Emotion: "old",
    Info: "old info"
  });
  var second = makeEntry({
    Json: "{\"info\":\"neu\"}",
    Emotion: "old second",
    Info: "old second info"
  });

  restoreAtags({
    entries: [first, second],
    sourceField: "Json",
    map: {
      emo: "Emotion",
      info: "Info"
    },
    limit: 1
  });

  assertEqual("group-first-emotion", first.field("Emotion"), 2);
  assertEqual("group-first-clears-missing-info", first.field("Info"), "");
  assertEqual("group-limit-keeps-second-emotion", second.field("Emotion"), "old second");
  assertEqual("group-limit-keeps-second-info", second.field("Info"), "old second info");
}

function testRestoreGroupObjectWithEntriesMethod() {
  var first = makeEntry({
    Json: "{\"emo\":1}",
    Emotion: "old"
  });
  var group = {
    entries: function() {
      return [first];
    }
  };

  restoreAtags({
    group: group,
    sourceField: "Json",
    map: {
      emo: "Emotion"
    }
  });

  assertEqual("group-object-entry", first.field("Emotion"), 1);
}

function makeJavaList(items) {
  return {
    size: function() {
      return items.length;
    },
    get: function(index) {
      return items[index];
    },
    item: function(index) {
      return items[index];
    },
    iterator: function() {
      var index = 0;
      return {
        hasNext: function() {
          return index < items.length;
        },
        next: function() {
          return items[index++];
        }
      };
    }
  };
}

function makeJavaSizeList(items) {
  return {
    size: function() {
      return items.length;
    },
    get: function(index) {
      return items[index];
    }
  };
}

function makeArrayLikeWithEntriesMethod(items) {
  var out = {
    length: items.length,
    entries: function() {
      return makeJavaIterator(["wrong"]);
    }
  };
  for (var i = 0; i < items.length; i++) out[i] = items[i];
  return out;
}

function makeJavaIterator(items) {
  var index = 0;
  return {
    hasNext: function() {
      return index < items.length;
    },
    next: function() {
      return items[index++];
    }
  };
}

function testRestoreJavaListEntries() {
  var first = makeEntry({
    Json: "{\"emo\":1}"
  });
  var second = makeEntry({
    Json: "{\"emo\":2}"
  });

  restoreAtags({
    entries: makeJavaList([first, second]),
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("java-list-entry-first", first.field("emo_"), 1);
  assertEqual("java-list-entry-second", second.field("emo_"), 2);
}

function testRestoreJavaSizeListEntriesLikeTypedTextFields() {
  var first = makeEntry({
    Json: "{\"emo\":3}"
  });
  var second = makeEntry({
    Json: "{\"emo\":4}"
  });

  restoreAtags({
    entries: makeJavaSizeList([first, second]),
    sourceField: "Json",
    targetFields: makeJavaSizeList(["emo_"])
  });

  assertEqual("java-size-list-entry-first", first.field("emo_"), 3);
  assertEqual("java-size-list-entry-second", second.field("emo_"), 4);
}

function testRestoreGroupEntriesMethodReturningJavaList() {
  var first = makeEntry({
    Json: "{\"emo\":5}"
  });
  var second = makeEntry({
    Json: "{\"emo\":6}"
  });
  var group = {
    entries: function() {
      return makeJavaSizeList([first, second]);
    }
  };

  restoreAtags({
    group: group,
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("group-entries-java-list-first", first.field("emo_"), 5);
  assertEqual("group-entries-java-list-second", second.field("emo_"), 6);
}

function testRestoreIteratorEntries() {
  var first = makeEntry({
    Json: "{\"emo\":7}"
  });
  var second = makeEntry({
    Json: "{\"emo\":8}"
  });

  restoreAtags({
    entries: makeJavaIterator([first, second]),
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("iterator-entry-first", first.field("emo_"), 7);
  assertEqual("iterator-entry-second", second.field("emo_"), 8);
}

function testEntriesOptionDoesNotCallEntriesMethod() {
  var first = makeEntry({
    Json: "{\"emo\":9}"
  });
  var second = makeEntry({
    Json: "{\"emo\":10}"
  });

  restoreAtags({
    entries: makeArrayLikeWithEntriesMethod([first, second]),
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("entries-option-direct-list-first", first.field("emo_"), 9);
  assertEqual("entries-option-direct-list-second", second.field("emo_"), 10);
}

function testCurrentEntryReplacesStaleEntryLikeSequenceCounter() {
  var stale = makeFunctionIdEntry("2", {
    Json: "{\"emo\":1}"
  });
  var current = makeFunctionIdEntry("2", {
    Json: "{\"emo\":9}"
  });
  var other = makeFunctionIdEntry("1", {
    Json: "{\"emo\":3}"
  });

  restoreAtags({
    entries: [other, stale],
    currentEntry: current,
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("restore-current-entry-replaces-stale", current.field("emo_"), 9);
  assertEqual("restore-current-entry-skips-other", other.field("emo_"), undefined);
  assertEqual("restore-stale-not-written", stale.field("emo_"), undefined);
}

function testCurrentEntryIsAddedWhenMissingLikeSequenceCounter() {
  var current = makeIdEntry("3", {
    Json: "{\"emo\":7}"
  });
  var other = makeIdEntry("1", {
    Json: "{\"emo\":3}"
  });

  restoreAtags({
    entries: [other],
    currentEntry: current,
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("restore-current-entry-added", current.field("emo_"), 7);
  assertEqual("restore-current-entry-added-skips-other", other.field("emo_"), undefined);
}

function testArrayValueModesDefaultAvgAndConfigurable() {
  var avgEntry = makeEntry({
    Json: "{\"emo\":[1,3,8]}"
  });
  var firstEntry = makeEntry({
    Json: "{\"emo\":[1,3,8]}"
  });
  var lastEntry = makeEntry({
    Json: "{\"emo\":[1,3,8]}"
  });
  var medianEntry = makeEntry({
    Json: "{\"emo\":[1,8,3,10]}"
  });
  var minEntry = makeEntry({
    Json: "{\"emo\":[1,8,3,10]}"
  });
  var maxEntry = makeEntry({
    Json: "{\"emo\":[1,8,3,10]}"
  });

  restoreAtags({
    entryObj: avgEntry,
    sourceField: "Json",
    map: { emo: "Emotion" }
  });
  restoreAtags({
    entryObj: firstEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "first"
  });
  restoreAtags({
    entryObj: lastEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "last"
  });
  restoreAtags({
    entryObj: medianEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "median"
  });
  restoreAtags({
    entryObj: minEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "min"
  });
  restoreAtags({
    entryObj: maxEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "max"
  });

  assertEqual("array-default-avg", avgEntry.field("Emotion"), 4);
  assertEqual("array-first", firstEntry.field("Emotion"), 1);
  assertEqual("array-last", lastEntry.field("Emotion"), 8);
  assertEqual("array-median", medianEntry.field("Emotion"), 5.5);
  assertEqual("array-min", minEntry.field("Emotion"), 1);
  assertEqual("array-max", maxEntry.field("Emotion"), 10);
}

function testAutoRestoreAveragesRepeatedJsonArrayByDefault() {
  var entryObj = makeEntry({
    Json: "{\"emo\":[1,3]}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Json",
    targetFields: ["emo_"]
  });

  assertEqual("auto-array-default-avg", entryObj.field("emo_"), 2);
}

function testAutoRestoreAveragesAggregateTextByDefault() {
  var entryObj = makeEntry({
    "Atag Json": "{\"Perserveration\":\"2 [3, 1]\"}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    targetFields: ["Perserveration_"]
  });

  assertEqual("auto-aggregate-text-default-avg", entryObj.field("Perserveration_"), 2);
}

function testAggregateTextValueModesAreConfigurable() {
  var firstEntry = makeEntry({
    Json: "{\"emo\":\"2 [3, 1]\"}"
  });
  var lastEntry = makeEntry({
    Json: "{\"emo\":\"2 [3, 1]\"}"
  });
  var minEntry = makeEntry({
    Json: "{\"emo\":\"2 [3, 1]\"}"
  });
  var maxEntry = makeEntry({
    Json: "{\"emo\":\"2 [3, 1]\"}"
  });

  restoreAtags({
    entryObj: firstEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "first"
  });
  restoreAtags({
    entryObj: lastEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "last"
  });
  restoreAtags({
    entryObj: minEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "min"
  });
  restoreAtags({
    entryObj: maxEntry,
    sourceField: "Json",
    map: { emo: "Emotion" },
    valueMode: "max"
  });

  assertEqual("aggregate-text-first", firstEntry.field("Emotion"), 3);
  assertEqual("aggregate-text-last", lastEntry.field("Emotion"), 1);
  assertEqual("aggregate-text-min", minEntry.field("Emotion"), 1);
  assertEqual("aggregate-text-max", maxEntry.field("Emotion"), 3);
}

function testMappingValueModeOverridesGlobalMode() {
  var entryObj = makeEntry({
    Json: "{\"emo\":[1,3,8]}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Json",
    map: {
      emo: { field: "Emotion", valueMode: "last" }
    },
    valueMode: "first"
  });

  assertEqual("mapping-value-mode", entryObj.field("Emotion"), 8);
}

function testRealFieldMappingFromJsonNumber() {
  var entryObj = makeEntry({
    "Atag Json": "{\"Erschöpfung\":2,\"Haushalt\":null,\"jetzt\":null,\"Kopfschmerz\":2,\"Perserveration\":1,\"Ruhe\":2,\"Spielen\":null,\"überreizt\":2}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    map: {
      Perserveration: "Perserveration"
    },
    mode: "exclusive"
  });

  assertEqual("real-field-number-mapping", entryObj.field("Perserveration"), 1);
}

function testAutoRestoreAllowsEmptySuffixForSameNamedFields() {
  var entryObj = makeEntry({
    "Atag Json": "{\"Perserveration\":1,\"Info\":\"a,b\"}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    suffix: "",
    listSuffix: "_l"
  });

  assertEqual("empty-suffix-real-field", entryObj.field("Perserveration"), 1);
  assertArray("empty-suffix-list-field", entryObj.field("Info_l"), ["a", "b"]);
}

function testAutoRestoreWritesUnderscoreSuffixedRealField() {
  var entryObj = makeEntry({
    "Atag Json": "{\"Erschöpfung\":2,\"Haushalt\":null,\"jetzt\":null,\"Kopfschmerz\":2,\"Perserveration\":1,\"Ruhe\":2,\"Spielen\":null,\"überreizt\":2}"
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    suffix: "_",
    listSuffix: "_l"
  });

  assertEqual("underscore-suffix-real-field", entryObj.field("Perserveration_"), 1);
  assertEqual("underscore-suffix-other-real-field", entryObj.field("Ruhe_"), 2);
}

function testAutoRestoreContinuesAfterMissingTargetField() {
  var entryObj = makeStrictEntry({
    "Atag Json": "{\"Erschöpfung\":2,\"Perserveration\":1,\"Ruhe\":2}",
    "Perserveration_": null
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    suffix: "_",
    listSuffix: "_l"
  });

  assertEqual("auto-continues-after-missing-field", entryObj.field("Perserveration_"), 1);
}

function testDebugFieldReportsRestoreSteps() {
  var entryObj = makeEntry({
    "Atag Json": "{\"Perserveration\":1}",
    Debug: ""
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    map: {
      Perserveration: "Perserveration_"
    },
    mode: "exclusive",
    debugField: "Debug"
  });

  if (String(entryObj.field("Debug")).indexOf("map ok: Perserveration -> Perserveration_ = 1") < 0) {
    fail("debug-field-missing-map-ok: " + entryObj.field("Debug"));
  }
}

function testDebugLogReportsRestoreSteps() {
  var entryObj = makeEntry({
    "Atag Json": "{\"Perserveration\":1}"
  });
  var oldLog = typeof log === "undefined" ? null : log;
  var hadLog = typeof log !== "undefined";
  var lines = [];

  log = function(msg) {
    lines.push(String(msg));
  };

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    map: {
      Perserveration: "Perserveration_"
    },
    mode: "exclusive",
    debugLog: true
  });

  if (hadLog) log = oldLog;
  else log = undefined;

  if (lines.join("\n").indexOf("map ok: Perserveration -> Perserveration_ = 1") < 0) {
    fail("debug-log-missing-map-ok: " + lines.join("\n"));
  }
}

function testAutoRestoreSkipsMissingTargetsWhenFieldListIsKnown() {
  var entryObj = makeStrictEntry({
    "Atag Json": "{\"Erschöpfung\":2,\"Perserveration\":2,\"Stimmung\":1}",
    "Perserveration_": null,
    Debug: ""
  });

  restoreAtags({
    entryObj: entryObj,
    sourceField: "Atag Json",
    targetFields: ["Atag Json", "Perserveration_", "Debug"],
    debugField: "Debug"
  });

  assertEqual("known-field-list-perserveration", entryObj.field("Perserveration_"), 2);
  if (String(entryObj.field("Debug")).indexOf("auto error:") >= 0) {
    fail("known-field-list-should-not-log-auto-error: " + entryObj.field("Debug"));
  }
  if (String(entryObj.field("Debug")).indexOf("auto skip missing target: Erschöpfung -> Erschöpfung_") < 0) {
    fail("known-field-list-missing-skip: " + entryObj.field("Debug"));
  }
}

testDirectMapIsExclusiveByDefault();
testMappingsCanRunAdditionalAutoRestore();
testAutoRestoreUsesUnderscoreSuffixByDefault();
testAliasFieldNotationBuildsMappings();
testRestoreGroupClearsMappedFieldsAndHonorsLimit();
testRestoreGroupObjectWithEntriesMethod();
testRestoreJavaListEntries();
testRestoreJavaSizeListEntriesLikeTypedTextFields();
testRestoreGroupEntriesMethodReturningJavaList();
testRestoreIteratorEntries();
testEntriesOptionDoesNotCallEntriesMethod();
testCurrentEntryReplacesStaleEntryLikeSequenceCounter();
testCurrentEntryIsAddedWhenMissingLikeSequenceCounter();
testArrayValueModesDefaultAvgAndConfigurable();
testAutoRestoreAveragesRepeatedJsonArrayByDefault();
testAutoRestoreAveragesAggregateTextByDefault();
testAggregateTextValueModesAreConfigurable();
testMappingValueModeOverridesGlobalMode();
testRealFieldMappingFromJsonNumber();
testAutoRestoreAllowsEmptySuffixForSameNamedFields();
testAutoRestoreWritesUnderscoreSuffixedRealField();
testAutoRestoreContinuesAfterMissingTargetField();
testDebugFieldReportsRestoreSteps();
testDebugLogReportsRestoreSteps();
testAutoRestoreSkipsMissingTargetsWhenFieldListIsKnown();

WScript.Echo("OK");
