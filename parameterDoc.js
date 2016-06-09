"use strict";

var _ = require('underscore');
var dagiTemaer = require('./apiSpecification/temaer/temaer');
const flats = require('./apiSpecification/flats/flats');
const flatParametersMap = require('./apiSpecification/flats/parameters');
var tilknytninger = require('./apiSpecification/tematilknytninger/tilknytninger');
var registry = require('./apiSpecification/registry');
require('./apiSpecification/allSpecs');

/******************************************************************************/
/*** Utils ********************************************************************/
/******************************************************************************/

function autocompleteSubtext(name) {
  return 'Autocomplete på ' + name + '. Der kan anvendes de samme parametre som ved søgning, men bemærk at' +
    ' <em>q</em> parameteren fortolkes anderledes. Læs mere under <a href="generelt#autocomplete">autocomplete</a>.';
}

function overwriteWithAutocompleteQParameter(properties) {
  var overwrite = [{
    name: 'q',
    doc: 'Se beskrivelse under <a href="generelt#autocomplete">autocomplete</a>'
  }];
  return _.map(_.pairs(_.extend(_.indexBy(properties, 'name'), _.indexBy(overwrite, 'name'))),
    function (pair) {
      pair[1].name = pair[0];
      return pair[1];
    });
}

/******************************************************************************/
/*** Format parameters ********************************************************/
/******************************************************************************/

var formatParameters = [
  {
    name: 'callback',
    doc: 'Output leveres i <em>JSONP</em> format. Se <a href=generelt#dataformater>Dataformater</a>.'
  },
  {
    name: 'format',
    doc: 'Output leveres i andet format end <em>JSON</em>. Se <a href=generelt#dataformater>Dataformater</a>.'
  },
  {
    name: 'noformat',
    doc: 'Parameteren angiver, at whitespaceformatering skal udelades'
  }
];

const strukturParameter = {
  name: 'struktur',
  doc: 'Hvis format er geojson eller geojsonz angiver strukturparameteren om der ønskes en flad eller en nestet properties struktur.'
}


var pagingParameters = [{
  name: 'side',
  doc: 'Angiver hvilken siden som skal leveres. Se <a href=generelt#paginering>Paginering</a>.'
},
  {
    name: 'per_side',
    doc: 'Antal resultater per side. Se <a href=generelt#paginering>Paginering</a>.'
  }];

var formatAndPagingParams = formatParameters.concat(pagingParameters);

var fuzzyParameter = {
  name: 'fuzzy',
  doc: 'Aktiver fuzzy søgning'
};


/******************************************************************************/
/*** Vejnavne *****************************************************************/
/******************************************************************************/

var vejnavneIdParameter = {
  name: 'navn',
  doc: "Vejnavn. Der skelnes mellem store og små bogstaver.",
  examples: ['Margrethepladsen', 'Viborgvej']
};

var vejnavneParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejnavnet. ' +
  'Wildcard * er tilladt i slutningen af hvert ord. ' +
  'Der skelnes ikke mellem store og små bogstaver.',
  examples: ['tværvej']
},
  fuzzyParameter,

  vejnavneIdParameter,

  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },

  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  }];

var SRIDParameter = {
  name: 'srid',
  doc: 'Angiver <a href="http://en.wikipedia.org/wiki/SRID">SRID</a>' +
  ' for det koordinatsystem, som geospatiale parametre er angivet i. Default er 4326 (WGS84).'
};

var reverseGeocodingParameters = [{
  name: 'x',
  doc: 'X koordinat. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk ' +
  'anvendex angives bredde-værdien.'
},
  {
    name: 'y',
    doc: 'Y koordinat. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
    'anvendex angives længde-værdien.'
  },
  SRIDParameter].concat(formatParameters);

var vejnavneDoc = {
  docVersion: 2,
  resources: {
    '/vejnavne/{navn}': {
      subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
      parameters: [vejnavneIdParameter],
      nomulti: true,
      examples: [{
        description: 'Hent information om vejnavnet <em>Gammel Viborgvej</em>',
        path: ['/vejnavne/Gammel%20Viborgvej']
      }]
    },

    '/vejnavne': {
      subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
      parameters: vejnavneParameters.concat(formatAndPagingParams),
      examples: [{
        description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og ' +
        'indeholder et ord der starter med <em>hvid</em>',
        query: [{name: 'postnr', value: '2400'},
          {name: 'q', value: 'hvid*'}]
      },
        {
          description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
          query: [{name: 'kommunekode', value: '0101'}]
        }]
    },

    '/vejnavne/autocomplete': {
      subtext: autocompleteSubtext('vejnavne'),
      parameters: overwriteWithAutocompleteQParameter(vejnavneParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle vejnavne som indeholder <em>jolle</em>',
        query: [{name: 'q', value: 'jolle'}]
      },
        {
          description: 'Find alle vejnavne som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
          query: [{name: 'q', value: 'strand '}]
        }]
    }
  }
};


/******************************************************************************/
/*** Vejstykker ***************************************************************/
/******************************************************************************/

var vejstykkerIdParameters = [
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },
  {
    name: 'kode',
    doc: 'vejkode. 4 cifre.',
    examples: ['0052']
  }
];
var vejstykkerParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejstykket. ' +
  'Wildcard * er tilladt i slutningen af hvert ord. ' +
  'Der skelnes ikke mellem store og små bogstaver.',
  examples: ['tværvej']
},
  vejstykkerIdParameters[0],
  vejstykkerIdParameters[1],
  {
    name: 'navn',
    doc: "Vejnavn. Der skelnes mellem store og små bogstaver. Der kan anvendes wildcard-søgning.",
    examples: ['Margrethepladsen', 'Viborgvej']
  },
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  },
  {
    name: 'polygon',
    doc: 'Find de vejstykker, som overlapper med det angivne polygon. ' +
    'Polygonet specificeres som et array af koordinater på samme måde som' +
    ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
    ' Bemærk at polygoner skal' +
    ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
    ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
    ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
    ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].',
    examples: []
  },
  {
    name: 'cirkel',
    doc: 'Find de vejstykker, som overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
    examples: []
  }
];

