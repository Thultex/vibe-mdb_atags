/*
========================================
A3 restoreAtags v2.04 (sys 2.40)
========================================

Notes:
- JSON restore into fields
- default suffixes: _ and _l
- supports entry groups and direct maps
- supports currentEntry like sequenceCounter
- valueMode: avg, first, last, median, min, max
- aggregate text like "2 [3, 1]" is treated as repeated values
- optional debugField writes restore diagnostics
- debugLog/logDebug mirrors diagnostics to log()
- auto restore skips targets missing from lib().fields()
- bulkRestoreAtags is a legacy wrapper
- alias brackets are reserved for categories, not restore mappings
- mapped and auto restore share one target-write helper

Examples:

restoreAtags({
  sourceField: "Atag Json"
});

restoreAtags({
  sourceField: "Atag Json",
  entries: lib().entries(),
  currentEntry: entry()
});

restoreAtags({
  sourceField: "Atag Json",
  map: {
    MetricA: "MetricA_"
  },
  mode: "exclusive"
});

========================================
*/

// ===== HELPERS =====
function parseListValue(val) {
  var parts = isRestoreArray(val) ? val : String(val).split(",");
  var out = [];
  var seen = {};

  for (var i = 0; i < parts.length; i++) {
    var s = trimRestoreString(parts[i]);
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
  if (isRestoreArray(val)) return true;
  if (val == null) return false;
  return String(val).indexOf(",") >= 0;
}

function isRestoreArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function isRestoreString(val) {
  return typeof val === "string" || Object.prototype.toString.call(val) === "[object String]";
}

function restoreListLength(val) {
  var n;

  if (val == null || isRestoreString(val)) return null;
  if (isRestoreArray(val)) return val.length;

  try {
    n = Number(val.length());
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e0) {}

  try {
    n = Number(val.length);
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e1) {}

  try {
    n = Number(val.size);
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e2) {}

  try {
    n = Number(val.size());
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  } catch (e3) {}

  return null;
}

function restoreListItem(val, index) {
  try {
    return val.get(index);
  } catch (e0) {}
  try {
    return val.item(index);
  } catch (e1) {}
  try {
    return val.entry(index);
  } catch (e2) {}
  try {
    return val.getAt(index);
  } catch (e3) {}
  return val[index];
}

function restoreToArray(val) {
  var out = [];
  var it;
  var len;
  var i;

  if (val == null) return out;
  if (isRestoreArray(val)) return val.slice(0);

  try {
    return restoreToArray(val.toArray());
  } catch (e0) {}

  len = restoreListLength(val);
  if (len != null) {
    for (i = 0; i < len; i++) out.push(restoreListItem(val, i));
    return out;
  }

  try {
    it = val.iterator();
    while (it.hasNext()) out.push(it.next());
    return out;
  } catch (e2) {}

  try {
    while (val.hasNext()) out.push(val.next());
    return out;
  } catch (e3) {}

  return [val];
}

function restoreFieldNameMap(cfg) {
  var fields;
  var map = {};
  var i;
  var name;

  if (cfg._fieldNameMap !== undefined) return cfg._fieldNameMap;

  fields = cfg.targetFields || cfg.fieldNames || null;
  if (!fields && typeof lib === "function") {
    try {
      fields = lib().fields();
    } catch (e) {
      fields = null;
    }
  }

  if (!fields) {
    cfg._fieldNameMap = null;
    cfg._fieldNameCount = null;
    return null;
  }

  fields = restoreToArray(fields);
  for (i = 0; i < fields.length; i++) {
    name = String(fields[i]);
    map[name.toLowerCase()] = true;
  }

  cfg._fieldNameMap = map;
  cfg._fieldNameCount = fields.length;
  return map;
}

function restoreTargetExists(cfg, targetField) {
  var map = restoreFieldNameMap(cfg);
  if (!map) return true;
  return !!map[String(targetField || "").toLowerCase()];
}

function restoreEntryId(entryObj) {
  if (!entryObj) return "";
  if (typeof entryObj.id === "function") return String(entryObj.id());
  if (entryObj.id != null) return String(entryObj.id);
  return "";
}

function restoreSameEntry(a, b) {
  var aid;
  var bid;

  if (!a || !b) return false;
  if (a === b) return true;

  aid = restoreEntryId(a);
  bid = restoreEntryId(b);
  return aid !== "" && aid === bid;
}

function restoreEntriesWithCurrent(entries, currentEntry) {
  var out = [];
  var replaced = false;
  var i;

  if (entries && entries.length) {
    for (i = 0; i < entries.length; i++) {
      if (currentEntry && restoreSameEntry(entries[i], currentEntry)) {
        out.push(currentEntry);
        replaced = true;
      } else {
        out.push(entries[i]);
      }
    }
  }

  if (currentEntry && !replaced) out.push(currentEntry);

  return out;
}

function readJsonField(entryObj, sourceField) {
  var raw = entryObj.field(sourceField);
  if (!raw) return null;

  try {
    if (typeof JSON !== "undefined" && JSON.parse) {
      return JSON.parse(raw);
    }
    return eval("(" + raw + ")");
  } catch (e) {
    return null;
  }
}

function restoreDebugPush(cfg, msg) {
  if (!cfg || !cfg._debugLines) return;
  cfg._debugLines.push(String(msg));

  if (cfg.debugLog === true || cfg.logDebug === true) {
    try {
      log(String(msg));
    } catch (e) {}
  }
}

function restoreDebugFlush(entryObj, cfg) {
  if (!cfg || !cfg.debugField || !cfg._debugLines) return;

  try {
    entryObj.set(cfg.debugField, cfg._debugLines.join("\n"));
  } catch (e) {}
}

function writeValueByType(entryObj, targetField, val, force_type) {
  if (val == null) return;
  if (!targetField) return;

  if (force_type === "list") {
    entryObj.set(targetField, parseListValue(val));
    return;
  }

  if (force_type === "text") {
    entryObj.set(
      targetField,
      isRestoreArray(val)
        ? parseListValue(val).join("\n")
        : String(val)
    );
    return;
  }

  var num = Number(val);
  entryObj.set(targetField, isNaN(num) ? String(val) : num);
}

function restoreWriteTarget(entryObj, targetField, val, forceType, cfg, okMessage, errorMessage, skipMessage) {
  if (!restoreTargetExists(cfg, targetField)) {
    restoreDebugPush(cfg, skipMessage);
    return false;
  }

  try {
    writeValueByType(entryObj, targetField, val, forceType);
    restoreDebugPush(cfg, okMessage);
    return true;
  } catch (eWrite) {
    restoreDebugPush(cfg, errorMessage + " :: " + eWrite);
    return false;
  }
}

function selectRestoreValue(val, valueMode, force_type) {
  var values;
  var mode;
  var nums;
  var i;
  var n;
  var mid;
  var agg;

  if (!isRestoreArray(val) && force_type !== "list") {
    agg = parseRestoreAggregateText(val);
    if (agg) val = agg.values;
  }

  if (!isRestoreArray(val) || force_type === "list") return val;

  values = compactRestoreValues(val);
  if (!values.length) return null;

  mode = String(valueMode || "avg").toLowerCase();
  if (mode === "first") return values[0];
  if (mode === "last") return values[values.length - 1];

  nums = [];
  for (i = 0; i < values.length; i++) {
    n = toRestoreNumber(values[i]);
    if (n == null) return values[0];
    nums.push(n);
  }

  if (mode === "median") {
    nums.sort(function(a, b) { return a - b; });
    mid = Math.floor(nums.length / 2);
    if (nums.length % 2) return nums[mid];
    return (nums[mid - 1] + nums[mid]) / 2;
  }

  if (mode === "min") {
    n = nums[0];
    for (i = 1; i < nums.length; i++) if (nums[i] < n) n = nums[i];
    return n;
  }

  if (mode === "max") {
    n = nums[0];
    for (i = 1; i < nums.length; i++) if (nums[i] > n) n = nums[i];
    return n;
  }

  n = 0;
  for (i = 0; i < nums.length; i++) n += nums[i];
  return n / nums.length;
}

function parseRestoreAggregateText(val) {
  var s;
  var m;
  var list;
  var nums = [];
  var rx;
  var hit;
  var n;

  if (!isRestoreString(val)) return null;

  s = trimRestoreString(val);
  m = s.match(/^[+-]?\d+(?:[.,]\d+)?\s*\[([^\]]+)\]\s*$/);
  if (!m) return null;

  list = m[1];
  rx = /[+-]?\d+(?:[.,]\d+)?/g;
  while ((hit = rx.exec(list)) !== null) {
    n = toRestoreNumber(hit[0]);
    if (n == null) return null;
    nums.push(n);
  }

  if (!nums.length) return null;

  return {
    values: nums
  };
}

