var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);

function read(relPath) {
  return fso.OpenTextFile(fso.BuildPath(scriptDir, "..\\" + relPath), 1).ReadAll();
}

eval(read("core\\_checkLibs.js"));
eval(read("core_lib\\helpers_lib.js"));
eval(read("core_lib\\collectAtags_lib.js"));
eval(read("core_lib\\exportAtags_lib.js"));
eval(read("core_lib\\inputLinker_lib.js"));
eval(read("core\\tagCleaner.js"));
eval(read("core\\helpers.js"));

function fail(msg) {
  throw new Error(msg);
}

function assertEquals(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    fail(label + ": expected '" + expected + "' but got '" + actual + "'");
  }
}

function assertTrue(label, value) {
  if (!value) fail(label + ": expected truthy value");
}

var _logs = [];

function log(msg) {
  _logs.push(String(msg));
}

assertEquals("libVersions-own-version", getLibVersionsVersion().version, "1.15");
assertEquals("helpers-lib-own-version", getHelpersLibVersion().version, "2.11");
assertEquals("helpers-lib-sys-version", getHelpersLibVersion().sysVersion, "2.30");
assertEquals("collect-lib-own-version", getCollectAtagsLibVersion().version, "1.59");
assertEquals("export-lib-own-version", getExportAtagsLibVersion().version, "1.83");
assertEquals("tag-cleaner-own-version", getTagCleanerVersion().version, "1.44");
assertEquals("helpers-own-version", getHelpersVersion().version, "1.02");
assertEquals("helpers-mem-compat-version", getHelpersMemVersion().version, "1.02");

var result = checkAtagLibVersions({
  checkAccess: true
});

assertTrue("all-loaded", result.ok);
assertEquals("export-lib-map-version", result.map.exportAtags_lib.version, "1.83");
assertEquals("linker-lib-own-version", getInputLinkerLibVersion().version, "0.45");
assertEquals("linker-lib-map-version", result.map.inputLinker_lib.version, "0.45");
assertEquals("access-count", result.access.length, 4);

var nonLib = checkLibVersions({ names: ["libVersions", "tagCleaner", "helpers"], requireAll: false });
assertEquals("non-lib-not-listed", nonLib.libs.length, 0);

var textResult = checkAtagLibVersions({ checkAccess: true, asText: true });
assertTrue("text-result-has-export", textResult.indexOf("exportAtags_lib v1.83") !== -1);
assertTrue("text-result-has-linker", textResult.indexOf("inputLinker_lib v0.45") !== -1);

var missing = checkLibVersions({ names: ["missing_lib"] });
assertEquals("missing-detected", missing.missing[0], "missing_lib");

var optionalMissing = checkLibVersions({ names: ["optional_missing_lib"], optionalNames: ["optional_missing_lib"] });
assertTrue("optional-missing-ok", optionalMissing.ok);
assertEquals("optional-missing-listed", optionalMissing.optionalMissing[0], "optional_missing_lib");

var savedGetHelpersLibVersion = getHelpersLibVersion;
getHelpersLibVersion = undefined;
var softAccessMissing = checkAtagLibVersions({ names: ["helpers_lib"], checkAccess: true, requireAll: false });
assertTrue("soft-access-missing-ok", softAccessMissing.ok);
assertEquals("soft-access-missing-listed", softAccessMissing.optionalAccessMissing[0], "helpers_lib");
getHelpersLibVersion = savedGetHelpersLibVersion;

var savedRegistry = ATAG_LIB_VERSIONS;
var savedGetInputLinkerLibVersion = getInputLinkerLibVersion;
ATAG_LIB_VERSIONS = {};
getInputLinkerLibVersion = function() {
  return {
    name: "inputLinker_lib",
    version: "0.39",
    sysVersion: "2.30",
    path: "core_lib/inputLinker_lib.js"
  };
};
var getterOnlyOldOptional = checkAtagLibVersions({ names: ["inputLinker_lib"], checkAccess: true, requireAll: false, asText: false });
assertEquals("getter-only-old-optional-no-optional-missing", getterOnlyOldOptional.optionalMissing.length, 0);
assertEquals("getter-only-old-optional-map-version", getterOnlyOldOptional.map.inputLinker_lib.version, "0.39");
assertEquals("getter-only-old-optional-mismatch", getterOnlyOldOptional.versionMismatch[0], "inputLinker_lib expected 0.45 got 0.39");
getInputLinkerLibVersion = savedGetInputLinkerLibVersion;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
savedGetInputLinkerLibVersion = getInputLinkerLibVersion;
ATAG_LIB_VERSIONS = {};
getInputLinkerLibVersion = function() {
  return {
    name: "inputLinker_lib",
    version: "0.99",
    sysVersion: "2.30",
    path: "core_lib/inputLinker_lib.js"
  };
};
var newerOptional = checkAtagLibVersions({ names: ["inputLinker_lib"], checkAccess: true, requireAll: false, asText: false });
assertTrue("newer-version-ok", newerOptional.ok);
assertEquals("newer-version-no-mismatch", newerOptional.versionMismatch.length, 0);
getInputLinkerLibVersion = function() {
  return {
    name: "inputLinker_lib",
    version: "0.99",
    sysVersion: "2.29",
    path: "core_lib/inputLinker_lib.js"
  };
};
var newerWrongSys = checkAtagLibVersions({ names: ["inputLinker_lib"], checkAccess: true, requireAll: false, asText: false });
assertEquals("newer-wrong-sys-mismatch", newerWrongSys.versionMismatch[0], "inputLinker_lib expected sys 2.30 got sys 2.29");
getInputLinkerLibVersion = savedGetInputLinkerLibVersion;
ATAG_LIB_VERSIONS = savedRegistry;

var allVersionsText = checkAtagLibVersions({ checkAccess: true, requireAll: false, allVersions: true, asText: true });
assertTrue("all-versions-text-has-helpers", allVersionsText.indexOf("helpers_lib v2.11") !== -1);
assertTrue("all-versions-text-has-linker", allVersionsText.indexOf("inputLinker_lib v0.45") !== -1);

checkAtagLibVersions({ checkAccess: true, verbose: true });
assertTrue("verbose-log-written", _logs.join("\n").indexOf("inputLinker_lib v0.45") !== -1);

var savedExpectedLibs = ATAG_EXPECTED_LIBS;
ATAG_EXPECTED_LIBS = undefined;
var missingExpectedList = checkAtagLibVersions({ checkAccess: true });
assertTrue("undefined-expected-list-no-crash", missingExpectedList.ok);
assertEquals("undefined-expected-list-empty", missingExpectedList.libs.length, 0);
ATAG_EXPECTED_LIBS = savedExpectedLibs;

WScript.Echo("OK");









