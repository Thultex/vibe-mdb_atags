/*
========================================
C3 Hour Guide v1.30 (sys 2.40)
========================================

Changes
- support explicit entry/source entry input and empty-hour fallback to first block
- restore anonymized default guide content row
- restore original Stundenhilfe content and visual style from issue #20
- treat guide section headers as content, not fixed API names
- use German built-in guide contents and cleaner phase header
- render separator as the original-looking light line
- remove line-comment markers from header examples
- keep JSON format free of renderer punctuation
- render arrows and separators closer to the original guide style
- force sans-serif HTML output and log missing fields
- guard missing fields in Memento triggers
- support JSON/shared plan fields with flexible sections
- render configurable section names and rich HTML rows
- add time-window guide output for Memento HTML fields
- configurable source field, target field and cutoff
- return empty text for invalid or late hour values

Usage / Nutzbeispiele

Beispiel 1: Eingebaute Vorgabe nutzen

applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  maxHours: 16
});

Beispiel 2: Vorgabe aus einem synchronisierten/shared JSON-Feld lesen

applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  planField: "Hour Guide JSON",
  maxHours: 16
});

Beispiel 3: Vorgabe direkt im Trigger hinterlegen

applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  plan: {
    maxHours: 16,
    blocks: [
      {
        label: "Startphase · 0.4–1 h",
        from: 0.4,
        to: 1,
        sections: [
          { title: "Energie", rows: [["Stabil", "ruhig bleiben"]] },
          { title: "Fokus", rows: [{ title: "Einstieg", text: "5-Min-Entry" }] }
        ]
      }
    ]
  }
});

JSON-Feld "Hour Guide JSON" fuer Beispiel 2:
JSON enthaelt nur Inhalt/Struktur. Dreieckspfeil, Linien und
Zwischenstriche werden beim Rendern automatisch ergaenzt.

{
  "maxHours": 16,
  "blocks": [
    {
      "label": "Startphase · 0.4–1 h",
      "from": 0.4,
      "to": 1,
      "sections": [
        {"title": "Energie", "rows": [["Stabil", "ruhig bleiben"]]},
        {"title": "Fokus", "rows": [{"title": "Einstieg", "text": "5-Min-Entry"}]}
      ]
    }
  ]
}
*/

/*
========================================
C3 Hour Guide v1.30 (sys 2.40)
========================================
*/

function hourGuideToNumber(val) {
  var n;
  if (val == null || val === "") return null;
  n = Number(String(val).replace(",", "."));
  if (isNaN(n)) return null;
  return n;
}

function hourGuideEscapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hourGuideIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function hourGuideTrim(s) {
  return String(s == null ? "" : s).replace(/^\s+|\s+$/g, "");
}

function hourGuideParseJson(raw) {
  var s = hourGuideTrim(raw);
  if (!s) return null;

  try {
    if (typeof JSON !== "undefined" && JSON.parse) {
      return JSON.parse(s);
    }
    return eval("(" + s + ")");
  } catch (e) {
    return null;
  }
}

function hourGuideRichText(raw) {
  var s = hourGuideEscapeHtml(raw);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/__([^_]+)__/g, "<b>$1</b>");
  return s;
}

function hourGuideLog(msg) {
  try {
    log("Hour Guide: " + String(msg));
  } catch (e) {}
}

function hourGuideEntry() {
  try {
    return entry();
  } catch (e) {
    hourGuideLog("entry not available");
    return null;
  }
}

function hourGuideReadField(entryObj, fieldName, role) {
  if (!entryObj || !fieldName) return null;
  try {
    return entryObj.field(fieldName);
  } catch (e) {
    hourGuideLog("cannot read " + (role || "field") + " '" + fieldName + "'");
    return null;
  }
}

function hourGuideReadFieldInfo(entryObj, fieldName, role) {
  if (!entryObj || !fieldName) return { ok: false, value: null };
  try {
    return { ok: true, value: entryObj.field(fieldName) };
  } catch (e) {
    hourGuideLog("cannot read " + (role || "field") + " '" + fieldName + "'");
    return { ok: false, value: null };
  }
}

