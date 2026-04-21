ATAG SYSTEM (sys 2.00)
========================================

PFLEGE / VERSIONIERUNG
----------------------------------------

Jede funktionale Ã„nderung wird an zwei Stellen dokumentiert:

- direkt in der geÃ¤nderten Datei Ã¼ber die kurze Versionsinfo im Kopfblock
- zusÃ¤tzlich im `CHANGELOG.md` als Repo-Verlauf

Regeln:

- Modulversion pro geÃ¤nderter Datei anheben
- Ã„nderungen im Kopfblock kurz und konkret notieren
- Changelog mit Datum, Versionssprung und Wirkung ergÃ¤nzen

Details siehe `CONTRIBUTING.md`.

ZIEL
----------------------------------------
Freitext â†’ strukturierte Daten â†’ flexible Exporte

- Tags + Werte extrahieren
- Links / Mail / Tel erkennen
- Row-Kontext (z. B. "5h: emo3") verarbeiten
- Mehrfachwerte aggregieren
- Alias-System unterstÃ¼tzen
- Hybrid-Tag-System (Parser + manuell)
- Export in tags / md / rows_md / rows_html / json


ARCHITEKTUR
----------------------------------------

Textfelder
   â†“
collectAtags()
   â†“
result.items   â† Single Source of Truth
   â†“
exportAtags()
   â†“
Ziel-Felder


DATENMODELL (items)
----------------------------------------

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


DATEIEN / MODULE
----------------------------------------

`core/`
- `collectAtags.js`
- `exportAtags.js`
- `helpers.js`
- `restoreAtags.js`

`addons/`
- `tagPairParser.js`

`tests/`
- `test_collectAtags.js`
- `test_tagPairParser.js`





PIPELINE (DETAIL)
----------------------------------------

1. RAW TEXT
   "5h: emo3, emo1"

2. PARSER
   collectAtags()

3. ITEMS
   [
     { emo: 3, rowValue: 5 },
     { emo: 1, rowValue: 5 }
   ]

4. EXPORT
   exportAtags()

5. OUTPUT
   md / tags / json / rows


TAG-PAIR PREPROCESSING
----------------------------------------

Optional als Add-on vor `collectAtags()`:

- `applyTagPairParser()`
- `bulkApplyTagPairParser()`
- Add-on in `addons/tagPairParser.js`
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


TAG-FORMEN
----------------------------------------

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

rows:
5h: emo3
2,5: focus+1


ROW-SYSTEM
----------------------------------------

Prefix definiert Kontext fÃ¼r restliche Zeile

5h: emo3 emo1
â†’ rowValue = 5
â†’ rowUnit = h

Speicherung je item:
- rowValue
- rowUnit
- rowRaw

Aggregation:
- avg (default)
- sum
- null


EXPORT-TYPEN
----------------------------------------

tags
- nur Tag-Namen + Metatags

md
- normale Ausgabe
- Aggregat + [Einzelwerte]
- kein [] bei Einzelwert

rows_md
- Markdown-Tabelle
- rechte Spaltenausrichtung
- optionale Header-KÃ¼rzung

rows_html
- HTML Tabelle
- rechtsbÃ¼ndige Zahlen

json
- { tag: value }


MARKDOWN-REGELN
----------------------------------------

- "  \n" fÃ¼r Zeilenumbruch
- 2 Spaces vor [Liste]
- Links klickbar
- Sortierung:
  1. links / tel / mail
  2. numbers
  3. text
  4. tags

- Einzelwert:
  emo: 1,0

- Mehrfach:
  emo: 2,0  [3,0, 1,0]


ROWS-TABELLE
----------------------------------------

| rval | emo |
| :--- | ---: |
| 2h   | 3,0 |
| 5h   | 1,0 |
| avg  | 2,0 |

Optionen:
- rowIncludeUnits
- rowAggregateMode
- rowAggregateDecimals
- shortenTableHeaders (`0` = Standard, 10 Zeichen + ".")


ALIAS-SYSTEM
----------------------------------------

@@emo: Emotion

- nur gÃ¼ltig im Tag-Kontext
- keine Ersetzung im FlieÃŸtext
- nur erlaubte Tagformen


HYBRID TAG SYSTEM
----------------------------------------

Felder:
- Tags Parser
- Tags Extern

Logik:
foreign = existing - parser_old
final = foreign + parser_new

Effekt:
- Parser steuert eigene Tags
- manuelle bleiben stabil


APPLY / BULK

bulkApplyTags() unterstÃ¼tzt optional `result`, analog zu applyTags():

- `result` als Objekt â†’ wird fÃ¼r alle EintrÃ¤ge verwendet
- `result` als Array â†’ pro Eintrag per Index
- `result` als Funktion `(entryObj, index, allEntries)` â†’ dynamisch pro Eintrag

Wenn `result` fehlt oder leer ist, wird automatisch `collectAtags()` je Eintrag ausgefÃ¼hrt.

ZusÃ¤tzlich gibt es `bulkExportAtags()` im Helper-Modul mit identischem `result`-Verhalten.
----------------------------------------

applyTags({
  textFields,
  targetField,
  targetFieldType
})

bulkApplyTags({
  textFields,
  targetField,
  targetFieldType
})


VERSIONIERUNG
----------------------------------------

System:
sys 2.00

Dateien:
Atag Helpers v1.00 (sys 2.00)
collectAtags vX (sys 2.00)
exportAtags vX (sys 2.00)
restoreAtags vX (sys 2.00)


PRINZIPIEN
----------------------------------------

- items = einzige Wahrheit
- Parser â‰  Export strikt getrennt
- Helper zentralisiert
- keine Doppel-Logik
- deterministische Outputs
- erweiterbar ohne Breaking Changes
