# Changelog

## Format

- Datum im Format `YYYY-MM-DD`
- Pro Arbeitsschritt kurze Stichpunkte
- Datei/Modul und Versionssprung nennen
- Wirkung dokumentieren, nicht nur `Fix` oder `Update`
- Test/Doku erwähnen, wenn ergänzt

## Vorlage

```md
## 2026-04-22
- `collectAtags` auf `v1.22` angehoben
- Fix: ...
- Test/Doku: ...
```

## 2026-05-01

- Systemversion auf `sys 2.21` angehoben
- Header aller Module und `ATAG_SYS_VERSION` auf `2.21` aktualisiert
- `exportAtags` auf `v1.68` angehoben
- `Atag Helpers` auf `v2.03` angehoben
- Feature: `computeAggregate` unterstuetzt `min`, `max`, `add`/`sum`, `avg`, `median`, `first`, `last` und `amount`
- Feature: Kategorie-Parents zeigen in `text`, `md` und `tree_md` standardmaessig den Mittelwert numerischer Unterpunkte; zuvor wird je Unterpunkt per `categoryRowAggregateMode`/`categoryChildAggregateMode` aggregiert, Standard fuer Kategorien ist `max`
- Feature: `categoryAggregateMode`/`categoryValueMode` und `categoryAggregateDecimals` steuern die Parent-Aggregation
- Aenderung: `tree_md` zeigt Kategorie-Parents standardmaessig ausgeschrieben und ohne zusaetzliche Kinderliste in eckigen Klammern
- Aenderung: `tree_md` nutzt fuer Unterpunktwerte dieselbe Aggregat-Zusammenfassung wie `md`, inklusive Einzelwertliste bei mehrfachen Row-Werten
- Feature: `row_display_values`/`rowDisplayValues` steuert Einzelwertanzeige mit `none`, `count`, `all`; Tree-Standard ist `count`, andere Exporte behalten `all`
- Feature: `cat_display_values`/`categoryDisplayValues` steuert Kategorie-Kinderinfo mit `none`, `count`, `names`, `all`; Tree-Standard ist `none`, andere Exporte behalten `names`
- `Addon Tag Cleaner` auf `v1.21` angehoben
- Feature: Tag Cleaner normalisiert die neuen Issue-#38-Formen wie `tag+`, `tag--`, `tag++2`, `tag00`, `tag02` und `tag-0,2` in die vereinfachte Superscript-Schreibweise
- Aenderung: Tag Cleaner uebernimmt Template-Werte `tag:_` und `tag:: _` nicht in die Tagleiste
- Fix: Kurzwerte werden nicht mehr aus Woertern mit Unterstrich vor der Zahl herausgelesen, z. B. `test_00` oder `test_3`
- Aenderung: Alleinstehende Superscripts werden im Tag Cleaner wieder als normaler Text geschrieben, z. B. `Nr ²` zu `Nr 2`
- Aenderung: Kumulative Werte mit Suffix nutzen den Zahlenanteil als Wert, z. B. `tag++324` bzw. `tag⁺⁺³²⁴` als kumulativ `324`; lange Laeufe wie `tag++++` gelten als Kurzform fuer `tag++4`
- Aenderung: Tag Cleaner erhaelt `tag:: Inhalt` mit doppeltem Doppelpunkt und normalisiert `tag::Inhalt` zu `tag:: Inhalt`
- Test/Doku: In der Tagleiste wird `test_b: sdfd` als Stringwert zu `test_b:sdfd`; im normalen Text bleibt diese Form unveraendert
- `collectAtags` auf `v1.42` angehoben
- Feature: `tag+`, `tag-`, `tag++`, `tag--`, `tag++2` und `tag--3` werden als kumulative Plus-/Minuswerte gelesen
- Feature: `tag00` wird als leerer/null-Wert gelesen; `tag0`, `tag02`, `tag0,2`, `tag-02` und `tag-0,2` werden als numerische Null- bzw. Nullkommawerte gelesen
- Feature: `tag:_` und `tag:: _` werden als Vorlagen erkannt und nicht als Atags ausgegeben
- `exportAtags` auf `v1.64` angehoben
- Aenderung: Kumulative Row-Werte werden in Markdown-/HTML-Row-Aggregationen addiert, auch wenn der Export sonst `rowAggregateMode: "avg"` nutzt
- Test/Doku: Parser- und Export-Regressionen fuer Issue #38 sowie README-Syntax ergaenzt
- `collectAtags` auf `v1.41` angehoben
- Feature: Alias-Klammern `[...]` definieren Kategorien ausschliesslich im Alias-Bereich; normale Tags uebernehmen diese Kategorien in `cats`
- Feature: Kategorie-Aliase koennen per `@@@self (sf)` definiert werden und erzeugen keinen normalen Tag-Alias
- Feature: Kategorie-Aliase koennen per `@@@help: Spielen, Musik, Laufen` feste Kinderlisten definieren; diese Namen werden nicht als Aliase aufgeloest
- Feature: Kategorie-Tags werden automatisch als Listen ihrer Untertags erzeugt, z. B. `self` -> `tag1, tag2`
- Aenderung: Kategorie-Listen werden in Text/Markdown mit Leerzeichen nach Kommas ausgegeben, z. B. `help: Spielen, Hausarbeit`
- `Atag Helpers` auf `v2.02` angehoben
- Aenderung: Kategorie-Tags bilden beim Markdown-Sortieren eine eigene Gruppe nach Listen und vor Blank-Tags
- Aenderung: Kategorie-Tags behalten ihre Kinderlisten auch im JSON-Export als Array
- `exportAtags` auf `v1.62` angehoben
- Feature: neuer Exporttyp `tree_md` schreibt kategorisierte Tags standardmaessig als Unicode-Baum mit Kinderwerten und laesst uncategorized Tags sowie leere Kategorien standardmaessig weg; `treeStyle: "ascii"` bleibt als Fallback
- Feature: `categoryFilter`/`catFilter` filtert alle Exporttypen per OR auf eine oder mehrere Kategorien
- Aenderung: `targetFieldType: "tags"` schreibt Kategorie-Tags nur noch ins Memento-Tagfeld, wenn sie Kinder haben; normale Tags mit Unterstrich bleiben erhalten
- Aenderung: `targetFieldType: "tags"` schreibt Leerzeichen als Unterstriche, damit auch Alias-Namen tag-kompatibel bleiben
- Aenderung: Kategorie-Tags werden im Memento-Tagfeld mit `@`-Praefix markiert, z. B. `@help`
- Fix: `exportAtags`-Kopfkommentar wieder kurz und ASCII-only, damit Mementos Script-Parser nicht an Kommentar-Beispielen haengen bleibt
- `restoreAtags` auf `v2.01` angehoben
- Aenderung: Alias-Klammern werden nicht mehr als Restore-Feldzuordnung gelesen; Restore-Ziele laufen weiter ueber `map`, `fields` oder `mappings`
- Systemversion auf `sys 2.20` angehoben
- Struktur: Modulheader tragen jetzt stabile Kennungen (`A` Core, `B` Addons, `C` fuer geloeste generelle Module)
- Nummerierung: Core `A1`-`A4`; Addons `B1`-`B9`; geloeste generelle Module `C1`-`C3`
- Struktur: `multiChoiceHelpers.js` und `typedTextFields.js` nach `addons/z_generell/` verschoben und als `C1`/`C2` nummeriert
- Aenderung: `addons/z_others/hourGuide.js` als generelles Modul `C3` nummeriert
- Doku/Tooling: README, CONTRIBUTING und `check_versioning.ps1` pruefen und beschreiben die neue Headerform
- `Shared Script: Time Marker` auf `v1.31` angehoben
- Feature: Time Marker behandelt `:` am Zeilenanfang als Platzhalter; `: Text` wird zum aktuellen Marker, leere `:`-Zeilen werden entfernt
- Feature: `appendTimeMarker()` gibt wie Cleanup `true` zurueck, wenn danach Markerzeilen vorhanden sind, sonst `false`
- Feature: `cleanupTimeMarker()` ersetzt `: Text` wie `appendTimeMarker()`, erzeugt aber keinen neuen leeren Marker
- Feature: `cleanupTimeMarker()` gibt `true` zurueck, wenn nach dem Cleanup Markerzeilen vorhanden sind, sonst `false`
- Fix: Cleanup sortiert Zeitmarker-Rows als Block ueber normalen Text und behandelt `text:: inhalt` nicht als Row
- Fix: `: Text` wird auch im Cleanup nach den bestehenden Source-Regeln gefuellt und danach in den Row-Block einsortiert
- Fix: Time Marker schreibt ersetzte `: Text`-Platzhalter sofort zurueck und setzt dabei keine zusaetzliche neue Markerzeile
- Fix: Time Marker akzeptiert `textField` als Alias fuer `targetTextField`, damit Cleanup-Aufrufe wie andere Text-Addons schreiben
- Fix: Cleanup entfernt keine Leerzeilen innerhalb von normalem Fliesstext mehr; bereinigt werden nur Marker-Grenzen, Marker-Zwischenraeume sowie fuehrende/abschliessende Leerzeilen
- Test/Doku: Regressionen fuer Doppelpunkt-Platzhalter, leere Marker wie `3: `, CR-Zeilenumbrueche und AfterEntry-Cleanup ergaenzt; Marker-Beispiele in README und Script-Kopf geklaert
- `Addon Multi Choice Helpers` auf `v1.01` ergaenzt
- Feature: `multiChoiceAppend()` und `multiChoiceRemove()` aus Issue #31 als Workflow-Addon integriert
- Fix: Multi-Choice-Feldwerte aus Memento werden als listenartige Werte entpackt, damit Freitext nicht als `[freiwort]` neu angehaengt wird
- Test/Doku: Multi-Choice-Helfer mit Append-/Remove-Regressionen, README-Eintrag und Versioning-Check ergaenzt
- Doku: aktuelle Entry-Trigger mit parse-relevanter Reihenfolge in `ENTRY_WORKFLOWS.md` dokumentiert
- `Addon Obsidian Linker` auf `v1.01` angehoben
- Fix: `overwriteHtmlField` schreibt den vollen Erstellen-/Overwrite-Link, `obsidianHtmlField` formatiert nur vorhandene Obsidian-Links; bei einem gemeinsamen Feld laufen beide Rollen auf dieses Feld
- `Addon Obsidian Linker` auf `v1.02` angehoben
- Fix: Bestehende Obsidian-Links leeren das Overwrite-Feld und werden mit `Link verbunden:` im Obsidian-Feld ausgegeben
- Test/Doku: Regression fuer Issue #33 und README-Verhalten ergaenzt
- `Addon Obsidian Linker` auf `v1.03` angehoben
- Feature: Verbundene Obsidian-Links zeigen zusaetzlich einen `Win:`-HTTP-Helper-Link fuer Windows-Klicks
- Test/Doku: Regression fuer Default- und Template-Windows-Link ergaenzt
- `Addon Obsidian Linker` auf `v1.04` angehoben
- Aenderung: Verbundene Linkfelder enthalten nur noch `Link:` und `Win:` mit ausgeschriebenem, verlinktem URL-Text
- `Addon Obsidian Linker` auf `v1.05` angehoben
- Aenderung: `Win:` wird nur noch erzeugt, wenn `windowsOpenBase` explizit gesetzt ist; lokaler `127.0.0.1`-Default entfernt
- `Addon Obsidian Linker` auf `v1.06` angehoben
- Testweise Aenderung: Verbundene Obsidian-Links werden als Markdown-Link statt HTML-Link ausgegeben
- `Addon Obsidian Linker` auf `v1.07` angehoben
- Aenderung: Overwrite- und Obsidian-Felder schreiben Markdown-Links; `overwriteMarkdownField` und `obsidianMarkdownField` als neue bevorzugte Optionsnamen ergaenzt
- `Addon Obsidian Linker` auf `v1.08` angehoben
- Feature: `open: true` versucht den verbundenen oder neu erzeugten Obsidian-URI per Android-Intent bzw. Java Desktop direkt zu oeffnen
- `Addon Obsidian Linker` auf `v1.09` angehoben
- Fix: Windows-Open probiert nach Java `Desktop.browse()` zusaetzlich `rundll32.exe url.dll,FileProtocolHandler` ueber Java-Interop
- `Addon Obsidian Linker` auf `v1.10` angehoben
- Fix: Markdown-Links werden beim erneuten Lauf stabil erkannt und nicht mehr ineinander verschachtelt
- `Addon Obsidian Linker` auf `v1.11` angehoben
- Aenderung: Nach `open: true` fuer einen neuen Overwrite-Link wird das Overwrite-Feld geleert und das Obsidian-Feld mit `Link: EINFÜGEN` als Wartezustand markiert
- Fix: `Link: EINFÜGEN` loest bei weiteren Laeufen kein erneutes Overwrite/Oeffnen aus
- `Addon Obsidian Linker` auf `v1.12` angehoben
- Aenderung: Wenn nur `obsidianMarkdownField` konfiguriert ist, wird nie ein Overwrite-Link erzeugt oder geoeffnet
- `Addon Obsidian Linker` auf `v1.13` angehoben
- Aenderung: Bestehende Obsidian-Links werden im Obsidian-Feld ohne `Link:`-Prefix als reine Markdown-Links geschrieben; `Link: EINFÜGEN` bleibt nur fuer den Wartezustand
- Doku: Getesteten Obsidian-Linker-Workflow mit Markdown-Feldern und `open: true` als empfohlene Windows-/Android-Konfiguration dokumentiert
- `Addon Typed Text Fields` auf `v1.00` ergaenzt
- Feature: `syncTypedTextFields()` integriert, um Felder mit `(t-dd)`, `(t-d)`, `(t-i)`, `(t-r)`, `(t-tag)` und `(t-l)` in passende Zielfelder zu konvertieren
- Test/Doku: WSH-Regressionen fuer Einzelentry, Bulk, Optionen und Konvertierungen sowie README- und Versioning-Eintraege ergaenzt
- `exportAtags` auf `v1.54` und `Atag Helpers` auf `v1.17` angehoben
- Aenderung: Markdown-Exports nutzen Langnamen als Standard; Row-Tabellen behalten Alias-Kuerzel als Standard-Header und koennen per `tableHeaderNames: "long"` Langnamen nutzen
- Feature: Normale Markdown-Exports trennen bei mehr als 5 Zeilen die grossen Kategorien Link/Mail/Tel, Zahlen und Text/List standardmaessig mit einer Leerzeile; per `markdownGroupSeparator` anpassbar und per `null` abschaltbar
- Fix: Markdown-Kategorietrenner zaehlen die urspruenglichen Tags, damit sie auch nach Row-Aggregation erhalten bleiben
- Fix: Markdown-Leerzeilen werden bei Gruppenwechseln explizit als echte Leerzeile gerendert, nicht mehr als leeres Separator-Element im Zeilen-Join
- Fix: Der Standard-Gruppentrenner bleibt auch aktiv, wenn `applyTags()` `markdownGroupSeparator` ohne Wert als `undefined` weiterreicht
- Aenderung: Text- und Markdown-Exports lassen Blank-Tags ohne Wert standardmaessig weg; `includeBlankTags: true` stellt das bisherige Verhalten wieder her
- Doku: `markdownGroupSeparator: ""` und `includeBlankTags: false` in den `applyTags()`-Markdown-Beispielen der README, Workflow-Doku und `exportAtags`-Kopfbeispiele explizit aufgenommen
- `Atag Helpers` auf `v2.00` angehoben
- Aenderung: JSON-Value-Maps behalten wiederholte Tag-Werte als Arrays, damit `restoreAtags` sie per `valueMode` aggregieren kann
- Test: JSON-Export-Regression fuer wiederholte Werte als Arrays ergaenzt
- `collectAtags` auf `v1.37` angehoben
- Feature: Tag-Syntax `tag:inhalt`, `tag:: inhalt`, `inhalt(:tag)` und `"das ist ein Satz"(:Aussage)` aus Issues #21/#22 integriert
- Fix: Normale Textstellen wie `text: inhalt` werden nicht mehr als Colon-Tag geparst
- Test/Doku: fokussierte Parser-Regressionen und README-Syntax ergaenzt
- `restoreAtags` auf `v2.00` angehoben
- Feature: Direkte Tag-Feld-Zuordnungen per `map`/`fields`/`mappings`, exklusiv per Default oder zusaetzlich mit `additional: true`
- Feature: Alias-Zeilen koennen Restore-Felder sammeln, z. B. `@@Kopfschmerz (KSch)[Kopf Feld]: ks`
- Feature: `restoreAtags()` verarbeitet jetzt wahlweise den aktuellen Eintrag, `entryObj` oder eine Gruppe per `entries`/`entryGroup`/`group`; `bulkRestoreAtags()` bleibt nur als Kompatibilitaets-Wrapper
- Feature: Gruppen koennen Arrays oder Objekte mit `.entries()` sein; gemappte Felder werden bei Gruppen vor dem Restore geleert
- Feature: mehrere JSON-Werte und Aggregat-Texte wie `2 [3, 1]` werden per `valueMode` verdichtet; Standard ist `avg`, moeglich sind `avg`, `first`, `last`, `median`, `min` und `max`
- Aenderung: Auto-Restore nutzt `_` als Standard-Suffix und `_l` als Standard-Listensuffix; `suffix: ""` ist als direktes gleichnamiges Ziel erlaubt
- Fix: Auto-Restore prueft Zielnamen gegen `lib().fields()` bzw. `targetFields` und ueberspringt fehlende Zielfelder vor dem Schreiben, statt Memento-Java-Fehler auszuloesen
- Fix: Gruppenwerte wie `lib().entries()` werden wie in `typedTextFields` als Java-/Listen-Collection per `length`, `size()/get()` oder `iterator()` entpackt, statt als einzelner Entry behandelt zu werden
- Fix: Rueckgabewerte von `.entries()` und direkte Iterator-Objekte werden ebenfalls entpackt, damit Bulk-Durchlaeufe nicht still ohne Eintraege enden
- Fix: `cfg.entries` wird wie beim Sequence-Counter direkt als Entry-Liste genutzt; `.entries()` wird nur noch bei `entryGroup`/`group`-Objekten aufgerufen
- Feature: `currentEntry` folgt dem Sequence-Counter-Muster und ersetzt/ergaenzt den aktuellen Eintrag in `entries`, schreibt dann aber nur diesen aktuellen Eintrag
- Feature: `debugField` schreibt optionale Restore-Diagnose in ein Textfeld
- Feature: `debugLog: true` bzw. `logDebug: true` spiegelt Restore-Diagnose zusaetzlich nach `log()`
- Fix: `debugLog` ruft `log()` direkt auf, statt Memento-Host-Funktionen per `typeof ... === "function"` zu filtern
- Test/Doku: `tests/test_restoreAtags.js` mit Mapping-, Alias-, Gruppen- und ValueMode-Regressionen sowie README-Beispiele ergaenzt
- `Addon Floating Average` auf `v1.00` ergaenzt
- Feature: `updateAverage()` aus Issue #28 als Workflow-Addon integriert
- Verifikation/Doku: Syntax- und Versioning-Check; kein eigener Test wegen ueberschaubarer Addon-Logik
- `exportAtags` auf `v1.42` angehoben
- `Atag Helpers` auf `v1.14` angehoben
- Fix: Markdown-Export sortiert Row-Aggregate gemeinsam mit normalen Werten, behält die Werte in `[]` aber in Row-Reihenfolge
- Fix: Markdown-Export nutzt Alias-/Displaynamen als Label
- Test: Regression fuer Row-Aggregate vor Text/Blank und Alias-Label im Markdown-Export ergaenzt
- `Atag Helpers` auf `v1.13` angehoben
- Feature: Markdown-Export sortiert nach Typgruppen Link, Mail, Tel, Integer, Real, Text, List, Blank und innerhalb der Gruppen alphabetisch
- Test: Export-Regression fuer Issue #19 mit Tel-, Real- und List-Werten ergaenzt
- `Addon Sequence Counter` auf `v1.03` angehoben
- Fix: Im `currentEntry`-Modus ersetzt der aktuelle Eintrag eine gleichnamige/gleich-ID Library-Version im Berechnungsset, damit `AfterEntry()` nicht mit stale `lib().entries()` rechnet
- Test: Regression fuer `AfterEntry()`-nahen Fall mit altem Library-Eintrag und aktuellem Entry ergaenzt
- `Addon Sequence Counter` auf `v1.02` angehoben
- Fix: Wenn `currentEntry` nicht in `entries` enthalten ist, wird er fuer die Berechnung ergaenzt und fuehrt die letzte passende Sequenz fort
- Test: Regression fuer fortgefuehrte Sequenz bei separat uebergebenem `currentEntry` ergaenzt
- `Addon Sequence Counter` auf `v1.01` angehoben
- Fix: `currentEntry`-Abgleich unterstuetzt Entry-IDs als Funktion, damit Einzel-Entry-Aufrufe wie in Issue #25 sicher geschrieben werden
- Test: Regression fuer Issue #25 ohne `fieldSequenceMax` ergaenzt
- `Addon Wiki Linker` auf `v1.00` ergaenzt
- Feature: `applyWikiLinker()` aus Issue #27 als Integration-Addon integriert
- Struktur: Workflow-Addons nach `addons/3_workflow/`, externe Integrationen nach `addons/6_integration/`
- Verifikation: Wiki Linker per Syntaxcheck geprueft; kein eigener Test wegen sehr kleiner, linearer Link-Helper-Logik
- `Addon Sequence Counter` auf `v1.00` ergaenzt
- Feature: `updateSequenceSpree()` aus Issue #26 als Workflow-Addon integriert
- Test/Doku: fokussierter WSH-Test fuer Bulk, `currentEntry` und leere Gruppenfelder ergaenzt
- `collectAtags` auf `v1.36` angehoben
- Fix: Alias-Deklarationszeilen mit `@@` werden nur noch fuer die Alias-Map genutzt und nicht mehr regulaer als Tags geparst
- Fix: Readable-/Tagbar-Zeilen lesen bare Tags wie `|| Kopfdruck` selbst, statt indirekt von Alias-Zeilen abzuhängen
- Test: Regression fuer Issue #18 ergaenzt
- `Addon Sync Last From Latest` auf `v1.01` ergaenzt
- `Addon Hour Guide` auf `v1.00` ergaenzt
- `Addon Obsidian Linker` auf `v1.00` ergaenzt
- Feature: Addons aus GitHub-Issues #17, #20 und #23 in aktive Moduldateien uebernommen
- Aenderung: Addon-Liste in Tagging, Syncing und Other Add-ons gegliedert
- Struktur: Addon-Dateien in `addons/1_tagging/`, `addons/2_syncing/` und `addons/z_others/` sortiert
- Aenderung: Issue #20 als englisches `Hour Guide` Add-on mit `applyHourGuide()`/`makeHourGuideHtml()` integriert
- Fix: Sync Last From Latest liest ISO-artige Datumsstrings auch im Windows Script Host
- Feature: Obsidian Linker unterstuetzt getrennte Felder fuer Overwrite-Link und Obsidian-Link gemaess Issue #24
- Test/Doku: neue Addon-Tests, README-Eintraege und Versioning-Liste ergaenzt

