/*
========================================
B10 Dust Merger v0.12 (sys 2.40)
========================================

Changes
- default merge window is 28 hours; no_target attempt logs do not count as already merged
- skip empty template slots when merging string_rows
- add cross-midnight target grace and source-side attempt status log
- forceMergeField appends string_rows even when rows already exist
- add timestamp, target id and unchanged fields to debug output
- store latest trash status in source-side merge stop marker
- add forceMergeField overwrite for intentional re-merge
- add rowSourceMode realtime_since for row labels relative to target date
- write a source-side stop marker after successful merge
- skip entries with source-side stop markers before counting searchLimit
- use merge-json stop markers instead of trash state for merge exclusion
- add debugField and skip already merged source entries via merge log
- parse own merge log without requiring JSON.parse
- expose trashAttempted when source trashing is requested
- use entry id as tie-breaker for equal merge dates
- add optional skipField/blockField checkbox guard on the current entry
- add first DustMerger sync addon
- merge a newer current entry into an older nearby entry
- support string, string_rows, tag, number maps
- write merge metadata into a JSON/text field
- trash the merged source entry and open the target entry by default

Usage

dustMerge({
  fieldDate: "Datum",
  titleField: "Titel",
  mergeJsonField: "Merge Json",
  debugField: "Debug",
  searchLimit: 5,
  mergeWindowHours: 28,
  rowSourceMode: "realtime",
  skipField: "Nicht mergen",
  forceMergeField: "Merge erzwingen",
  trashMergedEntry: true,
  openTargetEntry: true,
  map: [
    { name: "Notiz", mode: "append", datatype: "string_rows" },
    { name: "Record", mode: "prepend", datatype: "string_rows" },
    { name: "Tags", mode: "append", datatype: "tag" }
  ],
  blockMap: [
    { name: "Status" }
  ]
});

*/

/*
========================================
B10 Dust Merger v0.12 (sys 2.40)
========================================
*/

var DUST_MERGER_VERSION = "0.12";

function dmTrim(s) {
  return String(s == null ? "" : s).replace(/^\s+|\s+$/g, "");
}

function dmIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function dmToArray(val) {
  var out = [];
  var len;
  var i;
  var next;

  if (val == null) return out;
  if (dmIsArray(val)) return val.slice(0);

  try {
    len = Number(val.length);
    if (!isNaN(len) && len >= 0 && Math.floor(len) === len && typeof val !== "string") {
      for (i = 0; i < len; i++) out.push(val[i]);
      return out;
    }
  } catch (e0) {}

  try {
    len = Number(val.length());
    if (!isNaN(len) && len >= 0 && Math.floor(len) === len) {
      for (i = 0; i < len; i++) {
        try {
          out.push(typeof val.get === "function" ? val.get(i) : val[i]);
        } catch (e1) {}
      }
      return out;
    }
  } catch (e2) {}

  try {
    if (typeof val.iterator === "function") {
      val = val.iterator();
      while (val.hasNext()) out.push(val.next());
      return out;
    }
  } catch (e3) {}

  try {
    if (typeof val.hasNext === "function") {
      while (val.hasNext()) {
        next = val.next();
        if (next != null) out.push(next);
      }
      return out;
    }
  } catch (e4) {}

  out.push(val);
  return out;
}

function dmSafeEntry() {
  try {
    return typeof entry === "function" ? entry() : null;
  } catch (e) {
    return null;
  }
}

function dmSafeLib(entryObj) {
  var libraryObj;

  if (entryObj) {
    try {
      if (typeof entryObj.library === "function") {
        libraryObj = entryObj.library();
        if (libraryObj) return libraryObj;
      }
    } catch (e0) {}

    try {
      if (entryObj.library) return entryObj.library;
    } catch (e1) {}
  }

  try {
    return typeof lib === "function" ? lib() : null;
  } catch (e2) {
    return null;
  }
}

function dmSafeEntries(libraryObj) {
  try {
    return dmToArray(libraryObj && typeof libraryObj.entries === "function" ? libraryObj.entries() : []);
  } catch (e) {
    return [];
  }
}

function dmSafeField(entryObj, fieldName) {
  if (!entryObj || !fieldName) return null;
  try {
    return entryObj.field(fieldName);
  } catch (e) {
    return null;
  }
}

function dmSafeSet(entryObj, fieldName, value) {
  if (!entryObj || !fieldName) return false;
  try {
    entryObj.set(fieldName, value);
    return true;
  } catch (e) {
    return false;
  }
}

