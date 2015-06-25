"use strict";

var expect = require('chai').expect;

var oisDatamodels = require('../../../apiSpecification/ois/oisDatamodels');

describe('OIS datamodels', function() {
  Object.keys(oisDatamodels).forEach(function(entityName) {
    var datamodel = oisDatamodels[entityName];
    it('Datamodel ' + entityName + ' angivet table', function() {
      expect(datamodel.table).to.be.a.string;
    });
    it('Datamodel ' + entityName + ' har angivet navn', function() {
      expect(datamodel.name).to.equal(entityName);
    });
    it('Datamodel ' + entityName + ' har angivet key', function() {
      expect(datamodel.key).to.be.an.array;
      expect(datamodel.key).to.have.length.above(0);
      expect(datamodel.key[0]).to.be.a.string;
    });
    it('Datamodel ' + entityName + ' har angivet columns', function() {
      expect(datamodel.columns).to.be.an.array;
      expect(datamodel.columns).to.have.length.above(0);
    });
  });
});