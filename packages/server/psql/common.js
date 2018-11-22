"use strict";

var fs = require('fs');

var qUtil = require('../q-util');

function exitOnErr(err){
  if (err){
    /*eslint no-console: 0 */
    console.dir(err);
    process.exit(1);
  }
}

exports.exitOnErr = exitOnErr;

exports.disableTriggersQ = function(client) {
  return client.queryp("SET SESSION_REPLICATION_ROLE ='replica'",[]);
};

exports.disableTriggers = function(client){
  return function(done) {
    return exports.disableTriggersQ(client).nodeify(done);
  };
};

exports.enableTriggersQ = function(client) {
  return client.queryp("SET SESSION_REPLICATION_ROLE ='origin'",[]);
};

exports.enableTriggers = function(client){
  return function(done) {
    return exports.enableTriggersQ(client).nodeify(done);
  };
};

exports.withoutTriggers = function(client, fn) {
  return exports.disableTriggersQ(client).then(fn).then(function() {
    return exports.enableTriggersQ(client);
  });
};

exports.execSQL = function(sql, client, echo, done){
  return client.queryp(sql, []).nodeify(done);
};

function psqlScript(client, scriptDir, scriptfile){
  return function(cb){
    return exports.psqlScriptQ(client, scriptDir, scriptfile).nodeify(cb);
  };
}

exports.psqlScriptQ = function(client, scriptDir, scriptfile) {
  var script = fs.readFileSync(scriptDir + '/' + scriptfile, {
    encoding: 'utf8'
  });
  return client.queryp(script, []);
};

exports.reindex = function(client) {
  return exports.disableTriggersQ(client)
    .then(function() {
    return exports.psqlScriptQ(client, __dirname, 'reindex-search.sql');

  })
    .then(function() {
      exports.enableTriggersQ(client);
    });
};

exports.disableHistoryTrigger = function(client, tableName) {
  return client.queryp('ALTER TABLE ' + tableName + ' DISABLE TRIGGER ' + tableName + '_history_update');
};

exports.enableHistoryTrigger = function(client, tableName) {
  return client.queryp('ALTER TABLE ' + tableName + ' ENABLE TRIGGER ' + tableName + '_history_update');
};

exports.withoutHistoryTriggers = function(client, tableNames, fn) {
  return qUtil.mapSerial(tableNames, function(tableName) {
    return exports.disableHistoryTrigger(client, tableName);
  })
    .then(function() {
      return fn();
    })
    .then(function() {
      return qUtil.mapSerial(tableNames, function(tableName) {
        return exports.enableHistoryTrigger(client, tableName);
      });
    });
};

exports.psqlScript = psqlScript;
