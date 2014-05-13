"use strict";

var async = require('async');
var winston = require('winston');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var crud;
var dbapi;
var loadAdresseData = require('./load-adresse-data-impl');
var sqlCommon = require('./common');
var datamodels = require('../crud/datamodel');

var baseDatamodels = {
  adgangsadresse: datamodels.adgangsadresse,
  enhedsadresse: datamodels.enhedsadresse,
  vejstykke: datamodels.vejstykke,
  postnummer: datamodels.postnummer
};

var dataUtil = require('./dataUtil');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  filePrefix: [false, 'Prefix paa BBR-filer, f.eks. \'T_20140328_\'', 'string', ''],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr'],
  compareWithCurrent: [false, 'Angiver, at sammenligningen skal ske med den aktuelle tilstand af databasen, uanset evt. sekvensnummer' +
    'angivet i udtrækket', 'boolean'],
  rectify: [false, 'Korriger forskelle ved at foretage de noedvendige ændringer i data', 'boolean' ]
};

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

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
    console.log(JSON.stringify(actual_id));
    console.log(JSON.stringify(expected_id));
    if(_.isEqual(actual_id, expected_id)) {
      // an update
      var differences = _.reduce(datamodel.columns, function(memo, column) {
        var expectedValue = row['e_' + column];
        var actualValue = row['a_' + column];
        console.log('expected: ' + expectedValue + ' actual: ' + actualValue);
        if(expectedValue !== actualValue) {
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

function hasLaterUpdates(client, datamodel, sequenceNumber, key, callback) {
  var sqlParts  = {
    select: ['count(*) > 0'],
    from: [datamodel.table],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };

  crud.applyFilter(key);
  var sequenceNumberAlias = dbapi.addSqlParameter(sqlParts, sequenceNumber);
  dbapi.addWhereClause(sqlParts, 'valid_from > ' + sequenceNumberAlias + ' OR valid_to > ' + sequenceNumberAlias);
  dbapi.query(client, sqlParts, function(err, result) {
    if(err) {
      return callback(err);
    }
    callback(null, result[0]);
  });

}

function rectifyDifferences(client, datamodel, differences, udtraekDawaSequenceNumber, callback) {
  console.log(JSON.stringify(differences));
  function rectifyUpdates(callback) {
    async.eachSeries(differences.updates, function (update, callback) {
      hasLaterUpdates(client, datamodel, udtraekDawaSequenceNumber, update.id, function(err, hasLaterUpdates) {
        if(err) {
          return callback(err);
        }
        if(hasLaterUpdates) {
          console.log('Object had later updates, skipping');
          return callback(null);
        }
        var object = _.clone(update.id);
        _.extend(object, _.reduce(update.differences, function (memo, value, key) {
          memo[key] = value.expectedValue;
          return memo;
        }, {}));

        crud.update(client, datamodel, object, callback);
      });
    }, callback);
  }

  function rectifyInserts(callback) {
    async.eachSeries(differences.inserts, function(insert, callback) {
      crud.create(client, datamodel, insert.object, callback);
    }, callback);
  }

  function rectifyDeletes(callback) {
    async.eachSeries(differences.deletes, function(del, callback) {
      crud.delete(client, datamodel, del.id, callback);
    }, callback);
  }


  async.series([
    rectifyUpdates,
    rectifyInserts,
    rectifyDeletes
  ], callback);
}

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

function getLastDawaSequenceNumber(client, callback) {
  client.query('SELECT MAX(sequence_number) as last_sequence_number FROM transaction_history', [], function(err, result) {
    if(err) {
      return callback(err);
    }
    console.log(JSON.stringify(result));
    callback(null, result.rows[0].last_sequence_number || 0);
  });
}

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'filePrefix', 'sekvensnummer', 'rectify', 'compareWithCurrent'), function(args, options) {
  crud = require('../crud/crud');
  dbapi = require('../dbapi');

  if(options.format !== 'bbr' && options.sekvensnummer === undefined) {
    throw new Error('Hvis format ikke er bbr skal der angives et sekvensnummer for udtrækket');
  }
  var expectedTablePrefix = 'expected_';
  var actualTablePrefix = 'actual_';
  var loadAdresseDataOptions = {
    dataDir: options.dataDir,
    filePrefix: options.filePrefix,
    format: options.format,
    tablePrefix: expectedTablePrefix
  };

  sqlCommon.withWriteTranaction(options.pgConnectionUrl, function(err, client, done) {
    var udtraekBbrSekvensnummer;
    async.series([
      function(cb) {
        if(options.format === 'bbr') {
          var fileStreams = loadAdresseData.bbrFileStreams(options.dataDir, options.filePrefix);
          loadAdresseData.loadBbrMeta(fileStreams, function(err, meta) {
            if(err) {
              cb(err);
              return;
            }
            udtraekBbrSekvensnummer = meta.sidstSendtHaendelsesNummer || 0;
            cb();
          });
        }
        else {
          cb();
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
        async.eachSeries(_.keys(baseDatamodels), function(dataModelName, cb) {
          var datamodel = baseDatamodels[dataModelName];
          var actualTableName = actualTablePrefix + datamodel.table;
          async.waterfall([
            function(callback) {
              dataUtil.createTempTable(client, actualTableName, datamodel.table, function(err){
                callback(err);
              });
            },
            function(callback) {
              console.log('extracting correct local sequence number');
              if(!options.compareWithCurrent) {
                queryDawaSequenceNumberForBbrEvent(client, udtraekBbrSekvensnummer, callback);
              }
              else {
                getLastDawaSequenceNumber(client, callback);
              }
            },
            function(udtraekDawaSequenceNumber, callback) {
              console.log('inserting snapshot into temp table');
              var sql = 'INSERT INTO ' + actualTableName  + '(' + datamodel.columns.join(', ') + ') (' + dataUtil.snapshotQuery(datamodel, '$1') + ')';
              console.log(sql);
              console.log('udtraekDawaSequenceNumber: ' + udtraekDawaSequenceNumber);
              client.query(sql, [udtraekDawaSequenceNumber], function(err) {
                if(err) {
                  return callback(err);
                }
                callback(null, udtraekDawaSequenceNumber);
              });
            },
            function(udtraekDawaSequenceNumber, callback) {
              console.log('querying for differences');
              dataUtil.queryDifferences(client, expectedTablePrefix + datamodel.table, actualTableName, datamodel, function(err, result) {
                if(err) {
                  return callback(err);
                }
                callback(null, udtraekDawaSequenceNumber, interpretDifferences(datamodel, result));
              });
            },
            function(udtraekDawaSequencenumber, differences, callback) {
              console.log('differences: ' + differences.length);
                console.log(JSON.stringify(differences));
              if(options.rectify) {
                rectifyDifferences(client, datamodel, differences, udtraekDawaSequencenumber, callback);
              }
              else {
                callback();
              }
            }
          ], cb);
        }, cb);
      }
    ], function(err) {
      exitOnErr(err);
      done(null, function(err) {
        exitOnErr(err);
        winston.info("done!");
      });
    });
  });
});