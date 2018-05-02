const _ = require('underscore');

const {
  autocompleteSubtext,
  formatParameters,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter,
  reverseGeocodingParameters,
  strukturParameter
} = require('./common');

const temaModels = require('../dagiImport/temaModels');

const {
  replikeringDoc
} = require('./replikeringCommon');

const {SRIDParameter} = require('./common');
const firstUpper = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const dagiNavnParameter = (tema) => {
  return {
    name: 'navn',
    doc: firstUpper(tema.singularSpecific) + 's navn. Der er forskel på store og små bogstaver.'
  };
};

const dagiQParameter = () => {
  return {
    name: 'q',
    doc: 'Søgetekst. Der søges i kode og navn. Alle ord i søgeteksten skal matche. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. Der returneres højst 1000 resultater ved anvendelse af parameteren.'
  };
};


const dagiKodeNavnParameters = (tema) => {
  return [
    {
      name: 'kode',
      doc: firstUpper(tema.singularSpecific) + 's kode. 4 cifre.'
    },
    dagiNavnParameter(tema),
    dagiQParameter()
  ];
};

const dagiSridCirkelPolygonParameters = (plural) => {
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
};

const dagiReverseParameters = (temaModel) => {
  return [{
    name: 'x',
    doc: `Reverse geocoding. Find ${temaModel.singularSpecific} for det angivne koordinat.
 Der benyttes det koordinatsystem, som er angivet i srid-parameteren (Default WGS84).`
  }, {
    name: 'y',
    doc: `Reverse geocoding. Find ${temaModel.singularSpecific} for det angivne koordinat.' +
  'Der benyttes det koordinatsystem, som er angivet i srid-parameteren (Default WGS84).`
  }, {
    name: 'nærmeste',
    doc: `Hvis denne parameter angives, sammen med x og y parametrene findes ${temaModel.singularSpecific} der
 ligger nærmest det angivne punkt.`
  }];
};

const getTemaModel = temaName => temaModels.modelMap[temaName];

const dagiQueryDoc = (tema, examples) => {
  return {
    entity: tema.singular,
    path: `/${tema.plural}`,
    subtext: `Søg efter ${tema.plural}. Returnerer de ${tema.plural} der opfylder kriteriet.`,
    parameters: [
      ...dagiKodeNavnParameters(tema),
      ...dagiReverseParameters(tema),
      ...formatAndPagingParams,
      strukturParameter,
      ...dagiSridCirkelPolygonParameters(tema.plural)
    ],
    examples: examples || []
  };
};

const dagiByKodeDoc = (tema, examples) => {
  return {
    entity: tema.singular,
    path: `/${tema.plural}/{kode}`,
    subtext: 'Modtag ' + tema.singular + ' med kode.',
    parameters: [_.find(dagiKodeNavnParameters(tema), function (p) {
      return p.name === 'kode';
    }), strukturParameter, ...formatParameters],
    nomulti: true,
    examples: examples || []
  };
};

const dagiAutocompleteDoc = (tema, examples) => {
  return {
    entity: tema.singular,
    path: `/${tema.plural}/autocomplete`,
    subtext: autocompleteSubtext(tema.plural),
    parameters: overwriteWithAutocompleteQParameter(dagiKodeNavnParameters(tema)).concat(formatAndPagingParams),
    examples: examples
  };
};

const dagiReverseDoc = (tema) => {
  const basePath = tema.path || `/${tema.plural}`;
  return {
    entity: tema.singular,
    path: `${basePath}/reverse`,
    subtext: 'Modtag ' + tema.singularSpecific + ' for det angivne koordinat.',
    parameters: [...reverseGeocodingParameters, strukturParameter],
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
};

const dagiReplikeringTilknytningDoc = model => {
  const eventParams = [{
    name: 'adgangsadresseid',
    doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
  }];
  return replikeringDoc(`${model.prefix}tilknytning`, eventParams, []);
};


module.exports = {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiKodeNavnParameters,
  dagiNavnParameter,
  dagiQParameter,
  dagiQueryDoc,
  dagiReverseDoc,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  getTemaModel,
  dagiReplikeringTilknytningDoc
};
