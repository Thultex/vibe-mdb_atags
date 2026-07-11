/*
========================================
A1 Lib Versions v1.41 (sys 2.50)
========================================

Notes
- Text output starts with `System Version X.XX (ok, X libs, X local)` or a missmatch/missing summary and ends with a blank line.
- RUN_LIB_CHECK is a visible top-level switch for the immediate verbose startup check.
- Standard report lists only remote core libs, but registered known addons are checked for version mismatches.
- Reports major version mismatches even when loaded versions are newer.
- Shared remote-library version registry.
- Load before optional lib files to collect registered versions.
- Each lib can still expose its own get...Version function.
- inputLinker_lib is no longer part of the core lib check.
- Current libs:
  - helpers_lib v2.11 (sys 2.50)
  - collectAtags_lib v1.65 (sys 2.50)
  - exportAtags_lib v1.84 (sys 2.50)

========================================
*/

// Live Config
var RUN_LIB_CHECK = true;

var SHOW_REMOTE_VERSIONS = true;
var SHOW_LOCAL_VERSIONS = true;

var SHOW_REMOTE_MISSMATCHES = true;
var SHOW_LOCAL_MISSMATCHES = true;

var SHOW_REMOTE_MISSING = true;
var SHOW_LOCAL_MISSING = true;


// Funktions and Data
var ATAG_SYS_VERSION = "2.50";
var ATAG_LIB_VERSIONS = typeof ATAG_LIB_VERSIONS !== "undefined" ? ATAG_LIB_VERSIONS : {};

function getLibVersionsVersion() {
  return {
    name: "libVersions",
    version: "1.41",
    sysVersion: "2.50",
    path: "core/_checkLibs.js"
  };
}

var ATAG_EXPECTED_LIBS = [
  { id: "#3", title: "Helpers Lib", area: "core_lib", name: "helpers_lib", version: "2.11", getter: "getHelpersLibVersion", path: "core_lib/helpers_lib.js" },
  { id: "#1", title: "Collect Atags Lib", area: "core_lib", name: "collectAtags_lib", version: "1.65", getter: "getCollectAtagsLibVersion", path: "core_lib/collectAtags_lib.js" },
  { id: "#2", title: "Export Atags Lib", area: "core_lib", name: "exportAtags_lib", version: "1.84", getter: "getExportAtagsLibVersion", path: "core_lib/exportAtags_lib.js" }
];

