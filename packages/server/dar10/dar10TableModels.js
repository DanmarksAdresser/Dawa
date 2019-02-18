"use strict";

const _ = require('underscore');

const spec = require('./spec');

const schemas = spec.schemas;

const standardFields = ['rowkey', 'id', 'eventopret', 'eventopdater', 'status', 'registreringfra', 'registreringtil', 'virkningfra', 'virkningtil'];

const geomDistinctClause = (a, b) => `${a} IS DISTINCT FROM ${b} OR NOT ST_Equals(${a}, ${b})`;

const distinctClauses = {
  NavngivenVej: {
    vejnavnebeliggenhed_vejnavnelinje: geomDistinctClause,
    vejnavnebeliggenhed_vejnavneområde: geomDistinctClause,
    vejnavnebeliggenhed_vejtilslutningspunkter: geomDistinctClause
  }
};

const standardColumns = [
  {
    name: 'rowkey',
    sqlType: 'integer',
    nullable: false
  },
  {
    name: 'id',
    sqlType: 'uuid',
    nullable: false
  },
  {
    name: 'eventopret',
    sqlType: 'integer',
    nullable: true
  },
  {
    name: 'eventopdater',
    sqlType: 'integer',
    nullable: true
  },
  {
    name: 'registrering',
    sqlType: 'tstzrange',
    nullable: false
  },
  {
    name: 'virkning',
    sqlType: 'tstzrange',
    nullable: false
  },
  {
    name: 'status',
    sqlType: 'smallint',
    nullable: false
  }
];

/**
 * SQL type overrides.
 */
const sqlTypeOverrides = spec.sqlTypes;


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
  if (distinctClauses[entityName]) {
    for (let column of allColumns) {
      if (distinctClauses[entityName][column.name]) {
        column.distinctClause = distinctClauses[entityName][column.name];
      }
    }
  }
  const tableModel = {
    table: `dar1_${entityName}`,
    entity: `dar1_${entityName}_raw`,
    primaryKey: ['rowkey'],
    columns: allColumns
  };
  memo[entityName] = tableModel;
  return memo;
}, {});

const fieldsExcludedFromHistory = {
  Husnummer: ['adgangsadressebetegnelse'],
  Adresse: ['adressebetegnelse']
};

exports.historyTableModels = entityNames.reduce((memo, entityName) => {
  const rawTableModel = exports.rawTableModels[entityName];
  const excludedFields = ['registrering', 'eventopret', 'eventopdater', ...(fieldsExcludedFromHistory[entityName] || [])];
  memo[entityName] = {
    table: `dar1_${entityName}_history`,
    entity: `dar1_${entityName.toLowerCase()}_historik`,
    primaryKey: ['rowkey'],
    columns: rawTableModel.columns.filter(column => !(excludedFields.includes(column.name)))
  };
  return memo;
}, {});

exports.currentTableModels = entityNames.reduce((memo, entityName) => {
  memo[entityName] = {
    table: `dar1_${entityName}_current`,
    entity: `dar1_${entityName.toLowerCase()}_aktuel`,
    primaryKey: ['id'],
    columns: exports.historyTableModels[entityName].columns.filter(column => !['virkning', 'rowkey'].includes(column.name))
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

const vejpunktMaterialization = {
  table: 'vejpunkter',
  view: 'dar1_vejpunkter_view',
  dependents: [
    {
      table: 'dar1_Adressepunkt_current',
      columns: ['id']
    },
    {
      table: 'adgangsadresser',
      columns: ['husnummerid']
    }
  ]
};

exports.dawaMaterializations = {
  navngivenvej_postnummer: navngivenvejPostnummerMaterialization,
  vejpunkt: vejpunktMaterialization
};