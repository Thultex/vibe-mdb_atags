# ATAG System (sys 2.50)

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
- Jede Datei hat eine stabile Kennung im Header: `#` fuer Remote-Libs, `A` fuer Core, `B` fuer Addons, `C` fuer geloeste eigenstaendige Module.
- Die Nummer folgt der alphanumerischen Repo-Reihenfolge im jeweiligen Dateibereich. Remote-Libs: `#1` bis `#3`; Core: `A1` bis `A4`; Addons: `B1` bis `B10`; geloeste generelle Module: `C1` bis `C3`.
- Kopfblöcke in Moduldateien sehr kurz halten; ausführliche Änderungen gehören in `CHANGELOG.md`
- In Kopfblöcken vorsichtig mit Quotes, Backticks, langen `Änderungen`-Listen und Sonderzeichen umgehen, weil der Memento-Java-Editor daran hängen bleiben kann
- Changelog mit Datum, Versionssprung und Wirkung ergänzen

Details siehe `CONTRIBUTING.md`.

Die aktuellen Memento-Entry-Trigger und die parse-relevante Reihenfolge stehen in `ENTRY_WORKFLOWS.md`.

## Ziel

Freitext → strukturierte Daten → flexible Exporte.

## Entwicklungsphasen

Bis vor der DustingDay-Phase lag der Schwerpunkt des Repos auf Dosis-/Eindosierungslogging: Einnahme, Dosis, Reihen/Spree, Stundenbezug und daraus abgeleitete ATAG-Auswertung.

Die DustingDay-Linker-Phase war ein Zwischenkonzept für Alltagstracking über getrennte Input- und Tages-Libraries. Dieses Konzept wird zugunsten von `DustMerger` zurückgestellt: kurze Einträge bleiben in einer Library und können bei zeitlicher Nähe in ältere Einträge gemerged werden. Dosis bleibt als Nebenfaktor möglich, ist aber nicht mehr der zentrale Taktgeber.

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

**Core Lib**

- `#1` `core_lib/collectAtags_lib.js`
- `#2` `core_lib/exportAtags_lib.js`
- `#3` `core_lib/helpers_lib.js`
Empfohlene Lade-Reihenfolge: `helpers_lib`, dann `collectAtags_lib`, dann `exportAtags_lib`. `core/tagCleaner.js` nutzt ebenfalls `helpers_lib`.
Optional vorher `core/_checkLibs.js` laden; dann koennen die erwarteten Remote-Libs ueber `checkAtagLibVersions({ checkAccess: true, verbose: true })` geprueft werden. Die Text-/Verbose-Ausgabe beginnt bei sauberem Stand mit `System Version X.XX (ok, X libs, X local)`. Bei Befunden ist die erste Zeile kompakt, z. B. `System Version X.XX (missmatch/missing, X libs, X local, X missing)`. Die Ausgabe endet mit einer Leerzeile. Standardmaessig werden Remote-Libs und geladene bekannte lokale Module als `LOCAL ...` ausgegeben. Die Schalter `SHOW_REMOTE_VERSIONS`, `SHOW_LOCAL_VERSIONS`, `SHOW_REMOTE_MISSMATCHES`, `SHOW_LOCAL_MISSMATCHES`, `SHOW_REMOTE_MISSING` und `SHOW_LOCAL_MISSING` steuern Versionlisten, Mismatches und Missing-Meldungen getrennt. `RUN_LIB_CHECK` steht oben in `core/_checkLibs.js` als sichtbarer Schalter und ist standardmaessig `true`, damit ein normaler Run die Prüfung direkt ausgibt. Die aktuelle statische Uebersicht liegt in `core_lib/Z_LIB_VERSIONS.md`.
Wenn ein Memento-Entry-Script `applyTags()`, `bulkApplyTags()` oder `bulkExportAtags()` nutzt, muss danach zusaetzlich `core/helpers.js` geladen werden. Diese Datei nutzt `core_lib/helpers_lib.js`.

**Core**

