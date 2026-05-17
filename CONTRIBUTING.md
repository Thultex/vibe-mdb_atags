# Pflege Und Versionierung

Dieses Repo nutzt zwei Ebenen von Versionsinfo:

- Dateiversion im Kopf einer Script-Datei
- Verlaufseintrag in `CHANGELOG.md`

Eine funktionale Änderung ist erst sauber dokumentiert, wenn beide Stellen gepflegt wurden.

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

## Kurze Versionsinfos Im Dateikopf

Jede zentrale Script-Datei beginnt mit einem kurzen Kopfblock, zum Beispiel:

```js
/*
========================================
A1 collectAtags v1.22 (sys 2.21)
========================================

Änderungen
- Fix ...
*/
```

Regeln:

- Die Modulversion wird erhöht, wenn sich Verhalten, Schnittstelle, Logik oder relevante interne Verarbeitung ändert.
- Reine Textkorrekturen ohne Verhaltensänderung brauchen nicht zwingend einen Versionssprung.
- Der Block `Änderungen` enthält kurze, konkrete Punkte mit Wirkung.
- Die Systemversion `sys 2.21` bleibt unverändert, solange sich nur das einzelne Modul ändert.
- Die Kennung vor dem Namen ist Pflicht: `A` fuer Core, `B` fuer Addons, `C` fuer geloeste eigenstaendige Module. Die Nummer folgt der dokumentierten Repo-Reihenfolge.

## Aktuelle Form Der Dateiheader

Die Header sollen sich an der aktuellen Repo-Form orientieren und nicht frei neu erfunden werden.

Typische Form im Repo heute:

```js
/*
========================================
A1 collectAtags v1.22 (sys 2.21)
========================================

Änderungen
- Verhalten wieder näher am alten Parser
- normale Wörter werden nicht mehr als Tags erkannt

Anwendung

var result = collectAtags({
  entryObj: entry(),
  textFields: ["Alias", "Notiz"]
});

...
*/
```

Weitere reale Beispiele:

```js
/*
========================================
A2 exportAtags v1.33 (sys 2.21)
========================================

Änderungen
- nutzt ausgelagerte Helper aus Atag Helpers
- Export für:
  - tags
  - text
  - md
  - rows_md
  - rows_html
  - json
*/
```

```js
/*
========================================
A3 Atag Helpers v1.01 (sys 2.21)
========================================

Änderungen
- vollständig: alle vom Exporter benötigten Helper enthalten
- zentrale Wrapper + Bulk integriert

Anwendung

bulkApplyTags() gibt ein result-Array zurück.
*/
```

Pflege-Regeln für diese Headerform:

- Die erste Zeile bleibt ein klassischer Blockkommentar `/*`.
- Darunter stehen immer Titelzeile, Versionszeile und die schließende Linie aus `=` in derselben Grundform.
- `========================================`-Linien werden nur im Titelblock oben verwendet, nicht in der Mitte des Kommentars und nicht als Abschluss direkt vor `*/`.
- Die Modulbezeichnung im Header muss zum tatsächlichen Dateizweck passen, zum Beispiel `collectAtags`, `exportAtags` oder `Atag Helpers`.
- Nach der Versionszeile folgt ein Leerblock und dann mindestens der Abschnitt `Änderungen`.
- Wenn die Datei bereits weitere Blöcke wie `Anwendung`, `Beispiele` oder ähnliche Dokumentationsabschnitte hat, bleiben diese erhalten und werden bei Bedarf mit gepflegt.
- Neue Änderungen werden im Abschnitt `Änderungen` oben ergänzt, damit die jüngste Änderung zuerst sichtbar ist.
- Die Punkte im Abschnitt `Änderungen` bleiben kurz, konkret und nutzen die vorhandene Schreibweise der Datei.
- Beispiele in `Anwendung` oder `Beispiele` werden angepasst, wenn sich Signatur, typische Nutzung oder unterstützte Formen geändert haben.
- Neue oder geänderte Konfigurationsoptionen werden in den jeweiligen Usage-/Beispielblöcken der betroffenen Datei mit korrigiert, damit kopierbare Beispiele aktuell bleiben.
- In Script-Dateiheadern keine `//`-Zeilenkommentare innerhalb von `/* ... */` verwenden. Memento kann solche Header beim Kopieren oder Einbinden fehlerhaft auswerten. Beispiele im Blockkommentar als normalen Text oder reine Codezeilen ohne `//` schreiben.
- Wenn ein Header stark gewachsen ist, wird er gekürzt, aber nicht in ein neues freies Format umgebaut.
- Ziel ist Konsistenz zwischen den Dateien, nicht perfekte Einheitlichkeit auf Kosten der vorhandenen Struktur.

## Versionierung Der Dateien

Die Versionsnummer im Dateikopf ist dateibezogen.

Das bedeutet:

- `core/collectAtags.js`, `core/exportAtags.js`, `core/helpers.js`, `core/restoreAtags.js`, `addons/1_tagging/tagPairParser.js` und `addons/2_syncing/globalFieldSync.js` dürfen unterschiedliche Versionsstände haben.
- Nur die Datei bekommt einen Versionssprung, die tatsächlich geändert wurde.
- Wenn mehrere Module geändert werden, wird jede betroffene Datei separat angehoben.

Beispiele:

- Parser-Fix nur in `core/collectAtags.js`: nur `collectAtags` bekommt die nächste Version.
- Export-Änderung nur in `core/exportAtags.js`: nur `exportAtags` bekommt die nächste Version.

## Changelog-Regeln

`CHANGELOG.md` ist der Repo-Verlauf.

Für jede funktionale Änderung:

- Datum im Format `YYYY-MM-DD`
- Datei oder Modul nennen
- Versionssprung nennen
- Wirkung der Änderung beschreiben
- Test oder Doku kurz erwähnen, wenn ergänzt

Empfohlene Form:

```txt
2026-04-22
- collectAtags auf v1.22 angehoben
- Fix: negative Zahlenformen werden wieder korrekt erkannt
- Fix: colon-Werte wie tag: 5 werden im JScript-Host wieder korrekt als Wert gelesen
- Test/Doku: `tests/test_collectAtags.js` ergänzt
```

## Wann Changelog Pflicht Ist

Changelog pflegen bei:

- Parser- oder Export-Verhalten ändert sich
- neue unterstützte Formate oder Tag-Formen hinzukommen
- Bugfixes das Ergebnis sichtbar verändern
- Tests oder wichtige Doku für die Änderung ergänzt werden

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
- `CHANGELOG.md` ergänzt
- Test oder Verifikationshinweis vorhanden
- README angepasst, wenn sich Nutzung oder unterstützte Formen ändern
- Usage-/Beispielblöcke in betroffenen Script-Dateien angepasst, wenn Konfigurationsoptionen, Signaturen oder typische Aufrufe geändert wurden

Optionaler Repo-Check:

- `powershell -ExecutionPolicy Bypass -File .\check_versioning.ps1`
- prüft bei geänderten Moduldateien, ob die Dateiversion erhöht wurde und ob `CHANGELOG.md` mit geändert ist
