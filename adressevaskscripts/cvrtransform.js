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

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  var inputStream = fs.createReadStream(options.input, {encoding: 'utf8'});
  var outputStream = fs.createWriteStream(options.output, {encoding: 'utf8'});
  var diffCount = {
    A: 0,
    B: 0,
    C: 0
  };

  var diffCountAdgang = {
    A: 0,
    B: 0
  };

  var rangeCount = 0;

  var pipe = es.pipeline(inputStream,
    csvParse({
      delimiter: ',',
      quote: '"',
      columns: true
    }),
    es.map((data, callback) => {
      q.async(function*() {
        if((data.beliggenhedsadresse_husnummerTil && data.beliggenhedsadresse_husnummerFra !== data.beliggenhedsadresse_husnummerTil)
          ||
          ( data.beliggenhedsadresse_bogstavTil && data.beliggenhedsadresse_bogstavFra !== data.beliggenhedsadresse_bogstavTil)) {
          rangeCount++;
          console.log(`rangeCount: ${rangeCount}`);
          return;
        }
        var adresse = {
          vejnavn: data.beliggenhedsadresse_vejnavn,
          husnr: data.beliggenhedsadresse_husnummerFra + data.beliggenhedsadresse_bogstavFra,
          etage: data.beliggenhedsadresse_etage != '' ? data.beliggenhedsadresse_etage : null,
          dør: data.beliggenhedsadresse_sidedoer != '' ? data.beliggenhedsadresse_sidedoer : null,
//          supplerendebynavn: data.beliggenhedsadresse_bynavn != '' ? data.beliggenhedsadresse_bynavn : null,
          supplerendebynavn: null,
          postnr: data.beliggenhedsadresse_postnr,
          postnrnavn: data.beliggenhedsadresse_postdistrikt
        };
        Object.keys(adresse).forEach((key) => {
          if(adresse[key]) {
            adresse[key]= adresse[key].trim();
          }
        });
        var adressebetegnelse = util.adressebetegnelse(adresse, false);
        var url = `${options.dawaUrl}/datavask/adresser?betegnelse=${encodeURIComponent(adressebetegnelse)}`;
        var result = yield request.get({url: url, json: true});

        let matchBetegnelse = util.adressebetegnelse(result.resultater[0].aktueladresse);
        if(result.kategori === 'A' || result.kategori === 'B') {
          diffCount[result.kategori]++;
          if(result.kategori === 'B') {
            console.log(`A: ${adressebetegnelse}`);
            console.log(`B: ${matchBetegnelse}, kategori: ${result.kategori}`);
          }
          return {
            cvr_betegnelse: adressebetegnelse,
            match_betegnelse: matchBetegnelse,
            kategori: result.kategori,
            adgangsadresse: false
          };
        }
        var adgangUrl = `${options.dawaUrl}/datavask/adgangsadresser?betegnelse=${encodeURIComponent(adressebetegnelse)}`;
        var adgangResult = yield request.get({url: adgangUrl, json: true});
        if(adgangResult.kategori === 'A' || adgangResult.kategori === 'B') {
          diffCountAdgang[adgangResult.kategori]++;
          let adgangMatchBetegnelse = util.adressebetegnelse(adgangResult.resultater[0].aktueladresse);
          if(adgangResult.kategori === 'B') {
            console.log(`A: ${adressebetegnelse}`);
            console.log(`B: ${adgangMatchBetegnelse}, kategori: ${adgangResult.kategori}`);
          }
          return {
            cvr_betegnelse: adressebetegnelse,
            match_betegnelse: adgangMatchBetegnelse,
            kategori: adgangResult.kategori,
            adgangsadresse: true
          };
        }
        diffCount.C += 1;
        console.log(`A: ${adressebetegnelse}`);
        console.log(`B: ${matchBetegnelse}, kategori: ${result.kategori}`);
        console.log(`diff: ${JSON.stringify(diffCount)}, adgangDiff: ${JSON.stringify(diffCountAdgang)}, rangeCount: ${rangeCount}`);
        return {
          cvr_betegnelse: adressebetegnelse,
          match_betegnelse: matchBetegnelse,
          kategori: 'C',
          adgangsadresse: false
        }
      })().nodeify(callback);
      return false;
    }),
    csvStringify({
      columns: ['cvr_betegnelse', 'match_betegnelse', 'kategori', 'adgangsadresse'],
      header: true,
      encoding: 'utf8'
    }), outputStream);
  pipe.on('finish', () => {
    console.log('completed');
  });
});
