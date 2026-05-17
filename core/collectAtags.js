/*
========================================
A1 collectAtags v1.50 (sys 2.21)
========================================

Changes
- support opt-in multiAliasTargets for one alias token mapping to multiple tags
- parse cumulative +/-, explicit null 00 and zero-decimal forms from issue #38
- ignore template tag values `_` in `tag:_` and `tag:: _`
- alias brackets define categories, e.g. `@@Tag (T)[self, help]: alias`
- category aliases can use `@@@self (sf)`
- category aliases can define fixed children, e.g. `@@@help: ActivityA, ActivityB`
- exclusive readable tag lines parse only tag lines and ignore body tags
- category aliases can invert fixed child values, e.g. `@@@body: -MetricF, MetricG`
- exclude name checks use a per-run lookup map
- local trim helper reduces repeated whitespace-normalization code
- category tags are emitted as list tags containing their occurring member tags
- parsed items keep their categories in `cats`
- alias map is built without an adjacent joinedText var for safer editor copying
- skip alias declaration lines during normal parsing
- add compact, explicit, and inverted text tag syntaxes
- parse bare tags in readable tag lines
- simple tag suffix `x` is parsed as an empty explicit tag
- alias entries can carry fixed values, e.g. `@@SymptomA (SA): sa, SymptomAlias1`
- superscript value suffixes like `emo²` and `tag⁻⁰³` are parsed in normal text
- alias definitions can declare a short tag, e.g. `@@SymptomA (sa): SymptomA`
- readable tag lines like `| MetricF-2 Gutn` with superscript values are parsed in row context
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
  var multiAliasTargets = cfg.multiAliasTargets === true;
  var excludeMap = {};
  var ei;

  for (ei = 0; ei < excludeNames.length; ei++) {
    excludeMap[String(excludeNames[ei]).toLowerCase()] = true;
  }

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
    return !!excludeMap[n];
  }

  function trimAtagString(val) {
    return String(val || "").replace(/^\s+|\s+$/g, "");
  }

  function normalizeTagName(rawName) {
    var s = trimAtagString(rawName);
    s = s.replace(/\s+/g, "_");
    s = s.replace(/^_+|_+$/g, "");
    return s;
  }

  function normalizeAttr(attrRaw) {
    if (attrRaw == null || attrRaw === "") {
      return { attrText: null, attrValue: null };
    }

    var s = trimAtagString(attrRaw);
    var sNum = s.replace(",", ".");
    var m;

    if (s === "00") {
      return { attrText: "00", attrValue: null, cumulative: false };
    }

    m = s.match(/^(\+{2,}|-{2,})(\d*)$/);
    if (m) {
      var signRun = m[1];
      var suffixDigits = m[2] || "";
      var signFactor = signRun.charAt(0) === "+" ? 1 : -1;
      if (!suffixDigits && signRun.length > 2) {
        suffixDigits = String(signRun.length);
        s = signRun.substring(0, 2) + suffixDigits;
      }
      return {
        attrText: s,
        attrValue: suffixDigits ? signFactor * Number(suffixDigits) : signFactor * signRun.length,
        cumulative: true
      };
    }

    if (/^[-+]?0[.,]?\d+$/.test(s)) {
      var sign = "";
      var body = s;
      if (s.charAt(0) === "+" || s.charAt(0) === "-") {
        sign = s.charAt(0);
        body = s.substring(1);
      }
      if (body === "0") {
        return { attrText: sign === "-" ? "-0" : "0", attrValue: 0, cumulative: false };
      }
      body = body.replace(",", ".");
      if (/^0\d+$/.test(body)) body = "0." + body.substring(1);
      return {
        attrText: (sign === "-" ? "-" : "") + body.replace(".", ","),
        attrValue: Number((sign === "-" ? "-" : "") + body),
        cumulative: false
      };
    }

    if (/^[1-9]\d*$/.test(s)) {
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
      return { attrText: s, attrValue: s.length, cumulative: true };
    }

    if (/^-+$/.test(s)) {
      return { attrText: s, attrValue: -s.length, cumulative: true };
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

  function addItem(items, seen, name, attrText, attrValue, rawText, rowValue, rowUnit, rowRaw, displayName, cats, kind, cumulative, categoryChildSigns) {
    var item;
    var key = String(name).toLowerCase() +
      "|" + String(attrText) +
      "|" + String(rowValue) +
      "|" + String(rowUnit);

    if (seen[key]) return;
    seen[key] = true;

    item = {
      name: name,
      attrText: attrText,
      attrValue: attrValue,
      rawText: rawText,
      rowValue: rowValue != null ? rowValue : null,
      rowUnit: rowUnit != null ? rowUnit : null,
      rowRaw: rowRaw != null ? rowRaw : null,
      displayName: displayName || name,
      cats: cats || []
    };

    if (!cumulative && /^([+\-]|\+{2,}\d*|-{2,}\d*)$/.test(String(attrText || ""))) {
      cumulative = true;
    }

    if (kind) {
      item.kind = kind;
      if (kind === "category") item.isCategory = true;
    }
    if (cumulative) item.cumulative = true;
    if (categoryChildSigns) item.categoryChildSigns = categoryChildSigns;

    items.push(item);
  }

  function splitAliasList(raw) {
    var s = String(raw || "");
    var parts;

    if (
      (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
    ) {
      s = s.substring(1, s.length - 1);
    }

    parts = s.split(",");
    return parts;
  }

  function normalizeCategoryList(raw) {
    var parts = splitAliasList(raw);
    var out = [];
    var seenCats = {};
    var i;
    var cat;
    var key;

    for (i = 0; i < parts.length; i++) {
      cat = normalizeTagName(parts[i]);
      if (!cat || isExcluded(cat)) continue;
      key = cat.toLowerCase();
      if (seenCats[key]) continue;
      seenCats[key] = true;
      out.push(cat);
    }

    return out;
  }

  function normalizeCategoryChildList(raw) {
    var parts = splitAliasList(raw);
    var out = [];
    var seenCats = {};
    var i;
    var rawPart;
    var sign;
    var cat;
    var key;

    for (i = 0; i < parts.length; i++) {
      rawPart = trimAtagString(parts[i]);
      sign = 1;

      if (rawPart.charAt(0) === "-") {
        sign = -1;
        rawPart = rawPart.substring(1);
      } else if (rawPart.charAt(0) === "+") {
        rawPart = rawPart.substring(1);
      }

      cat = normalizeTagName(rawPart);
      if (!cat || isExcluded(cat)) continue;
      key = cat.toLowerCase();
      if (seenCats[key]) continue;
      seenCats[key] = true;
      out.push({ name: cat, sign: sign });
    }

    return out;
  }

  function buildAliasMapLegacy(text) {
    var map = {};
    var lines = String(text || "").split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = trimAtagString(lines[i]);
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
        var alias = trimAtagString(parts[j]);
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
    map._categories = {};
    map._fixedChildCats = {};
    map._fixedChildCatSigns = {};
    map._multiAliasTargets = {};
    var lines = String(text || "").split(/\r?\n/);
    var categoryAliasDefs = [];

    function registerAlias(key, info) {
      if (!key) return;
      if (multiAliasTargets) {
        if (!map._multiAliasTargets[key]) map._multiAliasTargets[key] = [];
        map._multiAliasTargets[key].push(info);
      }
      map[key] = info;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = trimAtagString(lines[i]);
      var aliasLine = line;
      var hasAliasPrefix = /^@@/.test(line);
      var catAliasMatch;

      catAliasMatch = line.match(/^@@@\s*([^(:]+?)(?:\s*\(\s*([^)]+)\s*\))?(?:\s*:\s*(.*))?$/);
      if (catAliasMatch) {
        categoryAliasDefs.push({
          name: normalizeTagName(catAliasMatch[1]),
          shortName: normalizeTagName(catAliasMatch[2] || ""),
          children: normalizeCategoryChildList(catAliasMatch[3] || "")
        });
        continue;
      }

      if (hasAliasPrefix) {
        aliasLine = line.replace(/^@@\s*/, "");
      } else if (!isAliasDeclarationLine(line)) {
        continue;
      }

      var m = aliasLine.match(/^([^\[(:(]+?)(?:\s*\(\s*([^)]+)\s*\))?(?:\s*\[\s*([^\]]+)\s*\])?(?::\s*(.*))?$/);
      if (!m) continue;

      var baseName = normalizeTagName(m[1]);
      var shortName = normalizeTagName(m[2] || "");
      var categories = normalizeCategoryList(m[3] || "");
      if (!baseName) continue;
      if (isExcluded(baseName)) continue;
      addCategoryDefinitions(map, baseName, categories);

      registerAlias(baseName.toLowerCase(), {
        name: baseName,
        shortName: shortName || baseName,
        invert: false,
        fixedRaw: null,
        cats: categories
      });

      if (shortName && !isExcluded(shortName)) {
        registerAlias(shortName.toLowerCase(), {
          name: baseName,
          shortName: shortName,
          invert: false,
          fixedRaw: null,
          cats: categories
        });
      }

      var parts = splitAliasList(m[4] || "");

      for (var j = 0; j < parts.length; j++) {
        var alias = trimAtagString(parts[j]);
        var invert = false;
        var fixedRaw = null;
        var fixedMatch;

        if (!alias) continue;

        if (alias.charAt(0) === "-") {
          invert = true;
          alias = alias.substring(1);
        }

        if (!alias) continue;
        if (/[:#"'@]/.test(alias)) continue;
        fixedMatch = alias.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)([+\-]?\d+(?:[.,]\d+)?|\++|-+)$/);
        if (fixedMatch) {
          alias = fixedMatch[1];
          fixedRaw = fixedMatch[2];
        }

        if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(alias)) continue;

        registerAlias(alias.toLowerCase(), {
          name: baseName,
          shortName: shortName || baseName,
          invert: invert,
          fixedRaw: fixedRaw,
          cats: categories
        });
      }
    }

    for (i = 0; i < categoryAliasDefs.length; i++) {
      addCategoryAlias(
        map,
        categoryAliasDefs[i].name,
        categoryAliasDefs[i].shortName,
        categoryAliasDefs[i].children
      );
    }

    return map;
  }

  function isAliasDeclarationLine(line) {
    var s = trimAtagString(line);
    if (/^@@/.test(s)) return true;
    return /^[^\[(:(]+?(?:\s*\(\s*([^)]+)\s*\))?\s*\[\s*[^\]]+\s*\]\s*:/.test(s);
  }

  function addCategoryDefinitions(aliasMap, baseName, categories) {
    var i;
    var cat;
    var key;
    var bucket;

    for (i = 0; i < categories.length; i++) {
      cat = categories[i];
      key = String(cat).toLowerCase();

      if (!aliasMap._categories[key]) {
        aliasMap._categories[key] = {
          name: cat,
          shortName: cat,
          names: [],
          seen: {}
        };
      }

      bucket = aliasMap._categories[key];
      if (!bucket.seen[String(baseName).toLowerCase()]) {
        bucket.seen[String(baseName).toLowerCase()] = true;
        bucket.names.push(baseName);
      }
    }
  }

  function addCategoryAlias(aliasMap, catName, shortName, children) {
    var key;
    var bucket;
    var i;
    var child;
    var childKey;
    var catKey;
    var aliasKey;
    var childAlias;
    var sign;

    if (!catName || isExcluded(catName)) return;
    key = String(catName).toLowerCase();

    if (!aliasMap._categories[key]) {
      aliasMap._categories[key] = {
        name: catName,
        shortName: shortName || catName,
        names: [],
        seen: {},
        childSigns: {}
      };
    } else {
      aliasMap._categories[key].shortName = shortName || aliasMap._categories[key].shortName || catName;
      if (!aliasMap._categories[key].childSigns) aliasMap._categories[key].childSigns = {};
    }

    bucket = aliasMap._categories[key];
    for (i = 0; i < (children || []).length; i++) {
      child = typeof children[i] === "string" ? children[i] : children[i].name;
      sign = typeof children[i] === "string" ? 1 : (children[i].sign === -1 ? -1 : 1);
      aliasKey = String(child || "").toLowerCase();
      childAlias = aliasMap[aliasKey];
      if (childAlias && childAlias.name) {
        child = childAlias.name;
      }
      childKey = String(child).toLowerCase();
      if (!child || bucket.seen[childKey]) continue;
      bucket.seen[childKey] = true;
      bucket.names.push(child);
      bucket.childSigns[childKey] = sign;

      if (!aliasMap._fixedChildCats[childKey]) aliasMap._fixedChildCats[childKey] = [];
      aliasMap._fixedChildCats[childKey].push(catName);
      if (!aliasMap._fixedChildCatSigns[childKey]) aliasMap._fixedChildCatSigns[childKey] = {};
      catKey = String(catName).toLowerCase();
      aliasMap._fixedChildCatSigns[childKey][catKey] = sign;
    }
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

  function resolveAliases(name, aliasMap) {
    var key = String(name || "").toLowerCase();
    var multi = aliasMap && aliasMap._multiAliasTargets ? aliasMap._multiAliasTargets[key] : null;
    if (multi && multi.length) return multi;
    return [resolveAlias(name, aliasMap)];
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

    if (out === "00" || out === "+00") return "00";

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

  function addResolvedTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw, skipTemplates) {
    var aliases = resolveAliases(name, aliasMap);
    var ai;
    var aliasInfo;
    var resolvedName;
    var norm;
    var effectiveRaw;

    for (ai = 0; ai < aliases.length; ai++) {
      aliasInfo = aliases[ai];
      resolvedName = aliasInfo.name;
      effectiveRaw = aliasInfo.fixedRaw != null ? aliasInfo.fixedRaw : raw;

      if (!resolvedName || isExcluded(resolvedName)) continue;
      if (skipTemplates && /^\/\//.test(String(effectiveRaw || ""))) continue;
      if (skipTemplates && trimAtagString(effectiveRaw) === "_") continue;

      norm = normalizeAttr(effectiveRaw);
      if (aliasInfo.invert) norm = invertNormalizedAttr(norm);

      addItem(
        items, seen,
        resolvedName,
        norm.attrText, norm.attrValue, effectiveRaw,
        rowValue, rowUnit, rowRaw,
        aliasInfo.shortName || resolvedName,
        aliasInfo.cats || []
      );
    }
  }

  function addReadableTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw) {
    addResolvedTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw, false);
  }

  function addParsedTagValue(name, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw) {
    var cleanName = normalizeTagName(name);

    if (!cleanName || /^\d+$/.test(cleanName)) return;
    addResolvedTagValue(cleanName, raw, items, seen, aliasMap, rowValue, rowUnit, rowRaw, true);
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
      mark(m.index, m.index + String(m[0]).length);
      if (m[0] === "") rxSuper.lastIndex++;
    }

    var rxCleanerSimple = /(^|\s+)([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\u02E3(?=$|\s+)/g;
    while ((m = rxCleanerSimple.exec(s)) !== null) {
      if (isUsed(m.index)) {
        if (m[0] === "") rxCleanerSimple.lastIndex++;
        continue;
      }

      name = normalizeTagName(m[2] || "");
      addReadableTagValue(name, "", items, seen, aliasMap, rowValue, rowUnit, rowRaw);
      mark(m.index, m.index + String(m[0]).length);
      if (m[0] === "") rxCleanerSimple.lastIndex++;
    }

    var rxBare = /(^|[\s,]+)([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,]+)/g;
    while ((m = rxBare.exec(s)) !== null) {
      if (isUsed(m.index)) {
        if (m[0] === "") rxBare.lastIndex++;
        continue;
      }

      name = normalizeTagName(m[2] || "");
      addReadableTagValue(name, "", items, seen, aliasMap, rowValue, rowUnit, rowRaw);
      if (m[0] === "") rxBare.lastIndex++;
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

  function readAtagReadableTagLine(line) {
    var s = String(line || "");
    var m;

    m = s.match(/^\s*"\|\s*(.*)$/);
    if (m) return { text: m[1] || "", exclusive: true, row: false };

    m = s.match(/^\s*\|\|\s*(.*)$/);
    if (m) return { text: m[1] || "", exclusive: false, row: false };

    m = s.match(/^\s*\|\s*([^|].*)$/);
    if (m) return { text: m[1] || "", exclusive: false, row: true };

    return null;
  }

  function hasExclusiveAtagReadableTagLine(lines) {
    var i;
    var tagLine;

    for (i = 0; i < lines.length; i++) {
      tagLine = readAtagReadableTagLine(lines[i]);
      if (tagLine && tagLine.exclusive) return true;
    }

    return false;
  }

  function addCategoryItems(items, seen, aliasMap) {
    var map = {};
    var order = [];
    var i;
    var j;
    var item;
    var cats;
    var cat;
    var key;
    var names;
    var displayName;
    var aliasInfo;
    var defined;
    var fixedChildCats;

    defined = aliasMap._categories || {};
    for (key in defined) {
      map[key] = {
        name: defined[key].name,
        shortName: defined[key].shortName || defined[key].name,
        names: [],
        seen: {},
        childSigns: {}
      };
      for (j in (defined[key].childSigns || {})) {
        if ((defined[key].childSigns || {}).hasOwnProperty(j)) {
          map[key].childSigns[j] = defined[key].childSigns[j];
        }
      }
      order.push(key);
    }

    fixedChildCats = aliasMap._fixedChildCats || {};

    for (i = 0; i < items.length; i++) {
      item = items[i];
      cats = item && item.cats ? item.cats : [];
      if (item && fixedChildCats[String(item.name || "").toLowerCase()]) {
        cats = cats.concat(fixedChildCats[String(item.name || "").toLowerCase()]);
      }

      for (j = 0; j < cats.length; j++) {
        cat = cats[j];
        key = String(cat).toLowerCase();

        if (!map[key]) {
          map[key] = {
            name: cat,
            names: [],
            seen: {},
            childSigns: {}
          };
          order.push(key);
        }

        if (!map[key].seen[String(item.name).toLowerCase()]) {
          var itemKey = String(item.name).toLowerCase();
          var fixedSigns = aliasMap._fixedChildCatSigns || {};
          var signMap = fixedSigns[itemKey] || {};
          map[key].seen[itemKey] = true;
          if (signMap.hasOwnProperty(key)) map[key].childSigns[itemKey] = signMap[key];
          map[key].names.push(item.name);
        }
      }
    }

    for (i = 0; i < order.length; i++) {
      key = order[i];
      cat = map[key].name;
      names = map[key].names;
      aliasInfo = aliasMap[String(cat).toLowerCase()] || null;
      displayName = map[key].shortName || (aliasInfo && aliasInfo.shortName ? aliasInfo.shortName : cat);

      if (!names.length) continue;

      addItem(
        items, seen,
        cat,
        names.join(", "),
        names.slice(0),
        names.join(", "),
      null, null, null,
      displayName,
      [],
      "category",
      false,
      map[key].childSigns
    );
  }
  }

  var items = [];
  var seen = {};
  var cachedTexts = [];
  var fullText = [];
  var aliasMap;
  var li;

  for (li = 0; li < textFields.length; li++) {
    var tv = entryObj.field(textFields[li]);
    var strVal = tv == null ? "" : String(tv);

    cachedTexts.push(strVal);
    if (strVal) fullText.push(strVal);
  }

  aliasMap = buildAliasMap(fullText.join("\n"));

  for (li = 0; li < cachedTexts.length; li++) {
    var str = cachedTexts[li];
    if (!str) continue;

    var lines = str.split(/\r?\n/);
    var lastRowValue = null;
    var lastRowUnit = null;
    var lastRowRaw = null;
    var exclusiveReadableTags = hasExclusiveAtagReadableTagLine(lines);

    for (var ln = 0; ln < lines.length; ln++) {
      var line = String(lines[ln] || "");
      var rowCtx = detectRowPrefix(line);
      var readableTagLine = readAtagReadableTagLine(line);

      if (readableTagLine) {
        addReadableTagLineItems(
          readableTagLine.text,
          items, seen, aliasMap,
          exclusiveReadableTags || !readableTagLine.row ? null : lastRowValue,
          exclusiveReadableTags || !readableTagLine.row ? null : lastRowUnit,
          exclusiveReadableTags || !readableTagLine.row ? null : lastRowRaw
        );
        continue;
      }

      if (isAliasDeclarationLine(line)) continue;
      if (exclusiveReadableTags) continue;

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

        addResolvedTagValue(
          rawQuotedName,
          rawQuotedAttr,
          items, seen, aliasMap,
          currentRowValue, currentRowUnit, currentRowRaw,
          false
        );
      }

      // inverted text tag: inhalt(:tag) / "das ist ein Satz"(:Aussage)
      var rxInvertedQuoted = /(^|[\s,;.!?()\[\]{}\n\r])(?:'([^']*)'|"([^"]*)")\s*\(:\s*([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*\)/g;
      var miq;
      while ((miq = rxInvertedQuoted.exec(parseLine)) !== null) {
        var rawIQ = miq[2] != null && miq[2] !== "" ? miq[2] : (miq[3] || "");
        var nameIQ = miq[4] || "";

        if (isInsideAtagQuoteState(quoteState, miq.index + String(miq[1] || "").length)) continue;
        addParsedTagValue(nameIQ, rawIQ, items, seen, aliasMap, currentRowValue, currentRowUnit, currentRowRaw);
      }

      var rxInvertedBare = /(^|[\s,;.!?()\[\]{}\n\r])([^\s,;.!?()\[\]{}:'"#]+)\s*\(:\s*([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*\)/g;
      var mib;
      while ((mib = rxInvertedBare.exec(parseLine)) !== null) {
        if (isInsideAtagQuoteState(quoteState, mib.index + String(mib[1] || "").length)) continue;
        addParsedTagValue(mib[3] || "", mib[2] || "", items, seen, aliasMap, currentRowValue, currentRowUnit, currentRowRaw);
      }

      // colon: gfk: 1,4 / tag:inhalt / tag:: inhalt
      var rxColon = /(^|[\s\n\r])#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:(?:"([^"]*)"|([^:\s,;.!?()\[\]{}]+))/g;
      var m1;
      while ((m1 = rxColon.exec(parseLine)) !== null) {
        var name1 = m1[2];
        var raw1 = m1[3] != null && m1[3] !== "" ? m1[3] : (m1[4] || "");
        raw1 = trimAtagString(raw1);

        if (!name1) continue;
        if (isInsideAtagQuoteState(quoteState, m1.index)) continue;
        addParsedTagValue(name1, raw1, items, seen, aliasMap, currentRowValue, currentRowUnit, currentRowRaw);
      }

      var rxColonSpacedValue = /(^|[\s\n\r])#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:\s*(?:"([^"]*)"|([+\-]?\d+(?:[.,]\d+)?|\++|-+))(?=$|[\s,;.!?()\[\]{}])/g;
      while ((m1 = rxColonSpacedValue.exec(parseLine)) !== null) {
        raw1 = m1[3] != null && m1[3] !== "" ? m1[3] : (m1[4] || "");
        if (isInsideAtagQuoteState(quoteState, m1.index)) continue;
        addParsedTagValue(m1[2] || "", raw1, items, seen, aliasMap, currentRowValue, currentRowUnit, currentRowRaw);
      }

      var rxColonExplicit = /(^|[\s\n\r])#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*::\s*(?:"([^"]*)"|([^\r\n,;.!?()\[\]{}]+))/g;
      while ((m1 = rxColonExplicit.exec(parseLine)) !== null) {
        raw1 = m1[3] != null && m1[3] !== "" ? m1[3] : (m1[4] || "");
        raw1 = trimAtagString(raw1);
        if (isInsideAtagQuoteState(quoteState, m1.index)) continue;
        addParsedTagValue(m1[2] || "", raw1, items, seen, aliasMap, currentRowValue, currentRowUnit, currentRowRaw);
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

        addResolvedTagValue(
          nameH,
          rawH,
          items, seen, aliasMap,
          currentRowValue, currentRowUnit, currentRowRaw,
          false
        );
      }

      // name + number: emo3 / emo+1,3 / emo-12,32
      var rxNum = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(\+{2,}\d*|-{2,}\d*|[+\-]?\d+(?:[.,]\d+)?|\++|-+)(?=$|[\s,;.!?()\[\]{}])/g;
      var mn;
      while ((mn = rxNum.exec(parseLine)) !== null) {
        var nameN = mn[2];
        var rawN = mn[3] || "";
        var fullTokenN = String(mn[0] || "").substring(String(mn[1] || "").length);

        if (!nameN || !rawN) continue;

        // Regex prefers the longest possible tag name, so negative suffixes
        // like "tag-2", "tag--" or "emo-12,32" can be split incorrectly.
        // Re-split the full token at the final suffix.
        var zeroSplit = fullTokenN.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)([+\-]?00|[+\-]?0[.,]?\d+)$/);
        if (zeroSplit && zeroSplit[1]) {
          nameN = zeroSplit[1];
          rawN = zeroSplit[2];
        }

        var cumulativeSplit = fullTokenN.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(\+{1,}\d*|-{2,}\d*)$/);
        if (cumulativeSplit && cumulativeSplit[1]) {
          nameN = cumulativeSplit[1];
          rawN = cumulativeSplit[2];
        }

        if (/^\d+(?:[.,]\d+)?$/.test(rawN)) {
          var negSplit = fullTokenN.match(/^([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*?)(-\d+(?:[.,]\d+)?)$/);
          if (negSplit && negSplit[1]) {
            nameN = negSplit[1];
            rawN = negSplit[2];
          }
        }

        if (!nameN) continue;
        if (/_$/.test(nameN)) continue;

        // emo1,2 without an explicit sign is not allowed
        if (/^[1-9]\d*[.,]\d+$/.test(rawN)) continue;

        if (isInsideAtagQuoteState(quoteState, mn.index)) continue;

        addResolvedTagValue(
          nameN,
          rawN,
          items, seen, aliasMap,
          currentRowValue, currentRowUnit, currentRowRaw,
          false
        );
      }

      // name + superscript value: emo² / tag⁻⁰³ / stuff⁺⁺
      var rxSupNum = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u207F]+)(?=$|[\s,;.!?()\[\]{}])/g;
      var msup;
      while ((msup = rxSupNum.exec(parseLine)) !== null) {
        var nameSup = msup[2];
        var rawSup = decodeReadableSuperscript(msup[3] || "");

        if (!nameSup) continue;
        if (isInsideAtagQuoteState(quoteState, msup.index)) continue;

        addResolvedTagValue(
          nameSup,
          rawSup,
          items, seen, aliasMap,
          currentRowValue, currentRowUnit, currentRowRaw,
          false
        );
      }

      // explicit simple tags only: #tag or tag#
      var rxSimpleTag = /(^|[\s,;.!?()\[\]{}])#([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,;.!?()\[\]{}])|(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#(?=$|[\s,;.!?()\[\]{}])/g;
      var ms;
      while ((ms = rxSimpleTag.exec(parseLine)) !== null) {
        var nameS = ms[2] || ms[4] || "";
        if (!nameS) continue;
        if (isInsideAtagQuoteState(quoteState, ms.index)) continue;

        addResolvedTagValue(
          nameS,
          "",
          items, seen, aliasMap,
          currentRowValue, currentRowUnit, currentRowRaw,
          false
        );
      }

      // cleaner simple tag suffix: essenx
      var rxCleanerSimpleTag = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\u02E3(?=$|[\s,;.!?()\[\]{}])/g;
      var mcst;
      while ((mcst = rxCleanerSimpleTag.exec(parseLine)) !== null) {
        var nameCst = mcst[2] || "";
        if (!nameCst) continue;
        if (isInsideAtagQuoteState(quoteState, mcst.index)) continue;

        addResolvedTagValue(
          nameCst,
          "",
          items, seen, aliasMap,
          currentRowValue, currentRowUnit, currentRowRaw,
          false
        );
      }

    }
  }

  addCategoryItems(items, seen, aliasMap);

  return { items: items };
}
