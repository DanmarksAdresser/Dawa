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

exports.disableTriggers = function(client){
  return function(done) {
    winston.info("Disabling triggers");
    client.query("SET SESSION_REPLICATION_ROLE ='replica'",[], done);
  };
};

exports.disableTriggersQ = function(client) {
  return client.queryp("SET SESSION_REPLICATION_ROLE ='replica'",[]);
};

exports.enableTriggers = function(client){
  return function(done) {
    winston.info("Enabling triggers");
    client.query("SET SESSION_REPLICATION_ROLE ='origin'",[], done);
  };
};

exports.enableTriggersQ = function(client) {
  return client.queryp("SET SESSION_REPLICATION_ROLE ='origin'",[]);
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
    var script = fs.readFileSync(scriptDir + '/' + scriptfile, {
      encoding: 'utf8'
    });
    winston.info('Executing psqlScript %s', scriptDir + '/' + scriptfile);
    client.query(script, [], cb);
  };
}

exports.psqlScript = psqlScript;