# Atag Libraries

Aktuelle Library-Dateien und Versionen:

| Name | Version | Sys | Pfad |
| --- | ---: | ---: | --- |
| #1 collectAtags_lib | 1.65 | 2.50 | `core_lib/collectAtags_lib.js` |
| #2 exportAtags_lib | 1.84 | 2.50 | `core_lib/exportAtags_lib.js` |
| #3 helpers_lib | 2.11 | 2.50 | `core_lib/helpers_lib.js` |

## Checker

`core/_checkLibs.js` ist keine Remote-Lib, sondern der Versions-Checker.

| Name | Version | Sys | Pfad |
| --- | ---: | ---: | --- |
| A1 libVersions | 1.41 | 2.50 | `core/_checkLibs.js` |

Optionale Plugins/Addons koennen sich beim Laden per `registerAtagLibVersion(name, version, sysVersion, path, true)` registrieren und in `ATAG_EXPECTED_OPTIONAL_LIBS` einen `getter` besitzen. Mismatch- und Missing-Meldungen ueber fehlende Getter/Module werden getrennt ueber `SHOW_REMOTE_MISSMATCHES`, `SHOW_LOCAL_MISSMATCHES`, `SHOW_REMOTE_MISSING` und `SHOW_LOCAL_MISSING` gesteuert.

## Zugehoerige Memento-Dateien

Diese Dateien gehoeren funktionell zur Lib-Nutzung, sind aber keine externen Remote-Libs und werden deshalb nicht von `checkLibVersions()` erwartet.

| Name | Version | Sys | Pfad | Zweck |
| --- | ---: | ---: | --- | --- |
| A2 helpers | 1.03 | 2.50 | `core/helpers.js` | Memento-Wrapper fuer `applyTags`, `bulkApplyTags` und `bulkExportAtags`; nutzt `core_lib/helpers_lib.js` |
| A3 restoreAtags | 2.10 | 2.50 | `core/restoreAtags.js` | Restore aus Atag-JSON in Felder |
| A4 tagCleaner | 1.51 | 2.50 | `core/tagCleaner.js` | Cleaner-/Alias-Memento-Wrapper |
| B2 tagPairParser | 1.02 | 2.50 | `addons/1_tagging/tagPairParser.js` | Tag-Paare aus Tag-Feldern |
| B3 globalFieldSync | 1.04 | 2.50 | `addons/2_syncing/globalFieldSync.js` | Feld-Sync innerhalb einer Library |
| B4 syncLastFromLatest | 1.06 | 2.50 | `addons/2_syncing/syncLastFromLatest.js` | Felder vom neuesten Eintrag uebernehmen |
| B5 floatingAverage | 1.01 | 2.50 | `addons/3_workflow/floatingAverage.js` | Gleitender Mittelwert |
| B6 sequenceCounter | 1.06 | 2.50 | `addons/3_workflow/sequenceCounter.js` | Sequenz-/Spree-Zaehler |
| B7 timeMarker | 1.40 | 2.50 | `addons/3_workflow/timeMarker.js` | Zeitmarker in Textfeldern |
| B8 obsidianLinker | 1.17 | 2.50 | `addons/6_integration/obsidianLinker.js` | Memento-/Obsidian-Linking |
| B9 wikiLinker | 1.01 | 2.50 | `addons/6_integration/wikiLinker.js` | Wikipedia-Suchlinks |
| B10 dustMerger | 0.13 | 2.50 | `addons/2_syncing/dustMerger.js` | Zeitnahes Mergen von Eintraegen |
| C1 multiChoiceHelpers | 1.02 | 2.50 | `addons/z_generell/multiChoiceHelpers.js` | Multi-Choice-Helfer |
| C2 typedTextFields | 1.01 | 2.50 | `addons/z_generell/typedTextFields.js` | Typisierte Textfeld-Sync-Helfer |
| C3 hourGuide | 1.31 | 2.50 | `addons/z_others/hourGuide.js` | Stundenhilfe-Rendering |

Empfohlene Lade-Reihenfolge:

1. `core/_checkLibs.js` fuer `checkAtagLibVersions()` und `checkLibVersions()`
2. `core_lib/helpers_lib.js`
3. `core_lib/collectAtags_lib.js`
4. `core_lib/exportAtags_lib.js`
5. `core/helpers.js` nur wenn Memento-Wrapper wie `applyTags` gebraucht werden

`core/tagCleaner.js` ist ein Core-Modul, keine externe Lib. Es hat eine eigene `getTagCleanerVersion()`-Funktion und registriert sich als optionales lokales Modul.
`core/helpers.js` ist ebenfalls keine externe Lib. Es enthaelt Memento-Wrapper wie `applyTags`, `bulkApplyTags` und `bulkExportAtags`, nutzt `core_lib/helpers_lib.js` und registriert sich als optionales lokales Modul.

Zur Laufzeit kann `checkLibVersions()` die geladenen Remote-Libs pruefen. Jede Remote-Lib bietet ausserdem eine eigene `get...Version()`-Funktion; die zugehoerigen Core-/Memento-Dateien haben eigene Versionsfunktionen, werden aber nicht in der Remote-Lib-Registry gefuehrt.

`checkAtagLibVersions()` listet im Standardreport die erwarteten Remote-Core-Libs und darunter geladene bekannte lokale Module als `LOCAL ...`. Die Text-/Verbose-Ausgabe beginnt bei sauberem Stand mit `System Version X.XX (ok, X libs, X local)`. Bei Befunden ist die erste Zeile kompakt, z. B. `System Version X.XX (missmatch, X libs, X local)`, `System Version X.XX (missing, X missing)` oder kombiniert `missmatch/missing`. Die Ausgabe endet mit einer Leerzeile. Bekannte optionale Addons/Plugins werden per Registry oder `get...Version()`-Getter geprüft; Versions- und Sys-Mismatches erscheinen in `versionMismatch` und in der Text-/Verbose-Ausgabe. Missing-Meldungen fuer Remote-/Local-Getter haengen an `SHOW_REMOTE_MISSING` und `SHOW_LOCAL_MISSING`. Bei spaeterer Registrierung wird ein bekannter Plugin-Mismatch direkt geloggt.

## Beispiel

Nach dem Laden der Remote-Libs kann automatisch geprueft werden:

```js
var libCheck = checkAtagLibVersions({
  checkAccess: true
});

if (!libCheck.ok) {
  throw "Missing atag libs: " + libCheck.missing.join(", ");
}
```

Als Textausgabe:

```js
checkLibVersions({
  names: ["helpers_lib", "collectAtags_lib", "exportAtags_lib"],
  asText: true
});
```

Direkt in Memento kann die ausführlichere Ausgabe ins Log geschrieben werden:

```js
checkAtagLibVersions({
  checkAccess: true,
  verbose: true
});
```

`core/helpers.js` kann danach geladen werden, wenn Memento-Wrapper wie `applyTags()` gebraucht werden. Es wird dabei bewusst nicht in `checkLibVersions()` aufgefuehrt.