## 2026-04-25

- Doku: Pflegehinweis ergänzt, dass Modul-Kopfblöcke wegen des Memento-Java-Editors kurz bleiben und vorsichtig mit Quotes, Backticks, langen `Änderungen`-Listen und Sonderzeichen umgehen sollen

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.20` angehoben
- Änderung: Cleaner gibt Tagleisten mit einfachem `|` aus; vorhandene `||`-Leisten bleiben beim Einlesen kompatibel
- Test/Doku: Cleaner-Erwartungen und Beispiele auf einfache `|`-Ausgabe umgestellt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.19` angehoben
- Feature: `tagBarSpacing: "double"` setzt zwei Leerzeilen Abstand zwischen Tagleiste und Inhalt
- Test/Doku: Double-Spacing oben und unten ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.18` angehoben
- Feature: `tagBarPosition: "auto"` schiebt die Tagleiste nach oben, sobald Zeitstempel-Zeilen wie `0:` oder `2,5:` vorhanden sind
- Test/Doku: Auto-Position für Zeitstempel-Felder ergänzt

## 2026-04-25

- Systemversion auf `sys 2.11` angehoben
- Header aller Module und `ATAG_SYS_VERSION` auf `2.11` aktualisiert
- Doku: README und CONTRIBUTING auf `sys 2.11` angepasst

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.17` angehoben
- `collectAtags` auf `v1.35` angehoben
- Änderung: einfacher Cleaner-Tag-Suffix wechselt von `ᵗ` auf `ˣ`, z. B. `essen# -> essenˣ`
- Test: Cleaner- und Parser-Regressionen auf `tagˣ` umgestellt