function compactRestoreValues(val) {
  var out = [];
  var i;

  for (i = 0; i < val.length; i++) {
    if (val[i] == null) continue;
    if (String(val[i]) === "") continue;
    out.push(val[i]);
  }

  return out;
}

function toRestoreNumber(val) {
  var s;
  var n;

  if (typeof val === "number") return isNaN(val) ? null : val;

  s = String(val || "").replace(",", ".");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(s)) return null;

  n = Number(s);
  return isNaN(n) ? null : n;
}

function normalizeRestoreTagName(rawName) {
  var s = String(rawName || "");
  s = trimRestoreString(s);
  s = s.replace(/\s+/g, "_");
  s = s.replace(/^_+|_+$/g, "");
  return s;
}

function trimRestoreString(val) {
  return String(val || "").replace(/^\s+|\s+$/g, "");
}

function addRestoreMapping(out, seen, tagName, targetField, force_type) {
  var tag = normalizeRestoreTagName(tagName);
  var field = String(targetField || "").replace(/^\s+|\s+$/g, "");
  var key;

  if (!tag || !field) return;

  key = tag.toLowerCase() + "|" + field.toLowerCase();
  if (seen[key]) return null;
  seen[key] = true;

  var mapping = {
    tagName: tag,
    targetField: field,
    force_type: force_type,
    valueMode: null
  };

  out.push(mapping);
  return mapping;
}

