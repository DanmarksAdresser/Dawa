"use strict";

var tema = require('../../temaer/tema');
var dagiTemaer = require('../../apiSpecification/temaer/temaer');
var dbapi = require('../../dbapi');
var _ = require('underscore');

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
        tema.updateAdresserTemaerView(client, 'region').nodeify(function(err) {
          if(err) { throw err; }
          client.query("select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1", [createdTemaId], function(err, result) {
            if(err) { throw err; }
            transactionDone();
            expect(result.rows[0].c).toBe('277');
            done();
          });
        });
      });
    });
  });

  it('When deleting a DAGI tema, the adgangsadresser_temaer_matview table should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) { throw err; }
      tema.addTema(client, sampleTema, function(err, createdTemaId) {
        if(err) { throw err; }
        tema.deleteTema(client, sampleTemaDef, sampleTema, function(err) {
          if(err) { throw err; }
          client.query("select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1", [createdTemaId], function(err, result) {
            if(err) { throw err; }
            transactionDone();
            expect(result.rows[0].c).toBe('0');
            done();
          });
        });
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
            tema.updateAdresserTemaerView(client, 'region').nodeify( done);
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
          expect(result.rows[0].c).toBe('226');
          done();
        });
    });

    it('When updating a tema, the geo_version should be updated', function(done) {
      client.query("select geo_version from temaer where id = $1", [createdTemaId], function(err, result) {
        if(err) { throw err; }
        expect(result.rows[0].geo_version).toBe(2);
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
          expect(result.rows[0].c).toBe('1');
          done();
        });
      });
    });
  });

  it('When updating a DAGI tema, the tsv column should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) { throw err; }
      tema.addTema(client, sampleTema, function(err) {
        if(err) { throw err; }
        var updated = _.clone(sampleTema);
        updated.fields.navn = 'Foo';
        tema.updateTema(client, sampleTemaDef, updated, function(err) {
          if(err) { throw err; }
          client.query("select count(*) as c FROM temaer WHERE to_tsquery('adresser', 'Foo') @@ tsv", function(err, result) {
            if(err) { throw err; }
            transactionDone();
            expect(result.rows[0].c).toBe('1');
            done();
          });
        });
      });
    });
  });
});