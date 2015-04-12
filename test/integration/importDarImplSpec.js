"use strict";

var copyFrom = require('pg-copy-streams').from;
var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');

var darSpec = require('../../darImport/darSpec');
var databaseTypes = require('../../psql/databaseTypes');
var importDarImpl = require('../../darImport/importDarImpl');
var promisingStreamCombiner = require('../../promisingStreamCombiner');
var testdb = require('../helpers/testdb');

var Husnr = databaseTypes.Husnr;
var Range = databaseTypes.Range;
q.longStackSupport = true;

var syntheticDbContent = {
  adgangspunkt: {
    "id": 1,
    "bkid": "efaae53e-b419-4f0e-bfa6-9097de8f79e2",
    "kildekode": 1,
    "kommunenummer": 881,
    "noejagtighedsklasse": "A",
    "placering": 5,
    "registrering": new Range('2014-05-09T10:31:44.290Z', null, '[)'),
    "retning": 71,
    "revisionsdato": "2014-05-08T22:00:00.000Z",
    "statuskode": 6,
    "tekniskstandard": "TK",
    "versionid": 1000,
    "esdhreference": "esdhref1",
    "journalnummer": "journalnummer1",
    "virkning": new Range('2014-05-09T10:31:44.290Z', null, '[)'),
    "geom": "0101000020E86400000AD7A3F0FA1F25417B14AE97D89D5741"
  },
  husnummer: {
    "adgangspunktid": 1,
    "bynavn": null,
    "husnummer": new Husnr(5, 'B'),
    "id": 3,
    "bkid": "2d324437-ed93-4c75-abac-922d5360c2db",
    "ikrafttraedelsesdato": null,
    "kildekode": 1,
    "postdistrikt": "Frederikssund",
    "postnummer": 3600,
    "registrering": new Range(null, null, 'empty'),
    "statuskode": 5,
    "vejkode": 1,
    "vejnavn": "A C Hansensvej",
    "versionid": 1002,
    "virkning": new Range("2014-04-14T12:26:12.770Z", "2014-04-14T12:26:13.533Z", '[)')
  },
  adresse: {
    "doerbetegnelse": "MF",
    "etagebetegnelse": "96",
    "husnummerid": 3,
    "id": 2,
    "bkid": "970c79e9-d60b-461e-9b9d-75a1c73b0273",
    "ikrafttraedelsesdato": null,
    "kildekode": 1,
    "registrering": new Range("2014-10-07T12:24:13.907Z", null, '[)'),
    "statuskode": 5,
    "versionid": 1001,
    "esdhreference": "esdhref2",
    "journalnummer": "journalnummer2",
    "virkning": new Range("2014-10-07T12:24:35.473Z", null, '[)')
  },
  streetname: {
    "id": "11111111-1111-1111-1111-111111111112",
    "adresseringsnavn": "Børges Bryggerivej",
    "aendringstimestamp": "2010-07-05T10:16:15.690Z",
    "kommunekode": 906,
    "navn": "Børges Bryggerivej",
    "ophoerttimestamp": null,
    "oprettimestamp": "1900-12-31T23:00:00.000Z",
    "vejkode": 5000
  },
  postnr: {
    "id": "11111111-1111-1111-1111-111111111113",
    "aendringstimestamp": "1900-12-31T23:00:00.000Z",
    "husnrinterval": new Range(new Husnr(13, 'B'), new Husnr(21, null), '[]'),
    "kommunekode": 906,
    "ophoerttimestamp": null,
    "oprettimestamp": null,
    "postdistriktnummer": 8000,
    "side": "U",
    "vejkode": 5000
  },
  supplerendebynavn: {
    "id": "11111111-1111-1111-1111-111111111111",
    "aendringstimestamp": "1900-12-31T23:00:00.000Z",
    "husnrinterval": new Range(new Husnr(13, 'B'), new Husnr(21, null), '[]'),
    "kommunekode": 906,
    "ophoerttimestamp": null,
    "oprettimestamp": null,
    "bynavn": 'Stavtrup',
    "side": "U",
    "vejkode": 5000
  }
};

var SYNTHETIC_DIR = path.join(__dirname, 'sampleDarFiles', 'synthetic');
var REAL_DIR = path.join(__dirname, 'sampleDarFiles', 'real');

function loadRawCsv(client, filePath, destionationTable) {
  var sql = "COPY " + destionationTable + " FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  var pgStream = client.query(copyFrom(sql));
  var source = fs.createReadStream(filePath, {encoding: 'utf-8'});
  return promisingStreamCombiner([source, pgStream]);
}

