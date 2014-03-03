"use strict";

var _ = require('underscore');

function autocompleteSubtext(name){
  return 'Autocomplete på '+name+'. Der kan anvendes de samme parametre som ved søgning, men bemærk at'+
    ' <em>q</em> parameteren fortolkes anderledes. Læs mere under <a href="generelt#autocomplete">autocomplete</a>.';
}

function overwriteWithAutocompleteQParameter(properties){
  var overwrite = [{name: 'q', doc: 'Se beskrivelse under <a href="generelt#autocomplete">autocomplete</a>'}];
  return _.map(_.pairs(_.extend(_.indexBy(properties, 'name'), _.indexBy(overwrite, 'name'))),
               function(pair){
                 pair[1].name = pair[0];
                 return pair[1];
               });
}

var vejnavneIdParameter = {name: 'navn',
                           doc: "Vejnavn. Der skelnes mellem store og små bogstaver.",
                           examples: ['Margrethepladsen', 'Viborgvej']};

var vejnavneParameters = [{name: 'q',
                           doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejnavnet. ' +
                           'Wildcard * er tilladt i slutningen af hvert ord. ' +
                           'Der skelnes ikke mellem store og små bogstaver.',
                           examples: ['tværvej']},

                          vejnavneIdParameter,

                          {name: 'kommunekode',
                           doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
                           examples: ['0101']},

                          {name: 'postnr',
                           doc: 'Postnummer. 4 cifre.',
                           examples: ['2700']}];

var vejnavneDoc = {
  docVersion: 2,
  resources: {
    '/vejnavne/{navn}': {
      subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
      parameters: [vejnavneIdParameter],
      examples:  [{description: 'Hent information om vejnavnet <em>Gammel Viborgvej</em>',
                   path: ['/vejnavne/Gammel%20Viborgvej']}]},

    '/vejnavne': {
      subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
      parameters: vejnavneParameters,
      examples:   [{description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og '+
                    'indeholder et ord der starter med <em>hvid</em>',
                    query: [{name: 'postnr', value: '2400'},
                            {name: 'q',value: 'hvid*'}]},
                   {description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
                   query: [{name: 'kommunekode', value: '0101'}]}]},

    '/vejnavne/autocomplete': {
      subtext: autocompleteSubtext('vejnavne'),
      parameters: overwriteWithAutocompleteQParameter(vejnavneParameters),
      examples:    [{description: 'Find alle vejnavne som indeholder <em>jolle</em>',
                     query: [{name:'q', value:'jolle'}]},
                    {description: 'Find alle vejnavne som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
                     query: [{name:'q', value:'strand '}]}]}}};

var vejstykkerIdParameters = [{name: 'navn',
                               doc: "Vejnavn. Der skelnes mellem store og små bogstaver. Der kan anvendes wildcard-søgning.",
                               examples: ['Margrethepladsen', 'Viborgvej']},
                              {name: 'kommunekode',
                               doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
                               examples: ['0101']}];
var vejstykkerParameters = [{name: 'q',
                             doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejstykket. ' +
                             'Wildcard * er tilladt i slutningen af hvert ord. ' +
                             'Der skelnes ikke mellem store og små bogstaver.',
                             examples: ['tværvej']},
                            vejstykkerIdParameters[0],
                            vejstykkerIdParameters[1],
                            {name: 'kode',
                             doc: 'vejkode. 4 cifre.',
                             examples: ['0052']},
                            {name: 'postnr',
                             doc: 'Postnummer. 4 cifre.',
                             examples: ['2700']}];