## 2026-04-25

- `Atag Helpers` auf `v1.12` angehoben
- Fix: `enabled` und `collectResults` akzeptieren jetzt Memento-freundlich `0`/`1` sowie weiterhin `false`/`true`
- Doku/Test: Beispiele auf `enabled: 1` umgestellt und Disabled-Test mit `enabled: 0` geprüft

## 2026-04-25

- `Atag Helpers` auf `v1.11` angehoben
- Fix: `applyTags({ enabled: false })` gibt jetzt `null` zurück statt `{ items: [] }`, damit Funktionsfelder keinen Objekt-Rückgabewert auswerten müssen
- Test: Disabled-Wrapper-Erwartung angepasst

## 2026-04-25

- `collectAtags` auf `v1.34` angehoben
- Feature: Cleaner-Suffix `ᵗ` wird als leerer expliziter Tag gelesen, auch in `||`-Tagleisten
- Test: Parser-Regressionen für `tagᵗ` in Text und Tagleiste ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.16` angehoben
- Fix: doppelter `bulkApplyTagCleaner`-Beispielblock im Header entfernt, um Quote-/Editor-Probleme zu vermeiden
- Änderung: `essen#` und `#essen` werden im Cleaner in Text und Tagleiste zu `essenᵗ` normalisiert und bleiben parserfähig
- Fix: `##tag` und `tag##` werden nur entfernt und in Tagfelder geschrieben, wenn `tagFields`/`userTagFields` angegeben sind
- Test: Regressionen für `essenᵗ` und Double-Hash ohne Tagfelder ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.15` angehoben
- Fix: Kopfkommentar stark gekürzt und auf editor-sichere ASCII-Notes umgestellt, damit der Memento-Java-Editor nicht am `Änderungen`-Block hängen bleibt
- Wirkung: Funktionslogik unverändert; ausführliche Nutzung bleibt in `README.md` und `CHANGELOG.md`

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.14` angehoben
- Fix: numerische `tag:10`-/`geld:+20,3`-Tokens in Tagleisten werden als Werte statt String-Tags behandelt
- Feature: `##tag` und `tag##` werden aus Notiz/Tagleiste entfernt und optional in mehrere `tagFields` geschrieben
- Änderung: Leerzeilen vor und nach dem Inhalt werden nach dem Verschieben der Tagleiste entfernt
- Doku: Bulk-Aufruf und `tagFields`-Option für den Cleaner ergänzt
- Test: Regressionen für numerische Colon-Werte, einfache Hash-Tags, Double-Hash-User-Tags und Trimming ergänzt

