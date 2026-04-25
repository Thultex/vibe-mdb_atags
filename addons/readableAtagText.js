/*
========================================
Addon Readable Atag Text v1.24 (sys 2.10)
========================================

Changes
- keep row text on one line
- move compact row tags to `| ...` lines
- move global tags to a final `|| ...` line
- render numeric tag values as superscripts
- support alias short labels from `@@Tag (t): Alias`
- support aliases from separate aliasText/aliasTextFields config
- remove `##tag` and `tag##` markers from visible text
- do not guess alias fields; alias fields must be configured explicitly
- handle double-hash marker removal before single-hash visible parsing
- separate tag type groups with comma-space
- accept an optional collectAtags result for building readable tag lines
- rewrite quoted hash values as visible `name: value`
- consume existing row `|` tag lines instead of duplicating them
- consume existing global `||` tag lines instead of duplicating them on repeated runs
- remove a following comma after `##tag` or `tag##`
- `enabled: false` returns source text without writing
- optional backupTextField stores the original source text once
- indent row pipe lines with two spaces
- `blankLineBetweenRows: "never"` removes existing blank lines

Usage

applyReadableAtagText({
  enabled: true,
  sourceTextField: "Notiz",
  targetTextField: "Notiz lesbar",
  backupTextField: "Notiz Backup",
  result: collectAtagsResult,
  aliasTextFields: ["Alias"],
  rowMode: true,
  blankLineBetweenRows: "tagged"
});

bulkApplyReadableAtagText({
  enabled: true,
  sourceTextField: "Notiz",
  targetTextField: "Notiz",
  backupTextField: "Notiz Backup",
  aliasTextFields: ["Alias"],
  rowMode: true
});

// Or pass aliases directly:
// aliasText: "@@Schlafmangel (SchlM): Schlafmangel, Schlafentzug"

========================================
*/

function readableTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function readableNormalizeTagName(rawName) {
  var s = String(rawName || "");
  s = s.replace(/^\s+|\s+$/g, "");
  s = s.replace(/\s+/g, "_");
  s = s.replace(/^_+|_+$/g, "");
  return s;
}

