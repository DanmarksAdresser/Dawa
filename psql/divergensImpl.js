"use strict";

var async = require('async');
var _ = require('underscore');
var winston = require('winston');

var crud = require('../crud/crud');
var dataUtil = require('./dataUtil');
var datamodels = require('../crud/datamodel');
var dbapi = require('../dbapi');
var loadAdresseData = require('./load-adresse-data-impl');

//var autoPromise = require('../autoPromise');

var baseDatamodels = {
  adgangsadresse: datamodels.adgangsadresse,
  enhedsadresse: datamodels.enhedsadresse,
  vejstykke: datamodels.vejstykke,
  postnummer: datamodels.postnummer
};

exports.getBbrSequenceNumber = function(options) {
  return function(cb) {
    var fileStreams = loadAdresseData.bbrFileStreams(options.dataDir, options.filePrefix);
    loadAdresseData.loadBbrMeta(fileStreams, function(err, meta) {
      if(err) {
        cb(err);
        return;
      }
      cb(null, meta.sidstSendtHaendelsesNummer || 0);
    });
  };
};

/**
 * Queries for the dawa sequence number for a specific BBR event, that is, the last dawa sequence number the event
 * caused.
 */
function queryDawaSequenceNumberForBbrEvent(client, udtraekBbrSekvensnummer, callback) {
  client.query('SELECT sequence_number_to FROM bbr_events WHERE sekvensnummer = $1', [udtraekBbrSekvensnummer], function (err, result) {
    if (err) {
      return callback(err);
    }
    if (result.rows && result.rows.length > 0) {
      callback(null, result.rows[0].sequence_number_to);
    }
    else {
      callback(new Error('No BBR event for BBR sequence number ' + udtraekBbrSekvensnummer));
    }
  });
}

/**
 * Queries for the next DAWA sequence number
 */
