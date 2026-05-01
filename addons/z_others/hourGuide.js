/*
========================================
Addon Hour Guide v1.00 (sys 2.11)
========================================

Changes
- add time-window guide output for Memento HTML fields
- configurable source field, target field and cutoff
- return empty text for invalid or late hour values

Usage

applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  maxHours: 16
});

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

function hourGuideDefaultPlan() {
  return {
    wakeup: {
      label: "Wake-up - 0-20 min",
      from: 0,
      to: 0.4,
      energy: [["Activation", "light, water, brief movement"], ["Stress", "start calmly"]],
      focus: [["Start", "5-min entry, 1 tiny goal"], ["Planning", "no planning >2 min"]],
      emotion: [["Neutralize", "no pressure"], ["Direction", "gentle"]]
    },
    start: {
      label: "Start phase - 0.4-1 h",
      from: 0.4,
      to: 1,
      energy: [["Stable", "stay calm"]],
      focus: [["Entry", "5-min entry"], ["Externalize", "1-3 notes"]],
      emotion: [["Review", "no perfectionism"]]
    },
    transition: {
      label: "Transition - 1-3 h",
      from: 1,
      to: 3,
      energy: [["Movement", "30-60 s"]],
      focus: [["Scatter", "small switches"], ["Opening window", "when HF appears"]],
      emotion: [["Loose", "do not lock in"]]
    },
    peak: {
      label: "Peak - 3-7 h",
      from: 3,
      to: 7,
      energy: [["Use", "apply intentionally"], ["Microbreaks", "short"]],
      focus: [["Steer", "watch HF"], ["Opening window", "when marker appears"], ["Scatter", "1-2/h"]],
      emotion: [["Regulate", "ED reset"], ["Response pause", "2-3 s"]]
    },
    easing: {
      label: "Easing - 7-10 h",
      from: 7,
      to: 10,
      energy: [["Energy", "do not push"]],
      focus: [["Simplify", "lighter"], ["Scatter", "more switching"]],
      emotion: [["Tension", "movement"]]
    },
    late: {
      label: "Late phase - 10-12.5 h",
      from: 10,
      to: 12.5,
      energy: [["Low", "light"]],
      focus: [["Close", "no new tasks"]],
      emotion: [["Calm", "stabilize"]]
    },
    evening: {
      label: "Evening - 12.5-16 h",
      from: 12.5,
      to: 16,
      energy: [["Wind down", "no activation"]],
      focus: [["Soft", "HF allowed"], ["Quality", "light"], ["Limit", "no re-entry"]],
      emotion: [["Relief", "no pressure"], ["Sleep protection", "passive"]]
    }
  };
}

function hourGuideGetBlock(hours, plan) {
  var key;
  var block;

  for (key in plan) {
    if (plan.hasOwnProperty(key)) {
      block = plan[key];
      if (hours >= block.from && hours < block.to) return block;
    }
  }

  return null;
}

function hourGuideSection(title, rows) {
  var html = "";
  var i;

  html += "<br>";
  html += "<div><b>&gt; " + hourGuideEscapeHtml(String(title).toUpperCase()) + "</b></div>";
  html += "<div>--------</div>";

  for (i = 0; i < rows.length; i++) {
    html += "<div style=\"margin-left:6px; margin-bottom:10px;\">";
    html += "- <b>" + hourGuideEscapeHtml(rows[i][0]) + "</b>";
    html += " - <i>" + hourGuideEscapeHtml(rows[i][1]) + "</i>";
    html += "</div>";
  }

  return html;
}

function makeHourGuideHtml(hours, cfg) {
  cfg = cfg || {};

  var h = hourGuideToNumber(hours);
  var maxHours = cfg.maxHours == null ? 16 : hourGuideToNumber(cfg.maxHours);
  var plan = cfg.plan || hourGuideDefaultPlan();
  var block;
  var html;

  if (h == null) return "";
  if (maxHours != null && h >= maxHours) return "";

  block = hourGuideGetBlock(h, plan);
  if (!block) return "";

  html = "";
  html += "<div><b><br>* " + hourGuideEscapeHtml(block.label) + "</b></div>";
  html += hourGuideSection("Energy", block.energy || []);
  html += hourGuideSection("Focus", block.focus || []);
  html += hourGuideSection("Emotion", block.emotion || []);

  return html;
}

function applyHourGuide(cfg) {
  cfg = cfg || {};

  var e = cfg.entryObj || entry();
  var sourceField = cfg.sourceHoursField || cfg.hoursField || "hours since dose";
  var out;

  if (!e) return "";

  out = makeHourGuideHtml(e.field(sourceField), cfg);

  if (cfg.targetField) {
    e.set(cfg.targetField, out);
  }

  return out;
}
