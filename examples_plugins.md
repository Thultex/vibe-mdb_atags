# Plugin-Beispiele

Kopierbare Beispiele für die öffentlichen Trigger- und Script-Funktionen in `addons/`. Interne Hilfsfunktionen und Versions-Getter sind keine Benutzer-API. Feldnamen müssen an die eigene Memento-Library angepasst werden.

## Übersicht

- `1_tagging`: [applyTagPairParser()](#applytagpairparser), [bulkApplyTagPairParser()](#bulkapplytagpairparser)
- `2_syncing/globalFieldSync.js`: [syncFieldTo()](#syncfieldto), [syncFieldBack()](#syncfieldback), [syncFieldAll()](#syncfieldall)
- `2_syncing/syncLastFromLatest.js`: [findNewestEntry()](#findnewestentry), [getNewestLibraryEntry()](#getnewestlibraryentry), [syncLastFromLatest()](#synclastfromlatest)
- `2_syncing/dustMerger.js`: [dustMerge()](#dustmerge), [dustMerger()](#dustmerger)
- `2_syncing/templateFieldTransfer.js`: [getTemplateFieldNames()](#gettemplatefieldnames), [moveFilledTemplates()](#movefilledtemplates), [moveAndTrackTemplates()](#moveandtracktemplates)
- `3_workflow`: [updateAverage()](#updateaverage), [updateSequenceSpree()](#updatesequencespree), [appendTimeMarker()](#appendtimemarker), [cleanupTimeMarker()](#cleanuptimemarker), [clearTimeMarkerRows()](#cleartimemarkerrows)
- `6_integration`: [linkObsidianUri()](#linkobsidianuri), [formatObsidianUri()](#formatobsidianuri), [applyWikiLinker()](#applywikilinker)
- `z_generell`: [multiChoiceAppend()](#multichoiceappend), [multiChoiceRemove()](#multichoiceremove), [syncTypedTextFields()](#synctypedtextfields)
- `z_others`: [applyHourGuide()](#applyhourguide)
- [Gemeinsame Optionswerte](#gemeinsame-optionswerte)
- [Core-Beispiele](examples.md)

## Gemeinsame Optionswerte

### Gemeinsame Aufrufsteuerung

- `entry`: expliziter aktueller Eintrag für einzelne Operationen; `entryObj` und bei Workflow-Funktionen `currentEntry` bleiben als Aliase kompatibel.
- `enabled`: `true` führt die Operation aus; `false` beendet sie ohne Feldzugriff, Änderung oder andere Nachaktion.
- `fields`: Liste mehrerer Felder; Mehrfeld-Funktionen akzeptieren zusätzlich `field` als Alias für einen einzelnen Feldnamen oder eine Liste. Funktionen mit eindeutigem einzelnen Schreibfeld behalten ihre spezifischen Namen wie `tagField` oder `targetField`.

Die gemeinsamen Optionen werden hier zentral erklärt. Die Parameterabschnitte der Funktionen ergänzen die jeweils funktionsspezifischen Angaben.

### Gemeinsame Zeitoptionen

- `sourceMode`: `realtime` nutzt die aktuelle Tageszeit; `realtime_since` berechnet Stunden seit `startDatetimeField`; `datetime` liest die Tageszeit aus `sourceDatetimeField`; `hours` liest eine Zahl aus `sourceHoursField`.
- `roundMode`: `round` rundet auf das nächste `stepHours`-Raster, `floor` abwärts und `ceil` aufwärts.
- `insertMode`: `append` fügt unten an, `prepend` oben und `time_block_top` an den Anfang des Zeitblocks.
- `maxHours`: positive Zahl als Obergrenze; `null` oder ein negativer Wert deaktiviert das Limit.

## `1_tagging`

### B2 `tagPairParser.js`

> Überführt getrennte Name-/Wert-Tags aus einem Memento-Tagfeld in normale Atag-Textzeilen.

<a id="applytagpairparser"></a>
#### Funktion: `applyTagPairParser()`

> Wandelt aufeinanderfolgende Name-/Wert-Tags in normale Atag-Zeilen im Zieltext um.

```js
var parsedPairs = applyTagPairParser({
  enabled: true,
  entry: entry(),
  tagField: "Tags",
  targetTextField: "Notiz",
  appendMode: "newline",
  keepOriginalValueTag: false
});
```

Parameter:

- `entry` / `entryObj`: zu bearbeitender Eintrag; Standard ist `entry()`.
- `tagField`: Memento-Tagfeld mit Name-/Wert-Paaren.
- `targetTextField`: Textfeld für die umgewandelten Atags.
- `appendMode`: steuert das Anfügen an vorhandenen Text.
- `keepOriginalValueTag`: behält den separaten Wert-Tag im Tagfeld.

<a id="bulkapplytagpairparser"></a>
#### Funktion: `bulkApplyTagPairParser()`

> Führt den Tag-Pair-Parser für alle Einträge der aktuellen Library aus.

```js
var pairResults = bulkApplyTagPairParser({
  enabled: true,
  tagField: "Tags",
  targetTextField: "Notiz",
  appendMode: "newline",
  keepOriginalValueTag: false
});
```

Parameter:

- Verarbeitet alle Einträge aus `lib().entries()`.
- Alle Parser-Optionen werden je Eintrag an `applyTagPairParser()` weitergereicht.

## `2_syncing`

### B3 `globalFieldSync.js`

> Synchronisiert gemeinsam verwendete Felder zwischen dem ersten Library-Eintrag, dem aktuellen Eintrag und der gesamten Library.

<a id="syncfieldto"></a>
#### Funktion: `syncFieldTo()`

> Kopiert ausgewählte globale Felder vom ersten Library-Eintrag in den aktuellen Eintrag.

```js
syncFieldTo({
  enabled: true,
  entry: entry(),
  field: ["Field1", "Field2"],
  overwrite: true
});
```

Parameter:

- `entry` / `entryObj`: aktueller Zieleintrag.
- `fields` / `field`: Felder, die vom ersten Library-Eintrag gelesen werden.
- `overwrite`: erlaubt das Ersetzen bereits gefüllter Zielwerte.

<a id="syncfieldback"></a>
#### Funktion: `syncFieldBack()`

> Schreibt ausgewählte Felder vom aktuellen Eintrag in den ersten Library-Eintrag zurück.

```js
syncFieldBack({
  enabled: true,
  entry: entry(),
  fields: ["Field1", "Field2"],
  overwrite: true
});
```

Parameter:

- `entry` / `entryObj`: Quelleintrag.
- `fields`: Felder, die in den ersten Library-Eintrag zurückgeschrieben werden.
- `overwrite`: erlaubt das Ersetzen vorhandener Werte; leere Quellen werden übersprungen.

<a id="syncfieldall"></a>
#### Funktion: `syncFieldAll()`

> Verteilt ausgewählte Felder des ersten Library-Eintrags an alle Einträge.

```js
var syncResults = syncFieldAll({
  enabled: true,
  entry: entry(),
  fields: ["Field1", "Field2"],
  overwrite: true
});
```

Parameter:

- `entry` / `entryObj`: liefert bei Bedarf die zugehörige Library.
- `fields`: Felder, die vom ersten Eintrag an alle Einträge verteilt werden.
- `overwrite`: ersetzt bereits gefüllte Ziele.

### B4 `syncLastFromLatest.js`

> Findet den neuesten passenden Eintrag und übernimmt ausgewählte Feldwerte in den aktuellen Eintrag.

<a id="findnewestentry"></a>
#### Funktion: `findNewestEntry()`

> Ermittelt aus einer Entry-Liste den zuletzt geänderten Eintrag.

```js
var newestModified = findNewestEntry(lib().entries(), {
  maxEntries: 100
});
```

Parameter:

- Erster Parameter: Entry-Liste, Array oder Java-Liste.
- `maxEntries` / `maxScan`: maximale Zahl gescannter Einträge.
- Ermittelt nach Änderungszeit und nutzt die Entry-ID als Tie-Break.

<a id="getnewestlibraryentry"></a>
#### Funktion: `getNewestLibraryEntry()`

> Liefert je nach Modus den ersten erstellten oder zuletzt geänderten Library-Eintrag.

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
- `maxEntries`: Scan-Limit für den Modified-Modus.

<a id="synclastfromlatest"></a>
#### Funktion: `syncLastFromLatest()`

> Übernimmt ausgewählte Werte aus dem neuesten anderen Eintrag in den aktuellen Eintrag.

```js
var latestSync = syncLastFromLatest({
  enabled: true,
  entry: entry(),
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

- `entry` / `entryObj` / `currentEntry`, `entries`: Ziel und Kandidatenliste.
- `fieldDate`: wählt den letzten anderen Eintrag nach Datum; ohne Feld gilt die Library-Reihenfolge.
- `fields`: gleiche Feldnamen kopieren; `map` ordnet Ziel zu Quelle und optional `append`/`prepend` zu.
- `onlyIfEmpty`: schreibt nur in leere Ziele.
- `separator`: Trenner für Append/Prepend.
- `clearTemplateSlots`: leert Template-Slot-Inhalte vor dem Kopieren.
- `maxEntries`: begrenzt die Suche.

### B10 `dustMerger.js`

> Führt kurzlebige Dust-Einträge kontrolliert mit einem zeitlich passenden älteren Zieleintrag zusammen.

<a id="dustmerge"></a>
#### Funktion: `dustMerge()`

> Sucht einen passenden älteren Zieleintrag und führt konfigurierte Felder des aktuellen Dust-Eintrags dort zusammen.

```js
var mergeResult = dustMerge({
  enabled: true,
  entry: entry(),
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

- `entry` / `entryObj` / `currentEntry`, `entries`, `fieldDate`: Quelle, Kandidaten und Datumsfeld.
- `searchLimit`, `mergeWindowHours`, `dayStartHour`: Such- und Zeitfenster.
- `map`: Felder mit Merge-Modus und Datentyp.
- `blockMap`: Felder, deren Konflikt einen Merge verhindert.
- `rowSourceMode`, `rowStepHours`, `rowRoundMode`: Zeitlabels für `string_rows`.
- `skipField`, `forceMergeField`: benutzergesteuertes Sperren bzw. Erzwingen.
- `mergeJsonField`, `statusField`, `mergeCountField`: Protokoll- und Statusziele.
- `trashMergedEntry`, `openTargetEntry`: Nachaktionen bei Erfolg.

<a id="dustmerger"></a>
#### Funktion: `dustMerger()`

> Ist der kompatible Alias für `dustMerge()`.

```js
var legacyMergeResult = dustMerger({
  enabled: true,
  fieldDate: "Datum",
  map: [
    { name: "Notiz", mode: "append", datatype: "string" }
  ]
});
```

Parameter:

- Kompatibler Alias für `dustMerge()`.
- Akzeptiert dieselbe Konfiguration und liefert dasselbe Ergebnisobjekt.

### B11 `templateFieldTransfer.js`

> Verschiebt ausgefüllte Template-Slots zwischen Textfeldern und kann anschließend ihre Vollständigkeit prüfen.

<a id="gettemplatefieldnames"></a>
#### Funktion: `getTemplateFieldNames()`

> Liest die Namen aller Template-Slots aus einem Text oder Quellfeld, ohne Werte zu verschieben.

```js
var templateNames = getTemplateFieldNames({
  enabled: true,
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
#### Funktion: `moveFilledTemplates()`

> Verschiebt ausgefüllte Template-Slots in ein Zielfeld und setzt die Slots im Quellfeld zurück.

```js
var transfer = moveFilledTemplates({
  enabled: true,
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
- `sourceMode`, `startDatetimeField`, `stepHours`, `roundMode`, `maxHours`: Time-Marker-kompatible Zeitberechnung; alle Werte stehen unter [Gemeinsame Zeitoptionen](#gemeinsame-zeitoptionen).
- `rowLabel`: explizites Zeitlabel und damit Override der Berechnung.
- `templateSlotMarker`: Kennzeichen offener Slots, die nach dem Transfer zurückgesetzt werden.

<a id="moveandtracktemplates"></a>
#### Funktion: `moveAndTrackTemplates()`

> Kombiniert Template-Transfer und anschliessende Vollständigkeitsprüfung in einem Aufruf.

```js
var transferStatus = moveAndTrackTemplates({
  enabled: true,
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

- Übernimmt alle Optionen von `moveFilledTemplates()`.
- `result`, `requiredTags`, `completeField`, `missingField`: Optionen für `trackTagsComplete()`.
- `trackTemplates`: nimmt die gefundenen Template-Namen automatisch in die Vollständigkeitsprüfung auf.

## `3_workflow`

### B5 `floatingAverage.js`

> Berechnet gruppierte gleitende Mittelwerte aus chronologisch sortierten Library-Einträgen.

<a id="updateaverage"></a>
#### Funktion: `updateAverage()`

> Berechnet einen gruppierten gleitenden Durchschnitt aus vorherigen Entry-Werten.

```js
var averageResult = updateAverage({
  enabled: true,
  entries: lib().entries(),
  entry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis"],
  fieldValue: "Ausgabewert GW+AT",
  fieldResult: "Ausgabewert Mittel",
  ignoreFields: ["Unausgefüllt"],
  avgCount: 3,
  skipFirst: 2,
  decimals: 2
});
```

Parameter:

- `entries`, `entry` / `currentEntry` / `entryObj`, `fieldDate`: Datenbasis, Live-Eintrag und Sortierdatum.
- `groupFields`: trennt unabhängige Durchschnittsgruppen.
- `fieldValue`, `fieldResult`: Quellwert und Zielfeld.
- `ignoreFields`: Einträge mit gesetztem Ignore-Feld auslassen.
- `avgCount`, `skipFirst`, `decimals`: Fenster, ausgelassene Anfangswerte und Rundung.

### B6 `sequenceCounter.js`

> Berechnet gruppierte Reihen, Sprees, Maximalwerte und optional verzerrte Sprees über mehrere Einträge.

<a id="updatesequencespree"></a>
#### Funktion: `updateSequenceSpree()`

> Aktualisiert Reihen-, Spree- und Maximalzähler für chronologisch gruppierte Einträge.

```js
var sequenceResult = updateSequenceSpree({
  enabled: true,
  entries: lib().entries(),
  entry: entry(),
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

- `entries`, `entry` / `currentEntry` / `entryObj`, `fieldDate`, `groupFields`: Datenbasis und Gruppierung.
- `fieldSequence`, `fieldSpree`: aktuelle Sequenz- und Spree-Ziele.
- `fieldSequenceMax`, `fieldSpreeMax`: bisherige Maximalwerte.
- `fieldBiasedSpree`, `biasedSpreeCount`: markierte Spree und erlaubte Unterbrechungen.

### B7 `timeMarker.js`

> Erzeugt, bereinigt und entfernt relative oder absolute Zeitmarker in Memento-Textfeldern.

<a id="appendtimemarker"></a>
#### Funktion: `appendTimeMarker()`

> Berechnet ein Zeitlabel und fügt einen neuen Zeitmarker in ein Textfeld ein.

```js
appendTimeMarker({
  enabled: true,
  entry: entry(),
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

- `entry` / `entryObj`, `targetTextField`: Zieleintrag und Textfeld.
- `sourceMode`: Zeitquelle aus der vollständigen Liste [Gemeinsame Zeitoptionen](#gemeinsame-zeitoptionen).
- `startDatetimeField`: Ausgangszeit für `realtime_since`.
- `stepHours`, `roundMode`: Raster und Rundung; mögliche Rundungswerte stehen in der gemeinsamen Liste.
- `insertMode`: Position des neuen Markers aus der gemeinsamen Liste.
- `maxHours`: überspringt Werte oberhalb des Limits.

<a id="cleanuptimemarker"></a>
#### Funktion: `cleanupTimeMarker()`

> Bereinigt vorhandene Zeitmarker, entfernt leere Marker und kann gleiche Zeitzeilen zusammenführen.

```js
cleanupTimeMarker({
  enabled: true,
  entry: entry(),
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

- `entry` / `entryObj`, `fields` / `field`: Eintrag und zu bereinigende Textfelder.
- `mergeSameRows`: führt identische Zeitlabels zusammen.
- `sameRowSeparator`, `mergeSameRowContents`: Trenner und Duplikatbehandlung.
- Zeitoptionen entsprechen `appendTimeMarker()`; Cleanup fügt keinen leeren Marker an.

<a id="cleartimemarkerrows"></a>
#### Funktion: `clearTimeMarkerRows()`

> Entfernt oder setzt vorhandene Row-Zeitlabels in Textfeldern zurück.

```js
clearTimeMarkerRows({
  enabled: true,
  entry: entry(),
  fields: ["Notiz", "Record"],
  mode: "remove"
});
```

Parameter:

- `entry` / `entryObj`, `fields` / `field`: Eintrag und Textfelder.
- `mode`: steuert, ob alte Row-Marker entfernt oder deren Inhalt erhalten wird.

## `6_integration`

### B8 `obsidianLinker.js`

> Erzeugt und formatiert Obsidian-URIs für Memento-Einträge und kann zugehörige Notizen öffnen.

<a id="linkobsidianuri"></a>
#### Funktion: `linkObsidianUri()`

> Erzeugt Obsidian-Links und optional den formatierten Inhalt zum Anlegen oder Öffnen einer Notiz.

```js
var obsidianResult = linkObsidianUri({
  enabled: true,
  entry: entry(),
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

- `entry` / `entryObj`, `contentField`, `dateField`: Quelleintrag, Inhalt und Datum.
- `overwriteMarkdownField`, `obsidianMarkdownField`, `mementoLinkField`: Link-Zielfelder.
- `vault`, `folderPath`: Obsidian-Vault und Zielordner.
- `tags`, `folderAsTag`: Frontmatter-/Ordner-Tags.
- `formatOnly`: erzeugt nur Links/Text ohne Open-Aktion.
- `open`: öffnet die erzeugte Obsidian-URI.

<a id="formatobsidianuri"></a>
#### Funktion: `formatObsidianUri()`

> Formatiert ein vorhandenes Obsidian-Linkfeld, ohne eine URI zu öffnen.

```js
formatObsidianUri({
  enabled: true,
  entry: entry(),
  field: "Obsidian Link"
});
```

Parameter:

- `entry` / `entryObj`: Eintrag mit dem Linkfeld.
- `field`: Feld, dessen URI/Markdown-Darstellung normalisiert wird.

### B9 `wikiLinker.js`

> Erstellt sprachabhängige Wikipedia-Suchlinks aus einem konfigurierbaren Titelfeld.

<a id="applywikilinker"></a>
#### Funktion: `applyWikiLinker()`

> Erzeugt aus einem Titelfeld eine sprachabhängige Wikipedia-Such-URL.

```js
var wikiUrl = applyWikiLinker({
  enabled: true,
  entry: entry(),
  sourceTitleField: "Titel",
  targetField: "Wikipedia",
  language: "de",
  clearOnEmpty: true
});
```

Parameter:

- `entry` / `entryObj`: Zieleintrag.
- `sourceTitleField`: Feld mit dem Suchbegriff.
- `targetField`: Feld für die Wikipedia-Such-URL.
- `language`: Sprachsubdomain, z. B. `de` oder `en`.
- `clearOnEmpty`: leert das Ziel bei fehlendem Titel.

## `z_generell`

### C1 `multiChoiceHelpers.js`

> Ergänzt oder entfernt einzelne Werte sicher und duplikatfrei in Memento-Multi-Choice-Feldern.

<a id="multichoiceappend"></a>
#### Funktion: `multiChoiceAppend()`

> Fügt einem Multi-Choice-Feld einen noch nicht vorhandenen Wert hinzu.

```js
var appended = multiChoiceAppend({
  enabled: true,
  entry: entry(),
  field: "Typ",
  value: "Tag"
});
```

Parameter:

- `entry` / `entryObj`: Zieleintrag.
- `field`: Multi-Choice-Feld.
- `value`: Wert, der ohne Duplikat angefügt wird.

<a id="multichoiceremove"></a>
#### Funktion: `multiChoiceRemove()`

> Entfernt einen exakten Wert aus einem Multi-Choice-Feld.

```js
var removed = multiChoiceRemove({
  enabled: true,
  entry: entry(),
  field: "Typ",
  value: "Tag"
});
```

Parameter:

- `entry` / `entryObj`: Zieleintrag.
- `field`: Multi-Choice-Feld.
- `value`: zu entfernender exakter Wert.

### C2 `typedTextFields.js`

> Synchronisiert typisierte Text-Hilfsfelder mit den dazugehörigen Memento-Zielfeldtypen.

<a id="synctypedtextfields"></a>
#### Funktion: `syncTypedTextFields()`

> Konvertiert und synchronisiert typisierte Text-Hilfsfelder mit ihren eigentlichen Zielfeldern.

```js
var typedSync = syncTypedTextFields({
  enabled: true,
  entry: entry(),
  clearSource: false,
  onlyIfTargetEmpty: false,
  dryRun: false
});
```

Parameter:

- `entry` / `entryObj` / `currentEntry`: einzelner Eintrag im Config-Aufruf; alternativ kann weiterhin ein Eintrag oder eine Entry-Liste als erster Positionsparameter übergeben werden.
- `clearSource`: leert das typisierte Text-Quellfeld nach erfolgreicher Übertragung.
- `onlyIfTargetEmpty`: schützt bereits gefüllte Zielfelder.
- `dryRun`: prüft und protokolliert ohne zu schreiben.

## `z_others`

### C3 `hourGuide.js`

> Rendert abhängig von vergangenen Stunden einen konfigurierbaren Leitfadenblock in ein Zielfeld.

<a id="applyhourguide"></a>
#### Funktion: `applyHourGuide()`

> Wählt anhand der vergangenen Stunden den passenden Guide-Block und schreibt ihn formatiert in ein Zielfeld.

```js
var guideResult = applyHourGuide({
  enabled: true,
  entry: entry(),
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  planField: "Hour Guide JSON",
  maxHours: 16,
  plan: null
});
```

Parameter:

- `entry` / `entryObj` / `currentEntry`: Eintrag mit Stundenquelle und Ziel.
- `sourceHoursField`: numerische Stunden seit dem Start.
- `targetField`: HTML-/Textziel für den passenden Guide-Block.
- `planField`: optionales JSON-Feld mit eigener Guide-Konfiguration.
- `plan`: direkte Konfiguration; hat Vorrang vor `planField`, `null` nutzt Feld oder Standard.
- `maxHours`: oberes Anzeigelimit.

Minimaler Aufbau für `plan` oder `planField`:

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
