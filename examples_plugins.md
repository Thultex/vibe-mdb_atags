# Plugin-Beispiele

Kopierbare Beispiele fuer die oeffentlichen Trigger- und Script-Funktionen in `addons/`. Interne Hilfsfunktionen und Versions-Getter sind keine Benutzer-API. Feldnamen muessen an die eigene Memento-Library angepasst werden.

## Uebersicht

- `1_tagging`: [applyTagPairParser()](#applytagpairparser), [bulkApplyTagPairParser()](#bulkapplytagpairparser)
- `2_syncing/globalFieldSync.js`: [syncFieldTo()](#syncfieldto), [syncFieldBack()](#syncfieldback), [syncFieldAll()](#syncfieldall)
- `2_syncing/syncLastFromLatest.js`: [findNewestEntry()](#findnewestentry), [getNewestLibraryEntry()](#getnewestlibraryentry), [syncLastFromLatest()](#synclastfromlatest)
- `2_syncing/dustMerger.js`: [dustMerge()](#dustmerge), [dustMerger()](#dustmerger)
- `2_syncing/templateFieldTransfer.js`: [getTemplateFieldNames()](#gettemplatefieldnames), [moveFilledTemplates()](#movefilledtemplates), [moveAndTrackTemplates()](#moveandtracktemplates)
- `3_workflow`: [updateAverage()](#updateaverage), [updateSequenceSpree()](#updatesequencespree), [appendTimeMarker()](#appendtimemarker), [cleanupTimeMarker()](#cleanuptimemarker), [clearTimeMarkerRows()](#cleartimemarkerrows)
- `6_integration`: [linkObsidianUri()](#linkobsidianuri), [formatObsidianUri()](#formatobsidianuri), [applyWikiLinker()](#applywikilinker)
- `z_generell`: [multiChoiceAppend()](#multichoiceappend), [multiChoiceRemove()](#multichoiceremove), [syncTypedTextFields()](#synctypedtextfields)
- `z_others`: [applyHourGuide()](#applyhourguide)
- [Core-Beispiele](examples.md)

## `1_tagging`

### B2 `tagPairParser.js`

<a id="applytagpairparser"></a>
#### `applyTagPairParser()`

```js
var parsedPairs = applyTagPairParser({
  entryObj: entry(),
  tagField: "Tags",
  targetTextField: "Notiz",
  appendMode: "newline",
  keepOriginalValueTag: false
});
```

Parameter:

- `entryObj`: zu bearbeitender Eintrag; Standard ist `entry()`.
- `tagField`: Memento-Tagfeld mit Name-/Wert-Paaren.
- `targetTextField`: Textfeld fuer die umgewandelten Atags.
- `appendMode`: steuert das Anfuegen an vorhandenen Text.
- `keepOriginalValueTag`: behaelt den separaten Wert-Tag im Tagfeld.

<a id="bulkapplytagpairparser"></a>
#### `bulkApplyTagPairParser()`

```js
var pairResults = bulkApplyTagPairParser({
  tagField: "Tags",
  targetTextField: "Notiz",
  appendMode: "newline",
  keepOriginalValueTag: false
});
```

Parameter:

- Verarbeitet alle Eintraege aus `lib().entries()`.
- Alle Parser-Optionen werden je Eintrag an `applyTagPairParser()` weitergereicht.

## `2_syncing`

### B3 `globalFieldSync.js`

<a id="syncfieldto"></a>
#### `syncFieldTo()`

```js
syncFieldTo({
  entryObj: entry(),
  fields: ["Field1", "Field2"],
  overwrite: true
});
```

Parameter:

- `entryObj`: aktueller Zieleintrag.
- `fields`: Felder, die vom ersten Library-Eintrag gelesen werden.
- `overwrite`: erlaubt das Ersetzen bereits gefuellter Zielwerte.

<a id="syncfieldback"></a>
#### `syncFieldBack()`

```js
syncFieldBack({
  entryObj: entry(),
  fields: ["Field1", "Field2"],
  overwrite: true
});
```

Parameter:

- `entryObj`: Quell-Eintrag.
- `fields`: Felder, die in den ersten Library-Eintrag zurueckgeschrieben werden.
- `overwrite`: erlaubt das Ersetzen vorhandener Werte; leere Quellen werden uebersprungen.

<a id="syncfieldall"></a>
#### `syncFieldAll()`

```js
var syncResults = syncFieldAll({
  entryObj: entry(),
  fields: ["Field1", "Field2"],
  overwrite: true
});
```

Parameter:

- `entryObj`: liefert bei Bedarf die zugehoerige Library.
- `fields`: Felder, die vom ersten Eintrag an alle Eintraege verteilt werden.
- `overwrite`: ersetzt bereits gefuellte Ziele.

### B4 `syncLastFromLatest.js`

<a id="findnewestentry"></a>
#### `findNewestEntry()`

```js
var newestModified = findNewestEntry(lib().entries(), {
  maxEntries: 100
});
```

Parameter:

- Erster Parameter: Entry-Liste, Array oder Java-Liste.
- `maxEntries` / `maxScan`: maximale Zahl gescannter Eintraege.
- Ermittelt nach Aenderungszeit und nutzt die Entry-ID als Tie-Break.

<a id="getnewestlibraryentry"></a>
#### `getNewestLibraryEntry()`

```js
var newest = getNewestLibraryEntry({
  entries: lib().entries(),
  mode: "modified",
  maxEntries: 100
});
```

Parameter:

- `entries`: optionale eigene Entry-Liste; Standard ist `lib().entries()`.
- `mode` / `by` / `sortBy`: `creation` (erster Eintrag) oder `modified`.
- `maxEntries`: Scan-Limit fuer den Modified-Modus.

<a id="synclastfromlatest"></a>
#### `syncLastFromLatest()`

```js
var latestSync = syncLastFromLatest({
  entryObj: entry(),
  entries: lib().entries(),
  fieldDate: "Einnahmedatum",
  map: {
    Dosis: "Dosis",
    Wirkstoff: "WS",
    RecordAdd: ["Record", "append"]
  },
  onlyIfEmpty: true,
  separator: "\n",
  clearTemplateSlots: false,
  maxEntries: 100
});
```

Parameter:

- `entryObj`, `entries`: Ziel und Kandidatenliste.
- `fieldDate`: waehlt den letzten anderen Eintrag nach Datum; ohne Feld gilt die Library-Reihenfolge.
- `fields`: gleiche Feldnamen kopieren; `map` ordnet Ziel zu Quelle und optional `append`/`prepend` zu.
- `onlyIfEmpty`: schreibt nur in leere Ziele.
- `separator`: Trenner fuer Append/Prepend.
- `clearTemplateSlots`: leert Template-Slot-Inhalte vor dem Kopieren.
- `maxEntries`: begrenzt die Suche.

### B10 `dustMerger.js`

<a id="dustmerge"></a>
#### `dustMerge()`

```js
var mergeResult = dustMerge({
  entryObj: entry(),
  entries: lib().entries(),
  fieldDate: "Datum",
  titleField: "Titel",
  mergeJsonField: "Merge Json",
  statusField: "Merge Status",
  mergeCountField: "Merge Count",
  searchLimit: 5,
  mergeWindowHours: 28,
  dayStartHour: 4,
  rowSourceMode: "realtime",
  rowStepHours: 0.5,
  rowRoundMode: "round",
  skipField: "Nicht mergen",
  forceMergeField: "Merge erzwingen",
  trashMergedEntry: true,
  openTargetEntry: true,
  map: [
    { name: "Notiz", mode: "append", datatype: "string_rows" },
    { name: "Record", mode: "prepend", datatype: "string_rows" },
    { name: "Tags", mode: "append", datatype: "tag" }
  ],
  blockMap: [
    { name: "Status" }
  ]
});
```

Parameter:

- `entryObj`, `entries`, `fieldDate`: Quelle, Kandidaten und Datumsfeld.
- `searchLimit`, `mergeWindowHours`, `dayStartHour`: Such- und Zeitfenster.
- `map`: Felder mit Merge-Modus und Datentyp.
- `blockMap`: Felder, deren Konflikt einen Merge verhindert.
- `rowSourceMode`, `rowStepHours`, `rowRoundMode`: Zeitlabels fuer `string_rows`.
- `skipField`, `forceMergeField`: benutzergesteuertes Sperren bzw. Erzwingen.
- `mergeJsonField`, `statusField`, `mergeCountField`: Protokoll- und Statusziele.
- `trashMergedEntry`, `openTargetEntry`: Nachaktionen bei Erfolg.

<a id="dustmerger"></a>
#### `dustMerger()`

```js
var legacyMergeResult = dustMerger({
  fieldDate: "Datum",
  map: [
    { name: "Notiz", mode: "append", datatype: "string" }
  ]
});
```

Parameter:

- Kompatibler Alias fuer `dustMerge()`.
- Akzeptiert dieselbe Konfiguration und liefert dasselbe Ergebnisobjekt.

### B11 `templateFieldTransfer.js`

<a id="gettemplatefieldnames"></a>
#### `getTemplateFieldNames()`

```js
var templateNames = getTemplateFieldNames({
  entry: entry(),
  sourceField: "Record",
  templateSlotMarker: "_"
});
```

Parameter:

- `entry` / `entryObj`: Eintrag mit dem Template-Text.
- `sourceField`: Quellfeld; Standard `Record`.
- `sourceText`: optionaler Text statt Feldinhalt.
- `templateSlotMarker`: Marker, der offene Template-Slots kennzeichnet.

<a id="movefilledtemplates"></a>
#### `moveFilledTemplates()`

```js
var transfer = moveFilledTemplates({
  entry: entry(),
  sourceField: "Record",
  targetField: "Notiz",
  mode: "append_row",
  datatype: "string_rows",
  sourceMode: "realtime_since",
  startDatetimeField: "Einnahmedatum",
  stepHours: 0.5,
  roundMode: "round",
  maxHours: 15,
  rowLabel: null,
  templateSlotMarker: "_"
});
```

Parameter:

- `entry`, `sourceField`, `targetField`: Eintrag sowie Quell- und Zielfeld.
- `mode`: `append`, `prepend`, `replace` oder die entsprechenden `_row`-Varianten.
- `datatype`: aktiviert mit `string_rows` ebenfalls Row-Ausgabe.
- `sourceMode`, `startDatetimeField`, `stepHours`, `roundMode`, `maxHours`: Time-Marker-kompatible Zeitberechnung.
- `rowLabel`: explizites Zeitlabel und damit Override der Berechnung.
- `templateSlotMarker`: Kennzeichen offener Slots, die nach dem Transfer zurueckgesetzt werden.

<a id="moveandtracktemplates"></a>
#### `moveAndTrackTemplates()`

```js
var transferStatus = moveAndTrackTemplates({
  entry: entry(),
  sourceField: "Record",
  targetField: "Notiz",
  mode: "append_row",
  sourceMode: "realtime_since",
  startDatetimeField: "Einnahmedatum",
  stepHours: 0.5,
  roundMode: "round",
  maxHours: 15,
  result: result,
  requiredTags: ["MetricA"],
  completeField: "record_complete",
  missingField: "Noch Fehlend",
  trackTemplates: true
});
```

Parameter:

- Uebernimmt alle Optionen von `moveFilledTemplates()`.
- `result`, `requiredTags`, `completeField`, `missingField`: Optionen fuer `trackTagsComplete()`.
- `trackTemplates`: nimmt die gefundenen Template-Namen automatisch in die Vollstaendigkeitspruefung auf.

## `3_workflow`

### B5 `floatingAverage.js`

<a id="updateaverage"></a>
#### `updateAverage()`

```js
var averageResult = updateAverage({
  entries: lib().entries(),
  currentEntry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis"],
  fieldValue: "Ausgabewert GW+AT",
  fieldResult: "Ausgabewert Mittel",
  ignoreFields: ["Unausgefuellt"],
  avgCount: 3,
  skipFirst: 2,
  decimals: 2
});
```

Parameter:

- `entries`, `currentEntry`, `fieldDate`: Datenbasis, Live-Eintrag und Sortierdatum.
- `groupFields`: trennt unabhaengige Durchschnittsgruppen.
- `fieldValue`, `fieldResult`: Quellwert und Zielfeld.
- `ignoreFields`: Eintraege mit gesetztem Ignore-Feld auslassen.
- `avgCount`, `skipFirst`, `decimals`: Fenster, ausgelassene Anfangswerte und Rundung.

### B6 `sequenceCounter.js`

<a id="updatesequencespree"></a>
#### `updateSequenceSpree()`

```js
var sequenceResult = updateSequenceSpree({
  entries: lib().entries(),
  currentEntry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis"],
  fieldSequence: "Reihe",
  fieldSpree: "Spree",
  fieldSequenceMax: "Reihe Max",
  fieldSpreeMax: "Spree Max",
  fieldBiasedSpree: "Biased Spree",
  biasedSpreeCount: 2
});
```

Parameter:

- `entries`, `currentEntry`, `fieldDate`, `groupFields`: Datenbasis und Gruppierung.
- `fieldSequence`, `fieldSpree`: aktuelle Sequenz- und Spree-Ziele.
- `fieldSequenceMax`, `fieldSpreeMax`: bisherige Maximalwerte.
- `fieldBiasedSpree`, `biasedSpreeCount`: markierte Spree und erlaubte Unterbrechungen.

### B7 `timeMarker.js`

<a id="appendtimemarker"></a>
#### `appendTimeMarker()`

```js
appendTimeMarker({
  entryObj: entry(),
  targetTextField: "Notiz",
  sourceMode: "realtime_since",
  startDatetimeField: "Einnahmedatum",
  stepHours: 0.5,
  roundMode: "round",
  insertMode: "time_block_top",
  maxHours: 30
});
```

Parameter:

- `entryObj`, `targetTextField`: Zieleintrag und Textfeld.
- `sourceMode`: `realtime`, `realtime_since`, `datetime` oder `hours`.
- `startDatetimeField`: Ausgangszeit fuer `realtime_since`.
- `stepHours`, `roundMode`: Raster und Rundung.
- `insertMode`: Position des neuen Markers.
- `maxHours`: ueberspringt Werte oberhalb des Limits.

<a id="cleanuptimemarker"></a>
#### `cleanupTimeMarker()`

```js
cleanupTimeMarker({
  entryObj: entry(),
  fields: ["Notiz"],
  mergeSameRows: true,
  sameRowSeparator: " ",
  mergeSameRowContents: true,
  sourceMode: "realtime_since",
  startDatetimeField: "Einnahmedatum",
  stepHours: 0.5,
  roundMode: "round",
  maxHours: 30
});
```

Parameter:

- `entryObj`, `fields`: Eintrag und zu bereinigende Textfelder.
- `mergeSameRows`: fuehrt identische Zeitlabels zusammen.
- `sameRowSeparator`, `mergeSameRowContents`: Trenner und Duplikatbehandlung.
- Zeitoptionen entsprechen `appendTimeMarker()`; Cleanup fuegt keinen leeren Marker an.

<a id="cleartimemarkerrows"></a>
#### `clearTimeMarkerRows()`

```js
clearTimeMarkerRows({
  entryObj: entry(),
  fields: ["Notiz", "Record"],
  mode: "remove"
});
```

Parameter:

- `entryObj`, `fields`: Eintrag und Textfelder.
- `mode`: steuert, ob alte Row-Marker entfernt oder deren Inhalt erhalten wird.

## `6_integration`

### B8 `obsidianLinker.js`

<a id="linkobsidianuri"></a>
#### `linkObsidianUri()`

```js
var obsidianResult = linkObsidianUri({
  entryObj: entry(),
  contentField: "Text",
  overwriteMarkdownField: "Obsidian Overwrite Link",
  obsidianMarkdownField: "Obsidian Link",
  dateField: "Datum",
  mementoLinkField: "Memento Link",
  vault: "ExampleVault",
  folderPath: "memento/ExampleLibrary",
  tags: "memento/example-library",
  folderAsTag: true,
  formatOnly: false,
  open: false
});
```

Parameter:

- `entryObj`, `contentField`, `dateField`: Quelleintrag, Inhalt und Datum.
- `overwriteMarkdownField`, `obsidianMarkdownField`, `mementoLinkField`: Link-Zielfelder.
- `vault`, `folderPath`: Obsidian-Vault und Zielordner.
- `tags`, `folderAsTag`: Frontmatter-/Ordner-Tags.
- `formatOnly`: erzeugt nur Links/Text ohne Open-Aktion.
- `open`: oeffnet die erzeugte Obsidian-URI.

<a id="formatobsidianuri"></a>
#### `formatObsidianUri()`

```js
formatObsidianUri({
  entryObj: entry(),
  field: "Obsidian Link"
});
```

Parameter:

- `entryObj`: Eintrag mit dem Linkfeld.
- `field`: Feld, dessen URI/Markdown-Darstellung normalisiert wird.

### B9 `wikiLinker.js`

<a id="applywikilinker"></a>
#### `applyWikiLinker()`

```js
var wikiUrl = applyWikiLinker({
  entryObj: entry(),
  sourceTitleField: "Titel",
  targetField: "Wikipedia",
  language: "de",
  clearOnEmpty: true
});
```

Parameter:

- `entryObj`: Zieleintrag.
- `sourceTitleField`: Feld mit dem Suchbegriff.
- `targetField`: Feld fuer die Wikipedia-Such-URL.
- `language`: Sprachsubdomain, z. B. `de` oder `en`.
- `clearOnEmpty`: leert das Ziel bei fehlendem Titel.

## `z_generell`

### C1 `multiChoiceHelpers.js`

<a id="multichoiceappend"></a>
#### `multiChoiceAppend()`

```js
var appended = multiChoiceAppend({
  entryObj: entry(),
  field: "Typ",
  value: "Tag"
});
```

Parameter:

- `entryObj`: Zieleintrag.
- `field`: Multi-Choice-Feld.
- `value`: Wert, der ohne Duplikat angefuegt wird.

<a id="multichoiceremove"></a>
#### `multiChoiceRemove()`

```js
var removed = multiChoiceRemove({
  entryObj: entry(),
  field: "Typ",
  value: "Tag"
});
```

Parameter:

- `entryObj`: Zieleintrag.
- `field`: Multi-Choice-Feld.
- `value`: zu entfernender exakter Wert.

### C2 `typedTextFields.js`

<a id="synctypedtextfields"></a>
#### `syncTypedTextFields()`

```js
var typedSync = syncTypedTextFields(lib().entries(), {
  clearSource: false,
  onlyIfTargetEmpty: false,
  dryRun: false
});
```

Parameter:

- Erster Parameter: einzelner Eintrag, Entry-Liste oder ohne Angabe der aktuelle Eintrag.
- `clearSource`: leert das typisierte Text-Quellfeld nach erfolgreicher Uebertragung.
- `onlyIfTargetEmpty`: schuetzt bereits gefuellte Zielfelder.
- `dryRun`: prueft und protokolliert ohne zu schreiben.

## `z_others`

### C3 `hourGuide.js`

<a id="applyhourguide"></a>
#### `applyHourGuide()`

```js
var guideResult = applyHourGuide({
  entryObj: entry(),
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  planField: "Hour Guide JSON",
  maxHours: 16,
  plan: null
});
```

Parameter:

- `entryObj`: Eintrag mit Stundenquelle und Ziel.
- `sourceHoursField`: numerische Stunden seit dem Start.
- `targetField`: HTML-/Textziel fuer den passenden Guide-Block.
- `planField`: optionales JSON-Feld mit eigener Guide-Konfiguration.
- `plan`: direkte Konfiguration; hat Vorrang vor `planField`, `null` nutzt Feld oder Standard.
- `maxHours`: oberes Anzeigelimit.

Minimaler Aufbau fuer `plan` oder `planField`:

```json
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
```
