# Pflege Und Versionierung

Dieses Repo nutzt drei getrennte Ebenen:

- Dateiversion im Kopf einer Script-Datei
- Verlaufseintrag in `CHANGELOG.md`
- kopierbare Aufrufe in `examples.md` und `examples_plugins.md`

Eine funktionale Änderung ist erst sauber dokumentiert, wenn Version, Verlauf und betroffene Beispiele gepflegt wurden.

Die Repo-Struktur ist in Bereiche gegliedert:

- `core/` für Kernmodule
- `addons/` für optionale Erweiterungen
- `tests/` für Host-nahe Testskripte
- Doku-Dateien wie `README.md`, `CHANGELOG.md` und `CONTRIBUTING.md` im Repo-Root

## Datenschutz In Beispielen

Dieses Repo kann oeffentlich geteilt werden. Beispiele in Code, Tests, README und Changelog sollen deshalb keine privaten Namen, echten Vault-/Bibliotheksnamen, persoenlichen Gesundheitsdaten, Alltagsnotizen, Pfade, Kontakte oder realen Inhalte enthalten.

Regeln:

- Fuer Vaults und externe Systeme neutrale Namen wie `ExampleVault`, `ExampleLibrary` oder `ExampleField` verwenden.
- Fuer Tags und Kategorien neutrale Parser-Beispiele wie `SymptomA`, `SymptomB`, `Body`, `BodySafe`, `MetricA`, `TaskA` oder `ActivityA` verwenden.
- Keine echten Obsidian-Vault-Namen, lokalen Benutzerpfade, Telefonnummern, E-Mail-Adressen, Tokens oder persoenlichen Notizen committen.
- Wenn ein Test reale Semantik braucht, die Semantik anonymisieren und nur die technische Struktur erhalten.
- Vor groesseren Doku- oder Testaenderungen kurz mit `rg` nach privaten Begriffen suchen.

## Kompakte Dateiheader

Jede zentrale Script-Datei beginnt mit einem kurzen Kopfblock, zum Beispiel:

```js
/*
========================================
A1 Check Versions v1.71 (sys 3.00)
========================================
*/
```

Regeln:

- Die Modulversion wird erhöht, wenn sich Verhalten, Schnittstelle, Logik oder relevante interne Verarbeitung ändert.
- Reine Textkorrekturen ohne Verhaltensänderung brauchen nicht zwingend einen Versionssprung.
- Changelog, Notizen, Usage und Beispiele stehen nie im Dateiheader.
- Jede Moduldatei hat genau einen Kopfblock; ein zweiter Kopier-Header entfaellt.
- Die Systemversion bleibt unverändert, solange sich nur das einzelne Modul ändert.
- Die Kennung vor dem Namen ist Pflicht: `A` fuer Core, `B` fuer Addons, `C` fuer geloeste eigenstaendige Module. Die Nummer folgt der dokumentierten Repo-Reihenfolge.
- Jedes zentrale Script und jedes optionale Plugin/Add-on stellt eine `get...Version()`-Funktion bereit, z. B. `getDustMergerVersion()`, die `{ name, version, sysVersion, path }` zurückgibt.
- Jedes optionale Plugin/Add-on registriert sich direkt nach der `get...Version()`-Funktion, wenn `registerAtagLibVersion` verfügbar ist: `registerAtagLibVersion(name, version, sysVersion, path, true)`.
- Bekannte optionale Plugins/Add-ons werden in `core/_checkVersions.js` mit `getter` in `ATAG_EXPECTED_OPTIONAL_LIBS` geführt. `_checkVersions` ruft diese Getter generisch auf; keine neuen hartcodierten Sonderfälle anlegen.

## Pflege Von Beispielen

- Core- und Remote-Lib-Beispiele stehen in `examples.md`, geordnet nach `core_lib` und `core` sowie den Modulkennungen.
- Add-on-Beispiele stehen in `examples_plugins.md`, geordnet nach Plugin-Ordnern und darin nach Modulkennungen.
- Neue oder geänderte Konfigurationsoptionen werden in der passenden Beispiel-Datei aktualisiert.
- Beispiele enthalten keine privaten Daten; die Regeln aus „Datenschutz in Beispielen“ gelten unverändert.
- Ausfuehrliche Verhaltens- und Versionsaenderungen gehoeren ausschließlich in `CHANGELOG.md`.

