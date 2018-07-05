"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');
const initialization = require('../psql/initialization');
const path = require('path');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      yield client.query(`UPDATE dar1_husnummer set husnummerretning = CASE WHEN ST_X(husnummerretning) >= 0  AND st_X(husnummerretning) < 1
        THEN ST_SetSRID(ST_MakePoint(ST_X(husnummerretning), -ST_Y(husnummerretning)), 25832)
        ELSE ST_SetSRID(ST_MakePoint(-ST_X(husnummerretning), ST_Y(husnummerretning)), 25832)
        END`);
      yield client.query(`UPDATE dar1_husnummer_changes set husnummerretning = CASE WHEN ST_X(husnummerretning) >= 0  AND st_X(husnummerretning) < 1 
        THEN ST_SetSRID(ST_MakePoint(ST_X(husnummerretning), -ST_Y(husnummerretning)), 25832)
        ELSE ST_SetSRID(ST_MakePoint(-ST_X(husnummerretning), ST_Y(husnummerretning)), 25832)
        END`);
      yield client.query(`UPDATE dar1_husnummer_history set husnummerretning = CASE WHEN ST_X(husnummerretning) >= 0  AND st_X(husnummerretning) < 1 
        THEN ST_SetSRID(ST_MakePoint(ST_X(husnummerretning), -ST_Y(husnummerretning)), 25832)
        ELSE ST_SetSRID(ST_MakePoint(-ST_X(husnummerretning), ST_Y(husnummerretning)), 25832)
        END`);
      yield client.query(`UPDATE dar1_husnummer_history_changes set husnummerretning = CASE WHEN ST_X(husnummerretning) >= 0  AND st_X(husnummerretning) < 1 
        THEN ST_SetSRID(ST_MakePoint(ST_X(husnummerretning), -ST_Y(husnummerretning)), 25832)
        ELSE ST_SetSRID(ST_MakePoint(-ST_X(husnummerretning), ST_Y(husnummerretning)), 25832)
        END`);
      yield client.query(`UPDATE dar1_husnummer_current set husnummerretning = CASE WHEN ST_X(husnummerretning) >= 0  AND st_X(husnummerretning) < 1 
        THEN ST_SetSRID(ST_MakePoint(ST_X(husnummerretning), -ST_Y(husnummerretning)), 25832)
        ELSE ST_SetSRID(ST_MakePoint(-ST_X(husnummerretning), ST_Y(husnummerretning)), 25832)
        END`);
      yield client.query(`UPDATE dar1_husnummer_current_changes set husnummerretning = CASE WHEN ST_X(husnummerretning) >= 0  AND st_X(husnummerretning) < 1 
        THEN ST_SetSRID(ST_MakePoint(ST_X(husnummerretning), -ST_Y(husnummerretning)), 25832)
        ELSE ST_SetSRID(ST_MakePoint(-ST_X(husnummerretning), ST_Y(husnummerretning)), 25832)
        END`);
      yield initialization.reloadDatabaseCode( client, path.join(__dirname, '../psql/schema');
      yield importDarImpl.importIncremental(client, txid, options.dataDir, false);
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
});