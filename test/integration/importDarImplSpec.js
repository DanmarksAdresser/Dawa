"use strict";

var expect = require('chai').expect;
var path = require('path');
var q = require('q');
var _ = require('underscore');

var importDarImpl = require('../../darImport/importDarImpl');
var testdb = require('../helpers/testdb');

q.longStackSupport = true;

var expectedDbContent = {
  accesspoint: {
    "esdhreference": null,
    "id": "efaae53e-b419-4f0e-bfa6-9097de8f79e2",
    "journalnummer": null,
    "kildekode": 1,
    "kommunenummer": 881,
    "noejagtighedsklasse": "A",
    "nord": 6190946.37,
    "oest": 692221.47,
    "placering": 5,
    "registrering": "[\"2014-05-09 12:31:44.29+02\",infinity)",
    "retning": 71,
    "revisionsdato": "2014-05-08T22:00:00.000Z",
    "statuskode": 6,
    "tekniskstandard": "TK",
    "versionid": "e132a6f0-d06f-41a3-abd8-00035e7ab4cd",
    "virkning": 'empty',
  },
  housenumber: {
    "adgangspunktid": "febf134f-d61f-48e1-af7c-9e7dbd5cc44a",
    "bynavn": null,
    "husnummer": "5B",
    "id": "2d324437-ed93-4c75-abac-922d5360c2db",
    "ikrafttraedelsesdato": null,
    "kildekode": 1,
    "postdistrikt": "Frederikssund",
    "postnummer": 3600,
    "registrering": "empty",
    "statuskode": 5,
    "vejkode": 1,
    "vejnavn": "A C Hansensvej",
    "versionid": "1e7a5bb0-0718-45f1-9254-00e72dbbe338",
    "virkning": "[\"2014-04-14 14:26:12.77+02\",\"2014-04-14 14:26:13.533+02\")"
  },
  address: {
    "doerbetegnelse": "MF",
    "esdhreference": null,
    "etagebetegnelse": "96",
    "husnummerid": "4a201917-53ae-4a2c-b7e4-ee17c8cb4bf8",
    "id": "970c79e9-d60b-461e-9b9d-75a1c73b0273",
    "ikrafttraedelsesdato": null,
    "journalnummer": null,
    "kildekode": 1,
    "registrering": "[\"2014-10-07 14:24:13.907+02\",infinity)",
    "statuskode": 5,
    "versionid": "9ebb96e8-a5ee-4acb-9cb8-0006c32ebb47",
    "virkning": "[\"2014-10-07 14:24:35.473+02\",infinity)"
  },
  streetname: {
    "adresseringsnavn": "Børges Bryggerivej",
    "aendringstimestamp": "2010-07-05T10:16:15.690Z",
    "kommunekode": 906,
    "navn": "Børges Bryggerivej",
    "ophoerttimestamp": null,
    "oprettimestamp": "1900-12-31T23:00:00.000Z",
    "vejkode": 5000
  }
};

var csvSpec = importDarImpl.internal.csvSpec;
describe('Importing DAR CSV files to database', function() {
  describe('Import of sample files', function() {
    it('Should define 4 CSV specifications', function() {
      expect(Object.keys(csvSpec)).to.have.length(4); // TODO will be 4
    });
    _.forEach(csvSpec, function(spec, entityName) {
      it('Should import ' + entityName + ' correctly', function() {
        return testdb.withEmptyDbTransaction('ROLLBACK', function(client) {
          return importDarImpl.loadCsvFile(client,
            path.join(__dirname,
            'sampleDarFiles', 'synthetic', entityName + '.csv'),
            'dar_' + entityName, spec).then(function() {
              return q.ninvoke(client, 'query', "SELECT * FROM dar_" + entityName, []);
            }).then(function (result) {
              expect(result.rows).to.have.length(1);
              var obj = result.rows[0];
              if(!spec.bitemporal) {
                var registrering = obj.registrering;
                delete obj.registrering;
                var versionid = obj.versionid;
                delete obj.versionid;
                expect(registrering).to.match(/^\[".+",infinity\)$/);
                expect(versionid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
              }
              expect(obj).to.deep.equal(expectedDbContent[entityName]);
            });
        });
      });
    });
  });
});