var csvSpec = darSpec.spec;
describe('Importing DAR CSV files to database', function () {
  describe('Import of sample files', function () {
    it('Should define 6 CSV specifications', function () {
      expect(Object.keys(csvSpec)).to.have.length(6);
    });
    _.forEach(csvSpec, function (spec, entityName) {
      it('Should import ' + entityName + ' correctly', function () {
        return testdb.withTransaction('empty', 'ROLLBACK', function (client) {
          return importDarImpl.loadCsvFile(client,
            path.join(SYNTHETIC_DIR, csvSpec[entityName].filename),
            spec.table, spec).then(function () {
              return q.ninvoke(client, 'query', "SELECT * FROM " + spec.table, []);
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
                expect(versionid).to.be.a.number;
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
          type: darSpec.types.uuid
        },
        {
          name: 'content',
          type: darSpec.types.string
        }],
      dbColumns: ['id', 'content']
    };

    function setupTable(client) {
      return client.queryp(
        'CREATE TEMP TABLE cur_table(' +
        ' versionid integer primary key,' +
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

    describe('Compute set of differences between for monotemporal table', function() {
      var monoCsvSpec = {
        bitemporal: false,
        idColumns: ['id'],
        columns: [
          {
            name: 'id',
            type: darSpec.types.uuid
          },
          {
            name: 'content',
            type: darSpec.types.string
          }],
        dbColumns: ['id', 'content']
      };

      function setupTable(client) {
        return client.queryp(
          'CREATE TEMP TABLE cur_table(' +
          ' versionid uuid primary key DEFAULT uuid_generate_v4(),' +
          ' id uuid not null,' +
          ' content text,' +
          " registrering tstzrange not null DEFAULT tstzrange(current_timestamp, null, '[)'))", [])
          .then(function () {
            return loadRawCsv(client,
              path.join(__dirname, 'sampleDarFiles', 'comparison_mono', 'table.csv'),
              'cur_table');
          });
      }

      testdb.withTransactionAll('empty', function (clientFn) {
        before(function () {
          var client = clientFn();
          return setupTable(client)
            .then(function () {
              return importDarImpl.internal.createTableAndLoadData(client,
                path.join(__dirname, 'sampleDarFiles', 'comparison_mono', 'desired_table.csv'),
                'desired_table',
                'cur_table',
                monoCsvSpec);
            })
            .then(function () {
              return importDarImpl.internal.computeDifferences(client, 'cur_table', 'desired_table', 'table', monoCsvSpec, false);
            })
            .then(function() {
              return client.queryp('SELECT * FROM cur_table', []);
            });
        });
        it('Should correctly compute the insert', function () {
          var client = clientFn();
          return client.queryp('SELECT * FROM insert_table', []).then(function (result) {
            expect(result.rows).to.have.length(1);
            var row = result.rows[0];
            expect(row.id).to.equal('11111111-1111-1111-1111-11111111111c');
            expect(row.content).to.equal('Created row');
          });
        });
        it('Should correctly compute the update', function () {
          var client = clientFn();
          return client.queryp("SELECT * FROM update_table", []).then(function (result) {
            expect(result.rows).to.have.length(1);
            var row = result.rows[0];
            expect(row.id).to.equal("11111111-1111-1111-1111-11111111111d");
            expect(row.content).to.equal('Modified row (modified)');
          });
        });
        it('Should correctly compute the delete', function() {
          var client = clientFn();
          return client.queryp("SELECT * FROM delete_table", []).then(function (result) {
            expect(result.rows).to.have.length(1);
            expect(result.rows[0]).to.deep.equal({id: "11111111-1111-1111-1111-11111111111b"});
          });
        });

      });

    });

    describe('Compute set of differences betweeen two bitemporal tables', function () {
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
              return importDarImpl.internal.computeDifferences(client, 'cur_table', 'desired_table', 'table', csvSpec, true);
            });
        });
        it('Should correctly compute the insert', function () {
          var client = clientFn();
          return client.queryp('SELECT * FROM insert_table', []).then(function (result) {
            expect(result.rows).to.have.length(1);
            expect(result.rows[0]).to.deep.equal({
              versionid: 3,
              id: '11111111-1111-1111-1111-11111111111c',
              content: 'Created row',
              registrering: new Range("2014-05-08T22:00:00.000Z", null, '[)'),
              virkning: new Range(null, null, '()')
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
              "registrering": new Range("2014-05-08T22:00:00.000Z", "2014-05-09T22:00:00.000Z", '[)'),
              "versionid": 4,
              "virkning": new Range(null, null, '()')
            });
          });
        });
        it('Should correctly compute the delete', function() {
          var client = clientFn();
          return client.queryp("SELECT * FROM delete_table", []).then(function (result) {
            expect(result.rows).to.have.length(1);
            expect(result.rows[0]).to.deep.equal({versionid: 2});
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
          return importDarImpl.updateTableFromCsv(client, desiredCsvPath, destinationTable, csvSpec, false)
            .then(function() {
              return client.queryp("SELECT * FROM " + destinationTable + " order by versionid", []);
            })
            .then(function(result) {
              expect(result.rows).to.have.length(3);
              var unmodified = result.rows[0];
              var created = result.rows[1];
              var updated = result.rows[2];
              expect(unmodified.versionid).to.equal(1);
              expect(created.versionid).to.equal(3);
              expect(updated.versionid).to.equal(4);
              expect(updated.registrering.upper).to.equal('2014-05-09T22:00:00.000Z');
            });
        });
      });
    });
  });

  describe('Incremental updates to DAR', function() {

  });

  describe.skip('Initialize database from scratch', function() {
    return testdb.withTransactionAll('empty', function(clientFn) {
      it('Can reinitialize db from real DAR CSV files', function() {
        this.timeout(240000);
        var client = clientFn();
        return importDarImpl.initFromDar(client, REAL_DIR, true);

      });
    });
  });
});