const defmulti = require('@dawadk/common/src/defmulti');

const {selectIsoDate: selectLocalDateTime, selectIsoDateUtc: selectIsoTimestampUtc} = require('../../common/sql/sqlUtil');

const selectSql = defmulti(binding => binding.type);

const aliasedColumn = (column, alias) => alias ? `${alias}.${column}` : column;

const simpleSqlSelect = ({column}, alias) => [[aliasedColumn(column, alias), column]];

selectSql.method('column', simpleSqlSelect);

selectSql.method('timestamp', ({column}, alias) =>
  [[selectIsoTimestampUtc(aliasedColumn(column, alias)), column]]);

selectSql.method('localTimestamp', ({column}, alias) =>
  [[selectLocalDateTime(aliasedColumn(column, alias)), column]]);

selectSql.method('geometry', ({column}, alias) =>
  [[`ST_AsGeoJSON(${aliasedColumn(column, alias)})`, column]]
);

selectSql.method('offloadedGeometry', ({column}, alias) =>
  [[`ST_AsGeoJSON(${aliasedColumn(column, alias)})`, column],
    [aliasedColumn(`${column}_blobref`, alias), `${column}_ref`]]
);

selectSql.method('kode4', simpleSqlSelect);

selectSql.method('husnr', simpleSqlSelect);

selectSql.method('darStatus', simpleSqlSelect);

selectSql.method('numberToString', simpleSqlSelect);
selectSql.method('stringToNumber', simpleSqlSelect);

selectSql.method('timestampInterval', ({column}, alias) => {
  return [

    [selectIsoTimestampUtc(`lower(${aliasedColumn(column, alias)})`), `${column}start`],
    [selectIsoTimestampUtc(`upper(${aliasedColumn(column, alias)})`), `${column}slut`]
  ]
});

selectSql.method('legacy', ({column, selectTransform}, alias) =>
  [[selectTransform(aliasedColumn(column, alias)), column]]
);

module.exports = selectSql;