function hourGuideWriteField(entryObj, fieldName, val, role) {
  if (!entryObj || !fieldName) return false;
  try {
    entryObj.set(fieldName, val);
    return true;
  } catch (e) {
    hourGuideLog("cannot write " + (role || "field") + " '" + fieldName + "'");
    return false;
  }
}

function hourGuideDefaultPlan() {
  return {
    aufstehen: {
      label: "Aufstehen · 0–20 min",
      from: 0,
      to: 0.4,
      sections: [
        { title: "Energie", rows: [["Aktivierung", "Licht, Wasser, kurz bewegen"], ["Stress", "ruhig starten"]] },
        { title: "Fokus", rows: [["Start", "5-Min-Entry, 1 Mini-Ziel"], ["Planung", "kein Plan >2 min"]] },
        { title: "Emotion", rows: [["Neutralisieren", "kein Muss"], ["Zielstrebigkeit", "sanft"]] }
      ]
    },
    startphase: {
      label: "Startphase · 0.4–1 h",
      from: 0.4,
      to: 1,
      sections: [
        { title: "Energie", rows: [["Stabil", "ruhig bleiben"]] },
        { title: "Fokus", rows: [["Einstieg", "5-Min-Entry"], ["Externalisieren", "1–3 Stichworte"]] },
        { title: "Emotion", rows: [["Bewertung", "kein Perfektionismus"]] }
      ]
    },
    uebergang: {
      label: "Übergang · 1–3 h",
      from: 1,
      to: 3,
      sections: [
        { title: "Energie", rows: [["Bewegung", "30-60 s"]] },
        { title: "Fokus", rows: [["Streuen", "kleine Wechsel"], ["Öffnungsfenster", "bei HF"]] },
        { title: "Emotion", rows: [["Locker", "kein Festbeißen"]] }
      ]
    },
    peak: {
      label: "Peak · 3–7 h",
      from: 3,
      to: 7,
      sections: [
        { title: "Energie", rows: [["Nutzen", "gezielt einsetzen"], ["Mikropausen", "kurz"]] },
        { title: "Fokus", rows: [["Steuern", "HF beachten"], ["Öffnungsfenster", "bei Marker"], ["Streuen", "1–2/h"]] },
        { title: "Emotion", rows: [["Regulieren", "ED-Reset"], ["Antwortpause", "2-3 s"]] }
      ]
    },
    abklingend: {
      label: "Abklingend · 7–10 h",
      from: 7,
      to: 10,
      sections: [
        { title: "Energie", rows: [["Energie", "nicht pushen"]] },
        { title: "Fokus", rows: [["Vereinfachen", "leichter"], ["Streuen", "mehr Wechsel"]] },
        { title: "Emotion", rows: [["Spannung", "Bewegung"]] }
      ]
    },
    spaet: {
      label: "Spätphase · 10–12.5 h",
      from: 10,
      to: 12.5,
      sections: [
        { title: "Energie", rows: [["Low", "leicht"]] },
        { title: "Fokus", rows: [["Abschluss", "keine neuen Tasks"]] },
        { title: "Emotion", rows: [["Ruhe", "stabilisieren"]] }
      ]
    },
    abend: {
      label: "Abend · 12.5–16 h",
      from: 12.5,
      to: 16,
      sections: [
        { title: "Energie", rows: [["Runter", "keine Aktivierung"]] },
        { title: "Fokus", rows: [["Weich", "HF erlaubt"], ["Qualität", "leicht"], ["Begrenzen", "kein Re-Entry"]] },
        { title: "Emotion", rows: [["Entlastung", "kein Druck"], ["Schlafschutz", "passiv"]] }
      ]
    }
  };
}

function hourGuideDefaultCategories() {
  return ["energy", "focus", "emotion"];
}

function hourGuideCategoryLabel(name) {
  var s = String(name || "");
  var key = s.toLowerCase();
  if (!s) return "";
  if (key === "energy") return "Energie";
  if (key === "focus") return "Fokus";
  if (key === "emotion") return "Emotion";
  return s.charAt(0).toUpperCase() + s.substring(1);
}

