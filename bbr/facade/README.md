
BBR facade
-------------

BBR facaden er en service, som tager imod adressehændelser fra BBR. Hændelserne leveres via HTTP-protokollen,
hvor BBR agerer klient og BBR facaden agerer server. BBR-facaden gemmer de modtagne hændelser i Amazons DynamoDB.

Servicebeskrivelsen findes i doc folderen.

Køres ```node bbrFacade.js --help``` fås en kort beskrivelse af de mulige parametre, som servicen kan startes op med.

Alle parametre kan angives enten på kommandolinjen eller via environment variables.

- Servicebeskrivelse
- Konfigurationsparametre
- Konfiguration af logning
- OvervågsningsURL'er
- Hvordan der logges
- Mulige incidents

- Konfigurationsfil med logningskonfiguration
- Parameter med angivelse af logfil
