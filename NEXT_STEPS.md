# Next Steps

## Index

- Later
  - `#7` Quote-Checks in `collectAtags()` vorkalkulieren
  - `#8` `addons/readableAtagText.js`

## Detail

### Now

leer

### Soon

leer

### Later

#### `#7` Quote-Checks in `collectAtags()` vorkalkulieren

##### Ziel

- den wiederholten Quote-Scan pro Treffer entfernen
- die Quote-Erkennung als kleinen, wiederverwendbaren Helper kapseln
- Parser-Verhalten unveraendert lassen

##### Ablauf

- in `core/collectAtags.js` den bisherigen `isInsideQuotes(str, pos)`-Pfad durch vorberechnete Quote-Information pro `parseLine` ersetzen
- die neue Quote-Hilfe so klein halten, dass sie spaeter auch von einem Text-Rewrite-Add-on genutzt werden kann
- keine groessere Parser-Refaktorierung im selben Schritt
- bestehende Parser-Tests laufen lassen und bei Bedarf um einen gezielten Quote-Fall ergaenzen

##### Warum zuerst

- das reduziert Risiko und doppelte Logik fuer spaetere Text-Umschreibungen
- `#8` soll dieselbe Quote-Regel wiederverwenden statt eine zweite Heuristik einzufuehren

#### `#8` `addons/readableAtagText.js`

##### Ziel

- lesbaren Fliesstext erhalten
- erkannte Tags aus dem Satz entfernen
- dieselben Tags gesammelt ans Ende schreiben
- keine Tag-Schreibweisen vereinheitlichen
- keine Parser-Regeln aendern

##### Geplanter Scope

- neues Add-on `addons/readableAtagText.js`
- Optionen
  - `sourceTextField`
  - `targetTextField`
  - `rowMode: true | false`
  - `plainTextMode: true | false`
  - `suffixMarker: "##" | "|"`
  - `tagSeparators: "space" | "comma"`
- akzeptierte Suffix-Marker: `##` und `|`
- Tags im Suffix gelten bis Zeilenende
- Tags im Suffix duerfen durch Leerzeichen, Komma oder Semikolon getrennt sein
- bevorzugt mit getrenntem `sourceTextField` und `targetTextField`, damit das Rewrite zuerst sicher in ein Zielfeld getestet werden kann

##### Grundidee

Aus:

```text
5: erst etwas muede1, spaeter dann aufgeregt2, ich war etwas spazieren#
```

wird:

```text
5: erst etwas muede, spaeter dann aufgeregt, ich war etwas spazieren ## muede1 aufgeregt2 spazieren#
```

Oder alternativ:

```text
5: erst etwas muede, spaeter dann aufgeregt, ich war etwas spazieren | muede1 aufgeregt2 spazieren#
```

##### Row-Modus

- Row-Zeilen werden einzeln behandelt
- Row-Prefixe bleiben unveraendert
- vorhandene Suffixe werden mitgelesen und nicht blind dupliziert
- Tags werden nur innerhalb derselben Zeile ans Ende verschoben

Beispiel:

```text
5: erst etwas muede1, spaeter aufgeregt2
```

wird:

```text
5: erst etwas muede, spaeter aufgeregt ## muede1 aufgeregt2
```

##### Plain-Text-Modus

- normaler Fliesstext kann optional als Gesamtblock behandelt werden
- erkannte Inline-Tags werden aus dem Text entfernt
- die Tags werden mit einer Leerzeile Abstand am Textende gesammelt
- bestehende Row-Zeilen koennen davon ausgenommen bleiben

##### Ablauf

- die in `#7` ausgekoppelte Quote-Hilfe wiederverwenden
- parsernahe Token-Erkennung aus `collectAtags()` in kleine gemeinsame Helper ziehen, statt sie im Add-on neu zu erfinden
- Rewrite nur auf echte erkannte Tag-Tokens anwenden
- Satzzeichen und normale Woerter im sichtbaren Text moeglichst unveraendert lassen
- bestehende Suffix-Tags erkennen und mit neu gefundenen Tags zusammenfuehren
- Vorher/Nachher-Tests fuer typische Faelle ergaenzen, zum Beispiel
  - `5: erst muede1, spaeter wach2 -> 5: erst muede, spaeter wach ## muede1 wach2`
  - `5: Text ## alt1` plus neuer Inline-Tag fuehrt nicht zu doppeltem `alt1`
  - `Text spazieren#` wird im Plain-Text-Modus in den Endblock uebernommen
  - keine Aenderung innerhalb von Quotes

##### Abgrenzung

- kein blinder String-Replacer
- kein zweiter unabhaengiger Parser
- keine Vereinheitlichung wie `emo2 -> emo+2`
- keine Umschreibung von `#test -> test#` oder umgekehrt
- keine globale Parser-Verhaltensaenderung in diesem Schritt, solange das Add-on die Umschreibung sauber leisten kann
