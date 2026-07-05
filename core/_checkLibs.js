/*
========================================
A1 Lib Versions v1.16 (sys 2.30)
========================================

Notes
- Shared remote-library version registry.
- Load before optional lib files to collect registered versions.
- Each lib can still expose its own get...Version function.
- Current libs:
  - helpers_lib v2.11 (sys 2.30)
  - collectAtags_lib v1.61 (sys 2.30)
  - exportAtags_lib v1.83 (sys 2.30)
  - inputLinker_lib v0.75 (sys 2.30, optional)

========================================
*/


var RUN_LIB_CHECK = false;

if (RUN_LIB_CHECK) {
  var libCheck = checkAtagLibVersions({
    checkAccess: true,
    requireAll: false,
    allVersions: true,
    verbose: true
  });
}

var ATAG_SYS_VERSION = typeof ATAG_SYS_VERSION !== "undefined" ? ATAG_SYS_VERSION : "2.30";
var ATAG_LIB_VERSIONS = typeof ATAG_LIB_VERSIONS !== "undefined" ? ATAG_LIB_VERSIONS : {};

function getLibVersionsVersion() {
  return {
    name: "libVersions",
    version: "1.16",
    sysVersion: "2.30",
    path: "core/_checkLibs.js"
  };
}

var ATAG_EXPECTED_LIBS = [
  { name: "helpers_lib", version: "2.11", getter: "getHelpersLibVersion", path: "core_lib/helpers_lib.js" },
  { name: "collectAtags_lib", version: "1.61", getter: "getCollectAtagsLibVersion", path: "core_lib/collectAtags_lib.js" },
  { name: "exportAtags_lib", version: "1.83", getter: "getExportAtagsLibVersion", path: "core_lib/exportAtags_lib.js" },
  { name: "inputLinker_lib", version: "0.75", getter: "getInputLinkerLibVersion", path: "core_lib/inputLinker_lib.js", optional: true }
];

function getExpectedAtagLibs() {
  if (typeof ATAG_EXPECTED_LIBS === "undefined" || !ATAG_EXPECTED_LIBS) return [];
  if (Object.prototype.toString.call(ATAG_EXPECTED_LIBS) !== "[object Array]") return [];
  return ATAG_EXPECTED_LIBS;
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

function callExpectedAtagLibGetter(name) {
  var key = String(name || "");
  if (key === "helpers_lib") {
    if (typeof getHelpersLibVersion !== "function") return null;
    return getHelpersLibVersion();
  }
  if (key === "collectAtags_lib") {
    if (typeof getCollectAtagsLibVersion !== "function") return null;
    return getCollectAtagsLibVersion();
  }
  if (key === "exportAtags_lib") {
    if (typeof getExportAtagsLibVersion !== "function") return null;
    return getExportAtagsLibVersion();
  }
  if (key === "inputLinker_lib") {
    if (typeof getInputLinkerLibVersion !== "function") return null;
    return getInputLinkerLibVersion();
  }
  return null;
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

function atagVersionMismatchText(name, expected, got) {
  if (String(got.sysVersion || "") !== String(expected.sysVersion || ATAG_SYS_VERSION || "")) {
    return name + " expected sys " + (expected.sysVersion || ATAG_SYS_VERSION || "") + " got sys " + (got.sysVersion || "");
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
    for (i = 0; i < missing.length; i++) lines.push("MISSING " + missing[i]);
    for (i = 0; i < optionalMissing.length; i++) lines.push("OPTIONAL MISSING " + optionalMissing[i]);
    text = lines.join("\n");
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
  var info;
  var got;
  var i;
  var name;
  var text;
  var expected = getExpectedAtagLibs();

  if (allVersions) names = getExpectedAtagLibNames();
  if (Object.prototype.toString.call(names) !== "[object Array]") names = [names];
  for (i = 0; i < expected.length; i++) {
    if (expected[i].optional === true) optionalNames.push(expected[i].name);
  }
  result = checkLibVersions({
    names: names,
    requireAll: requireAll,
    optionalNames: optionalNames,
    asText: false
  });

  for (i = 0; i < names.length; i++) {
    name = String(names[i] || "");
    info = getExpectedAtagLibInfo(name);
    if (!info || !result.map[name]) continue;
    text = atagVersionMismatchText(name, info, result.map[name]);
    addAtagVersionMismatch(versionMismatch, text);
  }

  if (accessCheck) {
    for (i = 0; i < names.length; i++) {
      name = String(names[i] || "");
      info = getExpectedAtagLibInfo(name);
      if (!info) continue;
      got = callExpectedAtagLibGetter(name);
      if (!got) {
        if (info.optional === true) {
          optionalAccessMissing.push(name);
          continue;
        }
        if (requireAll) accessMissing.push(name);
        else optionalAccessMissing.push(name);
        continue;
      }
      access.push(got);
      addAtagResultLib(result, got);
      result.missing = removeAtagListValue(result.missing, name);
      result.optionalMissing = removeAtagListValue(result.optionalMissing, name);
      text = atagVersionMismatchText(name, info, got);
      addAtagVersionMismatch(versionMismatch, text);
    }
  }

  result.access = access;
  result.accessMissing = accessMissing;
  result.optionalAccessMissing = optionalAccessMissing;
  result.versionMismatch = versionMismatch;
  result.ok = result.ok && accessMissing.length === 0 && versionMismatch.length === 0;
  result.libs.sort(function(a, b) {
    var aa = String(a.name || "").toLowerCase();
    var bb = String(b.name || "").toLowerCase();
    if (aa < bb) return -1;
    if (aa > bb) return 1;
    return 0;
  });

  if (asText || verbose) {
    var lines = [];
    for (i = 0; i < result.libs.length; i++) {
      lines.push(result.libs[i].name + " v" + result.libs[i].version + " (sys " + result.libs[i].sysVersion + ")");
    }
    for (i = 0; i < result.missing.length; i++) lines.push("MISSING " + result.missing[i]);
    for (i = 0; i < result.optionalMissing.length; i++) lines.push("OPTIONAL MISSING " + result.optionalMissing[i]);
    for (i = 0; i < accessMissing.length; i++) lines.push("NOT CALLABLE " + accessMissing[i]);
    for (i = 0; i < optionalAccessMissing.length; i++) lines.push("OPTIONAL NOT CALLABLE " + optionalAccessMissing[i]);
    for (i = 0; i < versionMismatch.length; i++) lines.push("VERSION MISMATCH " + versionMismatch[i]);
    text = lines.join("\n");
    result.text = text;
    if (verbose && typeof log === "function") log(text);
    if (asText) return text;
  }

  return result;
}