## 2026-04-25

- Nachtrag: `Atag Helpers v1.10` war im Modul vorhanden, aber im Changelog noch nicht dokumentiert
- Wirkung: Versionskonflikt dokumentiert; Helper-Code selbst bleibt unverändert

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.13` angehoben
- Änderung: String- und Funktions-Tags in Tagleisten werden kompakt als `tag:wert` ohne Leerzeichen nach `:` ausgegeben
- Test/Doku: Erwartungswerte und Beschreibung für kompakte Tagleisten-Werte angepasst

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.12` angehoben
- Fix: Kommata nach Zahlenwerten werden als Trenner gelesen, ohne Dezimalkommas wie `-0,5` zu zerlegen
- Test: Regressionen für `Stress3,` und `Stress-0,5,` ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.11` angehoben
- Fix: überzählige Kommata am Ende unquoted String-Werte werden entfernt und wachsen bei rekursiver Anwendung nicht weiter
- Test: Regression für `zeta:einwort,,,` und quoted String-Werte mit Komma ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.10` angehoben
- Änderung: Tagleisten-Gruppen werden mit `, ` getrennt, innerhalb einer Gruppe bleibt die Trennung per Leerzeichen
- Test/Doku: Regression und Beschreibung für Gruppentrennung ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.09` angehoben
- Änderung: Funktions-Tag `fv` wird immer ans Ende der Tagleiste sortiert und ohne unnötige Quotes ausgegeben
- Änderung: String-Werte entfernen Quotes bei Einzelworten, behalten sie aber bei mehrteiligen Werten
- Test/Doku: Regression für Funktions-Tag-Sortierung und Quote-Normalisierung ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.08` angehoben
- Feature: `formatValues` nutzt die neuen Werte `"keep"`, `"min"`, `"max"` und `"none"`; alte `positiveSignMode`-Werte bleiben als Aliase lesbar
- Feature: `fv: "..."` in einer Tagleiste setzt die Werteformatierung pro Notiz, z. B. `|| fv: "min"`
- Änderung: Tagleisten werden als Werttags, String-Werte und leere Tags sortiert; String-Werte werden als `tag: wert` normalisiert
- Test/Doku: Beispiele und Regressionen für `fv`, die neuen Formatter-Werte und Tagleisten-Sortierung ergänzt

