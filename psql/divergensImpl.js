"use strict";

var _ = require('underscore');
var Q = require('q');

var crud = require('../crud/crud');
var dataUtil = require('./dataUtil');
var datamodels = require('../crud/datamodel');
var dbapi = require('../dbapi');
var loadAdresseData = require('./load-adresse-data-impl');

var baseDatamodels = {
  adgangsadresse: datamodels.adgangsadresse,
  adresse: datamodels.adresse,
  vejstykke: datamodels.vejstykke
};

function resolveArguments(func) {
  return function() {
    return Q.all(arguments).then(function(result) {
      return func.apply(undefined, result);
    });
  };
}

function callSequentially(funcs, initialValue) {
  return funcs.reduce(Q.when, Q(initialValue));
}

function getBbrSequenceNumber (udtraekOptions) {
  var fileStreams = loadAdresseData.bbrFileStreams(udtraekOptions.dataDir, udtraekOptions.filePrefix);
  return Q.nfcall(loadAdresseData.loadBbrMeta, fileStreams).then(function(bbrMeta) {
    return bbrMeta.totalSendteHaendelser - 1;
  });
}

function getDawaSequenceNumber(client, udtraekOptions, comparisonOptions) {
  var compareWithCurrent  = comparisonOptions.compareWithCurrent;
  var forceDawaSequenceNumber = comparisonOptions.forceDawaSequenceNumber;

  var getDawaSequenceNumberForBbrEvent = resolveArguments(function(bbrSequenceNumber) {
    return Q.ninvoke(client, 'query', 'SELECT sequence_number_to FROM bbr_events WHERE sekvensnummer = $1', [bbrSequenceNumber]).then(function(result) {
      if(result.rows && result.rows.length > 0) {
        return result.rows[0].sequence_number_to;
      }
      else {
        throw new Error('No BBR event for BBR sequence number ' + bbrSequenceNumber);
      }
    });
  });

  var getNextDawaSequenceNumber = function() {
    return Q.ninvoke(client, 'query', 'SELECT MAX(sequence_number) as last_sequence_number FROM transaction_history', []).then(function(result) {
      return (result.rows[0].last_sequence_number || 0) + 1;
    });
  };

  if(compareWithCurrent) {
    return getNextDawaSequenceNumber();
  }
  else if (forceDawaSequenceNumber !== undefined) {
    console.log("FORCING DAWA SEQUENCE NUMBER " + forceDawaSequenceNumber);
    return forceDawaSequenceNumber;
  }
  else {
    return getDawaSequenceNumberForBbrEvent(getBbrSequenceNumber(udtraekOptions));
  }
}

/**
 * Returns true if two values as returned by PostgreSQL is equal
 */
function isPostgresValuesEqual(expectedValue, actualValue) {
  if(_.isDate(expectedValue) && _.isDate(actualValue)) {
    return expectedValue.getTime() === actualValue.getTime();
  }
  return expectedValue === actualValue;
}

/**
 * Interprets a query result and produces a report of the differences
 */
function interpretDifferences(datamodel, queryResult) {
  return _.reduce(queryResult, function(memo, row) {
    var actual_id = _.reduce(datamodel.key, function(memo, keyColumn) {
      memo[keyColumn] = row['a_' + keyColumn];
      return memo;
    }, {});
    var expected_id =_.reduce(datamodel.key, function(memo, keyColumn) {
      memo[keyColumn] = row['e_' + keyColumn];
      return memo;
    }, {});
    if(_.isEqual(actual_id, expected_id)) {
      // an update
      var differences = _.reduce(datamodel.columns, function(memo, column) {
        var expectedValue = row['e_' + column];
        var actualValue = row['a_' + column];
        if(!isPostgresValuesEqual(expectedValue, actualValue)) {
          memo[column] = {
            expected: expectedValue,
            actual: actualValue
          };
        }
        return memo;
      }, {});
      memo.updates.push({
        id: actual_id,
        differences: differences
      });
    }
    else if(_.every(_.values(actual_id), function(value) { return value === null; })) {
      // insert
      var object = _.reduce(datamodel.columns, function(memo, column) {
        memo[column] = row['e_' + column];
        return memo;
      }, {});
      memo.inserts.push({id: expected_id, object: object});
    }
    else if(_.every(_.values(expected_id), function(value) { return value === null; })) {
      // delete
      memo.deletes.push({id: actual_id});
    }
    else {
      throw new Error("Could somehow not detect whether difference was an insert, update or delete");
    }
    return memo;
  }, {updates: [], inserts: [], deletes: []});
}

