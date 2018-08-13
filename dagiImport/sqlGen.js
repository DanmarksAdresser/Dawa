const _ = require('underscore');

const temaModels = require('./temaModels');
const { generateTilknytningMatView } = require('../importUtil/tilknytningUtil');

const generateTemaTableSql = temaModel => {
  const additionalFieldsSqls = temaModel.fields.map(field => `${field.name} ${field.sqlType}${field.nullable ? '' : ' NOT NULL'}`);
  const primaryKeyColsSql = temaModel.primaryKey.map(primaryKey => {
    const field = _.findWhere(temaModel.fields, {name: primaryKey});
    return `${field.name} ${field.sqlType}${field.nullable ? '' : ' NOT NULL'}`;
  });
  const primaryKeySql = `PRIMARY KEY (${temaModel.primaryKey.join(', ')})`;
  const temaTable = `
DROP TABLE IF EXISTS  ${temaModel.table} CASCADE;
CREATE TABLE ${temaModel.table}(
  ${additionalFieldsSqls.join(',\n')},
  ændret timestamptz NOT NULL,
  geo_version integer NOT NULL,
  geo_ændret timestamptz NOT NULL,
  geom geometry(MultiPolygon, 25832),
  bbox geometry(polygon, 25832),
  visueltcenter geometry(point, 25832),
  tsv tsvector,
  ${primaryKeySql}
);`
  const temaChangeTable = `
DROP TABLE IF EXISTS ${temaModel.table}_changes CASCADE;
CREATE TABLE ${temaModel.table}_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, ${temaModel.table}.* FROM ${temaModel.table} WHERE false);
CREATE INDEX ON ${temaModel.table}_changes(txid);
`;
  const dividedTable =`
DROP TABLE IF EXISTS ${temaModel.table}_divided CASCADE;
CREATE TABLE ${temaModel.table}_divided(
  ${primaryKeyColsSql.join(',\n')},
  geom geometry(geometry, 25832)
);

CREATE INDEX ON ${temaModel.table}_divided USING GIST(geom);
CREATE INDEX ON ${temaModel.table}_divided(${temaModel.primaryKey.join(', ')});
  `;
  let sql = `
${temaTable}
${temaChangeTable}
${dividedTable}`;
  if (!temaModel.withoutTilknytninger) {
    const tilknytningKeySqls = _.zip(temaModel.tilknytningKey, temaModel.primaryKey).map(([tilknytningKeyName, primaryKeyName]) => {
      const field = _.findWhere(temaModel.fields, {name: primaryKeyName});
      return `${tilknytningKeyName} ${field.sqlType}`;
    });
    const tilknytningTable = `
DROP TABLE IF EXISTS  ${temaModel.tilknytningTable} CASCADE;
CREATE TABLE ${temaModel.tilknytningTable}(
  adgangsadresseid uuid not null,
  ${tilknytningKeySqls.join(',\n')},
  primary key(adgangsadresseid, ${temaModel.tilknytningKey.join(', ')})
);
CREATE INDEX ON ${temaModel.tilknytningTable}(${temaModel.tilknytningKey.join(', ')}, adgangsadresseid);
`;
    const tilknytningChangeTable = `
DROP TABLE IF EXISTS ${temaModel.tilknytningTable}_changes CASCADE;
CREATE TABLE ${temaModel.tilknytningTable}_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, ${temaModel.tilknytningTable}.* FROM ${temaModel.tilknytningTable} WHERE false);
CREATE INDEX ON ${temaModel.tilknytningTable}_changes(adgangsadresseid, ${temaModel.tilknytningKey.join(', ')}, changeid DESC NULLS LAST);
CREATE INDEX ON ${temaModel.tilknytningTable}_changes(${temaModel.tilknytningKey.join(', ')});
CREATE INDEX ON ${temaModel.tilknytningTable}_changes(changeid DESC NULLS LAST);
CREATE INDEX ON ${temaModel.tilknytningTable}_changes(txid);
`;
    sql +=
      `${tilknytningTable}
${tilknytningChangeTable}`
  }
  return sql;
};

const generateAllTemaTables = () => temaModels.modelList.reduce((memo, temaModel) => memo + '\n' + generateTemaTableSql(temaModel), '');

const generateZoneTilknytningView = () => {
  return`DROP VIEW IF EXISTS zonetilknytninger_view;
  CREATE VIEW zonetilknytninger_view AS (SELECT a.id AS adgangsadresseid,  coalesce(zone, 2) as zone
        FROM adgangsadresser_mat a
        LEFT JOIN LATERAL (
        SELECT zone
        FROM zoner_divided related 
        WHERE ST_Covers(related.geom, a.geom) 
        ORDER BY zone
        LIMIT 1) related ON true);`

};

const generateTilknytningMatViews = () =>  {
  let sql ='';
  for (let temaModel of temaModels.modelList) {
    if(!temaModel.withoutTilknytninger && !temaModel.customTilknytningView) {
      const tilknytningModel = {
        relatedTable: `${temaModel.table}_divided`,
        relationTable: temaModel.tilknytningTable,
        relatedKey: temaModel.primaryKey,
        relationKey: temaModel.tilknytningKey,
        adgangsadresseIdColumn: 'adgangsadresseid',
        useNearest: temaModel.useNearestForAdgangsadresseMapping,
        forceUnique: true
      };
      sql += generateTilknytningMatView(tilknytningModel);
    }
  }
  sql += generateZoneTilknytningView();

  return sql;
};

const generateTemaTable = temaNavn => {
  const model = temaModels.modelMap[temaNavn];
  return generateTemaTableSql(model);
}
module.exports = {
  generateAllTemaTables,
  generateTilknytningMatViews,
  generateTemaTable
};