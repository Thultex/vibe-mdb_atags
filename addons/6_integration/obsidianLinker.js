/*
========================================
B8 Obsidian Linker v1.17 (sys 2.50)
========================================

Changes
- add Memento to Obsidian Advanced URI linker
- separate overwrite link field and Obsidian link field
- support overwriteHtmlField as the create/overwrite link target
- support obsidianHtmlField as the formatted Obsidian link target
- always refresh the create/overwrite link when its field is separate
- keep Memento id for filepath and frontmatter only
- format existing Obsidian links without replacing them with overwrite links
- hide overwrite link once an Obsidian link is connected
- show connected Obsidian links with direct and Windows helper links
- write full link texts for Memento link detection
- omit Windows/Web redirect link unless configured
- render connected links as Markdown links for testing
- prefer Markdown field option names while keeping HTML aliases
- optionally open the generated or connected Obsidian URI
- broaden Windows open attempts for Memento Desktop Java engines
- parse Markdown Obsidian links without self-nesting
- mark opened overwrite links as pending insert
- keep obsidian-only configs from creating overwrite links
- write connected Obsidian fields as bare Markdown links
- allow obsidianMarkdownField-only configs to create/open overwrite links
- add formatOnly mode for after-entry formatting without creating/opening overwrite links

Usage

makeObsidianMementoUri({
  contentField: "Text",
  overwriteMarkdownField: "Obsidian Overwrite Link",
  obsidianMarkdownField: "Obsidian Link",
  dateField: "Datum",
  mementoLinkField: "Memento Link",
  vault: "ExampleVault",
  formatOnly: false,
  open: false
});

*/

/*
========================================
B8 Obsidian Linker v1.17 (sys 2.50)
========================================
*/

