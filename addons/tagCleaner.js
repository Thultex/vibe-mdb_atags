/*
========================================
Addon Tag Cleaner v1.01 (sys 2.10)
========================================

Änderungen
- wiederholte Anwendung bleibt stabil und dupliziert keine Tagleisten
- normalisiert einfache Werttags in Hochstellung
- zieht `|`- und `||`-Tagleisten ans Feldende
- verbindet mehrere Tagleisten zu einer `||`-Zeile

Anwendung

applyTagCleaner({
  textField: "Notiz"
});

bulkApplyTagCleaner({
  textField: "Notiz"
});

========================================
*/

function trimTagCleanerString(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function tagCleanerSuperscript(raw) {
  var s = String(raw || "");
  var out = "";
  var i;
  var ch;

  if (/^\d/.test(s)) s = "+" + s;
  s = s.replace(",", "");

  for (i = 0; i < s.length; i++) {
    ch = s.charAt(i);
    if (ch === "0") out += "\u2070";
    else if (ch === "1") out += "\u00B9";
    else if (ch === "2") out += "\u00B2";
    else if (ch === "3") out += "\u00B3";
    else if (ch === "4") out += "\u2074";
    else if (ch === "5") out += "\u2075";
    else if (ch === "6") out += "\u2076";
    else if (ch === "7") out += "\u2077";
    else if (ch === "8") out += "\u2078";
    else if (ch === "9") out += "\u2079";
    else if (ch === "+") out += "\u207A";
    else if (ch === "-") out += "\u207B";
  }

  return out;
}

function tagCleanerQuoteState(str) {
  var s = String(str || "");
  var state = [];
  var inSingle = false;
  var inDouble = false;
  var i;
  var ch;

  for (i = 0; i <= s.length; i++) {
    state[i] = inSingle || inDouble;
    if (i >= s.length) break;

    ch = s.charAt(i);
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
  }

  return state;
}

function tagCleanerInsideQuote(state, pos) {
  var p = Number(pos);
  if (!state || isNaN(p)) return false;
  if (p < 0) p = 0;
  if (p >= state.length) p = state.length - 1;
  return !!state[p];
}

function cleanTagCleanerToken(token, bareAsHash) {
  var s = trimTagCleanerString(token);
  var m;

  if (!s) return "";
  if (/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*#$/.test(s)) return s;
  if (/^#[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(s)) return s.substring(1) + "#";
  if (/#/.test(s) || /:/.test(s)) return s;
  if (/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]+$/.test(s)) return s;

  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)([+\-]?\d+(?:[.,]\d+)?|\++|-+)$/);
  if (m) return m[1] + tagCleanerSuperscript(m[2]);

  if (bareAsHash && /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(s)) return s + "#";
  return s;
}

function tagCleanerTokenName(token) {
  var s = String(token || "");
  var m = s.match(/^#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)/);
  return m ? m[1].toLowerCase() : s.toLowerCase();
}

function tagCleanerTokenKind(token) {
  var s = String(token || "");
  if (/#/.test(s) || /:/.test(s)) return 1;
  if (/[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]/.test(s)) return 0;
  return 2;
}

function sortTagCleanerTokens(tokens) {
  tokens.sort(function(a, b) {
    var ak = tagCleanerTokenKind(a);
    var bk = tagCleanerTokenKind(b);
    var an;
    var bn;

    if (ak !== bk) return ak - bk;
    an = tagCleanerTokenName(a);
    bn = tagCleanerTokenName(b);
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
}

function splitTagCleanerBarTokens(text) {
  var s = String(text || "");
  var out = [];
  var token = "";
  var inSingle = false;
  var inDouble = false;
  var i;
  var ch;

  for (i = 0; i < s.length; i++) {
    ch = s.charAt(i);
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;

    if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (token) out.push(token);
      token = "";
    } else {
      token += ch;
    }
  }

  if (token) out.push(token);
  return out;
}

function cleanTagCleanerInlineLine(line) {
  var s = String(line || "");
  var state = tagCleanerQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([+\-]?\d+(?:[.,]\d+)?|\++|-+)(?=$|[\s,;.!?()\[\]{}])/g;
  var out = [];
  var last = 0;
  var m;
  var start;
  var end;
  var name;
  var raw;
  var full;
  var negSplit;

  while ((m = rx.exec(s)) !== null) {
    start = m.index + String(m[1] || "").length;
    end = start + String(m[2] || "").length + String(m[3] || "").length;
    name = m[2] || "";
    raw = m[3] || "";
    full = String(m[0] || "").substring(String(m[1] || "").length);

    if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
      negSplit = full.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(-\d+(?:[.,]\d+)?)$/);
      if (negSplit) {
        name = negSplit[1];
        raw = negSplit[2];
      }
    }

    if (!tagCleanerInsideQuote(state, start)) {
      out.push(s.substring(last, start));
      out.push(name + tagCleanerSuperscript(raw));
      last = end;
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return out.join("");
}

function makeTagCleanerText(text) {
  var lines = String(text || "").split(/\r?\n/);
  var body = [];
  var barTokens = [];
  var seen = {};
  var i;
  var line;
  var m;
  var parts;
  var j;
  var token;
  var cleaned;

  function addBarToken(raw) {
    cleaned = cleanTagCleanerToken(raw, true);
    if (!cleaned) return;
    token = cleaned.toLowerCase();
    if (seen[token]) return;
    seen[token] = 1;
    barTokens.push(cleaned);
  }

  for (i = 0; i < lines.length; i++) {
    line = String(lines[i] || "");
    m = line.match(/^\s*\|\|?\s*(.*)$/);

    if (m) {
      parts = splitTagCleanerBarTokens(m[1] || "");
      for (j = 0; j < parts.length; j++) addBarToken(parts[j]);
      continue;
    }

    body.push(cleanTagCleanerInlineLine(line));
  }

  while (body.length && trimTagCleanerString(body[body.length - 1]) === "") body.pop();
  sortTagCleanerTokens(barTokens);

  if (barTokens.length) {
    if (body.length) body.push("");
    body.push("|| " + barTokens.join(" "));
  }

  return body.join("\n");
}

function applyTagCleaner(cfg) {
  cfg = cfg || {};
  if (cfg.enabled === false) return "";

  var entryObj = cfg.entryObj || entry();
  var sourceField = cfg.sourceTextField || cfg.textField;
  var targetField = cfg.targetTextField || sourceField;
  var sourceText;
  var out;

  if (!entryObj || !sourceField || !targetField) return "";

  sourceText = entryObj.field(sourceField);
  out = makeTagCleanerText(sourceText == null ? "" : String(sourceText));
  entryObj.set(targetField, out);
  return out;
}

function bulkApplyTagCleaner(cfg) {
  cfg = cfg || {};
  if (cfg.enabled === false) return [];

  var all = lib().entries();
  var results = [];
  var i;
  var bulkCfg;
  var key;

  for (i = 0; i < all.length; i++) {
    bulkCfg = {};
    for (key in cfg) {
      if (cfg.hasOwnProperty(key)) bulkCfg[key] = cfg[key];
    }
    bulkCfg.entryObj = all[i];
    results.push(applyTagCleaner(bulkCfg));
  }

  return results;
}