## Versionierung Der Dateien

Die Versionsnummer im Dateikopf ist dateibezogen.

Das bedeutet:

- `core_lib/collectAtags_lib.js`, `core_lib/exportAtags_lib.js`, `core_lib/helpers_lib.js`, `core/restoreAtags.js`, `core/tagCleaner.js`, `addons/1_tagging/tagPairParser.js` und `addons/2_syncing/globalFieldSync.js` dürfen unterschiedliche Versionsstände haben.
- Nur die Datei bekommt einen Versionssprung, die tatsächlich geändert wurde.
- Wenn mehrere Module geändert werden, wird jede betroffene Datei separat angehoben.
- Remote-nutzbare Libs liegen in `core_lib/` und nutzen Header-Kennungen `#1`, `#2`, ... . Sie bieten eine eigene `get...Version()`-Funktion und registrieren sich bei geladenem `registerAtagLibVersion()`.
- `core/_checkVersions.js` ist der Checker/Loader, keine Remote-Lib; `checkAtagLibVersions({ checkAccess: true })` prueft die erwarteten Remote-Libs und ihre aufrufbaren Versionsfunktionen.
- `core/helpers.js` gehoert funktionell zur Lib-Nutzung, bleibt aber Memento-spezifisch, verweist auf `core_lib/helpers_lib.js` und wird nicht in `checkLibVersions()` registriert.
- `core/tagCleaner.js` ist ein Core-Modul, keine Remote-Lib. Es hat eine eigene Versionsfunktion, steht aber nicht in der Remote-Lib-Registry.
- Wenn eine Remote-Lib-Version steigt, `core/_checkVersions.js`, `core_lib/Z_LIB_VERSIONS.md` und die Versionstests mitpruefen.

Beispiele:

- Parser-Fix nur in `core_lib/collectAtags_lib.js`: nur `collectAtags` bekommt die nächste Version.
- Export-Änderung nur in `core_lib/exportAtags_lib.js`: nur `exportAtags` bekommt die nächste Version.

## Changelog-Regeln

`CHANGELOG.md` ist der Repo-Verlauf und zugleich das fortlaufende Arbeits-/Zeitprotokoll.

Für jeden funktionalen Eintrag:

- Datum im Format `YYYY-MM-DD`
- Dauer im Header als `### YYYY-MM-DD - (ca. 2,3h)` erfassen; geschätzte Tagesdauern immer mit `ca.` markieren
- für neue Arbeit Dauer möglichst direkt messen; nachträglich nur schätzen, wenn keine Messung vorhanden ist
- für Schätzungen aktive Arbeitszeit ansetzen; nachvollziehbare Aktivität zählt mit, auch ohne Commit. Leere Zeitlücken über 1 Stunde nur ausnehmen, wenn dort weder Commits noch andere nachvollziehbare Aktivität liegen
- bei mehreren Sessions optional die Anzahl notieren, z. B. `(ca. 2,2h, 3x)`; wenn gar nichts nachvollziehbar ist, `(n/a)` verwenden
- unter `Stats` zuerst `Ausgangsdatum: YYYY-MM-DD` notieren
- danach feste Stats-Abschnitte nutzen: `Diese Woche`, `Letzte Woche`, `Dieser Monat`, `Letzter Monat`, `Jahr`, `Insgesamt`
- Stats-Abschnitte im Format `*Abschnitt (Dauer, Tage, Inhalte):*` schreiben; dort muss `ca.` nicht wiederholt werden, auch wenn einzelne Tageswerte geschätzt sind. Darunter eine kurze spezifische Themenzeile, keine Tabelle
- `Stats`-Inhalte nach Relevanz sortieren: große Umbauten und verhaltensrelevante Themen vor Doku/Formalia
- Einträge stehen unter `## Log`; jeder Tagesblock ist ein `###`-Punkt
- gleiche Tage in einem Eintrag zusammenziehen; die Dauer ist die Tagesgesamtzeit, optional mit Session-Anzahl
- ab 7 Punkten im Tagesblock als ersten Punkt eine kurze kursiv gesetzte Zeile `*Summary: ...*` ergänzen
- `Summary:` von entscheidend zu weniger entscheidend schreiben: große Umbauten zuerst, danach Features/Fixes, Doku/Formalia zuletzt
- normale Änderungen als kurze Stichpunkte mit Typ schreiben, z. B. `- Feature: Cleaner erweitert/reduziert Aliase (#51); Details`
- Datei oder Modul nennen, wo es hilfreich ist
- Wirkung der Änderung beschreiben
- Test oder Doku kurz erwähnen, wenn ergänzt
- Versionssprünge nicht einzeln als eigene Hauptpunkte aufführen
- Versionen nur bei Bedarf immer als kursiv gesetzten letzten Stichpunkt des Tages kurz sammeln, z. B. `- *Versionen: collectAtags v1.58, exportAtags v1.83, tagCleaner v1.42*`
- bei `Versionen:` pro Datei nur den aktuellen/finalen Versionssprung des Tages nennen, keine Zwischenversionen

