/*
========================================
Shared Script: Time Marker
v1.21
========================================

NEU:
- einzelne leere Zeilen werden ignoriert
- Spezialfall:
  - genau 1 normale Zeile + kein Marker → inline "2: test"
- bestehende Marker werden korrekt erweitert
- immer genau 1 Leerzeile zwischen Zeitblock und Textblock

----------------------------------------
BEISPIELE (relevant)
----------------------------------------

Input:
test

Output:
2: test


Input:
test
test2

Output:
2: 

test
test2


Input:
1: info
test

Output:
1: info
2: 

test


Input:

(leer)

Output:
2: 


----------------------------------------
STANDARD AUFRUF
----------------------------------------

appendTimeMarker({
  targetTextField: "Notiz",
  sourceMode: "realtime",
  stepHours: 0.5,
  roundMode: "round",
  insertMode: "time_block_top"
});
*/


// ===== Helpers =====

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

  var s = String(v).replace(",", ".").trim();
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


// ===== Rundung =====

function stepHoursValue(hours, step, mode) {
  if (hours == null) return null;
  if (step == null || step <= 0) return hours;

  var inv = 1 / step;
  var x = hours * inv + 1e-9;

  if (mode === "ceil") return Math.ceil(x) / inv;
  if (mode === "floor") return Math.floor(x) / inv;

  return Math.round(x) / inv;
}


// ===== Darstellung =====

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


// ===== Zeitzeilen =====

function parseLeadingHour(line) {
  if (!line) return null;

  var m = String(line).match(/^\s*(\d+(?:[.,]\d+)?)\s*:/);
  if (!m) return null;

  return parseFloat(m[1].replace(",", "."));
}

function isTimestampLine(line) {
  return parseLeadingHour(line) != null;
}

function hasSameOrLaterLine(text, targetHour) {
  if (!text) return false;

  var lines = String(text).split(/\r?\n/);

  for (var i = 0; i < lines.length; i++) {
    var h = parseLeadingHour(lines[i]);
    if (isNaN(h)) continue;

    if (h >= targetHour) return true;
  }

  return false;
}

function normalizeLines(text) {
  var raw = text ? String(text).split(/\r?\n/) : [];
  var out = [];

  for (var i = 0; i < raw.length; i++) {
    var line = String(raw[i]);
    if (line.trim() !== "") {
      out.push(line);
    }
  }

  return out;
}

function splitTextBlocks(text) {
  var raw = normalizeLines(text);

  var timeLines = [];
  var otherLines = [];

  for (var i = 0; i < raw.length; i++) {
    var line = raw[i];

    if (isTimestampLine(line)) timeLines.push(line);
    else otherLines.push(line);
  }

  return {
    timeLines: timeLines,
    otherLines: otherLines
  };
}

function buildTimeBlockText(timeLines, otherLines) {
  if (!timeLines.length && !otherLines.length) return "";
  if (!timeLines.length) return otherLines.join("\n");
  if (!otherLines.length) return timeLines.join("\n");

  return timeLines.join("\n") + "\n\n" + otherLines.join("\n");
}


// ===== Quelle =====

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


// ===== Einfügen =====

function insertIntoTimeBlockTop(text, newLine) {
  var blocks = splitTextBlocks(text);

  // Sonderfall:
  // genau 1 normale Zeile, KEIN Marker
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


// ===== MAIN =====

function appendTimeMarker(cfg) {
  var e = entry();
  if (!e) return;

  var text = e.field(cfg.targetTextField);
  if (text == null) text = "";
  text = String(text);

  var rawHours = getSourceHours(e, cfg);
  if (rawHours == null) return;

  var stepped = stepHoursValue(
    rawHours,
    cfg.stepHours != null ? cfg.stepHours : 0.5,
    cfg.roundMode || "round"
  );

  if (hasSameOrLaterLine(text, stepped)) return;

  var newLine = formatHourLabel(stepped) + ": ";
  var insertMode = cfg.insertMode || "append";

  var newText;

  if (insertMode === "time_block_top") {
    newText = insertIntoTimeBlockTop(text, newLine);
  } else {
    newText = insertSimple(text, newLine, insertMode);
  }

  e.set(cfg.targetTextField, newText);
}