/*
========================================
B9 Wiki Linker v1.01 (sys 2.50)
========================================

Changes
- add Wikipedia search link helper
- configurable source title and target field
- default to German Wikipedia search

Usage

applyWikiLinker({
  sourceTitleField: "Titel",
  targetField: "Wikipedia",
  language: "de"
});

*/

/*
========================================
B9 Wiki Linker v1.01 (sys 2.50)
========================================
*/

function getWikiLinkerVersion() {
  return {
    name: "wikiLinker",
    version: "1.01",
    sysVersion: "2.50",
    path: "addons/6_integration/wikiLinker.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("wikiLinker", "1.01", "2.50", "addons/6_integration/wikiLinker.js", true);
}

function wikiLinkerTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function makeWikiSearchUrl(title, cfg) {
  cfg = cfg || {};

  var lang = wikiLinkerTrim(cfg.language || "de").toLowerCase();
  var text = wikiLinkerTrim(title);

  if (!lang) lang = "de";
  if (!text) return "";

  return "https://" + encodeURIComponent(lang) + ".wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(text);
}

function applyWikiLinker(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || entry();
  var sourceTitleField = cfg.sourceTitleField || cfg.titleField || "Titel";
  var targetField = cfg.targetField || "Wikipedia";
  var url;

  if (!e || !targetField) return "";

  url = makeWikiSearchUrl(e.field(sourceTitleField), cfg);
  if (url) e.set(targetField, url);
  else if (cfg.clearOnEmpty === true) e.set(targetField, "");

  return url;
}