/**
 * Returns true if the object specified by key has modifications later than sequenceNumber
 */
function hasLaterUpdates(client, datamodel, sequenceNumber, key, callback) {
  var sqlParts  = {
    select: ['count(*) > 0 as has_later_updates'],
    from: [datamodel.table + "_history"],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };

  crud.applyFilter(datamodel, sqlParts, key);
  var sequenceNumberAlias = dbapi.addSqlParameter(sqlParts, sequenceNumber);
  dbapi.addWhereClause(sqlParts, 'valid_from > ' + sequenceNumberAlias + ' OR valid_to > ' + sequenceNumberAlias);
  dbapi.query(client, sqlParts, function(err, result) {
    if(err) {
      return callback(err);
    }
    callback(null, result[0].has_later_updates);
  });

}

function unlessUpdatedLater(client, datamodel, dawaSequenceNumber, id, func) {
  return Q.nfcall(hasLaterUpdates, client, datamodel, dawaSequenceNumber, id).then(function(hasLaterUpdates) {
    if(hasLaterUpdates) {
      return;
    }
    else {
      return func();
    }
  });
}

/**
 * Given a report of differences, performs a sequence of database queries to fix the differences for all the datamodels.
 * In some cases, an object has already been modified/deleted, in which case the difference cannot be
 * rectified. The report is updated to indicate whether each difference has been rectified.
 */
exports.rectifyAll = function(client, report) {
  var ops = ['vejstykke', 'adgangsadresse', 'adresse'].map(function(datamodelName) {
    return function() {
      return exports.rectifyDifferences(client, datamodels[datamodelName], report[datamodelName], report.meta.dawaSequenceNumber);
    };
  });
  if(report.meta.compareWithCurrent) {
    ops.push(function() {
      return Q.ninvoke(client, 'query', 'UPDATE bbr_sekvensnummer SET  sequence_number = $1', [report.meta.bbrSequenceNumber]);
    });
  }
  return callSequentially(ops).then(function() {
    return report;
  });
};

/**
 * Given a report of differences for a single datamodel, performs a sequence of database queries to fix the differences
 * In some cases, an object has already been modified/deleted, in which case the difference cannot be
 * rectified. The differences is updated to indicate whether each difference has been rectified.
 */
exports.rectifyDifferences = function (client, datamodel, differences, udtraekDawaSequenceNumber) {
  function rectifyUpdates() {
    var ops = differences.updates.map(function(update) {
      return function() {
        update.rectified = false;
        return unlessUpdatedLater(client, datamodel, udtraekDawaSequenceNumber, update.id, function() {
          update.rectified = true;
          var object = _.clone(update.id);
          _.extend(object, _.reduce(update.differences, function (memo, value, key) {
            memo[key] = value.expected;
            return memo;
          }, {}));
          return Q.nfcall(crud.update, client, datamodel, object);
        });
      };
    });
    return callSequentially(ops);
  }

  function rectifyInserts() {
    var ops  = differences.inserts.map(function(insert) {
      return function() {
        insert.rectified = false;
        return unlessUpdatedLater(client, datamodel, udtraekDawaSequenceNumber, insert.id, function() {
          insert.rectified = true;
          return Q.nfcall(crud.create, client, datamodel, insert.object);
        });
      };
    });
    return callSequentially(ops);
  }

  function rectifyDeletes() {
    var ops = differences.deletes.map(function(del) {
      return function() {
        del.rectified = false;
        return unlessUpdatedLater(client, datamodel, udtraekDawaSequenceNumber, del.id, function() {
          del.rectified = true;
          return Q.nfcall(crud.delete, client, datamodel, del.id);
        });
      };
    });
    return callSequentially(ops);
  }
  return callSequentially([rectifyDeletes, rectifyInserts, rectifyUpdates ]);
};

