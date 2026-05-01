/*
========================================
Addon Sequence Counter v1.00 (sys 2.11)
========================================

Changes
- add sequence and spree counter addon
- sort entries by date and id
- group adjacent entries by configurable fields
- support bulk writes and current-entry-only writes

Usage

updateSequenceSpree({
  entries: lib().entries(),
  currentEntry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis"],
  fieldSequence: "Reihe",
  fieldSpree: "Spree",
  fieldSequenceMax: "Reihe Max",
  fieldSpreeMax: "Spree Max"
});

========================================
*/

function sequenceTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function sequenceIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function sequenceIsEmpty(val) {
  if (val == null) return true;
  if (sequenceIsArray(val)) return val.length === 0;
  if (typeof val === "string") return sequenceTrim(val) === "";
  return false;
}

function sequenceHasTarget(fieldName) {
  return fieldName != null && fieldName !== "";
}

function sequenceDateTime(val) {
  var s;
  var m;
  var d;

  if (val == null || val === "") return null;
  if (val instanceof Date) return val.getTime();

  s = sequenceTrim(val);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (m) {
    d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    );
    if (!isNaN(d.getTime())) return d.getTime();
  }

  d = new Date(val);
  if (!isNaN(d.getTime())) return d.getTime();

  return null;
}

function sequenceEntryId(entryObj) {
  if (!entryObj) return "";
  if (entryObj.id != null) return String(entryObj.id);
  if (typeof entryObj.id === "function") return String(entryObj.id());
  return "";
}

function sequenceSameEntry(a, b) {
  var aid;
  var bid;

  if (!a || !b) return false;
  if (a === b) return true;

  aid = sequenceEntryId(a);
  bid = sequenceEntryId(b);
  return aid !== "" && aid === bid;
}

function sequenceHasEmptyGroup(entryObj, groupFields) {
  var i;
  if (!groupFields || !groupFields.length) return false;

  for (i = 0; i < groupFields.length; i++) {
    if (sequenceIsEmpty(entryObj.field(groupFields[i]))) return true;
  }

  return false;
}

function sequenceSameGroup(a, b, groupFields) {
  var i;
  if (!a || !b) return false;

  for (i = 0; i < groupFields.length; i++) {
    if (String(a.field(groupFields[i])) !== String(b.field(groupFields[i]))) return false;
  }

  return true;
}

function sequenceSetIfTarget(entryObj, fieldName, value, result) {
  if (!sequenceHasTarget(fieldName)) return;
  entryObj.set(fieldName, value);
  result.written.push(fieldName);
}

function sequenceBuildRows(entries, fieldDate, groupFields) {
  var dated = [];
  var rows = [];
  var blocks = [];
  var sequence = 0;
  var spree = 0;
  var currentBlock = null;
  var prevValidEntry = null;
  var i;
  var entryObj;
  var t;
  var row;

  for (i = 0; i < entries.length; i++) {
    entryObj = entries[i];
    if (!entryObj) continue;

    t = sequenceDateTime(entryObj.field(fieldDate));
    if (t == null) continue;

    dated.push({
      entry: entryObj,
      time: t,
      id: sequenceEntryId(entryObj)
    });
  }

  dated.sort(function(a, b) {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  for (i = 0; i < dated.length; i++) {
    entryObj = dated[i].entry;

    if (sequenceHasEmptyGroup(entryObj, groupFields)) {
      rows.push({
        entry: entryObj,
        valid: false,
        sequence: null,
        spree: null,
        spreeMax: null
      });
      prevValidEntry = null;
      currentBlock = null;
      continue;
    }

    if (currentBlock && prevValidEntry && sequenceSameGroup(entryObj, prevValidEntry, groupFields)) {
      spree++;
    } else {
      sequence++;
      spree = 1;
      currentBlock = { items: [] };
      blocks.push(currentBlock);
    }

    row = {
      entry: entryObj,
      valid: true,
      sequence: sequence,
      spree: spree,
      spreeMax: null
    };

    currentBlock.items.push(row);
    rows.push(row);
    prevValidEntry = entryObj;
  }

  for (i = 0; i < blocks.length; i++) {
    for (var j = 0; j < blocks[i].items.length; j++) {
      blocks[i].items[j].spreeMax = blocks[i].items.length;
    }
  }

  return {
    rows: rows,
    sequenceMax: blocks.length
  };
}

function updateSequenceSpree(cfg) {
  cfg = cfg || {};

  var entries = cfg.entries || [];
  var currentEntry = cfg.currentEntry || null;
  var fieldDate = cfg.fieldDate;
  var groupFields = cfg.groupFields || [];
  var fieldSequence = cfg.fieldSequence || "";
  var fieldSpree = cfg.fieldSpree || "";
  var fieldSequenceMax = cfg.fieldSequenceMax || "";
  var fieldSpreeMax = cfg.fieldSpreeMax || "";
  var clearOnEmpty = cfg.clearOnEmpty !== false;
  var calculated;
  var rows;
  var result = {
    written: [],
    skipped: [],
    sequenceMax: 0
  };
  var i;
  var row;
  var e;

  if (!entries || !entries.length || !fieldDate) return result;

  calculated = sequenceBuildRows(entries, fieldDate, groupFields);
  rows = calculated.rows;
  result.sequenceMax = calculated.sequenceMax;

  for (i = 0; i < rows.length; i++) {
    row = rows[i];
    e = row.entry;

    if (currentEntry && !sequenceSameEntry(e, currentEntry)) {
      result.skipped.push(sequenceEntryId(e));
      continue;
    }

    if (!row.valid) {
      if (clearOnEmpty) {
        sequenceSetIfTarget(e, fieldSequence, null, result);
        sequenceSetIfTarget(e, fieldSpree, null, result);
        sequenceSetIfTarget(e, fieldSequenceMax, null, result);
        sequenceSetIfTarget(e, fieldSpreeMax, null, result);
      }
      continue;
    }

    sequenceSetIfTarget(e, fieldSequence, row.sequence, result);
    sequenceSetIfTarget(e, fieldSpree, row.spree, result);
    sequenceSetIfTarget(e, fieldSequenceMax, calculated.sequenceMax, result);
    sequenceSetIfTarget(e, fieldSpreeMax, row.spreeMax, result);
  }

  return result;
}