function addRestoreMappingsFromValue(out, seen, val, defaultForce) {
  var i;
  var key;
  var item;
  var m;
  var added;

  if (!val) return;

  if (typeof val === "string") {
    m = val.match(/^\s*(.+?)\s*(?:->|=>|:)\s*(.+?)\s*$/);
    if (!m) m = val.match(/^\s*(.+?)\s+-\s+(.+?)\s*$/);
    if (m) addRestoreMapping(out, seen, m[1], m[2], defaultForce);
    return;
  }

  if (isRestoreArray(val)) {
    for (i = 0; i < val.length; i++) {
      item = val[i];
      if (typeof item === "string") {
        addRestoreMappingsFromValue(out, seen, item, defaultForce);
      } else if (item && typeof item === "object") {
        added = addRestoreMapping(
          out,
          seen,
          item.tagName || item.tag || item.name,
          item.targetField || item.field || item.to,
          item.force_type || item.forceType || defaultForce
        );
        if (added) added.valueMode = item.valueMode || item.mode || null;
      }
    }
    return;
  }

  if (typeof val === "object") {
    for (key in val) {
      item = val[key];
      if (typeof item === "string") {
        addRestoreMapping(out, seen, key, item, defaultForce);
      } else if (item && typeof item === "object") {
        added = addRestoreMapping(
          out,
          seen,
          item.tagName || item.tag || item.name || key,
          item.targetField || item.field || item.to,
          item.force_type || item.forceType || defaultForce
        );
        if (added) added.valueMode = item.valueMode || item.mode || null;
      }
    }
  }
}

function addRestoreMappingsFromAliasText(out, seen, text, defaultForce) {
  return;
}

function buildRestoreMappings(cfg, entryObj) {
  var out = [];
  var seen = {};
  var aliasFields = cfg.aliasTextFields || cfg.textFields || [];
  var i;
  var txt;

  addRestoreMappingsFromValue(out, seen, cfg.map, cfg.force_type);
  addRestoreMappingsFromValue(out, seen, cfg.fields, cfg.force_type);
  addRestoreMappingsFromValue(out, seen, cfg.mappings, cfg.force_type);

  if (typeof cfg.aliasText === "string") {
    addRestoreMappingsFromAliasText(out, seen, cfg.aliasText, cfg.force_type);
  }

  if (entryObj && aliasFields && aliasFields.length) {
    for (i = 0; i < aliasFields.length; i++) {
      txt = entryObj.field(aliasFields[i]);
      addRestoreMappingsFromAliasText(out, seen, txt, cfg.force_type);
    }
  }

  return out;
}

