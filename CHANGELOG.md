# Changelog

## Stats

Ausgangsdatum: 2026-05-20

*Diese Woche (3,0h, 3 Tage, 34 Inhalte):*
Tag-Cleaner/Obsidian-Linker: Aliaslogik, Formatmodus; Changelog: Stats-/Versionen-Regeln.

*Letzte Woche (3,7h, 2 Tage, 61 Inhalte):*
Core-Umbau: Remote-Libs und Cleaner-Struktur; Parser/Export: Kategorie-Aggregation und Readable-Fixes.

*Dieser Monat (15,2h, 7 Tage, 233 Inhalte):*
Core/Export: Aggregationen und Tree-Ausgabe; Tag-Cleaner: Alias-/Symbolformen; Addons: Obsidian, Sync, Hour-Guide.

*Letzter Monat (6,3h, 3 Tage, 175 Inhalte):*
Cleaner/Readable: Tagleisten und Archivierung; Sync/TimeMarker: Addons und Workflows; Repo: Grundstruktur.

*Jahr (21,5h, 10 Tage, 408 Inhalte):*
Core-Libs/Exports: Remote-Einbindung und Aggregationen; Tag-Cleaner: Normalisierung; Addons: Obsidian/Sync/TimeMarker.

*Insgesamt (21,5h, 10 Tage, 408 Inhalte):*
Core-Libs/Exports: Remote-Einbindung und Aggregationen; Tag-Cleaner: Normalisierung; Addons: Obsidian/Sync/TimeMarker.

## Log

### 2026-06-20 - (ca. 0,5h)

- *Summary: Dustingday-Projektstart, Memento-Konfiguration und erstes OutNote-Add-on.*
- Phasenmarke: Vor DustingDay lag der Schwerpunkt auf Dosis-/Eindosierungslogging; mit DustingDay verschiebt sich das Repo-Ziel überwiegend zu Alltagstracking mit Tages-Inputs für Befinden, Symptome, Tätigkeiten, Erfolge und hilfreiche Methoden.
- Projekt: `project/dustingday` mit README, persönlichem Plan, Codex-Plan, Strukturdatei und Memento-Konfiguration angelegt.
- Feature: Dustingday-Collector-Add-on `addons/5_dusting-day/dustingDayCollector.js`; `updateDustingDayOutNote()` baut aus manuell gesetzten `DustingDay.InLinks` eine zeitlich sortierte `OutNote`.
- Feature: Dustingday-Collector-Debug v0.11; `debugDustingDayCollector()` schreibt sichtbare Diagnose zu `InLinks`, verknüpften Entries und Feldwerten in `OutNote`.
- Change: Dustingday-Collector-Debug v0.12; `debugDustingDayCollector()` schreibt standardmäßig in `Debug`, damit `OutNote` fachliche Ausgabe bleibt.
- Feature: Dustingday-Input-Debug v0.13; `debugDustingInputCollector()` schreibt Diagnose für den aktuellen `DustingInput`-Eintrag in `Debug`; `debugDustingDayInputCollector()` bleibt als Alias erhalten.
- Feature: `addons/5_dusting-day/dd-linker.js` v0.10; `linkInputEntryToTarget()` adaptiert den funktionierenden Linker auf `DustingInput.DayLinks -> DustingDay`, Map-Felder, eindeutige Rows/Tags und Row-Modi `clock`/`sinceFirst`.
- Fix: `dd-linker.js` v0.11 verhindert neue Tages-Einträge bei wahrscheinlich falschem `targetDateField` und gleicht fehlende Tags bei neuen Inputs erneut gegen den Tages-Eintrag ab.
- Change: `dd-linker.js` v0.13 entfernt die Day-seitige Refresh-Doppellogik wieder und ergänzt stattdessen optionale `recalcTarget`-/`recalcSource`-Aufrufe nach dem Schreiben.
- Fix: `dd-linker.js` v0.14 macht die Ziel-Feldvalidierung optional (`strictTargetValidation`) und nutzt vorhandene `DayLinks` vor der Datumssuche, damit Memento-Feldzugriff nicht fälschlich Tageserstellung blockiert.
- Feature: `dd-linker.js` v0.15 ergänzt `debugInputLinkerAccess()` zur Diagnose von `libByName`, `entries()` und optionalem `create()` gegen die Ziel-Library.
- Fix: `dd-linker.js` v0.16 unterstützt Iterator-Rückgaben von `entries()`; vorhandene Day-Einträge werden dadurch in Memento korrekt gefunden statt als einzelner Iterator behandelt zu werden.
- Change: `dd-linker.js` v0.17 schreibt `debugInputLinkerAccess()` zusätzlich immer zeilenweise ins Memento-Log.
- Change: `dd-linker.js` v0.19 schreibt Debug-Ausgaben als einen zusammenhängenden Log-Block und ergänzt Version/Zeitpunkt im Debug-Header.
- Fix: `dd-linker.js` v0.20 behandelt nicht lesbare Zielwerte beim Anhängen als leer, solange `set()` funktioniert; dadurch verschwinden falsche Fehler für `OutNote`/`OutTags`.
- Fix: `dd-linker.js` v0.21 entpackt Rhino `NativeArray`-/Java-Listenwerte für Tags, statt Objektstrings wie `org.mozilla.javascript.NativeArray@...` in `OutTags` zu schreiben.
- Fix: `dd-linker.js` v0.22 liest Array-/NativeArray-artige Tags vor `.entries()`, damit keine Index-Wert-Paare wie `0,tag` entstehen; falsche Ziel-Schreibfehler werden nur noch mit `strictWriteErrors: true` gemeldet.
- Fix: `dd-linker.js` v0.23 ordnet Inputs über `dayStartHour` zu, Standard 4 Uhr; dadurch werden vorhandene DustingDay-Einträge über die fachliche Tagesgrenze wiederverwendet statt neu erstellt.
- Change: `dd-linker.js` v0.24 beginnt Debug-Ausgaben einheitlich mit Datei, Version und Zeitpunkt und schreibt Fehlerdebug wieder als einen zusammenhängenden Log-Block.
- Fix: `dd-linker.js` v0.25 prüft zuerst gleiche Kalendertage in den letzten `daySearchLimit` Day-Einträgen und nutzt den Vortag nur als Frühzeit-Fallback bis `dayStartHour`.
- Fix: `dd-linker.js` v0.26 lässt vorhandene `DayLinks` den Abgleich nicht mehr blockieren; die Datumssuche in `DustingDay` gewinnt, ein bestehender Link dient nur noch als Fallback.
- Fix: `dd-linker.js` v0.27 lässt brauchbare vorhandene `DayLinks` wieder gewinnen, führt den Feldabgleich aber bei jedem Lauf erneut aus; kaputte Links fallen auf die Datumssuche zurück.
- Change: `dd-linker.js` v0.28 benennt das Sync-Plugin als `Input Linker` und verwendet für Rows TimeMarker-nahe Optionen `rowSourceMode`, `rowStepHours` und `rowRoundMode`.
- Fix: `Input Linker` v0.29 behandelt `rowSourceMode: "realtime_since"` als absolute Tageszeit-Row statt als Differenz zum Tages-Eintrag.
- Feature: `Input Linker` v0.30 ergänzt `refreshTargetFromInputEntries()` für DustingDay-seitiges Suchen, Verlinken, Append und Rebuild aus `DustingInput`-Einträgen.
- Change: `Input Linker` v0.31 lag als Zwischenstand unter `addons/2_syncing/libaryEntryLinker.js`, nutzte die vereinfachte Refresh-API mit `entries`, `findMatchingEntries`, `linkNewEntries`, `processAllEntries`, `processMode` und `processMap`, und trennte `string` von `string_rows`.
- Change: `Input Linker` v0.32 ist feste optionale Core-Lib `inputLinker_lib`; alte Day-/Failsafe-Funktionsnamen wurden entfernt und durch `linkInputEntryToTarget()`, `refreshTargetFromInputEntries()` und `debugInputLinkerAccess()` ersetzt.
- Feature: `Input Linker` v0.33 ergänzt `postEntry: true`, um nach dem Input-Linking `postEntry(entry)`/`PostEntry(entry)` mit dem konkreten Ziel- oder Source-Eintrag aufzurufen.
- Feature: `Input Linker` v0.34 erlaubt freie PostEntry-Funktionsnamen per `postEntryName`/`postEntryFunctionName` oder Funktionsobjekt per `postEntryFn`.
- Fix: `Input Linker` v0.35 schreibt bei PostEntry-Fehlern Funktionsname, Ziel (`target`/`source`) und die eigentliche Fehlermeldung ins Debug.
- Change: `Input Linker` v0.36 leert ein vorhandenes Debug-Feld zu Beginn und lässt es bei erfolgreichem Lauf leer.
- Fix: `Input Linker` v0.37 erhaelt beim Rebuild von `string_rows` freien Text und Tagbar im Zielfeld; geloescht werden nur vorhandene Row-Zeilen.
- Fix: `Input Linker` v0.43 schreibt `sourceDayLinkField` nicht erneut, wenn der Input bereits mit dem Ziel-Day verlinkt ist; das vermeidet riskante Relation-Rewrites beim Bearbeiten bestehender Inputs.
- Fix: `Input Linker` v0.42 verwendet vorhandene `DayLinks` nur noch automatisch, wenn deren Datum zum Input-Tag passt; altes blindes Link-Vertrauen bleibt mit `trustExistingLink: true` möglich.
- Fix: `Input Linker` v0.41 schützt den Nicht-Row-Bereich von `string_rows`-Zielfeldern vor PostEntry-/Cleaner-Seiteneffekten.
- Fix: `Input Linker` v0.40 schützt beim Rebuild von `string_rows` den freien Text-/Tagbar-Bereich auch dann, wenn mehrere Map-Einträge auf dasselbe Zielfeld zeigen.
- Fix: `libVersions` v1.17 meldet Major-Version-Mismatch auch dann, wenn die geladene Version numerisch neuer ist; v1.16 prüft ältere geladene Lib-Versionen auch ohne `checkAccess`.
- Change: `libVersions` v1.15 meldet Versionsmismatch nur noch für ältere geladene Lib-Versionen; neuere Versionen sind ok, solange `sysVersion` passt.
- Fix: `libVersions` v1.14 verschiebt den deaktivierten `RUN_LIB_CHECK`-Block hinter die Funktionsdefinitionen, damit er bei Aktivierung echte Versionen sieht.
- Change: `libVersions` v1.13 dokumentiert einen deaktivierten `RUN_LIB_CHECK`-Block als schnellen manuellen Memento-Test.
- Change: `libVersions` v1.12 ergänzt `allVersions: true` und bereinigt Missing-Meldungen, wenn eine Lib per Getter erreichbar ist.
- Change: `libVersions` v1.11 macht den Beispielaufruf run-button-sicher und behandelt fehlende Access-Getter bei `requireAll: false` als weiche Diagnose.
- Fix: `libVersions` v1.10 crasht nicht mehr, wenn `ATAG_EXPECTED_LIBS` in Memento nicht gesetzt ist.
- Feature: `Input Linker` v0.39 ergänzt `openTargetEntry: true`, um nach dem Input-Linking den gefundenen oder erstellten Ziel-Day zu öffnen, sofern Memento eine Open-Methode anbietet.
- Change: `libVersions` v1.09 unterstützt optionale Libs und `verbose: true` für schnelle Version-/Zugriffsprüfung per Log-Ausgabe.
- Fix: `collectAtags_lib` v1.61 liest auch Slot-Werte mit Leerzeichen nach Doppelpunkt, z. B. `tag: _inhalt_`, und lässt gefüllte Slots nach leeren Slots gewinnen. `Input Linker` v0.75 ergänzt `mode: "prepend"`/`"prepend all"` für Text-Maps.
- Fix: `Tag Pair Parser` v1.01 schreibt einfache Ganzzahl-Paare aus Tagfeldern kompakt ins Textfeld, z. B. `springen, 3` zu `springen3` und `fallen, -3` zu `fallen-3`; Dezimal- und kumulative Formen bleiben bei `name#wert`.
- Fix: `syncLastFromLatest` v1.05 wendet `clearTemplateSlots` auch auf Java-/stringartige Memento-Textwerte an, z. B. `Testing: _safd_` zu `Testing: __`.
- Fix: `restoreAtags` v2.06 erkennt auch Export-Aggregate mit Trennstrich wie `12 - [41, 6, 5, 4, 4]`; der Default `valueMode: "avg"` schreibt damit wieder den Mittelwert statt den ersten Detailwert.
- Feature: `Input Linker` v0.79 versucht nach dem Linken versehentlich in den Papierkorb verschobene Source-/Target-Einträge per verfügbarer Restore-Methode zurückzuholen und protokolliert `restored` im Debug.
- Feature: `Input Linker` v0.78 übernimmt `receiveConfig` jetzt auch in `recieveInputEntryFromSource()` und `refreshTargetFromInputEntries()`; die DustingDay-Beispiele bündeln Receive-/Process-Optionen dort einheitlich mit `processMode` als erstem Eintrag.
- Fix: `Input Linker` v0.77 normalisiert `string_rows`-Input mit führendem Tagbar-Prefix; `| Testing: _4_` wird beim Linken als `2,5: Testing: _4_` in die Tages-Row geschrieben.
- Doku: `Input Linker` v0.76 ergänzt `openTargetEntry: true` und `refreshBeforeOpen: true` in den DustingDay-Input-Beispielen, führt `InRecord -> Record` als `string_rows` weiter und nutzt in geänderten Kommentaren wieder Umlaute.
- Feature: `Input Linker` v0.74 führt bei `openTargetEntry` direkt vor dem Öffnen optional nochmal den Receive-Refresh aus; Time Marker v1.37 trennt exakte Row-Dedupe per `mergeSameRowContents: true` vom Zusammenführen gleicher Zeitstempel per `mergeSameRows: true`, erkennt Boolean-Varianten aus Memento/Rhino robuster, dedupliziert bereits gemergte Segmente idempotent und entfernt Rows mit nur leeren Template-Slots.
- Feature: `syncLastFromLatest` v1.04 kann mit `clearTemplateSlots: true` Inhalte in Slot-Markern beim Kopieren leeren, z. B. `Laufen:_2 km_` zu `Laufen:__`; der Marker ist per `templateSlotMarker` einstellbar.
- Change: `syncFieldBack()` nutzt bei übergebenem `entryObj` dessen Library für den Ziel-Eintrag, sofern Memento diese am Entry bereitstellt; `syncFieldTo()` und `syncFieldAll()` verwenden denselben Entry-Library-Fallback.
- Change: `updateSequenceSpree()` akzeptiert zusätzlich `entryObj` als Alias für `currentEntry`; bestehende `currentEntry`-Aufrufe haben weiter Vorrang.
- Change: `restoreAtags()` akzeptiert `entryObj` als `currentEntry`-Fallback, auch wenn gleichzeitig `entries` übergeben wird.
- Test: `tests/test_inputLinker.js` deckt Tageserstellung, Source-Link, erste Notizzeile, Duplikatschutz und relative Row-Zeit ab.
- Change: Alter DustingDay-Collector-Ordner und zugehöriger Test wurden entfernt; der aktive Weg läuft über `inputLinker_lib`.
- Feature: `Input Linker` v0.73 ergänzt `sourceDayIdField`, damit Inputs den Ziel-Day per stabiler ID aktualisieren können, ohne bestehende `DayLinks` neu zu schreiben; v0.72 dedupliziert gesammelte Inputs nur noch per Objekt/ID.
- Feature: `Input Linker` v0.57 ergänzt `refreshCurrentTargetFromLinkedInputEntry()` für Day-seitige Linking-an-entry-Trigger, die nur den gerade gelinkten Input verarbeiten.
- Feature: `Input Linker` v0.56 ergänzt `refreshCurrentTargetFromInputEntries()` als Day-seitigen Wrapper für Linking-an-entry-Trigger mit aktuellem `entry()`.
- Change: `Input Linker` v0.55 macht `linkInputEntryToTarget()` standardmaessig Link-only; Day-Postwork läuft nur noch mit `processAfterLink: true` oder über Day-seitigen Refresh.
- Debug: `Input Linker` v0.54 erweitert `debugInputLinkerAccess()` um `entry().field`, `entry().values`, globales `field()`, DayLink-ID und `targetLib.findById`.
- Change: `Input Linker` v0.53 verarbeitet vorhandene DayLinks im Input-Trigger nicht mehr automatisch; Updates bestehender Inputs brauchen `processExistingLink: true` oder Day-seitigen Refresh.
- Fix: `Input Linker` v0.52 loest vorhandene DayLinks bevorzugt per `targetLib.findById(linked.id)` auf und behandelt `entry.deleted` als primaeren Papierkorb-Indikator.
- Fix: `Input Linker` v0.51 beschreibt verlinkte Relation-Objekte nicht mehr direkt; ein DayLink wird zuerst auf einen echten Eintrag aus `targetLib.entries()` aufgeloest.
- Fix: `Input Linker` v0.50 erstellt keinen neuen Tages-Eintrag mehr, wenn am Input bereits ein `DayLinks` existiert, aber kein brauchbarer Ziel-Day gefunden wird; das verhindert riskante Neuanlagen beim Bearbeiten bestehender Inputs.
- Change: `Input Linker` v0.49 schreibt Relation-Felder standardmaessig nur noch, wenn sie leer sind; bestehende Links werden beim Input-Update nicht automatisch ersetzt (`replaceExistingLink: true` bleibt bewusst opt-in).
- Change: `Input Linker` v0.48 pruefte die One-to-Many-Reihenfolge, wurde aber zugunsten des konservativen Empty-only-Defaults ersetzt.
- Fix: `Input Linker` v0.47 entfernt stale `DayLinks` per `entry.unlink(field, oldEntry)`, bevor der korrekte Day verlinkt wird.
- Fix: `Input Linker` v0.46 erkennt bestehende Relationslinks robuster über Entry-ID und Name/Titel; das Zieldatum dient nur noch zur Tag-Plausibilisierung, nicht zur Gleichsetzung verschiedener Day-Einträge.
- Fix: `Input Linker` v0.45 ueberspringt standardmaessig Memento-Linking-Trigger-Kontexte, damit programmgesteuertes Verlinken keinen zweiten rekursiven Linker-Lauf ausloest.
- Fix: `Input Linker` v0.44 verknüpft Relation-Felder über `entry.link(field, entry)` und vermeidet `set(field, entryObj)`, da Memento `set()` für Link-to-Entry-Felder mit Entry-Namen/Strings dokumentiert.
- *Versionen: sys 2.40, collectAtags_lib v1.61, Input Linker v0.79, libVersions v1.21, Time Marker v1.37, Tag Pair Parser v1.01, restoreAtags v2.06, Global Field Sync v1.03, Sync Last From Latest v1.05, Sequence Counter v1.05.*

