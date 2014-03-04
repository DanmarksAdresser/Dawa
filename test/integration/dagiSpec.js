"use strict";

var dagi = require('../../dagi');
var dbapi = require('../../dbapi');
var _ = require('underscore');
//var apiSpec = require('../../apiSpec');
//var apiSpecUtil = require('../../apiSpecUtil');

// der er 390 adgangsadresser inden for denne polygon
var sampleTema = {
  tema: 'region',
  kode: 10,
  navn: 'Test Region',
  geom: {"type": "MultiPolygon", "coordinates": [
    [[
      [582534.985506234, 6128945.80096767],
      [588883.402508489, 6129068.80096925],
      [588659.687757301, 6140196.17148899],
      [582534.985506234, 6128945.80096767]
    ]]
  ]}
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
          expect(result.rows[0].c).toBe('158');
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
        updated.geom.coordinates =
          [[[
            [585534.985506234, 6128945.80096767],
            [588883.402508489, 6129068.80096925],
            [588659.687757301, 6140196.17148899],
            [585534.985506234, 6128945.80096767]
          ]]];
        dagi.updateDagiTema(client, updated, function(err) {
          if(err) throw err;
          client.query("select count(*) as c FROM AdgangsAdresserDagiRel WHERE dagiTema = 'region' AND dagiKode = 10", [], function(err, result) {
            if(err) throw err;
            transactionDone();
            expect(result.rows[0].c).toBe('66');
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
        client.query("select count(*) as c FROM DagiTemaer WHERE to_tsquery('danish', 'Test') @@ tsv", function(err, result) {
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
          client.query("select count(*) as c FROM DagiTemaer WHERE to_tsquery('danish', 'Foo') @@ tsv", function(err, result) {
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