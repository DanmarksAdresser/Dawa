const grbbrModels = require('../ois2/parse-ea-model');
const {getQueryPath, getEntityName} = require('../apiSpecification/bbr/common');
const parameterMap = require('../apiSpecification/bbr/parameters');
const {formatAndPagingParams, formatParameters} = require('./common');
const subtextsQuery = {
    bygning: 'Find bygninger fra BBR.',
    enhed: 'Find enheder fra BBR.',
    ejendomsrelation: 'Find ejendomsrelationer fra BBR.',
    tekniskanlæg: 'Find tekniske anlæg fra BBR.',
    grund: 'Find grunde fra BBR.',
    grundjordstykke: 'Find relationer mellem grunde og jordstykker fra BBR.',
    fordelingsareal: 'Find fordelingsarealer fra BBR. Bemærk, at der kun er registreret få fordelingsarealer.',
    fordelingaffordelingsareal: 'Find fordelingen af fordelingsarealer fra BBR. Bemærk, at der kun er registreret få fordelingsarealer.',
    bygningpåfremmedgrund: 'Find relationer mellem bygning og ejendomsrelation, som repræsenterer en bygning påfremmed grund.',
    enhedejerlejlighed: 'Find Enhed-Ejerlejlighed relationer fra BBR.',
    etage: 'Find etager fra BBR.',
    opgang: 'Find opgange fra BBR'
};

const subtextsGetByKey = {
    bygning: 'Modtag BBR bygning.',
    enhed: 'Modtag BBR enhed.',
    ejendomsrelation: `Modtag BBR ejendomsrelation.`,
    tekniskanlæg: 'Modtag BBR teknisk anlæg',
    grund: 'Modtag BBR grund.',
    grundjordstykke: 'Modtag BBR grund-jordstykke relation.',
    fordelingsareal: 'Modtag BBR fordelingsareal. Bemærk, at der kun er registreret få fordelingsarealer.',
    fordelingaffordelingsareal: 'Modtag BBR fordelingaffordelingsareal. Bemærk, at der kun er registreret få fordelingsarealer.',
    bygningpåfremmedgrund: 'Modtag relationer mellem BBR bygning og ejendomsrelation, som repræsenterer en bygning påfremmed grund.',
    enhedejerlejlighed: 'Modtag BBR Find enhed-ejerlejlighed relation.',
    etage: 'Modtag BBR etage.',
    opgang: 'Modtag BBR opgang.'
};

const examples = {
    bygning: [
        {
            description: 'Find bygninger med anvendelseskode 150 (Kollegium)',
            query: [{
                name: 'anvendelseskode',
                value: '150'
            }]
        }
    ],
    etage: [
        {
            description: 'Find etager i bygningen med id "813700c5-8416-4530-a830-5c7ec222cc7c"',
            query: [
                {
                    name: 'bygning_id',
                    value: "813700c5-8416-4530-a830-5c7ec222cc7c"
                }
            ]
        }
    ],
    enhed: [
        {
            description: 'Find enheder på etagen med ID "99dcc819-7b6d-4816-86aa-f7b5f7248279"',
            query: [
                {
                    name: 'etage_id',
                    value: "99dcc819-7b6d-4816-86aa-f7b5f7248279"
                }
            ]
        }
    ],
    grund: [
        {
            description: 'Find grunde med husnummeret "0a3f507b-c905-32b8-e044-0003ba298018"',
            query: [
                {
                    name: 'husnummer_id',
                    value: '0a3f507b-c905-32b8-e044-0003ba298018'
                }
            ]
        }
    ],
    tekniskanlæg: [
        {
          description: 'Find tekniske anlæg i bygningen med id "e3466e72-ad74-4de6-afbd-be414e1f0189"',
          query: [
            {
              name: 'bygning_id',
              value: 'e3466e72-ad74-4de6-afbd-be414e1f0189'
            }
          ]
        }],
  ejendomsrelation: [
    {
      description: 'Find ejendomsrelationen med ID "4553edc4-73ac-4cca-9a7b-23a4594f7c52"',
      query: [
        {
          name: 'id',
          value: '4553edc4-73ac-4cca-9a7b-23a4594f7c52'
        }
      ]
    }
  ],
  opgang: [
    {
      description: 'Find opgange i bygningen med ID "affbb717-e4c0-489a-962c-5cc5505248b3"',
      query: [
        {
          name: 'bygning_id',
          value: 'affbb717-e4c0-489a-962c-5cc5505248b3'
        }
      ]
    }
  ],
  grundjordstykke: [
    {
      description: 'Find grundjordstykke relationen for jordstykket med id 2593167',
      query: [
        {
          name: 'jordstykke_id',
          value: '2593167'
        }
      ]
    }
  ],
  bygningpåfremmedgrund: [
    {
      description: 'Find bygningpåfremmedgrund relationer for bygningen med id "2788d430-39bd-4b9d-9762-93a937ba9c14"',
      query: [{
        name: 'bygning_id',
        value: '2788d430-39bd-4b9d-9762-93a937ba9c14'
      }]
    }
  ],
    enhedejerlejlighed: [
        {
            description: 'Find enhedejerlejlighed relationen for enheden med ID "328992b9-de7b-42a8-957f-e822234fdaa7"',
            query: [
                {
                    name: 'enhed_id',
                    value: "328992b9-de7b-42a8-957f-e822234fdaa7"
                }
            ]
        }
    ],
    fordelingsareal: [
        {
            description: 'Find fordelingsarealer for bygningen med id "23415b72-671d-4bc1-a934-e9e70510ae21"',
            query: [
                {
                    name: 'bygning_id',
                    value: '23415b72-671d-4bc1-a934-e9e70510ae21'
                }
            ]
        }
    ],
    fordelingaffordelingsareal: [
        {
            description: 'Find fordelingen af fordelingsarealet med ID "59402429-9b01-4a37-909a-f1f5d8d234e2"',
            query: [
                {
                    name: 'fordelingsareal_id',
                    value: '59402429-9b01-4a37-909a-f1f5d8d234e2'
                }
            ]
        }
    ]
};

const strukturParam = {
    name: 'struktur',
    doc: 'Angiv om der modtages en flad eller nestet svarstruktur. Mulige værdier: <code>flad</code>, <code>nestet</code>'
};
const queryDocs = grbbrModels.map(grbbrModel => {
    const path = getQueryPath(grbbrModel.name);
    const subtext = subtextsQuery[grbbrModel.name];
    const propertyFilterParams = parameterMap[grbbrModel.name].propertyFilter;
    const propertyFilterParamDocs = propertyFilterParams.map(param => ({
        name: param.name,
        doc: `Returner resultater med de(n) angivne værdi(er) for ${param.name}`
    }));
    return {
        entity: getEntityName(grbbrModel),
        path,
        subtext,
        parameters: [...propertyFilterParamDocs, strukturParam, ...formatAndPagingParams],
        examples: examples[grbbrModel.name] || []
    };
});

const getByKeyDocs = grbbrModels.map(grbbrModel => {
    const path = `${getQueryPath(grbbrModel.name)}/{id}`;
    const subtext = subtextsGetByKey[grbbrModel.name];
    const idParameter = {
        name: 'id',
        doc: 'Id (UUID) på det ønskede objekt.'
    }
    return {
        entity: getEntityName(grbbrModel),
        path,
        subtext,
        parameters: [idParameter, strukturParam, ...formatParameters],
        examples: []
    }
});

module.exports = [...queryDocs, ...getByKeyDocs];