var vejstykkerDoc = {
  docVersion: 2,
  resources: {
    '/vejstykker/{kommunekode}/{kode}': {
      subtext: 'Opslag på enkelt vejstykke ud fra kommunekode og vejkode.',
      parameters: vejstykkerIdParameters,
      examples:  [{ description: 'Hent information om vejstykket med kommunekode <em>0101</em>, og vejkoden <em>316</em>',
                    path: ['/vejstykker/0101/316']}]},

    '/vejstykker': {
      subtext: 'Søger efter vejstykker. Returnerer de vejstykker, som opfylder kriteriet.',
      parameters: vejstykkerParameters,
      examples:  [{description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og indeholder et ord der starter med <em>hvid</em>',
                   query: [{name:'postnr', value:'2400'}, {name: 'q',value: 'hvid*'}]},
                  {description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
                   query: [{name: 'kommunekode',value: '0101'}]}]},

    '/vejstykker/autocomplete': {
      subtext: autocompleteSubtext('vejstykker'),
      parameters: overwriteWithAutocompleteQParameter(vejnavneParameters),
      examples: [{description: 'Find alle vejstykker som indeholder <em>jolle</em>',
                  query: [{name:'q', value:'jolle'}]},
                 {description: 'Find alle vejstykker som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
                  query: [{name:'q', value:'strand '}]}]}}};

var supplerendeBynavneIdParameters = {name: 'navn',
                                      doc: 'Navnet på det supplerende bynavn, f.eks. <em>Holeby</em>',
                                      examples: ['Holeby', 'Aabybro']};

var supplerendeBynavneParameters = [{name: 'q',
                                     doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche det supplerende bynavn. ' +
                                     'Wildcard * er tilladt i slutningen af hvert ord.'},
                                    supplerendeBynavneIdParameters,
                                    {name: 'postnr',
                                     doc: 'Postnummer. 4 cifre.',
                                     examples: ['2700']},
                                    {name: 'kommunekode',
                                     doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
                                     examples: ['0101']}];

var supplerendeBynavneDoc = {
  docVersion: 2,
  resources: {
    '/supplerendebynavne/{navn}': {
      subtext: 'Modtag supplerende bynavn.',
      parameters: [supplerendeBynavneIdParameters],
      examples: [{description: 'Hent det supplerende bynavn med navn <em>Aarsballe</em>',
                  path: ['/supplerendebynavne/Aarsballe']}]},

    '/supplerendebynavne': {
      subtext: 'Søg efter supplerende bynavne. Returnerer de supplerende bynavne som opfylder kriteriet.',
      parameters: supplerendeBynavneParameters,
      examples: [{description: 'Find de supplerende bynavne som ligger i postnummeret <em>3700 Rønne</em>',
                  query: [{name: 'postnr',value: '3700'}]},
                 {description: 'Find de supplerende bynavne, hvor et ord i det supplerende bynavn starter med <em>aar</em>',
                  query: [{ name: 'q',value: "aar*"}]}]},

    '/supplerendebynavne/autocomplete': {
      subtext: autocompleteSubtext('supplerendebynavne'),
      parameters: overwriteWithAutocompleteQParameter(supplerendeBynavneParameters),
      examples:[{description: 'Find alle supplerende bynavne som indeholder <em>sejr</em>',
                 query: [{name:'q', value:'sejr'}]}]}}};

var kommuneDoc = {
  docVersion: 1,
  parameters: [
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i kommunenavnet. Alle ord i søgeteksten skal matche kommunenavnet. ' +
        'Wildcard * er tilladt i slutningen af hvert ord.'
    },
    {
      name: 'navn',
      doc: 'Navnet på kommunen, f.eks. <em>Aarhus</em>',
      examples: ['Aarhus', 'København']
    },
    {
      name: 'kode',
      doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
      examples: ['0101']
    }
  ],
  examples: {
    query: [
      {
        description: 'Hent alle kommuner',
        query: [
        ]
      },
      {
        description: 'Find de kommuner, som starter med <em>aa</em>',
        query: [
          { name: 'q',
            value: "aa*"
          }
        ]
      }
    ],
    get: [
      {
        description: 'Hent Københavns kommune (kode 101)',
        path: ['101']
      }]

  },

  autocompleteExamples: [
    {description: 'Find alle kommuner som indeholder <em>8</em> (i kommunekoden).',
     query: [{name:'q', value:'8'}]}],

};

var SRIDParameter = {name: 'srid',
                     doc: 'Angiver <a href="http://en.wikipedia.org/wiki/SRID">SRID</a>'+
                     ' for det koordinatsystem, som geospatiale parametre er angivet i. Default er 4326 (WGS84)'
                    };