function createTempTable(client, tempTableName, srcTable) {
  return Q.nfcall(dataUtil.createTempTable, client, tempTableName, srcTable);
}

/**
 * create a temp table for each baseDatamodel where the table name is prefixed with tablePrefix.
 */
function createTempTables(client, tablePrefix) {
  return Object.keys(baseDatamodels).map(function (dataModelName) {
    var datamodel = baseDatamodels[dataModelName];
    return function () {
      return createTempTable(client, tablePrefix + datamodel.table, datamodel.table);
    };
  }).reduce(Q.when, Q.when(null));
}

function loadDataIntoTempTables(client, udtraekOptions, tablePrefix) {
  var options = _.clone(udtraekOptions);
  options.tablePrefix = tablePrefix;
  return Q.nfcall(loadAdresseData.loadCsvOnly, client, options);
}

function createSnapshot(client, datamodel, dawaSequenceNumber, snapshotTableName) {
  return createTempTable(client, snapshotTableName, datamodel.table).then(function() {
    var sql = 'INSERT INTO ' + snapshotTableName + '(' + datamodel.columns.join(', ') + ') (' + dataUtil.snapshotQuery(datamodel, '$1') + ')';
    return Q.ninvoke(client, 'query', sql, [dawaSequenceNumber]);
  });
}

function computeTableDifferences(client, datamodel, actualTableName, expectedTableName, batchSize) {
  return Q.nfcall(dataUtil.queryDifferences, client, expectedTableName, actualTableName, datamodel, batchSize).then(function(result) {
    return interpretDifferences(datamodel, result);
  });
}

function computeDifferenceReport(client, datamodel, dawaSequenceNumber, expectedTableName, batchSize) {
  var actualTablePrefix = 'actual_';
  var snapshotTableName = actualTablePrefix + datamodel.table;
  return createSnapshot(client, datamodel, dawaSequenceNumber, snapshotTableName).then(function() {
    return computeTableDifferences(client, datamodel, snapshotTableName, expectedTableName, batchSize);
  }).then(function(report) {
    return Q.nfcall(dataUtil.dropTable, client, snapshotTableName).then(function() {
      return report;
    });
  });
}

function dropTempTables(client, tablePrefix) {
  var ops = Object.keys(baseDatamodels).map(function(datamodelName) {
    return function() {
      return Q.nfcall(dataUtil.dropTable, client, tablePrefix + datamodels[datamodelName].table);
    };
  });
  return callSequentially(ops);
}

exports.computeTableDifferences = computeTableDifferences;

exports.divergenceReport = function (client, loadAdresseDataOptions, comparisonOptions) {
  console.log("Comparison options: " + JSON.stringify(comparisonOptions));
  var expectedTablePrefix = 'expected_';
  var dawaSequenceNumber = getDawaSequenceNumber(client, loadAdresseDataOptions, comparisonOptions);

  var loadDataPromise = createTempTables(client, expectedTablePrefix).then(function () {
    return loadDataIntoTempTables(client, loadAdresseDataOptions, expectedTablePrefix);
  });

  var bbrSequenceNumberPromise = getBbrSequenceNumber(loadAdresseDataOptions);

  return Q.spread([dawaSequenceNumber, bbrSequenceNumberPromise, loadDataPromise], function (dawaSequenceNumber, bbrSequenceNumber) {
    return ['vejstykke', 'adgangsadresse', 'adresse'].map(function (dataModelName) {
      return function (fullReport) {
        return computeDifferenceReport(client, datamodels[dataModelName], dawaSequenceNumber, expectedTablePrefix + datamodels[dataModelName].table, comparisonOptions.batchSize)
          .then(function (entityReport) {
            fullReport[dataModelName] = entityReport;
            return fullReport;
          });
      };
    }).reduce(Q.when, Q.when({
        meta: {
          dawaSequenceNumber: dawaSequenceNumber,
          bbrSequenceNumber: bbrSequenceNumber,
          compareWithCurrent: !!comparisonOptions.compareWithCurrent
        }
      })).then(function(report) {
        return dropTempTables(client, expectedTablePrefix).then(function() {
          return report;
        });
    });
  });
};