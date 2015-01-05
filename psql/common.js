"use strict";
var pg = require('pg.js');
var fs = require('fs');
var winston = require('winston');

require('../setupDbConnection');

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

exports.enableTriggers = function(client){
  return function(done) {
    winston.info("Enabling triggers");
    client.query("SET SESSION_REPLICATION_ROLE ='origin'",[], done);
  };
};

exports.execSQL = function(sql, client, echo, done){
  function doWork(cb){
    if (echo){ winston.info("Executing sql: %s", sql);}
    client.query(sql, function(err){
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

exports.withWriteTransaction = function (connString, cb) {
  var client = new pg.Client(connString);
  return client.connect(function (err) {
    if (err) {
      return cb(err);
    }
    // we obtain an exclusive lock to prevent any concurrent write access to the db
    client.query('BEGIN;SELECT pg_advisory_xact_lock(1);', [], function (err) {
      if (err) {
        client.end();
        return cb(err);
      }
      cb(err, client, function (err, committedCallback) {
        if (err) {
          winston.error("Error during transaction, discarding postgres connection", err);
          client.end();
          committedCallback(err);
          return;
        }
        client.query('COMMIT', function (err) {
          if (err) {
            winston.error("Error when committing transaction: %j", err);
          }
          else {
            winston.debug("write transaction commited, err: " + JSON.stringify(err));
          }
          client.end();
          committedCallback(err);
        });
      });
    });
  });
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