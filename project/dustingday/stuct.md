# Dustingday Struktur

Diese Datei denkt Dustingday auf funktioneller Ebene: Welche Teile braucht das System, welche Aufgaben haben sie, und wie fließen Informationen durch den Tag?

Ziel der Struktur ist Alltagstauglichkeit: Symptome und Befinden schnell erfassen, Erfolge dokumentieren, hilfreiche Methoden wiederfinden und daraus konkrete Hilfen ableiten.

## Funktionelle Ebenen

```text
Einzeleintrag
  Datum/Zeit
  innote
  InTags
    |
    v
Tages-Sammler
  findet passende Einträge
  sortiert nach Zeit
  leitet Rows ab
    |
    v
Parser-Schicht
  liest innote
  liest InTags
  erkennt Tags, Werte, Paare
    |
    v
Tagesmodell
  gruppiert nach Row
  hält Dosis, Zustand, Tätigkeit, Bewertungen
  hält Symptome, Befinden, Erfolge, Methoden
    |
    v
Ausgabe-Schicht
  schreibt Notiz
  optional Tags / JSON / weitere Felder
```

## 1. Einzeleintrag

Der Einzeleintrag ist absichtlich klein.

Aufgabe:

- schnell erfassen
- wenig Reibung
- kein manuelles Tagesformat nötig

Felder:

- `Datum/Zeit`: Anker für Tag und Row.
- `innote`: freie Notiz, Tags, kurze Zustandswerte.
- `InTags`: explizite Tag-Wert-Kopplungen.

Beispiele:

- `innote: 40mg, #müde`
- `InTags: mg 40`
- `innote: stress3, tätigkeit: laufen`
- `InTags: müde 3`

## 2. Tages-Sammler

Der Tages-Sammler ist die erste echte Funktion.

Aufgabe:

- beim Tages-Eintrag starten
- alle verknüpften Einzeleinträge lesen
- Einträge chronologisch sortieren
- Uhrzeiten in Rows übersetzen

Offen:

- Kalendertag oder eigenes Tagesfenster?
- Welche Library enthält die Einzeleinträge?
- Soll das Datum nur Fallback sein oder bei jedem Lauf `DayLinks` automatisch repariert werden?

## 2a. Relation Field

Das Relation-Feld ist die erste Grundlage der Verbildung.

Vorschlag:

```text
DustingInput.DayLinks -> DustingDay
```

Funktion:

- Der Input-Eintrag enthält über `DayLinks` seinen Tages-Eintrag.
- Eine Relation ist beidseitig abrufbar, dadurch kann `DustingDay` die verknüpften Inputs ebenfalls erreichen.
- Wenn ein passender Tages-Eintrag gefunden oder erstellt wurde, wird er in `DustingInput.DayLinks` gesetzt.

Damit wird die Verbindung nicht nur über Datum geraten, sondern dauerhaft gespeichert.

## 3. Row-Inferenz

Rows werden aus der Uhrzeit gebildet.

Beispiele:

- `03:30` → `3,5`
- `05:02` → `5`

Mögliche Regeln:

- exakt als Uhrzeit behalten
- auf ganze Stunden runden
- auf halbe Stunden runden
- Tagesfenster verschieben, z. B. Start um 04:00

Funktionell wichtig:

- Row ist Kontext, nicht primäre Eingabe.
- Der Nutzer muss sie nicht tippen.

## 4. Parser-Schicht

Die Parser-Schicht verbindet `innote` und `InTags`.

`innote` kann enthalten:

- freien Text
- Hashtags
- kurze Werte wie `stress3`
- Paare wie `tätigkeit: laufen`

`InTags` kann enthalten:

- `mg 40`
- `müde 3`
- `stress 2`
- später weitere Kurzformen

Funktion:

- Tags erkennen
- Zahlen und Bewertungen an Tags koppeln
- Kontextpaare erhalten
- doppelte Informationen sinnvoll zusammenführen

## 5. Tagesmodell

Das Tagesmodell ist die interne Zwischenform.

Es sollte nicht nur Text sein, sondern eine strukturierte Sicht:

```text
Tag
  Datum
  Einträge[]
  Rows[]
  Dosis[]
  Symptome[]
  Befinden[]
  Erfolge[]
  Methoden[]
  Zustände[]
  Tätigkeiten[]
  Bewertungen[]
  Hinweise[]
```

Mögliche Row-Struktur:

```text
Row 5
  Zeit: 05:02
  Tags:
    stress: 3
    müde: 3
  Paare:
    tätigkeit: laufen
  Rohtext:
    stress3, tätigkeit: laufen
```

## 6. Ausgabe-Schicht

Die Ausgabe-Schicht schreibt den Tages-Eintrag.

Erste Ausgabe:

```text
Dosis: 40mg

3,5: müde
5: stress3, müde3, tätigkeit: laufen
```

Spätere Ausgaben:

- `Notiz`: lesbare Tagesnotiz
- Tagfeld: aggregierte Tags
- JSON: strukturierte Tagesdaten
- Markdown: Export für andere Systeme

## 7. Mentale Hilfen

Mentale Hilfen sind nicht der erste technische Schritt, aber das eigentliche Ziel.

Später könnten aus dem Tagesmodell Fragen entstehen:

- Was hat geholfen?
- Welche Methode hat geholfen?
- Welche Erfolge gab es trotz Symptomen?
- Was hat Stress verstärkt?
- Welche Tätigkeiten hängen mit Müdigkeit zusammen?
- Wann kippt der Tag?
- Welche Dosis war nur Begleitfaktor und nicht Hauptursache?

Diese Ebene sollte erst kommen, wenn Sammeln, Row-Inferenz und Tagesnotiz stabil sind.

## Erste Modulgrenze

Das erste Modul sollte nur das können:

```text
Tages-Eintrag öffnen
  -> verknüpfte Einzeleinträge lesen
  -> Rows aus Zeit ableiten
  -> InNote/InTags als Text verbinden
  -> Tagesnotiz erzeugen
```

Noch nicht nötig:

- automatische Interpretation
- Empfehlungen
- Statistik
- komplexe Korrelation

Erst sammeln, dann verstehen.

## Modul-Reihenfolge

### 0.1 Input über DayLinks sammeln

Start im `DustingInput`-Trigger.

Funktion:

- aktueller `DustingInput`-Eintrag
- passenden `DustingDay` über `Date` / `Datum` finden
- falls nötig `DustingDay` erstellen
- `DustingInput.DayLinks` setzen
- bei vorhandenem `DayLinks` sofort aussteigen
- vorhandene Relation nicht als Day-Entry-Objekt auflösen

Modul:

```text
core_lib/inputLinker_lib.js
linkInputEntryToTarget()
Lib-Name: Input Linker
```

Warum zuerst:

- Relation-Feld wird direkt getestet
- kein automatisches Erstellen nötig
- kleine Fehlerfläche
- schnell in Memento prüfbar

### 0.2 Day-Library-Refresh

Wenn 0.1 stabil ist:

- Funktion im `DustingDay`-Kontext
- Trigger `Linking an entry` verarbeitet den gerade verlinkten Input
- alle `DustingInput`-Einträge des Tages finden
- fehlende `DayLinks` setzen
- bereits verlinkte Inputs erneut über die Map ausführen
- `Notiz` und `Tags` appendend ergänzen oder mit `processMode: "rebuild"` neu aufbauen
- einzelne oder mehrere Inputs können per `entries` gezielt auf einen Day angewendet werden

Damit entsteht die Verbindung dort, wo Alltagseinträge angelegt werden, aber die eigentliche Aggregation läuft im Day-Kontext.

Funktion:

```text
recieveInputEntryFromSource()
refreshTargetFromInputEntries()
```

### 0.3 Tags übertragen

Danach:

- `InTags` aus allen verlinkten Inputs sammeln
- Duplikate reduzieren
- `DustingDay.Tags` setzen

### 0.4 Parser und Hilfen

Erst später:

- `stress3`, `müde3`, `tätigkeit: laufen` sauber strukturieren
- Symptome, Befinden, Erfolge und Methoden als Kategorien behandeln
- mentale Hilfen ableiten





