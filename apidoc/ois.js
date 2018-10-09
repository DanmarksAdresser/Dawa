const {
  formatAndPagingParams,
  formatParameters
} = require('./common');

const oisApiModel = require('../apiSpecification/ois/oisApiModels');
const oisModels = require('../ois/oisModels');
const oisNamesAndKeys = require('../apiSpecification/ois/namesAndKeys');
const oisParameters = require('../apiSpecification/ois/parameters');

const oisReferenceText = `For dokumentation af begreber, felter, kodelister m.v. henvises til <a href="http://w2l.dk/file/632761/bbr_logisk_datamodel_v_12.2.pdf">BBR datamodellen</a>, <a href="http://bbr.dk/registreringsindhold/0/30">BBR's registreringsindhold</a> og <a href="https://www.ois.dk/Documents/PDFPrint/ois_datamodel.doc">OIS-dokumentationen</a>.`;

const oisAdditionalParameterDoc = {
  grund: [],
  bygning: [
    {
      name: 'polygon',
      doc: 'Find bygninger, hvor bygningspunktet ligger indenfor det angivne polygon.' +
      ' Polygonet specificeres som et array af koordinater på samme måde som' +
      ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
      ' Bemærk at polygoner skal' +
      ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
      ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
      ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
      ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].',
    },
    {
      name: 'cirkel',
      doc: 'Find de bygninger, hvor bygningspunktet overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
      examples: []
    },
    {
      name: 'x',
      doc: 'Find bygningen nærmest punktet angivet ved x- og y-parametrene. Parametrene angives' +
      'i det koordinatsystem som er angivet ved srid-parameteren.'
    },
    {
      name: 'y',
      doc: 'Find bygningen nærmest punktet angivet ved x- og y-parametrene. Parametrene angives' +
      'i det koordinatsystem som er angivet ved srid-parameteren.'
    }
  ],
  tekniskanlaeg: [{
    name: 'polygon',
    doc: 'Find tekniske anlæg, hvor bygningspunktet ligger indenfor det angivne polygon.' +
    ' Polygonet specificeres som et array af koordinater på samme måde som' +
    ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
    ' Bemærk at polygoner skal' +
    ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
    ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
    ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
    ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].',
  },
    {
      name: 'cirkel',
      doc: 'Find de tekniske anlæg, hvor bygningspunktet overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
      examples: []
    },
    {
      name: 'x',
      doc: 'Find det tekniske anlæg nærmest punktet angivet ved x- og y-parametrene. Parametrene angives' +
      'i det koordinatsystem som er angivet ved srid-parameteren.'
    },
    {
      name: 'y',
      doc: 'Find det tekniske anlæg nærmest punktet angivet ved x- og y-parametrene. Parametrene angives' +
      'i det koordinatsystem som er angivet ved srid-parameteren.'
    }],
  bygningspunkt: [{
    name: 'polygon',
    doc: 'Find bygningspunkter der ligger indenfor det angivne polygon.' +
    ' Polygonet specificeres som et array af koordinater på samme måde som' +
    ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
    ' Bemærk at polygoner skal' +
    ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
    ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
    ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
    ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].',
  },
    {
      name: 'cirkel',
      doc: 'Find bygningspunkter der overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
      examples: []
    },
    {
      name: 'x',
      doc: 'Find bygningspunktet nærmest punktet angivet ved x- og y-parametrene. Parametrene angives' +
      'i det koordinatsystem som er angivet ved srid-parameteren.'
    },
    {
      name: 'y',
      doc: 'Find bygningspunktet nærmest punktet angivet ved x- og y-parametrene. Parametrene angives' +
      'i det koordinatsystem som er angivet ved srid-parameteren.'
    }]
};

