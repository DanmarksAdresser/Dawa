"use strict";

var expect = require('chai').expect;
var q = require('q');
var _ = require('underscore');

var dagiTemaer = require('../../apiSpecification/temaer/temaer');
var dbapi = require('../../dbapi');
var tema = require('../../temaer/tema');
var transactions = require('../../psql/transactions');

// der er 390 adgangsadresser inden for denne polygon
var sampleTema = {
  tema: 'region',
  fields: {
    kode: 10,
    navn: 'Test Region xxyyzz'
  },
  polygons: ['POLYGON((' +
    '725025.18 6166264.37,' +
    '725025.18 6167537.76,' +
    '731289.6 6167537.76,' +
    '731289.6 6166264.37,' +
    '725025.18 6166264.37))']
};

var sampleTemaDef = _.findWhere(dagiTemaer, { singular: sampleTema.tema });

describe('DAGI updates', function() {
  it('When adding a new DAGI tema, the adgangsadresser_temaer_matview table should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) { throw err; }
      tema.addTema(client, sampleTema, function(err, createdTemaId) {
        if(err) { throw err; }
        tema.updateAdresserTemaerView(client, sampleTemaDef, false).nodeify(function(err) {
          if(err) { throw err; }
          client.query("select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1", [createdTemaId], function(err, result) {
            if(err) { throw err; }
            transactionDone();
            expect(result.rows[0].c).to.equal('277');
            done();
          });
        });
      });
    });
  });

  it('When deleting a DAGI tema, the adgangsadresser_temaer_matview table should be updated', function() {
    return transactions.withTransaction({
      connString: process.env.pgConnectionUrl,
      mode: 'ROLLBACK'
    }, function (client) {
      tema.addTema(client, sampleTema)
        .then(function (createdTemaId) {
          return tema.deleteTema(client, sampleTemaDef, sampleTema).then(function () {
            return q.ninvoke(client, 'query',
              "select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1",
              [createdTemaId]);
          });
        }).then(function (result) {
          expect(result.rows[0].c).to.equal('0');
        });
    });
  });

  describe('Update of DAGI tema', function() {
    var transactionDone, updated, client, createdTemaId;

    beforeEach(function(done) {
      dbapi.withRollbackTransaction(function(err, _client, _transactionDone) {
        if(err) { throw err; }
        transactionDone = _transactionDone;
        client = _client;
        tema.addTema(client, sampleTema, function(err, _createdTemaId) {
          createdTemaId = _createdTemaId;
          if(err) { throw err; }
          updated = _.clone(sampleTema);
          updated.polygons=['POLYGON((' +
            '725025.18 6166264.37,' +
            '725025.18 6167400.76,' +
            '731289.6 6167400.76,' +
            '731289.6 6166264.37,' +
            '725025.18 6166264.37))'];
          tema.updateTema(client, sampleTemaDef, updated, function(err) {
            if (err) { throw err; }
            tema.updateAdresserTemaerView(client, sampleTemaDef, false).nodeify( done);
          });
        });
      });
    });

    it('When updating a DAGI tema, the adgangsadresser_temaer_matview table should be updated', function(done) {
      client.query(
        "select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1",
        [createdTemaId],
        function (err, result) {
          if (err) { throw err; }
          transactionDone();
          expect(result.rows[0].c).to.equal('226');
          done();
        });
    });

    it('When updating a tema, the geo_version should be updated', function(done) {
      client.query("select geo_version from temaer where id = $1", [createdTemaId], function(err, result) {
        if(err) { throw err; }
        expect(result.rows[0].geo_version).to.equal(2);
        transactionDone();
        done();
      });
    });
  });

  it('When adding a new DAGI tema, the tsv column should be populated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) { throw err; }
      tema.addTema(client, sampleTema, function(err) {
        if(err) { throw err; }
        client.query("select count(*) as c FROM temaer WHERE to_tsquery('adresser', 'xxyyzz') @@ tsv", function(err, result) {
          if(err) { throw err; }
          transactionDone();
          expect(result.rows[0].c).to.equal('1');
          done();
        });
      });
    });
  });

  it('When updating a DAGI tema, the tsv column should be updated', function() {
    return transactions.withTransaction({
      connString: process.env.pgConnectionUrl,
      mode: 'ROLLBACK'
    }, function(client) {
      return tema.addTema(client, sampleTema).then(function() {
        var updated = _.clone(sampleTema);
        updated.fields.navn = 'Foo';
        return tema.updateTema(client, sampleTemaDef, updated);
      }).then(function() {
        return q.ninvoke(client, 'query', "select count(*) as c FROM temaer WHERE to_tsquery('adresser', 'Foo') @@ tsv", []);
      }).then(function(result) {
        expect(result.rows[0].c).to.equal('1');
      });
    });
  });
});