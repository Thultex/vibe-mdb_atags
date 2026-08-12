# Plugin-Beispiele

Kopierbare Beispiele fuer die Module in `addons/`, geordnet nach Plugin-Ordnern. Feldnamen und Inhalte sind neutral gehalten und muessen an die eigene Memento-Library angepasst werden.

## `1_tagging`

### B2 `tagPairParser.js`

```js
applyTagPairParser({
  tagField: "Tags",
  targetTextField: "Notiz"
});

bulkApplyTagPairParser({
  tagField: "Tags",
  targetTextField: "Notiz"
});
```

## `2_syncing`

### B3 `globalFieldSync.js`

```js
syncFieldTo({
  fields: ["Field1", "Field2"],
  overwrite: true
});

syncFieldBack({
  fields: ["Field1", "Field2"],
  overwrite: true
});

syncFieldAll({
  fields: ["Field1", "Field2"],
  overwrite: true
});
```

### B4 `syncLastFromLatest.js`

```js
syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  fields: ["Dosis", "Wirkstoff"],
  onlyIfEmpty: true
});
```

Mit Ziel-zu-Quelle-Zuordnung und Append-Modus:

```js
syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  map: {
    "Dosis": "Dosis",
    "Wirkstoff": "WS",
    "RecordAdd": ["Record", "append"]
  }
});
```

Neuesten Eintrag an einen weiteren Helper uebergeben:

```js
var newest = getNewestLibraryEntry();
if (newest) applyHourGuide({ entryObj: newest });
```

### B10 `dustMerger.js`

```js
dustMerge({
  fieldDate: "Datum",
  titleField: "Titel",
  mergeJsonField: "Merge Json",
  statusField: "Merge Status",
  mergeCountField: "Merge Count",
  searchLimit: 5,
  mergeWindowHours: 28,
  rowSourceMode: "realtime",
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

### B11 `templateFieldTransfer.js`

Transfer-Zeilen relativ zu `Einnahmedatum` erzeugen und danach mit denselben Collector-Daten die Vollstaendigkeit pruefen:

```js
var e = entry();

var transfer = moveFilledTemplates({
  entry: e,
  sourceField: "Record",
  targetField: "Notiz",
  mode: "append_row",
  sourceMode: "realtime_since",
  startDatetimeField: "Einnahmedatum",
  stepHours: 0.5,
  roundMode: "round",
  maxHours: 15
});

var result = applyTags({
  entryObj: e,
  textFields: ["Notiz", "Record", "Atag Aliases"],
  targetField: "tags",
  targetFieldType: "tags"
});

trackTagsComplete({
  entry: e,
  templateNames: transfer.templateNames,
  result: result,
  completeField: "record_complete"
});
```

## `3_workflow`

### B5 `floatingAverage.js`

```js
updateAverage({
  entries: lib().entries(),
  currentEntry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis"],
  fieldValue: "Ausgabewert GW+AT",
  fieldResult: "Ausgabewert Mittel",
  ignoreFields: ["Unausgefuellt"],
  avgCount: 3,
  skipFirst: 2
});
```

### B6 `sequenceCounter.js`

```js
updateSequenceSpree({
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

### B7 `timeMarker.js`

Marker relativ zu einem Datumsfeld setzen:

```js
appendTimeMarker({
  targetTextField: "Notiz",
  sourceMode: "realtime_since",
  startDatetimeField: "Einnahmedatum",
  stepHours: 0.5,
  roundMode: "round",
  insertMode: "time_block_top",
  maxHours: 30
});
```

Nach dem Speichern bereinigen, ohne einen neuen leeren Marker anzufuegen:

```js
cleanupTimeMarker({
  fields: ["Notiz"],
  mergeSameRows: true
});
```

Vorlagen vor dem Tag-Cleaner von alten Row-Markern befreien:

```js
clearTimeMarkerRows({
  fields: ["Notiz"],
  mode: "remove"
});
```

## `6_integration`

### B8 `obsidianLinker.js`

```js
linkObsidianUri({
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

formatObsidianUri({
  field: "Obsidian Link"
});
```

### B9 `wikiLinker.js`

```js
applyWikiLinker({
  sourceTitleField: "Titel",
  targetField: "Wikipedia",
  language: "de"
});
```

## `z_generell`

### C1 `multiChoiceHelpers.js`

```js
multiChoiceAppend({
  field: "Typ",
  value: "Tag"
});

multiChoiceRemove({
  field: "Typ",
  value: "Tag"
});
```

### C2 `typedTextFields.js`

```js
syncTypedTextFields();
syncTypedTextFields(entry());
syncTypedTextFields(lib().entries());

syncTypedTextFields(selectedEntries(), {
  clearSource: false,
  onlyIfTargetEmpty: false,
  dryRun: false
});
```

## `z_others`

### C3 `hourGuide.js`

Eingebaute Vorgabe nutzen:

```js
applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  maxHours: 16
});
```

Vorgabe aus einem synchronisierten JSON-Feld lesen:

```js
applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  planField: "Hour Guide JSON",
  maxHours: 16
});
```

Vorgabe direkt im Trigger hinterlegen:

```js
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
```

Passendes JSON fuer das Feld `Hour Guide JSON`:

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