- `A1` `core/_checkLibs.js` (Versions-Checker, keine Remote-Lib)
- `A2` `core/helpers.js` (Memento-Wrapper fuer Lib-Funktionen, keine Remote-Lib; nutzt `core_lib/helpers_lib.js`)
- `A3` `core/restoreAtags.js`
- `A4` `core/tagCleaner.js` (reine Notiz-/Tagleisten-Normalisierung)
  - `makeTagCleanerText()`
  - `makeTagCleanerTextWithOptions()`
  - `prepareTagCleanerTemplateText()` fuer Vorlage-/Template-Vorbereitung neuer Eintraege
  - `cleanTemplateTags()` als schlanker Wrapper: Template-Slots leeren und gleiche Template-Variablen zusammenfassen
  - `cleanTags()` / `applyCleanTags()` als kurzer Memento-Wrapper; ohne Optionen nutzt er `Notiz`, liest `Alias` passiv mit und sortiert Row-Bloecke standardmaessig
  - `applyTagCleaner()` als optionaler Memento-Wrapper

**Tagging Add-ons**
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
  - `getNewestLibraryEntry()` / `findNewestEntry()`
  - `fields` oder `map`
  - optional `onlyIfEmpty`
- `B10` `addons/2_syncing/dustMerger.js` (nahe Alltagseinträge zusammenführen)
  - `dustMerge()` / `dustMerger()`
  - merge den aktuellen neueren Eintrag in einen älteren Eintrag derselben Library
  - `map` mit `append`, `prepend`, `replace`, `add`, `subtract`
  - `rowSourceMode: "realtime_since"` rechnet relative Quell-Rows beim Merge auf das Ziel-Datum um, z. B. `0:` im Quell-Eintrag zu `1,5:` im älteren Ziel-Eintrag
  - `mergeJsonField` schreibt Ziel-Historie und einen Stop-Marker im gemergten Quell-Eintrag inklusive letztem Trash-Status
  - optional `skipField`, `forceMergeField`, `blockMap`, `debugField`, `trashMergedEntry`, `openTargetEntry`

**Workflow Add-ons**
- `B5` `addons/3_workflow/floatingAverage.js` (gleitender Gruppen-Mittelwert)
  - `updateAverage()`
  - optional nur aktueller Eintrag ueber `currentEntry`
- `B6` `addons/3_workflow/sequenceCounter.js` (Sequenz- und Spree-Zaehler)
  - `updateSequenceSpree()`
  - optional nur aktueller Eintrag ueber `currentEntry`
- `B7` `addons/3_workflow/timeMarker.js` (Zeitmarker fuer Textfelder)
  - `appendTimeMarker()`
  - `clearTimeMarkerRows()`
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
- `tests/test_dustMerger.js`
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

Zum schnellen Finden des neuesten Library-Eintrags gibt es zusaetzliche Helper. `lib().entries()` ist laut Memento-Scripting-Doku nach Erstellzeit sortiert, neuester zuerst; `getNewestLibraryEntry()` nimmt deshalb direkt den ersten Eintrag. Nur fuer "zuletzt geaendert" kann explizit `mode: "modified"` gesetzt werden; dann scannt der Helper nach `modifiedTime` und nutzt bei gleicher Zeit die hoehere ID als Fallback.

```js
var newest = getNewestLibraryEntry();

if (newest) {
  applyHourGuide({
    entryObj: newest,
    sourceEntry: newest,
    sourceHoursField: "hours since dose",
    targetField: "Hour Guide"
  });
}
```

Bei `syncLastFromLatest()` ist `fieldDate` optional. Ohne `fieldDate` wird der neueste erstellte Library-Eintrag verwendet. Mit `fieldDate` werden standardmaessig nur die ersten 100 Library-Eintraege nach Datumsfeld verglichen. `maxEntries: 0` nutzt direkt den neuesten erstellten Eintrag, `maxEntries: -1` scannt alle Eintraege.

```js
syncLastFromLatest({
  fields: ["Dosis"]
});

syncLastFromLatest({
  fieldDate: "Einnahmedatum",
  maxEntries: -1,
  fields: ["Dosis"]
});
```

Template-Slots koennen beim Mitnehmen geleert werden. `clearTemplateSlots` ist standardmaessig aus. Standard-Marker ist `_`; mit `templateSlotMarker` kann ein anderes einzelnes Zeichen genutzt werden.

