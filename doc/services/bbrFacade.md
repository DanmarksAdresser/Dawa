# BBR facaden

BBR facaden er en service, som tager imod adressehændelser fra BBR. Hændelserne leveres via HTTP-protokollen,
hvor BBR agerer klient og BBR facaden agerer server. BBR-facaden gemmer de modtagne hændelser i Amazons DynamoDB.

## Konfigurationsparametre
For en beskrivelse af hvordan BBR-facaden konfigureres, se den [generelle dokumentation](../Konfiguration.md)

```
 $> node bbr/facade/bbrFacade.js --help
```

## Overvågnings URL'er
Indtil videre kan URL'en /sidsteSekvensnummer benyttes som overvågningsURL. Den verificerer, at der er hul igennem til
DynamoDB.

## Mulige incidents
Der bør holdes øje med fejllogninger i 'bbrFacadeIncidents' categorien, da disse indikerer fejl der skal følges op på.
Det kan være uventede sekvensnumre i hændelser modtaget fra BBR, eller hændelser som ikke validerer.