var ATAG_EXPECTED_OPTIONAL_LIBS = [
  { id: "A1", title: "Lib Versions", area: "core", name: "libVersions", version: "1.41", getter: "getLibVersionsVersion", path: "core/_checkLibs.js", optional: true },
  { id: "A2", title: "Atag Helpers", area: "core", name: "helpers", version: "1.03", getter: "getHelpersVersion", path: "core/helpers.js", optional: true },
  { id: "A3", title: "Restore Atags", area: "core", name: "restoreAtags", version: "2.10", getter: "getRestoreAtagsVersion", path: "core/restoreAtags.js", optional: true },
  { id: "A4", title: "Tag Cleaner", area: "core", name: "tagCleaner", version: "1.51", getter: "getTagCleanerVersion", path: "core/tagCleaner.js", optional: true },
  { id: "B2", title: "Tag Pair Parser", area: "1_tagging", name: "tagPairParser", version: "1.02", getter: "getTagPairParserVersion", path: "addons/1_tagging/tagPairParser.js", optional: true },
  { id: "B3", title: "Global Field Sync", area: "2_syncing", name: "globalFieldSync", version: "1.04", getter: "getGlobalFieldSyncVersion", path: "addons/2_syncing/globalFieldSync.js", optional: true },
  { id: "B4", title: "Sync Last From Latest", area: "2_syncing", name: "syncLastFromLatest", version: "1.06", getter: "getSyncLastFromLatestVersion", path: "addons/2_syncing/syncLastFromLatest.js", optional: true },
  { id: "B5", title: "Floating Average", area: "3_workflow", name: "floatingAverage", version: "1.01", getter: "getFloatingAverageVersion", path: "addons/3_workflow/floatingAverage.js", optional: true },
  { id: "B6", title: "Sequence Counter", area: "3_workflow", name: "sequenceCounter", version: "1.06", getter: "getSequenceCounterVersion", path: "addons/3_workflow/sequenceCounter.js", optional: true },
  { id: "B7", title: "Time Marker", area: "3_workflow", name: "timeMarker", version: "1.40", getter: "getTimeMarkerVersion", path: "addons/3_workflow/timeMarker.js", optional: true },
  { id: "B8", title: "Obsidian Linker", area: "6_integration", name: "obsidianLinker", version: "1.17", getter: "getObsidianLinkerVersion", path: "addons/6_integration/obsidianLinker.js", optional: true },
  { id: "B9", title: "Wiki Linker", area: "6_integration", name: "wikiLinker", version: "1.01", getter: "getWikiLinkerVersion", path: "addons/6_integration/wikiLinker.js", optional: true },
  { id: "B10", title: "Dust Merger", area: "2_syncing", name: "dustMerger", version: "0.13", getter: "getDustMergerVersion", path: "addons/2_syncing/dustMerger.js", optional: true },
  { id: "C1", title: "Multi Choice Helpers", area: "z_generell", name: "multiChoiceHelpers", version: "1.02", getter: "getMultiChoiceHelpersVersion", path: "addons/z_generell/multiChoiceHelpers.js", optional: true },
  { id: "C2", title: "Typed Text Fields", area: "z_generell", name: "typedTextFields", version: "1.01", getter: "getTypedTextFieldsVersion", path: "addons/z_generell/typedTextFields.js", optional: true },
  { id: "C3", title: "Hour Guide", area: "z_others", name: "hourGuide", version: "1.31", getter: "getHourGuideVersion", path: "addons/z_others/hourGuide.js", optional: true }
];

function getExpectedAtagLibs() {
  if (typeof ATAG_EXPECTED_LIBS === "undefined" || !ATAG_EXPECTED_LIBS) return [];
  if (Object.prototype.toString.call(ATAG_EXPECTED_LIBS) !== "[object Array]") return [];
  return ATAG_EXPECTED_LIBS;
}

function getExpectedAtagOptionalLibs() {
  if (typeof ATAG_EXPECTED_OPTIONAL_LIBS === "undefined" || !ATAG_EXPECTED_OPTIONAL_LIBS) return [];
  if (Object.prototype.toString.call(ATAG_EXPECTED_OPTIONAL_LIBS) !== "[object Array]") return [];
  return ATAG_EXPECTED_OPTIONAL_LIBS;
}

function getExpectedAtagLibNames() {
  var out = [];
  var i;
  var expected = getExpectedAtagLibs();
  for (i = 0; i < expected.length; i++) out.push(expected[i].name);
  return out;
}

function getExpectedAtagLibInfo(name) {
  var key = String(name || "");
  var i;
  var expected = getExpectedAtagLibs();
  for (i = 0; i < expected.length; i++) {
    if (expected[i].name === key) return expected[i];
  }
  return null;
}

function getExpectedAtagOptionalLibInfo(name) {
  var key = String(name || "");
  var i;
  var expected = getExpectedAtagOptionalLibs();
  for (i = 0; i < expected.length; i++) {
    if (expected[i].name === key) return expected[i];
  }
  return null;
}

function getExpectedAtagAnyLibInfo(name) {
  return getExpectedAtagLibInfo(name) || getExpectedAtagOptionalLibInfo(name);
}

function callExpectedAtagLibGetter(name) {
  var key = String(name || "");
  var info = getExpectedAtagAnyLibInfo(key);
  var getterName = info && info.getter ? String(info.getter || "") : "";
  var getterFn;

  if (!getterName) return null;
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(getterName)) return null;

  try {
    getterFn = eval(getterName);
  } catch (e) {
    getterFn = null;
  }

  if (typeof getterFn !== "function") return null;
  return getterFn();
}

