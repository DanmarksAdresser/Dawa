"use strict";

const _ = require('underscore');

const spec = require('./spec');

const schemas = spec.schemas;
const sqlTypes = spec.sqlTypes;
const { getChangeTableSql } = require('../importUtil/tableDiffNg');
const tableSchema = require('../psql/tableModel');


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
module.exports = () => {
  const ddlStatements = entityNames.map(entityName => {
    const schema = schemas[entityName];
    const properties = schema.properties;
    const columnNames = Object.keys(properties);
    const nonStandardColumnNames = _.difference(columnNames, standardFields);
    const nonStandardColumns = nonStandardColumnNames.map(columnName => {
      const schemaDef = properties[columnName];
      const nullable = _.isArray(schemaDef.type) && _.contains(schemaDef.type, 'null');
      const nonDefaultSqlType = sqlTypes[entityName] && sqlTypes[entityName][columnName];
      const sqlType = nonDefaultSqlType || defaultSqlType(schemaDef);
      return {
        name: columnName,
        type: sqlType,
        nullable: nullable
      };
    });
    const columns = standardColumns.concat(nonStandardColumns);
    const columnSql = columns.map(column => {
      let sql = `${column.name} ${column.type}`;
      if (!column.nullable) {
        sql += ' NOT NULL';
      }
      if (column.primaryKey) {
        sql += ' PRIMARY KEY';
      }
      return sql;
    });

    const indicesSpec = spec.sqlIndices[entityName] || [];
    const eventIndex = `CREATE INDEX ON dar1_${entityName}(GREATEST(eventopret, eventopdater))`;
    let historyIndices = '';
    if(spec.sqlIndicesHistory[entityName]) {
      historyIndices = spec.sqlIndicesHistory[entityName].map(index => {
        return `CREATE INDEX ON dar1_${entityName}(${index.join(', ')})`
      }).join(';') + ';';
    }
    const virkningIndices = `CREATE INDEX ON dar1_${entityName}(lower(virkning)); CREATE INDEX ON dar1_${entityName}(upper(virkning));`;
    const indicesSql = virkningIndices + '\n' + eventIndex + ';\n' + historyIndices + '\n' + indicesSpec.map(indexSpec => `CREATE INDEX ON dar1_${entityName}_current(${indexSpec.join(',')});`).join('\n');
    return `DROP TABLE IF EXISTS dar1_${entityName} CASCADE;\n\
CREATE TABLE dar1_${entityName}(\n  ${columnSql.join(',\n  ')}\n);\
DROP TABLE IF EXISTS dar1_${entityName}_current CASCADE;\n\
CREATE TABLE dar1_${entityName}_current(\n  ${columnSql.join(',\n  ')}\n);\n\
CREATE INDEX ON dar1_${entityName}_current(id);\n` + indicesSql + '\n' +
      getChangeTableSql(tableSchema.tables[`dar1_${entityName}`]) +
      getChangeTableSql(tableSchema.tables[`dar1_${entityName}_current`]);
  });


  return ddlStatements.join('\n\n');
};
