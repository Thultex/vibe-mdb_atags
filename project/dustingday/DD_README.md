# Dustingday

Dustingday ist ein Projekt für einfache Tageserfassung aus sehr kleinen Memento-Einträgen.

Ziel ist, im Alltag Symptome und Befinden zu erfassen, Erfolge zu dokumentieren, hilfreiche Methoden sichtbar zu machen und daraus konkrete Hilfen an die Hand zu geben.

Das soll kurz, strukturiert und mit schnellem Zugriff funktionieren. Dustingday ist damit zugleich Alltagshilfe und Dokumentation: Der Tag wird greifbar, ohne dass die Erfassung selbst zu schwer wird.

Dosis bleibt als Nebenfaktor möglich, aber der Fokus liegt auf Zustand, Wirkung, Erfolg, Methode und Hilfe.

## Kernidee

Viele kleine Einträge werden über Datum/Zeit einem Tag zugeordnet. Der Tages-Eintrag liest diese Einträge beim Aufruf ein und erzeugt daraus eine zusammenhängende Tagesnotiz.

Minimaler Eintrag:

- `Datum/Zeit`
- `innote`
- `intag`
- Relation zum Tages-Eintrag

Aus der Uhrzeit entsteht die Row. Aus `innote` und `intag` entstehen Tags, Werte und gekoppelte Informationen.

Erster technischer Schritt ist ein Relation-Feld:

```text
DustingInput.DayLinks -> DustingDay
```

Damit kann ein Input-Eintrag dauerhaft seinen Tages-Eintrag halten. Da Memento-Relationen beidseitig abrufbar sind, kann der Tages-Eintrag seine Inputs trotzdem erreichen. Das Datum dient zum Finden oder Erstellen des passenden Tages, `DayLinks` hält danach die Verbindung stabil.

## Dateien

- `DD_README.md`: Projektüberblick und Memento-Anschluss.
- `memento_config.md`: aktuelle Memento-Konfiguration.
- `stuct.md`: funktionelle Strukturüberlegung auf Modul- und Datenfluss-Ebene.

## Beispiel

```text
Eintrag 03:30
innote: 40mg, #müde
intag: mg 40

Eintrag 05:02
innote: stress3, tätigkeit: laufen
intag: müde 3
```

Wird ungefähr zu:

```text
Dosis: 40mg

3,5: müde
5: stress3, müde3, tätigkeit: laufen
```

## Erste Entwicklungsrichtung

1. `DustingInput.DayLinks -> DustingDay` in Memento testen.
2. Beim Speichern eines Inputs passenden `DustingDay` finden oder erstellen.
3. Map-Felder übertragen, z. B. im aktuellen Prototyp `InNote -> Notiz` und `InTag -> Tags`.
4. Rows und Tags nur ergänzen, wenn sie noch fehlen.
5. Danach eine Day-Funktion zur Zuordnung/Reparatur aller Inputs bauen.
6. Später mentale Hilfen, hilfreiche Methoden und Lösungsansätze aus Mustern ableiten.

Core-Lib für die Verknüpfung:

```text
core_lib/inputLinker_lib.js
linkInputEntryToTarget()
Name: Input Linker
```

## Script-Anschluss in Memento

Die Core-Lib soll wie die anderen Core-Libs als GitHub-Referenz geladen werden.

GitHub Raw URL:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/core_lib/inputLinker_lib.js
```

Anschluss in der Library `DustingInput`:

1. Script/Library-Referenz auf `inputLinker_lib.js` laden.
2. Danach im `DustingInput`-Trigger den Aufruf setzen.
3. Ideal: After Save / After Entry. Fallback: Before Save, wenn Cross-Library-Schreiben dort stabil läuft.

Aufruf aktueller Prototyp beim Zusammenführen mit der Eindosierungstabelle:

```js
linkInputEntryToTarget({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  rowSourceMode: "realtime_since",
  rowStepHours: 0.1,
  rowRoundMode: "round",
  recalcTarget: true,
  recalcSource: true,
  sourceDebugField: "Debug",
  map: [
    { from: "InNote", to: "Notiz", type: "string_rows" },
    { from: "InTag", to: "Tags", type: "tag" }
  ]
});
```

Wichtig: Die URL funktioniert erst, wenn `core_lib/inputLinker_lib.js` nach GitHub `main` gepusht wurde.

Optionaler Schutzmodus: Mit `strictTargetValidation: true` bricht der Linker ab, wenn vorhandene `DustingDay`-Einträge das konfigurierte `targetDateField` oder Ziel-Mappingfelder nicht lesbar besitzen. Standardmäßig ist diese Prüfung aus, weil Memento-Feldzugriff je nach Kontext sonst fälschlich blockieren kann.

Debug für Ziel-Library-Zugriff:

```js
debugInputLinkerAccess({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDebugField: "Debug"
});
```

Damit wird in `DustingInput.Debug` sichtbar, ob `libByName("DustingDay")`, `entries()` und optional `create()` erreichbar sind. Einen Test-Create nur bewusst mit `testCreate: true` aktivieren.
Die Debug-Ausgabe wird zusätzlich immer als ein zusammenhängender Block per `log()` ausgegeben und enthält Version sowie Zeitpunkt.

Zielablauf:

```text
DustingInput speichern
  -> passenden DustingDay finden oder erstellen
  -> DustingInput.DayLinks auf DustingDay setzen
  -> DustingDay.Notiz / Tags über map ergänzen
