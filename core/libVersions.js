/*
========================================
A0 Lib Versions v1.00 (sys 2.30)
========================================

Notes
- Shared library version registry.
- Load before optional lib files to collect registered versions.
- Each lib can still expose its own get...Version function.
- Current libs:
  - libVersions v1.00 (sys 2.30)
  - helpers_lib v2.10 (sys 2.30)
  - collectAtags_lib v1.53 (sys 2.30)
  - exportAtags_lib v1.79 (sys 2.30)

========================================
*/

var ATAG_SYS_VERSION = typeof ATAG_SYS_VERSION !== "undefined" ? ATAG_SYS_VERSION : "2.30";
var ATAG_LIB_VERSIONS = typeof ATAG_LIB_VERSIONS !== "undefined" ? ATAG_LIB_VERSIONS : {};

function getLibVersionsVersion() {
  return {
    name: "libVersions",
    version: "1.00",
    sysVersion: "2.30",
    path: "core/libVersions.js"
  };
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

registerAtagLibVersion("libVersions", "1.00", "2.30", "core/libVersions.js");
