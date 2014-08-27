"use strict";

// denne test foretager en insert, update og delete af hver entitet, og verificerer,
// at udtræk samt hændelser hentet via APIet ser ud som forventet.
// Ved opdateringen ændres samtlige felter.

var Q = require('q');
var csvParse = require('csv-parse');
var format = require('util').format;
var _ = require('underscore');

var registry = require('../../apiSpecification/registry');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');
require('../../apiSpecification/allSpecs');

var columnMappings = require('../../apiSpecification/replikering/columnMappings');
var sqlCommon = require('../../psql/common');
var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');

var schemaValidationUtil = require('./schemaValidationUtil');



var insert = {
  postnummer: {
    "nr": 8260,
    "navn": "Viby J",
    "stormodtager": false
  },
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
    "husnr": "22",
    "supplerendebynavn": "Brovad",
    "postnr": 7000,
    "oprettet": "2014-05-22T14:56:22.237",
    "ændret": "2014-05-22T15:50:49.437",
    "ikrafttrædelsesdato": "2014-05-22T00:00:00.000",
    "ejerlavkode": 1160252,
    "matrikelnr": "18a",
    "esrejendomsnr": 35466,
    "adgangspunktid": "12345678-1234-1234-1234-123456789012",
    "etrs89koordinat_øst": 542187.19,
    "etrs89koordinat_nord": 6155336.05,
    "nøjagtighed": "A",
    "kilde": 5,
    "tekniskstandard": "TK",
    "tekstretning": 200.00,
    "adressepunktændringsdato": "2014-05-22T23:59:00.000",
    "ddkn_m100": "100m_61553_5421",
    "ddkn_km1": "1km_6155_542",
    "ddkn_km10": "10km_615_54"
  },
  adresse: {
    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f",
    "status": 1,
    "oprettet": "2014-05-23T09:50:40.167",
    "ændret": "2014-05-26T09:55:01.157",
    "ikrafttrædelsesdato": null,
    "etage": "st",
    "dør": "th",
    "adgangsadresseid": "0dd9a7db-c962-4952-b501-4820dadfc4a1"
  },
  ejerlav: {
    kode: 20551,
    navn: "Herstedvester By, Herstedvester"
  }
};