function getNextDawaSequenceNumber(client, callback) {
  client.query('SELECT MAX(sequence_number) as last_sequence_number FROM transaction_history', [], function(err, result) {
    if(err) {
      return callback(err);
    }
    console.log(JSON.stringify(result));
    callback(null, (result.rows[0].last_sequence_number || 0) + 1);
  });
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
        console.log('expected: ' + expectedValue + ' actual: ' + actualValue);
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

/**
 * Given a report of differences, performs a sequence of database queries to fix the differences
 * In some cases, an object has already been modified/deleted, in which case the difference cannot be
 * rectified.
 */
exports.rectifyDifferences = function (client, datamodel, differences, udtraekDawaSequenceNumber, callback) {
  console.log(JSON.stringify(differences));
  function rectifyUpdates(callback) {
    async.eachSeries(differences.updates, function (update, callback) {
      hasLaterUpdates(client, datamodel, udtraekDawaSequenceNumber, update.id, function(err, hasLaterUpdates) {
        if(err) {
          return callback(err);
        }
        update.rectified = !hasLaterUpdates;

        if(hasLaterUpdates) {
          console.log('object ' + JSON.stringify(update.id) + ' had later updates');
          return callback(null);
        }
        var object = _.clone(update.id);
        _.extend(object, _.reduce(update.differences, function (memo, value, key) {
          memo[key] = value.expected;
          return memo;
        }, {}));

        crud.update(client, datamodel, object, callback);
      });
    }, function(err) {
      callback(err, differences);
    });
  }

  function rectifyInserts(callback) {
    async.eachSeries(differences.inserts, function(insert, callback) {
      hasLaterUpdates(client, datamodel, udtraekDawaSequenceNumber, insert.id, function(err, hasLaterUpdates) {
        if(err) {
          return callback(err);
        }
        insert.rectified = !hasLaterUpdates;
        if(hasLaterUpdates) {
          return callback(null);
        }
        crud.create(client, datamodel, insert.object, callback);
      });
    }, callback);
  }

  function rectifyDeletes(callback) {
    async.eachSeries(differences.deletes, function(del, callback) {
      hasLaterUpdates(client, datamodel, udtraekDawaSequenceNumber, del.id, function(err, hasLaterUpdates) {
        if(err) {
          return callback(err);
        }
        del.rectified = !hasLaterUpdates;
        if(hasLaterUpdates) {
          return callback(null);
        }
        crud.delete(client, datamodel, del.id, callback);
      });
    }, callback);
  }


  async.series([
    rectifyUpdates,
    rectifyInserts,
    rectifyDeletes
  ], function(err) {
    callback(err, differences);
  });
};

function computeDifferencesForModel(client, dataModelName, actualTablePrefix, expectedTablePrefix, udtraekDawaSequenceNumber, cb) {
  var datamodel = baseDatamodels[dataModelName];
  var actualTableName = actualTablePrefix + datamodel.table;
  async.waterfall([
    function (callback) {
      dataUtil.createTempTable(client, actualTableName, datamodel.table, function (err) {
        callback(err);
      });
    },
    function (callback) {
      console.log('inserting snapshot into temp table');
      var sql = 'INSERT INTO ' + actualTableName + '(' + datamodel.columns.join(', ') + ') (' + dataUtil.snapshotQuery(datamodel, '$1') + ')';
      console.log(sql);
      console.log('udtraekDawaSequenceNumber: ' + udtraekDawaSequenceNumber);
      client.query(sql, [udtraekDawaSequenceNumber], function (err) {
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    },
    function (callback) {
      console.log('querying for differences');
      dataUtil.queryDifferences(client, expectedTablePrefix + datamodel.table, actualTableName, datamodel, function (err, result) {
        if (err) {
          return callback(err);
        }
        callback(null, interpretDifferences(datamodel, result));
      });
    }
  ], cb);
}
exports.divergence = function(client, loadAdresseDataOptions, compareWithCurrent, callback) {
  var expectedTablePrefix = 'expected_';
  var actualTablePrefix = 'actual_';

  loadAdresseDataOptions.tablePrefix =  expectedTablePrefix;


  var report = {};
  var udtraekBbrSekvensnummer, dawaSequenceNumber;
  async.series([
    function(cb) {
      if(loadAdresseDataOptions.format === 'bbr') {
        exports.getBbrSequenceNumber(loadAdresseDataOptions)(function(err, bbrSekvensnummer) {
          udtraekBbrSekvensnummer = bbrSekvensnummer;
          cb(err);
        });
      }
      else {
        cb();
      }
    },
    function(cb) {
      console.log('extracting correct dawa sequence number');
      if (!compareWithCurrent) {
        queryDawaSequenceNumberForBbrEvent(client, udtraekBbrSekvensnummer, function(err, result) {
          if(err) {
            return cb(err);
          }
          dawaSequenceNumber = result;
          cb();
        });
      }
      else {
        getNextDawaSequenceNumber(client, function(err, result) {
          if(err) {
            return cb(err);
          }
          dawaSequenceNumber = result;
          cb();
        });
      }
    },
    function(cb) {
      async.eachSeries(_.keys(baseDatamodels), function(dataModelName, cb) {
        var datamodel = baseDatamodels[dataModelName];
        dataUtil.createTempTable(client, expectedTablePrefix + datamodel.table, datamodel.table, cb);
      }, cb);
    },
    function(cb) {
      winston.info('loading files into temporary tables');
      loadAdresseData.loadCsvOnly(client, loadAdresseDataOptions, cb);
    },
    function(cb) {
      winston.info('Computing snapshots from history');
      report.meta = {
        dawaSequenceNumber: dawaSequenceNumber
      };
      async.eachSeries(_.keys(baseDatamodels), function(dataModelName, cb) {
        computeDifferencesForModel(client, dataModelName, actualTablePrefix, expectedTablePrefix, dawaSequenceNumber, function(err, differences) {
          if(err) {
            return cb(err);
          }
          report[dataModelName] = differences;
          cb();
        });
      }, cb);
    }
  ], function(err) {
    if(err) {
      return callback(err);
    }
    callback(null,report);
  });
};