function registerAtagLibVersion(name, version, sysVersion, path, optional) {
  var key = String(name || "");
  if (!key) return null;

  ATAG_LIB_VERSIONS[key] = {
    name: key,
    version: String(version || ""),
    sysVersion: String(sysVersion || ATAG_SYS_VERSION || ""),
    path: String(path || ""),
    optional: optional === true
  };

  logAtagRegisteredVersionMismatch(ATAG_LIB_VERSIONS[key]);
  return ATAG_LIB_VERSIONS[key];
}

function removeAtagListValue(list, value) {
  var out = [];
  var wanted = String(value || "");
  var i;

  for (i = 0; i < list.length; i++) {
    if (String(list[i] || "") !== wanted) out.push(list[i]);
  }

  return out;
}

function addAtagResultLib(result, info) {
  var key;
  var i;

  if (!result || !info || !info.name) return;

  key = String(info.name || "");
  result.map[key] = info;

  for (i = 0; i < result.libs.length; i++) {
    if (String(result.libs[i].name || "") === key) {
      result.libs[i] = info;
      return;
    }
  }

  result.libs.push(info);
}

function compareAtagVersionParts(actual, expected) {
  var a = String(actual || "").split(".");
  var e = String(expected || "").split(".");
  var len = a.length > e.length ? a.length : e.length;
  var i;
  var av;
  var ev;

  for (i = 0; i < len; i++) {
    av = parseInt(a[i] || "0", 10);
    ev = parseInt(e[i] || "0", 10);
    if (isNaN(av)) av = 0;
    if (isNaN(ev)) ev = 0;
    if (av < ev) return -1;
    if (av > ev) return 1;
  }

  return 0;
}

function atagMajorVersion(version) {
  var n = parseInt(String(version || "0").split(".")[0] || "0", 10);
  return isNaN(n) ? 0 : n;
}

function atagVersionMismatchText(name, expected, got) {
  if (String(got.sysVersion || "") !== String(expected.sysVersion || ATAG_SYS_VERSION || "")) {
    return name + " expected sys " + (expected.sysVersion || ATAG_SYS_VERSION || "") + " got sys " + (got.sysVersion || "");
  }

  if (atagMajorVersion(got.version) !== atagMajorVersion(expected.version)) {
    return name + " expected major " + atagMajorVersion(expected.version) + " got major " + atagMajorVersion(got.version) + " (" + expected.version + " vs " + got.version + ")";
  }

  if (compareAtagVersionParts(got.version, expected.version) < 0) {
    return name + " expected " + expected.version + " got " + got.version;
  }

  return "";
}

function addAtagVersionMismatch(list, text) {
  var i;

  if (!text) return;
  for (i = 0; i < list.length; i++) {
    if (String(list[i] || "") === String(text)) return;
  }
  list.push(text);
}

function sortAtagVersionList(list) {
  list.sort(function(a, b) {
    var aa = String(a.name || "").toLowerCase();
    var bb = String(b.name || "").toLowerCase();
    if (aa < bb) return -1;
    if (aa > bb) return 1;
    return 0;
  });
}

function atagVersionLine(info, prefix) {
  return String(prefix || "") + info.name + " v" + info.version + " (sys " + info.sysVersion + ")";
}

function atagDisplayName(name) {
  var info = getExpectedAtagAnyLibInfo(name);
  if (!info) return String(name || "");
  if (info.id && info.title && info.area) return info.id + " " + info.title + " (" + info.area + ")";
  if (info.id && info.title) return info.id + " " + info.title;
  return String(info.name || name || "");
}

