"use strict";

var pg = require('pg');
var pgConnectionString = require('pg-connection-string');
var q = require('q');
var TypeOverrides = require('pg/lib/type-overrides');
var _ = require('underscore');

var database = require('./database');
const setupDatabaseTypes = require('./setupDatabasetypes');


module.exports = function(dbname, options) {
  if(database.exists(dbname)) {
    return q();
  }
  var connectionOptions = pgConnectionString.parse(options.connString);
  options = _.extend({}, options, connectionOptions);
  var untypedDb = database.create('untyped_' + dbname, options);
  database.withConnection(untypedDb, false, function(client) {
    // The OIDs for custom types are not fixed beforehand, so we query them from the database
    return client.queryp('select typname, oid from pg_type', []).then(function(result) {
      var typeMap = _.reduce(result.rows, function(memo, row){
        memo[row.typname] = row.oid;
        return memo;
      }, {});
      var types = new TypeOverrides(pg.types);
      setupDatabaseTypes(types, typeMap);
      options.types = types;
      database.register(dbname, options);
    });
  }).done();
};