var vejstykkerDoc = {
  docVersion: 2,
  resources: {
    '/vejstykker/{kommunekode}/{kode}': {
      subtext: 'Opslag på enkelt vejstykke ud fra kommunekode og vejkode.',
      parameters: vejstykkerIdParameters.concat([strukturParameter]),
      nomulti: true,
      examples: [{
        description: 'Hent information om vejstykket med kommunekode <em>0101</em>, og vejkoden <em>316</em>',
        path: ['/vejstykker/0101/316']
      }]
    },

    '/vejstykker': {
      subtext: 'Søger efter vejstykker. Returnerer de vejstykker, som opfylder kriteriet.',
      parameters: vejstykkerParameters.concat(formatAndPagingParams).concat([strukturParameter]),
      examples: [{
        description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og indeholder et ord der starter med <em>hvid</em>',
        query: [{name: 'postnr', value: '2400'}, {name: 'q', value: 'hvid*'}]
      },
        {
          description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
          query: [{name: 'kommunekode', value: '0101'}]
        }]
    },

    '/vejstykker/reverse': {
      subtext: 'Find det vejstykke, som ligger nærmest det angivne koordinat. Som koordinatsystem kan anvendes ' +
      'ETRS89/UTM32 med <em>srid=<a href="http://spatialreference.org/ref/epsg/25832/">25832</a></em> eller ' +
      'WGS84/geografisk med <em>srid=<a href="http://spatialreference.org/ref/epsg/4326/">4326</a></em>.  Default er WGS84.',
      parameters: reverseGeocodingParameters.concat([strukturParameter]),
      examples: [{
        description: 'Returner vejstykket nærmest punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
        query: [{name: 'x', value: '12.5851471984198'},
          {name: 'y', value: '55.6832383751223'}]
      },
        {
          description: 'Returner vejstykket nærmest punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}]
        }]
    },
    '/vejstykker/autocomplete': {
      subtext: autocompleteSubtext('vejstykker'),
      parameters: overwriteWithAutocompleteQParameter(vejstykkerParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle vejstykker som indeholder <em>jolle</em>',
        query: [{name: 'q', value: 'jolle'}]
      },
        {
          description: 'Find alle vejstykker som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
          query: [{name: 'q', value: 'strand '}]
        }]
    }
  }
};


/******************************************************************************/
/*** Supp. bynavne ************************************************************/
/******************************************************************************/

var supplerendeBynavneIdParameters = {
  name: 'navn',
  doc: 'Navnet på det supplerende bynavn, f.eks. <em>Holeby</em>',
  examples: ['Holeby', 'Aabybro']
};

var supplerendeBynavneParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche det supplerende bynavn. ' +
  'Wildcard * er tilladt i slutningen af hvert ord.'
},
  supplerendeBynavneIdParameters,
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  },
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  }];

var supplerendeBynavneDoc = {
  docVersion: 2,
  resources: {
    '/supplerendebynavne/{navn}': {
      subtext: 'Modtag supplerende bynavn.',
      parameters: [supplerendeBynavneIdParameters],
      nomulti: true,
      examples: [{
        description: 'Hent det supplerende bynavn med navn <em>Aarsballe</em>',
        path: ['/supplerendebynavne/Aarsballe']
      }]
    },

    '/supplerendebynavne': {
      subtext: 'Søg efter supplerende bynavne. Returnerer de supplerende bynavne som opfylder kriteriet.',
      parameters: supplerendeBynavneParameters.concat(formatAndPagingParams),
      examples: [{
        description: 'Find de supplerende bynavne som ligger i postnummeret <em>3700 Rønne</em>',
        query: [{name: 'postnr', value: '3700'}]
      },
        {
          description: 'Find de supplerende bynavne, hvor et ord i det supplerende bynavn starter med <em>aar</em>',
          query: [{name: 'q', value: "aar*"}]
        }]
    },

    '/supplerendebynavne/autocomplete': {
      subtext: autocompleteSubtext('supplerendebynavne'),
      parameters: overwriteWithAutocompleteQParameter(supplerendeBynavneParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle supplerende bynavne som indeholder <em>sejr</em>',
        query: [{name: 'q', value: 'sejr'}]
      }]
    }
  }
};


/******************************************************************************/
/*** Kommune ******************************************************************/
/******************************************************************************/

var kommuneIdParameters = {
  name: 'kode',
  doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
  examples: ['0101']
};
var kommuneParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i kommunenavnet. Alle ord i søgeteksten skal matche kommunenavnet. ' +
  'Wildcard * er tilladt i slutningen af hvert ord.'
},
  {
    name: 'navn',
    doc: 'Navnet på kommunen, f.eks. <em>Aarhus</em>',
    examples: ['Aarhus', 'København']
  },
  kommuneIdParameters];

var kommuneDoc = {
  docVersion: 2,
  resources: {
    '/kommuner': {
      subtext: 'Søg efter kommuner. Returnerer de kommuner som opfylder kriteriet.',
      parameters: kommuneParameters.concat(formatAndPagingParams).concat(dagiSridCirkelPolygonParameters('kommuner')),
      examples: [{
        description: 'Hent alle kommuner',
        query: []
      },
        {
          description: 'Find de kommuner, som starter med <em>aa</em>',
          query: [{name: 'q', value: "aa*"}]
        }]
    },

    '/kommuner/{kode}': {
      subtext: 'Modtag kommune.',
      parameters: [kommuneIdParameters],
      nomulti: true,
      examples: [{
        description: 'Hent Københavns kommune (kode 101)',
        path: ['/kommuner/101']
      }]
    },

    '/kommuner/autocomplete': {
      subtext: autocompleteSubtext('kommuner'),
      parameters: overwriteWithAutocompleteQParameter(kommuneParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle kommuner som indeholder <em>8</em> (i kommunekoden).',
        query: [{name: 'q', value: '8'}]
      }]
    },
    '/kommuner/reverse': {
      subtext: 'Modtage kommunen for det punkt der angives med x- og y-parametrene',
      parameters: reverseGeocodingParameters,
      nomulti: true,
      examples: [
        {
          description: 'Returner kommunen for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
          query: [
            {name: 'x', value: '12.5851471984198'},
            {name: 'y', value: '55.6832383751223'}
          ]
        },
        {
          description: 'Returner kommunen for punktet angivet af ETRS89/UTM32 koordinatet (6176652.55, 725369.59)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}
          ]
        }
      ]

    }

  }
};

/******************************************************************************/
/*** Adresser og adgangsadresser **********************************************/
/******************************************************************************/

