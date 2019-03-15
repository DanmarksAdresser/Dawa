const defmulti = require('@dawadk/common/src/defmulti');

const {selectIsoDate: selectLocalDateTime, selectIsoDateUtc: selectIsoTimestampUtc} = require('../../common/sql/sqlUtil');

const selectSql = defmulti(binding => binding.type);

const aliasedColumn = (column, alias) => alias ? `${alias}.${column}` : column;

const simpleSqlSelect = ({attrName, column}, alias) => [[aliasedColumn(column, alias), attrName]];

selectSql.method('column', simpleSqlSelect);

selectSql.method('timestamp', ({attrName, column}, alias) =>
  [[selectIsoTimestampUtc(aliasedColumn(column, alias)), attrName]]);

selectSql.method('localTimestamp', ({attrName, column}, alias) =>
  [[selectLocalDateTime(aliasedColumn(column, alias)), attrName]]);

selectSql.method('geometry', ({attrName, column}, alias) =>
  [[`ST_AsGeoJSON(${aliasedColumn(column, alias)})`, attrName]]
);

selectSql.method('offloadedGeometry', ({attrName, column}, alias) =>
  [[`ST_AsGeoJSON(${aliasedColumn(column, alias)})`, attrName],
    [aliasedColumn(`${column}_blobref`, alias), `${attrName}_ref`]]
);

selectSql.method('kode4', simpleSqlSelect);

selectSql.method('husnr', simpleSqlSelect);

selectSql.method('darStatus', simpleSqlSelect);

selectSql.method('numberToString', simpleSqlSelect);
selectSql.method('stringToNumber', simpleSqlSelect);

selectSql.method('timestampInterval', ({attrName, column}, alias) => {
  return [

    [selectIsoTimestampUtc(`lower(${aliasedColumn(column, alias)})`), `${attrName}start`],
    [selectIsoTimestampUtc(`upper(${aliasedColumn(column, alias)})`), `${attrName}slut`]
  ]
});

selectSql.method('legacy', ({attrName, column, selectTransform}, alias) =>
  [[selectTransform(aliasedColumn(column, alias)), attrName]]
);

module.exports = selectSql;