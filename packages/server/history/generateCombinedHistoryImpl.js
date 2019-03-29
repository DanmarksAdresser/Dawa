const { go } = require('ts-csp');
const { mergeValidTime, processAdgangsadresserHistory, processAdresserHistory, createVejstykkerPostnumreHistory,
adgAdrCols, adrCols} = require('./common');
const generateHistoryImplDar09 = require('./generateHistoryImplDar09');
const generateHistoryImplDar1 = require('./generateHistoryImplDar1');
const logger = require('@dawadk/common/src/logger').forCategory('generateHistory');
const tableSchema = require('../psql/tableModel');
const { computeDifferences, applyChanges } = require('@dawadk/import-util/src/table-diff');


const generateHistory = (client, txid, dar1CutoffDate) => go(function*(){
  yield client.query(`CREATE TEMP TABLE vask_adgangsadresser_unmerged as (select ${adgAdrCols.join(',')}, null::integer as hn_id, virkning from vask_adgangsadresser where false)`);
  yield client.query(`CREATE TEMP TABLE vask_adresser_unmerged as (select ${adrCols}, null::integer as dar_id, virkning from vask_adresser)`);
  logger.info('Generating DAR 0.9 history');
  yield generateHistoryImplDar09.generateHistory(client, dar1CutoffDate, 'vask_adgangsadresser_unmerged', 'vask_adresser_unmerged');
  logger.info('Generating DAR 1.0 history');
  yield generateHistoryImplDar1.generateHistory(client, dar1CutoffDate, 'vask_adgangsadresser_unmerged', 'vask_adresser_unmerged');
  logger.info('Merging histories');
  yield mergeValidTime(client, 'vask_adgangsadresser_unmerged', 'vask_adgangsadresser_merged', ['id'],
    adgAdrCols);
  yield mergeValidTime(client, 'vask_adresser_unmerged', 'vask_adresser_merged', ['id'],
    adrCols);
  yield client.query('ALTER TABLE vask_adgangsadresser_merged ADD COLUMN rowkey integer');
  yield client.query(`UPDATE vask_adgangsadresser_merged desired SET rowkey = actual.rowkey
     FROM vask_adgangsadresser actual WHERE desired.id = actual.id AND lower(desired.virkning) IS NOT DISTINCT FROM lower(actual.virkning)`);
  yield client.query(`UPDATE vask_adgangsadresser_merged SET rowkey = nextval('rowkey_sequence') WHERE rowkey IS NULL`);
  yield computeDifferences(client, txid, 'vask_adgangsadresser_merged', tableSchema.tables.vask_adgangsadresser);
  yield applyChanges(client, txid, tableSchema.tables.vask_adgangsadresser);

  yield client.query('ALTER TABLE vask_adresser_merged ADD COLUMN rowkey integer');
  yield client.query(`UPDATE vask_adresser_merged desired SET rowkey = actual.rowkey
     FROM vask_adresser actual WHERE desired.id = actual.id AND lower(desired.virkning) IS NOT DISTINCT FROM lower(actual.virkning)`);
  yield client.query(`UPDATE vask_adresser_merged SET rowkey = nextval('rowkey_sequence') WHERE rowkey IS NULL`);
  yield computeDifferences(client, txid, 'vask_adresser_merged', tableSchema.tables.vask_adresser);
  yield applyChanges(client, txid, tableSchema.tables.vask_adresser);
  logger.info('Processing adgangsadresser');
  yield processAdgangsadresserHistory(client);
  logger.info('Processing adresser');
  yield processAdresserHistory(client);
  logger.info('Creating VejstykkerPostnumreHistory');
  yield createVejstykkerPostnumreHistory(client);
});

module.exports = {generateHistory};
