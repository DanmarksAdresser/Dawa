"use strict";

var _ = require('underscore');

var qUtil = require('../../q-util');
var crud = require('../../crud/crud');
var darSpec = require('../../darImport/darSpec');
var testObjects = require('./testObjects');

exports.initTable = function(client, datamodel, objects) {
  return qUtil.mapSerial(objects, function(object) {
    return crud.create(client, datamodel, object);
  });
};

exports.initDarTable = function(client, csvSpec, table, rows) {
  var datamodel = {
    table: table,
    columns: csvSpec.dbColumns.concat(['versionid', 'registrering']),
    key: ['versionid']
  };
  if(csvSpec.bitemporal) {
    datamodel.columns.push('virkning');
  }
  return qUtil.mapSerial(rows, function(row) {
    var transformed = darSpec.transform(csvSpec, row);
    return crud.create(client, datamodel, transformed);
  });
};

function bitemporalUpdateRows(currentRow, generateVersionIdFn, updateTs, updateState) {
  var expiredRow = _.clone(currentRow);
  expiredRow.registreringslut = updateTs;
  var historicRow = _.clone(currentRow);
  historicRow.versionid = generateVersionIdFn();
  historicRow.virkningslut = updateTs;
  var insertedRow = _.clone(currentRow);
  insertedRow.versionid = generateVersionIdFn();
  insertedRow.registreringstart = updateTs;
  insertedRow.virkningstart = updateTs;
  _.extend(insertedRow, updateState);
  return [expiredRow, historicRow, insertedRow];
}

/*
 * Initialize a DAR table with multiple changes to a single object.
 *
 * @param client
 * @param csvSpec
 * @param table
 * @param sampleObject
 * @param history
 */
exports.initDarHistory = function(client, csvSpec, table, sample, createState, updateState, updateTs) {
  var inserted = testObjects.generate(csvSpec.bitemporal ? 'bitemporal' : 'monotemporal', sample, createState);
  var rows = bitemporalUpdateRows(inserted, testObjects.generateVersionId, updateTs, updateState);
  return exports.initDarTable(client, csvSpec, table, rows);
};