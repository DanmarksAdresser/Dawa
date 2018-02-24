"use strict";

const _ = require('underscore');

const spec = require('./spec');

const schemas = spec.schemas;

const standardFields = ['rowkey', 'id', 'eventopret', 'eventopdater', 'status', 'registreringfra', 'registreringtil', 'virkningfra', 'virkningtil'];

const standardColumns = [
  {
    name: 'rowkey',
    type: 'integer',
    nullable: false,
    primaryKey: true
  },
  {
    name: 'id',
    type: 'uuid',
    nullable: false
  },
  {
    name: 'eventopret',
    type: 'integer',
    nullable: true
  },
  {
    name: 'eventopdater',
    type: 'integer',
    nullable: true
  },
  {
    name: 'registrering',
    type: 'tstzrange',
    nullable: false
  },
  {
    name: 'virkning',
    type: 'tstzrange',
    nullable: false
  },
  {
    name: 'status',
    type: 'smallint',
    nullable: false
  }
];

/**
 * SQL type overrides.
 */
const sqlTypeOverrides = {
  Adressepunkt: {
    position: 'geometry(Point,25832)'
  },
  Husnummer: {
    husnummertekst: 'husnr',
    husnummerretning: 'float4'
  },
  NavngivenVejKommunedel: {
    kommune: 'smallint',
    vejkode: 'smallint'
  },
  DARKommuneinddeling: {
    kommunekode: 'smallint'
  },
  Postnummer: {
    postnr: 'smallint'
  }
};


function defaultSqlType(jsonSchemaType) {
  if (jsonSchemaType.format === 'date-time') {
    return 'timestamptz';
  }
  if (jsonSchemaType.pattern === "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$") {
    return 'uuid';
  }
  if (jsonSchemaType.type === 'integer' || _.isArray(jsonSchemaType.type) && _.contains(jsonSchemaType.type, 'integer')) {
    return 'integer';
  }
  if (jsonSchemaType.type === 'string' || _.isArray(jsonSchemaType.type) && _.contains(jsonSchemaType.type, 'string')) {
    return 'text';
  }
  throw new Error('Could not get default sql type for ' + JSON.stringify(jsonSchemaType));
}


const entityNames = Object.keys(schemas);

exports.rawTableModels = entityNames.reduce((memo, entityName) => {
  const schema = schemas[entityName];
  const properties = schema.properties;
  const columnNames = Object.keys(properties);
  const nonStandardColumnNames = _.difference(columnNames, standardFields);
  const nonStandardColumns = nonStandardColumnNames.map(columnName => {
    const schemaDef = properties[columnName];
    const nullable = _.isArray(schemaDef.type) && _.contains(schemaDef.type, 'null');
    const nonDefaultSqlType = sqlTypeOverrides[entityName] && sqlTypeOverrides[entityName][columnName];
    const sqlType = nonDefaultSqlType || defaultSqlType(schemaDef);
    return {
      name: columnName,
      sqlType: sqlType,
      nullable: nullable
    };
  });
  const allColumns = [...standardColumns, ...nonStandardColumns];
  const tableModel = {
    table: `dar1_${entityName}`,
    entity: `dar1_${entityName}_raw`,
    primaryKey: ['rowkey'],
    columns: allColumns
  };
  memo[entityName] = tableModel;
  return memo;
}, {});

exports.currentTableModels = entityNames.reduce((memo, entityName) => {
  memo[entityName] = {
    table: `dar1_${entityName}_current`,
    entity: `dar1_${entityName}_current`,
    primaryKey: ['id'],
    columns: exports.rawTableModels[entityName].columns.slice()
  };
  return memo;
}, {});

exports.currentTableMaterializations = entityNames.reduce((memo, entityName) => {
  memo[entityName] = {
    table: `dar1_${entityName}_current`,
    view: `dar1_${entityName}_current_view`,
    dependents: [
      {
        table: `dar1_${entityName}`,
        columns: ['id'],
        references: ['id']
      }
    ]
  };
  return memo;
}, {});

