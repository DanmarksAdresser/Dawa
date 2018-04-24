# DAWA Autocomplete
DAWA autocomplete er en JavaScript komponent, som giver mulighed for at indtaste en dansk adresse i ét input-felt
ved hjælp af autocomplete. [Komponenten anvender Danmarks Adressers Web API (DAWA)](http://dawa.aws.dk).

Komponenten er baseret på JQueryUI's [autocomplete widget](http://api.jqueryui.com/autocomplete/). Den har ingen andre
afhængigheder end JQuery.

Du kan se en demo af komponenten på [dawa.aws.dk](http://dawa.aws.dk).

## Installation
Komponenten kan installeres via [bower](bower.io):
```
bower install dawa-autocomplete
```

## Eksempler
Aktivering af DAWA autocomplete:
```javascript
  $('#autocomplete-adresse').dawaautocomplete({
      select: function(event, adresse) {
        // denne funktion bliver kaldt når brugeren vælger en adresse.
      }
  });
```

Angiv konfigurationsparametre:
```javascript
$('#myInput').dawaautocomplete({
  jsonp: false,
  baseUrl: 'http://dawa.aws.dk',
  minLength: 2,
  delay: 0,
  adgangsadresserOnly: false,
  params: {},
  timeout: 10000,
  select: function(event, adresse) {
    // denne funktion bliver kaldt når brugeren vælger en adresse.
  }
  error: function(xhr, status, error) {
    // denne funktion bliver kaldt ved fejl
  }
});
```
## Options
Det er muligt at angive følgende options:
 - <strong>jsonp</strong>: Anvend JSONP i stedet for JSON (som default anvendes JSON hvis CORS er supporteret af 
 browseren).
 - <strong>baseUrl</strong>: URL til API (default http://dawa.aws.dk)
 - <strong>minLength</strong>: Antal karakterer, der skal være tastet for autocomplete vises (default 2)
 - <strong>params</strong>: Angiver yderligere parametre (eksempelvis postnr, kommunekode), som sendes med ved kald til DAWA
 - <strong>adgangsadresserOnly</strong>: Angiver, at der indtastes en adgangsadresse og ikke en fuld adresse (default: false)
 - <strong>timeout</strong>: Antal millisekunder der ventes på svar fra serveren før der gives op (default: 10000)
 - <strong>error</strong>: Callback-funktion ved fejl eller timeout. (default: null). Se
     [JQuery's dokumentation](http://api.jquery.com/jquery.ajax/) for en beskrivelse af parametre til funktionen

## Events
DAWA Autocomplete udsender følgende events:
 - <strong>select</strong>: Når brugeren har valgt en adresse
 - <strong>error</strong>: Ved fejl under kald af DAWA