const oisFilterParameterDoc = {
  grund: {
    subtext: `Find grunde fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find grund med den angivne id (Grund_id)'
      },
      {
        name: 'adgangsadresseid',
        doc: 'Find grunde med den angivne adgangsadresseid (AdgAdr_id)'
      },
      {
        name: 'kommuneid',
        doc: 'Find grunde med den angivne kommuneid (Kommune_id)'
      },
      {
        name: 'esrejendomsnr',
        doc: 'Find grunde med det angivne ESR ejendomsnummer (EsrEjdNr)'
      },
      {
        name: 'sfeejendomsnr',
        doc: 'Find grunde med det angivne SFE ejendomsnr (MatrSFE_id)'
      }
    ],
    examples: [
      {
        description: 'Find grunden med id 000000b1-6158-40f2-971a-86885749e705',
        query: [
          { name: 'id', value: '000000b1-6158-40f2-971a-86885749e705'}
        ]
      }
    ]
  },
  bygning: {
    subtext: `Find bygninger fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find bygning med den angivne id (Bygning_id)'
      },
      {
        name: 'adgangsadresseid',
        doc: 'Find bygninger med den angivne adgangsadresseid (AdgAdr_id)'
      },
      {
        name: 'esrejendomsnr',
        doc: 'Find bygninger med det angivne ESR ejendomsnummer (EsrEjdNr)'
      },
      {
        name: 'anvendelseskode',
        doc: 'Find bygninger med den angivne anvendelseskode (BYG_ANVEND_KODE). For mulige værdier henvises til BBR-dokumentationen.',
      },
      {
        name: 'kommunekode',
        doc: 'Find bygninger med den angivne kommunekode (KomKode)'
      }
    ],
    examples: [
      {
        description: 'Find bygninger for adgangsadresseid 0a3f5098-ac99-32b8-e044-0003ba298018',
        query: [
          {name: 'adgangsadresseid', value: '0a3f5098-ac99-32b8-e044-0003ba298018'}
        ]
      }
    ]
  },
  tekniskanlaeg: {
    subtext: `Find tekniske anlæg fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find teknisk anlæg med den angivne id (Tekniskanlaeg_id)'
      },
      {
        name: 'adgangsadresseid',
        doc: 'Find tekniske anlæg med den angivne adgangsadresse (AdgAdr_id)'
      },
      {
        name: 'esrejendomsnr',
        doc: 'Find tekniske anlæg med det angivne ESR ejendomsnummer (ESREjdNr)'
      },
      {
        name: 'bygningsid',
        doc: 'Find tekniske anlæg i bygningen med den angivne bygningsid (Bygning_id)'
      },
      {
        name: 'kommunekode',
        doc: 'Find tekniske anlæg med den angivne kommunekode (KomKode)'
      },
      {
        name: 'klassifikation',
        doc: 'Find tekniske anlæg med den angivne klassifikation'
      }
    ],
    examples: [
      {
        description: 'Find teknisk anlæg med bygningsid 0035a14b-3546-47c6-881e-934ca71f66fa',
        query: [
          { name: 'bygningsid', value: '0035a14b-3546-47c6-881e-934ca71f66fa'}
        ]

      }
    ]

  },
  enhed: {
    subtext: `Find enheder fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find enheden med den angivne ID (Enhed_id)'
      },
      {
        name: 'adresseid',
        doc: 'Find enhederne med den angivne adresseid (EnhAdr_id)'
      },
      {
        name: 'anvendelseskode',
        doc: 'Find enhederne med den angivne anvendelseskode (ENH_ANVEND_KODE)'
      },
      {
        name: 'bygningsid',
        doc: 'Find enhederne i den angivne bygning.'
      },
      {
        name: 'kommunekode',
        doc: 'Find enheder, der ligger i en bygning med den angivne kommunekode (KomKode)'
      }
    ],
    examples: [
      {
        description: 'Find enheder for adressen med id 0a3f50ad-9b51-32b8-e044-0003ba298018',
        query: [
          {name: 'adresseid', value: '0a3f50ad-9b51-32b8-e044-0003ba298018'}
        ]
      },
      {
        description: 'Find enheder i bygningen med id c09059c8-ddcc-4616-8d6a-5a033c43d27d',
        query: [
          {name: 'bygningsid', value: 'c09059c8-ddcc-4616-8d6a-5a033c43d27d'}
        ]
      }
    ]

  },
  etage: {
    subtext: `Find etager fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find etage med den angivne ID (Etage_id)'
      },
      {
        name: 'bygningsid',
        doc: 'Find etager med den angivne bygningsid (Bygning_id)'
      }
    ],
    examples: [
      {description: 'Find etager i bygningen med ID 8ee3af1f-2619-41c4-9d27-11cb5f24cc94',
        query: [
          {name: 'bygningsid', value: '8ee3af1f-2619-41c4-9d27-11cb5f24cc94'}
        ]}
    ]

  },
  ejerskab: {
    subtext: `Find ejerskaber fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find ejerskab med den angivne ID (Ejerskab_id)'
      },
      {
        name: 'bbrid',
        doc: 'Find ejerskaber med den angivne BBR ID (BbrId)'
      },
      {
        name: 'kommunekode',
        doc: 'Find ejerskaber ud fra kommunekode'
      },
      {
        name: 'esrejendomsnr',
        doc: 'Find ejerskab med det angivne ESR ejendomsnr (ESREjdNr)'
      }
    ],
    examples: [
      {description: 'Find ejerskaber for grunden med med id 7024c919-21bf-4557-bf04-ba913b44c0bc',
        query: [
          {name: 'bbrid', value: '7024c919-21bf-4557-bf04-ba913b44c0bc'}
        ]},
      {
        description: 'Find ejerskaber for bygningen med id 8ce8dd4d-8fa9-4200-aca5-5093b99ff4c9',
        query: [
          { name: 'bbrid', value: '8ce8dd4d-8fa9-4200-aca5-5093b99ff4c9'}
        ]
      },
      {
        description: 'Find ejerskaber for enheden med id e9b7f6b5-b818-42d1-9b36-04b4fc9370f6',
        query: [
          { name: 'bbrid', value: 'e9b7f6b5-b818-42d1-9b36-04b4fc9370f6'}
        ]
      },
      {
        description: 'Find ejerskaber for det tekniske anlæg med id 24b089fb-dde9-443a-bba3-8099a67f8b18',
        query: [
          { name: 'bbrid', value: '24b089fb-dde9-443a-bba3-8099a67f8b18'}
        ]
      }
    ]

  },
  kommune: {
    subtext: `Find kommuner BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find kommunen med den angivne UUID (Kommune_id)'
      },
      {
        name: 'kommunekode',
        doc: 'Find kommunen ud fra kommunekode'
      }
    ],
    examples: [
      {
        description: 'Find kommunen med kommunekode 0101',
        query: [
          { name: 'kommunekode', value: '0101'}
        ]
      }
    ]
  },
  opgang: {
    subtext: `Find opgange fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find opgange med den angivne ID (Opgang_id)'
      },
      {
        name: 'bygningsid',
        doc: 'Find opgange med den angivne bygningsid (Bygning_id)'
      },
      {
        name: 'adgangsadresseid',
        doc: 'Find opgange med den angivne adgangsadresseid (AdgAdr_id)'
      }
    ],
    examples: [
      {
        description: 'Find opgange for adgangsadresseid 0a3f5096-91d3-32b8-e044-0003ba298018',
        query: [
          { name: 'adgangsadresseid', value: '0a3f5096-91d3-32b8-e044-0003ba298018'}
        ]
      }
    ]

  },
  bygningspunkt: {
    subtext: `Find bygningspunkter fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'id',
        doc: 'Find bygningspunktet med det angivne ID (BygPkt_id)'
      }
    ],
    examples: []
  },
  matrikelreference: {
    subtext: `Find matrikelreferencer fra BBR. ${oisReferenceText}`,
    parameters: [
      {
        name: 'grundid',
        doc: 'Find matrikelreferencer med den angivne grund ID (Grund_id)'
      },
      {
        name: 'kommunekode',
        doc: 'Find matrikelreferencer med den angivne kommunekode (KomKode)'
      },
      {
        name: 'ejerlavkode',
        doc: 'Find matrikelreferencer med den angivne landsejerlavkode'
      },
      {
        name: 'matrikelnr',
        doc: 'Find matrikelreferencer med det angivne matrikelnr (MatrNr). Kombineres typisk' +
        ' med ejerlavkode parameteren.'
      }
    ],
    examples: []
  }
};

const oisPaths = {
  'public': '/bbrlight',
  full: '/ois'
};

const result = [];

for(let variant of ['full', 'public']) {
  Object.keys(oisApiModel).forEach(apiModelName => {
    const strukturParam = {
      name: 'struktur',
      doc: 'Angiver hvilken svarstruktur der ønskes. "mini" angiver, BBR-entiten uden relatede entiteter. "nestet" angiver, at evt. relaterede' +
      'entiter skal medtages. "flad" angiver, at relaterede entiter skal medtages, men i en flad struktur.' +
      ' "nestet" er default for JSON format, "flad" er default for GeoJSON og CSV.'
    };
    const plural = oisNamesAndKeys[apiModelName].plural;
    const path = `${oisPaths[variant]}/${plural}`;
    const parameterDoc = Object.assign({}, oisFilterParameterDoc[apiModelName], {
      entity: apiModelName,
      path: path
    });
    const allFilterParameterNames = oisParameters[variant][apiModelName].propertyFilter.map(param => param.name);
    parameterDoc.parameters = parameterDoc.parameters.filter(param => allFilterParameterNames.includes(param.name));
    parameterDoc.parameters = parameterDoc.parameters.concat(oisAdditionalParameterDoc[apiModelName] || []);
    parameterDoc.parameters.push(strukturParam);
    parameterDoc.parameters = parameterDoc.parameters.concat(formatAndPagingParams);
    result.push(parameterDoc);
    if (apiModelName !== 'matrikelreference') {
      const getByKeyPath = `${oisPaths[variant]}/${plural}/{id}`;
      const pathParameter = {
        name: 'id',
        doc: `ID (${oisModels[apiModelName].key[0]})`
      };
      const parameters = [pathParameter].concat(formatParameters).concat(strukturParam);
      const subtext = `Enkeltopslag af ${apiModelName}`;
      result.push({
        entity: apiModelName,
        path: getByKeyPath,
        subtext,
        parameters,
        examples: []
      });
    }
  });
}

module.exports = result;