## 2026-04-25

- `Shared Script: Time Marker` auf `v1.26` angehoben
- Fix: Cleanup leerer TimeMarker und Leerzeilen läuft auch dann, wenn `maxHours` das Einfügen eines neuen Markers verhindert
- Test: Regression für Max-Hours-Abbruch mit bereinigtem Zeitblock ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.07` angehoben
- Fix: Tagleisten-Tokens nutzen `positiveSignMode: "preserve"` als Standard statt implizit `always`
- Doku: Header-Beispiele auf `positiveSignMode: "preserve"` korrigiert
- Test: schlanke Regression für `tagBarPosition: "top"` ohne expliziten `positiveSignMode` ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.06` angehoben
- `Shared Script: Time Marker` auf `v1.25` angehoben
- Fix: `preserve` normalisiert normale Pluszeichen vor Hochzahlen, z. B. `Stress+³ -> Stress⁺³`
- Fix: TimeMarker schreibt bereinigte Leerzeilen auch zurück, wenn wegen gleicher/späterer Zeit kein neuer Marker gesetzt wird
- Test: Regressionen für `Stress+³` und vorhandenen gleichen Timestamp mit Leerzeile ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.03` angehoben
- `Shared Script: Time Marker` auf `v1.24` angehoben
- Fix: Tagleiste oben mit `tagBarSpacing: "none"` entfernt alte führende Leerzeilen
- Feature: `positiveSignMode` steuert positive Vorzeichen: `"preserve"` (Standard), `"minimal"` oder `"always"`
- Fix: TimeMarker bereinigt Leerzeilen, die nach Entfernen leerer Marker zwischen Zeitmarkern oder vor der belegten Textzeile stehen
- Test: Regressionen für rekursive Top-Tagleiste, TimeMarker-Leerzeilen und positive Vorzeichen-Modi ergänzt

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.02` angehoben
- Feature: Tagleiste kann über `tagBarPosition: "top"|"bottom"` oben oder unten ausgegeben werden
- Feature: Leerzeilen-Abstand kann über `tagBarSpacing: "blank"|"none"` gesteuert werden
- Änderung: Positive Zahlenwerte werden im Cleaner ohne Pluszeichen hochgestellt, z. B. `emo2 -> emo²`
- Test/Doku: Cleaner-Optionen und Pluszeichen-Regel ergänzt

