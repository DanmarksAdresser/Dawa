"use strict";

// denne test foretager en insert, update og delete af hver entitet, og verificerer,
// at udtræk samt hændelser hentet via APIet ser ud som forventet.
// Ved opdateringen ændres samtlige felter.

var expect = require('chai').expect;
var _ = require('underscore');

const { go } = require('ts-csp');

var columnMappings = require('../../apiSpecification/replikering/columnMappings');
var crud = require('../../crud/crud');
var databaseTypes = require('../../psql/databaseTypes');
var datamodels = require('../../crud/datamodel');
var format = require('util').format;
var helpers = require('./helpers');
var registry = require('../../apiSpecification/registry');
var schemaValidationUtil = require('./schemaValidationUtil');
var testdb = require('../helpers/testdb2');
require('../../apiSpecification/allSpecs');

var Husnr = databaseTypes.Husnr;

var insert = {
  vejstykke: {
    "kode": 2640,
    "kommunekode": 846,
    "navn": "Bymarken",
    "adresseringsnavn": "Bymarken",
    "oprettet": "2014-05-27T04:42:32.240",
    "ændret": "2014-05-27T04:42:32.240"
  },
  adgangsadresse: {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
    "status": 1,
    "kommunekode": 607,
    "vejkode": 4899,
    "husnr":  new Husnr(22, null),
    "supplerendebynavn": "Brovad",
    "postnr": 7000,
    "oprettet": "2014-05-22T14:56:22.237",
    "ændret": "2014-05-22T15:50:49.437",
    "ikrafttrædelsesdato": "2014-05-22T00:00:00.000",
    "ejerlavkode": 1160252,
    "matrikelnr": "18a",
    "esrejendomsnr": 35466,
    "etrs89koordinat_øst": 542187.19,
    "etrs89koordinat_nord": 6155336.05,
    højde: 4.2,
    "nøjagtighed": "A",
    "kilde": 5,
    "husnummerkilde": null,
    "esdhreference": null,
    "journalnummer": null,
    "tekniskstandard": "TK",
    "tekstretning": 200.00,
    "adressepunktændringsdato": "2014-05-22T23:59:00.000"
  },
  adresse: {
    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f",
    "status": 1,
    "oprettet": "2014-05-23T09:50:40.167",
    "ændret": "2014-05-26T09:55:01.157",
    "ikrafttrædelsesdato": null,
    "etage": "st",
    "dør": "th",
    "esdhreference": null,
    "journalnummer": null,
    "kilde": null,
    "adgangsadresseid": "038edf0e-001b-4d9d-a1c7-b71cb354680f"
  },
  vejstykkepostnummerrelation: {
    kommunekode: 607,
    vejkode: 4899,
    postnr: 8260
  }
};

var update = {
  vejstykke: {
    "kode": 2640,
    "kommunekode": 846,
    "navn": "Opdateret Bymarken",
    "adresseringsnavn": "Opdateret Bymarken",
    "oprettet": "2013-05-27T04:42:32.240",
    "ændret": "2015-05-27T04:42:32.240"
  },
  adgangsadresse: {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
    "status": 1,
    "kommunekode": 100,
    "vejkode": 200,
    "husnr": new Husnr(22, 'B'),
    "supplerendebynavn": "Opdateret Brovad",
    "postnr": 6000,
    "oprettet": "2013-05-22T14:56:22.237",
    "ændret": "2015-05-22T15:50:49.437",
    "ikrafttrædelsesdato": "2015-05-22T00:00:00.000",
    "ejerlavkode": 123456,
    "matrikelnr": "18b",
    "esrejendomsnr": 12345,
    "etrs89koordinat_øst": 542100.00,
    "etrs89koordinat_nord": 6155300.00,
    højde: 2.4,
    "nøjagtighed": "B",
    "kilde": 4,
    "husnummerkilde": null,
    "esdhreference": null,
    "journalnummer": null,
    "tekniskstandard": "TD",
    "tekstretning": 100.00,
    "adressepunktændringsdato": "2015-05-22T23:59:00.000"
  },
  adresse: {
    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f",
    "status": 1,
    "oprettet": "2013-05-23T09:50:40.167",
    "ændret": "2015-05-26T09:55:01.157",
    "ikrafttrædelsesdato": "2015-05-26T09:55:01.157",
    "etage": "1",
    "dør": "tv",
    "adgangsadresseid": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
    "kilde": null,
    "esdhreference": null,
    "journalnummer": null
  }
};

