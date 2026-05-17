/*
========================================
A4 Tag Cleaner v1.35 (sys 2.30)
========================================

Notes
- core tag cleaner module.
- Details live in README.md and CHANGELOG.md.
- Supports cumulative +/-, 00/null and zero-decimal tag forms.
- Exclusive tag bars keep body text unchanged.

Example: clean the default note field "Notiz"
applyCleanTags();

Example: clean a custom field with options
applyCleanTags({
  textField: "Notiz",
  tagBarPosition: "time_top",
  tagBarSpacing: "blank",
  formatValues: "keep"
});

========================================
*/

function getTagCleanerVersion() {
  return {
    name: "tagCleaner",
    version: "1.35",
    sysVersion: "2.30",
    path: "core/tagCleaner.js"
  };
}

function splitTagCleanerLines(text) {
  var s = String(text == null ? "" : text);
  var out = [];
  var start = 0;
  var i;
  var code;

  for (i = 0; i < s.length; i++) {
    code = s.charCodeAt(i);
    if (code !== 10 && code !== 13) continue;
    out.push(s.substring(start, i));
    if (code === 13 && i + 1 < s.length && s.charCodeAt(i + 1) === 10) i++;
    start = i + 1;
  }

  out.push(s.substring(start));
  return out;
}

function compactTagCleanerTextSpaces(s) {
  return String(s || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,;.!?])/g, "$1")
    .replace(/([(\[{])\s+/g, "$1")
    .replace(/^\s+|\s+$/g, "");
}

function isTagCleanerNumberValue(s) {
  return /^[+\-]?\d+(?:[.,]\d+)?$/.test(String(s || "")) ||
    /^\+{1,}\d*$/.test(String(s || "")) ||
    /^-{1,}\d*$/.test(String(s || ""));
}

function isTagCleanerTimestampLine(line) {
  return /^\s*\d+(?:[.,]\d+)?\s*:/.test(String(line || ""));
}

function readTagCleanerBarLine(line, singleBarExclusive) {
  var s = String(line || "");
  var m;

  m = s.match(/^\s*"\|\s*(.*)$/);
  if (m) return { text: m[1] || "", exclusive: true };

  m = s.match(/^\s*\|["']\s*(.*)$/);
  if (m) return { text: m[1] || "", exclusive: true };

  m = s.match(/^\s*\|\|\s*(.*)$/);
  if (m) return { text: m[1] || "", exclusive: true };

  if (singleBarExclusive && /^\s*\|\s*$/.test(s)) {
    return { text: "", exclusive: true, keepEmpty: true };
  }

  m = s.match(/^\s*\|\s*(.*)$/);
  if (m) return { text: m[1] || "", exclusive: false };

  return null;
}

function tagCleanerSpacingLines(spacing) {
  if (spacing === "none") return 0;
  if (spacing === "double") return 2;
  return 1;
}

function normalizeTagCleanerFormatValueMode(mode) {
  var s = String(mode == null ? "" : mode).replace(/^\s+|\s+$/g, "").toLowerCase();
  s = s.replace(/^["']|["']$/g, "");

  if (!s || s === "keep" || s === "preserve") return "keep";
  if (s === "min" || s === "minimal") return "min";
  if (s === "max" || s === "always" || s === "maximal") return "max";
  if (s === "none" || s === "off") return "none";

  return "keep";
}

function tagCleanerModeFromConfig(cfg) {
  if (cfg && cfg.formatValues != null) return normalizeTagCleanerFormatValueMode(cfg.formatValues);
  if (cfg && cfg.formatValueMode != null) return normalizeTagCleanerFormatValueMode(cfg.formatValueMode);
  if (cfg && cfg.positiveSignMode != null) return normalizeTagCleanerFormatValueMode(cfg.positiveSignMode);
  return "keep";
}

function normalizeTagCleanerFieldList(fields) {
  if (fields == null) return [];
  if (Object.prototype.toString.call(fields) === "[object Array]") return fields;
  return [fields];
}

function cleanTagCleanerUserTagName(raw) {
  var s = trimAtagLibString(raw);
  if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(s)) return "";
  return s;
}

function addUniqueTagCleanerName(out, seen, name) {
  var clean = cleanTagCleanerUserTagName(name);
  var key;

  if (!clean) return;
  key = clean.toLowerCase();
  if (seen[key]) return;
  seen[key] = 1;
  out.push(clean);
}

function tagCleanerTagList(rawTags) {
  var out = [];
  var parts;
  var i;

  if (rawTags == null) return out;
  if (Object.prototype.toString.call(rawTags) === "[object Array]") {
    for (i = 0; i < rawTags.length; i++) {
      if (trimAtagLibString(rawTags[i])) out.push(trimAtagLibString(rawTags[i]));
    }
    return out;
  }

  parts = String(rawTags || "").split(/\n|,\s*/);
  for (i = 0; i < parts.length; i++) {
    if (trimAtagLibString(parts[i])) out.push(trimAtagLibString(parts[i]));
  }

  return out;
}

function extractTagCleanerFormatValueMode(text) {
  var m = String(text || "").match(/(^|[\s,])fv\s*:\s*("[^"]*"|'[^']*'|[^\s,]+)/i);
  if (!m) return null;
  return normalizeTagCleanerFormatValueMode(m[2]);
}

function removeTagCleanerFormatValueDirectives(text) {
  return String(text || "").replace(/(^|[\s,])fv\s*:\s*("[^"]*"|'[^']*'|[^\s,]+)/ig, "$1").replace(/\s+/g, " ");
}

function normalizeTagCleanerStringValue(raw) {
  var s = trimAtagLibString(raw);
  var quote = s.charAt(0);
  var inner;

  if ((quote === '"' || quote === "'") && s.charAt(s.length - 1) === quote) {
    inner = s.substring(1, s.length - 1);
    if (!/\s/.test(inner)) return inner;
    return s;
  }

  return s.replace(/,+$/g, "");
}

function isTagCleanerFormatValueDirectiveLine(line) {
  return /^\s*fv\s*:\s*("[^"]*"|'[^']*'|[^\s,]+)\s*,*\s*$/i.test(String(line || ""));
}

function normalizeTagCleanerValue(raw) {
  var s = trimAtagLibString(raw);
  var sign = "";
  var body;

  if (s === "00" || s === "+00") return "00";
  if (/^\+{3,}$/.test(s) || /^-{3,}$/.test(s)) return s.substring(0, 2) + String(s.length);
  if (/^(\+{2,}|-{2,})(\d*)$/.test(s)) return s;

  if (/^[+\-]?0[.,]?\d+$/.test(s)) {
    if (s.charAt(0) === "+" || s.charAt(0) === "-") {
      sign = s.charAt(0);
      body = s.substring(1);
    } else {
      body = s;
    }
    body = body.replace(",", "");
    return (sign === "-" ? "-" : "") + body;
  }

  return normalizeTagCleanerRawValue(s);
}

function tagCleanerSuperscript(raw, positiveSignMode) {
  var s = normalizeTagCleanerValue(raw);
  var out = "";
  var i;
  var ch;
  var mode = normalizeTagCleanerFormatValueMode(positiveSignMode);

  if (mode === "none") return s;

  if (/^\d/.test(s) && mode === "max") s = "+" + s;
  else if (/^\+\d/.test(s) && mode === "min") s = s.substring(1);
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

function tagCleanerTagSuffix() {
  return "\u02E3";
}

function tagCleanerSuperscriptChars() {
  return "\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B" + tagCleanerTagSuffix();
}

function normalizeTagCleanerSuperscriptToken(s) {
  return String(s || "").replace(/([\u207A])(?=[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079])/g, "");
}

function normalizeTagCleanerSuperscriptTokenForMode(s, positiveSignMode) {
  var mode = normalizeTagCleanerFormatValueMode(positiveSignMode);
  if (mode === "keep" || mode === "none") return String(s || "");
  if (mode === "min") return normalizeTagCleanerSuperscriptToken(s);

  var raw = decodeTagCleanerSuperscript(s);
  if (/^\d/.test(raw)) raw = "+" + raw;
  return tagCleanerSuperscript(raw, mode);
}

function normalizeTagCleanerRawValue(raw) {
  var s = String(raw || "");
  if (/^[+\-][\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079]+$/.test(s)) {
    return s.charAt(0) + decodeTagCleanerSuperscript(s.substring(1));
  }
  return s;
}

function decodeTagCleanerSuperscriptChars(raw) {
  var s = String(raw || "");
  var out = "";
  var i;
  var ch;

  for (i = 0; i < s.length; i++) {
    ch = s.charAt(i);
    if (ch === "\u2070") out += "0";
    else if (ch === "\u00B9") out += "1";
    else if (ch === "\u00B2") out += "2";
    else if (ch === "\u00B3") out += "3";
    else if (ch === "\u2074") out += "4";
    else if (ch === "\u2075") out += "5";
    else if (ch === "\u2076") out += "6";
    else if (ch === "\u2077") out += "7";
    else if (ch === "\u2078") out += "8";
    else if (ch === "\u2079") out += "9";
    else if (ch === "\u207A") out += "+";
    else if (ch === "\u207B") out += "-";
    else if (ch === tagCleanerTagSuffix()) out += "x";
    else if (ch === "x" || ch === "#") out += "x";
    else if (/[0-9]/.test(ch)) out += ch;
  }

  return out;
}

function decodeTagCleanerSuperscript(raw) {
  var out = decodeTagCleanerSuperscriptChars(raw);

  if (out === "00" || out === "+00") return "00";

  if (/^[+\-]?0\d+$/.test(out)) {
    var sign = "";
    var digits = out;
    if (out.charAt(0) === "+" || out.charAt(0) === "-") {
      sign = out.charAt(0);
      digits = out.substring(1);
    }
    out = sign + "0," + digits.substring(1);
  }

  return out;
}

function normalizeTagCleanerMixedSuffix(name, suffix, positiveSignMode) {
  var raw = decodeTagCleanerSuperscriptChars(suffix);
  var m;

  if (raw === "x") {
    if (String(suffix || "") === tagCleanerTagSuffix() || String(suffix || "") === "#") return name + tagCleanerTagSuffix();
    return name + raw;
  }
  raw = raw.replace(/[x#]+$/g, "x");
  m = raw.match(/^x([+\-]?\d+(?:[.,]\d+)?|00|0\d+)$/);
  if (m) return name + tagCleanerSuperscript(m[1], positiveSignMode);

  m = raw.match(/^([+\-]?\d+(?:[.,]\d+)?|00|0\d+)[x#]+$/);
  if (m) return name + tagCleanerTagSuffix();

  m = raw.match(/^00(\d+)$/);
  if (m) return name + tagCleanerSuperscript(m[1].charAt(0) === "0" ? m[1] : "0" + m[1], positiveSignMode);

  m = raw.match(/^(0\d+)[x#]*$/);
  if (m) return name + tagCleanerSuperscript(m[1], positiveSignMode);

  return name + tagCleanerSuperscript(raw, positiveSignMode);
}

function normalizeTagCleanerIssue50SuffixesInLine(line, positiveSignMode) {
  var s = String(line || "");
  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(\u02E3([+\-]?\d+(?:[.,]\d+)?|00|0\d+)|([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]+)([0-9]+|x|#))(?=$|[\s,;.!?()\[\]{}])/g;
  var out = [];
  var last = 0;
  var m;
  var start;
  var raw;

  while ((m = rx.exec(s)) !== null) {
    start = m.index + String(m[1] || "").length;
    if (!isInsideAtagLibQuoteState(state, start)) {
      raw = m[4] ? tagCleanerTagSuffix() + m[4] : String(m[5] || "") + String(m[6] || "");
      out.push(s.substring(last, start));
      out.push(normalizeTagCleanerMixedSuffix(m[2] || "", raw, positiveSignMode));
      last = rx.lastIndex;
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return out.join("");
}

function cleanTagCleanerToken(token, bareAsHash, positiveSignMode) {
  var s = trimAtagLibString(token);
  var mode = normalizeTagCleanerFormatValueMode(positiveSignMode);
  var m;

  if (!s) return "";
  if (s === "_") return "";
  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#$/);
  if (m) return m[1] + tagCleanerTagSuffix();
  m = s.match(/^#([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)$/);
  if (m) return m[1] + tagCleanerTagSuffix();
  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*::\s*(.+)$/);
  if (m) {
    if (normalizeTagCleanerStringValue(m[2]) === "_") return "";
    if (isTagCleanerNumberValue(normalizeTagCleanerStringValue(m[2]))) {
      return m[1] + tagCleanerSuperscript(normalizeTagCleanerStringValue(m[2]), positiveSignMode);
    }
    return m[1] + ":: " + normalizeTagCleanerStringValue(m[2]);
  }
  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:\s*(.+)$/);
  if (m) {
    if (normalizeTagCleanerStringValue(m[2]) === "_") return "";
    if (isTagCleanerNumberValue(normalizeTagCleanerStringValue(m[2]))) {
      return m[1] + tagCleanerSuperscript(normalizeTagCleanerStringValue(m[2]), positiveSignMode);
    }
    return m[1] + ":" + normalizeTagCleanerStringValue(m[2]);
  }
  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#(.+)$/);
  if (m) return m[1] + ":" + normalizeTagCleanerStringValue(m[2]);
  if (/#/.test(s) || /:/.test(s)) return s;
  if (mode === "none") {
    if (bareAsHash && /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(s)) return s + tagCleanerTagSuffix();
    return s;
  }
  if (new RegExp("^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\\-]*[" + tagCleanerSuperscriptChars() + "0-9#x]+$").test(s)) {
    m = s.match(new RegExp("^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\\-]*?)([" + tagCleanerSuperscriptChars() + "0-9#x]+)$"));
    if (/^[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]+$/.test(m[2])) {
      return m[1] + normalizeTagCleanerSuperscriptTokenForMode(m[2], positiveSignMode);
    }
    return normalizeTagCleanerMixedSuffix(m[1], m[2], positiveSignMode);
  }

  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)([+\-][\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079]+)$/);
  if (m) return m[1] + tagCleanerSuperscript(normalizeTagCleanerRawValue(m[2]), positiveSignMode);

  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(\+{2,}\d*|-{2,}\d*|[+\-]?\d+(?:[.,]\d+)?|\++|-+)$/);
  if (m && !/_$/.test(m[1])) return m[1] + tagCleanerSuperscript(m[2], positiveSignMode);

  if (bareAsHash && /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(s)) return s + tagCleanerTagSuffix();
  return s;
}

function tagCleanerTokenName(token) {
  var s = String(token || "");
  var m = s.match(/^#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)/);
  return m ? m[1].toLowerCase() : s.toLowerCase();
}

function tagCleanerTokenKind(token) {
  var s = String(token || "");
  if (/^fv\s*:/i.test(s)) return 3;
  if (/[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]/.test(s)) return 0;
  if (/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*[+\-]?\d+(?:[.,]\d+)?$/.test(s)) return 0;
  if (/:/.test(s) || /#[^#]+$/.test(s)) return 1;
  if (new RegExp(tagCleanerTagSuffix() + "$").test(s)) return 2;
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

function formatTagCleanerBarTokens(tokens) {
  var out = "";
  var lastKind = null;
  var i;
  var kind;

  for (i = 0; i < tokens.length; i++) {
    kind = tagCleanerTokenKind(tokens[i]);
    if (out) out += kind !== lastKind ? ", " : " ";
    out += tokens[i];
    lastKind = kind;
  }

  return out;
}

function splitTagCleanerBarTokens(text) {
  var s = String(text || "");
  var out = [];
  var combined = [];
  var token = "";
  var inSingle = false;
  var inDouble = false;
  var i;
  var ch;
  var isSeparator;

  for (i = 0; i < s.length; i++) {
    ch = s.charAt(i);
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;

    isSeparator = /\s/.test(ch) || (ch === "," && !(/\d/.test(s.charAt(i - 1)) && /\d/.test(s.charAt(i + 1))));
    if (isSeparator && !inSingle && !inDouble) {
      if (token) out.push(token);
      token = "";
    } else {
      token += ch;
    }
  }

  if (token) out.push(token);

  for (i = 0; i < out.length; i++) {
    if (
      /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(out[i]) &&
      i + 1 < out.length &&
      /^[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]+$/.test(out[i + 1])
    ) {
      combined.push(out[i] + out[i + 1]);
      i++;
      continue;
    }
    if (/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*::$/.test(out[i]) && i + 1 < out.length) {
      combined.push(out[i] + out[i + 1]);
      i++;
    } else if (/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*:$/.test(out[i]) && i + 1 < out.length) {
      combined.push(out[i] + out[i + 1]);
      i++;
    } else {
      combined.push(out[i]);
    }
  }

  return combined;
}

function extractTagCleanerUserTagsFromLine(line, userTags, userTagSeen, enabled) {
  var s = String(line || "");
  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])(?:##([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,;.!?()\[\]{}])|([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)##(?=$|[\s,;.!?()\[\]{}]))/g;
  var out = [];
  var last = 0;
  var m;
  var start;
  var name;
  var prefix;

  while ((m = rx.exec(s)) !== null) {
    prefix = m[1] || "";
    start = m.index + prefix.length;

    if (!isInsideAtagLibQuoteState(state, start)) {
      name = m[2] || m[3] || "";
      if (enabled) {
        addUniqueTagCleanerName(userTags, userTagSeen, name);
        out.push(s.substring(last, m.index));
        if (prefix && !/^[,;.!?]$/.test(prefix)) out.push(prefix);
        last = rx.lastIndex;
      }
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return compactTagCleanerTextSpaces(out.join(""));
}

function cleanTagCleanerSimpleHashTagsInLine(line) {
  var s = String(line || "");
  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])(?:#([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,;.!?()\[\]{}])|([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#(?=$|[\s,;.!?()\[\]{}]))/g;
  var out = [];
  var last = 0;
  var m;
  var prefix;
  var start;
  var name;

  while ((m = rx.exec(s)) !== null) {
    prefix = m[1] || "";
    start = m.index + prefix.length;

    if (!isInsideAtagLibQuoteState(state, start)) {
      name = m[2] || m[3] || "";
      out.push(s.substring(last, m.index));
      out.push(prefix + name + tagCleanerTagSuffix());
      last = rx.lastIndex;
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return out.join("");
}

function normalizeStandaloneTagCleanerSuperscriptsInLine(line) {
  var s = String(line || "");
  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]+)(?=$|[\s,;.!?()\[\]{}])/g;
  var out = [];
  var last = 0;
  var m;
  var start;

  while ((m = rx.exec(s)) !== null) {
    start = m.index + String(m[1] || "").length;
    if (!isInsideAtagLibQuoteState(state, start)) {
      out.push(s.substring(last, start));
      out.push(decodeTagCleanerSuperscript(m[2] || ""));
      last = start + String(m[2] || "").length;
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return out.join("");
}

function normalizeTagCleanerDoubleColonSpacingInLine(line) {
  var s = String(line || "");
  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)::\s*("[^"]*"|'[^']*'|[^\s,;.!?()\[\]{}]+)/g;
  var out = [];
  var last = 0;
  var m;
  var start;

  while ((m = rx.exec(s)) !== null) {
    start = m.index + String(m[1] || "").length;
    if (!isInsideAtagLibQuoteState(state, start)) {
      out.push(s.substring(last, start));
      out.push((m[2] || "") + ":: " + (m[3] || ""));
      last = rx.lastIndex;
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return out.join("");
}

function cleanTagCleanerInlineLine(line, positiveSignMode, userTags, userTagSeen, userTagsEnabled) {
  var s = String(line || "");
  s = extractTagCleanerUserTagsFromLine(s, userTags || [], userTagSeen || {}, userTagsEnabled);
  s = normalizeTagCleanerIssue50SuffixesInLine(s, positiveSignMode);
  s = cleanTagCleanerSimpleHashTagsInLine(s);
  if (normalizeTagCleanerFormatValueMode(positiveSignMode) === "none") return s;

  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(\+{2,}\d*|-{2,}\d*|[+\-]?\d+(?:[.,]\d+)?|\++|-+|[+\-][\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079]+|[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u02E30-9]+)(?=$|[\s,;.!?()\[\]{}])/g;
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

    var zeroSplit = full.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)([+\-]?00|[+\-]?0[.,]?\d+)$/);
    if (zeroSplit) {
      name = zeroSplit[1];
      raw = zeroSplit[2];
    }

    var cumulativeSplit = full.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(\+{1,}\d*|-{2,}\d*)$/);
    if (cumulativeSplit) {
      name = cumulativeSplit[1];
      raw = cumulativeSplit[2];
    }

    if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
      negSplit = full.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(-\d+(?:[.,]\d+)?)$/);
      if (negSplit) {
        name = negSplit[1];
        raw = negSplit[2];
      }
    }

    if (!isInsideAtagLibQuoteState(state, start)) {
      if (/_$/.test(name)) {
        if (m[0] === "") rx.lastIndex++;
        continue;
      }
      out.push(s.substring(last, start));
      if (/^[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B]+$/.test(raw)) out.push(name + normalizeTagCleanerSuperscriptTokenForMode(raw, positiveSignMode));
      else if (/[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u02E3]/.test(raw) && /[0-9#\u02E3]/.test(raw)) out.push(normalizeTagCleanerMixedSuffix(name, raw, positiveSignMode));
      else out.push(name + tagCleanerSuperscript(normalizeTagCleanerRawValue(raw), positiveSignMode));
      last = end;
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return normalizeStandaloneTagCleanerSuperscriptsInLine(normalizeTagCleanerDoubleColonSpacingInLine(out.join("")));
}

function makeTagCleanerText(text) {
  return makeTagCleanerTextWithOptions(text, {});
}

function makeTagCleanerTextWithOptions(sourceText, cfg) {
  cfg = cfg || {};

  var lines = splitTagCleanerLines(sourceText);
  var body = [];
  var barTokens = [];
  var seen = {};
  var userTags = [];
  var userTagSeen = {};
  var i;
  var line;
  var m;
  var parts;
  var j;
  var token;
  var cleaned;
  var tagBarPosition = cfg.tagBarPosition || cfg.tagBarPlacement || "bottom";
  var tagBarSpacing = cfg.tagBarSpacing || "blank";
  var positiveSignMode = tagCleanerModeFromConfig(cfg);
  var barLine;
  var formatModeFromLine;
  var userTagsEnabled = normalizeTagCleanerFieldList(cfg.tagFields || cfg.userTagFields || cfg.tagField || cfg.userTagField).length > 0;
  var hasTimestampLine = false;
  var spacingLines = tagCleanerSpacingLines(tagBarSpacing);
  var singleBarExclusive = cfg.singleBarExclusive !== false && cfg.emptyBarExclusive !== false;
  var exclusiveTagBar = false;
  var hasTagBarLine = false;
  var tagBar;

  function addBarToken(raw) {
    cleaned = cleanTagCleanerToken(raw, true, positiveSignMode);
    if (!cleaned) return;
    token = cleaned.toLowerCase();
    if (seen[token]) return;
    seen[token] = 1;
    barTokens.push(cleaned);
  }

  for (i = 0; i < lines.length; i++) {
    line = String(lines[i] || "");
    if (isTagCleanerTimestampLine(line)) hasTimestampLine = true;
    tagBar = readTagCleanerBarLine(line, singleBarExclusive);
    if (!tagBar) continue;
    hasTagBarLine = true;
    if (tagBar.exclusive) exclusiveTagBar = true;
    formatModeFromLine = extractTagCleanerFormatValueMode(tagBar.text || "");
    if (formatModeFromLine != null) positiveSignMode = formatModeFromLine;
  }

  for (i = 0; i < lines.length; i++) {
    line = String(lines[i] || "");
    if (!isTagCleanerFormatValueDirectiveLine(line)) continue;
    formatModeFromLine = extractTagCleanerFormatValueMode(line);
    if (formatModeFromLine != null) positiveSignMode = formatModeFromLine;
  }

  for (i = 0; i < lines.length; i++) {
    line = String(lines[i] || "");
    tagBar = readTagCleanerBarLine(line, singleBarExclusive);

    if (tagBar) {
      formatModeFromLine = extractTagCleanerFormatValueMode(tagBar.text || "");
      if (formatModeFromLine != null) addBarToken("fv:" + formatModeFromLine);
      line = extractTagCleanerUserTagsFromLine(removeTagCleanerFormatValueDirectives(tagBar.text || ""), userTags, userTagSeen, userTagsEnabled);
      parts = splitTagCleanerBarTokens(line);
      for (j = 0; j < parts.length; j++) addBarToken(parts[j]);
      continue;
    }

    if (isTagCleanerFormatValueDirectiveLine(line)) {
      formatModeFromLine = extractTagCleanerFormatValueMode(line);
      if (formatModeFromLine != null) addBarToken("fv:" + formatModeFromLine);
      continue;
    }

    body.push(exclusiveTagBar ? line : cleanTagCleanerInlineLine(line, positiveSignMode, userTags, userTagSeen, userTagsEnabled));
  }

  while (body.length && trimAtagLibString(body[body.length - 1]) === "") body.pop();
  sortTagCleanerTokens(barTokens);

  if ((tagBarPosition === "auto" || tagBarPosition === "time_top" || tagBarPosition === "timestamps_top") && hasTimestampLine) {
    tagBarPosition = "top";
  }

  if (barTokens.length || (exclusiveTagBar && hasTagBarLine)) {
    var formattedBarTokens = formatTagCleanerBarTokens(barTokens);
    barLine = (exclusiveTagBar ? '"|' : "|") + (formattedBarTokens ? " " + formattedBarTokens : "");
    if (tagBarPosition === "top" || tagBarPosition === "above") {
      while (body.length && trimAtagLibString(body[0]) === "") body.shift();
      for (j = 0; body.length && j < spacingLines; j++) body.unshift("");
      body.unshift(barLine);
    } else {
      for (j = 0; body.length && j < spacingLines; j++) body.push("");
      body.push(barLine);
    }
  }

  while (body.length && trimAtagLibString(body[0]) === "") body.shift();
  while (body.length && trimAtagLibString(body[body.length - 1]) === "") body.pop();
  cfg._tagCleanerUserTags = userTags;

  return body.join("\n");
}

function applyTagCleaner(cfg) {
  cfg = cfg || {};
  if (cfg.enabled === false) return "";

  var entryObj = cfg.entryObj || (typeof entry === "function" ? entry() : null);
  var sourceField = cfg.sourceTextField || cfg.textField;
  var targetField = cfg.targetTextField || sourceField;
  var sourceText;
  var out;

  if (!entryObj || !sourceField || !targetField) return "";

  sourceText = entryObj.field(sourceField);
  out = makeTagCleanerTextWithOptions(sourceText == null ? "" : String(sourceText), cfg);
  entryObj.set(targetField, out);
  return out;
}

function applyCleanTags(cfg) {
  cfg = cfg || {};
  if (!cfg.textField && !cfg.sourceTextField) cfg.textField = "Notiz";
  return applyTagCleaner(cfg);
}

function bulkApplyTagCleaner(cfg) {
  cfg = cfg || {};
  if (cfg.enabled === false) return [];
  if (typeof lib !== "function") return [];

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
