const _ = require('underscore');

const commonSchemaDefinitions = require('../apiSpecification/commonSchemaDefinitions');
const {kode4String, zoneKodeFormatter} = require('../apiSpecification/util');

const defaultSqlType = {
  string: 'text',
  integer: 'integer'
};

const defaultSchema = (type, nullable) => {
  if(nullable) {
    return {type: [type, 'null']};
  }
  else {
    return {type};
  }
};

const geomDistinctClause = (a, b) => `${a} IS DISTINCT FROM ${b} OR NOT ST_Equals(${a}, ${b})`;
const kodeNavnDeriveTsv = (table => `to_tsvector('adresser', ${table}.kode || ' ' || ${table}.navn)`);

exports.modelList = [{
  singular: 'region',
  singularSpecific: 'regionen',
  plural: 'regioner',
  prefix: 'regions',
  primaryKey: ['kode'],
  published: true,
  searchable: true,
  deriveTsv: kodeNavnDeriveTsv,
  fields: [{
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
  fields: [{
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
  fields: [{
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
  fields: [{
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
  fields: [{
    name: 'kode',
    type: 'string',
    formatter: kode4String,
    sqlType: "SMALLINT",
    nullable: false,
    schema: commonSchemaDefinitions.kode4,
    description: 'Opstillingskredsens kode. Er unik for hver opstillingskreds. 4 cifre.'
  }, {
    name: 'navn',
    type: 'string',
    nullable: false,
    description: 'Opstillingskredsens navn.'
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
  fields: [{
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
  useNearestForAdgangsadresseMapping: true
}, {
  singular: 'valglandsdel',
  singularSpecific: 'valglandsdelen',
  plural: 'valglandsdele',
  prefix: 'valglandsdels',
  primaryKey: ['bogstav'],
  published: true,
  searchable: true,
  fields: [{
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
  fields: [{
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
    }],
  tilknytningKey: ['storkredsnummer'],
  useNearestForAdgangsadresseMapping: true,
  deriveTsv: table => `to_tsvector('adresser', ${table}.nummer || ' ' || ${table}.navn)`
}];

for (let model of exports.modelList) {
  model.table = model.table || model.plural;
  model.entity = model.entity || model.singular;
  model.fields = model.fields.map(field => {
    field.sqlType = field.sqlType || defaultSqlType[field.type];
    field.schema = field.schema || defaultSchema(field.type, field.nullable);
    return field;
  });
  model.tilknytningName = model.prefix + 'tilknytning';
  model.tilknytningTable = model.tilknytningName + 'er';
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
      if(tilknytningField.formatter) {
        attr.formatter = tilknytningField.formatter;
      }
      if(tilknytningField.selecttransform) {
        attr.selectTransform = tilknytningField.selectTransform;
      }
      memo[tilknytningField.name] = attr;
      return memo;
    }, {})
  }
};