var existingIds = {
  adresse: {
    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f"
  },
  adgangsadresse: {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f"
  },
  vejstykke: {
    "kode": 2640,
    "kommunekode": 846
  },
  vejstykkepostnummerrelation: {
    kommunekode: 607,
    vejkode: 4899,
    postnr: 8260
  }
};

var nonexistingIds = {
  adresse: {
    "id": "00000000-e6a3-49c8-98b0-4da64a82ac0f"
  },
  adgangsadresse: {
    "id": "00000000-001b-4d9d-a1c7-b71cb354680f"
  },
  vejstykke: {
    "kode": 1234,
    "kommunekode": 1234
  },
  vejstykkepostnummerrelation: {
    kommunekode: 1234,
    vejkode: 1234,
    postnr: 1234
  }
};


const ENTITY_NAMES = ['adgangsadresse','adresse', 'vejstykke', 'vejstykkepostnummerrelation'];
const REVERSE_ENTITY_NAMES = ENTITY_NAMES.slice().reverse();

function formatJson(columnMapping, obj) {
  return _.reduce(obj, function(memo, value, key) {
    /* eslint no-console: 0 */
    console.log('key: ' + key);
    var formatFn = _.findWhere(columnMapping, { name: key}).formatter || _.identity;
    memo[key] = formatFn(value);
    return memo;
  }, {});
}

let currentSeqNum = 1;
const insertSeqNums = {};
const updateSeqNums = {};
const deleteSeqnums = {};

const doInsert = (client, datamodel, objectToInsert) => {
  insertSeqNums[datamodel.name] = currentSeqNum++;
  return crud.create(client, datamodel, objectToInsert);
};

const doUpdate = (client, datamodel, objectToUpdate) => {
  updateSeqNums[datamodel.name] = currentSeqNum++;
  return crud.update(client, datamodel, objectToUpdate);
};

const doDelete = (client, datamodel, key) => {
  deleteSeqnums[datamodel.name] = currentSeqNum++;
  return crud.delete(client, datamodel, crud.getKey(datamodel, key));
};

describe('ReplikeringsAPI testopslag', function() {
  const udtraekResource = registry.findWhere({
    entityName: 'postnummer',
    type: 'resource',
    qualifier: 'udtraek'
  });

  const eventResource = registry.findWhere({
    entityName: 'postnummer',
    type: 'resource',
    qualifier: 'hændelser'
  });

  testdb.withTransactionEach('empty', clientFn => {
    it('Skal fejle hvis man henter udtræk med fremtidigt sekvensnummer', () => go(function*() {
      const sekvensnummer = 1000000;
      const response = yield helpers.getResponse(clientFn(), udtraekResource, {}, {sekvensnummer: '' + sekvensnummer});
      expect(response.status).to.equal(400);
    }));
    it('Skal fejle hvis man henter hændelser med fremtidigt sekvensnummer', () => go(function*() {
      const sekvensnummer = 1000000;
      const response = yield helpers.getResponse(clientFn(), eventResource, {}, {sekvensnummertil: '' + sekvensnummer});
      expect(response.status).to.equal(400);
    }));
  });
});

