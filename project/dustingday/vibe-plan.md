# Dustingday Vibe Plan

Codex-Arbeitsdatei. Diese Datei sammelt Struktur, technische Annahmen, offene Fragen und nächste Umsetzungsschritte. Die persönliche Projektidee bleibt in `plan.md`.

Sprachregel: Deutsche Notizen dürfen normale Umlaute und `ß` verwenden. Nicht automatisch auf `ae`, `oe`, `ue` ausweichen.

## Zielbild

Dustingday soll einen Tag unkompliziert erfassbar machen und daraus mentale Hilfen, Muster und Lösungsansätze ableiten. Es ist eine Weiterentwicklung der Eindosierungs-Logik: die Dosis bleibt möglich, wird aber nur als ein Faktor unter mehreren mitgeführt.

Projektziel:

- im Alltag Symptome erfassen
- Befinden erfassen
- Erfolge dokumentieren
- Methoden dokumentieren, die helfen
- daraus Hilfen an die Hand geben
- alles kurz, strukturiert und schnell zugänglich halten
- zugleich eine belastbare Dokumentation aufbauen

Der Kern ist nicht eine perfekte medizinische Tabelle, sondern ein niedrigschwelliger Tages-Sammelmodus:

- kleine Memento-Einträge dürfen sehr kurz sein
- Zeit und wenige Felder tragen den Kontext
- Notizen und Tags werden automatisch zu einer Tagesnotiz verbunden
- Bewertungen, Zahlen, Zustandsmarker, Erfolge und hilfreiche Methoden bleiben auswertbar

## Erstes Modul: Day Collector

Das erste Modul sammelt einzelne Memento-Einträge eines Tages in einem Tages-Eintrag.

Erster Strukturbaustein ist ein Relation-Feld:

```text
DustingInput.DayLinks -> DustingDay
```

Damit wird die Verbindung zwischen Input- und Tageseintrag dauerhaft gespeichert. Diese Richtung ist in Memento praktisch üblicher: der Input-Eintrag zeigt per `DayLinks` auf seinen Tages-Eintrag. Datum/Zeit bleibt wichtig für Suche, Tageserstellung und Row-Inferenz.

### Datenfluss

```text
Einzeleintrag
  Datum/Zeit
  innote
  intag
    |
    v
Day Linker
  pflegt DustingInput.DayLinks
  liest alle Einträge des Tages
  inferiert Rows aus Datum/Zeit
  parst Tags aus innote und intag
  koppelt Zahlen/Bewertungen an Tags
    |
    v
Tages-Eintrag
  outnote
  aggregierte Tags
  Tageszeilen nach Uhrzeit
```

### Eingabefelder

- `Datum/Zeit`: Pflichtkontext für Tageszuordnung und Row-Inferenz.
- `innote`: kurzes Notizfeld. Darf normalen Text, Tags, Zahlen und Mini-Syntax enthalten.
- `intag`: Tagfeld für explizite Kopplungen, besonders bei Zahlen, Bewertungen und Kurzsignalen.

Beispiele:

```text
Datum/Zeit: 02.02.2020 03:30
innote: 40mg, #müde
intag: mg 40
```

```text
Datum/Zeit: 02.02.2020 05:02
innote: stress3, tätigkeit: laufen
intag: müde 3
```

## Row-Inferenz

Rows werden nicht primaer manuell geschrieben, sondern aus `Datum/Zeit` inferiert.

Grundregel:

- Eintrag um `03:30` wird zur Row `3,5`
- Eintrag um `05:02` wird je nach Rundungsregel zur Row `5` oder `5,0`
- die Rundung soll konfigurierbar bleiben, wahrscheinlich analog zu `timeMarker` mit `stepHours`

Offene Entscheidung:

- Soll die Tagesnotiz halbstündlich normalisieren (`3,5`, `5,0`) oder Originalzeiten bewahren (`03:30`, `05:02`) und nur für Gruppierung runden?

## Tag- und Wertlogik

`innote` und `intag` koennen beide Tags erzeugen.

`innote`:

- freie Kurznotiz
- Hashtags wie `#muede`
- kompakte Werte wie `stress3`
- Paare wie `tätigkeit: laufen`

`intag`:

- explizite Tag-Wert-Paare
- besonders für Zahlen und Bewertungen
- Beispiele: `mg 40`, `müde 3`

