const _ = require('underscore');

const commonSchemaDefinitions = require('../apiSpecification/commonSchemaDefinitions');
const {kode4String, zoneKodeFormatter, numberToString} = require('../apiSpecification/util');

const defaultSqlType = {
  string: 'text',
  integer: 'integer',
  boolean: 'boolean'
};

const defaultSchema = (type, nullable) => {
  if (nullable) {
    return {type: [type, 'null']};
  }
  else {
    return {type};
  }
};

const geomDistinctClause = (a, b) => `${a} IS DISTINCT FROM ${b} OR NOT ST_Equals(${a}, ${b})`;
const kodeNavnDeriveTsv = (table => `to_tsvector('adresser', processForIndexing(${table}.kode || ' ' || ${table}.navn))`);

exports.modelList = [{
  singular: 'region',
  singularSpecific: 'regionen',
  plural: 'regioner',
  prefix: 'regions',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [
    {
      name: 'dagi_id',
      sqlType: 'INTEGER',
      type: 'string',
      nullable: true,
      description: 'Unik ID',
      formatter: numberToString
    },
    {
      name: 'kode',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Regionens myndighedskode. Er unik for hver region. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Regionens navn'
    }],
  tilknytningKey: ['regionskode'],
  useNearestForAdgangsadresseMapping: true,

}, {
  singular: 'kommune',
  singularSpecific: 'kommunen',
  plural: 'kommuner',
  prefix: 'kommune',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [
    {
      name: 'dagi_id',
      type: 'string',
      sqlType: 'INTEGER',
      nullable: true,
      description: 'Unik ID',
      formatter: numberToString
    },
    {
      name: 'kode',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Kommunens myndighedskode. Er unik for hver kommune. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Kommunens navn'
    }, {
      name: 'regionskode',
      type: 'string',
      sqlType: 'SMALLINT',
      nullable: true,
      schema: commonSchemaDefinitions.NullableKode4,
      description: 'Regionskode for den region kommunen er beliggende i. 4 cifre.',
      formatter: kode4String
    }, {
      name: 'udenforkommuneinddeling',
      type: 'boolean',
      nullable: false,
      description: 'Falsk angiver at kommunen er en ægte kommune med en folkevalgt forsamling. Sand angiver at området/kommunen hører under Forsvarministeriet.'
    }],
  tilknytningKey: ['kommunekode'],
  useNearestForAdgangsadresseMapping: true
}, {
  singular: 'sogn',
  singularSpecific: 'sognet',
  plural: 'sogne',
  prefix: 'sogne',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [
    {
      name: 'dagi_id',
      type: 'string',
      sqlType: 'INTEGER',
      nullable: true,
      description: 'Unik ID',
      formatter: numberToString
    },
    {
      name: 'kode',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Sognets myndighedskode. Er unik for hvert sogn. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Sognets navn'
    }],
  tilknytningKey: ['sognekode'],
  useNearestForAdgangsadresseMapping: true
}, {
  singular: 'politikreds',
  singularSpecific: 'politikredsen',
  plural: 'politikredse',
  prefix: 'politikreds',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [
    {
      name: 'dagi_id',
      type: 'string',
      sqlType: 'INTEGER',
      nullable: true,
      description: 'Unik ID',
      formatter: numberToString
    },
    {
      name: 'kode',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Politikredsens myndighedskode. Er unik for hver politikreds. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Politikredsens navn.'
    }],
  tilknytningKey: ['politikredskode'],
  useNearestForAdgangsadresseMapping: true
}, {
  singular: 'retskreds',
  singularSpecific: 'retskredsen',
  plural: 'retskredse',
  prefix: 'retskreds',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [{
    name: 'dagi_id',
    type: 'string',
    sqlType: 'INTEGER',
    nullable: true,
    description: 'Unik ID',
    formatter: numberToString
  },
    {
      name: 'kode',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Retskredsens myndighedskode. Er unik for hver retskreds. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Retskredsens navn.'
    }],
  tilknytningKey: ['retskredskode'],
  useNearestForAdgangsadresseMapping: true
}, {
  singular: 'opstillingskreds',
  singularSpecific: 'opstillingskredsen',
  plural: 'opstillingskredse',
  prefix: 'opstillingskreds',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [
    {
      name: 'dagi_id',
      type: 'string',
      sqlType: 'INTEGER',
      nullable: true,
      description: 'Unik ID',
      formatter: numberToString
    },
    {
      name: 'nummer',
      type: 'string',
      sqlType: 'SMALLINT',
      nullable: true,
      description: 'Opstillingskredsens nummer.'
    },
    {
      name: 'kode',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Opstillingskredsens kode. Er unik for hver opstillingskreds. 4 cifre.'
    },
    {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Opstillingskredsens navn.'
    },
    {
      name: 'valgkredsnummer',
      type: 'string',
      sqlType: 'SMALLINT',
      nullable: true,
      description: 'Valgkredsnummer. Unikt indenfor storkredsen.'
    },
    {
      name: 'storkredsnummer',
      type: 'string',
      sqlType: 'SMALLINT',
      nullable: true,
      description: 'Nummeret på storkredsen, som opstillingskredsen tilhører.'
    },
    {
      name: 'kredskommunekode',
      type: 'string',
      formatter: kode4String,
      sqlType: 'SMALLINT',
      nullable: true,
      description: 'Opstillingskredsens kredskommune'
    }],
  tilknytningKey: ['opstillingskredskode'],
  useNearestForAdgangsadresseMapping: true
}, {
  singular: 'postnummer',
  singularSpecific: 'postnummeret',
  plural: 'postnumre',
  prefix: 'postnummer',
  entity: 'dagi_postnummer',
  table: 'dagi_postnumre',
  primaryKey: ['nr'],
  published: false,
  fields: [
    {
      name: 'dagi_id',
      type: 'string',
      sqlType: 'INTEGER',
      nullable: true,
      description: 'Unik ID',
      formatter: numberToString
    },
    {
      name: 'nr',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Postnummeret. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Postnummerets navn.'
    }],
  tilknytningKey: ['postnummer'],
  useNearestForAdgangsadresseMapping: false
}, {
  singular: 'landpostnummer',
  singularSpecific: 'landpostnummeret',
  plural: 'landpostnumre',
  prefix: 'landpostnummer',
  entity: 'landpostnummer',
  table: 'landpostnumre',
  primaryKey: ['nr'],
  published: false,
  withoutTilknytninger: true,
  fields: [
    {
      name: 'nr',
      type: 'string',
      formatter: kode4String,
      sqlType: "SMALLINT",
      nullable: false,
      schema: commonSchemaDefinitions.kode4,
      description: 'Postnummeret. 4 cifre.'
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Postnummerets navn.'
    }],
}, {
  singular: 'zone',
  singularSpecific: 'zonen',
  plural: 'zoner',
  prefix: 'zone',
  primaryKey: ['zone'],
  published: false,
  fields: [{
    name: 'zone',
    type: 'string',
    nullable: false,
    sqlType: 'SMALLINT',
    description: '"Byzone", "Sommerhusområde" eller "Landzone".',
    schema: commonSchemaDefinitions.Zone,
    formatter: zoneKodeFormatter
  }
  ],
  tilknytningKey: ['zone'],
  customTilknytningView: true
}, {
  singular: 'valglandsdel',
  singularSpecific: 'valglandsdelen',
  plural: 'valglandsdele',
  prefix: 'valglandsdels',
  primaryKey: ['bogstav'],
  published: true,
  searchable: true,
  fields: [
    {
      name: 'bogstav',
      type: 'string',
      sqlType: 'CHAR(1)',
      nullable: false,
      description: 'Valgslandsdelens bogstav, udgør nøglen.',
      schema: commonSchemaDefinitions.ValglandsdelBogstav
    }, {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Valglandsdelens navn.'
    }],
  tilknytningKey: ['valglandsdelsbogstav'],
  useNearestForAdgangsadresseMapping: true,
  deriveTsv: table => `to_tsvector('adresser', ${table}.bogstav || ' ' || ${table}.navn)`
}, {
  singular: 'storkreds',
  singularSpecific: 'storkredsen',
  plural: 'storkredse',
  prefix: 'storkreds',
  primaryKey: ['nummer'],
  published: true,
  searchable: true,
  fields: [
    {
      name: 'nummer',
      type: 'string',
      sqlType: 'SMALLINT',
      description: 'Storkredsens nummer. Heltal. Udgør nøglen.',
      formatter: nummer => {
        return '' + nummer;
      }
    },
    {
      name: 'navn',
      type: 'string',
      nullable: false,
      description: 'Storkredsens navn.'
    },
    {
      name: 'regionskode',
      type: 'string',
      nullable: true,
      sqlType: 'SMALLINT',
      formatter: kode4String,
      description: 'Koden på den region som storkredsen ligger i.'
    },
    {
      name: 'valglandsdelsbogstav',
      type: 'string',
      nullable: true,
      sqlType: 'char(1)',
      description: 'Bogstav for den valglandsdel, som storkredsen ligger i.'
    }],
  tilknytningKey: ['storkredsnummer'],
  useNearestForAdgangsadresseMapping: true,
  deriveTsv: table => `to_tsvector('adresser', ${table}.nummer || ' ' || ${table}.navn)`
},
  {
    singular: 'afstemningsområde',
    singularSpecific: 'afstemningsområdet',
    plural: 'afstemningsområder',
    prefix: 'afstemningsområde',
    primaryKey: ['kommunekode', 'nummer'],
    path: 'afstemningsomraader',
    published: true,
    searchable: true,
    table: 'afstemningsomraader',
    fields: [
      {
        name: 'dagi_id',
        type: 'string',
        sqlType: 'INTEGER',
        nullable: false,
        description: 'Unik ID',
        formatter: numberToString
      },
      {
        name: 'nummer',
        type: 'string',
        sqlType: 'SMALLINT',
        description: 'Afstemningsområdets nummer. Heltal.',
        formatter: nummer => {
          return '' + nummer;
        }
      },
      {
        name: 'navn',
        type: 'string',
        nullable: false,
        description: 'Afstemningsområdets navn.'
      },
      {
        name: 'afstemningsstednavn',
        type: 'string',
        nullable: false,
        description: 'Afstemningsstedets navn.'
      },
      {
        name: 'afstemningsstedadresse',
        type: 'string',
        sqlType: 'UUID',
        description: 'UUID for afstemningssstedets adgangsadresse.',
        nullable: true
      },
      {
        name: 'kommunekode',
        type: 'string',
        sqlType: 'SMALLINT',
        formatter: kode4String,
        description: 'Kommunekoden for den kommune, som afstemningsmrådet ligger i.'
      },
      {
        name: 'opstillingskreds_dagi_id',
        type: 'string',
        sqlType: 'INTEGER',
        formatter: numberToString,
        description: 'DAGI id for opstillingskredsen, som afstemningsområdet tilhører'
      }
      ],
    tilknytningKey: ['kommunekode', 'afstemningsområdenummer'],
    tilknytningTable: 'afstemningsomraadetilknytninger',
    useNearestForAdgangsadresseMapping: true,
    deriveTsv: table => `to_tsvector('adresser', ${table}.nummer || ' ' || ${table}.navn)`

  },
  {
    singular: 'menighedsrådsafstemningsområde',
    singularSpecific: 'menighedsrådsafstemningsområdet',
    plural: 'menighedsrådsafstemningsområder',
    prefix: 'menighedsrådsafstemningsområde',
    primaryKey: ['kommunekode', 'nummer'],
    published: true,
    searchable: true,
    path: 'menighedsraadsafstemningsomraader',
    table: 'menighedsraadsafstemningsomraader',
    fields: [
      {
        name: 'dagi_id',
        type: 'string',
        sqlType: 'INTEGER',
        nullable: false,
        description: 'Unik ID',
        formatter: numberToString
      },
      {
        name: 'nummer',
        type: 'string',
        sqlType: 'SMALLINT',
        nullable: false,
        formatter: nummer => {
          return '' + nummer;
        },
        description: 'Menighedsrådsafstemningsområdets nummer. Udgør nøglen.'
      },
      {
        name: 'navn',
        type: 'string',
        nullable: false,
        description: 'Menighedsrådsafstemningsområdets navn.'
      },
      {
        name: 'afstemningsstednavn',
        type: 'string',
        nullable: false,
        description: 'Afstemningsstedets navn'
      },
      {
        name: 'kommunekode',
        type: 'string',
        sqlType: 'SMALLINT',
        nullable: false,
        formatter: kode4String,
        description: 'Kommunekoden for den kommune, som menighedsrådsafstemningsmrådet tilhører.'
      },
      {
        name: 'sognekode',
        type: 'string',
        sqlType: 'SMALLINT',
        nullable: false,
        formatter: kode4String,
        description: 'Sognekoden for det sogn, som menighedsrådsafstemningsområdet tilhører.'
      }
    ],
    tilknytningKey: ['kommunekode', 'menighedsrådsafstemningsområdenummer'],
    tilknytningTable: 'menighedsraadsafstemningsomraadetilknytninger',
    useNearestForAdgangsadresseMapping: true,
    deriveTsv: table => `to_tsvector('adresser', ${table}.nummer || ' ' || ${table}.navn)`
  },
  {
    singular: 'supplerendebynavn',
    singularSpecific: 'det supplerende bynavn',
    plural: 'supplerendebynavne',
    prefix: 'supplerendebynavn',
    primaryKey: ['dagi_id'],
    published: true,
    path: 'supplerendebynavne2',
    searchable: true,
    table: 'dagi_supplerendebynavne',
    fields: [
      {
        name: 'dagi_id',
        type: 'string',
        nullable: false,
        sqlType: 'INTEGER',
        description: 'Unik ID',
        formatter: numberToString
      },
      {
        name: 'navn',
        type: 'string',
        nullable: false,
        description: 'Det supplerende bynavns navn.'
      },
      {
        name: 'kommunekode',
        type: 'string',
        sqlType: 'SMALLINT',
        nullable: false,
        formatter: kode4String,
        description: 'Kommunekoden for den kommune, som det supplerende bynavn tilhører.'
      }
    ],
    tilknytningKey: ['dagi_id'],
    tilknytningTable: 'supplerendebynavntilknytninger',
    useNearestForAdgangsadresseMapping: false,
    deriveTsv: table => `to_tsvector('adresser', ${table}.navn)`

  }
];