var parametersForBothAdresseAndAdgangsAdresse = [
  {
    name: 'status',
    doc: 'Adressens status, som modtaget fra BBR. "1" angiver en endelig adresse og "3" angiver en foreløbig adresse". ' +
    'Adresser med status "2" eller "4" er ikke med i DAWA.'
  },
  {
    name: 'vejkode',
    doc: 'Vejkoden. 4 cifre.'
  },
  {
    name: 'vejnavn',
    doc: 'Vejnavn. Der skelnes mellem store og små bogstaver.',
    nullable: true
  },
  {
    name: 'husnr',
    doc: 'Husnummer. Max 4 cifre eventuelt med et efterfølgende bogstav.'
  },
  {
    name: 'husnrfra',
    doc: 'Returner kun adresser hvor husnr er større eller lig det angivne.'
  },
  {
    name: 'husnrtil',
    doc: 'Returner kun adresser hvor husnr er mindre eller lig det angivne. Bemærk, at hvis der angives' +
    ' f.eks. husnrtil=20, så er 20A ikke med i resultatet.'
  },
  {
    name: 'supplerendebynavn',
    doc: 'Det supplerende bynavn.',
    nullable: true
  },
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.'
  },
  {
    name: 'kommunekode',
    doc: 'Kommunekoden for den kommune som adressen skal ligge på. 4 cifre.'
  },
  {
    name: 'ejerlavkode',
    doc: 'Koden på det matrikulære ejerlav som adressen skal ligge på.'
  },
  {
    name: 'zonekode',
    doc: 'Heltalskoden for den zone som adressen skal ligge i. Mulige værdier er 1 for byzone, 2 for sommerhusområde og 3 for landzone.'
  },
  {
    name: 'zone',
    doc: 'Adressens zonestatus. Mulige værdier: "Byzone", "Sommerhusområde" eller "Landzone"'
  },
  {
    name: 'matrikelnr',
    doc: 'Matrikelnummer. Unikt indenfor et ejerlav.'
  },
  {
    name: 'esrejendomsnr',
    doc: 'ESR Ejendomsnummer. Indtil 7 cifre.'
  },
  SRIDParameter,
  {
    name: 'polygon',
    doc: 'Find de adresser, som ligger indenfor det angivne polygon. ' +
    'Polygonet specificeres som et array af koordinater på samme måde som' +
    ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
    ' Bemærk at polygoner skal' +
    ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
    ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
    ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
    ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].'

  },
  {
    name: 'cirkel',
    doc: 'Find de adresser, som ligger indenfor den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.'
  },
  {
    name: 'nøjagtighed',
    doc: 'Find adresser hvor adgangspunktet har en den angivne nøjagtighed. Mulige værdier er "A", "B" og "U"'
  },
  {
    name: 'regionskode',
    doc: 'Find de adresser som ligger indenfor regionen angivet ved regionkoden.',
    nullable: true
  },
  {
    name: 'sognekode',
    doc: 'Find de adresser som ligger indenfor sognet angivet ved sognkoden.',
    nullable: true
  },
  {
    name: 'opstillingskredskode',
    doc: 'Find de adresser som ligger indenfor opstillingskredsen angivet ved opstillingskredskoden.',
    nullable: true
  },
  {
    name: 'retskredskode',
    doc: 'Find de adresser som ligger indenfor retskredsen angivet ved retskredskoden.',
    nullable: true
  },
  {
    name: 'politikredskode',
    doc: 'Find de adresser som ligger indenfor politikredsen angivet ved politikredskoden.',
    nullable: true
  }
];

var adgangsadresseIdParameter = {
  name: 'id',
  doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
};

var adgangsadresseParameters = [
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i vejnavn, husnr, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adgangsadressen. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. ' +
    'Der skelnes ikke mellem store og små bogstaver.',
    examples: ['tværv*']
  },
  fuzzyParameter,
  {
    name: 'kvh',
    doc: 'KVH-nøgle. 12 tegn bestående af 4 cifre der repræsenterer kommunekode, 4 cifre der repræsenterer vejkode efterfulgt af 4 tegn der repræsenter husnr. Se <a href="#adgangsadresse_kvh">databeskrivelse</a>.',
    examples: ['01016378__33']
  },
  adgangsadresseIdParameter].concat(parametersForBothAdresseAndAdgangsAdresse);

var adgangsadresseDoc = {
  docVersion: 2,
  resources: {
    '/adgangsadresser/{id}': {
      subtext: 'Modtag adresse med id.',
      parameters: [adgangsadresseIdParameter].concat([strukturParameter]),
      nomulti: true,
      examples: [{
        description: 'Returner adressen med id 0a3f507a-b2e6-32b8-e044-0003ba298018',
        path: ['/adgangsadresser/0a3f507a-b2e6-32b8-e044-0003ba298018']
      }]
    },

    '/adgangsadresser': {
      subtext: 'Søg efter adresser. Returnerer de adresser som opfylder kriteriet.',
      parameters: adgangsadresseParameters.concat(formatAndPagingParams).concat([strukturParameter]),
      examples: [{
        description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'},
          {name: 'husnr', value: '46'}]
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
            {name: 'format', value: 'geojson'}]
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


    '/adgangsadresser/autocomplete': {
      subtext: autocompleteSubtext('adgangsadresser'),
      parameters: overwriteWithAutocompleteQParameter(adgangsadresseParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle adgangsadresser som indeholder <em>rand</em>',
        query: [{name: 'q', value: 'rand'}]
      },
        {
          description: 'Find alle adgangsadresser som indeholder <em>randers</em> indenfor postnummer <em>8600</em>',
          query: [{name: 'q', value: 'randers'},
            {name: 'postnr', value: '8600'}]
        }]
    },

    '/adgangsadresser/reverse': {
      subtext: 'Find den adresse, som ligger nærmest det angivne koordinat. Som koordinatsystem kan anvendes ' +
      'ETRS89/UTM32 med <em>srid=<a href="http://spatialreference.org/ref/epsg/25832/">25832</a></em> eller ' +
      'WGS84/geografisk med <em>srid=<a href="http://spatialreference.org/ref/epsg/4326/">4326</a></em>.  Default er WGS84.',
      parameters: reverseGeocodingParameters.concat([strukturParameter]),
      examples: [{
        description: 'Returner adgangsadressen nærmest punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
        query: [{name: 'x', value: '12.5851471984198'},
          {name: 'y', value: '55.6832383751223'}]
      },
        {
          description: 'Returner adressen nærmest punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}]
        }]
    }
  }
};

var adresseParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavn, husnr, etage, dør, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adressebetegnelsen. ' +
  'Wildcard * er tilladt i slutningen af hvert ord. ' +
  'Der skelnes ikke mellem store og små bogstaver.',
  examples: ['tværv*']
},
  fuzzyParameter,
  {
    name: 'id',
    doc: 'Adressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
  },
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
    doc: 'Dørbetegnelse. Tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.',
    nullable: true
  },
  {
    name: 'kvhx',
    doc: 'KVHX-nøgle. 19 tegn bestående af 4 cifre der repræsenterer kommunekode, 4 cifre der repræsenterer vejkode, 4 tegn der repræsenter husnr, 3 tegn der repræsenterer etage og 4 tegn der repræsenter dør. Se <a href="#adresse_kvhx">databeskrivelse</a>.',
    examples: ['04619664__26_st___6']
  }
].concat(parametersForBothAdresseAndAdgangsAdresse);

var adresseDoc = {
  docVersion: 2,
  resources: {
    '/adresser': {
      subtext: 'Søg efter adresser. Returnerer de adresser som opfylder kriteriet.',
      parameters: adresseParameters.concat(formatAndPagingParams).concat([strukturParameter]),
      examples: [{
        description: 'Find de adresser som ligger på Rødkildevej og har husnummeret 46.',
        query: [{name: 'vejnavn', encodeValue: false, value: 'Rødkildevej'}, {
          name: 'husnr',
          value: '46'
        }]
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
            {name: 'format', value: 'geojson'}]
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
    '/adresser/{id}': {
      subtext: 'Modtag adresse med id.',
      parameters: [_.find(adresseParameters, function (p) {
        return p.name === 'id';
      })].concat([strukturParameter]),
      nomulti: true,
      examples: [{
        description: 'Returner adressen med id 0255b942-f3ac-4969-a963-d2c4ed9ab943',
        path: ['/adresser/0255b942-f3ac-4969-a963-d2c4ed9ab943']
      }]
    },

    '/adresser/autocomplete': {
      subtext: autocompleteSubtext('adresser'),
      parameters: overwriteWithAutocompleteQParameter(adresseParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle adresser som indeholder <em>rand</em>',
        query: [{name: 'q', value: 'rand'}]
      },
        {
          description: 'Find alle adresser som indeholder <em>randers</em> på postnr <em>8450</em>',
          query: [{name: 'q', value: 'randers'}, {name: 'postnr', value: '8450'}]
        }]
    }
  }
};


/******************************************************************************/
/*** Postnumre ****************************************************************/
/******************************************************************************/

var postnummerParameters = [{
  name: 'nr',
  doc: 'Postnummer. 4 cifre.',
  examples: ['2690', '8600']
},
  {
    name: 'navn',
    doc: 'Postnummernavn',
    examples: ['Aarhus', 'København']
  },
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i postnummernavnet. Alle ord i søgeteksten skal matche postnummernavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord.'
  },
  {
    name: 'stormodtagere',
    doc: "Hvis denne parameter er sat til 'true', vil stormodtager-postnumre medtages i resultatet. Default er false."
  }];

var postnummerIdParameter = _.find(postnummerParameters, function (p) {
  return p.name === 'nr';
});

var postnummerDoc = {
  docVersion: 2,
  resources: {
    '/postnumre': {
      subtext: 'Søg efter postnumre. Returnerer de postnumre som opfylder kriteriet.',
      parameters: postnummerParameters.concat(formatAndPagingParams).concat(dagiSridCirkelPolygonParameters('postnumre')).concat([strukturParameter]),
      examples: [{description: 'Hent alle postnumre', query: []},
        {
          description: 'Find postnummer <em>8600</em>',
          query: [{name: 'nr', value: "8600"}]
        },
        {
          description: 'Find alle postnumre som benyttes i kommune <em>751</em> Aarhus',
          query: [{name: 'kommunekode', value: "751"}]
        },
        {
          description: 'Find postnummer for postnummernavn <em>Silkeborg</em>',
          query: [{name: 'navn', value: "Silkeborg"}]
        },
        {
          description: 'Find alle postnumre som indeholder ordet <em>strand</em>',
          query: [{name: 'q', value: "strand"}]
        },
        {
          description: 'Find alle postnumre som indeholder <em>aar*</em>',
          query: [{name: 'q', value: "aar*"}]
        }]
    },

    '/postnumre/{nr}': {
      subtext: 'Modtag postnummer med id.',
      parameters: [postnummerIdParameter].concat([strukturParameter]),
      nomulti: true,
      examples: [{
        description: 'Hent postnummer for København NV',
        path: ['/postnumre/2400']
      }]
    },

    '/postnumre/autocomplete': {
      subtext: autocompleteSubtext('postnumre'),
      parameters: overwriteWithAutocompleteQParameter(postnummerParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle postnumre som indeholder <em>strand</em> i postnummerbetegnelsen',
        query: [{name: 'q', value: 'strand'}]
      }]
    },
    '/postnumre/reverse': {
      subtext: 'Modtage postnummeret for det punkt der angives med x- og y-parametrene',
      parameters: reverseGeocodingParameters.concat([strukturParameter]),
      nomulti: true,
      examples: [
        {
          description: 'Returner postnummeret for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
          query: [
            {name: 'x', value: '12.5851471984198'},
            {name: 'y', value: '55.6832383751223'}
          ]
        },
        {
          description: 'Returner postnummeret for punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}]
        }
      ]
    }
  }
};


/******************************************************************************/
/*** Ejerlavsnavne ************************************************************/
/******************************************************************************/

var ejerlavParameters = [
  {
    name: 'kode',
    doc: 'Ejerlavets unikke kode. Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
    examples: ['170354', '80652']
  },
  {
    name: 'navn',
    doc: 'Postnummernavn',
    examples: ['Aarhus', 'København']
  },
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i ejerlavsnavnet. Alle ord i søgeteksten skal matche ejerlavsnavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord.'
  }];

var ejerlavIdParameter = _.find(ejerlavParameters, function (p) {
  return p.name === 'kode';
});

var ejerlavDoc = {
  docVersion: 2,
  resources: {
    '/ejerlav': {
      subtext: 'Søg efter ejerlav. Returnerer de ejerlav som opfylder kriteriet.',
      parameters: ejerlavParameters.concat(formatAndPagingParams),
      examples: [{description: 'Hent alle ejerlav', query: []},
        {
          description: 'Find ejerlav <em>80652</em>',
          query: [{name: 'kode', value: "80652"}]
        },
        {
          description: 'Find ejerlav med navn <em>Lynge By, Lynge</em>',
          query: [{name: 'navn', value: "Lynge By, Lynge"}]
        }]
    },

    '/ejerlav/{kode}': {
      subtext: 'Modtag ejerlav med angivet kode.',
      parameters: [ejerlavIdParameter],
      nomulti: true,
      examples: [{
        description: 'Hent ejerlav 80652',
        path: ['/ejerlav/80652']
      }]
    },

    '/ejerlav/autocomplete': {
      subtext: autocompleteSubtext('ejerlav'),
      parameters: overwriteWithAutocompleteQParameter(ejerlavParameters).concat(formatAndPagingParams),
      examples: [{
        description: 'Find alle ejerlav som indeholder <em>by</em> i navnet',
        query: [{name: 'q', value: 'by'}]
      }]
    }
  }
};

