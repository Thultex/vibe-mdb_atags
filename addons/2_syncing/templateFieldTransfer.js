/*
========================================
B11 Template Field Transfer v1.03 (sys 2.50)
========================================

Changes
- keep transferred `name:_00` slots as normal `name00` input for the cleaner
- convert moved template values into normal compact or colon tags
- generate rows for string_rows and append_row/prepend_row modes
- move filled template slots between text fields on the same entry
- reset moved source slots only after the target write succeeds
- support append, prepend and replace modes with optional row labels
- delegate general tag completeness checks to collectAtags_lib
- expose a combined PostEntry helper plus the separate transfer step

Usage

var transfer = moveFilledTemplates({
  entry: e,
  sourceField: "Record",
  targetField: "Notiz",
  mode: "append"
});

var result = applyTags({
  entryObj: e,
  textFields: ["Notiz", "Record", "Atag Aliases"],
  targetField: "tags",
  targetFieldType: "tags"
});

trackTagsComplete({
  entry: e,
  templateNames: transfer.templateNames,
  result: result,
  completeField: "record_complete"
});

*/

/*
========================================
B11 Template Field Transfer v1.03 (sys 2.50)
========================================
*/

function getTemplateFieldTransferVersion() {
  return {
    name: "templateFieldTransfer",
    version: "1.03",
    sysVersion: "2.50",
    path: "addons/2_syncing/templateFieldTransfer.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("templateFieldTransfer", "1.03", "2.50", "addons/2_syncing/templateFieldTransfer.js", true);
}

function tftTrim(value) {
  return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
}

function tftResolveEntry(cfg) {
  cfg = cfg || {};
  if (cfg.entryObj) return cfg.entryObj;
  if (cfg.entry) return cfg.entry;
  if (cfg.currentEntry) return cfg.currentEntry;

  try {
    return typeof entry === "function" ? entry() : null;
  } catch (e) {
    return null;
  }
}

function tftSafeField(entryObj, fieldName) {
  if (!entryObj || !fieldName) return null;
  try {
    return entryObj.field(fieldName);
  } catch (e) {
    return null;
  }
}

function tftSafeSet(entryObj, fieldName, value) {
  if (!entryObj || !fieldName) return false;
  try {
    entryObj.set(fieldName, value);
    return true;
  } catch (e) {
    return false;
  }
}

function tftMarker(cfg) {
  var marker = cfg && cfg.templateSlotMarker;
  marker = marker == null || marker === "" ? "_" : String(marker);
  return marker.charAt(0);
}

function tftSplitLines(text) {
  return String(text == null ? "" : text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function tftToDate(value) {
  var dateObj;
  var text;
  var match;
  var year;

  if (value == null || value === "") return null;
  if (Object.prototype.toString.call(value) === "[object Date]") return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    dateObj = new Date(value);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  text = tftTrim(value);
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (match) {
    dateObj = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  match = text.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})(?:\s+(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?/);
  if (match) {
    year = Number(match[3]);
    if (year < 100) year += 2000;
    dateObj = new Date(year, Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  dateObj = new Date(value);
  return isNaN(dateObj.getTime()) ? null : dateObj;
}

function tftStepHours(hours, step, roundMode) {
  var inverse;
  step = Number(step == null ? 0.5 : step);
  if (!step || isNaN(step) || step <= 0) return hours;
  inverse = 1 / step;
  if (roundMode === "floor") return Math.floor(hours * inverse) / inverse;
  if (roundMode === "ceil") return Math.ceil(hours * inverse) / inverse;
  return Math.round(hours * inverse) / inverse;
}

function tftFormatHours(hours) {
  var rounded = Math.round(hours * 1000000) / 1000000;
  var integer = Math.round(rounded);
  var text;
  if (Math.abs(rounded - integer) < 0.000001) return String(integer);
  text = String(rounded).replace(".", ",");
  return text.replace(/0+$/, "").replace(/,$/, "");
}

function tftUsesRows(cfg) {
  var datatype = String(cfg && cfg.datatype || "").toLowerCase();
  var mode = String(cfg && cfg.mode || "append").toLowerCase();
  return datatype === "string_rows" || datatype === "rows" || cfg && (cfg.rows === true || cfg.appendRow === true || cfg.prependRow === true) || /_row$/.test(mode);
}

function tftBaseMode(cfg) {
  var mode = String(cfg && cfg.mode || "append").toLowerCase();
  if (cfg && cfg.prependRow === true) return "prepend";
  if (cfg && cfg.appendRow === true) return "append";
  mode = mode.replace(/_row$/, "");
  if (mode !== "prepend" && mode !== "replace") return "append";
  return mode;
}

function tftResolveRowLabel(entryObj, cfg) {
  var explicit = cfg && cfg.rowLabel;
  var fieldName;
  var dateObj;
  var hours;

  if (explicit != null && tftTrim(explicit) !== "") return tftTrim(explicit);
  if (!tftUsesRows(cfg)) return "";

  fieldName = cfg && (cfg.fieldDate || cfg.sourceDateField) || "Datum";
  dateObj = tftToDate(tftSafeField(entryObj, fieldName));
  if (!dateObj) dateObj = new Date();
  hours = dateObj.getHours() + dateObj.getMinutes() / 60 + dateObj.getSeconds() / 3600;
  hours = tftStepHours(hours, cfg && cfg.rowStepHours, cfg && cfg.rowRoundMode || "round");
  return tftFormatHours(hours);
}

function tftRowParts(line) {
  var match = String(line == null ? "" : line).match(/^(\s*-?\d+(?:[.,]\d+)?\s*:\s*)(.*)$/);
  if (!match) return { prefix: "", content: String(line == null ? "" : line), hasRow: false };
  return { prefix: match[1], content: match[2], hasRow: true };
}

function tftPartDelimiterRegex() {
  var tagName = "#?[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\\-]*";
  return new RegExp("(\\s*;\\s*|\\s*,\\s*(?=" + tagName + "\\s*(?:::|:|#)))", "g");
}

function tftSplitParts(content) {
  var text = String(content == null ? "" : content);
  var regex = tftPartDelimiterRegex();
  var parts = [];
  var separators = [];
  var start = 0;
  var match;

  while ((match = regex.exec(text)) !== null) {
    parts.push(text.substring(start, match.index));
    separators.push(match[0]);
    start = match.index + match[0].length;
    if (match[0].length === 0) regex.lastIndex++;
  }
  parts.push(text.substring(start));
  return { parts: parts, separators: separators };
}

function tftNormalizeName(value) {
  var text = tftTrim(value).replace(/^#+/, "").replace(/\s+/g, "_");
  return text.toLowerCase();
}

function tftUniquePush(values, seen, displayName) {
  var key = tftNormalizeName(displayName);
  if (!key || seen[key]) return;
  seen[key] = true;
  values.push(tftTrim(displayName).replace(/^#+/, ""));
}

function tftParseTemplatePart(part, cfg) {
  var text = String(part == null ? "" : part);
  var match = text.match(/^(\s*)(#?)([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_\-]*)(\s*(?:::|:|#)\s*)(.*?)(\s*)$/);
  var marker = tftMarker(cfg);
  var rawValue;
  var closed;
  var value;
  var resetValue;
  var displayValue;
  var normalTag;

  if (!match) return null;
  rawValue = match[5];
  if (!rawValue || rawValue.charAt(0) !== marker) return null;

  closed = rawValue.length > 1 && rawValue.charAt(rawValue.length - 1) === marker;
  value = closed ? rawValue.substring(1, rawValue.length - 1) : rawValue.substring(1);
  resetValue = closed ? marker + marker : marker;
  displayValue = tftTrim(value);
  if (/^(?:[+\-]?\d+(?:[.,]\d+)?|\++|-+)$/.test(displayValue)) {
    normalTag = match[2] + match[3] + displayValue;
  } else if (/^[^\s,;"']+$/.test(displayValue)) {
    normalTag = match[2] + match[3] + ": " + displayValue;
  } else {
    normalTag = match[2] + match[3] + ": \"" + displayValue.replace(/"/g, "'") + "\"";
  }

  return {
    name: match[3],
    filled: tftTrim(value) !== "",
    value: value,
    resetPart: match[1] + match[2] + match[3] + match[4] + resetValue + match[6],
    movedPart: normalTag
  };
}

function tftJoinParts(parts, separators) {
  var text = "";
  var i;
  for (i = 0; i < parts.length; i++) {
    if (i > 0) text += separators[i - 1] == null ? ", " : separators[i - 1];
    text += parts[i];
  }
  return text;
}

function tftApplyRowLabel(row, movedContent, cfg) {
  var label = cfg && (cfg._resolvedRowLabel != null ? cfg._resolvedRowLabel : cfg.rowLabel);
  var rowMode = String(cfg && cfg.rowMode || "preserve").toLowerCase();

  if (label != null && tftTrim(label) !== "" && (!row.hasRow || rowMode === "replace")) {
    return tftTrim(label) + ": " + movedContent;
  }
  return row.prefix + movedContent;
}

function tftAnalyzeSource(sourceText, cfg) {
  var lines = tftSplitLines(sourceText);
  var resetLines = [];
  var movedLines = [];
  var templateNames = [];
  var templateSeen = {};
  var i;

  for (i = 0; i < lines.length; i++) {
    var row = tftRowParts(lines[i]);
    var split = tftSplitParts(row.content);
    var resetParts = split.parts.slice(0);
    var movedParts = [];
    var j;

    for (j = 0; j < split.parts.length; j++) {
      var info = tftParseTemplatePart(split.parts[j], cfg);
      if (!info) continue;
      tftUniquePush(templateNames, templateSeen, info.name);
      if (!info.filled) continue;
      movedParts.push(info.movedPart);
      resetParts[j] = info.resetPart;
    }

    resetLines.push(row.prefix + tftJoinParts(resetParts, split.separators));
    if (movedParts.length) movedLines.push(tftApplyRowLabel(row, movedParts.join(", "), cfg));
  }

  return {
    sourceText: lines.join("\n"),
    resetText: resetLines.join("\n"),
    movedLines: movedLines,
    templateNames: templateNames
  };
}

function tftCompactTargetLines(text) {
  var lines = tftSplitLines(text);
  var out = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    if (tftTrim(lines[i])) out.push(tftTrim(lines[i]));
  }
  return out;
}

function tftContainsLine(lines, line) {
  var wanted = tftTrim(line);
  var i;
  for (i = 0; i < lines.length; i++) {
    if (tftTrim(lines[i]) === wanted) return true;
  }
  return false;
}

function tftMergeTargetText(targetText, movedLines, cfg) {
  var current = tftCompactTargetLines(targetText);
  var incoming = [];
  var mode = tftBaseMode(cfg);
  var dedupe = !cfg || cfg.dedupe !== false;
  var i;

  for (i = 0; i < movedLines.length; i++) {
    if (!tftTrim(movedLines[i])) continue;
    if (dedupe && ((mode !== "replace" && tftContainsLine(current, movedLines[i])) || tftContainsLine(incoming, movedLines[i]))) continue;
    incoming.push(tftTrim(movedLines[i]));
  }

  if (mode === "replace") return incoming.join("\n");
  if (mode === "prepend") return incoming.concat(current).join("\n");
  return current.concat(incoming).join("\n");
}

function getTemplateFieldNames(cfg) {
  cfg = cfg || {};
  var entryObj = tftResolveEntry(cfg);
  var sourceField = cfg.sourceField || "Record";
  var sourceText = cfg.sourceText != null ? cfg.sourceText : tftSafeField(entryObj, sourceField);
  return tftAnalyzeSource(sourceText, cfg).templateNames;
}

function moveFilledTemplates(cfg) {
  cfg = cfg || {};
  var entryObj = tftResolveEntry(cfg);
  var sourceField = cfg.sourceField || "Record";
  var targetField = cfg.targetField || "Notiz";
  var sourceValue;
  var targetValue;
  var analysis;
  var nextTarget;
  var transferCfg = {};
  var cfgKey;
  var result = {
    enabled: cfg.enabled !== false,
    moved: [],
    templateNames: [],
    sourceChanged: false,
    targetChanged: false,
    changed: false,
    errors: []
  };

  if (!result.enabled) return result;
  if (!entryObj) {
    result.errors.push("Entry fehlt");
    return result;
  }
  if (!sourceField || !targetField || sourceField === targetField) {
    result.errors.push("Source- und Target-Feld muessen verschieden sein");
    return result;
  }

  sourceValue = tftSafeField(entryObj, sourceField);
  targetValue = tftSafeField(entryObj, targetField);
  for (cfgKey in cfg) {
    if (Object.prototype.hasOwnProperty.call(cfg, cfgKey)) transferCfg[cfgKey] = cfg[cfgKey];
  }
  transferCfg._resolvedRowLabel = tftResolveRowLabel(entryObj, cfg);
  analysis = tftAnalyzeSource(sourceValue, transferCfg);
  result.moved = analysis.movedLines.slice(0);
  result.templateNames = analysis.templateNames.slice(0);
  result.sourceText = analysis.resetText;

  if (!analysis.movedLines.length) return result;

  nextTarget = tftMergeTargetText(targetValue, analysis.movedLines, transferCfg);
  result.targetText = nextTarget;
  result.targetChanged = nextTarget !== String(targetValue == null ? "" : targetValue);

  if (result.targetChanged && !tftSafeSet(entryObj, targetField, nextTarget)) {
    result.targetChanged = false;
    result.errors.push("Target-Feld konnte nicht geschrieben werden");
    return result;
  }

  if (analysis.resetText !== analysis.sourceText) {
    if (!tftSafeSet(entryObj, sourceField, analysis.resetText)) {
      result.errors.push("Source-Feld konnte nicht zurueckgesetzt werden");
      result.changed = result.targetChanged;
      return result;
    }
    result.sourceChanged = true;
  }

  result.changed = result.targetChanged || result.sourceChanged;
  return result;
}

function moveAndTrackTemplates(cfg) {
  cfg = cfg || {};
  var transfer = moveFilledTemplates(cfg);
  var trackCfg = {};
  var key;
  var completion;

  for (key in cfg) {
    if (Object.prototype.hasOwnProperty.call(cfg, key)) trackCfg[key] = cfg[key];
  }
  if (trackCfg.templateNames == null && trackCfg.templates == null && trackCfg.trackTemplates !== false) {
    trackCfg.templateNames = transfer.templateNames;
  }
  if (typeof trackTagsComplete === "function") completion = trackTagsComplete(trackCfg);
  else completion = {
    complete: false,
    incompleteTags: [],
    changed: false,
    errors: ["trackTagsComplete aus collectAtags_lib fehlt"]
  };

  return {
    transfer: transfer,
    completion: completion,
    moved: transfer.moved,
    templateNames: transfer.templateNames,
    incompleteTags: completion.incompleteTags,
    complete: completion.complete,
    changed: transfer.changed || completion.changed,
    errors: transfer.errors.concat(completion.errors)
  };
}
