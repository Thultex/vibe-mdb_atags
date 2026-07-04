/*
========================================
B11 Dusting Day Linker v0.13 (sys 2.30)
========================================

Änderungen
- Day-seitige Refresh-Doppellogik entfernt
- optionaler recalc-Aufruf für Source und Target ergänzt
- verhindert Zieleintrag-Erstellung bei wahrscheinlich falschem targetDateField
- prüft Ziel-Zuordnungsfelder gegen vorhandene Tages-Einträge
- Tags werden bei jedem Lauf gegen bestehende Tags abgeglichen und fehlende ergänzt
- erster Linker nach DustingInput.DayLinks -> DustingDay
- sucht oder erstellt Tages-Eintrag über Kalendertag
- verarbeitet map-Einträge mit Typisierung
- hängt Textwerte als eindeutige Rows an
- übernimmt nur die erste Zeile aus Textwerten
- ergänzt Tags nur, wenn sie im Zielfeld fehlen
- unterstützt rowMode "clock" und "sinceFirst"

Usage

appendToDayEntry({
  targetLib: "DustingDay",
  sourceDateField: "Date",
  targetDateField: "Date",
  sourceDayLinkField: "DayLinks",
  rowMode: "clock",
  rowStepHours: 0.5,
  map: [
    { from: "InNote", to: "OutNote", type: "string" },
    { from: "InTag", to: "OutTags", type: "tag" }
  ]
});
*/

function ddlTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function ddlIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function ddlListLength(val) {
  var n;

  if (val == null || typeof val === "string") return null;
  if (ddlIsArray(val)) return val.length;

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

function ddlListItem(val, index) {
  try {
    if (typeof val.get === "function") return val.get(index);
  } catch (e0) {}

  try {
    if (typeof val.item === "function") return val.item(index);
  } catch (e1) {}

  return val[index];
}

function ddlToArray(val) {
  var out = [];
  var list = val;
  var len;
  var i;

  if (val == null || val === "") return out;

  try {
    if (val && typeof val.entries === "function") list = val.entries();
  } catch (e0) {}

  len = ddlListLength(list);
  if (len != null) {
    for (i = 0; i < len; i++) out.push(ddlListItem(list, i));
    return out;
  }

  out.push(list);
  return out;
}

function ddlSafeField(entryObj, fieldName, errors, label) {
  if (!entryObj || !fieldName) return null;

  try {
    return entryObj.field(fieldName);
  } catch (e) {
    if (errors) errors.push((label || "Feld fehlt") + ": " + fieldName);
    return null;
  }
}

function ddlSafeSet(entryObj, fieldName, value, errors, label) {
  if (!entryObj || !fieldName) return false;

  try {
    entryObj.set(fieldName, value);
    return true;
  } catch (e) {
    if (errors) errors.push((label || "Feld konnte nicht gesetzt werden") + ": " + fieldName);
    return false;
  }
}

function ddlToDate(val) {
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

  s = ddlTrim(val);

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

function ddlSameCalendarDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function ddlStepHours(hours, step, mode) {
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

function ddlFormatHour(hours) {
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

function ddlRowLabel(sourceDate, targetDate, cfg) {
  var mode = cfg.rowMode || "clock";
  var step = cfg.rowStepHours != null ? cfg.rowStepHours : 0.5;
  var hours;

  if (mode === "sinceFirst" || mode === "relative") {
    if (!targetDate) return "";
    hours = (sourceDate.getTime() - targetDate.getTime()) / 3600000;
  } else {
    hours = sourceDate.getHours() + sourceDate.getMinutes() / 60 + sourceDate.getSeconds() / 3600;
  }

  return ddlFormatHour(ddlStepHours(hours, step, cfg.roundMode || "round"));
}

function ddlFirstLine(val) {
  var s = ddlTrim(val);
  var lines;

  if (!s) return "";

  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  lines = s.split("\n");

  return ddlTrim(lines[0]);
}

function ddlValueToText(value, type) {
  if (value == null) return "";

  if (type === "int") return String(parseInt(value, 10));
  if (type === "real") return String(Number(value)).replace(".", ",");
  if (typeof value === "number") return String(value).replace(".", ",");

  return ddlFirstLine(value);
}

function ddlSplitLines(text) {
  if (!text) return [];
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function ddlLineExists(text, line) {
  var lines = ddlSplitLines(text);
  var wanted = ddlTrim(line);
  var i;

  for (i = 0; i < lines.length; i++) {
    if (ddlTrim(lines[i]) === wanted) return true;
  }

  return false;
}

function ddlAppendUniqueLine(target, targetField, line, errors) {
  var oldText = ddlSafeField(target, targetField, errors, "Zielfeld fehlt");

  if (line == null || ddlTrim(line) === "") return false;
  if (oldText == null) oldText = "";
  oldText = String(oldText);

  if (ddlLineExists(oldText, line)) return false;

  if (ddlTrim(oldText) !== "") oldText += "\n";
  ddlSafeSet(target, targetField, oldText + line, errors, "Zielfeld konnte nicht geschrieben werden");
  return true;
}

function ddlTagText(tag) {
  if (tag == null) return "";
  return ddlTrim(tag);
}

function ddlTagExists(tags, tag) {
  var wanted = ddlTagText(tag);
  var i;

  if (!wanted) return true;

  for (i = 0; i < tags.length; i++) {
    if (ddlTagText(tags[i]) === wanted) return true;
  }

  return false;
}

function ddlAppendUniqueTags(target, targetField, value, errors) {
  var current = ddlToArray(ddlSafeField(target, targetField, null, null));
  var incoming = ddlToArray(value);
  var changed = false;
  var i;
  var tag;

  for (i = 0; i < incoming.length; i++) {
    tag = incoming[i];
    if (!ddlTagExists(current, tag)) {
      current.push(tag);
      changed = true;
    }
  }

  if (changed) ddlSafeSet(target, targetField, current, errors, "Tag-Zielfeld konnte nicht geschrieben werden");
  return changed;
}

function ddlNormalizeMapItem(item) {
  if (typeof item === "string") {
    return {
      from: item,
      to: item,
      type: null
    };
  }

  return {
    from: item.from,
    to: item.to || item.from,
    type: item.type || null
  };
}

function ddlInferType(value) {
  if (ddlListLength(value) != null && typeof value !== "string") return "tag";
  if (typeof value === "number") return Math.floor(value) === value ? "int" : "real";
  return "string";
}

function ddlFindDayEntry(targetLib, sourceDate, targetDateField, cfg) {
  var entries = ddlToArray(targetLib.entries ? targetLib.entries() : []);
  var i;
  var d;

  for (i = 0; i < entries.length; i++) {
    d = ddlToDate(ddlSafeField(entries[i], targetDateField, null, null));
    if (ddlSameCalendarDay(d, sourceDate)) return entries[i];
  }

  return null;
}

function ddlTargetEntries(targetLib) {
  try {
    return ddlToArray(targetLib.entries ? targetLib.entries() : []);
  } catch (e) {
    return [];
  }
}

function ddlEntryHasField(entryObj, fieldName) {
  if (!entryObj || !fieldName) return false;

  try {
    entryObj.field(fieldName);
    return true;
  } catch (e) {
    return false;
  }
}

function ddlAnyEntryHasField(entries, fieldName) {
  var i;

  if (!entries || !entries.length) return true;

  for (i = 0; i < entries.length; i++) {
    if (ddlEntryHasField(entries[i], fieldName)) return true;
  }

  return false;
}

function ddlValidateTargetConfig(targetLib, targetDateField, map, cfg, errors) {
  var entries = ddlTargetEntries(targetLib);
  var i;
  var item;
  var ok = true;

  if (entries.length > 0 && !ddlAnyEntryHasField(entries, targetDateField)) {
    errors.push("Ziel-Datumsfeld fehlt in vorhandenen Tages-Einträgen: " + targetDateField);
    ok = false;
  }

  if (entries.length > 0 && map) {
    for (i = 0; i < map.length; i++) {
      item = ddlNormalizeMapItem(map[i]);
      if (item.to && !ddlAnyEntryHasField(entries, item.to)) {
        errors.push("Ziel-Mappingfeld fehlt in vorhandenen Tages-Einträgen: " + item.to);
        ok = false;
      }
    }
  }

  return ok;
}

function ddlCreateDayEntry(targetLib, sourceDate, targetDateField, cfg, errors) {
  var values = {};
  var target;

  values[targetDateField] = cfg.createDateAsDate === true ? sourceDate : sourceDate.getTime();

  if (cfg.targetTitleField && cfg.targetTitlePrefix) {
    values[cfg.targetTitleField] = cfg.targetTitlePrefix + " " + sourceDate.getFullYear() + "-" + (sourceDate.getMonth() + 1) + "-" + sourceDate.getDate();
  }

  try {
    target = targetLib.create(values);
    return target;
  } catch (e) {
    errors.push("Zieleintrag konnte nicht erstellt werden");
    return null;
  }
}

function ddlApplyMapFromSourceToDay(src, target, sourceDate, targetDate, cfg, result, errors) {
  var map = cfg.map || [];
  var row = ddlRowLabel(sourceDate, targetDate, cfg);
  var i;
  var item;
  var value;
  var type;
  var text;
  var line;

  for (i = 0; i < map.length; i++) {
    item = ddlNormalizeMapItem(map[i]);
    if (!item.from || !item.to) {
      errors.push("Map-Eintrag unvollständig");
      continue;
    }

    value = ddlSafeField(src, item.from, errors, "Quellfeld fehlt");
    if (value == null || value === "") continue;

    type = item.type || ddlInferType(value);

    if (type === "tag") {
      if (ddlAppendUniqueTags(target, item.to, value, errors)) result.tags.push(item.to);
      continue;
    }

    text = ddlValueToText(value, type);
    if (!text) continue;

    line = (row ? row : "?") + ": " + text;
    if (ddlAppendUniqueLine(target, item.to, line, errors)) result.appended.push(item.to);
  }
}

function ddlRecalcEntry(entryObj, errors, label) {
  if (!entryObj) return false;

  try {
    if (typeof entryObj.recalc === "function") {
      entryObj.recalc();
      return true;
    }
  } catch (e) {
    if (errors) errors.push((label || "recalc fehlgeschlagen"));
  }

  return false;
}

function ddlWriteErrors(errors, cfg) {
  var i;
  var debugEntry;
  var debugField;

  if (!errors || !errors.length) return;

  for (i = 0; i < errors.length; i++) {
    try {
      log(errors[i]);
    } catch (e0) {}
  }

  debugEntry = cfg && cfg.debugEntry;
  debugField = cfg && cfg.debugField;

  if (debugEntry && debugField) {
    ddlSafeSet(debugEntry, debugField, errors.join("\n"), null, null);
  }
}

function appendToDayEntry(cfg) {
  cfg = cfg || {};

  var errors = [];
  var src = cfg.entryObj || entry();
  var sourceDateField = cfg.sourceDateField || "Date";
  var targetDateField = cfg.targetDateField || "Datum";
  var sourceDayLinkField = cfg.sourceDayLinkField || "DayLinks";
  var sourceDate = ddlToDate(ddlSafeField(src, sourceDateField, errors, "Quell-Datumsfeld fehlt"));
  var targetLib;
  var target;
  var targetDate;
  var result = {
    targetEntry: null,
    created: false,
    linked: false,
    appended: [],
    tags: [],
    recalculated: [],
    errors: errors
  };

  cfg.debugEntry = src;
  cfg.debugField = cfg.debugField || cfg.sourceDebugField;

  if (!sourceDate) {
    errors.push("Quell-Datum leer oder ungültig: " + sourceDateField);
    ddlWriteErrors(errors, cfg);
    return result;
  }

  if (!cfg.map || !ddlIsArray(cfg.map)) {
    errors.push("Config fehlt oder falsch: map");
    cfg.map = [];
  }

  try {
    targetLib = libByName(cfg.targetLib || "DustingDay");
  } catch (e0) {
    targetLib = null;
  }

  if (!targetLib) {
    errors.push("Bibliothek fehlt: " + (cfg.targetLib || "DustingDay"));
    ddlWriteErrors(errors, cfg);
    return result;
  }

  if (!ddlValidateTargetConfig(targetLib, targetDateField, cfg.map, cfg, errors)) {
    ddlWriteErrors(errors, cfg);
    return result;
  }

  target = ddlFindDayEntry(targetLib, sourceDate, targetDateField, cfg);

  if (!target) {
    target = ddlCreateDayEntry(targetLib, sourceDate, targetDateField, cfg, errors);
    result.created = !!target;
  }

  if (!target) {
    ddlWriteErrors(errors, cfg);
    return result;
  }

  result.targetEntry = target;
  targetDate = ddlToDate(ddlSafeField(target, targetDateField, null, null)) || sourceDate;

  if (sourceDayLinkField) {
    result.linked = ddlSafeSet(src, sourceDayLinkField, target, errors, "DayLink-Feld fehlt oder ungültig");
  }

  ddlApplyMapFromSourceToDay(src, target, sourceDate, targetDate, cfg, result, errors);

  if (cfg.recalcTarget === true && ddlRecalcEntry(target, errors, "Target recalc fehlgeschlagen")) {
    result.recalculated.push("target");
  }

  if (cfg.recalcSource === true && ddlRecalcEntry(src, errors, "Source recalc fehlgeschlagen")) {
    result.recalculated.push("source");
  }

  ddlWriteErrors(errors, cfg);
  return result;
}