Gewuenschtes Verhalten:

- `mg 40` wird als Dosiswert verstanden
- `müde 3` wird als Bewertung oder Intensität verstanden
- `stress3` wird als `stress` mit Wert `3` verstanden
- `tätigkeit: laufen` bleibt als gekoppelter Kontext erhalten

## Beispielausgabe

Aus den Beispiel-Eintraegen entsteht im Tages-Eintrag:

```text
Dosis: 40mg

3,5: müde
5: stress3, müde3, tätigkeit: laufen
```

Alternativ mit sichtbarer Wertformatierung:

```text
Dosis: 40mg

3,5: müde
5: stress^3, müde^3, tätigkeit: laufen
```

## Technische Nähe zum bestehenden ATAG-System

Dustingday soll moeglichst auf vorhandener Logik aufbauen:

- `collectAtags()` fuer Parser-Ergebnis als Single Source of Truth
- `exportAtags()` fuer Markdown/Rows/JSON-Ausgaben
- `tagPairParser` als Vorbild für Tagfeld-zu-Notiz-Kopplung
- `timeMarker` als Vorbild für Row-Rundung und Zeitformat

Wichtig: Der Day Collector arbeitet nicht nur im aktuellen Eintrag, sondern liest andere Eintraege aus einer Datenbank oder einem Datenpunkt und schreibt die Tageszusammenfassung in den Tages-Eintrag.

## Offene Fragen

- Wie erkennt das Modul den Tages-Eintrag? Über `Typ = Tag`, ein eigenes Feld oder eine separate Library?
- Aus welcher Memento-Library werden die Einzeleinträge gelesen?
- Soll `DustingInput.DayLinks` beim Speichern immer gesetzt oder nur bei leerem Feld gesetzt werden?
- Sollen Einträge nach Kalendertag oder nach Tagesfenster gesammelt werden, z. B. 04:00 bis 03:59?
- Welche Felder sind minimal fest: `innote`, `intag`, `outnote`, `Datum/Zeit`?
- Soll `Dosis` als eigener Abschnitt erkannt werden oder nur als normaler Tag mit besonderem Export?
- Welche eigenen Kategorien braucht das Zielbild: Symptome, Befinden, Erfolge, Methoden, Hilfen?

## Nächste Schritte

1. Relation in Memento testen: `DustingInput.DayLinks -> DustingDay`.
2. `dd-linker.js` im `DustingInput`-Trigger testen.
3. Minimalen Testdatensatz anlegen:
   - mehrere `DustingInput`-Einträge an einem Tag
   - optional kein `DustingDay`-Eintrag, damit Erstellung getestet wird
4. Umsetzungsschnitt 0.1 bauen: aktuellen Input mit Day verlinken und Map-Felder übertragen.
5. Umsetzungsschnitt 0.2 bauen: Day-Library-Funktion zur Zuordnung aller DustingInput-Einträge eines Tages.
6. Umsetzungsschnitt 0.3 bauen: `InTag` nach `DustingDay.Tags` übertragen.
7. Danach Parser- und Hilfsebene ausbauen.

## Umsetzungsschnitt 0.1

Start im `DustingInput`-Trigger mit `appendToDayEntry()`.

```text
DustingInput speichern
  -> passenden DustingDay über Date/Datum finden
  -> falls nötig DustingDay erstellen
  -> DustingInput.DayLinks setzen
  -> Map-Felder übertragen
  -> OutNote-Rows eindeutig ergänzen
  -> OutTags eindeutig ergänzen
```

Warum zuerst:

- Relation-Feld wird direkt getestet
- kleine Fehlerfläche
- keine unsichere Entry-Erstellung
- schnell in Memento prüfbar

Geplanter/erster Modulname:

```text
addons/5_dusting-day/dd-linker.js
appendToDayEntry()
```

