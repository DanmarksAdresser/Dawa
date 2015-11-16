"use strict";

var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var es = require('event-stream');
var q = require('q');
var request = require('request-promise');
var _ = require('underscore');

var cliParameterParsing = require('./bbr/common/cliParameterParsing');


var optionSpec = {
  dawaUrl: [false, 'URL til DAWA', 'string'],
  input: [false, 'Input fil i CSV-format', 'string'],
  output: [false, 'Output-fil i CSV-format', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputStream = fs.createReadStream(options.input, {encoding: 'utf8'});
  var outputStream = fs.createWriteStream(options.output, {encoding: 'utf8'});
  var pipe = es.pipeline(inputStream,
  csvParse({
    delimiter: ';',
    columns: ['betegnelse'],
    header: true,
    encoding: 'utf8'
  }),
  es.map((data, callback) => {
    request.get({
      url: `${options.dawaUrl}/datavask/adresser?betegnelse=${encodeURIComponent(data.betegnelse)}`,
      json: true
    }).then((result) => {
      callback({
        betegnelse: data.betegnelse,
        kategori: result.kategori,
        resultat: JSON.stringify(result.resultater[0])
      });
    })
  }),
  csvStringify({
    columns: ['betegnelse', 'kategori', 'resultat'],
    header: true,
    encoding: 'utf8'
  }), outputStream);
  pipe.on('finish', () => {
    console.log('completed');
  });
});