### 2026-05-20 - (ca. 0,5h)

- Doku: Changelog-Zeiten geschätzt; Tagesdauern aus Git-/Commit-Spannen mit `ca.` ergänzt, Stats ohne wiederholtes `ca.` verdichtet.
- Doku: Schätzregel präzisiert; leere Zeitlücken über 1 Stunde werden nur ausgenommen, wenn dort weder Commits noch andere nachvollziehbare Aktivität liegen.
- Doku: Messregel ergänzt; neue Arbeitszeiten sollen künftig möglichst direkt gemessen statt nachträglich geschätzt werden.
- Doku: Summary- und Versionen-Zeilen formatiert; beide werden kursiv geschrieben.
- Doku: Versionen-Regel präzisiert; pro Datei steht unten nur der aktuelle Versionssprung des Tages.
- *Versionen: keine.*

### 2026-05-19 - (ca. 0,5h)

- Doku: Changelog-Summaries priorisiert; große Umbauten und verhaltensrelevante Änderungen stehen vor Doku/Formalia.
- Doku: Stats präzisiert; Inhaltsangaben nennen konkretere Themen und sind nach Relevanz sortiert.
- Doku: Changelog-Vorgaben ergänzt; `Summary` und `Stats` sollen von entscheidend zu weniger entscheidend sortiert werden.
- Doku: Stats-Abschnitte angepasst; Ausgangsdatum steht einmal oben, Abschnitte nutzen `Diese Woche`, `Letzte Woche`, `Dieser Monat`, `Letzter Monat`, `Jahr` und `Insgesamt`.
- *Versionen: keine.*

### 2026-05-18 - (ca. 2,0h, 4x)

