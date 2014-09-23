"use strict";

var fs = require('fs');
var _ = require('underscore');
var async = require('async');
var sqlCommon = require('./common');

module.exports = function(client, scriptPaths, disableTriggers, callback) {
  var scripts = _.map(scriptPaths, function(path) {
    return fs.readFileSync(path, {encoding: 'utf8'});
  });
  client.query("SET client_min_messages='INFO'",[], function(err) {
    if(err) {
      return callback(err);
    }
    async.series([
      function(callback) {
        console.log("set work_mem='500MB'; set maintenance_work_mem='500MB'");
        client.query("set work_mem='500MB'; set maintenance_work_mem='500MB'", [], callback);
      },
      function(callback) {
        if(disableTriggers) {
          console.log('disabling triggers');
          sqlCommon.disableTriggers(client)(callback);
        }
        else {
          console.log('running script with triggers enabled');
          callback();
        }
      },
      function(callback) {
        async.eachSeries(scripts, function(script, callback) {
          var commands = script.split(';');
          async.eachSeries(commands, function(command, callback) {
            command = command.trim();
            console.log('executing command %s', command);
            client.query(command, [], callback);
          }, callback);
        }, callback);
      },
      function(callback) {
        if(disableTriggers) {
          console.log('enabling triggers');
          sqlCommon.enableTriggers(client)(callback);
        }
        else {
          callback();
        }
      }
    ], callback);
  });
}