const { go } = require('ts-csp');
const _ = require('underscore');

const tableModels = require('../../psql/tableModel');
const materialize = require('@dawadk/import-util/src/materialize');

module.exports = {
  description: 'Legacy supplerende bynavn API opslagstabeller',
  execute:  (client, txid) => go(function*() {
    const tsvCol = _.findWhere(tableModels.tables.supplerendebynavne_mat.columns, {name: 'tsv'});
    yield client.query(`DELETE FROM supplerendebynavne_mat;
  INSERT INTO supplerendebynavne_mat(navn, tsv)
  (SELECT DISTINCT ON(navn) navn, ${tsvCol.derive('v')}
  FROM supplerendebynavne_mat_view v)`);
    yield client.query('DELETE FROM supplerendebynavn_kommune_mat;' +
      'INSERT INTO supplerendebynavn_kommune_mat(supplerendebynavn, kommunekode)' +
      '(SELECT supplerendebynavn, kommunekode from supplerendebynavn_kommune_mat_view)');
    yield client.query('DELETE FROM supplerendebynavn_postnr_mat;' +
      'INSERT INTO supplerendebynavn_postnr_mat(supplerendebynavn, postnr)' +
      '(SELECT supplerendebynavn, postnr from supplerendebynavn_postnr_mat_view)');
    yield materialize.recomputeMaterialization(client, txid, tableModels.tables, tableModels.materializations.supplerendebynavn2_postnr);
  })
};