const adgangsadresserMaterialization = {
  table: 'adgangsadresser',
  view: 'dar1_adgangsadresser_view',
  excludedColumns: ['ejerlavkode', 'matrikelnr', 'esrejendomsnr', 'hoejde', 'ikraftfra', 'placering', 'husnummerkilde', 'esdhreference', 'journalnummer'],
  dependents: [
    {
      table: 'dar1_Husnummer_current',
      columns: ['id']
    },
    {
      table: 'dar1_DARKommuneinddeling_current',
      columns: ['darkommuneinddeling_id']
    },
    {
      table: 'dar1_NavngivenVej_current',
      columns: ['navngivenvej_id']
    },
    {
      table: 'dar1_NavngivenVejKommunedel_current',
      columns: ['navngivenvejkommunedel_id']
    },
    {
      table: 'dar1_Postnummer_current',
      columns: ['postnummer_id']
    },
    {
      table: 'dar1_Adressepunkt_current',
      columns: ['adressepunkt_id']
    },
    {
      table: 'dar1_SupplerendeBynavn_current',
      columns: ['supplerendebynavn_id']
    }
  ]
};

const vejstykkerMaterialization = {
  table: 'vejstykker',
  view: 'dar1_vejstykker_view',
  excludedColumns: ['oprettet', 'aendret', 'geom'],
  dependents: [
    {
      table: 'dar1_NavngivenVej_current',
      columns: ['navngivenvej_id']
    },
    {
      table: 'dar1_NavngivenVejKommunedel_current',
      columns: ['navngivenvejkommunedel_id']
    }
  ]
};

const enhedsadresserMaterialization = {
  table: 'enhedsadresser',
  view: 'dar1_enhedsadresser_view',
  excludedColumns: ['ikraftfra', 'esdhreference', 'journalnummer', 'kilde'],
  dependents: [{
    table: 'dar1_Adresse_current',
    columns: ['id']
  }]
};

const navngivenvejPostnummerMaterialization = {
  table: 'navngivenvej_postnummer',
  view: 'dar1_navngivenvej_postnummer_view',
  dependents: [
    {
      table: 'dar1_NavngivenVejPostnummerRelation_current',
      columns: ['id']
    },
    {
      table: 'dar1_Postnummer_current',
      columns: ['postnummer_id']
    },
    {
      table: 'dar1_NavngivenVej_current',
      columns: ['navngivenvej_id']
    }
  ]
};

const vejstykkePostnummerMaterialization = {
  table: 'vejstykkerpostnumremat',
  view: 'dar1_vejstykkerpostnumremat_view',
  dependents: [
    {
      table: 'dar1_NavngivenVej_current',
      columns: ['navngivenvej_id']
    },
    {
      table: 'dar1_NavngivenVejKommunedel_current',
      columns: ['navngivenvejkommunedel_id']
    },
    {
      table: 'dar1_Postnummer_current',
      columns: ['postnummer_id']
    },
    {
      table: 'dar1_Husnummer_current',
      columns: ['husnummer_id']
    }
  ]
};

const navngivenvejMaterialiation = {
  table: 'navngivenvej',
  view: 'dar1_navngivenvej_view',
  dependents: [
    {
      table: 'dar1_NavngivenVej_current',
      columns: ['id']
    }
  ]
};

const vejpunktMaterialization = {
  table: 'vejpunkter',
  view: 'dar1_vejpunkter_view',
  dependents: [
    {
      table: 'dar1_Adressepunkt_current',
      columns: ['id']
    },
    {
      table: 'dar1_Husnummer_current',
      columns: ['husnummerid']
    }
  ]
};

exports.dawaMaterializations = {
  vejstykke: vejstykkerMaterialization,
  adgangsadresse: adgangsadresserMaterialization,
  adresse: enhedsadresserMaterialization,
  navngivenvej_postnummer: navngivenvejPostnummerMaterialization,
  vejstykke_postnummer: vejstykkePostnummerMaterialization,
  navngivenvej: navngivenvejMaterialiation,
  vejpunkt: vejpunktMaterialization
};