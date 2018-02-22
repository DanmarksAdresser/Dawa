"use strict";

const fs = require('fs');
const {go} = require('ts-csp');
const {createChangeTable, migrateHistoryToChangeTable} = require('../importUtil/tableDiffNg');
const {generateAllTemaTables} = require('../dagiImport/sqlGen');
const {reloadDatabaseCode} = require('./initialization');
const temaModels = require('../dagiImport/temaModels');
const tableSchema = require('./tableModel');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');
const {withImportTransaction} = require('../importUtil/importUtil');
const {recomputeTemaTilknytninger} = require('../importUtil/materialize');
const {refreshSubdividedTable} = require('../importUtil/geometryImport');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};

const selectKode = `(fields ->> 'kode') :: SMALLINT`;
const selectNavn = `(fields->>'navn')`
const SELECT_JSON_FIELD = {
  kommune: {
    kode: selectKode,
    navn: selectNavn,
    regionskode: `(fields ->> 'regionskode') :: SMALLINT`
  },
  region: {
    kode: selectKode,
    navn: selectNavn
  },
  sogn: {
    kode: selectKode,
    navn: selectNavn

  },
  politikreds: {
    kode: selectKode,
    navn: selectNavn

  },
  retskreds: {
    kode: selectKode,
    navn: selectNavn

  },
  opstillingskreds: {
    kode: selectKode,
    navn: selectNavn
  },
  postnummer: {
    nr: `(fields->>'nr')::smallint`,
    navn: selectNavn

  },
  zone: {
    zone: `(fields->>'zone')::smallint`
  },
  valglandsdel: {
    bogstav: `(fields->>'bogstav')::char(1)`,
    navn: selectNavn
  },
  storkreds: {
    nummer: `(fields->>'nummer')::smallint`,
    navn: selectNavn
  }
}

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
      yield client.query('DROP MATERIALIZED VIEW IF EXISTS kommuner CASCADE;DROP MATERIALIZED VIEW IF EXISTS regioner CASCADE;');
      yield createChangeTable(client, tableSchema.tables.jordstykker_adgadr);
      yield createChangeTable(client, tableSchema.tables.jordstykker);
      yield createChangeTable(client, tableSchema.tables.stednavne);

      yield client.query(generateAllTemaTables());
      yield client.query(fs.readFileSync('psql/schema/tables/tilknytninger_mat.sql', {encoding: 'utf8'}));
      yield reloadDatabaseCode(client, 'psql/schema');
      for (let tema of temaModels.modelList) {
        yield client.query(`
INSERT INTO ${tema.table}(ændret, geo_version, geo_ændret, geom, tsv, ${tema.fields.map(field => field.name).join(', ')})
  (SELECT aendret, geo_version, geo_aendret, geom, tsv, ${tema.fields.map(field => `${SELECT_JSON_FIELD[tema.singular][field.name]} AS ${field.name}`).join(', ')} 
  FROM temaer where tema = '${tema.singular}' AND slettet IS NULL);
INSERT INTO ${tema.tilknytningTable} (adgangsadresseid, ${tema.tilknytningKey.join(', ')})
  SELECT
    adgangsadresse_id,
    ${SELECT_JSON_FIELD[tema.singular][tema.primaryKey[0]]}
  FROM
    adgangsadresser_temaer_matview atm
    JOIN temaer t
      ON atm.tema_id = t.id
  WHERE atm.tema = '${tema.singular}';
drop table if exists ${tema.tilknytningTable}_history;
CREATE TABLE ${tema.tilknytningTable}_history AS
  SELECT
    valid_from,
    valid_to,
    adgangsadresse_id as adgangsadresseid,
    ${SELECT_JSON_FIELD[tema.singular][tema.primaryKey[0]]} AS ${tema.tilknytningKey[0]}
  FROM
    adgangsadresser_temaer_matview_history atm
    JOIN temaer t
      ON atm.tema_id = t.id
  WHERE atm.tema = '${tema.singular}';
UPDATE transaction_history
SET entity = '${tema.tilknytningName}' FROM ${tema.tilknytningTable}_history
WHERE valid_from = sequence_number OR valid_to = sequence_number;  
`);
        yield refreshSubdividedTable(client, tema.table, `${tema.table}_divided`, tema.primaryKey);
      }
      yield client.query('analyze');
      yield withImportTransaction(client, '1.17.0 migrering', txid => go(function* () {
        for (let tema of temaModels.modelList) {
          yield migrateHistoryToChangeTable(client, txid, tableSchema.tables[tema.tilknytningTable]);
          yield client.query(`DROP TABLE ${tema.tilknytningTable}_history`);
        }
        yield migrateHistoryToChangeTable(client, txid, tableSchema.tables.jordstykker_adgadr);
      }));
      yield client.query('analyze');
      yield withImportTransaction(client, '1.17.0 migrering', txid => go(function* () {
        yield recomputeTemaTilknytninger(client, txid, temaModels.modelList);
      }));
    }
  )).done();
});

