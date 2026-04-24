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

- `collectAtags` auf `v1.27` angehoben
- Intern: Quote-Zustand wird pro Parse-Zeile vorberechnet und ueber kleine Helper wiederverwendbar gemacht
- Test: `tests/test_collectAtags.js` um Quote-Regressionsfaelle fuer numerische Kurz-Tags ergaenzt

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
