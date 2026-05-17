var fso = new ActiveXObject("Scripting.FileSystemObject");
var scriptDir = fso.GetParentFolderName(WScript.ScriptFullName);

function read(relPath) {
  return fso.OpenTextFile(fso.BuildPath(scriptDir, "..\\" + relPath), 1).ReadAll();
}

eval(read("core\\libVersions.js"));
eval(read("core_lib\\helpers_lib.js"));
eval(read("core_lib\\collectAtags_lib.js"));
eval(read("core_lib\\exportAtags_lib.js"));
eval(read("core\\tagCleaner.js"));
eval(read("core\\helpers_mem.js"));

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

assertEquals("libVersions-own-version", getLibVersionsVersion().version, "1.00");
assertEquals("helpers-lib-own-version", getHelpersLibVersion().version, "2.10");
assertEquals("helpers-lib-sys-version", getHelpersLibVersion().sysVersion, "2.30");
assertEquals("collect-lib-own-version", getCollectAtagsLibVersion().version, "1.53");
assertEquals("export-lib-own-version", getExportAtagsLibVersion().version, "1.79");
assertEquals("tag-cleaner-own-version", getTagCleanerVersion().version, "1.27");
assertEquals("helpers-mem-own-version", getHelpersMemVersion().version, "1.00");

var result = checkLibVersions({
  names: ["libVersions", "helpers_lib", "collectAtags_lib", "exportAtags_lib"]
});

assertTrue("all-loaded", result.ok);
assertEquals("export-lib-map-version", result.map.exportAtags_lib.version, "1.79");

var nonLib = checkLibVersions({ names: ["tagCleaner", "helpers_mem"], requireAll: false });
assertEquals("non-lib-not-listed", nonLib.libs.length, 0);

var missing = checkLibVersions({ names: ["missing_lib"] });
assertEquals("missing-detected", missing.missing[0], "missing_lib");

WScript.Echo("OK");