var parametersForBothAdresseAndAdgangsAdresse = [
  {
    name: 'vejkode',
    doc: 'Vejkoden. 4 cifre.'
  },
  {
    name: 'vejnavn',
    doc: 'Vejnavn. Der skelnes mellem store og små bogstaver.'
  },
  {
    name: 'husnr',
    doc: 'Husnummer. Max 4 cifre eventuelt med et efterfølgende bogstav.'
  },
  {
    name: 'supplerendebynavn',
    doc: 'Det supplerende bynavn.'
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
    name: 'matrikelnr',
    doc: 'matrikelnummer. Unikt indenfor et ejerlav.'
  },
  {
    name: 'esrejendomsnr',
    doc: 'ESR Ejendomsnummer. Indtil 6 cifre.'
  },
  SRIDParameter,
  {
    name: 'polygon',
    doc: 'Find de adresser, som ligger indenfor det angivne polygon. ' +
      'Polygonet specificeres som et array af koordinater på samme måde som' +
      ' koordinaterne specificeres i GeoJSON\'s polygon.' +
      ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk.' +
      ' polygon=[[10.1351967049683,55.5670601123672],' +
      '[10.135200982843,55.5671204601228],' +
      '[10.1362257877892,55.5682107215927],' +
      '[10.1362451883392,55.568284049162], ' +
      '[10.1362396504186,55.5683669533645]].'

  },
  {
    name: 'cirkel',
    doc: 'Find de adresser, som ligger indenfor den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}. '
  }
];

var adgangsadresseIdParameter =   {
  name: 'id',
  doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018'
};

var adgangsadresseParameters =  [
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i vejnavn, husnr, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adgangsadressen. ' +
      'Wildcard * er tilladt i slutningen af hvert ord. ' +
      'Der skelnes ikke mellem store og små bogstaver.',
    examples: ['tværv*']
  },
  adgangsadresseIdParameter].concat(parametersForBothAdresseAndAdgangsAdresse);

var adgangsadresseDoc = {
  docVersion: 2,
  resources: {
    '/adgangsadresser/{id}': {
      subtext: 'Modtag adresse med id.',
      parameters: [adgangsadresseIdParameter],
      examples:  [{description: 'Returner adressen med id 0a3f507a-b2e6-32b8-e044-0003ba298018',
                   path: ['/adgangsadresser/0a3f507a-b2e6-32b8-e044-0003ba298018']}]},

    '/adgangsadresser':{
      subtext: 'Søg efter adresser. Returnerer de adresser som opfylder kriteriet.',
      parameters: adgangsadresseParameters,
      examples: [{description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.',
                  query: [{name: 'vejnavn', value: 'Rødkildevej'},
                          {name: 'husnr',   value: '46'}]},
                 {description: 'Find de adgangsadresser som indeholder et ord der starter med hvid og har postnummeret 2400',
                  query: [{name: 'q',      value: 'hvid*'},
                          {name: 'postnr', value: '2400'}]}]},

    '/adgangsadresser/autocomplete':{
      subtext: autocompleteSubtext('adgangsadresser'),
      parameters: overwriteWithAutocompleteQParameter(adgangsadresseParameters),
      examples: [{description: 'Find alle adgangsadresser som indeholder <em>rand</em>',
                  query: [{name:'q', value:'rand'}]},
                 {description: 'Find alle adgangsadresser som indeholder <em>randers</em> indenfor postnummer <em>8600</em>',
                  query: [{name:'q', value:'randers'},
                          {name:'postnr', value:'8600'}]}]},

    '/adgangsadresser/reverse':{
      subtext: 'Find den adresse, som ligger nærmest det angivne koordinat. Som koordinatsystem kan anvendes '+
        'ETRS89/UTM32 med <em>srid=<a href="http://spatialreference.org/ref/epsg/25832/">25832</a></em> eller '+
        'WGS84/geografisk med <em>srid=<a href="http://spatialreference.org/ref/epsg/4326/">4326</a></em>.  Default er WGS84.',
      parameters: [{name: 'x', doc: 'X koordinat. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk '+
                    'anvendex angives bredde-værdien.'},
                   {name: 'y', doc: 'Y koordinat. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk '+
                    'anvendex angives længde-værdien.'},
                   SRIDParameter],
      examples: [{description: 'Returner adgangsadressen nærmest punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
                  query: [{name:'x', value:'12.5851471984198'},
                          {name:'y', value:'55.6832383751223'}]},
                 {description: 'Returner adressen nærmest punktet angivet af ETRS89/UTM32 koordinatet (6176652.55, 725369.59)',
                  query: [{name:'x'     , value: '6176652.55'},
                          {name:'y'     , value: '725369.59'},
                          {name: 'srid' , value: '25832'}]}]}}};


