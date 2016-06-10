"use strict";

const copyFrom = require('pg-copy-streams').from;
const csvStringify = require('csv-stringify');
const es = require('event-stream');
const fs = require('fs');
const logger = require('../logger').forCategory('importCpr');
const moment = require('moment-timezone');
const q = require('q');
const _ = require('underscore');

const proddb = require('../psql/proddb');
const promisingStreamCombiner = require('../promisingStreamCombiner');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');

function createCopyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

const YEAR_1900 = moment.tz('1900-01-01T00:00:00', 'Europe/Copenhagen');

function parseDateTime(str) {
  str = str.trim();
  if(str === '' || str === '000000000000') {
    return null;
  }
  if(str.substring(8) === '9999') {
    str = str.substring(0,8) + '0000';
  }
  if(str.substring(10) === '99') {
    str = str.substring(0,10) + '00';
  }
  var dateFormat = 'YYYYMMDDHHmm';
  var result = moment.tz(str, dateFormat, 'Europe/Copenhagen').tz('UTC');
  if(result.isBefore(YEAR_1900)) {
    return null;
  }
  if(!result.isValid()){
    throw new Error('Invalid date: ' + str);
  }
  return result.format('YYYY-MM-DDTHH:mm:ssZ');
}

var historyTransformStream = es.map(function(line, cb) {
  var recordType = line.substring(0, 3);
  if (recordType !== '016') {
    return cb();
  }
  try {
    var kommunekode = parseInt(line.substring(3, 7), 10);
    var vejkode = parseInt(line.substring(7, 11), 10);
    var oprettet = parseDateTime(line.substring(23, 35));
    var nedlagt = parseDateTime(line.substring(35, 47));
    var adresseringsnavn = line.substring(47, 67).trim();
    var navn = line.substring(67, 107).trim();
    const virkning = toInterval(oprettet, nedlagt);

    if(oprettet && (oprettet === nedlagt)) {
      cb();
      return;
    }
    cb(null, {
      kommunekode: kommunekode,
      vejkode: vejkode,
      adresseringsnavn: adresseringsnavn,
      navn: navn,
      virkning: virkning
    });
  }
  catch(e) {
    logger.error('Invalid input from CPR', {
      line: line,
      error: e
    });
    cb(null);
  }
});

var currentTransformStream = es.map(function(line, cb) {
  var recordType = line.substring(0, 3);
  if (recordType !== '001') {
    return cb();
  }
  var kommunekode = parseInt(line.substring(3, 7), 10);
  var vejkode = parseInt(line.substring(7, 11), 10);
  var oprettet = parseDateTime(line.substring(39, 51));
  var adresseringsnavn = line.substring(51, 71).trim();
  var navn = line.substring(71, 111).trim();
  cb(null, {
    kommunekode: kommunekode,
    vejkode: vejkode,
    adresseringsnavn: adresseringsnavn,
    navn: navn,
    virkning: toInterval(oprettet, null)
  });
});

function toInterval(from, to) {
  const interval = `[${from ? from : ''},${to ? to : ''})`;
  if(from && to && moment(from).isAfter(moment(to))) {
    throw new Error('Invalid interval: ' + interval);
  }
  return interval;
}

function importFile(client, filePath, transformer) {
  const dbColumnNames = ['kommunekode', 'vejkode', 'navn', 'adresseringsnavn', 'virkning'];
  const pgStream = createCopyStream(client, 'cpr_vej', dbColumnNames);
  const inputStream = fs.createReadStream(filePath);
  return promisingStreamCombiner([
    inputStream,
    es.split(),
    transformer,
    csvStringify({
      delimiter: ';',
      quote: '"',
      escape: '\\',
      columns: dbColumnNames,
      header: true,
      encoding: 'utf8'
    }),
    pgStream
  ]);
}

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  historyFile: [false, 'Fil med vejhistorik som skal importeres', 'string'],
  currentFile: [false, 'Fil med aktuelle veje som skal importeres', 'string']
};


cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    return q.async(function*() {
      try {
        yield client.queryp('delete from cpr_vej');
        yield importFile(client, options.historyFile, historyTransformStream);
        yield importFile(client, options.currentFile, currentTransformStream);
      }
      catch (err) {
        logger.error('Caught error in importCpr', err);
        throw err;
      }
    })();
  }).done();
});

