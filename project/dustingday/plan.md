# Dustingday Plan

Meine Notiz. Hier bleibt die eigene Projektidee, auch wenn sie noch roh, offen oder unvollständig ist.

## Grundidee

Neues Projekt für einfache Tageserfassung und mentale Hilfen.

Ziel:

- im Alltag Symptome erfassen
- Befinden erfassen
- Erfolge dokumentieren
- Methoden festhalten, die helfen
- Hilfen an die Hand geben
- alles kurz und strukturiert halten
- schneller Zugriff
- zugleich Dokumentation

Weiterentwicklung der Eindosierung. Die Dosis selbst wird nur als Nebenfaktor mitgeführt.

Es soll unkompliziert werden:

- den Tag erfassen
- kurze Einträge zulassen
- mentale Hilfen und Lösungen daraus entwickeln
- hilfreiche Methoden wiederfinden
- Erfolge sichtbar machen
- Tageszusammenhang automatisch bilden

## Erste Idee

Ein Modul sammelt hinzugefügte Memento-Einträge aus einem Datenpunkt in einer anderen Stelle zum Tag.

Die Einzeleinträge können sehr kurz und klein ausfallen. Das meiste wird über zwei Felder bzw. wenige Felder geregelt:

- Datum/Zeit
- `innote`
- `intag`

`innote` ist das Notizfeld. Dort koennen wie bisher Tags entstehen.

`intag` ist das Tagfeld. Tagfelder können ebenfalls Tags erzeugen und Informationen koppeln, besonders bei Zahlen und Bewertungen:

- `mg 40`
- `müde 3`
- `stress 2`

Jeder Eintrag hat Datum/Zeit. Rows werden generell über die Zeit inferiert.

## Beispiel

Eintrag:

```text
02.02.2020 03:30

innote: 40mg, #müde
intag: mg 40
```

Eintrag:

```text
02.02.2020 05:02

innote: stress3, tätigkeit: laufen
intag: müde 3
```

Der Tages-Eintrag sammelt beim Aufruf die Einzeleinträge des Tages und koppelt sie mit sich.

Tagesnotiz:

```text
Dosis: 40mg

3,5: müde
5: stress3, müde3, tätigkeit: laufen
```

## Arbeitsannahmen / offen

- Tages-Eintrag liest beim Aufruf die Einzeleinträge des Tages.
- Jeder Einzeleintrag gehört über `Datum/Zeit` zu einem Tag.
- Zeit wird zu Row, z. B. `03:30` zu `3,5`.
- `innote` und `intag` werden zusammen ausgewertet.
- Die Tagesnotiz zeigt alle relevanten Tags und Eintraege zeitlich sortiert.

## Spaeter wichtig

- mentale Hilfe nicht nur als Export, sondern als Rückblick: Was war los, was half, was war zu viel?
- Methoden und Erfolge als eigene wichtige Ebene behandeln
- Dosis nur mitführen, nicht alles darum drehen
- Lösungsansätze können später aus wiederkehrenden Mustern entstehen
- Tagesfenster eventuell nicht Mitternacht bis Mitternacht, sondern schlaf-/alltagsnah
