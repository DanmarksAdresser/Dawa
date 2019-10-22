const tableModels = require("./table-models");
const grbbrModels = require('./parse-ea-model');
const additionalIndices = require('./indices');
const {geojsonFields} = require('../apiSpecification/bbr/common');

const generateSqlForTable = (grbbrModel, temporality) => {
  const historyColSpec = [`rowkey integer not null`, `virkning tstzrange not null`];
  const bitemporalColSpec = [...historyColSpec, `registrering tstzrange not null`];
  const additionalCols = {
    'bi': bitemporalColSpec,
    'history': historyColSpec,
    'current': []
  };
  const primaryKeyClause = {
    'bi': 'PRIMARY KEY(rowkey)',
    'history': 'PRIMARY KEY(rowkey)',
    'current': 'PRIMARY KEY(id)'
  };
  const indices = {
    'bi': ['id'],
    history: ['id', 'lower(virkning)', 'upper(virkning)'],
    current: ['kommunekode', 'status']
  };
  const attrs = grbbrModel.attributes;
  const allColSpecs = [...additionalCols[temporality], ...attrs.map(attr => `${attr.binding.column} ${attr.sqlType}`)];
  const tableModel = tableModels.getTableModel(grbbrModel.name, temporality);
  const indicesSql = indices[temporality].map(indexCols => `CREATE INDEX ON ${tableModel.table}(${indexCols})`).join(';\n');
  const additionalIndicesSql = temporality === 'current' ?
      additionalIndices
          .filter(index => index.entity === grbbrModel.name)
          .map(index => `CREATE INDEX ON ${tableModel.table}(${index.columns.join(',')})`).join(`;\n`)
      : '';
  const geomIndexSql = geojsonFields[grbbrModel.name] ?
      `;\nCREATE INDEX ON ${tableModel.table} USING GIST(${geojsonFields[grbbrModel.name]})` : '';
  return `DROP TABLE IF EXISTS ${tableModel.table} CASCADE;   
CREATE TABLE ${tableModel.table}(
    ${allColSpecs.join(',\n')},
    ${primaryKeyClause[temporality]});
    ${indicesSql};
  ${additionalIndicesSql}
  ${geomIndexSql}`;
};

const temporalities = ['bi', 'history', 'current'];

const tableSql = temporalities.map((temporality) => {
  return grbbrModels.map(grbbrModel => generateSqlForTable(grbbrModel, temporality)).join(';\n')
}).join(';\n');

module.exports = {
  tableSql,

};

