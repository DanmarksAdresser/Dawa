"use strict";

var _ = require('underscore');
var csv       = require('csv');
var util      = require('util');
var async = require('async');

function asyncExecSQL(client, sql){
  return function(cb){
    execSQL(sql, client, cb);
  };
}

function execSQL(sql, client, done){
  client.query(sql, function(err, data){
    if (err) {
      process.exit(1);
    }
    else {
      done();
    }
  });
}

function createInsertStormodtagereSQL(stormodtagere){
  return "INSERT INTO stormodtagere VALUES\n" +
    _.map(stormodtagere, function(sm){
      return util.format("  ('%s', '%s', '%s')",
        sm.Firmapostnr, sm.Bynavn, sm.Adgangsadresseid);
    }).join(",\n");
}

// When updating, first remove the old stormodtager data, then load
// the new data.  This way the CSV file completely controls which
// stormodtagere that exists. Note that the text-search-vector gets
// re-updated for every zip (the amount of zips is small, so this will
// be fast).
function updateStormodtagere(client, stormodtagere, callback){
  async.series(
    [
      //Delete all
      asyncExecSQL(client, "DELETE FROM stormodtagere"),
      //Insert all
      asyncExecSQL(client, createInsertStormodtagereSQL(stormodtagere))
    ],
    callback
  );
}

module.exports = function(client, inputFile, callback) {
  // Read stormodtager data (this is a small CSV file, under 40 lines)
// and call the DB update function.
  csv().from
    .path(inputFile, {delimiter: ';', columns: true})
    .to.array(function(data, count){
      updateStormodtagere(client, _.filter(data, function(d) { return d.Adgangsadresseid !== ""; }), callback);
    });
};