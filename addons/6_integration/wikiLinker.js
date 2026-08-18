/*
========================================
B9 Wiki Linker v1.03 (sys 3.00)
========================================
*/

function getWikiLinkerVersion() {
  return {
    name: "wikiLinker",
    version: "1.03",
    sysVersion: "3.00",
    path: "addons/6_integration/wikiLinker.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("wikiLinker", "1.03", "3.00", "addons/6_integration/wikiLinker.js", true);
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

  if (cfg.enabled === false) return "";
  var e = cfg.entryObj || cfg.entry || entry();
  var sourceTitleField = cfg.sourceTitleField || cfg.titleField || "Titel";
  var targetField = cfg.targetField || "Wikipedia";
  var url;

  if (!e || !targetField) return "";

  url = makeWikiSearchUrl(e.field(sourceTitleField), cfg);
  if (url) e.set(targetField, url);
  else if (cfg.clearOnEmpty === true) e.set(targetField, "");

  return url;
}
