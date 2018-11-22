'use strict';
"use strict";

// This script loads postnumre into the database from a CSV-file.

const { go } = require('ts-csp');
const _         = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');
const databasePools = require('../psql/databasePools');
const tableSchema = require('../psql/tableModel');
const { withImportTransaction } = require('../importUtil/importUtil');
const { recomputeMaterialization } = require('./materialize');
const temaModels = require('../dagiImport/temaModels');

const selectKode = `(fields ->> 'kode') :: SMALLINT`;
const selectNavn = `(fields->>'navn')`;
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
};

const fixJordstykkeHistory = (client) => go(function*() {
  const tableModel = tableSchema.tables.jordstykker_adgadr;
  const tableName = tableModel.table;
  yield client.query(`
INSERT INTO jordstykker_adgadr_changes (txid, changeid, operation, public, ejerlavkode,matrikelnr,adgangsadresse_id)
  (SELECT
     1,
     null,
     'insert',
     false,
     ejerlavkode,matrikelnr,adgangsadresse_id
   FROM jordstykker_adgadr_history
   WHERE valid_from IS NULL)`);
  let subselect =
    `SELECT *, row_number()
  OVER (PARTITION BY ${tableModel.primaryKey.join(', ')}
    ORDER BY txid desc nulls last, changeid desc NULLS LAST) as row_num
FROM ${tableName}_changes`;
  const colNames = tableModel.columns.map(col => col.name);

  yield client.query(`
    delete from ${tableName};
    INSERT INTO ${tableName}(${colNames.join(',')})
    (SELECT ${colNames.join(',')}
    FROM (${subselect}) t
    WHERE row_num = 1 and operation <> 'delete')`);
});

const fixTemaHistory = (client,temaModel) => go(function*(){
  const tema = temaModel;
  const tilknytningChangeTable = `${temaModel.tilknytningTable}_changes`;
  const sql = `INSERT INTO ${tilknytningChangeTable} (txid, changeid, operation, public, adgangsadresseid, ${tema.tilknytningKey[0]})
  (SELECT
     1,
     null,
     'insert',
     false,
     adgangsadresse_id,
     ${SELECT_JSON_FIELD[tema.singular][tema.primaryKey[0]]} AS ${tema.tilknytningKey[0]}
   FROM
    adgangsadresser_temaer_matview_history atm
    JOIN temaer t
      ON atm.tema_id = t.id
  WHERE atm.tema = '${tema.singular}' and valid_from IS NULL)`;
  yield client.query(sql);

});
const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  databasePools.get('prod').withConnection({pooled: false}, (client) => go(function*() {
    yield client.query('DROP FUNCTION IF EXISTS adgangsadresser_flats_update_on_adgangsadresse() CASCADE');
    yield client.query('DROP FUNCTION IF EXISTS jordstykker_adgadr_history_update() CASCADE');
    yield fixJordstykkeHistory(client);
    for(let temaModel of temaModels.modelList) {
      if(!['afstemningsområde', 'menighedsrådsafstemningsområde', 'supplerendebynavn'].includes(temaModel.singular)) {
        yield fixTemaHistory(client, temaModel);
      }
    }
    yield withImportTransaction(client, 'hændelseFix', (txid) => go(function*(){
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.jordstykker_adgadr);
    }));
    })).asPromise().done();
});
