"use strict";

var dagi = require('../../dagiImport/dagi');
var dbapi = require('../../dbapi');
var _ = require('underscore');

// der er 390 adgangsadresser inden for denne polygon
var sampleTema = {
  tema: 'region',
  kode: 10,
  navn: 'Test Region',
  polygons: ['POLYGON((' +
    '725025.18 6166264.37,' +
    '725025.18 6167537.76,' +
    '731289.6 6167537.76,' +
    '731289.6 6166264.37,' +
    '725025.18 6166264.37))']
};

describe('DAGI updates', function() {
  it('When adding a new DAGI tema, the AdgangsAdresserDagiRel table should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) throw err;
      dagi.addDagiTema(client, sampleTema, function(err) {
        if(err) throw err;
        client.query("select count(*) as c FROM AdgangsAdresserDagiRel WHERE dagiTema = 'region' AND dagiKode = 10", [], function(err, result) {
          if(err) throw err;
          transactionDone();
          expect(result.rows[0].c).toBe('277');
          done();
        });
      });
    });
  });

  it('When deleting a DAGI tema, the AdgangsAdresserDagiRel table should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) throw err;
      dagi.addDagiTema(client, sampleTema, function(err) {
        if(err) throw err;
        dagi.deleteDagiTema(client, sampleTema, function(err) {
          client.query("select count(*) as c FROM AdgangsAdresserDagiRel WHERE dagiTema = 'region' AND dagiKode = 10", [], function(err, result) {
            if(err) throw err;
            transactionDone();
            expect(result.rows[0].c).toBe('0');
            done();
          });
        });
      });
    });
  });

  it('When updating a DAGI tema, the AdgangsAdresserDagiRel table should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) throw err;
      dagi.addDagiTema(client, sampleTema, function(err) {
        if(err) throw err;
        var updated = _.clone(sampleTema);
        updated.polygons=['POLYGON((' +
          '725025.18 6166264.37,' +
          '725025.18 6167400.76,' +
          '731289.6 6167400.76,' +
          '731289.6 6166264.37,' +
          '725025.18 6166264.37))'];
        dagi.updateDagiTema(client, updated, function(err) {
          if(err) throw err;
          client.query("select count(*) as c FROM AdgangsAdresserDagiRel WHERE dagiTema = 'region' AND dagiKode = 10", [], function(err, result) {
            if(err) throw err;
            transactionDone();
            expect(result.rows[0].c).toBe('226');
            done();
          });
        });
      });
    });
  });

  it('When adding a new DAGI tema, the tsv column should be populated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) throw err;
      dagi.addDagiTema(client, sampleTema, function(err) {
        if(err) throw err;
        client.query("select count(*) as c FROM DagiTemaer WHERE to_tsquery('adresser', 'Test') @@ tsv", function(err, result) {
          if(err) throw err;
          transactionDone();
          expect(result.rows[0].c).toBe('1');
          done();
        });
      });
    });
  });

  it('When updating a DAGI tema, the tsv column should be updated', function(done) {
    dbapi.withRollbackTransaction(function(err, client, transactionDone) {
      if(err) throw err;
      dagi.addDagiTema(client, sampleTema, function(err) {
        if(err) throw err;
        var updated = _.clone(sampleTema);
        updated.navn = 'Foo';
        dagi.updateDagiTema(client, updated, function(err) {
          if(err) throw err;
          client.query("select count(*) as c FROM DagiTemaer WHERE to_tsquery('adresser', 'Foo') @@ tsv", function(err, result) {
            if(err) throw err;
            transactionDone();
            expect(result.rows[0].c).toBe('1');
            done();
          });
        });
      });
    });
  });
});