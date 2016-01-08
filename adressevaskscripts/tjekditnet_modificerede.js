"use strict";

var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var es = require('event-stream');
var fs = require('fs');
var q = require('q');
var request = require('request-promise');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var util = require('../apiSpecification/util');


var optionSpec = {
  dawaUrl: [false, 'URL til DAWA', 'string'],
  input: [false, 'Input fil i CSV-format', 'string'],
  output: [false, 'Output-fil i CSV-format', 'string']
};

function parseAddresses(args, options, postnumre) {
  var inputStream = fs.createReadStream(options.input, {encoding: 'utf8'});
  var outputStream = fs.createWriteStream(options.output, {encoding: 'utf8'});

  var diffCount = {
    A: 0,
    B: 0,
    C: 0
  };

  var pipe = es.pipeline(inputStream,
    csvParse({
      delimiter: ';',
      columns: true
    }),
    es.map((data, callback) => {
      q.async(function*() {
        var postnr = data.Postnummer || data.Postnr;
        var adresse = {
          vejnavn: data.Vejnavn,
          husnr: data.Husnummer + data.Bogstav,
          postnr: postnr,
          postnrnavn: postnumre[postnr] ? postnumre[postnr].navn : ''
        };
        Object.keys(adresse).forEach((key) => {
          if(adresse[key]) {
            adresse[key]= adresse[key].trim();
          }
        });
        var adressebetegnelse = util.adressebetegnelse(adresse, false);
        var adgangUrl = `${options.dawaUrl}/datavask/adgangsadresser?betegnelse=${encodeURIComponent(adressebetegnelse)}`;
        var adgangResult = yield request.get({url: adgangUrl, json: true});
        diffCount[adgangResult.kategori]++;
        console.log(JSON.stringify(adgangResult.resultater[0]));
        var aktuelAdresse = adgangResult.resultater[0].aktueladresse;
        let adgangMatchBetegnelse = aktuelAdresse ? util.adressebetegnelse(aktuelAdresse) : "";
        if(adgangResult.kategori === 'B' || adgangResult.kategori === 'C') {
          console.log(`A: ${adressebetegnelse}`);
          console.log(`B: ${adgangMatchBetegnelse}, kategori: ${adgangResult.kategori}`);
        }
        return {
          Vejnavn: data.Vejnavn,
          Husnummer: data.Husnummer,
          Bogstav: data.Bogstav,
          Postnr: data.Postnummer || data.Postnr,
          tjekditnet_betegnelse: adressebetegnelse,
          match_id: aktuelAdresse ? aktuelAdresse.id : '',
          match_betegnelse: adgangMatchBetegnelse,
          kategori: adgangResult.kategori,
          nedlagt: !aktuelAdresse || aktuelAdresse.status === 2 || aktuelAdresse.status === 4
        };
      })().nodeify(callback);
      return false;
    }),
    csvStringify({
      columns: ['Vejnavn', 'Husnummer','Bogstav', 'Postnr', 'tjekditnet_betegnelse', 'match_id', 'match_betegnelse', 'kategori', 'nedlagt'],
      header: true,
      encoding: 'utf8'
    }), outputStream);
  pipe.on('finish', () => {
    console.log('completed');
  });
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  request.get({url: `${options.dawaUrl}/postnumre`, json: true}).then((postnumreArray) => {
    var postnumre = _.indexBy(postnumreArray, (postnummer) => '' + postnummer.nr);
    parseAddresses(args, options, postnumre);
  });
});
