var async = require('async');
var sqlCommon = require('./common');

module.exports = function(statement, pgConnectionUrl, disableTriggers, errCallback) {
  sqlCommon.withWriteTransaction(pgConnectionUrl, function(err, client, commit) {
    errCallback(err);
    client.on('error', function(err) {
      errCallback(err);
    });
    client.on('notice', function(msg) {
      console.log("notice: %j", msg);
    });
    client.query("SET client_min_messages='INFO'", [], function(err) {
      errCallback(err);
      async.series([
        function(callback) {
          client.query("set work_mem='500MB'; set maintenance_work_mem='500MB'", [], callback);
        },
        function(callback) {
          if (disableTriggers) {
            console.log('disabling triggers');
            sqlCommon.disableTriggers(client)(callback);
          }
          else {
            console.log('running script with triggers enabled');
            callback();
          }
        },
        function(callback) {
          var commands = statement.split(';');
          async.eachSeries(commands, function(command, callback) {
            command = command.trim();
            console.log('executing statement %s', command);
            client.query(command, [], callback);
          }, callback);
        },
        function(callback) {
          if (disableTriggers) {
            console.log('enabling triggers');
            sqlCommon.enableTriggers(client)(callback);
          }
          else {
            callback();
          }
        }
      ], function(err) {
        errCallback(err);
        commit(null, function(err) {
          errCallback(err);
        });
      });
    });
  });
};