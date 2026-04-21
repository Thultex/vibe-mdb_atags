# Pflege Und Versionierung

Dieses Repo nutzt zwei Ebenen von Versionsinfo:

- Dateiversion im Kopf einer Script-Datei
- Verlaufseintrag in `CHANGELOG.md`

Eine funktionale Änderung ist erst sauber dokumentiert, wenn beide Stellen gepflegt wurden.

Die Repo-Struktur bleibt bewusst flach, solange der Umfang klein bleibt. Doku-Dateien, Kern-Skripte und kleine Tests liegen daher gemeinsam im Root.

## Kurze Versionsinfos Im Dateikopf

Jede zentrale Script-Datei beginnt mit einem kurzen Kopfblock, zum Beispiel:

```js
/*
========================================
collectAtags v1.22 (sys 2.00)
========================================

Änderungen
- Fix ...
*/
```

Regeln:

- Die Modulversion wird erhöht, wenn sich Verhalten, Schnittstelle, Logik oder relevante interne Verarbeitung ändert.
- Reine Textkorrekturen ohne Verhaltensänderung brauchen nicht zwingend einen Versionssprung.
- Der Block `Änderungen` enthält kurze, konkrete Punkte mit Wirkung.
- Die Systemversion `sys 2.00` bleibt unverändert, solange sich nur das einzelne Modul ändert.

## Aktuelle Form Der Dateiheader

Die Header sollen sich an der aktuellen Repo-Form orientieren und nicht frei neu erfunden werden.

Typische Form im Repo heute:

```js
/*
========================================
collectAtags v1.22 (sys 2.00)
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
exportAtags v1.33 (sys 2.00)
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
Atag Helpers v1.01 (sys 2.00)
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
- Die Modulbezeichnung im Header muss zum tatsächlichen Dateizweck passen, zum Beispiel `collectAtags`, `exportAtags` oder `Atag Helpers`.
- Nach der Versionszeile folgt ein Leerblock und dann mindestens der Abschnitt `Änderungen`.
- Wenn die Datei bereits weitere Blöcke wie `Anwendung`, `Beispiele` oder ähnliche Dokumentationsabschnitte hat, bleiben diese erhalten und werden bei Bedarf mit gepflegt.
- Neue Änderungen werden im Abschnitt `Änderungen` oben ergänzt, damit die jüngste Änderung zuerst sichtbar ist.
- Die Punkte im Abschnitt `Änderungen` bleiben kurz, konkret und nutzen die vorhandene Schreibweise der Datei.
- Beispiele in `Anwendung` oder `Beispiele` werden angepasst, wenn sich Signatur, typische Nutzung oder unterstützte Formen geändert haben.
- Wenn ein Header stark gewachsen ist, wird er gekürzt, aber nicht in ein neues freies Format umgebaut.
- Ziel ist Konsistenz zwischen den Dateien, nicht perfekte Einheitlichkeit auf Kosten der vorhandenen Struktur.

## Versionierung Der Dateien

Die Versionsnummer im Dateikopf ist dateibezogen.

Das bedeutet:

- `collectAtags.js`, `exportAtags.js`, `helpers.js` und `restoreAtags.js` dürfen unterschiedliche Versionsstände haben.
- Nur die Datei bekommt einen Versionssprung, die tatsächlich geändert wurde.
- Wenn mehrere Module geändert werden, wird jede betroffene Datei separat angehoben.

Beispiele:

- Parser-Fix nur in `collectAtags.js`: nur `collectAtags` bekommt die nächste Version.
- Export-Änderung nur in `exportAtags.js`: nur `exportAtags` bekommt die nächste Version.

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
- Test/Doku: test_collectAtags.js ergänzt
```

## Wann Changelog Pflicht Ist

Changelog pflegen bei:

- Parser- oder Export-Verhalten ändert sich
- neue unterstützte Formate oder Tag-Formen hinzukommen
- Bugfixes das Ergebnis sichtbar verändern
- Tests oder wichtige Doku für die Änderung ergänzt werden

Im Zweifel lieber dokumentieren.

## Abschluss-Check

Vor Abschluss einer Änderung kurz prüfen:

- betroffene Datei-Version erhöht
- Kurzinfo im Dateikopf ergänzt oder angepasst
- `CHANGELOG.md` ergänzt
- Test oder Verifikationshinweis vorhanden
- README angepasst, wenn sich Nutzung oder unterstützte Formen ändern

Optionaler Repo-Check:

- `powershell -ExecutionPolicy Bypass -File .\check_versioning.ps1`
- prüft bei geänderten Moduldateien, ob die Dateiversion erhöht wurde und ob `CHANGELOG.md` mit geändert ist