var jordstykkeParameters = [
  {
    name: 'ejerlavkode',
    doc: 'Find jordstykker tilhørende ejerlav med den angivne kode.',
    examples: ['170354', '80652']
  },
  {
    name: 'matrikelnr',
    doc: 'Find jordstykker med det angivne matrikelnr.',
    examples: ['7kn', '5bv']
  },
  {
    name: 'kommunekode',
    doc: 'Find de jordstykker som ligger indenfor kommunen angivet ved kommunekoden.'
  },
  {
    name: 'regionskode',
    doc: 'Find de jordstykker som ligger indenfor regionen angivet ved regionkoden.'
  },
  {
    name: 'sognekode',
    doc: 'Find de jordstykker som ligger indenfor sognet angivet ved sognkoden.'
  },
  {
    name: 'retskredskode',
    doc: 'Find de jordstykker som ligger indenfor retskredsen angivet ved retskredskoden.'
  },
  {
    name: 'esrejendomsnr',
    doc: 'Find de jordstykker som er tilknyttet det angivne ESR ejendomsnummer.'
  },
  {
    name: 'sfeejendomsnr',
    doc: 'Find de jordstykker som er tilknyttet det angivne SFE ejendomsnummer.'
  }
];

var jordstykkeIdParameters = [
  {
    name: 'ejerlavkode',
    doc: 'Jordstykkets ejerlavkode.',
    examples: ['170354', '80652']
  },
  {
    name: 'matrikelnr',
    doc: 'Jordstykkets matrikelnr.',
    examples: ['7kn', '5bv']
  }
];

var jordstykkeDoc = {
  docVersion: 2,
  resources: {
    '/jordstykker': {
      subtext: 'Søg efter jordstykker. Returnerer de jordstykker som opfyler søgekriterierne.',
      parameters: jordstykkeParameters.concat(formatAndPagingParams).concat(dagiSridCirkelPolygonParameters('jordstykker')).concat([strukturParameter]),
      examples: [{description: 'Hent alle jordstykker', query: []},
        {
          description: 'Find jordstykker for ejerlav med kode <em>80652</em>',
          query: [{name: 'ejerlavkode', value: "80652"}]
        },
        {
          description: 'Find jordstykket med ejerlavkode <em>100453</em> og matrikelnr <em>8bd</em>',
          query: [{name: 'ejerlavkode', value: '100453'}, {name: 'matrikelnr', value: '8bd'}]
        }]
    },

    '/jordstykker/{ejerlavkode}/{matrikelnr}': {
      subtext: 'Modtag jordstykket med den angivne ejerlavkode og matrikelnr',
      parameters: jordstykkeIdParameters.concat([strukturParameter]),
      nomulti: true,
      examples: [{
        description: 'Hent jordstykket med ejerlavkode <em>100453</em> og matriklenr <em>8bd</em>',
        path: ['/jordstykker/100453/8bd']
      }]
    },
    '/jordstykker/reverse': {
      subtext: 'Modtage jordstykket for det punkt der angives med x- og y-parametrene',
      parameters: reverseGeocodingParameters.concat([strukturParameter]),
      nomulti: true,
      examples: [
        {
          description: 'Returner jordstykket for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
          query: [
            {name: 'x', value: '12.5851471984198'},
            {name: 'y', value: '55.6832383751223'}
          ]
        },
        {
          description: 'Returner jordstykket for punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}]
        }
      ]

    }
  }
};

function firstUpper(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function dagiNavnParameter(tema) {
  return {
    name: 'navn',
    doc: firstUpper(tema.singularSpecific) + 's navn. Der er forskel på store og små bogstaver.'
  };
}
function dagiQParameter() {
  return {
    name: 'q',
    doc: 'Søgetekst. Der søges i kode og navn. Alle ord i søgeteksten skal matche. ' +
    'Wildcard * er tilladt i slutningen af hvert ord.'
  };
}
function dagiKodeNavnParameters(tema) {
  return [
    {
      name: 'kode',
      doc: firstUpper(tema.singularSpecific) + 's kode. 4 cifre.'
    },
    dagiNavnParameter(tema),
    dagiQParameter()
  ];
}

function dagiSridCirkelPolygonParameters(plural) {
  return [
    SRIDParameter,
    {
      name: 'cirkel',
      doc: 'Find de ' + plural + ', som overlapper den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes ETRS89/UTM32 eller WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.'
    },
    {
      name: 'polygon',
      doc: 'Find de ' + plural + ', som overlapper det angivne polygon. ' +
      'Polygonet specificeres som et array af koordinater på samme måde som' +
      ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
      ' Bemærk at polygoner skal' +
      ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
      ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
      ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
      ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].'

    }];
}

function valglandsdelParameters(tema) {
  return [
    {
      name: 'bogstav',
      doc: firstUpper(tema.singularSpecific) + 's bogstav.'
    },
    dagiNavnParameter(tema),
    dagiQParameter()
  ].concat(dagiSridCirkelPolygonParameters(tema.plural));
}

var storkredsParameters = [
  {
    name: 'nummer',
    doc: 'Storkredsens nummer.'
  },
  dagiNavnParameter(_.findWhere(dagiTemaer, {singular: 'storkreds'})),
  dagiQParameter()
].concat(dagiSridCirkelPolygonParameters(_.findWhere(dagiTemaer, {singular: 'storkreds'}).plural));

