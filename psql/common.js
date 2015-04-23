"use strict";

var fs = require('fs');
var winston = require('winston');

function exitOnErr(err){
  if (err){
    console.dir(err);
    winston.error("Error: %j", err, {});
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
}

exports.execSQL = function(sql, client, echo, done){
  function doWork(cb){
    if (echo){ winston.info("Executing sql: %s", sql);}
    client.query(sql, [], function(err){
      exitOnErr(err);
      cb();
    });
  }
  if (done) {
    doWork(done);
  }
  else {
    return doWork;
  }
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
  winston.info('Executing psqlScript %s', scriptDir + '/' + scriptfile);
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
}

exports.psqlScript = psqlScript;