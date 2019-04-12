const datamodels = require("./datamodel");
const temaModels = require('../../dagiImport/temaModels');
const darReplikeringModels = require('../../dar10/replikeringModels');
const types = require('./bindings/binding-types');
const getProvidedAttributes = require('./bindings/get-provided-attributes');

const addDefaultBindings = (attributes, bindings) => {
  const providedAttributeNames = bindings.reduce((acc, binding) => {
    for(let attr of getProvidedAttributes(binding)) {
      acc.push(attr);
    }
    return acc;
  }, []);
  for(let attribute of attributes) {
    if(!providedAttributeNames.includes(attribute.name)) {
      bindings.push(types.column({attrName: attribute.name}));
    }
  }
};

const normalize = (datamodels, unnormalizedBindings) => {
  for(let [entityName, datamodel] of Object.entries(datamodels)) {
    const binding = unnormalizedBindings[entityName];
    if (!binding) {
      throw new Error('No db replication binding for ' + entityName);
    }
    addDefaultBindings(datamodel.attributes, binding.attributes);
  }
  return unnormalizedBindings;
};

const unnormalizedBindings = {
  højde: {
    table: 'hoejder',
    attributes: [
      types.column({attrName: 'højde', column: 'hoejde'})
    ]
  },
  adgangsadresse: {
    path: '/replikering/adgangsadresser',
    table: 'adgangsadresser',
    legacyResource: true,
    attributes: [
      types.column({attrName: 'status', column: 'objekttype'}),
      types.column({attrName: 'kilde', column: 'adgangspunktkilde'}),
      types.localTimestamp({attrName: 'oprettet'}),
      types.localTimestamp({attrName: 'ændret',column: 'aendret'}),
      types.localTimestamp({attrName: 'ikrafttrædelsesdato', column: 'ikraftfra'}),
      types.kode4({attrName: 'kommunekode'}),
      types.kode4({attrName: 'vejkode'}),
      types.husnr({attrName: 'husnr'}),
      types.kode4({attrName: 'postnr'}),
      types.column({attrName: 'etrs89koordinat_øst', column: 'etrs89oest'}),
      types.column({attrName: 'etrs89koordinat_nord', column: 'etrs89nord'}),
      types.numberToString({attrName: 'esrejendomsnr'}),
      types.column({attrName: 'nøjagtighed', column: 'noejagtighed'}),
      types.localTimestamp({attrName: 'adressepunktændringsdato', column: 'adressepunktaendringsdato'}),
      types.column({attrName: 'højde', column: 'hoejde'}),
      types.numberToString({attrName: 'supplerendebynavn_dagi_id'})
    ]
  },
  adresse: {
    path: '/replikering/adresser',
    table: 'enhedsadresser',
    legacyResource: true,
    attributes: [
      types.column({attrName: 'status', column: 'objekttype'}),
      types.localTimestamp({attrName: 'oprettet'}),
      types.localTimestamp({attrName: 'ændret',column: 'aendret'}),
      types.localTimestamp({attrName: 'ikrafttrædelsesdato', column: 'ikraftfra'}),
      types.column({attrName: 'dør', column: 'doer'})
    ]
  },
  ejerlav: {
    path: '/replikering/ejerlav',
    table: 'ejerlav',
    legacyResource: true,
    attributes: [
      types.geometry({attrName: 'visueltcenter'}),
      types.geometry({attrName: 'bbox'}),
      types.offloadedGeometry({attrName: 'geometri', column: 'geom'})
    ]
  },
  bygning: {
    table: 'bygninger',
    attributes: [
      types.geometry({attrName: 'geometri', column: 'geom'})
    ]
  },
  bygningtilknytning: {
    table: 'bygningtilknytninger',
    attributes: [
      types.stringToNumber({attrName: 'bygningid'})
    ]
  },
  jordstykke: {
    table: 'jordstykker',
    attributes: [
      types.kode4({attrName: 'kommunekode'}),
      types.kode4({attrName: 'regionskode'}),
      types.kode4({attrName: 'sognekode'}),
      types.kode4({attrName: 'retskredskode'}),
      types.geometry({attrName: 'geometri', column: 'geom'}),
      types.numberToString({attrName: 'featureid'})
    ]
  },
  jordstykketilknytning: {
    path: '/replikering/jordstykketilknytninger',
    table: 'jordstykker_adgadr',
    legacyResource: true,
    attributes: [
      types.column({attrName: 'adgangsadresseid', column: 'adgangsadresse_id'})
    ]
  },
  navngivenvej: {
    path: '/replikering/navngivneveje',
    table: 'navngivenvej',
    legacyResource: false,
    attributes: [
      types.darStatus({attrName: 'darstatus'}),
      types.timestamp({attrName: 'oprettet'}),
      types.timestamp({attrName: 'ændret'}),
      types.kode4({attrName: 'administrerendekommune'})
    ],
  },
  stedtilknytning: {
    path: '/replikering/stedtilknytninger',
    table: 'stedtilknytninger',
    legacyResource: false,
    attributes: []
  },
  stednavntilknytning: {
    path: '/replikering/stednavntilknytninger',
    table: 'stedtilknytninger',
    legacyResource: true,
    attributes: [
      types.column({attrName: 'stednavn_id', column: 'stedid'}),
      types.column({attrName: 'adgangsadresse_id', column: 'adgangsadresseid'})
    ],
  },
  sted: {
    table: 'steder',
    attributes: [
      types.geometry({attrName: 'visueltcenter'}),
      types.geometry({attrName: 'bbox'}),
      types.offloadedGeometry({attrName: 'geometri', column: 'geom'})
    ]
  },
  stednavn: {
    table: 'stednavne',
    attributes: [
    ]
  },
  vejpunkt: {
    table: 'vejpunkter',
    attributes: [
      types.column({attrName: 'nøjagtighedsklasse', column: 'noejagtighedsklasse'}),
      types.geometry({attrName: 'position', column: 'geom'})
    ],
  },
  vejstykke: {
    path: '/replikering/vejstykker',
    table: 'vejstykker',
    legacyResource: true,
    attributes: [
      types.column({attrName: 'id', column: 'navngivenvejkommunedel_id'}),
      types.kode4({attrName: 'kommunekode'}),
      types.kode4({attrName: 'kode'}),
      types.column({attrName: 'navn', column: 'vejnavn'}),
      types.localTimestamp({attrName: 'oprettet'}),
      types.localTimestamp({attrName: 'ændret', column: 'aendret'})
    ]
  },
  vejmidte: {
    table: 'vejmidter',
    attributes: [
      types.kode4({attrName: 'kommunekode'}),
      types.kode4({attrName: 'vejkode', column: 'kode'}),
      types.offloadedGeometry({attrName: 'geometri', column: 'geom'})
    ]
  },
  vejstykkepostnummerrelation: {
    path: '/replikering/vejstykkepostnummerrelationer',
    table: 'vejstykkerpostnumremat',
    legacyResource: true,
    attributes: [
      types.kode4({attrName: 'kommunekode'}),
      types.kode4({attrName: 'vejkode'}),
      types.kode4({attrName: 'postnr'})
    ]
  },
  postnummer: {
    path: '/replikering/postnumre',
    table: 'postnumre',
    legacyResource: true,
    attributes: [
      types.kode4({attrName: 'nr'})
    ]
  },
  brofasthed: {
    table: 'brofasthed',
    attributes: []
  },
  ikke_brofast_husnummer: {
    table: 'ikke_brofaste_adresser',
    attributes: [
      types.column({attrName: 'husnummerid', column: 'adgangsadresseid'})
    ]
  },
  vask_husnummer_historik: {
    table: 'vask_adgangsadresser',
    attributes: [
      types.timestampInterval({attrName: 'virkning'}),
      types.column({attrName: 'husnummer_status', column: 'hn_statuskode'}),
      types.column({attrName: 'adgangspunkt_status', column: 'ap_statuskode'}),
      types.kode4({attrName: 'vejkode'}),
      types.kode4({attrName: 'kommunekode'}),
      types.husnr({attrName: 'husnr'}),
      types.kode4({attrName: 'postnr'})
    ]
  },
  vask_adresse_historik: {
    table: 'vask_adresser',
    attributes: [
      types.timestampInterval({attrName: 'virkning'}),
      types.column({attrName: 'husnummer_status', column: 'hn_statuskode'}),
      types.column({attrName: 'adgangspunkt_status', column: 'ap_statuskode'}),
      types.kode4({attrName: 'vejkode'}),
      types.kode4({attrName: 'kommunekode'}),
      types.husnr({attrName: 'husnr'}),
      types.column({attrName: 'husnummerid', column: 'adgangsadresseid'}),
      types.column({attrName: 'dør', column: 'doer'}),
      types.kode4({attrName: 'postnr'})
    ]
  }
};

for(let [entityName, binding] of Object.entries( darReplikeringModels.currentReplikeringBindings)) {
  unnormalizedBindings[`dar_${entityName.toLowerCase()}_aktuel`] = binding;
}

for(let [entityName, binding] of Object.entries( darReplikeringModels.historyReplikeringBindings)) {
  unnormalizedBindings[`dar_${entityName.toLowerCase()}_historik`] = binding;
}

for (let temaModel of temaModels.modelList) {
  unnormalizedBindings[temaModel.entity || temaModel.singular] = temaModels.toReplikeringBinding(temaModel);
  unnormalizedBindings[temaModel.tilknytningName] = temaModels.toReplikeringTilknytningDbBinding(temaModel);
}

module.exports = normalize(datamodels, unnormalizedBindings);