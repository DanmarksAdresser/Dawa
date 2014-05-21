"use strict";

// Loading large-mail-recievers (stormodtagere)
// ============================================
//
// This script will re-load all large-mail-recievers into a given
// database.
//
// Required modules
var util      = require('util');
var pg        = require('pg.js');
var winston   = require('winston');
var csv       = require('csv');
var _         = require('underscore');
var async     = require('async');

var sqlCommon = require('./common');
var logger = require('../logger').forCategory('stormodtagere');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];
  var connString = options.pgConnectionUrl;

  logger.info('Indlæser stormodtagere fra fil ' + inputFile);

  var now = new Date().toISOString().slice(0,-5)+"Z";
  winston.info("Load time %s", now, {});
  winston.info("PostgreSQL connection: '%s'",connString);
  winston.info('Stormodtager CSV file: %s', inputFile);
  winston.info('*** Begin ************');

// Read stormodtager data (this is a small CSV file, under 40 lines)
// and call the DB update function.
  csv().from
    .path(inputFile, {delimiter: ';', columns: true})
    .to.array(function(data, count){
      updateStormodtagere(_.filter(data, function(d) { return d.Adgangsadresseid !== ""; }));
    });

// When updating, first remove the old stormodtager data, then load
// the new data.  This way the CSV file completely controls which
// stormodtagere that exists. Note that the text-search-vector gets
// re-updated for every zip (the amount of zips is small, so this will
// be fast).
  function updateStormodtagere(stormodtagere){
    sqlCommon.withWriteTransaction(connString, function(err, client, done){
      if(err) {
        logger.error('Could not connect to database', err);
        throw err;
      }
      async.series(
        [
          //Delete all
          asyncExecSQL(client, "DELETE FROM stormodtagere"),
          //Insert all
          asyncExecSQL(client, createInsertStormodtagereSQL(stormodtagere)),
        ],
        function(err){
          if (err) { winston.error("Error: %j", err, {}); }
          done(null, function(err) {
            if(err) {
              throw err;
            }
          });
          pg.end();
          winston.info('*** Done **************');
        }
      );
    });
  }

  function createInsertStormodtagereSQL(stormodtagere){
    return "INSERT INTO stormodtagere VALUES\n" +
      _.map(stormodtagere, function(sm){
        return util.format("  ('%s', '%s', '%s')",
          sm.Firmapostnr, sm.Bynavn, sm.Adgangsadresseid);
      }).join(",\n");
  }


  function asyncExecSQL(client, sql){
    return function(cb){
      execSQL(sql, client, cb);
    };
  }

  function execSQL(sql, client, done){
    client.query(sql, function(err, data){
      winston.info("Executing sql: %s", sql);
      if (err) {
        winston.error("Error: %j", err, {});
        process.exit(1);
      }
      else {
        winston.info("SQL command: %s rowCount: %s", data.command, data.rowCount);
        done();
      }
    });
  }

});