function getObsidianLinkerVersion() {
  return {
    name: "obsidianLinker",
    version: "1.17",
    sysVersion: "2.50",
    path: "addons/6_integration/obsidianLinker.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("obsidianLinker", "1.17", "2.50", "addons/6_integration/obsidianLinker.js", true);
}

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
  var match = text.match(/\]\((obsidian:\/\/(?:advanced-uri|adv-uri)[^\s"'<>\)]+)\)/);
  if (match) return match[1];

  match = text.match(/obsidian:\/\/(?:advanced-uri|adv-uri)[^\s"'<>\]\[]+/);
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

function obsPendingInsertText(cfg) {
  return cfg && cfg.pendingInsertText ? String(cfg.pendingInsertText) : "EINFÜGEN";
}

function obsPendingInsertMarkdown(cfg) {
  return "Link: " + obsPendingInsertText(cfg);
}

function obsIsPendingInsert(s, cfg) {
  return obsTrim(s) === obsPendingInsertMarkdown(cfg);
}

function obsFormatOnly(cfg) {
  return cfg && (cfg.formatOnly === true || cfg.createOverwriteLink === false);
}

function obsFormatOnlyOpenResult() {
  return { attempted: false, ok: false, method: "format_only", error: "" };
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

function obsMarkdownEscapeText(s) {
  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function obsLinkMarkdown(uri) {
  return "[" + obsMarkdownEscapeText(uri) + "](" + String(uri == null ? "" : uri).replace(/\)/g, "%29") + ")";
}

function obsWindowsOpenUri(cfg, uri) {
  var base = cfg.windowsOpenBase;

  if (base === null || base === false) return "";
  if (base == null || base === "") return "";

  base = String(base);
  if (base.indexOf("{uri}") >= 0) {
    return base.replace(/\{uri\}/g, encodeURIComponent(uri));
  }

  return base + encodeURIComponent(uri);
}

function obsConnectedLinkMarkdown(cfg, uri) {
  var winUri = obsWindowsOpenUri(cfg, uri);
  var text = obsLinkMarkdown(uri);

  if (winUri) {
    text += "\nWin: " + obsLinkMarkdown(winUri);
  }

  return text;
}

function obsSetLinkField(entryObj, fieldName, uri) {
  if (fieldName && entryObj && uri) {
    entryObj.set(fieldName, obsLinkMarkdown(uri));
  }
}

function obsSetConnectedLinkField(entryObj, fieldName, uri, cfg) {
  if (fieldName && entryObj && uri) {
    entryObj.set(fieldName, obsConnectedLinkMarkdown(cfg || {}, uri));
  }
}

function obsClearField(entryObj, fieldName) {
  if (fieldName && entryObj) {
    entryObj.set(fieldName, "");
  }
}

function obsOpenUri(uri, cfg) {
  var i;
  var Desktop;
  var URI;
  var ProcessBuilder;
  var lastError = "";

  if (!cfg || !cfg.open || !uri) {
    return { attempted: false, ok: false, method: "disabled", error: "" };
  }

  try {
    if (typeof cfg.openFunction === "function") {
      cfg.openFunction(uri);
      return { attempted: true, ok: true, method: "openFunction", error: "" };
    }
  } catch (errOpenFunction) {
    lastError = String(errOpenFunction && errOpenFunction.message ? errOpenFunction.message : errOpenFunction);
  }

  try {
    if (typeof intent === "function") {
      i = intent("android.intent.action.VIEW");
      i.data(uri);
      i.send();
      return { attempted: true, ok: true, method: "android_intent", error: "" };
    }
  } catch (errIntent) {
    lastError = String(errIntent && errIntent.message ? errIntent.message : errIntent);
  }

  try {
    if (typeof Java !== "undefined" && Java.type) {
      Desktop = Java.type("java.awt.Desktop");
      URI = Java.type("java.net.URI");
      Desktop.getDesktop().browse(new URI(uri));
      return { attempted: true, ok: true, method: "java_type_desktop", error: "" };
    }
  } catch (errJavaTypeDesktop) {
    lastError = String(errJavaTypeDesktop && errJavaTypeDesktop.message ? errJavaTypeDesktop.message : errJavaTypeDesktop);
  }

  try {
    if (typeof java !== "undefined" && java.awt && java.awt.Desktop && java.net && java.net.URI) {
      java.awt.Desktop.getDesktop().browse(new java.net.URI(uri));
      return { attempted: true, ok: true, method: "java_desktop", error: "" };
    }
  } catch (errJavaDesktop) {
    lastError = String(errJavaDesktop && errJavaDesktop.message ? errJavaDesktop.message : errJavaDesktop);
  }

  try {
    if (typeof Packages !== "undefined" && Packages.java && Packages.java.awt && Packages.java.awt.Desktop) {
      Packages.java.awt.Desktop.getDesktop().browse(new Packages.java.net.URI(uri));
      return { attempted: true, ok: true, method: "packages_java_desktop", error: "" };
    }
  } catch (errPackagesDesktop) {
    lastError = String(errPackagesDesktop && errPackagesDesktop.message ? errPackagesDesktop.message : errPackagesDesktop);
  }

  try {
    if (typeof Java !== "undefined" && Java.type) {
      ProcessBuilder = Java.type("java.lang.ProcessBuilder");
      new ProcessBuilder(["rundll32.exe", "url.dll,FileProtocolHandler", uri]).start();
      return { attempted: true, ok: true, method: "java_type_rundll32", error: "" };
    }
  } catch (errJavaTypeRundll) {
    lastError = String(errJavaTypeRundll && errJavaTypeRundll.message ? errJavaTypeRundll.message : errJavaTypeRundll);
  }

  try {
    if (typeof Packages !== "undefined" && Packages.java && Packages.java.lang && Packages.java.lang.ProcessBuilder) {
      new Packages.java.lang.ProcessBuilder(["rundll32.exe", "url.dll,FileProtocolHandler", uri]).start();
      return { attempted: true, ok: true, method: "packages_java_rundll32", error: "" };
    }
  } catch (errPackagesRundll) {
    lastError = String(errPackagesRundll && errPackagesRundll.message ? errPackagesRundll.message : errPackagesRundll);
  }

  return { attempted: true, ok: false, method: "unavailable", error: lastError || "No supported URI opener available" };
}

function obsBuildOverwriteUri(cfg, e, l) {
  var vault = cfg.vault || "ExampleVault";
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
  var vault = cfg.vault || "ExampleVault";
  var overwriteField = cfg.overwriteMarkdownField || cfg.overwriteHtmlField || cfg.overwriteLinkField || cfg.markdownTargetField || cfg.htmlTargetField || cfg.targetField || cfg.obsidianMarkdownField || cfg.obsidianHtmlField || cfg.obsidianLinkField || cfg.openLinkField;
  var obsidianField = cfg.obsidianMarkdownField || cfg.obsidianHtmlField || cfg.obsidianLinkField || cfg.openLinkField || cfg.overwriteMarkdownField || cfg.overwriteHtmlField || cfg.overwriteLinkField || cfg.markdownTargetField || cfg.htmlTargetField || cfg.targetField;
  var hasOverwriteField = !!overwriteField;
  var obsidianRaw = obsidianField ? String(e.field(obsidianField) || "") : "";
  var overwriteRaw = overwriteField ? String(e.field(overwriteField) || "") : "";
  var sameField = overwriteField && obsidianField && overwriteField === obsidianField;
  var obsidianUri = obsExtractUri(obsidianRaw);
  var obsidianMode = obsUriMode(obsidianRaw);
  var pendingInsert = obsidianField && obsIsPendingInsert(obsidianRaw, cfg);
  var overwriteUri = "";
  var existingUid = obsExtractQueryParam(obsidianRaw, "uid") || obsExtractQueryParam(overwriteRaw, "uid");
  var openUri = "";
  var createUri = "";
  var hasObsidianOpenLink = false;
  var mode = "";
  var openResult;

  if (!e || !cfg.contentField) {
    return { overwriteUri: "", obsidianUri: "", mode: "missing_config", openResult: { attempted: false, ok: false, method: "disabled", error: "" } };
  }

  createUri = obsBuildOverwriteUri(cfg, e, l);
  overwriteUri = createUri;

  if (pendingInsert) {
    if (!sameField) {
      obsClearField(e, overwriteField);
    }
    return { overwriteUri: "", obsidianUri: "", mode: sameField ? "pending_insert_same_field" : "pending_insert", openResult: { attempted: false, ok: false, method: "pending_insert", error: "" } };
  }

  if (existingUid) {
    openUri = "obsidian://adv-uri?vault=" + encodeURIComponent(vault) + "&uid=" + encodeURIComponent(existingUid);
    hasObsidianOpenLink = true;
  } else if (obsidianUri && obsidianMode !== "overwrite") {
    openUri = obsidianUri;
    hasObsidianOpenLink = true;
  }

  if (obsFormatOnly(cfg) && !hasObsidianOpenLink) {
    return { overwriteUri: "", obsidianUri: "", mode: "format_only_no_link", openResult: { attempted: false, ok: false, method: "format_only", error: "" } };
  }

  if (sameField) {
    if (hasObsidianOpenLink) {
      obsSetConnectedLinkField(e, obsidianField, openUri, cfg);
      openResult = obsFormatOnly(cfg) ? obsFormatOnlyOpenResult() : obsOpenUri(openUri, cfg);
      return { overwriteUri: "", obsidianUri: openUri, mode: "connected_obsidian_same_field", openResult: openResult };
    }

    if (cfg.open && createUri) {
      openResult = obsOpenUri(createUri, cfg);
      if (openResult.ok) {
        e.set(overwriteField, obsPendingInsertMarkdown(cfg));
        return { overwriteUri: "", obsidianUri: "", mode: "opened_overwrite_pending_insert_same_field", openResult: openResult };
      }
      obsSetLinkField(e, overwriteField, createUri);
      return { overwriteUri: createUri, obsidianUri: "", mode: "open_failed_created_overwrite_same_field", openResult: openResult };
    }

    obsSetLinkField(e, overwriteField, createUri);
    openResult = obsOpenUri(createUri, cfg);
    return { overwriteUri: createUri, obsidianUri: "", mode: createUri ? "created_overwrite_same_field" : "missing_identity", openResult: openResult };
  }

  if (hasObsidianOpenLink) {
    obsClearField(e, overwriteField);
    obsSetConnectedLinkField(e, obsidianField, openUri, cfg);
    openResult = obsFormatOnly(cfg) ? obsFormatOnlyOpenResult() : obsOpenUri(openUri, cfg);
    return { overwriteUri: "", obsidianUri: openUri, mode: "connected_obsidian", openResult: openResult };
  }

  if (createUri) {
    if (!hasOverwriteField) {
      return { overwriteUri: createUri, obsidianUri: openUri, mode: "obsidian_only_no_overwrite", openResult: { attempted: false, ok: false, method: "obsidian_only", error: "" } };
    } else if (cfg.open) {
      openResult = obsOpenUri(createUri, cfg);
      obsClearField(e, overwriteField);
      if (obsidianField) {
        e.set(obsidianField, obsPendingInsertMarkdown(cfg));
      }
      return { overwriteUri: "", obsidianUri: "", mode: openResult.ok ? "opened_overwrite_pending_insert" : "open_overwrite_pending_insert", openResult: openResult };
    } else {
      obsSetLinkField(e, overwriteField, createUri);
      mode = "created_overwrite";
    }
  } else {
    mode = "missing_identity";
  }

  openResult = obsOpenUri(createUri, cfg);
  return { overwriteUri: createUri, obsidianUri: openUri, mode: mode, openResult: openResult };
}
