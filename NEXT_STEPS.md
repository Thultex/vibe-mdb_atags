# Next Steps

## Index

- Later
  - `#7` Quote-Checks in `collectAtags()` vorkalkulieren
  - `#8` `addons/normalizeAtagText.js`

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
- Parser-Verhalten unverändert lassen

##### Ablauf

- in `core/collectAtags.js` den bisherigen `isInsideQuotes(str, pos)`-Pfad durch vorberechnete Quote-Information pro `parseLine` ersetzen
- die neue Quote-Hilfe so klein halten, dass sie später auch von einem Text-Rewrite-Add-on genutzt werden kann
- keine größere Parser-Refaktorierung im selben Schritt
- bestehende Parser-Tests laufen lassen und bei Bedarf um einen gezielten Quote-Fall ergänzen

##### Warum zuerst

- das reduziert Risiko und doppelte Logik für spätere Text-Umschreibungen
- `#8` soll dieselbe Quote-Regel wiederverwenden statt eine zweite Heuristik einzuführen

#### `#8` `addons/normalizeAtagText.js`

##### Ziel

- Tag-Schreibweisen im Ursprungsfeld kontrolliert vereinheitlichen
- nur echte erkannte Tag-Tokens umschreiben
- Quotes, Alias-Zeilen, Row-Prefixe und normalen Freitext unverändert lassen

##### Geplanter Scope

- neues Add-on `addons/normalizeAtagText.js`
- Optionen
  - `unifyShortTags: null | "sign" | "hash"`
  - `unifyHashTags: null | "hash-first" | "hash-last"`
- bevorzugt mit `sourceTextField` und `targetTextField`, damit das Rewrite zuerst sicher in ein Zielfeld getestet werden kann

##### Ablauf

- die in `#7` ausgekoppelte Quote-Hilfe wiederverwenden
- parsernahe Token-Erkennung aus `collectAtags()` in kleine gemeinsame Helper ziehen, statt sie im Add-on neu zu erfinden
- Rewrite nur auf echte Tag-Tokens anwenden
- Vorher/Nachher-Tests für typische Fälle ergänzen, zum Beispiel
  - `emo2 -> emo+2` oder `emo#2`
  - `#test -> test#`
  - `test# -> #test`
  - keine Änderung innerhalb von Quotes

##### Abgrenzung

- kein blinder String-Replacer
- kein zweiter unabhängiger Parser
- keine globale Parser-Verhaltensänderung in diesem Schritt, solange das Add-on die Umschreibung sauber leisten kann
