"use strict";

const fs = require('fs');
const path = require('path');
const {go} = require('ts-csp');
const cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const proddb = require('./proddb');
const dar10TableModels = require('../dar10/dar10TableModels');
const {withImportTransaction} = require('../importUtil/transaction-util');
const {reloadDatabaseCode} = require('./initialization');
const {createChangeTable} = require('@dawadk/import-util/src/table-diff');
const {
  clearAndMaterialize, materializeWithoutEvents,
  recomputeMaterialization
} = require('@dawadk/import-util/src/materialize');
const tableSchema = require('./tableModel');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    yield withImportTransaction(client, 'migrate_1_26_0', txid => go(function* () {
      for (let entity of Object.keys(dar10TableModels.currentTableModels)) {
        const currentTableModel = dar10TableModels.currentTableModels[entity];
        const historyTableModel = dar10TableModels.historyTableModels[entity];
        yield client.query(`create index on ${currentTableModel.table}_changes(txid,changeid) where public`);
        yield client.query(`create index on ${historyTableModel.table}_changes(txid,changeid) where public`);
      }
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/hoejder.sql'), {encoding: 'utf8'}));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_mat.sql'), {encoding: 'utf8'}));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/adgangsadresser_mat.sql'), {encoding: 'utf8'}));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/adresser_mat.sql'), {encoding: 'utf8'}));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/vejmidter.sql'), {encoding: 'utf8'}));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_mat.sql'), {encoding: 'utf8'}));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvej_mat.sql'), {encoding: 'utf8'}));
      yield createChangeTable(client, tableSchema.tables.hoejder);
      yield createChangeTable(client, tableSchema.tables.hoejde_importer_resultater);
      yield createChangeTable(client, tableSchema.tables.hoejde_importer_afventer);
      yield createChangeTable(client, tableSchema.tables.navngivenvejkommunedel_mat);
      yield createChangeTable(client, tableSchema.tables.adgangsadresser_mat);
      yield createChangeTable(client, tableSchema.tables.adresser_mat);
      yield createChangeTable(client, tableSchema.tables.vejmidter);
      yield createChangeTable(client, tableSchema.tables.navngivenvejkommunedel_mat);
      yield createChangeTable(client, tableSchema.tables.navngivenvej_mat);
      yield createChangeTable(client, tableSchema.tables.supplerendebynavne_mat);
      yield createChangeTable(client, tableSchema.tables.supplerendebynavn_postnr_mat);
      yield createChangeTable(client, tableSchema.tables.supplerendebynavn_kommune_mat);
      yield createChangeTable(client, tableSchema.tables.postnumre_kommunekoder_mat);

      yield client.query('INSERT INTO hoejde_importer_resultater(husnummerid, hoejde, position)' +
        '(select id,hoejde, st_setsrid(st_makepoint(z_x, z_y), 25832) from adgangsadresser)');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN z_x');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN z_y');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN disableheightlookup');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN adressepunkt_id CASCADE');
      yield client.query('ALTER TABLE adgangsadresser_changes DROP COLUMN adressepunkt_id');
      yield client.query('DROP INDEX adgangsadresser_darkommuneinddeling_id_idx');
      yield client.query('DROP INDEX IF EXISTS adgangsadresser_ejerlavkode_idx');
      yield client.query('DROP INDEX IF EXISTS adgangsadresser_kommunekode_vejkode_idx');
      yield client.query('DROP INDEX adgangsadresser_navngivenvejkommunedel_id_idx');
      yield client.query('DROP INDEX adgangsadresser_navngivenvejkommunedel_id_postnummer_id_id_idx');
      yield client.query('DROP INDEX IF EXISTS adgangsadresser_postnr_idx');
      yield client.query('DROP INDEX IF EXISTS adgangsadresser_postnummer_id_idx');
      yield client.query('DROP INDEX adgangsadresser_supplerendebynavn_id_idx');
      yield client.query('DROP INDEX adgangsadresser_vejpunkt_id_idx');
      yield client.query('INSERT INTO vejmidter(kommunekode, kode, geom) (select kommunekode, kode, geom from vejstykker where geom is not null)');
      yield client.query('ALTER TABLE vejstykker DROP COLUMN geom');
      yield client.query('ALTER TABLE vejstykker DROP COLUMN tsv');
      yield client.query('ALTER TABLE vejstykker_changes DROP COLUMN geom');
      yield client.query('ALTER TABLE vejstykker_changes DROP COLUMN tsv');
      yield client.query('DROP INDEX vejstykker_kode_idx');
      yield client.query('DROP INDEX vejstykker_navngivenvej_id_idx');
      yield client.query('DROP INDEX vejstykker_vejnavn_idx');
      yield client.query('DROP INDEX vejstykker_vejnavn_idx1');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN beliggenhed_vejnavnelinje CASCADE');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN beliggenhed_vejnavneområde CASCADE');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN beliggenhed_vejtilslutningspunkter CASCADE');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN visueltcenter');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN bbox');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN geom');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN tsv');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN beliggenhed_vejnavnelinje');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN beliggenhed_vejnavneområde');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN beliggenhed_vejtilslutningspunkter');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN visueltcenter');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN bbox');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN geom');
      yield client.query('ALTER TABLE navngivenvej_changes DROP COLUMN tsv');
      yield client.query('DROP INDEX IF EXISTS navngivenvej_administrerendekommune_idx');
      yield client.query('DROP INDEX navngivenvej_adresseringsnavn_idx');
      yield client.query('DROP INDEX navngivenvej_darstatus_idx');
      yield client.query('DROP INDEX navngivenvej_navn_idx');
      yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.hoejder);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.hoejde_importer_afventer);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adgangsadresser_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adresser_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.supplerendebynavne_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.supplerendebynavn_kommune_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.supplerendebynavn_postnr_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.navngivenvej_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.navngivenvejkommunedel_mat);
      yield materializeWithoutEvents(client, tableSchema.tables, tableSchema.materializations.adgangsadresser, ['ikraftfra', 'ejerlavkode', 'matrikelnr', 'esrejendomsnr']);
      yield materializeWithoutEvents(client, tableSchema.tables, tableSchema.materializations.vejstykker, ['oprettet']);
      yield materializeWithoutEvents(client, tableSchema.tables, tableSchema.materializations.enhedsadresser, ['ikraftfra']);
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/wms_vejpunktlinjer.sql'), {encoding: 'utf8'}));
    }));
    yield withImportTransaction(client, 'migrate_1_26_0', txid => go(function* () {
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.adgangsadresser);
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.enhedsadresser);
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.vejstykker);
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.navngivenvej);
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.supplerendebynavn2_postnr);
      yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.postnumre_kommunekoder_mat);
    }));
  })).done();
});