for (let model of exports.modelList) {
  model.table = model.table || model.plural;
  model.entity = model.entity || model.singular;
  model.fields = model.fields.map(field => {
    field.sqlType = field.sqlType || defaultSqlType[field.type];
    field.schema = field.schema || defaultSchema(field.type, field.nullable);
    return field;
  });
  model.tilknytningName = model.prefix + 'tilknytning';
  model.tilknytningTable = model.tilknytningTable || model.tilknytningName + 'er';
  model.tilknytningPlural = model.tilknytningName + 'er';
  model.tilknytningFields = [{
    name: 'adgangsadresseid',
    type: 'uuid',
    nullable: false,
    description: 'Adgangsadressens ID.',
  },
    ..._.zip(model.primaryKey, model.tilknytningKey).map(([primaryKeyCol, tilknytningKeyCol]) => {
      const field = _.findWhere(model.fields, {name: primaryKeyCol});
      return Object.assign({}, field, {name: tilknytningKeyCol});
    })
  ]
}

exports.modelMap = _.indexBy(exports.modelList, 'singular');

exports.toTableModel = temaModel => {
  return {
    table: temaModel.table,
    entity: temaModel.entity,
    primaryKey: temaModel.primaryKey,
    columns: [...temaModel.fields.map(additionalField => ({
      name: additionalField.name
    })),
      {
        name: 'ændret'
      },
      {
        name: 'geo_ændret'
      },
      {
        name: 'geo_version'
      },
      ...(temaModel.searchable ? [{
        name: 'tsv',
        derive: temaModel.deriveTsv
      }] : []),
      {
        name: 'geom',
        distinctClause: geomDistinctClause
      },
      {
        name: 'bbox',
        derive: table => `st_envelope(${table}.geom)`
      }, {
        name: 'visueltcenter'
      }]
  }
};

