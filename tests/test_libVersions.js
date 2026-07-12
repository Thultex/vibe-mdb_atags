var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);
var _logs = [];
var ATAG_SYS_VERSION = "2.40";
var ATAG_LIB_VERSIONS = {
  tagCleaner: {
    name: "tagCleaner",
    version: "1.50",
    sysVersion: "2.40",
    path: "core/tagCleaner.js",
    optional: true
  }
};

function read(relPath) {
  return fso.OpenTextFile(fso.BuildPath(scriptDir, "..\\" + relPath), 1).ReadAll();
}

eval(read("core\\_checkLibs.js"));
assertTrue("autorun-plugin-mismatch-summary", _logs.join("\n").indexOf("System Version 2.50 (missmatch/missing, 1 local, 14 missing)") >= 0);
assertTrue("autorun-plugin-mismatch-visible", _logs.join("\n").indexOf("VERSION LOCAL: tagCleaner expected sys 2.50 got sys 2.40") >= 0);
assertEquals("checker-overrides-old-global-sys", ATAG_SYS_VERSION, "2.50");
ATAG_LIB_VERSIONS = {};
eval(read("core_lib\\helpers_lib.js"));
eval(read("core_lib\\collectAtags_lib.js"));
eval(read("core_lib\\exportAtags_lib.js"));
eval(read("core\\tagCleaner.js"));
eval(read("core\\helpers.js"));
eval(read("core\\restoreAtags.js"));
eval(read("addons\\1_tagging\\tagPairParser.js"));
eval(read("addons\\2_syncing\\globalFieldSync.js"));
eval(read("addons\\2_syncing\\syncLastFromLatest.js"));
eval(read("addons\\2_syncing\\dustMerger.js"));
eval(read("addons\\3_workflow\\floatingAverage.js"));
eval(read("addons\\3_workflow\\sequenceCounter.js"));
eval(read("addons\\3_workflow\\timeMarker.js"));
eval(read("addons\\6_integration\\obsidianLinker.js"));
eval(read("addons\\6_integration\\wikiLinker.js"));
eval(read("addons\\z_generell\\multiChoiceHelpers.js"));
eval(read("addons\\z_generell\\typedTextFields.js"));
eval(read("addons\\z_others\\hourGuide.js"));

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

function log(msg) {
  _logs.push(String(msg));
}

assertEquals("libVersions-own-version", getLibVersionsVersion().version, "1.42");
assertEquals("helpers-lib-own-version", getHelpersLibVersion().version, "2.11");
assertEquals("helpers-lib-sys-version", getHelpersLibVersion().sysVersion, "2.50");
assertEquals("collect-lib-own-version", getCollectAtagsLibVersion().version, "1.66");
assertEquals("export-lib-own-version", getExportAtagsLibVersion().version, "1.84");
assertEquals("tag-cleaner-own-version", getTagCleanerVersion().version, "1.51");
assertEquals("helpers-own-version", getHelpersVersion().version, "1.03");
assertEquals("helpers-mem-compat-version", getHelpersMemVersion().version, "1.03");
assertEquals("dust-merger-own-version", getDustMergerVersion().version, "0.13");
assertEquals("dust-merger-registered-version", ATAG_LIB_VERSIONS.dustMerger.version, "0.13");
assertEquals("time-marker-registered-version", ATAG_LIB_VERSIONS.timeMarker.version, "1.40");
assertEquals("hour-guide-registered-version", ATAG_LIB_VERSIONS.hourGuide.version, "1.31");

var result = checkAtagLibVersions({
  checkAccess: true
});

assertTrue("all-loaded", result.ok);
assertEquals("export-lib-map-version", result.map.exportAtags_lib.version, "1.84");
assertEquals("collect-lib-map-version", result.map.collectAtags_lib.version, "1.66");

var dustGetterResult = checkAtagLibVersions({ names: ["dustMerger"], checkAccess: true, requireAll: false, asText: false });
assertEquals("generic-getter-dust-merger-version", dustGetterResult.map.dustMerger.version, "0.13");
assertEquals("generic-getter-dust-merger-no-mismatch", dustGetterResult.versionMismatch.length, 0);
assertEquals("access-count", result.access.length, 3);

var nonLib = checkLibVersions({ names: ["libVersions", "tagCleaner", "helpers"], requireAll: false });
assertEquals("registered-optional-listed", nonLib.libs.length, 2);
assertEquals("registered-optional-tag-cleaner", nonLib.map.tagCleaner.version, "1.51");
assertEquals("registered-optional-helpers", nonLib.map.helpers.version, "1.03");