```js
syncLastFromLatest({
  fields: ["Record"],
  fieldDate: "Datum",
  clearTemplateSlots: true,
  templateSlotMarker: "_"
});
```

Damit wird z. B. `Laufen:_2 km_` zu `Laufen:__`, waehrend die Vorlage selbst erhalten bleibt.

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
  fieldSpreeMax: "Spree Max",
  fieldBiasedSpree: "Biased Spree",
  biasedSpreeCount: 2
});
```

Ziel-Felder sind optional. `fieldBiasedSpree` setzt fuer die ersten `biasedSpreeCount` Eintraege jeder Spree `true`, danach `false`; ein explizites `biasedSpreeCount: 0` loescht bestehende Markierungen ueber `false`. Mit `currentEntry` wird nur der aktuelle Eintrag geschrieben; wenn `fieldBiasedSpree` und `biasedSpreeCount` gesetzt sind, wird das Bias-Feld auch fuer die uebrigen berechneten Eintraege aktualisiert, damit alte Markierungen verschwinden. Ohne `currentEntry` werden alle berechneten Eintraege aktualisiert. `clearOnEmpty: false` verhindert das Leeren der Ziel-Felder, wenn ein Gruppierungsfeld leer ist.

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

**Tag Cleaner Core**

Normalisiert einfache Werttags im Text und fuehrt `|`-/`||`-Tagleisten zusammen. Die Ausgabe nutzt eine einfache `|`-Tagleiste. Standard ist Tagleiste unten mit einer Leerzeile Abstand. Der Core schreibt keine Felder; Memento-Trigger lesen/schreiben das Feld selbst.

```js
var e = entry();
var text = e.field("Notiz");
var cleaned = makeTagCleanerTextWithOptions(text, {
  tagBarPosition: "bottom",
  tagBarSpacing: "blank",
  formatValues: "keep"
});
e.set("Notiz", cleaned);
```

Kurzer Memento-Wrapper mit passivem Alias-Feld:

```js
cleanTags({
  fields: ["Notiz"]
});
```

Dabei wird `Notiz` gecleant, `Alias` nur gelesen und Row-Bloecke werden standardmaessig sortiert. Beispiel:

```text
Alias:
@@Ablenkung (ab+): bei

Notiz vorher:
0: ab²

ab²

Notiz nachher:
0: Ablenkung²

Ablenkung²
```

Vorlage-/Template-Vorbereitung ist ein eigener Schritt fuer neu erstellte Eintraege. Diese Funktion gehoert bewusst zum Tag Cleaner, nicht zum TimeMarker oder Sync.

```js
clearTimeMarkerRows({
  fields: ["Notiz"],
  mode: "remove"
});

applyTagCleanerTemplatePrep({
  fields: ["Notiz"]
});

