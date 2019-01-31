const { go } = require('ts-csp');
const es = require('event-stream');
const fs = require('fs');
const csvParse = require('csv-parse');

const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const { roundHeight, importHeightsFromTable, createHeightTable } = require('../../heights/import-heights-util');
const COLUMNS = ['id', 'x', 'y', 'z'];

const CSV_PARSE_OPTIONS = {
  delimiter: ',',
  quote: '"',
  escape: '"',
  columns: true
};

const  streamToTempTable = (client, filePath, tableName) => go(function*() {
    yield createHeightTable(client, tableName);
    const src = fs.createReadStream(filePath, {encoding: 'utf8'});
    const csvParser = csvParse(CSV_PARSE_OPTIONS);
    const mapper = es.mapSync(csvRow => {
      return {
        id: csvRow.id,
        x: parseFloat(csvRow.x),
        y: parseFloat(csvRow.y),
        z: roundHeight(parseFloat(csvRow.interpolz))
      };
    });
    const stringifier = importUtil.copyStreamStringifier(COLUMNS);
    const copyStream = importUtil.copyStream(client, tableName, COLUMNS);
    yield promisingStreamCombiner([src, csvParser, mapper, stringifier, copyStream]);
  });



const importHeights = (client, txid, filePath) => go(function*() {
  const tempTable = 'heights';
  yield streamToTempTable(client, filePath, tempTable);
  yield importHeightsFromTable(client, txid, tempTable);
  yield importUtil.dropTable(client, tempTable);
});

const createHeightImporter = ({ filePath }) => {
  const execute = (client, txid) => importHeights(client, txid, filePath);
  return {
    id:  'Heights-CSV',
    description: 'Height CSV importer',
    execute,
    requires: [],
    produces: ['hoejde_importer_resultater', 'hoejde_importer_afventer']
  };
};

module.exports = { createHeightImporter };


