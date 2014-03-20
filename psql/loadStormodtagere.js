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


// Ensure and extract arguments from argv.  Print a usage messag if
// number of arguments is wrong.
if (process.argv.length !== 4){
  console.log('Usage: node loadStormodtagere.js <PG-connection-string> <stormodtager.csv>');
  process.exit(0);
}
var connString = process.argv[2];
var inputFile = process.argv[3];
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
  withWriteTransaction(function(client, done){
    async.series(
      [
        //Delete all
        asyncExecSQL(client, "DELETE FROM stormodtagere"),
        //Insert all
        asyncExecSQL(client, createInsertStormodtagereSQL(stormodtagere)),
      ],
      function(err){
        if (err) { winston.error("Error: %j", err, {}); }
        done();
        pg.end();
        winston.info('*** Done **************');
      }
    );
  });
}

function createInsertStormodtagereSQL(stormodtagere){
  return "INSERT INTO stormodtagere VALUES\n" +
    _.map(stormodtagere, function(sm){
      return util.format("  ('%s', '%s', '%s', '%s')",
                         sm.Firmapostnr, now, sm.Bynavn, sm.Adgangsadresseid);
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

function withWriteTransaction(cb) {
  return pg.connect(connString, function (err, client, done) {
    if (err) {
      winston.error("Error: %j", err,{});
      process.exit(1);
    }
    client.query('BEGIN', [], function(err) {
      if(err) {
        winston.error("Error: %j", err,{});
        process.exit(1);
      }
      cb(client, function() {
        client.query('COMMIT', function(err){
          done();
        });
      });
    });
  });
}
