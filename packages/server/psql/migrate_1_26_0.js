"use strict";

const fs = require('fs');
const path = require('path');
const {go} = require('ts-csp');
const cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const proddb = require('./proddb');

const {withImportTransaction} = require('../importUtil/transaction-util');
const {reloadDatabaseCode} = require('./initialization');
const { clearAndMaterialize } = require('@dawadk/import-util/src/materialize');
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
    return yield withImportTransaction(client, 'migrate_1_26_0', txid => go(function* () {
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/hoejder.sql')));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_mat')));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/adgangsadresser_mat')));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/adresser_mat')));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/vejmidter')));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_mat')));
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvej_mat')));
      yield client.query('INSERT INTO hoejde_importer_resultater(husnummerid, hoejde, position)' +
        '(select id,hoejde, st_setsrid(st_makepoint(z_x, z_y), 25832) from adgangsadresser)');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN z_x');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN z_y');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN disableheightlookup');
      yield client.query('ALTER TABLE adgangsadresser_changes DROP COLUMN z_x');
      yield client.query('ALTER TABLE adgangsadresser_changes DROP COLUMN z_y');
      yield client.query('ALTER TABLE adgangsadresser_changes DROP COLUMN disableheightlookup');
      yield client.query('DROP INDEX adgangsadresser_adressepunkt_id_idx');
      yield client.query('DROP INDEX adgangsadresser_darkommuneinddeling_id_idx');
      yield client.query('DROP INDEX adgangsadresser_ejerlavkode_idx');
      yield client.query('DROP INDEX adgangsadresser_kommunekode_vejkode_idx');
      yield client.query('DROP INDEX adgangsadresser_navngivenvejkommunedel_id_idx');
      yield client.query('DROP INDEX adgangsadresser_navngivenvejkommunedel_id_postnummer_id_id_idx');
      yield client.query('DROP INDEX adgangsadresser_postnr_idx');
      yield client.query('DROP INDEX adgangsadresser_postnummer_id_idx');
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
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN beliggenhed_vejnavnelinje');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN beliggenhed_vejnavneområde');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN beliggenhed_vejtilslutningspunkter');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN visueltcenter');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN bbox');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN geom');
      yield client.query('ALTER TABLE navngivenvej DROP COLUMN tsv');
      yield client.query('DROP INDEX navngivenvej_administrerendekommune_idx');
      yield client.query('DROP INDEX navngivenvej_adresseringsnavn_idx');
      yield client.query('DROP INDEX navngivenvej_darstatus_idx');
      yield client.query('DROP INDEX navngivenvej_navn_idx');
      yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.hoejder);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.hoejde_importer_afventer);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adgangsadresser_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adresser_mat);
    }));
  })).done();
});
