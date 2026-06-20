var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var addonPath = fso.BuildPath(scriptDir, "..\\addons\\3_workflow\\dustingDayCollector.js");

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

function makeJavaList(items) {
  return {
    size: function() {
      return items.length;
    },
    get: function(index) {
      return items[index];
    }
  };
}

function testBuildsOutNoteFromLinkedInputs() {
  var late = makeEntry({
    Date: "02.02.2020 05:02",
    InNote: "stress3, tätigkeit: laufen",
    InTag: ["müde", "stress"]
  });
  var early = makeEntry({
    Date: "2020-02-02 03:30",
    InNote: "40mg, #müde",
    InTag: ["mg"]
  });
  var day = makeEntry({
    InLinks: [late, early],
    OutNote: ""
  });

  var result = updateDustingDayOutNote({
    entryObj: day
  });

  assertEquals("lines-count", result.lines.length, 2);
  assertEquals("outnote-sorted", day.field("OutNote"), "3,5: 40mg, #müde, mg\n5: stress3, tätigkeit: laufen, müde, stress");
  assertEquals("updated", result.updated, true);
}

function testAcceptsJavaStyleRelationList() {
  var one = makeEntry({
    Date: "2020-02-02 08:15",
    InNote: "pause hat geholfen",
    InTag: "methode pause"
  });
  var day = makeEntry({
    InLinks: makeJavaList([one]),
    OutNote: ""
  });

  updateDustingDayOutNote({
    entryObj: day
  });

  assertEquals("java-list-relation", day.field("OutNote"), "8,5: pause hat geholfen, methode pause");
}

function testCustomFieldsAndQuarterStep() {
  var one = makeEntry({
    When: "2020-02-02 08:15",
    Note: "besser",
    Tag: "erfolg 1"
  });
  var day = makeEntry({
    Links: [one],
    NoteOut: ""
  });

  updateDustingDayOutNote({
    entryObj: day,
    inLinksField: "Links",
    outputField: "NoteOut",
    inputDateField: "When",
    inputNoteField: "Note",
    inputTagField: "Tag",
    rowStepHours: 0.25
  });

  assertEquals("custom-fields", day.field("NoteOut"), "8,25: besser, erfolg 1");
}

function testEmptyLinksWritesEmptyOutNote() {
  var day = makeEntry({
    InLinks: [],
    OutNote: "alt"
  });

  var result = updateDustingDayOutNote({
    entryObj: day
  });

  assertEquals("empty-links-text", day.field("OutNote"), "");
  assertEquals("empty-links-count", result.lines.length, 0);
}

testBuildsOutNoteFromLinkedInputs();
testAcceptsJavaStyleRelationList();
testCustomFieldsAndQuarterStep();
testEmptyLinksWritesEmptyOutNote();

WScript.Echo("OK");
