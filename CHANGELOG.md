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
