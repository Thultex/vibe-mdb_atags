/*
========================================
Addon Typed Text Fields v1.00 (sys 2.11)
========================================

Changes
- add typed text field sync helper
- convert fields ending in `(t-dd)`, `(t-d)`, `(t-i)`, `(t-r)`, `(t-tag)` or `(t-l)`
- support current entry, one explicit entry, arrays, selected entries and library-wide bulk calls
- support clearSource, onlyIfTargetEmpty and dryRun options

Usage

syncTypedTextFields();
syncTypedTextFields(entry());
syncTypedTextFields(lib().entries());
syncTypedTextFields(selectedEntries(), {
  clearSource: false,
  onlyIfTargetEmpty: false,
  dryRun: false
});

========================================
*/

function typedTextIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function typedTextIsString(val) {
  return typeof val === "string" || Object.prototype.toString.call(val) === "[object String]";
}

function typedTextListLength(val) {
  var n;

  if (val == null || typedTextIsString(val)) return null;
  if (typedTextIsArray(val)) return val.length;

  if (typeof val.length === "number") {
    n = Number(val.length);
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  }

  if (typeof val.size === "function") {
    n = Number(val.size());
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  }

  return null;
}

function typedTextListItem(val, index) {
  if (typeof val.get === "function") return val.get(index);
  if (typeof val.item === "function") return val.item(index);
  return val[index];
}

function typedTextToArray(val) {
  var len;
  var out;
  var i;

  if (val == null) return [];
  if (typedTextIsArray(val)) return val.slice(0);

  len = typedTextListLength(val);
  if (len != null) {
    out = [];
    for (i = 0; i < len; i++) out.push(typedTextListItem(val, i));
    return out;
  }

  return [val];
}

function typedTextNormalizeEntries(entriesOrEntry) {
  if (typeof entriesOrEntry === "undefined" || entriesOrEntry === null) return [entry()];
  return typedTextToArray(entriesOrEntry);
}

function typedTextFieldNames() {
  return typedTextToArray(lib().fields());
}

function typedTextTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function typedTextNormalizeBaseName(name) {
  var s = String(name || "");

  s = s.replace(/\([^)]*\)/g, "");
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/\{[^}]*\}/g, "");
  s = s.replace(/[\s_\-\.]+/g, "");

  return s.toLowerCase();
}

function typedTextParseToken(fieldName) {
  var s = String(fieldName);
  var m = s.match(/^(.*)\(t-(dd|d|i|r|tag|l)\)\s*$/i);

  if (!m) return null;

  return {
    original: fieldName,
    baseName: typedTextNormalizeBaseName(m[1]),
    token: m[2].toLowerCase()
  };
}

function typedTextFindTarget(fieldNames, sourceName, sourceBaseName) {
  var matches = [];
  var i;
  var candidate;

  for (i = 0; i < fieldNames.length; i++) {
    candidate = fieldNames[i];
    if (String(candidate) === String(sourceName)) continue;
    if (/\(t-(dd|d|i|r|tag|l)\)\s*$/i.test(String(candidate))) continue;

    if (typedTextNormalizeBaseName(candidate) === sourceBaseName) matches.push(candidate);
  }

  if (matches.length === 1) return matches[0];
  return null;
}

function typedTextParseList(raw) {
  var parts;
  var out = [];
  var seen = {};
  var i;
  var item;
  var key;

  if (!raw || !typedTextTrim(raw)) return [];

  parts = String(raw).split(/\r?\n|;|\||,/g);

  for (i = 0; i < parts.length; i++) {
    item = typedTextTrim(parts[i]);
    if (!item) continue;

    key = item.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(item);
    }
  }

  return out;
}

function typedTextParseInteger(raw) {
  var s = typedTextTrim(raw);
  var m;
  var n;

  if (!s) return null;

  s = s.replace(/\s+/g, "");
  s = s.replace(/,/g, ".");
  m = s.match(/-?\d+/);
  if (!m) return null;

  n = parseInt(m[0], 10);
  return isNaN(n) ? null : n;
}

function typedTextParseNumber(raw) {
  var s = typedTextTrim(raw);
  var n;

  if (!s) return null;

  s = s.replace(/[^\d,.\-]/g, "");
  if (!s) return null;

  if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "");
      s = s.replace(/,/g, ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.indexOf(",") >= 0) {
    s = s.replace(/,/g, ".");
  }

  n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function typedTextParseDurationMinutes(raw) {
  var s = typedTextTrim(raw).toLowerCase();
  var hm;
  var h = 0;
  var m = 0;
  var found = false;
  var mh;
  var mm;
  var n;

  if (!s) return null;

  hm = s.match(/^(\d{1,3})\s*:\s*(\d{1,2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);

  mh = s.match(/(-?\d+(?:[.,]\d+)?)\s*(h|std|stunde|stunden|hour|hours)/);
  if (mh) {
    h = typedTextParseNumber(mh[1]);
    found = true;
  }

  mm = s.match(/(-?\d+(?:[.,]\d+)?)\s*(m|min|minute|minutes)/);
  if (mm) {
    m = typedTextParseNumber(mm[1]);
    found = true;
  }

  if (found) return Math.round((h || 0) * 60 + (m || 0));

  n = typedTextParseNumber(s);
  if (n !== null) return Math.round(n);

  return null;
}

function typedTextParseDate(raw) {
  var s = typedTextTrim(raw);
  var d1;
  var m;
  var day;
  var month;
  var year;
  var hh;
  var mi;
  var ss;
  var d2;

  if (!s) return null;

  d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})(?:\s+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?$/);
  if (!m) return null;

  day = parseInt(m[1], 10);
  month = parseInt(m[2], 10) - 1;
  year = parseInt(m[3], 10);
  if (year < 100) year += 2000;

  hh = m[4] ? parseInt(m[4], 10) : 0;
  mi = m[5] ? parseInt(m[5], 10) : 0;
  ss = m[6] ? parseInt(m[6], 10) : 0;

  d2 = new Date(year, month, day, hh, mi, ss);
  return isNaN(d2.getTime()) ? null : d2;
}