var update = {
  postnummer: {
    "nr": 8260,
    "navn": "Opdateret Viby J",
    "stormodtager": true
  },
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
    "husnr": "22B",
    "supplerendebynavn": "Opdateret Brovad",
    "postnr": 6000,
    "oprettet": "2013-05-22T14:56:22.237",
    "ændret": "2015-05-22T15:50:49.437",
    "ikrafttrædelsesdato": "2015-05-22T00:00:00.000",
    "ejerlavkode": 123456,
    "matrikelnr": "18b",
    "esrejendomsnr": 12345,
    "adgangspunktid": "00000000-0000-0000-0000-000000000000",
    "etrs89koordinat_øst": 542100.00,
    "etrs89koordinat_nord": 6155300.00,
    "nøjagtighed": "B",
    "kilde": 4,
    "tekniskstandard": "TD",
    "tekstretning": 100.00,
    "adressepunktændringsdato": "2015-05-22T23:59:00.000",
    "ddkn_m100": "100m_61553_0000",
    "ddkn_km1": "1km_6155_000",
    "ddkn_km10": "10km_615_00"
  },
  adresse: {
    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f",
    "status": 1,
    "oprettet": "2013-05-23T09:50:40.167",
    "ændret": "2015-05-26T09:55:01.157",
    "ikrafttrædelsesdato": "2015-05-26T09:55:01.157",
    "etage": "1",
    "dør": "tv",
    "adgangsadresseid": "11111111-c962-4952-b501-4820dadfc4a1"
  },
  ejerlav: {
    kode: 20551,
    navn: "Herstedvester By, Herstedvester (opdateret)"
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
  postnummer: {
    "nr": 8260
  },
  ejerlav: {
    kode: 20551
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
  postnummer: {
    "nr": 1234
  },
  ejerlav: {
    kode: 1234
  }
};


function toSqlModel(datamodelName, apiObject) {
  return _.reduce(columnMappings.columnMappings[datamodelName], function (memo, mapping) {
    var sqlColumn = mapping.column || mapping.name;
    memo[sqlColumn] = apiObject[mapping.name];
    return memo;
  }, {});
}

var ENTITY_NAMES = Object.keys(columnMappings.columnMappings);

function getResponse(dbClient, resourceSpec, pathParams, queryParams, callback) {
  function withDbClient(callback) {
    callback(null, dbClient, function() {});
  }
  function shouldAbort() {
    return false;
  }
  resourceImpl.resourceResponse(withDbClient, resourceSpec, {params: pathParams, query: queryParams, headers: {}}, shouldAbort, function(err, response) {
    if(err) {
      return callback(err);
    }
    if(response.bodyPipe) {
      response.bodyPipe.toArray(function(err, result) {
        if(err) {
          return callback(err);
        }
        delete response.bodyPipe;
        response.body = result.join('');
        callback(null, response);
      });
    }
    else {
      callback(null, response);
    }
  });
}

function getStringResponse(dbClient, resourceSpec, pathParams, queryParams, callback) {
  getResponse(dbClient, resourceSpec, pathParams, queryParams, function(err, res) {
    if(err) {
      return callback(err);
    }
    if(res.status !== 200) {
      return callback(new Error('Unexpected status code: ' + res.status));
    }
    callback(null, res.body);
  });
}

function getJson(dbClient, resourceSpec, pathParams, queryParams, callback) {
  getStringResponse(dbClient, resourceSpec, pathParams, queryParams, function(err, str) {
    if(err) {
      return callback(err);
    }
    var json;
    try {
       json = JSON.parse(str);
    }
    catch(parseError) {
      return callback(parseError);
    }
    callback(null, json);
  });
}

function getCsv(dbClient, resourceSpec, pathParams, queryParams, callback) {
  queryParams.format = 'csv';
  getStringResponse(dbClient, resourceSpec, pathParams, queryParams, function(err, str) {
    if(err) {
      return callback(err);
    }
    csvParse(str, {columns: true}, function(err, result) {
      if(err) {
        return callback(err);
      }
      callback(err, result);
    });
  });
}

function jsFieldToCsv(field) {
  if (typeof field === 'string') {
    return field;
  } else if (typeof field === 'number') {
    return '' + field;
  } else if (typeof field === 'boolean') {
    return field ? '1' : '';
  } else if (field instanceof Date) {
    return '' + field.getTime();
  }
  else {
    return '';
  }
}

function jsToCsv(obj) {
  return _.reduce(obj, function(memo, field, fieldName) {
    memo[fieldName] = jsFieldToCsv(field);
    return memo;
  },{});
}

function formatJson(columnMapping, obj) {
  return _.reduce(obj, function(memo, value, key) {
    var formatFn = _.findWhere(columnMapping, { name: key}).formatter || _.identity;
    memo[key] = formatFn(value);
    return memo;
  }, {});
}

describe('ReplikeringsAPI', function() {
  var client;
  var transactionDone;
  beforeEach(function(done) {
    sqlCommon.withWriteTransaction(process.env.pgEmptyDbUrl, function(err, _client, _transactionDone){
      if(err) {
        return done(err);
      }
      client = _client;
      transactionDone = _transactionDone;
      done();
    });

  });

  // create, update and delete each object
  ENTITY_NAMES.forEach(function(datamodelName) {
    beforeEach(function(done) {
      var datamodel = datamodels[datamodelName];
      var objectToInsert = toSqlModel(datamodelName, insert[datamodelName]);
      var objectToUpdate = toSqlModel(datamodelName, update[datamodelName]);
      Q.nfcall(crud.create, client, datamodel, objectToInsert).then(function() {
        return Q.nfcall(crud.update, client, datamodel, objectToUpdate);
      }).then(function() {
        return Q.nfcall(crud.delete, client, datamodel, crud.getKey(datamodel, objectToUpdate));
      }).then(function() {
        done();
      }, function(err) {
        throw err;
      });
    });
  });

  ENTITY_NAMES.forEach(function(datamodelName, index) {
    describe(format('Replication of %s', datamodelName), function() {
      var udtraekResource = registry.findWhere({
        entityName: datamodelName,
        type: 'resource',
        qualifier: 'udtraek'
      });
      it('Should include the created object in the full extract', function(done) {
        var sekvensnummer = (index * 3) + 1;
        getCsv(client, udtraekResource, {}, {sekvensnummer: '' + sekvensnummer}, function(err, objects) {
          expect(objects.length).toBe(1);
          var obj = objects[0];
          expect(obj).toEqual(jsToCsv(insert[datamodelName]));
          done();
        });
      });
      it('Should include the updated object in the full extract', function(done) {
        var sekvensnummer = (index * 3) + 2;
        getCsv(client, udtraekResource, {}, {sekvensnummer: '' + sekvensnummer}, function(err, objects) {
          expect(objects.length).toBe(1);
          var obj = objects[0];
          expect(obj).toEqual(jsToCsv(update[datamodelName]));
          done();
        });
      });
      it('Should not include the deleted object in the full extract', function(done) {
        var sekvensnummer = (index * 3) + 3;
        getCsv(client, udtraekResource, {}, {sekvensnummer: '' + sekvensnummer}, function(err, objects) {
          expect(objects.length).toBe(0);
          done();
        });
      });

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

      it('All events should be valid according to schema', function(done) {
        getJson(client, eventResource, {}, {}, function(err, objects) {
          expect(objects.length).toBeGreaterThan(0);
          objects.forEach(function(object) {
            expect(schemaValidationUtil.isSchemaValid(object, eventSchema)).toBeTruthy();
          });
          done();
        });
      });

      it('sequence number filtering should work when retrieving events', function(done) {
        var sekvensnummer = (index * 3) + 2;
        getJson(client, eventResource, {}, {sekvensnummerfra: sekvensnummer, sekvensnummertil: sekvensnummer}, function(err, objects) {
          expect(objects.length).toBe(1);
          expect(objects[0].sekvensnummer).toBe(sekvensnummer);
          expect(objects[0].data).toEqual(formatJson(columnMappings.columnMappings[datamodelName], update[datamodelName]));
          done();
        });
      });
      it('When adding id field(s) when retrieving events, events without the specified id should not be returned', function(done) {
        getJson(client, eventResource, {}, nonexistingIds[datamodelName], function(err, objects) {
          expect(objects.length).toBe(0);
          done();
        });
      });
      it('When adding id field(s) when retrieving events, events with the specified id should be returned', function(done) {
        getJson(client, eventResource, {}, existingIds[datamodelName], function(err, objects) {
          expect(objects.length).toBe(3);
          done();
        });
      });
    });
  });

  afterEach(function(done) {
    transactionDone('rollback', function(err) {
      done();
    });
  });

});