var textResult = checkAtagLibVersions({ checkAccess: true, asText: true });
assertTrue("text-result-starts-with-summary", textResult.indexOf("System Version 2.50 (ok, 3 libs, 16 local)") === 0);
assertTrue("text-result-has-export", textResult.indexOf("exportAtags_lib v1.84") !== -1);
assertTrue("text-result-has-collect", textResult.indexOf("collectAtags_lib v1.66") !== -1);
assertTrue("text-result-has-local-tag-cleaner", textResult.indexOf("LOCAL tagCleaner v1.51") !== -1);
assertTrue("text-result-has-local-dust-merger", textResult.indexOf("LOCAL dustMerger v0.13") !== -1);
assertTrue("text-result-ends-with-blank-line", /\n\n$/.test(textResult));

var hiddenLocalText = checkAtagLibVersions({ checkAccess: true, asText: true, showLocalVersions: false });
assertTrue("hidden-local-summary-keeps-count", hiddenLocalText.indexOf("System Version 2.50 (ok, 3 libs, 16 local)") === 0);
assertTrue("hidden-local-lines-hidden", hiddenLocalText.indexOf("LOCAL tagCleaner v1.51") < 0);

var hiddenUppercaseLocalText = checkAtagLibVersions({ checkAccess: true, asText: true, SHOW_LOCAL_VERSIONS: false });
assertTrue("hidden-uppercase-local-lines-hidden", hiddenUppercaseLocalText.indexOf("LOCAL tagCleaner v1.51") < 0);

var scopedConfigText = checkAtagLibVersions({
  checkAccess: true,
  asText: true,
  showCurrentConfig: true,
  currentConfig: {
    remote: ["helpers_lib"],
    local: ["syncLastFromLatest"]
  }
});
assertTrue("scoped-config-summary", scopedConfigText.indexOf("System Version 2.50 (ok, 1 libs, 1 local)") === 0);
assertTrue("scoped-config-rem-visible", scopedConfigText.indexOf("CONFIG REM: #3 Helpers Lib (core_lib)") !== -1);
assertTrue("scoped-config-local-visible", scopedConfigText.indexOf("CONFIG LOCAL: B4 Sync Last From Latest (2_syncing)") !== -1);
assertTrue("scoped-config-omits-remote", scopedConfigText.indexOf("collectAtags_lib v1.66") < 0);
assertTrue("scoped-config-omits-local", scopedConfigText.indexOf("LOCAL tagCleaner v1.51") < 0);

function getLibsVersionsConfig() {
  return {
    libs: ["helpers_lib"],
    plugins: ["syncLastFromLatest"]
  };
}

var getterScopedConfigText = checkAtagLibVersions({
  checkAccess: true,
  asText: true,
  getCurrentConfig: true,
  showCurrentConfig: true
});
assertTrue("getter-config-summary", getterScopedConfigText.indexOf("System Version 2.50 (ok, 1 libs, 1 local)") === 0);
assertTrue("getter-config-local-visible", getterScopedConfigText.indexOf("CONFIG LOCAL: B4 Sync Last From Latest (2_syncing)") !== -1);

var savedRegistryForMissingOptions = ATAG_LIB_VERSIONS;
var savedGetTagCleanerVersionForMissingOptions = getTagCleanerVersion;
ATAG_LIB_VERSIONS = {};
getTagCleanerVersion = undefined;
var hiddenLocalMissingText = checkAtagLibVersions({ checkAccess: true, asText: true, showLocalMissing: false });
assertTrue("hidden-local-missing-summary-ok", hiddenLocalMissingText.indexOf("System Version 2.50 (ok, 3 libs, 15 local)") === 0);
assertTrue("hidden-local-missing-line-hidden", hiddenLocalMissingText.indexOf("MISSING LOCAL: A4 Tag Cleaner (core)") < 0);
var visibleLocalMissingText = checkAtagLibVersions({ checkAccess: true, asText: true, showLocalMissing: true });
assertTrue("visible-local-missing-summary", visibleLocalMissingText.indexOf("System Version 2.50 (missing, 1 missing)") === 0);
assertTrue("visible-local-missing-line", visibleLocalMissingText.indexOf("MISSING LOCAL: A4 Tag Cleaner (core)") !== -1);
getTagCleanerVersion = savedGetTagCleanerVersionForMissingOptions;
ATAG_LIB_VERSIONS = savedRegistryForMissingOptions;

