# ATAG System (sys 2.10)

## Inhalt

- [Pflege & Versionierung](#pflege--versionierung)
- [Ziel](#ziel)
- [Architektur](#architektur)
- [Module](#module)
- [Add-on Nutzung](#add-on-nutzung)
- [Syntax & Regeln](#syntax--regeln)
- [Export](#export)

## Pflege & Versionierung

Jede funktionale Änderung wird an zwei Stellen dokumentiert:

- direkt in der geänderten Datei über die kurze Versionsinfo im Kopfblock
- zusätzlich im `CHANGELOG.md` als Repo-Verlauf

Regeln:

- Modulversion pro geänderter Datei anheben
- Änderungen im Kopfblock kurz und konkret notieren
- Changelog mit Datum, Versionssprung und Wirkung ergänzen

Details siehe `CONTRIBUTING.md`.

## Ziel

Freitext → strukturierte Daten → flexible Exporte.

- Tags + Werte extrahieren
- Links / Mail / Tel erkennen
- Row-Kontext (z. B. `5h: emo3`) verarbeiten
- Mehrfachwerte aggregieren
- Alias-System unterstützen (inkl. inverse Aliase)
- Hybrid-Tag-System (Parser + manuell)
- Export in `tags` / `md` / `rows_md` / `rows_html` / `json`

## Architektur

```text
Textfelder
   ↓
collectAtags()
   ↓
result.items   ← Single Source of Truth
   ↓
exportAtags()
   ↓
Ziel-Felder
```

**Datenmodell (`items`)**

```js
{
  items: [
    {
      name: "emo",
      attrText: "+3",
      attrValue: 3,
      rawText: "3",
      rowValue: 5,
      rowUnit: "h",
      rowRaw: "5h"
    }
  ]
}
```

**Pipeline (Detail)**

1. RAW TEXT: `5h: emo3, emo1`
2. PARSER: `collectAtags()`
3. ITEMS:
   ```js
   [
     { emo: 3, rowValue: 5 },
     { emo: 1, rowValue: 5 }
   ]
   ```
4. EXPORT: `exportAtags()`
5. OUTPUT: `md` / `tags` / `json` / `rows`

## Module

**Core**

- `core/collectAtags.js`
- `core/exportAtags.js`
- `core/helpers.js`
- `core/restoreAtags.js`

**Add-ons**
- `addons/tagPairParser.js` (Parser-Preprocessing)
  - `applyTagPairParser()`
  - `bulkApplyTagPairParser()`
- `addons/globalFieldSync.js` (Feld-Synchronisation)
  - `syncFieldTo()`
  - `syncFieldBack()`
  - `syncFieldAll()`
  - optionales Überschreiben über `overwrite: true`
- `addons/timeMarker.js` (Zeitmarker für Textfelder)
  - `appendTimeMarker()`
  - optionales Stundenlimit über `maxHours` (Default: `30`)
- `core/restoreAtags.js` (Restore-Helfer, historisch im `core/` abgelegt)
  - `restoreAtags()`
  - `bulkRestoreAtags()`

**Tests**

- `tests/test_collectAtags.js`
- `tests/test_tagPairParser.js`
- `tests/test_timeMarker.js`
## Add-on Nutzung

**Tag-Pair Preprocessing**

Optional als Add-on vor `collectAtags()`:

- kein direkter Hook in `applyTags()` / `bulkApplyTags()`

Beispiel:

```js
applyTagPairParser({
  tagField: "Tags",
  targetTextField: "Notiz"
});
```

Effekt:

- `["emo", "1,23"]` im Tag-Feld wird zu `emo#1,23` im Textfeld
- der Wert-Tag wird aus dem Tag-Feld entfernt
- danach kann separat die normale `collectAtags()`-Pipeline laufen

**Global Field Sync**

Unabhängig vom Parser nutzbar, um Felder zu spiegeln:

- Synchronisierung einzelner oder mehrerer Felder
- Konfliktbehandlung über `overwrite: true`

**Restore Add-on (JSON → Felder)**

Die Restore-Funktionen sind das dritte Add-on/Utility im Stack und werden aus historischen Gründen in `core/restoreAtags.js` geführt.

- `restoreAtags()` für Einzel- oder Auto-Restore aus einem JSON-Feld
- `bulkRestoreAtags()` für Restore über die gesamte Bibliothek
- unterstützt `force_type: null | "text" | "list"`

**Time Marker**

Fügt Zeitmarker wie `2:` oder `30,5:` in ein Textfeld ein und gruppiert sie bei `insertMode: "time_block_top"` oberhalb des restlichen Texts.

- unterstützt `sourceMode: "realtime" | "realtime_since" | "datetime" | "hours"`
- rundet über `stepHours` und `roundMode`
- stoppt optional ab `maxHours` Stunden; Standard ist `30`
- `maxHours: null` deaktiviert das Limit

Beispiel:

```js
appendTimeMarker({
  targetTextField: "Notiz",
  sourceMode: "hours",
  sourceHoursField: "Stunden",
  stepHours: 0.5,
  roundMode: "round",
  insertMode: "time_block_top",
  maxHours: 30
});
```

## Syntax & Regeln

**Tag-Formen**

```text
#tag
tag3
tag+3
tag-2
tag++
tag: 5
tag: "text"
'tag name'#

alias:
@@emo: Emotion
@@mood.: gut, -down

rows:
5h: emo3
2,5: focus+1
```

**Row-System**

Prefix definiert Kontext für restliche Zeile:

`5h: emo3 emo1`
→ `rowValue = 5`
→ `rowUnit = h`

Speicherung je item:

- `rowValue`
- `rowUnit`
- `rowRaw`

Aggregation:

- `avg` (default)
- `sum`
- `null`

**Alias-System**

```text
@@emo: Emotion
@@mood.: gut, -down
```

- nur gültig im Tag-Kontext
- keine Ersetzung im Fließtext
- nur erlaubte Tagformen
- Basistags mit abschließendem Punkt sind erlaubt (z. B. `mood.`)
- inverse Aliase mit Präfix `-` kehren numerische Werte um (`down2` → `mood.-2`)

## Export

**Export-Typen**

- `tags`: nur Tag-Namen + Metatags
- `md`: normale Ausgabe, Aggregat + `[Einzelwerte]`, kein `[]` bei Einzelwert
- `rows_md`: Markdown-Tabelle mit rechter Spaltenausrichtung und optionaler Header-Kürzung
- `rows_html`: HTML-Tabelle mit rechtsbündigen Zahlen
- `json`: `{ tag: value }`

**Markdown-Regeln**

- `"  \n"` für Zeilenumbruch
- 2 Spaces vor `[Liste]`
- Links klickbar
- Sortierung:
  1. links / tel / mail
  2. numbers
  3. text
  4. tags

Beispiele:

- Einzelwert: `emo: 1,0`
- Mehrfach: `emo: 2,0  [3,0, 1,0]`

**Rows-Tabelle**

| rval | emo |
| :--- | ---: |
| 2h   | 3,0 |
| 5h   | 1,0 |
| avg  | 2,0 |

Optionen:

- `rowIncludeUnits`
- `rowAggregateMode`
- `rowAggregateDecimals`
- `shortenTableHeaders` (`0` = Standard, 10 Zeichen + `.`)