```

Der produktive Flow geht vom Input-Eintrag aus.
`recalcTarget` und `recalcSource` rufen nach dem Schreiben defensiv `recalc()` auf, falls Memento diese Entry-Methode im jeweiligen Kontext anbietet.

Hinweis zu Rows: `rowSourceMode: "realtime_since"` nutzt im `Input Linker` die absolute Tageszeit des Input-Eintrags, nicht die Differenz zum Tages-Eintrag. Der Name bleibt bewusst nah an TimeMarker-Konfigurationen, die Semantik für DustingDay ist aber die Tageszeit-Row.

## Day-seitiger Refresh

`refreshTargetFromInputEntries()` ist die DustingDay-Seite des `Input Linker`. Sie läuft auf einem Tages-Eintrag und kann:

- passende `DustingInput`-Einträge suchen
- unverbundene passende Inputs mit dem Day verlinken
- bereits mit diesem Day verlinkte Inputs lesen
- die `map` appendend anwenden
- oder mit `processMode: "rebuild"` die gemappten Zielfelder zuerst leeren und danach aus den Inputs neu aufbauen
- optional einen oder mehrere Inputs per `entries` verarbeiten

Empfohlener Standard: passende Inputs suchen, neue Links setzen, danach alle mit diesem Day verlinkten Inputs ausführen. Inputs, die bereits mit einem anderen Day verlinkt sind, werden nicht übernommen.

Day-Action / DustingDay-Trigger:

```js
refreshTargetFromInputEntries({
  inputLib: "DustingInput",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  rowSourceMode: "realtime_since",
  rowStepHours: 0.1,
  rowRoundMode: "round",
  findMatchingEntries: true,
  linkNewEntries: true,
  processAllEntries: true,
  processMode: "append",
  recalcTarget: true,
  targetDebugField: "Debug",
  processMap: [
    { from: "InNote", to: "Notiz", type: "string_rows" },
    { from: "InTag", to: "Tags", type: "tag" }
  ]
});
```

Rebuild:

```js
refreshTargetFromInputEntries({
  inputLib: "DustingInput",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  processAllEntries: true,
  processMode: "rebuild",
  processMap: [
    { from: "InNote", to: "Notiz", type: "string_rows" },
    { from: "InTag", to: "Tags", type: "tag" }
  ]
});
```

Einzelnen Input auf einen Day anwenden:

```js
refreshTargetFromInputEntries({
  entries: inputEntry,
  targetEntry: dayEntry,
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  linkNewEntries: true,
  processMap: [
    { from: "InNote", to: "Notiz", type: "string_rows" },
    { from: "InTag", to: "Tags", type: "tag" }
  ]
});
```

Die allgemeine PostEntry-/ATAG-Vorlage steht zentral in `ENTRY_WORKFLOWS.md`. Für DustingDay ist dort besonders der optionale `PostEntry(e)`-Parameter relevant, damit ein `DustingDay`-Eintrag auch aus einem `DustingInput`-Trigger heraus gezielt ausgewertet werden kann.

Aktuelle DustingDay-PostEntry-Variante:

```js
function PostEntry(e) {
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

  cleanupTimeMarker({
    entryObj: e,
    targetTextField: "Notiz",
    sourceMode: "realtime_since",
    startDatetimeField: "Datum",
    stepHours: 0.5,
    roundMode: "round",
    maxHours: 15
  });

  syncFieldBack({
    entryObj: e,
    fields: ["Atag Aliases"],
    overwrite: true
  });

  if (typeof e.recalc === "function") e.recalc();

  return result;
}
```





