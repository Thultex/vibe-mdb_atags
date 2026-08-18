# Core-Beispiele

Kopierbare Beispiele fuer die oeffentlichen Trigger- und Script-Funktionen in `core_lib/` und `core/`. Interne Parser-, Format- und Versions-Getter sind keine Benutzer-API und werden deshalb nicht einzeln aufgefuehrt. Feldnamen muessen an die eigene Memento-Library angepasst werden.

Empfohlene Ladefolge:

1. optional `core/_checkVersions.js`
2. `core_lib/helpers_lib.js`
3. `core_lib/collectAtags_lib.js`
4. `core_lib/exportAtags_lib.js`
5. benoetigte Module aus `core/`

## Uebersicht

- `core_lib/collectAtags_lib.js`: [collectAtags()](#collectatags), [trackTagsComplete()](#tracktagscomplete)
- `core_lib/exportAtags_lib.js`: [exportAtags()](#exportatags)
- `core_lib/helpers_lib.js`: [computeAggregate()](#computeaggregate)
- `core/_checkVersions.js`: [getLibsVersionsConfig()](#getlibsversionsconfig), [checkLibVersions()](#checklibversions), [checkAtagLibVersions()](#checkataglibversions)
- `core/helpers.js`: [applyTags()](#applytags), [bulkApplyTags()](#bulkapplytags), [bulkExportAtags()](#bulkexportatags)
- `core/restoreAtags.js`: [restoreAtags()](#restoreatags), [bulkRestoreAtags()](#bulkrestoreatags)
- `core/tagCleaner.js`: [cleanTags()](#cleantags), [cleanTemplateTags()](#cleantemplatetags)
- [Plugin-Beispiele](examples_plugins.md)

## `core_lib`

### #1 `collectAtags_lib.js`

<a id="collectatags"></a>
#### `collectAtags()`

```js
var result = collectAtags({
  entryObj: entry(),
  textFields: ["Atag Aliases", "Notiz", "Record"],
  excludeNames: ["ignore_me"],
  multiAliasTargets: true
});
```

Parameter:

- `entryObj`: Eintrag, dessen Textfelder gelesen werden; Standard ist der aktuelle Eintrag.
- `textFields`: Quellfelder fuer Aliasdefinitionen, Tags und Row-Werte.
- `excludeNames`: Tagnamen, die nicht in das Ergebnis aufgenommen werden.
- `multiAliasTargets`: erlaubt einem Alias mehrere kanonische Ziele.

<a id="tracktagscomplete"></a>
#### `trackTagsComplete()`

```js
var completion = trackTagsComplete({
  entry: entry(),
  result: result,
  requiredTags: ["MetricA", "MetricB"],
  templateNames: ["TemplateA"],
  completeField: "record_complete",
  missingField: "Noch Fehlend",
  enabled: true
});
```

Parameter:

- `entry`: Eintrag, in den Status und fehlende Namen geschrieben werden.
- `result`: Ergebnis von `collectAtags()` oder `applyTags()`.
- `requiredTags` / `templateNames`: erwartete normale Tags und Template-Slots.
- `completeField`: Bool-/Statusfeld fuer das Gesamtergebnis.
- `missingField`: Textfeld fuer unvollstaendige Namen; `""` deaktiviert die Ausgabe.
- `enabled`: schaltet das Tracking pro Aufruf ein oder aus.

### #2 `exportAtags_lib.js`

<a id="exportatags"></a>
#### `exportAtags()`

Markdown mit allen kanonischen Aggregationsoptionen:

```js
exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag MD",
  targetFieldType: "md",
  rowAggregateMode: "avg",
  rowAggregateDecimals: 1,
  categoryRowAggregateMode: "max",
  categoryAggregateMode: "avg",
  categoryAggregateDecimals: 1,
  row_display_values: "all",
  cat_display_values: "names",
  markdownGroupSeparator: "",
  includeBlankTags: false
});
```

Tree-Variante mit den Aliasnamen der Kategorie-Aggregation:

```js
exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag Tree",
  targetFieldType: "tree_md",
  rowAggregateMode: "max",
  rowAggregateDecimals: 1,
  categoryChildAggregateMode: "max",
  categoryValueMode: "max_add_abs",
  categoryAggregateDecimals: 1,
  rowDisplayValues: "count",
  categoryDisplayValues: "none",
  categoryFilter: ["self", "help"],
  includeEmptyCategories: false,
  treeStyle: "unicode",
  treeShowValues: true
});
```

Parameter:

- `entryObj`, `result`: Zieleintrag und bereits gesammeltes Collector-Ergebnis.
- `targetField`: Feld, in das der Export geschrieben wird.
- `targetFieldType`: `tags`, `text`, `md`, `tree_md`, `rows_md`, `rows_html` oder `json`.
- `rowAggregateMode` / `rowAggregateDecimals`: Rechenmodus und Rundung wiederholter Row-Werte.
- `categoryRowAggregateMode` / `categoryChildAggregateMode`: Aggregation je Kategorie-Kind.
- `categoryAggregateMode` / `categoryValueMode`: Parent-Aggregation; MD-Standard `avg`, Tree-Standard `max_add_abs`.
- `categoryAggregateDecimals`: Rundung der Kategorieausgabe.
- `row_display_values` / `rowDisplayValues`: Detailanzeige `none`, `count` oder `all`.
- `cat_display_values` / `categoryDisplayValues`: Kategorie-Details `none`, `count`, `names` oder `all`.
- `categoryFilter`: exportiert nur die gewaehlten Kategorien und deren Kinder.
- `includeEmptyCategories`, `includeBlankTags`, `treeShowValues`: Sichtbarkeit leerer Kategorien, leerer Tags und Tree-Werte.
- `markdownGroupSeparator`, `treeStyle`: Markdown-Gruppentrenner und Tree-Zeichenstil (`unicode` oder `ascii`).

### #3 `helpers_lib.js`

<a id="computeaggregate"></a>
#### `computeAggregate()`

```js
var value = computeAggregate([-7, -2, 5, 1], "max_add_abs"); // -2
```

Parameter:

- `values`: Array numerischer Werte.
- `mode`: `min`, `max`, `max_abs`, `min_abs`, `max_add_abs`, `add`, `sum`, `avg`, `median`, `first`, `last` oder `amount`.

## `core`

### A1 `_checkVersions.js`

<a id="getlibsversionsconfig"></a>
#### `getLibsVersionsConfig()`

Dieser Callback wird in der eigenen Memento-Konfiguration bereitgestellt:

```js
function getLibsVersionsConfig() {
  return {
    remote: ["helpers_lib", "collectAtags_lib", "exportAtags_lib"],
    local: ["tagCleaner", "timeMarker"]
  };
}
```

Parameter/Rueckgabe:

- Die Funktion hat keine Parameter.
- `remote`: erwartete Remote-Core-Libraries.
- `local`: erwartete lokale Core- und Add-on-Module.

<a id="checklibversions"></a>
#### `checkLibVersions()`

```js
var loaded = checkLibVersions({
  names: ["helpers_lib", "collectAtags_lib"],
  optionalNames: ["exportAtags_lib"],
  requireAll: true,
  asText: false,
  verbose: false
});
```

Parameter:

- `names` / `libs`: zu pruefende registrierte Libraries; ohne Angabe werden alle geladenen verwendet.
- `optionalNames`: fehlende Namen, die nicht als Pflichtfehler gelten.
- `requireAll`: meldet fehlende Pflichtnamen.
- `asText`: gibt Text statt Ergebnisobjekt zurueck.
- `verbose`: schreibt die Textdarstellung zusaetzlich ins Log.

<a id="checkataglibversions"></a>
#### `checkAtagLibVersions()`

```js
var checked = checkAtagLibVersions({
  names: ["helpers_lib", "tagCleaner"],
  checkAccess: true,
  requireAll: true,
  allVersions: true,
  SHOW_CURRENT_CONFIG: true,
  skipNoConfig: false,
  asText: false,
  verbose: true
});
```

Parameter:

- `names` / `libs`: Auswahl aus erwarteten Remote- und lokalen Modulen.
- `checkAccess`: prueft zusaetzlich, ob der jeweilige Versions-Getter aufrufbar ist.
- `requireAll`: behandelt fehlende Pflichtmodule als Fehler.
- `allVersions`: nimmt auch optionale/lokale Versionen in die Ausgabe auf.
- `SHOW_CURRENT_CONFIG`: zeigt die aufgeloeste lokale Auswahl.
- `skipNoConfig`: `true` bleibt bei fehlender Config still; `false` aktiviert die Diagnose.
- `asText`, `verbose`: Text-Rueckgabe bzw. Log-Ausgabe.

### A2 `helpers.js`

<a id="applytags"></a>
#### `applyTags()`

```js
var result = applyTags({
  enabled: true,
  entryObj: entry(),
  textFields: ["Atag Aliases", "Notiz", "Record"],
  excludeNames: [],
  targetField: "Atag MD",
  targetFieldType: "md",
  rowAggregateMode: "avg",
  categoryRowAggregateMode: "max",
  categoryAggregateMode: "avg"
});
```

Parameter:

- `enabled`: deaktiviert Collector und Export, wenn `false`.
- `entryObj`, `textFields`, `excludeNames`: Collector-Ziel und Quellen.
- `targetField`, `targetFieldType`: Ziel und Format fuer `exportAtags()`.
- Aggregations- und Anzeigeoptionen werden unveraendert an den Export weitergereicht.
- `result`: kann optional ein schon vorhandenes Collector-Ergebnis ersetzen.

<a id="bulkapplytags"></a>
#### `bulkApplyTags()`

```js
var results = bulkApplyTags({
  enabled: true,
  textFields: ["Atag Aliases", "Notiz"],
  targetField: "Atag MD",
  targetFieldType: "md",
  collectResults: true
});
```

Parameter:

- Verarbeitet alle Eintraege aus `lib().entries()`.
- `textFields`, `targetField`, `targetFieldType`: Collector- und Exportkonfiguration je Eintrag.
- `collectResults`: gibt die Collector-Ergebnisse als Array zurueck.
- `result`: darf auch eine Funktion oder ein Ergebnisarray pro Eintrag sein.

<a id="bulkexportatags"></a>
#### `bulkExportAtags()`

```js
bulkExportAtags({
  result: function(entryObj, index) {
    return collectAtags({ entryObj: entryObj, textFields: ["Notiz"] });
  },
  targetField: "Atag Json",
  targetFieldType: "json"
});
```

Parameter:

- Ist der kompatible Export-Name fuer `bulkApplyTags()` und verarbeitet ebenfalls `lib().entries()`.
- `result`: Ergebnisobjekt, Array oder Callback `(entryObj, index, allEntries)`.
- `targetField`, `targetFieldType`: Exportziel und Ausgabeformat.

### A3 `restoreAtags.js`

<a id="restoreatags"></a>
#### `restoreAtags()`

```js
restoreAtags({
  entryObj: entry(),
  sourceField: "Atag Json",
  map: {
    Body: "BodyScore"
  },
  mode: "exclusive",
  valueMode: "avg",
  categoryRowAggregateMode: "max",
  categoryAggregateMode: "max_add_abs",
  suffix: "_",
  listSuffix: "_l",
  clearMappedFields: false,
  debugField: "Atag Restore Debug",
  debugLog: false
});
```

Alias-Optionen fuer dieselbe Kategorie-Aggregation:

```js
restoreAtags({
  sourceField: "Atag Json",
  categoryChildValueMode: "max",
  categoryChildAggregateMode: "max",
  categoryValueMode: "max_add_abs",
  rowAggregateMode: "max"
});
```

Parameter:

- `entryObj` / `entries` / `currentEntry`: einzelner Eintrag, Gruppe und optional der aktuelle Live-Eintrag.
- `sourceField`: JSON-Quellfeld.
- `map`: Zuordnung von JSON-Namen zu Zielfeldern; ohne Map greift der Suffix-Auto-Restore.
- `mode`, `additional`: exklusive Map oder Map plus Auto-Restore.
- `valueMode`: Aggregation normaler wiederholter JSON-Werte.
- `categoryRowAggregateMode` / `categoryChildValueMode` / `categoryChildAggregateMode` / `rowAggregateMode`: Aggregation je Kategorie-Kind.
- `categoryAggregateMode` / `categoryValueMode`: Parent-Aggregation; Standard `max_add_abs`.
- `suffix`, `listSuffix`: Zielfeldsuffixe fuer Zahlen/Text bzw. Listen.
- `clearMappedFields`: leert gemappte Ziele vor dem Schreiben.
- `debugField`, `debugLog`: Diagnose in Feld und Log.

<a id="bulkrestoreatags"></a>
#### `bulkRestoreAtags()`

```js
bulkRestoreAtags({
  entries: lib().entries(),
  currentEntry: entry(),
  sourceField: "Atag Json",
  limit: 100,
  suffix: "_",
  listSuffix: "_l"
});
```

Parameter:

- Kompatibler Gruppen-Wrapper fuer `restoreAtags()`.
- `entries`: Array, Java-Liste oder Gruppenquelle.
- `currentEntry`: ersetzt eine stale Instanz desselben Eintrags.
- `limit`: maximale Zahl verarbeiteter Eintraege.
- Alle weiteren Restore-Optionen werden unveraendert uebernommen.

### A4 `tagCleaner.js`

<a id="cleantags"></a>
#### `cleanTags()`

```js
cleanTags({
  enabled: true,
  entryObj: entry(),
  fields: ["Notiz", "Record"],
  textField: "Notiz",
  aliasTextFields: ["Atag Aliases"],
  tagFields: ["Tags", "Atags User"],
  tagBarPosition: "top",
  tagBarSpacing: "blank",
  formatValues: "keep"
});
```

Parameter:

- `entryObj`: Zieleintrag; Standard ist `entry()`.
- `fields`: mehrere Felder; alternativ `textField` fuer ein Feld.
- `aliasTextFields`, `tagFields`: Alias- und Memento-Tagquellen.
- `tagBarPosition`, `tagBarSpacing`: Position und Abstand der erzeugten Tagleiste.
- `formatValues`: Wertformatierung wie `keep`, `min` oder `max`.
- `enabled`: deaktiviert die Bereinigung bei `false`.

<a id="cleantemplatetags"></a>
#### `cleanTemplateTags()`

```js
cleanTemplateTags({
  entryObj: entry(),
  fields: ["Notiz", "Record"],
  enabled: true
});
```

Parameter:

- `entryObj`: Zieleintrag.
- `fields`: Textfelder, deren Template-Slots fuer einen neuen Eintrag vorbereitet werden.
- `enabled`: deaktiviert die Vorbereitung bei `false`.
