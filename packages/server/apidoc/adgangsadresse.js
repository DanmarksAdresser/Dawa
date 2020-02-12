const {
  autocompleteSubtext,
  formatAndPagingParams,
  fuzzyParameter,
  reverseGeocodingParameters,
  overwriteWithAutocompleteQParameter,
  autocompleteParameter
} = require('./common');

const {
  strukturParameterAdresse,
  geometriParam,
  parametersForBothAdresseAndAdgangsAdresse,
  medtagUgyldigeNedlagte
} = require('./adresseCommon');

const {
  replikeringDoc
} = require('./replikeringCommon');

var adgangsadresseIdParameter = {
  name: 'id',
  doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
};

var adgangsadresseParameters = [
  {
    name: 'q',
    doc: `Søgetekst. Der søges i vejnavn, husnr, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adgangsadressen. 
    Wildcard * er tilladt i slutningen af hvert ord.
    Der skelnes ikke mellem store og små bogstaver. Der returneres højst 1000 resultater ved anvendelse af parameteren.
    Parameteren "fuzzy" kan tilføjes for at lave fuzzy søgning.
    Hvis behovet er at fremsøge en enkelt adresse ud fra en adressetekst, så vil det i de fleste tilfælde være bedre at benytte <a href="/dok/api/adgangsadresse#datavask">datavask API'et</a>.`,
    examples: ['tværv*']
  },
  autocompleteParameter,
  fuzzyParameter,
  {
    name: 'kvh',
    doc: 'KVH-nøgle. 12 tegn bestående af 4 cifre der repræsenterer kommunekode, 4 cifre der repræsenterer vejkode efterfulgt af 4 tegn der repræsenter husnr. Se <a href="#adgangsadresse_kvh">databeskrivelse</a>.',
    examples: ['01016378__33']
  },
  adgangsadresseIdParameter].concat(parametersForBothAdresseAndAdgangsAdresse);

const adgangsadresseEventExamples = [{
  description: 'Find alle adgangsadressehændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
  query: [{
    name: 'sekvensnummerfra',
    value: '990'
  }, {
    name: 'sekvensnummertil',
    value: '1000'
  }]
}, {
  description: 'Find alle adgangsadressehændelser for adgangsadressen med id 038edf0e-001b-4d9d-a1c7-b71cb354680f',
  query: [{
    name: 'id',
    value: '038edf0e-001b-4d9d-a1c7-b71cb354680f'
  }]
}];

