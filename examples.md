# Core-Beispiele

Kopierbare Beispiele fuer die Module in `core_lib/` und `core/`. Feldnamen und Inhalte sind neutral gehalten und muessen an die eigene Memento-Library angepasst werden.

Empfohlene Ladefolge:

1. optional `core/_checkVersions.js`
2. `core_lib/helpers_lib.js`
3. `core_lib/collectAtags_lib.js`
4. `core_lib/exportAtags_lib.js`
5. benoetigte Module aus `core/`

## `core_lib`

### #1 `collectAtags_lib.js`

Tags aus mehreren Textfeldern sammeln:

```js
var result = collectAtags({
  entryObj: entry(),
  textFields: ["Alias", "Notiz"]
});
```

Erforderliche Tags und optionale Template-Namen pruefen:

```js
trackTagsComplete({
  entry: entry(),
  result: result,
  requiredTags: ["MetricA", "MetricB"],
  templateNames: ["TemplateA"],
  completeField: "record_complete",
  missingField: "Noch Fehlend"
});
```

### #2 `exportAtags_lib.js`

Direkter Export des Collector-Ergebnisses:

```js
exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atags",
  targetFieldType: "tags"
});
```

Markdown-Export:

```js
exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag MD",
  targetFieldType: "md",
  markdownGroupSeparator: "",
  includeBlankTags: false
});
```

Baum-Export mit Kategorien:

```js
exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag Tree",
  targetFieldType: "tree_md",
  categoryFilter: ["self", "help"],
  includeEmptyCategories: false,
  treeShowValues: true
});
```

ASCII-Baum ohne Werte:

```js
exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag Tree ASCII",
  targetFieldType: "tree_md",
  treeStyle: "ascii",
  treeShowValues: false
});
```

### #3 `helpers_lib.js`

Die Helper-Lib wird normalerweise von Collector und Exporter genutzt. Ein direkter Aufruf ist nur fuer gemeinsame Hilfsfunktionen noetig:

```js
var median = computeAggregate([1, 3, 2], "median");
```

## `core`

### A1 `_checkVersions.js`

Lokale Auswahl der erwarteten Module:

```js
function getLibsVersionsConfig() {
  return {
    remote: ["helpers_lib", "collectAtags_lib", "exportAtags_lib"],
    local: ["tagCleaner", "timeMarker"]
  };
}
```

Explizite Auswahl fuer einen einzelnen Check:

```js
checkAtagLibVersions({
  SHOW_CURRENT_CONFIG: true,
  currentConfig: {
    remote: ["helpers_lib"],
    local: ["tagCleaner"]
  }
});
```

### A2 `helpers.js`

Collector und Export in einem Entry-Aufruf:

```js
var result = applyTags({
  enabled: true,
  entryObj: entry(),
  textFields: ["Alias", "Notiz"],
  targetField: "Atags",
  targetFieldType: "tags"
});
```

Mehrere Eintraege verarbeiten:

```js
bulkApplyTags({
  entries: selectedEntries(),
  textFields: ["Alias", "Notiz"],
  targetField: "Atag MD",
  targetFieldType: "md"
});
```

### A3 `restoreAtags.js`

Automatischer Restore aus einem JSON-Feld:

```js
restoreAtags({
  sourceField: "Atag Json"
});
```

Expliziter Eintrag:

```js
restoreAtags({
  sourceField: "Atag Json",
  entryObj: entry()
});
```

Mehrere Eintraege mit aktuellem Eintrag:

```js
restoreAtags({
  sourceField: "Atag Json",
  entries: lib().entries(),
  currentEntry: entry()
});
```

Restore mit Feldzuordnung:

```js
restoreAtags({
  sourceField: "Atag Json",
  map: {
    MetricA: "MetricA_"
  },
  mode: "exclusive"
});
```

### A4 `tagCleaner.js`

Standardfelder bereinigen:

```js
cleanTags();
```

Eigene Felder und Ausgabeoptionen:

```js
cleanTags({
  fields: ["Notiz"],
  aliasTextFields: ["Alias"],
  tagBarPosition: "time_top",
  tagBarSpacing: "blank",
  formatValues: "keep"
});
```

Nur Template-Slots fuer einen neuen Eintrag leeren:

```js
cleanTemplateTags({
  fields: ["Notiz"]
});
```
