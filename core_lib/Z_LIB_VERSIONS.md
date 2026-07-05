# Atag Libraries

Aktuelle Library-Dateien und Versionen:

| Name | Version | Sys | Pfad |
| --- | ---: | ---: | --- |
| #1 collectAtags_lib | 1.60 | 2.30 | `core_lib/collectAtags_lib.js` |
| #2 exportAtags_lib | 1.83 | 2.30 | `core_lib/exportAtags_lib.js` |
| #3 helpers_lib | 2.11 | 2.30 | `core_lib/helpers_lib.js` |
| #4 inputLinker_lib | 0.75 | 2.30 | `core_lib/inputLinker_lib.js` |

## Checker

`core/_checkLibs.js` ist keine Remote-Lib, sondern der Versions-Checker.

| Name | Version | Sys | Pfad |
| --- | ---: | ---: | --- |
| A1 libVersions | 1.16 | 2.30 | `core/_checkLibs.js` |

## Zugehoerige Memento-Dateien

Diese Dateien gehoeren funktionell zur Lib-Nutzung, sind aber keine externen Remote-Libs und werden deshalb nicht von `checkLibVersions()` erwartet.

| Name | Version | Sys | Pfad | Zweck |
| --- | ---: | ---: | --- | --- |
| A2 helpers | 1.02 | 2.30 | `core/helpers.js` | Memento-Wrapper fuer `applyTags`, `bulkApplyTags` und `bulkExportAtags`; nutzt `core_lib/helpers_lib.js` |

Empfohlene Lade-Reihenfolge:

1. `core/_checkLibs.js` fuer `checkAtagLibVersions()` und `checkLibVersions()`
2. `core_lib/helpers_lib.js`
3. `core_lib/collectAtags_lib.js`
4. `core_lib/exportAtags_lib.js`
5. `core_lib/inputLinker_lib.js` optional, wenn Library-Einträge verlinkt/aggregiert werden sollen
6. `core/helpers.js` nur wenn Memento-Wrapper wie `applyTags` gebraucht werden

`core/tagCleaner.js` ist ein Core-Modul, keine externe Lib. Es hat eine eigene `getTagCleanerVersion()`-Funktion, wird aber nicht von `checkLibVersions()` als Remote-Lib erwartet.
`core/helpers.js` ist ebenfalls keine externe Lib. Es enthaelt Memento-Wrapper wie `applyTags`, `bulkApplyTags` und `bulkExportAtags`, nutzt `core_lib/helpers_lib.js` und wird deshalb nicht in `checkLibVersions()` registriert.

Zur Laufzeit kann `checkLibVersions()` die geladenen Remote-Libs pruefen. Jede Remote-Lib bietet ausserdem eine eigene `get...Version()`-Funktion; die zugehoerigen Core-/Memento-Dateien haben eigene Versionsfunktionen, werden aber nicht in der Remote-Lib-Registry gefuehrt.

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
  names: ["helpers_lib", "collectAtags_lib", "exportAtags_lib", "inputLinker_lib"],
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




