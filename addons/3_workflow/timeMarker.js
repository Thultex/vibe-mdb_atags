/*
========================================
B7 Time Marker v1.40 (sys 2.50)
========================================

Änderungen
- Entfernt alten Alias `cleanupTimeMarkerPlaceholders`.
- `clearTimeMarkerRows()` entfernt Row-Prefixe oder setzt sie auf den aktuellen Marker zurueck, ohne Template-Inhalte zu interpretieren
- `mergeSameRowContents` entfernt identische Row-Inhalte getrennt vor `mergeSameRows`
- `mergeSameRows` bleibt mit `mergeSameRowContents` idempotent und verdoppelt bereits zusammengefasste Segmente nicht erneut
- Rows mit nur leeren Template-Slots wie `Testing: __` gelten als leer und werden entfernt
- Merge-Optionen akzeptieren auch Boolean-/String-Varianten aus Memento/Rhino, nicht nur primitives `true`
- `cleanupTimeMarker({ mergeSameRows: true })` fuehrt gleiche Row-Marker zusammen, z. B. `19: hallo` + `19: spannend` zu `19: hallo; spannend`
- Cleanup gibt `true` zurueck, wenn danach Markerzeilen vorhanden sind, sonst `false`
- `appendTimeMarker()` gibt ebenfalls `true` zurueck, wenn danach Markerzeilen vorhanden sind, sonst `false`
- `cleanupTimeMarker()` ersetzt `: Text` wie `appendTimeMarker()`, haengt aber keinen leeren neuen Marker an
- Cleanup sortiert Markerzeilen als Row-Block nach oben und normalen Text darunter
- Cleanup erhaelt Leerzeilen innerhalb des normalen Fliesstexts
- Zeilensplit erhaelt leere Zeilen auch in JScript
- Doppelpunkt-Platzhalter am Zeilenanfang werden beim Einfuegen mit dem aktuellen Marker belegt
- Bereinigung leerer TimeMarker und Leerzeilen läuft auch beim Abbruch durch `maxHours`
- bereinigte Leerzeilen werden auch zurückgeschrieben, wenn kein neuer Marker nötig ist
- Leerzeilen im Zeitblock werden nach Entfernen leerer TimeMarker bereinigt
- leere bestehende TimeMarker werden beim Setzen eines neuen Markers entfernt
- Add-on wieder eingebunden
- optionales Stundenlimit ergänzt
- Standardlimit auf 30 Stunden gesetzt

Kurzbeispiele

- `test` wird bei aktuellem Marker `2` zu `2: test`
- `: Text` wird bei aktuellem Marker `12,5` zu `12,5: Text`
- eine einzelne Zeile `:` wird entfernt

Anwendung vor oder beim Erstellen eines Eintrags

appendTimeMarker({
  targetTextField: "Notiz",
  sourceMode: "realtime",
  stepHours: 0.5,
  roundMode: "round",
  insertMode: "time_block_top",
  maxHours: 30
});

Anwendung in AfterEntry zum Bereinigen ohne neuen leeren Marker

cleanupTimeMarker({
  targetTextField: "Notiz",
});

Vorlagen vor dem Tag-Cleaner von alten Row-Markern befreien

clearTimeMarkerRows({
  fields: ["Notiz"],
  mode: "remove"
});
*/

/*
========================================
B7 Time Marker v1.40 (sys 2.50)
========================================
*/

