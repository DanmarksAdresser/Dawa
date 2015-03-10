"use strict";

var expect = require('chai').expect;
var path = require('path');
var q = require('q');
var _ = require('underscore');

var importDarImpl = require('../../darImport/importDarImpl');
var testdb = require('../helpers/testdb');

q.longStackSupport = true;

var syntheticDbContent = {
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
    "registrering": {
      empty: false,
      lowerOpen: false,
      upperOpen: true,
      lowerInfinite: false,
      upperInfinite: true,
      lower: '2014-05-09T10:31:44.290Z',
      upper: null
    },
    "retning": 71,
    "revisionsdato": "2014-05-08T22:00:00.000Z",
    "statuskode": 6,
    "tekniskstandard": "TK",
    "versionid": "e132a6f0-d06f-41a3-abd8-00035e7ab4cd",
    "virkning": {empty: true}
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
    "registrering": {empty: true},
    "statuskode": 5,
    "vejkode": 1,
    "vejnavn": "A C Hansensvej",
    "versionid": "1e7a5bb0-0718-45f1-9254-00e72dbbe338",
    "virkning": {
      "empty": false,
      "lower": "2014-04-14T12:26:12.770Z",
      "lowerInfinite": false,
      "lowerOpen": false,
      "upper": "2014-04-14T12:26:13.533Z",
      "upperInfinite": false,
      "upperOpen": true
    }
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
    "registrering": {
      "empty": false,
      "lower": "2014-10-07T12:24:13.907Z",
      "lowerInfinite": false,
      "lowerOpen": false,
      "upper": null,
      "upperInfinite": true,
      "upperOpen": true
    },
    "statuskode": 5,
    "versionid": "9ebb96e8-a5ee-4acb-9cb8-0006c32ebb47",
    "virkning": {
      "empty": false,
      "lower": "2014-10-07T12:24:35.473Z",
      "lowerInfinite": false,
      "lowerOpen": false,
      "upper": null,
      "upperInfinite": true,
      "upperOpen": true
    }
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
describe('Importing DAR CSV files to database', function () {
  describe('Import of sample files', function () {
    it('Should define 4 CSV specifications', function () {
      expect(Object.keys(csvSpec)).to.have.length(4); // TODO will be 4
    });
    _.forEach(csvSpec, function (spec, entityName) {
      it('Should import ' + entityName + ' correctly', function () {
        return testdb.withTransaction('empty', 'ROLLBACK', function (client) {
          return importDarImpl.loadCsvFile(client,
            path.join(__dirname,
              'sampleDarFiles', 'synthetic', entityName + '.csv'),
            'dar_' + entityName, spec).then(function () {
              return q.ninvoke(client, 'query', "SELECT * FROM dar_" + entityName, []);
            }).then(function (result) {
              expect(result.rows).to.have.length(1);
              var obj = result.rows[0];
              if (!spec.bitemporal) {
                var registrering = obj.registrering;
                delete obj.registrering;
                var versionid = obj.versionid;
                delete obj.versionid;
                expect(registrering.empty).to.be.false;
                expect(registrering.lower).to.be.a.string;
                expect(registrering.upperInfinite).to.be.true;
                expect(versionid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
              }
              expect(obj).to.deep.equal(syntheticDbContent[entityName]);
            });
        });
      });
    });
  });

  describe('Computing changes based on CSV file', function () {
    var csvSpec = {
      bitemporal: true,
      idColumns: ['id'],
      columns: [
        {
          name: 'id',
          type: importDarImpl.internal.types.uuid
        },
        {
          name: 'content',
          type: importDarImpl.internal.types.string
        }]
    };

    function setupTable(client) {
      return client.queryp(
        'CREATE TEMP TABLE cur_table(' +
        ' versionid uuid primary key,' +
        ' id uuid not null,' +
        ' content text,' +
        ' registrering tstzrange not null,' +
        ' virkning tstzrange not null)', [])
        .then(function () {
          return importDarImpl.loadCsvFile(client,
            path.join(__dirname, 'sampleDarFiles', 'comparison', 'table.csv'),
            'cur_table',
            csvSpec);
        });
    }
    describe('Compute set of differences betweeen to bitemporal tables', function () {
      testdb.withTransactionAll('empty', function (clientFn) {
        before(function () {
          var client = clientFn();
          return setupTable(client).then(function () {
            return importDarImpl.internal.createTableAndLoadData(client,
              path.join(__dirname, 'sampleDarFiles', 'comparison', 'desired_table.csv'),
              'desired_table',
              'cur_table',
              csvSpec);
          })
            .then(function () {
              return importDarImpl.internal.computeDifferencesFast(client, 'cur_table', 'desired_table', 'table');
            });
        });
        it('Should correctly compute the insert', function () {
          var client = clientFn();
          return client.queryp('SELECT * FROM insert_table', []).then(function (result) {
            expect(result.rows).to.have.length(1);
            expect(result.rows[0]).to.deep.equal({
              versionid: '11111111-1111-1111-1111-111111111113',
              id: '11111111-1111-1111-1111-11111111111c',
              content: 'Created row',
              registrering: {
                empty: false,
                lowerOpen: false,
                upperOpen: true,
                lowerInfinite: false,
                upperInfinite: true,
                lower: "2014-05-08T22:00:00.000Z",
                upper: null
              },
              virkning: {empty: true}
            });
          });
        });
        it('Should correctly compute the update', function () {
          var client = clientFn();
          return client.queryp("SELECT * FROM update_table", []).then(function (result) {
            expect(result.rows).to.have.length(1);
            expect(result.rows[0]).to.deep.equal({
              "content": "Modified row",
              "id": "11111111-1111-1111-1111-11111111111d",
              "registrering": {
                "empty": false,
                "lower": "2014-05-08T22:00:00.000Z",
                "lowerInfinite": false,
                "lowerOpen": false,
                "upper": "2014-05-09T22:00:00.000Z",
                "upperInfinite": false,
                "upperOpen": true
              },
              "versionid": "11111111-1111-1111-1111-111111111114",
              "virkning": {empty: true}
            });
          });
        });
        it('Should correctly compute the delete', function() {
          var client = clientFn();
          return client.queryp("SELECT * FROM delete_table", []).then(function (result) {
            expect(result.rows).to.have.length(1);
            expect(result.rows[0]).to.deep.equal({versionid: '11111111-1111-1111-1111-111111111112'});
          });
        });
      });
    });
    describe('Full update of bitemporal table', function () {
      var destinationTable = 'cur_table';
      testdb.withTransactionAll('empty', function (clientFn) {
        before(function() {
          var client = clientFn();
          return setupTable(client);
        });
        it('Should update destination table to have same content as CSV file', function() {
          var client = clientFn();
          var desiredCsvPath = path.join(__dirname, 'sampleDarFiles', 'comparison', 'desired_table.csv');
          return importDarImpl.updateBitemporalTableFromCsv(client, desiredCsvPath, destinationTable, csvSpec)
            .then(function() {
              return client.queryp("SELECT * FROM " + destinationTable + " order by versionid", []);
            })
            .then(function(result) {
              expect(result.rows).to.have.length(3);
              var unmodified = result.rows[0];
              var created = result.rows[1];
              var updated = result.rows[2];
              expect(unmodified.versionid).to.equal('11111111-1111-1111-1111-111111111111');
              expect(created.versionid).to.equal('11111111-1111-1111-1111-111111111113');
              expect(updated.versionid).to.equal('11111111-1111-1111-1111-111111111114');
              expect(updated.registrering.upper).to.equal('2014-05-09T22:00:00.000Z');
            });
        });
      });
    });
  });
});