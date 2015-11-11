"use strict";

/*eslint no-console: 0 */

var fs = require('fs');
var q = require('q');
var _ = require('underscore');
var sqlCommon = require('./common');

module.exports = function(client, scriptPaths, disableTriggers) {
  return q.async(function*() {
    var scripts = _.map(scriptPaths, function(path) {
      return fs.readFileSync(path, {encoding: 'utf8'});
    });
    yield client.queryp("SET client_min_messages='INFO'");

    console.log("set work_mem='500MB'; set maintenance_work_mem='500MB'");
    yield client.queryp("set work_mem='500MB'; set maintenance_work_mem='500MB'");
    if(disableTriggers) {
      console.log('disabling triggers');
      yield sqlCommon.disableTriggersQ(client);
    }
    else {
      console.log('running script with triggers enabled');
    }
    for(let script of scripts) {
      var commands = script.split(';');
      for(let command of commands) {
        command = command.trim();
        console.log('executing command %s', command);
        yield client.queryp(command);
      }
    }
    if(disableTriggers) {
      console.log('enabling triggers');
      yield sqlCommon.enableTriggersQ(client);

    }
  })();
};
