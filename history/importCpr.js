"use strict";

var fs = require('fs');
var moment = require('moment');

var databasetypes = require('../psql/databaseTypes');

var
function importCpr(client, filePath) {
  fs.createReadStream(filePath)
    .pipe(es.split())
    .pipe(es.map(function (line, cb) {
      var recordType = line.substring(0,3);
      if(recordType !== '016') {
        return cb();
      }
      var kommunekode = parseInt(line.substring(3, 7), 10);
      var vejkode = parseInt(line.substring(7, 11), 10);
      var timestamp = line.substring(11, 23);
      var oprettet = moment(line.substring(23, 35), 'YYYYMMDDHHmm');
      var nedlagt = line.substring(35, 47);
      var adresseringsnavn = line.substring(47, 20).trim();
      var navn = line.substring(67, 87).trim();
      cb(null, {
        kommunekode: kommunekode,
        vejkode: vejkode,
        adresseringsnavn: adresseringsnavn,
        navn: navn,
        virkning
      });
    }))
}
