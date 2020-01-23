const {
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter,
  autocompleteSubtext,
  fuzzyParameter,
  autocompleteParameter
} = require('./common');

const {
  geometriParam,
  parametersForBothAdresseAndAdgangsAdresse,
  strukturParameterAdresse,
  medtagUgyldigeNedlagte
} = require('./adresseCommon');

const {
  replikeringDoc
} = require('./replikeringCommon');


const adresseIdParameter = {
  name: 'id',
  doc: 'Adressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
};
const adresseParameters = [
  adresseIdParameter,
  autocompleteParameter,
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i vejnavn, husnr, etage, dør, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adressebetegnelsen. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. ' +
    'Der skelnes ikke mellem store og små bogstaver. Der returneres højst 1000 resultater ved anvendelse af parameteren.',
    examples: ['tværv*']
  },
  fuzzyParameter,
  {
    name: 'adgangsadresseid',
    doc: 'Id på den til adressen tilknyttede adgangsadresse. UUID.'
  },
  {
    name: 'etage',
    doc: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier: tal fra 1 til 99, st, kl, k2 op til k9.',
    nullable: true
  },
  {
    name: 'dør',
    doc: 'Dørbetegnelse. Tal fra 1 til 9999, små bogstaver samt tegnene / og -.',
    nullable: true
  },
  {
    name: 'kvhx',
    doc: 'KVHX-nøgle. 19 tegn bestående af 4 cifre der repræsenterer kommunekode, 4 cifre der repræsenterer vejkode, 4 tegn der repræsenter husnr, 3 tegn der repræsenterer etage og 4 tegn der repræsenter dør. Se <a href="#adresse_kvhx">databeskrivelse</a>.',
    examples: ['04619664__26_st___6']
  }
].concat(parametersForBothAdresseAndAdgangsAdresse);

const adresseEventExamples = [{
  description: 'Find alle adressehændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
  query: [{
    name: 'sekvensnummerfra',
    value: '990'
  }, {
    name: 'sekvensnummertil',
    value: '1000'
  }]
}, {
  description: 'Find alle adressehændelser for adressen med id 0a3f50aa-db61-32b8-e044-0003ba298018',
  query: [{
    name: 'id',
    value: '0a3f50aa-db61-32b8-e044-0003ba298018'
  }]
}
];

