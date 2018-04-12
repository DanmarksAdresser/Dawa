const { go } = require('ts-csp');

const {streamCsvToTable} = require('../importUtil/importUtil');
const tableDiffNg = require('../importUtil/tableDiffNg');
const materialize = require('../importUtil/materialize');
const tableSchema = require('../psql/tableModel');
module.exports = (client, txid, filePath) => go(function*() {
  yield client.query('create temp table fetch_otilgang as (select * from otilgang where false)');
  const mapFn = (row) => {
    return {
      sdfe_id: parseInt(row.sdfe_id, 10),
      gv_adgang_bro: row.gv_adgang_bro,
      gv_adgang_faerge: row.gv_adgang_faerge,
      ikke_oe: row.ikke_oe,
      manually_checked: row.manually_checked,
      geom: `SRID=25832;${row.WKT}`
    };
  };
  yield streamCsvToTable(client, filePath, 'fetch_otilgang', ['sdfe_id', 'gv_adgang_bro', 'gv_adgang_faerge', 'ikke_oe', 'manually_checked', 'geom'], mapFn);
  yield tableDiffNg.computeDifferences(client, txid, `fetch_otilgang`, tableSchema.tables.otilgang);
  yield tableDiffNg.applyChanges(client, txid, tableSchema.tables.otilgang);
  yield materialize.recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.ikke_brofaste_oer);
  yield materialize.materializeDawa(client, txid);
});