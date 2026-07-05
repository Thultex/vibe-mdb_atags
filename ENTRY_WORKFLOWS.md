# Entry Workflows

Diese Datei dokumentiert die aktuelle generelle Memento-Entry-Struktur. Die Reihenfolge ist Teil der Logik: mehrere Trigger veraendern Textfelder, Tagfelder oder Parser-Zwischenstand, bevor spaetere Schritte daraus Exporte bauen.

## Trigger

- **New Entry Open**
  - laeuft beim Oeffnen eines neuen Eintrags
  - synchronisiert gespeicherte Felder in den neuen Eintrag

- **Update Entry Open**
  - laeuft beim Oeffnen eines bestehenden Eintrags
  - setzt nur dann einen neuen leeren Zeitmarker, wenn `Typ` den Wert `Tag` enthaelt
  - synchronisiert danach gespeicherte Felder in den Eintrag

- **New Entry / Update Entry Before Save**
  - laeuft vor dem Speichern neuer und bearbeiteter Eintraege
  - bereinigt und parst in der dokumentierten Reihenfolge

## New Entry Open

```js
syncFieldTo({
  fields: ["Atag Aliases"],
  overwrite: true
});
```

## Update Entry Open

```js
var typ = entry().field("Typ");

if (typ && typ.indexOf("Tag") !== -1) {
  appendTimeMarker({
    targetTextField: "Notiz",
    sourceMode: "realtime",
    stepHours: 0.5,
    roundMode: "round",
    insertMode: "time_block_top",
    maxHours: 30
  });
}

syncFieldTo({
  fields: ["Atag Aliases"],
  overwrite: true
});
```

## Before Save Reihenfolge

Vor dem Before-Save-Code muessen die genutzten Dateien in dieser Reihenfolge geladen sein:

1. `core_lib/helpers_lib.js`
2. `core_lib/collectAtags_lib.js`
3. `core_lib/exportAtags_lib.js`
4. `core/helpers.js` fuer `applyTags()`; diese Datei nutzt `core_lib/helpers_lib.js`
5. `core/tagCleaner.js` fuer `applyTagCleaner()`
6. benoetigte Add-ons, z. B. `timeMarker`, `tagPairParser`, `multiChoiceHelpers`, `globalFieldSync`, `obsidianLinker`

Ohne `core/helpers.js` sind `applyTags()`, `bulkApplyTags()` und `bulkExportAtags()` nicht definiert.

1. **Zeitmarker bereinigen**
   - `cleanupTimeMarker()` normalisiert Marker-Rows in `Notiz`.
   - `: Text` wird nach Source-Regeln zum aktuellen Marker.
   - Es wird kein neuer leerer Marker angehaengt.
   - Der Rueckgabewert steuert, ob `typ` den Wert `Tag` bekommt.

2. **Typ-Feld pflegen**
   - Wenn Marker-Rows existieren: `Tag` zu `typ` hinzufuegen.
   - Wenn kein `Titel` gesetzt ist: `Freiwort` aus `typ` entfernen.

3. **Notiz/Tagleiste normalisieren**
   - `applyTagCleaner()` muss vor dem Pair-Parser und vor `applyTags()` laufen.
   - Dadurch sind sichtbarer Text, Tagleistenposition und User-Tags in einem erwarteten Zustand.

4. **Tag-Pairs in Parser-Text ueberfuehren**
   - `applyTagPairParser()` laeuft nach dem Cleaner.
   - Es verarbeitet das Tag-Feld und schreibt parserfaehige Werte in `Notiz`.

5. **Einmal sammeln, mehrfach exportieren**
   - Der erste `applyTags()`-Aufruf erzeugt `result`.
   - Alle weiteren Export-Aufrufe nutzen dasselbe `result`, damit `tags`, Markdown, Rows und JSON aus derselben Parser-Sicht entstehen.

6. **Ruecksynchronisation und Integrationen**
   - `syncFieldBack()` laeuft nach den Parser-/Export-Schritten.
   - `makeObsidianMementoUri()` laeuft spaet, damit der finale Notizinhalt verwendet wird.
   - `Hidden` wird am Ende gesetzt.

## PostEntry-Variante

Für PostEntry-Trigger kann dieselbe Form genutzt werden. Beispiel für die aktuell verwendete ATAG-Pipeline mit optionalem Entry-Argument. Dateioperationen wie `restoreAtags()` laufen nur mit `PostEntry(e, true)`.

Aus dem Input-Linker heraus entspricht das `postEntryOptions: true` in der jeweiligen `receiveConfig`.

```js
function PostEntry(e, fileOps) {
  fileOps = fileOps || false;
  e = e || entry();

  applyTagCleaner({
    entryObj: e,
    textField: "Notiz",
    tagBarPosition: "top",
    tagBarSpacing: "blank",
    aliasTextFields: ["Atag Aliases"],
    tagFields: ["Tags", "Atags User"]
  });

  var result = applyTags({
    entryObj: e,
    textFields: ["Notiz", "Record", "Atag Aliases"],
    targetField: "tags",
    targetFieldType: "tags",
    preserveForeignTagsField: "Tags User",
    parserOwnedTagsField: "Tags Parser"
  });

  applyTags({
    entryObj: e,
    targetField: "Atag MD",
    targetFieldType: "md",
    result: result
  });

  applyTags({
    entryObj: e,
    enabled: false,
    targetField: "Atag Rows MD",
    targetFieldType: "rows_md",
    result: result
  });

  applyTags({
    entryObj: e,
    enabled: false,
    targetField: "Atag Rows Html",
    targetFieldType: "rows_html",
    shortenTableHeaders: 7,
    result: result
  });

  applyTags({
    entryObj: e,
    enabled: true,
    targetField: "Atag Json",
    targetFieldType: "json",
    result: result
  });

  applyTags({
    entryObj: e,
    enabled: true,
    targetField: "Atag Tree",
    targetFieldType: "tree_md",
    includeEmptyCategories: false,
    result: result
  });

  if (fileOps === true) {
    restoreAtags({
      sourceField: "Atag Json",
      entryObj: e
    });
  }

  updateSequenceSpree({
    entries: lib().entries(),
    entryObj: e,
    fieldDate: "Einnahmedatum",
    groupFields: ["Dosis"],
    fieldSequence: "Reihe",
    fieldSpree: "Spree",
    fieldSpreeMax: "Spree Max",
    fieldBiasedSpree: "Biased Spree",
    biasedSpreeCount: 1
  });

  cleanupTimeMarker({
    entryObj: e,
    targetTextField: "Notiz",
    sourceMode: "realtime_since",
    startDatetimeField: "Einnahmedatum",
    stepHours: 0.5,
    roundMode: "round",
    maxHours: 15
  });

  syncFieldBack({
    entryObj: e,
    fields: ["Atag Aliases"],
    overwrite: true
  });

  return result;
}
```
