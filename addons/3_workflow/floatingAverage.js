/*
========================================
B5 Floating Average v1.01 (sys 2.50)
========================================

Changes
- add floating average addon
- sort entries by date and id
- group adjacent entries by configurable fields
- support bulk writes and current-entry-only writes

Usage

updateAverage({
  entries: lib().entries(),
  currentEntry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis"],
  fieldValue: "Ausgabewert GW+AT",
  fieldResult: "Ausgabewert Mittel",
  ignoreFields: ["Unausgefuellt"],
  avgCount: 3,
  skipFirst: 2
});

*/

/*
========================================
B5 Floating Average v1.01 (sys 2.50)
========================================
*/

function getFloatingAverageVersion() {
  return {
    name: "floatingAverage",
    version: "1.01",
    sysVersion: "2.50",
    path: "addons/3_workflow/floatingAverage.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("floatingAverage", "1.01", "2.50", "addons/3_workflow/floatingAverage.js", true);
}

function floatingTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function floatingIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function floatingIsEmpty(val) {
  if (val == null) return true;
  if (floatingIsArray(val)) return val.length === 0;
  if (typeof val === "string") return floatingTrim(val) === "";
  return false;
}

function floatingDateTime(val) {
  var s;
  var m;
  var d;

  if (val == null || val === "") return null;
  if (val instanceof Date) return val.getTime();

  s = floatingTrim(val);
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

function floatingEntryId(entryObj) {
  if (!entryObj) return "";
  if (typeof entryObj.id === "function") return String(entryObj.id());
  if (entryObj.id != null) return String(entryObj.id);
  return "";
}

function floatingSameEntry(a, b) {
  var aid;
  var bid;

  if (!a || !b) return false;
  if (a === b) return true;

  aid = floatingEntryId(a);
  bid = floatingEntryId(b);
  return aid !== "" && aid === bid;
}

function floatingEntriesWithCurrent(entries, currentEntry) {
  var out = [];
  var replaced = false;
  var i;

  if (entries && entries.length) {
    for (i = 0; i < entries.length; i++) {
      if (currentEntry && floatingSameEntry(entries[i], currentEntry)) {
        out.push(currentEntry);
        replaced = true;
      } else {
        out.push(entries[i]);
      }
    }
  }

  if (currentEntry && !replaced) out.push(currentEntry);

  return out;
}

function floatingSameGroup(a, b, groupFields) {
  var i;
  if (!a || !b) return false;

  for (i = 0; i < groupFields.length; i++) {
    if (String(a.field(groupFields[i])) !== String(b.field(groupFields[i]))) return false;
  }

  return true;
}

function floatingHasEmptyGroup(entryObj, groupFields) {
  var i;

  for (i = 0; i < groupFields.length; i++) {
    if (floatingIsEmpty(entryObj.field(groupFields[i]))) return true;
  }

  return false;
}

function floatingIsIgnored(entryObj, ignoreFields) {
  var i;

  for (i = 0; i < ignoreFields.length; i++) {
    if (!floatingIsEmpty(entryObj.field(ignoreFields[i]))) return true;
  }

  return false;
}

function floatingNumber(entryObj, fieldName) {
  var raw;
  var num;

  if (!entryObj || !fieldName) return null;

  raw = entryObj.field(fieldName);
  if (raw == null || raw === "") return null;

  num = Number(String(raw).replace(",", "."));
  if (isNaN(num)) return null;

  return num;
}

function floatingRound(num, places) {
  var p = Number(places);
  var factor;

  if (isNaN(p) || p < 0) p = 2;

  factor = Math.pow(10, p);
  return Math.round(num * factor) / factor;
}

function floatingSortedEntries(entries, fieldDate) {
  var dated = [];
  var i;
  var entryObj;
  var t;

  for (i = 0; i < entries.length; i++) {
    entryObj = entries[i];
    if (!entryObj) continue;

    t = floatingDateTime(entryObj.field(fieldDate));
    if (t == null) continue;

    dated.push({
      entry: entryObj,
      time: t,
      id: floatingEntryId(entryObj)
    });
  }

  dated.sort(function(a, b) {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  var out = [];
  for (i = 0; i < dated.length; i++) out.push(dated[i].entry);
  return out;
}

function updateAverage(cfg) {
  cfg = cfg || {};

  var entries = cfg.entries || [];
  var currentEntry = cfg.currentEntry || null;
  var fieldDate = cfg.fieldDate;
  var groupFields = cfg.groupFields || [];
  var fieldValue = cfg.fieldValue;
  var fieldResult = cfg.fieldResult;
  var ignoreFields = cfg.ignoreFields || [];
  var avgCount = cfg.avgCount == null ? 3 : Number(cfg.avgCount);
  var skipFirst = cfg.skipFirst == null ? 0 : Number(cfg.skipFirst);
  var decimals = cfg.decimals == null ? 2 : Number(cfg.decimals);
  var calcEntries;
  var sorted;
  var groupList = [];
  var result = {
    written: [],
    skipped: []
  };
  var i;
  var e;
  var validEntries;
  var usableEntries;
  var sum;
  var j;
  var k;
  var value;

  if (isNaN(avgCount) || avgCount < 1) avgCount = 3;
  if (isNaN(skipFirst) || skipFirst < 0) skipFirst = 0;

  if (!fieldDate || !fieldValue || !fieldResult) return result;

  calcEntries = currentEntry ? floatingEntriesWithCurrent(entries, currentEntry) : entries;
  if (!calcEntries || !calcEntries.length) return result;

  sorted = floatingSortedEntries(calcEntries, fieldDate);

  for (i = 0; i < sorted.length; i++) {
    e = sorted[i];

    if (i > 0 && !floatingHasEmptyGroup(e, groupFields) && !floatingHasEmptyGroup(sorted[i - 1], groupFields) && floatingSameGroup(e, sorted[i - 1], groupFields)) {
      groupList.push(e);
    } else {
      groupList = [e];
    }

    if (currentEntry && !floatingSameEntry(e, currentEntry)) {
      result.skipped.push(floatingEntryId(e));
      continue;
    }

    value = floatingNumber(e, fieldValue);
    if (floatingHasEmptyGroup(e, groupFields) || floatingIsIgnored(e, ignoreFields) || value == null) {
      e.set(fieldResult, null);
      result.written.push(fieldResult);
      continue;
    }

    validEntries = [];

    for (j = 0; j < groupList.length; j++) {
      if (floatingHasEmptyGroup(groupList[j], groupFields)) continue;
      if (floatingIsIgnored(groupList[j], ignoreFields)) continue;
      if (floatingNumber(groupList[j], fieldValue) == null) continue;

      validEntries.push(groupList[j]);
    }

    usableEntries = validEntries.slice(skipFirst);

    if (usableEntries.length < avgCount || !floatingSameEntry(usableEntries[usableEntries.length - 1], e)) {
      e.set(fieldResult, null);
      result.written.push(fieldResult);
      continue;
    }

    sum = 0;
    for (k = usableEntries.length - avgCount; k < usableEntries.length; k++) {
      sum += floatingNumber(usableEntries[k], fieldValue);
    }

    e.set(fieldResult, floatingRound(sum / avgCount, decimals));
    result.written.push(fieldResult);
  }

  return result;
}
