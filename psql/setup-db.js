"use strict";

var format = require('util').format;
var cli = require('cli');
var winston  = require('winston');
var _        = require('underscore');
var async    = require('async');
var sqlCommon = require('./common');

var datamodels = require('../crud/datamodel');

var initializeTables = sqlCommon.initializeTables;
var psqlScript = sqlCommon.psqlScript;

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cli.parse(optionSpec, []);




function loadSchemas(client, scriptDir){
  return function(done){
    sqlCommon.forAllTableSpecs(client,
      function (client, spec, cb){
        console.log("loading script " + spec.scriptFile);
        return (psqlScript(client, scriptDir, spec.scriptFile))(cb);
      },
      done);
  };
}

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

/*
 * For each table that has a history table, generate a trigger to maintain it.
 */
function createHistoryTriggers(client) {
  return function(callback) {
    var sql = _.reduce(['postnummer', 'vejstykke', 'adgangsadresse', 'adresse'], function(sql, datamodelName) {
      var datamodel = datamodels[datamodelName];
      var table = datamodel.table;
      sql += format('DROP FUNCTION IF EXISTS %s_history_update() CASCADE;\n', table);
      sql += format('CREATE OR REPLACE FUNCTION %s_history_update()\n', table);
      sql += 'RETURNS TRIGGER AS $$\n';
      sql += 'DECLARE\n';
      sql += 'seqnum integer;\n';
      sql += 'optype operation_type;\n';
      sql += "BEGIN\n";

      // we need to verify that one of the history fields have changed, not just the tsv- or geom columns
      var isNotDistinctCond = datamodel.columns.map(function(column) {
        return format("OLD.%s IS NOT DISTINCT FROM NEW.%s", column, column);
      }).join(" AND ");

      sql += format("IF TG_OP = 'UPDATE' AND (%s) THEN\n", isNotDistinctCond);
      sql += "RETURN NULL;\n";
      sql += "END IF;\n";


      sql += "seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);\n";
      sql += "optype = lower(TG_OP);\n";

      // set valid_to on existing history row
      sql += "IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN\n";

      var keyClause = _.map(datamodel.key, function(keyColumn) {
        return keyColumn + ' = OLD.' + keyColumn;
      }).join(' AND ');

      sql += format("UPDATE %s_history SET valid_to = seqnum WHERE %s AND valid_to IS NULL;\n", table, keyClause);
      sql += "END IF;\n";

      // create the new history row
      sql += "IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN\n";
      sql += format("INSERT INTO %s_history(\n", table);
      sql += 'valid_from, ';
      sql += datamodel.columns.join(', ') + ')\n';
      sql += " VALUES (\n";
      sql += 'seqnum, ' + datamodel.columns.map(function(column) {
        return 'NEW.' + column;
      }).join(', ') + ");\n";
      sql += "END IF;\n";

      // add entry to transaction_history
      sql += format("INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, '%s', optype);", datamodel.name);
      sql += "RETURN NULL;\n";
      sql += "END;\n";
      sql += "$$ LANGUAGE PLPGSQL;\n";

      // create the trigger
      sql += format("CREATE TRIGGER %s_history_update AFTER INSERT OR UPDATE OR DELETE\n", table);
      sql += format("ON %s FOR EACH ROW EXECUTE PROCEDURE\n", table);
      sql += format("%s_history_update();\n", table);

      return sql;
    }, '');
    console.log(sql);
    client.query(sql, [], callback);
  };
}

cli.main(function(args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  var scriptDir = __dirname + '/schema';
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, callback) {
    if(err) {
      exitOnErr(err);
    }
    async.series(
      [
        psqlScript(client, scriptDir, 'misc.sql'),
        loadSchemas(client, scriptDir),
        psqlScript(client, scriptDir, 'geoserver_views.sql'),
        sqlCommon.disableTriggers(client),
        initializeTables(client),
        createHistoryTriggers(client),
        sqlCommon.enableTriggers(client),
        function(cb) {console.log('Main is done!'); cb(); }
      ],
      function(err){
        if(err) {
          exitOnErr(err);
        }
        callback(null, function(err) {
          if(err) {
            exitOnErr(err);
          }
        });
      });
  });

});
