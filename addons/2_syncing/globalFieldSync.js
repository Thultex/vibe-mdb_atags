/*
========================================
B3 Global Field Sync v1.06 (sys 3.00)
========================================
*/

function getGlobalFieldSyncVersion() {
  return {
    name: "globalFieldSync",
    version: "1.06",
    sysVersion: "3.00",
    path: "addons/2_syncing/globalFieldSync.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("globalFieldSync", "1.06", "3.00", "addons/2_syncing/globalFieldSync.js", true);
}

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

function safeSyncEntriesFromLibrary(libraryObj) {
  var all;

  if (!libraryObj) return [];

  try {
    all = libraryObj.entries();
  } catch (e) {
    return [];
  }

  if (!all || !all.length) return [];
  return all;
}

function syncEntryLibrary(entryObj) {
  if (!entryObj) return null;

  try {
    if (typeof entryObj.lib === "function") return entryObj.lib();
  } catch (e0) {}

  try {
    if (entryObj.lib) return entryObj.lib;
  } catch (e1) {}

  try {
    if (typeof entryObj.library === "function") return entryObj.library();
  } catch (e2) {}

  try {
    if (entryObj.library) return entryObj.library;
  } catch (e3) {}

  return null;
}

function safeSyncLibEntries(cfg, entryObj) {
  var libraryObj;

  cfg = cfg || {};

  if (cfg.entries && cfg.entries.length) return cfg.entries;

  libraryObj = cfg.library || cfg.lib || syncEntryLibrary(entryObj);
  if (libraryObj) return safeSyncEntriesFromLibrary(libraryObj);

  try {
    return safeSyncEntriesFromLibrary(lib());
  } catch (e) {
    return [];
  }
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

function getFirstSyncEntry(cfg, entryObj) {
  var all = safeSyncLibEntries(cfg, entryObj);
  if (!all || !all.length) return null;
  return all[0];
}

function getSyncEntries(cfg, entryObj) {
  var all = safeSyncLibEntries(cfg, entryObj);
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

  if (cfg.enabled === false) return { updated: [], skipped: [], conflicts: [] };

  var currentEntry = cfg.entryObj || cfg.entry || safeSyncEntry();
  var firstEntry = getFirstSyncEntry(cfg, currentEntry);
  var all = getSyncEntries(cfg, currentEntry);

  return syncFieldsBetweenEntries({
    sourceEntry: firstEntry,
    targetEntry: currentEntry,
    fields: cfg.fields != null ? cfg.fields : cfg.field,
    overwrite: cfg.overwrite,
    fallbackEntries: all,
    fallbackLimit: 20
  });
}

function syncFieldBack(cfg) {
  cfg = cfg || {};

  if (cfg.enabled === false) return { updated: [], skipped: [], conflicts: [] };

  var currentEntry = cfg.entryObj || cfg.entry || safeSyncEntry();
  var firstEntry = getFirstSyncEntry(cfg, currentEntry);

  return syncFieldsBetweenEntries({
    sourceEntry: currentEntry,
    targetEntry: firstEntry,
    fields: cfg.fields != null ? cfg.fields : cfg.field,
    overwrite: cfg.overwrite,
    skipEmptySource: true
  });
}

function syncFieldAll(cfg) {
  cfg = cfg || {};

  if (cfg.enabled === false) return [];

  var currentEntry = cfg.entryObj || cfg.entry || null;
  var firstEntry = getFirstSyncEntry(cfg, currentEntry);
  var all = getSyncEntries(cfg, currentEntry);
  var fields = normalizeSyncFields(cfg.fields != null ? cfg.fields : cfg.field);
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