var dagiExamples = {
  region: {
    query: [{
      description: 'Find alle regioner.',
      query: []
    }],
    get: [{
      description: 'Modtag Region Midtjylland (kode 1082)',
      path: ['/regioner/1082']
    }, {
      description: 'Hent Region Midtjylland i GeoJSON format med ETRS89 Zone 32N som koordinatsystem',
      path: ['/regioner/1082?format=geojson&srid=25832']
    }],
    autocomplete: [{
      description: 'Find regioner der starter med <em>midt</em>',
      query: [{
        name: 'q',
        value: 'midt'
      }]
    }]
  },
  opstillingskreds: {
    query: [{
      description: 'Hent alle opstillingskredse.',
      query: []
    }, {
      description: 'Hent alle opstillingskredse der indeholder <em>esbjerg</em>',
      query: [{
        name: 'q',
        value: 'esbjerg'
      }]
    }],
    get: [{
      description: 'Hent data for opstillingskredsen Vesterbro (kode 9) i GeoJSON format',
      path: '/opstillingskredse/9',
      query: [{
        name: 'format',
        value: 'geojson'
      }]
    }],
    autocomplete: [{
      description: 'Find opstillingskredse der starter med es',
      query: [{
        name: 'q',
        value: 'es'
      }]
    }]
  },
  retskreds: {
    query: [{
      description: 'Hent alle retskredse',
      query: []
    }, {
      description: 'Find de retskredse, som indeholder <em>århus</em>',
      query: [{
        name: 'q',
        value: 'århus'
      }]
    }],
    get: [{
      description: 'Modtag <em>Retten i Århus</em> (kode 1165) i GeoJSON format',
      path: '/retskredse/1165',
      query: [{
        name: 'format',
        value: 'geojson'
      }]
    }],
    autocomplete: {
      description: 'Find retskredse der starter med <em>aa</em>',
      query: [{
        name: 'q',
        value: 'aa'
      }]
    }
  },
  politikreds: {
    query: [{
      description: 'Hent alle politikredse',
      query: []
    }],
    get: [{
      description: 'Hent <em>Syd- og Sønderjyllands Politi</em> (kode 1464) i GeoJSON format.',
      path: '/politikredse/1464',
      query: [{
        name: 'format',
        value: 'geojson'
      }]
    }],
    autocomplete: [{
      name: 'Find alle politikredse, der indeholder et ord der starter med sønd',
      query: [{
        name: 'q',
        value: 'sønd'
      }]
    }]
  },
  sogn: {
    query: [{
      description: 'Find alle de sogne som starter med grøn',
      query: [{
        name: 'q',
        value: 'grøn*'
      }]
    }, {
      description: 'Returner alle sogne',
      query: {}
    }],
    get: [{
      description: 'Returner oplysninger om Grøndal sogn',
      path: ['/sogne/7060']
    }, {
      description: 'Returnerer oplysninger om Grøndal sogn i GeoJSON format',
      path: ['/sogne/7060'],
      query: [{
        name: 'format',
        value: 'geojson'
      }]
    }],
    autocomplete: [{
      description: 'Find alle de sogne som starter med grøn',
      query: [{
        name: 'q',
        value: 'grøn'
      }]
    }]
  },
  valglandsdel: {
    query: [{
      description: 'Find alle valglandsdele som starter med Midt',
      query: [{
        name: 'q',
        value: 'Midt*'
      }]
    }, {
      description: 'Returner alle valglandsdele',
      query: {}
    }],
    get: [{
      description: 'Returner oplysninger om valglandsdel Hovedstaden',
      path: ['/valglandsdele/A']
    }, {
      description: 'Returnerer oplysninger om valglandsdel Hovedstaden i GeoJSON format',
      path: ['/valglandsdele/A'],
      query: [{
        name: 'format',
        value: 'geojson'
      }]
    }],
    autocomplete: [{
      description: 'Find oplysninger om alle valglandsdele der starter med Midt',
      query: [{
        name: 'q',
        value: 'Midt'
      }]
    }]
  },
  storkreds: {
    query: [{
      description: 'Find alle Storkredse som starter med Midt',
      query: [{
        name: 'q',
        value: 'Midt*'
      }]
    }, {
      description: 'Returner alle storkredse',
      query: {}
    }],
    get: [{
      description: 'Returner oplysninger om storkredsen København',
      path: ['/storkredse/1']
    }, {
      description: 'Returnerer oplysninger om storkredsen København i GeoJSON format',
      path: ['/storkredse/1'],
      query: [{
        name: 'format',
        value: 'geojson'
      }]
    }],
    autocomplete: [{
      description: 'Find oplysninger om alle storkredse der starter med Nord',
      query: [{
        name: 'q',
        value: 'Nord'
      }]
    }]
  }
};

function dagiListEndpointDoc(tema) {
  return {
    subtext: 'Søg efter ' + tema.plural + '. Returnerer de ' + tema.plural + ' der opfylder kriteriet.',
    parameters: dagiKodeNavnParameters(tema).concat(formatAndPagingParams).concat(dagiSridCirkelPolygonParameters(tema.plural)),
    examples: dagiExamples[tema.singular].query || []
  };
}
function dagiByKodeEndpointDoc(tema) {
  return {
    subtext: 'Modtag ' + tema.singular + ' med kode.',
    parameters: [_.find(dagiKodeNavnParameters(tema), function (p) {
      return p.name === 'kode';
    })].concat(formatParameters),
    nomulti: true,
    examples: dagiExamples[tema.singular].get || []
  };
}
function dagiAutocompleteEndpointDoc(tema) {
  return {
    subtext: autocompleteSubtext(tema.plural),
    parameters: overwriteWithAutocompleteQParameter(dagiKodeNavnParameters(tema)).concat(formatAndPagingParams),
    examples: dagiExamples[tema.singular].autocomplete || []
  };
}
function dagiReverseEndpointDoc(tema) {
  return {
    subtext: 'Modtag ' + tema.singularSpecific + ' for det angivne koordinat.',
    parameters: reverseGeocodingParameters,
    nomulti: true,
    examples: [
      {
        description: 'Returner ' + tema.singularSpecific + ' for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
        query: [
          {name: 'x', value: '12.5851471984198'},
          {name: 'y', value: '55.6832383751223'}
        ]
      },
      {
        description: 'Returner ' + tema.singularSpecific + ' for punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
        query: [
          {name: 'x', value: '725369.59'},
          {name: 'y', value: '6176652.55'},
          {name: 'srid', value: '25832'}
        ]
      }
    ]
  };
}

['region', 'sogn', 'opstillingskreds', 'retskreds', 'politikreds'].forEach(function (dagiTemaNavn) {
  var tema = _.findWhere(dagiTemaer, {singular: dagiTemaNavn});
  var doc = {
    docVersion: 2,
    resources: {}
  };
  doc.resources['/' + tema.plural] = dagiListEndpointDoc(tema);
  doc.resources['/' + tema.plural + '/{kode}'] = dagiByKodeEndpointDoc(tema);
  doc.resources['/' + tema.plural + '/autocomplete'] = dagiAutocompleteEndpointDoc(tema);
  doc.resources['/' + tema.plural + '/reverse'] = dagiReverseEndpointDoc(tema);

  _.extend(module.exports, doc.resources);
});