## 2026-04-25

- `collectAtags` auf `v1.33` angehoben
- Feature: Alias-Einträge können feste Werte tragen, z. B. `@@Kopfschmerz (KSch): ks, Kopfdruck1`
- Wirkung: `Kopfdruck`, `Kopfdruck3` oder `|| Kopfdruck` ergeben immer `Kopfschmerz+1`
- Test/Doku: feste Alias-Werte in Parser-Regressionen und README ergänzt

## 2026-04-25

- `exportAtags` auf `v1.41` angehoben
- Fix: Kopfkommentar im Export-Script stark gekürzt, um Java-Editor-Regex-Rekursion in Memento zu vermeiden
- Wirkung: Exportlogik bleibt unverändert, nur der editorseitig riskante Kommentarblock wurde entschärft
- Doku: Ausführliche aktuelle Export-Aufrufe zentral in `README.md` ergänzt
- Test: Export-Regressionen und Versioning geprüft

## 2026-04-25

- `Addon Tag Cleaner` auf `v1.01` angehoben
- Fix: Wiederholtes Anwenden bleibt stabil und erzeugt keine doppelte oder veränderte Tagleiste
- Test: Rekursions-/Idempotenzfälle für `makeTagCleanerText()` und Same-field-Apply ergänzt

## 2026-04-25

- `collectAtags` auf `v1.32` angehoben
- `Addon Tag Cleaner` auf `v1.00` ergänzt
- Feature: Parser liest hochgestellte Wert-Endformen wie `emo⁺²`, `tag⁻⁰³` und `stuff⁺⁺` im normalen Text
- Feature: `tagCleaner.js` normalisiert einfache Werttags und führt `|`-/`||`-Tagleisten am Feldende zusammen
- Test/Doku: Parser- und Cleaner-Regressionen sowie README-Nutzung ergänzt

## 2026-04-25

- `Shared Script: Time Marker` auf `v1.23` angehoben
- Fix: Beim Setzen eines neuen TimeMarkers werden alte leere TimeMarker-Zeilen entfernt
- Wirkung: Marker mit Inhalt bleiben erhalten, leere Zwischenmarker werden bereinigt
- Test: Regression für alten leeren Marker vor neuem Marker ergänzt

## 2026-04-25

- `Addon Readable Atag Text` aus dem aktiven Plugin-Set entfernt
- Archiv: der Stand mit Readable-Add-on liegt auf Branch `readable-addon-archive`
- Wirkung: Alias-, Sync-, Parser-, Export-, Restore- und TimeMarker-Funktionen bleiben erhalten
- Doku/Test: README, Versioning-Liste und Readable-Testdatei aus dem aktiven Stand entfernt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.24` angehoben
- Änderung: Row-Tagzeilen werden mit zwei Leerzeichen vor `|` ausgegeben
- Feature: `blankLineBetweenRows: "never"` entfernt bestehende Leerzeilen beim Re-Write
- Test/Doku: Readable-Erwartungen und README-Beispiele angepasst

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.23` angehoben
- Feature: `backupTextField` sichert den ursprünglichen Quelltext einmalig, wenn das Backupfeld leer oder Whitespace ist
- Feature/Test: `bulkApplyReadableAtagText()` unterstützt Backupfelder für die gesamte Datenbank über `lib().entries()`
- Doku: Backupfeld in Add-on- und README-Beispielen ergänzt

## 2026-04-25

- Doku: `CONTRIBUTING.md` ergänzt, dass neue/geänderte Konfigurationsoptionen künftig in den jeweiligen Usage-/Beispielblöcken mitgepflegt werden müssen

## 2026-04-25

- `exportAtags` auf `v1.40` angehoben
- Doku: `enabled: true` in den Apply-Beispielen von `exportAtags` und `readableAtagText` ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.22` angehoben
- `Atag Helpers` auf `v1.09` angehoben
- Feature: `enabled: false` als No-op-Schalter für `applyTags`, Bulk-Apply/Export und Readable ergänzt
- Änderung: Readable gibt bei `enabled: false` den Quelltext unverändert zurück und schreibt kein Zielfeld
- Test/Doku: Disabled-Verhalten für Apply- und Readable-Pfade ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.21` angehoben
- Fix: Kommas direkt nach `##tag` oder `tag##` werden zusammen mit dem Marker entfernt
- Fix: vorhandene globale `||`-Zeilen bleiben bei wiederholter Anwendung erhalten, statt Textwerte zu verlieren
- Test: Same-field-Idempotenz fuer Row- und globale Tagzeilen ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.19` angehoben
- Fix: bestehende Row-Tagzeilen `| ...` werden nach einer Row verbraucht und nicht dupliziert
- Feature: vorhandene `|`-Zeilen werden normalisiert, wenn in der Row selbst keine neuen Tags gefunden wurden
- Test: bestehende Readable-Zeile, bearbeitete Tagzeile und Row-Änderung mit alter Tagzeile ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.18` angehoben
- Feature: gequotete Hash-Werte werden sichtbar zu `'tag name': Wert` umgeschrieben
- Test: `"test das hier"#4,1` und `'und das'#'das das'` im Readable-Add-on ergänzt

