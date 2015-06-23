"use strict";

var csvStringify = require('csv-stringify');
var fs = require('fs');
//var q = require('q');
var _ = require('underscore');

var aboutOis = require('./aboutOis');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var copyFrom = require('pg-copy-streams').from;
var proddb = require('../psql/proddb');
var promisingStreamCombiner = require('../promisingStreamCombiner');
var oisDatamodels = require('./oisDatamodels');
var oisParser = require('./oisParser');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string']
};

function createCopyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', function (client) {
    var filePath = '../ois/OIS_NYBBR_CO40100T_DE000_00001_20150617_124401.XML';
    var fileStream = fs.createReadStream(filePath);
    var oisStream = oisParser.oisStream(fileStream, aboutOis.bygning);
    var count = 0;
    oisStream.on('data', function(obj) {
      if(count++ % 1000 === 0) {
        console.log(count + ' ' + JSON.stringify(obj));
      }
    });
    var csvStringifier = csvStringify({
      delimiter: ';',
      quote: '"',
      escape: '\\',
      columns: oisDatamodels.bygning.columns,
      header: true,
      encoding: 'utf8'
    });

    var pgStream = createCopyStream(client, 'ois_bygning', oisDatamodels.bygning.columns);

    return promisingStreamCombiner([oisStream, csvStringifier, pgStream]);

  }).done();
});