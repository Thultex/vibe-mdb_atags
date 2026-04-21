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

## 2026-04-22

- `Tag Pair Parser` auf `v1.00` ergänzt
- Architektur: Tag-Pair-Logik als separates Add-on in `tagPairParser.js`, ohne direkten Hook in `applyTags()` / `bulkApplyTags()`
- Test/Doku: `test_tagPairParser.js` und `README.md` für die Add-on-Nutzung ergänzt

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
