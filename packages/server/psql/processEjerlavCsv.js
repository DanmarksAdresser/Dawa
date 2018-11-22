// læser den rå ejerlav CSV fil fra stdin, fjerner unødvendige kolonner og duplikater, og skriver til stdout.

"use strict";

var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var eventStream = require('event-stream');
var _ = require('underscore');

process.stdin.setEncoding('utf8');

process.stdin.pipe(eventStream.writeArray(function(err, array) {
  csvParse('Ejerlavskode,Ejerlavsbetegnelse\n1234,"foobar"', {
    delimiter: ',',
    quote: '"',
    escape: '\\',
    columns: true
  }, function(err, result) {
    process.stderr.write('parsed CSV: ' + JSON.stringify(result) + '\n');
  });
//  process.stderr.write(array.join('') + '\n');
  csvParse(array.join(''), {
    delimiter: ',',
    quote: '"',
    escape: '\\',
    columns: true
  }, function(err, result) {
//    process.stderr.write('parsed CSV: ' + JSON.stringify(result) + '\n');
    var seen = {};
    var transformedResult = _.reduce(result, function(memo, value) {
      if(!seen[value.Ejerlavskode]) {
        memo.push({
          kode: value.Ejerlavskode,
          navn: value.Ejerlavsbetegnelse
        });
      }
      else {
        if(value.Ejerlavsbetegnelse !== seen[value.Ejerlavskode].Ejerlavsbetegnelse) {
          process.stderr.write('Ejerlav med samme kode har forskellig betegnelse: ' + value.Ejerlavskode + '\n');
        }
      }
      seen[value.Ejerlavskode] = value;
      return memo;
    }, []);
    csvStringify(transformedResult, {
      delimiter: ';',
      quote: '"',
      escape: '\\',
      header: true,
      columns: ['kode', 'navn']
    }, function(err, result) {
      process.stdout.write(result);
    });
  });
}));