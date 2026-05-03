/*
========================================
B4 Sync Last From Latest v1.01 (sys 2.21)
========================================

Changes
- parse ISO-like date strings in WSH
- add latest-entry field sync addon
- support fields list or target-to-source map
- skip empty source values
- optional onlyIfEmpty target protection

Usage

syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  fields: ["Dosis", "Wirkstoff"],
  onlyIfEmpty: true
});

syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  map: {
    "Dosis": "Dosis",
    "Wirkstoff": "WS"
  }
});

========================================
*/

function slflTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function slflIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function slflIsEmpty(val) {
  if (val == null) return true;
  if (slflIsArray(val)) return val.length === 0;
  if (typeof val === "string") return slflTrim(val) === "";
  return false;
}

function slflClone(val) {
  if (slflIsArray(val)) return val.slice(0);
  return val;
}

function slflDateTime(val) {
  var s;
  var m;
  var d;
  if (val == null || val === "") return null;
  if (val instanceof Date) return val.getTime();

  s = slflTrim(val);
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
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

function slflNormalizeFields(fields) {
  var out = [];
  var i;
  var name;

  if (fields == null) return out;
  if (!slflIsArray(fields)) fields = [fields];

  for (i = 0; i < fields.length; i++) {
    name = slflTrim(fields[i]);
    if (name) out.push(name);
  }

  return out;
}

function slflFindLatestEntry(entries, currentEntry, fieldDate) {
  var latest = null;
  var latestTime = null;
  var i;
  var e;
  var t;

  if (!entries || !entries.length) return null;

  for (i = 0; i < entries.length; i++) {
    e = entries[i];
    if (!e || e === currentEntry) continue;

    t = slflDateTime(e.field(fieldDate));
    if (t == null) continue;

    if (latest == null || t > latestTime) {
      latest = e;
      latestTime = t;
    }
  }

  return latest;
}

function slflCopyField(sourceEntry, targetEntry, sourceField, targetField, onlyIfEmpty, result) {
  var sourceVal;
  var targetVal;

  if (!sourceEntry || !targetEntry || !sourceField || !targetField) return;

  sourceVal = sourceEntry.field(sourceField);
  if (slflIsEmpty(sourceVal)) {
    result.skipped.push(targetField);
    return;
  }

  if (onlyIfEmpty) {
    targetVal = targetEntry.field(targetField);
    if (!slflIsEmpty(targetVal)) {
      result.skipped.push(targetField);
      return;
    }
  }

  targetEntry.set(targetField, slflClone(sourceVal));
  result.updated.push(targetField);
}

function syncLastFromLatest(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || entry();
  var entries = cfg.entries || lib().entries();
  var fieldDate = cfg.fieldDate || "Einnahmedatum";
  var onlyIfEmpty = cfg.onlyIfEmpty === true;
  var latestEntry = slflFindLatestEntry(entries, currentEntry, fieldDate);
  var result = {
    sourceEntry: latestEntry,
    updated: [],
    skipped: []
  };
  var target;
  var fields;
  var i;

  if (!currentEntry || !latestEntry) return result;

  if (cfg.map) {
    for (target in cfg.map) {
      if (cfg.map.hasOwnProperty(target)) {
        slflCopyField(latestEntry, currentEntry, cfg.map[target], target, onlyIfEmpty, result);
      }
    }
    return result;
  }

  fields = slflNormalizeFields(cfg.fields);
  for (i = 0; i < fields.length; i++) {
    slflCopyField(latestEntry, currentEntry, fields[i], fields[i], onlyIfEmpty, result);
  }

  return result;
}