function restoreMappedAtags(entryObj, obj, mappings, clearFirst, valueMode, cfg) {
  var i;
  var m;
  var val;

  if (clearFirst) {
    for (i = 0; i < mappings.length; i++) {
      if (!restoreTargetExists(cfg, mappings[i].targetField)) {
        restoreDebugPush(cfg, "clear skip missing target: " + mappings[i].targetField);
        continue;
      }
      try {
        entryObj.set(mappings[i].targetField, "");
        restoreDebugPush(cfg, "clear ok: " + mappings[i].targetField);
      } catch (eClear) {
        restoreDebugPush(cfg, "clear error: " + mappings[i].targetField + " :: " + eClear);
      }
    }
  }

  for (i = 0; i < mappings.length; i++) {
    m = mappings[i];
    val = selectRestoreValue(obj[m.tagName], m.valueMode || valueMode, m.force_type);
    if (val == null) continue;
    restoreWriteTarget(
      entryObj,
      m.targetField,
      val,
      m.force_type,
      cfg,
      "map ok: " + m.tagName + " -> " + m.targetField + " = " + String(val),
      "map error: " + m.tagName + " -> " + m.targetField,
      "map skip missing target: " + m.tagName + " -> " + m.targetField
    );
  }
}

function restoreAutoAtags(entryObj, obj, cfg) {
  var suffix = cfg.suffix != null ? cfg.suffix : "_";
  var listSuffix = cfg.listSuffix != null ? cfg.listSuffix : "_l";
  var force = cfg.force_type;
  var key;
  var val;
  var isList;
  var target;
  var writeVal;
  var writeType;
  var writeLabel;

  for (key in obj) {
    try {
      val = selectRestoreValue(obj[key], cfg.valueMode, cfg.force_type);
      if (val == null) continue;

      isList = isListLikeValue(val);

      if (force === "list") {
        target = key + (listSuffix || suffix);
        restoreWriteTarget(
          entryObj, target, val, "list", cfg,
          "auto ok: " + key + " -> " + target + " = list",
          "auto error: " + key,
          "auto skip missing target: " + key + " -> " + target
        );
        continue;
      }

      if (force === "text") {
        target = key + (isList && listSuffix ? listSuffix : suffix);
        restoreWriteTarget(
          entryObj, target, val, "text", cfg,
          "auto ok: " + key + " -> " + target + " = " + String(val),
          "auto error: " + key,
          "auto skip missing target: " + key + " -> " + target
        );
        continue;
      }

      if (isList && listSuffix) {
        target = key + listSuffix;
        restoreWriteTarget(
          entryObj, target, val, "list", cfg,
          "auto ok: " + key + " -> " + target + " = list",
          "auto error: " + key,
          "auto skip missing target: " + key + " -> " + target
        );
        continue;
      }

      target = key + suffix;
      writeVal = Number(val);
      writeType = null;
      writeLabel = String(isNaN(writeVal) ? String(val) : writeVal);
      restoreWriteTarget(
        entryObj, target, val, writeType, cfg,
        "auto ok: " + key + " -> " + target + " = " + writeLabel,
        "auto error: " + key,
        "auto skip missing target: " + key + " -> " + target
      );
    } catch (e) {
      restoreDebugPush(cfg, "auto error: " + key + " :: " + e);
    }
  }
}

