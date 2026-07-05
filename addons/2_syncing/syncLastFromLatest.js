/*
========================================
B4 Sync Last From Latest v1.05 (sys 2.30)
========================================

Changes
- clearTemplateSlots also handles Java/string-like text field values
- add clearTemplateSlots to empty marker-wrapped template values while carrying templates forward
- support maxEntries 0 for newest entry and -1 for full date scan
- use newest library entry when syncLastFromLatest has no fieldDate
- limit date-field scans by maxEntries/maxScan with default 100
- default newest-library helper to first lib().entries() item
- add explicit modified-time newest-entry helper with id fallback
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

var newest = getNewestLibraryEntry();
if (newest) applyHourGuide({ entryObj: newest });
*/

function slflTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function slflIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function slflIsString(val) {
  return typeof val === "string" || Object.prototype.toString.call(val) === "[object String]";
}

function slflListLength(val) {
  var n;

  if (val == null || slflIsString(val)) return null;
  if (slflIsArray(val)) return val.length;

  try {
    n = Number(val.length);
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e0) {}

  try {
    n = Number(val.length());
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e1) {}

  try {
    n = Number(val.size());
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e2) {}

  return null;
}

function slflListItem(val, index) {
  try {
    if (typeof val.get === "function") return val.get(index);
  } catch (e0) {}
  try {
    if (typeof val.item === "function") return val.item(index);
  } catch (e1) {}
  return val[index];
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

function slflRegexEscape(text) {
  return String(text || "").replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function slflTemplateSlotMarker(cfg) {
  var marker = cfg && cfg.templateSlotMarker;
  marker = marker == null || marker === "" ? "_" : String(marker);
  return marker.charAt(0);
}

function slflClearTemplateSlots(text, cfg) {
  var tagName = "#?[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\\-]*";
  var marker = slflRegexEscape(slflTemplateSlotMarker(cfg));
  var rx = new RegExp("(^|[\\s,;.!?()\\[\\]{}])(" + tagName + "\\s*(?:::\\s*|:\\s*|#))" + marker + "([^" + marker + "\\r\\n]*)" + marker, "g");

  return String(text || "").replace(rx, function(all, lead, prefix) {
    return lead + prefix + slflTemplateSlotMarker(cfg) + slflTemplateSlotMarker(cfg);
  });
}

function slflPrepareValueForCopy(value, cfg) {
  var text;
  var cleared;

  if (!cfg || cfg.clearTemplateSlots !== true) return slflClone(value);

  if (slflIsString(value)) return slflClearTemplateSlots(value, cfg);

  if (value != null && slflListLength(value) == null && !(value instanceof Date)) {
    text = String(value);
    cleared = slflClearTemplateSlots(text, cfg);
    if (cleared !== text) return cleared;
  }

  return slflClone(value);
}

function slflEntryIdValue(entryObj) {
  var raw;
  var n;

  if (!entryObj) return 0;

  try {
    raw = typeof entryObj.id === "function" ? entryObj.id() : entryObj.id;
  } catch (e0) {
    raw = 0;
  }

  n = Number(raw);
  if (isNaN(n)) return 0;
  return n;
}

function slflEntryModifiedTimeValue(entryObj) {
  var raw;
  var n;
  var d;

  if (!entryObj) return 0;

  try {
    raw = typeof entryObj.modifiedTime === "function" ? entryObj.modifiedTime() : entryObj.modifiedTime;
  } catch (e0) {
    raw = null;
  }

  if (raw instanceof Date) return raw.getTime();

  n = Number(raw);
  if (!isNaN(n) && n > 0) return n;

  d = slflDateTime(raw);
  return d == null ? 0 : d;
}

function slflNewestScanLimit(entries, cfg) {
  var len = slflListLength(entries);
  var maxScan = cfg && (cfg.maxScan != null ? cfg.maxScan : cfg.limit);
  var n;

  if (len == null) return 0;
  if (maxScan == null || maxScan === "") return len;

  n = Number(maxScan);
  if (isNaN(n) || n < 1) return len;
  if (n > len) return len;
  return Math.floor(n);
}

function slflFirstEntry(entries) {
  if (!entries || slflListLength(entries) < 1) return null;
  return slflListItem(entries, 0);
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
  var maxEntries = 100;
  var len = slflListLength(entries);
  var i;
  var e;
  var t;

  if (!entries || len == null || len < 1) return null;
  if (arguments.length > 3 && arguments[3] != null && arguments[3] !== "") {
    maxEntries = Number(arguments[3]);
    if (maxEntries === -1) maxEntries = len;
    if (isNaN(maxEntries) || maxEntries < 1) maxEntries = len;
  }
  if (maxEntries > len) maxEntries = len;

  for (i = 0; i < maxEntries; i++) {
    e = slflListItem(entries, i);
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

function slflFindNewestOtherEntry(entries, currentEntry) {
  var len = slflListLength(entries);
  var i;
  var e;

  if (!entries || len == null || len < 1) return null;

  for (i = 0; i < len; i++) {
    e = slflListItem(entries, i);
    if (e && e !== currentEntry) return e;
  }

  return null;
}

function findNewestEntry(entries, cfg) {
  cfg = cfg || {};

  var len = slflNewestScanLimit(entries, cfg);
  var newest = null;
  var newestTime = -1;
  var newestId = -1;
  var i;
  var e;
  var t;
  var id;

  for (i = 0; i < len; i++) {
    e = slflListItem(entries, i);
    if (!e) continue;

    t = slflEntryModifiedTimeValue(e);
    id = slflEntryIdValue(e);

    if (!newest || t > newestTime || (t === newestTime && id > newestId)) {
      newest = e;
      newestTime = t;
      newestId = id;
    }
  }

  return newest;
}

function getNewestLibraryEntry(cfg) {
  cfg = cfg || {};

  var entries = cfg.entries || lib().entries();
  var mode = cfg.mode || cfg.by || cfg.sortBy || "creation";

  if (String(mode).toLowerCase() === "modified" || String(mode).toLowerCase() === "modifiedtime") {
    return findNewestEntry(entries, cfg);
  }

  return slflFirstEntry(entries);
}

function slflCopyField(sourceEntry, targetEntry, sourceField, targetField, onlyIfEmpty, result, cfg) {
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

  targetEntry.set(targetField, slflPrepareValueForCopy(sourceVal, cfg));
  result.updated.push(targetField);
}

function syncLastFromLatest(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || entry();
  var entries = cfg.entries || lib().entries();
  var fieldDate = cfg.fieldDate || cfg.dateField || null;
  var maxEntries = cfg.maxEntries != null ? cfg.maxEntries : cfg.maxScan;
  var maxEntryCount = maxEntries == null ? 100 : Number(maxEntries);
  var onlyIfEmpty = cfg.onlyIfEmpty === true;
  var latestEntry = fieldDate && maxEntryCount !== 0 ? slflFindLatestEntry(entries, currentEntry, fieldDate, maxEntries == null ? 100 : maxEntries) : slflFindNewestOtherEntry(entries, currentEntry);
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
        slflCopyField(latestEntry, currentEntry, cfg.map[target], target, onlyIfEmpty, result, cfg);
      }
    }
    return result;
  }

  fields = slflNormalizeFields(cfg.fields);
  for (i = 0; i < fields.length; i++) {
    slflCopyField(latestEntry, currentEntry, fields[i], fields[i], onlyIfEmpty, result, cfg);
  }

  return result;
}