module.exports = [
  {
    entity: 'adresse',
    path: '/adresser',
    subtext: 'Søg efter adresser. Returnerer de adresser som opfylder kriteriet. Med mindre der er behov' +
    ' for felter  som kun er med i den fulde adressestol.ruktur anbefaler vi at, man tilføjer parameteren <code>struktur=mini</code>,' +
    ' da dette vil resultere i bedre performance.',
    parameters: [...adresseParameters, geometriParam, ...formatAndPagingParams, strukturParameterAdresse, ...medtagUgyldigeNedlagte],
    examples: [{
      description: 'Find de adresser som ligger på Rødkildevej og har husnummeret 46.',
      query: [
        {name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
        {name: 'husnr', value: '46'},
        {name: 'struktur', value: 'mini'}]
    },
      {
        description: 'Find de adresser som ligger på Rødkildevej og har husnummeret 46. ' +
        'Resultatet leveres i <em>JSONP</em> format.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
          {name: 'husnr', value: '46'},
          {name: 'callback', value: 'cbFun'}]
      },
      {
        description: 'Find de adresser som ligger på Rødkildevej og har husnummeret 46. ' +
        'Resultatet leveres i <em>geojson</em> format.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
          {name: 'husnr', value: '46'},
          {name: 'format', value: 'geojson'},
          {name: 'struktur', value: 'mini'}]
      },
      {
        description: 'Find de adresser som ligger på Rødkildevej og har husnummeret 46. ' +
        'Resultatet leveres i <em>csv</em> format.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
          {name: 'husnr', value: '46'},
          {name: 'format', value: 'csv'}]
      },
      {
        description: 'Find de adresser som indeholder et ord der starter med hvid og har postnummeret 2400',
        query: [{name: 'q', value: 'hvid*'}, {name: 'postnr', value: '2400'}]
      },
      {
        description: 'Find de adresser som er indenfor polygonet <em>(10.3,55.3), (10.4,55.3), ' +
        '(10.4,55.31), (10.4,55.31), (10.3,55.3)</em>',
        query: [{
          name: 'polygon',
          encodeValue: false,
          value: '[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]]'
        }]
      },
      {
        description: 'Find den adresse, som har KVHX-nøgle 04615319__93__1____',
        query: [{name: 'kvhx', value: '04615319__93__1____'}]
      },
      {
        description: 'Hent alle adresse i postnummer 8471, i GeoJSON format, med koordinater angivet i ETRS89 / UTM zone 32N (SRID 25832)',
        query: [{name: 'postnr', value: '8471'},
          {name: 'format', value: 'geojson'},
          {name: 'srid', value: '25832'}]
      }
    ]
  },
  {
    entity: 'adresse',
    path: '/adresser/{id}',
    subtext: 'Modtag adresse med id.',
    parameters: [adresseIdParameter, strukturParameterAdresse, geometriParam, ...medtagUgyldigeNedlagte],
    nomulti: true,
    examples: [{
      description: 'Returner adressen med id 000021c5-e9ee-411d-b2d8-ec9161780ccd',
      path: ['/adresser/000021c5-e9ee-411d-b2d8-ec9161780ccd']
    }]
  },
  {
    entity: 'adresse',
    path: '/adresser/autocomplete',
    subtext: autocompleteSubtext('adresser'),
    parameters: [...overwriteWithAutocompleteQParameter(adresseParameters),geometriParam, ...medtagUgyldigeNedlagte, ...formatAndPagingParams],
    examples: [{
      description: 'Find alle adresser som indeholder <em>rand</em>',
      query: [{name: 'q', value: 'rand'}]
    },
      {
        description: 'Find alle adresser som indeholder <em>randers</em> på postnr <em>8450</em>',
        query: [{name: 'q', value: 'randers'}, {name: 'postnr', value: '8450'}]
      }]
  },
  {
    entity: 'adresse',
    path: '/datavask/adresser',
    subtext: 'Datavask af adresse. Servicen modtager en adressebetegnelse og svarer med 1 eller flere  adresser, ' +
    'som bedst matcher svaret. Endvidere er der en angivelse af hvor godt de fundne adresser matcher adressebetegnelsen.',
    parameters: [{
      name: 'betegnelse',
      doc: 'Adressebetegnelsen for den adresse som ønskes vasket, f.eks. "Augustenborggade 5, 5. 3, 8000 Aarhus C".' +
      ' Adressebetegnelsen kan leveres med eller uden supplerende bynavn.'
    }],
    examples: [
      {
        description: 'Vask adressen "Rante mester vej 8, 4, 2400 København NV"',
        query: [{name: 'betegnelse', value: 'Rante mester vej 8, 4, 2400 København NV'}]
      },
      {
        description: 'Vask adressen "Borger gade 4, STTV, 6000 Kolding"',
        query: [{name: 'betegnelse', value: 'Borger gade 4, STTV, 6000 Kolding'}]
      }]
  },
  {
    entity: 'adresse',
    path: '/historik/adresser',
    subtext: 'ADVARSEL: Experimentelt API. Der vil ske ændringer i dette API uden varsel, som ikke er bagudkompatible. Hent historik for adresser. Det er kun historiske værdier for udvalgte felter, der er medtaget.' +
    ' Bemærk, at udgåede adresser (statuskode 2 og 4) også medtages i svaret. Historikken returneres som en array af JSON-objekter,' +
    ' hvor hvert objekt repræsenterer en adresses tilstand i den periode, der er angivet med virkningstart og virkningslut. Hvis tilstanden' +
    ' er den aktuelle tilstand har virkningslut værdien null.',
    parameters: [
      {
        name: 'id',
        doc: 'Adressens unikke UUID'
      },
      {
        name: 'postnr',
        doc: 'Returner kun historiske adresser med det angivne postnummer'
      },
      {
        name: 'kommunekode',
        doc: 'Returner kun historiske adresser med den angivne kommunekode'
      },
      {
        name: 'adgangsadresseid',
        doc: 'Returner kun adresser på den angivne adgangsadresse'
      }].concat(formatAndPagingParams),
    examples: [
      {
        description: 'Vis historik for adressen med id "4210f8ff-cfca-4b3d-b5c4-ca1c795c14dd"',
        query: [{name: 'id', value: '4210f8ff-cfca-4b3d-b5c4-ca1c795c14dd'}]
      }
    ]
  },
  ...replikeringDoc('adresse', [adresseIdParameter], adresseEventExamples)
];
