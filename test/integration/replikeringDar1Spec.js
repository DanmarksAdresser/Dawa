"use strict";

const _ = require('underscore');
const {assert} = require('chai');

const path = require('path');

const importDarImpl = require('../../dar10/importDarImpl');
const dar10TableModels = require('../../dar10/dar10TableModels');
const testdb = require('../helpers/testdb2');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../importUtil/importUtil');
const helpers = require('./helpers');
const udtraekResource = require('../../apiSpecification/replikering/udtraek/combinedResource');
const eventResource = require('../../apiSpecification/replikering/events/combinedResource');
require('../../apiSpecification/allSpecs');

const ALL_ENTITIES = _.without(Object.keys(dar10TableModels.rawTableModels), 'ReserveretVejnavn');

describe('Replikering af DAR 1.0', function() {
  this.timeout(1200000);
  testdb.withTransactionAll('empty', (clientFn) => {
    it('Kan importere udtræk', () => go(function*() {
      const client = clientFn();
      yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
        yield importDarImpl.importIncremental(client, txid, path.join(__dirname, '../data/dar10'), false);
      }));
    }));

    for(let entityName of ALL_ENTITIES) {
      it(`Kan hente udtræk for aktuelle ${entityName}`, () => go(function*() {
        const result = yield helpers.getJsonFromHandler(clientFn(), udtraekResource.responseHandler, {}, {entitet: `dar_${entityName.toLowerCase()}_aktuel`});
        assert(result.length > 0);
      }));
      it(`Kan hente hændelser for aktuelle ${entityName}`, () => go(function*() {
        const result = yield helpers.getJsonFromHandler(clientFn(), eventResource.responseHandler, {}, {entitet: `dar_${entityName.toLowerCase()}_aktuel`});
        assert(result.length > 0);
      }));
    }
  });
});