function dmEntryId(entryObj) {
  if (!entryObj) return "";
  try {
    if (typeof entryObj.id === "function") return String(entryObj.id());
  } catch (e0) {}
  try {
    if (entryObj.id != null) return String(entryObj.id);
  } catch (e1) {}
  return "";
}

function dmSameEntry(a, b) {
  var aid;
  var bid;

  if (a === b) return true;
  aid = dmEntryId(a);
  bid = dmEntryId(b);
  return !!(aid && bid && aid === bid);
}

function dmToDate(val) {
  var d;
  var s;
  var m;
  var year;

  if (val == null || val === "") return null;
  if (Object.prototype.toString.call(val) === "[object Date]") return isNaN(val.getTime()) ? null : val;

  if (typeof val === "number") {
    d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  s = dmTrim(val);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (m) {
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    return isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})(?:\s+(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (m) {
    year = Number(m[3]);
    if (year < 100) year += 2000;
    d = new Date(year, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    return isNaN(d.getTime()) ? null : d;
  }

  d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function dmDayKey(dateObj, dayStartHour) {
  var d;

  if (!dateObj) return "";
  d = new Date(dateObj.getTime());
  d.setHours(d.getHours() - Number(dayStartHour || 0));
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function dmDayStart(dateObj, dayStartHour) {
  var d;

  if (!dateObj) return null;
  d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), Number(dayStartHour || 0), 0, 0, 0);
  if (dateObj.getTime() < d.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

function dmPreviousDayGraceMatches(candidateDate, currentDate, dayStartHour, windowHours) {
  var currentStart;
  var previousStart;
  var previousKeyDate;
  var currentFromPreviousStartHours;
  var deltaHours;

  if (!candidateDate || !currentDate) return false;
  windowHours = Number(windowHours);
  if (isNaN(windowHours) || windowHours < 0) return false;

  currentStart = dmDayStart(currentDate, dayStartHour);
  if (!currentStart) return false;

  previousKeyDate = new Date(currentStart.getTime());
  previousKeyDate.setDate(previousKeyDate.getDate() - 1);
  if (dmDayKey(candidateDate, dayStartHour) !== dmDayKey(previousKeyDate, dayStartHour)) return false;

  previousStart = new Date(currentStart.getTime());
  previousStart.setDate(previousStart.getDate() - 1);
  currentFromPreviousStartHours = (currentDate.getTime() - previousStart.getTime()) / 3600000;
  deltaHours = (currentDate.getTime() - candidateDate.getTime()) / 3600000;
  return currentFromPreviousStartHours >= 0 &&
    deltaHours >= 0 &&
    currentFromPreviousStartHours <= windowHours &&
    deltaHours <= windowHours;
}

function dmStepHours(hours, step, roundMode) {
  var inv;

  step = Number(step == null ? 0.5 : step);
  if (!step || isNaN(step) || step <= 0) return hours;
  inv = 1 / step;
  if (roundMode === "floor") return Math.floor(hours * inv) / inv;
  if (roundMode === "ceil") return Math.ceil(hours * inv) / inv;
  return Math.round(hours * inv) / inv;
}

function dmFormatHours(hours) {
  var rounded = Math.round(hours * 1000000) / 1000000;
  var intVal = Math.round(rounded);
  var s;

  if (Math.abs(rounded - intVal) < 0.000001) return String(intVal);
  s = String(rounded).replace(".", ",");
  s = s.replace(/0+$/, "");
  s = s.replace(/,$/, "");
  return s;
}

function dmRowLabel(sourceDate, targetDate, cfg, rowOffsetHours) {
  var hours;
  var mode = String(cfg.rowSourceMode || cfg.sourceMode || "realtime").toLowerCase();

  if (!sourceDate) return "";
  if (mode === "realtime_since" || mode === "since" || mode === "relative") {
    if (!targetDate) return "";
    hours = (sourceDate.getTime() - targetDate.getTime()) / 3600000;
    hours += Number(rowOffsetHours || 0);
  } else {
    hours = sourceDate.getHours() + sourceDate.getMinutes() / 60 + sourceDate.getSeconds() / 3600;
  }
  hours = dmStepHours(hours, cfg.rowStepHours == null ? 0.5 : cfg.rowStepHours, cfg.rowRoundMode || "round");
  return dmFormatHours(hours);
}

function dmLooksLikeRow(line) {
  return /^\s*-?\d+(?:[,.]\d+)?\s*:/.test(String(line || ""));
}

function dmSplitRowLine(line) {
  var m = String(line || "").match(/^\s*(-?\d+(?:[,.]\d+)?)\s*:\s*(.*)$/);
  if (!m) return null;
  return {
    value: Number(String(m[1]).replace(",", ".")),
    content: dmTrim(m[2])
  };
}

function dmIsEmptyTemplateSlotLine(line) {
  var row = dmSplitRowLine(line);
  var text = row ? row.content : dmTrim(line);
  var parts = text.split(/\s*[;,]\s*/);
  var re = /^#?[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*\s*(?:::|:|#)\s*_{1,2}\s*$/;
  var i;

  if (!parts.length) return false;
  for (i = 0; i < parts.length; i++) {
    if (!re.test(dmTrim(parts[i]))) return false;
  }
  return true;
}

function dmTextLines(text) {
  var raw = String(text == null ? "" : text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var out = [];
  var i;
  var line;

  for (i = 0; i < raw.length; i++) {
    line = dmTrim(raw[i]);
    if (line) out.push(line);
  }
  return out;
}

function dmJoinText(lines) {
  return lines.join("\n");
}

function dmAppendUniqueLine(lines, line) {
  var i;

  line = dmTrim(line);
  if (!line) return false;
  for (i = 0; i < lines.length; i++) {
    if (dmTrim(lines[i]) === line) return false;
  }
  lines.push(line);
  return true;
}

function dmPrependUniqueLine(lines, line) {
  var i;

  line = dmTrim(line);
  if (!line) return false;
  for (i = 0; i < lines.length; i++) {
    if (dmTrim(lines[i]) === line) return false;
  }
  lines.unshift(line);
  return true;
}

function dmTagText(tag) {
  var text;

  if (tag == null) return "";
  try {
    if (tag.name != null) return dmTrim(tag.name);
  } catch (e0) {}
  try {
    if (typeof tag.name === "function") return dmTrim(tag.name());
  } catch (e1) {}
  text = dmTrim(tag);
  return text;
}

function dmMergeTags(targetEntry, sourceEntry, fieldName, mode) {
  var current = dmToArray(dmSafeField(targetEntry, fieldName));
  var incoming = dmToArray(dmSafeField(sourceEntry, fieldName));
  var seen = {};
  var out = [];
  var changed = false;
  var i;
  var tag;

  for (i = 0; i < current.length; i++) {
    tag = dmTagText(current[i]);
    if (!tag || seen[tag]) continue;
    seen[tag] = true;
    out.push(tag);
  }

  for (i = 0; i < incoming.length; i++) {
    tag = dmTagText(incoming[i]);
    if (!tag || seen[tag]) continue;
    seen[tag] = true;
    if (mode === "prepend") out.unshift(tag);
    else out.push(tag);
    changed = true;
  }

  if (changed) dmSafeSet(targetEntry, fieldName, out);
  return changed;
}

function dmMergeString(targetEntry, sourceEntry, fieldName, mode) {
  var current = dmSafeField(targetEntry, fieldName);
  var incoming = dmSafeField(sourceEntry, fieldName);
  var curText = current == null ? "" : String(current);
  var inText = incoming == null ? "" : String(incoming);
  var nextText;

  if (!dmTrim(inText)) return false;
  if (mode === "replace" || mode === "string") nextText = inText;
  else if (mode === "prepend") nextText = dmTrim(curText) ? inText + "\n" + curText : inText;
  else nextText = dmTrim(curText) ? curText + "\n" + inText : inText;
  if (nextText === curText) return false;
  return dmSafeSet(targetEntry, fieldName, nextText);
}

function dmMergeStringRows(targetEntry, sourceEntry, fieldName, mode, sourceDate, targetDate, cfg, forceMerge) {
  var current = dmTextLines(dmSafeField(targetEntry, fieldName));
  var source = dmTextLines(dmSafeField(sourceEntry, fieldName));
  var sourceMode = String(cfg.rowSourceMode || cfg.sourceMode || "realtime").toLowerCase();
  var label = dmRowLabel(sourceDate, targetDate, cfg, 0);
  var changed = false;
  var i;
  var line;
  var row;

  for (i = 0; i < source.length; i++) {
    if (dmIsEmptyTemplateSlotLine(source[i])) continue;
    row = dmSplitRowLine(source[i]);
    if (row && (sourceMode === "realtime_since" || sourceMode === "since" || sourceMode === "relative")) {
      line = dmRowLabel(sourceDate, targetDate, cfg, row.value) + ": " + row.content;
    } else {
      line = row ? source[i] : label + ": " + source[i];
    }
    if (forceMerge) {
      if (mode === "prepend") current.unshift(line);
      else current.push(line);
      changed = true;
    } else if (mode === "prepend") {
      changed = dmPrependUniqueLine(current, line) || changed;
    } else {
      changed = dmAppendUniqueLine(current, line) || changed;
    }
  }

  if (changed) dmSafeSet(targetEntry, fieldName, dmJoinText(current));
  return changed;
}

function dmNumber(val) {
  var n = Number(val);
  return isNaN(n) ? 0 : n;
}

function dmMergeNumber(targetEntry, sourceEntry, fieldName, mode) {
  var current = dmNumber(dmSafeField(targetEntry, fieldName));
  var incoming = dmNumber(dmSafeField(sourceEntry, fieldName));
  var nextVal;

  if (mode === "subtract") nextVal = current - incoming;
  else if (mode === "replace" || mode === "string") nextVal = incoming;
  else nextVal = current + incoming;
  if (nextVal === current) return false;
  return dmSafeSet(targetEntry, fieldName, nextVal);
}

function dmNormalizeMap(map) {
  var out = [];
  var i;
  var item;

  if (map == null) return out;
  if (!dmIsArray(map)) map = [map];
  for (i = 0; i < map.length; i++) {
    item = map[i] || {};
    if (typeof item === "string") item = { name: item };
    if (!item.name && item.field) item.name = item.field;
    if (!item.name) continue;
    out.push({
      name: String(item.name),
      mode: String(item.mode || item.syncmode || "append").toLowerCase(),
      datatype: String(item.datatype || item.type || "string").toLowerCase()
    });
  }
  return out;
}

function dmIsEmptyValue(value) {
  if (value == null) return true;
  if (dmIsArray(value)) return value.length === 0;
  if (typeof value === "number") return value === 0;
  if (typeof value === "boolean") return value === false;
  return dmTrim(value) === "";
}

function dmBlockMerge(targetEntry, cfg, result) {
  var blockMap = cfg.blockMap || cfg.blockmap || [];
  var i;
  var item;
  var value;
  var text;
  var re;

  if (!dmIsArray(blockMap)) blockMap = [blockMap];
  for (i = 0; i < blockMap.length; i++) {
    item = blockMap[i] || {};
    if (typeof item === "string") item = { name: item };
    if (!item.name && item.field) item.name = item.field;
    if (!item.name) continue;

    value = dmSafeField(targetEntry, item.name);
    text = value == null ? "" : String(value);
    if (item.blockRegex || item.regex) {
      re = new RegExp(item.blockRegex || item.regex);
      if (!re.test(text)) {
        result.blocked.push(item.name);
        return true;
      }
    } else if (!dmIsEmptyValue(value)) {
      result.blocked.push(item.name);
      return true;
    }
  }

  return false;
}

function dmIsTruthyValue(value) {
  var text;

  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "number") return value !== 0;
  text = dmTrim(value).toLowerCase();
  return !(text === "" || text === "0" || text === "false" || text === "no" || text === "off" || text === "nein");
}

function dmSortByDateDesc(entries, fieldDate) {
  return entries.slice(0).sort(function(a, b) {
    var da = dmToDate(dmSafeField(a, fieldDate));
    var db = dmToDate(dmSafeField(b, fieldDate));
    var ta = da ? da.getTime() : 0;
    var tb = db ? db.getTime() : 0;
    var aid;
    var bid;

    if (tb !== ta) return tb - ta;
    aid = dmEntryId(a);
    bid = dmEntryId(b);
    if (aid && bid && aid !== bid) return aid < bid ? 1 : -1;
    return 0;
  });
}

function dmCandidateIsOlderByDateOrId(candidate, currentEntry, candidateDate, currentDate) {
  var candidateTime;
  var currentTime;
  var candidateId;
  var currentId;

  if (!candidateDate || !currentDate) return false;
  candidateTime = candidateDate.getTime();
  currentTime = currentDate.getTime();
  if (candidateTime < currentTime) return true;
  if (candidateTime > currentTime) return false;

  candidateId = dmEntryId(candidate);
  currentId = dmEntryId(currentEntry);
  if (!candidateId || !currentId || candidateId === currentId) return false;
  return candidateId < currentId;
}

function dmFindTargetEntry(currentEntry, currentDate, entries, cfg) {
  var fieldDate = cfg.fieldDate || "Datum";
  var dayStartHour = Number(cfg.dayStartHour || 0);
  var windowHours = Number(cfg.mergeWindowHours == null ? 28 : cfg.mergeWindowHours);
  var searchLimit = Number(cfg.searchLimit == null ? 5 : cfg.searchLimit);
  var currentKey = dmDayKey(currentDate, dayStartHour);
  var sorted = dmSortByDateDesc(entries, fieldDate);
  var checked = 0;
  var i;
  var candidate;
  var candidateDate;
  var deltaHours;

  for (i = 0; i < sorted.length; i++) {
    candidate = sorted[i];
    if (dmSameEntry(candidate, currentEntry)) continue;
    if (dmEntryHasMergeStop(candidate, cfg)) continue;
    if (searchLimit >= 0 && checked >= searchLimit) break;
    checked++;

    candidateDate = dmToDate(dmSafeField(candidate, fieldDate));
    if (!candidateDate) continue;
    if (!dmCandidateIsOlderByDateOrId(candidate, currentEntry, candidateDate, currentDate)) continue;
    deltaHours = (currentDate.getTime() - candidateDate.getTime()) / 3600000;
    if (dmDayKey(candidateDate, dayStartHour) !== currentKey &&
      !dmPreviousDayGraceMatches(candidateDate, currentDate, dayStartHour, windowHours)) continue;
    if (deltaHours >= 0 && deltaHours <= windowHours) return candidate;
  }

  return null;
}

function dmReadMergeLog(targetEntry, fieldName) {
  var raw;
  var parsed;
  var text;
  var re;
  var m;
  var out = [];
  var objText;
  var idMatch;
  var timeMatch;
  var stopMatch;
  var mergedIntoIdMatch;
  var fieldsMatch;
  var statusMatch;

  if (!fieldName) return [];
  raw = dmSafeField(targetEntry, fieldName);
  if (!dmTrim(raw)) return [];
  text = String(raw);
  try {
    parsed = JSON.parse(text);
    return dmIsArray(parsed) ? parsed : [];
  } catch (e) {
    re = /\{[^{}]*\}/g;
    while ((m = re.exec(text)) !== null) {
      objText = m[0];
      idMatch = objText.match(/"id"\s*:\s*"([^"]*)"/);
      timeMatch = objText.match(/"time"\s*:\s*"([^"]*)"/);
      stopMatch = objText.match(/"stop"\s*:\s*(true|false|"true"|"false")/);
      mergedIntoIdMatch = objText.match(/"mergedIntoId"\s*:\s*"([^"]*)"/);
      fieldsMatch = objText.match(/"fields"\s*:\s*(-?\d+(?:\.\d+)?)/);
      statusMatch = objText.match(/"status"\s*:\s*"([^"]*)"/);
      out.push({
        id: idMatch ? idMatch[1] : "",
        time: timeMatch ? timeMatch[1] : "",
        status: statusMatch ? statusMatch[1] : "",
        stop: stopMatch ? String(stopMatch[1]).replace(/"/g, "") === "true" : false,
        mergedIntoId: mergedIntoIdMatch ? mergedIntoIdMatch[1] : "",
        fields: fieldsMatch ? Number(fieldsMatch[1]) : 0
      });
    }
    return out;
  }
}

function dmSourceMergeIdentity(sourceEntry, cfg) {
  var sourceDate = dmToDate(dmSafeField(sourceEntry, cfg.fieldDate || "Datum"));
  var id = dmEntryId(sourceEntry);
  return {
    id: id,
    time: dmDateIsoLike(sourceDate)
  };
}

function dmAlreadyMerged(targetEntry, sourceEntry, cfg) {
  var fieldName = cfg.mergeJsonField || cfg.mergeLogField || "";
  var logItems;
  var identity;
  var i;
  var item;

  if (!fieldName) return false;
  logItems = dmReadMergeLog(targetEntry, fieldName);
  identity = dmSourceMergeIdentity(sourceEntry, cfg);

  for (i = 0; i < logItems.length; i++) {
    item = logItems[i] || {};
    if (String(item.status || "").toLowerCase() === "no_target") continue;
    if (String(item.status || "").toLowerCase() === "no_merge") continue;
    if (identity.id && String(item.id || "") === identity.id) return true;
    if (!identity.id && identity.time && String(item.time || "") === identity.time) return true;
  }

  return false;
}

function dmEntryHasMergeStop(entryObj, cfg) {
  var fieldName = cfg.mergeJsonField || cfg.mergeLogField || "";
  var logItems;
  var i;
  var item;

  if (!fieldName) return false;
  logItems = dmReadMergeLog(entryObj, fieldName);
  for (i = 0; i < logItems.length; i++) {
    item = logItems[i] || {};
    if (item.stop === true || String(item.stop || "").toLowerCase() === "true") return true;
  }
  return false;
}

function dmWriteSourceStopLog(sourceEntry, targetEntry, changedCount, cfg, result) {
  var fieldName = cfg.mergeJsonField || cfg.mergeLogField || "";
  var titleField = cfg.titleField || "";
  var sourceIdentity;
  var targetDate;
  var logItems;
  var targetId;
  var item;
  var i;

  if (!fieldName || changedCount <= 0) return false;

  sourceIdentity = dmSourceMergeIdentity(sourceEntry, cfg);
  targetDate = dmToDate(dmSafeField(targetEntry, cfg.fieldDate || "Datum"));
  targetId = dmEntryId(targetEntry);
  logItems = dmReadMergeLog(sourceEntry, fieldName);

  item = {
    id: sourceIdentity.id,
    time: sourceIdentity.time,
    title: titleField ? String(dmSafeField(sourceEntry, titleField) || "") : "",
    status: "merged",
    fields: changedCount,
    stop: true,
    mergedIntoId: targetId,
    mergedIntoTime: dmDateIsoLike(targetDate),
    trashAttempted: result ? result.trashAttempted === true : false,
    trashed: result ? result.trashed === true : false
  };

  for (i = 0; i < logItems.length; i++) {
    if (logItems[i] && logItems[i].stop === true) {
      logItems[i] = item;
      return dmSafeSet(sourceEntry, fieldName, dmStringifyMergeLog(logItems));
    }
  }

  logItems.push(item);
  return dmSafeSet(sourceEntry, fieldName, dmStringifyMergeLog(logItems));
}

function dmWriteSourceAttemptLog(sourceEntry, cfg, result, status) {
  var fieldName = cfg.mergeJsonField || cfg.mergeLogField || "";
  var titleField = cfg.titleField || "";
  var sourceIdentity;
  var logItems;
  var item;
  var i;

  if (!fieldName || !sourceEntry) return false;

  sourceIdentity = dmSourceMergeIdentity(sourceEntry, cfg);
  logItems = dmReadMergeLog(sourceEntry, fieldName);
  item = {
    id: sourceIdentity.id,
    time: sourceIdentity.time,
    title: titleField ? String(dmSafeField(sourceEntry, titleField) || "") : "",
    status: String(status || "no_merge"),
    fields: result && result.changed ? result.changed.length : 0
  };

  for (i = 0; i < logItems.length; i++) {
    if ((item.id && String(logItems[i].id || "") === item.id) || (!item.id && String(logItems[i].time || "") === item.time)) {
      logItems[i] = item;
      return dmSafeSet(sourceEntry, fieldName, dmStringifyMergeLog(logItems));
    }
  }

  logItems.unshift(item);
  return dmSafeSet(sourceEntry, fieldName, dmStringifyMergeLog(logItems));
}

function dmWriteDebug(entryObj, cfg, result, stage) {
  var fieldName = cfg.debugField || cfg.debug || "";
  var lines;

  if (!fieldName) return false;
  lines = [
    "DustMerger v" + DUST_MERGER_VERSION,
    "time: " + dmDebugTimestamp(new Date()),
    "stage: " + String(stage || ""),
    "merged: " + result.merged,
    "alreadyMerged: " + result.alreadyMerged,
    "sourceStopped: " + result.sourceStopped,
    "forceMerge: " + result.forceMerge,
    "targetId: " + dmEntryId(result.targetEntry),
    "changed: " + result.changed.join(", "),
    "unchanged: " + result.unchanged.join(", "),
    "blocked: " + result.blocked.join(", "),
    "stopWritten: " + result.stopWritten,
    "trashed: " + result.trashed,
    "trashAttempted: " + result.trashAttempted,
    "errors: " + result.errors.join(" | ")
  ];
  return dmSafeSet(entryObj, fieldName, lines.join("\n"));
}

function dmPad2(n) {
  n = Number(n);
  return n < 10 ? "0" + n : String(n);
}

function dmDebugTimestamp(dateObj) {
  dateObj = dateObj || new Date();
  return "[" +
    dmPad2(dateObj.getDate()) + "." +
    dmPad2(dateObj.getMonth() + 1) + "." +
    dmPad2(dateObj.getFullYear() % 100) + " " +
    dmPad2(dateObj.getHours()) + ":" +
    dmPad2(dateObj.getMinutes()) + "]";
}

function dmDateIsoLike(dateObj) {
  if (!dateObj) return "";
  return dateObj.getFullYear() + "-" +
    dmPad2(dateObj.getMonth() + 1) + "-" +
    dmPad2(dateObj.getDate()) + "T" +
    dmPad2(dateObj.getHours()) + ":" +
    dmPad2(dateObj.getMinutes()) + ":" +
    dmPad2(dateObj.getSeconds());
}

function dmJsonEscape(text) {
  return String(text == null ? "" : text)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

function dmStringifyMergeLog(items) {
  var parts = [];
  var i;
  var item;

  try {
    if (typeof JSON !== "undefined" && JSON && typeof JSON.stringify === "function") {
      return JSON.stringify(items);
    }
  } catch (e) {}

  for (i = 0; i < items.length; i++) {
    item = items[i] || {};
    parts.push("{\"id\":\"" + dmJsonEscape(item.id) +
      "\",\"time\":\"" + dmJsonEscape(item.time) +
      "\",\"title\":\"" + dmJsonEscape(item.title) +
      (item.status != null && item.status !== "" ? "\",\"status\":\"" + dmJsonEscape(item.status) : "") +
      "\",\"fields\":" + Number(item.fields || 0) +
      (item.stop === true ? ",\"stop\":true" : "") +
      (item.mergedIntoId != null && item.mergedIntoId !== "" ? ",\"mergedIntoId\":\"" + dmJsonEscape(item.mergedIntoId) + "\"" : "") +
      (item.mergedIntoTime != null && item.mergedIntoTime !== "" ? ",\"mergedIntoTime\":\"" + dmJsonEscape(item.mergedIntoTime) + "\"" : "") +
      (item.trashAttempted === true ? ",\"trashAttempted\":true" : "") +
      (item.trashed === true ? ",\"trashed\":true" : "") +
      "}");
  }
  return "[" + parts.join(",") + "]";
}

function dmWriteMergeLog(targetEntry, sourceEntry, changedCount, cfg) {
  var fieldName = cfg.mergeJsonField || cfg.mergeLogField || "";
  var titleField = cfg.titleField || "";
  var sourceDate = dmToDate(dmSafeField(sourceEntry, cfg.fieldDate || "Datum"));
  var logItems;
  var item;
  var i;
  var id;

  if (!fieldName || changedCount <= 0) return false;

  logItems = dmReadMergeLog(targetEntry, fieldName);
  id = dmEntryId(sourceEntry) || String(sourceDate ? sourceDate.getTime() : new Date().getTime());
  item = {
    id: id,
    time: dmDateIsoLike(sourceDate),
    title: titleField ? String(dmSafeField(sourceEntry, titleField) || "") : "",
    fields: changedCount
  };

  for (i = 0; i < logItems.length; i++) {
    if (String(logItems[i].id || "") === id) {
      logItems[i] = item;
      return dmSafeSet(targetEntry, fieldName, dmStringifyMergeLog(logItems));
    }
  }

  logItems.push(item);
  return dmSafeSet(targetEntry, fieldName, dmStringifyMergeLog(logItems));
}

function dmOpenEntry(entryObj) {
  if (!entryObj) return false;
  try {
    if (typeof entryObj.show === "function") {
      entryObj.show();
      return true;
    }
  } catch (e0) {}
  try {
    if (typeof openEntry === "function") {
      openEntry(entryObj);
      return true;
    }
  } catch (e1) {}
  return false;
}

function dmTrashEntry(entryObj) {
  if (!entryObj) return false;
  try {
    if (typeof entryObj.trash === "function") {
      entryObj.trash();
      return true;
    }
  } catch (e) {}
  return false;
}

function dmForceMergeEnabled(entryObj, cfg) {
  var fieldName = cfg.forceMergeField || cfg.overwriteMergeField || cfg.forceField || "";
  if (!fieldName) return false;
  return dmIsTruthyValue(dmSafeField(entryObj, fieldName));
}

function dustMerge(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || dmSafeEntry();
  var fieldDate = cfg.fieldDate || "Datum";
  var currentDate = dmToDate(dmSafeField(currentEntry, fieldDate));
  var libraryObj = cfg.libraryObj || cfg.libObj || dmSafeLib(currentEntry);
  var entries = cfg.entries ? dmToArray(cfg.entries) : dmSafeEntries(libraryObj);
  var forceMerge;
  var targetEntry;
  var map = dmNormalizeMap(cfg.map || cfg.processMap);
  var result = {
    version: DUST_MERGER_VERSION,
    sourceEntry: currentEntry,
    targetEntry: null,
    merged: false,
    alreadyMerged: false,
    sourceStopped: false,
    forceMerge: false,
    changed: [],
    unchanged: [],
    blocked: [],
    stopWritten: false,
    trashed: false,
    trashAttempted: false,
    opened: false,
    errors: []
  };
  var i;
  var item;
  var changed;

  if (!currentEntry) {
    result.errors.push("Aktueller Eintrag fehlt");
    dmWriteDebug(currentEntry, cfg, result, "missing_source");
    return result;
  }
  forceMerge = dmForceMergeEnabled(currentEntry, cfg);
  result.forceMerge = forceMerge;
  if (!forceMerge && dmEntryHasMergeStop(currentEntry, cfg)) {
    result.sourceStopped = true;
    dmWriteDebug(currentEntry, cfg, result, "source_stop");
    return result;
  }
  if (!currentDate) {
    result.errors.push("Datumsfeld leer oder ungültig: " + fieldDate);
    dmWriteDebug(currentEntry, cfg, result, "invalid_source_date");
    return result;
  }
  if ((cfg.skipField || cfg.blockField || cfg.disableField) && dmIsTruthyValue(dmSafeField(currentEntry, cfg.skipField || cfg.blockField || cfg.disableField))) {
    result.blocked.push(cfg.skipField || cfg.blockField || cfg.disableField);
    dmWriteDebug(currentEntry, cfg, result, "skip_field");
    return result;
  }

  targetEntry = cfg.targetEntry || dmFindTargetEntry(currentEntry, currentDate, entries, cfg);
  if (targetEntry && dmEntryHasMergeStop(targetEntry, cfg)) {
    result.errors.push("Ziel-Eintrag ist bereits als Merge-Quelle markiert");
    targetEntry = null;
  }
  result.targetEntry = targetEntry;
  if (!targetEntry) {
    dmWriteSourceAttemptLog(currentEntry, cfg, result, "no_target");
    dmWriteDebug(currentEntry, cfg, result, "no_target");
    return result;
  }

  if (!forceMerge && dmAlreadyMerged(targetEntry, currentEntry, cfg)) {
    result.alreadyMerged = true;
    dmWriteDebug(currentEntry, cfg, result, "already_merged");
    return result;
  }

  if (dmBlockMerge(targetEntry, cfg, result)) {
    dmWriteDebug(currentEntry, cfg, result, "blocked");
    return result;
  }

  for (i = 0; i < map.length; i++) {
    item = map[i];
    changed = false;

    if (item.datatype === "tag" || item.datatype === "tags") {
      changed = dmMergeTags(targetEntry, currentEntry, item.name, item.mode);
    } else if (item.datatype === "string_rows" || item.datatype === "rows") {
      changed = dmMergeStringRows(targetEntry, currentEntry, item.name, item.mode, currentDate, dmToDate(dmSafeField(targetEntry, cfg.targetDateField || fieldDate)), cfg, forceMerge);
    } else if (item.datatype === "number" || item.datatype === "int" || item.datatype === "real") {
      changed = dmMergeNumber(targetEntry, currentEntry, item.name, item.mode);
    } else {
      changed = dmMergeString(targetEntry, currentEntry, item.name, item.mode);
    }

    if (changed) result.changed.push(item.name);
    else result.unchanged.push(item.name);
  }

  result.merged = result.changed.length > 0;
  dmWriteMergeLog(targetEntry, currentEntry, result.changed.length, cfg);

  if (result.merged && cfg.trashMergedEntry !== false && cfg.trashSource !== false) {
    result.trashAttempted = true;
    result.trashed = dmTrashEntry(currentEntry);
    if (!result.trashed) result.errors.push("Quell-Eintrag konnte nicht in den Papierkorb verschoben werden");
  }
  result.stopWritten = dmWriteSourceStopLog(currentEntry, targetEntry, result.changed.length, cfg, result);
  if (result.merged && (cfg.mergeJsonField || cfg.mergeLogField) && !result.stopWritten) {
    result.errors.push("Stop-Marker konnte nicht in den Quell-Eintrag geschrieben werden");
  }

  if (result.merged && cfg.openTargetEntry !== false) {
    result.opened = dmOpenEntry(targetEntry);
  }

  dmWriteDebug(currentEntry, cfg, result, result.merged ? "merged" : "no_changes");
  return result;
}

function dustMerger(cfg) {
  return dustMerge(cfg);
}