Empfohlene Form:

```txt
### 2026-04-22 - (ca. 0,4h)
- *Summary: Parser-Fixes und Tests für Zahlen- und Colon-Werte.*
- Fix: Parser erkennt negative Zahlenformen wieder korrekt; Details.
- Fix: Parser erkennt Colon-Werte im JScript-Host wieder korrekt; `tag: 5`.
- Test/Doku: `tests/test_collectAtags.js` ergänzt.
- *Versionen: collectAtags v1.22.*
```
## Wann Changelog Pflicht Ist

Changelog pflegen bei:

- Parser- oder Export-Verhalten ändert sich
- neue unterstützte Formate oder Tag-Formen hinzukommen
- Bugfixes das Ergebnis sichtbar verändern
- Tests oder wichtige Doku für die Änderung ergänzt werden
- Issue-bezogene Arbeit abgeschlossen oder dokumentiert wird

Im Zweifel lieber dokumentieren.

## Test-Und Verifikations-Regeln

Tests und Verifikation sollen zur Groesse und zum Risiko der Aenderung passen.

Regeln:

- Besonders bei Add-ons vorab pruefen, ob ein eigener Test wirklich wichtig ist.
- Eigene Add-on-Tests sind vor allem sinnvoll bei Parser-/Regex-Logik, Idempotenz, Datenverlust-Risiko, Feld-Schreiblogik, Memento/WSH-Kompatibilitaet oder mehreren relevanten Verzweigungen.
- Ein Smoke-Test oder vorhandener Test reicht oft bei einfachen Wrappern, Anzeige-Helfern oder kleinen, gut sichtbaren Transformationen.
- Nicht fuer jede kleine oder klar lokale Aenderung automatisch eine neue Testdatei anlegen.
- Bestehende Tests bevorzugt erweitern, wenn dort schon passender Schutz existiert.
- Neue Tests vor allem dann anlegen, wenn Verhalten riskant ist, leicht wieder kaputtgehen kann oder mehrere Pfade absichert.
- Kleine Aenderungen duerfen auch nur mit Syntax-Check, kurzer Laufzeitpruefung oder gezielter manueller Verifikation abgeschlossen werden.
- Wenn kein extra Test angelegt wird, reicht im Changelog oder in der Abschlussnotiz ein kurzer Verifikationshinweis.

## Abschluss-Check

Vor Abschluss einer Änderung kurz prüfen:

- betroffene Datei-Version erhöht
- Kurzinfo im Dateikopf ergänzt oder angepasst
- `CHANGELOG.md` mit Dauer und Kurz-Zusammenfassung ergänzt
- Test oder Verifikationshinweis vorhanden
- README angepasst, wenn sich Nutzung oder unterstützte Formen ändern
- Usage-/Beispielblöcke in betroffenen Script-Dateien angepasst, wenn Konfigurationsoptionen, Signaturen oder typische Aufrufe geändert wurden

Optionaler Repo-Check:

- `powershell -ExecutionPolicy Bypass -File .\check_versioning.ps1`
- prüft bei geänderten Moduldateien, ob die Dateiversion erhöht wurde und ob `CHANGELOG.md` mit geändert ist