function typedTextConvert(raw, token) {
  var val;

  if (token === "dd") {
    val = typedTextParseDate(raw);
    return val === null ? { ok: false, reason: "Datum nicht lesbar" } : { ok: true, value: val };
  }

  if (token === "d") {
    val = typedTextParseDurationMinutes(raw);
    return val === null ? { ok: false, reason: "Dauer nicht lesbar" } : { ok: true, value: val };
  }

  if (token === "i") {
    val = typedTextParseInteger(raw);
    return val === null ? { ok: false, reason: "Integer nicht lesbar" } : { ok: true, value: val };
  }

  if (token === "r") {
    val = typedTextParseNumber(raw);
    return val === null ? { ok: false, reason: "Real nicht lesbar" } : { ok: true, value: val };
  }

  if (token === "tag" || token === "l") return { ok: true, value: typedTextParseList(raw) };

  return { ok: false, reason: "Unbekannter Token: " + token };
}

function typedTextIsEmptyValue(val) {
  if (val == null) return true;
  if (typedTextIsArray(val)) return val.length === 0;
  if (typedTextListLength(val) != null) return typedTextListLength(val) === 0;
  if (typedTextIsString(val)) return typedTextTrim(val) === "";
  return false;
}

function typedTextValuesEquivalent(a, b) {
  var arrA;
  var arrB;
  var i;

  if (a === b) return true;
  if (a == null && b == null) return true;

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  if (typedTextListLength(a) != null || typedTextListLength(b) != null) {
    arrA = typedTextToArray(a);
    arrB = typedTextToArray(b);

    if (arrA.length !== arrB.length) return false;
    for (i = 0; i < arrA.length; i++) {
      if (String(arrA[i]) !== String(arrB[i])) return false;
    }
    return true;
  }

  return false;
}

function syncTypedTextFields(entriesOrEntry, options) {
  options = options || {};

  var clearSource = !!options.clearSource;
  var onlyIfTargetEmpty = !!options.onlyIfTargetEmpty;
  var dryRun = !!options.dryRun;
  var entries = typedTextNormalizeEntries(entriesOrEntry);
  var fieldNames = typedTextFieldNames();
  var result = {
    entriesProcessed: 0,
    pairsFound: 0,
    changedPairs: 0,
    skippedPairs: 0,
    entryResults: [],
    log: []
  };
  var eIndex;
  var e;
  var entryResult;
  var i;
  var sourceName;
  var parsed;
  var sourceValue;
  var targetName;
  var raw;
  var targetCurrent;
  var converted;

  for (eIndex = 0; eIndex < entries.length; eIndex++) {
    e = entries[eIndex];
    if (!e) continue;

    entryResult = {
      entry: e,
      pairsFound: 0,
      changedPairs: 0,
      skippedPairs: 0,
      log: []
    };

    result.entriesProcessed++;

    for (i = 0; i < fieldNames.length; i++) {
      sourceName = fieldNames[i];
      parsed = typedTextParseToken(sourceName);
      if (!parsed) continue;

      sourceValue = e.field(sourceName);
      if (sourceValue === null || typeof sourceValue === "undefined") continue;

      targetName = typedTextFindTarget(fieldNames, sourceName, parsed.baseName);
      if (!targetName) {
        entryResult.skippedPairs++;
        entryResult.log.push("Kein Zielfeld fuer: " + sourceName);
        continue;
      }

      entryResult.pairsFound++;

      raw = typedTextTrim(sourceValue);
      if (raw === "") {
        entryResult.skippedPairs++;
        entryResult.log.push("Leer: " + sourceName);
        continue;
      }

      targetCurrent = e.field(targetName);
      if (onlyIfTargetEmpty && !typedTextIsEmptyValue(targetCurrent)) {
        entryResult.skippedPairs++;
        entryResult.log.push("Zielfeld nicht leer: " + targetName);
        continue;
      }

      converted = typedTextConvert(raw, parsed.token);
      if (!converted.ok) {
        entryResult.skippedPairs++;
        entryResult.log.push("Fehler bei " + sourceName + ": " + converted.reason);
        continue;
      }

      if (typedTextValuesEquivalent(targetCurrent, converted.value)) {
        entryResult.log.push("Keine Aenderung: " + sourceName + " -> " + targetName);
        continue;
      }

      if (!dryRun) {
        e.set(targetName, converted.value);
        if (clearSource) e.set(sourceName, "");
      }

      entryResult.changedPairs++;
      entryResult.log.push("Uebertragen: " + sourceName + " -> " + targetName);
    }

    result.pairsFound += entryResult.pairsFound;
    result.changedPairs += entryResult.changedPairs;
    result.skippedPairs += entryResult.skippedPairs;
    result.entryResults.push(entryResult);
  }

  return result;
}