- *Summary: Tag-Cleaner-Aliaslogik, Obsidian-Linker-Formatmodus, Kategorie-Alias-Polung und Changelog-Struktur.*
- Doku: Changelog-Struktur vereinfacht; separates Arbeitslog entfernt, `CHANGELOG.md` ist jetzt Repo-Verlauf und Arbeits-/Zeitprotokoll.
- Doku: Regeln angepasst; `CONTRIBUTING.md` beschreibt nur noch Dateiversionen und `CHANGELOG.md`, inklusive Dauerformat, Tageszusammenfassung und gesammelt aufgeführter Versionen.
- Doku: Changelog-Vorgaben verschoben; Format und Vorlage stehen unten unter `Vorgaben`, damit der Verlauf direkt oben beginnt.
- Doku: Changelog-Alteinträge normalisiert; gleiche Tage sind zusammengezogen, `Summary:` startet Tagesblöcke ab 7 Punkten, `Change:` ersetzt den alten Änderungs-Prefix.
- Doku: Versionspunkte vereinheitlicht; `Versionen:` steht in allen Tagesblöcken als letzter Punkt.
- Doku: Statistikblock ergaenzt; Wochen-, Monats-, Jahres- und Gesamtbereiche zeigen Inhalte und Dauer.
- Doku: Changelog-Hierarchie angepasst; `Stats`, `Log` und `Vorgaben` sind Hauptbereiche, Tagesblöcke laufen als `###`.
- Doku: Statistiktexte gekürzt; Inhalte nennen nur noch kompakte Themenketten.
- Feature: Obsidian-Linker-Formatmodus (#55); `formatOnly: true` formatiert vorhandene Links für After-Entry-Läufe, ohne neue Overwrite-Links zu erzeugen.
- Change: Obsidian-Linker-Erzeugung (#55); `createOverwriteLink: false` ist Alias für den Formatmodus.
- Test/Doku: Obsidian-Linker-Formatmodus (#55); Regressionen und README-Hinweis ergänzt.
- Feature: Cleaner-Anzeige-Override; `cleanerTagText` und `cleanerEmoji` koennen Alias-Header-Vorgaben uebersteuern.
- Feature: Emoji-/Symbol-Position; `cleanerEmoji` unterstuetzt `prefix`, `suffix`, `only` und `none`.
- Test/Doku: Override- und Prefix-Faelle sowie README-/Header-Beispiele aktualisiert.
- Feature: Emoji-/Symbol-Aliasheader ohne Kurznamen (#54); Header unterstuetzen `+`, `-`, `*`.
- Feature: Symboltokens in Lang-/Kurzform (#54); `+` schreibt Langform, `-` ohne Kurzname wird ignoriert, `*` behaelt Eingaben.
- Test/Doku: Repros fuer Symbol-only, Long-/Short-Ziel und Header-Marker ergaenzt.
- Feature: Emoji-/Symboltokens (#54); Tokens wie `$²` koennen im Cleaner zur Lang- oder Kurzform konvertiert werden, z. B. per `@@Timer(tim+,$)`.
- Feature: Emoji-Aliase (#52); normale Aliase koennen ein Emoji nach dem Kurznamen deklarieren, z. B. `@@Emotion (emo, 😃): Gefuehl`.
- Feature: Emoji-Aliase im Parser (#52); Superscript-Werte werden erkannt, z. B. `😃²`.
- Feature: Alias-Anzeige im Cleaner (#52); bekannte Alias-Tags koennen als Kurz-/Langname plus Emoji-Suffix oder Emoji-only ausgegeben werden, ohne Leerzeichen vor dem Emoji.
- Feature: Alias-Schreibweise im Cleaner (#51); Header steuern mit `emo*`, `emo-` und `emo+`, mit Emoji und ohne Marker wird Emoji-only verwendet.
- Fix: Aliasdefinitionen im Cleaner (#51); `aliasText`/`aliasTextFields` steuern die Schreibweise, Aliaszeilen selbst bleiben unveraendert.
- Change: Passive Aliasquelle (#51); `applyCleanTags()` liest standardmaessig `Alias`, das Clean-Feld nur explizit per `aliasTextFields`.
- Feature: Kategorie-Alias-Polung (#53); trailing `+`/`-` wird nach der Child-Aggregation angewendet, z. B. `@@@emo-: -aua` mit `aua+2` ergibt fuer `emo` wieder `2`.
- Test: Kategorie-Alias-Polung (#53); Repro fuer `@@@emo-: -aua` mit `categoryAggregateMode: "max_abs"` ergaenzt.
- *Versionen: collectAtags v1.59, exportAtags v1.83, tagCleaner v1.44, Obsidian Linker v1.16.*

### 2026-05-16 - (ca. 3,2h, 4x)

- *Summary: Core-/Lib-Umbau, Kategorie-Aggregation, Cleaner-/Parser-Fixes und Datenschutz.*
- Fix: In der eingebauten Hour-Guide-Vorgabe wurde ein zu stark anonymisierter Platzhalter wieder durch den vollstaendigen neutralen Inhalt `Spannung` ersetzt
- Benennung: Header von `A4 Tag Cleaner Core` auf `A4 Tag Cleaner` vereinfacht
- API: `applyCleanTags()` als kurzer Alias fuer `applyTagCleaner()` ergaenzt
- API: `applyCleanTags()` kann ohne Optionsobjekt genutzt werden und verwendet dann `Notiz`
- Doku: Kurze `applyCleanTags()`-Beispiele direkt im Tag-Cleaner-Header ergaenzt
- Refactor: Reine Durchreicher zu `helpers_lib` und eine ungenutzte Sortierfunktion aus dem Tag Cleaner entfernt
- Fix: Gemischte Suffixformen (#50); `TempoHalbˣ2`, `test⁰⁰03`, `tag²x`/`tag²#` und `Temˣ00` werden im Cleaner normalisiert
- Change: `##tag`/`tag##` wird jetzt direkt in die Tagbar uebernommen; der alte `tagFields`-Sammelpfad im Cleaner wurde entfernt
- Fix: `tag##3` wird wie `##tag3` als Werttag in die Tagbar uebernommen
- Fix: `tag##inhalt` und `tag##\"das ist ein test\"` werden als Stringwerte in die Tagbar uebernommen
- Fix: Doppelte Aliasziele sind standardmaessig aktiv, damit ein Alias wie `abgeschlagen` gleichzeitig positiv in `Erschoepfung` und negativ in `Stimmung` zaehlt; `multiAliasTargets: false` stellt das alte Last-Wins-Verhalten wieder her
- Nummerierung: Remote-Libs nutzen `#1`-`#3`, Core nutzt `A1`-`A4`; die Reihenfolge folgt wieder alphanumerisch den Dateinamen im jeweiligen Bereich
- Feature: `checkAtagLibVersions()` prueft automatisch alle erwarteten Remote-Libs und optional mit `checkAccess: true` die aufrufbaren Versionsfunktionen
- Struktur: Versions-Checker nach `core/_checkLibs.js` umbenannt, damit klar ist, dass er selbst keine Remote-Lib ist
- Fix: `makeTagCleanerTextWithOptions()` splittet Zeilen ohne Regex-Literal, damit Memento/Rhino-Kopierpfade an der Einstiegstelle robuster bleiben
- Test/Doku: Lade-Reihenfolge fuer `core/helpers.js` und Regression fuer CRLF-Zeilen im TagCleaner ergaenzt
- Struktur: Remote-nutzbare Lib-Dateien nach `core_lib/` verschoben und mit `_lib` gekennzeichnet (`collectAtags_lib`, `exportAtags_lib`, `helpers_lib`)
- Struktur: `tagCleaner` aus den Addons nach `core/tagCleaner.js` verschoben; Core-Funktionen bleiben feldschreibfrei, `applyTagCleaner` bleibt als optionaler Memento-Wrapper erhalten
- Refactor: String-/Quote-Basishelfer aus dem Cleaner in `helpers_lib` ausgelagert
- Test/Doku: Pfade, Versionierungscheck und TagCleaner-Beispiele an die neue Struktur angepasst
- Feature: `core/_checkLibs.js` mit `checkLibVersions()` und eigener Versionsfunktion pro Lib ergaenzt
- Doku: `core_lib/Z_LIB_VERSIONS.md` als statische Uebersicht der aktuellen Remote-Lib-Versionen ergaenzt
- Struktur: `core/helpers.js` enthaelt gezielt Memento-Wrapper wie `applyTags`, verweist auf `core_lib/helpers_lib.js`; `helpers` und `tagCleaner` werden nicht als Remote-Libs registriert
- Fix: Superscript-Werte in Readable-/Tagbar-Zeilen werden auch vor Satzzeichen erkannt, z. B. `testc⁴,`
- Test: Regression fuer `"| testa² testb³ testc⁴, reˣ schreibenˣ` ergaenzt
- Fix: Exklusive `"|`-Readable-Zeilen werden vor der normalen Quote-Logik direkt ueber die sichtbaren Anfangszeichen erkannt
- Test: Regression prueft `"| test²` mit Laufzeit-Quote ohne Escape-Backslash
- Fix: Superscript-Werte in Tagleisten werden auch erkannt, wenn Name und Wert durch Leerzeichen getrennt ankommen, z. B. `test ²` -> `test²`
- Test: Regressionen fuer `test²` in normalen und gesplitteten Tagleisten ergaenzt
- Change: Der Core parst weiter normales `|`, normales `||` und exklusives `"|`; `|"`/`|'` sind reine Cleaner-Eingabeformen
- Change: Der Tag Cleaner normalisiert `||`, `|"` und `|'` zu exklusivem `"|`
- Feature: Eine einzelne leere `|`-Zeile wird standardmaessig zu `"|`; per `singleBarExclusive: false` kann das deaktiviert werden
- Test/Doku: Regressionen und README fuer die Tagleisten-Normalisierung ergaenzt
- Fix: Exklusive Readable-Zeilen mit `"| ...` sind wieder aktiv und unterdruecken normale Body-Tag-Erkennung
- Test: Regressionen fuer exklusive Readable-Zeilen und normales `|| ...`-Verhalten ergaenzt
- Datenschutz: private Beispielnamen, Gesundheits-/Alltagsbegriffe und der konkrete Obsidian-Vault-Name wurden in README, Tests, Script-Beispielen und Workflow-Doku durch neutrale Platzhalter ersetzt
- Doku: `CONTRIBUTING.md` ergaenzt Datenschutzregeln fuer oeffentlich teilbare Beispiele
- Test: Voller Host-Testlauf mit anonymisierten Fixtures ausgefuehrt
- Feature: Kategorie-Aliase koennen feste Kinder mit negativem Vorzeichen definieren, z. B. `@@@Body: -SymptomA`
- Feature: Feste Kategorie-Kinder werden ueber Alias- und Kurznamen auf ihren Langnamen aufgeloest, auch wenn die Kategoriezeile vor der Aliasdefinition steht
- Performance: Ausgeschlossene Namen werden pro Parserlauf als Lookup-Map vorbereitet
- Performance: Kategorie-Kind-Aliase vermeiden doppelte Key-Berechnung
- Refactor: Wiederholte Trim-Operationen laufen ueber einen lokalen Parser-Helfer
- Change: `tree_md` nutzt fuer Kategorie-Eltern standardmaessig `max_abs`
- Change: Negierte Kategorie-Kinder werden im Tree und in Kategorie-Details mit tiefgestelltem Minus vor dem Namen markiert, z. B. `₋SymptomA -2` und `Body: -2 - [₋SymptomA: -2]`
- Performance: Text-, Markdown- und Tree-Exports verwenden einen pro Export aufgebauten Wertindex fuer Kategorie- und Kind-Zusammenfassungen
- Performance: Wiederholte Stringwerte werden nur dann aggregiert, wenn ein String-Tag tatsaechlich mehrfach vorkommt
- Refactor: Kategorie- und String-Aggregation nutzen denselben Clone-Helfer
- Refactor: `rows_md` und `rows_html` teilen sich eine gemeinsame Tabellen-View fuer Header, Datenzeilen und Aggregatzeile
- Refactor: `rows_html` rendert Header-, Daten- und Aggregatzeilen ueber einen gemeinsamen HTML-Row-Helfer
- Feature: `computeAggregate` unterstuetzt `max_abs` und `min_abs` mit positivem Tie-Break bei gleichem Betrag
- Change: Kategorie-Anzeigeoptionen wie `cat_display_values` werden durch `applyTags` durchgereicht
- Performance: `min`, `max`, `max_abs` und `min_abs` werden ohne Sortierung linear berechnet
- Refactor: Mapped- und Auto-Restore schreiben Zielwerte ueber einen gemeinsamen Target-Write-Helfer
- Test: Regressionen fuer negative Kategorie-Kinder, Alias-Aufloesung, Superscript-Werte und Tree-/Text-Ausgabe ergaenzt
- *Versionen: Hour Guide v1.30, helpers_lib v2.11, collectAtags v1.55, exportAtags v1.82, restoreAtags v2.04, tagCleaner v1.38, libVersions v1.08, helpers v1.02, sys 2.30, Obsidian Linker v1.15, Atag Helpers v2.07.*

### 2026-05-13 - (ca. 0,5h)

- *Summary: Sync-Last-Entry-Auswahl, Hour-Guide-Entry-Eingaben und Newest-Entry-Helper.*
- Change: `syncLastFromLatest()` nutzt ohne `fieldDate` direkt den neuesten erstellten Library-Eintrag
- Change: Bei `fieldDate` scannt `syncLastFromLatest()` standardmaessig maximal 100 Library-Eintraege; `maxEntries: 0` nimmt direkt den neuesten erstellten Eintrag, `maxEntries: -1` scannt alle
- Feature: `getNewestLibraryEntry()` nimmt fuer den neuesten erstellten Library-Eintrag direkt das erste Element aus `lib().entries()`
- Feature: `findNewestEntry()` sowie `getNewestLibraryEntry({ mode: "modified" })` bleiben fuer den langsameren Scan nach `modifiedTime` mit ID-Fallback verfuegbar
- Fix: `applyHourGuide()` akzeptiert konkrete `entryObj`-/`sourceEntry`-Eingaben und zeigt bei leerem, `null`- oder `0`-Stundenwert den ersten Planblock
- Test/Doku: Regressionen fuer Newest-Entry-Suche, `maxEntries`, Modified-Mode, konkrete Hour-Guide-Entries und README-Beispiele ergaenzt
- *Versionen: Sync Last From Latest v1.03, Hour Guide v1.28.*

### 2026-05-09 - (ca. 0,5h)

- *Summary: Tree-Export-Aggregation, Biased-Spree-Markierung und Multi-Alias-Targets.*
- Fix: `tree_md` nutzt fuer wiederholte Kind-Row-Werte ohne explizites `rowAggregateMode` wieder `max`; explizites `rowAggregateMode: "avg"` bleibt unveraendert moeglich
- Test: Regression fuer Tree-Default `max` bei Kindwerten und daraus berechneter Kategorie-Anzeige ergaenzt
- Feature: `fieldBiasedSpree` und `biasedSpreeCount` markieren die ersten X Eintraege jeder Spree mit `true`; spaetere Eintraege werden mit `false` geschrieben
- Change: Bei explizitem `biasedSpreeCount` wird das Bias-Feld auch im `currentEntry`-Modus fuer uebersprungene berechnete Eintraege aktualisiert, damit alte Markierungen verschwinden; `0` schreibt `false`
- Test/Doku: Regression fuer Biased-Spree-Markierung, explizites Loeschen mit `0` und README-Beispiel ergaenzt
- Feature: `multiAliasTargets: true` erlaubt, dass ein Alias-Token mehrere Ziel-Tags erzeugt, z. B. gleichzeitig positiv und negativ; ohne Option gewinnt weiter die letzte Aliasdefinition
- Test/Doku: Regression fuer doppelte Aliasnamen mit und ohne `multiAliasTargets` sowie README-Hinweis ergaenzt
- *Versionen: exportAtags v1.71, Sequence Counter v1.04, collectAtags v1.43, Atag Helpers v2.04.*

### 2026-05-01 - (ca. 8,0h, 5x)

- *Summary: Aggregations-Engine, Kategorie-/Tree-Exports, Cleaner-Normalisierung und Add-on-Integration.*
- Change: Header aller Module und `ATAG_SYS_VERSION` auf `2.21` aktualisiert
- Feature: `computeAggregate` unterstuetzt `min`, `max`, `add`/`sum`, `avg`, `median`, `first`, `last` und `amount`
- Feature: Kategorie-Parents zeigen in `text`, `md` und `tree_md` standardmaessig den Mittelwert numerischer Unterpunkte; zuvor wird je Unterpunkt per `categoryRowAggregateMode`/`categoryChildAggregateMode` aggregiert, Standard fuer Kategorien ist `max`
- Feature: `categoryAggregateMode`/`categoryValueMode` und `categoryAggregateDecimals` steuern die Parent-Aggregation
- Change: `tree_md` zeigt Kategorie-Parents standardmaessig ausgeschrieben und ohne zusaetzliche Kinderliste in eckigen Klammern
- Change: `tree_md` nutzt fuer Unterpunktwerte dieselbe Aggregat-Zusammenfassung wie `md`, inklusive Einzelwertliste bei mehrfachen Row-Werten
- Feature: `row_display_values`/`rowDisplayValues` steuert Einzelwertanzeige mit `none`, `count`, `all`; Tree-Standard ist `count`, andere Exporte behalten `all`
- Feature: `cat_display_values`/`categoryDisplayValues` steuert Kategorie-Kinderinfo mit `none`, `count`, `names`, `all`; Tree-Standard ist `none`, andere Exporte behalten `names`
- Change: Detailwerte direkt vor eckigen Klammern nutzen ` - ` als sichtbares Zwischenzeichen, damit die kompakte Wertliste stabil getrennt bleibt
- Change: Die kurze Count-Form wie `SymptomA 1,7 [3]` bleibt ohne Strich
- Feature: Mehrfach vorkommende Textwerte werden in `text`, `md`, `tree_md` und `json` aggregiert; Standard ist `join`, `first` und `last` folgen `stringAggregateMode` oder `rowAggregateMode`
- Feature: Tag-Cleaner-Normalisierung (#38); Formen wie `tag+`, `tag--`, `tag++2`, `tag00`, `tag02` und `tag-0,2` werden in die vereinfachte Superscript-Schreibweise ueberfuehrt
- Change: Tag Cleaner uebernimmt Template-Werte `tag:_` und `tag:: _` nicht in die Tagleiste
- Fix: Kurzwerte werden nicht mehr aus Woertern mit Unterstrich vor der Zahl herausgelesen, z. B. `test_00` oder `test_3`
- Change: Alleinstehende Superscripts werden im Tag Cleaner wieder als normaler Text geschrieben, z. B. `Nr ²` zu `Nr 2`
- Change: Kumulative Werte mit Suffix nutzen den Zahlenanteil als Wert, z. B. `tag++324` bzw. `tag⁺⁺³²⁴` als kumulativ `324`; lange Laeufe wie `tag++++` gelten als Kurzform fuer `tag++4`
- Change: Tag Cleaner erhaelt `tag:: Inhalt` mit doppeltem Doppelpunkt und normalisiert `tag::Inhalt` zu `tag:: Inhalt`
- Test/Doku: In der Tagleiste wird `test_b: sdfd` als Stringwert zu `test_b:sdfd`; im normalen Text bleibt diese Form unveraendert
- Feature: `tag+`, `tag-`, `tag++`, `tag--`, `tag++2` und `tag--3` werden als kumulative Plus-/Minuswerte gelesen
- Feature: `tag00` wird als leerer/null-Wert gelesen; `tag0`, `tag02`, `tag0,2`, `tag-02` und `tag-0,2` werden als numerische Null- bzw. Nullkommawerte gelesen
- Feature: `tag:_` und `tag:: _` werden als Vorlagen erkannt und nicht als Atags ausgegeben
- Change: Kumulative Row-Werte werden in Markdown-/HTML-Row-Aggregationen addiert, auch wenn der Export sonst `rowAggregateMode: "avg"` nutzt
- Test/Doku: Parser- und Export-Regressionen (#38); README-Syntax ergaenzt
- Feature: Alias-Klammern `[...]` definieren Kategorien ausschliesslich im Alias-Bereich; normale Tags uebernehmen diese Kategorien in `cats`
- Feature: Kategorie-Aliase koennen per `@@@self (sf)` definiert werden und erzeugen keinen normalen Tag-Alias
- Feature: Kategorie-Aliase koennen per `@@@help: ActivityA, ActivityB, ActivityC` feste Kinderlisten definieren; diese Namen werden nicht als Aliase aufgeloest
- Feature: Kategorie-Tags werden automatisch als Listen ihrer Untertags erzeugt, z. B. `self` -> `tag1, tag2`
- Change: Kategorie-Listen werden in Text/Markdown mit Leerzeichen nach Kommas ausgegeben, z. B. `help: ActivityA, TaskA`
- Change: Kategorie-Tags bilden beim Markdown-Sortieren eine eigene Gruppe nach Listen und vor Blank-Tags
- Change: Kategorie-Tags behalten ihre Kinderlisten auch im JSON-Export als Array
- Feature: neuer Exporttyp `tree_md` schreibt kategorisierte Tags standardmaessig als Unicode-Baum mit Kinderwerten und laesst uncategorized Tags sowie leere Kategorien standardmaessig weg; `treeStyle: "ascii"` bleibt als Fallback
- Feature: `categoryFilter`/`catFilter` filtert alle Exporttypen per OR auf eine oder mehrere Kategorien
- Change: `targetFieldType: "tags"` schreibt Kategorie-Tags nur noch ins Memento-Tagfeld, wenn sie Kinder haben; normale Tags mit Unterstrich bleiben erhalten
- Change: `targetFieldType: "tags"` schreibt Leerzeichen als Unterstriche, damit auch Alias-Namen tag-kompatibel bleiben
- Change: Kategorie-Tags werden im Memento-Tagfeld mit `@`-Praefix markiert, z. B. `@help`
- Fix: `exportAtags`-Kopfkommentar wieder kurz und ASCII-only, damit Mementos Script-Parser nicht an Kommentar-Beispielen haengen bleibt
- Change: Alias-Klammern werden nicht mehr als Restore-Feldzuordnung gelesen; Restore-Ziele laufen weiter ueber `map`, `fields` oder `mappings`
- Struktur: Modulheader tragen jetzt stabile Kennungen (`A` Core, `B` Addons, `C` fuer geloeste generelle Module)
- Nummerierung: Core `A1`-`A4`; Addons `B1`-`B9`; geloeste generelle Module `C1`-`C3`
- Struktur: `multiChoiceHelpers.js` und `typedTextFields.js` nach `addons/z_generell/` verschoben und als `C1`/`C2` nummeriert
- Change: `addons/z_others/hourGuide.js` als generelles Modul `C3` nummeriert
- Doku: README, CONTRIBUTING und `check_versioning.ps1` pruefen und beschreiben die neue Headerform
- Feature: Time Marker behandelt `:` am Zeilenanfang als Platzhalter; `: Text` wird zum aktuellen Marker, leere `:`-Zeilen werden entfernt
- Feature: `appendTimeMarker()` gibt wie Cleanup `true` zurueck, wenn danach Markerzeilen vorhanden sind, sonst `false`
- Feature: `cleanupTimeMarker()` ersetzt `: Text` wie `appendTimeMarker()`, erzeugt aber keinen neuen leeren Marker
- Feature: `cleanupTimeMarker()` gibt `true` zurueck, wenn nach dem Cleanup Markerzeilen vorhanden sind, sonst `false`
- Fix: Cleanup sortiert Zeitmarker-Rows als Block ueber normalen Text und behandelt `text:: inhalt` nicht als Row
- Fix: `: Text` wird auch im Cleanup nach den bestehenden Source-Regeln gefuellt und danach in den Row-Block einsortiert
- Fix: Time Marker schreibt ersetzte `: Text`-Platzhalter sofort zurueck und setzt dabei keine zusaetzliche neue Markerzeile
- Fix: Time Marker akzeptiert `textField` als Alias fuer `targetTextField`, damit Cleanup-Aufrufe wie andere Text-Addons schreiben
- Fix: Cleanup entfernt keine Leerzeilen innerhalb von normalem Fliesstext mehr; bereinigt werden nur Marker-Grenzen, Marker-Zwischenraeume sowie fuehrende/abschliessende Leerzeilen
- Test/Doku: Regressionen fuer Doppelpunkt-Platzhalter, leere Marker wie `3: `, CR-Zeilenumbrueche und AfterEntry-Cleanup ergaenzt; Marker-Beispiele in README und Script-Kopf geklaert
- Feature: Multi-Choice-Helpers (#31); `multiChoiceAppend()` und `multiChoiceRemove()` als Workflow-Addon integriert
- Fix: Multi-Choice-Feldwerte aus Memento werden als listenartige Werte entpackt, damit Freitext nicht als `[freiwort]` neu angehaengt wird
- Test/Doku: Multi-Choice-Helfer mit Append-/Remove-Regressionen, README-Eintrag und Versioning-Check ergaenzt
- Doku: aktuelle Entry-Trigger mit parse-relevanter Reihenfolge in `ENTRY_WORKFLOWS.md` dokumentiert
- Fix: `overwriteHtmlField` schreibt den vollen Erstellen-/Overwrite-Link, `obsidianHtmlField` formatiert nur vorhandene Obsidian-Links; bei einem gemeinsamen Feld laufen beide Rollen auf dieses Feld
- Fix: Bestehende Obsidian-Links leeren das Overwrite-Feld und werden mit `Link verbunden:` im Obsidian-Feld ausgegeben
- Test/Doku: Obsidian-Linker-Regression (#33); README-Verhalten ergaenzt
- Feature: Verbundene Obsidian-Links zeigen zusaetzlich einen `Win:`-HTTP-Helper-Link fuer Windows-Klicks
- Test/Doku: Regression fuer Default- und Template-Windows-Link ergaenzt
- Change: Verbundene Linkfelder enthalten nur noch `Link:` und `Win:` mit ausgeschriebenem, verlinktem URL-Text
- Change: `Win:` wird nur noch erzeugt, wenn `windowsOpenBase` explizit gesetzt ist; lokaler `127.0.0.1`-Default entfernt
- Change: Verbundene Obsidian-Links werden testweise als Markdown-Link statt HTML-Link ausgegeben
- Change: Overwrite- und Obsidian-Felder schreiben Markdown-Links; `overwriteMarkdownField` und `obsidianMarkdownField` als neue bevorzugte Optionsnamen ergaenzt
- Feature: `open: true` versucht den verbundenen oder neu erzeugten Obsidian-URI per Android-Intent bzw. Java Desktop direkt zu oeffnen
- Fix: Windows-Open probiert nach Java `Desktop.browse()` zusaetzlich `rundll32.exe url.dll,FileProtocolHandler` ueber Java-Interop
- Fix: Markdown-Links werden beim erneuten Lauf stabil erkannt und nicht mehr ineinander verschachtelt
- Change: Nach `open: true` fuer einen neuen Overwrite-Link wird das Overwrite-Feld geleert und das Obsidian-Feld mit `Link: EINFÜGEN` als Wartezustand markiert
- Fix: `Link: EINFÜGEN` loest bei weiteren Laeufen kein erneutes Overwrite/Oeffnen aus
- Change: Wenn nur `obsidianMarkdownField` konfiguriert ist, wird nie ein Overwrite-Link erzeugt oder geoeffnet
- Change: Bestehende Obsidian-Links werden im Obsidian-Feld ohne `Link:`-Prefix als reine Markdown-Links geschrieben; `Link: EINFÜGEN` bleibt nur fuer den Wartezustand
- Doku: Getesteten Obsidian-Linker-Workflow mit Markdown-Feldern und `open: true` als empfohlene Windows-/Android-Konfiguration dokumentiert
- Fix: Ein Aufruf nur mit `obsidianMarkdownField` erzeugt und oeffnet wieder einen Overwrite-Link; wenn `open: true` scheitert, bleibt der Markdown-Link im Feld sichtbar
- Feature: `syncTypedTextFields()` integriert, um Felder mit `(t-dd)`, `(t-d)`, `(t-i)`, `(t-r)`, `(t-tag)` und `(t-l)` in passende Zielfelder zu konvertieren
- Test/Doku: WSH-Regressionen fuer Einzelentry, Bulk, Optionen und Konvertierungen sowie README- und Versioning-Eintraege ergaenzt
- Change: Markdown-Exports nutzen Langnamen als Standard; Row-Tabellen behalten Alias-Kuerzel als Standard-Header und koennen per `tableHeaderNames: "long"` Langnamen nutzen
- Feature: Normale Markdown-Exports trennen bei mehr als 5 Zeilen die grossen Kategorien Link/Mail/Tel, Zahlen und Text/List standardmaessig mit einer Leerzeile; per `markdownGroupSeparator` anpassbar und per `null` abschaltbar
- Fix: Markdown-Kategorietrenner zaehlen die urspruenglichen Tags, damit sie auch nach Row-Aggregation erhalten bleiben
- Fix: Markdown-Leerzeilen werden bei Gruppenwechseln explizit als echte Leerzeile gerendert, nicht mehr als leeres Separator-Element im Zeilen-Join
- Fix: Der Standard-Gruppentrenner bleibt auch aktiv, wenn `applyTags()` `markdownGroupSeparator` ohne Wert als `undefined` weiterreicht
- Change: Text- und Markdown-Exports lassen Blank-Tags ohne Wert standardmaessig weg; `includeBlankTags: true` stellt das bisherige Verhalten wieder her
- Doku: `markdownGroupSeparator: ""` und `includeBlankTags: false` in den `applyTags()`-Markdown-Beispielen der README, Workflow-Doku und `exportAtags`-Kopfbeispiele explizit aufgenommen
- Change: JSON-Value-Maps behalten wiederholte Tag-Werte als Arrays, damit `restoreAtags` sie per `valueMode` aggregieren kann
- Test: JSON-Export-Regression fuer wiederholte Werte als Arrays ergaenzt
- Feature: Tag-Syntax `tag:inhalt`, `tag:: inhalt`, `inhalt(:tag)` und `"das ist ein Satz"(:Aussage)` aus Issues #21/#22 integriert
- Fix: Normale Textstellen wie `text: inhalt` werden nicht mehr als Colon-Tag geparst
- Test/Doku: fokussierte Parser-Regressionen und README-Syntax ergaenzt
- Feature: Direkte Tag-Feld-Zuordnungen per `map`/`fields`/`mappings`, exklusiv per Default oder zusaetzlich mit `additional: true`
- Feature: Alias-Zeilen koennen Restore-Felder sammeln, z. B. `@@SymptomA (SA)[Symptom Field]: sa`
- Feature: `restoreAtags()` verarbeitet jetzt wahlweise den aktuellen Eintrag, `entryObj` oder eine Gruppe per `entries`/`entryGroup`/`group`; `bulkRestoreAtags()` bleibt nur als Kompatibilitaets-Wrapper
- Feature: Gruppen koennen Arrays oder Objekte mit `.entries()` sein; gemappte Felder werden bei Gruppen vor dem Restore geleert
- Feature: mehrere JSON-Werte und Aggregat-Texte wie `2 [3, 1]` werden per `valueMode` verdichtet; Standard ist `avg`, moeglich sind `avg`, `first`, `last`, `median`, `min` und `max`
- Change: Auto-Restore nutzt `_` als Standard-Suffix und `_l` als Standard-Listensuffix; `suffix: ""` ist als direktes gleichnamiges Ziel erlaubt
- Fix: Auto-Restore prueft Zielnamen gegen `lib().fields()` bzw. `targetFields` und ueberspringt fehlende Zielfelder vor dem Schreiben, statt Memento-Java-Fehler auszuloesen
- Fix: Gruppenwerte wie `lib().entries()` werden wie in `typedTextFields` als Java-/Listen-Collection per `length`, `size()/get()` oder `iterator()` entpackt, statt als einzelner Entry behandelt zu werden
- Fix: Rueckgabewerte von `.entries()` und direkte Iterator-Objekte werden ebenfalls entpackt, damit Bulk-Durchlaeufe nicht still ohne Eintraege enden
- Fix: `cfg.entries` wird wie beim Sequence-Counter direkt als Entry-Liste genutzt; `.entries()` wird nur noch bei `entryGroup`/`group`-Objekten aufgerufen
- Feature: `currentEntry` folgt dem Sequence-Counter-Muster und ersetzt/ergaenzt den aktuellen Eintrag in `entries`, schreibt dann aber nur diesen aktuellen Eintrag
- Feature: `debugField` schreibt optionale Restore-Diagnose in ein Textfeld
- Feature: `debugLog: true` bzw. `logDebug: true` spiegelt Restore-Diagnose zusaetzlich nach `log()`
- Fix: `debugLog` ruft `log()` direkt auf, statt Memento-Host-Funktionen per `typeof ... === "function"` zu filtern
- Test/Doku: `tests/test_restoreAtags.js` mit Mapping-, Alias-, Gruppen- und ValueMode-Regressionen sowie README-Beispiele ergaenzt
- Feature: Floating Average (#28); `updateAverage()` als Workflow-Addon integriert
- Verifikation: Syntax- und Versioning-Check; kein eigener Test wegen ueberschaubarer Addon-Logik
- Fix: Markdown-Export sortiert Row-Aggregate gemeinsam mit normalen Werten, behält die Werte in `[]` aber in Row-Reihenfolge
- Fix: Markdown-Export nutzt Alias-/Displaynamen als Label
- Test: Regression fuer Row-Aggregate vor Text/Blank und Alias-Label im Markdown-Export ergaenzt
- Feature: Markdown-Export sortiert nach Typgruppen Link, Mail, Tel, Integer, Real, Text, List, Blank und innerhalb der Gruppen alphabetisch
- Test: Export-Regression (#19); Tel-, Real- und List-Werte ergaenzt
- Fix: Im `currentEntry`-Modus ersetzt der aktuelle Eintrag eine gleichnamige/gleich-ID Library-Version im Berechnungsset, damit `AfterEntry()` nicht mit stale `lib().entries()` rechnet
- Test: Regression fuer `AfterEntry()`-nahen Fall mit altem Library-Eintrag und aktuellem Entry ergaenzt
- Fix: Wenn `currentEntry` nicht in `entries` enthalten ist, wird er fuer die Berechnung ergaenzt und fuehrt die letzte passende Sequenz fort
- Test: Regression fuer fortgefuehrte Sequenz bei separat uebergebenem `currentEntry` ergaenzt
- Fix: `currentEntry`-Abgleich (#25); Entry-IDs als Funktion werden fuer Einzel-Entry-Aufrufe sicher geschrieben
- Test: Regression ohne `fieldSequenceMax` (#25); Fall ergaenzt
- Feature: Wiki Linker (#27); `applyWikiLinker()` als Integration-Addon integriert
- Struktur: Workflow-Addons nach `addons/3_workflow/`, externe Integrationen nach `addons/6_integration/`
- Verifikation: Wiki Linker per Syntaxcheck geprueft; kein eigener Test wegen sehr kleiner, linearer Link-Helper-Logik
- Feature: Sequence Counter (#26); `updateSequenceSpree()` als Workflow-Addon integriert
- Test/Doku: fokussierter WSH-Test fuer Bulk, `currentEntry` und leere Gruppenfelder ergaenzt
- Fix: Alias-Deklarationszeilen mit `@@` werden nur noch fuer die Alias-Map genutzt und nicht mehr regulaer als Tags geparst
- Fix: Readable-/Tagbar-Zeilen lesen bare Tags wie `|| SymptomAlias` selbst, statt indirekt von Alias-Zeilen abzuhängen
- Test: Regression (#18); Fall ergaenzt
- Feature: Addons aus GitHub-Issues #17, #20 und #23 in aktive Moduldateien uebernommen
- Change: Addon-Liste in Tagging, Syncing und Other Add-ons gegliedert
- Struktur: Addon-Dateien in `addons/1_tagging/`, `addons/2_syncing/` und `addons/z_others/` sortiert
- Change: Hour Guide (#20); englisches Add-on mit `applyHourGuide()`/`makeHourGuideHtml()` integriert
- Fix: Sync Last From Latest liest ISO-artige Datumsstrings auch im Windows Script Host
- Feature: Obsidian-Linker-Felder (#24); getrennte Felder fuer Overwrite-Link und Obsidian-Link unterstuetzt
- Test/Doku: neue Addon-Tests, README-Eintraege und Versioning-Liste ergaenzt
- *Versionen: sys 2.21, exportAtags v1.70, Atag Helpers v2.03, Addon Tag Cleaner v1.21, collectAtags v1.42, restoreAtags v2.01, Shared Script: Time Marker v1.31, Addon Multi Choice Helpers v1.01, Addon Obsidian Linker v1.14, Addon Typed Text Fields v1.00, Addon Floating Average v1.00, Addon Sequence Counter v1.03, Addon Wiki Linker v1.00, Addon Sync Last From Latest v1.01, Addon Hour Guide v1.00.*

### 2026-04-25 - (ca. 4,0h, 4x)

- *Summary: Tagleisten-Cleaner, Readable-Archivierung, Parser-Regeln und Add-on-Pflege.*
- Doku: Pflegehinweis ergänzt, dass Modul-Kopfblöcke wegen des Memento-Java-Editors kurz bleiben und vorsichtig mit Quotes, Backticks, langen `Änderungen`-Listen und Sonderzeichen umgehen sollen
- Change: Cleaner gibt Tagleisten mit einfachem `|` aus; vorhandene `||`-Leisten bleiben beim Einlesen kompatibel
- Test/Doku: Cleaner-Erwartungen und Beispiele auf einfache `|`-Ausgabe umgestellt
- Feature: `tagBarSpacing: "double"` setzt zwei Leerzeilen Abstand zwischen Tagleiste und Inhalt
- Test/Doku: Double-Spacing oben und unten ergänzt
- Feature: `tagBarPosition: "auto"` schiebt die Tagleiste nach oben, sobald Zeitstempel-Zeilen wie `0:` oder `2,5:` vorhanden sind
- Test/Doku: Auto-Position für Zeitstempel-Felder ergänzt
- Change: Header aller Module und `ATAG_SYS_VERSION` auf `2.11` aktualisiert
- Doku: README und CONTRIBUTING auf `sys 2.11` angepasst
- Change: einfacher Cleaner-Tag-Suffix wechselt von `ᵗ` auf `ˣ`, z. B. `essen# -> essenˣ`
- Test: Cleaner- und Parser-Regressionen auf `tagˣ` umgestellt
- Fix: `enabled` und `collectResults` akzeptieren jetzt Memento-freundlich `0`/`1` sowie weiterhin `false`/`true`
- Test/Doku: Beispiele auf `enabled: 1` umgestellt und Disabled-Test mit `enabled: 0` geprüft
- Fix: `applyTags({ enabled: false })` gibt jetzt `null` zurück statt `{ items: [] }`, damit Funktionsfelder keinen Objekt-Rückgabewert auswerten müssen
- Test: Disabled-Wrapper-Erwartung angepasst
- Feature: Cleaner-Suffix `ᵗ` wird als leerer expliziter Tag gelesen, auch in `||`-Tagleisten
- Test: Parser-Regressionen für `tagᵗ` in Text und Tagleiste ergänzt
- Fix: doppelter `bulkApplyTagCleaner`-Beispielblock im Header entfernt, um Quote-/Editor-Probleme zu vermeiden
- Change: `essen#` und `#essen` werden im Cleaner in Text und Tagleiste zu `essenᵗ` normalisiert und bleiben parserfähig
- Fix: `##tag` und `tag##` werden nur entfernt und in Tagfelder geschrieben, wenn `tagFields`/`userTagFields` angegeben sind
- Test: Regressionen für `essenᵗ` und Double-Hash ohne Tagfelder ergänzt
- Fix: Kopfkommentar stark gekürzt und auf editor-sichere ASCII-Notes umgestellt, damit der Memento-Java-Editor nicht am `Änderungen`-Block hängen bleibt
- Wirkung: Funktionslogik unverändert; ausführliche Nutzung bleibt in `README.md` und `CHANGELOG.md`
- Fix: numerische `tag:10`-/`geld:+20,3`-Tokens in Tagleisten werden als Werte statt String-Tags behandelt
- Feature: `##tag` und `tag##` werden aus Notiz/Tagleiste entfernt und optional in mehrere `tagFields` geschrieben
- Change: Leerzeilen vor und nach dem Inhalt werden nach dem Verschieben der Tagleiste entfernt
- Doku: Bulk-Aufruf und `tagFields`-Option für den Cleaner ergänzt
- Test: Regressionen für numerische Colon-Werte, einfache Hash-Tags, Double-Hash-User-Tags und Trimming ergänzt
- Nachtrag: `Atag Helpers v1.10` war im Modul vorhanden, aber im Changelog noch nicht dokumentiert
- Wirkung: Versionskonflikt dokumentiert; Helper-Code selbst bleibt unverändert
- Change: String- und Funktions-Tags in Tagleisten werden kompakt als `tag:wert` ohne Leerzeichen nach `:` ausgegeben
- Test/Doku: Erwartungswerte und Beschreibung für kompakte Tagleisten-Werte angepasst
- Fix: Kommata nach Zahlenwerten werden als Trenner gelesen, ohne Dezimalkommas wie `-0,5` zu zerlegen
- Test: Regressionen für `Stress3,` und `Stress-0,5,` ergänzt
- Fix: überzählige Kommata am Ende unquoted String-Werte werden entfernt und wachsen bei rekursiver Anwendung nicht weiter
- Test: Regression für `zeta:einwort,,,` und quoted String-Werte mit Komma ergänzt
- Change: Tagleisten-Gruppen werden mit `, ` getrennt, innerhalb einer Gruppe bleibt die Trennung per Leerzeichen
- Test/Doku: Regression und Beschreibung für Gruppentrennung ergänzt
- Change: Funktions-Tag `fv` wird immer ans Ende der Tagleiste sortiert und ohne unnötige Quotes ausgegeben
- Change: String-Werte entfernen Quotes bei Einzelworten, behalten sie aber bei mehrteiligen Werten
- Test/Doku: Regression für Funktions-Tag-Sortierung und Quote-Normalisierung ergänzt
- Feature: `formatValues` nutzt die neuen Werte `"keep"`, `"min"`, `"max"` und `"none"`; alte `positiveSignMode`-Werte bleiben als Aliase lesbar
- Feature: `fv: "..."` in einer Tagleiste setzt die Werteformatierung pro Notiz, z. B. `|| fv: "min"`
- Change: Tagleisten werden als Werttags, String-Werte und leere Tags sortiert; String-Werte werden als `tag: wert` normalisiert
- Test/Doku: Beispiele und Regressionen für `fv`, die neuen Formatter-Werte und Tagleisten-Sortierung ergänzt
- Fix: Cleanup leerer TimeMarker und Leerzeilen läuft auch dann, wenn `maxHours` das Einfügen eines neuen Markers verhindert
- Test: Regression für Max-Hours-Abbruch mit bereinigtem Zeitblock ergänzt
- Fix: Tagleisten-Tokens nutzen `positiveSignMode: "preserve"` als Standard statt implizit `always`
- Doku: Header-Beispiele auf `positiveSignMode: "preserve"` korrigiert
- Test: schlanke Regression für `tagBarPosition: "top"` ohne expliziten `positiveSignMode` ergänzt
- Fix: `preserve` normalisiert normale Pluszeichen vor Hochzahlen, z. B. `Stress+³ -> Stress⁺³`
- Fix: TimeMarker schreibt bereinigte Leerzeilen auch zurück, wenn wegen gleicher/späterer Zeit kein neuer Marker gesetzt wird
- Test: Regressionen für `Stress+³` und vorhandenen gleichen Timestamp mit Leerzeile ergänzt
- Fix: Tagleiste oben mit `tagBarSpacing: "none"` entfernt alte führende Leerzeilen
- Feature: `positiveSignMode` steuert positive Vorzeichen: `"preserve"` (Standard), `"minimal"` oder `"always"`
- Fix: TimeMarker bereinigt Leerzeilen, die nach Entfernen leerer Marker zwischen Zeitmarkern oder vor der belegten Textzeile stehen
- Test: Regressionen für rekursive Top-Tagleiste, TimeMarker-Leerzeilen und positive Vorzeichen-Modi ergänzt
- Feature: Tagleiste kann über `tagBarPosition: "top"|"bottom"` oben oder unten ausgegeben werden
- Feature: Leerzeilen-Abstand kann über `tagBarSpacing: "blank"|"none"` gesteuert werden
- Change: Positive Zahlenwerte werden im Cleaner ohne Pluszeichen hochgestellt, z. B. `emo2 -> emo²`
- Test/Doku: Cleaner-Optionen und Pluszeichen-Regel ergänzt
- Feature: Alias-Einträge können feste Werte tragen, z. B. `@@SymptomA (SA): sa, SymptomAlias1`
- Wirkung: `SymptomAlias`, `SymptomAlias3` oder `|| SymptomAlias` ergeben immer `SymptomA+1`
- Test/Doku: feste Alias-Werte in Parser-Regressionen und README ergänzt
- Fix: Kopfkommentar im Export-Script stark gekürzt, um Java-Editor-Regex-Rekursion in Memento zu vermeiden
- Wirkung: Exportlogik bleibt unverändert, nur der editorseitig riskante Kommentarblock wurde entschärft
- Doku: Ausführliche aktuelle Export-Aufrufe zentral in `README.md` ergänzt
- Test: Export-Regressionen und Versioning geprüft
- Fix: Wiederholtes Anwenden bleibt stabil und erzeugt keine doppelte oder veränderte Tagleiste
- Test: Rekursions-/Idempotenzfälle für `makeTagCleanerText()` und Same-field-Apply ergänzt
- Feature: Parser liest hochgestellte Wert-Endformen wie `emo⁺²`, `tag⁻⁰³` und `stuff⁺⁺` im normalen Text
- Feature: `tagCleaner.js` normalisiert einfache Werttags und führt `|`-/`||`-Tagleisten am Feldende zusammen
- Test/Doku: Parser- und Cleaner-Regressionen sowie README-Nutzung ergänzt
- Fix: Beim Setzen eines neuen TimeMarkers werden alte leere TimeMarker-Zeilen entfernt
- Wirkung: Marker mit Inhalt bleiben erhalten, leere Zwischenmarker werden bereinigt
- Test: Regression für alten leeren Marker vor neuem Marker ergänzt
- Change: `Addon Readable Atag Text` aus dem aktiven Plugin-Set entfernt
- Archiv: der Stand mit Readable-Add-on liegt auf Branch `readable-addon-archive`
- Wirkung: Alias-, Sync-, Parser-, Export-, Restore- und TimeMarker-Funktionen bleiben erhalten
- Test/Doku: README, Versioning-Liste und Readable-Testdatei aus dem aktiven Stand entfernt
- Change: Row-Tagzeilen werden mit zwei Leerzeichen vor `|` ausgegeben
- Feature: `blankLineBetweenRows: "never"` entfernt bestehende Leerzeilen beim Re-Write
- Test/Doku: Readable-Erwartungen und README-Beispiele angepasst
- Feature: `backupTextField` sichert den ursprünglichen Quelltext einmalig, wenn das Backupfeld leer oder Whitespace ist
- Feature: `bulkApplyReadableAtagText()` unterstützt Backupfelder für die gesamte Datenbank über `lib().entries()`
- Doku: Backupfeld in Add-on- und README-Beispielen ergänzt
- Doku: `CONTRIBUTING.md` ergänzt, dass neue/geänderte Konfigurationsoptionen künftig in den jeweiligen Usage-/Beispielblöcken mitgepflegt werden müssen
- Doku: `enabled: true` in den Apply-Beispielen von `exportAtags` und `readableAtagText` ergänzt
- Feature: `enabled: false` als No-op-Schalter für `applyTags`, Bulk-Apply/Export und Readable ergänzt
- Change: Readable gibt bei `enabled: false` den Quelltext unverändert zurück und schreibt kein Zielfeld
- Test/Doku: Disabled-Verhalten für Apply- und Readable-Pfade ergänzt
- Fix: Kommas direkt nach `##tag` oder `tag##` werden zusammen mit dem Marker entfernt
- Fix: vorhandene globale `||`-Zeilen bleiben bei wiederholter Anwendung erhalten, statt Textwerte zu verlieren
- Test: Same-field-Idempotenz fuer Row- und globale Tagzeilen ergänzt
- Fix: bestehende Row-Tagzeilen `| ...` werden nach einer Row verbraucht und nicht dupliziert
- Feature: vorhandene `|`-Zeilen werden normalisiert, wenn in der Row selbst keine neuen Tags gefunden wurden
- Test: bestehende Readable-Zeile, bearbeitete Tagzeile und Row-Änderung mit alter Tagzeile ergänzt
- Feature: gequotete Hash-Werte werden sichtbar zu `'tag name': Wert` umgeschrieben
- Test: `"test das hier"#4,1` und `'und das'#'das das'` im Readable-Add-on ergänzt
- Test/Doku: Alias-Beispiele klarer auf kanonischen Langtag ausgerichtet, z. B. `@@SymptomA (sa)` und `sa2 -> SymptomA`
- Feature: `applyReadableAtagText()` und `makeReadableAtagText()` akzeptieren optional ein `collectAtags()`-`result`
- Feature: Bei vorhandenem `result` werden `|`/`||`-Tagzeilen aus `result.items` gebaut und `displayName`-Kürzel genutzt
- Test/Doku: Readable-Test für result-basierte Tagzeile ergänzt
- Change: Tag-Typgruppen in `|`/`||`-Zeilen werden jetzt mit `, ` statt zwei Leerzeichen getrennt
- Test/Doku: Readable-Erwartungen und Beispielhinweis angepasst
- Doku: Readable-Beispiel trennt Alias-Feld und Notiz-Feld explizit, passend zu `aliasTextFields`
- Fix: Doppel-Hash-Marker werden vor dem Single-Hash-Parser verarbeitet, damit `tag##` und `##tag` nicht als sichtbarer Text oder `tag#...`-Wert stehen bleiben
- Test: Satzzeichen-Fall `##test,` und `test##.` ergänzt
- Change: Alias-Felder werden nicht mehr automatisch gesucht; separate Alias-Quellen muessen explizit per `aliasTextFields` oder `aliasText` uebergeben werden
- Test/Doku: Readable-Tests auf explizite Alias-Feldkonfiguration angepasst
- Fix: automatische Alias-Feldsuche erkennt zusätzliche Schreibweisen wie `alias`, `aliases`, `aliase`, `Aliaszeile`
- Test: konkrete Regression für `0: Etwas Schlafmangel2 test##` mit `SchlM²` und entferntem `test##`
- Fix: übliche Alias-Felder wie `Alias`, `Aliases` und `Aliase` werden automatisch für Kürzel gelesen
- Fix: `##tag` und `tag##` werden aus dem sichtbaren Text entfernt, inklusive nachfolgender Leerzeichen
- Test/Doku: Regression für automatische Alias-Felder und doppelte Hash-Marker ergänzt
- Fix: Readable-Add-on nutzt Alias-Kürzel auch dann, wenn die Alias-Zeilen in separaten Feldern stehen
- Feature: `aliasTextFields` und `aliasText` für Readable-Formatierung ergänzt
- Test/Doku: Regression für `@@Schlafmangel (SchlM): ...` mit `Schlafmangel2 -> SchlM²`
- Feature: Parser-Items behalten Alias-Kürzel als `displayName`
- Feature: Row-Tabellen verwenden Alias-Kürzel standardmäßig als Header
- Feature: Tabellen-Header können über `tableHeaderNames: "long"` oder `"both"` auf Langform umgestellt werden
- Test/Doku: Parser-Displaynamen und Tabellen-Header-Optionen ergänzt
- Feature: Readable-Ausgabe nutzt jetzt kompakte `|`-Row-Tagzeilen und `||` fuer globale Tags statt Blocklayout
- Feature: Parser liest die neue Readable-Form mit Superscript-Werten wie `sa²`, `Wk⁺⁺`, `Gutⁿ`
- Feature: Alias-Deklarationen ohne Aliasliste sind erlaubt, z. B. `@@Wirkung (Wk)` oder `@@Gut`
- Feature: optionale Leerzeilen zwischen Rows ueber `blankLineBetweenRows: "tagged"` oder `"always"`
- Test/Doku: Parser- und Add-on-Tests sowie `README.md` aktualisiert
- Feature: Alias-Definitionen unterstützen optionale Kürzel, z. B. `@@SymptomA (sa): SymptomA`
- Feature: `##`-Tagzeilen wie `## sa (3), emo (4)` werden im aktuellen Row-Kontext gelesen
- Feature: neues Readable-Add-on schreibt schmale Row-Blöcke mit kompakter `##`-Tagzeile
- Test/Doku: Parser- und Add-on-Tests sowie `README.md` ergänzt
- Change: Readable-Add-on-Experiment zurückgenommen; Idee bleibt in `NEXT_STEPS.md` für einen neuen, kleinbildschirmfreundlichen Entwurf
- Change: Parser-Sonderregeln für Readable-Suffixe wieder entfernt; bestehende Quote-/Hash-Fixes bleiben erhalten
- Intern: Quote-Zustand wird pro Parse-Zeile vorberechnet und ueber kleine Helper wiederverwendbar gemacht
- Test: `tests/test_collectAtags.js` um Quote-Regressionsfaelle fuer numerische Kurz-Tags ergaenzt
- Change: `addons/timeMarker.js` Header an das gemeinsame `v... (sys ...)` Format angepasst
- Doku: Header und Versionierungsbeispiele in `README.md` und `CONTRIBUTING.md` auf `sys 2.10` aktualisiert
- Tooling: `check_versioning.ps1` akzeptiert reine Systemversionssprünge ohne Modulversionssprung
- Tooling: `check_versioning.ps1` toleriert beim Umstieg alte Modulheader ohne bisherige Systemversionszeile
- Fix: Quoted Hash-Tags wie `"test das hier"#4,1` und `'und das'#7` übernehmen den Wert nach `#`
- Fix: Quoted Hash-Tags übernehmen auch gequotete Textwerte wie `'und das'#'das das'`
- Fix: Hash-, Simple- und Colon-Tags innerhalb längerer Quotes werden ignoriert
- Test: `tests/test_collectAtags.js` um Quoted-Hash-Werte erweitert
- Feature: Tag-Ausgaben werden alphabetisch sortiert; normales Markdown behält die Typ-Gruppen und sortiert darin alphabetisch
- Fix: Export-Helfer vermeiden `String.prototype.trim()` für WSH-Kompatibilität
- Fix: JSON-Export nutzt einen lokalen Stringifier für ältere WSH-Hosts ohne `JSON.stringify`
- Test: `tests/test_exportAtags.js` ergänzt für `tags`, `md`, `rows_md`, `text` und `json`
- *Versionen: Addon Tag Cleaner v1.20, sys 2.11, collectAtags v1.35, Atag Helpers v1.12, Shared Script: Time Marker v1.26, exportAtags v1.41, Addon Readable Atag Text v1.24.*

### 2026-04-23 - (ca. 1,2h, 2x)

- *Summary: Global-Field-Sync, Time-Marker-Wiederaufnahme und Stundenlimit.*
- Fix: `syncFieldBack()` schreibt leere aktuelle Feldwerte nicht mehr in den ersten Eintrag zurück
- Fix: `syncFieldTo()` und `syncFieldAll()` suchen bei leerem ersten Eintrag im selben Feld die ersten 20 Einträge nach einem gefüllten Wert ab
- Test/Doku: `tests/test_globalFieldSync.js` ergänzt und Mojibake in `README.md` für den Time-Marker-Bereich korrigiert
- Feature: `addons/timeMarker.js` wieder eingebunden und `appendTimeMarker()` dokumentiert
- Feature: optionales Stundenlimit über `maxHours` mit Standardwert `30` ergänzt
- Test/Doku: `tests/test_timeMarker.js` und `README.md` erweitert
- Optimierung: `rows_md` und `rows_html` nutzen vorberechnete Summen/Zähler statt pro Tag erneut Werte-Arrays aufzubauen
- Verifikation: Row-Markdown- und HTML-Ausgabe direkt im WSH-Host geprüft
- Feature: neues unabhängiges Add-on `addons/globalFieldSync.js` mit `syncFieldTo`, `syncFieldBack` und `syncFieldAll`
- Feature: mehrere Felder und optionale Konfliktbehandlung über `overwrite: true` unterstützt
- Feature: inverse Aliase unterstützt, z. B. `@@emo: -down, froh` mit `down2 -> emo-2`
- Verifikation: inverse Alias-Auflösung direkt im WSH-Host geprüft
- Fix: reine Integer-Tags werden in `md`, `rows_md` und `rows_html` ohne `,0` ausgegeben
- Fix: Dezimalstellen bleiben sichtbar, wenn echte Dezimalwerte vorkommen oder das Aggregat nicht ganzzahlig ist
- Verifikation: Exportausgabe direkt im WSH-Host geprüft
- *Versionen: Addon Global Field Sync v1.01, Shared Script: Time Marker v1.22, exportAtags v1.37, collectAtags v1.23, Atag Helpers v1.05.*

### 2026-04-22 - (ca. 1,2h)

- *Summary: Repo-Struktur, Tag-Pair-Parser, Export-Formatierung und Parser-Fixes.*
- Architektur: Tag-Pair-Logik als separates Add-on in `addons/tagPairParser.js`, ohne direkten Hook in `applyTags()` / `bulkApplyTags()`
- Test/Doku: `tests/test_tagPairParser.js` und `README.md` für die Add-on-Nutzung ergänzt
- Struktur: flache Ordnerstruktur mit `core/`, `addons/` und `tests/` eingeführt
- Move: Kernmodule nach `core/collectAtags.js`, `core/exportAtags.js`, `core/helpers.js`, `core/restoreAtags.js` verschoben
- Move: Tests nach `tests/test_collectAtags.js` und `tests/test_tagPairParser.js` verschoben, Referenzen in Doku und `check_versioning.ps1` angepasst
- Fix: `shortenTableHeaders: 0` bedeutet jetzt 10 Zeichen plus `.`
- Fix: `rows_html` rendert Tabellen jetzt mit Sans-Serif-Schrift
- Fix: Tabellen-Header werden standardmäßig gekürzt statt unbegrenzt ausgegeben
- Fix: `shortenTableHeaders: 0` bedeutet jetzt 12 Zeichen plus `.`
- Doku: README ergänzt und Versionsprüfungsskript hinzugefügt
- Fix: negative Zahlenformen werden wieder korrekt erkannt: `tag-2`, `yay-2,3`, `emo-12,32`
- Fix: `tag: 5` wird im JScript-Host wieder korrekt als Wert gelesen
- Test/Doku: `test_collectAtags.js` ergänzt, um die dokumentierten Tag-Formen gesammelt zu prüfen
- *Versionen: Addon Tag Pair Parser v1.00, exportAtags v1.35, Atag Helpers v1.03, collectAtags v1.22.*


## Vorgaben

### Format

- Datum und Dauer im Format `### YYYY-MM-DD - (ca. 2,3h)`; geschätzte Tagesdauern immer mit `ca.` markieren.
- Für neue Arbeit Dauer möglichst direkt messen; nachträglich nur schätzen, wenn keine Messung vorhanden ist.
- Für Schätzungen aktive Arbeitszeit ansetzen; nachvollziehbare Aktivität zählt mit, auch ohne Commit. Leere Zeitlücken über 1 Stunde nur ausnehmen, wenn dort weder Commits noch andere nachvollziehbare Aktivität liegen.
- Bei mehreren Sessions optional die Anzahl notieren, z. B. `(ca. 2,2h, 3x)`; wenn gar nichts nachvollziehbar ist, `(n/a)` verwenden.
- Unter `Stats` zuerst `Ausgangsdatum: YYYY-MM-DD` notieren
- Danach feste Stats-Abschnitte nutzen: `Diese Woche`, `Letzte Woche`, `Dieser Monat`, `Letzter Monat`, `Jahr`, `Insgesamt`
- Stats-Abschnitte im Format `*Abschnitt (Dauer, Tage, Inhalte):*` schreiben; dort muss `ca.` nicht wiederholt werden, auch wenn einzelne Tageswerte geschätzt sind. Darunter eine kurze spezifische Themenzeile, keine Tabelle
- `Stats`-Inhalte nach Relevanz sortieren: große Umbauten und verhaltensrelevante Themen vor Doku/Formalia
- Einträge stehen unter `## Log`; jeder Tagesblock ist ein `###`-Punkt
- Pro Arbeitsschritt kurze Stichpunkte
- Datei/Modul nennen, wo es hilfreich ist
- Normale Einträge beginnen mit Typ, z. B. `Feature:`, `Fix:`, `Change:`, `Doku:`, `Test:` oder `Refactor:`
- Issue direkt hinter das Thema setzen, z. B. `- Feature: Emoji-/Symbol-Aliasheader ohne Kurznamen (#54); Details...`
- Gleiche Tage werden in einem Eintrag zusammengezogen; die Dauer ist die Tagesgesamtzeit, optional mit Session-Anzahl
- Ab 7 Punkten im Tagesblock als ersten Punkt eine kurze kursiv gesetzte Zeile `*Summary: ...*` ergänzen
- `Summary:` von entscheidend zu weniger entscheidend schreiben: große Umbauten zuerst, danach Features/Fixes, Doku/Formalia zuletzt
- Wirkung dokumentieren, nicht nur `Fix` oder `Update`
- Versionssprünge nicht als eigene Hauptpunkte führen
- Versionen bei Bedarf immer als kursiv gesetzten letzten Stichpunkt des Tages gesammelt nennen, z. B. `- *Versionen: ...*`
- Bei `Versionen:` pro Datei nur den aktuellen/finalen Versionssprung des Tages nennen, keine Zwischenversionen
- Test/Doku erwähnen, wenn ergänzt

### Vorlage

```md
### 2026-04-22 - (ca. 0,4h)
- *Summary: Parser-Fixes für Zahlen-/Colon-Werte und Regressionstests.*
- Fix: Parser erkennt negative Zahlenformen wieder korrekt; Details.
- Test/Doku: `tests/test_collectAtags.js` ergaenzt.
- *Versionen: collectAtags v1.22.*
```
