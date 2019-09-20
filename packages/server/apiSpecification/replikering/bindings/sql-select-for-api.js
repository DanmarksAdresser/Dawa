const defmulti = require('@dawadk/common/src/defmulti');
const selectForReplication = require('./sql-select');
const {geojsonColumn} = require('../../common/sql/postgisSqlUtil');

const aliasedColumn = (column, alias) => alias ? `${alias}.${column}` : column;

const sqlSelectForApi = defmulti((binding) => binding.type);

sqlSelectForApi.defaultMethod((binding, alias) => selectForReplication(binding, alias));

const selectGeojsonColumnFn = ({column}, alias, {srid, sridAlias}) => {
  const result = [[geojsonColumn(srid, sridAlias, aliasedColumn(column, alias)), column]];
  return result;
}
sqlSelectForApi.method('geometry', selectGeojsonColumnFn );
sqlSelectForApi.method('offloadedGeometry', selectGeojsonColumnFn );

module.exports = sqlSelectForApi;