Object.keys(flats).forEach(flatName => {
  const flat = flats[flatName];
  const parameters = flatParametersMap[flatName];
  {
    const parametersArray = parameters.id.concat(parameters.propertyFilter);
    const reverseGeocodingDocs = [
      {
        name: 'x',
        doc: 'Find bebyggelser der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk anvendes angives bredde-værdien.'
      },
      {
        name: 'y',
        doc: 'Find bebyggelser der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
        'anvendes angives længde-værdien.'
      },
      SRIDParameter];
    const additionalParameterDocs = parametersArray.map(parameter => ({
      name: parameter.name,
      doc: `Filtrer resultat ud fra ${parameter.name}.`
    }));
    const parameterDocs = additionalParameterDocs.concat(reverseGeocodingDocs).concat(dagiSridCirkelPolygonParameters(flat.plural)).concat(formatAndPagingParams);
    const subtext = `Søg efter ' + ${flat.plural} + '. Returnerer de ${flat.plural} der opfylder kriteriet.`;
    module.exports['/' + flat.plural] = {
      subtext: subtext,
      parameters: parameterDocs,
      examples: []
    };
  }
  {
    const subtext = `Modtag enkelt ${flat.singular} ud fra unik nøgle`;
    const idParameterDocs = parameters.id.map(parameter => ({
      name: parameter.name,
      doc: `${flat.singularSpecific}s ${parameter.name}`
    }));
    module.exports[`/${flat.plural}/{${flat.key.join('}/{')}}`] = {
      subtext: subtext,
      parameters: idParameterDocs.concat([SRIDParameter]),
      examples: [],
      nomulti: true
    };
  }
});

function dagiValglandsDelsDoc() {
  var tema = _.findWhere(dagiTemaer, {singular: 'valglandsdel'});
  var doc = {
    docVersion: 2,
    resources: {}
  };
  doc.resources['/' + tema.plural] = {
    subtext: 'Søg efter ' + tema.plural + '. Returnerer de ' + tema.plural + ' der opfylder kriteriet.',
    parameters: valglandsdelParameters(tema).concat(formatAndPagingParams),
    examples: dagiExamples[tema.singular].query || []
  };
  doc.resources['/' + tema.plural + '/{bogstav}'] = {
    subtext: 'Modtag ' + tema.singular + ' ud fra bogstav.',
    parameters: [_.find(valglandsdelParameters(tema), function (p) {
      return p.name === 'bogstav';
    })].concat(formatParameters),
    nomulti: true,
    examples: dagiExamples[tema.singular].get
  };
  doc.resources['/' + tema.plural + '/autocomplete'] = {
    subtext: autocompleteSubtext(tema.plural),
    parameters: overwriteWithAutocompleteQParameter(valglandsdelParameters(tema)).concat(formatAndPagingParams),
    examples: dagiExamples[tema.singular].autocomplete || []
  };
  doc.resources['/' + tema.plural + '/reverse'] = dagiReverseEndpointDoc(tema);

  return doc;
}

function dagiStorkredsDoc() {
  var tema = _.findWhere(dagiTemaer, {singular: 'storkreds'});
  var doc = {
    docVersion: 2,
    resources: {}
  };
  doc.resources['/' + tema.plural] = {
    subtext: 'Søg efter ' + tema.plural + '. Returnerer de ' + tema.plural + ' der opfylder kriteriet.',
    parameters: storkredsParameters.concat(formatAndPagingParams),
    examples: dagiExamples[tema.singular].query || []
  };
  doc.resources['/' + tema.plural + '/{nummer}'] = {
    subtext: 'Modtag ' + tema.singular + ' ud fra nummer.',
    parameters: [_.find(storkredsParameters, function (p) {
      return p.name === 'nummer';
    })].concat(formatParameters),
    nomulti: true,
    examples: dagiExamples[tema.singular].get
  };
  doc.resources['/' + tema.plural + '/autocomplete'] = {
    subtext: autocompleteSubtext(tema.plural),
    parameters: overwriteWithAutocompleteQParameter(storkredsParameters).concat(formatAndPagingParams),
    examples: dagiExamples[tema.singular].autocomplete || []
  };
  doc.resources['/' + tema.plural + '/reverse'] = dagiReverseEndpointDoc(tema);

  return doc;
}
_.extend(module.exports, dagiValglandsDelsDoc().resources);
_.extend(module.exports, dagiStorkredsDoc().resources);


var keyParams = {
  vejstykke: vejstykkerIdParameters,
  postnummer: postnummerIdParameter,
  adgangsadresse: [adgangsadresseIdParameter],
  adresse: [adgangsadresseIdParameter],
  ejerlav: [ejerlavIdParameter]
};

_.each(tilknytninger, function (tilknytning, temaNavn) {
  var tema = _.findWhere(dagiTemaer, {singular: temaNavn});
  keyParams[tema.prefix + 'tilknytning'] = [
    {
      name: 'adgangsadresseid',
      doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
    }
  ];
});