module.exports = [
  {
    entity: 'adgangsadresse',
    path: '/adgangsadresser',
    subtext: 'Søg efter adresser. Returnerer de adresser som opfylder kriteriet. Med mindre der er behov' +
    ' for felter  som kun er med i den fulde adressestruktur anbefaler vi at, man tilføjer parameteren <code>struktur=mini</code>,' +
    ' da dette vil resultere i bedre performance.',
    parameters: [...adgangsadresseParameters, geometriParam, ...formatAndPagingParams, strukturParameterAdresse, ...medtagUgyldigeNedlagte],
    examples: [{
      description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.',
      query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
        {name: 'husnr', value: '46'},
        {name: 'struktur', value: 'mini'}]
    },
      {
        description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.' +
        ' Resultatet leveres i <em>JSONP</em> format.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
          {name: 'husnr', value: '46'},
          {name: 'callback', value: 'cbFun'}]
      },
      {
        description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.' +
        ' Resultatet leveres i <em>geojson</em> format.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},

          {name: 'husnr', value: '46'},
          {name: 'format', value: 'geojson'},
          {name: 'struktur', value: 'mini'},]
      },
      {
        description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.' +
        ' Resultatet leveres i <em>csv</em> format.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
          {name: 'husnr', value: '46'},
          {name: 'format', value: 'csv'}]
      },
      {
        description: 'Find de adgangsadresser som indeholder et ord der starter med hvid og har postnummeret 2400',
        query: [{name: 'q', value: 'hvid*'},
          {name: 'postnr', value: '2400'}]
      },
      {
        description: 'Find de adgangsadresser som er indenfor polygonet <em>(10.3,55.3), (10.4,55.3), ' +
        '(10.4,55.31), (10.4,55.31), (10.3,55.3)</em>',
        query: [{
          name: 'polygon',
          encodeValue: false,
          value: '[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]]'
        }]
      },
      {
        description: 'Hent alle adgangsadresser i Københavns kommune (kode 0101), i GeoJSON format, med koordinater angivet i ETRS89 / UTM zone 32N (SRID 25832)',
        query: [{name: 'kommunekode', value: '0101'},
          {name: 'format', value: 'geojson'},
          {name: 'srid', value: '25832'}]
      },
      {
        description: 'Find den adresse, som har KVH-nøgle 04615319__93',
        query: [{name: 'kvh', value: '04615319__93'}]
      }
    ]
  },
  {
    entity: 'adgangsadresse',
    path: '/adgangsadresser/{id}',
    subtext: 'Modtag adresse med id.',
    parameters: [adgangsadresseIdParameter, strukturParameterAdresse, geometriParam, ...medtagUgyldigeNedlagte],
    nomulti: true,
    examples: [{
      description: 'Returner adressen med id 0a3f507a-b2e6-32b8-e044-0003ba298018',
      path: ['/adgangsadresser/0a3f507a-b2e6-32b8-e044-0003ba298018']
    }]
  },
  {
    entity: 'adgangsadresse',
    path: '/adgangsadresser/autocomplete',
    subtext: `Autocomplete af adgangsadresser. Der kan anvendes de samme parametre som ved søgning, men bemærk at
         <em>q</em> parameteren fortolkes anderledes. Læs mere under <a href="generelt#autocomplete">autocomplete</a>. 
        DAWA tilbyder en <a href="/dok/api/autocomplete">kombineret autocomplete</a>, som giver en bedre brugeroplevelse end autocomplete
        direkte i adgangsadresser.`,
    parameters:
      [...overwriteWithAutocompleteQParameter(adgangsadresseParameters), geometriParam, ...medtagUgyldigeNedlagte, ...formatAndPagingParams],
    examples: [
      {
        description: 'Find alle adgangsadresser som indeholder <em>rand</em>',
        query: [{name: 'q', value: 'rand'}]
      },
      {
        description: 'Find alle adgangsadresser som indeholder <em>randers</em> indenfor postnummer <em>8600</em>',
        query: [{name: 'q', value: 'randers'},
          {name: 'postnr', value: '8600'}]
      }]
  },
  {
    entity: 'adgangsadresse',
    path: '/adgangsadresser/reverse',
    subtext: 'Find den adresse, som ligger nærmest det angivne koordinat. Som koordinatsystem kan anvendes ' +
    'ETRS89/UTM32 med <em>srid=<a href="http://spatialreference.org/ref/epsg/25832/">25832</a></em> eller ' +
    'WGS84/geografisk med <em>srid=<a href="http://spatialreference.org/ref/epsg/4326/">4326</a></em>.  Default er WGS84.',
    parameters:
      [...reverseGeocodingParameters, strukturParameterAdresse, geometriParam, ...medtagUgyldigeNedlagte],
    examples:
      [{
        description: 'Returner adgangsadressen nærmest punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
        query: [{name: 'x', value: '12.5851471984198'},
          {name: 'y', value: '55.6832383751223'},
          {name: 'struktur', value: 'mini'}]
      },
        {
          description: 'Returner adressen nærmest punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}]
        }]
  },
  {
    entity: 'adgangsadresse',
    path: '/datavask/adgangsadresser',
    subtext: 'Datavask af adgangsadresse. Servicen modtager en adressebetegnelse og svarer med 1 eller flere  adgangsadresser, ' +
    'som bedst matcher svaret. Endvidere er der en angivelse af hvor godt de fundne adgangsadresser matcher adressebetegnelsen.',
    parameters: [{
      name: 'betegnelse',
      doc: 'Adressebetegnelsen for den adgangsadresse som ønskes vasket, f.eks. "Rentemestervej 8, 2400 København".' +
      ' Adressebetegnelsen kan leveres med eller uden supplerende bynavn.'
    }],
    examples: [{
      description: 'Vask adressen "Rante mester vej 8, 2400 København NV"',
      query: [{name: 'betegnelse', value: 'Rante mester vej 8, 2400 København NV'}]
    }]
  },
  {
    entity: 'adgangsadresse',
    path: '/historik/adgangsadresser',
    subtext: 'ADVARSEL: Experimentelt API. Der vil ske ændringer i dette API uden varsel, som ikke er bagudkompatible. Hent historik for adgangsadresser. Det er kun historiske værdier for udvalgte felter, der er medtaget.' +
    ' Bemærk, at udgåede adgangsadresser (statuskode 2 og 4) også medtages i svaret. Historikken returneres som en array af JSON-objekter,' +
    ' hvor hvert objekt repræsenterer en adgangsadresses tilstand i den periode, der er angivet med virkningstart og virkningslut. Hvis tilstanden' +
    ' er den aktuelle tilstand har virkningslut værdien null.',
    parameters: [
      {
        name: 'id',
        doc: 'Adgangsadressens unikke UUID'
      },
      {
        name: 'postnr',
        doc: 'Returner kun historiske adgangsadresser med det angivne postnummer'
      },
      {
        name: 'kommunekode',
        doc: 'Returner kun historiske adgangsadresser med den angivne kommunekode'
      }].concat(formatAndPagingParams),
    examples: [
      {
        description: 'Vis historikken for adgangsadressen med id "45380a0c-9ad1-4370-84d2-50fc574b2063"',
        query: [{name: 'id', value: '45380a0c-9ad1-4370-84d2-50fc574b2063'}]
      }
    ]
  },
  ...replikeringDoc('adgangsadresse', [adgangsadresseIdParameter], adgangsadresseEventExamples)
];
