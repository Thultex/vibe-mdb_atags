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
- `InTag`
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
- Tagfeld: `InTag`
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
  dayStartHour: 4,
  daySearchLimit: 10,
  receiveAfterLink: true,
  receiveConfig: {
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    processMode: "append",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InTag", to: "Tags", type: "tag" }
    ]
  }
});
```

Input-Aufruf für Update-Test bei bereits vorhandenem `DayLinks`:

```js
linkInputEntryToTarget({
  targetLib: "DustingDay",
  sourceDateField: "Datum",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  debugReceive: true,
  receiveExistingLink: true,
  receiveConfig: {
    rowSourceMode: "realtime",
    rowStepHours: 0.1,
    rowRoundMode: "round",
    processMode: "append",
    postEntry: true,
    postEntryName: "PostEntry",
    recalcTarget: true,
    targetDebugField: "Debug",
    processMap: [
      { from: "InNote", to: "Notiz", type: "string_rows" },
      { from: "InTag", to: "Tags", type: "tag" }
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
  rowSourceMode: "realtime",
  rowStepHours: 0.1,
  rowRoundMode: "round",
  processMode: "append",
  postEntry: true,
  postEntryName: "PostEntry",
  recalcTarget: true,
  targetDebugField: "Debug",
  processMap: [
    { from: "InNote", to: "Notiz", type: "string_rows" },
    { from: "InTag", to: "Tags", type: "tag" }
  ]
});
```

Day-seitiger manueller Refresh in `DustingDay`:

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






