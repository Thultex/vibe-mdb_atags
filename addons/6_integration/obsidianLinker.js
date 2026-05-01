/*
========================================
Addon Obsidian Linker v1.01 (sys 2.11)
========================================

Changes
- add Memento to Obsidian Advanced URI linker
- separate overwrite link field and Obsidian link field
- support overwriteHtmlField as the create/overwrite link target
- support obsidianHtmlField as the formatted Obsidian link target
- always refresh the create/overwrite link when its field is separate
- keep Memento id for filepath and frontmatter only
- format existing Obsidian links without replacing them with overwrite links

Usage

makeObsidianMementoUri({
  contentField: "Text",
  overwriteHtmlField: "Obsidian Overwrite Link",
  obsidianHtmlField: "Obsidian Link",
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

function obsUriMode(s) {
  return obsExtractQueryParam(s, "mode");
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
  var overwriteField = cfg.overwriteHtmlField || cfg.overwriteLinkField || cfg.htmlTargetField || cfg.targetField || cfg.obsidianHtmlField || cfg.obsidianLinkField || cfg.openLinkField;
  var obsidianField = cfg.obsidianHtmlField || cfg.obsidianLinkField || cfg.openLinkField || cfg.overwriteHtmlField || cfg.overwriteLinkField || cfg.htmlTargetField || cfg.targetField;
  var obsidianRaw = obsidianField ? String(e.field(obsidianField) || "") : "";
  var overwriteRaw = overwriteField ? String(e.field(overwriteField) || "") : "";
  var sameField = overwriteField && obsidianField && overwriteField === obsidianField;
  var obsidianUri = obsExtractUri(obsidianRaw);
  var obsidianMode = obsUriMode(obsidianRaw);
  var overwriteUri = "";
  var existingUid = obsExtractQueryParam(obsidianRaw, "uid") || obsExtractQueryParam(overwriteRaw, "uid");
  var openUri = "";
  var createUri = "";
  var hasObsidianOpenLink = false;
  var mode = "";

  if (!e || !cfg.contentField) {
    return { overwriteUri: "", obsidianUri: "", mode: "missing_config" };
  }

  createUri = obsBuildOverwriteUri(cfg, e, l);
  overwriteUri = createUri;

  if (existingUid) {
    openUri = "obsidian://adv-uri?vault=" + encodeURIComponent(vault) + "&uid=" + encodeURIComponent(existingUid);
    hasObsidianOpenLink = true;
  } else if (obsidianUri && obsidianMode !== "overwrite") {
    openUri = obsidianUri;
    hasObsidianOpenLink = true;
  }

  if (sameField) {
    if (hasObsidianOpenLink) {
      obsSetLinkField(e, obsidianField, openUri);
      return { overwriteUri: createUri, obsidianUri: openUri, mode: "formatted_obsidian_same_field" };
    }

    obsSetLinkField(e, overwriteField, createUri);
    return { overwriteUri: createUri, obsidianUri: "", mode: createUri ? "created_overwrite_same_field" : "missing_identity" };
  }

  if (createUri) {
    obsSetLinkField(e, overwriteField, createUri);
    mode = "created_overwrite";
  } else {
    mode = "missing_identity";
  }

  if (hasObsidianOpenLink) {
    obsSetLinkField(e, obsidianField, openUri);
    mode = createUri ? "created_overwrite_and_formatted_obsidian" : "formatted_obsidian";
  }

  return { overwriteUri: createUri, obsidianUri: openUri, mode: mode };
}
