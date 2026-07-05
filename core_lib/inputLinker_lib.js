/*
========================================
#4 Input Linker Lib v0.81 (sys 2.40)
========================================

Änderungen
- nach dem Linken wird versucht, versehentlich in den Papierkorb verschobene Source-/Target-Einträge wiederherzustellen
- recieveInputEntryFromSource() und refreshTargetFromInputEntries() können Receive-/Process-Optionen auch aus receiveConfig übernehmen
- string_rows nutzt wieder einheitlich Zeitstempel; keine Sonderregel mehr für führende "|"-Zeilen
- DustingDay Record-Beispiele nutzen string/append statt string_rows, damit Record-Zeilen nicht mit Zeitstempel versehen werden
- string/text Maps können mit mode "prepend" nach vorne schreiben
- openTargetEntry führt vor dem Öffnen optional nochmal den Receive-Refresh aus
- sourceDayIdField speichert/liest eine stabile Ziel-ID, damit Updates ohne Relation-Rewrite verarbeitet werden können
- Input-Dedupe nutzt nur noch Objekt-/ID-Identität, damit zeitgleiche Einträge mit gleichem Titel nicht verschwinden
- Rebuild/processAllEntries verwirft passende Inputs nicht mehr, wenn der Relation-Wrapper-Vergleich fehlschlägt
- Receive-Flags akzeptieren true/"true"/1 und Debug zeigt die angekommenen Flags
- `debugReceive: true` schreibt einen Trace fuer Link-/Update-/Receive-Pfade ins Input-Debugfeld und ins Log
- Map-Lesung bevorzugt beim aktuellen Input-Entry den Triggerwert `field(...)`, damit Updates nicht am alten Entry-Snapshot haengen
- explizit übergebene `entries` werden beim Receive nicht mehr durch Link-Wrapper-Vergleich ausgeskippt
- leere/null Relation-Listen zählen nicht mehr als vorhandener DayLink
- `receiveExistingLink` löst den vorhandenen Relation-Wert bewusst gegen die Ziel-Library auf, bevor geschrieben wird
- linkInputEntryToTarget() kann mit `receiveExistingLink: true` bestehende Links bewusst für Updates verarbeiten
- linkInputEntryToTarget() kann nach frisch gesetztem Script-Link optional `receiveAfterLink: true` ausführen
- recieveInputEntryFromSource()/receiveInputEntryFromSource() werden explizit global exportiert
- vorhandene DayLinks werden im Input-Linker nicht mehr als Entry-Objekt aufgelöst; schon ein Relation-Wert führt zum No-op
- linkInputEntryToTarget() ist strikt Link-only: vorhandener DayLink = sofort raus; sonst Day suchen/erstellen und genau einmal verlinken
- bestehende gültige DayLinks verlassen den Input-Linker ohne Debug-Clear, damit "nichts tun" wirklich keine Feldänderung auslöst
- gelöschte vorhandene DayLinks blockieren die Neuzuordnung nicht mehr; Link-only darf einen neuen Ziel-Day suchen oder erstellen
- recieveInputEntryFromSource() verarbeitet Day-seitig genau einen verlinkten Input gegen den aktuellen Day
- refreshCurrentTargetFromInputEntries() bleibt als Day-seitiger Wrapper mit aktuellem entry()
- refreshTargetFromInputEntries() kann Day-seitig `postEntry: true` auf dem Ziel-Day ausführen
- erweitert debugInputLinkerAccess() um entry()/values()/field()-Kontext, DayLink-ID und findById-Auflösung
- verarbeitet vorhandene DayLinks im Input-Trigger nicht mehr automatisch; Updates bestehender Inputs laufen über Day-seitigen Refresh
- löst vorhandene DayLinks bevorzugt per targetLib.findById(linked.id) auf und behandelt entry.deleted als primären Papierkorb-Indikator

Usage

linkInputEntryToTarget({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  sourceDayIdField: "DayId",
  openTargetEntry: true,
  refreshBeforeOpen: true,
  dayStartHour: 4,
  daySearchLimit: 10,
  receiveAfterLink: true,
  receiveConfig: {
    processMode: "append",
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});

// DustingDay: Linking an entry
recieveInputEntryFromSource({
  inputLib: "DustingInput",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  receiveConfig: {
    processMode: "append",
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});

// DustingDay: manuelle Reparatur/Auffrischung für den aktuellen Day
refreshTargetFromInputEntries({
  inputLib: "DustingInput",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  findMatchingEntries: true,
  linkNewEntries: true,
  processAllEntries: true,
  receiveConfig: {
    processMode: "rebuild",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});

debugInputLinkerAccess({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDebugField: "Debug"
});
*/

var DDL_FILE = "inputLinker_lib.js";
var DDL_NAME = "Input Linker";
var DDL_VERSION = "0.81";

