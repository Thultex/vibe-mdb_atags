/*
========================================
B10 Dusting Day Collector v0.10 (sys 2.30)
========================================

Änderungen
- erste OutNote-Erzeugung aus manuell gesetzten DustingDay.InLinks
- liest verknüpfte DustingDayInput-Einträge
- sortiert nach Date
- leitet Rows aus der Uhrzeit ab
- verbindet InNote und InTag zu Tageszeilen

Usage

updateDustingDayOutNote({
  inLinksField: "InLinks",
  outputField: "OutNote",
  inputDateField: "Date",
  inputNoteField: "InNote",
  inputTagField: "InTag"
});
*/

function ddTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function ddIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function ddListLength(val) {
  var n;

  if (val == null || typeof val === "string") return null;
  if (ddIsArray(val)) return val.length;

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

function ddListItem(val, index) {
  try {
    if (typeof val.get === "function") return val.get(index);
  } catch (e0) {}

  try {
    if (typeof val.item === "function") return val.item(index);
  } catch (e1) {}

  return val[index];
}

function ddRelationToArray(val) {
  var out = [];
  var list = val;
  var len;
  var i;

  if (val == null || val === "") return out;

  try {
    if (val && typeof val.entries === "function") list = val.entries();
  } catch (e0) {}

  len = ddListLength(list);
  if (len != null) {
    for (i = 0; i < len; i++) {
      out.push(ddListItem(list, i));
    }
    return out;
  }

  if (typeof list.field === "function") out.push(list);
  return out;
}

function ddSafeField(entryObj, fieldName) {
  if (!entryObj || !fieldName) return null;

  try {
    return entryObj.field(fieldName);
  } catch (e) {
    return null;
  }
}

function ddSafeSet(entryObj, fieldName, value) {
  if (!entryObj || !fieldName) return false;

  try {
    entryObj.set(fieldName, value);
    return true;
  } catch (e) {
    return false;
  }
}

function ddToDate(val) {
  var s;
  var m;
  var d;

  if (val == null || val === "") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === "number") {
    if (val < 100000000000) val = val * 1000;
    d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  s = ddTrim(val);

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (m) {
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    if (!isNaN(d.getTime())) return d;
  }

  m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})(?:\s+(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (m) {
    var year = Number(m[3]);
    if (year < 100) year += 2000;
    d = new Date(year, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    if (!isNaN(d.getTime())) return d;
  }

  d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function ddStepHours(hours, step, mode) {
  var inv;
  var x;

  if (hours == null) return null;
  if (step == null || step <= 0) return hours;

  inv = 1 / step;
  x = hours * inv + 1e-9;

  if (mode === "ceil") return Math.ceil(x) / inv;
  if (mode === "floor") return Math.floor(x) / inv;

  return Math.round(x) / inv;
}

function ddFormatHour(hours) {
  var h;
  var i;
  var s;

  if (hours == null) return "";

  h = Math.round(hours * 1000000) / 1000000;
  i = Math.round(h);

  if (Math.abs(h - i) < 0.000001) return String(i);

  s = String(h).replace(".", ",");
  s = s.replace(/0+$/, "");
  s = s.replace(/,$/, "");

  return s;
}

function ddRowFromDate(dateVal, cfg) {
  var d = ddToDate(dateVal);
  var hours;
  var stepped;

  if (!d) return "";

  hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  stepped = ddStepHours(hours, cfg.rowStepHours != null ? cfg.rowStepHours : 0.5, cfg.roundMode || "round");

  return ddFormatHour(stepped);
}

function ddTextValue(val) {
  var out = [];
  var len;
  var i;
  var item;

  if (val == null) return "";
  if (typeof val === "string") return ddTrim(val);
  if (typeof val === "number") return String(val);

  len = ddListLength(val);
  if (len != null) {
    for (i = 0; i < len; i++) {
      item = ddListItem(val, i);
      item = ddTrim(item);
      if (item) out.push(item);
    }
    return out.join(", ");
  }

  return ddTrim(val);
}

function ddBuildInputLine(inputEntry, cfg) {
  var row = ddRowFromDate(ddSafeField(inputEntry, cfg.inputDateField), cfg);
  var note = ddTextValue(ddSafeField(inputEntry, cfg.inputNoteField));
  var tag = ddTextValue(ddSafeField(inputEntry, cfg.inputTagField));
  var parts = [];
  var text;

  if (note) parts.push(note);
  if (tag) parts.push(tag);

  text = parts.join(", ");
  if (!text) return "";

  return (row ? row : "?") + ": " + text;
}

function ddSortInputsByDate(entries, dateField) {
  return entries.slice(0).sort(function(a, b) {
    var da = ddToDate(ddSafeField(a, dateField));
    var db = ddToDate(ddSafeField(b, dateField));
    var ta = da ? da.getTime() : 0;
    var tb = db ? db.getTime() : 0;

    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  });
}

function buildDustingDayOutNote(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || entry();
  var inLinksField = cfg.inLinksField || "InLinks";
  var inputDateField = cfg.inputDateField || "Date";
  var links = ddRelationToArray(ddSafeField(currentEntry, inLinksField));
  var sorted = ddSortInputsByDate(links, inputDateField);
  var lines = [];
  var i;
  var line;

  cfg.inputDateField = inputDateField;
  cfg.inputNoteField = cfg.inputNoteField || "InNote";
  cfg.inputTagField = cfg.inputTagField || "InTag";

  for (i = 0; i < sorted.length; i++) {
    line = ddBuildInputLine(sorted[i], cfg);
    if (line) lines.push(line);
  }

  return {
    entries: sorted,
    lines: lines,
    text: lines.join("\n")
  };
}

function updateDustingDayOutNote(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || entry();
  var outputField = cfg.outputField || "OutNote";
  var result = buildDustingDayOutNote(cfg);

  result.updated = ddSafeSet(currentEntry, outputField, result.text);
  result.outputField = outputField;

  return result;
}