exports.toTilknytningTableModel = temaModel => {
  return {
    table: temaModel.tilknytningTable,
    entity: temaModel.tilknytningName,
    primaryKey: ['adgangsadresseid', ...temaModel.tilknytningKey],
    columns: [
      {name: 'adgangsadresseid'},
      ...temaModel.tilknytningKey.map(name => ({name}))
    ]
  };
};

exports.toTilknytningMaterialization = temaModel => {
  return {
    table: temaModel.tilknytningTable,
    view: `${temaModel.tilknytningTable}_view`,
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresseid']
      }
    ],
    nonIncrementalDependents: [temaModel.table]
  }
};

exports.toReplikeringModel = temaModel => {
  return {
    key: [temaModel.primaryKey],
    attributes: [{
      name: 'ændret',
      type: 'string',
      schema: commonSchemaDefinitions.DateTimeUtc,
      description: 'Tidspunkt for seneste ændring i DAWA'
    }, {
      name: 'geo_ændret',
      type: 'string',
      schema: commonSchemaDefinitions.DateTimeUtc,
      description: 'Tidspunkt for seneste ændring af geometri i DAWA'
    }, {
      name: 'geo_version',
      type: 'integer',
      schema: {
        type: 'integer'
      },
      description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.'
    }, {
      name: 'bbox',

      type: 'bbox',
      schema: {
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'number'
        }
      },
      description: `Geometriens bounding box, dvs. det mindste rectangel som indeholder geometrien. Består af et array af 4 tal.
        De første to tal er koordinaterne for bounding boxens sydvestlige hjørne, og to to sidste tal er
        koordinaterne for bounding boxens nordøstlige hjørne.`
    },
      ...temaModel.fields.map(field => {
        return {
          name: field.name,
          type: field.type,
          schema: field.schema,
          description: field.description
        };
      })
    ]
  }

};
exports.toReplikeringTilknytningModel = temaModel => {
  const adgAdrAttr = {
    name: 'adgangsadresseid',
    type: 'uuid',
    description: 'Adgangsadressens id.'
  };
  const tilknytningTemaKeyFields = _.zip(temaModel.primaryKey, temaModel.tilknytningKey).map(([primaryKeyCol, tilknytningKeyCol]) => {
    const temaField = _.findWhere(temaModel.fields, {name: primaryKeyCol});
    return {
      name: tilknytningKeyCol,
      type: temaField.type,
      schema: temaField.schema,
      description: temaField.description
    };
  });
  const attributes = [adgAdrAttr, ...tilknytningTemaKeyFields];
  return {
    key: ['adgangsadresseid', ...temaModel.tilknytningKey],
    attributes: attributes
  }
};

exports.toReplikeringTilknytningDbBinding = temaModel => {
  return {
    path: `/replikering/${temaModel.tilknytningPlural}`,
    table: temaModel.tilknytningTable,
    legacyResource: true,
    attributes: temaModel.tilknytningFields.reduce((memo, tilknytningField) => {
      const attr = {};
      if (tilknytningField.formatter) {
        attr.formatter = tilknytningField.formatter;
      }
      if (tilknytningField.selectTransform) {
        attr.selectTransform = tilknytningField.selectTransform;
      }
      memo[tilknytningField.name] = attr;
      return memo;
    }, {})
  }
};