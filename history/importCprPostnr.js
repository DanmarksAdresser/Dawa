"use strict";

const copyFrom = require('pg-copy-streams').from;
const csvStringify = require('csv-stringify');
const es = require('event-stream');
const fs = require('fs');
const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const databaseTypes = require('../psql/databaseTypes');
const husnrUtil = require('../apiSpecification/husnrUtil');
const logger = require('../logger').forCategory('importCpr');
const proddb = require('../psql/proddb');
const promisingStreamCombiner = require('../promisingStreamCombiner');

function createCopyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

var postnrTransformStream = function(virkningstart, virkningslut) {
  return es.mapSync(function(line) {
    var recordType = line.substring(0, 3);
    if (recordType !== '004') {
      return null;
    }
    try {
      var kommunekode = parseInt(line.substring(3, 7), 10);
      var vejkode = parseInt(line.substring(7, 11), 10);
      var husnrfra = husnrUtil.parseHusnr(line.substring(11, 15).trim());
      var husnrtil = husnrUtil.parseHusnr(line.substring(15, 19).trim());
      var ligeUlige = line.substring(19, 20);
      var postnr = line.substring(32, 36);
      var postnrnavn = line.substring(36, 56);

      return {
        kommunekode: kommunekode,
        vejkode: vejkode,
        husnrinterval: new databaseTypes.Range(husnrfra, husnrtil, '[]').toPostgres(),
        side: ligeUlige,
        nr: postnr,
        navn: postnrnavn,
        virkning: new databaseTypes.Range(virkningstart || null, virkningslut || null, '[]').toPostgres()
      };
    }
    catch(e) {
      logger.error('Invalid input from CPR', {
        line: line,
        error: e
      });
      return null;
    }
  });
};

function importFile(client, filePath, transformer) {
  const dbColumnNames = ['kommunekode', 'vejkode', 'husnrinterval', 'side', 'nr', 'navn', 'virkning'];
  const pgStream = createCopyStream(client, 'cpr_postnr', dbColumnNames);
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
  file: [false, 'Fil med postnumre som skal importeres', 'string'],
  clear: [false, 'Ryd tabel før indsættelse', 'boolean', false],
  virkning: [false, 'Tidspunkt hvor postnummerudtrækket blev dannet af CPR', 'string'],
};


cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    return q.async(function*() {
      try {
        if(options.clear) {
          yield client.queryp('delete from cpr_postnr');
        }
        yield importFile(client, options.file, postnrTransformStream(options.virkning, options.virkning));
      }
      catch (err) {
        logger.error('Caught error in importCpr', err);
        throw err;
      }
    })();
  }).done();
});

