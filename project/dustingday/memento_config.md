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
- `OutNote`
  - Typ: Text
- `Datum`
  - Typ: Datum/Zeit
- `OutTags`
  - Typ: Tag
- `Debug`
  - Typ: Text
  - optionales Diagnosefeld für Script-Ausgaben

## Aktueller Feldvertrag

Für erste Dustingday-Module gilt bei Einzel-Einträgen:

- Notizfeld: `InNote`
- Tagfeld: `InTag`
- Zeitfeld: `Date`
- Tagesrelation: `DayLinks`
- Titel: `Titel`, optional
- Debug-Ausgabe: `Debug`, optional

Für Tages-Einträge gilt:

- Notiz-Ausgabe: `OutNote`
- Tag-Ausgabe: `OutTags`
- Tagesdatum: `Datum`
- Titel: `Titel`, optional
- Debug-Ausgabe: `Debug`

## Noch offen

- Ob `OutTags` später zusätzlich in ein ATAG-UserTags-Feld gespiegelt wird

## Script-Referenz

`dd-linker.js` soll in Memento wie die Core-Scripte als GitHub-Referenz geladen werden.

Nach Push auf `main`:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/addons/5_dusting-day/dd-linker.js
```

Der eigentliche Alltags-Trigger liegt in `DustingInput`:

```text
DustingInput speichern
  -> passenden DustingDay finden oder erstellen
  -> DustingInput.DayLinks auf DustingDay setzen
  -> DustingDay.OutNote aktualisieren
```