describe('ReplikeringsAPI', function() {

  testdb.withTransactionAll('empty', function(clientFn) {
    before(() => go(function*() {
      const client = clientFn();
      for(let datamodelName of ENTITY_NAMES) {
        const datamodel = datamodels[datamodelName];
        const objectToInsert = helpers.toSqlModel(datamodelName, insert[datamodelName]);
        yield doInsert(client, datamodel, objectToInsert);
        if(update[datamodelName]) {
          const objectToUpdate = helpers.toSqlModel(datamodelName, update[datamodelName]);
          yield doUpdate(client, datamodel, objectToUpdate);
        }
      }
      // deletions in reverse order so we do not break Foreign Key constraints
      for(let datamodelName of REVERSE_ENTITY_NAMES) {
        const datamodel = datamodels[datamodelName];
        const objectToDelete = helpers.toSqlModel(datamodelName, insert[datamodelName]);
        yield doDelete(client, datamodel, crud.getKey(datamodel, objectToDelete));
      }
    }));

    ENTITY_NAMES.forEach(function(datamodelName) {
      describe(format('Replication of %s', datamodelName), function() {
        var udtraekResource = registry.findWhere({
          entityName: datamodelName,
          type: 'resource',
          qualifier: 'udtraek'
        });
        it('Should include the created object in the full extract', () => go(function*() {
          var sekvensnummer = insertSeqNums[datamodelName];
          const objects = yield helpers.getCsv(clientFn(), udtraekResource, {}, {sekvensnummer: '' + sekvensnummer});
          expect(objects.length).to.equal(1);
          var obj = objects[0];
          expect(obj).to.deep.equal(helpers.jsToCsv(formatJson(columnMappings.columnMappings[datamodelName], insert[datamodelName])));
        }));

        it('Should include the updated object in the full extract', () => go(function*() {
          var sekvensnummer = updateSeqNums[datamodelName];
          if(!sekvensnummer) {
            return;
          }
          const objects = yield helpers.getCsv(clientFn(), udtraekResource, {}, {sekvensnummer: '' + sekvensnummer});
          expect(objects).to.have.length(1);
          var obj = objects[0];
          expect(obj).to.deep.equal(helpers.jsToCsv(formatJson(columnMappings.columnMappings[datamodelName], update[datamodelName])));
        }));
        it('Should not include the deleted object in the full extract', () => go(function*(){
          var sekvensnummer = deleteSeqnums[datamodelName];
          const objects = yield helpers.getCsv(clientFn(), udtraekResource, {}, {sekvensnummer: '' + sekvensnummer});
          expect(objects.length).to.equal(0);
        }));

        var eventResource = registry.findWhere({
          entityName: datamodelName,
          type: 'resource',
          qualifier: 'hændelser'
        });

        var eventRepresentation = registry.findWhere({
          entityName: datamodelName + '_hændelse',
          type: 'representation',
          qualifier: 'json'
        });

        var eventSchema = eventRepresentation.schema;

        it('All events should be valid according to schema', () => go(function*() {
          const objects = yield helpers.getJson(clientFn(), eventResource, {}, {});
          expect(objects.length).to.be.above(0);
          objects.forEach(function (object) {
            expect(schemaValidationUtil.isSchemaValid(object, eventSchema)).to.be.true;
          });
        }));

        it('sequence number filtering should work when retrieving events', () => go(function*() {
          var sekvensnummer = insertSeqNums[datamodelName]
          const objects = yield helpers.getJson(clientFn(), eventResource, {}, {
            sekvensnummerfra: sekvensnummer,
            sekvensnummertil: sekvensnummer
          });
          expect(objects.length).to.equal(1);
          expect(objects[0].sekvensnummer).to.equal(sekvensnummer);
          expect(objects[0].data).to.deep.equal(formatJson(columnMappings.columnMappings[datamodelName], insert[datamodelName]));
        }));
        it('When adding id field(s) when retrieving events, events without the specified id should not be returned', () => go(function*() {
          const objects = yield helpers.getJson(clientFn(), eventResource, {}, nonexistingIds[datamodelName]);
          expect(objects.length).to.equal(0);
        }));
        it('When adding id field(s) when retrieving events, events with the specified id should be returned', () => go(function*() {
          const objects = yield helpers.getJson(clientFn(), eventResource, {}, existingIds[datamodelName]);
          const expectedRows = update[datamodelName] ? 3 : 2;
          expect(objects.length).to.equal(expectedRows);
        }));
      });
    });
  });
});
