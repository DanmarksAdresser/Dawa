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
const {withImportTransaction, withMigrationTransaction} = require('../importUtil/importUtil');
const logger = require('../logger').forCategory('Migrering');

const {refreshSubdividedTable} = require('../importUtil/geometryImport');
const dar10Schema = require('../dar10/generateSqlSchemaImpl');
const importDar09Impl = require('../darImport/importDarImpl');
const importBrofasthedImpl = require('../stednavne/importBrofasthedImpl');
const importDagiImpl = require('../dagiImport/importDagiImpl');
const featureMappingsNew = require('../dagiImport/featureMappingsNew');
const featureMappingsDatafordeler = require('../dagiImport/featureMappingsDatafordeler');
const featureMappingsZone = require('../dagiImport/featureMappingsZone');
const importStednavneImpl = require('../stednavne/importStednavneImpl');

const { makeChangesNonPublic }= require('../importUtil/materialize');
const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string'],
  temaDir: [false, 'Directory med DAGI-temaer', 'string'],
  stednavnFile: [false, 'Fil med stednavne', 'string']
};

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

const migrateZone = client => go(function* () {
  const table = 'zoner';
  // ensure byzone and sommerhusområde do not overlap
  yield client.query(`UPDATE ${table} SET geom = ST_Multi(ST_Difference(geom, (select geom from ${table} where zone = 1))) WHERE zone = 3`);
  // // landzone is everything not byzone and sommerhusområde
  yield client.query(`UPDATE ${table} SET geom = ST_Multi(ST_Difference((select ST_Union(geom) FROM regioner) , (select ST_Union(geom) from ${table} where zone IN (1, 3)))) WHERE zone = 2`);
  yield refreshSubdividedTable(client, 'zoner', 'zoner_divided', ['zone']);

});

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  go(function*() {
    yield proddb.withTransaction('READ_WRITE', (client) => go(function* () {
      yield client.query(dar10Schema);
      yield client.query('DROP MATERIALIZED VIEW IF EXISTS kommuner CASCADE;DROP MATERIALIZED VIEW IF EXISTS regioner CASCADE;');
      yield client.query(`alter database dawadb set join_collapse_limit=20;alter database dawadb set from_collapse_limit=20;`);
      yield client.query(`DROP SEQUENCE IF EXISTS rowkey_sequence CASCADE;
CREATE SEQUENCE rowkey_sequence START 1;
`);
      yield client.query(`
      ALTER TABLE stednavne_adgadr RENAME TO stedtilknytninger;
      ALTER TABLE stedtilknytninger RENAME adgangsadresse_id to adgangsadresseid;
      ALTER TABLE stedtilknytninger RENAME stednavn_id to stedid;
      ALTER TABLE stednavne_adgadr_changes RENAME TO stedtilknytninger_changes;
      ALTER TABLE stedtilknytninger_changes RENAME adgangsadresse_id to adgangsadresseid;
      ALTER TABLE stedtilknytninger_changes RENAME stednavn_id to stedid;
      alter table stedtilknytninger drop constraint stednavne_adgadr_pkey;
      drop index stednavne_adgadr_adgangsadresse_id_stednavn_id_idx;
      alter table stedtilknytninger add primary key(adgangsadresseid, stedid);
      create index on stedtilknytninger(stedid, adgangsadresseid);
      ALTER TABLE stednavne RENAME TO stednavne_legacy;
      `);
      yield client.query(fs.readFileSync('psql/schema/tables/stednavne.sql', {encoding: 'utf8'}));
      yield client.query(fs.readFileSync('psql/schema/tables/steder_divided.sql', {encoding: 'utf8'}));
      yield client.query(fs.readFileSync('psql/schema/tables/brofasthed.sql', {encoding: 'utf8'}));
      yield client.query(fs.readFileSync('psql/schema/tables/ikke_brofaste_adresser.sql', {encoding: 'utf8'}));
      yield createChangeTable(client, tableSchema.tables.steder);
      yield createChangeTable(client, tableSchema.tables.stednavne);
      yield createChangeTable(client, tableSchema.tables.brofasthed);
      yield createChangeTable(client, tableSchema.tables.ikke_brofaste_adresser);
      yield client.query(`
    insert into steder(id, hovedtype, undertype, bebyggelseskode, visueltcenter,geom, ændret, geo_ændret, geo_version)
    (select id, hovedtype, undertype, bebyggelseskode, visueltcenter,geom, ændret, geo_ændret, geo_version from stednavne_legacy);
    insert into stednavne(stedid, navn, navnestatus, brugsprioritet, tsv) (select id, navn, navnestatus, 'primær', tsv FROM stednavne_legacy); 
    `);

      yield client.query(fs.readFileSync('psql/schema/tables/supplerendebynavne-view.sql', {encoding: 'utf8'}));
      yield createChangeTable(client, tableSchema.tables.jordstykker_adgadr);
      yield createChangeTable(client, tableSchema.tables.jordstykker);
      yield createChangeTable(client, tableSchema.tables.stednavne);
      yield client.query(generateAllTemaTables());
      yield client.query(fs.readFileSync('psql/schema/tables/sted_kommune.sql', {encoding: 'utf8'}));
      yield client.query(fs.readFileSync('psql/schema/tables/tx_operation_counts.sql', {encoding: 'utf8'}));
      yield client.query(`
      ALTER TABLE enhedsadresser DROP CONSTRAINT IF EXISTS adgangsadresse_fk;
      ALTER TABLE enhedsadresser DROP CONSTRAINT IF EXISTS enhedsadresser_adgangsadresseid_fkey;
ALTER TABLE adgangsadresser ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE adgangsadresser_changes ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE adgangsadresser_mat ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE adresser_mat ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE adresser_mat_changes ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
CREATE INDEX IF NOT EXISTS adgangsadresser_navngivenvejkommunedel_id_idx ON adgangsadresser(navngivenvejkommunedel_id); 
ALTER TABLE adgangsadresser ADD COLUMN IF NOT EXISTS supplerendebynavn_id UUID;
ALTER TABLE adgangsadresser_changes ADD COLUMN IF NOT EXISTS supplerendebynavn_id UUID;
ALTER TABLE adgangsadresser_mat ADD COLUMN IF NOT EXISTS supplerendebynavn_id UUID;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN IF NOT EXISTS supplerendebynavn_id UUID;
ALTER TABLE adresser_mat ADD COLUMN IF NOT EXISTS supplerendebynavn_id UUID;
ALTER TABLE adresser_mat_changes ADD COLUMN IF NOT EXISTS supplerendebynavn_id UUID;
CREATE INDEX IF NOT EXISTS adgangsadresser_supplerendebynavn_id_idx ON adgangsadresser(supplerendebynavn_id); 
ALTER TABLE adgangsadresser ADD COLUMN IF NOT EXISTS darkommuneinddeling_id UUID;
ALTER TABLE adgangsadresser_changes ADD COLUMN IF NOT EXISTS darkommuneinddeling_id UUID;
ALTER TABLE adgangsadresser_mat ADD COLUMN IF NOT EXISTS darkommuneinddeling_id UUID;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN IF NOT EXISTS darkommuneinddeling_id UUID;
ALTER TABLE adresser_mat ADD COLUMN IF NOT EXISTS darkommuneinddeling_id UUID;
ALTER TABLE adresser_mat_changes ADD COLUMN IF NOT EXISTS darkommuneinddeling_id UUID;
CREATE INDEX IF NOT EXISTS adgangsadresser_darkommuneinddeling_id_idx ON adgangsadresser(darkommuneinddeling_id); 
ALTER TABLE adgangsadresser ADD COLUMN IF NOT EXISTS adressepunkt_id UUID;
ALTER TABLE adgangsadresser_changes ADD COLUMN IF NOT EXISTS adressepunkt_id UUID;
ALTER TABLE adgangsadresser_mat ADD COLUMN IF NOT EXISTS adressepunkt_id UUID;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN IF NOT EXISTS adressepunkt_id UUID;
ALTER TABLE adresser_mat ADD COLUMN IF NOT EXISTS adressepunkt_id UUID;
ALTER TABLE adresser_mat_changes ADD COLUMN IF NOT EXISTS adressepunkt_id UUID;
CREATE INDEX IF NOT EXISTS adgangsadresser_adressepunkt_id_idx ON adgangsadresser(adressepunkt_id); 
ALTER TABLE adgangsadresser ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE adgangsadresser_changes ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE adgangsadresser_mat ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE adresser_mat ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE adresser_mat_changes ADD COLUMN IF NOT EXISTS postnummer_id UUID;
CREATE INDEX IF NOT EXISTS adgangsadresser_postnummer_id_idx ON adgangsadresser(postnummer_id); 
ALTER TABLE vejstykker ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE vejstykker_changes ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
CREATE INDEX IF NOT EXISTS vejstykker_navngivenvejkommunedel_id_idx ON vejstykker(navngivenvejkommunedel_id); 
ALTER TABLE vejstykkerpostnumremat ADD COLUMN IF NOT EXISTS navngivenvej_id UUID;
ALTER TABLE vejstykkerpostnumremat_changes ADD COLUMN IF NOT EXISTS navngivenvej_id UUID;
CREATE INDEX IF NOT EXISTS vejstykkerpostnumremat_navngivenvej_id_idx ON vejstykkerpostnumremat(navngivenvej_id);
ALTER TABLE vejstykkerpostnumremat ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
ALTER TABLE vejstykkerpostnumremat_changes ADD COLUMN IF NOT EXISTS navngivenvejkommunedel_id UUID;
CREATE INDEX IF NOT EXISTS vejstykkerpostnumremat_navngivenvejkommunedel_id_idx ON vejstykkerpostnumremat(navngivenvejkommunedel_id);
ALTER TABLE vejstykkerpostnumremat DROP COLUMN IF EXISTS husnummer_id;
ALTER TABLE vejstykkerpostnumremat_changes DROP COLUMN IF EXISTS husnummer_id;
ALTER TABLE vejstykkerpostnumremat ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE vejstykkerpostnumremat_changes ADD COLUMN IF NOT EXISTS postnummer_id UUID;
CREATE INDEX IF NOT EXISTS vejstykkerpostnumremat_postnummer_id_idx ON vejstykkerpostnumremat(postnummer_id);
ALTER TABLE navngivenvej_postnummer ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE navngivenvej_postnummer_changes ADD COLUMN IF NOT EXISTS postnummer_id UUID;
ALTER TABLE navngivenvej_postnummer ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE navngivenvej_postnummer_changes ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE navngivenvej alter administreresafkommune type smallint using administreresafkommune::smallint;
ALTER TABLE navngivenvej_changes alter administreresafkommune type smallint using administreresafkommune::smallint;
CREATE INDEX IF NOT EXISTS navngivenvej_postnummer_postnummer_id_idx ON navngivenvej_postnummer(postnummer_id);
CREATE INDEX IF NOT EXISTS adgangsadresser_navngivenvejkommunedel_id_postnummer_id_id_idx ON adgangsadresser(navngivenvejkommunedel_id, postnummer_id, id);`);

      yield client.query(fs.readFileSync('psql/schema/tables/tilknytninger_mat.sql', {encoding: 'utf8'}));
      yield client.query(fs.readFileSync('psql/schema/tables/navngivenvejkommunedel_postnr_mat.sql', {encoding: 'utf8'}));
      yield createChangeTable(client, tableSchema.tables.navngivenvejkommunedel_postnr_mat);
      // opret korrekte indices til udtræk
      yield client.query(`
DROP INDEX adgangsadresser_changes_id_changeid_idx;
CREATE INDEX ON adgangsadresser_changes(id, txid desc nulls last, changeid desc nulls last);
DROP INDEX enhedsadresser_changes_id_changeid_idx;
CREATE INDEX ON enhedsadresser_changes(id, txid desc nulls last, changeid desc nulls last);
DROP INDEX vejstykker_changes_kommunekode_kode_changeid_idx;
CREATE INDEX ON vejstykker_changes(kommunekode, kode, txid desc nulls last, changeid desc nulls last);
DROP INDEX ejerlav_changes_kode_changeid_idx;
CREATE INDEX ON ejerlav_changes(kode, txid desc nulls last, changeid desc nulls last);
DROP INDEX postnumre_changes_nr_changeid_idx;
CREATE INDEX ON postnumre_changes(nr, txid desc nulls last, changeid desc nulls last);
CREATE INDEX ON vejstykkerpostnumremat_changes(kommunekode, vejkode, postnr, txid desc nulls last, changeid desc nulls last);
`);
      const migratedTemas = temaModels.modelList.filter(tema => !!SELECT_JSON_FIELD[tema.singular]);
      yield reloadDatabaseCode(client, 'psql/schema');
      for (let tema of migratedTemas) {
        const fieldNames = tema.fields.map(field => field.name).filter(name => !!(SELECT_JSON_FIELD[tema.singular][name]));
        yield client.query(`
INSERT INTO ${tema.table}(ændret, geo_version, geo_ændret, geom, tsv, ${fieldNames.join(', ')})
  (SELECT aendret, geo_version, geo_aendret, geom, tsv, ${fieldNames.map(fieldName => `${SELECT_JSON_FIELD[tema.singular][fieldName]} AS ${fieldName}`).join(', ')} 
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
      yield client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sekvensnummerfra INTEGER');
      yield client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sekvensnummertil INTEGER');
      yield client.query('CREATE INDEX IF NOT EXISTS transactions_ts_idx on transactions(ts)');
      yield client.query(`WITH seqs AS (SELECT txid,
                min(sequence_number) AS sekvensnummerfra,
                max(sequence_number) AS sekvensnummertil
              FROM transaction_history
              GROUP BY txid)
    UPDATE transactions  set sekvensnummerfra = seqs.sekvensnummerfra, sekvensnummertil = seqs.sekvensnummertil
    FROM seqs WHERE transactions.txid = seqs.txid;`);
      yield client.query(`INSERT INTO tx_operation_counts(txid, entity, operation, operation_count) 
    (select txid, entity, operation, count(*) FROM transaction_history 
    WHERE txid IS NOT NULL and entity <> 'undefined' group by txid, entity, operation)`);
      yield client.query('analyze');
      yield withMigrationTransaction(client, '1.17.0 migrering', txid => go(function* () {
        for (let tema of migratedTemas) {
          yield migrateHistoryToChangeTable(client, txid, tableSchema.tables[tema.tilknytningTable]);
          yield client.query(`DROP TABLE ${tema.tilknytningTable}_history`);
        }
        yield migrateHistoryToChangeTable(client, txid, tableSchema.tables.jordstykker_adgadr);
      }));
      yield client.query('analyze');
      yield importDar09Impl.updateSupplerendeBynavne(client);
      yield migrateZone(client);
    }));
    yield proddb.withTransaction('READ_WRITE', (client) => go(function* () {
      yield withImportTransaction(client, '1.17.0 migrering', txid => importBrofasthedImpl(client, txid, 'data/brofasthed.csv', true));
      logger.info('Migrerer storkreds og valglandsdel');
      yield withImportTransaction(client, '1.17.0 migrering', txid => go(function* () {
        yield importDagiImpl.importTemaerWfs(client, txid, Object.keys(featureMappingsNew), featureMappingsNew, options.temaDir, '', 10000000);
      }));
    }));
    yield proddb.withTransaction('READ_WRITE', (client) => go(function* () {
      logger.info('Migrerer resterende temaer');
      yield withImportTransaction(client, '1.17.0 migrering', txid => go(function* () {
        yield importDagiImpl.importTemaerWfsMulti(client, txid, Object.keys(featureMappingsDatafordeler), featureMappingsDatafordeler, options.temaDir, '', 10000000);
        yield makeChangesNonPublic(client, txid, tableSchema.tables.supplerendebynavntilknytninger);
        yield makeChangesNonPublic(client, txid, tableSchema.tables.afstemningsomraadetilknytninger);
        yield makeChangesNonPublic(client, txid, tableSchema.tables.menighedsraadsafstemningsomraadetilknytninger);
      }));
    }));
    yield proddb.withTransaction('READ_WRITE', (client) => go(function* () {
        logger.info('Migrerer zoner');
        yield withImportTransaction(client, '1.17.0 migrering', txid => go(function* () {
          yield importDagiImpl.importTemaerWfs(client, txid, Object.keys(featureMappingsZone), featureMappingsZone, options.temaDir, '', 10000000);
          yield makeChangesNonPublic(client, txid, tableSchema.tables.zonetilknytninger);
        }));
      }
    ));
    yield proddb.withTransaction('READ_WRITE', (client) => go(function* () {
        logger.info('Migrerer stednavne');
        yield withImportTransaction(client, '1.17.0 migrering', txid => go(function* () {
          yield importStednavneImpl.importStednavne(client, txid, options.stednavnFile);
        }));
      }
    ));
  }).asPromise().done();
});

