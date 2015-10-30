"use strict";

var q = require('q');
var _ = require('underscore');

var adresseRegex = require('../apiSpecification/adresseRegex');
var apiUtl = require('../apiSpecification/util');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var dbapi = require('../dbapi');
var proddb = require('../psql/proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

/*eslint no-console: 0*/
cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl
  });

  proddb.withTransaction('READ_ONLY', function (client) {
    return q.async(function*() {
      var sql = 'select vejnavn, husnr, etage, doer as dør, supplerendebynavn, postnr, postnrnavn from adresser';
      var cursor = yield dbapi.streamRaw(client, sql, []);
      cursor.on('data', function(row) {
        if(!row.postnrnavn) {
          return;
        }
        var adresseTekst = apiUtl.adressebetegnelse(row, false);
        var match = adresseRegex.strict.exec(adresseTekst);
        if(!match) {
          console.log(adresseTekst);
          console.log('no match');
          throw new Error();
        }
        else {
          var matched = {
            vejnavn: match[1],
            husnr: match[2],
            etage: match[3] || null,
            dør: match[4] || null,
            supplerendebynavn: match[5] || null,
            postnr: parseInt(match[6]),
            postnrnavn: match[7]
          };
          if(!_.isEqual(JSON.parse(JSON.stringify(row)), JSON.parse(JSON.stringify(matched)))) {
            console.log(JSON.stringify(row));
            console.log(JSON.stringify(matched));
            throw new Error();
          }
        }
      });
      return q.Promise(function(resolve, reject) {
        cursor.on('end', resolve);
      });
    })();
  }).done();
});
