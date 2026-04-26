/*
========================================
restoreAtags v1.10 (sys 2.11)
========================================

Features
- Restore einzelner Werte (Number / String)
- Restore Listenwerte (Komma → Liste)
- Auto-Restore aller Tags aus JSON
- Bulk Restore über gesamte DB
- force_type:
  - null → automatisch
  - "text" → String / multiline
  - "list" → Array

- kompatibel mit collectAtags + exportAtags
- Dezimalwerte bleiben korrekt (1,4 → 1.4 intern)
- ignoriert null / invalid JSON
- keine Abhängigkeit zu Parser

========================================
ANWENDUNG
========================================

1) Einzelwert

restoreAtags({
  sourceField: "Atag Json",
  tagName: "emo",
  targetField: "emo_t"
});

2) Einzelwert als Text

restoreAtags({
  sourceField: "Atag Json",
  tagName: "emo",
  targetField: "emo_text",
  force_type: "text"
});

3) Liste

restoreAtags({
  sourceField: "Atag Json",
  tagName: "info",
  targetField: "info_tl",
  force_type: "list"
});

4) Komplett Restore

restoreAtags({
  sourceField: "Atag Json",
  suffix: "_t",
  listSuffix: "_tl"
});

5) Bulk

bulkRestoreAtags({
  sourceField: "Atag Json",
  suffix: "_t",
  listSuffix: "_tl"
});

========================================
*/

// ===== HELPERS =====
function parseListValue(val) {
  var parts = Array.isArray(val) ? val : String(val).split(",");
  var out = [];
  var seen = {};

  for (var i = 0; i < parts.length; i++) {
    var s = String(parts[i]).trim();
    if (!s) continue;

    var key = s.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(s);
    }
  }

  return out;
}

function isListLikeValue(val) {
  if (Array.isArray(val)) return true;
  if (val == null) return false;
  return String(val).indexOf(",") >= 0;
}

function readJsonField(entryObj, sourceField) {
  var raw = entryObj.field(sourceField);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeValueByType(entryObj, targetField, val, force_type) {
  if (val == null) return;

  if (force_type === "list") {
    entryObj.set(targetField, parseListValue(val));
    return;
  }

  if (force_type === "text") {
    entryObj.set(
      targetField,
      Array.isArray(val)
        ? parseListValue(val).join("\n")
        : String(val)
    );
    return;
  }

  var num = Number(val);
  entryObj.set(targetField, isNaN(num) ? String(val) : num);
}

// ===== CORE =====
function restoreAtags(cfg) {
  var entryObj = entry();
  if (!entryObj) return;

  var obj = readJsonField(entryObj, cfg.sourceField);
  if (!obj) return;

  // ===== EINZELTAG =====
  if (cfg.tagName) {
    var val = obj[cfg.tagName];
    if (val == null) return;

    writeValueByType(entryObj, cfg.targetField, val, cfg.force_type);
    return;
  }

  // ===== AUTO RESTORE =====
  var suffix = cfg.suffix || "_t";
  var listSuffix = cfg.listSuffix;
  var force = cfg.force_type;

  for (var key in obj) {
    var val2 = obj[key];
    if (val2 == null) continue;

    var isList = isListLikeValue(val2);

    if (force === "list") {
      entryObj.set(key + (listSuffix || suffix), parseListValue(val2));
      continue;
    }

    if (force === "text") {
      entryObj.set(
        key + (isList && listSuffix ? listSuffix : suffix),
        isList
          ? parseListValue(val2).join("\n")
          : String(val2)
      );
      continue;
    }

    if (isList && listSuffix) {
      entryObj.set(key + listSuffix, parseListValue(val2));
      continue;
    }

    var num2 = Number(val2);
    entryObj.set(key + suffix, isNaN(num2) ? String(val2) : num2);
  }
}

// ===== BULK =====
function bulkRestoreAtags(cfg) {
  var all = lib().entries();

  var suffix = cfg.suffix || "_t";
  var listSuffix = cfg.listSuffix;
  var force = cfg.force_type;

  for (var i = 0; i < all.length; i++) {
    var entryObj = all[i];
    var obj = readJsonField(entryObj, cfg.sourceField);
    if (!obj) continue;

    for (var key in obj) {
      var val = obj[key];
      if (val == null) continue;

      var isList = isListLikeValue(val);

      try {
        if (force === "list") {
          entryObj.set(key + (listSuffix || suffix), parseListValue(val));
        } else if (force === "text") {
          entryObj.set(
            key + (isList && listSuffix ? listSuffix : suffix),
            isList
              ? parseListValue(val).join("\n")
              : String(val)
          );
        } else if (isList && listSuffix) {
          entryObj.set(key + listSuffix, parseListValue(val));
        } else {
          var num = Number(val);
          entryObj.set(key + suffix, isNaN(num) ? String(val) : num);
        }
      } catch (e) {}
    }
  }
}
