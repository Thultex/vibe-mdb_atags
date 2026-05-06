/*
========================================
B3 Global Field Sync v1.02 (sys 2.21)
========================================

Changes
- guard entry/lib/field access for early open triggers
- skip back-sync for empty current values
- fallback to first non-empty source value within first 20 entries
- add independent field sync addon
- sync from first entry to current entry
- sync from current entry back to first entry
- bulk sync from first entry to all entries
- support one field or a field list
- optional overwrite conflict handling

Usage

syncFieldTo({
  fields: ["Field1", "Field2"],
  overwrite: true
});

syncFieldBack({
  fields: ["Field1", "Field2"],
  overwrite: true
});

syncFieldAll({
  fields: ["Field1", "Field2"],
  overwrite: true
});

========================================
*/

function syncIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function normalizeSyncFields(fields) {
  if (fields == null) return [];
  if (!syncIsArray(fields)) fields = [fields];

  var out = [];

  for (var i = 0; i < fields.length; i++) {
    var name = String(fields[i] || "").replace(/^\s+|\s+$/g, "");
    if (name) out.push(name);
  }

  return out;
}

function cloneSyncValue(val) {
  if (syncIsArray(val)) return val.slice(0);
  return val;
}

function isEmptySyncValue(val) {
  if (val == null) return true;
  if (syncIsArray(val)) return val.length === 0;
  if (typeof val === "string") return String(val).replace(/^\s+|\s+$/g, "") === "";
  return false;
}

function safeSyncEntry() {
  try {
    return entry();
  } catch (e) {
    return null;
  }
}

function safeSyncLibEntries() {
  var all;

  try {
    all = lib().entries();
  } catch (e) {
    return [];
  }

  if (!all || !all.length) return [];
  return all;
}

function safeSyncField(entryObj, fieldName) {
  if (!entryObj || !fieldName) return null;
  try {
    return entryObj.field(fieldName);
  } catch (e) {
    return null;
  }
}

function safeSyncSet(entryObj, fieldName, val) {
  if (!entryObj || !fieldName) return false;
  try {
    entryObj.set(fieldName, val);
    return true;
  } catch (e) {
    return false;
  }
}

function syncValuesEqual(a, b) {
  var i;

  if (a === b) return true;
  if (a == null && b == null) return true;

  if (syncIsArray(a) || syncIsArray(b)) {
    if (!syncIsArray(a) || !syncIsArray(b)) return false;
    if (a.length !== b.length) return false;

    for (i = 0; i < a.length; i++) {
      if (String(a[i]) !== String(b[i])) return false;
    }

    return true;
  }

  return String(a) === String(b);
}

function getFirstSyncEntry() {
  var all = safeSyncLibEntries();
  if (!all || !all.length) return null;
  return all[0];
}

function getSyncEntries() {
  var all = safeSyncLibEntries();
  if (!all || !all.length) return [];
  return all;
}

function resolveSyncSourceValue(cfg) {
  cfg = cfg || {};

  var sourceEntry = cfg.sourceEntry;
  var fieldName = cfg.fieldName;
  var sourceVal = safeSyncField(sourceEntry, fieldName);
  var fallbackEntries = cfg.fallbackEntries;
  var fallbackLimit = cfg.fallbackLimit;
  var i;
  var scanVal;

  if (!isEmptySyncValue(sourceVal) || !fallbackEntries || !fallbackEntries.length) {
    return sourceVal;
  }

  if (fallbackLimit == null || fallbackLimit < 1) fallbackLimit = fallbackEntries.length;
  if (fallbackLimit > fallbackEntries.length) fallbackLimit = fallbackEntries.length;

  for (i = 0; i < fallbackLimit; i++) {
    scanVal = safeSyncField(fallbackEntries[i], fieldName);
    if (!isEmptySyncValue(scanVal)) return scanVal;
  }

  return sourceVal;
}

function syncFieldsBetweenEntries(cfg) {
  cfg = cfg || {};

  var sourceEntry = cfg.sourceEntry;
  var targetEntry = cfg.targetEntry;
  var fields = normalizeSyncFields(cfg.fields);
  var overwrite = cfg.overwrite === true;
  var skipEmptySource = cfg.skipEmptySource === true;
  var fallbackEntries = cfg.fallbackEntries;
  var fallbackLimit = cfg.fallbackLimit;
  var updated = [];
  var skipped = [];
  var conflicts = [];

  if (!sourceEntry || !targetEntry || !fields.length) {
    return {
      updated: updated,
      skipped: skipped,
      conflicts: conflicts
    };
  }

  for (var i = 0; i < fields.length; i++) {
    var fieldName = fields[i];
    var sourceVal = resolveSyncSourceValue({
      sourceEntry: sourceEntry,
      fieldName: fieldName,
      fallbackEntries: fallbackEntries,
      fallbackLimit: fallbackLimit
    });
    var targetVal = safeSyncField(targetEntry, fieldName);

    if (skipEmptySource && isEmptySyncValue(sourceVal)) {
      skipped.push(fieldName);
      continue;
    }

    if (syncValuesEqual(sourceVal, targetVal)) {
      skipped.push(fieldName);
      continue;
    }

    if (!overwrite && !isEmptySyncValue(targetVal)) {
      conflicts.push(fieldName);
      continue;
    }

    if (safeSyncSet(targetEntry, fieldName, cloneSyncValue(sourceVal))) {
      updated.push(fieldName);
    } else {
      skipped.push(fieldName);
    }
  }

  return {
    updated: updated,
    skipped: skipped,
    conflicts: conflicts
  };
}

function syncFieldTo(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || safeSyncEntry();
  var firstEntry = getFirstSyncEntry();
  var all = getSyncEntries();

  return syncFieldsBetweenEntries({
    sourceEntry: firstEntry,
    targetEntry: currentEntry,
    fields: cfg.fields,
    overwrite: cfg.overwrite,
    fallbackEntries: all,
    fallbackLimit: 20
  });
}

function syncFieldBack(cfg) {
  cfg = cfg || {};

  var currentEntry = cfg.entryObj || safeSyncEntry();
  var firstEntry = getFirstSyncEntry();

  return syncFieldsBetweenEntries({
    sourceEntry: currentEntry,
    targetEntry: firstEntry,
    fields: cfg.fields,
    overwrite: cfg.overwrite,
    skipEmptySource: true
  });
}

function syncFieldAll(cfg) {
  cfg = cfg || {};

  var firstEntry = getFirstSyncEntry();
  var all = getSyncEntries();
  var fields = normalizeSyncFields(cfg.fields);
  var overwrite = cfg.overwrite === true;
  var out = [];

  if (!firstEntry || !all || !all.length || !fields.length) {
    return out;
  }

  for (var i = 0; i < all.length; i++) {
    out.push(syncFieldsBetweenEntries({
      sourceEntry: firstEntry,
      targetEntry: all[i],
      fields: fields,
      overwrite: overwrite,
      fallbackEntries: all,
      fallbackLimit: 20
    }));
  }

  return out;
}
