/*
========================================
A4 Tag Cleaner v1.49 (sys 2.40)
========================================

Notes
- core tag cleaner module.
- Details live in README.md and CHANGELOG.md.
- Supports cumulative +/-, 00/null and zero-decimal tag forms.
- Exclusive tag bars keep body text unchanged.
- Can display known aliases as long/short names with compact emoji suffixes.
- Alias headers can control cleaner display with `*`, `-` and `+`.
- Alias headers can convert emoji/symbol-only tokens back to long/short names.
- Display options can override alias header defaults, including emoji prefix/suffix.
- Reads the passive Alias field by default for alias display definitions.
- Provides lean template slot clearing + compaction helpers for new entries.

Example: clean the default note field "Notiz" and passively read "Alias"
cleanTags();

Example: clean a custom field with options
cleanTags({
  fields: ["Notiz"],
  aliasTextFields: ["Alias"],
  tagBarPosition: "time_top",
  tagBarSpacing: "blank",
  formatValues: "keep"
});

Example: only clear template tags after creating a new entry
cleanTemplateTags({
  fields: ["Notiz"]
});

========================================
*/

function getTagCleanerVersion() {
  return {
    name: "tagCleaner",
    version: "1.49",
    sysVersion: "2.40",
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

function splitTagCleanerTimestampLine(line) {
  var m = String(line || "").match(/^(\s*)(\d+(?:[.,]\d+)?)(\s*:\s*)(.*)$/);
  if (!m) return null;
  return {
    indent: m[1] || "",
    label: m[2] || "",
    separator: m[3] || ": ",
    content: trimAtagLibString(m[4] || "")
  };
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

function cleanTagCleanerMarkedTagName(raw) {
  var s = trimAtagLibString(raw);
  if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(s)) return "";
  return s;
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

  if (/^_[^_\r\n]+_$/.test(s)) return s.substring(1, s.length - 1);

  return s.replace(/,+$/g, "");
}

function isTagCleanerEmptyTemplateValue(raw) {
  var s = trimAtagLibString(raw);
  return s === "_" || s === "__";
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

function isTagCleanerAliasNameToken(raw) {
  return /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(String(raw || ""));
}

function parseTagCleanerAliasList(raw) {
  var s = String(raw || "");
  if (
    (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
    (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
  ) {
    s = s.substring(1, s.length - 1);
  }
  return s.split(",");
}

function parseTagCleanerAliasHeader(raw) {
  var parts = parseTagCleanerAliasList(raw || "");
  var out = { shortName: "", emoji: "", marker: "", hasShortName: false };
  var i;
  var part;
  var last;

  for (i = 0; i < parts.length; i++) {
    part = trimAtagLibString(parts[i]);
    if (part === "+" || part === "-" || part === "*") {
      out.marker = part;
      continue;
    }
    if (!part) continue;
    last = part.charAt(part.length - 1);
    if (part.length > 1 && (last === "*" || last === "-" || last === "+")) {
      out.marker = last;
      part = part.substring(0, part.length - 1);
    }
    if (isTagCleanerAliasNameToken(part) && !out.shortName) {
      out.shortName = part;
      out.hasShortName = true;
    } else if (!out.emoji) {
      out.emoji = part;
    }
  }

  return out;
}

function buildTagCleanerAliasDisplayMap(text) {
  var map = {};
  var lines = splitTagCleanerLines(text);
  var i;
  var line;
  var m;
  var name;
  var header;
  var aliases;
  var j;
  var alias;

  function add(token, info) {
    var key = String(token || "").toLowerCase();
    if (key) map[key] = info;
  }

  for (i = 0; i < lines.length; i++) {
    line = trimAtagLibString(lines[i]);
    if (/^@@@/.test(line)) continue;
    m = line.match(/^@@\s*([^\[(:(]+?)(?:\s*\(\s*([^)]+)\s*\))?(?:\s*\[[^\]]+\])?(?::\s*(.*))?$/);
    if (!m) continue;
    name = trimAtagLibString(m[1]).replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
    if (!name) continue;
    header = parseTagCleanerAliasHeader(m[2] || "");
    var info = {
      longName: name,
      shortName: header.shortName || name,
      emoji: header.emoji || "",
      marker: header.marker || "",
      hasShortName: header.hasShortName === true
    };
    add(name, info);
    add(info.shortName, info);
    if (info.emoji) add(info.emoji, info);
    aliases = parseTagCleanerAliasList(m[3] || "");
    for (j = 0; j < aliases.length; j++) {
      alias = trimAtagLibString(aliases[j]);
      if (!alias) continue;
      if (alias.charAt(0) === "-") alias = alias.substring(1);
      alias = alias.replace(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)([+\-]?\d+(?:[.,]\d+)?|\++|-+)$/, "$1");
      if (isTagCleanerAliasNameToken(alias)) add(alias, info);
    }
  }

  return map;
}

function tagCleanerDisplayRequested(cfg, displayMap) {
  var key;
  if (cfg && (
    cfg.cleanerTagText != null ||
    cfg.tagText != null ||
    cfg.cleanerEmoji != null ||
    cfg.tagEmoji != null
  )) return true;

  for (key in (displayMap || {})) {
    if (!displayMap.hasOwnProperty(key)) continue;
    if (displayMap[key] && displayMap[key].marker && displayMap[key].marker !== "*") return true;
    if (displayMap[key] && displayMap[key].emoji && !displayMap[key].marker) return true;
  }

  return false;
}

function formatTagCleanerDisplayName(name, displayMap, cfg) {
  var key = String(name || "").toLowerCase();
  var info = displayMap ? displayMap[key] : null;
  var textMode = "long";
  var emojiMode = "none";
  var base = String(name || "");
  var emoji = info && info.emoji ? String(info.emoji) : "";

  if (!info || !tagCleanerDisplayRequested(cfg, displayMap)) return base;
  if (cfg && cfg.cleanerTagText != null) textMode = String(cfg.cleanerTagText).toLowerCase();
  else if (cfg && cfg.tagText != null) textMode = String(cfg.tagText).toLowerCase();
  else if (info.marker === "-" && info.hasShortName) textMode = "short";
  else if (info.marker === "-") textMode = "keep";
  else if (info.marker === "+") textMode = "long";
  else if (!info.marker && emoji) textMode = "none";
  else textMode = "keep";

  if (cfg && cfg.cleanerEmoji != null) emojiMode = String(cfg.cleanerEmoji).toLowerCase();
  else if (cfg && cfg.tagEmoji != null) emojiMode = String(cfg.tagEmoji).toLowerCase();
  else if (!info.marker && emoji) emojiMode = "only";

  if (textMode === "keep") return base;
  if (textMode === "short") base = info.shortName || info.longName || base;
  else if (textMode === "none") base = "";
  else base = info.longName || base;

  if (emojiMode === "only") return emoji || base;
  if (emojiMode === "prefix" && emoji) return emoji + base;
  if (emojiMode === "suffix" && emoji) return base + emoji;
  return base;
}

function applyTagCleanerDisplayToToken(token, displayMap, cfg) {
  var s = String(token || "");
  var m;
  var name;
  var suffix;

  if (!displayMap || !tagCleanerDisplayRequested(cfg, displayMap)) return s;
  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u02E3]*)$/);
  if (!m) return s;
  name = formatTagCleanerDisplayName(m[1], displayMap, cfg);
  suffix = m[2] || "";
  if (!name) return suffix;
  return name + suffix;
}

function applyTagCleanerEmojiDisplayInLine(line, displayMap, cfg) {
  var s = String(line || "");
  var out = s;
  var key;
  var info;
  var emoji;
  var escaped;
  var rx;

  if (!displayMap || !tagCleanerDisplayRequested(cfg, displayMap)) return s;

  for (key in displayMap) {
    if (!displayMap.hasOwnProperty(key)) continue;
    info = displayMap[key];
    emoji = info && info.emoji ? String(info.emoji) : "";
    if (!emoji || String(key) !== emoji.toLowerCase()) continue;
    escaped = emoji.replace(/([\\^$.*+?()[\]{}|])/g, "\\$1");
    rx = new RegExp("(^|[\\s,;.!(\\)\\[\\]{}])(" + escaped + ")([\\u2070\\u00B9\\u00B2\\u00B3\\u2074\\u2075\\u2076\\u2077\\u2078\\u2079\\u207A\\u207B\\u02E3]*)(?=$|[\\s,;.!(\\)\\[\\]{}])", "g");
    out = out.replace(rx, function(all, prefix, emojiToken, suffix) {
      return prefix + formatTagCleanerDisplayName(emojiToken, displayMap, cfg) + (suffix || "");
    });
  }

  return out;
}

function applyTagCleanerDisplayInLine(line, displayMap, cfg) {
  var s = String(line || "");
  if (!displayMap || !tagCleanerDisplayRequested(cfg, displayMap)) return s;
  s = s.replace(
    /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u02E3]+)(?=$|[\s,;.!?()\[\]{}])/g,
    function(all, prefix, name, suffix) {
      return prefix + formatTagCleanerDisplayName(name, displayMap, cfg) + suffix;
    }
  );
  return applyTagCleanerEmojiDisplayInLine(s, displayMap, cfg);
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
    if (isTagCleanerEmptyTemplateValue(m[2])) return "";
    if (isTagCleanerNumberValue(normalizeTagCleanerStringValue(m[2]))) {
      return m[1] + tagCleanerSuperscript(normalizeTagCleanerStringValue(m[2]), positiveSignMode);
    }
    return m[1] + ":: " + normalizeTagCleanerStringValue(m[2]);
  }
  m = s.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:\s*(.+)$/);
  if (m) {
    if (isTagCleanerEmptyTemplateValue(m[2])) return "";
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
  var inTemplateSlot = false;
  var i;
  var ch;
  var isSeparator;

  function hasClosingTemplateSlot(startIndex) {
    var next = s.indexOf("_", startIndex + 1);
    var inner;
    if (next < 0) return false;
    inner = s.substring(startIndex + 1, next);
    if (/\r|\n/.test(inner)) return false;
    if (/(^|[\s,;])#?[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*\s*(?:::|:|#)/.test(inner)) return false;
    return true;
  }

  for (i = 0; i < s.length; i++) {
    ch = s.charAt(i);
    if (ch === "'" && !inDouble && !inTemplateSlot) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inTemplateSlot) inDouble = !inDouble;
    else if (ch === "_" && !inSingle && !inDouble) {
      if (inTemplateSlot) {
        inTemplateSlot = false;
      } else if (/(?:::|:|#)\s*$/.test(token) && hasClosingTemplateSlot(i)) {
        inTemplateSlot = true;
      }
    }

    isSeparator = /\s/.test(ch) || (ch === "," && !(/\d/.test(s.charAt(i - 1)) && /\d/.test(s.charAt(i + 1))));
    if (isSeparator && !inSingle && !inDouble && !inTemplateSlot) {
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

function extractTagCleanerMarkedTagsFromLine(line) {
  var s = String(line || "");
  var state = buildAtagLibQuoteState(s);
  var rx = /(^|[\s,;.!?()\[\]{}])(?:##([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,;.!?()\[\]{}])|([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)##("[^"]*"|'[^']*'|[+\-]?\d+(?:[.,]\d+)?|\++|-+|[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)?(?=$|[\s,;.!?()\[\]{}]))/g;
  var out = [];
  var tags = [];
  var last = 0;
  var m;
  var start;
  var prefix;
  var clean;
  var base;
  var rawValue;

  while ((m = rx.exec(s)) !== null) {
    prefix = m[1] || "";
    start = m.index + prefix.length;

    if (!isInsideAtagLibQuoteState(state, start)) {
      if (m[2]) {
        clean = cleanTagCleanerMarkedTagName(m[2]);
      } else {
        base = cleanTagCleanerMarkedTagName(m[3] || "");
        rawValue = m[4] || "";
        clean = base ? base + (rawValue ? ":" + rawValue : "") : "";
      }
      if (clean) {
        tags.push(clean);
        out.push(s.substring(last, m.index));
        if (prefix && !/^[,;.!?]$/.test(prefix)) out.push(prefix);
        last = rx.lastIndex;
      }
    }

    if (m[0] === "") rx.lastIndex++;
  }

  out.push(s.substring(last));
  return {
    text: compactTagCleanerTextSpaces(out.join("")),
    tags: tags
  };
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

function cleanTagCleanerInlineLine(line, positiveSignMode, displayMap, cfg) {
  var s = String(line || "");
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
  return applyTagCleanerDisplayInLine(
    normalizeStandaloneTagCleanerSuperscriptsInLine(normalizeTagCleanerDoubleColonSpacingInLine(out.join(""))),
    displayMap,
    cfg
  );
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
  var hasTimestampLine = false;
  var spacingLines = tagCleanerSpacingLines(tagBarSpacing);
  var singleBarExclusive = cfg.singleBarExclusive !== false && cfg.emptyBarExclusive !== false;
  var exclusiveTagBar = false;
  var hasTagBarLine = false;
  var tagBar;
  var marked;
  var displayMap = buildTagCleanerAliasDisplayMap(cfg.aliasText || "");

  function addBarToken(raw) {
    cleaned = cleanTagCleanerToken(raw, true, positiveSignMode);
    cleaned = applyTagCleanerDisplayToToken(cleaned, displayMap, cfg);
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
      marked = extractTagCleanerMarkedTagsFromLine(removeTagCleanerFormatValueDirectives(tagBar.text || ""));
      line = marked.text;
      for (j = 0; j < marked.tags.length; j++) addBarToken(marked.tags[j]);
      parts = splitTagCleanerBarTokens(line);
      for (j = 0; j < parts.length; j++) addBarToken(parts[j]);
      continue;
    }

    if (isTagCleanerFormatValueDirectiveLine(line)) {
      formatModeFromLine = extractTagCleanerFormatValueMode(line);
      if (formatModeFromLine != null) addBarToken("fv:" + formatModeFromLine);
      continue;
    }

    if (/^\s*@@/.test(line) || /^[^\[(:(]+?(?:\s*\(\s*([^)]+)\s*\))?\s*\[\s*[^\]]+\s*\]\s*:/.test(line)) {
      body.push(line);
      continue;
    }

    if (exclusiveTagBar) {
      body.push(line);
    } else {
      marked = extractTagCleanerMarkedTagsFromLine(line);
      for (j = 0; j < marked.tags.length; j++) addBarToken(marked.tags[j]);
      body.push(cleanTagCleanerInlineLine(marked.text, positiveSignMode, displayMap, cfg));
    }
  }

  while (body.length && trimAtagLibString(body[body.length - 1]) === "") body.pop();
  if (cfg.sortRows !== false) body = sortTagCleanerPreparedRows(body);
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
  return body.join("\n");
}

function isTagCleanerTemplateSlotLine(line, cfg) {
  var marker = cfg && cfg.templateSlotMarker != null ? String(cfg.templateSlotMarker) : "_";
  var escaped = marker.replace(/([\\^$.*+?()[\]{}|])/g, "\\$1");
  var re = new RegExp("^#?[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\\-]*\\s*(?:::|:|#)\\s*" + escaped + "{1,2}\\s*$");
  var parts = String(line || "").split(/\s*[;,]\s*/);
  var i;
  var part;

  for (i = 0; i < parts.length; i++) {
    part = trimAtagLibString(parts[i] || "");
    if (!part) continue;
    if (!re.test(part)) return false;
  }

  return trimAtagLibString(line) !== "";
}

function tagCleanerTemplateSlotKey(line, cfg) {
  var marker = cfg && cfg.templateSlotMarker != null ? String(cfg.templateSlotMarker) : "_";
  var escaped = marker.replace(/([\\^$.*+?()[\]{}|])/g, "\\$1");
  var re = new RegExp("^#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\\-]*)\\s*(?:::|:|#)\\s*" + escaped + "{1,2}\\s*$");
  var parts = String(line || "").split(/\s*[;,]\s*/);
  var keys = [];
  var i;
  var part;
  var m;

  for (i = 0; i < parts.length; i++) {
    part = trimAtagLibString(parts[i] || "");
    if (!part) continue;
    m = part.match(re);
    if (!m) return "";
    keys.push(String(m[1] || "").toLowerCase());
  }

  return keys.length ? keys.join(";") : "";
}

function tagCleanerPreparedRowValue(line) {
  var m = String(line || "").match(/^\s*(\d+(?:[.,]\d+)?)\s*:/);
  if (!m) return null;
  return Number(String(m[1]).replace(",", "."));
}

function sortTagCleanerPreparedRows(lines) {
  var out = [];
  var rows = [];
  var i;
  var value;

  function flushRows() {
    var j;
    rows.sort(function(a, b) {
      if (a.value !== b.value) return a.value - b.value;
      return a.index - b.index;
    });
    for (j = 0; j < rows.length; j++) out.push(rows[j].line);
    rows = [];
  }

  for (i = 0; i < lines.length; i++) {
    value = tagCleanerPreparedRowValue(lines[i]);
    if (value == null || isNaN(value)) {
      flushRows();
      out.push(lines[i]);
    } else {
      rows.push({ value: value, index: i, line: lines[i] });
    }
  }

  flushRows();
  return out;
}

function clearTagCleanerTemplateSlots(line, cfg) {
  var marker = cfg && cfg.templateSlotMarker != null ? String(cfg.templateSlotMarker) : "_";
  var escaped = marker.replace(/([\\^$.*+?()[\]{}|])/g, "\\$1");
  var slot = new RegExp("((?:::|:|#)\\s*)" + escaped + "[^" + escaped + "\\r\\n]*" + escaped, "g");

  return String(line || "").replace(slot, "$1" + marker + marker);
}

function compactTagCleanerTemplateText(sourceText, cfg) {
  cfg = cfg || {};

  var lines = splitTagCleanerLines(sourceText);
  var out = [];
  var removeRowPrefix = cfg.removeRowPrefix !== false;
  var clearTemplateSlots = cfg.clearTemplateSlots !== false;
  var sortRows = cfg.sortRows === true;
  var i;
  var line;
  var row;
  var content;
  var cleanedContent;
  var cleanedLine;
  var templateKey;
  var seenTemplateKeys = {};

  function pushPreparedLine(preparedLine) {
    if (isTagCleanerTemplateSlotLine(preparedLine, cfg)) {
      templateKey = tagCleanerTemplateSlotKey(preparedLine, cfg);
      if (templateKey) {
        if (seenTemplateKeys[templateKey]) return;
        seenTemplateKeys[templateKey] = 1;
      }
    }
    out.push(preparedLine);
  }

  for (i = 0; i < lines.length; i++) {
    line = String(lines[i] || "");
    row = splitTagCleanerTimestampLine(line);
    content = row ? row.content : trimAtagLibString(line);
    cleanedContent = clearTemplateSlots ? clearTagCleanerTemplateSlots(content, cfg) : content;

    if (row && !content) continue;
    if (row && removeRowPrefix && isTagCleanerTemplateSlotLine(cleanedContent, cfg)) {
      pushPreparedLine(cleanedContent);
      continue;
    }
    if (row && removeRowPrefix && cfg.removeAllRowPrefixes === true) {
      pushPreparedLine(cleanedContent);
      continue;
    }
    if (row) {
      pushPreparedLine(row.indent + row.label + row.separator + cleanedContent);
      continue;
    }

    cleanedLine = clearTemplateSlots ? clearTagCleanerTemplateSlots(line, cfg) : line;
    pushPreparedLine(cleanedLine);
  }

  if (sortRows) out = sortTagCleanerPreparedRows(out);
  return out.join("\n");
}

function prepareTagCleanerTemplateText(sourceText, cfg) {
  return compactTagCleanerTemplateText(sourceText, cfg);
}

function applyTagCleaner(cfg) {
  cfg = cfg || {};
  if (cfg.enabled === false) return "";

  var entryObj = cfg.entryObj || (typeof entry === "function" ? entry() : null);
  var sourceField = cfg.sourceTextField || cfg.textField;
  var targetField = cfg.targetTextField || sourceField;
  var fields = cfg.fields;
  var sourceText;
  var out;
  var aliasParts;
  var aliasFields;
  var i;
  var results;
  var fieldCfg;
  var key;

  if (fields && Object.prototype.toString.call(fields) !== "[object Array]") fields = [fields];
  if (fields && fields.length) {
    results = {};
    for (i = 0; i < fields.length; i++) {
      if (!fields[i]) continue;
      fieldCfg = {};
      for (key in cfg) {
        if (cfg.hasOwnProperty(key) && key !== "fields" && key !== "sourceTextField" && key !== "targetTextField" && key !== "textField") {
          fieldCfg[key] = cfg[key];
        }
      }
      fieldCfg.entryObj = entryObj;
      fieldCfg.textField = fields[i];
      results[fields[i]] = applyTagCleaner(fieldCfg);
    }
    return results;
  }

  if (!entryObj || !sourceField || !targetField) return "";

  if (cfg.aliasText == null && cfg.aliasTextFields == null) cfg.aliasTextFields = ["Alias"];

  if (cfg.aliasText == null && cfg.aliasTextFields) {
    aliasParts = [];
    aliasFields = Object.prototype.toString.call(cfg.aliasTextFields) === "[object Array]" ? cfg.aliasTextFields : [cfg.aliasTextFields];
    for (i = 0; i < aliasFields.length; i++) {
      if (!aliasFields[i]) continue;
      aliasParts.push(entryObj.field(aliasFields[i]) == null ? "" : String(entryObj.field(aliasFields[i])));
    }
    cfg.aliasText = aliasParts.join("\n");
  }

  sourceText = entryObj.field(sourceField);
  out = makeTagCleanerTextWithOptions(sourceText == null ? "" : String(sourceText), cfg);
  entryObj.set(targetField, out);
  return out;
}

function applyTagCleanerTemplatePrep(cfg) {
  cfg = cfg || {};
  if (cfg.enabled === false) return "";

  var entryObj = cfg.entryObj || (typeof entry === "function" ? entry() : null);
  var sourceField = cfg.sourceTextField || cfg.textField;
  var targetField = cfg.targetTextField || sourceField;
  var fields = cfg.fields;
  var sourceText;
  var out;
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
        if (cfg.hasOwnProperty(key) && key !== "fields" && key !== "sourceTextField" && key !== "targetTextField" && key !== "textField") {
          fieldCfg[key] = cfg[key];
        }
      }
      fieldCfg.entryObj = entryObj;
      fieldCfg.textField = fields[i];
      results[fields[i]] = applyTagCleanerTemplatePrep(fieldCfg);
    }
    return results;
  }

  if (!entryObj || !sourceField || !targetField) return "";
  sourceText = entryObj.field(sourceField);
  out = compactTagCleanerTemplateText(sourceText == null ? "" : String(sourceText), cfg);
  entryObj.set(targetField, out);
  return out;
}

function compactTagCleanerTemplates(cfg) {
  return applyTagCleanerTemplatePrep(cfg);
}

function cleanTemplateTags(cfg) {
  return applyTagCleanerTemplatePrep(cfg);
}

function cleanTemplates(cfg) {
  return cleanTemplateTags(cfg);
}

function applyCleanTags(cfg) {
  cfg = cfg || {};
  if (!cfg.fields && !cfg.textField && !cfg.sourceTextField) cfg.textField = "Notiz";
  return applyTagCleaner(cfg);
}

function cleanTags(cfg) {
  return applyCleanTags(cfg);
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
