"use strict";

var expect = require('chai').expect;
var q = require('q');

var crud = require('../../crud/crud');
var nontemporal = require('../../darImport/nontemporal');
var qUtil = require('../../q-util');
var testdb = require('../helpers/testdb');

q.longStackSupport = true;

describe('nontemporal', function() {
  function createTestTables(client) {
    return client.queryp(
      'CREATE TEMP TABLE testtable(' +
      ' id1 integer not null,' +
      ' id2 integer not null,' +
      ' content text,' +
      ' primary key(id1, id2)); create temp table testsrctable (like testtable);', []);
  }

  var spec = {
    temporality: 'nontemporal',
    table: 'testtable',
    idColumns: ['id1', 'id2'],
    columns: ['id1', 'id2', 'content']
  };

  var srcTable = 'testsrctable';

  var srcDatamodel = {
    name: 'testentity',
    table: srcTable,
    key: spec.idColumns,
    columns: spec.columns
  };

  var dstDatamodel = {
    name: 'testentity',
    table: spec.table,
    key: spec.idColumns,
    columns: spec.columns
  };

  var specImpl = nontemporal(spec);

  function verifyTableContent(client, datamodel, table, expectedContent) {
    return client.queryp('SELECT * FROM ' + table + ' ORDER BY ' + datamodel.key.join(', '))
      .then(function(result) {
        expect(result.rows).to.deep.equal(expectedContent);
      });
  }

  testdb.withTransactionEach('empty', function(clientFn) {
    beforeEach(function() {
       return createTestTables(clientFn());
    });

    function loadContent(client, srcContent, dstContent) {
      return qUtil.mapSerial(srcContent, function(row) {
        return crud.create(client, srcDatamodel, row);
      })
        .then(function() {
          return qUtil.mapSerial(dstContent, function(row) {
            return crud.create(client, dstDatamodel, row);
          });
        });
    }

    describe('Computing differences between two nontemporal tables', function () {
      function computeAndVerify(client, expectedInserts, expectedUpdates, expectedDeletes) {
        return specImpl.computeDifferences(client, srcTable, spec.table, spec.table)
          .then(function() {
            return verifyTableContent(client, srcDatamodel, 'insert_' + spec.table, expectedInserts);
          })
          .then(function() {
            return verifyTableContent(client, srcDatamodel, 'update_' + spec.table, expectedUpdates);
          })
          .then(function() {
            return verifyTableContent(client, srcDatamodel, 'delete_' + spec.table, expectedDeletes);
          });
      }

      var existingObject = {id1: 1, id2: 3, content: 'bar'};
      it('Should compute nothing if there is no differences between tables', function () {
        var client = clientFn();
        return loadContent(client, [existingObject], [existingObject])
          .then(function() {
            return computeAndVerify(client, [], [],[]);
          });
      });
      it('Should compute an insert if there is a new row in source table', function () {
        var client = clientFn();
        var newObject = {id1: 1, id2: 2, content: 'foo'};
        return loadContent(client, [newObject,existingObject], [existingObject])
          .then(function() {
            return computeAndVerify(client, [newObject], [],[]);
          });
      });
      it('Should compute an update if an existing row has changed', function () {
        var client = clientFn();
        var existingObject = {id1: 1, id2: 2, content: 'foo'};
        var updatedObject = {id1: 1, id2: 2, content: 'bar'};
        return loadContent(client, [updatedObject], [existingObject])
          .then(function() {
            return computeAndVerify(client, [], [updatedObject],[]);
          });
      });
      it('Should compute a delete if an existing row has been removed', function () {
        var client = clientFn();
        var existingObject = {id1: 1, id2: 2, content: 'foo'};
        return loadContent(client, [], [existingObject])
          .then(function() {
            return computeAndVerify(client, [], [],[{id1: 1, id2: 2}]);
          });
      });

    });

    describe('Applying changes to nontemporal tables', function() {
      it('Should correctly apply an insert', function() {
        var client = clientFn();
        var newObject = {id1: 1, id2: 2, content: 'foo'};
        return loadContent(client, [newObject], [])
          .then(function() {
            return specImpl.compareAndUpdate(client, srcTable, spec.table);
          })
          .then(function() {
            return verifyTableContent(client, dstDatamodel, spec.table, [newObject]);
          });
      });
      it('Should correctly apply an update', function() {
        var client = clientFn();
        var existing = {id1: 1, id2: 2, content: 'foo'};
        var unmodified = {id1: 1, id2: 3, content: 'unmodified'};
        var updated = {id1: 1, id2: 2, content: 'updated'};
        return loadContent(client, [unmodified, updated], [existing, unmodified])
          .then(function() {
            return specImpl.compareAndUpdate(client, srcTable, spec.table);
          })
          .then(function() {
            return verifyTableContent(client, dstDatamodel, spec.table, [updated, unmodified]);
          });
      });
      it('Should correctly apply a delete', function() {
        var client = clientFn();
        var existing = {id1: 1, id2: 2, content: 'foo'};
        var unmodified = {id1: 1, id2: 3, content: 'unmodified'};
        return loadContent(client, [unmodified], [existing, unmodified])
          .then(function() {
            return specImpl.compareAndUpdate(client, srcTable, spec.table);
          })
          .then(function() {
            return verifyTableContent(client, dstDatamodel, spec.table, [unmodified]);
          });
      });
    });
  });
});