// Schlanker Alias fuer genau diesen Tag-Cleaner-Teil:
cleanTemplateTags({
  fields: ["Notiz"]
});
```

Beispiel vorher:

```text
1: Laufen:_2 km_
1: Testing:_77_
1: Testing:_4_
3: normaler Inhalt
```

Beispiel nachher:

```text
Laufen:__
Testing:__
3: normaler Inhalt
```

Dabei entfernt `clearTimeMarkerRows()` zuerst nur die alten Row-Marker. Danach leert `cleanTemplateTags()` Template-Slots wie `Mal_sehen:_2 km_` zu `Mal_sehen:__` und entfernt gleiche leere Template-Variablen, damit jede Vorlage nur einmal bleibt. Der normale Clean-Vorgang ueber `applyTagCleaner()`/`cleanTags()` leert Template-Slots bewusst nicht. Normale Inhalt-Rows behalten ihren Zeitprefix, wenn sie nicht vorher ueber `clearTimeMarkerRows()` entfernt wurden. Mit `removeAllRowPrefixes: true` kann das Entfernen aller Row-Prefixe direkt in der Template-Prep bewusst aktiviert werden. `sortRows` gehoert zum normalen Clean-Vorgang und ist dort standardmaessig aktiv; bei absoluten Markern wird vorausgesetzt, dass Folgetag-1-Uhr bereits als `25:` vorliegt.

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
- `sortRows: true` sortiert Row-Bloecke im normalen Clean-Vorgang numerisch (Standard); `false` behaelt die Reihenfolge
- `aliasText` oder `aliasTextFields` liefert Aliasdefinitionen fuer Anzeigenamen, z. B. `@@Emotion (emo, 😃): Gefuehl`; `applyCleanTags()` liest ohne Angabe standardmaessig das passive Feld `Alias`
- Das zu cleanende Feld wird nicht automatisch als Aliasquelle genutzt; dafuer muss es explizit in `aliasTextFields` stehen
- `cleanerTagText: "long" | "short" | "none"` waehlt Langname, Kurzname oder nur Symbol fuer bekannte Alias-Tags
- `cleanerEmoji: "none" | "prefix" | "suffix" | "only"` setzt ein Emoji vor/hinter den Namen oder nutzt es exklusiv, z. B. `😃emo²`, `emo😃²` oder `😃²`
- Alias-Header koennen die Cleaner-Schreibweise selbst steuern: `emo*` bleibt wie eingegeben, `emo-` schreibt kurz, `emo+` schreibt lang; `emo` mit Emoji schreibt standardmaessig Emoji-only
- Alias-Header ohne Kurzname koennen Symboltokens steuern: `(+, 😃)` schreibt `😃²` zur Langform, `(-, 😃)` ignoriert die Symbolkonversion, `(*, 😃)` behaelt alles
- `||`, `|"` und `|'` werden beim Cleanen als exklusive Tagleiste zu `"|` normalisiert
- Eine einzelne leere `|`-Zeile wird standardmaessig ebenfalls zu `"|`; mit `singleBarExclusive: false` bleibt sie normale leere Tagleiste

Pro Notiz kann die Werteformatierung über `fv` in der Tagleiste gesetzt werden:

```text
| fv: keep
| fv: min
| fv: max
| fv: none
```

In der Tagleiste wird nach Gruppen sortiert: erst Werttags, dann String-Werte, dann leere Tags, dann Funktions-Tags wie `fv`. Zwischen Gruppen steht `, `, innerhalb einer Gruppe nur ein Leerzeichen. String-Werte werden kompakt als `tag:wert` ausgegeben. Quotes bleiben nur erhalten, wenn sie nötig sind, z. B. bei mehreren Wörtern.

`##tag` oder `tag##` wird aus der Notiz entfernt und als leerer Tag in die Tagleiste uebernommen.

Beispiele:

```text
emo2 tag-0,3 stuff++
tag+ tag-- tag++2 tag00 tag02 tag-0,2
```

wird zu:

```text
emo² tag⁻⁰³ stuff⁺⁺
tag⁺ tag⁻⁻ tag⁺⁺² tag⁰⁰ tag⁰² tag⁻⁰²
```

Mit `formatValues: "keep"` bleibt `tag+3` als `tag⁺³`, während `tag3` zu `tag³` wird. Mit `"max"` wird auch `tag³` zu `tag⁺³`; mit `"min"` wird `tag⁺³` zu `tag³`. Kumulative Formen bleiben bewusst sichtbar: `tag+` wird `tag⁺`, `tag++` wird `tag⁺⁺`, `tag++2` wird `tag⁺⁺²`. Längere Läufe werden verdichtet: `tag++++` wird wie `tag++4` gelesen. `tag:_`, `tag::__` und `tag#__` gelten als leere Vorlagen und werden aus der Tagleiste nicht übernommen; Slot-Werte wie `tag:_2 km_`, `tag: _2 km_`, `tag::_2 km_` oder `tag#_2 km_` werden als Stringwert `2 km` gelesen. `tag:: Inhalt` bleibt mit doppeltem Doppelpunkt erhalten; `tag::Inhalt` wird zu `tag:: Inhalt`. In der Tagleiste wird auch `test_b: sdfd` als Stringwert erkannt und zu `test_b:sdfd`; im normalen Text bleibt diese Form unberührt. Wörter mit Unterstrich vor der Zahl bleiben Wörter, z. B. `test_00` und `test_3`. Alleinstehende Superscripts werden als normaler Text zurückgeschrieben, z. B. `Nr ²` zu `Nr 2`.

