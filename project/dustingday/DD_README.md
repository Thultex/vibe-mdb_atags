# Dustingday

Dustingday ist ein Projekt für einfache Tageserfassung aus sehr kleinen Memento-Einträgen.

Ziel ist, im Alltag Symptome und Befinden zu erfassen, Erfolge zu dokumentieren, hilfreiche Methoden sichtbar zu machen und daraus konkrete Hilfen an die Hand zu geben.

Das soll kurz, strukturiert und mit schnellem Zugriff funktionieren. Dustingday ist damit zugleich Alltagshilfe und Dokumentation: Der Tag wird greifbar, ohne dass die Erfassung selbst zu schwer wird.

Dosis bleibt als Nebenfaktor möglich, aber der Fokus liegt auf Zustand, Wirkung, Erfolg, Methode und Hilfe.

## Kernidee

Viele kleine Einträge werden über Datum/Zeit einem Tag zugeordnet. Der Tages-Eintrag liest diese Einträge beim Aufruf ein und erzeugt daraus eine zusammenhängende Tagesnotiz.

Minimaler Eintrag:

- `Datum/Zeit`
- `innote`
- `intag`
- Relation zum Tages-Eintrag

Aus der Uhrzeit entsteht die Row. Aus `innote` und `intag` entstehen Tags, Werte und gekoppelte Informationen.

Erster technischer Schritt ist ein Relation-Feld:

```text
DustingDay.InLinks -> DustingDayInput
```

Damit kann ein Tages-Eintrag dauerhaft seine Einzel-Einträge halten. Da Memento-Relationen beidseitig abrufbar sind, braucht der Input-Eintrag kein eigenes Gegenfeld. Das Datum dient zum Finden oder Erstellen des passenden Tages, `InLinks` hält danach die Verbindung stabil.

## Dateien

- `plan.md`: persönliche Notiz und rohe Projektidee.
- `vibe-plan.md`: Codex-Arbeitsplan mit technischen Annahmen, offenen Fragen und nächsten Schritten.
- `stuct.md`: funktionelle Strukturüberlegung auf Modul- und Datenfluss-Ebene.

## Beispiel

```text
Eintrag 03:30
innote: 40mg, #müde
intag: mg 40

Eintrag 05:02
innote: stress3, tätigkeit: laufen
intag: müde 3
```

Wird ungefähr zu:

```text
Dosis: 40mg

3,5: müde
5: stress3, müde3, tätigkeit: laufen
```

## Erste Entwicklungsrichtung

1. `DustingDay.InLinks -> DustingDayInput` in Memento testen.
2. Aus manuell verlinkten Inputs eine `OutNote` bauen.
3. Danach passende Inputs anhand von `Datum` / `Date` automatisch finden.
4. Danach `InLinks` automatisch pflegen.
5. Danach Tags aus `InTag` nach `DustingDay.Tags` übertragen.
6. Später mentale Hilfen, hilfreiche Methoden und Lösungsansätze aus Mustern ableiten.

Erstes Add-on:

```text
addons/5_dusting-day/dustingDayCollector.js
updateDustingDayOutNote()
```

## Script-Anschluss in Memento

Das Add-on soll wie die Core-Scripte als GitHub-Referenz geladen werden.

GitHub Raw URL:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/addons/5_dusting-day/dustingDayCollector.js
```

Manueller Test-Anschluss in der Library `DustingDay`:

1. Script/Library-Referenz auf `dustingDayCollector.js` laden.
2. Danach im `DustingDay`-Trigger den Aufruf setzen.
3. Für den ersten Test `Update Entry Before Save` verwenden.

Aufruf:

```js
updateDustingDayOutNote({
  inLinksField: "InLinks",
  outputField: "OutNote",
  inputDateField: "Date",
  inputNoteField: "InNote",
  inputTagField: "InTag"
});
```

Debug-Aufruf, wenn nichts sichtbar passiert:

```js
debugDustingDayCollector({
  inLinksField: "InLinks",
  outputField: "Debug",
  inputDateField: "Date",
  inputNoteField: "InNote",
  inputTagField: "InTag"
});
```

Dieser Aufruf schreibt sichtbar in `Debug`, wie `InLinks` im Script ankommt und welche Felder aus den verlinkten Inputs gelesen werden. So bleibt `OutNote` frei für die eigentliche Tagesausgabe.

Wichtig: Die URL funktioniert erst, wenn `addons/5_dusting-day/dustingDayCollector.js` nach GitHub `main` gepusht wurde.

Der eigentliche Alltags-Anschluss gehört später in `DustingDayInput`, weil dort ein neuer Eintrag entsteht.

Zielablauf:

```text
DustingDayInput speichern
  -> passenden DustingDay finden oder erstellen
  -> Input in DustingDay.InLinks sammeln
  -> DustingDay.OutNote neu bauen
```

Der `DustingDay`-Trigger ist damit nur ein manueller Refresh/Testpfad. Der produktive Flow soll vom Input-Eintrag ausgehen.