var adresseDoc = {
  docVersion: 1,
  parameters: [
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i vejnavn, husnr, etage, dør, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adressebetegnelsen. ' +
        'Wildcard * er tilladt i slutningen af hvert ord. ' +
        'Der skelnes ikke mellem store og små bogstaver.',
      examples: ['tværv*']
    },
    {
      name: 'id',
      doc: 'Adressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018'
    },
    {
      name: 'adgangsadresseid',
      doc: 'Id på den til adressen tilknyttede adgangsadresse. UUID.'
    },
    {
      name: 'etage',
      doc: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier: tal fra 1 til 99, st, kl, kl2 op til kl9',
    },
    {
      name: 'dør',
      doc: 'Dørbetegnelse. Tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.'
    }
  ].concat(parametersForBothAdresseAndAdgangsAdresse),
  examples: {
    query: [
      {
        description: 'Find de adresser som ligger på Rødkildevej og har husnummeret 46.',
        query: [{
          name: 'vejnavn',
          value: 'Rødkildevej'
        },{
          name: 'husnr',
          value: '46'
        }]
      }, {
        description: 'Find de adresser som indeholder et ord der starter med hvid og har postnummeret 2400',
        query: [{
          name: 'q',
          value: 'hvid*'
        }, {
          name: 'postnr',
          value: '2400'
        }]
      }
    ],
    get: [
      {
        description: 'Returner adressen med id 0255b942-f3ac-4969-a963-d2c4ed9ab943',
        path: ['0255b942-f3ac-4969-a963-d2c4ed9ab943']
      }
    ]
  },
  autocompleteExamples: [
    {description: 'Find alle adresser som indeholder <em>rand</em>',
     query: [{name:'q', value:'rand'}]},
    {description: 'Find alle adresser som indeholder <em>randers</em> på postnr <em>8450</em>',
     query: [{name:'q', value:'randers'},{name:'postnr', value:'8450'}]}
  ]

};



var postnummerDoc = {
  docVersion: 1,
  parameters: [
    {
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
      name: 'kommune',
      doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
      examples: ['0101']
    },
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i postnummernavnet. Alle ord i søgeteksten skal matche postnummernavnet. ' +
        'Wildcard * er tilladt i slutningen af hvert ord.'
    }
  ],
  examples: {
    query: [
      {description: 'Hent alle postnumre', query: []},
      {description: 'Find postnummer <em>8600</em>',
       query: [{ name: 'nr', value: "8600"}]},
      {description: 'Find alle postnumre som benyttes i kommune <em>751</em> (Aarhus)',
       query: [{ name: 'kommune', value: "751"}]},
      {description: 'Find postnummer for postnummernavn <em>Silkeborg</em>',
       query: [{ name: 'navn', value: "Silkeborg"}]},
      {description: 'Find alle postnumre som indeholder ordet <em>strand</em>',
       query: [{ name: 'q', value: "strand"}]},
      {description: 'Find alle postnumre som indeholder <em>aar*</em>',
       query: [{ name: 'q', value: "aar*"}]},
    ],
    get: [
      {
        description: 'Hent postnummer for København NV',
        path: ['2400']
      }]

  },
  autocompleteExamples: [
    {description: 'Find alle postnumre som indeholder <em>strand</em> i postnummerbetegnelsen',
     query: [{name:'q', value:'strand'}]}],
};


module.exports = {
  vejnavn: vejnavneDoc,
  vejstykke: vejstykkerDoc,
  supplerendebynavn: supplerendeBynavneDoc,
  kommune: kommuneDoc,
  adgangsadresse: adgangsadresseDoc,
  postnummer: postnummerDoc,
  adresse: adresseDoc
};
