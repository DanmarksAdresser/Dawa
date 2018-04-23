"use strict";

var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var ejerlav = require('../../matrikeldata/ejerlav');

describe('Import af matrikel', function () {
  it('Kan parse en matrikelfil', function () {
    this.timeout(5000);
    var gml = fs.readFileSync(path.join(__dirname, 'matrikel.gml'), {encoding: 'utf-8'});
    return ejerlav.parseEjerlav(gml).then(function (result) {
      result.forEach(function (jordstykke) {
        expect(_.isNumber(jordstykke.ejerlavkode)).to.be.true;
        expect(_.isNumber(jordstykke.featureID)).to.be.true;
        expect(_.isString(jordstykke.matrikelnr)).to.be.true;
        expect(_.isString(jordstykke.geom)).to.be.true;
      });
    });
  });
});
