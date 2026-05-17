/*
========================================
A1 Lib Versions v1.08 (sys 2.30)
========================================

Notes
- Shared remote-library version registry.
- Load before optional lib files to collect registered versions.
- Each lib can still expose its own get...Version function.
- Current libs:
  - helpers_lib v2.11 (sys 2.30)
  - collectAtags_lib v1.55 (sys 2.30)
  - exportAtags_lib v1.82 (sys 2.30)

Example
var libCheck = checkAtagLibVersions({
  checkAccess: true
});

if (!libCheck.ok) {
  throw "Missing atag libs: " + libCheck.missing.join(", ");
}

========================================
*/

var ATAG_SYS_VERSION = typeof ATAG_SYS_VERSION !== "undefined" ? ATAG_SYS_VERSION : "2.30";
var ATAG_LIB_VERSIONS = typeof ATAG_LIB_VERSIONS !== "undefined" ? ATAG_LIB_VERSIONS : {};

function getLibVersionsVersion() {
  return {
    name: "libVersions",
    version: "1.08",
    sysVersion: "2.30",
    path: "core/_checkLibs.js"
  };
}

var ATAG_EXPECTED_LIBS = [
  { name: "helpers_lib", version: "2.11", getter: "getHelpersLibVersion", path: "core_lib/helpers_lib.js" },
  { name: "collectAtags_lib", version: "1.55", getter: "getCollectAtagsLibVersion", path: "core_lib/collectAtags_lib.js" },
  { name: "exportAtags_lib", version: "1.82", getter: "getExportAtagsLibVersion", path: "core_lib/exportAtags_lib.js" }
];

function getExpectedAtagLibNames() {
  var out = [];
  var i;
  for (i = 0; i < ATAG_EXPECTED_LIBS.length; i++) out.push(ATAG_EXPECTED_LIBS[i].name);
  return out;
}

function getExpectedAtagLibInfo(name) {
  var key = String(name || "");
  var i;
  for (i = 0; i < ATAG_EXPECTED_LIBS.length; i++) {
    if (ATAG_EXPECTED_LIBS[i].name === key) return ATAG_EXPECTED_LIBS[i];
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
  return null;
}

function registerAtagLibVersion(name, version, sysVersion, path) {
  var key = String(name || "");
  if (!key) return null;

  ATAG_LIB_VERSIONS[key] = {
    name: key,
    version: String(version || ""),
    sysVersion: String(sysVersion || ATAG_SYS_VERSION || ""),
    path: String(path || "")
  };

  return ATAG_LIB_VERSIONS[key];
}

function checkLibVersions(cfg) {
  cfg = cfg || {};
  var names = cfg.names || cfg.libs || null;
  var asText = cfg.asText === true || cfg.format === "text";
  var requireAll = cfg.requireAll !== false;
  var out = [];
  var missing = [];
  var map = {};
  var i;
  var name;
  var info;

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

  if (asText) {
    var lines = [];
    for (i = 0; i < out.length; i++) {
      lines.push(out[i].name + " v" + out[i].version + " (sys " + out[i].sysVersion + ")");
    }
    for (i = 0; i < missing.length; i++) lines.push("MISSING " + missing[i]);
    return lines.join("\n");
  }

  return {
    ok: missing.length === 0,
    libs: out,
    map: map,
    missing: missing
  };
}

function checkAtagLibVersions(cfg) {
  cfg = cfg || {};
  var names = cfg.names || cfg.libs || getExpectedAtagLibNames();
  var accessCheck = cfg.checkAccess === true || cfg.checkCallable === true || cfg.checkParse === true;
  var asText = cfg.asText === true || cfg.format === "text";
  var result = checkLibVersions({
    names: names,
    requireAll: cfg.requireAll,
    asText: false
  });
  var access = [];
  var accessMissing = [];
  var versionMismatch = [];
  var info;
  var got;
  var i;
  var name;

  if (Object.prototype.toString.call(names) !== "[object Array]") names = [names];

  if (accessCheck) {
    for (i = 0; i < names.length; i++) {
      name = String(names[i] || "");
      info = getExpectedAtagLibInfo(name);
      if (!info) continue;
      got = callExpectedAtagLibGetter(name);
      if (!got) {
        accessMissing.push(name);
        continue;
      }
      access.push(got);
      if (String(got.version || "") !== String(info.version || "")) {
        versionMismatch.push(name + " expected " + info.version + " got " + got.version);
      }
    }
  }

  result.access = access;
  result.accessMissing = accessMissing;
  result.versionMismatch = versionMismatch;
  result.ok = result.ok && accessMissing.length === 0 && versionMismatch.length === 0;

  if (asText) {
    var lines = [];
    for (i = 0; i < result.libs.length; i++) {
      lines.push(result.libs[i].name + " v" + result.libs[i].version + " (sys " + result.libs[i].sysVersion + ")");
    }
    for (i = 0; i < result.missing.length; i++) lines.push("MISSING " + result.missing[i]);
    for (i = 0; i < accessMissing.length; i++) lines.push("NOT CALLABLE " + accessMissing[i]);
    for (i = 0; i < versionMismatch.length; i++) lines.push("VERSION MISMATCH " + versionMismatch[i]);
    return lines.join("\n");
  }

  return result;
}
