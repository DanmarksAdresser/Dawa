const { go } = require('ts-csp');
const { mergeValidTime, processAdgangsadresserHistory, processAdresserHistory, createVejstykkerPostnumreHistory,
adgAdrCols, adrCols} = require('./common');
const generateHistoryImplDar09 = require('./generateHistoryImplDar09');
const generateHistoryImplDar1 = require('./generateHistoryImplDar1');
const logger = require('@dawadk/common/src/logger').forCategory('generateHistory');


const generateHistory = (client, dar1CutoffDate) => go(function*(){
  yield client.query('CREATE TEMP TABLE vask_adgangsadresser_unmerged(like vask_adgangsadresser)');
  yield client.query('CREATE TEMP TABLE vask_adresser_unmerged(like vask_adresser)');
  logger.info('Generating DAR 0.9 history');
  yield generateHistoryImplDar09.generateHistory(client, dar1CutoffDate, 'vask_adgangsadresser_unmerged', 'vask_adresser_unmerged');
  logger.info('Generating DAR 1.0 history');
  yield generateHistoryImplDar1.generateHistory(client, dar1CutoffDate, 'vask_adgangsadresser_unmerged', 'vask_adresser_unmerged');
  logger.info('Merging histories');
  yield mergeValidTime(client, 'vask_adgangsadresser_unmerged', 'vask_adgangsadresser_merged', ['id'],
    adgAdrCols);
  yield mergeValidTime(client, 'vask_adresser_unmerged', 'vask_adresser_merged', ['id'],
    adrCols);
  yield client.query(`DELETE FROM vask_adgangsadresser; 
  INSERT INTO vask_adgangsadresser(${adgAdrCols.join(',')},virkning)
  (select ${adgAdrCols.join(',')},virkning from vask_adgangsadresser_merged)`);
  yield client.query(`DELETE FROM vask_adresser; 
  INSERT INTO vask_adresser(${adrCols.join(',')},virkning)
  (select ${adrCols.join(',')},virkning from vask_adresser_merged)`);
  logger.info('Processing adgangsadresser');
  yield processAdgangsadresserHistory(client);
  logger.info('Processing adresser');
  yield processAdresserHistory(client);
  logger.info('Creating VejstykkerPostnumreHistory');
  yield createVejstykkerPostnumreHistory(client);
});

module.exports = {generateHistory};
