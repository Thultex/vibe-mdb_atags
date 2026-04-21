/*
========================================
collectAtags v1.21 (sys 2.00)
========================================

Änderungen
- Verhalten wieder näher am alten Parser
- normale Wörter werden nicht mehr als Tags erkannt
- einfache Tags nur noch explizit:
  - #tag
  - tag#
  - 'quoted tag'#
- Alias-Ersetzung nur in echten Tag-Kontexten
- Dezimalzahlen weiter unterstützt
- Row-System bleibt aktiv
- test#string und test#5, bleiben erlaubt
- freie Wörter wie "running" werden nicht mehr als Tag erkannt

Anwendung

var result = collectAtags({
  entryObj: entry(),
  textFields: ["Alias", "Notiz"]
});

applyTags({
  textFields: ["Alias", "Notiz"],
  targetField: "Atag MD",
  targetFieldType: "md"
});

Beispiele

#test
emo3
emo+1,3
emo-12,32
gfk: 1,4
test#string
test#5,
'Four Tops'#
@@run: running
2,2h: emo3
5h: emo1
*/

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

  function addItem(items, seen, name, attrText, attrValue, rawText, rowValue, rowUnit, rowRaw) {
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
      rowRaw: rowRaw != null ? rowRaw : null
    });
  }

  function isInsideQuotes(str, pos) {
    var inSingle = false;
    var inDouble = false;

    for (var i = 0; i < pos; i++) {
      var ch = str.charAt(i);
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
    }

    return inSingle || inDouble;
  }

  function buildAliasMap(text) {
    var map = {};
    var lines = String(text || "").split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = String(lines[i] || "").replace(/^\s+|\s+$/g, "");
      if (!/^@@/.test(line)) continue;

      var m = line.match(/^@@([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:\s*(.+)$/);
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

        if (!alias) continue;

        if (/[:#"'@]/.test(alias)) continue;
        if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*$/.test(alias)) continue;

        map[alias.toLowerCase()] = baseName;
      }
    }

    return map;
  }

  function resolveAlias(name, aliasMap) {
    var key = String(name || "").toLowerCase();
    return aliasMap[key] || name;
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
  var fullText = [];
  var li;

  for (li = 0; li < textFields.length; li++) {
    var tv = entryObj.field(textFields[li]);
    if (tv) fullText.push(String(tv));
  }

  var joinedText = fullText.join("\n");
  var aliasMap = buildAliasMap(joinedText);

  for (li = 0; li < textFields.length; li++) {
    var text = entryObj.field(textFields[li]);
    if (!text) continue;

    var str = String(text);
    var lines = str.split(/\r?\n/);

    for (var ln = 0; ln < lines.length; ln++) {
      var line = String(lines[ln] || "");
      var rowCtx = detectRowPrefix(line);

      var currentRowValue = null;
      var currentRowUnit = null;
      var currentRowRaw = null;
      var parseLine = line;

      if (rowCtx) {
        currentRowValue = rowCtx.rowValue;
        currentRowUnit = rowCtx.rowUnit;
        currentRowRaw = rowCtx.rowRaw;
        parseLine = rowCtx.rest;
      }

      // quoted tag: 'Four Tops'#
      var rxQuotedTag = /(^|[\s\n\r])(?:'([^']+)'|"([^"]+)")#/g;
      var mq;
      while ((mq = rxQuotedTag.exec(parseLine)) !== null) {
        var rawQuotedName = mq[2] != null ? mq[2] : (mq[3] || "");
        rawQuotedName = normalizeTagName(rawQuotedName);
        if (!rawQuotedName) continue;

        rawQuotedName = resolveAlias(rawQuotedName, aliasMap);

        if (isExcluded(rawQuotedName)) continue;

        addItem(
          items, seen,
          rawQuotedName,
          null, null, "",
          currentRowValue, currentRowUnit, currentRowRaw
        );
      }

      // colon: gfk: 1,4
      var rxColon = /(^|[\s\n\r])#?([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)\s*:\s*(?:"([^"]*)"|([^\s,;]+))/g;
      var m1;
      while ((m1 = rxColon.exec(parseLine)) !== null) {
        var name1 = m1[2];
        var raw1 = m1[3] != null ? m1[3] : (m1[4] || "");
        raw1 = String(raw1).replace(/^\s+|\s+$/g, "");

        if (!name1) continue;
        if (/^\d+$/.test(name1)) continue;

        name1 = resolveAlias(name1, aliasMap);

        if (isExcluded(name1)) continue;
        if (/^\/\//.test(raw1)) continue;

        var norm1 = normalizeAttr(raw1);

        addItem(
          items, seen,
          name1,
          norm1.attrText,
          norm1.attrValue,
          raw1,
          currentRowValue, currentRowUnit, currentRowRaw
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

        nameH = resolveAlias(nameH, aliasMap);

        if (isExcluded(nameH)) continue;

        var normH = normalizeAttr(rawH);

        addItem(
          items, seen,
          nameH,
          normH.attrText,
          normH.attrValue,
          rawH,
          currentRowValue, currentRowUnit, currentRowRaw
        );
      }

      // name + number: emo3 / emo+1,3 / emo-12,32
      var rxNum = /(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)([+\-]?\d+(?:[.,]\d+)?|\++|-+)(?=$|[\s,;.!?()\[\]{}])/g;
      var mn;
      while ((mn = rxNum.exec(parseLine)) !== null) {
        var nameN = mn[2];
        var rawN = mn[3] || "";

        if (!nameN || !rawN) continue;

        // Regex prefers the longest tag name, so "yay-2,3" becomes
        // name="yay-" and value="2,3". Shift the trailing minus back
        // to the numeric part so signed decimals stay supported.
        if (/\-$/.test(nameN) && /^\d+(?:[.,]\d+)?$/.test(rawN)) {
          nameN = nameN.replace(/\-$/, "");
          rawN = "-" + rawN;
        }

        if (!nameN) continue;

        // emo1,2 ohne Vorzeichen soll NICHT erlaubt sein
        if (/^\d+[.,]\d+$/.test(rawN)) continue;

        nameN = resolveAlias(nameN, aliasMap);

        if (isExcluded(nameN)) continue;
        if (isInsideQuotes(parseLine, mn.index)) continue;

        var normN = normalizeAttr(rawN);

        addItem(
          items, seen,
          nameN,
          normN.attrText,
          normN.attrValue,
          rawN,
          currentRowValue, currentRowUnit, currentRowRaw
        );
      }

      // explicit simple tags only: #tag or tag#
      var rxSimpleTag = /(^|[\s,;.!?()\[\]{}])#([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(?=$|[\s,;.!?()\[\]{}])|(^|[\s,;.!?()\[\]{}])([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)#(?=$|[\s,;.!?()\[\]{}])/g;
      var ms;
      while ((ms = rxSimpleTag.exec(parseLine)) !== null) {
        var nameS = ms[2] || ms[4] || "";
        if (!nameS) continue;

        nameS = resolveAlias(nameS, aliasMap);

        if (isExcluded(nameS)) continue;

        addItem(
          items, seen,
          nameS,
          null, null, "",
          currentRowValue, currentRowUnit, currentRowRaw
        );
      }
    }
  }

  return { items: items };
}
