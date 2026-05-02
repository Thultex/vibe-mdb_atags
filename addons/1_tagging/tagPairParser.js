/*
========================================
B2 Tag Pair Parser v1.00 (sys 2.20)
========================================

Änderungen
- Add-on für 2-Tag-Paare im Tag-Feld ergänzt
- ohne direkten Eingriff in applyTags() / bulkApplyTags()
- ergänzt Werte als name#wert im Textfeld
- entfernt den zweiten Wert-Tag optional aus dem Tag-Feld

Anwendung

applyTagPairParser({
  tagField: "Tags",
  targetTextField: "Notiz"
});

bulkApplyTagPairParser({
  tagField: "Tags",
  targetTextField: "Notiz"
});

========================================
*/

function trimTagPairValue(val) {
  if (val == null) return "";
  return String(val).replace(/^\s+|\s+$/g, "");
}

function stripTagPairWrappingQuotes(s) {
  s = trimTagPairValue(s);
  if (!s) return s;

  if (
    (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
    (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
  ) {
    return s.substring(1, s.length - 1);
  }

  return s;
}

function cleanStringTagToken(s) {
  s = trimTagPairValue(s);
  if (!s) return "";

  s = stripTagPairWrappingQuotes(s);
  s = trimTagPairValue(s);

  return s;
}

function toTagList(rawTags) {
  if (rawTags == null) return [];

  if (Array.isArray(rawTags)) {
    var outArr = [];

    for (var i = 0; i < rawTags.length; i++) {
      var tokenA = cleanStringTagToken(rawTags[i]);
      if (tokenA) outArr.push(tokenA);
    }

    return outArr;
  }

  var s = trimTagPairValue(rawTags);
  if (!s) return [];

  if (/^\[.*\]$/.test(s)) {
    s = s.substring(1, s.length - 1);
  }

  s = trimTagPairValue(s);
  if (!s) return [];

  var parts = s.split(/\n|,\s+/);
  var out = [];

  for (var j = 0; j < parts.length; j++) {
    var token = cleanStringTagToken(parts[j]);
    if (token) out.push(token);
  }

  return out;
}

function isNormalPairName(tag) {
  var s = trimTagPairValue(tag);
  return /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_]*$/.test(s);
}

function isPairValueTag(tag) {
  var s = trimTagPairValue(tag);

  return (
    /^\d+$/.test(s) ||
    /^[+-]\d+$/.test(s) ||
    /^\d+,\d+$/.test(s) ||
    /^[+-]\d+,\d+$/.test(s) ||
    /^\++$/.test(s) ||
    /^-+$/.test(s)
  );
}

function normalizePairValue(raw) {
  var s = trimTagPairValue(raw);

  if (/^\d+$/.test(s)) return s;
  if (/^[+-]\d+$/.test(s)) return s;
  if (/^\d+,\d+$/.test(s)) return s;
  if (/^[+-]\d+,\d+$/.test(s)) return s;

  if (/^\++$/.test(s)) {
    return "+" + s.length;
  }

  if (/^-+$/.test(s)) {
    return String(-s.length);
  }

  return null;
}

function appendTagPairTextValue(entryObj, targetTextField, lines, appendMode) {
  if (!lines || !lines.length) return;

  var oldText = entryObj.field(targetTextField);
  oldText = oldText == null ? "" : String(oldText);

  if (appendMode === "comma") {
    var prefix = oldText.replace(/\s+$/g, "");
    var suffix = lines.join(", ");

    if (!prefix) {
      entryObj.set(targetTextField, suffix);
    } else {
      entryObj.set(targetTextField, prefix + ", " + suffix);
    }
    return;
  }

  var cleanOld = oldText.replace(/\s+$/g, "");
  var addBlock = lines.join("\n");

  if (!cleanOld) {
    entryObj.set(targetTextField, addBlock);
  } else {
    entryObj.set(targetTextField, cleanOld + "\n" + addBlock);
  }
}

function applyTagPairParser(cfg) {
  cfg = cfg || {};

  var entryObj = cfg.entryObj || entry();
  if (!entryObj) return { tags: [], textAdds: [] };

  var tagField = cfg.tagField;
  var targetTextField = cfg.targetTextField;
  var appendMode = cfg.appendMode || "newline";
  var keepOriginalValueTag = cfg.keepOriginalValueTag === true;

  if (!tagField || !targetTextField) {
    return { tags: [], textAdds: [] };
  }

  var rawTags = entryObj.field(tagField);
  var tags = toTagList(rawTags);

  if (!tags.length) return { tags: [], textAdds: [] };

  var outTags = [];
  var textAdds = [];

  for (var i = 0; i < tags.length; i++) {
    var current = cleanStringTagToken(tags[i]);
    if (!current) continue;

    var next = i + 1 < tags.length ? cleanStringTagToken(tags[i + 1]) : "";

    if (isNormalPairName(current) && isPairValueTag(next)) {
      var normalized = normalizePairValue(next);

      if (normalized != null) {
        textAdds.push(current + "#" + normalized);
        outTags.push(current);

        if (keepOriginalValueTag) {
          outTags.push(next);
        }

        i++;
        continue;
      }
    }

    outTags.push(current);
  }

  entryObj.set(tagField, outTags);
  appendTagPairTextValue(entryObj, targetTextField, textAdds, appendMode);

  return {
    tags: outTags,
    textAdds: textAdds
  };
}

function bulkApplyTagPairParser(cfg) {
  var all = lib().entries();
  var results = [];

  for (var i = 0; i < all.length; i++) {
    var entryObj = all[i];
    var bulkCfg = {};
    var key;

    for (key in cfg) {
      if (cfg.hasOwnProperty(key)) bulkCfg[key] = cfg[key];
    }

    bulkCfg.entryObj = entryObj;
    results.push(applyTagPairParser(bulkCfg));
  }

  return results;
}
