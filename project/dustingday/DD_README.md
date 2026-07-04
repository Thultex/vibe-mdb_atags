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
DustingInput.DayLinks -> DustingDay
```

Damit kann ein Input-Eintrag dauerhaft seinen Tages-Eintrag halten. Da Memento-Relationen beidseitig abrufbar sind, kann der Tages-Eintrag seine Inputs trotzdem erreichen. Das Datum dient zum Finden oder Erstellen des passenden Tages, `DayLinks` hält danach die Verbindung stabil.

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

1. `DustingInput.DayLinks -> DustingDay` in Memento testen.
2. Beim Speichern eines Inputs passenden `DustingDay` finden oder erstellen.
3. Map-Felder übertragen, z. B. `InNote -> OutNote` und `InTag -> OutTags`.
4. Rows und Tags nur ergänzen, wenn sie noch fehlen.
5. Danach eine Day-Funktion zur Zuordnung/Reparatur aller Inputs bauen.
6. Später mentale Hilfen, hilfreiche Methoden und Lösungsansätze aus Mustern ableiten.

Erstes Add-on:

```text
addons/5_dusting-day/dd-linker.js
appendToDayEntry()
```

## Script-Anschluss in Memento

Das Add-on soll wie die Core-Scripte als GitHub-Referenz geladen werden.

GitHub Raw URL:

```text
https://raw.githubusercontent.com/Thultex/vibe-mdb_atags/main/addons/5_dusting-day/dd-linker.js
```

Anschluss in der Library `DustingInput`:

1. Script/Library-Referenz auf `dd-linker.js` laden.
2. Danach im `DustingInput`-Trigger den Aufruf setzen.
3. Ideal: After Save / After Entry. Fallback: Before Save, wenn Cross-Library-Schreiben dort stabil läuft.

Aufruf:

```js
appendToDayEntry({
  targetLib: "DustingDay",
  sourceDateField: "Date",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  rowMode: "clock",
  rowStepHours: 0.5,
  map: [
    { from: "InNote", to: "OutNote", type: "string" },
    { from: "InTag", to: "OutTags", type: "tag" }
  ]
});
```

Wichtig: Die URL funktioniert erst, wenn `addons/5_dusting-day/dd-linker.js` nach GitHub `main` gepusht wurde.

Sicherheitsregel: Wenn vorhandene `DustingDay`-Einträge das konfigurierte `targetDateField` oder ein Ziel-Mappingfeld nicht besitzen, bricht der Linker ab statt neue falsche Tages-Einträge zu erstellen.

Zielablauf:

```text
DustingInput speichern
  -> passenden DustingDay finden oder erstellen
  -> DustingInput.DayLinks auf DustingDay setzen
  -> DustingDay.OutNote / OutTags über map ergänzen
```

Der produktive Flow geht vom Input-Eintrag aus.

Wenn Inputs aus einem offenen `DustingDay` heraus erstellt werden und der Day nicht sofort sichtbar aktualisiert, kann im `DustingDay`-Eintrag zusätzlich ein Refresh-Aufruf genutzt werden:

```js
refreshDayEntryFromInputs({
  sourceLib: "DustingInput",
  sourceDateField: "Date",
  targetDateField: "Datum",
  sourceDayLinkField: "DayLinks",
  rowMode: "clock",
  rowStepHours: 0.5,
  map: [
    { from: "InNote", to: "OutNote", type: "string" },
    { from: "InTag", to: "OutTags", type: "tag" }
  ]
});
```

Diese Funktion läuft im `DustingDay`-Kontext, findet verlinkte oder datumsgleiche `DustingInput`-Einträge, setzt fehlende `DayLinks` und ergänzt `OutNote` / `OutTags`.
