# Error Notes

## MementoDB: Struktur-Editor/Feldbearbeitung bricht ab

Datum:
- 2026-04-22

Symptome:
- Beim Anlegen neuer Felder oder beim Bearbeiten der Bibliotheksstruktur bricht Memento ab.
- Der Fehler kann auch auftreten, wenn der aktuelle Script-Inhalt an sich leer oder unkritisch ist.
- `collector`, `helper` und `exporter` koennen als aktueller Code jeweils unauffaellig sein.
- Auffaellig war stattdessen die Betrachtung bzw. Existenz des internen Versionsverlaufs eines Script-Felds, besonders beim Exporter.

Beobachtung:
- Das Problem verschwand, nachdem die interne Historie des betroffenen Script-Felds geloescht wurde.
- Der Abbruch hing damit sehr wahrscheinlich nicht am aktuellen Code, sondern an einem defekten oder problematischen Eintrag in der Memento-internen Feldhistorie.

Wahrscheinliche Ursache:
- Beschaedigter oder schwer verdaulicher Snapshot im internen Versionsverlauf eines Script-Felds.
- Nicht primaer ein Parser-/Runtime-Fehler des aktuellen Skripts.

Workaround:
- Interne Historie des betroffenen Script-Felds loeschen.
- Danach nur den aktuellen stabilen Code im Feld behalten.
- Wenn noetig: Script-Feld neu anlegen statt eine problematische Historie weiter mitzuschleppen.

Hinweis fuer spaeter:
- Wenn Struktur-Bearbeitung abstuerzt, aber der aktuelle Code isoliert unauffaellig wirkt, immer auch die interne Feldhistorie von Memento als Fehlerquelle pruefen.

## DustingDay/Input Linker: neuer Day landet nach dem Linken im Papierkorb

Datum:
- 2026-07-05

Symptome:
- Beim Speichern eines neuen `DustingInput` wurde ein passender `DustingDay` gefunden oder erstellt und verlinkt.
- Danach landete der neu erstellte oder aktualisierte Day-Eintrag trotzdem im Papierkorb.
- Das Problem trat zeitweise sogar beim ganz normalen Neu-Erstellen auf, also nicht nur bei bereits vorhandenen `DayLinks`.
- Mit `openTargetEntry: true` lief es wieder stabil, sobald der Link-Pfad minimal gehalten wurde.

Beobachtung:
- Die stabile Phase des `Input Linker` lag bei einem weitgehend reinen Link-only-Pfad: Day suchen/erstellen, `entry.link(...)`, danach möglichst wenig am Input anfassen.
- Später eingeschobene Komfortpfade machten den Memento-Relation-Lifecycle fragil:
  - `refreshBeforeOpen` führte direkt vor dem Öffnen einen zweiten Receive-/Schreibdurchlauf aus.
  - `linkInputEntryToTarget()` schrieb zusätzlich `DayId` in den Input.
  - Restore-/EnsureActive-Nachläufe liefen direkt nach dem Linken.
- `receiveAfterLink` selbst war nicht der frische Hauptverdacht, weil es schon in einer funktionierenden Zwischenphase existierte.

Lösung:
- `Input Linker` v0.82 entfernte `refreshBeforeOpen` vollständig aus dem Input-Linker-Pfad.
- `Input Linker` v0.83 brachte den Neu-Link-Pfad näher an die stabile Link-only-Version:
  - kein automatisches Schreiben von `DayId` im Input-Linker,
  - kein Restore-/EnsureActive-Nachlauf im normalen `linkInputEntryToTarget()`-Pfad,
  - vorhandene `DayLinks` mit `receiveExistingLink: false` bleiben ein echter No-op.
- `Input Linker` v0.85 entfernte die kritischen Restore-/EnsureActive- und DayId-Schreibfunktionen ganz aus dem Code, damit auch `refreshTargetFromInputEntries()` sie nicht mehr versehentlich ausführt.
- Verdacht vom 05.07.2026: `restoreAtags()` im normalen `PostEntry(e)` ist riskant, weil es aus `Atag Json` per `entryObj.set(...)` in Ziel-/Auto-Felder zurückschreibt. Dieser Schritt gehört hinter eine explizite zweite `PostEntry`-Option, nicht in den normalen Linker-Postwork.
- Produktiver Input-Aufruf darf weiter `openTargetEntry: true` und `receiveAfterLink: true` nutzen.

Hinweis für später:
- Wenn Day-Einträge wieder im Papierkorb landen, zuerst prüfen, ob im Input-Linker-Pfad erneut zusätzliche Schreib-/Refresh-/Restore-Aufrufe vor oder nach dem Relation-Link gelandet sind.
- Der Input-Linker sollte nur den Link herstellen; Aggregation, Rebuild und Reparatur gehören vorzugsweise in den `DustingDay`-Kontext.
