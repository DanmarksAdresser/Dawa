"use strict";

var importDarImpl = require('../../darImport/importDarImpl');
var testdb = require('./testdb');

function withDarTransaction(dbname, transactionFn, beforeFn, afterFn) {
  var prevDawaSeqNum;
  testdb.withTransactionX(dbname, function(clientFn) {
    beforeFn(function() {
      return importDarImpl.beginDarTransaction(clientFn()).then(function(seqNum) {
        prevDawaSeqNum = seqNum;
      });
    });
    transactionFn(clientFn);
    afterFn(function() {
      return importDarImpl.endDarTransaction(clientFn(), prevDawaSeqNum);
    });
  }, beforeFn, afterFn);

}

exports.withDarTransactionAll = function(dbname, transactionFn) {
  return withDarTransaction(dbname, transactionFn, before, after);
};

exports.withDarTransactionEach = function(dbname, transactionFn) {
  return withDarTransaction(dbname, transactionFn, beforeEach, afterEach);
};
