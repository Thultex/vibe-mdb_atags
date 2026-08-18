# Core-Beispiele

Kopierbare Beispiele für die öffentlichen Trigger- und Script-Funktionen in `core_lib/` und `core/`. Interne Parser-, Format- und Versions-Getter sind keine Benutzer-API und werden deshalb nicht einzeln aufgeführt. Feldnamen müssen an die eigene Memento-Library angepasst werden.

Empfohlene Ladefolge:

1. optional `core/_checkVersions.js`
2. `core_lib/helpers_lib.js`
3. `core_lib/collectAtags_lib.js`
4. `core_lib/exportAtags_lib.js`
5. benötigte Module aus `core/`

## Übersicht

- `core_lib/collectAtags_lib.js`: [collectAtags()](#collectatags), [trackTagsComplete()](#tracktagscomplete)
- `core_lib/exportAtags_lib.js`: [exportAtags()](#exportatags)
- `core_lib/helpers_lib.js`: [computeAggregate()](#computeaggregate)
- `core/_checkVersions.js`: [getLibsVersionsConfig()](#getlibsversionsconfig), [checkLibVersions()](#checklibversions), [checkAtagLibVersions()](#checkataglibversions)
- `core/helpers.js`: [applyTags()](#applytags), [bulkApplyTags()](#bulkapplytags), [bulkExportAtags()](#bulkexportatags)
- `core/restoreAtags.js`: [restoreAtags()](#restoreatags), [bulkRestoreAtags()](#bulkrestoreatags)
- `core/tagCleaner.js`: [cleanTags()](#cleantags), [cleanTemplateTags()](#cleantemplatetags)
- [Gemeinsame Optionswerte](#gemeinsame-optionswerte)
- [Plugin-Beispiele](examples_plugins.md)

## Gemeinsame Optionswerte

### Aggregationsmodi

Die folgenden Werte gelten zentral für `mode`, `valueMode`, `rowAggregateMode`, `categoryRowAggregateMode`, `categoryChildAggregateMode`, `categoryChildValueMode`, `categoryAggregateMode` und `categoryValueMode`. Das Beispielergebnis verwendet `[-7, -2, 5, 1]`.

| Wert | Unterstützte Aliase | Wirkung | Beispielergebnis |
|---|---|---|---:|
| `min` | – | kleinster Zahlenwert | `-7` |
| `max` | – | größter Zahlenwert | `5` |
| `max_abs` | `maxabs` | Wert mit dem größten Betrag; bei Gleichstand der größere Wert | `-7` |
| `min_abs` | `minabs` | Wert mit dem kleinsten Betrag; bei Gleichstand der größere Wert | `1` |
| `max_add_abs` | `maxaddabs` | größter nicht negativer plus kleinster negativer Wert; bei nur einer Polarität deren stärkster Wert | `-2` |
| `sum` | `add` | Summe aller Werte | `-3` |
| `avg` | – | arithmetischer Mittelwert | `-0,75` |
| `median` | – | Median der sortierten Werte | `-0,5` |
| `first` | – | erster Wert in Eingabereihenfolge | `-7` |
| `last` | – | letzter Wert in Eingabereihenfolge | `1` |
| `amount` | `count` | Anzahl der Werte | `4` |

### Export-Zieltypen

| `targetFieldType` | Ausgabe |
|---|---|
| `tags` | Memento-Tagfeld mit Parser- und Metatags |
| `text` | einfache Textzeilen |
| `md` | gruppierte Markdown-Ausgabe |
| `tree_md` | hierarchischer Markdown-Baum |
| `rows_md` | Row-Tabelle als Markdown |
| `rows_html` | Row-Tabelle als HTML |
| `json` | Werteobjekt als JSON |

Kleinere gemeinsame Wertemengen werden vollständig als Liste angegeben:

- `row_display_values` / `rowDisplayValues`: `none`, `count`, `all`.
- `cat_display_values` / `categoryDisplayValues`: `none`, `count`, `names`, `all`.
- `treeStyle`: `unicode`, `ascii`.

## `core_lib`

### #1 `collectAtags_lib.js`

> Sammelt und bewertet Atags aus Memento-Textfeldern und stellt darauf aufbauendes Vollständigkeits-Tracking bereit.

<a id="collectatags"></a>
#### Funktion: `collectAtags()`

> Sammelt Atags, Aliasdefinitionen und Row-Werte aus den angegebenen Textfeldern in einem wiederverwendbaren Ergebnisobjekt.

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
- `textFields`: Quellfelder für Aliasdefinitionen, Tags und Row-Werte.
- `excludeNames`: Tagnamen, die nicht in das Ergebnis aufgenommen werden.
- `multiAliasTargets`: erlaubt einem Alias mehrere kanonische Ziele.

<a id="tracktagscomplete"></a>
#### Funktion: `trackTagsComplete()`

> Prüft erforderliche Tags und Template-Namen auf vorhandene Werte und schreibt Vollständigkeit sowie fehlende Namen in Felder.

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
- `completeField`: Bool-/Statusfeld für das Gesamtergebnis.
- `missingField`: Textfeld für unvollständige Namen; `""` deaktiviert die Ausgabe.
- `enabled`: schaltet das Tracking pro Aufruf ein oder aus.

### #2 `exportAtags_lib.js`

> Exportiert Collector-Ergebnisse in Memento-Felder und vereinheitlicht Markdown-, Tree-, Tabellen-, Tag- und JSON-Ausgaben.

<a id="exportatags"></a>
#### Funktion: `exportAtags()`

> Schreibt ein Collector-Ergebnis als Tags, Text, Markdown, Tree, Row-Tabelle oder JSON in ein Zielfeld.

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
  showComments: true,
  showCommentsCategory: false,
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
  treeShowValues: true,
  showComments: true,
  showCommentsCategory: false
});
```

Parameter:

- `entryObj`, `result`: Zieleintrag und bereits gesammeltes Collector-Ergebnis.
- `targetField`: Feld, in das der Export geschrieben wird.
- `targetFieldType`: Ausgabeformat aus der zentralen Tabelle [Export-Zieltypen](#export-zieltypen).
- `rowAggregateMode` / `rowAggregateDecimals`: Rechenmodus aus der Tabelle [Aggregationsmodi](#aggregationsmodi) und Rundung wiederholter Row-Werte.
- `categoryRowAggregateMode` / `categoryChildAggregateMode`: Aggregation je Kategorie-Kind; mögliche Werte stehen unter [Aggregationsmodi](#aggregationsmodi).
- `categoryAggregateMode` / `categoryValueMode`: Parent-Aggregation aus derselben Tabelle; MD-Standard `avg`, Tree-Standard `max_add_abs`.
- `categoryAggregateDecimals`: Rundung der Kategorieausgabe.
- `row_display_values` / `rowDisplayValues`: Detailanzeige `none`, `count` oder `all`.
- `cat_display_values` / `categoryDisplayValues`: Kategorie-Details `none`, `count`, `names` oder `all`.
- `categoryFilter`: exportiert nur die gewählten Kategorien und deren Kinder.
- `includeEmptyCategories`, `includeBlankTags`, `treeShowValues`: Sichtbarkeit leerer Kategorien, leerer Tags und Tree-Werte.
- `showComments`: zeigt Kommentare bei normalen Tags und Tree-Kindern; Standard ist `true`.
- `showCommentsCategory`: zeigt am Tree-/Kategorie-Parent alle positionsgenau zusammengeführten Kinderkommentare; Standard ist `false`.
- `markdownGroupSeparator`, `treeStyle`: Markdown-Gruppentrenner und Tree-Zeichenstil (`unicode` oder `ascii`).

Kommentare werden im JSON nur dann unter `_atagComments` gespeichert, wenn mindestens ein Kommentar vorhanden ist. Jeder Eintrag enthält mit `index` seine ursprüngliche Wertposition; leere Kommentare benötigen dadurch keinen Platz. Restore ignoriert `_atagComments` als technisches Metadatenobjekt und stellt die eigentlichen Tagwerte unverändert wieder her.

### #3 `helpers_lib.js`

> Enthält gemeinsam genutzte Sortier-, Formatierungs-, JSON- und Aggregationsfunktionen für Collector und Exporter.

<a id="computeaggregate"></a>
#### Funktion: `computeAggregate()`

> Berechnet aus einer Zahlenliste einen einzelnen Wert nach dem gewählten Aggregationsmodus.

```js
var value = computeAggregate([-7, -2, 5, 1], "max_add_abs"); // -2
```

Parameter:

- `values`: Array numerischer Werte.
- `mode`: Aggregationsmodus mit Wirkung, Aliasen und Beispielen aus der zentralen Tabelle [Aggregationsmodi](#aggregationsmodi).

## `core`

### A1 `_checkVersions.js`

> Registriert und prüft Core-, Add-on- und Plugin-Versionen gegen die erwartete Systemkonfiguration.

<a id="getlibsversionsconfig"></a>
#### Funktion: `getLibsVersionsConfig()`

> Liefert dem Versionschecker die in der aktuellen Memento-Konfiguration erwarteten Remote- und lokalen Module.

Dieser Callback wird in der eigenen Memento-Konfiguration bereitgestellt:

```js
function getLibsVersionsConfig() {
  return {
    remote: ["helpers_lib", "collectAtags_lib", "exportAtags_lib"],
    local: ["tagCleaner", "timeMarker"]
  };
}
```

Parameter/Rückgabe:

- Die Funktion hat keine Parameter.
- `remote`: erwartete Remote-Core-Libraries.
- `local`: erwartete lokale Core- und Add-on-Module.

<a id="checklibversions"></a>
#### Funktion: `checkLibVersions()`

> Liest die zur Laufzeit registrierten Library-Versionen und meldet fehlende ausgewählte Libraries.

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

- `names` / `libs`: zu prüfende registrierte Libraries; ohne Angabe werden alle geladenen verwendet.
- `optionalNames`: fehlende Namen, die nicht als Pflichtfehler gelten.
- `requireAll`: meldet fehlende Pflichtnamen.
- `asText`: gibt Text statt Ergebnisobjekt zurück.
- `verbose`: schreibt die Textdarstellung zusätzlich ins Log.

<a id="checkataglibversions"></a>
#### Funktion: `checkAtagLibVersions()`

> Vergleicht geladene Core- und Add-on-Versionen mit der erwarteten Versionsmatrix und kann zusätzlich ihre Aufrufbarkeit prüfen.

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
- `checkAccess`: prüft zusätzlich, ob der jeweilige Versions-Getter aufrufbar ist.
- `requireAll`: behandelt fehlende Pflichtmodule als Fehler.
- `allVersions`: nimmt auch optionale/lokale Versionen in die Ausgabe auf.
- `SHOW_CURRENT_CONFIG`: zeigt die aufgelöste lokale Auswahl.
- `skipNoConfig`: `true` bleibt bei fehlender Config still; `false` aktiviert die Diagnose.
- `asText`, `verbose`: Text-Rückgabe bzw. Log-Ausgabe.

### A2 `helpers.js`

> Verbindet Collector und Exporter zu komfortablen Einzel- und Bulk-Aufrufen für Memento-Scripte.

<a id="applytags"></a>
#### Funktion: `applyTags()`

> Führt für einen Eintrag Collector und Export in einem gemeinsamen Aufruf aus.

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
  categoryAggregateMode: "avg",
  showComments: true,
  showCommentsCategory: false
});
```

Parameter:

- `enabled`: deaktiviert Collector und Export, wenn `false`.
- `entryObj`, `textFields`, `excludeNames`: Collector-Ziel und Quellen.
- `targetField`, `targetFieldType`: Ziel und Format für `exportAtags()`.
- Aggregations- und Anzeigeoptionen werden unverändert an den Export weitergereicht.
- `showComments`, `showCommentsCategory`: Kommentar-Anzeige für normale Tags/Tree-Kinder beziehungsweise Kategorie-Parents.
- `result`: kann optional ein schon vorhandenes Collector-Ergebnis ersetzen.

<a id="bulkapplytags"></a>
#### Funktion: `bulkApplyTags()`

> Führt Collector und Export für alle Einträge der aktuellen Library aus.

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

- Verarbeitet alle Einträge aus `lib().entries()`.
- `textFields`, `targetField`, `targetFieldType`: Collector- und Exportkonfiguration je Eintrag.
- `collectResults`: gibt die Collector-Ergebnisse als Array zurück.
- `result`: darf auch eine Funktion oder ein Ergebnisarray pro Eintrag sein.

<a id="bulkexportatags"></a>
#### Funktion: `bulkExportAtags()`

> Bietet den Bulk-Export als kompatiblen Namen für `bulkApplyTags()` an.

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

- Ist der kompatible Export-Name für `bulkApplyTags()` und verarbeitet ebenfalls `lib().entries()`.
- `result`: Ergebnisobjekt, Array oder Callback `(entryObj, index, allEntries)`.
- `targetField`, `targetFieldType`: Exportziel und Ausgabeformat.

### A3 `restoreAtags.js`

> Stellt exportierte Atag-JSON-Werte einschließlich Kategorie-Aggregationen wieder in normalen Memento-Feldern her.

<a id="restoreatags"></a>
#### Funktion: `restoreAtags()`

> Stellt Werte aus einem Atag-JSON per Mapping oder Feldsuffix wieder in Memento-Feldern her.

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

Alias-Optionen für dieselbe Kategorie-Aggregation:

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
- `valueMode`: Aggregation normaler wiederholter JSON-Werte; alle Werte stehen unter [Aggregationsmodi](#aggregationsmodi).
- `categoryRowAggregateMode` / `categoryChildValueMode` / `categoryChildAggregateMode` / `rowAggregateMode`: Aggregation je Kategorie-Kind aus derselben Tabelle.
- `categoryAggregateMode` / `categoryValueMode`: Parent-Aggregation aus derselben Tabelle; Standard `max_add_abs`.
- `suffix`, `listSuffix`: Zielfeldsuffixe für Zahlen/Text bzw. Listen.
- `clearMappedFields`: leert gemappte Ziele vor dem Schreiben.
- `debugField`, `debugLog`: Diagnose in Feld und Log.
- `_atagComments` im Quell-JSON ist optionale Kommentar-Metadatenstruktur und wird beim Auto-Restore nicht als Zielfeld behandelt.

<a id="bulkrestoreatags"></a>
#### Funktion: `bulkRestoreAtags()`

> Ruft den Restore für eine Entry-Gruppe auf und reicht alle Restore-Optionen weiter.

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

- Kompatibler Gruppen-Wrapper für `restoreAtags()`.
- `entries`: Array, Java-Liste oder Gruppenquelle.
- `currentEntry`: ersetzt eine stale Instanz desselben Eintrags.
- `limit`: maximale Zahl verarbeiteter Einträge.
- Alle weiteren Restore-Optionen werden unverändert übernommen.

### A4 `tagCleaner.js`

> Bereinigt, normalisiert und sortiert Atag-Text sowie Template-Slots vor oder nach der weiteren Verarbeitung.

<a id="cleantags"></a>
#### Funktion: `cleanTags()`

> Normalisiert Atag-Text, Werte, Aliase und Tagleisten in einem oder mehreren Textfeldern.

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
- `fields`: mehrere Felder; alternativ `textField` für ein Feld.
- `aliasTextFields`, `tagFields`: Alias- und Memento-Tagquellen.
- `tagBarPosition`, `tagBarSpacing`: Position und Abstand der erzeugten Tagleiste.
- `formatValues`: Wertformatierung wie `keep`, `min` oder `max`.
- `enabled`: deaktiviert die Bereinigung bei `false`.

Kommentar-Eingaben müssen ohne Leerzeichen direkt an Wert oder Tag anschließen. Alle vorhandenen Zahlen-, Superscript-, Hash- und Textwertformen werden unterstützt:

```text
emo#3#info
emo2(info)
emo²(info)
emo"sfas"(info)
emo-2(info)
```

Der Cleaner normalisiert sie beispielsweise zu `emo³(info)`, `emo²(info)`, `emo:sfas(info)` und `emo⁻²(info)`. Innerhalb des Kommentars sind Leerzeichen erlaubt; `emo² (info)` ist absichtlich keine Kommentarform.

<a id="cleantemplatetags"></a>
#### Funktion: `cleanTemplateTags()`

> Bereitet Template-Slots für einen neuen Eintrag vor, ohne den vollständigen Tag-Cleaner auszuführen.

```js
cleanTemplateTags({
  entryObj: entry(),
  fields: ["Notiz", "Record"],
  enabled: true
});
```

Parameter:

- `entryObj`: Zieleintrag.
- `fields`: Textfelder, deren Template-Slots für einen neuen Eintrag vorbereitet werden.
- `enabled`: deaktiviert die Vorbereitung bei `false`.