function hourGuidePlanFromRaw(rawPlan) {
  var raw = rawPlan || hourGuideDefaultPlan();
  var out = {
    blocks: [],
    categories: null,
    maxHours: null
  };
  var blocks;
  var key;
  var i;

  if (typeof raw === "string") {
    raw = hourGuideParseJson(raw);
  }

  if (!raw) raw = hourGuideDefaultPlan();

  if (raw.maxHours != null) out.maxHours = raw.maxHours;
  if (raw.categories != null) out.categories = raw.categories;

  blocks = raw.blocks || raw.windows || raw.phases || null;

  if (hourGuideIsArray(blocks)) {
    for (i = 0; i < blocks.length; i++) {
      if (blocks[i]) out.blocks.push(blocks[i]);
    }
  } else if (blocks) {
    for (key in blocks) {
      if (blocks.hasOwnProperty(key) && blocks[key]) out.blocks.push(blocks[key]);
    }
  } else {
    for (key in raw) {
      if (!raw.hasOwnProperty(key)) continue;
      if (key === "maxHours" || key === "categories") continue;
      if (raw[key]) out.blocks.push(raw[key]);
    }
  }

  return out;
}

function hourGuideGetBlock(hours, planInfo) {
  var key;
  var block;
  var blocks = planInfo && planInfo.blocks ? planInfo.blocks : [];

  for (key = 0; key < blocks.length; key++) {
    block = blocks[key];
    if (block && hours >= hourGuideToNumber(block.from) && hours < hourGuideToNumber(block.to)) return block;
  }

  return null;
}

function hourGuideRow(row) {
  var title = "";
  var text = "";
  var html = "";

  if (row == null) return "";

  if (typeof row === "string") {
    text = row;
  } else if (hourGuideIsArray(row)) {
    title = row[0];
    text = row[1];
  } else {
    title = row.title || row.label || row.name || "";
    text = row.text || row.value || row.body || row.note || "";
  }

  html += "<div style=\"margin-left:6px; margin-bottom:10px;\">";
  html += "• ";
  if (title) html += "<b>" + hourGuideRichText(title) + "</b>";
  if (title && text) html += " - ";
  if (text) html += "<i>" + hourGuideRichText(text) + "</i>";
  html += "</div>";

  return html;
}

function hourGuideSection(title, rows) {
  var html = "";
  var i;

  if (!rows || !rows.length) return "";

  html += "<br>";
  html += "<div><b>▸ " + hourGuideEscapeHtml(String(title).toUpperCase()) + "</b></div>";
  html += "<div>────────</div>";

  for (i = 0; i < rows.length; i++) {
    html += hourGuideRow(rows[i]);
  }

  return html;
}

function hourGuideBlockSections(block, planInfo) {
  var sections = [];
  var sectionMap = block.sections || block.categories || null;
  var categories = block.categoryOrder || block.sectionOrder || planInfo.categories || null;
  var seen = {};
  var key;
  var i;
  var name;
  var rows;

  function addSectionObject(sectionObj) {
    if (!sectionObj) return;
    addSection(
      sectionObj.title || sectionObj.label || sectionObj.name || "",
      sectionObj.rows || sectionObj.items || sectionObj.values || []
    );
  }

  function addSection(rawName, rawRows) {
    var sectionName = String(rawName || "");
    var sectionKey = sectionName.toLowerCase();
    if (!sectionName || seen[sectionKey]) return;
    if (!rawRows || !rawRows.length) return;
    seen[sectionKey] = true;
    sections.push({ label: hourGuideCategoryLabel(sectionName), rows: rawRows });
  }

  if (hourGuideIsArray(sectionMap)) {
    for (i = 0; i < sectionMap.length; i++) {
      addSectionObject(sectionMap[i]);
    }
    return sections;
  }

  if (categories && !hourGuideIsArray(categories)) categories = String(categories).split(",");

  if (categories && categories.length) {
    for (i = 0; i < categories.length; i++) {
      name = hourGuideTrim(categories[i]);
      if (!name) continue;
      rows = sectionMap ? sectionMap[name] || sectionMap[name.toLowerCase()] : block[name] || block[name.toLowerCase()];
      addSection(name, rows);
    }
  }

  if (sectionMap) {
    for (key in sectionMap) {
      if (sectionMap.hasOwnProperty(key)) addSection(key, sectionMap[key]);
    }
  } else {
    categories = hourGuideDefaultCategories();
    for (i = 0; i < categories.length; i++) {
      name = categories[i];
      addSection(name, block[name]);
    }
  }

  return sections;
}