Tagleisten:

```text
Text
| tag3 info#"das ist info"
| info2
| stress activityc emo3
```

werden zu einer Tagleiste am Ende:

```text
Text

| emo³ info² tag³, info:"das ist info", activitycˣ stressˣ
```

**Restore Add-on (Other, JSON → Felder)**

Die Restore-Funktionen sind das dritte Add-on/Utility im Stack und werden aus historischen Gründen in `core/restoreAtags.js` geführt.

- `restoreAtags()` für Einzel-, Auto- oder Gruppen-Restore aus einem JSON-Feld
- ohne `entryObj`, `currentEntry`, `entries`, `entryGroup` oder `group` arbeitet `restoreAtags()` auf dem aktuellen Eintrag
- direkte Zuordnungen per `map`, `fields` oder `mappings`, z. B. `"emo - Emotion"`
- Kategorie-Listen im JSON koennen direkt als aggregierte Parent-Werte wiederhergestellt werden, z. B. `{"help":["ActivityA"],"ActivityA":2}` mit `map: { help: "HelpScore" }` schreibt `2`
- Alias-Zeilen werden nicht als Restore-Feldzuordnung gelesen; Restore-Ziele laufen ueber `map`, `fields` oder `mappings`
- direkte Zuordnungen sind standardmaessig exklusiv; mit `additional: true` laeuft danach zusaetzlich der Suffix-Auto-Restore
- fuer Gruppen kann `restoreAtags()` `entries`, `entryGroup` oder `group` nehmen; Gruppen koennen ein Array oder ein Objekt mit `.entries()` sein
- Java-Listen wie `lib().entries()` werden fuer Gruppen automatisch entpackt (`length`, `size()/get()` oder `iterator()`)
- `currentEntry: entry()` oder `entryObj: entry()` verhaelt sich wie beim Sequence-Counter: ersetzt stale Library-Eintraege, ergaenzt fehlende aktuelle Eintraege und schreibt nur den aktuellen Eintrag
- bei Gruppen werden gemappte Felder vor dem Schreiben geleert; bei Einzel-Entry nur mit `clearMappedFields: true`
- mehrere Werte in einem JSON-Array, Memento/Rhino-listartigen Array oder Aggregat-Text wie `2 [3, 1]` oder `12 - [41, 6, 5, 4, 4]` werden standardmaessig per `valueMode: "avg"` gemittelt; bei gemischten Listen ignorieren `avg`, `median`, `min` und `max` nicht-numerische Zwischenwerte, waehrend `first` und `last` positionsbasiert bleiben
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
  map: {
    help: "HelpScore"
  },
  categoryRowAggregateMode: "max",
  categoryAggregateMode: "avg"
});

restoreAtags({
  sourceField: "Atag Json",
  entryObj: entry()
});

restoreAtags({
  sourceField: "Atag Json",
  entries: lib().entries(),
  entryObj: entry(),
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
- `cleanupTimeMarker({ mergeSameRows: true })` fuehrt gleiche Row-Marker zusammen, z. B. `19: hallo` + `19: das ist spannend` zu `19: hallo; das ist spannend`
- `clearTimeMarkerRows()` entfernt Row-Prefixe aus einem Feld oder setzt sie mit `mode: "reset"` auf den aktuellen Marker zurueck; Template-Inhalte werden dabei nicht interpretiert
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
  targetTextField: "Notiz",
  mergeSameRows: true
});

clearTimeMarkerRows({
  fields: ["Notiz"],
  mode: "remove"
});

clearTimeMarkerRows({
  fields: ["Notiz"],
  sourceMode: "hours",
  sourceHoursField: "Stunden",
  mode: "reset"
});
```

**Hour Guide (Other)**

Schreibt die Stundenhilfe passend zum Stundenwert als HTML in ein Rich-Text-Feld. Nach `maxHours` wird ein leerer Text geschrieben. Die Hilfe kann die eingebaute deutsche Vorgabe nutzen oder eine JSON-Vorgabe aus einem synchronisierten/shared Feld lesen.

```js
applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  maxHours: 16
});
```

Leere, `null`- oder `0`-Stundenwerte zeigen standardmaessig den ersten Planblock; fehlende Quellfelder loggen weiter und schreiben leer. Mit konkreter Entry-Eingabe kann der Hour Guide nach einer neuesten-Entry-Suche ausgefuehrt werden. `sourceEntry` darf vom Ziel-Entry abweichen.

```js
var newest = getNewestLibraryEntry();