## 2026-04-25

- Test/Doku: Alias-Beispiele klarer auf kanonischen Langtag ausgerichtet, z. B. `@@Kopfschmerzen (ks)` und `ks2 -> Kopfschmerzen`

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.17` angehoben
- Feature: `applyReadableAtagText()` und `makeReadableAtagText()` akzeptieren optional ein `collectAtags()`-`result`
- Feature: Bei vorhandenem `result` werden `|`/`||`-Tagzeilen aus `result.items` gebaut und `displayName`-Kürzel genutzt
- Test/Doku: Readable-Test für result-basierte Tagzeile ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.16` angehoben
- Änderung: Tag-Typgruppen in `|`/`||`-Zeilen werden jetzt mit `, ` statt zwei Leerzeichen getrennt
- Test/Doku: Readable-Erwartungen und Beispielhinweis angepasst

## 2026-04-25

- Doku: Readable-Beispiel trennt Alias-Feld und Notiz-Feld explizit, passend zu `aliasTextFields`

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.15` angehoben
- Fix: Doppel-Hash-Marker werden vor dem Single-Hash-Parser verarbeitet, damit `tag##` und `##tag` nicht als sichtbarer Text oder `tag#...`-Wert stehen bleiben
- Test: Satzzeichen-Fall `##test,` und `test##.` ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.14` angehoben
- Änderung: Alias-Felder werden nicht mehr automatisch gesucht; separate Alias-Quellen muessen explizit per `aliasTextFields` oder `aliasText` uebergeben werden
- Test/Doku: Readable-Tests auf explizite Alias-Feldkonfiguration angepasst

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.13` angehoben
- Fix: automatische Alias-Feldsuche erkennt zusätzliche Schreibweisen wie `alias`, `aliases`, `aliase`, `Aliaszeile`
- Test: konkrete Regression für `0: Etwas Schlafmangel2 test##` mit `SchlM²` und entferntem `test##`

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.12` angehoben
- Fix: übliche Alias-Felder wie `Alias`, `Aliases` und `Aliase` werden automatisch für Kürzel gelesen
- Fix: `##tag` und `tag##` werden aus dem sichtbaren Text entfernt, inklusive nachfolgender Leerzeichen
- Test/Doku: Regression für automatische Alias-Felder und doppelte Hash-Marker ergänzt

## 2026-04-25

- `Addon Readable Atag Text` auf `v1.11` angehoben
- Fix: Readable-Add-on nutzt Alias-Kürzel auch dann, wenn die Alias-Zeilen in separaten Feldern stehen
- Feature: `aliasTextFields` und `aliasText` für Readable-Formatierung ergänzt
- Test/Doku: Regression für `@@Schlafmangel (SchlM): ...` mit `Schlafmangel2 -> SchlM²`

## 2026-04-25

- `collectAtags` auf `v1.31` angehoben
- `exportAtags` auf `v1.39` angehoben
- `Atag Helpers` auf `v1.08` angehoben
- Feature: Parser-Items behalten Alias-Kürzel als `displayName`
- Feature: Row-Tabellen verwenden Alias-Kürzel standardmäßig als Header
- Feature: Tabellen-Header können über `tableHeaderNames: "long"` oder `"both"` auf Langform umgestellt werden
- Test/Doku: Parser-Displaynamen und Tabellen-Header-Optionen ergänzt

## 2026-04-25

- `collectAtags` auf `v1.30` angehoben
- `Addon Readable Atag Text` auf `v1.10` angehoben
- Feature: Readable-Ausgabe nutzt jetzt kompakte `|`-Row-Tagzeilen und `||` fuer globale Tags statt Blocklayout
- Feature: Parser liest die neue Readable-Form mit Superscript-Werten wie `ks²`, `Wk⁺⁺`, `Gutⁿ`
- Feature: Alias-Deklarationen ohne Aliasliste sind erlaubt, z. B. `@@Wirkung (Wk)` oder `@@Gut`
- Feature: optionale Leerzeilen zwischen Rows ueber `blankLineBetweenRows: "tagged"` oder `"always"`
- Test/Doku: Parser- und Add-on-Tests sowie `README.md` aktualisiert

## 2026-04-25

- `collectAtags` auf `v1.29` angehoben
- `Addon Readable Atag Text` auf `v1.00` ergänzt
- Feature: Alias-Definitionen unterstützen optionale Kürzel, z. B. `@@Kopfschmerz (ks): Kopfschmerzen`
- Feature: `##`-Tagzeilen wie `## ks (3), emo (4)` werden im aktuellen Row-Kontext gelesen
- Feature: neues Readable-Add-on schreibt schmale Row-Blöcke mit kompakter `##`-Tagzeile
- Test/Doku: Parser- und Add-on-Tests sowie `README.md` ergänzt

## 2026-04-25

- Readable-Add-on-Experiment zurückgenommen; Idee bleibt in `NEXT_STEPS.md` für einen neuen, kleinbildschirmfreundlichen Entwurf
- Parser-Sonderregeln für Readable-Suffixe wieder entfernt; bestehende Quote-/Hash-Fixes bleiben erhalten

## 2026-04-25

- `collectAtags` auf `v1.27` angehoben
- Intern: Quote-Zustand wird pro Parse-Zeile vorberechnet und ueber kleine Helper wiederverwendbar gemacht
- Test: `tests/test_collectAtags.js` um Quote-Regressionsfaelle fuer numerische Kurz-Tags ergaenzt

