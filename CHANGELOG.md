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

- `collectAtags` auf `v1.22` angehoben
- Fix: negative Zahlenformen werden wieder korrekt erkannt: `tag-2`, `yay-2,3`, `emo-12,32`
- Fix: `tag: 5` wird im JScript-Host wieder korrekt als Wert gelesen
- Test/Doku: `test_collectAtags.js` ergänzt, um die dokumentierten Tag-Formen gesammelt zu prüfen
