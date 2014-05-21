"use strict";
var _ = require('underscore');
var pg = require('pg.js');
var async = require('async');
var fs = require('fs');
var winston = require('winston');

require('../setupDbConnection');

function normaliseTableSpec(specs){
  return _.map(
    specs,
    function(spec){
      if (!spec.scriptFile){
        spec.scriptFile = spec.name+".sql";
      }
      if (!spec.type){
        spec.type = 'table';
      }
      return spec;
    });
}

function exitOnErr(err, cb){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

// Note, the sequence of the tables matter!
exports.tableSpecs = normaliseTableSpec([
  {name: 'transaction_history'},
  {name: 'bbr_events'},
  {name: 'dagitemaer'},
  {name: 'vejstykker'},
  {name: 'postnumre'},
  {name: 'stormodtagere'},
  {name: 'adgangsadresser'},
  {name: 'enhedsadresser'},
  {name: 'vejstykkerpostnr',           scriptFile: 'vejstykker-postnr-view.sql', type: 'view'},
  {name: 'postnumremini',              scriptFile: 'postnumre-mini-view.sql',    type: 'view'},
  {name: 'vejstykkerview',             scriptFile: 'vejstykker-view.sql',        type: 'view'},
  {name: 'vejstykkerpostnumremat',     scriptFile: 'vejstykker-postnumre-view.sql'},
  {name: 'postnumre_kommunekoder_mat', scriptFile: 'postnumre-kommunekoder-mat.sql'},
  {name: 'supplerendebynavne',         scriptFile: 'supplerendebynavne-view.sql'},
  {name: 'adgangsadresserdagirel',     scriptFile: 'adgangsadresser-dagi-view.sql'},
  {name: 'griddeddagitemaer',          scriptFile: 'gridded-dagi-view.sql'},
  {name: 'adgangsadresserview',        scriptFile: 'adgangsadresser-view.sql',   type: 'view'},
  {name: 'adresser',                   scriptFile: 'adresse-view.sql',           type: 'view'}
]);

exports.forAllTableSpecs = function(client, func, callback){
  async.eachSeries(
    exports.tableSpecs,
    function(spec, cb){
      func(client, spec, cb);
    },
    function(err){
      exitOnErr(err);
      callback();
    });
};


exports.initializeTables = function(client){
  return function(done) {
    exports.forAllTableSpecs(client,
      function (client, spec, cb){
        if (spec.type !== 'view'){
          exports.execSQL("select "+spec.name+"_init()", client, true, cb);
        } else {
          cb();
        }
      },
      done);
  };
};

exports.disableTriggers = function(client){
  return function(done) {
    client.query("SET SESSION_REPLICATION_ROLE ='replica'",[], done);
  };
};

exports.enableTriggers = function(client){
  return function(done) {
    client.query("SET SESSION_REPLICATION_ROLE ='origin'",[], done);
  };
};

exports.execSQL = function(sql, client, echo, done){
  function doWork(cb){
    if (echo){ winston.info("Executing sql: %s", sql);}
    client.query(sql, function(err, data){
      if (err) {
        winston.error("Error: %j", err, {});
        winston.error("Executing sql: %s", sql);
        process.exit(1);
      }
      else {
        cb();
      }
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
    client.query('BEGIN', [], function (err) {
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
    client.query(script, [], cb);
  };
}

exports.psqlScript = psqlScript;