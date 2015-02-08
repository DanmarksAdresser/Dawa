"use strict";

var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var ejerlav = require('../../matrikeldata/ejerlav');
var transactions = require('../../psql/transactions');
var itQ = require('./helpers').itQ;

describe('Import af matrikel', function () {
  it('Kan parse en matrikelfil', function (done) {
    var gml = fs.readFileSync(path.join(__dirname, 'matrikel.gml'), {encoding: 'utf-8'});
    ejerlav.parseEjerlav(gml).then(function (result) {
      result.forEach(function (jordstykke) {
        expect(jordstykke.tema).toBe('jordstykke');
        expect(_.isNumber(jordstykke.fields.ejerlavkode)).toBeTruthy();
        expect(_.isNumber(jordstykke.fields.featureID)).toBeTruthy();
        expect(_.isString(jordstykke.fields.matrikelnr)).toBeTruthy();
        expect(_.isString(jordstykke.polygons[0])).toBeTruthy();
      });
      done();
    });
  });

  itQ('Kan gemme en matrikelfil', function () {
    var gml = fs.readFileSync(path.join(__dirname, 'matrikel.gml'), {encoding: 'utf-8'});
    return ejerlav.parseEjerlav(gml).then(function (jordstykker) {
      return transactions.withTransaction({
        connString: process.env.pgEmptyDbUrl,
        mode: 'ROLLBACK'
      }, function (client) {
        return ejerlav.storeEjerlav(jordstykker, client, {init: true});
      });
    });
  });
});