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
