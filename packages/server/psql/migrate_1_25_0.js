"use strict";

const path = require('path');
const {go} = require('ts-csp');
const cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const proddb = require('./proddb');
const fs = require('fs');

const {withImportTransaction} = require('../importUtil/transaction-util');
const {reloadDatabaseCode} = require('./initialization');
const tableDiff = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('./tableModel');
const {
  updateGeometricFields,
  computeVisualCenters,
} = require('../importUtil/geometryImport');
const { recomputeMaterialization } = require('@dawadk/import-util/src/materialize');
const {streamEjerlav} = require('../matrikeldata/importJordstykkerImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string'],
  srcDir: [false, 'Sti til matrikekortet']
};

const populateJordstykkeFields = (client, txid, srcDir) => go(function*(){
  const jordstykkeColumns = ['ejerlavkode', 'ejerlavnavn', 'matrikelnr', 'kommunekode', 'sognekode',
    'regionskode', 'retskredskode', 'esrejendomsnr', 'udvidet_esrejendomsnr', 'sfeejendomsnr',
    'featureid', 'moderjordstykke', 'registreretareal', 'arealberegningsmetode', 'vejareal', 'vejarealberegningsmetode', 'vandarealberegningsmetode', 'fælleslod'];


  const jordstykkeTableModel = tableSchema.tables.jordstykker;
  const ejerlavColumns = ['kode', 'navn'];
  const ejerlavTableModel = tableSchema.tables.ejerlav;

  yield client.query(`CREATE TEMP TABLE desired_jordstykker AS (SELECT jordstykker.*
  FROM jordstykker WHERE false);
  ALTER TABLE desired_jordstykker ALTER geom TYPE text;
  CREATE TEMP TABLE desired_ejerlav AS (select ejerlav.* from ejerlav where false);
  ALTER TABLE desired_ejerlav ALTER geom TYPE text;`);
  yield client.query(`CREATE TEMP TABLE actual_jordstykker AS (SELECT jordstykker.* FROM jordstykker WHERE false)`);
  yield client.query(`CREATE TEMP TABLE actual_ejerlav AS (SELECT ejerlav.* FROM ejerlav WHERE false)`);
  const files = fs.readdirSync(srcDir).filter(function (file) {
    return /^.+\.zip$/.test(file);
  });
  for(let file of files) {
    yield streamEjerlav(client, srcDir, file, true);
  }
  yield client.query(`alter table desired_jordstykker alter column geom type geometry(polygon, 25832) using st_geomfromgml(geom, 25832)`);
  yield client.query(`alter table desired_ejerlav alter column geom type geometry(multipolygon, 25832) using st_multi(st_geomfromgml(geom, 25832))`);

  yield client.query(`UPDATE jordstykker dst
    SET 
    featureid=src.featureid,
    moderjordstykke=src.moderjordstykke,
    registreretareal=src.registreretareal,
    arealberegningsmetode=src.arealberegningsmetode,
    vejareal = src.vejareal,
    vejarealberegningsmetode = src.vejarealberegningsmetode,
    vandarealberegningsmetode = src.vandarealberegningsmetode,
    fælleslod = src.fælleslod 
     FROM desired_jordstykker src
     WHERE dst.ejerlavkode = src.ejerlavkode and dst.matrikelnr = src.matrikelnr`);
  yield client.query(`UPDATE jordstykker_changes dst
    SET 
    featureid=src.featureid,
    moderjordstykke=src.moderjordstykke,
    registreretareal=src.registreretareal,
    arealberegningsmetode=src.arealberegningsmetode,
    vejareal = src.vejareal,
    vejarealberegningsmetode = src.vejarealberegningsmetode,
    vandarealberegningsmetode = src.vandarealberegningsmetode,
    fælleslod = src.fælleslod 
    FROM desired_jordstykker src
    WHERE dst.ejerlavkode = src.ejerlavkode and dst.matrikelnr = src.matrikelnr`);

  yield tableDiff.computeDifferences(client, txid, 'desired_jordstykker', jordstykkeTableModel, [...jordstykkeColumns, 'geom']);
  yield tableDiff.computeDifferences(client, txid, 'desired_ejerlav', ejerlavTableModel, [...ejerlavColumns, 'geom']);
  yield updateGeometricFields(client, txid, jordstykkeTableModel);
  yield updateGeometricFields(client, txid, ejerlavTableModel);
  yield computeVisualCenters(client, txid, jordstykkeTableModel);
  yield computeVisualCenters(client, txid, ejerlavTableModel);
  yield tableDiff.applyChanges(client, txid, jordstykkeTableModel);
  yield tableDiff.applyChanges(client, txid, ejerlavTableModel);
  yield client.query('drop table desired_jordstykker; drop table desired_ejerlav; drop table actual_ejerlav; drop table actual_jordstykker; analyze jordstykker; analyze jordstykker_changes;');
  yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.jordstykker_adgadr);
});

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    return yield withImportTransaction(client, 'migrate_1_25_0', txid => go(function* () {
      yield client.query(`
ALTER TABLE jordstykker ADD COLUMN featureid integer;      
ALTER TABLE jordstykker ADD COLUMN moderjordstykke integer;      
ALTER TABLE jordstykker ADD COLUMN registreretareal integer;
ALTER TABLE jordstykker ADD COLUMN arealberegningsmetode text;
ALTER TABLE jordstykker ADD COLUMN vejareal integer;
ALTER TABLE jordstykker ADD COLUMN vejarealberegningsmetode text;
ALTER TABLE jordstykker ADD COLUMN vandarealberegningsmetode text;
ALTER TABLE jordstykker ADD COLUMN fælleslod boolean;

ALTER TABLE jordstykker_changes ADD COLUMN featureid integer;      
ALTER TABLE jordstykker_changes ADD COLUMN moderjordstykke integer;      
ALTER TABLE jordstykker_changes ADD COLUMN registreretareal integer;
ALTER TABLE jordstykker_changes ADD COLUMN arealberegningsmetode text;
ALTER TABLE jordstykker_changes ADD COLUMN vejareal integer;
ALTER TABLE jordstykker_changes ADD COLUMN vejarealberegningsmetode text;
ALTER TABLE jordstykker_changes ADD COLUMN vandarealberegningsmetode text;
ALTER TABLE jordstykker_changes ADD COLUMN fælleslod boolean;
      `);
      for(let table of [
        'ejerlav', 'postnumre', 'vejstykker', 'adgangsadresser', 'enhedsadresser',
        'adgangsadresser_mat', 'stormodtagere', 'adresser_mat', 'vejpunkter', 'navngivenvej',
        'navngivenvej_postnummer', 'vejstykkerpostnumremat', 'stednavne', 'steder', 'stedtilknytninger',
        'navngivenvejkommunedel_postnr_mat', 'brofasthed', 'ikke_brofaste_adresser', 'bygninger', 'bygningtilknytninger', 'bygning_kommune',
        'supplerendebynavn2_postnr', 'jorstykker_adgadr']) {
        yield client.query(`CREATE INDEX ON ${table}_changes(txid,changeid) where public`);
      }
      yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
      yield populateJordstykkeFields(client, txid, options.srcDir);
    }));
  })).done();
});