GitHub-Referenz nach Push auf `main`:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/addons/5_dusting-day/dd-linker.js
```

Memento-Anschluss:

```text
Library: DustingInput
Script-Referenz: dd-linker.js via GitHub Raw URL
Trigger: After Save / After Entry, Fallback Before Save
```

Trigger-Aufruf:

```js
appendToDayEntry({
  targetLib: "DustingDay",
  sourceDateField: "Date",
  targetDateField: "Date",
  sourceDayLinkField: "DayLinks",
  rowMode: "clock",
  rowStepHours: 0.5,
  recalcTarget: true,
  recalcSource: true,
  map: [
    { from: "InNote", to: "OutNote", type: "string" },
    { from: "InTag", to: "OutTags", type: "tag" }
  ]
});
```

## Eigentliche Trigger-Idee

Der Alltagsfluss startet in `DustingInput`, weil dort ein neuer Eintrag entsteht.

Gewünschter Ablauf:

```text
DustingInput speichern
  -> Date lesen
  -> passenden DustingDay über Datum finden
  -> falls keiner existiert: DustingDay erstellen
  -> DustingInput.DayLinks auf DustingDay setzen
  -> DustingDay.OutNote / OutTags über map aktualisieren
```

Primärer Anschluss:

```text
Library: DustingInput
Trigger: nach Möglichkeit After Save / After Entry
Fallback-Test: Before Save, wenn Memento dort Relation/Entry-Updates stabil erlaubt
```

Input-Trigger-Debug:

```js
debugDustingInputCollector({
  outputField: "Debug",
  inputDateField: "Date",
  inputNoteField: "InNote",
  inputTagField: "InTag"
});
```

Dieser Debug gehört in `DustingInput` und schreibt in `DustingInput.Debug`.

Warum nicht zuerst `DustingDay`:

- Im Alltag wird der Input-Eintrag angelegt.
- Der Nutzer soll nicht danach manuell den Tages-Eintrag öffnen müssen.
- `DustingDay` ist der Sammelpunkt, nicht der Auslöser.

Die bestehende Funktion `updateDustingDayOutNote()` bleibt nur als alter Refresh-/Experimentpfad. Der neue Hauptpfad ist `appendToDayEntry()`.

## Umsetzungsschnitt 0.2

Danach Rebuild/Reparatur als eigener Schritt, falls nötig.

```text
DustingInput.Date lesen
  -> passenden DustingDay.Datum finden
  -> falls nötig DustingDay erstellen
  -> fehlende `DustingInput.DayLinks` setzen
  -> OutNote / OutTags nach Map-Regeln ergänzen oder später komplett neu aufbauen
```

Offen: Ob Memento das Erstellen neuer `DustingDay`-Einträge, das Schreiben in einen anderen Eintrag und `recalc()` im gewählten Trigger sauber erlaubt. Das muss lokal und danach online/sync getestet werden.

## Umsetzungsschnitt 0.3

Dann Tags.

```text
InTag aus allen verknüpften Inputs sammeln
  -> Duplikate reduzieren
  -> DustingDay.Tags setzen
```

`InNote`-Parsing kommt danach, damit die erste Version nicht zu viel gleichzeitig tut.

## Online-Kompatibilität

Annahme für die erste Planung: Die Module sind zunächst Memento-Script-kompatibel, aber nicht automatisch online-kompatibel im Sinne von sicherer Cloud-/Mehrgeräte-Ausführung.

Risiken:

- Scripts laufen je nach Memento-Oberfläche nicht überall gleich.
- Relation-/Library-Link-Felder können in Scripts anders geliefert werden als normale Textfelder.
- Automatisches Schreiben in andere Einträge oder andere Libraries kann offline/online unterschiedlich reagieren.
- Sync-Konflikte sind möglich, wenn mehrere Geräte denselben Tages-Eintrag oder dieselben Links ändern.

Konsequenz:

- 0.1 nur auf aktuellem `DustingDay`-Eintrag arbeiten.
- 0.1 läuft auf dem aktuellen `DustingInput`-Eintrag.
- 0.1 schreibt `DustingInput.DayLinks` und den gefundenen/erstellten `DustingDay`.
- Cross-Library-Schreiben und Entry-Erstellung lokal testen.
- Online-/Sync-Test als eigener Schritt, bevor das Modul im Alltag dauerhaft läuft.

Online-Testplan:

1. Einen `DustingInput` speichern und prüfen, ob `DayLinks` gesetzt wird.
2. Prüfen, ob `DustingDay` erstellt oder gefunden wird.
3. Prüfen, ob `OutNote` und `OutTags` nach Sync auf anderem Gerät identisch bleiben.
4. Erst danach Day-Library-Rebuild testen.
