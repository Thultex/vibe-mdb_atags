# DustMerger Übergangsplan

## Ziel

Das alte DustingDay-Konzept mit separater Input- und Day-Sammlung wird abgelöst. Neue Dusting-Einträge bleiben in einer Library und werden bei Bedarf in zeitlich nahe ältere Einträge gemerged.

## Übergang

1. Altes Projektmaterial unter `project/dustingday` entfernen.
2. `inputLinker_lib.js` aus der Core-Lib-Schiene entfernen; historische Hinweise bleiben nur im Changelog/Error-Notes.
3. Neues Sync-Addon `addons/2_syncing/dustMerger.js` erstellen.
4. Tests für den Merger ergänzen.
5. README auf den neuen DustMerger-Pfad aktualisieren.

## DustMerger Grundlogik

- Der aktuelle Eintrag ist der Merge-Auslöser.
- Es werden die letzten `searchLimit` nicht bereits gemergten Einträge derselben Library nach Datum geprüft.
- Ist ein älterer Eintrag am gleichen Dusting-Tag und höchstens `mergeWindowHours` Stunden vor dem aktuellen Eintrag, wird der aktuelle Eintrag in diesen älteren Eintrag gemerged.
- Der Dusting-Tag kann mit `dayStartHour` verschoben werden.
- Ein optionales Hakenfeld (`skipField`) kann den Merge für den aktuellen Eintrag unterbinden.
- Ein optionales Override-Feld (`forceMergeField`) kann einen normalen neuen Merge erzwingen, auch wenn der aktuelle Eintrag im eigenen oder Ziel-JSON schon als gemerged vermerkt ist. Das Ziel bleibt der letzte valide ältere Eintrag, nicht zwingend der alte JSON-Verweis.
- Einträge, die im eigenen `mergeJsonField` einen Stop-Marker tragen, werden als Quelle und Ziel übersprungen. Diese übersprungenen Einträge zählen nicht gegen `searchLimit`.
- Nach erfolgreichem Merge kann der aktuelle, neuere Eintrag optional in den Papierkorb verschoben werden.
- Der Stop-Marker im Quell-JSON enthält zusätzlich den letzten Trash-Status (`trashAttempted`, `trashed`). Ein separates Flag-Feld ist dafür nicht nötig.
- Der ältere Ziel-Eintrag kann optional geöffnet werden.
- Für `string_rows` kann `rowSourceMode: "realtime_since"` relative Quell-Rows auf das Ziel-Datum umrechnen. Dadurch wird ein `0:` aus einem neueren Quell-Eintrag nach dem Merge z. B. zu `1,5:`, wenn der Ziel-Eintrag 1,5 Stunden früher liegt.

## Map

`map` beschreibt, welche Felder übertragen werden:

```js
dustMerge({
  fieldDate: "Datum",
  titleField: "Titel",
  mergeJsonField: "Merge Json",
  debugField: "Debug",
  searchLimit: 5,
  mergeWindowHours: 4,
  skipField: "Nicht mergen",
  trashMergedEntry: true,
  openTargetEntry: true,
  map: [
    { name: "Notiz", mode: "append", datatype: "string_rows" },
    { name: "Record", mode: "prepend", datatype: "string_rows" },
    { name: "Tags", mode: "append", datatype: "tag" }
  ],
  blockMap: [
    { name: "Status" }
  ]
});
```

Unterstützte `mode`-Werte:

- `append`
- `prepend`
- `replace`
- `string`
- `add`
- `subtract`

Unterstützte `datatype`-Werte:

- `string`
- `string_rows`
- `tag`
- `number`

## Blockmap

`mergeJsonField` erfüllt zwei Aufgaben: Im Ziel verhindert es, dass derselbe Quell-Eintrag erneut in denselben Ziel-Eintrag gemerged wird. Im Quell-Eintrag wird nach erfolgreichem Merge zusätzlich ein Stop-Marker geschrieben; dadurch wird dieser Eintrag bei späteren Suchläufen übersprungen, auch wenn Mementos Papierkorbstatus nicht zuverlässig lesbar ist.

`debugField` ist optional und schreibt den letzten Merger-Status in den aktuellen Quell-Eintrag.

`blockMap` kann einen Merge verhindern, wenn ein Feld im Ziel bereits belegt ist oder ein optionales Regex nicht passt.

```js
blockMap: [
  { name: "Status" },
  { name: "Notiz", blockRegex: "^\\s*$" }
]
```

## Offene Entscheidungen

- Ob der Block standardmäßig auf Ziel oder Quelle geprüft werden soll. Der erste Prototyp blockt Ziel-Felder, weil der Merger in den älteren Eintrag schreibt.
- Ob ein Merge-Button auf dem neuen Eintrag reicht oder zusätzlich ein Bulk-Merge sinnvoll wird.
- Ob `mergeJsonField` später in ein echtes JSON-Feld oder weiter in ein Textfeld geschrieben wird.