function restoreAtagsForEntry(entryObj, cfg, clearMappedFields) {
  var obj;
  var mappings;
  var mappedOnly;
  var val;

  if (!entryObj) return;

  if (cfg.debugField) cfg._debugLines = [];
  restoreDebugPush(cfg, "restoreAtags v2.01");
  restoreDebugPush(cfg, "sourceField: " + cfg.sourceField);
  restoreFieldNameMap(cfg);
  restoreDebugPush(cfg, "known fields: " + (cfg._fieldNameCount == null ? "unknown" : String(cfg._fieldNameCount)));
  restoreDebugPush(cfg, "clearMappedFields: " + String(clearMappedFields));

  obj = readJsonField(entryObj, cfg.sourceField);
  mappings = buildRestoreMappings(cfg, entryObj);
  restoreDebugPush(cfg, "json: " + (obj ? "ok" : "missing_or_invalid"));
  restoreDebugPush(cfg, "mappings: " + mappings.length);

  if (clearMappedFields && mappings.length) {
    restoreMappedAtags(entryObj, obj || {}, mappings, true, cfg.valueMode, cfg);
  }

  if (!obj) {
    restoreDebugFlush(entryObj, cfg);
    return;
  }

  // ===== EINZELTAG =====
  if (cfg.tagName) {
    val = selectRestoreValue(obj[cfg.tagName], cfg.valueMode, cfg.force_type);
    if (val == null) {
      restoreDebugPush(cfg, "single missing: " + cfg.tagName);
      restoreDebugFlush(entryObj, cfg);
      return;
    }

    try {
      writeValueByType(entryObj, cfg.targetField, val, cfg.force_type);
      restoreDebugPush(cfg, "single ok: " + cfg.tagName + " -> " + cfg.targetField + " = " + String(val));
    } catch (eSingle) {
      restoreDebugPush(cfg, "single error: " + cfg.tagName + " -> " + cfg.targetField + " :: " + eSingle);
    }
    restoreDebugFlush(entryObj, cfg);
    return;
  }

  if (mappings.length) {
    restoreMappedAtags(entryObj, obj, mappings, false, cfg.valueMode, cfg);
  }

  mappedOnly = cfg.mode === "exclusive" || cfg.exclusive === true || (mappings.length && cfg.additional !== true);
  if (mappedOnly) {
    restoreDebugPush(cfg, "mode: mapped_only");
    restoreDebugFlush(entryObj, cfg);
    return;
  }

  restoreAutoAtags(entryObj, obj, cfg);
  restoreDebugFlush(entryObj, cfg);
}

// ===== CORE =====
function restoreAtags(cfg) {
  cfg = cfg || {};

  var all = getRestoreEntries(cfg);
  var currentEntry = cfg.currentEntry || null;
  var limit = cfg.limit != null ? Number(cfg.limit) : (cfg.maxEntries != null ? Number(cfg.maxEntries) : null);
  var isGroup = all.length > 1;
  var clearMappedFields = cfg.clearMappedFields != null ? cfg.clearMappedFields === true : isGroup;
  var count = 0;

  if ((cfg.debugLog === true || cfg.logDebug === true) && !cfg._debugLines) cfg._debugLines = [];
  restoreDebugPush(cfg, "restoreAtags start");
  restoreDebugPush(cfg, "entries count: " + (all && all.length != null ? String(all.length) : "unknown"));

  cfg._fieldNameMap = undefined;
  cfg._fieldNameCount = undefined;

  if (currentEntry) all = restoreEntriesWithCurrent(all, currentEntry);

  for (var i = 0; i < all.length; i++) {
    if (limit != null && !isNaN(limit) && count >= limit) break;

    if (currentEntry && !restoreSameEntry(all[i], currentEntry)) {
      count++;
      continue;
    }

    try {
      restoreAtagsForEntry(all[i], cfg, clearMappedFields);
    } catch (e) {}

    count++;
  }
}

function getRestoreEntries(cfg) {
  var group;

  if (cfg.entries) return restoreToArray(cfg.entries);

  group = cfg.entryGroup || cfg.group;

  if (group) {
    if (isRestoreArray(group)) return group;
    try {
      return restoreToArray(group.entries());
    } catch (e) {}
    return restoreToArray(group);
  }

  if (cfg.entryObj) return [cfg.entryObj];
  if (cfg.currentEntry) return [cfg.currentEntry];

  return [entry()];
}

// ===== LEGACY WRAPPER =====
function bulkRestoreAtags(cfg) {
  restoreAtags(cfg);
}