var eventExamples = {
  vejstykke: [{
    description: 'Find alle vejstykkehændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
    query: [{
      name: 'sekvensnummerfra',
      value: '990'
    }, {
      name: 'sekvensnummertil',
      value: '1000'
    }]
  }, {
    description: 'Find alle hændelser for vejstykket med kommunekode 0840 og vejkode 1183',
    query: [{
      name: 'kommunekode',
      value: '0840'
    }, {
      name: 'kode',
      value: '1183'
    }]
  }
  ],
  postnummer: [{
    description: 'Find alle postnummerhændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
    query: [{
      name: 'sekvensnummerfra',
      value: '990'
    }, {
      name: 'sekvensnummertil',
      value: '1000'
    }]
  }, {
    description: 'Find alle hændelser for postnummeret 8000',
    query: [{
      name: 'nr',
      value: '8000'
    }]
  }
  ],
  adgangsadresse: [{
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
  }
  ],
  adresse: [{
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
  ],
  ejerlav: [
    {
      description: 'Find alle ejerlavhændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
      query: [{
        name: 'sekvensnummerfra',
        value: '990'
      }, {
        name: 'sekvensnummertil',
        value: '1000'
      }]
    },
    {
      description: 'Find alle ejerlavhændelser for ejerlav med kode 20551',
      query: [{
        name: 'kode',
        value: '20551'
      }]
    }
  ]
};

var tilknytningTemaer = dagiTemaer.filter(function (tema) {
  return tilknytninger[tema.singular] !== undefined;
});

['vejstykke', 'postnummer', 'adgangsadresse', 'adresse', 'ejerlav'].concat(tilknytningTemaer.map(function (tema) {
  return tema.prefix + 'tilknytning';
})).forEach(function (replicatedModelName) {
  var nameAndKey = registry.findWhere({
    entityName: replicatedModelName,
    type: 'nameAndKey'
  });

  var udtraekParameterDoc = {
    subtekst: 'Udtraek for ' + nameAndKey.plural + '.',
    parameters: [{
      name: 'sekvensnummer',
      doc: 'Angiver sekvensnummeret for udtrækket. Alle hændelser til og med det angivne sekvensnummer er med i udtrækket.'
    }].concat(formatParameters),
    examples: []
  };

  exports['/replikering/' + nameAndKey.plural] = udtraekParameterDoc;

  var eventParameterDocs = {
    subtekst: 'Hændelser for ' + nameAndKey.plural + '.',
    parameters: [
      {
        name: 'sekvensnummerfra',
        doc: 'Heltal. Returner hændelser med sekvensnummer større eller lig det angivne'
      },
      {
        name: 'sekvensnummertil',
        doc: 'Heltal. Returner hændelser med sekvensnummer mindre eller lig det angivne'
      },
      {
        name: 'tidspunktfra',
        doc: 'Returnerer hændelser hvor tidspunktet for hændelsen er senere eller lig det angivne tidspunkt. Eksempel: 2014-05-23T08:39:36.181Z. Det anbefales at anvende sekvensnumre fremfor tidspunkter til fremsøgning af hændelser.'
      },
      {
        name: 'tidspunkttil',
        doc: 'Returnerer hændelser hvor tidspunktet for hændelsen er tidligere eller lig det angivne tidspunkt. Eksempel: 2014-05-23T08:39:36.181Z. Det anbefales at anvende sekvensnumre fremfor tidspunkter til fremsøgning af hændelser.'
      }
    ],
    examples: eventExamples[replicatedModelName] || []
  };
  eventParameterDocs.parameters = eventParameterDocs.parameters.concat(keyParams[replicatedModelName] ? keyParams[replicatedModelName] : []);
  exports['/replikering/' + nameAndKey.plural + '/haendelser'] = eventParameterDocs;
});

module.exports['/replikering/senesteSekvensnummer'] = {
  subtekst: 'Henter seneste sekvensnummer',
  parameters: [],
  examples: []
};

module.exports['/autocomplete'] = {
  subtekst: 'Samlet autocomplete-funktionalitet for vejnavne, adgangsadresser og adresser. ',
  parameters: [{
    name: 'type',
    doc: 'Angiver, om brugeren er ved at indtaste et vejnavn, en adgangsadresse eller en adresse.' +
    ' Mulige værdier: "vejnavn", "adgangsadresse" eller "adresse". De returnerede værdier er ikke nødvendigvis af' +
    ' denne type. Hvis brugeren f.eks. er ved at indtaste en adresse, men ikke har indtastet nok til at vejnavnet er entydigt ' +
    ' bestemt, så vil servicen returnere vejnavne som valgmuligheder for brugeren'
  }, {
    name: 'startfra',
    doc: 'Autocomplete søger igennem vejnavne, adgangsadresser og adresser. Som udgangspunkt returneres' +
    ' den første type, der giver mere end ét resultat. Med startfra parameteren angives, at søgningen skal' +
    ' starte senere i rækken. Hvis man f.eks. ikke ønsker, at der kan returneres vejnavne, angives startfra=adgangsadresse, og' +
    ' man vil få adgangsadresser tilbage, selvom mere end et vejnavn matcher søgningen. Parameteren er tiltænkt' +
    ' den situation, hvor brugeren vælger et vejnavn blandt de muligheder, som autocomplete-komponenten viser.' +
    ' I denne situation forventer brugeren, at der autocomplete-komponenten efterfølgende viser adgangsadresser. Ved at angive startfra=adgangsadresse' +
    ' sikres dette. Mulige værdier for parameteren: "vejnavn" (default), "adgangsadresse", "adresse"'
  }, {
    name: 'q',
    doc: 'Søgetekst - den tekst brugeren har indtastet'
  }, {
    name: 'caretpos',
    doc: 'Position af careten (cursoren) i den tekst brugeren har indtastet'
  }, {
    name: 'postnr',
    doc: 'Begræns søgning til det angivne postnummer'
  }, {
    name: 'kommunekode',
    doc: 'Begræns søgning til adresser indenfor den angivne kommune'
  }, {
    name: 'adgangsadresseid',
    doc: 'Begræns søgning til adresser med den angivne adgangsadresseid'
  }, {
    name: 'fuzzy',
    doc: 'Aktiver fuzzy søgning'
  }].concat(formatAndPagingParams),
  examples: []
};

module.exports['/datavask/adgangsadresser'] = {
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
};

module.exports['/datavask/adresser'] = {
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
};

module.exports['/historik/adgangsadresser'] = {
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
};

module.exports['/historik/adresser'] = {
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
    }].concat(formatAndPagingParams),
  examples: [
    {
      description: 'Vis historik for adressen med id "4210f8ff-cfca-4b3d-b5c4-ca1c795c14dd"',
      query: [{name: 'id', value: '4210f8ff-cfca-4b3d-b5c4-ca1c795c14dd'}]
    }
  ]
};

_.extend(module.exports, vejnavneDoc.resources, vejstykkerDoc.resources, supplerendeBynavneDoc.resources, kommuneDoc.resources,
  adgangsadresseDoc.resources, postnummerDoc.resources, adresseDoc.resources, ejerlavDoc.resources, jordstykkeDoc.resources);

var allResources = registry.where({
  type: 'resource'
});

function addMultiParameters() {
  _.each(module.exports, function (doc, path) {
    var resourcePath = path.replace(/\{([^\{\}]+)}/g, ':$1');
    var resource = _.findWhere(allResources, {
      path: resourcePath
    });
    if (!resource) {
      throw new Error("Could not find a resource for path " + resourcePath);
    }
    var queryParameters = resource.queryParameters;
    var parameterSpecs = _.indexBy(queryParameters, 'name');
    doc.parameters = JSON.parse(JSON.stringify(doc.parameters)); // Clone!
    if (doc.nomulti !== true) {
      var docs = doc.parameters;
      var newDocs = _.map(docs,
        function (doc) {
          var name = doc.name;
          if (parameterSpecs[name] && parameterSpecs[name].multi === true) {
            doc.multi = true;
          }
        });
      docs.parameters = newDocs;
    }
  });
}
addMultiParameters();