function hourGuideReadPlanFromEntry(entryObj, cfg) {
  var fields;
  var i;
  var raw;
  var parsed;

  if (cfg.plan != null) return cfg.plan;
  if (cfg.planJson != null) return cfg.planJson;
  if (cfg.json != null) return cfg.json;
  if (!entryObj) return null;

  fields = cfg.planFields || cfg.configFields || null;
  if (!fields) {
    fields = cfg.planField || cfg.sharedPlanField || cfg.configField || cfg.jsonField || null;
  }
  if (!fields) return null;
  if (!hourGuideIsArray(fields)) fields = [fields];

  for (i = 0; i < fields.length; i++) {
    raw = hourGuideReadField(entryObj, fields[i], "plan field");
    parsed = hourGuideParseJson(raw);
    if (parsed) return parsed;
  }

  return null;
}

function hourGuideFirstBlockStart(planInfo) {
  var blocks = planInfo && planInfo.blocks ? planInfo.blocks : [];
  var i;
  var n;

  for (i = 0; i < blocks.length; i++) {
    if (!blocks[i]) continue;
    n = hourGuideToNumber(blocks[i].from);
    if (n != null) return n;
  }

  return 0;
}

function makeHourGuideHtml(hours, cfg) {
  cfg = cfg || {};

  var planInfo = hourGuidePlanFromRaw(cfg.plan || cfg.planJson || cfg.json || hourGuideDefaultPlan());
  var h = hourGuideToNumber(hours);
  var maxHours = cfg.maxHours == null ? (planInfo.maxHours == null ? 16 : hourGuideToNumber(planInfo.maxHours)) : hourGuideToNumber(cfg.maxHours);
  var block;
  var sections;
  var html;
  var i;

  if (h == null) {
    if (cfg.emptyHoursUseFirstBlock === true || cfg.emptyHoursAsFirstBlock === true) {
      h = hourGuideFirstBlockStart(planInfo);
    } else {
      return "";
    }
  }
  if (maxHours != null && h >= maxHours) return "";

  block = hourGuideGetBlock(h, planInfo);
  if (!block) return "";

  html = "";
  html += "<div style=\"font-family:sans-serif;\">";
  html += "<div><b><br>◆ " + hourGuideEscapeHtml(block.label) + "</b></div>";
  sections = hourGuideBlockSections(block, planInfo);
  for (i = 0; i < sections.length; i++) {
    html += hourGuideSection(sections[i].label, sections[i].rows);
  }
  html += "</div>";

  return html;
}

function applyHourGuide(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || cfg.currentEntry || cfg.targetEntry || cfg.entry || hourGuideEntry();
  var sourceEntry = cfg.sourceEntry || cfg.hoursEntry || e;
  var sourceField = cfg.sourceHoursField || cfg.hoursField || "hours since dose";
  var plan = hourGuideReadPlanFromEntry(e, cfg);
  var sourceInfo;
  var out;

  if (!e) return "";

  if (plan) cfg.plan = plan;
  sourceInfo = hourGuideReadFieldInfo(sourceEntry, sourceField, "source field");
  if (!sourceInfo.ok) {
    out = "";
  } else {
    cfg.emptyHoursUseFirstBlock = cfg.emptyHoursUseFirstBlock !== false;
    out = makeHourGuideHtml(sourceInfo.value, cfg);
  }

  if (cfg.targetField) {
    hourGuideWriteField(e, cfg.targetField, out, "target field");
  }

  return out;
}
