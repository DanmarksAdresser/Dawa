const _ = require('underscore');

// const SAMPLE_TILKNYTNING_MODEL = {
//   relationTable: 'jordstykker_adgadr',
//   relatedTable: 'jordstykker',
//   relationKey: ['ejerlavkode', 'matrikelnr'],
//   relatedKey: ['ejerlavkode', 'matrikelnr'],
//   adgangsadresseIdColumn: ['adgangsadresse_id'],
//   useNearest: false,
//   forceUnique: true
// };

const generateTilknytningMatView = (tilknytningModel) => {
  const {relationTable, relatedTable, relationKey, relatedKey, adgangsadresseIdColumn, useNearest, forceUnique} = tilknytningModel;
  const viewName = `${relationTable}_view`;
  let sql = `DROP VIEW IF EXISTS ${viewName};\n`;
  const selectRelatedKeyClause =
    _.zip(relatedKey, relationKey).map(([temaKeyName, tilknytningKeyName]) =>
      `related.${temaKeyName} AS ${tilknytningKeyName}`).join(', ');
  const selectKeyClause = `a.id AS ${adgangsadresseIdColumn},  ${selectRelatedKeyClause}`;
  if (useNearest) {
    sql += `CREATE VIEW ${viewName} AS (SELECT ${selectKeyClause}
        FROM adgangsadresser_mat a
        JOIN LATERAL (
        SELECT ${relatedKey.join(', ')} 
        FROM ${relatedTable} related 
        ORDER BY a.geom <-> related.geom LIMIT 1) related ON true);`;
  }
  else if (forceUnique) {
    sql += `CREATE VIEW ${viewName} AS (SELECT ${selectKeyClause}
        FROM adgangsadresser_mat a
        JOIN LATERAL (
        SELECT ${relatedKey.join(', ')} 
        FROM ${relatedTable} related 
        WHERE ST_Covers(related.geom, a.geom) 
        LIMIT 1) related ON true);`
  }
  else {
    sql += `CREATE VIEW ${viewName} AS (SELECT ${selectKeyClause}
        FROM adgangsadresser_mat a
        JOIN LATERAL (
        SELECT distinct ${relatedKey.join(', ')} 
        FROM ${relatedTable} related 
        WHERE ST_Covers(related.geom, a.geom)) related ON true);`
  }
  return sql;
};

module.exports = {
  generateTilknytningMatView
};