function atagCheckOptions(cfg) {
  return {
    showRemoteVersions: cfg.showRemoteVersions !== false && SHOW_REMOTE_VERSIONS !== false,
    showLocalVersions: cfg.showLocalVersions !== false && SHOW_LOCAL_VERSIONS !== false,
    showRemoteMissmatches: cfg.showRemoteMissmatches !== false && SHOW_REMOTE_MISSMATCHES !== false,
    showLocalMissmatches: cfg.showLocalMissmatches !== false && SHOW_LOCAL_MISSMATCHES !== false,
    showRemoteMissing: cfg.showRemoteMissing !== false && SHOW_REMOTE_MISSING !== false,
    showLocalMissing: cfg.showLocalMissing !== false && SHOW_LOCAL_MISSING !== false
  };
}

function addAtagLocalLoaded(loaded, items, info) {
  var name = info && info.name ? String(info.name || "") : "";
  if (!name || loaded[name]) return false;
  loaded[name] = true;
  items.push(info);
  return true;
}

function atagLibCheckSummaryLine(libMismatchCount, localMismatchCount, missingCount, libCount, localCount) {
  var status = "";
  var counts = [];

  if (libMismatchCount === 0 && localMismatchCount === 0 && missingCount === 0) {
    return "System Version " + ATAG_SYS_VERSION + " (ok, " + libCount + " libs, " + localCount + " local)";
  } else if ((libMismatchCount > 0 || localMismatchCount > 0) && missingCount > 0) {
    status = "missmatch/missing";
  } else if (libMismatchCount > 0 || localMismatchCount > 0) {
    status = "missmatch";
  } else {
    status = "missing";
  }

  if (libMismatchCount > 0) counts.push(libMismatchCount + " libs");
  if (localMismatchCount > 0) counts.push(localMismatchCount + " local");
  if (missingCount > 0) counts.push(missingCount + " missing");

  return "System Version " + ATAG_SYS_VERSION + " (" + status + ", " + counts.join(", ") + ")";
}

function logAtagRegisteredVersionMismatch(info) {
  var expected;
  var text;

  if (!info || !info.name) return;
  expected = getExpectedAtagOptionalLibInfo(info.name) || null;
  if (!expected) return;
  text = atagVersionMismatchText(info.name, expected, info);
  if (!text || SHOW_LOCAL_MISSMATCHES === false) return;
  if (typeof log === "function") {
    log(
      atagLibCheckSummaryLine(0, 1, 0, 0, 1) + "\n" +
      "VERSION LOCAL: " + text + "\n\n"
    );
  }
}

function checkLibVersions(cfg) {
  cfg = cfg || {};
  var names = cfg.names || cfg.libs || null;
  var asText = cfg.asText === true || cfg.format === "text";
  var requireAll = cfg.requireAll !== false;
  var optionalNames = cfg.optionalNames || cfg.optional || [];
  var verbose = cfg.verbose === true;
  var out = [];
  var missing = [];
  var optionalMissing = [];
  var map = {};
  var optionalMap = {};
  var i;
  var name;
  var info;
  var text;

  if (Object.prototype.toString.call(optionalNames) !== "[object Array]") optionalNames = [optionalNames];
  for (i = 0; i < optionalNames.length; i++) optionalMap[String(optionalNames[i] || "")] = true;

  if (!names) {
    for (name in ATAG_LIB_VERSIONS) {
      if (ATAG_LIB_VERSIONS.hasOwnProperty(name)) out.push(ATAG_LIB_VERSIONS[name]);
    }
  } else {
    if (Object.prototype.toString.call(names) !== "[object Array]") names = [names];
    for (i = 0; i < names.length; i++) {
      name = String(names[i] || "");
      info = ATAG_LIB_VERSIONS[name] || null;
      if (info) out.push(info);
      else if (optionalMap[name]) optionalMissing.push(name);
      else if (requireAll) missing.push(name);
    }
  }

  out.sort(function(a, b) {
    var aa = String(a.name || "").toLowerCase();
    var bb = String(b.name || "").toLowerCase();
    if (aa < bb) return -1;
    if (aa > bb) return 1;
    return 0;
  });

  for (i = 0; i < out.length; i++) map[out[i].name] = out[i];

  if (asText || verbose) {
    var lines = [];
    for (i = 0; i < out.length; i++) {
      lines.push(out[i].name + " v" + out[i].version + " (sys " + out[i].sysVersion + ")");
    }
    for (i = 0; i < missing.length; i++) lines.push("MISSING RMT: " + atagDisplayName(missing[i]));
    for (i = 0; i < optionalMissing.length; i++) lines.push("MISSING RMT: " + atagDisplayName(optionalMissing[i]));
    text = lines.join("\n") + "\n\n";
    if (verbose && typeof log === "function") log(text);
    if (asText) return text;
  }

  return {
    ok: missing.length === 0,
    libs: out,
    map: map,
    missing: missing,
    optionalMissing: optionalMissing,
    text: text || ""
  };
}

