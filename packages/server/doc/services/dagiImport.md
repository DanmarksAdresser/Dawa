# DAGI importer
DAGI Importeren er en service som kan importere DAGI-temaer (regioner, politikredse, sogne m.v.) fra kortforsyningens
WFS-webservice. Temaerne indlæses i PostgreSQL databasen. Under indlæsningen beregnes også adressernes relation til DAGI-temaerne.

Det tager ca. en time at køre importeren.

Såfremt indlæsningen fejler returnerer scriptet en exitcode forskellig fra 0.

## Konfiguration
For en beskrivelse af hvordan DAGI importeren konfigureres, se den [generelle dokumentation](../Konfiguration.md)

```
 $> node dagiImport/dagiImport.js --help
```

## Mulige incidents
- Kortforsyningens WFS-webservice kan være utilgængelig.