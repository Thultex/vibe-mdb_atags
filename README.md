ATAG SYSTEM (sys 2.00)
========================================

PFLEGE / VERSIONIERUNG
----------------------------------------

Jede funktionale Änderung wird an zwei Stellen dokumentiert:

- direkt in der geänderten Datei über die kurze Versionsinfo im Kopfblock
- zusätzlich im `CHANGELOG.md` als Repo-Verlauf

Regeln:

- Modulversion pro geänderter Datei anheben
- Änderungen im Kopfblock kurz und konkret notieren
- Changelog mit Datum, Versionssprung und Wirkung ergänzen

Details siehe `CONTRIBUTING.md`.

ZIEL
----------------------------------------
Freitext → strukturierte Daten → flexible Exporte

- Tags + Werte extrahieren
- Links / Mail / Tel erkennen
- Row-Kontext (z. B. "5h: emo3") verarbeiten
- Mehrfachwerte aggregieren
- Alias-System unterstützen
- Hybrid-Tag-System (Parser + manuell)
- Export in tags / md / rows_md / rows_html / json


ARCHITEKTUR
----------------------------------------

Textfelder
   ↓
collectAtags()
   ↓
result.items   ← Single Source of Truth
   ↓
exportAtags()
   ↓
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

Atag Helpers v1.00 (sys 2.00)
- alle Helper-Funktionen
- applyTags()
- bulkApplyTags()

collectAtags vX (sys 2.00)
- Parser
- Alias-System
- Row-Erkennung
- erzeugt result.items

exportAtags vX (sys 2.00)
- Exportlogik
- md / rows_md / rows_html / tags / json

restoreAtags vX (sys 2.00)
- JSON → Felder
- Typkonvertierung


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

Prefix definiert Kontext für restliche Zeile

5h: emo3 emo1
→ rowValue = 5
→ rowUnit = h

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
- optionale Header-Kürzung

rows_html
- HTML Tabelle
- rechtsbündige Zahlen

json
- { tag: value }


MARKDOWN-REGELN
----------------------------------------

- "  \n" für Zeilenumbruch
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
- shortenTableHeaders


ALIAS-SYSTEM
----------------------------------------

@@emo: Emotion

- nur gültig im Tag-Kontext
- keine Ersetzung im Fließtext
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

bulkApplyTags() unterstützt optional `result`, analog zu applyTags():

- `result` als Objekt → wird für alle Einträge verwendet
- `result` als Array → pro Eintrag per Index
- `result` als Funktion `(entryObj, index, allEntries)` → dynamisch pro Eintrag

Wenn `result` fehlt oder leer ist, wird automatisch `collectAtags()` je Eintrag ausgeführt.

Zusätzlich gibt es `bulkExportAtags()` im Helper-Modul mit identischem `result`-Verhalten.
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
- Parser ≠ Export strikt getrennt
- Helper zentralisiert
- keine Doppel-Logik
- deterministische Outputs
- erweiterbar ohne Breaking Changes