## 2026-04-25

- Systemversion auf `sys 2.10` angehoben
- `addons/timeMarker.js` Header an das gemeinsame `v... (sys ...)` Format angepasst
- Doku: Header und Versionierungsbeispiele in `README.md` und `CONTRIBUTING.md` auf `sys 2.10` aktualisiert
- Tooling: `check_versioning.ps1` akzeptiert reine Systemversionssprünge ohne Modulversionssprung
- Tooling: `check_versioning.ps1` toleriert beim Umstieg alte Modulheader ohne bisherige Systemversionszeile

## 2026-04-25

- `collectAtags` auf `v1.28` angehoben
- Fix: Quoted Hash-Tags wie `"test das hier"#4,1` und `'und das'#7` übernehmen den Wert nach `#`
- Fix: Quoted Hash-Tags übernehmen auch gequotete Textwerte wie `'und das'#'das das'`
- Fix: Hash-, Simple- und Colon-Tags innerhalb längerer Quotes werden ignoriert
- Test: `tests/test_collectAtags.js` um Quoted-Hash-Werte erweitert

## 2026-04-25

- `exportAtags` auf `v1.38` angehoben
- `Atag Helpers` auf `v1.07` angehoben
- Feature: Tag-Ausgaben werden alphabetisch sortiert; normales Markdown behält die Typ-Gruppen und sortiert darin alphabetisch
- Fix: Export-Helfer vermeiden `String.prototype.trim()` für WSH-Kompatibilität
- Fix: JSON-Export nutzt einen lokalen Stringifier für ältere WSH-Hosts ohne `JSON.stringify`
- Test: `tests/test_exportAtags.js` ergänzt für `tags`, `md`, `rows_md`, `text` und `json`

## 2026-04-23

- `Addon Global Field Sync` auf `v1.01` angehoben
- Fix: `syncFieldBack()` schreibt leere aktuelle Feldwerte nicht mehr in den ersten Eintrag zurück
- Fix: `syncFieldTo()` und `syncFieldAll()` suchen bei leerem ersten Eintrag im selben Feld die ersten 20 Einträge nach einem gefüllten Wert ab
- Test/Doku: `tests/test_globalFieldSync.js` ergänzt und Mojibake in `README.md` für den Time-Marker-Bereich korrigiert

## 2026-04-23

- `Shared Script: Time Marker` auf `v1.22` ergänzt
- Feature: `addons/timeMarker.js` wieder eingebunden und `appendTimeMarker()` dokumentiert
- Feature: optionales Stundenlimit über `maxHours` mit Standardwert `30` ergänzt
- Test/Doku: `tests/test_timeMarker.js` und `README.md` erweitert

## 2026-04-23

- `exportAtags` auf `v1.37` angehoben
- Optimierung: `rows_md` und `rows_html` nutzen vorberechnete Summen/Zähler statt pro Tag erneut Werte-Arrays aufzubauen
- Verifikation: Row-Markdown- und HTML-Ausgabe direkt im WSH-Host geprüft

## 2026-04-23

- `Addon Global Field Sync` auf `v1.00` ergänzt
- Feature: neues unabhängiges Add-on `addons/globalFieldSync.js` mit `syncFieldTo`, `syncFieldBack` und `syncFieldAll`
- Feature: mehrere Felder und optionale Konfliktbehandlung über `overwrite: true` unterstützt

## 2026-04-23

- `collectAtags` auf `v1.23` angehoben
- Feature: inverse Aliase unterstützt, z. B. `@@emo: -down, froh` mit `down2 -> emo-2`
- Verifikation: inverse Alias-Auflösung direkt im WSH-Host geprüft

## 2026-04-23

- `exportAtags` auf `v1.36` angehoben
- `Atag Helpers` auf `v1.05` angehoben
- Fix: reine Integer-Tags werden in `md`, `rows_md` und `rows_html` ohne `,0` ausgegeben
- Fix: Dezimalstellen bleiben sichtbar, wenn echte Dezimalwerte vorkommen oder das Aggregat nicht ganzzahlig ist
- Verifikation: Exportausgabe direkt im WSH-Host geprüft

## 2026-04-22

- `Addon Tag Pair Parser` auf `v1.00` ergänzt
- Architektur: Tag-Pair-Logik als separates Add-on in `addons/tagPairParser.js`, ohne direkten Hook in `applyTags()` / `bulkApplyTags()`
- Test/Doku: `tests/test_tagPairParser.js` und `README.md` für die Add-on-Nutzung ergänzt

## 2026-04-22

- Struktur: flache Ordnerstruktur mit `core/`, `addons/` und `tests/` eingeführt
- Move: Kernmodule nach `core/collectAtags.js`, `core/exportAtags.js`, `core/helpers.js`, `core/restoreAtags.js` verschoben
- Move: Tests nach `tests/test_collectAtags.js` und `tests/test_tagPairParser.js` verschoben, Referenzen in Doku und `check_versioning.ps1` angepasst

## 2026-04-22

- `exportAtags` auf `v1.35` angehoben
- `Atag Helpers` auf `v1.03` angehoben
- Fix: `shortenTableHeaders: 0` bedeutet jetzt 10 Zeichen plus `.`

## 2026-04-22

- `exportAtags` auf `v1.34` angehoben
- `Atag Helpers` auf `v1.02` angehoben
- Fix: `rows_html` rendert Tabellen jetzt mit Sans-Serif-Schrift
- Fix: Tabellen-Header werden standardmäßig gekürzt statt unbegrenzt ausgegeben
- Fix: `shortenTableHeaders: 0` bedeutet jetzt 12 Zeichen plus `.`
- Doku/Check: README ergänzt und Versionsprüfungsskript hinzugefügt

## 2026-04-22

- `collectAtags` auf `v1.22` angehoben
- Fix: negative Zahlenformen werden wieder korrekt erkannt: `tag-2`, `yay-2,3`, `emo-12,32`
- Fix: `tag: 5` wird im JScript-Host wieder korrekt als Wert gelesen
- Test/Doku: `test_collectAtags.js` ergänzt, um die dokumentierten Tag-Formen gesammelt zu prüfen
