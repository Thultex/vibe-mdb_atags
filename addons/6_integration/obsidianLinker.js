/*
========================================
Addon Obsidian Linker v1.00 (sys 2.11)
========================================

Changes
- add Memento to Obsidian Advanced URI linker
- separate overwrite link field and Obsidian link field
- keep Memento id for filepath and frontmatter only
- use existing Obsidian uid only for open links

Usage

makeObsidianMementoUri({
  contentField: "Text",
  overwriteLinkField: "Obsidian Overwrite Link",
  obsidianLinkField: "Obsidian Link",
  dateField: "Datum",
  mementoLinkField: "Memento Link",
  vault: "RasObs"
});

========================================
*/

function obsTrim(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function obsEntryId(e) {
  if (!e) return "";
  if (e.id != null) return String(e.id);
  if (typeof e.id === "function") return String(e.id());
  return "";
}

function obsLibName(l) {
  if (!l) return "";
  if (l.name != null) return String(l.name);
  if (typeof l.name === "function") return String(l.name());
  if (l.title != null) return String(l.title);
  if (typeof l.title === "function") return String(l.title());
  return "";
}

function obsTitle(e) {
  var t = "";
  if (!e) return "";
  if (e.title != null) t = String(e.title);
  else if (typeof e.title === "function") t = String(e.title());
  else if (e.name != null) t = String(e.name);
  else if (typeof e.name === "function") t = String(e.name());
  return obsTrim(t);
}

function obsHtmlEscape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function obsHtmlUnescape(s) {
  return String(s == null ? "" : s)
    .replace(/&amp;amp;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function obsExtractUri(s) {
  var text = obsHtmlUnescape(s);
  var match = text.match(/obsidian:\/\/(?:advanced-uri|adv-uri)[^\s"'<>\)]+/);
  return match ? match[0] : "";
}

function obsExtractQueryParam(s, name) {
  var uri = obsExtractUri(s);
  var escapedName;
  var re;
  var match;

  if (!uri) return "";

  escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  re = new RegExp("[?&]" + escapedName + "=([^&\"'<> ]+)");
  match = uri.match(re);
  if (!match) return "";

  try {
    return decodeURIComponent(match[1]);
  } catch (e) {
    return match[1];
  }
}

function obsSanitizePath(s) {
  return obsTrim(s)
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
}

function obsYamlQuote(s) {
  return '"' + String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n") + '"';
}

function obsYamlLineIf(key, value) {
  if (obsTrim(value) === "") return "";
  return key + ": " + obsYamlQuote(value) + "\n";
}

function obsLinkHtml(uri) {
  return '<a href="' + obsHtmlEscape(uri) + '">' + obsHtmlEscape(uri) + '</a>';
}

function obsSetLinkField(entryObj, fieldName, uri) {
  if (fieldName && entryObj && uri) {
    entryObj.set(fieldName, obsLinkHtml(uri));
  }
}

function obsBuildOverwriteUri(cfg, e, l) {
  var vault = cfg.vault || "RasObs";
  var dbNameRaw = obsLibName(l);
  var dbName = obsSanitizePath(dbNameRaw);
  var mementoId = obsTrim(obsEntryId(e));
  var titleRaw = obsTitle(e) || "Ohne Titel";
  var fileName;
  var filepath;
  var rawContent;
  var mementoDate;
  var mementoDateCreated;
  var mementoLink;
  var tagPath;
  var finalContent;

  if (!dbName || !mementoId) return "";

  fileName = obsSanitizePath(titleRaw) + " (" + mementoId + ")";
  filepath = "memento/" + dbName + "/" + fileName + ".md";
  rawContent = String(e.field(cfg.contentField) || "");
  mementoDate = cfg.dateField ? obsTrim(e.field(cfg.dateField)) : "";
  mementoDateCreated = obsTrim(e.creationTime || "");
  mementoLink = cfg.mementoLinkField ? obsTrim(e.field(cfg.mementoLinkField)) : "";
  tagPath = "memento/" + dbName;

  finalContent =
    "---\n" +
    "memento_id: " + obsYamlQuote(mementoId) + "\n" +
    "memento_db: " + obsYamlQuote(dbNameRaw) + "\n" +
    obsYamlLineIf("memento_link", mementoLink) +
    obsYamlLineIf("memento_date", mementoDate) +
    obsYamlLineIf("memento_date_created", mementoDateCreated) +
    "tags: " + obsYamlQuote(tagPath) + "\n" +
    "---\n" +
    "# " + titleRaw + "\n\n" +
    rawContent;

  return "obsidian://advanced-uri" +
    "?vault=" + encodeURIComponent(vault) +
    "&filepath=" + encodeURIComponent(filepath) +
    "&data=" + encodeURIComponent(finalContent) +
    "&mode=overwrite";
}

function makeObsidianMementoUri(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || entry();
  var l = cfg.libObj || lib();
  var vault = cfg.vault || "RasObs";
  var overwriteField = cfg.overwriteLinkField || cfg.htmlTargetField || cfg.targetField;
  var obsidianField = cfg.obsidianLinkField || cfg.openLinkField || overwriteField;
  var obsidianRaw = obsidianField ? String(e.field(obsidianField) || "") : "";
  var overwriteRaw = overwriteField ? String(e.field(overwriteField) || "") : "";
  var obsidianUri = obsExtractUri(obsidianRaw);
  var overwriteUri = obsExtractUri(overwriteRaw);
  var existingUid = obsExtractQueryParam(obsidianRaw, "uid") || obsExtractQueryParam(overwriteRaw, "uid");
  var existingOverwriteMode = obsExtractQueryParam(overwriteRaw, "mode");
  var openUri = "";
  var createUri = "";

  if (!e || !cfg.contentField) {
    return { overwriteUri: "", obsidianUri: "", mode: "missing_config" };
  }

  if (existingUid) {
    openUri = "obsidian://adv-uri?vault=" + encodeURIComponent(vault) + "&uid=" + encodeURIComponent(existingUid);
    obsSetLinkField(e, obsidianField, openUri);
    return { overwriteUri: overwriteUri, obsidianUri: openUri, mode: "uid" };
  }

  if (obsidianUri) {
    obsSetLinkField(e, obsidianField, obsidianUri);
    return { overwriteUri: overwriteUri, obsidianUri: obsidianUri, mode: "existing_obsidian_uri" };
  }

  if (overwriteUri && existingOverwriteMode === "overwrite") {
    obsSetLinkField(e, overwriteField, overwriteUri);
    return { overwriteUri: overwriteUri, obsidianUri: "", mode: "existing_overwrite" };
  }

  createUri = obsBuildOverwriteUri(cfg, e, l);
  obsSetLinkField(e, overwriteField, createUri);

  return { overwriteUri: createUri, obsidianUri: "", mode: createUri ? "created_overwrite" : "missing_identity" };
}