function readableBuildQuoteState(str) {
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

function readableIsInsideQuote(state, pos) {
  var p = Number(pos);
  if (!state || isNaN(p)) return false;
  if (p < 0) p = 0;
  if (p >= state.length) p = state.length - 1;
  return !!state[p];
}

function readableBuildAliasMap(text) {
  var map = {};
  var lines = String(text || "").split(/\r?\n/);
  var i;
  var line;
  var m;
  var baseName;
  var shortName;
  var rawAliases;
  var parts;
  var j;
  var alias;
  var invert;

  for (i = 0; i < lines.length; i++) {
    line = readableTrim(lines[i]);
    if (!/^@@/.test(line)) continue;

    m = line.match(/^@@([^(:]+?)(?:\s*\(\s*([^)]+)\s*\))?(?::\s*(.*))?$/);
    if (!m) continue;

    baseName = readableNormalizeTagName(m[1]);
    shortName = readableNormalizeTagName(m[2] || "");
    if (!baseName) continue;

    map[baseName.toLowerCase()] = {
      name: baseName,
      shortName: shortName || baseName,
      invert: false
    };

    if (shortName) {
      map[shortName.toLowerCase()] = {
        name: baseName,
        shortName: shortName,
        invert: false
      };
    }

    rawAliases = String(m[3] || "");
    if (
      (rawAliases.charAt(0) === '"' && rawAliases.charAt(rawAliases.length - 1) === '"') ||
      (rawAliases.charAt(0) === "'" && rawAliases.charAt(rawAliases.length - 1) === "'")
    ) {
      rawAliases = rawAliases.substring(1, rawAliases.length - 1);
    }

    parts = rawAliases.split(",");
    for (j = 0; j < parts.length; j++) {
      alias = readableTrim(parts[j]);
      invert = false;
      if (!alias) continue;

      if (alias.charAt(0) === "-") {
        invert = true;
        alias = alias.substring(1);
      }

      alias = readableNormalizeTagName(alias);
      if (!alias) continue;
      if (/[:#"'@]/.test(alias)) continue;

      map[alias.toLowerCase()] = {
        name: baseName,
        shortName: shortName || baseName,
        invert: invert
      };
    }
  }

  return map;
}

function readableResolveAlias(name, aliasMap) {
  var found = aliasMap[String(name || "").toLowerCase()];
  if (found) return found;
  return { name: name, shortName: name, invert: false };
}

function readableNormalizeValue(raw, invert) {
  var s = readableTrim(raw);
  var n;

  if (!s) return { text: "", value: null, kind: "bare" };

  if (/^\++$/.test(s)) {
    n = s.length;
    if (invert) n = -n;
    if (!invert) return { text: s, value: n, kind: "number" };
    return { text: String(n), value: n, kind: "number" };
  }

  if (/^-+$/.test(s)) {
    n = -s.length;
    if (invert) n = -n;
    if (!invert) return { text: s, value: n, kind: "number" };
    return { text: n > 0 ? "+" + n : String(n), value: n, kind: "number" };
  }

  if (/^[+\-]?\d+(?:[.,]\d+)?$/.test(s)) {
    var hadSign = s.charAt(0) === "+" || s.charAt(0) === "-";
    n = Number(s.replace(",", "."));
    if (invert) n = -n;
    if (invert) {
      s = String(n).replace(".", ",");
      if (n > 0) s = "+" + s;
    } else if (!hadSign) {
      s = s.replace("+", "");
    }
    return { text: s, value: n, kind: "number" };
  }

  return { text: s, value: s, kind: "text" };
}

function readableSuperscriptValue(value) {
  var s = String(value || "");
  var out = "";
  var i;
  var ch;

  if (!s) return "\u207F";
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

  return out || "\u207F";
}

function readableDecodeSuperscriptValue(raw) {
  var s = String(raw || "");
  var out = "";
  var i;
  var ch;
  var sign;
  var digits;

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
    else if (ch === "\u207F") return "";
  }

  if (/^[+\-]?0\d+$/.test(out)) {
    sign = "";
    digits = out;
    if (out.charAt(0) === "+" || out.charAt(0) === "-") {
      sign = out.charAt(0);
      digits = out.substring(1);
    }
    out = sign + "0," + digits.substring(1);
  }

  return out;
}

function readableQuoteValue(raw) {
  var s = readableTrim(raw);
  if (
    (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
    (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
  ) {
    s = s.substring(1, s.length - 1);
  }
  return '"' + s.replace(/"/g, '\\"') + '"';
}

function readableValueLiteral(raw) {
  var s = readableTrim(raw);
  if (
    (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
    (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
  ) {
    return readableQuoteValue(s);
  }
  return s;
}

function readableMakeTag(name, raw, aliasMap, forceText) {
  var alias = readableResolveAlias(readableNormalizeTagName(name), aliasMap);
  var label = alias.shortName || alias.name;
  var value = forceText ? { text: readableTrim(raw), kind: "text" } : readableNormalizeValue(raw, alias.invert);
  var displayValue = value.text;

  if (!label) return null;
  if (value.kind === "bare") {
    return { label: label, text: label + readableSuperscriptValue(""), kind: "bare" };
  }
  if (value.kind === "number") {
    return { label: label, text: label + readableSuperscriptValue(displayValue), kind: "number" };
  }
  return { label: label, text: label + ": " + readableQuoteValue(displayValue), kind: "text" };
}

function readableMakeValueTag(name, raw, aliasMap) {
  var alias = readableResolveAlias(readableNormalizeTagName(name), aliasMap);
  var label = alias.shortName || alias.name;
  if (!label) return null;
  return { label: label, text: label + ": " + readableValueLiteral(raw), kind: "text" };
}

function readableMakeTagFromResultItem(item) {
  var label;
  var raw;
  var attrText;

  if (!item || !item.name) return null;

  label = item.displayName || item.name;
  attrText = item.attrText;

  if (attrText == null || attrText === "") {
    return { label: label, text: label + readableSuperscriptValue(""), kind: "bare" };
  }

  if (typeof item.attrValue === "number" && !isNaN(item.attrValue)) {
    raw = item.rawText != null && item.rawText !== "" ? String(item.rawText) : String(attrText);
    if (/^\d+(?:[.,]\d+)?$/.test(raw)) raw = raw.replace("+", "");
    return { label: label, text: label + readableSuperscriptValue(raw), kind: "number" };
  }

  return null;
}

function readableTagKey(tag) {
  return String(tag.kind + "|" + tag.label + "|" + tag.text).toLowerCase();
}

function readableAddTag(tags, tag) {
  var key;
  var i;

  if (!tag) return;
  key = readableTagKey(tag);
  for (i = 0; i < tags.length; i++) {
    if (readableTagKey(tags[i]) === key) return;
  }
  tags.push(tag);
}

function readableCleanBodyText(text) {
  var out = String(text || "");
  out = out.replace(/[ \t]+([,;.!?])/g, "$1");
  out = out.replace(/([,;])([^\s\d])/g, "$1 $2");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/[ \t]+$/g, "");
  return out;
}

function readableSentencePolish(text) {
  var s = readableCleanBodyText(text);
  var first;

  if (s.length <= 50) return s;
  first = s.charAt(0);
  s = first.toUpperCase() + s.substring(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

function readableCollectLine(body, aliasMap, lineKind) {
  var s = String(body || "");
  var quoteState = readableBuildQuoteState(s);
  var replacements = [];
  var tags = [];

  function addReplacement(start, end, visible) {
    replacements.push({ start: start, end: end, visible: visible });
  }

  function addTagMatch(start, end, visible, tag) {
    if (readableIsInsideQuote(quoteState, start)) return;
    readableAddTag(tags, tag);
    addReplacement(start, end, visible);
  }

  function runRegex(rx, handler) {
    var m;
    while ((m = rx.exec(s)) !== null) {
      handler(m);
      if (m[0] === "") rx.lastIndex++;
    }
  }

  function addDoubleHashMarker(start, end, name) {
    if (readableIsInsideQuote(quoteState, start)) return;
    if (s.charAt(end) === ",") end++;
    while (end < s.length && /[ \t]/.test(s.charAt(end))) end++;
    readableAddTag(tags, readableMakeTag(name, "", aliasMap, false));
    addReplacement(start, end, "");
  }

  runRegex(/(^|[\s,;.!?()[\]{}\/])(?:'([^']+)'|"([^"]+)")#(?:'([^']*)'|"([^"]*)"|([^\s;.!?()[\]{}\/]*))?/g, function(m) {
    var delim = m[1] || "";
    var rawName = m[2] != null && m[2] !== "" ? m[2] : (m[3] || "");
    var raw = m[4] != null && m[4] !== "" ? '"' + m[4] + '"' : (m[5] != null && m[5] !== "" ? '"' + m[5] + '"' : (m[6] || ""));
    var start = m.index + delim.length;
    var end = m.index + String(m[0]).length;
    var visible;
    var isNumber;

    if (readableIsInsideQuote(quoteState, start)) return;

    if (/,$/.test(raw) && !/,\d+$/.test(raw)) {
      raw = String(raw).replace(/,+$/g, "");
      end--;
    }

    isNumber = /^[+\-]?\d+(?:[.,]\d+)?$/.test(raw);
    visible = "'" + rawName + "': " + (isNumber ? raw : readableQuoteValue(raw));
    addTagMatch(start, end, visible, isNumber ? readableMakeTag(readableNormalizeTagName(rawName), raw, aliasMap, false) : null);
  });

  runRegex(/(^|[\s,;.!?()[\]{}\/])##([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)(?=$|[\s,;.!?()[\]{}\/])|(^|[\s,;.!?()[\]{}\/])([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)##(?=$|[\s,;.!?()[\]{}\/])/g, function(m) {
    var delim = m[1] || m[3] || "";
    var name = m[2] || m[4] || "";
    var start = m.index + delim.length;
    var end = start + name.length + 2;
    addDoubleHashMarker(start, end, name);
  });

  runRegex(/(^|[\s\n\r])([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)##(?:"([^"]*)"|'([^']*)'|([^\s;!?()[\]{}]+))/g, function(m) {
    var delim = m[1] || "";
    var name = m[2] || "";
    var raw = m[3] != null && m[3] !== "" ? '"' + m[3] + '"' : (m[4] != null && m[4] !== "" ? '"' + m[4] + '"' : (m[5] || ""));
    var start = m.index + delim.length;
    var end = m.index + String(m[0]).length;
    if (/^[,.;:!?]+$/.test(raw)) {
      end -= String(raw).length;
      addDoubleHashMarker(start, end, name);
      return;
    }
    if (/,$/.test(raw) && !/,\d+$/.test(raw)) {
      raw = String(raw).replace(/,+$/g, "");
      end--;
    }
    var visible = lineKind === "global" ? "" : name;
    if (lineKind !== "global") visible = "";
    while (end < s.length && /[ \t]/.test(s.charAt(end))) end++;
    addTagMatch(start, end, visible, readableMakeValueTag(name, raw, aliasMap));
  });

  runRegex(/(^|[\s\n\r])([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)#(?:"([^"]*)"|'([^']*)'|([^\s#;!?()[\]{}]+))/g, function(m) {
    var delim = m[1] || "";
    var name = m[2] || "";
    var raw = m[3] != null && m[3] !== "" ? m[3] : (m[4] != null && m[4] !== "" ? m[4] : (m[5] || ""));
    var start = m.index + delim.length;
    var end = m.index + String(m[0]).length;
    if (/,$/.test(raw) && !/,\d+$/.test(raw)) {
      raw = String(raw).replace(/,+$/g, "");
      end--;
    }
    var isNumber = /^[+\-]?\d+(?:[.,]\d+)?$/.test(raw);
    var visible = isNumber ? name : name + ": " + readableQuoteValue(raw);
    addTagMatch(start, end, visible, isNumber ? readableMakeTag(name, raw, aliasMap, false) : null);
  });

  runRegex(/(^|[\s,;.!?()[\]{}])#([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)(?=:|$|[\s,;.!?()[\]{}])|(^|[\s,;.!?()[\]{}])([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)#(?=$|[\s,;.!?()[\]{}])/g, function(m) {
    var delim = m[1] || m[3] || "";
    var name = m[2] || m[4] || "";
    var start = m.index + delim.length;
    var end = start + name.length + 1;
    var visible = name + (String(s.charAt(end)) === ":" ? ":" : "");
    if (String(s.charAt(end)) === ":") end++;
    addTagMatch(start, end, visible, readableMakeTag(name, "", aliasMap, false));
  });

  runRegex(/(^|[\s,;.!?()[\]{}\/])([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)([+\-]?\d+(?:[.,]\d+)?|\++|-+)(?=$|[\s,;.!?()[\]{}\/])/g, function(m) {
    var delim = m[1] || "";
    var name = m[2] || "";
    var raw = m[3] || "";
    var start = m.index + delim.length;
    var end = start + name.length + raw.length;

    if (/^\d+[.,]\d+$/.test(raw)) return;
    addTagMatch(start, end, name, readableMakeTag(name, raw, aliasMap, false));
  });

  if (lineKind === "global") {
    runRegex(/(^|[\s,;])#?([^\s#:,;.!?()[\]{}'"|+\-\/0-9][^\s#:,;.!?()[\]{}'"|+\-\/]*)\s*:\s*(?:"([^"]*)"|([^\s,;]+))?/g, function(m) {
      var delim = m[1] || "";
      var name = m[2] || "";
      var raw = m[3] != null && m[3] !== "" ? m[3] : (m[4] || "");
      var start = m.index + delim.length;
      var end = start + name.length + String(m[0]).length - delim.length - name.length;
      var visible = name + ":";
      if (raw) visible += " " + raw;
      if (/^\d+(?:[.,]\d+)?$/.test(raw)) raw = "+" + raw;
      addTagMatch(start, end, visible, raw ? readableMakeTag(name, raw, aliasMap, !/^[+\-]?\d+(?:[.,]\d+)?$/.test(raw)) : readableMakeTag(name, "", aliasMap, false));
    });
  }

  replacements.sort(function(a, b) {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });

  var out = [];
  var last = 0;
  var i;
  var r;

  for (i = 0; i < replacements.length; i++) {
    r = replacements[i];
    if (r.start < last) continue;
    out.push(s.substring(last, r.start));
    out.push(r.visible);
    last = r.end;
  }
  out.push(s.substring(last));

  return {
    text: readableCleanBodyText(out.join("")),
    tags: tags
  };
}

function readableKindOrder(kind) {
  if (kind === "number") return 0;
  if (kind === "text") return 1;
  return 2;
}

function readableJoinTags(tags) {
  var groups = [[], [], []];
  var i;
  var g;

  tags.sort(function(a, b) {
    var ak = readableKindOrder(a.kind);
    var bk = readableKindOrder(b.kind);
    var al;
    var bl;
    if (ak !== bk) return ak - bk;
    al = String(a.label || "").toLowerCase();
    bl = String(b.label || "").toLowerCase();
    if (al < bl) return -1;
    if (al > bl) return 1;
    return 0;
  });

  for (i = 0; i < tags.length; i++) {
    g = readableKindOrder(tags[i].kind);
    groups[g].push(tags[i].text);
  }

  var out = [];
  for (i = 0; i < groups.length; i++) {
    if (groups[i].length) out.push(groups[i].join(" "));
  }
  return out.join(", ");
}

function readableParseExistingTagLine(tagText, aliasMap) {
  var s = String(tagText || "");
  var parts = s.split(/[\s,]+/);
  var tags = [];
  var i;
  var token;
  var m;
  var name;
  var raw;

  for (i = 0; i < parts.length; i++) {
    token = readableTrim(parts[i]);
    if (!token) continue;

    m = token.match(/^(.+?)([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u207F]+)$/);
    if (m) {
      name = m[1];
      raw = readableDecodeSuperscriptValue(m[2]);
      readableAddTag(tags, readableMakeTag(name, raw, aliasMap, false));
      continue;
    }

    m = token.match(/^(.+?)([+\-]?\d+(?:[.,]\d+)?|\++|-+)$/);
    if (m) {
      name = m[1];
      raw = m[2];
      readableAddTag(tags, readableMakeTag(name, raw, aliasMap, false));
      continue;
    }

    readableAddTag(tags, readableMakeTag(token, "", aliasMap, false));
  }

  return tags;
}

function readableRowParts(line) {
  var m = String(line || "").match(/^\s*([+-]?\d+(?:[.,]\d+)?[A-Za-zÄÖÜäöüß%]*)\s*:\s*(.*)$/);
  if (!m) return null;
  return {
    row: m[1],
    rowValue: Number(String(m[1]).replace(/[A-Za-zÄÖÜäöüß%]+$/g, "").replace(",", ".")),
    rowUnit: String(m[1]).replace(/^[+-]?\d+(?:[.,]\d+)?/g, "") || null,
    body: m[2] || ""
  };
}

function readableShouldBlankAfterRow(cfg, hadTags) {
  var mode = cfg.blankLineBetweenRows;
  if (mode === "never") return false;
  return mode === "always" || mode === true || (mode === "tagged" && hadTags);
}

function readableSameRow(item, row) {
  if (!item || !row) return false;
  if (String(item.rowRaw || "") === String(row.row || "")) return true;
  if (String(item.rowUnit || "") !== String(row.rowUnit || "")) return false;
  return String(item.rowValue) === String(row.rowValue);
}

function readableTagsFromResult(result, row) {
  var items = result && result.items ? result.items : [];
  var tags = [];
  var i;
  var item;
  var tag;

  for (i = 0; i < items.length; i++) {
    item = items[i];

    if (row) {
      if (!readableSameRow(item, row)) continue;
    } else if (item.rowValue != null) {
      continue;
    }

    tag = readableMakeTagFromResultItem(item);
    if (tag) readableAddTag(tags, tag);
  }

  return tags;
}

function makeReadableAtagText(text, cfg) {
  cfg = cfg || {};

  var aliasSource = String(cfg.aliasText || "");
  var aliasMap = readableBuildAliasMap(aliasSource ? aliasSource + "\n" + text : text);
  var lines = String(text || "").split(/\r?\n/);
  var out = [];
  var globalTags = [];
  var result = cfg.result || null;
  var rowMode = cfg.rowMode !== false;
  var plainTextMode = cfg.plainTextMode === true;
  var i;
  var line;
  var row;
  var parsed;
  var pendingSeparator = false;
  var existingRowTagLine;
  var existingRowTags;
  var existingMatch;
  var existingGlobalTags = [];
  var existingGlobalLine = "";
  var hasExistingGlobalLine = false;

  function pushRowSeparatorIfNeeded() {
    if (pendingSeparator) {
      out.push("");
      pendingSeparator = false;
    }
  }

  for (i = 0; i < lines.length; i++) {
    if (/^\s*\|\|\s*(.+)$/.test(String(lines[i] || ""))) {
      hasExistingGlobalLine = true;
      break;
    }
  }

  if (plainTextMode && !rowMode) {
    parsed = readableCollectLine(text, aliasMap, "row");
    var plainTags = result ? readableTagsFromResult(result, null) : parsed.tags;
    if (!plainTags.length) return readableSentencePolish(parsed.text);
    return readableSentencePolish(parsed.text) + "\n  | " + readableJoinTags(plainTags);
  }

  for (i = 0; i < lines.length; i++) {
    line = String(lines[i] || "");

    if (/^\s*---\s*$/.test(line)) break;

    existingMatch = line.match(/^\s*\|\|\s*(.+)$/);
    if (existingMatch) {
      if (!existingGlobalLine) existingGlobalLine = existingMatch[1] || "";
      if (!result && !existingGlobalLine) {
        existingGlobalTags = existingGlobalTags.concat(readableParseExistingTagLine(existingMatch[1] || "", aliasMap));
      }
      continue;
    }

    if (readableTrim(line) === "" && cfg.blankLineBetweenRows === "never") {
      continue;
    }

    if (/^\s*@@/.test(line) || /^\s*\|\s*[^|]/.test(line) || readableTrim(line) === "") {
      pushRowSeparatorIfNeeded();
      out.push(line);
      continue;
    }

    row = readableRowParts(line);
    if (rowMode && row) {
      pushRowSeparatorIfNeeded();
      parsed = readableCollectLine(row.body, aliasMap, "row");
      existingRowTagLine = null;
      existingRowTags = [];

      if (i + 1 < lines.length) {
        existingMatch = String(lines[i + 1] || "").match(/^\s*\|\s*([^|].*)$/);
        if (existingMatch) {
          existingRowTagLine = existingMatch[1] || "";
          existingRowTags = readableParseExistingTagLine(existingRowTagLine, aliasMap);
          i++;
        }
      }

      var rowTags = result ? readableTagsFromResult(result, row) : (parsed.tags.length ? parsed.tags : existingRowTags);
      out.push(row.row + ": " + readableSentencePolish(parsed.text));
      if (rowTags.length) out.push("  | " + readableJoinTags(rowTags));
      if (readableShouldBlankAfterRow(cfg, rowTags.length > 0)) pendingSeparator = true;
      continue;
    }

    parsed = readableCollectLine(line, aliasMap, "global");
    if (!result && !hasExistingGlobalLine) {
      for (var ti = 0; ti < parsed.tags.length; ti++) readableAddTag(globalTags, parsed.tags[ti]);
    }
    if (readableTrim(parsed.text)) {
      pushRowSeparatorIfNeeded();
      out.push(readableSentencePolish(parsed.text));
    }
  }

  if (result) globalTags = readableTagsFromResult(result, null);
  else if (existingGlobalLine) {
    if (out.length && readableTrim(out[out.length - 1]) !== "") out.push("");
    out.push("|| " + existingGlobalLine);
    return out.join("\n").replace(/\n{4,}/g, "\n\n\n");
  }
  else if (!globalTags.length && existingGlobalTags.length) globalTags = existingGlobalTags;

  if (globalTags.length) {
    if (out.length && readableTrim(out[out.length - 1]) !== "") out.push("");
    out.push("|| " + readableJoinTags(globalTags));
  }

  return out.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

function applyReadableAtagText(cfg) {
  cfg = cfg || {};

  var entryObj = cfg.entryObj || entry();
  var sourceTextField = cfg.sourceTextField;
  var targetTextField = cfg.targetTextField || sourceTextField;

  if (!entryObj || !sourceTextField || !targetTextField) return "";

  var sourceText = entryObj.field(sourceTextField);
  if (cfg.enabled === false) return sourceText == null ? "" : String(sourceText);

  if (cfg.backupTextField) {
    var backupValue = entryObj.field(cfg.backupTextField);
    if (readableTrim(backupValue) === "") {
      entryObj.set(cfg.backupTextField, sourceText == null ? "" : String(sourceText));
    }
  }

  var aliasText = String(cfg.aliasText || "");
  var aliasFields = cfg.aliasTextFields || [];
  var i;

  for (i = 0; i < aliasFields.length; i++) {
    if (aliasFields[i] === sourceTextField) continue;
    aliasText += "\n" + String(entryObj.field(aliasFields[i]) || "");
  }

  if (aliasText) cfg.aliasText = aliasText;

  var out = makeReadableAtagText(sourceText, cfg);

  entryObj.set(targetTextField, out);
  return out;
}

function bulkApplyReadableAtagText(cfg) {
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
    results.push(applyReadableAtagText(bulkCfg));
  }

  return results;
}
