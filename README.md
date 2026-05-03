# ATAG System (sys 2.21)

## Inhalt

- [Pflege & Versionierung](#pflege--versionierung)
- [Ziel](#ziel)
- [Architektur](#architektur)
- [Module](#module)
- [Add-on Nutzung](#add-on-nutzung)
- [Syntax & Regeln](#syntax--regeln)
- [Export](#export)
- [Aktuelle Funktionsaufrufe](#aktuelle-funktionsaufrufe)
- [Entry Workflows](ENTRY_WORKFLOWS.md)

## Pflege & Versionierung

Jede funktionale Änderung wird an zwei Stellen dokumentiert:

- direkt in der geänderten Datei über die kurze Versionsinfo im Kopfblock
- zusätzlich im `CHANGELOG.md` als Repo-Verlauf

Regeln:

- Modulversion pro geänderter Datei anheben
- Jede Core-/Addon-Datei hat eine stabile Kennung im Header: `A` fuer Core, `B` fuer Addons, `C` fuer geloeste eigenstaendige Module; aktuell gibt es noch keine `C`-Module.
- Die Nummer folgt der Repo-Reihenfolge im Dateibaum. Core: `A1` bis `A4`; Addons: `B1` bis `B9`; geloeste generelle Module: `C1` bis `C3`.
- Kopfblöcke in Moduldateien sehr kurz halten; ausführliche Änderungen gehören in `CHANGELOG.md`
- In Kopfblöcken vorsichtig mit Quotes, Backticks, langen `Änderungen`-Listen und Sonderzeichen umgehen, weil der Memento-Java-Editor daran hängen bleiben kann
- Changelog mit Datum, Versionssprung und Wirkung ergänzen

Details siehe `CONTRIBUTING.md`.

Die aktuellen Memento-Entry-Trigger und die parse-relevante Reihenfolge stehen in `ENTRY_WORKFLOWS.md`.

## Ziel

Freitext → strukturierte Daten → flexible Exporte.

- Tags + Werte extrahieren
- Links / Mail / Tel erkennen
- Row-Kontext (z. B. `5h: emo3`) verarbeiten
- Mehrfachwerte aggregieren
- Alias-System unterstützen (inkl. inverse Aliase)
- Hybrid-Tag-System (Parser + manuell)
- Export in `tags` / `md` / `tree_md` / `rows_md` / `rows_html` / `json`

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

- `A1` `core/collectAtags.js`
- `A2` `core/exportAtags.js`
- `A3` `core/helpers.js`
- `A4` `core/restoreAtags.js`

**Tagging Add-ons**
- `B1` `addons/1_tagging/tagCleaner.js` (einfache Notiz-/Tagleisten-Normalisierung)
  - `applyTagCleaner()`
  - `bulkApplyTagCleaner()`
- `B2` `addons/1_tagging/tagPairParser.js` (Parser-Preprocessing)
  - `applyTagPairParser()`
  - `bulkApplyTagPairParser()`

**Syncing Add-ons**
- `B3` `addons/2_syncing/globalFieldSync.js` (Feld-Synchronisation)
  - `syncFieldTo()`
  - `syncFieldBack()`
  - `syncFieldAll()`
  - optionales Ueberschreiben ueber `overwrite: true`
- `B4` `addons/2_syncing/syncLastFromLatest.js` (Felder aus dem neuesten frueheren Eintrag uebernehmen)
  - `syncLastFromLatest()`
  - `fields` oder `map`
  - optional `onlyIfEmpty`

**Workflow Add-ons**
- `B5` `addons/3_workflow/floatingAverage.js` (gleitender Gruppen-Mittelwert)
  - `updateAverage()`
  - optional nur aktueller Eintrag ueber `currentEntry`
- `B6` `addons/3_workflow/sequenceCounter.js` (Sequenz- und Spree-Zaehler)
  - `updateSequenceSpree()`
  - optional nur aktueller Eintrag ueber `currentEntry`
- `B7` `addons/3_workflow/timeMarker.js` (Zeitmarker fuer Textfelder)
  - `appendTimeMarker()`
  - optionales Stundenlimit ueber `maxHours` (Default: `30`)

**Integration Add-ons**
- `B8` `addons/6_integration/obsidianLinker.js` (Memento-zu-Obsidian Advanced URI)
  - `makeObsidianMementoUri()`
  - `overwriteMarkdownField` fuer den Erstellen-/Overwrite-Link
  - `obsidianMarkdownField` fuer den formatierten bestehenden Obsidian-Link
  - alte `...HtmlField`-Optionen bleiben als Alias kompatibel
- `B9` `addons/6_integration/wikiLinker.js` (Wikipedia search link)
  - `applyWikiLinker()`
  - `makeWikiSearchUrl()`

**Generell / geloest**
- `C1` `addons/z_generell/multiChoiceHelpers.js` (Multi-Choice-Helfer)
  - `multiChoiceAppend()`
  - `multiChoiceRemove()`
  - gibt `true` zurueck, wenn das Feld geaendert wurde
- `C2` `addons/z_generell/typedTextFields.js` (typisierte Textfelder in Zielfelder uebertragen)
  - `syncTypedTextFields()`
  - Tokens: `(t-dd)`, `(t-d)`, `(t-i)`, `(t-r)`, `(t-tag)`, `(t-l)`
  - Optionen: `clearSource`, `onlyIfTargetEmpty`, `dryRun`
- `C3` `addons/z_others/hourGuide.js` (HTML guide by hours since dose)
  - `makeHourGuideHtml()`
  - `applyHourGuide()`

**Tests**

- `tests/test_collectAtags.js`
- `tests/test_tagPairParser.js`
- `tests/test_tagCleaner.js`
- `tests/test_timeMarker.js`
- `tests/test_syncLastFromLatest.js`
- `tests/test_typedTextFields.js`
- `tests/test_sequenceCounter.js`
- `tests/test_multiChoiceHelpers.js`
- `tests/test_hourGuide.js`
- `tests/test_obsidianLinker.js`
## Add-on Nutzung

**Tag-Pair Preprocessing (Tagging)**

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

**Global Field Sync (Syncing)**

Unabhängig vom Parser nutzbar, um Felder zu spiegeln:

- Synchronisierung einzelner oder mehrerer Felder
- Konfliktbehandlung über `overwrite: true`

**Sync Last From Latest (Syncing)**

Übernimmt Werte aus dem neuesten anderen Eintrag anhand eines Datumsfelds.

```js
syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  fields: ["Dosis", "Wirkstoff"],
  onlyIfEmpty: true
});
```

**Typed Text Fields (Syncing)**

Uebertraegt Text-Hilfsfelder mit Token-Suffix in passend benannte Zielfelder. Beispiel: `Dauer(t-d)` wird nach `Dauer` geschrieben, `Tags(t-tag)` nach `Tags`.

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

Mapping von Quellfeld auf Zielfeld:

```js
syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  map: {
    "Dosis": "Dosis",
    "Wirkstoff": "WS",
    "Kommentar": "Notiz"
  }
});
```

**Sequence Counter (Workflow)**

Berechnet zusammenhaengende Sequenzen und laufende Positionen innerhalb einer Sequenz anhand von Datum und Gruppierungsfeldern.

```js
updateSequenceSpree({
  entries: lib().entries(),
  currentEntry: entry(),
  fieldDate: "Einnahmedatum",
  groupFields: ["Dosis", "Medikament"],
  fieldSequence: "Reihe",
  fieldSpree: "Spree",
  fieldSequenceMax: "Reihe Max",
  fieldSpreeMax: "Spree Max"
});
```

Ziel-Felder sind optional. Mit `currentEntry` wird nur der aktuelle Eintrag geschrieben; ohne `currentEntry` werden alle berechneten Eintraege aktualisiert. `clearOnEmpty: false` verhindert das Leeren der Ziel-Felder, wenn ein Gruppierungsfeld leer ist.

**Floating Average (Workflow)**

Berechnet einen gleitenden Mittelwert innerhalb zusammenhaengender Gruppen.

```js
updateAverage({
  entries: lib().entries(),
  currentEntry: entry(),
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

Mit `currentEntry` wird nur der aktuelle Eintrag geschrieben. Falls `lib().entries()` noch den alten Stand enthaelt, ersetzt `currentEntry` diesen Eintrag im Berechnungsset.

**Tag Cleaner (Tagging)**

Normalisiert einfache Werttags im Text und führt `|`-/`||`-Tagleisten zusammen. Die Ausgabe nutzt eine einfache `|`-Tagleiste. Standard ist Tagleiste unten mit einer Leerzeile Abstand.

```js
applyTagCleaner({
  textField: "Notiz",
  tagFields: ["Tags", "User Tags"],
  tagBarPosition: "bottom",
  tagBarSpacing: "blank",
  formatValues: "keep"
});
```

Bulk-Aufruf:

```js
bulkApplyTagCleaner({
  textField: "Notiz",
  tagFields: ["Tags", "User Tags"],
  tagBarPosition: "top",
  tagBarSpacing: "none",
  formatValues: "keep"
});
```

Optionen:

- `tagBarPosition: "bottom"` setzt die Tagleiste ans Ende (Standard)
- `tagBarPosition: "top"` setzt die Tagleiste an den Anfang
- `tagBarPosition: "auto"` setzt die Tagleiste nach oben, sobald Zeitstempel-Zeilen wie `0:` oder `2,5:` vorhanden sind
- `tagBarSpacing: "blank"` setzt eine Leerzeile Abstand (Standard)
- `tagBarSpacing: "double"` setzt zwei Leerzeilen Abstand
- `tagBarSpacing: "none"` setzt keinen Leerzeilen-Abstand
- `formatValues: "keep"` erhält die Eingabeform (Standard)
- `formatValues: "min"` lässt `+` bei positiven Zahlen weg
- `formatValues: "max"` erzwingt `+` bei positiven Zahlen
- `formatValues: "none"` lässt Werttags unverändert
- `tagFields: ["Tags", "User Tags"]` schreibt `##tag`/`tag##` als User-Tags in mehrere Tagfelder

Pro Notiz kann die Werteformatierung über `fv` in der Tagleiste gesetzt werden:

```text
| fv: keep
| fv: min
| fv: max
| fv: none
```

In der Tagleiste wird nach Gruppen sortiert: erst Werttags, dann String-Werte, dann leere Tags, dann Funktions-Tags wie `fv`. Zwischen Gruppen steht `, `, innerhalb einer Gruppe nur ein Leerzeichen. String-Werte werden kompakt als `tag:wert` ausgegeben. Quotes bleiben nur erhalten, wenn sie nötig sind, z. B. bei mehreren Wörtern.

`##tag` oder `tag##` wird aus der Notiz entfernt und in die angegebenen `tagFields` geschrieben. Ohne `tagFields` wird der sichtbare Text trotzdem bereinigt, es wird aber kein Tagfeld geschrieben.

Beispiele:

```text
emo2 tag-0,3 stuff++
```

wird zu:

```text
emo² tag⁻⁰³ stuff⁺⁺
```

Mit `formatValues: "keep"` bleibt `tag+3` als `tag⁺³`, während `tag3` zu `tag³` wird. Mit `"max"` wird auch `tag³` zu `tag⁺³`; mit `"min"` wird `tag⁺³` zu `tag³`.

Tagleisten:

```text
Text
| tag3 info#"das ist info"
| info2
| stress laufen emo3
```

werden zu einer Tagleiste am Ende:

```text
Text

| emo³ info² tag³, info:"das ist info", laufenˣ stressˣ
```

**Restore Add-on (Other, JSON → Felder)**

Die Restore-Funktionen sind das dritte Add-on/Utility im Stack und werden aus historischen Gründen in `core/restoreAtags.js` geführt.

- `restoreAtags()` für Einzel-, Auto- oder Gruppen-Restore aus einem JSON-Feld
- ohne `entryObj`, `currentEntry`, `entries`, `entryGroup` oder `group` arbeitet `restoreAtags()` auf dem aktuellen Eintrag
- direkte Zuordnungen per `map`, `fields` oder `mappings`, z. B. `"emo - Emotion"`
- Alias-Zeilen werden nicht als Restore-Feldzuordnung gelesen; Restore-Ziele laufen ueber `map`, `fields` oder `mappings`
- direkte Zuordnungen sind standardmaessig exklusiv; mit `additional: true` laeuft danach zusaetzlich der Suffix-Auto-Restore
- fuer Gruppen kann `restoreAtags()` `entries`, `entryGroup` oder `group` nehmen; Gruppen koennen ein Array oder ein Objekt mit `.entries()` sein
- Java-Listen wie `lib().entries()` werden fuer Gruppen automatisch entpackt (`length`, `size()/get()` oder `iterator()`)
- `currentEntry: entry()` verhaelt sich wie beim Sequence-Counter: ersetzt stale Library-Eintraege, ergaenzt fehlende aktuelle Eintraege und schreibt nur den aktuellen Eintrag
- bei Gruppen werden gemappte Felder vor dem Schreiben geleert; bei Einzel-Entry nur mit `clearMappedFields: true`
- mehrere Werte in einem JSON-Array oder Aggregat-Text wie `2 [3, 1]` werden standardmaessig per `valueMode: "avg"` gemittelt; moeglich sind `"avg"`, `"first"`, `"last"`, `"median"`, `"min"` und `"max"`
- Standard-Suffixe fuer den Auto-Restore sind `_` und `_l` fuer Listen; `suffix: ""` schreibt direkt in gleichnamige Felder
- `debugField: "Feldname"` schreibt Diagnosezeilen in ein Textfeld; `debugLog: true` spiegelt sie zusaetzlich nach `log()`
- Auto-Restore nutzt vorhandene Feldnamen aus `lib().fields()` und ueberspringt fehlende Ziele vor dem Schreiben; alternativ kann `targetFields` explizit gesetzt werden
- unterstützt `force_type: null | "text" | "list"`

```js
restoreAtags({
  sourceField: "Atag Json",
  map: {
    emo: "Emotion",
    info: { field: "Info", force_type: "text" }
  },
  valueMode: "median"
});

restoreAtags({
  sourceField: "Atag Json",
  entries: lib().entries(),
  currentEntry: entry(),
  aliasTextFields: ["Alias"],
  limit: 1
});

restoreAtags({
  sourceField: "Atag Json",
  debugField: "Atag Restore Debug"
});
```

**Time Marker (Workflow)**

Fügt Zeitmarker wie `2:` oder `30,5:` in ein Textfeld ein und gruppiert sie bei `insertMode: "time_block_top"` oberhalb des restlichen Texts.

- unterstützt `sourceMode: "realtime" | "realtime_since" | "datetime" | "hours"`
- rundet über `stepHours` und `roundMode`
- stoppt optional ab `maxHours` Stunden; Standard ist `30`
- `maxHours: null` deaktiviert das Limit
- `: Text` am Zeilenanfang wird zum aktuellen Marker, `:` ohne Inhalt wird entfernt
- `appendTimeMarker()` gibt `true` zurueck, wenn danach Markerzeilen vorhanden sind, sonst `false`
- `cleanupTimeMarker()` ist fuer `AfterEntry()` gedacht, ersetzt `: Text` wie `appendTimeMarker()`, erzeugt aber keinen neuen leeren Marker
- `cleanupTimeMarker()` entfernt leere Marker wie `:` oder `3: ` und gibt `true` zurueck, wenn danach Markerzeilen vorhanden sind, sonst `false`
- `targetTextField` ist der normale Feldparameter; `textField` bleibt nur als Alias kompatibel

Kurzbeispiele:

```text
test
-> 2: test

: Text
-> 12,5: Text

:
-> wird entfernt
```

Anwendung vor oder beim Erstellen eines Eintrags:

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

Anwendung in `AfterEntry()` zum Bereinigen ohne neuen leeren Marker:

```js
cleanupTimeMarker({
  targetTextField: "Notiz"
});
```

**Hour Guide (Other)**

Returns context-aware HTML guidance from an hours field. After `maxHours`, it writes an empty string.

```js
applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  maxHours: 16
});
```

**Multi Choice Helpers (Workflow)**

Fuegt Werte zu Multi-Choice-Feldern hinzu oder entfernt sie. Bestehende Memento-Auswahllisten werden vor dem Schreiben entpackt, damit Freitext-Auswahlen erhalten bleiben. Beide Funktionen geben `true` zurueck, wenn das Feld geaendert wurde, sonst `false`.

```js
multiChoiceAppend({
  field: "typ",
  value: "Tag"
});

multiChoiceRemove({
  field: "typ",
  value: "Tag"
});
```

**Obsidian Linker (Integration)**

Erstellt einen `mode=overwrite`-Link fuer Advanced URI im `overwriteMarkdownField`. Sobald ein vorhandener Obsidian-Link im `obsidianMarkdownField` erkannt wird, wird das Overwrite-Feld geleert. Beide Felder werden als Markdown geschrieben; die alten `...HtmlField`-Optionen bleiben als Alias kompatibel. Ein bestehender Obsidian-Link wird im Obsidian-Feld als reiner Markdown-Link ohne Prefix ausgegeben. Optional erzeugt `windowsOpenBase` zusaetzlich `Win:` mit ausgeschriebenem HTTP-/HTTPS-Redirect-Link. Wenn nur ein Feld existiert oder beide Felder gleich sind, laufen beide Rollen auf dieses eine Feld.

```js
makeObsidianMementoUri({
  contentField: "Text",
  overwriteMarkdownField: "Obsidian Overwrite Link",
  obsidianMarkdownField: "Obsidian Link",
  dateField: "Datum",
  mementoLinkField: "Memento Link",
  vault: "RasObs",
  open: true
});
```

Empfohlen fuer Windows Desktop und Android ist `open: true`: Das Addon schreibt weiterhin stabile Markdown-Links in die Felder und versucht zusaetzlich, den verbundenen oder neu erzeugten Obsidian-Link direkt per Script zu oeffnen. Auf Android nutzt es `intent("android.intent.action.VIEW")`; auf Windows Desktop werden Java `Desktop.browse()` und als Fallback `rundll32.exe url.dll,FileProtocolHandler` versucht. Wenn die Plattform das blockt, bleibt das Feld trotzdem geschrieben und `openResult` enthaelt den Fehlerstatus.

Wenn `open: true` einen neuen `mode=overwrite`-Link oeffnet, wird danach kein Overwrite-Link im Feld behalten. Das Overwrite-Feld wird geleert und das Obsidian-Feld auf `Link: EINFÜGEN` gesetzt. Dieser Marker ist die einzige Ausgabe mit `Link:`-Prefix und bedeutet: Obsidian wurde zum Erstellen/Oeffnen angestossen, der echte Obsidian-Link muss noch eingefuegt werden. Solange dieser Marker im Obsidian-Feld steht, erzeugt und oeffnet ein erneuter Script-Lauf keinen neuen Overwrite-Link.

Wenn nur `obsidianMarkdownField` gesetzt ist, erzeugt das Addon nie einen Overwrite-Link in diesem Feld. Dann dient das Feld nur zum Anzeigen/Oeffnen eines bereits eingefuegten Obsidian-Links; das Erstellen laeuft ueber eine separate Aktion bzw. ein separat konfiguriertes `overwriteMarkdownField`.

Ohne lokalen Helper funktioniert `http://127.0.0.1:17890/...` nicht. `windowsOpenBase` sollte deshalb normalerweise leer bleiben. Fuer einen zusaetzlichen `Win:`-Link ohne Helper braucht `windowsOpenBase` eine echte Browser-Redirect-Seite, z.B. `https://example.org/obsidian-open?uri=` oder ein Template mit `{uri}`.

**Wiki Linker (Integration)**

Erzeugt aus einem Titelfeld einen Wikipedia-Suchlink und schreibt ihn in ein Zielfeld.

```js
applyWikiLinker({
  sourceTitleField: "Titel",
  targetField: "Wikipedia",
  language: "de"
});
```

## Syntax & Regeln

**Tag-Formen**

```text
#tag
tag3
tag³
tag⁻⁰³
tag+3
tag-2
tag++
tag: 5
tag: "text"
tag:inhalt
tag:: inhalt
inhalt(:tag)
"das ist ein Satz"(:Aussage)
'tag name'#

alias:
@@emo: Emotion
@@Kopfschmerzen (ks): Kopfschmerz, Kschm
@@Wirkung (Wk)
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
@@Kopfschmerz (KSch): ks, Kopfdruck1
@@@self (sf)
@@@help: Spielen, Musik, Laufen
tag1 (tg1)[self, help]: 3
tag2 (tg2)[self]: 3
```

- nur gültig im Tag-Kontext
- keine Ersetzung im Fließtext
- nur erlaubte Tagformen
- Basistags mit abschließendem Punkt sind erlaubt (z. B. `mood.`)
- inverse Aliase mit Präfix `-` kehren numerische Werte um (`down2` → `mood.-2`)
- Alias-Einträge dürfen feste Werte tragen (`Kopfdruck1` → `Kopfschmerz+1`)
- Kategorie-Aliase werden mit `@@@` definiert, z. B. `@@@self (sf)`
- `@@@help: Spielen, Musik, Laufen` setzt die rechte Seite direkt als Kategorie-Kinder, nicht als Aliase
- Kategorien werden nur im Alias-Bereich mit `[...]` festgelegt
- Kategorie-Tags enthalten ihre Untertags als Liste, z. B. `self` enthält `tag1, tag2`
- normale Tags behalten ihre Kategorien in `cats`, z. B. `tag1` hat `self, help`

Aus dem Beispiel entsteht fuer `tree_md`:

```text
help
├── Laufen
├── Musik
├── Spielen
└── tag1

sf
├── tag1
└── tag2
```

## Export

**Export-Typen**

- `tags`: normale Tag-Namen + Metatags; Kategorie-Tags werden ins Memento-Tagfeld mit `@`-Praefix geschrieben, wenn sie Kinder haben; Leerzeichen werden dort als `_` geschrieben
- `md`: normale Ausgabe, Aggregat + `[Einzelwerte]`, kein `[]` bei Einzelwert
- `tree_md`: Unicode-Baum der kategorisierten Tags; Tags ohne Kategorie und Kategorien ohne Kinder werden standardmäßig ausgelassen; Kinderwerte werden standardmäßig angezeigt; `treeStyle: "ascii"` erzwingt ASCII-Zweige
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
- `tableHeaderNames`: `"short"` (Standard, Alias-Kuerzel), `"long"` oder `"both"`
- `markdownLabelNames`: `"long"` (Standard), `"short"` oder `"both"` fuer normale Markdown-Ausgaben
- `markdownGroupSeparator`: `""` (Standard) trennt bei mehr als 5 Markdown-Zeilen Link/Mail/Tel, Zahlen und Text/List mit einer echten Leerzeile; eigener String ist moeglich, `null` deaktiviert das
- `markdownGroupSeparators: false` bleibt als kompatibler Alias zum Deaktivieren erhalten
- `includeBlankTags: true` gibt nackte Tags ohne Wert im `text`- und `md`-Export mit aus; Standard ist `false`
- `treeShowValues: false` blendet Werte im `tree_md` aus
- `categoryFilter: ["help", "home"]` filtert alle Exporttypen per OR auf eine oder mehrere Kategorien; `catFilter` ist ein Kurzalias

## Aktuelle Funktionsaufrufe

Ausführliche Beispiele liegen hier in der README, nicht in den Script-Kopfkommentaren. Die Script-Kommentare bleiben kurz, damit der Memento-Java-Editor nicht am Syntax-Highlighting hängen bleibt.

**Basis-Export in Tags**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atags",
  targetFieldType: "tags"
});
```

**Debug-/Text-Export**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Debug",
  targetFieldType: "text"
});
```

**Markdown-Export**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag MD",
  targetFieldType: "md",
  markdownGroupSeparator: "",
  includeBlankTags: false
});
```

**JSON-Export**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag JSON",
  targetFieldType: "json"
});
```

**Rows Markdown**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Rows MD",
  targetFieldType: "rows_md",
  rowAggregateMode: "avg",
  rowIncludeUnits: true,
  rowAggregateDecimals: 1,
  shortenTableHeaders: 0,
  tableHeaderNames: "short"
});
```

**Rows HTML**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atag Rows Html",
  targetFieldType: "rows_html",
  rowAggregateMode: "sum",
  rowIncludeUnits: false,
  rowAggregateDecimals: 1,
  shortenTableHeaders: 7,
  tableHeaderNames: "both"
});
```

**Hybrid-Tags Mit Fremdtag-Erhalt**

```js
applyTags({
  enabled: 1,
  textFields: ["Alias", "Notiz"],
  targetField: "Atags",
  targetFieldType: "tags",
  preserveForeignTagsField: "Tags Extern",
  parserOwnedTagsField: "Tags Parser"
});
```

**Direkter Export Aus Vorhandenem Result**

```js
var result = collectAtags({
  entryObj: entry(),
  textFields: ["Alias", "Notiz"]
});

exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag MD",
  targetFieldType: "md",
  markdownGroupSeparator: "",
  includeBlankTags: false
});

exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag Tree",
  targetFieldType: "tree_md",
  includeEmptyCategories: false,
  categoryFilter: ["self", "help"]
});

exportAtags({
  entryObj: entry(),
  result: result,
  targetField: "Atag Tree ASCII",
  targetFieldType: "tree_md",
  treeStyle: "ascii",
  treeShowValues: false
});
```