applyHourGuide({
  entryObj: newest,
  sourceEntry: newest,
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide"
});
```

Shared-JSON-Beispiel. Das JSON enthält nur Inhalt und Struktur; Dreieckszeichen, Zwischenlinien und Zeilenstriche ergänzt der Renderer.

```js
applyHourGuide({
  sourceHoursField: "hours since dose",
  targetField: "Hour Guide",
  planField: "Hour Guide JSON"
});
```

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

Erstellt einen `mode=overwrite`-Link fuer Advanced URI im `overwriteMarkdownField`. Sobald ein vorhandener Obsidian-Link im `obsidianMarkdownField` erkannt wird, wird das Overwrite-Feld geleert. Beide Felder werden als Markdown geschrieben; die alten `...HtmlField`-Optionen bleiben als Alias kompatibel. Ein bestehender Obsidian-Link wird im Obsidian-Feld als reiner Markdown-Link ohne Prefix ausgegeben. Optional erzeugt `windowsOpenBase` zusaetzlich `Win:` mit ausgeschriebenem HTTP-/HTTPS-Redirect-Link. Wenn nur ein Feld existiert, nur `obsidianMarkdownField` gesetzt ist oder beide Felder gleich sind, laufen beide Rollen auf dieses eine Feld.

```js
makeObsidianMementoUri({
  contentField: "Text",
  overwriteMarkdownField: "Obsidian Overwrite Link",
  obsidianMarkdownField: "Obsidian Link",
  dateField: "Datum",
  mementoLinkField: "Memento Link",
  vault: "ExampleVault",
  formatOnly: false,
  open: true
});
```

Empfohlen fuer Windows Desktop und Android ist `open: true`: Das Addon schreibt weiterhin stabile Markdown-Links in die Felder und versucht zusaetzlich, den verbundenen oder neu erzeugten Obsidian-Link direkt per Script zu oeffnen. Auf Android nutzt es `intent("android.intent.action.VIEW")`; auf Windows Desktop werden Java `Desktop.browse()` und als Fallback `rundll32.exe url.dll,FileProtocolHandler` versucht. Wenn die Plattform das blockt, bleibt das Feld trotzdem geschrieben und `openResult` enthaelt den Fehlerstatus.

Wenn `open: true` einen neuen `mode=overwrite`-Link oeffnet, wird danach kein Overwrite-Link im Feld behalten. Das Overwrite-Feld wird geleert und das Obsidian-Feld auf `Link: EINFÜGEN` gesetzt. Dieser Marker ist die einzige Ausgabe mit `Link:`-Prefix und bedeutet: Obsidian wurde zum Erstellen/Oeffnen angestossen, der echte Obsidian-Link muss noch eingefuegt werden. Solange dieser Marker im Obsidian-Feld steht, erzeugt und oeffnet ein erneuter Script-Lauf keinen neuen Overwrite-Link.

Wenn nur `obsidianMarkdownField` gesetzt ist, erzeugt das Addon dort den Overwrite-Link und nutzt dasselbe Feld spaeter zum Anzeigen/Oeffnen eines eingefuegten Obsidian-Links. Scheitert `open: true`, bleibt der Markdown-Link im Feld sichtbar.

Für After-Entry-Workflows kann `formatOnly: true` genutzt werden. Dann formatiert das Addon nur einen bereits vorhandenen Obsidian-Link im Zielfeld, erzeugt keinen neuen `mode=overwrite`-Link und öffnet nichts. `createOverwriteLink: false` ist ein Alias für denselben Modus.

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
tag+
tag-
tag++
tag--
tag++2
tag--3
tag00
tag0
tag02
tag0,2
tag-02
tag-0,2
tag: 5
tag: "text"
tag:inhalt
tag:: inhalt
tag:_
tag:: _
inhalt(:tag)
"das ist ein Satz"(:Aussage)
'tag name'#
frage#'wer ist der coolste im land'
frage#"wer ist der coolste im land"

alias:
@@emo: Emotion
@@SymptomA (sa): SymptomA, SymAlias
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

Kumulative `+`/`-`-Tags wie `tag+`, `tag++`, `tag--` und `tag++2` werden in Row-Aggregationen immer addiert, auch wenn `rowAggregateMode: "avg"` gesetzt ist. Bei `tag++324` ist `324` der kumulative Wert; `tag++++` wird als Kurzform für `tag++4` gelesen. `tag00` ist ein leerer/null-Wert, `tag0` ist die Zahl 0, `tag02`/`tag0,2` sind 0,2. `test_00` und `test_3` werden nicht als Tagwert erkannt, weil die Zahl Teil des Wortes ist. `tag:_`, `tag::__` und `tag#__` gelten als Vorlagen und werden ignoriert; `tag:_inhalt_` wird als Stringwert gelesen.