var savedGetTimeMarkerVersionForMissingOptions = getTimeMarkerVersion;
ATAG_LIB_VERSIONS = {};
getTimeMarkerVersion = undefined;
var visibleTimeMarkerMissingText = checkAtagLibVersions({ checkAccess: true, asText: true, showLocalMissing: true });
assertTrue("visible-time-marker-missing-line", visibleTimeMarkerMissingText.indexOf("MISSING LOCAL: B7 Time Marker (3_workflow)") !== -1);
getTimeMarkerVersion = savedGetTimeMarkerVersionForMissingOptions;
ATAG_LIB_VERSIONS = savedRegistryForMissingOptions;

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
var hiddenRemoteMissing = checkAtagLibVersions({ names: ["helpers_lib"], checkAccess: true, requireAll: true, asText: true, showRemoteMissing: false });
assertTrue("hidden-remote-missing-summary-ok", hiddenRemoteMissing.indexOf("System Version 2.50 (ok, 1 libs, 16 local)") === 0);
assertTrue("hidden-remote-missing-line-hidden", hiddenRemoteMissing.indexOf("MISSING REM: #3 Helpers Lib (core_lib)") < 0);
getHelpersLibVersion = savedGetHelpersLibVersion;

var savedRegistry = ATAG_LIB_VERSIONS;
var savedGetCollectAtagsLibVersion = getCollectAtagsLibVersion;
ATAG_LIB_VERSIONS = {};
getCollectAtagsLibVersion = function() {
  return {
    name: "collectAtags_lib",
    version: "1.39",
    sysVersion: "2.50",
    path: "core_lib/collectAtags_lib.js"
  };
};
var getterOnlyOldOptional = checkAtagLibVersions({ names: ["collectAtags_lib"], checkAccess: true, requireAll: false, asText: false });
assertEquals("getter-only-old-no-optional-missing", getterOnlyOldOptional.optionalMissing.length, 0);
assertEquals("getter-only-old-map-version", getterOnlyOldOptional.map.collectAtags_lib.version, "1.39");
assertEquals("getter-only-old-mismatch", getterOnlyOldOptional.versionMismatch[0], "collectAtags_lib expected 1.66 got 1.39");
getCollectAtagsLibVersion = savedGetCollectAtagsLibVersion;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
ATAG_LIB_VERSIONS = {};
registerAtagLibVersion("collectAtags_lib", "1.39", "2.50", "core_lib/collectAtags_lib.js");
var registryOnlyOldOptional = checkAtagLibVersions({ names: ["collectAtags_lib"], requireAll: false, asText: false });
assertEquals("registry-only-old-mismatch", registryOnlyOldOptional.versionMismatch[0], "collectAtags_lib expected 1.66 got 1.39");
ATAG_LIB_VERSIONS = {};
registerAtagLibVersion("collectAtags_lib", "1.99", "2.50", "core_lib/collectAtags_lib.js");
var registryOnlyNewerOptional = checkAtagLibVersions({ names: ["collectAtags_lib"], requireAll: false, asText: false });
assertTrue("registry-only-newer-ok", registryOnlyNewerOptional.ok);
assertEquals("registry-only-newer-no-mismatch", registryOnlyNewerOptional.versionMismatch.length, 0);
ATAG_LIB_VERSIONS = {};
registerAtagLibVersion("collectAtags_lib", "2.00", "2.50", "core_lib/collectAtags_lib.js");
var registryOnlyMajorOptional = checkAtagLibVersions({ names: ["collectAtags_lib"], requireAll: false, asText: false });
assertEquals("registry-only-major-mismatch", registryOnlyMajorOptional.versionMismatch[0], "collectAtags_lib expected major 1 got major 2 (1.66 vs 2.00)");
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
savedGetCollectAtagsLibVersion = getCollectAtagsLibVersion;
ATAG_LIB_VERSIONS = {};
getCollectAtagsLibVersion = function() {
  return {
    name: "collectAtags_lib",
    version: "1.99",
    sysVersion: "2.50",
    path: "core_lib/collectAtags_lib.js"
  };
};
var newerOptional = checkAtagLibVersions({ names: ["collectAtags_lib"], checkAccess: true, requireAll: false, asText: false });
assertTrue("newer-version-ok", newerOptional.ok);
assertEquals("newer-version-no-mismatch", newerOptional.versionMismatch.length, 0);
getCollectAtagsLibVersion = function() {
  return {
    name: "collectAtags_lib",
    version: "1.99",
    sysVersion: "2.29",
    path: "core_lib/collectAtags_lib.js"
  };
};
var newerWrongSys = checkAtagLibVersions({ names: ["collectAtags_lib"], checkAccess: true, requireAll: false, asText: false });
assertEquals("newer-wrong-sys-mismatch", newerWrongSys.versionMismatch[0], "collectAtags_lib expected sys 2.50 got sys 2.29");
getCollectAtagsLibVersion = savedGetCollectAtagsLibVersion;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
savedGetCollectAtagsLibVersion = getCollectAtagsLibVersion;
ATAG_LIB_VERSIONS = {};
getCollectAtagsLibVersion = function() {
  return {
    name: "collectAtags_lib",
    version: "1.39",
    sysVersion: "2.50",
    path: "core_lib/collectAtags_lib.js"
  };
};
var hiddenRemoteMissmatchText = checkAtagLibVersions({ names: ["collectAtags_lib"], checkAccess: true, asText: true, showRemoteMissmatches: false });
assertTrue("hidden-remote-missmatch-summary-ok", hiddenRemoteMissmatchText.indexOf("System Version 2.50 (ok, 1 libs, 16 local)") === 0);
assertTrue("hidden-remote-missmatch-line-hidden", hiddenRemoteMissmatchText.indexOf("VERSION REM: collectAtags_lib expected 1.66 got 1.39") < 0);
getCollectAtagsLibVersion = savedGetCollectAtagsLibVersion;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
var savedGetTagCleanerVersion = getTagCleanerVersion;
ATAG_LIB_VERSIONS = {};
getTagCleanerVersion = function() {
  return {
    name: "tagCleaner",
    version: "1.51",
    sysVersion: "2.40",
    path: "core/tagCleaner.js"
  };
};
var optionalGetterSysMismatchText = checkAtagLibVersions({ checkAccess: true, asText: true });
assertTrue("optional-getter-sys-mismatch-summary", optionalGetterSysMismatchText.indexOf("System Version 2.50 (missmatch, 1 local)") === 0);
assertTrue("optional-getter-sys-mismatch-visible", optionalGetterSysMismatchText.indexOf("VERSION LOCAL: tagCleaner expected sys 2.50 got sys 2.40") !== -1);
assertTrue("optional-getter-sys-mismatch-listed-as-local", optionalGetterSysMismatchText.indexOf("LOCAL tagCleaner v1.51 (sys 2.40)") !== -1);
getTagCleanerVersion = savedGetTagCleanerVersion;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
savedGetTagCleanerVersion = getTagCleanerVersion;
ATAG_LIB_VERSIONS = {};
getTagCleanerVersion = function() {
  return {
    name: "tagCleaner",
    version: "1.50",
    sysVersion: "2.50",
    path: "core/tagCleaner.js"
  };
};
var hiddenLocalMissmatchText = checkAtagLibVersions({ checkAccess: true, asText: true, showLocalMissmatches: false });
assertTrue("hidden-local-missmatch-summary-ok", hiddenLocalMissmatchText.indexOf("System Version 2.50 (ok, 3 libs, 16 local)") === 0);
assertTrue("hidden-local-missmatch-line-hidden", hiddenLocalMissmatchText.indexOf("VERSION LOCAL: tagCleaner expected 1.51 got 1.50") < 0);
getTagCleanerVersion = savedGetTagCleanerVersion;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
savedGetCollectAtagsLibVersion = getCollectAtagsLibVersion;
savedGetHelpersLibVersion = getHelpersLibVersion;
savedGetTagCleanerVersion = getTagCleanerVersion;
savedGetTimeMarkerVersionForMissingOptions = getTimeMarkerVersion;
ATAG_LIB_VERSIONS = {};
getCollectAtagsLibVersion = function() {
  return {
    name: "collectAtags_lib",
    version: "1.39",
    sysVersion: "2.50",
    path: "core_lib/collectAtags_lib.js"
  };
};
getTagCleanerVersion = function() {
  return {
    name: "tagCleaner",
    version: "1.50",
    sysVersion: "2.50",
    path: "core/tagCleaner.js"
  };
};
getHelpersLibVersion = undefined;
getTimeMarkerVersion = undefined;
var mixedOrderText = checkAtagLibVersions({ names: ["collectAtags_lib", "helpers_lib"], checkAccess: true, asText: true, showLocalMissing: true });
var mixedVersionRemIndex = mixedOrderText.indexOf("VERSION REM: collectAtags_lib expected 1.66 got 1.39");
var mixedMissingRemIndex = mixedOrderText.indexOf("MISSING REM: #3 Helpers Lib (core_lib)");
var mixedVersionLocalIndex = mixedOrderText.indexOf("VERSION LOCAL: tagCleaner expected 1.51 got 1.50");
var mixedMissingLocalIndex = mixedOrderText.indexOf("MISSING LOCAL: B7 Time Marker (3_workflow)");
assertTrue("mixed-order-version-rem-present", mixedVersionRemIndex !== -1);
assertTrue("mixed-order-missing-rem-present", mixedMissingRemIndex !== -1);
assertTrue("mixed-order-version-local-present", mixedVersionLocalIndex !== -1);
assertTrue("mixed-order-missing-local-present", mixedMissingLocalIndex !== -1);
assertTrue("mixed-order-version-rem-before-missing-rem", mixedVersionRemIndex < mixedMissingRemIndex);
assertTrue("mixed-order-missing-rem-before-version-local", mixedMissingRemIndex < mixedVersionLocalIndex);
assertTrue("mixed-order-version-local-before-missing-local", mixedVersionLocalIndex < mixedMissingLocalIndex);
getCollectAtagsLibVersion = savedGetCollectAtagsLibVersion;
getHelpersLibVersion = savedGetHelpersLibVersion;
getTagCleanerVersion = savedGetTagCleanerVersion;
getTimeMarkerVersion = savedGetTimeMarkerVersionForMissingOptions;
ATAG_LIB_VERSIONS = savedRegistry;