function getTimeMarkerVersion() {
  return {
    name: "timeMarker",
    version: "1.40",
    sysVersion: "2.50",
    path: "addons/3_workflow/timeMarker.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("timeMarker", "1.40", "2.50", "addons/3_workflow/timeMarker.js", true);
}

function toDateSafe(v) {
  if (v == null || v === "") return null;

  try {
    if (typeof v === "number") {
      var n = v;
      if (n < 100000000000) n = n * 1000;

      var dNum = new Date(n);
      if (!isNaN(dNum.getTime())) return dNum;
    }

    var d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}

  return null;
}

function toNumberSafe(v) {
  if (v == null || v === "") return null;

  if (typeof v === "number") {
    if (isNaN(v)) return null;
    return v;
  }

  var s = String(v).replace(",", ".").replace(/^\s+|\s+$/g, "");
  if (!s) return null;

  var n = parseFloat(s);
  if (isNaN(n)) return null;

  return n;
}

function hoursDiff(d1, d2) {
  if (!d1 || !d2) return null;
  return (d1.getTime() - d2.getTime()) / 3600000;
}

function getRealtimeHours() {
  var d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

function stepHoursValue(hours, step, mode) {
  if (hours == null) return null;
  if (step == null || step <= 0) return hours;

  var inv = 1 / step;
  var x = hours * inv + 1e-9;

  if (mode === "ceil") return Math.ceil(x) / inv;
  if (mode === "floor") return Math.floor(x) / inv;

  return Math.round(x) / inv;
}

function formatHourLabel(hours) {
  if (hours == null) return null;

  var h = Math.round(hours * 1000000) / 1000000;
  var i = Math.round(h);

  if (Math.abs(h - i) < 0.000001) return String(i);

  var s = String(h).replace(".", ",");
  s = s.replace(/0+$/, "");
  s = s.replace(/,$/, "");

  return s;
}

function splitTimeMarkerLines(text) {
  if (!text) return [];
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function parseLeadingHour(line) {
  if (!line) return null;

  var m = String(line).match(/^\s*(\d+(?:[.,]\d+)?)\s*:/);
  if (!m) return null;

  return parseFloat(m[1].replace(",", "."));
}

function isBlankTimeMarkerText(text) {
  return /^[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]*$/.test(String(text || ""));
}

function isTimestampLine(line) {
  return parseLeadingHour(line) != null;
}

function hasTimestampLines(text) {
  var raw = splitTimeMarkerLines(text);
  var i;

  for (i = 0; i < raw.length; i++) {
    if (isTimestampLine(raw[i])) return true;
  }

  return false;
}

function isEmptyTimestampLine(line) {
  var m = String(line || "").match(/^\s*\d+(?:[.,]\d+)?\s*:(.*)$/);
  return !!(m && isEmptyTimeMarkerRowText(m[1]));
}

function isEmptyTemplateSlotText(text) {
  var s = String(text || "").replace(/^\s+|\s+$/g, "");
  var parts;
  var i;
  var part;

  if (!s) return true;

  parts = s.split(/\s*[;,]\s*/);
  for (i = 0; i < parts.length; i++) {
    part = String(parts[i] || "").replace(/^\s+|\s+$/g, "");
    if (!part) continue;
    if (!/^#?[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*\s*(?:::{0,1}|#)\s*_{1,2}$/.test(part)) return false;
  }

  return true;
}

function isEmptyTimeMarkerRowText(text) {
  return isBlankTimeMarkerText(text) || isEmptyTemplateSlotText(text);
}

function removeEmptyTimestampLines(text) {
  if (!text) return "";

  var raw = splitTimeMarkerLines(text);
  var out = [];

  for (var i = 0; i < raw.length; i++) {
    if (!isEmptyTimestampLine(raw[i])) out.push(raw[i]);
  }

  return out.join("\n");
}

function normalizeTimeMarkerText(text) {
  var raw = splitTimeMarkerLines(text);
  var out = [];
  var i;
  var line;
  var p;
  var n;
  var prevLine;
  var nextLine;

  for (i = 0; i < raw.length; i++) {
    line = String(raw[i]);
    if (!isBlankTimeMarkerText(line)) {
      out.push(line);
      continue;
    }

    prevLine = null;
    nextLine = null;

    for (p = i - 1; p >= 0; p--) {
      if (!isBlankTimeMarkerText(raw[p])) {
        prevLine = String(raw[p]);
        break;
      }
    }

    for (n = i + 1; n < raw.length; n++) {
      if (!isBlankTimeMarkerText(raw[n])) {
        nextLine = String(raw[n]);
        break;
      }
    }

    if (!prevLine || !nextLine) continue;
    if (isTimestampLine(prevLine) || isTimestampLine(nextLine)) continue;

    out.push(line);
  }

  while (out.length && isBlankTimeMarkerText(out[out.length - 1])) out.pop();
  return out.join("\n");
}

function replaceColonPlaceholderLines(text, hourLabel) {
  if (!text) return "";

  var raw = splitTimeMarkerLines(text);
  var out = [];
  var label = hourLabel != null && hourLabel !== "" ? String(hourLabel) : null;
  var i;
  var line;
  var m;

  for (i = 0; i < raw.length; i++) {
    line = String(raw[i]);

    if (/^\s*:\s*$/.test(line)) continue;

    m = line.match(/^(\s*):\s*(.+)$/);
    if (m && label != null) {
      out.push(String(m[1] || "") + label + ": " + String(m[2] || "").replace(/^\s+|\s+$/g, ""));
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function hasFillableColonPlaceholderLine(text) {
  var raw = splitTimeMarkerLines(text);
  var i;
  var line;
  var m;

  for (i = 0; i < raw.length; i++) {
    line = String(raw[i]);
    m = line.match(/^\s*:\s*(.*)$/);
    if (m && !isBlankTimeMarkerText(m[1])) return true;
  }

  return false;
}

function removeEmptyColonPlaceholderLines(text) {
  if (!text) return "";

  var raw = splitTimeMarkerLines(text);
  var out = [];
  var i;
  var line;

  for (i = 0; i < raw.length; i++) {
    line = String(raw[i]);
    if (/^\s*:\s*$/.test(line)) continue;
    out.push(line);
  }

  return out.join("\n");
}

function hasSameOrLaterLine(text, targetHour) {
  if (!text) return false;

  var lines = splitTimeMarkerLines(text);

  for (var i = 0; i < lines.length; i++) {
    var h = parseLeadingHour(lines[i]);
    if (isNaN(h)) continue;

    if (h >= targetHour) return true;
  }

  return false;
}

function splitTextBlocks(text) {
  var raw = splitTimeMarkerLines(text);

  var timeLines = [];
  var otherLines = [];
  var i;
  var line;

  for (i = 0; i < raw.length; i++) {
    line = String(raw[i]);

    if (isTimestampLine(line)) timeLines.push(line);
    else otherLines.push(line);
  }

  while (otherLines.length && isBlankTimeMarkerText(otherLines[0])) otherLines.shift();
  while (otherLines.length && isBlankTimeMarkerText(otherLines[otherLines.length - 1])) otherLines.pop();

  return {
    timeLines: timeLines,
    otherLines: otherLines
  };
}

function parseTimestampParts(line) {
  var m = String(line || "").match(/^(\s*)(\d+(?:[.,]\d+)?)(\s*:\s*)(.*)$/);
  if (!m) return null;

  return {
    indent: m[1] || "",
    label: m[2] || "",
    separator: m[3] || ": ",
    text: m[4] || ""
  };
}

function normalizeTimeMarkerRowKey(label) {
  var n = parseFloat(String(label || "").replace(",", "."));
  if (isNaN(n)) return String(label || "");
  return String(Math.round(n * 1000000) / 1000000);
}

function isTimeMarkerOptionEnabled(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;

  var s = String(value).replace(/^\s+|\s+$/g, "").toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function resolveSameRowSeparator(cfg) {
  if (cfg && cfg.mergeSameRowsSeparator != null) return String(cfg.mergeSameRowsSeparator);
  if (cfg && cfg.sameRowSeparator != null) return String(cfg.sameRowSeparator);
  return "; ";
}

function splitSameRowContentSegments(text, separator, dedupeSegments) {
  var s = String(text || "").replace(/^\s+|\s+$/g, "");
  var sep = String(separator || "");
  var out = [];
  var parts;
  var i;
  var part;

  if (!s) return out;
  if (!dedupeSegments || !sep) return [s];

  parts = s.split(sep);
  for (i = 0; i < parts.length; i++) {
    part = String(parts[i] || "").replace(/^\s+|\s+$/g, "");
    if (part) out.push(part);
  }

  return out;
}

function appendSameRowContent(current, text, separator, dedupeSegments) {
  var currentParts = splitSameRowContentSegments(current.text, separator, dedupeSegments);
  var newParts = splitSameRowContentSegments(text, separator, dedupeSegments);
  var seen = {};
  var out = [];
  var i;
  var part;

  if (!dedupeSegments) {
    if (isBlankTimeMarkerText(current.text)) return text;
    if (isBlankTimeMarkerText(text)) return current.text;
    return current.text + separator + text;
  }

  for (i = 0; i < currentParts.length; i++) {
    part = currentParts[i];
    if (seen.hasOwnProperty(part)) continue;
    seen[part] = true;
    out.push(part);
  }

  for (i = 0; i < newParts.length; i++) {
    part = newParts[i];
    if (seen.hasOwnProperty(part)) continue;
    seen[part] = true;
    out.push(part);
  }

  return out.join(separator);
}

function mergeSameTimeMarkerRowContents(timeLines, cfg) {
  if (!cfg || !isTimeMarkerOptionEnabled(cfg.mergeSameRowContents)) return timeLines;

  var out = [];
  var seen = {};
  var i;
  var line;
  var parts;
  var key;
  var text;

  for (i = 0; i < timeLines.length; i++) {
    line = String(timeLines[i]);
    parts = parseTimestampParts(line);

    if (!parts) {
      out.push(line);
      continue;
    }

    key = normalizeTimeMarkerRowKey(parts.label);
    text = String(parts.text || "").replace(/^\s+|\s+$/g, "");

    if (seen.hasOwnProperty(key + "\n" + text)) continue;

    seen[key + "\n" + text] = true;
    parts.text = text;
    out.push(parts.indent + parts.label + parts.separator + parts.text);
  }

  return out;
}

function mergeSameTimeMarkerRows(timeLines, cfg) {
  if (!cfg || !isTimeMarkerOptionEnabled(cfg.mergeSameRows)) return timeLines;

  var separator = resolveSameRowSeparator(cfg);
  var dedupeSegments = isTimeMarkerOptionEnabled(cfg.mergeSameRowContents);
  var out = [];
  var indexByKey = {};
  var partsByKey = {};
  var i;
  var line;
  var parts;
  var key;
  var text;
  var current;

  for (i = 0; i < timeLines.length; i++) {
    line = String(timeLines[i]);
    parts = parseTimestampParts(line);

    if (!parts) {
      out.push(line);
      continue;
    }

    key = normalizeTimeMarkerRowKey(parts.label);
    text = String(parts.text || "").replace(/^\s+|\s+$/g, "");

    if (indexByKey.hasOwnProperty(key)) {
      if (!isBlankTimeMarkerText(text)) {
        current = partsByKey[key];
        current.text = appendSameRowContent(current, text, separator, dedupeSegments);
        out[indexByKey[key]] = current.indent + current.label + current.separator + current.text;
      }
      continue;
    }

    indexByKey[key] = out.length;
    parts.text = text;
    partsByKey[key] = parts;
    out.push(parts.indent + parts.label + parts.separator + parts.text);
  }

  return out;
}

function buildTimeBlockText(timeLines, otherLines) {
  if (!timeLines.length && !otherLines.length) return "";
  if (!timeLines.length) return otherLines.join("\n");
  if (!otherLines.length) return timeLines.join("\n");

  return timeLines.join("\n") + "\n\n" + otherLines.join("\n");
}

function clearTimeMarkerRowsText(text, cfg) {
  cfg = cfg || {};

  var raw = splitTimeMarkerLines(text);
  var out = [];
  var mode = String(cfg.mode || cfg.rowMode || "remove").toLowerCase();
  var label = cfg.hourLabel;
  var i;
  var line;
  var parts;
  var content;

  if (mode === "reset" && (label == null || label === "")) {
    label = formatHourLabel(stepHoursValue(
      cfg.rawHours,
      cfg.stepHours != null ? cfg.stepHours : 0.5,
      cfg.roundMode || "round"
    ));
  }

  for (i = 0; i < raw.length; i++) {
    line = String(raw[i]);
    parts = parseTimestampParts(line);

    if (!parts) {
      out.push(line);
      continue;
    }

    content = String(parts.text || "").replace(/^\s+|\s+$/g, "");
    if (isBlankTimeMarkerText(content)) continue;

    if (mode === "reset" && label != null && label !== "") {
      out.push(String(label) + ": " + content);
    } else {
      out.push(content);
    }
  }

  return normalizeTimeMarkerText(out.join("\n"));
}

function clearTimeMarkerRows(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || entry();
  var targetTextField = resolveTimeMarkerTextField(cfg);
  var fields = cfg.fields;
  var text;
  var rawHours;
  var newText;
  var results;
  var i;
  var fieldCfg;
  var key;

  if (fields && Object.prototype.toString.call(fields) !== "[object Array]") fields = [fields];
  if (fields && fields.length) {
    results = {};
    for (i = 0; i < fields.length; i++) {
      if (!fields[i]) continue;
      fieldCfg = {};
      for (key in cfg) {
        if (cfg.hasOwnProperty(key) && key !== "fields" && key !== "targetTextField" && key !== "textField") {
          fieldCfg[key] = cfg[key];
        }
      }
      fieldCfg.entryObj = e;
      fieldCfg.targetTextField = fields[i];
      results[fields[i]] = clearTimeMarkerRows(fieldCfg);
    }
    return results;
  }

  if (!e || !targetTextField) return false;

  text = e.field(targetTextField);
  if (text == null) text = "";
  text = String(text);

  rawHours = getSourceHours(e, cfg);
  newText = clearTimeMarkerRowsText(text, {
    mode: cfg.mode || cfg.rowMode || "remove",
    hourLabel: cfg.hourLabel,
    rawHours: rawHours,
    stepHours: cfg.stepHours,
    roundMode: cfg.roundMode
  });

  if (newText !== text) e.set(targetTextField, newText);
  return newText !== text;
}

function arrangeTimeMarkerRows(text, cfg) {
  var blocks = splitTextBlocks(text);
  blocks.timeLines = mergeSameTimeMarkerRowContents(blocks.timeLines, cfg || {});
  blocks.timeLines = mergeSameTimeMarkerRows(blocks.timeLines, cfg || {});
  return buildTimeBlockText(blocks.timeLines, blocks.otherLines);
}

function getSourceHours(entryObj, cfg) {
  if (cfg.sourceMode === "realtime") {
    return getRealtimeHours();
  }

  if (cfg.sourceMode === "realtime_since") {
    var start = toDateSafe(entryObj.field(cfg.startDatetimeField));
    if (!start) return null;

    return hoursDiff(new Date(), start);
  }

  if (cfg.sourceMode === "datetime") {
    var d = toDateSafe(entryObj.field(cfg.sourceDatetimeField));
    if (!d) return null;

    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  if (cfg.sourceMode === "hours") {
    return toNumberSafe(entryObj.field(cfg.sourceHoursField));
  }

  return null;
}

function shouldSkipForMaxHours(rawHours, steppedHours, maxHours) {
  var max = toNumberSafe(maxHours);
  if (max == null) return false;
  if (max < 0) return false;

  if (rawHours != null && rawHours > max) return true;
  if (steppedHours != null && steppedHours > max) return true;

  return false;
}

function resolveMaxHours(cfg) {
  if (cfg && Object.prototype.hasOwnProperty.call(cfg, "maxHours")) {
    return cfg.maxHours;
  }

  return 30;
}

function resolveTimeMarkerTextField(cfg) {
  return cfg.targetTextField || cfg.textField;
}

function insertIntoTimeBlockTop(text, newLine) {
  var blocks = splitTextBlocks(text);

  if (blocks.timeLines.length === 0 && blocks.otherLines.length === 1) {
    return newLine + blocks.otherLines[0];
  }

  blocks.timeLines.push(newLine);

  return buildTimeBlockText(blocks.timeLines, blocks.otherLines);
}

function insertSimple(text, newLine, insertMode) {
  if (!text) return newLine;

  if (insertMode === "prepend") {
    return newLine + "\n" + text;
  }

  return text + "\n" + newLine;
}

function appendTimeMarker(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || entry();
  var targetTextField = resolveTimeMarkerTextField(cfg);
  if (!e || !targetTextField) return false;

  var text = e.field(targetTextField);
  if (text == null) text = "";
  text = String(text);
  var originalText = text;

  var rawHours = getSourceHours(e, cfg);
  if (rawHours == null) return hasTimestampLines(text);

  var stepped = stepHoursValue(
    rawHours,
    cfg.stepHours != null ? cfg.stepHours : 0.5,
    cfg.roundMode || "round"
  );

  var hasFillablePlaceholder = hasFillableColonPlaceholderLine(text);
  text = replaceColonPlaceholderLines(text, formatHourLabel(stepped));
  text = arrangeTimeMarkerRows(normalizeTimeMarkerText(removeEmptyTimestampLines(text)), cfg);

  if (hasFillablePlaceholder) {
    e.set(targetTextField, text);
    return hasTimestampLines(text);
  }

  if (shouldSkipForMaxHours(rawHours, stepped, resolveMaxHours(cfg))) {
    if (text !== originalText) e.set(targetTextField, text);
    return hasTimestampLines(text);
  }

  if (hasSameOrLaterLine(text, stepped)) {
    if (text !== originalText) e.set(targetTextField, text);
    return hasTimestampLines(text);
  }

  var newLine = formatHourLabel(stepped) + ": ";
  var insertMode = cfg.insertMode || "append";
  var newText;

  if (insertMode === "time_block_top") {
    newText = insertIntoTimeBlockTop(text, newLine);
  } else {
    newText = insertSimple(text, newLine, insertMode);
  }

  e.set(targetTextField, newText);
  return hasTimestampLines(newText);
}

function cleanupTimeMarker(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || entry();
  var targetTextField = resolveTimeMarkerTextField(cfg);
  if (!e || !targetTextField) return false;

  var text = e.field(targetTextField);
  if (text == null) text = "";
  text = String(text);

  var rawHours = getSourceHours(e, cfg);
  var stepped = rawHours == null
    ? null
    : stepHoursValue(
      rawHours,
      cfg.stepHours != null ? cfg.stepHours : 0.5,
      cfg.roundMode || "round"
    );

  var newText = replaceColonPlaceholderLines(text, formatHourLabel(stepped));
  newText = arrangeTimeMarkerRows(normalizeTimeMarkerText(removeEmptyTimestampLines(newText)), cfg);

  if (newText !== text) e.set(targetTextField, newText);
  return hasTimestampLines(newText);
}