function getInputLinkerLibVersion() {
  return {
    name: "inputLinker_lib",
    displayName: DDL_NAME,
    version: DDL_VERSION,
    sysVersion: "2.40",
    path: "core_lib/inputLinker_lib.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("inputLinker_lib", DDL_VERSION, "2.40", "core_lib/inputLinker_lib.js", true);
}

function ddlTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function ddlTruthy(value) {
  if (value === true) return true;
  if (value === 1) return true;
  if (typeof value === "string" && ddlTrim(value).toLowerCase() === "true") return true;
  return false;
}

function ddlShouldReceiveAfterLink(cfg) {
  return cfg && (
    ddlTruthy(cfg.receiveAfterLink) ||
    ddlTruthy(cfg.processAfterLink)
  );
}

function ddlShouldReceiveExistingLink(cfg) {
  return cfg && (
    ddlTruthy(cfg.receiveExistingLink) ||
    ddlTruthy(cfg.updateExistingLink) ||
    ddlTruthy(cfg.receiveOnExistingLink) ||
    ddlTruthy(cfg.receiveOnExisting) ||
    ddlTruthy(cfg.processExistingLink)
  );
}

function ddlIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function ddlIsString(val) {
  return typeof val === "string" || Object.prototype.toString.call(val) === "[object String]";
}

function ddlListLength(val) {
  var n;

  if (val == null || ddlIsString(val)) return null;
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
  var next;

  if (val == null || val === "") return out;

  len = ddlListLength(list);
  if (len != null) {
    for (i = 0; i < len; i++) out.push(ddlListItem(list, i));
    return out;
  }

  try {
    if (typeof list.toArray === "function") {
      list = list.toArray();
      len = ddlListLength(list);
      if (len != null) {
        for (i = 0; i < len; i++) out.push(ddlListItem(list, i));
        return out;
      }
    }
  } catch (e0) {}

  try {
    if (list && typeof list.iterator === "function") list = list.iterator();
  } catch (e1) {}

  try {
    if (list && typeof list.hasNext === "function" && typeof list.next === "function") {
      while (list.hasNext()) out.push(list.next());
      return out;
    }
  } catch (e2) {}

  try {
    if (list && typeof list.next === "function") {
      while (true) {
        next = list.next();
        if (!next || next.done === true) break;
        out.push(next.value);
      }
      return out;
    }
  } catch (e3) {}

  try {
    if (list && typeof list.entries === "function") {
      list = list.entries();

      if (list && typeof list.iterator === "function") list = list.iterator();

      if (list && typeof list.hasNext === "function" && typeof list.next === "function") {
        while (list.hasNext()) out.push(list.next());
        return out;
      }

      if (list && typeof list.next === "function") {
        while (true) {
          next = list.next();
          if (!next || next.done === true) break;
          out.push(next.value);
        }
        return out;
      }
    }
  } catch (e4) {}

  try {
    if (typeof list.toString === "function" && String(list).indexOf(",") >= 0 && String(list).indexOf("@") < 0) {
      var parts = String(list).split(",");
      for (i = 0; i < parts.length; i++) out.push(ddlTrim(parts[i]));
      return out;
    }
  } catch (e5) {}

  out.push(list);
  return out;
}

function ddlFirstRelationValue(values) {
  var links = ddlToArray(values);
  var i;

  for (i = 0; i < links.length; i++) {
    if (links[i] == null) continue;
    if (links[i] === "") continue;
    return links[i];
  }

  return null;
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

function ddlIsCurrentEntry(entryObj) {
  try {
    return typeof entry === "function" && entry() === entryObj;
  } catch (e) {
    return false;
  }
}

function ddlSafeSourceField(entryObj, fieldName, errors, label, cfg) {
  var value;

  if (cfg && cfg.preferTriggerFields !== false && ddlIsCurrentEntry(entryObj)) {
    try {
      if (typeof field === "function") {
        value = field(fieldName);
        if (value != null) return value;
      }
    } catch (e0) {}
  }

  return ddlSafeField(entryObj, fieldName, errors, label);
}

function ddlSafeValuesField(entryObj, fieldName) {
  var values;

  if (!entryObj || !fieldName) return null;

  try {
    if (typeof entryObj.values !== "function") return null;
    values = entryObj.values();
    if (!values) return null;
    return values[fieldName];
  } catch (e) {
    return null;
  }
}

function ddlSafeTriggerFieldValue() {
  try {
    if (typeof field === "function") return field();
  } catch (e) {}
  return null;
}

function ddlSafeSet(entryObj, fieldName, value, errors, label, strictWriteErrors) {
  if (!entryObj || !fieldName) return false;

  try {
    entryObj.set(fieldName, value);
    return true;
  } catch (e) {
    if (errors && strictWriteErrors === true) errors.push((label || "Feld konnte nicht gesetzt werden") + ": " + fieldName);
    return false;
  }
}

function ddlEntryLinkName(entryObj) {
  var name;

  if (!entryObj) return "";

  try {
    name = entryObj.name;
    if (name) return String(name);
  } catch (e0) {}

  try {
    name = entryObj.title;
    if (name) return String(name);
  } catch (e1) {}

  try {
    if (typeof entryObj.field === "function") {
      name = entryObj.field("Name");
      if (name) return String(name);
    }
  } catch (e2) {}

  try {
    if (typeof entryObj.field === "function") {
      name = entryObj.field("Titel");
      if (name) return String(name);
    }
  } catch (e3) {}

  return "";
}

function ddlEntryPrimaryDate(entryObj, fieldName) {
  var candidates = [];
  var i;
  var d;

  if (!entryObj) return null;

  if (fieldName) candidates.push(fieldName);
  candidates.push("Datum");
  candidates.push("Date");
  candidates.push("Einnahmedatum");

  for (i = 0; i < candidates.length; i++) {
    try {
      if (typeof entryObj.field === "function") {
        d = ddlToDate(entryObj.field(candidates[i]));
        if (d) return d;
      }
    } catch (e) {}
  }

  return null;
}

function ddlLinkEntry(src, sourceDayLinkField, target, errors, cfg) {
  var linkName;

  if (!src || !sourceDayLinkField || !target) return false;
  if (ddlEntryLinksToDay(src, sourceDayLinkField, target, cfg && cfg.targetDateField)) return true;

  try {
    if (typeof src.link === "function") {
      src.link(sourceDayLinkField, target);
      return true;
    }
  } catch (e0) {
    if (errors) errors.push("DayLink konnte nicht per link() gesetzt werden: " + sourceDayLinkField);
    return false;
  }

  if (cfg && cfg.allowRelationSetFallback === true) {
    linkName = ddlEntryLinkName(target);
    if (linkName) return ddlSafeSet(src, sourceDayLinkField, [linkName], errors, "DayLink-Feld konnte nicht per set() geschrieben werden", cfg.strictWriteErrors === true);
  }

  if (errors) errors.push("DayLink-Feld kann nicht sicher geschrieben werden, entry.link() fehlt: " + sourceDayLinkField);
  return false;
}

function ddlUnlinkEntry(src, sourceDayLinkField, linkedEntry, errors) {
  if (!src || !sourceDayLinkField || !linkedEntry) return false;

  try {
    if (typeof src.unlink === "function") {
      src.unlink(sourceDayLinkField, linkedEntry);
      return true;
    }
  } catch (e0) {
    if (errors) errors.push("DayLink konnte nicht per unlink() entfernt werden: " + sourceDayLinkField);
    return false;
  }

  if (errors) errors.push("Staler DayLink kann nicht sicher entfernt werden, entry.unlink() fehlt: " + sourceDayLinkField);
  return false;
}

function ddlCleanupStaleDayLinks(src, sourceDayLinkField, target, targetDateField, cfg, result, errors) {
  var links;
  var i;
  var removed = 0;

  if (!src || !sourceDayLinkField || !target) return 0;
  if (!cfg || cfg.cleanupStaleDayLinks !== true) return 0;

  links = ddlToArray(ddlSafeField(src, sourceDayLinkField, null, null));
  for (i = 0; i < links.length; i++) {
    if (!links[i]) continue;
    if (ddlSameEntry(links[i], target, targetDateField)) continue;
    if (ddlUnlinkEntry(src, sourceDayLinkField, links[i], errors)) removed++;
  }

  if (result) result.unlinked = (result.unlinked || 0) + removed;
  return removed;
}

function ddlIsLinkingTriggerContext() {
  var master;

  try {
    if (typeof masterEntry === "function" && typeof masterLib === "function") {
      master = masterEntry();
      if (master) return true;
    }
  } catch (e0) {}

  try {
    if (typeof attr === "function" && typeof setAttr === "function") {
      attr("");
      return true;
    }
  } catch (e1) {}

  return false;
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

function ddlDayStartHour(cfg) {
  var h = cfg && cfg.dayStartHour != null ? Number(cfg.dayStartHour) : 4;
  if (isNaN(h) || h < 0 || h >= 24) return 4;
  return h;
}

function ddlDaySearchLimit(cfg) {
  var n = cfg && cfg.daySearchLimit != null ? Number(cfg.daySearchLimit) : 10;
  if (isNaN(n)) return 10;
  if (n < 0) return 0;
  return Math.floor(n);
}

function ddlStartOfCalendarDay(dateObj) {
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
}

function ddlPreviousCalendarDay(dateObj) {
  var d = ddlStartOfCalendarDay(dateObj);
  d.setDate(d.getDate() - 1);
  return d;
}

function ddlIsBeforeDayStartLimit(dateObj, cfg) {
  var boundary = ddlStartOfCalendarDay(dateObj);
  boundary.setHours(ddlDayStartHour(cfg), 0, 0, 0);
  return dateObj.getTime() < boundary.getTime();
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
  var mode = cfg.rowSourceMode || cfg.rowMode || "realtime";
  var step = cfg.rowStepHours != null ? cfg.rowStepHours : 0.5;
  var hours;

  if (mode === "sinceFirst" || mode === "relative") {
    if (!targetDate) return "";
    hours = (sourceDate.getTime() - targetDate.getTime()) / 3600000;
  } else {
    hours = sourceDate.getHours() + sourceDate.getMinutes() / 60 + sourceDate.getSeconds() / 3600;
  }

  return ddlFormatHour(ddlStepHours(hours, step, cfg.rowRoundMode || cfg.roundMode || "round"));
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

function ddlIsRowLine(line) {
  return /^\s*\d+(?:[.,]\d+)?\s*:/.test(String(line || ""));
}

function ddlRemoveRowLines(text) {
  var lines = ddlSplitLines(text);
  var out = [];
  var i;

  for (i = 0; i < lines.length; i++) {
    if (!ddlIsRowLine(lines[i])) out.push(lines[i]);
  }

  while (out.length && ddlTrim(out[0]) === "") out.shift();
  while (out.length && ddlTrim(out[out.length - 1]) === "") out.pop();

  return out.join("\n");
}

function ddlExtractNonRowLines(text) {
  var lines = ddlSplitLines(text);
  var out = [];
  var i;

  for (i = 0; i < lines.length; i++) {
    if (!ddlIsRowLine(lines[i])) out.push(lines[i]);
  }

  while (out.length && ddlTrim(out[0]) === "") out.shift();
  while (out.length && ddlTrim(out[out.length - 1]) === "") out.pop();

  return out;
}

function ddlNormalizeTextBlock(linesOrText) {
  var lines = ddlIsArray(linesOrText) ? linesOrText : ddlSplitLines(linesOrText);
  var out = [];
  var i;

  for (i = 0; i < lines.length; i++) out.push(String(lines[i] || ""));

  while (out.length && ddlTrim(out[0]) === "") out.shift();
  while (out.length && ddlTrim(out[out.length - 1]) === "") out.pop();

  return out.join("\n");
}

function ddlStringRowsTargetFields(map) {
  var out = [];
  var seen = {};
  var i;
  var item;

  for (i = 0; i < map.length; i++) {
    item = ddlNormalizeMapItem(map[i]);
    if (!item.to || item.type !== "string_rows" || seen[item.to]) continue;
    seen[item.to] = true;
    out.push(item.to);
  }

  return out;
}

function ddlSnapshotStringRowsFreeText(target, map) {
  var fields = ddlStringRowsTargetFields(map || []);
  var snapshots = [];
  var i;
  var field;
  var text;
  var freeText;

  for (i = 0; i < fields.length; i++) {
    field = fields[i];
    text = ddlSafeField(target, field, null, null);
    freeText = ddlNormalizeTextBlock(ddlExtractNonRowLines(text));
    if (!freeText) continue;
    snapshots.push({
      field: field,
      freeText: freeText
    });
  }

  return snapshots;
}

function ddlRestoreStringRowsFreeText(target, snapshots, cfg, errors) {
  var i;
  var field;
  var current;
  var currentFree;
  var restored;
  var changed = false;

  if (!snapshots || !snapshots.length) return false;

  for (i = 0; i < snapshots.length; i++) {
    field = snapshots[i].field;
    current = ddlSafeField(target, field, null, null);
    current = current == null ? "" : String(current);
    currentFree = ddlNormalizeTextBlock(ddlExtractNonRowLines(current));

    if (!snapshots[i].freeText || currentFree) continue;

    restored = ddlTrim(current) ? current + "\n\n" + snapshots[i].freeText : snapshots[i].freeText;
    if (ddlSafeSet(target, field, restored, errors, "Zielfeld-Freitext konnte nicht wiederhergestellt werden", cfg && cfg.strictWriteErrors === true)) {
      changed = true;
    }
  }

  return changed;
}

function ddlAppendLine(target, targetField, line, errors, cfg, unique) {
  var oldText = ddlSafeField(target, targetField, null, null);
  var wrote;

  if (line == null || ddlTrim(line) === "") return false;
  if (oldText == null) oldText = "";
  oldText = String(oldText);

  if (unique !== false && ddlLineExists(oldText, line)) return false;

  if (ddlTrim(oldText) !== "") oldText += "\n";
  wrote = ddlSafeSet(target, targetField, oldText + line, errors, "Zielfeld konnte nicht geschrieben werden", cfg && cfg.strictWriteErrors === true);
  return wrote;
}

function ddlPrependLine(target, targetField, line, errors, cfg, unique) {
  var oldText = ddlSafeField(target, targetField, null, null);
  var newText;
  var wrote;

  if (line == null || ddlTrim(line) === "") return false;
  if (oldText == null) oldText = "";
  oldText = String(oldText);

  if (unique !== false && ddlLineExists(oldText, line)) return false;

  newText = line;
  if (ddlTrim(oldText) !== "") newText += "\n" + oldText;
  wrote = ddlSafeSet(target, targetField, newText, errors, "Zielfeld konnte nicht geschrieben werden", cfg && cfg.strictWriteErrors === true);
  return wrote;
}

function ddlAppendUniqueLine(target, targetField, line, errors, cfg) {
  return ddlAppendLine(target, targetField, line, errors, cfg, true);
}

function ddlTagText(tag) {
  var parts;
  var i;
  var text;

  if (tag == null) return "";

  if (ddlListLength(tag) != null && !ddlIsString(tag)) {
    parts = ddlToArray(tag);
    for (i = parts.length - 1; i >= 0; i--) {
      text = ddlTagText(parts[i]);
      if (text && !/^\d+$/.test(text)) return text;
    }
    return "";
  }

  text = ddlTrim(tag);
  if (text.indexOf("org.mozilla.javascript.NativeArray@") === 0) return "";
  if (text.indexOf("[object ") === 0) return "";
  return text;
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

function ddlAppendUniqueTags(target, targetField, value, errors, cfg) {
  var current = ddlToArray(ddlSafeField(target, targetField, null, null));
  var incoming = ddlToArray(value);
  var changed = false;
  var i;
  var tag;

  for (i = 0; i < incoming.length; i++) {
    tag = ddlTagText(incoming[i]);
    if (!ddlTagExists(current, tag)) {
      current.push(tag);
      changed = true;
    }
  }

  if (changed) return ddlSafeSet(target, targetField, current, errors, "Tag-Zielfeld konnte nicht geschrieben werden", cfg && cfg.strictWriteErrors === true);
  return false;
}

function ddlAppendTags(target, targetField, value, errors, cfg, unique) {
  var current = ddlToArray(ddlSafeField(target, targetField, null, null));
  var incoming = ddlToArray(value);
  var changed = false;
  var i;
  var tag;

  for (i = 0; i < incoming.length; i++) {
    tag = ddlTagText(incoming[i]);
    if (!tag) continue;
    if (unique !== false && ddlTagExists(current, tag)) continue;
    current.push(tag);
    changed = true;
  }

  if (changed) return ddlSafeSet(target, targetField, current, errors, "Tag-Zielfeld konnte nicht geschrieben werden", cfg && cfg.strictWriteErrors === true);
  return false;
}

function ddlNormalizeProcessMode(mode) {
  var s = ddlTrim(mode || "append").toLowerCase();

  if (s === "append new") return "append";
  if (s === "append_all" || s === "append-all" || s === "append all") return "append_all";
  if (s === "prepend") return "prepend";
  if (s === "prepend_all" || s === "prepend-all" || s === "prepend all") return "prepend_all";
  if (s === "rebuild") return "rebuild";

  return "append";
}

function ddlNormalizeMapItem(item) {
  if (typeof item === "string") {
    return {
      from: item,
      to: item,
      type: null,
      mode: null
    };
  }

  return {
    from: item.from,
    to: item.to || item.from,
    type: item.type || null,
    mode: item.mode || null
  };
}

function ddlClearValueForTarget(target, map, targetField, cfg) {
  var hasTag = false;
  var hasStringRows = false;
  var hasString = false;
  var i;
  var item;
  var type;

  for (i = 0; i < map.length; i++) {
    item = ddlNormalizeMapItem(map[i]);
    if (item.to !== targetField) continue;

    type = item.type || "string";
    if (type === "string_rows") hasStringRows = true;
    else if (type === "tag") hasTag = true;
    else hasString = true;
  }

  if (hasStringRows) return ddlRemoveRowLines(ddlSafeField(target, targetField, null, null));
  if (hasTag && !hasString) return [];
  return "";
}

function ddlInferType(value) {
  if (ddlListLength(value) != null && typeof value !== "string") return "tag";
  if (typeof value === "number") return Math.floor(value) === value ? "int" : "real";
  return "string";
}

function ddlFindDayEntry(targetLib, sourceDate, targetDateField, cfg) {
  var entries = ddlToArray(targetLib.entries ? targetLib.entries() : []);
  var limit = ddlDaySearchLimit(cfg);
  var max = limit > 0 && limit < entries.length ? limit : entries.length;
  var previousDay;
  var i;
  var d;

  for (i = 0; i < max; i++) {
    d = ddlToDate(ddlSafeField(entries[i], targetDateField, null, null));
    if (ddlSameCalendarDay(d, sourceDate)) return entries[i];
  }

  if (ddlIsBeforeDayStartLimit(sourceDate, cfg)) {
    previousDay = ddlPreviousCalendarDay(sourceDate);
    for (i = 0; i < max; i++) {
      d = ddlToDate(ddlSafeField(entries[i], targetDateField, null, null));
      if (ddlSameCalendarDay(d, previousDay)) return entries[i];
    }
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

  if (cfg.strictTargetValidation !== true) return true;

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

function ddlFirstLinkedDay(src, sourceDayLinkField) {
  var links;
  var i;

  if (!src || !sourceDayLinkField) return null;

  links = ddlToArray(ddlSafeField(src, sourceDayLinkField, null, null));
  for (i = 0; i < links.length; i++) {
    if (!ddlIsDeletedEntry(links[i])) return links[i];
  }

  return null;
}

function ddlHasDeletedLinkedDay(links) {
  var i;

  for (i = 0; i < links.length; i++) {
    if (ddlIsDeletedEntry(links[i])) return true;
  }

  return false;
}

function ddlEntryFlag(entryObj, names) {
  var i;
  var name;
  var value;

  if (!entryObj) return false;

  for (i = 0; i < names.length; i++) {
    name = names[i];

    try {
      if (typeof entryObj[name] === "function") {
        value = entryObj[name]();
        if (value === true || String(value).toLowerCase() === "true") return true;
      }
    } catch (e0) {}

    try {
      value = entryObj[name];
      if (value === true || String(value).toLowerCase() === "true") return true;
    } catch (e1) {}

    try {
      if (typeof entryObj.field === "function") {
        value = entryObj.field(name);
        if (value === true || String(value).toLowerCase() === "true") return true;
      }
    } catch (e2) {}
  }

  return false;
}

function ddlIsDeletedEntry(entryObj) {
  try {
    if (entryObj && entryObj.deleted === true) return true;
  } catch (e0) {}

  return ddlEntryFlag(entryObj, [
    "deleted",
    "isDeleted",
    "removed",
    "isRemoved",
    "trashed",
    "isTrashed",
    "trash",
    "inTrash",
    "isInTrash"
  ]);
}

function ddlTryRestoreEntry(entryObj, errors, label) {
  var methods = [
    "restore",
    "undelete",
    "untrash",
    "recover",
    "restoreFromTrash",
    "removeFromTrash"
  ];
  var i;
  var name;

  if (!entryObj || !ddlIsDeletedEntry(entryObj)) return true;

  for (i = 0; i < methods.length; i++) {
    name = methods[i];
    try {
      if (typeof entryObj[name] === "function") {
        entryObj[name]();
        return !ddlIsDeletedEntry(entryObj);
      }
    } catch (e0) {
      if (errors) errors.push((label || "Eintrag") + " konnte nicht per " + name + "() aus dem Papierkorb geholt werden");
      return false;
    }
  }

  if (errors) errors.push((label || "Eintrag") + " liegt im Papierkorb; keine Restore-Methode am Entry-Objekt gefunden");
  return false;
}

function ddlEnsureActiveAfterLink(src, target, result, errors) {
  var ok = true;

  if (src && ddlIsDeletedEntry(src)) {
    if (ddlTryRestoreEntry(src, errors, "Source-Entry")) {
      if (result && result.restored) result.restored.push("source");
    } else {
      ok = false;
    }
  }

  if (target && ddlIsDeletedEntry(target)) {
    if (ddlTryRestoreEntry(target, errors, "Target-Entry")) {
      if (result && result.restored) result.restored.push("target");
    } else {
      ok = false;
    }
  }

  return ok;
}

function ddlEntryId(entryObj) {
  if (!entryObj) return "";

  try {
    if (typeof entryObj.id === "function") return String(entryObj.id());
  } catch (e0) {}

  try {
    if (entryObj.id != null) return String(entryObj.id);
  } catch (e1) {}

  return "";
}

function ddlSameEntry(a, b, dateField) {
  var aid;
  var bid;
  var aname;
  var bname;

  if (!a || !b) return false;
  if (a === b) return true;

  aid = ddlEntryId(a);
  bid = ddlEntryId(b);

  if (aid !== "" && aid === bid) return true;

  aname = ddlEntryLinkName(a);
  bname = ddlEntryLinkName(b);
  if (aname && bname && aname === bname) return true;

  return false;
}

function ddlSameEntryIdentity(a, b) {
  var aid;
  var bid;

  if (!a || !b) return false;
  if (a === b) return true;

  aid = ddlEntryId(a);
  bid = ddlEntryId(b);

  if (aid !== "" && aid === bid) return true;

  return false;
}

function ddlEntryLinksToDay(src, sourceDayLinkField, target, targetDateField) {
  var links;
  var i;

  if (!src || !sourceDayLinkField || !target) return false;

  links = ddlToArray(ddlSafeField(src, sourceDayLinkField, null, null));
  for (i = 0; i < links.length; i++) {
    if (ddlSameEntry(links[i], target, targetDateField)) return true;
  }

  return false;
}

function ddlCanUseLinkedDay(target, sourceDate, targetDateField, cfg) {
  var targetDate;

  if (!target) return false;
  if (ddlIsDeletedEntry(target)) return false;

  try {
    if (!(typeof target.field === "function" && typeof target.set === "function")) return false;
  } catch (e0) {}

  if (cfg && cfg.trustExistingLink === true) return true;

  if (sourceDate && targetDateField) {
    targetDate = ddlToDate(ddlSafeField(target, targetDateField, null, null));
    if (!targetDate) return false;
    if (!ddlSameCalendarDay(targetDate, sourceDate)) {
      if (!ddlIsBeforeDayStartLimit(sourceDate, cfg)) return false;
      if (!ddlSameCalendarDay(targetDate, ddlPreviousCalendarDay(sourceDate))) return false;
    }
  }

  return true;
}

function ddlResolveLinkedTargetFromLibrary(targetLib, linkedTarget, targetDateField, sourceDate, cfg) {
  var entries;
  var id;
  var found;
  var i;

  if (!targetLib || !linkedTarget) return null;

  id = ddlEntryId(linkedTarget);
  if (id) {
    try {
      if (typeof targetLib.findById === "function") {
        found = targetLib.findById(id);
        if (ddlCanUseLinkedDay(found, sourceDate, targetDateField, cfg)) return found;
        return null;
      }
    } catch (e0) {
      return null;
    }
  }

  try {
    entries = ddlToArray(targetLib.entries ? targetLib.entries() : []);
  } catch (e1) {
    entries = [];
  }

  for (i = 0; i < entries.length; i++) {
    if (!ddlCanUseLinkedDay(entries[i], sourceDate, targetDateField, cfg)) continue;
    if (ddlSameEntry(entries[i], linkedTarget, targetDateField)) return entries[i];
  }

  return null;
}

function ddlResolveTargetBySourceId(targetLib, src, sourceDayIdField, targetDateField, sourceDate, cfg) {
  var id;
  var found;

  if (!targetLib || !src || !sourceDayIdField) return null;

  id = ddlSafeField(src, sourceDayIdField, null, null);
  if (id == null || String(id) === "") return null;
  id = String(id);

  try {
    if (typeof targetLib.findById === "function") {
      found = targetLib.findById(id);
      if (ddlCanUseLinkedDay(found, sourceDate, targetDateField, cfg)) return found;
    }
  } catch (e0) {}

  return null;
}

function ddlWriteSourceDayId(src, sourceDayIdField, target, errors, cfg) {
  var id;
  var current;

  if (!src || !sourceDayIdField || !target) return false;

  id = ddlEntryId(target);
  if (!id) return false;

  current = ddlSafeField(src, sourceDayIdField, null, null);
  if (String(current || "") === String(id)) return true;

  return ddlSafeSet(src, sourceDayIdField, String(id), errors, "DayId-Feld konnte nicht geschrieben werden", cfg && cfg.strictWriteErrors === true);
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

function ddlSourceMatchesTargetDay(src, sourceDateField, targetDate, cfg) {
  var sourceDate;
  var previousDay;

  if (!src || !targetDate) return false;

  sourceDate = ddlToDate(ddlSafeField(src, sourceDateField, null, null));
  if (!sourceDate) return false;

  if (ddlSameCalendarDay(sourceDate, targetDate)) return true;

  if (cfg.includeEarlyNextDay === true && ddlIsBeforeDayStartLimit(sourceDate, cfg)) {
    previousDay = ddlPreviousCalendarDay(sourceDate);
    return ddlSameCalendarDay(previousDay, targetDate);
  }

  return false;
}

function ddlReadEntriesFromLib(libName, errors) {
  var sourceLib;

  try {
    sourceLib = libByName(libName);
  } catch (e0) {
    sourceLib = null;
  }

  if (!sourceLib) {
    if (errors) errors.push("Input-Bibliothek fehlt: " + libName);
    return [];
  }

  try {
    return ddlToArray(sourceLib.entries ? sourceLib.entries() : []);
  } catch (e1) {
    if (errors) errors.push("Input-Einträge konnten nicht gelesen werden: " + libName);
    return [];
  }
}

function ddlInputLinkedToOtherDay(src, sourceDayLinkField, target) {
  var links;
  var i;

  if (!src || !sourceDayLinkField) return false;

  links = ddlToArray(ddlSafeField(src, sourceDayLinkField, null, null));
  for (i = 0; i < links.length; i++) {
    if (ddlIsDeletedEntry(links[i])) continue;
    if (links[i] && !ddlSameEntry(links[i], target)) return true;
  }

  return false;
}

function ddlInputDayIdLinksToTarget(src, sourceDayIdField, target) {
  var sourceId;
  var targetId;

  if (!src || !sourceDayIdField || !target) return false;

  targetId = ddlEntryId(target);
  if (!targetId) return false;

  sourceId = ddlSafeField(src, sourceDayIdField, null, null);
  if (sourceId == null || String(sourceId) === "") return false;

  return String(sourceId) === String(targetId);
}

function ddlInputDayIdLinksToOther(src, sourceDayIdField, target) {
  var sourceId;
  var targetId;

  if (!src || !sourceDayIdField || !target) return false;

  sourceId = ddlSafeField(src, sourceDayIdField, null, null);
  if (sourceId == null || String(sourceId) === "") return false;

  targetId = ddlEntryId(target);
  if (!targetId) return false;

  return String(sourceId) !== String(targetId);
}

function ddlPushUniqueEntry(out, entryObj) {
  var i;

  if (!entryObj) return;

  for (i = 0; i < out.length; i++) {
    if (ddlSameEntryIdentity(out[i], entryObj)) return;
  }

  out.push(entryObj);
}

function ddlSortInputsByDate(inputs, sourceDateField) {
  inputs.sort(function(a, b) {
    var ad = ddlToDate(ddlSafeField(a, sourceDateField, null, null));
    var bd = ddlToDate(ddlSafeField(b, sourceDateField, null, null));
    var at = ad ? ad.getTime() : 0;
    var bt = bd ? bd.getTime() : 0;

    if (at < bt) return -1;
    if (at > bt) return 1;
    return 0;
  });

  return inputs;
}

function ddlClearMappedTargets(target, map, cfg, result, errors, forceAll) {
  var cleared = {};
  var i;
  var item;
  var value;
  var itemMode;

  for (i = 0; i < map.length; i++) {
    item = ddlNormalizeMapItem(map[i]);
    if (!item.to || cleared[item.to]) continue;

    itemMode = ddlNormalizeProcessMode(item.mode || cfg.processMode || cfg.mode);
    if (forceAll !== true && itemMode !== "rebuild") continue;

    value = ddlClearValueForTarget(target, map, item.to, cfg);

    ddlSafeSet(target, item.to, value, errors, "Zielfeld konnte nicht geleert werden", cfg && cfg.strictWriteErrors === true);
    cleared[item.to] = true;
    result.cleared.push(item.to);
  }
}

function ddlSelectInputsForDay(target, targetDate, cfg, result, errors) {
  var sourceDateField = cfg.sourceDateField || "Date";
  var sourceDayLinkField = cfg.sourceDayLinkField || "DayLinks";
  var sourceDayIdField = cfg.sourceDayIdField || cfg.sourceTargetIdField || cfg.dayIdField || "";
  var findMatchingEntries = cfg.findMatchingEntries === true;
  var linkNewEntries = cfg.linkNewEntries === true;
  var processAllEntries = cfg.processAllEntries === true;
  var skipLinkedToOther = cfg.skipLinkedToOther !== false;
  var explicitEntries = cfg.entries || null;
  var forceExplicitEntries = explicitEntries && cfg.forceExplicitEntries !== false;
  var entries = [];
  var selected = [];
  var i;
  var src;
  var linkedToTarget;
  var linkedToOther;
  var matchesDay;

  if (explicitEntries) {
    entries = ddlToArray(explicitEntries);
  }

  if (findMatchingEntries || processAllEntries || !explicitEntries) {
    var libEntries = ddlReadEntriesFromLib(cfg.inputLib || cfg.sourceLib || "DustingInput", errors);
    for (i = 0; i < libEntries.length; i++) ddlPushUniqueEntry(entries, libEntries[i]);
  }

  for (i = 0; i < entries.length; i++) {
    src = entries[i];

    if (forceExplicitEntries && !processAllEntries) {
      ddlPushUniqueEntry(selected, src);
      continue;
    }

    linkedToTarget = ddlInputDayIdLinksToTarget(src, sourceDayIdField, target) || ddlEntryLinksToDay(src, sourceDayLinkField, target, cfg.targetDateField || "Date");
    linkedToOther = !linkedToTarget && (ddlInputDayIdLinksToOther(src, sourceDayIdField, target) || ddlInputLinkedToOtherDay(src, sourceDayLinkField, target));

    if (linkedToTarget && (processAllEntries || explicitEntries)) {
      ddlPushUniqueEntry(selected, src);
      continue;
    }

    if (linkedToOther && skipLinkedToOther) {
      result.skippedLinkedToOther++;
      continue;
    }

    matchesDay = findMatchingEntries && ddlSourceMatchesTargetDay(src, sourceDateField, targetDate, cfg);
    if (!matchesDay && explicitEntries) matchesDay = true;

    if (matchesDay) {
      if (linkNewEntries && sourceDayLinkField && !linkedToTarget) {
        if (ddlLinkEntry(src, sourceDayLinkField, target, errors, cfg)) {
          result.linked++;
          linkedToTarget = true;
          ddlEnsureActiveAfterLink(src, target, result, errors);
        }
      }
      ddlWriteSourceDayId(src, sourceDayIdField, target, errors, cfg);

      if (!processAllEntries) {
        ddlPushUniqueEntry(selected, src);
      }
    }
  }

  if (processAllEntries) {
    for (i = 0; i < entries.length; i++) {
      if (
        ddlInputDayIdLinksToTarget(entries[i], sourceDayIdField, target) ||
        ddlEntryLinksToDay(entries[i], sourceDayLinkField, target, cfg.targetDateField || "Date")
      ) {
        ddlPushUniqueEntry(selected, entries[i]);
      }
    }
  }

  return ddlSortInputsByDate(selected, sourceDateField);
}

function ddlApplyMapFromSourceToDay(src, target, sourceDate, targetDate, cfg, result, errors) {
  var map = cfg.map || [];
  var row = ddlRowLabel(sourceDate, targetDate, cfg);
  var i;
  var item;
  var value;
  var type;
  var mode;
  var unique;
  var text;
  var line;

  for (i = 0; i < map.length; i++) {
    item = ddlNormalizeMapItem(map[i]);
    if (!item.from || !item.to) {
      errors.push("Map-Eintrag unvollständig");
      continue;
    }

    value = ddlSafeSourceField(src, item.from, errors, "Quellfeld fehlt", cfg);
    if (value == null || value === "") continue;

    type = item.type || ddlInferType(value);
    mode = ddlNormalizeProcessMode(item.mode || cfg.processMode || cfg.mode);
    unique = mode !== "append_all" && mode !== "prepend_all";

    if (type === "tag") {
      if (ddlAppendTags(target, item.to, value, errors, cfg, unique)) result.tags.push(item.to);
      continue;
    }

    text = ddlValueToText(value, type);
    if (!text) continue;

    line = type === "string_rows" ? (row ? row : "?") + ": " + text : text;
    if (mode === "prepend" || mode === "prepend_all") {
      if (ddlPrependLine(target, item.to, line, errors, cfg, unique)) result.appended.push(item.to);
    } else if (ddlAppendLine(target, item.to, line, errors, cfg, unique)) {
      result.appended.push(item.to);
    }
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

function ddlResolvePostEntryFunction(cfg) {
  var fn = cfg && (cfg.postEntryFn || cfg.postEntryFunction);
  var name = cfg && (cfg.postEntryName || cfg.postEntryFunctionName);

  if (typeof fn === "function") return fn;
  if (typeof fn === "string" && !name) name = fn;

  if (typeof name === "string") {
    if (name === "postEntry" && typeof postEntry === "function") return postEntry;
    if (name === "PostEntry" && typeof PostEntry === "function") return PostEntry;

    try {
      if (typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return globalThis[name];
    } catch (e0) {}

    try {
      if (typeof this !== "undefined" && typeof this[name] === "function") return this[name];
    } catch (e1) {}
  }

  if (typeof postEntry === "function") return postEntry;
  if (typeof PostEntry === "function") return PostEntry;

  return null;
}

function ddlPostEntryFunctionName(cfg) {
  var fn = cfg && (cfg.postEntryFn || cfg.postEntryFunction);
  var name = cfg && (cfg.postEntryName || cfg.postEntryFunctionName);

  if (typeof fn === "string") return fn;
  if (typeof name === "string") return name;
  if (typeof fn === "function" && fn.name) return fn.name;

  return "postEntry/PostEntry";
}

function ddlRunPostEntry(entryObj, cfg, result, errors, label) {
  var fn;

  if (!entryObj) return false;

  fn = ddlResolvePostEntryFunction(cfg);
  if (!fn) {
    if (errors) errors.push("PostEntry-Funktion fehlt");
    return false;
  }

  try {
    fn(entryObj);
    result.postEntries.push(label || "entry");
    return true;
  } catch (e) {
    if (errors) {
      errors.push(
        "PostEntry fehlgeschlagen: " +
        (label || "entry") +
        " via " +
        ddlPostEntryFunctionName(cfg) +
        " - " +
        (e && e.message ? e.message : String(e))
      );
    }
    return false;
  }
}

function ddlRunConfiguredPostEntry(src, target, cfg, result, errors) {
  var mode = cfg.postEntryTarget || cfg.postEntryMode || "target";
  var targetFreeTextSnapshot = ddlSnapshotStringRowsFreeText(target, cfg.map || []);

  if (cfg.postEntry !== true && cfg.runPostEntry !== true) return;

  if (mode === "source" || mode === "input") {
    ddlRunPostEntry(src, cfg, result, errors, "source");
    return;
  }

  if (mode === "both") {
    ddlRunPostEntry(target, cfg, result, errors, "target");
    ddlRestoreStringRowsFreeText(target, targetFreeTextSnapshot, cfg, errors);
    ddlRunPostEntry(src, cfg, result, errors, "source");
    return;
  }

  ddlRunPostEntry(target, cfg, result, errors, "target");
  ddlRestoreStringRowsFreeText(target, targetFreeTextSnapshot, cfg, errors);
}

function ddlOpenEntry(entryObj, cfg, result, label) {
  var fn = cfg && (cfg.openEntryFn || cfg.openTargetFn || cfg.openFunction);
  var methodNames = ["open", "show", "view", "edit", "openEntry", "showEntry", "viewEntry"];
  var i;
  var method;

  result.openResult = {
    attempted: true,
    ok: false,
    target: label || "entry",
    method: "",
    error: ""
  };

  if (!entryObj) {
    result.openResult.error = "entry missing";
    return false;
  }

  if (typeof fn === "function") {
    try {
      fn(entryObj);
      result.openResult.ok = true;
      result.openResult.method = "openFunction";
      return true;
    } catch (e0) {
      result.openResult.error = e0 && e0.message ? e0.message : String(e0);
      return false;
    }
  }

  for (i = 0; i < methodNames.length; i++) {
    method = methodNames[i];
    try {
      if (typeof entryObj[method] === "function") {
        entryObj[method]();
        result.openResult.ok = true;
        result.openResult.method = method;
        return true;
      }
    } catch (e1) {
      result.openResult.error = e1 && e1.message ? e1.message : String(e1);
      return false;
    }
  }

  try {
    if (typeof openEntry === "function") {
      openEntry(entryObj);
      result.openResult.ok = true;
      result.openResult.method = "openEntry";
      return true;
    }
  } catch (e2) {
    result.openResult.error = e2 && e2.message ? e2.message : String(e2);
    return false;
  }

  result.openResult.error = "no open method";
  return false;
}

function ddlOpenConfiguredTarget(target, cfg, result) {
  if (cfg.openTargetEntry === true || cfg.openTarget === true || cfg.openDayEntry === true) {
    ddlOpenEntry(target, cfg, result, "target");
  }
}

function ddlShouldOpenTarget(cfg) {
  return !!(cfg && (cfg.openTargetEntry === true || cfg.openTarget === true || cfg.openDayEntry === true));
}

function ddlShallowCopyConfig(src) {
  var out = {};
  var k;

  src = src || {};
  for (k in src) {
    if (src.hasOwnProperty(k)) out[k] = src[k];
  }

  return out;
}

function ddlApplyReceiveConfigDefaults(cfg) {
  var receiveCfg;
  var k;

  if (!cfg || !cfg.receiveConfig) return cfg;

  receiveCfg = cfg.receiveConfig;
  for (k in receiveCfg) {
    if (receiveCfg.hasOwnProperty(k) && typeof cfg[k] === "undefined") {
      cfg[k] = receiveCfg[k];
    }
  }

  return cfg;
}

function ddlReceiveAfterLink(src, target, cfg, result, errors) {
  var receiveCfg;
  var receiveResult;

  if (!src || !target || !cfg) return null;
  if (!ddlShouldReceiveAfterLink(cfg) && !ddlShouldReceiveExistingLink(cfg)) return null;

  receiveCfg = cfg.receiveConfig || {};
  receiveCfg.inputEntry = src;
  receiveCfg.targetEntry = target;
  receiveCfg.sourceDateField = receiveCfg.sourceDateField || cfg.sourceDateField;
  receiveCfg.targetDateField = receiveCfg.targetDateField || cfg.targetDateField;
  receiveCfg.sourceDayLinkField = receiveCfg.sourceDayLinkField || cfg.sourceDayLinkField;
  receiveCfg.sourceDayIdField = receiveCfg.sourceDayIdField || cfg.sourceDayIdField || cfg.sourceTargetIdField || cfg.dayIdField;
  receiveCfg.rowSourceMode = receiveCfg.rowSourceMode || cfg.rowSourceMode;
  receiveCfg.rowStepHours = receiveCfg.rowStepHours || cfg.rowStepHours;
  receiveCfg.rowRoundMode = receiveCfg.rowRoundMode || cfg.rowRoundMode;
  receiveCfg.processMode = receiveCfg.processMode || cfg.processMode || "append";
  receiveCfg.processMap = receiveCfg.processMap || cfg.processMap || cfg.map;
  receiveCfg.postEntry = receiveCfg.postEntry === true || cfg.postEntry === true;
  receiveCfg.postEntryName = receiveCfg.postEntryName || cfg.postEntryName || cfg.postEntryFunctionName;
  receiveCfg.postEntryFn = receiveCfg.postEntryFn || cfg.postEntryFn;
  receiveCfg.recalcTarget = receiveCfg.recalcTarget === true || cfg.recalcTarget === true;
  receiveCfg.targetDebugField = receiveCfg.targetDebugField || cfg.targetDebugField;

  receiveResult = recieveInputEntryFromSource(receiveCfg);
  if (result) result.receiveResult = receiveResult;
  if (receiveResult && receiveResult.errors && receiveResult.errors.length && errors) {
    errors.push("ReceiveAfterLink meldet Fehler: " + receiveResult.errors.join("; "));
  }
  return receiveResult;
}

function ddlRefreshBeforeOpen(src, target, cfg, result, errors) {
  var refreshCfg;
  var refreshResult;

  if (!src || !target || !cfg) return null;
  if (!ddlShouldOpenTarget(cfg)) return null;
  if (cfg.refreshBeforeOpen === false || cfg.receiveBeforeOpen === false) return null;

  refreshCfg = ddlShallowCopyConfig(cfg.receiveConfig || {});
  refreshCfg.inputEntry = src;
  refreshCfg.targetEntry = target;
  refreshCfg.sourceDateField = refreshCfg.sourceDateField || cfg.sourceDateField;
  refreshCfg.targetDateField = refreshCfg.targetDateField || cfg.targetDateField;
  refreshCfg.sourceDayLinkField = refreshCfg.sourceDayLinkField || cfg.sourceDayLinkField;
  refreshCfg.sourceDayIdField = refreshCfg.sourceDayIdField || cfg.sourceDayIdField || cfg.sourceTargetIdField || cfg.dayIdField;
  refreshCfg.rowSourceMode = refreshCfg.rowSourceMode || cfg.rowSourceMode;
  refreshCfg.rowStepHours = refreshCfg.rowStepHours || cfg.rowStepHours;
  refreshCfg.rowRoundMode = refreshCfg.rowRoundMode || cfg.rowRoundMode;
  refreshCfg.processMode = refreshCfg.processMode || cfg.processMode || "append";
  refreshCfg.processMap = refreshCfg.processMap || cfg.processMap || cfg.map;
  refreshCfg.postEntry = refreshCfg.postEntry === true || cfg.postEntry === true;
  refreshCfg.postEntryName = refreshCfg.postEntryName || cfg.postEntryName || cfg.postEntryFunctionName;
  refreshCfg.postEntryFn = refreshCfg.postEntryFn || cfg.postEntryFn;
  refreshCfg.recalcTarget = refreshCfg.recalcTarget === true || cfg.recalcTarget === true;
  refreshCfg.targetDebugField = refreshCfg.targetDebugField || cfg.targetDebugField;

  refreshResult = recieveInputEntryFromSource(refreshCfg);
  if (result) result.refreshBeforeOpenResult = refreshResult;
  if (refreshResult && refreshResult.errors && refreshResult.errors.length && errors) {
    errors.push("RefreshBeforeOpen meldet Fehler: " + refreshResult.errors.join("; "));
  }
  return refreshResult;
}

function ddlWriteErrors(errors, cfg) {
  var debugEntry;
  var debugField;
  var lines;

  if (!errors || !errors.length) return;

  lines = ddlDebugHeader("DEBUG Input Linker");
  lines = lines.concat(errors);
  ddlLogLines(lines);

  debugEntry = cfg && cfg.debugEntry;
  debugField = cfg && cfg.debugField;

  if (debugEntry && debugField) {
    ddlSafeSet(debugEntry, debugField, lines.join("\n"), null, null);
  }
}

function ddlClearDebugFieldIfExists(cfg) {
  var debugEntry = cfg && cfg.debugEntry;
  var debugField = cfg && cfg.debugField;

  if (!debugEntry || !debugField) return false;
  if (!ddlEntryHasField(debugEntry, debugField)) return false;

  return ddlSafeSet(debugEntry, debugField, "", null, null, false);
}

function ddlLogLine(line) {
  try {
    log(String(line));
  } catch (e) {}
}

function ddlLogLines(lines) {
  if (!lines) return;
  ddlLogLine(lines.join("\n"));
}

function ddlPad2(n) {
  n = Number(n);
  if (isNaN(n)) n = 0;
  return n < 10 ? "0" + n : String(n);
}

function ddlFormatDebugTime(dateObj) {
  var d = dateObj || new Date();
  return ddlPad2(d.getDate()) + "." +
    ddlPad2(d.getMonth() + 1) + "." +
    d.getFullYear() + " " +
    ddlPad2(d.getHours()) + ":" +
    ddlPad2(d.getMinutes());
}

function ddlDebugHeader(title) {
  return [
    "file: " + DDL_FILE,
    "name: " + DDL_NAME,
    "version: " + DDL_VERSION,
    "time: " + ddlFormatDebugTime(new Date()),
    title || "DEBUG Input Linker"
  ];
}

function ddlDescribeValue(val) {
  var len;

  if (val == null) return "null";
  if (val === "") return "empty string";
  if (ddlIsArray(val)) return "array length " + val.length;
  if (typeof val === "string") return "string: " + val;
  if (typeof val === "number") return "number: " + val;
  if (typeof val === "boolean") return "boolean: " + val;

  try {
    len = ddlListLength(val);
    if (len != null) return "list-like length " + len;
  } catch (e0) {}

  try {
    if (typeof val.field === "function") return "entry-like object";
  } catch (e1) {}

  try {
    return "object " + Object.prototype.toString.call(val);
  } catch (e2) {}

  return "unknown object";
}

function ddlDebugFieldRaw(fieldName) {
  try {
    if (typeof field === "function") return ddlDescribeValue(field(fieldName));
  } catch (e) {
    return "field() error: " + e;
  }
  return "field() unavailable";
}

function ddlDebugEntryFieldRaw(entryObj, fieldName) {
  try {
    if (entryObj && typeof entryObj.field === "function") return ddlDescribeValue(entryObj.field(fieldName));
  } catch (e) {
    return "entry.field() error: " + e;
  }
  return "entry.field() unavailable";
}

function ddlDebugWriteToEntry(entryObj, fieldName, lines) {
  if (!entryObj || !fieldName || !lines) return false;
  if (!ddlEntryHasField(entryObj, fieldName)) return false;
  return ddlSafeSet(entryObj, fieldName, lines.join("\n"), null, null, false);
}

function ddlDebugReceiveTrace(stage, src, target, cfg, result, errors) {
  var lines;
  var links;
  var firstLink;
  var map;
  var i;
  var item;
  var debugField;
  var sourceDateField;
  var targetDateField;
  var rr;

  if (!cfg || (cfg.debugReceive !== true && cfg.debugLinker !== true && cfg.linkerDebug !== true)) return;

  sourceDateField = cfg.sourceDateField || "Date";
  targetDateField = cfg.targetDateField || "Date";
  links = ddlToArray(ddlSafeField(src, cfg.sourceDayLinkField || "DayLinks", null, null));
  firstLink = ddlFirstRelationValue(links);
  map = cfg.processMap || cfg.map || (cfg.receiveConfig && (cfg.receiveConfig.processMap || cfg.receiveConfig.map)) || [];
  rr = result && result.receiveResult;

  lines = ddlDebugHeader("DEBUG Input Linker Receive");
  lines.push("stage: " + stage);
  lines.push("cfg.receiveAfterLink: " + ddlDescribeValue(cfg.receiveAfterLink));
  lines.push("cfg.receiveExistingLink: " + ddlDescribeValue(cfg.receiveExistingLink));
  lines.push("cfg.updateExistingLink: " + ddlDescribeValue(cfg.updateExistingLink));
  lines.push("cfg.processExistingLink: " + ddlDescribeValue(cfg.processExistingLink));
  lines.push("shouldReceiveAfterLink: " + ddlShouldReceiveAfterLink(cfg));
  lines.push("shouldReceiveExistingLink: " + ddlShouldReceiveExistingLink(cfg));
  lines.push("skipReason: " + (result && result.skipReason ? result.skipReason : ""));
  lines.push("created: " + !!(result && result.created));
  lines.push("linked: " + !!(result && result.linked));
  lines.push("restored: " + (result && result.restored ? result.restored.join(",") : ""));
  lines.push("sourceDayLinkField: " + (cfg.sourceDayLinkField || "DayLinks"));
  lines.push("source DayLinks length: " + links.length);
  lines.push("source DayLink first: " + ddlDescribeValue(firstLink));
  lines.push("source DayLink first id: " + ddlEntryId(firstLink));
  lines.push("source date trigger raw: " + ddlDebugFieldRaw(sourceDateField));
  lines.push("source date entry raw: " + ddlDebugEntryFieldRaw(src, sourceDateField));
  lines.push("target: " + ddlDescribeValue(target));
  lines.push("target id: " + ddlEntryId(target));
  lines.push("target date raw: " + ddlDebugEntryFieldRaw(target, targetDateField));

  if (rr) {
    lines.push("receive inputs: " + rr.inputs);
    lines.push("receive linked: " + rr.linked);
    lines.push("receive skippedLinkedToOther: " + rr.skippedLinkedToOther);
    lines.push("receive appended: " + rr.appended.join(","));
    lines.push("receive tags: " + rr.tags.join(","));
    lines.push("receive postEntries: " + rr.postEntries.join(","));
    lines.push("receive restored: " + (rr.restored ? rr.restored.join(",") : ""));
    lines.push("receive errors: " + rr.errors.join("; "));
  } else {
    lines.push("receive result: null");
  }

  for (i = 0; i < map.length; i++) {
    item = ddlNormalizeMapItem(map[i]);
    if (!item.from) continue;
    lines.push("map " + item.from + " trigger raw: " + ddlDebugFieldRaw(item.from));
    lines.push("map " + item.from + " entry raw: " + ddlDebugEntryFieldRaw(src, item.from));
  }

  if (errors && errors.length) lines.push("errors: " + errors.join("; "));

  ddlLogLines(lines);
  debugField = cfg.sourceDebugField || cfg.debugField || "Debug";
  ddlDebugWriteToEntry(src, debugField, lines);
}

function debugInputLinkerAccess(cfg) {
  cfg = cfg || {};

  var src = cfg.entryObj || entry();
  var debugField = cfg.sourceDebugField || cfg.debugField || "Debug";
  var targetLibName = cfg.targetLib || "DustingDay";
  var sourceDateField = cfg.sourceDateField || "Date";
  var targetDateField = cfg.targetDateField || "Date";
  var lines = [];
  var sourceDateRaw;
  var sourceDateFromValuesRaw;
  var triggerFieldRaw;
  var sourceDate;
  var targetLib;
  var entries;
  var first;
  var firstDateRaw;
  var sourceLinks;
  var firstLink;
  var firstLinkId;
  var firstLinkFound;
  var created;
  var canCreate = cfg.testCreate === true;

  lines = ddlDebugHeader("DEBUG Input Linker");
  lines.push("targetLib: " + targetLibName);
  lines.push("sourceDateField: " + sourceDateField);
  lines.push("targetDateField: " + targetDateField);
  lines.push("dayStartHour: " + ddlDayStartHour(cfg));
  lines.push("daySearchLimit: " + ddlDaySearchLimit(cfg));
  lines.push("rowSourceMode: " + (cfg.rowSourceMode || cfg.rowMode || "realtime"));
  lines.push("rowStepHours: " + (cfg.rowStepHours != null ? cfg.rowStepHours : 0.5));
  lines.push("rowRoundMode: " + (cfg.rowRoundMode || cfg.roundMode || "round"));
  lines.push("source entry: " + ddlDescribeValue(src));
  lines.push("source entry id: " + ddlEntryId(src));
  lines.push("source entry deleted: " + ddlIsDeletedEntry(src));

  sourceDateRaw = ddlSafeField(src, sourceDateField, null, null);
  sourceDateFromValuesRaw = ddlSafeValuesField(src, sourceDateField);
  triggerFieldRaw = ddlSafeTriggerFieldValue();
  sourceDate = ddlToDate(sourceDateRaw);
  lines.push("source date raw: " + ddlDescribeValue(sourceDateRaw));
  lines.push("source date values raw: " + ddlDescribeValue(sourceDateFromValuesRaw));
  lines.push("trigger field() raw: " + ddlDescribeValue(triggerFieldRaw));
  lines.push("source date parsed: " + (sourceDate ? sourceDate.toString() : "null"));

  sourceLinks = ddlToArray(ddlSafeField(src, cfg.sourceDayLinkField || "DayLinks", null, null));
  firstLink = sourceLinks.length ? sourceLinks[0] : null;
  firstLinkId = ddlEntryId(firstLink);
  lines.push("sourceDayLinkField: " + (cfg.sourceDayLinkField || "DayLinks"));
  lines.push("source DayLinks length: " + sourceLinks.length);
  lines.push("source DayLink[0]: " + ddlDescribeValue(firstLink));
  lines.push("source DayLink[0] id: " + firstLinkId);
  lines.push("source DayLink[0] deleted: " + ddlIsDeletedEntry(firstLink));

  try {
    targetLib = libByName(targetLibName);
    lines.push("libByName: " + ddlDescribeValue(targetLib));
  } catch (e0) {
    lines.push("libByName error: " + e0);
    ddlLogLines(lines);
    ddlSafeSet(src, debugField, lines.join("\n"), null, null);
    return {
      ok: false,
      text: lines.join("\n")
    };
  }

  if (!targetLib) {
    lines.push("target lib missing");
    ddlLogLines(lines);
    ddlSafeSet(src, debugField, lines.join("\n"), null, null);
    return {
      ok: false,
      text: lines.join("\n")
    };
  }

  if (firstLinkId) {
    try {
      if (typeof targetLib.findById === "function") {
        firstLinkFound = targetLib.findById(firstLinkId);
        lines.push("target findById DayLink[0]: " + ddlDescribeValue(firstLinkFound));
        lines.push("target findById DayLink[0] id: " + ddlEntryId(firstLinkFound));
        lines.push("target findById DayLink[0] deleted: " + ddlIsDeletedEntry(firstLinkFound));
        lines.push("target findById DayLink[0] date raw: " + ddlDescribeValue(ddlSafeField(firstLinkFound, targetDateField, null, null)));
      } else {
        lines.push("target findById available: false");
      }
    } catch (eFind) {
      lines.push("target findById error: " + eFind);
    }
  } else {
    lines.push("target findById DayLink[0]: skipped");
  }

  try {
    entries = ddlTargetEntries(targetLib);
    lines.push("target entries: " + entries.length);
  } catch (e1) {
    lines.push("entries error: " + e1);
  }

  if (entries && entries.length > 0) {
    first = entries[0];
    lines.push("first entry: " + ddlDescribeValue(first));
    firstDateRaw = ddlSafeField(first, targetDateField, null, null);
    lines.push("first target date raw: " + ddlDescribeValue(firstDateRaw));
    lines.push("first target date parsed: " + (ddlToDate(firstDateRaw) ? ddlToDate(firstDateRaw).toString() : "null"));
  }

  lines.push("targetLib.create available: " + (targetLib && typeof targetLib.create === "function"));

  if (canCreate && sourceDate) {
    try {
      created = targetLib.create((function() {
        var values = {};
        values[targetDateField] = sourceDate.getTime();
        return values;
      })());
      lines.push("test create: ok");
      lines.push("created: " + ddlDescribeValue(created));
    } catch (e2) {
      lines.push("test create error: " + e2);
    }
  } else {
    lines.push("test create: skipped");
  }

  ddlSafeSet(src, debugField, lines.join("\n"), null, null);
  ddlLogLines(lines);

  return {
    ok: true,
    targetLib: targetLib,
    entries: entries,
    text: lines.join("\n")
  };
}

function linkInputEntryToTarget(cfg) {
  cfg = cfg || {};

  var errors = [];
  var src = cfg.entryObj || entry();
  var sourceDateField = cfg.sourceDateField || "Date";
  var targetDateField = cfg.targetDateField || "Date";
  var sourceDayLinkField = cfg.sourceDayLinkField || "DayLinks";
  var sourceDayIdField = cfg.sourceDayIdField || cfg.sourceTargetIdField || cfg.dayIdField || "";
  var sourceDate;
  var targetLib;
  var sourceDayLinks;
  var sourceDayLinkValue;
  var sourceHasDayLinks;
  var target;
  var result = {
    targetEntry: null,
    created: false,
    linked: false,
    linkSkippedExisting: false,
    createSkippedExistingLink: false,
    directLinkedTargetWriteSkipped: false,
    processSkippedExistingLink: false,
    processSkippedLinkOnly: false,
    unlinked: 0,
    skipped: false,
    skipReason: "",
    appended: [],
    tags: [],
    recalculated: [],
    postEntries: [],
    restored: [],
    receiveResult: null,
    refreshBeforeOpenResult: null,
    openResult: { attempted: false, ok: false, target: "", method: "", error: "" },
    errors: errors
  };

  cfg.debugEntry = src;
  cfg.debugField = cfg.debugField || cfg.sourceDebugField || "Debug";

  if (cfg.entryObj == null && cfg.skipLinkingTrigger !== false && ddlIsLinkingTriggerContext()) {
    result.skipped = true;
    result.skipReason = "linking_trigger_context";
    return result;
  }

  sourceDayLinks = sourceDayLinkField ? ddlToArray(ddlSafeField(src, sourceDayLinkField, null, null)) : [];
  sourceDayLinkValue = ddlFirstRelationValue(sourceDayLinks);
  sourceHasDayLinks = sourceDayLinkValue != null;

  if (sourceHasDayLinks) {
    result.linked = true;
    result.linkSkippedExisting = true;

    if (ddlShouldReceiveExistingLink(cfg)) {
      sourceDate = ddlToDate(ddlSafeField(src, sourceDateField, errors, "Quell-Datumsfeld fehlt"));
      if (!sourceDate) {
        errors.push("Quell-Datum leer oder ungültig: " + sourceDateField);
        ddlWriteErrors(errors, cfg);
        return result;
      }

      try {
        targetLib = libByName(cfg.targetLib || "DustingDay");
      } catch (eExistingLib) {
        targetLib = null;
      }

      if (!targetLib) {
        errors.push("Bibliothek fehlt: " + (cfg.targetLib || "DustingDay"));
        ddlWriteErrors(errors, cfg);
        return result;
      }

      target = ddlResolveTargetBySourceId(targetLib, src, sourceDayIdField, targetDateField, sourceDate, cfg);
      if (!target && (!sourceDayIdField || cfg.resolveExistingLinkFromRelation === true)) target = ddlResolveLinkedTargetFromLibrary(targetLib, sourceDayLinkValue, targetDateField, sourceDate, cfg);
      if (!target) target = ddlFindDayEntry(targetLib, sourceDate, targetDateField, cfg);
      if (!target && cfg.createMissingExistingDay !== false) {
        target = ddlCreateDayEntry(targetLib, sourceDate, targetDateField, cfg, errors);
        result.created = !!target;
      }

      if (!target) {
        errors.push("Bestehender DayLink konnte nicht zu einem beschreibbaren Tages-Eintrag aufgeloest werden");
        ddlWriteErrors(errors, cfg);
        return result;
      }

      result.targetEntry = target;
      ddlWriteSourceDayId(src, sourceDayIdField, target, errors, cfg);
      ddlReceiveAfterLink(src, target, cfg, result, errors);
      ddlRefreshBeforeOpen(src, target, cfg, result, errors);
      ddlEnsureActiveAfterLink(src, target, result, errors);
      ddlOpenConfiguredTarget(target, cfg, result);
      result.skipped = true;
      result.skipReason = "existing_daylink_receive";
      if (errors.length) ddlWriteErrors(errors, cfg);
      ddlDebugReceiveTrace("existing_link_receive", src, target, cfg, result, errors);
      return result;
    }

    result.skipped = true;
    result.skipReason = "existing_daylink_noop";
    ddlDebugReceiveTrace("existing_link_noop", src, null, cfg, result, errors);
    return result;
  }

  sourceDate = ddlToDate(ddlSafeField(src, sourceDateField, errors, "Quell-Datumsfeld fehlt"));

  if (!sourceDate) {
    errors.push("Quell-Datum leer oder ungültig: " + sourceDateField);
    ddlWriteErrors(errors, cfg);
    return result;
  }

  cfg.map = [];

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

  target = ddlResolveTargetBySourceId(targetLib, src, sourceDayIdField, targetDateField, sourceDate, cfg);
  if (!target) target = ddlFindDayEntry(targetLib, sourceDate, targetDateField, cfg);

  if (!target) {
    target = ddlCreateDayEntry(targetLib, sourceDate, targetDateField, cfg, errors);
    result.created = !!target;
  }

  if (!target) {
    ddlWriteErrors(errors, cfg);
    return result;
  }

  result.targetEntry = target;
  ddlWriteSourceDayId(src, sourceDayIdField, target, errors, cfg);

  if (sourceDayLinkField) {
    result.linked = ddlLinkEntry(src, sourceDayLinkField, target, errors, cfg);
    if (result.linked) ddlEnsureActiveAfterLink(src, target, result, errors);
  }

  if (result.linked) {
    ddlReceiveAfterLink(src, target, cfg, result, errors);
    ddlEnsureActiveAfterLink(src, target, result, errors);
  }

  ddlRefreshBeforeOpen(src, target, cfg, result, errors);
  ddlEnsureActiveAfterLink(src, target, result, errors);
  ddlOpenConfiguredTarget(target, cfg, result);

  result.skipped = true;
  result.skipReason = "link_only";
  result.processSkippedLinkOnly = true;
  if (errors.length) ddlWriteErrors(errors, cfg);
  ddlDebugReceiveTrace("new_link", src, target, cfg, result, errors);
  return result;
}

function refreshTargetFromInputEntries(cfg) {
  cfg = cfg || {};
  ddlApplyReceiveConfigDefaults(cfg);

  var errors = [];
  var target = cfg.targetEntry || cfg.entryObj || entry();
  var targetDateField = cfg.targetDateField || "Date";
  var sourceDateField = cfg.sourceDateField || "Date";
  var targetDate = ddlToDate(ddlSafeField(target, targetDateField, errors, "Ziel-Datumsfeld fehlt"));
  var inputs;
  var sourceDate;
  var i;
  var result = {
    targetEntry: target,
    mode: ddlNormalizeProcessMode(cfg.rebuild === true ? "rebuild" : (cfg.processMode || cfg.mode)),
    inputs: 0,
    linked: 0,
    skippedLinkedToOther: 0,
    appended: [],
    tags: [],
    cleared: [],
    recalculated: [],
    postEntries: [],
    restored: [],
    errors: errors
  };

  cfg.debugEntry = target;
  cfg.debugField = cfg.debugField || cfg.targetDebugField || cfg.sourceDebugField || "Debug";
  ddlClearDebugFieldIfExists(cfg);

  if (!target) {
    errors.push("Ziel-Eintrag fehlt");
    ddlWriteErrors(errors, cfg);
    return result;
  }

  if (!targetDate) {
    errors.push("Ziel-Datum leer oder ungültig: " + targetDateField);
    ddlWriteErrors(errors, cfg);
    return result;
  }

  cfg.map = cfg.processMap || cfg.map || [];

  if (!ddlIsArray(cfg.map)) {
    errors.push("Config fehlt oder falsch: processMap/map");
    cfg.map = [];
  }

  inputs = ddlSelectInputsForDay(target, targetDate, cfg, result, errors);
  result.inputs = inputs.length;

  if (result.mode === "rebuild") {
    ddlClearMappedTargets(target, cfg.map, cfg, result, errors, true);
  } else {
    ddlClearMappedTargets(target, cfg.map, cfg, result, errors, false);
  }

  for (i = 0; i < inputs.length; i++) {
    sourceDate = ddlToDate(ddlSafeField(inputs[i], sourceDateField, errors, "Quell-Datumsfeld fehlt"));
    if (!sourceDate) continue;
    ddlApplyMapFromSourceToDay(inputs[i], target, sourceDate, targetDate, cfg, result, errors);
  }

  ddlRunConfiguredPostEntry(null, target, cfg, result, errors);

  if (cfg.recalcTarget === true && ddlRecalcEntry(target, errors, "Target recalc fehlgeschlagen")) {
    result.recalculated.push("target");
  }

  if (errors.length) ddlWriteErrors(errors, cfg);
  else ddlClearDebugFieldIfExists(cfg);
  return result;
}

function refreshCurrentTargetFromInputEntries(cfg) {
  cfg = cfg || {};
  if (!cfg.targetEntry && !cfg.entryObj) cfg.targetEntry = entry();
  return refreshTargetFromInputEntries(cfg);
}

function ddlResolveLinkedInputEntry(cfg, target) {
  var e;

  if (cfg.inputEntry) return cfg.inputEntry;
  if (cfg.sourceEntry) return cfg.sourceEntry;
  if (cfg.linkedEntry) return cfg.linkedEntry;

  try {
    if (typeof linkedEntry === "function") {
      e = linkedEntry();
      if (e && e !== target) return e;
    }
  } catch (e0) {}

  try {
    if (typeof masterEntry === "function") {
      e = masterEntry();
      if (e && e !== target) return e;
    }
  } catch (e1) {}

  try {
    if (typeof attr === "function") {
      e = attr();
      if (e && typeof e.field === "function" && e !== target) return e;
    }
  } catch (e2) {}

  return null;
}

function recieveInputEntryFromSource(cfg) {
  cfg = cfg || {};
  ddlApplyReceiveConfigDefaults(cfg);

  var target = cfg.targetEntry || cfg.entryObj || entry();
  var input = ddlResolveLinkedInputEntry(cfg, target);

  cfg.targetEntry = target;
  cfg.entries = input ? [input] : [];
  cfg.findMatchingEntries = false;
  cfg.linkNewEntries = false;
  cfg.processAllEntries = false;

  return refreshTargetFromInputEntries(cfg);
}

function receiveInputEntryFromSource(cfg) {
  return recieveInputEntryFromSource(cfg);
}

function refreshCurrentTargetFromLinkedInputEntry(cfg) {
  return recieveInputEntryFromSource(cfg);
}

try {
  this.recieveInputEntryFromSource = recieveInputEntryFromSource;
  this.receiveInputEntryFromSource = receiveInputEntryFromSource;
  this.refreshCurrentTargetFromLinkedInputEntry = refreshCurrentTargetFromLinkedInputEntry;
} catch (eGlobalInputLinker) {}