savedRegistry = ATAG_LIB_VERSIONS;
ATAG_LIB_VERSIONS = {};
registerAtagLibVersion("tagCleaner", "1.50", "2.50", "core/tagCleaner.js");
var optionalPluginMismatch = checkAtagLibVersions({ checkAccess: true, asText: false });
assertEquals("optional-plugin-mismatch", optionalPluginMismatch.versionMismatch[0], "tagCleaner expected 1.51 got 1.50");
assertEquals("optional-plugin-not-listed", optionalPluginMismatch.map.tagCleaner, undefined);
assertEquals("optional-plugin-no-missing", optionalPluginMismatch.missing.length, 0);
assertEquals("optional-plugin-no-optional-missing", optionalPluginMismatch.optionalMissing.length, 0);
var optionalPluginMismatchText = checkAtagLibVersions({ checkAccess: true, asText: true });
assertTrue("optional-plugin-mismatch-text-summary", optionalPluginMismatchText.indexOf("System Version 2.50 (missmatch, 1 local)") === 0);
assertTrue("optional-plugin-mismatch-text-visible", optionalPluginMismatchText.indexOf("VERSION LOCAL: tagCleaner expected 1.51 got 1.50") !== -1);
assertTrue("optional-plugin-mismatch-text-listed-as-local", optionalPluginMismatchText.indexOf("LOCAL tagCleaner v1.50") !== -1);
assertTrue("optional-plugin-mismatch-text-ends-with-blank-line", /\n\n$/.test(optionalPluginMismatchText));
assertTrue("optional-plugin-mismatch-register-log-visible", _logs.join("\n").indexOf("VERSION LOCAL: tagCleaner expected 1.51 got 1.50") >= 0);
ATAG_LIB_VERSIONS = {};
_logs = [];
registerAtagLibVersion("dustMerger", "0.12", "2.50", "addons/2_syncing/dustMerger.js", true);
assertTrue("optional-dust-merger-mismatch-register-log-summary", _logs.join("\n").indexOf("System Version 2.50 (missmatch, 1 local)") >= 0);
assertTrue("optional-dust-merger-mismatch-register-log-visible", _logs.join("\n").indexOf("VERSION LOCAL: dustMerger expected 0.13 got 0.12") >= 0);
ATAG_LIB_VERSIONS = {};
registerAtagLibVersion("tagCleaner", "1.51", "2.50", "core/tagCleaner.js");
var optionalPluginCurrent = checkAtagLibVersions({ checkAccess: true, asText: false });
assertEquals("optional-plugin-current-no-mismatch", optionalPluginCurrent.versionMismatch.length, 0);
ATAG_LIB_VERSIONS = savedRegistry;

var allVersionsText = checkAtagLibVersions({ checkAccess: true, requireAll: false, allVersions: true, asText: true });
assertTrue("all-versions-text-has-helpers", allVersionsText.indexOf("helpers_lib v2.11") !== -1);
assertTrue("all-versions-text-has-collect", allVersionsText.indexOf("collectAtags_lib v1.66") !== -1);

checkAtagLibVersions({ checkAccess: true, verbose: true });
assertTrue("verbose-log-written", _logs.join("\n").indexOf("collectAtags_lib v1.66") !== -1);

var savedExpectedLibs = ATAG_EXPECTED_LIBS;
ATAG_EXPECTED_LIBS = undefined;
var missingExpectedList = checkAtagLibVersions({ checkAccess: true });
assertTrue("undefined-expected-list-no-crash", missingExpectedList.ok);
assertEquals("undefined-expected-list-empty", missingExpectedList.libs.length, 0);
ATAG_EXPECTED_LIBS = savedExpectedLibs;

WScript.Echo("OK");
