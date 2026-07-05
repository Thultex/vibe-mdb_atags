# Memento Config

Diese Datei hält die aktuelle Memento-Konfiguration für Dustingday fest. Sie dient als Referenz für spätere Add-ons, Parser und Tests.

## DustingInput

Library für kurze Einzel-Einträge im Alltag.

Aktuelle Felder:

- `Titel`
  - optional
- `InNote`
  - Typ: Text
  - mehrzeilig
- `InRecord`
  - Typ: Text
  - wird nach vorne in `DustingDay.Record` übernommen
- `InTags`
  - Typ: Tag
- `Date`
  - Typ: Datum/Zeit
- `Datum`
  - Typ: Datum/Zeit
  - aktueller Prototyp nutzt dieses Feld beim Zusammenführen mit der Eindosierungstabelle
- `DayLinks`
  - Typ: Beziehung / Relation
  - Ziel: `DustingDay`
  - verbindet den Input-Eintrag mit seinem Tages-Eintrag
- `DayId`
  - Typ: Text
  - optional, empfohlen als stabile technische ID des verknüpften `DustingDay`
- `Debug`
  - Typ: Text
  - optionales Diagnosefeld für Input-Trigger

## DustingDay

Library für Tages-Einträge, die Einzel-Einträge sammeln und als Tagesnotiz ausgeben.

Aktuelle Felder:

- `Titel`
  - Typ: Text
  - optional
- `Notiz`
  - Typ: Text
- `Record`
  - Typ: Text
  - wird vom letzten Tages-Eintrag übernommen; Template-Slot-Inhalte werden dabei geleert
- `Datum`
  - Typ: Datum/Zeit
- `Tags`
  - Typ: Tag
- `Atags User`
  - Typ: Tag
  - User-/Fremdtags für ATAG-Auswertung
- `tags`
  - Typ: Tag
  - Parser-/Export-Zielfeld der bestehenden ATAG-Pipeline
- `Atag Aliases`
  - Typ: Text
  - Aliasdefinitionen für ATAG-Auswertung
- `Atag MD`
  - Typ: Text
- `Atag Rows MD`
  - Typ: Text
- `Atag Rows Html`
  - Typ: Text
- `Atag Json`
  - Typ: Text
- `Atag Tree`
  - Typ: Text
- `Debug`
  - Typ: Text
  - optionales Diagnosefeld für Script-Ausgaben

## Aktueller Feldvertrag

Für erste Dustingday-Module gilt bei Einzel-Einträgen:

- Notizfeld: `InNote`
- Tagfeld: `InTags`
- Zeitfeld: `Datum` im aktuellen Eindosierungs-Prototyp, `Date` bleibt alter Teststand
- Tagesrelation: `DayLinks`
- Titel: `Titel`, optional
- Debug-Ausgabe: `Debug`, optional

Für Tages-Einträge gilt:

- Notiz-Ausgabe: `Notiz`
- Tag-Ausgabe: `Tags`
- Tagesdatum: `Datum`
- Titel: `Titel`, optional
- Debug-Ausgabe: `Debug`

## Noch offen

- Ob `Tags` und `Atags User` dauerhaft getrennt bleiben oder DustingDay eine eigene Parser-/UserTag-Struktur bekommt

## Script-Referenz

`inputLinker_lib.js` soll in Memento wie die Core-Libs als GitHub-Referenz geladen werden. Die Lib heißt `Input Linker`.

Nach Push auf `main`:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/core_lib/inputLinker_lib.js
```

Der eigentliche Alltags-Trigger liegt in `DustingInput`:

```text
DustingInput speichern
  -> passenden DustingDay finden oder erstellen
  -> DustingInput.DayLinks auf DustingDay setzen
```

Aktueller Input-Aufruf:

```js
linkInputEntryToTarget({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  sourceDayIdField: "DayId",
  openTargetEntry: true,
  refreshBeforeOpen: true,
  dayStartHour: 4,
  daySearchLimit: 10
});
```

Input-Aufruf mit direktem Receive-Nachlauf, falls `DustingDay` bei scriptgesetztem Link keinen `Linking an entry`-Trigger ausführt:

```js
linkInputEntryToTarget({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  sourceDayIdField: "DayId",
  openTargetEntry: true,
  refreshBeforeOpen: true,
  dayStartHour: 4,
  daySearchLimit: 10,
  receiveAfterLink: true,
  receiveExistingLink: true,
  receiveConfig: {
    processMode: "append",
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});
```

`sourceDayIdField: "DayId"` speichert beim ersten erfolgreichen Zuordnen die echte ID des `DustingDay` im Input. Bei späteren Änderungen kann der Input-Linker den Day per `findById(DayId)` aktualisieren, ohne `DayLinks` neu zu schreiben. Die Relation bleibt damit sichtbare UI-Verbindung, die technische Update-Brücke läuft über die stabile ID. Wenn `openTargetEntry: true` aktiv ist, führt `refreshBeforeOpen: true` direkt vor dem Öffnen noch einmal denselben Receive-Refresh aus.

Input-Aufruf für Update-Test bei bereits vorhandenem `DayLinks`:

```js
linkInputEntryToTarget({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  sourceDayIdField: "DayId",
  openTargetEntry: true,
  refreshBeforeOpen: true,
  debugReceive: true,
  receiveExistingLink: true,
  receiveConfig: {
    processMode: "append",
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});
```

Day-seitiger Trigger `Linking an entry` in `DustingDay`:

```js
recieveInputEntryFromSource({
  inputLib: "DustingInput",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  receiveConfig: {
    processMode: "append",
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});
```

Record vom letzten Day übernehmen, dabei ausfüllbare Slots leeren:

```js
syncLastFromLatest({
  fields: ["Record"],
  fieldDate: "Datum",
  clearTemplateSlots: true,
  templateSlotMarker: "_"
});
```

Day-seitiger manueller Refresh in `DustingDay`:

```js
refreshTargetFromInputEntries({
  inputLib: "DustingInput",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  findMatchingEntries: true,
  linkNewEntries: true,
  processAllEntries: true,
  receiveConfig: {
    processMode: "append",
    rowSourceMode: "realtime_since",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    recalcTarget: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InRecord", to: "Record", type: "string", mode: "append" },
      { from: "InTags", to: "Tags", type: "tag" }
    ]
  }
});
```