**Alias-System**

```text
@@emo: Emotion
@@mood.: gut, -down
@@SymptomA (SA): sa, SymptomAlias1
@@@self (sf)
@@@help: ActivityA, ActivityB, ActivityC
@@@Vital::
@@SymptomA (SA): sa
tag1 (tg1)[self, help]: 3
tag2 (tg2)[self]: 3
```

- nur gültig im Tag-Kontext
- keine Ersetzung im Fließtext
- nur erlaubte Tagformen
- Basistags mit abschließendem Punkt sind erlaubt (z. B. `mood.`)
- inverse Aliase mit Präfix `-` kehren numerische Werte um (`down2` → `mood.-2`)
- Alias-Einträge dürfen feste Werte tragen (`SymptomAlias1` → `SymptomA+1`)
- Doppelte Aliasnamen behalten standardmaessig die letzte Definition; mit `multiAliasTargets: true` erzeugt ein Alias mehrere Ziel-Tags, z. B. `@@Pos: x` und `@@Neg: -x` machen aus `x2` `Pos+2` und `Neg-2`
- Kategorie-Aliase werden mit `@@@` definiert, z. B. `@@@self (sf)`
- `@@@help: ActivityA, ActivityB, ActivityC` setzt die rechte Seite direkt als Kategorie-Kinder, nicht als Aliase
- `@@@Vital::` sammelt die direkt folgenden Alias-Zeilen, solange die nächste Zeile mit `@@` beginnt; die Alias-Namen werden als feste Kategorie-Kinder genutzt
- Feste Kategorie-Kinder koennen mit `-` negiert werden, z. B. `@@@Body: -SymptomA`; Alias- und Kurznamen werden dabei auf den Langnamen aufgeloest
- Kategorien werden nur im Alias-Bereich mit `[...]` festgelegt
- Kategorie-Tags enthalten ihre Untertags als Liste, z. B. `self` enthält `tag1, tag2`
- normale Tags behalten ihre Kategorien in `cats`, z. B. `tag1` hat `self, help`

Negierte Kategorie-Kinder bleiben normale Tags, werden aber innerhalb der Kategorie mit umgekehrtem Vorzeichen gerechnet und in Kategorie-Anzeigen mit tiefgestelltem Minus vor dem Namen markiert:

```text
@@SymptomA (SA): sa
@@@Body: -SymptomA, BodySafe
sa² BodySafe1
```

```text
Body -2
├── ₋SymptomA -2
└── BodySafe 1
```

Aus dem Beispiel entsteht fuer `tree_md`:

```text
help
├── ActivityC
├── ActivityB
├── ActivityA
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
- ` - ` direkt vor `[Liste]` in Markdown-Ausgaben
- Links klickbar
- Sortierung:
  1. links / tel / mail
  2. numbers
  3. text
  4. tags

Beispiele:

- Einzelwert: `emo: 1,0`
- Mehrfach: `emo: 2,0 - [3,0, 1,0]`

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
- `stringAggregateMode` / `textAggregateMode`: `"join"` (Standard), `"first"` oder `"last"` fuer mehrfach vorkommende Textwerte
- `stringJoinSeparator`: Standard `", "`
- `categoryAggregateMode` / `categoryValueMode`
- `categoryRowAggregateMode` / `categoryChildAggregateMode`
- `categoryAggregateDecimals`
- `row_display_values` / `rowDisplayValues`: `"none"`, `"count"` oder `"all"`
- `cat_display_values` / `categoryDisplayValues`: `"none"`, `"count"`, `"names"` oder `"all"`
- `shortenTableHeaders` (`0` = Standard, 10 Zeichen + `.`)
- `tableHeaderNames`: `"short"` (Standard, Alias-Kuerzel), `"long"` oder `"both"`
- `markdownLabelNames`: `"long"` (Standard), `"short"` oder `"both"` fuer normale Markdown-Ausgaben
- `markdownGroupSeparator`: `""` (Standard) trennt bei mehr als 5 Markdown-Zeilen Link/Mail/Tel, Zahlen und Text/List mit einer echten Leerzeile; eigener String ist moeglich, `null` deaktiviert das
- `markdownGroupSeparators: false` bleibt als kompatibler Alias zum Deaktivieren erhalten
- `includeBlankTags: true` gibt nackte Tags ohne Wert im `text`- und `md`-Export mit aus; Standard ist `false`
- `treeShowValues: false` blendet Werte im `tree_md` aus
- `categoryFilter: ["help", "home"]` filtert alle Exporttypen per OR auf eine oder mehrere Kategorien; `catFilter` ist ein Kurzalias

Mehrfach vorkommende Textwerte werden in `text`, `md`, `tree_md` und `json` standardmaessig per `join` zusammengefuehrt, z. B. `prot: Bechler` + `prot: Enda` zu `prot: Bechler, Enda`. Wenn `rowAggregateMode` oder `stringAggregateMode` auf `first` oder `last` steht, gilt diese Auswahl auch fuer Textwerte.

Kategorie-Parents zeigen standardmaessig den Mittelwert ihrer numerischen Unterpunkte. Dabei wird zuerst je Unterpunkt aggregiert, fuer Kategorien standardmaessig mit `max`, danach werden diese Unterpunkt-Ergebnisse im Parent standardmaessig mit `avg` aggregiert. Im `tree_md` ist der Parent-Standard `max_abs`, damit negierte Kategorie-Kinder nach Betrag gewertet werden und ihr Vorzeichen behalten. Vor Detailangaben mit Namen oder Einzelwerten steht ` - `, z. B. `kaufen: 22,2 - [pc, garten]`; bei `cat_display_values: "all"` werden negierte Kinder als `₋SymptomA: -2` angezeigt. Die kurze Count-Form bleibt ohne Strich, z. B. `SymptomA 1,7 [3]`. Im `tree_md` steht am Parent standardmaessig nur der Wert, weil die Unterpunkte direkt darunter sichtbar sind. Unterpunkte im `tree_md` nutzen dieselbe Wert-Zusammenfassung wie `md`; mehrfach vorkommende Row-Werte werden im Tree standardmaessig gekuerzt als Anzahl angezeigt, waehrend `md`/`text` standardmaessig alle Einzelwerte zeigen. Tree-Defaults sind `cat_display_values: "none"` und `row_display_values: "count"`; fuer andere Exporte gelten `cat_display_values: "names"` und `row_display_values: "all"`. `rowAggregateMode` fuer Tabellen bleibt standardmaessig `avg`; `categoryRowAggregateMode`/`categoryChildAggregateMode` und `categoryAggregateMode`/`categoryValueMode` koennen `min`, `max`, `max_abs`, `min_abs`, `add`, `sum`, `avg`, `median`, `first`, `last` oder `amount` nutzen.

## Aktuelle Funktionsaufrufe

Ausführliche Beispiele liegen hier in der README, nicht in den Script-Kopfkommentaren. Die Script-Kommentare bleiben kurz, damit der Memento-Java-Editor nicht am Syntax-Highlighting hängen bleibt.

**Basis-Export in Tags**

`applyTags()` gehoert zu `core/helpers.js`. In Memento muss diese Datei nach `helpers_lib`, `collectAtags_lib` und `exportAtags_lib` geladen sein.

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