function checkAtagLibVersions(cfg) {
  cfg = cfg || {};
  var names = cfg.names || cfg.libs || getExpectedAtagLibNames();
  var accessCheck = cfg.checkAccess === true || cfg.checkCallable === true || cfg.checkParse === true;
  var asText = cfg.asText === true || cfg.format === "text";
  var allVersions = cfg.allVersions === true || cfg.all === true || cfg.versions === true;
  var requireAll = cfg.requireAll !== false;
  var verbose = cfg.verbose === true;
  var optionalNames = [];
  var result;
  var access = [];
  var accessMissing = [];
  var optionalAccessMissing = [];
  var versionMismatch = [];
  var libVersionMismatch = [];
  var localVersionMismatch = [];
  var localLoaded = {};
  var localLoadedItems = [];
  var localMissing = [];
  var info;
  var got;
  var i;
  var name;
  var text;
  var options = atagCheckOptions(cfg);
  var shownLibVersionMismatch;
  var shownLocalVersionMismatch;
  var expected = getExpectedAtagLibs();
  var optionalExpected = getExpectedAtagOptionalLibs();
  var checkOptionalRegistered = cfg.checkOptionalRegistered !== false && cfg.remoteOnly !== true;

  if (allVersions) names = getExpectedAtagLibNames();
  if (Object.prototype.toString.call(names) !== "[object Array]") names = [names];
  for (i = 0; i < expected.length; i++) {
    if (expected[i].optional === true) optionalNames.push(expected[i].name);
  }
  for (i = 0; i < optionalExpected.length; i++) {
    optionalNames.push(optionalExpected[i].name);
  }
  result = checkLibVersions({
    names: names,
    requireAll: requireAll,
    optionalNames: optionalNames,
    asText: false
  });

  for (i = 0; i < names.length; i++) {
    name = String(names[i] || "");
    info = getExpectedAtagAnyLibInfo(name);
    if (!info || !result.map[name]) continue;
    text = atagVersionMismatchText(name, info, result.map[name]);
    addAtagVersionMismatch(versionMismatch, text);
    if (info.optional === true) addAtagVersionMismatch(localVersionMismatch, text);
    else addAtagVersionMismatch(libVersionMismatch, text);
  }

  if (checkOptionalRegistered) {
    for (i = 0; i < optionalExpected.length; i++) {
      name = optionalExpected[i].name;
      got = ATAG_LIB_VERSIONS[name] || callExpectedAtagLibGetter(name);
      if (!got) {
        if (options.showLocalMissing) localMissing.push(name);
        continue;
      }
      addAtagLocalLoaded(localLoaded, localLoadedItems, got);
      text = atagVersionMismatchText(name, optionalExpected[i], got);
      addAtagVersionMismatch(versionMismatch, text);
      addAtagVersionMismatch(localVersionMismatch, text);
    }
  }

  if (accessCheck) {
    for (i = 0; i < names.length; i++) {
      name = String(names[i] || "");
      info = getExpectedAtagAnyLibInfo(name);
      if (!info) continue;
      got = callExpectedAtagLibGetter(name);
      if (!got) {
        if (info.optional === true) {
          if (options.showRemoteMissing) optionalAccessMissing.push(name);
          continue;
        }
        if (requireAll && options.showRemoteMissing) accessMissing.push(name);
        else if (options.showRemoteMissing) optionalAccessMissing.push(name);
        continue;
      }
      access.push(got);
      addAtagResultLib(result, got);
      result.missing = removeAtagListValue(result.missing, name);
      result.optionalMissing = removeAtagListValue(result.optionalMissing, name);
      text = atagVersionMismatchText(name, info, got);
      addAtagVersionMismatch(versionMismatch, text);
      if (info.optional === true) addAtagVersionMismatch(localVersionMismatch, text);
      else addAtagVersionMismatch(libVersionMismatch, text);
    }
  }

  result.access = access;
  result.accessMissing = accessMissing;
  result.optionalAccessMissing = optionalAccessMissing;
  result.versionMismatch = versionMismatch;
  result.libVersionMismatch = libVersionMismatch;
  result.localVersionMismatch = localVersionMismatch;
  result.localLoadedCount = localLoadedItems.length;
  result.local = localLoadedItems;
  result.localMissing = localMissing;
  if (!options.showRemoteMissing) result.missing = [];
  shownLibVersionMismatch = options.showRemoteMissmatches ? libVersionMismatch : [];
  shownLocalVersionMismatch = options.showLocalMissmatches ? localVersionMismatch : [];
  result.ok = result.ok &&
    accessMissing.length === 0 &&
    localMissing.length === 0 &&
    shownLibVersionMismatch.length === 0 &&
    shownLocalVersionMismatch.length === 0;
  sortAtagVersionList(result.libs);
  sortAtagVersionList(result.local);

  if (asText || verbose) {
    var lines = [];
    var missingCount = result.missing.length + accessMissing.length + localMissing.length;
    lines.push(atagLibCheckSummaryLine(
      shownLibVersionMismatch.length,
      shownLocalVersionMismatch.length,
      missingCount,
      result.libs.length,
      result.localLoadedCount
    ));
    if (options.showRemoteVersions) {
      for (i = 0; i < result.libs.length; i++) {
        lines.push(atagVersionLine(result.libs[i], ""));
      }
    }
    if (options.showLocalVersions) {
      for (i = 0; i < result.local.length; i++) {
        lines.push(atagVersionLine(result.local[i], "LOCAL "));
      }
    }
    for (i = 0; i < shownLibVersionMismatch.length; i++) lines.push("VERSION RMT: " + shownLibVersionMismatch[i]);
    if (options.showRemoteMissing) {
      for (i = 0; i < result.missing.length; i++) lines.push("MISSING RMT: " + atagDisplayName(result.missing[i]));
      for (i = 0; i < accessMissing.length; i++) lines.push("MISSING RMT: " + atagDisplayName(accessMissing[i]));
      for (i = 0; i < optionalAccessMissing.length; i++) lines.push("MISSING RMT: " + atagDisplayName(optionalAccessMissing[i]));
    }
    for (i = 0; i < shownLocalVersionMismatch.length; i++) lines.push("VERSION LOCAL: " + shownLocalVersionMismatch[i]);
    if (options.showLocalMissing) {
      for (i = 0; i < localMissing.length; i++) lines.push("MISSING LOCAL: " + atagDisplayName(localMissing[i]));
    }
    text = lines.join("\n") + "\n\n";
    result.text = text;
    if (verbose && typeof log === "function") log(text);
    if (asText) return text;
  }

  return result;
}

if (RUN_LIB_CHECK) {
  var libCheck = checkAtagLibVersions({
    checkAccess: true,
    requireAll: false,
    allVersions: true,
    verbose: true
  });
}
