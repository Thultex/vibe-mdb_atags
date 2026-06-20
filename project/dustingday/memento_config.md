# Memento Config

Diese Datei hält die aktuelle Memento-Konfiguration für Dustingday fest. Sie dient als Referenz für spätere Add-ons, Parser und Tests.

## DustingDayInput

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

## DustingDay

Library für Tages-Einträge, die Einzel-Einträge sammeln und als Tagesnotiz ausgeben.

Aktuelle Felder:

- `Titel`
  - Typ: Text
  - optional
- `OutNote`
  - Typ: Text
- `Datum`
  - Typ: Datum/Zeit
- `Tags`
  - Typ: Tag
- `InLinks`
  - Typ: Library Links / Beziehung
  - Ziel: `DustingDayInput`
  - enthält die verknüpften Einzel-Einträge

## Aktueller Feldvertrag

Für erste Dustingday-Module gilt bei Einzel-Einträgen:

- Notizfeld: `InNote`
- Tagfeld: `InTag`
- Zeitfeld: `Date`
- Titel: `Titel`, optional

Für Tages-Einträge gilt:

- Notiz-Ausgabe: `OutNote`
- Tag-Ausgabe: `Tags`
- Tagesdatum: `Datum`
- Titel: `Titel`, optional
- verknüpfte Einzel-Einträge: `InLinks`

## Noch offen

- Welche Tags in `DustingDay.Tags` geschrieben werden sollen

## Script-Referenz

`dustingDayCollector.js` soll in Memento wie die Core-Scripte als GitHub-Referenz geladen werden.

Nach Push auf `main`:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/addons/3_workflow/dustingDayCollector.js
```

Der erste Test-Aufruf kann in der Library `DustingDay` laufen, z. B. im Trigger `Update Entry Before Save`, um manuell gesetzte `InLinks` in `OutNote` zu übertragen.

Der eigentliche Alltags-Trigger soll später in `DustingDayInput` liegen:

```text
DustingDayInput speichern
  -> passenden DustingDay finden oder erstellen
  -> Input in DustingDay.InLinks sammeln
  -> DustingDay.OutNote aktualisieren
```
