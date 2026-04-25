/*
========================================
collectAtags v1.32 (sys 2.10)
========================================

Changes
- superscript value suffixes like `emo⁺²` and `tag⁻⁰³` are parsed in normal text
- alias definitions can declare a short tag, e.g. `@@Kopfschmerz (ks): Kopfschmerzen`
- readable tag lines like `| Angst-2 Gutn` with superscript values are parsed in row context
- global readable tag lines like `|| tag: 1 info: "text"` are parsed without row context
- alias declarations can omit the alias list, e.g. `@@Wirkung (Wk)`
- parsed items keep alias short display names for exports
- quoted hash tags can carry values, e.g. `"tag name"#4,1`
- precompute quote state per parsed line and expose small quote helpers for text rewrites
- alias definitions allow a trailing dot on the base tag and preserve it for export, e.g. `@@tag.: ...`
- keep parser behavior close to the old version
- explicit tags only for simple tag detection
- alias replacement only in real tag contexts
- inverse aliases supported for numeric values
- decimal values still supported
- row system stays active

========================================
*/

function buildAtagQuoteState(str) {
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

function isInsideAtagQuoteState(state, pos) {
  var p = Number(pos);

  if (!state || isNaN(p)) return false;
  if (p < 0) p = 0;
  if (p >= state.length) p = state.length - 1;

  return !!state[p];
}

// ===== CORE =====
function collectAtags(cfg) {
  var entryObj = cfg.entryObj || entry();
  if (!entryObj) return { items: [] };

  var textFields = cfg.textFields || [];
  var excludeNames = cfg.excludeNames || [];

  function isReservedSystemName(name) {
    var s = String(name || "").toLowerCase();
    return (
      s === "http" ||
      s === "https" ||
      s === "ftp" ||
      s === "file" ||
      s === "mailto" ||
      s === "tel" ||
      s === "www" ||
      s === "link" ||
      s === "email" ||
      s === "mail"
    );
  }

  function isExcluded(name) {
    var n = String(name || "").toLowerCase();
    if (isReservedSystemName(n)) return true;

    for (var i = 0; i < excludeNames.length; i++) {
      if (String(excludeNames[i]).toLowerCase() === n) return true;
    }
    return false;
  }

  function normalizeTagName(rawName) {
    var s = String(rawName || "");
    s = s.replace(/^\s+|\s+$/g, "");
    s = s.replace(/\s+/g, "_");
    s = s.replace(/^_+|_+$/g, "");
    return s;
  }

  function normalizeAttr(attrRaw) {
    if (attrRaw == null || attrRaw === "") {
      return { attrText: null, attrValue: null };
    }

    var s = String(attrRaw).replace(/^\s+|\s+$/g, "");
    var sNum = s.replace(",", ".");

    if (/^\d+$/.test(s)) {
      return { attrText: "+" + s, attrValue: Number(s) };
    }

    if (/^\+\d+$/.test(s) || /^-\d+$/.test(s)) {
      return { attrText: s, attrValue: Number(s) };
    }

    if (/^\+\d+[.,]\d+$/.test(s) || /^-\d+[.,]\d+$/.test(s)) {
      return { attrText: s, attrValue: Number(sNum) };
    }

    if (/^\d+[.,]\d+$/.test(s)) {
      return { attrText: s, attrValue: Number(sNum) };
    }

    if (/^\++$/.test(s)) {
      return { attrText: "+" + s.length, attrValue: s.length };
    }

    if (/^-+$/.test(s)) {
      return { attrText: String(-s.length), attrValue: -s.length };
    }

    return { attrText: s, attrValue: s };
  }

  function invertNormalizedAttr(norm) {
    if (!norm || typeof norm.attrValue !== "number" || isNaN(norm.attrValue)) {
      return norm;
    }

    var n = -norm.attrValue;
    var text;

    if (n === 0) {
      text = "0";
    } else {
      text = String(n).replace(".", ",");
      if (n > 0) text = "+" + text;
    }

    return {
      attrText: text,
      attrValue: n
    };
  }

  function addItem(items, seen, name, attrText, attrValue, rawText, rowValue, rowUnit, rowRaw, displayName) {
    var key = String(name).toLowerCase() +
      "|" + String(attrText) +
      "|" + String(rowValue) +
      "|" + String(rowUnit);

    if (seen[key]) return;
    seen[key] = true;

    items.push({
      name: name,
      attrText: attrText,
      attrValue: attrValue,
      rawText: rawText,
      rowValue: rowValue != null ? rowValue : null,
      rowUnit: rowUnit != null ? rowUnit : null,
      rowRaw: rowRaw != null ? rowRaw : null,
      displayName: displayName || name
    });
  }

  function buildAliasMapLegacy(text) {
    var map = {};
    var lines = String(text || "").split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = String(lines[i] || "").replace(/^\s+|\s+$/g, "");
      if (!/^@@/.test(line)) continue;

      var m = line.match(/^@@([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*\.?)\s*:\s*(.+)$/);
      if (!m) continue;

      var baseName = normalizeTagName(m[1]);
      if (!baseName) continue;
      if (isExcluded(baseName)) continue;

      var rawAliases = String(m[2] || "");
      if (
        (rawAliases.charAt(0) === '"' && rawAliases.charAt(rawAliases.length - 1) === '"') ||
        (rawAliases.charAt(0) === "'" && rawAliases.charAt(rawAliases.length - 1) === "'")
      ) {
        rawAliases = rawAliases.substring(1, rawAliases.length - 1);
      }

      var parts = rawAliases.split(",");

      for (var j = 0; j < parts.length; j++) {
        var alias = String(parts[j] || "").replace(/^\s+|\s+$/g, "");
        var invert = false;

        if (!alias) continue;

        if (alias.charAt(0) === "-") {
          invert = true;
          alias = alias.substring(1);
        }

        if (!alias) continue;
        if (/[:#"'@]/.test(alias)) continue;
        if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(alias)) continue;

        map[alias.toLowerCase()] = {
          name: baseName,
          invert: invert
        };
      }
    }

    return map;
  }

  function buildAliasMap(text) {
    var map = {};
    var lines = String(text || "").split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = String(lines[i] || "").replace(/^\s+|\s+$/g, "");
      if (!/^@@/.test(line)) continue;

      var m = line.match(/^@@([^(:]+?)(?:\s*\(\s*([^)]+)\s*\))?(?::\s*(.*))?$/);
      if (!m) continue;

      var baseName = normalizeTagName(m[1]);
      var shortName = normalizeTagName(m[2] || "");
      if (!baseName) continue;
      if (isExcluded(baseName)) continue;

      map[baseName.toLowerCase()] = {
        name: baseName,
        shortName: shortName || baseName,
        invert: false
      };

      if (shortName && !isExcluded(shortName)) {
        map[shortName.toLowerCase()] = {
          name: baseName,
          shortName: shortName,
          invert: false
        };
      }

      var rawAliases = String(m[3] || "");
      if (
        (rawAliases.charAt(0) === '"' && rawAliases.charAt(rawAliases.length - 1) === '"') ||
        (rawAliases.charAt(0) === "'" && rawAliases.charAt(rawAliases.length - 1) === "'")
      ) {
        rawAliases = rawAliases.substring(1, rawAliases.length - 1);
      }

      var parts = rawAliases.split(",");

      for (var j = 0; j < parts.length; j++) {
        var alias = String(parts[j] || "").replace(/^\s+|\s+$/g, "");
        var invert = false;

        if (!alias) continue;

        if (alias.charAt(0) === "-") {
          invert = true;
          alias = alias.substring(1);
        }

        if (!alias) continue;
        if (/[:#"'@]/.test(alias)) continue;
        if (!/^[A-Za-zÃ„Ã–ÃœÃ¤Ã¶Ã¼ÃŸ_][A-Za-zÃ„Ã–ÃœÃ¤Ã¶Ã¼ÃŸ0-9_\-]*$/.test(alias)) continue;

        map[alias.toLowerCase()] = {
          name: baseName,
          shortName: shortName || baseName,
          invert: invert
        };
      }
    }

    return map;
  }

  function resolveAlias(name, aliasMap) {
    var key = String(name || "").toLowerCase();
    var aliasInfo = aliasMap[key];

    if (!aliasInfo) {
      return {
        name: name,
        shortName: name,
        invert: false
      };
    }

    return aliasInfo;
  }

  function decodeReadableSuperscript(raw) {
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

  function addReadableTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw) {
    var aliasInfo = resolveAlias(name, aliasMap);
    var resolvedName = aliasInfo.name;
    var norm;

    if (!resolvedName || isExcluded(resolvedName)) return;

    norm = normalizeAttr(raw);
    if (aliasInfo.invert) norm = invertNormalizedAttr(norm);

    addItem(
      items, seen,
      resolvedName,
      norm.attrText, norm.attrValue, raw,
      rowValue, rowUnit, rowRaw,
      aliasInfo.shortName || resolvedName
    );
  }

  function addReadableTagLineItems(tagText, items, seen, aliasMap, rowValue, rowUnit, rowRaw) {
    var s = String(tagText || "");
    var used = [];
    var rxColon = /(^|\s+)([^\s:|][^:\s|]*)\s*:\s*(?:"([^"]*)"|([^\s]+))/g;
    var rxSuper = /([^\s:|]+?)([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u207F]+)(?=$|\s+)/g;
    var m;
    var name;
    var raw;

    function mark(start, end) {
      used.push({ start: start, end: end });
    }

    function isUsed(pos) {
      var u;
      for (u = 0; u < used.length; u++) {
        if (pos >= used[u].start && pos < used[u].end) return true;
      }
      return false;
    }

    while ((m = rxColon.exec(s)) !== null) {
      name = normalizeTagName(m[2] || "");
      raw = m[3] != null && m[3] !== "" ? m[3] : (m[4] || "");
      addReadableTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw);
      mark(m.index, m.index + String(m[0]).length);
      if (m[0] === "") rxColon.lastIndex++;
    }

    while ((m = rxSuper.exec(s)) !== null) {
      if (isUsed(m.index)) {
        if (m[0] === "") rxSuper.lastIndex++;
        continue;
      }

      name = normalizeTagName(m[1] || "");
      raw = decodeReadableSuperscript(m[2] || "");
      addReadableTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw);
      if (m[0] === "") rxSuper.lastIndex++;
    }
  }

  function detectRowPrefix(line) {
    var m = String(line || "").match(/^\s*([+-]?\d+(?:[.,]\d+)?)([A-Za-zÄÖÜäöüß%]*)\s*:\s*(.*)$/);
    if (!m) return null;

    return {
      rowValue: Number(String(m[1]).replace(",", ".")),
      rowUnit: m[2] || null,
      rowRaw: m[1] + (m[2] || ""),
      rest: m[3] || ""
    };
  }

  var items = [];
  var seen = {};
  var cachedTexts = [];
  var fullText = [];
  var li;

  for (li = 0; li < textFields.length; li++) {
    var tv = entryObj.field(textFields[li]);
    var strVal = tv == null ? "" : String(tv);

    cachedTexts.push(strVal);
    if (strVal) fullText.push(strVal);
  }

  var joinedText = fullText.join("\n");
  var aliasMap = buildAliasMap(joinedText);

  for (li = 0; li < cachedTexts.length; li++) {
    var str = cachedTexts[li];
    if (!str) continue;

    var lines = str.split(/\r?\n/);
    var lastRowValue = null;
    var lastRowUnit = null;
    var lastRowRaw = null;

    for (var ln = 0; ln < lines.length; ln++) {
      var line = String(lines[ln] || "");
      var rowCtx = detectRowPrefix(line);
      var readableGlobalLine = line.match(/^\s*\|\|\s*(.+)$/);
      var readableRowLine = line.match(/^\s*\|\s*([^|].*)$/);

      if (readableGlobalLine) {
        addReadableTagLineItems(
          readableGlobalLine[1],
          items, seen, aliasMap,
          null, null, null
        );
        continue;
      }

      if (readableRowLine) {
        addReadableTagLineItems(
          readableRowLine[1],
          items, seen, aliasMap,
          lastRowValue, lastRowUnit, lastRowRaw
        );
        continue;
      }

      var currentRowValue = null;
      var currentRowUnit = null;
      var currentRowRaw = null;
      var parseLine = line;
      var quoteState;

      if (rowCtx) {
        currentRowValue = rowCtx.rowValue;
        currentRowUnit = rowCtx.rowUnit;
        currentRowRaw = rowCtx.rowRaw;
        parseLine = rowCtx.rest;
        lastRowValue = currentRowValue;
        lastRowUnit = currentRowUnit;
        lastRowRaw = currentRowRaw;
      }

      quoteState = buildAtagQuoteState(parseLine);

      // quoted tag: 'Four Tops'# / "Four Tops"#4,1 / 'Four Tops'#'text value'
      var rxQuotedTag = /(^|[\s,;.!?()\[\]{}\n\r])(?:'([^']+)'|"([^"]+)")#(?:'([^']*)'|"([^"]*)"|([^\s;.!?()\[\]{}]*))?/g;
      var mq;
      while ((mq = rxQuotedTag.exec(parseLine)) !== null) {
        var rawQuotedName = mq[2] != null && mq[2] !== "" ? mq[2] : (mq[3] || "");
        var rawQuotedAttr = mq[4] != null && mq[4] !== "" ? mq[4] : (mq[5] != null && mq[5] !== "" ? mq[5] : (mq[6] || ""));
        rawQuotedName = normalizeTagName(rawQuotedName);
        rawQuotedAttr = String(rawQuotedAttr).replace(/,+$/g, "");
        if (!rawQuotedName) continue;

        var quotedAlias = resolveAlias(rawQuotedName, aliasMap);
        rawQuotedName = quotedAlias.name;

        if (isExcluded(rawQuotedName)) continue;

        var normQuoted = normalizeAttr(rawQuotedAttr);
        if (quotedAlias.invert) normQuoted = invertNormalizedAttr(normQuoted);

        addItem(
          items, seen,
          rawQuotedName,
          normQuoted.attrText, normQuoted.attrValue, rawQuotedAttr,
          currentRowValue, currentRowUnit, currentRowRaw,
          quotedAlias.shortName || rawQuotedName
        );
      }

      // colon: gfk: 1,4
      var rxColon = /(^|[\s\n\r])#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:\s*(?:"([^"]*)"|([^\s,;]+))/g;
      var m1;
      while ((m1 = rxColon.exec(parseLine)) !== null) {
        var name1 = m1[2];
        var raw1 = m1[3] != null && m1[3] !== "" ? m1[3] : (m1[4] || "");
        raw1 = String(raw1).replace(/^\s+|\s+$/g, "");

        if (!name1) continue;
        if (isInsideAtagQuoteState(quoteState, m1.index)) continue;
        if (/^\d+$/.test(name1)) continue;

        var alias1 = resolveAlias(name1, aliasMap);
        name1 = alias1.name;

        if (isExcluded(name1)) continue;
        if (/^\/\//.test(raw1)) continue;

        var norm1 = normalizeAttr(raw1);
        if (alias1.invert) norm1 = invertNormalizedAttr(norm1);

        addItem(
          items, seen,
          name1,
          norm1.attrText,
          norm1.attrValue,
          raw1,
          currentRowValue, currentRowUnit, currentRowRaw,
          alias1.shortName || name1
        );
      }

      // explicit tag with hash and value: test#string / test#5,
      var rxHashValue = /(^|[\s\n\r])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#([^\s]+)/g;
      var mh;
      while ((mh = rxHashValue.exec(parseLine)) !== null) {
        var nameH = mh[2];
        var rawH = mh[3] || "";

        rawH = String(rawH).replace(/,+$/g, "");

        if (!nameH || rawH === "") continue;
        if (isInsideAtagQuoteState(quoteState, mh.index)) continue;

        var aliasH = resolveAlias(nameH, aliasMap);
        nameH = aliasH.name;

        if (isExcluded(nameH)) continue;

        var normH = normalizeAttr(rawH);
        if (aliasH.invert) normH = invertNormalizedAttr(normH);

        addItem(
          items, seen,
          nameH,
          normH.attrText,
          normH.attrValue,
          rawH,
          currentRowValue, currentRowUnit, currentRowRaw,
          aliasH.shortName || nameH
        );
      }

      // name + number: emo3 / emo+1,3 / emo-12,32
      var rxNum = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([+\-]?\d+(?:[.,]\d+)?|\++|-+)(?=$|[\s,;.!?()\[\]{}])/g;
      var mn;
      while ((mn = rxNum.exec(parseLine)) !== null) {
        var nameN = mn[2];
        var rawN = mn[3] || "";
        var fullTokenN = String(mn[0] || "").substring(String(mn[1] || "").length);

        if (!nameN || !rawN) continue;

        // Regex prefers the longest possible tag name, so negative suffixes
        // like "tag-2" or "emo-12,32" can be split incorrectly. Re-split the
        // full token at the final negative numeric suffix.
        if (/^\d+(?:[.,]\d+)?$/.test(rawN)) {
          var negSplit = fullTokenN.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(-\d+(?:[.,]\d+)?)$/);
          if (negSplit && negSplit[1]) {
            nameN = negSplit[1];
            rawN = negSplit[2];
          }
        }

        if (!nameN) continue;

        // emo1,2 without an explicit sign is not allowed
        if (/^\d+[.,]\d+$/.test(rawN)) continue;

        var aliasN = resolveAlias(nameN, aliasMap);
        nameN = aliasN.name;

        if (isExcluded(nameN)) continue;
        if (isInsideAtagQuoteState(quoteState, mn.index)) continue;

        var normN = normalizeAttr(rawN);
        if (aliasN.invert) normN = invertNormalizedAttr(normN);

        addItem(
          items, seen,
          nameN,
          normN.attrText,
          normN.attrValue,
          rawN,
          currentRowValue, currentRowUnit, currentRowRaw,
          aliasN.shortName || nameN
        );
      }

      // name + superscript value: emo⁺² / tag⁻⁰³ / stuff⁺⁺
      var rxSupNum = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u207F]+)(?=$|[\s,;.!?()\[\]{}])/g;
      var msup;
      while ((msup = rxSupNum.exec(parseLine)) !== null) {
        var nameSup = msup[2];
        var rawSup = decodeReadableSuperscript(msup[3] || "");

        if (!nameSup) continue;
        if (isInsideAtagQuoteState(quoteState, msup.index)) continue;

        var aliasSup = resolveAlias(nameSup, aliasMap);
        nameSup = aliasSup.name;

        if (isExcluded(nameSup)) continue;

        var normSup = normalizeAttr(rawSup);
        if (aliasSup.invert) normSup = invertNormalizedAttr(normSup);

        addItem(
          items, seen,
          nameSup,
          normSup.attrText,
          normSup.attrValue,
          rawSup,
          currentRowValue, currentRowUnit, currentRowRaw,
          aliasSup.shortName || nameSup
        );
      }

      // explicit simple tags only: #tag or tag#
      var rxSimpleTag = /(^|[\s,;.!?()\[\]{}])#([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,;.!?()\[\]{}])|(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#(?=$|[\s,;.!?()\[\]{}])/g;
      var ms;
      while ((ms = rxSimpleTag.exec(parseLine)) !== null) {
        var nameS = ms[2] || ms[4] || "";
        if (!nameS) continue;
        if (isInsideAtagQuoteState(quoteState, ms.index)) continue;

        var aliasS = resolveAlias(nameS, aliasMap);
        nameS = aliasS.name;

        if (isExcluded(nameS)) continue;

        addItem(
          items, seen,
          nameS,
          null, null, "",
          currentRowValue, currentRowUnit, currentRowRaw,
          aliasS.shortName || nameS
        );
      }

    }
  }

  return { items: items };
}
