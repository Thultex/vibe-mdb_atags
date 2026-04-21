ATAG SYSTEM (sys 2.00)
========================================

ZIEL
----------------------------------------
Freitext → strukturierte Daten → flexible Exporte

- Tags + Werte extrahieren
- Links / Mail / Tel erkennen
- Row-Kontext (z. B. "5h: emo3") verarbeiten
- Mehrfachwerte aggregieren
- Alias-System unterstützen
- Hybrid-Tag-System (Parser + manuell)
- Export in tags / md / rows_md / rows_html / json


ARCHITEKTUR
----------------------------------------

Textfelder
   ↓
collectAtags()
   ↓
result.items   ← Single Source of Truth
