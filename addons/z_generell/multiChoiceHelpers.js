/*
========================================
C1 Multi Choice Helpers v1.02 (sys 2.50)
========================================

Changes
- add helpers for adding and removing values in multi-choice fields
- normalize Memento list-like multi-choice values before writing
- return true only when the field value changed
- support explicit entryObj for tests and scripted reuse

Usage

multiChoiceAppend({
  field: "typ",
  value: "Tag"
});

multiChoiceRemove({
  field: "typ",
  value: "Tag"
});

*/

/*
========================================
C1 Multi Choice Helpers v1.02 (sys 2.50)
========================================
*/

function getMultiChoiceHelpersVersion() {
  return {
    name: "multiChoiceHelpers",
    version: "1.02",
    sysVersion: "2.50",
    path: "addons/z_generell/multiChoiceHelpers.js"
  };
}

if (typeof registerAtagLibVersion === "function") {
  registerAtagLibVersion("multiChoiceHelpers", "1.02", "2.50", "addons/z_generell/multiChoiceHelpers.js", true);
}

function multiChoiceIsArray(val) {
  return Object.prototype.toString.call(val) === "[object Array]";
}

function multiChoiceIsString(val) {
  return typeof val === "string" || Object.prototype.toString.call(val) === "[object String]";
}

function multiChoiceListLength(val) {
  var n;

  if (val == null || multiChoiceIsString(val)) return null;
  if (multiChoiceIsArray(val)) return val.length;

  if (typeof val.length === "number") {
    n = Number(val.length);
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  }

  if (typeof val.size === "function") {
    n = Number(val.size());
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) return n;
  }

  return null;
}

function multiChoiceListItem(val, index) {
  if (typeof val.get === "function") return val.get(index);
  if (typeof val.item === "function") return val.item(index);
  return val[index];
}

function normalizeMultiChoiceValue(val) {
  var len;
  var out;
  var i;

  if (val == null || val === "") return [];
  if (multiChoiceIsArray(val)) return val.slice();

  len = multiChoiceListLength(val);
  if (len != null) {
    out = [];
    for (i = 0; i < len; i++) out.push(multiChoiceListItem(val, i));
    return out;
  }

  return [val];
}

function multiChoiceContains(arr, value) {
  var needle = String(value);
  var i;

  for (i = 0; i < arr.length; i++) {
    if (String(arr[i]) === needle) return true;
  }

  return false;
}

function resolveMultiChoiceEntry(cfg) {
  if (cfg && cfg.entryObj) return cfg.entryObj;
  return entry();
}

function multiChoiceAppend(cfg) {
  cfg = cfg || {};

  var e = resolveMultiChoiceEntry(cfg);
  var field = cfg.field;
  var value = cfg.value;
  var current;

  if (!e || !field || value == null || value === "") return false;

  current = normalizeMultiChoiceValue(e.field(field));
  if (multiChoiceContains(current, value)) return false;

  current.push(value);
  e.set(field, current);

  return true;
}

function multiChoiceRemove(cfg) {
  cfg = cfg || {};

  var e = resolveMultiChoiceEntry(cfg);
  var field = cfg.field;
  var value = cfg.value;
  var current;
  var next = [];
  var removed = false;
  var needle = String(value);
  var i;

  if (!e || !field || value == null || value === "") return false;

  current = normalizeMultiChoiceValue(e.field(field));

  for (i = 0; i < current.length; i++) {
    if (String(current[i]) === needle) {
      removed = true;
    } else {
      next.push(current[i]);
    }
  }

  if (!removed) return false;

  e.set(field, next);
  return true;
}
