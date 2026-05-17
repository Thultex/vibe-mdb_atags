# Atag Libraries

Aktuelle Library-Dateien und Versionen:

| Name | Version | Sys | Pfad |
| --- | ---: | ---: | --- |
| libVersions | 1.00 | 2.30 | `core/libVersions.js` |
| helpers_lib | 2.10 | 2.30 | `core_lib/helpers_lib.js` |
| collectAtags_lib | 1.53 | 2.30 | `core_lib/collectAtags_lib.js` |
| exportAtags_lib | 1.79 | 2.30 | `core_lib/exportAtags_lib.js` |

## Zugehoerige Memento-Dateien

Diese Dateien gehoeren funktionell zur Lib-Nutzung, sind aber keine externen Remote-Libs und werden deshalb nicht von `checkLibVersions()` erwartet.

| Name | Version | Sys | Pfad | Zweck |
| --- | ---: | ---: | --- | --- |
| helpers_mem | 1.00 | 2.30 | `core/helpers_mem.js` | Memento-Wrapper fuer `applyTags`, `bulkApplyTags` und `bulkExportAtags` |

Empfohlene Lade-Reihenfolge:

1. `core/libVersions.js`
2. `core_lib/helpers_lib.js`
3. `core_lib/collectAtags_lib.js`
4. `core_lib/exportAtags_lib.js`
5. `core/helpers_mem.js` nur wenn Memento-Wrapper wie `applyTags` gebraucht werden

`core/tagCleaner.js` ist ein Core-Modul, keine externe Lib. Es hat eine eigene `getTagCleanerVersion()`-Funktion, wird aber nicht von `checkLibVersions()` als Remote-Lib erwartet.
`core/helpers_mem.js` ist ebenfalls keine externe Lib. Es enthaelt Memento-Wrapper wie `applyTags`, `bulkApplyTags` und `bulkExportAtags` und wird deshalb nicht in `checkLibVersions()` registriert.

Zur Laufzeit kann `checkLibVersions()` die geladenen Remote-Libs pruefen. Jede Remote-Lib bietet ausserdem eine eigene `get...Version()`-Funktion; die zugehoerigen Core-/Memento-Dateien haben eigene Versionsfunktionen, werden aber nicht in der Remote-Lib-Registry gefuehrt.
