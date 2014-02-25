"use strict";

var vejnavneDoc = {
  parameters: [
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejnavnet. ' +
        'Wildcard * er tilladt i slutningen af hvert ord. ' +
        'Der skelnes ikke mellem store og små bogstaver.',
      examples: ['tværvej']
    },
    {
      name: 'navn',
      doc: "Vejnavn. Der skelnes mellem store og små bogstaver.",
      examples: ['Margrethepladsen', 'Viborgvej']
    },
    {
      name: 'kommunekode',
      doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
      examples: ['0101']
    },
    {
      name: 'postnr',
      doc: 'Postnummer. 4 cifre.',
      examples: ['2700']
    }
  ],
  examples: {
    query: [
      {
        description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og indeholder et ord der starter med <em>hvid</em>',
        query: [
          {
            name: 'postnr',
            value: '2400'
          },
          {
            name: 'q',
            value: 'hvid*'
          }
        ]
      },
      {
        description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
        query: [
          {
            name: 'kommunekode',
            value: '0101'
          }
        ]
      }

    ],
    get: [{ description: 'Hent information om vejnavnet <em>Gammel Viborgvej</em>',
            path: ['Gammel Viborgvej']
          }]
  },

  autocompleteExamples: [
    {description: 'Find alle vejnavne som indeholder <em>jolle</em>',
     query: [{name:'q', value:'jolle'}]},
    {description: 'Find alle vejnavne som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
     query: [{name:'q', value:'strand '}]}],
};

var vejstykkerDoc = {
  parameters: [
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejstykket. ' +
        'Wildcard * er tilladt i slutningen af hvert ord. ' +
        'Der skelnes ikke mellem store og små bogstaver.',
      examples: ['tværvej']
    },
    {
      name: 'navn',
      doc: "Vejnavn. Der skelnes mellem store og små bogstaver. Der kan anvendes wildcard-søgning.",
      examples: ['Margrethepladsen', 'Viborgvej']
    },
    {
      name: 'kommunekode',
      doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
      examples: ['0101']
    },
    {
      name: 'kode',
      doc: 'vejkode. 4 cifre.',
      examples: ['0052']
    },
    {
      name: 'postnr',
      doc: 'Postnummer. 4 cifre.',
      examples: ['2700']
    }
  ],
  examples: {
    query: [
      {
        description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og indeholder et ord der starter med <em>hvid</em>',
        query: [
          {
            name: 'postnr',
            value: '2400'
          },
          {
            name: 'q',
            value: 'hvid*'
          }
        ]
      },
      {
        description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
        query: [
          {
            name: 'kommunekode',
            value: '0101'
          }
        ]
      }
    ],
    get: [{ description: 'Hent information om vejstykket med kommunekode <em>0101</em>, og vejkoden <em>316</em>',
            path: ['0101', '316']
          }]
  },

  autocompleteExamples: [
    {description: 'Find alle vejstykker som indeholder <em>jolle</em>',
     query: [{name:'q', value:'jolle'}]},
    {description: 'Find alle vejstykker som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
     query: [{name:'q', value:'strand '}]}],

};

var supplerendeBynavneDoc = {
  parameters: [
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche det supplerende bynavn. ' +
        'Wildcard * er tilladt i slutningen af hvert ord.'
    },
    {
      name: 'navn',
      doc: 'Navnet på det supplerende bynavn, f.eks. <em>Holeby</em>',
      examples: ['Holeby', 'Aabybro']
    },
    {
      name: 'postnr',
      doc: 'Postnummer. 4 cifre.',
      examples: ['2700']
    },
    {
      name: 'kommunekode',
      doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
      examples: ['0101']
    }
  ],
  examples: {
    query: [
      {
        description: 'Find de supplerende bynavne som ligger i postnummeret <em>3700 Rønne</em>',
        query: [
          {
            name: 'postnr',
            value: '3700'
          }
          ]
      },
      {
        description: 'Find de supplerende bynavne, hvor et ord i det supplerende bynavn starter med <em>aar</em>',
        query: [
          { name: 'q',
            value: "aar*"
          }
          ]
      }
    ],
    get: [
      {
        description: 'Hent det supplerende bynavn med navn <em>Aarsballe</em>',
        path: ['Aarsballe']
      }]
  },

  autocompleteExamples: [
    {description: 'Find alle supplerende bynavne som indeholder <em>sejr</em>',
     query: [{name:'q', value:'sejr'}]}],
};

var kommuneDoc = {
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
  {
    name: 'srid',
    doc: 'Angiver <a href="http://en.wikipedia.org/wiki/SRID">SRID</a> for det koordinatsystem, som geospatiale parametre er angivet i. Default er 4326 (WGS84)'
  },
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



var adgangsadresseDoc = {
  parameters: [
    {
      name: 'q',
      doc: 'Søgetekst. Der søges i vejnavn, husnr, supplerende bynavn, postnr og postnummerets navn. Alle ord i søgeteksten skal matche adgangsadressen. ' +
        'Wildcard * er tilladt i slutningen af hvert ord. ' +
        'Der skelnes ikke mellem store og små bogstaver.',
      examples: ['tværv*']
    },
    {
      name: 'id',
      doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018'
    }
  ].concat(parametersForBothAdresseAndAdgangsAdresse),
  examples: {
    query: [
      {
        description: 'Find de adgangsadresser som ligger på Rødkildevej og har husnummeret 46.',
        query: [{
          name: 'vejnavn',
          value: 'Rødkildevej'
        },{
          name: 'husnr',
          value: '46'
        }]
      }, {
        description: 'Find de adgangsadresser som indeholder et ord der starter med hvid og har postnummeret 2400',
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
        description: 'Returner adressen med id 0a3f507a-b2e6-32b8-e044-0003ba298018',
        path: ['0a3f507a-b2e6-32b8-e044-0003ba298018']
      }
    ]
  },

  autocompleteExamples: [
    {description: 'Find alle adgangsadresser som indeholder <em>rand</em>',
     query: [{name:'q', value:'rand'}]},
    {description: 'Find alle adgangsadresser som indeholder <em>randers</em> indenfor postnummer <em>8600</em>',
     query: [{name:'q', value:'randers'},{name:'postnr', value:'8600'}]},
],



};

var adresseDoc = {
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
    {description: 'Find alle adresser som indeholder <em>randers</em> på etage <em>2</em>',
     query: [{name:'q', value:'randers'},{name:'etage', value:'2'}]}
  ]

};



var postnummerDoc = {
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
  supplerendeBynavn: supplerendeBynavneDoc,
  kommune: kommuneDoc,
  adgangsadresse: adgangsadresseDoc,
  postnummer: postnummerDoc,
  adresse: adresseDoc
};
